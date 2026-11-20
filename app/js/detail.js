// The guide inspector: official identity, missable or save-slot callout, the cited guide, the source disagreement
// panels that name this trophy, walkthrough steps that each end in their sources and a 2+ sites / 1 site pill,
// and the source chips.
import { state, toggleEarned, toggleStep, togglePeek, isStepDone } from './state.js';
import { isMasked, maskName, MASK_DESCRIPTION } from './filters.js';
import { el, link, gradeBadge, sourceChips, citePill, sitePill, CHECKED } from './dom.js';
import { sites } from './verify.js';

const STAGE = { 1: 'Phase 1 · Story + missables', 2: 'Phase 2 · 100% counters', 3: 'Phase 3 · Clean-up' };
const CATEGORY = { platinum: 'Platinum', story: 'Story', collectibles: 'Collectibles', activities: 'Activities' };

/** Turn each (KEY, KEY) cite group into links named after its sources; other parentheses stay as text. */
export function appendCited(parent, text, sources) {
  const byKey = new Map(sources.map((s) => [s.key, s]));
  let cursor = 0;
  for (const m of text.matchAll(/\(([^()]+)\)/g)) {
    const keys = m[1].split(', ');
    if (!keys.every((k) => byKey.has(k))) continue;
    parent.append(text.slice(cursor, m.index), '(');
    const labels = keys.map((k) => byKey.get(k).label);
    keys.forEach((k, i) => {
      const s = byKey.get(k);
      // Two pages of one site in a group (two IGN pages) are told apart by page name.
      const cite = link('cite', s.url, labels.indexOf(s.label) === labels.lastIndexOf(s.label) ? s.label : `${s.label}: ${s.page}`);
      cite.title = `${s.label}: ${s.page} (checked ${CHECKED})`;
      parent.append(...(i ? [', ', cite] : [cite]));
    });
    parent.append(')');
    cursor = m.index + m[0].length;
  }
  parent.append(text.slice(cursor));
  return parent;
}

const pill = (text, tone) => el('span', `pill${tone ? ` ${tone}` : ''}`, text);

function callout(tone, tag, note, labels, sources) {
  const box = el('div', `callout ${tone}`);
  const head = el('div', 'mtag', tag);
  for (const label of labels) head.append(citePill(label, sources));
  box.append(head, el('p', null, note));
  return box;
}

function checklistBlock(trophy) {
  const label = el('div', 'seclabel');
  label.append(el('span', null, '100% checklist · 10 bars'), el('b', null, 'every count cited'));
  const grid = el('div', 'counters');
  for (const [value, name, source] of trophy.checklist) {
    const s = trophy.sources.find((x) => x.key === source);
    const tile = link('counter', s.url);
    tile.title = `${name}: ${value} (${s.label}, ${s.page})`;
    tile.append(el('b', null, value), el('span', null, name), el('i', null, s.label));
    grid.append(tile);
  }
  return [label, grid];
}

/** One amber panel per documented disagreement: what each side says, its sources, and the call we make. */
export function conflictPanel(c, sources, open) {
  const box = el('details', 'conflict');
  box.open = open;
  const head = el('summary');
  head.append(el('b', null, '⚖ Source disagreement'), el('span', null, c.title));
  const rows = el('div', 'csides');
  for (const [keys, says] of c.sides) {
    const row = el('div', 'cside');
    const who = el('span', 'cwho');
    for (const k of keys) who.append(citePill(k, sources, keys.length > 1));
    row.append(who, el('span', null, says));
    rows.append(row);
  }
  box.append(head, rows, appendCited(el('p', 'ccall'), `Our call: ${c.call}`, sources));
  return box;
}

function earnedButton(trophy) {
  const earned = state.earned.has(trophy.id);
  const button = el('button', `earnedbtn${earned ? ' on' : ''}`, earned ? '✓ Earned · click to unmark' : 'Mark as earned');
  button.type = 'button';
  button.setAttribute('aria-pressed', String(earned));
  button.onclick = () => toggleEarned(trophy.id);
  return button;
}

