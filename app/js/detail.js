// The guide inspector (identity, Copy Trophy Link, missable window, SOURCES DIFFER A/B panel, progress stepper,
// numbered steps with [n] source badges, cited guide) and the rail (Next Up, Sources for This Guide).
import { state, toggleEarned, toggleStep, togglePeek, isStepDone } from './state.js';
import { isMasked, maskName, MASK_DESCRIPTION } from './filters.js';
import { el, btn, css, link, gradeBadge, citePill, sitePill } from './dom.js';
import { sites } from './verify.js';
import { buildGuideSourceSummary, disputesFor, nextUpCard, counterFor, stepper } from './codex.js';
import { trophyLink, copyText } from './io.js';

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
      cite.title = `${s.label}: ${s.page}`;
      parent.append(...(i ? [', ', cite] : [cite]));
    });
    parent.append(')');
    cursor = m.index + m[0].length;
  }
  parent.append(text.slice(cursor));
  return parent;
}

const pill = (text, tone) => el('span', `pill ${tone ?? ''}`, text);
const callout = (tone, tag, note, keys, sources) => el('div', `callout ${tone}`, el('div', 'mtag', tag, ...keys.map((k) => citePill(k, sources))), el('p', null, note));

/** A disagreement panel: one column per side (A, B, C…) with its sources, then our call. */
export function conflictPanel(c, sources, open) {
  const cols = el('div', 'csides');
  cols.style.setProperty('--n', c.sides.length > 3 ? 2 : c.sides.length);
  c.sides.forEach(([keys, says], i) => cols.append(el('div', 'cside', el('div', 'cwho', 'ABCD'[i], ...keys.map((k) => citePill(k, sources, keys.length > 1))), el('p', null, says))));
  const box = el('details', 'conflict', el('summary', null, el('b', null, `⚖ Sources differ (${[...'ABCD'.slice(0, c.sides.length)].join(' vs ')})`), c.title),
    cols, appendCited(el('p', 'ccall'), `Our call: ${c.call}`, sources));
  box.open = open;
  return box;
}

function checklistBlock(trophy) {
  const grid = el('div', 'counters');
  for (const [value, name, key] of trophy.checklist) {
    const s = trophy.sources.find((x) => x.key === key);
    const tile = link('counter', s.url, el('b', null, value), el('span', null, name), el('i', null, s.label));
    tile.title = `${name}: ${value} (${s.label}, ${s.page})`;
    grid.append(tile);
  }
  return [el('div', 'seclabel', el('span', null, '100% checklist · 10 bars'), el('b', null, 'every count cited')), grid];
}

let toastTimer;
export function toast(text) {
  const box = document.querySelector('.toast') ?? document.body.appendChild(el('div', 'toast'));
  box.setAttribute('role', 'status');
  box.textContent = text;
  box.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.remove('on'), 2400);
}

/** Copies #trophy=<id>; confirms in place and in a toast. */
function copyButton(trophy) {
  const b = btn('copylink', '⧉ Copy link', async () => {
    const url = trophyLink(trophy.id);
    const ok = await copyText(url);
    b.textContent = '✓ Copied';
    toast(ok ? `Trophy link copied · #trophy=${trophy.id}` : `Copy blocked · link: ${url}`);
    setTimeout(() => { b.textContent = '⧉ Copy link'; }, 2200);
  });
  b.title = 'Copy a link that opens this trophy';
  return b;
}

function stepsBlock(trophy, doc, number) {
  const list = el('ol', 'steps');
  trophy.steps.forEach((step, i) => {
    const done = isStepDone(trophy.id, i);
    const box = btn('sbox', done ? '✓' : String(i + 1), () => toggleStep(trophy.id, i));
    box.setAttribute('aria-pressed', done);
    box.setAttribute('aria-label', `Step ${i + 1} done`);
    const text = el('span', 'stext', `${step.text} `);
    for (const k of step.cites) {
      const s = number.get(k);
      const badge = link('nref', s.url, `[${s.n}]`);
      badge.title = `${s.label}: ${s.page}`;
      text.append(badge);
    }
    text.append(sitePill(sites(step.cites, doc.audit.byKey)));
    list.append(el('li', `step${done ? ' done' : ''}`, box, text));
  });
  const done = (state.steps[trophy.id] ?? []).length;
  return [el('div', 'seclabel', el('span', null, 'How to earn · every step cited'), el('b', null, `${done} / ${trophy.steps.length} done`)), list];
}

function progressBlock(trophy) {
  const { key, goal } = counterFor(trophy);
  const box = el('div', 'tprog', el('span', 'seclabel', 'Progress'), stepper(key, goal, trophy.name, goal >= 1000 ? 10 ** (Math.floor(Math.log10(goal)) - 1) : 1));
  box.insertAdjacentHTML('beforeend', `<div class="mbar"><i style="width:${Math.min(100, ((state.counters[key] ?? 0) / goal) * 100)}%"></i></div>`);
  return box;
}

