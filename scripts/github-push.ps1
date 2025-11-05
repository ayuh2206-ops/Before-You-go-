# github-push.ps1
# Helper to initialize git repo, remove local API key from tracking, and push to GitHub.
# Run this from project root in PowerShell.

Param(
  [string]$RepoUrl
)

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $repoRoot

Write-Host "Working in: $repoRoot"

# Ensure .gitignore exists and includes config/api-keys.js
if (-not (Test-Path .gitignore)) {
  "node_modules`n.env`nconfig/api-keys.js`n.DS_Store" | Out-File -FilePath .gitignore -Encoding utf8
  Write-Host "Created .gitignore"
} else {
  if (-not (Select-String -Path .gitignore -Pattern 'config/api-keys.js' -Quiet)) {
    Add-Content .gitignore "`nconfig/api-keys.js"
    Write-Host "Added config/api-keys.js to .gitignore"
  }
}

# Init git if needed
if (-not (Test-Path .git)) {
  git init
  git branch -M main
  Write-Host "Initialized empty git repository and set branch to 'main'"
}

# If config/api-keys.js is tracked, untrack it before committing
try {
  git ls-files --error-unmatch config/api-keys.js > $null 2>&1
  if ($LASTEXITCODE -eq 0) {
    git rm --cached config/api-keys.js -q
    Write-Host "Removed config/api-keys.js from index (will still be in local filesystem)"
  }
} catch {
  # file not tracked, ignore
}

# Make initial commit if none exist
$hasCommits = $false
try { git rev-parse --verify HEAD > $null 2>&1; if ($LASTEXITCODE -eq 0) { $hasCommits = $true } } catch {}
if (-not $hasCommits) {
  git add -A
  git commit -m "Initial commit" -q
  Write-Host "Created initial commit"
} else {
  git add -A
  git commit -m "Update: prepare for GitHub push (remove local keys)" -q || Write-Host "No changes to commit"
}

# If user provided a RepoUrl, add it as origin and push
if ($RepoUrl) {
  Write-Host "Using provided repo URL: $RepoUrl"
  if ((git remote) -notcontains 'origin') {
    git remote add origin $RepoUrl
  } else {
    git remote set-url origin $RepoUrl
  }
  git push -u origin main
  Write-Host "Pushed to $RepoUrl"
  return
}

# Try to create and push repo using GitHub CLI if available
if (Get-Command gh -ErrorAction SilentlyContinue) {
  Write-Host "GitHub CLI found. Creating repository and pushing..."
  gh repo create --public --source=. --remote=origin --push
  Write-Host "Repository created and pushed via gh CLI"
} else {
  Write-Host "GitHub CLI (gh) not found. Please create a repository on GitHub and run these commands manually:"
  Write-Host "  git remote add origin <REPO_URL>"
  Write-Host "  git push -u origin main"
}

Write-Host "Done. If you used GitHub CLI, your repo should now be online."