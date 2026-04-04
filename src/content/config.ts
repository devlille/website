import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";
import isURL from "isurl";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { optimize } from "svgo";
import config from "../config/config";

const tempFolder = resolve(import.meta.dirname, "../../public/img/sponsors");

function getExtension(potentialExt?: string) {
  switch (potentialExt) {
    case "png":
      return "png";
    case "svg":
      return "svg";
    default:
      return "svg";
  }
}

export const getExtensionFromLogoUrl = (logoUrl: string) => {
  return getExtension(logoUrl.split(".").pop());
};

export const fetchImage = ({
  ext,
  logoName,
  logoUrl,
}: {
  ext: string;
  logoName: string;
  logoUrl: string;
}) => {
  return fetch(logoUrl)
    .then((response) => response.text())
    .then((blob) => {
      let data = blob;
      /*try {
        data = optimize(blob)?.data;
      } catch (e) {
        console.error(e);
      }*/

      writeFileSync(`${tempFolder}/${logoName}.${ext}`, data, {
        flag: "w",
      });
    })
    .catch(console.error);
};

type ApiPartnerType = {
  id: string;
  name: string;
  order: number;
};

type ApiPartnerMedia = {
  svg: string;
  png: {
    "250": string;
    "500": string;
    "1000": string;
  };
};

type ApiPartnerSocial = {
  type: string;
  url: string;
};

type ApiPartnerResponse = {
  types: ApiPartnerType[];
  partners: Array<{
    id: string;
    name: string;
    description: string;
    media: ApiPartnerMedia;
    videoUrl: string | null;
    address: any;
    types: string[];
    socials: ApiPartnerSocial[];
  }>;
  activities: any[];
};

export type ApiSponsor = {
  id: string;
  twitterAccount?: string;
  linkedinAccount?: string;
  instagramAccount?: string;
  facebookAccount?: string;
  sponsoring: string[];
  name: string;
  logoName: string;
  siteUrl?: string;
  logoUrl: string;
  ext: string;
  description?: string;
  editedVideoUrl?: string;
};

const sponsors = defineCollection({
  schema: z.object({
    id: z.string(),
    description: z.string().optional(),
    jobs: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
        }),
      )
      .optional(),
    editedVideoUrl: z.string().optional(),
    twitterAccount: z.string().optional(),
    linkedinAccount: z.string().optional(),
    instagramAccount: z.string().optional(),
    facebookAccount: z.string().optional(),
    sponsoring: z.array(z.string()),
    name: z.string(),
    logoName: z.string().optional(),
    siteUrl: z.string().optional(),
    logoUrl: z.string().optional(),
    ext: z.string().optional(),
  }),

  loader: async () => {
    try {
      const response: ApiPartnerResponse = await fetch(
        `${config.partnersActivitiesApi}/events/${config.eventId}/partners/activities`,
      ).then((res) => res.json());
      console.log(`Loaded ${response.partners.length} partners from API`);
      console.log(
        `${config.partnersActivitiesApi}/events/${config.eventId}/partners/activities`,
      );
      const formattedSponsors: ApiSponsor[] = response.partners.map(
        (partner) => {
          console.log(partner.name, partner.types);
          const getSocial = (type: string) => {
            if (!partner.socials || !Array.isArray(partner.socials)) {
              return undefined;
            }
            // Les types dans l'API sont en minuscules
            const social = partner.socials.find(
              (s) => s.type.toLowerCase() === type.toLowerCase(),
            );
            // L'API utilise 'url' au lieu de 'link'
            return social?.url;
          };

          const twitterAccount = getSocial("x");
          const linkedinAccount = getSocial("linkedin");
          const instagramAccount = getSocial("instagram");
          const facebookAccount = getSocial("facebook");
          const siteUrl = getSocial("site web");

          const logoUrl = partner.media.svg;
          const ext = "svg";
          const logoName = partner.name.toLowerCase().replaceAll(" ", "-");

          // partner.types contient directement les noms des catégories (tableau de strings)
          const sponsoring = partner.types || [];
          return {
            id: partner.id,
            name: partner.name,
            description: partner.description,
            twitterAccount,
            linkedinAccount,
            instagramAccount,
            facebookAccount,
            siteUrl,
            logoUrl,
            ext,
            logoName,
            sponsoring,
            editedVideoUrl: partner.videoUrl ?? undefined,
          };
        },
      );

      // Valider les URLs
      for (const sponsor of formattedSponsors) {
        if (sponsor.siteUrl) {
          try {
            if (
              sponsor.siteUrl.indexOf("https://") < 0 &&
              sponsor.siteUrl.indexOf("http://") < 0
            ) {
              sponsor.siteUrl = "https://" + sponsor.siteUrl;
            }
            isURL(new URL(sponsor.siteUrl));
          } catch {
            console.error(`Bad URL for ${sponsor.name}`);
          }
        }
      }

      const partnerActivities: Record<string, boolean> = {};
      if (Array.isArray(response.activities)) {
        for (const activity of response.activities) {
          if (activity?.partnerId) {
            partnerActivities[activity.partnerId] = true;
          }
        }
      }

      const check = (val: unknown) => (val ? "✓" : "✗");
      const tableData = formattedSponsors.map((s) => ({
        Nom: s.name,
        Description: check(s.description),
        Offres: check(s.jobs && s.jobs.length > 0),
        Activités: check(partnerActivities[s.id]),
        Twitter: check(s.twitterAccount),
        LinkedIn: check(s.linkedinAccount),
        Instagram: check(s.instagramAccount),
        Facebook: check(s.facebookAccount),
        Site: check(s.siteUrl),
      }));
      console.log("\n=== Audit des sponsors ===");
      console.table(tableData);

      console.log(
        `Returning ${formattedSponsors.length} formatted sponsors immediately (without downloading images)`,
      );
      return formattedSponsors;
    } catch (error) {
      console.error("Error loading sponsors:", error);
      return [];
    }
  },
});

