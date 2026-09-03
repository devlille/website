/**
 * Adapter statique : la source de données « sans backend ».
 *
 * Un dossier de fichiers JSON calqués sur le domaine suffit à produire le site
 * complet, sans le moindre appel réseau. Les fichiers attendus sont ceux de
 * `FILES` ci-dessous ; `examples/static-event/` en donne un jeu complet.
 *
 * Les fichiers sont validés par les schémas de `src/data/schemas.ts` — les
 * mêmes que ceux des collections de contenu. Un fichier absent, mal formé ou
 * hors schéma fait échouer le build en nommant le fichier et le champ fautifs,
 * plutôt que de produire des pages vides.
 */
import { readFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { z } from "astro/zod";
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
import {
  activitySchema,
  agendaSchema,
  eventInfoSchema,
  partnerSchema,
  videoSchema,
} from "../../schemas";
import { once } from "../once";

export type StaticDataSourceConfig = {
  /** Dossier des fichiers JSON, absolu ou relatif au répertoire courant. */
  dir: string;
};

/** Nom de fichier attendu pour chaque jeu de données. */
const FILES = {
  event: "event.json",
  agenda: "agenda.json",
  partners: "partners.json",
  activities: "activities.json",
  videos: "videos.json",
} as const;

const isMissingFile = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

/** `["schedules", 0, "room"]` -> `schedules[0].room`. */
const formatPath = (path: ReadonlyArray<PropertyKey>): string =>
  path.reduce<string>(
    (acc, key) =>
      typeof key === "number"
        ? `${acc}[${key}]`
        : acc
          ? `${acc}.${String(key)}`
          : String(key),
    "",
  ) || "(racine)";

const formatIssues = (error: z.ZodError): string =>
  error.issues
    .map((issue) => `  - ${formatPath(issue.path)} : ${issue.message}`)
    .join("\n");

/**
 * Lit un fichier et le valide. Les trois modes d'échec — absent, JSON invalide,
 * hors schéma — remontent en `Error` nommant le chemin complet du fichier.
 */
const readJson = async <S extends z.ZodType>(
  path: string,
  schema: S,
): Promise<z.infer<S>> => {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    if (isMissingFile(error)) {
      throw new Error(
        `${path} : fichier introuvable. L'adapter statique attend les fichiers ${Object.values(FILES).join(", ")}.`,
      );
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `${path} n'est pas un JSON valide : ${(error as Error).message}`,
    );
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `${path} ne respecte pas le format attendu :\n${formatIssues(result.error)}`,
    );
  }
  return result.data;
};

export const createStaticDataSource = (
  config: StaticDataSourceConfig,
): EventDataSource => {
  const dir = isAbsolute(config.dir)
    ? config.dir
    : resolve(process.cwd(), config.dir);
  const path = (file: string) => join(dir, file);

  const loadEvent = once(() => readJson(path(FILES.event), eventInfoSchema));
  const loadAgenda = once(() => readJson(path(FILES.agenda), agendaSchema));
  const loadPartners = once(() =>
    readJson(path(FILES.partners), z.array(partnerSchema)),
  );
  const loadActivities = once(() =>
    readJson(path(FILES.activities), z.array(activitySchema)),
  );
  const loadVideos = once(() =>
    readJson(path(FILES.videos), z.array(videoSchema)),
  );

  return {
    async getEvent(): Promise<EventInfo> {
      return loadEvent();
    },
    async getFaq(): Promise<FaqEntry[]> {
      return (await loadEvent()).faq;
    },
    async getAgenda(): Promise<Agenda> {
      return loadAgenda();
    },
    async getSpeakers(): Promise<Speaker[]> {
      return (await loadAgenda()).speakers;
    },
    async getPartners(): Promise<Partner[]> {
      return loadPartners();
    },
    async getActivities(): Promise<Activity[]> {
      return loadActivities();
    },
    /** Dérivées des partenaires, comme dans l'adapter HTTP. */
    async getJobs(): Promise<JobOffer[]> {
      return (await loadPartners()).flatMap((partner) =>
        partner.jobs.map((job) => ({
          ...job,
          partnerId: partner.id,
          partnerName: partner.name,
        })),
      );
    },
    async getVideos(): Promise<Video[]> {
      return loadVideos();
    },
  };
};
