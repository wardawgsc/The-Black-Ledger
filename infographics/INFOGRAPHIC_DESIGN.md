# SnareBears Infographic Design Reference

Master design guide for the Black Ledger Report HTML infographics. Use this when creating new patch infographics from the 4.2 template.

---

## File Structure

```
infographics/
  SnareBears_4.2_Infographic.html   ← master template
  SnareBears_4.3_Infographic.html
  SnareBears_4.4_Infographic.html
  SnareBears_4.5_Infographic.html
  INFOGRAPHIC_DESIGN.md             ← this file
  BOOTY_REPORT_PROCESS.md
  SnareBears_4.x_Booty_Summary.txt  ← data source per patch
```

Asset paths (relative from `infographics/`):
- Ships: `../sc-ship-topdown-test/<Manufacturer>/<Ship>.png`
- Planets: `../sc-locations/Stanton/Planets/<Planet>.jpg`
- Moons: `../sc-locations/Stanton/Moons/<Moon>.jpg`
- Logo: `../Assets/sb_logo_intro.png`

---

## Color Palette

Inspired by the RSI website (robertsspaceindustries.com) — dark space-navy backgrounds with steel blue accents and amber gold for all money/value elements.

| Variable     | Value       | Usage                                              |
|--------------|-------------|-----------------------------------------------------|
| `--bg`       | `#07090f`   | Page background                                    |
| `--bg2`      | `#0c1020`   | Card / section backgrounds                         |
| `--bg3`      | `#111828`   | Bar track backgrounds, ship thumb fill             |
| `--bg4`      | `#181e2e`   | Unused reserve                                     |
| `--red`      | `#1c4e78`   | Steel blue — bar fills (dark end), card top border, section chevrons, fun facts sidebar |
| `--red2`     | `#2568a0`   | Steel blue — bar fills (bright end), bullet icons  |
| `--gold`     | `#b08a28`   | Aged amber — ALL aUEC values, rank numbers, % figures, biggest score border |
| `--gold2`    | `#b08a28`   | Same as `--gold` (kept in sync)                    |
| `--yellow`   | `#b08a28`   | Same as `--gold` (kept in sync)                    |
| `--text`     | `#7a9ab8`   | Body text, labels, sub-text                        |
| `--bright`   | `#c8dce8`   | Names, headings, strong emphasis                   |
| `--dim`      | `#3a5068`   | Unused reserve                                     |
| `--border`   | `#141e2c`   | All dividers and card borders                      |

> **Rule:** `--gold`, `--gold2`, and `--yellow` must always be the same value. Never let them drift.

---

## Typography

- **Display / headings:** `Orbitron` (Google Fonts) — weights 400, 700, 900
- **Body / mono:** `Share Tech Mono` (Google Fonts)
- CDN link: `https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;700;900&display=swap`

### Font Size Reference

| Element                  | Size  | Font       | Color       |
|--------------------------|-------|------------|-------------|
| Header eyebrow           | 16px  | Mono       | `--text`    |
| Header title             | 38px  | Orbitron 900 | `--bright` |
| Header sub               | 13px  | Mono       | `--text`    |
| Stat card value          | 30px  | Orbitron 700 | `--bright` |
| Stat card label          | 12px  | Mono       | `--text`    |
| Section title            | 13px  | Orbitron   | `--bright`  |
| Section subtitle         | 13px  | Mono       | `--text`    |
| Plunderer rank           | 16px  | Orbitron 700 | `--gold`  |
| Plunderer name           | 15px  | Mono       | `--bright`  |
| Plunderer hit count      | 13px  | Mono       | `--text`    |
| Plunderer value          | 17px  | Mono       | `--gold`    |
| Raider grid name         | 14px  | Mono 700   | `--bright`  |
| Raider grid stats        | 11px  | Mono       | `--dim`     |
| Raider grid value        | 14px  | Orbitron 700 | `--gold`  |
| Location name            | 15px  | Mono       | `--bright`  |
| Location sub             | 13px  | Mono       | `--text`    |
| Location %               | 18px  | Orbitron 700 | `--gold`  |
| Location count           | 13px  | Mono       | `--text`    |
| Ship name                | 15px  | Mono       | `--bright`  |
| Ship count               | 13px  | Mono       | `--text`    |
| Ship %                   | 18px  | Orbitron 700 | `--gold`  |
| Commodity name           | 15px  | Mono       | `--bright`  |
| Commodity %              | 18px  | Orbitron 700 | `--gold`  |
| Score amount number      | 36px  | Orbitron 900 | `--gold`  |
| Score amount "aUEC" unit | 18px  | Orbitron 400 | `--gold` @ 0.75 opacity |
| Score detail label       | 13px  | Mono       | `--text`    |
| Score detail value       | 16px  | Mono       | `--bright`  |
| Fun fact text            | 16px  | Mono       | `--text`    |
| Fun fact strong          | 16px  | Mono       | `--bright`  |
| Footer                   | 11px  | Mono       | `--text`    |

