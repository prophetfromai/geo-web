import type {
  AuditResult,
  DisruptionLevel,
  ImpactLevel,
  Recommendation,
  RecommendationsResult,
} from '../types.js';
import { AI_CRAWLERS } from '../config.js';
import { CITATIONS } from './research.js';

/** Generate actionable recommendations from an audit result */
export function generateRecommendations(
  audit: AuditResult,
): RecommendationsResult {
  const recs: Recommendation[] = [
    ...robotsRules(audit),
    ...llmsTxtRules(audit),
    ...schemaRules(audit),
    ...metaRules(audit),
    ...contentRules(audit),
    ...infrastructureRules(audit),
  ];

  recs.sort((a, b) => priority(b) - priority(a));

  const summary: Record<DisruptionLevel, number> = {
    'non-invasive': 0,
    low: 0,
    moderate: 0,
    disruptive: 0,
  };
  for (const r of recs) {
    summary[r.disruption]++;
  }

  const quickWinEstimate =
    summary['non-invasive'] + summary['low'];

  return { recommendations: recs, summary, quickWinEstimate };
}

const IMPACT_WEIGHT: Record<ImpactLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const DISRUPTION_WEIGHT: Record<DisruptionLevel, number> = {
  'non-invasive': 1,
  low: 2,
  moderate: 3,
  disruptive: 4,
};

function priority(r: Recommendation): number {
  return IMPACT_WEIGHT[r.impact.level] * 10 - DISRUPTION_WEIGHT[r.disruption];
}

function rec(
  id: string,
  title: string,
  description: string,
  category: Recommendation['category'],
  disruption: DisruptionLevel,
  impactLevel: ImpactLevel,
  citation: string,
  affectedPages: string[],
  steps: string[],
  triggeredBy: string,
): Recommendation {
  return {
    id,
    title,
    description,
    category,
    disruption,
    impact: { level: impactLevel, citation },
    affectedPages,
    steps,
    triggeredBy,
  };
}

function robotsRules(audit: AuditResult): Recommendation[] {
  const recs: Recommendation[] = [];
  const robots = audit.technical.robots;

  if (!robots.raw) {
    recs.push(
      rec(
        'robots-no-file',
        'Create robots.txt',
        'No robots.txt file found. AI crawlers have no guidance on what to index.',
        'robots-crawlers',
        'non-invasive',
        'high',
        CITATIONS.robotsCrawlers,
        [],
        [
          'Create a robots.txt file at the site root',
          'Add User-agent rules for AI crawlers: GPTBot, ClaudeBot, PerplexityBot, Google-Extended, ChatGPT-User',
          'Allow crawling of all public content pages',
          'Reference your sitemap URL',
        ],
        'No robots.txt detected',
      ),
    );
    return recs;
  }

  if (!robots.hasAiCrawlerRules) {
    recs.push(
      rec(
        'robots-no-ai-rules',
        'Add AI crawler rules to robots.txt',
        `robots.txt exists but contains no rules for AI crawlers. All ${AI_CRAWLERS.length} AI bots are unmentioned.`,
        'robots-crawlers',
        'non-invasive',
        'high',
        CITATIONS.robotsCrawlers,
        [],
        [
          'Add explicit User-agent rules for each AI crawler',
          'Allow: / for GPTBot, ClaudeBot, PerplexityBot, Google-Extended, ChatGPT-User, Applebot-Extended',
          'Consider blocking CCBot if you want to opt out of Common Crawl training data',
          'Test with a robots.txt validator after changes',
        ],
        `${robots.unmentionedBots.length} AI bots have no rules`,
      ),
    );
  }

  if (robots.blockedBots.length > 0) {
    recs.push(
      rec(
        'robots-blocked-bots',
        'Unblock AI crawlers in robots.txt',
        `${robots.blockedBots.length} AI crawler(s) are explicitly blocked: ${robots.blockedBots.join(', ')}. This prevents your content from appearing in their AI-generated answers.`,
        'robots-crawlers',
        'non-invasive',
        'high',
        CITATIONS.robotsCrawlers,
        [],
        [
          `Change Disallow to Allow for: ${robots.blockedBots.join(', ')}`,
          'Verify changes with a robots.txt tester',
          'Allow 24-48 hours for crawlers to re-index',
        ],
        `Blocked bots: ${robots.blockedBots.join(', ')}`,
      ),
    );
  }

  if (
    robots.hasAiCrawlerRules &&
    robots.unmentionedBots.length > 0 &&
    robots.blockedBots.length === 0
  ) {
    recs.push(
      rec(
        'robots-unmentioned-bots',
        'Add rules for remaining AI crawlers',
        `Some AI crawlers have rules, but ${robots.unmentionedBots.length} are still unmentioned: ${robots.unmentionedBots.join(', ')}.`,
        'robots-crawlers',
        'non-invasive',
        'medium',
        CITATIONS.robotsCrawlers,
        [],
        [
          `Add explicit Allow rules for: ${robots.unmentionedBots.join(', ')}`,
          'This ensures all major AI platforms can index your content',
        ],
        `${robots.unmentionedBots.length} bots unmentioned`,
      ),
    );
  }

  return recs;
}

