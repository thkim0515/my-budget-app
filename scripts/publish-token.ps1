<#
  업데이트 서버 업로드 토큰 읽기(publish-update.ps1 · publish-ota.ps1 공용). 아워데이즈 게시 스크립트와 같은 순서:
    1) 환경변수 APP_PUBLISH_TOKEN, 없으면 OTA_UPLOAD_TOKEN
    2) 아워데이즈 functions\.env 의 같은 키(경로는 환경변수 OURDAYS_FUNCTIONS_ENV 로 바꿀 수 있고, 기본값은 이 저장소와 같은 폴더의 app\functions\.env)
    3) Secret Manager(Firebase CLI: firebase functions:secrets:access <키> --project our-days-f8384) — CLI 가 없거나 시크릿이 없으면 건너뜀
  값은 화면·파일에 남기지 않는다.
#>
function Read-PublishToken {
    param([string]$Root, [string]$Project = "our-days-f8384")
    $keys = @("APP_PUBLISH_TOKEN", "OTA_UPLOAD_TOKEN")
    foreach ($k in $keys) {
        $v = [Environment]::GetEnvironmentVariable($k)
        if ($v) { return $v.Trim() }
    }
    $envFile = $env:OURDAYS_FUNCTIONS_ENV
    if (-not $envFile) { $envFile = Join-Path $Root "..\app\functions\.env" }
    if (Test-Path -LiteralPath $envFile) {
        $text = Get-Content -LiteralPath $envFile -Raw -Encoding UTF8
        foreach ($k in $keys) {
            $m = [regex]::Match($text, "(?m)^\s*$k\s*=\s*`"?([^`"\r\n]+)`"?")
            if ($m.Success) { return $m.Groups[1].Value.Trim() }
        }
    }
    if (Get-Command firebase -ErrorAction SilentlyContinue) {
        foreach ($k in $keys) {
            try {
                $v = (& firebase functions:secrets:access $k --project $Project 2>$null | Out-String).Trim()
                if ($LASTEXITCODE -eq 0 -and $v -and $v -notmatch "\s") { return $v }
            } catch { }
        }
    }
    throw "업로드 토큰을 찾지 못했어요(환경변수 APP_PUBLISH_TOKEN · OURDAYS_FUNCTIONS_ENV 가 가리키는 .env · Secret Manager)"
}
