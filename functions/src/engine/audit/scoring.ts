import { GRADE_BANDS, SCORING_WEIGHTS } from '../config.js';
import type {
  CategoryScore,
  CheckScore,
  OverallScore,
  TechnicalAuditResult,
} from '../types.js';

/** Score the full audit — technical + content + authority */
export function scoreAudit(
  audit: TechnicalAuditResult,
): OverallScore {
  const technicalChecks = scoreTechnicalCategory(audit);
  const contentChecks = scoreContentCategory(audit);
  const authorityChecks = scoreAuthorityCategory(audit);

  const categories = [technicalChecks, contentChecks, authorityChecks];

  const totalWeighted = categories.reduce((sum, c) => sum + c.score, 0);
  const totalMax = categories.reduce((sum, c) => sum + c.maxScore, 0);

  const score = totalMax > 0 ? Math.round((totalWeighted / totalMax) * 100) : 0;

  return {
    score,
    grade: scoreToGrade(score),
    categories,
  };
}

function scoreTechnicalCategory(
  audit: TechnicalAuditResult,
): CategoryScore {
  const weights = SCORING_WEIGHTS.technical;
  const checks: CheckScore[] = [];

  checks.push(
    scoreCheck('robots.txt AI rules', weights.robotsAiRules, () => {
      if (!audit.robots.raw) {
        return { score: 0, rationale: 'No robots.txt found' };
      }
      if (!audit.robots.hasAiCrawlerRules) {
        return {
          score: 3,
          rationale: `robots.txt exists but has no AI crawler rules. ${audit.robots.unmentionedBots.length} AI bots unmentioned`,
        };
      }
      if (audit.robots.blockedBots.length > 0) {
        return {
          score: 4,
          rationale: `Blocking AI crawlers: ${audit.robots.blockedBots.join(', ')}`,
        };
      }
      const mentioned = audit.robots.allowedBots.length;
      const ratio = mentioned / (mentioned + audit.robots.unmentionedBots.length);
      const score = Math.round(5 + ratio * 5);
      return {
        score: Math.min(score, 10),
        rationale: `${mentioned} AI crawlers explicitly allowed. ${audit.robots.unmentionedBots.length} unmentioned`,
      };
    }),
  );

  checks.push(
    scoreCheck('llms.txt', weights.llmsTxt, () => {
      if (!audit.llmsTxt.exists) {
        return { score: 0, rationale: 'No llms.txt found (404)' };
      }
      let score = 5;
      const parts: string[] = ['llms.txt exists'];
      if (audit.llmsTxt.hasTitle) {
        score += 1;
        parts.push('has title');
      }
      if (audit.llmsTxt.hasDescription) {
        score += 1;
        parts.push('has description');
      }
      if (audit.llmsTxt.linkedPages && audit.llmsTxt.linkedPages.length > 0) {
        score += Math.min(3, audit.llmsTxt.linkedPages.length);
        parts.push(`${audit.llmsTxt.linkedPages.length} linked pages`);
      }
      return { score: Math.min(score, 10), rationale: parts.join(', ') };
    }),
  );

  checks.push(
    scoreCheck('Schema coverage', weights.schemaCoverage, () => {
      const pages = audit.pages;
      if (pages.length === 0) {
        return { score: 0, rationale: 'No pages crawled' };
      }

      const pagesWithSchema = pages.filter(
        (p) => p.schema.types.length > 0,
      ).length;
      const coverage = pagesWithSchema / pages.length;

      const allTypes = new Set<string>();
      for (const page of pages) {
        for (const t of page.schema.types) {
          allTypes.add(t);
        }
      }

      const diversityBonus = Math.min(3, allTypes.size * 0.5);
      const score = Math.min(
        10,
        Math.round(coverage * 7 + diversityBonus),
      );

      return {
        score,
        rationale: `${pagesWithSchema}/${pages.length} pages have schema. Types: ${[...allTypes].join(', ') || 'none'}`,
      };
    }),
  );

  checks.push(
    scoreCheck('Sitemap', weights.sitemap, () => {
      if (!audit.sitemapFound) {
        return { score: 0, rationale: 'No sitemap found' };
      }
      const urlCount = audit.sitemapUrls.length;
      return {
        score: urlCount > 0 ? 8 : 5,
        rationale: `Sitemap found${urlCount > 0 ? ` with ${urlCount} URLs referenced in robots.txt` : ''}`,
      };
    }),
  );

  checks.push(
    scoreCheck('Meta descriptions', weights.metaDescriptions, () => {
      const pages = audit.pages;
      if (pages.length === 0) {
        return { score: 0, rationale: 'No pages crawled' };
      }

      const withDesc = pages.filter(
        (p) => p.meta.description && p.meta.descriptionLength >= 50,
      ).length;
      const withTitle = pages.filter(
        (p) => p.meta.title && p.meta.titleLength >= 10,
      ).length;

      const descRatio = withDesc / pages.length;
      const titleRatio = withTitle / pages.length;

      const score = Math.round((descRatio * 6 + titleRatio * 4));

      const issues: string[] = [];
      if (descRatio < 1)
        issues.push(
          `${pages.length - withDesc}/${pages.length} pages missing/short descriptions`,
        );
      if (titleRatio < 1)
        issues.push(
          `${pages.length - withTitle}/${pages.length} pages missing/short titles`,
        );

      return {
        score: Math.min(score, 10),
        rationale: issues.length > 0 ? issues.join('. ') : 'All pages have good titles and descriptions',
      };
    }),
  );

  checks.push(
    scoreCheck('HTTPS & performance', weights.httpsAndPerf, () => {
      if (!audit.httpsEnforced) {
        return { score: 3, rationale: 'Site not served over HTTPS' };
      }
      return { score: 7, rationale: 'HTTPS enforced (performance checks not yet implemented)' };
    }),
  );

  checks.push(
    scoreCheck('OG & Twitter completeness', weights.ogTwitterCompleteness, () => {
      return scoreOgTwitter(audit);
    }),
  );

  const categoryScore = checks.reduce((sum, c) => sum + c.weighted, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.weight * 10, 0);

  return {
    category: 'technical',
    checks,
    score: categoryScore,
    maxScore,
  };
}

