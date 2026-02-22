import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();

export const FUNCTIONS_REGION = 'europe-west2';
export const MAX_INSTANCES = 10;

/** Anonymous users: max 3 audits per day per IP */
export const ANON_RATE_LIMIT = 3;
export const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Anonymous audits expire after 24 hours */
export const ANON_EXPIRY_MS = 24 * 60 * 60 * 1000;

/** Max pages for anonymous audits */
export const ANON_MAX_PAGES = 20;
