import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import { markdown as md } from "markdown";

dayjs.extend(duration);

const getTalks = async () => {
  try {
    const agenda = await fetch(
      "https://confily-486924521070.europe-west1.run.app/events/devfest-lille-2024/planning",
      {
        headers: {
          Accept: "application/json; version=2",
        },
      }
    ).then((res) => res.json());

    const talksByDay = Object.entries(agenda).reduce((acc, [day, talks]) => {
      return {
        ...acc,
        [day]: Object.entries(talks).map(([_, slots]) => {
          return [
            _,
            slots.map((slot) => {
              let id = slot?.info?.id ?? slot?.talk?.speakers[0]?.id;
              let speakers = slot?.talk?.speakers
                ?.map((speaker) => speaker?.display_name)
                .join(" &amp; ");
              if (slot.type === "event-session" && !slot.info.description) {
                id = undefined;
              }
              if (slot.type === "event-session" && !!slot.info.description) {
                speakers = "DevLille";
              }
              return {
                talk: {
                  ...slot,
                  abstract: md
                    .toHTML(
                      slot?.info?.description ?? slot?.talk?.abstract ?? ""
                    )
                    ?.replaceAll("h2", "p"),
                  title: slot?.info?.title ?? slot?.talk?.title ?? "Pause",
                  duration: `${dayjs
                    .duration(
                      dayjs(new Date(slot.endTime)).diff(
                        dayjs(new Date(slot.startTime))
                      )
                    )
                    .asMinutes()} mn`,
                },
                id,
                speakers,
                speakersIds: slot?.info?.id
                  ? [slot?.info?.id]
                  : slot?.talk?.speakers?.map((speaker) => speaker?.id),
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

export const createTalksCollections = async () => {
  const talks = await getTalks();
  return talks;
};

export const createFlatTalksCollections = async () => {
  const talks = await getTalks();
  const flat = Object.values(talks)
    .flat()
    .map(([, talksArray]: any) => {
      return talksArray.map((t: any) => t.talk);
    })
    .flat();

  return flat;
};

export const createTalksCollectionsBydate = async () => {
  const talks = await getTalks();
  return Object.entries(talks).map(([key, t]) => [
    new Intl.DateTimeFormat("fr", { dateStyle: "long" }).format(new Date(key)),
    t,
  ]);
};
