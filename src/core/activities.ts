import { eachDayBetween, formatLongDate, toHour } from "./date";

export type Activity = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  partner_id: string;
  partner_name: string;
  partner_logo_url?: string;
};

type ActivitySlotEntry = {
  id: string;
  name: string;
  partner_id: string;
  partner_name: string;
  partner_logo_url?: string;
  hour: string;
  start_time: string;
  end_time: string;
  display_range: string;
};

export type ActivityDay = {
  date: string;
  label: string;
  slots: Array<[string, ActivitySlotEntry[]]>;
};

const dayLabel = (day: string): string =>
  formatLongDate(new Date(`${day}T12:00:00`));

const byKeyAsc = <T>([a]: [string, T], [b]: [string, T]) => a.localeCompare(b);

/**
 * Groupe les activités par jour puis par créneau de début.
 * Une activité qui s'étale sur plusieurs jours apparaît sur chacun d'eux,
 * en conservant sa plage horaire d'origine.
 */
export const groupActivitiesByDate = (
  activities: Activity[],
): ActivityDay[] => {
  const byDay: Record<string, Record<string, ActivitySlotEntry[]>> = {};

  for (const activity of activities) {
    const startHour = toHour(activity.start_time);
    const displayRange = `${startHour} - ${toHour(activity.end_time)}`;

    for (const day of eachDayBetween(activity.start_time, activity.end_time)) {
      byDay[day] ??= {};
      byDay[day][startHour] ??= [];

      byDay[day][startHour].push({
        id: activity.id,
        name: activity.name,
        partner_id: activity.partner_id,
        partner_name: activity.partner_name,
        partner_logo_url: activity.partner_logo_url,
        hour: startHour,
        start_time: activity.start_time,
        end_time: activity.end_time,
        display_range: displayRange,
      });
    }
  }

  return Object.entries(byDay)
    .sort(byKeyAsc)
    .map(([day, slots]) => ({
      date: day,
      label: dayLabel(day),
      slots: Object.entries(slots).sort(byKeyAsc),
    }));
};

type Scheduled = { start_time: string; end_time: string };

/**
 * Groupe les activités par jour uniquement, triées par heure de début.
 * Utilisé par la fiche partenaire, qui n'a pas besoin des créneaux.
 */
export const groupActivitiesByDay = <T extends Scheduled>(
  activities: T[],
): Array<{ date: string; label: string; activities: T[] }> => {
  const byDay: Record<string, T[]> = {};

  for (const activity of activities) {
    for (const day of eachDayBetween(activity.start_time, activity.end_time)) {
      byDay[day] ??= [];
      byDay[day].push(activity);
    }
  }

  return Object.entries(byDay)
    .sort(byKeyAsc)
    .map(([day, items]) => ({
      date: day,
      label: dayLabel(day),
      activities: items.sort((a, b) =>
        a.start_time.localeCompare(b.start_time),
      ),
    }));
};
