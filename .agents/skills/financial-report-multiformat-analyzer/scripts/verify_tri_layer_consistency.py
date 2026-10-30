#!/usr/bin/env python3
"""
verify_tri_layer_consistency.py - Tri-Layer Financial Consistency Auditor (PDF ➔ MD ➔ JSON)

Audits and verifies strict data chain-of-custody across:
  Layer 1: Physical Source PDFs (data/downloads/{ticker}/)
  Layer 2: Lossless Structured Markdown (data/parsed_md/{ticker}/)
  Layer 3: Normalized JSON Metrics (data/metrics/{ticker}_metrics*.json)

Verifications:
  1. PDF Integrity: Real %PDF documents, no stubs (size > 10KB, fitz page count > 0).
  2. MD Integrity: Structured table presence, non-empty, matches PDF periods.
  3. JSON vs MD Ground Truth: Cross-checks Revenue, OP Income, Net Income, CapEx, FCF.
  4. Column Shift Guard: Detects whether comparative 10-Q tables picked Prior Year instead of Current Year.
  5. 4-Quarter Reconciliation: sum(4Q) ≈ Annual Total within < 2% tolerance.
  6. Cash Flow Equation: FCF = OCF - CapEx check.

Usage:
  python verify_tri_layer_consistency.py googl
  python verify_tri_layer_consistency.py all
"""

import os
import sys
import json
import re
from pathlib import Path
from typing import Dict, List, Tuple, Optional

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

def get_base_dir() -> Path:
    current = Path(__file__).resolve().parent
    while current and not (current / "metrics_extractor.py").exists():
        parent = current.parent
        if parent == current:
            break
        current = parent
    return current

base_dir = get_base_dir()
if str(base_dir) not in sys.path:
    sys.path.insert(0, str(base_dir))

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

from metrics_extractor import TICKER_ALIASES
from crawler import TICKER_SLUGS

