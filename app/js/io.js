// Links, the shell (tabs, spoiler switch, saved badge) and the progress backup: a JSON file or an LPC1 share code,
// checked against trophies.json before anything replaces local progress. Nothing here touches the network.
import { el, btn, css, CHECKED } from './dom.js';
import { state, emit, setPane, replaceProgress } from './state.js';
import { COUNTERS, counterFor, longRoad } from './codex.js';

const $ = (s) => document.querySelector(s);
const VIEWS = ['tracker', 'roadmap', 'map', 'audit'];
const SAVED = { ok: '✓ Saved in this browser', off: '⚠ Not saved: storage blocked', recovered: '⚠ Unreadable save replaced' };
const FORMAT = 'leonida-platinum-codex/progress';
let status = null;

/** #trophy=<id> opens a guide; #view=roadmap|map|audit|backup opens a view. */
export function readHash(byId) {
  const p = new URLSearchParams(location.hash.slice(1));
  const id = Number(p.get('trophy'));
  const view = p.get('view');
  if (byId.has(id)) Object.assign(state, { view: 'tracker', pane: 'detail', selected: id, autoScroll: true });
  if (view === 'backup') Object.assign(state, { view: 'tracker', pane: 'io' });
  else if (VIEWS.includes(view)) Object.assign(state, { view, pane: 'detail' });
  return byId.has(id) ? id : null;
}

export function bindHash(byId) {
  readHash(byId);
  addEventListener('hashchange', () => { readHash(byId); emit(); });
}

export const trophyLink = (id) => `${location.origin}${location.pathname}#trophy=${id}`;

export function paintShell(io) {
  for (const tab of document.querySelectorAll('.tab')) tab.classList.toggle('active', io ? tab.dataset.view === 'backup' : tab.dataset.view === state.view);
  for (const v of VIEWS) $(`#${v}-view`).classList.toggle('hidden', v !== state.view);
  const split = $('#tracker-split');
  split.classList.toggle('io', io);
  split.classList.toggle('tri', !io);
  $('#spoiler-toggle').setAttribute('aria-pressed', state.spoiler);
  $('#spoiler-state').textContent = state.spoiler ? 'On' : 'Off';
  const saved = $('#saved');
  saved.textContent = SAVED[state.saved];
  saved.className = `saved ${state.saved}`;
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const area = document.body.appendChild(el('textarea'));
    area.value = text;
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    area.remove();
    return ok;
  }
}

const b64 = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** LPC1-<base64url bitmask of earned ids>: ten characters for all 55 trophies. */
export function shareCode(doc) {
  const bytes = new Uint8Array(Math.ceil(Math.max(...doc.trophies.map((t) => t.id)) / 8));
  for (const id of state.earned) bytes[(id - 1) >> 3] |= 1 << ((id - 1) & 7);
  return `LPC1-${b64(bytes)}`;
}

function readCode(code, ids) {
  let bin;
  try { bin = atob(code.slice(5).replace(/-/g, '+').replace(/_/g, '/')); } catch { throw new Error('That LPC1 code is damaged.'); }
  return [...ids].filter((id) => (bin.charCodeAt((id - 1) >> 3) >> ((id - 1) & 7)) & 1);
}

/** The backup as pretty JSON (number lists kept on one line). */
export function exportProgressBackup(doc) {
  const steps = Object.fromEntries(Object.entries(state.steps).filter(([, list]) => list.length));
  const data = { format: FORMAT, v: 1, game: doc.game, platform: doc.platform, exported: new Date().toISOString().slice(0, 19) + 'Z',
    earnedCount: `${state.earned.size}/${doc.trophies.length}`, earned: [...state.earned].sort((a, b) => a - b), steps, counters: state.counters,
    spoiler: state.spoiler, code: shareCode(doc) };
  return JSON.stringify(data, null, 2).replace(/\[\s+([\d,\s]+?)\s+\]/g, (_, list) => `[${list.replace(/\s+/g, ' ')}]`);
}

/** Validate a JSON backup or LPC1 code against trophies.json, then replace progress; returns what was kept. */
export function importProgressBackup(text, doc) {
  const byId = new Map(doc.trophies.map((t) => [t.id, t]));
  const raw = String(text).trim();
  if (/^LPC1-/i.test(raw)) {
    const earned = readCode(raw, byId.keys());
    replaceProgress(earned, state.steps, state.counters);
    return { earned: earned.length, steps: 0, counters: 0, skipped: 0 };
  }
  let data;
  try { data = JSON.parse(raw); } catch { throw new Error('This is neither backup JSON nor an LPC1 code.'); }
  if (!data || !Array.isArray(data.earned)) throw new Error('No "earned" list in this backup.');
  const earned = [...new Set(data.earned.filter((id) => byId.has(id)))];
  const steps = {};
  for (const [id, list] of Object.entries(data.steps ?? {})) {
    const t = byId.get(Number(id));
    const ok = Array.isArray(list) && t ? [...new Set(list.filter((i) => Number.isInteger(i) && i >= 0 && i < t.steps.length))].sort((a, b) => a - b) : [];
    if (ok.length) steps[id] = ok;
  }
  const goals = new Map();
  for (const t of doc.trophies) {
    const c = counterFor(t);
    if (c) goals.set(c.key, c.goal);
    for (const r of longRoad(t)) goals.set(r.key, r.goal);
  }
  const counters = {};
  for (const [k, n] of Object.entries(data.counters ?? {})) if (goals.has(k) && Number.isInteger(n) && n > 0) counters[k] = Math.min(n, goals.get(k));
  replaceProgress(earned, steps, counters);
  return { earned: earned.length, steps: Object.keys(steps).length, counters: Object.keys(counters).length, skipped: data.earned.length - earned.length };
}

