import { GRADE_BANDS, SCORING_WEIGHTS } from '../config.js';
import type {
  CategoryScore,
  CheckScore,
  OverallScore,
  TechnicalAuditResult,
} from '../types.js';

/** Score the technical audit results */
export function scoreTechnicalAudit(
  audit: TechnicalAuditResult,
): OverallScore {
  const technicalChecks = scoreTechnicalCategory(audit);

  const contentChecks = placeholderCategory('content');
  const authorityChecks = placeholderCategory('authority');

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

  const categoryScore = checks.reduce((sum, c) => sum + c.weighted, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.weight * 10, 0);

  return {
    category: 'technical',
    checks,
    score: categoryScore,
    maxScore,
  };
}

function placeholderCategory(
  category: 'content' | 'authority',
): CategoryScore {
  const weights =
    category === 'content'
      ? SCORING_WEIGHTS.content
      : SCORING_WEIGHTS.authority;

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  return {
    category,
    checks: [
      {
        name: `${category} (Phase 2)`,
        score: 0,
        maxScore: 10,
        weight: totalWeight,
        weighted: 0,
        rationale: 'Not yet implemented — coming in next phase',
      },
    ],
    score: 0,
    maxScore: totalWeight * 10,
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
