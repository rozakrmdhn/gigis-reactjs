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
    onCoordinateSearch
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
            <div className="flex flex-col h-full bg-slate-50/50 min-h-0">
                <Tabs defaultValue="ruas" className="flex-1 flex flex-col min-h-0 gap-0">
                    <div className="bg-white border-b px-2 py-2 shrink-0">
                        <TabsList className="w-full grid grid-cols-2 h-8">
                            <TabsTrigger value="ruas" className="text-[10px] uppercase font-bold tracking-wider">Ruas Jalan</TabsTrigger>
                            <TabsTrigger value="koordinat" className="text-[10px] uppercase font-bold tracking-wider">Koordinat</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="ruas" className="flex-1 flex flex-col min-h-0 m-0">
                        <div className="bg-white border-b shrink-0">
                            {/* Header Controls */}
                            <div className="p-2 border-b space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col gap-0.5 min-w-[70px]">
                                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Data</span>
                                        <span className="text-sm font-bold text-primary">{pagination?.total || 0}</span>
                                    </div>
                                    <div className="flex-1 flex gap-2">
                                        <Select
                                            value={filters.id_kecamatan}
                                            onValueChange={(value) => setFilters(prev => ({ ...prev, id_kecamatan: value, page: 1 }))}
                                        >
                                            <SelectTrigger className="w-full h-8 text-xs">
                                                <SelectValue placeholder="Kecamatan" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Kecamatan</SelectItem>
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

                            {/* Search */}
                            <div className="p-2 relative">
                                <Search className={cn(
                                    "absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-colors",
                                    loading ? "text-emerald-500 animate-pulse" : "text-slate-400"
                                )} />
                                <Input
                                    placeholder="Cari ruas jalan..."
                                    className="pl-8 h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-lg pr-8"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                {search && (
                                    <button
                                        onClick={() => setSearch("")}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden min-h-0 bg-slate-50/50">
                            <ScrollArea className="h-full">
                                <div className="p-2 space-y-2">
                                    <MonitoringList
                                        data={roads}
                                        isLoading={loading}
                                        onSelectJalan={(id) => {
                                            const road = roads.find(r => r.jalan.id === id);
                                            if (road) onSelectRoad(road);
                                        }}
                                        selectedId={selectedRoad?.jalan.id}
                                    />
                                </div>
                            </ScrollArea>
                        </div>
                    </TabsContent>

                    <TabsContent value="koordinat" className="flex-1 flex flex-col min-h-0 m-0">
                        <div className="p-2 flex-1 bg-slate-50/30">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Paste Lat Long</label>
                                    <div className="relative group">
                                        <div className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors z-10">
                                            <MapPin className="h-4 w-4" />
                                        </div>
                                        <Textarea
                                            placeholder="Contoh:\n-7.22, 111.83\n-7.23, 111.84"
                                            className="pl-10 h-32 text-xs bg-white border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all rounded-xl shadow-sm resize-none py-3 overflow-y-auto"
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
                                    <p className="text-[9px] text-slate-400 italic px-1">Gunakan format: Lat, Long (satu koordinat per baris)</p>
                                </div>

                                <Button
                                    className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 font-bold text-xs uppercase tracking-widest"
                                    onClick={handleLocateCoordinate}
                                    disabled={!coordSearch}
                                >
                                    CARI LOKASI
                                </Button>

                                <div className="pt-6 space-y-3">
                                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                                        <h5 className="text-[10px] font-bold text-blue-700 uppercase mb-1 tracking-tight">Pencarian Koordinat</h5>
                                        <p className="text-[10px] text-blue-600 leading-relaxed opacity-80">
                                            Fitur ini memungkinkan Anda untuk langsung menuju titik tertentu di peta dengan koordinat GPS.
                                            Marker akan muncul untuk menandai lokasi tersebut.
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-100/50 border border-slate-200">
                                        <h5 className="text-[10px] font-bold text-slate-700 uppercase mb-1 tracking-tight">Tip</h5>
                                        <p className="text-[10px] text-slate-500 leading-relaxed">
                                            Anda bisa mendapatkan koordinat dengan cara klik kiri di mana saja pada peta.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Footer Pagination & Refresh */}
                <div className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t p-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 flex items-center gap-1 shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-emerald-600 shrink-0"
                        onClick={() => fetchRoads()}
                        disabled={loading}
                    >
                        <RotateCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                    <div className="flex-1 flex justify-end">
                        {!loading && pagination && pagination.totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                    disabled={pagination.page <= 1}
                                >
                                    <span className="sr-only">Previous</span>
                                    <span aria-hidden="true">‹</span>
                                </Button>
                                <div className="text-[10px] font-medium px-2 min-w-12 text-center">
                                    {pagination.page} / {pagination.totalPages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                                    disabled={pagination.page >= pagination.totalPages}
                                >
                                    <span className="sr-only">Next</span>
                                    <span aria-hidden="true">›</span>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MonitoringSidebar>
    );
}
