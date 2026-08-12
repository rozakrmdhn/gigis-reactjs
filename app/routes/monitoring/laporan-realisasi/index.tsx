import { useState, useEffect, useCallback } from "react";
import { useRevalidator, type MetaFunction } from "react-router";
import { kecamatanService } from "~/services/kecamatan";
import { LaporanFilters } from "~/features/laporan/components/LaporanFilters";
import { LaporanStatsCards } from "~/features/laporan/components/LaporanStatsCards";
import { LaporanTable } from "~/features/laporan/components/LaporanTable";
import { laporanService } from "~/features/laporan/services/laporan.service";

export const meta: MetaFunction = () => {
    return [
        { title: "Laporan Rekapitulasi - MELAROSA" },
        { name: "description", content: "Ringkasan data pembangunan jalan desa Bojonegoro" },
    ];
};

export async function loader() {
    return {};
}

export default function LaporanPage() {
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
            setRekapData([]);
            setKecamatanList([]);
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



    const formatNumber = (num: number) => num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 relative bg-background dark:bg-slate-950">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Laporan Rekapitulasi</h1>
                    <p className="text-muted-foreground">Ringkasan data pembangunan jalan desa.</p>
                </div>
                <LaporanFilters
                    filters={filters}
                    kecamatanList={kecamatanList}
                    onFilterChange={handleFilterChange}
                    onRefresh={fetchData}
                    isLoading={isLoading}
                />
            </div>

            <LaporanStatsCards rekapData={rekapData} isLoading={isLoading} />
            <LaporanTable
                rekapData={rekapData}
                search={search}
                setSearch={setSearch}
                onSearchSubmit={handleSearchSubmit}
                isLoading={isLoading}
            />
        </div>
    );
}
