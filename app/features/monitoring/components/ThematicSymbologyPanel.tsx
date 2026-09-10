import React, { useState, useEffect, useMemo } from "react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Slider } from "~/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import {
    Palette,
    RotateCcw,
    Sparkles,
    Check,
    Layers,
    Sliders,
    Eye,
    EyeOff,
    CheckCircle2,
    Clock,
    AlertCircle,
    FileEdit,
    XCircle,
    Info,
    HelpCircle
} from "lucide-react";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

export type SymbologyMode = "kondisi" | "status_verifikasi" | "jenis_perkerasan" | "status_jalan";

export interface StyleRule {
    color: string;
    width: number;
    lineDash?: "solid" | "dashed" | "dotted" | number[];
    visible?: boolean;
    label: string;
    description?: string;
    badgeColor?: string;
}

export interface PresetPalette {
    id: string;
    name: string;
    description: string;
    styles: Record<string, Partial<StyleRule>>;
}

// Default standard styles per mode
export const DEFAULT_THEMATIC_STYLES: Record<SymbologyMode, Record<string, StyleRule>> = {
    kondisi: {
        jalan_desa_baik: { color: "#22c55e", width: 5, lineDash: "solid", visible: true, label: "Kondisi Baik (Poros)", description: "Ruas poros jalan desa kondisi mantap", badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
        jalan_desa_sedang: { color: "#f59e0b", width: 5, lineDash: "solid", visible: true, label: "Kondisi Sedang (Poros)", description: "Ruas poros jalan desa perlu pemeliharaan berkala", badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
        jalan_desa_rusak: { color: "#ef4444", width: 5, lineDash: "solid", visible: true, label: "Kondisi Rusak (Poros)", description: "Ruas poros jalan desa rusak berat", badgeColor: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
        jalan_lingkungan_baik: { color: "#22c55e", width: 4, lineDash: "dashed", visible: true, label: "Kondisi Baik (Lingkungan)", description: "Jalan lingkungan non-poros kondisi baik", badgeColor: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" },
        jalan_lingkungan_sedang: { color: "#f59e0b", width: 4, lineDash: "dashed", visible: true, label: "Kondisi Sedang (Lingkungan)", description: "Jalan lingkungan non-poros kondisi sedang", badgeColor: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400" },
        jalan_lingkungan_rusak: { color: "#ef4444", width: 4, lineDash: "dashed", visible: true, label: "Kondisi Rusak (Lingkungan)", description: "Jalan lingkungan non-poros rusak", badgeColor: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400" },
        jalan_kabupaten_baik: { color: "#2563eb", width: 5, lineDash: "solid", visible: true, label: "Jalan Kabupaten (Baik)", description: "Ruas kewenangan Kabupaten", badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
        jalan_kabupaten_rusak: { color: "#60a5fa", width: 5, lineDash: "dashed", visible: true, label: "Jalan Kabupaten (Rusak)", description: "Ruas Kabupaten kondisi rusak", badgeColor: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400" },
        batas_desa: { color: "#f97316", width: 2, lineDash: "dashed", visible: true, label: "Batas Desa", description: "Batas administrasi wilayah desa", badgeColor: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
        jalan_utama: { color: "#f97316", width: 2, lineDash: "solid", visible: true, label: "Jalan Utama / Arteri", description: "Jalan utama penghubung antar kawasan", badgeColor: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" }
    },
    status_verifikasi: {
        verif_approved: { color: "#10b981", width: 5, lineDash: "solid", visible: true, label: "Disetujui / Terverifikasi", description: "Data telah divalidasi Bappeda / Tim Teknis", badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
        verif_submitted: { color: "#3b82f6", width: 5, lineDash: "solid", visible: true, label: "Diajukan (Proses Review)", description: "Usulan/realisasi sedang dalam evaluasi", badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
        verif_draft: { color: "#94a3b8", width: 4, lineDash: "dashed", visible: true, label: "Draft Operator Desa", description: "Masih dalam tahap input data awal", badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
        verif_revision: { color: "#f43f5e", width: 5, lineDash: "solid", visible: true, label: "Perlu Revisi / Catatan", description: "Terdapat catatan perbaikan dari verifikator", badgeColor: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
        batas_desa: { color: "#f97316", width: 2, lineDash: "dashed", visible: true, label: "Batas Desa", description: "Batas administrasi wilayah desa", badgeColor: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
        jalan_utama: { color: "#f97316", width: 2, lineDash: "solid", visible: true, label: "Jalan Utama / Arteri", description: "Jalan utama penghubung antar kawasan", badgeColor: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" }
    },
    jenis_perkerasan: {
        perkerasan_aspal: { color: "#0f172a", width: 5, lineDash: "solid", visible: true, label: "Hotmix / Aspal", description: "Perkerasan aspal / lapen", badgeColor: "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" },
        perkerasan_beton: { color: "#0284c7", width: 5, lineDash: "solid", visible: true, label: "Rabat Beton / Rigid", description: "Konstruksi cor semen / rigid pavement", badgeColor: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
        perkerasan_paving: { color: "#d97706", width: 5, lineDash: "solid", visible: true, label: "Paving Block", description: "Perkerasan conblock / interlock", badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
        perkerasan_tanah: { color: "#854d0e", width: 4, lineDash: "dashed", visible: true, label: "Agregat / Makadam / Tanah", description: "Jalan belum diperkeras permanen", badgeColor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-400" },
        batas_desa: { color: "#f97316", width: 2, lineDash: "dashed", visible: true, label: "Batas Desa", description: "Batas administrasi wilayah desa", badgeColor: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
        jalan_utama: { color: "#f97316", width: 2, lineDash: "solid", visible: true, label: "Jalan Utama / Arteri", description: "Jalan utama penghubung antar kawasan", badgeColor: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" }
    },
    status_jalan: {
        hirarki_poros: { color: "#4f46e5", width: 6, lineDash: "solid", visible: true, label: "Jalan Poros Desa (Utama)", description: "Akses utama penghubung antar desa", badgeColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
        hirarki_lingkungan: { color: "#06b6d4", width: 4, lineDash: "solid", visible: true, label: "Jalan Lingkungan / Gang", description: "Akses pemukiman warga desa", badgeColor: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300" },
        hirarki_kabupaten: { color: "#9333ea", width: 6, lineDash: "solid", visible: true, label: "Jalan Kabupaten", description: "Kewenangan Pemerintah Daerah Kabupaten", badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
        batas_desa: { color: "#f97316", width: 2, lineDash: "dashed", visible: true, label: "Batas Desa", description: "Batas administrasi wilayah desa", badgeColor: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
        jalan_utama: { color: "#f97316", width: 2, lineDash: "solid", visible: true, label: "Jalan Utama / Arteri", description: "Jalan utama penghubung antar kawasan", badgeColor: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" }
    }
};

// Preset palette styles for quick 1-click apply
export const PRESET_PALETTES: PresetPalette[] = [
    {
        id: "standar_bappeda",
        name: "Standar Melarosa Bappeda",
        description: "Warna standar resmi Pemkab Bojonegoro (Hijau - Kuning - Merah)",
        styles: {
            jalan_desa_baik: { color: "#22c55e", width: 5 },
            jalan_desa_sedang: { color: "#f59e0b", width: 5 },
            jalan_desa_rusak: { color: "#ef4444", width: 5 }
        }
    },
    {
        id: "kontras_tinggi",
        name: "Kontras Tinggi (Aksesibilitas)",
        description: "Palet ramah buta warna dan mudah dibedakan di lapangan",
        styles: {
            jalan_desa_baik: { color: "#059669", width: 6 },
            jalan_desa_sedang: { color: "#d97706", width: 6 },
            jalan_desa_rusak: { color: "#dc2626", width: 6 }
        }
    },
    {
        id: "neon_dark",
        name: "Neon Cyber (Dark Basemap)",
        description: "Warna terang menyala kontras tinggi untuk basemap gelap",
        styles: {
            jalan_desa_baik: { color: "#10b981", width: 5 },
            jalan_desa_sedang: { color: "#facc15", width: 5 },
            jalan_desa_rusak: { color: "#f43f5e", width: 5 }
        }
    },
    {
        id: "pastel_soft",
        name: "Pastel Elegan (Laporan / PDF)",
        description: "Nuansa warna lembut dan bersih untuk kebutuhan cetak laporan",
        styles: {
            jalan_desa_baik: { color: "#34d399", width: 4 },
            jalan_desa_sedang: { color: "#fbbf24", width: 4 },
            jalan_desa_rusak: { color: "#fb7185", width: 4 }
        }
    }
];

interface ThematicSymbologyPanelProps {
    onClose?: () => void;
}

export function ThematicSymbologyPanel({ onClose }: ThematicSymbologyPanelProps) {
    // Current Active Symbology Mode (Stored in localStorage)
    const [currentMode, setCurrentMode] = useState<SymbologyMode>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("gigis_symbology_mode") as SymbologyMode;
            if (saved && DEFAULT_THEMATIC_STYLES[saved]) return saved;
        }
        return "kondisi";
    });

    // Custom styles dictionary (Merged from defaults and localStorage)
    const [styles, setStyles] = useState<Record<string, StyleRule>>(() => {
        if (typeof window !== "undefined") {
            try {
                const stored = localStorage.getItem("gigis_custom_vector_styles");
                if (stored) {
                    const parsed = JSON.parse(stored);
                    return { ...DEFAULT_THEMATIC_STYLES.kondisi, ...parsed };
                }
            } catch (e) { }
        }
        return DEFAULT_THEMATIC_STYLES.kondisi;
    });

    // Active Category Filter/Search
    const [filterCategory, setFilterCategory] = useState<string>("");

    // Save styles to localStorage and dispatch event for real-time map redraw
    const persistAndNotify = (nextStyles: Record<string, StyleRule>, mode?: SymbologyMode) => {
        try {
            localStorage.setItem("gigis_custom_vector_styles", JSON.stringify(nextStyles));
            if (mode) {
                localStorage.setItem("gigis_symbology_mode", mode);
            }
            window.dispatchEvent(new Event("MELAROSA-vector-styles-changed"));
        } catch (e) {
            console.error("Gagal menyimpan gaya simbologi:", e);
        }
    };

    // Switch Symbology Mode
    const handleModeChange = (newMode: SymbologyMode) => {
        setCurrentMode(newMode);
        const modeDefaults = DEFAULT_THEMATIC_STYLES[newMode];
        setStyles(prev => {
            const updated = { ...prev, ...modeDefaults };
            persistAndNotify(updated, newMode);
            return updated;
        });
        toast.success(`Mode Simbologi diubah: ${getModeLabel(newMode)}`);
    };

    // Update single style rule
    const updateRule = (key: string, field: keyof StyleRule, value: any) => {
        setStyles(prev => {
            const currentRule = prev[key] || DEFAULT_THEMATIC_STYLES[currentMode][key] || {
                color: "#22c55e",
                width: 5,
                lineDash: "solid",
                visible: true,
                label: key
            };
            const updated = {
                ...prev,
                [key]: {
                    ...currentRule,
                    [field]: value
                }
            };
            persistAndNotify(updated);
            return updated;
        });
    };

    // Toggle layer visibility for category isolation
    const toggleRuleVisibility = (key: string) => {
        const currentRule = styles[key] || DEFAULT_THEMATIC_STYLES[currentMode][key];
        const nextVisible = currentRule?.visible !== false ? false : true;
        updateRule(key, "visible", nextVisible);
        toast(nextVisible ? `Kategori ${currentRule?.label} ditampilkan` : `Kategori ${currentRule?.label} disembunyikan`);
    };

    // Apply 1-Click Preset Palette
    const applyPreset = (preset: PresetPalette) => {
        setStyles(prev => {
            const updated = { ...prev };
            Object.entries(preset.styles).forEach(([key, val]) => {
                if (updated[key]) {
                    updated[key] = { ...updated[key], ...val };
                } else if (DEFAULT_THEMATIC_STYLES[currentMode][key]) {
                    updated[key] = { ...DEFAULT_THEMATIC_STYLES[currentMode][key], ...val };
                }
            });
            persistAndNotify(updated);
            return updated;
        });
        toast.success(`Palet "${preset.name}" berhasil diterapkan!`);
    };

    // Reset to defaults
    const handleReset = () => {
        const modeDefaults = DEFAULT_THEMATIC_STYLES[currentMode];
        setStyles(prev => {
            const updated = { ...prev, ...modeDefaults };
            persistAndNotify(updated);
            return updated;
        });
        toast.success("Simbologi dikembalikan ke standar awal");
    };

    // Active rules to display for the current mode
    const currentRules = useMemo(() => {
        const modeBase = DEFAULT_THEMATIC_STYLES[currentMode];
        return Object.keys(modeBase).map(key => {
            const rule = styles[key] || modeBase[key];
            return { key, ...rule };
        });
    }, [currentMode, styles]);

    function getModeLabel(mode: SymbologyMode) {
        switch (mode) {
            case "kondisi": return "Kondisi Fisik Ruas";
            case "status_verifikasi": return "Status Progres Verifikasi";
            case "jenis_perkerasan": return "Jenis Konstruksi / Perkerasan";
            case "status_jalan": return "Hirarki Status Jalan";
        }
    }

    // Render stroke preview swatch
    const renderStrokeSwatch = (rule: StyleRule) => {
        const isDashed = rule.lineDash === "dashed" || (Array.isArray(rule.lineDash) && rule.lineDash.length > 0);
        return (
            <div className="flex items-center gap-1 w-16 shrink-0">
                <svg className="w-full h-3 overflow-visible">
                    <line
                        x1="0"
                        y1="6"
                        x2="60"
                        y2="6"
                        stroke={rule.color}
                        strokeWidth={Math.min(Math.max(rule.width, 2), 7)}
                        strokeDasharray={isDashed ? "5 4" : undefined}
                        strokeLinecap="round"
                    />
                </svg>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-background select-none">
            {/* Header: Mode & Title */}
            <div className="p-3.5 border-b border-border bg-muted/20 flex flex-col gap-2.5 shrink-0">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Palette className="h-4 w-4" />
                        </div>
                        <div>
                            <span className="text-[10.5px] font-extrabold text-foreground uppercase tracking-wider block leading-none">
                                Simbologi & Legenda Tematik
                            </span>
                            <p className="text-[9.5px] text-muted-foreground mt-0.5">
                                Kustomisasi gaya garis dan visualisasi data peta
                            </p>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        className="h-7 px-2 text-[9.5px] font-bold rounded-xl gap-1 bg-background border-border text-foreground hover:bg-muted shrink-0 shadow-sm cursor-pointer"
                        title="Kembalikan semua gaya ke standar"
                    >
                        <RotateCcw className="h-3 w-3 text-muted-foreground" />
                        <span>Reset</span>
                    </Button>
                </div>

                {/* Thematic Mode Selector Pill Buttons */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/50 rounded-xl border border-border">
                    <button
                        type="button"
                        onClick={() => handleModeChange("kondisi")}
                        className={cn(
                            "px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all text-left flex items-center gap-1.5 cursor-pointer",
                            currentMode === "kondisi"
                                ? "bg-background text-indigo-600 dark:text-indigo-400 shadow-sm border border-border"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="truncate">Kondisi Fisik</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleModeChange("status_verifikasi")}
                        className={cn(
                            "px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all text-left flex items-center gap-1.5 cursor-pointer",
                            currentMode === "status_verifikasi"
                                ? "bg-background text-indigo-600 dark:text-indigo-400 shadow-sm border border-border"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                        <span className="truncate">Status Verifikasi</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleModeChange("jenis_perkerasan")}
                        className={cn(
                            "px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all text-left flex items-center gap-1.5 cursor-pointer",
                            currentMode === "jenis_perkerasan"
                                ? "bg-background text-indigo-600 dark:text-indigo-400 shadow-sm border border-border"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                        <span className="truncate">Jenis Perkerasan</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleModeChange("status_jalan")}
                        className={cn(
                            "px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all text-left flex items-center gap-1.5 cursor-pointer",
                            currentMode === "status_jalan"
                                ? "bg-background text-indigo-600 dark:text-indigo-400 shadow-sm border border-border"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" />
                        <span className="truncate">Hirarki Jalan</span>
                    </button>
                </div>
            </div>

            {/* Main Content: Preset Palettes & Style Rules */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {/* 1-Click Preset Palettes Carousel / Badges */}
                <div className="space-y-1.5">
                    <span className="text-[9.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">
                        Preset Palet Cepat
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                        {PRESET_PALETTES.map((preset) => (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => applyPreset(preset)}
                                className="p-2 rounded-xl border border-border bg-card hover:bg-muted/40 hover:border-indigo-400/50 transition-all text-left group flex flex-col gap-1 cursor-pointer shadow-sm"
                            >
                                <span className="text-[10px] font-bold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate block">
                                    {preset.name}
                                </span>
                                <div className="flex items-center gap-1">
                                    {Object.values(preset.styles).slice(0, 3).map((s, idx) => (
                                        <span
                                            key={idx}
                                            className="h-2 w-5 rounded-full border border-black/10 dark:border-white/10"
                                            style={{ backgroundColor: s.color }}
                                        />
                                    ))}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Active Rules List */}
                <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">
                            Aturan Visual Segmen ({currentRules.length})
                        </span>
                        <span className="text-[9px] text-muted-foreground italic">Klik ikon mata untuk isolasi layer</span>
                    </div>

                    <div className="space-y-2">
                        {currentRules.map((rule) => {
                            const isVisible = rule.visible !== false;

                            return (
                                <div
                                    key={rule.key}
                                    className={cn(
                                        "p-2.5 rounded-2xl border transition-all duration-200 shadow-sm flex flex-col gap-2",
                                        isVisible
                                            ? "bg-card border-border hover:border-border/80"
                                            : "bg-muted/20 border-dashed border-border opacity-60"
                                    )}
                                >
                                    {/* Row 1: Swatch, Label, and Action Toggles */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            {/* Visibility Toggle Button */}
                                            <button
                                                type="button"
                                                onClick={() => toggleRuleVisibility(rule.key)}
                                                className={cn(
                                                    "h-6 w-6 rounded-lg flex items-center justify-center transition-colors shrink-0 cursor-pointer",
                                                    isVisible
                                                        ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-300"
                                                        : "text-muted-foreground hover:bg-muted"
                                                )}
                                                title={isVisible ? "Sembunyikan dari peta" : "Tampilkan di peta"}
                                            >
                                                {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                                            </button>

                                            {/* Line Swatch Preview */}
                                            {renderStrokeSwatch(rule)}

                                            {/* Rule Name */}
                                            <div className="min-w-0 flex-1">
                                                <h5 className="text-[11px] font-bold text-foreground truncate leading-tight">
                                                    {rule.label}
                                                </h5>
                                                {rule.description && (
                                                    <p className="text-[9px] text-muted-foreground truncate leading-tight mt-0.5">
                                                        {rule.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Color Picker Native Popup */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            <label
                                                className="h-6 w-6 rounded-lg border border-border shadow-inner cursor-pointer flex items-center justify-center overflow-hidden transition-transform hover:scale-105"
                                                style={{ backgroundColor: rule.color }}
                                                title="Pilih Warna Garis"
                                            >
                                                <input
                                                    type="color"
                                                    value={rule.color}
                                                    onChange={(e) => updateRule(rule.key, "color", e.target.value)}
                                                    className="opacity-0 w-0 h-0 cursor-pointer"
                                                />
                                            </label>
                                        </div>
                                    </div>

                                    {/* Row 2: Width Slider & Style Controls */}
                                    <div className="pt-1.5 border-t border-border flex items-center gap-2.5">
                                        <span className="text-[8.5px] font-bold text-muted-foreground uppercase tracking-tight w-12 shrink-0">
                                            Tebal: {rule.width}px
                                        </span>

                                        <Slider
                                            value={[rule.width]}
                                            onValueChange={(val) => updateRule(rule.key, "width", val[0])}
                                            max={12}
                                            min={1}
                                            step={1}
                                            className="flex-1"
                                        />

                                        {/* Line Type Toggle (Solid / Dashed) */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => updateRule(rule.key, "lineDash", "solid")}
                                                className={cn(
                                                    "px-1.5 py-0.5 text-[8.5px] font-bold rounded uppercase transition-colors cursor-pointer",
                                                    rule.lineDash === "solid" || !rule.lineDash
                                                        ? "bg-indigo-600 text-white"
                                                        : "bg-muted text-muted-foreground hover:text-foreground"
                                                )}
                                                title="Garis Solid"
                                            >
                                                ━━
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateRule(rule.key, "lineDash", "dashed")}
                                                className={cn(
                                                    "px-1.5 py-0.5 text-[8.5px] font-bold rounded uppercase transition-colors cursor-pointer",
                                                    rule.lineDash === "dashed" || (Array.isArray(rule.lineDash) && rule.lineDash.length > 0)
                                                        ? "bg-indigo-600 text-white"
                                                        : "bg-muted text-muted-foreground hover:text-foreground"
                                                )}
                                                title="Garis Putus-putus"
                                            >
                                                ╍╍
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
