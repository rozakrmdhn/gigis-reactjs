import { useState, useRef, useEffect, useMemo } from 'react';
import {
    ChevronRight,
    Database,
    Layers as LayersIcon,
    Search,
    Map as MapIcon,
    ChevronLeft,
    PanelLeftOpen,
    Filter,
    ChevronDown,
    Info,
    X,
} from 'lucide-react';
import { PublicNavbar } from "~/components/public-navbar";
import { OpenLayersMap, type OpenLayersMapRef, type MapLayerConfig } from "~/features/peta/components/OpenLayersMap";
// Removed Input import as it's no longer needed in this file
import { GeonodeDatasetPanel } from "~/features/peta/components/GeonodeDatasetPanel";
import { MapLayerControlPanel } from "~/features/peta/components/MapLayerControlPanel";
import { KecamatanDropdown } from "~/features/peta/components/KecamatanDropdown";
import { DesaDropdown } from "~/features/peta/components/DesaDropdown";
import { type Kecamatan } from "~/services/kecamatan";
import { desaService, type Desa } from "~/services/desa";
import { jalanService, type RekapDibangun } from "~/services/jalan";
import { cn } from '~/lib/utils';
import { AddressSearch } from "~/features/peta/components/AddressSearch";
import { CoordinateInput, type Marker } from "~/features/peta/components/CoordinateInput";
import { Button } from '~/components/ui/button';
import { useIsMobile } from "~/hooks/use-mobile";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetDescription,
    SheetFooter,
} from "~/components/ui/sheet";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Activity, BarChart3, CheckCircle2, Ruler, AlertCircle } from "lucide-react";
import type { MetaFunction } from "react-router";


import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "~/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { CORE_LAYER_COLORS } from '~/lib/map-config';
import { MapViewSidebar } from "~/features/peta/components/MapViewSidebar";
import { MapViewMapControls } from "~/features/peta/components/MapViewMapControls";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Spinner } from "~/components/ui/spinner";
import { SegmenMiniMap } from "~/features/peta/components/SegmenMiniMap";
import { MapPin, Navigation } from 'lucide-react';

export const meta: MetaFunction = () => {
    return [
        { title: "Map View - GIGIS Monitoring" },
        { name: "description", content: "Peta Interaktif Infrastruktur dengan Katalog Dataset Geonode" },
    ];
};

