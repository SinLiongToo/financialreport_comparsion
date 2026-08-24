/**
 * dashboard.js - Handles API calls, Plotly interactive multi-chart rendering,
 * and One-Click workflow execution.
 */

let currentTicker = "ASML";
let currentMetricsData = null;

document.addEventListener("DOMContentLoaded", () => {
    loadCompanyList();
    loadDashboard(currentTicker);
    loadMarkdownFiles(currentTicker);
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById("companySelect").addEventListener("change", (e) => {
        currentTicker = e.target.value;
        loadDashboard(currentTicker);
        loadMarkdownFiles(currentTicker);
    });

    document.getElementById("refreshBtn").addEventListener("click", () => {
        loadDashboard(currentTicker);
        loadMarkdownFiles(currentTicker);
    });

    document.getElementById("runWorkflowBtn").addEventListener("click", runOneClickWorkflow);

    document.getElementById("copyMdBtn").addEventListener("click", () => {
        const content = document.getElementById("mdContentPre").innerText;
        navigator.clipboard.writeText(content).then(() => {
            alert("Markdown 內容已複製至剪貼簿！");
        });
    });

    document.getElementById("exportCsvBtn").addEventListener("click", exportTableToCSV);
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
            opt.textContent = comp === "ASML" ? "ASML Holding N.V." : comp;
            select.appendChild(opt);
        });
        select.value = currentTicker;
    } catch (e) {
        console.error("Failed to load company list:", e);
    }
}

async function loadDashboard(ticker) {
    try {
        const res = await fetch(`/api/metrics/${ticker}`);
        if (!res.ok) throw new Error("Metrics not found");
        const data = await res.json();
        currentMetricsData = data;
        renderSummaryKPIs(data);
        
        // Render All 6 Charts
        renderInflectionChart(data);
        renderProductivityChart(data);
        renderProfitabilityChart(data);
        renderRdIntensityChart(data);
        renderGrowthDynamicsChart(data);
        renderSalesBreakdownChart(data);
        
        // Render Master Table
        renderMasterTable(data);
    } catch (e) {
        console.error("Failed to load metrics:", e);
    }
}

// -----------------------------------------------------------------
// 2. Render Summary Top KPIs
// -----------------------------------------------------------------
function renderSummaryKPIs(data) {
    const years = data.years || [];
    if (years.length === 0) return;
    const latestYear = years[years.length - 1];
    const fin = data.financials[latestYear] || {};

    // Revenue
    document.getElementById("kpiRevenue").textContent = `${data.unit}${fin.revenue?.toLocaleString() || "-"}`;
    document.getElementById("kpiRevenueYoY").textContent = fin.rev_growth_yoy ? `${fin.rev_growth_yoy > 0 ? "+" : ""}${fin.rev_growth_yoy}% YoY` : "-";

    // Gross Margin
    document.getElementById("kpiGrossMargin").textContent = `${fin.gross_margin || "-"}%`;
    document.getElementById("kpiMarginDiff").textContent = fin.gm_diff_pp ? `${fin.gm_diff_pp > 0 ? "+" : ""}${fin.gm_diff_pp} pp` : "-";

    // Operating Income
    document.getElementById("kpiOpIncome").textContent = `${data.unit}${fin.operating_income?.toLocaleString() || "-"}`;
    document.getElementById("kpiOpMargin").textContent = `利益率: ${fin.operating_margin || "-"}%`;

    // R&D Expense
    document.getElementById("kpiRdExpense").textContent = `${data.unit}${fin.rd_expense?.toLocaleString() || "-"}`;
    document.getElementById("kpiRdPct").textContent = `佔營收 ${fin.rd_pct_rev || "-"}%`;

    // Headcount
    document.getElementById("kpiHeadcount").textContent = fin.headcount?.toLocaleString() || "-";
    document.getElementById("kpiHeadcountPlateau").textContent = fin.hc_growth_yoy ? `${fin.hc_growth_yoy > 0 ? "+" : ""}${fin.hc_growth_yoy}% YoY` : "高原期";

    // Gross Profit per FTE
    document.getElementById("kpiGpPerEmp").textContent = fin.gp_per_emp ? `€${(fin.gp_per_emp / 1000).toFixed(1)}K` : "-";
    document.getElementById("kpiGpPerEmpYoY").textContent = fin.gp_growth_yoy ? `${fin.gp_growth_yoy > 0 ? "+" : ""}${fin.gp_growth_yoy}% YoY` : "-";
}

