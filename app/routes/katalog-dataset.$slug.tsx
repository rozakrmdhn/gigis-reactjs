import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { geonodeService, type GeoNodeResource } from "~/features/katalog/services/geonode.service";
import { OpenLayersMap, type OpenLayersMapRef, type MapLayerConfig } from "~/features/peta/components/OpenLayersMap";
import { MapLegend } from "~/features/peta/components/MapLegend";
import {
    ArrowLeft,
    Layers,
    Info,
    Map as MapIcon,
    Database,
    Share2,
    Globe,
    ExternalLink,
    Hash,
    Link as LinkIcon,
    Check,
    FileJson,
    FileText,
    FileArchive,
    Code,
    FileImage,
    Calendar,
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    X,
    Eye,
    EyeOff,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { TooltipProvider } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import type { MetaFunction } from "react-router";

import { BasemapToggle } from "~/features/monitoring/components/BasemapToggle";
import { GeolocationControl } from "~/features/monitoring/components/GeolocationControl";

export const meta: MetaFunction = () => {
    return [
        { title: "Preview Dataset - GIGIS Monitoring" },
    ];
};

const BASEMAP_URLS: Record<string, string> = {
    'osm': 'osm',
    'google-road': 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    'google-sat': 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    'carto-light': 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    'carto-dark': 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    'satellite': 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

// Helper to get icon for link types
function getLinkIcon(link: { link_type: string; mime: string; extension: string }) {
    if (link.link_type === 'metadata') return FileText;
    if (link.link_type === 'image' || link.mime.includes('image')) return FileImage;
    if (link.link_type.includes('WMS') || link.link_type.includes('WFS')) return Globe;
    if (link.extension === 'json' || link.extension === 'geojson') return FileJson;
    if (link.extension === 'zip' || link.extension === 'shp') return FileArchive;
    if (link.extension === 'xml') return Code;
    if (link.link_type === 'data') return Database;
    return ExternalLink;
}

// Format date helper
function formatDate(dateStr?: string) {
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    } catch {
        return dateStr;
    }
}

export default function DatasetPreviewPage() {
    const { slug } = useParams();
    const id = slug?.split('-')[0];
    const navigate = useNavigate();
    const mapRef = useRef<OpenLayersMapRef>(null);

    const [dataset, setDataset] = useState<GeoNodeResource | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeBasemapId, setActiveBasemapId] = useState('osm');
    const [isCopied, setIsCopied] = useState(false);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'links'>('info');
    const [layerOpacity, setLayerOpacity] = useState(1);
    const [layerVisible, setLayerVisible] = useState(true);
    const [showOpacitySlider, setShowOpacitySlider] = useState(false);
    const [selectedFeatureData, setSelectedFeatureData] = useState<any>(null);
    const [isMobile, setIsMobile] = useState(false);
    // Removed isLegendMinimized as it's now internal to MapLegend component

    // Derived: Find legend URL from dataset links
    const legendUrl = dataset?.links?.find(l =>
        l.link_type?.toLowerCase() === 'legend' ||
        l.name?.toLowerCase().includes('legend')
    )?.url;

    // Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Open panel by default on desktop on mount
    useEffect(() => {
        if (window.innerWidth >= 768) {
            setIsPanelOpen(true);
        }
    }, []);

    // Store the raw OL Map instance for geolocation
    const [olMap, setOlMap] = useState<any>(null);
    const mapCallbackRef = useCallback(() => {
        // Small delay to let the OpenLayersMap initialize
        setTimeout(() => {
            if (mapRef.current) {
                setOlMap(mapRef.current.getMap());
            }
        }, 500);
    }, []);

    useEffect(() => {
        mapCallbackRef();
    }, [mapCallbackRef]);

    const handleCopyLink = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        setIsCopied(true);
        toast.success("Link berhasil disalin!", {
            description: "URL dataset telah disalin ke clipboard.",
            icon: <LinkIcon className="h-4 w-4 text-emerald-500" />,
        });
        setTimeout(() => setIsCopied(false), 2000);
    };

    useEffect(() => {
        const fetchDetail = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const data = await geonodeService.getDatasetDetail(id);
                setDataset(data);
            } catch (error) {
                console.error("Failed to load dataset detail:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDetail();
    }, [id]);

    const layers: MapLayerConfig[] = dataset ? [
        {
            id: `geonode-${dataset.pk}`,
            title: dataset.title,
            type: 'wms',
            url: `${window.location.origin}/proxy/geoserver/wms`,
            params: {
                'LAYERS': dataset.alternate,
                'TILED': true,
            },
            visible: layerVisible,
            opacity: layerOpacity,
            zIndex: 100
        }
    ] : [];

    // Zoom to bbox when dataset loaded
    useEffect(() => {
        if (dataset && dataset.ll_bbox && mapRef.current) {
            const centerLon = (dataset.ll_bbox[0] + dataset.ll_bbox[2]) / 2;
            const centerLat = (dataset.ll_bbox[1] + dataset.ll_bbox[3]) / 2;
            mapRef.current.zoomToCoordinate(centerLon, centerLat, 12);
        }
    }, [dataset]);

    // Metadata items for display
    const metadataItems = dataset ? [
        { label: 'ID', value: `#${dataset.pk}`, icon: Hash },
        { label: 'Workspace', value: dataset.alternate?.split(':')[0] || '-', icon: Database },
        { label: 'SRID', value: dataset.srid || '-', icon: Globe },
        { label: 'Dibuat', value: formatDate(dataset.created), icon: Calendar },
        ...(dataset.category ? [
            { label: 'Kategori', value: dataset.category.identifier || '-', icon: Layers },
        ] : []),
    ] : [];

    return (
        <TooltipProvider>
            <div className="h-[100dvh] w-full flex flex-col bg-slate-950 overflow-hidden fixed inset-0">
                {/* ─── Full-bleed Map Background ─── */}
                <div className="absolute inset-0 z-0">
                    <OpenLayersMap
                        ref={mapRef}
                        className="w-full h-full"
                        basemapUrl={BASEMAP_URLS[activeBasemapId]}
                        layers={layers}
                        showBatasDesa={false}
                        showJalanUtama={false}
                        showSegmenJalan={false}
                        onFeatureSelect={(props) => {
                            if (window.innerWidth < 768) {
                                setSelectedFeatureData(props);
                                setIsPanelOpen(false);
                            } else {
                                // On desktop, clear bottom sheet state if it was open
                                setSelectedFeatureData(null);
                            }
                        }}
                        disablePopup={isMobile}
                    />
                </div>

                {/* ─── Feature Attribute Bottom Sheet (Mobile ONLY) ─── */}
                {isMobile && selectedFeatureData && (
                    <div className={cn(
                        "absolute z-40 transition-all duration-500 ease-in-out",
                        // Desktop: Floating panel on the right side (above controls)
                        "md:bottom-4 md:right-4 md:w-[350px]",
                        // Mobile: Full bottom sheet
                        "inset-x-0 bottom-0 md:inset-x-auto",
                        "animate-in slide-in-from-bottom-full duration-500"
                    )}>
                        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/50 dark:border-slate-700/50 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] dark:shadow-black/60 rounded-t-[32px] md:rounded-2xl overflow-hidden flex flex-col max-h-[70vh] md:max-h-[500px]">
                            {/* Drag Handle (Mobile only) */}
                            <div className="flex items-center justify-center py-2 md:hidden shrink-0">
                                <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                            </div>

                            {/* Header */}
                            <div className="px-5 pt-2 md:pt-5 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/20">
                                        <Database size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-[13px] font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tight">Atribut Data</h3>
                                        <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 uppercase tracking-widest">Detail Fitur Spasial</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSelectedFeatureData(null)}
                                    className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <X size={16} />
                                </Button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar bg-slate-50/30 dark:bg-slate-900/30">
                                <div className="grid grid-cols-1 gap-2.5">
                                    {Object.entries(selectedFeatureData).map(([key, value]) => {
                                        // Skip internal/hidden properties or geometry
                                        if (key.startsWith('_') || key === 'geometry' || key === 'bbox' || typeof value === 'object') return null;
                                        return (
                                            <div key={key} className="group p-3.5 rounded-2xl bg-white/60 dark:bg-slate-800/40 border border-white/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/30 transition-all duration-300">
                                                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 group-hover:text-blue-600 transition-colors">
                                                    {key.replace(/_/g, ' ')}
                                                </p>
                                                <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 break-words leading-snug">
                                                    {value === null || value === undefined || String(value).trim() === '' ? '-' : String(value)}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Footer spacing for mobile */}
                            <div className="h-4 md:hidden shrink-0" />
                        </div>
                    </div>
                )}

                {/* ─── Loading Overlay ─── */}
                {isLoading && (
                    <div className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                                <div className="h-10 w-10 border-[3px] border-white/20 rounded-full" />
                                <div className="absolute inset-0 h-10 w-10 border-[3px] border-white border-t-transparent rounded-full animate-spin" />
                            </div>
                            <span className="text-xs font-semibold text-white/80 tracking-widest uppercase">Memuat Dataset...</span>
                        </div>
                    </div>
                )}

                {/* ─── Top Navigation Bar (Floating) ─── */}
                <div className="relative z-30 px-3 pt-3 md:px-4 md:pt-4 shrink-0">
                    <div className="flex items-center justify-between bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl px-3 py-2.5 md:px-4 shadow-lg shadow-black/5 dark:shadow-black/20 border border-white/50 dark:border-slate-700/50">
                        {/* Left: Back + Title */}
                        <div className="flex items-center gap-2.5 min-w-0">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(-1)}
                                className="h-8 w-8 rounded-xl shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <ArrowLeft size={16} />
                            </Button>
                            <div className="min-w-0">
                                <h1 className="text-[13px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                                    {dataset?.title || "Memuat..."}
                                </h1>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                    <Globe size={9} />
                                    <span className="font-medium">Preview Dataset</span>
                                    {dataset?.resource_type && (
                                        <>
                                            <span className="text-slate-300 dark:text-slate-600">·</span>
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 uppercase text-[9px]">{dataset.resource_type}</span>
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleCopyLink}
                                className={cn(
                                    "h-8 w-8 rounded-xl transition-all",
                                    isCopied
                                        ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30"
                                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                                title="Bagikan"
                            >
                                {isCopied ? <Check size={15} /> : <Share2 size={15} />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsPanelOpen(!isPanelOpen)}
                                className={cn(
                                    "h-8 w-8 rounded-xl transition-all",
                                    isPanelOpen
                                        ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30"
                                        : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                                title="Toggle Info"
                            >
                                {isPanelOpen ? <X size={15} /> : <Info size={15} />}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* ─── Basemap Toggle ─── */}
                <div className={cn(
                    "absolute z-30 transition-all duration-300",
                    isPanelOpen
                        ? "bottom-4 right-4 md:bottom-4 md:right-4"
                        : "bottom-4 right-4"
                )}>
                    <BasemapToggle
                        activeBasemap={activeBasemapId}
                        onBasemapChange={setActiveBasemapId}
                    />
                </div>

                {/* ─── Layer Control Group ─── */}
                <div className={cn(
                    "absolute z-20 transition-all duration-300",
                    "bottom-24 right-4 flex flex-col items-end gap-2"
                )}>
                    {/* Opacity Slider Popup (Floats to the left of buttons) */}
                    {showOpacitySlider && (
                        <div className="absolute right-12 bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 dark:border-slate-700/50 p-3 w-48 animate-in slide-in-from-right-4 fade-in duration-300">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Opacity</span>
                                <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 tabular-nums">{Math.round(layerOpacity * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={Math.round(layerOpacity * 100)}
                                onChange={(e) => setLayerOpacity(Number(e.target.value) / 100)}
                                className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:transition-transform active:[&::-webkit-slider-thumb]:scale-125"
                            />
                        </div>
                    )}

                    {/* Vertical Button Stack */}
                    <div className="flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-1.5 rounded-2xl border border-white/50 dark:border-slate-700/50 shadow-2xl gap-1">
                        <GeolocationControl
                            map={olMap}
                        />

                        <div className="h-px bg-slate-100 dark:bg-slate-800 mx-1.5" />

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setLayerVisible(!layerVisible);
                                if (!layerVisible && layerOpacity === 0) setLayerOpacity(1);
                            }}
                            className={cn(
                                "h-9 w-9 rounded-xl transition-all duration-300",
                                layerVisible
                                    ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30"
                                    : "text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            )}
                            title={layerVisible ? "Sembunyikan Layer" : "Tampilkan Layer"}
                        >
                            {layerVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                        </Button>

                        <div className="h-px bg-slate-100 dark:bg-slate-800 mx-1.5" />

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowOpacitySlider(!showOpacitySlider)}
                            className={cn(
                                "h-9 w-9 rounded-xl transition-all duration-300",
                                showOpacitySlider
                                    ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30"
                                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                            title="Atur Opacity"
                        >
                            <Layers size={16} />
                        </Button>
                    </div>
                </div>

                <MapLegend 
                    legendUrls={legendUrl ? [legendUrl] : []} 
                    className={cn(
                        "md:bottom-6 transition-all duration-500",
                        isPanelOpen ? "md:left-[392px]" : "md:left-6",
                        "left-4 bottom-24 md:bottom-6"
                    )}
                />
                {/* ─── Info Panel (Desktop: Floating Card | Mobile: Bottom Sheet) ─── */}
                <div className={cn(
                    "absolute z-20 transition-all duration-300 ease-in-out pointer-events-none",
                    // Desktop: Floating card on the left
                    "md:top-20 md:left-4 md:bottom-4 md:w-[380px]",
                    // Mobile: Bottom sheet
                    "inset-x-0 bottom-0 md:inset-x-auto",
                    // Visibility logic for mobile
                    !isPanelOpen && "translate-y-full opacity-0 md:translate-y-0 md:opacity-100"
                )}>
                    {/* Desktop Toggle Button (Attached to panel side) */}
                    <div className="hidden md:block absolute top-1/2 -translate-y-1/2 left-full z-50 pointer-events-auto">
                        <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => setIsPanelOpen(!isPanelOpen)}
                            className={cn(
                                "h-16 rounded-l-none rounded-r-2xl border-l-0 shadow-2xl transition-all duration-300 ease-in-out group flex items-center justify-center overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200 dark:border-slate-700",
                                isPanelOpen
                                    ? "w-6"
                                    : "w-10 -translate-x-[calc(380px+1rem)] shadow-black/20"
                            )}
                        >
                            {isPanelOpen ? (
                                <ChevronLeft size={16} className="text-slate-600 dark:text-slate-400 group-hover:text-blue-600 transition-colors" />
                            ) : (
                                <ChevronRight size={20} className="text-slate-600 dark:text-slate-400 group-hover:text-blue-600 transition-colors" />
                            )}
                        </Button>
                    </div>

                    <div className={cn(
                        "bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-2xl shadow-black/10 dark:shadow-black/40 flex flex-col overflow-hidden transition-all duration-300 ease-in-out pointer-events-auto",
                        // Desktop: full height card
                        "md:rounded-2xl md:h-full",
                        // Mobile: bottom sheet style
                        "rounded-t-[20px] max-h-[70vh] md:max-h-none",
                        // Desktop Hide Logic
                        !isPanelOpen && "md:-translate-x-[calc(100%+4rem)] md:opacity-0"
                    )}>
                        {/* ─── Drag Handle (Mobile only) ─── */}
                        <div className="flex items-center justify-center py-2 md:hidden shrink-0">
                            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                        </div>

                        {/* ─── Tab Switcher ─── */}
                        <div className="px-4 pb-2 pt-1 md:pt-3 shrink-0">
                            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl p-1">
                                <button
                                    onClick={() => setActiveTab('info')}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all",
                                        activeTab === 'info'
                                            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                                    )}
                                >
                                    <Info size={13} />
                                    Informasi
                                </button>
                                <button
                                    onClick={() => setActiveTab('links')}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all",
                                        activeTab === 'links'
                                            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                                    )}
                                >
                                    <LinkIcon size={13} />
                                    Links
                                    {dataset?.links && (
                                        <span className="text-[9px] bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full font-bold">
                                            {dataset.links.length}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* ─── Scrollable Content ─── */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">

                            {/* === INFO TAB === */}
                            {activeTab === 'info' && (
                                <div className="px-4 pb-4 space-y-4">
                                    {/* Thumbnail */}
                                    <div className="relative aspect-[16/9] rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden group">
                                        {dataset?.thumbnail_url ? (
                                            <img
                                                src={dataset.thumbnail_url.startsWith('http') ? dataset.thumbnail_url : `https://saggaserv.my.id${dataset.thumbnail_url}`}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                alt="Dataset Thumbnail"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                                                <MapIcon size={36} strokeWidth={1.5} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                                    </div>

                                    {/* Title */}
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                                            {dataset?.title}
                                        </h2>
                                    </div>

                                    {/* Abstract */}
                                    {dataset?.abstract && (
                                        <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                            {dataset.abstract}
                                        </p>
                                    )}

                                    {/* Metadata Grid */}
                                    <div className="grid grid-cols-2 gap-2">
                                        {metadataItems.map((item) => (
                                            <div
                                                key={item.label}
                                                className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                                            >
                                                <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                                                    <item.icon size={13} className="text-slate-400 dark:text-slate-500" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{item.label}</p>
                                                    <p className="text-[12px] font-bold text-slate-800 dark:text-slate-200 truncate">{item.value}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Category Description */}
                                    {dataset?.category?.gn_description && (
                                        <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                                            <p className="text-[9px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider mb-1">Deskripsi Kategori</p>
                                            <p className="text-[12px] text-blue-700 dark:text-blue-300 leading-relaxed">
                                                {dataset.category.gn_description}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* === LINKS TAB === */}
                            {activeTab === 'links' && (
                                <div className="px-4 pb-4 space-y-2">
                                    {dataset?.links && dataset.links.length > 0 ? (
                                        dataset.links.map((link, index) => {
                                            const Icon = getLinkIcon(link);
                                            return (
                                                <button
                                                    key={index}
                                                    onClick={() => window.open(link.url, '_blank')}
                                                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20 dark:hover:border-blue-800/50 transition-all group text-left"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-800/50 group-hover:border-blue-200 dark:group-hover:border-blue-700 transition-colors">
                                                        <Icon size={14} className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                                                            {link.name}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase">
                                                                {link.link_type}
                                                            </span>
                                                            {link.extension && (
                                                                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded uppercase">
                                                                    {link.extension}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <ExternalLink size={12} className="text-slate-300 group-hover:text-blue-400 shrink-0 transition-colors" />
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-600">
                                            <LinkIcon size={32} strokeWidth={1.5} />
                                            <p className="text-xs font-medium mt-3">Tidak ada link tersedia</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ─── Bottom Action ─── */}
                        <div className="p-3 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-white/50 dark:bg-slate-900/50">
                            <Button
                                className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-[11px] gap-2 shadow-lg transition-all active:scale-[0.98]"
                                onClick={() => window.open(`${dataset?.detail_url}`, '_blank')}
                            >
                                <ExternalLink size={14} />
                                Lihat di GeoNode
                            </Button>
                        </div>
                    </div>
                </div>

                {/* ─── Mobile FAB to open panel when closed ─── */}
                {!isPanelOpen && (
                    <button
                        onClick={() => setIsPanelOpen(true)}
                        className="absolute bottom-4 left-4 z-20 md:hidden h-12 px-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-lg shadow-black/10 border border-white/50 dark:border-slate-700/50 flex items-center gap-2 transition-all active:scale-95 hover:shadow-xl"
                    >
                        <Info size={16} className="text-blue-600 dark:text-blue-400" />
                        <span className="text-[11px] font-semibold text-slate-900 dark:text-white">Detail</span>
                        <ChevronUp size={14} className="text-slate-400" />
                    </button>
                )}
            </div>
        </TooltipProvider>
    );
}