export function renderTrophyDetail(host, trophy, doc) {
  const keep = host.dataset.trophyId === String(trophy?.id) ? host.scrollTop : 0;
  host.dataset.trophyId = trophy ? String(trophy.id) : '';
  host.replaceChildren();
  if (!trophy) { host.append(el('p', 'guide', 'Pick a row to read its cited walkthrough.')); return; }

  const masked = isMasked(trophy, state);
  const top = el('div', 'dtop');
  top.append(el('span', 'eyebrow', `Trophy ${trophy.id} of ${doc.trophies.length} · ${STAGE[trophy.stage]}`), gradeBadge(trophy.grade));
  const desc = el('p', 'desc');
  desc.append(el('b', null, 'PS5'), masked ? MASK_DESCRIPTION : trophy.description);
  host.append(top, el('h2', null, masked ? maskName(trophy) : trophy.name), desc);

  if (masked) {
    const shield = el('div', 'callout coral');
    shield.append(el('div', 'mtag', 'Spoiler Mode on · shielded until earned'), el('p', null, 'Name, description and guide stay hidden. Peek reveals this one trophy only.'));
    const peek = el('button', 'btn', 'Peek this trophy');
    peek.type = 'button';
    peek.onclick = () => togglePeek(trophy.id);
    shield.append(peek);
    host.append(shield, earnedButton(trophy));
    return;
  }

  const meta = el('div', 'dmeta');
  meta.append(pill(CATEGORY[trophy.category], 'teal'));
  if (trophy.count) meta.append(pill(`Tracked ${trophy.count.toLocaleString('en-US')}`));
  if (trophy.hidden) meta.append(pill('Hidden on PS5'));
  meta.append(pill(`${trophy.multi}/${trophy.claims.length} claims on 2+ sites`, 'green'));
  if (trophy.conflicts.length) meta.append(pill(`${trophy.conflicts.length} disagreement${trophy.conflicts.length > 1 ? 's' : ''}`, 'amber'));
  host.append(meta);

  if (trophy.missable) {
    // Each missable carries its own chapter label and the sources that flag it, in trophies.json.
    host.append(callout('coral', `Missable risk · ${trophy.missableLabel}`, trophy.missableNote, trophy.missableCites, trophy.sources));
  } else if (trophy.saveSlot) {
    host.append(callout('sun', `Chapter save · slot ${trophy.saveSlot} of 10`, trophy.missableNote, ['PPX'], trophy.sources));
  }

  host.append(appendCited(el('p', 'guide'), trophy.guide, trophy.sources));
  trophy.conflicts.forEach((c, i) => host.append(conflictPanel(c, doc.sources, i === 0)));
  if (trophy.checklist) host.append(...checklistBlock(trophy));

  const done = (state.steps[trophy.id] ?? []).length;
  const stepHead = el('div', 'seclabel');
  stepHead.append(el('span', null, 'Walkthrough · every step cited'), el('b', null, `${done} / ${trophy.steps.length} done`));
  const steps = el('div', 'steps');
  trophy.steps.forEach((step, index) => {
    const complete = isStepDone(trophy.id, index);
    const row = el('div', `step${complete ? ' done' : ''}`);
    const box = el('button', 'sbox', complete ? '✓' : '');
    box.type = 'button';
    box.setAttribute('aria-pressed', String(complete));
    box.setAttribute('aria-label', `Step ${index + 1} done`);
    box.onclick = () => toggleStep(trophy.id, index);
    const cites = el('span', 'scites');
    for (const k of step.cites) cites.append(citePill(k, trophy.sources));
    cites.append(sitePill(sites(step.cites, doc.audit.byKey)));
    row.append(box, el('span', null, step.text), cites);
    steps.append(row);
  });
  const srcHead = el('div', 'seclabel');
  srcHead.append(el('span', null, 'Cited sources'), el('b', null, `checked ${CHECKED}`));
  host.append(stepHead, steps, srcHead, sourceChips(el('div', 'srcrow'), trophy.sources), earnedButton(trophy));
  host.scrollTop = keep;
}

