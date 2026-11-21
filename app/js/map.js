// Leonida Map: an original stylized SVG of six regions (not to scale, no tiles) with a pin per place a cited step
// names. Chips and regions filter pins and checklist; hover shows a pin's tooltip, click pins it with a guide link.
import { el, btn, css, medal, citePill } from './dom.js';
import { state, toggleEarned, openTrophy } from './state.js';
import { isMasked, maskName } from './filters.js';

// Region shapes overlap the sea and are clipped by one hand-drawn coastline; the Keys sit outside the clip.
const COAST = 'M22 74C120 66 220 72 300 66S470 62 556 70C566 120 552 150 558 200S544 262 540 290C536 330 534 352 526 380S500 436 474 446'
  + 'C448 454 416 462 392 462S350 452 336 438C314 414 300 392 296 362S282 290 270 246C264 214 262 196 248 188S196 190 160 186S80 176 44 164S18 120 22 74Z';
const REGIONS = [
  ['gellhorn', 'Port Gellhorn', 'M0 40H252L262 184 160 204H0Z', 128, 150],
  ['kalaga', 'Mount Kalaga', 'M252 40H600V172L420 166 330 182 262 184Z', 420, 140],
  ['ambrosia', 'Ambrosia', 'M262 184 330 182 420 166 600 172V282L430 292 310 302 276 242Z', 360, 262],
  ['grassrivers', 'Grassrivers', 'M276 242 310 302 430 292 440 332 420 402 470 450 400 530H240V242Z', 362, 384],
  ['vice', 'Vice City', 'M430 292 600 282V530H470L420 402 440 332Z', 560, 470],
  ['keys', 'Leonida Keys', 'M232 488c18-8 30-6 40 0-12 7-26 8-40 0ZM290 480c16-9 32-8 44-1-14 9-30 9-44 1ZM352 474c14-8 30-8 42-2-12 9-28 10-42 2ZM412 480c14-6 26-4 36 2-12 6-24 6-36-2Z', 330, 514],
];
const NAME = Object.fromEntries(REGIONS.map((r) => [r[0], r[1]]));

// [trophy id, region, x, y, place, index of the step that names it]
const PINS = [
  [28, 'kalaga', 420, 104, 'Mount Kalaga · the 18th meditation', 4],
  [8, 'gellhorn', 126, 90, "Hank's Waffles, north Port Gellhorn", 2],
  [17, 'gellhorn', 70, 114, 'Rodgers Ranch shooting ranges', 0],
  [46, 'gellhorn', 196, 108, 'Kingpin Bowling, Port Gellhorn', 0],
  [33, 'ambrosia', 392, 196, 'Train tunnel north of Ambrosia', 1],
  [37, 'vice', 452, 312, 'VCIA boarding bridges', 1],
  [34, 'vice', 490, 304, 'Vice City jewelry stores', 1],
  [26, 'vice', 522, 300, 'Vice Beach & Ocean Beach hotels', 2],
  [49, 'vice', 465, 340, 'Payday Loans, Little Cuba', 1],
  [39, 'vice', 488, 334, 'Richardson Jewelry & Diamonds', 3],
  [44, 'vice', 515, 328, 'Ocean View Rooftop Bar, Ocean Beach', 0],
  [51, 'vice', 512, 354, 'Ocean Beach crowds', 2],
  [27, 'vice', 469, 366, 'Kitty Litter labs', 1],
  [52, 'vice', 491, 362, 'Yasmani, the top-paying fence', 2],
  [45, 'vice', 474, 394, 'South Vice City showroom', 1],
  [2, 'keys', 312, 479, 'Leonida Keys · Gone Fishing drop', 1],
  [23, 'keys', 430, 482, "Key Lento · Kenton's dives", 0],
];

const CATS = [
  ['all', 'All pins', '#ff5c8a', null],
  ['meditation', 'Meditation Spots', '#b892ff', [28]],
  ['heists', 'Vaults & Heists', '#ffc061', [40, 41, 49, 39, 45, 46, 52, 34]],
  ['stunts', 'Stunt Jumps', '#ff8a4c', [15]],
  ['ranges', 'Shooting Ranges', '#ff5c8a', [17, 36]],
  ['wildlife', 'Wildlife & Fishing', '#7ee07a', [29, 20, 14]],
  ['strangers', 'Strangers & Freaks', '#38e3cf', [25, 22, 23, 24, 26, 27, 29]],
  ['sights', 'Story & Sights', '#8fb8ff', [2, 8, 37, 44, 51, 33, 42]],
];
const view = { cat: 'all', region: null, pinned: null };
let last;

