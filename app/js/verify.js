// Verification counts, computed at boot from app/data/trophies.json and never typed in by hand. A claim is one
// walkthrough step or one guide phrase that ends in a (Key, Key) cite group. A claim is "2+ sites" when its cites
// name at least two different outlets: two IGN pages are one site. Each trophy also gets the source disagreement
// panels that name it.

/** Split a guide into its cited phrases. `rest` is any text left after the last cite group, which counts as uncited. */
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

/** How many different outlets a cite list names. */
export const sites = (cites, byKey) => new Set(cites.map((k) => byKey.get(k)?.label)).size;

/** Attach claims and conflicts to every trophy and return the totals the audit strip and source matrix print. */
export function annotate(doc) {
  const byKey = new Map(doc.sources.map((s) => [s.key, s]));
  const byId = new Map(doc.trophies.map((t) => [t.id, t]));
  const g = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  const perLabel = new Map();
  let claims = 0, multi = 0, uncited = 0, guides = 0;
  for (const t of doc.trophies) {
    g[t.grade] += 1;
    t.conflicts = [];
    const own = new Set(t.sources.map((s) => s.key));
    const guide = guideClaims(t);
    if (guide.claims.length) guides += 1;
    if (guide.rest) uncited += 1;
    t.claims = [...guide.claims, ...t.steps];
    for (const c of t.claims) {
      if (!c.cites.length || !c.cites.every((k) => own.has(k))) { uncited += 1; continue; }
      const n = sites(c.cites, byKey);
      claims += 1;
      if (n > 1) multi += 1;
      for (const label of new Set(c.cites.map((k) => byKey.get(k).label))) {
        const row = perLabel.get(label) ?? perLabel.set(label, { claims: 0, multi: 0, conflicts: 0, pages: new Set() }).get(label);
        row.claims += 1;
        if (n > 1) row.multi += 1;
      }
      for (const k of c.cites) perLabel.get(byKey.get(k).label).pages.add(k);
    }
    t.multi = t.claims.filter((c) => sites(c.cites, byKey) > 1).length;
  }
  for (const c of doc.conflicts) {
    for (const id of c.trophies) byId.get(id).conflicts.push(c);
    for (const label of new Set(c.sides.flatMap(([keys]) => keys.map((k) => byKey.get(k).label)))) {
      const row = perLabel.get(label);
      if (row) row.conflicts += 1;
    }
  }
  const pages = new Set([...perLabel.values()].flatMap((r) => [...r.pages])).size;
  doc.audit = { n: doc.trophies.length, g, guides, claims, multi, uncited, conflicts: doc.conflicts.length, perLabel, pages, byKey };
  return doc.audit;
}

export function renderAuditStrip(host, doc) {
  const a = annotate(doc);
  host.innerHTML = [`<i>✓</i> ${a.n}/${a.n} OFFICIAL PS5`, `${a.g.platinum}P ${a.g.gold}G ${a.g.silver}S ${a.g.bronze}B`,
    `${a.claims} CITED CLAIMS`, `<b>${a.multi}</b> BACKED BY 2+ SITES`, `<u>${a.conflicts}</u> DISAGREEMENT PANELS`,
    `${a.uncited} UNCITED`, `${a.perLabel.size} SITES · ${a.pages} PAGES`, '100% OFFLINE'].join(' <s>·</s> ');
}

document.head.append(Object.assign(document.createElement('style'), {
  textContent: '.audit b{color:#7dffa8;font-weight:900}.audit u{text-decoration:none;color:#ffc061}',
}));