const BASEMAPS = [
    { id: 'osm', name: 'OpenStreetMap', url: 'osm', thumbnail: 'https://tile.openstreetmap.org/14/13283/8518.png' },
    { id: 'google-road', name: 'Google Maps', url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', thumbnail: 'https://mt1.google.com/vt/lyrs=m&x=13283&y=8518&z=14' },
    { id: 'google-sat', name: 'Google Satellite', url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', thumbnail: 'https://mt1.google.com/vt/lyrs=y&x=13283&y=8518&z=14' },
    { id: 'carto-light', name: 'Positron Light', url: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', thumbnail: 'https://a.basemaps.cartocdn.com/light_all/14/13283/8518.png' },
    { id: 'carto-dark', name: 'Dark Matter', url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', thumbnail: 'https://a.basemaps.cartocdn.com/dark_all/14/13283/8518.png' },
    { id: 'satellite', name: 'Esri Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', thumbnail: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/14/8518/13283' },
];

export default function MapViewPage() {
    const mapRef = useRef<OpenLayersMapRef>(null);
    const isMobile = useIsMobile();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isRekapOpen, setIsRekapOpen] = useState(false);

    // Sidebar state initialization for mobile
    useEffect(() => {
        if (isMobile) {
            setIsSidebarOpen(false);
        }
    }, [isMobile]);

    // Basemap & Legend State
    const [activeBasemap, setActiveBasemap] = useState(BASEMAPS[3]);
    const [isBasemapPanelOpen, setIsBasemapPanelOpen] = useState(false);
    const [isLegendOpen, setIsLegendOpen] = useState(false);
    const [rekapData, setRekapData] = useState<RekapDibangun | null>(null);
    const [segmentsData, setSegmentsData] = useState<any>(null);

    // Administrative Filters State
    const [selectedKecamatan, setSelectedKecamatan] = useState<Kecamatan | null>(null);
    const [selectedDesa, setSelectedDesa] = useState<Desa | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedSegmen, setSelectedSegmen] = useState<any>(null);

    // Monitoring state removed as it is no longer used in the sidebar

    // Map Layers State
    const [activeLayers, setActiveLayers] = useState<MapLayerConfig[]>([]);
    const [markers, setMarkers] = useState<Marker[]>([]);

    // Derived layer presence for Legend
    const hasSegments = useMemo(() => activeLayers.some(l => l.id.startsWith('legacy_segments_') && l.visible !== false), [activeLayers]);
    const hasAdmin = useMemo(() => activeLayers.some(l => (l.id.startsWith('batas_kecamatan_') || l.id.startsWith('legacy_desa_')) && l.visible !== false), [activeLayers]);
    const hasCatalog = useMemo(() => activeLayers.some(l => l.id.startsWith('geonode-') && l.visible !== false), [activeLayers]);
    const hasMainRoads = true; // Always there for now or check map ref

    // Derived info for the panels
    const activeLayerIds = useMemo(() => activeLayers.map(l => l.id), [activeLayers]);

    // Handlers
    const handleAddLayer = (newLayer: MapLayerConfig) => {
        setActiveLayers(prev => {
            const next = [newLayer, ...prev];
            return next.map((l, i) => ({
                ...l,
                zIndex: 100 + (next.length - i) * 10
            }));
        });
    };

    const handleRemoveLayer = (id: string) => {
        setActiveLayers(prev => prev.filter(l => l.id !== id));
    };

    const handleReorderLayers = (newOrder: MapLayerConfig[]) => {
        const updated = newOrder.map((layer, index) => ({
            ...layer,
            zIndex: 100 + (newOrder.length - index) * 10
        }));
        setActiveLayers(updated);
    };

    const handleToggleVisibility = (id: string) => {
        setActiveLayers(prev => prev.map(l =>
            l.id === id ? { ...l, visible: l.visible === false } : l
        ));
    };

    const handleOpacityChange = (id: string, opacity: number) => {
        setActiveLayers(prev => prev.map(l =>
            l.id === id ? { ...l, opacity } : l
        ));
    };

    const handleUpdateLayerParams = (id: string, params: any) => {
        setActiveLayers(prev => prev.map(l =>
            l.id === id ? { ...l, params: { ...l.params, ...params } } : l
        ));
    };

    const handleAddMarker = (newMarker: Marker) => {
        setMarkers(prev => [...prev, newMarker]);
    };

    const handleRemoveMarker = (id: string) => {
        setMarkers(prev => prev.filter(m => m.id !== id));
    };

    const handleUpdateMarker = (updatedMarker: Marker) => {
        setMarkers(prev => prev.map(m => m.id === updatedMarker.id ? updatedMarker : m));
    };

    // Auto fit bounds when markers change
    useEffect(() => {
        if (markers.length > 0) {
            const timer = setTimeout(() => {
                mapRef.current?.fitAllMarkers();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [markers.length]);

    const handleSearchSelect = (result: { lat: number, lon: number, display_name: string }) => {
        const newMarker: Marker = {
            id: crypto.randomUUID(),
            lat: result.lat,
            lon: result.lon,
            title: result.display_name.split(',')[0]
        };
        setMarkers(prev => [...prev, newMarker]);
    };

    // Administrative selection handlers
    const handleSelectKecamatan = async (kecamatan: Kecamatan | null) => {
        setLoading(true);
        setSelectedKecamatan(kecamatan);
        setSelectedDesa(null);
        setSelectedSegmen(null);

        // Immediate layer clearing
        setActiveLayers(prev => prev.filter(l =>
            !l.id.startsWith('batas_kecamatan_') &&
            !l.id.startsWith('legacy_desa_') &&
            !l.id.startsWith('legacy_segments_')
        ));

        // Clear vector source for zoomToFeature (e.g. boundaries)
        mapRef.current?.zoomToFeature(null);

        if (!kecamatan) {
            setLoading(false);
            return;
        }

        try {
            const geojson = await desaService.getGeojsonDesa(kecamatan.id);

            if (geojson) {
                setActiveLayers(prev => {
                    const filtered = prev.filter(l =>
                        !l.id.startsWith('batas_kecamatan_') &&
                        !l.id.startsWith('legacy_desa_') &&
                        !l.id.startsWith('legacy_segments_')
                    );

                    const layerId = `batas_kecamatan_${kecamatan.id}`;
                    const layerTitle = `KECAMATAN: ${kecamatan.nama_kecamatan}`;
                    return [{
                        id: layerId,
                        title: layerTitle,
                        type: 'vector',
                        data: geojson,
                        visible: true,
                        opacity: 1.0,
                        style: { stroke: '#2e2e2eff', width: 1, lineDash: [4, 4], fill: 'rgba(150, 147, 145, 0.00)', labelField: 'nama_desa' }
                    }, ...filtered];
                });

                mapRef.current?.zoomToFeature(geojson);
            }
        } catch (error) {
            console.error("Failed to fetch kecamatan geojson", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectDesa = async (desa: Desa | null) => {
        setLoading(true);
        setSelectedDesa(desa);
        setSelectedSegmen(null);

        // Immediate layer clearing for desa, poros, and segments
        setActiveLayers(prev => prev.filter(l =>
            !l.id.startsWith('legacy_desa_') &&
            !l.id.startsWith('legacy_poros_') &&
            !l.id.startsWith('legacy_segments_')
        ));

        if (!desa) {
            // Re-zoom to kecamatan if desa is cleared
            if (selectedKecamatan) {
                const geojson = await desaService.getGeojsonDesa(selectedKecamatan.id);
                if (geojson) mapRef.current?.zoomToFeature(geojson);
            } else {
                mapRef.current?.zoomToFeature(null);
            }
            setLoading(false);
            return;
        }

        try {
            // Parallel fetching for performance
            const [desaGeojson, rawPoros, rawSegments, rekap] = await Promise.all([
                desaService.getDesaGeojsonById(desa.id),
                jalanService.getJalanPorosByDesa(desa.id),
                jalanService.getSegmenByDesa(desa.id),
                jalanService.getRekapDibangunByDesa(desa.id)
            ]);

            // Diagnostic logs for debugging
            console.log(`MapView: Selected Desa ID = ${desa.id}`);
            console.log(`MapView: Poros = ${rawPoros ? 'Found' : 'Failed'}`);
            console.log(`MapView: Segmen = ${rawSegments ? 'Found' : 'Failed'}`);
            console.log(`MapView: Rekap = ${rekap ? 'Found' : 'Failed'}`);

            setRekapData(rekap);
            setSegmentsData(rawSegments);

            // Inject metadata for Master Road
            const porosGeojson = rawPoros && rawPoros.features ? {
                ...rawPoros,
                features: rawPoros.features.map(f => ({
                    ...f,
                    properties: { ...f.properties, _layer: 'jalan_poros' }
                }))
            } : null;

            // Inject metadata for Segments
            const segmentsGeojson = rawSegments && rawSegments.features ? {
                ...rawSegments,
                features: rawSegments.features.map(f => ({
                    ...f,
                    properties: { ...f.properties, _layer: 'jalan_segmen' }
                }))
            } : null;

            setActiveLayers(prev => {
                let filtered = prev.filter(l =>
                    !l.id.startsWith('legacy_desa_') &&
                    !l.id.startsWith('legacy_poros_') &&
                    !l.id.startsWith('legacy_segments_')
                );

                if (desaGeojson) {
                    filtered = [{
                        id: `legacy_desa_${desa.id}`,
                        title: `Wilayah: ${desa.nama_desa}`,
                        type: 'vector',
                        data: desaGeojson,
                        visible: true,
                        opacity: 1.0,
                        zIndex: 6
                    }, ...filtered];
                }

                if (porosGeojson) {
                    filtered = [{
                        id: `legacy_poros_${desa.id}`,
                        title: `Jalan Poros: ${desa.nama_desa}`,
                        type: 'vector',
                        data: porosGeojson,
                        visible: true,
                        opacity: 1,
                        zIndex: 90
                    }, ...filtered];
                }

                if (segmentsGeojson) {
                    filtered = [{
                        id: `legacy_segments_${desa.id}`,
                        title: `Segmen Jalan: ${desa.nama_desa}`,
                        type: 'vector',
                        data: segmentsGeojson,
                        visible: true,
                        opacity: 1,
                        zIndex: 100
                    }, ...filtered];
                }

                return filtered;
            });

            if (desaGeojson) {
                mapRef.current?.zoomToFeature(desaGeojson);
            }
        } catch (error) {
            console.error("Failed to fetch desa data", error);
        } finally {
            setLoading(false);
        }
    };

    // Tabs State
    const [activeTab, setActiveTab] = useState<string>('catalog');

    // Sidebar content component/variable for reuse
    const SidebarContent = (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/20 min-h-0">
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val)} className="flex-1 flex flex-col min-h-0 gap-0">
                <div className="bg-white dark:bg-slate-950 border-b dark:border-slate-800 px-2 py-2 shrink-0">
                    <TabsList className="w-full grid grid-cols-3 h-9">
                        <TabsTrigger value="catalog" className="text-[9px] uppercase font-bold tracking-tight">Katalog</TabsTrigger>
                        <TabsTrigger value="layers" className="text-[9px] uppercase font-bold tracking-tight">Layer</TabsTrigger>
                        <TabsTrigger value="filters" className="text-[9px] uppercase font-bold tracking-tight">Filter</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="catalog" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden bg-white dark:bg-slate-950/50">
                    <GeonodeDatasetPanel
                        onAddLayer={handleAddLayer}
                        activeLayerIds={activeLayerIds}
                    />
                </TabsContent>

                <TabsContent value="layers" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden bg-white dark:bg-slate-950/50">
                    <MapLayerControlPanel
                        layers={activeLayers}
                        onRemoveLayer={handleRemoveLayer}
                        onReorder={handleReorderLayers}
                        onToggleVisibility={handleToggleVisibility}
                        onOpacityChange={handleOpacityChange}
                        onUpdateLayerParams={handleUpdateLayerParams}
                    />
                </TabsContent>

                <TabsContent value="filters" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar bg-white dark:bg-slate-950/50">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Pencarian Alamat</label>
                            <AddressSearch onSelect={handleSearchSelect} />
                        </div>

                        <div className="space-y-3 pt-2 border-t dark:border-slate-800">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Kecamatan</label>
                                <KecamatanDropdown
                                    className="w-full h-10 rounded-xl shadow-sm border-slate-200 dark:border-slate-800 font-bold"
                                    selectedKecamatanName={selectedKecamatan?.nama_kecamatan}
                                    onSelectKecamatan={handleSelectKecamatan}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Desa / Kelurahan</label>
                                <DesaDropdown
                                    className="w-full h-10 rounded-xl shadow-sm border-slate-200 dark:border-slate-800 font-bold"
                                    idKecamatan={selectedKecamatan?.id}
                                    selectedDesaName={selectedDesa?.nama_desa}
                                    onSelectDesa={handleSelectDesa}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t dark:border-slate-800">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Input Koordinat</label>
                            <CoordinateInput
                                markers={markers}
                                onAdd={handleAddMarker}
                                onRemove={handleRemoveMarker}
                                onUpdate={handleUpdateMarker}
                                onZoomTo={(m) => mapRef.current?.zoomToCoordinate(m.lon, m.lat)}
                            />
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );

    return (
        <div className="flex flex-col h-[100dvh] overflow-hidden bg-white">
            <PublicNavbar />

            <main className="flex-1 relative flex overflow-hidden">
                <MapViewSidebar
                    isOpen={isSidebarOpen}
                    onToggle={setIsSidebarOpen}
                    widthClass="w-[340px]"
                    className="z-40"
                >
                    <div className="h-full flex flex-col">
                        {SidebarContent}
                    </div>
                </MapViewSidebar>

                {/* Map Section */}
                <div className="flex-1 relative">
                    {loading && (
                        <div
                            className={cn(
                                "absolute z-50 flex items-center gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
                                isMobile
                                    ? "top-4 left-[72px]"
                                    : cn("top-6 transition-all duration-500", isSidebarOpen ? "left-[352px]" : "left-6")
                            )}
                        >
                            <div className="h-4 w-4 border-[2.5px] border-blue-600 border-t-transparent rounded-full animate-spin" />
                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest mt-[1px]">Memuat...</span>
                        </div>
                    )}

                    <OpenLayersMap
                        ref={mapRef}
                        className="w-full h-full"
                        layers={activeLayers}
                        markers={markers}
                        basemapUrl={activeBasemap.url}
                    />

                    {/* Bottom Right: Basemap Selector */}
                    <div className={cn(
                        "absolute z-20 flex flex-col items-end pointer-events-auto",
                        isMobile ? "bottom-4 right-4" : "bottom-6 right-6"
                    )}>
                        {isBasemapPanelOpen && (
                            <div className={cn(
                                "mb-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-3xl border border-white dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.3)] grid grid-cols-2 gap-2 animate-in fade-in zoom-in slide-in-from-bottom-10 duration-300 origin-bottom-right max-h-[60vh] overflow-y-auto",
                                isMobile ? "gap-2" : "gap-3 p-4"
                            )}>
                                {BASEMAPS.map((b) => (
                                    <button
                                        key={b.id}
                                        onClick={() => { setActiveBasemap(b); setIsBasemapPanelOpen(false); }}
                                        className={cn(
                                            "relative overflow-hidden rounded-xl shadow-sm border-2 transition-all active:scale-95 group",
                                            isMobile ? "w-16 h-16" : "w-20 h-20 hover:scale-105",
                                            activeBasemap.id === b.id ? "border-blue-600 shadow-lg shadow-blue-200 dark:shadow-none bg-blue-50 dark:bg-blue-900/20" : "border-slate-100 dark:border-slate-800 hover:border-blue-400"
                                        )}
                                    >
                                        <img src={b.thumbnail} alt={b.name} className="w-full h-full object-cover" />
                                        <div className={cn(
                                            "absolute inset-x-0 bottom-0 transition-colors",
                                            isMobile ? "p-1" : "p-2",
                                            activeBasemap.id === b.id ? "bg-blue-600/90 backdrop-blur-sm" : "bg-slate-900/60 backdrop-blur-sm group-hover:bg-blue-600/80"
                                        )}>
                                            <p className="text-[8px] font-black text-white text-center leading-tight truncate px-0.5 uppercase tracking-tighter">{b.name}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => setIsBasemapPanelOpen(!isBasemapPanelOpen)}
                            className={cn(
                                "overflow-hidden rounded-2xl border-2 border-white dark:border-slate-800 shadow-2xl hover:scale-105 active:scale-95 transition-all group relative",
                                isMobile ? "w-14 h-14" : "w-20 h-20"
                            )}
                            title="Pilih Basemap"
                        >
                            <img src={activeBasemap.thumbnail} alt="Active Basemap" className="w-full h-full object-cover" />
                            <div className="absolute inset-x-0 bottom-0 bg-slate-900/60 backdrop-blur-sm p-1 flex justify-center group-hover:bg-blue-600/90 transition-colors">
                                <span className="text-[7px] font-black text-white uppercase tracking-tighter truncate px-0.5">{activeBasemap.name}</span>
                            </div>
                        </button>
                    </div>

                    {/* Top Left Corner (Beside Sidebar): Legend */}
                    <div className={cn(
                        "absolute z-20 pointer-events-none flex flex-col items-start gap-2 transition-all duration-500 ease-in-out",
                        isMobile ? "top-4" : "top-6",
                        isSidebarOpen
                            ? (isMobile ? "left-4" : "left-[360px]")
                            : (isMobile ? "left-4" : "left-6")
                    )}>
                        {/* Toggle Button (Now at the top) */}
                        <button
                            onClick={() => setIsLegendOpen(!isLegendOpen)}
                            className={cn(
                                "pointer-events-auto rounded-xl backdrop-blur-md border shadow-xl transition-all flex items-center gap-2 group active:scale-95",
                                isMobile ? "h-9 px-3" : "h-10 px-4 gap-2.5",
                                isLegendOpen
                                    ? "bg-blue-600 text-white border-blue-500 hover:bg-blue-700"
                                    : "bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-200 border-white dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:border-emerald-200 dark:hover:border-emerald-800"
                            )}
                        >
                            {isLegendOpen ? <ChevronDown size={13} className="opacity-70 rotate-180" /> : <MapIcon size={13} className="group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />}
                            <span className={cn("font-black uppercase tracking-widest", isMobile ? "text-[9px]" : "text-[10px]")}>
                                {isLegendOpen ? "Tutup Legenda" : "Legenda"}
                            </span>
                        </button>

                        {/* Legend Content (Expands downwards) */}
                        <div className={cn(
                            "bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-white dark:border-slate-800 shadow-xl transition-all duration-500 overflow-hidden pointer-events-auto origin-top",
                            isLegendOpen
                                ? isMobile
                                    ? "max-h-[300px] opacity-100 w-[min(220px,calc(100vw-112px))]"
                                    : "max-h-[400px] opacity-100 w-[260px]"
                                : "max-h-0 opacity-0 w-[260px] border-transparent shadow-none"
                        )}>
                            <div className={cn("p-4", isMobile && "p-3")}>
                                <div className="flex items-center gap-2 mb-3">
                                    <Info size={14} className="text-blue-600 dark:text-blue-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">Legenda Peta</span>
                                </div>
                                <div className="space-y-2.5">
                                    <div className={cn("flex items-center gap-3 transition-opacity duration-300", !hasSegments && "opacity-40 grayscale-[0.5]")}>
                                        <div
                                            className="w-6 h-1.5 rounded-full shrink-0"
                                            style={{
                                                backgroundColor: CORE_LAYER_COLORS.SEGMENTS.hex,
                                                boxShadow: hasSegments ? `0 0 8px ${CORE_LAYER_COLORS.SEGMENTS.hex}80` : 'none'
                                            }}
                                        />
                                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tighter text-left">Segmen Jalan Desa</span>
                                    </div>
                                    <div className={cn("flex items-center gap-3 transition-opacity duration-300", !hasMainRoads && "opacity-40")}>
                                        <div className="w-6 h-1.5 rounded-full shrink-0" style={{ backgroundColor: CORE_LAYER_COLORS.GENERAL.hex }} />
                                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tighter text-left">Jalan Utama / Kab</span>
                                    </div>
                                    <div className={cn("flex items-center gap-3 transition-opacity duration-300", !hasAdmin && "opacity-40")}>
                                        <div className="relative w-6 h-2 flex items-center justify-center shrink-0">
                                            <div className="w-full h-0 border-t-2 border-dashed" style={{ borderColor: CORE_LAYER_COLORS.ADMIN.hex }} />
                                            <div className="absolute inset-0 rounded-sm" style={{ backgroundColor: `${CORE_LAYER_COLORS.ADMIN.hex}1a` }} />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tighter text-left">Batas Wilayah Desa</span>
                                    </div>
                                    <div className={cn("flex items-center gap-3 mt-1 transition-opacity duration-300", !hasCatalog && "opacity-40 grayscale-[0.5]")}>
                                        <div
                                            className="w-6 h-3 border-2 rounded-sm shrink-0"
                                            style={{
                                                backgroundColor: `${CORE_LAYER_COLORS.CATALOG.hex}33`,
                                                borderColor: CORE_LAYER_COLORS.CATALOG.hex
                                            }}
                                        />
                                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tighter text-left">Wilayah/Poligon Katalog</span>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed uppercase tracking-widest text-left">
                                        GIS Melarosa Bojonegoro.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Map Controls (Bottom Left like Draw) */}
                    <MapViewMapControls
                        onZoomIn={() => mapRef.current?.zoomIn()}
                        onZoomOut={() => mapRef.current?.zoomOut()}
                        onResetBearing={() => mapRef.current?.resetRotation()}
                        className={cn(
                            "absolute bottom-6 transition-all duration-500 z-20",
                            isMobile
                                ? "left-4"
                                : isSidebarOpen ? "left-[352px]" : "left-6"
                        )}
                    />
                </div>
            </main>

            {/* Bottom Center: Rekap Toggle */}
            {selectedDesa && rekapData && (
                <div className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+8px)] left-1/2 -translate-x-1/2 z-20 flex justify-center pointer-events-none">
                    <Button
                        onClick={() => setIsRekapOpen(true)}
                        title="Tampilkan Rekap Pembangunan"
                        className="pointer-events-auto w-11 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-2xl border border-blue-500 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center backdrop-blur-md group"
                    >
                        <ChevronDown className="w-5 h-5 rotate-180 group-hover:scale-110 transition-transform" />
                    </Button>
                </div>
            )}

            {/* Bottom Sheet for Rekap Data */}
            <Sheet open={isRekapOpen} onOpenChange={setIsRekapOpen}>
                <SheetContent side="bottom" className="h-auto max-h-[90dvh] rounded-t-[32px] border-t-0 p-0 overflow-hidden shadow-2xl overflow-y-auto [&>button]:hidden">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />

                    <SheetTitle className="sr-only">Rekap Pembangunan - {selectedDesa?.name}</SheetTitle>
                    <SheetDescription className="sr-only">Detail informasi progres pembangunan jalan di Desa {selectedDesa?.name}.</SheetDescription>

                    {/* Modern Close Button */}
                    <div className="absolute top-6 right-6 z-50">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsRekapOpen(false)}
                            className="w-10 h-10 rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-md hover:bg-red-500 hover:text-white transition-all active:scale-90 shadow-sm"
                        >
                            <X size={18} className="stroke-[2.5]" />
                        </Button>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0 pt-10 md:px-12 bg-white dark:bg-slate-900">
                        <SheetHeader className="px-6 pb-2 text-left">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                        <Activity className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Ringkasan Infrastruktur</span>
                                    </div>
                                    <SheetTitle className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                        {rekapData?.nama_desa}
                                    </SheetTitle>
                                    <SheetDescription className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                        Kecamatan {rekapData?.nama_kecamatan} • Kabupaten Bojonegoro
                                    </SheetDescription>
                                </div>
                                <div className="flex flex-col gap-2 items-end">
                                    {(() => {
                                        const pemetaan = rekapData?.total_panjang_aset || 0;
                                        const naikStatus = rekapData?.total_panjang_puk || 0;
                                        const jalanDesaSekarang = Math.max(0, pemetaan - naikStatus);
                                        const jalanDibangun = rekapData?.total_panjang_dibangun || 0;

                                        const pct = jalanDesaSekarang > 0 ? (jalanDibangun / jalanDesaSekarang) * 100 : 100;
                                        const isDone = pct >= 100;

                                        return (
                                            <Badge
                                                className={cn(
                                                    "w-fit px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-lg flex items-center gap-2 transition-all",
                                                    isDone
                                                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-800 ring-4 ring-emerald-500/5"
                                                        : "bg-red-500/10 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-800 ring-4 ring-red-500/5"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    isDone ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]",
                                                    !isDone && "animate-pulse"
                                                )} />
                                                {isDone ? (
                                                    <span className="flex items-center gap-1.5">
                                                        <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                                                        Infrastruktur Tuntas
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5">
                                                        <AlertCircle size={12} className="text-red-600 dark:text-red-400" />
                                                        Belum Tuntas
                                                    </span>
                                                )}
                                            </Badge>
                                        );
                                    })()}
                                </div>
                            </div>
                        </SheetHeader>

                        <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0 mt-4">
                            <div className="px-6">
                                <TabsList className="w-full max-w-md grid grid-cols-2 h-11 p-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl">
                                    <TabsTrigger value="overview" className="rounded-lg font-bold text-xs uppercase tracking-widest">
                                        Status Capaian
                                    </TabsTrigger>
                                    <TabsTrigger value="segments" className="rounded-lg font-bold text-xs uppercase tracking-widest">
                                        Segmen List
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="overview" className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar outline-none">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-6">
                                    <Card className="border-0 shadow-sm bg-slate-50 dark:bg-slate-800/40 rounded-xl overflow-hidden">
                                        <CardHeader className="p-3 pb-0.5 space-y-0 text-center">
                                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pemetaan Jalan Desa</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-3 pt-0 text-center">
                                            <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                                                {(rekapData?.total_panjang_aset || 0).toLocaleString('id-ID')}
                                                <span className="text-[10px] ml-1 text-slate-400 font-bold uppercase tracking-wider">m</span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-0 shadow-sm bg-slate-50 dark:bg-slate-800/40 rounded-xl overflow-hidden">
                                        <CardHeader className="p-3 pb-0.5 space-y-0 text-center">
                                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Naik Status Kabupaten</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-3 pt-0 text-center">
                                            <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                                                {(rekapData?.total_panjang_puk || 0).toLocaleString('id-ID')}
                                                <span className="text-[10px] ml-1 text-slate-400 font-bold uppercase tracking-wider">m</span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-0 shadow-sm bg-blue-50/50 dark:bg-blue-900/10 rounded-xl overflow-hidden border border-blue-100 dark:border-blue-900/20">
                                        <CardHeader className="p-3 pb-0.5 space-y-0 text-center">
                                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Jalan Desa Sekarang</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-3 pt-0 text-center">
                                            <div className="text-xl font-black text-blue-700 dark:text-blue-300 tabular-nums">
                                                {Math.max(0, (rekapData?.total_panjang_aset || 0) - (rekapData?.total_panjang_puk || 0)).toLocaleString('id-ID')}
                                                <span className="text-[10px] ml-1 text-blue-400 font-bold uppercase tracking-wider">m</span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-0 shadow-sm bg-orange-50/50 dark:bg-orange-900/10 rounded-xl overflow-hidden border border-orange-100 dark:border-orange-900/20">
                                        <CardHeader className="p-3 pb-0.5 space-y-0 text-center">
                                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">Belum Tertangani</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-3 pt-0 text-center">
                                            <div className="text-xl font-black text-orange-700 dark:text-orange-300 tabular-nums">
                                                {Math.max(0, ((rekapData?.total_panjang_aset || 0) - (rekapData?.total_panjang_puk || 0)) - (rekapData?.total_panjang_dibangun || 0)).toLocaleString('id-ID')}
                                                <span className="text-[10px] ml-1 text-orange-400 font-bold uppercase tracking-wider">m</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {(() => {
                                    const jalanDesaSekarang = (rekapData?.total_panjang_aset || 0) - (rekapData?.total_panjang_puk || 0);
                                    const jalanDibangun = rekapData?.total_panjang_dibangun || 0;
                                    const pct = Math.min(100, Math.round(jalanDesaSekarang > 0 ? (jalanDibangun / jalanDesaSekarang) * 100 : 100));
                                    const isDone = pct >= 100;

                                    return (
                                        <div className="bg-white dark:bg-slate-900 px-6 py-6 rounded-[32px] mb-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors" />

                                            <div className="flex justify-between items-end mb-6">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn(
                                                            "w-1.5 h-1.5 rounded-full",
                                                            isDone ? "bg-emerald-500" : "bg-blue-500 animate-pulse"
                                                        )} />
                                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block">Status Capaian</span>
                                                    </div>
                                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Progress Pembangunan</h4>
                                                </div>
                                                <div className="text-right">
                                                    <div className="flex items-baseline gap-1">
                                                        <span className={cn(
                                                            "text-3xl font-black leading-none tabular-nums tracking-tighter",
                                                            isDone ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"
                                                        )}>
                                                            {pct}
                                                        </span>
                                                        <span className="text-lg font-black text-slate-300 dark:text-slate-600">%</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="relative mb-6">
                                                <div
                                                    className="absolute -top-2 transition-all duration-1000 ease-out z-10 hidden md:block"
                                                    style={{ left: `calc(${pct}% - 20px)` }}
                                                >
                                                    <div className="bg-slate-900 text-white text-[8px] font-black px-2 py-1 rounded-md shadow-lg relative after:content-[''] after:absolute after:top-full after:left-1/2 after:-ml-1 after:border-4 after:border-transparent after:border-t-slate-900">
                                                        {pct}%
                                                    </div>
                                                </div>

                                                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 shadow-inner">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden",
                                                            isDone
                                                                ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                                                                : "bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-400 shadow-[0_0_12px_rgba(37,99,235,0.3)]"
                                                        )}
                                                        style={{ width: `${pct}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50" />
                                                        {!isDone && (
                                                            <div
                                                                className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
                                                                style={{
                                                                    animation: 'shimmer 2s infinite linear',
                                                                    backgroundSize: '200% 100%'
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Sudah Dibangun</span>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-sm font-black text-slate-900 dark:text-white">{jalanDibangun.toLocaleString('id-ID')}</span>
                                                        <span className="text-[10px] font-bold text-slate-400">m</span>
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Target Tersisa</span>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-sm font-black text-slate-900 dark:text-white">
                                                            {Math.max(0, jalanDesaSekarang - jalanDibangun).toLocaleString('id-ID')}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400">m</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <style>{`
                                                @keyframes shimmer {
                                                    0% { transform: translateX(-150%) skewX(-20deg); }
                                                    100% { transform: translateX(250%) skewX(-20deg); }
                                                }
                                            `}</style>
                                        </div>
                                    );
                                })()}
                            </TabsContent>

                            <TabsContent value="segments" className="flex-1 flex flex-col min-h-0 m-0 outline-none">
                                <div className="py-4 flex-1 flex flex-col gap-4 overflow-hidden">
                                    <div className="px-6 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Navigation size={14} className="text-blue-500" />
                                            <span className="text-[12px] tracking-widest text-slate-400">Daftar Segmen</span>
                                        </div>
                                        <Badge variant="outline" className="text-[12px] px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-900">
                                            {segmentsData?.features?.length} Segmen
                                        </Badge>
                                    </div>

                                    <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar snap-x snap-mandatory pb-10 scroll-px-6">
                                        <div className="flex flex-nowrap gap-4 px-6 w-max min-w-full">
                                            {segmentsData?.features?.map((feature: any, idx: number) => {
                                                const props = feature.properties;
                                                const isDone = props.status_pembangunan === 'Sudah Tuntas';

                                                return (
                                                    <Card key={idx} className="w-[280px] md:w-[320px] gap-0 p-0 shrink-0 snap-start border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden group bg-white dark:bg-slate-900">
                                                        <div className="h-[160px] bg-slate-50 dark:bg-slate-950/50 relative overflow-hidden">
                                                            {/* Background Pattern */}
                                                            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} />

                                                            <SegmenMiniMap
                                                                feature={feature}
                                                                strokeColor={isDone ? '#10b981' : '#3b82f6'}
                                                                className="w-full h-full p-6 transition-transform duration-500 group-hover:scale-110"
                                                            />

                                                            <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                                                                <Badge className={cn(
                                                                    "text-[9px] font-black uppercase px-3 py-1.5 rounded-xl border-0 shadow-xl backdrop-blur-md",
                                                                    isDone
                                                                        ? "bg-emerald-500/90 text-white ring-4 ring-emerald-500/10"
                                                                        : "bg-blue-600/90 text-white ring-4 ring-blue-600/10"
                                                                )}>
                                                                    {isDone ? 'Sudah Tuntas' : 'Aktif'}
                                                                </Badge>
                                                                {props.tahun_pembangunan && (
                                                                    <Badge variant="outline" className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-[8px] font-black border-slate-200 dark:border-slate-700 rounded-lg">
                                                                        TA. {props.tahun_pembangunan}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <CardContent className="p-4 space-y-4">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                                    <span className="text-[8px] font-black text-slate-400 tracking-widest">Detail Segmen</span>
                                                                </div>
                                                                <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-1">
                                                                    {props.nama_segmen || `Segmen ${idx + 1}`}
                                                                </h5>
                                                                <p className="text-[10px] font-bold text-slate-400 tracking-tighter truncate">
                                                                    Kode Ruas : {props.kode_ruas}
                                                                </p>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                                                <div className="space-y-1">
                                                                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">Dimensi</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex items-center gap-1">
                                                                            <Ruler size={10} className="text-blue-500" />
                                                                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 tabular-nums">{Math.round(props.panjang || 0)}<span className="text-[8px] text-slate-400 ml-0.5">m</span></span>
                                                                        </div>
                                                                        <div className="w-px h-2 bg-slate-200 dark:bg-slate-700" />
                                                                        <div className="flex items-center gap-1">
                                                                            <Navigation size={10} className="text-indigo-500" />
                                                                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 tabular-nums">{props.lebar || 0}<span className="text-[8px] text-slate-400 ml-0.5">m</span></span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-1 border-l border-slate-200 dark:border-slate-700 pl-3">
                                                                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">Spesifikasi</span>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <LayersIcon size={10} className="text-emerald-500" />
                                                                        <span className="text-[9px] font-black text-slate-700 dark:text-slate-200 uppercase truncate">
                                                                            {props.perkerasan || props.jenis_perkerasan || 'Belum Ada'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                className="w-full h-10 text-[9px] font-black uppercase tracking-widest rounded-xl bg-slate-900 hover:bg-blue-600 dark:bg-white dark:text-slate-900 dark:hover:bg-blue-500 dark:hover:text-white transition-all shadow-lg shadow-slate-200 dark:shadow-none mt-auto"
                                                                onClick={() => mapRef.current?.zoomToFeature(feature)}
                                                            >
                                                                <MapPin size={12} className="mr-2" /> Fokus Lokasi
                                                            </Button>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>

                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