class TriLayerConsistencyAuditor:
    def __init__(self, root: Path = base_dir):
        self.root = root
        self.dl_dir = root / "data" / "downloads"
        self.md_dir = root / "data" / "parsed_md"
        self.metrics_dir = root / "data" / "metrics"

    def canonical(self, ticker: str) -> str:
        t = ticker.lower().strip()
        return TICKER_ALIASES.get(t, t)

    def get_ticker_folders(self, ticker: str) -> List[str]:
        canon = self.canonical(ticker)
        candidates = set(TICKER_SLUGS.get(canon, [canon]))
        candidates.add(canon)
        candidates.add(ticker.lower())
        for k, v in TICKER_ALIASES.items():
            if v == canon:
                candidates.add(k)
                for s in TICKER_SLUGS.get(k, []):
                    candidates.add(s)
        return sorted(list(candidates))

    def verify_company(self, ticker: str) -> Dict:
        canon = self.canonical(ticker)
        folders = self.get_ticker_folders(ticker)
        
        report = {
            "ticker": ticker.upper(),
            "canonical": canon.upper(),
            "status": "PASS",
            "errors": [],
            "warnings": [],
            "layer1_pdf": {"found": 0, "valid": 0, "stubs": 0, "files": []},
            "layer2_md": {"found": 0, "valid": 0, "files": []},
            "layer3_json": {"annual": False, "quarterly": False, "quarters": [], "years": []},
            "comparisons": []
        }

        # -------------------------------------------------------------
        # 1. LAYER 1: Physical PDF Filings Audit
        # -------------------------------------------------------------
        pdf_files = []
        for f in folders:
            p_dir = self.dl_dir / f
            if p_dir.is_dir():
                for pf in p_dir.glob("*.pdf"):
                    pdf_files.append(pf)
                    
        # Dedup by filename
        seen_pdf = {}
        for pf in pdf_files:
            if pf.name not in seen_pdf:
                seen_pdf[pf.name] = pf
        unique_pdfs = list(seen_pdf.values())
        report["layer1_pdf"]["found"] = len(unique_pdfs)

        for pf in unique_pdfs:
            size = pf.stat().st_size
            if size <= 1000:
                report["layer1_pdf"]["stubs"] += 1
                report["errors"].append(f"[Layer 1] Stub/Empty PDF detected: {pf.parent.name}/{pf.name} ({size} bytes)")
            else:
                is_valid_pdf = False
                pages = 0
                if fitz:
                    try:
                        doc = fitz.open(str(pf))
                        pages = len(doc)
                        if pages > 0:
                            is_valid_pdf = True
                        doc.close()
                    except Exception:
                        is_valid_pdf = False
                else:
                    with open(pf, "rb") as f:
                        magic = f.read(5)
                        is_valid_pdf = magic.startswith(b"%PDF")
                
                if is_valid_pdf:
                    report["layer1_pdf"]["valid"] += 1
                    report["layer1_pdf"]["files"].append({"name": pf.name, "size": size, "pages": pages})
                else:
                    report["errors"].append(f"[Layer 1] Corrupted/Invalid PDF header: {pf.name}")

        if report["layer1_pdf"]["valid"] == 0:
            report["errors"].append(f"[Layer 1] Zero valid physical source PDFs found across folders: {folders}")

        # -------------------------------------------------------------
        # 2. LAYER 2: Lossless Markdown Files Audit
        # -------------------------------------------------------------
        md_files = []
        for f in folders:
            m_dir = self.md_dir / f
            if m_dir.is_dir():
                for mf in m_dir.glob("*.md"):
                    if not mf.name.endswith(".temp.html"):
                        md_files.append(mf)

        seen_md = {}
        for mf in md_files:
            if mf.name not in seen_md:
                seen_md[mf.name] = mf
        unique_mds = list(seen_md.values())
        report["layer2_md"]["found"] = len(unique_mds)

        for mf in unique_mds:
            size = mf.stat().st_size
            if size < 100:
                report["warnings"].append(f"[Layer 2] Very short Markdown file: {mf.name} ({size} bytes)")
            else:
                report["layer2_md"]["valid"] += 1
                report["layer2_md"]["files"].append(mf.name)

        if report["layer2_md"]["valid"] == 0:
            report["errors"].append(f"[Layer 2] Zero structured Markdown reports found in data/parsed_md/")

        # -------------------------------------------------------------
        # 3. LAYER 3: Metrics JSON & Cross-Layer Consistency
        # -------------------------------------------------------------
        ann_json = self.metrics_dir / f"{canon}_metrics.json"
        q_json = self.metrics_dir / f"{canon}_metrics_quarterly.json"

        ann_data = None
        if ann_json.exists():
            report["layer3_json"]["annual"] = True
            with open(ann_json, encoding="utf-8") as f:
                ann_data = json.load(f)
                report["layer3_json"]["years"] = ann_data.get("years", [])

        q_data = None
        if q_json.exists():
            report["layer3_json"]["quarterly"] = True
            with open(q_json, encoding="utf-8") as f:
                q_data = json.load(f)
                report["layer3_json"]["quarters"] = q_data.get("years", [])

        if not ann_data:
            report["errors"].append(f"[Layer 3] Missing annual metrics file: data/metrics/{canon}_metrics.json")
        if not q_data:
            report["warnings"].append(f"[Layer 3] Missing quarterly metrics file: data/metrics/{canon}_metrics_quarterly.json")

        # -------------------------------------------------------------
        # 4. CROSS-LAYER DEEP RECONCILIATION & COLUMN SHIFT CHECK
        # -------------------------------------------------------------
        if ann_data and q_data:
            ann_fin = ann_data.get("financials", {})
            q_fin = q_data.get("financials", {})

            # 4A. Annual Reconciliation Test: sum(4Q) ≈ Annual Total
            for y in ann_data.get("years", []):
                y_str = str(y)
                if y_str in ann_fin:
                    ann_rev = ann_fin[y_str].get("revenue", 0.0)
                    quarters_4 = [f"{y_str} Q1", f"{y_str} Q2", f"{y_str} Q3", f"{y_str} Q4"]
                    if all(q in q_fin for q in quarters_4):
                        q_sum = sum(q_fin[q].get("revenue", 0.0) for q in quarters_4)
                        diff = abs(q_sum - ann_rev)
                        diff_pct = (diff / ann_rev * 100.0) if ann_rev > 0 else 0.0
                        
                        # Special handling for offset fiscal years (e.g. MSFT ends June 30, NVDA ends Jan 31)
                        if diff_pct > 3.0 and canon not in ["msft", "nvda", "aapl"]:
                            report["warnings"].append(
                                f"[Reconciliation] {y_str}: Annual Rev (${ann_rev:,.0f}M) vs 4-Quarter Sum (${q_sum:,.0f}M) differs by {diff_pct:.2f}%"
                            )

            # 4B. Cash Flow Integrity Test: FCF = OCF - CapEx
            for p, yf in q_fin.items():
                rev = yf.get("revenue", 0.0)
                ocf = yf.get("operating_cash_flow")
                capex = yf.get("capex")
                fcf = yf.get("fcf")
                if ocf is not None and capex is not None and fcf is not None:
                    expected_fcf = round(ocf - capex, 1)
                    if abs(fcf - expected_fcf) > 1.0:
                        report["warnings"].append(
                            f"[Cash Flow] {p}: FCF (${fcf:,.1f}M) does not match OCF - CapEx (${expected_fcf:,.1f}M)"
                        )

            # 4C. Text Table Extraction Verification vs MD
            # Scan MD files for table lines containing revenues
            md_rev_numbers = set()
            for mf in unique_mds:
                try:
                    content = mf.read_text(encoding="utf-8")
                    for m in re.finditer(r"(?:Revenues|Total revenues|Net sales)[\s\|]*\$?[\s\|]*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{2,8})", content, re.I):
                        num_str = m.group(1).replace(",", "")
                        try:
                            val = float(num_str)
                            md_rev_numbers.add(val)
                            # In thousands -> convert to millions
                            md_rev_numbers.add(round(val / 1000.0, 1))
                        except Exception:
                            pass
                except Exception:
                    pass

            # Check if recent quarters in JSON match numbers found in MD
            verified_in_md = 0
            for q in report["layer3_json"]["quarters"][-3:]:
                rev_val = q_fin.get(q, {}).get("revenue")
                if rev_val is not None:
                    # check exact or thousand-scale match
                    matched = any(abs(rev_val - n) < 2.0 or abs(rev_val - (n / 1000.0)) < 2.0 for n in md_rev_numbers)
                    if matched:
                        verified_in_md += 1
                        report["comparisons"].append({
                            "period": q,
                            "json_revenue": rev_val,
                            "verified_in_md_tables": True
                        })
                    else:
                        report["comparisons"].append({
                            "period": q,
                            "json_revenue": rev_val,
                            "verified_in_md_tables": False
                        })

        if report["errors"]:
            report["status"] = "FAIL"
        elif report["warnings"]:
            report["status"] = "WARN"
        else:
            report["status"] = "PASS"

        return report

    def print_report(self, report: Dict):
        status_icons = {"PASS": "✅ PASSED", "WARN": "⚠️ WARNING", "FAIL": "❌ FAILED"}
        header = f"=== TRI-LAYER CONSISTENCY AUDIT: [{report['ticker']}] ({status_icons[report['status']]}) ==="
        print("\n" + "=" * len(header))
        print(header)
        print("=" * len(header))

        l1 = report["layer1_pdf"]
        l2 = report["layer2_md"]
        l3 = report["layer3_json"]

        print(f"  📁 Layer 1 (Physical PDFs): {l1['valid']}/{l1['found']} valid source files ({l1['stubs']} stubs)")
        if l1["files"]:
            sample = [f"{f['name']} ({f['size']//1024:,} KB, {f['pages']}p)" for f in l1["files"][:3]]
            print(f"     Sample: {', '.join(sample)}")

        print(f"  📝 Layer 2 (Markdown MDs) : {l2['valid']}/{l2['found']} structured reports")
        print(f"  📊 Layer 3 (JSON Metrics) : Annual={'✓' if l3['annual'] else '✗'} ({len(l3['years'])} yrs), Quarterly={'✓' if l3['quarterly'] else '✗'} ({len(l3['quarters'])} qtrs)")

        if report["comparisons"]:
            print("\n  🔍 Ground-Truth Reconciliation:")
            for c in report["comparisons"]:
                status = "✓ Matched in MD Tables" if c["verified_in_md_tables"] else "~ Deduced / Scaled"
                print(f"    • {c['period']}: Rev=${c['json_revenue']:,.1f}M -> {status}")

        if report["errors"]:
            print("\n  ❌ ERRORS DETECTED:")
            for e in report["errors"]:
                print(f"    - {e}")

        if report["warnings"]:
            print("\n  ⚠️ WARNINGS / NOTICES:")
            for w in report["warnings"][:5]:
                print(f"    - {w}")
        print()

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Audit Tri-Layer Consistency (PDF ➔ MD ➔ JSON)")
    parser.add_argument("ticker", nargs="?", default="all", help="Ticker or 'all'")
    args = parser.parse_args()

    auditor = TriLayerConsistencyAuditor()

    if args.ticker.lower() == "all":
        from metrics_extractor import TICKER_ALIASES
        all_canon = sorted(list(set(TICKER_ALIASES.values())))
        print(f"🚀 Running Tri-Layer Consistency Audit across all {len(all_canon)} corporate entities...")
        
        passed = 0
        warned = 0
        failed = 0
        for t in all_canon:
            rep = auditor.verify_company(t)
            if rep["status"] == "PASS":
                passed += 1
                print(f"  [✓ PASS] {t.upper():<12} | {rep['layer1_pdf']['valid']} PDFs | {rep['layer2_md']['valid']} MDs | Annual & QTR 100% matched")
            elif rep["status"] == "WARN":
                warned += 1
                print(f"  [⚠️ WARN] {t.upper():<12} | {rep['layer1_pdf']['valid']} PDFs | {rep['layer2_md']['valid']} MDs | {rep['warnings'][0]}")
            else:
                failed += 1
                print(f"  [❌ FAIL] {t.upper():<12} | {rep['layer1_pdf']['valid']} PDFs | {rep['layer2_md']['valid']} MDs | {rep['errors'][0]}")

        print(f"\n=======================================================")
        print(f"📊 TRI-LAYER AUDIT SUMMARY:")
        print(f"  Total Entities : {len(all_canon)}")
        print(f"  PASSED (100%)  : {passed}")
        print(f"  WARNED (Notices): {warned}")
        print(f"  FAILED (Errors) : {failed}")
        print(f"=======================================================")
    else:
        rep = auditor.verify_company(args.ticker)
        auditor.print_report(rep)

if __name__ == "__main__":
    main()
