# Patch 4.3
Write-Output "=== PATCH 4.3 ==="
$d = Get-Content 'Booty Reports/Raw Data/4.3/SnareBears_booty_4.3_4.3.1_4.3.2.json' | ConvertFrom-Json
$pv = @{}; $pc = @{}
foreach($e in $d) {
    $names = ($e.plunderers -split ", ") | ForEach-Object { $_.Trim() }
    $share = [double]$e.value / [double]$names.Count
    foreach ($n in $names) {
        if ($pv.ContainsKey($n)) { $pv[$n] = $pv[$n] + $share } else { $pv[$n] = $share }
        if ($pc.ContainsKey($n)) { $pc[$n] = $pc[$n] + 1 } else { $pc[$n] = 1 }
    }
}
Write-Output "Top 3 split-share:"
($pv.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 3) | ForEach-Object {
    Write-Output ("{0,-25} {1,14:N0} aUEC ({2} hits)" -f $_.Key, [int]$_.Value, $pc[$_.Key])
}

# Patch 4.4
Write-Output ""
Write-Output "=== PATCH 4.4 ==="
$d = Get-Content 'Booty Reports/Raw Data/4.4/SnareBears_booty_4.4.json' | ConvertFrom-Json
$pv = @{}; $pc = @{}
foreach($e in $d) {
    $names = ($e.plunderers -split ", ") | ForEach-Object { $_.Trim() }
    $share = [double]$e.value / [double]$names.Count
    foreach ($n in $names) {
        if ($pv.ContainsKey($n)) { $pv[$n] = $pv[$n] + $share } else { $pv[$n] = $share }
        if ($pc.ContainsKey($n)) { $pc[$n] = $pc[$n] + 1 } else { $pc[$n] = 1 }
    }
}
Write-Output "Top 3 split-share:"
($pv.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 3) | ForEach-Object {
    Write-Output ("{0,-25} {1,14:N0} aUEC ({2} hits)" -f $_.Key, [int]$_.Value, $pc[$_.Key])
}

# Patch 4.5
Write-Output ""
Write-Output "=== PATCH 4.5 ==="
$d = Get-Content 'Booty Reports/Raw Data/4.5/SnareBears_booty_4.5.json' | ConvertFrom-Json
$pv = @{}; $pc = @{}
foreach($e in $d) {
    $names = ($e.plunderers -split ", ") | ForEach-Object { $_.Trim() }
    $share = [double]$e.value / [double]$names.Count
    foreach ($n in $names) {
        if ($pv.ContainsKey($n)) { $pv[$n] = $pv[$n] + $share } else { $pv[$n] = $share }
        if ($pc.ContainsKey($n)) { $pc[$n] = $pc[$n] + 1 } else { $pc[$n] = 1 }
    }
}
Write-Output "Top 3 split-share:"
($pv.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 3) | ForEach-Object {
    Write-Output ("{0,-25} {1,14:N0} aUEC ({2} hits)" -f $_.Key, [int]$_.Value, $pc[$_.Key])
}
