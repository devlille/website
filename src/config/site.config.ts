/**
 * Identité de l'instance : qui organise, sous quel nom, à quelle adresse.
 * Rien ici ne dépend de l'édition en cours (voir `event.config.ts`).
 */
import { defineConfig } from "./define";
import { siteSchema } from "./schema";

/** Adresse de contact, publiée telle quelle et reprise en pied de page. */
const contactEmail = "contact@devlille.fr";

export default defineConfig("site.config.ts", siteSchema, {
  id: "devlille",
  name: "DevLille",
  url: "https://devlille.fr",
  locale: "fr-FR",
  contactEmail,
  keywords: ["DevLille", "Conférence", "Web", "Mobile", "Cloud", "Quickies"],
  themeColor: "#006D6D",
  organizer: { name: "DevLille", url: "https://devlille.fr/" },
  socials: [
    {
      label: "Chaîne DevLille sur YouTube",
      url: "https://www.youtube.com/@DevLille",
      icon: "ic-youtube",
    },
    {
      label: "DevLille sur BleuSky",
      url: "https://bsky.app/profile/devlille.fr",
      icon: "ic-bluesky",
    },
    {
      label: "DevLille sur Mastodon",
      url: "https://piaille.fr/@devlille",
      icon: "ic-mastodon",
    },
    {
      label: "DevLille sur LinkedIn",
      url: "https://www.linkedin.com/company/devlille/",
      icon: "ic-linkedin",
    },
    {
      label: "DevLille sur l'App Store",
      url: "https://apps.apple.com/us/app/devlille/id6765912011",
      icon: "ic-apple",
    },
    {
      label: "DevLille sur Google Play",
      url: "https://play.google.com/store/apps/details?id=org.gdglille.devfest.android",
      icon: "ic-android",
    },
  ],
  nav: [
    { href: "/index.html", label: "Accueil", section: "index" },
    { href: "/agenda/index.html", label: "Agenda", section: "agenda" },
    { href: "/animations", label: "Animations", section: "animations" },
    { href: "/faq", label: "FAQ", section: "faq" },
  ],
  footerLinks: [
    { href: "/a-propos", label: "L'équipe DevLille" },
    { href: "/offres-emploi", label: "Nos offres d'emploi" },
    { href: "/press", label: "On parle de nous" },
    { href: `mailto:${contactEmail}`, label: "Contactez-nous" },
    {
      href: "https://docs.google.com/presentation/d/e/2PACX-1vQ8NK6ZjZRNFbRAae5CkmqRDMA0C_PuIUYGuBX6B-_OT_LSqC_T5cGOwj4iFpMIpzaTk4vfv82dAEqX/pub?start=false&loop=false&delayms=3000",
      label: "Devenez partenaire",
      feature: "sponsoring",
    },
    {
      href: "https://docs.google.com/presentation/d/e/2PACX-1vQXNOhmshQ9qr39AAYOVbWsTcstKpbglCYNPOUGcTPBboKzaOS2C-reB6vSVm_sl3AM3EBRLgS0i0ZZ/pub?start=false&loop=false&delayms=3000",
      label: "Partnership deck (English)",
      feature: "sponsoring",
      external: true,
    },
    { href: "/code-conduite", label: "Code de conduite" },
    { href: "/promo", label: "Ressources graphiques" },
  ],
});
