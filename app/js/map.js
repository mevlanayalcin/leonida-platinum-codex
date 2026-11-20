// Leonida Map view: an original, stylized SVG schematic of the six regions (not to scale, no tiles) with a pin
// for every place a cited walkthrough step names, category chips and region clicks that filter both the pins and
// the checklist beside it. Each pin's tip is that trophy's own step text and cite, read from trophies.json.
import { el, medal, citePill } from './dom.js';
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

// [trophy id, region, x, y, place, index of the step that names it]; region null = named by the source, not placed.
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
  [24, null, 0, 0, 'Thrillbilly Mudclub, Kelly County', 0],
  [29, null, 0, 0, "Bret's hunts, Lummox County", 0],
  [22, null, 0, 0, "Andy's strand, Belville", 0],
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
const view = { cat: 'strangers', region: null };

const catOf = (id) => CATS.find((c) => c[3]?.includes(id)) ?? CATS[0];
const inCat = (id) => view.cat === 'all' || CATS.find((c) => c[0] === view.cat)[3].includes(id);

/** The checklist rows for the current chips: pins first (in map order), then statewide trophies with no fixed place. */
export function mapRows(doc) {
  const byId = new Map(doc.trophies.map((t) => [t.id, t]));
  const pins = PINS.filter((p) => inCat(p[0]) && (!view.region || p[1] === view.region));
  const rows = pins.map(([id, region, , , place, step]) => ({ t: byId.get(id), region, place, step: byId.get(id).steps[step] }));
  if (!view.region && view.cat !== 'all') {
    const ids = CATS.find((c) => c[0] === view.cat)[3].filter((id) => !PINS.some((p) => p[0] === id));
    for (const id of ids) rows.push({ t: byId.get(id), region: 'state', place: 'Statewide · no fixed pin', step: byId.get(id).steps[0] });
  }
  return rows;
}

function mapSVG(doc, rows) {
  const shown = new Set(rows.filter((r) => r.region && r.region !== 'state').map((r) => r.place));
  let n = 0;
  const numbers = new Map(rows.map((r) => [r.place, ++n]));
  let svg = '<defs><pattern id="mgrid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#38e3cf12"/></pattern>'
    + '<linearGradient id="msea" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0c2233"/><stop offset="1" stop-color="#0a1426"/></linearGradient></defs>'
    + '<rect width="600" height="530" rx="14" fill="url(#msea)"/><rect width="600" height="530" rx="14" fill="url(#mgrid)"/>';
  svg = svg.replace('</defs>', `<clipPath id="mland"><path d="${COAST}"/></clipPath></defs>`);
  for (const [id, name, d, lx, ly] of REGIONS) {
    const pins = PINS.filter((p) => p[1] === id);
    const on = view.region === id;
    svg += `<g class="reg${id === 'keys' ? '' : ' land'}${on ? ' on' : ''}${view.region && !on ? ' off' : ''}" data-region="${id}" tabindex="0" role="button" aria-label="${name}: ${pins.length} cited pins"><path d="${d}"${id === 'keys' ? '' : ' clip-path="url(#mland)"'}/>`
      + `<text x="${lx}" y="${ly}" class="rl">${name.toUpperCase()}</text><text x="${lx}" y="${ly + 12}" class="rc">${pins.length ? `${pins.length} cited pin${pins.length > 1 ? 's' : ''}` : 'no cited pin yet'}</text></g>`;
  }
  svg += `<path d="${COAST}" class="coast"/><path d="M548 452 522 418" class="lead"/>`;
  for (const [id, region, x, y, place] of PINS) {
    if (!region) continue;
    const lit = shown.has(place);
    const won = state.earned.has(id);
    svg += `<g class="pin${lit ? ' lit' : ''}${won ? ' won' : ''}" data-pin="${id}" style="--c:${catOf(id)[2]}"><title>${place}</title>`
      + `<circle cx="${x}" cy="${y}" r="${lit ? 9 : 5}"/>${lit ? `<text x="${x}" y="${y + 3.5}">${won ? '✓' : numbers.get(place)}</text>` : ''}</g>`;
  }
  svg += '<g class="compass" transform="translate(560 40)"><circle r="16"/><path d="M0-12 4 0 0 12-4 0Z"/><text y="-19">N</text></g>';
  return `<svg class="lmap" viewBox="0 0 600 530" role="img" aria-label="Stylized map of Leonida">${svg}</svg>`;
}

