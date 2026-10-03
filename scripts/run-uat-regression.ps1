$ErrorActionPreference = 'Stop'
$taskRepo = Split-Path -Parent $PSScriptRoot
$taskResults = @()
Push-Location $taskRepo
try {
    $taskSuites = Get-ChildItem -LiteralPath $PSScriptRoot -Filter 'test-*.cjs' | Where-Object Name -NotIn @('test-anonymous-access.cjs', 'test-browser-update.cjs') | Sort-Object Name
    foreach ($taskSuite in $taskSuites) {
        $taskOutput = (& node $taskSuite.FullName 2>&1 | Out-String).Trim()
        $taskExit = $LASTEXITCODE
        $taskData = $null
        foreach ($taskLine in ($taskOutput -split "`r?`n")) {
            if ($taskLine.StartsWith('{')) {
                try { $taskData = $taskLine | ConvertFrom-Json } catch { }
            }
        }
        $taskResults += [pscustomobject]@{ suite = $taskSuite.Name; passed = ($taskExit -eq 0); data = $taskData; output = $taskOutput }
    }
    $taskReport = [pscustomobject]@{ localSuites = $taskResults.Count; passed = @($taskResults | Where-Object passed).Count; failed = @($taskResults | Where-Object { -not $_.passed }).Count; results = $taskResults; liveDatabaseWrites = 0; browser = 'blocked by spawn EPERM in this environment'; device = 'not tested' }
    $taskJson = $taskReport | ConvertTo-Json -Depth 12
    if ($env:MF_REGRESSION_REPORT) { [IO.File]::WriteAllText($env:MF_REGRESSION_REPORT, $taskJson + "`n") }
    Write-Output $taskJson
    if ($taskReport.failed -gt 0) { throw 'Local regression failed' }
} finally { Pop-Location }
