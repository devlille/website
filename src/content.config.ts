import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";
import isURL from "isurl";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import config from "./config/config";

const tempFolder = resolve(import.meta.dirname, "../public/img/sponsors");

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
      writeFileSync(`${tempFolder}/${logoName}.${ext}`, blob, {
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

export const SOCIAL_TYPES = [
  "linkedin",
  "youtube",
  "github",
  "bluesky",
  "instagram",
  "x",
  "mastodon",
] as const;

export type SocialType = (typeof SOCIAL_TYPES)[number];

type ApiSocial = {
  type: string;
  url: string;
};

export type Social = {
  type: SocialType;
  url: string;
};

type ApiPartnerActivity = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  partner_id: string;
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
    socials: ApiSocial[];
    siteUrl?: string;
  }>;
  activities: ApiPartnerActivity[];
};

export type ApiSponsor = {
  id: string;
  socials: Social[];
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
    socials: z
      .array(
        z.object({
          type: z.enum(SOCIAL_TYPES),
          url: z.string(),
        }),
      )
      .default([]),
    sponsoring: z.array(z.string()),
    name: z.string(),
    logoName: z.string().optional(),
    siteUrl: z.string().optional(),
    logoUrl: z.string().optional(),
    ext: z.string().optional(),
  }),

  loader: async () => {
    try {
      console.log(
        `${config.partnersActivitiesApi}/events/${config.eventId}/partners/activities`,
      );
      const response: ApiPartnerResponse = await fetch(
        `${config.partnersActivitiesApi}/events/${config.eventId}/partners/activities`,
      ).then((res) => res.json());
      console.log(`Loaded ${response.partners.length} partners from API`);
      console.log(
        `${config.partnersActivitiesApi}/events/${config.eventId}/partners/activities`,
      );
      const formattedSponsors: ApiSponsor[] =
        response.partners.map(formatPartner);

      for (const sponsor of formattedSponsors) {
        normalizeSponsorUrl(sponsor);
      }

      const partnerActivities = buildPartnerActivities(response.activities);

      logSponsorsAudit(formattedSponsors, partnerActivities);

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

const isSocialType = (type: string): type is SocialType =>
  (SOCIAL_TYPES as readonly string[]).includes(type.toLowerCase());

const normalizeSocials = (
  socials: ApiSocial[] | undefined,
): Social[] => {
  if (!Array.isArray(socials)) return [];
  return socials
    .map((s) => ({ ...s, type: s.type.toLowerCase() }))
    .filter((s): s is Social => isSocialType(s.type));
};

const formatPartner = (
  partner: ApiPartnerResponse["partners"][number],
): ApiSponsor => {
  return {
    id: partner.id,
    name: partner.name,
    description: partner.description,
    socials: normalizeSocials(partner.socials),
    siteUrl: partner.siteUrl,
    logoUrl: partner.media.svg,
    ext: "svg",
    logoName: partner.name.toLowerCase().replaceAll(" ", "-"),
    sponsoring: partner.types || [],
    editedVideoUrl: partner.videoUrl ?? undefined,
  };
};

const normalizeSponsorUrl = (sponsor: ApiSponsor): void => {
  if (!sponsor.siteUrl) return;
  try {
    if (
      !sponsor.siteUrl.includes("https://") &&
      !sponsor.siteUrl.includes("http://")
    ) {
      sponsor.siteUrl = "https://" + sponsor.siteUrl;
    }
    isURL(new URL(sponsor.siteUrl));
  } catch {
    console.error(`Bad URL for ${sponsor.name}`);
  }
};

const buildPartnerActivities = (
  activities: unknown,
): Record<string, boolean> => {
  const result: Record<string, boolean> = {};
  if (!Array.isArray(activities)) return result;
  for (const activity of activities) {
    if (activity?.partnerId) {
      result[activity.partnerId] = true;
    }
  }
  return result;
};

const logSponsorsAudit = (
  formattedSponsors: ApiSponsor[],
  partnerActivities: Record<string, boolean>,
): void => {
  const check = (val: unknown) => (val ? "✓" : "✗");
  const hasSocial = (s: ApiSponsor, type: SocialType) =>
    s.socials.some((social) => social.type === type);
  const tableData = formattedSponsors.map((s) => ({
    Nom: s.name,
    Description: check(s.description),
    Offres: check((s as { jobs?: unknown[] }).jobs?.length),
    Activités: check(partnerActivities[s.id]),
    X: check(hasSocial(s, "x")),
    LinkedIn: check(hasSocial(s, "linkedin")),
    Instagram: check(hasSocial(s, "instagram")),
    YouTube: check(hasSocial(s, "youtube")),
    Site: check(s.siteUrl),
  }));
  console.log("\n=== Audit des sponsors ===");
  console.table(tableData);
};

type ApiSpeaker = {
  id: string;
  display_name: string;
  bio?: string;
  photo_url: string;
  pronouns: string | null;
  company: string | null;
  socials: Array<{ type: string; url: string }>;
  partners?: Array<{ id: string; name: string; logo_url: string }>;
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
    display_name: z.string().optional(),
    bio: z.string().optional(),
    photo_url: z.string(),
    pronouns: z.nullable(z.string()),
    company: z.nullable(z.string()),
    socials: z
      .array(
        z.object({
          type: z.enum(SOCIAL_TYPES),
          url: z.string(),
        }),
      )
      .default([]),
    website: z.nullable(z.string()).optional(),
    partners: z
      .array(
        z.object({ id: z.string(), name: z.string(), logo_url: z.string() }),
      )
      .optional(),
  }),

  loader: async () => {
    const agenda = await fetch(
      `https://app-e675e675-2e47-445c-a7a7-359a37188469.cleverapps.io/events/7193c477-1579-4216-a6cb-c8854e848395/agenda`,
      { headers: { Accept: "application/json; version=4" } },
    ).then((response) => response.json());

    return agenda.speakers.map((speaker: ApiSpeaker) => ({
      id: speaker.id,
      display_name: speaker.display_name,
      bio: speaker.bio,
      photo_url: speaker.photo_url,
      pronouns: speaker.pronouns,
      company: speaker.company,
      socials: normalizeSocials(speaker.socials),
      website: getSocialUrl(speaker.socials, "website"),
      partners: speaker.partners ?? [],
    }));
  },
});

