// Export and import in the right pane: a read-only JSON preview with a real download and copy,
// then a validated file/paste restore. Nothing is uploaded and nothing is fetched.
import { el } from './dom.js';
import { state, setPane, replaceProgress } from './state.js';
import { COUNTERS } from './codex.js';

const FILENAME = 'leonida-platinum-progress.json';
const IDLE = 'Choose a file or paste a backup; nothing changes until you press Restore.';
let draft = '';
let message = { tone: '', text: IDLE };

const stepTotal = (steps) => Object.values(steps).reduce((n, list) => n + list.length, 0);

export function exportProgressBackup(doc) {
  const earned = [...state.earned].sort((a, b) => a - b);
  return {
    app: 'leonida-platinum-codex', version: 2, game: doc.game, platform: doc.platform,
    exportedAt: new Date().toISOString(),
    totals: { earned: earned.length, trophies: doc.trophies.length, checkedSteps: stepTotal(state.steps) },
    earned,
    earnedNames: doc.trophies.filter((t) => state.earned.has(t.id)).map((t) => t.name),
    steps: Object.fromEntries(Object.entries(state.steps).filter(([, list]) => list.length)),
    counters: { ...state.counters },
  };
}

/** A short share code: LPC1-<earned ids as a base-36 bitmask>-<the eight 100% counters, dot-separated>. */
export function shareCode(doc) {
  let mask = 0n;
  for (const t of doc.trophies) if (state.earned.has(t.id)) mask |= 1n << BigInt(t.id);
  return `LPC1-${mask.toString(36)}-${COUNTERS.map(([key]) => state.counters[key] ?? 0).join('.').replace(/(\.0)+$/, '')}`;
}

function decodeShare(raw, doc) {
  const m = /^LPC1-([0-9a-z]+)-([\d.]*)$/i.exec(raw);
  if (!m) return null;
  let mask = 0n;
  for (const ch of m[1].toLowerCase()) mask = mask * 36n + BigInt(parseInt(ch, 36));
  const ids = doc.trophies.filter((t) => (mask >> BigInt(t.id)) & 1n).map((t) => t.id);
  const counters = {};
  m[2].split('.').forEach((v, i) => { const c = COUNTERS[i]; const n = Number(v); if (c && Number.isInteger(n) && n > 0) counters[c[0]] = Math.min(n, c[2]); });
  return { ok: ids.length > 0 || Object.keys(counters).length > 0, code: true, ids, steps: {}, counters, unknown: 0, total: doc.trophies.length, error: 'That share code holds no progress.' };
}

function cleanCounters(raw) {
  const out = {};
  for (const [key, , goal] of COUNTERS) { const n = raw?.[key]; if (Number.isInteger(n) && n > 0) out[key] = Math.min(n, goal); }
  return out;
}

/** Validate a backup (a Codex export or a plain array of ids or official names). */
export function importProgressBackup(text, doc) {
  const raw = text.trim();
  if (!raw) return { ok: false, error: 'Nothing to import yet.' };
  const shared = decodeShare(raw, doc);
  if (shared) return shared;
  let payload;
  try { payload = JSON.parse(raw); }
  catch (err) { return { ok: false, error: `Not valid JSON: ${err.message}` }; }
  const byId = new Map(doc.trophies.map((t) => [t.id, t]));
  const byName = new Map(doc.trophies.map((t) => [t.name.toLowerCase(), t.id]));
  const ids = new Set();
  let unknown = 0;
  const add = (v) => {
    if (typeof v === 'number' && byId.has(v)) ids.add(v);
    else if (typeof v === 'string' && byName.has(v.toLowerCase())) ids.add(byName.get(v.toLowerCase()));
    else unknown += 1;
  };
  const steps = {};
  let counters = {};
  if (Array.isArray(payload)) payload.forEach(add);
  else if (payload && Array.isArray(payload.earned)) {
    payload.earned.forEach(add);
    counters = cleanCounters(payload.counters);
    for (const [key, list] of Object.entries(payload.steps ?? {})) {
      const trophy = byId.get(Number(key));
      if (trophy && Array.isArray(list)) steps[key] = list.filter((i) => Number.isInteger(i) && i >= 0 && i < trophy.steps.length).sort((a, b) => a - b);
    }
  } else return { ok: false, error: 'Expected a Codex backup or a JSON array of trophy names.' };
  if (!ids.size && !stepTotal(steps) && !Object.keys(counters).length) return { ok: false, error: unknown ? `None of the ${unknown} entries matched an official trophy.` : 'No progress found in that backup.' };
  return { ok: true, ids: [...ids].sort((a, b) => a - b), steps, counters, unknown, total: doc.trophies.length };
}

