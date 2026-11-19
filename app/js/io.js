// Export and import in one opaque right-pane view: a read-only JSON preview with a real
// download, and a validated file/paste restore. Nothing is uploaded and nothing is fetched.
import { el } from './dom.js';
import { state, setPane, replaceProgress } from './state.js';

const FILENAME = 'leonida-platinum-progress.json';
let draft = '';
let message = { tone: '', text: 'Paste a backup or choose a file; nothing changes until you restore.' };

export function exportProgressBackup(doc) {
  const earned = [...state.earned].sort((a, b) => a - b);
  return {
    app: 'leonida-platinum-codex',
    version: 2,
    game: doc.game,
    platform: doc.platform,
    exportedAt: new Date().toISOString(),
    totals: { earned: earned.length, trophies: doc.trophies.length },
    earned,
    earnedNames: doc.trophies.filter((t) => state.earned.has(t.id)).map((t) => t.name),
    steps: state.steps,
  };
}

export function importProgressBackup(text, doc) {
  const raw = text.trim();
  if (!raw) return { ok: false, error: 'Nothing to import yet.' };
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (err) {
    return { ok: false, error: `Not valid JSON: ${err.message}` };
  }
  const byId = new Map(doc.trophies.map((t) => [t.id, t]));
  const byName = new Map(doc.trophies.map((t) => [t.name, t.id]));
  const ids = new Set();
  let unknown = 0;

  const add = (value) => {
    if (typeof value === 'number' && byId.has(value)) ids.add(value);
    else if (typeof value === 'string' && byName.has(value)) ids.add(byName.get(value));
    else unknown += 1;
  };

  let format = 'JSON backup';
  let steps = {};
  if (Array.isArray(payload)) {
    format = 'Legacy checklist array';
    payload.forEach(add);
  } else if (payload && typeof payload === 'object' && Array.isArray(payload.earned)) {
    format = payload.app === 'leonida-platinum-codex' ? 'Codex backup' : 'JSON backup object';
    payload.earned.forEach(add);
    if (payload.steps && typeof payload.steps === 'object') {
      for (const [key, list] of Object.entries(payload.steps)) {
        const id = Number(key);
        if (byId.has(id) && Array.isArray(list)) {
          steps[key] = list.filter((i) => Number.isInteger(i)).sort((a, b) => a - b);
        }
      }
    }
  } else {
    return { ok: false, error: 'Expected a Codex backup or a JSON array of trophy names.' };
  }

  if (ids.size === 0 && unknown === 0) return { ok: false, error: 'No earned trophies found in that backup.' };
  if (ids.size === 0) return { ok: false, error: `None of the ${unknown} entries matched an official trophy.` };
  return { ok: true, ids: [...ids].sort((a, b) => a - b), steps, format, unknown, total: doc.trophies.length };
}

