import React, { useState } from "react";
import {
    Plus,
    Trash2,
    AlertCircle,

    Save,
    Play,
    Database,
    Sparkles,
    MapPin as PinIcon,
    Anchor,
    RefreshCw,
    Edit3,
    FileEdit,
    MousePointer2,
    Route,
    Loader2,
    Check,
    ChevronsUpDown,
    Printer,
    Maximize2,
    Search,
    ChevronDown,
    ChevronLeft,
    Crosshair,
    Map,
    Compass,
    MapPin,
    X,
    Layers,
    Lock,
    Scissors,
    Square,
    Pentagon,
    Send,
    RotateCcw,
    CheckCircle2,
    Clock,
    AlertTriangle,
    XCircle,
    PanelLeftClose,
    Table2,
    Calendar,
    Activity,
    Building2,
    ShieldCheck,
    BarChart3,
    Construction,
    ArrowUpCircle,
    Home
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import { laporanService } from "~/features/laporan/services/laporan.service";
import type { RekapDibangun } from "~/features/laporan/types/laporan.types";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { canDigitize, isReadOnlyRole } from "~/utils/permissions";
import { tryParseCoordinate, parseMultiCoordinates } from "~/utils/coordinateParser";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Checkbox } from "~/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "~/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "~/components/ui/popover";
import {
    Command,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
} from "~/components/ui/command";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import type { RealisasiSegmen } from "~/routes/monitoring/realisasi-infrastruktur";
import type { StatusVerifikasi } from "~/routes/monitoring/realisasi-infrastruktur/types";
import { useAuth } from "~/contexts/auth-context";
import { useInfrastrukturTipe } from "~/features/monitoring/hooks/useInfrastrukturTipe";
import { InfrastrukturCardSelector } from "./InfrastrukturCardSelector";
import type { RealisasiEntry } from "~/features/monitoring/services/realisasi.service";
import { monitoringService } from "~/features/monitoring/services/monitoring.service";
import { monitoringLaporanService } from "~/features/monitoring/services/monitoring_laporan.service";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger
} from "~/components/ui/tooltip";

export interface InfrastrukturPanelProps {
    tipes?: any[];
    activeTipe?: any | null;
    setActiveTipe?: (tipe: any) => void;

    selectedKec: string;
    setSelectedKec: (val: string) => void;
    selectedDesa: string;
    setSelectedDesa: (val: string) => void;

    kecamatanList: { id: string; nama_kecamatan: string }[];
    desaList: { id: string; nama_desa: string }[];
    realisasiList: RealisasiSegmen[];

    onSearchCoordinates: (lat: number, lng: number) => void;
    onSearchMultiCoordinates: (points: { lat: number; lng: number }[]) => void;
    onClearSearchPin: () => void;
    hasSearchPin: boolean;

    isFormOpen: boolean;
    setIsFormOpen: (val: boolean) => void;
    digitizeMode: "manual" | "otomatis" | "dimensions" | "select";
    setDigitizeMode: (val: "manual" | "otomatis" | "dimensions" | "select") => void;
    tipeJalanDigitasi: "poros" | "lingkungan";
    setTipeJalanDigitasi: (val: "poros" | "lingkungan") => void;
    isDrawing: boolean;
    isReshaping: boolean;
    drawnLength: number;
    coordsCount: number;

    isSnappingEnabled: boolean;
    setIsSnappingEnabled: (val: boolean) => void;

    customRoadName: string;
    setCustomRoadName: (val: string) => void;

    lebar: string;
    setLebar: (val: string) => void;
    tahun: string;
    setTahun: (val: string) => void;
    perkerasan: string;
    setPerkerasan: (val: string) => void;
    kondisi: string;
    setKondisi: (val: string) => void;

    errorMsg: string;

    checkMelarosa: boolean;
    snappedRoad: { id: string; nama: string } | null;
    snappedCandidates: { id: string; nama: string }[];
    selectedSnappedRoadId: string;
    isAttributeDialogOpen?: boolean;

    handleSave: (e?: React.FormEvent) => void;
    closeForm: () => void;
    startDraw: () => void;
    startAutoTraceMode: () => void;
    enterReshapeMode: () => void;
    handleRedraw: () => void;
    handleSelectAlternativeRoad: (val: string) => void;
    zoomToSegment: (id: string) => void;
    handleEditGeometryAndAttributes: (segment: RealisasiSegmen) => void;
    handleEditAttributesOnly: (segment: RealisasiSegmen) => void;
    handleDelete: (id: string) => void;
    onHoverSegment: (id: string | null) => void;
    handleSplitSegmen?: (segment: RealisasiSegmen) => void;
    onKirimDigitasi?: (segment: RealisasiSegmen) => void;

    isLoading: boolean;
    editingSegmentId: string | null;
    onPrintBeritaAcara: (desaId: string, tahun: string) => Promise<void> | void;
    selectedTahunFilter: string;
    setSelectedTahunFilter: (val: string) => void;
    onZoomToFiltered: () => void;
    onRefreshSegments?: () => void;
    realisasiEntries?: RealisasiEntry[];
    selectedRealisasiEntryId?: string;
    onSelectRealisasiEntry?: (id: string) => void;
    onSaveClick?: () => void;
    className?: string;
    drawnCoords?: number[][];
    isYearLocked?: boolean;
    activeSnapshotLaporan?: any;
    inputPanjang?: number;
    setInputPanjang?: (val: number) => void;
    inputLebar?: number;
    setInputLebar?: (val: number) => void;
    handleGenerateDimensionArea?: (panjangM: number, lebarM: number) => void;
    lockedSegmenIds?: Set<string>;
    onToggleSidebar?: () => void;
    onSubmitLaporanRevisi?: () => void;
    onOpenBottomPanel?: () => void;
}

const getKondisiBadge = (kondisi: string) => {
    switch (kondisi) {
        case "BAIK":
            return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
        case "SEDANG":
            return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
        case "RUSAK_RINGAN":
            return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
        case "RUSAK_BERAT":
            return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
        default:
            return "bg-slate-500/10 text-slate-600 border-slate-500/20";
    }
};

const getStatusJalanBadge = (status: string | undefined) => {
    switch (status?.toUpperCase()) {
        case "MANTAP":
            return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
        case "TIDAK MANTAP":
            return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
        default:
            return "bg-slate-500/10 text-slate-500 border-slate-500/20";
    }
};

