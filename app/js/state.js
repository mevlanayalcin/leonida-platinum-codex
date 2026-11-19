const KEY = 'lpc.v1';

export const state = {
  earned: new Set(),
  steps: {},
  spoiler: false,
  peek: new Set(),
  query: '',
  cats: new Set(),
  flags: new Set(),
  sort: 'official',
  selected: 28,
  view: 'tracker',
  io: 'export',
  autoScroll: true,
};

const listeners = new Set();

export function loadProgress() {
  let raw;
  try {
    raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch (err) {
    console.warn('Codex: local progress was unreadable, starting fresh.', err);
    return;
  }
  if (!raw || typeof raw !== 'object') return;
  if (Array.isArray(raw.earned)) {
    state.earned = new Set(raw.earned.filter((id) => Number.isInteger(id)));
  }
  if (raw.steps && typeof raw.steps === 'object') {
    for (const [id, list] of Object.entries(raw.steps)) {
      if (Array.isArray(list)) state.steps[id] = list.filter((i) => Number.isInteger(i)).sort((a, b) => a - b);
    }
  }
  if (typeof raw.spoiler === 'boolean') state.spoiler = raw.spoiler;
  if (Number.isInteger(raw.selected)) state.selected = raw.selected;
  if (raw.sort === 'grade' || raw.sort === 'official') state.sort = raw.sort;
  state.autoScroll = true;
}

export function saveProgress() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      v: 1,
      earned: [...state.earned].sort((a, b) => a - b),
      steps: state.steps,
      spoiler: state.spoiler,
      selected: state.selected,
      sort: state.sort,
    }));
  } catch (err) {
    console.warn('Codex: progress could not be written to localStorage.', err);
  }
}

export function subscribe(fn) { listeners.add(fn); }
export function emit() { for (const fn of listeners) fn(); }

export function toggleEarned(id) {
  if (state.earned.has(id)) state.earned.delete(id);
  else state.earned.add(id);
  saveProgress();
  emit();
}

export function select(id) {
  state.selected = id;
  state.autoScroll = true;
  saveProgress();
  emit();
}

export function setView(view) {
  state.view = view;
  emit();
}

export function setSpoiler(on) {
  state.spoiler = on;
  if (!on) state.peek.clear();
  saveProgress();
  emit();
}

export function reveal(id) {
  state.peek.add(id);
  emit();
}

export function isStepDone(id, index) {
  return (state.steps[String(id)] ?? []).includes(index);
}

export function toggleStep(id, index) {
  const key = String(id);
  const list = new Set(state.steps[key] ?? []);
  if (list.has(index)) list.delete(index);
  else list.add(index);
  state.steps[key] = [...list].sort((a, b) => a - b);
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

export function resetProgress() {
  state.earned.clear();
  state.steps = {};
  state.peek.clear();
  state.selected = 28;
  saveProgress();
  emit();
}