function llmsTxtRules(audit: AuditResult): Recommendation[] {
  const recs: Recommendation[] = [];
  const llms = audit.technical.llmsTxt;

  if (!llms.exists) {
    recs.push(
      rec(
        'llms-missing',
        'Create llms.txt',
        'No llms.txt file found. This emerging protocol tells AI crawlers what content to prioritise.',
        'llms-txt',
        'non-invasive',
        'high',
        CITATIONS.llmsAdoption,
        [],
        [
          'Create an llms.txt file at the site root',
          'Add a title line describing your site/brand',
          'Add a description summarising what your site offers',
          'Link to your most important content pages',
          'See llmstxt.org for the specification',
        ],
        'llms.txt returned 404',
      ),
    );
    return recs;
  }

  if (!llms.hasTitle) {
    recs.push(
      rec(
        'llms-no-title',
        'Add title to llms.txt',
        'llms.txt exists but has no title. The title helps AI systems identify your brand.',
        'llms-txt',
        'non-invasive',
        'low',
        CITATIONS.llmsAdoption,
        [],
        [
          'Add a title as the first line: # Your Brand Name',
          'Keep it concise — your brand name or primary offering',
        ],
        'llms.txt missing title',
      ),
    );
  }

  if (!llms.hasDescription) {
    recs.push(
      rec(
        'llms-no-description',
        'Add description to llms.txt',
        'llms.txt exists but has no description. A brief description helps AI systems understand your content.',
        'llms-txt',
        'non-invasive',
        'low',
        CITATIONS.llmsAdoption,
        [],
        [
          'Add a description paragraph after the title',
          'Summarise what your site offers in 1-2 sentences',
          'Include your primary value proposition',
        ],
        'llms.txt missing description',
      ),
    );
  }

  if (!llms.linkedPages || llms.linkedPages.length === 0) {
    recs.push(
      rec(
        'llms-no-links',
        'Add page links to llms.txt',
        'llms.txt has no linked pages. Without links, AI crawlers don\'t know which content to prioritise.',
        'llms-txt',
        'non-invasive',
        'medium',
        CITATIONS.llmsAdoption,
        [],
        [
          'Add links to your most important content pages',
          'Use the format: - [Page Title](URL): Brief description',
          'Prioritise pages that answer common questions in your domain',
          'Include 5-20 of your highest-value pages',
        ],
        'llms.txt has 0 linked pages',
      ),
    );
  }

  return recs;
}