const DETAIL_CSS = '.dtop{display:flex;align-items:center;justify-content:space-between;gap:10px}'
  + '#trophy-detail h2{margin:3px 0 2px;font-size:22px;font-weight:820;letter-spacing:-.02em;line-height:1.15}'
  + '.desc{margin:0 0 7px;font-size:13px;color:var(--body)}.desc b{margin-right:7px;padding:1px 5px;border-radius:4px;background:#ffffff1a;font-size:9.5px;letter-spacing:.08em;color:var(--muted)}'
  + '.dmeta,.srcrow{display:flex;flex-wrap:wrap;gap:5px}'
  + '.callout{margin:9px 0 2px;padding:8px 11px 9px;border:1px solid;border-radius:10px}'
  + '.callout.coral{border-color:#ff5c8ab3;background:linear-gradient(135deg,#ff5c8a3d,#ff5c8a14)}.callout.sun{border-color:#ffc06173;background:#ffc0611a}'
  + '.mtag{display:flex;align-items:center;gap:6px;margin-bottom:3px;font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#ffe3eb}'
  + '.mtag .citep:first-of-type{margin-left:auto}.callout.sun .mtag{color:#ffe6b5}'
  + '.callout p{margin:0;font-size:12.2px;line-height:1.45;color:#fff1f5}.callout .btn{margin-top:8px}'
  + '.guide{margin:9px 0 0;font-size:12.8px;line-height:1.5;color:var(--body)}'
  + '.steps{display:flex;flex-direction:column;gap:3px}'
  + '.step{display:grid;grid-template-columns:18px minmax(0,1fr) auto;gap:8px;align-items:start;font-size:12px;line-height:1.4;color:#dbe3ef}'
  + '.sbox{width:17px;height:17px;margin-top:1px;padding:0;border:1.5px solid #ffffff4d;border-radius:4px;display:grid;place-items:center;font-size:10px;font-weight:900;color:#0000}'
  + '.step.done .sbox{background:var(--lagoon);border-color:var(--lagoon);color:#04241f}.step.done>span{color:#aab6c6}'
  + '.earnedbtn{width:100%;height:34px;margin-top:10px;border:1px solid #38e3cf80;border-radius:9px;background:#38e3cf1f;color:#c9fdf6;font-size:12.5px;font-weight:800}'
  + '.pill.green{color:#b8ffd0;background:#3ddc841f;box-shadow:inset 0 0 0 1px #3ddc8459}.pill.amber{color:#ffe1a6;background:#ffc06124;box-shadow:inset 0 0 0 1px #ffc06166}'
  + '.scites{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:3px;max-width:190px}'
  + '.conflict{margin:8px 0 2px;padding:6px 10px 7px;border:1px solid #ffb24d8c;border-left:3px solid #ffb24d;border-radius:9px;background:linear-gradient(135deg,#ffb24d24,#ff7a5c0f)}'
  + '.conflict summary{display:flex;gap:7px;align-items:baseline;cursor:pointer;font-size:11.5px;font-weight:800;color:#ffe9c7;list-style:none}'
  + '.conflict summary b{font-size:9.5px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#ffb24d;white-space:nowrap}'
  + '.csides{display:flex;flex-direction:column;gap:3px;margin-top:5px}'
  + '.cside{display:grid;grid-template-columns:auto minmax(0,1fr);gap:7px;font-size:11.4px;line-height:1.38;color:#f6ead8}'
  + '.cwho{display:flex;flex-direction:column;gap:2px;align-items:start}'
  + '.ccall{margin:5px 0 0;padding-top:4px;border-top:1px dashed #ffb24d59;font-size:11.2px;color:#ffd9a3}'
  + '.counters{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}'
  + '.counter{padding:4px 7px 5px;border:1px solid var(--line);border-radius:8px;background:#1a2440;text-decoration:none;line-height:1.2}'
  + '.counter b{display:block;font-size:15px;font-weight:850;color:#fff}.counter span{display:block;font-size:10px;color:var(--muted);white-space:nowrap}'
  + '.counter i{display:block;font-style:normal;font-size:9.5px;font-weight:800;color:#8fe3d6}';
document.head.append(Object.assign(document.createElement('style'), { textContent: DETAIL_CSS }));
