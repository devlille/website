/**
 * Traduction du site, liée à la locale déclarée dans `site.config.ts`.
 *
 * Les composants importent `t` d'ici ; ils ne connaissent aucun dictionnaire.
 */
import { lang, site } from "../config";
import { fr } from "./fr";
import { createTranslator } from "./translate";

const DICTIONARIES: Record<string, typeof fr> = { fr };

const dictionary = DICTIONARIES[lang] ?? fr;

/** Locale BCP 47 de l'instance, pour tout ce qui se formate. */
export const locale: string = site.locale;

export const t = createTranslator(dictionary);
