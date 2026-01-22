import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLoaderData, useSearchParams, useNavigation, useRevalidator, type LoaderFunctionArgs } from "react-router";
import { History, Search, X, RotateCw } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { cn } from '~/lib/utils';
import { Spinner } from '~/components/ui/spinner';
import { MonitoringSidebar } from '~/features/monitoring/components/MonitoringSidebar';
import { MonitoringMap } from '~/features/monitoring/components/MonitoringMap';
import { useIsMobile } from '~/hooks/use-mobile';
import { MonitoringList } from '~/features/monitoring/components/MonitoringList';
import { ConstructionHistoryPanel } from '~/features/monitoring/components/ConstructionHistoryPanel';
import { MonitoringSidebarSkeleton } from '~/features/monitoring/components/MonitoringSidebarSkeleton';
import { MonitoringMapSkeleton } from '~/features/monitoring/components/MonitoringMapSkeleton';
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

import { monitoringService, type MonitoringJalanResult } from "~/features/monitoring/services/monitoring.service";
import { kecamatanService, type Kecamatan } from "~/services/kecamatan";

export async function loader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const id_kecamatan = url.searchParams.get("id_kecamatan") || undefined;
    const search = url.searchParams.get("search") || undefined;
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    // Return only filters for instant navigation
    // Data will be fetched client-side
    return {
        filters: { id_kecamatan, page, limit, search }
    };
}

interface SearchInputProps {
    value: string;
    onChange: (val: string) => void;
    isLoading?: boolean;
}

const SearchInput = React.memo(({ value, onChange, isLoading }: SearchInputProps) => {
    return (
        <div className="relative">
            <Search className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors",
                isLoading ? "text-emerald-500 animate-pulse" : "text-muted-foreground"
            )} />
            <Input
                placeholder="Cari nama ruas..."
                className="pl-9 h-9 bg-white/50 border-slate-200 focus-visible:ring-emerald-500/20"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            {value && (
                <button
                    onClick={() => onChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                >
                    <X className="h-3 w-3" />
                </button>
            )}
        </div>
    );
});

SearchInput.displayName = "SearchInput";

