---
name: build-aab
description: 自動檢查與更新版號，建構前端專案並同步至 Capacitor，使用 Android Studio 內建 JDK 快速打包正式版 Android App Bundle (.aab)。
---

# Build Release Android App Bundle (AAB)

此 Skill 提供專屬於本專案 (AniSpace) 的自動化 Android 正式包 (`.aab`) 打包流程。當使用者提出「打包 aab」、「版號 +1 打包」、「編譯發佈包」等需求時，請立刻調閱並遵守本規範。

## 📋 標準作業流程 (SOP)

### 1. 確認與調整版本號 (若使用者要求升級版號)
打包前，請優先檢查以下兩個檔案的版本號是否一致同步：
* **`package.json`**：檢查 `version` 欄位（例如 `"1.0.9"`）。
* **`android/app/build.gradle`**：檢查 `defaultConfig` 區塊中的 `versionCode` (整數遞增，例如 `11`) 與 `versionName` (字串字面量，例如 `"1.0.9"`)。

> [!IMPORTANT]
> 如果 `src/types/` 下有自訂的外掛型別擴充（例如 `lucide-react.d.ts`），編譯前務必確認是否有遺漏的 Export 定義，以防 TypeScript 檢查報錯中斷打包。

### 2. 一鍵執行自動化打包腳本
為避免環境變數 (`JAVA_HOME`) 找不到或指令輸入錯誤，請直接在 Terminal 執行專案內建的一鍵自動化腳本：

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/build-aab/scripts/build_release_aab.ps1
```

此腳本內部會依序執行：
1. **設定 Java 環境**：自動偵測並設定 `JAVA_HOME` 至 `C:\Program Files\Android\Android Studio\jbr`。
2. **編譯前端靜態包**：執行 `npm run build` (`tsc -b && vite build`)。
3. **同步 Capacitor 資源**：執行 `npx cap sync android` 將編譯產物同步至 Android Native 專案。
4. **Gradle 簽署與打包**：切換至 `android/` 目錄並執行 `.\gradlew bundleRelease` 生成 `.aab` 檔案。

### 3. 檢查與回報結果
腳本執行成功後，會產出檔案至：
`android/app/build/outputs/bundle/release/app-release.aab`

請向使用者清晰回報：
* 更新後的 `versionCode` 與 `versionName`
* 產出的 `.aab` 檔案完整路徑與大小
