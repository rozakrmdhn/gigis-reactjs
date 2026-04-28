import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { PublicNavbar } from "~/components/public-navbar";
import { monitoringService } from "~/features/monitoring/services/monitoring.service";
import type { Jalan, MonitoringJalanResult } from "~/features/monitoring/services/monitoring.service";
import {
    Search,
    MapPin,
    Ruler,
    ChevronRight,
    ChevronLeft,
    Loader2,
    Route,
    ArrowRight,
    SlidersHorizontal,
    X,
    Activity,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
    return [
        { title: "Daftar Ruas Jalan - GIGIS Monitoring" },
        { name: "description", content: "Daftar ruas jalan desa di Kabupaten Bojonegoro" },
    ];
};

const CONDITION_CONFIG: Record<string, { label: string; color: string; glow: string; dot: string }> = {
    baik: { label: "Baik", color: "text-emerald-600 bg-emerald-50 border-emerald-200", glow: "shadow-emerald-100", dot: "bg-emerald-500" },
    sedang: { label: "Sedang", color: "text-amber-600 bg-amber-50 border-amber-200", glow: "shadow-amber-100", dot: "bg-amber-500" },
    "rusak ringan": { label: "Rusak Ringan", color: "text-orange-600 bg-orange-50 border-orange-200", glow: "shadow-orange-100", dot: "bg-orange-500" },
    "rusak berat": { label: "Rusak Berat", color: "text-red-600 bg-red-50 border-red-200", glow: "shadow-red-100", dot: "bg-red-500" },
};

function getConditionConfig(condition: string) {
    const key = Object.keys(CONDITION_CONFIG).find(k => condition.toLowerCase().includes(k));
    return key ? CONDITION_CONFIG[key] : { label: condition, color: "text-slate-600 bg-slate-50 border-slate-200", glow: "", dot: "bg-slate-400" };
}

function ConditionPill({ condition }: { condition: string }) {
    const cfg = getConditionConfig(condition);
    return (
        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border", cfg.color)}>
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
            {cfg.label}
        </span>
    );
}

