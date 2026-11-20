// Platinum Roadmap: three stages mapping all 55 trophies as clickable pills, the missable and
// chapter-save guardrails, and the source verification matrix, all computed from the data.
import { el, link, medal, citePill, CHECKED } from './dom.js';
import { state, openTrophy } from './state.js';
import { isMasked, maskName } from './filters.js';
import { appendCited } from './detail.js';

const STAGES = [
  { n: 1, title: 'Story + the one missable', tone: '#ff5c8a',
    line: "Play the 5 chapters, do Lucia's Chapter 1 balcony meditation, save at each chapter start and end (PowerPyx, Beebom)." },
  { n: 2, title: '100% checklist & big counters', tone: '#38e3cf',
    line: 'After the credits: 100 optional missions, 200 vehicles, 100 animals, 300 stunts, 70 challenges (PowerPyx, IGN Wiki).' },
  { n: 3, title: 'Strangers, collectibles & clean-up', tone: '#ffc061',
    line: 'Strangers & Freaks sit outside 100%: sweep them and the one-off trophies last (PowerPyx).',
    groups: [['strangers', 'Strangers'], ['world', 'Collectibles & World'], ['activities', 'Activities & Combat'], ['platinum', 'Platinum']] },
];
const FACTS = [['55/55', 'mapped'], ['~200 h', 'PowerPyx'], ['1', 'playthrough'], ['0', 'online'], ['No', 'mission replay'], ['4/10', 'difficulty']];
const MATRIX = [
  ['PowerPyx', 'Roadmap + all 55 how-tos'], ['Exophase', 'Official names, grades, counts'], ['Push Square', 'Roadmap, menu paths, counts'],
  ['IGN Wiki', '100% bars, maps, missions'], ['Beebom', 'All 18 meditation spots'], ['TrueTrophies', 'PS5 list · 28 secret'],
];

function sourceIndex(doc) {
  const map = new Map();
  for (const t of doc.trophies) for (const s of t.sources) if (!map.has(s.label)) map.set(s.label, s);
  return map;
}

function trophyPill(t) {
  const masked = isMasked(t, state);
  const pill = el('button', `tpill${state.earned.has(t.id) ? ' won' : ''}`);
  pill.type = 'button';
  pill.innerHTML = medal(t.grade, 13);
  pill.append(masked ? maskName(t) : t.name);
  pill.onclick = () => openTrophy(t.id);
  return pill;
}

function pillRow(trophies) {
  const row = el('div', 'pills');
  for (const t of trophies) row.append(trophyPill(t));
  return row;
}

/** Left: the headline facts and the three stages. Right: guardrails and the source matrix. */
export function renderRoadmap(host, side, doc) {
  const sources = sourceIndex(doc);
  const all = [...sources.values()];
  host.replaceChildren();
  const head = el('div', 'roadhead');
  head.append(el('span', 'eyebrow', `Order and facts from PowerPyx · checked ${CHECKED}`), el('h2', null, 'Platinum Roadmap'));
  const facts = el('div', 'facts');
  for (const [big, small] of FACTS) {
    const fact = el('span', big === '55/55' ? 'fact key' : 'fact');
    fact.append(el('b', null, big), ` ${small}`);
    facts.append(fact);
  }
  host.append(head, facts);

  for (const stage of STAGES) {
    const trophies = doc.trophies.filter((t) => t.stage === stage.n);
    const card = el('section', 'stage');
    card.style.setProperty('--tone', stage.tone);
    const title = el('div', 'stitle');
    title.append(el('span', 'num', String(stage.n)), el('h3', null, `Stage ${stage.n} · ${stage.title}`), el('span', 'scount', `${trophies.length} trophies`));
    card.append(title, appendCited(el('p', 'sline'), stage.line, all));
    if (stage.groups) {
      const flow = el('div', 'pills');
      for (const [id, label] of stage.groups) {
        const members = trophies.filter((t) => t.group === id);
        flow.append(el('span', 'glabel', `${label} ${members.length}`), ...members.map(trophyPill));
      }
      card.append(flow);
    } else card.append(pillRow(trophies));
    host.append(card);
  }
  renderGuardrails(side, doc, sources);
}

function guardRow(t, slot, note) {
  const row = el('button', 'guardrow');
  row.type = 'button';
  row.append(el('span', `slot${t.missable ? ' risk' : ''}`, slot), el('b', null, isMasked(t, state) ? maskName(t) : t.name), el('span', 'gnote', note));
  row.onclick = () => openTrophy(t.id);
  return row;
}

