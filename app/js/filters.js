// Filter, sort and spoiler-shield rules shared by the list, drawer and roadmap.
export const FILTERS = [
  { id: 'all', label: 'All', kind: 'all' },
  { id: 'story', label: 'Story', kind: 'cat' },
  { id: 'missable', label: 'Missable', kind: 'flag' },
  { id: 'collectibles', label: 'Collectibles', kind: 'cat' },
  { id: 'activities', label: 'Activities', kind: 'cat' },
  { id: 'online', label: 'Online', kind: 'cat' },
  { id: 'hidden', label: 'Hidden', kind: 'flag' },
  { id: 'unearned', label: 'Unearned', kind: 'flag' },
];

export const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
export const CATEGORY_LABEL = {
  platinum: 'Platinum',
  story: 'Story',
  collectibles: 'Collectibles',
  activities: 'Activities',
};

export function countFor(id, trophies, earned) {
  if (id === 'all') return trophies.length;
  if (id === 'unearned') return trophies.filter((t) => !earned.has(t.id)).length;
  if (id === 'missable') return trophies.filter((t) => t.missable || t.missableNote).length;
  if (id === 'hidden') return trophies.filter((t) => t.hidden).length;
  return trophies.filter((t) => t.category === id).length;
}

export function isFiltered(state) {
  return state.cats.size > 0 || state.flags.size > 0 || Boolean(state.query.trim());
}

export function visible(trophy, state) {
  if (state.cats.size && !state.cats.has(trophy.category)) return false;
  if (state.flags.has('missable') && !(trophy.missable || trophy.missableNote)) return false;
  if (state.flags.has('hidden') && !trophy.hidden) return false;
  if (state.flags.has('unearned') && state.earned.has(trophy.id)) return false;
  const query = state.query.trim().toLowerCase();
  if (query) {
    const haystack = [trophy.name, trophy.description, trophy.guide, trophy.missableNote, trophy.steps.join(' ')].join(' ').toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  return true;
}

export function sortTrophies(trophies, mode) {
  const list = [...trophies];
  if (mode === 'grade') {
    list.sort((a, b) => (GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade]) || (a.id - b.id));
  } else {
    list.sort((a, b) => a.id - b.id);
  }
  return list;
}

/** True while a trophy's story/hidden identity must stay behind the spoiler shield. */
export function isMasked(trophy, state) {
  if (!state.spoiler) return false;
  if (state.earned.has(trophy.id) || state.peek.has(trophy.id)) return false;
  return Boolean(trophy.hidden) || trophy.category === 'story';
}

export function maskTitle(trophy) {
  return trophy.category === 'story' ? 'Hidden story trophy' : 'Hidden trophy';
}

export const MASK_DESCRIPTION = 'Shielded by Spoiler Mode. Reveal to read the description and walkthrough.';
