// Platinum Roadmap: the story and point-of-no-return timeline, three phases mapping all 55 trophies (completion
// bar + Next jump each), and Missable & Save Guardrails above the source matrix and the 20 disagreement panels.
import { el, btn, css, medal, citePill, CHECKED } from './dom.js';
import { state, openTrophy } from './state.js';
import { isMasked, maskName } from './filters.js';
import { appendCited } from './detail.js';
import { sourceMatrix, disputeChips } from './verify.js';
import { computeNextUpTrophies } from './codex.js';

const STAGES = [
  { n: 1, title: 'Story + Ch.1 / Ch.3 missables', tone: '#ff5c8a',
    line: 'Save at every chapter start and end (PPX); clear both flagged windows on sight (BEE, GC).' },
  { n: 2, title: '100% checklist, vaults, ranges, stunts', tone: '#38e3cf',
    line: 'After the credits: 100 optional missions, 200 vehicles, 100 animals, 300 stunts, 70 challenges (PPX, I100).' },
  { n: 3, title: 'Strangers, collectibles & clean-up', tone: '#ffc061',
    line: 'Strangers & Freaks sit outside 100%: sweep them and the one-offs last (PPX).',
    groups: [['strangers', 'Strangers'], ['world', 'Collectibles & World'], ['activities', 'Activities & Combat'], ['platinum', 'Platinum']] },
];
// Per chapter: story trophies in play order, the missable whose window it closes, what it opens for free roam.
const CHAPTERS = [
  { n: 1, story: [2, 3], risk: 28, opens: [[20, "Feng Shui: Cal's fishing"], [23, "Island Dreams: Kenton's dives"]] },
  { n: 2, story: [8, 4], opens: [[33, 'Coffee Break: partner free roam'], [24, 'Billy & Bret strands'], [54, 'Daily Driver: garages']] },
  { n: 3, story: [9, 5], risk: 25, opens: [[5, 'Andy, Randy & Tyrone strands'], [39, 'Key Cloner & Snap Gun']] },
  { n: 4, story: [10, 11, 12, 6], opens: [[40, 'Money Is…: vaults & trucks']] },
  { n: 5, story: [13, 7], opens: [[7, 'Slot 10: the pre-finale save']] },
  { n: 0, story: [], opens: [[14, '100% checklist opens'], [25, 'Strangers & leftovers'], [1, 'Platinum']] },
];
const FACTS = [['55/55', 'mapped'], ['~200 h', 'PowerPyx'], ['300+ h', 'Push Square'], ['1', 'playthrough'], ['0', 'online'], ['No', 'mission replay']];

const label = (t) => (isMasked(t, state) ? maskName(t) : t.name);

function trophyPill(t, extra = '') {
  const pill = btn(`tpill${state.earned.has(t.id) ? ' won' : ''}${extra}`, null, () => openTrophy(t.id));
  pill.innerHTML = medal(t.grade, 13);
  pill.append(label(t));
  return pill;
}

const chapterDone = (doc, n) => doc.trophies.some((t) => t.description === `Complete Chapter ${n}.` && state.earned.has(t.id)) || (n === 5 && state.earned.has(7));

/** Six nodes (Ch.1-5, post-game), a fill to the last finished chapter, save-slot ticks, coral flags where a
 *  missable window closes. */
function trackSVG(doc, byId) {
  const x = (i) => 100 + i * 200;
  const done = CHAPTERS.slice(0, 5).filter((c) => chapterDone(doc, c.n)).length;
  let g = `<line x1="${x(0)}" y1="24" x2="${x(5)}" y2="24" class="tk"/><line x1="${x(0)}" y1="24" x2="${x(done)}" y2="24" class="tf"/>`;
  CHAPTERS.forEach((c, i) => {
    const cx = x(i);
    if (c.n) {
      const [s1, s2] = c.story.map((id) => byId.get(id).saveSlot).filter(Boolean).sort((a, b) => a - b);
      for (const [dx, slot] of [[-62, s1], [62, s2]]) g += `<rect x="${cx + dx - 13}" y="15" width="26" height="18" rx="5" class="sv"/><text x="${cx + dx}" y="28" class="svt">S${slot}</text>`;
      if (c.risk) g += `<path d="M${cx + 34} 4v32" class="pr"/><path d="M${cx + 34} 4h16l-5 6 5 6h-16z" class="pf"/>`;
    }
    const now = !c.n ? (done === 5 ? 'now' : 'next') : chapterDone(doc, c.n) ? 'done' : i === done ? 'now' : 'next';
    g += c.n ? `<circle cx="${cx}" cy="24" r="15" class="nd ${now}"/><text x="${cx}" y="29.5" class="ndt">${c.n}</text>`
      : `<path d="M${cx} 8 ${cx + 16} 24 ${cx} 40 ${cx - 16} 24Z" class="nd ${now}"/><text x="${cx}" y="29" class="ndt">P</text>`;
  });
  return `<svg class="tltrack" viewBox="0 2 1200 40" preserveAspectRatio="none" role="img" aria-label="Story timeline: ${done} of 5 chapters finished">${g}</svg>`;
}

