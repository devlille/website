import type {
  Activity,
  Agenda,
  EventInfo,
  FaqEntry,
  JobOffer,
  Partner,
  Speaker,
  Video,
} from "../domain";

/**
 * Seul contrat entre le site et sa source de données.
 *
 * Toute implémentation doit être *idempotente et mémoïsée* : le build appelle
 * plusieurs fois les mêmes méthodes, aucune ne doit déclencher deux requêtes.
 */
export interface EventDataSource {
  getEvent(): Promise<EventInfo>;
  getAgenda(): Promise<Agenda>;
  getSpeakers(): Promise<Speaker[]>;
  getPartners(): Promise<Partner[]>;
  getActivities(): Promise<Activity[]>;
  getJobs(): Promise<JobOffer[]>;
  getFaq(): Promise<FaqEntry[]>;
  getVideos(): Promise<Video[]>;
}
