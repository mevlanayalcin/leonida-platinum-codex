# leonida-platinum-codex

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/mevlanayalcin/leonida-platinum-codex/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/mevlanayalcin/leonida-platinum-codex/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline GTA VI trophy guide and tracker for all 55 official PS5 trophies: every official name, description and grade kept verbatim (1 platinum, 2 gold, 6 silver, 46 bronze, 28 hidden), with an original cited walkthrough, a three-stage platinum roadmap, an honest missable model, spoiler-safe reading and portable JSON backup. No accounts, no network calls: the whole guide is static files and progress lives in this browser.

## What v2 adds

- **Small first load:** four files, 5,945 bytes gzip-9. The boot, tracker state and shell load first; the 55-row list, guide, roadmap and backup pane arrive through literal `import()` calls, so the Totals line stays lean while every feature remains one click away.
- **Accurate missables:** `Missable 1` (Positive Mental Attitude) and `Chapter Saves 10` are separate filters, and the Roadmap's guardrail pane lists the same 1 + 10. No more "11 missables" contradiction.
- **Readable at a glance:** bright `#dde6f2` body text on a dark `#0e1424` base, full icon + label Platinum / Gold / Silver / Bronze pills, and clean row boundaries with no clipped first row.
- **Deeper cited guidance:** every trophy has inline named citations and clickable source chips; the Roadmap lists 18 meditation spots, 42 Shooting Ranges, 50 Challenges, 100 WAiNK locations, 250 Stunts, 3 card sets, 8 stranger strands, 200 scanned vehicles and 100 studied animals, each beside PowerPyx / Exophase / IGN / PSNProfiles.
- **Clean Export + Import pane:** a full-height right-pane view with JSON preview, real `Download .json`, file upload, paste-and-restore and a green validation status. It replaces the detail pane completely, so nothing bleeds through.
- **A Long Road without guesswork:** the 100% view shows per-category checklist counters, cited sources and tickable walkthrough steps under the Collectibles + Activities filter.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
node serve.ts   # then open http://localhost:8080
```

`app/` is a plain static folder: `index.html`, `styles.css`, `js/` modules and `data/trophies.json`. No build step, no runtime fetch except its own trophy file and its own modules.

---

<sub>Entered on [make.fun](https://make.fun/?ref=0fhdkvxa&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
