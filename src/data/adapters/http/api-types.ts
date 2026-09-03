/**
 * Formes brutes renvoyées par l'API DevLille. Elles ne sortent jamais de
 * l'adapter : tout le reste du site ne connaît que `src/data/domain.ts`.
 */

export type ApiSocial = { type: string; url: string };

type ApiMedia = {
  svg: string;
  pngs?: { _250: string; _500: string; _1000: string };
};

export type ApiJob = {
  url: string;
  title: string;
  company_name: string;
  location: string;
  salary: { min: number; max: number; recurrence: string } | null;
  requirements: number | null;
  publish_date: number;
};

export type ApiPartner = {
  id: string;
  name: string;
  description?: string;
  media?: ApiMedia;
  videoUrl?: string | null;
  siteUrl?: string;
  types?: string[];
  socials?: ApiSocial[];
  jobs?: ApiJob[];
  speakers?: Array<{ id: string }>;
};

export type ApiActivity = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  partner_id: string;
};

export type ApiPartnersResponse = {
  /** Libellés des packs proposés par l'événement, ex. `"Pack Gold"`. */
  types: string[];
  partners: ApiPartner[];
  activities: ApiActivity[];
};

export type ApiSchedule = {
  id: string;
  order?: number;
  date: string;
  start_time: string;
  end_time: string;
  room: string;
  session_id?: string;
};

export type ApiSession = {
  id: string;
  type: string;
  title?: string;
  abstract?: string;
  description?: string;
  language?: string;
  level?: string;
  speakers?: string[];
  link_slides?: string | null;
  link_replay?: string | null;
  open_feedback?: string | null;
};

export type ApiSpeaker = {
  id: string;
  display_name?: string;
  bio?: string;
  photo_url?: string;
  pronouns?: string | null;
  company?: string | null;
  job_title?: string | null;
  socials?: ApiSocial[];
  partners?: Array<{ id: string; name: string; logo_url: string }>;
};

export type ApiAgenda = {
  schedules: ApiSchedule[];
  sessions: ApiSession[];
  speakers: ApiSpeaker[];
};

export type ApiQuestion = {
  id: string;
  order: number;
  question: string;
  response: string;
  acronyms?: Array<{ key: string; value: string }>;
  actions?: Array<{ label: string; url: string }>;
};

export type ApiEvent = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  qanda?: ApiQuestion[];
};
