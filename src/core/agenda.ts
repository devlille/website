import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import { marked } from "marked";
import { formatLongDate } from "./date";

dayjs.extend(duration);

export type ApiSchedule = {
  id: string;
  order?: number;
  date: string;
  start_time: string;
  end_time: string;
  room: string;
  session_id?: string;
};

export type ApiAgendaSpeaker = {
  id: string;
  display_name: string;
  bio?: string;
  photo_url: string;
  pronouns: string | null;
  company: string | null;
  job_title?: string | null;
  socials: Array<{ type: string; url: string }>;
  partners?: Array<{ id: string; name: string; logo_url: string }>;
};

export type ApiSession = {
  id: string;
  type: string;
  title?: string;
  abstract?: string;
  description?: string;
  language?: string;
  level?: string;
  speakers?: string[];
  link_slides?: string | null;
  link_replay?: string | null;
  open_feedback?: string | null;
};

export type Agenda = {
  schedules: ApiSchedule[];
  sessions: ApiSession[];
  speakers: ApiAgendaSpeaker[];
};

type Talk = {
  id: string;
  type: string;
  title: string;
  abstract: string;
  language: string;
  level?: string;
  room: string;
  startTime: string;
  endTime: string;
  duration: string;
  speakers: ApiAgendaSpeaker[];
  link_slides?: string | null;
  link_replay?: string | null;
  open_feedback?: string | null;
};

export type TalkEntry = {
  talk: Talk;
  /** Défini uniquement pour les talks : sert à construire le lien vers la fiche. */
  id?: string;
  sessionId?: string;
  /** Intervenants agrégés en une chaîne, `undefined` s'il n'y en a pas. */
  speakers?: string;
  speakersIds: string[];
};

export type TalkDay = {
  date: string;
  label: string;
  slots: Array<[string, TalkEntry[]]>;
};

/** Durée d'un créneau, en minutes, telle qu'affichée dans l'agenda. */
export const formatDurationLabel = (
  startTime: string,
  endTime: string,
): string =>
  `${dayjs
    .duration(dayjs(new Date(endTime)).diff(dayjs(new Date(startTime))))
    .asMinutes()} mn`;

/**
 * Reconstitue le libellé d'un créneau sans session rattachée, à partir de la
 * salle et de l'heure.
 *
 * Heuristiques 100 % DevLille : à remplacer par une stratégie injectable en
 * phase 4, ou à supprimer en fiabilisant les données source.
 */
export const guessEventTitle = (
  schedule: ApiSchedule,
  eventSessions: ApiSession[],
): string => {
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
};

const renderAbstract = (raw: string): string =>
  marked.parse(raw, { async: false }).replaceAll("h2", "p");

/**
 * Groupe les créneaux de l'agenda par jour puis par heure de début.
 * Les jours sortent dans l'ordre de la source ; les créneaux sont triés.
 */
const buildTalksByDay = (
  agenda: Agenda,
): Record<string, Array<[string, TalkEntry[]]>> => {
  const sessionsMap = new Map(agenda.sessions.map((s) => [s.id, s]));
  const speakersMap = new Map(agenda.speakers.map((s) => [s.id, s]));
  const eventSessions = agenda.sessions.filter((s) => s.type !== "talk-session");

  const talksByDay: Record<string, Record<string, TalkEntry[]>> = {};

  const slotFor = (day: string, timeSlot: string): TalkEntry[] => {
    talksByDay[day] ??= {};
    talksByDay[day][timeSlot] ??= [];
    return talksByDay[day][timeSlot];
  };

  for (const schedule of agenda.schedules) {
    const day = schedule.date;
    const timeSlot = schedule.start_time.split("T")[1];

    if (!schedule.session_id || schedule.session_id === "null") {
      slotFor(day, timeSlot).push({
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
          duration: formatDurationLabel(schedule.start_time, schedule.end_time),
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

    const isTalk = session.type === "talk-session";
    const speakerObjects = isTalk
      ? (session.speakers ?? [])
          .map((id) => speakersMap.get(id))
          .filter((s): s is ApiAgendaSpeaker => Boolean(s))
      : [];

    slotFor(day, timeSlot).push({
      talk: {
        id: schedule.id,
        type: session.type,
        title: session.title ?? "Pause",
        abstract: renderAbstract(
          (isTalk ? session.abstract : session.description) ?? "",
        ),
        language: session.language ?? "fr",
        level: session.level,
        room: schedule.room,
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        duration: formatDurationLabel(schedule.start_time, schedule.end_time),
        speakers: speakerObjects,
        link_slides: session.link_slides,
        link_replay: session.link_replay,
        open_feedback: session.open_feedback,
      },
      id: isTalk ? schedule.id : undefined,
      sessionId: isTalk ? schedule.session_id : undefined,
      speakers:
        speakerObjects.length > 0
          ? speakerObjects.map((s) => s.display_name).join(" & ")
          : undefined,
      speakersIds: speakerObjects.map((s) => s.id),
    });
  }

  return Object.fromEntries(
    Object.entries(talksByDay).map(([day, slots]) => [
      day,
      Object.entries(slots).sort(([a], [b]) => a.localeCompare(b)),
    ]),
  );
};

/** Agenda prêt pour la Timeline : un onglet par jour, ses créneaux triés. */
export const buildTalkDays = (agenda: Agenda): TalkDay[] =>
  Object.entries(buildTalksByDay(agenda)).map(([date, slots]) => ({
    date,
    label: formatLongDate(new Date(date)),
    slots,
  }));