// -----------------------------------------------------------------
// 3. Render 6 Comprehensive Interactive Charts
// -----------------------------------------------------------------

// Chart 1: The Pivot (Headcount vs Gross Margin %)
function renderInflectionChart(data) {
    const years = data.years;
    const headcount = years.map(y => data.financials[y]?.headcount || 0);
    const grossMargin = years.map(y => data.financials[y]?.gross_margin || 0);

    const trace1 = {
        x: years,
        y: headcount,
        name: "全球員工數 (Headcount)",
        type: "bar",
        marker: { color: "rgba(59, 130, 246, 0.6)", line: { color: "#3B82F6", width: 1.5 } },
        yaxis: "y1"
    };

    const trace2 = {
        x: years,
        y: grossMargin,
        name: "GAAP 毛利率 (Gross Margin %)",
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
        margin: { t: 25, r: 40, l: 50, b: 35 },
        legend: { orientation: "h", y: 1.15, x: 0.05 },
        yaxis: {
            title: "員工人數 (FTE)",
            titlefont: { color: "#3B82F6" },
            tickfont: { color: "#3B82F6" },
            gridcolor: "#334155"
        },
        yaxis2: {
            title: "毛利率 (%)",
            titlefont: { color: "#10B981" },
            tickfont: { color: "#10B981" },
            overlaying: "y",
            side: "right",
            range: [38, 62],
            showgrid: false
        },
        xaxis: { gridcolor: "#334155" }
    };

    Plotly.newPlot("chartInflection", [trace1, trace2], layout, { responsive: true, displayModeBar: false });
}

// Chart 2: Productivity Trio (Revenue / GP / Operating Income per Employee)
function renderProductivityChart(data) {
    const years = data.years;
    const revPerEmp = years.map(y => Math.round((data.financials[y]?.rev_per_emp || 0) / 1000));
    const gpPerEmp = years.map(y => Math.round((data.financials[y]?.gp_per_emp || 0) / 1000));
    const opPerEmp = years.map(y => Math.round((data.financials[y]?.op_per_emp || 0) / 1000));

    const trace1 = {
        x: years,
        y: revPerEmp,
        name: "人均營收 (k€/FTE)",
        type: "scatter",
        mode: "lines+markers",
        line: { color: "#A855F7", width: 2.5 },
        marker: { size: 6 }
    };

    const trace2 = {
        x: years,
        y: gpPerEmp,
        name: "人均毛利 (k€/FTE)",
        type: "scatter",
        mode: "lines+markers",
        line: { color: "#F59E0B", width: 2.5 },
        marker: { size: 6 }
    };

    const trace3 = {
        x: years,
        y: opPerEmp,
        name: "人均營業利益 (k€/FTE)",
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
            title: "千歐元 / 員工 (k€/FTE)",
            gridcolor: "#334155"
        },
        xaxis: { gridcolor: "#334155" }
    };

    Plotly.newPlot("chartProductivity", [trace1, trace2, trace3], layout, { responsive: true, displayModeBar: false });
}

