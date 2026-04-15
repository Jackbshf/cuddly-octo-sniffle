param(
  [string]$RepoRoot = "",
  [string]$PreferredJsonPath = "",
  [string]$OutputFile = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $RepoRoot) {
  $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
} else {
  $RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
}

$nodeScript = Join-Path $PSScriptRoot "sync-portfolio-json.mjs"
$args = @("--repo-root", $RepoRoot)

if ($PreferredJsonPath) {
  $args += @("--preferred-json-path", $PreferredJsonPath)
}

if ($OutputFile) {
  $args += @("--output-file", $OutputFile)
}

& node $nodeScript @args
exit $LASTEXITCODE
