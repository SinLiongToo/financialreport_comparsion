"""
app.py - Interactive Web Dashboard & API Server for Financial & OpEx Annual Report Workflow
"""
import os
import json
import glob
from flask import Flask, render_template, request, jsonify, send_file
from workflow import AnnualReportWorkflow
from metrics_extractor import FinancialMetricsExtractor, BUILTIN_BENCHMARKS, TICKER_ALIASES

app = Flask(__name__)
workflow = AnnualReportWorkflow()
extractor = FinancialMetricsExtractor()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/companies", methods=["GET"])
def get_companies():
    """Returns deduplicated list of available companies with clean canonical tickers"""
    canonical_set = set()
    
    # 1. Add benchmarks
    for b in BUILTIN_BENCHMARKS.keys():
        canonical_set.add(FinancialMetricsExtractor.canonical_ticker(b).upper())

    # 2. Add downloaded directories
    download_dir = "data/downloads"
    if os.path.exists(download_dir):
        for item in os.listdir(download_dir):
            if os.path.isdir(os.path.join(download_dir, item)):
                canonical_set.add(FinancialMetricsExtractor.canonical_ticker(item).upper())

    # 3. Add parsed MD directories
    parsed_dir = "data/parsed_md"
    if os.path.exists(parsed_dir):
        for item in os.listdir(parsed_dir):
            if os.path.isdir(os.path.join(parsed_dir, item)):
                canonical_set.add(FinancialMetricsExtractor.canonical_ticker(item).upper())

    # Map NVDA to NVIDIA display value if desired, but keep clean list
    ordered_priority = ["ASML", "TSMC", "NVDA", "NXP", "VSH"]
    final_list = [c for c in ordered_priority if c in canonical_set]
    for c in sorted(canonical_set):
        if c not in final_list:
            final_list.append(c)

    return jsonify({"companies": final_list})

@app.route("/api/metrics/<ticker>", methods=["GET"])
def get_metrics(ticker):
    """Returns structured financial & OpEx metrics for dashboard charts"""
    freq = request.args.get("freq", "annual").lower()
    data = extractor.get_metrics(ticker, freq=freq)
    return jsonify(data)

@app.route("/api/run-workflow", methods=["POST"])
def run_workflow_api():
    """Trigger the one-click download, parse, and extraction workflow"""
    req_data = request.get_json() or {}
    target = req_data.get("target") or req_data.get("url") or req_data.get("ticker") or "https://companiesmarketcap.com/asml/annual-reports-20f/"
    years = int(req_data.get("years", 5))
    max_pages = req_data.get("max_pages", 30)

    try:
        freq = req_data.get("freq", "annual").lower()
        result = workflow.run_pipeline(
            target=target,
            n_years=years,
            max_pages_per_pdf=max_pages,
            freq=freq
        )
        if isinstance(result, dict):
            result["success"] = result.get("status") == "success" or True
        return jsonify(result)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/markdown-files/<ticker>", methods=["GET"])
def list_markdown_files(ticker):
    """List parsed markdown files for a ticker (supporting aliases)"""
    raw_ticker = ticker.lower()
    canon_ticker = FinancialMetricsExtractor.canonical_ticker(raw_ticker)
    
    md_dirs = [os.path.join("data/parsed_md", raw_ticker)]
    if canon_ticker != raw_ticker:
        md_dirs.append(os.path.join("data/parsed_md", canon_ticker))

    files_dict = {}
    for d in md_dirs:
        if os.path.exists(d):
            for f in os.listdir(d):
                if f.endswith(".md") and f not in files_dict:
                    path = os.path.join(d, f)
                    files_dict[f] = {
                        "filename": f,
                        "size_bytes": os.path.getsize(path),
                        "modified": os.path.getmtime(path)
                    }
    
    files = list(files_dict.values())
    files.sort(key=lambda x: x["filename"], reverse=True)
    return jsonify({"files": files})

@app.route("/api/markdown-content/<ticker>/<filename>", methods=["GET"])
def get_markdown_content(ticker, filename):
    """Returns content of a parsed markdown file"""
    raw_ticker = ticker.lower()
    canon_ticker = FinancialMetricsExtractor.canonical_ticker(raw_ticker)

    candidates = [
        os.path.join("data/parsed_md", raw_ticker, filename),
        os.path.join("data/parsed_md", canon_ticker, filename)
    ]
    
    found_path = None
    for p in candidates:
        if os.path.exists(p):
            found_path = p
            break

    if not found_path:
        return jsonify({"error": "File not found"}), 404

    with open(found_path, "r", encoding="utf-8") as f:
        content = f.read()
    return jsonify({"filename": filename, "content": content})

@app.route("/api/compare", methods=["GET"])
def get_compare_metrics():
    """Batch API for Multi-Company Comparison"""
    freq = request.args.get("freq", "annual").lower()
    tickers_param = request.args.get("tickers", "")
    if not tickers_param:
        tickers = ["asml", "tsmc", "nvda", "nxp", "vsh"]
    else:
        tickers = [t.strip().lower() for t in tickers_param.split(",") if t.strip()]
    
    results = {}
    for t in tickers:
        try:
            m = extractor.get_metrics(t, freq=freq)
            results[t] = m
        except Exception as e:
            results[t] = {"error": str(e)}
    
    return jsonify({"success": True, "freq": freq, "companies": results})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
