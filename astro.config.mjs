// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import robotsTxt from "astro-robots-txt";
import { satteri } from "@astrojs/markdown-satteri";
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
    processor: satteri({ features: { smartPunctuation: false } }),
  },
  vite: {
    build: {
      cssMinify: "lightningcss",
      // esbuild plutôt que terser : ~200 ms de moins sur le build client, pour
      // une sortie identique à l'octet près — le site ne sert que 4 Ko de JS,
      // les passes supplémentaires de terser n'ont rien à y gagner.
      minify: "esbuild",
    },
    ssr: {
      noExternal: ["markdown"],
    },
  },
});
