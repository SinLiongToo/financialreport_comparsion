---
name: financial-report-multiformat-analyzer
description: >-
  Systematically analyzes, extracts, normalizes, and audits corporate financial reports across multiple filing formats (SEC 10-K, 10-Q, 20-F, 6-K, Taiwan TWSE annual reports, Japan Yuho, IFRS/US GAAP), currencies (USD, TWD, EUR, JPY, KRW, GBP), scales (thousands, millions, billions), reporting frequencies (Annual vs. Quarterly with linear headcount interpolation), and calculates strategic productivity indices (Rev/GP/OI per FTE, Gross Margin %, Operating Margin %, R&D Reinvestment %, The Pivot inflection point, Value-vs-volume Paradox, Country / Regional tagging, and 5-Stage Lean Maturity rating).
---

# Multi-Format Corporate Financial & OpEx Strategic Analyzer

## 1. Overview & Scope

This skill equips the agent to systematically process, deduce, normalize, and audit complex multi-national corporate financial filings for semiconductors, high-tech conglomerates, IP licensing houses, and electronic hardware manufacturers.

### Supported Filing Types & Accounting Regimes:
- **US Domestic SEC Filings**: Form 10-K (Annual), Form 10-Q (Quarterly) under US GAAP (e.g. NVIDIA, Apple, Alphabet, AMD, TTM Technologies, Palantir).
- **Foreign Private Issuer (FPI) SEC Filings**: Form 20-F (Annual), Form 6-K (Interim/Quarterly) under US GAAP or IFRS (e.g. ASML, TSMC, Arm Holdings).
- **European & International IFRS Annual Reports**: Standalone annual financial reports under IFRS/IAS (e.g. Infineon Technologies AG, fiscal year ending Sept 30).
- **Taiwan (TWSE) Annual Reports**: 五年度財務狀況與獲利能力分析表 (e.g. MediaTek 2454, Hon Hai / Foxconn 2317, TSMC 2330, Delta 2308, UMC 2303).
- **Asian Market Filings**: Japan Yuho (有価証券報告書 e.g. Advantest 6857), Korea DART (Samsung 005930).

---

## 2. Filing Formats & Deep Extraction Rules

### A. Form 10-K (US Domestic Annual)
- **Headcount**: Look in **Item 1 (Business - Human Capital / Employees)** or **Item 6**. Headcount is often embedded in natural language prose (e.g., *"As of Dec 31, 2024, we employed approximately 18,200 full-time employees..."*) and requires LLM extraction.
- **Financial Statements**: Located in **Item 8 (Consolidated Financial Statements and Supplementary Data)**.
- **Cost of Revenues Deduction**: For companies that do not report Gross Profit explicitly (e.g. Alphabet, Meta), deduce $\text{Gross Profit} = \text{Revenues} - \text{Cost of revenues}$.
- **Fiscal Calendar Variations**: Note 52-53 week fiscal calendars (e.g. TTM Technologies, Apple, Micron) where fiscal year-ends may fall on late December, September, or August dates.

### B. Form 10-Q (US Domestic Quarterly)
- **Interim Statements**: Unaudited statements for Q1, Q2, Q3.
- **Headcount Linear Interpolation Rule**: Under SEC Rule 13a-13, quarterly headcount disclosure is optional. Anchor to official audited 10-K numbers ($\text{HC}_{t-1}$ and $\text{HC}_t$) and apply linear interpolation:
  $$\text{HC}_{Q1} = \text{HC}_{t-1} + 0.25 \times (\text{HC}_t - \text{HC}_{t-1})$$
  $$\text{HC}_{Q2} = \text{HC}_{t-1} + 0.50 \times (\text{HC}_t - \text{HC}_{t-1})$$
  $$\text{HC}_{Q3} = \text{HC}_{t-1} + 0.75 \times (\text{HC}_t - \text{HC}_{t-1})$$
  $$\text{HC}_{Q4} = \text{HC}_t$$

### C. Form 20-F (Foreign Private Issuer Annual - ASML, TSMC, ARM)
- **Summary Tables**: Item 3.A (Selected Financial Data, 5-year history).
- **Headcount**: Item 6.D (Employees - mandatory functional breakdown, e.g. R&D vs SG&A vs Manufacturing).
- **Statements**: Item 18 (Full Financial Statements with IFRS / US GAAP reconciliations).
- **Fiscal Year Shift**: ARM Holdings fiscal year ends on **March 31** (e.g. FY2026 runs from April 1, 2025 to March 31, 2026).

