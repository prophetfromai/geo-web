import * as cheerio from 'cheerio';
import type { ImageAudit, IdentitySignals, MetaResult, SchemaResult } from '../types.js';

type CheerioAPI = ReturnType<typeof cheerio.load>;

export function loadHtml(html: string): CheerioAPI {
  return cheerio.load(html);
}

/** Extract meta tags relevant to GEO */
export function extractMeta($: CheerioAPI): MetaResult {
  const title = $('title').first().text().trim() || null;
  const description =
    $('meta[name="description"]').attr('content')?.trim() || null;
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() || null;
  const ogDescription =
    $('meta[property="og:description"]').attr('content')?.trim() || null;
  const ogImage = $('meta[property="og:image"]').attr('content')?.trim() || null;
  const ogUrl = $('meta[property="og:url"]').attr('content')?.trim() || null;
  const canonical = $('link[rel="canonical"]').attr('href')?.trim() || null;
  const twitterCard = $('meta[name="twitter:card"]').attr('content')?.trim() || null;
  const twitterTitle = $('meta[name="twitter:title"]').attr('content')?.trim() || null;
  const twitterDescription = $('meta[name="twitter:description"]').attr('content')?.trim() || null;
  const twitterImage = $('meta[name="twitter:image"]').attr('content')?.trim() || null;

  return {
    title,
    titleLength: title?.length ?? 0,
    description,
    descriptionLength: description?.length ?? 0,
    ogTitle,
    ogDescription,
    ogImage,
    ogUrl,
    canonical,
    twitterCard,
    twitterTitle,
    twitterDescription,
    twitterImage,
  };
}

/** Extract JSON-LD structured data */
export function extractSchema($: CheerioAPI): SchemaResult {
  const jsonLd: Record<string, unknown>[] = [];
  const types = new Set<string>();

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html();
      if (!raw) return;
      const parsed = JSON.parse(raw);

      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item && typeof item === 'object') {
          jsonLd.push(item as Record<string, unknown>);
          collectTypes(item, types);
        }
      }
    } catch {
      // Invalid JSON-LD — skip
    }
  });

  const typeArr = [...types];
  return {
    types: typeArr,
    jsonLd,
    hasProduct: typeArr.some((t) => t === 'Product'),
    hasFaq: typeArr.some((t) => t === 'FAQPage'),
    hasOrganization: typeArr.some((t) => t === 'Organization'),
    hasWebSite: typeArr.some((t) => t === 'WebSite'),
    hasBreadcrumb: typeArr.some((t) => t === 'BreadcrumbList'),
    hasArticle: typeArr.some((t) => t === 'Article' || t === 'BlogPosting' || t === 'NewsArticle'),
    hasHowTo: typeArr.some((t) => t === 'HowTo'),
  };
}

function collectTypes(obj: unknown, types: Set<string>): void {
  if (!obj || typeof obj !== 'object') return;
  const record = obj as Record<string, unknown>;

  if (typeof record['@type'] === 'string') {
    types.add(record['@type']);
  } else if (Array.isArray(record['@type'])) {
    for (const t of record['@type']) {
      if (typeof t === 'string') types.add(t);
    }
  }

  if (Array.isArray(record['@graph'])) {
    for (const item of record['@graph']) {
      collectTypes(item, types);
    }
  }
}

/** Extract heading structure */
export function extractHeadings(
  $: CheerioAPI,
): { tag: string; text: string }[] {
  const headings: { tag: string; text: string }[] = [];
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const tag = (el as unknown as { tagName: string }).tagName.toLowerCase();
    const text = $(el).text().trim();
    if (text) {
      headings.push({ tag, text });
    }
  });
  return headings;
}

/** Count words in visible text content (strips scripts, styles, nav) */
export function countWords($: CheerioAPI): number {
  const clone = cheerio.load($.html());
  clone('script, style, nav, footer, header, noscript').remove();
  const text = clone('body').text();
  const words = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w.length > 0);
  return words.length;
}

