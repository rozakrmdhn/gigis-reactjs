import { useState, useEffect, useCallback } from "react";
import { useLoaderData, useRevalidator, useSearchParams, type LoaderFunctionArgs } from "react-router";
import { monitoringService } from "~/features/monitoring/services/monitoring.service";
import { kecamatanService } from "~/services/kecamatan";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { RotateCw, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "~/components/ui/skeleton";
import { DataMonitoringItem } from "./components/DataMonitoringItem";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "~/components/ui/pagination";

export async function loader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const id_kecamatan = url.searchParams.get("id_kecamatan") || undefined;
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 50;
    const search = url.searchParams.get("search") || undefined;

    // Return only filters for instant navigation
    // Data will be fetched client-side
    return { filters: { id_kecamatan, page, limit, search } };
}

export default function DataMonitoringPage() {
    const { filters } = useLoaderData<typeof loader>();
    const revalidator = useRevalidator();
    const [searchParams, setSearchParams] = useSearchParams();

    // Client-side data state
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [monitoringData, setMonitoringData] = useState<any>(null);
    const [kecamatanList, setKecamatanList] = useState<any[]>([]);

    const [searchTerm, setSearchTerm] = useState(filters.search || "");
    const isLoading = isInitialLoading || revalidator.state === "loading";
    const pagination = monitoringData?.pagination;

    // Fetch data on mount and when filters change
    useEffect(() => {
        async function fetchData() {
            setIsInitialLoading(true);
            try {
                const [monitoringResponse, kecamatanData] = await Promise.all([
                    monitoringService.getMonitoringJalan(filters),
                    kecamatanService.getKecamatan()
                ]);
                setMonitoringData(monitoringResponse);
                setKecamatanList(kecamatanData);
            } catch (error) {
                console.error("Error fetching data:", error);
                setMonitoringData(null);
                setKecamatanList([]);
            } finally {
                setIsInitialLoading(false);
            }
        }
        fetchData();
    }, [filters.id_kecamatan, filters.page, filters.limit, filters.search]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const newParams = new URLSearchParams(searchParams);
            if (searchTerm) {
                newParams.set("search", searchTerm);
            } else {
                newParams.delete("search");
            }
            newParams.set("page", "1");
            if (newParams.toString() !== searchParams.toString()) {
                setSearchParams(newParams);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm, searchParams, setSearchParams]);

    const handleFilterChange = useCallback((key: string, value: string) => {
        const newParams = new URLSearchParams(searchParams);
        if (value === "all") {
            newParams.delete(key);
        } else {
            newParams.set(key, value);
        }
        newParams.set("page", "1");
        setSearchParams(newParams);
    }, [searchParams, setSearchParams]);

    const handlePageChange = (newPage: number) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set("page", newPage.toString());
        setSearchParams(newParams);
    };

    return (
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-4 mx-auto w-full">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Data Monitoring</h1>
                    <p className="text-muted-foreground mt-1">
                        Menampilkan {pagination?.total || 0} ruas jalan di database.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                    <div className="relative w-full sm:w-[280px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari nama ruas jalan..."
                            className="pl-9 bg-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Select
                            value={filters.id_kecamatan || "all"}
                            onValueChange={(v) => handleFilterChange("id_kecamatan", v)}
                        >
                            <SelectTrigger className="w-full sm:w-[200px] bg-white">
                                <SelectValue placeholder="Semua Kecamatan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Kecamatan</SelectItem>
                                {kecamatanList.map((k) => (
                                    <SelectItem key={k.id} value={k.id.toString()}>
                                        {k.nama_kecamatan}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => revalidator.revalidate()}
                            disabled={isLoading}
                            className="bg-white shrink-0"
                        >
                            <RotateCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    <div className="space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {monitoringData?.result?.length > 0 ? (
                            monitoringData.result.map((item: any, index: number) => (
                                <DataMonitoringItem
                                    key={item.jalan.id}
                                    data={item}
                                    index={(filters.page - 1) * filters.limit + index}
                                />
                            ))
                        ) : (
                            <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed">
                                <p className="text-muted-foreground">Tidak ada data ditemukan.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {!isLoading && pagination && pagination.totalPages > 1 && (
                <div className="flex justify-center mt-8">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (pagination.page > 1) handlePageChange(pagination.page - 1);
                                    }}
                                    className={pagination.page <= 1 ? "pointer-events-none opacity-50" : ""}
                                />
                            </PaginationItem>

                            {/* Simple Logic for visible pages: ensure current, first, last are mostly reachable. 
                                For simplicity in this iteration, displaying current page context. 
                                A more complex logic can be added if needed. */}
                            <PaginationItem>
                                <div className="flex items-center gap-1 mx-4 text-sm font-medium text-slate-600">
                                    Halaman <span className="text-slate-900 font-bold">{pagination.page}</span> dari {pagination.totalPages}
                                </div>
                            </PaginationItem>

                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (pagination.page < pagination.totalPages) handlePageChange(pagination.page + 1);
                                    }}
                                    className={pagination.page >= pagination.totalPages ? "pointer-events-none opacity-50" : ""}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </div>
    );
}
