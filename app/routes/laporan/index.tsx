import { useState, useEffect, useCallback } from "react";
import { useLoaderData, useRevalidator, useSearchParams, type LoaderFunctionArgs } from "react-router";
import { Spinner } from "~/components/ui/spinner";
import { kecamatanService } from "~/services/kecamatan";
import { LaporanFilters } from "~/features/laporan/components/LaporanFilters";
import { LaporanStatsCards } from "~/features/laporan/components/LaporanStatsCards";
import { LaporanTable } from "~/features/laporan/components/LaporanTable";
import { laporanService } from "~/features/laporan/services/laporan.service";

export async function loader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const kecamatan = url.searchParams.get("kecamatan") || undefined;
    const desa = url.searchParams.get("desa") || undefined;
    const tahun_pembangunan = url.searchParams.get("tahun_pembangunan") || undefined;
    const check_melarosa = url.searchParams.get("check_melarosa") || "ya";

    const [rekapData, kecamatanList] = await Promise.all([
        laporanService.getRekapJalanByDibangun({ kecamatan, desa, tahun_pembangunan, check_melarosa }),
        kecamatanService.getKecamatan()
    ]);

    return { rekapData, kecamatanList, filters: { kecamatan, desa, tahun_pembangunan, check_melarosa } };
}

export default function LaporanPage() {
    const { rekapData, kecamatanList, filters } = useLoaderData<typeof loader>();
    const revalidator = useRevalidator();
    const [searchParams, setSearchParams] = useSearchParams();

    const [search, setSearch] = useState(filters.desa || "");
    const isLoading = revalidator.state === "loading";

    useEffect(() => {
        const timer = setTimeout(() => {
            const newParams = new URLSearchParams(searchParams);
            if (search) {
                newParams.set("desa", search);
            } else {
                newParams.delete("desa");
            }
            if (newParams.toString() !== searchParams.toString()) {
                setSearchParams(newParams);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [search, searchParams, setSearchParams]);

    const handleFilterChange = useCallback((key: string, value: string) => {
        const newParams = new URLSearchParams(searchParams);
        if (value === "all") {
            newParams.delete(key);
        } else {
            newParams.set(key, value);
        }
        setSearchParams(newParams);
    }, [searchParams, setSearchParams]);

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 relative">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Laporan Rekapitulasi</h1>
                    <p className="text-muted-foreground">Ringkasan data pembangunan jalan desa.</p>
                </div>
                <LaporanFilters
                    filters={filters}
                    kecamatanList={kecamatanList}
                    onFilterChange={handleFilterChange}
                    onRefresh={() => revalidator.revalidate()}
                    isLoading={isLoading}
                />
            </div>

            <LaporanStatsCards rekapData={rekapData} isLoading={isLoading} />
            <LaporanTable
                rekapData={rekapData}
                search={search}
                setSearch={setSearch}
                isLoading={isLoading}
            />
        </div>
    );
}
