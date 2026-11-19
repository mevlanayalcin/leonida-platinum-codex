// A working gta6-trophy-guide-01 entry (Node 22, standard library only): the guide is this directory's app/ folder,
// plain static files a browser opens at app/index.html (ES modules, CSS, no build step), offline: it loads nothing
// over the network, and its trophy list and guides are app/data/trophies.json. The program hands it in: it copies app/
// and screenshots/ from beside this file to /output and writes /output/dossier.json, the summary the judge reads (your
// screenshots, the first load's files and bytes, and your source), with the vendored make.fun library. Leave
// vendor/makefun-frontend.ts as it is: the scorer requires dossier.json to be byte for byte what its own copy writes.
//
// Only the plumbing, not a winner: a plain checklist of the 55 trophies with a one-line hint each. Write a real guide
// for every trophy in your own words, a roadmap to the platinum, filters and a spoiler setting in app/, put 3 or 4 PNG
// or JPEG screenshots of it in screenshots/ (the first by name is the cover; shots.json says which views this
// starter's were taken of), and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Guard the data the judge will read. The trophy list is the guide: 55 official entries, 1/2/6/46 grades and 28 hidden.
type Entry = { id: number; name: string; grade: 'platinum' | 'gold' | 'silver' | 'bronze'; hidden?: boolean };
const dataFile = join(here, 'app', 'data', 'trophies.json');
const entries: Entry[] = JSON.parse(readFileSync(dataFile, 'utf8')).trophies;
const grades = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
for (const entry of entries) grades[entry.grade] += 1;
const ids = new Set(entries.map((entry) => entry.id));
const problems = [
  entries.length === 55 ? '' : `${entries.length} trophies, expected 55`,
  ids.size === entries.length ? '' : 'duplicate trophy ids',
  grades.platinum === 1 && grades.gold === 2 && grades.silver === 6 && grades.bronze === 46
    ? '' : `grades ${grades.platinum}/${grades.gold}/${grades.silver}/${grades.bronze}, expected 1/2/6/46`,
  entries.filter((entry) => entry.hidden).length === 28 ? '' : 'hidden count is not 28',
].filter(Boolean);
if (problems.length) throw new Error(`app/data/trophies.json failed validation: ${problems.join('; ')}`);

// The scorers read screenshots/ by name, so check the four files before handing them in: at most four, each under 256 KiB.
const shotDir = join(here, 'screenshots');
const shots = existsSync(shotDir)
  ? readdirSync(shotDir).filter((name) => /\.(jpe?g|png)$/i.test(name)).sort()
  : [];
if (shots.length < 1 || shots.length > 4) throw new Error(`screenshots/ has ${shots.length} images, expected 1 to 4`);
for (const shot of shots) {
  const bytes = statSync(join(shotDir, shot)).size;
  if (bytes > 262144) throw new Error(`screenshots/${shot} is ${bytes} bytes, over the 262144 cap`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
const dossier = buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 });
writeFileSync(join(out, 'dossier.json'), dossier);

console.log(`Leonida Platinum Codex: ${entries.length} trophies (${grades.platinum}P/${grades.gold}G/${grades.silver}S/${grades.bronze}B, 28 hidden)`);
console.log(`screenshots: ${shots.map((shot) => `${shot} ${Math.round(statSync(join(shotDir, shot)).size / 1024)} KiB`).join(', ')}`);
console.log(`dossier: ${dossier.length} bytes -> ${join(out, 'dossier.json')}`);
