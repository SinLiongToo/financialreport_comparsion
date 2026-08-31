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
let COMPARE_SORT_COL = "revenue";
let COMPARE_SORT_DIR = "desc";
let ACTIVE_VIEW = "single"; // "single" | "compare"

// Helper: robust number parser for financial values
function safeNum(val) {
    if (val == null) return null;
    if (typeof val === "number") return isNaN(val) ? null : val;
    if (typeof val === "string") {
        const clean = val.replace(/[%$,]/g, "").trim();
        const num = parseFloat(clean);
        return isNaN(num) ? null : num;
    }
    return null;
}

function calculateMedian(values) {
    if (!values || values.length === 0) return 0;
    const sorted = [...values].filter(v => v != null && !isNaN(v) && isFinite(v)).sort((a, b) => a - b);
    if (sorted.length === 0) return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

let SCATTER_CONFIG = {
    x: "gm",
    y: "opm",
    size: "revenue",
    trail: false,
    activePreset: "gm_op"
};

const SCATTER_METRICS = {
    gm: {
        id: "gm",
        label: { en: "Gross Margin %", zh: "毛利率 %" },
        unit: "%",
        axisTitle: { en: "Gross Margin (%)", zh: "GAAP 毛利率 (%)" },
        format: (v) => `${(v ?? 0).toFixed(2)}%`,
        getVal: (f) => f ? safeNum(f.gross_margin) : null
    },
    opm: {
        id: "opm",
        label: { en: "Operating Margin %", zh: "營業利益率 %" },
        unit: "%",
        axisTitle: { en: "Operating Margin (%)", zh: "營業利益率 (%)" },
        format: (v) => `${(v ?? 0).toFixed(2)}%`,
        getVal: (f) => f ? safeNum(f.operating_margin) : null
    },
    rd: {
        id: "rd",
        label: { en: "R&D % of Rev", zh: "研發佔比 %" },
        unit: "%",
        axisTitle: { en: "R&D Intensity (% of Rev)", zh: "研發強度佔營收比重 (%)" },
        format: (v) => `${(v ?? 0).toFixed(2)}%`,
        getVal: (f) => f ? safeNum(f.rd_pct_rev) : null
    },
    rev_per_emp: {
        id: "rev_per_emp",
        label: { en: "Rev / FTE ($k)", zh: "人均營收 ($k)" },
        unit: "$k",
        axisTitle: { en: "Revenue per FTE ($k)", zh: "人均營收產值 ($k / FTE)" },
        format: (v) => `$${Math.round(v ?? 0).toLocaleString()}k`,
        getVal: (f) => {
            const v = f ? safeNum(f.rev_per_emp) : null;
            return v != null ? v / 1000 : null;
        }
    },
    gp_per_emp: {
        id: "gp_per_emp",
        label: { en: "GP / FTE ($k)", zh: "人均毛利 ($k)" },
        unit: "$k",
        axisTitle: { en: "Gross Profit per FTE ($k)", zh: "人均毛利產值 ($k / FTE)" },
        format: (v) => `$${Math.round(v ?? 0).toLocaleString()}k`,
        getVal: (f) => {
            const v = f ? safeNum(f.gp_per_emp) : null;
            return v != null ? v / 1000 : null;
        }
    },
    revenue: {
        id: "revenue",
        label: { en: "Revenue ($M)", zh: "營業收入 ($M)" },
        unit: "$M",
        axisTitle: { en: "Revenue ($M)", zh: "營業收入 ($M)" },
        format: (v) => `$${Math.round(v ?? 0).toLocaleString()}M`,
        getVal: (f) => f ? safeNum(f.revenue) : null
    },
    headcount: {
        id: "headcount",
        label: { en: "Headcount (FTE)", zh: "全球員工人數 (人)" },
        unit: " FTE",
        axisTitle: { en: "Headcount (FTE)", zh: "全球員工人數 (人)" },
        format: (v) => `${Math.round(v ?? 0).toLocaleString()} 人`,
        getVal: (f) => f ? safeNum(f.headcount) : null
    },
    constant: {
        id: "constant",
        label: { en: "Uniform Size", zh: "固定大小" },
        unit: "",
        axisTitle: { en: "Uniform", zh: "固定大小" },
        format: () => "-",
        getVal: () => 1
    }
};

const COMPANY_COLORS = {
    "asus": "#00539B",
    "asml": "#00A3E0",
    "tsmc": "#EF4444",
    "mediatek": "#F97316",
    "2454": "#F97316",
    "mtk": "#F97316",
    "nvda": "#10B981",
    "googl": "#3B82F6",
    "google": "#3B82F6",
    "aapl": "#CBD5E1",
    "apple": "#CBD5E1",
    "amd": "#F43F5E",
    "advanced-micro-devices": "#F43F5E",
    "mu": "#38BDF8",
    "micron": "#38BDF8",
    "klac": "#F59E0B",
    "kla": "#F59E0B",
    "ter": "#818CF8",
    "teradyne": "#818CF8",
    "ase": "#14B8A6",
    "asx": "#14B8A6",
    "3711": "#14B8A6",
    "nxp": "#FB923C",
    "nxpi": "#FB923C",
    "vsh": "#A855F7",
    "vishay": "#A855F7",
    "msft": "#0284C7",
    "microsoft": "#0284C7",
    "amat": "#EC4899",
    "applied-materials": "#EC4899",
    "meta": "#6366F1",
    "meta-platforms": "#6366F1",
    "amazon": "#F97316",
    "palantir": "#06B6D4",
    "pltr": "#06B6D4",
    "advantest": "#E11D48",
    "6857": "#E11D48",
    "samsung": "#60A5FA",
    "005930": "#60A5FA",
    "foxconn": "#F59E0B",
    "honhai": "#F59E0B",
    "2317": "#F59E0B",
    "arm": "#0284C7",
    "arm-holdings": "#0284C7",
    "ttm": "#1E3A8A",
    "ttm-technologies": "#1E3A8A",
    "ttmi": "#1E3A8A",
    "infineon": "#059669",
    "ifx": "#059669",
    "ifnny": "#059669",
    "quanta": "#D97706",
    "2382": "#D97706",
    "quantatw": "#D97706",
    "wistron": "#06B6D4",
    "3231": "#06B6D4",
    "pegatron": "#E11D48",
    "4938": "#E11D48",
    "merck-kgaa": "#10B981",
    "mrk-de": "#10B981",
    "mrk.de": "#10B981",
    "mkgay": "#10B981",
    "emd": "#10B981",
    "ma-tek": "#0284C7",
    "ma_tek": "#0284C7",
    "matek": "#0284C7",
    "3587": "#0284C7",
    "avgo": "#DC2626",
    "broadcom": "#DC2626",
    "broadcom-inc": "#DC2626",
    "lrcx": "#0284C7",
    "lam-research": "#0284C7",
    "lam-research-corp": "#0284C7",
    "lam-research-corporation": "#0284C7"
};

const COMPANY_COUNTRIES = {
    "asus": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "asustek": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "asustek-computer": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "2357": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "mediatek": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "2454": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "mtk": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "mediatek-inc": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "lrcx": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "lam-research": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "lam-research-corp": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "lam-research-corporation": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "avgo": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "broadcom": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "broadcom-inc": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "ma-tek": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "ma_tek": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "matek": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "3587": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "merck-kgaa": { en: "Germany 🇩🇪", zh: "德國 🇩🇪", code: "DE" },
    "mrk-de": { en: "Germany 🇩🇪", zh: "德國 🇩🇪", code: "DE" },
    "mrk.de": { en: "Germany 🇩🇪", zh: "德國 🇩🇪", code: "DE" },
    "wistron": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "3231": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "pegatron": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "4938": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "quanta": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "2382": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "asml": { en: "Netherlands 🇳🇱", zh: "荷蘭 🇳🇱", code: "NL" },
    "tsmc": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "tsm": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "2330": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "nvda": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "nvidia": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "arm": { en: "United Kingdom 🇬🇧", zh: "英國 🇬🇧", code: "UK" },
    "arm-holdings": { en: "United Kingdom 🇬🇧", zh: "英國 🇬🇧", code: "UK" },
    "arm-holdings-plc": { en: "United Kingdom 🇬🇧", zh: "英國 🇬🇧", code: "UK" },
    "foxconn": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "honhai": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "2317": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "delta": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "delta-electronics": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "2308": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "umc": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "2303": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "united-microelectronics": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "googl": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "google": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "alphabet": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "alphabet-google": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "aapl": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "apple": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "apple-inc": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "amd": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "advanced-micro-devices": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "mu": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "micron": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "micron-technology": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "klac": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "kla": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "kla-tencor": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "kla-corporation": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "ter": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "teradyne": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "teradyne-inc": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "ase": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "asx": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "3711": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "ase-group": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "ase-technology": { en: "Taiwan 🇹🇼", zh: "台灣 🇹🇼", code: "TW" },
    "nxp": { en: "Netherlands 🇳🇱", zh: "荷蘭 🇳🇱", code: "NL" },
    "nxpi": { en: "Netherlands 🇳🇱", zh: "荷蘭 🇳🇱", code: "NL" },
    "nxp-semiconductors": { en: "Netherlands 🇳🇱", zh: "荷蘭 🇳🇱", code: "NL" },
    "infineon": { en: "Germany 🇩🇪", zh: "德國 🇩🇪", code: "DE" },
    "ifx": { en: "Germany 🇩🇪", zh: "德國 🇩🇪", code: "DE" },
    "ifnny": { en: "Germany 🇩🇪", zh: "德國 🇩🇪", code: "DE" },
    "infineon-technologies": { en: "Germany 🇩🇪", zh: "德國 🇩🇪", code: "DE" },
    "ttm": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "ttmi": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "ttm-technologies": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "vsh": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "vishay": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "vishay-intertechnology": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "msft": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "microsoft": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "microsoft-corporation": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "amat": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "applied-materials": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "meta": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "meta-platforms": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "amazon": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "amzn": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "pltr": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "palantir": { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" },
    "advantest": { en: "Japan 🇯🇵", zh: "日本 🇯🇵", code: "JP" },
    "6857": { en: "Japan 🇯🇵", zh: "日本 🇯🇵", code: "JP" },
    "samsung": { en: "South Korea 🇰🇷", zh: "南韓 🇰🇷", code: "KR" },
    "005930": { en: "South Korea 🇰🇷", zh: "南韓 🇰🇷", code: "KR" }
};

const COMPANY_SECTORS = {
    // 系統組裝 / 品牌 / OEM / ODM / EMS
    "asus": "SYSTEM",
    "2357": "SYSTEM",
    "quanta": "SYSTEM",
    "2382": "SYSTEM",
    "wistron": "SYSTEM",
    "3231": "SYSTEM",
    "pegatron": "SYSTEM",
    "4938": "SYSTEM",
    "foxconn": "SYSTEM",
    "2317": "SYSTEM",
    "delta": "SYSTEM",
    "2308": "SYSTEM",
    "ttm": "SYSTEM",

    // 晶圓代工 / IDM / 功率與車用半導體
    "tsmc": "FOUNDRY",
    "2330": "FOUNDRY",
    "umc": "FOUNDRY",
    "2303": "FOUNDRY",
    "samsung": "FOUNDRY",
    "infineon": "FOUNDRY",
    "nxp": "FOUNDRY",
    "vsh": "FOUNDRY",

    // IC設計 / Fabless / IP / 運算晶片
    "nvda": "FABLESS",
    "amd": "FABLESS",
    "mediatek": "FABLESS",
    "2454": "FABLESS",
    "avgo": "FABLESS",
    "broadcom": "FABLESS",
    "arm": "FABLESS",
    "mu": "FABLESS",
    "aapl": "FABLESS",

    // 半導體製造設備 / 材料 (Wafer Fab Equipment & Materials)
    "asml": "EQUIPMENT",
    "amat": "EQUIPMENT",
    "applied-materials": "EQUIPMENT",
    "lrcx": "EQUIPMENT",
    "lam-research": "EQUIPMENT",
    "lam-research-corp": "EQUIPMENT",
    "lam-research-corporation": "EQUIPMENT",
    "klac": "EQUIPMENT",
    "kla": "EQUIPMENT",
    "kla-tencor": "EQUIPMENT",
    "merck-kgaa": "EQUIPMENT",
    "mrk-de": "EQUIPMENT",
    "mrk.de": "EQUIPMENT",
    "mkgay": "EQUIPMENT",

    // 半導體測試機台 / 封測 / 分析實驗室 (Semiconductor Testing, ATE & OSAT)
    "advantest": "TESTING",
    "6857": "TESTING",
    "ter": "TESTING",
    "teradyne": "TESTING",
    "ase": "TESTING",
    "3711": "TESTING",
    "ase-group": "TESTING",
    "asx": "TESTING",
    "ma-tek": "TESTING",
    "3587": "TESTING",
    "matek": "TESTING",
    "ma_tek": "TESTING",

    // 雲端 / AI 平台與軟體 (Hyperscalers & Enterprise Software)
    "googl": "HYPERSCALE",
    "msft": "HYPERSCALE",
    "meta": "HYPERSCALE",
    "amzn": "HYPERSCALE",
    "pltr": "HYPERSCALE"
};

const SECTOR_METADATA = {
    "SYSTEM": {
        en: "System OEM/ODM",
        zh: "系統組裝/ODM",
        icon: "fa-laptop-code",
        color: "#3B82F6",
        badge: "bg-blue-500/20 text-blue-300 border border-blue-500/30"
    },
    "FOUNDRY": {
        en: "Foundry / IDM",
        zh: "晶圓製造/IDM",
        icon: "fa-microchip",
        color: "#10B981",
        badge: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
    },
    "FABLESS": {
        en: "Fabless / IC Design",
        zh: "IC設計/Fabless",
        icon: "fa-brain",
        color: "#F59E0B",
        badge: "bg-amber-500/20 text-amber-300 border border-amber-500/30"
    },
    "EQUIPMENT": {
        en: "Fab Equipment & Materials",
        zh: "半導體製造設備/材料",
        icon: "fa-microscope",
        color: "#8B5CF6",
        badge: "bg-purple-500/20 text-purple-300 border border-purple-500/30"
    },
    "TESTING": {
        en: "Semiconductor Testing & OSAT",
        zh: "半導體測試/ATE/封測",
        icon: "fa-flask-vial",
        color: "#EC4899",
        badge: "bg-pink-500/20 text-pink-300 border border-pink-500/30"
    },
    "HYPERSCALE": {
        en: "Cloud & AI Software",
        zh: "雲端軟體/AI",
        icon: "fa-cloud",
        color: "#06B6D4",
        badge: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
    }
};

let CURRENT_COMPARE_COUNTRY_FILTER = "ALL";
let CURRENT_COMPARE_SECTOR_FILTER = "ALL";

const TICKER_CANONICAL_MAP = {
    "asus": "asus",
    "2357": "asus",
    "asustek": "asus",
    "asustek-computer": "asus",
    "arm": "arm",
    "arm-holdings": "arm",
    "arm-holdings-plc": "arm",
    "ttm": "ttm",
    "ttm-technologies": "ttm",
    "ttmi": "ttm",
    "infineon": "infineon",
    "ifx": "infineon",
    "ifnny": "infineon",
    "infineon-technologies": "infineon",
    "nvidia": "nvda",
    "nvda": "nvda",
    "amd": "amd",
    "advanced-micro-devices": "amd",
    "advanced-micro-devices-inc": "amd",
    "tsmc": "tsmc",
    "tsm": "tsmc",
    "2330": "tsmc",
    "taiwan-semiconductor-manufacturing": "tsmc",
    "taiwan-semiconductor": "tsmc",
    "taiwan-semiconductor-manufacturing-company": "tsmc",
    "mediatek": "mediatek",
    "2454": "mediatek",
    "mtk": "mediatek",
    "mediatek-inc": "mediatek",
    "asml": "asml",
    "vishay": "vsh",
    "vsh": "vsh",
    "vishay-intertechnology": "vsh",
    "nxp": "nxp",
    "nxpi": "nxp",
    "nxp-semiconductors": "nxp",
    "amat": "amat",
    "applied-materials": "amat",
    "goog": "googl",
    "googl": "googl",
    "google": "googl",
    "alphabet": "googl",
    "alphabet-google": "googl",
    "aapl": "aapl",
    "apple": "aapl",
    "apple-inc": "aapl",
    "ase": "ase",
    "ase-group": "ase",
    "asx": "ase",
    "3711": "ase",
    "ase-technology": "ase",
    "ase-technology-holding": "ase",
    "mu": "mu",
    "micron": "mu",
    "micron-technology": "mu",
    "klac": "klac",
    "kla": "klac",
    "kla-tencor": "klac",
    "kla-corporation": "klac",
    "ter": "ter",
    "teradyne": "ter",
    "teradyne-inc": "ter",
    "msft": "msft",
    "microsoft": "msft",
    "microsoft-corporation": "msft",
    "microsoft-corp": "msft",
    "meta": "meta",
    "meta-platforms": "meta",
    "amazon": "amzn",
    "amzn": "amzn",
    "palantir": "pltr",
    "pltr": "pltr",
    "advantest": "advantest",
    "6857": "advantest",
    "samsung": "samsung",
    "005930": "samsung",
    "foxconn": "foxconn",
    "honhai": "foxconn",
    "hon-hai": "foxconn",
    "2317": "foxconn",
    "foxconn-technology-group": "foxconn",
    "hon-hai-precision": "foxconn",
    "hon-hai-precision-industry": "foxconn",
    "hnhpf": "foxconn",
    "hhpd": "foxconn",
    "delta": "delta",
    "delta-electronics": "delta",
    "delta-electronics-inc": "delta",
    "delta-ww": "delta",
    "2308": "delta",
    "umc": "umc",
    "2303": "umc",
    "united-microelectronics": "umc",
    "quanta": "quanta",
    "2382": "quanta",
    "quanta-computer": "quanta",
    "quanta-computer-inc": "quanta",
    "quantatw": "quanta",
    "wistron": "wistron",
    "3231": "wistron",
    "wistron-corp": "wistron",
    "wistron-corporation": "wistron",
    "pegatron": "pegatron",
    "4938": "pegatron",
    "pegatron-corp": "pegatron",
    "pegatron-corporation": "pegatron",
    "merck-kgaa": "merck-kgaa",
    "mrk-de": "merck-kgaa",
    "mrk.de": "merck-kgaa",
    "mkgay": "merck-kgaa",
    "emd": "merck-kgaa",
    "merck-group": "merck-kgaa",
    "ma-tek": "ma-tek",
    "ma_tek": "ma-tek",
    "matek": "ma-tek",
    "3587": "ma-tek",
    "3587.tw": "ma-tek",
    "3587.two": "ma-tek",
    "materials-analysis-technology": "ma-tek",
    "materials-analysis-technology-inc": "ma-tek",
    "avgo": "avgo",
    "broadcom": "avgo",
    "broadcom-inc": "avgo",
    "broadcom-corporation": "avgo",
    "lrcx": "lrcx",
    "lam-research": "lrcx",
    "lam-research-corp": "lrcx",
    "lam-research-corporation": "lrcx"
};

function FinancialMetricsExtractor_canonical_ticker(ticker) {
    if (!ticker) return "";
    const clean = String(ticker).toLowerCase().trim();
    return TICKER_CANONICAL_MAP[clean] || clean;
}

const DEFAULT_PALETTE = ["#00A3E0", "#EF4444", "#10B981", "#F59E0B", "#A855F7", "#EC4899", "#14B8A6", "#3B82F6", "#F97316", "#06B6D4", "#E11D48", "#818CF8", "#38BDF8"];

const I18N_DICT = {
    en: {
        badge_workflow: "One-Click Workflow",
        header_subtitle: "Annual Reports Crawler (20-F/10-K) ➔ Markdown Parser ➔ Productivity & Strategic Alignment",
        header_updated: "Updated: 2026-08-31",
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
        chart6a_title: "Chart 6A: High-Value Revenue Segment Breakdown ($M)",
        chart6b_title: "Chart 6B: Product Shipment Volume & Mix Breakdown (%)",
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
        guide_sec1_title: "1. One-Click End-to-End Workflow Pipeline & Technical Architecture",
        guide_sec1_p1: "Enter any target company (e.g. ASML, TSMC, NVDA, NXP, VSH, AMAT) or a full CompaniesMarketCap URL, choose the number of years (3 to 10), and click 'Run End-to-End Workflow'. The system executes a fully automated 5-stage pipeline:",
        guide_pipe_s1_title: "Stage 1: Target Resolution & Sub-Second Cached Crawler",
        guide_pipe_s1_desc: "Automatically detects issuer domicile (US Domestic Form 10-K/10-Q vs. Foreign Private Issuer Form 20-F/6-K) and target reporting horizon. Downloads official SEC PDFs directly into <code>data/downloads/</code>. Incorporates high-efficiency local caching so previously downloaded filings load in 0.1s without re-requesting the web.",
        guide_pipe_s2_title: "Stage 2: Structural PDF-to-Markdown Lossless Table Parser",
        guide_pipe_s2_desc: "Solves the fundamental problem where traditional PDF converters scramble multi-column table layouts. Uses coordinate grid table extraction to pinpoint audited statements (Income Statements, Segment Revenue, and Headcount sections), outputting clean, standardized GitHub Markdown tables (<code>.md</code>) in <code>data/parsed_md/</code>.",
        guide_pipe_s3_title: "Stage 3: Dual-Track Financial Extraction & 10-Q Linear Interpolation",
        guide_pipe_s3_desc: "<strong>Track A (Benchmark Library):</strong> Instant zero-delay loading for audited benchmarks (ASML, TSMC, NVDA, NXP, VSH, AMD, AMAT, GOOGL, etc.).<br><strong>Track B (LLM Semantic Deduction):</strong> For new companies, derives key line items (Revenue, COGS, Gross Profit, OpIncome, R&D).<br><strong>10-Q Headcount Interpolation:</strong> Because SEC Form 10-Q does not mandate quarterly employee disclosures, the engine anchors to annual 10-K audit numbers and computes smooth linear quarterly headcount interpolation ($Q1 \\rightarrow Q2 \\rightarrow Q3 \\rightarrow Q4$).",
        guide_pipe_s4_title: "Stage 4: Strategic OpEx & Human Capital Productivity Engine",
        guide_pipe_s4_desc: "Synthesizes financial statements with organizational workforce scale. Computes the <strong>Productivity Trio</strong> (Revenue per FTE, Gross Profit per FTE, Operating Income per FTE), evaluates <strong>Operating Leverage</strong> (fixed cost absorption), calculates <strong>R&D Reinvestment Intensity %</strong>, and identifies <strong>'The Pivot'</strong> (when gross margins expand via automation even after headcount plateaus).",
        guide_pipe_s5_title: "Stage 5: Interactive Dual-View Dashboard & LLM Executive Synthesis",
        guide_pipe_s5_desc: "Renders 6 interactive Plotly visual charts with HD zoom modal and CSV exports across both <em>Single Company Deep Dive</em> and <em>Multi-Company Peer Comparison</em> modes. Enables 1-click Markdown copying to feed into Gemini / Claude / ChatGPT with project prompts (<code>fininacial_prompt.md</code>) to generate 16:9 C-suite presentation slides in seconds.",
        guide_sec_compare_title: "2. Multi-Company Peer Comparison Mode",
        guide_sec_compare_p: "Switch between 'Single Company Deep Dive' and 'Multi-Company Peer Comparison' at the top. In comparison mode, check multiple companies to analyze cross-company Gross Margin pricing power, Human Capital Productivity ROI ($/FTE), Operating Leverage, and R&D Reinvestment Intensity side-by-side.",
        guide_sec2_title: "3. Top Switcher vs. Bottom Console (Two-Way Synchronization)",
        guide_sec3_title: "4. Visual Charts & Strategic OpEx Framework Guide",
        guide_sec5_title_new: "5. Multi-Format Global Filing Systems & Accounting Frameworks Comparison",
        guide_sec5_p_new: "Global tech enterprises file statutory disclosures under different jurisdictions, accounting standards (US GAAP vs. IFRS), and reporting frequencies:",
        guide_sec6_title: "6. Multi-Currency & Unit Scale Automatic Normalization Engine (USD $M Standardization)",
        guide_sec6_p1: "To enable true apple-to-apple cross-company and cross-border comparisons (e.g. TSMC vs. ASML vs. NVDA vs. Foxconn), our OpEx engine automatically standardizes all reported figures into <strong>USD Millions ($M)</strong> and applies rigorous scale sanitization:",
        guide_sec6_c1_title: "1. Historical Benchmark Exchange Rate Matrix",
        guide_sec6_c1_desc: "Converts international filings using official historical annual & quarterly benchmark exchange rates:",
        guide_sec6_c2_title: "2. Scale Sanitization & Financial Sanity Checks",
        guide_sec6_c2_desc: "Automatically detects reporting units in table headers to eliminate 1,000× or 1,000,000× scale distortion:",
        guide_sec7_title: "7. Why Multi-Format & SEC Parsing Still Needs LLM Semantic Dynamic Correction",
        guide_sec7_p1: "While our parser structurally converts 20-F, 10-K, 10-Q, and Taiwan TWSE tables into flawless Markdown, real-world corporate filings exhibit non-standard line items and unstructured narratives that require LLM (Gemini / Claude / GPT) semantic deduction:",
        guide_sec5_title: "8. Using Parsed Markdown with LLMs (Gemini / Claude / ChatGPT)",
        guide_sec5_p: "Select any parsed .md file in the bottom browser, click 'Copy Markdown', and paste it into Gemini with fininacial_prompt.md or sale_breakdown.md for instant 16:9 executive presentation decks and pitch scripts.",
        compare_selector_title: "Multi-Company Peer Benchmark Selection",
        compare_selector_subtitle: "Select 2 or more companies to compare Gross Margin, Productivity, Operating Leverage & R&D Intensity",
        btn_select_all: "Select All",
        btn_select_filtered: "Select Filtered Only",
        btn_clear: "Clear",
        filter_country_label: "Country Region:",
        filter_sector_label: "Industry Sector:",
        filter_all_regions: "All Regions",
        filter_all_sectors: "All Sectors",
        sector_system: "💻 System OEM/ODM",
        sector_foundry: "⚡ Foundry / IDM",
        sector_fabless: "🧠 Fabless / IC Design",
        sector_equipment: "🔬 Fab Equipment & Materials",
        sector_testing: "🧪 Testing, ATE & OSAT",
        sector_hyperscale: "☁️ Cloud & AI Software",
        compare_chart1_title: "Gross Margin % Trajectory Benchmark",
        compare_chart1_desc: "Cross-company pricing power comparison: Leading-edge semiconductors (NVDA, TSMC) vs. equipment (ASML) vs. automotive (NXP) vs. passives (VSH).",
        compare_chart2_title: "Revenue & Gross Profit per FTE Benchmark ($)",
        compare_chart2_desc: "Human capital leverage: Quantifying revenue and gross margin generated per full-time employee across different business models.",
        compare_chart3_title: "Operating Margin % & Profitability Benchmark",
        compare_chart3_desc: "Pure operational profitability: Evaluates operating efficiency and OpEx discipline through cyclical semiconductor demand fluctuations.",
        compare_chart4_title: "R&D Intensity (% of Revenue) Moat Benchmark",
        compare_chart4_desc: "Reinvestment intensity: Highlighting R&D allocation to pioneer next-generation architectures (High-NA EUV, 2nm, Blackwell, SDV).",
        compare_chart5_title: "Bivariate Strategic Quadrant & Bubble Matrix Benchmark",
        compare_chart5_desc: "Bivariate cross-company positioning: Compare pricing power vs. operating leverage, R&D intensity vs. human capital productivity, and strategic trajectories.",
        scatter_presets_label: "Presets:",
        preset_gm_op: "Profit Conversion (GM vs OP)",
        preset_rd_revfte: "R&D Productivity (R&D vs Rev/FTE)",
        preset_revfte_gm: "Lean Productivity (Rev/FTE vs GM)",
        preset_rd_op: "R&D vs Profit (R&D vs OP)",
        scatter_x_axis: "X-Axis:",
        scatter_y_axis: "Y-Axis:",
        scatter_bubble_size: "Bubble Size:",
        scatter_show_trail: "Show 5Y Trajectory",
        metric_gm: "Gross Margin %",
        metric_opm: "Operating Margin %",
        metric_rd: "R&D % of Rev",
        metric_rev_per_emp: "Rev / FTE ($k)",
        metric_gp_per_emp: "GP / FTE ($k)",
        metric_revenue: "Revenue ($M)",
        metric_headcount: "Headcount (FTE)",
        metric_constant: "Uniform Size",
        compare_table_title: "Cross-Company Peer Benchmark Matrix (Latest Audited Year)",
        compare_table_subtitle: "Side-by-side comparison of Revenue, Profitability, Headcount, and Human Capital Productivity",
        btn_export_compare_csv: "Export Comparison CSV",
        th_company: "Company",
        th_country: "Country",
        th_year: "Latest Fiscal Year",
        th_revenue: "Revenue ($M / €M)",
        th_gm: "Gross Margin %",
        th_opm: "Operating Margin %",
        th_rd: "R&D % of Rev",
        th_headcount: "Total FTEs",
        th_rev_per_emp: "Rev / FTE ($)",
        th_gp_per_emp: "GP / FTE ($)",
        btn_zoom_chart: "Zoom In",
        btn_shrink_chart: "Shrink (ESC)",
        btn_download_image: "Download HD PNG",
        zoom_modal_esc_hint: "Press ESC or click backdrop to shrink"
    },
    zh: {
        badge_workflow: "一步到位工作流",
        header_subtitle: "年報爬蟲 (20-F/10-K) ➔ Markdown 解析 ➔ 產值精算與戰略對齊",
        header_updated: "更新日期：2026-08-31",
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
        modal_guide_subtitle: "工作流執行、圖表戰略解讀、10-K/10-Q/20-F/6-K 格式與 LLM 提示詞應用",
        guide_sec1_title: "1. 一步到位全自動工作流與技術架構原理",
        guide_sec1_p1: "輸入任何目標公司（如 ASML、TSMC、NVDA、NXP、VSH、AMAT）或 CompaniesMarketCap 網址，選擇年數（3 至 10 年），點擊「立即執行全自動工作流」，系統將自動觸發 5 階段流水線：",
        guide_pipe_s1_title: "第 1 階段：目標智能識別與秒級本機快取爬蟲",
        guide_pipe_s1_desc: "自動識別企業註冊地（美國本土 Form 10-K/10-Q vs. 外國發行人 Form 20-F/6-K）與目標歷史年限。非同步下載歷年 PDF 原始報告至 <code>data/downloads/</code>。具備秒級本機快取（Local Cache），已下載的財報零延遲直接複用，免除重複爬取耗損。",
        guide_pipe_s2_title: "第 2 階段：結構化 PDF 轉 Markdown 表格無損還原引擎",
        guide_pipe_s2_desc: "徹底解決傳統 PDF 轉文字時「表格欄位錯位、數字對不齊」的頑疾。透過幾何網格定位損益表 (Income Statement)、部門營收與員工章節，輸出為標準 GitHub Markdown 表格 (<code>.md</code>) 存於 <code>data/parsed_md/</code>，確保財務資料 100% 欄位對齊。",
        guide_pipe_s3_title: "第 3 階段：雙軌財務指標抽取與 10-Q 員工人數線性插值",
        guide_pipe_s3_desc: "<strong>軌道 A（審計基準庫）：</strong> 內建 ASML、TSMC、NVDA、NXP、VSH、AMD、AMAT、GOOGL 等權威審計指標，秒級極速載入。<br><strong>軌道 B（LLM 智慧語意推導）：</strong> 自動推導新公司的會計科目勾稽關係（如 $營收 - 銷貨成本 = 毛利$、營業利益、研發費用）。<br><strong>10-Q 季報人數線性插值演算法：</strong> 美股 10-Q 依法不強制揭露季報員工數，系統自動以 10-K 年度審計人數為錨點進行線性插值 ($Q1 \\rightarrow Q2 \\rightarrow Q3 \\rightarrow Q4$)，確保人均產值趨勢平滑連貫。",
        guide_pipe_s4_title: "第 4 階段：戰略營運卓越 (OpEx) 與人均產值精算核心",
        guide_pipe_s4_desc: "深度融合財務損益與人力資源數據。精算<strong>人均產值三部曲</strong>（人均營收、人均毛利、人均營業利益 $/FTE）、評估<strong>營運槓桿 (Operating Leverage)</strong>、運算<strong>研發護城河強度 (R&D % of Revenue)</strong>，並識別<strong>「人力拐點 (The Pivot)」</strong>（員工總數進入高原期後，毛利率是否透過自動化持續擴張）。",
        guide_pipe_s5_title: "第 5 階段：雙視角戰略儀表板與 LLM 高階簡報生成閉環",
        guide_pipe_s5_desc: "在「單一公司深入分析」與「多公司橫向對比」雙視角下繪製 6 大 Plotly 互動圖表，支援一鍵高清放大與 CSV 匯出。解析後的 Markdown 可一鍵複製貼入 Gemini / Claude / ChatGPT 搭配專案 Prompt (<code>fininacial_prompt.md</code>)，5 秒內自動生成 16:9 董事會戰略簡報與口說講稿。",
        guide_sec_compare_title: "2. 多公司橫向對比模組 (Peer Comparison)",
        guide_sec_compare_p: "在頂部標籤頁切換「單一公司深入分析」與「多公司橫向對比模組」。在對比模式下自由勾選多家公司，即可在同屏並排對比各企業之毛利率走勢、人均產值 ($/FTE)、營業利益率與研發護城河強度。",
        guide_sec2_title: "3. 右上角切換選單 vs. 下方控制台（雙向即時連動）",
        guide_sec5_title_new: "5. 多格式全球申報體系與會計準則深度對比 (10-K / 10-Q / 20-F / TWSE / Yuho)",
        guide_sec5_p_new: "跨國科技與硬體製造巨頭依據發行註冊地、申報週期（年度 vs. 季度）與會計準則（US GAAP vs. IFRS）適用不同之法定申報規範：",
        guide_sec6_title: "6. 多幣別與尺度自動正規化引擎（USD $M 全球基準對齊）",
        guide_sec6_p1: "為確保橫向同屏跨國評比（如 台積電 vs. ASML vs. NVIDIA vs. 鴻海）之客觀一致性，系統自動將所有非美元幣別正規化為 <strong>USD (Millions)</strong> 並進行尺度防呆：",
        guide_sec6_c1_title: "1. 歷史基準匯率轉換矩陣 (Exchange Rate Matrix)",
        guide_sec6_c1_desc: "依據官方年度/季度歷史平均基準匯率進行非美元自動換算：",
        guide_sec6_c2_title: "2. 尺度防呆校準與財務合理性檢查 (Scale Sanitization)",
        guide_sec6_c2_desc: "自動解析損益表頭單位宣告，防止 1,000 倍或 1,000,000 倍尺度失真：",
        guide_sec7_title: "7. 為什麼跨格式財報解析仍需 LLM 語意動態修正支援？（5 大核心挑戰與技術解法）",
        guide_sec7_p1: "雖然系統已能精準將 20-F、10-K、10-Q 與台灣證交所年報表格轉為結構化 Markdown，但面對真實世界各企業非標準會計科目與敘述性文字，仍需 LLM 進行語意推導與動態校正：",
        guide_sec5_title: "8. 搭配大型語言模型 (Gemini / Claude / ChatGPT) 生成簡報講稿",
        guide_sec5_p: "在下方檔案瀏覽器選取解析後的 .md 檔案，點擊「複製 Markdown」，貼入 Gemini 並搭配專案內的 fininacial_prompt.md 或 sale_breakdown.md，即可在 5 秒內產出 16:9 簡報草圖與高階主管口說講稿。",
        compare_selector_title: "多公司橫向對比勾選區",
        compare_selector_subtitle: "自由勾選 2 家以上公司進行毛利率、人均產值、營業利益率與研發強度之橫向對比",
        btn_select_all: "全選",
        btn_select_filtered: "僅選目前篩選",
        btn_clear: "清除",
        filter_country_label: "國家與地區：",
        filter_sector_label: "產業類別：",
        filter_all_regions: "全部地區",
        filter_all_sectors: "全部產業",
        sector_system: "💻 系統組裝 / ODM",
        sector_foundry: "⚡ 晶圓製造 / IDM",
        sector_fabless: "🧠 IC設計 / Fabless",
        sector_equipment: "🔬 半導體製造設備 / 材料",
        sector_testing: "🧪 半導體測試 / 封測 / 分析",
        sector_hyperscale: "☁️ 雲端軟體 / AI",
        compare_chart1_title: "毛利率走勢跨公司對比 (Gross Margin %)",
        compare_chart1_desc: "跨公司產品定價權與護城河對比：先進半導體 (NVDA, TSMC) vs. 設備霸主 (ASML) vs. 車用晶片 (NXP) vs. 分離式元件 (VSH)。",
        compare_chart2_title: "人均營收與人均毛利產值對比 ($ / FTE)",
        compare_chart2_desc: "人力資本槓桿量化：衡量不同商業模式下每位全職員工創造的營收與毛利回報率。",
        compare_chart3_title: "營業利益率與獲利能力對比 (Operating Margin %)",
        compare_chart3_desc: "純營業利潤率：評估半導體需求週期波動下各公司的營運效率與固定成本吸收能力。",
        compare_chart4_title: "研發強度佔營收比重對比 (R&D % of Revenue)",
        compare_chart4_desc: "技術護城河再投資力度：展現推動次世代架構 (High-NA EUV, 2nm, Blackwell, SDV) 的研發資源承諾。",
        compare_chart5_title: "雙變數戰略四象限與氣泡矩陣對比",
        compare_chart5_desc: "二維跨公司戰略定位：對比毛利訂價權 vs. 營業槓桿、研發強度 vs. 人均產值，洞察企業多維度競爭力與演化路徑。",
        scatter_presets_label: "戰略預設:",
        preset_gm_op: "獲利轉化 (GM vs OP)",
        preset_rd_revfte: "研發產出 (R&D vs Rev/FTE)",
        preset_revfte_gm: "精實人均 (Rev/FTE vs GM)",
        preset_rd_op: "研發獲利 (R&D vs OP)",
        scatter_x_axis: "X 軸:",
        scatter_y_axis: "Y 軸:",
        scatter_bubble_size: "氣泡大小:",
        scatter_show_trail: "顯示歷史軌跡 (5Y Trail)",
        metric_gm: "Gross Margin % (毛利率)",
        metric_opm: "Operating Margin % (營業利益率)",
        metric_rd: "R&D % of Rev (研發佔比)",
        metric_rev_per_emp: "Rev / FTE (人均營收 $k)",
        metric_gp_per_emp: "GP / FTE (人均毛利 $k)",
        metric_revenue: "Revenue (營收 $M)",
        metric_headcount: "Headcount (員工人數)",
        metric_constant: "Uniform (固定大小)",
        compare_table_title: "跨公司基準對比矩陣 (最新官方審計年度)",
        compare_table_subtitle: "並排檢視各公司營收、毛利、營業利益、全球員工人數與人均產值指標",
        btn_export_compare_csv: "匯出對比 CSV 報表",
        th_company: "企業名稱",
        th_country: "總部國別",
        th_year: "最新會計年度",
        th_revenue: "營業收入 ($M / €M)",
        th_gm: "毛利率 %",
        th_opm: "營業利益率 %",
        th_rd: "研發佔比 %",
        th_headcount: "全球員工數 (FTE)",
        th_rev_per_emp: "人均營收 ($/人)",
        th_gp_per_emp: "人均毛利 ($/人)",
        btn_zoom_chart: "一鍵放大",
        btn_shrink_chart: "一鍵縮回 (ESC)",
        btn_download_image: "下載高清圖檔 (PNG)",
        zoom_modal_esc_hint: "按 ESC 或點擊背景縮回"
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
    setupChartZoomModal();
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
            
            const selComp = document.getElementById("companySelect")?.value || "ASML";
            syncTargetInputWithTicker(selComp);

            if (ACTIVE_VIEW === "single") loadDashboardData(selComp);
            else loadComparisonData();
        });

        btnQuarterly.addEventListener("click", () => {
            if (CURRENT_FREQ === "quarterly") return;
            CURRENT_FREQ = "quarterly";
            btnQuarterly.className = "bg-amber-600 text-white px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1 shadow-sm";
            btnAnnual.className = "text-slate-300 hover:text-white px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1";
            
            const selComp = document.getElementById("companySelect")?.value || "ASML";
            syncTargetInputWithTicker(selComp);

            if (ACTIVE_VIEW === "single") loadDashboardData(selComp);
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

let CURRENT_ZOOMED_CHART_ID = null;

function setupChartZoomModal() {
    const zoomModal = document.getElementById("chartZoomModal");
    const closeBtn = document.getElementById("closeZoomModalBtn");
    const downloadBtn = document.getElementById("downloadZoomChartBtn");

    if (closeBtn) {
        closeBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.closeZoomModal();
        });
    }
    if (zoomModal) {
        zoomModal.addEventListener("click", (e) => {
            if (e.target === zoomModal) window.closeZoomModal();
        });
    }
    if (downloadBtn) {
        downloadBtn.addEventListener("click", () => {
            const canvas = document.getElementById("zoomedChartCanvas");
            if (canvas && (canvas.data || canvas._fullData)) {
                const titleEl = document.getElementById("zoomModalTitle");
                const cleanTitle = (titleEl ? titleEl.textContent.trim() : "chart").replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, "_");
                const isLight = CURRENT_THEME === "light";
                const solidBg = isLight ? "#ffffff" : "#0f172a";
                const fontCol = isLight ? "#0f172a" : "#f8fafc";
                const tickCol = isLight ? "#1e293b" : "#cbd5e1";
                const lineCol = isLight ? "#64748b" : "#475569";
                
                // Relayout with solid high-contrast background, crisp font colors, and bold axes before capturing HD PNG
                Plotly.relayout("zoomedChartCanvas", {
                    paper_bgcolor: solidBg,
                    plot_bgcolor: solidBg,
                    "font.color": fontCol,
                    "font.size": 13,
                    "xaxis.tickfont.color": tickCol,
                    "xaxis.title.font.color": fontCol,
                    "yaxis.tickfont.color": tickCol,
                    "yaxis.title.font.color": fontCol,
                    "legend.font.color": fontCol,
                    "legend.bgcolor": isLight ? "#ffffff" : "#0f172a"
                }).then(() => {
                    Plotly.downloadImage("zoomedChartCanvas", {
                        format: "png",
                        width: 1920,
                        height: 1080,
                        filename: `${cleanTitle}_HD`
                    }).then(() => {
                        // Restore transparent background after download
                        Plotly.relayout("zoomedChartCanvas", {
                            paper_bgcolor: "transparent",
                            plot_bgcolor: "transparent"
                        });
                    });
                });
            }
        });
    }

    // Attach click listener directly to all .chart-expand-btn buttons
    document.querySelectorAll(".chart-expand-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const chartId = btn.getAttribute("data-chart");
            const titleKey = btn.getAttribute("data-title");
            const badge = btn.getAttribute("data-badge");
            const insight = btn.getAttribute("data-insight");
            const icon = btn.getAttribute("data-icon");
            if (chartId) {
                window.zoomChart(chartId, titleKey, badge, insight, icon);
            }
        });
    });

    // Global ESC key listener to shrink/close zoom modal
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            const zoomModal = document.getElementById("chartZoomModal");
            if (zoomModal && zoomModal.style.display !== "none") {
                window.closeZoomModal();
            }
        }
    });
}

