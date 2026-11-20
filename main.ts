// A working gta6-trophy-guide-01 entry (Node 22, standard library only): the guide is this directory's app/ folder,
// plain static files a browser opens at app/index.html (ES modules, CSS, no build step), offline: it loads nothing
// over the network, and its trophy list and guides are app/data/trophies.json. The program hands it in: it copies app/
// and screenshots/ from beside this file to /output and writes /output/dossier.json, the summary the judge reads (your
// screenshots, the first load's files and bytes, and your source), with the vendored make.fun library. Leave
// vendor/makefun-frontend.ts as it is: the scorer requires dossier.json to be byte for byte what its own copy writes.
//
// v4 cites every step: the first load is index.html, styles.css, app.js and state.js (under 5,500 bytes gzip-9);
// the 55-row list, cited guide, roadmap, source verification matrix and backup pane are literal import() modules.
// Each trophy's guide names its sources inline, and each walkthrough step is { text, cite } where cite names one of
// that trophy's sources (PowerPyx, Push Square, IGN Wiki, Exophase, Beebom, TrueTrophies, and from the 20 Nov day-2
// pass Game Checklists, OutputLag and TrueAchievements; pages checked 19-20 Nov 2026).
// The guard below refuses the build if any official count, grade split, hidden count, guide or step citation drifts,
// and the app's audit strip recomputes the same numbers at boot.
// Screenshots are real 1280x800 renders, the first by name is the cover, and shots.json records the view each shows.
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

// Guard the data the judge will read: 55 official entries, 1/2/6/46 grades, 28 hidden, a cited guide for each,
// and every walkthrough step citing a source listed on its own trophy (0 uncited steps).
type Source = { label: string; page: string; url: string };
type Step = { text: string; cite: string };
type Entry = {
  id: number; name: string; grade: 'platinum' | 'gold' | 'silver' | 'bronze'; hidden?: boolean;
  guide: string; steps: Step[]; sources: Source[]; saveSlot?: number | null; missable?: boolean;
  missableChapter?: string; missableLabel?: string; missableShort?: string; missableNote?: string; missableCites?: string[];
};
const dataFile = join(here, 'app', 'data', 'trophies.json');
const entries: Entry[] = JSON.parse(readFileSync(dataFile, 'utf8')).trophies;
const grades = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
for (const entry of entries) grades[entry.grade] += 1;
const ids = new Set(entries.map((entry) => entry.id));
const labelsOf = (entry: Entry) => new Set(entry.sources.map((source) => source.label));
const stepCount = entries.reduce((sum, entry) => sum + entry.steps.length, 0);
const uncited = entries.flatMap((entry) => entry.steps
  .filter((step) => typeof step.text !== 'string' || !step.text.trim() || !labelsOf(entry).has(step.cite))
  .map((step) => `#${entry.id} "${String(step.text).slice(0, 40)}"`));
const citedGuides = entries.filter((entry) => [...labelsOf(entry)].some((label) => entry.guide.includes(`(${label}`) || entry.guide.includes(`, ${label})`)));
const badSources = entries.filter((entry) => !entry.sources.length
  || entry.sources.some((source) => !/^https:\/\/[^/]+\/./.test(source.url) || !source.page?.trim()));
const saveSlots = entries.map((entry) => entry.saveSlot).filter(Boolean).sort((a, b) => Number(a) - Number(b)).join(',');
const problems = [
  entries.length === 55 ? '' : `${entries.length} trophies, expected 55`,
  ids.size === entries.length ? '' : 'duplicate trophy ids',
  grades.platinum === 1 && grades.gold === 2 && grades.silver === 6 && grades.bronze === 46
    ? '' : `grades ${grades.platinum}/${grades.gold}/${grades.silver}/${grades.bronze}, expected 1/2/6/46`,
  entries.filter((entry) => entry.hidden).length === 28 ? '' : 'hidden count is not 28',
  entries.every((entry) => typeof entry.name === 'string' && entry.name.trim() && typeof entry.guide === 'string' && entry.guide.trim())
    ? '' : 'a trophy is missing its official name or its guide',
  citedGuides.length === 55 ? '' : `${citedGuides.length}/55 guides name one of their sources inline`,
  badSources.length ? `sources need a page and a deep https URL: #${badSources.map((entry) => entry.id).join(', #')}` : '',
  uncited.length ? `${uncited.length} uncited steps: ${uncited.slice(0, 3).join('; ')}` : '',
  // Two missable risks (the Ch.1 balcony meditation, Yago's timed Ch.3 race), each with a chapter tag, a note
  // and callout cites that name sources listed on that same trophy.
  entries.filter((entry) => entry.missable).length === 2 ? '' : 'expected exactly 2 missable flags',
  entries.filter((entry) => entry.missable && !(entry.missableChapter && entry.missableLabel && entry.missableShort
    && entry.missableNote && entry.missableCites?.length && entry.missableCites.every((label) => labelsOf(entry).has(label))))
    .map((entry) => `missable #${entry.id} lacks its chapter tag, note or own-source cites`).join('; '),
  saveSlots === '1,2,3,4,5,6,7,8,9,10' ? '' : `chapter save slots are ${saveSlots}, expected 1-10`,
].filter(Boolean);
if (problems.length) throw new Error(`app/data/trophies.json failed validation: ${problems.join('; ')}`);

// The scorers read screenshots/ by name, so check the four files before handing them in: at most four, each under 256 KiB.
const shotDir = join(here, 'screenshots');
const shots = existsSync(shotDir)
  ? readdirSync(shotDir).filter((name) => /\.(jpe?g|png)$/i.test(name)).sort()
  : [];
if (shots.length < 3 || shots.length > 4) throw new Error(`screenshots/ has ${shots.length} images, expected 3 or 4`);
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

// Keep the judge's Totals line honest: v4 boots only index.html, styles.css, app.js and state.js.
// Everything else (list, guide, roadmap, matrix, backup) arrives afterwards through literal import().
const dossierText = new TextDecoder().decode(dossier);
const totals = dossierText.match(/Totals: first load (\d+) files, (\d+) bytes gzip-9/);
if (!totals) throw new Error('dossier is missing its Totals line');
const firstLoadFiles = Number(totals[1]);
const firstLoadBytes = Number(totals[2]);
if (firstLoadBytes >= 5500) throw new Error(`first load is ${firstLoadBytes} bytes gzip-9, expected under 5500`);

writeFileSync(join(out, 'dossier.json'), dossier);

console.log(`Leonida Platinum Codex: ${entries.length} trophies (${grades.platinum}P/${grades.gold}G/${grades.silver}S/${grades.bronze}B, 28 hidden), ${citedGuides.length}/55 cited guides, ${stepCount - uncited.length}/${stepCount} cited steps, 0 uncited, ${entries.filter((entry) => entry.missable).length} missable risks`);
console.log(`screenshots: ${shots.map((shot) => `${shot} ${Math.round(statSync(join(shotDir, shot)).size / 1024)} KiB`).join(', ')}`);
console.log(`first load: ${firstLoadFiles} files, ${firstLoadBytes} bytes gzip-9 (under 5500)`);
console.log(`dossier: ${dossier.length} bytes -> ${join(out, 'dossier.json')}`);
