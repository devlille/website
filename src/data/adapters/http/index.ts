/**
 * Adapter HTTP : la source de données par défaut, branchée sur l'API DevLille.
 *
 * Deux responsabilités, et seulement deux : parler HTTP et déléguer la
 * traduction aux mappers. Chaque endpoint n'est appelé qu'une fois par build,
 * quel que soit le nombre de collections ou de pages qui le consomment.
 */
import type {
  Activity,
  Agenda,
  EventInfo,
  FaqEntry,
  JobOffer,
  Partner,
  Speaker,
  Video,
} from "../../domain";
import type { EventDataSource } from "../../ports/data-source";
import { once } from "../once";
import type {
  ApiAgenda,
  ApiEvent,
  ApiPartnersResponse,
} from "./api-types";
import {
  parseYoutubeFeed,
  toActivities,
  toAgenda,
  toEventInfo,
  toJobOffers,
  toPartners,
  type TierOverrides,
} from "./mappers";

export type HttpDataSourceConfig = {
  /** Racine de l'API, sans slash final. */
  baseUrl: string;
  eventId: string;
  youtubePlaylistId: string;
  /** Packs de sponsoring forcés pour certains partenaires. */
  tierOverrides?: TierOverrides;
};

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} on ${url}`);
  }
  return (await response.json()) as T;
};

export const createHttpDataSource = (
  config: HttpDataSourceConfig,
): EventDataSource => {
  const eventUrl = `${config.baseUrl}/events/${config.eventId}`;

  const loadEvent = once(() => fetchJson<ApiEvent>(eventUrl));

  const loadAgenda = once(() =>
    fetchJson<ApiAgenda>(`${eventUrl}/agenda`, {
      headers: { Accept: "application/json; version=4" },
    }),
  );

  const loadPartners = once(() =>
    fetchJson<ApiPartnersResponse>(`${eventUrl}/partners/activities`),
  );

  const loadVideos = once(async () => {
    const url = `https://www.youtube.com/feeds/videos.xml?playlist_id=${config.youtubePlaylistId}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText} on ${url}`);
    }
    return parseYoutubeFeed(await response.text());
  });

  return {
    async getEvent(): Promise<EventInfo> {
      return toEventInfo(await loadEvent());
    },
    async getFaq(): Promise<FaqEntry[]> {
      return toEventInfo(await loadEvent()).faq;
    },
    async getAgenda(): Promise<Agenda> {
      return toAgenda(await loadAgenda());
    },
    async getSpeakers(): Promise<Speaker[]> {
      return toAgenda(await loadAgenda()).speakers;
    },
    async getPartners(): Promise<Partner[]> {
      return toPartners(await loadPartners(), config.tierOverrides ?? {});
    },
    async getActivities(): Promise<Activity[]> {
      return toActivities(await loadPartners());
    },
    async getJobs(): Promise<JobOffer[]> {
      return toJobOffers(await loadPartners());
    },
    async getVideos(): Promise<Video[]> {
      return loadVideos();
    },
  };
};
