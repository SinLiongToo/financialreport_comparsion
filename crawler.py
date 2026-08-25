"""
crawler.py - Scrapes and downloads annual reports from CompaniesMarketCap or direct URLs.
"""
import os
import re
import sys
import time
import urllib.request
import urllib.parse
from bs4 import BeautifulSoup
from typing import List, Dict, Optional, Tuple, Callable

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"


TICKER_SLUGS = {
    "nvda": ["nvidia", "nvda"],
    "nvidia": ["nvidia", "nvda"],
    "tsmc": ["taiwan-semiconductor-manufacturing", "tsmc", "2330"],
    "2330": ["taiwan-semiconductor-manufacturing", "tsmc"],
    "asml": ["asml"],
    "nxp": ["nxp-semiconductors", "nxp", "nxpi"],
    "nxpi": ["nxp-semiconductors", "nxp", "nxpi"],
    "nxp-semiconductors": ["nxp-semiconductors", "nxp"],
    "vsh": ["vishay-intertechnology", "vishay", "vsh"],
    "vishay": ["vishay-intertechnology", "vishay", "vsh"],
    "vishay-intertechnology": ["vishay-intertechnology", "vishay", "vsh"],
    "amd": ["advanced-micro-devices", "amd"],
    "intc": ["intel", "intc"],
    "intel": ["intel", "intc"],
    "qcom": ["qualcomm", "qcom"],
    "qualcomm": ["qualcomm", "qcom"],
    "goog": ["alphabet-google", "google", "googl", "goog"],
    "googl": ["alphabet-google", "google", "googl", "goog"],
    "google": ["alphabet-google", "google", "googl", "goog"],
    "alphabet": ["alphabet-google", "google", "googl", "goog"],
    "alphabet-google": ["alphabet-google", "google", "googl", "goog"],
    "aapl": ["apple", "aapl"],
    "apple": ["apple", "aapl"],
    "apple-inc": ["apple", "aapl"],
    "ase": ["ase-group", "asx", "ase"],
    "asx": ["ase-group", "asx", "ase"],
    "ase-group": ["ase-group", "asx", "ase"],
    "3711": ["ase-group", "asx", "ase"],
    "mu": ["micron-technology", "micron", "mu"],
    "micron": ["micron-technology", "micron", "mu"],
    "micron-technology": ["micron-technology", "micron", "mu"],
    "klac": ["kla", "kla-corporation", "klac"],
    "kla": ["kla", "kla-corporation", "klac"],
    "kla-tencor": ["kla", "kla-corporation", "klac"],
    "kla-corporation": ["kla", "kla-corporation", "klac"],
    "ter": ["teradyne", "ter"],
    "teradyne": ["teradyne", "ter"],
    "teradyne-inc": ["teradyne", "ter"]
}

