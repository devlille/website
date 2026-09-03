/**
 * Manifeste des assets de marque de l'instance.
 *
 * Les composants du socle ne connaissent aucun chemin de fichier : ils lisent
 * ce manifeste. Rebrander, c'est remplacer le contenu de `public/theme/` et,
 * si les noms changent, ce fichier — rien d'autre.
 */
import { defineConfig } from "../config/define";
import { themeSchema } from "../config/schema";

export default defineConfig("theme.config.ts", themeSchema, {
  logo: "/theme/logo.svg",
  hero: "/theme/hero.svg",
  /**
   * Image des cartes de partage. Un PNG : la plupart des réseaux sociaux ne
   * rendent pas les SVG.
   */
  ogImage: "/theme/og.png",
  favicons: [
    { href: "/theme/favicon.svg", type: "image/svg+xml" },
    { href: "/theme/favicon.png", type: "image/png" },
  ],
  sprite: "/theme/sprite.svg",
  icons: {
    anchor: "/img/link.svg",
  },
});