// -----------------------------------------------------------------------------
// Interactive Full-Screen Chart Inspection / Zoom In (100% Non-Blocking Clean Renderer)
// -----------------------------------------------------------------------------
function extractCleanTraces(dataArray) {
    if (!dataArray || !Array.isArray(dataArray)) return [];
    return dataArray.map(t => {
        const clean = {
            x: Array.isArray(t.x) ? [...t.x] : t.x,
            y: Array.isArray(t.y) ? [...t.y] : t.y,
            name: t.name || "",
            type: t.type || "scatter"
        };
        if (t.mode) clean.mode = t.mode;
        if (t.text) clean.text = Array.isArray(t.text) ? [...t.text] : t.text;
        if (t.textposition) clean.textposition = t.textposition;
        if (t.textfont) clean.textfont = JSON.parse(JSON.stringify(t.textfont));
        if (t.yaxis) clean.yaxis = t.yaxis;
        if (t.xaxis) clean.xaxis = t.xaxis;
        if (t.showlegend !== undefined) clean.showlegend = t.showlegend;
        if (t.hovertemplate) clean.hovertemplate = t.hovertemplate;
        if (t.marker) {
            clean.marker = JSON.parse(JSON.stringify(t.marker));
        }
        if (t.line) {
            clean.line = JSON.parse(JSON.stringify(t.line));
        }
        return clean;
    });
}

