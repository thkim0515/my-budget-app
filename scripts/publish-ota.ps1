<#
  가계부 OTA 웹 번들 게시 스크립트 — 다른 앱들처럼 PC 에서 바로 업데이트 서버에 올린다(GitHub Actions·저장소 시크릿 없음).
  웹을 빌드해 zip 으로 묶고 업데이트 서버(아워데이즈 Firebase 의 appOtaPublish → Storage apps/mybudget/ota/)에 올린 뒤,
  앱이 읽는 appOtaLatest?app=mybudget 로 다시 확인한다. main 에 push 만 해서는 앱에 반영되지 않는다.
  커밋하지 않은 변경이 있으면 멈춘다(번들 번호 = 커밋 개수라 같은 번호로 다른 내용이 올라가지 않게). 먼저 커밋한 뒤 실행.

  사용 예:
    powershell -ExecutionPolicy Bypass -File scripts\publish-ota.ps1
    powershell -ExecutionPolicy Bypass -File scripts\publish-ota.ps1 -SkipBuild   (이미 build/ 가 같은 커밋으로 빌드돼 있을 때)

  번들 번호 = 커밋 개수(git rev-list --count HEAD) — 예전 Actions 와 같은 규칙. 최소 APK = android/app/build.gradle 의 versionCode.
  업로드 토큰: 환경변수 → 아워데이즈 functions\.env → Secret Manager 순으로 읽는다(publish-token.ps1). 값은 화면·파일에 남기지 않는다.
  서버는 더 낮은 번들 번호로 최신을 덮어쓰지 않고(409), 최근 번들 5개만 남긴다.
#>
param(
    [switch]$SkipBuild,
    [switch]$AllowDirty,
    [string]$FunctionBase = "https://asia-northeast3-our-days-f8384.cloudfunctions.net"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$App = "mybudget"
$Root = Split-Path -Parent $PSScriptRoot
$Gradle = Get-Content (Join-Path $Root "android\app\build.gradle") -Raw -Encoding UTF8

$minNative = [int]([regex]::Match($Gradle, 'versionCode\s+(\d+)').Groups[1].Value)
$name = [regex]::Match($Gradle, 'versionName\s+"([^"]+)"').Groups[1].Value
if (-not $minNative -or -not $name) { throw "build.gradle 에서 버전을 읽지 못했어요" }
$version = "v$name"
$bundleNo = [int](git -C $Root rev-list --count HEAD)
$commit = (git -C $Root rev-parse HEAD).Trim()
if (-not $AllowDirty -and (git -C $Root status --porcelain --untracked-files=no)) { throw "커밋하지 않은 변경이 있어요. 먼저 커밋한 뒤 게시하세요(-AllowDirty 로 무시 가능)" }

$Build = Join-Path $Root "build"
if (-not $SkipBuild) {
    Push-Location $Root
    try {
        $env:CI = "false"; $env:GENERATE_SOURCEMAP = "false"; $env:REACT_APP_OTA_BUNDLE_NO = "$bundleNo"
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "웹 빌드 실패" }
    } finally { Pop-Location }
}
if (-not (Test-Path (Join-Path $Build "index.html"))) { throw "build\index.html 이 없어요(먼저 빌드)" }

# zip — 항목 경로 구분자를 '/' 로(Windows 기본 '\' 는 안드로이드에서 폴더로 풀리지 않는다)
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$zipPath = Join-Path ([IO.Path]::GetTempPath()) "mybudget-bundle-$bundleNo.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
$zip = [IO.Compression.ZipFile]::Open($zipPath, [IO.Compression.ZipArchiveMode]::Create)
try {
    $base = (Resolve-Path $Build).Path.TrimEnd('\') + '\'
    Get-ChildItem $Build -Recurse -File | ForEach-Object {
        $entry = $_.FullName.Substring($base.Length).Replace('\', '/')
        [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entry, [IO.Compression.CompressionLevel]::Optimal)
    }
} finally { $zip.Dispose() }

. (Join-Path $PSScriptRoot "publish-token.ps1")
$token = Read-PublishToken -Root $Root

$sha = (Get-FileHash -Algorithm SHA256 $zipPath).Hash.ToLower()
$size = (Get-Item $zipPath).Length
Write-Host ("번들 {0} · {1} · 최소 APK versionCode {2} · {3:N0} bytes" -f $bundleNo, $version, $minNative, $size)

$q = "app=$App&bundleNo=$bundleNo&minNativeBuild=$minNative&version=$([uri]::EscapeDataString($version))&commit=$commit"
$m = Invoke-RestMethod -Method Post -Uri "$FunctionBase/appOtaPublish?$q" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/zip" -InFile $zipPath
if ($m.sha256 -ne $sha) { throw "서버가 계산한 SHA-256 이 내 파일과 달라요(서버 $($m.sha256) / 로컬 $sha)" }

$latest = Invoke-RestMethod -Uri "$FunctionBase/appOtaLatest?app=$App&t=$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
if ($latest.bundleNo -ne $bundleNo -or $latest.sha256 -ne $sha) { throw "조회 결과가 방금 올린 번들과 달라요(bundleNo $($latest.bundleNo))" }
Remove-Item $zipPath -Force

Write-Host "게시 완료: $App 번들 $bundleNo ($version, 최소 APK $minNative)"
Write-Host "  조회: $FunctionBase/appOtaLatest?app=$App"
