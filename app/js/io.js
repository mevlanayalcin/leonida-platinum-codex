// Portability and shell chrome: the #trophy=<id> deep link, the saved badge, clipboard copy with a fallback, and
// the Backup pane (JSON preview, download, copy, validated file/paste restore). Nothing is uploaded.
import { el, btn, css } from './dom.js';
import { state, setPane, replaceProgress, select } from './state.js';
import { COUNTERS } from './codex.js';

const FILENAME = 'leonida-platinum-progress.json';
const IDLE = 'Choose a file or paste a backup; nothing changes until you press Restore.';
const SAVED = { ok: '● Saved in this browser', off: '○ Not saved · storage blocked', recovered: '● Fresh start · old data unreadable' };
const $ = (s) => document.querySelector(s);
let draft = '';
let message = { tone: '', text: IDLE };

/** The trophy a #trophy=<id> hash names, if it is one of the 55. */
export function readHash(byId) {
  const id = Number(/^#trophy=(\d+)$/.exec(location.hash)?.[1]);
  return byId.has(id) ? id : null;
}

export function bindHash(byId) {
  state.selected = readHash(byId) ?? state.selected;
  window.addEventListener('hashchange', () => {
    const id = readHash(byId);
    if (id && (id !== state.selected || state.view !== 'tracker')) { state.view = 'tracker'; select(id); }
  });
}

export const trophyLink = (id) => `${location.href.split('#')[0]}#trophy=${id}`;

/** Per render: spoiler switch, saved badge, active tab, visible view, and the hash (replaced, not pushed). */
export function paintShell(io) {
  const v = state.view;
  $('#spoiler-toggle').setAttribute('aria-pressed', state.spoiler);
  $('#spoiler-state').textContent = state.spoiler ? 'On' : 'Off';
  Object.assign($('#saved'), { textContent: SAVED[state.saved], className: `saved ${state.saved}` });
  document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.view === (io ? 'backup' : v)));
  for (const id of ['tracker', 'roadmap', 'map', 'audit']) $(`#${id}-view`).classList.toggle('hidden', v !== id);
  $('#codex-strip').classList.toggle('hidden', io);
  $('#tracker-split').classList.toggle('io', io);
  const hash = v === 'tracker' && !io ? `#trophy=${state.selected}` : '';
  if (location.hash !== hash) history.replaceState(null, '', hash || location.pathname);
}

/** Clipboard API, then a hidden textarea and execCommand; false when both are blocked. */
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall back */ }
  const area = el('textarea');
  area.value = text;
  area.style.cssText = 'position:fixed;opacity:0';
  document.body.append(area);
  area.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { /* blocked */ }
  area.remove();
  return ok;
}

const stepTotal = (steps) => Object.values(steps).reduce((n, list) => n + list.length, 0);

export function exportProgressBackup(doc) {
  const earned = [...state.earned].sort((a, b) => a - b);
  return {
    app: 'leonida-platinum-codex', version: 2, game: doc.game, platform: doc.platform, exportedAt: new Date().toISOString(),
    totals: { earned: earned.length, trophies: doc.trophies.length, checkedSteps: stepTotal(state.steps) },
    earned, earnedNames: doc.trophies.filter((t) => state.earned.has(t.id)).map((t) => t.name),
    steps: Object.fromEntries(Object.entries(state.steps).filter(([, list]) => list.length)), counters: { ...state.counters },
  };
}

/** Validate a Codex export or an array of ids / official names; counters and steps are clamped to real goals. */
export function importProgressBackup(text, doc) {
  let payload;
  try { payload = JSON.parse(text); } catch (err) { return { ok: false, error: text.trim() ? `Not valid JSON: ${err.message}` : 'Nothing to import yet.' }; }
  const byId = new Map(doc.trophies.map((t) => [t.id, t]));
  const byName = new Map(doc.trophies.map((t) => [t.name.toLowerCase(), t.id]));
  const ids = new Set();
  const steps = {};
  const counters = {};
  let unknown = 0;
  const add = (v) => {
    const id = typeof v === 'number' ? v : byName.get(String(v).toLowerCase());
    if (byId.has(id)) ids.add(id); else unknown += 1;
  };
  if (Array.isArray(payload)) payload.forEach(add);
  else if (Array.isArray(payload?.earned)) {
    payload.earned.forEach(add);
    for (const [key, n] of Object.entries(payload.counters ?? {})) {
      const goal = COUNTERS.find((c) => c[0] === key)?.[2] ?? byId.get(Number(/^t(\d+)$/.exec(key)?.[1]))?.count;
      if (goal && Number.isInteger(n) && n > 0) counters[key] = Math.min(n, goal);
    }
    for (const [key, list] of Object.entries(payload.steps ?? {})) {
      const t = byId.get(Number(key));
      if (t && Array.isArray(list)) steps[key] = list.filter((i) => Number.isInteger(i) && i >= 0 && i < t.steps.length).sort((a, b) => a - b);
    }
  } else return { ok: false, error: 'Expected a Codex backup or a JSON array of trophy names.' };
  if (!ids.size && !stepTotal(steps) && !Object.keys(counters).length) return { ok: false, error: unknown ? `None of the ${unknown} entries matched an official trophy.` : 'No progress found in that backup.' };
  return { ok: true, ids: [...ids].sort((a, b) => a - b), steps, counters, unknown, total: doc.trophies.length };
}

