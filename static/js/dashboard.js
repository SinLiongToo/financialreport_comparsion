/**
 * dashboard.js - Financial & OpEx Strategic Alignment Dashboard
 * Features:
 *   - Single Company Deep Dive (6 full Plotly auto-scaling charts, Master Table, Markdown Viewer)
 *   - Multi-Company Peer Comparison Mode (Gross Margin, Rev/FTE, Op Margin, R&D Intensity)
 *   - Instant Bilingual Toggle (English / 繁體中文)
 *   - Two-Way Synchronized Inputs with Cache-Busting Reloads
 *   - Interactive Help & User Guide Modal
 *   - CSV Export for Single & Comparison Matrices
 */

let CURRENT_LANGUAGE = "en";
let CURRENT_THEME = localStorage.getItem("app_theme") || "dark";
let CURRENT_FREQ = "annual"; // "annual" | "quarterly"
let GLOBAL_METRICS_DATA = null;
let COMPARISON_DATA = null;
let ACTIVE_VIEW = "single"; // "single" | "compare"

const COMPANY_COLORS = {
    "asml": "#00A3E0",
    "tsmc": "#EF4444",
    "nvda": "#22C55E",
    "nxp": "#F59E0B",
    "nxpi": "#F59E0B",
    "vsh": "#8B5CF6",
    "vishay": "#8B5CF6",
    "amat": "#EC4899"
};

