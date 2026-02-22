import { AI_CRAWLERS } from '../config.js';
import type {
  LlmsTxtResult,
  PageData,
  PageTechnicalAudit,
  RobotsResult,
  TechnicalAuditResult,
} from '../types.js';
import { fetchUrl } from '../utils/http.js';
import {
  countWords,
  extractHeadings,
  extractMeta,
  extractSchema,
  loadHtml,
} from '../utils/html.js';

/** Check robots.txt for AI crawler rules — exported so runner can call early */
export { checkRobotsTxt };

/** Run all technical checks for a site */
export async function runTechnicalAudit(
  baseUrl: string,
  pages: PageData[],
  preloadedRobots?: RobotsResult,
): Promise<TechnicalAuditResult> {
  const origin = new URL(baseUrl).origin;

  const [robots, llmsTxt] = await Promise.all([
    preloadedRobots ?? checkRobotsTxt(origin),
    checkLlmsTxt(origin),
  ]);

  const pageAudits = pages.map((page) => auditPage(page));

  const httpsEnforced = new URL(baseUrl).protocol === 'https:';

  return {
    robots,
    llmsTxt,
    sitemapFound: robots.sitemapUrls.length > 0,
    sitemapUrls: robots.sitemapUrls,
    pages: pageAudits,
    httpsEnforced,
  };
}

async function checkRobotsTxt(origin: string): Promise<RobotsResult> {
  const result = await fetchUrl(`${origin}/robots.txt`);

  if (!result.ok) {
    return {
      raw: '',
      hasAiCrawlerRules: false,
      allowedBots: [],
      blockedBots: [],
      unmentionedBots: [...AI_CRAWLERS],
      sitemapUrls: [],
    };
  }

  const raw = result.body;
  const lines = raw.split('\n').map((l) => l.trim());

  const allowedBots: string[] = [];
  const blockedBots: string[] = [];
  const sitemapUrls: string[] = [];

  for (const line of lines) {
    const sitemapMatch = line.match(/^sitemap:\s*(.+)$/i);
    if (sitemapMatch) {
      sitemapUrls.push(sitemapMatch[1].trim());
    }
  }

  for (const bot of AI_CRAWLERS) {
    const botLower = bot.toLowerCase();
    let isBlocked = false;
    let isMentioned = false;
    let inBotSection = false;

    for (const line of lines) {
      const uaMatch = line.match(/^user-agent:\s*(.+)$/i);
      if (uaMatch) {
        const ua = uaMatch[1].trim();
        inBotSection = ua.toLowerCase() === botLower;
        continue;
      }

      if (inBotSection) {
        isMentioned = true;
        if (line.match(/^disallow:\s*\/\s*$/i)) {
          isBlocked = true;
        }
      }
    }

    if (isMentioned) {
      if (isBlocked) {
        blockedBots.push(bot);
      } else {
        allowedBots.push(bot);
      }
    }
  }

  const mentioned = new Set([...allowedBots, ...blockedBots]);
  const unmentionedBots = AI_CRAWLERS.filter((b) => !mentioned.has(b));

  return {
    raw,
    hasAiCrawlerRules: allowedBots.length > 0 || blockedBots.length > 0,
    allowedBots,
    blockedBots,
    unmentionedBots: [...unmentionedBots],
    sitemapUrls,
  };
}

async function checkLlmsTxt(origin: string): Promise<LlmsTxtResult> {
  const result = await fetchUrl(`${origin}/llms.txt`);

  if (!result.ok) {
    return { exists: false };
  }

  const raw = result.body;
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);

  const hasTitle = lines.some((l) => l.startsWith('#'));
  const hasDescription = lines.some((l) => l.startsWith('>'));

  const linkPattern = /\[.*?\]\((.*?)\)/g;
  const linkedPages: string[] = [];
  let match: RegExpExecArray | null;
  for (const line of lines) {
    while ((match = linkPattern.exec(line)) !== null) {
      linkedPages.push(match[1]);
    }
  }

  return {
    exists: true,
    raw,
    lineCount: lines.length,
    hasTitle,
    hasDescription,
    linkedPages,
  };
}

function auditPage(page: PageData): PageTechnicalAudit {
  const $ = loadHtml(page.html);

  return {
    url: page.url,
    meta: extractMeta($),
    schema: extractSchema($),
    headingStructure: extractHeadings($),
    wordCount: countWords($),
    hasHttps: page.url.startsWith('https://'),
  };
}
