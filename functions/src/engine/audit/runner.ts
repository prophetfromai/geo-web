import type { AuditResult, AuditProgress, PageData } from '../types.js';
import { crawlSite } from '../crawl/crawler.js';
import { discoverSitemapUrls } from '../crawl/sitemap.js';
import { checkRobotsTxt, runTechnicalAudit } from './technical.js';
import { scoreAudit } from './scoring.js';

export interface AuditOptions {
  maxPages?: number;
}

/**
 * Run a full GEO audit for a URL.
 * Orchestrates: sitemap discovery -> crawl -> technical audit -> scoring.
 * Calls onProgress at each phase for Firestore progress updates.
 */
export async function runAudit(
  url: string,
  options: AuditOptions = {},
  onProgress?: (progress: AuditProgress) => void,
): Promise<AuditResult> {
  const baseUrl = normaliseBaseUrl(url);

  onProgress?.({ phase: 'Checking robots.txt' });
  const origin = new URL(baseUrl).origin;
  const robots = await checkRobotsTxt(origin);

  onProgress?.({ phase: 'Discovering sitemap' });
  const { found: sitemapFound, entries: sitemapEntries } =
    await discoverSitemapUrls(baseUrl, robots.sitemapUrls);

  onProgress?.({ phase: 'Crawling pages', pagesCrawled: 0, maxPages: options.maxPages });
  const pages: PageData[] = await crawlSite(baseUrl, sitemapEntries, {
    maxPages: options.maxPages,
  }, (crawled, maxPages) => {
    onProgress?.({ phase: 'Crawling pages', pagesCrawled: crawled, maxPages });
  });

  onProgress?.({ phase: 'Running technical audit' });
  const technical = await runTechnicalAudit(baseUrl, pages, robots);

  onProgress?.({ phase: 'Calculating scores' });
  const score = scoreAudit(technical);

  return {
    url: baseUrl,
    auditedAt: new Date(),
    pagesDiscovered: sitemapEntries.length || pages.length,
    pagesCrawled: pages.length,
    technical,
    score,
  };
}

function normaliseBaseUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, '');
}
