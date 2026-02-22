import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://geo-web.prophetfrom.ai",
  integrations: [
    tailwind(),
    sitemap({
      filter: (page) => !page.includes("/audit"),
    }),
  ],
  output: "static",
  vite: {
    build: {
      sourcemap: true,
    },
  },
});
