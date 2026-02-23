/**
 * Server-side Markdown renderer for GEO audit reports.
 * Returns a complete Markdown document consumable by AI agents.
 */

interface Check {
  name: string;
  score: number;
  rationale: string;
}

interface Category {
  category: string;
  score: number;
  maxScore: number;
  checks: Check[];
}

interface ScoreData {
  score: number;
  grade: string;
  categories: Category[];
}

interface Recommendation {
  title: string;
  checkName?: string;
  triggeredBy: string;
  description: string;
  disruption: string;
  impact: { level: string; citation?: string };
  steps: string[];
  snippet?: string;
  affectedPages: string[];
}

interface AuditResult {
  url: string;
  pagesCrawled: number;
  score: ScoreData;
}

interface AuditData {
  auditId: string;
  domain: string;
  status: string;
  result?: AuditResult;
  recommendations?: { recommendations: Recommendation[] };
  progress?: { phase?: string; pagesCrawled?: number; maxPages?: number };
  error?: string;
}

export function renderReportMarkdown(data: AuditData): string {
  if (data.status === 'completed' && data.result) {
    return renderCompleted(data);
  }

  if (data.status === 'failed') {
    return renderFailed(data);
  }

  if (data.status === 'running' || data.status === 'queued') {
    return renderInProgress(data);
  }

  return renderStarted(data);
}

function renderCompleted(data: AuditData): string {
  const result = data.result!;
  const score = result.score;
  const recommendations = data.recommendations;

  let md = `# GEO Audit Report — ${data.domain}\n\n`;
  md += `**URL:** ${result.url}  \n`;
  md += `**Score:** ${score.score}/100 (${score.grade})  \n`;
  md += `**Pages crawled:** ${result.pagesCrawled}  \n`;
  md += `**Audit ID:** ${data.auditId}\n\n`;

  md += `## Score Breakdown\n\n`;
  for (const cat of score.categories) {
    const pct = cat.maxScore > 0 ? Math.round((cat.score / cat.maxScore) * 100) : 0;
    const label = cat.category.charAt(0).toUpperCase() + cat.category.slice(1);
    md += `### ${label} — ${pct}%\n\n`;
    md += `| Check | Score | Rationale |\n`;
    md += `|-------|-------|-----------|\n`;
    for (const check of cat.checks) {
      const rationale = check.rationale.replace(/\|/g, '\\|');
      md += `| ${check.name} | ${check.score}/10 | ${rationale} |\n`;
    }
    md += `\n`;
  }

  if (recommendations?.recommendations?.length) {
    const checkScores: Record<string, number> = {};
    for (const cat of score.categories) {
      for (const check of cat.checks) {
        checkScores[check.name] = check.score;
      }
    }

    md += `## Recommendations\n\n`;
    md += `Each recommendation is self-contained — it includes the related scoring check, what was detected, fix steps, and code snippets.\n\n`;
    for (const rec of recommendations.recommendations) {
      md += `### ${rec.title} [${rec.disruption}] [${rec.impact.level} impact]\n\n`;
      if (rec.checkName) {
        const checkScore = checkScores[rec.checkName];
        md += `**Check:** ${rec.checkName}${checkScore != null ? ` (${checkScore}/10)` : ''}\n`;
      }
      md += `**Issue detected:** ${rec.triggeredBy}\n\n`;
      md += `${rec.description}\n\n`;
      if (rec.impact.citation) {
        md += `> ${rec.impact.citation}\n\n`;
      }
      md += `**Steps:**\n`;
      for (let i = 0; i < rec.steps.length; i++) {
        md += `${i + 1}. ${rec.steps[i]}\n`;
      }
      if (rec.snippet) {
        const lang = rec.snippet.trimStart().startsWith('{') || rec.snippet.trimStart().startsWith('<script') ? 'json' : 'html';
        md += `\n**Code to add:**\n\`\`\`${lang}\n${rec.snippet}\n\`\`\`\n`;
      }
      if (rec.affectedPages.length > 0) {
        md += `\n**Affected pages:**\n`;
        for (const page of rec.affectedPages) {
          md += `- ${page}\n`;
        }
      }
      md += `\n---\n\n`;
    }
  }

  md += `---\n\n`;
  md += `*To re-run this audit, visit: https://geoaudit.co.uk/report?url=${data.domain}&fresh=true*\n`;

  return md;
}

function renderInProgress(data: AuditData): string {
  let md = `# GEO Audit — ${data.domain}\n\n`;
  md += `**Status:** ${data.status === 'running' ? 'Running' : 'Queued'}\n\n`;

  if (data.progress?.phase) {
    md += `**Phase:** ${data.progress.phase}\n`;
  }
  if (data.progress?.pagesCrawled != null && data.progress?.maxPages) {
    md += `**Progress:** ${data.progress.pagesCrawled} / ${data.progress.maxPages} pages crawled\n`;
  }

  md += `\nThe audit is in progress. Retry this request in 10 seconds.\n`;
  return md;
}

function renderFailed(data: AuditData): string {
  let md = `# GEO Audit — ${data.domain}\n\n`;
  md += `**Status:** Failed\n\n`;
  md += `The audit for ${data.domain} could not be completed.\n\n`;
  if (data.error) {
    md += `**Error:** ${data.error}\n\n`;
  }
  md += `To try again, visit: https://geoaudit.co.uk/report?url=${data.domain}&fresh=true\n`;
  return md;
}

function renderStarted(data: AuditData): string {
  let md = `# GEO Audit — ${data.domain}\n\n`;
  md += `**Status:** Started\n\n`;
  md += `A new audit has been queued for ${data.domain}. Retry this request in 20 seconds.\n`;
  return md;
}
