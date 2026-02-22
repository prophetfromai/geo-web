import { onRequest } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { db, FUNCTIONS_REGION, ANON_MAX_PAGES, ANON_EXPIRY_MS } from '../config.js';

export const submitAudit = onRequest(
  {
    region: FUNCTIONS_REGION,
    cors: true,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: { message: 'Method not allowed' } });
      return;
    }

    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: { message: 'URL is required' } });
      return;
    }

    // Basic URL validation
    let parsedUrl: URL;
    try {
      const normalized = url.startsWith('http') ? url : `https://${url}`;
      parsedUrl = new URL(normalized);
      if (!parsedUrl.hostname.includes('.') && parsedUrl.hostname !== 'localhost') {
        throw new Error('Invalid hostname');
      }
    } catch {
      res.status(400).json({ error: { message: 'Invalid URL' } });
      return;
    }

    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + ANON_EXPIRY_MS);

    const auditRef = db.collection('audits').doc();
    await auditRef.set({
      url: parsedUrl.href,
      domain: parsedUrl.hostname,
      userId: null,
      anonymous: true,
      status: 'queued',
      maxPages: ANON_MAX_PAGES,
      createdAt: now,
      expiresAt,
    });

    res.status(200).json({ auditId: auditRef.id });
  },
);
