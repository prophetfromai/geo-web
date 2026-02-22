import type { Timestamp } from 'firebase-admin/firestore';
import type { AuditResult, RecommendationsResult } from '../engine/types.js';

export interface AuditDoc {
  url: string;
  domain: string;
  userId: string | null;
  anonymous: boolean;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress?: { phase: string; pagesCrawled?: number; maxPages?: number };
  error?: string;
  maxPages: number;
  result?: AuditResult;
  recommendations?: RecommendationsResult;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  expiresAt: Timestamp;
}
