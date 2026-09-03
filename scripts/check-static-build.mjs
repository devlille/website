#!/usr/bin/env node
/**
 * Vérifie qu'un `dist/` est *complet et navigable* — le critère de sortie de
 * l'adapter statique.
 *
 * Complet : chaque famille de pages alimentée par la source de données est
 * présente et non vide. Navigable : tous les liens internes résolvent vers un
 * fichier réellement produit.
 *
 * Volontairement indépendant de la source de données : il s'applique aussi à un
 * build HTTP, ce qui garantit que les deux sont tenus au même standard.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(root, "dist");

const errors = [];
const fail = (message) => errors.push(message);

if (!existsSync(distDir)) {
  console.error("dist/ est absent : lancer le build d'abord.");
  process.exit(1);
}

/** Toutes les pages HTML de `dist/`, en chemins relatifs à `dist/`. */
const htmlPages = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name.endsWith(".html")) htmlPages.push(path);
  }
};
walk(distDir);

const relative = (path) => path.slice(distDir.length);

// --- Complet -----------------------------------------------------------------

/** Chaque entrée décrit une page ou une famille de pages, et sa source. */
const REQUIRED = [
  { label: "accueil", match: (p) => p === "/index.html", source: "—" },
  { label: "agenda", match: (p) => p === "/agenda/index.html", source: "agenda.json" },
  { label: "animations", match: (p) => p === "/animations/index.html", source: "activities.json" },
  { label: "faq", match: (p) => p === "/faq/index.html", source: "event.json" },
  { label: "speakers", match: (p) => p === "/speakers/index.html", source: "agenda.json" },
  { label: "offres d'emploi", match: (p) => p === "/offres-emploi/index.html", source: "partners.json" },
  { label: "fiches partenaire", match: (p) => p.startsWith("/partner-"), source: "partners.json", min: 10 },
  { label: "fiches speaker", match: (p) => p.startsWith("/speaker-page-"), source: "agenda.json", min: 10 },
  { label: "fiches talk", match: (p) => p.startsWith("/talk-page-"), source: "agenda.json", min: 10 },
];

const relativePages = htmlPages.map(relative);

for (const { label, match, source, min = 1 } of REQUIRED) {
  const count = relativePages.filter(match).length;
  if (count < min) {
    fail(`${label} : ${count} page(s) produite(s), ${min} attendue(s) — source ${source}`);
  } else {
    console.log(`✓ ${label} : ${count} page(s)`);
  }
}

// --- Navigable ---------------------------------------------------------------

const HREF_RE = /\shref="([^"]+)"/g;

/** Une URL interne résout si `dist/` porte le fichier, ou son `index.html`. */
const resolves = (pathname) => {
  const clean = decodeURIComponent(pathname.replace(/\/+$/, "")) || "/index.html";
  const candidates = [
    join(distDir, clean),
    join(distDir, clean, "index.html"),
    join(distDir, `${clean}.html`),
  ];
  return candidates.some((c) => existsSync(c) && statSync(c).isFile());
};

const broken = new Map();
let internalLinks = 0;

for (const page of htmlPages) {
  const html = readFileSync(page, "utf8");
  for (const [, href] of html.matchAll(HREF_RE)) {
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    const pathname = href.split(/[?#]/)[0];
    if (pathname === "") continue;
    internalLinks += 1;
    if (resolves(pathname)) continue;
    if (!broken.has(pathname)) broken.set(pathname, []);
    broken.get(pathname).push(relative(page));
  }
}

if (broken.size > 0) {
  for (const [href, pages] of broken) {
    fail(
      `lien interne mort : ${href} (depuis ${pages.slice(0, 3).join(", ")}${pages.length > 3 ? `, +${pages.length - 3}` : ""})`,
    );
  }
} else {
  console.log(`✓ ${internalLinks} liens internes, tous résolus`);
}

// -----------------------------------------------------------------------------

if (errors.length > 0) {
  console.error(`\n${errors.length} problème(s) :`);
  for (const error of errors) console.error(`  ✗ ${error}`);
  process.exit(1);
}

console.log(`\nSite complet et navigable : ${htmlPages.length} pages.`);
