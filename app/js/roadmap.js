// Platinum Roadmap: three big stage cards (story & missables, collectibles & 100%, activities & clean-up) and the
// collectible counts on the left; Missable Guardrails, the ten chapter save slots and A Long Road's 100% counters
// on the right. Counts come from trophies.json; every stage line and box carries its outlet chips.
import { el, btn, css, medal, citePill } from './dom.js';
import { state, openTrophy } from './state.js';
import { isMasked, maskName } from './filters.js';
import { computeNextUpTrophies, passedWindow, stepper, longRoad, STAGES, POINTS } from './codex.js';

// [stage, hours, what to do, cite keys]: hours are PowerPyx's split of its ~200 h estimate.
const PLAN = [
  [1, '60–80 h', 'Play Chapters 1–5 once: there is no mission replay. Do Lucia\'s Ch.1 balcony meditation and Yago\'s timed Ch.3 race when they appear.', ['PPX', 'GC']],
  [2, '~100 h', 'Work A Long Road\'s 100% checklist: meditations, range golds, stunts, missions, vehicles, animals and challenges.', ['PPX', 'I100']],
  [3, '~10 h', 'Finish the Strangers & Freaks strands, heists and one-off activities, then clean up; the platinum pops last.', ['PPX', 'OL']],
];
// [label, trophy id, checklist label or null]: counts read from the trophy or from A Long Road's checklist.
const COUNTS = [['Meditation', 28], ['Ranges', 17], ['Stunts', 15], ['Missions', 14, 'Missions'], ['Vehicles', 14, 'Vehicles'],
  ['Animals', 14, 'Animals'], ['Challenges', 32]];

const nameOf = (t) => (isMasked(t, state) ? maskName(t) : t.name);
const pills = (keys, sources) => el('span', 'rcites', ...keys.map((k) => citePill(k, sources)));

function stageCard([stage, hours, text, keys], doc) {
  const all = doc.trophies.filter((t) => t.stage === stage);
  const won = all.filter((t) => state.earned.has(t.id)).length;
  const next = computeNextUpTrophies(all, state.earned, 7);
  const bar = el('div', 'rbar', el('em'));
  bar.firstChild.style.width = `${(won / all.length) * 100}%`;
  const pts = all.reduce((p, t) => p + POINTS[t.grade], 0);
  const list = el('ul', 'rlist', ...next.map((t) => {
    const b = btn(`rtro${t.missable ? ' miss' : ''}`, null, () => openTrophy(t.id));
    b.innerHTML = medal(t.grade, 17);
    b.append(nameOf(t));
    if (t.missable) b.append(el('span', 'flag missable', t.missableChapter));
    return el('li', null, b);
  }));
  const more = all.length - won - next.length;
  return el('section', `stage s${stage}`,
    el('header', 'sband', el('span', null, `Stage ${stage} · ${STAGES[stage][1]}`), el('h2', null, STAGES[stage][0])),
    el('div', 'sbody', el('div', 'sstat', el('b', null, `${won}/${all.length}`), el('span', null, `earned · ${pts} pts`), el('span', 'shrs', hours)), bar,
      el('p', 'stext', text, ' ', pills(keys, doc.sources)), list,
      el('div', 'smore', more > 0 ? `+${more} more unearned` : won === all.length ? '✓ Stage complete' : '',
        next[0] ? btn('btn primary', 'Next up →', () => openTrophy(next[0].id)) : null)));
}

function countTile([label, id, item], byId, sources) {
  const t = byId.get(id);
  const row = item ? longRoad(t).find((r) => r.label === item) : null;
  const goal = row ? row.goal : t.count;
  const key = row ? row.key : `t${id}`;
  const cite = row ? row.cite : t.steps[0]?.cites[0] ?? t.sources[0].key;
  return el('div', 'ctile', el('b', null, goal.toLocaleString('en-US')), el('span', null, label),
    el('small', null, `${(state.counters[key] ?? 0).toLocaleString('en-US')} logged`), citePill(cite, sources));
}

