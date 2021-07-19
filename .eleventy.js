const htmlmin = require("html-minifier");


module.exports = function (eleventyConfig) {
  
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
