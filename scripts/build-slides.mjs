import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'dist', 'slides');
const slidevBin = resolve(root, 'node_modules', '.bin', 'slidev');

console.log(`Building Slidev slides to: ${outDir}`);

const result = spawnSync(
  slidevBin,
  ['build', 'slides/slides.md', '--base', '/slides/', '--out', outDir],
  { stdio: 'inherit', cwd: root },
);

process.exit(result.status ?? 0);
