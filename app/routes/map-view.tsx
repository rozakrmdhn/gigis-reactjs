import { useState, useRef, useEffect, useMemo } from 'react';
import {
    ChevronRight,
    Database,
    Layers as LayersIcon,
    Search,
    Map as MapIcon,
    ChevronLeft,
    PanelLeft,
    Filter,
    ChevronDown,
    Info,
    PanelLeftOpen
} from 'lucide-react';
import { PublicNavbar } from "~/components/public-navbar";
import { OpenLayersMap, type OpenLayersMapRef, type MapLayerConfig } from "~/features/peta/components/OpenLayersMap";
import { MapControls } from "~/features/monitoring/components/MapControls";
import { GeonodeDatasetPanel } from "~/features/peta/components/GeonodeDatasetPanel";
import { MapLayerControlPanel } from "~/features/peta/components/MapLayerControlPanel";
import { KecamatanDropdown } from "~/features/peta/components/KecamatanDropdown";
import { DesaDropdown } from "~/features/peta/components/DesaDropdown";
import { type Kecamatan } from "~/services/kecamatan";
import { desaService, type Desa } from "~/services/desa";
import { jalanService, type RekapDibangun } from "~/services/jalan";
import { cn } from '~/lib/utils';
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

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { CORE_LAYER_COLORS } from '~/lib/map-config';

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
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isRekapOpen, setIsRekapOpen] = useState(false);

    // Basemap & Legend State
    const [activeBasemap, setActiveBasemap] = useState(BASEMAPS[3]);
    const [isBasemapPanelOpen, setIsBasemapPanelOpen] = useState(false);
    const [isLegendOpen, setIsLegendOpen] = useState(false);
    const [rekapData, setRekapData] = useState<RekapDibangun | null>(null);

    // Administrative Filters State
    const [selectedKecamatan, setSelectedKecamatan] = useState<Kecamatan | null>(null);
    const [selectedDesa, setSelectedDesa] = useState<Desa | null>(null);
    const [selectedSegmen, setSelectedSegmen] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Map Layers State
    const [activeLayers, setActiveLayers] = useState<MapLayerConfig[]>([]);

    // Derived layer presence for Legend
    const hasSegments = useMemo(() => activeLayers.some(l => l.id.startsWith('legacy_segments_') && l.visible !== false), [activeLayers]);
    const hasAdmin = useMemo(() => activeLayers.some(l => (l.id.startsWith('batas_kecamatan_') || l.id.startsWith('legacy_desa_')) && l.visible !== false), [activeLayers]);
    const hasCatalog = useMemo(() => activeLayers.some(l => l.id.startsWith('geonode-') && l.visible !== false), [activeLayers]);
    const hasMainRoads = true; // Always there for now or check map ref

    // Derived info for the panels
    const activeLayerIds = useMemo(() => activeLayers.map(l => l.id), [activeLayers]);

    // Handlers
    const handleAddLayer = (newLayer: MapLayerConfig) => {
        setActiveLayers(prev => [newLayer, ...prev]);
        // Shadcn Tabs handles state via component props or defaultValue
    };

    const handleRemoveLayer = (id: string) => {
        setActiveLayers(prev => prev.filter(l => l.id !== id));
    };

    const handleReorderLayers = (newOrder: MapLayerConfig[]) => {
        const updated = newOrder.map((layer, index) => ({
            ...layer,
            zIndex: (newOrder.length - index) * 10
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

    // Sidebar content component/variable for reuse
    const SidebarContent = (
        <div className={cn(
            "flex flex-col h-full",
            isMobile ? "w-full" : "w-[340px]"
        )}>
            <Tabs defaultValue="catalog" className="w-full h-full flex flex-col gap-3">
                {/* Navigation Tabs List */}
                <TabsList className="w-full h-12 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-white dark:border-slate-800 shadow-2xl shrink-0 flex items-center justify-center">
                    <TabsTrigger value="catalog" className="flex-1 flex items-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-900 data-[state=active]:bg-blue-600 data-[state=active]:text-white dark:data-[state=active]:bg-blue-600 shadow-none dark:shadow-none transition-all">
                        <Database size={16} />
                        <span>Katalog</span>
                    </TabsTrigger>
                    <TabsTrigger value="layers" className="flex-1 flex items-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-900 data-[state=active]:bg-blue-600 data-[state=active]:text-white dark:data-[state=active]:bg-blue-600 shadow-none dark:shadow-none transition-all">
                        <LayersIcon size={16} />
                        <span>Layer</span>
                    </TabsTrigger>
                    <TabsTrigger value="filters" className="flex-1 flex items-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-900 data-[state=active]:bg-blue-600 data-[state=active]:text-white dark:data-[state=active]:bg-blue-600 shadow-none dark:shadow-none transition-all relative">
                        <Filter size={16} />
                        <span>Filter</span>
                        {selectedKecamatan && (
                            <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(52,211,153,0.8)]" />
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* Panel Content wrapped in TabsContent */}
                <div className="flex-1 min-h-0">
                    <TabsContent value="catalog" className="w-full h-full m-0 focus-visible:outline-none">
                        <GeonodeDatasetPanel
                            onAddLayer={handleAddLayer}
                            activeLayerIds={activeLayerIds}
                        />
                    </TabsContent>
                    <TabsContent value="layers" className="w-full h-full m-0 focus-visible:outline-none">
                        <MapLayerControlPanel
                            layers={activeLayers}
                            onReorder={handleReorderLayers}
                            onToggleVisibility={handleToggleVisibility}
                            onRemoveLayer={handleRemoveLayer}
                            onOpacityChange={handleOpacityChange}
                            onUpdateLayerParams={handleUpdateLayerParams}
                            onReset={() => setActiveLayers([activeLayers[activeLayers.length - 1]])}
                        />
                    </TabsContent>
                    <TabsContent value="filters" className="w-full h-full m-0 focus-visible:outline-none">
                        <div className="flex flex-col h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-white dark:border-slate-800 shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-emerald-600 rounded-lg text-white shadow-lg shadow-emerald-200 dark:shadow-none">
                                        <Filter size={18} />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight uppercase">Eksplorasi Wilayah</h3>
                                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Filter Administrasi</p>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-900 dark:text-slate-400 uppercase tracking-widest ml-1">Kecamatan</label>
                                        <KecamatanDropdown
                                            className="w-full h-11 rounded-xl shadow-sm border-slate-200 dark:border-slate-700 font-bold"
                                            selectedKecamatanName={selectedKecamatan?.nama_kecamatan}
                                            onSelectKecamatan={handleSelectKecamatan}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-400 ml-1">Desa / Kelurahan</label>
                                        <DesaDropdown
                                            className="w-full h-11 rounded-xl shadow-sm border-slate-200 dark:border-slate-700 font-bold"
                                            idKecamatan={selectedKecamatan?.id}
                                            selectedDesaName={selectedDesa?.nama_desa}
                                            onSelectDesa={handleSelectDesa}
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100/50 dark:border-emerald-900/20 rounded-2xl">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 text-emerald-600">
                                            <MapIcon size={14} />
                                        </div>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed italic">
                                            Pilih wilayah untuk memfokuskan peta dan menampilkan data jalan poros desa yang relevan secara otomatis.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                                <p className="text-[9px] text-center text-slate-400 font-medium italic">
                                    Gunakan filter untuk navigasi cepat antar wilayah
                                </p>
                            </div>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-white">
            <PublicNavbar />

            <main className="flex-1 relative flex overflow-hidden">
                {/* Sidebar Controls */}
                {!isMobile ? (
                    <div
                        className={cn(
                            "absolute top-6 left-6 z-30 flex flex-col gap-3 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
                            isSidebarOpen ? "translate-x-0" : "-translate-x-[calc(100%+24px)]"
                        )}
                    >
                        <div className="w-[340px] h-[calc(100vh-110px)] flex flex-col">
                            {SidebarContent}
                        </div>
                    </div>
                ) : (
                    <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="absolute top-6 left-6 z-30 w-10 h-10 rounded-xl shadow-lg">
                                <PanelLeftOpen size={20} />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[300px] p-0 border-none bg-white dark:bg-slate-900">
                            <SheetHeader className="sr-only">
                                <SheetTitle>Peta Panel Kontrol</SheetTitle>
                            </SheetHeader>
                            <div className="h-full p-4">
                                {SidebarContent}
                            </div>
                        </SheetContent>
                    </Sheet>
                )}

                {/* Sidebar Toggle Button (Desktop Only) */}
                {!isMobile && (
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={cn(
                            "absolute z-30 left-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-r-xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
                            isSidebarOpen ? "translate-x-[364px]" : "translate-x-0"
                        )}
                    >
                        {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                    </button>
                )}

                {/* Map Section */}
                <div className="flex-1 relative">
                    {loading && (
                        <div
                            className={cn(
                                "absolute z-20 top-6 left-6 flex items-center gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
                                isMobile ? "left-20" : (isSidebarOpen ? "translate-x-[352px]" : "translate-x-0")
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
                        basemapUrl={activeBasemap.url}
                    />

                    {/* Bottom Right: Basemap Selector */}
                    <div className="absolute bottom-6 right-6 z-20 flex flex-col items-end pointer-events-auto">
                        {isBasemapPanelOpen && (
                            <div className="mb-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-3xl border border-white dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.3)] grid grid-cols-2 gap-3 animate-in fade-in zoom-in slide-in-from-bottom-10 duration-300 origin-bottom-right">
                                {BASEMAPS.map((b) => (
                                    <button
                                        key={b.id}
                                        onClick={() => { setActiveBasemap(b); setIsBasemapPanelOpen(false); }}
                                        className={cn(
                                            "relative w-20 h-20 rounded-xl overflow-hidden shadow-sm border-2 transition-all hover:scale-105 active:scale-95 group",
                                            activeBasemap.id === b.id ? "border-blue-600 shadow-lg shadow-blue-200 dark:shadow-none bg-blue-50 dark:bg-blue-900/20" : "border-slate-100 dark:border-slate-800 hover:border-blue-400"
                                        )}
                                    >
                                        <img src={b.thumbnail} alt={b.name} className="w-full h-full object-cover" />
                                        <div className={cn(
                                            "absolute inset-x-0 bottom-0 p-2 transition-colors",
                                            activeBasemap.id === b.id ? "bg-blue-600/90 backdrop-blur-sm" : "bg-slate-900/60 backdrop-blur-sm group-hover:bg-blue-600/80"
                                        )}>
                                            <p className="text-[9px] font-black text-white text-center leading-tight truncate px-1 uppercase tracking-tighter">{b.name}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => setIsBasemapPanelOpen(!isBasemapPanelOpen)}
                            className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white dark:border-slate-800 shadow-2xl hover:scale-105 transition-all group relative"
                            title="Pilih Basemap"
                        >
                            <img src={activeBasemap.thumbnail} alt="Active Basemap" className="w-full h-full object-cover" />
                            <div className="absolute inset-x-0 bottom-0 bg-slate-900/60 backdrop-blur-sm p-1.5 flex justify-center group-hover:bg-blue-600/90 transition-colors">
                                <span className="text-[8px] font-black text-white uppercase tracking-tighter truncate px-1">{activeBasemap.name}</span>
                            </div>
                        </button>
                    </div>

                    {/* Left Bottom Corner: Legend / Attribution */}
                    <div className="absolute bottom-6 left-6 z-20 pointer-events-none flex flex-col justify-end items-start gap-2">
                        {/* Legend Content */}
                        <div className={cn(
                            "bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-white dark:border-slate-800 shadow-xl transition-all duration-500 overflow-hidden pointer-events-auto",
                            isLegendOpen ? "max-h-[400px] opacity-100 w-[260px]" : "max-h-0 opacity-0 w-[260px] border-transparent shadow-none"
                        )}>
                            <div className="p-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <Info size={14} className="text-blue-600 dark:text-blue-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">Legenda Peta</span>
                                </div>
                                <div className="space-y-3">
                                    <div className={cn("flex items-center gap-3 transition-opacity duration-300", !hasSegments && "opacity-40 grayscale-[0.5]")}>
                                        <div
                                            className="w-6 h-1.5 rounded-full"
                                            style={{
                                                backgroundColor: CORE_LAYER_COLORS.SEGMENTS.hex,
                                                boxShadow: hasSegments ? `0 0 8px ${CORE_LAYER_COLORS.SEGMENTS.hex}80` : 'none'
                                            }}
                                        />
                                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tighter">Segmen Jalan Desa</span>
                                    </div>
                                    <div className={cn("flex items-center gap-3 transition-opacity duration-300", !hasMainRoads && "opacity-40")}>
                                        <div className="w-6 h-1.5 rounded-full" style={{ backgroundColor: CORE_LAYER_COLORS.GENERAL.hex }} />
                                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tighter">Jalan Utama / Kab</span>
                                    </div>
                                    <div className={cn("flex items-center gap-3 transition-opacity duration-300", !hasAdmin && "opacity-40")}>
                                        <div className="relative w-6 h-2 flex items-center justify-center">
                                            <div className="w-full h-0 border-t-2 border-dashed" style={{ borderColor: CORE_LAYER_COLORS.ADMIN.hex }} />
                                            <div className="absolute inset-0 rounded-sm" style={{ backgroundColor: `${CORE_LAYER_COLORS.ADMIN.hex}1a` }} />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tighter">Batas Wilayah Desa</span>
                                    </div>
                                    <div className={cn("flex items-center gap-3 mt-1 transition-opacity duration-300", !hasCatalog && "opacity-40 grayscale-[0.5]")}>
                                        <div
                                            className="w-6 h-3 border-2 rounded-sm"
                                            style={{
                                                backgroundColor: `${CORE_LAYER_COLORS.CATALOG.hex}33`,
                                                borderColor: CORE_LAYER_COLORS.CATALOG.hex
                                            }}
                                        />
                                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tighter">Wilayah/Poligon Katalog</span>
                                    </div>
                                </div>
                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed uppercase tracking-widest">
                                        GIS Melarosa Bojonegoro.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Toggle Button */}
                        <button
                            onClick={() => setIsLegendOpen(!isLegendOpen)}
                            className={cn(
                                "pointer-events-auto h-10 px-4 rounded-xl backdrop-blur-md border shadow-xl transition-all flex items-center gap-2.5 group",
                                isLegendOpen
                                    ? "bg-blue-600 text-white border-blue-500 hover:bg-blue-700"
                                    : "bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-200 border-white dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:border-emerald-200 dark:hover:border-emerald-800"
                            )}
                        >
                            {isLegendOpen ? <ChevronDown size={14} className="opacity-70" /> : <MapIcon size={14} className="group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />}
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {isLegendOpen ? "Sembunyikan" : "Legenda Peta"}
                            </span>
                        </button>
                    </div>

                    {/* Right Top Corner: Controls */}
                    <div className="absolute top-6 right-6 z-10 flex flex-col gap-3">
                        <MapControls
                            onZoomIn={() => mapRef.current?.zoomIn()}
                            onZoomOut={() => mapRef.current?.zoomOut()}
                            onResetBearing={() => mapRef.current?.resetRotation()}
                        />
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="secondary"
                                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                        className="w-10 h-10 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border dark:border-slate-800 shadow-xl p-0 flex items-center justify-center text-slate-600 dark:text-slate-100 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300"
                                    >
                                        <PanelLeft size={20} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                    <p className="text-xs font-semibold">{isSidebarOpen ? 'Hide' : 'Show'} Panel</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            </main>

            {/* Bottom Center: Rekap Toggle */}
            {selectedDesa && rekapData && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex justify-center pointer-events-none">
                    <Button
                        onClick={() => setIsRekapOpen(true)}
                        title="Tampilkan Rekap Pembangunan"
                        className="pointer-events-auto w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-2xl border border-blue-500 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center backdrop-blur-md group"
                    >
                        <ChevronDown className="w-5 h-5 rotate-180 group-hover:scale-110 transition-transform" />
                    </Button>
                </div>
            )}

            {/* Bottom Sheet for Rekap Data */}
            <Sheet open={isRekapOpen} onOpenChange={setIsRekapOpen}>
                <SheetContent side="bottom" className="h-[auto] max-h-[85vh] rounded-t-[32px] border-t-0 p-0 overflow-hidden shadow-2xl">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />

                    <div className="p-6 pt-10 md:px-12 bg-white dark:bg-slate-900">
                        <SheetHeader className="p-0 mb-4 text-left">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                        <Activity className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Ringkasan Infrastruktur</span>
                                    </div>
                                    <SheetTitle className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                        {rekapData?.nama_desa}
                                    </SheetTitle>
                                    <SheetDescription className="text-slate-500 dark:text-slate-400 font-medium">
                                        Kecamatan {rekapData?.nama_kecamatan} • Kabupaten Bojonegoro
                                    </SheetDescription>
                                </div>
                                <Badge
                                    className={cn(
                                        "w-fit px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border-2 shadow-lg",
                                        rekapData?.status_pembangunan === 'Sudah Tuntas'
                                            ? "bg-green-500 hover:bg-green-600 border-green-200 text-white"
                                            : "bg-orange-500 hover:bg-orange-600 border-orange-200 text-white"
                                    )}
                                >
                                    {rekapData?.status_pembangunan === 'Sudah Tuntas' ? <CheckCircle2 className="w-3.5 h-3.5 mr-2 inline" /> : <AlertCircle className="w-3.5 h-3.5 mr-2 inline" />}
                                    {rekapData?.status_pembangunan}
                                </Badge>
                            </div>
                        </SheetHeader>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-6">
                            <Card className="border-0 shadow-sm bg-slate-50 dark:bg-slate-800/40 rounded-xl overflow-hidden">
                                <CardHeader className="p-3 pb-0.5 space-y-0 text-center">
                                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Panjang Jalan Desa</CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 pt-0 text-center">
                                    <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                                        {((rekapData?.total_panjang_aset || 0) / 1000).toFixed(2)}
                                        <span className="text-[10px] ml-1 text-slate-400 font-bold">km</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-sm bg-slate-50 dark:bg-slate-800/40 rounded-xl overflow-hidden">
                                <CardHeader className="p-3 pb-0.5 space-y-0 text-center">
                                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Naik Status Kabupaten</CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 pt-0 text-center">
                                    <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                                        {((rekapData?.total_panjang_puk || 0) / 1000).toFixed(2)}
                                        <span className="text-[10px] ml-1 text-slate-400 font-bold">km</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-sm bg-blue-50/50 dark:bg-blue-900/10 rounded-xl overflow-hidden border border-blue-100 dark:border-blue-900/20">
                                <CardHeader className="p-3 pb-0.5 space-y-0 text-center">
                                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Jalan Desa Sekarang</CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 pt-0 text-center">
                                    <div className="text-2xl font-black text-blue-700 dark:text-blue-300 tabular-nums">
                                        {((rekapData?.sisa_intervensi || 0) / 1000).toFixed(2)}
                                        <span className="text-[10px] ml-1 text-blue-400 font-bold">km</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-sm bg-orange-50/50 dark:bg-orange-900/10 rounded-xl overflow-hidden border border-orange-100 dark:border-orange-900/20">
                                <CardHeader className="p-3 pb-0.5 space-y-0 text-center">
                                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">Belum Tertangani</CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 pt-0 text-center">
                                    <div className="text-2xl font-black text-orange-700 dark:text-orange-300 tabular-nums">
                                        {((rekapData?.selisih || 0) / 1000).toFixed(2)}
                                        <span className="text-[10px] ml-1 text-orange-400 font-bold">km</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/30 px-6 py-5 rounded-[24px] mb-4 border border-slate-100 dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progress Pembangunan Keseluruhan</span>
                                <span className="text-base font-black text-blue-600 dark:text-blue-400">
                                    {Math.round(((rekapData?.total_panjang_dibangun || 0) / (rekapData?.sisa_intervensi || 1)) * 100)}%
                                </span>
                            </div>
                            <Progress
                                value={((rekapData?.total_panjang_dibangun || 0) / (rekapData?.sisa_intervensi || 1)) * 100}
                                className="h-2.5 bg-slate-200 dark:bg-slate-700"
                            />
                        </div>

                        <SheetFooter className="p-0 sm:justify-start">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsRekapOpen(false)}
                                className="w-full md:w-auto h-12 px-8 rounded-2xl border-2 font-bold uppercase tracking-widest text-xs hover:bg-slate-100 transition-all"
                            >
                                Close
                            </Button>
                        </SheetFooter>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
