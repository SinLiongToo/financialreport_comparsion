#!/usr/bin/env python3
"""
validate_company.py - Automated integrity audit & sanity checker for company metrics and dashboard compatibility.
"""

import os
import sys
import json
import re
import glob

# Ensure UTF-8 output
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def get_base_dir():
    current = os.path.dirname(os.path.abspath(__file__))
    while current and not os.path.exists(os.path.join(current, "metrics_extractor.py")):
        parent = os.path.dirname(current)
        if parent == current:
            break
        current = parent
    return current

base_dir = get_base_dir()
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

def validate_company(ticker: str):
    base_dir = get_base_dir()
    ticker = ticker.lower()
    errors = []
    warnings = []

    print(f"\n🔍 Auditing Company: [{ticker.upper()}] ...")

    # 1. Check data/metrics JSON files
    ann_json_path = os.path.join(base_dir, "data", "metrics", f"{ticker}_metrics.json")
    q_json_path = os.path.join(base_dir, "data", "metrics", f"{ticker}_metrics_quarterly.json")

    if not os.path.exists(ann_json_path):
        errors.append(f"Missing annual metrics file: data/metrics/{ticker}_metrics.json")
        ann_data = None
    else:
        with open(ann_json_path, "r", encoding="utf-8") as f:
            ann_data = json.load(f)

    if not os.path.exists(q_json_path):
        warnings.append(f"Missing quarterly metrics file: data/metrics/{ticker}_metrics_quarterly.json")
        q_data = None
    else:
        with open(q_json_path, "r", encoding="utf-8") as f:
            q_data = json.load(f)

    # 2. Audit Annual Metrics Data & Chart 6
    if ann_data:
        years = ann_data.get("years", [])
        fin = ann_data.get("financials", {})
        if len(years) < 3:
            errors.append(f"Annual years list has only {len(years)} entries, minimum 3 required.")
        for y in years:
            y_str = str(y)
            if y_str not in fin:
                errors.append(f"Year '{y_str}' declared in 'years' but missing from 'financials'.")
            else:
                yf = fin[y_str]
                if not yf.get("revenue"):
                    errors.append(f"Year '{y_str}' missing valid 'revenue'.")
                if not yf.get("headcount"):
                    warnings.append(f"Year '{y_str}' missing 'headcount'.")

        # Check Chart 6 Sales Breakdown
        sb = ann_data.get("sales_breakdown", {})
        cats = sb.get("categories", [])
        sb_data = sb.get("data", {})
        if not cats:
            errors.append("Chart 6: 'sales_breakdown.categories' is empty.")
        if not sb_data:
            errors.append("Chart 6: 'sales_breakdown.data' is empty.")
        else:
            for y_str in sb_data:
                entry = sb_data[y_str]
                if not isinstance(entry, dict) or "value" not in entry or "volume" not in entry:
                    errors.append(f"Chart 6: Year '{y_str}' data is NOT in mandatory {{'value': [...], 'volume': [...]}} format!")
                else:
                    if len(entry["value"]) != len(cats):
                        errors.append(f"Chart 6: Year '{y_str}' value length ({len(entry['value'])}) mismatch with categories ({len(cats)}).")
                    if len(entry["volume"]) != len(cats):
                        errors.append(f"Chart 6: Year '{y_str}' volume length ({len(entry['volume'])}) mismatch with categories ({len(cats)}).")

    # 3. Check metrics_extractor.py registration
    from metrics_extractor import FinancialMetricsExtractor, BUILTIN_BENCHMARKS, BUILTIN_BENCHMARKS_QUARTERLY, TICKER_ALIASES
    canon = FinancialMetricsExtractor.canonical_ticker(ticker)
    if canon not in BUILTIN_BENCHMARKS:
        errors.append(f"Ticker '{ticker}' (canon: '{canon}') NOT found in BUILTIN_BENCHMARKS in metrics_extractor.py")
    if canon not in BUILTIN_BENCHMARKS_QUARTERLY:
        warnings.append(f"Ticker '{ticker}' (canon: '{canon}') NOT found in BUILTIN_BENCHMARKS_QUARTERLY in metrics_extractor.py")

    # 4. Check static/js/dashboard.js
    js_path = os.path.join(base_dir, "static", "js", "dashboard.js")
    with open(js_path, "r", encoding="utf-8") as f:
        js_code = f.read()

    if f'"{ticker}":' not in js_code and f'"{canon}":' not in js_code:
        warnings.append(f"Ticker '{ticker}' not found in dashboard.js COMPANY_COLORS or COMPANY_COUNTRIES.")
    if f'"{canon.upper()}":' not in js_code:
        warnings.append(f"Ticker '{canon.upper()}' friendly name not defined in dashboard.js friendlyNames.")

    # Summary
    if errors:
        print(f"❌ FAILED with {len(errors)} error(s):")
        for e in errors:
            print(f"   - 🔴 {e}")
    else:
        print(f"✅ PASSED: All metrics, Chart 6 structures, and aliases are valid for [{ticker.upper()}].")

    if warnings:
        print(f"⚠️  {len(warnings)} warning(s):")
        for w in warnings:
            print(f"   - 🟡 {w}")

    return len(errors) == 0

def validate_all():
    from metrics_extractor import BUILTIN_BENCHMARKS
    all_passed = True
    for ticker in BUILTIN_BENCHMARKS.keys():
        ok = validate_company(ticker)
        if not ok:
            all_passed = False
    return all_passed

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "all"
    if target == "all":
        success = validate_all()
    else:
        success = validate_company(target)
    sys.exit(0 if success else 1)