function schemaRules(audit: AuditResult): Recommendation[] {
  const recs: Recommendation[] = [];
  const pages = audit.technical.pages;
  if (pages.length === 0) return recs;

  const pagesWithSchema = pages.filter((p) => p.schema.types.length > 0);
  const coverage = pagesWithSchema.length / pages.length;

  const allTypes = new Set<string>();
  for (const page of pages) {
    for (const t of page.schema.types) allTypes.add(t);
  }

  if (pagesWithSchema.length === 0) {
    recs.push(
      rec(
        'schema-none',
        'Add structured data (schema markup)',
        'No pages have any structured data. Schema markup shows 30-40% higher visibility in AI answers.',
        'schema',
        'moderate',
        'high',
        CITATIONS.schemaVisibility,
        pages.map((p) => p.url),
        [
          'Start with Organization schema on the homepage',
          'Add WebSite schema with SearchAction on the homepage',
          'Add appropriate schema to each page type (Article, Product, FAQ, etc.)',
          'Use JSON-LD format in the <head> section',
          'Validate with Google Rich Results Test',
        ],
        '0 pages have schema',
      ),
    );
    return recs;
  }

  if (coverage < 0.8) {
    const withoutSchema = pages.filter((p) => p.schema.types.length === 0);
    recs.push(
      rec(
        'schema-partial',
        'Extend schema coverage to all pages',
        `Only ${pagesWithSchema.length}/${pages.length} pages (${Math.round(coverage * 100)}%) have structured data. Aim for 80%+ coverage.`,
        'schema',
        'low',
        'high',
        CITATIONS.schemaVisibility,
        withoutSchema.map((p) => p.url),
        [
          'Audit each page without schema and add the most relevant type',
          'Content pages: Article or BlogPosting schema',
          'Product pages: Product schema with offers',
          'FAQ sections: FAQPage schema',
          'Service pages: Service schema',
          'Validate each page with Google Rich Results Test',
        ],
        `${withoutSchema.length} pages missing schema`,
      ),
    );
  }

  if (!allTypes.has('Organization')) {
    recs.push(
      rec(
        'schema-no-org',
        'Add Organization schema',
        'No Organization schema found. This establishes your brand entity identity for AI systems.',
        'schema',
        'non-invasive',
        'medium',
        CITATIONS.orgSchema,
        [],
        [
          'Add Organization schema to the homepage',
          'Include: name, url, logo, description, sameAs (social profiles)',
          'This is typically added once in the site header/layout',
        ],
        'Organization schema not detected',
      ),
    );
  }

  if (!allTypes.has('FAQPage') && pages.length > 5) {
    recs.push(
      rec(
        'schema-no-faq',
        'Add FAQ schema to relevant pages',
        'No FAQ schema found. FAQ structured data provides direct Q&A pairs that AI systems can cite verbatim.',
        'schema',
        'low',
        'high',
        CITATIONS.faqSchema,
        [],
        [
          'Identify pages with question-answer content',
          'Add FAQPage schema with Question and AcceptedAnswer pairs',
          'Each Q&A should be a genuine, helpful answer',
          'This is one of the highest-impact schema types for GEO',
        ],
        'No FAQPage schema on site with 5+ pages',
      ),
    );
  }

  if (!allTypes.has('BreadcrumbList')) {
    recs.push(
      rec(
        'schema-no-breadcrumb',
        'Add BreadcrumbList schema',
        'No breadcrumb schema found. Breadcrumbs help AI understand your site hierarchy.',
        'schema',
        'low',
        'medium',
        CITATIONS.breadcrumbSchema,
        [],
        [
          'Add BreadcrumbList schema to all inner pages',
          'Reflect the actual site navigation hierarchy',
          'Format: Home > Category > Page',
        ],
        'BreadcrumbList schema not detected',
      ),
    );
  }

  const contentPages = pages.filter((p) => p.wordCount > 300);
  const contentPagesWithoutArticle = contentPages.filter(
    (p) => !p.schema.types.some((t) => t === 'Article' || t === 'BlogPosting' || t === 'NewsArticle'),
  );
  if (contentPagesWithoutArticle.length > 0) {
    recs.push(
      rec(
        'schema-no-article',
        'Add Article schema to content pages',
        `${contentPagesWithoutArticle.length} content page(s) with 300+ words lack Article/BlogPosting schema.`,
        'schema',
        'low',
        'medium',
        CITATIONS.articleSchema,
        contentPagesWithoutArticle.map((p) => p.url),
        [
          'Add Article or BlogPosting schema to long-form content pages',
          'Include: headline, datePublished, dateModified, author, description',
          'dateModified is particularly important for AI recency signals',
        ],
        `${contentPagesWithoutArticle.length} content pages missing Article schema`,
      ),
    );
  }

  return recs;
}

