import { defineCollection, z } from "astro:content";
import config from "../config/config";
import isURL from "isurl";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { optimize } from "svgo";
import { glob } from "astro/loaders";

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
      try {
        data = optimize(blob)?.data;
      } catch (e) {
        console.error(e);
      }

      writeFileSync(`${tempFolder}/${logoName}.${ext}`, data, {
        flag: "w",
      });
    })
    .catch(console.error);
};

export type ApiSponsor = {
  id: string;
  twitterAccount: string;
  linkedinAccount: string;
  sponsoring: "gold" | "silver" | "bronze";
  name: string;
  logoName: string;
  siteUrl: string;
  logoUrl: string;
  ext: string;
  description?: string;
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
        })
      )
      .optional(),
    editedVideoUrl: z.string().optional(),
    twitterAccount: z.string().optional(),
    linkedinAccount: z.string().optional(),
    sponsoring: z.union([
      z.literal("gold"),
      z.literal("silver"),
      z.literal("bronze"),
    ]),
    name: z.string(),
    logoName: z.string().optional(),
    siteUrl: z.string().optional(),
    logoUrl: z.string().optional(),
    ext: z.string().optional(),
  }),

  loader: async () => {
    const sponsors: ApiSponsor[] = await fetch(
      "https://us-central1-cms4partners-ce427.cloudfunctions.net/cms-getAllPublicSponsors?edition=" +
        config.edition
    ).then((res) => res.json());

    const formattedSponsors = sponsors.map((sponsor) => {
      let twitterAccount = sponsor.twitterAccount;

      if (twitterAccount) {
        twitterAccount = twitterAccount.startsWith("https://x.com/")
          ? twitterAccount
          : `https://x.com/${twitterAccount}`;
      }

      let linkedinAccount = sponsor.linkedinAccount;

      if (linkedinAccount) {
        linkedinAccount = linkedinAccount.includes("linkedin.com/company/")
          ? linkedinAccount
          : `https://linkedin.com/company/${linkedinAccount}`;
      }

      sponsor.linkedinAccount = linkedinAccount;

      return {
        ...sponsor,
        twitterAccount,
        linkedinAccount,
      };
    });

    (formattedSponsors ?? []).forEach(async (sponsor) => {
      try {
        if (sponsor.siteUrl.indexOf("https://") < 0) {
          sponsor.siteUrl = "https://" + sponsor.siteUrl;
        }

        isURL(new URL(sponsor.siteUrl));
      } catch {
        console.error(`Bad URL for ${sponsor.name}`);
      }
      sponsor.logoName = sponsor.name.toLowerCase().replaceAll(" ", "-");

      sponsor.ext = getExtensionFromLogoUrl(sponsor.logoUrl);
      await fetchImage(sponsor);
    });

    return formattedSponsors;
  },
});

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
  }),

  loader: async () => {
    return fetch(
      `https://confily-486924521070.europe-west1.run.app/events/devfest-lille-2024/speakers`
    ).then((response) => response.json());
  },
});

const talks = defineCollection({
  schema: z.object({
    type: z.string().optional(),
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
        })
      )
      .optional(),
    link_slides: z.null().optional(),
    link_replay: z.null().optional(),
    open_feedback: z.null().optional(),
  }),

  loader: async () => {
    const talkMap = await fetch(
      `https://confily-486924521070.europe-west1.run.app/events/devfest-lille-2024/planning`
    ).then((response) => response.json());

    return Object.values(talkMap)
      .flatMap((talk) => Object.values(talk))
      .flat()
      .filter((a) => !!a.talk)
      .map((a: any) => ({
        type: a.type,
        ...a.talk,
      }));
  },
});

const verbatims = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/verbatim" }),
  schema: z.object({
    name: z.string(),
  }),
});
export const collections = {
  sponsors,
  speakers,
  talks,
  verbatims,
};
