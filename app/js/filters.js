// Filter and spoiler rules. Counts are split honestly: "Missable" is the one
// confirmed loss; "Chapter Saves" are the ten chapter-boundary checkpoints.
export const FILTERS = [
  { id: 'all', label: 'All', kind: 'all' },
  { id: 'story', label: 'Story', kind: 'cat' },
  { id: 'missable', label: 'Missable', kind: 'flag' },
  { id: 'saves', label: 'Chapter Saves', kind: 'flag' },
  { id: 'collectibles', label: 'Collectibles', kind: 'cat' },
  { id: 'activities', label: 'Activities', kind: 'cat' },
  { id: 'online', label: 'Online', kind: 'cat' },
  { id: 'hidden', label: 'Hidden', kind: 'flag' },
  { id: 'unearned', label: 'Unearned', kind: 'flag' },
];

export function countFor(id, trophies, earned) {
  if (id === 'all') return trophies.length;
  if (id === 'unearned') return trophies.filter((t) => !earned.has(t.id)).length;
  if (id === 'missable') return trophies.filter((t) => t.missable).length;
  if (id === 'saves') return trophies.filter((t) => t.missableNote && !t.missable).length;
  if (id === 'hidden') return trophies.filter((t) => t.hidden).length;
  return trophies.filter((t) => t.category === id).length;
}

export function filterTrophies(trophies, state) {
  const query = state.query.trim().toLowerCase();
  return trophies.filter((t) => {
    if (state.cats.size && !state.cats.has(t.category)) return false;
    if (state.flags.has('missable') && !t.missable) return false;
    if (state.flags.has('saves') && !(t.missableNote && !t.missable)) return false;
    if (state.flags.has('hidden') && !t.hidden) return false;
    if (state.flags.has('unearned') && state.earned.has(t.id)) return false;
    if (!query) return true;
    return [t.name, t.description, t.guide, t.missableNote, t.steps.join(' ')].join(' ').toLowerCase().includes(query);
  });
}

/** True while a story or hidden trophy's identity stays behind the spoiler shield. */
export function isMasked(trophy, state) {
  if (!state.spoiler || state.earned.has(trophy.id) || state.peek.has(trophy.id)) return false;
  return Boolean(trophy.hidden) || trophy.category === 'story';
}

export function maskName(trophy) {
  return trophy.category === 'story' ? 'Hidden story trophy' : 'Hidden trophy';
}

export const MASK_DESCRIPTION = 'Spoiler shielded — press Peek to reveal the name, description and cited guide.';
