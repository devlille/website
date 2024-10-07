import {
  displaySpeakers,
  displaySpeakerSocialBlock,
} from "./utils/speakers.js";

export default class SpeakerPage {
  data() {
    return {
      layout: "layout.html",
      currSection: "speakers",
      pagination: {
        data: "collections.speakersFromApi",
        size: 1,
        alias: "speaker",
      },
      permalink: (ctx) => {
        return `speaker-page-${ctx.speaker.id}/`;
      },
      eleventyComputed: {
        title: (ctx) => {
          return ctx.speaker.display_name;
        },
        ogUrl: (ctx) => {
          return "https://devfest.gdglille.org/speaker-page-" + ctx.speaker.id;
        },
        ogTitle: (ctx) => {
          return ctx.speaker.display_name;
        },
        ogDescription: (ctx) => {
          return ctx.speaker.bio?.replaceAll('"', "");
        },
        ogImage: (ctx) => {
          return ctx.speaker.photo_url;
        },
      },
    };
  }
  render(data) {
    const speaker = data.collections.speakersFromApi.find(
      (s) => s.id === data.speaker.id
    );

    let talks = Object.values(data.collections.talks)
      .flat()
      .map(([_, talks]) => talks ?? [])
      .reduce((acc, talks) => [...acc, ...talks], []);

    const selectedTalks = talks.filter(
      (talk) => talk.speakersIds?.indexOf(data.speaker.id) >= 0
    );
    if (selectedTalks.length === 0) {
      return null;
    }

    return `
<div class="page-body list">
    <h2>${speaker.display_name}${
      speaker.pronouns ? ` (${speaker.pronouns})` : ""
    }</h2>

    <div class="speaker-sheet">
        <div class="speaker">
            ${displaySpeakers(speaker)}
        </div>

        ${displaySpeakerSocialBlock(speaker)}
        <div class="talks">
        ${selectedTalks
          .map((selectedTalk) => {
            return `
                <div class="talk">
            <h3>${selectedTalk.talk?.title}</h3>
            <p>${selectedTalk.talk?.abstract}</p>

            ${
              !!selectedTalk.talk?.talk?.open_feedback
                ? `
            <p class="openfeedback">
                Suite à la conférence, vous pouvez faire un retour aux conférenciers et 
                conférencières sur 
                <a href="${selectedTalk.talk?.talk?.open_feedback}" target="_blank">OpenFeedback</a>
            </p>
            `
                : ""
            }

            

            ${
              !!selectedTalk.talk?.talk?.link_slides ||
              !!selectedTalk.talk?.talk?.link_replay
                ? `
            <div class="talk-links">
                <h4>Regardez ou re-regardez</h4>
                <ul>
                    ${
                      !!selectedTalk.talk?.talk?.link_replay
                        ? `<li><a href="${selectedTalk.talk?.talk?.link_replay}">La vidéo du talk</a></li>`
                        : ""
                    }
                    ${
                      !!selectedTalk.talk?.talk?.link_slides
                        ? `<li><a href="${selectedTalk.talk?.talk?.link_slides}">Les slides du talk</a></li>`
                        : ""
                    }
                </ul>
            </div>
            `
                : ""
            }
            
        </div>
                `;
          })
          .join("")}
        </div>
    </div>
</div>
`;
  }
}
