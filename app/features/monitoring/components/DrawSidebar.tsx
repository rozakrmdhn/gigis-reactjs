import { useEffect, useState, useMemo, useCallback } from "react";
import { MonitoringSidebar } from "./MonitoringSidebar";
import { MonitoringList } from "./MonitoringList";
import { monitoringService, type MonitoringJalanResult } from "../services/monitoring.service";
import { kecamatanService, type Kecamatan } from "~/services/kecamatan";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Search, MapPin, Recycle, RotateCw, X } from "lucide-react";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "~/components/ui/pagination";
import { cn } from "~/lib/utils";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "~/components/ui/tabs";

interface DrawSidebarProps {
    onSelectRoad: (road: MonitoringJalanResult | null) => void;
    selectedRoad: MonitoringJalanResult | null;
    onStartDraw: () => void;
    isDrawing: boolean;
    isOpen?: boolean;
    onToggle?: (isOpen: boolean) => void;
    refreshTrigger?: number;
    onCoordinateSearch?: (coords: { lat: number; lng: number }[]) => void;
    onRefresh?: () => void;
    checkedRoadIds?: string[];
    onToggleCheckRoad?: (id: string, checked: boolean) => void;
    onKecamatanChange?: (id: string) => void;
    onDesaChange?: (id: string) => void;
    selectedDesaId?: string | null;
    selectedKecamatanId?: string | null;
}


// Helper to parse DMS (Degrees, Minutes, Seconds) to Decimal Degrees
function dmsToDecimal(degrees: number, minutes: number, seconds: number, direction: string): number {
    let decimal = degrees + minutes / 60 + seconds / 3600;
    if (direction === 'S' || direction === 'W') decimal = decimal * -1;
    return decimal;
}

