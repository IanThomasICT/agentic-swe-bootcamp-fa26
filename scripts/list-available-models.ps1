# Lists free OpenRouter models the agent can use (they support tools), coding models first, newest first.
# Usage: .\scripts\list-available-models.bat [--all]   (runs this script with the policy relaxed)
#   --all   show every free model, including ones without tool support
$Option = "$args"
$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

if ($Option -and $Option -ne "--all" -and $Option -ne "-All") { Write-Host "Unknown option: $Option (try --all)"; exit 1 }
$ShowAll = [bool]$Option

try { $models = (Invoke-RestMethod https://openrouter.ai/api/v1/models).data }
catch { Write-Host "Couldn't reach openrouter.ai. Check your internet connection."; exit 1 }
try { $codingIds = @((Invoke-RestMethod "https://openrouter.ai/api/v1/models?category=programming").data | ForEach-Object { $_.id }) }
catch { $codingIds = @() }

function Has-Tools($m) { @($m.supported_parameters) -contains "tools" }
function Is-Coding($m) { ($codingIds -contains $m.id) -or ("$($m.id) $($m.name) $($m.description)" -match "\bcod(e|er|ing)\b|agentic") }

$free = @($models | Where-Object { $_.id.EndsWith(":free") -and ($ShowAll -or (Has-Tools $_)) } |
  Sort-Object @{ Expression = { Is-Coding $_ }; Descending = $true }, @{ Expression = { $_.created }; Descending = $true })
$shown = if ($ShowAll) { $free } else { @($free | Select-Object -First 10) }

if ($ShowAll) { Write-Host "`nAll free OpenRouter models:`n" }
else { Write-Host "`nFree OpenRouter models with tool support (coding models first, newest first):`n" }
$shown | ForEach-Object {
  [PSCustomObject]@{
    MODEL   = $_.id
    CODING  = if (Is-Coding $_) { "yes" } else { "" }
    TOOLS   = if (Has-Tools $_) { "yes" } else { "no" }
    ADDED   = [DateTimeOffset]::FromUnixTimeSeconds([long]$_.created).ToString("yyyy-MM-dd")
    CONTEXT = "$([math]::Round($_.context_length / 1000))k"
  }
} | Format-Table -AutoSize | Out-String -Width 200 | Write-Host

if (-not $ShowAll -and $free.Count -gt $shown.Count) { Write-Host "  Showing $($shown.Count) of $($free.Count). Run with --all to see every free model." }
Write-Host "`n  To switch, change ``model`` at the top of main.ts. Free models come and go; if one errors, try the next.`n"
