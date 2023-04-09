class SpeakerPage {
    eleventyComputed = {
        title: data => console.log(data)
    }
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
                }
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
        
        return `
<div class="page-body list">
    <h2>${selectedTalk.speakers}</h2>

    <div class="speaker-sheet">
        <div class="speaker">
            ${
                speakers.map(speaker => `
                <p><strong class="stressed">${speaker.display_name} ${speaker.pronouns ? `(${speaker.pronouns})` : ''}</strong>, ${speaker.company}, ${speaker.bio}</p>
                `)
            }
        </div>

        <div class="speaker-data-block">
            ${

                speakers.map(speaker => `
                <div class="speaker-data">
                <p class="s-photo"><img loading="lazy" src="${speaker.photo_url}" alt="Photo de ${speaker.display_name}" /></p>

                <ul class="social">
                    ${!!speaker.mastodon ? (`<li>
                        <strong class="stressed">Sur Mastodon</strong> 
                        <a target="_blank" href="#">${speaker.mastodon}</a>
                    </li>`): ''}
                    ${!!speaker.twitter ? (`<li>
                        <strong class="stressed">Sur Twitter</strong>
                        <a target="_blank" href="${speaker.twitter}">${speaker.twitter?.replace('https://twitter.com/', '@')}</a>
                    </li>`): ''}
                    ${!!speaker.github ? (`<li>
                        <strong class="stressed">Sur Github</strong> 
                        <a target="_blank" href="${speaker.twitter}">${speaker.github?.replace('https://github.com/', '')}</a>
                    </li>`): ''}
                    ${!!speaker.linkedin ? (`<li>
                        <strong class="stressed">Sur LinkedIn</strong> 
                        <a target="_blank" href="${speaker.linkedin}">${speaker.linkedin?.replace('https://linkedin.com/in/', '')}</a>
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