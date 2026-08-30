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


