import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { optimize } from "svgo";

const tempFolder = resolve(import.meta.dirname, "../_site/img");

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

export const fetchImage = ({ ext, logoName, logoUrl }) => {
  return fetch(logoUrl)
    .then((response) => response.text())
    .then((blob) => {
      let data = blob;
      try {
        data = optimize(blob)?.data;
      } catch (e) {
        console.error(e);
      }

      writeFileSync(`${tempFolder}/${logoName}.${ext}`, data, {
        flag: "w",
      });
    })
    .catch(console.error);
};

export const getExtensionFromLogoUrl = (logoUrl) => {
  return getExtension(logoUrl.split(".").pop());
};
