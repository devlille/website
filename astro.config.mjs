// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import robotsTxt from "astro-robots-txt";
import event from "./src/config/event.config.ts";
import site from "./src/config/site.config.ts";

// https://astro.build/config
export default defineConfig({
  site: site.url,
  integrations: [
    sitemap({
      // Exclure uniquement les pages qu'on ne veut pas indexer
      filter: (page) =>
        !page.includes("/privacy-mobile") && !page.includes("/404"),
      // Fréquence de changement pour toutes les pages
      changefreq: "weekly",
      priority: 0.7,
      lastmod: new Date(event.contentUpdatedAt),
    }),
    robotsTxt({
      policy: [
        { userAgent: "*", allow: "/", disallow: ["/privacy-mobile", "/404"] },
      ],
    }),
  ],
  markdown: {
    // Le contenu local doit sortir tel qu'il est écrit : pas de substitution
    // typographique silencieuse des apostrophes et des tirets.
    smartypants: false,
  },
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
