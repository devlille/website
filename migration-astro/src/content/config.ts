import { defineCollection, z } from "astro:content";
import config from "../config/config";
import isURL from "isurl";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { optimize } from "svgo";

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
};

const sponsors = defineCollection({
  schema: z.object({
    id: z.string(),
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
        twitterAccount = twitterAccount.startsWith("https://twitter.com/")
          ? twitterAccount
          : `https://twitter.com/${twitterAccount}`;
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

export const collections = {
  sponsors,
};
