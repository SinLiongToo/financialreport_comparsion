/**
 * dashboard.js - Handles API calls, auto-scaling Plotly charts,
 * multi-language i18n (EN/ZH), dynamic company-specific strategic insights,
 * and One-Click workflow execution.
 */

let currentTicker = "ASML";
let currentMetricsData = null;
let currentLang = "en"; // Default to English interface

const I18N_DICT = {
    en: {
        badge_workflow: "One-Click Workflow",
        header_subtitle: "Annual Reports Crawler (20-F/10-K) ➔ Markdown Parser ➔ Productivity & Strategic Alignment",
        btn_refresh: "Reload",
        panel_title: "One-Click Automated Workflow Console",
        panel_subtitle: "Supports URL or Ticker (e.g. ASML, TSMC, NVDA, NXP)",
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
        lang_toggle_btn: "繁體中文"
    },
    zh: {
        badge_workflow: "一步到位 Workflow",
        header_subtitle: "CompaniesMarketCap 爬蟲 ➔ 20-F/10-K PDF ➔ Markdown 轉換 ➔ 人均產值戰略對齊",
        btn_refresh: "重新載入",
        panel_title: "一鍵自動化工作流控制台 (One-Click Pipeline)",
        panel_subtitle: "支援輸入 URL 或股票代碼 (例如: ASML, TSMC, NVDA, NXP)",
        label_target: "目標網址或代號 (CompaniesMarketCap / Ticker)",
        label_years: "下載年數 (N 年)",
        btn_run_workflow: "立即執行一步到位工作流",
        kpi_revenue_title: "營業收入 (Revenue)",
        kpi_gm_title: "毛利率 (Gross Margin %)",
        kpi_op_title: "營業利益 (Operating Income)",
        kpi_rd_title: "研發費用 (R&D Expense)",
        kpi_hc_title: "全球員工總數 (Headcount)",
        kpi_gp_emp_title: "人均毛利 (GP per FTE)",
        chart1_title: "圖表 1：人力高原拐點與毛利率走勢 (The Pivot)",
        chart2_title: "圖表 2：人均產值全景深度分析 (Revenue / GP / OpIncome per FTE)",
        chart3_title: "圖表 3：營業利益與獲利能力趨勢 (Operating Income & Margins)",
        chart4_title: "圖表 4：研發支出與技術護城河強度 (R&D Expense & Intensity)",
        chart5_title: "圖表 5：利潤 vs. 人力成長增速對比 (YoY Growth Dynamics)",
        chart6_title: "圖表 6：銷售結構不對稱性 (Value-vs-Volume Paradox)",
        table_title: "官方審計全維度財務、研發與人均產值數據表",
        table_subtitle: "涵蓋 Revenue, GP, OpIncome, NetIncome, R&D, Headcount, Productivity 及各項 YoY 與利潤率",
        table_th_metric: "指標項目 (Metric / Unit)",
        btn_export_csv: "匯出 CSV",
        md_viewer_title: "解析產出 Markdown 檔案瀏覽與預覽",
        md_viewer_subtitle: "可直接複製給 LLM (Gemini / Claude / ChatGPT) 進行深度提問",
        btn_copy_md: "複製 Markdown",
        lang_toggle_btn: "English"
    }
};

document.addEventListener("DOMContentLoaded", () => {
    applyLanguage(currentLang);
    loadCompanyList();
    loadDashboard(currentTicker);
    loadMarkdownFiles(currentTicker);
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById("companySelect").addEventListener("change", async (e) => {
        currentTicker = e.target.value;
        // Two-way synchronization: update target input box when selecting a company
        const targetInput = document.getElementById("targetInput");
        if (currentTicker === "ASML") {
            targetInput.value = "https://companiesmarketcap.com/asml/annual-reports-20f/";
        } else if (currentTicker === "NVDA") {
            targetInput.value = "nvidia";
        } else {
            targetInput.value = currentTicker.toLowerCase();
        }
        await loadDashboard(currentTicker);
        await loadMarkdownFiles(currentTicker);
    });

    document.getElementById("refreshBtn").addEventListener("click", async () => {
        const refreshBtn = document.getElementById("refreshBtn");
        const icon = refreshBtn.querySelector("i");
        if (icon) icon.classList.add("fa-spin");

        const sel = document.getElementById("companySelect");
        if (sel && sel.value) {
            currentTicker = sel.value;
        }

        await loadCompanyList();
        if (sel) sel.value = currentTicker;
        await loadDashboard(currentTicker);
        await loadMarkdownFiles(currentTicker);

        setTimeout(() => {
            if (icon) icon.classList.remove("fa-spin");
        }, 500);
    });

    document.getElementById("langToggleBtn").addEventListener("click", () => {
        currentLang = currentLang === "en" ? "zh" : "en";
        applyLanguage(currentLang);
        if (currentMetricsData) {
            renderSummaryKPIs(currentMetricsData);
            renderDynamicInsights(currentMetricsData);
            renderAllCharts(currentMetricsData);
            renderMasterTable(currentMetricsData);
        }
    });

    document.getElementById("runWorkflowBtn").addEventListener("click", runOneClickWorkflow);

    document.getElementById("copyMdBtn").addEventListener("click", () => {
        const content = document.getElementById("mdContentPre").innerText;
        navigator.clipboard.writeText(content).then(() => {
            alert(currentLang === "en" ? "Markdown copied to clipboard!" : "Markdown 內容已複製至剪貼簿！");
        });
    });

    document.getElementById("exportCsvBtn").addEventListener("click", exportTableToCSV);
}

function applyLanguage(lang) {
    const dict = I18N_DICT[lang] || I18N_DICT.en;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (dict[key]) {
            el.textContent = dict[key];
        }
    });
    document.getElementById("currentLangLabel").textContent = dict.lang_toggle_btn;
}

