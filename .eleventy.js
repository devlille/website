const htmlmin = require("html-minifier");
const fetch = require("node-fetch");
const config = require("./data/config.json");
const md = require("markdown").markdown;
const lightningCSS = require("@11tyrocks/eleventy-plugin-lightningcss");
const { getExtensionFromLogoUrl, fetchImage } = require("./.11ty/image");

module.exports = function (eleventyConfig) {
  eleventyConfig.addCollection("faqs", async () => {
    try {
      const data = await fetch(config.cms4partnersApi + config.edition).then((res) => res.json());
      const qanda = data.qanda
        .sort((f1, f2) => f1.order - f2.order)
        .map((q) => {
          return {
            ...q,
            response: md.toHTML(q.response.replaceAll("* ", "\r\n\r\n* ")),
          };
        })
        .map((q) => {
          return {
            ...q,
            response: q.acronyms.reduce(
              (acc, { key, value }) => acc.replace(key, `<abbr title="${value}">${key}</abbr>`),

              q.actions.reduce((acc, { label, url }) => {
                const regEx = new RegExp(label, "ig");
                return acc.replace(regEx, `<a href="${url}">${label}</a>`);
              }, q.response)
            ),
          };
        });
      return qanda;
    } catch (e) {
      return [];
    }
  });
  eleventyConfig.addCollection("speakersFromApi", async () => {
    try {
      const speakers = await fetch(config.cms4partnersApi + config.edition + "/speakers").then((res) => res.json());
      return speakers.sort((s1, s2) => s1.display_name.localeCompare(s2.display_name));
    } catch (e) {
      return [];
    }
  });

  eleventyConfig.addCollection("partners", async () => {
    const isURL = require("isurl");

    try {
      const sponsors = await fetch(
        "https://us-central1-cms4partners-ce427.cloudfunctions.net/cms-getAllPublicSponsors"
      ).then((res) => res.json());
      const sponsorsByPacks = sponsors.reduce((acc, sponsor) => {
        if (sponsor.twitterAccount) {
          let twitterAccount = sponsor.twitterAccount;
          twitterAccount = twitterAccount.startsWith("https://twitter.com/")
            ? twitterAccount
            : `https://twitter.com/${twitterAccount}`;
          sponsor.twitterAccount = twitterAccount;
        }
        if (sponsor.linkedinAccount) {
          let linkedinAccount = sponsor.linkedinAccount;
          linkedinAccount = linkedinAccount.includes("linkedin.com/company/")
            ? linkedinAccount
            : `https://linkedin.com/company/${linkedinAccount}`;
          sponsor.linkedinAccount = linkedinAccount;
        }
        return {
          ...acc,
          [sponsor.sponsoring]: [...(acc[sponsor.sponsoring] ?? []), sponsor],
        };
      }, {});

      Object.entries(sponsorsByPacks).forEach(([pack, partners]) => {
        sponsors[pack] = partners.sort((p1, p2) => {
          return p1.name.toLowerCase().localeCompare(p2.name.toLowerCase());
        });
      });

      Object.values(sponsorsByPacks).forEach((pack) => {
        const sponsorsByPack = Object.values(pack);
        sponsorsByPack.forEach((sponsor) => {
          try {
            if (sponsor.siteUrl.indexOf("https://") < 0) {
              sponsor.siteUrl = "https://" + sponsor.siteUrl;
            }

            isURL(new URL(sponsor.siteUrl));
          } catch (e) {
            console.error(`Bad URL for ${sponsor.name}`);
            process.exit(1);
          }
          sponsor.logoName = sponsor.name.toLowerCase().replaceAll(" ", "-");

          sponsor.ext = getExtensionFromLogoUrl(sponsor.logoUrl);
          fetchImage(sponsor);
        });
      });
      return sponsorsByPacks;
    } catch (e) {
      console.log(e);
      return {};
    }
  });

  eleventyConfig.addCollection("config", () => config);

  eleventyConfig.addCollection("talks", async () => {
    try {
      const agenda = await fetch(config.cms4partnersApi + config.edition + "/agenda").then((res) => res.json());
      const talks = Object.entries(agenda.talks);
      const oTalks = talks.map(([_, talks]) => {
        return [
          _,
          talks.map((talk) => {
            return {
              talk: {
                ...talk,
                room: talk.room,
                abstract: md.toHTML(talk?.talk?.abstract ?? "")?.replaceAll("h2", "p"),
                title: talk?.talk?.title ?? "Pause",
              },
              id: talk?.talk?.speakers[0]?.id,
              speakers: talk?.talk?.speakers?.map((speaker) => speaker?.display_name).join(" &amp; "),
              speakersIds: talk?.talk?.speakers?.map((speaker) => speaker?.id),
            };
          }),
        ];
      });

      return oTalks;
    } catch (e) {
      console.log(e);
      return [];
    }
  });

  eleventyConfig.addPassthroughCopy("css/*.ttf");
  eleventyConfig.addPassthroughCopy("css/*.woff");
  eleventyConfig.addPassthroughCopy("css/*.woff2");
  eleventyConfig.addPassthroughCopy("manifest.json");
  eleventyConfig.addPassthroughCopy("img/**/*.*");
  eleventyConfig.addPassthroughCopy("partenaire.pdf");

  eleventyConfig.setTemplateFormats(["md", "html", "rss", "njk"]);

  eleventyConfig.addTemplateFormats("css");

  eleventyConfig.addPlugin(lightningCSS);

  eleventyConfig.addTemplateFormats("js");
  const { minify } = require("terser");
  eleventyConfig.addExtension("js", {
    outputFileExtension: "js",
    compile: async (inputContent) => {
      return async () => {
        return minify(inputContent).then((result) => result.code);
      };
    },
  });

  eleventyConfig.addTransform("htmlmin", function (content, outputPath) {
    if (outputPath.endsWith(".html")) {
      let minified = htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
      });
      return minified;
    }

    return content;
  });
};