export function renderTrophyDetail(host, trophy, doc) {
  const keep = host.dataset.trophyId === String(trophy?.id) ? host.scrollTop : 0;
  host.dataset.trophyId = trophy?.id ?? '';
  host.replaceChildren();
  if (!trophy) { host.append(el('p', 'guide', 'Pick a row to read its cited walkthrough.')); return; }
  const masked = isMasked(trophy, state);
  const earned = state.earned.has(trophy.id);
  const earnedBtn = btn('earnedbtn', earned ? '✓ Earned · click to unmark (M)' : 'Mark as earned (M)', () => toggleEarned(trophy.id));
  earnedBtn.setAttribute('aria-pressed', earned);
  host.append(el('div', 'dtop', el('span', 'eyebrow', `Trophy ${trophy.id} of ${doc.trophies.length} · ${STAGE[trophy.stage]}`), copyButton(trophy), gradeBadge(trophy.grade)),
    el('h2', null, masked ? maskName(trophy) : trophy.name), el('p', 'desc', el('b', null, 'PS5'), masked ? MASK_DESCRIPTION : trophy.description));
  if (masked) {
    host.append(el('div', 'callout coral', el('div', 'mtag', 'Spoiler Mode on · shielded until earned'),
      el('p', null, 'Name, description and guide stay hidden. Peek reveals this one trophy only.'), btn('btn', 'Peek this trophy', () => togglePeek(trophy.id))), earnedBtn);
    return;
  }
  const disputes = disputesFor(doc, trophy.id);
  host.append(el('div', 'dmeta', trophy.missable ? pill(`Missable · ${trophy.missableChapter}`, 'coral') : null, pill(CATEGORY[trophy.category], 'teal'),
    trophy.hidden ? pill('Hidden on PS5') : null, pill(`${trophy.multi}/${trophy.claims.length} claims · 2+ sites`, 'green'),
    disputes.length ? pill(`${disputes.length} dispute${disputes.length > 1 ? 's' : ''}`, 'amber') : null));
  if (trophy.missable) host.append(callout('coral', `Missable · ${trophy.missableLabel}`, trophy.missableNote, trophy.missableCites, trophy.sources));
  else if (trophy.saveSlot) host.append(callout('sun', `Chapter save · slot ${trophy.saveSlot} of 10`, trophy.missableNote, ['PPX'], trophy.sources));
  const [lead, ...more] = disputes;
  if (lead) host.append(conflictPanel(lead, doc.sources, true));
  if (trophy.count && trophy.category !== 'story' && trophy.id !== 14) host.append(progressBlock(trophy));
  const number = new Map(buildGuideSourceSummary(trophy, doc.sources).map((s) => [s.key, s]));
  host.append(...stepsBlock(trophy, doc, number), ...more.map((c) => conflictPanel(c, doc.sources, false)), appendCited(el('p', 'guide'), trophy.guide, trophy.sources));
  if (trophy.checklist) host.append(...checklistBlock(trophy));
  host.append(earnedBtn);
  host.scrollTop = keep;
}

/** The rail: Next Up, then each page backing this guide (outlet, page, URL, read date, claims). */
export function renderRail(host, trophy, doc) {
  host.replaceChildren(nextUpCard(doc));
  if (!trophy) return;
  const list = buildGuideSourceSummary(trophy, doc.sources, doc.audit.read);
  const card = el('section', 'gsrc', el('div', 'seclabel', el('span', null, 'Sources for this guide'), el('b', null, `${list.length} pages`)));
  if (isMasked(trophy, state)) card.append(el('p', 'gnote', 'Shielded with the trophy · peek to list them.'));
  else for (const s of list) {
    const row = link('gsrow', s.url, el('i', null, String(s.n)), el('span', null, el('b', null, `${s.label} · ${s.page}`),
      el('small', null, `${s.url.replace(/^https:\/\/(www\.)?/, '')} · read ${s.read}`)), el('em', null, s.claims ? `${s.claims} claim${s.claims > 1 ? 's' : ''}` : s.role));
    row.title = `${s.label}: ${s.page} · read ${s.read} · ${s.url}`;
    card.append(row);
  }
  host.append(card);
}

