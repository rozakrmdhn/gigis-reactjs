import React, { useState, useMemo, useCallback } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "~/components/ui/tooltip";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "~/components/ui/popover";
import {
    Maximize2,
    Minimize2,
    ChevronDown,
    ChevronUp,
    Search,
    RefreshCw,
    Layers,
    LayoutGrid,
    Table2,
    Pin,
    FileEdit,
    Scissors,
    Send,
    Trash2,
    Lock,
    CheckCircle2,
    RotateCcw,
    XCircle,
    AlertTriangle,
    X,
    Filter,
    ArrowUpDown,
    Check,
    Loader2,
    MapPin,
    Building2,
    Activity,
    SlidersHorizontal,
    Plus
} from "lucide-react";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import type { RealisasiSegmen, StatusVerifikasi } from "~/routes/monitoring/realisasi-infrastruktur/types";
import { useAuth } from "~/contexts/auth-context";
import { monitoringService } from "~/features/monitoring/services/monitoring.service";
import { monitoringLaporanService } from "~/features/monitoring/services/monitoring_laporan.service";
import { canDigitize, canSubmitMonitoring, canFinalizeMonitoring, isReadOnlyRole } from "~/utils/permissions";

export interface BottomSegmentPanelProps {
    isOpen: boolean;
    onToggleOpen: () => void;
    realisasiList: RealisasiSegmen[];
    activeTipe?: any | null;
    selectedKec?: string;
    selectedDesa?: string;
    desaName?: string;
    kecName?: string;
    selectedTahunFilter: string;
    setSelectedTahunFilter: (val: string) => void;
    zoomToSegment: (id: string) => void;
    onHoverSegment: (id: string | null) => void;
    handleEditAttributesOnly: (segment: RealisasiSegmen) => void;
    handleEditGeometryAndAttributes: (segment: RealisasiSegmen) => void;
    handleSplitSegmen?: (segment: RealisasiSegmen) => void;
    handleDelete: (id: string) => void;
    onStartDigitasi?: () => void;
    onKirimDigitasi?: (segment: RealisasiSegmen) => void;
    onBatchKirimDigitasi?: (segments: RealisasiSegmen[]) => void;
    onRefreshSegments?: () => void;
    lockedSegmenIds?: Set<string>;
    isYearLocked?: boolean;
    activeSnapshotLaporan?: any;
    isLoading?: boolean;
    className?: string;
    panelHeight?: number;
    onPanelHeightChange?: (height: number) => void;
}

type ViewMode = "table" | "cards";

