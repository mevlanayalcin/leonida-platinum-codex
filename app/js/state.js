// Browser-local tracker state: earned trophies, checked steps, selection and the spoiler
// setting persist in localStorage; nothing leaves this browser.
const KEY = 'lpc.v1';

export const state = {
  earned: new Set(), steps: {}, spoiler: false, peek: new Set(), query: '',
  cats: new Set(), flags: new Set(), selected: 28, view: 'tracker',
  pane: 'detail', ioMode: 'export', autoScroll: false,
};
const listeners = new Set();
const ints = (list) => (Array.isArray(list) ? list.filter(Number.isInteger) : []);

export function loadProgress() {
  let raw;
  try { raw = JSON.parse(localStorage.getItem(KEY) ?? 'null'); }
  catch (err) { console.warn('Codex: local progress unreadable.', err); return; }
  if (!raw || typeof raw !== 'object') return;
  state.earned = new Set(ints(raw.earned));
  for (const [id, list] of Object.entries(raw.steps ?? {})) state.steps[id] = ints(list).sort((a, b) => a - b);
  if (typeof raw.spoiler === 'boolean') state.spoiler = raw.spoiler;
  if (Number.isInteger(raw.selected)) state.selected = raw.selected;
}

export function saveProgress() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      v: 1, earned: [...state.earned].sort((a, b) => a - b), steps: state.steps,
      spoiler: state.spoiler, selected: state.selected,
    }));
  } catch (err) { console.warn('Codex: progress could not be saved.', err); }
}

export function subscribe(fn) { listeners.add(fn); }
export function emit() { for (const fn of listeners) fn(); }
const commit = () => { saveProgress(); emit(); };

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

/** Peek one masked trophy, or hide it again. */
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

export function replaceProgress(ids, steps = {}) {
  state.earned = new Set(ids);
  state.steps = steps;
  state.peek.clear();
  commit();
}

export function resetProgress() {
  state.selected = 28;
  state.pane = 'detail';
  state.autoScroll = true;
  replaceProgress([]);
}
