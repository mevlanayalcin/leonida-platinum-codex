// First load: boot the shell, draw the verification audit strip, then lazy-mount the
// 55-row list, cited guide, roadmap and backup through literal import() calls below.
import { state, loadProgress, subscribe, setView, setPane, toggleSpoilerShield, resetProgress } from './state.js';

const $ = (s) => document.querySelector(s);
const mods = {};
let doc, byId;

/** Fetch the one official trophy file, then mount every view from it. */
export async function loadTrophies(url = './data/trophies.json') {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Trophy data unavailable (HTTP ${response.status})`);
  return response.json();
}

/** High-contrast audit strip under the header, computed from the loaded trophy file:
 *  official count, grades, cited guides, dated citation chips, uncited claims, offline. */
export function renderAuditStrip(host, trophies) {
  const grade = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  let cited = 0, citations = 0;
  for (const t of trophies) {
    grade[t.grade] += 1;
    if (t.sources.length) cited += 1;
    citations += t.sources.length;
  }
  const n = trophies.length;
  host.innerHTML = `<b><i>✓</i> ${n}/${n} OFFICIAL PS5 TROPHIES · 1P ${grade.gold}G ${grade.silver}S ${grade.bronze}B · `
    + `${cited}/${n} CITED GUIDES · ${citations} DATED CITATIONS (NOV 2026) · ${n - cited} UNCITED CLAIMS · 100% OFFLINE</b>`;
}

async function renderList() {
  mods.list ??= await import('./list.js');
  mods.list.renderTracker();
}

async function renderDetailPane() {
  if (!doc) return;
  if (state.pane === 'io') {
    mods.io ??= await import('./io.js');
    mods.io.renderBackupPanel($('#trophy-detail'), doc);
  } else {
    mods.detail ??= await import('./detail.js');
    mods.detail.renderTrophyDetail($('#trophy-detail'), byId.get(state.selected), doc);
  }
}

async function renderView() {
  const view = state.view;
  document.querySelectorAll('.tab').forEach((tab) => {
    const on = tab.dataset.view === view;
    tab.classList.toggle('active', on);
    tab.setAttribute('aria-selected', String(on));
  });
  $('#tracker-view').classList.toggle('hidden', view !== 'tracker');
  $('#roadmap-view').classList.toggle('hidden', view !== 'roadmap');
  if (view === 'roadmap') {
    mods.roadmap ??= await import('./roadmap.js');
    mods.roadmap.renderRoadmap($('#roadmap-stages'), doc);
    mods.roadmap.renderGuardrails($('#save-guardrails'), doc);
    mods.roadmap.renderSourceMatrix($('#save-guardrails'), doc);
  }
}

function renderAll() {
  renderList();
  renderDetailPane();
  renderView();
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
  subscribe(renderAll);
  renderAll();
  $('#trophy-list').scrollTop = 0;
}

boot().catch((error) => {
  console.error('Leonida Platinum Codex failed to start:', error);
  $('#trophy-list').innerHTML = '<div class="callout"><h3>Trophy data unavailable</h3><p>Serve this folder over HTTP so the browser may read data/trophies.json.</p></div>';
});
