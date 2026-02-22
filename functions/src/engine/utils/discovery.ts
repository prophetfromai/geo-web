import type { DiscoveryResult } from '../types.js';
import { fetchUrl } from './http.js';

const PROBE_TIMEOUT = 3_000;
const PROBE_RETRIES = 0;

/**
 * Probe for RSS feeds and OpenAPI specs.
 * Checks HTML <link> tags first, then well-known paths.
 * All probes run in parallel — worst case adds ~3s to audit.
 */
export async function checkDiscovery(
  origin: string,
  homepageHtml: string | null,
): Promise<DiscoveryResult> {
  // Check homepage HTML for RSS <link> tag
  let rssFromHtml: string | null = null;
  if (homepageHtml) {
    const match = homepageHtml.match(
      /<link[^>]+type=["']application\/rss\+xml["'][^>]*href=["']([^"']+)["']/i,
    );
    if (match) {
      rssFromHtml = match[1];
    }
  }

  const opts = { timeoutMs: PROBE_TIMEOUT, maxRetries: PROBE_RETRIES };

  const [rss1, rss2, api1, api2] = await Promise.all([
    rssFromHtml ? probeUrl(rssFromHtml.startsWith('http') ? rssFromHtml : `${origin}${rssFromHtml}`, opts) : Promise.resolve(false),
    // Probe well-known RSS paths
    probeUrl(`${origin}/feed.xml`, opts),
    // Probe well-known OpenAPI paths
    probeUrl(`${origin}/openapi.json`, opts),
    probeUrl(`${origin}/swagger.json`, opts),
  ]);

  // Also probe /rss.xml if neither HTML link nor feed.xml worked
  let rss3 = false;
  if (!rssFromHtml && !rss1 && !rss2) {
    rss3 = await probeUrl(`${origin}/rss.xml`, opts);
  }

  const rssFound = !!rssFromHtml || rss1 || rss2 || rss3;
  let rssUrl: string | null = null;
  if (rssFromHtml) rssUrl = rssFromHtml.startsWith('http') ? rssFromHtml : `${origin}${rssFromHtml}`;
  else if (rss2) rssUrl = `${origin}/feed.xml`;
  else if (rss3) rssUrl = `${origin}/rss.xml`;

  const openApiFound = api1 || api2;
  let openApiUrl: string | null = null;
  if (api1) openApiUrl = `${origin}/openapi.json`;
  else if (api2) openApiUrl = `${origin}/swagger.json`;

  return { rssFound, rssUrl, openApiFound, openApiUrl };
}

async function probeUrl(
  url: string,
  opts: { timeoutMs: number; maxRetries: number },
): Promise<boolean> {
  const result = await fetchUrl(url, opts);
  return result.ok && result.body.length > 0;
}
