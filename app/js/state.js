// Browser-local state (earned, steps, counters, selection, spoilers) in localStorage; `saved` feeds the badge.
const KEY = 'lpc.v1';

export const state = {
  earned: new Set(), steps: {}, counters: {}, spoiler: false, peek: new Set(), query: '',
  cats: new Set(), flags: new Set(), selected: 28, view: 'tracker',
  pane: 'detail', ioMode: 'export', autoScroll: false, saved: 'ok',
};
const listeners = new Set();

/** Expand trophies.json: source keys become catalog objects, a step [text, ...cites] becomes { text, cites }. */
export function hydrate(doc) {
  doc.sources = Object.entries(doc.sourceCatalog).map(([key, s]) => ({ key, ...s }));
  const byKey = new Map(doc.sources.map((s) => [s.key, s]));
  for (const t of doc.trophies) {
    t.sources = t.sources.map((key) => byKey.get(key));
    t.steps = t.steps.map(([text, ...cites]) => ({ text, cites }));
  }
  return doc;
}
const ints = (list) => (Array.isArray(list) ? list.filter(Number.isInteger) : []);

/** Read saved progress; unreadable data is reported on the badge and replaced at the next save. */
export function loadProgress() {
  let raw;
  try { raw = JSON.parse(localStorage.getItem(KEY) ?? 'null'); }
  catch { state.saved = 'recovered'; return; }
  if (!raw || typeof raw !== 'object') return;
  state.earned = new Set(ints(raw.earned));
  for (const [id, list] of Object.entries(raw.steps ?? {})) state.steps[id] = ints(list).sort((a, b) => a - b);
  for (const [k, n] of Object.entries(raw.counters ?? {})) if (Number.isInteger(n) && n > 0) state.counters[k] = n;
  if (typeof raw.spoiler === 'boolean') state.spoiler = raw.spoiler;
  if (Number.isInteger(raw.selected)) state.selected = raw.selected;
}

export function saveProgress() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      v: 1, earned: [...state.earned].sort((a, b) => a - b), steps: state.steps, counters: state.counters,
      spoiler: state.spoiler, selected: state.selected,
    }));
    state.saved = 'ok';
  } catch { state.saved = 'off'; }
}

export function subscribe(fn) { listeners.add(fn); }
export function emit() { for (const fn of listeners) fn(); }
export const commit = () => { saveProgress(); emit(); };

export function toggleEarned(id) {
  state.earned.has(id) ? state.earned.delete(id) : state.earned.add(id);
  commit();
}

export function select(id) {
  state.selected = id;
  state.pane = 'detail';
  state.autoScroll = true;
  commit();
}

export function openTrophy(id) { state.view = 'tracker'; select(id); }
export function setView(view) { state.view = view; emit(); }

export function setPane(pane, ioMode = 'export') {
  state.pane = pane;
  state.ioMode = ioMode;
  if (pane === 'io') state.view = 'tracker';
  emit();
}

/** The spoiler switch: story and hidden trophies stay masked until earned or peeked. */
export function toggleSpoilerShield(on = !state.spoiler) {
  state.spoiler = on;
  state.peek.clear();
  commit();
}

export function togglePeek(id) {
  state.peek.has(id) ? state.peek.delete(id) : state.peek.add(id);
  emit();
}

export function isStepDone(id, index) { return (state.steps[id] ?? []).includes(index); }

export function toggleStep(id, index) {
  const list = new Set(state.steps[id] ?? []);
  list.has(index) ? list.delete(index) : list.add(index);
  state.steps[id] = [...list].sort((a, b) => a - b);
  commit();
}

export function replaceProgress(ids, steps = {}, counters = {}) {
  state.earned = new Set(ids);
  state.steps = steps;
  state.counters = counters;
  state.peek.clear();
  commit();
}

export function resetProgress() {
  state.selected = 28;
  state.pane = 'detail';
  state.autoScroll = true;
  replaceProgress([]);
}
