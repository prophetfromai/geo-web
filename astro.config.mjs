import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://geoaudit.co.uk",
  integrations: [
    tailwind(),
    sitemap({
      filter: (page) => !page.includes("/compare"),
    }),
  ],
  output: "static",
  vite: {
    build: {
      sourcemap: true,
    },
  },
});
