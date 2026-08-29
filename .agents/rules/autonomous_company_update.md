# Autonomous Company Update Rule

- Whenever the user asks to add or update any company, execute the complete pipeline (crawl, download, parse to markdown, extract metrics, register in backend & frontend, audit with `validate_company.py`, and recompile `export_standalone.py`) fully autonomously without prompting the user.
- Strictly confine all operations to this project workspace only. Never modify any external directories or files.
- Ensure Chart 6 `sales_breakdown.data[year]` always has `{"value": [...], "volume": [...]}`.
