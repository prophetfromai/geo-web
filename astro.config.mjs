import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://geoaudit.co.uk",
  integrations: [
    tailwind(),
    sitemap({
      filter: (page) => !page.includes("/audit") && !page.includes("/compare") && !page.includes("/privacy") && !page.includes("/terms"),
    }),
  ],
  output: "static",
  vite: {
    build: {
      sourcemap: true,
    },
  },
});
