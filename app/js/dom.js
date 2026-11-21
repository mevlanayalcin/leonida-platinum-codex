// Shared view helpers: element/button builders, the grade medallion sprite, cite and 2+ sites pills, styles.
export const CHECKED = '20 Nov 2026';
export const GRADE_LABEL = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };

const stops = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const SPRITE = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>'
  + stops('gp', '#f6feff', '#76c3dc') + stops('gg', '#ffeaa6', '#d4861a') + stops('gs', '#ffffff', '#8995aa') + stops('gb', '#f7c193', '#9b5426')
  + '<symbol id="m-platinum" viewBox="0 0 24 24"><path d="M12 1.2 22.8 12 12 22.8 1.2 12Z" fill="url(#gp)" stroke="#e9fcff"/><path d="M12 6 18 12 12 18 6 12Z" fill="none" stroke="#2c6a80" stroke-width="1.4"/></symbol>'
  + '<symbol id="m-gold" viewBox="0 0 24 24"><path d="m12 1.4 3.2 6.6 7.2.9-5.3 5 1.4 7.2L12 17.6l-6.5 3.5 1.4-7.2-5.3-5 7.2-.9Z" fill="url(#gg)" stroke="#fff0bf" stroke-linejoin="round"/></symbol>'
  + '<symbol id="m-silver" viewBox="0 0 24 24"><path d="M12 1.4 21.2 6.6v10.8L12 22.6 2.8 17.4V6.6Z" fill="url(#gs)" stroke="#f5f8ff"/><path d="m7.6 10.2 4.4 3.6 4.4-3.6" fill="none" stroke="#475266" stroke-width="2" stroke-linecap="round"/></symbol>'
  + '<symbol id="m-bronze" viewBox="0 0 24 24"><path d="M12 1.6 20.6 4.8v6.8c0 5.1-3.6 8.9-8.6 10.8-5-1.9-8.6-5.7-8.6-10.8V4.8Z" fill="url(#gb)" stroke="#ffd9b8"/><path d="M12 6.2v11" stroke="#5c2d10" stroke-width="2" stroke-linecap="round"/></symbol>'
  + '</defs></svg>';

/** An element with a class and children (strings become text). */
export function el(tag, className, ...kids) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...kids.filter((k) => k != null));
  return node;
}

/** A type=button button. */
export function btn(className, text, onclick) {
  const b = el('button', className, text);
  b.type = 'button';
  b.onclick = onclick;
  return b;
}

export const css = (text) => document.head.append(el('style', null, text));

/** Medallion markup for a grade, readable at thumbnail size by its shape and metal tone. */
export const medal = (grade, size = 24) => `<svg class="medal" width="${size}" height="${size}" aria-hidden="true"><use href="#m-${grade}"/></svg>`;

export function gradeBadge(grade) {
  const badge = el('span', `grade ${grade}`);
  badge.innerHTML = `${medal(grade, 16)}${GRADE_LABEL[grade]}`;
  return badge;
}

export function link(className, href, ...kids) {
  const a = el('a', className, ...kids);
  Object.assign(a, { href, target: '_blank', rel: 'noopener noreferrer' });
  return a;
}

/** The muted pill that names one source by its catalog key and links to the exact page. */
export function citePill(key, sources, withPage) {
  const s = sources.find((x) => x.key === key);
  const pill = link('citep', s.url, withPage && s.label === 'IGN Wiki' ? `IGN: ${s.page}` : s.label);
  pill.title = `${s.label}: ${s.page} (checked ${CHECKED})`;
  return pill;
}

/** Green when a claim's cites name two or more different sites, amber when one site carries it alone. */
export function sitePill(n) {
  const pill = el('span', `sitep${n > 1 ? ' two' : ''}`, n > 1 ? `${n} sites` : '1 site · verify');
  pill.title = n > 1 ? `Backed by ${n} independent sites` : 'Only one site states this: double-check in game';
  return pill;
}

css('.medal{flex:none;display:block;filter:drop-shadow(0 1px 1.5px #0009)}'
  + '.grade{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px 0 6px;border:1px solid;border-radius:7px;font-size:11px;font-weight:850;white-space:nowrap}'
  + '.grade.platinum{color:#e4fbff;border-color:#9fe6f87a;background:#9fe6f81f}.grade.gold{color:#ffe7a6;border-color:#f2b9447a;background:#f2b9441f}'
  + '.grade.silver{color:#f1f5fc;border-color:#d3dbe773;background:#d3dbe71a}.grade.bronze{color:#ffd2b0;border-color:#d58c5a7a;background:#d58c5a1f}'
  + '.flag,.pill{display:inline-flex;align-items:center;height:21px;padding:0 7px;border-radius:6px;font-size:10px;font-weight:850;letter-spacing:.03em;text-transform:uppercase;white-space:nowrap;color:var(--muted);background:#ffffff12}'
  + '.missable,.pill.coral{color:#ffe1ea;background:#ff5c8a40;box-shadow:inset 0 0 0 1px #ff5c8aa6}.flag.save{color:#ffe3ad;background:#ffc0611f}'
  + '.flag.tracked,.pill.teal{color:#c4fbf3;background:#38e3cf1c;box-shadow:inset 0 0 0 1px #38e3cf4d}'
  + '.flag.cited{color:#9fe9dd;background:none;box-shadow:inset 0 0 0 1px #38e3cf40;text-transform:none}'
  + '.citep{flex:none;padding:1px 6px;border-radius:5px;background:#38e3cf17;color:#8fe3d6;font-size:9.8px;font-weight:750;text-decoration:none;white-space:nowrap;box-shadow:inset 0 0 0 1px #38e3cf33}'
  + '.sitep{padding:1px 5px;border-radius:5px;font-size:9px;font-weight:900;text-transform:uppercase;white-space:nowrap;color:#ffd58a;background:#ffc0611a}'
  + '.sitep.two{color:#9dffbf;background:#3ddc841a;box-shadow:inset 0 0 0 1px #3ddc8466}'
  + '.cite{color:#8ff0e2;font-weight:700;text-decoration:none;border-bottom:1px dotted #8ff0e299}'
  + '.seclabel{display:flex;justify-content:space-between;align-items:baseline;margin:9px 0 5px;font-size:10px;font-weight:850;letter-spacing:.13em;text-transform:uppercase;color:var(--dim)}'
  + '.seclabel b{color:#9fe9dd;letter-spacing:.06em}');
document.body.insertAdjacentHTML('afterbegin', SPRITE);