---

## Layout — Sections in Order

1. **Header** — logo left, title center, skull watermark right
2. **AT A GLANCE** — 4 stat cards (Total Hits / aUEC Plundered / Active Raiders / System)
3. **TOP PLUNDERERS** — 5-col grid: rank · name · hit count · bar · value
4. **ACTIVE RAIDER ROSTER** — 3-column micro-card grid of all participants
5. **LOCATIONS + SHIPS** — 2-column grid side by side
5. **HOTTEST COMMODITIES** — name · bar · % 3-col grid
6. **BIGGEST SCORE** — skull · details · ship image 3-col grid
7. **FUN FACTS** — left-bordered box with bullet items
8. **FOOTER** — org name left, source file right

Page width: **1200px** fixed, `padding: 36px 40px`.

---

## Key CSS Details

### Plunderer bar widths
Set proportionally to the top earner = 100%. Calculate others as `(value / top_value * 100)%`.

### Planet circle images
- Standard: `<img class="location-img">` with CSS border `3px solid rgba(37,104,160,0.8)`
- **Filtered images** (e.g. space stations using a repurposed planet photo): wrap in a `<div>` with the border and `border-radius:50%; overflow:hidden`, put the `filter:` only on the inner `<img>`. This prevents the CSS filter from desaturating the border colour.

```html
<div style="width:54px;height:54px;border-radius:50%;border:3px solid rgba(37,104,160,0.8);overflow:hidden;flex-shrink:0;">
  <img src="..." style="width:100%;height:100%;object-fit:cover;filter:hue-rotate(190deg) saturate(0.35) brightness(0.65);">
</div>
```

### Ship images
PNGs with transparent backgrounds. No container background or border — ships float cleanly against the dark page. Uses `mix-blend-mode: screen` on the `<img>`.

### Raider Grid (Patch Totals)
Introduced in 4.6 to show the full roster beyond the top 3.
- Container: `.raider-grid` (3-column layout)
- Card: `.raider-small-card` with `border-left: 2px solid var(--red)`
- Inner: Flex-spaced name/hits on left, value on right

### Biggest Score grid
`grid-template-columns: auto 1fr auto` — skull icon | text content | ship thumbnail (220×130px).

---

## Creating a New Patch Infographic

1. Copy `SnareBears_4.2_Infographic.html` → `SnareBears_4.X_Infographic.html`
2. Update `<title>` and header title/dates/system/duration
3. Update the 4 AT A GLANCE stat cards
4. Update TOP PLUNDERERS — recalculate bar widths relative to new top earner
5. Update LOCATIONS — swap images and data; use the wrapper-div trick for any filtered images
6. Update SHIPS — swap ship PNG paths and manufacturer names
7. Update HOTTEST COMMODITIES — recalculate bar widths relative to new top commodity
8. Update BIGGEST SCORE — new target/ship/location/crew/commodities; look up commodities from the raw JSON if not in the summary txt
9. Update FUN FACTS — write 5 facts relevant to the new patch data
10. Update FOOTER — update source JSON filename

### Looking up Biggest Score commodities from JSON
```powershell
$data = Get-Content "Booty Reports\Raw Data\4.X\SnareBears_booty_4.X.json" | ConvertFrom-Json
$data | Where-Object { $_.totalValue -eq ($data.totalValue | Measure-Object -Maximum).Maximum } | Select-Object target, ship, location, cargo
```

### Pyro system locations
Pyro locations (e.g. Ruin Station) don't have images in `sc-locations/`. Options:
- Use a generic space/nebula image with colour-grading filters
- Use a thematically similar planet image with heavy filter adjustments
- Leave the circle with a solid background colour

---

## Vocabulary Standards

- Use **"hits"** throughout — never "raids"
- Plunderer counts: `N hits`
- Location counts: `N hits`
- Ship counts: `N hits · Manufacturer Name`
- Commodities subtitle: `Of N total commodity-type instances across all hits`
- Header system line: `STANTON SYSTEM` or `PYRO SYSTEM` or `STANTON + PYRO`

