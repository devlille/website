const htmlmin = require("html-minifier");
const sponsors = require("./data/gold.json");


module.exports = function (eleventyConfig) {
  eleventyConfig.addCollection("gold", function () {
    return require("./data/gold.json");
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
  eleventyConfig.setTemplateFormats(["png", "md", "html", "rss", "njk", "svg", "woff", "woff2"]);

  eleventyConfig.addPassthroughCopy("css/**/*.*");
  eleventyConfig.addPassthroughCopy("sw.js");
  eleventyConfig.addPassthroughCopy("manifest.json");
  eleventyConfig.addPassthroughCopy("*.pdf");
  eleventyConfig.addPassthroughCopy("js/*.*");
  eleventyConfig.addPassthroughCopy("img/*.*");

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
