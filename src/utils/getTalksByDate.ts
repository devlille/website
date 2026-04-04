import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import { marked } from "marked";

dayjs.extend(duration);

const getTalks = async () => {
  try {
    const agenda = await fetch(
      "https://app-e675e675-2e47-445c-a7a7-359a37188469.cleverapps.io/events/7193c477-1579-4216-a6cb-c8854e848395/agenda",
    ).then((res) => res.json());

    const talksByDay: Record<string, Record<string, any[]>> = {};

    for (const [timeSlot, sessions] of Object.entries(
      agenda.talks as Record<string, any[]>,
    )) {
      for (const session of sessions) {
        const day = session.startTime.split("T")[0];
        if (!talksByDay[day]) talksByDay[day] = {};
        if (!talksByDay[day][timeSlot]) talksByDay[day][timeSlot] = [];

        const id = session.talk?.id;
        const speakers = session.talk?.speakers
          ?.map((s: any) => s.display_name)
          .join(" & ");
        const speakersIds = session.talk?.speakers?.map((s: any) => s.id);

        talksByDay[day][timeSlot].push({
          talk: {
            ...session,
            abstract: marked(session.talk?.abstract ?? "")?.replaceAll(
              "h2",
              "p",
            ),
            title: session.talk?.title ?? "Pause",
            duration: `${dayjs
              .duration(
                dayjs(new Date(session.endTime)).diff(
                  dayjs(new Date(session.startTime)),
                ),
              )
              .asMinutes()} mn`,
          },
          id,
          speakers,
          speakersIds,
        });
      }
    }

    return Object.fromEntries(
      Object.entries(talksByDay).map(([day, slots]) => [
        day,
        Object.entries(slots).sort(([a], [b]) => a.localeCompare(b)),
      ]),
    );
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
