import { onRequest } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { db, FUNCTIONS_REGION, ANON_MAX_PAGES, ANON_EXPIRY_MS } from '../config.js';
import { renderReportMarkdown } from './renderReportMarkdown.js';

export const auditByUrl = onRequest(
  {
    region: FUNCTIONS_REGION,
    cors: true,
  },
  async (req, res) => {
    if (req.method !== 'GET') {
      res.status(405).set('Allow', 'GET').send('Method not allowed. Use GET.');
      return;
    }

    const urlParam = req.query.url as string | undefined;
    if (!urlParam) {
      const usage =
        '# GEO Audit API\n\n' +
        'Missing `url` parameter.\n\n' +
        '**Usage:** `GET /report?url=example.com`\n\n' +
        '**Parameters:**\n' +
        '- `url` (required) — domain or URL to audit\n' +
        '- `fresh=true` — force a new scan even if a recent one exists\n\n' +
        '**Response:** Markdown report (or JSON with `Accept: application/json`)\n\n' +
        'Completed audits return `200`. In-progress audits return `202` with `Retry-After` header.\n';

      const wantsJson = (req.headers.accept || '').includes('application/json');
      if (wantsJson) {
        res.status(400).json({
          error: 'Missing url parameter',
          usage: 'GET /report?url=example.com',
          parameters: {
            url: 'domain or URL to audit (required)',
            fresh: 'set to true to force a new scan',
          },
        });
      } else {
        res.status(400).type('text/plain; charset=utf-8').send(usage);
      }
      return;
    }

    // Normalize URL — same logic as submitAudit.ts
    let parsedUrl: URL;
    try {
      const normalized = urlParam.startsWith('http') ? urlParam : `https://${urlParam}`;
      parsedUrl = new URL(normalized);
      if (!parsedUrl.hostname.includes('.') && parsedUrl.hostname !== 'localhost') {
        throw new Error('Invalid hostname');
      }
    } catch {
      const wantsJson = (req.headers.accept || '').includes('application/json');
      if (wantsJson) {
        res.status(400).json({ error: 'Invalid URL' });
      } else {
        res.status(400).type('text/plain; charset=utf-8').send('# Error\n\nInvalid URL. Provide a valid domain, e.g. `?url=example.com`\n');
      }
      return;
    }

    const hostname = parsedUrl.hostname;
    const fresh = req.query.fresh === 'true';
    const wantsJson = (req.headers.accept || '').includes('application/json');
    const now = Timestamp.now();

    // Look for existing audit (unless fresh=true)
    let existingDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

    if (!fresh) {
      const snapshot = await db
        .collection('audits')
        .where('domain', '==', hostname)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data();

        // Skip expired audits
        if (data.expiresAt && data.expiresAt.toMillis() < now.toMillis()) {
          existingDoc = null;
        } else {
          existingDoc = doc;
        }
      }
    }

    if (existingDoc) {
      const data = existingDoc.data();

      if (data.status === 'failed') {
        const reportData = {
          auditId: existingDoc.id,
          domain: hostname,
          status: 'failed',
          error: data.error || 'Unknown error',
        };

        if (wantsJson) {
          res.status(200).json({
            auditId: existingDoc.id,
            url: data.url,
            domain: hostname,
            status: 'failed',
            error: data.error || 'Unknown error',
            message: 'Audit failed. Use ?fresh=true to retry.',
          });
        } else {
          res
            .status(200)
            .type('text/plain; charset=utf-8')
            .send(renderReportMarkdown(reportData));
        }
        return;
      }

      if (data.status === 'completed') {
        const reportData = {
          auditId: existingDoc.id,
          domain: hostname,
          status: 'completed' as const,
          result: data.result,
          recommendations: data.recommendations,
        };

        if (wantsJson) {
          res.status(200).json({
            auditId: existingDoc.id,
            url: data.url,
            domain: hostname,
            status: 'completed',
            result: data.result,
            recommendations: data.recommendations,
          });
        } else {
          res
            .status(200)
            .type('text/plain; charset=utf-8')
            .send(renderReportMarkdown(reportData));
        }
        return;
      }

      // Queued or running
      const reportData = {
        auditId: existingDoc.id,
        domain: hostname,
        status: data.status,
        progress: data.progress,
      };

      if (wantsJson) {
        res
          .status(202)
          .set('Retry-After', '10')
          .json({
            auditId: existingDoc.id,
            url: data.url,
            domain: hostname,
            status: data.status,
            progress: data.progress || null,
            message: 'Audit in progress. Retry after 10 seconds.',
          });
      } else {
        res
          .status(202)
          .set('Retry-After', '10')
          .type('text/plain; charset=utf-8')
          .send(renderReportMarkdown(reportData));
      }
      return;
    }

    // No existing audit — create a new one
    const expiresAt = Timestamp.fromMillis(now.toMillis() + ANON_EXPIRY_MS);
    const auditRef = db.collection('audits').doc();
    await auditRef.set({
      url: parsedUrl.href,
      domain: hostname,
      userId: null,
      anonymous: true,
      status: 'queued',
      maxPages: ANON_MAX_PAGES,
      createdAt: now,
      expiresAt,
    });

    const reportData = {
      auditId: auditRef.id,
      domain: hostname,
      status: 'started',
    };

    if (wantsJson) {
      res
        .status(202)
        .set('Retry-After', '20')
        .json({
          auditId: auditRef.id,
          url: parsedUrl.href,
          domain: hostname,
          status: 'queued',
          message: 'Audit started. Retry after 20 seconds.',
        });
    } else {
      res
        .status(202)
        .set('Retry-After', '20')
        .type('text/plain; charset=utf-8')
        .send(renderReportMarkdown(reportData));
    }
  },
);