const DEFAULT_PALETTE = ["#00A3E0", "#EF4444", "#22C55E", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6", "#3B82F6"];

const I18N_DICT = {
    en: {
        badge_workflow: "One-Click Workflow",
        header_subtitle: "Annual Reports Crawler (20-F/10-K) ➔ Markdown Parser ➔ Productivity & Strategic Alignment",
        btn_user_guide: "User Guide & Help",
        theme_light: "Light",
        theme_dark: "Dark",
        freq_annual: "Annual (10-K)",
        freq_quarterly: "Quarterly (10-Q)",
        label_time_horizon: "Horizon (N Periods)",
        btn_refresh: "Reload",
        tab_single_view: "Single Company Deep Dive",
        tab_compare_view: "Multi-Company Peer Comparison",
        panel_title: "One-Click Automated Workflow Console",
        panel_subtitle: "Supports URL or Ticker (e.g. ASML, TSMC, NVDA, NXP, VSH)",
        label_target: "Target URL or Company Ticker",
        label_years: "Years (N Years)",
        btn_run_workflow: "Run End-to-End Workflow",
        kpi_revenue_title: "Total Revenue",
        kpi_gm_title: "Gross Margin %",
        kpi_op_title: "Operating Income",
        kpi_rd_title: "R&D Expense",
        kpi_hc_title: "Total Headcount",
        kpi_gp_emp_title: "Gross Profit / FTE",
        chart1_title: "Chart 1: Headcount vs. Gross Margin % (The Pivot)",
        chart2_title: "Chart 2: Human Capital Productivity Trio (Rev / GP / OpIncome per FTE)",
        chart3_title: "Chart 3: Operating Profitability & Leverage (OpIncome & Margins)",
        chart4_title: "Chart 4: R&D Expense & Technology Moat Intensity",
        chart5_title: "Chart 5: Profit vs. Headcount Growth Dynamics (YoY Triangulation)",
        chart6_title: "Chart 6: Value-vs-Volume Sales Asymmetry Breakdown",
        table_title: "Official Audited Master Financial & Productivity Statement",
        table_subtitle: "Comprehensive breakdown of Revenue, Margins, R&D, Headcount, and Productivity per FTE",
        table_th_metric: "Metric / Unit",
        btn_export_csv: "Export CSV",
        md_viewer_title: "Parsed Markdown Annual Reports Browser",
        md_viewer_subtitle: "Ready to copy & paste directly into LLMs (Gemini / Claude / ChatGPT)",
        btn_copy_md: "Copy Markdown",
        lang_toggle_btn: "繁體中文",
        modal_guide_title: "Financial & OpEx Dashboard User Guide",
        modal_guide_subtitle: "Architecture, Workflow Execution, Chart Interpretation & LLM Prompts",
        guide_sec1_title: "1. One-Click End-to-End Workflow Execution",
        guide_sec1_p1: "Enter any target company (e.g. ASML, TSMC, NVDA, NXP, VSH, AMAT) or a full CompaniesMarketCap URL, choose the number of years (3 to 10), and click 'Run End-to-End Workflow'.",
        guide_sec_compare_title: "2. Multi-Company Peer Comparison Mode",
        guide_sec_compare_p: "Switch between 'Single Company Deep Dive' and 'Multi-Company Peer Comparison' at the top. In comparison mode, check multiple companies to analyze cross-company Gross Margin pricing power, Human Capital Productivity ROI ($/FTE), Operating Leverage, and R&D Reinvestment Intensity side-by-side.",
        guide_sec2_title: "3. Top Switcher vs. Bottom Console (Two-Way Synchronization)",
        guide_sec3_title: "4. Visual Charts & Strategic OpEx Framework Guide",
        guide_sec4_title: "5. Form 10-K vs. Form 20-F Compatibility",
        guide_sec4_p: "Foreign issuers (ASML, TSMC) submit Form 20-F (Item 3.A summary on pages 5-15), while US domestic corporations (NVIDIA, NXP, Vishay) submit Form 10-K (Item 8 financial statements on pages 35-70). The parser automatically detects and cross-scans both structures seamlessly.",
        guide_sec5_title: "6. Using Parsed Markdown with LLMs (Gemini / Claude / ChatGPT)",
        guide_sec5_p: "Select any parsed .md file in the bottom browser, click 'Copy Markdown', and paste it into Gemini with fininacial_prompt.md or sale_breakdown.md for instant 16:9 executive presentation decks and pitch scripts.",
        compare_selector_title: "Multi-Company Peer Benchmark Selection",
        compare_selector_subtitle: "Select 2 or more companies to compare Gross Margin, Productivity, Operating Leverage & R&D Intensity",
        btn_select_all: "Select All",
        btn_clear: "Clear",
        compare_chart1_title: "Gross Margin % Trajectory Benchmark",
        compare_chart1_desc: "Cross-company pricing power comparison: Leading-edge semiconductors (NVDA, TSMC) vs. equipment (ASML) vs. automotive (NXP) vs. passives (VSH).",
        compare_chart2_title: "Revenue & Gross Profit per FTE Benchmark ($)",
        compare_chart2_desc: "Human capital leverage: Quantifying revenue and gross margin generated per full-time employee across different business models.",
        compare_chart3_title: "Operating Margin % & Profitability Benchmark",
        compare_chart3_desc: "Pure operational profitability: Evaluates operating efficiency and OpEx discipline through cyclical semiconductor demand fluctuations.",
        compare_chart4_title: "R&D Intensity (% of Revenue) Moat Benchmark",
        compare_chart4_desc: "Reinvestment intensity: Highlighting R&D allocation to pioneer next-generation architectures (High-NA EUV, 2nm, Blackwell, SDV).",
        compare_table_title: "Cross-Company Peer Benchmark Matrix (Latest Audited Year)",
        compare_table_subtitle: "Side-by-side comparison of Revenue, Profitability, Headcount, and Human Capital Productivity",
        btn_export_compare_csv: "Export Comparison CSV"
    },
    zh: {
        badge_workflow: "一步到位工作流",
        header_subtitle: "年報爬蟲 (20-F/10-K) ➔ Markdown 解析 ➔ 產值精算與戰略對齊",
        btn_user_guide: "使用說明與指南 (Help)",
        theme_light: "明亮模式",
        theme_dark: "暗黑模式",
        freq_annual: "年度 (10-K)",
        freq_quarterly: "季度 (10-Q/6-K)",
        label_time_horizon: "分析週期長度 (N 期)",
        btn_refresh: "重新載入",
        tab_single_view: "單一公司深入分析",
        tab_compare_view: "多公司橫向對比模組",
        panel_title: "一步到位全自動工作流控制台",
        panel_subtitle: "支援直接輸入網址或公司代碼 (如 ASML, TSMC, NVDA, NXP, VSH)",
        label_target: "目標公司網址或股票代碼",
        label_years: "回溯年數 (N 年)",
        btn_run_workflow: "立即執行全自動工作流",
        kpi_revenue_title: "營業收入總額",
        kpi_gm_title: "GAAP 毛利率 %",
        kpi_op_title: "營業利益總額",
        kpi_rd_title: "研發費用總額",
        kpi_hc_title: "全球員工總數",
        kpi_gp_emp_title: "人均毛利產值",
        chart1_title: "圖表 1：員工人數 vs. 毛利率走勢（人力拐點）",
        chart2_title: "圖表 2：人均產值三合一（人均營收 / 毛利 / 營業利益）",
        chart3_title: "圖表 3：營業利益率與獲利能力趨勢（營運槓桿）",
        chart4_title: "圖表 4：研發投入支出與技術護城河強度",
        chart5_title: "圖表 5：獲利 vs. 人力成長動態（年增率三角交叉驗證）",
        chart6_title: "圖表 6：銷售結構不對稱性（價值 vs. 出貨數量雙面板分析）",
        table_title: "官方審計母體財務與產值精算總表",
        table_subtitle: "完整呈現營業收入、毛利率、研發支出、員工人數與人均產值核心指標",
        table_th_metric: "財務指標 / 單位",
        btn_export_csv: "匯出 CSV 報表",
        md_viewer_title: "結構化 Markdown 年報瀏覽器",
        md_viewer_subtitle: "可一鍵複製並直接貼入 LLM (Gemini / Claude / ChatGPT) 產出簡報與講稿",
        btn_copy_md: "複製 Markdown",
        lang_toggle_btn: "English",
        modal_guide_title: "財務與人均產值戰略儀表板操作指南 (User Guide)",
        modal_guide_subtitle: "工作流執行、圖表戰略解讀、10-K/20-F 格式與 LLM 提示詞應用",
        guide_sec1_title: "1. 一步到位全自動工作流操作",
        guide_sec1_p1: "輸入任何目標公司（如 ASML、TSMC、NVDA、NXP、VSH、AMAT）或 CompaniesMarketCap 網址，選擇年數（3 至 10 年），點擊「立即執行一步到位工作流」即可全自動完成下載、轉檔、指標計算與圖表繪製。",
        guide_sec_compare_title: "2. 多公司橫向對比模組 (Peer Comparison)",
        guide_sec_compare_p: "在頂部標籤頁切換「單一公司深入分析」與「多公司橫向對比模組」。在對比模式下自由勾選多家公司，即可在同屏並排對比各企業之毛利率走勢、人均產值 ($/FTE)、營業利益率與研發護城河強度。",
        guide_sec2_title: "3. 右上角切換選單 vs. 下方控制台（雙向即時連動）",
        guide_sec3_title: "4. 六大視覺圖表與戰略分析框架解讀指南",
        guide_sec4_title: "5. 美股 10-K 與外國企業 20-F 格式完全相容",
        guide_sec4_p: "外國發行人（ASML, TSMC）提交 20-F（Item 3.A 集中於前 15 頁），美股本土企業（NVIDIA, NXP, Vishay）提交 10-K（Item 8 損益表位於 35~70 頁）。解析器全面自動跨頁掃描，確保數據 100% 精準。",
        guide_sec5_title: "6. 搭配大型語言模型 (Gemini / Claude / ChatGPT) 生成簡報講稿",
        guide_sec5_p: "在下方檔案瀏覽器選取解析後的 .md 檔案，點擊「複製 Markdown」，貼入 Gemini 並搭配專案內的 fininacial_prompt.md 或 sale_breakdown.md，即可在 5 秒內產出 16:9 簡報草圖與高階主管口說講稿。",
        compare_selector_title: "多公司橫向對比勾選區",
        compare_selector_subtitle: "自由勾選 2 家以上公司進行毛利率、人均產值、營業利益率與研發強度之橫向對比",
        btn_select_all: "全選",
        btn_clear: "清除",
        compare_chart1_title: "毛利率走勢跨公司對比 (Gross Margin %)",
        compare_chart1_desc: "跨公司產品定價權與護城河對比：先進半導體 (NVDA, TSMC) vs. 設備霸主 (ASML) vs. 車用晶片 (NXP) vs. 分離式元件 (VSH)。",
        compare_chart2_title: "人均營收與人均毛利產值對比 ($ / FTE)",
        compare_chart2_desc: "人力資本槓桿量化：衡量不同商業模式下每位全職員工創造的營收與毛利回報率。",
        compare_chart3_title: "營業利益率與獲利能力對比 (Operating Margin %)",
        compare_chart3_desc: "純營業利潤率：評估半導體需求週期波動下各公司的營運效率與固定成本吸收能力。",
        compare_chart4_title: "研發強度佔營收比重對比 (R&D % of Revenue)",
        compare_chart4_desc: "技術護城河再投資力度：展現推動次世代架構 (High-NA EUV, 2nm, Blackwell, SDV) 的研發資源承諾。",
        compare_table_title: "跨公司基準對比矩陣 (最新官方審計年度)",
        compare_table_subtitle: "並排檢視各公司營收、毛利、營業利益、全球員工人數與人均產值指標",
        btn_export_compare_csv: "匯出對比 CSV 報表"
    }
};

document.addEventListener("DOMContentLoaded", () => {
    initDashboard();
});

async function initDashboard() {
    applyTheme(CURRENT_THEME);
    setupEventListeners();
    setupThemeToggle();
    setupFrequencyToggle();
    setupTabs();
    setupHelpModal();
    applyLanguage(CURRENT_LANGUAGE);
    await loadCompaniesList();
    await loadDashboardData();
}

function setupFrequencyToggle() {
    const btnAnnual = document.getElementById("freqAnnualBtn");
    const btnQuarterly = document.getElementById("freqQuarterlyBtn");

    if (btnAnnual && btnQuarterly) {
        btnAnnual.addEventListener("click", () => {
            if (CURRENT_FREQ === "annual") return;
            CURRENT_FREQ = "annual";
            btnAnnual.className = "bg-blue-600 text-white px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1 shadow-sm";
            btnQuarterly.className = "text-slate-300 hover:text-white px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1";
            if (ACTIVE_VIEW === "single") loadDashboardData();
            else loadComparisonData();
        });

        btnQuarterly.addEventListener("click", () => {
            if (CURRENT_FREQ === "quarterly") return;
            CURRENT_FREQ = "quarterly";
            btnQuarterly.className = "bg-amber-600 text-white px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1 shadow-sm";
            btnAnnual.className = "text-slate-300 hover:text-white px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1";
            if (ACTIVE_VIEW === "single") loadDashboardData();
            else loadComparisonData();
        });
    }
}

function applyTheme(theme) {
    CURRENT_THEME = theme;
    localStorage.setItem("app_theme", theme);
    const body = document.body;
    const icon = document.getElementById("themeIcon");
    const label = document.getElementById("themeLabel");

    if (theme === "light") {
        body.classList.add("light-theme");
        if (icon) icon.className = "fa-solid fa-moon text-indigo-400";
        if (label) label.textContent = CURRENT_LANGUAGE === "zh" ? "暗黑模式" : "Dark";
    } else {
        body.classList.remove("light-theme");
        if (icon) icon.className = "fa-solid fa-sun text-amber-300";
        if (label) label.textContent = CURRENT_LANGUAGE === "zh" ? "明亮模式" : "Light";
    }

    // Re-render active charts with updated theme colors if data exists
    if (GLOBAL_METRICS_DATA && ACTIVE_VIEW === "single") {
        renderCharts(GLOBAL_METRICS_DATA);
    } else if (COMPARISON_DATA && ACTIVE_VIEW === "compare") {
        renderComparisonView(COMPARISON_DATA);
    }
}

function setupThemeToggle() {
    const btn = document.getElementById("themeToggleBtn");
    if (btn) {
        btn.addEventListener("click", () => {
            const nextTheme = CURRENT_THEME === "dark" ? "light" : "dark";
            applyTheme(nextTheme);
        });
    }
}

function setupTabs() {
    const tabSingle = document.getElementById("tabSingleView");
    const tabCompare = document.getElementById("tabCompareView");
    const singleContainer = document.getElementById("singleViewContainer");
    const compareContainer = document.getElementById("compareViewContainer");

    if (!tabSingle || !tabCompare) return;

    tabSingle.addEventListener("click", () => {
        ACTIVE_VIEW = "single";
        tabSingle.className = "px-4 py-2 text-xs font-bold border-b-2 border-blue-500 text-blue-400 flex items-center gap-2 transition-all";
        tabCompare.className = "px-4 py-2 text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 transition-all";
        singleContainer.classList.remove("hidden");
        compareContainer.classList.add("hidden");
        // Trigger resize for plotly charts
        window.dispatchEvent(new Event("resize"));
    });

    tabCompare.addEventListener("click", () => {
        ACTIVE_VIEW = "compare";
        tabCompare.className = "px-4 py-2 text-xs font-bold border-b-2 border-indigo-500 text-indigo-400 flex items-center gap-2 transition-all";
        tabSingle.className = "px-4 py-2 text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 transition-all";
        compareContainer.classList.remove("hidden");
        singleContainer.classList.add("hidden");
        loadComparisonData();
    });
}

function setupHelpModal() {
    const helpModal = document.getElementById("helpModal");
    const helpBtn = document.getElementById("helpGuideBtn");
    const closeBtn = document.getElementById("closeHelpModalBtn");
    const closeFooterBtn = document.getElementById("closeHelpModalFooterBtn");

    if (helpBtn && helpModal) {
        helpBtn.addEventListener("click", () => helpModal.classList.remove("hidden"));
    }
    const hideModal = () => helpModal && helpModal.classList.add("hidden");
    if (closeBtn) closeBtn.addEventListener("click", hideModal);
    if (closeFooterBtn) closeFooterBtn.addEventListener("click", hideModal);
    if (helpModal) {
        helpModal.addEventListener("click", (e) => {
            if (e.target === helpModal) hideModal();
        });
    }
}

function setupEventListeners() {
    const langBtn = document.getElementById("langToggleBtn");
    if (langBtn) {
        langBtn.addEventListener("click", () => {
            CURRENT_LANGUAGE = CURRENT_LANGUAGE === "en" ? "zh" : "en";
            applyLanguage(CURRENT_LANGUAGE);
            if (GLOBAL_METRICS_DATA) updateInsightsText(GLOBAL_METRICS_DATA);
            if (ACTIVE_VIEW === "compare" && COMPARISON_DATA) renderComparisonView(COMPARISON_DATA);
        });
    }

    const companySelect = document.getElementById("companySelect");
    if (companySelect) {
        companySelect.addEventListener("change", (e) => {
            const selectedTicker = e.target.value;
            syncTargetInputWithTicker(selectedTicker);
            loadDashboardData(selectedTicker);
        });
    }

    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            if (ACTIVE_VIEW === "single") {
                loadDashboardData();
            } else {
                loadComparisonData();
            }
        });
    }

    const runBtn = document.getElementById("runWorkflowBtn");
    if (runBtn) runBtn.addEventListener("click", handleRunWorkflow);

    const exportCsvBtn = document.getElementById("exportCsvBtn");
    if (exportCsvBtn) exportCsvBtn.addEventListener("click", exportTableToCSV);

    const exportCompareCsvBtn = document.getElementById("exportCompareCsvBtn");
    if (exportCompareCsvBtn) exportCompareCsvBtn.addEventListener("click", exportComparisonToCSV);

    const selectAllBtn = document.getElementById("selectAllCompareBtn");
    if (selectAllBtn) {
        selectAllBtn.addEventListener("click", () => {
            const boxes = document.querySelectorAll(".compare-chk");
            boxes.forEach(b => b.checked = true);
            loadComparisonData();
        });
    }

    const clearAllBtn = document.getElementById("clearAllCompareBtn");
    if (clearAllBtn) {
        clearAllBtn.addEventListener("click", () => {
            const boxes = document.querySelectorAll(".compare-chk");
            boxes.forEach(b => b.checked = false);
            // keep at least the first one
            if (boxes.length > 0) boxes[0].checked = true;
            loadComparisonData();
        });
    }
}

