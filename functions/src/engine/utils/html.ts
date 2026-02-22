import * as cheerio from 'cheerio';
import type { MetaResult, SchemaResult } from '../types.js';

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
  const canonical = $('link[rel="canonical"]').attr('href')?.trim() || null;

  return {
    title,
    titleLength: title?.length ?? 0,
    description,
    descriptionLength: description?.length ?? 0,
    ogTitle,
    ogDescription,
    ogImage,
    canonical,
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
