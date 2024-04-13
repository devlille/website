const config = require("../data/config.json");
const md = require("markdown").markdown;

const getTalks = async () => {
  try {
    const agenda = await fetch(config.cms4partnersApi + config.edition + "/agenda", {
      headers: {
        Accept: "application/json; version=2",
      },
    }).then((res) => res.json());

    const talksByDay = Object.entries(agenda).reduce((acc, [day, talks]) => {
      return {
        ...acc,
        [day]: Object.entries(talks).map(([_, talks]) => {
          return [
            _,
            talks.map((talk) => {
              return {
                talk: {
                  ...talk,
                  room: talk.room,
                  abstract: md.toHTML(talk?.talk?.abstract ?? "")?.replaceAll("h2", "p"),
                  title: talk?.talk?.title ?? "Pause",
                },
                id: talk?.talk?.speakers[0]?.id,
                speakers: talk?.talk?.speakers?.map((speaker) => speaker?.display_name).join(" &amp; "),
                speakersIds: talk?.talk?.speakers?.map((speaker) => speaker?.id),
              };
            }),
          ];
        }),
      };
    }, {});
    return talksByDay;
  } catch (e) {
    console.log(e);
    return [];
  }
};

exports.createTalksCollections = async () => {
  const talks = await getTalks();
  return talks;
};

exports.createTalksCollectionsBydate = async () => {
  const talks = await getTalks();
  return Object.entries(talks).map(([key, t]) => [
    new Intl.DateTimeFormat("fr", { dateStyle: "long" }).format(new Date(key)),
    t,
  ]);
};
