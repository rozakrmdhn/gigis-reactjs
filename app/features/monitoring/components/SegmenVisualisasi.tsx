import React, { useState, useMemo, useRef } from "react";
import { cn } from "~/lib/utils";
import {
    Calendar,
    DollarSign,
    Layers as LayersIcon,
    MapPin,
    Wrench,
    CheckCircle2,
    Info,
    Eye,
    Layers,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Download,
    Filter,
    HardHat,
    Navigation,
    Compass,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface SegmenData {
    id: string;
    nama: string;
    tahun: number;
    /** Posisi STA awal dalam meter dari titik nol ruas jalan */
    startM: number;
    /** Posisi STA akhir dalam meter dari titik nol ruas jalan */
    endM: number;
    kondisi?: "BAIK" | "SEDANG" | "RUSAK_RINGAN" | "RUSAK_BERAT";
    jenis?: string;             // Construction type (e.g. "Rigid Beton", "Asphalt Hotmix")
    anggaran?: number | string; // Budget
    sumberDana?: string;        // Funding source
    kontraktor?: string;        // Contractor / Pelaksana
    progress?: number;          // Progress %
    fotoCount?: number;         // Photo count
    staAwalFormatted?: string;  // e.g. "STA 0+000"
    staAkhirFormatted?: string; // e.g. "STA 1+250"
    startCoord?: [number, number]; // GIS coordinate [lon, lat]
    endCoord?: [number, number];   // GIS coordinate [lon, lat]
    rawSegmen?: any;            // Raw GIS feature reference
}

export interface RuasJalan {
    nama: string;
    /** Total road length in meters */
    panjangTotal: number;
    desa?: string;
    kecamatan?: string;
}

interface SegmenVisualisasiProps {
    ruas: RuasJalan;
    segmens: SegmenData[];
    onSelectSegment?: (seg: SegmenData) => void;
    className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Strict Year Colors (per specification)
// 2023 = Orange, 2024 = Green, 2025 = Blue, 2026 = Purple, 2027 = Red
// ─────────────────────────────────────────────────────────────────────────────

const TAHUN_COLORS: Record<number, { bg: string; border: string; text: string; label: string; ring: string; hex: string }> = {
    2023: { bg: "#f97316", border: "#ea580c", text: "#7c2d12", ring: "ring-orange-500/40", label: "TA 2023", hex: "#f97316" }, // Orange
    2024: { bg: "#10b981", border: "#059669", text: "#065f46", ring: "ring-emerald-500/40", label: "TA 2024", hex: "#10b981" }, // Green
    2025: { bg: "#0284c7", border: "#0369a1", text: "#0c4a6e", ring: "ring-sky-500/40", label: "TA 2025", hex: "#0284c7" }, // Blue
    2026: { bg: "#8b5cf6", border: "#7c3aed", text: "#4c1d95", ring: "ring-purple-500/40", label: "TA 2026", hex: "#8b5cf6" }, // Purple
    2027: { bg: "#ef4444", border: "#dc2626", text: "#7f1d1d", ring: "ring-red-500/40", label: "TA 2027", hex: "#ef4444" }, // Red
};

const DYNAMIC_PALETTE = [
    { bg: "#f97316", border: "#ea580c", text: "#7c2d12", ring: "ring-orange-500/40", hex: "#f97316" },
    { bg: "#10b981", border: "#059669", text: "#065f46", ring: "ring-emerald-500/40", hex: "#10b981" },
    { bg: "#0284c7", border: "#0369a1", text: "#0c4a6e", ring: "ring-sky-500/40", hex: "#0284c7" },
    { bg: "#8b5cf6", border: "#7c3aed", text: "#4c1d95", ring: "ring-purple-500/40", hex: "#8b5cf6" },
    { bg: "#ef4444", border: "#dc2626", text: "#7f1d1d", ring: "ring-red-500/40", hex: "#ef4444" },
];

function getTahunColor(tahun: number) {
    if (TAHUN_COLORS[tahun]) return TAHUN_COLORS[tahun];
    const idx = Math.abs(tahun) % DYNAMIC_PALETTE.length;
    const base = DYNAMIC_PALETTE[idx];
    return {
        ...base,
        label: `TA ${tahun}`,
    };
}

const KONDISI_COLORS: Record<string, { color: string; label: string }> = {
    BAIK: { color: "#10b981", label: "Baik" },
    SEDANG: { color: "#3b82f6", label: "Sedang" },
    RUSAK_RINGAN: { color: "#f59e0b", label: "Rusak Ringan" },
    RUSAK_BERAT: { color: "#ef4444", label: "Rusak Berat" },
};

function formatMeter(m: number): string {
    if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
    return `${m.toFixed(2)} m`;
}

function formatSTA(m: number): string {
    const km = Math.floor(m / 1000);
    const meter = Math.round(m % 1000);
    return `STA ${km}+${meter.toString().padStart(3, "0")}`;
}

function formatRupiah(val?: number | string): string {
    if (!val) return "Rp -";
    const num = typeof val === "number" ? val : parseFloat(val.toString().replace(/[^\d]/g, ""));
    if (isNaN(num) || num === 0) return "Rp -";
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Enterprise GIS Component
// ─────────────────────────────────────────────────────────────────────────────

export function SegmenVisualisasi({ ruas, segmens, onSelectSegment, className = "" }: SegmenVisualisasiProps) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"timeline" | "overlay">("timeline");
    const [selectedYearFilter, setSelectedYearFilter] = useState<number | "ALL">("ALL");
    const [selectedFundingFilter, setSelectedFundingFilter] = useState<string | "ALL">("ALL");
    const [zoomLevel, setZoomLevel] = useState<number>(1); // 1x to 3x zoom
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter unique years ascending (e.g. 2023, 2025, 2026)
    const years = useMemo(() => {
        return Array.from(new Set(segmens.map((s) => s.tahun))).sort((a, b) => a - b);
    }, [segmens]);

    // Unique funding sources
    const fundingSources = useMemo(() => {
        const set = new Set<string>();
        segmens.forEach((s) => {
            if (s.sumberDana) set.add(s.sumberDana);
        });
        return Array.from(set);
    }, [segmens]);

    // Filtered segments based on year/funding selection
    const filteredSegmens = useMemo(() => {
        return segmens.filter((s) => {
            if (selectedYearFilter !== "ALL" && s.tahun !== selectedYearFilter) return false;
            if (selectedFundingFilter !== "ALL" && s.sumberDana !== selectedFundingFilter) return false;
            return true;
        });
    }, [segmens, selectedYearFilter, selectedFundingFilter]);

    // Group segments by year
    const byYear = useMemo(() => {
        return years.reduce<Record<number, SegmenData[]>>((acc, y) => {
            acc[y] = filteredSegmens.filter((s) => s.tahun === y);
            return acc;
        }, {});
    }, [years, filteredSegmens]);

    // Overall completion percentage calculation (merged non-overlapping STA spans)
    const overallCompletionPct = useMemo(() => {
        if (!ruas.panjangTotal || segmens.length === 0) return 0;
        const intervals = segmens
            .map((s) => [Math.max(0, s.startM), Math.min(ruas.panjangTotal, s.endM)])
            .sort((a, b) => a[0] - b[0]);

        if (intervals.length === 0) return 0;

        const merged: number[][] = [];
        let curr = intervals[0];

        for (let i = 1; i < intervals.length; i++) {
            const next = intervals[i];
            if (next[0] <= curr[1]) {
                curr[1] = Math.max(curr[1], next[1]);
            } else {
                merged.push(curr);
                curr = next;
            }
        }
        merged.push(curr);

        const totalBuiltM = merged.reduce((acc, inv) => acc + (inv[1] - inv[0]), 0);
        return Math.min(100, Math.max(0, (totalBuiltM / ruas.panjangTotal) * 100));
    }, [ruas.panjangTotal, segmens]);

    // Calculate 100m tick marks for horizontal axis
    const tickIntervalM = 100;
    const totalTicksCount = Math.max(1, Math.ceil((ruas.panjangTotal || 1000) / tickIntervalM));
    const hundredMeterTicks = useMemo(() => {
        const list: number[] = [];
        for (let m = 0; m <= (ruas.panjangTotal || 1000); m += tickIntervalM) {
            list.push(m);
        }
        // Ensure total road length is included as final tick
        if (list[list.length - 1] !== (ruas.panjangTotal || 1000)) {
            list.push(ruas.panjangTotal || 1000);
        }
        return list;
    }, [ruas.panjangTotal]);

    const roadHeight = 28;
    const rowHeight = 44;
    const rulerHeight = 40;
    const totalCanvasHeight = viewMode === "overlay"
        ? roadHeight + rowHeight * 1.5 + rulerHeight + 20
        : roadHeight + years.length * rowHeight + rulerHeight + 20;

    // Strict Formula Positioning with Strict Master Road STA Clamping:
    // left = (clampedStartM / Total_Road_Length) * 100%
    // width = ((clampedEndM - clampedStartM) / Total_Road_Length) * 100%
    const getLeftPct = (startM: number) => {
        const total = ruas.panjangTotal || 1;
        const clamped = Math.max(0, Math.min(total, startM));
        return (clamped / total) * 100;
    };

    const getWidthPct = (startM: number, endM: number) => {
        const total = ruas.panjangTotal || 1;
        const clampedStart = Math.max(0, Math.min(total, startM));
        const clampedEnd = Math.max(clampedStart, Math.min(total, endM));
        const leftPct = (clampedStart / total) * 100;
        const rawWidthPct = ((clampedEnd - clampedStart) / total) * 100;
        return Math.max(0, Math.min(100 - leftPct, rawWidthPct));
    };

    const handleExport = () => {
        window.print();
    };

    return (
        <div className={`w-full font-sans text-slate-800 dark:text-slate-100 ${className}`}>
            {/* ── Enterprise Header (ArcGIS / Mapbox Style) ── */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[16px] p-4 shadow-xs mb-4">
                <div className="flex items-start justify-between flex-wrap gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                    <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                                <Compass className="size-3" />
                                GIS Linear Chainage Dashboard (STA)
                            </span>
                            <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400 flex items-center gap-1 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800">
                                <Navigation className="size-3 text-sky-500" />
                                Acuan Pembanding STA: Master Jalan Desa Utama
                            </span>
                        </div>
                        <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{ruas.nama}</span>
                            {ruas.desa && (
                                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                                    Desa {ruas.desa}{ruas.kecamatan ? `, Kec. ${ruas.kecamatan}` : ""}
                                </span>
                            )}
                        </h1>
                    </div>

                    {/* Mode Toggle Switcher (Timeline Mode vs Overlay Mode) */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold shadow-2xs">
                        <button
                            type="button"
                            onClick={() => setViewMode("timeline")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                                viewMode === "timeline"
                                    ? "bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs border border-slate-200 dark:border-slate-700 font-extrabold"
                                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            )}
                            title="Timeline Mode: One row per year with perfect vertical alignment using STA coordinates"
                        >
                            <Eye className="size-3.5" />
                            <span>Timeline Mode</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("overlay")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                                viewMode === "overlay"
                                    ? "bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs border border-slate-200 dark:border-slate-700 font-extrabold"
                                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            )}
                            title="Overlay Mode: Segments rendered on the same coordinate line, newer years stacked above older years"
                        >
                            <Layers className="size-3.5" />
                            <span>Overlay Mode</span>
                        </button>
                    </div>
                </div>

                {/* Construction Year Summary Chips & Tools */}
                <div className="pt-3 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        {years.map((y) => {
                            const c = getTahunColor(y);
                            const totalM = byYear[y]?.reduce((sum, s) => sum + (s.endM - s.startM), 0) || 0;
                            const pct = ((totalM / (ruas.panjangTotal || 1)) * 100).toFixed(1);
                            return (
                                <div
                                    key={y}
                                    className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-[11px]"
                                >
                                    <span
                                        className="w-2.5 h-2.5 rounded-full shrink-0 inline-block"
                                        style={{ backgroundColor: c.bg, border: `1.5px solid ${c.border}` }}
                                    />
                                    <span className="font-bold" style={{ color: c.text }}>{c.label}</span>
                                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                        {formatMeter(totalM)} ({pct}%)
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Toolbar Controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Filter by Year */}
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs">
                            <Filter className="size-3 text-slate-400" />
                            <select
                                value={selectedYearFilter}
                                onChange={(e) => setSelectedYearFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                                className="bg-transparent font-medium focus:outline-none cursor-pointer text-slate-700 dark:text-slate-200"
                            >
                                <option value="ALL">Semua Tahun</option>
                                {years.map((y) => (
                                    <option key={y} value={y}>Tahun {y}</option>
                                ))}
                            </select>
                        </div>

                        {/* Filter by Funding Source */}
                        {fundingSources.length > 0 && (
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs">
                                <DollarSign className="size-3 text-slate-400" />
                                <select
                                    value={selectedFundingFilter}
                                    onChange={(e) => setSelectedFundingFilter(e.target.value)}
                                    className="bg-transparent font-medium focus:outline-none cursor-pointer text-slate-700 dark:text-slate-200"
                                >
                                    <option value="ALL">Semua Sumber Dana</option>
                                    {fundingSources.map((f) => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Zoom Timeline Controls */}
                        <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
                            <button
                                type="button"
                                onClick={() => setZoomLevel((z) => Math.max(1, z - 0.25))}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 transition-colors"
                                title="Zoom Out Timeline"
                            >
                                <ZoomOut className="size-3.5" />
                            </button>
                            <span className="text-[10px] font-mono font-bold px-1.5 text-slate-500">
                                {zoomLevel.toFixed(1)}x
                            </span>
                            <button
                                type="button"
                                onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 transition-colors"
                                title="Zoom In Timeline"
                            >
                                <ZoomIn className="size-3.5" />
                            </button>
                            {zoomLevel !== 1 && (
                                <button
                                    type="button"
                                    onClick={() => setZoomLevel(1)}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 transition-colors"
                                    title="Reset Zoom"
                                >
                                    <RotateCcw className="size-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Export Report */}
                        <button
                            type="button"
                            onClick={handleExport}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                            title="Export Report"
                        >
                            <Download className="size-3.5" />
                            <span>Export Report</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Main Visualization Canvas (STA Horizontal Axis) ── */}
            <div
                ref={containerRef}
                className="relative w-full rounded-[16px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-x-auto shadow-sm transition-all"
            >
                <div
                    style={{ width: `${100 * zoomLevel}%`, height: totalCanvasHeight, minHeight: 180 }}
                    className="relative overflow-visible"
                >
                    {/* Y-axis Column (Timeline Mode: Year Labels, Overlay Mode: Single Track Header) */}
                    <div
                        className="absolute left-0 top-0 bottom-0 w-28 flex flex-col pointer-events-none z-10 bg-white/90 dark:bg-slate-950/90 border-r border-slate-200 dark:border-slate-800"
                        style={{ paddingTop: roadHeight + 4, paddingBottom: rulerHeight }}
                    >
                        {viewMode === "timeline" ? (
                            years.map((y) => {
                                const c = getTahunColor(y);
                                const totalM = byYear[y]?.reduce((sum, s) => sum + (s.endM - s.startM), 0) || 0;
                                const yearPct = ((totalM / (ruas.panjangTotal || 1)) * 100).toFixed(0);

                                return (
                                    <div
                                        key={y}
                                        className="shrink-0 flex items-center justify-end pr-3"
                                        style={{ height: rowHeight }}
                                    >
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-mono font-bold">
                                            <span style={{ color: c.border }}>{y}</span>
                                            <span className="text-slate-400 font-normal">:</span>
                                            <span className="font-extrabold" style={{ color: c.text }}>{yearPct}%</span>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="h-full flex items-center justify-end pr-3">
                                <div className="px-2 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-[10px] font-bold text-right font-mono">
                                    Overlay Track
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Dashed Vertical Grid Lines Every 100m */}
                    <div className="absolute left-28 right-4 top-0 bottom-0 pointer-events-none">
                        {hundredMeterTicks.map((m, i) => {
                            const pct = (m / (ruas.panjangTotal || 1)) * 100;
                            return (
                                <div
                                    key={i}
                                    className="absolute top-0 bottom-0 border-r border-dashed border-slate-200 dark:border-slate-800/80"
                                    style={{ left: `${pct}%` }}
                                />
                            );
                        })}
                    </div>

                    {/* Horizontal Chart Area */}
                    <div className="absolute left-28 right-4 top-0 bottom-0 flex flex-col overflow-visible">
                        {/* 1. TOP: Realistic Horizontal Road Axis Illustration */}
                        <div style={{ height: roadHeight }} className="relative shrink-0 border-b border-slate-200 dark:border-slate-800">
                            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2" style={{ height: 18 }}>
                                <div
                                    className="absolute inset-0 rounded-md"
                                    style={{
                                        background: "linear-gradient(to bottom, #475569, #1e293b, #0f172a)",
                                        boxShadow: "0 4px 12px -2px rgba(0,0,0,0.4)",
                                    }}
                                />
                                <div className="absolute inset-0 flex items-center">
                                    {Array.from({ length: 30 }).map((_, i) => (
                                        <div key={i} className="shrink-0" style={{ width: "2.5%", marginRight: "0.8%", height: 2 }}>
                                            <div style={{ width: "70%", height: "100%", backgroundColor: "#f8fafc", opacity: 0.6 }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 2. MIDDLE: Construction Rows (STA Absolute Positioning) */}
                        {viewMode === "timeline" ? (
                            /* Timeline Mode: Independent Row per Year */
                            years.map((y, yIdx) => {
                                const isBottomRow = yIdx === years.length - 1;
                                const rowSegs = byYear[y] || [];

                                return (
                                    <div
                                        key={y}
                                        className="relative shrink-0 w-full overflow-visible"
                                        style={{ height: rowHeight }}
                                    >
                                        <div
                                            className="absolute bottom-0 left-0 right-0"
                                            style={{ height: 1, backgroundColor: "rgba(148,163,184,0.15)" }}
                                        />

                                        {rowSegs.map((seg) => {
                                            const segColor = getTahunColor(seg.tahun);

                                            // STRICT POSITIONING FORMULAS:
                                            // left = (startM / Total_Road_Length) * 100%
                                            // width = ((endM - startM) / Total_Road_Length) * 100%
                                            const startPct = getLeftPct(seg.startM);
                                            const widthPct = getWidthPct(seg.startM, seg.endM);
                                            const lengthM = seg.endM - seg.startM;
                                            const isHovered = hoveredId === seg.id;
                                            const midPct = startPct + widthPct / 2;

                                            const staStartStr = seg.staAwalFormatted || formatSTA(seg.startM);
                                            const staEndStr = seg.staAkhirFormatted || formatSTA(seg.endM);

                                            let tooltipPosStyle: React.CSSProperties = { minWidth: 260 };
                                            if (isBottomRow) {
                                                tooltipPosStyle.bottom = "calc(100% + 8px)";
                                            } else {
                                                tooltipPosStyle.top = "calc(100% + 8px)";
                                            }

                                            if (midPct < 25) tooltipPosStyle.left = "0px";
                                            else if (midPct > 75) tooltipPosStyle.right = "0px";
                                            else {
                                                tooltipPosStyle.left = "50%";
                                                tooltipPosStyle.transform = "translateX(-50%)";
                                            }

                                            return (
                                                <div
                                                    key={seg.id}
                                                    className="absolute cursor-pointer transition-all duration-200"
                                                    style={{
                                                        left: `${startPct}%`,
                                                        width: `${widthPct}%`,
                                                        top: "50%",
                                                        transform: "translateY(-50%)",
                                                        height: isHovered ? 28 : 22,
                                                        zIndex: isHovered ? 100 : 10,
                                                    }}
                                                    onMouseEnter={() => setHoveredId(seg.id)}
                                                    onMouseLeave={() => setHoveredId(null)}
                                                    onClick={() => onSelectSegment?.(seg)}
                                                >
                                                    {/* Rounded Ends Segment Block */}
                                                    <div
                                                        className={cn(
                                                            "w-full h-full rounded-lg transition-all duration-200 flex items-center justify-center relative overflow-hidden border-solid opacity-100",
                                                            isHovered && "ring-4 " + segColor.ring
                                                        )}
                                                        style={{
                                                            backgroundColor: seg.kondisi
                                                                ? KONDISI_COLORS[seg.kondisi]?.color || segColor.bg
                                                                : segColor.bg,
                                                            border: `2px solid ${segColor.border}`,
                                                            boxShadow: isHovered
                                                                ? `0 10px 24px -2px ${segColor.border}90`
                                                                : `0 2px 8px -1px ${segColor.border}40`,
                                                        }}
                                                    >
                                                        {widthPct > 5 && (
                                                            <span
                                                                className="text-[9px] font-black font-mono truncate px-1 drop-shadow-xs text-white"
                                                            >
                                                                {widthPct.toFixed(1)}%
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Hover Tooltip (Active Segment Only) */}
                                                    {isHovered && (
                                                        <div
                                                            className="absolute z-[120] pointer-events-none drop-shadow-2xl animate-in fade-in zoom-in duration-150"
                                                            style={tooltipPosStyle}
                                                        >
                                                            <div className="bg-slate-950/95 text-white backdrop-blur-md rounded-2xl px-4 py-3.5 text-[10px] font-medium leading-relaxed border border-slate-700 shadow-2xl space-y-2">
                                                                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                                                                    <div className="font-black text-xs text-amber-400 truncate">
                                                                        {seg.nama}
                                                                    </div>
                                                                    <span
                                                                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0 font-mono shadow-xs"
                                                                        style={{ backgroundColor: segColor.border }}
                                                                    >
                                                                        TA {seg.tahun}
                                                                    </span>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-300">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <MapPin className="size-3 text-sky-400 shrink-0" />
                                                                        <span>STA Awal:</span>
                                                                    </div>
                                                                    <span className="font-bold text-white font-mono text-right">{staStartStr}</span>

                                                                    <div className="flex items-center gap-1.5">
                                                                        <MapPin className="size-3 text-sky-400 shrink-0" />
                                                                        <span>STA Akhir:</span>
                                                                    </div>
                                                                    <span className="font-bold text-white font-mono text-right">{staEndStr}</span>

                                                                    <div className="flex items-center gap-1.5">
                                                                        <LayersIcon className="size-3 text-emerald-400 shrink-0" />
                                                                        <span>Panjang & Persen:</span>
                                                                    </div>
                                                                    <span className="font-bold text-white font-mono text-right">
                                                                        {formatMeter(lengthM)} ({widthPct.toFixed(1)}%)
                                                                    </span>

                                                                    {seg.jenis && (
                                                                        <>
                                                                            <div className="flex items-center gap-1.5">
                                                                                <Wrench className="size-3 text-purple-400 shrink-0" />
                                                                                <span>Konstruksi:</span>
                                                                            </div>
                                                                            <span className="font-bold text-white text-right truncate">{seg.jenis}</span>
                                                                        </>
                                                                    )}

                                                                    {seg.anggaran && (
                                                                        <>
                                                                            <div className="flex items-center gap-1.5">
                                                                                <DollarSign className="size-3 text-amber-400 shrink-0" />
                                                                                <span>Anggaran:</span>
                                                                            </div>
                                                                            <span className="font-bold text-amber-300 font-mono text-right truncate">
                                                                                {formatRupiah(seg.anggaran)}
                                                                            </span>
                                                                        </>
                                                                    )}

                                                                    {seg.sumberDana && (
                                                                        <>
                                                                            <div className="flex items-center gap-1.5">
                                                                                <Calendar className="size-3 text-indigo-400 shrink-0" />
                                                                                <span>Sumber Dana:</span>
                                                                            </div>
                                                                            <span className="font-bold text-white text-right truncate">{seg.sumberDana}</span>
                                                                        </>
                                                                    )}
                                                                </div>

                                                                <div className="pt-1.5 border-t border-slate-800 text-[9px] text-slate-400 text-center flex items-center justify-center gap-1">
                                                                    <Info className="size-3 text-sky-400" />
                                                                    <span>Klik segmen untuk menyorot & zoom di peta GIS</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })
                        ) : (
                            /* Overlay Mode: Single Track with Stacked Semi-Transparent Overlapping Segments */
                            <div className="relative shrink-0 w-full overflow-visible flex-1 flex items-center">
                                {filteredSegmens
                                    .sort((a, b) => a.tahun - b.tahun) // Older years behind, newer years on top
                                    .map((seg) => {
                                        const segColor = getTahunColor(seg.tahun);
                                        const startPct = getLeftPct(seg.startM);
                                        const widthPct = getWidthPct(seg.startM, seg.endM);
                                        const lengthM = seg.endM - seg.startM;
                                        const isHovered = hoveredId === seg.id;
                                        const midPct = startPct + widthPct / 2;

                                        const staStartStr = seg.staAwalFormatted || formatSTA(seg.startM);
                                        const staEndStr = seg.staAkhirFormatted || formatSTA(seg.endM);

                                        let tooltipPosStyle: React.CSSProperties = { minWidth: 260, top: "calc(100% + 8px)" };
                                        if (midPct < 25) tooltipPosStyle.left = "0px";
                                        else if (midPct > 75) tooltipPosStyle.right = "0px";
                                        else {
                                            tooltipPosStyle.left = "50%";
                                            tooltipPosStyle.transform = "translateX(-50%)";
                                        }

                                        return (
                                            <div
                                                key={seg.id}
                                                className="absolute cursor-pointer transition-all duration-200"
                                                style={{
                                                    left: `${startPct}%`,
                                                    width: `${widthPct}%`,
                                                    top: "50%",
                                                    transform: "translateY(-50%)",
                                                    height: isHovered ? 32 : 24,
                                                    zIndex: isHovered ? 100 : seg.tahun,
                                                }}
                                                onMouseEnter={() => setHoveredId(seg.id)}
                                                onMouseLeave={() => setHoveredId(null)}
                                                onClick={() => onSelectSegment?.(seg)}
                                            >
                                                <div
                                                    className={cn(
                                                        "w-full h-full rounded-lg transition-all duration-200 flex items-center justify-center relative overflow-hidden",
                                                        isHovered && "ring-4 " + segColor.ring
                                                    )}
                                                    style={{
                                                        backgroundColor: segColor.hex + "cc", // Semi-transparent overlay color
                                                        border: `2px solid ${segColor.border}`,
                                                        boxShadow: isHovered ? `0 10px 24px -2px ${segColor.border}` : "0 2px 6px -1px rgba(0,0,0,0.3)",
                                                    }}
                                                >
                                                    <span className="text-[9px] font-black font-mono text-white drop-shadow-md">
                                                        TA {seg.tahun} ({widthPct.toFixed(1)}%)
                                                    </span>
                                                </div>

                                                {/* Hover Tooltip */}
                                                {isHovered && (
                                                    <div
                                                        className="absolute z-[120] pointer-events-none drop-shadow-2xl animate-in fade-in zoom-in duration-150"
                                                        style={tooltipPosStyle}
                                                    >
                                                        <div className="bg-slate-950/95 text-white backdrop-blur-md rounded-2xl px-4 py-3.5 text-[10px] font-medium leading-relaxed border border-slate-700 shadow-2xl space-y-2">
                                                            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                                                                <div className="font-black text-xs text-amber-400 truncate">
                                                                    {seg.nama}
                                                                </div>
                                                                <span
                                                                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0 font-mono shadow-xs"
                                                                    style={{ backgroundColor: segColor.border }}
                                                                >
                                                                    TA {seg.tahun}
                                                                </span>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-300">
                                                                <div className="flex items-center gap-1.5">
                                                                    <MapPin className="size-3 text-sky-400 shrink-0" />
                                                                    <span>STA Awal:</span>
                                                                </div>
                                                                <span className="font-bold text-white font-mono text-right">{staStartStr}</span>

                                                                <div className="flex items-center gap-1.5">
                                                                    <MapPin className="size-3 text-sky-400 shrink-0" />
                                                                    <span>STA Akhir:</span>
                                                                </div>
                                                                <span className="font-bold text-white font-mono text-right">{staEndStr}</span>

                                                                <div className="flex items-center gap-1.5">
                                                                    <LayersIcon className="size-3 text-emerald-400 shrink-0" />
                                                                    <span>Panjang & Persen:</span>
                                                                </div>
                                                                <span className="font-bold text-white font-mono text-right">
                                                                    {formatMeter(lengthM)} ({widthPct.toFixed(1)}%)
                                                                </span>

                                                                {seg.anggaran && (
                                                                    <>
                                                                        <div className="flex items-center gap-1.5">
                                                                            <DollarSign className="size-3 text-amber-400 shrink-0" />
                                                                            <span>Anggaran:</span>
                                                                        </div>
                                                                        <span className="font-bold text-amber-300 font-mono text-right truncate">
                                                                            {formatRupiah(seg.anggaran)}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        )}

                        {/* 3. BOTTOM: Sticky Horizontal STA Scale Ruler Header (100m Ticks) */}
                        <div
                            className="relative shrink-0 w-full border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"
                            style={{ height: rulerHeight }}
                        >
                            {hundredMeterTicks.map((m, i) => {
                                const pct = (m / (ruas.panjangTotal || 1)) * 100;
                                return (
                                    <div
                                        key={i}
                                        className="absolute top-0 bottom-0 flex flex-col items-center justify-center"
                                        style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
                                    >
                                        <div className="w-[1px] h-2 bg-slate-300 dark:bg-slate-700 mb-0.5" />
                                        <span className="text-[9px] font-bold font-mono text-slate-700 dark:text-slate-300">
                                            {formatSTA(m)}
                                        </span>
                                        <span className="text-[7.5px] font-mono text-slate-400">
                                            {pct.toFixed(0)}%
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Bottom Section: Mini Overview Navigator & Completion Progress Bar ── */}
            <div className="mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[16px] p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-500" />
                        <span>OVERALL ROAD COMPLETION PROGRESS</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                        <span className="text-slate-500 dark:text-slate-400 font-normal">
                            {formatMeter((overallCompletionPct / 100) * ruas.panjangTotal)} / {formatMeter(ruas.panjangTotal)}
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                            {overallCompletionPct.toFixed(1)}% Completed
                        </span>
                    </div>
                </div>

                {/* Progress Track */}
                <div className="relative w-full h-4 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-inner">
                    <div
                        className="h-full bg-gradient-to-r from-orange-500 via-emerald-500 via-sky-500 via-purple-500 to-emerald-400 transition-all duration-500 rounded-full"
                        style={{ width: `${overallCompletionPct}%` }}
                    />
                </div>

                {/* Mini Overview Navigator Track */}
                <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>{formatSTA(0)}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">Mini Overview Navigator ({formatMeter(ruas.panjangTotal)})</span>
                    <span>{formatSTA(ruas.panjangTotal)}</span>
                </div>
            </div>
        </div>
    );
}
