import { useState, useEffect, useCallback } from "react";
import { useRevalidator } from "react-router";
import { PublicNavbar } from "~/components/public-navbar";
import { LaporanFilters } from "~/features/laporan/components/LaporanFilters";
import { LaporanStatsCards } from "~/features/laporan/components/LaporanStatsCards";
import { LaporanTable } from "~/features/laporan/components/LaporanTable";
import { laporanService } from "~/features/laporan/services/laporan.service";
import { kecamatanService } from "~/services/kecamatan";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
    return [
        { title: "Statistik - GIGIS Monitoring" },
        { name: "description", content: "Data dan statistik pembangunan jalan desa Bojonegoro" },
    ];
};

export default function StatistikPage() {
    const revalidator = useRevalidator();

    const [filters, setFilters] = useState<{
        kecamatan?: string;
        desa?: string;
        tahun_pembangunan?: string;
        check_melarosa: string;
    }>({
        kecamatan: undefined,
        desa: undefined,
        tahun_pembangunan: undefined,
        check_melarosa: "ya"
    });

    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [rekapData, setRekapData] = useState<any[]>([]);
    const [kecamatanList, setKecamatanList] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    
    const isLoading = isInitialLoading || revalidator.state === "loading";

    const fetchData = useCallback(async () => {
        setIsInitialLoading(true);
        try {
            const [rekapResponse, kecamatanData] = await Promise.all([
                laporanService.getRekapJalanByDibangun(filters),
                kecamatanService.getKecamatan()
            ]);
            setRekapData(rekapResponse);
            setKecamatanList(kecamatanData);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsInitialLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSearchSubmit = useCallback((value: string) => {
        setFilters(prev => ({ ...prev, desa: value || undefined }));
    }, []);

    const handleFilterChange = useCallback((key: string, value: string) => {
        setFilters(prev => ({
            ...prev,
            [key]: value === "all" ? undefined : value
        }));
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <PublicNavbar />
            
            <main className="container mx-auto px-4 py-8">
                <div className="flex flex-col gap-8">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Statistik Pembangunan</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-lg">Rekapitulasi progres pembangunan infrastruktur jalan poros desa.</p>
                        </div>
                        
                        <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                            <LaporanFilters
                                filters={filters}
                                kecamatanList={kecamatanList}
                                onFilterChange={handleFilterChange}
                                onRefresh={fetchData}
                                isLoading={isLoading}
                            />
                        </div>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid gap-6">
                        <LaporanStatsCards rekapData={rekapData} isLoading={isLoading} />
                    </div>

                    {/* Data Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 p-6">
                        <LaporanTable
                            rekapData={rekapData}
                            search={search}
                            setSearch={setSearch}
                            onSearchSubmit={handleSearchSubmit}
                            isLoading={isLoading}
                        />
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
