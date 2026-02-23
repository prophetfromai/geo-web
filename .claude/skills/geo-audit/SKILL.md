---
name: geo-audit
description: Run a GEO audit on a URL to check AI search visibility
user-invocable: true
allowed-tools: Bash
---

Run a GEO (Generative Engine Optimisation) audit using the GEO Audit API at geoaudit.co.uk.

## Accepting a URL

If the user provides a URL or domain as an argument (e.g. `/geo-audit example.com`), use that.

If no argument is given, try to detect the project's domain by checking (in order):
1. `package.json` → `homepage` field
2. `CNAME` file in the repo root
3. Common config files (`astro.config.*`, `next.config.*`, `netlify.toml`, `vercel.json`) for site URL
4. Ask the user

## Running the audit

Use curl to call the GEO Audit API with `wait=true` (holds the connection until the audit completes — no polling needed):

```bash
URL="<the domain>"
curl -s "https://geoaudit.co.uk/report?url=$URL&wait=true"
```

## Presenting results

From the Markdown report, extract and present:
- **Score** and **grade** (e.g. "72/100 — Good")
- **Category breakdown** — Technical, Content, Authority scores
- **Top priorities** — the highest-impact recommendations

## Offering to help

If you are currently working on the audited site's codebase, offer to implement the top recommendations. For example:
- Adding missing structured data
- Creating an llms.txt file
- Fixing robots.txt AI crawler rules
- Improving heading hierarchy or meta descriptions