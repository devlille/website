import { markdown as md } from "markdown";

export const displaySpeakers = (speaker) => {
  return `<p>
  <strong class="stressed">${speaker.display_name}${
    speaker.pronouns ? ` (${speaker.pronouns})` : ""
  }</strong>
  ${speaker.company ? ", " : ""}
  ${speaker.company ? speaker.company : ""} 
</p>
${speaker.bio ? md.toHTML(speaker.bio.replaceAll("- ", "\r\n\r\n- ")) : ""}
`;
};

export const displaySpeakerSocialBlock = (speaker) => {
  return `
<div class="speaker-data-block">
    <div class="speaker-data">
    ${
      speaker.photo_url
        ? `<p class="s-photo">
          <img loading="lazy" src="${speaker.photo_url}" alt="Photo de ${speaker.display_name}" />
        </p>`
        : ""
    }
    <ul class="social">
        ${
          speaker.mastodon
            ? `<li>
            <strong class="stressed">Sur Mastodon</strong> 
            <a target="_blank" href="${
              speaker.mastodon
            }">${speaker.mastodon.substring(
                speaker.mastodon.lastIndexOf("/") + 1
              )}</a>
        </li>`
            : ""
        }
        ${
          speaker.twitter
            ? `<li>
            <strong class="stressed">Sur Twitter</strong>
            <a target="_blank" href="${
              speaker.twitter
            }">${speaker.twitter?.replace("https://twitter.com/", "")}</a>
        </li>`
            : ""
        }
        ${
          speaker.github
            ? `<li>
            <strong class="stressed">Sur Github</strong> 
            <a target="_blank" href="${
              speaker.github
            }">${speaker.github?.replace("https://github.com/", "")}</a>
        </li>`
            : ""
        }
        ${
          speaker.linkedin
            ? `<li>
            <strong class="stressed">Sur LinkedIn</strong> 
            <a target="_blank" href="${speaker.linkedin}">${decodeURI(
                speaker.linkedin
              )
                ?.replace("https://www.linkedin.com/in/", "")
                .replace("/", "")}</a>
        </li>`
            : ""
        }
        ${
          speaker.website
            ? `<li>
            <strong class="stressed">Site Web</strong> 
            <a target="_blank" href="${speaker.website}">${speaker.website}</a>
        </li>`
            : ""
        }
    </ul>
</div>
    

</div>
`;
};

export const displayTalk = () => {};
