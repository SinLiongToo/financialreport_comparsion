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
- **Taiwan (TWSE) Annual Reports**: 五年度財務狀況與獲利能力分析表 (e.g. Hon Hai / Foxconn 2317, TSMC 2330, Delta 2308, UMC 2303).
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

### E. Taiwan TWSE Annual Reports (Hon Hai 2317, TSMC 2330, Delta 2308, UMC 2303)
- **Summary Section**: Page 5–10 *"財務資料及獲利能力分析表"*.
- **Currency & Scale**: Typically reported in `NTD Millions (新台幣百萬元)`.
- **Global Group vs Parent Headcount**: Distinguish between parent Taiwan entity and global consolidated workforce (e.g. Foxconn consolidated 650k–850k FTEs vs. Taiwan parent ~4k FTEs).

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
- Identify the calendar year where total headcount growth flattens into a plateau ($\Delta \% \text{HC} \le 3\%$) while gross margin continues expanding ($\Delta \text{GM} > 0$) through lights-out factory automation, automated optical inspection (AOI), and IP operational leverage.

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
- **Level 4 (Predictive / Co-Design)**: AI-driven parameter self-tuning, advanced IP subsystems, SiC/GaN 300mm smart power platforms (e.g. ARM CSS, Infineon SiC Fab).
- **Level 5 (World-Class / Cognitive)**: Fully cognitive digital twin manufacturing platform driving compounding velocity $(1.01)^{365} = 37.8x$ (e.g. TSMC GigaFab).

---

## 5. Output JSON Schema Specification

When generating or auditing `data/metrics/{ticker}_metrics.json`:
```json
{
  "company_name": "Arm Holdings plc",
  "ticker": "ARM",
  "country": { "en": "United Kingdom 🇬🇧", "zh": "英國 🇬🇧", "code": "UK" },
  "currency": "USD",
  "unit": "$M",
  "years": [2021, 2022, 2023, 2024, 2025, 2026],
  "financials": {
    "2026": {
      "revenue": 4920.0,
      "cogs": 196.8,
      "gross_profit": 4723.2,
      "gross_margin": 96.0,
      "operating_income": 1640.0,
      "operating_margin": 33.33,
      "rd_expense": 1980.0,
      "rd_pct_rev": 40.24,
      "headcount": 9584,
      "rev_per_emp": 513356,
      "gp_per_emp": 492821,
      "op_per_emp": 171119
    }
  },
  "sales_breakdown": {
    "units": "$M",
    "categories": ["Royalty Revenue", "License & Other Revenue"],
    "data": { }
  },
  "insights": {
    "the_pivot": { "en": "...", "zh": "..." },
    "productivity": { "en": "...", "zh": "..." },
    "value_vs_volume": { "en": "...", "zh": "..." }
  },
  "lean_maturity": {
    "rating": "Level 4 (Compute Subsystem CSS Co-Design)",
    "description": "..."
  }
}
```

---

## 6. Step-by-Step Execution Checklist for New Companies

1. **Step 1 - Scrape & Download**: Fetch PDF annual/quarterly reports into `data/downloads/{ticker}/`.
2. **Step 2 - Parse to MD**: Convert tables to Markdown with `pdfplumber` into `data/parsed_md/{ticker}/`.
3. **Step 3 - Deduce & Normalize**:
   - Detect accounting anomalies (e.g. Google/Meta `Cost of revenues` $\rightarrow$ derive Gross Profit).
   - Extract headcount from Item 1/6 prose and assign canonical country metadata.
   - Convert foreign currency to USD $M.
4. **Step 4 - Update Codebase**:
   - Write `data/metrics/{ticker}_metrics.json` and `data/metrics/{ticker}_metrics_quarterly.json`.
   - Update `TICKER_ALIASES`, `BUILTIN_BENCHMARKS`, and `BUILTIN_BENCHMARKS_QUARTERLY` in `metrics_extractor.py`.
   - Add ticker to `app.py`, `COMPANY_COLORS`, `COMPANY_COUNTRIES`, and dropdown mappings in `static/js/dashboard.js`.
5. **Step 5 - Compile & Deploy**:
   - Run `python export_standalone.py` to recompile `docs/index.html` and `standalone_dashboard.html`.
   - Update `README.md` and commit to Git.