function chips() {
  const row = el('div', 'mchips');
  for (const [id, label, color, ids] of CATS) {
    const b = el('button', 'chip', label);
    b.type = 'button';
    b.dataset.cat = id;
    b.style.setProperty('--c', color);
    b.setAttribute('aria-pressed', String(view.cat === id));
    b.append(el('b', null, String(ids ? ids.length : PINS.filter((p) => p[1]).length)));
    b.onclick = () => { view.cat = id; view.region = null; rerender(); };
    row.append(b);
  }
  return row;
}

function listPane(doc, rows) {
  const pane = el('aside', 'sidepane mlist');
  const cat = CATS.find((c) => c[0] === view.cat);
  const won = rows.filter((r) => state.earned.has(r.t.id)).length;
  const head = el('div', 'mhead2');
  head.append(el('span', 'eyebrow', `${view.region ? NAME[view.region] : 'All of Leonida'} · ${cat[1]}`),
    el('h2', null, `${rows.length} cited stop${rows.length === 1 ? '' : 's'} · ${won} earned`));
  if (view.region) {
    const clear = el('button', 'btn', `✕ ${NAME[view.region]}`);
    clear.type = 'button';
    clear.onclick = () => { view.region = null; rerender(); };
    head.append(clear);
  }
  pane.append(head);
  if (!rows.length) pane.append(el('p', 'guide', 'No cited place in this region for these chips yet. Grassrivers has none in our sources; pick another region or All pins.'));
  let n = 0;
  for (const { t, region, place, step } of rows) {
    n += 1;
    const masked = isMasked(t, state);
    const earned = state.earned.has(t.id);
    const row = el('div', `mrow2${earned ? ' earned' : ''}`);
    row.style.setProperty('--c', catOf(t.id)[2]);
    const tick = el('button', 'tick', earned ? '✓' : '');
    tick.type = 'button';
    tick.setAttribute('aria-pressed', String(earned));
    tick.setAttribute('aria-label', `${earned ? 'Unmark' : 'Mark'} ${masked ? maskName(t) : t.name} as earned`);
    tick.onclick = () => toggleEarned(t.id);
    const num = el('span', `mnum${region === 'state' || !region ? ' flat' : ''}`, region === 'state' ? '◎' : region ? String(n) : '?');
    const body = el('div', 'mbody');
    const name = el('button', 'mname');
    name.type = 'button';
    name.innerHTML = medal(t.grade, 15);
    name.append(masked ? maskName(t) : t.name);
    name.onclick = () => openTrophy(t.id);
    const where = el('div', 'mwhere', `${place}${region && region !== 'state' ? ` · ${NAME[region]}` : region ? '' : ' · region not given'}`);
    const tip = el('div', 'mtip');
    tip.append(el('span', null, masked ? 'Spoiler shield on · open the guide to peek.' : step.text), citePill(step.cite, t.sources));
    body.append(name, where, tip);
    row.append(tick, num, body);
    pane.append(row);
  }
  return pane;
}

let last;
function rerender() { if (last) renderMap(...last); }

export function renderMap(host, doc) {
  last = [host, doc];
  const rows = mapRows(doc);
  const card = el('section', 'mapcard');
  const head = el('div', 'maphead');
  const title = el('div');
  title.append(el('span', 'eyebrow', 'Collectibles & activities · field map'), el('h2', null, 'Leonida Map'));
  const placed = PINS.filter((p) => p[1]).length;
  head.append(title, el('span', 'scount', `${placed} pins from cited steps · stylized, not to scale · 0 tiles`));
  card.append(head, chips());
  card.insertAdjacentHTML('beforeend', mapSVG(doc, rows));
  const tray = el('div', 'mtray');
  tray.append(el('b', null, 'Named, not placed:'));
  for (const [id, , , , place] of PINS.filter((p) => !p[1])) {
    const b = el('button', 'mtp', place);
    b.type = 'button';
    b.onclick = () => openTrophy(id);
    tray.append(b);
  }
  card.append(tray);
  card.querySelector('.lmap').onclick = (event) => {
    const pin = event.target.closest('[data-pin]');
    if (pin) { openTrophy(Number(pin.dataset.pin)); return; }
    const region = event.target.closest('[data-region]')?.dataset.region;
    if (region) { view.region = view.region === region ? null : region; rerender(); }
  };
  card.querySelector('.lmap').onkeydown = (event) => {
    const region = event.target.closest?.('[data-region]')?.dataset.region;
    if (region && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); view.region = view.region === region ? null : region; rerender(); }
  };
  const keep = host.querySelector('.mlist')?.scrollTop ?? 0;
  host.replaceChildren(card, listPane(doc, rows));
  host.querySelector('.mlist').scrollTop = keep;
}

