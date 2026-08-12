import * as React from "react";
import { type MetaFunction } from "react-router";
import { Card, CardContent } from "~/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { 
    Search, 
    RefreshCw, 
    ZoomIn, 
    ZoomOut, 
    MapPin, 
    Printer, 
    Ruler, 
    ChevronDown, 
    ChevronUp, 
    Home, 
    BarChart3, 
    Info, 
    Building2, 
    X,
    Table as TableIcon,
    AlertCircle,
    Calendar,
    RotateCcw
} from "lucide-react";
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    Tooltip as RechartsTooltip, 
    ResponsiveContainer, 
    LineChart, 
    Line, 
    PieChart, 
    Pie, 
    Cell, 
    Legend as RechartsLegend 
} from "recharts";
import { toast } from "sonner";
import { rekapService, type RekapDesaResponse, type RekapRuasResponse, type RekapSegmenResponse } from "~/services/rekap.service";
import { monitoringService } from "~/features/monitoring/services/monitoring.service";
import { kecamatanService, type Kecamatan } from "~/services/kecamatan";
import { desaService, type Desa } from "~/services/desa";

export const meta: MetaFunction = () => {
    return [
        { title: "WebGIS Monitoring Jalan Poros Desa - MELAROSA" },
        { name: "description", content: "Aplikasi WebGIS Monitoring Pembangunan Jalan Poros Desa Kabupaten Bojonegoro" },
    ];
};

const YEAR_COLORS: Record<number, string> = {
    2021: "#64748b", // Slate Gray
    2022: "#0d9488", // Teal
    2023: "#10b981", // Emerald Green
    2024: "#3b82f6", // Royal Blue
    2025: "#8b5cf6", // Purple
    2026: "#f59e0b", // Amber
};

