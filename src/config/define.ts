/**
 * Validation des configurations d'instance.
 *
 * Une instance marque blanche mal configurée doit échouer au build, en nommant
 * le champ fautif — pas produire une page cassée. Chaque fichier de config
 * passe donc par `defineConfig`, qui valide à l'import du module.
 */
import type { z } from "astro/zod";
import { formatZodIssues } from "../core/zod-errors";

export const defineConfig = <S extends z.ZodType>(
  /** Nom du fichier de configuration, cité dans le message d'erreur. */
  file: string,
  schema: S,
  value: z.input<S>,
): z.infer<S> => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(
      `${file} ne respecte pas le format attendu :\n${formatZodIssues(result.error)}`,
    );
  }
  return result.data;
};
