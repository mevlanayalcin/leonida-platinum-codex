// Browser-local tracker state: progress, checked steps, selection and the spoiler
// setting persist in localStorage; nothing is sent anywhere.
const KEY = 'lpc.v1';

export const state = {
  earned: new Set(), steps: {}, spoiler: false, peek: new Set(), query: '',
  cats: new Set(), flags: new Set(), selected: 28, view: 'tracker',
  pane: 'detail', ioMode: 'export', autoScroll: false,
};
const listeners = new Set();

export function loadProgress() {
  let raw;
  try { raw = JSON.parse(localStorage.getItem(KEY) ?? 'null'); }
  catch (err) { console.warn('Codex: local progress unreadable.', err); return; }
  if (!raw || typeof raw !== 'object') return;
  if (Array.isArray(raw.earned)) state.earned = new Set(raw.earned.filter(Number.isInteger));
  if (raw.steps && typeof raw.steps === 'object') {
    for (const [id, list] of Object.entries(raw.steps)) {
      if (Array.isArray(list)) state.steps[id] = list.filter(Number.isInteger).sort((a, b) => a - b);
    }
  }
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

export function toggleEarned(id) {
  state.earned.has(id) ? state.earned.delete(id) : state.earned.add(id);
  saveProgress();
  emit();
}

export function select(id) {
  state.selected = id;
  state.pane = 'detail';
  state.autoScroll = true;
  saveProgress();
  emit();
}

export function openTrophy(id) { state.view = 'tracker'; select(id); }
export function setView(view) { state.view = view; emit(); }

export function setPane(pane, ioMode = 'export') {
  state.pane = pane;
  state.ioMode = ioMode;
  if (pane === 'io') state.view = 'tracker';
  emit();
}

/** One spoiler switch: mask unearned story and hidden trophies until earned or peeked. */
export function toggleSpoilerShield(on = !state.spoiler) {
  state.spoiler = on;
  if (!on) state.peek.clear();
  saveProgress();
  emit();
}

export function reveal(id) { state.peek.add(id); emit(); }
export function isStepDone(id, index) { return (state.steps[String(id)] ?? []).includes(index); }

export function toggleStep(id, index) {
  const list = new Set(state.steps[String(id)] ?? []);
  list.has(index) ? list.delete(index) : list.add(index);
  state.steps[String(id)] = [...list].sort((a, b) => a - b);
  saveProgress();
  emit();
}

export function resetProgress() {
  state.earned.clear();
  state.steps = {};
  state.peek.clear();
  state.selected = 28;
  state.pane = 'detail';
  state.autoScroll = true;
  saveProgress();
  emit();
}

export function replaceProgress(ids, steps) {
  state.earned = new Set(ids);
  state.steps = steps ?? {};
  state.peek.clear();
  saveProgress();
  emit();
}
