#!/usr/bin/env python3
"""
fetch_stock_data.py - Automated Stock Intelligence & Moving Average Calculation Engine

Fetches daily OHLCV and intraday bars for all cataloged corporate entities via yfinance/Yahoo API,
computes MA20/MA60, 52-week High/Low, Day Change, and Period KPIs, and generates
data/stock_data.json for both Flask and GitHub Pages standalone builds.
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime, timezone, timedelta
import pandas as pd
import numpy as np

# Ensure UTF-8 console output
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    import yfinance as yf
except ImportError:
    print("Error: yfinance is required. Install via: pip install yfinance")
    sys.exit(1)

# Canonical company slug to stock exchange symbol mapping
STOCK_TICKER_MAP = {
    "tsmc": {"symbol": "2330.TW", "region": "Taiwan", "currency": "TWD", "exchange": "TWSE"},
    "mediatek": {"symbol": "2454.TW", "region": "Taiwan", "currency": "TWD", "exchange": "TWSE"},
    "foxconn": {"symbol": "2317.TW", "region": "Taiwan", "currency": "TWD", "exchange": "TWSE"},
    "quanta": {"symbol": "2382.TW", "region": "Taiwan", "currency": "TWD", "exchange": "TWSE"},
    "delta": {"symbol": "2308.TW", "region": "Taiwan", "currency": "TWD", "exchange": "TWSE"},
    "wistron": {"symbol": "3231.TW", "region": "Taiwan", "currency": "TWD", "exchange": "TWSE"},
    "pegatron": {"symbol": "4938.TW", "region": "Taiwan", "currency": "TWD", "exchange": "TWSE"},
    "asus": {"symbol": "2357.TW", "region": "Taiwan", "currency": "TWD", "exchange": "TWSE"},
    "realtek": {"symbol": "2379.TW", "region": "Taiwan", "currency": "TWD", "exchange": "TWSE"},
    "umc": {"symbol": "2303.TW", "region": "Taiwan", "currency": "TWD", "exchange": "TWSE"},
    "ase": {"symbol": "3711.TW", "region": "Taiwan", "currency": "TWD", "exchange": "TWSE"},
    "vis": {"symbol": "5347.TWO", "region": "Taiwan", "currency": "TWD", "exchange": "TPEx"},
    "globalwafers": {"symbol": "6488.TWO", "region": "Taiwan", "currency": "TWD", "exchange": "TPEx"},
    "win-semi": {"symbol": "3105.TWO", "region": "Taiwan", "currency": "TWD", "exchange": "TPEx"},
    "ma-tek": {"symbol": "3587.TWO", "region": "Taiwan", "currency": "TWD", "exchange": "TPEx"},
    "psmc": {"symbol": "6770.TW", "region": "Taiwan", "currency": "TWD", "exchange": "TWSE"},
    
    # US & Global Hyperscalers / Semis
    "nvda": {"symbol": "NVDA", "region": "United States", "currency": "USD", "exchange": "NASDAQ"},
    "aapl": {"symbol": "AAPL", "region": "United States", "currency": "USD", "exchange": "NASDAQ"},
    "msft": {"symbol": "MSFT", "region": "United States", "currency": "USD", "exchange": "NASDAQ"},
    "googl": {"symbol": "GOOGL", "region": "United States", "currency": "USD", "exchange": "NASDAQ"},
    "amzn": {"symbol": "AMZN", "region": "United States", "currency": "USD", "exchange": "NASDAQ"},
    "meta": {"symbol": "META", "region": "United States", "currency": "USD", "exchange": "NASDAQ"},
    "tsla": {"symbol": "TSLA", "region": "United States", "currency": "USD", "exchange": "NASDAQ"},
    "amd": {"symbol": "AMD", "region": "United States", "currency": "USD", "exchange": "NASDAQ"},
    "intc": {"symbol": "INTC", "region": "United States", "currency": "USD", "exchange": "NASDAQ"},
    "qcom": {"symbol": "QCOM", "region": "United States", "currency": "USD", "exchange": "NASDAQ"},
    "avgo": {"symbol": "AVGO", "region": "United States", "currency": "USD", "exchange": "NASDAQ"},
    "asml": {"symbol": "ASML", "region": "Netherlands / US", "currency": "USD", "exchange": "NASDAQ"},
    "mu": {"symbol": "MU", "region": "United States", "currency": "USD", "exchange": "NASDAQ"},
    "arm": {"symbol": "ARM", "region": "United Kingdom / US", "currency": "USD", "exchange": "NASDAQ"},
    "txn": {"symbol": "TXN", "region": "United States", "currency": "USD", "exchange": "NASDAQ"},
    "adi": {"symbol": "ADI", "region": "United States", "currency": "USD", "exchange": "NASDAQ"},
    "amat": {"symbol": "AMAT", "region": "United States", "currency": "USD", "exchange": "NASDAQ"},
    "lrcx": {"symbol": "LRCX", "region": "United States", "currency": "USD", "exchange": "NASDAQ"},
    "klac": {"symbol": "KLAC", "region": "United States", "currency": "USD", "exchange": "NASDAQ"},
    "snps": {"symbol": "SNPS", "region": "United States", "currency": "USD", "exchange": "NASDAQ"},
    "cdns": {"symbol": "CDNS", "region": "United States", "currency": "USD", "exchange": "NASDAQ"},
    "mrvl": {"symbol": "MRVL", "region": "United States", "currency": "USD", "exchange": "NASDAQ"},
    "swks": {"symbol": "SWKS", "region": "United States", "currency": "USD", "exchange": "NASDAQ"},
    "ter": {"symbol": "TER", "region": "United States", "currency": "USD", "exchange": "NASDAQ"},
    "nxp": {"symbol": "NXPI", "region": "Netherlands / US", "currency": "USD", "exchange": "NASDAQ"},
    "pltr": {"symbol": "PLTR", "region": "United States", "currency": "USD", "exchange": "NYSE"},
    "lin": {"symbol": "LIN", "region": "United States", "currency": "USD", "exchange": "NYSE"},
    "ttm": {"symbol": "TTMI", "region": "United States", "currency": "USD", "exchange": "NASDAQ"},
    "vsh": {"symbol": "VSH", "region": "United States", "currency": "USD", "exchange": "NYSE"},
    "onds": {"symbol": "ONDS", "region": "United States", "currency": "USD", "exchange": "NASDAQ"},
    "agilent": {"symbol": "A", "region": "United States", "currency": "USD", "exchange": "NYSE"},
    
    # Japan (TSE)
    "advantest": {"symbol": "6857.T", "region": "Japan", "currency": "JPY", "exchange": "TSE"},
    "tel": {"symbol": "8035.T", "region": "Japan", "currency": "JPY", "exchange": "TSE"},
    "shin-etsu": {"symbol": "4063.T", "region": "Japan", "currency": "JPY", "exchange": "TSE"},
    "sumco": {"symbol": "3436.T", "region": "Japan", "currency": "JPY", "exchange": "TSE"},
    "renesas": {"symbol": "6723.T", "region": "Japan", "currency": "JPY", "exchange": "TSE"},
    
    # South Korea (KRX)
    "samsung": {"symbol": "005930.KS", "region": "South Korea", "currency": "KRW", "exchange": "KRX"},
    "sk-hynix": {"symbol": "000660.KS", "region": "South Korea", "currency": "KRW", "exchange": "KRX"},
    
    # Europe (Euronext / Xetra)
    "air-liquide": {"symbol": "AI.PA", "region": "France", "currency": "EUR", "exchange": "Euronext Paris"},
    "merck-kgaa": {"symbol": "MRK.DE", "region": "Germany", "currency": "EUR", "exchange": "XETRA"},
    "infineon": {"symbol": "IFX.DE", "region": "Germany", "currency": "EUR", "exchange": "XETRA"},
    "stm": {"symbol": "STMPA.PA", "region": "France / Europe", "currency": "EUR", "exchange": "Euronext Paris"},
    
    # Benchmark ETF
    "0050": {"symbol": "0050.TW", "region": "Taiwan", "currency": "TWD", "exchange": "TWSE"},
    "0050.tw": {"symbol": "0050.TW", "region": "Taiwan", "currency": "TWD", "exchange": "TWSE"},
    
    # Private / Frontier Companies
    "anduril": {"symbol": None, "is_private": True, "region": "United States", "currency": "USD", "valuation": "$14.0B (Series F)"},
    "anthropic": {"symbol": None, "is_private": True, "region": "United States", "currency": "USD", "valuation": "$18.4B (Amazon/Google)"},
    "chatgpt": {"symbol": None, "is_private": True, "region": "United States", "currency": "USD", "valuation": "$157.0B (Series Oct 2024)"},
    "shield-ai": {"symbol": None, "is_private": True, "region": "United States", "currency": "USD", "valuation": "$2.8B (Series F)"}
}

WEEKDAY_ZH = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"]

def format_date_label(dt: datetime, is_today: bool = False) -> str:
    wd = WEEKDAY_ZH[dt.weekday()]
    today_suffix = " (今日)" if is_today else ""
    return f"{dt.strftime('%Y/%m/%d')} ({wd}) {dt.strftime('%H:%M')}{today_suffix}"

def compute_ma(series: list, window: int) -> list:
    s = pd.Series(series)
    ma = s.rolling(window=window).mean()
    return [None if np.isnan(v) else round(float(v), 3) for v in ma]

def fetch_single_ticker(canon_ticker: str, meta: dict) -> dict:
    if meta.get("is_private") or not meta.get("symbol"):
        return {
            "status": "private",
            "is_private": True,
            "company_slug": canon_ticker,
            "symbol": "PRIVATE",
            "region": meta.get("region", "United States"),
            "currency": meta.get("currency", "USD"),
            "exchange": "Private / Venture-Backed",
            "valuation": meta.get("valuation", "N/A"),
            "note": "Private enterprise not publicly traded on secondary equity markets."
        }

    symbol = meta["symbol"]
    print(f"  [+] Fetching {canon_ticker} ({symbol})...", flush=True)

    try:
        ticker_obj = yf.Ticker(symbol)
        
        # 1. Fetch 5-year daily history
        df_daily = ticker_obj.history(period="5y", interval="1d")
        if df_daily.empty:
            print(f"    [!] Warning: Empty daily history for {symbol}")
            return None

        # 2. Fetch recent intraday (e.g. 5d 15m) for 1D / 1W granular curves
        df_intra = None
        try:
            df_intra = ticker_obj.history(period="5d", interval="15m")
        except Exception:
            df_intra = None

        # Process Daily History
        df_daily = df_daily.dropna(subset=["Close"]).copy()
        daily_dates = [idx.strftime("%Y-%m-%d") for idx in df_daily.index]
        daily_close = [round(float(v), 3) for v in df_daily["Close"].tolist()]
        daily_open = [round(float(v), 3) for v in df_daily["Open"].tolist()]
        daily_high = [round(float(v), 3) for v in df_daily["High"].tolist()]
        daily_low = [round(float(v), 3) for v in df_daily["Low"].tolist()]
        daily_volume = [int(v) for v in df_daily["Volume"].tolist()]

        daily_ma20 = compute_ma(daily_close, 20)
        daily_ma60 = compute_ma(daily_close, 60)

        # Process Intraday Data (if available)
        intra_data = None
        if df_intra is not None and not df_intra.empty:
            df_intra = df_intra.dropna(subset=["Close"]).copy()
            # Pick latest trading date for 1D view
            last_date_str = df_intra.index[-1].strftime("%Y-%m-%d")
            df_today = df_intra[df_intra.index.strftime("%Y-%m-%d") == last_date_str]
            if len(df_today) >= 3:
                intra_dates = [idx.strftime("%H:%M") for idx in df_today.index]
                intra_close = [round(float(v), 3) for v in df_today["Close"].tolist()]
                intra_ma20 = compute_ma(intra_close, 5) # Adaptive intraday fast MA
                intra_ma60 = compute_ma(intra_close, 15) # Adaptive intraday slow MA
                intra_vol = [int(v) for v in df_today["Volume"].tolist()]
                intra_data = {
                    "date": last_date_str,
                    "times": intra_dates,
                    "close": intra_close,
                    "ma20": intra_ma20,
                    "ma60": intra_ma60,
                    "volume": intra_vol
                }

        # Key Metrics
        curr_price = daily_close[-1]
        prev_price = daily_close[-2] if len(daily_close) >= 2 else curr_price
        day_change = round(curr_price - prev_price, 3)
        day_change_pct = round((day_change / prev_price) * 100, 2) if prev_price > 0 else 0.0

        # 52-week High/Low (last 252 trading sessions)
        lookback_52w = min(len(df_daily), 252)
        slice_52w_high = df_daily["High"].iloc[-lookback_52w:]
        slice_52w_low = df_daily["Low"].iloc[-lookback_52w:]
        w52_high = round(float(slice_52w_high.max()), 3) if not slice_52w_high.empty else curr_price
        w52_low = round(float(slice_52w_low.min()), 3) if not slice_52w_low.empty else curr_price

        latest_vol = daily_volume[-1]

        # Timestamp
        last_dt = df_daily.index[-1].to_pydatetime()
        now_dt = datetime.now()
        is_today = (last_dt.date() == now_dt.date())
        date_str = format_date_label(last_dt, is_today=is_today)

        record = {
            "status": "active",
            "company_slug": canon_ticker,
            "symbol": symbol,
            "region": meta.get("region", "Global"),
            "currency": meta.get("currency", "USD"),
            "exchange": meta.get("exchange", "Exchange"),
            "date_str": date_str,
            "current_price": curr_price,
            "day_change": day_change,
            "day_change_pct": day_change_pct,
            "w52_high": w52_high,
            "w52_low": w52_low,
            "latest_volume": latest_vol,
            "daily": {
                "dates": daily_dates,
                "close": daily_close,
                "open": daily_open,
                "high": daily_high,
                "low": daily_low,
                "ma20": daily_ma20,
                "ma60": daily_ma60,
                "volume": daily_volume
            },
            "intraday": intra_data
        }
        return record

    except Exception as e:
        print(f"    [!] Error fetching {symbol}: {e}")
        return None

def fetch_all_stocks(tickers_to_fetch=None) -> dict:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    out_file = os.path.join(base_dir, "data", "stock_data.json")
    os.makedirs(os.path.dirname(out_file), exist_ok=True)

    # Load existing cached database if present to preserve good data
    existing_db = {}
    if os.path.exists(out_file):
        try:
            with open(out_file, "r", encoding="utf-8") as f:
                existing_db = json.load(f)
        except Exception:
            existing_db = {}

    target_keys = tickers_to_fetch if tickers_to_fetch else list(STOCK_TICKER_MAP.keys())
    print(f"\n📈 Initiating Stock Market Fetch for {len(target_keys)} entities...")

    updated_count = 0
    for key in target_keys:
        meta = STOCK_TICKER_MAP.get(key)
        if not meta:
            # Check if key itself is a valid Yahoo ticker
            meta = {"symbol": key.upper(), "region": "Global", "currency": "USD", "exchange": "Global"}

        record = fetch_single_ticker(key, meta)
        if record:
            existing_db[key.lower()] = record
            # If symbol has dot like 2330.TW, also register alias 2330
            sym = record.get("symbol", "")
            if sym and "." in sym:
                existing_db[sym.split(".")[0].lower()] = record
            if sym:
                existing_db[sym.lower()] = record
            updated_count += 1
        elif key.lower() not in existing_db:
            print(f"  [-] Failed to fetch {key} and no previous cache exists.")

        # Respectful polite delay
        time.sleep(0.3)

    # Write updated master stock database
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(existing_db, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Stock database updated: {updated_count}/{len(target_keys)} processed. Saved to {out_file} ({os.path.getsize(out_file)/1024:.1f} KB)\n")
    return existing_db

def main():
    parser = argparse.ArgumentParser(description="Fetch and calculate stock data for corporate catalog.")
    parser.add_argument("--ticker", type=str, help="Specific company slug or symbol to fetch (e.g. tsmc, 0050.TW)")
    parser.add_argument("--all", action="store_true", help="Fetch all cataloged companies")
    args = parser.parse_args()

    if args.ticker:
        fetch_all_stocks([args.ticker])
    else:
        fetch_all_stocks()

if __name__ == "__main__":
    main()
