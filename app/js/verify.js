// Verification counts, computed at boot from trophies.json, never typed in. A claim is a walkthrough step or a
// guide phrase ending in a (Key, Key) cite group; it is "2+ sites" when its cites name two outlets (two IGN pages
// are one site). Draws the audit strip, the source matrix (shared with the Roadmap) and the Audit view.
import { el, link, btn, css, CHECKED } from './dom.js';
import { openTrophy } from './state.js';
import { auditSummary } from './codex.js';

// [outlet, scope]. All nine re-read on 20 Nov (TrueAchievements answers scripts with 403: its row keeps the
// method players report there).
const SCOPE = [
  ['PowerPyx', 'Roadmap + all 55 how-tos'], ['Push Square', 'Roadmap, menu paths, counts'],
  ['IGN Wiki', '100% bars, maps, missions'], ['Game Checklists', 'Missables: Yago timed race'],
  ['OutputLag', 'Trophy list, 100%, strands'], ['Exophase', 'Official descriptions'],
  ['TrueTrophies', 'PS5 list · 28 hidden'], ['Beebom', 'All 18 meditation spots'],
  ['TrueAchievements', 'Bad Luck, I Guess method'],
];

/** Split a guide into its cited phrases; `rest` is text after the last cite group (uncited). */
export function guideClaims(t) {
  const keys = new Set(t.sources.map((s) => s.key));
  const claims = [];
  let from = 0;
  for (const m of t.guide.matchAll(/\(([^()]+)\)/g)) {
    const cites = m[1].split(', ');
    if (!cites.every((k) => keys.has(k))) continue;
    claims.push({ text: t.guide.slice(from, m.index).replace(/^[\s.;,:]+/, ''), cites });
    from = m.index + m[0].length;
  }
  return { claims, rest: t.guide.slice(from).replace(/[\s.;,:]+/g, '') };
}

export const sites = (cites, byKey) => new Set(cites.map((k) => byKey.get(k)?.label)).size;

/** Attach claims and panels to every trophy; return the totals per outlet and per page. */
export function annotate(doc) {
  const byKey = new Map(doc.sources.map((s) => [s.key, s]));
  const byId = new Map(doc.trophies.map((t) => [t.id, t]));
  const g = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  const perLabel = new Map(SCOPE.map(([label]) => [label, { claims: 0, multi: 0, conflicts: 0 }]));
  const perPage = new Map(doc.sources.map((s) => [s.key, { claims: 0, conflicts: 0 }]));
  let claims = 0, multi = 0, uncited = 0;
  for (const t of doc.trophies) {
    g[t.grade] += 1;
    t.conflicts = [];
    const own = new Set(t.sources.map((s) => s.key));
    const guide = guideClaims(t);
    if (guide.rest) uncited += 1;
    t.claims = [...guide.claims, ...t.steps];
    t.multi = 0;
    for (const c of t.claims) {
      if (!c.cites.length || !c.cites.every((k) => own.has(k))) { uncited += 1; continue; }
      const two = sites(c.cites, byKey) > 1;
      claims += 1;
      multi += two;
      t.multi += two;
      for (const label of new Set(c.cites.map((k) => byKey.get(k).label))) {
        perLabel.get(label).claims += 1;
        perLabel.get(label).multi += two;
      }
      for (const k of new Set(c.cites)) perPage.get(k).claims += 1;
    }
  }
  for (const c of doc.conflicts) {
    for (const id of c.trophies) byId.get(id).conflicts.push(c);
    const keys = new Set(c.sides.flatMap(([k]) => k));
    for (const k of keys) perPage.get(k).conflicts += 1;
    for (const label of new Set([...keys].map((k) => byKey.get(k).label))) perLabel.get(label).conflicts += 1;
  }
  doc.audit = { n: doc.trophies.length, g, claims, multi, uncited, total: claims + uncited, conflicts: doc.conflicts.length,
    perLabel, perPage, outlets: perLabel.size, pages: doc.sources.length, byKey, read: CHECKED };
  return doc.audit;
}