function renderGuardrails(host, doc, sources) {
  host.replaceChildren();
  const missable = doc.trophies.filter((t) => t.missable);
  const saves = doc.trophies.filter((t) => t.saveSlot).sort((a, b) => a.saveSlot - b.saveSlot);
  const head = el('div', 'stitle');
  head.append(el('h3', null, 'Missable & save guardrails'), citePill('PowerPyx', [...sources.values()]));
  host.append(head, el('p', 'sline', 'No mission replay: keep 10 of the 15 manual slots for chapter starts and ends.'));

  const label = (text, count) => { const l = el('div', 'seclabel'); l.append(el('span', null, text), el('b', null, String(count))); return l; };
  host.append(label('Missable risk', missable.length));
  for (const t of missable) host.append(guardRow(t, 'Ch.1', "Ch.1 only · Lucia's balcony"));
  host.append(label('Chapter saves', saves.length));
  for (const t of saves) host.append(guardRow(t, `Slot ${t.saveSlot}`, t.saveNote));

  const card = el('div', 'matrix');
  const mhead = el('div', 'stitle');
  mhead.append(el('h3', null, 'Source Verification Matrix'), el('span', 'scount', `checked ${CHECKED}`));
  card.append(mhead);
  const headRow = el('div', 'mrow mhead');
  for (const column of ['Source', 'Coverage', 'Date', 'Scope']) headRow.append(el('span', null, column));
  card.append(headRow);
  for (const [label, scope] of MATRIX) {
    const covered = doc.trophies.filter((t) => t.sources.some((s) => s.label === label)).length;
    const row = el('div', 'mrow');
    row.append(link(null, sources.get(label).url, label), el('b', null, `${covered}/${doc.trophies.length}`), el('span', null, '19 Nov'), el('span', null, scope));
    card.append(row);
  }
  const steps = doc.trophies.reduce((n, t) => n + t.steps.length, 0);
  const cited = doc.trophies.reduce((n, t) => n + t.steps.filter((s) => t.sources.some((x) => x.label === s.cite)).length, 0);
  card.append(el('p', 'mnote', `${cited}/${steps} steps cited · recomputed from app/data at boot · 0 network requests`));
  host.append(card);
}

const ROADMAP_CSS = '.roadmap{min-height:0;overflow-y:auto;padding-right:2px}'
  + '.roadhead h2{margin:0;font-size:22px;font-weight:820;letter-spacing:-.02em;line-height:1.2}'
  + '.facts{display:flex;gap:5px;margin:5px 0 8px}'
  + '.fact{padding:2px 8px;border:1px solid var(--line);border-radius:8px;background:#1a2339;font-size:10.5px;white-space:nowrap;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}'
  + '.fact b{font-size:13.5px;color:#fff;text-transform:none}.fact.key{border-color:#38e3cf99;background:#38e3cf24;color:#c9fdf6}'
  + '.stage{margin-bottom:7px;padding:8px 12px 9px;border:1px solid var(--line);border-left:3px solid var(--tone);border-radius:11px;background:var(--panel)}'
  + '.stitle{display:flex;align-items:center;gap:9px}.stitle h3{margin:0;font-size:14.5px;font-weight:820}'
  + '.num{width:24px;height:24px;border-radius:7px;display:grid;place-items:center;font-size:13px;font-weight:900;color:#0b1020;background:var(--tone)}'
  + '.scount{margin-left:auto;padding:2px 8px;border-radius:6px;background:#ffffff14;font-size:11px;font-weight:800;color:var(--body);white-space:nowrap}'
  + '.sline{margin:3px 0 5px;font-size:11.6px;line-height:1.4;color:var(--muted)}'
  + '.pills{display:flex;flex-wrap:wrap;align-items:center;gap:4px}'
  + '.tpill{display:inline-flex;align-items:center;gap:4px;height:21px;padding:0 7px 0 4px;border:1px solid var(--line);border-radius:6px;background:#0f1628;color:#e3e9f3;font-size:10.8px;font-weight:650;white-space:nowrap}'
  + '.tpill.won{border-color:#38e3cf73;background:#38e3cf1a}'
  + '.glabel{display:inline-flex;align-items:center;height:21px;padding:0 8px;border-radius:6px;background:#ffc06129;font-size:10.5px;font-weight:850;letter-spacing:.04em;text-transform:uppercase;color:#ffdc9c;white-space:nowrap}'
  + '.glabel:not(:first-child){margin-left:6px}'
  + '#save-guardrails .stitle h3{font-size:15px}'
  + '.guardrow{width:100%;display:grid;grid-template-columns:50px auto minmax(0,1fr);gap:9px;align-items:center;padding:3px 0;border-top:1px solid var(--line2);text-align:left;font-size:11.5px;line-height:1.3}'
  + '.guardrow b{font-weight:750;white-space:nowrap}.gnote{text-align:right;color:var(--muted);font-size:11px;white-space:nowrap}'
  + '.slot{padding:1px 0;border-radius:5px;background:#ffc06124;color:#ffe2a8;font-size:10px;font-weight:850;text-align:center}.slot.risk{background:#ff5c8a4d;color:#ffe1ea}'
  + '.matrix{margin-top:10px;padding:9px 11px 8px;border:1px solid #38e3cf4d;border-radius:11px;background:#0d1b26}'
  + '.matrix h3{font-size:13.5px}'
  + '.mrow{display:grid;grid-template-columns:86px 64px 48px minmax(0,1fr);column-gap:12px;align-items:center;padding:2px 0;border-top:1px solid var(--line2);font-size:11px;font-variant-numeric:tabular-nums;color:#d2e8e3;white-space:nowrap}'
  + '.mhead{margin-top:6px;border-top:0;font-size:9.5px;font-weight:850;letter-spacing:.1em;text-transform:uppercase;color:var(--dim)}'
  + '.mrow a{font-weight:750;color:#bff8ef;text-decoration:none}.mrow b{color:#fff}'
  + '.mnote{margin:5px 0 0;font-size:10.5px;color:#9fd8cc}';
document.head.append(Object.assign(document.createElement('style'), { textContent: ROADMAP_CSS }));