function extractCleanLayout(srcLayout, fontColor, gridColor, isMultiTrace) {
    const layout = srcLayout || {};
    const isLight = CURRENT_THEME === "light";
    const textColor = isLight ? "#0f172a" : fontColor;
    const tickColor = isLight ? "#1e293b" : "#cbd5e1";
    const lineCol = isLight ? "#64748b" : "#475569";
    const clean = {
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        autosize: true,
        margin: {
            t: isMultiTrace ? 40 : 55,
            r: isMultiTrace ? 180 : 45,
            l: 65,
            b: 55
        },
        font: { color: textColor, size: 12.5, family: "Inter, system-ui, sans-serif" },
        hovermode: "closest",
        legend: {
            orientation: isMultiTrace ? "v" : "h",
            x: isMultiTrace ? 1.02 : 0,
            y: isMultiTrace ? 1 : 1.15,
            xanchor: "left",
            yanchor: isMultiTrace ? "top" : "bottom",
            font: { size: 12, color: textColor },
            bgcolor: isLight ? "rgba(255, 255, 255, 0.95)" : "rgba(15, 23, 42, 0.95)",
            bordercolor: isLight ? "rgba(148, 163, 184, 0.8)" : "rgba(51, 65, 85, 0.8)",
            borderwidth: 1.5
        }
    };

    if (layout.barmode) clean.barmode = layout.barmode;
    if (layout.shapes) clean.shapes = JSON.parse(JSON.stringify(layout.shapes));
    if (layout.annotations) clean.annotations = JSON.parse(JSON.stringify(layout.annotations));

    if (layout.xaxis) {
        clean.xaxis = {
            showgrid: true,
            gridcolor: gridColor,
            gridwidth: 1,
            showline: true,
            linecolor: lineCol,
            linewidth: 1.5,
            tickfont: { size: 12, color: tickColor, family: "Inter, system-ui, sans-serif" },
            automargin: true
        };
        if (layout.xaxis.title) {
            const tText = typeof layout.xaxis.title === 'string' ? layout.xaxis.title : (layout.xaxis.title.text || "");
            clean.xaxis.title = {
                text: tText,
                font: { size: 13.5, color: textColor, family: "Inter, system-ui, sans-serif" }
            };
        }
        if (layout.xaxis.range) clean.xaxis.range = [...layout.xaxis.range];
        if (layout.xaxis.tickangle !== undefined) clean.xaxis.tickangle = layout.xaxis.tickangle;
        if (layout.xaxis.categoryorder) clean.xaxis.categoryorder = layout.xaxis.categoryorder;
        if (layout.xaxis.categoryarray) clean.xaxis.categoryarray = [...layout.xaxis.categoryarray];
    }

    if (layout.yaxis) {
        clean.yaxis = {
            showgrid: true,
            gridcolor: gridColor,
            gridwidth: 1,
            showline: true,
            linecolor: lineCol,
            linewidth: 1.5,
            tickfont: { size: 12, color: tickColor, family: "Inter, system-ui, sans-serif" },
            autorange: layout.yaxis.range ? false : true
        };
        if (layout.yaxis.title) {
            const tText = typeof layout.yaxis.title === 'string' ? layout.yaxis.title : (layout.yaxis.title.text || "");
            clean.yaxis.title = {
                text: tText,
                font: { size: 13.5, color: textColor, family: "Inter, system-ui, sans-serif" }
            };
        }
        if (layout.yaxis.range) clean.yaxis.range = [...layout.yaxis.range];
        if (layout.yaxis.ticksuffix) clean.yaxis.ticksuffix = layout.yaxis.ticksuffix;
    }

    if (layout.yaxis2) {
        clean.yaxis2 = {
            overlaying: layout.yaxis2.overlaying || "y",
            side: layout.yaxis2.side || "right",
            showgrid: false,
            autorange: true
        };
        if (layout.yaxis2.title) {
            const tText = typeof layout.yaxis2.title === 'string' ? layout.yaxis2.title : (layout.yaxis2.title.text || "");
            clean.yaxis2.title = {
                text: tText,
                font: { size: 13.5, color: textColor, family: "Inter, system-ui, sans-serif" }
            };
        }
        if (layout.yaxis2.ticksuffix) clean.yaxis2.ticksuffix = layout.yaxis2.ticksuffix;
    }

    return clean;
}

