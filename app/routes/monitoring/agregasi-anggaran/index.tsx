import * as React from "react";
import { type MetaFunction } from "react-router";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Spinner } from "~/components/ui/spinner";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "~/components/ui/empty";
import { Input } from "~/components/ui/input";
import { 
    Sheet, 
    SheetContent, 
    SheetHeader, 
    SheetTitle, 
    SheetDescription, 
    SheetFooter, 
    SheetClose, 
    SheetTrigger 
} from "~/components/ui/sheet";
import { 
    Coins, 
    Ruler, 
    Home, 
    CheckCircle2, 
    RefreshCw, 
    ChevronDown, 
    ChevronRight,
    ChevronUp,
    Activity,
    Search,
    MapPin,
    RotateCcw,
    Layers,
    SlidersHorizontal,
    X
} from "lucide-react";
import { agregasiService, type AgregasiAnggaranGroup, type AgregasiKecamatan, type AgregasiDesa, type AgregasiSegment } from "~/services/agregasi.service";
import { toast } from "sonner";
import { cn } from "~/lib/utils";

export const meta: MetaFunction = () => {
    return [
        { title: "Dashboard Agregasi Anggaran - MELAROSA" },
        { name: "description", content: "Ringkasan monitoring anggaran pembangunan infrastruktur Bojonegoro" },
    ];
};

