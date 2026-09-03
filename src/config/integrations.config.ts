/**
 * Services tiers branchés sur le site : source de données, billetterie,
 * newsletter, vidéos. Une instance qui n'en utilise pas remplace les valeurs
 * ou coupe la fonctionnalité correspondante dans `features.ts`.
 */
import { defineConfig } from "./define";
import { integrationsSchema } from "./schema";

export default defineConfig("integrations.config.ts", integrationsSchema, {
  api: {
    baseUrl: "https://app-e675e675-2e47-445c-a7a7-359a37188469.cleverapps.io",
    eventId: "7193c477-1579-4216-a6cb-c8854e848395",
  },
  tickets: {
    urlTemplate: "https://www.billetweb.fr/devlille-{edition}",
  },
  youtube: {
    playlistId: "PLXbqr_rv1t4P8qX9IEgd3vnjm9IbEHDG8",
  },
  partnershipDeck: [
    {
      label: "Dossier de partenariat",
      lang: "fr",
      url: "https://docs.google.com/presentation/d/e/2PACX-1vQ8NK6ZjZRNFbRAae5CkmqRDMA0C_PuIUYGuBX6B-_OT_LSqC_T5cGOwj4iFpMIpzaTk4vfv82dAEqX/pub?start=false&loop=false&delayms=3000",
    },
    {
      label: "Partnership deck",
      lang: "en",
      url: "https://docs.google.com/presentation/d/e/2PACX-1vQXNOhmshQ9qr39AAYOVbWsTcstKpbglCYNPOUGcTPBboKzaOS2C-reB6vSVm_sl3AM3EBRLgS0i0ZZ/pub?start=false&loop=false&delayms=3000",
    },
  ],
  newsletter: {
    formAction:
      "https://gdglille.us17.list-manage.com/subscribe/post?u=20e377fe4a62412ff254e60e0&id=8ad076b614&f_id=00c6cde3f0",
    botFieldName: "b_20e377fe4a62412ff254e60e0_8ad076b614",
    hiddenFields: [{ name: "tags", value: "8399931" }],
    stylesheet: "//cdn-images.mailchimp.com/embedcode/classic-061523.css",
    script: "//s3.amazonaws.com/downloads.mailchimp.com/js/mc-validate.js",
    fields: [
      { name: "EMAIL", type: "email" },
      { name: "FNAME", type: "text" },
      { name: "LNAME", type: "text" },
      { name: "BIRTHDAY", type: "birthday" },
    ],
    badge: {
      href: "http://eepurl.com/iRWe4g",
      src: "https://digitalasset.intuit.com/render/content/dam/intuit/mc-fe/en_us/images/intuit-mc-rewards-text-light.svg",
      alt: "Intuit Mailchimp",
    },
  },
});