function syncTargetInputWithTicker(ticker) {
    const input = document.getElementById("targetInput");
    if (!input) return;
    const t = ticker.toLowerCase();
    if (t === "asml") input.value = "https://companiesmarketcap.com/asml/annual-reports-20f/";
    else if (t === "tsmc") input.value = "https://companiesmarketcap.com/tsmc/annual-reports/";
    else if (t === "nvda" || t === "nvidia") input.value = "https://companiesmarketcap.com/nvidia/annual-reports/";
    else if (t === "nxp" || t === "nxpi") input.value = "https://companiesmarketcap.com/nxp-semiconductors/annual-reports/";
    else if (t === "vsh" || t === "vishay") input.value = "https://companiesmarketcap.com/vishay-intertechnology/annual-reports/";
    else input.value = ticker.toUpperCase();
}

function applyLanguage(lang) {
    const dict = I18N_DICT[lang] || I18N_DICT.en;
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (dict[key]) el.textContent = dict[key];
    });

    const langLabel = document.getElementById("currentLangLabel");
    if (langLabel) langLabel.textContent = dict.lang_toggle_btn;
}

// -----------------------------------------------------------------------------
// Load Company Dropdown & Compare Checkboxes
// -----------------------------------------------------------------------------
async function loadCompaniesList() {
    try {
        const res = await fetch(`/api/companies?_t=${Date.now()}`, { cache: "no-store" });
        const data = await res.json();
        if (data.companies && data.companies.length > 0) {
            const select = document.getElementById("companySelect");
            const currentVal = select.value;
            select.innerHTML = "";

            const friendlyNames = {
                "ASML": "ASML Holding N.V.",
                "TSMC": "TSMC (2330 / TSM)",
                "NVDA": "NVIDIA Corporation",
                "NXP": "NXP Semiconductors (NXPI)",
                "VSH": "Vishay Intertechnology (VSH)"
            };

            const chkGrid = document.getElementById("compareCheckboxGrid");
            if (chkGrid) chkGrid.innerHTML = "";

            data.companies.forEach((comp) => {
                const upper = comp.toUpperCase();
                const opt = document.createElement("option");
                opt.value = upper;
                opt.textContent = friendlyNames[upper] || upper;
                select.appendChild(opt);

                // Add to comparison checkbox grid
                if (chkGrid) {
                    const label = document.createElement("label");
                    label.className = "flex items-center space-x-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-700 hover:border-slate-500 cursor-pointer transition-all";
                    const color = COMPANY_COLORS[comp.toLowerCase()] || "#3B82F6";
                    label.innerHTML = `
                        <input type="checkbox" value="${upper}" class="compare-chk rounded bg-slate-800 border-slate-600 text-indigo-600 focus:ring-0" checked>
                        <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${color}"></span>
                        <span class="text-xs font-semibold text-slate-200">${upper}</span>
                    `;
                    chkGrid.appendChild(label);
                }
            });

            if (data.companies.map(c => c.toUpperCase()).includes(currentVal)) {
                select.value = currentVal;
            }

            // Add change listener to comparison checkboxes
            if (chkGrid) {
                chkGrid.querySelectorAll(".compare-chk").forEach(chk => {
                    chk.addEventListener("change", () => loadComparisonData());
                });
            }
        }
    } catch (e) {
        console.error("Error loading companies list:", e);
    }
}

