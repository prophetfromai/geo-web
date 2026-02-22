import { CRAWL_DEFAULTS } from '../config.js';
import type { PageData, SitemapEntry } from '../types.js';
import { fetchUrl, sleep } from '../utils/http.js';
import { loadHtml } from '../utils/html.js';

export interface CrawlOptions {
  maxPages?: number;
  concurrency?: number;
  delayMs?: number;
}

/**
 * Crawl pages for a site. Discovers pages via sitemap entries and
 * also follows internal links found on crawled pages.
 */
export async function crawlSite(
  baseUrl: string,
  sitemapEntries: SitemapEntry[],
  options: CrawlOptions = {},
  onPageCrawled?: (crawled: number, maxPages: number) => void,
): Promise<PageData[]> {
  const {
    maxPages = CRAWL_DEFAULTS.maxPages,
    delayMs = CRAWL_DEFAULTS.delayMs,
  } = options;

  const origin = new URL(baseUrl).origin;
  const queued = new Set<string>();
  const queue: string[] = [];
  const results: PageData[] = [];

  const homepage = normaliseUrl(baseUrl);
  queue.push(homepage);
  queued.add(homepage);

  for (const entry of sitemapEntries) {
    const normalised = normaliseUrl(entry.url);
    if (!queued.has(normalised)) {
      queue.push(normalised);
      queued.add(normalised);
    }
  }

  let crawled = 0;

  while (queue.length > 0 && crawled < maxPages) {
    const url = queue.shift()!;

    const result = await fetchUrl(url);
    crawled++;

    if (onPageCrawled) {
      onPageCrawled(crawled, maxPages);
    }

    if (result.ok) {
      const page: PageData = {
        url: result.url,
        statusCode: result.statusCode,
        html: result.body,
        headers: result.headers,
        fetchedAt: new Date(),
      };
      results.push(page);

      const newLinks = discoverInternalLinks(result.body, origin);
      for (const link of newLinks) {
        const normalised = normaliseUrl(link);
        if (!queued.has(normalised) && queue.length + crawled < maxPages) {
          queued.add(normalised);
          queue.push(normalised);
        }
      }
    }

    if (queue.length > 0) {
      await sleep(delayMs);
    }
  }

  return results;
}

function discoverInternalLinks(html: string, origin: string): string[] {
  const $ = loadHtml(html);
  const links: string[] = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    try {
      const resolved = new URL(href, origin).href;
      if (resolved.startsWith(origin) && isHtmlPage(resolved)) {
        links.push(resolved);
      }
    } catch {
      // Invalid URL — skip
    }
  });

  return links;
}

function isHtmlPage(url: string): boolean {
  const path = new URL(url).pathname.toLowerCase();
  const nonHtmlExts = [
    '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp',
    '.css', '.js', '.xml', '.json', '.zip', '.ico', '.woff',
    '.woff2', '.ttf', '.eot', '.mp4', '.mp3',
  ];
  return !nonHtmlExts.some((ext) => path.endsWith(ext));
}

function normaliseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    if (parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1) || '/';
    }
    let href = parsed.href;
    if (href.endsWith('/') && parsed.pathname === '/') {
      href = href.slice(0, -1);
    }
    return href;
  } catch {
    return url;
  }
}
