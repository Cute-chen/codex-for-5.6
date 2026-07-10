param(
    [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\dist")
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$packageName = "Win-ACM For Codex 5.6模型插件"
$packageDirectory = Join-Path $OutputDirectory $packageName
$zipPath = Join-Path $OutputDirectory "Win-ACM.For.Codex.5.6.zip"

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
Remove-Item -Force -Recurse -ErrorAction SilentlyContinue $packageDirectory
Remove-Item -Force -ErrorAction SilentlyContinue $zipPath
New-Item -ItemType Directory -Force -Path $packageDirectory | Out-Null

Copy-Item (Join-Path $repoRoot "runtime\windows\codexfast.js") (Join-Path $packageDirectory "codexfast")
Copy-Item (Join-Path $repoRoot "windows\右键-以管理员方式运行.cmd") $packageDirectory
Copy-Item (Join-Path $repoRoot "LICENSE") (Join-Path $packageDirectory "LICENSE.txt")
Copy-Item (Join-Path $repoRoot "NOTICE.md") $packageDirectory
Compress-Archive -Path $packageDirectory -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host "Created $zipPath"
