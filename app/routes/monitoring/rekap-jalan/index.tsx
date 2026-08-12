import * as React from "react";
import { type MetaFunction } from "react-router";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Combobox, type ComboboxOption } from "~/components/ui/combobox";
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
    Ruler, 
    Home, 
    CheckCircle2, 
    SlidersHorizontal, 
    RefreshCw, 
    ChevronDown, 
    ChevronUp,
    ChevronRight,
    Activity,
    Search,
    Map,
    TrendingUp,
    Building2,
    RotateCcw,
    X
} from "lucide-react";
import { cn } from "~/lib/utils";
import { 
    rekapService, 
    type RekapKecamatanResponse,
    type RekapDesaResponse, 
    type RekapRuasResponse, 
    type RekapSegmenResponse 
} from "~/services/rekap.service";
import { kecamatanService, type Kecamatan } from "~/services/kecamatan";
import { desaService, type Desa } from "~/services/desa";
import { toast } from "sonner";

export const meta: MetaFunction = () => {
    return [
        { title: "Rekap Jalan Poros Desa - MELAROSA" },
        { name: "description", content: "Laporan rekapitulasi progres jalan poros desa Kabupaten Bojonegoro" },
    ];
};

export default function RekapJalanPage() {
    const [isMounted, setIsMounted] = React.useState(false);

    // Filter states
    const [idKecamatan, setIdKecamatan] = React.useState<string>("all");
    const [idDesa, setIdDesa] = React.useState<string>("all");
    const [tahun, setTahun] = React.useState<string>("all");
    const [kondisi, setKondisi] = React.useState<string>("all");
    const [sumberDana, setSumberDana] = React.useState<string>("all");
    const [searchTerm, setSearchTerm] = React.useState<string>("");

    // Master lists
    const [kecamatans, setKecamatans] = React.useState<Kecamatan[]>([]);
    const [desas, setDesas] = React.useState<Desa[]>([]);
    
    // Level 1: Primary Data State (Kecamatan Agregat)
    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    const [rekapKecamatan, setRekapKecamatan] = React.useState<RekapKecamatanResponse[]>([]);
    const [expandedKecamatan, setExpandedKecamatan] = React.useState<Record<number, boolean>>({});

    // Level 2: Desa Data States (Lazy loaded per Kecamatan)
    const [desaDataByKec, setDesaDataByKec] = React.useState<Record<number, RekapDesaResponse[]>>({});
    const [loadingDesaByKec, setLoadingDesaByKec] = React.useState<Record<number, boolean>>({});
    const [expandedDesa, setExpandedDesa] = React.useState<Record<number, boolean>>({});

    // Level 3 & 4: Ruas and Segmen Data States (Lazy loaded per Desa / Ruas)
    const [ruasData, setRuasData] = React.useState<Record<number, RekapRuasResponse[]>>({});
    const [loadingRuas, setLoadingRuas] = React.useState<Record<number, boolean>>({});
    const [expandedRuas, setExpandedRuas] = React.useState<Record<string, boolean>>({});
    const [segmenData, setSegmenData] = React.useState<Record<string, RekapSegmenResponse[]>>({});
    const [loadingSegmens, setLoadingSegmens] = React.useState<Record<string, boolean>>({});

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    // Load master lists (Kecamatan)
    React.useEffect(() => {
        if (!isMounted) return;
        const loadKecamatans = async () => {
            try {
                const res = await kecamatanService.getKecamatan();
                setKecamatans(res);
            } catch (err) {
                console.error("Error loading kecamatans:", err);
            }
        };
        loadKecamatans();
    }, [isMounted]);

    // Load master list (Desa) based on selected Kecamatan
    React.useEffect(() => {
        if (!isMounted) return;
        const loadDesas = async () => {
            try {
                const res = await desaService.getDesa(idKecamatan);
                setDesas(res);
                setIdDesa("all"); // reset selected desa when kecamatan changes
            } catch (err) {
                console.error("Error loading desas:", err);
            }
        };
        loadDesas();
    }, [isMounted, idKecamatan]);

    // Fetch primary Rekap Kecamatan (Level 1)
    const fetchData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const filters: any = {};
            if (idKecamatan !== "all") filters.id_kecamatan = idKecamatan;
            if (tahun !== "all") filters.tahun = tahun;
            if (kondisi !== "all") filters.kondisi = kondisi;
            if (sumberDana !== "all") filters.sumber_dana = sumberDana;

            const res = await rekapService.getKecamatan(filters);
            setRekapKecamatan(res);
            
            // Clear sub-data on refresh/re-fetch to keep consistency
            setExpandedKecamatan({});
            setDesaDataByKec({});
            setExpandedDesa({});
            setRuasData({});
            setExpandedRuas({});
            setSegmenData({});
        } catch (err) {
            console.error("Error fetching rekap kecamatan:", err);
            toast.error("Gagal memuat rekapitulasi kecamatan.");
        } finally {
            setIsLoading(false);
        }
    }, [idKecamatan, tahun, kondisi, sumberDana]);

    React.useEffect(() => {
        if (isMounted) {
            fetchData();
        }
    }, [isMounted, fetchData]);

    // Lazy load Level 2: Desa per Kecamatan
    const handleExpandKecamatan = async (kecId: number) => {
        const isCurrentlyExpanded = !!expandedKecamatan[kecId];
        setExpandedKecamatan(prev => ({ ...prev, [kecId]: !isCurrentlyExpanded }));

        if (!isCurrentlyExpanded && !desaDataByKec[kecId]) {
            setLoadingDesaByKec(prev => ({ ...prev, [kecId]: true }));
            try {
                const filters: any = { id_kecamatan: kecId };
                if (idDesa !== "all") filters.id_desa = idDesa;
                if (tahun !== "all") filters.tahun = tahun;
                if (kondisi !== "all") filters.kondisi = kondisi;
                if (sumberDana !== "all") filters.sumber_dana = sumberDana;

                const res = await rekapService.getDesa(filters);
                setDesaDataByKec(prev => ({ ...prev, [kecId]: res }));
            } catch (err) {
                console.error("Error loading desa for kecamatan:", err);
                toast.error("Gagal memuat daftar desa.");
            } finally {
                setLoadingDesaByKec(prev => ({ ...prev, [kecId]: false }));
            }
        }
    };

    // Lazy load Level 3: Ruas per Desa
    const handleExpandDesa = async (desaId: number) => {
        const isCurrentlyExpanded = !!expandedDesa[desaId];
        setExpandedDesa(prev => ({ ...prev, [desaId]: !isCurrentlyExpanded }));

        if (!isCurrentlyExpanded && !ruasData[desaId]) {
            setLoadingRuas(prev => ({ ...prev, [desaId]: true }));
            try {
                const filters: any = {};
                if (tahun !== "all") filters.tahun = tahun;
                if (kondisi !== "all") filters.kondisi = kondisi;
                if (sumberDana !== "all") filters.sumber_dana = sumberDana;

                const res = await rekapService.getRuasByDesa(desaId, filters);
                setRuasData(prev => ({ ...prev, [desaId]: res }));
            } catch (err) {
                console.error("Error loading ruas:", err);
                toast.error("Gagal memuat rincian ruas jalan.");
            } finally {
                setLoadingRuas(prev => ({ ...prev, [desaId]: false }));
            }
        }
    };

    // Lazy load Level 4: Segmens per Ruas
    const handleExpandRuas = async (desaId: number, ruasId: string) => {
        const key = `${desaId}-${ruasId}`;
        const isCurrentlyExpanded = !!expandedRuas[key];
        setExpandedRuas(prev => ({ ...prev, [key]: !isCurrentlyExpanded }));

        if (!isCurrentlyExpanded && !segmenData[ruasId]) {
            setLoadingSegmens(prev => ({ ...prev, [ruasId]: true }));
            try {
                const filters: any = {};
                if (tahun !== "all") filters.tahun = tahun;
                if (kondisi !== "all") filters.kondisi = kondisi;
                if (sumberDana !== "all") filters.sumber_dana = sumberDana;

                const res = await rekapService.getSegmensByRuas(ruasId, filters);
                setSegmenData(prev => ({ ...prev, [ruasId]: res }));
            } catch (err) {
                console.error("Error loading segmens:", err);
                toast.error("Gagal memuat rincian segmen.");
            } finally {
                setLoadingSegmens(prev => ({ ...prev, [ruasId]: false }));
            }
        }
    };

    const handleResetFilters = () => {
        setIdKecamatan("all");
        setIdDesa("all");
        setTahun("all");
        setKondisi("all");
        setSumberDana("all");
        setSearchTerm("");
    };

    // Multi-accordion state & handlers
    const openKecamatanCount = React.useMemo(() => {
        return Object.values(expandedKecamatan).filter(Boolean).length;
    }, [expandedKecamatan]);

    const handleExpandAllKecamatan = async () => {
        const nextState: Record<number, boolean> = {};
        filteredRekapKecamatan.forEach((kec) => {
            nextState[kec.id_kecamatan] = true;
        });
        setExpandedKecamatan(nextState);

        const unFetched = filteredRekapKecamatan.filter((kec) => !desaDataByKec[kec.id_kecamatan]);
        if (unFetched.length > 0) {
            toast.info(`Memuat data desa untuk ${unFetched.length} kecamatan...`);
            await Promise.all(
                unFetched.map(async (kec) => {
                    setLoadingDesaByKec((prev) => ({ ...prev, [kec.id_kecamatan]: true }));
                    try {
                        const filters: any = { id_kecamatan: kec.id_kecamatan };
                        if (idDesa !== "all") filters.id_desa = idDesa;
                        if (tahun !== "all") filters.tahun = tahun;
                        if (kondisi !== "all") filters.kondisi = kondisi;
                        if (sumberDana !== "all") filters.sumber_dana = sumberDana;

                        const res = await rekapService.getDesa(filters);
                        setDesaDataByKec((prev) => ({ ...prev, [kec.id_kecamatan]: res }));
                    } catch (err) {
                        console.error("Failed to load desa for kecamatan:", err);
                    } finally {
                        setLoadingDesaByKec((prev) => ({ ...prev, [kec.id_kecamatan]: false }));
                    }
                })
            );
            toast.success("Berhasil memuat semua data desa kecamatan.");
        }
    };

    const handleCollapseAllKecamatan = () => {
        setExpandedKecamatan({});
    };

    const formatDecimal = (value: number) => {
        return new Intl.NumberFormat("id-ID", {
            maximumFractionDigits: 1
        }).format(value);
    };

    const formatKilometer = (meters: number) => {
        return `${formatDecimal(meters / 1000)} km`;
    };

    // Filter Kecamatan by text search
    const filteredRekapKecamatan = React.useMemo(() => {
        return rekapKecamatan.filter(row => {
            return searchTerm === "" ||
                row.nama_kecamatan.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [rekapKecamatan, searchTerm]);

    // Summary calculations (calculated at Kecamatan level)
    const summaryStats = React.useMemo(() => {
        return filteredRekapKecamatan.reduce((acc, curr) => {
            acc.totalKecamatan += 1;
            acc.totalDesa += curr.jumlah_desa;
            acc.totalRuas += curr.jumlah_ruas;
            acc.totalPanjangMaster += curr.total_panjang;
            acc.panjangJalan += curr.total_panjang;
            acc.panjangDibangun += curr.panjang_dibangun;
            acc.panjangBelum += curr.panjang_belum;
            return acc;
        }, { 
            totalKecamatan: 0, 
            totalDesa: 0, 
            totalRuas: 0, 
            totalPanjangMaster: 0, 
            panjangJalan: 0, 
            panjangDibangun: 0, 
            panjangBelum: 0 
        });
    }, [filteredRekapKecamatan]);

    const overallProgress = summaryStats.panjangJalan > 0
        ? Math.round((summaryStats.panjangDibangun / summaryStats.panjangJalan) * 10000) / 100
        : 0;

    const getKondisiBadgeClass = (kondisiStr?: string) => {
        switch (kondisiStr) {
            case "Baik":
                return "bg-emerald-500/10 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
            case "Sedang":
                return "bg-amber-500/10 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
            case "Rusak Ringan":
                return "bg-orange-500/10 hover:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
            case "Rusak Berat":
                return "bg-rose-500/10 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
            default:
                return "bg-emerald-500/10 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
        }
    };

    const kecamatanOptions: ComboboxOption[] = React.useMemo(() => [
        { value: "all", label: "Semua Kecamatan" },
        ...kecamatans.map((kec) => ({
            value: kec.id.toString(),
            label: kec.nama_kecamatan,
        })),
    ], [kecamatans]);

    const desaOptions: ComboboxOption[] = React.useMemo(() => [
        { value: "all", label: "Semua Desa" },
        ...desas.map((desa) => ({
            value: desa.id.toString(),
            label: desa.nama_desa,
        })),
    ], [desas]);

    if (!isMounted) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-20 bg-background dark:bg-slate-950">
                <Spinner className="w-10 h-10 text-blue-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-semibold">
                    Memuat antarmuka rekapitulasi...
                </p>
            </div>
        );
    }

    const isFilterActive = idKecamatan !== "all" || idDesa !== "all" || tahun !== "all" || kondisi !== "all" || sumberDana !== "all" || searchTerm !== "";
    const activeFilterCount = (idKecamatan !== "all" ? 1 : 0) + 
                              (idDesa !== "all" ? 1 : 0) + 
                              (tahun !== "all" ? 1 : 0) + 
                              (kondisi !== "all" ? 1 : 0) + 
                              (sumberDana !== "all" ? 1 : 0);

    return (
        <div className="flex flex-1 flex-col h-full min-h-0 gap-2.5 p-3 bg-background dark:bg-slate-950 overflow-hidden font-sans">
            {/* 1. Redesigned Responsive Menubar Filter Bar (Placed Above Summary Cards & Card Accordion Table) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2 shadow-2xs shrink-0 transition-all">
                {/* Single Row Flex Container with horizontal scrolling on overflow */}
                <div className="flex items-center gap-2 w-full overflow-x-auto scrollbar-none py-0.5">
                    {/* Search Input */}
                    <div className="relative min-w-[130px] sm:min-w-[160px] max-w-[200px] shrink-0">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            placeholder="Cari kecamatan..."
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
                                                <SheetTitle className="text-base font-bold text-slate-900 dark:text-white">Filter Data Rekap Jalan</SheetTitle>
                                                <SheetDescription className="text-xs text-slate-500 dark:text-slate-400">
                                                    Saring data berdasarkan lokasi, kondisi, dan tahun
                                                </SheetDescription>
                                            </div>
                                        </div>
                                    </div>
                                </SheetHeader>
                                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Kecamatan Combobox (Mobile Bottom Sheet) */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Kecamatan</label>
                                            <Combobox
                                                options={kecamatanOptions}
                                                value={idKecamatan}
                                                onChange={setIdKecamatan}
                                                placeholder="Semua Kecamatan"
                                                searchPlaceholder="Cari kecamatan..."
                                                emptyText="Kecamatan tidak ditemukan."
                                                className="w-full h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                            />
                                        </div>
                                        {/* Desa Combobox (Mobile Bottom Sheet) */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Desa</label>
                                            <Combobox
                                                options={desaOptions}
                                                value={idDesa}
                                                onChange={setIdDesa}
                                                disabled={idKecamatan === "all"}
                                                placeholder="Semua Desa"
                                                searchPlaceholder="Cari desa..."
                                                emptyText="Desa tidak ditemukan."
                                                className="w-full h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Kondisi Jalan</label>
                                            <Select value={kondisi} onValueChange={setKondisi}>
                                                <SelectTrigger className="w-full h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                                    <SelectValue placeholder="Semua Kondisi" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all" className="text-xs">Semua Kondisi</SelectItem>
                                                    <SelectItem value="Baik" className="text-xs">Baik</SelectItem>
                                                    <SelectItem value="Sedang" className="text-xs">Sedang</SelectItem>
                                                    <SelectItem value="Rusak Ringan" className="text-xs">Rusak Ringan</SelectItem>
                                                    <SelectItem value="Rusak Berat" className="text-xs">Rusak Berat</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
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

                    {/* Desktop Only: Inline Filter Comboboxes in the SAME single row */}
                    <div className="hidden md:flex items-center gap-1.5 shrink-0">
                        {/* Kecamatan Combobox (Desktop Toolbar) */}
                        <div className="w-[140px] shrink-0">
                            <Combobox
                                options={kecamatanOptions}
                                value={idKecamatan}
                                onChange={setIdKecamatan}
                                placeholder="Kecamatan"
                                searchPlaceholder="Cari kecamatan..."
                                emptyText="Kecamatan tidak ditemukan."
                                className="h-8 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-2xs px-2.5"
                            />
                        </div>

                        {/* Desa Combobox (Desktop Toolbar) */}
                        <div className="w-[130px] shrink-0">
                            <Combobox
                                options={desaOptions}
                                value={idDesa}
                                onChange={setIdDesa}
                                disabled={idKecamatan === "all"}
                                placeholder="Desa"
                                searchPlaceholder="Cari desa..."
                                emptyText="Desa tidak ditemukan."
                                className="h-8 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-2xs px-2.5"
                            />
                        </div>

                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 shrink-0 mx-0.5" />

                        {/* Tahun Select */}
                        <div className="w-[95px] shrink-0">
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

                        {/* Kondisi Select */}
                        <div className="w-[110px] shrink-0">
                            <Select value={kondisi} onValueChange={setKondisi}>
                                <SelectTrigger size="sm" className="w-full h-8 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-2xs">
                                    <SelectValue placeholder="Kondisi" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs">Semua Kondisi</SelectItem>
                                    <SelectItem value="Baik" className="text-xs">Baik</SelectItem>
                                    <SelectItem value="Sedang" className="text-xs">Sedang</SelectItem>
                                    <SelectItem value="Rusak Ringan" className="text-xs">Rusak Ringan</SelectItem>
                                    <SelectItem value="Rusak Berat" className="text-xs">Rusak Berat</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Sumber Dana Select */}
                        <div className="w-[105px] shrink-0">
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

                    {/* Right Actions: Segarkan */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                        {openKecamatanCount > 0 && (
                            <Badge variant="secondary" className="h-8 px-2 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold gap-1 rounded-xl shrink-0">
                                <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                {openKecamatanCount} Terbuka
                            </Badge>
                        )}

                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={fetchData} 
                            disabled={isLoading}
                            className="h-8 px-2.5 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl gap-1.5 text-slate-700 dark:text-slate-300 shadow-2xs cursor-pointer shrink-0"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                            <span className="hidden sm:inline">Segarkan</span>
                        </Button>
                    </div>
                </div>

                {/* Active Filter Chips / Badges Row (Shows when any filter is active) */}
                {isFilterActive && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-slate-100 dark:border-slate-800/60 animate-in fade-in-50 duration-200">
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">Filter Aktif:</span>
                        {idKecamatan !== "all" && (
                            <Badge variant="secondary" className="h-6 px-2 text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 gap-1 rounded-lg">
                                <Building2 className="w-3 h-3 text-blue-500" />
                                {kecamatans.find(k => k.id.toString() === idKecamatan)?.nama_kecamatan || idKecamatan}
                                <button onClick={() => setIdKecamatan("all")} className="hover:text-blue-900 ml-0.5 cursor-pointer"><X className="w-3 h-3" /></button>
                            </Badge>
                        )}
                        {idDesa !== "all" && (
                            <Badge variant="secondary" className="h-6 px-2 text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 gap-1 rounded-lg">
                                <Map className="w-3 h-3 text-indigo-500" />
                                {desas.find(d => d.id.toString() === idDesa)?.nama_desa || idDesa}
                                <button onClick={() => setIdDesa("all")} className="hover:text-indigo-900 ml-0.5 cursor-pointer"><X className="w-3 h-3" /></button>
                            </Badge>
                        )}
                        {tahun !== "all" && (
                            <Badge variant="secondary" className="h-6 px-2 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 gap-1 rounded-lg">
                                Tahun: {tahun}
                                <button onClick={() => setTahun("all")} className="hover:text-amber-900 ml-0.5 cursor-pointer"><X className="w-3 h-3" /></button>
                            </Badge>
                        )}
                        {kondisi !== "all" && (
                            <Badge variant="secondary" className="h-6 px-2 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 gap-1 rounded-lg">
                                Kondisi: {kondisi}
                                <button onClick={() => setKondisi("all")} className="hover:text-emerald-900 ml-0.5 cursor-pointer"><X className="w-3 h-3" /></button>
                            </Badge>
                        )}
                        {sumberDana !== "all" && (
                            <Badge variant="secondary" className="h-6 px-2 text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200 gap-1 rounded-lg">
                                Sumber: {sumberDana}
                                <button onClick={() => setSumberDana("all")} className="hover:text-purple-900 ml-0.5 cursor-pointer"><X className="w-3 h-3" /></button>
                            </Badge>
                        )}
                        <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-6 px-2 text-[11px] font-medium text-rose-600 rounded-lg gap-1 ml-auto cursor-pointer">
                            <RotateCcw className="w-3 h-3" /> Reset Semua
                        </Button>
                    </div>
                )}
            </div>

            {/* 2. Redesigned UI/UX Dashboard Summary Cards Row (Horizontal Scroll Snap on Mobile, 6-col Grid on Desktop) */}
            <div className="flex md:grid md:grid-cols-6 gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-none shrink-0 py-0.5">
                {/* Card 1: Kecamatan */}
                <div className="w-[78vw] max-w-[260px] md:w-auto shrink-0 snap-center flex items-center justify-between p-2.5 px-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Kecamatan</p>
                        <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                            {summaryStats.totalKecamatan} <span className="text-[11px] font-semibold text-slate-400">Kec</span>
                        </p>
                    </div>
                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60 shrink-0">
                        <Building2 className="w-4 h-4" />
                    </div>
                </div>

                {/* Card 2: Ruas Poros */}
                <div className="w-[78vw] max-w-[260px] md:w-auto shrink-0 snap-center flex items-center justify-between p-2.5 px-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Ruas Poros</p>
                        <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                            {summaryStats.totalRuas} <span className="text-[11px] font-semibold text-slate-400">Ruas</span>
                        </p>
                    </div>
                    <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60 shrink-0">
                        <Activity className="w-4 h-4" />
                    </div>
                </div>

                {/* Card 3: Panjang Master */}
                <div className="w-[78vw] max-w-[260px] md:w-auto shrink-0 snap-center flex items-center justify-between p-2.5 px-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Panjang Master</p>
                        <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                            {formatKilometer(summaryStats.totalPanjangMaster)}
                        </p>
                    </div>
                    <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/60 shrink-0">
                        <Ruler className="w-4 h-4" />
                    </div>
                </div>

                {/* Card 4: Dibangun */}
                <div className="w-[78vw] max-w-[260px] md:w-auto shrink-0 snap-center flex items-center justify-between p-2.5 px-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Dibangun</p>
                        <p className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {formatKilometer(summaryStats.panjangDibangun)}
                        </p>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                    </div>
                </div>

                {/* Card 5: Belum Dibangun */}
                <div className="w-[78vw] max-w-[260px] md:w-auto shrink-0 snap-center flex items-center justify-between p-2.5 px-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Belum Dibangun</p>
                        <p className="text-sm sm:text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                            {formatKilometer(summaryStats.panjangBelum)}
                        </p>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/60 shrink-0">
                        <Ruler className="w-4 h-4" />
                    </div>
                </div>

                {/* Card 6: Progress */}
                <div className="w-[78vw] max-w-[260px] md:w-auto shrink-0 snap-center flex items-center justify-between p-2.5 px-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all">
                    <div className="w-full">
                        <div className="flex items-center justify-between gap-1">
                            <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Progress</p>
                            <div className="p-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
                                <TrendingUp className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1">
                            <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">{overallProgress}%</span>
                            <Progress value={overallProgress} className="h-1.5 w-12 bg-slate-100 dark:bg-slate-800" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-h-0 flex flex-col rounded-2xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
                {isLoading && filteredRekapKecamatan.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-16">
                        <Spinner className="w-9 h-9 text-blue-600" />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 font-semibold">Memuat rekapitulasi kecamatan...</p>
                    </div>
                ) : filteredRekapKecamatan.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <Empty className="py-10">
                            <EmptyHeader>
                                <EmptyTitle className="font-semibold text-slate-800 dark:text-white text-sm">Tidak Ada Data Rekap</EmptyTitle>
                                <EmptyDescription className="text-slate-500 dark:text-slate-400 max-w-sm mt-1 text-xs">
                                    {searchTerm !== ""
                                        ? `Tidak ditemukan kecamatan untuk pencarian "${searchTerm}".`
                                        : "Data rekapitulasi jalan poros desa untuk filter terpilih tidak ditemukan."}
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    </div>
                ) : (
                    <div className="flex-1 min-h-0 overflow-auto">
                        <Table className="w-full min-w-[900px] min-h-full border-collapse">
                            <TableHeader className="bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-30 border-b dark:border-slate-800 shadow-2xs">
                                <TableRow>
                                    <TableHead className="w-10 text-center text-xs font-semibold text-slate-400 uppercase p-2"></TableHead>
                                    <TableHead className="w-12 text-center text-xs font-semibold text-slate-400 uppercase">No</TableHead>
                                    <TableHead className="w-[200px] text-xs font-semibold text-slate-400 uppercase">Kecamatan</TableHead>
                                    <TableHead className="w-[110px] text-center text-xs font-semibold text-slate-400 uppercase">Jumlah Desa</TableHead>
                                    <TableHead className="w-[110px] text-center text-xs font-semibold text-slate-400 uppercase">Ruas Poros</TableHead>
                                    <TableHead className="w-[140px] text-right text-xs font-semibold text-slate-400 uppercase">Panjang Master</TableHead>
                                    <TableHead className="w-[140px] text-right text-xs font-semibold text-slate-400 uppercase">Panjang Dibangun</TableHead>
                                    <TableHead className="w-[130px] text-right text-xs font-semibold text-slate-400 uppercase">Sisa Belum</TableHead>
                                    <TableHead className="w-[150px] text-xs font-semibold text-slate-400 uppercase">Progress</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRekapKecamatan.map((kec, idx) => {
                                    const isExpanded = !!expandedKecamatan[kec.id_kecamatan];
                                    return (
                                        <React.Fragment key={kec.id_kecamatan}>
                                            {/* Sticky Kecamatan Accordion Header Row when expanded */}
                                            <TableRow 
                                                className={cn(
                                                    "transition-all duration-200 select-none",
                                                    isExpanded 
                                                        ? "bg-blue-50 dark:bg-blue-950 sticky top-[37px] z-20 border-b border-l-4 border-l-blue-600 dark:border-l-blue-400 shadow-xs" 
                                                        : "hover:bg-slate-50/50 dark:hover:bg-slate-900/50 border-l-4 border-l-transparent"
                                                )}
                                            >
                                                {/* Left Accordion Toggle Button */}
                                                <TableCell className={cn("text-center p-2 w-10", isExpanded && "sticky top-[37px] z-20 bg-blue-50 dark:bg-blue-950")}>
                                                    <Button
                                                        variant={isExpanded ? "default" : "ghost"}
                                                        size="icon"
                                                        onClick={() => handleExpandKecamatan(kec.id_kecamatan)}
                                                        className={cn(
                                                            "rounded-full w-7 h-7 transition-all duration-200 cursor-pointer",
                                                            isExpanded 
                                                                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-2xs" 
                                                                : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                                                        )}
                                                        title={isExpanded ? "Tutup Kecamatan" : "Buka Desa per Kecamatan"}
                                                    >
                                                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                    </Button>
                                                </TableCell>
                                                <TableCell className={cn("text-center font-semibold text-xs text-slate-400", isExpanded && "sticky top-[37px] z-20 bg-blue-50 dark:bg-blue-950")}>{idx + 1}</TableCell>
                                                <TableCell className={cn("font-bold text-xs max-w-[180px] truncate", isExpanded && "sticky top-[37px] z-20 bg-blue-50 dark:bg-blue-950")} title={kec.nama_kecamatan}>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={cn(isExpanded ? "text-blue-700 dark:text-blue-300 font-bold" : "text-slate-900 dark:text-white")}>
                                                            {kec.nama_kecamatan}
                                                        </span>
                                                        {isExpanded && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
                                                                Terbuka
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className={cn("text-center font-semibold text-xs text-slate-700 dark:text-slate-350", isExpanded && "sticky top-[37px] z-20 bg-blue-50 dark:bg-blue-950")}>
                                                    <Badge variant="outline" className="font-semibold text-[11px] bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                                                        {kec.jumlah_desa} Desa
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className={cn("text-center font-semibold text-xs text-slate-700 dark:text-slate-350", isExpanded && "sticky top-[37px] z-20 bg-blue-50 dark:bg-blue-950")}>
                                                    <Badge variant="outline" className="font-semibold text-[11px] bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                                                        {kec.jumlah_ruas} Ruas
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className={cn("text-right font-semibold text-xs text-slate-700 dark:text-slate-300", isExpanded && "sticky top-[37px] z-20 bg-blue-50 dark:bg-blue-950")}>{formatDecimal(kec.total_panjang)} m</TableCell>
                                                <TableCell className={cn("text-right font-semibold text-xs text-emerald-600 dark:text-emerald-400", isExpanded && "sticky top-[37px] z-20 bg-blue-50 dark:bg-blue-950")}>{formatDecimal(kec.panjang_dibangun)} m</TableCell>
                                                <TableCell className={cn("text-right font-semibold text-xs text-amber-600 dark:text-amber-450", isExpanded && "sticky top-[37px] z-20 bg-blue-50 dark:bg-blue-950")}>{formatDecimal(kec.panjang_belum)} m</TableCell>
                                                <TableCell className={cn(isExpanded && "sticky top-[37px] z-20 bg-blue-50 dark:bg-blue-950")}>
                                                    <div className="flex items-center gap-2">
                                                        <Progress value={kec.progress} className="h-1.5 w-16 bg-slate-100 dark:bg-slate-800" />
                                                        <span className="text-[10px] font-semibold text-slate-800 dark:text-slate-200">{kec.progress}%</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>

                                            {/* Level 2: Expanded Kecamatan -> Desa Rows */}
                                            {isExpanded && (
                                                <TableRow className="bg-slate-50/30 dark:bg-slate-900/20">
                                                    <TableCell colSpan={9} className="p-0 border-t dark:border-slate-800">
                                                        <div className="bg-white dark:bg-slate-950 border-b border-l-4 border-l-blue-500/30 dark:border-l-blue-400/30 max-w-full">
                                                            {loadingDesaByKec[kec.id_kecamatan] ? (
                                                                <div className="flex justify-center py-5">
                                                                    <Spinner className="w-6 h-6 text-blue-600" />
                                                                </div>
                                                            ) : (!desaDataByKec[kec.id_kecamatan] || desaDataByKec[kec.id_kecamatan].length === 0) ? (
                                                                <p className="text-xs text-muted-foreground py-3 px-4 font-semibold">
                                                                    Tidak ada data desa untuk kecamatan ini.
                                                                </p>
                                                            ) : (
                                                                <div className="overflow-x-auto max-w-full">
                                                                    <Table className="w-full min-w-[850px] border-collapse">
                                                                        <TableHeader className="bg-white dark:bg-slate-950 border-b dark:border-slate-800 shadow-2xs">
                                                                            {/* Row 1: Card Title & Quick Close */}
                                                                            <TableRow className="hover:bg-transparent border-b dark:border-slate-800 bg-blue-50/60 dark:bg-blue-950/40">
                                                                                <TableHead colSpan={8} className="h-auto py-2.5 px-4">
                                                                                    <div className="flex items-center justify-between gap-2">
                                                                                        <span className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider flex items-center gap-1.5 truncate max-w-full" title={`Daftar Desa - Kec. ${kec.nama_kecamatan}`}>
                                                                                            <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                                                                            Daftar Desa — Kecamatan {kec.nama_kecamatan}
                                                                                            <Badge variant="secondary" className="ml-1 text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                                                                {kec.jumlah_desa} Desa
                                                                                            </Badge>
                                                                                            <span className="ml-2 text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-2xs uppercase tracking-wider">
                                                                                                Kecamatan Terbuka
                                                                                            </span>
                                                                                        </span>
                                                                                        <Button
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            onClick={() => handleExpandKecamatan(kec.id_kecamatan)}
                                                                                            className="h-7 px-2.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-slate-200 dark:border-slate-800 gap-1 rounded-lg cursor-pointer shrink-0"
                                                                                        >
                                                                                            <ChevronUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                                                            Tutup Kecamatan
                                                                                        </Button>
                                                                                    </div>
                                                                                </TableHead>
                                                                            </TableRow>
                                                                            {/* Row 2: Column Headers */}
                                                                            <TableRow className="bg-slate-100 dark:bg-slate-900 border-b dark:border-slate-800">
                                                                                <TableHead className="w-10 text-center text-[10px] uppercase font-semibold text-slate-500 p-2"></TableHead>
                                                                                <TableHead className="w-10 text-center text-[10px] uppercase font-semibold text-slate-500">No</TableHead>
                                                                                <TableHead className="w-[200px] text-[10px] uppercase font-semibold text-slate-500">Nama Desa</TableHead>
                                                                                <TableHead className="w-[100px] text-center text-[10px] uppercase font-semibold text-slate-500">Ruas Poros</TableHead>
                                                                                <TableHead className="w-[130px] text-right text-[10px] uppercase font-semibold text-slate-500">Panjang Master</TableHead>
                                                                                <TableHead className="w-[140px] text-right text-[10px] uppercase font-semibold text-slate-500">Panjang Dibangun</TableHead>
                                                                                <TableHead className="w-[130px] text-right text-[10px] uppercase font-semibold text-slate-500">Sisa Belum</TableHead>
                                                                                <TableHead className="w-[130px] text-[10px] uppercase font-semibold text-slate-500">Progress</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {desaDataByKec[kec.id_kecamatan].map((desa, desaIdx) => {
                                                                                const isDesaExpanded = !!expandedDesa[desa.id_desa];
                                                                                return (
                                                                                    <React.Fragment key={desa.id_desa}>
                                                                                        <TableRow className={cn(
                                                                                            "transition-all duration-200 select-none",
                                                                                            isDesaExpanded 
                                                                                                ? "bg-indigo-50 dark:bg-indigo-950 border-b border-l-4 border-l-indigo-600 dark:border-l-indigo-400 shadow-xs" 
                                                                                                : "hover:bg-slate-50/50 dark:hover:bg-slate-900/50 border-l-4 border-l-transparent"
                                                                                        )}>
                                                                                            {/* Left Accordion Toggle Button for Desa */}
                                                                                            <TableCell className={cn("text-center p-2 w-10", isDesaExpanded && "sticky top-[77px] z-10 bg-indigo-50 dark:bg-indigo-950")}>
                                                                                                <Button
                                                                                                    variant={isDesaExpanded ? "default" : "ghost"}
                                                                                                    size="icon"
                                                                                                    onClick={() => handleExpandDesa(desa.id_desa)}
                                                                                                    className={cn(
                                                                                                        "rounded-full w-6 h-6 transition-all duration-200 cursor-pointer",
                                                                                                        isDesaExpanded 
                                                                                                            ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs" 
                                                                                                            : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                                                                                                    )}
                                                                                                    title={isDesaExpanded ? "Tutup Desa" : "Buka Ruas Jalan"}
                                                                                                >
                                                                                                    {isDesaExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                                                                </Button>
                                                                                            </TableCell>
                                                                                            <TableCell className={cn("text-center font-semibold text-[11px] text-slate-400", isDesaExpanded && "sticky top-[77px] z-10 bg-indigo-50 dark:bg-indigo-950")}>{desaIdx + 1}</TableCell>
                                                                                            <TableCell className={cn("font-semibold text-xs max-w-[180px] truncate", isDesaExpanded && "sticky top-[77px] z-10 bg-indigo-50 dark:bg-indigo-950")} title={desa.nama_desa}>
                                                                                                <div className="flex items-center gap-1.5">
                                                                                                    <span className={cn(isDesaExpanded ? "text-indigo-700 dark:text-indigo-300 font-bold" : "text-slate-800 dark:text-slate-200")}>
                                                                                                        {desa.nama_desa}
                                                                                                    </span>
                                                                                                    {isDesaExpanded && (
                                                                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                                                                                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
                                                                                                            Terbuka
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                            </TableCell>
                                                                                            <TableCell className={cn("text-center font-semibold text-xs text-slate-700 dark:text-slate-350", isDesaExpanded && "sticky top-[77px] z-10 bg-indigo-50 dark:bg-indigo-950")}>
                                                                                                <Badge variant="outline" className="font-semibold text-[10px] bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                                                                                                    {desa.jumlah_ruas} Ruas
                                                                                                </Badge>
                                                                                            </TableCell>
                                                                                            <TableCell className={cn("text-right font-semibold text-xs text-slate-700 dark:text-slate-300", isDesaExpanded && "sticky top-[77px] z-10 bg-indigo-50 dark:bg-indigo-950")}>{formatDecimal(desa.total_panjang)} m</TableCell>
                                                                                            <TableCell className={cn("text-right font-semibold text-xs text-emerald-600 dark:text-emerald-400", isDesaExpanded && "sticky top-[77px] z-10 bg-indigo-50 dark:bg-indigo-950")}>{formatDecimal(desa.panjang_dibangun)} m</TableCell>
                                                                                            <TableCell className={cn("text-right font-semibold text-xs text-amber-600 dark:text-amber-450", isDesaExpanded && "sticky top-[77px] z-10 bg-indigo-50 dark:bg-indigo-950")}>{formatDecimal(desa.panjang_belum)} m</TableCell>
                                                                                            <TableCell className={cn(isDesaExpanded && "sticky top-[77px] z-10 bg-indigo-50 dark:bg-indigo-950")}>
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <Progress value={desa.progress} className="h-1.5 w-14 bg-slate-100 dark:bg-slate-800" />
                                                                                                    <span className="text-[10px] font-semibold text-slate-800 dark:text-slate-200">{desa.progress}%</span>
                                                                                                </div>
                                                                                            </TableCell>
                                                                                        </TableRow>

                                                                                        {/* Level 3: Expanded Desa -> Ruas Rows */}
                                                                                        {isDesaExpanded && (
                                                                                            <TableRow className="bg-slate-50/20 dark:bg-slate-900/10">
                                                                                                <TableCell colSpan={8} className="p-0 border-t dark:border-slate-800">
                                                                                                    <div className="bg-white dark:bg-slate-950 border-b border-l-4 border-l-indigo-500/30 dark:border-l-indigo-400/30 max-w-full">
                                                                                                        {loadingRuas[desa.id_desa] ? (
                                                                                                            <div className="flex justify-center py-5">
                                                                                                                <Spinner className="w-6 h-6 text-blue-600" />
                                                                                                            </div>
                                                                                                        ) : (!ruasData[desa.id_desa] || ruasData[desa.id_desa].length === 0) ? (
                                                                                                            <p className="text-xs text-muted-foreground py-3 px-4 font-semibold">
                                                                                                                Tidak ada data ruas jalan untuk desa ini.
                                                                                                            </p>
                                                                                                        ) : (
                                                                                                            <div className="overflow-x-auto max-w-full">
                                                                                                                <Table className="w-full min-w-[850px] border-collapse">
                                                                                                                    <TableHeader className="bg-white dark:bg-slate-950 border-b dark:border-slate-800 shadow-2xs">
                                                                                                                        {/* Row 1: Ruas Card Title & Quick Close */}
                                                                                                                        <TableRow className="hover:bg-transparent border-b dark:border-slate-800 bg-indigo-50/60 dark:bg-indigo-950/40">
                                                                                                                            <TableHead colSpan={9} className="h-auto py-2.5 px-4">
                                                                                                                                <div className="flex items-center justify-between gap-2">
                                                                                                                                    <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1.5 truncate max-w-full" title={`Daftar Ruas Jalan Poros Desa - ${desa.nama_desa}`}>
                                                                                                                                        <Map className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                                                                                                                        Daftar Ruas Jalan Poros Desa — {desa.nama_desa}
                                                                                                                                        <span className="ml-2 text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full shadow-2xs uppercase tracking-wider">
                                                                                                                                            Desa Terbuka
                                                                                                                                        </span>
                                                                                                                                    </span>
                                                                                                                                    <Button
                                                                                                                                        variant="outline"
                                                                                                                                        size="sm"
                                                                                                                                        onClick={() => handleExpandDesa(desa.id_desa)}
                                                                                                                                        className="h-7 px-2.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-slate-200 dark:border-slate-800 gap-1 rounded-lg cursor-pointer shrink-0"
                                                                                                                                    >
                                                                                                                                        <ChevronUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                                                                                                                        Tutup Desa
                                                                                                                                    </Button>
                                                                                                                                </div>
                                                                                                                            </TableHead>
                                                                                                                        </TableRow>
                                                                                                                        {/* Row 2: Ruas Column Headers */}
                                                                                                                        <TableRow className="bg-slate-100 dark:bg-slate-900 border-b dark:border-slate-800">
                                                                                                                            <TableHead className="w-10 text-center text-[10px] uppercase font-semibold text-slate-500 p-2"></TableHead>
                                                                                                                            <TableHead className="w-10 text-center text-[10px] uppercase font-semibold text-slate-500">No</TableHead>
                                                                                                                            <TableHead className="w-[70px] min-w-[70px] max-w-[70px] text-[10px] uppercase font-semibold text-slate-500">Kode Ruas</TableHead>
                                                                                                                            <TableHead className="w-[240px] min-w-[200px] max-w-[240px] text-[10px] uppercase font-semibold text-slate-500">Nama Ruas</TableHead>
                                                                                                                            <TableHead className="w-[120px] min-w-[120px] max-w-[120px] text-right text-[10px] uppercase font-semibold text-slate-500">Panjang Master</TableHead>
                                                                                                                            <TableHead className="w-[130px] min-w-[130px] max-w-[130px] text-right text-[10px] uppercase font-semibold text-slate-500">Panjang Dibangun</TableHead>
                                                                                                                            <TableHead className="w-[120px] min-w-[120px] max-w-[120px] text-right text-[10px] uppercase font-semibold text-slate-500">Sisa Panjang</TableHead>
                                                                                                                            <TableHead className="w-[120px] min-w-[120px] max-w-[120px] text-[10px] uppercase font-semibold text-slate-500">Progress</TableHead>
                                                                                                                            <TableHead className="w-[100px] min-w-[100px] max-w-[100px] text-center text-[10px] uppercase font-semibold text-slate-500">Segmen</TableHead>
                                                                                                                        </TableRow>
                                                                                                                    </TableHeader>
                                                                                    <TableBody>
                                                                                        {ruasData[desa.id_desa].map((ruas, ruasIdx) => {
                                                                                            const ruasKey = `${desa.id_desa}-${ruas.id}`;
                                                                                            const isRuasExpanded = !!expandedRuas[ruasKey];
                                                                                            return (
                                                                                                <React.Fragment key={ruas.id}>
                                                                                                    <TableRow className={cn(
                                                                                                        "transition-all duration-200 select-none",
                                                                                                        isRuasExpanded 
                                                                                                            ? "bg-emerald-50/90 dark:bg-emerald-950/80 border-b border-l-4 border-l-emerald-600 dark:border-l-emerald-500 shadow-2xs" 
                                                                                                            : "hover:bg-slate-50/50 dark:hover:bg-slate-900/40 border-l-4 border-l-transparent"
                                                                                                    )}>
                                                                                                        {/* Left Accordion Toggle Button for Ruas */}
                                                                                                        <TableCell className="text-center p-2 w-10">
                                                                                                            <Button
                                                                                                                variant={isRuasExpanded ? "default" : "ghost"}
                                                                                                                size="icon"
                                                                                                                onClick={() => handleExpandRuas(desa.id_desa, ruas.id)}
                                                                                                                className={cn(
                                                                                                                    "rounded-full w-6 h-6 transition-all duration-200 cursor-pointer",
                                                                                                                    isRuasExpanded 
                                                                                                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs" 
                                                                                                                        : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                                                                                                                )}
                                                                                                                title={isRuasExpanded ? "Tutup Ruas" : "Buka Segmen"}
                                                                                                            >
                                                                                                                {isRuasExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                                                                            </Button>
                                                                                                        </TableCell>
                                                                                                        <TableCell className="text-center font-semibold text-[11px] text-slate-400">{ruasIdx + 1}</TableCell>
                                                                                                        <TableCell className="font-mono text-xs text-slate-700 dark:text-slate-350 font-semibold w-[70px] min-w-[70px] max-w-[70px] truncate" title={ruas.kode_ruas}>
                                                                                                            {ruas.kode_ruas}
                                                                                                        </TableCell>
                                                                                                        <TableCell className="font-semibold text-xs w-[240px] min-w-[200px] max-w-[240px] truncate" title={ruas.nama_ruas}>
                                                                                                            <div className="flex items-center gap-1.5">
                                                                                                                <span className={cn(isRuasExpanded ? "text-emerald-700 dark:text-emerald-300 font-bold" : "text-slate-800 dark:text-slate-200")}>
                                                                                                                    {ruas.nama_ruas}
                                                                                                                </span>
                                                                                                                {isRuasExpanded && (
                                                                                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                                                                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                                                                                                                        Terbuka
                                                                                                                    </span>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        </TableCell>
                                                                                                        <TableCell className="w-[120px] min-w-[120px] max-w-[120px] text-right font-semibold text-xs text-slate-700 dark:text-slate-300">{formatDecimal(ruas.panjang_master)} m</TableCell>
                                                                                                        <TableCell className="w-[130px] min-w-[130px] max-w-[130px] text-right font-semibold text-xs text-emerald-600 dark:text-emerald-450">{formatDecimal(ruas.panjang_dibangun)} m</TableCell>
                                                                                                        <TableCell className="w-[120px] min-w-[120px] max-w-[120px] text-right font-semibold text-xs text-amber-600 dark:text-amber-450">{formatDecimal(ruas.panjang_tersisa)} m</TableCell>
                                                                                                        <TableCell className="w-[120px] min-w-[120px] max-w-[120px]">
                                                                                                            <div className="flex items-center gap-2">
                                                                                                                <Progress value={ruas.progress} className="h-1 w-12 bg-slate-100 dark:bg-slate-800" />
                                                                                                                <span className="text-[9.5px] font-semibold text-slate-700 dark:text-slate-300">{ruas.progress}%</span>
                                                                                                            </div>
                                                                                                        </TableCell>
                                                                                                        <TableCell className="w-[100px] min-w-[100px] max-w-[100px] text-center font-semibold text-xs text-slate-600 dark:text-slate-400">
                                                                                                            <Badge variant="secondary" className="text-[10px] font-semibold">
                                                                                                                {ruas.jumlah_segmen} Segmen
                                                                                                            </Badge>
                                                                                                        </TableCell>
                                                                                                    </TableRow>

                                                                                                    {/* Level 4: Expanded Ruas -> Segmen Rows */}
                                                                                                    {isRuasExpanded && (
                                                                                                        <TableRow className="bg-slate-50/40 dark:bg-slate-900/30">
                                                                                                            <TableCell colSpan={9} className="p-0 border-t dark:border-slate-800">
                                                                                                                <div className="bg-white dark:bg-slate-950 p-3.5 border-b border-l-4 border-l-emerald-500/40 dark:border-l-emerald-400/40 max-w-full space-y-3">
                                                                                                                    <div className="flex items-center justify-between gap-2 pb-2 border-b dark:border-slate-800">
                                                                                                                        <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider flex items-center gap-1.5 truncate max-w-full" title={`Segmen Pembangunan - ${ruas.nama_ruas}`}>
                                                                                                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                                                                                            Segmen Pembangunan — {ruas.nama_ruas}
                                                                                                                            <span className="ml-2 text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full shadow-2xs uppercase tracking-wider">
                                                                                                                                {segmenData[ruas.id]?.length || 0} Segmen
                                                                                                                            </span>
                                                                                                                        </span>
                                                                                                                        <Button
                                                                                                                            variant="outline"
                                                                                                                            size="sm"
                                                                                                                            onClick={() => handleExpandRuas(desa.id_desa, ruas.id)}
                                                                                                                            className="h-7 px-2.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-slate-200 dark:border-slate-800 gap-1 rounded-lg cursor-pointer shrink-0"
                                                                                                                        >
                                                                                                                            <ChevronUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                                                                                                            Tutup Segmen
                                                                                                                        </Button>
                                                                                                                    </div>

                                                                                                                    {loadingSegmens[ruas.id] ? (
                                                                                                                        <div className="flex justify-center py-5">
                                                                                                                            <Spinner className="w-5 h-5 text-emerald-600" />
                                                                                                                        </div>
                                                                                                                    ) : (!segmenData[ruas.id] || segmenData[ruas.id].length === 0) ? (
                                                                                                                        <p className="text-xs text-muted-foreground py-2 font-semibold pl-2">
                                                                                                                            Belum ada segmen pembangunan untuk ruas ini.
                                                                                                                        </p>
                                                                                                                    ) : (
                                                                                                                        <div className="overflow-x-auto border dark:border-slate-800 rounded-lg max-w-full shadow-2xs">
                                                                                                                            <Table className="w-full min-w-[750px] border-collapse">
                                                                                                                                <TableHeader className="bg-slate-100 dark:bg-slate-900 border-b dark:border-slate-800">
                                                                                                                                    <TableRow>
                                                                                                                                        <TableHead className="w-[90px] text-[10px] uppercase font-semibold text-slate-500">Tahun</TableHead>
                                                                                                                                        <TableHead className="w-[120px] text-[10px] uppercase font-semibold text-slate-500">Panjang</TableHead>
                                                                                                                                        <TableHead className="w-[100px] text-[10px] uppercase font-semibold text-slate-500">Lebar</TableHead>
                                                                                                                                        <TableHead className="w-[120px] text-[10px] uppercase font-semibold text-slate-500">Kondisi</TableHead>
                                                                                                                                        <TableHead className="w-[140px] text-[10px] uppercase font-semibold text-slate-500">Sumber Dana</TableHead>
                                                                                                                                        <TableHead className="w-[140px] text-[10px] uppercase font-semibold text-slate-500">Status</TableHead>
                                                                                                                                        <TableHead className="min-w-[200px] text-[10px] uppercase font-semibold text-slate-500">Keterangan</TableHead>
                                                                                                                                    </TableRow>
                                                                                                                                </TableHeader>
                                                                                                                                <TableBody>
                                                                                                                                    {segmenData[ruas.id].map((seg, segIdx) => (
                                                                                                                                        <TableRow key={seg.id || segIdx} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 border-b dark:border-slate-800/60 last:border-b-0">
                                                                                                                                            <TableCell className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                                                                                                                                {seg.tahun}
                                                                                                                                            </TableCell>
                                                                                                                                            <TableCell className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                                                                                                                {formatDecimal(seg.panjang)} m
                                                                                                                                            </TableCell>
                                                                                                                                            <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                                                                                                                                                {formatDecimal(seg.lebar)} m
                                                                                                                                            </TableCell>
                                                                                                                                            <TableCell>
                                                                                                                                                <Badge className={`text-[10px] font-semibold py-0.5 px-1.5 rounded border ${getKondisiBadgeClass(seg.kondisi)}`}>
                                                                                                                                                    {seg.kondisi || "Baik"}
                                                                                                                                                </Badge>
                                                                                                                                            </TableCell>
                                                                                                                                            <TableCell className="text-xs text-slate-700 dark:text-slate-300 font-medium max-w-[130px] truncate" title={seg.sumber_dana || "-"}>
                                                                                                                                                {seg.sumber_dana || "-"}
                                                                                                                                            </TableCell>
                                                                                                                                            <TableCell className="text-xs text-slate-700 dark:text-slate-350 font-medium max-w-[130px] truncate" title={seg.status_kondisi || "-"}>
                                                                                                                                                {seg.status_kondisi || "-"}
                                                                                                                                            </TableCell>
                                                                                                                                            <TableCell className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-[300px] truncate" title={seg.keterangan || "-"}>
                                                                                                                                                {seg.keterangan || "-"}
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