export default function AgregasiAnggaranPage() {
    const [isMounted, setIsMounted] = React.useState(false);

    // Filters
    const [tahun, setTahun] = React.useState<string>("all");
    const [statusFilter, setStatusFilter] = React.useState<string>("all");
    const [sumberDana, setSumberDana] = React.useState<string>("all");
    const [searchTerm, setSearchTerm] = React.useState<string>("");
    
    // Level 1 State: Groups
    const [isLoadingGroups, setIsLoadingGroups] = React.useState<boolean>(true);
    const [groups, setGroups] = React.useState<AgregasiAnggaranGroup[]>([]);
    const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({});

    // Level 2 State: Kecamatan list per Group key ("tahun-jenis_bantuan")
    const [kecamatanData, setKecamatanData] = React.useState<Record<string, AgregasiKecamatan[]>>({});
    const [loadingKecamatan, setLoadingKecamatan] = React.useState<Record<string, boolean>>({});

    // Level 3 State: Villages list per Kecamatan key ("tahun-jenis_bantuan-id_kecamatan")
    const [desaData, setDesaData] = React.useState<Record<string, AgregasiDesa[]>>({});
    const [loadingDesa, setLoadingDesa] = React.useState<Record<string, boolean>>({});
    const INITIAL_DESA_LIMIT = 30;
    const [desaLimit, setDesaLimit] = React.useState<Record<string, number>>({});
    const [expandedKecamatan, setExpandedKecamatan] = React.useState<Record<string, boolean>>({});

    const handleLoadMoreDesa = (kecamatanKey: string) => {
        setDesaLimit(prev => ({
            ...prev,
            [kecamatanKey]: (prev[kecamatanKey] || INITIAL_DESA_LIMIT) + 30
        }));
    };

    const handleShowAllDesa = (kecamatanKey: string, totalCount: number) => {
        setDesaLimit(prev => ({
            ...prev,
            [kecamatanKey]: totalCount
        }));
    };

    const openGroupsCount = React.useMemo(() => {
        return Object.values(expandedGroups).filter(Boolean).length;
    }, [expandedGroups]);

    const handleCollapseAllGroups = React.useCallback(() => {
        setExpandedGroups({});
        setExpandedKecamatan({});
        setExpandedDesa({});
    }, []);

    // Level 4 State: Segments per Village plotting_id
    const [expandedDesa, setExpandedDesa] = React.useState<Record<string, boolean>>({});
    const [segmenData, setSegmenData] = React.useState<Record<string, AgregasiSegment[]>>({});
    const [loadingSegmen, setLoadingSegmen] = React.useState<Record<string, boolean>>({});

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    // Level 1 Fetch: Fetch summary groups
    const fetchGroups = React.useCallback(async () => {
        setIsLoadingGroups(true);
        try {
            const filters: any = {};
            if (tahun !== "all") filters.tahun_anggaran = tahun;
            if (sumberDana !== "all") filters.sumber_dana = sumberDana;

            const res = await agregasiService.getAgregasi(filters);
            setGroups(res);
        } catch (error: any) {
            console.error("Error fetching groups:", error);
            toast.error("Gagal memuat data ringkasan agregasi.");
        } finally {
            setIsLoadingGroups(false);
        }
    }, [tahun, sumberDana]);

    React.useEffect(() => {
        if (isMounted) {
            fetchGroups();
        }
    }, [isMounted, fetchGroups]);

    // Level 2 Fetch: Fetch kecamatan list for a group when expanded
    const fetchKecamatanForGroup = React.useCallback(async (groupKey: string, tahunAnggaran: number, jenisBantuan: string) => {
        setLoadingKecamatan(prev => ({ ...prev, [groupKey]: true }));
        try {
            const res = await agregasiService.getAgregasiKecamatan({
                tahun_anggaran: tahunAnggaran,
                jenis_bantuan: jenisBantuan,
                status_monitoring: statusFilter,
                search: searchTerm,
                sumber_dana: sumberDana
            });
            setKecamatanData(prev => ({ ...prev, [groupKey]: res }));
        } catch (error) {
            console.error("Error fetching kecamatan data:", error);
            toast.error("Gagal memuat agregasi kecamatan.");
        } finally {
            setLoadingKecamatan(prev => ({ ...prev, [groupKey]: false }));
        }
    }, [statusFilter, searchTerm, sumberDana]);

    // Level 3 Fetch: Fetch villages for a kecamatan when expanded
    const fetchDesaForKecamatan = React.useCallback(async (kecamatanKey: string, tahunAnggaran: number, jenisBantuan: string, idKecamatan: number) => {
        setLoadingDesa(prev => ({ ...prev, [kecamatanKey]: true }));
        try {
            const res = await agregasiService.getAgregasiDesa({
                tahun_anggaran: tahunAnggaran,
                jenis_bantuan: jenisBantuan,
                id_kecamatan: idKecamatan,
                status_monitoring: statusFilter,
                search: searchTerm,
                sumber_dana: sumberDana
            });
            setDesaData(prev => ({ ...prev, [kecamatanKey]: res }));
        } catch (error) {
            console.error("Error fetching desa data:", error);
            toast.error("Gagal memuat rincian desa.");
        } finally {
            setLoadingDesa(prev => ({ ...prev, [kecamatanKey]: false }));
        }
    }, [statusFilter, searchTerm, sumberDana]);

    // Trigger re-fetch for expanded groups & kecamatan when statusFilter, searchTerm or sumberDana changes
    React.useEffect(() => {
        if (isMounted) {
            // Re-fetch Kecamatan for expanded groups
            Object.keys(expandedGroups).forEach(groupKey => {
                if (expandedGroups[groupKey]) {
                    const parts = groupKey.split("-");
                    if (parts.length >= 2) {
                        const tahunAnggaran = parseInt(parts[0], 10);
                        const jenisBantuan = parts.slice(1).join("-");
                        fetchKecamatanForGroup(groupKey, tahunAnggaran, jenisBantuan);
                    }
                }
            });

            // Re-fetch Desa for expanded kecamatan
            Object.keys(expandedKecamatan).forEach(kecamatanKey => {
                if (expandedKecamatan[kecamatanKey]) {
                    const parts = kecamatanKey.split("-");
                    if (parts.length >= 3) {
                        const tahunAnggaran = parseInt(parts[0], 10);
                        const jenisBantuan = parts[1];
                        const idKecamatan = parseInt(parts[2], 10);
                        fetchDesaForKecamatan(kecamatanKey, tahunAnggaran, jenisBantuan, idKecamatan);
                    }
                }
            });
        }
    }, [statusFilter, searchTerm, sumberDana, isMounted]);

    // Fast Toggle Group
    const toggleGroupExpand = (groupKey: string, tahunAnggaran: number, jenisBantuan: string) => {
        const isCurrentlyExpanded = !!expandedGroups[groupKey];
        setExpandedGroups(prev => ({
            ...prev,
            [groupKey]: !isCurrentlyExpanded
        }));

        if (!isCurrentlyExpanded && !kecamatanData[groupKey] && !loadingKecamatan[groupKey]) {
            fetchKecamatanForGroup(groupKey, tahunAnggaran, jenisBantuan);
        }
    };

    // Fast Toggle Kecamatan
    const toggleKecamatanExpand = (kecamatanKey: string, tahunAnggaran: number, jenisBantuan: string, idKecamatan: number) => {
        const isCurrentlyExpanded = !!expandedKecamatan[kecamatanKey];
        setExpandedKecamatan(prev => ({
            ...prev,
            [kecamatanKey]: !isCurrentlyExpanded
        }));

        if (!isCurrentlyExpanded && !desaData[kecamatanKey] && !loadingDesa[kecamatanKey]) {
            fetchDesaForKecamatan(kecamatanKey, tahunAnggaran, jenisBantuan, idKecamatan);
        }
    };

    // Fast Instant Toggle Village Segments
    const toggleDesa = async (plottingId: string, laporanId?: string) => {
        const isCurrentlyExpanded = !!expandedDesa[plottingId];
        setExpandedDesa(prev => ({ ...prev, [plottingId]: !isCurrentlyExpanded }));

        if (!isCurrentlyExpanded && !segmenData[plottingId] && !loadingSegmen[plottingId]) {
            setLoadingSegmen(prev => ({ ...prev, [plottingId]: true }));
            try {
                const res = await agregasiService.getAgregasiSegmen({
                    laporan_id: laporanId,
                    plotting_id: plottingId
                });
                setSegmenData(prev => ({ ...prev, [plottingId]: res }));
            } catch (error) {
                console.error("Error fetching segmen data:", error);
                toast.error("Gagal memuat rincian segmen.");
            } finally {
                setLoadingSegmen(prev => ({ ...prev, [plottingId]: false }));
            }
        }
    };

    const handleResetFilters = () => {
        setTahun("all");
        setStatusFilter("all");
        setSumberDana("all");
        setSearchTerm("");
    };

    // Formatters
    const formatRupiah = (value?: number | string | null) => {
        if (value === undefined || value === null) return "Rp 0";
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(num)) return "Rp 0";
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0
        }).format(num);
    };

    const formatDecimal = (value?: number | string | null) => {
        if (value === undefined || value === null) return "0";
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(num)) return "0";
        return new Intl.NumberFormat("id-ID", {
            maximumFractionDigits: 2
        }).format(num);
    };

    const formatTanggalHuman = (dateStr?: string | null) => {
        if (!dateStr) return "";
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return "";
            return new Intl.DateTimeFormat("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric"
            }).format(date);
        } catch {
            return "";
        }
    };

    // Calculate aggregated overall stats for cards
    const overallStats = React.useMemo(() => {
        return groups.reduce((acc, curr) => {
            const paguVal = typeof curr.total_target_pagu === 'string' ? parseFloat(curr.total_target_pagu) : (curr.total_target_pagu || 0);
            const targetPj = typeof curr.total_target_panjang === 'string' ? parseFloat(curr.total_target_panjang) : (curr.total_target_panjang || 0);
            const realPj = typeof curr.total_realisasi_panjang === 'string' ? parseFloat(curr.total_realisasi_panjang) : (curr.total_realisasi_panjang || 0);
            const plottingDesa = typeof curr.jumlah_desa_plotting === 'string' ? parseInt(curr.jumlah_desa_plotting, 10) : (curr.jumlah_desa_plotting || 0);
            const monitoredDesa = typeof curr.jumlah_desa_monitoring === 'string' ? parseInt(curr.jumlah_desa_monitoring, 10) : (curr.jumlah_desa_monitoring || 0);

            acc.pagu += isNaN(paguVal) ? 0 : paguVal;
            acc.panjangTarget += isNaN(targetPj) ? 0 : targetPj;
            acc.panjangRealisasi += isNaN(realPj) ? 0 : realPj;
            acc.desaPlotting += isNaN(plottingDesa) ? 0 : plottingDesa;
            acc.desaMonitoring += isNaN(monitoredDesa) ? 0 : monitoredDesa;
            return acc;
        }, { pagu: 0, panjangTarget: 0, panjangRealisasi: 0, desaPlotting: 0, desaMonitoring: 0 });
    }, [groups]);

    const overallDesaProgres = overallStats.desaPlotting > 0 
        ? Math.round((overallStats.desaMonitoring / overallStats.desaPlotting) * 10000) / 100 
        : 0;

    const overallPanjangProgres = overallStats.panjangTarget > 0 
        ? Math.round((overallStats.panjangRealisasi / overallStats.panjangTarget) * 10000) / 100 
        : 0;

    if (!isMounted) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-20 bg-background dark:bg-slate-950">
                <Spinner className="w-10 h-10 text-blue-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-semibold font-sans">
                    Memuat antarmuka agregasi...
                </p>
            </div>
        );
    }

    const isFilterActive = tahun !== "all" || statusFilter !== "all" || sumberDana !== "all" || searchTerm !== "";
    const activeFilterCount = (tahun !== "all" ? 1 : 0) + 
                              (statusFilter !== "all" ? 1 : 0) +
                              (sumberDana !== "all" ? 1 : 0);

    return (
        <div className="flex flex-1 flex-col h-full min-h-0 gap-2.5 p-3 bg-background dark:bg-slate-950 overflow-hidden font-sans">
            {/* 1. Redesigned Responsive Menubar Filter Bar (Placed Above Summary Cards & Table) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2 shadow-2xs shrink-0 transition-all">
                {/* Single Row Flex Container with horizontal scrolling on overflow */}
                <div className="flex items-center gap-2 w-full overflow-x-auto scrollbar-none py-0.5">
                    {/* Search Input */}
                    <div className="relative min-w-[130px] sm:min-w-[160px] max-w-[200px] shrink-0">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            placeholder="Cari desa/kecamatan..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-7 h-8 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-2xs w-full focus-visible:ring-1 focus-visible:ring-blue-500"
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm("")}
                                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full cursor-pointer"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Mobile Only: Bottom Sheet Filter Trigger (md:hidden) */}
                    <div className="md:hidden shrink-0">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button 
                                    variant={isFilterActive ? "default" : "outline"} 
                                    size="sm" 
                                    className={cn(
                                        "h-8 px-3 text-xs rounded-xl gap-1.5 shrink-0 shadow-2xs cursor-pointer font-semibold",
                                        isFilterActive ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                                    )}
                                >
                                    <SlidersHorizontal className="w-3.5 h-3.5" />
                                    <span>Filter</span>
                                    {activeFilterCount > 0 && (
                                        <Badge className="ml-0.5 h-4 px-1.5 text-[9px] bg-white text-blue-700 font-bold rounded-full border-none">
                                            {activeFilterCount}
                                        </Badge>
                                    )}
                                </Button>
                            </SheetTrigger>

                            {/* Bottom Sheet Drawer Content */}
                            <SheetContent side="bottom" className="rounded-t-3xl max-h-[88vh] p-0 flex flex-col border-t border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl mx-auto">
                                <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 shrink-0" />
                                <SheetHeader className="px-5 pt-2 pb-3 border-b border-slate-200 dark:border-slate-800 text-left">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900">
                                                <SlidersHorizontal className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <SheetTitle className="text-base font-bold text-slate-900 dark:text-white">Filter Agregasi Anggaran</SheetTitle>
                                                <SheetDescription className="text-xs text-slate-500 dark:text-slate-400">
                                                    Saring data berdasarkan tahun, jenis bantuan, dan status monitoring
                                                </SheetDescription>
                                            </div>
                                        </div>
                                    </div>
                                </SheetHeader>
                                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Tahun Select */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tahun Pembangunan</label>
                                            <Select value={tahun} onValueChange={setTahun}>
                                                <SelectTrigger className="w-full h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                                    <SelectValue placeholder="Semua Tahun" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all" className="text-xs">Semua Tahun</SelectItem>
                                                    <SelectItem value="2024" className="text-xs">2024</SelectItem>
                                                    <SelectItem value="2025" className="text-xs">2025</SelectItem>
                                                    <SelectItem value="2026" className="text-xs">2026</SelectItem>
                                                    <SelectItem value="2027" className="text-xs">2027</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>



                                        {/* Status Monitoring Select */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Status Monitoring</label>
                                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                                <SelectTrigger className="w-full h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                                    <SelectValue placeholder="Semua Status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all" className="text-xs">Semua Status</SelectItem>
                                                    <SelectItem value="Sudah Monitoring" className="text-xs">Sudah Monitoring</SelectItem>
                                                    <SelectItem value="Belum Monitoring" className="text-xs">Belum Monitoring</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Sumber Dana Select */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Sumber Dana</label>
                                            <Select value={sumberDana} onValueChange={setSumberDana}>
                                                <SelectTrigger className="w-full h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                                    <SelectValue placeholder="Semua Sumber" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all" className="text-xs">Semua Sumber</SelectItem>
                                                    <SelectItem value="BKK" className="text-xs">BKK</SelectItem>
                                                    <SelectItem value="DD" className="text-xs">DD</SelectItem>
                                                    <SelectItem value="ADD" className="text-xs">ADD</SelectItem>
                                                    <SelectItem value="APBD" className="text-xs">APBD</SelectItem>
                                                    <SelectItem value="Lainnya" className="text-xs">Lainnya</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                                <SheetFooter className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 gap-2 flex-row">
                                    {isFilterActive && (
                                        <Button variant="outline" size="sm" onClick={handleResetFilters} className="flex-1 h-9 text-xs text-rose-600 rounded-xl gap-1.5 font-semibold">
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            Reset Filter
                                        </Button>
                                    )}
                                    <SheetClose asChild>
                                        <Button size="sm" className="flex-1 h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold">
                                            Terapkan Filter
                                        </Button>
                                    </SheetClose>
                                </SheetFooter>
                            </SheetContent>
                        </Sheet>
                    </div>

                    {/* Desktop Only: Inline Filter Selects in the SAME single row */}
                    <div className="hidden md:flex items-center gap-1.5 shrink-0">


                        {/* Tahun Select */}
                        <div className="w-[105px] shrink-0">
                            <Select value={tahun} onValueChange={setTahun}>
                                <SelectTrigger size="sm" className="w-full h-8 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-2xs">
                                    <SelectValue placeholder="Tahun" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs">Semua Tahun</SelectItem>
                                    <SelectItem value="2024" className="text-xs">2024</SelectItem>
                                    <SelectItem value="2025" className="text-xs">2025</SelectItem>
                                    <SelectItem value="2026" className="text-xs">2026</SelectItem>
                                    <SelectItem value="2027" className="text-xs">2027</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status Monitoring Select */}
                        <div className="w-[150px] shrink-0">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger size="sm" className="w-full h-8 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-2xs">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs">Semua Status</SelectItem>
                                    <SelectItem value="Sudah Monitoring" className="text-xs">Sudah Monitoring</SelectItem>
                                    <SelectItem value="Belum Monitoring" className="text-xs">Belum Monitoring</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Sumber Dana Select */}
                        <div className="w-[110px] shrink-0">
                            <Select value={sumberDana} onValueChange={setSumberDana}>
                                <SelectTrigger size="sm" className="w-full h-8 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-2xs">
                                    <SelectValue placeholder="Sumber" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs">Semua Sumber</SelectItem>
                                    <SelectItem value="BKK" className="text-xs">BKK</SelectItem>
                                    <SelectItem value="DD" className="text-xs">DD</SelectItem>
                                    <SelectItem value="ADD" className="text-xs">ADD</SelectItem>
                                    <SelectItem value="APBD" className="text-xs">APBD</SelectItem>
                                    <SelectItem value="Lainnya" className="text-xs">Lainnya</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Right Actions: Segarkan & Collapse */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                        {openGroupsCount > 0 && (
                            <div className="flex items-center gap-1.5 shrink-0">
                                <Badge variant="secondary" className="h-8 px-2 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold gap-1 rounded-xl shrink-0">
                                    <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                    {openGroupsCount} Terbuka
                                </Badge>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCollapseAllGroups}
                                    className="h-8 px-2.5 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl gap-1 text-slate-700 dark:text-slate-300 hover:text-rose-600 shadow-2xs cursor-pointer shrink-0"
                                >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Tutup Semua</span>
                                </Button>
                            </div>
                        )}

                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={fetchGroups} 
                            disabled={isLoadingGroups}
                            className="h-8 px-2.5 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl gap-1.5 text-slate-700 dark:text-slate-300 shadow-2xs cursor-pointer shrink-0"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGroups ? "animate-spin" : ""}`} />
                            <span className="hidden sm:inline">Segarkan</span>
                        </Button>
                    </div>
                </div>

                {/* Active Filter Chips / Badges Row (Shows when any filter is active) */}
                {isFilterActive && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-slate-100 dark:border-slate-800/60 animate-in fade-in-50 duration-200">
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">Filter Aktif:</span>
                        {tahun !== "all" && (
                            <Badge variant="secondary" className="h-6 px-2 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 gap-1 rounded-lg">
                                Tahun: {tahun}
                                <button onClick={() => setTahun("all")} className="hover:text-amber-900 ml-0.5 cursor-pointer"><X className="w-3 h-3" /></button>
                            </Badge>
                        )}
                        {statusFilter !== "all" && (
                            <Badge variant="secondary" className="h-6 px-2 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 gap-1 rounded-lg">
                                Status: {statusFilter}
                                <button onClick={() => setStatusFilter("all")} className="hover:text-emerald-900 ml-0.5 cursor-pointer"><X className="w-3 h-3" /></button>
                            </Badge>
                        )}
                        {sumberDana !== "all" && (
                            <Badge variant="secondary" className="h-6 px-2 text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200 gap-1 rounded-lg">
                                Sumber: {sumberDana}
                                <button onClick={() => setSumberDana("all")} className="hover:text-purple-900 ml-0.5 cursor-pointer"><X className="w-3 h-3" /></button>
                            </Badge>
                        )}
                        {searchTerm !== "" && (
                            <Badge variant="secondary" className="h-6 px-2 text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 gap-1 rounded-lg">
                                Cari: "{searchTerm}"
                                <button onClick={() => setSearchTerm("")} className="hover:text-indigo-900 ml-0.5 cursor-pointer"><X className="w-3 h-3" /></button>
                            </Badge>
                        )}
                        <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-6 px-2 text-[11px] font-medium text-rose-600 rounded-lg gap-1 ml-auto cursor-pointer">
                            <RotateCcw className="w-3 h-3" /> Reset Semua
                        </Button>
                    </div>
                )}
            </div>

            {/* 2. Redesigned UI/UX Dashboard Summary Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
                {/* Card 1: Total Pagu Anggaran */}
                <div className="flex items-center justify-between p-3 px-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all w-full">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Total Pagu Anggaran</p>
                        <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                            {formatRupiah(overallStats.pagu)}
                        </p>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60 shrink-0">
                        <Coins className="w-4 h-4" />
                    </div>
                </div>

                {/* Card 2: Realisasi Fisik */}
                <div className="flex items-center justify-between p-3 px-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all w-full">
                    <div className="w-full">
                        <div className="flex items-center justify-between gap-1">
                            <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Realisasi Fisik</p>
                            <div className="p-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
                                <Ruler className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1">
                            <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                                {formatDecimal(overallStats.panjangRealisasi)}m <span className="text-[9px] font-normal text-slate-400">/ {formatDecimal(overallStats.panjangTarget)}m</span>
                            </span>
                            <div className="flex items-center gap-1">
                                <Progress value={overallPanjangProgres} className="h-1 w-8 sm:w-10 bg-slate-100 dark:bg-slate-800" />
                                <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">{overallPanjangProgres}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 3: Desa Ter-monitoring */}
                <div className="flex items-center justify-between p-3 px-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all w-full">
                    <div className="w-full">
                        <div className="flex items-center justify-between gap-1">
                            <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Desa Ter-monitoring</p>
                            <div className="p-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
                                <Home className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1">
                            <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                                {overallStats.desaMonitoring} <span className="text-[9px] font-normal text-slate-400">/ {overallStats.desaPlotting} Desa</span>
                            </span>
                            <div className="flex items-center gap-1">
                                <Progress value={overallDesaProgres} className="h-1 w-8 sm:w-10 bg-slate-100 dark:bg-slate-800" />
                                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">{overallDesaProgres}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 4: Rata-Rata Progres */}
                <div className="flex items-center justify-between p-3 px-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all w-full">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Rata-Rata Progres</p>
                        <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                            {formatDecimal((overallDesaProgres + overallPanjangProgres) / 2)}%
                        </p>
                    </div>
                    <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/60 shrink-0">
                        <Activity className="w-4 h-4" />
                    </div>
                </div>
            </div>

            {/* 3. Main Content Area (High Performance Instant Table Expand Container) */}
            <div className="flex-1 min-h-0 flex flex-col rounded-2xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
                {isLoadingGroups ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-16">
                        <Spinner className="w-9 h-9 text-blue-600" />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 font-semibold">Memuat data ringkasan agregasi...</p>
                    </div>
                ) : groups.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <Empty className="py-10">
                            <EmptyHeader>
                                <EmptyTitle className="font-semibold text-slate-800 dark:text-white text-sm">Tidak Ada Data</EmptyTitle>
                                <EmptyDescription className="text-slate-500 dark:text-slate-400 max-w-sm mt-1 text-xs">
                                    Data plotting anggaran dan laporan monitoring untuk filter terpilih tidak ditemukan.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    </div>
                ) : (
                    <div className="flex-1 min-h-0 overflow-auto">
                        <Table className="w-full min-w-[1100px] min-h-full border-collapse">
                            <TableHeader className="bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-30 border-b dark:border-slate-800 shadow-2xs">
                                <TableRow>
                                    <TableHead className="w-10 text-center text-xs font-semibold text-slate-400 uppercase p-2"></TableHead>
                                    <TableHead className="w-12 text-center text-xs font-semibold text-slate-400 uppercase">No</TableHead>
                                    <TableHead className="w-[400px] text-xs font-semibold text-slate-400 uppercase truncate">Tahun & Jenis Bantuan</TableHead>
                                    <TableHead className="w-[160px] text-center text-xs font-semibold text-slate-400 uppercase">Desa Ter-monitoring</TableHead>
                                    <TableHead className="w-[180px] text-right text-xs font-semibold text-slate-400 uppercase">Fisik (Realisasi / Target)</TableHead>
                                    <TableHead className="w-[160px] text-right text-xs font-semibold text-slate-400 uppercase">Total Target Pagu</TableHead>
                                    <TableHead className="w-[140px] text-xs font-semibold text-slate-400 uppercase text-center">Progress</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groups.map((group, idx) => {
                                    const groupKey = `${group.tahun_anggaran}-${group.jenis_bantuan}`;
                                    const isGroupExpanded = !!expandedGroups[groupKey];
                                    const kecamatans = kecamatanData[groupKey] || [];
                                    const isGroupLoading = !!loadingKecamatan[groupKey];

                                    return (
                                        <React.Fragment key={groupKey}>
                                            <TableRow 
                                                className={cn(
                                                    "transition-all duration-200 select-none",
                                                    isGroupExpanded 
                                                        ? "bg-blue-50 dark:bg-blue-950 sticky top-[37px] z-20 border-b border-l-4 border-l-blue-600 dark:border-l-blue-400 shadow-xs" 
                                                        : "hover:bg-slate-50/50 dark:hover:bg-slate-900/50 border-l-4 border-l-transparent"
                                                )}
                                            >
                                                {/* Left Expand/Collapse Button */}
                                                <TableCell className={cn("text-center p-2 w-10", isGroupExpanded && "sticky top-[37px] z-20 bg-blue-50 dark:bg-blue-950")}>
                                                    <Button
                                                        variant={isGroupExpanded ? "default" : "ghost"}
                                                        size="icon"
                                                        onClick={() => toggleGroupExpand(groupKey, group.tahun_anggaran, group.jenis_bantuan)}
                                                        className={cn(
                                                            "rounded-full w-7 h-7 transition-all duration-200 cursor-pointer",
                                                            isGroupExpanded 
                                                                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-2xs" 
                                                                : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                                                        )}
                                                        title={isGroupExpanded ? "Tutup Grup" : "Buka Daftar Desa"}
                                                    >
                                                        {isGroupExpanded ? (
                                                            <ChevronDown className="w-4 h-4" />
                                                        ) : (
                                                            <ChevronRight className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                </TableCell>
                                                <TableCell className={cn("text-center font-semibold text-xs text-slate-400", isGroupExpanded && "sticky top-[37px] z-20 bg-blue-50 dark:bg-blue-950")}>
                                                    {idx + 1}
                                                </TableCell>
                                                <TableCell className={cn("font-semibold text-xs text-slate-900 dark:text-white max-w-[400px]", isGroupExpanded && "sticky top-[37px] z-20 bg-blue-50 dark:bg-blue-950")}>
                                                    <div className="flex items-center gap-2 min-w-0" title={`TA ${group.tahun_anggaran} - ${group.jenis_bantuan}`}>
                                                        <Badge className="bg-blue-600 text-white font-semibold h-5 rounded-md text-[10px] px-2 shrink-0">
                                                            TA {group.tahun_anggaran}
                                                        </Badge>
                                                        <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 truncate">
                                                            {group.jenis_bantuan}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className={cn("text-center font-semibold text-xs text-slate-700 dark:text-slate-300", isGroupExpanded && "sticky top-[37px] z-20 bg-blue-50 dark:bg-blue-950")}>
                                                    <span className="font-bold text-slate-900 dark:text-white">{group.jumlah_desa_monitoring} / {group.jumlah_desa_plotting}</span> Desa ({group.persentase_progres_desa}%)
                                                </TableCell>
                                                <TableCell className={cn("text-right font-semibold text-xs text-slate-700 dark:text-slate-300", isGroupExpanded && "sticky top-[37px] z-20 bg-blue-50 dark:bg-blue-950")}>
                                                    <span className="font-bold text-slate-900 dark:text-white">{formatDecimal(group.total_realisasi_panjang)}m</span> / {formatDecimal(group.total_target_panjang)}m
                                                </TableCell>
                                                <TableCell className={cn("text-right font-bold text-xs text-emerald-600 dark:text-emerald-400", isGroupExpanded && "sticky top-[37px] z-20 bg-blue-50 dark:bg-blue-950")}>
                                                    {formatRupiah(group.total_target_pagu)}
                                                </TableCell>
                                                <TableCell className={cn("text-center", isGroupExpanded && "sticky top-[37px] z-20 bg-blue-50 dark:bg-blue-950")}>
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Progress value={group.persentase_progres_panjang} className="h-1.5 w-14 bg-slate-100 dark:bg-slate-800" />
                                                        <span className="text-[10px] font-semibold text-slate-800 dark:text-slate-200">{group.persentase_progres_panjang}%</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>

                                            {/* Level 2: Expanded Group -> Kecamatan Table */}
                                            {isGroupExpanded && (
                                                <TableRow className="bg-slate-50/30 dark:bg-slate-900/20">
                                                    <TableCell colSpan={7} className="p-0 border-t dark:border-slate-800">
                                                        <div className="bg-white dark:bg-slate-950 border-b border-l-4 border-l-blue-500/30 dark:border-l-blue-400/30 max-w-full">
                                                            {isGroupLoading ? (
                                                                <div className="flex justify-center py-6">
                                                                    <Spinner className="w-6 h-6 text-blue-600" />
                                                                </div>
                                                            ) : kecamatans.length === 0 ? (
                                                                <p className="text-xs text-muted-foreground py-4 px-5 font-semibold">
                                                                    Tidak ada data kecamatan untuk grup ini.
                                                                </p>
                                                            ) : (
                                                                <div className="overflow-x-auto max-w-full">
                                                                    <Table className="w-full min-w-[1000px] border-collapse">
                                                                        <TableHeader className="bg-white dark:bg-slate-950 border-b dark:border-slate-800 shadow-2xs">
                                                                            {/* Row 1: Banner */}
                                                                            <TableRow className="hover:bg-transparent border-b dark:border-slate-800 bg-blue-50/60 dark:bg-blue-950/40">
                                                                                <TableHead colSpan={7} className="h-auto py-2.5 px-4">
                                                                                    <div className="flex items-center justify-between gap-2">
                                                                                        <span className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider flex items-center gap-1.5 truncate max-w-full" title={`Daftar Kecamatan - TA ${group.tahun_anggaran} (${group.jenis_bantuan})`}>
                                                                                            <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                                                                            Daftar Kecamatan — TA {group.tahun_anggaran} ({group.jenis_bantuan})
                                                                                            <Badge variant="secondary" className="ml-1 text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                                                                {kecamatans.length} Kecamatan
                                                                                            </Badge>
                                                                                            <span className="ml-2 text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-2xs uppercase tracking-wider">
                                                                                                Grup Terbuka
                                                                                            </span>
                                                                                        </span>
                                                                                        <Button
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            onClick={() => toggleGroupExpand(groupKey, group.tahun_anggaran, group.jenis_bantuan)}
                                                                                            className="h-7 px-2.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-slate-200 dark:border-slate-800 gap-1 rounded-lg cursor-pointer shrink-0"
                                                                                        >
                                                                                            <ChevronUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                                                            Tutup Grup
                                                                                        </Button>
                                                                                    </div>
                                                                                </TableHead>
                                                                            </TableRow>
                                                                            {/* Row 2: Column Headers */}
                                                                            <TableRow className="bg-slate-100 dark:bg-slate-900 border-b dark:border-slate-800">
                                                                                <TableHead className="w-10 text-center text-[10px] uppercase font-semibold text-slate-500 p-2"></TableHead>
                                                                                <TableHead className="w-10 text-center text-[10px] uppercase font-semibold text-slate-500">No</TableHead>
                                                                                <TableHead className="text-[10px] uppercase font-semibold text-slate-500">Kecamatan</TableHead>
                                                                                <TableHead className="text-[10px] uppercase font-semibold text-slate-500 text-center">Monitoring Desa</TableHead>
                                                                                <TableHead className="text-[10px] uppercase font-semibold text-slate-500 text-right">Realisasi / Target Fisik (m)</TableHead>
                                                                                <TableHead className="text-[10px] uppercase font-semibold text-slate-500 text-right">Target Pagu</TableHead>
                                                                                <TableHead className="text-[10px] uppercase font-semibold text-slate-500 text-center">Progress Fisik</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {kecamatans.map((kec, kIdx) => {
                                                                                const kecamatanKey = `${groupKey}-${kec.id_kecamatan}`;
                                                                                const isKecExpanded = !!expandedKecamatan[kecamatanKey];
                                                                                const desas = desaData[kecamatanKey] || [];
                                                                                const isKecLoading = !!loadingDesa[kecamatanKey];

                                                                                return (
                                                                                    <React.Fragment key={kecamatanKey}>
                                                                                        <TableRow className={cn(
                                                                                            "transition-all duration-200 select-none border-b dark:border-slate-800/65",
                                                                                            isKecExpanded 
                                                                                                ? "bg-slate-50/80 dark:bg-slate-900/60 border-b border-l-4 border-l-emerald-600 dark:border-l-emerald-450 shadow-xs" 
                                                                                                : "hover:bg-slate-50/50 dark:hover:bg-slate-900/50 border-l-4 border-l-transparent"
                                                                                        )}>
                                                                                            {/* Left Expand/Collapse Button for Kecamatan */}
                                                                                            <TableCell className="text-center p-2 w-10">
                                                                                                <Button
                                                                                                    variant={isKecExpanded ? "default" : "ghost"}
                                                                                                    size="icon"
                                                                                                    onClick={() => toggleKecamatanExpand(kecamatanKey, group.tahun_anggaran, group.jenis_bantuan, kec.id_kecamatan)}
                                                                                                    className={cn(
                                                                                                        "rounded-full w-6 h-6 transition-all duration-200 cursor-pointer",
                                                                                                        isKecExpanded 
                                                                                                            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs" 
                                                                                                            : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                                                                                                    )}
                                                                                                    title={isKecExpanded ? "Tutup Kecamatan" : "Buka Daftar Desa"}
                                                                                                >
                                                                                                    {isKecExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                                                                </Button>
                                                                                            </TableCell>
                                                                                            <TableCell className="text-center font-semibold text-[11px] text-slate-400">{kIdx + 1}</TableCell>
                                                                                            <TableCell className="font-bold text-xs text-slate-900 dark:text-white">
                                                                                                {kec.nama_kecamatan}
                                                                                            </TableCell>
                                                                                            <TableCell className="text-center text-xs text-slate-700 dark:text-slate-300">
                                                                                                <span className="font-bold text-slate-900 dark:text-white">{kec.jumlah_desa_monitoring} / {kec.jumlah_desa_plotting}</span> Desa ({kec.persentase_progres_desa}%)
                                                                                            </TableCell>
                                                                                            <TableCell className="text-right text-xs text-slate-700 dark:text-slate-300">
                                                                                                <span className="font-bold text-slate-900 dark:text-white">{formatDecimal(kec.total_realisasi_panjang)}m</span> / {formatDecimal(kec.total_target_panjang)}m
                                                                                            </TableCell>
                                                                                            <TableCell className="text-right font-bold text-xs text-emerald-600 dark:text-emerald-450 whitespace-nowrap">
                                                                                                {formatRupiah(kec.total_target_pagu)}
                                                                                            </TableCell>
                                                                                            <TableCell className="text-center">
                                                                                                <div className="flex items-center justify-center gap-2">
                                                                                                    <Progress value={kec.persentase_progres_panjang} className="h-1.5 w-14 bg-slate-100 dark:bg-slate-800" />
                                                                                                    <span className="text-[10px] font-semibold text-slate-800 dark:text-slate-200">{kec.persentase_progres_panjang}%</span>
                                                                                                </div>
                                                                                            </TableCell>
                                                                                        </TableRow>

                                                                                        {/* Level 3: Expanded Kecamatan -> Desa Table */}
                                                                                        {isKecExpanded && (
                                                                                            <TableRow className="bg-slate-100/20 dark:bg-slate-900/10">
                                                                                                <TableCell colSpan={7} className="p-0 border-t dark:border-slate-800">
                                                                                                    <div className="bg-white dark:bg-slate-950 border-b border-l-4 border-l-emerald-500/30 dark:border-l-emerald-450/30 max-w-full">
                                                                                                        {isKecLoading ? (
                                                                                                            <div className="flex justify-center py-6">
                                                                                                                <Spinner className="w-6 h-6 text-blue-600" />
                                                                                                            </div>
                                                                                                        ) : desas.length === 0 ? (
                                                                                                            <p className="text-xs text-muted-foreground py-4 px-5 font-semibold">
                                                                                                                Tidak ada data desa untuk kecamatan ini.
                                                                                                            </p>
                                                                                                        ) : (() => {
                                                                                                            const currentLimit = desaLimit[kecamatanKey] || INITIAL_DESA_LIMIT;
                                                                                                            const visibleDesas = desas.slice(0, currentLimit);
                                                                                                            const hasMoreDesa = desas.length > currentLimit;

                                                                                                            return (
                                                                                                                <div className="overflow-x-auto max-w-full">
                                                                                                                    <Table className="w-full min-w-[1000px] border-collapse">
                                                                                                                        <TableHeader className="bg-white dark:bg-slate-950 border-b dark:border-slate-800 shadow-2xs">
                                                                                                                            {/* Row 1: Banner */}
                                                                                                                            <TableRow className="hover:bg-transparent border-b dark:border-slate-800 bg-indigo-50/60 dark:bg-indigo-950/40">
                                                                                                                                <TableHead colSpan={9} className="h-auto py-2 px-4">
                                                                                                                                    <div className="flex items-center justify-between gap-2">
                                                                                                                                        <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1.5 truncate max-w-full" title={`Daftar Desa - Kec. ${kec.nama_kecamatan}`}>
                                                                                                                                            <Home className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                                                                                                                            Daftar Desa — Kec. {kec.nama_kecamatan}
                                                                                                                                            <Badge variant="secondary" className="ml-1 text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-850">
                                                                                                                                                {desas.length} Desa
                                                                                                                                            </Badge>
                                                                                                                                            <span className="ml-2 text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full shadow-2xs uppercase tracking-wider">
                                                                                                                                                Kecamatan Terbuka
                                                                                                                                            </span>
                                                                                                                                        </span>
                                                                                                                                        <Button
                                                                                                                                            variant="outline"
                                                                                                                                            size="sm"
                                                                                                                                            onClick={() => toggleKecamatanExpand(kecamatanKey, group.tahun_anggaran, group.jenis_bantuan, kec.id_kecamatan)}
                                                                                                                                            className="h-7 px-2.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-slate-200 dark:border-slate-800 gap-1 rounded-lg cursor-pointer shrink-0"
                                                                                                                                        >
                                                                                                                                            <ChevronUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                                                                                                                            Tutup Kecamatan
                                                                                                                                        </Button>
                                                                                                                                    </div>
                                                                                                                                </TableHead>
                                                                                                                            </TableRow>
                                                                                                                            {/* Row 2: Columns */}
                                                                                                                            <TableRow className="bg-slate-100 dark:bg-slate-900 border-b dark:border-slate-800">
                                                                                                                                <TableHead className="w-10 text-center text-[10px] uppercase font-semibold text-slate-500 p-2"></TableHead>
                                                                                                                                <TableHead className="w-10 text-center text-[10px] uppercase font-semibold text-slate-500">No</TableHead>
                                                                                                                                <TableHead className="text-[10px] uppercase font-semibold text-slate-500">Nama Desa</TableHead>
                                                                                                                                <TableHead className="text-[10px] uppercase font-semibold text-slate-500">Kegiatan / Lokasi</TableHead>
                                                                                                                                <TableHead className="text-[10px] uppercase font-semibold text-slate-500 text-right">Target Pagu</TableHead>
                                                                                                                                <TableHead className="text-[10px] uppercase font-semibold text-slate-500 text-right">Target vs Realisasi (m)</TableHead>
                                                                                                                                <TableHead className="text-[10px] uppercase font-semibold text-slate-500 text-center">Status Laporan</TableHead>
                                                                                                                                <TableHead className="text-[10px] uppercase font-semibold text-slate-500 text-center">Status Monitoring</TableHead>
                                                                                                                                <TableHead className="text-[10px] uppercase font-semibold text-slate-500 text-center">Berita Acara</TableHead>
                                                                                                                            </TableRow>
                                                                                                                        </TableHeader>
                                                                                                                        <TableBody>
                                                                                                                            {visibleDesas.map((item, dIdx) => {
                                                                                                                                const isExpanded = !!expandedDesa[item.plotting_id];
                                                                                                                                const segmenList = segmenData[item.plotting_id] || [];
                                                                                                                                const isSegmenLoading = !!loadingSegmen[item.plotting_id];

                                                                                                                                return (
                                                                                                                                    <React.Fragment key={item.plotting_id || dIdx}>
                                                                                                                                        <TableRow className={cn(
                                                                                                                                            "transition-all duration-200 select-none border-b dark:border-slate-800/65",
                                                                                                                                            isExpanded 
                                                                                                                                                ? "bg-purple-50 dark:bg-purple-950 border-b border-l-4 border-l-purple-600 dark:border-l-purple-400 shadow-xs" 
                                                                                                                                                : "hover:bg-slate-50/50 dark:hover:bg-slate-900/50 border-l-4 border-l-transparent"
                                                                                                                                        )}>
                                                                                                                                            {/* Left Accordion Toggle Button for Desa */}
                                                                                                                                            <TableCell className="text-center p-2 w-10">
                                                                                                                                                <Button
                                                                                                                                                    variant={isExpanded ? "default" : "ghost"}
                                                                                                                                                    size="icon"
                                                                                                                                                    onClick={() => toggleDesa(item.plotting_id, item.laporan_id)}
                                                                                                                                                    className={cn(
                                                                                                                                                        "rounded-full w-6 h-6 transition-all duration-200 cursor-pointer",
                                                                                                                                                        isExpanded 
                                                                                                                                                            ? "bg-purple-600 hover:bg-purple-700 text-white shadow-2xs" 
                                                                                                                                                            : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                                                                                                                                                    )}
                                                                                                                                                    title={isExpanded ? "Tutup Desa" : "Buka Rincian Segmen"}
                                                                                                                                                >
                                                                                                                                                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                                                                                                                </Button>
                                                                                                                                            </TableCell>
                                                                                                                                            <TableCell className="text-center font-semibold text-[11px] text-slate-400">{dIdx + 1}</TableCell>
                                                                                                                                            <TableCell className="font-bold text-xs">
                                                                                                                                                <div className="flex items-center gap-1.5">
                                                                                                                                                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                                                                                                                                    <span className="text-slate-900 dark:text-white">{item.nama_desa}</span>
                                                                                                                                                </div>
                                                                                                                                            </TableCell>
                                                                                                                                            <TableCell className="text-xs text-slate-600 dark:text-slate-350 max-w-xs">
                                                                                                                                                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={item.nama_kegiatan}>{item.nama_kegiatan || "-"}</p>
                                                                                                                                                <p className="text-[10px] text-slate-400 truncate" title={item.lokasi_kegiatan}>{item.lokasi_kegiatan || "-"}</p>
                                                                                                                                            </TableCell>
                                                                                                                                            <TableCell className="text-right text-xs font-bold text-emerald-600 dark:text-emerald-450 whitespace-nowrap">
                                                                                                                                                {formatRupiah(item.target_pagu_anggaran)}
                                                                                                                                            </TableCell>
                                                                                                                                            <TableCell className="text-right text-xs whitespace-nowrap">
                                                                                                                                                <span className="font-bold text-slate-800 dark:text-slate-200">{formatDecimal(item.realisasi_panjang)}m</span>
                                                                                                                                                <span className="text-slate-450 font-normal"> / {formatDecimal(item.target_panjang_m)}m</span>
                                                                                                                                            </TableCell>
                                                                                                                                            <TableCell className="text-center">
                                                                                                                                                {item.status_laporan ? (
                                                                                                                                                    <Badge variant="outline" className="text-[10px] py-0 px-2 font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                                                                                                                        {item.status_laporan}
                                                                                                                                                    </Badge>
                                                                                                                                                ) : (
                                                                                                                                                    <span className="text-[10px] text-slate-400">-</span>
                                                                                                                                                )}
                                                                                                                                            </TableCell>
                                                                                                                                            <TableCell className="text-center">
                                                                                                                                                {item.status_monitoring === "Sudah Monitoring" ? (
                                                                                                                                                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-semibold border-emerald-300 dark:border-emerald-800">
                                                                                                                                                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                                                                                                                                                        Sudah Monitoring
                                                                                                                                                    </Badge>
                                                                                                                                                ) : (
                                                                                                                                                    <Badge variant="secondary" className="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800">
                                                                                                                                                        Belum Monitoring
                                                                                                                                                    </Badge>
                                                                                                                                                )}
                                                                                                                                            </TableCell>
                                                                                                                                            <TableCell className="text-center text-xs text-slate-500 whitespace-nowrap">
                                                                                                                                                {item.nomor_ba ? (
                                                                                                                                                    <div>
                                                                                                                                                        <p className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">{item.nomor_ba}</p>
                                                                                                                                                        <p className="text-[10px] text-slate-500 font-medium">{formatTanggalHuman(item.tanggal_monitoring)}</p>
                                                                                                                                                    </div>
                                                                                                                                                ) : (
                                                                                                                                                    <span className="text-slate-450 text-[10px]">-</span>
                                                                                                                                                )}
                                                                                                                                            </TableCell>
                                                                                                                                        </TableRow>

                                                                                                                                        {/* Level 4: Expanded Desa -> Segmen Rows */}
                                                                                                                                        {isExpanded && (
                                                                                                                                            <TableRow className="bg-slate-50/20 dark:bg-slate-900/10">
                                                                                                                                                <TableCell colSpan={9} className="p-0 border-t dark:border-slate-800">
                                                                                                                                                    <div className="bg-white dark:bg-slate-950 border-b border-l-4 border-l-purple-500/30 dark:border-l-purple-400/30 max-w-full">
                                                                                                                                                        {isSegmenLoading ? (
                                                                                                                                                            <div className="flex justify-center py-5">
                                                                                                                                                                <Spinner className="w-6 h-6 text-blue-600" />
                                                                                                                                                            </div>
                                                                                                                                                        ) : segmenList.length === 0 ? (
                                                                                                                                                            <p className="text-xs text-muted-foreground py-3 px-4 font-semibold">
                                                                                                                                                                Belum ada rincian segmen fisik terpeta untuk laporan ini.
                                                                                                                                                            </p>
                                                                                                                                                        ) : (
                                                                                                                                                            <div className="overflow-x-auto max-w-full">
                                                                                                                                                                <Table className="w-full min-w-[850px] border-collapse">
                                                                                                                                                                    <TableHeader className="bg-white dark:bg-slate-950 border-b dark:border-slate-800 shadow-2xs">
                                                                                                                                                                        {/* Row 1: Banner */}
                                                                                                                                                                        <TableRow className="hover:bg-transparent border-b dark:border-slate-800 bg-purple-50/60 dark:bg-purple-950/40">
                                                                                                                                                                            <TableHead colSpan={6} className="h-auto py-2 px-4">
                                                                                                                                                                                <div className="flex items-center justify-between gap-2">
                                                                                                                                                                                    <span className="text-xs font-semibold text-purple-900 dark:text-purple-200 uppercase tracking-wider flex items-center gap-1.5 truncate max-w-full" title={`Rincian Segmen Fisik Terpeta - ${item.nama_desa}`}>
                                                                                                                                                                                        <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                                                                                                                                                                                        Rincian Segmen Fisik Terpeta — {item.nama_desa}
                                                                                                                                                                                        <span className="ml-2 text-[10px] font-bold bg-purple-600 text-white px-2 py-0.5 rounded-full shadow-2xs uppercase tracking-wider">
                                                                                                                                                                                            Desa Terbuka
                                                                                                                                                                                        </span>
                                                                                                                                                                                    </span>
                                                                                                                                                                                    <Button
                                                                                                                                                                                        variant="outline"
                                                                                                                                                                                        size="sm"
                                                                                                                                                                                        onClick={() => toggleDesa(item.plotting_id, item.laporan_id)}
                                                                                                                                                                                        className="h-7 px-2.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-slate-200 dark:border-slate-800 gap-1 rounded-lg cursor-pointer shrink-0"
                                                                                                                                                                                    >
                                                                                                                                                                                        <ChevronUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                                                                                                                                                                        Tutup Desa
                                                                                                                                                                                    </Button>
                                                                                                                                                                                </div>
                                                                                                                                                                            </TableHead>
                                                                                                                                                                        </TableRow>
                                                                                                                                                                        {/* Row 2: Columns */}
                                                                                                                                                                        <TableRow className="bg-slate-100 dark:bg-slate-900 border-b dark:border-slate-800">
                                                                                                                                                                            <TableHead className="text-[10px] font-bold text-slate-500 py-1.5 pl-4">Ruas / Nama Jalan</TableHead>
                                                                                                                                                                            <TableHead className="text-[10px] font-bold text-slate-500 text-right py-1.5">Panjang (m)</TableHead>
                                                                                                                                                                            <TableHead className="text-[10px] font-bold text-slate-500 text-right py-1.5">Lebar (m)</TableHead>
                                                                                                                                                                            <TableHead className="text-[10px] font-bold text-slate-500 text-center py-1.5">Kondisi</TableHead>
                                                                                                                                                                            <TableHead className="text-[10px] font-bold text-slate-500 text-center py-1.5">Tahun</TableHead>
                                                                                                                                                                            <TableHead className="text-[10px] font-bold text-slate-500 text-center py-1.5 pr-4">Sumber Dana</TableHead>
                                                                                                                                                                        </TableRow>
                                                                                                                                                                    </TableHeader>
                                                                                                                                                                    <TableBody>
                                                                                                                                                                        {segmenList.map((seg, sIdx) => (
                                                                                                                                                                            <TableRow key={seg.id || sIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 border-b dark:border-slate-800/60">
                                                                                                                                                                                <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-300 py-1.5 pl-4">
                                                                                                                                                                                    {seg.namobj || "Segmen Tanpa Nama"}
                                                                                                                                                                                </TableCell>
                                                                                                                                                                                <TableCell className="text-xs text-right font-bold py-1.5">
                                                                                                                                                                                    {formatDecimal(seg.panjang)}m
                                                                                                                                                                                </TableCell>
                                                                                                                                                                                <TableCell className="text-xs text-right py-1.5">
                                                                                                                                                                                    {formatDecimal(seg.lebar)}m
                                                                                                                                                                                </TableCell>
                                                                                                                                                                                <TableCell className="text-center py-1.5">
                                                                                                                                                                                    <Badge 
                                                                                                                                                                                        variant="outline" 
                                                                                                                                                                                        className={cn(
                                                                                                                                                                                            "text-[10px] py-0.5 px-2 font-bold rounded-md border shadow-2xs",
                                                                                                                                                                                            (() => {
                                                                                                                                                                                                const k = (seg.kondisi || "").toLowerCase().trim();
                                                                                                                                                                                                if (k === "baik") return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800";
                                                                                                                                                                                                if (k === "sedang") return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800";
                                                                                                                                                                                                if (k.includes("rusak") || k === "buruk") return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-450 dark:border-rose-800";
                                                                                                                                                                                                return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800";
                                                                                                                                                                                            })()
                                                                                                                                                                                        )}
                                                                                                                                                                                    >
                                                                                                                                                                                        {seg.kondisi || "Tidak Diketahui"}
                                                                                                                                                                                    </Badge>
                                                                                                                                                                                </TableCell>
                                                                                                                                                                                <TableCell className="text-xs text-center py-1.5 text-slate-500">
                                                                                                                                                                                    {seg.tahun_pembangunan || "-"}
                                                                                                                                                                                </TableCell>
                                                                                                                                                                                <TableCell className="text-xs text-center py-1.5 text-slate-500 pr-4">
                                                                                                                                                                                    {seg.sumber_dana || "-"}
                                                                                                                                                                                </TableCell>
                                                                                                                                                                            </TableRow>
                                                                                                                                                                        ))}
                                                                                                                                                                    </TableBody>
                                                                                                                                                                </Table>
                                                                                                                                                            </div>
                                                                                                                                                        )}
                                                                                                                                                    </div>
                                                                                                                                                </TableCell>
                                                                                                                                            </TableRow>
                                                                                                                                        )}
                                                                                                                                    </React.Fragment>
                                                                                                                                );
                                                                                                                            })}
                                                                                                                            {/* Load More Row inside Table */}
                                                                                                                            {hasMoreDesa && (
                                                                                                                                <TableRow className="bg-slate-50/50 dark:bg-slate-900/50">
                                                                                                                                    <TableCell colSpan={9} className="p-3">
                                                                                                                                        <div className="flex flex-wrap items-center justify-between gap-2 p-2 px-3 bg-white dark:bg-slate-950 border dark:border-slate-800 rounded-lg">
                                                                                                                                            <span className="text-[11px] font-semibold text-slate-500">
                                                                                                                                                Menampilkan <span className="font-bold text-slate-800 dark:text-white">{visibleDesas.length}</span> dari <span className="font-bold text-slate-800 dark:text-white">{desas.length}</span> desa
                                                                                                                                            </span>
                                                                                                                                            <div className="flex items-center gap-1.5">
                                                                                                                                                <Button
                                                                                                                                                    variant="outline"
                                                                                                                                                    size="sm"
                                                                                                                                                    onClick={() => handleLoadMoreDesa(kecamatanKey)}
                                                                                                                                                    className="h-7 text-[11px] px-2.5 rounded-md border-slate-200 dark:border-slate-800 font-medium"
                                                                                                                                                >
                                                                                                                                                    + Muat 30 Desa Lagi
                                                                                                                                                </Button>
                                                                                                                                                <Button
                                                                                                                                                    variant="ghost"
                                                                                                                                                    size="sm"
                                                                                                                                                    onClick={() => handleShowAllDesa(kecamatanKey, desas.length)}
                                                                                                                                                    className="h-7 text-[11px] px-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md font-semibold"
                                                                                                                                                >
                                                                                                                                                    Tampilkan Semua ({desas.length})
                                                                                                                                                </Button>
                                                                                                                                            </div>
                                                                                                                                        </div>
                                                                                                                                    </TableCell>
                                                                                                                                </TableRow>
                                                                                                                            )}
                                                                                                                        </TableBody>
                                                                                                                    </Table>
                                                                                                                </div>
                                                                                                            );
                                                                                                        })()}
                                                                                                    </div>
                                                                                                </TableCell>
                                                                                            </TableRow>
                                                                                        )}
                                                                                    </React.Fragment>
                                                                                );
                                                                            })}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    );
}
