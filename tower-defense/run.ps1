# Run from the game folder so the server serves index.html at /
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir
Write-Host "Serving from: $ScriptDir"
Write-Host "Open: http://localhost:3333"
Write-Host ""
npx --yes serve . -p 3333
