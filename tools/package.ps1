# Empacota a extensao num .zip limpo, pronto para enviar as lojas
# (Chrome Web Store, Firefox AMO). Chrome/Brave e Firefox usam o MESMO zip
# (o manifest.json ja tem o bloco browser_specific_settings.gecko para o
# Firefox aceitar).
#
# Uso:
#   powershell -File tools\package.ps1
#
# Gera: dist\sticky-pad-v<versao>.zip (versao lida do manifest.json)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$manifest = Get-Content "$root\manifest.json" -Raw | ConvertFrom-Json
$version = $manifest.version
$distDir = Join-Path $root "dist"
$zipName = "sticky-pad-v$version.zip"
$zipPath = Join-Path $distDir $zipName
$stagingDir = Join-Path $distDir "_staging"

# Só os arquivos/pastas que a extensao de fato usa em runtime.
$include = @(
    "manifest.json",
    "popup.html",
    "popup.css",
    "theme.css",
    "icons",
    "fonts",
    "src"
)

if (-not (Test-Path $distDir)) { New-Item -ItemType Directory -Path $distDir | Out-Null }
if (Test-Path $stagingDir) { Remove-Item -Recurse -Force $stagingDir }
New-Item -ItemType Directory -Path $stagingDir | Out-Null

foreach ($item in $include) {
    $src = Join-Path $root $item
    if (-not (Test-Path $src)) {
        Write-Warning "Ausente (pulado): $item"
        continue
    }
    Copy-Item -Path $src -Destination $stagingDir -Recurse
}

if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
Compress-Archive -Path "$stagingDir\*" -DestinationPath $zipPath -CompressionLevel Optimal

Remove-Item -Recurse -Force $stagingDir

Write-Host ""
Write-Host "Pacote gerado: $zipPath" -ForegroundColor Green
Write-Host "Versao: $version"
Write-Host ""
Write-Host "Conteudo do zip:"
$zipList = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
$zipList.Entries | Select-Object -First 30 -ExpandProperty FullName | ForEach-Object { Write-Host "  $_" }
$zipList.Dispose()
