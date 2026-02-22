/** AI crawler bot names to check in robots.txt */
export const AI_CRAWLERS = [
  'GPTBot',
  'ClaudeBot',
  'PerplexityBot',
  'Google-Extended',
  'ChatGPT-User',
  'Applebot-Extended',
  'CCBot',
  'anthropic-ai',
  'cohere-ai',
] as const;

/** Scoring weights for Phase 1 (technical only — content & authority added later) */
export const SCORING_WEIGHTS = {
  technical: {
    robotsAiRules: 0.08,
    llmsTxt: 0.08,
    schemaCoverage: 0.10,
    sitemap: 0.04,
    metaDescriptions: 0.05,
    httpsAndPerf: 0.05,
  },
  content: {
    depth: 0.08,
    structure: 0.08,
    citations: 0.06,
    statistics: 0.05,
    eeat: 0.06,
    freshness: 0.04,
    internalLinking: 0.03,
  },
  authority: {
    contentBreadth: 0.10,
    directAnswers: 0.05,
    uniqueValue: 0.05,
  },
} as const;

/** Grade thresholds */
export const GRADE_BANDS = {
  excellent: 80,
  good: 60,
  needsWork: 40,
} as const;

/** Crawl settings */
export const CRAWL_DEFAULTS = {
  concurrency: 3,
  delayMs: 500,
  timeoutMs: 15_000,
  maxPages: 100,
  userAgent: 'GEO-Audit-Tool/0.1',
  maxRetries: 2,
} as const;
