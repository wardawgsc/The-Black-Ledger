# Snare Bears Booty Report — Generation Process

This document defines the standard process for creating patch booty summary `.txt` files for use as infographic references.

---

## Source Data

- JSON files live in: `Booty Reports/Raw Data/<patch>/`
- File naming convention: `SnareBears_booty_<patch>.json`
- Each entry contains: `victim`, `value`, `plunderers`, `timestamp`, `location`, `ship_type` (optional), `commodities` (optional), `type`, `booty_id`

---

## Output File

- Save to: `infographics/SnareBears_<patch>_Booty_Summary.txt`
- Use the same ASCII box/section formatting as existing reports (see examples in `infographics/`)

---

## Sections & How to Calculate Each

### AT A GLANCE
| Field | How to get it |
|---|---|
| Total Raids | Count of all entries in the JSON |
| Total Value | Sum of all `value` fields |
| Date range | First and last `timestamp` in the file |
| Active Raiders | Count of unique names across all `plunderers` fields |

```powershell
$d = Get-Content ".\Booty Reports\Raw Data\<patch>\<file>.json" | ConvertFrom-Json
$d.Count                                                          # total raids
($d | Measure-Object -Property value -Sum).Sum                    # total value
$d[0].timestamp; $d[-1].timestamp                                 # date range
```

---

### TOP PLUNDERERS
Show **top 3 only**, **sorted by total aUEC value** (primary sort). Display both **total aUEC value** and **raid count** (sum of raid value for every raid they appeared in — raiders share the full value of each raid they participated in). Note: the top 3 by value may differ from the top 3 by hit count — always re-check both lists.

```powershell
# Hit counts
$pc = @{}
foreach($e in $d) { $e.plunderers -split ", " | ForEach-Object { $n=$_.Trim(); $pc[$n]=([int]$pc[$n])+1 } }
$pc.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 3

# Values
$pv = @{}
foreach($e in $d) { $e.plunderers -split ", " | ForEach-Object { $n=$_.Trim(); $pv[$n]=$pv[$n]+$e.value } }
$pv.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 3
```

---

### TOP HUNTING GROUNDS
Show **top 4 locations** only. Display:
- Hit count
- Percentage of total raids (rounded to 1 decimal)
- Planet/body the location is on — look up on **https://starcitizen.tools/** if unknown

```powershell
$lt = $d.Count
$d | Group-Object location | Sort-Object Count -Descending | Select-Object -First 4 |
  ForEach-Object { "$($_.Count)  $([math]::Round($_.Count/$lt*100,1))%  $($_.Name)" }
```

**Known locations reference** (update as new ones appear):

| Location | Body | System |
|---|---|---|
| Bueno Ravine | Bloom (Pyro III) | Pyro |
| The Golden Riviera | Bloom (Pyro III) | Pyro |
| Rustville | Pyro I | Pyro |
| Sacren's Plot | Pyro IV | Pyro |
| Seer's Canyon | Bloom (Pyro III) | Pyro |
| Shepherd's Rest | Bloom (Pyro III) | Pyro |
| Ruin Station | Orbits Terminus (Pyro VI) | Pyro |
| Terra Mills HydroFarm | Cellin (moon of Crusader) | Stanton |
| CRU-L1 Ambitious Dream Station | L1 Station (Crusader) | Stanton |
| Crusader | Crusader (gas giant, Stanton II) | Stanton |

---

### FAVOURITE TARGETS
Show **top 5 ship types** only. Show count and percentage **of raids where ship type was recorded** (not total raids — some entries have no `ship_type`).

```powershell
$sAll = $d | Where-Object { $_.ship_type }
$stt = ($sAll | Measure-Object).Count
$sAll | Group-Object ship_type | Sort-Object Count -Descending | Select-Object -First 5 |
  ForEach-Object { "$($_.Count)  $([math]::Round($_.Count/$stt*100,1))%  $($_.Name)" }
```

Note the denominator (`$stt`) in the section header, e.g. *"of 50 raids with identified ship type"*.

---

### HOTTEST COMMODITIES
Show **top 5 commodities** only. The percentage is **out of total commodity-type instances** (one raid can contain multiple commodities — each one counts separately).