function metaRules(audit: AuditResult): Recommendation[] {
  const recs: Recommendation[] = [];
  const pages = audit.technical.pages;
  if (pages.length === 0) return recs;

  const missingDesc = pages.filter(
    (p) => !p.meta.description || p.meta.descriptionLength < 50,
  );
  if (missingDesc.length > 0) {
    recs.push(
      rec(
        'meta-missing-desc',
        'Fix missing or short meta descriptions',
        `${missingDesc.length} page(s) have missing or very short (<50 char) meta descriptions.`,
        'meta-tags',
        'non-invasive',
        'medium',
        CITATIONS.metaDescriptions,
        missingDesc.map((p) => p.url),
        [
          'Write unique, descriptive meta descriptions (120-160 characters)',
          'Include primary topic and value proposition',
          'AI systems use these as content summaries for relevance assessment',
        ],
        `${missingDesc.length} pages with missing/short descriptions`,
      ),
    );
  }

  const shortTitles = pages.filter(
    (p) => !p.meta.title || p.meta.titleLength < 30,
  );
  if (shortTitles.length > 0) {
    recs.push(
      rec(
        'meta-short-titles',
        'Improve short page titles',
        `${shortTitles.length} page(s) have missing or short (<30 char) titles.`,
        'meta-tags',
        'non-invasive',
        'medium',
        CITATIONS.metaDescriptions,
        shortTitles.map((p) => p.url),
        [
          'Write descriptive titles (30-60 characters)',
          'Include primary keyword and brand name',
          'Make each title unique across the site',
        ],
        `${shortTitles.length} pages with short titles`,
      ),
    );
  }

  const missingOg = pages.filter(
    (p) => !p.meta.ogTitle && !p.meta.ogDescription,
  );
  if (missingOg.length > 0) {
    recs.push(
      rec(
        'meta-no-og',
        'Add Open Graph tags',
        `${missingOg.length} page(s) are missing Open Graph tags.`,
        'meta-tags',
        'non-invasive',
        'low',
        CITATIONS.ogTags,
        missingOg.map((p) => p.url),
        [
          'Add og:title, og:description, and og:image to all pages',
          'These help AI systems understand content when shared across platforms',
          'Most CMS platforms have plugins to auto-generate OG tags',
        ],
        `${missingOg.length} pages missing OG tags`,
      ),
    );
  }

  const missingCanonical = pages.filter((p) => !p.meta.canonical);
  if (missingCanonical.length > 0) {
    recs.push(
      rec(
        'meta-no-canonical',
        'Add canonical URLs',
        `${missingCanonical.length} page(s) are missing canonical link tags.`,
        'meta-tags',
        'non-invasive',
        'low',
        CITATIONS.canonical,
        missingCanonical.map((p) => p.url),
        [
          'Add <link rel="canonical" href="..."> to every page',
          'Set the canonical to the preferred version of each URL',
          'This prevents duplicate content confusion in AI pipelines',
        ],
        `${missingCanonical.length} pages missing canonical`,
      ),
    );
  }

  return recs;
}