const talks = defineCollection({
  schema: z.object({
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
          partners: z
            .array(
              z.object({
                id: z.string(),
                name: z.string(),
                logo_url: z.string(),
              }),
            )
            .optional(),
        }),
      )
      .optional(),
    link_slides: z.string().optional().nullable(),
    link_replay: z.string().optional().nullable(),
    open_feedback: z.string().optional().nullable(),
    session_id: z.string().optional(),
  }),

  loader: async () => {
    const agenda = await fetch(
      `https://app-e675e675-2e47-445c-a7a7-359a37188469.cleverapps.io/events/7193c477-1579-4216-a6cb-c8854e848395/agenda`,
      { headers: { Accept: "application/json; version=4" } },
    ).then((response) => response.json());

    const sessionsMap = new Map<string, any>(
      agenda.sessions.map((s: any) => [s.id, s]),
    );
    const speakersMap = new Map<string, any>(
      agenda.speakers.map((s: any) => [s.id, s]),
    );

    return agenda.schedules
      .filter(
        (schedule: any) =>
          schedule.session_id !== "null" &&
          sessionsMap.get(schedule.session_id)?.type === "talk-session",
      )
      .map((schedule: any) => {
        const session = sessionsMap.get(schedule.session_id);
        const speakerObjects = (session.speakers ?? [])
          .map((id: string) => speakersMap.get(id))
          .filter(Boolean);

        return {
          id: schedule.id,
          session_id: schedule.session_id,
          title:
            typeof session.title === "string"
              ? session.title.replaceAll("\u00A0", " ")
              : session.title,
          abstract:
            typeof session.abstract === "string"
              ? session.abstract.replaceAll("\u00A0", " ")
              : session.abstract,
          level: session.level,
          language: session.language,
          speakers: speakerObjects,
          link_slides: session.link_slides,
          link_replay: session.link_replay,
          open_feedback: session.open_feedback,
        };
      });
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
            .replaceAll("&amp;", "&")
            .replaceAll("&quot;", '"')
            .replaceAll("&#39;", "'"),
          description: description
            .replaceAll("&amp;", "&")
            .replaceAll("&quot;", '"')
            .replaceAll("&#39;", "'"),
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

const partnerActivities = defineCollection({
  schema: z.object({
    id: z.string(),
    name: z.string(),
    start_time: z.string(),
    end_time: z.string(),
    partner_id: z.string(),
    partner_name: z.string(),
    partner_logo_url: z.string().optional(),
  }),

  loader: async () => {
    try {
      const response: ApiPartnerResponse = await fetch(
        `${config.partnersActivitiesApi}/events/${config.eventId}/partners/activities`,
      ).then((res) => res.json());

      const partnersById = new Map(response.partners.map((p) => [p.id, p]));

      return (response.activities ?? []).map((activity) => {
        const partner = partnersById.get(activity.partner_id);
        return {
          id: activity.id,
          name: activity.name,
          start_time: activity.start_time,
          end_time: activity.end_time,
          partner_id: activity.partner_id,
          partner_name: partner?.name ?? "",
          partner_logo_url: partner?.media?.svg,
        };
      });
    } catch (error) {
      console.error("Error loading partner activities:", error);
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
  partnerActivities,
};