```powershell
$cc = @{}
foreach($e in $d) {
  if($e.commodities) {
    ($e.commodities -split ", ") | ForEach-Object { $c=$_.Trim(); $cc[$c]=([int]$cc[$c])+1 }
  }
}
$t = 0; $cc.Values | ForEach-Object { $t += $_ }
$cc.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 5 |
  ForEach-Object { "$($_.Value)  $([math]::Round($_.Value/$t*100,1))%  $($_.Key)" }
```

Note the total instance count (`$t`) in the section header, e.g. *"of 60 total commodity-type instances"*.

---

### BIGGEST SCORE
Show **only the single highest-value raid**. Include: value, victim, ship, location, crew.

```powershell
$d | Sort-Object value -Descending | Select-Object -First 1 |
  ForEach-Object { "Value: $($_.value.ToString('N0'))  Victim: $($_.victim)  Ship: $($_.ship_type)  Location: $($_.location)  Crew: $($_.plunderers)" }
```

---

### FUN FACTS
Write 4–6 bullet points that highlight interesting patterns, notable moments, or patch-over-patch comparisons. Look for:
- Any victim robbed multiple times
- Dominant location or commodity (>20% share)
- Notable single raid (e.g. % of total patch value)
- Patch-over-patch comparison if applicable
- Unusual ship or commodity that stands out

---

## Formatting Rules

- Header box uses `╔╗╚╝║═` borders
- Section dividers use `━` (30 wide)
- Columns are space-aligned — use consistent padding
- Values in aUEC formatted with commas (e.g. `121,185,522 aUEC`)
- Include `Generated: <date>  |  Source: <filename>` footer
- File encoding: UTF-8

---

## Full Script Template

Save as a throwaway `.ps1`, run it, then delete it. Never commit temp scripts.

```powershell
$d = Get-Content ".\Booty Reports\Raw Data\<patch>\<file>.json" | ConvertFrom-Json

Write-Host "Total raids: $($d.Count)"
Write-Host "Total value: $(($d | Measure-Object -Property value -Sum).Sum.ToString('N0'))"
Write-Host "Date range: $($d[0].timestamp) to $($d[-1].timestamp)"

$pc = @{}
foreach($e in $d) { $e.plunderers -split ", " | ForEach-Object { $n=$_.Trim(); $pc[$n]=([int]$pc[$n])+1 } }
Write-Host "`n--- PLUNDERER HITS (top 3) ---"
$pc.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 3 | ForEach-Object { Write-Host "$($_.Value)  $($_.Key)" }

$pv = @{}
foreach($e in $d) { $e.plunderers -split ", " | ForEach-Object { $n=$_.Trim(); $pv[$n]=$pv[$n]+$e.value } }
Write-Host "`n--- PLUNDERER VALUES (top 3) ---"
$pv.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 3 | ForEach-Object { Write-Host "$($_.Value.ToString('N0'))  $($_.Key)" }

$lt = $d.Count
Write-Host "`n--- TOP 4 LOCATIONS ---"
$d | Group-Object location | Sort-Object Count -Descending | Select-Object -First 4 | ForEach-Object { Write-Host "$($_.Count)  $([math]::Round($_.Count/$lt*100,1))%  $($_.Name)" }

$sAll = $d | Where-Object { $_.ship_type }
$stt = ($sAll | Measure-Object).Count
Write-Host "`n--- TOP 5 SHIP TYPES (of $stt with known ship) ---"
$sAll | Group-Object ship_type | Sort-Object Count -Descending | Select-Object -First 5 | ForEach-Object { Write-Host "$($_.Count)  $([math]::Round($_.Count/$stt*100,1))%  $($_.Name)" }

$cc = @{}
foreach($e in $d) { if($e.commodities) { ($e.commodities -split ", ") | ForEach-Object { $c=$_.Trim(); $cc[$c]=([int]$cc[$c])+1 } } }
$t = 0; $cc.Values | ForEach-Object { $t += $_ }
Write-Host "`n--- TOP 5 COMMODITIES (of $t instances) ---"
$cc.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 5 | ForEach-Object { Write-Host "$($_.Value)  $([math]::Round($_.Value/$t*100,1))%  $($_.Key)" }

Write-Host "`n--- BIGGEST SCORE ---"
$d | Sort-Object value -Descending | Select-Object -First 1 | ForEach-Object {
  Write-Host "Value: $($_.value.ToString('N0'))"
  Write-Host "Victim: $($_.victim)"
  Write-Host "Ship: $($_.ship_type)"
  Write-Host "Location: $($_.location)"
  Write-Host "Crew: $($_.plunderers)"
}
```