function scoreOgTwitter(audit: TechnicalAuditResult): { score: number; rationale: string } {
  const pages = audit.pages;
  if (pages.length === 0) return { score: 0, rationale: 'No pages crawled' };

  let totalCompleteness = 0;
  for (const page of pages) {
    const m = page.meta;
    let fields = 0;
    if (m.ogTitle) fields++;
    if (m.ogDescription) fields++;
    if (m.ogImage) fields++;
    if (m.ogUrl) fields++;
    if (m.twitterCard) fields++;
    totalCompleteness += fields / 5;
  }

  const avgCompleteness = totalCompleteness / pages.length;
  const score = Math.min(10, Math.round(avgCompleteness * 10));

  const withAll = pages.filter((p) => {
    const m = p.meta;
    return m.ogTitle && m.ogDescription && m.ogImage && m.ogUrl && m.twitterCard;
  }).length;

  return {
    score,
    rationale: `${withAll}/${pages.length} pages have complete OG + Twitter tags. Average completeness: ${Math.round(avgCompleteness * 100)}%`,
  };
}

function scoreContentCategory(
  audit: TechnicalAuditResult,
): CategoryScore {
  const weights = SCORING_WEIGHTS.content;
  const checks: CheckScore[] = [];
  const pages = audit.pages;

  // Content depth: median wordCount, thin page ratio
  checks.push(
    scoreCheck('Content depth', weights.contentDepth, () => {
      if (pages.length === 0) return { score: 0, rationale: 'No pages crawled' };

      const wordCounts = pages.map((p) => p.wordCount).sort((a, b) => a - b);
      const median = wordCounts[Math.floor(wordCounts.length / 2)];
      const thinPages = pages.filter((p) => p.wordCount < 100).length;
      const thinRatio = thinPages / pages.length;

      // Score: median word count drives base score, thin pages penalise
      let score = 0;
      if (median >= 800) score = 9;
      else if (median >= 500) score = 7;
      else if (median >= 300) score = 5;
      else if (median >= 100) score = 3;
      else score = 1;

      // Penalise for thin page ratio
      score = Math.max(0, Math.round(score - thinRatio * 4));

      return {
        score: Math.min(score, 10),
        rationale: `Median word count: ${median}. ${thinPages}/${pages.length} thin pages (<100 words)`,
      };
    }),
  );

  // Heading quality: H1 uniqueness + proper hierarchy
  checks.push(
    scoreCheck('Heading quality', weights.headingQuality, () => {
      if (pages.length === 0) return { score: 0, rationale: 'No pages crawled' };

      let h1Issues = 0;
      let hierarchyIssues = 0;

      for (const page of pages) {
        const h1s = page.headingStructure.filter((h) => h.tag === 'h1');
        if (h1s.length !== 1) h1Issues++;

        // Check for skipped heading levels (h1→h3, h2→h4, etc.)
        const levels = page.headingStructure.map((h) => parseInt(h.tag[1]));
        for (let i = 1; i < levels.length; i++) {
          if (levels[i] - levels[i - 1] > 1) {
            hierarchyIssues++;
            break;
          }
        }
      }

      const h1Ratio = 1 - h1Issues / pages.length;
      const hierarchyRatio = 1 - hierarchyIssues / pages.length;
      const score = Math.min(10, Math.round(h1Ratio * 6 + hierarchyRatio * 4));

      const issues: string[] = [];
      if (h1Issues > 0) issues.push(`${h1Issues} pages with H1 issues`);
      if (hierarchyIssues > 0) issues.push(`${hierarchyIssues} pages skip heading levels`);

      return {
        score,
        rationale: issues.length > 0 ? issues.join('. ') : 'All pages have proper heading structure',
      };
    }),
  );

  // Image accessibility: alt text coverage
  checks.push(
    scoreCheck('Image accessibility', weights.imageAccessibility, () => {
      if (pages.length === 0) return { score: 0, rationale: 'No pages crawled' };

      let totalImages = 0;
      let totalWithAlt = 0;
      let totalWeakAlt = 0;
      let totalMissing = 0;

      for (const page of pages) {
        totalImages += page.images.total;
        totalWithAlt += page.images.withAlt;
        totalWeakAlt += page.images.withWeakAlt;
        totalMissing += page.images.missingAlt;
      }

      if (totalImages === 0) {
        return { score: 7, rationale: 'No images found on crawled pages' };
      }

      const goodRatio = totalWithAlt / totalImages;
      const weakPenalty = (totalWeakAlt / totalImages) * 0.5;
      const score = Math.min(10, Math.max(0, Math.round((goodRatio - weakPenalty) * 10)));

      return {
        score,
        rationale: `${totalImages} images: ${totalWithAlt} with good alt, ${totalWeakAlt} with weak alt, ${totalMissing} missing`,
      };
    }),
  );

  // Answer-first: ratio of pages leading with substantive content
  checks.push(
    scoreCheck('Answer-first content', weights.answerFirst, () => {
      if (pages.length === 0) return { score: 0, rationale: 'No pages crawled' };

      // Only check content pages (300+ words)
      const contentPages = pages.filter((p) => p.wordCount >= 300);
      if (contentPages.length === 0) {
        return { score: 5, rationale: 'No content pages (300+ words) to evaluate' };
      }

      const answerFirstPages = contentPages.filter((p) => p.answerFirst).length;
      const ratio = answerFirstPages / contentPages.length;
      const score = Math.min(10, Math.round(ratio * 10));

      return {
        score,
        rationale: `${answerFirstPages}/${contentPages.length} content pages lead with substantive answers`,
      };
    }),
  );

  const categoryScore = checks.reduce((sum, c) => sum + c.weighted, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.weight * 10, 0);

  return {
    category: 'content',
    checks,
    score: categoryScore,
    maxScore,
  };
}

