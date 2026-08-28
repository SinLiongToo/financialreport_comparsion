---
name: financial-report-multiformat-analyzer
description: >-
  Systematically analyzes, extracts, normalizes, and audits corporate financial reports across multiple filing formats (SEC 10-K, 10-Q, 20-F, 6-K, Taiwan TWSE annual reports, Japan Yuho, IFRS/US GAAP), currencies (USD, TWD, EUR, JTY, KRW), scales (thousands, millions, billions), reporting frequencies (Annual vs. Quarterly with linear headcount interpolation), and calculates strategic productivity indices (Rev/GP/OI per FTE, Gross Margin %, Operating Margin %, R&D Reinvestment %, The Pivot inflection point, Value-vs-volume Paradox, and 5-Stage Lean Maturity rating).
---

# Multi-Format Corporate Financial & OpEx Strategic Analyzer

## 1. Overview & Scope

This skill equips the agent to process, deduce, normalize, and audit complex multi-national corporate financial filings for semiconductors, high-tech conglomerates, and hardware manufacturers.

### Supported Filing Types & Accounting Regimes:
- **US Domestic SEC Filings**: Form 10-K (Annual), Form 10-Q (Quarterly).
- **Foreign Private Issuer (FPI) SEC Filings**: Form 20-F (Annual), Form 6-K / Form 10-F (Interim/Quarterly).
- **Taiwan (TWSE) Annual Reports**: 五应度封螣況與M��利力分抐表 (e.g., Hon Hai / Foxconn 2317, TSMC 2330).
- **International / Asian Filings**: Japan Yuho (有価诀券岁呃롺 e.g. Advantest 6857), Korea DART (Samsung 005930), Europe IFRS filings.

---

## 2. Filing Formats & Deep Extraction Rules

