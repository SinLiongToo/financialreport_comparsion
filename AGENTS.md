# Project Rules & Autonomous Execution Guidelines

## 🤖 1. Autonomous Company Data Update & Integration Directive (全自動執行規範)

- **Unconditional Autonomous Execution (一律主動執行，無需重複詢問)**:
  Whenever the user requests to add, update, crawl, parse, normalize, or integrate financial reports for any company (e.g. Taiwan TWSE, US SEC 10-K/10-Q, 20-F, European IFRS, Japan Yuho, etc.), **immediately execute the complete end-to-end 7-step pipeline without pausing to ask the user for permission or step-by-step confirmation**.

- **Standard End-to-End Pipeline to Execute**:
  1. Add ticker/slugs to `crawler.py`.
  2. Crawl and download 5-year PDF reports to `data/downloads/{ticker}/`.
  3. Parse PDFs to Markdown in `data/parsed_md/{ticker}/`.
  4. Deduce, normalize to USD $M, and generate both Annual & Quarterly JSON files in `data/metrics/` (`{ticker}_metrics.json` and `{ticker}_metrics_quarterly.json`).
  5. **Chart 6 Mandatory Structure**: Ensure `sales_breakdown.data[year]` is an object containing both `"value": [...]` and `"volume": [...]`.
  6. Register company in `metrics_extractor.py` (`TICKER_ALIASES`, `BUILTIN_BENCHMARKS`, `BUILTIN_BENCHMARKS_QUARTERLY`), `static/js/dashboard.js`, `templates/index.html`, and `app.py`.
  7. Run automated audit `.agents/skills/financial-report-multiformat-analyzer/scripts/validate_company.py <ticker>` to verify 0 errors.
  8. Run `python export_standalone.py` to recompile `docs/index.html` and `standalone_dashboard.html`.

---

## 🔒 2. Strict Workspace Boundary & Data Isolation (嚴格工作區隔離原則)

- **Zero External Touch (絕對不改動專案外任何資料)**:
  All file writes, edits, file deletions, downloads, and command executions MUST strictly stay confined inside the active project directory:
  `c:\Users\tu-hs\OneDrive\文件\2022_0308_MASA\2022-0708\Projects_antigravity\FINICIAL ANNUAL REPORT DOWNLOAD TO MD_dashboard`
- **Forbidden Actions**:
  - Do NOT modify, write, delete, or touch any folders or files in parent directories (`OneDrive\文件\...`, `2022_0308_MASA`, other project directories, desktop, etc.).
  - Temporary files, if needed, must only be placed in `data/` or internal scratch directories.

---

## 🏷️ 3. Mandatory Version & Timestamp Update upon Every Release/Push (每次更新與推送必更版本號及日期)

- **Version & Date Synchronization (版本號與日期嚴格同步)**:
  Whenever adding new companies, fixing features, or preparing to push:
  1. **`templates/index.html`**: Update the version badge (e.g. `v2.2.1`) and the timestamp `Updated: YYYY-MM-DD`.
  2. **`static/js/dashboard.js`**: Update `I18N_DICT.en.header_updated` and `I18N_DICT.zh.header_updated` to match today's date (`Updated: YYYY-MM-DD` / `更新日期: YYYY-MM-DD`).
  3. **`README.md`**: Add the new release section to the top of `## 16. 最新修復與優化 (Change Log)` and append the commit entry to `## 17. Git History Log`.
  4. **Recompile**: Always execute `python export_standalone.py` to bake the updated HTML/JS bundle into `docs/index.html` and `standalone_dashboard.html`.

---

## 🔗 4. Mandatory Canonical Aliases & Deduplication Directives (嚴格別名映射與重複項消除原則)

- **Bi-Directional Alias Synchronization (前後端別名嚴格同步)**:
  Every company slug, exchange ticker, and long-form corporate name (e.g., `advanced-micro-devices` -> `amd`, `taiwan-semiconductor-manufacturing` -> `tsmc`, `mediatek-inc` -> `mediatek`, `mrk-de`/`merck-group`/`emd` -> `merck-kgaa`) MUST be registered simultaneously in BOTH:
  1. **`metrics_extractor.py`**: `TICKER_ALIASES`
  2. **`static/js/dashboard.js`**: `TICKER_CANONICAL_MAP`
- **Zero Duplicate UI Guarantee (保證介面 0 重複項目)**:
  Ensure `loadCompaniesList()` in `dashboard.js` and `get_companies()` in `app.py` resolve all aliases to unique canonical tickers, preventing duplicate company options in `#companySelect` and `#compareCheckboxGrid`.

---

## ⚡ 5. Mobile Anti-Cache & Data Loss Prevention (防快取與打包防覆蓋機制)

- **Anti-Cache Meta Headers**:
  `templates/index.html` must retain anti-cache headers (`Cache-Control: no-cache, no-store, must-revalidate`, `Pragma: no-cache`, `Expires: 0`) to prevent mobile browsers from caching outdated HTML.