const MAP_CSS = '#map-view{display:grid;grid-template-columns:minmax(0,1fr) 500px;gap:14px}'
  + '.mapcard{display:flex;flex-direction:column;min-height:0;padding:10px 14px 10px;border:1px solid #38e3cf4d;border-radius:13px;background:radial-gradient(420px 160px at 0 0,#38e3cf17,#0000),linear-gradient(160deg,#18213a,#111829)}'
  + '.maphead{display:flex;justify-content:space-between;align-items:flex-end}.maphead h2,.mhead2 h2{margin:0;font-size:21px;font-weight:840;letter-spacing:-.02em;line-height:1.2}'
  + '.mchips{display:flex;flex-wrap:wrap;gap:4px;margin:7px 0}.mchips .chip{gap:6px}.mchips .chip:before{content:"";width:8px;height:8px;border-radius:50%;background:var(--c)}'
  + '.mchips .chip[aria-pressed=true]{border-color:var(--c);background:color-mix(in srgb,var(--c) 22%,#1a2339)}'
  + '.lmap{flex:1;min-height:0;width:100%}'
  + '.reg{cursor:pointer;outline:0}.reg path{fill:#1d2b45;stroke:#5b7aa399;stroke-width:1.2;transition:fill .15s}.reg:hover path,.reg:focus path{fill:#24395a}'
  + '.reg[data-region=kalaga] path{fill:#1d3340}.reg[data-region=grassrivers] path{fill:#1b3433}.reg[data-region=keys] path{fill:#2b3a4d;stroke:#38e3cf8c}'
  + '.reg.on path{fill:#3a2b4f;stroke:#ff5c8a;stroke-width:2.4}.reg.off{opacity:.55}'
  + '.rl{font:900 12px var(--font);letter-spacing:.14em;fill:#e8eefb;text-anchor:middle;pointer-events:none}.rc{font:700 9.5px var(--font);fill:#9fb2cc;text-anchor:middle;pointer-events:none}'
  + '.lead{stroke:#8aa3c7;stroke-dasharray:2 3}.coast{fill:none;stroke:#38e3cf8c;stroke-width:2;pointer-events:none;filter:drop-shadow(0 0 5px #38e3cf66)}'
  + '.mtp{height:22px;padding:0 8px;border:1px dashed #ffc06173;border-radius:6px;background:#ffc06112;color:#ffe2a8;font-size:10.8px;font-weight:700}'
  + '.pin{cursor:pointer}.pin circle{fill:#8091ab;stroke:#0b1020;stroke-width:1.5;opacity:.55}'
  + '.pin.lit circle{fill:var(--c);stroke:#fff;stroke-width:2;opacity:1;filter:drop-shadow(0 0 6px var(--c))}'
  + '.pin.won.lit circle{fill:#38e3cf}.pin text{font:900 10px var(--font);fill:#0b1020;text-anchor:middle;pointer-events:none}'
  + '.compass circle{fill:#0b1020aa;stroke:#ffffff33}.compass path{fill:#ff5c8a}.compass text{font:900 10px var(--font);fill:#ffb0c6;text-anchor:middle}'
  + '.mtray{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin-top:6px;font-size:11px;color:var(--dim)}.mtray b{margin-right:2px}'
  + '.mlist{padding:12px 14px}.mhead2{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:4px 10px;margin-bottom:6px}.mhead2 .eyebrow{width:100%}'
  + '.mrow2{display:grid;grid-template-columns:22px 22px minmax(0,1fr);gap:9px;align-items:start;padding:7px 0;border-top:1px solid var(--line2)}'
  + '.mrow2 .tick{margin-top:2px}.mrow2.earned .tick{background:var(--lagoon);border-color:var(--lagoon);color:#04241f}'
  + '.mnum{width:22px;height:22px;margin-top:2px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:900;color:#0b1020;background:var(--c)}.mnum.flat{background:#ffffff1f;color:var(--muted)}'
  + '.mname{display:flex;align-items:center;gap:6px;padding:0;font-size:14px;font-weight:780;text-align:left}'
  + '.mwhere{font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#ffcf86}'
  + '.mtip{display:flex;gap:8px;justify-content:space-between;align-items:start;margin-top:1px;font-size:12px;line-height:1.4;color:#dbe3ef}';
document.head.append(Object.assign(document.createElement('style'), { textContent: MAP_CSS }));
