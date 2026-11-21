// First load: expand trophies.json, count claims for the audit strip (verify.js), honour a #trophy=<id> link
// (io.js), then render every view through literal import().
import { state, loadProgress, subscribe, hydrate } from './state.js';

const $ = (s) => document.querySelector(s);
const mods = {};
let doc, byId;

export async function loadTrophies(url = './data/trophies.json') {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Trophy data unavailable (HTTP ${response.status})`);
  return response.json();
}

async function renderPanes() {
  const v = state.view;
  const io = v === 'tracker' && state.pane === 'io';
  mods.io.paintShell(io);
  if (v === 'tracker') {
    mods.codex ??= await import('./codex.js');
    mods.codex.renderCodexStrip($('#codex-strip'), doc);
    mods.list.renderTracker();
    mods.detail ??= await import('./detail.js');
    if (io) mods.io.renderBackupPanel($('#trophy-detail'), doc);
    else mods.detail.renderTrophyDetail($('#trophy-detail'), byId.get(state.selected), doc);
    mods.detail.renderRail($('#trophy-rail'), byId.get(state.selected), doc);
  } else if (v === 'roadmap') {
    mods.roadmap ??= await import('./roadmap.js');
    mods.roadmap.renderRoadmap($('#roadmap-stages'), $('#save-guardrails'), doc);
  } else if (v === 'map') {
    mods.map ??= await import('./map.js');
    mods.map.renderMap($('#map-view'), doc);
  } else mods.verify.renderAuditView($('#audit-view'), doc);
}

async function boot() {
  loadProgress();
  doc = hydrate(await loadTrophies());
  byId = new Map(doc.trophies.map((t) => [t.id, t]));
  mods.verify = await import('./verify.js');
  mods.verify.renderAuditStrip($('#audit-strip'), doc);
  mods.io = await import('./io.js');
  mods.io.bindHash(byId);
  mods.list = await import('./list.js');
  mods.list.mountTracker(doc);
  subscribe(renderPanes);
  await renderPanes();
}

boot().catch((error) => {
  console.error('Leonida Platinum Codex failed to start:', error);
  $('#trophy-list').textContent = 'Trophy data unavailable: serve app/ over HTTP so the browser can read data/trophies.json.';
});
