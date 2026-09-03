/**
 * Drapeaux d'activation de l'instance.
 *
 * `welovedevs` n'a plus aucun consommateur dans le site ; il est conservé le
 * temps de trancher sa suppression.
 */
import { defineConfig } from "./define";
import { featuresSchema } from "./schema";

export default defineConfig("features.ts", featuresSchema, {
  welovedevs: false,
  sponsoring: true,
  tickets: true,
});
