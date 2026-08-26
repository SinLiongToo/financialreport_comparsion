"""
app.py - Interactive Web Dashboard & API Server for Financial & OpEx Annual Report Workflow
"""
import os
import json
import glob
from flask import Flask, render_template, request, jsonify, Response, stream_with_context, send_file
from workflow import AnnualReportWorkflow
from metrics_extractor import FinancialMetricsExtractor, BUILTIN_BENCHMARKS, BUILTIN_BENCHMARKS_QUARTERLY, TICKER_ALIASES

app = Flask(__name__)
workflow = AnnualReportWorkflow()
extractor = FinancialMetricsExtractor()

@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

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
    for b in BUILTIN_BENCHMARKS_QUARTERLY.keys():
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
    ordered_priority = ["ASML", "TSMC", "NVDA", "MSFT", "GOOGL", "AAPL", "AMD", "MU", "KLAC", "TER", "ASE", "NXP", "VSH"]
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


@app.route("/api/run-workflow-stream", methods=["GET"])
def run_workflow_stream():
    """Real-time SSE progress stream for one-click workflow execution"""
    target = request.args.get("target") or request.args.get("url") or request.args.get("ticker") or "https://companiesmarketcap.com/asml/annual-reports-20f/"
    years = int(request.args.get("years", 5))
    freq = request.args.get("freq", "annual").lower()
    max_pages = int(request.args.get("max_pages", 30))

    def event_stream():
        import queue
        q = queue.Queue()

        def progress_cb(msg, pct):
            q.put({"status": "progress", "percent": round(pct, 1), "message": msg})

        import threading
        result_holder = {}

        def worker():
            try:
                res = workflow.run_pipeline(
                    target=target,
                    n_years=years,
                    max_pages_per_pdf=max_pages,
                    progress_callback=progress_cb,
                    freq=freq
                )
                if isinstance(res, dict):
                    res["success"] = True
                result_holder["result"] = res
                q.put({"status": "completed", "percent": 100, "message": "Workflow completed successfully!", "result": res})
            except Exception as e:
                result_holder["error"] = str(e)
                q.put({"status": "error", "percent": 100, "message": f"Error: {str(e)}"})

        t = threading.Thread(target=worker)
        t.start()

        while t.is_alive() or not q.empty():
            try:
                item = q.get(timeout=0.5)
                yield f"data: {json.dumps(item)}\n\n"
                if item.get("status") in ["completed", "error"]:
                    break
            except queue.Empty:
                # Keep-alive heartbeat
                yield f": heartbeat\n\n"

    return Response(stream_with_context(event_stream()), mimetype="text/event-stream")

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

def _get_candidate_md_dirs(ticker: str):
    raw_ticker = ticker.lower()
    canon_ticker = FinancialMetricsExtractor.canonical_ticker(raw_ticker).lower()
    folder_candidates = {raw_ticker, canon_ticker}
    for alias, c in TICKER_ALIASES.items():
        if c == canon_ticker or c == raw_ticker or alias == canon_ticker or alias == raw_ticker:
            folder_candidates.add(alias)
            folder_candidates.add(c)
    
    parsed_base = "data/parsed_md"
    if os.path.exists(parsed_base):
        for item in os.listdir(parsed_base):
            if FinancialMetricsExtractor.canonical_ticker(item).lower() == canon_ticker:
                folder_candidates.add(item)
    return [os.path.join(parsed_base, folder) for folder in folder_candidates]

@app.route("/api/markdown-files/<ticker>", methods=["GET"])
def list_markdown_files(ticker):
    """List parsed markdown files for a ticker (supporting all folder aliases)"""
    md_dirs = _get_candidate_md_dirs(ticker)

    files_dict = {}
    for d in md_dirs:
        if os.path.exists(d):
            for f in os.listdir(d):
                if f.endswith(".md") and f not in files_dict:
                    path = os.path.join(d, f)
                    is_q = "10-Q" in f.upper() or "_Q1_" in f or "_Q2_" in f or "_Q3_" in f or "_Q4_" in f
                    files_dict[f] = {
                        "filename": f,
                        "size_bytes": os.path.getsize(path),
                        "modified": os.path.getmtime(path),
                        "report_type": "10-Q" if is_q else ("20-F" if "20-F" in f.upper() else "10-K")
                    }
    
    files = list(files_dict.values())
    files.sort(key=lambda x: x["filename"], reverse=True)
    return jsonify({"files": files})

@app.route("/api/markdown-content/<ticker>/<filename>", methods=["GET"])
def get_markdown_content(ticker, filename):
    """Returns content of a parsed markdown file"""
    md_dirs = _get_candidate_md_dirs(ticker)
    
    found_path = None
    for d in md_dirs:
        p = os.path.join(d, filename)
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
