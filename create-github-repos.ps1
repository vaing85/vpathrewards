# Script to help create GitHub repositories
# Run this after creating the repositories on GitHub

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GitHub Repository Setup Guide" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "You need to create these 3 repositories on GitHub:" -ForegroundColor Yellow
Write-Host "  1. rewards-cashback-system" -ForegroundColor White
Write-Host "  2. steam-backlog-picker-extension" -ForegroundColor White
Write-Host "  3. personal-rmm" -ForegroundColor White
Write-Host ""

Write-Host "Steps to create repositories:" -ForegroundColor Green
Write-Host "  1. Go to: https://github.com/new" -ForegroundColor White
Write-Host "  2. For each repository:" -ForegroundColor White
Write-Host "     - Enter the repository name (exactly as shown above)" -ForegroundColor White
Write-Host "     - Choose Public or Private" -ForegroundColor White
Write-Host "     - DO NOT initialize with README, .gitignore, or license" -ForegroundColor White
Write-Host "     - Click 'Create repository'" -ForegroundColor White
Write-Host ""

Write-Host "After creating all 3 repositories, run:" -ForegroundColor Green
Write-Host "  .\push-all-repos.ps1" -ForegroundColor Yellow
Write-Host ""

# Check if repos exist and push
$reposToCreate = @(
    @{Name='rewards-cashback-system'; Path='C:\Users\villa\rewards-cashback-system'},
    @{Name='steam-backlog-picker-extension'; Path='C:\Users\villa\apps\steam-backlog-picker-extension'},
    @{Name='personal-rmm'; Path='C:\Users\villa\personal-rmm'}
)

Write-Host "Checking repository status..." -ForegroundColor Cyan
foreach ($repo in $reposToCreate) {
    Push-Location $repo.Path
    $result = git ls-remote origin 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ $($repo.Name) - Repository exists, ready to push" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $($repo.Name) - Repository not found on GitHub" -ForegroundColor Red
    }
    Pop-Location
}
