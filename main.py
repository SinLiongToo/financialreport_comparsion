"""
main.py - CLI and Web Server Launcher for Annual Report Workflow
"""
import os
import argparse
import sys
from workflow import AnnualReportWorkflow

def main():
    parser = argparse.ArgumentParser(description="Financial Annual Report Downloader, MD Parser & OpEx Dashboard")
    parser.add_argument("--ticker", "-t", default="https://companiesmarketcap.com/asml/annual-reports-20f/", help="Company ticker or companiesmarketcap URL")
    parser.add_argument("--years", "-n", type=int, default=5, help="Number of years to download/parse")
    parser.add_argument("--max-pages", type=int, default=40, help="Max pages per PDF to convert to Markdown")
    parser.add_argument("--serve", "-s", action="store_true", help="Launch the Flask Web Dashboard")
    parser.add_argument("--port", "-p", type=int, default=5000, help="Port for web dashboard")

    args = parser.parse_args()

    if args.serve:
        from app import app
        print(f"\n🚀 Starting Web Dashboard on http://127.0.0.1:{args.port}...")
        app.run(host="0.0.0.0", port=args.port, debug=False)
    else:
        print(f"\n🚀 Running One-Click Workflow for: {args.ticker} ({args.years} years)...")
        wf = AnnualReportWorkflow()
        result = wf.run_pipeline(target=args.ticker, n_years=args.years, max_pages_per_pdf=args.max_pages)
        print("\n✅ Workflow Completed Successfully!")
        print(f"  - Company: {result['ticker']}")
        print(f"  - Downloaded PDFs: {result['downloaded_count']}")
        print(f"  - Parsed MD Files: {result['parsed_count']}")
        print(f"  - Elapsed Time: {result['elapsed_seconds']}s")
        print("\nTo launch the Web Dashboard, run:")
        print("  python main.py --serve\n")

if __name__ == "__main__":
    main()