function chapterColumn(c, doc, byId) {
  const col = el('div', `tlcol${c.n && chapterDone(doc, c.n) ? ' done' : ''}`, el('div', 'tlname', c.n ? `Chapter ${c.n}` : 'Post-game free roam'));
  for (const t of c.story.map((id) => byId.get(id))) {
    const b = trophyPill(t, ' tlp');
    if (t.saveSlot) b.title = `Save slot ${t.saveSlot}: ${t.saveNote}`;
    col.append(b);
  }
  if (c.risk) {
    const t = byId.get(c.risk);
    col.append(btn(`tlrisk${state.earned.has(t.id) ? ' won' : ''}`, el('b', null, `⚑ ${t.name}`), () => openTrophy(t.id)));
    col.lastChild.append(el('i', null, t.missableShort));
  }
  for (const [id, text] of c.opens) {
    const line = btn('tlopen', el('span', null, c.n ? '↳ ' : '◆ '), () => openTrophy(id));
    line.append(text);
    line.title = `${label(byId.get(id))} (PowerPyx)`;
    col.append(line);
  }
  if (!c.n) col.append(appendCited(el('p', 'tlnote'), 'S1-S10 chapter saves, no mission replay (PPX) · ⚑ window closes (BEE, GC)', doc.sources));
  return col;
}

function renderTimeline(host, doc) {
  const byId = new Map(doc.trophies.map((t) => [t.id, t]));
  const facts = el('div', 'facts', ...FACTS.map(([big, small]) => el('span', big === '55/55' ? 'fact key' : 'fact', el('b', null, big), ` ${small}`)));
  const card = el('section', 'tline', el('div', 'tlhead', el('div', null, el('span', 'eyebrow', `Story & point-of-no-return timeline · checked ${CHECKED}`), el('h2', null, 'Platinum Roadmap')), facts));
  card.insertAdjacentHTML('beforeend', trackSVG(doc, byId));
  card.append(el('div', 'tlcols', ...CHAPTERS.map((c) => chapterColumn(c, doc, byId))));
  host.replaceChildren(card);
}

/** Phase header: number, title, earned bar, jump to its first unearned trophy in roadmap order. */
function stageTitle(stage, trophies) {
  const won = trophies.filter((t) => state.earned.has(t.id)).length;
  const bar = el('span', 'sbar');
  bar.innerHTML = `<b>${won}/${trophies.length}</b><i><em style="width:${Math.round((won / trophies.length) * 100)}%"></em></i>`;
  const [next] = computeNextUpTrophies(trophies, state.earned, 1);
  const jump = next ? btn('sjump', `Next: ${label(next.t)} →`, () => openTrophy(next.t.id)) : el('span', 'scount', '✓ phase done');
  if (next) jump.dataset.jump = next.t.id;
  return el('div', 'stitle', el('span', 'num', String(stage.n)), el('h3', null, `Phase ${stage.n} · ${stage.title}`), bar, jump);
}