type ApiSpeaker = {
  id: string;
  display_name: string;
  bio?: string;
  photo_url: string;
  pronouns: string | null;
  company: string | null;
  socials: Array<{ type: string; url: string }>;
};

const getSocialUrl = (
  socials: Array<{ type: string; url: string }>,
  type: string,
): string | null => {
  const social = socials.find((s) => s.type === type);
  return social?.url ?? null;
};

const speakers = defineCollection({
  schema: z.object({
    id: z.string(),
    display_name: z.string().optional(),
    bio: z.string().optional(),
    photo_url: z.string(),
    pronouns: z.nullable(z.string()),
    company: z.nullable(z.string()),
    mastodon: z.nullable(z.string()).optional(),
    twitter: z.nullable(z.string()).optional(),
    github: z.nullable(z.string()).optional(),
    linkedin: z.nullable(z.string()).optional(),
    website: z.nullable(z.string()).optional(),
    bluesky: z.nullable(z.string()).optional(),
  }),

  loader: async () => {
    const agenda = await fetch(
      `https://app-e675e675-2e47-445c-a7a7-359a37188469.cleverapps.io/events/7193c477-1579-4216-a6cb-c8854e848395/agenda`,
    ).then((response) => response.json());

    const speakersMap = new Map<string, ApiSpeaker>();

    for (const sessions of Object.values(agenda.talks as Record<string, any[]>)) {
      for (const session of sessions) {
        for (const speaker of session.talk?.speakers ?? []) {
          if (!speakersMap.has(speaker.id)) {
            speakersMap.set(speaker.id, speaker);
          }
        }
      }
    }

    return Array.from(speakersMap.values()).map((speaker) => ({
      id: speaker.id,
      display_name: speaker.display_name,
      bio: speaker.bio,
      photo_url: speaker.photo_url,
      pronouns: speaker.pronouns,
      company: speaker.company,
      twitter: getSocialUrl(speaker.socials, "x"),
      github: getSocialUrl(speaker.socials, "github"),
      linkedin: getSocialUrl(speaker.socials, "linkedin"),
      mastodon: getSocialUrl(speaker.socials, "mastodon"),
      website: getSocialUrl(speaker.socials, "website"),
      bluesky: getSocialUrl(speaker.socials, "bluesky"),
    }));
  },
});

const talks = defineCollection({
  schema: z.object({
    id: z.string(),
    title: z.string().optional(),
    level: z.string().optional(),
    abstract: z.string().optional(),
    category: z.string().optional(),
    category_style: z
      .object({
        id: z.string().optional(),
        name: z.string(),
        color: z.string(),
        icon: z.string(),
      })
      .optional(),
    format: z.string().optional(),
    language: z.string().optional(),
    speakers: z
      .array(
        z.object({
          id: z.string().optional(),
          display_name: z.string(),
          pronouns: z.nullable(z.string()),
          bio: z.string(),
          job_title: z.nullable(z.string()),
          company: z.nullable(z.string()),
          photo_url: z.string(),
          socials: z.array(z.unknown()),
        }),
      )
      .optional(),
    link_slides: z.string().optional().nullable(),
    link_replay: z.string().optional().nullable(),
    open_feedback: z.string().optional().nullable(),
  }),

  loader: async () => {
    const agenda = await fetch(
      `https://app-e675e675-2e47-445c-a7a7-359a37188469.cleverapps.io/events/7193c477-1579-4216-a6cb-c8854e848395/agenda`,
    ).then((response) => response.json());

    return Object.values(agenda.talks as Record<string, any[]>)
      .flat()
      .filter((session: any) => session.talk !== null)
      .map((session: any) => ({
        ...session.talk,
        id: session.id,
      }));
  },
});

const verbatims = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/verbatim" }),
  schema: z.object({
    name: z.string(),
  }),
});

const youtubeVideos = defineCollection({
  schema: z.object({
    id: z.string(),
    videoId: z.string(),
    title: z.string(),
    description: z.string(),
    publishedAt: z.string(),
    thumbnailUrl: z.string(),
  }),

  loader: async () => {
    try {
      // Utilisation de l'API YouTube Data v3 via l'endpoint RSS (pas besoin de clé API)
      // On récupère les vidéos via l'API YouTube oEmbed pour avoir plus de détails
      const playlistId = config.youtubePlaylistId;

      // L'API RSS de YouTube pour les playlists
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;

      const response = await fetch(rssUrl);
      const xmlText = await response.text();

      // Parser simple du XML (sans dépendance externe)
      const entries = xmlText.match(/<entry>[\s\S]*?<\/entry>/g) || [];

      const videos = entries.map((entry, index) => {
        const videoId =
          entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1] || "";
        const title = entry.match(/<title>(.*?)<\/title>/)?.[1] || "";
        const description =
          entry.match(/<media:description>(.*?)<\/media:description>/)?.[1] ||
          "";
        const publishedAt =
          entry.match(/<published>(.*?)<\/published>/)?.[1] || "";
        const thumbnailUrl =
          entry.match(/<media:thumbnail url="(.*?)"/)?.[1] || "";

        return {
          id: videoId,
          videoId,
          title: title
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'"),
          description: description
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'"),
          publishedAt,
          thumbnailUrl,
        };
      });

      return videos;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des vidéos YouTube:",
        error,
      );
      return [];
    }
  },
});

export const collections = {
  sponsors,
  speakers,
  talks,
  verbatims,
  youtubeVideos,
};
