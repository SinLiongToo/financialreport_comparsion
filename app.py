"""
app.py - Interactive Web Dashboard & API Server for Financial & OpEx Annual Report Workflow
"""
import os
import json
import glob
from flask import Flask, render_template, request, jsonify, send_file
from workflow import AnnualReportWorkflow
from metrics_extractor import FinancialMetricsExtractor, BUILTIN_BENCHMARKS

app = Flask(__name__)
workflow = AnnualReportWorkflow()
extractor = FinancialMetricsExtractor()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/companies", methods=["GET"])
def get_companies():
    """Returns list of available companies with downloaded/parsed data and benchmarks"""
    companies = set()
    for b in BUILTIN_BENCHMARKS.keys():
        companies.add(b.upper())

    download_dir = "data/downloads"
    if os.path.exists(download_dir):
        for item in os.listdir(download_dir):
            if os.path.isdir(os.path.join(download_dir, item)):
                companies.add(item.upper())

    parsed_dir = "data/parsed_md"
    if os.path.exists(parsed_dir):
        for item in os.listdir(parsed_dir):
            if os.path.isdir(os.path.join(parsed_dir, item)):
                companies.add(item.upper())

    # Sort with priority: ASML, TSMC, NVDA, others
    ordered = ["ASML", "TSMC", "NVDA"]
    final_list = [c for c in ordered if c in companies]
    for c in sorted(companies):
        if c not in final_list:
            final_list.append(c)

    return jsonify({"companies": final_list})

@app.route("/api/metrics/<ticker>", methods=["GET"])
def get_metrics(ticker):
    """Returns structured financial & OpEx metrics for dashboard charts"""
    data = extractor.get_metrics(ticker)
    return jsonify(data)

@app.route("/api/run-workflow", methods=["POST"])
def run_workflow_api():
    """Trigger the one-click download, parse, and extraction workflow"""
    req_data = request.get_json() or {}
    target = req_data.get("target", "https://companiesmarketcap.com/asml/annual-reports-20f/")
    years = int(req_data.get("years", 5))
    max_pages = req_data.get("max_pages", 30)

    try:
        result = workflow.run_pipeline(
            target=target,
            n_years=years,
            max_pages_per_pdf=max_pages
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/markdown-files/<ticker>", methods=["GET"])
def list_markdown_files(ticker):
    """List parsed markdown files for a ticker"""
    md_dir = os.path.join("data/parsed_md", ticker.lower())
    if not os.path.exists(md_dir):
        return jsonify({"files": []})
    
    files = []
    for f in os.listdir(md_dir):
        if f.endswith(".md"):
            path = os.path.join(md_dir, f)
            files.append({
                "filename": f,
                "size_bytes": os.path.getsize(path),
                "modified": os.path.getmtime(path)
            })
    files.sort(key=lambda x: x["filename"], reverse=True)
    return jsonify({"files": files})

@app.route("/api/markdown-content/<ticker>/<filename>", methods=["GET"])
def get_markdown_content(ticker, filename):
    """Returns content of a parsed markdown file"""
    path = os.path.join("data/parsed_md", ticker.lower(), filename)
    if not os.path.exists(path):
        return jsonify({"error": "File not found"}), 404
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    return jsonify({"filename": filename, "content": content})

if __name__ == "__main__":
    os.makedirs("templates", exist_ok=True)
    os.makedirs("static/css", exist_ok=True)
    os.makedirs("static/js", exist_ok=True)
    print("Starting Financial Report OpEx Dashboard at http://127.0.0.1:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)
