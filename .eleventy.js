const htmlmin = require("html-minifier");
const sponsors = require("./data/gold.json");


module.exports = function (eleventyConfig) {
  eleventyConfig.addCollection("config", function () {
    return require("./data/config.json");
  });

  eleventyConfig.addCollection("gold", function () {
    return require("./data/gold.json");
  });


  eleventyConfig.addCollection("speakers", function () {
    return require("./data/agenda.json").speakers;
  });

  eleventyConfig.addCollection("talks", function () {
    const config = require("./data/agenda.json")
    const talks = Object.entries(config.talks)
    const oTalks = talks.map(([ _, talks]) => {
      return [_, talks.map(talk => {
        return {
          ...talk,
          speakers: talk.speakers?.map(speaker => config.speakers.find(({ uid }) => uid === speaker)?.displayName).join(', ')
        }
      })]
    })

    return oTalks;
  });
  eleventyConfig.addCollection("silver", function () {
    return require("./data/silver.json");
  });
  eleventyConfig.addCollection("bronze", function () {
    return require("./data/bronze.json");
  });
  eleventyConfig.addCollection("partners", function () {
    return require("./data/partners.json");
  });
  eleventyConfig.setTemplateFormats(["png", "jpeg", "md", "html", "rss", "njk", "svg", "woff", "woff2"]);

  eleventyConfig.addPassthroughCopy("css/**/*.*");
  eleventyConfig.addPassthroughCopy("sw.js");
  eleventyConfig.addPassthroughCopy("manifest.json");
  eleventyConfig.addPassthroughCopy("*.pdf");
  eleventyConfig.addPassthroughCopy("js/*.*");
  eleventyConfig.addPassthroughCopy("img/*.*");
  eleventyConfig.addPassthroughCopy("partenaire.pdf");

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