const WEAK_ALT_PATTERNS = [
  /^img[_\-\s]?\d*/i,
  /^image[_\-\s]?\d*/i,
  /^photo[_\-\s]?\d*/i,
  /^screenshot[_\-\s]?\d*/i,
  /^untitled/i,
  /^dsc[_\-]?\d+/i,
  /\.(png|jpe?g|gif|webp|svg|bmp)$/i,
];

/** Extract image accessibility data */
export function extractImages($: CheerioAPI): ImageAudit {
  let total = 0;
  let withAlt = 0;
  let withWeakAlt = 0;
  let missingAlt = 0;

  $('img').each((_, el) => {
    total++;
    const alt = $(el).attr('alt');
    if (alt == null || alt.trim() === '') {
      missingAlt++;
    } else {
      const trimmed = alt.trim();
      if (trimmed.length < 5 || WEAK_ALT_PATTERNS.some((p) => p.test(trimmed))) {
        withWeakAlt++;
      } else {
        withAlt++;
      }
    }
  });

  return { total, withAlt, withWeakAlt, missingAlt };
}

/** Extract identity signals from JSON-LD structured data */
export function extractIdentity(jsonLd: Record<string, unknown>[]): IdentitySignals {
  const sameAsLinks: string[] = [];
  let hasAuthorInfo = false;
  let authorName: string | null = null;

  for (const item of jsonLd) {
    // Collect sameAs from any schema type
    const sameAs = item['sameAs'];
    if (Array.isArray(sameAs)) {
      for (const link of sameAs) {
        if (typeof link === 'string') sameAsLinks.push(link);
      }
    } else if (typeof sameAs === 'string') {
      sameAsLinks.push(sameAs);
    }

    // Check @graph for nested items
    if (Array.isArray(item['@graph'])) {
      for (const graphItem of item['@graph'] as Record<string, unknown>[]) {
        const gs = graphItem['sameAs'];
        if (Array.isArray(gs)) {
          for (const link of gs) {
            if (typeof link === 'string') sameAsLinks.push(link);
          }
        } else if (typeof gs === 'string') {
          sameAsLinks.push(gs);
        }

        extractAuthor(graphItem);
      }
    }

    extractAuthor(item);
  }

  function extractAuthor(obj: Record<string, unknown>) {
    const author = obj['author'];
    if (author && typeof author === 'object') {
      const a = author as Record<string, unknown>;
      if (typeof a['name'] === 'string') {
        hasAuthorInfo = true;
        authorName = a['name'] as string;
      }
    }
    if (typeof obj['author'] === 'string') {
      hasAuthorInfo = true;
      authorName = obj['author'] as string;
    }
  }

  return { sameAsLinks: [...new Set(sameAsLinks)], hasAuthorInfo, authorName };
}

/**
 * Detect whether a page leads with substantive content ("answer-first").
 * Checks that the first ~200 words of main content contain H1 keywords
 * and form a meaningful opening paragraph (25+ words before boilerplate).
 */
export function detectAnswerFirst(
  $: CheerioAPI,
  headings: { tag: string; text: string }[],
): { answerFirst: boolean; firstParagraphWords: number } {
  const clone = cheerio.load($.html());
  clone('script, style, nav, footer, header, noscript, aside').remove();

  const bodyText = clone('body').text().replace(/\s+/g, ' ').trim();
  const firstChunk = bodyText.split(' ').slice(0, 200).join(' ');

  // Get first paragraph text
  const firstP = clone('p').first().text().replace(/\s+/g, ' ').trim();
  const firstParagraphWords = firstP.split(' ').filter((w) => w.length > 0).length;

  const h1 = headings.find((h) => h.tag === 'h1');
  if (!h1 || firstParagraphWords < 20) {
    return { answerFirst: false, firstParagraphWords };
  }

  // Check if H1 keywords appear in the first 200 words
  const h1Words = h1.text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const chunkLower = firstChunk.toLowerCase();
  const keywordHits = h1Words.filter((w) => chunkLower.includes(w)).length;
  const keywordRatio = h1Words.length > 0 ? keywordHits / h1Words.length : 0;

  const answerFirst = firstParagraphWords >= 25 && keywordRatio >= 0.3;
  return { answerFirst, firstParagraphWords };
}
