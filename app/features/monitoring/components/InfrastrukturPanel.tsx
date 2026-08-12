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
    AlertTriangle,
    XCircle,
    PanelLeftClose
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { tryParseCoordinate, parseMultiCoordinates } from "~/utils/coordinateParser";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
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
import type { RealisasiSegmen } from "~/routes/monitoring/realisasi-infrastruktur";
import type { StatusVerifikasi } from "~/routes/monitoring/realisasi-infrastruktur/types";
import { useAuth } from "~/contexts/auth-context";
import { useInfrastrukturTipe } from "~/features/monitoring/hooks/useInfrastrukturTipe";
import { InfrastrukturCardSelector } from "./InfrastrukturCardSelector";
import { InfrastrukturTipeCard } from "./InfrastrukturTipeCard";
import type { RealisasiEntry } from "~/features/monitoring/services/realisasi.service";
import { monitoringService } from "~/features/monitoring/services/monitoring.service";
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
    isAttributeDialogOpen,
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
    inputPanjang = 10,
    setInputPanjang,
    inputLebar = 6,
    setInputLebar,
    handleGenerateDimensionArea,
    lockedSegmenIds = new Set(),
    onToggleSidebar
}) => {
    const { user } = useAuth();
    const hookState = useInfrastrukturTipe();
    const tipes = propsTipes || hookState.tipes;
    const activeTipe = propsActiveTipe !== undefined ? propsActiveTipe : hookState.activeTipe;
    const setActiveTipe = propsSetActiveTipe || hookState.setActiveTipe;
    const [kecOpen, setKecOpen] = React.useState(false);
    const [desaOpen, setDesaOpen] = React.useState(false);

    // Helper: Determine if a specific segment ID is locked via monitoring_laporan_segmen or verifikasi_bappeda status
    // Note: 'dikembalikan' is NOT locked — operator_kecamatan can edit the segment again
    const isSegmentLocked = (segmentId: string, segmentStatus?: string) => {
        if (segmentStatus === 'verifikasi_bappeda' || segmentStatus === 'terverifikasi') {
            return true;
        }
        if (lockedSegmenIds && lockedSegmenIds.size > 0) {
            return lockedSegmenIds.has(segmentId.toString());
        }
        return false;
    };


    const [searchQuery, setSearchQuery] = React.useState("");
    const [suggestions, setSuggestions] = React.useState<any[]>([]);
    const [isSearching, setIsSearching] = React.useState(false);
    const [activePanel, setActivePanel] = React.useState<"batas" | "coordinate">("batas");
    const [comboboxOpen, setComboboxOpen] = React.useState(false);

    // Coordinate search forms states
    const [coordInput, setCoordInput] = React.useState("");
    const [parsedCoordCount, setParsedCoordCount] = React.useState(0);
    const [isPrinting, setIsPrinting] = React.useState(false);
    const [isKirimDialogOpen, setIsKirimDialogOpen] = React.useState(false);
    const [isSubmittingKirim, setIsSubmittingKirim] = React.useState(false);

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
                : r.status_verifikasi === 'dikembalikan'
        ).length;
    }, [listFilteredByYear, isBappedaOrAdminUser]);



    return (
        <div className={cn("bg-card flex flex-col h-full transition-all duration-300 ease-in-out overflow-hidden", className)}>
            {/* Mobile Bottom Sheet Handle */}
            <div className="md:hidden flex justify-center pt-2.5 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-slate-350 dark:bg-slate-650" />
            </div>

            {/* Location Selection & Search Panel */}
            <div className="p-4 border-b border-border bg-muted/30 space-y-3 relative">
                {/* Search Bar Input */}
                <div className="flex items-center gap-2 w-full">
                    <div className="flex-1 flex items-center gap-1.5 p-1 bg-background border border-input rounded-xl shadow-sm h-10 min-w-0">
                    <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-0.5 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 select-none shrink-0"
                            >
                                {activePanel === "batas" ? (
                                    <Map className="size-3.5 text-purple-500 animate-in fade-in zoom-in duration-200" />
                                ) : (
                                    <Crosshair className="size-3.5 text-blue-500 animate-in fade-in zoom-in duration-200" />
                                )}
                                <ChevronDown className="size-3" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-0" align="start">
                            <Command>
                                <CommandList>
                                    <CommandGroup>
                                        <CommandItem
                                            value="batas"
                                            onSelect={() => {
                                                setActivePanel("batas");
                                                setComboboxOpen(false);
                                            }}
                                            className="text-xs cursor-pointer gap-2 py-2"
                                        >
                                            <Map className="size-3.5 text-purple-500" />
                                            <span>Batas Administrasi</span>
                                        </CommandItem>
                                        <CommandItem
                                            value="coordinate"
                                            onSelect={() => {
                                                setActivePanel("coordinate");
                                                setComboboxOpen(false);
                                            }}
                                            className="text-xs cursor-pointer gap-2 py-2"
                                        >
                                            <Crosshair className="size-3.5 text-blue-500" />
                                            <span>Pencarian Koordinat</span>
                                        </CommandItem>
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>

                    <div className="h-6 w-[1px] bg-border shrink-0" />

                    <div className="relative flex-1 flex items-center min-w-0">
                        <Input
                            type="text"
                            placeholder="Cari Lokasi ..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddressSearch();
                            }}
                            className="pr-7 pl-2 h-8 border-none shadow-none focus-visible:ring-0 text-xs bg-transparent w-full"
                        />
                        <div className="absolute right-1.5 flex items-center gap-1.5">
                            {isSearching ? (
                                <Loader2 className="size-3.5 text-slate-400 animate-spin" />
                            ) : (
                                <>
                                    {(searchQuery || hasSearchPin) && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearchQuery("");
                                                setSuggestions([]);
                                                onClearSearchPin();
                                                if (activePanel !== "batas") {
                                                    setActivePanel("batas");
                                                }
                                            }}
                                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none transition-colors p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                                        >
                                            <X className="size-3.5" />
                                        </button>
                                    )}
                                    <Search
                                        className="size-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
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
                    <div className="absolute left-4 right-4 top-[56px] z-30 bg-background border border-border rounded-xl shadow-lg p-1 max-h-48 overflow-y-auto custom-scrollbar">
                        {suggestions.map((item, index) => (
                            <button
                                key={index}
                                onClick={() => handleSelectSuggestion(item)}
                                className="w-full text-left px-3 py-1.5 text-[10px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg flex items-start gap-1.5 border-b border-slate-50 last:border-b-0"
                            >
                                <PinIcon className="size-3 text-red-500 shrink-0 mt-0.5" />
                                <span className="truncate">{item.display_name}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Inline Forms depending on activePanel */}
                {activePanel === "batas" && (
                    <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-200">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Kecamatan</Label>
                            <Popover open={kecOpen} onOpenChange={setKecOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={kecOpen}
                                        className="w-full h-8 text-[11px] font-medium justify-between bg-background border-input rounded-lg px-2.5"
                                        disabled={isFormOpen || user?.role === 'operator_desa'}
                                    >
                                        <span className="truncate">
                                            {selectedKec ? (kecamatanList.find(k => k.id.toString() === selectedKec)?.nama_kecamatan || "Pilih...") : "Pilih..."}
                                        </span>
                                        <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 w-[180px]" align="start">
                                    <Command>
                                        <CommandInput placeholder="Cari kecamatan..." className="h-8 text-[11px]" />
                                        <CommandList>
                                            <CommandEmpty className="text-xs py-2 text-center text-muted-foreground">Tidak ditemukan.</CommandEmpty>
                                            <CommandGroup>
                                                {kecamatanList.map(k => (
                                                    <CommandItem
                                                        key={k.id}
                                                        value={k.nama_kecamatan}
                                                        onSelect={() => {
                                                            setSelectedKec(k.id.toString());
                                                            setSelectedDesa("");
                                                            setKecOpen(false);
                                                        }}
                                                        className="text-xs cursor-pointer font-medium uppercase"
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-3.5 w-3.5",
                                                                selectedKec === k.id.toString() ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {k.nama_kecamatan}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Desa</Label>
                            <Popover open={desaOpen} onOpenChange={setDesaOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={desaOpen}
                                        className="w-full h-8 text-[11px] font-medium justify-between bg-background border-input rounded-lg px-2.5"
                                        disabled={!selectedKec || isFormOpen || user?.role === 'operator_desa'}
                                    >
                                        <span className="truncate">
                                            {selectedDesa ? (desaList.find(d => d.id.toString() === selectedDesa)?.nama_desa || "Pilih...") : "Pilih..."}
                                        </span>
                                        <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 w-[180px]" align="start">
                                    <Command>
                                        <CommandInput placeholder="Cari desa..." className="h-8 text-[11px]" />
                                        <CommandList>
                                            <CommandEmpty className="text-xs py-2 text-center text-muted-foreground">Tidak ditemukan.</CommandEmpty>
                                            <CommandGroup>
                                                {desaList.map(d => (
                                                    <CommandItem
                                                        key={d.id}
                                                        value={d.nama_desa}
                                                        onSelect={() => {
                                                            setSelectedDesa(d.id.toString());
                                                            setDesaOpen(false);
                                                        }}
                                                        className="text-xs cursor-pointer font-medium uppercase"
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-3.5 w-3.5",
                                                                selectedDesa === d.id.toString() ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {d.nama_desa}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                )}

                {activePanel === "coordinate" && (
                    <div className="bg-background border border-border rounded-xl p-3 space-y-3 animate-in fade-in duration-200">
                        <div className="space-y-1">
                            <Label className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider block">
                                Input Koordinat (Desimal atau DMS)
                            </Label>
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
                <div className="flex gap-1.5 pt-2 border-t border-border/40 items-center">
                    <Select
                        value={selectedTahunFilter}
                        onValueChange={setSelectedTahunFilter}
                        disabled={isFormOpen || !activeTipe || realisasiList.length === 0}
                    >
                        <SelectTrigger className="h-8 text-[11px] font-medium bg-background border-input rounded-lg flex-1">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                            <SelectItem value="Semua" className="text-xs">Semua Tahun</SelectItem>
                            {uniqueYears.map(y => (
                                <SelectItem key={y} value={y} className="text-xs">{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={onRefreshSegments}
                                disabled={isFormOpen || isLoading}
                                className="h-8 w-8 shrink-0 rounded-lg border-input bg-background hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30 transition-colors disabled:opacity-50"
                            >
                                <RefreshCw className={cn("size-3.5 text-emerald-600 dark:text-emerald-400", isLoading && "animate-spin")} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Refresh / Perbarui Daftar Segmen Realisasi</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={onZoomToFiltered}
                                disabled={isFormOpen}
                                className="h-8 w-8 shrink-0 rounded-lg border-input bg-background hover:bg-indigo-500/10 hover:text-indigo-600 hover:border-indigo-500/30 transition-colors disabled:opacity-50"
                            >
                                <Maximize2 className="size-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Zoom peta ke semua segmen berdasarkan filter tahun</TooltipContent>
                    </Tooltip>
                    {(user?.role === 'operator_bappeda' || user?.role === 'super_admin' || user?.role === 'admin') ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={async () => {
                                        if (selectedTahunFilter === "Semua") {
                                            toast.warning("Pilih tahun anggaran terlebih dahulu.");
                                            return;
                                        }
                                        setIsPrinting(true);
                                        try {
                                            await onPrintBeritaAcara(selectedDesa, selectedTahunFilter);
                                        } finally {
                                            setIsPrinting(false);
                                        }
                                    }}
                                    disabled={isFormOpen || selectedTahunFilter === "Semua" || isPrinting || isYearLocked}
                                    className="h-8 w-8 shrink-0 rounded-lg border-input bg-background hover:bg-violet-500/10 hover:text-violet-600 hover:border-violet-500/30 transition-colors disabled:opacity-40"
                                >
                                    {isPrinting ? (
                                        <Loader2 className="size-3.5 animate-spin text-violet-600" />
                                    ) : (
                                        <Sparkles className="size-3.5 text-violet-600" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {selectedTahunFilter === "Semua"
                                    ? "Pilih tahun anggaran untuk finalisasi digitasi"
                                    : isYearLocked
                                        ? `Snapshot TA ${selectedTahunFilter} telah dilakukan (Sudah Final)`
                                        : `Finalisasi & Snapshot Digitasi TA ${selectedTahunFilter}`}
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                        if (!selectedDesa) {
                                            toast.warning("Silakan pilih wilayah desa terlebih dahulu.");
                                            return;
                                        }
                                        if (listFilteredByYear.length === 0) {
                                            toast.warning("Tidak ada segmen digitasi untuk dikirimkan.");
                                            return;
                                        }
                                        setIsKirimDialogOpen(true);
                                    }}
                                    disabled={isFormOpen || !selectedDesa || listFilteredByYear.length === 0}
                                    className="h-8 w-8 shrink-0 rounded-lg border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-colors disabled:opacity-40"
                                >
                                    <Send className="size-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                                Kirim Hasil Digitasi Segmen ke Bappeda
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
                {!activeTipe ? (
                    <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Daftar Infrastruktur
                            </h3>
                            {tipes && tipes.length > 0 && (
                                <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                                    {tipes.length} Tipe Tersedia
                                </span>
                            )}
                        </div>

                        {isLoading && (!tipes || tipes.length === 0) ? (
                            <div className="grid grid-cols-2 gap-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                                ))}
                            </div>
                        ) : !tipes || tipes.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 space-y-2">
                                <Database className="size-8 mx-auto text-slate-300 dark:text-slate-600" />
                                <p className="text-xs font-medium">Tidak ada tipe infrastruktur tersedia.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {tipes.map((tipe) => (
                                    <InfrastrukturTipeCard
                                        key={tipe.kode}
                                        tipe={tipe}
                                        onClick={(selected) => {
                                            setActiveTipe(selected);
                                            if (selected.kode === 'jalan_lingkungan') {
                                                setTipeJalanDigitasi('lingkungan');
                                            } else {
                                                setTipeJalanDigitasi('poros');
                                            }
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ) : isFormOpen ? (
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
                    /* Segments List View */
                    <div className="p-3 space-y-4">
                        <div className="flex items-center gap-2 px-0.5 pb-2.5 mb-0.5 border-b border-border/50">
                            {/* Tombol Kembali ke Tipe Cards */}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveTipe(null)}
                                className="h-7 px-2 gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-350 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg shrink-0 cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span>Kembali</span>
                            </Button>

                            <div className="h-4 w-[1px] bg-border shrink-0" />

                            {/* Icon + Label */}
                            <div className="flex items-center justify-center size-6 rounded-md bg-indigo-500/10 dark:bg-indigo-500/20 shrink-0">
                                <Layers className="size-3.5 text-indigo-500 dark:text-indigo-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-bold text-foreground/80 tracking-tight leading-none truncate">Daftar Segmen</span>
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

                        {/* Tab filter status verifikasi */}
                        {listFilteredByYear.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 px-0.5 pt-1">
                                {(isBappedaOrAdminUser ? [
                                    { value: "all", label: "Semua", count: listFilteredByYear.length },
                                    { value: "verifikasi_bappeda", label: "Menunggu", count: listFilteredByYear.filter(r => r.status_verifikasi === 'verifikasi_bappeda').length },
                                    { value: "terverifikasi", label: "Disetujui", count: listFilteredByYear.filter(r => r.status_verifikasi === 'terverifikasi').length },
                                    { value: "verifikasi_kecamatan", label: "Draft", count: listFilteredByYear.filter(r => r.status_verifikasi === 'verifikasi_kecamatan' || !r.status_verifikasi).length },
                                ] : [
                                    { value: "all", label: "Semua", count: listFilteredByYear.length },
                                    { value: "verifikasi_kecamatan", label: "Draft", count: listFilteredByYear.filter(r => r.status_verifikasi === 'verifikasi_kecamatan' || !r.status_verifikasi).length },
                                    { value: "verifikasi_bappeda", label: "Terkirim", count: listFilteredByYear.filter(r => r.status_verifikasi === 'verifikasi_bappeda').length },
                                    { value: "terverifikasi", label: "Disetujui", count: listFilteredByYear.filter(r => r.status_verifikasi === 'terverifikasi').length },
                                ]).map(tab => (
                                    <button
                                        key={tab.value}
                                        onClick={() => setFilterVerifikasi(tab.value)}
                                        className={cn(
                                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all duration-150 cursor-pointer",
                                            filterVerifikasi === tab.value
                                                ? tab.value === 'verifikasi_bappeda'
                                                    ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                                                    : tab.value === 'terverifikasi'
                                                        ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                                                        : tab.value === 'dikembalikan'
                                                            ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                                                            : "bg-indigo-500 text-white border-indigo-500 shadow-sm"
                                                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                                        )}
                                    >
                                        <span>{tab.label}</span>
                                        {tab.count > 0 && (
                                            <span className={cn(
                                                "inline-flex items-center justify-center min-w-[14px] h-3.5 px-0.5 rounded-full text-[8px] font-extrabold",
                                                filterVerifikasi === tab.value ? "bg-white/30" : "bg-muted-foreground/20"
                                            )}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {listFilteredByYear.length === 0 ? (
                            <div className="text-center py-10 text-slate-500 space-y-3 bg-muted/10 rounded-2xl border border-dashed border-border/80 mx-2">
                                <Database className="size-8 mx-auto text-muted-foreground/60" />
                                <p className="text-xs font-medium">
                                    {realisasiList.length === 0
                                        ? "Belum ada data realisasi segmen di desa ini."
                                        : `Belum ada data realisasi segmen untuk TA ${selectedTahunFilter}.`}
                                </p>
                            </div>
                        ) : listFilteredByVerifikasi.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 space-y-2 bg-muted/10 rounded-2xl border border-dashed border-border/80 mx-2">
                                <Database className="size-7 mx-auto text-muted-foreground/60" />
                                <p className="text-xs font-medium">Tidak ada segmen dengan status ini.</p>
                                <button onClick={() => setFilterVerifikasi("all")} className="text-[10px] font-bold text-indigo-500 hover:underline cursor-pointer">Tampilkan semua</button>
                            </div>
                        ) : (
                            <div className="space-y-3 px-1 pb-4">
                                {listFilteredByVerifikasi.map(r => (
                                    <div
                                        key={r.id}
                                        className={cn(
                                            "group p-2.5 border border-border/80 rounded-xl bg-card hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all duration-200 relative",
                                            r.kondisi === "BAIK" && "border-l-[3px] border-l-emerald-500",
                                            r.kondisi === "SEDANG" && "border-l-[3px] border-l-sky-500",
                                            r.kondisi === "RUSAK_RINGAN" && "border-l-[3px] border-l-amber-500",
                                            r.kondisi === "RUSAK_BERAT" && "border-l-[3px] border-l-rose-500"
                                        )}
                                        onMouseEnter={() => onHoverSegment(r.id)}
                                        onMouseLeave={() => onHoverSegment(null)}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <h3 className="text-xs font-semibold leading-snug text-foreground/90 break-words" title={r.namobj || r.nama_jalan}>
                                                        {r.namobj || r.nama_jalan}
                                                    </h3>
                                                    {/* Verifikasi Status Badge */}
                                                    {(() => {
                                                        const sv = r.status_verifikasi;
                                                        const badgeCfg: Record<string, { label: string; cls: string }> = {
                                                            verifikasi_bappeda: { label: "Menunggu Verifikasi", cls: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700" },
                                                            dikembalikan: { label: "Dikembalikan", cls: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700" },
                                                            terverifikasi: { label: "Disetujui", cls: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700" },
                                                        };
                                                        const cfg = sv ? badgeCfg[sv] : null;
                                                        if (!cfg) return null;
                                                        return (
                                                            <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border text-[8.5px] font-bold shrink-0", cfg.cls)}>
                                                                {sv === 'verifikasi_bappeda' && <span>🕐</span>}
                                                                {sv === 'dikembalikan' && <RotateCcw className="w-2 h-2" />}
                                                                {sv === 'terverifikasi' && <CheckCircle2 className="w-2 h-2" />}
                                                                {cfg.label}
                                                            </span>
                                                        );
                                                    })()}
                                                    {(() => {
                                                         const isBoundToBa = !!(lockedSegmenIds && lockedSegmenIds.size > 0 && lockedSegmenIds.has(r.id.toString()));
                                                         const isBaFinal = (r as any).status_verifikasi === "terverifikasi" && isBoundToBa;
                                                         const isLocked = isSegmentLocked(r.id.toString(), (r as any).status_verifikasi);

                                                         if (!isLocked) return null;

                                                         return (
                                                             <Tooltip>
                                                                 <TooltipTrigger asChild>
                                                                     <span className={cn(
                                                                         "inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 cursor-help",
                                                                         isBaFinal
                                                                             ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                                                             : (r as any).status_verifikasi === "verifikasi_bappeda"
                                                                                 ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30"
                                                                                 : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                                                     )}>
                                                                         <Lock className="size-2.5" />
                                                                         {isBaFinal ? "BA FINAL" :
                                                                          (r as any).status_verifikasi === "verifikasi_bappeda" ? "TERKIRIM BAPPEDA" :
                                                                          (r as any).status_verifikasi === "terverifikasi" ? "TERVERIFIKASI" :
                                                                          "DIKUNCI"}
                                                                     </span>
                                                                 </TooltipTrigger>
                                                                 <TooltipContent className="text-xs">
                                                                     {isBaFinal
                                                                         ? `Segmen ini telah difinalisasi dalam Berita Acara Resmi TA ${r.tahun_anggaran || selectedTahunFilter} oleh Operator Bappeda.`
                                                                         : (r as any).status_verifikasi === 'verifikasi_bappeda'
                                                                             ? "Segmen ini telah dikirimkan ke Bappeda dan dikunci dari pengeditan."
                                                                             : "Segmen ini dikunci dari pengeditan/penghapusan."}
                                                                 </TooltipContent>
                                                             </Tooltip>
                                                         );
                                                     })()}
                                                 </div>
                                             </div>
                                         </div>

                                         {/* Tabular Info Row */}
                                         <div className="mt-2 flex flex-wrap items-center gap-y-1 gap-x-1.5 text-[9px] text-muted-foreground font-mono">
                                             <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                 P: {parseFloat(r.panjang_m.toString()).toFixed(2)}m
                                             </span>
                                             <span className="text-border">|</span>
                                             <span className="font-semibold text-foreground">
                                                 L: {r.lebar_m}m
                                             </span>
                                             <span className="text-border">|</span>
                                             <span className="font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1 rounded text-[8.5px] uppercase font-sans">
                                                 {r.perkerasan || "—"}
                                             </span>
                                             <span className="text-border">|</span>
                                             <span className={cn(
                                                 "font-semibold px-1 rounded text-[8.5px] uppercase font-sans",
                                                 r.status_jalan?.toUpperCase() === "MANTAP"
                                                     ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                     : r.status_jalan?.toUpperCase() === "TIDAK MANTAP"
                                                         ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                                         : "bg-slate-500/10 text-slate-550"
                                             )}>
                                                 {r.status_jalan || "Status: —"}
                                             </span>
                                             {isBappedaOrAdminUser && (
                                                 <>
                                                     <span className="text-border">|</span>
                                                     <span className={cn(
                                                         "font-semibold px-1 rounded text-[8.5px] uppercase font-sans",
                                                         isMasterConnected(r)
                                                             ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                                                             : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-450"
                                                     )}>
                                                         {isMasterConnected(r) ? `Master: ${r.snapped_road_id || 'Terikat'}` : "Segmen Non-Master"}
                                                     </span>
                                                 </>
                                             )}
                                             <span className="text-border">|</span>
                                             <span className="text-slate-400 dark:text-slate-500">
                                                 TA {r.tahun_anggaran}
                                             </span>
                                         </div>

                                         {/* Catatan Verifikasi Bappeda */}
                                         {r.status_verifikasi === 'dikembalikan' && r.catatan_verifikasi && (
                                             <div className="mt-2 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-[10px] text-rose-900 dark:text-rose-200 font-sans flex items-start gap-1.5">
                                                 <RotateCcw className="size-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                                                 <div>
                                                     <span className="font-bold block mb-0.5">Catatan Pengembalian dari Bappeda:</span>
                                                     <span className="opacity-90 block font-mono text-[9.5px] leading-relaxed">{r.catatan_verifikasi}</span>
                                                 </div>
                                             </div>
                                         )}
                                         {r.status_verifikasi !== 'dikembalikan' && r.catatan_verifikasi && (
                                             <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[10px] text-amber-900 dark:text-amber-300 font-sans flex items-start gap-1.5">
                                                 <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                                 <div>
                                                     <span className="font-bold block">Catatan Verifikasi Bappeda:</span>
                                                     <span className="opacity-90 block font-mono text-[9.5px]">{r.catatan_verifikasi}</span>
                                                 </div>
                                             </div>
                                         )}

                                         {/* Footer Action Buttons */}
                                         <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center gap-1.5">
                                             <Tooltip>
                                                 <TooltipTrigger asChild>
                                                     <Button
                                                         onClick={() => zoomToSegment(r.id)}
                                                         variant="ghost"
                                                         size="icon"
                                                         className="h-6 w-6 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-md transition-colors"
                                                     >
                                                         <Maximize2 className="size-3" />
                                                     </Button>
                                                 </TooltipTrigger>
                                                 <TooltipContent>Zoom ke Segmen</TooltipContent>
                                             </Tooltip>
                                             {(() => {
                                                  const isBappedaOrAdmin = user?.role === 'operator_bappeda' || user?.role === 'super_admin' || user?.role === 'admin';
                                                  const canEditAttributes = isBappedaOrAdmin || !isSegmentLocked(r.id.toString(), (r as any).status_verifikasi);
                                                  return (
                                                      <Tooltip>
                                                          <TooltipTrigger asChild>
                                                              <Button
                                                                  onClick={() => handleEditAttributesOnly(r)}
                                                                  variant="ghost"
                                                                  size="icon"
                                                                  className="h-6 w-6 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-md transition-colors"
                                                                  disabled={!canEditAttributes}
                                                              >
                                                                  <FileEdit className="size-3" />
                                                              </Button>
                                                          </TooltipTrigger>
                                                          <TooltipContent>
                                                              {canEditAttributes ? "Edit Atribut Saja" : "Segmen Dikunci (Tidak dapat diedit)"}
                                                          </TooltipContent>
                                                      </Tooltip>
                                                  );
                                              })()}
                                             {!isSegmentLocked(r.id.toString(), (r as any).status_verifikasi) ? (
                                                 <>
                                                     <Tooltip>
                                                         <TooltipTrigger asChild>
                                                             <Button
                                                                 onClick={() => handleEditGeometryAndAttributes(r)}
                                                                 variant="ghost"
                                                                 size="icon"
                                                                 className="h-6 w-6 text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-md transition-colors"
                                                             >
                                                                 <PinIcon className="size-3" />
                                                             </Button>
                                                         </TooltipTrigger>
                                                         <TooltipContent>Edit Geometri & Atribut</TooltipContent>
                                                     </Tooltip>
                                                     <Tooltip>
                                                         <TooltipTrigger asChild>
                                                             <Button
                                                                 onClick={() => handleSplitSegmen && handleSplitSegmen(r)}
                                                                 variant="ghost"
                                                                 size="icon"
                                                                 className="h-6 w-6 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-md transition-colors"
                                                             >
                                                                 <Scissors className="size-3" />
                                                             </Button>
                                                         </TooltipTrigger>
                                                         <TooltipContent>Split Segmen</TooltipContent>
                                                     </Tooltip>
                                                     {user?.role === 'operator_kecamatan' && (
                                                         <Tooltip>
                                                             <TooltipTrigger asChild>
                                                                 <Button
                                                                     onClick={() => onKirimDigitasi && onKirimDigitasi(r)}
                                                                     variant="ghost"
                                                                     size="sm"
                                                                     className="h-6 px-2 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-md transition-colors gap-1"
                                                                 >
                                                                     <Send className="size-3" />
                                                                     <span>Kirim Bappeda</span>
                                                                 </Button>
                                                             </TooltipTrigger>
                                                             <TooltipContent>Kirim Hasil Digitasi Segmen ke Bappeda</TooltipContent>
                                                         </Tooltip>
                                                     )}
                                                     <div className="flex-1" />
                                                     <Tooltip>
                                                         <TooltipTrigger asChild>
                                                             <Button
                                                                 onClick={() => handleDelete(r.id)}
                                                                 variant="ghost"
                                                                 size="icon"
                                                                 className="h-6 w-6 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-md transition-colors"
                                                             >
                                                                 <Trash2 className="size-3" />
                                                             </Button>
                                                         </TooltipTrigger>
                                                         <TooltipContent>Hapus Segmen</TooltipContent>
                                                     </Tooltip>
                                                 </>
                                             ) : (() => {
                                                  const isBappedaOrAdmin = user?.role === 'operator_bappeda' || user?.role === 'super_admin' || user?.role === 'admin';
                                                  const isBoundToBa = !!(lockedSegmenIds && lockedSegmenIds.size > 0 && lockedSegmenIds.has(r.id.toString()));
                                                  const segStatus = (r as any).status_verifikasi as string;
                                                  // isBaFinal: terverifikasi DAN terikat dalam snapshot BA → hanya edit atribut
                                                  const isBaFinal = segStatus === "terverifikasi" && isBoundToBa;
                                                  // Batalkan: terverifikasi tapi BELUM terikat snapshot BA → bisa dibatalkan ke verifikasi_bappeda
                                                  const showBatalkan = isBappedaOrAdmin && segStatus === 'terverifikasi' && !isBoundToBa;
                                                  // Kembalikan + Setujui: hanya saat verifikasi_bappeda
                                                  const showVerifikasiActions = isBappedaOrAdmin && segStatus === 'verifikasi_bappeda';

                                                  return (
                                                      <div className="ml-auto flex items-center gap-1.5">
                                                          {/* Batalkan: terverifikasi tapi belum BA Final */}
                                                          {showBatalkan && (
                                                              <Tooltip>
                                                                  <TooltipTrigger asChild>
                                                                      <Button
                                                                          onClick={async () => {
                                                                              const toastId = toast.loading("Membatalkan verifikasi...");
                                                                              try {
                                                                                  const tipeKode = activeTipe?.kode || 'jalan';
                                                                                  await monitoringService.verifikasiSegmenByBappeda(tipeKode, r.id, {
                                                                                      status_verifikasi: 'verifikasi_bappeda'
                                                                                  });
                                                                                  toast.success("Verifikasi segmen berhasil dibatalkan!", { id: toastId });
                                                                                  if (onRefreshSegments) onRefreshSegments();
                                                                              } catch (err: any) {
                                                                                  toast.error(err?.message || "Gagal membatalkan verifikasi", { id: toastId });
                                                                              }
                                                                          }}
                                                                          variant="ghost"
                                                                          size="sm"
                                                                          className="h-6 px-2 text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 rounded-md transition-colors gap-1 cursor-pointer"
                                                                      >
                                                                          <XCircle className="size-3" />
                                                                          <span>Batalkan</span>
                                                                      </Button>
                                                                  </TooltipTrigger>
                                                                  <TooltipContent>Batalkan verifikasi, kembalikan ke status Verifikasi Bappeda</TooltipContent>
                                                              </Tooltip>
                                                          )}

                                                          {/* Kembalikan + Setujui: hanya saat verifikasi_bappeda */}
                                                          {showVerifikasiActions && (
                                                              <>
                                                                  <Tooltip>
                                                                      <TooltipTrigger asChild>
                                                                          <Button
                                                                              onClick={() => {
                                                                                  setKembalikanSegmenData(r);
                                                                                  setCatatanVerifikasiInput((r as any).catatan_verifikasi || "");
                                                                              }}
                                                                              variant="ghost"
                                                                              size="sm"
                                                                              className="h-6 px-2 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-md transition-colors gap-1 cursor-pointer"
                                                                          >
                                                                              <RotateCcw className="size-3" />
                                                                              <span>Kembalikan</span>
                                                                          </Button>
                                                                      </TooltipTrigger>
                                                                      <TooltipContent>Kembalikan segmen ke Operator Kecamatan</TooltipContent>
                                                                  </Tooltip>

                                                                  <Tooltip>
                                                                      <TooltipTrigger asChild>
                                                                          <Button
                                                                              onClick={async () => {
                                                                                  const toastId = toast.loading("Memverifikasi segmen...");
                                                                                  try {
                                                                                      const tipeKode = activeTipe?.kode || 'jalan';
                                                                                      await monitoringService.verifikasiSegmenByBappeda(tipeKode, r.id, {
                                                                                          status_verifikasi: 'terverifikasi'
                                                                                      });
                                                                                      toast.success("Segmen berhasil diverifikasi!", { id: toastId });
                                                                                      if (onRefreshSegments) onRefreshSegments();
                                                                                  } catch (err: any) {
                                                                                      toast.error(err?.message || "Gagal memverifikasi segmen", { id: toastId });
                                                                                  }
                                                                              }}
                                                                              variant="ghost"
                                                                              size="sm"
                                                                              className="h-6 px-2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-md transition-colors gap-1 cursor-pointer"
                                                                          >
                                                                              <CheckCircle2 className="size-3" />
                                                                              <span>Setujui</span>
                                                                          </Button>
                                                                      </TooltipTrigger>
                                                                      <TooltipContent>Setujui verifikasi segmen ini</TooltipContent>
                                                                  </Tooltip>
                                                              </>
                                                          )}

                                                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 dark:text-slate-400" title={isBaFinal ? "Geometri dikunci karena terikat Berita Acara Final Bappeda" : "Segmen dikunci karena telah dikirimkan ke Bappeda"}>
                                                              <Lock className={cn("size-2.5", isBaFinal ? "text-emerald-500" : "text-indigo-500")} />
                                                              <span>{isBaFinal ? "Geometri Dikunci" : "Dikunci"}</span>
                                                          </span>
                                                      </div>
                                                  );
                                              })()}
                                        </div>
                                    </div>
                                ))}
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
            ) : !activeTipe ? null : (
                <div className="p-4 border-t border-border bg-card sticky bottom-0 z-20">
                    <Button
                        onClick={() => {
                            if (activeTipe.kode === 'jalan_lingkungan') {
                                setTipeJalanDigitasi('lingkungan');
                            } else {
                                setTipeJalanDigitasi('poros');
                            }
                            setIsFormOpen(true);
                            startDraw();
                        }}
                        style={{
                            backgroundColor: activeTipe?.warna || undefined
                        }}
                        className={cn(
                            "w-full h-9 text-xs font-bold rounded-lg shadow-md flex items-center justify-center gap-1.5 transition-all text-white",
                            !activeTipe?.warna && "bg-emerald-600 hover:bg-emerald-700"
                        )}
                        disabled={!selectedDesa}
                    >
                        <Plus className="size-3.5" />
                        <span>Mulai Digitasi {activeTipe?.nama || "Segmen Baru"}</span>
                    </Button>
                </div>
            )}

            {/* Dialog Konfirmasi & Daftar Segmen yang Dikirim ke Bappeda */}
            <Dialog open={isKirimDialogOpen} onOpenChange={setIsKirimDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden p-0 gap-0 border dark:border-slate-800 bg-white dark:bg-slate-950">
                    <DialogHeader className="px-6 py-4 border-b border-border bg-slate-50/50 dark:bg-slate-900/50">
                        <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Send className="size-4 text-indigo-600 dark:text-indigo-400" />
                            <span>Kirim Hasil Digitasi Segmen ke Operator Bappeda</span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-6 space-y-4 overflow-y-auto flex-1">
                        {(() => {
                            const listToKirim = listFilteredByYear.filter(r => (r as any).status_verifikasi === 'verifikasi_kecamatan' || !(r as any).status_verifikasi);

                            return (
                                <>
                                    {/* Info Summary Banner */}
                                    <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl text-xs space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-indigo-900 dark:text-indigo-200">
                                                Target Wilayah: Desa {desaList.find(d => d.id.toString() === selectedDesa)?.nama_desa || "Desa"} (Kec. {kecamatanList.find(k => k.id.toString() === selectedKec)?.nama_kecamatan || "Kecamatan"})
                                            </span>
                                            <span className="font-bold text-indigo-700 dark:text-indigo-300">
                                                TA {selectedTahunFilter}
                                            </span>
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                                            {listToKirim.length > 0 ? (
                                                <>Sebanyak <strong>{listToKirim.length} segmen</strong> dengan status <em>Belum Dikirim</em> (total panjang <strong>{listToKirim.reduce((s, r) => s + (r.panjang_m || 0), 0).toFixed(2)} m</strong>) akan dikirimkan ke Operator Bappeda.</>
                                            ) : (
                                                <span className="text-amber-600 dark:text-amber-400 font-semibold">Tidak ada segmen dengan status <em>Belum Dikirim</em> pada wilayah/tahun ini. Semua segmen sudah dikirim atau diverifikasi.</span>
                                            )}
                                        </p>
                                    </div>

                                    {/* List Table of Segments to be sent */}
                                    <div className="border border-border rounded-xl overflow-hidden text-xs">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-slate-100 dark:bg-slate-900 font-bold border-b border-border text-slate-700 dark:text-slate-300">
                                                <tr>
                                                    <th className="p-2.5 text-center w-10">No</th>
                                                    <th className="p-2.5">Nama Objek / Segmen</th>
                                                    <th className="p-2.5 text-right">Panjang</th>
                                                    <th className="p-2.5 text-center">Perkerasan</th>
                                                    <th className="p-2.5 text-center">Kondisi</th>
                                                    <th className="p-2.5 text-center">Status Verifikasi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/60 font-mono text-[11px]">
                                                {listToKirim.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="p-4 text-center text-muted-foreground font-sans italic">
                                                            Tidak ada segmen berstatus Belum Dikirim
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    listToKirim.map((r, idx) => (
                                                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                                            <td className="p-2.5 text-center font-bold text-muted-foreground">{idx + 1}</td>
                                                            <td className="p-2.5 font-bold font-sans text-slate-900 dark:text-slate-100">{r.namobj || r.nama_jalan}</td>
                                                            <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">{parseFloat(r.panjang_m.toString()).toFixed(2)}m</td>
                                                            <td className="p-2.5 text-center font-sans">{r.perkerasan || "—"}</td>
                                                            <td className="p-2.5 text-center font-sans capitalize">{r.kondisi || "Baik"}</td>
                                                            <td className="p-2.5 text-center font-sans">
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25">
                                                                    Belum Dikirim
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                    <DialogFooter className="px-6 py-4 border-t border-border bg-slate-50/50 dark:bg-slate-900/50 flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setIsKirimDialogOpen(false)} disabled={isSubmittingKirim} className="h-9 text-xs">
                            Batal
                        </Button>
                        {(() => {
                            const listToKirim = listFilteredByYear.filter(r => (r as any).status_verifikasi === 'verifikasi_kecamatan' || !(r as any).status_verifikasi);
                            return (
                                <Button
                                    onClick={async () => {
                                        setIsSubmittingKirim(true);
                                        const toastId = toast.loading("Mengirimkan digitasi segmen ke Operator Bappeda...");
                                        try {
                                            const segIds = listToKirim.map(s => s.id);
                                            const tipeKode = activeTipe?.kode || 'jalan';
                                            await monitoringService.batchSubmitSegmenToBappeda(tipeKode, {
                                                ids: segIds,
                                                id_desa: selectedDesa,
                                                tahun_pembangunan: selectedTahunFilter !== "Semua" ? selectedTahunFilter : undefined
                                            });
                                            toast.success(`${listToKirim.length} segmen digitasi berhasil dikirimkan ke Operator Bappeda!`, { id: toastId });
                                            setIsKirimDialogOpen(false);
                                            if (onRefreshSegments) onRefreshSegments();
                                        } catch (err: any) {
                                            console.error("Gagal mengirim ke Bappeda:", err);
                                            toast.error(err?.message || "Gagal mengirimkan digitasi ke Bappeda", { id: toastId });
                                        } finally {
                                            setIsSubmittingKirim(false);
                                        }
                                    }}
                                    disabled={isSubmittingKirim || listToKirim.length === 0}
                                    className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 shadow-md cursor-pointer disabled:opacity-50"
                                >
                                    {isSubmittingKirim ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                                    <span>Konfirmasi Kirim Ke Bappeda</span>
                                </Button>
                            );
                        })()}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                                Segmen akan dikembalikan ke Kecamatan dengan status <strong>dikembalikan</strong>. Operator kecamatan dapat mengedit kembali geometri / atribut data.
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
                            className="h-9 text-xs"
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
                                        status_verifikasi: "dikembalikan",
                                        catatan_verifikasi: catatanVerifikasiInput
                                    });

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
