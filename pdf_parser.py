"""
pdf_parser.py - Converts Annual Report PDFs to structured, clean Markdown (.md) files.
Extracts text hierarchy, financial statement tables, notes, and metadata.
Includes caching to avoid re-parsing already-converted markdown files.
"""
import os
import re
import sys
import fitz  # PyMuPDF
import pdfplumber
from typing import List, Dict, Optional, Callable

class PDFToMarkdownParser:
    def __init__(self, output_base_dir: str = "data/parsed_md"):
        self.output_base_dir = output_base_dir
        os.makedirs(self.output_base_dir, exist_ok=True)

    @staticmethod
    def table_to_markdown(table: List[List[Optional[str]]]) -> str:
        """Converts 2D list of table cells into clean GitHub-flavored Markdown table"""
        if not table or len(table) < 1:
            return ""

        clean_rows = []
        for row in table:
            if not row:
                continue
            cells = [str(c).replace("\n", " ").strip() if c is not None else "" for c in row]
            if any(cells):
                clean_rows.append(cells)

        if not clean_rows:
            return ""

        col_count = max(len(r) for r in clean_rows)
        if col_count == 0:
            return ""

        normalized = []
        for r in clean_rows:
            padded = r + [""] * (col_count - len(r))
            normalized.append(padded)

        header = normalized[0]
        header_line = "| " + " | ".join(header) + " |"
        sep_line = "| " + " | ".join(["---"] * col_count) + " |"

        body_lines = []
        for r in normalized[1:]:
            body_lines.append("| " + " | ".join(r) + " |")

        return "\n" + header_line + "\n" + sep_line + "\n" + "\n".join(body_lines) + "\n\n"

    def parse_pdf(
        self,
        pdf_path: str,
        max_pages: Optional[int] = None,
        extract_tables: bool = True,
        force_reparse: bool = False,
        progress_callback: Optional[Callable[[str, int, int], None]] = None
    ) -> Dict:
        """
        Parses a single PDF into structured Markdown text and saves it as .md file.
        Skips re-parsing if markdown file already exists and is valid, unless force_reparse=True.
        """
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF not found: {pdf_path}")

        filename = os.path.basename(pdf_path)
        base_name = os.path.splitext(filename)[0]
        
        parts = base_name.split("_")
        ticker = parts[0].lower() if len(parts) > 1 else "default"
        ticker_out_dir = os.path.join(self.output_base_dir, ticker)
        os.makedirs(ticker_out_dir, exist_ok=True)
        
        out_md_path = os.path.join(ticker_out_dir, f"{base_name}.md")

        # Caching: If .md already exists and size > 1000 bytes
        if not force_reparse and os.path.exists(out_md_path) and os.path.getsize(out_md_path) > 1000:
            if progress_callback:
                progress_callback(f"Cached {base_name}.md ready", 1, 1)
            return {
                "source_pdf": pdf_path,
                "output_md": out_md_path,
                "filename": f"{base_name}.md",
                "ticker": ticker,
                "total_pages": 0,
                "processed_pages": 0,
                "char_count": os.path.getsize(out_md_path),
                "file_size": os.path.getsize(out_md_path),
                "status": "cached"
            }

        doc = fitz.open(pdf_path)
        total_pages = len(doc)
        pages_to_process = min(total_pages, max_pages) if max_pages else total_pages

        md_content = []
        md_content.append(f"# Annual Report: {base_name}\n")
        md_content.append(f"- **Source File**: `{filename}`")
        md_content.append(f"- **Total Pages**: {total_pages}")
        md_content.append(f"- **Parsed Pages**: {pages_to_process}\n")
        md_content.append("---\n")

        plumber_doc = None
        if extract_tables:
            try:
                plumber_doc = pdfplumber.open(pdf_path)
            except Exception as e:
                print(f"Warning: Could not open pdfplumber for tables: {e}")

        for page_idx in range(pages_to_process):
            msg = f"Parsing {filename} [Page {page_idx+1}/{pages_to_process}]..."
            if progress_callback:
                progress_callback(msg, page_idx + 1, pages_to_process)

            md_content.append(f"\n## Page {page_idx + 1}\n")

            if plumber_doc and page_idx < len(plumber_doc.pages):
                try:
                    p_page = plumber_doc.pages[page_idx]
                    tables = p_page.extract_tables()
                    if tables:
                        for t_idx, tbl in enumerate(tables):
                            t_md = self.table_to_markdown(tbl)
                            if t_md.strip():
                                md_content.append(f"### Table {page_idx+1}.{t_idx+1}\n" + t_md)
                except Exception:
                    pass

            page = doc[page_idx]
            blocks = page.get_text("blocks")
            
            for b in blocks:
                text = b[4].strip()
                if not text:
                    continue
                lines = text.split("\n")
                if len(lines) == 1 and len(text) < 80 and not text.endswith("."):
                    if text.isupper():
                        md_content.append(f"\n### {text}\n")
                    else:
                        md_content.append(f"\n#### {text}\n")
                else:
                    md_content.append(f"{text}\n")

        if plumber_doc:
            plumber_doc.close()
        doc.close()

        full_md = "\n".join(md_content)
        with open(out_md_path, "w", encoding="utf-8") as f:
            f.write(full_md)

        return {
            "source_pdf": pdf_path,
            "output_md": out_md_path,
            "filename": f"{base_name}.md",
            "ticker": ticker,
            "total_pages": total_pages,
            "processed_pages": pages_to_process,
            "char_count": len(full_md),
            "file_size": os.path.getsize(out_md_path),
            "status": "parsed"
        }
