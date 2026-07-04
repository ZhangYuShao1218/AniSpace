# =====================================================================
# AniSpace Android App Bundle (AAB) 自動化編譯腳本
# =====================================================================

$ErrorActionPreference = "Stop"
$projectRoot = Get-Location

Write-Host "🚀 [Step 1/4] 檢查並設定 JAVA_HOME 環境變數..." -ForegroundColor Cyan
$jbrPath = "C:\Program Files\Android\Android Studio\jbr"
if (Test-Path $jbrPath) {
    $env:JAVA_HOME = $jbrPath
    Write-Host "   ✔ 已成功指向 Android Studio 內建 JBR: $env:JAVA_HOME" -ForegroundColor Green
} elseif (-not $env:JAVA_HOME) {
    Write-Error "找不到 Android Studio JBR 且 JAVA_HOME 未設定，請手動設定環境變數！"
} else {
    Write-Host "   ✔ 使用現有 JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Green
}

Write-Host "`n🚀 [Step 2/4] 執行前端 Web Bundle 構建 (npm run build)..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "前端編譯失敗 (npm run build)，請檢查 TypeScript / Vite 錯誤資訊！"
}

Write-Host "`n🚀 [Step 3/4] 同步 Web 靜態資源與 Capacitor Native 專案 (npx cap sync android)..." -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Error "Capacitor 同步失敗！"
}

Write-Host "`n🚀 [Step 4/4] 執行 Gradle Bundle Release 打包 (.\gradlew bundleRelease)..." -ForegroundColor Cyan
Push-Location "$projectRoot\android"
try {
    .\gradlew bundleRelease
    if ($LASTEXITCODE -ne 0) {
        throw "Gradle 打包 AAB 失敗！"
    }
} finally {
    Pop-Location
}

$aabPath = "$projectRoot\android\app\build\outputs\bundle\release\app-release.aab"
if (Test-Path $aabPath) {
    $fileInfo = Get-Item $aabPath
    $sizeMb = [math]::Round($fileInfo.Length / 1MB, 2)
    Write-Host "`n🎉 [打完收工] AAB 打包成功！" -ForegroundColor Green
    Write-Host "📂 檔案路徑: $aabPath" -ForegroundColor Yellow
    Write-Host "⚖️ 檔案大小: $sizeMb MB" -ForegroundColor Yellow
    Write-Host "🕒 建立時間: $($fileInfo.LastWriteTime)" -ForegroundColor Yellow
} else {
    Write-Error "打包指令執行結束，但找不到目標 AAB 檔案：$aabPath"
}
