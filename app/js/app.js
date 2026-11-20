// First load: boot the shell, expand the compact trophy file, count its claims for the audit strip (verify.js),
// then mount the command strip, list, cited guide, roadmap, Leonida map and backup panes through literal import().
import { state, loadProgress, subscribe, hydrate } from './state.js';

const $ = (s) => document.querySelector(s);
const mods = {};
let doc, byId;

/** Fetch the one trophy file every view is drawn from. */
export async function loadTrophies(url = './data/trophies.json') {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Trophy data unavailable (HTTP ${response.status})`);
  return response.json();
}

async function renderPanes() {
  const v = state.view;
  $('#spoiler-toggle').setAttribute('aria-pressed', String(state.spoiler));
  $('#spoiler-state').textContent = state.spoiler ? 'On' : 'Off';
  document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active',
    tab.dataset.view === (v === 'tracker' && state.pane === 'io' ? 'backup' : v)));
  for (const id of ['tracker', 'roadmap', 'map']) $(`#${id}-view`).classList.toggle('hidden', v !== id);
  $('#codex-strip').classList.toggle('hidden', state.pane === 'io');
  if (v === 'tracker') {
    mods.codex ??= await import('./codex.js');
    mods.codex.renderCodexStrip($('#codex-strip'), doc);
    mods.list.renderTracker();
    if (state.pane === 'io') {
      mods.io ??= await import('./io.js');
      mods.io.renderBackupPanel($('#trophy-detail'), doc);
    } else {
      mods.detail ??= await import('./detail.js');
      mods.detail.renderTrophyDetail($('#trophy-detail'), byId.get(state.selected), doc);
    }
  } else if (v === 'roadmap') {
    mods.roadmap ??= await import('./roadmap.js');
    mods.roadmap.renderRoadmap($('#roadmap-stages'), $('#save-guardrails'), doc);
  } else {
    mods.map ??= await import('./map.js');
    mods.map.renderMap($('#map-view'), doc);
  }
}

async function boot() {
  loadProgress();
  doc = hydrate(await loadTrophies());
  byId = new Map(doc.trophies.map((t) => [t.id, t]));
  (await import('./verify.js')).renderAuditStrip($('#audit-strip'), doc);
  mods.list = await import('./list.js');
  mods.list.mountTracker(doc);
  subscribe(renderPanes);
  await renderPanes();
}

boot().catch((error) => {
  console.error('Leonida Platinum Codex failed to start:', error);
  $('#trophy-list').textContent = 'Trophy data unavailable: serve app/ over HTTP so the browser can read data/trophies.json.';
});
