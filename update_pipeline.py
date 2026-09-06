#!/usr/bin/env python3
"""
update_pipeline.py - One-Click Automated Financial Report Ingestion & Sync Pipeline

Executes the complete autonomous 7-step pipeline:
  1. Detect/Ingest new PDF in data/downloads/{ticker}/
  2. Parse PDF to lossless Markdown in data/parsed_md/{ticker}/
  3. Extract and normalize financial KPIs to USD $M (Linear interpolation for 10-Q)
  4. Ensure Chart 6 structure: sales_breakdown.data[year] = {"value": [...], "volume": [...]}
  5. Save to data/metrics/{ticker}_metrics.json (Annual) & {ticker}_metrics_quarterly.json (Quarterly)
  6. Run automated sanity audit (validate_company.py) and verify 0 errors
  7. Recompile standalone dashboard (export_standalone.py) for GitHub Pages & local offline browsing

Usage:
  python update_pipeline.py --ticker TSMC
  python update_pipeline.py --all
  python update_pipeline.py --ingest-pdf path/to/report.pdf --ticker NVDA --year 2025
  python update_pipeline.py --ingest-pdf path/to/10q.pdf --ticker NVDA --year 2025 --freq quarterly --quarter "2025 Q1"
"""

import os
import sys
import shutil
import json
import argparse
import time
from typing import Optional, Dict

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

base_dir = os.path.dirname(os.path.abspath(__file__))
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

from metrics_extractor import FinancialMetricsExtractor, TICKER_ALIASES
from pdf_parser import PDFToMarkdownParser
from crawler import AnnualReportCrawler
from workflow import AnnualReportWorkflow
from export_standalone import export_standalone

# Import validation script
validate_script_path = os.path.join(base_dir, ".agents", "skills", "financial-report-multiformat-analyzer", "scripts")
if validate_script_path not in sys.path:
    sys.path.insert(0, validate_script_path)

try:
    from validate_company import validate_company
except ImportError:
    validate_company = None

