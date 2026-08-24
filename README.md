# 企業年度財報下載、PDF 轉 Markdown 與營運卓越 (OpEx) 戰略儀表板

本專案是一套模組化、**一步到位 (One-Click, End-to-End)** 的企業年度財務報告自動化工作流系統。專為半導體與高科技產業分析、營運卓越（OpEx）主管及財務戰略評估打造。

---

## 🌟 核心功能特色

1. **智能爬蟲與下載器 (`crawler.py`)**：
   - 支援 CompaniesMarketCap 網址（如 `https://companiesmarketcap.com/asml/annual-reports-20f/`）或股票代碼（如 `ASML`, `TSMC`, `NVDA`, `NXP`）。
   - 自動抓取歷史 20-F、10-K 或年度報告 PDF 列表。
   - 使用者可自訂下載年數 $N$（如近 3 年、5 年、8 年、10 年）。
   
2. **PDF 轉 Markdown 結構化解析器 (`pdf_parser.py`)**：
   - 採用 `fitz (PyMuPDF)` 與 `pdfplumber` 雙引擎。
   - 保留章節層級（Header H1-H4）、正文段落，並將財務報表表格完整轉為 GitHub Markdown Table 格式。
   - 產出檔案儲存於 `data/parsed_md/{ticker}/`，方便直接提供給大型語言模型（LLM）深入提問。

3. **財務與人均產值指標抽取引擎 (`metrics_extractor.py`)**：
   - 自動提取並計算：
     - **基礎財務**：Revenue, Gross Profit, Gross Margin %, Operating Income, Net Income, R&D Expense.
     - **人力與人均產值 (The Pivot)**：Total Headcount, Revenue per Employee, Gross Profit per Employee.
     - **銷售結構不對稱性 (Value-vs-Volume)**：尖端產品（EUV）、主力產品（ArFi）、成熟產品（Other DUV）與檢測設備（M&I）之金額與出貨台數堆疊對比。
     - **精益營運成熟度模型 (Lean Maturity Model)**：Level 1 到 Level 5 評級。

4. **互動式 Web 戰略儀表板 (`app.py` / `templates/index.html`)**：
   - **50/50 戰略對齊版面**：左側展示「人力高原與毛利率走勢」，右側展示「人均產值提升曲線」。
   - **銷售結構雙面板圖表**：金額佔比 vs. 實體台數佔比。
   - **Master 綜合數據表**：包含 YoY 增長率與利潤率。
   - **線上 Markdown 預覽器**：在瀏覽器中直接預覽與複製已解析的 Markdown 內容。

---

## 📁 專案目錄結構

```
FINICIAL ANNUAL REPORT DOWNLOAD TO MD_dashboard/
├── crawler.py           # 爬蟲模組：爬取 companiesmarketcap 財報列表並下載 PDF
├── pdf_parser.py        # 解析模組：將 PDF 轉為結構化 Markdown (包含表格排版)
├── metrics_extractor.py # 指標模組：自 MD 提取財務數據、人均產值與產品分拆
├── workflow.py          # 工作流模組：串接爬蟲、解析、指標提取之一步到位核心
├── app.py               # Web 伺服器：Flask 後端 REST API
├── main.py              # CLI 入口與快速啟動腳本
├── templates/
│   └── index.html       # 戰略儀表板前端頁面 (Plotly + TailwindCSS)
├── static/
│   ├── css/style.css    # 樣式表
│   └── js/dashboard.js  # Plotly 互動圖表與非同步工作流邏輯
├── data/
│   ├── downloads/       # 下載的原始 PDF 存放區
│   ├── parsed_md/       # 轉換後的 Markdown 檔案
│   └── metrics/         # 結構化 JSON 指標數據
├── fininacial_prompt.md # 財務與營運卓越萬用分析 Prompt
├── prompt_Financial Report.md # 深度半導體財報審計 Prompt
└── sale_breakdown.md    # 銷售結構不對稱性分析 Prompt
```

---

## 🚀 快速開始 (Quick Start)

### 1. 安裝必要依賴套件

```bash
pip install flask pymupdf pdfplumber beautifulsoup4 pandas
```

### 2. 一鍵啟動 Web 儀表板

```bash
python main.py --serve
```
開啟瀏覽器訪問 `http://127.0.0.1:5000` 即可使用圖形化介面執行一步到位工作流！

### 3. 命令列 (CLI) 操作方式

- **下載並解析 ASML 近 5 年財報**：
  ```bash
  python main.py --ticker https://companiesmarketcap.com/asml/annual-reports-20f/ --years 5
  ```
- **下載並解析指定公司代碼 (例如 TSMC / NVDA / NXP)**：
  ```bash
  python main.py --ticker tsmc --years 3
  ```

---

## 📝 最新修復與優化 (Change Log)

- **v1.0.0 (2026-08-24)**：
  - 建立專案 Git 版本控制與標準目錄架構。
  - 完成 `AnnualReportCrawler`：支援 CompaniesMarketCap 20-F / 10-K / Annual Reports 列表自動抓取與防重試下載機制。
  - 完成 `PDFToMarkdownParser`：結合 PyMuPDF 與 pdfplumber 進行高保真表格抽取與章節排版。
  - 完成 `FinancialMetricsExtractor`：內建 ASML 歷史審計基準資料庫與人均產值計算公式。
  - 完成 `AnnualReportWorkflow`：提供一鍵式「下載 ➔ 轉 MD ➔ 算指標 ➔ 產出 Dashboard」全流程。
  - 完成現代化 Web Dashboard 介面（50/50 戰略對齊視圖、Value-vs-Volume 對比圖、Master KPI 表格與 Markdown 即時預覽器）。

---

## 📜 Git History Log

```
* commit v1.0.0 - feat: initialize financial annual report crawler, pdf-to-markdown parser and strategic OpEx dashboard workflow
```