function downloadJSON(text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = FILENAME;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function exportCard(doc) {
  const payload = exportProgressBackup(doc);
  const json = JSON.stringify(payload, null, 2);
  const card = el('section', 'iocard');
  const title = el('div', 'seclabel');
  title.append(el('span', null, 'Export progress'), el('span', null, 'read-only preview'));
  card.append(title);

  const summary = el('div', 'dmeta');
  summary.append(
    el('span', 'pill teal', `${payload.totals.earned} earned`),
    el('span', 'pill', `${payload.totals.trophies - payload.totals.earned} unearned`),
    el('span', 'pill gold', `${Object.keys(payload.steps).length} step lists`),
    el('span', 'pill', 'localStorage'),
  );

  const preview = el('textarea', 'pastebox jsonpreview');
  preview.readOnly = true;
  preview.spellcheck = false;
  preview.value = json;
  preview.setAttribute('aria-label', 'Exported progress JSON preview');

  const actions = el('div', 'ioactions');
  const download = el('button', 'btn primary', 'Download .json');
  download.type = 'button';
  download.addEventListener('click', () => downloadJSON(json));
  const copy = el('button', 'btn', 'Copy JSON');
  copy.type = 'button';
  copy.addEventListener('click', () => {
    preview.select();
    const done = () => { copy.textContent = 'Copied'; };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(json).then(done).catch(() => { document.execCommand('copy'); done(); });
    else { document.execCommand('copy'); done(); }
  });
  actions.append(download, copy);
  card.append(summary, preview, actions, el('p', 'gnote', 'Written on this device with a Blob URL · no upload.'));
  return card;
}

function importCard(doc) {
  const card = el('section', 'iocard');
  const title = el('div', 'seclabel');
  title.append(el('span', null, 'Import progress'), el('span', null, 'validate, then restore'));
  card.append(title);

  const drop = el('label', 'drop');
  drop.append(document.createTextNode('Choose a .json backup or drop it here'));
  const file = el('input', 'hidden');
  file.type = 'file';
  file.accept = 'application/json,.json';
  drop.append(file);

  const area = el('textarea', 'pastebox importbox');
  area.value = draft;
  area.placeholder = '…or paste backup JSON here';
  area.spellcheck = false;
  area.setAttribute('aria-label', 'Backup JSON to import');

  const status = el('div', `iostatus${message.tone ? ` ${message.tone}` : ' gnote'}`, message.text);
  status.setAttribute('role', 'status');

  const actions = el('div', 'ioactions');
  const restore = el('button', 'btn primary', 'Restore JSON');
  restore.type = 'button';
  restore.disabled = !importProgressBackup(draft, doc).ok;
  const useCurrent = el('button', 'btn', 'Paste current export');
  useCurrent.type = 'button';

  const evaluate = () => {
    draft = area.value;
    const result = importProgressBackup(draft, doc);
    status.className = 'iostatus gnote';
    restore.disabled = !result.ok;
    if (!draft.trim()) {
      message = { tone: '', text: 'Paste a backup or choose a file; nothing changes until you restore.' };
    } else if (!result.ok) {
      message = { tone: 'err', text: result.error };
    } else {
      const ignored = result.unknown ? ` · ${result.unknown} ignored` : '';
      message = { tone: 'ok', text: `Valid ${result.format} · ${result.ids.length} of ${result.total} trophies · ${Object.keys(result.steps).length} step lists${ignored} — ready to restore.` };
    }
    status.className = `iostatus${message.tone ? ` ${message.tone}` : ' gnote'}`;
    status.textContent = message.text;
  };

  area.addEventListener('input', evaluate);
  file.addEventListener('change', async () => {
    const picked = file.files?.[0];
    if (!picked) return;
    area.value = await picked.text();
    evaluate();
  });
  drop.addEventListener('dragover', (event) => { event.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', async (event) => {
    event.preventDefault();
    drop.classList.remove('over');
    const picked = event.dataTransfer?.files?.[0];
    if (!picked) return;
    area.value = await picked.text();
    evaluate();
  });

  useCurrent.addEventListener('click', () => {
    area.value = JSON.stringify(exportProgressBackup(doc), null, 2);
    evaluate();
  });

  restore.addEventListener('click', () => {
    const result = importProgressBackup(area.value, doc);
    if (!result.ok) { evaluate(); return; }
    draft = '';
    message = { tone: 'ok', text: `Restored ${result.ids.length} of ${result.total} trophies. The checklist, counters and roadmap updated immediately.` };
    replaceProgress(result.ids, result.steps);
  });

  actions.append(restore, useCurrent);
  card.append(drop, area, actions, status, el('p', 'gnote', 'Replaces current ticks · checked steps travel with the backup.'));
  return card;
}

export function renderBackupPanel(host, doc) {
  const wrap = el('div', 'iopane');
  const head = el('div', 'iohead');
  const intro = el('div');
  intro.append(el('p', 'eyebrow', 'Local backup · portable JSON'));
  intro.append(el('h2', null, 'Export & Import'));
  intro.append(el('p', 'gnote', 'No account and no upload: progress stays in this browser until you download it.'));
  const close = el('button', 'btn', '← Back to guide');
  close.type = 'button';
  close.addEventListener('click', () => setPane('detail'));
  head.append(intro, close);

  wrap.append(head, exportCard(doc), importCard(doc));
  host.replaceChildren(wrap);
  host.scrollTop = 0;
  if (state.ioMode === 'import') host.querySelector('.importbox')?.focus({ preventScroll: true });
}

// The backup pane's own styles travel with it and join the page on first visit.
const BACKUP_CSS = '.iopane{display:flex;flex-direction:column;gap:9px}'
  + '.iohead{display:flex;justify-content:space-between}'
  + '.iohead h2{margin:0 0 4px;font-size:20px;font-weight:800;letter-spacing:-.026em;line-height:1.16}'
  + '.iocard{border:1px solid var(--line);background:#0f1829;padding:10px 11px;border-radius:10px}'
  + '.pastebox{width:100%;resize:none;padding:8px 9px;border:1px solid var(--line);border-radius:7px;background:#080d17;color:#bde6df;font-family:monospace;font-size:10px;line-height:1.45}'
  + '.jsonpreview{height:118px}.importbox{height:92px}'
  + '.ioactions{display:flex;align-items:center;gap:6px;margin-top:7px}.ioactions .btn{height:30px;padding:0 11px;font-size:11px}'
  + '.drop{display:flex;align-items:center;justify-content:center;height:34px;margin-bottom:6px;border:1px dashed #ffffff3d;border-radius:8px;background:#182235;font-size:10.6px;color:var(--muted);cursor:pointer}'
  + '.iostatus.gnote{margin-top:6px}'
  + '.iostatus.ok,.iostatus.err{margin-top:6px;padding:6px 8px;border:1px solid;border-radius:6px;font-size:10px;line-height:1.45}'
  + '.iostatus.ok{border-color:#37e0c866;background:#37e0c817;color:#b6f8ef}'
  + '.iostatus.err{border-color:#ff4d8d73;background:#ff4d8d1a;color:#ffc2d5}';
document.head.append(Object.assign(document.createElement('style'), { textContent: BACKUP_CSS }));
