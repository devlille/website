import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(root, "dist");

const errors = [];
const fail = (msg) => errors.push(msg);

const REQUIRED_FILES = ["sitemap-index.xml", "sitemap-0.xml", "robots.txt"];
for (const file of REQUIRED_FILES) {
  const path = join(distDir, file);
  if (!existsSync(path) || statSync(path).size === 0) {
    fail(`Missing or empty file: dist/${file}`);
  } else {
    console.log(`✓ dist/${file} exists`);
  }
}

const sitemapPath = join(distDir, "sitemap-0.xml");
if (existsSync(sitemapPath)) {
  const sitemapXml = readFileSync(sitemapPath, "utf8");
  const urlCount = (sitemapXml.match(/<loc>/g) ?? []).length;
  if (urlCount === 0) {
    fail("sitemap-0.xml contains no <loc> entries");
  } else {
    console.log(`✓ sitemap-0.xml lists ${urlCount} URLs`);
  }
}

const META_DESC_RE =
  /<meta\s+name="description"\s+content="([^"]*)"\s*\/?>/i;
const TITLE_RE = /<title>([^<]+)<\/title>/i;

const collectSpeakerPages = () => {
  if (!existsSync(distDir)) return [];
  return readdirSync(distDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith("speaker-page-"))
    .map((e) => join(distDir, e.name, "index.html"))
    .filter((p) => existsSync(p));
};

const speakerPages = collectSpeakerPages();
if (speakerPages.length === 0) {
  fail("No speaker pages found in dist/");
} else {
  console.log(`\nChecking ${speakerPages.length} speaker pages...`);
}

const descriptions = new Map();
const titles = new Map();
const MIN_DESC_LENGTH = 30;
const MAX_DESC_LENGTH = 200;

for (const page of speakerPages) {
  const html = readFileSync(page, "utf8");
  const rel = page.replace(distDir + "/", "");

  const descMatch = html.match(META_DESC_RE);
  if (!descMatch) {
    fail(`${rel}: missing <meta name="description">`);
  } else {
    const desc = descMatch[1].trim();
    if (desc.length === 0) {
      fail(`${rel}: meta description is empty`);
    } else if (desc.length < MIN_DESC_LENGTH) {
      fail(`${rel}: meta description too short (${desc.length} chars)`);
    } else if (desc.length > MAX_DESC_LENGTH) {
      fail(`${rel}: meta description too long (${desc.length} chars)`);
    } else {
      const seenIn = descriptions.get(desc);
      if (seenIn) {
        fail(`${rel}: duplicate meta description (also in ${seenIn})`);
      } else {
        descriptions.set(desc, rel);
      }
    }
  }

  const titleMatch = html.match(TITLE_RE);
  if (!titleMatch) {
    fail(`${rel}: missing <title>`);
  } else {
    const title = titleMatch[1].trim();
    const seenIn = titles.get(title);
    if (seenIn) {
      fail(`${rel}: duplicate <title> "${title}" (also in ${seenIn})`);
    } else {
      titles.set(title, rel);
    }
  }
}

if (errors.length > 0) {
  console.error(`\n✗ SEO checks failed (${errors.length} error(s)):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `\n✓ All SEO checks passed: ${speakerPages.length} unique titles, ${descriptions.size} unique descriptions, sitemap present.`,
);