window.zoomChart = function(chartId, titleKey, badgeText, insightKeyOrId, iconClass) {
    try {
        const modal = document.getElementById("chartZoomModal");
        if (!modal) return;

        CURRENT_ZOOMED_CHART_ID = chartId;
        const titleEl = document.getElementById("zoomModalTitle");
        const badgeEl = document.getElementById("zoomModalBadge");
        const iconEl = document.getElementById("zoomModalIcon");
        const subtitleEl = document.getElementById("zoomModalSubtitle");
        const insightEl = document.getElementById("zoomModalInsight");

        const singleContainer = document.getElementById("zoomedSingleContainer");
        const dualContainer = document.getElementById("zoomedDualContainer");

        // Title & badge setup with i18n
        const dict = (typeof I18N_DICT !== 'undefined' ? I18N_DICT[CURRENT_LANGUAGE] : null) || {};
        let titleText = dict[titleKey];
        if (!titleText) {
            const btnEl = document.querySelector(`button[data-chart="${chartId}"]`);
            if (btnEl && btnEl.getAttribute('data-title') && dict[btnEl.getAttribute('data-title')]) {
                titleText = dict[btnEl.getAttribute('data-title')];
            } else {
                const i18nEl = document.querySelector(`[data-i18n="${titleKey}"]`);
                if (i18nEl) titleText = i18nEl.textContent.trim();
            }
        }
        if (!titleText || titleText.startsWith("chart") || titleText.startsWith("compare_chart")) {
            const fallbackMap = {
                "chart1_title": CURRENT_LANGUAGE === "zh" ? "圖表 1：員工人數與毛利率轉折分析" : "Chart 1: Headcount vs. Gross Margin % (The Pivot)",
                "chart2_title": CURRENT_LANGUAGE === "zh" ? "圖表 2：人均生產力三部曲" : "Chart 2: Human Capital Productivity Trio",
                "chart3_title": CURRENT_LANGUAGE === "zh" ? "圖表 3：營業利益率與獲利能力趨勢" : "Chart 3: Operating Profitability & Leverage",
                "chart4_title": CURRENT_LANGUAGE === "zh" ? "圖表 4：研發費用與護城河強度" : "Chart 4: R&D Expense & Technology Moat Intensity",
                "chart5_title": CURRENT_LANGUAGE === "zh" ? "圖表 5：利潤與人力增長動能對比" : "Chart 5: Profit vs. Headcount Growth Dynamics",
                "chart6_title": CURRENT_LANGUAGE === "zh" ? "圖表 6：高價值 vs 出貨量結構分拆" : "Chart 6: Value-vs-Volume Sales Asymmetry Breakdown",
                "chart6a_title": CURRENT_LANGUAGE === "zh" ? "圖表 6A：高價值營收結構分拆 ($M)" : "Chart 6A: High-Value Revenue Segment Breakdown ($M)",
                "chart6b_title": CURRENT_LANGUAGE === "zh" ? "圖表 6B：產品出貨量與結構佔比 (%)" : "Chart 6B: Product Shipment Volume & Mix Breakdown (%)",
                "compare_chart1_title": CURRENT_LANGUAGE === "zh" ? "毛利率跨公司對比 (Gross Margin %)" : "Gross Margin % Benchmark",
                "compare_chart2_title": CURRENT_LANGUAGE === "zh" ? "人均營收跨公司對比 (Revenue / FTE)" : "Revenue per FTE Benchmark",
                "compare_chart3_title": CURRENT_LANGUAGE === "zh" ? "營業利益率跨公司對比 (Operating Margin %)" : "Operating Margin % Benchmark",
                "compare_chart4_title": CURRENT_LANGUAGE === "zh" ? "研發強度跨公司對比 (R&D % of Revenue)" : "R&D Intensity Benchmark",
                "compare_chart5_title": CURRENT_LANGUAGE === "zh" ? "雙變數戰略四象限與氣泡矩陣對比" : "Bivariate Strategic Quadrant & Bubble Matrix Benchmark"
            };
            titleText = fallbackMap[titleKey] || titleText || "Chart Inspection";
        }
        if (titleEl) titleEl.textContent = titleText;
        if (badgeEl) badgeEl.textContent = badgeText || "Metric";
        if (iconEl) iconEl.className = `fa-solid ${iconClass || 'fa-chart-line'} text-sm`;

        // Insight description setup
        let insightText = "";
        const insightDom = document.getElementById(insightKeyOrId);
        if (insightDom) {
            insightText = insightDom.textContent.trim();
        } else if (dict[insightKeyOrId]) {
            insightText = dict[insightKeyOrId];
        } else {
            insightText = insightKeyOrId || "";
        }
        if (subtitleEl) subtitleEl.textContent = insightText;
        if (insightEl) insightEl.textContent = insightText;

        // Display modal immediately
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";

        const isLight = CURRENT_THEME === "light";
        const fontColor = isLight ? "#1e293b" : "#f1f5f9";
        const gridColor = isLight ? "#cbd5e1" : "#334155";

        // =====================================================================
        // DUAL-CHART ZOOM MODE FOR CHART 6 (Two completely separate canvases)
        // =====================================================================
        if (chartId === "chartSalesBreakdown" || chartId === "chartSalesValue" || chartId === "chartSalesVolume") {
            if (singleContainer) singleContainer.style.display = "none";
            if (dualContainer) dualContainer.style.display = "grid";

            const valEl = document.getElementById("chartSalesValue");
            const volEl = document.getElementById("chartSalesVolume");

            if (valEl && valEl.data) {
                const cleanValTraces = extractCleanTraces(valEl.data);
                const cleanValLayout = extractCleanLayout(valEl.layout, fontColor, gridColor, false);
                cleanValLayout.margin = { t: 30, r: 25, l: 55, b: 50 };
                Plotly.newPlot("zoomedCanvasLeft", cleanValTraces, cleanValLayout, { responsive: true, displayModeBar: true, displaylogo: false });
            }

            if (volEl && volEl.data) {
                const cleanVolTraces = extractCleanTraces(volEl.data);
                const cleanVolLayout = extractCleanLayout(volEl.layout, fontColor, gridColor, false);
                cleanVolLayout.margin = { t: 30, r: 25, l: 55, b: 50 };
                Plotly.newPlot("zoomedCanvasRight", cleanVolTraces, cleanVolLayout, { responsive: true, displayModeBar: true, displaylogo: false });
            }

            setTimeout(() => {
                Plotly.Plots.resize("zoomedCanvasLeft");
                Plotly.Plots.resize("zoomedCanvasRight");
            }, 60);
            return;
        }

        // =====================================================================
        // STANDARD SINGLE-CHART ZOOM MODE
        // =====================================================================
        if (singleContainer) singleContainer.style.display = "block";
        if (dualContainer) dualContainer.style.display = "none";

        const srcEl = document.getElementById(chartId);
        if (!srcEl || !srcEl.data) {
            console.warn("Chart element not found or data not ready:", chartId);
            return;
        }

        const isMultiTrace = (srcEl.data && srcEl.data.length > 4);
        const cleanTraces = extractCleanTraces(srcEl.data);
        const cleanLayout = extractCleanLayout(srcEl.layout, fontColor, gridColor, isMultiTrace);

        Plotly.newPlot("zoomedChartCanvas", cleanTraces, cleanLayout, {
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['sendDataToCloud']
        }).then(() => {
            setTimeout(() => {
                Plotly.Plots.resize("zoomedChartCanvas");
            }, 50);
        });
    } catch (err) {
        console.error("Error in zoomChart:", err);
    }
};

window.closeZoomModal = function() {
    try {
        const modal = document.getElementById("chartZoomModal");
        if (modal) {
            modal.style.display = "none";
            document.body.style.overflow = "";
            try {
                Plotly.purge("zoomedChartCanvas");
            } catch (e) {}
            if (CURRENT_ZOOMED_CHART_ID) {
                try {
                    Plotly.Plots.resize(CURRENT_ZOOMED_CHART_ID);
                } catch (e) {}
                CURRENT_ZOOMED_CHART_ID = null;
            }
        }
    } catch (err) {
        console.error("Error in closeZoomModal:", err);
    }
};

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

    const selectFilteredBtn = document.getElementById("selectFilteredCompareBtn");
    if (selectFilteredBtn) {
        selectFilteredBtn.addEventListener("click", () => {
            const chkGrid = document.getElementById("compareCheckboxGrid");
            if (!chkGrid) return;
            const cards = chkGrid.querySelectorAll(".compare-chk-card");
            let checkedAny = false;
            cards.forEach(card => {
                const chk = card.querySelector(".compare-chk");
                if (!chk) return;
                if (card.style.display !== "none") {
                    chk.checked = true;
                    checkedAny = true;
                } else {
                    chk.checked = false;
                }
            });
            if (!checkedAny && cards.length > 0) {
                const firstChk = cards[0].querySelector(".compare-chk");
                if (firstChk) firstChk.checked = true;
            }
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

    // Country Filter Buttons
    document.querySelectorAll(".compare-country-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const targetCountry = btn.getAttribute("data-country") || "ALL";
            CURRENT_COMPARE_COUNTRY_FILTER = targetCountry;
            document.querySelectorAll(".compare-country-btn").forEach(b => {
                b.classList.remove("bg-indigo-600", "text-white", "shadow-sm");
                b.classList.add("bg-slate-800", "text-slate-300", "border", "border-slate-700");
            });
            btn.classList.remove("bg-slate-800", "text-slate-300", "border", "border-slate-700");
            btn.classList.add("bg-indigo-600", "text-white", "shadow-sm");
            applyCompareFilters();
        });
    });

    // Sector Filter Buttons
    document.querySelectorAll(".compare-sector-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const targetSector = btn.getAttribute("data-sector") || "ALL";
            CURRENT_COMPARE_SECTOR_FILTER = targetSector;
            document.querySelectorAll(".compare-sector-btn").forEach(b => {
                b.classList.remove("bg-amber-600", "text-white", "shadow-sm");
                b.classList.add("bg-slate-800", "text-slate-300", "border", "border-slate-700");
            });
            btn.classList.remove("bg-slate-800", "text-slate-300", "border", "border-slate-700");
            btn.classList.add("bg-amber-600", "text-white", "shadow-sm");
            applyCompareFilters();
        });
    });
}

function applyCompareFilters() {
    const chkGrid = document.getElementById("compareCheckboxGrid");
    if (!chkGrid) return;
    const cards = chkGrid.querySelectorAll(".compare-chk-card");
    const cFilter = (CURRENT_COMPARE_COUNTRY_FILTER || "ALL").toUpperCase();
    const sFilter = (CURRENT_COMPARE_SECTOR_FILTER || "ALL").toUpperCase();

    cards.forEach(card => {
        const country = (card.getAttribute("data-country") || "").toUpperCase();
        const sector = (card.getAttribute("data-sector") || "").toUpperCase();
        
        const matchCountry = (cFilter === "ALL" || country === cFilter || (cFilter === "UK" && country === "GB") || (cFilter === "GB" && country === "UK"));
        const matchSector = (sFilter === "ALL" || sector === sFilter);
        
        if (matchCountry && matchSector) {
            card.style.display = "flex";
        } else {
            card.style.display = "none";
        }
    });
}

function syncTargetInputWithTicker(ticker) {
    const input = document.getElementById("targetInput");
    if (!input) return;
    const t = ticker.toLowerCase();
    const isQ = CURRENT_FREQ === "quarterly";

    if (isQ) {
        if (t === "asml") input.value = "https://companiesmarketcap.com/asml/quarterly-reports/";
        else if (t === "tsmc" || t === "tsm" || t === "2330") input.value = "https://companiesmarketcap.com/tsmc/quarterly-reports/";
        else if (t === "mediatek" || t === "2454" || t === "mtk") input.value = "https://companiesmarketcap.com/mediatek/quarterly-reports/";
        else if (t === "nvda" || t === "nvidia") input.value = "https://companiesmarketcap.com/nvidia/quarterly-reports-10q/";
        else if (t === "googl" || t === "google" || t === "goog" || t === "alphabet" || t === "alphabet-google") input.value = "https://companiesmarketcap.com/alphabet-google/quarterly-reports-10q/";
        else if (t === "amd") input.value = "https://companiesmarketcap.com/amd/quarterly-reports-10q/";
        else if (t === "aapl" || t === "apple") input.value = "https://companiesmarketcap.com/apple/quarterly-reports-10q/";
        else if (t === "ase" || t === "asx" || t === "ase-group" || t === "3711") input.value = "https://companiesmarketcap.com/ase-group/quarterly-reports/";
        else if (t === "mu" || t === "micron" || t === "micron-technology") input.value = "https://companiesmarketcap.com/micron-technology/quarterly-reports-10q/";
        else if (t === "klac" || t === "kla" || t === "kla-tencor") input.value = "https://companiesmarketcap.com/kla/quarterly-reports-10q/";
        else if (t === "ter" || t === "teradyne") input.value = "https://companiesmarketcap.com/teradyne/quarterly-reports-10q/";
        else if (t === "nxp" || t === "nxpi" || t === "nxp-semiconductors") input.value = "https://companiesmarketcap.com/nxp-semiconductors/quarterly-reports-10q/";
        else if (t === "vsh" || t === "vishay" || t === "vishay-intertechnology") input.value = "https://companiesmarketcap.com/vishay-intertechnology/quarterly-reports-10q/";
        else if (t === "msft" || t === "microsoft") input.value = "https://companiesmarketcap.com/microsoft/quarterly-reports-10q/";
        else if (t === "amzn" || t === "amazon") input.value = "https://companiesmarketcap.com/amazon/quarterly-reports-10q/";
        else if (t === "meta" || t === "meta-platforms") input.value = "https://companiesmarketcap.com/meta-platforms/quarterly-reports-10q/";
        else if (t === "amat" || t === "applied-materials") input.value = "https://companiesmarketcap.com/applied-materials/quarterly-reports-10q/";
        else if (t === "pltr" || t === "palantir") input.value = "https://companiesmarketcap.com/palantir/quarterly-reports-10q/";
        else if (t === "avgo" || t === "broadcom") input.value = "https://companiesmarketcap.com/broadcom/quarterly-reports-10q/";
        else if (t === "lrcx" || t === "lam-research") input.value = "https://companiesmarketcap.com/lam-research/quarterly-reports-10q/";
        else input.value = `${ticker.toUpperCase()} (10-Q)`;
    } else {
        if (t === "asml") input.value = "https://companiesmarketcap.com/asml/annual-reports-20f/";
        else if (t === "tsmc" || t === "tsm" || t === "2330") input.value = "https://companiesmarketcap.com/tsmc/annual-reports/";
        else if (t === "mediatek" || t === "2454" || t === "mtk") input.value = "https://companiesmarketcap.com/mediatek/annual-reports/";
        else if (t === "nvda" || t === "nvidia") input.value = "https://companiesmarketcap.com/nvidia/annual-reports/";
        else if (t === "googl" || t === "google" || t === "goog" || t === "alphabet" || t === "alphabet-google") input.value = "https://companiesmarketcap.com/alphabet-google/annual-reports/";
        else if (t === "amd") input.value = "https://companiesmarketcap.com/amd/annual-reports/";
        else if (t === "aapl" || t === "apple") input.value = "https://companiesmarketcap.com/apple/annual-reports/";
        else if (t === "ase" || t === "asx" || t === "ase-group" || t === "3711") input.value = "https://companiesmarketcap.com/ase-group/annual-reports/";
        else if (t === "mu" || t === "micron" || t === "micron-technology") input.value = "https://companiesmarketcap.com/micron-technology/annual-reports/";
        else if (t === "klac" || t === "kla" || t === "kla-tencor") input.value = "https://companiesmarketcap.com/kla/annual-reports/";
        else if (t === "ter" || t === "teradyne") input.value = "https://companiesmarketcap.com/teradyne/annual-reports/";
        else if (t === "nxp" || t === "nxpi" || t === "nxp-semiconductors") input.value = "https://companiesmarketcap.com/nxp-semiconductors/annual-reports/";
        else if (t === "vsh" || t === "vishay" || t === "vishay-intertechnology") input.value = "https://companiesmarketcap.com/vishay-intertechnology/annual-reports/";
        else if (t === "msft" || t === "microsoft") input.value = "https://companiesmarketcap.com/microsoft/annual-reports/";
        else if (t === "amzn" || t === "amazon") input.value = "https://companiesmarketcap.com/amazon/annual-reports/";
        else if (t === "meta" || t === "meta-platforms") input.value = "https://companiesmarketcap.com/meta-platforms/annual-reports/";
        else if (t === "amat" || t === "applied-materials") input.value = "https://companiesmarketcap.com/applied-materials/annual-reports/";
        else if (t === "pltr" || t === "palantir") input.value = "https://companiesmarketcap.com/palantir/annual-reports/";
        else if (t === "avgo" || t === "broadcom") input.value = "https://companiesmarketcap.com/broadcom/annual-reports/";
        else if (t === "lrcx" || t === "lam-research") input.value = "https://companiesmarketcap.com/lam-research/annual-reports/";
        else if (t === "foxconn" || t === "honhai" || t === "2317") input.value = "https://companiesmarketcap.com/foxconn/annual-reports/";
        else input.value = ticker.toUpperCase();
    }
}