// -----------------------------------------------------------------
// 1. Fetch Company List & Dashboard Metrics
// -----------------------------------------------------------------
async function loadCompanyList() {
    try {
        const res = await fetch("/api/companies");
        const data = await res.json();
        const select = document.getElementById("companySelect");
        select.innerHTML = "";
        data.companies.forEach((comp) => {
            const opt = document.createElement("option");
            opt.value = comp;
            if (comp === "ASML") opt.textContent = "ASML Holding N.V.";
            else if (comp === "TSMC") opt.textContent = "TSMC (2330 / TSM)";
            else if (comp === "NVDA") opt.textContent = "NVIDIA Corporation";
            else if (comp === "NXP" || comp === "NXP-SEMICONDUCTORS" || comp === "NXPI") opt.textContent = "NXP Semiconductors (NXPI)";
            else if (comp === "VSH" || comp === "VISHAY-INTERTECHNOLOGY") opt.textContent = "Vishay Intertechnology (VSH)";
            else opt.textContent = comp;
            select.appendChild(opt);
        });
        select.value = currentTicker;
    } catch (e) {
        console.error("Failed to load company list:", e);
    }
}

async function loadDashboard(ticker) {
    try {
        const timestamp = Date.now();
        const res = await fetch(`/api/metrics/${ticker}?_t=${timestamp}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Metrics not found");
        const data = await res.json();
        currentMetricsData = data;
        
        renderSummaryKPIs(data);
        renderDynamicInsights(data);
        renderAllCharts(data);
        renderMasterTable(data);
    } catch (e) {
        console.error("Failed to load metrics:", e);
    }
}

// -----------------------------------------------------------------
// 2. Render Dynamic Strategic Insights for the active company
// -----------------------------------------------------------------
function renderDynamicInsights(data) {
    const lang = currentLang;
    const insights = data.insights?.[lang] || data.insights?.en || {};

    const pivotEl = document.getElementById("insightPivotText");
    const prodEl = document.getElementById("insightProductivityText");
    const levEl = document.getElementById("insightLeverageText");
    const rdEl = document.getElementById("insightRdText");
    const growthEl = document.getElementById("insightGrowthText");
    const breakEl = document.getElementById("insightBreakdownText");

    const strongLabel = lang === "en" ? "Strategic Focus:" : "戰略洞察：";

    pivotEl.innerHTML = `<strong class="text-blue-400">${strongLabel}</strong> ${insights.pivot || "Headcount vs Margin dynamic."}`;
    prodEl.innerHTML = `<strong class="text-purple-400">${strongLabel}</strong> ${insights.productivity || "Human capital productivity metrics."}`;
    levEl.innerHTML = `<strong class="text-emerald-400">${strongLabel}</strong> ${insights.leverage || "Operating leverage & income trajectory."}`;
    rdEl.innerHTML = `<strong class="text-rose-400">${strongLabel}</strong> ${insights.rd || "R&D technology moat & investment intensity."}`;
    growthEl.innerHTML = `<strong class="text-amber-400">${strongLabel}</strong> ${insights.growth || "Triangulation of Revenue, Margin, and Headcount."}`;
    breakEl.innerHTML = `<strong class="text-orange-400">${strongLabel}</strong> ${insights.breakdown || "Segment disaggregation & product mix."}`;
}

// -----------------------------------------------------------------
// 3. Render Top KPI Cards
// -----------------------------------------------------------------
function renderSummaryKPIs(data) {
    const years = data.years || [];
    if (years.length === 0) return;
    const latestYear = years[years.length - 1];
    const fin = data.financials[latestYear] || {};
    const curSym = (data.currency && data.currency.includes("EUR")) ? "€" : "$";

    document.getElementById("kpiRevenue").textContent = `${data.unit}${fin.revenue?.toLocaleString() || "-"}`;
    document.getElementById("kpiRevenueYoY").textContent = fin.rev_growth_yoy ? `${fin.rev_growth_yoy > 0 ? "+" : ""}${fin.rev_growth_yoy}% YoY` : "-";

    document.getElementById("kpiGrossMargin").textContent = `${fin.gross_margin || "-"}%`;
    document.getElementById("kpiMarginDiff").textContent = fin.gm_diff_pp ? `${fin.gm_diff_pp > 0 ? "+" : ""}${fin.gm_diff_pp} pp` : "-";

    document.getElementById("kpiOpIncome").textContent = `${data.unit}${fin.operating_income?.toLocaleString() || "-"}`;
    document.getElementById("kpiOpMargin").textContent = currentLang === "en" ? `Margin: ${fin.operating_margin || "-"}%` : `利益率: ${fin.operating_margin || "-"}%`;

    document.getElementById("kpiRdExpense").textContent = `${data.unit}${fin.rd_expense?.toLocaleString() || "-"}`;
    document.getElementById("kpiRdPct").textContent = currentLang === "en" ? `${fin.rd_pct_rev || "-"}% of Rev` : `佔營收 ${fin.rd_pct_rev || "-"}%`;

    document.getElementById("kpiHeadcount").textContent = fin.headcount?.toLocaleString() || "-";
    document.getElementById("kpiHeadcountPlateau").textContent = fin.hc_growth_yoy ? `${fin.hc_growth_yoy > 0 ? "+" : ""}${fin.hc_growth_yoy}% YoY` : (currentLang === "en" ? "Plateau" : "高原期");

    document.getElementById("kpiGpPerEmp").textContent = fin.gp_per_emp ? `${curSym}${(fin.gp_per_emp / 1000).toFixed(1)}K` : "-";
    document.getElementById("kpiGpPerEmpYoY").textContent = fin.gp_growth_yoy ? `${fin.gp_growth_yoy > 0 ? "+" : ""}${fin.gp_growth_yoy}% YoY` : "-";
}

// -----------------------------------------------------------------
// 4. Render All 6 Auto-Scaling Plotly Charts
// -----------------------------------------------------------------
function renderAllCharts(data) {
    renderInflectionChart(data);
    renderProductivityChart(data);
    renderProfitabilityChart(data);
    renderRdIntensityChart(data);
    renderGrowthDynamicsChart(data);
    renderSalesBreakdownChart(data);
}

// Chart 1: The Pivot (Auto-scaling y-axes)
function renderInflectionChart(data) {
    const years = data.years;
    const headcount = years.map(y => data.financials[y]?.headcount || 0);
    const grossMargin = years.map(y => data.financials[y]?.gross_margin || 0);
    const isEn = currentLang === "en";

    const trace1 = {
        x: years,
        y: headcount,
        name: isEn ? "Total Headcount (FTE)" : "全球員工數 (Headcount)",
        type: "bar",
        marker: { color: "rgba(59, 130, 246, 0.6)", line: { color: "#3B82F6", width: 1.5 } },
        yaxis: "y1"
    };

    const trace2 = {
        x: years,
        y: grossMargin,
        name: isEn ? "GAAP Gross Margin %" : "GAAP 毛利率 (%)",
        type: "scatter",
        mode: "lines+markers+text",
        text: grossMargin.map(v => `${v}%`),
        textposition: "top center",
        line: { color: "#10B981", width: 3 },
        marker: { size: 7, color: "#10B981" },
        yaxis: "y2"
    };

    const layout = {
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "#94A3B8", size: 10.5 },
        margin: { t: 25, r: 45, l: 50, b: 35 },
        legend: { orientation: "h", y: 1.15, x: 0.05 },
        yaxis: {
            title: isEn ? "Headcount (FTE)" : "員工人數 (FTE)",
            titlefont: { color: "#3B82F6" },
            tickfont: { color: "#3B82F6" },
            gridcolor: "#334155",
            autorange: true
        },
        yaxis2: {
            title: isEn ? "Gross Margin (%)" : "毛利率 (%)",
            titlefont: { color: "#10B981" },
            tickfont: { color: "#10B981" },
            overlaying: "y",
            side: "right",
            autorange: true,
            showgrid: false
        },
        xaxis: { gridcolor: "#334155" }
    };

    Plotly.newPlot("chartInflection", [trace1, trace2], layout, { responsive: true, displayModeBar: false });
}

// Chart 2: Productivity Trio (Auto-scaling y-axis)
function renderProductivityChart(data) {
    const years = data.years;
    const curK = (data.currency && data.currency.includes("EUR")) ? "k€" : "k$";
    const revPerEmp = years.map(y => Math.round((data.financials[y]?.rev_per_emp || 0) / 1000));
    const gpPerEmp = years.map(y => Math.round((data.financials[y]?.gp_per_emp || 0) / 1000));
    const opPerEmp = years.map(y => Math.round((data.financials[y]?.op_per_emp || 0) / 1000));
    const isEn = currentLang === "en";

    const trace1 = {
        x: years,
        y: revPerEmp,
        name: isEn ? `Revenue/FTE (${curK})` : `人均營收 (${curK}/FTE)`,
        type: "scatter",
        mode: "lines+markers",
        line: { color: "#A855F7", width: 2.5 },
        marker: { size: 6 }
    };

    const trace2 = {
        x: years,
        y: gpPerEmp,
        name: isEn ? `Gross Profit/FTE (${curK})` : `人均毛利 (${curK}/FTE)`,
        type: "scatter",
        mode: "lines+markers",
        line: { color: "#F59E0B", width: 2.5 },
        marker: { size: 6 }
    };

    const trace3 = {
        x: years,
        y: opPerEmp,
        name: isEn ? `OpIncome/FTE (${curK})` : `人均營業利益 (${curK}/FTE)`,
        type: "scatter",
        mode: "lines+markers",
        line: { color: "#06B6D4", width: 2.5 },
        marker: { size: 6 }
    };

    const layout = {
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "#94A3B8", size: 10.5 },
        margin: { t: 25, r: 25, l: 50, b: 35 },
        legend: { orientation: "h", y: 1.15, x: 0.05 },
        yaxis: {
            title: isEn ? `Thousands per Employee (${curK}/FTE)` : `千元 / 員工 (${curK}/FTE)`,
            gridcolor: "#334155",
            autorange: true
        },
        xaxis: { gridcolor: "#334155" }
    };

    Plotly.newPlot("chartProductivity", [trace1, trace2, trace3], layout, { responsive: true, displayModeBar: false });
}

// Chart 3: Operating Profitability & Margins (Auto-scaling)
function renderProfitabilityChart(data) {
    const years = data.years;
    const opIncome = years.map(y => data.financials[y]?.operating_income || 0);
    const netIncome = years.map(y => data.financials[y]?.net_income || 0);
    const opMargin = years.map(y => data.financials[y]?.operating_margin || 0);
    const isEn = currentLang === "en";

    const trace1 = {
        x: years,
        y: opIncome,
        name: isEn ? `Operating Income (${data.unit})` : `營業利益 (${data.unit})`,
        type: "bar",
        marker: { color: "#0EA5E9" },
        yaxis: "y1"
    };

    const trace2 = {
        x: years,
        y: netIncome,
        name: isEn ? `Net Income (${data.unit})` : `淨利 (${data.unit})`,
        type: "bar",
        marker: { color: "#6366F1" },
        yaxis: "y1"
    };

    const trace3 = {
        x: years,
        y: opMargin,
        name: isEn ? "Operating Margin %" : "營業利益率 (%)",
        type: "scatter",
        mode: "lines+markers",
        line: { color: "#F43F5E", width: 2.5 },
        marker: { size: 6 },
        yaxis: "y2"
    };

    const layout = {
        barmode: "group",
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "#94A3B8", size: 10.5 },
        margin: { t: 25, r: 45, l: 50, b: 35 },
        legend: { orientation: "h", y: 1.15, x: 0.05 },
        yaxis: {
            title: isEn ? `Amount (${data.unit})` : `金額 (${data.unit})`,
            gridcolor: "#334155",
            autorange: true
        },
        yaxis2: {
            title: isEn ? "Operating Margin (%)" : "利益率 (%)",
            titlefont: { color: "#F43F5E" },
            tickfont: { color: "#F43F5E" },
            overlaying: "y",
            side: "right",
            autorange: true,
            showgrid: false
        },
        xaxis: { gridcolor: "#334155" }
    };

    Plotly.newPlot("chartProfitability", [trace1, trace2, trace3], layout, { responsive: true, displayModeBar: false });
}

// Chart 4: R&D Expense & R&D Intensity (Auto-scaling)
function renderRdIntensityChart(data) {
    const years = data.years;
    const rdExpense = years.map(y => data.financials[y]?.rd_expense || 0);
    const rdPct = years.map(y => data.financials[y]?.rd_pct_rev || 0);
    const isEn = currentLang === "en";

    const trace1 = {
        x: years,
        y: rdExpense,
        name: isEn ? `R&D Expense (${data.unit})` : `研發費用 (${data.unit})`,
        type: "bar",
        marker: { color: "rgba(244, 63, 94, 0.7)", line: { color: "#F43F5E", width: 1.5 } },
        yaxis: "y1"
    };

    const trace2 = {
        x: years,
        y: rdPct,
        name: isEn ? "R&D as % of Revenue" : "研發佔營收比重 (%)",
        type: "scatter",
        mode: "lines+markers+text",
        text: rdPct.map(v => `${v}%`),
        textposition: "top center",
        line: { color: "#38BDF8", width: 2.5 },
        marker: { size: 6, color: "#38BDF8" },
        yaxis: "y2"
    };

    const layout = {
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "#94A3B8", size: 10.5 },
        margin: { t: 25, r: 45, l: 50, b: 35 },
        legend: { orientation: "h", y: 1.15, x: 0.05 },
        yaxis: {
            title: isEn ? `R&D Expense (${data.unit})` : `研發費用 (${data.unit})`,
            titlefont: { color: "#F43F5E" },
            tickfont: { color: "#F43F5E" },
            gridcolor: "#334155",
            autorange: true
        },
        yaxis2: {
            title: isEn ? "R&D Intensity (%)" : "佔營收比例 (%)",
            titlefont: { color: "#38BDF8" },
            tickfont: { color: "#38BDF8" },
            overlaying: "y",
            side: "right",
            autorange: true,
            showgrid: false
        },
        xaxis: { gridcolor: "#334155" }
    };

    Plotly.newPlot("chartRdIntensity", [trace1, trace2], layout, { responsive: true, displayModeBar: false });
}

// Chart 5: YoY Growth Dynamics (Auto-scaling)
function renderGrowthDynamicsChart(data) {
    const years = data.years.slice(1);
    const revYoY = years.map(y => data.financials[y]?.rev_growth_yoy || 0);
    const gpYoY = years.map(y => data.financials[y]?.gp_growth_yoy || 0);
    const opYoY = years.map(y => data.financials[y]?.op_growth_yoy || 0);
    const hcYoY = years.map(y => data.financials[y]?.hc_growth_yoy || 0);
    const isEn = currentLang === "en";

    const trace1 = {
        x: years,
        y: revYoY,
        name: isEn ? "Revenue YoY %" : "營收年增率 (Revenue YoY %)",
        type: "scatter",
        mode: "lines+markers",
        line: { color: "#3B82F6", width: 2.5 }
    };

    const trace2 = {
        x: years,
        y: gpYoY,
        name: isEn ? "Gross Profit YoY %" : "毛利年增率 (Gross Profit YoY %)",
        type: "scatter",
        mode: "lines+markers",
        line: { color: "#10B981", width: 2.5 }
    };

    const trace3 = {
        x: years,
        y: opYoY,
        name: isEn ? "OpIncome YoY %" : "營業利益年增率 (OpIncome YoY %)",
        type: "scatter",
        mode: "lines+markers",
        line: { color: "#06B6D4", width: 2 }
    };

    const trace4 = {
        x: years,
        y: hcYoY,
        name: isEn ? "Headcount YoY %" : "員工人數增速 (Headcount YoY %)",
        type: "scatter",
        mode: "lines+markers",
        line: { color: "#F59E0B", width: 2.5, dash: "dot" }
    };

    const layout = {
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "#94A3B8", size: 10.5 },
        margin: { t: 25, r: 25, l: 50, b: 35 },
        legend: { orientation: "h", y: 1.15, x: 0.02 },
        yaxis: {
            title: isEn ? "YoY Growth Rate (%)" : "年增率 (%)",
            gridcolor: "#334155",
            autorange: true
        },
        xaxis: { gridcolor: "#334155" }
    };

    Plotly.newPlot("chartGrowthDynamics", [trace1, trace2, trace3, trace4], layout, { responsive: true, displayModeBar: false });
}

// Chart 6: Value-vs-Volume Sales Breakdown (Auto-scaling)
function renderSalesBreakdownChart(data) {
    const breakdown = data.sales_breakdown;
    const isEn = currentLang === "en";

    if (!breakdown || !breakdown.categories || breakdown.categories.length === 0) {
        document.getElementById("chartSalesBreakdown").innerHTML = `<p class='text-slate-500 text-center py-12'>${isEn ? "No segment breakdown data available" : "暫無產品銷售結構分拆數據"}</p>`;
        return;
    }

    const years = Object.keys(breakdown.data || {}).sort();
    const categories = breakdown.categories;
    const colors = breakdown.colors;

    const traces = [];

    // Left Subplot: Value
    categories.forEach((cat, idx) => {
        traces.push({
            x: years,
            y: years.map(y => breakdown.data[y]?.value[idx] || 0),
            name: cat,
            type: "bar",
            xaxis: "x1",
            yaxis: "y1",
            marker: { color: colors[idx] },
            legendgroup: cat
        });
    });

    // Right Subplot: Volume
    categories.forEach((cat, idx) => {
        traces.push({
            x: years,
            y: years.map(y => breakdown.data[y]?.volume[idx] || 0),
            name: cat,
            type: "bar",
            xaxis: "x2",
            yaxis: "y2",
            marker: { color: colors[idx] },
            legendgroup: cat,
            showlegend: false
        });
    });

    const layout = {
        barmode: "stack",
        grid: { rows: 1, columns: 2, pattern: "independent" },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "#94A3B8", size: 10.5 },
        margin: { t: 30, r: 25, l: 45, b: 35 },
        legend: { orientation: "h", y: 1.15, x: 0.05 },
        xaxis1: { title: isEn ? `Value (${data.unit})` : `金額 (${data.unit})`, gridcolor: "#334155" },
        yaxis1: { title: isEn ? `Amount (${data.unit})` : `金額 (${data.unit})`, gridcolor: "#334155", autorange: true },
        xaxis2: { title: isEn ? "Volume (Physical Units)" : "出貨數量 (Units)", gridcolor: "#334155" },
        yaxis2: { title: isEn ? "Units" : "台數 (Units)", gridcolor: "#334155", autorange: true }
    };

    Plotly.newPlot("chartSalesBreakdown", traces, layout, { responsive: true, displayModeBar: false });
}

// -----------------------------------------------------------------
// 5. Render Master Comprehensive Table
// -----------------------------------------------------------------
function renderMasterTable(data) {
    const years = data.years;
    const headerRow = document.getElementById("tableHeaderRow");
    const tableBody = document.getElementById("tableBody");
    const isEn = currentLang === "en";
    const curSym = (data.currency && data.currency.includes("EUR")) ? "€" : "$";

    headerRow.innerHTML = `<th class="py-3 px-4 font-semibold text-slate-300">${isEn ? "Financial & Operational Metric / Unit" : "指標項目 (Metric / Unit)"}</th>`;
    years.forEach(y => {
        const th = document.createElement("th");
        th.className = "py-3 px-3 text-right font-bold text-blue-400";
        th.textContent = y;
        headerRow.appendChild(th);
    });

    const rows = [
        { label: isEn ? `Total Revenue (${data.unit})` : `營業收入 Revenue (${data.unit})`, key: "revenue", format: (v) => v ? v.toLocaleString() : "-" },
        { label: isEn ? "Revenue YoY Growth %" : "營收年增率 YoY %", key: "rev_growth_yoy", format: (v) => v !== null && v !== undefined ? `${v > 0 ? "+" : ""}${v}%` : "-" },
        { label: isEn ? `Gross Profit (${data.unit})` : `毛利 Gross Profit (${data.unit})`, key: "gross_profit", format: (v) => v ? v.toLocaleString() : "-" },
        { label: isEn ? "GAAP Gross Margin %" : "GAAP 毛利率 Gross Margin %", key: "gross_margin", format: (v) => v ? `${v}%` : "-" },
        { label: isEn ? "Gross Margin Change (pp)" : "毛利率年變動 (Percentage Points)", key: "gm_diff_pp", format: (v) => v !== null && v !== undefined ? `${v > 0 ? "+" : ""}${v} pp` : "-" },
        { label: isEn ? `Operating Income (${data.unit})` : `營業利益 Operating Income (${data.unit})`, key: "operating_income", format: (v) => v ? v.toLocaleString() : "-" },
        { label: isEn ? "Operating Margin %" : "營業利益率 Operating Margin %", key: "operating_margin", format: (v) => v ? `${v}%` : "-" },
        { label: isEn ? `Net Income (${data.unit})` : `淨利 Net Income (${data.unit})`, key: "net_income", format: (v) => v ? v.toLocaleString() : "-" },
        { label: isEn ? "Net Margin %" : "淨利率 Net Margin %", key: "net_margin", format: (v) => v ? `${v}%` : "-" },
        { label: isEn ? `R&D Expense (${data.unit})` : `研發費用 R&D Expense (${data.unit})`, key: "rd_expense", format: (v) => v ? v.toLocaleString() : "-" },
        { label: isEn ? "R&D as % of Revenue" : "研發佔營收比例 R&D as % of Revenue", key: "rd_pct_rev", format: (v) => v ? `${v}%` : "-" },
        { label: isEn ? "R&D YoY Growth %" : "研發費用年增率 R&D YoY %", key: "rd_growth_yoy", format: (v) => v !== null && v !== undefined ? `${v > 0 ? "+" : ""}${v}%` : "-" },
        { label: isEn ? "Total Headcount (FTE)" : "全球員工總數 Total Headcount (FTE)", key: "headcount", format: (v) => v ? v.toLocaleString() : "-" },
        { label: isEn ? "Headcount YoY Growth %" : "員工人數增速 Headcount YoY %", key: "hc_growth_yoy", format: (v) => v !== null && v !== undefined ? `${v > 0 ? "+" : ""}${v}%` : "-" },
        { label: isEn ? `Revenue per Employee (${curSym})` : `人均營業額 Revenue per Employee (${curSym})`, key: "rev_per_emp", format: (v) => v ? `${curSym}${v.toLocaleString()}` : "-" },
        { label: isEn ? `Gross Profit per Employee (${curSym})` : `人均毛利 Gross Profit per Employee (${curSym})`, key: "gp_per_emp", format: (v) => v ? `${curSym}${v.toLocaleString()}` : "-" },
        { label: isEn ? `Operating Income per Employee (${curSym})` : `人均營業利益 Operating Income per Employee (${curSym})`, key: "op_per_emp", format: (v) => v ? `${curSym}${v.toLocaleString()}` : "-" },
        { label: isEn ? `Net Income per Employee (${curSym})` : `人均淨利 Net Income per Employee (${curSym})`, key: "ni_per_emp", format: (v) => v ? `${curSym}${v.toLocaleString()}` : "-" },
        { label: isEn ? `R&D per Employee (${curSym})` : `人均研發費用 R&D per Employee (${curSym})`, key: "rd_per_emp", format: (v) => v ? `${curSym}${v.toLocaleString()}` : "-" }
    ];

    tableBody.innerHTML = "";
    rows.forEach(r => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-750 transition-colors";
        let html = `<td class="py-2.5 px-4 font-medium text-slate-300">${r.label}</td>`;
        years.forEach(y => {
            const val = data.financials[y]?.[r.key];
            const formatted = r.format(val);
            html += `<td class="py-2.5 px-3 text-right font-mono text-slate-100">${formatted}</td>`;
        });
        tr.innerHTML = html;
        tableBody.appendChild(tr);
    });
}

// -----------------------------------------------------------------
// 6. One-Click Pipeline Execution
// -----------------------------------------------------------------
async function runOneClickWorkflow() {
    const target = document.getElementById("targetInput").value.trim();
    const years = parseInt(document.getElementById("yearsSelect").value);
    const runBtn = document.getElementById("runWorkflowBtn");
    const progContainer = document.getElementById("progressContainer");
    const progBar = document.getElementById("progressBar");
    const progText = document.getElementById("progressText");
    const progPercent = document.getElementById("progressPercent");
    const isEn = currentLang === "en";

    if (!target) {
        alert(isEn ? "Please enter a target URL or ticker!" : "請輸入目標網址或代號！");
        return;
    }

    runBtn.disabled = true;
    runBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${isEn ? "Running Workflow..." : "工作流執行中..."}`;
    progContainer.classList.remove("hidden");
    progBar.style.width = "15%";
    progPercent.textContent = "15%";
    progText.textContent = isEn ? `Downloading last ${years} years reports for ${target}...` : `正在爬取並下載 ${target} 的近 ${years} 年財報 PDF...`;

    try {
        const res = await fetch("/api/run-workflow", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target: target, years: years })
        });

        progBar.style.width = "70%";
        progPercent.textContent = "70%";
        progText.textContent = isEn ? "Parsing PDF to Markdown and computing financial KPIs..." : "正在將 PDF 解析為 Markdown 並抽取全維度財務指標...";

        const result = await res.json();
        if (result.status === "success") {
            progBar.style.width = "100%";
            progPercent.textContent = "100%";
            progText.textContent = isEn ? `✅ Completed in ${result.elapsed_seconds}s! Processed ${result.downloaded_count} reports.` : `✅ 執行成功！耗時 ${result.elapsed_seconds} 秒。已處理 ${result.downloaded_count} 份報告。`;

            currentTicker = result.ticker;
            await loadCompanyList();
            await loadDashboard(currentTicker);
            await loadMarkdownFiles(currentTicker);
        } else {
            throw new Error(result.message || "Unknown error");
        }
    } catch (e) {
        progBar.style.width = "100%";
        progBar.classList.remove("bg-blue-500");
        progBar.classList.add("bg-red-500");
        progText.textContent = isEn ? `❌ Execution failed: ${e.message}` : `❌ 執行失敗: ${e.message}`;
    } finally {
        runBtn.disabled = false;
        runBtn.innerHTML = `<i class="fa-solid fa-play"></i> ${isEn ? "Run End-to-End Workflow" : "立即執行一步到位工作流"}`;
    }
}