// Chart 3: Operating Profitability & Net Income + Operating Margin %
function renderProfitabilityChart(data) {
    const years = data.years;
    const opIncome = years.map(y => data.financials[y]?.operating_income || 0);
    const netIncome = years.map(y => data.financials[y]?.net_income || 0);
    const opMargin = years.map(y => data.financials[y]?.operating_margin || 0);

    const trace1 = {
        x: years,
        y: opIncome,
        name: "營業利益 (Operating Income)",
        type: "bar",
        marker: { color: "#0EA5E9" },
        yaxis: "y1"
    };

    const trace2 = {
        x: years,
        y: netIncome,
        name: "淨利 (Net Income)",
        type: "bar",
        marker: { color: "#6366F1" },
        yaxis: "y1"
    };

    const trace3 = {
        x: years,
        y: opMargin,
        name: "營業利益率 (Operating Margin %)",
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
        margin: { t: 25, r: 40, l: 50, b: 35 },
        legend: { orientation: "h", y: 1.15, x: 0.05 },
        yaxis: {
            title: "金額 (€ Millions)",
            gridcolor: "#334155"
        },
        yaxis2: {
            title: "利益率 (%)",
            titlefont: { color: "#F43F5E" },
            tickfont: { color: "#F43F5E" },
            overlaying: "y",
            side: "right",
            range: [15, 45],
            showgrid: false
        },
        xaxis: { gridcolor: "#334155" }
    };

    Plotly.newPlot("chartProfitability", [trace1, trace2, trace3], layout, { responsive: true, displayModeBar: false });
}

// Chart 4: R&D Expense & R&D Intensity (% of Revenue)
function renderRdIntensityChart(data) {
    const years = data.years;
    const rdExpense = years.map(y => data.financials[y]?.rd_expense || 0);
    const rdPct = years.map(y => data.financials[y]?.rd_pct_rev || 0);

    const trace1 = {
        x: years,
        y: rdExpense,
        name: "研發費用 R&D (€M)",
        type: "bar",
        marker: { color: "rgba(244, 63, 94, 0.7)", line: { color: "#F43F5E", width: 1.5 } },
        yaxis: "y1"
    };

    const trace2 = {
        x: years,
        y: rdPct,
        name: "研發佔營收比重 (%)",
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
        margin: { t: 25, r: 40, l: 50, b: 35 },
        legend: { orientation: "h", y: 1.15, x: 0.05 },
        yaxis: {
            title: "研發費用 (€ Millions)",
            titlefont: { color: "#F43F5E" },
            tickfont: { color: "#F43F5E" },
            gridcolor: "#334155"
        },
        yaxis2: {
            title: "佔營收比例 (%)",
            titlefont: { color: "#38BDF8" },
            tickfont: { color: "#38BDF8" },
            overlaying: "y",
            side: "right",
            range: [8, 22],
            showgrid: false
        },
        xaxis: { gridcolor: "#334155" }
    };

    Plotly.newPlot("chartRdIntensity", [trace1, trace2], layout, { responsive: true, displayModeBar: false });
}

// Chart 5: YoY Growth Multi-Dynamics (Rev vs GP vs HC Growth)
function renderGrowthDynamicsChart(data) {
    const years = data.years.slice(1); // skip first year without YoY
    const revYoY = years.map(y => data.financials[y]?.rev_growth_yoy || 0);
    const gpYoY = years.map(y => data.financials[y]?.gp_growth_yoy || 0);
    const opYoY = years.map(y => data.financials[y]?.op_growth_yoy || 0);
    const hcYoY = years.map(y => data.financials[y]?.hc_growth_yoy || 0);

    const trace1 = {
        x: years,
        y: revYoY,
        name: "營收年增率 (Revenue YoY %)",
        type: "scatter",
        mode: "lines+markers",
        line: { color: "#3B82F6", width: 2.5 }
    };

    const trace2 = {
        x: years,
        y: gpYoY,
        name: "毛利年增率 (Gross Profit YoY %)",
        type: "scatter",
        mode: "lines+markers",
        line: { color: "#10B981", width: 2.5 }
    };

    const trace3 = {
        x: years,
        y: opYoY,
        name: "營業利益年增率 (OpIncome YoY %)",
        type: "scatter",
        mode: "lines+markers",
        line: { color: "#06B6D4", width: 2 }
    };

    const trace4 = {
        x: years,
        y: hcYoY,
        name: "員工人數增速 (Headcount YoY %)",
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
            title: "年增率 (%)",
            gridcolor: "#334155"
        },
        xaxis: { gridcolor: "#334155" }
    };

    Plotly.newPlot("chartGrowthDynamics", [trace1, trace2, trace3, trace4], layout, { responsive: true, displayModeBar: false });
}

