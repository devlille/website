#!/usr/bin/env node
/**
 * Dumpe la source HTTP vers un dossier de fichiers JSON lisibles par l'adapter
 * statique.
 *
 *   npm run dump:static              # -> examples/static-event/
 *   npm run dump:static -- /tmp/evt  # -> /tmp/evt/
 *
 * C'est ainsi qu'on fabrique — et qu'on rafraîchit — le jeu d'exemple :
 * l'adapter statique n'a alors rien à mapper, les fichiers *sont* le domaine.
 *
 * Le script passe par Vite pour charger le TypeScript du site tel quel, avec
 * ses imports sans extension. C'est le même resolveur qu'Astro utilise au
 * build : aucun risque de divergence avec ce que consomme le site.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { createServer } from "vite";

const FILES = ["event", "agenda", "partners", "activities", "videos"];

const outDir = resolve(process.argv[2] ?? "examples/static-event");

const server = await createServer({
  configFile: false,
  logLevel: "warn",
  server: { middlewareMode: true },
});

try {
  const { createHttpDataSource } = await server.ssrLoadModule(
    "/src/data/adapters/http/index.ts",
  );
  const { event, integrations } = await server.ssrLoadModule(
    "/src/config/index.ts",
  );

  const source = createHttpDataSource({
    baseUrl: integrations.api.baseUrl,
    eventId: integrations.api.eventId,
    youtubePlaylistId: integrations.youtube.playlistId,
    tierOverrides: event.sponsorTierOverrides,
  });

  // `jobs` n'a pas de fichier : l'adapter statique les dérive de `partners`,
  // exactement comme l'adapter HTTP.
  const data = {
    event: await source.getEvent(),
    agenda: await source.getAgenda(),
    partners: await source.getPartners(),
    activities: await source.getActivities(),
    videos: await source.getVideos(),
  };

  await mkdir(outDir, { recursive: true });
  for (const name of FILES) {
    const path = join(outDir, `${name}.json`);
    await writeFile(path, `${JSON.stringify(data[name], null, 2)}\n`, "utf8");
    console.log(`écrit ${relative(process.cwd(), path)}`);
  }
} finally {
  await server.close();
}
