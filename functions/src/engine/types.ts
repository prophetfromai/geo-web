// ── Page Classification ──

export type PageType =
  | 'home'
  | 'landing'
  | 'article'
  | 'faq'
  | 'docs'
  | 'about'
  | 'contact'
  | 'product'
  | 'unknown';

// ── Image Audit ──

export interface ImageAudit {
  total: number;
  withAlt: number;
  withWeakAlt: number;
  missingAlt: number;
}

// ── Identity Signals ──

export interface IdentitySignals {
  sameAsLinks: string[];
  hasAuthorInfo: boolean;
  authorName: string | null;
}

// ── Discovery ──

export interface DiscoveryResult {
  rssFound: boolean;
  rssUrl: string | null;
  openApiFound: boolean;
  openApiUrl: string | null;
}

// ── Page & Crawl ──

export interface PageData {
  url: string;
  statusCode: number;
  html: string;
  headers: Record<string, string>;
  fetchedAt: Date;
}

export interface SitemapEntry {
  url: string;
  lastmod?: string;
  priority?: number;
}

// ── Robots.txt ──

export interface RobotsResult {
  raw: string;
  hasAiCrawlerRules: boolean;
  allowedBots: string[];
  blockedBots: string[];
  unmentionedBots: string[];
  sitemapUrls: string[];
}

// ── llms.txt ──

export interface LlmsTxtResult {
  exists: boolean;
  raw?: string;
  lineCount?: number;
  hasTitle?: boolean;
  hasDescription?: boolean;
  linkedPages?: string[];
}

// ── Schema / Structured Data ──

export interface SchemaResult {
  types: string[];
  jsonLd: Record<string, unknown>[];
  hasProduct: boolean;
  hasFaq: boolean;
  hasOrganization: boolean;
  hasWebSite: boolean;
  hasBreadcrumb: boolean;
  hasArticle: boolean;
  hasHowTo: boolean;
}

// ── Meta Tags ──

export interface MetaResult {
  title: string | null;
  titleLength: number;
  description: string | null;
  descriptionLength: number;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogUrl: string | null;
  canonical: string | null;
  twitterCard: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
}

// ── Page-Level Technical Audit ──

export interface PageTechnicalAudit {
  url: string;
  meta: MetaResult;
  schema: SchemaResult;
  headingStructure: { tag: string; text: string }[];
  wordCount: number;
  hasHttps: boolean;
  pageType: PageType;
  images: ImageAudit;
  identity: IdentitySignals;
  answerFirst: boolean;
  firstParagraphWords: number;
}

// ── Site-Level Technical Audit ──

export interface TechnicalAuditResult {
  robots: RobotsResult;
  llmsTxt: LlmsTxtResult;
  sitemapFound: boolean;
  sitemapUrls: string[];
  pages: PageTechnicalAudit[];
  httpsEnforced: boolean;
  discovery: DiscoveryResult;
}

// ── Scoring ──

export interface CheckScore {
  name: string;
  score: number;
  maxScore: 10;
  weight: number;
  weighted: number;
  rationale: string;
}

export interface CategoryScore {
  category: 'technical' | 'content' | 'authority';
  checks: CheckScore[];
  score: number;
  maxScore: number;
}

export interface OverallScore {
  score: number;
  grade: 'Excellent' | 'Good' | 'Needs Work' | 'Not GEO-ready';
  categories: CategoryScore[];
}

// ── Full Audit Result ──

export interface AuditResult {
  url: string;
  auditedAt: Date;
  pagesDiscovered: number;
  pagesCrawled: number;
  technical: TechnicalAuditResult;
  score: OverallScore;
}

// ── Recommendations ──

export type DisruptionLevel = 'non-invasive' | 'low' | 'moderate' | 'disruptive';

export type RecommendationCategory =
  | 'robots-crawlers'
  | 'llms-txt'
  | 'schema'
  | 'meta-tags'
  | 'content-structure'
  | 'content-quality'
  | 'freshness'
  | 'authority'
  | 'infrastructure';

export type ImpactLevel = 'low' | 'medium' | 'high';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: RecommendationCategory;
  disruption: DisruptionLevel;
  impact: {
    level: ImpactLevel;
    citation: string;
  };
  affectedPages: string[];
  steps: string[];
  triggeredBy: string;
  snippet?: string;
  checkName?: string;
}

export interface RecommendationsResult {
  recommendations: Recommendation[];
  summary: Record<DisruptionLevel, number>;
  quickWinEstimate: number;
}

// ── Progress callback for web integration ──

export interface AuditProgress {
  phase: string;
  pagesCrawled?: number;
  maxPages?: number;
}
