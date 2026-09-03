import { buildTalkDays, type TalkDay } from "../core/agenda";
import { dataSource } from "../data";

export const createTalksCollectionsBydate = async (): Promise<TalkDay[]> => {
  try {
    return buildTalkDays(await dataSource.getAgenda());
  } catch (error) {
    console.error("Erreur lors de la construction de l'agenda:", error);
    return [];
  }
};