// -----------------------------------------------------------------
// 7. Markdown Browser & Viewer
// -----------------------------------------------------------------
async function loadMarkdownFiles(ticker) {
    const listEl = document.getElementById("mdFileList");
    const isEn = currentLang === "en";
    try {
        const res = await fetch(`/api/markdown-files/${ticker}`);
        const data = await res.json();
        if (!data.files || data.files.length === 0) {
            listEl.innerHTML = `<p class='text-xs text-slate-500 text-center py-4'>${isEn ? "No parsed Markdown files" : "無已解析的 Markdown 檔案"}</p>`;
            return;
        }

        listEl.innerHTML = "";
        data.files.forEach((f, idx) => {
            const item = document.createElement("div");
            item.className = `p-2 rounded-lg cursor-pointer text-xs mb-1.5 transition-all flex items-center justify-between ${idx === 0 ? "bg-blue-600/30 text-blue-300 border border-blue-500/30" : "hover:bg-slate-800 text-slate-300"}`;
            item.innerHTML = `
                <div class="truncate flex items-center gap-1.5">
                    <i class="fa-regular fa-file-lines text-slate-400"></i>
                    <span class="font-medium truncate">${f.filename}</span>
                </div>
                <span class="text-[10px] text-slate-500">${(f.size_bytes / 1024).toFixed(1)} KB</span>
            `;
            item.addEventListener("click", () => {
                document.querySelectorAll("#mdFileList > div").forEach(d => {
                    d.className = "p-2 rounded-lg cursor-pointer text-xs mb-1.5 hover:bg-slate-800 text-slate-300 transition-all flex items-center justify-between";
                });
                item.className = "p-2 rounded-lg cursor-pointer text-xs mb-1.5 bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-all flex items-center justify-between";
                viewMarkdownFile(ticker, f.filename);
            });
            listEl.appendChild(item);
        });

        if (data.files.length > 0) {
            viewMarkdownFile(ticker, data.files[0].filename);
        }
    } catch (e) {
        listEl.innerHTML = `<p class='text-xs text-red-400 text-center py-4'>Error: ${e.message}</p>`;
    }
}

