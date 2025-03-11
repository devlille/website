import lightningCSS from "@11tyrocks/eleventy-plugin-lightningcss";
import { minify } from "terser";
import config from "./data/config.js";
import press from "./data/press.js";
import editions from "./data/edition.js";

export default function (eleventyConfig) {
  // eleventyConfig.addCollection("talks", createTalksCollections);
  // eleventyConfig.addCollection("flatTalks", createFlatTalksCollections);
  // eleventyConfig.addCollection("talksByDate", createTalksCollectionsBydate);
  eleventyConfig.addCollection("press", async () => {
    return Object.entries(press)
      .sort(([year], [year2]) => year2 - year)
      .map(([year, articles]) => {
        return {
          year: year,
          articles: articles,
        };
      });
  });

  eleventyConfig.addCollection("editions", async () => {
    return editions;
  });

  // eleventyConfig.addCollection("speakersFromApi", async () => {
  //   try {
  //     const speakers = await fetch(config.cms4partnersApi + config.edition + "/speakers").then((res) => res.json());
  //     speakers.push({
  //       id: "PNfgaI0tdHlKyoH5CfX8",
  //       display_name: "DevLille",
  //       pronouns: null,
  //       job_title: null,
  //       website: "https://devlille.fr/",
  //       twitter: "https://twitter.com/DevLille",
  //       mastodon: null,
  //       github: null,
  //       linkedin: null,
  //     });
  //     return speakers.sort((s1, s2) => s1.display_name.localeCompare(s2.display_name));
  //   } catch (e) {
  //     return [];
  //   }
  // });
∏
  eleventyConfig.addCollection("config", () => config);

  eleventyConfig.addPassthroughCopy("css/*.ttf");
  eleventyConfig.addPassthroughCopy("youtube/*");
  // eleventyConfig.addPassthroughCopy("css/*.woff");
  // eleventyConfig.addPassthroughCopy("css/*.woff2");
  eleventyConfig.addPassthroughCopy("manifest.json");
  eleventyConfig.addPassthroughCopy("img/**/*.*");
  // eleventyConfig.addPassthroughCopy("partenaire.pdf");

  eleventyConfig.setTemplateFormats(["md", "html", "rss", "njk"]);

  eleventyConfig.addTemplateFormats("css");

  eleventyConfig.addPlugin(lightningCSS);

  eleventyConfig.addTemplateFormats("js");
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
}