function guardrails(doc) {
  const passed = new Set(passedWindow(doc.trophies, state.earned).map((p) => p.t.id));
  const panel = doc.conflicts.find((c) => c.id === 'missables');
  return el('section', 'guard', el('h3', null, '⚠ Missable guardrails'),
    ...doc.trophies.filter((t) => t.missable).sort((a, b) => a.missableChapter.localeCompare(b.missableChapter)).map((t) => {
      const won = state.earned.has(t.id);
      const go = btn('gname', nameOf(t), () => openTrophy(t.id));
      return el('div', `grow${won ? ' won' : passed.has(t.id) ? ' gone' : ''}`, el('span', 'gch', t.missableChapter),
        el('div', null, go, el('b', 'gwhat', won ? '✓ Earned · safe' : passed.has(t.id) ? 'Window may have closed' : t.missableLabel),
          el('p', null, isMasked(t, state) ? 'Shielded: peek in the tracker.' : t.missableShort, ' ', pills(t.missableCites, t.sources))));
    }),
    panel ? el('p', 'gcall', panel.call, ' ', pills([...new Set(panel.sides.flatMap(([k]) => k))], doc.sources)) : null);
}

function saves(doc) {
  const slots = doc.trophies.filter((t) => t.saveSlot).sort((a, b) => a.saveSlot - b.saveSlot);
  return el('section', 'saves', el('h3', 'rsec', 'Chapter saves · point of no return', ' ', pills(['PPX'], doc.sources)),
    el('div', 'sgrid', ...slots.map((t) => {
      const note = state.spoiler && !state.earned.has(t.id) ? t.saveNote.split(' · ')[0] : t.saveNote;
      const b = btn(`slot${state.earned.has(t.id) ? ' won' : ''}`, null, () => openTrophy(t.id));
      b.append(el('b', null, `S${t.saveSlot}`), note);
      b.title = `${nameOf(t)} · keep this manual save`;
      return b;
    })));
}

/** Draw the roadmap into `host` and the guardrail column into `side`. */
export function renderRoadmap(host, side, doc) {
  const byId = new Map(doc.trophies.map((t) => [t.id, t]));
  const r = doc.roadmap;
  const longRoadT = byId.get(14);
  host.replaceChildren(
    el('header', 'rhead', el('div', null, el('span', 'eyebrow', '3 stages · all 55 trophies'), el('h2', null, 'Platinum Roadmap')),
      el('div', 'rmeta', ...[`~${r.hours.replace('~', '')} h`, `${r.playthroughs} playthrough`, `${r.online} online`, r.missionReplay ? 'mission replay' : 'no mission replay', `difficulty ${r.difficulty}`]
        .map((x) => el('span', null, x)), pills(['PPX'], doc.sources))),
    el('div', 'stages', ...PLAN.map((p) => stageCard(p, doc))),
    el('section', 'counts', el('h3', 'rsec', 'Collectible counts'), el('div', 'cgrid', ...COUNTS.map((c) => countTile(c, byId, doc.sources)))));
  side.replaceChildren(guardrails(doc), saves(doc),
    el('section', 'alrbox', el('h3', 'rsec', `${nameOf(longRoadT)} · 100% counters`, ' ', pills(['PPX', 'I100'], doc.sources)),
      el('div', 'agrid', ...longRoad(longRoadT).map((c) => stepper(c.key, c.goal, c.label, c.unit)))));
}

