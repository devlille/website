const displayDescription = (partner) => {
  if (!partner.description) {
    return "";
  }
  return `<div class="talk"><p>${
    partner.description?.replaceAll('"', "")?.trim() ?? ""
  }</p></div>`;
};
const displaySocialMedias = (partner) => {
  return `
    <div class="talk">
        <h3>Sur Internet</h3>
        <ul>
            ${
              !!partner.twitterAccount
                ? `<li>
                <strong class="stressed">Sur Twitter: </strong>
                <a target="_blank" href="${
                  partner.twitterAccount
                }">${partner.twitterAccount?.replace(
                    "https://twitter.com/",
                    ""
                  )}</a>
            </li>`
                : ""
            }
            ${
              !!partner.linkedinAccount
                ? `<li>
                <strong class="stressed">Sur LinkedIn: </strong> 
                <a target="_blank" href="${
                  partner.linkedinAccount
                }">${decodeURI(partner.linkedinAccount)
                    ?.replace("https://www.linkedin.com/in/", "")
                    ?.replace("https://www.linkedin.com/company/", "")
                    .replace("/", "")}</a>
            </li>`
                : ""
            }
            ${
              !!partner.siteUrl
                ? `<li>
                <strong class="stressed">Site Web: </strong> 
                <a target="_blank" href="${partner.siteUrl}">${partner.siteUrl}</a>
            </li>`
                : ""
            }
        </ul>
        </div>
    `;
};

const displaySocialMediasMessages = (partner) => {
  return `
    ${
      partner.twitter_message
        ? `<div class="talk"><h3>Message sur Twitter </h3><p>${partner.twitter_message}</p></div>`
        : ""
    }

      ${
        partner.linkedin_message
          ? `<div class="talk"><h3>Message sur LinkedIn </h3><p>${partner.linkedin_message}</p></div>`
          : ""
      }
    `;
};

const displayWLDOffers = (partner) => {
  return partner.jobs?.length > 0
    ? `<div class="talk"><h3>Offres sur WeLoveDevs </h3><p>
<ul>${partner.jobs
        .map((job) => `<li><a href="${job.url}">${job.title}</a></li>`)
        .join("")}</ul>

</p></div>`
    : "";
};
export default class SponsorPage {
  data(s) {
    return {
      layout: "layout.html",
      currSection: "partners",
      pagination: {
        data: "collections.partners",
        size: 1,
        alias: "partner",
        resolve: "values",
        before: function (paginationData) {
          return paginationData.reduce((acc, data) => [...acc, ...data], []);
        },
      },
      permalink: (ctx) => {
        return `partner-${ctx.partner.id}/`;
      },
      eleventyComputed: {
        title: (ctx) => {
          return ctx.partner.name;
        },
        ogUrl: (ctx) => {
          return "https://devlille.fr/partner-" + ctx.partner.id;
        },
        ogTitle: (ctx) => {
          return ctx.partner.name;
        },
        ogDescription: (ctx) => {
          return ctx.partner.description?.replaceAll('"', "")?.trim();
        },
        ogImage: (ctx) => {
          return `https://devlille.fr/img/${ctx.partner.logoName}.${ctx.partner.ext}`;
        },
      },
    };
  }
  render({ partner }) {
    if (!partner) {
      return null;
    }

    return `
<div class="page-body list">
    <h2>${partner.name}</h2>

    <div class="speaker-sheet">
        
          <div class="speaker">
          ${displayDescription(partner)}
          ${displaySocialMedias(partner)}  
          ${displayWLDOffers(partner)}
        </div>
          

        <div class="speaker-data-block">
        <div class="speaker-data">
        <p class="sponsor"><a href="${
          partner.siteUrl
        }"><img loading="lazy" src="/img/${partner.logoName}.${
      partner.ext
    }"" alt="Logo de ${partner.name}" /></a></p>

        
    </div>
            
    
        </div>
        
    </div>
</div>
`;
  }
}
