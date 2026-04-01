

## 通用程式設計準則 (Universal Coding Standards)

> 以下準則適用於本專案中的**任何程式語言**（TypeScript / JavaScript / Node.js / CSS / Shell Script 等），不得以「這只是小腳本」或「臨時用的」為由豁免。

---

### 1. 可讀性優先 (Readability First)
- **命名必須自解釋 (Self-documenting)**：變數、函式、類別的命名須清楚表達其用途。禁止使用 `data`、`temp`、`x`、`flag` 等無意義的通用名稱。
- **禁止魔法數字與魔法字串 (No Magic Values)**：所有硬編碼的數值或字串必須提取為具名常數（`const MAX_RETRY = 3`），並輔以必要的注釋說明其業務含義。
- **函式長度限制**：單一函式原則上不超過 **50 行**。若超過，應拆分為更小的子函式，各司其職。
- **縮排與格式一致性**：全專案統一使用 **2 個空格** 縮排（與現行 Vite/React 專案設定一致），禁止混用 Tab 與空格。

---

### 2. 單一職責原則 (Single Responsibility Principle)
- 每個函式只做**一件事**，且只有**一個理由**需要修改它。
- 每個模組 / 檔案只負責一個**明確的業務層級**（例如：資料抓取、資料轉換、UI 渲染不應混寫在同一個函式中）。
- 避免「神物件 (God Object)」：若一個類別或物件需要管理超過 5 種不同職責，應立即重構拆分。

---

### 3. 防禦性程式設計 (Defensive Programming)
- **邊界條件先行**：任何接收外部輸入（API 回應、使用者輸入、LocalStorage 讀取）的函式，必須在函式入口處驗證資料的合法性，並明確處理 `null`、`undefined`、空陣列等邊界狀況。
- **明確的錯誤處理**：禁止空白 `catch` 區塊（`catch (e) {}`）。每個 try/catch 必須有實際的錯誤處理邏輯或至少 `console.error` 記錄，並附上有意義的錯誤訊息。
- **不信任外部資料**：來自 API（Bangumi、Jikan 等）或 CSV 匯入的資料，必須先經過型別驗證或資料清理，再進入任何業務邏輯。
- **快速失敗 (Fail Fast)**：錯誤應盡早被偵測與拋出，而非讓錯誤狀態靜默傳播至系統深處，造成難以追蹤的下游問題。

---

### 4. 不重複原則 (DRY — Don't Repeat Yourself)
- 若同一段邏輯在兩處以上出現，**必須提取**為可重用的函式、Hook、或工具模組。
- 共用邏輯統一放置於 `src/utils/` 或 `src/hooks/` 目錄，禁止在多個元件裡各自複製貼上。
- 共用的型別定義（TypeScript 介面 / 型別別名）統一放置於 `src/types/`，避免在各檔案中重複宣告相似的結構。

---

### 5. 純函式優先 (Prefer Pure Functions)
- 撰寫函式時，優先考慮**純函式 (Pure Function)**：相同輸入永遠產生相同輸出，不產生任何副作用（Side Effects）。
- 有副作用的操作（如 API 請求、LocalStorage 寫入、DOM 操作）必須明確隔離，不得夾雜在資料轉換邏輯中。
- 在 React 元件中，資料轉換邏輯應移出元件，放在獨立的工具函式中，讓元件只負責渲染。

---

### 6. 不留死碼 (No Dead Code)
- 禁止將已被取代的功能以「註解」的方式保留在程式碼中（即 Commented-out Code）。應善用 Git 版本歷史追蹤舊版實作。
- 未使用的 import、變數、函式，在合併前必須清除。
- 功能完成後，移除所有開發時期留下的 `console.log` 偵錯輸出（保留刻意記錄的 `console.error` 和 `console.warn`）。

---

