import React, { useEffect, useRef, useState, useCallback, useMemo, type MutableRefObject } from "react";
import { createPortal } from "react-dom";
import OLMap from "ol/Map";
import Feature from "ol/Feature";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import TileWMS from "ol/source/TileWMS";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Draw, Modify, Snap, Select } from "ol/interaction";
import { createBox } from "ol/interaction/Draw";
import { defaults as defaultControls } from "ol/control";
import GeoJSON from "ol/format/GeoJSON";
import { fromLonLat, toLonLat } from "ol/proj";
import { createEmpty as createEmptyExtent, extend as extendExtent, isEmpty as isEmptyExtent } from 'ol/extent';
import { getLength } from 'ol/sphere';
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from "ol/style";
import { altKeyOnly, click } from "ol/events/condition";
import Overlay from "ol/Overlay";
import * as turf from "@turf/turf";
import { LineString, Polygon, MultiPoint, Point, MultiLineString } from "ol/geom";
import "ol/ol.css";
import "./map.css";

import {
    Square,
    Type,
    MousePointer2,
    Trash2,
    Download,
    Circle as CircleIcon,
    Pentagon,
    Minus,
    Save,
    Eraser,
    Map as MapIcon,
    X,
    Maximize2,
    Check,
    List,
    Layers,
    ChevronUp,
    ChevronDown,
    Copy,
    Loader2,
    Database,
    Sparkles,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuShortcut,
} from "~/components/ui/context-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";
import { toast } from "sonner";
import { DrawSidebar } from "~/features/monitoring/components/DrawSidebar";
import { DrawFormPanel } from "~/features/monitoring/components/DrawFormPanel";
import { MapControls } from "~/features/monitoring/components/MapControls";
import { DrawControls, type DrawMode } from "~/features/monitoring/components/DrawControls";
import { GeonodeDatasetPanel } from "~/features/peta/components/GeonodeDatasetPanel";
import { RoadSegmentsPanel } from "~/features/monitoring/components/RoadSegmentsPanel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { useIsMobile } from "~/hooks/use-mobile";
import { monitoringService, type MonitoringJalanResult } from "~/features/monitoring/services/monitoring.service";
import { kecamatanService } from "~/services/kecamatan";
import { DrawEditFormPanel } from "~/features/monitoring/components/DrawEditFormPanel";
import { LayerToggle } from "~/features/monitoring/components/LayerToggle";
import { LayerTogglePanel } from "~/features/monitoring/components/LayerTogglePanel";
import { BasemapToggle } from "~/features/monitoring/components/BasemapToggle";
import { GeolocationControl } from "~/features/monitoring/components/GeolocationControl";
import { MonitoringProgressPanel } from "~/features/monitoring/components/MonitoringProgressPanel";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
    return [
        { title: "Editor Peta - GIGIS Monitoring" },
        { name: "description", content: "Editor Peta Infrastruktur Jalan Poros Desa Bojonegoro" },
    ];
};

// Performance Optimization: Reusable static instances and helpers
const geojsonFormat = new GeoJSON();

const BASEMAPS = {
    'osm': {
        name: 'OpenStreetMap',
        source: new OSM({ crossOrigin: 'anonymous' }),
    },
    'google-road': {
        name: 'Google Maps',
        source: new XYZ({
            url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
            attributions: '© Google',
            crossOrigin: 'anonymous'
        })
    },
    'google-sat': {
        name: 'Google Satellite',
        source: new XYZ({
            url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
            attributions: '© Google',
            crossOrigin: 'anonymous'
        })
    },
    'carto-light': {
        name: 'Positron Light',
        source: new XYZ({
            url: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            attributions: '© CARTO',
            crossOrigin: 'anonymous'
        })
    },
    'carto-dark': {
        name: 'Dark Matter',
        source: new XYZ({
            url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
            attributions: '© CARTO',
            crossOrigin: 'anonymous'
        })
    },
    'satellite': {
        name: 'Esri Satellite',
        source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attributions: '© Esri',
            crossOrigin: 'anonymous'
        })
    }
};

type BasemapId = keyof typeof BASEMAPS;

function throttle<T extends (...args: any[]) => any>(func: T, limit: number): T {
    let inThrottle = false;
    return ((...args: any[]) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    }) as T;
}

const getConditionColor = (kondisi: string = "baik") => {
    const k = kondisi.toLowerCase().replace(/_/g, ' ');
    if (k.includes("rusak berat")) return "#f43f5e"; // rose 500
    if (k.includes("rusak ringan")) return "#f59e0b"; // amber 500
    if (k.includes("sedang")) return "#3b82f6"; // blue 500
    return "#22c55e"; // emerald 500
};

// Optimization: Style Cache to prevent creating thousands of style objects
const vectorStyleCache: Record<string, any> = {};

const getOptimizedSegmentStyle = (feature: any, resolution: number, selectedDesaId: string | null = null, filters: any = null, selectedRoad: any = null) => {
    const props = feature.getProperties();

    // Optimization: Filter out features that don't match selected desa
    if (selectedDesaId && selectedDesaId !== "all") {
        const fDesaId = getFeatureDesaId(feature);
        // If the feature has a village ID and it doesn't match, hide it
        if (fDesaId && fDesaId.toString() !== selectedDesaId) {
            return null;
        }
    }

    // New: Filter out features that don't match selected road if one is selected
    if (selectedRoad && selectedRoad.jalan) {
        const fKodeRuas = props.kode_ruas || props.KODE_RUAS;
        const targetKodeRuas = selectedRoad.jalan.kode_ruas;
        
        // Only hide if it has a kode_ruas and it doesn't match
        // (Don't hide village boundaries here as they are handled by desaLayer)
        if (fKodeRuas && targetKodeRuas && fKodeRuas.toString() !== targetKodeRuas.toString()) {
            return null;
        }
    }

    // Filter by segment filters
    if (filters && !props.is_base_jalan) {
        // Only apply filters if the feature is a segment (has status_kondisi or kondisi)
        // or if it's explicitly marked as a segment
        const hasStatus = props.status_kondisi !== undefined;
        const hasKondisi = (props.kondisi || props.KONDISI) !== undefined;

        if (filters.status_kondisi !== 'all' && hasStatus) {
            if (props.status_kondisi !== filters.status_kondisi) return null;
        }
        
        if (filters.kondisi !== 'all' && hasKondisi) {
            const currentKondisi = (props.kondisi || props.KONDISI || "").toLowerCase().replace(/_/g, ' ');
            const targetKondisi = filters.kondisi.toLowerCase().replace(/_/g, ' ');
            if (!currentKondisi.includes(targetKondisi)) return null;
        }
    }
    
    // Always clear cache when filters are active to ensure fresh state
    const filtersKey = filters ? `${filters.kondisi}-${filters.status_kondisi}` : 'no-filter';

    const { color, lineDash } = getSegmentStyleProps(feature);
    const label = feature.get("tahun_pembangunan") || feature.get("status_jalan") || "";
    const cacheKey = `${color}-${lineDash?.join(',')}-${resolution < 10 ? label : 'no-label'}-${selectedDesaId || 'no-filter'}-${filtersKey}`;

    if (vectorStyleCache[cacheKey]) return vectorStyleCache[cacheKey];

    const styles = [
        new Style({
            stroke: new Stroke({ 
                color, 
                width: resolution < 5 ? 6 : (resolution < 20 ? 4 : 2), // Adaptive width
                lineDash, 
                lineJoin: 'round', 
                lineCap: 'round' 
            }),
        })
    ];

    if (resolution < 10 && label) {
        styles.push(new Style({
            text: new Text({
                text: label.toString(),
                font: "bold 10px sans-serif",
                fill: new Fill({ color: "#fff" }),
                stroke: new Stroke({ color: color, width: 2 }),
                offsetY: -10
            })
        }));
    }

    vectorStyleCache[cacheKey] = styles;
    return styles;
};

const getSegmentStyleProps = (feature: any) => {
    const props = feature.getProperties();
    const checkMelarosa = props.check_melarosa;
    const statusJalan = props.status_jalan;
    const kondisi = (props.kondisi || props.KONDISI || 'baik').toLowerCase();
    const isBase = props.is_base_jalan;

    let color = '#22c55e'; // Default Green (Baik)
    let lineDash: number[] | undefined = undefined;

    if (isBase) {
        color = '#FFA500'; // Orange for Ruas Utama
    } else if (statusJalan === 'Jalan Desa') {
        // Category 1 & 2
        if (kondisi === 'baik') color = '#22c55e';
        else if (kondisi === 'sedang') color = '#f59e0b'; // Orange
        else if (kondisi.includes('rusak ringan') || kondisi.includes('rusak_ringan') || kondisi.includes('rusak berat') || kondisi.includes('rusak_berat')) color = '#ef4444'; // Merah

        if (checkMelarosa === 'Tidak') {
            lineDash = [6, 6]; // Dashed
        }
    } else if (statusJalan === 'Jalan Kabupaten') {
        // Category 3
        if (kondisi === 'baik') {
            color = '#2563eb'; // Biru
            lineDash = undefined;
        } else if (kondisi === 'sedang') {
            color = '#60a5fa'; // Biru Muda
            lineDash = undefined;
        } else if (kondisi.includes('rusak')) {
            color = '#2563eb'; // Biru
            lineDash = [6, 6]; // Dashed
        }
    } else {
        // Default color for environments or while drawing if no status_jalan specified
        color = getConditionColor(kondisi);
        if (props.is_lingkungan_segment) {
            lineDash = [6, 6];
        }
    }

    return { color, lineDash };
};

const getFeatureDesaId = (f: any) => {
    const props = f.getProperties();
    return props.id_desa || props.ID_DESA || props.desa_id || props.DESA_ID || props.id_desa_2 || props.kode_desa || props.KODE_DESA;
};

