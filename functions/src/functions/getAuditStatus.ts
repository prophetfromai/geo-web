import { onRequest } from 'firebase-functions/v2/https';
import { db, FUNCTIONS_REGION } from '../config.js';

export const getAuditStatus = onRequest(
  {
    region: FUNCTIONS_REGION,
    cors: true,
  },
  async (req, res) => {
    if (req.method !== 'GET') {
      res.status(405).json({ error: { message: 'Method not allowed' } });
      return;
    }

    const auditId = req.query.id as string;
    if (!auditId) {
      res.status(400).json({ error: { message: 'Audit ID is required' } });
      return;
    }

    const doc = await db.collection('audits').doc(auditId).get();
    if (!doc.exists) {
      res.status(404).json({ error: { message: 'Audit not found' } });
      return;
    }

    const data = doc.data()!;

    const response: Record<string, unknown> = {
      auditId: doc.id,
      url: data.url,
      domain: data.domain,
      status: data.status,
    };

    if (data.progress) {
      response.progress = data.progress;
    }

    if (data.status === 'completed') {
      response.result = data.result;
      response.recommendations = data.recommendations;
      response.completedAt = data.completedAt;
    }

    if (data.status === 'failed') {
      response.error = data.error;
    }

    res.status(200).json(response);
  },
);
