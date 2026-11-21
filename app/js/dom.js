// DOM helpers shared by every lazy view, plus the shared component styles (flags, medals, outlet chips).
// A cite chip names its outlet (PowerPyx, Beebom, IGN Wiki...) and is a plain external link: nothing is fetched
// until the reader clicks it.

export const CHECKED = '20 Nov 2026';
export const GRADE_LABEL = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };

const GRADE_FILL = { platinum: ['#e9fbff', '#7fd3ef'], gold: ['#fff1b8', '#e8a92c'], silver: ['#ffffff', '#9aa8bc'], bronze: ['#ffd2b0', '#c0703f'] };
// One hue per outlet so a reader can scan who said what.
const HUE = { PowerPyx: '#ff7aa2', 'Push Square': '#ff9f5a', 'IGN Wiki': '#ff5f5f', Exophase: '#8fb8ff', TrueTrophies: '#b892ff',
  Beebom: '#ffd166', 'Game Checklists': '#7ee07a', OutputLag: '#38e3cf', TrueAchievements: '#5fd0ff' };
export const hueOf = (label) => HUE[label] ?? '#cfd8e6';

/** el('div', 'cls', 'text', node, null): falsy kids are skipped, strings become text. */
export function el(tag, className, ...kids) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const kid of kids.flat()) if (kid || kid === 0) node.append(kid);
  return node;
}

export function btn(className, text, onclick) {
  const b = el('button', className, text);
  b.type = 'button';
  if (onclick) b.onclick = onclick;
  return b;
}

export const css = (text) => document.head.append(el('style', null, text));

/** A trophy cup as an SVG string, filled by grade. */
export const medal = (grade, size = 24) => {
  const [a, b] = GRADE_FILL[grade] ?? GRADE_FILL.bronze;
  return `<svg class="medal" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v4a6 6 0 0 1-12 0zM6 5H3a3 3 0 0 0 3 4M18 5h3a3 3 0 0 1-3 4M10 13h4l1 4H9zM7 18h10v3H7z" fill="${b}" stroke="#0b1020" stroke-width=".8"/>`
    + `<path d="M8 4.5h3.5v3.2A3.6 3.6 0 0 1 8 6.6z" fill="${a}"/></svg>`;
};

export function gradeBadge(grade) {
  const b = el('span', `gbadge ${grade}`);
  b.innerHTML = medal(grade, 15);
  b.append(GRADE_LABEL[grade]);
  return b;
}

export function link(className, href, ...kids) {
  const a = el('a', className, ...kids);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  return a;
}

/** A named outlet chip for one cite key; `withPage` adds the page title. Unknown keys render as plain text. */
export function citePill(key, sources, withPage) {
  const s = sources.find((x) => x.key === key);
  if (!s) return el('span', 'cite', key);
  const a = link('cite', s.url, s.label, withPage ? el('i', null, s.page) : null);
  a.style.setProperty('--h', hueOf(s.label));
  a.title = `${s.label} · ${s.page} · read ${CHECKED}`;
  return a;
}

export function sitePill(n) {
  return el('span', `sites${n > 1 ? ' multi' : ''}`, n > 1 ? `✓ ${n} sites` : '1 site');
}

css('.medal{flex:none;vertical-align:middle}'
  + '.gbadge{display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 8px 0 5px;border-radius:7px;background:#ffffff12;font-size:11.5px;font-weight:850;text-transform:uppercase;letter-spacing:.05em}'
  + '.gbadge.platinum{color:#c8f3ff}.gbadge.gold{color:#ffd56e}.gbadge.silver{color:#e3e9f3}.gbadge.bronze{color:#f3b48a}'
  + '.flag{display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 7px;border-radius:6px;font-size:10.5px;font-weight:850;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;background:#ffffff14;color:var(--muted)}'
  + '.flag.missable{background:var(--crimson);color:#fff}.flag.save{background:#8fb8ff26;color:#cfe0ff}.flag.cited{background:#38e3cf1f;color:#a6fff2;text-transform:none}.flag.tracked{background:#38e3cf26;color:#a6fff2}'
  + '.cite{display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 7px;border-radius:10px;background:color-mix(in srgb,var(--h,#cfd8e6) 16%,#0d1424);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--h,#cfd8e6) 55%,transparent);color:#f4f7fc;font-size:11px;font-weight:780;text-decoration:none;white-space:nowrap;vertical-align:1px}'
  + '.cite:before{content:"";width:6px;height:6px;border-radius:50%;background:var(--h,#cfd8e6)}.cite:hover{background:color-mix(in srgb,var(--h) 32%,#0d1424)}.cite i{font-style:normal;font-weight:600;color:var(--muted)}'
  + '.sites{display:inline-flex;align-items:center;height:19px;padding:0 7px;border-radius:6px;background:#ffffff12;font-size:10.5px;font-weight:850;color:var(--muted);white-space:nowrap}.sites.multi{background:#3ddc8426;color:#8dffb8}');
