import { getCollection } from "astro:content";
import { groupActivitiesByDate } from "../core/activities";
import { locale } from "../i18n";

export const createActivitiesCollectionsByDate = async () => {
  const entries = await getCollection("partnerActivities");
  return groupActivitiesByDate(
    entries.map((e) => e.data),
    locale,
  );
};
