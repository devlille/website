/**
 * Moteur de traduction : un dictionnaire plat, des marqueurs `{nom}`.
 *
 * Aucune chaîne visible ne doit rester dans un composant. Même sans jamais
 * publier d'anglais, c'est ce qui permet de rebrander une instance sans
 * toucher au code.
 */

/** Valeurs interpolables dans un message. */
type MessageParams = Record<string, string | number>;

const PLACEHOLDER = /\{(\w+)\}/g;

export type Translator<M extends Record<string, string>> = (
  key: keyof M,
  params?: MessageParams,
) => string;

/**
 * Une clé absente ou un paramètre manquant fait échouer le build : mieux vaut
 * une erreur au build qu'un `{name}` publié en production.
 */
export const createTranslator = <M extends Record<string, string>>(
  messages: M,
): Translator<M> =>
  (key, params = {}) => {
    const message = messages[key];
    if (message === undefined) {
      throw new Error(`Message "${String(key)}" absent du dictionnaire.`);
    }

    return message.replace(PLACEHOLDER, (_match, name: string) => {
      const value = params[name];
      if (value === undefined) {
        throw new Error(
          `Paramètre "${name}" manquant pour le message "${String(key)}".`,
        );
      }
      return String(value);
    });
  };
