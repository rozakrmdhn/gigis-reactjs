import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { PublicNavbar } from "~/components/public-navbar";
import { jalanDropdownService } from "~/features/peta/services/jalan-dropdown.service";
import { type Jalan } from "~/features/peta/types";
import { Search, MapPin, Ruler, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
    return [
        { title: "Daftar Ruas Jalan - GIGIS Monitoring" },
        { name: "description", content: "Daftar ruas jalan desa di Kabupaten Bojonegoro" },
    ];
};

export default function JalanDesaListPage() {
    const [jalanData, setJalanData] = useState<Jalan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [submitSearch, setSubmitSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pagination, setPagination] = useState<any>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await jalanDropdownService.getJalan({
                page: currentPage,
                limit: 15,
                search: submitSearch || undefined
            });
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
        setCurrentPage(1); // Reset to first page on search
    };

    const getConditionBadge = (condition: string) => {
        const c = condition.toLowerCase();
        if (c.includes('baik')) return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-tight">Baik</Badge>;
        if (c.includes('sedang')) return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 hover:bg-amber-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-tight">Sedang</Badge>;
        if (c.includes('rusak ringan')) return <Badge className="bg-orange-500/10 text-orange-600 border-orange-200 hover:bg-orange-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-tight">Rusak Ringan</Badge>;
        if (c.includes('rusak berat')) return <Badge className="bg-red-500/10 text-red-600 border-red-200 hover:bg-red-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-tight">Rusak Berat</Badge>;
        return <Badge variant="outline" className="px-3 py-1 text-[10px] font-bold uppercase tracking-tight">{condition}</Badge>;
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <PublicNavbar />
            
            <main className="container mx-auto px-4 py-8">
                <div className="flex flex-col gap-8">
                    {/* Header Section - Simplified Style like /statistik */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Daftar Ruas Jalan</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">Data teknis dan kondisi ruas jalan poros desa.</p>
                        </div>
                        
                        <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 w-full md:w-auto">
                            <form onSubmit={handleSearch} className="flex items-center gap-2">
                                <div className="relative flex-1 md:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <Input 
                                        placeholder="Cari nama ruas..." 
                                        className="pl-9 h-10 border-none shadow-none focus-visible:ring-0 text-sm font-semibold"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <Button type="submit" size="sm" className="rounded-xl px-4 font-bold tracking-tight">
                                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : "Cari"}
                                </Button>
                            </form>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                        <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-widest pl-8">Ruas Jalan</th>
                                        <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Wilayah</th>
                                        <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Panjang</th>
                                        <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Kondisi</th>
                                        <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right pr-8">Detail</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {isLoading ? (
                                        Array.from({ length: 10 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td className="p-5 pl-8"><div className="h-5 w-48 bg-slate-100 dark:bg-slate-800 rounded-lg" /></td>
                                                <td className="p-5"><div className="h-5 w-32 bg-slate-100 dark:bg-slate-800 rounded-lg" /></td>
                                                <td className="p-5"><div className="h-5 w-24 bg-slate-100 dark:bg-slate-800 rounded-lg" /></td>
                                                <td className="p-5"><div className="h-8 w-20 bg-slate-100 dark:bg-slate-800 rounded-full" /></td>
                                                <td className="p-5 pr-8"><div className="h-8 w-8 ml-auto bg-slate-100 dark:bg-slate-800 rounded-full" /></td>
                                            </tr>
                                        ))
                                    ) : jalanData.length > 0 ? (
                                        jalanData.map((jalan) => (
                                            <tr key={jalan.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="p-5 pl-8">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900 dark:text-white text-sm">{jalan.nama_ruas}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">KODE: {jalan.kode_ruas}</span>
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex flex-col">
                                                        <div className="text-slate-700 dark:text-slate-300 font-bold text-sm">
                                                            {jalan.desa}
                                                        </div>
                                                        <span className="text-[11px] font-semibold text-slate-400 uppercase">{jalan.kecamatan}</span>
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold text-sm">
                                                        <Ruler size={14} className="text-slate-400" />
                                                        {Math.round(jalan.panjang)} m
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    {getConditionBadge(jalan.kondisi)}
                                                </td>
                                                <td className="p-5 pr-8 text-right">
                                                    <Link to={`/jalan-desa/${jalan.id}`}>
                                                        <Button size="icon" variant="ghost" className="rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                                            <ChevronRight size={18} />
                                                        </Button>
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="p-20 text-center text-slate-400 font-bold">
                                                Tidak ada data ditemukan
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        {pagination && (
                            <div className="p-5 border-t border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 flex items-center justify-between">
                                <div className="text-sm font-bold text-slate-500">
                                    Menampilkan <span className="text-slate-900 dark:text-white">{jalanData.length}</span> dari <span className="text-slate-900 dark:text-white">{pagination.total}</span> ruas jalan
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="rounded-xl font-bold gap-1 shadow-sm"
                                        disabled={currentPage === 1 || isLoading}
                                        onClick={() => setCurrentPage(prev => prev - 1)}
                                    >
                                        <ChevronLeft size={16} /> Sebelumnya
                                    </Button>
                                    <div className="flex items-center gap-1 mx-2">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{currentPage}</span>
                                        <span className="text-sm text-slate-400">/</span>
                                        <span className="text-sm font-bold text-slate-400">{totalPages}</span>
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="rounded-xl font-bold gap-1 shadow-sm"
                                        disabled={currentPage === totalPages || isLoading}
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                    >
                                        Selanjutnya <ChevronRight size={16} />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <footer className="mt-20 border-t bg-white dark:bg-slate-900 py-12">
                <div className="container mx-auto px-4 text-center text-slate-500">
                    <p>© 2026 GIGIS Monitoring Jalan Poros. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
