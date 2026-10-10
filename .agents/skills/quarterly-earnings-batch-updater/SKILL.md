---
name: quarterly-earnings-batch-updater
description: >-
  Automated end-to-end batch pipeline, timing calendar, and multi-jurisdiction protocol for downloading, extracting, normalizing, deduplicating, auditing, and deploying global corporate quarterly earnings reports (SEC 10-Q/6-K, Taiwan TWSE MOPS, Japan TSE, Korea KRX, European IFRS, and Private AI Unicorns) across 60+ semiconductor, tech hardware, defense, and AI companies.
---

# Global Corporate Quarterly Earnings Batch Updater & Synchronization Protocol

## 1. Overview & Objective

This skill codifies the complete, production-tested end-to-end operational protocol for executing **batch quarterly earnings updates** across all **62+ multinational corporate entities** in the Financial & OpEx Strategic Dashboard.

It equips the agent with:
1. **Global Multi-Jurisdiction Earnings Calendar**: Exact filing deadlines and optimal batch update windows across US (SEC 10-Q), Taiwan (TWSE MOPS), Japan (TSE), South Korea (KRX DART), and Europe (IFRS).
2. **Batch Ingestion & Extraction Workflow**: Standardized steps to ingest reports, deduce metrics, and normalize financials into USD $M.
3. **Strict Data Isolation & Schema Integrity**: Prevention of annual/quarterly cross-contamination (Rule 8) and enforcement of Chart 6 `{"value": [...], "volume": [...]}` dual-array architecture (Rule 1 & Rule 6).
4. **Fleet-Wide Alias Synchronization**: Zero-loss mirroring to 260+ alias metric files and compilation into `metrics_extractor.py`'s `BUILTIN_BENCHMARKS_QUARTERLY`.
5. **Zero-Error Automated Audit & Zero-Touch Deployment**: Repository-wide validation, standalone HTML compilation (`docs/index.html`), version synchronization, and Git push to GitHub Pages and Cloudflare Pages.

---

## 2. Multi-Jurisdiction Earnings Calendar & Optimal Timing Protocol

### A. Filing Deadlines by Regulatory Jurisdiction

| Jurisdiction & Regime | Statutory Filing Instrument | Mandatory Filing Deadlines | Typical Reporting Window | Representative Companies |
| :--- | :--- | :--- | :--- | :--- |
| **United States (SEC)** | **Form 10-Q** (Large Accelerated Filers) | **40 days** after quarter end (Rule 13a-13) | **Q1**: Mid-Apr ~ Mid-May<br>**Q2**: Mid-Jul ~ Mid-Aug<br>**Q3**: Mid-Oct ~ Late-Nov<br>**Q4**: Form 10-K (60d) Jan ~ Feb | Apple, Microsoft, Alphabet, AMD, Intel, Qualcomm, Broadcom, Texas Instruments, TTM Technologies, Palantir |
| **Taiwan (TWSE / TPEx)** | **季財務報告書 (MOPS)** | • **Q1**: May 15<br>• **Q2**: August 14<br>• **Q3**: **November 14**<br>• **Q4**: March 31 (Annual) | • Q1: May 1 ~ May 15<br>• Q2: Aug 1 ~ Aug 14<br>• **Q3**: **Nov 1 ~ Nov 14**<br>• Q4: March 15 ~ March 31 | TSMC (2330), MediaTek (2454), Hon Hai (2317), Quanta (2382), Wistron (3231), Delta (2308), UMC (2303), GlobalWafers (6488) |
| **Japan (TSE / FSA)** | **四半期決算短信 / 報告書** | **45 days** after quarter end (TSE Rules) | • Q1: Early Aug<br>• Q2 (Interim): Late Oct ~ Mid-Nov<br>• Q3: Late Jan ~ Mid-Feb<br>• Q4 / Full Year: Late Apr ~ Mid-May | Tokyo Electron (8035), Advantest (6857), Disco (6146), Screen Holdings (7735), Renesas (6723), Shin-Etsu (4063), SUMCO (3436) |
| **South Korea (KRX / DART)** | **분기보고서 (Quarterly Report)** | **45 days** after quarter end | • Earnings Call: End of month<br>• Official DART Filing: By 14th of following month | Samsung Electronics (005930), SK Hynix (000660) |
| **Europe (Euronext, DAX, SIX)** | **IFRS Interim Management Statements** | Typically **30–60 days** after period close | • **ASML**: Mid-October (3rd Wed)<br>• **Infineon**: Fiscal Year ends Sept 30!<br>• **Air Liquide, Merck KGaA, STMicro**: Late Oct ~ Early Nov | ASML, Infineon Technologies, STMicroelectronics, NXP, Air Liquide, Merck KGaA, Linde |
| **Private Frontier AI & Defense Unicorns** | Venture Rounds / Secondary Tenders / DoD Contracts | Non-statutory (Disclosed via funding PRs & Defense Awards) | Semi-annual / Annual updates | OpenAI, Anthropic, Anduril Industries, Shield AI |