// -----------------------------------------------------------------------------
// Load Single Company Data & Render Single View
// -----------------------------------------------------------------------------
async function loadDashboardData(targetCompany = null) {
    try {
        const company = targetCompany || document.getElementById("companySelect").value || "ASML";
        const res = await fetch(`/api/metrics/${company.toLowerCase()}?freq=${CURRENT_FREQ}&_t=${Date.now()}`, { cache: "no-store" });
        const data = await res.json();
        
        GLOBAL_METRICS_DATA = data;
        
        renderKPICards(data);
        renderCharts(data);
        renderMasterTable(data);
        loadMarkdownFiles(company.toLowerCase());
    } catch (e) {
        console.error("Error loading dashboard data:", e);
    }
}

function renderKPICards(data) {
    const years = data.years;
    if (!years || years.length === 0) return;
    const latestYear = years[years.length - 1];
    const fin = data.financials[latestYear] || {};
    const unit = data.unit || "$M";

    document.getElementById("kpiRevenue").textContent = `${unit}${formatNumber(fin.revenue)}`;
    document.getElementById("kpiRevenueYoY").textContent = fin.rev_growth_yoy !== null ? `${fin.rev_growth_yoy > 0 ? '+' : ''}${fin.rev_growth_yoy}% YoY` : '-';

    document.getElementById("kpiGrossMargin").textContent = `${fin.gross_margin}%`;
    document.getElementById("kpiMarginDiff").textContent = fin.gm_diff_pp !== null ? `${fin.gm_diff_pp > 0 ? '+' : ''}${fin.gm_diff_pp} pp YoY` : '-';

    document.getElementById("kpiOpIncome").textContent = `${unit}${formatNumber(fin.operating_income)}`;
    document.getElementById("kpiOpMargin").textContent = `Margin: ${fin.operating_margin}%`;

    document.getElementById("kpiRdExpense").textContent = `${unit}${formatNumber(fin.rd_expense)}`;
    document.getElementById("kpiRdPct").textContent = `${fin.rd_pct_rev}% of Rev`;

    document.getElementById("kpiHeadcount").textContent = formatNumber(fin.headcount);
    document.getElementById("kpiHeadcountPlateau").textContent = `${latestYear} Headcount`;

    const currPrefix = unit.includes("€") ? "€" : "$";
    document.getElementById("kpiGpPerEmp").textContent = `${currPrefix}${formatNumber(fin.gp_per_emp)}`;
    document.getElementById("kpiGpPerEmpYoY").textContent = `${latestYear} GP / Employee`;

    updateInsightsText(data);
}

function updateInsightsText(data) {
    const lang = CURRENT_LANGUAGE;
    const ins = (data.insights && data.insights[lang]) ? data.insights[lang] : (data.insights && data.insights.en ? data.insights.en : {});

    document.getElementById("insightPivotText").textContent = ins.pivot || "Operational excellence and headcount leverage.";
    document.getElementById("insightProductivityText").textContent = ins.productivity || "Human capital return on investment.";
    document.getElementById("insightLeverageText").textContent = ins.leverage || "Operating profit margin and fixed cost absorption.";
    document.getElementById("insightRdText").textContent = ins.rd || "R&D technology differentiation and moat reinvestment.";
    document.getElementById("insightGrowthText").textContent = ins.growth || "Triangulation of profit expansion vs headcount velocity.";
    document.getElementById("insightBreakdownText").textContent = ins.breakdown || "Value vs volume disaggregation.";
}