// Unified coordinate parser for Decimal and DMS
function parseCoordinate(input: string): { lat: number, lng: number } | null {
    const cleanInput = input.trim();
    if (!cleanInput) return null;

    // 1. Try Decimal Degrees (DD) first: -7.123, 111.456 or -7.123 111.456
    const ddRegex = /^\s*(-?\d+(\.\d+)?)\s*[,|\s]\s*(-?\d+(\.\d+)?)\s*$/;
    const ddMatch = cleanInput.match(ddRegex);
    if (ddMatch) {
        return { lat: parseFloat(ddMatch[1]), lng: parseFloat(ddMatch[3]) };
    }

    // 2. Try Degrees Minutes Seconds (DMS)
    // Supports formats like: 7°13'43.8"S 111°49'54.8"E
    // Or with spaces: 7 13 43.8 S 111 49 54.8 E
    // Regex for single DMS part
    const dmsPartPattern = /(\d+)\s*[°|d|\s]\s*(\d+)\s*['|m|\s]\s*(\d+(\.\d+)?)\s*["|s|\s]\s*([NSEW])/i;

    // Find all matches for DMS parts
    const matches = cleanInput.match(new RegExp(dmsPartPattern.source, 'gi'));

    if (matches && matches.length === 2) {
        let lat = 0, lng = 0;

        matches.forEach(part => {
            const match = part.match(dmsPartPattern);
            if (match) {
                const deg = parseFloat(match[1]);
                const min = parseFloat(match[2]);
                const sec = parseFloat(match[3]);
                const dir = match[5].toUpperCase();

                const val = dmsToDecimal(deg, min, sec, dir);
                if (dir === 'N' || dir === 'S') lat = val;
                else if (dir === 'E' || dir === 'W') lng = val;
            }
        });

        if (lat !== 0 && lng !== 0) return { lat, lng };
    }

    return null;
}

export function DrawSidebar({
    onSelectRoad,
    selectedRoad,
    onStartDraw,
    isDrawing,
    isOpen,
    onToggle,
    refreshTrigger,
    onCoordinateSearch,
    onRefresh,
    checkedRoadIds,
    onToggleCheckRoad,
    onKecamatanChange,
    onDesaChange,
    selectedDesaId,
    selectedKecamatanId
}: DrawSidebarProps) {


    const [roads, setRoads] = useState<MonitoringJalanResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [kecamatanList, setKecamatanList] = useState<Kecamatan[]>([]);
    const [pagination, setPagination] = useState<{
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    } | null>(null);
    const [coordSearch, setCoordSearch] = useState("");

    const [filters, setFilters] = useState({
        id_kecamatan: "all",
        id_desa: "all",
        page: 1,
        limit: 50
    });




    // Fetch Kecamatan List
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



    // Sync selectedDesaId from props
    useEffect(() => {
        if (selectedDesaId && selectedDesaId !== filters.id_desa) {
            setFilters(prev => ({ ...prev, id_desa: selectedDesaId, page: 1 }));
        }
    }, [selectedDesaId]);

    // Sync selectedKecamatanId from props
    useEffect(() => {
        if (selectedKecamatanId && selectedKecamatanId !== filters.id_kecamatan) {
            setFilters(prev => ({ ...prev, id_kecamatan: selectedKecamatanId, id_desa: "all", page: 1 }));
        }
    }, [selectedKecamatanId]);


    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setFilters(prev => ({ ...prev, page: 1 }));
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Clear map markers when coordSearch input is cleared
    useEffect(() => {
        if (!coordSearch && onCoordinateSearch) {
            onCoordinateSearch([]);
        }
    }, [coordSearch, onCoordinateSearch]);

    const handleLocateCoordinate = () => {
        const lines = coordSearch.split('\n');
        const coords: { lat: number, lng: number }[] = [];

        lines.forEach(line => {
            const parsed = parseCoordinate(line);
            if (parsed) {
                coords.push(parsed);
            }
        });

        if (coords.length > 0 && onCoordinateSearch) {
            onCoordinateSearch(coords);
        }
    };

    const fetchRoads = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {
                page: filters.page,
                limit: filters.limit,
                search: debouncedSearch
            };

            if (filters.id_kecamatan !== "all") {
                params.id_kecamatan = filters.id_kecamatan;
            }

            if (filters.id_desa !== "all") {
                params.id_desa = filters.id_desa;
            }

            const response = await monitoringService.getMonitoringJalan(params);

            if (response.status === "success") {
                setRoads(response.result);
                if (response.pagination) {
                    setPagination(response.pagination);
                }
            }
        } catch (error) {
            console.error("Error fetching roads:", error);
        } finally {
            setLoading(false);
        }
    }, [filters, debouncedSearch, refreshTrigger]);

    useEffect(() => {
        fetchRoads();
    }, [fetchRoads]);

    // Auto-scroll to selected road
    useEffect(() => {
        if (selectedRoad?.jalan.id) {
            const timer = setTimeout(() => {
                const element = document.getElementById(`road-${selectedRoad.jalan.id}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [selectedRoad?.jalan.id, roads]);

    const kecamatanOptions = useMemo(() => (
        kecamatanList.map((k: Kecamatan) => (
            <SelectItem key={k.id} value={k.id.toString()}>
                {k.nama_kecamatan}
            </SelectItem>
        ))
    ), [kecamatanList]);

    return (
        <MonitoringSidebar widthClass="w-80" isOpen={isOpen} onToggle={onToggle}>
            <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/20 min-h-0">
                <Tabs defaultValue="ruas" className="flex-1 flex flex-col min-h-0 gap-0">
                    <div className="bg-white dark:bg-slate-950 border-b dark:border-slate-800 px-2 py-2 shrink-0">
                        <TabsList className="w-full grid grid-cols-2 h-8">
                            <TabsTrigger value="ruas" className="text-[10px] uppercase font-bold tracking-wider">Ruas Jalan</TabsTrigger>
                            <TabsTrigger value="koordinat" className="text-[10px] uppercase font-bold tracking-wider">Koordinat</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="ruas" className="flex-1 flex flex-col min-h-0 m-0">
                        <div className="bg-white dark:bg-slate-950 border-b dark:border-slate-800 shrink-0">
                            {/* Header Controls */}
                            <div className="p-2 border-b dark:border-slate-800 space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col gap-0.5 w-28 shrink-0">
                                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Data</span>
                                        <div className="flex items-center h-6">
                                            <span className="text-sm font-bold text-primary mr-1.5">{pagination?.total || 0}</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 flex gap-2">
                                        <Select
                                            value={filters.id_kecamatan}
                                            onValueChange={(value) => {
                                                setFilters(prev => ({ ...prev, id_kecamatan: value, id_desa: "all", page: 1 }));
                                                if (onKecamatanChange) onKecamatanChange(value);
                                            }}
                                        >
                                            <SelectTrigger className="w-full h-8 text-[10px] font-bold uppercase tracking-tight">
                                                <SelectValue placeholder="Kecamatan" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Kecamatan</SelectItem>
                                                {kecamatanOptions}
                                            </SelectContent>
                                        </Select>

                                        <Select
                                            value={filters.limit.toString()}
                                            onValueChange={(value) => setFilters(prev => ({ ...prev, limit: parseInt(value), page: 1 }))}
                                        >
                                            <SelectTrigger className="w-[70px] h-8 text-xs">
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

                            {/* Search & Clear Filter Indicator */}
                            <div className="p-2 flex gap-2">
                                <div className="relative flex-1">
                                    <Search className={cn(
                                        "absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-colors",
                                        loading ? "text-emerald-500 animate-pulse" : "text-slate-400"
                                    )} />
                                    <Input
                                        placeholder="Cari ruas jalan..."
                                        className="pl-8 h-8 text-base md:text-[10px] bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-950 transition-all rounded-lg pr-7 dark:text-slate-100"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                    {search && (
                                        <button
                                            onClick={() => setSearch("")}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                                {(filters.id_kecamatan !== "all" || filters.id_desa !== "all") && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setFilters(prev => ({ ...prev, id_kecamatan: "all", id_desa: "all", page: 1 }));
                                            if (onKecamatanChange) onKecamatanChange("all");
                                            if (onDesaChange) onDesaChange("all");
                                        }}
                                        className="h-8 px-2 text-[9px] cursor-pointer font-bold uppercase tracking-tighter text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg flex items-center shrink-0 border border-rose-200/50 dark:border-rose-900/30"
                                    >
                                        <X className="h-3 w-3 mr-1" />
                                        Clear Filter
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden min-h-0 bg-slate-50/50 dark:bg-slate-950/10">
                            <ScrollArea className="h-full">
                                <div className="p-2 space-y-2">
                                    <MonitoringList
                                        data={roads}
                                        isLoading={loading}
                                        onSelectJalan={useCallback((id: string) => {
                                            const road = roads.find(r => r.jalan.id === id);
                                            if (road) onSelectRoad(road);
                                        }, [roads, onSelectRoad])}
                                        selectedId={selectedRoad?.jalan.id}
                                        checkedIds={checkedRoadIds}
                                        onToggleCheck={onToggleCheckRoad}
                                    />
                                </div>
                            </ScrollArea>
                        </div>
                    </TabsContent>

                    <TabsContent value="koordinat" className="flex-1 flex flex-col min-h-0 m-0">
                        <div className="p-2 flex-1 bg-slate-50/30 dark:bg-slate-950/30">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Paste Lat Long</label>
                                    <div className="relative group">
                                        <div className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors z-10">
                                            <MapPin className="h-4 w-4" />
                                        </div>
                                        <Textarea
                                            placeholder="Contoh: -7.22, 111.83 (enter) -7.23, 111.84"
                                            className="pl-10 h-32 text-base md:text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-400 dark:focus:border-blue-600 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all rounded-xl shadow-sm resize-none py-3 overflow-y-auto dark:text-slate-100"
                                            value={coordSearch}
                                            onChange={(e) => setCoordSearch(e.target.value)}
                                        />
                                        {coordSearch && (
                                            <button
                                                onClick={() => setCoordSearch("")}
                                                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-slate-100 transition-colors z-10"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 italic px-1">Gunakan format: Lat, Long (satu koordinat per baris)</p>
                                </div>

                                <Button
                                    className="w-full h-10 rounded-xl bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 shadow-lg shadow-blue-200 dark:shadow-blue-900/40 font-bold text-xs uppercase tracking-widest text-white transition-all active:scale-95"
                                    onClick={handleLocateCoordinate}
                                    disabled={!coordSearch}
                                >
                                    CARI LOKASI
                                </Button>

                                <div className="space-y-3">
                                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30">
                                        <h5 className="text-[12px] font-bold text-blue-700 dark:text-blue-400 uppercase mb-1 tracking-tight">Pencarian Koordinat</h5>
                                        <p className="text-[10px] text-blue-600 dark:text-blue-400 leading-relaxed opacity-80">
                                            Fitur ini memungkinkan Anda untuk langsung menuju titik tertentu di peta dengan koordinat GPS.
                                            Marker akan muncul untuk menandai lokasi tersebut.
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                        <h5 className="text-[12px] font-bold text-slate-700 dark:text-slate-200 uppercase mb-1 tracking-tight">Tip</h5>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                            Anda bisa mendapatkan koordinat dengan cara klik kiri di mana saja pada peta.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Footer Pagination & Refresh */}
                <div className="sticky bottom-0 left-0 right-0 bg-background/95 dark:bg-slate-950/95 backdrop-blur-sm border-t dark:border-slate-800 p-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 flex items-center gap-1 shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-emerald-600 shrink-0"
                        onClick={() => onRefresh ? onRefresh() : fetchRoads()}
                        disabled={loading}
                    >
                        <RotateCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                    <div className="flex-1">
                        {!loading && pagination && pagination.totalPages > 1 && (
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }));
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
                                                setFilters(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }));
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
    );
}