export default function MonitoringPage() {
    const isMobile = useIsMobile();
    const navigation = useNavigation();
    const revalidator = useRevalidator();
    const { filters } = useLoaderData<typeof loader>();
    const [searchParams, setSearchParams] = useSearchParams();

    // Client-side data state
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [monitoringData, setMonitoringData] = useState<MonitoringJalanResult[]>([]);
    const [pagination, setPagination] = useState<any>(null);
    const [kecamatanList, setKecamatanList] = useState<Kecamatan[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedMonitoringData, setSelectedMonitoringData] = useState<MonitoringJalanResult | null>(null);
    const [searchQuery, setSearchQuery] = useState(filters.search || "");
    const [jalanFeatures, setJalanFeatures] = useState<GeoJSONFeatureCollection | null>(null);
    const [segmenFeatures, setSegmenFeatures] = useState<GeoJSONFeatureCollection | null>(null);
    const [segmenKabFeatures, setSegmenKabFeatures] = useState<GeoJSONFeatureCollection | null>(null);
    const [isPanelVisible, setIsPanelVisible] = useState(false);
    const [isHistoryPanelVisible, setIsHistoryPanelVisible] = useState(false);
    const [fetchingGeojson, setFetchingGeojson] = useState(false);
    const [isDebouncing, setIsDebouncing] = useState(false);

    const isLoadingData = isInitialLoading || revalidator.state === "loading";

    // Fetch kecamatan list once on mount (doesn't change)
    useEffect(() => {
        async function fetchKecamatanList() {
            try {
                const kecamatanData = await kecamatanService.getKecamatan();
                setKecamatanList(kecamatanData);
            } catch (error) {
                console.error("Error fetching kecamatan list:", error);
                setKecamatanList([]);
            }
        }
        fetchKecamatanList();
    }, []);

    // Fetch monitoring data when filters change
    useEffect(() => {
        async function fetchData() {
            setIsInitialLoading(true);
            try {
                const monitoringResponse = await monitoringService.getMonitoringJalan(filters);
                setMonitoringData(monitoringResponse.result);
                setPagination(monitoringResponse.pagination);
            } catch (error) {
                console.error("Error fetching monitoring data:", error);
                setMonitoringData([]);
                setPagination(null);
            } finally {
                setIsInitialLoading(false);
            }
        }
        fetchData();
    }, [filters.id_kecamatan, filters.page, filters.limit, filters.search]);

    const handleSelectJalan = useCallback(async (id: string) => {
        setFetchingGeojson(true);
        setSelectedId(id);

        const found = monitoringData.find((item: MonitoringJalanResult) => item.jalan.id === id);
        if (found) {
            setSelectedMonitoringData(found);
            if (!isMobile) {
                setIsHistoryPanelVisible(true);
            }
        }

        const result = await monitoringService.getMonitoringJalanById(id);

        if (result) {
            setJalanFeatures(result.jalan);
            setSegmenFeatures(result.segmen);
            setSegmenKabFeatures(result.segmenkab);
            setIsPanelVisible(true);
        }
        setFetchingGeojson(false);
    }, [monitoringData, isMobile]);

    // Debounce search update
    useEffect(() => {
        if (searchQuery !== (filters.search || "")) {
            setIsDebouncing(true);
        }
        const timer = setTimeout(() => {
            if (searchQuery !== (filters.search || "")) {
                const newParams = new URLSearchParams(searchParams);
                if (searchQuery) {
                    newParams.set("search", searchQuery);
                } else {
                    newParams.delete("search");
                }
                newParams.set("page", "1");
                setSearchParams(newParams);
            }
            setIsDebouncing(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, filters.search, searchParams, setSearchParams]);

    // Memoize kecamatan options
    const kecamatanOptions = useMemo(() => (
        kecamatanList.map((k: Kecamatan) => (
            <SelectItem key={k.id} value={k.id.toString()}>
                {k.nama_kecamatan}
            </SelectItem>
        ))
    ), [kecamatanList]);

    // Memoize the monitoring list component
    const memoizedMonitoringList = useMemo(() => (
        <MonitoringList
            data={monitoringData}
            onSelectJalan={handleSelectJalan}
            selectedId={selectedId}
            isLoading={isLoadingData}
        />
    ), [monitoringData, handleSelectJalan, selectedId, isLoadingData]);

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
                                        if (value === (filters.id_kecamatan || "all")) return;
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
                                        {kecamatanOptions}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={filters.limit?.toString() || "50"}
                                    onValueChange={(value) => {
                                        if (value === (filters.limit?.toString() || "50")) return;
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

                    <div className="p-2">
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            isLoading={isDebouncing || isLoadingData}
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent">
                        {isInitialLoading ? (
                            <MonitoringSidebarSkeleton />
                        ) : (
                            memoizedMonitoringList
                        )}
                    </div>

                    <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-emerald-600 shrink-0"
                            onClick={() => revalidator.revalidate()}
                            disabled={isLoadingData}
                        >
                            <RotateCw className={cn("h-4 w-4", revalidator.state === "loading" && "animate-spin")} />
                        </Button>
                        <div className="flex-1">
                            {!isInitialLoading && pagination && pagination.totalPages > 1 && (
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

                                        <div className="flex items-center text-[10px] font-medium px-2 whitespace-nowrap">
                                            {pagination.page} / {pagination.totalPages}
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
                            )}
                        </div>
                    </div>
                </div>
            </MonitoringSidebar>

            <div className="flex-1 relative">
                {/* Map is always rendered and visible - no loading overlay */}
                <MonitoringMap
                    jalanFeatures={jalanFeatures}
                    segmenFeatures={segmenFeatures}
                    segmenKabFeatures={segmenKabFeatures}
                />

                {/* Search Overlay */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-full max-w-md px-16">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
                        </div>
                        <Input
                            type="text"
                            placeholder="Cari Nama Ruas / Desa ..."
                            className="w-full pl-10 pr-10 bg-white/90 backdrop-blur-md border-emerald-500/20 shadow-xl focus-visible:ring-emerald-500/50 h-11 rounded-2xl"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {(isLoadingData || isDebouncing) && (
                            <div className="absolute inset-y-0 right-10 flex items-center">
                                <Spinner className="h-4 w-4 text-emerald-500 animate-spin" />
                            </div>
                        )}
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-slate-900 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {selectedId && (
                    <Button
                        variant="secondary"
                        size="sm"
                        className={cn(
                            "absolute top-2 right-14 z-40 shadow-lg border-emerald-500/20 bg-white/90 backdrop-blur-sm hover:bg-emerald-50 transition-all duration-300",
                            isHistoryPanelVisible && "opacity-0 pointer-events-none translate-x-10"
                        )}
                        onClick={() => setIsHistoryPanelVisible(true)}
                    >
                        <History className="w-4 h-4 mr-2 text-emerald-600" />
                        <span className="font-bold text-slate-700">Riwayat</span>
                    </Button>
                )}
                <ConstructionHistoryPanel
                    data={selectedMonitoringData}
                    isVisible={isHistoryPanelVisible}
                    onClose={() => setIsHistoryPanelVisible(false)}
                />
            </div>
        </div>
    );
}
