import { CRAWL_DEFAULTS } from '../config.js';

export interface FetchResult {
  url: string;
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  ok: boolean;
}

/**
 * Fetch a URL with retries and timeout.
 * Returns a normalised result — never throws for HTTP errors.
 */
export async function fetchUrl(
  url: string,
  options: {
    timeoutMs?: number;
    maxRetries?: number;
    userAgent?: string;
  } = {},
): Promise<FetchResult> {
  const {
    timeoutMs = CRAWL_DEFAULTS.timeoutMs,
    maxRetries = CRAWL_DEFAULTS.maxRetries,
    userAgent = CRAWL_DEFAULTS.userAgent,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': userAgent,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
      });

      clearTimeout(timer);

      const body = await response.text();
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      return {
        url: response.url,
        statusCode: response.status,
        headers,
        body,
        ok: response.ok,
      };
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        await sleep(1000 * (attempt + 1));
      }
    }
  }

  return {
    url,
    statusCode: 0,
    headers: {},
    body: '',
    ok: false,
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