export function renderRoadmap(host, side, doc) {
  renderTimeline(document.querySelector('#story-timeline'), doc);
  host.replaceChildren();
  for (const stage of STAGES) {
    const trophies = doc.trophies.filter((t) => t.stage === stage.n);
    const flow = el('div', 'pills');
    if (stage.n === 1) flow.append(el('span', 'glabel', 'Story pinned on the timeline ↑'), ...trophies.filter((t) => t.category !== 'story').map((t) => trophyPill(t)));
    else if (stage.groups) {
      for (const [id, name] of stage.groups) {
        const members = trophies.filter((t) => t.group === id);
        flow.append(el('span', 'glabel', `${name} ${members.length}`), ...members.map((t) => trophyPill(t)));
      }
    } else flow.append(...trophies.map((t) => trophyPill(t)));
    const card = el('section', 'stage', stageTitle(stage, trophies), appendCited(el('p', 'sline'), stage.line, doc.sources), flow);
    card.style.setProperty('--tone', stage.tone);
    host.append(card);
  }
  const a = doc.audit;
  side.replaceChildren(guardrails(doc), el('div', 'mcard', el('div', 'stitle', el('h3', null, 'Source Verification & Disagreements'),
    el('span', 'scount', `${a.multi}/${a.claims} on 2+ sites · ${a.outlets} outlets / ${a.pages} pages`)), sourceMatrix(doc, false), disputeChips(doc, false)));
}

/** The two missable windows, the ten chapter saves and the no-replay / cheat rule, each with its cites. */
function guardrails(doc) {
  const card = el('div', 'guard', el('div', 'stitle', el('h3', null, 'Missable & Save Guardrails'), el('span', 'scount', '2 windows · 10 saves')));
  const row = (tag, main, cites, risk) => card.append(el('div', 'grow', el('span', `gtag${risk ? ' risk' : ''}`, tag), main, el('span', 'gcites', ...cites.map((k) => citePill(k, doc.sources)))));
  for (const t of doc.trophies.filter((x) => x.missable).sort((x, y) => y.id - x.id)) {
    const b = btn('gmain', el('b', null, label(t)), () => openTrophy(t.id));
    b.append(` ${t.missableShort.replace(/^Ch\.\d+( only)? · /, '')}`);
    row(t.missableChapter, b, t.missableCites, true);
  }
  const slots = el('span', 'gmain');
  for (const t of doc.trophies.filter((x) => x.saveSlot).sort((x, y) => x.saveSlot - y.saveSlot)) {
    const b = btn(`gslot${state.earned.has(t.id) ? ' won' : ''}`, `S${t.saveSlot}`, () => openTrophy(t.id));
    b.title = `Slot ${t.saveSlot}: ${t.saveNote}`;
    slots.append(b);
  }
  row('Saves', slots, ['PPX', 'OLT']);
  row('Rules', el('span', 'gmain', 'No mission replay · cheats lock trophies'), ['PPX', 'PSQ', 'OLT']);
  return card;
}