export function renderAuditStrip(host, doc) {
  annotate(doc);
  const s = auditSummary(doc);
  host.innerHTML = `<span class=ok><b>✓ ${s.official}</b> official PS5</span><span>${s.grades}</span><span class=ok><b>${s.cited}</b> claims cited</span>`
    + `<span class=ok><b>${s.multi}</b> backed by 2+ sites (${s.outlets} outlets / ${s.pages} pages)</span><span class=dis><b>${s.disputes}</b> disputes shown both ways</span><span>read ${s.read} · 100% offline</span>`;
}

/** Per-outlet rows: claims, share a second site backs, disputes, read date; `pages` adds every page read. */
export function sourceMatrix(doc, pages) {
  const a = doc.audit;
  const card = el('div', `matrix${pages ? ' full' : ''}`, el('div', 'mrow mhead', ...['Source', 'Claims', 'On 2+ sites', 'Disputes', pages ? 'Pages · read' : 'Read'].map((c) => el('span', null, c))));
  for (const [label, scope] of SCOPE) {
    const r = a.perLabel.get(label);
    const keys = doc.sources.filter((s) => s.label === label);
    const rate = Math.round((r.multi / r.claims) * 100);
    const bar = el('span', 'mrate');
    bar.innerHTML = `<b>${r.multi}</b> <i>${rate}%</i><em style="width:${rate}%"></em>`;
    const name = link(null, keys[0].url, label);
    name.title = scope;
    card.append(el('div', 'mrow', name, el('b', null, String(r.claims)), bar, el('span', r.conflicts ? 'mdis' : null, r.conflicts ? `⚖ ${r.conflicts}` : '-'),
      pages ? `${keys.length} · ${a.read}` : a.read.slice(0, -5)));
    if (pages) {
      card.append(el('div', 'mpages', el('i', null, scope), ...keys.map((s) => {
        const p = a.perPage.get(s.key);
        const chip = link('mpage', s.url, s.page, el('b', null, p.claims ? String(p.claims) : `⚖${p.conflicts}`));
        chip.title = `${label}: ${s.page} · read ${a.read} · ${s.url}`;
        return chip;
      })));
    }
  }
  return card;
}

/** One chip per disagreement panel with how many sites it sets against each other; a click opens its trophy. */
export function disputeChips(doc, wide) {
  const a = doc.audit;
  return el('div', `dchips${wide ? ' wide' : ''}`, wide ? null : el('span', 'dlabel', `⚖ ${a.conflicts} disagreement panels`), ...doc.conflicts.map((c) => {
    const who = [...new Set(c.sides.flatMap(([keys]) => keys.map((k) => a.byKey.get(k).label)))];
    const chip = btn('dchip', el('i', null, String(who.length)), () => openTrophy(c.trophies[0]));
    chip.append(el('span', null, c.title), wide ? el('small', null, who.join(' vs ')) : '');
    chip.title = c.sides.map(([keys, says]) => `${keys.join(' + ')}: ${says}`).join('\n');
    return chip;
  }));
}

/** Audit view: headline tiles, every outlet with every page read, all disagreement panels. */
export function renderAuditView(host, doc) {
  const s = auditSummary(doc);
  host.replaceChildren(el('div', 'auhead', el('div', null, el('span', 'eyebrow', `Source audit · every page read ${s.read}`), el('h2', null, 'Verification Audit')),
    ...[[s.official, 'official PS5 trophies', 'ok'], [s.cited, `claims cited · ${s.uncited} uncited`, 'ok'], [s.multi, `on 2+ sites · ${s.rate}%`, 'ok'],
      [`${s.outlets} / ${s.pages}`, 'outlets / pages read', ''], [s.disputes, 'disputes, both sides', 'dis']].map(([big, small, tone]) => el('div', `autile ${tone}`, el('b', null, String(big)), small))),
  el('div', 'augrid', el('section', 'aucard', el('div', 'seclabel', 'Outlets & pages · claims per page · ⚖ = cited in a dispute only'), sourceMatrix(doc, true)),
    el('section', 'aucard', el('div', 'seclabel', `${s.disputes} disagreement panels · sites on each side`), disputeChips(doc, true))));
}