// -----------------------------------------------------------------------------
// Render 6 Single View Plotly Charts
// -----------------------------------------------------------------------------
function renderCharts(data) {
    const years = data.years || [];
    const fin = data.financials || {};
    const unit = data.unit || "$M";
    const currSym = unit.includes("€") ? "€" : "$";

    const isLight = CURRENT_THEME === "light";
    const fontColor = isLight ? "#475569" : "#94a3b8";
    const gridColor = isLight ? "#e2e8f0" : "#334155";

    // Chronologically sort years / quarters
    const sortedYears = [...years].map(String).sort((a, b) => {
        const parseKey = (str) => {
            const parts = String(str).trim().split(/\s+/);
            const year = parseInt(parts[0]) || 0;
            const qMap = { "Q1": 1, "Q2": 2, "Q3": 3, "Q4": 4 };
            const q = parts[1] ? (qMap[parts[1].toUpperCase()] || 0) : 0;
            return year * 10 + q;
        };
        return parseKey(a) - parseKey(b);
    });

    const isQuarterly = sortedYears.some(p => p.includes("Q"));

    const commonLayout = {
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: fontColor, size: 11 },
        margin: { l: 45, r: 45, t: 30, b: isQuarterly ? 55 : 35 },
        hovermode: "x unified",
        legend: { orientation: "h", y: 1.15, x: 0, font: { size: 10 } },
        xaxis: {
            categoryorder: "array",
            categoryarray: sortedYears,
            tickangle: isQuarterly ? -45 : 0,
            automargin: true,
            showgrid: true,
            gridcolor: gridColor
        }
    };

    // Chart 1: The Pivot (Headcount vs GM %)
    const headcounts = years.map(y => fin[y]?.headcount || 0);
    const grossMargins = years.map(y => fin[y]?.gross_margin || 0);

    const trace1_1 = {
        x: years, y: headcounts, name: "Headcount (FTE)",
        type: "bar", marker: { color: "#3B82F6", opacity: 0.8 }, yaxis: "y"
    };
    const trace1_2 = {
        x: years, y: grossMargins, name: "Gross Margin %",
        type: "scatter", mode: "lines+markers", line: { color: "#10B981", width: 3 },
        marker: { size: 7 }, yaxis: "y2"
    };
    Plotly.newPlot("chartInflection", [trace1_1, trace1_2], {
        ...commonLayout,
        yaxis: { title: "Headcount (FTE)", showgrid: true, gridcolor: gridColor, autorange: true },
        yaxis2: { title: "Gross Margin %", overlaying: "y", side: "right", showgrid: false, autorange: true, ticksuffix: "%" }
    }, { responsive: true, displayModeBar: false });

    // Chart 2: Productivity Trio
    const revPerEmp = years.map(y => (fin[y]?.rev_per_emp || 0) / 1000);
    const gpPerEmp = years.map(y => (fin[y]?.gp_per_emp || 0) / 1000);
    const opPerEmp = years.map(y => (fin[y]?.op_per_emp || 0) / 1000);

    const trace2_1 = { x: years, y: revPerEmp, name: `Rev/FTE (k${currSym})`, type: "scatter", mode: "lines+markers", line: { color: "#60A5FA", width: 2 } };
    const trace2_2 = { x: years, y: gpPerEmp, name: `GP/FTE (k${currSym})`, type: "scatter", mode: "lines+markers", line: { color: "#A855F7", width: 3 } };
    const trace2_3 = { x: years, y: opPerEmp, name: `OpIncome/FTE (k${currSym})`, type: "scatter", mode: "lines+markers", line: { color: "#34D399", width: 2 } };

    Plotly.newPlot("chartProductivity", [trace2_1, trace2_2, trace2_3], {
        ...commonLayout,
        yaxis: { title: `Productivity (k${currSym} / FTE)`, showgrid: true, gridcolor: gridColor, autorange: true, tickprefix: currSym }
    }, { responsive: true, displayModeBar: false });

    // Chart 3: Operating Profitability & Leverage
    const opIncomes = years.map(y => fin[y]?.operating_income || 0);
    const netIncomes = years.map(y => fin[y]?.net_income || 0);
    const opMargins = years.map(y => fin[y]?.operating_margin || 0);

    const trace3_1 = { x: years, y: opIncomes, name: `OpIncome (${unit})`, type: "bar", marker: { color: "#06B6D4" }, yaxis: "y" };
    const trace3_2 = { x: years, y: netIncomes, name: `Net Income (${unit})`, type: "bar", marker: { color: "#3B82F6", opacity: 0.7 }, yaxis: "y" };
    const trace3_3 = { x: years, y: opMargins, name: "Op Margin %", type: "scatter", mode: "lines+markers", line: { color: "#F59E0B", width: 2.5 }, yaxis: "y2" };

    Plotly.newPlot("chartProfitability", [trace3_1, trace3_2, trace3_3], {
        ...commonLayout,
        barmode: "group",
        yaxis: { title: `Profit (${unit})`, showgrid: true, gridcolor: gridColor, autorange: true },
        yaxis2: { title: "Op Margin %", overlaying: "y", side: "right", showgrid: false, autorange: true, ticksuffix: "%" }
    }, { responsive: true, displayModeBar: false });

    // Chart 4: R&D Intensity
    const rdExpenses = years.map(y => fin[y]?.rd_expense || 0);
    const rdPcts = years.map(y => fin[y]?.rd_pct_rev || 0);

    const trace4_1 = { x: years, y: rdExpenses, name: `R&D Expense (${unit})`, type: "bar", marker: { color: "#F43F5E", opacity: 0.8 }, yaxis: "y" };
    const trace4_2 = { x: years, y: rdPcts, name: "R&D % of Rev", type: "scatter", mode: "lines+markers", line: { color: "#FB923C", width: 2.5 }, yaxis: "y2" };

    Plotly.newPlot("chartRdIntensity", [trace4_1, trace4_2], {
        ...commonLayout,
        yaxis: { title: `R&D (${unit})`, showgrid: true, gridcolor: gridColor, autorange: true },
        yaxis2: { title: "R&D % of Rev", overlaying: "y", side: "right", showgrid: false, autorange: true, ticksuffix: "%" }
    }, { responsive: true, displayModeBar: false });

    // Chart 5: Growth Dynamics
    const growthYears = years.slice(1);
    const revGrowth = growthYears.map(y => fin[y]?.rev_growth_yoy || 0);
    const gpGrowth = growthYears.map(y => fin[y]?.gp_growth_yoy || 0);
    const opGrowth = growthYears.map(y => fin[y]?.op_growth_yoy || 0);
    const hcGrowth = growthYears.map(y => fin[y]?.hc_growth_yoy || 0);

    const trace5_1 = { x: growthYears, y: revGrowth, name: "Revenue YoY %", type: "scatter", mode: "lines+markers", line: { color: "#60A5FA", width: 2 } };
    const trace5_2 = { x: growthYears, y: gpGrowth, name: "Gross Profit YoY %", type: "scatter", mode: "lines+markers", line: { color: "#34D399", width: 2 } };
    const trace5_3 = { x: growthYears, y: opGrowth, name: "OpIncome YoY %", type: "scatter", mode: "lines+markers", line: { color: "#FBBF24", width: 2 } };
    const trace5_4 = { x: growthYears, y: hcGrowth, name: "Headcount YoY %", type: "scatter", mode: "lines+markers", line: { color: "#F87171", width: 2, dash: "dot" } };

    Plotly.newPlot("chartGrowthDynamics", [trace5_1, trace5_2, trace5_3, trace5_4], {
        ...commonLayout,
        yaxis: { title: "Growth Rate (%)", showgrid: true, gridcolor: gridColor, autorange: true, ticksuffix: "%" }
    }, { responsive: true, displayModeBar: false });

    // Chart 6: Value vs Volume Sales Breakdown
    const sb = data.sales_breakdown || {};
    const sbCats = sb.categories || [];
    const sbColors = sb.colors || ["#1E3A8A", "#0284C7", "#059669", "#D97706"];
    const sbData = sb.data || {};
    const sbYears = Object.keys(sbData).sort();

    const tracesValue = sbCats.map((cat, idx) => ({
        x: sbYears,
        y: sbYears.map(y => sbData[y]?.value[idx] || 0),
        name: cat,
        type: "bar",
        xaxis: "x",
        yaxis: "y",
        marker: { color: sbColors[idx] || "#3B82F6" }
    }));

    const tracesVolume = sbCats.map((cat, idx) => ({
        x: sbYears,
        y: sbYears.map(y => sbData[y]?.volume[idx] || 0),
        name: `${cat} (Units)`,
        type: "bar",
        xaxis: "x2",
        yaxis: "y2",
        showlegend: false,
        marker: { color: sbColors[idx] || "#3B82F6", opacity: 0.7 }
    }));

    const layout6 = {
        ...commonLayout,
        grid: { rows: 1, columns: 2, pattern: "independent" },
        barmode: "stack",
        xaxis: { domain: [0, 0.46], title: `Value (${unit})` },
        yaxis: { title: unit, showgrid: true, gridcolor: gridColor, autorange: true },
        xaxis2: { domain: [0.54, 1.0], title: "Volume (Units / Systems)" },
        yaxis2: { title: "Units / Systems", showgrid: true, gridcolor: gridColor, autorange: true }
    };

    Plotly.newPlot("chartSalesBreakdown", [...tracesValue, ...tracesVolume], layout6, { responsive: true, displayModeBar: false });
}

