/**
 * Validation d'URL qui ne réécrit pas la valeur.
 *
 * `z.string().url()` *normalise* ce qu'il valide — il encode les accolades d'un
 * gabarit, ajoute un slash final — et il est déprécié depuis zod 4. Une
 * expression régulière valide sans transformer : ce qui est écrit est ce qui
 * est publié.
 */
import { z } from "astro/zod";

/** URL absolue en `http` ou `https`. */
export const httpUrl = z
  .string()
  .regex(/^https?:\/\/\S+$/, "URL http(s) attendue");

/** URL absolue, ou protocol-relative (`//cdn…`) comme en produisent les CDN. */
export const assetUrl = z
  .string()
  .regex(/^(https?:)?\/\/\S+$/, "URL absolue attendue");
