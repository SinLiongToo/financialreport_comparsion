# Autonomous Company Update & Ingestion Rule

- **Unconditional One-Click Pipeline Execution**:
  Whenever the user asks to add, update, or ingest any financial report (e.g. Taiwan TWSE, US SEC 10-K/10-Q, 20-F, European IFRS, Japan Yuho, or a new annual/quarterly PDF file), execute the complete automated pipeline using `python update_pipeline.py`:
  - For single company: `python update_pipeline.py --ticker <ticker> [--freq annual|quarterly]`
  - For new PDF ingestion: `python update_pipeline.py --ingest-pdf <path_to_pdf> --ticker <ticker> --year <YYYY> [--freq annual|quarterly]`
  - For full repository audit & synchronization: `python update_pipeline.py --all`
- **Zero-Touch End-to-End Execution**:
  1. PDF Ingest & Caching (`data/downloads/{ticker}/`)
  2. Lossless Table Markdown Parsing (`data/parsed_md/{ticker}/`)
  3. KPI Deduction & USD Normalization with Linear Headcount Interpolation for 10-Q
  4. Mandatory Chart 6 Structure: `sales_breakdown.data[period] = {"value": [...], "volume": [...]}`
  5. Strict File Isolation: `{ticker}_metrics.json` (Annual) vs `{ticker}_metrics_quarterly.json` (Quarterly)
  6. Sanity Audit (`validate_company.py <ticker>`) verifying 0 errors
  7. Standalone & GitHub Pages Recompile (`export_standalone.py`)
- **Strict Workspace Boundary**: Never touch or modify files outside this active project workspace.