// Chart 6: Value vs. Volume Sales Breakdown
function renderSalesBreakdownChart(data) {
    const breakdown = data.sales_breakdown;
    if (!breakdown || !breakdown.categories || breakdown.categories.length === 0) {
        document.getElementById("chartSalesBreakdown").innerHTML = "<p class='text-slate-500 text-center py-12'>暫無產品銷售結構分拆數據</p>";
        return;
    }

    const years = Object.keys(breakdown.data || {}).sort();
    const categories = breakdown.categories;
    const colors = breakdown.colors;

    const traces = [];

    // Left Subplot: Value (€M)
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

    // Right Subplot: Volume (Units)
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
        xaxis1: { title: "年份 (金額 Value €M)", gridcolor: "#334155" },
        yaxis1: { title: "金額 (€M)", gridcolor: "#334155" },
        xaxis2: { title: "年份 (出貨台數 Units)", gridcolor: "#334155" },
        yaxis2: { title: "台數 (Units)", gridcolor: "#334155" }
    };

    Plotly.newPlot("chartSalesBreakdown", traces, layout, { responsive: true, displayModeBar: false });
}

// -----------------------------------------------------------------
// 4. Render Master Comprehensive Table
// -----------------------------------------------------------------
function renderMasterTable(data) {
    const years = data.years;
    const headerRow = document.getElementById("tableHeaderRow");
    const tableBody = document.getElementById("tableBody");

    // Header
    headerRow.innerHTML = '<th class="py-3 px-4 font-semibold text-slate-300">指標項目 (Metric / Unit)</th>';
    years.forEach(y => {
        const th = document.createElement("th");
        th.className = "py-3 px-3 text-right font-bold text-blue-400";
        th.textContent = y;
        headerRow.appendChild(th);
    });

    // All Metrics Rows
    const rows = [
        // Top-line & Profit
        { label: `營業收入 Revenue (${data.unit})`, key: "revenue", format: (v) => v ? v.toLocaleString() : "-" },
        { label: "營收年增率 YoY %", key: "rev_growth_yoy", format: (v) => v !== null && v !== undefined ? `${v > 0 ? "+" : ""}${v}%` : "-" },
        { label: `毛利 Gross Profit (${data.unit})`, key: "gross_profit", format: (v) => v ? v.toLocaleString() : "-" },
        { label: "GAAP 毛利率 Gross Margin %", key: "gross_margin", format: (v) => v ? `${v}%` : "-" },
        { label: "毛利率年變動 (Percentage Points)", key: "gm_diff_pp", format: (v) => v !== null && v !== undefined ? `${v > 0 ? "+" : ""}${v} pp` : "-" },
        { label: `營業利益 Operating Income (${data.unit})`, key: "operating_income", format: (v) => v ? v.toLocaleString() : "-" },
        { label: "營業利益率 Operating Margin %", key: "operating_margin", format: (v) => v ? `${v}%` : "-" },
        { label: `淨利 Net Income (${data.unit})`, key: "net_income", format: (v) => v ? v.toLocaleString() : "-" },
        { label: "淨利率 Net Margin %", key: "net_margin", format: (v) => v ? `${v}%` : "-" },
        
        // R&D
        { label: `研發費用 R&D Expense (${data.unit})`, key: "rd_expense", format: (v) => v ? v.toLocaleString() : "-" },
        { label: "研發佔營收比例 R&D as % of Revenue", key: "rd_pct_rev", format: (v) => v ? `${v}%` : "-" },
        { label: "研發費用年增率 R&D YoY %", key: "rd_growth_yoy", format: (v) => v !== null && v !== undefined ? `${v > 0 ? "+" : ""}${v}%` : "-" },
        
        // Headcount & Productivity
        { label: "全球員工總數 Total Headcount (FTE)", key: "headcount", format: (v) => v ? v.toLocaleString() : "-" },
        { label: "員工人數增速 Headcount YoY %", key: "hc_growth_yoy", format: (v) => v !== null && v !== undefined ? `${v > 0 ? "+" : ""}${v}%` : "-" },
        { label: "人均營業額 Revenue per Employee (€)", key: "rev_per_emp", format: (v) => v ? `€${v.toLocaleString()}` : "-" },
        { label: "人均毛利 Gross Profit per Employee (€)", key: "gp_per_emp", format: (v) => v ? `€${v.toLocaleString()}` : "-" },
        { label: "人均營業利益 Operating Income per Employee (€)", key: "op_per_emp", format: (v) => v ? `€${v.toLocaleString()}` : "-" },
        { label: "人均淨利 Net Income per Employee (€)", key: "ni_per_emp", format: (v) => v ? `€${v.toLocaleString()}` : "-" },
        { label: "人均研發費用 R&D per Employee (€)", key: "rd_per_emp", format: (v) => v ? `€${v.toLocaleString()}` : "-" }
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
// 5. One-Click Pipeline Execution
// -----------------------------------------------------------------
async function runOneClickWorkflow() {
    const target = document.getElementById("targetInput").value.trim();
    const years = parseInt(document.getElementById("yearsSelect").value);
    const runBtn = document.getElementById("runWorkflowBtn");
    const progContainer = document.getElementById("progressContainer");
    const progBar = document.getElementById("progressBar");
    const progText = document.getElementById("progressText");
    const progPercent = document.getElementById("progressPercent");

    if (!target) {
        alert("請輸入目標網址或代號！");
        return;
    }

    runBtn.disabled = true;
    runBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 工作流執行中...';
    progContainer.classList.remove("hidden");
    progBar.style.width = "15%";
    progPercent.textContent = "15%";
    progText.textContent = `正在爬取並下載 ${target} 的近 ${years} 年財報 PDF...`;

    try {
        const res = await fetch("/api/run-workflow", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target: target, years: years })
        });

        progBar.style.width = "70%";
        progPercent.textContent = "70%";
        progText.textContent = "正在將 PDF 解析為 Markdown 並抽取全維度財務指標...";

        const result = await res.json();
        if (result.status === "success") {
            progBar.style.width = "100%";
            progPercent.textContent = "100%";
            progText.textContent = `✅ 執行成功！耗時 ${result.elapsed_seconds} 秒。已下載 ${result.downloaded_count} 份報告。`;

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
        progText.textContent = `❌ 執行失敗: ${e.message}`;
    } finally {
        runBtn.disabled = false;
        runBtn.innerHTML = '<i class="fa-solid fa-play"></i> 立即執行一步到位工作流';
    }
}

