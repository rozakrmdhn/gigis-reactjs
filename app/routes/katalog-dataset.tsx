import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { PublicNavbar } from "~/components/public-navbar";
import { geonodeService, type GeoNodeResource } from "~/features/katalog/services/geonode.service";
import {
    Search,
    Database,
    Map as MapIcon,
    ChevronRight,
    Layers,
    Info,
    LayoutGrid,
    List,
    ExternalLink,
    FileText,
    RefreshCw,
    X
} from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
    return [
        { title: "Katalog Dataset - GIGIS Monitoring" },
        { name: "description", content: "Katalog data spasial dan dataset infrastruktur." },
    ];
};

export function generateSlug(id: number | string, title: string) {
    if (!title) return String(id);
    const formattedTitle = title
        .toLowerCase()
        .replace(/_/g, '-')
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    return `${id}-${formattedTitle}`;
}

function DatasetCard({ resource }: { resource: GeoNodeResource }) {
    return (
        <div className="group relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1">
            {/* Thumbnail */}
            <div className="relative h-40 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                {resource.thumbnail_url ? (
                    <img
                        src={resource.thumbnail_url.startsWith('http') ? resource.thumbnail_url : `https://saggaserv.my.id${resource.thumbnail_url}`}
                        alt={resource.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700">
                        <MapIcon size={48} />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Content */}
            <div className="p-5 space-y-3">
                <div className="space-y-1">
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-sm line-clamp-2 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {resource.title}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Layers size={10} /> {resource.name?.split(':')[0] || 'Dataset'}
                    </p>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed italic">
                    {resource.abstract || "Tidak ada deskripsi tersedia untuk dataset ini."}
                </p>

                <div className="pt-2 flex items-center gap-2">
                    <Link to={`/katalog-dataset/${generateSlug(resource.pk, resource.title)}`} className="flex-[2]">
                        <Button className="w-full h-9 rounded-xl text-[11px] font-black uppercase tracking-widest gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none">
                            <MapIcon size={14} /> Preview Peta
                        </Button>
                    </Link>
                    {resource.links?.find(l => l.name === 'ISO' && l.extension === 'xml') && (
                        <Button
                            variant="outline"
                            className="flex-1 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest gap-1 border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 px-2 transition-all"
                            onClick={() => window.open(resource.links?.find(l => l.name === 'ISO' && l.extension === 'xml')?.url, '_blank')}
                        >
                            <FileText size={12} /> Metadata
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

function SkeletonCard() {
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden animate-pulse">
            <div className="h-40 bg-slate-100 dark:bg-slate-800" />
            <div className="p-5 space-y-3">
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/4" />
                <div className="space-y-1.5 pt-1">
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-5/6" />
                </div>
                <div className="pt-2 h-9 bg-slate-100 dark:bg-slate-800 rounded-xl w-full" />
            </div>
        </div>
    );
}

export default function KatalogDatasetPage() {
    const [datasets, setDatasets] = useState<GeoNodeResource[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeSearch, setActiveSearch] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchData = useCallback(async (forceRefresh = false) => {
        setIsLoading(true);
        setError(null);
        if (forceRefresh) setIsRefreshing(true);
        try {
            console.log("Fetching datasets. Search:", activeSearch, "Refresh:", forceRefresh);
            const data = await geonodeService.getDatasets({ 
                search: activeSearch,
                refresh: forceRefresh 
            });
            console.log("Datasets received:", data);

            if (data && (data.results || data.resources)) {
                setDatasets(data.results || data.resources || []);
            } else if (data && (data as any).error) {
                setError((data as any).error);
            } else {
                setDatasets([]);
            }
        } catch (error: any) {
            console.error("Failed to load datasets:", error);
            setError(error.message || "Gagal memuat data dari server GeoNode.");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [activeSearch]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col pt-16 font-sans selection:bg-blue-100 dark:selection:bg-blue-900/30">
            <PublicNavbar />

            {/* ─── Hero Header ─────────────────────────────── */}
            <div className="relative bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 transition-colors duration-500 overflow-hidden">
                {/* Decorative background */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute -top-20 -right-20 w-72 h-72 bg-blue-50 dark:bg-blue-950/30 rounded-full blur-3xl opacity-60" />
                    <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-slate-100 dark:bg-slate-800/50 rounded-full blur-2xl" />
                </div>

                <div className="relative container mx-auto px-4 sm:px-6 py-6 md:py-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        {/* Title */}
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50">
                                <Database size={14} className="text-blue-600 dark:text-blue-400" />
                                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">Dataset Geonode</span>
                            </div>
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">
                                Katalog <span className="text-blue-600">Data Spasial</span>
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-base font-medium max-w-md">
                                Jelajahi kumpulan data spasial, infrastruktur, dan pembangunan daerah yang terintegrasi.
                            </p>
                        </div>

                        {/* Stats summary */}
                        {!isLoading && datasets.length > 0 && (
                            <div className="flex items-center gap-4 shrink-0">
                                <div className="text-right">
                                    <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{datasets.length}</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Dataset</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Sticky Search Bar ─────────────────────────────── */}
            <div className="sticky top-16 z-40 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 py-3 shadow-sm">
                <div className="container mx-auto px-4 sm:px-6">
                    <form 
                        onSubmit={(e) => { e.preventDefault(); setActiveSearch(searchTerm); }} 
                        className="max-w-2xl bg-white dark:bg-slate-900 p-1 rounded-[20px] border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300"
                    >
                        <div className="relative flex items-center gap-2">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                                <Input
                                    placeholder="Cari judul dataset..."
                                    className="pl-11 pr-10 h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold shadow-sm focus-visible:ring-4 focus-visible:ring-blue-500/10 focus-visible:border-blue-500 transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => { setSearchTerm(""); setActiveSearch(""); }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-all"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => fetchData(true)}
                                className="h-11 w-11 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0 transition-all active:scale-90 p-0"
                                disabled={isLoading || isRefreshing}
                                title="Refresh data"
                            >
                                <RefreshCw size={16} className={cn("text-slate-500", isRefreshing && "animate-spin text-blue-500")} />
                            </Button>
                            <Button
                                type="submit"
                                className="h-11 px-6 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] bg-slate-900 hover:bg-blue-600 text-white shadow-lg shadow-slate-200 dark:shadow-none shrink-0 gap-2 transition-all active:scale-95"
                                disabled={isLoading}
                            >
                                {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                                <span className="hidden sm:inline">Telusuri</span>
                            </Button>
                        </div>
                        {activeSearch && (
                            <p className="mt-2.5 ml-2 text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                                <Database size={11} />
                                Hasil pencarian untuk: <span className="text-blue-600 dark:text-blue-400">"{activeSearch}"</span>
                                <button type="button" onClick={() => { setSearchTerm(""); setActiveSearch(""); }} className="ml-1 text-slate-400 hover:text-red-500 transition-colors">
                                    <X className="w-2.5 h-2.5" />
                                </button>
                            </p>
                        )}
                    </form>
                </div>
            </div>


            {/* Content Section */}
            <main className="flex-1 container mx-auto px-4 sm:px-6 pb-24">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Koleksi Data</h2>
                            {!isLoading && !error && (
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-black text-slate-500">{datasets.length} Item</span>
                            )}
                        </div>
                        
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => fetchData(true)}
                            disabled={isLoading || isRefreshing}
                            className="h-8 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 gap-2 px-2 transition-all"
                        >
                            <RefreshCw size={14} className={cn(isRefreshing && "animate-spin")} />
                            <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Refresh Data</span>
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                ) : error ? (
                    <div className="py-24 text-center space-y-6 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-3xl">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                            <Info size={32} />
                        </div>
                        <div className="space-y-2 px-6">
                            <p className="text-lg font-black text-slate-900 dark:text-white uppercase">Terjadi Kesalahan</p>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium max-w-md mx-auto">{error}</p>
                        </div>
                        <Button
                            onClick={() => fetchData()}
                            className="rounded-xl font-bold uppercase tracking-widest text-[11px] bg-red-600 hover:bg-red-700 text-white"
                        >
                            Coba Lagi
                        </Button>
                    </div>
                ) : datasets.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {datasets.map((resource) => (
                            <DatasetCard key={resource.pk} resource={resource} />
                        ))}
                    </div>
                ) : (
                    <div className="py-32 text-center space-y-6">
                        <div className="w-20 h-20 mx-auto rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Search size={32} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-xl font-black text-slate-900 dark:text-white italic">Dataset tidak ditemukan</p>
                            <p className="text-slate-500 text-sm font-medium">Coba gunakan kata kunci pencarian yang berbeda.</p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => { setSearchTerm(""); setActiveSearch(""); }}
                            className="rounded-xl font-bold uppercase tracking-widest text-[11px]"
                        >
                            Reset Pencarian
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}