async function viewMarkdownFile(ticker, filename) {
    const preEl = document.getElementById("mdContentPre");
    const titleEl = document.getElementById("currentMdTitle");
    const copyBtn = document.getElementById("copyMdBtn");

    titleEl.textContent = `${filename}`;
    preEl.textContent = "Loading...";
    try {
        const res = await fetch(`/api/markdown-content/${ticker}/${filename}`);
        const data = await res.json();
        preEl.textContent = data.content || "Empty file";
        copyBtn.classList.remove("hidden");
    } catch (e) {
        preEl.textContent = `Error: ${e.message}`;
    }
}

// -----------------------------------------------------------------
// 8. Export Table to CSV
// -----------------------------------------------------------------
function exportTableToCSV() {
    if (!currentMetricsData) return;
    const years = currentMetricsData.years;
    let csv = "Metric," + years.join(",") + "\n";

    const rows = [
        ["Total Revenue", ...years.map(y => currentMetricsData.financials[y]?.revenue || "")],
        ["Revenue YoY %", ...years.map(y => currentMetricsData.financials[y]?.rev_growth_yoy || "")],
        ["Gross Profit", ...years.map(y => currentMetricsData.financials[y]?.gross_profit || "")],
        ["Gross Margin %", ...years.map(y => currentMetricsData.financials[y]?.gross_margin || "")],
        ["Operating Income", ...years.map(y => currentMetricsData.financials[y]?.operating_income || "")],
        ["Operating Margin %", ...years.map(y => currentMetricsData.financials[y]?.operating_margin || "")],
        ["Net Income", ...years.map(y => currentMetricsData.financials[y]?.net_income || "")],
        ["R&D Expense", ...years.map(y => currentMetricsData.financials[y]?.rd_expense || "")],
        ["R&D as % of Revenue", ...years.map(y => currentMetricsData.financials[y]?.rd_pct_rev || "")],
        ["Total Headcount", ...years.map(y => currentMetricsData.financials[y]?.headcount || "")],
        ["Revenue per Employee", ...years.map(y => currentMetricsData.financials[y]?.rev_per_emp || "")],
        ["Gross Profit per Employee", ...years.map(y => currentMetricsData.financials[y]?.gp_per_emp || "")],
        ["Operating Income per Employee", ...years.map(y => currentMetricsData.financials[y]?.op_per_emp || "")]
    ];

    rows.forEach(r => {
        csv += r.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${currentTicker}_financial_metrics.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