// -----------------------------------------------------------------
// 6. Markdown Browser & Viewer
// -----------------------------------------------------------------
async function loadMarkdownFiles(ticker) {
    const listEl = document.getElementById("mdFileList");
    try {
        const res = await fetch(`/api/markdown-files/${ticker}`);
        const data = await res.json();
        if (!data.files || data.files.length === 0) {
            listEl.innerHTML = "<p class='text-xs text-slate-500 text-center py-4'>無已解析的 Markdown 檔案</p>";
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
        listEl.innerHTML = `<p class='text-xs text-red-400 text-center py-4'>讀取失敗: ${e.message}</p>`;
    }
}

async function viewMarkdownFile(ticker, filename) {
    const preEl = document.getElementById("mdContentPre");
    const titleEl = document.getElementById("currentMdTitle");
    const copyBtn = document.getElementById("copyMdBtn");

    titleEl.textContent = `${filename}`;
    preEl.textContent = "載入中...";
    try {
        const res = await fetch(`/api/markdown-content/${ticker}/${filename}`);
        const data = await res.json();
        preEl.textContent = data.content || "檔案為空";
        copyBtn.classList.remove("hidden");
    } catch (e) {
        preEl.textContent = `載入錯誤: ${e.message}`;
    }
}

// -----------------------------------------------------------------
// 7. Export Table to CSV
// -----------------------------------------------------------------
function exportTableToCSV() {
    if (!currentMetricsData) return;
    const years = currentMetricsData.years;
    let csv = "Metric," + years.join(",") + "\n";

    const rows = [
        ["Revenue", ...years.map(y => currentMetricsData.financials[y]?.revenue || "")],
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