- **Empty Object Overwrite Guard**:
  `export_standalone.py` `build_metrics_db()` must never overwrite a valid benchmark dictionary with an empty `{}` dictionary from missing or corrupted JSON files.

---

## 🖼️ 6. Chart 6 Dual-Canvas Zoom & HD PNG Stitching Directive (圖表 6 雙畫布縮放與高清匯出規範)

- **Dual-Canvas Architecture for Asymmetry Analytics**:
  Chart 6 (Value-vs-Volume Sales Breakdown) presents high-value revenue vs. shipment unit mix side-by-side. In Fullscreen Zoom mode, it renders into two distinct Plotly containers (`zoomedCanvasLeft` and `zoomedCanvasRight`).
- **Composite HD PNG Export Engine**:
  - The "Download HD PNG" button must dynamically detect whether `zoomedDualContainer` is active.
  - For dual-canvas mode, capture both panels via `Plotly.toImage({ format: 'png', width: 960, height: 1080 })` with solid background relayout.
  - Stitch both images side-by-side using an off-screen HTML5 `<canvas>` (1920×1080 total) before triggering download.
  - For single-canvas mode (Charts 1–5), standard `Plotly.downloadImage` remains active.
- **Canvas Cleanup Guarantee**:
  Upon closing the zoom modal (`closeZoomModal()`), always purge all Plotly instances (`zoomedChartCanvas`, `zoomedCanvasLeft`, `zoomedCanvasRight`) and clear all dynamic inline style overrides to prevent memory leaks or stale layout artifacts.

---

## 🎨 7. Light-Mode Anti-Glare & High-Legibility Visual Standards (明亮模式防眩光與高可讀性調色盤規範)

- **Strict Anti-Glare Palette (禁止大面積死白眩光)**:
  To prevent eye strain and maintain professional terminal contrast, pure stark whites (`#ffffff`, `#f8fafc`) are prohibited for major container backgrounds in light mode.
- **Standardized Light-Mode Color Palette**:
  - **Body Page Background**: `#d8e0e9` (柔和藍灰底色)
  - **Header & Navigation Bar**: `#e8edf4` (邊框 `#c8d4e0`)
  - **Section Cards & Panels**: `#eaf0f6` (邊框 `#c8d4e0`)
  - **Sub-panels, Inputs, Tables & Modals**: `#dde5ee` (邊框 `#b0bfcf`)
  - **Controls, Buttons & Secondary Badges**: `#d6dfe8` (邊框 `#b0bfcf`)
  - **Primary Text**: `#0f172a` / `#1e293b` (深石板灰，確保 AAA 級對比度)
  - **Secondary Text / Muted Annotations**: `#475569` / `#64748b`
- **Zoom Modal & Plotly Background Synchronization**:
  - Zoom modal inspection windows must dynamically synchronize with `CURRENT_THEME`.
  - In `extractCleanLayout()`, Plotly `paper_bgcolor` and `plot_bgcolor` must always use solid theme-aware colors (`#e8edf4` / `#dde5ee` in light mode, `#0f172a` in dark mode) instead of `"transparent"` to prevent dark-on-dark or washed-out text artifacts.

---

## 🗂️ 8. Strict Annual vs. Quarterly File & Schema Isolation (年報與季報數據結構嚴格隔離規範)

- **File Suffix & Storage Isolation (檔名後綴與儲存嚴格隔離)**:
  - **Annual Metrics (年度財報)**: MUST be saved strictly to `data/metrics/{ticker}_metrics.json`.
    - `freq` field MUST be `"annual"`.
    - `years` array MUST contain strictly 4-digit year strings (e.g. `["2020", "2021", "2022", "2023", "2024", "2025"]`) and NEVER contain any `"Q"` strings.
    - `sales_breakdown.data` keys MUST strictly match the annual `years` array.
  - **Quarterly Metrics (季度財報)**: MUST be saved strictly to `data/metrics/{ticker}_metrics_quarterly.json`.
    - `freq` field MUST be `"quarterly"`.
    - `years` array MUST contain quarterly strings (e.g. `["2023 Q1", "2023 Q2", ...]`).
    - `sales_breakdown.data` keys MUST strictly match the quarterly `years` array.
- **Extractor & Pipeline Overwrite Guard (提取與管線輸出防覆蓋防護)**:
  - In `metrics_extractor.py`, `extract_from_markdown()` and benchmark synchronization scripts MUST dynamically resolve output paths via `suffix = "_metrics_quarterly.json" if freq == "quarterly" else "_metrics.json"`.
  - Generating or updating quarterly data must NEVER overwrite the annual `_metrics.json` file.
- **Automated Validation Requirement (審計腳本必檢項)**:
  - Every pipeline execution must run `validate_company.py <ticker>` which strictly verifies that annual files contain 0 quarterly keys and quarterly files contain valid quarter series.





