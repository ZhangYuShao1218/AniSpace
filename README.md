# AniSpace (Animation Tracker)

## 專案簡介與目的 (Overview & Purpose)
AniSpace 是一個專為動漫迷打造的「跨平台動畫追蹤與管理平台」。
它的主要目的是讓使用者能輕鬆地記錄、追蹤自己觀看過的動畫名單，並自動彙整來自各大平台的最新動畫資訊，免去使用者四處爬文查詢的麻煩。

## 專案特色 (Features)
- **自動化資訊聚合**：透過獨立爬蟲腳本，定期抓取並更新動畫資料（如放送時間、評分、譯名等），保持資訊即時性。
- **極致的 UI/UX 體驗**：採用 **Premium Dark Theme（深色模式）** 與 **Glassmorphism（玻璃擬物化）** 設計，搭配流暢的微互動（Micro-animations）與 5 欄式排版，打造高級視覺享受。
- **高度隱私與效能**：貫徹單晶片式前端架構，資料完全儲存於使用者的設備端（LocalStorage），無需連線雲端資料庫即可極速運行，並支援 CSV 完美備份。
- **跨平台支援**：共用同一套程式碼基底，同時提供流暢的 Web 網頁版以及 Android 原生 App 體驗。
- **動畫分享功能**：讓使用者能夠輕鬆與好友分享自己喜愛的動畫或精心整理的推薦片單。

## 系統架構 (Architecture)
- **前端核心**：採用 SPA (Single Page Application) 架構，負責所有的畫面渲染與狀態管理，資料庫層面直接與本機儲存 (LocalStorage / FileSystem) 互動。
- **跨平台封裝**：利用跨平台技術，將撰寫好的 Web 應用程式無縫封裝為原生 Android 應用。
- **每日自動化爬蟲與管理通知**：不依賴常駐的雲端伺服器，而是利用 Node.js 撰寫輕量化腳本。系統會每天定時啟動爬蟲，自動抓取並更新最新的動畫與商品資訊；任務完成後，會自動透過郵件發送執行報表給管理者，確保資料更新情況與系統運作狀態一目了然。

## 相關技術 (Technologies)
- **前端框架**：`React` + `Vite` (提供極速的熱更新與建置體驗)
- **跨平台方案**：`Capacitor` (打包 Android App 並呼叫原生 API)
- **爬蟲與自動化工具**：`Node.js`, `Puppeteer`, `Cheerio`
- **資料處理與轉換**：`PapaParse` (CSV 解析), `OpenCC` (繁簡中文轉換)
- **工具與任務排程**：`Nodemailer` (自動發送報表與通知)

## 部署與使用平台 (Platforms)
- **Web 端**：響應式網頁，可於任何現代瀏覽器中流暢運行。並使用 **Cloudflare** 進行自動化部署。
- **Android 端**：透過 Capacitor 封裝並編譯而成的原生應用程式。

## 第三方服務與 API 串接 (Integrations)
- **MyAnimeList (Jikan API)**：專案**最主要的核心**動畫資料來源。
- **Bangumi**：作為輔助資料庫，專門用於補足**繁體中文翻譯譯名**與清晰的**動畫封面圖**。
- **商業與行銷串接**：
  - **AdMob 廣告串接**：於 App 內整合廣告系統。
  - **蝦皮聯合行銷**：串接蝦皮提供相關動漫周邊等聯合行銷功能。
- **Google Cloud Platform (GCP) 相關服務**：
  - **Google Analytics 4 (GA4)**：用於全站流量分析與使用者互動事件追蹤。
  - **Google Auth**：支援 Google 快速登入認證。
  - **Google Drive API**：處理雲端資料備份與讀取。
  - **Google Sheets API**：用於表單式的資料管理與對接。
