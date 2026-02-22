import type { PageType, SchemaResult } from '../types.js';

/**
 * Classify a page type using priority-ordered rules.
 * Pure function — no side effects, no HTTP requests.
 */
export function classifyPage(
  url: string,
  schema: SchemaResult,
  wordCount: number,
  headings: { tag: string; text: string }[],
): PageType {
  const { pathname } = new URL(url);
  const pathLower = pathname.toLowerCase();
  const h1 = headings.find((h) => h.tag === 'h1');
  const h1Text = h1?.text.toLowerCase() ?? '';

  // 1. Home — pathname is /
  if (pathname === '/' || pathname === '') return 'home';

  // 2. Product — has Product schema or product/pricing URL
  if (schema.hasProduct || /\/(product|pricing)(\/|$)/i.test(pathLower)) return 'product';

  // 3. FAQ — has FAQPage schema or /faq URL or H1 contains "faq"
  if (schema.hasFaq || /\/faq(\/|$)/i.test(pathLower) || h1Text.includes('faq')) return 'faq';

  // 4. Article — has Article/BlogPosting schema or /blog/ URL + wordCount > 300
  if (schema.hasArticle) return 'article';
  if (/\/blog\//i.test(pathLower) && wordCount > 300) return 'article';

  // 5. Docs — documentation URLs
  if (/\/(docs|guide|tutorial|api)(\/|$)/i.test(pathLower)) return 'docs';

  // 6. About — about/team URLs
  if (/\/(about|team)(\/|$)/i.test(pathLower)) return 'about';

  // 7. Contact — contact/support URLs
  if (/\/(contact|support)(\/|$)/i.test(pathLower)) return 'contact';

  // 8. Landing — fewer than 300 words + shallow URL (≤2 path segments)
  const segments = pathname.split('/').filter((s) => s.length > 0);
  if (wordCount < 300 && segments.length <= 2) return 'landing';

  // 9. Fallback
  return 'unknown';
}
