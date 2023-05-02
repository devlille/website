const md = require("markdown").markdown;

const displaySpeakers = speakers => {
    let result = "";
    speakers.forEach(speaker => 
        result += `<p>
        <strong class="stressed">${speaker.display_name}${speaker.pronouns ? ` (${speaker.pronouns}),` : ','}</strong> 
        ${!!speaker.company ? (speaker.company) : ''} 
    </p>
    ${md.toHTML(speaker.bio.replaceAll('- ', '\r\n\r\n- '))}
    `)
    return result;
}
class SpeakerPage {
    data() {

        return {
            layout: "layout.html",
            currSection: "speakers",
            pagination: {
                data: "collections.speakersFromApi",
                size: 1,
                alias: 'speaker'
            },
            permalink: (ctx) => {
                return `speaker-page-${ ctx.speaker.id }/`
            },
            eleventyComputed: {
                title: (ctx) => {
                    return ctx.speaker.display_name
                },
                ogUrl: (ctx) => {
                    return "https://devfest.gdglille.org/speaker-page-" + ctx.speaker.id
                },
                ogTitle: (ctx) => {
                    return ctx.speaker.display_name
                },
                ogDescription: (ctx) => {
                    return ctx.speaker.bio
                },
                ogImage: (ctx) => {
                    return ctx.speaker.photo_url
                },

            }
        }
    }
    render(data){
        let talks = []
        for(let slot of data.collections.talks){    
            talks = [...talks, ...(slot[1] ?? [])]
        }

        const selectedTalk = talks.find(talk => talk.speakersIds?.indexOf(data.speaker.id) >= 0);
        if(!selectedTalk){
            return null;
        }
        const speakers = data.collections.speakersFromApi.filter(s => selectedTalk.speakersIds.indexOf(s.id) >= 0);
 
        const jsonld = {
            "description": selectedTalk.talk.abstract,
            "name": selectedTalk.talk.title,
            "startDate": selectedTalk.talk.startTime,
            "endDate": selectedTalk.talk.endTime,
            "inLanguage": "fr",
            "keywords": selectedTalk.talk?.talk?.category,
            "location": selectedTalk.talk.room,
            "maximumPhysicalAttendeeCapacity": selectedTalk.talk.room === 'Grand Théâtre' ? 1000 : 450,
            "performer": {
              "@type": "Person",
              "image": speakers[0].photo_url,
              "name": speakers[0].display_name,
              "jobTitle": speakers[0].job_title ?? "",
              "gender": speakers[0].pronouns ?? "",
              "workFor": {
                      "@type": "Organization",
                      "name": speakers[0].company ?? ""
                  }
            }
            
          }
        return `
        <script type="application/ld+json">${JSON.stringify(jsonld)}</script>
        <meta name="twitter:card" content="summary">
        <meta name="twitter:site" content="@DevfestLille">
        <meta name="twitter:creator" content="@DevfestLille">
        <meta name="twitter:title" content="${selectedTalk.talk?.title?.replaceAll("\"", "")}">
        <meta name="twitter:description" content="${selectedTalk.talk?.abstract?.replaceAll("\"", "")}">
        <meta name="twitter:image" content="${speakers[0].photo_url}">
<div class="page-body list">
    <h2>${selectedTalk.speakers}</h2>

    <div class="speaker-sheet">
        <div class="speaker">
            ${displaySpeakers(speakers)}
        </div>

        <div class="speaker-data-block">
            ${

                speakers.map(speaker => `
                <div class="speaker-data">
                <p class="s-photo"><img loading="lazy" src="${speaker.photo_url}" alt="Photo de ${speaker.display_name}" /></p>

                <ul class="social">
                    ${!!speaker.mastodon ? (`<li>
                        <strong class="stressed">Sur Mastodon</strong> 
                        <a target="_blank" href="${speaker.mastodon}">${speaker.mastodon.substring(speaker.mastodon.lastIndexOf("/") + 1)}</a>
                    </li>`): ''}
                    ${!!speaker.twitter ? (`<li>
                        <strong class="stressed">Sur Twitter</strong>
                        <a target="_blank" href="${speaker.twitter}">${speaker.twitter?.replace('https://twitter.com/', '')}</a>
                    </li>`): ''}
                    ${!!speaker.github ? (`<li>
                        <strong class="stressed">Sur Github</strong> 
                        <a target="_blank" href="${speaker.github}">${speaker.github?.replace('https://github.com/', '')}</a>
                    </li>`): ''}
                    ${!!speaker.linkedin ? (`<li>
                        <strong class="stressed">Sur LinkedIn</strong> 
                        <a target="_blank" href="${speaker.linkedin}">${decodeURI(speaker.linkedin)?.replace('https://www.linkedin.com/in/', '').replace('/', '')}</a>
                    </li>`): ''}
                    ${!!speaker.website ? (`<li>
                        <strong class="stressed">Site Web</strong> 
                        <a target="_blank" href="${speaker.website}">${speaker.website}</a>
                    </li>` ): ''}
                </ul>
            </div>
                `)
            }
            
            
        </div>

        <div id="talk" class="talk">
            <h3>${selectedTalk.talk?.title}</h3>
            <p>${selectedTalk.talk?.abstract}</p>

            ${!!selectedTalk.talk?.talk?.open_feedback ? `
            <p class="openfeedback">
                Suite à la conférence, vous pouvez faire un retour aux conférenciers et 
                conférencières sur 
                <a href="${selectedTalk.talk?.talk?.open_feedback}" target="_blank">OpenFeedback</a>
            </p>
            ` : ''}

            

            ${(!!selectedTalk.talk?.talk?.link_slides || !!selectedTalk.talk?.talk?.link_replay) ? (`
            <div class="talk-links">
                <h4>Regardez ou re-regardez</h4>
                <ul>
                    ${!!selectedTalk.talk?.talk?.link_replay ? `<li><a href="${selectedTalk.talk?.talk?.link_replay}">La vidéo du talk</a></li>` : ''}
                    ${!!selectedTalk.talk?.talk?.link_slides ? `<li><a href="${selectedTalk.talk?.talk?.link_slides}">Les slides du talk</a></li>` : ''}
                </ul>
            </div>
            `) : ''}
            
        </div>
    </div>
</div>
`
    }
}
module.exports = SpeakerPage