const catOf = (id) => CATS.find((c) => c[3]?.includes(id)) ?? CATS[0];
const inCat = (id) => view.cat === 'all' || catIds().includes(id);
const catIds = () => CATS.find((c) => c[0] === view.cat)[3];
const nameOf = (t) => (isMasked(t, state) ? maskName(t) : t.name);
const SHIELD = 'Spoiler shield on · open the guide to peek.';
const rerender = (patch) => { Object.assign(view, patch); if (last) renderMap(...last); };

/** Checklist rows: pins in map order, then statewide trophies with no fixed place. */
export function mapRows(doc) {
  const byId = new Map(doc.trophies.map((t) => [t.id, t]));
  const rows = PINS.filter((p) => inCat(p[0]) && (!view.region || p[1] === view.region))
    .map(([id, region, , , place, step]) => ({ t: byId.get(id), region, place, step: byId.get(id).steps[step] }));
  if (!view.region && view.cat !== 'all') {
    for (const id of catIds().filter((x) => !PINS.some((p) => p[0] === x))) rows.push({ t: byId.get(id), region: 'state', place: 'Statewide · no fixed pin', step: byId.get(id).steps[0] });
  }
  return rows;
}

function mapSVG(rows) {
  const numbers = new Map(rows.map((r, i) => [r.place, i + 1]));
  let svg = '<defs><pattern id="mgrid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#38e3cf12"/></pattern>'
    + '<linearGradient id="msea" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0c2233"/><stop offset="1" stop-color="#0a1426"/></linearGradient>'
    + `<clipPath id="mland"><path d="${COAST}"/></clipPath></defs><rect width="600" height="530" rx="14" fill="url(#msea)"/><rect width="600" height="530" rx="14" fill="url(#mgrid)"/>`;
  for (const [id, name, d, lx, ly] of REGIONS) {
    const pins = PINS.filter((p) => p[1] === id).length;
    const on = view.region === id;
    svg += `<g class="reg${on ? ' on' : view.region ? ' off' : ''}" data-region="${id}" tabindex="0" role="button" aria-label="${name}: ${pins} cited pins"><path d="${d}"${id === 'keys' ? '' : ' clip-path="url(#mland)"'}/>`
      + `<text x="${lx}" y="${ly}" class="rl">${name.toUpperCase()}</text><text x="${lx}" y="${ly + 12}" class="rc">${pins ? `${pins} cited pin${pins > 1 ? 's' : ''}` : 'no cited pin yet'}</text></g>`;
  }
  svg += `<path d="${COAST}" class="coast"/><path d="M548 452 522 418" class="lead"/>`;
  for (const [id, , x, y, place] of PINS) {
    const lit = numbers.has(place);
    const won = state.earned.has(id);
    svg += `<g class="pin${lit ? ' lit' : ''}${won ? ' won' : ''}${view.pinned === place ? ' hot' : ''}" data-pin="${id}" data-place="${place}" tabindex="${lit ? 0 : -1}" style="--c:${catOf(id)[2]}">`
      + `<circle cx="${x}" cy="${y}" r="${lit ? 9 : 5}"/>${lit ? `<text x="${x}" y="${y + 3.5}">${won ? '✓' : numbers.get(place)}</text>` : ''}</g>`;
  }
  return `<svg class="lmap" viewBox="0 0 600 530" role="img" aria-label="Stylized map of Leonida">${svg}<g class="compass" transform="translate(560 40)"><circle r="16"/><path d="M0-12 4 0 0 12-4 0Z"/><text y="-19">N</text></g></svg>`;
}

/** Fill the tooltip and place it beside a pin; `pinned` adds the Open guide button. */
function showTip(wrap, pin, doc, pinned) {
  const tip = wrap.querySelector('.mtipbox');
  const p = PINS.find((x) => x[4] === pin.dataset.place);
  const t = doc.trophies.find((x) => x.id === p[0]);
  const step = t.steps[p[5]];
  const name = el('b');
  name.innerHTML = medal(t.grade, 14);
  name.append(nameOf(t));
  tip.replaceChildren(name, el('small', null, `${p[4]} · ${NAME[p[1]]}`), el('p', null, isMasked(t, state) ? SHIELD : step.text),
    el('div', 'mtcites', ...step.cites.map((k) => citePill(k, t.sources))), pinned ? btn('btn primary', 'Open guide →', () => openTrophy(t.id)) : '');
  const box = wrap.getBoundingClientRect();
  const at = pin.getBoundingClientRect();
  const below = at.top - box.top < 150;
  Object.assign(tip.style, { left: `${Math.min(Math.max(at.left - box.left + at.width / 2 - 130, 4), box.width - 264)}px`,
    top: below ? `${at.bottom - box.top + 8}px` : '', bottom: below ? '' : `${box.bottom - at.top + 8}px` });
  tip.className = `mtipbox on${pinned ? ' pinned' : ''}`;
}

