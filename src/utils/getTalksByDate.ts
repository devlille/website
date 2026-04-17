import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import { marked } from "marked";

dayjs.extend(duration);

const AGENDA_URL =
  "https://app-e675e675-2e47-445c-a7a7-359a37188469.cleverapps.io/events/7193c477-1579-4216-a6cb-c8854e848395/agenda";
const AGENDA_HEADERS = { Accept: "application/json; version=4" };

function guessEventTitle(schedule: any, eventSessions: any[]): string {
  const timeStr = schedule.start_time.split("T")[1] || "";
  const hour = parseInt(timeStr.split(":")[0], 10);

  if (schedule.room === "Grand Théâtre") {
    return (
      eventSessions.find((s) => s.title?.includes("Keynote"))?.title ??
      "Keynote d'ouverture"
    );
  }
  if (hour < 9) {
    return (
      eventSessions.find((s) => s.title?.includes("Enregistrement"))?.title ??
      "Enregistrement"
    );
  }
  if (hour >= 12 && hour < 14) {
    return (
      eventSessions.find((s) => s.title?.includes("Lunch"))?.title ?? "Lunch"
    );
  }
  return eventSessions.find((s) => s.title === "Pause")?.title ?? "Pause";
}

const getTalks = async () => {
  try {
    const agenda = await fetch(AGENDA_URL, {
      headers: AGENDA_HEADERS,
    }).then((res) => res.json());

    const sessionsMap = new Map<string, any>(
      agenda.sessions.map((s: any) => [s.id, s]),
    );
    const speakersMap = new Map<string, any>(
      agenda.speakers.map((s: any) => [s.id, s]),
    );
    const eventSessions = agenda.sessions.filter(
      (s: any) => s.type !== "talk-session",
    );

    const talksByDay: Record<string, Record<string, any[]>> = {};

    for (const schedule of agenda.schedules) {
      const day = schedule.date;
      const timeSlot = schedule.start_time.split("T")[1];

      if (!schedule.session_id || schedule.session_id === "null") {
        if (!talksByDay[day]) talksByDay[day] = {};
        if (!talksByDay[day][timeSlot]) talksByDay[day][timeSlot] = [];

        talksByDay[day][timeSlot].push({
          talk: {
            id: schedule.id,
            type: "event-session",
            title: guessEventTitle(schedule, eventSessions),
            abstract: "",
            language: "fr",
            level: undefined,
            room: schedule.room,
            startTime: schedule.start_time,
            endTime: schedule.end_time,
            duration: `${dayjs
              .duration(
                dayjs(new Date(schedule.end_time)).diff(
                  dayjs(new Date(schedule.start_time)),
                ),
              )
              .asMinutes()} mn`,
            speakers: [],
            link_slides: undefined,
            link_replay: undefined,
            open_feedback: undefined,
          },
          id: undefined,
          speakers: undefined,
          speakersIds: [],
        });
        continue;
      }

      const session = sessionsMap.get(schedule.session_id);
      if (!session) continue;

      if (!talksByDay[day]) talksByDay[day] = {};
      if (!talksByDay[day][timeSlot]) talksByDay[day][timeSlot] = [];

      const speakerObjects =
        session.type === "talk-session"
          ? (session.speakers ?? [])
              .map((id: string) => speakersMap.get(id))
              .filter(Boolean)
          : [];

      const id =
        session.type === "talk-session" ? schedule.id : undefined;
      const sessionId =
        session.type === "talk-session" ? schedule.session_id : undefined;
      const speakers =
        speakerObjects.length > 0
          ? speakerObjects.map((s: any) => s.display_name).join(" & ")
          : undefined;
      const speakersIds = speakerObjects.map((s: any) => s.id);

      const rawText =
        session.type === "talk-session"
          ? session.abstract ?? ""
          : session.description ?? "";

      talksByDay[day][timeSlot].push({
        talk: {
          id: schedule.id,
          type: session.type,
          title: session.title ?? "Pause",
          abstract: marked.parse(rawText, { async: false }).replaceAll("h2", "p"),
          language: session.language ?? "fr",
          level: session.level,
          room: schedule.room,
          startTime: schedule.start_time,
          endTime: schedule.end_time,
          duration: `${dayjs
            .duration(
              dayjs(new Date(schedule.end_time)).diff(
                dayjs(new Date(schedule.start_time)),
              ),
            )
            .asMinutes()} mn`,
          speakers: speakerObjects,
          link_slides: session.link_slides,
          link_replay: session.link_replay,
          open_feedback: session.open_feedback,
        },
        id,
        sessionId,
        speakers,
        speakersIds,
      });
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

export const createTalksCollectionsBydate = async () => {
  const talks = await getTalks();
  return Object.entries(talks).map(([key, t]) => [
    new Intl.DateTimeFormat("fr", { dateStyle: "long" }).format(new Date(key)),
    t,
  ]);
};
