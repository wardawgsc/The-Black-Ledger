# Reorganize already-downloaded ship images into manufacturer subfolders.
# Run this once against an existing flat download directory.
#
# Usage:
#   .\reorganize-ships-by-manufacturer.ps1
#   .\reorganize-ships-by-manufacturer.ps1 -ShipDir "C:\MyShips"

param(
    [string]$ShipDir = ".\sc-ship-topdown-test"
)

if (-not (Test-Path $ShipDir)) {
    Write-Error "Directory not found: $ShipDir"; exit 1
}

Write-Host "Building ship name -> manufacturer lookup..." -ForegroundColor Cyan

# Download manifest to find all ship JSON files
$manifest  = Invoke-WebRequest -Uri "https://hangar.link/flutter_service_worker.js" -UseBasicParsing |
    Select-Object -ExpandProperty Content
$shipFiles = [regex]::Matches($manifest, '"assets/assets/(ships\d+\.json)"') |
    ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique

# Build a map: safe display name -> manufacturer name
$nameToMfr = @{}

foreach ($file in $shipFiles) {
    try {
        $ships = Invoke-WebRequest -Uri "https://hangar.link/assets/assets/$file" -UseBasicParsing |
            Select-Object -ExpandProperty Content | ConvertFrom-Json
    } catch { continue }

    foreach ($ship in $ships) {
        $mfr = if ($ship.manufacturerName) { $ship.manufacturerName } else { "Unknown" }
        $mfrSafe = $mfr -replace '[\\/:*?"<>|]', '_'

        foreach ($variant in $ship.variants) {
            $displayName = if ($variant.name) { $variant.name } else { $ship.name }
            $safeName    = $displayName -replace '[\\/:*?"<>|]', '_'
            if ([string]::IsNullOrWhiteSpace($safeName)) { $safeName = $ship.slug }
            $varSlug = $variant.slug
            if (-not [string]::IsNullOrWhiteSpace($varSlug)) { $safeName += "_$varSlug" }

            $nameToMfr[$safeName] = $mfrSafe
        }
    }
}

Write-Host "Lookup built with $($nameToMfr.Count) entries." -ForegroundColor Cyan
Write-Host "Moving files..." -ForegroundColor Cyan

$moved   = 0
$unknown = 0

Get-ChildItem -Path $ShipDir -File | Where-Object { $_.Extension -in ".png",".jpg" } | ForEach-Object {
    $baseName = $_.BaseName  # filename without extension

    $mfrFolder = $nameToMfr[$baseName]
    if (-not $mfrFolder) {
        Write-Warning "[UNKNOWN] $($_.Name) - no manufacturer match found"
        $mfrFolder = "Unknown"
        $unknown++
    }

    $destDir = Join-Path $ShipDir $mfrFolder
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir | Out-Null }

    $dest = Join-Path $destDir $_.Name
    if (Test-Path $dest) {
        Write-Host "  [EXISTS] $mfrFolder\$($_.Name)" -ForegroundColor DarkGray
    } else {
        Write-Host "  [MOVE]  $($_.Name) -> $mfrFolder\" -ForegroundColor Green
        Move-Item -Path $_.FullName -Destination $dest
        $moved++
    }
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
Write-Host "Moved   : $moved"
Write-Host "Unknown : $unknown"