const isUUID = (str: any): boolean => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export const BottomSegmentPanel: React.FC<BottomSegmentPanelProps> = ({
    isOpen,
    onToggleOpen,
    realisasiList,
    activeTipe,
    selectedKec,
    selectedDesa,
    desaName,
    kecName,
    selectedTahunFilter,
    setSelectedTahunFilter,
    zoomToSegment,
    onHoverSegment,
    handleEditAttributesOnly,
    handleEditGeometryAndAttributes,
    handleSplitSegmen,
    handleDelete,
    onStartDigitasi,
    onKirimDigitasi,
    onBatchKirimDigitasi,
    onRefreshSegments,
    lockedSegmenIds = new Set(),
    isYearLocked = false,
    activeSnapshotLaporan,
    isLoading = false,
    className,
    panelHeight: externalPanelHeight,
    onPanelHeightChange,
}) => {
    const { user } = useAuth();
    const role = (user?.role || "").toString().toLowerCase();
    const isBappedaOrAdmin = role === "operator_bappeda" || role === "bappeda" || role === "super_admin" || role === "superadmin" || role === "admin";
    const isKecamatan = role === "operator_kecamatan" || role === "kecamatan";
    const isOpd = isReadOnlyRole(user);
    const canDig = canDigitize(user);

    // Panel height state for responsive dragging
    const [internalPanelHeight, setInternalPanelHeight] = useState<number>(() => {
        if (typeof window !== "undefined") {
            return Math.min(360, Math.max(220, Math.round(window.innerHeight * 0.38)));
        }
        return 320;
    });

    const panelHeight = externalPanelHeight ?? internalPanelHeight;

    const setPanelHeight = useCallback((newH: number) => {
        setInternalPanelHeight(newH);
        onPanelHeightChange?.(newH);
    }, [onPanelHeightChange]);

    const [isDragging, setIsDragging] = useState(false);
    const dragStartYRef = React.useRef<number>(0);
    const startHeightRef = React.useRef<number>(320);

    const [viewMode, setViewMode] = useState<ViewMode>("table");

    // Drag-to-resize event handlers
    const handleDragStart = useCallback((clientY: number) => {
        setIsDragging(true);
        dragStartYRef.current = clientY;
        startHeightRef.current = panelHeight;
    }, [panelHeight]);

    React.useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaY = dragStartYRef.current - e.clientY;
            const newHeight = startHeightRef.current + deltaY;
            const minHeight = 160;
            const maxHeight = window.innerHeight - 70;
            const clamped = Math.min(Math.max(newHeight, minHeight), maxHeight);
            setPanelHeight(clamped);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                const deltaY = dragStartYRef.current - e.touches[0].clientY;
                const newHeight = startHeightRef.current + deltaY;
                const minHeight = 160;
                const maxHeight = window.innerHeight - 70;
                const clamped = Math.min(Math.max(newHeight, minHeight), maxHeight);
                setPanelHeight(clamped);
            }
        };

        const handleTouchEnd = () => {
            setIsDragging(false);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        window.addEventListener("touchmove", handleTouchMove, { passive: true });
        window.addEventListener("touchend", handleTouchEnd);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleTouchEnd);
        };
    }, [isDragging]);

    // Filters and Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [filterVerifikasi, setFilterVerifikasi] = useState<string>("all");
    const [filterKondisi, setFilterKondisi] = useState<string>("all");
    const [filterStatusKondisi, setFilterStatusKondisi] = useState<string>("all");
    const [filterSumberDana, setFilterSumberDana] = useState<string>("all");
    const [filterPoros, setFilterPoros] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"nama" | "panjang" | "kondisi" | "status_kondisi" | "sumber_dana" | "tahun" | "verifikasi">("nama");
    const [sortAsc, setSortAsc] = useState(true);

    // Active filter count
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (selectedTahunFilter !== "Semua") count++;
        if (filterVerifikasi !== "all") count++;
        if (filterKondisi !== "all") count++;
        if (filterStatusKondisi !== "all") count++;
        if (filterSumberDana !== "all") count++;
        if (filterPoros !== "all") count++;
        return count;
    }, [selectedTahunFilter, filterVerifikasi, filterKondisi, filterStatusKondisi, filterSumberDana, filterPoros]);

    const handleResetFilters = useCallback(() => {
        setSelectedTahunFilter("Semua");
        setFilterVerifikasi("all");
        setFilterKondisi("all");
        setFilterStatusKondisi("all");
        setFilterSumberDana("all");
        setFilterPoros("all");
        setSearchQuery("");
    }, [setSelectedTahunFilter]);

    // Dialog state for returning segment to Kecamatan
    const [kembalikanSegmenData, setKembalikanSegmenData] = useState<RealisasiSegmen | null>(null);
    const [catatanVerifikasiInput, setCatatanVerifikasiInput] = useState("");
    const [isVerifikasiSubmitting, setIsVerifikasiSubmitting] = useState(false);

    // Helper: Determine if a specific segment ID is locked
    const isSegmentLocked = useCallback((segmentId: string, segmentStatus?: string) => {
        if (activeSnapshotLaporan && (activeSnapshotLaporan.status === "Draft" || activeSnapshotLaporan.status === "Revisi")) {
            return false;
        }
        if (isYearLocked || (lockedSegmenIds && lockedSegmenIds.has(segmentId.toString()))) {
            return true;
        }
        if (segmentStatus === "verifikasi_bappeda") {
            return true;
        }
        if (segmentStatus === "terverifikasi") {
            return true;
        }
        return false;
    }, [activeSnapshotLaporan, isYearLocked, lockedSegmenIds]);

    const isMasterConnected = useCallback((r: RealisasiSegmen) => {
        return Boolean(
            r.check_melarosa ||
            (r.snapped_road_id && r.snapped_road_id !== "0") ||
            (r as any).parent_id ||
            (r as any).is_master_connected
        );
    }, []);

    // Unique years list
    const uniqueYears = useMemo(() => {
        return Array.from(new Set(realisasiList.map(r => r.tahun_anggaran?.toString()).filter(Boolean))).sort((a, b) => b.localeCompare(a));
    }, [realisasiList]);

    // Unique status kondisi list
    const uniqueStatusKondisi = useMemo(() => {
        const set = new Set<string>();
        realisasiList.forEach(r => {
            const val = r.status_kondisi || (r.atribut as any)?.status_kondisi;
            if (val) set.add(val.toString().trim());
        });
        if (set.size === 0) {
            return ["Eksisting", "Riwayat"];
        }
        return Array.from(set).sort();
    }, [realisasiList]);

    // Unique sumber dana list
    const uniqueSumberDana = useMemo(() => {
        const set = new Set<string>();
        realisasiList.forEach(r => {
            const val = r.sumber_dana || (r.atribut as any)?.sumber_dana;
            if (val) set.add(val.toString().trim());
        });
        const defaultOptions = activeTipe?.config?.attributes?.find((a: any) => a.key === 'sumber_dana')?.options || ["BKK", "DD", "ADD", "APBD", "Lainnya"];
        defaultOptions.forEach((opt: string) => set.add(opt));
        return Array.from(set).filter(Boolean).sort();
    }, [realisasiList, activeTipe]);

    // Filtered & Sorted Segments
    const processedSegments = useMemo(() => {
        let list = [...realisasiList];

        // Filter Tahun Anggaran
        if (selectedTahunFilter !== "Semua") {
            list = list.filter(r => r.tahun_anggaran?.toString() === selectedTahunFilter);
        }

        // Filter Verifikasi
        if (filterVerifikasi !== "all") {
            list = list.filter(r => r.status_verifikasi === filterVerifikasi);
        }

        // Filter Kondisi
        if (filterKondisi !== "all") {
            list = list.filter(r => r.kondisi === filterKondisi);
        }

        // Filter Status Kondisi
        if (filterStatusKondisi !== "all") {
            list = list.filter(r => {
                const sk = (r.status_kondisi || (r.atribut as any)?.status_kondisi || "Eksisting").toString().trim();
                return sk.toLowerCase() === filterStatusKondisi.toLowerCase();
            });
        }

        // Filter Sumber Dana
        if (filterSumberDana !== "all") {
            list = list.filter(r => {
                const sd = (r.sumber_dana || (r.atribut as any)?.sumber_dana || "").toString().trim();
                return sd.toLowerCase() === filterSumberDana.toLowerCase();
            });
        }

        // Filter Poros / Non Poros
        if (filterPoros === "poros") {
            list = list.filter(r => isMasterConnected(r));
        } else if (filterPoros === "non_poros") {
            list = list.filter(r => !isMasterConnected(r));
        }

        // Search Query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(r => {
                const name = (r.namobj || r.nama_jalan || "").toLowerCase();
                const rawKode = (r as any).kode_ruas || (r.atribut as any)?.kode_ruas || "";
                const kode = (!isUUID(rawKode) ? rawKode : "").toString().toLowerCase();
                const perkerasan = (r.perkerasan || "").toLowerCase();
                const sk = (r.status_kondisi || (r.atribut as any)?.status_kondisi || "").toLowerCase();
                const sd = (r.sumber_dana || (r.atribut as any)?.sumber_dana || "").toLowerCase();
                return name.includes(q) || kode.includes(q) || perkerasan.includes(q) || sk.includes(q) || sd.includes(q);
            });
        }

        // Sorting
        list.sort((a, b) => {
            let res = 0;
            if (sortBy === "nama") {
                const nameA = a.namobj || a.nama_jalan || "";
                const nameB = b.namobj || b.nama_jalan || "";
                res = nameA.localeCompare(nameB);
            } else if (sortBy === "panjang") {
                const pA = parseFloat(a.panjang_m?.toString() || "0");
                const pB = parseFloat(b.panjang_m?.toString() || "0");
                res = pA - pB;
            } else if (sortBy === "kondisi") {
                const kA = a.kondisi || "";
                const kB = b.kondisi || "";
                res = kA.localeCompare(kB);
            } else if (sortBy === "status_kondisi") {
                const skA = a.status_kondisi || (a.atribut as any)?.status_kondisi || "";
                const skB = b.status_kondisi || (b.atribut as any)?.status_kondisi || "";
                res = skA.localeCompare(skB);
            } else if (sortBy === "sumber_dana") {
                const sdA = a.sumber_dana || (a.atribut as any)?.sumber_dana || "";
                const sdB = b.sumber_dana || (b.atribut as any)?.sumber_dana || "";
                res = sdA.localeCompare(sdB);
            } else if (sortBy === "tahun") {
                res = (a.tahun_anggaran || 0) - (b.tahun_anggaran || 0);
            } else if (sortBy === "verifikasi") {
                const vA = a.status_verifikasi || "";
                const vB = b.status_verifikasi || "";
                res = vA.localeCompare(vB);
            }
            return sortAsc ? res : -res;
        });

        return list;
    }, [realisasiList, selectedTahunFilter, filterVerifikasi, filterKondisi, filterStatusKondisi, filterSumberDana, filterPoros, searchQuery, sortBy, sortAsc, isMasterConnected]);

    // Metrics summary
    const metrics = useMemo(() => {
        const totalCount = processedSegments.length;
        const totalPanjangM = processedSegments.reduce((acc, curr) => acc + (parseFloat(curr.panjang_m?.toString() || "0") || 0), 0);
        const totalPanjangKm = totalPanjangM / 1000;

        const baikCount = processedSegments.filter(s => s.kondisi === "BAIK").length;
        const sedangCount = processedSegments.filter(s => s.kondisi === "SEDANG").length;
        const rusakCount = processedSegments.filter(s => s.kondisi === "RUSAK_RINGAN" || s.kondisi === "RUSAK_BERAT").length;

        const pendingCount = processedSegments.filter(s => s.status_verifikasi === "verifikasi_bappeda").length;
        const approvedCount = processedSegments.filter(s => s.status_verifikasi === "terverifikasi").length;
        const returnedCount = processedSegments.filter(s => (s.status_verifikasi === "verifikasi_kecamatan" || !s.status_verifikasi) && s.catatan_verifikasi).length;

        return {
            totalCount,
            totalPanjangM,
            totalPanjangKm,
            baikCount,
            sedangCount,
            rusakCount,
            pendingCount,
            approvedCount,
            returnedCount,
        };
    }, [processedSegments]);

    const handleSort = (column: typeof sortBy) => {
        if (sortBy === column) {
            setSortAsc(!sortAsc);
        } else {
            setSortBy(column);
            setSortAsc(true);
        }
    };

    const getKondisiBadgeStyle = (kondisi?: string) => {
        switch (kondisi) {
            case "BAIK":
                return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
            case "SEDANG":
                return "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30";
            case "RUSAK_RINGAN":
                return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30";
            case "RUSAK_BERAT":
                return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30";
            default:
                return "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30";
        }
    };

    // ── Batch Selection Mode State & Handlers ──────────────────────────────
    const [isBatchSelectMode, setIsBatchSelectMode] = useState(false);
    const [selectedSegmentIds, setSelectedSegmentIds] = useState<Set<string>>(new Set());

    const isDraftEligible = useCallback((r: RealisasiSegmen) => {
        const isLocked = isSegmentLocked(r.id.toString(), r.status_verifikasi);
        const isDraft = !r.status_verifikasi || r.status_verifikasi === "verifikasi_kecamatan";
        const hasGeometry = parseFloat(r.panjang_m?.toString() || "0") > 0;
        return !isLocked && isDraft && hasGeometry;
    }, [isSegmentLocked]);

    const eligibleDraftSegments = useMemo(() => {
        return processedSegments.filter(isDraftEligible);
    }, [processedSegments, isDraftEligible]);

    const draftSegmentsCount = eligibleDraftSegments.length;

    const isAllDraftSelected = useMemo(() => {
        if (eligibleDraftSegments.length === 0) return false;
        return eligibleDraftSegments.every(s => selectedSegmentIds.has(s.id.toString()));
    }, [eligibleDraftSegments, selectedSegmentIds]);

    const handleToggleBatchSelectMode = useCallback(() => {
        if (eligibleDraftSegments.length === 0 && !isBatchSelectMode) {
            toast.info("Tidak ada segmen berstatus Draft yang perlu diajukan.");
            return;
        }
        setIsBatchSelectMode(prev => {
            const next = !prev;
            if (next) {
                const allDraftIds = new Set(eligibleDraftSegments.map(s => s.id.toString()));
                setSelectedSegmentIds(allDraftIds);
            } else {
                setSelectedSegmentIds(new Set());
            }
            return next;
        });
    }, [eligibleDraftSegments, isBatchSelectMode]);

    const handleToggleSelectSegment = useCallback((id: string) => {
        setSelectedSegmentIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const handleToggleSelectAll = useCallback(() => {
        if (isAllDraftSelected) {
            setSelectedSegmentIds(new Set());
        } else {
            setSelectedSegmentIds(new Set(eligibleDraftSegments.map(s => s.id.toString())));
        }
    }, [isAllDraftSelected, eligibleDraftSegments]);

    const selectedSegmentsList = useMemo(() => {
        return realisasiList.filter(s => selectedSegmentIds.has(s.id.toString()));
    }, [realisasiList, selectedSegmentIds]);

    const selectedTotalPanjangM = useMemo(() => {
        return selectedSegmentsList.reduce((acc, s) => acc + (parseFloat(s.panjang_m?.toString() || "0") || 0), 0);
    }, [selectedSegmentsList]);

    const handleConfirmBatchSubmit = useCallback(() => {
        if (selectedSegmentsList.length === 0) return;
        if (onBatchKirimDigitasi) {
            onBatchKirimDigitasi(selectedSegmentsList);
        } else if (onKirimDigitasi && selectedSegmentsList.length === 1) {
            onKirimDigitasi(selectedSegmentsList[0]);
        }
    }, [selectedSegmentsList, onBatchKirimDigitasi, onKirimDigitasi]);

    return (
        <>
            {/* 1. Floating Mini Trigger Pill (animasi muncul/menghilang ke atas & ke bawah) */}
            <div
                className={cn(
                    "absolute bottom-4 left-1/2 -translate-x-1/2 z-30 transition-all duration-300 ease-out",
                    isOpen
                        ? "translate-y-8 opacity-0 pointer-events-none scale-95"
                        : "translate-y-0 opacity-100 pointer-events-auto scale-100 delay-100",
                    className
                )}
            >
                <button
                    type="button"
                    onClick={onToggleOpen}
                    className="flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-border/90 bg-card/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl hover:shadow-2xl hover:border-indigo-500/50 text-foreground transition-all duration-200 cursor-pointer group active:scale-98"
                    title="Buka Panel Bawah Segmen"
                >
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold">
                        <span className="font-bold text-foreground">
                            Segmen
                        </span>
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                            <span>{metrics.totalCount}</span>
                            <span className="hidden sm:inline ml-1">Segmen</span>
                        </span>
                        {metrics.totalPanjangM > 0 && (
                            <span className="text-[11px] text-muted-foreground font-mono hidden sm:inline">
                                ({metrics.totalPanjangKm.toFixed(2)} km)
                            </span>
                        )}
                        {metrics.pendingCount > 0 && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                                <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <span>{metrics.pendingCount}</span>
                                <span className="hidden sm:inline"> Menunggu</span>
                            </span>
                        )}
                    </div>
                    <div className="flex items-center justify-center size-5 rounded-full bg-muted text-muted-foreground group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                        <ChevronUp className="size-3.5" />
                    </div>
                </button>
            </div>

            {/* 2. Main Sliding Bottom Panel (Animasi slide ke atas saat buka, slide ke bawah saat tutup) */}
            <div
                style={{
                    height: `${panelHeight}px`,
                    maxHeight: "calc(100vh - 70px)",
                    minHeight: "160px"
                }}
                className={cn(
                    "absolute bottom-0 left-0 right-0 z-40 flex flex-col bg-card/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-border/90 shadow-2xl",
                    isDragging
                        ? "transition-none select-none pointer-events-auto translate-y-0"
                        : "transition-transform duration-300 ease-out will-change-transform",
                    isOpen
                        ? "translate-y-0 pointer-events-auto"
                        : "translate-y-full pointer-events-none",
                    className
                )}
            >
            {/* Interactive Top Drag Handle Bar */}
            <div
                onMouseDown={(e) => {
                    e.preventDefault();
                    handleDragStart(e.clientY);
                }}
                onTouchStart={(e) => {
                    handleDragStart(e.touches[0].clientY);
                }}
                onDoubleClick={() => {
                    const isCurrentLarge = panelHeight > window.innerHeight * 0.48;
                    setPanelHeight(isCurrentLarge ? Math.round(window.innerHeight * 0.35) : Math.round(window.innerHeight * 0.68));
                }}
                className={cn(
                    "h-3.5 w-full shrink-0 flex items-center justify-center cursor-row-resize select-none bg-muted/60 hover:bg-indigo-500/10 active:bg-indigo-500/20 border-b border-border/40 transition-colors group touch-none",
                    isDragging && "bg-indigo-500/20"
                )}
                title="Tarik ke atas atau ke bawah untuk mengubah tinggi panel (Klik ganda untuk memperbesar/memperkecil)"
            >
                <div className={cn(
                    "w-12 h-1 rounded-full bg-muted-foreground/40 group-hover:bg-indigo-500 group-hover:w-20 transition-all duration-200",
                    isDragging && "bg-indigo-600 dark:bg-indigo-400 w-24 h-1.5"
                )} />
            </div>

            {/* Header Toolbar: Guaranteed Single Line on All Screen Sizes */}
            <div className="px-3 sm:px-4 py-1.5 sm:py-2 border-b border-border/80 bg-muted/40 shrink-0 flex items-center justify-between gap-2 min-w-0 select-none">
                {/* Left section: Title & Info */}
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <h3 className="text-xs sm:text-sm font-bold tracking-tight text-foreground truncate">
                            Segmen
                        </h3>
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shrink-0">
                            {metrics.totalCount}
                        </span>
                        {isLoading && realisasiList.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 shrink-0 animate-pulse">
                                <Loader2 className="size-2.5 animate-spin" />
                                <span className="hidden sm:inline">Menyinkronkan...</span>
                            </span>
                        )}
                    </div>
                </div>

                {/* Center / Quick KPI metrics (Tampil responsif hanya saat ada cukup ruang) */}
                <div className="hidden xl:flex items-center gap-2 text-xs font-medium min-w-0 shrink">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-background border border-border/80 shadow-2xs shrink-0">
                        <span className="text-muted-foreground text-[10.5px]">Total:</span>
                        <span className="font-bold text-foreground font-mono">{metrics.totalCount}</span>
                        <span className="text-muted-foreground text-[10.5px]">segmen</span>
                        <span className="text-border">|</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            {metrics.totalPanjangM > 1000 ? `${metrics.totalPanjangKm.toFixed(2)} km` : `${metrics.totalPanjangM.toFixed(1)} m`}
                        </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20" title="Kondisi Baik">
                            Baik: {metrics.baikCount}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20" title="Kondisi Sedang">
                            Sedang: {metrics.sedangCount}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20" title="Kondisi Rusak Ringan / Rusak Berat">
                            Rusak: {metrics.rusakCount}
                        </span>
                    </div>

                    {metrics.pendingCount > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse shrink-0">
                            <span className="size-1.5 rounded-full bg-amber-500" />
                            {metrics.pendingCount} Menunggu
                        </span>
                    )}
                </div>

                {/* Right section: Window Controls (Tetap satu baris di paling kanan) */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
                    {/* Mulai Digitasi Segmen Baru Button */}
                    {canDig && onStartDigitasi && (() => {
                        const hasActiveDraftAssignment = isBappedaOrAdmin || (activeSnapshotLaporan && (activeSnapshotLaporan.status === 'Draft' || activeSnapshotLaporan.status === 'Revisi'));
                        const isDigitasiDisabled = !isBappedaOrAdmin && (isYearLocked || activeSnapshotLaporan?.status === 'Final' || activeSnapshotLaporan?.status === 'Submitted' || !hasActiveDraftAssignment);

                        return (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="sm"
                                        onClick={onStartDigitasi}
                                        disabled={isDigitasiDisabled}
                                        className="h-7 text-xs font-bold gap-1 px-2 sm:px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs border border-emerald-500/30 transition-all cursor-pointer disabled:opacity-40"
                                    >
                                        <Plus className="size-3.5" />
                                        <span className="hidden sm:inline">Mulai Digitasi</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {isDigitasiDisabled
                                        ? (isYearLocked || activeSnapshotLaporan?.status === 'Final'
                                            ? "Tahun anggaran terkunci (Berita Acara Final)"
                                            : activeSnapshotLaporan?.status === 'Submitted'
                                                ? "Sedang menunggu verifikasi Bappeda"
                                                : `Akses digitasi ditutup: Belum ada Draft Penugasan aktif dari Bappeda untuk TA ${selectedTahunFilter}`)
                                        : "Tutup panel bawah & mulai digitasi segmen baru pada peta"}
                                </TooltipContent>
                            </Tooltip>
                        );
                    })()}

                    {/* Quick Shortcut Bappeda: Ajukan Semua Draft ke Submitted */}
                    {!isOpd && isBappedaOrAdmin && draftSegmentsCount > 0 && onBatchKirimDigitasi && !isYearLocked && activeSnapshotLaporan?.status !== 'Final' && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        const eligibleDrafts = processedSegments.filter(s => isDraftEligible(s));
                                        if (eligibleDrafts.length > 0) {
                                            onBatchKirimDigitasi(eligibleDrafts);
                                        }
                                    }}
                                    className="h-7 text-xs font-bold gap-1 px-2 sm:px-2.5 rounded-lg border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/70 transition-all cursor-pointer shadow-2xs"
                                >
                                    <Send className="size-3 text-indigo-600 dark:text-indigo-400" />
                                    <span className="hidden sm:inline">Ajukan Semua ({draftSegmentsCount})</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                Pintasan Bappeda: Langsung ubah seluruh {draftSegmentsCount} segmen draft menjadi 'Submitted' agar siap diverifikasi
                            </TooltipContent>
                        </Tooltip>
                    )}

                    {/* Batch Submit Mode Button */}
                    {!isOpd && (onBatchKirimDigitasi || onKirimDigitasi) && (() => {
                        const isAlreadySubmitted = activeSnapshotLaporan?.status === 'Submitted';
                        const isFinalLocked = isYearLocked || activeSnapshotLaporan?.status === 'Final';
                        const isSubmissionLocked = isFinalLocked || isAlreadySubmitted || draftSegmentsCount === 0 || (!isBappedaOrAdmin && !activeSnapshotLaporan);

                        const submitDisabledReason = isFinalLocked
                            ? `Berita Acara TA ${selectedTahunFilter} telah final & sah (Pengajuan ditutup)`
                            : isAlreadySubmitted
                                ? `Seluruh digitasi TA ${selectedTahunFilter} telah dikirim & sedang diverifikasi Bappeda`
                                : draftSegmentsCount === 0
                                    ? `Tidak ada segmen draft yang perlu diajukan (TA ${selectedTahunFilter})`
                                    : !activeSnapshotLaporan && !isBappedaOrAdmin
                                        ? `Belum ada Draft Penugasan dari Bappeda untuk TA ${selectedTahunFilter}`
                                        : "";

                        return (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span>
                                        <Button
                                            size="sm"
                                            variant={isBatchSelectMode ? "default" : "outline"}
                                            onClick={handleToggleBatchSelectMode}
                                            disabled={isSubmissionLocked && !isBatchSelectMode}
                                            className={cn(
                                                "h-7 text-xs font-bold gap-1 px-2 sm:px-2.5 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none",
                                                isBatchSelectMode
                                                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs border-indigo-600 font-extrabold"
                                                    : isAlreadySubmitted
                                                        ? "border-blue-500/30 text-blue-700 dark:text-blue-300 bg-blue-500/10"
                                                        : "border-indigo-500/30 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20"
                                            )}
                                        >
                                            <Send className="size-3" />
                                            <span className="hidden sm:inline">
                                                {isBatchSelectMode
                                                    ? "Mode Kirim Aktif"
                                                    : isAlreadySubmitted
                                                        ? "Sudah Terkirim"
                                                        : isBappedaOrAdmin
                                                            ? "Pilih Kirim Masal"
                                                            : "Ajukan Digitasi"}
                                            </span>
                                            {draftSegmentsCount > 0 && !isBatchSelectMode && !isSubmissionLocked && (
                                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-indigo-600 text-white dark:bg-indigo-400 dark:text-slate-950">
                                                    {draftSegmentsCount}
                                                </span>
                                            )}
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {isSubmissionLocked
                                        ? submitDisabledReason
                                        : "Pilih beberapa segmen sekaligus untuk diajukan ke Bappeda"}
                                </TooltipContent>
                            </Tooltip>
                        );
                    })()}

                    {/* View mode toggle */}
                    <div className="flex items-center p-0.5 rounded-lg border border-border/80 bg-background shadow-2xs">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant={viewMode === "table" ? "secondary" : "ghost"}
                                    onClick={() => setViewMode("table")}
                                    className="size-6 sm:size-7 rounded-md"
                                >
                                    <Table2 className="size-3 sm:size-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Tampilan Tabel Atribut (GIS)</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant={viewMode === "cards" ? "secondary" : "ghost"}
                                    onClick={() => setViewMode("cards")}
                                    className="size-6 sm:size-7 rounded-md"
                                >
                                    <LayoutGrid className="size-3 sm:size-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Tampilan Kartu Segmen</TooltipContent>
                        </Tooltip>
                    </div>

                    {/* Refresh Button */}
                    {onRefreshSegments && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={onRefreshSegments}
                                    disabled={isLoading}
                                    className="size-7 sm:size-8 rounded-lg border-border/80 bg-background shadow-2xs"
                                >
                                    <RefreshCw className={cn("size-3 sm:size-3.5 text-muted-foreground", isLoading && "animate-spin text-indigo-500")} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Muat Ulang Segmen</TooltipContent>
                        </Tooltip>
                    )}

                    {/* Minimize / Close Button */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={onToggleOpen}
                                className="size-7 sm:size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                            >
                                <ChevronDown className="size-3.5 sm:size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Sembunyikan Panel Bawah</TooltipContent>
                    </Tooltip>
                </div>
            </div>

            {/* Filter & Search Toolbar: Minimal with Filter Popover */}
            <div className="px-3.5 py-1.5 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-2.5 flex-wrap select-none">
                {/* Left: Search Input */}
                <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-xs sm:max-w-sm">
                    <div className="relative w-full">
                        <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                        <Input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari segmen, ruas, material..."
                            className="h-7 pl-8 pr-7 text-xs bg-background/90 rounded-lg border-border/70 placeholder:text-muted-foreground/50 focus-visible:ring-1"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                                title="Hapus pencarian"
                            >
                                <X className="size-3" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Right: Quick Filter Badges & Single Filter Popover Button */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                    {/* Active Filter Quick Badges (tampil jika ada filter aktif) */}
                    {activeFilterCount > 0 && (
                        <div className="hidden md:flex items-center gap-1.5 flex-wrap">
                            {selectedTahunFilter !== "Semua" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                                    <span>TA: {selectedTahunFilter}</span>
                                    <button type="button" onClick={() => setSelectedTahunFilter("Semua")} className="hover:text-foreground">
                                        <X className="size-2.5" />
                                    </button>
                                </span>
                            )}
                            {filterVerifikasi !== "all" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                                    <span>
                                        {filterVerifikasi === "verifikasi_bappeda" ? "Menunggu" : filterVerifikasi === "terverifikasi" ? "Disetujui" : "Dikembalikan"}
                                    </span>
                                    <button type="button" onClick={() => setFilterVerifikasi("all")} className="hover:text-foreground">
                                        <X className="size-2.5" />
                                    </button>
                                </span>
                            )}
                            {filterKondisi !== "all" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                                    <span>{filterKondisi.replace(/_/g, " ")}</span>
                                    <button type="button" onClick={() => setFilterKondisi("all")} className="hover:text-foreground">
                                        <X className="size-2.5" />
                                    </button>
                                </span>
                            )}
                            {filterStatusKondisi !== "all" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                                    <span>Status: {filterStatusKondisi}</span>
                                    <button type="button" onClick={() => setFilterStatusKondisi("all")} className="hover:text-foreground">
                                        <X className="size-2.5" />
                                    </button>
                                </span>
                            )}
                            {filterSumberDana !== "all" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                                    <span>Dana: {filterSumberDana}</span>
                                    <button type="button" onClick={() => setFilterSumberDana("all")} className="hover:text-foreground">
                                        <X className="size-2.5" />
                                    </button>
                                </span>
                            )}
                            {filterPoros !== "all" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                                    <span>{filterPoros === "poros" ? "Jalan Poros" : "Luar Basis Data"}</span>
                                    <button type="button" onClick={() => setFilterPoros("all")} className="hover:text-foreground">
                                        <X className="size-2.5" />
                                    </button>
                                </span>
                            )}
                        </div>
                    )}

                    {/* Single Filter Dropdown Popover Button */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={activeFilterCount > 0 ? "default" : "outline"}
                                size="sm"
                                className={cn(
                                    "h-7 text-xs gap-1.5 rounded-lg transition-all",
                                    activeFilterCount > 0
                                        ? "bg-indigo-600 hover:bg-indigo-700 text-white font-bold border-indigo-600 shadow-2xs"
                                        : "bg-background/90 text-foreground border-border/70 hover:bg-muted/50"
                                )}
                            >
                                <SlidersHorizontal className="size-3" />
                                <span>Filter</span>
                                {activeFilterCount > 0 && (
                                    <span className="flex items-center justify-center size-4 rounded-full bg-white/20 text-white text-[9px] font-black leading-none">
                                        {activeFilterCount}
                                    </span>
                                )}
                                <ChevronDown className="size-3 opacity-60 ml-0.5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" side="bottom" className="w-80 p-3.5 space-y-3 shadow-xl bg-card border-border/90 z-50">
                            {/* Popover Header */}
                            <div className="flex items-center justify-between pb-2 border-b border-border/60">
                                <div className="flex items-center gap-1.5">
                                    <SlidersHorizontal className="size-3.5 text-indigo-500" />
                                    <h4 className="text-xs font-bold text-foreground">Filter Data Segmen</h4>
                                </div>
                                {activeFilterCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleResetFilters}
                                        className="text-[10.5px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer flex items-center gap-1"
                                    >
                                        <RotateCcw className="size-2.5" />
                                        <span>Reset ({activeFilterCount})</span>
                                    </button>
                                )}
                            </div>

                            {/* Form Fields inside Popover */}
                            <div className="space-y-2.5 text-xs">
                                {/* 1. Tahun Anggaran */}
                                <div className="space-y-1">
                                    <label className="text-[10.5px] font-semibold text-muted-foreground">Tahun Anggaran (TA)</label>
                                    <Select value={selectedTahunFilter} onValueChange={setSelectedTahunFilter}>
                                        <SelectTrigger className="h-8 text-xs font-medium bg-background border-border/70 rounded-lg">
                                            <SelectValue placeholder="Pilih Tahun" />
                                        </SelectTrigger>
                                        <SelectContent className="text-xs">
                                            <SelectItem value="Semua">Semua Tahun Anggaran</SelectItem>
                                            {uniqueYears.map(year => (
                                                <SelectItem key={year} value={year}>Tahun {year}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* 2. Status Verifikasi */}
                                <div className="space-y-1">
                                    <label className="text-[10.5px] font-semibold text-muted-foreground">Status Verifikasi</label>
                                    <Select value={filterVerifikasi} onValueChange={setFilterVerifikasi}>
                                        <SelectTrigger className="h-8 text-xs font-medium bg-background border-border/70 rounded-lg">
                                            <SelectValue placeholder="Pilih Status" />
                                        </SelectTrigger>
                                        <SelectContent className="text-xs">
                                            <SelectItem value="all">Semua Status Verifikasi</SelectItem>
                                            <SelectItem value="verifikasi_bappeda">Menunggu Verifikasi (Bappeda)</SelectItem>
                                            <SelectItem value="terverifikasi">Disetujui / Terverifikasi</SelectItem>
                                            <SelectItem value="verifikasi_kecamatan">Dikembalikan (Revisi)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* 3. Kondisi Jalan */}
                                <div className="space-y-1">
                                    <label className="text-[10.5px] font-semibold text-muted-foreground">Kondisi Jalan</label>
                                    <Select value={filterKondisi} onValueChange={setFilterKondisi}>
                                        <SelectTrigger className="h-8 text-xs font-medium bg-background border-border/70 rounded-lg">
                                            <SelectValue placeholder="Pilih Kondisi" />
                                        </SelectTrigger>
                                        <SelectContent className="text-xs">
                                            <SelectItem value="all">Semua Kondisi Jalan</SelectItem>
                                            <SelectItem value="BAIK">Baik</SelectItem>
                                            <SelectItem value="SEDANG">Sedang</SelectItem>
                                            <SelectItem value="RUSAK_RINGAN">Rusak Ringan</SelectItem>
                                            <SelectItem value="RUSAK_BERAT">Rusak Berat</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* 4. Status Kondisi */}
                                <div className="space-y-1">
                                    <label className="text-[10.5px] font-semibold text-muted-foreground">Status Kondisi</label>
                                    <Select value={filterStatusKondisi} onValueChange={setFilterStatusKondisi}>
                                        <SelectTrigger className="h-8 text-xs font-medium bg-background border-border/70 rounded-lg">
                                            <SelectValue placeholder="Pilih Status Kondisi" />
                                        </SelectTrigger>
                                        <SelectContent className="text-xs">
                                            <SelectItem value="all">Semua Status Kondisi</SelectItem>
                                            {uniqueStatusKondisi.map(sk => (
                                                <SelectItem key={sk} value={sk}>{sk}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* 5. Sumber Dana */}
                                <div className="space-y-1">
                                    <label className="text-[10.5px] font-semibold text-muted-foreground">Sumber Dana</label>
                                    <Select value={filterSumberDana} onValueChange={setFilterSumberDana}>
                                        <SelectTrigger className="h-8 text-xs font-medium bg-background border-border/70 rounded-lg">
                                            <SelectValue placeholder="Pilih Sumber Dana" />
                                        </SelectTrigger>
                                        <SelectContent className="text-xs">
                                            <SelectItem value="all">Semua Sumber Dana</SelectItem>
                                            {uniqueSumberDana.map(sd => (
                                                <SelectItem key={sd} value={sd}>{sd}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* 6. Basis Data (Poros vs Non Poros) */}
                                <div className="space-y-1">
                                    <label className="text-[10.5px] font-semibold text-muted-foreground">Basis Data / Ruas</label>
                                    <Select value={filterPoros} onValueChange={setFilterPoros}>
                                        <SelectTrigger className="h-8 text-xs font-medium bg-background border-border/70 rounded-lg">
                                            <SelectValue placeholder="Pilih Basis Data" />
                                        </SelectTrigger>
                                        <SelectContent className="text-xs">
                                            <SelectItem value="all">Semua Basis Data</SelectItem>
                                            <SelectItem value="poros">Jalan Poros (Basis Data)</SelectItem>
                                            <SelectItem value="non_poros">Di Luar Basis Data</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Main Content Area: Table vs Cards */}
            <div className={cn(
                "flex-1 min-h-0 overflow-auto custom-scrollbar [&_[data-slot=table-container]]:overflow-visible",
                viewMode === "cards" ? "p-3" : "p-0"
            )}>
                {isLoading && realisasiList.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-2">
                        <Loader2 className="size-6 animate-spin text-indigo-500" />
                        <span className="text-xs font-medium">Memuat data segmen realisasi...</span>
                    </div>
                ) : processedSegments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-muted/10">
                        <Layers className="size-8 text-muted-foreground/60 mb-2" />
                        <h4 className="text-xs font-bold text-foreground">Tidak Ada Segmen Ditemukan</h4>
                        <p className="text-[11px] text-muted-foreground max-w-sm mt-0.5">
                            {realisasiList.length === 0
                                ? "Wilayah ini belum memiliki segmen realisasi. Mulai digitasi pada panel sebelah kiri."
                                : "Tidak ada segmen yang sesuai dengan kombinasi filter dan pencarian saat ini."}
                        </p>
                        {(searchQuery || filterVerifikasi !== "all" || filterKondisi !== "all" || filterPoros !== "all" || selectedTahunFilter !== "Semua") && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setSearchQuery("");
                                    setFilterVerifikasi("all");
                                    setFilterKondisi("all");
                                    setFilterPoros("all");
                                    setSelectedTahunFilter("Semua");
                                }}
                                className="mt-3 h-7 text-xs font-semibold rounded-lg"
                            >
                                Reset Semua Filter
                            </Button>
                        )}
                    </div>
                ) : viewMode === "table" ? (
                    /* TABLE VIEW: Simple & Minimalist Edge-to-Edge with Docked Bottom Scrollbar */
                    <div className="w-full min-w-full">
                        <Table className="w-full min-w-[1250px]">
                            <TableHeader className="bg-muted/50 sticky top-0 z-10 border-b border-border/80 backdrop-blur-xs">
                                <TableRow className="hover:bg-transparent text-[10.5px] border-b border-border/80">
                                    {isBatchSelectMode && (
                                        <TableHead className="w-10 py-2.5 px-3 text-center">
                                            <input
                                                type="checkbox"
                                                checked={isAllDraftSelected}
                                                onChange={handleToggleSelectAll}
                                                className="rounded border-border size-3.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                                                title="Pilih / Batalkan Semua Segmen Draft"
                                            />
                                        </TableHead>
                                    )}
                                    <TableHead className="w-10 py-2.5 px-3 text-center font-bold text-muted-foreground">#</TableHead>
                                    <TableHead className="min-w-[200px] py-2.5 px-3 font-bold text-muted-foreground">
                                        <button
                                            type="button"
                                            onClick={() => handleSort("nama")}
                                            className="flex items-center gap-1 hover:text-foreground cursor-pointer"
                                        >
                                            <span>Nama Segmen / Objek</span>
                                            <ArrowUpDown className="size-3 text-muted-foreground" />
                                        </button>
                                    </TableHead>
                                    <TableHead className="w-28 py-2.5 px-3 font-bold text-center text-muted-foreground">Basis Data</TableHead>
                                    <TableHead className="w-24 py-2.5 px-3 text-right font-bold text-muted-foreground">
                                        <button
                                            type="button"
                                            onClick={() => handleSort("panjang")}
                                            className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer ml-auto"
                                        >
                                            <span>Panjang</span>
                                            <ArrowUpDown className="size-3 text-muted-foreground" />
                                        </button>
                                    </TableHead>
                                    <TableHead className="w-20 py-2.5 px-3 text-center font-bold text-muted-foreground">Lebar</TableHead>
                                    <TableHead className="w-28 py-2.5 px-3 font-bold text-muted-foreground">Perkerasan</TableHead>
                                    <TableHead className="w-28 py-2.5 px-3 font-bold text-center text-muted-foreground">
                                        <button
                                            type="button"
                                            onClick={() => handleSort("kondisi")}
                                            className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer mx-auto"
                                        >
                                            <span>Kondisi</span>
                                            <ArrowUpDown className="size-3 text-muted-foreground" />
                                        </button>
                                    </TableHead>
                                    <TableHead className="w-28 py-2.5 px-3 font-bold text-center text-muted-foreground">
                                        <button
                                            type="button"
                                            onClick={() => handleSort("status_kondisi")}
                                            className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer mx-auto"
                                        >
                                            <span>Status Kondisi</span>
                                            <ArrowUpDown className="size-3 text-muted-foreground" />
                                        </button>
                                    </TableHead>
                                    <TableHead className="w-28 py-2.5 px-3 font-bold text-center text-muted-foreground">Status Jalan</TableHead>
                                    <TableHead className="w-28 py-2.5 px-3 font-bold text-center text-muted-foreground">
                                        <button
                                            type="button"
                                            onClick={() => handleSort("sumber_dana")}
                                            className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer mx-auto"
                                        >
                                            <span>Sumber Dana</span>
                                            <ArrowUpDown className="size-3 text-muted-foreground" />
                                        </button>
                                    </TableHead>
                                    <TableHead className="w-16 py-2.5 px-3 font-bold text-center text-muted-foreground">
                                        <button
                                            type="button"
                                            onClick={() => handleSort("tahun")}
                                            className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer mx-auto"
                                        >
                                            <span>TA</span>
                                            <ArrowUpDown className="size-3 text-muted-foreground" />
                                        </button>
                                    </TableHead>
                                    <TableHead className="w-36 py-2.5 px-3 font-bold text-center text-muted-foreground">
                                        <button
                                            type="button"
                                            onClick={() => handleSort("verifikasi")}
                                            className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer mx-auto"
                                        >
                                            <span>Status Verifikasi</span>
                                            <ArrowUpDown className="size-3 text-muted-foreground" />
                                        </button>
                                    </TableHead>
                                    <TableHead className="w-48 py-2.5 px-4 font-bold text-right text-muted-foreground">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="text-xs divide-y divide-border/40">
                                {processedSegments.map((r, idx) => {
                                    const isMaster = isMasterConnected(r);
                                    const candidateRuas = (r as any).kode_ruas || (r.atribut as any)?.kode_ruas || (r.atribut as any)?.no_ruas || r.snapped_road_id;
                                    const validRuas = candidateRuas && !isUUID(candidateRuas) && candidateRuas !== "0" && candidateRuas !== "Terikat" ? String(candidateRuas) : null;

                                    const ruasBadgeLabel = isMaster
                                        ? (validRuas
                                            ? `No. ${validRuas.replace(/^(no\.?|ruas)\s*/i, "")}`
                                            : "Jalan Poros")
                                        : "Di Luar Basis Data";

                                    const sv = r.status_verifikasi;
                                    const hasCatatan = Boolean(r.catatan_verifikasi && r.catatan_verifikasi.trim());
                                    const isReturned = (sv === "verifikasi_kecamatan" || !sv) && hasCatatan;

                                    const isBoundToBa = isYearLocked && !!(lockedSegmenIds && lockedSegmenIds.size > 0 && lockedSegmenIds.has(r.id.toString()));
                                    const isBaFinal = isYearLocked && sv === "terverifikasi" && isBoundToBa;
                                    const isLocked = isSegmentLocked(r.id.toString(), sv);

                                    const isWaitingVerification = sv === "verifikasi_bappeda" || sv === "verifikasi_kecamatan" || (activeSnapshotLaporan?.status === "Submitted" && sv !== "terverifikasi");
                                    const canEditAttributes = isBappedaOrAdmin || !isLocked;
                                    const showBatalkan = isBappedaOrAdmin && sv === "terverifikasi" && !isBoundToBa;
                                    const showVerifikasiActions = isBappedaOrAdmin && sv !== "terverifikasi" && !isBaFinal;

                                    return (
                                        <TableRow
                                            key={r.id}
                                            onClick={() => zoomToSegment(r.id)}
                                            onMouseEnter={() => onHoverSegment(r.id)}
                                            onMouseLeave={() => onHoverSegment(null)}
                                            className={cn(
                                                "hover:bg-muted/60 dark:hover:bg-slate-900/60 cursor-pointer transition-colors border-b border-border/40 select-none",
                                                r.kondisi === "BAIK" && "hover:bg-emerald-500/10",
                                                r.kondisi === "SEDANG" && "hover:bg-sky-500/10",
                                                r.kondisi === "RUSAK_RINGAN" && "hover:bg-amber-500/10",
                                                r.kondisi === "RUSAK_BERAT" && "hover:bg-rose-500/10",
                                                isBatchSelectMode && selectedSegmentIds.has(r.id.toString()) && "bg-indigo-500/10 dark:bg-indigo-950/40"
                                            )}
                                            title="Klik baris untuk zoom & sorot di peta"
                                        >
                                            {/* Checkbox for Batch Mode */}
                                            {isBatchSelectMode && (
                                                <TableCell className="w-10 py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    {isDraftEligible(r) ? (
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedSegmentIds.has(r.id.toString())}
                                                            onChange={() => handleToggleSelectSegment(r.id.toString())}
                                                            className="rounded border-border size-3.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                                                        />
                                                    ) : (
                                                        <span className="text-[10px] text-muted-foreground opacity-40 select-none" title="Segmen telah terkunci atau terverifikasi">
                                                             —
                                                        </span>
                                                    )}
                                                </TableCell>
                                            )}

                                            {/* Index */}
                                            <TableCell className="w-10 py-2.5 px-3 text-center font-mono text-[10.5px] text-muted-foreground/80">
                                                {idx + 1}
                                            </TableCell>

                                            {/* Nama Segmen */}
                                            <TableCell className="py-2.5 px-3 font-medium">
                                                <div className="flex flex-col gap-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => zoomToSegment(r.id)}
                                                        className="text-left font-bold text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer leading-snug"
                                                        title="Klik untuk zoom & sorot di peta"
                                                    >
                                                        {r.namobj || r.nama_jalan || "Segmen Tanpa Nama"}
                                                    </button>
                                                    {r.nama_desa && (
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <MapPin className="size-2.5 shrink-0 text-blue-500" />
                                                            <span>{r.nama_desa}{r.nama_kecamatan ? `, Kec. ${r.nama_kecamatan}` : ""}</span>
                                                        </span>
                                                    )}
                                                    {r.catatan_verifikasi && (
                                                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono line-clamp-1" title={r.catatan_verifikasi}>
                                                            Catatan: {r.catatan_verifikasi}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Basis Data / Kode Ruas */}
                                            <TableCell className="py-2.5 px-3 text-center whitespace-nowrap">
                                                <span className={cn(
                                                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-semibold border",
                                                    isMaster
                                                        ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25"
                                                        : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
                                                )}>
                                                    <span className={cn("size-1.5 rounded-full shrink-0", isMaster ? "bg-indigo-500" : "bg-slate-400")} />
                                                    <span>{ruasBadgeLabel}</span>
                                                </span>
                                            </TableCell>

                                            {/* Panjang */}
                                            <TableCell className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                                {parseFloat(r.panjang_m?.toString() || "0").toFixed(1)} m
                                            </TableCell>

                                            {/* Lebar */}
                                            <TableCell className="py-2.5 px-3 text-center font-mono text-muted-foreground whitespace-nowrap">
                                                {r.lebar_m ? `${parseFloat(r.lebar_m.toString()).toFixed(1)} m` : "—"}
                                            </TableCell>

                                            {/* Perkerasan */}
                                            <TableCell className="py-2.5 px-3 text-muted-foreground font-medium text-[11px] whitespace-nowrap">
                                                {r.perkerasan ? (
                                                    <span className="px-1.5 py-0.5 rounded bg-muted text-foreground border border-border/60">
                                                        {r.perkerasan}
                                                    </span>
                                                ) : "—"}
                                            </TableCell>

                                            {/* Kondisi */}
                                            <TableCell className="py-2.5 px-3 text-center whitespace-nowrap">
                                                <span className={cn(
                                                    "inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border",
                                                    getKondisiBadgeStyle(r.kondisi)
                                                )}>
                                                    {r.kondisi ? r.kondisi.replace(/_/g, " ") : "BAIK"}
                                                </span>
                                            </TableCell>

                                            {/* Status Kondisi */}
                                            <TableCell className="py-2.5 px-3 text-center whitespace-nowrap">
                                                {r.status_kondisi || (r.atribut as any)?.status_kondisi ? (
                                                    <span className={cn(
                                                        "inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border",
                                                        (r.status_kondisi || (r.atribut as any)?.status_kondisi)?.toString().toLowerCase() === "riwayat"
                                                            ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25"
                                                            : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25"
                                                    )}>
                                                        {r.status_kondisi || (r.atribut as any)?.status_kondisi}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground/60 text-[11px]">—</span>
                                                )}
                                            </TableCell>

                                            {/* Status Jalan */}
                                            <TableCell className="py-2.5 px-3 text-center whitespace-nowrap">
                                                <span className={cn(
                                                    "inline-block px-1.5 py-0.5 rounded text-[9.5px] font-semibold",
                                                    r.status_jalan?.toUpperCase() === "MANTAP"
                                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                                        : r.status_jalan?.toUpperCase() === "TIDAK MANTAP"
                                                            ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                                                            : "bg-slate-500/10 text-muted-foreground"
                                                )}>
                                                    {r.status_jalan || "—"}
                                                </span>
                                            </TableCell>

                                            {/* Sumber Dana */}
                                            <TableCell className="py-2.5 px-3 text-center whitespace-nowrap">
                                                {r.sumber_dana || (r.atribut as any)?.sumber_dana ? (
                                                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                                                        {r.sumber_dana || (r.atribut as any)?.sumber_dana}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground/60 text-[11px]">—</span>
                                                )}
                                            </TableCell>

                                            {/* TA */}
                                            <TableCell className="py-2.5 px-3 text-center font-mono text-muted-foreground text-[11px] whitespace-nowrap">
                                                {r.tahun_anggaran || "—"}
                                            </TableCell>

                                            {/* Status Verifikasi */}
                                            <TableCell className="py-2.5 px-3 text-center whitespace-nowrap">
                                                {isReturned ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                                                        <RotateCcw className="size-2.5" />
                                                        <span>Dikembalikan</span>
                                                    </span>
                                                ) : isBaFinal ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                                        <Lock className="size-2.5" />
                                                        <span>BA Final</span>
                                                    </span>
                                                ) : sv === "terverifikasi" ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                                        <CheckCircle2 className="size-2.5" />
                                                        <span>Disetujui</span>
                                                    </span>
                                                ) : isWaitingVerification ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                                        <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                        <span>Menunggu</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-muted-foreground bg-muted border border-border/60">
                                                        Draft
                                                    </span>
                                                )}
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="py-2 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1">

                                                    {/* Edit Attributes */}
                                                    {canDig && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={() => handleEditAttributesOnly(r)}
                                                                    disabled={!canEditAttributes}
                                                                    className="size-7 rounded-lg text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-40"
                                                                >
                                                                    <FileEdit className="size-3.5" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                {canEditAttributes ? "Edit Atribut Saja" : "Segmen Dikunci"}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}

                                                    {/* Geometry edit & split & delete for unlocked */}
                                                    {canDig && !isLocked && (
                                                        <>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        onClick={() => handleEditGeometryAndAttributes(r)}
                                                                        className="size-7 rounded-lg text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 shadow-2xs cursor-pointer"
                                                                    >
                                                                        <Pin className="size-3.5" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Edit Geometri & Atribut</TooltipContent>
                                                            </Tooltip>

                                                            {handleSplitSegmen && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            onClick={() => handleSplitSegmen(r)}
                                                                            className="size-7 rounded-lg text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
                                                                        >
                                                                            <Scissors className="size-3.5" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Split / Potong Segmen</TooltipContent>
                                                                </Tooltip>
                                                            )}

                                                            {onKirimDigitasi && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            onClick={() => onKirimDigitasi(r)}
                                                                            className="size-7 rounded-lg text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20"
                                                                        >
                                                                            <Send className="size-3.5" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>{isBappedaOrAdmin ? "Ubah status ke Submitted (Siap Diverifikasi)" : "Kirim ke Bappeda"}</TooltipContent>
                                                                </Tooltip>
                                                            )}

                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        onClick={() => handleDelete(r.id)}
                                                                        className="size-7 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                                                                    >
                                                                        <Trash2 className="size-3.5" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Hapus Segmen</TooltipContent>
                                                            </Tooltip>
                                                        </>
                                                    )}

                                                    {/* Bappeda Verification Actions (Batalkan / Kembalikan / Setujui) */}
                                                    {!isOpd && showBatalkan && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={async () => {
                                                                        const toastId = toast.loading("Membatalkan verifikasi...");
                                                                        try {
                                                                            const tipeKode = activeTipe?.kode || "jalan";
                                                                            await monitoringService.verifikasiSegmenByBappeda(tipeKode, r.id, {
                                                                                status_verifikasi: "verifikasi_bappeda",
                                                                            });
                                                                            toast.success("Verifikasi segmen berhasil dibatalkan!", { id: toastId });
                                                                            if (onRefreshSegments) onRefreshSegments();
                                                                        } catch (err: any) {
                                                                            toast.error(err?.message || "Gagal membatalkan verifikasi", { id: toastId });
                                                                        }
                                                                    }}
                                                                    className="h-7 px-2 text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 rounded-lg gap-1"
                                                                >
                                                                    <XCircle className="size-3" />
                                                                    <span>Batalkan</span>
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Kembalikan ke status Verifikasi Bappeda</TooltipContent>
                                                        </Tooltip>
                                                    )}

                                                    {!isOpd && showVerifikasiActions && (
                                                        <>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => {
                                                                            setKembalikanSegmenData(r);
                                                                            setCatatanVerifikasiInput((r as any).catatan_verifikasi || "");
                                                                        }}
                                                                        className="h-7 px-2 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-lg gap-1"
                                                                    >
                                                                        <RotateCcw className="size-3" />
                                                                        <span>Kembalikan</span>
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Kembalikan ke Kecamatan dengan catatan</TooltipContent>
                                                            </Tooltip>

                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={async () => {
                                                                            const toastId = toast.loading("Memverifikasi segmen...");
                                                                            try {
                                                                                const tipeKode = activeTipe?.kode || "jalan";
                                                                                await monitoringService.verifikasiSegmenByBappeda(tipeKode, r.id, {
                                                                                    status_verifikasi: "terverifikasi",
                                                                                });
                                                                                toast.success("Segmen berhasil diverifikasi!", { id: toastId });
                                                                                if (onRefreshSegments) onRefreshSegments();
                                                                            } catch (err: any) {
                                                                                toast.error(err?.message || "Gagal memverifikasi segmen", { id: toastId });
                                                                            }
                                                                        }}
                                                                        className="h-7 px-2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg gap-1"
                                                                    >
                                                                        <Check className="size-3" />
                                                                        <span>Setujui</span>
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Setujui Verifikasi Segmen</TooltipContent>
                                                            </Tooltip>
                                                        </>
                                                    )}

                                                    {isLocked && !showBatalkan && !showVerifikasiActions && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-muted-foreground px-2 py-1 rounded-md bg-muted/60 border border-border/50">
                                                                    <Lock className="size-3 text-indigo-500" />
                                                                    <span>Terkunci</span>
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                {isBaFinal
                                                                    ? "Terkunci: Berita Acara Telah Final"
                                                                    : sv === "verifikasi_bappeda"
                                                                        ? "Terkunci: Menunggu Verifikasi Bappeda"
                                                                        : "Terkunci"}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    /* CARDS GRID VIEW */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {processedSegments.map(r => {
                            const isMaster = isMasterConnected(r);
                            const candidateRuas = (r as any).kode_ruas || (r.atribut as any)?.kode_ruas || (r.atribut as any)?.no_ruas || r.snapped_road_id;
                            const validRuas = candidateRuas && !isUUID(candidateRuas) && candidateRuas !== "0" && candidateRuas !== "Terikat" ? String(candidateRuas) : null;

                            const ruasBadgeLabel = isMaster
                                ? (validRuas
                                    ? `No. ${validRuas.replace(/^(no\.?|ruas)\s*/i, "")}`
                                    : "Jalan Poros")
                                : "Di Luar Basis Data";

                            const sv = r.status_verifikasi;
                            const hasCatatan = Boolean(r.catatan_verifikasi && r.catatan_verifikasi.trim());
                            const isReturned = (sv === "verifikasi_kecamatan" || !sv) && hasCatatan;

                            const isBoundToBa = isYearLocked && !!(lockedSegmenIds && lockedSegmenIds.size > 0 && lockedSegmenIds.has(r.id.toString()));
                            const isBaFinal = isYearLocked && sv === "terverifikasi" && isBoundToBa;
                            const isLocked = isSegmentLocked(r.id.toString(), sv);

                            const isWaitingVerification = sv === "verifikasi_bappeda" || sv === "verifikasi_kecamatan" || (activeSnapshotLaporan?.status === "Submitted" && sv !== "terverifikasi");
                            const canEditAttributes = isBappedaOrAdmin || !isLocked;
                            const showBatalkan = isBappedaOrAdmin && sv === "terverifikasi" && !isBoundToBa;
                            const showVerifikasiActions = isBappedaOrAdmin && sv !== "terverifikasi" && !isBaFinal;

                            return (
                                <div
                                    key={r.id}
                                    onMouseEnter={() => onHoverSegment(r.id)}
                                    onMouseLeave={() => onHoverSegment(null)}
                                    className={cn(
                                        "group p-3 border border-border/80 rounded-xl bg-background hover:bg-muted/30 transition-all duration-150 flex flex-col justify-between shadow-2xs relative",
                                        r.kondisi === "BAIK" && "border-l-[3px] border-l-emerald-500",
                                        r.kondisi === "SEDANG" && "border-l-[3px] border-l-sky-500",
                                        r.kondisi === "RUSAK_RINGAN" && "border-l-[3px] border-l-amber-500",
                                        r.kondisi === "RUSAK_BERAT" && "border-l-[3px] border-l-rose-500"
                                    )}
                                >
                                    <div>
                                        {/* Card Header */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-start gap-2 min-w-0">
                                                {isBatchSelectMode && (
                                                    <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                        {isDraftEligible(r) ? (
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedSegmentIds.has(r.id.toString())}
                                                                onChange={() => handleToggleSelectSegment(r.id.toString())}
                                                                className="rounded border-border size-3.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                                                            />
                                                        ) : (
                                                            <span className="text-[10px] text-muted-foreground opacity-40 select-none">
                                                                —
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => zoomToSegment(r.id)}
                                                    className="text-left font-bold text-xs text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-2 leading-snug cursor-pointer"
                                                    title="Klik untuk zoom & sorot di peta"
                                                >
                                                    {r.namobj || r.nama_jalan || "Segmen Tanpa Nama"}
                                                </button>
                                            </div>
                                            <span className={cn(
                                                "inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0",
                                                getKondisiBadgeStyle(r.kondisi)
                                            )}>
                                                {r.kondisi ? r.kondisi.replace(/_/g, " ") : "BAIK"}
                                            </span>
                                        </div>

                                        {/* Meta Badges */}
                                        <div className="mt-2 flex items-center gap-1.5 flex-wrap text-[9.5px]">
                                            <span className={cn(
                                                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold border",
                                                isMaster
                                                    ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25"
                                                    : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
                                            )}>
                                                <span className={cn("size-1.5 rounded-full", isMaster ? "bg-indigo-500" : "bg-slate-400")} />
                                                <span>{ruasBadgeLabel}</span>
                                            </span>

                                            {/* Status Kondisi */}
                                            {(r.status_kondisi || (r.atribut as any)?.status_kondisi) && (
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded font-bold border",
                                                    (r.status_kondisi || (r.atribut as any)?.status_kondisi)?.toString().toLowerCase() === "riwayat"
                                                        ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25"
                                                        : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25"
                                                )}>
                                                    {r.status_kondisi || (r.atribut as any)?.status_kondisi}
                                                </span>
                                            )}

                                            {/* Sumber Dana */}
                                            {(r.sumber_dana || (r.atribut as any)?.sumber_dana) && (
                                                <span className="px-1.5 py-0.5 rounded font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                                    {r.sumber_dana || (r.atribut as any)?.sumber_dana}
                                                </span>
                                            )}

                                            <span className="text-muted-foreground font-mono">
                                                TA {r.tahun_anggaran || "—"}
                                            </span>

                                            {isReturned ? (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                                                    Dikembalikan
                                                </span>
                                            ) : isBaFinal ? (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                                    BA Final
                                                </span>
                                            ) : sv === "terverifikasi" ? (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                                    Disetujui
                                                </span>
                                            ) : isWaitingVerification ? (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                                    Menunggu
                                                </span>
                                            ) : (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium text-muted-foreground bg-muted border border-border/60">
                                                    Draft
                                                </span>
                                            )}
                                        </div>

                                        {/* Metric row */}
                                        <div className="mt-2.5 p-2 rounded-lg bg-muted/40 border border-border/60 grid grid-cols-2 gap-2 text-[10px] font-mono">
                                            <div>
                                                <span className="text-muted-foreground block text-[8.5px] uppercase font-sans">Panjang</span>
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                    {parseFloat(r.panjang_m?.toString() || "0").toFixed(1)} m
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground block text-[8.5px] uppercase font-sans">Lebar</span>
                                                <span className="font-bold text-foreground">
                                                    {r.lebar_m ? `${parseFloat(r.lebar_m.toString()).toFixed(1)} m` : "—"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Catatan Verifikasi if returned */}
                                        {r.catatan_verifikasi && (
                                            <div className="mt-2 p-1.5 rounded-md bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-[10px] text-rose-900 dark:text-rose-200">
                                                <span className="font-bold block text-[9px]">Catatan Bappeda:</span>
                                                <p className="font-mono text-[9px] line-clamp-2 leading-relaxed">{r.catatan_verifikasi}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Footer Actions */}
                                    <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between gap-1" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center gap-1">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => zoomToSegment(r.id)}
                                                        className="size-7 rounded-lg text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20"
                                                    >
                                                        <Maximize2 className="size-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Zoom & Sorot</TooltipContent>
                                            </Tooltip>

                                            {/* Edit Atribut Only */}
                                            {canDig && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => handleEditAttributesOnly(r)}
                                                            disabled={!canEditAttributes}
                                                            className="size-7 rounded-lg text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-40"
                                                        >
                                                            <FileEdit className="size-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Edit Atribut</TooltipContent>
                                                </Tooltip>
                                            )}

                                            {canDig && !isLocked && (
                                                <>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => handleEditGeometryAndAttributes(r)}
                                                                className="size-7 rounded-lg text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20"
                                                            >
                                                                <Pin className="size-3.5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Edit Geometri</TooltipContent>
                                                    </Tooltip>

                                                    {handleSplitSegmen && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={() => handleSplitSegmen(r)}
                                                                    className="size-7 rounded-lg text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
                                                                >
                                                                    <Scissors className="size-3.5" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Split</TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {canDig && !isLocked && (
                                                <>
                                                    {onKirimDigitasi && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => onKirimDigitasi(r)}
                                                            className="h-7 px-2 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg gap-1"
                                                        >
                                                            <Send className="size-3" />
                                                            <span>{isBappedaOrAdmin ? "Ajukan" : "Kirim"}</span>
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => handleDelete(r.id)}
                                                        className="size-7 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                </>
                                            )}

                                            {!isOpd && showBatalkan && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={async () => {
                                                        const toastId = toast.loading("Membatalkan verifikasi...");
                                                        try {
                                                            const tipeKode = activeTipe?.kode || "jalan";
                                                            await monitoringService.verifikasiSegmenByBappeda(tipeKode, r.id, {
                                                                status_verifikasi: "verifikasi_bappeda",
                                                             });
                                                            toast.success("Verifikasi segmen berhasil dibatalkan!", { id: toastId });
                                                            if (onRefreshSegments) onRefreshSegments();
                                                        } catch (err: any) {
                                                            toast.error(err?.message || "Gagal membatalkan verifikasi", { id: toastId });
                                                        }
                                                    }}
                                                    className="h-6 px-1.5 text-[9.5px] font-bold text-rose-700 dark:text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 rounded-md"
                                                >
                                                    Batalkan
                                                </Button>
                                            )}

                                            {!isOpd && showVerifikasiActions && (
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setKembalikanSegmenData(r);
                                                            setCatatanVerifikasiInput((r as any).catatan_verifikasi || "");
                                                        }}
                                                        className="h-6 px-1.5 text-[9.5px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-md"
                                                    >
                                                        Kembalikan
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={async () => {
                                                            const toastId = toast.loading("Memverifikasi segmen...");
                                                            try {
                                                                const tipeKode = activeTipe?.kode || "jalan";
                                                                await monitoringService.verifikasiSegmenByBappeda(tipeKode, r.id, {
                                                                    status_verifikasi: "terverifikasi",
                                                                });
                                                                toast.success("Segmen berhasil diverifikasi!", { id: toastId });
                                                                if (onRefreshSegments) onRefreshSegments();
                                                            } catch (err: any) {
                                                                toast.error(err?.message || "Gagal memverifikasi segmen", { id: toastId });
                                                            }
                                                        }}
                                                        className="h-6 px-1.5 text-[9.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-md"
                                                    >
                                                        Setujui
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Floating Sticky Batch Action Bar */}
            {isBatchSelectMode && (
                <div className="shrink-0 px-4 py-2.5 bg-indigo-500/10 dark:bg-indigo-950/80 backdrop-blur-md border-t border-indigo-500/30 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2 select-none">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex items-center justify-center size-7 rounded-lg bg-indigo-600 text-white shrink-0 font-extrabold text-xs shadow-xs">
                            {selectedSegmentIds.size}
                        </div>
                        <div className="min-w-0 text-xs">
                            <div className="font-bold text-foreground">
                                {selectedSegmentIds.size} dari {draftSegmentsCount} Segmen Terpilih
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                                Total Panjang: <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{selectedTotalPanjangM.toFixed(1)} m</strong>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                setIsBatchSelectMode(false);
                                setSelectedSegmentIds(new Set());
                            }}
                            className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                        >
                            Batal
                        </Button>
                        <Button
                            size="sm"
                            disabled={selectedSegmentIds.size === 0}
                            onClick={handleConfirmBatchSubmit}
                            className="h-8 px-4 text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md shadow-indigo-500/20 disabled:opacity-50 cursor-pointer"
                        >
                            <Send className="size-3.5" />
                            <span>Kirim {selectedSegmentIds.size} Segmen ke Bappeda</span>
                        </Button>
                    </div>
                </div>
            )}

            {/* Dialog: Kembalikan Segmen ke Kecamatan dengan Catatan */}
            <Dialog open={!!kembalikanSegmenData} onOpenChange={(open) => !open && setKembalikanSegmenData(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <RotateCcw className="size-5" />
                            <span>Kembalikan Segmen ke Kecamatan</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Berikan catatan atau instruksi perbaikan untuk Operator Kecamatan terkait segmen:{" "}
                            <strong className="text-foreground">{kembalikanSegmenData?.namobj || kembalikanSegmenData?.nama_jalan}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-foreground">
                                Catatan Perbaikan / Alasan Pengembalian <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                value={catatanVerifikasiInput}
                                onChange={(e) => setCatatanVerifikasiInput(e.target.value)}
                                placeholder="Contoh: Titik awal segmen belum sesuai dengan batas desa, mohon perbaiki geometri segmen ini."
                                rows={4}
                                className="w-full text-xs p-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Minimal 10 karakter catatan perbaikan.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setKembalikanSegmenData(null)}
                            disabled={isVerifikasiSubmitting}
                            className="h-8 text-xs"
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
                                        catatan_verifikasi: catatanVerifikasiInput,
                                    });

                                    if (activeSnapshotLaporan?.id && (activeSnapshotLaporan.status === "Submitted" || activeSnapshotLaporan.status === "Final")) {
                                        try {
                                            await monitoringLaporanService.revertToDraft(activeSnapshotLaporan.id, {
                                                catatan: catatanVerifikasiInput,
                                                unlock_segments: false,
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
                            className="h-8 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 gap-1.5"
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
    </>
    );
};