### D. European Standalone IFRS Annual Reports (Infineon Technologies)
- **Reporting Period**: German/European fiscal calendars (e.g. Infineon fiscal year runs from October 1 to September 30).
- **Operating Income Metric**: In European filings, track *Segment Result* or *Operating Income* before financial results and income taxes.
- **Conversion to USD**: Convert reported EUR figures to USD using historical average exchange rates.

### E. Taiwan TWSE Annual Reports (MediaTek 2454, Hon Hai 2317, TSMC 2330, Delta 2308, UMC 2303)
- **Summary Section**: Page 5–10 *"財務狀況與經營成果 / 獲利能力分析表"*.
- **Employee Statistics Section**: Section V / VI *"從業員工資訊"* (Management, R&D, Sales, Manufacturing, Degree breakdown, Average Service Years).
- **Currency & Scale**: Typically reported in `NTD Thousands (新台幣千元)` or `NTD Millions (新台幣百萬元)`.
- **Global Group vs Parent Headcount**: Distinguish between parent Taiwan entity and global consolidated workforce.

---

## 3. Currency Normalization & Scale Standardization

All metrics in this project are standardized into **USD Millions ($M)** to guarantee cross-company, cross-border comparability.

### Exchange Rate Conversion Standards:
| Currency | Normalization Code | Historical USD Benchmark Rates |
| :--- | :--- | :--- |
| **USD ($)** | `USD (Millions)` | 1.00 |
| **TWD (NT$)** | `USD (Millions)` | 2020: 29.50, 2021: 28.00, 2022: 29.80, 2023: 31.10, 2024: 32.00, 2025: 32.00 |
| **EUR (€)** | `USD (Millions)` | 2020: 1.14, 2021: 1.18, 2022: 1.05, 2023: 1.08, 2024: 1.08, 2025: 1.08 |
| **JPY (¥)** | `USD (Millions)` | 2020: 106.8, 2021: 109.8, 2022: 131.5, 2023: 140.5, 2024: 151.0, 2025: 150.0 |
| **KRW (₩)** | `USD (Millions)` | 2020: 1180, 2021: 1145, 2022: 1290, 2023: 1305, 2024: 1360, 2025: 1350 |
| **GBP (£)** | `USD (Millions)` | 2020: 1.28, 2021: 1.38, 2022: 1.24, 2023: 1.25, 2024: 1.28, 2025: 1.30 |

### Scale Sanitization:
- **In Thousands (`in thousands`)**: Multiply by $10^{-3}$ to convert to $M (e.g. Palantir 10-K).
- **In Millions (`in millions`)**: Multiply by $1.0$.
- **In Billions (`in billions / in trillions`)**: Multiply by $10^3$ or $10^6$.

---

## 4. Strategic Indices & Productivity Calculations

### A. Human Capital Productivity Trio ($/FTE)
$$\text{Revenue per FTE} = \frac{\text{Revenue (\$M)} \times 10^6}{\text{Headcount}}$$
$$\text{Gross Profit per FTE} = \frac{\text{Gross Profit (\$M)} \times 10^6}{\text{Headcount}}$$
$$\text{Operating Income per FTE} = \frac{\text{Operating Income (\$M)} \times 10^6}{\text{Headcount}}$$

### B. The Pivot (人力與毛利率黃金拐點)
- Identify the calendar year where total headcount growth flattens into a plateau ($\Delta \% \text{HC} \le 3\%$) while gross margin continues expanding ($\Delta \text{GM} > 0$) through automated optical inspection (AOI), fabless chip co-design, and IP operational leverage.

### C. Operating Leverage & R&D Intensity
$$\text{Operating Margin \%} = \frac{\text{Operating Income}}{\text{Revenue}} \times 100\%$$
$$\text{R&D Intensity \%} = \frac{\text{R&D Expense}}{\text{Revenue}} \times 100\%$$
$$\text{Operating Leverage Coefficient} = \frac{\Delta \% \text{Operating Income}}{\Delta \% \text{Revenue}}$$

