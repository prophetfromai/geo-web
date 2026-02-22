import rss from "@astrojs/rss";
import type { APIContext } from "astro";

export function GET(context: APIContext) {
  return rss({
    title: "GEO Audit",
    description:
      "Free Generative Engine Optimisation audit. Paste a URL and see how visible your site is to AI search engines like ChatGPT, Perplexity, and Claude.",
    site: context.site!.toString(),
    items: [
      {
        title: "GEO Audit — How Visible Is Your Site to AI?",
        description:
          "Free Generative Engine Optimisation audit tool. Check how visible your site is to AI search engines like ChatGPT, Perplexity, and Claude.",
        link: "/",
        pubDate: new Date("2025-06-01"),
      },
      {
        title: "GEO Audit Scoring Methodology — 14 AI Visibility Checks",
        description:
          "How GEO Audit scores your site across 14 checks in technical, content, and authority categories. Full methodology with research citations. Last updated 2026-02-22.",
        link: "/methodology/",
        pubDate: new Date("2025-06-01"),
      },
    ],
  });
}
