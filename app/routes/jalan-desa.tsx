import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams, useLocation } from "react-router";
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
    AlertCircle,
    RefreshCw
} from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { MetaFunction } from "react-router";
import { SegmenMiniMap } from "~/features/peta/components/SegmenMiniMap";

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
        <span className={cn(
            "inline-flex items-center gap-2 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] border shadow-sm transition-all duration-300 group-hover:scale-105", 
            cfg.color
        )}>
            <span className={cn("w-2 h-2 rounded-full shrink-0 animate-pulse", cfg.dot)} />
            {cfg.label}
        </span>
    );
}

function RoadCard({ item, feature, searchState, isHighlighted }: { item: MonitoringJalanResult, feature?: any, searchState?: any, isHighlighted?: boolean }) {
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isHighlighted && cardRef.current) {
            setTimeout(() => {
                cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 500);
        }
    }, [isHighlighted]);

    const { jalan, summary } = item;
    const cfg = getConditionConfig(jalan.kondisi);

    const conditionDist = summary?.kondisi_jalan?.persentase_per_kondisi || {};

    return (
        <Link to={`/jalan-desa/${jalan.id}`} state={searchState} className="group block h-full">
            <div 
                ref={cardRef}
                className={cn(
                "h-full relative bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-slate-100 dark:border-slate-800 rounded-[24px] p-4 transition-all duration-500",
                "hover:border-blue-500/30 hover:shadow-[0_15px_40px_rgba(8,112,184,0.06)] dark:hover:shadow-none hover:-translate-y-1",
                isHighlighted && "ring-2 ring-blue-500 border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.2)] bg-blue-50/30 dark:bg-blue-900/20"
            )}>
                {/* Background Silhouette Mini Map */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[24px]">
                    <div className="absolute -right-10 -bottom-10 w-64 h-64 opacity-[0.1] dark:opacity-[0.15] group-hover:scale-110 group-hover:rotate-6 transition-all duration-700">
                        {feature && (
                            <SegmenMiniMap 
                                feature={feature} 
                                strokeColor="currentColor" 
                                className="text-blue-600 dark:text-blue-400"
                                padding={10}
                            />
                        )}
                    </div>
                </div>

                <div className="flex flex-col h-full space-y-3 relative z-10">
                    {/* Header: Condition & Arrow */}
                    <div className="flex items-center justify-between">
                        <ConditionPill condition={jalan.kondisi} />
                        <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                            <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </div>

                    {/* Main Info */}
                    <div className="space-y-1">
                        <h3 className="font-bold text-slate-900 dark:text-white text-[15px] leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                            {jalan.nama_ruas}
                        </h3>
                        <div className="flex items-center gap-1.5 text-slate-400">
                            <Route size={11} className="shrink-0" />
                            <span className="text-[9px] font-black uppercase tracking-widest leading-none">RUAS {jalan.kode_ruas}</span>
                        </div>
                    </div>

                    {/* Location Badge */}
                    <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 p-2.5 rounded-xl border border-transparent group-hover:border-slate-100 dark:group-hover:border-slate-700 transition-all">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                            <MapPin size={14} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold truncate text-slate-700 dark:text-slate-200">{jalan.desa}, {jalan.kecamatan}</p>
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Panjang</p>
                            <div className="flex items-center gap-1.5">
                                <Ruler size={12} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-800 dark:text-white">
                                    {Math.round(summary?.total_panjang_jalan || jalan.panjang).toLocaleString('id-ID')} m
                                </span>
                            </div>
                        </div>
                        <div className="space-y-1 text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mantap</p>
                            <div className="flex items-center gap-1.5 justify-end">
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                    {summary?.kondisi_jalan?.persentase_mantap || 0}%
                                </span>
                                <Activity size={12} className="text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </div>

                    {/* Progress Visuals */}
                    <div className="pt-1 mt-auto space-y-2.5">
                        {/* Condition Distribution: Simple Visual */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                <span>Distribusi Kondisi</span>
                                <div className="flex gap-1.5">
                                    <div className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-emerald-500" /> Baik</div>
                                    <div className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-amber-500" /> Sedang</div>
                                    <div className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-500" /> Rusak</div>
                                </div>
                            </div>
                            <div className="h-1.5 w-full bg-slate-50 dark:bg-slate-800/50 rounded-full overflow-hidden flex">
                                <div style={{ width: `${conditionDist.baik || 0}%` }} className="h-full bg-emerald-500" />
                                <div style={{ width: `${conditionDist.sedang || 0}%` }} className="h-full bg-amber-500" />
                                <div style={{ width: `${conditionDist["rusak ringan"] || 0}%` }} className="h-full bg-orange-500" />
                                <div style={{ width: `${conditionDist["rusak berat"] || 0}%` }} className="h-full bg-red-500" />
                            </div>
                        </div>
                    </div>
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

function PaginationStats({ pagination, currentPage, limit }: { pagination: any; currentPage: number; limit: number }) {
    return (
        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            Menampilkan{" "}
            <span className="text-slate-900 dark:text-white">{(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, pagination.total)}</span>
            {" "}dari <span className="text-slate-900 dark:text-white">{pagination.total}</span> ruas
        </p>
    );
}


function PaginationButtons({ currentPage, totalPages, isLoading, onPageChange }: { currentPage: number; totalPages: number; isLoading: boolean; onPageChange: (page: number) => void }) {
    return (
        <div className="flex items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 rounded-xl font-bold gap-1.5 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-[11px]"
                disabled={currentPage === 1 || isLoading}
                onClick={() => onPageChange(currentPage - 1)}
            >
                <ChevronLeft size={14} /> Sebelumnya
            </Button>

            <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 rounded-xl font-bold gap-1.5 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-[11px]"
                disabled={currentPage === totalPages || isLoading}
                onClick={() => onPageChange(currentPage + 1)}
            >
                Selanjutnya <ChevronRight size={14} />
            </Button>
        </div>
    );
}


export default function JalanDesaListPage() {
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    // Initialize state from URL params
    const initialSearch = searchParams.get("search") || "";
    const initialPage = parseInt(searchParams.get("page") || "1");
    const initialLimit = parseInt(searchParams.get("limit") || "20");
    const highlightId = searchParams.get("highlight");

    // Clean search params for passing to detail page (remove highlight so it doesn't stack)
    const cleanParams = new URLSearchParams(searchParams);
    cleanParams.delete("highlight");
    const cleanSearchString = cleanParams.toString() ? `?${cleanParams.toString()}` : "";

    const [jalanData, setJalanData] = useState<MonitoringJalanResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [geometries, setGeometries] = useState<Record<string, any>>({});
    const [search, setSearch] = useState(initialSearch);
    const [submitSearch, setSubmitSearch] = useState(initialSearch);
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [limit, setLimit] = useState(initialLimit);
    const [totalPages, setTotalPages] = useState(1);
    const [pagination, setPagination] = useState<any>(null);

    // Sync state to URL when search or page changes
    useEffect(() => {
        const newParams = new URLSearchParams(searchParams);
        if (submitSearch) {
            newParams.set("search", submitSearch);
        } else {
            newParams.delete("search");
        }
        
        if (currentPage > 1) {
            newParams.set("page", currentPage.toString());
        } else {
            newParams.delete("page");
        }

        if (limit !== 20) {
            newParams.set("limit", limit.toString());
        } else {
            newParams.delete("limit");
        }
        
        // Only update if changed to avoid infinite loops
        if (newParams.toString() !== searchParams.toString()) {
            setSearchParams(newParams, { replace: true });
        }
    }, [submitSearch, currentPage, limit, setSearchParams, searchParams]);

    // Fetch geometries for roads on the current page
    useEffect(() => {
        if (jalanData.length > 0) {
            const fetchPageGeometries = async () => {
                const results = await Promise.allSettled(
                    jalanData.map(item => monitoringService.getSegmenGeoJSONByKodeRuas(item.jalan.id))
                );
                
                const newGeoms: Record<string, any> = { ...geometries };
                results.forEach((res, index) => {
                    if (res.status === 'fulfilled' && res.value) {
                        newGeoms[jalanData[index].jalan.id] = res.value;
                    }
                });
                setGeometries(newGeoms);
            };
            fetchPageGeometries();
        }
    }, [jalanData]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await monitoringService.getMonitoringJalan({
                page: currentPage,
                limit: limit,
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
    }, [currentPage, limit, submitSearch]);

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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-16">
            <PublicNavbar />

            <main>
                {/* ─── Hero Header ─────────────────────────────── */}
                <div className="relative bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                    {/* Background decoration */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute -top-20 -right-20 w-72 h-72 bg-blue-50 dark:bg-blue-950/30 rounded-full blur-3xl opacity-60" />
                        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-slate-100 dark:bg-slate-800/50 rounded-full blur-2xl" />
                    </div>

                    <div className="relative container mx-auto px-4 sm:px-6 py-6 md:py-8">
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

                    </div>
                </div>

                {/* ─── Sticky Search Bar ─────────────────────────────── */}
                <div className="sticky top-16 z-40 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 py-3 shadow-sm">
                    <div className="container mx-auto px-4 sm:px-6">
                        <form onSubmit={handleSearch} className="max-w-2xl bg-white dark:bg-slate-900 p-1 rounded-[20px] border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300">
                            <div className="relative flex items-center gap-2">
                                <div className="relative flex-1 group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                                    <Input
                                        placeholder="Cari nama ruas, kode, atau wilayah..."
                                        className="pl-11 pr-10 h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold shadow-sm focus-visible:ring-4 focus-visible:ring-blue-500/10 focus-visible:border-blue-500 transition-all"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                    {search && (
                                        <button
                                            type="button"
                                            onClick={clearSearch}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-all"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => fetchData()}
                                    className="h-11 w-11 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0 transition-all active:scale-90 p-0"
                                    disabled={isLoading}
                                    title="Refresh data"
                                >
                                    <RefreshCw size={16} className={cn("text-slate-500", isLoading && "animate-spin text-blue-500")} />
                                </Button>
                                <Button
                                    type="submit"
                                    className="h-11 px-6 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] bg-slate-900 hover:bg-blue-600 text-white shadow-lg shadow-slate-200 dark:shadow-none shrink-0 gap-2 transition-all active:scale-95"
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                                    <span className="hidden sm:inline">Telusuri</span>
                                </Button>
                            </div>
                            {submitSearch && (
                                <p className="mt-2.5 ml-2 text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
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
                <div className="relative container mx-auto px-4 sm:px-6 py-8">
                    {/* Background decorations for glass effect */}
                    <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
                        <div className="absolute top-[20%] -left-20 w-96 h-96 bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-[100px]" />
                        <div className="absolute bottom-[20%] -right-20 w-96 h-96 bg-emerald-100/20 dark:bg-emerald-900/10 rounded-full blur-[100px]" />
                    </div>

                    {/* ─── Top Pagination & Filter ───────────────────── */}
                    {pagination && (
                        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <PaginationStats pagination={pagination} currentPage={currentPage} limit={limit} />
                                <div className="hidden sm:block w-px h-4 bg-slate-200 dark:bg-slate-700" />
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Limit:</span>
                                    <select 
                                        className="bg-transparent text-[11px] font-black text-slate-700 dark:text-slate-200 outline-none focus:text-blue-600 transition-colors cursor-pointer"
                                        value={limit}
                                        onChange={(e) => {
                                            setLimit(parseInt(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                    >
                                        {[10, 20, 50, 100].map(v => (
                                            <option key={v} value={v} className="bg-white dark:bg-slate-900">{v}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <PaginationButtons 
                                currentPage={currentPage} 
                                totalPages={totalPages} 
                                isLoading={isLoading} 
                                onPageChange={setCurrentPage} 
                            />
                        </div>
                    )}

                    {/* Card Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {isLoading ? (
                            Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)
                        ) : jalanData.length > 0 ? (
                            jalanData.map((item) => (
                                <RoadCard 
                                    key={item.jalan.id} 
                                    item={item} 
                                    feature={geometries[item.jalan.id]?.features?.[0]} 
                                    searchState={{ from: cleanSearchString, lastId: item.jalan.id }}
                                    isHighlighted={highlightId === item.jalan.id}
                                />
                            ))
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

                    {/* ─── Bottom Pagination ───────────────────────────── */}
                    {pagination && !isLoading && (
                        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-8">
                            <PaginationStats pagination={pagination} currentPage={currentPage} limit={limit} />
                            <PaginationButtons 
                                currentPage={currentPage} 
                                totalPages={totalPages} 
                                isLoading={isLoading} 
                                onPageChange={setCurrentPage} 
                            />
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
