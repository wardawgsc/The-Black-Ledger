# Download Star Citizen ship top-down view images from hangar.link / fleetviewer.link
# Images are sourced from the ship data JSONs used by https://hangar.link/fleet/canvas
#
# Usage:
#   .\download-sc-ships-topdown.ps1
#   .\download-sc-ships-topdown.ps1 -OutputDir "C:\MyShips" -Size "small"
#
# Sizes:
#   "large"  -> top_l  (highest res, up to 3840px wide)
#   "small"  -> top_s  (medium res, 1000px wide)
#   "xsmall" -> top_xs (low res, 500px wide)

param(
    [string]$OutputDir = ".\sc-ship-topdown",
    [ValidateSet("large","small","xsmall")]
    [string]$Size = "large"
)

$sizeKey = @{ large = "top_l"; small = "top_s"; xsmall = "top_xs" }[$Size]
$baseImageUrl = "https://fleetviewer.link/fleetpics%2F"

# Collect all ships JSON file numbers from the service worker manifest
Write-Host "Discovering ship data files..." -ForegroundColor Cyan
$manifest = Invoke-WebRequest -Uri "https://hangar.link/flutter_service_worker.js" -UseBasicParsing |
    Select-Object -ExpandProperty Content
$shipFiles = [regex]::Matches($manifest, '"assets/assets/(ships\d+\.json)"') |
    ForEach-Object { $_.Groups[1].Value } |
    Sort-Object -Unique

Write-Host "Found $($shipFiles.Count) ship data files." -ForegroundColor Cyan

# Output directory
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$downloaded = 0
$skipped    = 0
$failed     = 0
$seen       = @{}  # track image hashes to avoid downloading duplicates

foreach ($file in $shipFiles) {
    Write-Host "`nLoading $file..." -ForegroundColor DarkCyan
    try {
        $ships = Invoke-WebRequest -Uri "https://hangar.link/assets/assets/$file" -UseBasicParsing |
            Select-Object -ExpandProperty Content | ConvertFrom-Json
    } catch {
        Write-Warning "Failed to fetch $file`: $_"
        continue
    }

    foreach ($ship in $ships) {
        $shipSlug = $ship.slug
        if ([string]::IsNullOrWhiteSpace($shipSlug)) { continue }

        # Manufacturer subfolder
        $mfr      = if ($ship.manufacturerName) { $ship.manufacturerName } else { "Unknown" }
        $mfrSafe  = $mfr -replace '[\\/:*?"<>|]', '_'
        $mfrDir   = Join-Path $OutputDir $mfrSafe
        if (-not (Test-Path $mfrDir)) { New-Item -ItemType Directory -Path $mfrDir | Out-Null }

        foreach ($variant in $ship.variants) {
            $varSlug   = $variant.slug
            $imageData = $variant.$sizeKey

            # Skip if no image data
            if (-not $imageData -or [string]::IsNullOrWhiteSpace($imageData.hash)) { continue }

            $hash     = $imageData.hash
            $imageUrl = "${baseImageUrl}${shipSlug}_${varSlug}_${sizeKey}_${hash}.png?alt=media"

            # Build a safe filename
            $displayName = if ($variant.name) { $variant.name } else { $ship.name }
            $safeName    = $displayName -replace '[\\/:*?"<>|]', '_'
            if ([string]::IsNullOrWhiteSpace($safeName)) { $safeName = $shipSlug }
            if (-not [string]::IsNullOrWhiteSpace($varSlug)) { $safeName += "_$varSlug" }
            $outFile = Join-Path $mfrDir "$safeName.png"

            # Skip if already downloaded
            if (Test-Path $outFile) {
                Write-Host "  [SKIP] $mfrSafe\$safeName (already exists)" -ForegroundColor DarkGray
                $skipped++
                continue
            }

            # Avoid re-downloading known duplicate hashes
            if ($seen.ContainsKey($hash)) {
                Write-Host "  [DUP]  $mfrSafe\$safeName (same image as $($seen[$hash]))" -ForegroundColor DarkGray
                $skipped++
                continue
            }

            try {
                Write-Host "  [DL]   $mfrSafe\$safeName" -ForegroundColor Green
                Invoke-WebRequest -Uri $imageUrl -UseBasicParsing -OutFile $outFile
                $seen[$hash] = "$mfrSafe\$safeName"
                $downloaded++
            } catch {
                Write-Warning "  Failed to download $mfrSafe\$safeName`: $_"
                $failed++
            }
        }
    }
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
Write-Host "Downloaded : $downloaded"
Write-Host "Skipped    : $skipped"
Write-Host "Failed     : $failed"
Write-Host "Output dir : $(Resolve-Path $OutputDir)"
