/**
 * Mise en forme des erreurs Zod, partagée par tout ce qui valide une entrée
 * fournie par un organisateur : les fichiers de l'adapter statique comme les
 * fichiers de configuration d'instance.
 *
 * L'objectif est toujours le même : nommer le champ fautif par son chemin
 * complet, pour que le message se traduise directement en geste correctif.
 */
import type { z } from "astro/zod";

/** `["schedules", 0, "room"]` -> `schedules[0].room`. */
const formatZodPath = (path: ReadonlyArray<PropertyKey>): string =>
  path.reduce<string>(
    (acc, key) =>
      typeof key === "number"
        ? `${acc}[${key}]`
        : acc
          ? `${acc}.${String(key)}`
          : String(key),
    "",
  ) || "(racine)";

/** Une ligne par problème : `  - champ.fautif : message`. */
export const formatZodIssues = (error: z.ZodError): string =>
  error.issues
    .map((issue) => `  - ${formatZodPath(issue.path)} : ${issue.message}`)
    .join("\n");