const paint = (json) => json.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/("[^"]*")(\s*:)?|\b(\d+|true|false)\b/g, (m, s, colon, n) => (s ? `<i class=${colon ? 'k' : 's'}>${s}</i>${colon ?? ''}` : `<i class=n>${n}</i>`));

function apply(text, doc) {
  try {
    const r = importProgressBackup(text, doc);
    status = ['ok', `Imported ${r.earned} earned, ${r.steps} guides with ticked steps, ${r.counters} counters${r.skipped ? ` · ${r.skipped} unknown ids skipped` : ''}.`];
  } catch (error) { status = ['bad', error.message]; }
  emit();
}

/** Export (live JSON preview, Download, Copy), the LPC1 share code and Import (file or paste). */
export function renderBackupPanel(host, doc) {
  const json = exportProgressBackup(doc);
  const code = shareCode(doc);
  const steps = Object.values(state.steps).reduce((n, l) => n + l.length, 0);
  const counters = Object.entries(state.counters);
  const pre = el('pre', 'jprev');
  pre.innerHTML = paint(json);
  const download = () => {
    const a = el('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = `leonida-platinum-codex-${state.earned.size}of${doc.trophies.length}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const file = el('input');
  Object.assign(file, { type: 'file', accept: 'application/json,.json,.txt', hidden: true });
  file.onchange = async () => { if (file.files[0]) apply(await file.files[0].text(), doc); };
  const area = el('textarea', 'jin');
  Object.assign(area, { placeholder: 'Paste a backup JSON or an LPC1-… share code', rows: 3, spellcheck: false });
  area.setAttribute('aria-label', 'Backup to import');
  const codeBox = el('input', 'jcode');
  Object.assign(codeBox, { value: code, readOnly: true });
  codeBox.setAttribute('aria-label', 'LPC1 share code');
  const tile = (big, small) => el('div', 'iot', el('b', null, big), small);
  host.replaceChildren(
    el('div', 'iohead', el('div', null, el('span', 'eyebrow', 'Progress backup · stays in this browser · 0 network calls'), el('h2', null, '⇅ Export / Import')),
      btn('btn', '✕ Close', () => setPane('detail'))),
    el('div', 'iotiles', tile(`${state.earned.size}/${doc.trophies.length}`, 'earned'), tile(String(steps), 'steps ticked'),
      tile(String(counters.length), counters.length ? counters.map(([k, n]) => `${n} ${COUNTERS[k]?.label ?? k.slice(4)}`).slice(0, 2).join(' · ') : 'counters'),
      tile(state.spoiler ? 'On' : 'Off', 'spoiler shield')),
    el('section', 'iosec', el('h3', 'dsec', `Export · live JSON preview · ${json.length} bytes`), pre,
      el('div', 'iorow', btn('btn primary', '⬇ Download JSON', download),
        btn('btn', 'Copy JSON', async () => { status = (await copyText(json)) ? ['ok', 'Backup JSON copied.'] : ['bad', 'Clipboard blocked: use Download JSON.']; emit(); }))),
    el('section', 'iosec', el('h3', 'dsec', 'LPC1 share code · earned trophies in 10 characters'),
      el('div', 'iorow', codeBox, btn('btn', 'Copy code', async () => { status = (await copyText(code)) ? ['ok', 'Share code copied.'] : ['bad', 'Clipboard blocked.']; emit(); }))),
    el('section', 'iosec', el('h3', 'dsec', 'Import · replaces local progress after a check against all 55 trophies'), area,
      el('div', 'iorow', btn('btn io', '⬆ Import JSON', () => file.click()), btn('btn', 'Apply pasted', () => apply(area.value, doc)), file)),
    status ? el('p', `iostat ${status[0]}`, status[0] === 'ok' ? '✓ ' : '⚠ ', status[1]) : el('p', 'iostat', `Format ${FORMAT} v1 · ids, steps and counters validated · read ${CHECKED}`));
  if (state.ioMode === 'import') { state.ioMode = 'export'; area.focus(); }
}

css('.saved{font-size:11.5px;font-weight:800;color:#9dffbf;white-space:nowrap}.saved.off,.saved.recovered{color:#ffc2d3}'
  + '.split.io{grid-template-columns:minmax(0,1fr) 600px}.io .rail{display:none}'
  + '.io #trophy-detail{display:flex;flex-direction:column;gap:9px;border-color:#38e3cf66;background:linear-gradient(170deg,#11263a,#111a2d 45%)}'
  + '.iohead{display:flex;justify-content:space-between;align-items:center}.iohead h2{font-size:22px;font-weight:880}'
  + '.iotiles{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.iot{padding:6px 10px;border-radius:10px;background:#ffffff0d;font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  + '.iot b{display:block;font-size:20px;color:#fff}'
  + '.iosec{display:grid;gap:6px}.iorow{display:flex;gap:6px;align-items:center}'
  + '.jprev{margin:0;max-height:250px;overflow:auto;padding:9px 11px;border-radius:10px;border:1px solid var(--line);background:#060a14;font:12.5px/1.45 "DejaVu Sans Mono",monospace;color:#cfd8e6}'
  + '.jprev .k{font-style:normal;color:#8fdcff}.jprev .s{font-style:normal;color:#ffd08a}.jprev .n{font-style:normal;color:#7dffa8}'
  + '.jcode,.jin{flex:1;min-width:0;padding:7px 10px;border:1px solid var(--line);border-radius:9px;background:#060a14;color:#fff;font:13px "DejaVu Sans Mono",monospace}.jcode{font-size:16px;letter-spacing:.06em;color:#a6fff2}'
  + '.jin{resize:vertical}.iostat{margin:0;font-size:12.5px;color:var(--dim)}.iostat.ok{color:#8dffb8}.iostat.bad{color:#ffb3c2}');
