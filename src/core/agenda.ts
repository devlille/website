import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import type { SlotTitleRule, SlotTitles } from "../config/schema";
import type { Agenda, ScheduleSlot, Session, Speaker } from "../data/domain";
import { formatLongDate } from "./date";
import { renderMarkdown } from "./markdown";

dayjs.extend(duration);

/** Un créneau prêt à afficher : la session, résolue, avec sa salle et sa durée. */
type Talk = {
  id: string;
  type: string;
  title: string;
  abstract: string;
  language: string;
  level: string | null;
  room: string;
  startTime: string;
  endTime: string;
  duration: string;
  speakers: Speaker[];
  slidesUrl: string | null;
  replayUrl: string | null;
  openFeedbackUrl: string | null;
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

/** Heure de début d'un créneau, en heures pleines. */
const startHour = (schedule: ScheduleSlot): number =>
  parseInt((schedule.startTime.split("T")[1] || "").split(":")[0], 10);

const matchesConditions = (
  rule: SlotTitleRule,
  schedule: ScheduleSlot,
): boolean => {
  const hour = startHour(schedule);
  if (rule.room !== undefined && rule.room !== schedule.room) return false;
  if (rule.fromHour !== undefined && !(hour >= rule.fromHour)) return false;
  if (rule.beforeHour !== undefined && !(hour < rule.beforeHour)) return false;
  return true;
};

/** La session hors-talk que la règle désigne, si l'agenda en porte une. */
const findSession = (
  rule: SlotTitleRule,
  eventSessions: Session[],
): Session | undefined =>
  eventSessions.find((session) =>
    rule.titleEquals !== undefined
      ? session.title === rule.titleEquals
      : session.title?.includes(rule.titleContains ?? ""),
  );

/**
 * Reconstitue le libellé d'un créneau sans session rattachée.
 *
 * Les règles viennent de la configuration d'instance (`event.slotTitles`) :
 * la première dont toutes les conditions sont vraies l'emporte, sinon c'est la
 * règle de repli. Une règle cherche d'abord une session hors-talk dont le
 * titre lui correspond, et n'utilise son propre libellé qu'à défaut.
 */
export const resolveSlotTitle = (
  schedule: ScheduleSlot,
  eventSessions: Session[],
  slotTitles: SlotTitles,
): string => {
  const rule =
    slotTitles.rules.find((candidate) =>
      matchesConditions(candidate, schedule),
    ) ?? slotTitles.fallback;

  return findSession(rule, eventSessions)?.title ?? rule.title;
};

/**
 * Fiche d'un talk : un créneau de type `talk-session`, avec ses intervenants
 * résolus. C'est ce que consomment les pages `/talk-page-*`.
 */
export type TalkSheet = {
  /** Id du créneau : c'est lui qui donne l'URL de la fiche. */
  id: string;
  sessionId: string;
  title: string | null;
  abstract: string;
  level: string | null;
  language: string;
  speakers: Speaker[];
  slidesUrl: string | null;
  replayUrl: string | null;
  openFeedbackUrl: string | null;
};

/** Une fiche par créneau de talk, dans l'ordre de l'agenda. */
export const buildTalkSheets = (agenda: Agenda): TalkSheet[] => {
  const sessionsMap = new Map(agenda.sessions.map((s) => [s.id, s]));
  const speakersMap = new Map(agenda.speakers.map((s) => [s.id, s]));

  return agenda.schedules.flatMap((schedule) => {
    if (schedule.sessionId === null) return [];
    const session = sessionsMap.get(schedule.sessionId);
    if (session?.type !== "talk-session") return [];

    return [
      {
        id: schedule.id,
        sessionId: session.id,
        title: session.title,
        abstract: session.abstract,
        level: session.level,
        language: session.language,
        speakers: session.speakerIds
          .map((id) => speakersMap.get(id))
          .filter((s): s is Speaker => Boolean(s)),
        slidesUrl: session.slidesUrl,
        replayUrl: session.replayUrl,
        openFeedbackUrl: session.openFeedbackUrl,
      },
    ];
  });
};

/** Sur une carte d'agenda, les titres du résumé sont aplatis en paragraphes. */
const renderAbstract = (raw: string): string =>
  renderMarkdown(raw, { flattenHeadings: true });

/**
 * Groupe les créneaux de l'agenda par jour puis par heure de début.
 * Les jours sortent dans l'ordre de la source ; les créneaux sont triés.
 */
const buildTalksByDay = (
  agenda: Agenda,
  slotTitles: SlotTitles,
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
    const timeSlot = schedule.startTime.split("T")[1];

    if (schedule.sessionId === null) {
      slotFor(day, timeSlot).push({
        talk: {
          id: schedule.id,
          type: "event-session",
          title: resolveSlotTitle(schedule, eventSessions, slotTitles),
          abstract: "",
          language: "fr",
          level: null,
          room: schedule.room,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          duration: formatDurationLabel(schedule.startTime, schedule.endTime),
          speakers: [],
          slidesUrl: null,
          replayUrl: null,
          openFeedbackUrl: null,
        },
        id: undefined,
        speakers: undefined,
        speakersIds: [],
      });
      continue;
    }

    const session = sessionsMap.get(schedule.sessionId);
    if (!session) continue;

    const isTalk = session.type === "talk-session";
    const speakerObjects = isTalk
      ? session.speakerIds
          .map((id) => speakersMap.get(id))
          .filter((s): s is Speaker => Boolean(s))
      : [];

    slotFor(day, timeSlot).push({
      talk: {
        id: schedule.id,
        type: session.type,
        title: session.title ?? slotTitles.fallback.title,
        abstract: renderAbstract(session.abstract),
        language: session.language,
        level: session.level,
        room: schedule.room,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        duration: formatDurationLabel(schedule.startTime, schedule.endTime),
        speakers: speakerObjects,
        slidesUrl: session.slidesUrl,
        replayUrl: session.replayUrl,
        openFeedbackUrl: session.openFeedbackUrl,
      },
      id: isTalk ? schedule.id : undefined,
      sessionId: isTalk ? schedule.sessionId : undefined,
      speakers:
        speakerObjects.length > 0
          ? speakerObjects.map((s) => s.name).join(" & ")
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

/** Ce que l'agenda emprunte à l'instance : ses règles de libellé et sa locale. */
export type AgendaOptions = {
  slotTitles: SlotTitles;
  locale: string;
};

/** Agenda prêt pour la Timeline : un onglet par jour, ses créneaux triés. */
export const buildTalkDays = (
  agenda: Agenda,
  options: AgendaOptions,
): TalkDay[] =>
  Object.entries(buildTalksByDay(agenda, options.slotTitles)).map(
    ([date, slots]) => ({
      date,
      label: formatLongDate(new Date(date), options.locale),
      slots,
    }),
  );
