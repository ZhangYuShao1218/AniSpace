# Animation Tracker 專案開發與管理規範 (Project Rules)

> [!IMPORTANT]  
> 本文件為此專案的最高原則。後續的 AI 代理人開發工作或是任何人為的程式碼異動，皆須遵守以下原則，以確保高品質且一致的專案成果。

## 1. 原始碼與部署架構
- **前端核心**: React + Vite，善用熱更新帶來的高效能開發體驗。
- **後端擴充**: Node.js 用於輔助抓取資料的爬蟲工具開發或小腳本。
- **不引入雲端資料庫**: 目前專案採取單晶片式前端（LocalStorage）儲存策略，完全不需要接入 Supabase、Firebase 等雲端後端。

## 2. UI / UX 與設計語言 
- **視覺基調**: 嚴格貫徹 **深色模式 (Premium Dark Theme)** 與 **玻璃擬物化 (Glassmorphism)** 的設計風格，拒絕陽春的純色色塊與平板化排版。
- **版面網格**: 只要有動畫清單列表呈現，一律採用響應式的 **5 欄式 (5-column)** 網格排版。
- **資料分頁**: 清單請統一作法，設定每頁固定為 **25 筆**（25 items per page）。
- **微互動 (Micro-animations)**: 無論是 hover、點擊、資料載入、篩選切換等操作，必須附帶平滑的 CSS 漸變 (transition / animations) 或組件進場退場動畫。

## 3. 資料來源與國際化
- **語系優先度**: 優先採用 **繁體中文 (Traditional Chinese, zh-TW)** 介面與標題。
- **主要資料點**: 動畫資料主要採集與分析依據 **Bangumi** 平台。
- **備用資料點**: 仰賴 **MyAnimeList (由 Jikan API 介接)** 提供互補性的資料（如缺漏譯名、補充評分點）。
- **資料可攜性**: 所有使用者自建名單強依賴 **CSV 檔案格式** 的完美匯出匯入，設計時務必顧及欄位完整性與備份容錯。

## 4. 程式碼慣例 (Coding Conventions)
- **架構切割**: 貫徹單一職責（Single Responsibility Principle）。不要過度膨脹單一 `.tsx` 檔案。
- **Hooks 管理**: 妥善使用 `useMemo`, `useCallback` 優化重複渲染。盡快提取自訂的 Hooks (`useAnimeData` 等) 隔離邏輯層與視圖層。
- **命名哲學**: Component 盡量按照 `PascalCase`、函式採用 `camelCase`。並禁止魔法字串（Magic Strings）。

## 5. Git 版本控制與 Github 工作流
- **Git Flow**: 秉持基於功能的開發。若要實作一個巨型系統，請確保每一個細節拆分為獨立 commit。
- **Semantic Commits 規範**: Commit 訊息須符合以下前置約定標籤：
  - `feat:` 新增功能、畫面
  - `fix:` 修復問題或非預期的 UI 跑版
  - `style:` 單純代碼縮排、不改動邏輯的外觀
  - `refactor:` 重構程式碼但未影響功能
  - `docs:` 說明文件或規範文件的增刪（如修改此篇 Markdown）
  - `chore:` 升級依賴、環境變數或其他建置工具配置
- 此規範將確保與 Github Repo 的線圖整潔並利於日後查閱 Log。
