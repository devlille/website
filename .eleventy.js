const htmlmin = require("html-minifier");
const sponsors = require("./data/sponsors.json");


module.exports = function (eleventyConfig) {
  eleventyConfig.addCollection("gold", function () {
    console.log(sponsors.filter(sponsor => sponsor.type === 'gold'))
    return sponsors.filter(sponsor => sponsor.type === 'gold')
  });
  eleventyConfig.addCollection("silver", function () {
    return sponsors.filter(sponsor => sponsor.type === 'silver')
  });
  eleventyConfig.addCollection("bronze", function () {
    return sponsors.filter(sponsor => sponsor.type === 'bronze')
  });
  eleventyConfig.addCollection("partners", function () {
    return sponsors.filter(sponsor => sponsor.type === 'partners')
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
