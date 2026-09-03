/**
 * Point d'entrée unique vers les données de l'événement.
 *
 * Rien d'autre dans le site ne doit importer un adapter : on importe
 * `dataSource` et on parle au domaine. La source est choisie par la variable
 * d'environnement `DATA_SOURCE` :
 *
 * - `http` (défaut) — l'API DevLille ;
 * - `static` — un dossier de fichiers JSON, sans aucun appel réseau. Le dossier
 *   se choisit avec `STATIC_DATA_DIR` (`examples/static-event` par défaut).
 */
import config from "../config/config";
import { createHttpDataSource } from "./adapters/http";
import { createStaticDataSource } from "./adapters/static";
import type { EventDataSource } from "./ports/data-source";

/** Jeu de démonstration livré avec le dépôt. */
const DEFAULT_STATIC_DIR = "examples/static-event";

const createDataSource = (): EventDataSource => {
  const name = process.env.DATA_SOURCE ?? "http";

  switch (name) {
    case "http":
      return createHttpDataSource({
        baseUrl: config.apiBaseUrl,
        eventId: config.eventId,
        youtubePlaylistId: config.youtubePlaylistId,
      });
    case "static":
      return createStaticDataSource({
        dir: process.env.STATIC_DATA_DIR ?? DEFAULT_STATIC_DIR,
      });
    default:
      throw new Error(
        `DATA_SOURCE="${name}" inconnue. Sources disponibles : "http", "static".`,
      );
  }
};

/**
 * Instance partagée par tous les loaders et toutes les pages du build : c'est
 * elle qui porte la mémoïsation des appels réseau.
 *
 * Astro évalue ce module deux fois — une fois pour les loaders de contenu, une
 * fois pour le bundle des pages — dans deux graphes de modules distincts. On
 * ancre donc l'instance sur `globalThis` pour que le cache soit vraiment
 * partagé par tout le build, et non dupliqué par graphe.
 */
const SINGLETON = Symbol.for("devlille.dataSource");

type Host = typeof globalThis & { [SINGLETON]?: EventDataSource };

export const dataSource: EventDataSource = ((globalThis as Host)[SINGLETON] ??=
  createDataSource());

export type { EventDataSource } from "./ports/data-source";
