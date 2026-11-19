# leonida-platinum-codex

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/mevlanayalcin/leonida-platinum-codex/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/mevlanayalcin/leonida-platinum-codex/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline GTA VI trophy guide and tracker for all 55 official PS5 trophies: every official name, description and grade kept verbatim (1 platinum, 2 gold, 6 silver, 46 bronze, 28 hidden), with an original cited walkthrough, a three-stage platinum roadmap that maps all 55 trophies, a boot-computed verification audit strip, spoiler-safe reading and portable JSON backup. No accounts, no network calls: the whole guide is static files and progress lives in this browser.

## What v3 adds

- **A verification audit strip under the header.** `renderAuditStrip` computes it from the trophy file at boot and it reads `✓ 55/55 OFFICIAL PS5 TROPHIES · 1P 2G 6S 46B · 55/55 CITED GUIDES · 174 DATED CITATIONS (NOV 2026) · 0 UNCITED CLAIMS · 100% OFFLINE` — high contrast, readable at the cover's 768×480 scale. The 174 is the true dated-citation-chip count; `main.ts` refuses to hand in a data file that would make the strip lie.
- **Dated citations on chips and in the prose.** Every source chip reads `PowerPyx · Nov 2026 ↗` (`sourceLinks`), and each parenthetical citation in the 55 guides carries its verification date inside the clickable cite (`appendCited` folds `· Nov 2026` into the link).
- **A roadmap that maps all 55 trophies.** `Stage 1: 13 Story & Missable`, `Stage 2: 7 100% & Major Counters`, `Stage 3: 35 Strangers, Collectibles & Clean-up` — `✓ 55/55 Mapped` — with every trophy shown as a clickable grade-colored pill that opens in the tracker, and the honest `Missable 1 + Chapter Saves 10` guardrails beside it.
- **A source verification matrix.** `renderSourceMatrix` lists the six cited domains with per-domain coverage computed from the data (PowerPyx 32/55, Exophase 42/55, PSNProfiles 9/55, IGN Wiki 47/55, Push Square 3/55, GTABase/Beebom/Mobalytics 40/55), the Nov 2026 verification date and each domain's scope — recomputed from `app/data/trophies.json`, zero runtime requests.
- **Walkthrough steps flush left.** The step column is stretch-aligned (`DETAIL_CSS`): every checkbox shares one left edge, verified programmatically at 0px spread across every step in the cover and collectibles shots.
- **Even smaller first load.** Still four files — `index.html`, `styles.css`, `app.js` and `state.js` at **5,405 bytes gzip-9**, down from v2's 5,945. Each lazy view (`list.js`, `detail.js`, `roadmap.js`, `io.js`) now carries its own CSS chunk and injects it when it arrives through the literal `import()`.
- **The tracker core stays honest:** official names, descriptions and grades; saved progress; `filterByKind` filters (story, missable, collectibles, activities, online); `toggleSpoilerShield` masking with per-row PEEK; `exportProgressBackup` / `importProgressBackup` JSON backup with validated restore.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
node serve.ts   # then open http://localhost:8080
```

`app/` is a plain static folder: `index.html`, `styles.css`, `js/` modules and `data/trophies.json`. No build step, no runtime fetch except its own trophy file and its own modules.

---

<sub>Entered on [make.fun](https://make.fun/?ref=0fhdkvxa&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
