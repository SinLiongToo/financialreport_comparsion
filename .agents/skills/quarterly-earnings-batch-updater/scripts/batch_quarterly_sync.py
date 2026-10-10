#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
batch_quarterly_sync.py
Automated batch quarterly synchronization and audit utility.
Part of the quarterly-earnings-batch-updater skill.
"""

import sys
import json
import argparse
from pathlib import Path

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT_DIR = Path(__file__).resolve().parents[4]
METRICS_DIR = ROOT_DIR / "data" / "metrics"
EXTRACTOR_PATH = ROOT_DIR / "metrics_extractor.py"

def get_canonical_map():
    sys.path.insert(0, str(ROOT_DIR))
    try:
        from metrics_extractor import TICKER_ALIASES
        return TICKER_ALIASES
    except Exception as e:
        print(f"[ERROR] Failed to import TICKER_ALIASES: {e}")
        return {}

def audit_quarter_coverage(target_quarter=None):
    aliases = get_canonical_map()
    canonical_tickers = sorted(list(set(aliases.values())))
    print(f"\n========================================================")
    print(f"📊 Quarterly Coverage Audit across {len(canonical_tickers)} Canonical Entities")
    if target_quarter:
        print(f"🎯 Target Quarter: {target_quarter}")
    print(f"========================================================")

    covered = []
    missing_quarter = []
    missing_file = []

    for t in canonical_tickers:
        fpath = METRICS_DIR / f"{t}_metrics_quarterly.json"
        if not fpath.exists():
            missing_file.append(t)
            continue
        try:
            data = json.loads(fpath.read_text(encoding="utf-8"))
            years = data.get("years", [])
            latest_q = years[-1] if years else "None"
            if target_quarter:
                if target_quarter in years:
                    covered.append((t, latest_q))
                else:
                    missing_quarter.append((t, latest_q))
            else:
                covered.append((t, latest_q))
        except Exception as e:
            missing_file.append(f"{t} (read error: {e})")

    print(f"[OK] Total Files Present: {len(canonical_tickers) - len(missing_file)} / {len(canonical_tickers)}")
    if target_quarter:
        print(f"[OK] Entities with '{target_quarter}': {len(covered)} ({len(covered)/len(canonical_tickers)*100:.1f}%)")
        if missing_quarter:
            print(f"[INFO] Entities needing '{target_quarter}' ({len(missing_quarter)}):")
            for t, lq in missing_quarter:
                print(f"   - {t:<20} (Latest available: {lq})")
    else:
        print("\nLatest Quarters Summary:")
        for t, lq in covered[:15]:
            print(f"   - {t:<20}: {lq}")
        if len(covered) > 15:
            print(f"   ... and {len(covered)-15} more entities.")

    if missing_file:
        print(f"\n[WARNING] Missing Quarterly Files ({len(missing_file)}):")
        for m in missing_file:
            print(f"   - {m}")

    return covered, missing_quarter, missing_file

def mirror_aliases():
    aliases = get_canonical_map()
    print(f"\n========================================================")
    print(f"🔄 Mirroring Canonical Metrics to All {len(aliases)} Aliases")
    print(f"========================================================")
    synced = 0
    errors = 0
    for alias, canonical in aliases.items():
        if alias == canonical:
            continue
        src = METRICS_DIR / f"{canonical}_metrics_quarterly.json"
        dst = METRICS_DIR / f"{alias}_metrics_quarterly.json"
        if not src.exists():
            print(f"[WARN] Canonical source missing: {src.name}")
            errors += 1
            continue
        try:
            content = src.read_text(encoding="utf-8")
            dst.write_text(content, encoding="utf-8")
            synced += 1
        except Exception as e:
            print(f"[ERROR] Failed to mirror {canonical} -> {alias}: {e}")
            errors += 1
    print(f"[DONE] Successfully mirrored {synced} alias files (Errors: {errors}).")
    return errors == 0

def sync_extractor_cache():
    aliases = get_canonical_map()
    canonical_tickers = sorted(list(set(aliases.values())))
    print(f"\n========================================================")
    print(f"📦 Synchronizing metrics_extractor.py In-Memory Quarterly Benchmarks")
    print(f"========================================================")
    
    quarterly_db = {}
    for t in canonical_tickers:
        fpath = METRICS_DIR / f"{t}_metrics_quarterly.json"
        if fpath.exists():
            try:
                quarterly_db[t] = json.loads(fpath.read_text(encoding="utf-8"))
            except Exception as e:
                print(f"[WARN] Failed to load {fpath.name}: {e}")

    serialized = json.dumps(quarterly_db, indent=4, ensure_ascii=False)
    content = EXTRACTOR_PATH.read_text(encoding="utf-8")
    
    marker = "BUILTIN_BENCHMARKS_QUARTERLY = "
    idx = content.find(marker)
    if idx == -1:
        print("[ERROR] Could not find BUILTIN_BENCHMARKS_QUARTERLY marker in metrics_extractor.py")
        return False
    
    # Locate dictionary start
    start_brace = content.find("{", idx)
    # Locate end of file or next global variable
    # We find matching closing brace or write clean python file
    # In metrics_extractor.py, BUILTIN_BENCHMARKS_QUARTERLY is at the end of the file
    new_content = content[:idx] + f"BUILTIN_BENCHMARKS_QUARTERLY = {serialized}\n"
    EXTRACTOR_PATH.write_text(new_content, encoding="utf-8")
    print(f"[DONE] Synchronized {len(quarterly_db)} quarterly entities into metrics_extractor.py.")
    return True

def run_validation():
    print(f"\n========================================================")
    print(f"🔍 Running Automated Audit: validate_company.py all")
    print(f"========================================================")
    import subprocess
    script_path = ROOT_DIR / ".agents" / "skills" / "financial-report-multiformat-analyzer" / "scripts" / "validate_company.py"
    res = subprocess.run([sys.executable, str(script_path), "all"], cwd=str(ROOT_DIR))
    return res.returncode == 0

def run_recompile():
    print(f"\n========================================================")
    print(f"⚡ Recompiling Standalone HTML Dashboards: export_standalone.py")
    print(f"========================================================")
    import subprocess
    export_path = ROOT_DIR / "export_standalone.py"
    res = subprocess.run([sys.executable, str(export_path)], cwd=str(ROOT_DIR))
    return res.returncode == 0

def main():
    parser = argparse.ArgumentParser(description="Batch Quarterly Sync & Audit Utility")
    parser.add_argument("--quarter", type=str, help="Target quarter string (e.g. '2026 Q3') to audit")
    parser.add_argument("--mirror-aliases", action="store_true", help="Mirror canonical metrics to all aliases")
    parser.add_argument("--sync-cache", action="store_true", help="Update BUILTIN_BENCHMARKS_QUARTERLY in metrics_extractor.py")
    parser.add_argument("--validate", action="store_true", help="Run validate_company.py all")
    parser.add_argument("--recompile", action="store_true", help="Recompile standalone HTML bundles")
    parser.add_argument("--all", action="store_true", help="Run audit, mirror, sync, validate, and recompile")

    args = parser.parse_args()

    if args.all:
        audit_quarter_coverage(args.quarter)
        mirror_aliases()
        sync_extractor_cache()
        if run_validation():
            run_recompile()
            print("\n🎉 Batch Quarterly Pipeline Fully Executed & Verified!")
        else:
            print("\n❌ Validation failed. Check errors above.")
        return

    if args.mirror_aliases:
        mirror_aliases()
    if args.sync_cache:
        sync_extractor_cache()
    if args.validate:
        run_validation()
    if args.recompile:
        run_recompile()
    if not (args.mirror_aliases or args.sync_cache or args.validate or args.recompile):
        audit_quarter_coverage(args.quarter)

if __name__ == "__main__":
    main()