function contentRules(audit: AuditResult): Recommendation[] {
  const recs: Recommendation[] = [];
  const pages = audit.technical.pages;
  if (pages.length === 0) return recs;

  const thinPages = pages.filter((p) => p.wordCount < 100);
  if (thinPages.length > 0) {
    recs.push(
      rec(
        'content-thin-pages',
        'Expand thin pages or consolidate',
        `${thinPages.length} page(s) have fewer than 100 words. These lack sufficient content for AI extraction.`,
        'content-quality',
        'moderate',
        'high',
        CITATIONS.thinContent,
        thinPages.map((p) => p.url),
        [
          'Review each thin page — is it necessary?',
          'Auth/utility pages (login, register): consider noindex or exclude from sitemap',
          'Content pages: expand with useful, relevant content (aim for 300+ words)',
          'Similar thin pages: consolidate into a single comprehensive page',
        ],
        `${thinPages.length} pages under 100 words`,
      ),
    );
  }

  const headingIssues = pages.filter((p) => {
    const h1s = p.headingStructure.filter((h) => h.tag === 'h1');
    return h1s.length === 0 || h1s.length > 1;
  });
  if (headingIssues.length > 0) {
    recs.push(
      rec(
        'content-heading-issues',
        'Fix H1 heading structure',
        `${headingIssues.length} page(s) have missing or multiple H1 tags.`,
        'content-structure',
        'low',
        'medium',
        CITATIONS.headingStructure,
        headingIssues.map((p) => p.url),
        [
          'Ensure every page has exactly one H1 tag',
          'The H1 should clearly describe the page topic',
          'Use H2-H6 for subsections in a logical hierarchy',
          'AI systems use heading structure to parse content topics',
        ],
        `${headingIssues.length} pages with H1 issues`,
      ),
    );
  }

  if (!audit.technical.httpsEnforced) {
    recs.push(
      rec(
        'https-missing',
        'Enable HTTPS',
        'Site is not served over HTTPS. This is a baseline trust signal for AI systems.',
        'infrastructure',
        'moderate',
        'medium',
        CITATIONS.https,
        [],
        [
          'Obtain an SSL/TLS certificate (free via Let\'s Encrypt)',
          'Configure your server to redirect HTTP to HTTPS',
          'Update all internal links to use HTTPS',
          'Update sitemap and canonical URLs to HTTPS',
        ],
        'Site not served over HTTPS',
      ),
    );
  }

  return recs;
}

function infrastructureRules(audit: AuditResult): Recommendation[] {
  const recs: Recommendation[] = [];

  if (!audit.technical.sitemapFound) {
    recs.push(
      rec(
        'sitemap-missing',
        'Create an XML sitemap',
        'No sitemap found. Sitemaps help AI crawlers discover and prioritise your content.',
        'infrastructure',
        'low',
        'medium',
        CITATIONS.sitemap,
        [],
        [
          'Generate an XML sitemap with all public pages',
          'Include lastmod dates for freshness signals',
          'Reference the sitemap in robots.txt: Sitemap: https://yoursite.com/sitemap.xml',
          'Submit to Google Search Console',
        ],
        'No sitemap detected',
      ),
    );
  }

  if (
    audit.technical.sitemapFound &&
    audit.technical.sitemapUrls.length < audit.pagesCrawled
  ) {
    recs.push(
      rec(
        'sitemap-incomplete',
        'Update sitemap with all pages',
        `Sitemap has ${audit.technical.sitemapUrls.length} URLs but ${audit.pagesCrawled} pages were discovered via crawling.`,
        'infrastructure',
        'non-invasive',
        'low',
        CITATIONS.sitemap,
        [],
        [
          'Regenerate your sitemap to include all public pages',
          'Ensure dynamic/new pages are automatically added',
          'Remove any URLs that return 404 or redirect',
        ],
        `Sitemap has fewer URLs (${audit.technical.sitemapUrls.length}) than crawled pages (${audit.pagesCrawled})`,
      ),
    );
  }

  if (audit.score.score < 25) {
    recs.push(
      rec(
        'infra-shadow-site',
        'Consider a shadow site strategy',
        'The site scores below 25/100, indicating severe under-optimisation. A staging mirror approach allows safe, iterative improvement before going live.',
        'infrastructure',
        'disruptive',
        'high',
        CITATIONS.shadowSite,
        [],
        [
          'Set up a staging environment that mirrors the production site',
          'Block AI crawlers on staging (robots.txt Disallow for all AI bots)',
          'Apply all quick-win recommendations (non-invasive + low disruption) on staging',
          'Run a GEO audit on staging to verify improvements',
          'Once staging scores above 60, deploy changes to production',
          'Re-run audit on production to confirm improvements are live',
        ],
        `Overall score ${audit.score.score}/100 (below 25 threshold)`,
      ),
    );
  }

  return recs;
}