function downloadJSON(text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const anchor = Object.assign(document.createElement('a'), { href: url, download: FILENAME });
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function button(text, primary, onclick) {
  const b = el('button', `btn${primary ? ' primary' : ''}`, text);
  b.type = 'button';
  b.onclick = onclick;
  return b;
}

function exportCard(doc) {
  const payload = exportProgressBackup(doc);
  const json = JSON.stringify(payload, null, 2);
  const card = el('section', 'iocard');
  const title = el('div', 'seclabel');
  title.append(el('span', null, '1 · Export progress'), el('b', null, FILENAME));
  const summary = el('div', 'dmeta');
  summary.append(el('span', 'pill teal', `${payload.totals.earned} / ${payload.totals.trophies} earned`),
    el('span', 'pill', `${payload.totals.checkedSteps} checked steps`), el('span', 'pill', 'from localStorage'));
  const preview = el('textarea', 'pastebox jsonpreview');
  preview.readOnly = true;
  preview.spellcheck = false;
  preview.value = json;
  preview.setAttribute('aria-label', 'Exported progress JSON preview');
  const copy = button('Copy JSON', false, () => {
    preview.select();
    navigator.clipboard?.writeText(json).catch(() => document.execCommand('copy'));
    copy.textContent = 'Copied';
  });
  const actions = el('div', 'ioactions');
  actions.append(button('Download .json', true, () => downloadJSON(json)), copy, el('span', 'gnote', 'Blob download · no upload'));
  const code = shareCode(doc);
  const share = el('div', 'share');
  const codeBox = el('code', null, code);
  codeBox.id = 'share-code';
  const copyCode = button('Copy code', false, () => { navigator.clipboard?.writeText(code).catch(() => {}); copyCode.textContent = 'Copied'; });
  share.append(el('span', 'seclabel', 'Share code'), codeBox, copyCode);
  card.append(title, summary, preview, actions, share);
  return card;
}

function importCard(doc) {
  const card = el('section', 'iocard');
  const title = el('div', 'seclabel');
  title.append(el('span', null, '2 · Import progress'), el('b', null, 'validate, then restore'));
  const drop = el('label', 'drop', '⇪ Drop a .json backup here or click to choose a file');
  const file = el('input', 'hidden');
  file.type = 'file';
  file.accept = 'application/json,.json';
  drop.append(file);
  const area = el('textarea', 'pastebox importbox');
  area.value = draft;
  area.placeholder = '…or paste backup JSON or an LPC1 share code here';
  area.spellcheck = false;
  area.setAttribute('aria-label', 'Backup JSON to import');
  const status = el('div', 'iostatus');
  status.setAttribute('role', 'status');
  const restore = button('Restore JSON', true, () => {
    const result = importProgressBackup(area.value, doc);
    if (!result.ok) { evaluate(); return; }
    draft = '';
    message = { tone: 'ok', text: `✓ Restored ${result.ids.length}/${result.total} trophies · ${stepTotal(result.steps)} checked steps · ${Object.keys(result.counters).length} counters · saved to localStorage` };
    replaceProgress(result.ids, result.steps, result.counters);
  });
  const paint = () => { status.className = `iostatus ${message.tone}`; status.textContent = message.text; };
  const evaluate = () => {
    draft = area.value;
    const result = importProgressBackup(draft, doc);
    restore.disabled = !result.ok;
    if (!draft.trim()) message = { tone: '', text: IDLE };
    else if (!result.ok) message = { tone: 'err', text: result.error };
    else message = { tone: 'ok', text: `✓ Valid ${result.code ? 'share code' : 'backup'} · ${result.ids.length}/${result.total} trophies · ${stepTotal(result.steps)} steps · ${Object.keys(result.counters).length} counters${result.unknown ? ` · ${result.unknown} ignored` : ''} · offline` };
    paint();
  };
  const load = async (picked) => { if (picked) { area.value = await picked.text(); evaluate(); } };
  area.oninput = evaluate;
  file.onchange = () => load(file.files?.[0]);
  drop.ondragover = (event) => { event.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = (event) => { event.preventDefault(); drop.classList.remove('over'); load(event.dataTransfer?.files?.[0]); };
  const actions = el('div', 'ioactions');
  actions.append(restore, button('Paste current export', false, () => { area.value = JSON.stringify(exportProgressBackup(doc), null, 2); evaluate(); }));
  restore.disabled = !importProgressBackup(draft, doc).ok;
  paint();
  card.append(title, drop, area, actions, status);
  return card;
}

export function renderBackupPanel(host, doc) {
  const head = el('div', 'iohead');
  const intro = el('div');
  intro.append(el('span', 'eyebrow', 'Offline backup · portable JSON'), el('h2', null, 'Export & Import'));
  head.append(intro, button('← Back to guide', false, () => setPane('detail')));
  const wrap = el('div', 'iopane');
  wrap.append(head, exportCard(doc), importCard(doc));
  host.replaceChildren(wrap);
  host.dataset.trophyId = '';
  if (state.ioMode === 'import') host.querySelector('.importbox')?.focus({ preventScroll: true });
}

const BACKUP_CSS = '.iopane{display:flex;flex-direction:column;gap:9px}'
  + '.iohead{display:flex;justify-content:space-between;align-items:center}.iohead h2{margin:2px 0 0;font-size:22px;font-weight:820;letter-spacing:-.02em}'
  + '.iocard{padding:2px 12px 11px;border:1px solid var(--line);border-radius:11px;background:#10182a}'
  + '.pastebox{width:100%;margin-top:7px;resize:none;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:#080d18;color:#bdf3ea;font:11px/1.45 ui-monospace,monospace}'
  + '.jsonpreview{height:150px}.importbox{height:74px}'
  + '.share{display:flex;align-items:center;gap:8px;margin-top:8px;padding:6px 8px;border:1px solid #ffc06159;border-radius:9px;background:#ffc06110}.share .seclabel{margin:0;color:#ffe2a8}'
  + '.share code{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:700 12px ui-monospace,monospace;color:#ffe2a8}.share .btn{height:27px;font-size:11.5px}'
  + '.ioactions{display:flex;align-items:center;gap:7px;margin-top:8px}.ioactions .btn{height:31px;font-size:12px}.gnote{font-size:11px;color:var(--dim)}'
  + '.drop{display:flex;align-items:center;justify-content:center;height:36px;border:1.5px dashed #38e3cf73;border-radius:9px;background:#38e3cf0f;font-size:12px;font-weight:700;color:#c9fdf6;cursor:pointer}.drop.over{background:#38e3cf2b}'
  + '.iostatus{margin-top:8px;font-size:11.5px;color:var(--dim)}'
  + '.iostatus.ok,.iostatus.err{padding:7px 10px;border:1px solid;border-radius:8px;font-weight:750}'
  + '.iostatus.ok{border-color:#3ee08a99;background:#3ee08a1f;color:#b9ffd6}.iostatus.err{border-color:#ff5c8a8c;background:#ff5c8a1f;color:#ffc9d8}';
document.head.append(Object.assign(document.createElement('style'), { textContent: BACKUP_CSS }));
