const htmlmin = require("html-minifier");
const fetch = require("node-fetch");
const config = require("./data/config.json");
const md = require("markdown").markdown;
const lightningCSS = require("@11tyrocks/eleventy-plugin-lightningcss");
const { getExtensionFromLogoUrl, fetchImage } = require("./.11ty/image");
const { createTalksCollections, createTalksCollectionsBydate, createFlatTalksCollections } = require("./.11ty/talks");
module.exports = function (eleventyConfig) {
  // eleventyConfig.addCollection("talks", createTalksCollections);
  // eleventyConfig.addCollection("flatTalks", createFlatTalksCollections);
  // eleventyConfig.addCollection("talksByDate", createTalksCollectionsBydate);

  eleventyConfig.addCollection("faqs", async () => {
    try {
      console.log(config.cms4partnersApi + 2024)
      const data = await fetch(config.cms4partnersApi + 2024 + "").then((res) => res.json());
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
      console.log(e)
      return [];
    }
  });
  // eleventyConfig.addCollection("speakersFromApi", async () => {
  //   try {
  //     const speakers = await fetch(config.cms4partnersApi + config.edition + "/speakers").then((res) => res.json());
  //     speakers.push({
  //       id: "PNfgaI0tdHlKyoH5CfX8",
  //       display_name: "DevLille",
  //       pronouns: null,
  //       job_title: null,
  //       website: "https://devfest.gdglille.org/",
  //       twitter: "https://twitter.com/DevfestLille",
  //       mastodon: null,
  //       github: null,
  //       linkedin: null,
  //     });
  //     return speakers.sort((s1, s2) => s1.display_name.localeCompare(s2.display_name));
  //   } catch (e) {
  //     return [];
  //   }
  // });

  eleventyConfig.addCollection("partners", async () => {
    return {}

    /*
    const isURL = require("isurl");

  //   try {
  //     const sponsors = await fetch(
  //       "https://us-central1-cms4partners-ce427.cloudfunctions.net/cms-getAllPublicSponsors"
  //     ).then((res) => res.json());
  //     const sponsorsByPacks = sponsors.reduce((acc, sponsor) => {
  //       if (sponsor.twitterAccount) {
  //         let twitterAccount = sponsor.twitterAccount;
  //         twitterAccount = twitterAccount.startsWith("https://twitter.com/")
  //           ? twitterAccount
  //           : `https://twitter.com/${twitterAccount}`;
  //         sponsor.twitterAccount = twitterAccount;
  //       }
  //       if (sponsor.linkedinAccount) {
  //         let linkedinAccount = sponsor.linkedinAccount;
  //         linkedinAccount = linkedinAccount.includes("linkedin.com/company/")
  //           ? linkedinAccount
  //           : `https://linkedin.com/company/${linkedinAccount}`;
  //         sponsor.linkedinAccount = linkedinAccount;
  //       }
  //       return {
  //         ...acc,
  //         [sponsor.sponsoring.toLowerCase()]: [...(acc[sponsor.sponsoring.toLowerCase()] ?? []), sponsor],
  //       };
  //     }, {});

  //     Object.entries(sponsorsByPacks).forEach(([pack, partners]) => {
  //       sponsors[pack] = partners.sort((p1, p2) => {
  //         return p1.name.toLowerCase().localeCompare(p2.name.toLowerCase());
  //       });
  //     });

  //     Object.values(sponsorsByPacks).forEach((pack) => {
  //       const sponsorsByPack = Object.values(pack);
  //       sponsorsByPack.forEach((sponsor) => {
  //         try {
  //           if (sponsor.siteUrl.indexOf("https://") < 0) {
  //             sponsor.siteUrl = "https://" + sponsor.siteUrl;
  //           }

  //           isURL(new URL(sponsor.siteUrl));
  //         } catch (e) {
  //           console.error(`Bad URL for ${sponsor.name}`);
  //           process.exit(1);
  //         }
  //         sponsor.logoName = sponsor.name.toLowerCase().replaceAll(" ", "-");

          sponsor.ext = getExtensionFromLogoUrl(sponsor.logoUrl);
          fetchImage(sponsor);
        });
      });
      return sponsorsByPacks;
    } catch (e) {
      console.log(e);
      return {};
    }*/
  });

  eleventyConfig.addCollection("config", () => config);

  eleventyConfig.addPassthroughCopy("css/*.ttf");
  // eleventyConfig.addPassthroughCopy("css/*.woff");
  // eleventyConfig.addPassthroughCopy("css/*.woff2");
  eleventyConfig.addPassthroughCopy("manifest.json");
  eleventyConfig.addPassthroughCopy("img/**/*.*");
  // eleventyConfig.addPassthroughCopy("partenaire.pdf");

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

  // eleventyConfig.addTransform("htmlmin", function (content, outputPath) {
  //   if (outputPath.endsWith(".html")) {
  //     let minified = htmlmin.minify(content, {
  //       useShortDoctype: true,
  //       removeComments: true,
  //       collapseWhitespace: true,
  //     });
  //     return minified;
  //   }

  //   return content;
  // });
};