function listRow({ t, region, place, step }, n) {
  const earned = state.earned.has(t.id);
  const placed = region && region !== 'state';
  const tick = btn('tick', earned ? '✓' : '', () => toggleEarned(t.id));
  tick.setAttribute('aria-pressed', earned);
  tick.setAttribute('aria-label', `${earned ? 'Unmark' : 'Mark'} ${nameOf(t)} as earned`);
  const name = btn('mname', null, () => openTrophy(t.id));
  name.innerHTML = medal(t.grade, 15);
  name.append(nameOf(t));
  const row = el('div', `mrow2${earned ? ' earned' : ''}`, tick, el('span', `mnum${placed ? '' : ' flat'}`, placed ? String(n) : '◎'),
    el('div', null, name, el('div', 'mwhere', placed ? `${place} · ${NAME[region]}` : place),
      el('div', 'mtip', el('span', null, isMasked(t, state) ? SHIELD : step.text), ...step.cites.map((k) => citePill(k, t.sources)))));
  row.style.setProperty('--c', catOf(t.id)[2]);
  return row;
}

function listPane(rows) {
  const won = rows.filter((r) => state.earned.has(r.t.id)).length;
  return el('aside', 'sidepane mlist',
    el('div', 'mhead2', el('span', 'eyebrow', `${view.region ? NAME[view.region] : 'All of Leonida'} · ${CATS.find((c) => c[0] === view.cat)[1]}`),
      el('h2', null, `${rows.length} cited stop${rows.length === 1 ? '' : 's'} · ${won} earned`), view.region ? btn('btn', `✕ ${NAME[view.region]}`, () => rerender({ region: null })) : null),
    rows.length ? '' : el('p', 'guide', 'No cited place in this region for these chips yet. Grassrivers has none in our sources; pick another region or All pins.'),
    ...rows.map((r, i) => listRow(r, i + 1)));
}

export function renderMap(host, doc) {
  last = [host, doc];
  const rows = mapRows(doc);
  const chips = el('div', 'mchips', ...CATS.map(([id, name, color, ids]) => {
    const b = btn('chip', name, () => rerender({ cat: id, region: null, pinned: null }));
    b.append(el('b', null, String(ids ? ids.length : PINS.length)));
    b.dataset.cat = id;
    b.style.setProperty('--c', color);
    b.setAttribute('aria-pressed', view.cat === id);
    return b;
  }));
  const wrap = el('div', 'mwrap');
  wrap.innerHTML = `${mapSVG(rows)}<div class="mtipbox" role="tooltip"></div>`;
  const card = el('section', 'mapcard',
    el('div', 'maphead', el('div', null, el('span', 'eyebrow', 'Collectibles, meditation spots & activities · field map'), el('h2', null, 'Leonida Map')),
      el('span', 'scount', `${PINS.length} pins from cited steps · hover or click a pin · stylized, 0 tiles`)),
    chips, wrap);
  const svg = wrap.querySelector('svg');
  const pinAt = (e) => e.target.closest?.('[data-pin]');
  const region = (r) => rerender({ region: view.region === r ? null : r, pinned: null });
  svg.onmouseover = (e) => { const pin = pinAt(e); if (pin && !view.pinned) showTip(wrap, pin, doc, false); };
  svg.onmouseout = (e) => { if (pinAt(e) && !view.pinned) wrap.lastChild.className = 'mtipbox'; };
  svg.onclick = (e) => {
    const pin = pinAt(e);
    const r = e.target.closest('[data-region]')?.dataset.region;
    if (pin) rerender({ pinned: view.pinned === pin.dataset.place ? null : pin.dataset.place });
    else if (view.pinned) rerender({ pinned: null });
    else if (r) region(r);
  };
  svg.onkeydown = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    const pin = pinAt(e);
    if (pin) openTrophy(Number(pin.dataset.pin));
    else if (e.target.dataset?.region) region(e.target.dataset.region);
  };
  const keep = host.querySelector('.mlist')?.scrollTop ?? 0;
  host.replaceChildren(card, listPane(rows));
  host.querySelector('.mlist').scrollTop = keep;
  const hot = view.pinned && svg.querySelector('.pin.hot');
  if (hot) showTip(wrap, hot, doc, true);
}

