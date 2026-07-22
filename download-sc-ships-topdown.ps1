# Download Star Citizen ship top-down view images from hangar.link / fleetviewer.link / fleetyards.net
#
# Usage:
#   .\download-sc-ships-topdown.ps1
#   .\download-sc-ships-topdown.ps1 -OutputDir "sc-ship-topdown-test" -Size "large"

param(
    [string]$OutputDir = ".\sc-ship-topdown-test",
    [ValidateSet("large","small","xsmall")]
    [string]$Size = "large",
    [switch]$ForceRedownload
)

# Force TLS 1.2 and TLS 1.3 for modern Web API compatibility
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
$ProgressPreference = 'SilentlyContinue'

$sizeKey = @{ large = "top_l"; small = "top_s"; xsmall = "top_xs" }[$Size]

$userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
$headers = @{
    "Accept"          = "application/json, text/plain, */*"
    "Accept-Language" = "en-US,en;q=0.9"
    "Referer"         = "https://hangar.link/"
}

function Test-PngIntegrity {
    param ([string]$FilePath)
    
    if (-not (Test-Path $FilePath)) { return $false }
    
    $fileItem = Get-Item $FilePath
    if ($fileItem.Length -lt 2500) { return $false }

    try {
        $bytes = [System.IO.File]::ReadAllBytes($FilePath)
        if ($bytes.Length -lt 24) { return $false }
        
        $lenToCheck = [Math]::Min(50, $bytes.Length)
        $startText = [System.Text.Encoding]::ASCII.GetString($bytes, 0, $lenToCheck).TrimStart()
        if ($startText.StartsWith("<") -or $startText.Contains("html") -or $startText.Contains("svg")) {
            return $false
        }

        # PNG Magic Bytes Check: 89 50 4E 47 0D 0A 1A 0A
        $expectedHeader = [byte[]](0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
        for ($i = 0; $i -lt 8; $i++) {
            if ($bytes[$i] -ne $expectedHeader[$i]) { return $false }
        }

        # Validate IHDR Chunk presence
        $ihdrText = [System.Text.Encoding]::ASCII.GetString($bytes, 12, 4)
        if ($ihdrText -ne "IHDR") { return $false }

        return $true
    } catch {
        return $false
    }
}

function Get-ImageCandidates {
    param(
        [PSObject]$Ship,
        [PSObject]$Variant,
        [string]$SizeKey,
        [string]$ShipSlug = "",
        [string]$VariantSlug = ""
    )

    $candidates = [System.Collections.Generic.List[string]]::new()

    function Extract-CandidatesFromTarget {
        param([PSObject]$TargetObj, [string]$TargetSlug)
        if (-not $TargetObj) { return }

        $slugToUse = if (-not [string]::IsNullOrWhiteSpace($TargetSlug)) { $TargetSlug } else { $TargetObj.slug }

        # Check explicit image hash or URL fields on the object
        foreach ($prop in @($SizeKey, "top_l", "top_s", "top_xs", "top", "image", "images", "media", "src", "path", "hash")) {
            if ($TargetObj.PSObject.Properties[$prop]) {
                $val = $TargetObj.$prop
                if (-not $val) { continue }

                if ($val -is [string]) {
                    if ($val -like "http://*" -or $val -like "https://*") {
                        $candidates.Add($val)
                    } elseif ($val -like "/*") {
                        $candidates.Add("https://cdn1.fleetviewer.link$val")
                        $candidates.Add("https://hangar.link$val")
                    } else {
                        # fleetviewer pattern: {shipSlug}_{variantSlug}_{size}_{hash}.png
                        if ($ShipSlug) {
                            if (-not [string]::IsNullOrWhiteSpace($VariantSlug)) {
                                $candidates.Add("https://cdn1.fleetviewer.link/${ShipSlug}_${VariantSlug}_${SizeKey}_${val}.png")
                            } else {
                                $candidates.Add("https://cdn1.fleetviewer.link/${ShipSlug}__${SizeKey}_${val}.png")
                            }
                        }
                        $candidates.Add("https://cdn1.fleetviewer.link/assets/ships/${val}.png")
                    }
                } elseif ($val.PSObject) {
                    # Nested image property object
                    foreach ($nProp in @($SizeKey, "src", "url", "path", "hash", "file")) {
                        if ($val.PSObject.Properties[$nProp]) {
                            $nVal = $val.$nProp
                            if ($nVal -is [string] -and -not [string]::IsNullOrWhiteSpace($nVal)) {
                                if ($ShipSlug) {
                                    if (-not [string]::IsNullOrWhiteSpace($VariantSlug)) {
                                        $candidates.Add("https://cdn1.fleetviewer.link/${ShipSlug}_${VariantSlug}_${SizeKey}_${nVal}.png")
                                    } else {
                                        $candidates.Add("https://cdn1.fleetviewer.link/${ShipSlug}__${SizeKey}_${nVal}.png")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        # Standard predictable naming fallbacks if no direct hash property matched
        if ($slugToUse) {
            $candidates.Add("https://cdn1.fleetviewer.link/assets/ships/${slugToUse}_${SizeKey}.png")
            $candidates.Add("https://cdn1.fleetviewer.link/assets/ships/${slugToUse}_top_l.png")
            $candidates.Add("https://cdn1.fleetviewer.link/assets/ships/${slugToUse}.png")
            $candidates.Add("https://hangar.link/assets/ships/${slugToUse}_${SizeKey}.png")
            $candidates.Add("https://hangar.link/assets/ships/${slugToUse}.png")
        }
    }

    $shipSlug = if ($Ship.slug) { $Ship.slug } elseif ($Ship.id) { $Ship.id } else { "" }
    $variantSlug = if ($Variant -and $Variant.slug) { $Variant.slug } else { $shipSlug }

    # 1. Try variant-specific properties and slug patterns
    Extract-CandidatesFromTarget -TargetObj $Variant -TargetSlug $variantSlug
    if ($variantSlug -ne $shipSlug) {
        Extract-CandidatesFromTarget -TargetObj $Variant -TargetSlug "${shipSlug}-${variantSlug}"
        Extract-CandidatesFromTarget -TargetObj $Variant -TargetSlug "${shipSlug}_${variantSlug}"
    }

    # 2. Fallback to base ship properties and slug (e.g. Aurora variants mapping back to 'aurora')
    if ($Ship -and $shipSlug) {
        Extract-CandidatesFromTarget -TargetObj $Ship -TargetSlug $shipSlug
        $baseOnly = $shipSlug -split '-' | Select-Object -First 1
        if ($baseOnly -and $baseOnly -ne $shipSlug) {
            Extract-CandidatesFromTarget -TargetObj $Ship -TargetSlug $baseOnly
        }
    }

    # De-duplicate list preserving order
    $uniqueCandidates = [System.Collections.Generic.List[string]]::new()
    foreach ($c in $candidates) {
        if (-not [string]::IsNullOrWhiteSpace($c) -and -not $uniqueCandidates.Contains($c)) {
            $uniqueCandidates.Add($c)
        }
    }

    return $uniqueCandidates
}

Write-Host "Discovering ship data files..." -ForegroundColor Cyan

$rawBlocks = [System.Collections.Generic.List[PSObject]]::new()

$manifestCandidates = @(
    "https://hangar.link/ships.json",
    "https://fleetviewer.link/ships.json",
    "https://fleetviewer.link/data/ships.json",
    "https://hangar.link/data/ships.json",
    "https://cdn1.fleetviewer.link/ships.json"
)

foreach ($url in $manifestCandidates) {
    try {
        $response = Invoke-RestMethod -Uri $url -Headers $headers -UserAgent $userAgent -Method Get -TimeoutSec 5
        if ($response) {
            if ($response -is [array]) {
                foreach ($s in $response) { $rawBlocks.Add($s) }
            } elseif ($response.ships) {
                foreach ($s in $response.ships) { $rawBlocks.Add($s) }
            } elseif ($response.PSObject.Properties) {
                foreach ($prop in $response.PSObject.Properties) {
                    if ($prop.Value -and ($prop.Value.slug -or $prop.Value.name)) {
                        $rawBlocks.Add($prop.Value)
                    }
                }
            }

            if ($rawBlocks.Count -gt 0) {
                Write-Host "  Successfully fetched master manifest from $url" -ForegroundColor Green
                break
            }
        }
    } catch {}
}

if ($rawBlocks.Count -eq 0) {
    Write-Host "`nERROR: Could not discover ship data from hangar.link or fleetviewer.link." -ForegroundColor Red
    exit 1
}

Write-Host "`nFound $($rawBlocks.Count) raw ship data blocks." -ForegroundColor Green

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$downloaded = 0
$skipped    = 0
$failed     = 0
$repaired   = 0

foreach ($ship in $rawBlocks) {
    $shipSlug = if ($ship.slug) { $ship.slug } elseif ($ship.id) { $ship.id } else { $null }
    $shipName = if ($ship.name) { $ship.name } else { $shipSlug }

    if ([string]::IsNullOrWhiteSpace($shipSlug) -and [string]::IsNullOrWhiteSpace($shipName)) { continue }

    $mfr = "Unknown"
    if ($ship.manufacturerName) { $mfr = $ship.manufacturerName }
    elseif ($ship.manufacturer) { $mfr = $ship.manufacturer }
    elseif ($ship.mfr) { $mfr = $ship.mfr }
    
    $mfrSafe = $mfr -replace '[\\/:*?"<>|]', '_'
    $mfrDir  = Join-Path $OutputDir $mfrSafe

    if (-not (Test-Path $mfrDir)) { New-Item -ItemType Directory -Path $mfrDir | Out-Null }

    $variantsToProcess = [System.Collections.Generic.List[PSObject]]::new()
    if ($ship.variants -and $ship.variants.Count -gt 0) {
        foreach ($v in $ship.variants) { $variantsToProcess.Add($v) }
    } else {
        $variantsToProcess.Add($ship)
    }

    foreach ($variant in $variantsToProcess) {
        $variantSlugActual = if ($variant -and $variant.slug) { $variant.slug } else { "" }
        $varSlug = if (-not [string]::IsNullOrWhiteSpace($variantSlugActual)) { $variantSlugActual } else { $shipSlug }
        
        $displayName = if ($variant.name) { $variant.name } else { $shipName }
        $safeName    = $displayName -replace '[\\/:*?"<>|]', '_'

        if (-not [string]::IsNullOrWhiteSpace($variantSlugActual) -and $variantSlugActual -ne $shipSlug -and -not $safeName.ToLower().Contains($variantSlugActual.ToLower())) {
            $safeName += "_$variantSlugActual"
        }

        $outFile = Join-Path $mfrDir "$safeName.png"

        # Check existing file integrity
        if (Test-Path $outFile) {
            if ($ForceRedownload) {
                Remove-Item $outFile -Force
            } else {
                if (Test-PngIntegrity -FilePath $outFile) {
                    Write-Host "  [SKIP]    $mfrSafe\$safeName (valid)" -ForegroundColor DarkGray
                    $skipped++
                    continue
                } else {
                    Write-Host "  [CORRUPT/HTML] $mfrSafe\$safeName is an invalid wrapper/HTML. Re-downloading..." -ForegroundColor Yellow
                    Remove-Item $outFile -Force
                    $repaired++
                }
            }
        }

        $candidateUrls = Get-ImageCandidates -Ship $ship -Variant $variant -SizeKey $sizeKey -ShipSlug $shipSlug -VariantSlug $variantSlugActual
        $downloadSuccess = $false

        foreach ($url in $candidateUrls) {
            try {
                Invoke-WebRequest -Uri $url -Headers $headers -UserAgent $userAgent -OutFile $outFile -TimeoutSec 6
                
                if (Test-PngIntegrity -FilePath $outFile) {
                    Write-Host "  [DL]      $mfrSafe\$safeName" -ForegroundColor Green
                    $downloaded++
                    $downloadSuccess = $true
                    break
                } else {
                    if (Test-Path $outFile) { Remove-Item $outFile -Force }
                }
            } catch {
                if (Test-Path $outFile) { Remove-Item $outFile -Force }
            }
        }

        if (-not $downloadSuccess) {
            Write-Warning "  [FAIL]    $mfrSafe\$safeName (all candidate URLs failed verification)"
            $failed++
        }
    }
}

Write-Host "`n=== Process Complete ===" -ForegroundColor Cyan
Write-Host "Downloaded : $downloaded"
Write-Host "Repaired   : $repaired"
Write-Host "Skipped    : $skipped"
Write-Host "Failed     : $failed"
Write-Host "Output Dir : $(Resolve-Path $OutputDir)"