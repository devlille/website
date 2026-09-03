/**
 * Point d'entrée unique vers les données de l'événement.
 *
 * Rien d'autre dans le site ne doit importer un adapter : on importe
 * `dataSource` et on parle au domaine. La source est choisie par la variable
 * d'environnement `DATA_SOURCE` (`http` par défaut) ; l'adapter statique
 * arrivera en phase 3.
 */
import config from "../config/config";
import { createHttpDataSource } from "./adapters/http";
import type { EventDataSource } from "./ports/data-source";

const createDataSource = (): EventDataSource => {
  const name = process.env.DATA_SOURCE ?? "http";

  switch (name) {
    case "http":
      return createHttpDataSource({
        baseUrl: config.apiBaseUrl,
        eventId: config.eventId,
        youtubePlaylistId: config.youtubePlaylistId,
      });
    default:
      throw new Error(
        `DATA_SOURCE="${name}" inconnue. Sources disponibles : "http".`,
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
