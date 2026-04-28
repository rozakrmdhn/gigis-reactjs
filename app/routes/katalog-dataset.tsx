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
    ExternalLink
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
                    <Link to={`/katalog-dataset/${resource.pk}`} className="flex-1">
                        <Button className="w-full h-9 rounded-xl text-[11px] font-black uppercase tracking-widest gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none">
                            <MapIcon size={14} /> Preview Peta
                        </Button>
                    </Link>
                    <a
                        href={`https://saggaserv.my.id${resource.detail_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                        <ExternalLink size={16} />
                    </a>
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

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            console.log("Fetching datasets with search:", activeSearch);
            const data = await geonodeService.getDatasets({ search: activeSearch });
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
        }
    }, [activeSearch]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans selection:bg-blue-100 dark:selection:bg-blue-900/30">
            <PublicNavbar />

            {/* Header Section */}
            <div className="relative pt-14 pb-14 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full opacity-30 dark:opacity-20 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-blue-400 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-overlay animate-pulse" />
                    <div className="absolute bottom-[10%] right-[-10%] w-[35%] h-[50%] bg-indigo-400 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-overlay animate-pulse delay-700" />
                </div>

                <div className="container max-w-7xl mx-auto px-6 relative z-10">
                    <div className="max-w-3xl space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50">
                            <Database size={12} className="text-blue-600 dark:text-blue-400" />
                            <span className="text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-widest">Dataset Geonode</span>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1]">
                                Katalog <span className="text-blue-600">Data Spasial</span>
                            </h1>
                            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-2xl leading-relaxed">
                                Jelajahi kumpulan data spasial, infrastruktur, dan pembangunan daerah yang terintegrasi dengan server GeoNode.
                            </p>
                        </div>

                        {/* Search Bar */}
                        <div className="flex items-center gap-3 max-w-xl bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none focus-within:border-blue-400 transition-all duration-300">
                            <div className="pl-3 text-slate-400">
                                <Search size={20} />
                            </div>
                            <Input
                                placeholder="Cari judul dataset..."
                                className="border-none focus-visible:ring-0 text-sm font-semibold h-11 bg-transparent"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && setActiveSearch(searchTerm)}
                            />
                            <Button
                                onClick={() => setActiveSearch(searchTerm)}
                                className="rounded-xl h-11 px-6 bg-slate-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 font-bold uppercase tracking-widest text-[11px]"
                            >
                                Cari
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <main className="flex-1 container max-w-7xl mx-auto px-6 pb-24">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Koleksi Data</h2>
                        {!isLoading && !error && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-black text-slate-500">{datasets.length} Item</span>
                        )}
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