css('.dtop{display:flex;align-items:center;gap:7px}.dtop .eyebrow{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:9.5px}'
  + '.copylink{height:24px;padding:0 8px;border:1px solid #38e3cf59;border-radius:7px;background:#38e3cf12;font-size:11px;font-weight:800;color:#c9fdf6;white-space:nowrap}'
  + '#trophy-detail h2{margin:3px 0 1px;font-size:21px;font-weight:820;letter-spacing:-.02em;line-height:1.15}'
  + '.desc{margin:0 0 6px;font-size:12.8px}.desc b{margin-right:7px;padding:1px 5px;border-radius:4px;background:#ffffff1a;font-size:9.5px;color:var(--muted)}'
  + '.dmeta{display:flex;flex-wrap:wrap;gap:4px}.callout{margin:8px 0 2px;padding:6px 10px 7px;border:1px solid;border-radius:10px}'
  + '.callout.coral{border-color:#ff5c8ab3;background:linear-gradient(135deg,#ff5c8a3d,#ff5c8a14)}.callout.sun{border-color:#ffc06173;background:#ffc0611a}'
  + '.mtag{display:flex;align-items:center;gap:5px;margin-bottom:2px;font-size:10.5px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#ffe3eb}.mtag .citep:first-of-type{margin-left:auto}'
  + '.callout p{margin:0;font-size:12px;line-height:1.42;color:#fff1f5}.callout .btn{margin-top:8px}'
  + '.guide{margin:8px 0 0;font-size:12.4px;color:var(--body)}.steps{display:flex;flex-direction:column;gap:3px;margin:0;padding:0;list-style:none}'
  + '.step{display:grid;grid-template-columns:19px minmax(0,1fr);gap:7px;font-size:12px;line-height:1.42;color:#dbe3ef}'
  + '.sbox{width:19px;height:19px;padding:0;border:1.5px solid #ffffff4d;border-radius:5px;font-size:10px;font-weight:900;color:var(--dim)}'
  + '.step.done .sbox{background:var(--lagoon);border-color:var(--lagoon);color:#04241f}.step.done .stext{color:#aab6c6}'
  + '.nref{margin-right:2px;font-size:10.5px;font-weight:850;color:#8ff0e2;text-decoration:none}.stext .sitep{margin-left:3px}'
  + '.earnedbtn{width:100%;height:32px;margin-top:10px;border:1px solid #38e3cf80;border-radius:9px;background:#38e3cf1f;color:#c9fdf6;font-weight:800}'
  + '.pill.green{color:#b8ffd0;background:#3ddc841f}.pill.amber{color:#ffe1a6;background:#ffc06124}'
  + '.conflict{margin:7px 0 2px;padding:5px 9px 6px;border:1px solid #ffb24d8c;border-left:3px solid #ffb24d;border-radius:9px;background:#ffb24d1a}'
  + '.conflict summary{display:flex;gap:7px;align-items:baseline;cursor:pointer;font-size:11.5px;font-weight:800;color:#ffe9c7;list-style:none}'
  + '.conflict summary b{font-size:9.5px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#ffb24d;white-space:nowrap}'
  + '.csides{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:5px;margin-top:4px}'
  + '.cside{padding:4px 6px;border-radius:7px;background:#0b10208c}.cside p{margin:2px 0 0;font-size:11px;line-height:1.35;color:#f6ead8}'
  + '.cwho{display:flex;flex-wrap:wrap;gap:3px;font-size:10px;font-weight:900;color:#ffb24d}'
  + '.ccall{margin:4px 0 0;padding-top:3px;border-top:1px dashed #ffb24d59;font-size:11px;color:#ffd9a3}'
  + '.tprog{display:grid;grid-template-columns:auto 1fr;gap:0 10px;align-items:center;margin-top:6px}.tprog .seclabel{margin:0}.tprog .cmid{justify-content:flex-end;margin:0}.tprog .mbar{grid-column:1/-1}'
  + '.counters{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}.counter{padding:4px 7px 5px;border:1px solid var(--line);border-radius:8px;background:#1a2440;text-decoration:none;line-height:1.2}'
  + '.counter b{display:block;font-size:15px;color:#fff}.counter span{display:block;font-size:10px;color:var(--muted);white-space:nowrap}.counter i{font-style:normal;font-size:9.5px;color:#8fe3d6}'
  + '.gsrow{display:grid;grid-template-columns:16px minmax(0,1fr) auto;gap:6px;align-items:center;padding:2px 0;border-top:1px solid var(--line2);text-decoration:none;color:var(--body)}'
  + '.gsrow i{font-style:normal;border-radius:4px;background:#38e3cf2e;font-size:10px;font-weight:900;text-align:center;color:#c9fdf6}'
  + '.gsrow span{min-width:0}.gsrow b,.gsrow small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gsrow b{font-size:11.5px;font-weight:750;line-height:1.25}'
  + '.gsrow small{font-size:9.6px;line-height:1.25;color:var(--dim)}.gsrow em{font-style:normal;font-size:10px;font-weight:850;color:#9dffbf;white-space:nowrap}.gnote{font-size:11px;color:var(--dim)}'
  + '.toast{position:fixed;left:50%;bottom:18px;z-index:9;padding:8px 14px;border:1px solid #38e3cf99;border-radius:10px;background:#0d2a2c;color:#c9fdf6;font-size:12px;font-weight:800;opacity:0;transform:translate(-50%,8px);transition:.2s;pointer-events:none}'
  + '.toast.on{opacity:1;transform:translate(-50%,0)}');
