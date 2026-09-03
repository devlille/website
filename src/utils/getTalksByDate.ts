import { buildTalkDays, type TalkDay } from "../core/agenda";
import { dataSource } from "../data";

export const createTalksCollectionsBydate = async (): Promise<TalkDay[]> => {
  try {
    return buildTalkDays(await dataSource.getAgenda());
  } catch (e) {
    console.log(e);
    return [];
  }
};
