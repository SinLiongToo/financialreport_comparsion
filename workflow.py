"""
workflow.py - Unified end-to-end pipeline orchestrator.
One-click workflow:
  1. Crawl & Fetch Report Links
  2. Download N Years PDF Annual Reports
  3. Parse PDFs to Clean Markdown (.md) with Tables
  4. Extract Financial & OpEx Metrics
  5. Prepare Dashboard-Ready JSON Data
"""
import os
import sys
import time
from typing import Dict, Optional, Callable
from crawler import AnnualReportCrawler
from pdf_parser import PDFToMarkdownParser
from metrics_extractor import FinancialMetricsExtractor

class AnnualReportWorkflow:
    def __init__(self, data_root: str = "data"):
        self.data_root = data_root
        self.crawler = AnnualReportCrawler(output_base_dir=os.path.join(data_root, "downloads"))
        self.parser = PDFToMarkdownParser(output_base_dir=os.path.join(data_root, "parsed_md"))
        self.extractor = FinancialMetricsExtractor(
            metrics_dir=os.path.join(data_root, "metrics"),
            parsed_md_dir=os.path.join(data_root, "parsed_md")
        )

    def run_pipeline(
        self,
        target: str,
        n_years: int = 5,
        max_pages_per_pdf: Optional[int] = 50,
        progress_callback: Optional[Callable[[str, float], None]] = None
    ) -> Dict:
        """
        Executes the full pipeline step-by-step with real-time progress reporting.
        """
        start_time = time.time()
        ticker, _ = self.crawler.parse_input(target)

        def report(stage_name: str, pct: float):
            if progress_callback:
                progress_callback(stage_name, pct)
            print(f"[{pct:.0f}%] {stage_name}")

        # Step 1: Crawl & Download
        report(f"Step 1/4: Fetching and downloading {n_years} annual reports for {ticker.upper()}...", 10)
        download_results = self.crawler.download_reports(
            target=target,
            n_years=n_years,
            progress_callback=lambda msg, cur, tot: report(f"Downloading [{cur}/{tot}]: {msg}", 10 + (cur/tot)*30)
        )

        # Step 2: Parse PDF to Markdown
        report(f"Step 2/4: Converting downloaded PDFs to Markdown format...", 45)
        parsed_results = []
        valid_downloads = [d for d in download_results if d.get("file_path") and os.path.exists(d["file_path"])]
        
        tot_pdfs = len(valid_downloads)
        for idx, item in enumerate(valid_downloads, start=1):
            pdf_path = item["file_path"]
            res = self.parser.parse_pdf(
                pdf_path,
                max_pages=max_pages_per_pdf,
                progress_callback=lambda msg, cur, tot: report(f"Parsing [{idx}/{tot_pdfs}]: Page {cur}/{tot}", 45 + (idx/tot_pdfs)*35)
            )
            parsed_results.append(res)

        # Step 3: Extract Metrics & Financial KPIs
        report(f"Step 3/4: Extracting financial and operational KPIs from parsed Markdown...", 85)
        metrics = self.extractor.extract_from_markdown(ticker)

        # Step 4: Summary & Dashboard Preparation
        report(f"Step 4/4: Dashboard payload ready!", 100)
        elapsed = time.time() - start_time

        return {
            "status": "success",
            "ticker": ticker.upper(),
            "target": target,
            "elapsed_seconds": round(elapsed, 2),
            "downloaded_count": len(download_results),
            "parsed_count": len(parsed_results),
            "metrics": metrics,
            "downloads": download_results,
            "parsed_files": parsed_results
        }
