const htmlmin = require("html-minifier");
const fetch = require("node-fetch")
const fs = require("fs");
const path = require("path");
const { optimize } = require('svgo');
const config = require("./data/config.json");
const md = require( "markdown" ).markdown;

module.exports = function (eleventyConfig) {
  eleventyConfig.addCollection("speakersFromApi", async () => {
    try {
      const speakers = await fetch("https://cms4partners-ce427.nw.r.appspot.com/events/" + config.edition + "/speakers").then(res => res.json())
      console.log(speakers)
      return speakers.sort((s1, s2) => s1.display_name.localeCompare(s2.display_name))
    } catch(e){
      return [{}];
    }

  });

  eleventyConfig.addCollection("partners", async () => {
    try {
      const tempFolder = path.resolve(__dirname, "_site/img")
      const sponsors = await fetch("https://cms4partners-ce427.nw.r.appspot.com/events/" + config.edition).then(res => res.json())

      Object.entries(sponsors.partners).forEach(([pack, partners]) => {
        sponsors.partners[pack] = partners.sort((p1, p2) => {
          return p1.name.toLowerCase().localeCompare(p2.name.toLowerCase())
        })
      })

      Object.values(sponsors.partners).forEach(pack => {
        const sponsorsByPack = Object.values(pack);
        sponsorsByPack.forEach(sponsor => {
          if(sponsor.site_url.indexOf("https://") < 0){
            sponsor.site_url = "https://" + sponsor.site_url;
          }
          sponsor.ext = getExtension(sponsor.logo_url.split(".").pop())
          fetch(sponsor.logo_url)
              .then(response => response.text())
              .then(blob => {
                return optimize(blob, {
                  multipass: true,
                })
              })
              .then(result => {
                const optimizedSvgString = result.data;
                fs.writeFileSync(tempFolder + "/" + sponsor.name + "." + sponsor.ext, optimizedSvgString, { flag: 'w' })
              })
              .catch(err => console.error(err))
        })
      })

      return sponsors.partners;
    } catch(e){
      return {}
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
      const agendaPromise = await fetch("https://cms4partners-ce427.nw.r.appspot.com/events/" + config.edition + "/agenda")
      const agenda = await agendaPromise.then(res => res.json())
      const talks = Object.entries(agenda.talks)
      const oTalks = talks.map(([_, talks]) => {
        return [_, talks.map(talk => {
          return {
            talk: {
              ...talk.talk,
              room: talk.room,
              abstract: md.toHTML(talk.talk?.abstract ?? "").replace("h2", "p"),
              title: talk.talk?.title ?? "Pause",
            },
            speakers: talk?.talk?.speakers?.map(speaker => speaker.display_name).join(', ')
          }
        })]
      })
      return oTalks;
    } catch(e){
      return []
    }

  });


  eleventyConfig.addPassthroughCopy("css/*.ttf");
  eleventyConfig.addPassthroughCopy("css/*.woff");
  eleventyConfig.addPassthroughCopy("css/*.woff2");
  eleventyConfig.addPassthroughCopy("manifest.json");
  eleventyConfig.addPassthroughCopy("img/*.*");
  eleventyConfig.addPassthroughCopy("partenaire.pdf");

  eleventyConfig.setTemplateFormats(["md", "html", "rss", "njk"]);

  eleventyConfig.addTemplateFormats("css");

  const CleanCSS = require("clean-css");
  eleventyConfig.addExtension("css", {
    outputFileExtension: "css",
    compile: async (inputContent) => {
      return async () => {
        return new Promise(resolve => {
          new CleanCSS({ inline: ['remote'] }).minify(inputContent, (_, data) => {
            resolve(data.styles)
          });
        });
      };
    }
  });

  eleventyConfig.addTemplateFormats("js");
  const { minify } = require("terser");
  eleventyConfig.addExtension("js", {
    outputFileExtension: "js",
    compile: async (inputContent) => {
      return async () => {
        return minify(inputContent).then(result => result.code);
      };
    }
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
