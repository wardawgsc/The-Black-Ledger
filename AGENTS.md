# SnareBears — Agent Guide

## Repo at a glance

A Star Citizen "booty report" pipeline: raw raid JSON → ASCII summary text → HTML infographic → PNG screenshot.

```
Booty Reports/Raw Data/<patch>/   ← source JSON (SnareBears_booty_<patch>.json)
infographics/                       ← HTML infographics + design docs + generated PNGs
*.ps1                               ↓  PowerShell asset/download & verification scripts
*.py                                ↓  Python plunderer-split verification helpers
export-infographics.js              ↓  Playwright headless render (HTML → PNG)
```

**Dependency:** only `playwright-core` (via npm). Install with `npm install`.

## Key files

| File | Purpose |
|---|---|
| `infographics/INFOGRAPHIC_DESIGN.md` | Master design reference — colors, typography, layout, creation steps |
| `infographics/BOOTY_REPORT_PROCESS.md` | How to calculate each summary section from JSON (PowerShell snippets) |
| `export-infographics.js` | Renders all HTML infographics to PNG via Playwright Chromium |

## Commands

```bash
npm install                          # Install playwright-core (one-time)
node export-infographics.js          # Render all infographic HTML → PNG
powershell -File check_all_patches.ps1  # Verify plunderer split-share across all patches
```

PowerShell scripts run natively on Windows (`pwsh` or `powershell`). On Linux/macOS use `pwsh`.

## Creating a new patch infographic

1. Read raw JSON from `Booty Reports/Raw Data/<patch>/SnareBears_booty_<patch>.json`
2. Generate booty summary text using the PowerShell snippets in `infographics/BOOTY_REPORT_PROCESS.md`
3. Copy the latest HTML template (`SnareBears_4.6_Infographic.html`) → new patch file
4. Update all sections per `infographics/INFOGRAPHIC_DESIGN.md` ("Creating a New Patch Infographic" section)
5. Run `node export-infographics.js` to produce PNGs

## Gotchas

- **Gold color rule:** CSS variables `--gold`, `--gold2`, `--yellow` must always be identical — never let them drift.
- **Plunderer split-share:** Each hit's value is divided equally among all listed plunderers. The summary text shows top 3 by split-share value + hit count.
- **Ship/planet images** live outside `infographics/` (in `sc-locations/`, `sc-ship-topdown-test/`). HTML references use relative paths from the infographic directory.
- **Pyro system locations** lack dedicated images — use filtered planet photos or solid-color fallback circles.
- **Font loading:** Infographics use Google Fonts (Orbitron + Share Tech Mono). The Playwright render script waits for `networkidle` plus 1500ms extra to ensure fonts settle before screenshot.
- **No test suite.** Verification is manual: run `check_all_patches.ps1` to cross-check split-share math against summary text files.

## Hardware & Context Limits

- **Batch size:** Cap physical batch reads at **128 / 64** (never exceed). Massive context reads that exceed this threshold will trigger Vulkan `ErrorDeviceLost` crashes.
- **GPU offload:** During large file reads or multi-file analysis, reduce GPU offload by **2–3 layers** to prevent memory exhaustion and rendering failures.
- Always use the `read` tool with `offset`/`limit` parameters instead of loading entire files at once when dealing with large datasets.

## Asset downloads

```powershell
.\download-sc-locations.ps1           # Download planet/moon images (Stanton, Pyro, Nyx) → sc-locations/
.\download-sc-ships-topdown.ps1       # Download top-down ship PNGs → sc-ship-topdown-test/
.\reorganize-ships-by-manufacturer.ps1  # Re-sort ship assets by manufacturer folder
```

## Vocabulary

- Use **"hits"** — never "raids"
- Plunderer counts: `N hits`
- aUEC values formatted with commas (e.g. `121,185,522 aUEC`)
