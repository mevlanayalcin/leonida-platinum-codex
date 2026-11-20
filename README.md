# leonida-platinum-codex

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/mevlanayalcin/leonida-platinum-codex/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/mevlanayalcin/leonida-platinum-codex/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline GTA VI trophy guide and tracker for all 55 official PS5 trophies: every official name, description and grade kept verbatim (1 platinum, 2 gold, 6 silver, 46 bronze, 28 hidden), an original guide per trophy whose every walkthrough step names its source, a three-stage platinum roadmap that maps all 55 trophies, spoiler-safe reading and portable JSON backup. No accounts, no network calls: the whole guide is static files and progress lives in this browser.

## What v4 changes

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

`app/` is a plain static folder: `index.html`, `styles.css`, `js/` modules and `data/trophies.json`. No build step, no runtime fetch except its own trophy file and its own modules.

---

<sub>Entered on [make.fun](https://make.fun/?ref=0fhdkvxa&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
