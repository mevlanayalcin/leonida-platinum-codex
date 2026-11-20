// Filter and spoiler rules. "Missable" holds the two flagged risks (the Ch.1 balcony meditation and
// Yago's timed Ch.3 race); "Chapter Saves" are the ten
// trophies that mark PowerPyx's start/end-of-chapter save slots.
export const FILTERS = [
  { id: 'all', label: 'All', kind: 'all' },
  { id: 'story', label: 'Story', kind: 'cat' },
  { id: 'missable', label: 'Missable', kind: 'flag', test: (t) => t.missable },
  { id: 'saves', label: 'Chapter Saves', kind: 'flag', test: (t) => Boolean(t.saveSlot) },
  { id: 'collectibles', label: 'Collectibles', kind: 'cat' },
  { id: 'activities', label: 'Activities', kind: 'cat' },
  { id: 'online', label: 'Online', kind: 'cat' },
  { id: 'hidden', label: 'Hidden', kind: 'flag', test: (t) => t.hidden },
  { id: 'unearned', label: 'Unearned', kind: 'flag', test: (t, s) => !s.earned.has(t.id) },
];
const byId = new Map(FILTERS.map((f) => [f.id, f]));

export function countFor(id, trophies, state) {
  const f = byId.get(id);
  if (f.kind === 'all') return trophies.length;
  return trophies.filter((t) => (f.kind === 'cat' ? t.category === id : f.test(t, state))).length;
}

export function filterByKind(trophies, state) {
  const query = state.query.trim().toLowerCase();
  return trophies.filter((t) => {
    if (state.cats.size && !state.cats.has(t.category)) return false;
    for (const id of state.flags) if (!byId.get(id).test(t, state)) return false;
    if (!query) return true;
    if (isMasked(t, state)) return false;
    const text = [t.name, t.description, t.guide, t.missableNote, ...t.steps.map((s) => `${s.text} ${s.cite}`)];
    return text.join(' ').toLowerCase().includes(query);
  });
}

/** True while a story or hidden trophy stays behind the spoiler shield: Spoiler Mode on,
 *  not earned, and not peeked. Earned trophies are never shielded. */
export function isMasked(trophy, state) {
  if (!state.spoiler || state.earned.has(trophy.id) || state.peek.has(trophy.id)) return false;
  return Boolean(trophy.hidden) || trophy.category === 'story';
}

export const isShieldable = (trophy) => Boolean(trophy.hidden) || trophy.category === 'story';
export const maskName = (trophy) => (trophy.category === 'story' ? 'Hidden story trophy' : 'Hidden trophy');
export const MASK_DESCRIPTION = 'Spoiler shielded until earned · press Peek to read it';
