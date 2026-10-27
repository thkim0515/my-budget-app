<#
  가계부 앱 허브 배포 스크립트.
  빌드된 APK 를 업데이트 서버(Firebase Storage, 아워데이즈 프로젝트의 Cloud Function appPublish)에 올리고
  최신 정보(앱 허브가 appLatest?app=mybudget 로 조회)를 갱신한다.
  웹 화면 코드는 지금처럼 capgo OTA 로 배포되고, 이 스크립트는 앱 허브에서 받는 설치용 APK 만 다룬다.
  서버가 APK 의 SHA-256·크기·패키지명(com.user.budgetapp)을 정해 latest.json 에 기록하고, 다운로드 주소에는 파일별 무작위 토큰이 붙는다.

  사용 예:
    powershell -ExecutionPolicy Bypass -File scripts\publish-update.ps1 -Notes "변경 내용 한 줄"
    powershell -ExecutionPolicy Bypass -File scripts\publish-update.ps1 -Apk D:\Claude_Dev\mybudgetapp_apk\mybudgetapp-v1.1.apk -Notes "..."
    powershell -ExecutionPolicy Bypass -File scripts\publish-update.ps1 -Notes "..." -ForceUpdate 1   (강제 릴리스)

  -ForceUpdate: 이 릴리스의 강제 여부(0 = 선택, 1 = 강제). 생략하면 0(같은 번호 재게시면 이전 값 유지).
    정책: 설치본보다 높은 릴리스 중 강제(1)가 하나라도 있으면 강제 — 서버가 minVersionCode 로 계산하고, 앱은 "나중에" 없이 안내한다.

  버전은 android/app/build.gradle 의 versionCode/versionName 에서 읽는다.
  APK 를 지정하지 않으면 android/app/build/outputs/apk/debug/app-debug.apk 를 올린다.
  서명: 폰에 설치된 앱과 같은 키(이 PC 의 debug.keystore)로 서명된 APK 만 덮어쓰기 설치된다. 다른 키로 서명하면 허브 업데이트가 실패한다.
  업로드 토큰: 환경변수 APP_PUBLISH_TOKEN, 없으면 OTA_UPLOAD_TOKEN, 그것도 없으면 아워데이즈의 functions\.env(같은 키)에서 읽는다.
    (경로는 환경변수 OURDAYS_FUNCTIONS_ENV 로 바꿀 수 있고, 기본값은 이 저장소와 같은 폴더의 app\functions\.env). 값은 화면·파일에 남기지 않는다.
  서버는 더 낮은 versionCode 로 최신을 덮어쓰지 않고(409), 앱마다 최신 APK 2개만 남긴다.
#>
param(
    [string]$Apk = "",
    [Parameter(Mandatory = $true)][string]$Notes,
    [ValidateSet("", "0", "1")][string]$ForceUpdate = "",
    [string]$FunctionBase = "https://asia-northeast3-our-days-f8384.cloudfunctions.net"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$App = "mybudget"
$Root = Split-Path -Parent $PSScriptRoot
$Gradle = Get-Content (Join-Path $Root "android\app\build.gradle") -Raw -Encoding UTF8

$code = [int]([regex]::Match($Gradle, 'versionCode\s+(\d+)').Groups[1].Value)
$name = [regex]::Match($Gradle, 'versionName\s+"([^"]+)"').Groups[1].Value
if (-not $code -or -not $name) { throw "build.gradle 에서 버전을 읽지 못했어요" }

if (-not $Apk) { $Apk = Join-Path $Root "android\app\build\outputs\apk\debug\app-debug.apk" }
if (-not (Test-Path $Apk)) { throw "APK 가 없어요: $Apk" }

function Read-PublishToken {
    foreach ($k in @("APP_PUBLISH_TOKEN", "OTA_UPLOAD_TOKEN")) {
        $v = [Environment]::GetEnvironmentVariable($k)
        if ($v) { return $v.Trim() }
    }
    $envFile = $env:OURDAYS_FUNCTIONS_ENV
    if (-not $envFile) { $envFile = Join-Path $Root "..\app\functions\.env" }
    if (Test-Path $envFile) {
        $text = Get-Content $envFile -Raw -Encoding UTF8
        foreach ($k in @("APP_PUBLISH_TOKEN", "OTA_UPLOAD_TOKEN")) {
            $m = [regex]::Match($text, "(?m)^\s*$k\s*=\s*`"?([^`"\r\n]+)`"?")
            if ($m.Success) { return $m.Groups[1].Value.Trim() }
        }
    }
    throw "업로드 토큰을 찾지 못했어요(환경변수 APP_PUBLISH_TOKEN 또는 OURDAYS_FUNCTIONS_ENV 가 가리키는 .env)"
}
$token = Read-PublishToken
$headers = @{ Authorization = "Bearer $token" }

$sha = (Get-FileHash -Algorithm SHA256 $Apk).Hash.ToLower()
$size = (Get-Item $Apk).Length
Write-Host ("APK {0} · {1:N0} bytes · versionCode {2} · v{3}" -f (Split-Path $Apk -Leaf), $size, $code, $name)

$q = "app=$App&versionCode=$code&versionName=$([uri]::EscapeDataString($name))"
if ($ForceUpdate) { $q += "&forceUpdate=$ForceUpdate" }

# 1) 이어올리기 주소 받기
$init = Invoke-RestMethod -Method Post -Uri "$FunctionBase/appPublish?action=init&$q" -Headers $headers

# 2) 그 주소로 APK 를 한 번에 PUT (서버가 올라간 파일의 SHA-256 을 직접 계산한다)
Invoke-WebRequest -Method Put -Uri $init.uploadUri -InFile $Apk -ContentType "application/vnd.android.package-archive" -UseBasicParsing | Out-Null
Write-Host "업로드 완료"

# 3) 서버가 파일을 확인하고 최신 정보(latest.json)를 갱신한다. 변경 내용은 UTF-8 JSON 본문으로 보낸다.
$body = [System.Text.Encoding]::UTF8.GetBytes((@{ notes = $Notes } | ConvertTo-Json -Compress))
$m = Invoke-RestMethod -Method Post -Uri "$FunctionBase/appPublish?action=finalize&$q" -Headers $headers -ContentType "application/json; charset=utf-8" -Body $body
if ($m.sha256 -ne $sha) { throw "서버가 계산한 SHA-256 이 내 파일과 달라요(서버 $($m.sha256) / 로컬 $sha)" }

# 4) 앱 허브가 조회하는 주소로 다시 읽어 확인한다
$latest = Invoke-RestMethod -Uri "$FunctionBase/appLatest?app=$App&t=$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
if ($latest.versionCode -ne $code -or $latest.sha256 -ne $sha) { throw "조회 결과가 방금 올린 버전과 달라요(versionCode $($latest.versionCode))" }

Write-Host "배포 완료: $App v$name (versionCode $code, 강제 $($latest.forceUpdate) · minVersionCode $($latest.minVersionCode))"
Write-Host "  조회: $FunctionBase/appLatest?app=$App"
Write-Host "  SHA : $sha ($size bytes)"