### D. Country & Regional Tagging
- Maintain canonical country metadata with regional flags for cross-company comparison (e.g. `United States 🇺🇸`, `Taiwan 🇹🇼`, `Netherlands 🇳🇱`, `United Kingdom 🇬🇧`, `Germany 🇩🇪`, `Japan 🇯🇵`, `South Korea 🇰🇷`).

### E. 5-Stage Lean Maturity Rating:
- **Level 1 (Reactive)**: High labor assembly, manual scheduling, razor-thin margin.
- **Level 2 (Standardized)**: Global multi-site footprint with baseline SOPs.
- **Level 3 (Automated)**: Lighthouse factories with automated robotics & AMHS (e.g. TTM Technologies automated HDI/AOI).
- **Level 4 (Predictive / Co-Design)**: AI-driven parameter self-tuning, advanced IP subsystems, SiC/GaN 300mm smart power platforms, Agentic AI SoC co-design (e.g. ARM CSS, MediaTek Dimensity 9400, Infineon SiC Fab).
- **Level 5 (World-Class / Cognitive)**: Fully cognitive digital twin manufacturing platform driving compounding velocity $(1.01)^{365} = 37.8x$ (e.g. TSMC GigaFab).

---

## 5. Output JSON Schema Specification (MANDATORY STRUCTURE)

When generating or auditing `data/metrics/{ticker}_metrics.json` and `data/metrics/{ticker}_metrics_quarterly.json`:

> [!IMPORTANT]
> **Chart 6 (Value vs. Volume Dual Panel) Rule**:
> `sales_breakdown.data[year]` **MUST** be an object containing **BOTH** `"value": [...]` and `"volume": [...]` arrays matching the exact length and order of `"categories"`. Direct array values will cause Chart 6 rendering failure in the frontend!

```json
{
  "company_name": "MediaTek Inc. (2454.TW / 聯發科技)",
  "ticker": "MEDIATEK",
  "country": { "en": "Taiwan 🇹🇼", "zh": "台灣 🇹🇼", "code": "TW" },
  "currency": "USD (Millions)",
  "unit": "$M",
  "freq": "annual",
  "years": ["2020", "2021", "2022", "2023", "2024", "2025"],
  "financials": {
    "2024": {
      "revenue": 16580.8,
      "cogs": 8350.0,
      "gross_profit": 8230.8,
      "gross_margin": 49.64,
      "operating_income": 3200.4,
      "operating_margin": 19.30,
      "net_income": 3348.2,
      "net_margin": 20.19,
      "rd_expense": 4124.8,
      "rd_pct_rev": 24.88,
      "headcount": 22397,
      "rev_per_emp": 740313.0,
      "gp_per_emp": 367496.0,
      "op_per_emp": 142894.0,
      "ni_per_emp": 149493.0,
      "rd_per_emp": 184168.0,
      "rev_growth_yoy": 18.97,
      "gp_growth_yoy": 23.44,
      "op_growth_yoy": 38.62,
      "ni_growth_yoy": 34.90,
      "rd_growth_yoy": 15.17,
      "hc_growth_yoy": 1.80,
      "gm_diff_pp": 1.80,
      "op_diff_pp": 2.74
    }
  },
  "sales_breakdown": {
    "units": "$M",
    "categories": [
      "Mobile Phone SoCs (Dimensity 5G/4G)",
      "Smart Edge Platforms (Wi-Fi 7/Auto/TV/IoT)",
      "Power IC (PMIC & Analog)"
    ],
    "colors": ["#0284C7", "#10B981", "#F59E0B"],
    "data": {
      "2024": {
        "value": [8954, 6466, 1161],
        "volume": [54, 39, 7]
      }
    }
  },
  "insights": {
    "the_pivot": { "en": "...", "zh": "..." },
    "productivity": { "en": "...", "zh": "..." },
    "value_vs_volume": { "en": "...", "zh": "..." }
  },
  "lean_maturity": {
    "rating": "Level 4 (Agentic AI SoC & Heterogeneous Architecture Co-Design)",
    "description": "...",
    "ladder": [
      { "level": 1, "name": "...", "desc": "..." }
    ]
  }
}
```

---

