// Filter and spoiler rules. "Missable": the two flagged risks; "Conflicts": trophies named by a disagreement
// panel; "Saves": the ten trophies marking PowerPyx's chapter save slots.
export const FILTERS = [
  { id: 'all', label: 'All', kind: 'all' },
  { id: 'story', label: 'Story', kind: 'cat' },
  { id: 'missable', label: 'Missable', kind: 'flag', test: (t) => t.missable },
  { id: 'conflicts', label: 'Conflicts', kind: 'flag', test: (t) => t.conflicts.length > 0 },
  { id: 'saves', label: 'Saves', kind: 'flag', test: (t) => Boolean(t.saveSlot) },
  { id: 'collectibles', label: 'Collectibles', kind: 'cat' },
  { id: 'activities', label: 'Activities', kind: 'cat' },
  { id: 'online', label: 'Online', kind: 'cat' },
  { id: 'hidden', label: 'Hidden', kind: 'flag', test: (t) => t.hidden },
  { id: 'unearned', label: 'Unearned', kind: 'flag', test: (t, s) => !s.earned.has(t.id) },
];
const byId = new Map(FILTERS.map((f) => [f.id, f]));
const matches = (f, t, state) => (f.kind === 'cat' ? t.category === f.id : f.test(t, state));

export function countFor(id, trophies, state) {
  const f = byId.get(id);
  return f.kind === 'all' ? trophies.length : trophies.filter((t) => matches(f, t, state)).length;
}

/** Categories OR together, flags AND together; search reads name, text, guide, steps and outlets of unmasked rows. */
export function filterByKind(trophies, state) {
  const query = state.query.trim().toLowerCase();
  return trophies.filter((t) => {
    if (state.cats.size && !state.cats.has(t.category)) return false;
    for (const id of state.flags) if (!byId.get(id).test(t, state)) return false;
    if (!query) return true;
    if (isMasked(t, state)) return false;
    return [t.name, t.description, t.guide, t.missableNote, ...t.steps.map((s) => s.text), ...t.sources.map((s) => s.label)]
      .join(' ').toLowerCase().includes(query);
  });
}

export const isShieldable = (t) => Boolean(t.hidden) || t.category === 'story';

/** Shielded while Spoiler Mode is on, unless earned or peeked. */
export const isMasked = (t, state) => state.spoiler && !state.earned.has(t.id) && !state.peek.has(t.id) && isShieldable(t);

export const maskName = (t) => (t.category === 'story' ? 'Hidden story trophy' : 'Hidden trophy');
export const MASK_DESCRIPTION = 'Spoiler shielded until earned · press Peek to read it';