class AnnualReportCrawler:
    BASE_URL = "https://companiesmarketcap.com"

    def __init__(self, output_base_dir: str = "data/downloads"):
        self.output_base_dir = output_base_dir
        os.makedirs(self.output_base_dir, exist_ok=True)

    @classmethod
    def parse_input(cls, target: str) -> Tuple[str, str]:
        """
        Parses input string into (ticker, preferred_type).
        Examples:
          - https://companiesmarketcap.com/asml/annual-reports-20f/ -> ('asml', 'annual-reports-20f')
          - https://companiesmarketcap.com/tsmc/annual-reports/ -> ('tsmc', 'annual-reports')
          - 'asml' -> ('asml', 'annual-reports-20f')
          - 'nvda' -> ('nvda', 'annual-reports')
        """
        target = target.strip()
        if target.startswith("http://") or target.startswith("https://"):
            parsed = urllib.parse.urlparse(target)
            parts = [p for p in parsed.path.split("/") if p]
            if len(parts) >= 2:
                ticker = parts[0].lower()
                report_type = parts[1].lower()
                return ticker, report_type
            elif len(parts) == 1:
                return parts[0].lower(), "annual-reports"
        
        # Plain ticker input
        ticker = target.lower()
        return ticker, "annual-reports"

    def get_report_urls(self, ticker: str, preferred_type: Optional[str] = None) -> List[str]:
        """Generate candidate URLs for fetching reports with slug resolution"""
        candidates = []
        slugs = TICKER_SLUGS.get(ticker.lower(), [ticker.lower()])
        
        for slug in slugs:
            if preferred_type:
                candidates.append(f"{self.BASE_URL}/{slug}/{preferred_type}/")
            
            # Add common variants (both annual and quarterly)
            candidates.extend([
                f"{self.BASE_URL}/{slug}/quarterly-reports-10q/",
                f"{self.BASE_URL}/{slug}/quarterly-reports/",
                f"{self.BASE_URL}/{slug}/annual-reports-20f/",
                f"{self.BASE_URL}/{slug}/annual-reports/",
                f"{self.BASE_URL}/{slug}/annual-reports-10k/"
            ])
            
        seen = set()
        unique = []
        for url in candidates:
            if url not in seen:
                seen.add(url)
                unique.append(url)
        return unique

    def fetch_reports_list(self, target: str) -> List[Dict]:
        """
        Fetches the list of available annual reports metadata from the webpage.
        """
        ticker, preferred_type = self.parse_input(target)
        urls_to_try = self.get_report_urls(ticker, preferred_type)

        html_found = None
        used_url = None

        for url in urls_to_try:
            try:
                req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
                with urllib.request.urlopen(req, timeout=15) as resp:
                    if resp.status == 200:
                        content = resp.read().decode("utf-8", errors="replace")
                        if "reports-row" in content or "annual-reports" in content or "report-btn" in content:
                            html_found = content
                            used_url = url
                            break
            except Exception:
                continue

        if not html_found:
            raise ValueError(f"Could not fetch annual reports page for target: {target}")

        soup = BeautifulSoup(html_found, "html.parser")
        rows = soup.find_all(class_="reports-row")
        
        reports = []
        for row in rows:
            text = row.get_text(separator=" ", strip=True)
            # Find year
            year_match = re.search(r"(?:FY)?(19\d\d|20\d\d)", text, re.I)
            if not year_match:
                continue
            year = int(year_match.group(1))

            # Quarter check
            q_match = re.search(r"\b(Q[1-4])\b", text, re.I)
            quarter = q_match.group(1).upper() if q_match else None

            # Report title & type
            h2 = row.find(["h2", "h3", "h4", "strong"])
            title = h2.get_text(strip=True) if h2 else (f"Quarterly Report {year} {quarter}" if quarter else f"Annual Report {year}")
            
            is_q = "quarterly" in (used_url or "").lower() or bool(quarter)
            if "20-F" in text or "20-f" in (used_url or "") or "20-F" in title:
                report_type = "20-F"
            elif "10-Q" in text or "10-q" in (used_url or "") or is_q:
                report_type = "10-Q"
            elif "10-K" in text or "10-k" in (used_url or "") or "10-K" in title:
                report_type = "10-K"
            else:
                report_type = "Annual Report"

            # Find PDF download link
            pdf_url = None
            web_url = None
            for a in row.find_all("a", href=True):
                href = a["href"]
                full_href = urllib.parse.urljoin(self.BASE_URL, href)
                if ".pdf" in href.lower() or "save" in href.lower():
                    pdf_url = full_href
                elif "sec-reports" in href.lower() or "annual-report" in href.lower():
                    web_url = full_href

            if not pdf_url and web_url:
                pdf_url = web_url

            if pdf_url:
                reports.append({
                    "ticker": ticker,
                    "year": year,
                    "quarter": quarter,
                    "title": title,
                    "report_type": report_type,
                    "pdf_url": pdf_url,
                    "web_url": web_url
                })

        # Sort descending by year
        reports.sort(key=lambda x: x["year"], reverse=True)
        return reports

    def download_reports(
        self,
        target: str,
        n_years: int = 5,
        year_range: Optional[Tuple[int, int]] = None,
        progress_callback: Optional[Callable[[str, int, int], None]] = None,
        freq: str = "annual"
    ) -> List[Dict]:
        """
        Downloads annual report PDFs for the specified company.
        """
        reports = self.fetch_reports_list(target)
        if not reports:
            return []

        ticker = reports[0]["ticker"]
        ticker_dir = os.path.join(self.output_base_dir, ticker)
        os.makedirs(ticker_dir, exist_ok=True)

        if year_range:
            min_y, max_y = year_range
            selected_reports = [r for r in reports if min_y <= r["year"] <= max_y]
        else:
            is_q = freq == "quarterly" or "quarterly" in target.lower() or any(r.get("quarter") for r in reports)
            limit = n_years * 4 if is_q else n_years
            selected_reports = reports[:limit]

        downloaded_results = []
        total = len(selected_reports)

        for idx, item in enumerate(selected_reports, start=1):
            year = item["year"]
            quarter = item.get("quarter")
            clean_type = item["report_type"].replace(" ", "_")
            if quarter:
                filename = f"{ticker.upper()}_{year}_{quarter}_{clean_type}.pdf"
            else:
                filename = f"{ticker.upper()}_{year}_{clean_type}.pdf"
            file_path = os.path.join(ticker_dir, filename)

            msg = f"Downloading [{idx}/{total}] {filename}..."
            if progress_callback:
                progress_callback(msg, idx, total)
            else:
                print(msg)

            # If already exists and valid size (>10KB)
            if os.path.exists(file_path) and os.path.getsize(file_path) > 10240:
                print(f"  -> File already exists: {filename} ({os.path.getsize(file_path):,} bytes)")
                item_copy = dict(item)
                item_copy["file_path"] = file_path
                item_copy["filename"] = filename
                item_copy["status"] = "already_exists"
                item_copy["file_size"] = os.path.getsize(file_path)
                downloaded_results.append(item_copy)
                continue

            # Download stream with buffer
            try:
                req = urllib.request.Request(item["pdf_url"], headers={"User-Agent": USER_AGENT})
                with urllib.request.urlopen(req, timeout=60) as response, open(file_path, "wb") as out_file:
                    while True:
                        chunk = response.read(65536)
                        if not chunk:
                            break
                        out_file.write(chunk)

                size = os.path.getsize(file_path)
                item_copy = dict(item)
                item_copy["file_path"] = file_path
                item_copy["filename"] = filename
                item_copy["status"] = "downloaded"
                item_copy["file_size"] = size
                downloaded_results.append(item_copy)
                print(f"  -> Successfully downloaded {filename} ({size:,} bytes)")
            except Exception as e:
                print(f"  -> Download failed for {filename}: {e}")
                item_copy = dict(item)
                item_copy["file_path"] = None
                item_copy["filename"] = filename
                item_copy["status"] = f"error: {str(e)}"
                item_copy["file_size"] = 0
                downloaded_results.append(item_copy)

            time.sleep(1)

        return downloaded_results