// -----------------------------------------------------------------------------
// Render Master Audited Table & Single CSV Export
// -----------------------------------------------------------------------------
function renderMasterTable(data) {
    const years = data.years;
    const fin = data.financials;
    const unit = data.unit || "$M";
    const currSym = unit.includes("€") ? "€" : "$";

    const headerRow = document.getElementById("tableHeaderRow");
    headerRow.innerHTML = `<th class="py-3 px-4" data-i18n="table_th_metric">${CURRENT_LANGUAGE === 'zh' ? '財務指標 / 單位' : 'Metric / Unit'}</th>`;
    years.forEach(y => {
        const th = document.createElement("th");
        th.className = "py-3 px-3 text-right";
        th.textContent = y;
        headerRow.appendChild(th);
    });

    const rows = [
        { label: `Revenue (${unit})`, key: "revenue", fmt: v => `${unit}${formatNumber(v)}` },
        { label: "Revenue YoY Growth", key: "rev_growth_yoy", fmt: v => v !== null ? `${v > 0 ? '+' : ''}${v}%` : "-" },
        { label: `Gross Profit (${unit})`, key: "gross_profit", fmt: v => `${unit}${formatNumber(v)}` },
        { label: "Gross Margin %", key: "gross_margin", fmt: v => `${v}%` },
        { label: "Gross Margin Diff (pp)", key: "gm_diff_pp", fmt: v => v !== null ? `${v > 0 ? '+' : ''}${v} pp` : "-" },
        { label: `Operating Income (${unit})`, key: "operating_income", fmt: v => `${unit}${formatNumber(v)}` },
        { label: "Operating Margin %", key: "operating_margin", fmt: v => `${v}%` },
        { label: `Net Income (${unit})`, key: "net_income", fmt: v => `${unit}${formatNumber(v)}` },
        { label: `R&D Expense (${unit})`, key: "rd_expense", fmt: v => `${unit}${formatNumber(v)}` },
        { label: "R&D % of Revenue", key: "rd_pct_rev", fmt: v => `${v}%` },
        { label: "Total Headcount (FTE)", key: "headcount", fmt: v => formatNumber(v) },
        { label: "Headcount YoY Growth", key: "hc_growth_yoy", fmt: v => v !== null ? `${v > 0 ? '+' : ''}${v}%` : "-" },
        { label: `Revenue / FTE (${currSym})`, key: "rev_per_emp", fmt: v => `${currSym}${formatNumber(v)}` },
        { label: `Gross Profit / FTE (${currSym})`, key: "gp_per_emp", fmt: v => `${currSym}${formatNumber(v)}` },
        { label: `Operating Income / FTE (${currSym})`, key: "op_per_emp", fmt: v => `${currSym}${formatNumber(v)}` }
    ];

    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";
    rows.forEach(r => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-800/50 transition-colors";
        let html = `<td class="py-2.5 px-4 font-medium text-slate-300">${r.label}</td>`;
        years.forEach(y => {
            const val = fin[y]?.[r.key] !== undefined ? fin[y][r.key] : null;
            html += `<td class="py-2.5 px-3 text-right font-mono text-slate-200">${val !== null ? r.fmt(val) : '-'}</td>`;
        });
        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}

function exportTableToCSV() {
    if (!GLOBAL_METRICS_DATA) return;
    const data = GLOBAL_METRICS_DATA;
    const years = data.years;
    const fin = data.financials;

    let csv = "Metric," + years.join(",") + "\n";
    const keys = ["revenue", "rev_growth_yoy", "gross_profit", "gross_margin", "operating_income", "operating_margin", "net_income", "rd_expense", "rd_pct_rev", "headcount", "rev_per_emp", "gp_per_emp", "op_per_emp"];

    keys.forEach(k => {
        let row = [k];
        years.forEach(y => {
            row.push(fin[y]?.[k] !== undefined && fin[y]?.[k] !== null ? fin[y][k] : "");
        });
        csv += row.join(",") + "\n";
    });

    downloadCSV(csv, `${data.ticker}_financial_metrics.csv`);
}

// -----------------------------------------------------------------------------
// MULTI-COMPANY PEER BENCHMARK COMPARISON LOGIC
// -----------------------------------------------------------------------------
async function loadComparisonData() {
    const checkedBoxes = Array.from(document.querySelectorAll(".compare-chk:checked")).map(cb => cb.value.toLowerCase());
    if (checkedBoxes.length === 0) {
        return;
    }

    try {
        const tickersParam = checkedBoxes.join(",");
        const res = await fetch(`/api/compare?tickers=${tickersParam}&freq=${CURRENT_FREQ}&_t=${Date.now()}`, { cache: "no-store" });
        const json = await res.json();
        if (json.success && json.companies) {
            COMPARISON_DATA = json.companies;
            renderComparisonView(COMPARISON_DATA);
        }
    } catch (e) {
        console.error("Error loading comparison metrics:", e);
    }
}

function renderComparisonView(companiesData) {
    const tickers = Object.keys(companiesData);
    if (tickers.length === 0) return;

    const isLight = CURRENT_THEME === "light";
    const fontColor = isLight ? "#475569" : "#94a3b8";
    const gridColor = isLight ? "#e2e8f0" : "#334155";

    // 1. Extract & Chronologically sort all unique periods across all selected companies
    const allPeriodsSet = new Set();
    tickers.forEach(t => {
        const c = companiesData[t];
        (c.years || []).forEach(y => allPeriodsSet.add(String(y)));
    });

    const sortedAllPeriods = Array.from(allPeriodsSet).sort((a, b) => {
        const parseKey = (str) => {
            const parts = String(str).trim().split(/\s+/);
            const year = parseInt(parts[0]) || 0;
            const qMap = { "Q1": 1, "Q2": 2, "Q3": 3, "Q4": 4 };
            const q = parts[1] ? (qMap[parts[1].toUpperCase()] || 0) : 0;
            return year * 10 + q;
        };
        return parseKey(a) - parseKey(b);
    });

    const isQuarterly = sortedAllPeriods.some(p => p.includes("Q"));

    const commonLayout = {
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: fontColor, size: 11 },
        margin: { l: 50, r: 35, t: 30, b: isQuarterly ? 55 : 40 },
        hovermode: "x unified",
        legend: { orientation: "h", y: 1.18, x: 0, font: { size: 10 } },
        xaxis: {
            categoryorder: "array",
            categoryarray: sortedAllPeriods,
            tickangle: isQuarterly ? -45 : 0,
            automargin: true,
            showgrid: true,
            gridcolor: gridColor
        }
    };

    // 1. Chart A: Gross Margin % Trajectory
    const tracesGM = tickers.map((t, idx) => {
        const c = companiesData[t];
        const years = c.years || [];
        const gms = years.map(y => c.financials[y]?.gross_margin || null);
        const col = COMPANY_COLORS[t] || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];
        return {
            x: years, y: gms, name: `${c.ticker || t.toUpperCase()} (%)`,
            type: "scatter", mode: "lines+markers", line: { color: col, width: 3 }, marker: { size: 6 }
        };
    });

    Plotly.newPlot("chartCompareGM", tracesGM, {
        ...commonLayout,
        yaxis: { title: "Gross Margin %", showgrid: true, gridcolor: gridColor, autorange: true, ticksuffix: "%" }
    }, { responsive: true, displayModeBar: false });

    // 2. Chart B: Rev & GP per FTE
    const tracesProductivity = tickers.map((t, idx) => {
        const c = companiesData[t];
        const years = c.years || [];
        const revEmp = years.map(y => (c.financials[y]?.rev_per_emp || 0) / 1000);
        const col = COMPANY_COLORS[t] || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];
        return {
            x: years, y: revEmp, name: `${c.ticker || t.toUpperCase()} Rev/FTE ($k)`,
            type: "scatter", mode: "lines+markers", line: { color: col, width: 2.5 }, marker: { size: 6 }
        };
    });

    Plotly.newPlot("chartCompareProductivity", tracesProductivity, {
        ...commonLayout,
        yaxis: { title: "Rev / FTE ($k)", showgrid: true, gridcolor: gridColor, autorange: true, tickprefix: "$" }
    }, { responsive: true, displayModeBar: false });

    // 3. Chart C: Operating Margin %
    const tracesOpMargin = tickers.map((t, idx) => {
        const c = companiesData[t];
        const years = c.years || [];
        const opms = years.map(y => c.financials[y]?.operating_margin || null);
        const col = COMPANY_COLORS[t] || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];
        return {
            x: years, y: opms, name: `${c.ticker || t.toUpperCase()} Op Margin (%)`,
            type: "scatter", mode: "lines+markers", line: { color: col, width: 3 }, marker: { size: 6 }
        };
    });

    Plotly.newPlot("chartCompareOpMargin", tracesOpMargin, {
        ...commonLayout,
        yaxis: { title: "Operating Margin %", showgrid: true, gridcolor: gridColor, autorange: true, ticksuffix: "%" }
    }, { responsive: true, displayModeBar: false });

    // 4. Chart D: R&D Intensity % of Revenue
    const tracesRD = tickers.map((t, idx) => {
        const c = companiesData[t];
        const years = c.years || [];
        const rds = years.map(y => c.financials[y]?.rd_pct_rev || null);
        const col = COMPANY_COLORS[t] || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];
        return {
            x: years, y: rds, name: `${c.ticker || t.toUpperCase()} R&D %`,
            type: "scatter", mode: "lines+markers", line: { color: col, width: 2.5 }, marker: { size: 6 }
        };
    });

    Plotly.newPlot("chartCompareRD", tracesRD, {
        ...commonLayout,
        yaxis: { title: "R&D % of Rev", showgrid: true, gridcolor: gridColor, autorange: true, ticksuffix: "%" }
    }, { responsive: true, displayModeBar: false });

    // 5. Render Comparison Master Table
    const tbody = document.getElementById("compareTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    tickers.forEach(t => {
        const c = companiesData[t];
        const years = c.years || [];
        const latestY = years.length > 0 ? years[years.length - 1] : "-";
        const f = c.financials ? c.financials[latestY] || {} : {};
        const unit = c.unit || "$M";
        const currSym = unit.includes("€") ? "€" : "$";
        const col = COMPANY_COLORS[t] || "#3B82F6";

        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-800/50 transition-colors";
        tr.innerHTML = `
            <td class="py-3 px-4 font-bold flex items-center gap-2 text-white">
                <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${col}"></span>
                ${c.company_name || c.ticker || t.toUpperCase()}
            </td>
            <td class="py-3 px-4 font-mono text-slate-300">${latestY}</td>
            <td class="py-3 px-4 font-mono text-slate-200">${unit}${formatNumber(f.revenue)}</td>
            <td class="py-3 px-4 font-mono font-bold text-emerald-400">${f.gross_margin || '-'}%</td>
            <td class="py-3 px-4 font-mono font-bold text-cyan-400">${f.operating_margin || '-'}%</td>
            <td class="py-3 px-4 font-mono text-rose-400">${f.rd_pct_rev || '-'}%</td>
            <td class="py-3 px-4 font-mono text-amber-300">${formatNumber(f.headcount)}</td>
            <td class="py-3 px-4 font-mono font-bold text-purple-400">${currSym}${formatNumber(f.rev_per_emp)}</td>
            <td class="py-3 px-4 font-mono font-bold text-indigo-400">${currSym}${formatNumber(f.gp_per_emp)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function exportComparisonToCSV() {
    if (!COMPARISON_DATA) return;
    const tickers = Object.keys(COMPARISON_DATA);

    let csv = "Company,Ticker,Latest Year,Revenue,Gross Margin %,Operating Margin %,R&D % of Rev,Headcount,Rev/FTE,GP/FTE\n";
    tickers.forEach(t => {
        const c = COMPARISON_DATA[t];
        const years = c.years || [];
        const latestY = years.length > 0 ? years[years.length - 1] : "";
        const f = c.financials ? c.financials[latestY] || {} : {};
        const row = [
            `"${c.company_name || t}"`,
            c.ticker || t.toUpperCase(),
            latestY,
            f.revenue || "",
            f.gross_margin || "",
            f.operating_margin || "",
            f.rd_pct_rev || "",
            f.headcount || "",
            f.rev_per_emp || "",
            f.gp_per_emp || ""
        ];
        csv += row.join(",") + "\n";
    });

    downloadCSV(csv, "peer_benchmark_comparison.csv");
}

// -----------------------------------------------------------------------------
// Workflow Execution & Markdown Browser
// -----------------------------------------------------------------------------
async function handleRunWorkflow() {
    const input = document.getElementById("targetInput").value.trim();
    const years = document.getElementById("yearsSelect").value;
    if (!input) return;

    const progressContainer = document.getElementById("progressContainer");
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");
    const progressPercent = document.getElementById("progressPercent");
    const runBtn = document.getElementById("runWorkflowBtn");

    progressContainer.classList.remove("hidden");
    runBtn.disabled = true;
    runBtn.classList.add("opacity-50", "cursor-not-allowed");

    let progress = 10;
    progressBar.style.width = `${progress}%`;
    progressPercent.textContent = `${progress}%`;
    progressText.textContent = "Connecting to filings repository...";

    const interval = setInterval(() => {
        if (progress < 90) {
            progress += 15;
            progressBar.style.width = `${progress}%`;
            progressPercent.textContent = `${progress}%`;
            if (progress >= 30 && progress < 60) progressText.textContent = "Downloading audited financial reports...";
            else if (progress >= 60 && progress < 85) progressText.textContent = "Parsing tables & extracting OpEx metrics...";
        }
    }, 600);

    try {
        const payload = { target: input, years: parseInt(years), freq: CURRENT_FREQ };
        const res = await fetch("/api/run-workflow", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        clearInterval(interval);

        progressBar.style.width = "100%";
        progressPercent.textContent = "100%";
        progressText.textContent = (result.success || result.status === "success") ? "Workflow completed successfully!" : "Workflow finished with notices.";

        await loadCompaniesList();
        const finalTicker = result.ticker || input;
        document.getElementById("companySelect").value = finalTicker.toUpperCase();
        await loadDashboardData(finalTicker);

        setTimeout(() => {
            progressContainer.classList.add("hidden");
            progressBar.style.width = "0%";
            runBtn.disabled = false;
            runBtn.classList.remove("opacity-50", "cursor-not-allowed");
        }, 2000);
    } catch (e) {
        clearInterval(interval);
        progressText.textContent = `Error: ${e.message}`;
        runBtn.disabled = false;
        runBtn.classList.remove("opacity-50", "cursor-not-allowed");
    }
}

async function loadMarkdownFiles(ticker) {
    const listEl = document.getElementById("mdFileList");
    listEl.innerHTML = '<p class="text-xs text-slate-500 text-center py-4">Loading files...</p>';

    try {
        const res = await fetch(`/api/markdown-files/${ticker}?_t=${Date.now()}`, { cache: "no-store" });
        const data = await res.json();
        listEl.innerHTML = "";

        if (data.files && data.files.length > 0) {
            data.files.forEach((file, idx) => {
                const btn = document.createElement("button");
                btn.className = "w-full text-left p-2 rounded-lg text-xs font-mono text-slate-300 hover:bg-slate-800 transition-colors flex items-center justify-between group";
                btn.innerHTML = `
                    <span class="truncate"><i class="fa-regular fa-file-lines mr-1.5 text-blue-400"></i> ${file.filename}</span>
                    <span class="text-[10px] text-slate-500 group-hover:text-slate-300 font-sans">${(file.size / 1024).toFixed(1)} KB</span>
                `;
                btn.addEventListener("click", () => previewMarkdownFile(ticker, file.filename));
                listEl.appendChild(btn);
            });
            previewMarkdownFile(ticker, data.files[0].filename);
        } else {
            listEl.innerHTML = '<p class="text-xs text-slate-500 text-center py-4">No parsed Markdown files found.</p>';
        }
    } catch (e) {
        listEl.innerHTML = '<p class="text-xs text-rose-400 text-center py-4">Error loading markdown files.</p>';
    }
}

async function previewMarkdownFile(ticker, filename) {
    const titleEl = document.getElementById("currentMdTitle");
    const preEl = document.getElementById("mdContentPre");
    const copyBtn = document.getElementById("copyMdBtn");

    titleEl.textContent = filename;
    preEl.textContent = "Loading file content...";

    try {
        const res = await fetch(`/api/markdown-content/${ticker}/${filename}?_t=${Date.now()}`, { cache: "no-store" });
        const data = await res.json();
        preEl.textContent = data.content;
        copyBtn.classList.remove("hidden");
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(data.content);
            copyBtn.innerHTML = '<i class="fa-solid fa-check text-emerald-400"></i> Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = `<i class="fa-regular fa-copy"></i> ${CURRENT_LANGUAGE === 'zh' ? '複製 Markdown' : 'Copy Markdown'}`;
            }, 2000);
        };
    } catch (e) {
        preEl.textContent = `Error reading file: ${e.message}`;
    }
}

function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return "-";
    return num.toLocaleString();
}

function downloadCSV(csvContent, fileName) {
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
