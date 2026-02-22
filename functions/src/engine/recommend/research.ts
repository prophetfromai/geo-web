/**
 * Research-backed citations referenced by recommendation rules.
 *
 * Sources:
 * - Princeton/Georgia Tech GEO study (Aggarwal et al., 2023): 9 optimisation strategies for AI search
 * - OpenAI GPTBot documentation: robots.txt guidance for AI crawlers
 * - Anthropic ClaudeBot documentation: crawling and indexing policies
 * - Google Structured Data guidelines: schema.org implementation best practices
 * - llmstxt.org specification: the llms.txt protocol for AI-readable site descriptions
 * - W3C Web Content Accessibility Guidelines (WCAG): image alt text requirements
 * - Zyppy/Cyrus Shepard research: answer-first content and AI citation patterns
 */
export const CITATIONS = {
  schemaVisibility:
    'Princeton/Georgia Tech GEO research shows structured data increases AI search visibility by 30-40%. Google\'s Structured Data guidelines confirm JSON-LD is the recommended format for machine-readable markup.',
  llmsAdoption:
    'The llms.txt protocol (llmstxt.org) provides a standardised way to describe your site to LLMs. Early adopters (784+ sites) report improved AI understanding of site purpose and content hierarchy.',
  robotsCrawlers:
    'OpenAI (GPTBot), Anthropic (ClaudeBot), and Perplexity (PerplexityBot) all document robots.txt as the primary mechanism for controlling AI crawler access. Unmentioned bots typically default to crawling.',
  wikiDominance:
    'Analysis of ChatGPT citations shows Wikipedia accounts for 47.9% of top citations. Structured, authoritative, entity-rich content with clear sourcing is what AI systems preferentially cite.',
  faqSchema:
    'Google\'s Structured Data documentation confirms FAQPage schema enables direct extraction of Q&A pairs. AI systems use these as high-confidence answer sources because the question-answer relationship is explicit.',
  breadcrumbSchema:
    'Google recommends BreadcrumbList schema to communicate site hierarchy. AI retrieval systems use this to understand content relationships and navigate topical clusters.',
  articleSchema:
    'Article/BlogPosting schema with datePublished and dateModified helps AI systems assess content freshness — a key ranking factor in AI search given documented recency bias in LLM retrieval.',
  orgSchema:
    'Organization schema with sameAs links establishes entity identity in knowledge graphs. Google\'s Knowledge Panel documentation shows this is how search systems connect brands across platforms.',
  metaDescriptions:
    'Meta descriptions serve as content summaries in retrieval-augmented generation (RAG) pipelines. AI systems use these for initial relevance scoring before full content analysis.',
  ogTags:
    'Open Graph protocol (ogp.me) provides standardised metadata that AI systems parse alongside schema.org data. Complete OG tags improve content understanding across platforms including AI aggregators.',
  canonical:
    'Canonical URLs prevent duplicate content confusion in AI training and retrieval pipelines. Google and AI crawlers use canonical signals to identify the authoritative version of a page.',
  thinContent:
    'Princeton GEO research shows content depth correlates with AI citation likelihood. Pages under 100 words lack sufficient context for AI systems to extract meaningful, citable information.',
  headingStructure:
    'Proper H1-H6 hierarchy helps AI systems parse content structure. The Princeton GEO study found that clear heading structure is one of the 9 key optimisation strategies for AI visibility.',
  https:
    'HTTPS is a baseline trust signal — Google confirms it as a ranking factor, and AI systems similarly deprioritise insecure sources in their retrieval pipelines.',
  sitemap:
    'XML sitemaps are the primary discovery mechanism for both traditional and AI crawlers. OpenAI\'s GPTBot documentation recommends referencing sitemaps in robots.txt.',
  recencyBias:
    'AI platforms exhibit strong recency bias — Zyppy research shows content freshness directly impacts citation probability. Regular updates (at least quarterly) maintain visibility.',
  shadowSite:
    'For severely under-optimised sites, a staging mirror approach allows safe iterative improvement. Apply quick wins on staging, verify with a GEO audit, then deploy to production.',
  princetonTactics:
    'Princeton/Georgia Tech research (Aggarwal et al.) identified 9 GEO tactics: authoritative language, statistics, citations, quotations, technical terminology, fluency, unique insights, answer-first structure, and structured data.',
  imageAlt:
    'WCAG 2.1 requires meaningful alt text for images. AI systems use alt attributes to understand visual content — generic or missing alt text means images are invisible to AI retrieval.',
  answerFirst:
    'Zyppy/Cyrus Shepard research and the Princeton GEO study both show that pages leading with direct, substantive answers to the topic question are more likely to be cited by AI systems.',
  twitterCards:
    'Twitter/X Card markup (twitter:card, twitter:title, etc.) provides platform-specific metadata that AI aggregators and social crawlers use alongside Open Graph tags for content understanding.',
  rssFeed:
    'RSS feeds provide a machine-readable content index that AI crawlers can monitor for updates. Sites with RSS are more easily discoverable and trackable for freshness signals.',
  entitySignals:
    'Google\'s Knowledge Graph relies on sameAs links and consistent entity information across pages. AI systems use these signals to build confidence in brand identity and authority.',
  headingHierarchy:
    'Proper heading hierarchy (no skipped levels: H1→H2→H3, not H1→H3) helps AI systems correctly parse content structure and topic relationships within a page.',
} as const;
