import type {
  AuditResult,
  DisruptionLevel,
  ImpactLevel,
  Recommendation,
  RecommendationsResult,
} from '../types.js';
import { AI_CRAWLERS } from '../config.js';
import { CITATIONS } from './research.js';
import {
  generateOrganizationJsonLd,
  generateWebSiteJsonLd,
  generateArticleJsonLd,
  generateFAQPageJsonLd,
  generateProductJsonLd,
  generateAboutPageJsonLd,
  generateLlmsTxt,
  generateRobotsTxtSuggestion,
} from './generators.js';

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
    ...authorityRules(audit),
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
  snippet?: string,
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
    ...(snippet ? { snippet } : {}),
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
        generateRobotsTxtSuggestion(audit),
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
        generateRobotsTxtSuggestion(audit),
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
        generateLlmsTxt(audit),
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
        generateOrganizationJsonLd(audit),
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
        generateOrganizationJsonLd(audit),
      ),
    );
  }

  if (!allTypes.has('WebSite')) {
    recs.push(
      rec(
        'schema-no-website',
        'Add WebSite schema with SearchAction',
        'No WebSite schema found. This helps AI systems understand your site as a whole and enables search functionality in knowledge panels.',
        'schema',
        'non-invasive',
        'medium',
        CITATIONS.schemaVisibility,
        [],
        [
          'Add WebSite schema to the homepage',
          'Include a SearchAction if your site has search functionality',
        ],
        'WebSite schema not detected',
        generateWebSiteJsonLd(audit),
      ),
    );
  }

  if (!allTypes.has('FAQPage') && pages.length > 5) {
    // Find a page with question-like headings to generate a snippet for
    const faqCandidate = pages.find((p) =>
      p.headingStructure.some((h) => h.text.endsWith('?')),
    ) ?? pages[0];

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
        generateFAQPageJsonLd(faqCandidate),
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
        generateArticleJsonLd(contentPagesWithoutArticle[0]),
      ),
    );
  }

  // Product pages without Product schema
  const productPages = pages.filter((p) => p.pageType === 'product' && !p.schema.hasProduct);
  if (productPages.length > 0) {
    recs.push(
      rec(
        'schema-no-product',
        'Add Product schema to product pages',
        `${productPages.length} product page(s) lack Product/SoftwareApplication schema.`,
        'schema',
        'low',
        'medium',
        CITATIONS.schemaVisibility,
        productPages.map((p) => p.url),
        [
          'Add Product or SoftwareApplication schema to product/pricing pages',
          'Include: name, description, offers with price and currency',
          'This helps AI systems understand and cite your product details',
        ],
        `${productPages.length} product pages missing schema`,
        generateProductJsonLd(productPages[0]),
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

  // OG tag completeness
  const incompleteOg = pages.filter((p) => {
    const m = p.meta;
    return !(m.ogTitle && m.ogDescription && m.ogImage && m.ogUrl);
  });
  if (incompleteOg.length > 0) {
    recs.push(
      rec(
        'meta-og-incomplete',
        'Complete Open Graph tags',
        `${incompleteOg.length} page(s) have incomplete Open Graph metadata (missing og:title, og:description, og:image, or og:url).`,
        'meta-tags',
        'non-invasive',
        'medium',
        CITATIONS.ogTags,
        incompleteOg.map((p) => p.url),
        [
          'Add og:title, og:description, og:image, and og:url to all pages',
          'These provide AI systems with consistent metadata for content understanding',
          'Most CMS platforms have plugins to auto-generate OG tags',
        ],
        `${incompleteOg.length} pages with incomplete OG tags`,
      ),
    );
  }

  // Twitter card tags
  const missingTwitter = pages.filter((p) => !p.meta.twitterCard);
  if (missingTwitter.length > 0) {
    recs.push(
      rec(
        'meta-no-twitter-card',
        'Add Twitter/X Card tags',
        `${missingTwitter.length} page(s) are missing twitter:card metadata. Twitter Cards provide additional signals for AI aggregators and social platforms.`,
        'meta-tags',
        'non-invasive',
        'low',
        CITATIONS.twitterCards,
        missingTwitter.map((p) => p.url),
        [
          'Add twitter:card (usually "summary_large_image") to all pages',
          'Add twitter:title, twitter:description, and twitter:image',
          'These complement OG tags for broader platform coverage',
        ],
        `${missingTwitter.length} pages missing Twitter Card tags`,
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

  // Weak alt text on images
  const pagesWithWeakAlts = pages.filter(
    (p) => p.images.withWeakAlt > 0 || p.images.missingAlt > 0,
  );
  if (pagesWithWeakAlts.length > 0) {
    const totalWeak = pagesWithWeakAlts.reduce((sum, p) => sum + p.images.withWeakAlt, 0);
    const totalMissing = pagesWithWeakAlts.reduce((sum, p) => sum + p.images.missingAlt, 0);
    recs.push(
      rec(
        'content-weak-alt-text',
        'Fix missing or weak image alt text',
        `${totalMissing} images have no alt text and ${totalWeak} have generic/weak alt text (filenames, single words). AI systems rely on alt text to understand visual content.`,
        'content-quality',
        'low',
        'medium',
        CITATIONS.imageAlt,
        pagesWithWeakAlts.map((p) => p.url),
        [
          'Add descriptive alt text to all images (describe what the image shows)',
          'Replace generic alt text (e.g. "image1.jpg", "photo") with meaningful descriptions',
          'Decorative images should have alt="" (empty string), not missing alt',
          'Alt text should be concise (125 characters max) but descriptive',
        ],
        `${totalMissing + totalWeak} images with missing/weak alt text`,
      ),
    );
  }

  // Answer-first content
  const contentPages = pages.filter((p) => p.wordCount >= 300);
  const noAnswerFirst = contentPages.filter((p) => !p.answerFirst);
  if (noAnswerFirst.length > 0 && contentPages.length > 0) {
    recs.push(
      rec(
        'content-no-answer-first',
        'Lead with direct answers',
        `${noAnswerFirst.length}/${contentPages.length} content pages don't lead with substantive answers. AI systems prefer content that answers the topic question in the first paragraph.`,
        'content-quality',
        'moderate',
        'high',
        CITATIONS.answerFirst,
        noAnswerFirst.map((p) => p.url),
        [
          'Open each content page with a direct answer to the topic question',
          'Place the most important information in the first 50-100 words',
          'Avoid lengthy introductions or preambles before the main content',
          'Use the "inverted pyramid" style — conclusion first, details after',
        ],
        `${noAnswerFirst.length} pages don't lead with direct answers`,
      ),
    );
  }

  // Heading hierarchy issues
  const hierarchyIssues = pages.filter((p) => {
    const levels = p.headingStructure.map((h) => parseInt(h.tag[1]));
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] - levels[i - 1] > 1) return true;
    }
    return false;
  });
  if (hierarchyIssues.length > 0) {
    recs.push(
      rec(
        'content-heading-hierarchy',
        'Fix heading hierarchy gaps',
        `${hierarchyIssues.length} page(s) skip heading levels (e.g. H1 → H3). This confuses AI systems parsing content structure.`,
        'content-structure',
        'low',
        'medium',
        CITATIONS.headingHierarchy,
        hierarchyIssues.map((p) => p.url),
        [
          'Ensure headings follow a logical sequence: H1 → H2 → H3 (no skipping)',
          'Each page should have exactly one H1',
          'Use H2s for main sections, H3s for subsections',
          'AI systems use heading hierarchy to understand topic relationships',
        ],
        `${hierarchyIssues.length} pages with heading hierarchy gaps`,
      ),
    );
  }

  // H1 issues (existing check, kept)
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

function authorityRules(audit: AuditResult): Recommendation[] {
  const recs: Recommendation[] = [];
  const pages = audit.technical.pages;

  // No entity signals at all
  const hasAnyEntity = pages.some((p) =>
    p.schema.hasOrganization ||
    p.identity.sameAsLinks.length > 0 ||
    p.identity.hasAuthorInfo,
  );
  if (!hasAnyEntity && pages.length > 0) {
    recs.push(
      rec(
        'authority-no-entity',
        'Establish entity identity',
        'No entity identity signals found (no Organization schema, no sameAs links, no author info). AI systems need clear entity information to attribute and cite your content.',
        'authority',
        'moderate',
        'high',
        CITATIONS.entitySignals,
        [],
        [
          'Add Organization schema with name, url, logo, and description to the homepage',
          'Include sameAs links to your social profiles (LinkedIn, Twitter/X, GitHub, etc.)',
          'Add author information to content pages using Article schema',
          'Ensure author names are consistent across all pages',
        ],
        'No entity identity signals detected',
        generateOrganizationJsonLd(audit),
      ),
    );
  }

  // No RSS feed
  if (!audit.technical.discovery.rssFound) {
    recs.push(
      rec(
        'authority-no-rss',
        'Add an RSS feed',
        'No RSS feed found. RSS provides a machine-readable content index that AI crawlers can monitor for updates and freshness signals.',
        'authority',
        'low',
        'medium',
        CITATIONS.rssFeed,
        [],
        [
          'Generate an RSS/Atom feed at /feed.xml or /rss.xml',
          'Include your latest content pages with title, description, and publication date',
          'Add a <link rel="alternate" type="application/rss+xml"> tag to your HTML <head>',
          'Most static site generators and CMS platforms can auto-generate RSS feeds',
        ],
        'No RSS feed detected',
      ),
    );
  }

  // No author info on any page
  const hasAuthor = pages.some((p) => p.identity.hasAuthorInfo);
  if (!hasAuthor && pages.length > 0) {
    recs.push(
      rec(
        'authority-no-author',
        'Add author information',
        'No author information found in structured data. Author attribution helps AI systems assess content authority and E-E-A-T signals.',
        'authority',
        'low',
        'medium',
        CITATIONS.entitySignals,
        pages.filter((p) => p.wordCount >= 300).map((p) => p.url),
        [
          'Add author information to Article/BlogPosting schema on content pages',
          'Include author name and optionally url, image, and sameAs links',
          'Use consistent author names across all pages',
          'Consider adding an about page with detailed author/team bios',
        ],
        'No author info in structured data',
      ),
    );
  }

  // About page suggestions
  const aboutPages = pages.filter((p) => p.pageType === 'about');
  if (aboutPages.length > 0) {
    const withoutAboutSchema = aboutPages.filter(
      (p) => !p.schema.types.some((t) => t === 'AboutPage' || t === 'Organization'),
    );
    if (withoutAboutSchema.length > 0) {
      recs.push(
        rec(
          'authority-about-no-schema',
          'Add schema to about page',
          'Your about page lacks AboutPage or Organization schema. This is a key page for establishing entity identity with AI systems.',
          'authority',
          'non-invasive',
          'medium',
          CITATIONS.entitySignals,
          withoutAboutSchema.map((p) => p.url),
          [
            'Add AboutPage schema to your about page',
            'Include Organization as the mainEntity',
            'Add team member information as Person schema if applicable',
          ],
          'About page missing schema',
          generateAboutPageJsonLd(withoutAboutSchema[0], audit),
        ),
      );
    }
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