function applyLanguage(lang) {
    const dict = I18N_DICT[lang] || I18N_DICT.en;
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (dict[key]) {
            if (dict[key].includes("<") && dict[key].includes(">")) {
                el.innerHTML = dict[key];
            } else {
                el.textContent = dict[key];
            }
        }
    });

    const langLabel = document.getElementById("currentLangLabel");
    if (langLabel) langLabel.textContent = dict.lang_toggle_btn;
}

// -----------------------------------------------------------------------------
// Helper: Check if running in Standalone / Static GitHub Pages Mode
// -----------------------------------------------------------------------------
function isStandaloneMode() {
    return (typeof window.STATIC_METRICS_DB !== "undefined" && window.STATIC_METRICS_DB !== null) ||
           location.protocol === "file:" ||
           window.location.hostname.endsWith("github.io");
}

// -----------------------------------------------------------------------------
// Load Company Dropdown & Compare Checkboxes
// -----------------------------------------------------------------------------
async function loadCompaniesList() {
    try {
        let companies = [];
        if (isStandaloneMode() && window.STATIC_METRICS_DB) {
            const rawKeys = Object.keys(window.STATIC_METRICS_DB);
            const canonicalSet = new Set();
            rawKeys.forEach(k => {
                const canon = FinancialMetricsExtractor_canonical_ticker(k).toUpperCase();
                if (canon) canonicalSet.add(canon);
            });
            const orderedPriority = ["ASUS", "ASML", "TSMC", "MEDIATEK", "QUANTA", "WISTRON", "PEGATRON", "MERCK-KGAA", "MA-TEK", "AVGO", "LRCX", "NVDA", "ARM", "FOXCONN", "DELTA", "UMC", "MSFT", "GOOGL", "AAPL", "AMD", "MU", "KLAC", "TER", "ASE", "NXP", "INFINEON", "TTM", "VSH", "META", "AMZN", "PLTR", "AMAT", "ADVANTEST", "SAMSUNG"];
            companies = orderedPriority.filter(c => canonicalSet.has(c));
            canonicalSet.forEach(c => {
                if (!companies.includes(c)) companies.push(c);
            });
        } else {
            const res = await fetch(`/api/companies?_t=${Date.now()}`, { cache: "no-store" });
            const data = await res.json();
            companies = data.companies || [];
        }

        if (companies && companies.length > 0) {
            const select = document.getElementById("companySelect");
            const currentVal = select.value;
            select.innerHTML = "";

            const friendlyNames = {
            "ASUS": "ASUS (2357 / 華碩電腦)",
            "2357": "ASUS (2357 / 華碩電腦)",
                "ASML": "ASML Holding N.V.",
                "TSMC": "TSMC (2330 / TSM)",
                "MEDIATEK": "MediaTek (2454 / 聯發科)",
                "2454": "MediaTek (2454 / 聯發科)",
                "QUANTA": "Quanta Computer (2382 / 廣達)",
                "2382": "Quanta Computer (2382 / 廣達)",
                "WISTRON": "Wistron (3231 / 緯創)",
                "3231": "Wistron (3231 / 緯創)",
                "PEGATRON": "Pegatron (4938 / 和碩)",
                "4938": "Pegatron (4938 / 和碩)",
                "MERCK-KGAA": "Merck KGaA (MRK.DE / 默克集團)",
                "MRK-DE": "Merck KGaA (MRK.DE / 默克集團)",
                "MRK.DE": "Merck KGaA (MRK.DE / 默克集團)",
                "MKGAY": "Merck KGaA (MRK.DE / 默克集團)",
                "MA-TEK": "MA-tek (3587 / 閎康科技)",
                "3587": "MA-tek (3587 / 閎康科技)",
                "MATEK": "MA-tek (3587 / 閎康科技)",
                "MA_TEK": "MA-tek (3587 / 閎康科技)",
                "AVGO": "Broadcom Inc. (AVGO / 博通)",
                "BROADCOM": "Broadcom Inc. (AVGO / 博通)",
                "BROADCOM-INC": "Broadcom Inc. (AVGO / 博通)",
                "LRCX": "Lam Research (LRCX / 科林研發)",
                "LAM-RESEARCH": "Lam Research (LRCX / 科林研發)",
                "LAM-RESEARCH-CORP": "Lam Research (LRCX / 科林研發)",
                "NVDA": "NVIDIA Corporation",
                "ARM": "Arm Holdings plc (ARM)",
                "FOXCONN": "Hon Hai / Foxconn (2317 / HNHPF)",
                "DELTA": "Delta Electronics (2308 / 台達電)",
                "UMC": "UMC (2303 / 聯電)",
                "GOOGL": "Alphabet Inc. (Google)",
                "AAPL": "Apple Inc. (AAPL)",
                "AMD": "Advanced Micro Devices (AMD)",
                "MU": "Micron Technology (MU)",
                "KLAC": "KLA Corporation (KLAC)",
                "TER": "Teradyne, Inc. (TER)",
                "ASE": "ASE Technology (3711 / ASX)",
                "NXP": "NXP Semiconductors (NXPI)",
                "INFINEON": "Infineon Technologies AG (IFX)",
                "TTM": "TTM Technologies (TTMI)",
                "VSH": "Vishay Intertechnology (VSH)",
                "MSFT": "Microsoft Corporation (MSFT)",
                "AMAT": "Applied Materials (AMAT)",
                "META": "Meta Platforms (META)",
                "AMZN": "Amazon.com, Inc. (AMZN)",
                "PLTR": "Palantir Technologies (PLTR)",
                "ADVANTEST": "Advantest Corp. (6857)",
                "SAMSUNG": "Samsung Electronics (005930)"
            };

            const chkGrid = document.getElementById("compareCheckboxGrid");
            if (chkGrid) chkGrid.innerHTML = "";

            companies.forEach((comp) => {
                const upper = comp.toUpperCase();
                const opt = document.createElement("option");
                opt.value = upper;
                opt.textContent = friendlyNames[upper] || upper;
                select.appendChild(opt);

                // Add to comparison checkbox grid with rich Country and Sector tagging
                if (chkGrid) {
                    const label = document.createElement("label");
                    const canon = FinancialMetricsExtractor_canonical_ticker(comp.toLowerCase());
                    const countryObj = COMPANY_COUNTRIES[canon] || COMPANY_COUNTRIES[comp.toLowerCase()] || { en: "United States 🇺🇸", zh: "美國 🇺🇸", code: "US" };
                    const countryCode = (countryObj.code || "US").toUpperCase();
                    const sectorCode = COMPANY_SECTORS[canon] || COMPANY_SECTORS[comp.toLowerCase()] || "FABLESS";
                    const sectorMeta = SECTOR_METADATA[sectorCode] || SECTOR_METADATA.FABLESS;
                    const sectorName = CURRENT_LANGUAGE === "zh" ? sectorMeta.zh : sectorMeta.en;
                    const countryFlag = countryObj.zh ? countryObj.zh.slice(-2) : "🌐";

                    label.className = "compare-chk-card flex flex-col justify-between bg-slate-900/80 p-2.5 rounded-xl border border-slate-700 hover:border-indigo-500 cursor-pointer transition-all hover:shadow-md";
                    label.setAttribute("data-country", countryCode);
                    label.setAttribute("data-sector", sectorCode);
                    
                    const color = COMPANY_COLORS[comp.toLowerCase()] || "#3B82F6";
                    label.innerHTML = `
                        <div class="flex items-center justify-between gap-1 mb-1.5">
                            <div class="flex items-center space-x-1.5 truncate">
                                <input type="checkbox" value="${upper}" class="compare-chk rounded bg-slate-800 border-slate-600 text-indigo-600 focus:ring-0" checked>
                                <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: ${color}"></span>
                                <span class="text-xs font-bold text-slate-100 truncate">${upper}</span>
                            </div>
                            <span class="text-xs" title="${countryObj.en}">${countryFlag}</span>
                        </div>
                        <div class="flex items-center justify-between text-[10px] text-slate-400 gap-1">
                            <span class="truncate text-[10px] px-1.5 py-0.5 rounded ${sectorMeta.badge} font-medium">${sectorName}</span>
                            <span class="text-slate-500 font-mono text-[9px] uppercase flex-shrink-0">${countryCode}</span>
                        </div>
                    `;
                    chkGrid.appendChild(label);
                }
            });

            // Run initial filter check
            applyCompareFilters();

            if (companies.map(c => c.toUpperCase()).includes(currentVal)) {
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
        let data = null;

        if (isStandaloneMode() && (window.STATIC_METRICS_DB || window.STATIC_METRICS_QUARTERLY_DB)) {
            const key = company.toLowerCase();
            const db = (CURRENT_FREQ === "quarterly" && window.STATIC_METRICS_QUARTERLY_DB) ? window.STATIC_METRICS_QUARTERLY_DB : window.STATIC_METRICS_DB;
            if (db) {
                data = db[key] ||
                       db[key.replace("-platforms", "").replace("alphabet-", "")] ||
                       db[FinancialMetricsExtractor_canonical_ticker(key)] ||
                       Object.values(db)[0];
            }
        } else {
            const res = await fetch(`/api/metrics/${company.toLowerCase()}?freq=${CURRENT_FREQ}&_t=${Date.now()}`, { cache: "no-store" });
            data = await res.json();
        }
        
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
    const years = data.years || [];
    if (!years || years.length === 0) {
        document.getElementById("kpiRevenue").textContent = "-";
        document.getElementById("kpiRevenueYoY").textContent = "-";
        document.getElementById("kpiGrossMargin").textContent = "-";
        document.getElementById("kpiMarginDiff").textContent = "-";
        document.getElementById("kpiOpIncome").textContent = "-";
        document.getElementById("kpiOpMargin").textContent = "-";
        document.getElementById("kpiRdExpense").textContent = "-";
        document.getElementById("kpiRdPct").textContent = "-";
        document.getElementById("kpiHeadcount").textContent = "-";
        document.getElementById("kpiHeadcountPlateau").textContent = "No Data";
        document.getElementById("kpiGpPerEmp").textContent = "-";
        document.getElementById("kpiGpPerEmpYoY").textContent = "No Data";
        updateInsightsText(data);
        return;
    }
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
    const fontColor = isLight ? "#1e293b" : "#94a3b8";
    const gridColor = isLight ? "#cbd5e1" : "#334155";

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
        font: { color: fontColor, size: 11, family: "Inter, system-ui, sans-serif" },
        margin: { l: 45, r: 45, t: 55, b: isQuarterly ? 55 : 35 },
        hovermode: "closest",
        legend: {
            orientation: "h",
            y: 1.15,
            x: 0,
            font: { size: 11.5, color: isLight ? "#0f172a" : "#f8fafc", family: "Inter, system-ui, sans-serif" },
            bgcolor: isLight ? "rgba(255, 255, 255, 0.9)" : "rgba(15, 23, 42, 0.9)",
            bordercolor: isLight ? "rgba(203, 213, 225, 0.8)" : "rgba(51, 65, 85, 0.8)",
            borderwidth: 1
        },
        hoverlabel: {
            bgcolor: isLight ? "#0f172a" : "#090d16",
            bordercolor: "#3b82f6",
            font: {
                color: "#ffffff",
                size: 13,
                family: "Inter, system-ui, sans-serif"
            },
            namelength: -1
        },
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
    const headcounts = sortedYears.map(y => fin[y]?.headcount || 0);
    const grossMargins = sortedYears.map(y => {
        if (typeof fin[y]?.gross_margin === "number") return fin[y].gross_margin;
        if (typeof fin[y]?.gross_margin_pct === "number") return fin[y].gross_margin_pct;
        if (fin[y]?.revenue && fin[y]?.gross_profit) return Number(((fin[y].gross_profit / fin[y].revenue) * 100).toFixed(2));
        return 0;
    });

    const trace1_1 = {
        x: sortedYears, y: headcounts, name: "Headcount (FTE)",
        type: "bar", marker: { color: "#3B82F6", opacity: 0.85 }, yaxis: "y",
        hovertemplate: "<b>Headcount (FTE)</b><br>Period: %{x}<br>Headcount: <b>%{y:,.0f} 人</b><extra></extra>"
    };
    const trace1_2 = {
        x: sortedYears, y: grossMargins, name: "Gross Margin %",
        type: "scatter", mode: "lines+markers", line: { color: "#10B981", width: 3.5 },
        marker: { size: 8, color: "#10B981" }, yaxis: "y2",
        hovertemplate: "<b>Gross Margin %</b><br>Period: %{x}<br>毛利率: <b>%{y:.2f}%</b><extra></extra>"
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

    const trace2_1 = {
        x: years, y: revPerEmp, name: `Rev/FTE (k${currSym})`,
        type: "scatter", mode: "lines+markers", line: { color: "#60A5FA", width: 3 },
        marker: { size: 7 },
        hovertemplate: `<b>人均營收 (Rev/FTE)</b><br>Period: %{x}<br>數值: <b>%{y:,.0f} k${currSym}</b><extra></extra>`
    };
    const trace2_2 = {
        x: years, y: gpPerEmp, name: `GP/FTE (k${currSym})`,
        type: "scatter", mode: "lines+markers", line: { color: "#A855F7", width: 3.5 },
        marker: { size: 8 },
        hovertemplate: `<b>人均毛利 (GP/FTE)</b><br>Period: %{x}<br>數值: <b>%{y:,.0f} k${currSym}</b><extra></extra>`
    };
    const trace2_3 = {
        x: years, y: opPerEmp, name: `OpIncome/FTE (k${currSym})`,
        type: "scatter", mode: "lines+markers", line: { color: "#34D399", width: 3 },
        marker: { size: 7 },
        hovertemplate: `<b>人均營業利益 (Op/FTE)</b><br>Period: %{x}<br>數值: <b>%{y:,.0f} k${currSym}</b><extra></extra>`
    };

    Plotly.newPlot("chartProductivity", [trace2_1, trace2_2, trace2_3], {
        ...commonLayout,
        yaxis: { title: `Productivity (k${currSym} / FTE)`, showgrid: true, gridcolor: gridColor, autorange: true, tickprefix: currSym }
    }, { responsive: true, displayModeBar: false });

    // Chart 3: Operating Profitability & Leverage
    const opIncomes = years.map(y => fin[y]?.operating_income || 0);
    const netIncomes = years.map(y => fin[y]?.net_income || 0);
    const opMargins = years.map(y => fin[y]?.operating_margin || 0);

    const trace3_1 = {
        x: years, y: opIncomes, name: `OpIncome (${unit})`,
        type: "bar", marker: { color: "#06B6D4" }, yaxis: "y",
        hovertemplate: `<b>營業利益 (OpIncome)</b><br>Period: %{x}<br>金額: <b>${unit}%{y:,.0f}</b><extra></extra>`
    };
    const trace3_2 = {
        x: years, y: netIncomes, name: `Net Income (${unit})`,
        type: "bar", marker: { color: "#3B82F6", opacity: 0.75 }, yaxis: "y",
        hovertemplate: `<b>稅後淨利 (Net Income)</b><br>Period: %{x}<br>金額: <b>${unit}%{y:,.0f}</b><extra></extra>`
    };
    const trace3_3 = {
        x: years, y: opMargins, name: "Op Margin %",
        type: "scatter", mode: "lines+markers", line: { color: "#F59E0B", width: 3.5 },
        marker: { size: 8, color: "#F59E0B" }, yaxis: "y2",
        hovertemplate: "<b>營業利益率 %</b><br>Period: %{x}<br>利益率: <b>%{y:.2f}%</b><extra></extra>"
    };

    Plotly.newPlot("chartProfitability", [trace3_1, trace3_2, trace3_3], {
        ...commonLayout,
        barmode: "group",
        yaxis: { title: `Profit (${unit})`, showgrid: true, gridcolor: gridColor, autorange: true },
        yaxis2: { title: "Op Margin %", overlaying: "y", side: "right", showgrid: false, autorange: true, ticksuffix: "%" }
    }, { responsive: true, displayModeBar: false });

    // Chart 4: R&D Intensity
    const rdExpenses = years.map(y => fin[y]?.rd_expense || 0);
    const rdPcts = years.map(y => fin[y]?.rd_pct_rev || 0);

    const trace4_1 = {
        x: years, y: rdExpenses, name: `R&D Expense (${unit})`,
        type: "bar", marker: { color: "#F43F5E", opacity: 0.85 }, yaxis: "y",
        hovertemplate: `<b>研發支出 (R&D)</b><br>Period: %{x}<br>金額: <b>${unit}%{y:,.0f}</b><extra></extra>`
    };
    const trace4_2 = {
        x: years, y: rdPcts, name: "R&D % of Rev",
        type: "scatter", mode: "lines+markers", line: { color: "#FB923C", width: 3.5 },
        marker: { size: 8, color: "#FB923C" }, yaxis: "y2",
        hovertemplate: "<b>研發佔營收比重</b><br>Period: %{x}<br>研發強度: <b>%{y:.2f}%</b><extra></extra>"
    };

    Plotly.newPlot("chartRdIntensity", [trace4_1, trace4_2], {
        ...commonLayout,
        yaxis: { title: `R&D (${unit})`, showgrid: true, gridcolor: gridColor, autorange: true },
        yaxis2: { title: "R&D % of Rev", overlaying: "y", side: "right", showgrid: false, autorange: true, ticksuffix: "%" }
    }, { responsive: true, displayModeBar: false });

    // Chart 5: Growth Dynamics
    const growthYears = sortedYears.slice(1);
    const revGrowth = growthYears.map((y, idx) => {
        if (typeof fin[y]?.rev_growth_yoy === "number") return fin[y].rev_growth_yoy;
        const prevY = sortedYears[idx];
        if (fin[y]?.revenue && fin[prevY]?.revenue) {
            return Number((((fin[y].revenue - fin[prevY].revenue) / fin[prevY].revenue) * 100).toFixed(2));
        }
        return 0;
    });
    const gpGrowth = growthYears.map((y, idx) => {
        if (typeof fin[y]?.gp_growth_yoy === "number") return fin[y].gp_growth_yoy;
        const prevY = sortedYears[idx];
        if (fin[y]?.gross_profit && fin[prevY]?.gross_profit) {
            return Number((((fin[y].gross_profit - fin[prevY].gross_profit) / fin[prevY].gross_profit) * 100).toFixed(2));
        }
        return 0;
    });
    const opGrowth = growthYears.map((y, idx) => {
        if (typeof fin[y]?.op_growth_yoy === "number") return fin[y].op_growth_yoy;
        const prevY = sortedYears[idx];
        if (fin[y]?.operating_income && fin[prevY]?.operating_income) {
            const baseOp = Math.abs(fin[prevY].operating_income) || 1;
            return Number((((fin[y].operating_income - fin[prevY].operating_income) / baseOp) * 100).toFixed(2));
        }
        return 0;
    });
    const hcGrowth = growthYears.map((y, idx) => {
        if (typeof fin[y]?.hc_growth_yoy === "number") return fin[y].hc_growth_yoy;
        const prevY = sortedYears[idx];
        if (fin[y]?.headcount && fin[prevY]?.headcount) {
            return Number((((fin[y].headcount - fin[prevY].headcount) / fin[prevY].headcount) * 100).toFixed(2));
        }
        return 0;
    });

    const trace5_1 = { x: growthYears, y: revGrowth, name: "Revenue YoY %", type: "scatter", mode: "lines+markers", line: { color: "#60A5FA", width: 2 } };
    const trace5_2 = { x: growthYears, y: gpGrowth, name: "Gross Profit YoY %", type: "scatter", mode: "lines+markers", line: { color: "#34D399", width: 2 } };
    const trace5_3 = { x: growthYears, y: opGrowth, name: "OpIncome YoY %", type: "scatter", mode: "lines+markers", line: { color: "#FBBF24", width: 2 } };
    const trace5_4 = { x: growthYears, y: hcGrowth, name: "Headcount YoY %", type: "scatter", mode: "lines+markers", line: { color: "#F87171", width: 2, dash: "dot" } };

    Plotly.newPlot("chartGrowthDynamics", [trace5_1, trace5_2, trace5_3, trace5_4], {
        ...commonLayout,
        yaxis: { title: "Growth Rate (%)", showgrid: true, gridcolor: gridColor, autorange: true, ticksuffix: "%" }
    }, { responsive: true, displayModeBar: false });

    // Chart 6A: High-Value Revenue Segment Breakdown ($M) (Standalone Independent Chart)
    const sb = data.sales_breakdown || {};
    const sbCats = sb.categories || [];
    const sbColors = sb.colors || ["#1E3A8A", "#0284C7", "#059669", "#D97706", "#8B5CF6", "#EC4899"];
    const sbData = sb.data || {};
    const sbYears = Object.keys(sbData).sort((a, b) => {
        if (a.includes("Q") && b.includes("Q")) {
            const pa = a.split(" "), pb = b.split(" ");
            const ya = parseInt(pa[0]) || 0, yb = parseInt(pb[0]) || 0;
            if (ya !== yb) return ya - yb;
            const qa = parseInt(pa[1]?.replace("Q", "")) || 0;
            const qb = parseInt(pb[1]?.replace("Q", "")) || 0;
            return qa - qb;
        }
        return (parseInt(a) || 0) - (parseInt(b) || 0) || a.localeCompare(b);
    });

    const isZh = CURRENT_LANGUAGE === "zh";

    const tracesValue = sbCats.map((cat, idx) => ({
        x: sbYears,
        y: sbYears.map(y => {
            if (Array.isArray(sbData[y])) return sbData[y][idx] || 0;
            if (sbData[y]?.value) return sbData[y].value[idx] || 0;
            if (typeof sbData[y]?.[cat] === "number") {
                const totalRev = fin[y]?.revenue || 0;
                return totalRev > 0 ? (totalRev * sbData[y][cat] / 100) : sbData[y][cat];
            }
            return 0;
        }),
        name: cat,
        type: "bar",
        marker: { color: sbColors[idx] || "#3B82F6" },
        hovertemplate: `<b>${cat}</b><br>${isZh ? '時間期間' : 'Period'}: %{x}<br>${isZh ? '營收價值' : 'Revenue'}: <b>${unit}%{y:,.0f}</b><extra></extra>`
    }));

    Plotly.newPlot("chartSalesValue", tracesValue, {
        ...commonLayout,
        barmode: "stack",
        yaxis: {
            title: `${isZh ? '營收金額' : 'Revenue Value'} (${unit})`,
            showgrid: true,
            gridcolor: gridColor,
            autorange: true
        }
    }, { responsive: true, displayModeBar: false });

    // Chart 6B: Product Shipment Volume & Mix Breakdown (%) (Standalone Independent Chart)
    const tracesVolume = sbCats.map((cat, idx) => ({
        x: sbYears,
        y: sbYears.map(y => {
            if (Array.isArray(sbData[y])) {
                const tot = sbData[y].reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
                return tot > 0 ? Math.round((sbData[y][idx] / tot) * 100) : 0;
            }
            if (sbData[y]?.volume) return sbData[y].volume[idx] || 0;
            if (typeof sbData[y]?.[cat] === "number") return sbData[y][cat];
            return 0;
        }),
        name: cat,
        type: "bar",
        marker: { color: sbColors[idx] || "#3B82F6", opacity: 0.85 },
        hovertemplate: `<b>${cat}</b><br>${isZh ? '時間期間' : 'Period'}: %{x}<br>${isZh ? '出貨/佔比' : 'Volume/Mix'}: <b>%{y:,.0f}</b><extra></extra>`
    }));

    Plotly.newPlot("chartSalesVolume", tracesVolume, {
        ...commonLayout,
        barmode: "stack",
        yaxis: {
            title: isZh ? "出貨量 / 結構佔比 (Units / %)" : "Shipment Volume / Mix (Units / %)",
            showgrid: true,
            gridcolor: gridColor,
            autorange: true
        }
    }, { responsive: true, displayModeBar: false });
}

// -----------------------------------------------------------------------------
// Render Master Audited Table & Single CSV Export
// -----------------------------------------------------------------------------
function renderMasterTable(data) {
    const years = data.years || [];
    const fin = data.financials || {};
    const unit = data.unit || "$M";
    const currSym = unit.includes("€") ? "€" : "$";

    const headerRow = document.getElementById("tableHeaderRow");
    const tbody = document.getElementById("tableBody");

    if (!years || years.length === 0) {
        headerRow.innerHTML = `<th class="py-3 px-4">${CURRENT_LANGUAGE === 'zh' ? '財務指標 / 狀態' : 'Metric / Status'}</th><th class="py-3 px-4 text-center">${CURRENT_LANGUAGE === 'zh' ? '數據狀態' : 'Data Status'}</th>`;
        tbody.innerHTML = `
            <tr>
                <td colspan="2" class="py-8 px-4 text-center text-slate-400 font-medium space-y-2">
                    <div class="text-amber-400 text-base font-semibold mb-1"><i class="fa-solid fa-circle-info mr-1.5"></i> ${CURRENT_LANGUAGE === 'zh' ? '目前尚無此公司之單季 (10-Q) 數據' : 'No Quarterly (10-Q) Data Available for this Company'}</div>
                    <p class="text-xs text-slate-400">${CURRENT_LANGUAGE === 'zh' ? '建議點擊頂部「Annual (10-K)」切換至年度模式，或於上方控制台點擊「立即執行全自動工作流」進行自動下載與解析！' : 'Switch to Annual (10-K) mode or click "Run End-to-End Workflow" above to crawl and parse 10-Q reports.'}</p>
                </td>
            </tr>
        `;
        return;
    }

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
        if (isStandaloneMode() && (window.STATIC_METRICS_DB || window.STATIC_METRICS_QUARTERLY_DB)) {
            const companiesResult = {};
            const db = (CURRENT_FREQ === "quarterly" && window.STATIC_METRICS_QUARTERLY_DB) ? window.STATIC_METRICS_QUARTERLY_DB : window.STATIC_METRICS_DB;
            if (db) {
                checkedBoxes.forEach(t => {
                    const item = db[t] ||
                                 db[t.replace("-platforms", "").replace("alphabet-", "")] ||
                                 db[FinancialMetricsExtractor_canonical_ticker(t)];
                    if (item) {
                        companiesResult[t] = item;
                    }
                });
                COMPARISON_DATA = companiesResult;
                renderComparisonView(COMPARISON_DATA);
                return;
            }
        }

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
    const fontColor = isLight ? "#1e293b" : "#94a3b8";
    const gridColor = isLight ? "#cbd5e1" : "#334155";

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

    const isMulti = tickers.length > 4;

    const commonLayout = {
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: fontColor, size: 11.5, family: "Inter, system-ui, sans-serif" },
        margin: {
            l: 55,
            r: isMulti ? 150 : 35,
            t: isMulti ? 30 : 60,
            b: isQuarterly ? 60 : 40
        },
        hovermode: "closest",
        legend: {
            orientation: isMulti ? "v" : "h",
            x: isMulti ? 1.02 : 0,
            y: isMulti ? 1 : 1.16,
            xanchor: "left",
            yanchor: isMulti ? "top" : "bottom",
            font: { size: 11.5, color: isLight ? "#0f172a" : "#f8fafc", family: "Inter, system-ui, sans-serif" },
            bgcolor: isLight ? "rgba(255, 255, 255, 0.9)" : "rgba(15, 23, 42, 0.9)",
            bordercolor: isLight ? "rgba(203, 213, 225, 0.8)" : "rgba(51, 65, 85, 0.8)",
            borderwidth: 1
        },
        hoverlabel: {
            bgcolor: isLight ? "#ffffff" : "#0f172a",
            bordercolor: isLight ? "#cbd5e1" : "#3b82f6",
            font: {
                color: isLight ? "#0f172a" : "#f8fafc",
                size: 13,
                family: "Inter, system-ui, sans-serif"
            },
            namelength: -1
        },
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
        const name = c.ticker || t.toUpperCase();
        return {
            x: years, y: gms, name: `${name} (%)`,
            type: "scatter", mode: "lines+markers",
            line: { color: col, width: 3 },
            marker: { size: 7, color: col },
            hovertemplate: `<b>${name}</b><br>Year: %{x}<br>Gross Margin: <b>%{y:.2f}%</b><extra></extra>`
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
        const name = c.ticker || t.toUpperCase();
        return {
            x: years, y: revEmp, name: `${name} Rev/FTE`,
            type: "scatter", mode: "lines+markers",
            line: { color: col, width: 3 },
            marker: { size: 7, color: col },
            hovertemplate: `<b>${name}</b><br>Year: %{x}<br>Rev/FTE: <b>$%{y:,.0f}k</b><extra></extra>`
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
        const name = c.ticker || t.toUpperCase();
        return {
            x: years, y: opms, name: `${name} Op Margin`,
            type: "scatter", mode: "lines+markers",
            line: { color: col, width: 3 },
            marker: { size: 7, color: col },
            hovertemplate: `<b>${name}</b><br>Year: %{x}<br>Op Margin: <b>%{y:.2f}%</b><extra></extra>`
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
        const name = c.ticker || t.toUpperCase();
        return {
            x: years, y: rds, name: `${name} R&D %`,
            type: "scatter", mode: "lines+markers",
            line: { color: col, width: 3 },
            marker: { size: 7, color: col },
            hovertemplate: `<b>${name}</b><br>Year: %{x}<br>R&D % of Rev: <b>%{y:.2f}%</b><extra></extra>`
        };
    });

    Plotly.newPlot("chartCompareRD", tracesRD, {
        ...commonLayout,
        yaxis: { title: "R&D % of Rev", showgrid: true, gridcolor: gridColor, autorange: true, ticksuffix: "%" }
    }, { responsive: true, displayModeBar: false });

    // 5. Chart E: Bivariate Strategic Quadrants & Bubble Matrix Benchmark
    renderComparisonScatterPlot(companiesData, tickers);

    // 6. Render Comparison Master Table with Dynamic Multi-Column Sorting
    renderComparisonTableRows(companiesData, tickers);
}

// -----------------------------------------------------------------------------
// Bivariate Strategic Scatter & Bubble Matrix Rendering Engine
// -----------------------------------------------------------------------------
function renderComparisonScatterPlot(companiesData, tickersList) {
    const chartDiv = document.getElementById("chartCompareBivariate");
    if (!chartDiv) return;

    const tickers = tickersList || (companiesData ? Object.keys(companiesData) : []);
    if (!tickers || tickers.length === 0) return;

    const isLight = CURRENT_THEME === "light";
    const fontColor = isLight ? "#0f172a" : "#f8fafc";
    const tickColor = isLight ? "#1e293b" : "#cbd5e1";
    const gridColor = isLight ? "#e2e8f0" : "#334155";
    const lineCol = isLight ? "#64748b" : "#475569";
    const lang = CURRENT_LANGUAGE || "zh";

    const xMetric = SCATTER_METRICS[SCATTER_CONFIG.x] || SCATTER_METRICS.gm;
    const yMetric = SCATTER_METRICS[SCATTER_CONFIG.y] || SCATTER_METRICS.opm;
    const sizeMetric = SCATTER_METRICS[SCATTER_CONFIG.size] || SCATTER_METRICS.revenue;

    // Gather all valid points for scaling and medians
    const allLatestPoints = [];
    const validSizeVals = [];

    tickers.forEach(t => {
        const c = companiesData[t];
        if (!c) return;
        const years = c.years || [];
        if (years.length === 0) return;
        const latestY = years[years.length - 1];
        const fLatest = c.financials ? c.financials[latestY] || {} : {};
        const xv = xMetric.getVal(fLatest);
        const yv = yMetric.getVal(fLatest);
        const sv = sizeMetric.getVal(fLatest);
        if (xv != null && yv != null) {
            allLatestPoints.push({ ticker: t, year: latestY, x: xv, y: yv, size: sv, company: c });
            if (sv != null) validSizeVals.push(sv);
        }
    });

    const minSizeVal = validSizeVals.length > 0 ? Math.min(...validSizeVals) : 0;
    const maxSizeVal = validSizeVals.length > 0 ? Math.max(...validSizeVals) : 1;

    const calcSize = (val) => {
        if (SCATTER_CONFIG.size === "constant" || val == null) return 18;
        if (maxSizeVal === minSizeVal) return 20;
        const sqrtVal = Math.sqrt(Math.max(0, val));
        const sqrtMin = Math.sqrt(Math.max(0, minSizeVal));
        const sqrtMax = Math.sqrt(Math.max(0, maxSizeVal));
        const norm = (sqrtVal - sqrtMin) / ((sqrtMax - sqrtMin) || 1);
        return 14 + norm * 26; // Between 14px and 40px
    };

    const traces = [];

    tickers.forEach((t, idx) => {
        const c = companiesData[t];
        if (!c) return;
        const years = c.years || [];
        if (years.length === 0) return;

        const col = COMPANY_COLORS[t] || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];
        const name = c.company_name || c.ticker || t.toUpperCase();
        const canon = FinancialMetricsExtractor_canonical_ticker(t);
        const countryObj = c.country || COMPANY_COUNTRIES[t] || COMPANY_COUNTRIES[canon] || { en: "United States 🇺🇸", zh: "美國 🇺🇸" };
        const countryStr = lang === "zh" ? (countryObj.zh || countryObj.en || countryObj) : (countryObj.en || countryObj);

        if (SCATTER_CONFIG.trail && years.length > 1) {
            // Collect historical series
            const historicalPts = [];
            years.forEach(y => {
                const f = c.financials ? c.financials[y] || {} : {};
                const xv = xMetric.getVal(f);
                const yv = yMetric.getVal(f);
                const sv = sizeMetric.getVal(f);
                if (xv != null && yv != null) {
                    historicalPts.push({ year: y, x: xv, y: yv, size: sv });
                }
            });

            if (historicalPts.length > 1) {
                // Trajectory Path line
                traces.push({
                    x: historicalPts.map(p => p.x),
                    y: historicalPts.map(p => p.y),
                    name: `${c.ticker || t.toUpperCase()} Path`,
                    type: "scatter",
                    mode: "lines+markers",
                    line: { color: col, width: 2.5, dash: "dot" },
                    marker: { size: 6, color: col, opacity: 0.8 },
                    showlegend: false,
                    hoverinfo: "skip"
                });
            }

            // Endpoint bubble (latest year)
            if (historicalPts.length > 0) {
                const latestPt = historicalPts[historicalPts.length - 1];
                const bubbleSize = calcSize(latestPt.size);
                const hoverHtml = `<b>${name}</b> <span style="font-size:11px;">(${countryStr})</span><br>` +
                    `Period: <b>${latestPt.year}</b><br>` +
                    `${xMetric.axisTitle[lang] || xMetric.label[lang]}: <b>${xMetric.format(latestPt.x)}</b><br>` +
                    `${yMetric.axisTitle[lang] || yMetric.label[lang]}: <b>${yMetric.format(latestPt.y)}</b><br>` +
                    (SCATTER_CONFIG.size !== 'constant' ? `${sizeMetric.axisTitle[lang] || sizeMetric.label[lang]}: <b>${sizeMetric.format(latestPt.size)}</b><br>` : '') +
                    `<extra></extra>`;

                traces.push({
                    x: [latestPt.x],
                    y: [latestPt.y],
                    name: `${c.ticker || t.toUpperCase()} (${latestPt.year})`,
                    type: "scatter",
                    mode: "markers+text",
                    text: [c.ticker || t.toUpperCase()],
                    textposition: "top center",
                    textfont: { size: 12.5, family: "Inter, system-ui, sans-serif", color: isLight ? "#0f172a" : "#ffffff" },
                    marker: {
                        size: [bubbleSize],
                        color: col,
                        opacity: 0.95,
                        line: { color: isLight ? "#334155" : "#0f172a", width: 2 }
                    },
                    hovertemplate: hoverHtml
                });
            }
        } else {
            // Latest snapshot only
            const latestY = years[years.length - 1];
            const fLatest = c.financials ? c.financials[latestY] || {} : {};
            const xv = xMetric.getVal(fLatest);
            const yv = yMetric.getVal(fLatest);
            const sv = sizeMetric.getVal(fLatest);

            if (xv != null && yv != null) {
                const bubbleSize = calcSize(sv);
                const hoverHtml = `<b>${name}</b> <span style="font-size:11px;">(${countryStr})</span><br>` +
                    `Period: <b>${latestY}</b><br>` +
                    `${xMetric.axisTitle[lang] || xMetric.label[lang]}: <b>${xMetric.format(xv)}</b><br>` +
                    `${yMetric.axisTitle[lang] || yMetric.label[lang]}: <b>${yMetric.format(yv)}</b><br>` +
                    (SCATTER_CONFIG.size !== 'constant' ? `${sizeMetric.axisTitle[lang] || sizeMetric.label[lang]}: <b>${sizeMetric.format(sv)}</b><br>` : '') +
                    `<extra></extra>`;

                traces.push({
                    x: [xv],
                    y: [yv],
                    name: `${c.ticker || t.toUpperCase()} (${latestY})`,
                    type: "scatter",
                    mode: "markers+text",
                    text: [c.ticker || t.toUpperCase()],
                    textposition: "top center",
                    textfont: { size: 12.5, family: "Inter, system-ui, sans-serif", color: isLight ? "#0f172a" : "#ffffff" },
                    marker: {
                        size: [bubbleSize],
                        color: col,
                        opacity: 0.95,
                        line: { color: isLight ? "#334155" : "#0f172a", width: 2 }
                    },
                    hovertemplate: hoverHtml
                });
            }
        }
    });

    // Dynamic Quadrant Calculation
    const validXs = allLatestPoints.map(p => p.x);
    const validYs = allLatestPoints.map(p => p.y);
    const medianX = calculateMedian(validXs);
    const medianY = calculateMedian(validYs);

    const minX = validXs.length > 0 ? Math.min(...validXs) : 0;
    const maxX = validXs.length > 0 ? Math.max(...validXs) : 100;
    const minY = validYs.length > 0 ? Math.min(...validYs) : 0;
    const maxY = validYs.length > 0 ? Math.max(...validYs) : 100;

    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);

    const xRange = [minX - spanX * 0.15, maxX + spanX * 0.18];
    const yRange = [minY - spanY * 0.15, maxY + spanY * 0.18];

    const shapes = [];
    const annotations = [];

    if (validXs.length >= 2) {
        // Vertical dashed median line
        shapes.push({
            type: "line",
            x0: medianX, x1: medianX,
            y0: yRange[0], y1: yRange[1],
            line: { color: isLight ? "#475569" : "#94a3b8", width: 2, dash: "dash" }
        });

        // Horizontal dashed median line
        shapes.push({
            type: "line",
            x0: xRange[0], x1: xRange[1],
            y0: medianY, y1: medianY,
            line: { color: isLight ? "#475569" : "#94a3b8", width: 2, dash: "dash" }
        });

        // Quadrant Annotations
        const q1Label = lang === "zh" ? "🏆 Q1: 雙高領先 (Leaders)" : "🏆 Q1: Leaders (High X / High Y)";
        const q2Label = lang === "zh" ? "💎 Q2: 利基優勢 (Niche Profit)" : "💎 Q2: Niche (Low X / High Y)";
        const q3Label = lang === "zh" ? "🏭 Q3: 規模運營 (Scale/Volume)" : "🏭 Q3: Scale (Low X / Low Y)";
        const q4Label = lang === "zh" ? "🚀 Q4: 高投入轉化 (Incubators)" : "🚀 Q4: High Invest (High X / Low Y)";

        annotations.push(
            {
                x: xRange[1], y: yRange[1], xref: "x", yref: "y",
                text: `<b>${q1Label}</b>`, showarrow: false, xanchor: "right", yanchor: "top",
                font: { size: 11.5, color: isLight ? "#065f46" : "#34d399", family: "Inter, sans-serif" },
                bgcolor: isLight ? "#ecfdf5" : "rgba(6, 78, 59, 0.85)",
                bordercolor: isLight ? "#059669" : "#10b981",
                borderwidth: 1.5, borderpad: 5
            },
            {
                x: xRange[0], y: yRange[1], xref: "x", yref: "y",
                text: `<b>${q2Label}</b>`, showarrow: false, xanchor: "left", yanchor: "top",
                font: { size: 11.5, color: isLight ? "#0369a1" : "#38bdf8", family: "Inter, sans-serif" },
                bgcolor: isLight ? "#f0f9ff" : "rgba(12, 74, 110, 0.85)",
                bordercolor: isLight ? "#0284c7" : "#38bdf8",
                borderwidth: 1.5, borderpad: 5
            },
            {
                x: xRange[0], y: yRange[0], xref: "x", yref: "y",
                text: `<b>${q3Label}</b>`, showarrow: false, xanchor: "left", yanchor: "bottom",
                font: { size: 11.5, color: isLight ? "#334155" : "#cbd5e1", family: "Inter, sans-serif" },
                bgcolor: isLight ? "#f8fafc" : "rgba(30, 41, 59, 0.85)",
                bordercolor: isLight ? "#64748b" : "#94a3b8",
                borderwidth: 1.5, borderpad: 5
            },
            {
                x: xRange[1], y: yRange[0], xref: "x", yref: "y",
                text: `<b>${q4Label}</b>`, showarrow: false, xanchor: "right", yanchor: "bottom",
                font: { size: 11.5, color: isLight ? "#92400e" : "#fbbf24", family: "Inter, sans-serif" },
                bgcolor: isLight ? "#fffbeb" : "rgba(120, 53, 15, 0.85)",
                bordercolor: isLight ? "#d97706" : "#f59e0b",
                borderwidth: 1.5, borderpad: 5
            },
            {
                x: medianX, y: yRange[0], xref: "x", yref: "y",
                text: `<b>Med: ${xMetric.format(medianX)}</b>`, showarrow: false, xanchor: "center", yanchor: "bottom",
                font: { size: 11, color: isLight ? "#0f172a" : "#f8fafc", family: "Inter, sans-serif" },
                bgcolor: isLight ? "#ffffff" : "#1e293b",
                bordercolor: isLight ? "#475569" : "#64748b",
                borderwidth: 1.5, borderpad: 4
            },
            {
                x: xRange[0], y: medianY, xref: "x", yref: "y",
                text: `<b>Med: ${yMetric.format(medianY)}</b>`, showarrow: false, xanchor: "left", yanchor: "middle",
                font: { size: 11, color: isLight ? "#0f172a" : "#f8fafc", family: "Inter, sans-serif" },
                bgcolor: isLight ? "#ffffff" : "#1e293b",
                bordercolor: isLight ? "#475569" : "#64748b",
                borderwidth: 1.5, borderpad: 4
            }
        );
    }

    const isMulti = tickers.length > 4;
    const scatterLayout = {
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: fontColor, size: 12.5, family: "Inter, system-ui, sans-serif" },
        margin: { l: 65, r: isMulti ? 180 : 45, t: 40, b: 55 },
        hovermode: "closest",
        showlegend: true,
        legend: {
            orientation: isMulti ? "v" : "h",
            x: isMulti ? 1.02 : 0,
            y: isMulti ? 1 : 1.14,
            xanchor: "left",
            yanchor: isMulti ? "top" : "bottom",
            font: { size: 12, color: fontColor },
            bgcolor: isLight ? "rgba(255, 255, 255, 0.95)" : "rgba(15, 23, 42, 0.95)",
            bordercolor: isLight ? "rgba(148, 163, 184, 0.8)" : "rgba(51, 65, 85, 0.8)",
            borderwidth: 1.5
        },
        xaxis: {
            title: {
                text: xMetric.axisTitle[lang] || xMetric.label[lang],
                font: { size: 13.5, color: fontColor, family: "Inter, system-ui, sans-serif" }
            },
            tickfont: { size: 12, color: tickColor, family: "Inter, system-ui, sans-serif" },
            range: xRange,
            showgrid: true,
            gridcolor: gridColor,
            gridwidth: 1,
            showline: true,
            linecolor: lineCol,
            linewidth: 1.5,
            zeroline: true,
            zerolinecolor: isLight ? "#94a3b8" : "#475569",
            zerolinewidth: 1.5
        },
        yaxis: {
            title: {
                text: yMetric.axisTitle[lang] || yMetric.label[lang],
                font: { size: 13.5, color: fontColor, family: "Inter, system-ui, sans-serif" }
            },
            tickfont: { size: 12, color: tickColor, family: "Inter, system-ui, sans-serif" },
            range: yRange,
            showgrid: true,
            gridcolor: gridColor,
            gridwidth: 1,
            showline: true,
            linecolor: lineCol,
            linewidth: 1.5,
            zeroline: true,
            zerolinecolor: isLight ? "#94a3b8" : "#475569",
            zerolinewidth: 1.5
        },
        shapes: shapes,
        annotations: annotations
    };

    Plotly.newPlot("chartCompareBivariate", traces, scatterLayout, { responsive: true, displayModeBar: false });
}

window.applyScatterPreset = function(presetKey) {
    SCATTER_CONFIG.activePreset = presetKey;
    if (presetKey === "gm_op") {
        SCATTER_CONFIG.x = "gm";
        SCATTER_CONFIG.y = "opm";
        SCATTER_CONFIG.size = "revenue";
    } else if (presetKey === "rd_revfte") {
        SCATTER_CONFIG.x = "rd";
        SCATTER_CONFIG.y = "rev_per_emp";
        SCATTER_CONFIG.size = "headcount";
    } else if (presetKey === "revfte_gm") {
        SCATTER_CONFIG.x = "rev_per_emp";
        SCATTER_CONFIG.y = "gm";
        SCATTER_CONFIG.size = "revenue";
    } else if (presetKey === "rd_op") {
        SCATTER_CONFIG.x = "rd";
        SCATTER_CONFIG.y = "opm";
        SCATTER_CONFIG.size = "revenue";
    }

    const selX = document.getElementById("scatterSelectX");
    const selY = document.getElementById("scatterSelectY");
    const selSize = document.getElementById("scatterSelectSize");
    if (selX) selX.value = SCATTER_CONFIG.x;
    if (selY) selY.value = SCATTER_CONFIG.y;
    if (selSize) selSize.value = SCATTER_CONFIG.size;

    ["gm_op", "rd_revfte", "revfte_gm", "rd_op"].forEach(key => {
        const btn = document.getElementById(`presetBtn_${key}`);
        if (btn) {
            if (key === presetKey) {
                btn.className = "scatter-preset-btn px-2.5 py-1 rounded-lg border border-amber-500/50 bg-amber-500/20 text-amber-300 font-medium hover:bg-amber-500/30 transition-all cursor-pointer";
            } else {
                btn.className = "scatter-preset-btn px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 hover:text-white transition-all cursor-pointer";
            }
        }
    });

    if (COMPARISON_DATA) {
        renderComparisonScatterPlot(COMPARISON_DATA);
    }
};

window.onScatterAxisChange = function() {
    const selX = document.getElementById("scatterSelectX");
    const selY = document.getElementById("scatterSelectY");
    const selSize = document.getElementById("scatterSelectSize");
    const chkTrail = document.getElementById("scatterToggleTrail");
    if (selX) SCATTER_CONFIG.x = selX.value;
    if (selY) SCATTER_CONFIG.y = selY.value;
    if (selSize) SCATTER_CONFIG.size = selSize.value;
    if (chkTrail) SCATTER_CONFIG.trail = chkTrail.checked;

    ["gm_op", "rd_revfte", "revfte_gm", "rd_op"].forEach(key => {
        const btn = document.getElementById(`presetBtn_${key}`);
        if (btn) {
            btn.className = "scatter-preset-btn px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 hover:text-white transition-all cursor-pointer";
        }
    });

    if (COMPARISON_DATA) {
        renderComparisonScatterPlot(COMPARISON_DATA);
    }
};

// -----------------------------------------------------------------------------
// Comparison Table Sorting & Row Rendering Engine
// -----------------------------------------------------------------------------
function renderComparisonTableRows(companiesData, tickersList) {
    const tbody = document.getElementById("compareTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const tickers = tickersList || (companiesData ? Object.keys(companiesData) : []);
    if (!tickers || tickers.length === 0) return;

    // Helper to extract sortable values per company
    const getVal = (t, col) => {
        const c = companiesData[t] || {};
        const years = c.years || [];
        const latestY = years.length > 0 ? years[years.length - 1] : "";
        const f = c.financials ? c.financials[latestY] || {} : {};
        switch (col) {
            case "company": return (c.company_name || c.ticker || t).toLowerCase();
            case "country": {
                const canon = FinancialMetricsExtractor_canonical_ticker(t);
                const cObj = c.country || COMPANY_COUNTRIES[t] || COMPANY_COUNTRIES[canon] || { en: "United States 🇺🇸", zh: "美國 🇺🇸" };
                return String(CURRENT_LANGUAGE === "zh" ? (cObj.zh || cObj.en || cObj) : (cObj.en || cObj)).toLowerCase();
            }
            case "year": {
                const p = String(latestY).split(" ");
                const y = parseInt(p[0]) || 0;
                const q = p[1] ? (parseInt(p[1].replace("Q", "")) || 0) : 0;
                return y * 10 + q;
            }
            case "revenue": return f.revenue != null ? f.revenue : -Infinity;
            case "gm": return f.gross_margin != null ? f.gross_margin : -Infinity;
            case "opm": return f.operating_margin != null ? f.operating_margin : -Infinity;
            case "rd": return f.rd_pct_rev != null ? f.rd_pct_rev : -Infinity;
            case "headcount": return f.headcount != null ? f.headcount : -Infinity;
            case "rev_per_emp": return f.rev_per_emp != null ? f.rev_per_emp : -Infinity;
            case "gp_per_emp": return f.gp_per_emp != null ? f.gp_per_emp : -Infinity;
            default: return 0;
        }
    };

    // Sort tickers array
    const sortedTickers = [...tickers].sort((a, b) => {
        const valA = getVal(a, COMPARE_SORT_COL);
        const valB = getVal(b, COMPARE_SORT_COL);
        if (typeof valA === "string") {
            return COMPARE_SORT_DIR === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return COMPARE_SORT_DIR === "asc" ? (valA - valB) : (valB - valA);
    });

    // Update Header Sort Icons
    const colList = ["company", "country", "year", "revenue", "gm", "opm", "rd", "headcount", "rev_per_emp", "gp_per_emp"];
    colList.forEach(col => {
        const icon = document.getElementById(`sort-icon-${col}`);
        if (icon) {
            if (col === COMPARE_SORT_COL) {
                icon.className = `fa-solid ${COMPARE_SORT_DIR === "asc" ? "fa-sort-up" : "fa-sort-down"} text-blue-400 text-[11px]`;
            } else {
                icon.className = "fa-solid fa-sort text-slate-600 text-[10px]";
            }
        }
    });

    // Render sorted rows
    sortedTickers.forEach(t => {
        const c = companiesData[t];
        const years = c.years || [];
        const latestY = years.length > 0 ? years[years.length - 1] : "-";
        const f = c.financials ? c.financials[latestY] || {} : {};
        const unit = c.unit || "$M";
        const currSym = unit.includes("€") ? "€" : "$";
        const col = COMPANY_COLORS[t] || "#3B82F6";
        const canon = FinancialMetricsExtractor_canonical_ticker(t);
        const countryObj = c.country || COMPANY_COUNTRIES[t] || COMPANY_COUNTRIES[canon] || { en: "United States 🇺🇸", zh: "美國 🇺🇸" };
        const countryStr = CURRENT_LANGUAGE === "zh" ? (countryObj.zh || countryObj.en || countryObj) : (countryObj.en || countryObj);

        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-800/50 transition-colors";
        tr.innerHTML = `
            <td class="py-3 px-4 font-bold flex items-center gap-2 text-white">
                <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${col}"></span>
                <span>${c.company_name || c.ticker || t.toUpperCase()}</span>
            </td>
            <td class="py-3 px-4 font-medium text-slate-300 whitespace-nowrap">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-900/80 border border-slate-700/80 text-slate-200">${countryStr}</span>
            </td>
            <td class="py-3 px-4 font-mono text-slate-300">${latestY}</td>
            <td class="py-3 px-4 font-mono text-slate-200 text-right">${unit}${formatNumber(f.revenue)}</td>
            <td class="py-3 px-4 font-mono font-bold text-emerald-400 text-right">${f.gross_margin != null ? f.gross_margin + '%' : '-'}</td>
            <td class="py-3 px-4 font-mono font-bold text-cyan-400 text-right">${f.operating_margin != null ? f.operating_margin + '%' : '-'}</td>
            <td class="py-3 px-4 font-mono text-rose-400 text-right">${f.rd_pct_rev != null ? f.rd_pct_rev + '%' : '-'}</td>
            <td class="py-3 px-4 font-mono text-amber-300 text-right">${formatNumber(f.headcount)}</td>
            <td class="py-3 px-4 font-mono font-bold text-purple-400 text-right">${currSym}${formatNumber(f.rev_per_emp)}</td>
            <td class="py-3 px-4 font-mono font-bold text-indigo-400 text-right">${currSym}${formatNumber(f.gp_per_emp)}</td>
        `;
        tbody.appendChild(tr);
    });
}

window.sortCompareTable = function(col) {
    if (COMPARE_SORT_COL === col) {
        COMPARE_SORT_DIR = COMPARE_SORT_DIR === "asc" ? "desc" : "asc";
    } else {
        COMPARE_SORT_COL = col;
        COMPARE_SORT_DIR = (col === "company" || col === "country" || col === "year") ? "asc" : "desc";
    }
    if (COMPARISON_DATA) {
        renderComparisonTableRows(COMPARISON_DATA);
    }
};

function exportComparisonToCSV() {
    if (!COMPARISON_DATA) return;
    const tickers = Object.keys(COMPARISON_DATA);

    let csv = "Company,Country,Ticker,Latest Year,Revenue,Gross Margin %,Operating Margin %,R&D % of Rev,Headcount,Rev/FTE,GP/FTE\n";
    tickers.forEach(t => {
        const c = COMPARISON_DATA[t];
        const years = c.years || [];
        const latestY = years.length > 0 ? years[years.length - 1] : "";
        const f = c.financials ? c.financials[latestY] || {} : {};
        const canon = FinancialMetricsExtractor_canonical_ticker(t);
        const countryObj = c.country || COMPANY_COUNTRIES[t] || COMPANY_COUNTRIES[canon] || { en: "United States 🇺🇸", zh: "美國 🇺🇸" };
        const countryStr = CURRENT_LANGUAGE === "zh" ? (countryObj.zh || countryObj.en || countryObj) : (countryObj.en || countryObj);
        const row = [
            `"${c.company_name || t}"`,
            `"${countryStr}"`,
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

    progressBar.style.width = "5%";
    progressPercent.textContent = "5%";
    progressText.textContent = "Connecting to SEC / filings server...";

    const streamUrl = `/api/run-workflow-stream?target=${encodeURIComponent(input)}&years=${encodeURIComponent(years)}&freq=${encodeURIComponent(CURRENT_FREQ)}&_t=${Date.now()}`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = async (event) => {
        if (!event.data) return;
        try {
            const data = JSON.parse(event.data);
            if (data.status === "progress") {
                const pct = Math.min(Math.max(data.percent, 5), 98);
                progressBar.style.width = `${pct}%`;
                progressPercent.textContent = `${Math.round(pct)}%`;
                progressText.textContent = data.message;
            } else if (data.status === "completed") {
                eventSource.close();
                progressBar.style.width = "100%";
                progressPercent.textContent = "100%";
                progressText.textContent = "Workflow completed successfully!";

                await loadCompaniesList();
                const finalTicker = data.result?.ticker || input;
                document.getElementById("companySelect").value = finalTicker.toUpperCase();
                await loadDashboardData(finalTicker);

                setTimeout(() => {
                    progressContainer.classList.add("hidden");
                    progressBar.style.width = "0%";
                    runBtn.disabled = false;
                    runBtn.classList.remove("opacity-50", "cursor-not-allowed");
                }, 2000);
            } else if (data.status === "error") {
                eventSource.close();
                progressText.textContent = data.message || "An error occurred during execution.";
                runBtn.disabled = false;
                runBtn.classList.remove("opacity-50", "cursor-not-allowed");
            }
        } catch (err) {
            console.error("Error parsing SSE data:", err);
        }
    };

    eventSource.onerror = (err) => {
        eventSource.close();
        progressText.textContent = "Stream connection closed.";
        runBtn.disabled = false;
        runBtn.classList.remove("opacity-50", "cursor-not-allowed");
    };
}

async function loadMarkdownFiles(ticker) {
    const listEl = document.getElementById("mdFileList");
    listEl.innerHTML = '<p class="text-xs text-slate-500 text-center py-4">Loading files...</p>';

    try {
        let files = [];
        if (isStandaloneMode() && window.STATIC_MARKDOWN_DB) {
            const key = ticker.toLowerCase();
            const mdObj = window.STATIC_MARKDOWN_DB[key] ||
                          window.STATIC_MARKDOWN_DB[key.replace("-platforms", "").replace("alphabet-", "")] ||
                          window.STATIC_MARKDOWN_DB[FinancialMetricsExtractor_canonical_ticker(key)] || {};
            files = Object.keys(mdObj).map(fn => {
                const isQ = fn.toUpperCase().includes("10-Q") || fn.includes("_Q1_") || fn.includes("_Q2_") || fn.includes("_Q3_") || fn.includes("_Q4_");
                return {
                    filename: fn,
                    size: (mdObj[fn] || "").length,
                    report_type: isQ ? "10-Q" : (fn.toUpperCase().includes("20-F") ? "20-F" : "10-K")
                };
            });
        } else {
            const res = await fetch(`/api/markdown-files/${ticker}?_t=${Date.now()}`, { cache: "no-store" });
            const data = await res.json();
            files = data.files || [];
        }

        // Sort files: if in quarterly mode, prioritize 10-Q files; else keep chronological
        if (CURRENT_FREQ === "quarterly") {
            files.sort((a, b) => {
                const aIsQ = (a.report_type === "10-Q" || a.filename.toUpperCase().includes("10-Q")) ? 1 : 0;
                const bIsQ = (b.report_type === "10-Q" || b.filename.toUpperCase().includes("10-Q")) ? 1 : 0;
                if (aIsQ !== bIsQ) return bIsQ - aIsQ;
                return b.filename.localeCompare(a.filename);
            });
        } else {
            files.sort((a, b) => {
                const aIsQ = (a.report_type === "10-Q" || a.filename.toUpperCase().includes("10-Q")) ? 1 : 0;
                const bIsQ = (b.report_type === "10-Q" || b.filename.toUpperCase().includes("10-Q")) ? 1 : 0;
                if (aIsQ !== bIsQ) return aIsQ - bIsQ;
                return b.filename.localeCompare(a.filename);
            });
        }

        listEl.innerHTML = "";

        if (files && files.length > 0) {
            files.forEach((file, idx) => {
                const btn = document.createElement("button");
                btn.className = "w-full text-left p-2 rounded-lg text-xs font-mono text-slate-300 hover:bg-slate-800 transition-colors flex items-center justify-between group";
                
                const isQ = file.report_type === "10-Q" || file.filename.toUpperCase().includes("10-Q") || file.filename.includes("_Q1_") || file.filename.includes("_Q2_") || file.filename.includes("_Q3_") || file.filename.includes("_Q4_");
                const badgeHtml = isQ
                    ? `<span class="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-sans font-semibold mr-1.5">10-Q</span>`
                    : `<span class="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded font-sans font-semibold mr-1.5">${file.filename.toUpperCase().includes("20-F") ? "20-F" : "10-K"}</span>`;

                const fileSizeKb = (file.size_bytes ? (file.size_bytes / 1024) : (file.size ? file.size / 1024 : 0)).toFixed(1);

                btn.innerHTML = `
                    <span class="truncate flex items-center">
                        ${badgeHtml}
                        <i class="fa-regular fa-file-lines mr-1.5 text-blue-400"></i>
                        <span class="truncate">${file.filename}</span>
                    </span>
                    <span class="text-[10px] text-slate-500 group-hover:text-slate-300 font-sans ml-2 flex-shrink-0">${fileSizeKb} KB</span>
                `;
                btn.addEventListener("click", () => previewMarkdownFile(ticker, file.filename));
                listEl.appendChild(btn);
            });
            previewMarkdownFile(ticker, files[0].filename);
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
        let content = "";
        if (isStandaloneMode() && window.STATIC_MARKDOWN_DB) {
            const key = ticker.toLowerCase();
            const mdObj = window.STATIC_MARKDOWN_DB[key] ||
                          window.STATIC_MARKDOWN_DB[key.replace("-platforms", "").replace("alphabet-", "")] || {};
            content = mdObj[filename] || "Markdown content not available in static bundle.";
        } else {
            const res = await fetch(`/api/markdown-content/${ticker}/${filename}?_t=${Date.now()}`, { cache: "no-store" });
            const data = await res.json();
            content = data.content || "";
        }

        preEl.textContent = content;
        copyBtn.classList.remove("hidden");
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(content);
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


// =========================================================================
// RWD AUTO-RESIZE HANDLER FOR ALL PLOTLY CHARTS
// =========================================================================
let rwdResizeTimer = null;
window.addEventListener("resize", () => {
    clearTimeout(rwdResizeTimer);
    rwdResizeTimer = setTimeout(() => {
        const chartIds = [
            "chartInflection", "chartProductivity", "chartProfitability",
            "chartRdIntensity", "chartGrowthDynamics", "chartSalesValue",
            "chartSalesVolume", "chartCompareGM", "chartCompareProductivity",
            "chartCompareOpMargin", "chartCompareRD", "chartCompareBivariate",
            "chartCompGmTrend", "chartCompGpEmpScatter",
            "chartCompRdIntensity", "chartCompRadar", "chartCompRankGrowth",
            "chartCompHealthMatrix", "zoomedChartPlot"
        ];
        chartIds.forEach(id => {
            const el = document.getElementById(id);
            if (el && el.data && window.Plotly) {
                Plotly.Plots.resize(el);
            }
        });
    }, 150);
});