function scoreAuthorityCategory(
  audit: TechnicalAuditResult,
): CategoryScore {
  const weights = SCORING_WEIGHTS.authority;
  const checks: CheckScore[] = [];
  const pages = audit.pages;

  // Entity clarity: Organization schema, sameAs, author info
  checks.push(
    scoreCheck('Entity clarity', weights.entityClarity, () => {
      if (pages.length === 0) return { score: 0, rationale: 'No pages crawled' };

      let score = 0;
      const parts: string[] = [];

      // Organization schema (+3)
      const hasOrg = pages.some((p) => p.schema.hasOrganization);
      if (hasOrg) { score += 3; parts.push('Organization schema'); }

      // sameAs 2+ entries (+3)
      const allSameAs = new Set<string>();
      for (const page of pages) {
        for (const link of page.identity.sameAsLinks) allSameAs.add(link);
      }
      if (allSameAs.size >= 2) { score += 3; parts.push(`${allSameAs.size} sameAs links`); }
      else if (allSameAs.size === 1) { score += 1; parts.push('1 sameAs link'); }

      // Author info (+2)
      const hasAuthor = pages.some((p) => p.identity.hasAuthorInfo);
      if (hasAuthor) { score += 2; parts.push('author info found'); }

      // Consistent author across pages (+2)
      const authorNames = new Set(
        pages.filter((p) => p.identity.authorName).map((p) => p.identity.authorName),
      );
      if (authorNames.size === 1 && hasAuthor) { score += 2; parts.push('consistent author'); }

      return {
        score: Math.min(score, 10),
        rationale: parts.length > 0 ? parts.join(', ') : 'No entity identity signals found',
      };
    }),
  );

  // Agent discoverability: RSS, sitemap, OpenAPI, llms.txt
  checks.push(
    scoreCheck('Agent discoverability', weights.agentDiscoverability, () => {
      let score = 0;
      const parts: string[] = [];

      if (audit.discovery.rssFound) { score += 3; parts.push('RSS feed'); }
      if (audit.sitemapFound) { score += 3; parts.push('sitemap'); }
      if (audit.discovery.openApiFound) { score += 2; parts.push('OpenAPI spec'); }
      if (audit.llmsTxt.exists) { score += 2; parts.push('llms.txt'); }

      return {
        score: Math.min(score, 10),
        rationale: parts.length > 0 ? `Discoverable via: ${parts.join(', ')}` : 'No discovery mechanisms found',
      };
    }),
  );

  // Trust signals: consistent author, sameAs to known platforms, schema diversity
  checks.push(
    scoreCheck('Trust signals', weights.trustSignals, () => {
      if (pages.length === 0) return { score: 0, rationale: 'No pages crawled' };

      let score = 0;
      const parts: string[] = [];

      // Consistent author identity across pages (+4)
      const authorNames = new Set(
        pages.filter((p) => p.identity.authorName).map((p) => p.identity.authorName),
      );
      const pagesWithAuthor = pages.filter((p) => p.identity.hasAuthorInfo).length;
      if (authorNames.size === 1 && pagesWithAuthor >= 2) {
        score += 4; parts.push('consistent author identity');
      } else if (pagesWithAuthor > 0) {
        score += 1; parts.push('some author info');
      }

      // sameAs to known platforms (+3)
      const knownPlatforms = ['linkedin.com', 'twitter.com', 'x.com', 'github.com', 'facebook.com', 'youtube.com', 'instagram.com'];
      const allSameAs = new Set<string>();
      for (const page of pages) {
        for (const link of page.identity.sameAsLinks) allSameAs.add(link);
      }
      const platformMatches = [...allSameAs].filter((link) =>
        knownPlatforms.some((p) => link.includes(p)),
      ).length;
      if (platformMatches >= 2) { score += 3; parts.push(`${platformMatches} known platform links`); }
      else if (platformMatches === 1) { score += 1; parts.push('1 known platform link'); }

      // Schema diversity > 3 types (+3)
      const allTypes = new Set<string>();
      for (const page of pages) {
        for (const t of page.schema.types) allTypes.add(t);
      }
      if (allTypes.size > 3) { score += 3; parts.push(`${allTypes.size} schema types`); }
      else if (allTypes.size > 0) { score += 1; parts.push(`${allTypes.size} schema type(s)`); }

      return {
        score: Math.min(score, 10),
        rationale: parts.length > 0 ? parts.join(', ') : 'No trust signals detected',
      };
    }),
  );

  const categoryScore = checks.reduce((sum, c) => sum + c.weighted, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.weight * 10, 0);

  return {
    category: 'authority',
    checks,
    score: categoryScore,
    maxScore,
  };
}

function scoreCheck(
  name: string,
  weight: number,
  evaluate: () => { score: number; rationale: string },
): CheckScore {
  const { score, rationale } = evaluate();
  return {
    name,
    score,
    maxScore: 10,
    weight,
    weighted: score * weight,
    rationale,
  };
}

function scoreToGrade(
  score: number,
): 'Excellent' | 'Good' | 'Needs Work' | 'Not GEO-ready' {
  if (score >= GRADE_BANDS.excellent) return 'Excellent';
  if (score >= GRADE_BANDS.good) return 'Good';
  if (score >= GRADE_BANDS.needsWork) return 'Needs Work';
  return 'Not GEO-ready';
}
