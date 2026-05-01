import { getCollection } from "astro:content";

type Activity = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  partner_id: string;
  partner_name: string;
  partner_logo_url?: string;
};

type DayEntry = {
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

const toDateOnly = (iso: string) => iso.split("T")[0];
const toHour = (iso: string) => iso.split("T")[1] ?? "00:00";

const formatLocalDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const eachDayBetween = (startIso: string, endIso: string): string[] => {
  const start = new Date(`${toDateOnly(startIso)}T00:00:00`);
  const end = new Date(`${toDateOnly(endIso)}T00:00:00`);
  const days: string[] = [];
  for (
    let d = new Date(start);
    d.getTime() <= end.getTime();
    d.setDate(d.getDate() + 1)
  ) {
    days.push(formatLocalDate(d));
  }
  return days;
};

export const createActivitiesCollectionsByDate = async () => {
  const entries = await getCollection("partnerActivities");
  const activities: Activity[] = entries.map((e) => e.data);

  const byDay: Record<string, Record<string, DayEntry[]>> = {};

  for (const activity of activities) {
    const days = eachDayBetween(activity.start_time, activity.end_time);
    const startHour = toHour(activity.start_time);
    const endHour = toHour(activity.end_time);
    const displayRange = `${startHour} - ${endHour}`;

    for (const day of days) {
      if (!byDay[day]) byDay[day] = {};
      if (!byDay[day][startHour]) byDay[day][startHour] = [];

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

  const sortedDays = Object.entries(byDay).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return sortedDays.map(([day, slots]) => ({
    date: day,
    label: new Intl.DateTimeFormat("fr", { dateStyle: "long" }).format(
      new Date(`${day}T12:00:00`),
    ),
    slots: Object.entries(slots).sort(([a], [b]) => a.localeCompare(b)),
  }));
};