---

### B. Special Fiscal Year Shifts (Crucial Notice)

- **NVIDIA (`nvda`)**: Fiscal Year ends **late January** (e.g. Q3 fiscal quarter ends in late October, reports in **late November**).
- **Infineon Technologies (`ifx` / `infineon`)**: German fiscal year runs **October 1 to September 30**.
  - Its **Q3** calendar quarter (Jul-Sep) is actually its **Q4 / Fiscal Year End**, published as the full Annual Report in **mid-November**.
  - Calendar Q1 (Jan-Mar) corresponds to Infineon Q2; Calendar Q2 (Apr-Jun) corresponds to Infineon Q3.
- **Apple (`aapl`)**: Fiscal year ends late September (reports Q4/Annual in late October).
- **Micron Technology (`mu`)**: Fiscal year ends late August/early September (reports Q4/Annual in late September).
- **Arm Holdings (`arm`)**: Fiscal year ends **March 31**.

---

### C. The 3-Wave Execution Strategy & Best Single-Batch Date

When the user asks: *"When is the best time to batch update all companies for QX?"*

1. **Wave 1: Early Flash Reporters (T+15d to T+25d after quarter end)**
   - *Timing*: ~October 15–25 for Q3; ~July 15–25 for Q2; ~April 15–25 for Q1.
   - *Companies*: TSMC, ASML, Micron.
2. **Wave 2: Peak Fleet Disclosure Window (THE RECOMMENDED BATCH DATE)**
   - *Timing*: **November 15 for Q3** | **August 15 for Q2** | **May 15 for Q1**.
   - *Why this is the best single-batch date*:
     - **Taiwan TWSE** statutory deadline is strictly November 14 / August 14 / May 15 (100% of Taiwan companies have reported).
     - **US SEC 10-Q** 40-day deadline has passed for all major Large Accelerated Filers (Apple, Microsoft, Google, AMD, Intel, Qualcomm, Broadcom).
     - **Japan TSE & Korea DART** 45-day interim filings are submitted.
     - **Over 92% of the entire 62-company catalog can be updated in a single execution.**
3. **Wave 3: Fiscal Offset Cleanup (T+50d to T+60d)**
   - *Timing*: Late November (for NVIDIA and Infineon full-year audit release).

> [!TIP]
> **Best Practice Recommendation to User**:
> Propose scheduling the primary full-portfolio batch sync on **the 15th of the month following the quarter (e.g. November 15 for Q3)**, followed by a targeted mini-sync in late November for NVIDIA and Infineon.

---

## 3. Strict Architectural Rules & Data Schemas

### Rule 1: Strict Annual vs. Quarterly File Isolation (Rule 8 of AGENTS.md)
- **Annual Files**: `data/metrics/{ticker}_metrics.json`
  - `freq`: `"annual"`.
  - `years`: strictly 4-digit years (e.g. `["2020", "2021", "2022", "2023", "2024", "2025"]`). **0 quarterly keys allowed**.
- **Quarterly Files**: `data/metrics/{ticker}_metrics_quarterly.json`
  - `freq`: `"quarterly"`.
  - `years`: strictly quarterly series strings (e.g. `["2023 Q1", ..., "2026 Q2", "2026 Q3"]`).
  - Output path guard: `suffix = "_metrics_quarterly.json" if freq == "quarterly" else "_metrics.json"`.

### Rule 2: Headcount Linear Interpolation Rule
Under SEC and TWSE rules, quarterly headcount disclosure is non-mandatory. To maintain high-fidelity Rev/FTE, GP/FTE, and OI/FTE productivity benchmarks:
$$\text{HC}_{Q1} = \text{HC}_{t-1} + 0.25 \times (\text{HC}_t - \text{HC}_{t-1})$$
$$\text{HC}_{Q2} = \text{HC}_{t-1} + 0.50 \times (\text{HC}_t - \text{HC}_{t-1})$$
$$\text{HC}_{Q3} = \text{HC}_{t-1} + 0.75 \times (\text{HC}_t - \text{HC}_{t-1})$$
$$\text{HC}_{Q4} = \text{HC}_t$$

### Rule 3: Chart 6 Value vs. Volume Mandatory Structure (Rule 6 of AGENTS.md)
Every quarter entry under `sales_breakdown.data` MUST be a dictionary containing BOTH:
```json
"sales_breakdown": {
  "units": "$M",
  "categories": ["Category A", "Category B", "Category C"],
  "colors": ["#0284C7", "#10B981", "#F59E0B"],
  "data": {
    "2026 Q3": {
      "value": [1250.0, 840.5, 310.2],
      "volume": [52.1, 35.0, 12.9]
    }
  }
}
```
*Never output raw arrays directly inside `data["YYYY QX"]`.*

