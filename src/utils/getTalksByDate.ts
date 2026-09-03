import { buildTalkDays, type Agenda, type TalkDay } from "../core/agenda";

const AGENDA_URL =
  "https://app-e675e675-2e47-445c-a7a7-359a37188469.cleverapps.io/events/7193c477-1579-4216-a6cb-c8854e848395/agenda";
const AGENDA_HEADERS = { Accept: "application/json; version=4" };

export const createTalksCollectionsBydate = async (): Promise<TalkDay[]> => {
  try {
    const agenda: Agenda = await fetch(AGENDA_URL, {
      headers: AGENDA_HEADERS,
    }).then((res) => res.json());

    return buildTalkDays(agenda);
  } catch (e) {
    console.log(e);
    return [];
  }
};
