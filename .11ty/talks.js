const config = require("../data/config.json");
const md = require("markdown").markdown;

const getTalks = async () => {
  try {
    const agenda = await fetch(config.cms4partnersApi + config.edition + "/planning", {
      headers: {
        Accept: "application/json; version=2",
      },
    }).then((res) => res.json());

    const talksByDay = Object.entries(agenda).reduce((acc, [day, talks]) => {
      return {
        ...acc,
        [day]: Object.entries(talks).map(([_, slots]) => {
          return [
            _,
            slots.map((slot) => {
              let id = slot?.info?.id ?? slot?.talk?.speakers[0]?.id;
              let speakers = slot?.talk?.speakers?.map((speaker) => speaker?.display_name).join(" &amp; ");
              if (slot.type === "event-session" && !slot.info.description) {
                id = undefined;
              }
              if (slot.type === "event-session" && !!slot.info.description) {
                speakers = "Devfest Lille";
              }
              return {
                talk: {
                  ...slot,
                  abstract: md.toHTML(slot?.info?.description ?? slot?.talk?.abstract ?? "")?.replaceAll("h2", "p"),
                  title: slot?.info?.title ?? slot?.talk?.title ?? "Pause",
                },
                id,
                speakers,
                speakersIds: slot?.info?.id ? [slot?.info?.id] : slot?.talk?.speakers?.map((speaker) => speaker?.id),
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

exports.createFlatTalksCollections = async () => {
  const talks = await getTalks();
  const flat = Object.values(talks)
    .flat()
    .map(([hour, talksArray]) => {
      return talksArray.map((t) => t.talk);
    })
    .flat();

  return flat;
};

exports.createTalksCollectionsBydate = async () => {
  const talks = await getTalks();
  return Object.entries(talks).map(([key, t]) => [
    new Intl.DateTimeFormat("fr", { dateStyle: "long" }).format(new Date(key)),
    t,
  ]);
};
