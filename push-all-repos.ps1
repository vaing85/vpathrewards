# Script to push all repositories to GitHub

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Pushing All Repositories to GitHub" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$repos = @(
    @{Name='delivery-app'; Path='C:\Users\villa\delivery-app'; Branch='main'},
    @{Name='greenwoods-games'; Path='C:\Users\villa\greenwoods-games'; Branch='main'},
    @{Name='nestura'; Path='C:\Users\villa\nestura'; Branch='main'},
    @{Name='rewards-cashback-system'; Path='C:\Users\villa\rewards-cashback-system'; Branch='master'},
    @{Name='river777-clone'; Path='C:\Users\villa\river777-clone'; Branch='main'},
    @{Name='zappay-app'; Path='C:\Users\villa\zappay-app'; Branch='main'},
    @{Name='steam-backlog-picker-extension'; Path='C:\Users\villa\apps\steam-backlog-picker-extension'; Branch='master'},
    @{Name='personal-rmm'; Path='C:\Users\villa\personal-rmm'; Branch='master'}
)

$successCount = 0
$failCount = 0

foreach ($repo in $repos) {
    Write-Host "Processing: $($repo.Name)..." -ForegroundColor Yellow
    Push-Location $repo.Path
    
    # Check if remote exists
    $remote = git remote get-url origin 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ No remote configured" -ForegroundColor Red
        $failCount++
        Pop-Location
        continue
    }
    
    # Check current branch
    $currentBranch = git branch --show-current
    if ($currentBranch -ne $repo.Branch) {
        Write-Host "  → Switching to $($repo.Branch) branch..." -ForegroundColor Cyan
        git checkout -b $repo.Branch 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            git checkout $repo.Branch 2>&1 | Out-Null
        }
    }
    
    # Check if there are commits to push
    $status = git status -sb 2>&1
    if ($status -match 'ahead') {
        Write-Host "  → Pushing to GitHub..." -ForegroundColor Cyan
        git push -u origin $repo.Branch 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Successfully pushed!" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "  ✗ Failed to push (repository may not exist on GitHub)" -ForegroundColor Red
            $failCount++
        }
    } else {
        # Try to push anyway to verify connection
        $test = git ls-remote origin 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Already up to date" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "  ✗ Repository not found on GitHub" -ForegroundColor Red
            $failCount++
        }
    }
    
    Pop-Location
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary: $successCount succeeded, $failCount failed" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Yellow" })
Write-Host "========================================" -ForegroundColor Cyan
