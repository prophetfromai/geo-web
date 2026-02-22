import type { AuditResult, PageTechnicalAudit } from '../types.js';

/** Generate Organization JSON-LD from crawled data */
export function generateOrganizationJsonLd(audit: AuditResult): string {
  const homepage = audit.technical.pages.find((p) => {
    try { return new URL(p.url).pathname === '/'; } catch { return false; }
  });

  const brandName = extractBrandName(homepage, audit.url);
  const logo = homepage?.meta.ogImage ?? null;
  const description = homepage?.meta.description ?? '';

  const allSameAs = new Set<string>();
  for (const page of audit.technical.pages) {
    for (const link of page.identity.sameAsLinks) allSameAs.add(link);
  }

  const org: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': brandName,
    'url': audit.url,
  };

  if (description) org['description'] = description;
  if (logo) org['logo'] = logo;
  if (allSameAs.size > 0) org['sameAs'] = [...allSameAs];

  return wrapJsonLd(org);
}

/** Generate WebSite + SearchAction JSON-LD */
export function generateWebSiteJsonLd(audit: AuditResult): string {
  const homepage = audit.technical.pages.find((p) => {
    try { return new URL(p.url).pathname === '/'; } catch { return false; }
  });

  const brandName = extractBrandName(homepage, audit.url);

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': brandName,
    'url': audit.url,
    'potentialAction': {
      '@type': 'SearchAction',
      'target': `${audit.url}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return wrapJsonLd(schema);
}

/** Generate BlogPosting JSON-LD for an article page */
export function generateArticleJsonLd(page: PageTechnicalAudit): string {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    'headline': page.meta.title ?? 'Page Title',
    'description': page.meta.description ?? '',
    'url': page.url,
    'datePublished': 'YYYY-MM-DD',
    'dateModified': 'YYYY-MM-DD',
    'author': {
      '@type': 'Person',
      'name': page.identity.authorName ?? 'Author Name',
    },
  };

  if (page.meta.ogImage) {
    schema['image'] = page.meta.ogImage;
  }

  return wrapJsonLd(schema);
}

/** Generate FAQPage JSON-LD from headings ending with ? */
export function generateFAQPageJsonLd(page: PageTechnicalAudit): string {
  const questions = page.headingStructure
    .filter((h) => h.text.endsWith('?'))
    .slice(0, 10)
    .map((h) => ({
      '@type': 'Question',
      'name': h.text,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': `[Answer to: ${h.text}]`,
      },
    }));

  if (questions.length === 0) {
    questions.push({
      '@type': 'Question',
      'name': 'What is [topic]?',
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': '[Your answer here]',
      },
    });
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': questions,
  };

  return wrapJsonLd(schema);
}

/** Generate Product/SoftwareApplication JSON-LD */
export function generateProductJsonLd(page: PageTechnicalAudit): string {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    'name': page.meta.title ?? 'Product Name',
    'description': page.meta.description ?? '',
    'url': page.url,
    'applicationCategory': 'WebApplication',
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'GBP',
    },
  };

  if (page.meta.ogImage) {
    schema['image'] = page.meta.ogImage;
  }

  return wrapJsonLd(schema);
}

/** Generate AboutPage + Person JSON-LD */
export function generateAboutPageJsonLd(
  page: PageTechnicalAudit,
  audit: AuditResult,
): string {
  const brandName = extractBrandName(
    audit.technical.pages.find((p) => {
      try { return new URL(p.url).pathname === '/'; } catch { return false; }
    }),
    audit.url,
  );

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    'name': `About ${brandName}`,
    'url': page.url,
    'mainEntity': {
      '@type': 'Organization',
      'name': brandName,
      'url': audit.url,
    },
  };

  return wrapJsonLd(schema);
}

/** Generate a complete llms.txt file from crawled data */
export function generateLlmsTxt(audit: AuditResult): string {
  const homepage = audit.technical.pages.find((p) => {
    try { return new URL(p.url).pathname === '/'; } catch { return false; }
  });

  const brandName = extractBrandName(homepage, audit.url);
  const description = homepage?.meta.description ?? 'A description of what this site offers.';

  // Pick top 10 pages by word count (excluding homepage)
  const topPages = audit.technical.pages
    .filter((p) => {
      try { return new URL(p.url).pathname !== '/'; } catch { return true; }
    })
    .sort((a, b) => b.wordCount - a.wordCount)
    .slice(0, 10);

  let txt = `# ${brandName}\n\n`;
  txt += `> ${description}\n\n`;

  if (topPages.length > 0) {
    txt += `## Key Pages\n\n`;
    for (const page of topPages) {
      const title = page.meta.title ?? new URL(page.url).pathname;
      const desc = page.meta.description ?? '';
      txt += `- [${title}](${page.url})${desc ? `: ${desc}` : ''}\n`;
    }
  }

  return txt;
}

/** Generate robots.txt suggestion with AI crawler rules */
export function generateRobotsTxtSuggestion(audit: AuditResult): string {
  const sitemapUrl = audit.technical.sitemapUrls[0] ?? `${audit.url}/sitemap.xml`;

  const aiCrawlers = [
    'GPTBot',
    'ClaudeBot',
    'PerplexityBot',
    'Google-Extended',
    'ChatGPT-User',
    'Applebot-Extended',
  ];

  let txt = `# Standard crawlers\nUser-agent: *\nAllow: /\n\n`;

  txt += `# AI crawlers — explicitly allow\n`;
  for (const bot of aiCrawlers) {
    txt += `User-agent: ${bot}\nAllow: /\n\n`;
  }

  txt += `# Optional: block training-only crawlers\n`;
  txt += `User-agent: CCBot\nDisallow: /\n\n`;

  txt += `Sitemap: ${sitemapUrl}\n`;

  return txt;
}

// ── Helpers ──

function extractBrandName(
  homepage: PageTechnicalAudit | undefined,
  siteUrl: string,
): string {
  if (homepage?.meta.ogTitle) return homepage.meta.ogTitle;
  if (homepage?.meta.title) {
    // Strip common suffixes like " - Home", " | Official Site"
    return homepage.meta.title.replace(/\s*[|\-–—]\s*(home|official site|welcome).*$/i, '').trim();
  }
  try {
    return new URL(siteUrl).hostname.replace(/^www\./, '');
  } catch {
    return siteUrl;
  }
}

function wrapJsonLd(obj: Record<string, unknown>): string {
  const json = JSON.stringify(obj, null, 2);
  return `<script type="application/ld+json">\n${json}\n</script>`;
}
