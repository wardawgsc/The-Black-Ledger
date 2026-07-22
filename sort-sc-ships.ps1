# Sort ship assets from "Unknown Manufacturer" into their correct manufacturer subfolders.
#
# Usage:
#   .\sort-sc-ships.ps1
#   .\sort-sc-ships.ps1 -ShipDir "C:\Projects\SnareBears\sc-ship-topdown-test"
#
# Fetches the ship manifest from https://hangar.link/ships.json and moves
# files matching known slugs out of the "Unknown Manufacturer" folder.

param(
    [string]$ShipDir = "C:\Projects\SnareBears\sc-ship-topdown-test"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Configuration ──────────────────────────────────────────────────────────────

$manifestUrl = "https://hangar.link/ships.json"
$sourceDir   = Join-Path $ShipDir "Unknown Manufacturer"
$filePattern = @("*_top_l.svg", "*_top_l.png")

# ── Validate ───────────────────────────────────────────────────────────────────

if (-not (Test-Path $ShipDir)) {
    Write-Error "Ship directory not found: $ShipDir"; exit 1
}
if (-not (Test-Path $sourceDir)) {
    Write-Error "Source directory not found: $sourceDir"; exit 1
}

Write-Host "Manifest URL : $manifestUrl"
Write-Host "Ship dir     : $ShipDir"
Write-Host "Source dir   : $sourceDir"
Write-Host ""

# ── Fetch manifest ─────────────────────────────────────────────────────────────

Write-Host "[1/3] Fetching ship manifest..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri $manifestUrl -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
} catch {
    Write-Error "Failed to fetch manifest: $($_.Exception.Message)"; exit 1
}

# The manifest is a wrapper object with a "ships" array property.
$ships = if ($data.ships) { $data.ships } elseif ($data -is [array]) { $data } else { @($data) }
$ships = @($ships)

if ($ships.Count -eq 0) {
    Write-Error "Manifest contains no ships."; exit 1
}

Write-Host "  Received $($ships.Count) ships from manifest." -ForegroundColor DarkGray

# ── Build slug -> manufacturer lookup ─────────────────────────────────────────

Write-Host "[2/3] Building slug -> manufacturer lookup..." -ForegroundColor Cyan

$slugToMfr = @{}

foreach ($ship in $ships) {
    $slug = $ship.slug
    if (-not $slug) { continue }

    $mfr = "Unknown Manufacturer"

    # Fallback chain per spec.
    if ($ship.manufacturerName) {
        $mfr = $ship.manufacturerName
    } elseif ($ship.manufacturerCode) {
        $mfr = $ship.manufacturerCode
    } elseif ($ship.manufacturer -is [string] -and $ship.manufacturer) {
        $mfr = $ship.manufacturer
    }

    $mfrSanitized = $mfr -replace '[\\/:*?"<>|]', ''
    if ([string]::IsNullOrWhiteSpace($mfrSanitized)) {
        $mfrSanitized = "Unknown Manufacturer"
    }

    $slugToMfr[$slug] = $mfrSanitized
}

Write-Host "  Built lookup for $($slugToMfr.Count) unique slugs." -ForegroundColor DarkGray

# ── Migrate files ──────────────────────────────────────────────────────────────

Write-Host "[3/3] Migrating files from Unknown Manufacturer..." -ForegroundColor Cyan

$total    = 0
$moved    = 0
$unmapped = 0

# Collect files matching our target patterns
$files = Get-ChildItem -Path $sourceDir -File |
    Where-Object { $_.Name -match '\.svg$|\.png$' }

foreach ($file in $files) {
    # Strip the trailing _top_l.<ext> to get the slug candidate
    $slug = $file.BaseName
    if ($slug -match '_top_l$') {
        $slug = $slug -replace '_top_l$', ''
    } else {
        continue
    }

    $total++

    if (-not $slugToMfr.ContainsKey($slug)) {
        Write-Host "  [SKIP] $file.Name (slug '$slug' not found in manifest)" -ForegroundColor Yellow
        $unmapped++
        continue
    }

    $manufacturer = $slugToMfr[$slug]
    $destDir = Join-Path $ShipDir $manufacturer

    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }

    $dest = Join-Path $destDir $file.Name

    try {
        if (Test-Path $dest) {
            # Overwrite if destination already has a file with the same name
            Remove-Item -Path $dest -Force
            Move-Item -Path $file.FullName -Destination $dest -Force
            Write-Host "[+] Overwritten: $file.Name -> $manufacturer" -ForegroundColor Green
        } else {
            Move-Item -Path $file.FullName -Destination $dest -Force
            Write-Host "[+] Moved: $slug -> $manufacturer" -ForegroundColor Green
        }
        $moved++
    } catch {
        Write-Warning "  [ERROR] Failed to move '$($file.Name)': $($_.Exception.Message)"
        $unmapped++
    }
}

# ── Cleanup ────────────────────────────────────────────────────────────────────

Write-Host ""

$remaining = Get-ChildItem -Path $sourceDir -File -ErrorAction SilentlyContinue
if ($remaining) {
    Write-Host "WARNING: $($remaining.Count) files remain in 'Unknown Manufacturer'." -ForegroundColor DarkYellow
} else {
    Remove-Item -Path $sourceDir -Recurse -Force
    Write-Host "[+] Removed empty 'Unknown Manufacturer' directory." -ForegroundColor DarkGray
}

# ── Summary ────────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "============================" -ForegroundColor Cyan
Write-Host "       SUMMARY" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host "Total Files Processed : $total"
Write-Host "Successfully Moved    : $moved"
Write-Host "Unmapped / Left       : $unmapped"
Write-Host "============================" -ForegroundColor Cyan