function RoadCard({ item }: { item: MonitoringJalanResult }) {
    const { jalan, summary } = item;
    const cfg = getConditionConfig(jalan.kondisi);
    const progressPersen = summary?.total_panjang_jalan > 0 
        ? Math.round((summary.fisik.total / summary.total_panjang_jalan) * 100) 
        : 0;
    return (
        <Link to={`/jalan-desa/${jalan.id}`} className="group block">
            <div className={cn(
                "relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 transition-all duration-300",
                "hover:border-blue-200 dark:hover:border-blue-800/60 hover:shadow-lg hover:shadow-blue-50 dark:hover:shadow-none hover:-translate-y-0.5"
            )}>
                {/* Accent bar */}
                <div className={cn("absolute left-0 top-4 bottom-4 w-1 rounded-r-full", cfg.dot)} />

                <div className="pl-3 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-2">
                            {/* Road name & code */}
                            <div>
                                <p className="font-extrabold text-slate-900 dark:text-white text-sm leading-tight truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {jalan.nama_ruas}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    KODE: {jalan.kode_ruas}
                                </p>
                            </div>

                            {/* Location */}
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                <MapPin size={11} className="shrink-0 text-blue-400" />
                                <span className="text-[11px] font-semibold truncate">{jalan.desa}, {jalan.kecamatan}</span>
                            </div>

                            {/* Stats row */}
                            <div className="flex items-center gap-4 pt-1">
                                <div className="flex items-center gap-1.5">
                                    <Ruler size={11} className="text-slate-400 shrink-0" />
                                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                        {Math.round(summary?.total_panjang_jalan || jalan.panjang).toLocaleString('id-ID')} m
                                    </span>
                                </div>
                                <ConditionPill condition={jalan.kondisi} />
                            </div>
                        </div>

                        <div className="shrink-0 w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                            <ChevronRight size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                        </div>
                    </div>

                    {/* Summary Info - Full Width Bottom Section */}
                    {summary && (
                        <div className="pt-3 mt-1 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/20 -mx-5 -mb-5 px-5 pb-4 rounded-b-2xl">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg shrink-0">
                                    <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tertangani</span>
                                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                                        {Math.round(summary.fisik.total).toLocaleString('id-ID')} m <span className="text-emerald-600 dark:text-emerald-400 ml-0.5">({progressPersen}%)</span>
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex flex-col text-right">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Belum Tertangani</span>
                                    <span className="text-xs font-black text-orange-600 dark:text-orange-400">
                                        {Math.round(summary.panjang_belum_tertangani).toLocaleString('id-ID')} m
                                    </span>
                                </div>
                                <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg shrink-0">
                                    <AlertCircle size={12} className="text-orange-600 dark:text-orange-400" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}

function SkeletonCard() {
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 animate-pulse">
            <div className="pl-3 space-y-3">
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-3/4" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-lg w-1/3" />
                <div className="flex gap-3 pt-1">
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-lg w-16" />
                    <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-full w-20" />
                </div>
            </div>
        </div>
    );
}

export default function JalanDesaListPage() {
    const [jalanData, setJalanData] = useState<MonitoringJalanResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [submitSearch, setSubmitSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pagination, setPagination] = useState<any>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await monitoringService.getMonitoringJalan({
                page: currentPage,
                limit: 15,
                search: submitSearch || undefined,
            });
            // Monitoring endpoint returns array of { jalan, segmen, summary }
            setJalanData(response.result || []);
            setPagination(response.pagination);
            setTotalPages(response.pagination?.totalPages || 1);
        } catch (error) {
            console.error("Error fetching jalan data:", error);
            setJalanData([]);
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, submitSearch]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitSearch(search);
        setCurrentPage(1);
    };

    const clearSearch = () => {
        setSearch("");
        setSubmitSearch("");
        setCurrentPage(1);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <PublicNavbar />

            <main>
                {/* ─── Hero Header ─────────────────────────────── */}
                <div className="relative bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute -top-20 -right-20 w-72 h-72 bg-blue-50 dark:bg-blue-950/30 rounded-full blur-3xl opacity-60" />
                        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-slate-100 dark:bg-slate-800/50 rounded-full blur-2xl" />
                    </div>

                    <div className="relative container mx-auto px-4 sm:px-6 py-10 md:py-14">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                            {/* Title */}
                            <div className="space-y-3">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50">
                                    <Route size={14} className="text-blue-600 dark:text-blue-400" />
                                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">Infrastruktur Jalan</span>
                                </div>
                                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">
                                    Daftar Ruas Jalan
                                </h1>
                                <p className="text-slate-500 dark:text-slate-400 text-base font-medium max-w-md">
                                    Data teknis dan kondisi ruas jalan poros desa Kabupaten Bojonegoro.
                                </p>
                            </div>

                            {/* Stats summary */}
                            {pagination && (
                                <div className="flex items-center gap-4 shrink-0">
                                    <div className="text-right">
                                        <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{pagination.total}</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Ruas</p>
                                    </div>
                                    <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
                                    <div className="text-right">
                                        <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{totalPages}</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Halaman</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Search Bar */}
                        <form onSubmit={handleSearch} className="mt-8 max-w-2xl">
                            <div className="relative flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <Input
                                        placeholder="Cari nama ruas, kode, atau wilayah..."
                                        className="pl-12 pr-12 h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                    {search && (
                                        <button
                                            type="button"
                                            onClick={clearSearch}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                                <Button
                                    type="submit"
                                    className="h-12 px-6 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none shrink-0 gap-2 transition-all"
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                                    <span className="hidden sm:inline">Cari</span>
                                </Button>
                            </div>
                            {submitSearch && (
                                <p className="mt-2.5 text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                                    <SlidersHorizontal size={11} />
                                    Hasil pencarian untuk: <span className="text-blue-600 dark:text-blue-400">"{submitSearch}"</span>
                                    <button type="button" onClick={clearSearch} className="ml-1 text-slate-400 hover:text-red-500 transition-colors">
                                        <X size={11} />
                                    </button>
                                </p>
                            )}
                        </form>
                    </div>
                </div>

                {/* ─── Content ─────────────────────────────────── */}
                <div className="container mx-auto px-4 sm:px-6 py-8">
                    {/* Card Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {isLoading ? (
                            Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)
                        ) : jalanData.length > 0 ? (
                            jalanData.map((item) => <RoadCard key={item.jalan.id} item={item} />)
                        ) : (
                            <div className="col-span-full py-24 text-center">
                                <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                    <Route size={28} className="text-slate-300 dark:text-slate-600" />
                                </div>
                                <p className="font-black text-slate-400 uppercase tracking-widest text-sm">Tidak ada data ditemukan</p>
                                {submitSearch && (
                                    <button onClick={clearSearch} className="mt-4 text-xs font-bold text-blue-600 hover:underline">
                                        Hapus filter pencarian
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ─── Pagination ───────────────────────────── */}
                    {pagination && !isLoading && (
                        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                                Menampilkan{" "}
                                <span className="text-slate-900 dark:text-white">{(currentPage - 1) * 15 + 1}–{Math.min(currentPage * 15, pagination.total)}</span>
                                {" "}dari <span className="text-slate-900 dark:text-white">{pagination.total}</span> ruas
                            </p>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-xl font-bold gap-1.5 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                    disabled={currentPage === 1 || isLoading}
                                    onClick={() => setCurrentPage((prev) => prev - 1)}
                                >
                                    <ChevronLeft size={16} /> Sebelumnya
                                </Button>

                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                        let page: number;
                                        if (totalPages <= 5) page = i + 1;
                                        else if (currentPage <= 3) page = i + 1;
                                        else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                                        else page = currentPage - 2 + i;

                                        return (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={cn(
                                                    "w-9 h-9 rounded-xl text-sm font-bold transition-all",
                                                    page === currentPage
                                                        ? "bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none"
                                                        : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                )}
                                            >
                                                {page}
                                            </button>
                                        );
                                    })}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-xl font-bold gap-1.5 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                    disabled={currentPage === totalPages || isLoading}
                                    onClick={() => setCurrentPage((prev) => prev + 1)}
                                >
                                    Selanjutnya <ChevronRight size={16} />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <footer className="mt-16 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 py-10">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-slate-400 text-sm font-medium">© 2026 GIGIS Monitoring Jalan Poros. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
