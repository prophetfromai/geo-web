import { fetchUrl } from '../utils/http.js';
import type { SitemapEntry } from '../types.js';

/**
 * Try to discover and parse sitemaps for a domain.
 * Checks: /sitemap.xml, /sitemap_index.xml, and any sitemaps listed in robots.txt.
 */
export async function discoverSitemapUrls(
  baseUrl: string,
  robotsSitemapUrls: string[] = [],
): Promise<{ found: boolean; entries: SitemapEntry[] }> {
  const candidates = new Set<string>([
    new URL('/sitemap.xml', baseUrl).href,
    new URL('/sitemap_index.xml', baseUrl).href,
    ...robotsSitemapUrls,
  ]);

  const allEntries: SitemapEntry[] = [];
  let found = false;

  for (const sitemapUrl of candidates) {
    const entries = await fetchSitemap(sitemapUrl);
    if (entries.length > 0) {
      found = true;
      allEntries.push(...entries);
    }
  }

  const seen = new Set<string>();
  const unique = allEntries.filter((e) => {
    if (seen.has(e.url)) return false;
    seen.add(e.url);
    return true;
  });

  return { found, entries: unique };
}

async function fetchSitemap(url: string): Promise<SitemapEntry[]> {
  const result = await fetchUrl(url);
  if (!result.ok) return [];

  const body = result.body;

  if (body.includes('<sitemap>') || body.includes('<sitemapindex')) {
    return parseSitemapIndex(body);
  }

  return parseSitemapXml(body);
}

function parseSitemapXml(xml: string): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  const urlPattern = /<url>\s*([\s\S]*?)\s*<\/url>/gi;
  let match: RegExpExecArray | null;

  while ((match = urlPattern.exec(xml)) !== null) {
    const block = match[1];
    const loc = extractTag(block, 'loc');
    if (!loc) continue;

    entries.push({
      url: loc.trim(),
      lastmod: extractTag(block, 'lastmod') ?? undefined,
      priority: extractTag(block, 'priority')
        ? parseFloat(extractTag(block, 'priority')!)
        : undefined,
    });
  }

  return entries;
}

async function parseSitemapIndex(xml: string): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = [];
  const sitemapPattern = /<sitemap>\s*([\s\S]*?)\s*<\/sitemap>/gi;
  let match: RegExpExecArray | null;

  const childUrls: string[] = [];
  while ((match = sitemapPattern.exec(xml)) !== null) {
    const loc = extractTag(match[1], 'loc');
    if (loc) childUrls.push(loc.trim());
  }

  for (const childUrl of childUrls.slice(0, 10)) {
    const result = await fetchUrl(childUrl);
    if (result.ok) {
      entries.push(...parseSitemapXml(result.body));
    }
  }

  return entries;
}

function extractTag(block: string, tag: string): string | null {
  const pattern = new RegExp(`<${tag}[^>]*>\\s*([\\s\\S]*?)\\s*</${tag}>`, 'i');
  const match = pattern.exec(block);
  return match ? match[1] : null;
}
