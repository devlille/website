import { getCollection } from "astro:content";
import { groupActivitiesByDate } from "../core/activities";

export const createActivitiesCollectionsByDate = async () => {
  const entries = await getCollection("partnerActivities");
  return groupActivitiesByDate(entries.map((e) => e.data));
};
