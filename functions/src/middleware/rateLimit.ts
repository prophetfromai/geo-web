import { db, ANON_RATE_LIMIT, RATE_LIMIT_WINDOW_MS } from '../config.js';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

/**
 * Check if an IP has exceeded the anonymous rate limit.
 * Returns true if the request should be allowed, false if rate-limited.
 */
export async function checkRateLimit(ip: string): Promise<boolean> {
  const docRef = db.collection('rateLimits').doc(ip);
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  const doc = await docRef.get();

  if (!doc.exists) {
    await docRef.set({
      requests: [Timestamp.fromMillis(now)],
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  }

  const data = doc.data()!;
  const requests: Timestamp[] = data.requests || [];

  // Filter to only requests within the window
  const recentRequests = requests.filter(
    (ts: Timestamp) => ts.toMillis() > windowStart,
  );

  if (recentRequests.length >= ANON_RATE_LIMIT) {
    return false;
  }

  // Add this request
  recentRequests.push(Timestamp.fromMillis(now));
  await docRef.set({
    requests: recentRequests,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return true;
}
