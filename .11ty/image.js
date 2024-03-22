const fs = require("fs");
const path = require("path");
const { optimize } = require("svgo");

const tempFolder = path.resolve(__dirname, "../_site/img");

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

const fetchImage = ({ ext, logoName, logoUrl }) => {
  console.log(logoUrl, logoName);
  return fetch(logoUrl)
    .then((response) => response.text())
    .then(optimize)
    .then(({ data }) => {
      fs.writeFileSync(`${tempFolder}/${logoName}.${ext}`, data, {
        flag: "w",
      });
    })
    .catch(console.error);
};

const getExtensionFromLogoUrl = (logoUrl) => {
  return getExtension(logoUrl.split(".").pop());
};

module.exports = { getExtensionFromLogoUrl, fetchImage };
