import { el } from './detail.js';
import { state, replaceProgress, saveProgress } from './state.js';

export function buildPayload(doc) {
  const earned = [...state.earned].sort((a, b) => a - b);
  return {
    app: 'leonida-platinum-codex',
    version: 1,
    game: doc.game,
    platform: doc.platform,
    exportedAt: new Date().toISOString(),
    totals: { earned: earned.length, trophies: doc.trophies.length },
    earned,
    earnedNames: doc.trophies.filter((t) => state.earned.has(t.id)).map((t) => t.name),
    steps: state.steps,
  };
}

export function parseBackup(text, doc) {
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
    format = payload.app === 'leonida-platinum-codex' ? 'Codex v1 backup' : 'JSON backup object';
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

  if (ids.size === 0 && unknown === 0) {
    return { ok: false, error: 'No earned trophies found in that backup.' };
  }
  if (ids.size === 0) {
    return { ok: false, error: `None of the ${unknown} entries matched an official trophy.` };
  }
  return { ok: true, ids: [...ids].sort((a, b) => a - b), steps, format, unknown, total: doc.trophies.length };
}

function downloadJSON(text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'leonida-platinum-progress.json';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function exportPanel(doc, body) {
  const payload = buildPayload(doc);
  const json = JSON.stringify(payload, null, 2);

  const sum = el('div', 'iosum');
  sum.append(
    el('span', 'pill teal', `${payload.totals.earned} earned`),
    el('span', 'pill', `${payload.totals.trophies - payload.totals.earned} unearned`),
    el('span', 'pill', `${Object.keys(payload.steps).length} step lists`),
    el('span', 'pill gold', 'localStorage → file'),
  );

  const area = el('textarea', 'iojson');
  area.readOnly = true;
  area.spellcheck = false;
  area.value = json;
  area.setAttribute('aria-label', 'Exported progress JSON preview');

  const actions = el('div', 'ioactions');
  const download = el('button', 'btn primary', 'Download .json');
  download.type = 'button';
  download.addEventListener('click', () => downloadJSON(json));
  const copy = el('button', 'btn', 'Copy JSON');
  copy.type = 'button';
  copy.addEventListener('click', () => {
    area.select();
    const done = () => { copy.textContent = 'Copied'; };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(json).then(done).catch(() => { document.execCommand('copy'); done(); });
    else { document.execCommand('copy'); done(); }
  });
  actions.append(download, copy);
  body.append(sum, area, actions, el('p', 'ionote', 'Written on this device · nothing is uploaded'));
}

function importPanel(doc, body) {
  const drop = el('label', 'drop');
  drop.append(document.createTextNode('Choose a .json backup or drop it here'));
  const file = el('input');
  file.type = 'file';
  file.accept = 'application/json,.json';
  file.className = 'hidden';
  drop.append(file);
  body.append(drop);

  const area = el('textarea', 'iojson');
  area.placeholder = '…or paste the backup JSON here';
  area.spellcheck = false;
  area.setAttribute('aria-label', 'Backup JSON to import');
  area.style.height = '158px';

  const status = el('div', 'iostatus', 'Paste a backup or choose a file; nothing changes until you confirm.');
  const actions = el('div', 'importrow');
  const apply = el('button', 'btn primary', 'Validate & import');
  apply.type = 'button';
  apply.disabled = true;

  const evaluate = () => {
    const result = parseBackup(area.value, doc);
    status.className = 'iostatus';
    apply.disabled = !result.ok;
    if (!area.value.trim()) {
      status.textContent = 'Paste a backup or choose a file; nothing changes until you confirm.';
      return;
    }
    if (!result.ok) {
      status.classList.add('err');
      status.textContent = result.error;
      return;
    }
    status.classList.add('ok');
    const ignored = result.unknown ? ` · ${result.unknown} ignored` : '';
    status.textContent = `Valid ${result.format} · ${result.ids.length} of ${result.total} trophies · ${Object.keys(result.steps).length} step lists${ignored}`;
    apply.onclick = () => {
      replaceProgress(result.ids, result.steps);
      status.className = 'iostatus ok';
      status.innerHTML = `Imported <b>${result.ids.length} of ${result.total}</b> trophies. The tracker, counters and roadmap updated immediately.`;
      apply.disabled = true;
    };
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

  actions.append(apply, el('span', 'ionote', 'Replaces current ticks'));
  body.append(area, actions, status);
}

export function renderIO(doc) {
  const body = document.getElementById('io-body');
  const tabs = document.querySelectorAll('.iotabs button');
  body.replaceChildren();
  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.io === state.io));
  if (state.io === 'import') importPanel(doc, body);
  else exportPanel(doc, body);
}

export function setIOTab(doc, tab) {
  state.io = tab;
  renderIO(doc);
}

export function openIO(doc, tab) {
  state.io = tab;
  document.getElementById('backdrop').classList.remove('hidden');
  renderIO(doc);
  document.getElementById('io-close').focus({ preventScroll: true });
}

export function closeIO() {
  document.getElementById('backdrop').classList.add('hidden');
  saveProgress();
}
