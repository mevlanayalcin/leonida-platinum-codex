# leonida-platinum-codex

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/mevlanayalcin/leonida-platinum-codex/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/mevlanayalcin/leonida-platinum-codex/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline GTA VI trophy guide and tracker for all 55 official PS5 trophies: every official name, description and grade kept verbatim (1 platinum, 2 gold, 6 silver, 46 bronze, 28 hidden), an original guide per trophy whose every claim names each site that states it (146 of 385 claims on 2+ sites), 18 panels where the sites disagree, a Platinum command strip with a remaining-hours estimate and next-step advice, a chapter-by-chapter point-of-no-return timeline, a three-phase roadmap that maps all 55 trophies and flags 2 missable risks, an offline SVG map of Leonida, spoiler-safe reading and portable JSON backup. No accounts, no network calls: the whole guide is static files and progress lives in this browser.

## What v6 changes (20 Nov 2026)

- **Every claim names every site that states it.** All nine sources were re-read on 20 Nov, and each of the 385 claims (232 walkthrough steps and 153 guide phrases) was checked against every page that could hold it. A second site is listed only where its page states the same fact. 146 claims (38%) are now backed by 2 or more different sites. Two IGN pages count as one site. Each step ends in its cite pills and a green `N SITES` or amber `1 SITE · VERIFY` badge. The audit strip and the per-source matrix count all of this at boot (`app/js/verify.js`), from the data, and no number is typed in by hand.
- **18 source disagreement panels.** Where the sites disagree, `trophies.json` keeps each side with its cites, plus the call we make. The panels cover platinum hours (PowerPyx ~200 h, Push Square up to 300+ h), the missable count, whether the Ch.1 meditation counts, whether Race Against Yago is missable (Game Checklists and OutputLag say yes, PowerPyx says hourglass quests don't matter), chapter trophies popping one mission late, the 100% menu path, optional missions for 100%, Maximum Withdrawal's grade (Push Square says bronze), race count (39 vs 40), Kenton's wrecks, the arcade games, Master of None's race slot, strand mission names, Scooter Bros registration, the WAiNK total, Thrillbillies, the Rhino tanks and Top Fun fees. The panels sit amber on the detail pane. A `Conflicts 18` chip next to `Missable 2` filters the list to them, and the Roadmap lists them as chips.
- **Corrections found while re-reading.**
  - Twelve hidden flags now follow TrueTrophies' PS5 list. Six strand trophies plus Fair Game are hidden, and Hot Together, Retail Therapy, Gunslinger, Sneakthief, A Classic Blitz Play and Pest Control are visible. The total is still 28.
  - PowerPyx now states the Bad Luck, I Guess method outright: as Lucia, alone, after Credit Check, escaping on foot.
  - Push Square's estimate is now "up to 300 hours or more".
  - Claims that cited Exophase for grades and counters it does not show now cite the sites that do. The Exophase page we can read lists the official descriptions only.
- **Compact data, same budgets.** `trophies.json` keeps one `sourceCatalog` of 28 pages. Trophies and steps refer to pages by key (`PPX`, `PSQ`, `I100`, and so on), and a step is `[text, ...cites]`. `state.js` expands this at boot and `main.ts` expands it the same way in its guard. The file went from 62.7 KB to 50.4 KB, with the panels included. The first load is 4 files, 4,974 bytes gzip-9. The dossier text is 156,468 of 163,840 bytes, with no file cut.
- **Stricter guard.** `main.ts` refuses the build in these cases:
  - a cite key isn't one of that trophy's sources
  - a guide has words after its last cite group
  - a panel has fewer than two sides from two sites

## What v5 changed (20 Nov 2026)

- **Platinum command strip** (`app/js/codex.js`, Tracker view). An SVG donut shows `X / 55` with earned-by-grade counts and PSN points (15/30/90/300 per grade, 1,350 total). A remaining-hours estimate starts from PowerPyx's ~200 h and splits it by our own per-trophy weighting (grade, story, counters), so it is a planning estimate, not a sourced figure. **Next Smart Step** recommends one trophy: a missable whose chapter is still open comes first, then the story in save-slot order, then phases 2 and 3. If a missable's chapter ends before you earn it, the strip names the start-of-chapter save to reload. It also shows PowerPyx's warning that cheats block trophies and saving.
- **A Long Road counters.** Eight -/+ counters, saved to `localStorage`: 100 optional missions, 200 of 277 vehicles, 100 of 255 animals, 300 stunts (Cunning Stunts at 250), 70 challenges (One Last Thing at 50), 42 range golds, 8 vaults (Maximum Withdrawal at 5) and 8 stranger strands. Each counter links the source of its target. Shift-click steps by 10.
- **Story and point-of-no-return timeline** (Roadmap view). An SVG track runs Ch.1 to Ch.5 plus post-game. It marks the 10 chapter saves S1-S10 and flags where the Ch.1 balcony meditation and Ch.3 Yago race windows close. Each chapter column lists its story trophies, its missable and what it opens for free roam. The three stages are now called phases.
- **Leonida Map** (`app/js/map.js`). An original stylized SVG (not to scale, no tiles) of Port Gellhorn, Mount Kalaga, Ambrosia, Grassrivers, Vice City and the Leonida Keys. It has 17 pins, one for each place a cited walkthrough step names, and each pin's tip is that step's text and cite. Category chips and region clicks filter the pins and the checklist beside them. Places our sources name without a region (Kelly County, Lummox County, Belville) sit in a "named, not placed" tray. Grassrivers shows "no cited pin yet".
- **Backup and keys.** Export now includes the counters. A compact share code (`LPC1-<earned bitmask>-<counters>`) imports through the same validated restore box. The list has a sort menu. Keys: `/` search, `1`-`4` views (Tracker, Roadmap, Leonida Map, Backup), `S` Spoiler Mode, `Esc` back to the tracker.
- **Same accuracy guard.** 55/55 official trophies, 1/2/6/46, 28 hidden, 229/229 cited steps, 2 missables. `trophies.json` drops default-valued fields (`false`, `null`, `""`), with the same meaning and about 4 KB smaller. `main.ts` now also refuses a build whose dossier text would cut a source file. The first load is still 4 files at about 5.2 KB gzip-9.

## What v4.2 changes (day-2 pass, 20 Nov 2026)

- **A second missable risk.** [Game Checklists' missables page](https://game-checklists.com/gta6/guides/missables/) and [OutputLag's Strangers & Freaks guide](https://outputlag.com/guides/gta-6-side-missions-strangers-freaks/) both mark Race Against Yago, a timed Chapter 3 hourglass mission, as a risk to Strangers & Freaks. That trophy now carries `missable: true` with its own chapter tag, note and callout sources. The Missable filter shows 2, Stage 1 of the roadmap is "Story + 2 missable risks", and the guardrails list both. `detail.js` and `roadmap.js` read the label and cites from `trophies.json` instead of hard-coding the Chapter 1 case.
- **Bad Luck, I Guess has a method.** [TrueAchievements](https://www.trueachievements.com/a677828/bad-luck-i-guess-achievement) players report that it pops when you rob the Prologue's Payday Loans store a second time. PowerPyx still calls it unconfirmed but points at the same store in Little Cuba, and the guide says both.
- **Sources re-checked.** All 27 other source URLs returned HTTP 200 on 20 Nov. TrueAchievements blocks scripted requests with a 403, but its page is in search results with the reported method. The Source Verification Matrix now lists nine sources with the date each was last read. `main.ts` checks that there are exactly 2 missables and that each missable cites only that trophy's own sources.

## What v4 changed

- **Every walkthrough step is cited.** Steps in `app/data/trophies.json` are `{ "text", "cite" }`, and `cite` must name one of that trophy's own sources. `detail.js` ends each step row with a source pill (`citePill`) that links to the exact page. `main.ts` refuses the build on any uncited step, and the audit strip (`auditTrophies` in `app.js`) recomputes `55/55 OFFICIAL PS5 · 1P 2G 6S 46B · 55/55 CITED GUIDES · 227/227 CITED STEPS · 0 UNCITED · 100% OFFLINE` at boot.
- **Sources re-checked on 19 Nov 2026 and pointed at real pages.** Guides and steps were rewritten in our own words from pages that were read for this version: the [PowerPyx trophy guide](https://www.powerpyx.com/gta-6-grand-theft-auto-vi-trophy-guide-roadmap/), the [Push Square trophy guide](https://www.pushsquare.com/guides/gta-6-trophy-guide-and-roadmap), IGN's GTA 6 wiki pages (for example the [100% guide](https://www.ign.com/wikis/gta-6/GTA_6_100_Percent_Guide)), [Beebom's meditation spots](https://beebom.com/gta-6-meditation-spots-locations/), the [Exophase PS5 list](https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/) and the [TrueTrophies list reveal](https://www.truetrophies.com/news/grand-theft-auto-vi-playstation-trophies). Bare homepages and links that returned 404 are gone. Where the sources disagree or are unsure, the guide says so: Positive Mental Attitude is flagged as a *missable risk* because PowerPyx calls it "potentially" missable and Push Square lists no missables.
- **Chapter saves follow PowerPyx's plan.** PowerPyx recommends 10 saves, one at the start and one at the end of each chapter, because the game has no mission replay. The ten story trophies at those points carry `saveSlot` 1-10 and a one-line note.
- **Leonida Dusk look.** A midnight-slate base with a coral-to-lagoon hairline, an original sunset mark, and inline SVG medallions in `dom.js`: a diamond for platinum, a star for gold, a crest for silver and a shield for bronze.
- **Roadmap fixes.** Full trophy names in every pill. Stage 3 is grouped as Strangers 8 · Collectibles & World 9 · Activities & Combat 17 · Platinum 1. The source matrix has fixed `Source / Coverage / Date / Scope` columns with tabular numbers.
- **Spoiler states shown together.** In Spoiler Mode, earned story trophies show `Earned · unshielded`, a peeked one shows `Peeked · hide`, and the rest stay `Hidden story trophy` with a `Peek` button.
- **First load stays small:** `index.html`, `styles.css`, `app.js` and `state.js`, about 5.2 KB gzip-9. The list, guide, roadmap and backup modules arrive through literal `import()` and bring their own CSS.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
node serve.ts   # then open http://localhost:8080
```

`app/` is a plain static folder: `index.html`, `styles.css`, `js/` modules and `data/trophies.json`. The map and every chart are inline SVG. No build step, no runtime fetch except its own trophy file and its own modules.

---

<sub>Entered on [make.fun](https://make.fun/?ref=0fhdkvxa&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
