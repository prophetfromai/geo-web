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

/** Scoring weights — total = 1.00 (technical 0.35 + content 0.35 + authority 0.30) */
export const SCORING_WEIGHTS = {
  technical: {
    robotsAiRules: 0.06,
    llmsTxt: 0.06,
    schemaCoverage: 0.08,
    sitemap: 0.04,
    metaDescriptions: 0.04,
    httpsAndPerf: 0.03,
    ogTwitterCompleteness: 0.04,
  },
  content: {
    contentDepth: 0.10,
    headingQuality: 0.08,
    imageAccessibility: 0.07,
    answerFirst: 0.10,
  },
  authority: {
    entityClarity: 0.10,
    agentDiscoverability: 0.10,
    trustSignals: 0.10,
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
