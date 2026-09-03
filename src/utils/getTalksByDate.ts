import { buildTalkDays, type TalkDay } from "../core/agenda";
import { event } from "../config";
import { dataSource } from "../data";
import { locale } from "../i18n";

export const createTalksCollectionsBydate = async (): Promise<TalkDay[]> => {
  try {
    return buildTalkDays(await dataSource.getAgenda(), {
      slotTitles: event.slotTitles,
      locale,
    });
  } catch (error) {
    console.error("Erreur lors de la construction de l'agenda:", error);
    return [];
  }
};
