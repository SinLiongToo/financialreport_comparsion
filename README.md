# 📊 企業年度財報下載、PDF 轉 Markdown 與營運卓越 (OpEx) 戰略儀表板

> **一步到位 (One-Click, End-to-End) 企業財務審計與精益營運戰略分析工作流**
> 專為半導體與高科技產業分析師、高階經理人（JG 10+ / Director）、製造營運卓越（OpEx）主管打造的自動化軍火庫。

---

## 📑 目錄

1. [專案緣起與核心價值](#-專案緣起與核心價值)
2. [一步到位工作流架構 (Workflow Architecture)](#-一步到位工作流架構-workflow-architecture)
3. [核心工作流中樞：workflow.py 深度解析](#-核心工作流中樞workflowpy-深度解析-pipeline-orchestrator)
4. [核心功能特色](#-核心功能特色)
5. [專案目錄與檔案職責說明](#-專案目錄與檔案職責說明)
5. [安裝與前置準備 (Installation)](#-安裝與前置準備-installation)
6. [詳細使用指南 (Usage Guide)](#-詳細使用指南-usage-guide)
   - [模式一：互動式 Web 儀表板 (推薦)](#模式一互動式-web-儀表板-推薦)
   - [模式二：命令列 (CLI) 批次處理](#模式二命令列-cli-批次處理)
7. [四大核心戰略分析框架](#-四大核心戰略分析框架)
   - [1. 人力與毛利率黃金交叉點 (The Pivot)](#1-人力與毛利率黃金交叉點-the-pivot)
   - [2. 人均產值量化指標 (Productivity Metrics)](#2-人均產值量化指標-productivity-metrics)
   - [3. 銷售結構不對稱性 (Value-vs-Volume Paradox)](#3-銷售結構不對稱性-value-vs-volume-paradox)
   - [4. 營運轉型成熟度模型 (Lean Maturity Model)](#4-營運轉型成熟度模型-lean-maturity-model)
8. [如何搭配 Gemini / LLM 進行深度戰略產出](#-如何搭配-gemini--llm-進行深度戰略產出)
9. [常見問題與故障排除 (FAQ)](#-常見問題與故障排除-faq)
10. [最新修復與優化 (Change Log)](#-最新修復與優化-change-log)
11. [Git History Log](#-git-history-log)

---

## 💡 專案緣起與核心價值

在半導體與高科技巨頭（如 **ASML, TSMC, NVDA, NXP, AMAT**）的戰略評估或高階面試中，常見三大痛點：
1. **資料收集瑣碎**：手動搜尋、下載歷年 20-F / 10-K 動輒數百頁的 PDF 耗時費力。
2. **AI 無法直接吞吐厚重 PDF 表格**：傳統 PDF 轉換往往遺失表格結構，導致 LLM 讀取財務數據時產生幻覺或數字對不齊。
3. **「財務歸財務、精益營運歸精益」的部門牆**：一般財務分析只看營收成長，忽略了**員工人數高原期（Headcount Plateau）**下的**人均產值**與**製造物流負荷（Volume Load）**。

**本專案提供「一步到位」解法：**
輸入任意公司的 CompaniesMarketCap 網址或股票代碼，系統自動完成 **「爬取 ➔ 下載 PDF ➔ 轉結構化 Markdown ➔ 抽取指標 ➔ 50/50 戰略儀表板視覺化」** 全自動閉環。

---

## 🔄 一步到位工作流架構 (Workflow Architecture)

`mermaid
flowchart TD
    Start([使用者輸入目標<br/>例如: ASML, TSMC, NVDA 或網址]) --> Step1[1. AnnualReportCrawler<br/>智能爬蟲模組]
    
    subgraph S1 [階段一：爬取與下載]
        Step1 --> FetchList[解析頁面 20-F / 10-K 列表]
        FetchList --> DownloadPDF[下載 N 年官方審計 PDF 至 data/downloads/]
    end
    
    subgraph S2 [階段二：PDF 高保真解析]
        DownloadPDF --> Step2[2. PDFToMarkdownParser<br/>PyMuPDF + pdfplumber 雙引擎]
        Step2 --> ExtractTable[提取章節階層與 GitHub Markdown 表格]
        ExtractTable --> SaveMD[儲存 .md 檔至 data/parsed_md/]
    end
    
    subgraph S3 [階段三：指標抽取與計算]
        SaveMD --> Step3[3. FinancialMetricsExtractor<br/>財務與人均產值計算引擎]
        Step3 --> CalcMetrics[計算 Revenue/GP/OI per Employee<br/>與 YoY % / Margin Diff]
        CalcMetrics --> SaveJSON[產出結構化指標 data/metrics/*.json]
    end
    
    subgraph S4 [階段四：戰略儀表板與 AI 對齊]
        SaveJSON --> Step4[4. Web Dashboard (Flask + Plotly)<br/>50/50 戰略圖表與 Master KPI 表格]
        SaveMD --> Step5[5. 線上 Markdown 預覽器<br/>一鍵複製給 Gemini/Claude Prompt]
    end
`

---

---

## ⚙️ 核心工作流中樞：`workflow.py` 深度解析 (Pipeline Orchestrator)

`workflow.py` 是整個系統的**核心中樞大腦（Central Orchestrator）**。它負責將底層分散的爬蟲、PDF 解析與財務計算引擎組裝成一條「全自動、非同步、具備進度反饋」的一體化流水線。

### 1. `AnnualReportWorkflow` 類別職責

```
                    ┌────────────────────────────────────────────────────────┐
                    │               workflow.py (中樞調度大腦)                │
                    └──────────────────────────┬─────────────────────────────┘
                                               │
               ┌───────────────────────────────┼───────────────────────────────┐
               ▼                               ▼                               ▼
       crawler.py (爬蟲)              pdf_parser.py (解析)          metrics_extractor.py (指標)
  • 取得 20-F/10-K 清單            • PyMuPDF 串流文本提取          • 計算人均營收/毛利/營業利益
  • 批次下載 PDF 至 downloads/     • pdfplumber 表格轉 Markdown    • 產出 6 大圖表與 KPI 結構
```

### 2. 四大執行階段與運作機制 (`run_pipeline`)

當透過 Web 儀表板點擊「立即執行」或透過 CLI 執行時，`workflow.py` 會依序執行以下 4 個階段：

1. **階段一：智能爬取與下載 (進度 10% ~ 40%)**
   - 呼叫 `crawler.download_reports()`。
   - 自動解析目標網址或代碼，過濾出近 $N$ 年的 20-F / 10-K 報告。
   - 具備**檔案快取防重試機制**：若 PDF 已經下載且大小大於 10KB，則直接複用，避免重複耗時下載。
2. **階段二：高保真 PDF 轉 Markdown (進度 45% ~ 80%)**
   - 呼叫 `parser.parse_pdf()`。
   - 逐頁提取財務章節與損益表/資產負債表，將 PDF 原始表格轉換為標準 GitHub Markdown 表格（`| col | col |`）。
   - 儲存至 `data/parsed_md/{ticker}/{ticker}_{year}_{type}.md`。
3. **階段三：財務指標抽取與產值計算 (進度 85% ~ 95%)**
   - 呼叫 `extractor.extract_from_markdown()`。
   - 自動提取 Revenue, Gross Profit, Operating Income, R&D Expense 與 Headcount。
   - 即時計算人均產值三合一指標（Rev/Emp, GP/Emp, OpIncome/Emp）與各項 YoY 年增率。
   - 產出前端專用的 `data/metrics/{ticker}_metrics.json`。
4. **階段四：資料封裝與回傳 (進度 100%)**
   - 封裝下載統計、解析檔案路徑、總耗時（秒數）與指標數據，即時回傳給 Web 前端以重新渲染所有 Plotly 圖表。

### 3. Python 程式碼直接調用範例

如果您想在自己的 Python 腳本或 Jupyter Notebook 中調用工作流，只需三行代碼：

```python
from workflow import AnnualReportWorkflow

# 初始化工作流引擎
wf = AnnualReportWorkflow(data_root="data")

# 定義進度回調函數 (可選)
def my_progress(msg, percent):
    print(f"[{percent:.0f}%] {msg}")

# 一鍵執行 ASML 近 5 年財報下載與解析
result = wf.run_pipeline(
    target="https://companiesmarketcap.com/asml/annual-reports-20f/",
    n_years=5,
    max_pages_per_pdf=40,
    progress_callback=my_progress
)

print(f"完成！耗時: {result['elapsed_seconds']}s，已處理 {result['downloaded_count']} 份財報。")
```

---

## ✨ 核心功能特色

| 功能模組 | 功能描述 | 效益與價值 |
| :--- | :--- | :--- |
| **🌐 智能爬蟲 (crawler.py)** | 支援 CompaniesMarketCap 網址與純 Ticker 輸入，自動判斷 20-F/10-K/Annual Reports。 | 自動過濾重複下載、支援自訂年數 $（如近 3/5/8/10 年）。 |
| **📑 PDF 轉 Markdown (pdf_parser.py)** | 結合 PyMuPDF（快速文字串流）與 pdfplumber（精準表格抽取）。 | 將財報內的損益表、資產負債表轉為標準 Markdown 表格，杜絕表格跑版。 |
| **📐 指標抽取引擎 (metrics_extractor.py)** | 自動計算 Revenue per Employee、Gross Margin %、YoY 成長率與產品線分拆。 | 內建已審計基準庫，支援與新解析 Markdown 交叉驗證。 |
| **🖥️ 互動式 Web Dashboard (pp.py)** | 現代化深色儀表板，整合 Plotly 互動圖表與 Master 綜合審計表格。 | 具備 50/50 戰略對齊版面、Value vs Volume 雙面板圖、CSV 一鍵匯出。 |
| **📋 內建 AI 提示詞軍火庫 (.md)** | 隨附 ininacial_prompt.md、prompt_Financial Report.md、sale_breakdown.md。 | 將解析出的 Markdown 檔案直接餵給 Gemini，5 分鐘產出高階簡報。 |

---

## 📁 專案目錄與檔案職責說明

`
FINICIAL ANNUAL REPORT DOWNLOAD TO MD_dashboard/
├── 📄 crawler.py              # 爬蟲模組：負責向 CompaniesMarketCap 抓取財報清單並下載 PDF
├── 📄 pdf_parser.py           # 解析模組：將 PDF 檔案轉換為結構化 Markdown（保留標題與表格）
├── 📄 metrics_extractor.py    # 指標模組：自 Markdown/數據中計算人均產值、利潤率與銷售分拆
├── 📄 workflow.py             # 核心工作流：串接下載、解析、指標計算之「一步到位」引擎
├── 📄 app.py                  # Web 伺服器：基於 Flask 提供 RESTful API 與 Dashboard 路由
├── 📄 main.py                 # CLI 命令列入口與快速啟動腳本
├── 📄 requirements.txt        # 專案 Python 依賴套件清單
├── 📁 templates/
│   └── 📄 index.html          # 前端儀表板 HTML（整合 TailwindCSS, Plotly, FontAwesome）
├── 📁 static/
│   ├── 📁 css/
│   │   └── 📄 style.css       # 儀表板自訂捲軸與視覺樣式
│   └── 📁 js/
│       └── 📄 dashboard.js    # 前端邏輯：非同步 API 呼叫、Plotly 圖表渲染、Markdown 預覽
├── 📁 data/                   # 數據存放目錄 (依公司分類)
│   ├── 📁 downloads/          # 下載的原始 20-F / 10-K PDF 檔案存放區 (例如: data/downloads/asml/)
│   ├── 📁 parsed_md/          # 轉換後的 Markdown 檔案存放區 (例如: data/parsed_md/asml/)
│   └── 📁 metrics/            # 提取後的結構化 JSON 指標數據 (例如: data/metrics/asml_metrics.json)
├── 📄 fininacial_prompt.md    # 萬用企業「營運卓越與財務戰略」雙合一 Prompt 範本
├── 📄 prompt_Financial Report.md # 深度半導體財報審計與人均產值分析 Prompt
└── 📄 sale_breakdown.md       # 銷售結構不對稱性 (Value-vs-Volume) 深度分析與視覺化 Prompt
`

---

## 💻 安裝與前置準備 (Installation)

### 1. 環境需求
* **Python**: 3.9 或以上版本
* **作業系統**: Windows 10/11, macOS, Linux

### 2. 安裝依賴套件
在專案根目錄開啟終端機（PowerShell 或 Terminal），執行：

`ash
pip install -r requirements.txt
`

*(主要套件包含：lask, pymupdf, pdfplumber, eautifulsoup4, pandas, plotly)*

---

## 🚀 詳細使用指南 (Usage Guide)

### 模式一：互動式 Web 儀表板 (推薦)

#### 步驟 1：啟動伺服器
`ash
python main.py --serve
`
終端機會顯示：
`
🚀 Starting Web Dashboard on http://127.0.0.1:5000...
`

#### 步驟 2：開啟瀏覽器訪問
打開瀏覽器進入：**http://127.0.0.1:5000**

#### 步驟 3：圖形化介面操作三步驟
1. **輸入目標**：
   - 貼上 CompaniesMarketCap 網址（例如：https://companiesmarketcap.com/asml/annual-reports-20f/）
   - 或直接輸入公司代號（例如：ASML、TSMC、NVDA、NXP）。
2. **選擇年數**：下拉選單選擇欲分析的年數（預設近 5 年，可選 3/5/8/10 年）。
3. **點擊「立即執行一步到位工作流」**：
   - 系統將在背景自動完成：**下載 PDF ➔ 解析成 Markdown ➔ 抽取指標 ➔ 更新所有圖表**。
   - 進度條即時顯示各階段完成百分比。

#### 步驟 4：儀表板視覺化瀏覽
* **頂部 KPI 卡片**：即時呈現最新營收、YoY 成長率、毛利率、員工人數與人均營收。
* **50/50 戰略對齊圖**：
  * **左側**：員工人數高原曲線 vs. 毛利率走勢。
  * **右側**：人均營收 (Revenue/FTE) 與人均毛利 (Gross Profit/FTE) 趨勢。
* **Value vs. Volume 銷售結構雙面板圖**：左邊為產品金額佔比，右邊為出貨實體台數。
* **Master 財務數據表**：點擊右上角「匯出 CSV」可下載結構化表格。
* **Markdown 即時預覽器**：左側點選解析後的 .md 檔案，右側即時檢視全文，並提供一鍵「複製 Markdown」按鈕。
#### 🔄 頂部選單 (Company Switcher) vs. 下方控制台 (Pipeline Console) 職責與雙向連動說明

在 Web 儀表板中，您會看到「右上角公司下拉選單」與「下方一步到位工作流控制台」兩個輸入位置，其具體分工與連動機制如下：

| 介面位置 | 名稱 | 核心職責 | 使用時機與特色 |
| :--- | :--- | :--- | :--- |
| **右上角** | **公司快速切換選單 (Company Switcher)** | **即時檢視與切換「已處理完成」的公司** | 當您已經下載過多家公司（如 ASML、TSMC、NVIDIA），在此處直接下拉切換，**0.1 秒內**即可快速渲染全站 6 大圖表與數據，**無需重複下載或解析**。 |
| **下方** | **一步到位工作流控制台 (Pipeline Console)** | **抓取「新公司」或變更下載年數的工作流發動機** | 當您要分析一家**全新的公司**（例如輸入 `amat`、`nxp` 或貼上 CompaniesMarketCap 網址），或想變更年數（如近 10 年）時，在此處輸入並點擊「立即執行一步到位工作流」。 |

**🔗 雙向即時連動機制 (Two-Way Synchronization)：**
1. **右上角 ➔ 下方連動**：當您在右上角下拉選單切換至 `TSMC` 或 `NVIDIA` 時，下方輸入框會**自動同步更新**為對應的代碼或網址。
2. **下方 ➔ 右上角連動**：當您在下方輸入新公司並點擊執行成功後，系統會**自動將該公司加入右上角下拉選單並同步選中**，即時刷新全站儀表板！

---

### 模式二：命令列 (CLI) 批次處理

適合需要批次下載或無介面伺服器環境執行：

#### 基本語法
`ash
python main.py [--ticker TARGET] [--years N] [--max-pages P] [--serve] [--port PORT]
`

#### 參數說明
| 參數名稱 | 縮寫 | 預設值 | 說明 |
| :--- | :--- | :--- | :--- |
| --ticker | -t | ASML 網址 | 目標公司代號或 CompaniesMarketCap URL |
| --years | -n | 5 | 欲下載與解析的歷史財報年數 $ |
| --max-pages | | 40 | 每一份 PDF 轉換為 Markdown 的最大頁數（避免轉換非必要附錄） |
| --serve | -s | False | 啟動 Web 儀表板伺服器模式 |
| --port | -p | 5000 | Web 伺服器連接埠 |

#### CLI 使用範例

- **範例 1：一鍵下載並解析 ASML 近 5 年 20-F 財報**
  `ash
  python main.py --ticker https://companiesmarketcap.com/asml/annual-reports-20f/ --years 5
  `

- **範例 2：下載台積電 (TSMC) 近 3 年年報**
  `ash
  python main.py --ticker tsmc --years 3
  `

- **範例 3：以自訂 Port 8080 啟動 Web 儀表板**
  `ash
  python main.py --serve --port 8080
  `

---

## 🧠 四大核心戰略分析框架

本專案不僅僅是爬蟲工具，背後封裝了高階主管評估半導體與製造巨頭的四大戰略框架：

### 1. 人力與毛利率黃金交叉點 (The Pivot)
* **核心理論**：當企業規模擴大到一定程度，員工人數會進入高原期（如 ASML 在 2024 年後維持在約 4.4 萬人）。
* **戰略解讀**：若未來毛利率目標要拉升至 56%-60%，「靠塞人拉產能」的時代已結束，成長動能完全轉移至**自動化流程**與**精益營運卓越（OpEx）**。

### 2. 人均產值量化指標 (Productivity Metrics)
* **計算公式**：
  	ext{Revenue per Employee} = rac{	ext{總營收 (Revenue)}}{	ext{期末員工總數 (Headcount)}}
  	ext{Gross Profit per Employee} = rac{	ext{毛利 (Gross Profit)}}{	ext{期末員工總數 (Headcount)}}
* **戰略解讀**：將製造廠的數位轉型（如 CPK 自動監控、n8n 流程自動化）直接量化為人均毛利增長，證明精益專案的財務回報。

### 3. 銷售結構不對稱性 (Value-vs-Volume Paradox)
* **核心維度**：
  * **價值維度 (Value %)**：尖端產品（如 EUV）台數極少，卻貢獻 45%+ 的營收，為毛利定海神針。
  * **數量維度 (Volume %)**：量測與成熟機台（M&I / DUV）台數龐大，佔據工廠 90% 的物流與調試負荷。
* **戰略解讀**：工廠必須採取「雙軌精益戰略（Dual-Track Lean）」── 尖端機台主打「首檢即對（First Time Right）」，成熟機台主打「消滅搬運與等待浪費（Muda）」。

### 4. 營運轉型成熟度模型 (Lean Maturity Model)
* **Level 1 (Idling & Reactive)**：資料孤島、被動救火、報表手動填寫。
* **Level 2 (Standardized)**：基礎 5S、標準作業程序 (SOP)、異常追蹤。
* **Level 3 (Accelerating)**：流程數位化、Python/n8n 自動追蹤、跨廠區數據對齊。
* **Level 4 (Predictive & Agile)**：AI 即時良率預測、自動回饋控制、零 Muda。
* **Level 5 (Full Throttle Excellence)**：世界級標竿營運，每日持續改善複利：1.01^{365} = 37.8	imes$。

---

---

## 📑 美股 10-K vs. 外國企業 20-F 年報解析技術機制

在分析跨國半導體與製造巨頭時，不同企業向美國證券交易委員會 (SEC) 提交的年報格式存在顯著的結構性差異：

### 1. 外國私人發行人 (Form 20-F) — 如 ASML (荷蘭)、TSMC (台灣)
* **版面結構特徵**：
  * 通常在**第 5 ~ 15 頁** 就會呈現標準化的 **「Item 3.A. Selected Financial Data（精華財務摘要表）」**。
  * 該表格直接按年份條列 Net Sales、Gross Profit、Headcount、R&D 等核心數據，結構極為集中且標準化。
* **解析器策略**：
  * 解析器讀取前 30~40 頁即可快速高保真命中核心審計數據。

### 2. 美國本土企業 (Form 10-K) — 如 Vishay (VSH)、NVIDIA (NVDA)、Intel
* **版面結構特徵**：
  * 依 SEC 規範，前 30~40 頁為冗長之 **Item 1 (Business)** 與 **Item 1A (Risk Factors 風險因素，通常長達 20~30 頁)**。
  * 真正的核心財務報表 **Item 8 (Consolidated Financial Statements 損益表與資產負債表)** 與管理層討論 **Item 7 (MD&A)** 通常後移至 **第 35 ~ 70 頁**。
  * 10-K 封面印製之「2025 年 2 月申報」代表的是「2024 會計年度 (FY2024)」之實質業績。
* **本系統之強化應對機制**：
  * **智能跨頁與章節定位**：擴大掃描至核心財務章節，確保 10-K 損益表不因前段風險因素而被截斷。
  * **年份與數值過濾防護**：正則引擎嚴格過濾風險因素內文中的歷史年份（如 2020~2026），避免年份誤判為營收金額。
  * **雙軌審計與別名映射 (TICKER_ALIASES)**：支援 `vishay-intertechnology <-> vsh`、`nvidia <-> nvda` 等代碼雙向自動解析。

## 🤖 如何搭配 Gemini / LLM 進行深度戰略產出

當工作流將 PDF 解析為 Markdown 後，您可按照以下步驟在 5 分鐘內生成頂級分析簡報：

1. **開啟 Web 儀表板**，於下方「解析產出 Markdown 檔案瀏覽器」點擊目標檔案（例如 ASML_2025_20-F.md），點選 **「複製 Markdown」**。
2. **打開 Gemini / Claude / ChatGPT**。
3. **複製本專案隨附的 Prompt**：
   - 財務與人均產值全方位分析 ➔ 複製 [ininacial_prompt.md](file:///c:/Users/tu-hs/OneDrive/%E6%96%87%E4%BB%B6/2022_0308_MASA/2022-0708/Projects_antigravity/FINICIAL%20ANNUAL%20REPORT%20DOWNLOAD%20TO%20MD_dashboard/fininacial_prompt.md)
   - 半導體製造細節審計 ➔ 複製 [prompt_Financial Report.md](file:///c:/Users/tu-hs/OneDrive/%E6%96%87%E4%BB%B6/2022_0308_MASA/2022-0708/Projects_antigravity/FINICIAL%20ANNUAL%20REPORT%20DOWNLOAD%20TO%20MD_dashboard/prompt_Financial%20Report.md)
   - 產品線銷售不對稱性分析 ➔ 複製 [sale_breakdown.md](file:///c:/Users/tu-hs/OneDrive/%E6%96%87%E4%BB%B6/2022_0308_MASA/2022-0708/Projects_antigravity/FINICIAL%20ANNUAL%20REPORT%20DOWNLOAD%20TO%20MD_dashboard/sale_breakdown.md)
4. 將剛才複製的 Markdown 內容貼入 Prompt 中的「輸入資料來源」區塊，即可直接獲得：
   - 專業產業評論（Industry Commentary）
   - 16:9 簡報視覺草圖規劃
   - 60 秒高階面試英文口說講稿（Executive Pitch）

---

## ❓ 常見問題與故障排除 (FAQ)

**Q1：下載時出現逾時或連線失敗？**
- 答：crawler.py 已內建 User-Agent 偽裝與 60 秒 Timeout 機制。若目標伺服器連線繁忙，可重試一次或直接將手動下載的 PDF 放置於 data/downloads/{ticker}/ 目錄下，系統會自動辨識並進行 Markdown 轉換。

**Q2：財報頁數太多（如 300 頁），轉換 Markdown 會很久嗎？**
- 答：預設 --max-pages 設定為 40-50 頁（已涵蓋核心財務報表、業務分拆與員工數據章節）。如需全文轉換，可在 CLI 傳入 --max-pages 300 或設為 None。

**Q3：如何新增其他公司的自訂數據或產品分拆？**
- 答：可在 `metrics_extractor.py` 中的 `BUILTIN_BENCHMARKS` 字典內新增該公司的歷年數據與產品分類顏色，系統將自動套用至儀表板。

**Q4：為何部分公司（如 ASML）會包含 2021 年以前（2018 ~ 2020）的歷史數據？**
- 答：
  1. **SEC 法定多年度比較表規範 (3-Year & 5-Year Comparative Rule)**：依據美國證券交易委員會 (SEC) 規範，所有在美上市企業（包含 Form 20-F 外國發行人 ASML/TSMC 與 Form 10-K 美國本土企業），每一份年報內的 `Item 3.A Selected Financial Data` 與財務報表**依法必須同時披露過去 3 至 5 年的完整審計數字**。例如在下載的 `ASML_2021_20-F.pdf` 年報中，第 6~15 頁便已完整包含 2018、2019、2020、2021 年的官方營收、毛利、研發費用、員工總數與 EUV 機台出貨台數。
  2. **Parser 跨年度回溯萃取機制**：系統之 Markdown Parser 在解析單份年報時，會自動捕捉法定比較報表內的歷史數據欄位，因此能自動回溯出 2018 年起的官方真實審計數值。
  3. **跨週期長期營運槓桿分析 (Long-Term OpEx Benchmark)**：為了完整評估半導體景氣循環（從 2018 年 EUV 商業化初期 ➔ 2021 年晶片大缺貨 ➔ 2024 年 High-NA EUV 量產），基準庫收錄了 ASML 2018 ~ 2025 完整 8 年官方數據，確保「圖表 1: The Pivot 人力拐點」具備高度參考價值的跨週期全景。

---

## 📝 最新修復與優化 (Change Log)

- **v1.1.0 (2026-08-24)**：
  - 深度擴充與優化 README.md 說明文件，增補系統架構圖 (Mermaid)、四大人均產值戰略框架、完整 CLI 參數表、圖形化操作指南與 FAQ。
  - 新增 
equirements.txt 依賴管理檔案，簡化環境安裝流程。
  - 優化 Markdown 解析器之表格排版格式，確保與各類大型語言模型 (LLM) 提示詞完美對齊。

- **v1.0.0 (2026-08-24)**：
  - 建立專案 Git 版本控制與標準目錄架構。
  - 完成 AnnualReportCrawler：支援 CompaniesMarketCap 20-F / 10-K / Annual Reports 列表自動抓取與防重試下載機制。
  - 完成 PDFToMarkdownParser：結合 PyMuPDF 與 pdfplumber 進行高保真表格抽取與章節排版。
  - 完成 FinancialMetricsExtractor：內建 ASML 歷史審計基準資料庫與人均產值計算公式。
  - 完成 AnnualReportWorkflow：提供一鍵式「下載 ➔ 轉 MD ➔ 算指標 ➔ 產出 Dashboard」全流程。
  - 完成現代化 Web Dashboard 介面（50/50 戰略對齊視圖、Value-vs-Volume 對比圖、Master KPI 表格與 Markdown 即時預覽器）。

---

## 📜 Git History Log

`
* commit v1.1.0 - docs: expand comprehensive documentation, workflow architecture, usage guides, and requirements
* commit v1.0.0 - feat: initialize financial annual report crawler, pdf-to-markdown parser and strategic OpEx dashboard workflow
`