### 7. 注釋哲學 (Comment Philosophy)
- **注釋說明「為什麼」，而非「做什麼」**：好的命名讓程式碼自解釋其「做什麼」；注釋應保留給記錄業務決策、特殊限制或反直覺的實作原因。
- 複雜的邏輯區塊（如特殊的排序演算法、API 速率限制的處理策略）必須附上簡短注釋說明設計意圖。
- 所有公開的工具函式（`src/utils/`）必須撰寫 **JSDoc / TSDoc** 文件注釋，包含參數與回傳值的說明。

---

### 8. 安全性基線 (Security Baseline)
- **敏感資訊禁止硬編碼**：API Key、Token、密碼等憑證絕對不可直接寫入原始碼，必須透過環境變數（`.env` 檔案）管理，且 `.env` 已納入 `.gitignore`。
- **不信任使用者輸入**：所有從 UI 取得的字串，在用於查詢或顯示前必須進行適當的清理（Sanitization），防止 XSS 等注入攻擊。
- **LocalStorage 資料不視為安全儲存**：不將任何敏感性個人資料存入 LocalStorage。

---

### 9. 效能守則 (Performance Guidelines)
- **避免不必要的重新計算**：在 React 中，善用 `useMemo` 快取昂貴的運算結果，善用 `useCallback` 穩定函式參考，避免子元件因父元件重渲染而無謂地重新執行。
- **延遲載入 (Lazy Loading)**：非首屏必要的頁面 / 元件，應使用動態 `import()` 或 React.lazy 進行程式碼分割（Code Splitting），加速首次載入。
- **避免 N+1 問題**：在進行資料查詢或批次處理時，禁止在迴圈內部發出單獨的 API 請求。應先聚合 ID，再進行單次批次查詢。
- **節流與防抖 (Throttle & Debounce)**：搜尋框、滾動偵測、視窗縮放等高頻觸發的事件，**必須**加上 debounce 或 throttle 處理，避免效能瓶頸。

---

### 10. 狀態管理守則 (State Management)
- **最小化狀態 (Minimize State)**：只將真正需要觸發重渲染的資料放入 State。可以從現有 State 派生（derive）的值，用 `useMemo` 計算，而非另開新的 State。
- **狀態下放 (Colocation)**：State 應盡量定義在最靠近使用它的元件處，而非一律提升至全域。只有真正跨多個遠距元件共享的狀態，才需提升或使用全域管理。
- **不可變更新 (Immutable Updates)**：更新物件或陣列型態的 State 時，**必須**回傳新的參考（例如：使用展開運算子 `...` 或 `Array.map`），禁止直接對現有物件進行 mutation。
- **明確的 Loading / Error 狀態**：任何非同步操作（如 API 請求）都必須搭配相對應的 `isLoading`、`error` 狀態，在 UI 中提供清晰的使用者回饋。

---

### 11. 測試策略 (Testing Strategy)
- **測試邊界，而非實作細節**：測試的斷言目標應是函式的「輸出」與「副作用」，而非其內部的實作步驟。
- **單元測試涵蓋核心邏輯**：`src/utils/` 下的所有純函式（如資料轉換、排序、過濾邏輯）應有對應的單元測試，並確保涵蓋正常路徑與邊界條件。
- **AAA 結構**：每個測試案例統一採用 **Arrange（準備）→ Act（執行）→ Assert（斷言）** 三段式結構，保持測試的可讀性。
- **測試命名清晰**：測試描述應清楚說明「在什麼情境下，期望什麼行為」，例如：`it('should return empty array when input list is empty', ...)`。

---

### 12. 抽象與封裝 (Abstraction & Encapsulation)
- **適度抽象 (Right-level Abstraction)**：不要過早抽象（YAGNI — You Aren't Gonna Need It）。只在重複出現兩次以上，且未來確實有變動可能時，才進行抽象提取。
- **封裝實作細節**：模組對外只暴露必要的公開介面（Public API），隱藏內部的實作細節。呼叫方不應需要了解模組的內部運作才能使用它。
- **依賴抽象，而非實作**：元件或函式應依賴「介面 / 型別」，而非具體的實作類別。這讓替換底層實作（如更換 API 來源）時，不需修改上層邏輯。
