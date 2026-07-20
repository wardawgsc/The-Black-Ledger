$patches = @(
    @{ Path = 'Booty Reports/Raw Data/4.2/SnareBears_booty_4.2_4.2.1.json'; SummaryFile = 'infographics/SnareBears_4.2_Booty_Summary.txt' },
    @{ Path = 'Booty Reports/Raw Data/4.3/SnareBears_booty_4.3_4.3.1_4.3.2.json'; SummaryFile = 'infographics/SnareBears_4.3_Booty_Summary.txt' },
    @{ Path = 'Booty Reports/Raw Data/4.4/SnareBears_booty_4.4.json'; SummaryFile = 'infographics/SnareBears_4.4_Booty_Summary.txt' },
    @{ Path = 'Booty Reports/Raw Data/4.5/SnareBears_booty_4.5.json'; SummaryFile = 'infographics/SnareBears_4.5_Booty_Summary.txt' },
    @{ Path = 'Booty Reports/Raw Data/4.6/SnareBears_booty_4.6.json'; SummaryFile = 'infographics/SnareBears_4.6_Booty_Summary.txt' }
)

foreach ($patch in $patches) {
    Write-Output "=== $($patch.Path.Split('\')[-1]) ==="
    $d = Get-Content $patch.Path | ConvertFrom-Json
    
    # Calculate split-share values per plunderer
    $pv = @{}
    $pc = @{}
    foreach($e in $d) {
        $names = ($e.plunderers -split ", ") | ForEach-Object { $_.Trim() }
        $share = [double]$e.value / [double]$names.Count
        foreach ($n in $names) {
            if ($pv.ContainsKey($n)) { $pv[$n] = $pv[$n] + $share } else { $pv[$n] = $share }
            if ($pc.ContainsKey($n)) { $pc[$n] = $pc[$n] + 1 } else { $pc[$n] = 1 }
        }
    }
    
    # Get top 3 by split-share
    Write-Output "Split-share top 3:"
    ($pv.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 3) | ForEach-Object {
        Write-Output ("  {0,-20} {1,14:N0} aUEC ({2} hits)" -f $_.Key, [int]$_.Value, $pc[$_.Key])
    }
    
    # Read summary file and extract what it shows for top plunderers
    $summary = Get-Content $patch.SummaryFile
    $topPlundererSection = $summary | Where-Object { $_ -match '^\s*1\.\s+\w' }
    if ($topPlundererSection) { Write-Output "Summary shows: $($topPlundererSection.Trim())" }
    $line2 = $summary | Where-Object { $_ -match '^\s*2\.\s+\w' }
    if ($line2) { Write-Output "Summary shows: $($line2.Trim())" }
    $line3 = $summary | Where-Object { $_ -match '^\s*3\.\s+\w' }
    if ($line3) { Write-Output "Summary shows: $($line3.Trim())" }
    
    # Check sum of all split-share values vs total JSON value
    $jsonTotal = [double]((($d | Measure-Object -Property value -Sum).Sum))
    $splitTotal = 0.0; foreach ($v in $pv.Values) { $splitTotal += $v }
    
    Write-Output "JSON total: {0:N0} | Split-share sum: {1:N0} | Diff: {2:N0}" -f $jsonTotal, [int]$splitTotal, ($jsonTotal - $splitTotal)
    Write-Output ""
}
