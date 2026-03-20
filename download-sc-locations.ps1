# Download Star Citizen planet and moon images from starcitizen.tools
# Covers the three in-game systems: Stanton, Pyro, and Nyx
#
# Usage:
#   .\download-sc-locations.ps1
#   .\download-sc-locations.ps1 -OutputDir "C:\MyImages"

param(
    [string]$OutputDir = ".\sc-locations"
)

# All planets and moons organised by system
# Wiki page titles used for the API lookup
$systems = [ordered]@{
    Stanton = [ordered]@{
        Planets = @(
            "Hurston",
            "Crusader",
            "ArcCorp (planet)",
            "MicroTech (planet)"
        )
        Moons = @(
            # Hurston moons
            "Arial", "Aberdeen", "Magda", "Ita",
            # Crusader moons
            "Cellin", "Daymar", "Yela",
            # ArcCorp moons
            "Lyria", "Wala",
            # MicroTech moons
            "Calliope", "Clio", "Euterpe"
        )
    }
    Pyro = [ordered]@{
        Planets = @(
            "Pyro I", "Monox", "Bloom", "Pyro IV", "Pyro V", "Terminus"
        )
        Moons = @(
            # Moons of Pyro V
            "Adir", "Fairo", "Fuego", "Ignis", "Vatra", "Vuur"
        )
    }
    Nyx = [ordered]@{
        Planets = @(
            "Nyx I", "Nyx II", "Nyx III", "Delamar"
        )
        Moons = @()
    }
}

$api = "https://starcitizen.tools/api.php"

function Get-WikiImageUrl {
    param([string[]]$Titles)
    # API accepts up to 50 titles at once, pipe-separated
    $joined = $Titles -join "|"
    $url = "$api`?action=query&titles=$([Uri]::EscapeDataString($joined))&prop=pageimages&piprop=original&format=json"
    $result = Invoke-WebRequest -Uri $url -UseBasicParsing | ConvertFrom-Json
    $map = @{}
    foreach ($page in $result.query.pages.PSObject.Properties.Value) {
        if ($page.original.source) {
            $map[$page.title] = $page.original.source
        }
    }
    return $map
}

# Build output directory structure
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$totalDownloaded = 0
$totalFailed     = 0
$totalSkipped    = 0

foreach ($systemName in $systems.Keys) {
    $systemDir = Join-Path $OutputDir $systemName
    if (-not (Test-Path $systemDir)) { New-Item -ItemType Directory -Path $systemDir | Out-Null }

    Write-Host "`n=== $systemName ===" -ForegroundColor Cyan

    $bodies = $systems[$systemName]
    foreach ($type in $bodies.Keys) {
        $list = $bodies[$type]
        if ($list.Count -eq 0) { continue }

        $typeDir = Join-Path $systemDir $type
        if (-not (Test-Path $typeDir)) { New-Item -ItemType Directory -Path $typeDir | Out-Null }

        Write-Host "  [$type]" -ForegroundColor DarkCyan

        # Fetch image URLs for all bodies of this type in one batch
        $imageMap = Get-WikiImageUrl -Titles $list

        foreach ($title in $list) {
            # Safe filename: strip disambiguation parentheses, remove illegal chars
            $safeName = $title -replace '\s*\(.*?\)\s*$', '' -replace '[\\/:*?"<>|]', '_'
            $ext = if ($imageMap[$title] -match '\.(\w+)(?:\?.*)?$') { $Matches[1] } else { "png" }
            $outFile = Join-Path $typeDir "$safeName.$ext"

            if (Test-Path $outFile) {
                Write-Host "    [SKIP] $title" -ForegroundColor DarkGray
                $totalSkipped++
                continue
            }

            if (-not $imageMap[$title]) {
                Write-Warning "    [NO IMG] $title - no page image found"
                $totalFailed++
                continue
            }

            try {
                Write-Host "    [DL]   $title" -ForegroundColor Green
                Invoke-WebRequest -Uri $imageMap[$title] -UseBasicParsing -OutFile $outFile
                $totalDownloaded++
            } catch {
                Write-Warning "    [FAIL] $title`: $_"
                $totalFailed++
            }
        }
    }
}

Write-Host "`n=== Complete ===" -ForegroundColor Cyan
Write-Host "Downloaded : $totalDownloaded"
Write-Host "Skipped    : $totalSkipped"
Write-Host "Failed     : $totalFailed"
Write-Host "Output dir : $(Resolve-Path $OutputDir)"