css('.audit span{display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 9px;border-radius:10px;background:#38e3cf14;box-shadow:inset 0 0 0 1px #38e3cf3d}'
  + '.audit b{color:#fff}.ok b{color:#7dffa8!important}.audit .dis{background:#ffb24d14;box-shadow:inset 0 0 0 1px #ffb24d4d}.dis b{color:#ffc061!important}'
  + '#audit-view{display:flex;flex-direction:column;gap:10px}.auhead{display:grid;grid-template-columns:minmax(0,1fr) repeat(5,150px);gap:8px;align-items:center}.auhead h2{margin:0;font-size:21px}'
  + '.autile{padding:5px 10px;border:1px solid var(--line);border-radius:10px;background:#141c30;font-size:10.5px;font-weight:700;color:var(--muted);white-space:nowrap}.autile b{display:block;font-size:20px;line-height:1.15;color:#fff}'
  + '.augrid{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 440px;gap:12px}'
  + '.aucard{min-height:0;overflow-y:auto;padding:0 14px 8px;border:1px solid var(--line);border-radius:13px;background:var(--panel)}'
  + '.mrow{height:16px;display:grid;grid-template-columns:112px 44px 92px 54px minmax(0,1fr);column-gap:11px;align-items:center;border-top:1px solid var(--line2);font-size:11px;color:#d2e8e3;white-space:nowrap}'
  + '.mhead{margin-top:4px;border:0;font-size:9.5px;font-weight:850;letter-spacing:.1em;text-transform:uppercase;color:var(--dim)}'
  + '.mrow a{font-weight:750;color:#bff8ef;text-decoration:none}.mrow b{color:#fff}.full .mrow{height:19px;font-size:12px;grid-template-columns:150px 60px 130px 70px minmax(0,1fr)}'
  + '.mrate{position:relative;display:flex;gap:5px;align-items:baseline}.mrate i{font-style:normal;color:#9fd8cc;font-size:10px}'
  + '.mrate em{position:absolute;left:0;bottom:0;height:2px;background:#3ddc84}.mdis{color:#ffc061;font-weight:800}'
  + '.mpages{display:flex;flex-wrap:wrap;align-items:center;gap:3px;padding:1px 0 5px}.mpages>i{font-style:normal;font-size:10.5px;color:var(--dim);margin-right:4px}'
  + '.mpage{display:inline-flex;gap:5px;align-items:center;height:18px;padding:0 3px 0 7px;border-radius:5px;background:#38e3cf12;color:#cdf7f0;font-size:10.8px;text-decoration:none;white-space:nowrap}'
  + '.mpage b{padding:0 4px;border-radius:4px;background:#38e3cf2e;font-size:10px}'
  + '.dchips{display:flex;flex-wrap:wrap;gap:2px;margin-top:5px}.dlabel{font-size:9.5px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#ffb24d}'
  + '.dchip{display:inline-flex;align-items:center;gap:3px;height:17px;padding:0 5px 0 2px;border:1px solid #ffb24d59;border-radius:6px;background:#ffb24d17;color:#ffe6c2;font-size:9.6px;font-weight:700;white-space:nowrap}'
  + '.dchip i{font-style:normal;min-width:13px;border-radius:4px;background:#ffb24d;color:#2a1600;font-size:9px;font-weight:900;text-align:center}'
  + '.wide{flex-direction:column;gap:3px}.wide .dchip{width:100%;height:26px;gap:7px;font-size:11.5px}.wide .dchip i{min-width:17px;font-size:10.5px}'
  + '.dchip small{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;text-align:right;font-size:10px;font-weight:600;color:#ffd9a3}');
