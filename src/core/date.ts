/**
 * Manipulations de dates, sans dépendance ni I/O.
 *
 * Ces fonctions étaient dupliquées à l'identique entre `getActivitiesByDate.ts`
 * et `SponsorActivities.astro` ; elles vivent désormais ici.
 */

/** `"2026-06-11T08:00"` -> `"2026-06-11"`. */
export const toDateOnly = (iso: string): string => iso.split("T")[0];

/** `"2026-06-11T08:30"` -> `"08:30"`, minuit si l'horodatage n'a pas d'heure. */
export const toHour = (iso: string): string => iso.split("T")[1] ?? "00:00";

/** Formate une `Date` locale en `YYYY-MM-DD` (sans passer par UTC). */
export const formatLocalDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Énumère les jours couverts par un intervalle, bornes incluses.
 * Renvoie `[]` si la fin précède le début.
 */
export const eachDayBetween = (startIso: string, endIso: string): string[] => {
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

const LONG_DATE = new Intl.DateTimeFormat("fr", { dateStyle: "long" });

/** `11 juin 2026`. */
export const formatLongDate = (date: Date): string => LONG_DATE.format(date);
