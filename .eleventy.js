const htmlmin = require("html-minifier");
const fetch = require("node-fetch")
const fs = require("fs");
const path = require("path");
const { optimize } = require('svgo');

module.exports = function (eleventyConfig) {

  eleventyConfig.addCollection("partners", async () => {
    const tempFolder = path.resolve(__dirname, "_site/img")
    const sponsors = await fetch("https://cms4partners-ce427.nw.r.appspot.com/events/vzbfowsExm54SrWLtxA5").then(res => res.json())

    Object.values(sponsors.partners).forEach(pack => {
      const sponsorsByPack = Object.values(pack);
      sponsorsByPack.forEach(sponsor => {
        if(sponsor.site_url.indexOf("https://") < 0){
          sponsor.site_url = "https://" + sponsor.site_url;
        }
        fetch(sponsor.logo_url)
            .then(response => response.text())
            .then(blob => {
              return optimize(blob, {
                multipass: true,
              })
            })
            .then(result => {
              const optimizedSvgString = result.data;
              fs.writeFileSync(tempFolder + "/" + sponsor.name +".svg", optimizedSvgString, { flag: 'w' })
            })
            .catch(err => console.error(err))
      })
    })

    return {
      ...sponsors.partners,
      partners: [
        {
          site_url: "https://www.epitech.eu/",
          "name": "Epitech"
        },
        {
          site_url: "https://www.sciences-u-lille.fr/",
          "name": "Sciences-U Campus Lile",
          "image": "SciencesU.png"
        }
      ]
    };
  });

  eleventyConfig.addCollection("config", function () {
    return require("./data/config.json");
  });

  eleventyConfig.addCollection("speakers", function () {
    return require("./data/agenda.json").speakers;
  });

  eleventyConfig.addCollection("talks", function () {
    const config = require("./data/agenda.json")
    const talks = Object.entries(config.talks)
    const oTalks = talks.map(([_, talks]) => {
      return [_, talks.map(talk => {
        return {
          ...talk,
          speakers: talk.speakers?.map(speaker => config.speakers.find(({uid}) => uid === speaker)?.displayName).join(', ')
        }
      })]
    })

    return oTalks;
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
