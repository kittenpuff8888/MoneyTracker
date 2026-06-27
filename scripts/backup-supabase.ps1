param(
  [string]$OutputDirectory = "backups"
)

$ErrorActionPreference = "Stop"

if (-not $env:SUPABASE_DB_URL) {
  throw "Set SUPABASE_DB_URL to the direct Supabase database connection string."
}

$workspace = (Resolve-Path -LiteralPath ".").Path
$outputRoot = [System.IO.Path]::GetFullPath((Join-Path $workspace $OutputDirectory))
if (-not $outputRoot.StartsWith($workspace, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Backup output must stay inside the workspace."
}

New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputPath = Join-Path $outputRoot "8888-tracker-$timestamp.sql"

supabase db dump --db-url $env:SUPABASE_DB_URL --file $outputPath
if ($LASTEXITCODE -ne 0) {
  throw "Supabase backup failed."
}

$hash = Get-FileHash -LiteralPath $outputPath -Algorithm SHA256
Write-Output "Backup: $outputPath"
Write-Output "SHA256: $($hash.Hash)"