### Rule 4: USD $M Currency Normalization
All reported values must be normalized to USD Millions ($M) using standardized benchmark rates:
- TWD: 32.00
- EUR: 1.08
- JPY: 150.0 ~ 152.0
- KRW: 1350 ~ 1380
- GBP: 1.28 ~ 1.30

---

## 4. End-to-End 7-Step Batch Execution Runbook

Whenever executing a full quarterly portfolio update:

### Step 1: Fleet Inventory & Ingestion Audit
Run a Python audit script to detect existing quarter coverage across all 62 canonical tickers:
```python
import json
from pathlib import Path
from metrics_extractor import TICKER_ALIASES

canonical = sorted(list(set(TICKER_ALIASES.values())))
missing = []
for t in canonical:
    p = Path(f"data/metrics/{t}_metrics_quarterly.json")
    if not p.exists():
        missing.append((t, "missing file"))
        continue
    data = json.loads(p.read_text(encoding="utf-8"))
    if "2026 Q3" not in data.get("years", []):
        missing.append((t, "needs update"))
print(f"Total needing update: {len(missing)} / {len(canonical)}")
```

### Step 2: Ingest & Extract Quarterly Metrics
For companies with new reports:
- Either run: `python update_pipeline.py --ingest-pdf <path> --ticker <ticker> --year <YYYY> --freq quarterly --quarter "YYYY QX"`
- Or batch populate normalized statements (`revenue`, `cogs`, `gross_profit`, `gross_margin`, `operating_income`, `operating_margin`, `net_income`, `net_margin`, `rd_expense`, `rd_pct_rev`, `headcount`, `rev_per_emp`, `gp_per_emp`, `op_per_emp`, `sales_breakdown`).

### Step 3: Fleet-Wide Alias Synchronization
For every canonical company updated, automatically mirror its JSON to all mapped aliases:
```python
import json
from pathlib import Path
from metrics_extractor import TICKER_ALIASES

for alias, canonical in TICKER_ALIASES.items():
    src = Path(f"data/metrics/{canonical}_metrics_quarterly.json")
    if src.exists():
        dst = Path(f"data/metrics/{alias}_metrics_quarterly.json")
        dst.write_text(src.read_text(encoding="utf-8"), encoding="utf-8")
```

### Step 4: Synchronize `metrics_extractor.py` In-Memory Database
Ensure `BUILTIN_BENCHMARKS_QUARTERLY` in `metrics_extractor.py` is synchronized with the latest quarterly data dictionary for zero-latency standalone extraction.

### Step 5: Automated Audit (Zero-Error Verification)
Execute the multi-format validation script across the entire portfolio:
```powershell
python .agents/skills/financial-report-multiformat-analyzer/scripts/validate_company.py all
```
**Success Criterion**: 100% Passed, 0 Errors, 0 Warnings across all 62 companies.

### Step 6: Standalone Bundle Recompilation
Bake the updated dataset into offline standalone distributions:
```powershell
python export_standalone.py
```
This generates:
- `docs/index.html` (GitHub Pages & Cloudflare Pages mirror production artifact)
- `standalone_dashboard.html` (Self-contained offline artifact)

### Step 7: Version Badge Bumping & Push
1. Update `templates/index.html` version badge (`vX.Y.Z`) and timestamp (`Updated: YYYY-MM-DD`).
2. Update `static/js/dashboard.js` (`I18N_DICT.en.header_updated` & `zh.header_updated`).
3. Add release log entry to `README.md` (Sections 16 & 17).
4. Re-run `python export_standalone.py` to ensure version strings are baked in.
5. Commit and push:
```powershell
git add .
git commit -m "feat: full portfolio QX quarterly financial sync across all 62 global companies (vX.Y.Z)"
git push origin main
```
*(If remote has an automated daily stock commit, run `git pull --rebase origin main`, re-run `python export_standalone.py`, and push).*

---

## 5. Automated Verification Checklist

Before reporting completion to the user, verify every item:

- [ ] All 62 canonical corporate entities contain the target quarter in their `years` array.
- [ ] No annual metric file (`*_metrics.json`) contains `"Q"` strings or quarterly data.
- [ ] Every quarterly entry under `sales_breakdown.data` contains both `"value"` and `"volume"` lists.
- [ ] All aliases in `TICKER_ALIASES` have identical quarterly metric JSON files.
- [ ] `validate_company.py all` completes with 0 errors.
- [ ] `docs/index.html` and `standalone_dashboard.html` are freshly recompiled.
- [ ] Version and update timestamp match today's date in `templates/index.html`, `dashboard.js`, and `README.md`.
- [ ] Remote repository is synchronized (`git status` clean, pushed to `main`).
