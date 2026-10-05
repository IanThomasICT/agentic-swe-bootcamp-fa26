# Setup for the Week 2 coding agent (Windows PowerShell).
# Checks git and Bun (installs them if missing), saves your OpenRouter key to
# week2\coding-agent\.env, and installs the agent's packages.
# Run: .\setup.bat   (or: powershell -ExecutionPolicy Bypass -File setup.ps1)
$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$AgentDir = Join-Path $PSScriptRoot "week2\coding-agent"
$EnvFile = Join-Path $AgentDir ".env"
$NewTerminal = $false

function Step($msg) { Write-Host "`n$msg" -ForegroundColor White }
function Ok($msg) { Write-Host "  OK " -ForegroundColor Green -NoNewline; Write-Host $msg }
function Fail($msg) { Write-Host "  ERROR " -ForegroundColor Red -NoNewline; Write-Host $msg; exit 1 }
function Has($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
}

Step "1. git"
if (-not (Has git)) {
  if (-not (Has winget)) { Fail "Install git from https://git-scm.com/downloads, then run setup again." }
  winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
  Refresh-Path
  if (-not (Has git)) { Fail "git installed, but this terminal can't find it. Open a new terminal and run setup again." }
  $NewTerminal = $true
}
Ok (git --version)

Step "2. Bun"
$BunBin = Join-Path $HOME ".bun\bin"
if (-not (Has bun) -and (Test-Path (Join-Path $BunBin "bun.exe"))) { $env:Path = "$BunBin;$env:Path" }
if (-not (Has bun)) {
  Invoke-RestMethod bun.sh/install.ps1 | Invoke-Expression
  $env:Path = "$BunBin;$env:Path"
  if (-not (Has bun)) { Fail "Bun installed, but this terminal can't find it. Open a new terminal and run setup again." }
  $NewTerminal = $true
}
Ok "Bun $(bun --version)"

Step "3. OpenRouter key"
# Ask OpenRouter whether a key works.
function Test-Key($k) {
  try { Invoke-RestMethod https://openrouter.ai/api/v1/key -Headers @{ Authorization = "Bearer $k" } | Out-Null; $true }
  catch { $false }
}

$key = ""
if ((Test-Path $EnvFile) -and (Select-String -Path $EnvFile -Pattern "^OPENROUTER_API_KEY=." -Quiet)) {
  $replace = Read-Host "  A key is already saved in week2\coding-agent\.env. Replace it? [y/N]"
  if ($replace -notmatch "^[Yy]$") { Ok "Keeping the saved key"; $key = "keep" }
} elseif ($env:OPENROUTER_API_KEY) {
  $key = $env:OPENROUTER_API_KEY
  Ok "Using the key from OPENROUTER_API_KEY"
}

if (-not $key) {
  Write-Host "  Get a free key at https://openrouter.ai/keys (Create Key, then copy it)."
  while ($true) {
    $secure = Read-Host "  Paste your key (it won't show as you paste), then press Enter" -AsSecureString
    $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)).Trim()
    if (-not $key) { continue }
    if (Test-Key $key) { break }
    Write-Host "  OpenRouter didn't accept that key. Check it and try again."
  }
}

if ($key -ne "keep") {
  [IO.File]::WriteAllText($EnvFile, "OPENROUTER_API_KEY=$key`n")
  Ok "Saved to week2\coding-agent\.env (git ignores this file)"
}

Step "4. Packages"
Push-Location $AgentDir
bun install
$code = $LASTEXITCODE
Pop-Location
if ($code -ne 0) { Fail "bun install failed. Check your internet connection and run setup again." }
Ok "Installed"

Step "Ready."
Write-Host "  cd week2\coding-agent"
Write-Host "  bun main.ts"
if ($NewTerminal) { Write-Host "  (New tools installed: open a new terminal first so they're on your PATH.)" }
