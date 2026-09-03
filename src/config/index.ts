/**
 * Point d'entrée unique de la configuration d'instance.
 *
 * Les composants importent d'ici — jamais un fichier de config directement —
 * ce qui laisse la liberté d'ajouter des valeurs dérivées sans toucher aux
 * pages.
 */
import event from "./event.config";
import features from "./features";
import integrations from "./integrations.config";
import site from "./site.config";

export { event, features, integrations, site };

/** `fr-FR` -> `fr` : ce que porte l'attribut `lang` du `<html>`. */
export const lang: string = site.locale.split("-")[0];

/** Clé de stockage navigateur des favoris, préfixée par l'instance. */
export const favoritesStorageKey = `${site.id}_favorites`;

/** URL de la billetterie pour l'édition en cours. */
export const ticketsUrl: string = integrations.tickets.urlTemplate.replace(
  "{edition}",
  String(event.edition),
);
