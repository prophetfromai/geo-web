/** Research-backed citations referenced by recommendation rules */
export const CITATIONS = {
  schemaVisibility:
    'Schema markup shows 30-40% higher visibility in AI-generated answers (multiple GEO studies)',
  llmsAdoption:
    'llms.txt is an emerging protocol with 784+ sites adopting it to guide AI crawlers',
  robotsCrawlers:
    'AI crawlers (GPTBot, ClaudeBot, PerplexityBot) must be explicitly allowed in robots.txt to index content',
  wikiDominance:
    'Wikipedia dominates ChatGPT citations at 47.9% of top citations — structured, authoritative content wins',
  faqSchema:
    'FAQ schema provides direct Q&A pairs that AI systems can extract and cite verbatim',
  breadcrumbSchema:
    'BreadcrumbList schema helps AI understand site hierarchy and content relationships',
  articleSchema:
    'Article schema with datePublished helps AI assess content freshness and authority',
  orgSchema:
    'Organization schema establishes entity identity — critical for brand mentions in AI answers',
  metaDescriptions:
    'Meta descriptions serve as content summaries that AI systems use for initial relevance assessment',
  ogTags:
    'Open Graph tags help AI systems understand content context when shared across platforms',
  canonical:
    'Canonical URLs prevent duplicate content confusion in AI training and retrieval pipelines',
  thinContent:
    'Pages with fewer than 100 words lack sufficient content for AI systems to extract meaningful information',
  headingStructure:
    'Clear H1 heading structure helps AI parse content hierarchy and identify main topics',
  https:
    'HTTPS is a baseline trust signal — AI systems deprioritise insecure sources',
  sitemap:
    'Sitemaps help AI crawlers discover and prioritise content efficiently',
  recencyBias:
    'AI platforms exhibit strong recency bias — content must be updated at least every 3 months',
  shadowSite:
    'For severely under-optimised sites, a staging mirror approach allows safe iterative improvement before going live',
  princetonTactics:
    'Princeton/Georgia Tech research identified 9 GEO tactics achieving up to 40% visibility improvements',
} as const;