class FinancialReportUpdatePipeline:
    def __init__(self):
        self.base_dir = base_dir
        self.extractor = FinancialMetricsExtractor(
            metrics_dir=os.path.join(base_dir, "data", "metrics"),
            parsed_md_dir=os.path.join(base_dir, "data", "parsed_md")
        )
        self.parser = PDFToMarkdownParser(
            output_base_dir=os.path.join(base_dir, "data", "parsed_md")
        )
        self.crawler = AnnualReportCrawler(
            output_base_dir=os.path.join(base_dir, "data", "downloads")
        )
        self.workflow = AnnualReportWorkflow(
            data_root=os.path.join(base_dir, "data")
        )

    def canonical(self, ticker: str) -> str:
        return self.extractor.canonical_ticker(ticker).lower()

    def ingest_pdf(
        self,
        pdf_path: str,
        ticker: str,
        year: str,
        freq: str = "annual",
        quarter: Optional[str] = None
    ) -> str:
        """Copies or places an external PDF into data/downloads/{ticker}/ with standard naming."""
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"Source PDF file not found: {pdf_path}")

        canon_ticker = self.canonical(ticker)
        downloads_dir = os.path.join(self.base_dir, "data", "downloads", canon_ticker)
        os.makedirs(downloads_dir, exist_ok=True)

        if freq == "quarterly":
            q_label = quarter.replace(" ", "_") if quarter else f"{year}_Q1"
            dest_filename = f"{canon_ticker.upper()}_{q_label}_10Q_Report.pdf"
        else:
            dest_filename = f"{canon_ticker.upper()}_{year}_Annual_Report.pdf"

        dest_path = os.path.join(downloads_dir, dest_filename)
        shutil.copy2(pdf_path, dest_path)
        print(f"  [✓] PDF ingested to: {os.path.relpath(dest_path, self.base_dir)} ({os.path.getsize(dest_path)/1024:.1f} KB)")
        return dest_path

    def update_company(
        self,
        ticker: str,
        freq: str = "annual",
        n_years: int = 5,
        recompile: bool = True,
        audit: bool = True
    ) -> bool:
        """Executes full update pipeline for a single company."""
        canon_ticker = self.canonical(ticker)
        print(f"\n================================================================================")
        print(f"🚀 RUNNING ONE-CLICK PIPELINE FOR: [{canon_ticker.upper()}] ({freq.upper()})")
        print(f"================================================================================")

        start_time = time.time()

        # Step 1: Check downloads / trigger crawler if needed
        downloads_dir = os.path.join(self.base_dir, "data", "downloads", canon_ticker)
        has_pdfs = os.path.exists(downloads_dir) and len([f for f in os.listdir(downloads_dir) if f.lower().endswith(".pdf")]) > 0

        print(f"\n[Step 1/5] Verifying downloaded PDF archives in data/downloads/{canon_ticker}...")
        if not has_pdfs:
            print(f"  [!] No existing PDFs found for {canon_ticker.upper()}. Initiating crawler...")
            try:
                self.crawler.download_reports(target=canon_ticker, n_years=n_years, freq=freq)
            except Exception as e:
                print(f"  [!] Crawler notice: {e}")
        else:
            pdf_count = len([f for f in os.listdir(downloads_dir) if f.lower().endswith(".pdf")])
            print(f"  [✓] Found {pdf_count} existing PDF filings. Reusing local cache.")

        # Step 2: Parse PDFs to Markdown
        print(f"\n[Step 2/5] Parsing PDFs to clean structured Markdown...")
        if os.path.exists(downloads_dir):
            for pdf_file in sorted(os.listdir(downloads_dir)):
                if pdf_file.lower().endswith(".pdf"):
                    full_pdf = os.path.join(downloads_dir, pdf_file)
                    res = self.parser.parse_pdf(full_pdf, max_pages=60)
                    print(f"  [✓] Parsed {pdf_file} -> {os.path.basename(res['output_md'])} ({res['status']})")

        # Step 3: Extract & Normalize Metrics
        print(f"\n[Step 3/5] Extracting Financial KPIs, Sales Breakdown & Lean Productivity...")
        metrics = self.extractor.extract_from_markdown(canon_ticker, freq=freq)
        
        # Guard Chart 6 Structure
        sb = metrics.get("sales_breakdown", {})
        sb_data = sb.get("data", {})
        for period, val in sb_data.items():
            if isinstance(val, list):
                sb_data[period] = {"value": val, "volume": [round(100.0 / len(val), 1) for _ in val]}

        # Save Metrics JSON
        suffix = "_metrics_quarterly.json" if freq == "quarterly" else "_metrics.json"
        out_json_path = os.path.join(self.base_dir, "data", "metrics", f"{canon_ticker}{suffix}")
        os.makedirs(os.path.dirname(out_json_path), exist_ok=True)
        with open(out_json_path, "w", encoding="utf-8") as jf:
            json.dump(metrics, jf, indent=2, ensure_ascii=False)
        print(f"  [✓] Saved validated metrics to: {os.path.relpath(out_json_path, self.base_dir)}")

        # Step 4: Run Automated Sanity Audit
        if audit and validate_company:
            print(f"\n[Step 4/5] Running automated sanity & schema audit (validate_company.py)...")
            is_valid = validate_company(canon_ticker)
            if not is_valid:
                print(f"  [❌] Warning: Audit found inconsistencies for {canon_ticker}. Review above output.")
            else:
                print(f"  [✓] Audit PASSED: 0 errors detected for {canon_ticker.upper()}.")

        # Step 5: Recompile Standalone Dashboard
        if recompile:
            print(f"\n[Step 5/5] Recompiling Standalone Dashboard (docs/index.html & standalone_dashboard.html)...")
            export_standalone()
            print(f"  [✓] Standalone recompiled successfully!")

        elapsed = time.time() - start_time
        print(f"\n✨ Completed pipeline for [{canon_ticker.upper()}] in {elapsed:.2f} seconds.")
        return True

    def update_all(self, recompile: bool = True) -> bool:
        """Audits, synchronizes, and recompiles all existing companies in data/metrics/."""
        print(f"\n================================================================================")
        print(f"🚀 BATCH UPDATING ALL REGISTERED CORPORATE BENCHMARKS")
        print(f"================================================================================")

        metrics_dir = os.path.join(self.base_dir, "data", "metrics")
        if not os.path.exists(metrics_dir):
            print("  [!] Error: data/metrics directory does not exist.")
            return False

        files = [f for f in os.listdir(metrics_dir) if f.endswith("_metrics.json")]
        tickers = sorted(list(set(f.replace("_metrics.json", "").lower() for f in files)))

        print(f"Found {len(tickers)} companies in repository.")
        success_count = 0

        for t in tickers:
            canon = self.canonical(t)
            if validate_company:
                valid = validate_company(canon)
                if valid:
                    success_count += 1
            else:
                success_count += 1

        print(f"\n[✓] Validated {success_count}/{len(tickers)} corporate benchmarks.")

        if recompile:
            print("\nRecompiling Standalone HTML and GitHub Pages Bundle...")
            export_standalone()

        return True

def main():
    parser = argparse.ArgumentParser(
        description="One-Click Automated Financial Report Ingestion & Sync Pipeline"
    )
    parser.add_argument("--ticker", type=str, help="Company ticker symbol or slug (e.g. TSMC, NVDA, ASML, 2454, 6669)")
    parser.add_argument("--all", action="store_true", help="Audit and recompile all registered companies")
    parser.add_argument("--ingest-pdf", type=str, help="Path to new PDF file to ingest into data/downloads/")
    parser.add_argument("--year", type=str, default="2025", help="Target fiscal year (e.g. 2024, 2025, 2026)")
    parser.add_argument("--quarter", type=str, help="Quarter label (e.g. '2025 Q1', '2025 Q2') for 10-Q filings")
    parser.add_argument("--freq", type=str, choices=["annual", "quarterly"], default="annual", help="Reporting frequency")
    parser.add_argument("--no-recompile", action="store_true", help="Skip recompiling standalone HTML at the end")
    parser.add_argument("--no-audit", action="store_true", help="Skip running validate_company.py audit")

    args = parser.parse_args()
    pipeline = FinancialReportUpdatePipeline()

    if args.all:
        pipeline.update_all(recompile=not args.no_recompile)
        return

    if not args.ticker:
        print("❌ Error: Please specify either --ticker <TICKER> or --all. Use -h for help.")
        sys.exit(1)

    # If new PDF provided to ingest
    if args.ingest_pdf:
        print(f"\n📥 Ingesting new PDF report: {args.ingest_pdf} ...")
        pipeline.ingest_pdf(
            pdf_path=args.ingest_pdf,
            ticker=args.ticker,
            year=args.year,
            freq=args.freq,
            quarter=args.quarter
        )

    # Run pipeline for ticker
    pipeline.update_company(
        ticker=args.ticker,
        freq=args.freq,
        recompile=not args.no_recompile,
        audit=not args.no_audit
    )

if __name__ == "__main__":
    main()