function downloadJSON(text) {
  const a = el('a');
  Object.assign(a, { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: FILENAME });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

const label = (left, right) => el('div', 'seclabel', el('span', null, left), el('b', null, right));
const summary = (r) => `${r.ids.length}/${r.total} trophies · ${stepTotal(r.steps)} steps · ${Object.keys(r.counters).length} counters`;

function exportCard(doc) {
  const payload = exportProgressBackup(doc);
  const json = JSON.stringify(payload, null, 2);
  const preview = el('textarea', 'pastebox jsonpreview');
  Object.assign(preview, { readOnly: true, spellcheck: false, value: json });
  preview.setAttribute('aria-label', 'Exported progress JSON preview');
  const copy = btn('btn', 'Copy JSON', async () => { copy.textContent = (await copyText(json)) ? 'Copied' : 'Copy blocked'; });
  return el('section', 'iocard', label('1 · Export progress', FILENAME),
    el('div', 'dmeta', el('span', 'pill teal', `${payload.totals.earned} / ${payload.totals.trophies} earned`), el('span', 'pill', `${payload.totals.checkedSteps} checked steps`), el('span', 'pill', 'from localStorage')),
    preview, el('div', 'ioactions', btn('btn primary', 'Download .json', () => downloadJSON(json)), copy, el('span', 'gnote', 'Blob download · no upload')));
}

function importCard(doc) {
  const file = el('input', 'hidden');
  Object.assign(file, { type: 'file', accept: 'application/json,.json' });
  const drop = el('label', 'drop', '⇪ Choose a .json backup file', file);
  const area = el('textarea', 'pastebox importbox');
  Object.assign(area, { value: draft, placeholder: '…or paste backup JSON here', spellcheck: false });
  area.setAttribute('aria-label', 'Backup JSON to import');
  const status = el('div', 'iostatus');
  status.setAttribute('role', 'status');
  const paint = () => { status.className = `iostatus ${message.tone}`; status.textContent = message.text; };
  const restore = btn('btn primary', 'Restore JSON', () => {
    const r = importProgressBackup(area.value, doc);
    if (!r.ok) return evaluate();
    draft = '';
    message = { tone: 'ok', text: `✓ Restored ${summary(r)} · saved in this browser` };
    replaceProgress(r.ids, r.steps, r.counters);
  });
  const evaluate = () => {
    draft = area.value;
    const r = importProgressBackup(draft, doc);
    restore.disabled = !r.ok;
    message = !draft.trim() ? { tone: '', text: IDLE } : r.ok ? { tone: 'ok', text: `✓ Valid backup · ${summary(r)}${r.unknown ? ` · ${r.unknown} ignored` : ''}` } : { tone: 'err', text: r.error };
    paint();
  };
  const load = async (picked) => {
    if (!picked) return;
    try { area.value = await picked.text(); evaluate(); } catch { message = { tone: 'err', text: `Could not read ${picked.name}.` }; paint(); }
  };
  area.oninput = evaluate;
  file.onchange = () => load(file.files?.[0]);
  restore.disabled = !importProgressBackup(draft, doc).ok;
  paint();
  return el('section', 'iocard', label('2 · Import progress', 'validate, then restore'), drop, area,
    el('div', 'ioactions', restore, btn('btn', 'Paste current export', () => { area.value = JSON.stringify(exportProgressBackup(doc), null, 2); evaluate(); })), status);
}

export function renderBackupPanel(host, doc) {
  host.replaceChildren(el('div', 'iopane', el('div', 'iohead', el('div', null, el('span', 'eyebrow', 'Offline backup · portable JSON'), el('h2', null, 'Export & Import')),
    btn('btn', '← Back to guide', () => setPane('detail'))), exportCard(doc), importCard(doc)));
  host.dataset.trophyId = '';
  if (state.ioMode === 'import') host.querySelector('.importbox')?.focus({ preventScroll: true });
}

css('.iopane{display:flex;flex-direction:column;gap:9px}.iohead{display:flex;justify-content:space-between;align-items:center}.iohead h2{margin:2px 0 0;font-size:22px}'
  + '.iocard{padding:2px 12px 11px;border:1px solid var(--line);border-radius:11px;background:#10182a}'
  + '.pastebox{width:100%;margin-top:7px;resize:none;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:#080d18;color:#bdf3ea;font:11px/1.45 ui-monospace,monospace}'
  + '.jsonpreview{height:170px}.importbox{height:90px}.ioactions{display:flex;align-items:center;gap:7px;margin-top:8px}.ioactions .btn{height:31px}'
  + '.drop{display:flex;align-items:center;justify-content:center;height:36px;border:1.5px dashed #38e3cf73;border-radius:9px;background:#38e3cf0f;font-size:12px;font-weight:700;color:#c9fdf6;cursor:pointer}'
  + '.iostatus{margin-top:8px;font-size:11.5px;color:var(--dim)}.iostatus.ok,.iostatus.err{padding:7px 10px;border:1px solid;border-radius:8px;font-weight:750}'
  + '.iostatus.ok{border-color:#3ee08a99;background:#3ee08a1f;color:#b9ffd6}.iostatus.err{border-color:#ff5c8a8c;background:#ff5c8a1f;color:#ffc9d8}');
