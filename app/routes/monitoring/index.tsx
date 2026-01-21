import { useState } from 'react';
import { useLoaderData, useSearchParams, type LoaderFunctionArgs } from "react-router";
import { MonitoringSidebar } from '~/features/monitoring/components/MonitoringSidebar';
import { MonitoringMap } from '~/features/monitoring/components/MonitoringMap';
import { MonitoringList } from '~/features/monitoring/components/MonitoringList';
import { type GeoJSONFeatureCollection } from '~/features/peta/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "~/components/ui/pagination";

import { monitoringService } from "~/features/monitoring/services/monitoring.service";
import { kecamatanService, type Kecamatan } from "~/services/kecamatan";

export async function loader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const id_kecamatan = url.searchParams.get("id_kecamatan") || undefined;
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    try {
        const [monitoringResponse, kecamatanList] = await Promise.all([
            monitoringService.getMonitoringJalan({ id_kecamatan, page, limit }),
            kecamatanService.getKecamatan()
        ]);
        return {
            monitoringData: monitoringResponse.result,
            pagination: monitoringResponse.pagination,
            kecamatanList,
            filters: { id_kecamatan, page, limit }
        };
    } catch (error) {
        console.error("Loader error in monitoring page:", error);
        return { monitoringData: [], pagination: undefined, kecamatanList: [], filters: {} };
    }
}

export default function MonitoringPage() {
    const { monitoringData, pagination, kecamatanList, filters } = useLoaderData<typeof loader>();
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [jalanFeatures, setJalanFeatures] = useState<GeoJSONFeatureCollection | null>(null);
    const [segmenFeatures, setSegmenFeatures] = useState<GeoJSONFeatureCollection | null>(null);
    const [isPanelVisible, setIsPanelVisible] = useState(false);
    const [fetchingGeojson, setFetchingGeojson] = useState(false);

    const handleSelectJalan = async (id: string) => {
        setFetchingGeojson(true);
        setSelectedId(id);
        const result = await monitoringService.getMonitoringJalanById(id);

        if (result) {
            setJalanFeatures(result.jalan);
            setSegmenFeatures(result.segmen);
            setIsPanelVisible(true);
        }
        setFetchingGeojson(false);
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden relative">
            <MonitoringSidebar className="z-30">
                <div className="flex flex-col min-h-full">
                    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm p-2 border-b shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col gap-0.5 min-w-[70px]">
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Data</span>
                                <span className="text-sm font-bold text-primary">{pagination?.total || 0}</span>
                            </div>
                            <div className="flex-1 flex gap-2">
                                <Select
                                    value={filters.id_kecamatan || "all"}
                                    onValueChange={(value) => {
                                        const newParams = new URLSearchParams(searchParams);
                                        if (value === "all") {
                                            newParams.delete("id_kecamatan");
                                        } else {
                                            newParams.set("id_kecamatan", value);
                                        }
                                        newParams.set("page", "1");
                                        setSearchParams(newParams);
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Kecamatan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        {kecamatanList.map((k: Kecamatan) => (
                                            <SelectItem key={k.id} value={k.id.toString()}>
                                                {k.nama_kecamatan}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={filters.limit?.toString() || "50"}
                                    onValueChange={(value) => {
                                        const newParams = new URLSearchParams(searchParams);
                                        newParams.set("limit", value);
                                        newParams.set("page", "1");
                                        setSearchParams(newParams);
                                    }}
                                >
                                    <SelectTrigger className="w-[80px]">
                                        <SelectValue placeholder="Limit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="25">25</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                        <SelectItem value="100">100</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 p-2 pb-20">
                        <MonitoringList
                            data={monitoringData}
                            onSelectJalan={handleSelectJalan}
                            selectedId={selectedId}
                        />
                    </div>

                    {pagination && pagination.totalPages > 1 && (
                        <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (pagination.page > 1) {
                                                    const newParams = new URLSearchParams(searchParams);
                                                    newParams.set("page", (pagination.page - 1).toString());
                                                    setSearchParams(newParams);
                                                }
                                            }}
                                            className={pagination.page <= 1 ? "pointer-events-none opacity-50" : ""}
                                        />
                                    </PaginationItem>

                                    <div className="flex items-center text-xs font-small px-4">
                                        Page {pagination.page} of {pagination.totalPages}
                                    </div>

                                    <PaginationItem>
                                        <PaginationNext
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (pagination.page < pagination.totalPages) {
                                                    const newParams = new URLSearchParams(searchParams);
                                                    newParams.set("page", (pagination.page + 1).toString());
                                                    setSearchParams(newParams);
                                                }
                                            }}
                                            className={pagination.page >= pagination.totalPages ? "pointer-events-none opacity-50" : ""}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}
                </div>
            </MonitoringSidebar>

            <div className="flex-1 relative">
                <MonitoringMap
                    jalanFeatures={jalanFeatures}
                    segmenFeatures={segmenFeatures}
                />
            </div>
        </div>
    );
}
