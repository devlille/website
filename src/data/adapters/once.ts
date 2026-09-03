/**
 * Mémoïse un chargement : la promesse est partagée par tous les appelants.
 *
 * Chaque adapter doit être idempotent (voir `ports/data-source.ts`) : le build
 * appelle plusieurs fois les mêmes méthodes, une seule lecture doit avoir lieu.
 */
export const once = <T>(load: () => Promise<T>): (() => Promise<T>) => {
  let pending: Promise<T> | undefined;
  return () => (pending ??= load());
};