---

## 🗜️ 9. Collapsible Multi-Company Benchmark Selector & Compact UI Standard (多企業選擇器一鍵收合規範)

- **One-Click Grid Collapse/Expand (`#toggleCompareGridBtn`)**:
  When scaling the corporate catalog beyond 50+ entities, the Multi-Company Peer Benchmark Selection panel MUST provide an instant 1-click toggle button (`#toggleCompareGridBtn`) allowing users to seamlessly collapse/expand the entire filter & company card grid (`#compareGridCollapsibleBody`).
- **Dynamic State & Icon Synchronization**:
  - **Expanded State**: Icon `fa-chevron-up`, label `Collapse Grid` / `一鍵收合`.
  - **Collapsed State**: Icon `fa-chevron-down`, label `Expand Grid` / `一鍵展開`, with subtle amber accent border highlighting that filters are hidden while keeping chart visualizations front and center.
- **Zero-Layout-Shift Guarantee**:
  Collapsing the selector panel must immediately free up screen vertical space for Plots 1–5 and the Peer Benchmark Matrix without triggering chart redraw anomalies or losing user checkbox state.

---

## 💡 10. Industry Strategic Insights & Research Notes Archive Directive (產業戰略洞察與深度研究筆記維護規範)

- **Dedicated Insights Tab Architecture (`#tabInsightsView` / `#insightsViewContainer`)**:
  The dashboard features a 3-way top navigation bar (`Single Deep Dive` | `Peer Comparison` | `Industry Strategic Insights & Notes`).
- **Standardized Research Note Schema**:
  Every archived research note MUST contain:
  1. Category Tagging (`AI_DEFENSE`, `SEMICONDUCTORS`, `HARDWARE`, etc.).
  2. Timestamp and Authoritative Headline.
  3. Quantitative Financial Benchmark Matrix with Rev/FTE, Gross Margin %, and OpEx breakdowns.
  4. Core Structural Drivers & US GAAP / IFRS accounting mechanisms (e.g., Pre-training compute R&D expensing, talent SBC, hardware-to-software defense cycles).
  5. Strategic Transition Roadmap (The Palantir Blueprint & Inflection Point).
- **Interactive Capabilities**:
  - Live category pills filter (`#insightsCategoryPills`).
  - Instant keyword search input (`#insightsSearchInput`).
  - 1-Click Copy Note Markdown (`.copy-single-note-btn`) formatted for instant injection into Gemini / Claude / ChatGPT.

---

## 🖥️ 11. Ultra-Wide Layout Standard & High-Resolution Canvas Directive (`max-w-[1720px]`) (超寬螢幕滿版畫布與響應式雙層導覽列規範)

- **Ultra-Wide High-Resolution Canvas Guarantee (`max-w-[1720px]`)**:
  - **Prohibition of Narrow Containers**: Do NOT use Tailwind's default `max-w-7xl` (1280px) on root wrappers, which causes substantial empty black borders on modern 1080p, 1440p, 4K, and 21:9 Ultrawide monitors and squishes the 6 Plotly charts and KPI cards.
  - **Standardized Root Width**: All main layout containers (`<header>`, navigation tabs bar, `<main>` content container, and modal inspection views) MUST strictly use `max-w-[1720px] w-full mx-auto px-3 sm:px-6 lg:px-8`.
- **Dual-Tier Spacious Header Hierarchy (雙層舒展導覽列架構)**:
  - **Row 1 (Branding, Subtitle & Status Badges)**:
    - **Left**: Chart Icon + Main Title `Financial & OpEx Strategic Dashboard` + Subtitle (`Annual Reports Crawler ➔ Markdown Parser ➔ Productivity Alignment`).
    - **Right**: Status Badges (`One-Click Workflow`, `vX.X.X`, `Updated: YYYY-MM-DD`, `Masa Tu` LinkedIn) with `whitespace-nowrap` to guarantee badges remain on a single line and never vertically collapse.
  - **Row 2 (Financial Wisdom Quotes & Action Controls Bar)**:
    - **Left**: Financial Wisdom Quotes Marquee (`#financeQuotesMarqueeContainer` with `flex-1 min-w-[280px]`) expanding across all available horizontal space so long quotes (Buffett, Munger, Huang, Chang, Graham) are fully readable without truncation.
    - **Right**: Action Controls Bar (`[Annual (10-K) | Quarterly (10-Q)]`, `[Theme Toggle]`, `[User Guide & Help]`, `[Language Toggle]`, `[#companySelect]`, `[Reload]`).
- **Cross-Screen Responsiveness & Landscape Marquee Preservation**:
  - The marquee (`#financeQuotesMarqueeContainer`) MUST remain visible across desktop, mobile portrait, and shallow landscape (`orientation: landscape`) orientations with compact single-line styling.
