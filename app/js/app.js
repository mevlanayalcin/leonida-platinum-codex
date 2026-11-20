// First load: boot the shell and draw the audit strip from the data, then mount the list,
// cited guide, roadmap and backup panes through literal import() calls.
import { state, loadProgress, subscribe, setView, setPane, toggleSpoilerShield, resetProgress } from './state.js';

const $ = (s) => document.querySelector(s);
const mods = {};
let doc, byId;

/** Fetch the one trophy file every view is drawn from. */
export async function loadTrophies(url = './data/trophies.json') {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Trophy data unavailable (HTTP ${response.status})`);
  return response.json();
}

/** Count what the strip claims, from the loaded file: official total, grades, guides with
 *  a cited source, and walkthrough steps whose cite names one of that trophy's sources. */
export function auditTrophies(trophies) {
  const g = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  let guides = 0, steps = 0, cited = 0;
  for (const t of trophies) {
    g[t.grade] += 1;
    const labels = new Set(t.sources.map((s) => s.label));
    if (t.guide.trim() && labels.size) guides += 1;
    steps += t.steps.length;
    cited += t.steps.filter((s) => labels.has(s.cite)).length;
  }
  return { n: trophies.length, g, guides, steps, cited };
}

export function renderAuditStrip(host, trophies) {
  const a = auditTrophies(trophies);
  host.innerHTML = [`<i>✓</i> ${a.n}/${a.n} OFFICIAL PS5`, `${a.g.platinum}P ${a.g.gold}G ${a.g.silver}S ${a.g.bronze}B`,
    `${a.guides}/${a.n} CITED GUIDES`, `${a.cited}/${a.steps} CITED STEPS`, `${a.steps - a.cited} UNCITED`, '100% OFFLINE']
    .join(' <s>·</s> ');
}

async function renderPanes() {
  mods.list.renderTracker();
  if (state.pane === 'io') {
    mods.io ??= await import('./io.js');
    mods.io.renderBackupPanel($('#trophy-detail'), doc);
  } else {
    mods.detail ??= await import('./detail.js');
    mods.detail.renderTrophyDetail($('#trophy-detail'), byId.get(state.selected), doc);
  }
  const road = state.view === 'roadmap';
  document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.view === state.view));
  $('#tracker-view').classList.toggle('hidden', road);
  $('#roadmap-view').classList.toggle('hidden', !road);
  if (road) {
    mods.roadmap ??= await import('./roadmap.js');
    mods.roadmap.renderRoadmap($('#roadmap-stages'), $('#save-guardrails'), doc);
  }
}

function bind() {
  document.querySelectorAll('.tab').forEach((tab) => { tab.onclick = () => setView(tab.dataset.view); });
  $('#spoiler-toggle').onclick = () => toggleSpoilerShield();
  $('#export-progress').onclick = () => setPane('io', 'export');
  $('#import-progress').onclick = () => setPane('io', 'import');
  $('#reset-progress').onclick = () => { if (confirm('Clear all local progress?')) resetProgress(); };
}

async function boot() {
  loadProgress();
  doc = await loadTrophies();
  byId = new Map(doc.trophies.map((t) => [t.id, t]));
  renderAuditStrip($('#audit-strip'), doc.trophies);
  mods.list = await import('./list.js');
  mods.list.mountTracker(doc);
  bind();
  subscribe(renderPanes);
  await renderPanes();
}

boot().catch((error) => {
  console.error('Leonida Platinum Codex failed to start:', error);
  $('#trophy-list').textContent = 'Trophy data unavailable: serve app/ over HTTP so the browser can read data/trophies.json.';
});
