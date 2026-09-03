import type { Activity } from "../data/domain";
import { eachDayBetween, formatLongDate, toHour } from "./date";

/** Une activité placée dans un créneau, avec sa plage horaire formatée. */
export type ActivitySlotEntry = {
  id: string;
  name: string;
  partnerId: string;
  partnerName: string;
  partnerLogoUrl: string | null;
  hour: string;
  startTime: string;
  endTime: string;
  displayRange: string;
};

export type ActivityDay = {
  date: string;
  label: string;
  slots: Array<[string, ActivitySlotEntry[]]>;
};

const dayLabel = (day: string, locale: string): string =>
  formatLongDate(new Date(`${day}T12:00:00`), locale);

const byKeyAsc = <T>([a]: [string, T], [b]: [string, T]) => a.localeCompare(b);

/**
 * Groupe les activités par jour puis par créneau de début.
 * Une activité qui s'étale sur plusieurs jours apparaît sur chacun d'eux,
 * en conservant sa plage horaire d'origine.
 */
export const groupActivitiesByDate = (
  activities: Activity[],
  locale: string,
): ActivityDay[] => {
  const byDay: Record<string, Record<string, ActivitySlotEntry[]>> = {};

  for (const activity of activities) {
    const startHour = toHour(activity.startTime);
    const displayRange = `${startHour} - ${toHour(activity.endTime)}`;

    for (const day of eachDayBetween(activity.startTime, activity.endTime)) {
      byDay[day] ??= {};
      byDay[day][startHour] ??= [];

      byDay[day][startHour].push({
        id: activity.id,
        name: activity.name,
        partnerId: activity.partnerId,
        partnerName: activity.partnerName,
        partnerLogoUrl: activity.partnerLogoUrl,
        hour: startHour,
        startTime: activity.startTime,
        endTime: activity.endTime,
        displayRange,
      });
    }
  }

  return Object.entries(byDay)
    .sort(byKeyAsc)
    .map(([day, slots]) => ({
      date: day,
      label: dayLabel(day, locale),
      slots: Object.entries(slots).sort(byKeyAsc),
    }));
};

type Scheduled = { startTime: string; endTime: string };

/**
 * Groupe les activités par jour uniquement, triées par heure de début.
 * Utilisé par la fiche partenaire, qui n'a pas besoin des créneaux.
 */
export const groupActivitiesByDay = <T extends Scheduled>(
  activities: T[],
  locale: string,
): Array<{ date: string; label: string; activities: T[] }> => {
  const byDay: Record<string, T[]> = {};

  for (const activity of activities) {
    for (const day of eachDayBetween(activity.startTime, activity.endTime)) {
      byDay[day] ??= [];
      byDay[day].push(activity);
    }
  }

  return Object.entries(byDay)
    .sort(byKeyAsc)
    .map(([day, items]) => ({
      date: day,
      label: dayLabel(day, locale),
      activities: items.sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }));
};
