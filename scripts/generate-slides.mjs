import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const EVENT_ID = '7193c477-1579-4216-a6cb-c8854e848395';
const API_URL = `https://app-e675e675-2e47-445c-a7a7-359a37188469.cleverapps.io/events/${EVENT_ID}/partners/activities`;

const SPONSOR_CATEGORIES = [
  { label: 'Gold', matches: (t) => t === 'gold' || t === 'Pack Gold' },
  { label: 'Silver', matches: (t) => t === 'silver' || t === 'Pack Silver' },
  { label: 'Bronze', matches: (t) => t === 'bronze' || t === 'Pack Bronze' },
  {
    label: 'Partenaires DevLille Graine de Dev',
    matches: (t) => t === 'Partenaires DevLille Graine de Dev',
  },
  {
    label: 'Partenaire Hébergement',
    matches: (t) => t === 'Partenaire Hébergement',
  },
  {
    label: 'Community Partners',
    matches: (t) => t === 'Community Partners',
  },
  {
    label: 'Partenaires Média',
    matches: (t) => t === 'Partenaires Média',
  },
];

async function fetchSponsors() {
  const response = await fetch(API_URL);
  const data = await response.json();
  return data.partners.map((partner) => ({
    name: partner.name,
    logoUrl: partner.media.svg,
    sponsoring: partner.types || [],
  }));
}

function generateSlides(sponsors) {
  const lines = [
    '---',
    'theme: default',
    'title: DevLille 2026 - Sponsors',
    'layout: cover',
    'class: text-center',
    'autoplay: 5',
    'loop: true',
    '---',
    '',
    '# Merci à nos sponsors !',
    '',
    '<img src="/logodfl.svg" alt="DevLille" class="logo-main" />',
  ];

  for (const category of SPONSOR_CATEGORIES) {
    const categorySponsors = sponsors
      .filter((s) => s.sponsoring.some((type) => category.matches(type)))
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

    if (categorySponsors.length === 0) continue;

    lines.push('', '---', 'layout: center', 'class: text-center', '---', '');
    lines.push(`# ${category.label}`, '');
    lines.push('<div class="sponsors-grid">');
    for (const sponsor of categorySponsors) {
      lines.push(
        `  <img src="${sponsor.logoUrl}" alt="${sponsor.name}" title="${sponsor.name}" />`,
      );
    }
    lines.push('</div>');
  }

  return lines.join('\n');
}

async function main() {
  console.log('Fetching sponsors from API...');
  const sponsors = await fetchSponsors();
  console.log(`Found ${sponsors.length} sponsors`);

  const outputDir = resolve(__dirname, '../slides');
  const publicDir = resolve(outputDir, 'public');
  mkdirSync(outputDir, { recursive: true });
  mkdirSync(publicDir, { recursive: true });

  copyFileSync(
    resolve(__dirname, '../public/img/logodfl.svg'),
    resolve(publicDir, 'logodfl.svg'),
  );

  const slidesContent = generateSlides(sponsors);
  const outputPath = resolve(outputDir, 'slides.md');
  writeFileSync(outputPath, slidesContent, 'utf-8');
  console.log(`Slides generated at ${outputPath}`);
}

main().catch(console.error);