css('#roadmap-view:not(.hidden){display:grid;grid-template-columns:minmax(0,1fr) 410px;gap:12px}'
  + '.roadmap{display:flex;flex-direction:column;gap:10px;min-height:0}.rmside{display:flex;flex-direction:column;gap:10px;min-height:0;overflow-y:auto}'
  + '.rhead{display:flex;justify-content:space-between;align-items:flex-end;gap:12px}.rhead h2{font-size:26px;font-weight:900}'
  + '.rmeta{display:flex;gap:5px;justify-content:flex-end;align-items:center}.rmeta>span{padding:3px 9px;border-radius:8px;background:#ffffff12;font-size:12.5px;font-weight:800}'
  + '.stages{flex:1;min-height:0;display:grid;grid-template-columns:repeat(3,1fr);gap:10px}'
  + '.stage{--c:#ff5c8a;display:flex;flex-direction:column;min-height:0;border:2px solid var(--c);border-radius:14px;background:#111a2d;overflow:hidden}.s2{--c:#38e3cf}.s3{--c:#ffc061}'
  + '.sband{padding:9px 14px 10px;background:var(--c);color:#0a0d18}.sband span{font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.sband h2{font-size:22px;font-weight:900}'
  + '.sbody{flex:1;min-height:0;display:flex;flex-direction:column;gap:7px;padding:10px 14px 12px}'
  + '.sstat{display:flex;align-items:baseline;gap:7px}.sstat b{font-size:24px;color:#fff}.sstat span{font-size:12.5px;color:var(--muted)}.sstat .shrs{margin-left:auto;padding:2px 8px;border-radius:7px;background:color-mix(in srgb,var(--c) 22%,transparent);color:#fff;font-weight:850}'
  + '.rbar{height:7px;border-radius:4px;background:#ffffff14}.rbar em{display:block;height:100%;border-radius:4px;background:var(--c)}'
  + '.stext{margin:0;font-size:13.5px;line-height:1.5}.rcites{display:inline-flex;flex-wrap:wrap;gap:3px}'
  + '.rlist{flex:1;min-height:0;overflow:hidden;margin:0;padding:0;list-style:none}.rtro{display:flex;align-items:center;gap:7px;width:100%;padding:3px 2px;font-size:13.5px;font-weight:700;text-align:left;border-bottom:1px solid var(--line2)}'
  + '.rtro:hover{color:var(--c)}.rtro .flag{margin-left:auto;height:18px}'
  + '.smore{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:12px;color:var(--dim)}.smore .btn{height:30px;background:var(--c);border-color:var(--c);color:#0a0d18}'
  + '.rsec{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin:0 0 5px;font-size:12.5px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--lagoon)}'
  + '.counts{padding:10px 14px;border:1px solid var(--line);border-radius:14px;background:var(--panel)}.cgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:7px}'
  + '.ctile{display:grid;justify-items:start;gap:1px;padding:7px 10px;border-radius:10px;background:#ffffff0d}.ctile b{font-size:26px;line-height:1.05;font-weight:900;color:#fff}'
  + '.ctile span{font-size:13px;font-weight:850}.ctile small{font-size:11px;color:var(--dim);margin-bottom:3px}'
  + '.guard{padding:10px 14px;border:2px solid var(--crimson);border-radius:14px;background:linear-gradient(160deg,#ff3b5c3d,#2a0f1d)}.guard h3{margin:0 0 4px;font-size:18px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#fff}'
  + '.grow{display:grid;grid-template-columns:50px minmax(0,1fr);gap:10px;align-items:center;padding:4px 0;border-top:1px solid #ff3b5c4d}'
  + '.gch{display:grid;place-items:center;height:40px;border-radius:10px;background:var(--crimson);color:#fff;font-size:16px;font-weight:900}.grow.won .gch{background:var(--lagoon);color:#03211d}'
  + '.gname{padding:0;font-size:16px;font-weight:880;text-align:left}.gwhat{display:block;font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:#ffb3c2}.grow.gone .gwhat{color:#ffc061}.grow.won .gwhat{color:#8dffb8}'
  + '.grow p{margin:2px 0 0;font-size:12.5px;color:#ffe3ea}.gcall{margin:4px 0 0;font-size:12px;color:#ffd0da}'
  + '.rsec .cite{text-transform:none;letter-spacing:0}.saves,.alrbox{padding:8px 12px;border:1px solid var(--line);border-radius:14px;background:var(--panel)}.sgrid{display:grid;grid-template-columns:1fr 1fr;gap:4px}'
  + '.slot{display:flex;align-items:center;gap:7px;padding:2px 7px;border-radius:8px;background:#8fb8ff14;font-size:11.5px;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  + '.slot b{flex:none;width:28px;padding:1px 0;border-radius:5px;background:#8fb8ff;color:#08101f;font-size:11px;text-align:center}.slot.won b{background:var(--lagoon)}'
  + '.agrid{display:grid;grid-template-columns:1fr 1fr;gap:4px}.agrid .stepper{gap:5px;padding:3px 6px 7px}.agrid .sbtn{width:22px;height:22px;font-size:14px}.agrid .sval{font-size:13px}.agrid .slabel{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}');
