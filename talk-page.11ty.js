export default class Page {
  data() {
    return {
      layout: "layout.html",
      currSection: "talks",
      pagination: {
        data: "collections.flatTalks",
        size: 1,
        alias: "talk",
      },
      permalink: (ctx) => {
        return `talk-page-${ctx.talk.id}/`;
      },
      eleventyComputed: {
        title: (ctx) => {
          return ctx.talk.title;
        },
        ogUrl: (ctx) => {
          return "https://devlille.fr/talk-page-" + ctx.talk.id;
        },
        ogTitle: (ctx) => {
          return ctx.talk.title;
        },
        ogDescription: (ctx) => {
          return ctx.talk.title.replaceAll('"', "");
        },
      },
    };
  }
  render({ talk }) {
    if (!talk.talk && !talk.info) {
      return null;
    }
    talk.talk = talk.talk ?? talk.info;
    const speakers = talk.talk.speakers;
    const selectedTalks = [];
    return `
<div class="page-body list">
    <h2>${talk.title}</h2>

    <div class="speaker-sheet">
        <div class="speaker">
            ${talk.abstract}
        </div>
        <div class="speaker-data-block"></div>

        ${
          talk.type === "event-session"
            ? ""
            : `<div class="talks">
        <div class="talk">
        
        
        ${
          !!talk?.talk?.open_feedback
            ? `
        <p>
            Suite à la conférence, vous pouvez faire un retour aux conférenciers et 
            conférencières sur 
            <a href="${talk?.talk?.open_feedback}" target="_blank">OpenFeedback</a>
        </p>
        `
            : ""
        }

        

        ${
          !!talk?.talk?.link_slides || !!talk?.talk?.link_replay
            ? `
        <div class="talk-links">
            <h4>Regardez ou re-regardez</h4>
            <ul>
                ${
                  !!talk?.talk?.link_replay
                    ? `<li><a href="${talk?.talk?.link_replay}">La vidéo du talk</a></li>`
                    : ""
                }
                ${
                  !!talk?.talk?.link_slides
                    ? `<li><a href="${talk?.talk?.link_slides}">Les slides du talk</a></li>`
                    : ""
                }
            </ul>
        </div>
        `
            : ""
        }
        
    </div>
        ${
          speakers?.map((s) => {
            return `
                <div class="talk">
            <h3>${s.display_name}</h3>
            <p>${s.bio?.replaceAll('"', "")}</p>
            <p><a href="/speaker-page-${s.id}">Page dédiée de ${
              s.display_name
            }</a></p>
            </div>
            `;
          }) ?? ""
        }
        </div>`
        }
        
    </div>
</div>
`;
  }
}