css('#map-view{display:grid;grid-template-columns:minmax(0,1fr) 480px;gap:14px}'
  + '.mapcard{display:flex;flex-direction:column;min-height:0;padding:10px 14px;border:1px solid #38e3cf4d;border-radius:13px;background:linear-gradient(160deg,#18213a,#111829)}'
  + '.maphead{display:flex;justify-content:space-between;align-items:flex-end;gap:10px}.maphead h2,.mhead2 h2{margin:0;font-size:21px;font-weight:840;line-height:1.2}'
  + '.mchips{display:flex;flex-wrap:wrap;gap:4px;margin:7px 0}.mchips .chip{gap:6px}.mchips .chip:before{content:"";width:8px;height:8px;border-radius:50%;background:var(--c)}'
  + '.mchips .chip[aria-pressed=true]{border-color:var(--c);background:color-mix(in srgb,var(--c) 22%,#1a2339)}'
  + '.mwrap{position:relative;flex:1;min-height:0}.lmap{display:block;width:100%;height:100%}'
  + '.reg{cursor:pointer;outline:0}.reg path{fill:#1d2b45;stroke:#5b7aa399;stroke-width:1.2}.reg:hover path,.reg:focus path{fill:#24395a}'
  + '[data-region=kalaga] path{fill:#1d3340}[data-region=grassrivers] path{fill:#1b3433}[data-region=keys] path{fill:#2b3a4d;stroke:#38e3cf8c}'
  + '.reg.on path{fill:#3a2b4f;stroke:#ff5c8a;stroke-width:2.4}.reg.off{opacity:.55}'
  + '.rl,.rc{font:900 12px var(--font);letter-spacing:.14em;fill:#e8eefb;text-anchor:middle;pointer-events:none}.rc{font:700 9.5px var(--font);letter-spacing:0;fill:#9fb2cc}'
  + '.lead{stroke:#8aa3c7;stroke-dasharray:2 3}.coast{fill:none;stroke:#38e3cf8c;stroke-width:2;pointer-events:none;filter:drop-shadow(0 0 5px #38e3cf66)}'
  + '.pin{cursor:pointer;outline:0}.pin circle{fill:#8091ab;stroke:#0b1020;stroke-width:1.5;opacity:.55}'
  + '.pin.lit circle{fill:var(--c);stroke:#fff;stroke-width:2;opacity:1;filter:drop-shadow(0 0 6px var(--c))}.pin.hot circle,.pin:focus circle{stroke:#ffc061;stroke-width:3}'
  + '.pin.won.lit circle{fill:#38e3cf}.pin text{font:900 10px var(--font);fill:#0b1020;text-anchor:middle;pointer-events:none}'
  + '.compass circle{fill:#0b1020aa;stroke:#ffffff33}.compass path{fill:#ff5c8a}.compass text{font:900 10px var(--font);fill:#ffb0c6;text-anchor:middle}'
  + '.mtipbox{position:absolute;z-index:3;width:260px;padding:8px 10px;border:1px solid #38e3cfb3;border-radius:10px;background:#0b1424f2;box-shadow:0 8px 24px #0009;display:none;pointer-events:none}'
  + '.mtipbox.on{display:block}.mtipbox.pinned{pointer-events:auto;border-color:#ffc061}.mtipbox b{display:flex;align-items:center;gap:6px;font-size:13px}'
  + '.mtipbox small,.mwhere{display:block;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#ffcf86}.mtipbox p{margin:3px 0 4px;font-size:11.8px;line-height:1.4;color:#dbe3ef}'
  + '.mtcites{display:flex;gap:3px}.mtipbox .btn{height:26px;margin-top:6px}'
  + '.mlist{padding:12px 14px}.mhead2{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:4px 10px;margin-bottom:6px}.mhead2 .eyebrow{width:100%}'
  + '.mrow2{display:grid;grid-template-columns:22px 22px minmax(0,1fr);gap:9px;align-items:start;padding:7px 0;border-top:1px solid var(--line2)}'
  + '.mnum{width:22px;height:22px;margin-top:2px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:900;color:#0b1020;background:var(--c)}.mnum.flat{background:#ffffff1f;color:var(--muted)}'
  + '.mname{display:flex;align-items:center;gap:6px;padding:0;font-size:14px;font-weight:780;text-align:left}'
  + '.mtip{display:flex;gap:8px;align-items:start;margin-top:1px;font-size:12px;line-height:1.4;color:#dbe3ef}.mtip>span{flex:1}');
