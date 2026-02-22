import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import { db, FUNCTIONS_REGION } from '../config.js';
import { runAudit } from '../engine/audit/runner.js';
import { generateRecommendations } from '../engine/recommend/engine.js';
import type { AuditDoc } from '../types/firestore.js';

export const processAudit = onDocumentCreated(
  {
    document: 'audits/{auditId}',
    region: FUNCTIONS_REGION,
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const auditId = event.params.auditId;
    const data = snap.data() as AuditDoc;
    const docRef = db.collection('audits').doc(auditId);

    try {
      await docRef.update({ status: 'running' });

      const result = await runAudit(
        data.url,
        { maxPages: data.maxPages },
        async (progress) => {
          await docRef.update({ progress });
        },
      );

      // Strip raw HTML from page data before storing
      const cleanResult = {
        ...result,
        auditedAt: result.auditedAt.toISOString(),
        technical: {
          ...result.technical,
          // Remove raw robots.txt content to save space
          robots: {
            ...result.technical.robots,
            raw: result.technical.robots.raw ? '(stored)' : '',
          },
        },
      };

      const recommendations = generateRecommendations(result);

      await docRef.update({
        status: 'completed',
        result: cleanResult,
        recommendations,
        progress: null,
        completedAt: Timestamp.now(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      await docRef.update({
        status: 'failed',
        error: message,
        progress: null,
      });
    }
  },
);
