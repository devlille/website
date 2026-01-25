// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://devlille.fr",
  integrations: [
    sitemap({
      // Exclure uniquement les pages qu'on ne veut pas indexer
      filter: (page) =>
        !page.includes("/privacy-mobile") && !page.includes("/404"),
      // Fréquence de changement pour toutes les pages
      changefreq: "weekly",
      priority: 0.7,
      lastmod: new Date(),
    }),
  ],
  vite: {
    build: {
      cssMinify: "lightningcss",
      minify: "terser",
    },
    ssr: {
      noExternal: ["markdown"],
    },
  },
});