export const InfrastrukturPanel: React.FC<InfrastrukturPanelProps> = ({
    tipes: propsTipes,
    activeTipe: propsActiveTipe,
    setActiveTipe: propsSetActiveTipe,
    selectedKec,
    setSelectedKec,
    selectedDesa,
    setSelectedDesa,
    kecamatanList,
    desaList,
    onSearchCoordinates,
    onSearchMultiCoordinates,
    onClearSearchPin,
    hasSearchPin,
    realisasiList,
    isFormOpen,
    setIsFormOpen,
    digitizeMode,
    setDigitizeMode,
    tipeJalanDigitasi,
    setTipeJalanDigitasi,
    isDrawing,
    isReshaping,
    drawnLength,
    coordsCount,
    isSnappingEnabled,
    setIsSnappingEnabled,
    customRoadName,
    setCustomRoadName,
    lebar,
    setLebar,
    tahun,
    setTahun,
    perkerasan,
    setPerkerasan,
    kondisi,
    setKondisi,
    errorMsg,
    checkMelarosa,
    snappedRoad,
    snappedCandidates,
    selectedSnappedRoadId,
    isAttributeDialogOpen = false,
    handleSave,
    closeForm,
    startDraw,
    startAutoTraceMode,
    enterReshapeMode,
    handleRedraw,
    handleSelectAlternativeRoad,
    zoomToSegment,
    handleEditGeometryAndAttributes,
    handleEditAttributesOnly,
    handleDelete,
    onHoverSegment,
    handleSplitSegmen,
    onKirimDigitasi,
    isLoading,
    editingSegmentId,
    onPrintBeritaAcara,
    selectedTahunFilter,
    setSelectedTahunFilter,
    onZoomToFiltered,
    onRefreshSegments,
    realisasiEntries = [],
    selectedRealisasiEntryId = "",
    onSelectRealisasiEntry,
    onSaveClick,
    className,
    drawnCoords = [],
    isYearLocked = false,
    activeSnapshotLaporan = null,
    inputPanjang = 0,
    setInputPanjang,
    inputLebar = 0,
    setInputLebar,
    handleGenerateDimensionArea,
    lockedSegmenIds = new Set(),
    onToggleSidebar,
    onSubmitLaporanRevisi,
    onOpenBottomPanel,
}) => {
    const { user } = useAuth();
    const hookState = useInfrastrukturTipe();
    const tipes = propsTipes || hookState.tipes;
    const activeTipe = propsActiveTipe !== undefined ? propsActiveTipe : hookState.activeTipe;
    const setActiveTipe = propsSetActiveTipe || hookState.setActiveTipe;

    // Helper: Determine if a specific segment ID is locked
    const isSegmentLocked = (segmentId: string, segmentStatus?: string) => {
        if (activeSnapshotLaporan && (activeSnapshotLaporan.status === 'Draft' || activeSnapshotLaporan.status === 'Revisi')) {
            return false;
        }
        if (isYearLocked || (lockedSegmenIds && lockedSegmenIds.has(segmentId.toString()))) {
            return true;
        }
        if (segmentStatus === 'verifikasi_bappeda' || segmentStatus === 'terverifikasi') {
            return true;
        }
        return false;
    };

    const [searchQuery, setSearchQuery] = React.useState("");
    const [suggestions, setSuggestions] = React.useState<any[]>([]);
    const [isSearching, setIsSearching] = React.useState(false);
    const [isCoordSearchOpen, setIsCoordSearchOpen] = React.useState(false);

    // Coordinate search forms states
    const [coordInput, setCoordInput] = React.useState("");
    const [parsedCoordCount, setParsedCoordCount] = React.useState(0);

    // State for Bappeda Kembalikan Segmen ke Kecamatan Dialog
    const [kembalikanSegmenData, setKembalikanSegmenData] = React.useState<RealisasiSegmen | null>(null);
    const [catatanVerifikasiInput, setCatatanVerifikasiInput] = React.useState("");
    const [isVerifikasiSubmitting, setIsVerifikasiSubmitting] = React.useState(false);

    // State for verifikasi status filter
    const [filterVerifikasi, setFilterVerifikasi] = React.useState<string>("all");


    const handleAddressSearch = async () => {
        if (!searchQuery.trim()) return;

        // Try parsing input as coordinate first
        const parsed = tryParseCoordinate(searchQuery.trim());
        if (parsed) {
            onSearchCoordinates(parsed.lat, parsed.lng);
            toast.info(`📍 Koordinat ditemukan: ${parsed.lat.toFixed(6)}, ${parsed.lng.toFixed(6)}`);
            setSuggestions([]);
            return;
        }

        setIsSearching(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
            );
            const data = await res.json();
            setSuggestions(data);
            if (data.length === 0) {
                toast.info("Alamat/lokasi tidak ditemukan.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Gagal melakukan pencarian lokasi.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectSuggestion = (item: any) => {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        onSearchCoordinates(lat, lng);
        setSearchQuery(item.display_name);
        setSuggestions([]);
    };

    const handleMultiCoordSearch = () => {
        const { valid, errors } = parseMultiCoordinates(coordInput);

        if (valid.length === 0) {
            toast.error("Tidak ada koordinat valid yang ditemukan. Periksa format input.");
            return;
        }

        if (errors.length > 0) {
            toast.warning(`${valid.length} titik valid, ${errors.length} baris tidak dikenali.`);
        }

        if (valid.length === 1) {
            onSearchCoordinates(valid[0].lat, valid[0].lng);
        } else {
            onSearchMultiCoordinates(valid.map(c => ({ lat: c.lat, lng: c.lng })));
        }
    };

    const uniqueYears = React.useMemo(() => {
        return Array.from(new Set(realisasiList.map(r => r.tahun_anggaran.toString()))).sort((a, b) => b.localeCompare(a));
    }, [realisasiList]);



    const isMasterConnected = React.useCallback((r: RealisasiSegmen) => {
        return Boolean(
            r.check_melarosa ||
            (r.snapped_road_id && r.snapped_road_id !== "0") ||
            (r as any).parent_id ||
            (r as any).is_master_connected
        );
    }, []);

    const listFilteredByYear = React.useMemo(() => {
        if (selectedTahunFilter === "Semua") return realisasiList;
        return realisasiList.filter(r => r.tahun_anggaran.toString() === selectedTahunFilter);
    }, [realisasiList, selectedTahunFilter]);

    const isBappedaOrAdminUser = user?.role === 'operator_bappeda' || user?.role === 'super_admin' || user?.role === 'admin';

    const listFilteredByVerifikasi = React.useMemo(() => {
        if (filterVerifikasi === "all") return listFilteredByYear;
        return listFilteredByYear.filter(r => r.status_verifikasi === filterVerifikasi);
    }, [listFilteredByYear, filterVerifikasi]);

    const pendingVerifikasiCount = React.useMemo(() => {
        return listFilteredByYear.filter(r =>
            isBappedaOrAdminUser
                ? r.status_verifikasi === 'verifikasi_bappeda'
                : (r.status_verifikasi === 'verifikasi_kecamatan' || !r.status_verifikasi) && !!r.catatan_verifikasi
        ).length;
    }, [listFilteredByYear, isBappedaOrAdminUser]);

    // Active Desa & Kecamatan names for executive summary
    const activeDesaObj = React.useMemo(() => desaList.find(d => d.id?.toString() === selectedDesa?.toString()), [desaList, selectedDesa]);
    const activeKecObj = React.useMemo(() => kecamatanList.find(k => k.id?.toString() === selectedKec?.toString()), [kecamatanList, selectedKec]);
    const activeDesaName = activeDesaObj?.nama_desa || realisasiList[0]?.nama_desa || "Desa Terpilih";
    const activeKecName = activeKecObj?.nama_kecamatan || realisasiList[0]?.nama_kecamatan || "Kecamatan Terpilih";

    // Fetch official Laporan Rekapitulasi Jalan Desa
    const [rekapDesaData, setRekapDesaData] = React.useState<RekapDibangun | null>(null);
    const [isLoadingRekapDesa, setIsLoadingRekapDesa] = React.useState<boolean>(false);

    React.useEffect(() => {
        if (!selectedDesa || !activeDesaName || activeDesaName === "Desa Terpilih") {
            setRekapDesaData(null);
            return;
        }

        let isMounted = true;
        const fetchRekap = async () => {
            setIsLoadingRekapDesa(true);
            try {
                const data = await laporanService.getRekapJalanByDibangun({
                    desa: activeDesaName,
                    kecamatan: activeKecName !== "Kecamatan Terpilih" ? activeKecName : undefined,
                    tahun_pembangunan: selectedTahunFilter !== "Semua" ? selectedTahunFilter : undefined,
                });
                if (isMounted) {
                    if (Array.isArray(data) && data.length > 0) {
                        setRekapDesaData(data[0]);
                    } else {
                        setRekapDesaData(null);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch rekap desa data:", err);
                if (isMounted) setRekapDesaData(null);
            } finally {
                if (isMounted) setIsLoadingRekapDesa(false);
            }
        };

        fetchRekap();
        return () => { isMounted = false; };
    }, [selectedDesa, activeDesaName, activeKecName, selectedTahunFilter]);

    // Summary Metrics: Total Length, Area, & Target Achievement
    const totalSegmentsCount = listFilteredByYear.length;
    const totalLengthMeters = React.useMemo(() => {
        return listFilteredByYear.reduce((sum, r) => sum + (parseFloat(String(r.panjang_m || (r as any).panjang || 0)) || 0), 0);
    }, [listFilteredByYear]);

    const targetLength = parseFloat(activeSnapshotLaporan?.rencana_panjang || 0);
    const achievementPercent = targetLength > 0 ? ((totalLengthMeters / targetLength) * 100).toFixed(1) : "0.0";

    // Summary Metrics: Condition Breakdown (Baik, Sedang, Rusak Ringan, Rusak Berat & Indeks Kemantapan)
    const conditionStats = React.useMemo(() => {
        let baik = 0, sedang = 0, rusakRingan = 0, rusakBerat = 0;
        let baikCount = 0, sedangCount = 0, rusakRinganCount = 0, rusakBeratCount = 0;

        listFilteredByYear.forEach(r => {
            const p = parseFloat(String(r.panjang_m || (r as any).panjang || 0)) || 0;
            const k = (r.kondisi || "").toUpperCase().replace(/\s+/g, "_");
            if (k === "BAIK") {
                baik += p;
                baikCount++;
            } else if (k === "SEDANG") {
                sedang += p;
                sedangCount++;
            } else if (k === "RUSAK_RINGAN") {
                rusakRingan += p;
                rusakRinganCount++;
            } else if (k === "RUSAK_BERAT") {
                rusakBerat += p;
                rusakBeratCount++;
            } else {
                sedang += p;
                sedangCount++;
            }
        });

        const total = totalLengthMeters || 1;
        const mantapLength = baik + sedang;
        const mantapPercent = totalLengthMeters > 0 ? ((mantapLength / totalLengthMeters) * 100).toFixed(1) : "0.0";

        return {
            baik: { length: baik, count: baikCount, pct: totalLengthMeters > 0 ? ((baik / total) * 100).toFixed(1) : "0" },
            sedang: { length: sedang, count: sedangCount, pct: totalLengthMeters > 0 ? ((sedang / total) * 100).toFixed(1) : "0" },
            rusakRingan: { length: rusakRingan, count: rusakRinganCount, pct: totalLengthMeters > 0 ? ((rusakRingan / total) * 100).toFixed(1) : "0" },
            rusakBerat: { length: rusakBerat, count: rusakBeratCount, pct: totalLengthMeters > 0 ? ((rusakBerat / total) * 100).toFixed(1) : "0" },
            mantapLength,
            mantapPercent,
        };
    }, [listFilteredByYear, totalLengthMeters]);

    // Summary Metrics: Pavement Types (Jenis Perkerasan)
    const pavementStats = React.useMemo(() => {
        const map: Record<string, { length: number; count: number }> = {};
        listFilteredByYear.forEach(r => {
            const p = parseFloat(String(r.panjang_m || (r as any).panjang || 0)) || 0;
            const rawPave = (r.perkerasan || "Lainnya").trim();
            const pave = rawPave ? (rawPave.charAt(0).toUpperCase() + rawPave.slice(1).toLowerCase()) : "Lainnya";
            if (!map[pave]) map[pave] = { length: 0, count: 0 };
            map[pave].length += p;
            map[pave].count += 1;
        });

        return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
    }, [listFilteredByYear]);

    // Summary Metrics: Verification Pipeline
    const verificationStats = React.useMemo(() => {
        let terverifikasi = 0;
        let pendingBappeda = 0;
        let pendingKecamatan = 0;

        listFilteredByYear.forEach(r => {
            const sv = r.status_verifikasi;
            if (sv === "terverifikasi") {
                terverifikasi++;
            } else if (sv === "verifikasi_bappeda") {
                pendingBappeda++;
            } else {
                pendingKecamatan++;
            }
        });

        return {
            terverifikasi,
            pendingBappeda,
            pendingKecamatan,
            total: listFilteredByYear.length
        };
    }, [listFilteredByYear]);



    return (
        <div className={cn("bg-card flex flex-col h-full transition-all duration-300 ease-in-out overflow-hidden", className)}>
            {/* Mobile Bottom Sheet Handle */}
            <div className="md:hidden flex justify-center pt-2.5 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-slate-350 dark:bg-slate-650" />
            </div>            {/* Location Selection & Search Panel */}
            <div className="p-3.5 border-b border-border bg-muted/30 space-y-2.5 relative">
                {/* Search Bar Input */}
                <div className="flex items-center gap-2 w-full">
                    <div className="flex-1 flex items-center gap-1.5 p-1 bg-background border border-input rounded-xl shadow-xs h-9 min-w-0">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsCoordSearchOpen(!isCoordSearchOpen)}
                                    className={cn(
                                        "h-7 px-2 rounded-lg gap-1 text-xs select-none shrink-0 transition-colors",
                                        isCoordSearchOpen
                                            ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold"
                                            : "hover:bg-muted text-muted-foreground"
                                    )}
                                >
                                    <Crosshair className="size-3.5 text-blue-500" />
                                    <span className="hidden sm:inline text-[10px]">Koordinat</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Buka Panel Input Multi-Koordinat Manual</TooltipContent>
                        </Tooltip>

                        <div className="h-5 w-[1px] bg-border shrink-0" />

                        <div className="relative flex-1 flex items-center min-w-0">
                            <Input
                                type="text"
                                placeholder="Cari nama lokasi / koordinat (-7.xx, 112.xx)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleAddressSearch();
                                }}
                                className="pr-7 pl-1.5 h-7 border-none shadow-none focus-visible:ring-0 text-xs bg-transparent w-full"
                            />
                            <div className="absolute right-1.5 flex items-center gap-1">
                                {isSearching ? (
                                    <Loader2 className="size-3.5 text-muted-foreground animate-spin" />
                                ) : (
                                    <>
                                        {(searchQuery || hasSearchPin) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearchQuery("");
                                                    setSuggestions([]);
                                                    onClearSearchPin();
                                                }}
                                                className="text-muted-foreground hover:text-foreground focus:outline-none transition-colors p-0.5 rounded-md hover:bg-muted"
                                                title="Hapus pencarian"
                                            >
                                                <X className="size-3.5" />
                                            </button>
                                        )}
                                        <Search
                                            className="size-3.5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                            onClick={handleAddressSearch}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Suggestions Box Overlay */}
                {suggestions.length > 0 && (
                    <div className="absolute left-3.5 right-3.5 top-[52px] z-30 bg-background border border-border rounded-xl shadow-lg p-1 max-h-48 overflow-y-auto custom-scrollbar">
                        {suggestions.map((item, index) => (
                            <button
                                key={index}
                                onClick={() => handleSelectSuggestion(item)}
                                className="w-full text-left px-3 py-1.5 text-[10px] text-foreground hover:bg-muted rounded-lg flex items-start gap-1.5 border-b border-border/40 last:border-b-0"
                            >
                                <PinIcon className="size-3 text-red-500 shrink-0 mt-0.5" />
                                <span className="truncate">{item.display_name}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Multi-Coordinate Search Panel */}
                {isCoordSearchOpen && (
                    <div className="bg-background border border-border rounded-xl p-3 space-y-2.5 animate-in fade-in duration-200 shadow-xs">
                        <div className="flex items-center justify-between">
                            <Label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                                Input Koordinat (Desimal atau DMS)
                            </Label>
                            <button
                                type="button"
                                onClick={() => setIsCoordSearchOpen(false)}
                                className="text-muted-foreground hover:text-foreground p-0.5"
                            >
                                <X className="size-3" />
                            </button>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[9px] text-muted-foreground leading-relaxed">
                                Satu koordinat per baris. Contoh:<br />
                                <code>-7.19504, 112.06231</code> atau DMS <code>7°11'S 112°3'E</code>
                            </p>
                            <textarea
                                rows={4}
                                placeholder={`Contoh:\n-7.19504, 112.06231\n-7.20100, 112.07500`}
                                value={coordInput}
                                onChange={(e) => {
                                    setCoordInput(e.target.value);
                                    const { valid } = parseMultiCoordinates(e.target.value);
                                    setParsedCoordCount(valid.length);
                                }}
                                className="w-full text-xs font-mono rounded-lg border border-input bg-background p-2 resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-24"
                            />
                            {parsedCoordCount > 0 && (
                                <p className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    ✓ {parsedCoordCount} koordinat valid terdeteksi
                                </p>
                            )}
                        </div>
                        <div className="flex gap-1.5">
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleMultiCoordSearch}
                                className="flex-1 text-[10px] gap-1 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                            >
                                <Search className="h-3 w-3" />
                                Cari {parsedCoordCount > 0 ? `(${parsedCoordCount} titik)` : ""}
                            </Button>
                            {hasSearchPin && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={onClearSearchPin}
                                    className="text-xs text-rose-500 hover:text-rose-600 border-rose-200 dark:border-rose-900/30 hover:bg-rose-50/10 h-8 px-2 rounded-lg"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
                {isFormOpen ? (
                    <div className="p-4 space-y-4">

                        {/* Header */}
                        <div className={cn(
                            "rounded-2xl p-3.5 border flex items-start justify-between gap-3",
                            editingSegmentId
                                ? "bg-amber-500/5 border-amber-500/20"
                                : "bg-indigo-500/5 border-indigo-500/20"
                        )}>
                            <div className="flex items-start gap-2.5">
                                <div className={cn(
                                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                                    editingSegmentId
                                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                        : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                                )}>
                                    {editingSegmentId ? <Edit3 className="size-4" /> : <Route className="size-4" />}
                                </div>
                                <div>
                                    <p className="text-xs font-extrabold text-foreground leading-tight">
                                        {editingSegmentId
                                            ? (activeTipe?.geom_type?.toUpperCase() === 'POLYGON' || activeTipe?.geom_type?.toUpperCase() === 'MULTIPOLYGON' ? "Edit Geometri Area" : "Edit Geometri Segmen")
                                            : (activeTipe?.geom_type?.toUpperCase() === 'POLYGON' || activeTipe?.geom_type?.toUpperCase() === 'MULTIPOLYGON' ? "Digitasi Area Baru" : "Digitasi Segmen Baru")
                                        }
                                    </p>
                                    {activeTipe && (
                                        <p className="text-[11px] font-semibold text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                            <span
                                                className="w-2 h-2 rounded-full inline-block shrink-0"
                                                style={{ backgroundColor: activeTipe.warna || '#3b82f6' }}
                                            />
                                            <span>{activeTipe.nama} ({activeTipe.geom_type || "LINESTRING"})</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={closeForm}
                                className="h-7 px-2.5 text-[10px] text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg font-semibold shrink-0"
                            >
                                Batal
                            </Button>
                        </div>

                        {/* Status & Info Card */}
                        <div className="rounded-xl border border-border bg-muted/20 overflow-hidden space-y-3 p-3">
                            {/* Snapping Toggle */}
                            {tipeJalanDigitasi === "poros" && checkMelarosa && (
                                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-background border border-border">
                                    <span className="text-[10px] font-bold text-muted-foreground">Fungsi Snapping Rujukan</span>
                                    <Switch
                                        checked={isSnappingEnabled}
                                        onCheckedChange={(val) => { setIsSnappingEnabled(val); }}
                                        className="data-[state=checked]:bg-emerald-500 scale-75"
                                    />
                                </div>
                            )}

                            {/* Live Instructions */}
                            <div className="text-[10.5px] text-muted-foreground leading-snug bg-background/50 p-2.5 rounded-lg border border-border/60">
                                {activeTipe?.geom_type?.toUpperCase() === 'POLYGON' || activeTipe?.geom_type?.toUpperCase() === 'MULTIPOLYGON' ? (
                                    <p>Klik titik-titik sudut di peta untuk membentuk <strong>area polygon</strong>, atau gunakan fitur alat ukur P × L. Klik ganda titik terakhir untuk mengunci area.</p>
                                ) : activeTipe?.geom_type?.toUpperCase() === 'POINT' || activeTipe?.geom_type?.toUpperCase() === 'MULTIPOINT' ? (
                                    <p>Klik satu titik di peta untuk menandai <strong>koordinat lokasi aset</strong>.</p>
                                ) : tipeJalanDigitasi === "lingkungan" || !checkMelarosa ? (
                                    <p>Klik titik-titik lokasi di peta untuk melakukan digitasi segmen secara <strong>mandiri</strong>. Klik ganda untuk mengunci.</p>
                                ) : digitizeMode === "manual" ? (
                                    <p>Klik di peta untuk menambahkan node menempel pada <strong>rujukan master</strong>. Klik ganda untuk mengunci.</p>
                                ) : (
                                    <p>Klik <strong>titik awal</strong>, lalu <strong>titik akhir</strong> di peta. Geometri akan ditelusuri otomatis dari rujukan.</p>
                                )}
                            </div>
                        </div>

                        {/* Conditional Polygon Panel Cards */}
                        {(activeTipe?.geom_type?.toUpperCase() === 'POLYGON' || activeTipe?.geom_type?.toUpperCase() === 'MULTIPOLYGON') && (
                            digitizeMode === "dimensions" ? (
                                /* Card Form Isian Dimensi Polygon (Panjang & Lebar) - Hanya muncul jika Kotak P x L aktif */
                                <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3 space-y-2.5">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                                        <Square className="size-4 text-orange-500 shrink-0" />
                                        <span>Dimensi Area (Kotak P × L)</span>
                                    </div>
                                    <p className="text-[10.5px] text-muted-foreground leading-snug">
                                        Isikan ukuran Panjang &amp; Lebar dalam meter, lalu klik peta / tombol di bawah untuk membuat area polygon.
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                                        <div className="space-y-1">
                                            <Label htmlFor="panel-panjang" className="text-[10.5px] font-semibold text-foreground">Panjang (m)</Label>
                                            <Input
                                                id="panel-panjang"
                                                type="number"
                                                min={0.1}
                                                step={0.5}
                                                value={inputPanjang}
                                                onChange={(e) => setInputPanjang?.(parseFloat(e.target.value) || 0)}
                                                placeholder="10"
                                                className="h-8 text-xs bg-background"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="panel-lebar" className="text-[10.5px] font-semibold text-foreground">Lebar (m)</Label>
                                            <Input
                                                id="panel-lebar"
                                                type="number"
                                                min={0.1}
                                                step={0.5}
                                                value={inputLebar}
                                                onChange={(e) => setInputLebar?.(parseFloat(e.target.value) || 0)}
                                                placeholder="6"
                                                className="h-8 text-xs bg-background"
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => {
                                            if (!inputPanjang || inputPanjang <= 0 || !inputLebar || inputLebar <= 0) {
                                                toast.warning("Masukkan angka Panjang dan Lebar yang valid.");
                                                return;
                                            }
                                            setIsFormOpen?.(true);
                                            setDigitizeMode?.("dimensions");
                                            handleGenerateDimensionArea?.(inputPanjang, inputLebar);
                                        }}
                                        className="w-full h-8 text-xs bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg gap-1.5 shadow-xs mt-1 cursor-pointer"
                                    >
                                        <Square className="size-3.5 shrink-0" />
                                        <span>Buat / Update Area Polygon</span>
                                    </Button>                                 </div>
                            ) : (
                                /* Card Informasi Luas Area - Muncul jika Area Polygon (Freehand) aktif */
                                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                        <Pentagon className="size-4 text-emerald-500 shrink-0" />
                                        <span>Informasi Area Polygon (Freehand)</span>
                                    </div>
                                    <div className="grid grid-cols-2 divide-x divide-border/60 text-center bg-background/60 p-2.5 rounded-lg border border-border/50 mt-1">
                                        <div>
                                            <span className="text-[8.5px] text-muted-foreground uppercase font-black tracking-wider block">Estimasi Luas</span>
                                            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                                                {drawnCoords.length >= 3 
                                                    ? `${drawnLength > 0 ? drawnLength.toLocaleString("id-ID") : "0"} m²` 
                                                    : "—"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[8.5px] text-muted-foreground uppercase font-black tracking-wider block">Jumlah Node</span>
                                            <span className="text-xs font-bold text-foreground block mt-0.5">
                                                {coordsCount > 0 ? `${coordsCount} titik` : "0 titik"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )
                        )}

                        {/* Live stats card */}
                        <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
                            <div className="grid grid-cols-2 divide-x divide-border text-center">
                                <div className="py-2.5">
                                    <span className="text-[8px] text-muted-foreground uppercase font-black tracking-wider block">Panjang</span>
                                    <span className={cn(
                                        "text-xs font-bold block mt-0.5",
                                        drawnLength > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                                    )}>{drawnLength > 0 ? `${Number(drawnLength).toFixed(2)} m` : "—"}</span>
                                </div>
                                <div className="py-2.5">
                                    <span className="text-[8px] text-muted-foreground uppercase font-black tracking-wider block">Jumlah Node</span>
                                    <span className={cn(
                                        "text-xs font-bold block mt-0.5",
                                        coordsCount > 0 ? "text-foreground" : "text-muted-foreground"
                                    )}>{coordsCount > 0 ? `${coordsCount} titik` : "—"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Node Coordinates List */}
                        {drawnCoords && drawnCoords.length > 0 && (
                            <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
                                <div className="p-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Koordinat Vertex ({drawnCoords.length})</span>
                                </div>
                                <div className="max-h-48 overflow-y-auto divide-y divide-border/60 text-[10px] bg-background/50 font-mono">
                                    {drawnCoords.map((coord, idx) => (
                                        <div key={idx} className="px-3 py-1.5 flex items-center justify-between text-muted-foreground">
                                            <span className="font-bold text-foreground bg-muted w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[8px]">{idx + 1}</span>
                                            <div className="flex gap-3">
                                                <div>
                                                    <span className="text-[8px] text-slate-400 dark:text-slate-550 mr-1 uppercase">Lng</span>
                                                    <span className="text-foreground font-semibold">{coord[0].toFixed(6)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[8px] text-slate-400 dark:text-slate-550 mr-1 uppercase">Lat</span>
                                                    <span className="text-foreground font-semibold">{coord[1].toFixed(6)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Main Overview & Progress Panel View */
                    <div className="p-3 space-y-4">
                        <div className="flex items-center gap-2 px-0.5 pb-2.5 mb-0.5 border-b border-border/50">
                            {/* Icon + Label */}
                            <div className="flex items-center justify-center size-6 rounded-md bg-indigo-500/10 dark:bg-indigo-500/20 shrink-0">
                                <Layers className="size-3.5 text-indigo-500 dark:text-indigo-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-bold text-foreground tracking-tight leading-none truncate">
                                        {activeTipe?.nama || "Infrastruktur"}
                                    </span>
                                    {selectedTahunFilter !== "Semua" && (
                                        <span className="inline-flex items-center gap-0.5 text-[8px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/25 uppercase tracking-widest leading-none shrink-0">
                                            TA {selectedTahunFilter}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {/* Count badge / Loading */}
                            {isLoading ? (
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-full border border-border/50 shrink-0">
                                    <Loader2 className="size-3 animate-spin" />
                                    <span className="font-medium">Memuat...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    {pendingVerifikasiCount > 0 && (
                                        <div className={cn(
                                            "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold border shrink-0",
                                            isBappedaOrAdminUser
                                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 animate-pulse"
                                                : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                        )}>
                                            {isBappedaOrAdminUser ? (
                                                <><span>🔔</span><span>{pendingVerifikasiCount}</span></>
                                            ) : (
                                                <><RotateCcw className="size-2.5" /><span>{pendingVerifikasiCount}</span></>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1 bg-indigo-500/10 dark:bg-indigo-500/15 px-2 py-1 rounded-full border border-indigo-500/20 shrink-0">
                                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 tabular-nums leading-none">{listFilteredByYear.length}</span>
                                        <span className="text-[9px] font-semibold text-indigo-500/70 dark:text-indigo-400/70 leading-none">segmen</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Top-Down Assignment Banners & Progress Card */}
                        {(() => {
                            const isKecamatanUser = !isBappedaOrAdminUser;
                            const isSpecificYear = selectedTahunFilter !== "Semua";
                            const totalRealizedLength = listFilteredByYear.reduce((sum, r) => sum + (parseFloat(String(r.panjang_m || (r as any).panjang || 0)) || 0), 0);
                            const targetLength = parseFloat(activeSnapshotLaporan?.rencana_panjang || 0);
                            const percentage = targetLength > 0 ? ((totalRealizedLength / targetLength) * 100).toFixed(1) : "0.0";

                            // Case 1: Kecamatan membuka peta tapi Bappeda belum membuat Draft Dokumen
                            if (isKecamatanUser && isSpecificYear && !activeSnapshotLaporan) {
                                return (
                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-1.5 mx-0.5 shadow-2xs">
                                        <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-700 dark:text-amber-300">
                                            <Lock className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                                            <span>Akses Digitasi Belum Dibuka oleh Bappeda</span>
                                        </div>
                                        <p className="text-[10.5px] text-muted-foreground leading-relaxed font-sans">
                                            Operator Bappeda belum menerbitkan <strong>Draft Dokumen Monitoring</strong> untuk wilayah ini pada <strong>TA {selectedTahunFilter}</strong>. Silakan hubungi Bappeda untuk inisiasi dokumen target fisik.
                                        </p>
                                    </div>
                                );
                            }

                            // Case 4: Dokumen Berita Acara Final
                            if (activeSnapshotLaporan && activeSnapshotLaporan.status === 'Final') {
                                return (
                                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs space-y-1.5 mx-0.5 shadow-2xs">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 font-bold text-[11px] text-emerald-700 dark:text-emerald-300">
                                                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                                <span>Berita Acara TA {selectedTahunFilter} Telah Final & Sah</span>
                                            </div>
                                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                                                FINAL
                                            </span>
                                        </div>
                                        <p className="text-[10.5px] text-muted-foreground leading-relaxed font-sans">
                                            No. BA: <strong>{activeSnapshotLaporan.nomor_ba || '-'}</strong>. Seluruh data segmen realisasi telah disahkan secara resmi oleh Bappeda.
                                        </p>
                                    </div>
                                );
                            }

                            // Case 3: Dokumen Sedang Disubmit ke Bappeda
                            if (activeSnapshotLaporan && activeSnapshotLaporan.status === 'Submitted') {
                                return (
                                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-900 dark:text-blue-200 text-xs space-y-2 mx-0.5 shadow-2xs">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 font-bold text-[11px] text-blue-700 dark:text-blue-300">
                                                <Clock className="size-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                                                <span>Hasil Digitasi Sedang Diverifikasi Bappeda</span>
                                            </div>
                                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30 uppercase tracking-wider">
                                                TERKIRIM
                                            </span>
                                        </div>
                                        <p className="text-[10.5px] text-muted-foreground leading-relaxed font-sans">
                                            Dokumen dan {listFilteredByYear.length} segmen TA {selectedTahunFilter} telah dikirimkan ke Bappeda. Digitasi dan pengiriman dikunci sementara menunggu verifikasi.
                                        </p>
                                    </div>
                                );
                            }

                            // Case 2: Draft / Revisi Dokumen Aktif (Kecamatan aktif mendigitasi berbasis target Bappeda)
                            if (activeSnapshotLaporan && (activeSnapshotLaporan.status === 'Draft' || activeSnapshotLaporan.status === 'Revisi')) {
                                const draftSegmenCount = listFilteredByYear.filter(r => (r as any).status_verifikasi === 'verifikasi_kecamatan' || !(r as any).status_verifikasi).length;
                                return (
                                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs space-y-2.5 mx-0.5 shadow-2xs">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 font-bold text-[11px] text-indigo-700 dark:text-indigo-300">
                                                <Sparkles className="size-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                                                <span>Draft Penugasan Bappeda (TA {selectedTahunFilter})</span>
                                            </div>
                                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                                                {activeSnapshotLaporan.sumber_dana || "BKK"}
                                            </span>
                                        </div>

                                        {/* Target Rencana vs Realisasi Progress */}
                                        <div className="space-y-1.5 bg-background/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-indigo-500/20">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="text-muted-foreground">Target Rencana Bappeda:</span>
                                                <span className="font-bold text-foreground">
                                                    {targetLength > 0 ? `${targetLength.toLocaleString('id-ID')} m` : "Belum ditentukan"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="text-muted-foreground">Realisasi Terdigitasi:</span>
                                                <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                                                    {totalRealizedLength.toLocaleString('id-ID', { maximumFractionDigits: 1 })} m
                                                    {targetLength > 0 && (
                                                        <span className="text-[9.5px] font-semibold text-muted-foreground ml-1">
                                                            ({percentage}%)
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            {targetLength > 0 && (
                                                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mt-1.5">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full transition-all duration-300",
                                                            parseFloat(percentage) >= 100 ? "bg-emerald-500" : "bg-indigo-600"
                                                        )}
                                                        style={{ width: `${Math.min(100, parseFloat(percentage))}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {activeSnapshotLaporan.catatan_revisi && (
                                            <p className="text-[10.5px] bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 text-amber-900 dark:text-amber-200 font-sans leading-relaxed">
                                                <strong className="font-semibold text-amber-600 dark:text-amber-400">Catatan Bappeda:</strong> {activeSnapshotLaporan.catatan_revisi}
                                            </p>
                                        )}

                                        {isKecamatanUser && onSubmitLaporanRevisi && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="w-full block">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={onSubmitLaporanRevisi}
                                                            disabled={draftSegmenCount === 0}
                                                            className="w-full h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <Send className="w-3 h-3" />
                                                            <span>
                                                                {draftSegmenCount === 0 ? "Seluruh Hasil Digitasi Telah Terkirim" : `Kirim Hasil Digitasi (${draftSegmenCount} Segmen)`}
                                                            </span>
                                                        </Button>
                                                    </span>
                                                </TooltipTrigger>
                                                {draftSegmenCount === 0 && (
                                                    <TooltipContent>
                                                        Tidak ada segmen berstatus draft yang perlu dikirimkan ke Bappeda.
                                                    </TooltipContent>
                                                )}
                                            </Tooltip>
                                        )}
                                    </div>
                                );
                            }

                            return null;
                        })()}

                        {/* ── DATA LAPORAN JALAN BERDASARKAN DESA ────────────────────────────────────────── */}
                        {isLoadingRekapDesa ? (
                            <div className="p-4 rounded-xl bg-card border border-border/80 space-y-3 mx-0.5 animate-pulse">
                                <div className="flex items-center gap-2">
                                    <div className="size-8 rounded-lg bg-muted" />
                                    <div className="space-y-1.5 flex-1">
                                        <div className="h-3.5 bg-muted rounded w-2/3" />
                                        <div className="h-2.5 bg-muted rounded w-1/2" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-2">
                                    <div className="h-16 bg-muted rounded-lg" />
                                    <div className="h-16 bg-muted rounded-lg" />
                                </div>
                            </div>
                        ) : rekapDesaData ? (() => {
                            const totalAset = rekapDesaData.total_panjang_aset || 0;
                            const sisaIntervensi = rekapDesaData.sisa_intervensi || 0;
                            const totalDibangun = rekapDesaData.total_panjang_dibangun || 0;
                            const totalPuk = rekapDesaData.total_panjang_puk || 0;
                            const totalSelisih = rekapDesaData.selisih || 0;
                            const percentDibangun = sisaIntervensi > 0 ? ((totalDibangun / sisaIntervensi) * 100).toFixed(1) : "0.0";

                            return (
                                <div className="space-y-3 mx-0.5">
                                    {/* 1. Header Laporan Rekapitulasi Jalan Desa */}
                                    <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-xs space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="size-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                                    <Home className="size-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-xs font-black text-foreground truncate">
                                                        Desa {rekapDesaData.nama_desa}
                                                    </h4>
                                                    <p className="text-[10px] text-muted-foreground truncate">
                                                        Kec. {rekapDesaData.nama_kecamatan}
                                                    </p>
                                                </div>
                                            </div>

                                            <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 uppercase tracking-wider shrink-0 font-mono">
                                                {rekapDesaData.status_pembangunan || "Terdata"}
                                            </span>
                                        </div>

                                        {/* KPI Cards: Laporan Jalan Desa (Satuan Meter) */}
                                        <div className="grid grid-cols-2 gap-2">
                                            {/* Pemetaan Jalan Desa 2021 */}
                                            <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                                                    Pemetaan Jalan (2021)
                                                </span>
                                                <div className="flex items-baseline gap-1 mt-0.5">
                                                    <span className="text-sm font-black font-mono text-foreground">
                                                        {totalAset.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-muted-foreground">
                                                        m
                                                    </span>
                                                </div>
                                                <span className="text-[9px] text-muted-foreground font-mono mt-0.5 block">
                                                    Hasil Pemetaan 2021
                                                </span>
                                            </div>

                                            {/* Aset Jalan Desa Saat Ini (Sisa Intervensi) */}
                                            <div className="p-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
                                                <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">
                                                    Aset Jalan Desa
                                                </span>
                                                <div className="flex items-baseline gap-1 mt-0.5">
                                                    <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400">
                                                        {sisaIntervensi.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-indigo-500">
                                                        m
                                                    </span>
                                                </div>
                                                <span className="text-[9px] text-muted-foreground font-mono mt-0.5 block">
                                                    Jalan Desa Saat Ini
                                                </span>
                                            </div>

                                            {/* Jalan Desa Sudah Dibangun */}
                                            <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                                                <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
                                                    Jalan Dibangun
                                                </span>
                                                <div className="flex items-baseline gap-1 mt-0.5">
                                                    <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                                                        {totalDibangun.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-emerald-500">
                                                        m
                                                    </span>
                                                </div>
                                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                                                    {percentDibangun}% Terealisasi
                                                </span>
                                            </div>

                                            {/* Jalan Desa Belum Dibangun (Selisih) */}
                                            <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                                                <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
                                                    Belum Dibangun
                                                </span>
                                                <div className="flex items-baseline gap-1 mt-0.5">
                                                    <span className="text-sm font-black font-mono text-amber-600 dark:text-amber-400">
                                                        {totalSelisih.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-amber-500">
                                                        m
                                                    </span>
                                                </div>
                                                <span className="text-[9px] text-muted-foreground font-mono mt-0.5 block">
                                                    Sisa Belum Dibangun
                                                </span>
                                            </div>
                                        </div>

                                        {/* Peningkatan Status (PUK / Jalan Kabupaten) */}
                                        {totalPuk > 0 && (
                                            <div className="flex items-center justify-between p-2 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-950 dark:text-teal-200 text-xs">
                                                <div className="flex items-center gap-1.5">
                                                    <ArrowUpCircle className="size-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                                                    <span className="text-[10.5px] font-semibold">Peningkatan Status (PUK / Kab):</span>
                                                </div>
                                                <span className="font-mono font-bold text-teal-700 dark:text-teal-300 text-xs">
                                                    {totalPuk.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m
                                                </span>
                                            </div>
                                        )}

                                        {/* Progress Bar Pembangunan */}
                                        <div className="space-y-1 pt-1">
                                            <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
                                                <span>Progres Pembangunan Jalan Desa</span>
                                                <span className="font-mono text-foreground font-bold">{percentDibangun}%</span>
                                            </div>
                                            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className={cn(
                                                        "h-full rounded-full transition-all duration-300",
                                                        parseFloat(percentDibangun) >= 100 ? "bg-emerald-500" : "bg-indigo-600"
                                                    )}
                                                    style={{ width: `${Math.min(100, parseFloat(percentDibangun))}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Realisasi Spasial Digitasi GIS TA Terpilih */}
                                    <div className="p-3 rounded-xl bg-card border border-border/80 shadow-xs space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                                    <Database className="size-3.5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold text-foreground">Digitasi Realisasi TA {selectedTahunFilter}</h4>
                                                    <p className="text-[10px] text-muted-foreground">{listFilteredByYear.length} Segmen Terdata</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1.5 pt-1">
                                            {onOpenBottomPanel && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={onOpenBottomPanel}
                                                    className="w-full h-8 text-xs font-bold border-indigo-500/30 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg gap-1.5 shadow-xs cursor-pointer"
                                                >
                                                    <Table2 className="size-3.5" />
                                                    <span>Buka Rincian Tabel Segmen ({listFilteredByYear.length})</span>
                                                </Button>
                                            )}

                                            {canDigitize(user) && selectedDesa && !isFormOpen && (isBappedaOrAdminUser || (activeSnapshotLaporan && (activeSnapshotLaporan.status === 'Draft' || activeSnapshotLaporan.status === 'Revisi'))) && !(activeSnapshotLaporan?.status === 'Submitted' || activeSnapshotLaporan?.status === 'Final' || isYearLocked) && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (!activeTipe) return;
                                                        if (activeTipe.kode === 'jalan_lingkungan') {
                                                            setTipeJalanDigitasi?.('lingkungan');
                                                        } else {
                                                            setTipeJalanDigitasi?.('poros');
                                                        }
                                                        setIsFormOpen?.(true);
                                                        startDraw?.();
                                                    }}
                                                    className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg gap-1.5 shadow-xs cursor-pointer"
                                                >
                                                    <Plus className="size-3.5" />
                                                    <span>Mulai Digitasi Segmen Baru</span>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })() : (
                            /* Fallback jika desa belum ada di database rekap */
                            <div className="text-center py-8 px-4 text-slate-500 space-y-3 bg-muted/10 rounded-2xl border border-dashed border-border/80 mx-2">
                                <div className="size-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-xs">
                                    <Route className="size-5" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-xs font-bold text-foreground">
                                        Data Laporan Jalan Desa
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground max-w-xs mx-auto leading-relaxed">
                                        {activeDesaName !== "Desa Terpilih"
                                            ? `Data rekapitulasi pembangunan jalan untuk Desa ${activeDesaName} belum tercatat.`
                                            : "Pilih wilayah kecamatan dan desa untuk melihat laporan pembangunan jalan."}
                                    </p>
                                </div>
                                {canDigitize(user) && selectedDesa && !isFormOpen && (isBappedaOrAdminUser || (activeSnapshotLaporan && (activeSnapshotLaporan.status === 'Draft' || activeSnapshotLaporan.status === 'Revisi'))) && !(activeSnapshotLaporan?.status === 'Submitted' || activeSnapshotLaporan?.status === 'Final' || isYearLocked) && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => {
                                            if (!activeTipe) return;
                                            if (activeTipe.kode === 'jalan_lingkungan') {
                                                setTipeJalanDigitasi?.('lingkungan');
                                            } else {
                                                setTipeJalanDigitasi?.('poros');
                                            }
                                            setIsFormOpen?.(true);
                                            startDraw?.();
                                        }}
                                        className="h-8 px-3.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg gap-1.5 shadow-sm mt-1 cursor-pointer"
                                    >
                                        <Plus className="size-3.5" />
                                        <span>Mulai Digitasi</span>
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {(!isAttributeDialogOpen && (isFormOpen || digitizeMode === "dimensions" || coordsCount > 0 || drawnCoords.length > 0 || drawnLength > 0)) ? (
                <div className="p-4 border-t border-border bg-card sticky bottom-0 z-20 space-y-2">
                    {(coordsCount > 0 || drawnCoords.length > 0 || drawnLength > 0) && (
                        <div className="flex gap-2 w-full">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleRedraw}
                                className="flex-1 h-9 text-xs font-bold rounded-lg border-orange-200 bg-orange-50/10 hover:bg-orange-500/10 text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:border-orange-900/30 hover:border-orange-300 dark:hover:border-orange-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <RefreshCw className="size-3.5" />
                                <span>Gambar Ulang</span>
                            </Button>
                            <Button
                                type="button"
                                onClick={(e) => {
                                    if (onSaveClick) onSaveClick();
                                    else if (handleSave) handleSave(e);
                                }}
                                className="flex-1 h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                                <Save className="size-3.5" />
                                <span>Simpan Digitasi</span>
                            </Button>
                        </div>
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={closeForm}
                        className="w-full h-9 text-xs font-bold rounded-lg border-rose-200 bg-rose-50/10 hover:bg-rose-500/10 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:border-rose-900/30 hover:border-rose-300 dark:hover:border-rose-800 transition-all cursor-pointer"
                    >
                        <span>Batal Digitasi</span>
                    </Button>
                </div>
            ) : !activeTipe ? null : (() => {
                const isOpd = isReadOnlyRole(user);
                const isKecamatanUser = !isBappedaOrAdminUser && !isOpd;
                const isTahunSemua = selectedTahunFilter === "Semua";
                const noDraftLaporan = isKecamatanUser && selectedTahunFilter !== "Semua" && !activeSnapshotLaporan;
                const isSubmittedLocked = isKecamatanUser && activeSnapshotLaporan?.status === 'Submitted';
                const isFinalLocked = isKecamatanUser && (isYearLocked || activeSnapshotLaporan?.status === 'Final');

                let disabledReason = "";
                if (isOpd) {
                    disabledReason = "Akun Operator OPD berstatus Read-Only (Viewer)";
                } else if (!selectedDesa) {
                    disabledReason = "Pilih Desa terlebih dahulu";
                } else if (isKecamatanUser && isTahunSemua) {
                    disabledReason = "Pilih Tahun Anggaran untuk Digitasi";
                } else if (noDraftLaporan) {
                    disabledReason = `Draft Penugasan TA ${selectedTahunFilter} belum diterbitkan Bappeda`;
                } else if (isSubmittedLocked) {
                    disabledReason = "Sedang diverifikasi Bappeda (Terkunci)";
                } else if (isFinalLocked) {
                    disabledReason = `Berita Acara TA ${selectedTahunFilter} telah Final (Terkunci)`;
                }

                const isDisabled = isOpd || !selectedDesa || (isKecamatanUser && (isTahunSemua || noDraftLaporan || isSubmittedLocked || isFinalLocked));

                return (
                    <div className="p-4 border-t border-border bg-card sticky bottom-0 z-20">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div>
                                    <Button
                                        onClick={() => {
                                            if (isDisabled) return;
                                            if (activeTipe.kode === 'jalan_lingkungan') {
                                                setTipeJalanDigitasi('lingkungan');
                                            } else {
                                                setTipeJalanDigitasi('poros');
                                            }
                                            setIsFormOpen(true);
                                            startDraw();
                                        }}
                                        style={{
                                            backgroundColor: !isDisabled && activeTipe?.warna ? activeTipe.warna : undefined
                                        }}
                                        className={cn(
                                            "w-full h-9 text-xs font-bold rounded-lg shadow-md flex items-center justify-center gap-1.5 transition-all text-white",
                                            !isDisabled && !activeTipe?.warna && "bg-emerald-600 hover:bg-emerald-700",
                                            isDisabled && "bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed shadow-none border border-border"
                                        )}
                                        disabled={isDisabled}
                                    >
                                        {isDisabled ? (
                                            <Lock className="size-3.5 shrink-0" />
                                        ) : (
                                            <Plus className="size-3.5 shrink-0" />
                                        )}
                                        <span className="truncate">
                                            {isDisabled 
                                                ? disabledReason
                                                : `Mulai Digitasi ${activeTipe?.nama || "Segmen Baru"}`}
                                        </span>
                                    </Button>
                                </div>
                            </TooltipTrigger>
                            {disabledReason && (
                                <TooltipContent>
                                    <span>{disabledReason}</span>
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </div>
                );
            })()}

            {/* Dialog Kembalikan Segmen ke Kecamatan */}
            <Dialog open={!!kembalikanSegmenData} onOpenChange={(open) => !open && setKembalikanSegmenData(null)}>
                <DialogContent className="max-w-md p-0 border dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden">
                    <DialogHeader className="px-6 py-4 border-b border-border bg-slate-50/50 dark:bg-slate-900/50">
                        <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <RotateCcw className="size-4 text-amber-600 dark:text-amber-400" />
                            <span>Kembalikan Segmen ke Kecamatan</span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-6 space-y-4 text-xs">
                        <div className="p-3 bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1">
                            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                {kembalikanSegmenData?.namobj || kembalikanSegmenData?.nama_jalan}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex gap-3 font-mono">
                                <span>Panjang: {kembalikanSegmenData?.panjang_m}m</span>
                                <span>Lebar: {kembalikanSegmenData?.lebar_m}m</span>
                                <span>Perkerasan: {kembalikanSegmenData?.perkerasan || "—"}</span>
                            </div>
                            <p className="text-[11px] text-amber-800 dark:text-amber-300 pt-1 leading-snug">
                                Segmen akan dikembalikan ke Kecamatan dengan status <strong>verifikasi_kecamatan</strong>. Operator kecamatan dapat mengedit kembali geometri / atribut data.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="font-bold text-slate-700 dark:text-slate-300 block">
                                Catatan / Alasan Pengembalian <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                rows={3}
                                value={catatanVerifikasiInput}
                                onChange={(e) => setCatatanVerifikasiInput(e.target.value)}
                                placeholder="Tuliskan catatan perbaikan atau alasan pengembalian ke kecamatan (minimal 10 karakter)..."
                                className={cn(
                                    "w-full p-2.5 rounded-xl border bg-background text-xs text-foreground focus:outline-none focus:ring-2 transition-colors",
                                    catatanVerifikasiInput.trim().length > 0 && catatanVerifikasiInput.trim().length < 10
                                        ? "border-rose-400 focus:ring-rose-500/40"
                                        : "border-border focus:ring-amber-500/40"
                                )}
                            />
                            <p className={cn(
                                "text-[9.5px] font-medium",
                                catatanVerifikasiInput.trim().length >= 10 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                            )}>
                                {catatanVerifikasiInput.trim().length}/min 10 karakter
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-4 border-t border-border bg-slate-50/50 dark:bg-slate-900/50 flex gap-2 justify-end">
                        <Button
                            variant="outline"
                            onClick={() => setKembalikanSegmenData(null)}
                            disabled={isVerifikasiSubmitting}
                            className="h-9 text-xs cursor-pointer"
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={async () => {
                                if (!kembalikanSegmenData) return;
                                setIsVerifikasiSubmitting(true);
                                const toastId = toast.loading("Mengembalikan segmen ke Kecamatan...");
                                try {
                                    const tipeKode = activeTipe?.kode || "jalan";
                                    await monitoringService.verifikasiSegmenByBappeda(tipeKode, kembalikanSegmenData.id, {
                                        status_verifikasi: "verifikasi_kecamatan",
                                        catatan_verifikasi: catatanVerifikasiInput
                                    });

                                    // If there is an active report that is Submitted/Final, sync it to Draft with the revision note
                                    if (activeSnapshotLaporan?.id && (activeSnapshotLaporan.status === 'Submitted' || activeSnapshotLaporan.status === 'Final')) {
                                        try {
                                            await monitoringLaporanService.revertToDraft(activeSnapshotLaporan.id, {
                                                catatan: catatanVerifikasiInput,
                                                unlock_segments: false
                                            });
                                        } catch (errLap) {
                                            console.warn("Failed to sync report status on return segment:", errLap);
                                        }
                                    }

                                    toast.success("Segmen berhasil dikembalikan ke Kecamatan!", { id: toastId });
                                    setKembalikanSegmenData(null);
                                    if (onRefreshSegments) onRefreshSegments();
                                } catch (err: any) {
                                    console.error("Gagal mengembalikan segmen:", err);
                                    toast.error(err?.message || "Gagal mengembalikan segmen ke Kecamatan", { id: toastId });
                                } finally {
                                    setIsVerifikasiSubmitting(false);
                                }
                            }}
                            disabled={isVerifikasiSubmitting || catatanVerifikasiInput.trim().length < 10}
                            className="h-9 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-xs cursor-pointer gap-1.5"
                        >
                            {isVerifikasiSubmitting ? (
                                <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                                <RotateCcw className="size-3.5" />
                            )}
                            <span>Kembalikan ke Kecamatan</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