export default function DrawPage() {
    const mapElement = useRef<HTMLDivElement>(null);
    const mapRef = useRef<OLMap | null>(null);
    const sourceRef = useRef<VectorSource | null>(null);
    const existingSourceRef = useRef<VectorSource | null>(null);
    const ruasUtamaSourceRef = useRef<VectorSource | null>(null);
    const segmenDesaSourceRef = useRef<VectorSource | null>(null);
    const jalanKabupatenSourceRef = useRef<VectorSource | null>(null);
    const hoverSourceRef = useRef<VectorSource | null>(null);
    const hoverLayerRef = useRef<VectorLayer | null>(null);
    const lastHoveredFeatureId = useRef<string | number | null>(null);
    const desaSourceRef = useRef<VectorSource | null>(null);
    const staSourceRef = useRef<VectorSource | null>(null);

    const ruasUtamaLayerRef = useRef<VectorLayer | null>(null);
    const segmenDesaLayerRef = useRef<VectorLayer | null>(null);
    const jalanKabupatenLayerRef = useRef<VectorLayer | null>(null);
    const desaLayerRef = useRef<VectorLayer | null>(null);
    const staLayerRef = useRef<VectorLayer | null>(null);
    const existingLayerRef = useRef<VectorLayer | null>(null); // Deprecated, but keep for now if needed for other refs
    const vectorLayerRef = useRef<VectorLayer | null>(null);

    const nonBaseSourceRef = useRef<VectorSource | null>(null);
    const nonBaseLayerRef = useRef<VectorLayer | null>(null);
    const roadDesaWmsLayerRef = useRef<TileLayer<TileWMS> | null>(null);
    const jalanKabupatenWmsLayerRef = useRef<TileLayer<TileWMS> | null>(null);
    const searchSourceRef = useRef<VectorSource | null>(null);
    const highlightSourceRef = useRef<VectorSource | null>(null);
    const highlightLayerRef = useRef<VectorLayer | null>(null);
    const pulseOverlayRef = useRef<Overlay | null>(null);
    const pulseElementRef = useRef<HTMLDivElement | null>(null);
    const vectorPopupRef = useRef<Overlay | null>(null);
    const vectorPopupElementRef = useRef<HTMLDivElement | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [mode, setMode] = useState<DrawMode>("view");
    const [selectedRoad, setSelectedRoad] = useState<MonitoringJalanResult | null>(null);
    const selectedRoadRef = useRef(selectedRoad);
    useEffect(() => {
        selectedRoadRef.current = selectedRoad;
    }, [selectedRoad]);
    const [rightClickedFeature, setRightClickedFeature] = useState<Feature | null>(null);
    const [isContinuing, setIsContinuing] = useState(false);
    const [isPanelVisible, setIsPanelVisible] = useState(false);
    const [segmentPanelVisible, setSegmentPanelVisible] = useState(false);
    const [featuresList, setFeaturesList] = useState<any[]>([]);
    const [segmentFilters, setSegmentFilters] = useState({ kondisi: 'all', status_kondisi: 'all' });
    const segmentFiltersRef = useRef(segmentFilters);

    useEffect(() => {
        segmentFiltersRef.current = segmentFilters;
    }, [segmentFilters]);
    const [drawnGeoJSON, setDrawnGeoJSON] = useState<string | null>(null);
    const [drawnLength, setDrawnLength] = useState<number>(0);
    const [isFetchingDetail, setIsFetchingDetail] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [hasTemporaryFeature, setHasTemporaryFeature] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);
    const [editingFeatureData, setEditingFeatureData] = useState<any>(null);
    const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
    const [isSegmentPanelOpen, setIsSegmentPanelOpen] = useState(true);
    const [isMonitoringPanelVisible, setIsMonitoringPanelVisible] = useState(false);
    const [selectedSegmentForMonitoring, setSelectedSegmentForMonitoring] = useState<any | null>(null);
    const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(false);
    const [checkedRoadIds, setCheckedRoadIds] = useState<string[]>([]);
    const [visibleLayers, setVisibleLayers] = useState([
        { id: "ruas-utama", label: "Jalan Poros Desa", visible: true, color: "#FFA500", category: "Base Layer" },
        { id: "segmen-desa", label: "Segmen Jalan Desa", visible: true, color: "#22c55e", category: "Dataset Segmen" },
        { id: "jalan-kabupaten", label: "Segmen Jalan Kabupaten", visible: true, color: "oklch(0.546 0.245 262.881)", category: "Dataset Segmen" },
        { id: "non-base", label: "Non Melarosa", visible: true, color: "#ef4444", lineDash: [6, 6], category: "Lainnya" },
        { id: "boundary-village", label: "Batas Desa", visible: true, color: "#7c3aed", lineDash: [4, 8], category: "Lainnya" },
        { id: "sta-markers", label: "Marker STA", visible: true, color: "#ef4444", category: "Lainnya" },
    ]);
    const [selectedDesaId, setSelectedDesaId] = useState<string | null>(null);
    const [selectedKecamatanId, setSelectedKecamatanId] = useState<string | null>("all");
    const [activeKecamatanName, setActiveKecamatanName] = useState<string | null>(null);

    useEffect(() => {
        if (!isMounted || !desaSourceRef.current || !highlightSourceRef.current) return;

        if (selectedDesaId && selectedDesaId !== "all") {
            const feature = desaSourceRef.current.getFeatures().find(f => {
                const fId = f.get("id") || f.getId();
                return fId?.toString() === selectedDesaId;
            });

            if (feature) {
                highlightSourceRef.current.clear();
                highlightSourceRef.current.addFeature(feature.clone());
            }
        } else {
            highlightSourceRef.current.clear();
        }
    }, [selectedDesaId, isMounted]);

    const [cursorCoords, setCursorCoords] = useState<{ lat: number, lng: number }>({ lat: -7.150975, lng: 111.881748 });
    const [contextMenuCoords, setContextMenuCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [lastCopiedCoords, setLastCopiedCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [selectedVectorInfo, setSelectedVectorInfo] = useState<{
        properties: any;
        coordinate: number[] | null;
        id?: string | number | null;
    } | null>(null);
    const [selectedVectorId, setSelectedVectorId] = useState<string | number | null>(null);
    const selectedVectorIdRef = useRef<string | number | null>(null);
    const modeRef = useRef<DrawMode>(mode);
    useEffect(() => {
        selectedVectorIdRef.current = selectedVectorId;
    }, [selectedVectorId]);
    useEffect(() => {
        modeRef.current = mode;
    }, [mode]);
    const [isPopupMinimized, setIsPopupMinimized] = useState(false);
    const [isPopupClosing, setIsPopupClosing] = useState(false);
    const [highlightedKey, setHighlightedKey] = useState<string | null>(null);
    const [isRoadInfoMinimized, setIsRoadInfoMinimized] = useState(false);
    const selectedDesaIdRef = useRef<string | null>(selectedDesaId);

    useEffect(() => {
        selectedDesaIdRef.current = selectedDesaId;
        // Trigger style re-calculation for all vector layers
        [ruasUtamaLayerRef, segmenDesaLayerRef, jalanKabupatenLayerRef, nonBaseLayerRef].forEach(ref => {
            ref.current?.changed();
        });
    }, [selectedDesaId, selectedRoad]);
    const [activeBasemap, setActiveBasemap] = useState<BasemapId>("carto-light");
    const [isCatalogOpen, setIsCatalogOpen] = useState(false);
    const [activeCatalogLayers, setActiveCatalogLayers] = useState<any[]>([]);
    const activeLayerIds = useMemo(() => activeCatalogLayers.map(l => l.id), [activeCatalogLayers]);

    const handleAddLayer = useCallback((layerConfig: any) => {
        if (!mapRef.current) return;

        // Check if layer already exists
        const existingLayers = mapRef.current.getLayers().getArray();
        const alreadyExists = existingLayers.find(l => l.get('id') === layerConfig.id);
        if (alreadyExists) {
            toast.info(`Layer ${layerConfig.title} sudah ada di peta`);
            return;
        }

        let newLayer;
        if (layerConfig.type === 'wms') {
            newLayer = new TileLayer({
                source: new TileWMS({
                    url: layerConfig.url.replace('https://saggaserv.my.id/geoserver', `${window.location.origin}/proxy/geoserver`),
                    params: {
                        ...layerConfig.params,
                        'TILED': true,
                        'TRANSPARENT': true,
                    },
                    serverType: 'geoserver',
                    crossOrigin: 'anonymous',
                }),
                opacity: layerConfig.opacity ?? 0.8,
                zIndex: layerConfig.zIndex ?? 10,
            });
        } else if (layerConfig.type === 'vector') {
            newLayer = new VectorLayer({
                source: new VectorSource({
                    features: new GeoJSON().readFeatures(layerConfig.data, {
                        featureProjection: 'EPSG:3857'
                    })
                }),
                zIndex: layerConfig.zIndex ?? 10,
            });
        }

        if (newLayer) {
            newLayer.set('id', layerConfig.id);
            newLayer.set('title', layerConfig.title);
            newLayer.set('type', layerConfig.type);
            mapRef.current.addLayer(newLayer);
            setActiveCatalogLayers(prev => [...prev, layerConfig]);

            // Add to visibleLayers to show in panel
            setVisibleLayers(prev => [
                {
                    id: layerConfig.id,
                    label: layerConfig.title,
                    visible: true,
                    color: layerConfig.type === 'vector' ? (layerConfig.style?.strokeColor || '#3b82f6') : undefined,
                    category: "Katalog",
                    url: layerConfig.url,
                    wmsParams: layerConfig.params
                },
                ...prev
            ]);

            toast.success(`Layer ${layerConfig.title} berhasil ditambahkan`);
        }
    }, []);

    const syncSegmentListFromMap = useCallback((options?: { desaId?: string | null, kodeRuas?: string | number | null }) => {
        const segments: any[] = [];
        const sources = [
            segmenDesaSourceRef.current,
            jalanKabupatenSourceRef.current,
            ruasUtamaSourceRef.current,
            nonBaseSourceRef.current
        ];

        sources.forEach(source => {
            if (source) {
                const features = source.getFeatures();
                features.forEach(f => {
                    // Only include actual segments, not markers, boundaries, or base road lines
                    if (!f.get("is_village_boundary") && !f.get("sta_label") && !f.get("is_base_jalan")) {
                        let match = true;
                        if (options?.desaId && options.desaId !== "all") {
                            const fDesaId = f.get("id_desa") || f.get("desa_id") || f.get("id_desa_2");
                            if (fDesaId?.toString() !== options.desaId) match = false;
                        }
                        
                        if (match && options?.kodeRuas) {
                            const fKodeRuas = f.get("kode_ruas") || f.get("KODE_RUAS") || f.get("kode_ruas_layer");
                            if (fKodeRuas?.toString() !== options.kodeRuas.toString()) match = false;
                        }

                        if (match) {
                            segments.push(f);
                        }
                    }
                });
            }
        });

        setFeaturesList(segments);
        if (segments.length > 0) {
            setSegmentPanelVisible(true);
            setIsSegmentPanelOpen(true);
        }
    }, []);

    useEffect(() => {
        if (isMounted) {
            syncSegmentListFromMap({ desaId: selectedDesaId });
        }
    }, [selectedDesaId, isMounted, syncSegmentListFromMap]);

    const handleRemoveLayer = useCallback((layerId: string) => {
        if (!mapRef.current) return;

        const layerToRemove = mapRef.current.getLayers().getArray().find(l => l.get('id') === layerId);
        if (layerToRemove) {
            mapRef.current.removeLayer(layerToRemove);
        }

        setVisibleLayers(prev => prev.filter(l => l.id !== layerId));
        setActiveCatalogLayers(prev => prev.filter(l => l.id !== layerId));
        toast.success("Layer berhasil dihapus");
    }, []);

    const handleApplyCQL = useCallback((layerId: string, cql: string) => {
        if (!mapRef.current) return;

        const layers = mapRef.current.getLayers().getArray();
        const layer = layers.find(l => l.get('id') === layerId);

        if (layer instanceof TileLayer) {
            const source = layer.getSource();
            if (source && source instanceof TileWMS) {
                source.updateParams({ 'CQL_FILTER': cql || undefined });
            }
        }

        setVisibleLayers(prev => prev.map(l => l.id === layerId ? { ...l, cql } : l));

        if (cql) {
            toast.success(`Filter CQL diterapkan pada ${layer?.get('title') || 'layer'}`);
        } else {
            toast.info("Filter CQL dikosongkan");
        }
    }, []);

    const tileLayerRef = useRef<TileLayer<any> | null>(null);
    const tooltipRef = useRef<Overlay | null>(null);
    const tooltipElementRef = useRef<HTMLDivElement | null>(null);
    const originalEditFeatureRef = useRef<any>(null);
    const lastLoadedDesaId = useRef<string | null>(null);
    const loadedBaseRoadIdRef = useRef<string | null>(null);
    const forceReloadBaseRoadRef = useRef<boolean>(false);
    const isMobile = useIsMobile();

    const getMapPadding = useCallback((extraTop = 0) => {
        const padding = [60 + extraTop, 60, 60, 60];
        if (!isMobile) {
            if (isSidebarOpen) padding[3] += 320;
            if (segmentPanelVisible && isSegmentPanelOpen) padding[1] += 320;
        }
        return padding;
    }, [isSidebarOpen, segmentPanelVisible, isSegmentPanelOpen, isMobile]);

    // Sidebar state initialization for mobile
    useEffect(() => {
        if (isMobile) {
            setIsSidebarOpen(false);
        }
    }, [isMobile]);

    // SSR Fix: Initialize browser-only components on mount
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Reset minimization when road changes
    useEffect(() => {
        setIsRoadInfoMinimized(false);
    }, [selectedRoad]);

    // Auto-collapse sidebar on mobile
    useEffect(() => {
        if (isMobile) {
            setIsSidebarOpen(false);
        }
    }, [isMobile]);

    // Initialize map and sources
    useEffect(() => {
        if (!isMounted || !mapElement.current) return;

        // Initialize Sources if null
        if (!sourceRef.current) sourceRef.current = new VectorSource();
        if (!existingSourceRef.current) existingSourceRef.current = new VectorSource();
        if (!ruasUtamaSourceRef.current) ruasUtamaSourceRef.current = new VectorSource();
        if (!segmenDesaSourceRef.current) segmenDesaSourceRef.current = new VectorSource();
        if (!jalanKabupatenSourceRef.current) jalanKabupatenSourceRef.current = new VectorSource();
        if (!nonBaseSourceRef.current) nonBaseSourceRef.current = new VectorSource();
        if (!searchSourceRef.current) searchSourceRef.current = new VectorSource();
        if (!highlightSourceRef.current) highlightSourceRef.current = new VectorSource();
        if (!staSourceRef.current) staSourceRef.current = new VectorSource();
        if (!desaSourceRef.current) desaSourceRef.current = new VectorSource();

        const vectorLayer = new VectorLayer({
            source: sourceRef.current ?? undefined,
            zIndex: 999, // Ensure drawing layer is always on top
            style: new Style({
                fill: new Fill({
                    color: "rgba(37, 99, 235, 0.2)",
                }),
                stroke: new Stroke({
                    color: "#2563eb",
                    width: 3,
                }),
                image: new CircleStyle({
                    radius: 7,
                    fill: new Fill({
                        color: "#2563eb",
                    }),
                }),
            }),
        });
        vectorLayerRef.current = vectorLayer;

        // Individual Layers for Stacking
        const ruasUtamaLayer = new VectorLayer({
            source: ruasUtamaSourceRef.current ?? undefined,
            renderMode: 'image', // Performance optimization: renders as a single image
            style: (feature, resolution) => getOptimizedSegmentStyle(feature, resolution, selectedDesaIdRef.current, segmentFiltersRef.current, null)
        });
        ruasUtamaLayerRef.current = ruasUtamaLayer;

        const segmenDesaLayer = new VectorLayer({
            source: segmenDesaSourceRef.current ?? undefined,
            updateWhileAnimating: false,
            updateWhileInteracting: false,
            style: (feature, resolution) => getOptimizedSegmentStyle(feature, resolution, selectedDesaIdRef.current, segmentFiltersRef.current, selectedRoadRef.current)
        });
        segmenDesaLayerRef.current = segmenDesaLayer;
        
        const jalanKabupatenLayer = new VectorLayer({
            source: jalanKabupatenSourceRef.current ?? undefined,
            updateWhileAnimating: false,
            updateWhileInteracting: false,
            style: (feature, resolution) => getOptimizedSegmentStyle(feature, resolution, selectedDesaIdRef.current, segmentFiltersRef.current, selectedRoadRef.current)
        });
        jalanKabupatenLayerRef.current = jalanKabupatenLayer;

        const hoverSource = new VectorSource();
        hoverSourceRef.current = hoverSource;
        const hoverLayer = new VectorLayer({
            source: hoverSource,
            zIndex: 100, // Topmost
            style: (feature) => {
                const props = feature.getProperties();
                const isBase = props.is_base_jalan;
                
                return [
                    new Style({
                        stroke: new Stroke({
                            color: isBase ? "rgba(255, 255, 255, 0.6)" : "rgba(255, 255, 255, 0.8)",
                            width: isBase ? 10 : 8,
                            lineCap: 'round'
                        })
                    })
                ];
            }
        });
        hoverLayerRef.current = hoverLayer;

        const desaSource = new VectorSource({
            overlaps: false // Performance hint
        });
        desaSourceRef.current = desaSource;
        const desaLayer = new VectorLayer({
            source: desaSource,
            renderMode: 'image', // Render village boundaries as image for performance
            style: (feature) => {
                const villageName = feature.get("nama_desa") || feature.get("DESA") || feature.get("NAMA_DESA") || feature.get("name") || "";
                const cacheKey = `desa-boundary-${villageName}`;
                if (vectorStyleCache[cacheKey]) return vectorStyleCache[cacheKey];
                
                const style = new Style({
                    stroke: new Stroke({
                        color: "rgba(71, 85, 105, 0.5)", // slate 600
                        width: 1,
                        lineDash: [4, 4]
                    }),
                    fill: new Fill({
                        color: "rgba(248, 250, 252, 0.1)" // slate 50 very transparent
                    }),
                    text: new Text({
                        text: villageName,
                        font: "bold 12px sans-serif",
                        fill: new Fill({ color: "#7c3aed" }),
                        stroke: new Stroke({ color: "#fff", width: 3 }),
                        placement: 'point',
                        overflow: true
                    })
                });
                vectorStyleCache[cacheKey] = style;
                return style;
            },
            zIndex: 1,
        });

        desaLayerRef.current = desaLayer;

        const nonBaseLayer = new VectorLayer({
            source: nonBaseSourceRef.current ?? undefined,
            visible: visibleLayers.find(l => l.id === "non-base")?.visible,
            style: (feature) => {
                // Filter by village if selected
                if (selectedDesaIdRef.current && selectedDesaIdRef.current !== "all") {
                    const fDesaId = getFeatureDesaId(feature);
                    if (fDesaId && fDesaId.toString() !== selectedDesaIdRef.current) {
                        return null;
                    }
                }

                const { color, lineDash } = getSegmentStyleProps(feature);

                return new Style({
                    stroke: new Stroke({
                        color: color,
                        width: 3,
                        lineDash: lineDash || [6, 6],
                        lineCap: 'round'
                    })
                });
            }
        });
        nonBaseLayerRef.current = nonBaseLayer;

        const existingLayer = new VectorLayer({
            source: existingSourceRef.current ?? undefined,
            style: (feature) => {
                // Filter by village if selected
                if (selectedDesaIdRef.current && selectedDesaIdRef.current !== "all") {
                    const fDesaId = getFeatureDesaId(feature);
                    if (fDesaId && fDesaId.toString() !== selectedDesaIdRef.current) {
                        return null;
                    }
                }

                const isBase = feature.get("is_base_jalan");
                const isKabupaten = feature.get("is_kabupaten_jalan");
                const isVillageSegmen = !isBase && !isKabupaten && feature.get("hidden_from_panel");
                const isEditableSegmen = !isBase && !isKabupaten && !feature.get("hidden_from_panel");

                // Check visibility from LayerToggle
                const isCheckedRoad = feature.get("kode_ruas_layer");
                if (isCheckedRoad) {
                    const isVisible = visibleLayers.find(l => l.id === `road-${isCheckedRoad}`)?.visible;
                    if (isVisible === false) return [];
                }

                const ruasUtamaVisible = visibleLayers.find(l => l.id === "ruas-utama")?.visible ?? true;
                const segmenDesaVisible = visibleLayers.find(l => l.id === "segmen-desa")?.visible ?? true;
                const jalanKabupatenVisible = visibleLayers.find(l => l.id === "jalan-kabupaten")?.visible ?? true;

                if (isBase && !ruasUtamaVisible) return [];
                if ((isVillageSegmen || isEditableSegmen) && !segmenDesaVisible) return [];
                if (isKabupaten && !jalanKabupatenVisible) return [];

                if (isBase) {
                    return new Style({
                        stroke: new Stroke({
                            color: "rgba(148, 163, 184, 0.4)", // slate 400 light
                            width: 8,
                            lineCap: 'round'
                        })
                    });
                }

                const { color, lineDash } = getSegmentStyleProps(feature);
                const labelText = isKabupaten ? "Jalan Kabupaten" : (feature.get("tahun_pembangunan") || "").toString();

                return new Style({
                    stroke: new Stroke({
                        color: color,
                        width: isKabupaten ? 6 : 5,
                        lineDash: lineDash,
                        lineJoin: 'round',
                        lineCap: 'round'
                    }),
                    text: new Text({
                        text: labelText,
                        font: "bold 10px sans-serif",
                        fill: new Fill({ color: "#fff" }),
                        stroke: new Stroke({ color: color, width: 2 }),
                        offsetY: -10
                    })
                });
            }
        });
        existingLayerRef.current = existingLayer;

        const staLayer = new VectorLayer({
            source: staSourceRef.current ?? undefined,
            zIndex: 100, // Higher zIndex to ensure it's on top
            visible: visibleLayers.find(l => l.id === "sta-markers")?.visible ?? true,
            style: (feature) => {
                const label = feature.get("sta_label");
                return [
                    // Marker Background/Shadow
                    new Style({
                        image: new CircleStyle({
                            radius: 7,
                            fill: new Fill({ color: "rgba(0, 0, 0, 0.3)" }),
                        })
                    }),
                    // Main Marker
                    new Style({
                        image: new CircleStyle({
                            radius: 5,
                            fill: new Fill({ color: "#ef4444" }),
                            stroke: new Stroke({ color: "#fff", width: 2 })
                        }),
                        text: new Text({
                            text: label || "",
                            font: "bold 11px sans-serif",
                            fill: new Fill({ color: "#ef4444" }),
                            stroke: new Stroke({ color: "#fff", width: 3 }),
                            offsetY: -16,
                            textAlign: 'center',
                            padding: [2, 4, 2, 4]
                        })
                    })
                ];
            }
        });
        staLayerRef.current = staLayer;

        const searchLayer = new VectorLayer({
            source: searchSourceRef.current ?? undefined,
            style: (feature) => {
                const label = feature.get("label") || "Point";
                return new Style({
                    image: new CircleStyle({
                        radius: 8,
                        fill: new Fill({ color: "#f43f5e" }), // rose 500
                        stroke: new Stroke({ color: "#fff", width: 2 })
                    }),
                    text: new Text({
                        text: label,
                        font: "bold 12px sans-serif",
                        fill: new Fill({ color: "#f43f5e" }),
                        stroke: new Stroke({ color: "#fff", width: 3 }),
                        offsetY: -15
                    })
                });
            },
            zIndex: 100
        });

        const highlightLayer = new VectorLayer({
            source: highlightSourceRef.current ?? undefined,
            style: (feature) => {
                if (feature.get("is_village_highlight")) {
                    return new Style({
                        stroke: new Stroke({
                            color: "#4f46e5", // Indigo 600 (Warna tegas)
                            width: 4,
                            lineDash: [8, 8],
                            lineCap: 'round'
                        })
                    });
                }
                
                // Default Segment/Road Highlight (Cyan Glow)
                return [
                    new Style({
                        stroke: new Stroke({
                            color: "rgba(34, 211, 238, 0.4)",
                            width: 12,
                        }),
                    }),
                    new Style({
                        stroke: new Stroke({
                            color: "rgba(34, 211, 238, 0.6)",
                            width: 8,
                        }),
                    }),
                    new Style({
                        stroke: new Stroke({
                            color: "#22d3ee", // cyan 400
                            width: 4,
                        }),
                    }),
                ];
            },
            zIndex: 500
        });
        highlightLayerRef.current = highlightLayer;

        const tileLayer = new TileLayer({
            source: BASEMAPS[activeBasemap].source,
        });
        tileLayerRef.current = tileLayer;

        const map = new OLMap({
            target: mapElement.current,
            layers: [
                tileLayer,
                desaLayer,
                existingLayer,
                ruasUtamaLayer,
                segmenDesaLayer,
                jalanKabupatenLayer,
                nonBaseLayer,
                staLayer,
                searchLayer,
                vectorLayer,
                highlightLayer,
                hoverLayer,
            ],
            controls: defaultControls({
                zoom: false,
                rotate: false,
                attribution: false,
            }),
            view: new View({
                center: fromLonLat([111.8328268, -7.2288555]), // Bojonegoro
                zoom: 11,
            }),
        });

        map.on('pointermove', (evt) => {
            if (evt.dragging) return;
            
            const pixel = map.getEventPixel(evt.originalEvent);
            const hitFeatures = map.getFeaturesAtPixel(pixel, {
                layerFilter: (layer) => {
                    return layer === ruasUtamaLayer || layer === segmenDesaLayer || layer === jalanKabupatenLayer;
                },
                hitTolerance: 3
            });

            let currentFeature: Feature | null = null;

            if (hitFeatures && hitFeatures.length > 0) {
                for (const feature of hitFeatures) {
                    if (feature instanceof Feature) {
                        const props = feature.getProperties();
                        const isBase = props.is_base_jalan;
                        
                        const isVisible = getOptimizedSegmentStyle(
                            feature, 
                            map.getView().getResolution() || 0, 
                            selectedDesaIdRef.current, 
                            segmentFiltersRef.current, 
                            isBase ? null : selectedRoadRef.current
                        ) !== null;

                        if (isVisible) {
                            currentFeature = feature;
                            break;
                        }
                    }
                }
            }

            const currentId = currentFeature ? (currentFeature.getId() || currentFeature.get('id') || currentFeature.get('kode_ruas') || currentFeature.get('fid')) : null;

            if (currentId !== lastHoveredFeatureId.current) {
                lastHoveredFeatureId.current = currentId;
                hoverSource.clear();
                
                if (currentFeature) {
                    const hoverFeature = currentFeature.clone();
                    hoverSource.addFeature(hoverFeature);
                    map.getTargetElement().style.cursor = 'pointer';
                } else {
                    map.getTargetElement().style.cursor = '';
                }
            }
        });

        mapRef.current = map;

        // Initialize tooltip overlay
        const tooltipEl = document.createElement('div');
        tooltipEl.className = 'ol-draw-tooltip';
        tooltipElementRef.current = tooltipEl;
        const overlay = new Overlay({
            element: tooltipEl,
            offset: [0, -15],
            positioning: 'bottom-center',
            stopEvent: false
        });
        map.addOverlay(overlay);
        tooltipRef.current = overlay;

        // Pulse Overlay for Context Menu
        const pulseEl = document.createElement('div');
        pulseEl.className = 'context-menu-pulse';
        pulseElementRef.current = pulseEl;
        const pulseOverlay = new Overlay({
            element: pulseEl,
            positioning: 'center-center',
            stopEvent: false,
        });
        map.addOverlay(pulseOverlay);
        pulseOverlayRef.current = pulseOverlay;

        // Vector Popup Overlay
        const popupEl = document.createElement('div');
        popupEl.className = 'vector-popup-container';
        vectorPopupElementRef.current = popupEl;
        const vectorPopup = new Overlay({
            element: popupEl,
            positioning: 'bottom-center',
            offset: [0, -5],
            stopEvent: true, // Allow interaction with popup (X button, etc)
        });
        map.addOverlay(vectorPopup);
        vectorPopupRef.current = vectorPopup;

        // Pointer move for coordinate display and cursor changes
        const throttledPointerMove = throttle((evt: any) => {
            if (evt.dragging) return;

            const coordinate = toLonLat(evt.coordinate);
            setCursorCoords({
                lng: coordinate[0],
                lat: coordinate[1]
            });

            // Change cursor to pointer when over vector features or WMS features
            const pixel = map.getEventPixel(evt.originalEvent);
            const features = map.getFeaturesAtPixel(pixel, {
                layerFilter: (l) =>
                    l === vectorLayerRef.current ||
                    l === existingLayerRef.current ||
                    l === ruasUtamaLayerRef.current ||
                    l === segmenDesaLayerRef.current ||
                    l === jalanKabupatenLayerRef.current ||
                    l === nonBaseLayerRef.current ||
                    l === staLayerRef.current ||
                    l === desaLayerRef.current,
                hitTolerance: 10
            });

            const vectorHit = features.length > 0;
            
            // Check WMS layers for cursor change
            let wmsHit = false;
            const allLayers = map.getLayers().getArray();
            for (const layer of allLayers) {
                if (layer instanceof TileLayer && layer.get('type') === 'wms' && layer.getVisible()) {
                    try {
                        const data = layer.getData(pixel);
                        if (data && (data instanceof Uint8Array || data instanceof Uint8ClampedArray || data instanceof Float32Array)) {
                            if (data.length >= 4 && data[3] > 0) {
                                wmsHit = true;
                                break;
                            }
                        }
                    } catch (e) {
                        // Ignore CORS errors
                    }
                }
            }

            map.getTargetElement().style.cursor = (vectorHit || wmsHit) ? 'pointer' : '';
        }, 50);

        map.on('pointermove', throttledPointerMove);

        // Helper function for WMS click detection
        const handleWmsLayerClick = async (evt: any) => {
            const view = map.getView();
            const viewResolution = view.getResolution();
            const projection = view.getProjection();
            const allLayers = map.getLayers().getArray();
            const wmsLayers = allLayers.filter(l => l instanceof TileLayer && l.get('type') === 'wms' && l.getVisible());

            for (const layer of wmsLayers) {
                const source = (layer as TileLayer<TileWMS>).getSource();
                if (!source) continue;

                const url = source.getFeatureInfoUrl(
                    evt.coordinate,
                    viewResolution || 0,
                    projection,
                    { 'INFO_FORMAT': 'application/json', 'FEATURE_COUNT': 1 }
                );

                if (url) {
                    try {
                        const proxiedUrl = url.replace('https://saggaserv.my.id/geoserver', `${window.location.origin}/proxy/geoserver`);
                        const response = await fetch(proxiedUrl);
                        const data = await response.json();

                        if (data.features && data.features.length > 0) {
                            const feat = data.features[0];
                            const props = feat.properties;
                            const roadId = props.id || props.ID || props.id_jalan;
                            
                            setIsPopupClosing(false);
                            setHighlightedKey(null);
                            setSelectedVectorId(feat.id ?? roadId);
                            setSelectedVectorInfo({
                                properties: props,
                                coordinate: evt.coordinate,
                                id: feat.id
                            });
                            vectorPopupRef.current?.setPosition(evt.coordinate);

                            // Load segments for this road
                            if (roadId) {
                                refreshSegmentData(roadId.toString());
                            }

                            if (feat.geometry) {
                                try {
                                    let featuresArr: Feature[] = [];
                                    const readResult = geojsonFormat.readFeatures(data, {
                                        dataProjection: 'EPSG:3857',
                                        featureProjection: 'EPSG:3857'
                                    });

                                    if (Array.isArray(readResult)) {
                                        featuresArr = readResult as Feature[];
                                    }

                                    if (featuresArr.length === 0) {
                                        const singleFeature = geojsonFormat.readFeature(feat, {
                                            dataProjection: 'EPSG:3857',
                                            featureProjection: 'EPSG:3857'
                                        });
                                        if (singleFeature) featuresArr = [singleFeature as Feature];
                                    }

                                    if (featuresArr.length > 0) {
                                        highlightSourceRef.current?.addFeatures(featuresArr);
                                        // Redundant zoom removed to avoid conflict with refreshSegmentData
                                    }
                                } catch (parseErr) {
                                    console.error("Error parsing GeoJSON from WMS:", parseErr);
                                }
                            }
                            return true;
                        }
                    } catch (err) {
                        console.error(`Error fetching GetFeatureInfo for layer:`, err);
                    }
                }
            }
            return false;
        };

        // Map Click Handler
        map.on('click', async (evt) => {
            if (modeRef.current !== "view") return;
            highlightSourceRef.current?.clear();

            const features = map.getFeaturesAtPixel(evt.pixel, {
                layerFilter: (l) =>
                    l === vectorLayerRef.current ||
                    l === existingLayerRef.current ||
                    l === ruasUtamaLayerRef.current ||
                    l === segmenDesaLayerRef.current ||
                    l === jalanKabupatenLayerRef.current ||
                    l === nonBaseLayerRef.current ||
                    l === staLayerRef.current ||
                    l === desaLayerRef.current,
                hitTolerance: 10
            });

            let segmentFeature = null;
            let villageFeature = null;

            if (features.length > 0) {
                segmentFeature = features.find((f: any) => !f.get("is_village_boundary"));
                villageFeature = features.find((f: any) => f.get("is_village_boundary"));
            }

            // 1. Vector Segment Click
            if (segmentFeature) {
                const feature = segmentFeature;
                const properties = feature.getProperties();
                const featureId = feature.getId();
                setIsPopupClosing(false);
                setHighlightedKey(null);
                setSelectedVectorId(featureId ?? null);
                setSelectedVectorInfo({
                    properties,
                    coordinate: evt.coordinate,
                    id: featureId
                });
                vectorPopupRef.current?.setPosition(evt.coordinate);
                if (feature instanceof Feature) {
                    const highlightFeature = feature.clone();
                    highlightSourceRef.current?.clear(); // Clear old highlight
                    highlightSourceRef.current?.addFeature(highlightFeature);
                    
                    // Only fit bounds if it's a segment, not the main road base line
                    if (!properties.is_base_jalan) {
                        const geometry = feature.getGeometry();
                        if (geometry) {
                            const extent = geometry.getExtent();
                            mapRef.current?.getView().fit(extent, {
                                padding: [100, 100, 100, 100],
                                duration: 500,
                                maxZoom: 18
                            });
                        }
                    }
                }
                
                // If it's a base road (jalan poros/desa), select it like in the sidebar
                if (properties.is_base_jalan) {
                    const roadId = properties.id || properties.ID || properties.id_jalan || properties.kode_ruas_layer;
                    if (roadId) {
                        const roadObj: any = {
                            jalan: {
                                id: roadId.toString(),
                                kode_ruas: properties.kode_ruas || properties.KODE_RUAS,
                                nama_ruas: properties.nama_ruas || properties.NM_RUAS || properties.NAME || 'Nama tidak tersedia',
                                panjang: properties.panjang || properties.PANJANG || 0,
                                lebar: properties.lebar || properties.LEBAR || 0,
                                id_desa: properties.id_desa || properties.desa_id
                            },
                            stats: properties.stats || {}
                        };
                        setSelectedRoad(roadObj);
                        setSegmentPanelVisible(true);
                        setIsSegmentPanelOpen(!isMobile);
                    }
                }

                // Sync segment list for this road
                const kodeRuas = properties.kode_ruas || properties.KODE_RUAS;
                if (kodeRuas) {
                    syncSegmentListFromMap({ kodeRuas });
                }
                return;
            }

            // 2. WMS Layer Click
            const wmsHit = await handleWmsLayerClick(evt);
            if (wmsHit) return;

            // 3. Village Boundary Click
            if (villageFeature) {
                const feature = villageFeature;
                const vId = feature.get("id") || feature.getId();
                const villageId = vId?.toString();
                
                // Clear previous village data before loading new one
                ruasUtamaSourceRef.current?.clear();
                segmenDesaSourceRef.current?.clear();
                jalanKabupatenSourceRef.current?.clear();

                setSelectedDesaId(villageId || null);
                setSelectedRoad(null); // Clear road selection to show all village roads/segments
                setSegmentPanelVisible(true);
                setIsSegmentPanelOpen(!isMobile);
                
                if (feature.get("nama_desa")) {
                    toast.info(`Filtering Desa: ${feature.get("nama_desa")}`);
                }

                highlightSourceRef.current?.clear();
                const highlightFeature = feature.clone();
                highlightFeature.set("is_village_highlight", true);
                highlightSourceRef.current?.addFeature(highlightFeature);

                const extent = feature.getGeometry()?.getExtent();
                if (extent) {
                    mapRef.current?.getView().fit(extent, {
                        padding: getMapPadding(20),
                        duration: 1000,
                        maxZoom: 17
                    });
                }

                // Apply CQL filter to WMS layers if present
                const cql = villageId ? `id_desa = '${villageId}'` : undefined;
                [roadDesaWmsLayerRef, jalanKabupatenWmsLayerRef].forEach(ref => {
                    if (ref.current) {
                        const source = ref.current.getSource();
                        if (source instanceof TileWMS) {
                            source.updateParams({ 'CQL_FILTER': cql });
                        }
                    }
                });

                if (villageId) {
                    loadVillageGeoJSON(villageId);
                }
                return;
            }

            // No feature found
            setSelectedVectorId(null);
            setSelectedVectorInfo(null);
            vectorPopupRef.current?.setPosition(undefined);
            highlightSourceRef.current?.clear();
            // Do not clear selections on empty space click as per user request
            // setSelectedDesaId(null);
            // setSelectedRoad(null);

            // Clear CQL filters
            [roadDesaWmsLayerRef, jalanKabupatenWmsLayerRef].forEach(ref => {
                if (ref.current) {
                    const source = ref.current.getSource();
                    if (source instanceof TileWMS) {
                        source.updateParams({ 'CQL_FILTER': undefined });
                    }
                }
            });

            // Show all segments again
            syncSegmentListFromMap();


            // 2. Original Coordinate Copy Logic (Mobile only)
            if (isMobile) {
                const coordinate = toLonLat(evt.coordinate);
                const lng = coordinate[0];
                const lat = coordinate[1];
                const textToCopy = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

                // Update both display and last copied state on click
                setCursorCoords({ lat, lng });
                setLastCopiedCoords({ lat, lng });

                const performCopy = async () => {
                    let success = false;
                    try {
                        if (navigator.clipboard) {
                            await navigator.clipboard.writeText(textToCopy);
                            success = true;
                        } else {
                            throw new Error('Clipboard API unavailable');
                        }
                    } catch (err) {
                        const textArea = document.createElement("textarea");
                        textArea.value = textToCopy;
                        textArea.style.position = "fixed";
                        textArea.style.opacity = "0";
                        document.body.appendChild(textArea);
                        textArea.select();
                        try {
                            success = document.execCommand('copy');
                        } catch (copyErr) {
                            console.error('Fallback copy failed:', copyErr);
                        }
                        document.body.removeChild(textArea);
                    }

                    if (success) {
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                    }
                };

                performCopy();
            }
        });

        return () => {
            map.setTarget(undefined);
            map.removeOverlay(overlay);
        };
    }, [isMounted]);

    // Basemap switching effect
    useEffect(() => {
        if (!isMounted || !mapRef.current || !tileLayerRef.current) return;
        tileLayerRef.current.setSource(BASEMAPS[activeBasemap].source);
    }, [activeBasemap, isMounted]);

    // Removed setPadding call as it is not supported in this OpenLayers version.
    // Padding will be calculated dynamically in each fit() call.

    // Automatic re-fit when panels are toggled to keep content centered
    useEffect(() => {
        if (!mapRef.current || !isMounted) return;
        
        const view = mapRef.current.getView();
        let extentToFit = null;

        // Priority for fitting:
        // 1. Temporary drawing/edit feature
        // 2. Existing segments of selected road
        if (sourceRef.current && sourceRef.current.getFeatures().length > 0) {
            extentToFit = sourceRef.current.getExtent();
        } else if (existingSourceRef.current && existingSourceRef.current.getFeatures().length > 0) {
            extentToFit = existingSourceRef.current.getExtent();
        }

        if (extentToFit && !isEmptyExtent(extentToFit)) {
            view.fit(extentToFit, {
                padding: getMapPadding(20),
                duration: 500,
                maxZoom: 18
            });
        }
    }, [isSidebarOpen, isSegmentPanelOpen, isMounted]);

    useEffect(() => {
        if (mode.startsWith("draw-") && !isContinuing) {
            setEditingFeatureId(null);
            setEditingFeatureData(null);
        }
    }, [mode, isContinuing]);

    // Dynamic style for drawing and editing
    useEffect(() => {
        if (!vectorLayerRef.current) return;

        const dynamicStyle = (feature: any) => {
            const { color, lineDash } = getSegmentStyleProps(feature);
            const isBase = feature.get("is_base_jalan");
            const geometry = feature.getGeometry();
            const isLine = geometry instanceof LineString || geometry instanceof MultiLineString;

            const styles = [
                new Style({
                    stroke: new Stroke({
                        color: color,
                        width: isBase ? 8 : 6, // Match background layer widths
                        lineDash: lineDash,
                        lineCap: "round",
                    }),
                    // Only apply fill if it's not a line (e.g. Polygon)
                    fill: !isLine ? new Fill({
                        color: `${color}33`,
                    }) : undefined,
                }),
            ];

            // Show vertices when in edit mode or actively drawing
            if (mode === "edit" || mode.startsWith("draw-")) {
                styles.push(
                    new Style({
                        image: new CircleStyle({
                            radius: 5,
                            fill: new Fill({ color: "#fff" }),
                            stroke: new Stroke({ color: color, width: 2 }),
                        }),
                        geometry: (f) => {
                            const geom = f.getGeometry();
                            if (geom instanceof LineString) {
                                return new MultiPoint(geom.getCoordinates());
                            }
                            if (geom instanceof MultiLineString) {
                                // For MultiLineString, show vertices of all parts
                                return new MultiPoint(geom.getCoordinates().flat());
                            }
                            if (geom instanceof Polygon) {
                                return new MultiPoint(geom.getCoordinates()[0]);
                            }
                            return geom;
                        },
                    })
                );
            }
            return styles;
        };

        vectorLayerRef.current.setStyle(dynamicStyle);
    }, [mode, selectedRoad, isContinuing]);

    useEffect(() => {
        if (!isMounted || !mapRef.current || !sourceRef.current || !existingSourceRef.current) return;

        // Clean up interactions
        const interactions = mapRef.current.getInteractions().getArray().slice();
        interactions.forEach((interaction) => {
            if (
                interaction instanceof Draw ||
                interaction instanceof Modify ||
                interaction instanceof Snap ||
                interaction instanceof Select
            ) {
                mapRef.current?.removeInteraction(interaction);
            }
        });

        if (mode === "edit") {
            vectorLayerRef.current?.setZIndex(999);
            const modify = new Modify({
                source: sourceRef.current ?? undefined,
                deleteCondition: (event) => click(event), // click to delete vertex
            });
            mapRef.current.addInteraction(modify);

            modify.on('modifystart', (event) => {
                const feature = event.features.item(0);
                if (!feature) return;

                const tooltipEl = tooltipElementRef.current;
                const throttledModifyUpdate = throttle((geom: any) => {
                    if (!(geom instanceof LineString)) return;

                    let distance = 0;
                    let isValid = true;

                    try {
                        distance = getLength(geom);
                        if (geom.getCoordinates().length > 3) {
                            const gj = geojsonFormat.writeGeometryObject(geom, {
                                dataProjection: 'EPSG:4326',
                                featureProjection: 'EPSG:3857'
                            }) as any;
                            const kinks = turf.kinks(turf.lineString(gj.coordinates));
                            isValid = kinks.features.length === 0;
                        }
                    } catch (e) { }

                    const lastCoord = geom.getLastCoordinate();
                    if (tooltipEl && lastCoord) {
                        tooltipEl.innerText = !isValid ? "⚠ Jalur Berpotongan" : `${distance.toFixed(1)} m`;
                        tooltipEl.style.background = isValid ? 'rgba(15, 23, 42, 0.9)' : '#e11d48';
                        tooltipRef.current?.setPosition(lastCoord);
                        tooltipEl.style.display = 'block';
                    }
                }, 50);

                feature.getGeometry()?.on('change', (evt: any) => {
                    throttledModifyUpdate(evt.target);
                });
            });

            modify.on('modifyend', (event) => {
                const feature = event.features.item(0);
                if (feature) {
                    const geometry = feature.getGeometry();
                    if (geometry instanceof LineString) {
                        setDrawnLength(getLength(geometry));
                        const json = geojsonFormat.writeFeature(feature, {
                            dataProjection: "EPSG:4326",
                            featureProjection: "EPSG:3857",
                        });
                        setDrawnGeoJSON(json);
                    }
                }
                if (tooltipElementRef.current) tooltipElementRef.current.style.display = 'none';
            });
            const snap = new Snap({ source: sourceRef.current ?? undefined });
            const snapExisting = new Snap({ source: existingSourceRef.current ?? undefined });
            const snapNonBase = new Snap({ source: nonBaseSourceRef.current ?? undefined });
            const snapSearch = new Snap({ source: searchSourceRef.current ?? undefined });
            const snapSegmenDesa = new Snap({ source: segmenDesaSourceRef.current ?? undefined });
            const snapJalanKab = new Snap({ source: jalanKabupatenSourceRef.current ?? undefined });

            mapRef.current.addInteraction(modify);
            mapRef.current.addInteraction(snap);
            mapRef.current.addInteraction(snapExisting);
            mapRef.current.addInteraction(snapNonBase);
            mapRef.current.addInteraction(snapSearch);
            mapRef.current.addInteraction(snapSegmenDesa);
            mapRef.current.addInteraction(snapJalanKab);

            // Only add snap to Ruas Utama if we are NOT continuing a segment
            // This prevents the cursor from "detecting" the base road over the segment we're extending.
            if (!isContinuing) {
                const snapRuasUtama = new Snap({ source: ruasUtamaSourceRef.current ?? undefined });
                mapRef.current.addInteraction(snapRuasUtama);
            }
        } else if (mode === "draw-automatic") {
            const draw = new Draw({
                source: sourceRef.current ?? undefined,
                type: "LineString",
                maxPoints: 2,
                style: new Style({
                    stroke: new Stroke({
                        color: "#10b981",
                        width: 4,
                        lineDash: [6, 6]
                    }),
                    image: new CircleStyle({
                        radius: 6,
                        fill: new Fill({ color: "#10b981" }),
                        stroke: new Stroke({ color: "#fff", width: 2 })
                    })
                })
            });

            const snapExisting = new Snap({ source: existingSourceRef.current ?? undefined });
            const snapNonBase = new Snap({ source: nonBaseSourceRef.current ?? undefined });
            const snapSearch = new Snap({ source: searchSourceRef.current ?? undefined });
            const snapRuasUtama = new Snap({ source: ruasUtamaSourceRef.current ?? undefined });
            const snapSegmenDesa = new Snap({ source: segmenDesaSourceRef.current ?? undefined });
            const snapJalanKab = new Snap({ source: jalanKabupatenSourceRef.current ?? undefined });

            mapRef.current.addInteraction(draw);
            mapRef.current.addInteraction(snapExisting);
            mapRef.current.addInteraction(snapNonBase);
            mapRef.current.addInteraction(snapSearch);
            mapRef.current.addInteraction(snapRuasUtama);
            mapRef.current.addInteraction(snapSegmenDesa);
            mapRef.current.addInteraction(snapJalanKab);

            draw.on("drawstart", () => {
                if (tooltipElementRef.current) {
                    tooltipElementRef.current.innerText = "Klik titik kedua untuk ekstraksi";
                    tooltipElementRef.current.style.display = 'block';
                }
            });

            draw.on("drawend", async (event) => {
                const feature = event.feature;
                const geometry = feature.getGeometry();
                if (geometry instanceof LineString) {
                    const coords = geometry.getCoordinates().map(c => toLonLat(c));

                    if (tooltipElementRef.current) tooltipElementRef.current.style.display = 'none';

                    setIsExtracting(true);
                    const toastId = toast.loading("Mengekstraksi segmen jalan...");

                    try {
                        const response = await monitoringService.extractSegment({
                            point1: { lng: coords[0][0], lat: coords[0][1] },
                            point2: { lng: coords[1][0], lat: coords[1][1] },
                            kode_ruas: selectedRoad?.jalan.kode_ruas?.toString()
                        });

                        if (response.status === "success" && response.result) {
                            const extractedFeature = geojsonFormat.readFeature(response.result, {
                                dataProjection: "EPSG:4326",
                                featureProjection: "EPSG:3857",
                            }) as Feature;

                            // Clear temporary points
                            sourceRef.current?.clear();

                            // Add extracted feature
                            sourceRef.current?.addFeature(extractedFeature);

                            const extractedGeom = extractedFeature.getGeometry();
                            if (extractedGeom instanceof LineString) {
                                setDrawnLength(getLength(extractedGeom));

                                // Zoom to result
                                const extent = extractedGeom.getExtent();
                                mapRef.current?.getView().fit(extent, {
                                    padding: getMapPadding(40),
                                    duration: 1000,
                                    maxZoom: 18
                                });
                            }

                            setDrawnGeoJSON(geojsonFormat.writeFeature(extractedFeature, {
                                dataProjection: "EPSG:4326",
                                featureProjection: "EPSG:3857",
                            }));

                            setHasTemporaryFeature(true);
                            setIsPanelVisible(true);
                            setMode("view");
                            toast.success("Segmen berhasil diekstraksi!", { id: toastId });
                        } else {
                            toast.error("Gagal mendapatkan hasil ekstraksi.", { id: toastId });
                            setMode("view");
                        }
                    } catch (error) {
                        console.error("Extraction error:", error);
                        toast.error("Gagal mengekstraksi segmen. Silahkan coba digitasi manual.", { id: toastId });
                        setMode("view");
                        sourceRef.current?.clear();
                    } finally {
                        setIsExtracting(false);
                    }
                }
            });
        } else if (mode.startsWith("draw-")) {
            let type: any = "Point";
            let geometryFunction = undefined;

            if (mode === "draw-line") type = "LineString";
            if (mode === "draw-polygon") type = "Polygon";
            if (mode === "draw-circle") type = "Circle";
            if (mode === "draw-box") {
                type = "Circle";
                geometryFunction = createBox();
            }

            const drawStyle = (feature: any) => {
                const geometry = feature.getGeometry();
                if (!geometry) return [];
                
                const type = geometry.getType();
                const id = feature.getId();

                // If it's an existing feature (not a sketch), use its real style
                if (id) {
                    const { color: featColor, lineDash: featDash } = getSegmentStyleProps(feature);
                    return [
                        new Style({
                            stroke: new Stroke({ color: featColor, width: 6, lineDash: featDash, lineCap: 'round' }),
                            image: new CircleStyle({ radius: 5, fill: new Fill({ color: '#fff' }), stroke: new Stroke({ color: featColor, width: 2 }) })
                        })
                    ];
                }

                const isLingkungan = !selectedRoad;
                let color = isLingkungan ? "#F43F5E" : "#3B82F6";
                let dash = isLingkungan ? [6, 6] : undefined;

                // If we are continuing an existing line, use that line's color instead of default blue/red
                if (isContinuing && originalEditFeatureRef.current) {
                    const props = getSegmentStyleProps(originalEditFeatureRef.current);
                    color = props.color;
                    dash = props.lineDash;
                }

                return [
                    new Style({
                        stroke: new Stroke({ color, width: 4, lineDash: dash, lineCap: 'round' }),
                        fill: new Fill({ color: isLingkungan ? "rgba(244, 63, 94, 0.2)" : "rgba(59, 130, 246, 0.2)" }),
                        image: new CircleStyle({ radius: 6, fill: new Fill({ color }) })
                    }),
                    // Show vertices while drawing
                    new Style({
                        image: new CircleStyle({
                            radius: 4,
                            fill: new Fill({ color: "#fff" }),
                            stroke: new Stroke({ color: color, width: 2 })
                        }),
                        geometry: (f) => {
                            const geom = f.getGeometry();
                            if (geom instanceof LineString) {
                                return new MultiPoint(geom.getCoordinates());
                            }
                            return geom;
                        }
                    })
                ];
            };

            const draw = new Draw({
                source: sourceRef.current ?? undefined,
                type: type,
                geometryFunction: geometryFunction,
                style: drawStyle
            });

            const snap = new Snap({ source: sourceRef.current ?? undefined });
            const snapExisting = new Snap({ source: existingSourceRef.current ?? undefined });
            const snapNonBase = new Snap({ source: nonBaseSourceRef.current ?? undefined });
            const snapSearch = new Snap({ source: searchSourceRef.current ?? undefined });
            const snapSegmenDesa = new Snap({ source: segmenDesaSourceRef.current ?? undefined });
            const snapJalanKab = new Snap({ source: jalanKabupatenSourceRef.current ?? undefined });

            mapRef.current.addInteraction(draw);
            mapRef.current.addInteraction(snap);
            mapRef.current.addInteraction(snapExisting);
            mapRef.current.addInteraction(snapNonBase);
            mapRef.current.addInteraction(snapSearch);
            mapRef.current.addInteraction(snapSegmenDesa);
            mapRef.current.addInteraction(snapJalanKab);

            // Disable snapping to the base road when we are extending a specific segment
            // to avoid the cursor "detecting" or jumping to the road underneath.
            if (!isContinuing) {
                const snapRuasUtama = new Snap({ source: ruasUtamaSourceRef.current ?? undefined });
                mapRef.current.addInteraction(snapRuasUtama);
            }

            draw.on("drawstart", (event) => {
                const sketch = event.feature;
                const tooltipEl = tooltipElementRef.current;

                // Throttled drawing updates to prevent UI lag during heavy Turf calculations
                const throttledDrawUpdate = throttle((geom: any) => {
                    if (!(geom instanceof LineString)) return;

                    let distance = 0;
                    let isValid = true;

                    try {
                        // FAST: Use native OpenLayers distance calculation
                        distance = getLength(geom);

                        // Only check self-intersection if there are enough points
                        if (geom.getCoordinates().length > 3) {
                            const gj = geojsonFormat.writeGeometryObject(geom, {
                                dataProjection: 'EPSG:4326',
                                featureProjection: 'EPSG:3857'
                            }) as any;
                            const kinks = turf.kinks(turf.lineString(gj.coordinates));
                            isValid = kinks.features.length === 0;
                        }
                    } catch (e) { }

                    const lastCoord = geom.getLastCoordinate();
                    if (tooltipEl && lastCoord) {
                        tooltipEl.innerText = !isValid ? "⚠ Jalur Berpotongan" : `${distance.toFixed(1)} m`;
                        tooltipEl.style.background = isValid ? 'rgba(15, 23, 42, 0.9)' : '#e11d48';
                        tooltipRef.current?.setPosition(lastCoord);
                        tooltipEl.style.display = 'block';
                    }
                }, 50); // Improved responsiveness with faster logic

                sketch.getGeometry()?.on('change', (evt: any) => {
                    throttledDrawUpdate(evt.target);
                });
            });

            draw.on("drawend", (event) => {
                const feature = event.feature;

                // Final length calculation on draw end
                const geometry = feature.getGeometry();
                let finalFeature = feature;

                if (isContinuing && sourceRef.current) {
                    const existingFeatures = sourceRef.current.getFeatures();
                    // existingFeatures contains [oldFeature (cloned), newFeature]
                    const oldFeature = existingFeatures.find(f => f !== feature);
                    if (oldFeature) {
                        const oldGeom = oldFeature.getGeometry();
                        const newGeom = feature.getGeometry();

                        let oldCoordsToMerge: any[] = [];
                        let isMulti = false;
                        let multiCoords: any[] = [];
                        let targetPartIndex = -1;

                        if (oldGeom instanceof LineString) {
                            oldCoordsToMerge = oldGeom.getCoordinates();
                        } else if (oldGeom instanceof MultiLineString) {
                            isMulti = true;
                            multiCoords = oldGeom.getCoordinates();
                            
                            // Find the part whose start or end is closest to the new sketch's start
                            if (newGeom instanceof LineString) {
                                const startOfNew = newGeom.getCoordinates()[0];
                                let minDst = Infinity;
                                multiCoords.forEach((part, idx) => {
                                    const pStart = part[0];
                                    const pEnd = part[part.length - 1];
                                    const dStart = Math.sqrt(Math.pow(startOfNew[0] - pStart[0], 2) + Math.pow(startOfNew[1] - pStart[1], 2));
                                    const dEnd = Math.sqrt(Math.pow(startOfNew[0] - pEnd[0], 2) + Math.pow(startOfNew[1] - pEnd[1], 2));
                                    if (dStart < minDst) { minDst = dStart; targetPartIndex = idx; }
                                    if (dEnd < minDst) { minDst = dEnd; targetPartIndex = idx; }
                                });
                                if (targetPartIndex !== -1) {
                                    oldCoordsToMerge = multiCoords[targetPartIndex];
                                }
                            }
                        }

                        if (oldCoordsToMerge.length > 0 && newGeom instanceof LineString) {
                            const newCoords = newGeom.getCoordinates();
                            const startOfNew = newCoords[0];
                            const endOfOld = oldCoordsToMerge[oldCoordsToMerge.length - 1];
                            const startOfOld = oldCoordsToMerge[0];

                            let combinedCoords;
                            const distToEnd = Math.sqrt(Math.pow(startOfNew[0] - endOfOld[0], 2) + Math.pow(startOfNew[1] - endOfOld[1], 2));
                            const distToStart = Math.sqrt(Math.pow(startOfNew[0] - startOfOld[0], 2) + Math.pow(startOfNew[1] - startOfOld[1], 2));

                            if (distToEnd < distToStart) {
                                combinedCoords = [...oldCoordsToMerge, ...newCoords.slice(1)];
                            } else {
                                combinedCoords = [...oldCoordsToMerge.reverse(), ...newCoords.slice(1)];
                            }

                            if (isMulti) {
                                multiCoords[targetPartIndex] = combinedCoords;
                                (oldGeom as MultiLineString).setCoordinates(multiCoords);
                            } else {
                                (oldGeom as LineString).setCoordinates(combinedCoords);
                            }

                            // Defer removal to ensure OL has finished adding the sketch to the source
                            setTimeout(() => {
                                sourceRef.current?.removeFeature(feature);
                            }, 0);
                            finalFeature = oldFeature;
                        }
                    }
                    setIsContinuing(false);
                }

                const finalGeom = finalFeature.getGeometry();
                if (finalGeom instanceof LineString) {
                    try {
                        const finalDistance = getLength(finalGeom);
                        setDrawnLength(finalDistance);

                        // ZOOM TO EXTENT
                        const extent = finalGeom.getExtent();
                        mapRef.current?.getView().fit(extent, {
                            padding: getMapPadding(40),
                            duration: 1000,
                            maxZoom: 18
                        });
                    } catch (e) { }
                }

                const format = new GeoJSON();
                const json = format.writeFeature(finalFeature, {
                    dataProjection: "EPSG:4326",
                    featureProjection: "EPSG:3857",
                });
                if (tooltipElementRef.current) tooltipElementRef.current.style.display = 'none';
                setDrawnGeoJSON(json);
                setHasTemporaryFeature(true);
                setIsPanelVisible(true);
                setMode("view");
            });
        }
    }, [mode, isMounted]);

    const refreshSegmentData = async (roadId: string, filters = segmentFilters, forceLoadBase = false) => {
        setIsFetchingDetail(true);
        const shouldLoadBase = forceLoadBase || loadedBaseRoadIdRef.current !== roadId;

        try {
            const promises: any[] = [
                monitoringService.getSegmenByJalanId(roadId, filters),
                monitoringService.getNonBaseSegments(selectedRoad?.jalan.id_desa || ""),
                monitoringService.getDesaById(selectedRoad?.jalan.id_desa || "")
            ];

            if (shouldLoadBase) {
                promises.push(monitoringService.getJalanByIdGeoJSON(roadId));
            }

            const results = await Promise.all(promises);
            const segmentsResponse = results[0];
            const nonBaseResponse = results[1];
            const desaResponse = results[2];
            const jalanResponse = shouldLoadBase ? results[3] : null;

            const format = new GeoJSON();
            const panelFeatures: any[] = [];

            // CLEAR SOURCES ONLY AFTER SUCCESSFUL FETCH to prevent blank map/flicker
            [ruasUtamaSourceRef, segmenDesaSourceRef, jalanKabupatenSourceRef, nonBaseSourceRef, staSourceRef].forEach(sourceRef => {
                const source = sourceRef.current;
                if (source) {
                    const features = source.getFeatures();
                    features.forEach(f => {
                        const kId = f.get("kode_ruas_layer");
                        // 1. Only remove base road if we are explicitly re-loading it OR if it's no longer checked
                        // 1. Only remove base road if:
                        //    - It's the current road AND we are re-loading it
                        //    - It's another road AND it's no longer checked
                        const isBase = f.get("is_base_jalan");
                        const isCurrentRoad = kId === roadId;
                        const shouldRemoveBase = isBase && (isCurrentRoad ? shouldLoadBase : !checkedRoadIds.includes(kId));
                        
                        // 2. Remove segments/others if they belong to current road or are unchecked
                        const isOther = !isBase;
                        const shouldRemoveOther = isOther && (isCurrentRoad || (kId && !checkedRoadIds.includes(kId)) || sourceRef === desaSourceRef || !kId);

                        if (shouldRemoveBase || shouldRemoveOther) {
                            source.removeFeature(f);
                        }
                    });
                }
            });
            existingSourceRef.current?.clear();

            // 1. Prepare MAP FEATURES (Ruas Utama) - Only if loaded
            if (shouldLoadBase && jalanResponse) {
                const jalanFeatures = format.readFeatures(jalanResponse, {
                    dataProjection: "EPSG:4326",
                    featureProjection: "EPSG:3857",
                });
                jalanFeatures.forEach(f => {
                    f.set("is_base_jalan", true);
                    f.set("hidden_from_panel", true);
                    f.set("kode_ruas_layer", roadId);
                    // Ensure ID is set for hit detection and removal
                    if (!f.getId()) f.setId(`base-${roadId}-${Math.random()}`);
                });
                ruasUtamaSourceRef.current?.addFeatures(jalanFeatures);
                loadedBaseRoadIdRef.current = roadId;
            }

            // 2. Prepare PANEL FEATURES (from getSegmenByKodeRuas and filtered non-base)
            if (segmentsResponse.status === "success" && segmentsResponse.result?.features) {
                const features = format.readFeatures(segmentsResponse.result, {
                    dataProjection: "EPSG:4326",
                    featureProjection: "EPSG:3857",
                });
                features.forEach(f => {
                    const id = f.get("id");
                    if (id) f.setId(id);
                    f.set("kode_ruas_layer", roadId);

                    const statusJalan = f.get("status_jalan");
                    if (statusJalan === "Jalan Kabupaten") {
                        jalanKabupatenSourceRef.current?.addFeature(f);
                    } else {
                        // Default to Jalan Desa
                        segmenDesaSourceRef.current?.addFeature(f);
                    }
                });
                panelFeatures.push(...features);
            }

            if (nonBaseResponse.status === "success" && nonBaseResponse.result?.features) {
                const filteredNonBase = format.readFeatures(nonBaseResponse.result, {
                    dataProjection: "EPSG:4326",
                    featureProjection: "EPSG:3857",
                });
                filteredNonBase.forEach(f => {
                    const id = f.get("id");
                    if (id) f.setId(id);
                    f.set("is_lingkungan_segment", true);
                });
                panelFeatures.push(...filteredNonBase);
                nonBaseSourceRef.current?.addFeatures(filteredNonBase);
            }

            // Update STA markers
            if (jalanResponse) {
                updateSTAMarkers(roadId, jalanResponse);
            }

            // 3. Prepare VILLAGE BOUNDARY (from getDesaById)
            if (desaResponse.status === "success" && desaResponse.result) {
                const villageFeatures = format.readFeatures(desaResponse.result, {
                    dataProjection: "EPSG:4326",
                    featureProjection: "EPSG:3857",
                });
                villageFeatures.forEach(f => {
                    f.set("is_village_boundary", true);
                    f.set("hidden_from_panel", true);
                });
                desaSourceRef.current?.addFeatures(villageFeatures);
            }

            // Set features for panel display
            setFeaturesList(panelFeatures);
            setSegmentPanelVisible(true);
            if (isMobile) {
                setIsSegmentPanelOpen(false);
            } else {
                setIsSegmentPanelOpen(true);
            }

            // 4. ZOOM TO BOUNDING BOX (Combined extent of all sources)
            // Skip zoom if in draw or edit mode to avoid interrupting user workflow
            // OR if isPanelVisible is true (to avoid overriding the zoom from drawend)
            const isDrawOrEditMode = mode.startsWith("draw-") || mode === "edit";

            if (!isDrawOrEditMode && !isPanelVisible) {
                const combinedExtent = createEmptyExtent();
                let hasAnyFeatures = false;

                // Zoom to the road and its segments only (exclude the large kecamatan/village boundaries)
                [ruasUtamaSourceRef, segmenDesaSourceRef, jalanKabupatenSourceRef].forEach(sourceRef => {
                    if (sourceRef.current && sourceRef.current.getFeatures().length > 0) {
                        extendExtent(combinedExtent, sourceRef.current.getExtent());
                        hasAnyFeatures = true;
                    }
                });

                if (hasAnyFeatures) {
                    mapRef.current?.getView().fit(combinedExtent, {
                        padding: [100, 100, 100, 100], // Use fixed padding
                        duration: 1000,
                        maxZoom: 18
                    });
                } else {
                    toast.info("Belum ada data visual untuk jalan ini");
                }
            }

        } catch (error) {
            console.error("Error fetching detail:", error);
            toast.error("Gagal mengambil data segmen jalan");
        } finally {
            // Add a small delay before hiding loading state to allow map animation to start smoothly
            setTimeout(() => {
                setIsFetchingDetail(false);
            }, 300);
        }
    };

    useEffect(() => {
        if (!isMounted || !existingSourceRef.current) return;

        // Skip clearing if we are in a drawing mode to maintain overlay context
        if (!selectedRoad && !mode.startsWith("draw-")) {
            existingSourceRef.current?.clear();

            // Only clear non-checked features
            [ruasUtamaSourceRef, segmenDesaSourceRef, jalanKabupatenSourceRef, staSourceRef].forEach(sourceRef => {
                const source = sourceRef.current;
                if (source) {
                    const featuresToRemove = source.getFeatures().filter(f => {
                        const kId = f.get("kode_ruas_layer");
                        return !kId || !checkedRoadIds.includes(kId);
                    });
                    featuresToRemove.forEach(f => source.removeFeature(f));
                }
            });

            // Keep road categories in layer toggle if there are still checked roads
            const hasCheckedRoads = checkedRoadIds.length > 0;
            if (!hasCheckedRoads) {
                setVisibleLayers(prev => prev.filter(l =>
                    !["ruas-utama", "segmen-desa", "jalan-kabupaten", "sta-markers"].includes(l.id)
                ));
            }
            return;
        }

        if (!selectedRoad) return;

        // Skip segment data refresh during draw or edit mode to prevent unwanted fetching
        const isDrawOrEditMode = mode.startsWith("draw-") || mode === "edit";
        if (isDrawOrEditMode) return;

        // Add Road Categories to layer toggle if they're not already there
        // Ensure this happens if a road is selected OR if there are checked roads
        if (selectedRoad || checkedRoadIds.length > 0) {
            setVisibleLayers(prev => {
                if (prev.find(l => l.id === "ruas-utama")) return prev;
                return [
                    { id: "segmen-desa", label: "Segmen Jalan Desa", visible: true, color: "#22c55e", category: "Dataset Segmen" },
                    { id: "jalan-kabupaten", label: "Jalan Kabupaten", visible: true, color: "oklch(0.546 0.245 262.881)", category: "Dataset Segmen" },
                    { id: "ruas-utama", label: "Jalan Poros Desa", visible: true, color: "#FFA500", category: "Base Layer" },
                    ...prev
                ];
            });
        }

        const forceReloadBase = forceReloadBaseRoadRef.current;
        forceReloadBaseRoadRef.current = false; // Reset immediately
        refreshSegmentData(selectedRoad.jalan.id, segmentFilters, forceReloadBase);
    }, [selectedRoad, isMounted, mode, checkedRoadIds]);

    useEffect(() => {
        if (!isMounted || !nonBaseSourceRef.current) return;

        const fetchNonBase = async () => {
            // Filter by selectedRoad.jalan.id_desa if a road is selected
            const villageId = selectedRoad?.jalan.id_desa || "";

            // Optimization: Only fetch if villageId has changed
            if (villageId === lastLoadedDesaId.current) {
                return;
            }

            const response = await monitoringService.getNonBaseSegments(villageId);

            if (response.status === "success") {
                const format = new GeoJSON();
                const features = format.readFeatures(response.result, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: 'EPSG:3857'
                });
                features.forEach(f => {
                    f.set("is_lingkungan_segment", true);
                });
                nonBaseSourceRef.current?.clear();
                nonBaseSourceRef.current?.addFeatures(features);

                // Update the ref after successful fetch
                lastLoadedDesaId.current = villageId;
            }
        };

        fetchNonBase();
    }, [isMounted, sidebarRefreshTrigger, selectedRoad]);

    useEffect(() => {
        // Manage individual layer visibility and stack order based on visibleLayers state
        // Order in visibleLayers: [topmost, ..., bottommost]
        const reversedLayers = [...visibleLayers].reverse();

        // Map layer IDs to their respective OpenLayers layer refs
        const layerMap: Record<string, MutableRefObject<any>> = {
            "non-base": nonBaseLayerRef,
            "wms-jalan-kabupaten": jalanKabupatenWmsLayerRef,
            "road-desa-wms": roadDesaWmsLayerRef,
            "ruas-utama": ruasUtamaLayerRef,
            "segmen-desa": segmenDesaLayerRef,
            "jalan-kabupaten": jalanKabupatenLayerRef,
            "boundary-village": desaLayerRef,
            "sta-markers": staLayerRef
        };

        visibleLayers.forEach((layerItem) => {
            let layer: any;
            const ref = layerMap[layerItem.id];
            if (ref?.current) {
                layer = ref.current;
            } else {
                layer = mapRef.current?.getLayers().getArray().find(l => l.get('id') === layerItem.id);
            }

            if (layer) {
                layer.setVisible(layerItem.visible);
                
                // Strict Z-Index: Ruas Utama at bottom, Segments at top
                let zIndex = 10;
                if (layerItem.id === "ruas-utama") {
                    zIndex = 5;
                } else if (layerItem.id === "segmen-desa") {
                    zIndex = 20;
                } else if (layerItem.id === "jalan-kabupaten") {
                    zIndex = 21;
                } else {
                    zIndex = visibleLayers.findIndex(l => l.id === layerItem.id) + 10;
                }
                
                layer.setZIndex(zIndex);
            }
        });

        // Dynamic Z-Index for drawing layer
        if (vectorLayerRef.current) {
            // Always keep drawing layer on top during active editing/drawing to ensure interactions work
            const isEditingMode = mode === "edit" || mode.startsWith("draw-");
            if (isEditingMode) {
                vectorLayerRef.current.setZIndex(1000); 
                
                // ALWAYS elevate the segments above everything else during ANY editing mode.
                // This guarantees that Jalan Desa and Jalan Kabupaten are never obscured by Ruas Utama 
                // or any drawing sketches, serving as a reliable visual reference.
                if (segmenDesaLayerRef.current) segmenDesaLayerRef.current.setZIndex(1001);
                if (jalanKabupatenLayerRef.current) jalanKabupatenLayerRef.current.setZIndex(1002);
                if (ruasUtamaLayerRef.current) ruasUtamaLayerRef.current.setZIndex(990);
            } else {
                vectorLayerRef.current.setZIndex(999);
                // When not editing, the previous loop already reset them to 20/21.
            }
        }
    }, [visibleLayers, mode, isContinuing, isMounted, editingFeatureId]);

    const handleResetLayerOrder = useCallback(() => {
        setVisibleLayers(prev => {
            // Define standard order
            const order = ["sta-markers", "segmen-desa", "jalan-kabupaten", "ruas-utama", "non-base", "boundary-village", "wms-jalan-kabupaten", "road-desa-wms"];

            // Sort existing layers based on standard order
            const sorted = [...prev].sort((a, b) => {
                const idxA = order.indexOf(a.id);
                const idxB = order.indexOf(b.id);
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
            });

            return sorted;
        });
        toast.info("Urutan layer dikembalikan ke default");
    }, []);

    const handleToggleLayer = (id: string, visible: boolean) => {
        setVisibleLayers(prev => prev.map(l => l.id === id ? { ...l, visible } : l));
    };

    const handleReorderLayers = (newLayers: any[]) => {
        setVisibleLayers(newLayers);
    };

    const handleZoomIn = () => {
        const view = mapRef.current?.getView();
        if (view) view.animate({ zoom: (view.getZoom() || 0) + 1, duration: 500 });
    };

    const handleZoomOut = () => {
        const view = mapRef.current?.getView();
        if (view) view.animate({ zoom: (view.getZoom() || 0) - 1, duration: 500 });
    };

    const handleResetView = () => {
        const view = mapRef.current?.getView();
        if (view) {
            view.animate({ rotation: 0, duration: 250 });
            if (existingSourceRef.current && existingSourceRef.current.getFeatures().length > 0) {
                const extent = existingSourceRef.current.getExtent();
                view.fit(extent, { padding: getMapPadding(40), duration: 1000, maxZoom: 18 });
            }
        }
    };

    const handleCopyCoordinatesFromMenu = useCallback(() => {
        if (contextMenuCoords) {
            const text = `${contextMenuCoords.lat.toFixed(6)}, ${contextMenuCoords.lng.toFixed(6)}`;
            navigator.clipboard.writeText(text);
            setLastCopiedCoords(contextMenuCoords);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
            toast.success(`Copied: ${text}`);
        }
    }, [contextMenuCoords]);

    const handleExportMapImage = useCallback(async (action: 'save' | 'copy') => {
        if (!mapRef.current) return;

        toast.info("Preparing image export...");

        mapRef.current.once('rendercomplete', async () => {
            try {
                const mapCanvas = document.createElement('canvas');
                const size = mapRef.current!.getSize()!;
                mapCanvas.width = size[0];
                mapCanvas.height = size[1];
                const mapContext = mapCanvas.getContext('2d')!;

                const canvasElements = document.querySelectorAll('.ol-layer canvas');

                canvasElements.forEach((canvasItem: any) => {
                    if (canvasItem.width > 0) {
                        const opacity = canvasItem.parentNode.style.opacity;
                        mapContext.globalAlpha = opacity === "" ? 1 : Number(opacity);
                        const transform = canvasItem.style.transform;
                        // Get transformation matrix from the style of the canvas
                        const matrix = transform
                            .match(/^matrix\(([^\(]*)\)$/)?.[1]
                            .split(',')
                            .map(Number);

                        if (matrix) {
                            mapContext.setTransform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
                        } else {
                            mapContext.setTransform(1, 0, 0, 1, 0, 0);
                        }
                        mapContext.drawImage(canvasItem, 0, 0);
                    }
                });

                // Reset transform
                mapContext.setTransform(1, 0, 0, 1, 0, 0);

                if (action === 'save') {
                    const link = document.createElement('a');
                    link.download = `map_export_${new Date().getTime()}.png`;
                    link.href = mapCanvas.toDataURL();
                    link.click();
                    toast.success("Image saved successfully");
                } else if (action === 'copy') {
                    mapCanvas.toBlob(async (blob) => {
                        if (blob) {
                            try {
                                await navigator.clipboard.write([
                                    new ClipboardItem({ 'image/png': blob })
                                ]);
                                toast.success("Image copied to clipboard");
                            } catch (err) {
                                console.error(err);
                                toast.error("Failed to copy image. Your browser may not support clipboard image writing.");
                            }
                        }
                    }, 'image/png');
                }
            } catch (error) {
                console.error("Export error:", error);
                toast.error("Gagal mengekspor gambar. Pastikan semua layer dapat diakses (CORS).");
            }
        });

        mapRef.current.renderSync();
    }, []);

    const handleExport = () => {
        if (!sourceRef.current) return;
        const format = new GeoJSON();
        const features = sourceRef.current.getFeatures();
        const json = format.writeFeatures(features, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
        });
        toast.success("GeoJSON exported");
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "map-features.geojson";
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSaveSegment = async (data: any) => {
        try {
            if (editingFeatureId) {
                await monitoringService.updateSegment(editingFeatureId, data);
            } else {
                await monitoringService.createSegment(data);
            }
            setSidebarRefreshTrigger(prev => prev + 1);
            if (selectedRoad) {
                refreshSegmentData(selectedRoad.jalan.id, segmentFilters, true);
            }
            sourceRef.current?.clear();
            setDrawnGeoJSON(null);
            setHasTemporaryFeature(false);
            setIsPanelVisible(false);
            setEditingFeatureId(null);
            setSegmentPanelVisible(true);
            setMode("view");
        } catch (error) {
            // Error toast is already handled by API client
        }
    };

    const handleCancelReshape = () => {
        // Reset state
        originalEditFeatureRef.current = null;
        sourceRef.current?.clear();
        setDrawnGeoJSON(null);
        setHasTemporaryFeature(false);
        setIsPanelVisible(false);
        setEditingFeatureId(null);
        setEditingFeatureData(null);
        setIsContinuing(false);
        setMode("view");
        if (selectedRoad) {
            refreshSegmentData(selectedRoad.jalan.id, segmentFilters, true);
            setSegmentPanelVisible(true);
        }
    };

    const handleContinueDrawing = (feature: any) => {
        if (!feature) return;
        
        if (feature.get("is_base_jalan")) {
            toast.warning("Gunakan fitur 'Teruskan Garis' hanya pada segmen jalan, bukan pada Ruas Utama.");
            return;
        }

        handleEditSegment(feature);
        setIsContinuing(true);
        setMode("draw-line");
        vectorLayerRef.current?.changed();
        toast.info("Mode Teruskan Garis Aktif: Klik pada ujung garis untuk melanjutkan.");
    };

    const handleDeleteSegment = async (feature: any) => {
        const id = feature.getId() || feature.get("id");
        if (!id) return;
        try {
            await monitoringService.deleteSegment(id);

            // Remove from all potential sources to ensure it disappears immediately
            [
                existingSourceRef,
                segmenDesaSourceRef,
                nonBaseSourceRef,
                ruasUtamaSourceRef,
                sourceRef,
                jalanKabupatenSourceRef
            ].forEach(sourceRef => {
                const source = sourceRef.current;
                if (source) {
                    const f = source.getFeatureById(id) ||
                        source.getFeatures().find(feat => feat.get('id') === id);
                    if (f) source.removeFeature(f);
                }
            });
            if (editingFeatureId === id) {
                setEditingFeatureId(null);
                setMode("view");
            }
            setSidebarRefreshTrigger(prev => prev + 1);
            if (selectedRoad) await refreshSegmentData(selectedRoad.jalan.id);
        } catch (error) {
            // Error toast is already handled by API client
        }
    };

    const handleZoomToSegment = (feature: any) => {
        const extent = feature.getGeometry().getExtent();
        mapRef.current?.getView().fit(extent, {
            padding: getMapPadding(40),
            duration: 1000
        });
    };

    const handleEditSegment = (feature: any) => {
        if (!sourceRef.current || !feature) return;
        
        const isBase = feature.get("is_base_jalan");
        if (isBase) {
            toast.warning("Ruas Utama hanya digunakan sebagai acuan dan tidak dapat diedit secara langsung.");
            return;
        }

        const id = feature.getId() || feature.get("id");

        // Remove from all potential sources to ensure it disappears from view while editing (prevent overlay)
        if (id) {
            [
                existingSourceRef,
                segmenDesaSourceRef,
                nonBaseSourceRef,
                ruasUtamaSourceRef,
                jalanKabupatenSourceRef
            ].forEach(srcRef => {
                const source = srcRef.current;
                if (source) {
                    const f = source.getFeatureById(id) ||
                        source.getFeatures().find(feat => feat.get('id') === id);
                    if (f) source.removeFeature(f);
                }
            });
        }

        const clone = feature.clone();
        clone.setId(id);
        clone.setStyle(null);
        sourceRef.current.clear();
        sourceRef.current.addFeature(clone);
        originalEditFeatureRef.current = feature.clone();
        const props = feature.getProperties();

        // Calculate length for editing existing feature
        const geometry = feature.getGeometry();
        if (geometry instanceof LineString) {
            const format = new GeoJSON();
            try {
                const gj = format.writeGeometryObject(geometry, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: 'EPSG:3857'
                }) as any;
                const initialDistance = turf.length(turf.lineString(gj.coordinates), { units: 'meters' });
                setDrawnLength(initialDistance);
            } catch (e) { }
        }

        setMode("edit");
        setHasTemporaryFeature(true);
        setEditingFeatureId(feature.getId() || feature.get("id"));
        setEditingFeatureData(props);
        setSegmentPanelVisible(true);
        const extent = clone.getGeometry().getExtent();
        mapRef.current?.getView().fit(extent, {
            padding: getMapPadding(80),
            duration: 500
        });
    };

    const handleMonitoringSegment = (segment: any) => {
        setSelectedSegmentForMonitoring(segment);
        setIsMonitoringPanelVisible(true);
    };

    const handleFinishReshape = () => {
        if (!sourceRef.current) return;
        const features = sourceRef.current.getFeatures();
        if (features.length > 0) {
            const format = new GeoJSON();

            // Calculate length on finish reshape
            const geometry = features[0].getGeometry();
            if (geometry instanceof LineString) {
                try {
                    const gj = format.writeGeometryObject(geometry, {
                        dataProjection: 'EPSG:4326',
                        featureProjection: 'EPSG:3857'
                    }) as any;
                    const finalDistance = turf.length(turf.lineString(gj.coordinates), { units: 'meters' });
                    setDrawnLength(finalDistance);
                } catch (e) { }
            }

            const json = format.writeFeature(features[0], {
                dataProjection: "EPSG:4326",
                featureProjection: "EPSG:3857",
            });
            const featureJson = JSON.parse(json);
            if (!selectedRoad || features[0].get("is_lingkungan_segment")) {
                featureJson.properties = {
                    ...featureJson.properties,
                    is_lingkungan_segment: true
                };
            }
            setDrawnGeoJSON(JSON.stringify(featureJson));
            setIsPanelVisible(true);
            setMode("view");
        }
    };

    const handleClear = () => {
        sourceRef.current?.clear();
        setDrawnGeoJSON(null);
        setHasTemporaryFeature(false);
        setDrawnLength(0);
        setIsContinuing(false);
        toast.info("Map cleared");
    };

    const handleRefreshAll = async () => {
        toast.info("Memuat ulang data...");

        // 1. Refresh MonitoringList in sidebar
        setSidebarRefreshTrigger(prev => prev + 1);

        // 2. Refresh OpenLayer Map and SegmenList if a road is selected
        if (selectedRoad) {
            await refreshSegmentData(selectedRoad.jalan.id);
            toast.success("Data berhasil dimuat ulang");
        } else {
            toast.success("MonitoringList berhasil dimuat ulang");
        }
    };

    const handleCoordinateSearch = (coords: { lat: number, lng: number }[]) => {
        if (!searchSourceRef.current) return;

        searchSourceRef.current.clear();
        if (!mapRef.current || coords.length === 0) return;

        const features = coords.map((c, index) => {
            const f = new GeoJSON().readFeature({
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [c.lng, c.lat]
                },
                properties: {
                    label: `Point ${index + 1}`
                }
            }, {
                dataProjection: "EPSG:4326",
                featureProjection: "EPSG:3857"
            });
            return f;
        });

        const allFeatures = features.flat() as any[];
        searchSourceRef.current.addFeatures(allFeatures);

        const view = mapRef.current.getView();
        if (allFeatures.length === 1) {
            const coord = (allFeatures[0].getGeometry() as any).getCoordinates();
            view.animate({
                center: coord,
                zoom: 17,
                duration: 1000
            });
        } else {
            const extent = searchSourceRef.current.getExtent();
            view.fit(extent, {
                padding: getMapPadding(40),
                duration: 1000,
                maxZoom: 17
            });
        }
        if (isMobile) {
            setIsSidebarOpen(false);
            setIsSegmentPanelOpen(false);
        }

        toast.success(`Berhasil menemukan ${allFeatures.length} lokasi`);
    };

    const loadVillageGeoJSON = async (villageId: string) => {
        if (!villageId) return;
        
        toast.info("Memuat data spasial desa...");
        try {
            const [roadsRes, segmentsRes] = await Promise.all([
                monitoringService.getJalanByDesaGeoJSON(villageId),
                monitoringService.getSegmenByDesaGeoJSON(villageId)
            ]);

            const format = new GeoJSON();

            // 1. Village Roads (Base Roads)
            if (roadsRes && roadsRes.features) {
                const features = format.readFeatures(roadsRes, {
                    dataProjection: "EPSG:4326",
                    featureProjection: "EPSG:3857",
                });
                features.forEach(f => {
                    f.set("is_base_jalan", true);
                    f.set("kode_ruas_layer", `d-${villageId}`);
                    // IMPORTANT: Set id_desa so the style filter doesn't hide it
                    f.set("id_desa", villageId);
                });
                ruasUtamaSourceRef.current?.addFeatures(features);
            }

            // 2. Road Segments
            if (segmentsRes && segmentsRes.features) {
                const features = format.readFeatures(segmentsRes, {
                    dataProjection: "EPSG:4326",
                    featureProjection: "EPSG:3857",
                });
                features.forEach(f => {
                    f.set("kode_ruas_layer", `d-${villageId}`);
                    // IMPORTANT: Set id_desa so the style filter doesn't hide it
                    f.set("id_desa", villageId);
                    const statusJalan = f.get("status_jalan");
                    if (statusJalan === "Jalan Kabupaten") {
                        jalanKabupatenSourceRef.current?.addFeature(f);
                    } else {
                        segmenDesaSourceRef.current?.addFeature(f);
                    }
                });
            }

            toast.success("Data desa berhasil dimuat");
            syncSegmentListFromMap({ desaId: villageId });
        } catch (error) {
            console.error("Error loading village geojson:", error);
            toast.error("Gagal memuat data spasial desa");
        }
    };

    const handleKecamatanChange = async (idKecamatan: string) => {
        setSelectedDesaId(null);
        setSelectedKecamatanId(idKecamatan);
        setActiveKecamatanName(null);
        
        // Clear all dynamic data layers
        desaSourceRef.current?.clear();
        highlightSourceRef.current?.clear();
        ruasUtamaSourceRef.current?.clear();
        segmenDesaSourceRef.current?.clear();
        jalanKabupatenSourceRef.current?.clear();
        staSourceRef.current?.clear();
        
        // Clear CQL filters on WMS layers
        [roadDesaWmsLayerRef, jalanKabupatenWmsLayerRef].forEach(ref => {
            if (ref.current) {
                const source = ref.current.getSource();
                if (source instanceof TileWMS) {
                    source.updateParams({ 'CQL_FILTER': undefined });
                }
            }
        });

        if (idKecamatan === "all") return;

        toast.info("Memuat batas desa...");
        try {
            // Get kecamatan name
            const kecamatanList = await kecamatanService.getKecamatan();
            const currentKec = kecamatanList.find((k: any) => k.id.toString() === idKecamatan);
            if (currentKec) setActiveKecamatanName(currentKec.nama_kecamatan);

            // ONLY load village boundaries initially
            const boundaryRes = await monitoringService.getDesaGeoJSONByKecamatan(idKecamatan);

            const format = new GeoJSON();

            // 1. Village Boundaries
            if (boundaryRes && boundaryRes.features) {
                const features = format.readFeatures(boundaryRes, {
                    dataProjection: "EPSG:4326",
                    featureProjection: "EPSG:3857",
                });
                features.forEach(f => f.set("is_village_boundary", true));
                desaSourceRef.current?.addFeatures(features);
                
                const extent = desaSourceRef.current?.getExtent();
                if (extent && !isEmptyExtent(extent)) {
                    mapRef.current?.getView().fit(extent, {
                        padding: getMapPadding(40),
                        duration: 1000,
                        maxZoom: 16
                    });
                }
            }

            toast.success("Batas desa berhasil dimuat");
            // Clear the list since no roads are loaded yet
            setFeaturesList([]);
        } catch (error) {
            console.error("Error loading kecamatan data:", error);
            toast.error("Gagal memuat batas wilayah");
        }
    };


    // Multi-select handler
    const handleToggleCheckRoad = async (id: string, checked: boolean) => {
        if (checked) {
            setCheckedRoadIds(prev => {
                if (prev.includes(id)) return prev;
                return [...prev, id];
            });

            // Fetch road detail to get name for the layer label
            try {
                const response = await monitoringService.getJalanByIdGeoJSON(id);
                if (response) {
                    const jalanFeature = response.features?.[0];
                    const props = jalanFeature?.properties || {};
                    const jalanData = props.dataValues || props;

                    const kodeRuas = jalanData.kode_ruas || id;
                    const namaRuas = jalanData.nama_ruas || 'Nama tidak tersedia';
                    const roadLabel = `${kodeRuas} - ${namaRuas}`;
                    const layerId = `road-${id}`;

                    setVisibleLayers(prev => {
                        if (prev.find(l => l.id === layerId)) return prev;
                        return [...prev, {
                            id: layerId,
                            label: roadLabel,
                            visible: true,
                            color: "#ffa500",
                            category: "Ruas Terpilih"
                        }];
                    });

                    // Render the segments on the map
                    const format = new GeoJSON();
                    
                    // PREVENT STACKING: Remove existing features for this road first
                    [ruasUtamaSourceRef, segmenDesaSourceRef, jalanKabupatenSourceRef, staSourceRef].forEach(sourceRef => {
                        const source = sourceRef.current;
                        if (source) {
                            const featuresToRemove = source.getFeatures().filter(f => f.get("kode_ruas_layer") === id);
                            featuresToRemove.forEach(f => source.removeFeature(f));
                        }
                    });

                    // Add main road
                    const roadFeatures = format.readFeatures(response, {
                        dataProjection: "EPSG:4326",
                        featureProjection: "EPSG:3857",
                    });
                    roadFeatures.forEach(f => {
                        f.set("is_base_jalan", true);
                        f.set("kode_ruas_layer", id);
                        if (!f.getId()) f.setId(`base-${id}-${Math.random()}`);
                    });
                    ruasUtamaSourceRef.current?.addFeatures(roadFeatures);

                    // Fetch and add segments
                    const segmentsResponse = await monitoringService.getSegmenByJalanId(id);
                    if (segmentsResponse.status === "success" && segmentsResponse.result?.features) {
                        const segmentFeatures = format.readFeatures(segmentsResponse.result, {
                            dataProjection: "EPSG:4326",
                            featureProjection: "EPSG:3857",
                        });
                        segmentFeatures.forEach(f => {
                            f.set("kode_ruas_layer", id);
                            const statusJalan = f.get("status_jalan");
                            if (statusJalan === "Jalan Kabupaten") {
                                jalanKabupatenSourceRef.current?.addFeature(f);
                            } else {
                                segmenDesaSourceRef.current?.addFeature(f);
                            }
                        });
                    }

                    // Add STA markers
                    updateSTAMarkers(id, response);
                    
                    // Sync segment list
                    syncSegmentListFromMap();
                }
            } catch (error) {
                console.error("Error checking road:", error);
                toast.error("Gagal memuat data jalan");
            }
        } else {
            setCheckedRoadIds(prev => prev.filter(roadId => roadId !== id));
            const layerId = `road-${id}`;
            setVisibleLayers(prev => prev.filter(l => l.id !== layerId));

            // Remove features from map sources matching this road
            [ruasUtamaSourceRef, segmenDesaSourceRef, jalanKabupatenSourceRef, staSourceRef].forEach(sourceRef => {
                const source = sourceRef.current;
                if (source) {
                    const featuresToRemove = source.getFeatures().filter(f => f.get("kode_ruas_layer") === id);
                    featuresToRemove.forEach(f => source.removeFeature(f));
                }
            });

            // Sync segment list after removal
            syncSegmentListFromMap();
        }
    };

    const updateSTAMarkers = (roadId: string, roadFeatureData: any) => {
        if (!staSourceRef.current || !roadFeatureData) return;

        // Clear existing markers for this road
        const existingFeatures = staSourceRef.current.getFeatures();
        existingFeatures.forEach(f => {
            if (f.get("kode_ruas_layer") === roadId) {
                staSourceRef.current?.removeFeature(f);
            }
        });

        const format = new GeoJSON();
        const features = format.readFeatures(roadFeatureData, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
        });

        features.forEach(f => {
            const geom = f.getGeometry();
            let startCoord = null;
            let endCoord = null;
            let roadLength = 0;

            if (geom instanceof LineString) {
                startCoord = geom.getFirstCoordinate();
                endCoord = geom.getLastCoordinate();
                roadLength = getLength(geom);
            } else if (geom instanceof MultiLineString) {
                const lineStrings = geom.getLineStrings();
                if (lineStrings.length > 0) {
                    startCoord = lineStrings[0].getFirstCoordinate();
                    endCoord = lineStrings[lineStrings.length - 1].getLastCoordinate();
                    roadLength = getLength(geom);
                }
            }

            if (startCoord && endCoord) {
                // Marker Start (STA 0+000)
                const startMarker = new Feature({
                    geometry: new Point(startCoord),
                    sta_label: "STA 0+000",
                    kode_ruas_layer: roadId
                });
                staSourceRef.current?.addFeature(startMarker);

                // Marker End (STA total length)
                const km = Math.floor(roadLength / 1000);
                const m = Math.round(roadLength % 1000);
                const endLabel = `STA ${km}+${m.toString().padStart(3, '0')}`;

                const endMarker = new Feature({
                    geometry: new Point(endCoord),
                    sta_label: endLabel,
                    kode_ruas_layer: roadId
                });
                staSourceRef.current?.addFeature(endMarker);
            }
        });
    };

    const handleClearCheckedRoads = () => {
        // Clear state
        setCheckedRoadIds([]);

        // Clear visible layers that are roads
        setVisibleLayers(prev => prev.filter(l => !l.id.startsWith("road-")));

        // Clear features from map
        [ruasUtamaSourceRef, segmenDesaSourceRef, jalanKabupatenSourceRef, staSourceRef].forEach(sourceRef => {
            const source = sourceRef.current;
            if (source) {
                const featuresToRemove = source.getFeatures().filter(f => {
                    const kId = f.get("kode_ruas_layer");
                    return kId && kId !== selectedRoad?.jalan.id; // Keep selected road
                });
                featuresToRemove.forEach(f => source.removeFeature(f));
            }
        });

        toast.info("Berhasil membersihkan checklist");
    };

    const handleSelectRoadOnMobile = (road: MonitoringJalanResult | null) => {
        setSelectedRoad(road);
        if (road) {
            setSegmentPanelVisible(true);
            setIsSegmentPanelOpen(!isMobile);
            // Sync list for this road
            syncSegmentListFromMap({ kodeRuas: road.jalan.kode_ruas });
        } else {
            // If cleared, sync from all features on map
            syncSegmentListFromMap();
        }
        if (isMobile && road) {
            setIsSidebarOpen(false);
        }
    };

    const formatNumber = (val: any) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (typeof num !== 'number' || isNaN(num)) return '0,00';
        return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <TooltipProvider>
            <div className="flex flex-1 h-screen min-h-0 w-full overflow-hidden relative bg-slate-50 dark:bg-slate-950">
                <DrawSidebar
                    onSelectRoad={handleSelectRoadOnMobile}
                    selectedRoad={selectedRoad}
                    onStartDraw={() => setMode("draw-line")}
                    isDrawing={mode.startsWith("draw-")}
                    isOpen={isSidebarOpen}
                    onToggle={setIsSidebarOpen}
                    refreshTrigger={sidebarRefreshTrigger}
                    onCoordinateSearch={handleCoordinateSearch}
                    onRefresh={handleRefreshAll}
                    checkedRoadIds={checkedRoadIds}
                    onToggleCheckRoad={handleToggleCheckRoad}
                    onKecamatanChange={handleKecamatanChange}
                    onDesaChange={setSelectedDesaId}
                    selectedDesaId={selectedDesaId}
                    selectedKecamatanId={selectedKecamatanId}
                />


                <div className="flex-1 flex flex-col relative">
                    <div className="relative flex-1 overflow-hidden">
                        <ContextMenu onOpenChange={(open) => {
                            if (!open && pulseOverlayRef.current) {
                                pulseOverlayRef.current.setPosition(undefined);
                            }
                        }}>
                            <ContextMenuTrigger
                                className="absolute inset-0"
                                onContextMenu={(e) => {
                                    if (mapRef.current) {
                                        const pixel = mapRef.current.getEventPixel(e.nativeEvent);
                                        const coordinate = mapRef.current.getCoordinateFromPixel(pixel);
                                        const lonLat = toLonLat(coordinate);
                                        setContextMenuCoords({ lat: lonLat[1], lng: lonLat[0] });

                                        // Set pulse marker position
                                        if (pulseOverlayRef.current) {
                                            pulseOverlayRef.current.setPosition(coordinate);
                                        }

                                        // Hit detection for features
                                        const features = mapRef.current.getFeaturesAtPixel(pixel, {
                                            layerFilter: (l) =>
                                                l === segmenDesaLayerRef.current ||
                                                l === jalanKabupatenLayerRef.current ||
                                                l === vectorLayerRef.current ||
                                                l === nonBaseLayerRef.current ||
                                                l === ruasUtamaLayerRef.current ||
                                                l === existingLayerRef.current,
                                            hitTolerance: 15
                                        });

                                        if (features.length > 0) {
                                            // Explicitly prioritize segments over base roads for right-click actions
                                            const prioritizedFeature = features.find((f: any) => !f.get("is_base_jalan")) || features[0];
                                            setRightClickedFeature(prioritizedFeature as Feature);
                                        } else {
                                            setRightClickedFeature(null);
                                        }
                                    }
                                }}
                            >
                                <div ref={mapElement} className="w-full h-full map-container" />
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-48 bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-xl p-1">
                                <ContextMenuItem
                                    onClick={handleCopyCoordinatesFromMenu}
                                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg cursor-pointer transition-colors"
                                >
                                    <Copy className="h-4 w-4 text-blue-500" />
                                    <span className="tracking-tight">Salin Koordinat</span>
                                    <ContextMenuShortcut className="text-[10px] opacity-50 uppercase font-black ml-auto">⌘C</ContextMenuShortcut>
                                </ContextMenuItem>

                                {rightClickedFeature && !rightClickedFeature.get("is_base_jalan") && (
                                    <ContextMenuItem
                                        onClick={() => handleContinueDrawing(rightClickedFeature)}
                                        className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-600 rounded-lg cursor-pointer transition-colors"
                                    >
                                        <Sparkles className="h-4 w-4 text-purple-500" />
                                        <span className="tracking-tight">Teruskan Garis</span>
                                    </ContextMenuItem>
                                )}
                                <ContextMenuItem
                                    onClick={() => handleExportMapImage('save')}
                                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg cursor-pointer transition-colors"
                                >
                                    <Download className="h-4 w-4 text-emerald-500" />
                                    <span className="tracking-tight">Save as Image</span>
                                </ContextMenuItem>
                                <ContextMenuItem
                                    onClick={() => handleExportMapImage('copy')}
                                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg cursor-pointer transition-colors"
                                >
                                    <Copy className="h-4 w-4 text-amber-500" />
                                    <span className="tracking-tight">Copy as Image</span>
                                </ContextMenuItem>
                            </ContextMenuContent>
                        </ContextMenu>

                        <GeolocationControl
                            map={mapRef.current}
                            className={cn(
                                "absolute bottom-36 transition-transform duration-500 z-30 will-change-transform",
                                isSidebarOpen ? "left-2 translate-x-80" : "left-2"
                            )}
                        />

                        <MapControls
                            onZoomIn={handleZoomIn}
                            onZoomOut={handleZoomOut}
                            onResetBearing={handleResetView}
                            className={cn(
                                "absolute bottom-2 left-2 transition-transform duration-500 z-30 will-change-transform",
                                isSidebarOpen && "translate-x-80"
                            )}
                        />

                        <DrawControls
                            mode={mode}
                            onSetMode={setMode}
                            onClear={handleClear}
                            onExport={handleExport}
                            onFinishReshape={handleFinishReshape}
                            canFinishReshape={mode === "edit" && hasTemporaryFeature && !isPanelVisible}
                            onCancelReshape={handleCancelReshape}
                            className={cn(
                                "absolute top-2 left-2 transition-transform duration-500 z-30 will-change-transform",
                                isSidebarOpen && "translate-x-80"
                            )}
                        />


                        <div className={cn(
                            "absolute top-2 right-2 transition-transform duration-500 z-40 will-change-transform flex gap-2 items-center",
                            segmentPanelVisible && isSegmentPanelOpen && "-translate-x-80"
                        )}>

                            {/* Clear Selected Layers Button */}
                            {checkedRoadIds.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleClearCheckedRoads}
                                    className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-800 transition-all rounded-xl h-10 px-3 text-[10px] font-bold uppercase tracking-wider"
                                    title="Clear Selected Layers"
                                >
                                    Clear
                                </Button>
                            )}

                            <LayerToggle
                                onClick={() => setIsLayerPanelOpen(!isLayerPanelOpen)}
                                isActive={isLayerPanelOpen}
                            />
                        </div>

                        <LayerTogglePanel
                            isVisible={isLayerPanelOpen}
                            onClose={() => setIsLayerPanelOpen(false)}
                            layers={visibleLayers}
                            onToggle={handleToggleLayer}
                            onReorder={handleReorderLayers}
                            onResetOrder={handleResetLayerOrder}
                            onClearAll={handleClearCheckedRoads}
                            onOpenCatalog={() => setIsCatalogOpen(true)}
                            onRemoveLayer={handleRemoveLayer}
                            onApplyCQL={handleApplyCQL}
                        />

                        <BasemapToggle
                            activeBasemap={activeBasemap}
                            onBasemapChange={(id) => setActiveBasemap(id as BasemapId)}
                            className={cn(
                                "absolute bottom-2 right-2 transition-transform duration-500 z-40 will-change-transform",
                                segmentPanelVisible && isSegmentPanelOpen && "-translate-x-80"
                            )}
                        />

                        {/* Floating Selected Road Info */}
                        {selectedRoad && mode === "view" && (
                            <div className={cn(
                                "absolute top-2 left-1/2 -translate-x-1/2 z-20 w-full px-4 transition-all duration-500 will-change-transform",
                                isRoadInfoMinimized ? "max-w-[200px]" : "max-w-xs md:max-w-sm",
                                isSidebarOpen && "md:translate-x-[calc(-50%+160px)]",
                                segmentPanelVisible && isSegmentPanelOpen && "md:translate-x-[calc(-50%-160px)]",
                                isSidebarOpen && segmentPanelVisible && isSegmentPanelOpen && "md:translate-x-[-50%]"
                            )}>
                                {isRoadInfoMinimized ? (
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsRoadInfoMinimized(false)}
                                        className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl h-11 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl flex items-center gap-3 px-3 group animate-in zoom-in-95 duration-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                    >
                                        <div className="flex flex-col items-start min-w-0 flex-1 overflow-hidden">
                                            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Ruas {selectedRoad.jalan.kode_ruas}</span>
                                            <span className="text-[10px] font-black text-slate-800 dark:text-slate-100 truncate w-full text-left">
                                                {selectedRoad.jalan.nama_ruas || 'Nama tidak tersedia'}
                                            </span>
                                        </div>
                                        <Maximize2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
                                    </Button>
                                ) : (
                                    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-3.5 rounded-2xl border border-white/20 dark:border-slate-800 shadow-[0_15px_40px_rgba(0,0,0,0.12)] animate-in slide-in-from-top-4 duration-500 relative group">
                                        <button
                                            onClick={() => setIsRoadInfoMinimized(true)}
                                            className="absolute top-2 right-2 h-7 w-7 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-500 transition-all z-30"
                                            title="Hide Panel"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <div className="flex flex-col gap-2.5">
                                            <div className="min-w-0 pr-6">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">
                                                        Ruas {selectedRoad.jalan.kode_ruas}
                                                    </span>
                                                </div>
                                                <h2 className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">
                                                    {selectedRoad.jalan.nama_ruas || 'Nama tidak tersedia'}
                                                </h2>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/50">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase leading-none mb-1">Panjang</span>
                                                        <span className="text-xs font-black text-blue-600 dark:text-blue-400 leading-none">{formatNumber(selectedRoad.jalan.panjang)}m</span>
                                                    </div>
                                                    <div className="w-px h-6 bg-slate-100 dark:bg-slate-800" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase leading-none mb-1">Lebar</span>
                                                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 leading-none">{formatNumber(selectedRoad.jalan.lebar)}m</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className={cn(
                            "absolute top-2 left-14 z-20 pointer-events-none transition-transform duration-500 will-change-transform",
                            isSidebarOpen && "translate-x-80"
                        )}>
                            <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl">
                                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                    <MapIcon className="w-4 h-4" />
                                </div>
                                <div>
                                    <h1 className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-tight uppercase leading-none">Map Editor</h1>
                                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase mt-0.5">Vector Studio</p>
                                </div>
                            </div>
                        </div>

                        {mode !== "view" && (
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-2xl z-10 flex items-center gap-2 animate-in slide-in-from-top-4 border border-blue-400">
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                <span className="text-xs font-bold uppercase tracking-wider">
                                    {mode === "edit" ? "Modify Mode: Drag points to reshape" :
                                        mode === "draw-automatic" ? "Mode Otomatis: Klik 2 titik pada peta" :
                                            `Drawing Mode: Click to place ${mode.split("-")[1]}`}
                                </span>
                            </div>
                        )}


                        {isFetchingDetail && (
                            <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] z-30 flex items-center justify-center">
                                <div className="bg-white p-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in zoom-in-95">
                                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                    <span className="text-sm font-bold text-slate-700">Loading existing segments...</span>
                                </div>
                            </div>
                        )}

                        {isExtracting && (
                            <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-[2px] z-50 flex items-center justify-center">
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-2xl border-2 border-emerald-500/20 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
                                    <div className="relative">
                                        <div className="w-12 h-12 border-4 border-emerald-100 dark:border-emerald-900/30 rounded-full" />
                                        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin absolute inset-0" />
                                        <Sparkles className="w-5 h-5 text-emerald-600 absolute inset-0 m-auto animate-pulse" />
                                    </div>
                                    <div className="text-center">
                                        <span className="text-base font-black text-slate-800 dark:text-slate-100 block uppercase tracking-tight">Ekstraksi Segmen</span>
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 block">Menghitung Jalur Terpendek...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none transition-all duration-500">
                            {activeKecamatanName && (
                                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-blue-100 dark:border-blue-900/50 shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 pointer-events-auto">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-none mb-1">Filter Kecamatan</span>
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">{activeKecamatanName}</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleKecamatanChange("all")}
                                        className="h-7 w-7 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
                            {!selectedRoad && mode !== "view" ? (
                                <div className="bg-blue-600/90 backdrop-blur-md p-2 rounded-xl border border-blue-400 shadow-xl text-[10px] font-bold text-white uppercase tracking-widest animate-in slide-in-from-bottom-4">
                                    Menggambar Jalan Non Melarosa (Non-Ruas)
                                </div>
                            ) : null}
                        </div>


                        {/* Vector Feature Popup (Portal/Overlay) */}
                        {selectedVectorInfo && vectorPopupElementRef.current && createPortal(
                            <div
                                className={cn(
                                    "bg-white/95 dark:bg-slate-950/95 backdrop-blur-md rounded-2xl border border-blue-100 dark:border-blue-900/50 shadow-2xl w-64 flex flex-col pointer-events-auto relative overflow-visible group mb-4 transition-all ease-in-out",
                                    isPopupMinimized ? "p-2.5 h-auto overflow-hidden" : "p-3.5 max-h-[350px]",
                                    isPopupClosing
                                        ? "animate-out zoom-out-95 fade-out duration-250"
                                        : "animate-in zoom-in-95 fade-in duration-300"
                                )}
                            >
                                {/* Pointer Arrow */}
                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-slate-950 rotate-45 border-r border-b border-blue-100/50 dark:border-blue-900/50" />

                                <style>{`
                                    .custom-scrollbar::-webkit-scrollbar {
                                        width: 3px;
                                    }
                                    .custom-scrollbar::-webkit-scrollbar-track {
                                        background: transparent;
                                    }
                                    .custom-scrollbar::-webkit-scrollbar-thumb {
                                        background: var(--border);
                                        border-radius: 20px;
                                    }
                                    @keyframes popup-highlight-flash {
                                        0%   { background-color: oklch(0.488 0.243 264.376 / 0.15); border-color: oklch(0.488 0.243 264.376 / 0.4); }
                                        60%  { background-color: oklch(0.488 0.243 264.376 / 0.12); border-color: oklch(0.488 0.243 264.376 / 0.3); }
                                        100% { background-color: transparent; border-color: transparent; }
                                    }
                                    .popup-item-highlighted {
                                        animation: popup-highlight-flash 1.2s ease-out forwards;
                                    }
                                `}</style>

                                {/* Action Buttons Container */}
                                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10 transition-opacity">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsPopupMinimized(!isPopupMinimized);
                                        }}
                                        className="h-6 w-6 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center transition-all active:scale-95 text-slate-500 dark:text-slate-400"
                                        title={isPopupMinimized ? "Expand" : "Minimize"}
                                    >
                                        {isPopupMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Trigger close animation then clear state
                                            setIsPopupClosing(true);
                                            setTimeout(() => {
                                                setSelectedVectorId(null);
                                                setSelectedVectorInfo(null);
                                                setHighlightedKey(null);
                                                vectorPopupRef.current?.setPosition(undefined);
                                                highlightSourceRef.current?.clear();
                                                jalanKabupatenWmsLayerRef.current?.changed();
                                                setIsPopupMinimized(false);
                                                setIsPopupClosing(false);
                                            }, 220);
                                        }}
                                        className="h-6 w-6 bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 rounded-lg flex items-center justify-center transition-all active:scale-95 text-slate-500 dark:text-slate-400 hover:text-red-500"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>

                                <div className="flex items-center gap-2 mb-2.5 shrink-0">
                                    <div className="p-1.5 bg-blue-500 rounded-lg shadow-blue-200/50 shadow-lg shrink-0">
                                        <Layers className="w-3 h-3 text-white" />
                                    </div>
                                    <div className="flex flex-col min-w-0 pr-14">
                                        <span className="text-[9px] uppercase font-black text-blue-600 tracking-widest leading-none mb-1">Feature Info</span>
                                        <h4 className={cn(
                                            "font-black text-slate-800 dark:text-slate-100 leading-tight transition-all truncate",
                                            isPopupMinimized ? "text-[10px]" : "text-[11px]"
                                        )}>
                                            {(selectedVectorInfo.properties.NM_RUAS || selectedVectorInfo.properties.NAME || selectedVectorInfo.properties.name || 'DATA DETAIL').toUpperCase()}
                                        </h4>
                                    </div>
                                </div>

                                {/* Content Area - Animate height/visibility */}
                                <div className={cn(
                                    "flex flex-col flex-1 min-h-0 transition-all duration-300 ease-in-out",
                                    isPopupMinimized ? "max-h-0 opacity-0 pointer-events-none" : "max-h-[300px] opacity-100 border-t border-slate-100 dark:border-slate-800 mt-2.5 pt-2.5"
                                )}>
                                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
                                        <div className="flex flex-col gap-1.5 pb-2">
                                            {Object.entries(selectedVectorInfo.properties)
                                                .filter(([key]) => !['geometry', 'bbox', 'fid', 'id', 'type'].includes(key.toLowerCase()))
                                                .map(([key, value]) => {
                                                    const isHighlighted = highlightedKey === key;
                                                    return (
                                                        <button
                                                            key={key}
                                                            type="button"
                                                            onClick={() => {
                                                                setHighlightedKey(key);
                                                                // Auto-clear after animation completes
                                                                setTimeout(() => setHighlightedKey(null), 1200);
                                                            }}
                                                            className={cn(
                                                                "flex flex-col gap-1 text-left w-full rounded-lg px-2 py-1.5 border transition-all duration-150 cursor-pointer",
                                                                isHighlighted
                                                                    ? "popup-item-highlighted ring-1 ring-blue-400/30"
                                                                    : "border-transparent hover:border-slate-100 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                                            )}
                                                        >
                                                            <span className={cn(
                                                                "text-[9px] font-black uppercase tracking-wider transition-colors",
                                                                isHighlighted ? "text-blue-500" : "text-slate-400"
                                                            )}>
                                                                {key.replace(/_/g, ' ')}
                                                            </span>
                                                            <span className={cn(
                                                                "text-xs font-bold wrap-break-word font-mono px-2 py-1 rounded-md border transition-all",
                                                                isHighlighted
                                                                    ? "text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-900/30 border-blue-200/60 dark:border-blue-700/50"
                                                                    : "text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 border-transparent"
                                                            )}>
                                                                {typeof value === 'number' ? formatNumber(value) : String(value || '-')}
                                                                {key.toLowerCase().includes('panjang') || key.toLowerCase().includes('lebar') ? ' m' : ''}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Koordinat</span>
                                        <code className="text-[9px] font-bold font-mono text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100/50 dark:border-blue-800/50 px-2 py-1 rounded-lg">
                                            {toLonLat(selectedVectorInfo.coordinate!)[1].toFixed(6)}, {toLonLat(selectedVectorInfo.coordinate!)[0].toFixed(6)}
                                        </code>
                                    </div>
                                </div>
                            </div>,
                            vectorPopupElementRef.current
                        )}
                    </div>
                </div>

                {editingFeatureId ? (
                    <DrawEditFormPanel
                        isVisible={isPanelVisible}
                        onClose={() => setIsPanelVisible(false)}
                        selectedRoad={selectedRoad}
                        drawnGeoJSON={drawnGeoJSON}
                        onSave={handleSaveSegment}
                        initialData={editingFeatureData}
                        drawnLength={drawnLength}
                    />
                ) : (
                    <DrawFormPanel
                        isVisible={isPanelVisible}
                        onClose={() => {
                            setIsPanelVisible(false);
                            if (hasTemporaryFeature) {
                                setMode("edit");
                                toast.info("Mode Reshape Aktif: Silahkan sesuaikan titik garis.");
                            }
                        }}
                        selectedRoad={selectedRoad}
                        drawnGeoJSON={drawnGeoJSON}
                        onSave={handleSaveSegment}
                        drawnLength={drawnLength}
                    />
                )}

                <RoadSegmentsPanel
                    isVisible={segmentPanelVisible}
                    isOpen={isSegmentPanelOpen}
                    onOpenChange={setIsSegmentPanelOpen}
                    onClose={() => setSegmentPanelVisible(false)}
                    segments={featuresList}
                    filters={segmentFilters}
                    onFilterChange={(newFilters) => {
                        setSegmentFilters(newFilters);
                        // No need to call syncSegmentListFromMap as the filtering is done inside the panel
                        // but if we want to filter the map features too, we would call .changed() on layers
                        ruasUtamaLayerRef.current?.changed();
                        segmenDesaLayerRef.current?.changed();
                        jalanKabupatenLayerRef.current?.changed();
                        nonBaseLayerRef.current?.changed();
                    }}
                    onZoom={handleZoomToSegment}
                    onEdit={handleEditSegment}
                    onDelete={handleDeleteSegment}
                    onMonitoring={handleMonitoringSegment}
                    onAddRuas={(type) => {
                        setEditingFeatureId(null);
                        setEditingFeatureData(null);
                        setSegmentPanelVisible(false);
                        setMode(type === 'manual' ? "draw-line" : "draw-automatic");
                    }}
                    onAddNonMelarosa={(type) => {
                        setEditingFeatureId(null);
                        setEditingFeatureData(null);
                        setSelectedRoad(null);
                        setSegmentPanelVisible(false);
                        setMode(type === 'manual' ? "draw-line" : "draw-automatic");
                    }}
                    selectedRoad={selectedRoad}
                    filters={segmentFilters}
                    onFilterChange={(newFilters) => {
                        setSegmentFilters(newFilters);
                        if (selectedRoad) {
                            refreshSegmentData(selectedRoad.jalan.id, newFilters);
                        }
                    }}
                    className="z-40"
                />

                <MonitoringProgressPanel
                    isVisible={isMonitoringPanelVisible}
                    onClose={() => setIsMonitoringPanelVisible(false)}
                    segment={selectedSegmentForMonitoring}
                />

                <Dialog open={isCatalogOpen} onOpenChange={setIsCatalogOpen}>
                    <DialogContent className="max-w-4xl h-[85vh] p-0 overflow-hidden rounded-2xl border-none shadow-2xl flex flex-col">
                        <DialogHeader className="p-6 pb-2">
                            <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-slate-800">
                                <div className="p-2 bg-blue-50 rounded-xl">
                                    <Database className="w-6 h-6 text-blue-600" />
                                </div>
                                Katalog Dataset GeoNode
                            </DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 overflow-hidden">
                            <GeonodeDatasetPanel
                                onAddLayer={handleAddLayer}
                                activeLayerIds={activeLayerIds}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}