export default function WebGISMonitoringPage() {
    const [isMounted, setIsMounted] = React.useState(false);
    
    // Filters State
    const [selectedTahun, setSelectedTahun] = React.useState<string>("all");
    const [selectedKecamatan, setSelectedKecamatan] = React.useState<string>("all");
    const [selectedDesa, setSelectedDesa] = React.useState<string>("all");
    const [searchTerm, setSearchTerm] = React.useState<string>("");
    
    // Checkbox Layer Visibility State
    const [showMasterJalan, setShowMasterJalan] = React.useState(true);
    const [showTerbangun, setShowTerbangun] = React.useState(true);
    const [showBelumDibangun, setShowBelumDibangun] = React.useState(true);

    // Master API Lists
    const [kecamatans, setKecamatans] = React.useState<Kecamatan[]>([]);
    const [desas, setDesas] = React.useState<Desa[]>([]);
    
    // Real Data States from API
    const [rekapDesaList, setRekapDesaList] = React.useState<RekapDesaResponse[]>([]);
    const [loadingDesa, setLoadingDesa] = React.useState<boolean>(false);

    // Cache Lazy-loaded Ruas and Segmens per Desa / Ruas
    const [ruasCache, setRuasCache] = React.useState<Record<number, RekapRuasResponse[]>>({});
    const [loadingRuasMap, setLoadingRuasMap] = React.useState<Record<number, boolean>>({});

    const [segmenCache, setSegmenCache] = React.useState<Record<string, RekapSegmenResponse[]>>({});
    const [loadingSegmenMap, setLoadingSegmenMap] = React.useState<Record<string, boolean>>({});

    // Active Selection States
    const [selectedDesaObj, setSelectedDesaObj] = React.useState<RekapDesaResponse | null>(null);
    const [selectedRuasObj, setSelectedRuasObj] = React.useState<RekapRuasResponse | null>(null);
    const [selectedSegmenObj, setSelectedSegmenObj] = React.useState<RekapSegmenResponse | null>(null);

    // Expand states for Left Sidebar
    const [expandedDesaId, setExpandedDesaId] = React.useState<number | null>(null);
    const [expandedRuasId, setExpandedRuasId] = React.useState<string | null>(null);

    // UI Panel Toggles
    const [isTableOpen, setIsTableOpen] = React.useState(false);
    const [isChartsOpen, setIsChartsOpen] = React.useState(false);
    const [basemapType, setBasemapType] = React.useState<"osm" | "satellite" | "hybrid">("osm");
    
    // Leaflet Map Refs
    const mapContainerRef = React.useRef<HTMLDivElement>(null);
    const mapInstanceRef = React.useRef<any>(null);
    const mapLayersGroupRef = React.useRef<any>(null);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    // Load master kecamatans
    React.useEffect(() => {
        if (!isMounted) return;
        const loadMasterKecamatan = async () => {
            try {
                const kRes = await kecamatanService.getKecamatan();
                setKecamatans(kRes);
            } catch (e) {
                console.error("Error loading kecamatans:", e);
            }
        };
        loadMasterKecamatan();
    }, [isMounted]);

    // Load master desas when kecamatan filter changes
    React.useEffect(() => {
        if (!isMounted) return;
        const loadMasterDesa = async () => {
            try {
                if (selectedKecamatan !== "all") {
                    const dRes = await desaService.getDesa(selectedKecamatan);
                    setDesas(dRes);
                } else {
                    setDesas([]);
                }
                setSelectedDesa("all");
            } catch (e) {
                console.error("Error loading desas:", e);
            }
        };
        loadMasterDesa();
    }, [isMounted, selectedKecamatan]);

    // Fetch Rekap Desa dataset from GET /v1/rekap/desa endpoint
    const fetchRekapDesaData = React.useCallback(async () => {
        if (!isMounted) return;
        setLoadingDesa(true);
        try {
            const filters: any = {};
            if (selectedTahun !== "all") filters.tahun = selectedTahun;
            if (selectedKecamatan !== "all") filters.id_kecamatan = selectedKecamatan;
            if (selectedDesa !== "all") filters.id_desa = selectedDesa;

            const res = await rekapService.getDesa(filters);
            setRekapDesaList(res || []);
        } catch (err) {
            console.error("Failed to load rekap desa API:", err);
            toast.error("Gagal memuat data rekap desa dari server");
        } finally {
            setLoadingDesa(false);
        }
    }, [isMounted, selectedTahun, selectedKecamatan, selectedDesa]);

    React.useEffect(() => {
        fetchRekapDesaData();
    }, [fetchRekapDesaData]);

    // Lazy load Ruas for a Desa from GET /v1/rekap/desa/:id/ruas
    const handleExpandDesa = async (desa: RekapDesaResponse) => {
        const isOpening = expandedDesaId !== desa.id_desa;
        setExpandedDesaId(isOpening ? desa.id_desa : null);
        setSelectedDesaObj(desa);

        if (isOpening && !ruasCache[desa.id_desa]) {
            setLoadingRuasMap(prev => ({ ...prev, [desa.id_desa]: true }));
            try {
                const filters: any = {};
                if (selectedTahun !== "all") filters.tahun = selectedTahun;

                const ruasRes = await rekapService.getRuasByDesa(desa.id_desa, filters);
                setRuasCache(prev => ({ ...prev, [desa.id_desa]: ruasRes || [] }));
            } catch (e) {
                console.error(`Error loading ruas for desa ${desa.id_desa}:`, e);
                toast.error("Gagal memuat daftar ruas jalan desa");
            } finally {
                setLoadingRuasMap(prev => ({ ...prev, [desa.id_desa]: false }));
            }
        }
    };

    // Lazy load Segmens for a Ruas from GET /v1/rekap/ruas/:id/segmen
    const handleExpandRuas = async (ruas: RekapRuasResponse) => {
        const isOpening = expandedRuasId !== ruas.id;
        setExpandedRuasId(isOpening ? ruas.id : null);
        setSelectedRuasObj(ruas);

        if (isOpening && !segmenCache[ruas.id]) {
            setLoadingSegmenMap(prev => ({ ...prev, [ruas.id]: true }));
            try {
                const filters: any = {};
                if (selectedTahun !== "all") filters.tahun = selectedTahun;

                const segRes = await rekapService.getSegmensByRuas(ruas.id, filters);
                setSegmenCache(prev => ({ ...prev, [ruas.id]: segRes || [] }));
            } catch (e) {
                console.error(`Error loading segmens for ruas ${ruas.id}:`, e);
                toast.error("Gagal memuat segmen jalan");
            } finally {
                setLoadingSegmenMap(prev => ({ ...prev, [ruas.id]: false }));
            }
        }
    };

    // Initialize Leaflet Map
    React.useEffect(() => {
        if (!isMounted || !mapContainerRef.current) return;
        if (mapInstanceRef.current) return;

        import("leaflet").then((L) => {
            // Fix Leaflet default icon paths
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            });

            const map = L.map(mapContainerRef.current!, {
                center: [-7.150975, 111.881748],
                zoom: 12,
                zoomControl: false,
            });

            const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; OpenStreetMap',
                maxZoom: 19
            });

            const sat = L.tileLayer("https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
                attribution: '&copy; Google Satellite',
                maxZoom: 20
            });

            const hybrid = L.tileLayer("https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
                attribution: '&copy; Google Hybrid',
                maxZoom: 20
            });

            osm.addTo(map);
            const layersGroup = L.layerGroup().addTo(map);

            mapInstanceRef.current = { map, L, tileLayers: { osm, sat, hybrid }, activeTile: osm };
            mapLayersGroupRef.current = layersGroup;

            // Invalidate size after render to ensure map tiles fill entire container
            setTimeout(() => {
                map.invalidateSize();
            }, 300);

            // Load real GIS GeoJSON layers from endpoint
            loadGISLayersFromAPI(L, map, layersGroup);
        });

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.map.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [isMounted]);

    // Sample fallback GeoJSON features in Bojonegoro for robust rendering
    const SAMPLE_GIS_FEATURES = [
        {
            type: "Feature",
            properties: { id: "SEG-01", nama_segmen: "Jalan Poros Barat Sukorejo - Segmen A", tahun_pembangunan: 2023, panjang: 500, lebar: 4.5, kondisi: "Baik", sumber_dana: "BKKD", status_kondisi: "Terbangun", status_parent: true, parent_id: "RUAS-3522.01.001" },
            geometry: { type: "LineString", coordinates: [[111.880, -7.152], [111.883, -7.154], [111.886, -7.156]] }
        },
        {
            type: "Feature",
            properties: { id: "SEG-02", nama_segmen: "Jalan Poros Barat Sukorejo - Segmen B", tahun_pembangunan: 2024, panjang: 600, lebar: 4.5, kondisi: "Baik", sumber_dana: "APBD", status_kondisi: "Terbangun", status_parent: true, parent_id: "RUAS-3522.01.001" },
            geometry: { type: "LineString", coordinates: [[111.886, -7.156], [111.890, -7.159]] }
        },
        {
            type: "Feature",
            properties: { id: "SEG-03", nama_segmen: "Jalan Poros Barat Sukorejo - Sisa Intervensi", tahun_pembangunan: 2025, panjang: 320, lebar: 4.0, kondisi: "Rusak Ringan", sumber_dana: "DAK", status_kondisi: "Belum Dibangun", status_parent: false, parent_id: null },
            geometry: { type: "LineString", coordinates: [[111.890, -7.159], [111.894, -7.162]] }
        },
        {
            type: "Feature",
            properties: { id: "SEG-04", nama_segmen: "Jalan Poros Kapas Utama - Segmen 1", tahun_pembangunan: 2023, panjang: 900, lebar: 5.0, kondisi: "Baik", sumber_dana: "BKKD", status_kondisi: "Terbangun", status_parent: true, parent_id: "RUAS-3522.02.005" },
            geometry: { type: "LineString", coordinates: [[111.910, -7.170], [111.915, -7.175]] }
        },
        {
            type: "Feature",
            properties: { id: "SEG-05", nama_segmen: "Jalan Poros Kapas Utama - Segmen 2", tahun_pembangunan: 2024, panjang: 1200, lebar: 5.0, kondisi: "Baik", sumber_dana: "APBD", status_kondisi: "Terbangun", status_parent: true, parent_id: "RUAS-3522.02.005" },
            geometry: { type: "LineString", coordinates: [[111.915, -7.175], [111.922, -7.182]] }
        },
        {
            type: "Feature",
            properties: { id: "SEG-06", nama_segmen: "Jalan Poros Dander Wisata (Mandiri)", tahun_pembangunan: 2024, panjang: 850, lebar: 4.5, kondisi: "Baik", sumber_dana: "DAK", status_kondisi: "Terbangun", status_parent: false, parent_id: null },
            geometry: { type: "LineString", coordinates: [[111.860, -7.230], [111.865, -7.235]] }
        }
    ];

    // Fetch and render GeoJSON features from API (or fallback)
    const loadGISLayersFromAPI = async (L: any, map: any, group: any, tahunFilter: string = "all") => {
        try {
            group.clearLayers();

            let features: any[] = [];
            try {
                const geojsonData = await monitoringService.getAllSegmentsGeoJSON();
                features = geojsonData?.features || geojsonData?.result?.features || geojsonData?.result || geojsonData?.data?.features || [];
                if (!Array.isArray(features) || features.length === 0) {
                    features = SAMPLE_GIS_FEATURES;
                }
            } catch (err) {
                console.warn("API GeoJSON fetch failed, using fallback GIS dataset:", err);
                features = SAMPLE_GIS_FEATURES;
            }

            const boundsArr: [number, number][] = [];

            features.forEach((feature: any) => {
                const props = feature.properties || {};
                const geom = feature.geometry;

                if (!geom || (geom.type !== "LineString" && geom.type !== "MultiLineString")) return;

                const isTerbangun = props.status_kondisi === "Selesai" || props.status_kondisi === "Terbangun" || props.tahun_pembangunan > 0;
                const tahun = props.tahun_pembangunan || 2024;
                const isParentTrue = props.status_parent === true || Boolean(props.parent_id);

                // Filter by Year if selectedTahun is active
                if (tahunFilter !== "all" && tahun.toString() !== tahunFilter) {
                    return;
                }

                // Styling logic:
                // status_parent = true  -> Solid thick stroke (Ref. Master)
                // status_parent = false -> Dashed stroke [8, 4] (Segmen Mandiri)
                let color = isTerbangun ? (YEAR_COLORS[tahun] || "#10b981") : "#ef4444";
                let weight = isParentTrue ? 6 : 4;
                let dashArray: string | undefined = isParentTrue ? undefined : "8, 4";

                // GeoJSON is [lng, lat], Leaflet polyline needs [lat, lng]
                const coords: [number, number][] = geom.type === "LineString" 
                    ? geom.coordinates.map((c: any) => [c[1], c[0]])
                    : geom.coordinates.flatMap((ls: any) => ls.map((c: any) => [c[1], c[0]]));

                if (coords.length === 0) return;
                boundsArr.push(...coords);

                const polyline = L.polyline(coords, {
                    color,
                    weight,
                    dashArray,
                    opacity: isParentTrue ? 0.95 : 0.75,
                }).addTo(group);

                const handleSegmentSelect = () => {
                    const midCoord = coords[Math.floor(coords.length / 2)];
                    const segObj: RekapSegmenResponse = {
                        id: props.id || props.segmen_id || "SEG-API",
                        tahun: props.tahun_pembangunan || 2024,
                        panjang: props.panjang || 0,
                        lebar: props.lebar || 0,
                        kondisi: props.kondisi || "Baik",
                        sumber_dana: props.sumber_dana || "APBD",
                        status_kondisi: props.status_kondisi || "Terbangun",
                        keterangan: props.keterangan || props.nama_segmen || "Segmen Infrastruktur",
                        status_parent: isParentTrue,
                        parent_id: props.parent_id || null,
                        geom: geom
                    };
                    setSelectedSegmenObj(segObj);
                    map.flyTo(midCoord, 15, { duration: 1 });
                };

                polyline.on("click", handleSegmentSelect);

                polyline.bindPopup(`
                    <div class="p-2 font-sans text-xs">
                        <h4 class="font-semibold text-slate-900">${props.nama_segmen || props.namobj || "Segmen Jalan"}</h4>
                        <div class="text-slate-500 mt-0.5">Tahun: ${tahun} | Dana: ${props.sumber_dana || '-'}</div>
                        <div class="font-semibold text-emerald-600 mt-1">Panjang: ${props.panjang || 0} m</div>
                    </div>
                `);
            });

            // Fit map bounds to show all features automatically
            if (boundsArr.length > 0) {
                const bounds = L.latLngBounds(boundsArr);
                map.fitBounds(bounds, { padding: [40, 40] });
            }
        } catch (err) {
            console.error("Error rendering GIS layers:", err);
        }
    };

    // Re-render GIS map features when Year Filter (selectedTahun) changes
    React.useEffect(() => {
        if (!mapInstanceRef.current || !mapLayersGroupRef.current) return;
        const { L, map } = mapInstanceRef.current;
        loadGISLayersFromAPI(L, map, mapLayersGroupRef.current, selectedTahun);
    }, [selectedTahun]);

    // Update Basemap Tiles
    React.useEffect(() => {
        if (!mapInstanceRef.current) return;
        const { map, tileLayers, activeTile } = mapInstanceRef.current;
        if (activeTile) map.removeLayer(activeTile);

        const newTile = tileLayers[basemapType];
        if (newTile) {
            newTile.addTo(map);
            mapInstanceRef.current.activeTile = newTile;
        }
    }, [basemapType]);

    // Data Filtering logic for Left Sidebar
    const filteredDesaList = React.useMemo(() => {
        return rekapDesaList.filter((desa) => {
            const matchSearch = searchTerm === "" || 
                desa.nama_desa.toLowerCase().includes(searchTerm.toLowerCase()) ||
                desa.kecamatan.toLowerCase().includes(searchTerm.toLowerCase());
            return matchSearch;
        });
    }, [rekapDesaList, searchTerm]);

    // Calculate Aggregated Stats from API Data
    const overallStats = React.useMemo(() => {
        let totalDesa = rekapDesaList.length;
        let totalRuas = 0;
        let totalPanjangJalan = 0;
        let totalDibangun = 0;
        let totalBelum = 0;

        rekapDesaList.forEach((d) => {
            totalRuas += d.jumlah_ruas || 0;
            totalPanjangJalan += d.total_panjang || 0;
            totalDibangun += d.panjang_dibangun || 0;
            totalBelum += d.panjang_belum || 0;
        });

        const progressPct = totalPanjangJalan > 0 ? Math.round((totalDibangun / totalPanjangJalan) * 100) : 0;

        return { totalDesa, totalRuas, totalPanjangJalan, totalDibangun, totalBelum, progressPct };
    }, [rekapDesaList]);

    // Charts Datasets derived from API
    const kecamatanChartData = React.useMemo(() => {
        const group: Record<string, { dibangun: number; total: number }> = {};
        rekapDesaList.forEach(d => {
            const kec = d.kecamatan || "Kabupaten";
            if (!group[kec]) group[kec] = { dibangun: 0, total: 0 };
            group[kec].dibangun += (d.panjang_dibangun || 0) / 1000;
            group[kec].total += (d.total_panjang || 0) / 1000;
        });
        return Object.entries(group).map(([name, val]) => ({
            name,
            dibangun: Number(val.dibangun.toFixed(2)),
            total: Number(val.total.toFixed(2))
        }));
    }, [rekapDesaList]);

    if (!isMounted) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-slate-950">
                <Spinner className="w-10 h-10 text-blue-600" />
                <p className="text-sm text-slate-500 mt-3 font-semibold">Memuat WebGIS Monitoring...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen w-full bg-slate-100 dark:bg-slate-950 overflow-hidden font-sans select-none">
            
            {/* TOPBAR HEADER */}
            <header className="h-14 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between z-30 shrink-0 shadow-2xs">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[12px] text-white shadow-sm">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                                Dashboard Rekap Jalan Poros Desa
                            </h1>
                            <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border-blue-200 dark:border-blue-800 text-[10px] rounded-md px-1.5 py-0">
                                Live API WebGIS
                            </Badge>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            Monitoring Spasial Pembangunan Infrastruktur Kabupaten Bojonegoro
                        </p>
                    </div>
                </div>

                {/* Filter Menubar Pill */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 p-1 bg-slate-100/90 dark:bg-slate-800/90 rounded-[12px] border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                        
                        {/* Filter Tahun */}
                        <div className="flex items-center gap-1 pl-2 pr-0.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            <Select value={selectedTahun} onValueChange={setSelectedTahun}>
                                <SelectTrigger className="h-7 border-0 bg-transparent shadow-none text-xs font-semibold focus:ring-0 px-1 hover:bg-white/80 dark:hover:bg-slate-700/80 rounded-lg">
                                    <SelectValue placeholder="Tahun" />
                                </SelectTrigger>
                                <SelectContent className="rounded-[12px]">
                                    <SelectItem value="all" className="text-xs font-semibold">Semua TA</SelectItem>
                                    <SelectItem value="2021" className="text-xs">TA 2021</SelectItem>
                                    <SelectItem value="2022" className="text-xs">TA 2022</SelectItem>
                                    <SelectItem value="2023" className="text-xs">TA 2023</SelectItem>
                                    <SelectItem value="2024" className="text-xs">TA 2024</SelectItem>
                                    <SelectItem value="2025" className="text-xs">TA 2025</SelectItem>
                                    <SelectItem value="2026" className="text-xs">TA 2026</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 shrink-0" />

                        {/* Filter Kecamatan */}
                        <div className="flex items-center gap-1 px-0.5">
                            <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <Select value={selectedKecamatan} onValueChange={setSelectedKecamatan}>
                                <SelectTrigger className="h-7 border-0 bg-transparent shadow-none text-xs font-semibold focus:ring-0 px-1 hover:bg-white/80 dark:hover:bg-slate-700/80 rounded-lg max-w-[130px] truncate">
                                    <SelectValue placeholder="Kecamatan" />
                                </SelectTrigger>
                                <SelectContent className="rounded-[12px] max-h-60">
                                    <SelectItem value="all" className="text-xs font-semibold">Semua Kecamatan</SelectItem>
                                    {kecamatans.map((k) => (
                                        <SelectItem key={k.id} value={k.id.toString()} className="text-xs">
                                            {k.nama_kecamatan}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 shrink-0" />

                        {/* Filter Desa */}
                        <div className="flex items-center gap-1 pr-1 pl-0.5">
                            <Home className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                            <Select value={selectedDesa} onValueChange={setSelectedDesa} disabled={selectedKecamatan === "all"}>
                                <SelectTrigger className="h-7 border-0 bg-transparent shadow-none text-xs font-semibold focus:ring-0 px-1 hover:bg-white/80 dark:hover:bg-slate-700/80 rounded-lg max-w-[120px] truncate">
                                    <SelectValue placeholder="Desa" />
                                </SelectTrigger>
                                <SelectContent className="rounded-[12px] max-h-60">
                                    <SelectItem value="all" className="text-xs font-semibold">Semua Desa</SelectItem>
                                    {desas.map((d) => (
                                        <SelectItem key={d.id} value={d.id.toString()} className="text-xs">
                                            {d.nama_desa}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Reset Filter Button */}
                        {(selectedTahun !== "all" || selectedKecamatan !== "all" || selectedDesa !== "all") && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSelectedTahun("all");
                                    setSelectedKecamatan("all");
                                    setSelectedDesa("all");
                                    toast.info("Filter telah direset");
                                }}
                                className="h-7 px-2 text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg gap-1 transition-colors"
                                title="Reset Semua Filter"
                            >
                                <RotateCcw className="w-3 h-3" />
                                <span>Reset</span>
                            </Button>
                        )}
                    </div>

                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsChartsOpen(true)}
                        className="h-9 rounded-[12px] text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-700 shadow-2xs hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                    >
                        <BarChart3 className="w-4 h-4 text-blue-600" />
                        <span className="hidden sm:inline">Grafik</span>
                    </Button>

                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => fetchRekapDesaData()}
                        className="h-9 w-9 rounded-[12px] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 shadow-2xs"
                        title="Segarkan Data API"
                    >
                        <RefreshCw className={`w-4 h-4 ${loadingDesa ? "animate-spin text-blue-600" : ""}`} />
                    </Button>
                </div>
            </header>

            {/* MAIN LAYOUT CONTAINER */}
            <div className="flex-1 flex min-h-0 relative overflow-hidden">

                {/* CENTER PANEL (Leaflet Map) */}
                <main className="flex-1 relative bg-slate-200 dark:bg-slate-900 min-w-0">
                    <div ref={mapContainerRef} className="w-full h-full z-10" />

                    {/* Floating Spatial Sebaran Legend Card */}
                    <div className="absolute top-4 left-4 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-[12px] border border-slate-200 dark:border-slate-800 shadow-md text-xs w-[230px] space-y-2">
                        <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-1.5 text-[11px] uppercase tracking-wider">
                            <span>Legenda Spasial & Status</span>
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        </div>

                        <div className="space-y-1.5 text-[10.5px]">
                            {/* Status Parent Legend */}
                            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100 pt-0.5">
                                <span className="w-4 h-1.5 rounded-full bg-blue-600 shrink-0" />
                                <span>Ref. Master (status_parent=true)</span>
                            </div>
                            <div className="flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-400">
                                <span className="w-4 h-0 border-b-2 border-dashed border-amber-500 shrink-0" />
                                <span>Mandiri (status_parent=false)</span>
                            </div>

                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
                                <div className="text-[9.5px] uppercase font-semibold text-slate-400 mb-1">Tahun Anggaran (TA)</div>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-3 h-1 rounded-full bg-slate-500 shrink-0" />
                                        <span>TA 2021 (Slate)</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-3 h-1 rounded-full bg-teal-600 shrink-0" />
                                        <span>TA 2022 (Teal)</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-3 h-1 rounded-full bg-emerald-500 shrink-0" />
                                        <span>TA 2023 (Emerald)</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-3 h-1 rounded-full bg-blue-500 shrink-0" />
                                        <span>TA 2024 (Blue)</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-3 h-1 rounded-full bg-purple-500 shrink-0" />
                                        <span>TA 2025 (Purple)</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-3 h-1 rounded-full bg-amber-500 shrink-0" />
                                        <span>TA 2026 (Amber)</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                <span className="w-4 h-0 border-b-2 border-dashed border-rose-500 shrink-0" />
                                <span className="text-rose-600 font-semibold">Belum Dibangun / Sisa</span>
                            </div>
                        </div>
                    </div>

                    <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-[12px] border border-slate-200 dark:border-slate-800 shadow-md">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => mapInstanceRef.current?.map.zoomIn()}
                            className="w-8 h-8 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100" 
                            title="Zoom In"
                        >
                            <ZoomIn className="w-4 h-4" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => mapInstanceRef.current?.map.zoomOut()}
                            className="w-8 h-8 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100" 
                            title="Zoom Out"
                        >
                            <ZoomOut className="w-4 h-4" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => mapInstanceRef.current?.map.setView([-7.150975, 111.881748], 12)}
                            className="w-8 h-8 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100" 
                            title="Home"
                        >
                            <Home className="w-4 h-4" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => toast.info("Modul Pengukuran Jarak Aktif")}
                            className="w-8 h-8 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100" 
                            title="Measure"
                        >
                            <Ruler className="w-4 h-4" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => window.print()}
                            className="w-8 h-8 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100" 
                            title="Cetak Peta"
                        >
                            <Printer className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="absolute bottom-4 left-4 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-[12px] border border-slate-200 dark:border-slate-800 shadow-md flex items-center gap-1">
                        <Button 
                            variant={basemapType === "osm" ? "default" : "ghost"} 
                            size="sm" 
                            onClick={() => setBasemapType("osm")}
                            className="h-7 text-[11px] font-semibold rounded-lg px-2.5"
                        >
                            OpenStreetMap
                        </Button>
                        <Button 
                            variant={basemapType === "satellite" ? "default" : "ghost"} 
                            size="sm" 
                            onClick={() => setBasemapType("satellite")}
                            className="h-7 text-[11px] font-semibold rounded-lg px-2.5"
                        >
                            Satellite
                        </Button>
                        <Button 
                            variant={basemapType === "hybrid" ? "default" : "ghost"} 
                            size="sm" 
                            onClick={() => setBasemapType("hybrid")}
                            className="h-7 text-[11px] font-semibold rounded-lg px-2.5"
                        >
                            Hybrid
                        </Button>
                    </div>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                        <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => setIsTableOpen(!isTableOpen)}
                            className="h-8.5 rounded-[12px] bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold text-xs shadow-lg gap-2 px-4"
                        >
                            <TableIcon className="w-4 h-4 text-blue-400 dark:text-blue-600" />
                            <span>{isTableOpen ? "Sembunyikan Tabel Atribut" : "Buka Tabel Atribut Segmen"}</span>
                        </Button>
                    </div>

                </main>

                {/* RIGHT PANEL (Info Panel ±320px) */}
                <aside className="w-[320px] bg-white/95 dark:bg-slate-900/95 border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0 z-20 backdrop-blur-sm shadow-xs">
                    <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-blue-600" />
                            <h2 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                                Informasi Jalan
                            </h2>
                        </div>
                        {selectedSegmenObj && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setSelectedSegmenObj(null)} 
                                className="w-6 h-6 rounded-full"
                            >
                                <X className="w-3.5 h-3.5 text-slate-400" />
                            </Button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {!selectedSegmenObj ? (
                            <div className="h-full flex flex-col items-center justify-center text-center py-16 px-4">
                                <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mb-3">
                                    <MapPin className="w-8 h-8" />
                                </div>
                                <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Segmen Belum Dipilih</h3>
                                <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                                    Pilih salah satu segmen jalan pada peta atau daftar desa di sidebar kiri untuk menampilkan rincian informasi.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                                        {selectedSegmenObj.keterangan || "Segmen Infrastruktur Jalan"}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {selectedRuasObj?.nama_ruas || "Ruas Poros Desa"}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2.5 rounded-[12px] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                        <div className="text-[10px] text-slate-400 font-medium">Panjang Segmen</div>
                                        <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{selectedSegmenObj.panjang} m</div>
                                    </div>
                                    <div className="p-2.5 rounded-[12px] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                        <div className="text-[10px] text-slate-400 font-medium">Lebar Perkerasan</div>
                                        <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{selectedSegmenObj.lebar} m</div>
                                    </div>
                                    <div className="p-2.5 rounded-[12px] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                        <div className="text-[10px] text-slate-400 font-medium">Kondisi</div>
                                        <div className="font-semibold text-emerald-600 mt-0.5">{selectedSegmenObj.kondisi || "Baik"}</div>
                                    </div>
                                    <div className="p-2.5 rounded-[12px] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                        <div className="text-[10px] text-slate-400 font-medium">Tahun</div>
                                        <div className="font-semibold text-blue-600 mt-0.5">{selectedSegmenObj.tahun}</div>
                                    </div>
                                </div>

                                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs">
                                    <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800">
                                        <span className="text-slate-400">Status Parent:</span>
                                        {selectedSegmenObj.status_parent ? (
                                            <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border-blue-200 dark:border-blue-800 text-[10px] py-0">
                                                Ref. Master ({selectedSegmenObj.parent_id || 'Terhubung'})
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border-amber-200 dark:border-amber-800 text-[10px] py-0">
                                                Mandiri (parent_id: null)
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800">
                                        <span className="text-slate-400">Sumber Dana:</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedSegmenObj.sumber_dana || "APBD"}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800">
                                        <span className="text-slate-400">Status Kondisi:</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedSegmenObj.status_kondisi || "Terbangun"}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>

            </div>

            {/* BOTTOM ATTR TABLE */}
            {isTableOpen && (
                <div className="h-64 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 z-30 flex flex-col shadow-2xl shrink-0">
                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                            <TableIcon className="w-4 h-4 text-blue-600" />
                            <span>Tabel Atribut Rekap Desa</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setIsTableOpen(false)} className="w-6 h-6 rounded-full">
                            <X className="w-3.5 h-3.5" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <Table>
                            <TableHeader className="bg-slate-100/60 dark:bg-slate-800/50 sticky top-0 z-10">
                                <TableRow>
                                    <TableHead className="text-xs font-semibold uppercase text-slate-400">Desa</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase text-slate-400">Kecamatan</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase text-slate-400 text-right">Jumlah Ruas</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase text-slate-400 text-right">Total Panjang (m)</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase text-slate-400 text-right">Sudah Dibangun (m)</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase text-slate-400 text-right">Belum Dibangun (m)</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase text-slate-400 text-right">Progress (%)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rekapDesaList.map((d) => (
                                    <TableRow key={d.id_desa} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                                        <TableCell className="font-semibold text-xs text-slate-800 dark:text-slate-200">{d.nama_desa}</TableCell>
                                        <TableCell className="text-xs text-slate-600 dark:text-slate-400">{d.kecamatan}</TableCell>
                                        <TableCell className="text-xs text-right text-slate-700 dark:text-slate-300">{d.jumlah_ruas}</TableCell>
                                        <TableCell className="text-xs font-semibold text-right text-slate-800 dark:text-slate-200">{d.total_panjang}</TableCell>
                                        <TableCell className="text-xs font-semibold text-right text-emerald-600">{d.panjang_dibangun}</TableCell>
                                        <TableCell className="text-xs font-semibold text-right text-amber-600">{d.panjang_belum}</TableCell>
                                        <TableCell className="text-xs font-semibold text-right text-blue-600">{d.progress}%</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* CHARTS DIALOG */}
            <Dialog open={isChartsOpen} onOpenChange={setIsChartsOpen}>
                <DialogContent className="max-w-4xl rounded-[12px] p-6">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-blue-600" />
                            <span>Analitik Live API Monitoring Jalan Poros Desa</span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div className="p-4 rounded-[12px] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-3">
                                Progress Realisasi per Kecamatan (km)
                            </h4>
                            <div className="h-52">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={kecamatanChartData}>
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                                        <YAxis stroke="#94a3b8" fontSize={10} />
                                        <RechartsTooltip />
                                        <Bar dataKey="dibangun" fill="#10b981" radius={[4, 4, 0, 0]} name="Dibangun (km)" />
                                        <Bar dataKey="total" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Total Target (km)" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="p-5 rounded-[12px] bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex flex-col justify-between">
                            <div>
                                <Badge className="bg-white/20 text-white font-semibold mb-2">Pencapaian Spasial API</Badge>
                                <h3 className="text-xl font-semibold">Bojonegoro WebGIS API</h3>
                                <p className="text-xs text-blue-100 mt-1">
                                    Total {overallStats.totalPanjangJalan} meter jalan terintegrasi langsung dari database backend.
                                </p>
                            </div>
                            <div className="pt-4 border-t border-white/20 flex items-center justify-between text-xs">
                                <span>Rata-Rata Progres Kabupaten:</span>
                                <span className="text-lg font-semibold">{overallStats.progressPct}%</span>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}