## 6. End-to-End Standard 7-Step Integration Workflow

Whenever adding or updating any company, execute the following 7 steps without omission:

### Step 1: Crawler Slugs & Download
1. Add ticker and common aliases (e.g. `2454`, `mediatek`, `mtk`) to `TICKER_SLUGS` in [`crawler.py`](file:///c:/Users/tu-hs/OneDrive/文件/2022_0308_MASA/2022-0708/Projects_antigravity/FINICIAL%20ANNUAL%20REPORT%20DOWNLOAD%20TO%20MD_dashboard/crawler.py).
2. Download the last 5 years of annual report PDFs into `data/downloads/{ticker}/`.

### Step 2: Parse to Markdown
1. Parse PDFs to Markdown with `PDFToMarkdownParser` into `data/parsed_md/{ticker}/`.

### Step 3: Deduce & Extract Audited Metrics
1. Extract Consolidated Income Statements, R&D expenses, Headcount, and Product Segments.
2. Standardize all currencies to **USD Millions ($M)** using official benchmark exchange rates.
3. Compute Productivity indices (Rev/FTE, GP/FTE, OI/FTE, YoY growth).

### Step 4: Write Metric JSONs (Strict Annual vs Quarterly Isolation)
1. **Annual Metrics File (`data/metrics/{ticker}_metrics.json`)**:
   - `freq` MUST be `"annual"`.
   - `years` MUST contain strictly 4-digit years (e.g. `["2020", "2021", "2022", "2023", "2024", "2025"]`), **NEVER containing any `"Q"` strings**.
   - `sales_breakdown.data` keys MUST strictly match annual years (`"2020"`, `"2021"`, etc.).
   - Mirror to all alias files (e.g. `2454_metrics.json`).
2. **Quarterly Metrics File (`data/metrics/{ticker}_metrics_quarterly.json`)**:
   - `freq` MUST be `"quarterly"`.
   - `years` MUST contain 12-period quarter strings (e.g. `["2023 Q1", "2023 Q2", ... "2025 Q4"]`).
   - `sales_breakdown.data` keys MUST strictly match quarter strings (`"2023 Q1"`, etc.).
   - Mirror to all alias files (e.g. `2454_metrics_quarterly.json`).
3. **Strictly verify Chart 6 schema**: `sales_breakdown.data[period]` MUST contain `{"value": [...], "volume": [...]}`.
4. **File Suffix Guard**: When generating quarterly data in Python, always resolve `suffix = "_metrics_quarterly.json" if freq == "quarterly" else "_metrics.json"` so quarterly extraction never overwrites annual files!

### Step 5: Update Backend & Frontend Codebase
1. **`metrics_extractor.py`**:
   - Add all ticker variations, exchange codes, and long-form corporate names to `TICKER_ALIASES` (e.g. `advanced-micro-devices` -> `amd`, `taiwan-semiconductor-manufacturing` -> `tsmc`).
   - Add company dictionary to `BUILTIN_BENCHMARKS` (strictly Annual data).
   - Add company dictionary to `BUILTIN_BENCHMARKS_QUARTERLY` (strictly Quarterly data).
2. **`static/js/dashboard.js`**:
   - Add dedicated color to `COMPANY_COLORS`.
   - Add country metadata to `COMPANY_COUNTRIES`.
   - Add all aliases to `TICKER_CANONICAL_MAP` (strictly synchronized with Python `TICKER_ALIASES` to prevent duplicate UI items).
   - Add ticker to `setupTargetInputQuickSwitcher`.
   - Add ticker to `orderedPriority` and `friendlyNames`.
3. **`templates/index.html`**:
   - Add option to `<select id="companySelect">`.
   - Ensure anti-cache meta headers remain active in `<head>`.
4. **`app.py`**:
   - Add ticker to `ordered_priority` in `get_companies()`.
5. **`export_standalone.py`**:
   - Add ticker to synthetic overview list in `build_markdown_db()`.
   - Ensure `build_metrics_db()` enforces non-empty data validation.

### Step 6: Automated Sanity & Validation Audit
Run the automated verification script across all benchmarks:
```bash
python .agents/skills/financial-report-multiformat-analyzer/scripts/validate_company.py <ticker>
python .agents/skills/financial-report-multiformat-analyzer/scripts/validate_company.py all
```
Ensure it returns: `✅ PASSED: All metrics, Chart 6 structures, and aliases are valid` (verifying 0 quarterly contamination in annual files and 0 annual contamination in quarterly files).

### Step 7: Compile Standalone Dashboard & Commit
1. Run `python export_standalone.py` to recompile `docs/index.html` and `standalone_dashboard.html`.
2. Update version badge and timestamp in `templates/index.html` and `dashboard.js`.
3. Update `README.md` (Change Log and Git History).

---

## 7. Chart 6 Dual-Canvas Zoom & Composite HD PNG Stitching Engine

When user triggers Fullscreen Zoom on Chart 6:
1. **Dual Plotly Layout**: Renders `zoomedCanvasLeft` (Revenue Value Stacked $M) and `zoomedCanvasRight` (Shipment Volume & Mix %).
2. **Composite HD PNG Stitching**:
   - `Plotly.toImage` renders each canvas at 960×1080 with solid background relayout.
   - An off-screen HTML5 `<canvas>` (1920×1080) stitches the left and right panels side-by-side.
   - Triggers browser file download (`<a download>`) for unified HD capture.
3. **Purge & Style Reset**:
   - On `closeZoomModal()`, purge `zoomedChartCanvas`, `zoomedCanvasLeft`, and `zoomedCanvasRight`.
   - Clear all dynamic inline styles to avoid lingering theme artifacts.

---

## 8. Light-Mode Anti-Glare & High-Legibility Visual Standards

1. **Anti-Glare Palette Shift**:
   - Surface backgrounds must avoid stark `#ffffff` or `#f8fafc` glare.
   - Standard palette: Body `#d8e0e9`, Header `#e8edf4`, Cards `#eaf0f6`, Sub-panels/Tables `#dde5ee`, Buttons `#d6dfe8`, Borders `#c8d4e0`/`#b0bfcf`.
2. **Plotly Solid Background Requirement**:
   - `extractCleanLayout()` must apply solid theme-aware backgrounds (`plotBg`: `#dde5ee`, `paperBg`: `#e8edf4` in Light mode; `#0f172a` in Dark mode) rather than `"transparent"` to preserve axis and label contrast.


---

## 6. Frontier AI & Defense Systems (Military AI) Analytics Standard

### A. Frontier AI Foundation Model Economics (Anthropic, OpenAI / ChatGPT)
- **High Gross Margin vs. Depressed Operating Margin Financial Paradox**:
  - **Gross Margin (55%–85%)**: COGS only comprises runtime token inference, API delivery bandwidth, and customer cloud hosting.
  - **Operating Deficit (-114% to -4%)**: Under US GAAP, multi-billion-dollar pre-training compute cluster runs (H100/B200 GPU farms) are categorized as exploratory R&D and MUST be expensed immediately in current-period OpEx (not capitalized on the balance sheet).
  - **Talent Compensation**: Frontier research scientists and kernel engineers command \$1M–\$3M+ packages in salary and stock-based compensation (SBC).

### B. Defense & Military AI Systems (Shield AI, Anduril, Ondas, Palantir)
- **Long Hardware Prototyping to DoD Production Scaling Cycle**:
  - Companies like Anduril (Roadrunner, Fury) and Shield AI (V-BAT, Hivemind) self-fund initial hardware prototyping and airframe testing.
  - As software licensing (Lattice OS, Hivemind) scales into DoD Programs of Record (PoR), operating margins rapidly compress their deficits (-70% $ightarrow$ -4.1% in 2025).
  - **Dual-Sector Multi-Token Matching**: Classified under both `MILITARY` and `HYPERSCALE` sectors to support dual-view cross-comparison.

---

## 7. Collapsible Selector UX & Strategic Insights Repository Standard

1. **Collapsible Multi-Entity Selector (`#compareGridCollapsibleBody`)**:
   - Offers 1-click collapse (`#toggleCompareGridBtn`) to conceal the 52-company card matrix and focus user view on comparative charts and tables.
2. **Industry Strategic Insights & Notes Archive (`#insightsViewContainer`)**:
   - Archives qualitative and quantitative findings with live keyword search and 1-click Markdown copying for LLMs.
