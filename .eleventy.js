const htmlmin = require("html-minifier");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const { optimize } = require("svgo");
const config = require("./data/config.json");
const md = require("markdown").markdown;


module.exports = function (eleventyConfig) {
  eleventyConfig.addCollection("faqs", async () => {
    try {
      const data = await fetch(config.cms4partnersApi + config.edition).then((res) => res.json());
      const qanda = data.qanda
        .sort((f1, f2) => f1.order - f2.order)
        .map(q => {
          return {
            ...q,
            response: md.toHTML(q.response.replaceAll("* ", "\r\n\r\n* "))
          }
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
    const isURL = require('isurl');

    try {
      const tempFolder = path.resolve(__dirname, "_site/img");
      const sponsors = await fetch(config.cms4partnersApi + config.edition + "/partners").then((res) => res.json());
      Object.entries(sponsors).forEach(([pack, partners]) => {
        sponsors[pack] = partners.sort((p1, p2) => {
          return p1.name.toLowerCase().localeCompare(p2.name.toLowerCase());
        });
      });

      Object.values(sponsors).forEach((pack) => {
        const sponsorsByPack = Object.values(pack);
        sponsorsByPack.forEach((sponsor) => {
          try {
            isURL(new URL(sponsor.site_url))
          } catch(e){
            console.error(`Bad URL for ${sponsor.name}`)
            process.exit(1)
          }
          sponsor.logoName = sponsor.name.toLowerCase().replaceAll(' ', '-');
          if (sponsor.site_url.indexOf("https://") < 0) {
            sponsor.site_url = "https://" + sponsor.site_url;
          }
          sponsor.ext = getExtension(sponsor.logo_url.split(".").pop());
          fetch(sponsor.logo_url)
            .then((response) => response.text())
            .then((blob) => {
              return optimize(blob, {
                multipass: true,
              });
            })
            .then((result) => {
              const optimizedSvgString = result.data;
              
              fs.writeFileSync(tempFolder + "/" + sponsor.logoName + "." + sponsor.ext, optimizedSvgString, { flag: "w" });
            })
            .catch((err) => console.error(err));
        });
      });
      return sponsors;
    } catch (e) {
      return {};
    }
  });

  function getExtension(potentialExt) {
    switch (potentialExt) {
      case "png":
        return "png";
      case "svg":
        return "svg";
      default:
        return "svg";
    }
  }

  eleventyConfig.addCollection("config", function () {
    return config;
  });

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
              speakers: talk?.talk?.speakers?.map((speaker) => speaker?.display_name).join(' &amp; '),
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

  const CleanCSS = require("clean-css");
  eleventyConfig.addExtension("css", {
    outputFileExtension: "css",
    compile: async (inputContent) => {
      return async () => {
        return new Promise((resolve) => {
          new CleanCSS({ inline: ["remote"] }).minify(inputContent, (_, data) => {
            resolve(data.styles);
          });
        });
      };
    },
  });

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