css('.guard{margin:4px 0 3px;padding:4px 9px;border:1px solid #ff5c8a8c;border-radius:10px;background:#ff5c8a14}.guard h3{color:#ffe1ea}'
  + '.grow{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:7px;align-items:center;min-height:17px;font-size:11px}'
  + '.gtag{border-radius:5px;background:#ffc06129;color:#ffdc9c;font-size:9.5px;font-weight:900;text-align:center;text-transform:uppercase}.gtag.risk{background:#ff5c8a33;color:#ffc2d3}'
  + '.gmain{display:flex;gap:3px;min-width:0;padding:0;white-space:nowrap;overflow:hidden}.gmain b{color:#fff}'
  + '.gslot{padding:0 4px;border-radius:4px;background:#ffc06126;color:#ffe2a8;font-size:10px;font-weight:850}.won.gslot{background:#38e3cf33}.gcites{display:flex;gap:2px}'
  + '.tline{padding:9px 14px 7px;border:1px solid #ff5c8a4d;border-radius:13px;background:linear-gradient(160deg,#1b2038,#111829)}'
  + '.tlhead{display:flex;justify-content:space-between;align-items:center}.tlhead h2{margin:0;font-size:21px;font-weight:840;line-height:1.15}.tlhead .facts{margin:0}'
  + '.tltrack{display:block;width:100%;height:40px;margin-top:4px}.tk,.tf{stroke:#ffffff1f;stroke-width:4}.tf{stroke:var(--lagoon)}'
  + '.nd{fill:#0f1628;stroke:#ffffff40;stroke-width:2}.nd.done{fill:var(--lagoon)}.nd.now{fill:var(--coral);stroke:#ffd0dc;stroke-width:3}'
  + '.ndt{text-anchor:middle;font:900 14px var(--font);fill:#fff}.sv{fill:#ffc06126;stroke:#ffc061a6}.svt{text-anchor:middle;font:850 10.5px var(--font);fill:#ffe2a8}'
  + '.pr{stroke:var(--coral);stroke-width:2}.pf{fill:var(--coral)}.tlcols{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin-top:2px}'
  + '.tlcol{display:flex;flex-wrap:wrap;align-content:flex-start;gap:2px 3px;min-width:0;padding:5px 6px;border-radius:9px;background:#0d142480}.tlcol.done{background:#38e3cf0f}'
  + '.tlname{width:100%;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#ffb0c6}.done .tlname{color:#9ff3e6}.tlp{max-width:100%;font-size:10.1px}'
  + '.tlrisk{width:100%;padding:2px 7px 3px;border:1px solid #ff5c8ab3;border-radius:7px;background:#ff5c8a2b;text-align:left;line-height:1.25}'
  + '.tlrisk b{display:block;font-size:11.5px}.tlrisk i{display:block;font-style:normal;font-size:10.3px;color:#ffe1ea}.tlrisk.won{border-color:#38e3cf8c;background:#38e3cf1f}'
  + '.tlopen{width:100%;padding:0;text-align:left;font-size:10.6px;line-height:1.35;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tlopen span{color:var(--sun)}'
  + '.tlnote{margin:4px 0 0;padding-top:4px;border-top:1px solid var(--line2);font-size:10.3px;line-height:1.4;color:var(--dim)}'
  + '.roadmap{min-height:0;overflow-y:auto}.facts{display:flex;gap:5px}'
  + '.fact{padding:2px 8px;border:1px solid var(--line);border-radius:8px;background:#1a2339;font-size:10.5px;white-space:nowrap;font-weight:700;color:var(--muted);text-transform:uppercase}'
  + '.fact b{font-size:13.5px;color:#fff}.fact.key{border-color:#38e3cf99;background:#38e3cf24}'
  + '.stage{margin-bottom:5px;padding:4px 12px 6px;border:1px solid var(--line);border-left:3px solid var(--tone);border-radius:11px;background:var(--panel)}'
  + '.stitle{display:flex;align-items:center;gap:9px}.stitle h3{margin:0;font-size:14px;font-weight:820;white-space:nowrap}'
  + '.num{width:24px;height:24px;border-radius:7px;display:grid;place-items:center;font-weight:900;color:#0b1020;background:var(--tone)}'
  + '.scount{margin-left:auto;padding:2px 8px;border-radius:6px;background:#ffffff14;font-size:11px;font-weight:800;white-space:nowrap}'
  + '.sbar{display:flex;align-items:center;gap:5px;margin-left:auto;font-size:11px}.sbar i{width:64px;height:5px;border-radius:5px;background:#ffffff17;overflow:hidden}.sbar em{display:block;height:100%;background:var(--tone)}'
  + '.sjump{max-width:190px;height:22px;padding:0 8px;border:1px solid var(--tone);border-radius:6px;font-size:10.8px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  + '.sline{margin:1px 0 3px;font-size:11.4px;line-height:1.35;color:var(--muted)}.pills{display:flex;flex-wrap:wrap;align-items:center;gap:2px 4px}'
  + '.tpill{display:inline-flex;align-items:center;gap:4px;height:19px;padding:0 7px 0 4px;border:1px solid var(--line);border-radius:6px;background:#0f1628;color:#e3e9f3;font-size:10.8px;font-weight:650;white-space:nowrap}'
  + '.tpill.won{border-color:#38e3cf73;background:#38e3cf1a}'
  + '.glabel{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:6px;background:#ffc06129;font-size:10.5px;font-weight:850;text-transform:uppercase;color:#ffdc9c;white-space:nowrap}'
  + '.glabel:not(:first-child){margin-left:6px}.mcard h3,.guard h3{font-size:13.5px}'
  + '#roadmap-view .split{grid-template-columns:minmax(0,1fr) 520px}#save-guardrails{padding:3px 12px}');