3## A. Form 10-K (US Domestic Annual)
- **Headcount**: Look in **Item 1 (Business - Human Capital)** or **Item 6**. Note that headcount is often in natural language prose (e.g. "\"As of Dec 31, 2024, we employed approximately 181,269 full-time employees...\") and needs LLM parsing.
- **Financial Statements**: Located in **Item 8** (typically pages 40–75).
- **Segment Information**: Located in **Note to Consolidated Financial Statements - Segment Reporting**.

### B. Form 10-Q (US Domestic Quarterly)
- **Interim Statements**: Unaudited statements for Q1, Q2, Q3.
- **Headcount Linear Interpolation Rule**: Under SEC Rule 13a-13, quarterly headcount disclosure is optional and rarely given. Anchor to official audited 10-K numbers ($\ntext{HC}_{t-1}$ and $\ntext{HC}_t$) and interpolate smoothly:
  $$,\ntext{HC}_{Q1} = \ntext{HC}_{t-1} + 0.25 \times (\ntext{HC}_t - \ntext{HC}_{t-1})$$
  $$\ntext{HC}_{Q2} = \ntext{HC}_{t-1} + 0.50 \times (\ntext{HC}_t - \ntext{HC}_{t-1})$$
  $$\ntext{HC}_{Q3} = \ntext{HC}_{t-1} + 0.75 \times (\ntext{HC}_t - \ntext{HC}_{t-1})$$
  $$\ntext{HC}_{Q4} = \ntext{HC}_t$%

### C. Form 20-F (Foreign Private Issuer Annual - ASML, TSMC)
- **Summary Tables**: Item 3.A (Selected Financial Data, 5-year history on pages 5–15).
- **Headcount**: Item 6.D (Employees - mandatory breakdown by function and region).
- **Statements**: Item 18 (Full IFRS/US GAAP Financial Statements).

### D. Taiwan TWSE Annual Reports (Hon Hai 2317, TSMC 2330)
- **Summary Section**: Page 5–10 *\"Analysis of financial data and profitability / 財務資料及獲利能力分析\*".
- **Currency & Scale**: Typically reported in `NTD million (新台鹳百蘣元)`.
- **Global Group vs Parent Headcount**: Distinguish between parent Taiwan entity (~4,000 employees) and global group consolidated workforce (~650,000–850,000 FTEs across Foxconn worldwide facilities).

---

## 3. Currency Normalization & Scale Standardization

All metrics in this project are standardized into **USD Millions ($M)** to guarantee cross-company, cross-border comparability.

### Exchange Rate Conversion Standards:
| Currency | Normalization Code | Historical USD Benchmark Rates |
| :--- | :--- | :--- |
| **USD** | `USD (Millions)` | 1.00 |
| **TWD (NT\)** | `USD (Millions)` | 2020: 29.50, 2021: 28.00, 2022: 29.80, 2023: 31.10, 2024: 32.00, 2025: 32.00 |
| **EUR (€)** | `EUR (Millions)`or `USD� | 2020: 1.14, 2021: 1.18, 2022: 1.05, 2023: 1.08, 2024: 1.08, 2025: 1.08 |
| **JPY (¥)** | `USD (Millions)`| 2020: 106.8, 2021: 109.8, 2022: 131.5, 2023: 140.5, 2024: 151.0, 2025: 150.0 |
| **KRW (i)** | `USD (Millions)` | 2020: 1180, 2021: 1145, 2022: 1290, 2023: 1305, 2024: 1360, 2025: 1350 |

### Scale Sanitization:
- **In Thousands (`in thousands`)**: Multiply by $10^{-3}$ to convert to $\M$. (e.g. Palantir 10-K).
- **In Millions (`in millions`)**: Multiply by $1.0$.
- **In Billions (`in billions / in trillions`)**: Multiply by $10^3$.

---

## 4. Strategic Indices & Productivity Calculations

### A. Human Capital Productivity Trio ($/FTE)
$$\ntext{Revenue per FTE} = \frac{\ntext{Revenue (\M)} \times 10^6}{\ntext{Headcount}}$$
$$\ntext{Gross Profit per FTE} = \frac{\ntext{Gross Profit (\M)} \times 10^6}{\ntext{Headcount}}$$
$$\ntext{Operating Income per FTE} = \frac{\ntext{Operating Income (\M)} \times 10^6}{\ntext{Headcount}}$%

### B. The Pivot (人力與毛利率黃金拐點)
- Identify the calendar year where total headcount growth flattens into a plateau ($\Delta \\% HC |le 3\\%$) while gross margin continues expanding ($\Delta GM > 0$) through lights-out factory automation and AI operational leverage.

### C. Operating Leverage & R&D Intensity
$$\ntext{Operating Margin \%e = \frac{\ntext{Operating Income}}{\ntext{Revenue}} \times 100\%d%
$$\ntext{R&D Intensity \%e = \frac{\ntext{R&D Expense}}{\ntext{Revenue}} \times 100\%$$
$$\ntext{Operating Leverage Coefficient} = \frac{\Delta \\% \ntext{Operating Income}}{\Delta \\% \ntext{Revenue}}$%

### D. 5-Stage Lean Maturity Rating:
- **Level 1 (Reactive)**: High labor assembly, manual scheduling, razor-thin margin.
- **Level 2 (Standardized)**: Global multi-site footprint with baseline SOPs.
- **Level 3 (Automated)**: Lighthouse factories with automated robotics & AMHS.
- **Level 4 (Predictive)**: AI-driven parameter self-tuning, advanced packaging/liquid-cooling platforms.
- **Level 5 (World-Class / Cognitive)**: Fully cognitive digital twin manufacturing platform driving compounding velocity $(1.01)^{365} = 37.8x$ (TSMC velocity).

---

## 5. output JSON Schema Specification

When generating or auditing `data/metrics/{ticker}_metrics.json`:
- Ensure `company_name`, `ticker`, `currency`, `unit`, `years`, `financials`, `sales_breakdown`, `insights` (English & Traditional Chinese), and `lean_maturity` conform to project DTOs.

---

## 6. Step-by-Step Execution Checklist for New Companies

1. **Step 1 - Scrape & Download**: Fetch PDF annual/quarterly reports into `data/downloads/{ticker}/`.
2. **Step 2 - Parse to MD**: Convert tables to Markdown with `pdfplumber` into `data/parsed_md/{ticker}/`.
3. **Step 3 - Deduce & Normalize**:
   - Detect accounting anomalies (e.g. Google/Meta `Cost of revenues` $\\rightarrow$ derive Gross Profit).
   - Extract headcount from Item 1/6 prose.
   - Convert foreign currency to USD $M.
4. **Step 4 - Update Codebase**:
   - Write `data/metrics/{ticker}_metrics.json`.
   - Update `TICKER_ALIASES`, `BUILTIN_BENCHMARKS`, and `BUILTIN_BENCHMARKS_QUARTERLY` in `metrics_extractor.py`.
   - Add ticker to `app.py` and `static/js/dashboard.js`.
5. **Step 5 - Compile & Deploy**:
   - Run `python export_standalone.py` to recompile `docs/index.html` and `standalone_dashboard.html`.
   - Update `README.md` and commit to Git.
