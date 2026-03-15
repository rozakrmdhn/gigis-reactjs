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
import { createEmpty as createEmptyExtent, extend as extendExtent } from 'ol/extent';
import { getLength } from 'ol/sphere';
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from "ol/style";
import { altKeyOnly } from "ol/events/condition";
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
import { toast } from "sonner";
import { DrawSidebar } from "~/features/monitoring/components/DrawSidebar";
import { DrawFormPanel } from "~/features/monitoring/components/DrawFormPanel";
import { MapControls } from "~/features/monitoring/components/MapControls";
import { DrawControls, type DrawMode } from "~/features/monitoring/components/DrawControls";
import { RoadSegmentsPanel } from "~/features/monitoring/components/RoadSegmentsPanel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { useIsMobile } from "~/hooks/use-mobile";
import { monitoringService, type MonitoringJalanResult } from "~/features/monitoring/services/monitoring.service";
import { DrawEditFormPanel } from "~/features/monitoring/components/DrawEditFormPanel";
import { LayerToggle } from "~/features/monitoring/components/LayerToggle";
import { LayerTogglePanel } from "~/features/monitoring/components/LayerTogglePanel";
import { BasemapToggle } from "~/features/monitoring/components/BasemapToggle";
import { GeolocationControl } from "~/features/monitoring/components/GeolocationControl";
import { MonitoringProgressPanel } from "~/features/monitoring/components/MonitoringProgressPanel";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
    return [
        { title: "Editor Peta - GIGI'S Monitoring" },
        { name: "description", content: "Editor Peta Infrastruktur Jalan Poros Desa Bojonegoro" },
    ];
};

// Performance Optimization: Reusable static instances and helpers
const geojsonFormat = new GeoJSON();

const BASEMAPS = {
    osm: {
        name: "Standard",
        source: new OSM({ crossOrigin: 'anonymous' }),
    },
    satellite: {
        name: "Satellite",
        source: new XYZ({
            url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
            attributions: '© Google',
            crossOrigin: 'anonymous'
        })
    },
    hybrid: {
        name: "Hybrid",
        source: new XYZ({
            url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
            attributions: '© Google',
            crossOrigin: 'anonymous'
        })
    },
    terrain: {
        name: "Terrain",
        source: new XYZ({
            url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
            attributions: '© Google',
            crossOrigin: 'anonymous'
        })
    },
    dark: {
        name: "Smooth Dark",
        source: new XYZ({
            url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            attributions: '© OpenStreetMap contributors, © CARTO',
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
    const k = kondisi.toLowerCase();
    if (k.includes("rusak berat")) return "#f43f5e"; // rose 500
    if (k.includes("rusak ringan")) return "#f59e0b"; // amber 500
    if (k.includes("sedang")) return "#3b82f6"; // blue 500
    return "#22c55e"; // emerald 500
};

export default function DrawPage() {
    const mapElement = useRef<HTMLDivElement>(null);
    const mapRef = useRef<OLMap | null>(null);
    const sourceRef = useRef<VectorSource | null>(null);
    const existingSourceRef = useRef<VectorSource | null>(null);
    const ruasUtamaSourceRef = useRef<VectorSource | null>(null);
    const segmenDesaSourceRef = useRef<VectorSource | null>(null);
    const jalanKabupatenSourceRef = useRef<VectorSource | null>(null);
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
    const wmsLayerRef = useRef<TileLayer<any> | null>(null);
    const jalanKabupatenVectorLayerRef = useRef<VectorLayer<any> | null>(null);
    const searchSourceRef = useRef<VectorSource | null>(null);
    const pulseOverlayRef = useRef<Overlay | null>(null);
    const pulseElementRef = useRef<HTMLDivElement | null>(null);
    const vectorPopupRef = useRef<Overlay | null>(null);
    const vectorPopupElementRef = useRef<HTMLDivElement | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [mode, setMode] = useState<DrawMode>("view");
    const [selectedRoad, setSelectedRoad] = useState<MonitoringJalanResult | null>(null);
    const [isPanelVisible, setIsPanelVisible] = useState(false);
    const [segmentPanelVisible, setSegmentPanelVisible] = useState(false);
    const [featuresList, setFeaturesList] = useState<any[]>([]);
    const [drawnGeoJSON, setDrawnGeoJSON] = useState<string | null>(null);
    const [drawnLength, setDrawnLength] = useState<number>(0);
    const [isFetchingDetail, setIsFetchingDetail] = useState(false);
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
        { id: "non-base", label: "Jalan Lingkungan", visible: true, color: "#ef4444", lineDash: [6, 6] },
        { id: "wms-jalan-kabupaten", label: "WMS Jalan Kabupaten 2022", visible: true, color: "oklch(0.546 0.245 262.881)" },
        { id: "wms-bojonegoro", label: "WMS Jalan Desa", visible: false, color: "#94a3b8" },
        { id: "ruas-utama", label: "Jalan Poros Desa", visible: true, color: "#FFA500" },
        { id: "segmen-desa", label: "Segmen Jalan Desa", visible: true, color: "#22c55e" },
        { id: "jalan-kabupaten", label: "Jalan Kabupaten", visible: true, color: "oklch(0.546 0.245 262.881)" },
        { id: "boundary-village", label: "Batas Desa", visible: true, color: "#7c3aed", lineDash: [4, 8] },
        { id: "sta-markers", label: "Marker STA", visible: true, color: "#ef4444" },
    ]);
    const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
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
    useEffect(() => {
        selectedVectorIdRef.current = selectedVectorId;
    }, [selectedVectorId]);
    const [isPopupMinimized, setIsPopupMinimized] = useState(false);
    const [activeBasemap, setActiveBasemap] = useState<BasemapId>("hybrid");

    const tileLayerRef = useRef<TileLayer<any> | null>(null);
    const tooltipRef = useRef<Overlay | null>(null);
    const tooltipElementRef = useRef<HTMLDivElement | null>(null);
    const originalEditFeatureRef = useRef<any>(null);
    const lastLoadedDesaId = useRef<string | null>(null);
    const isMobile = useIsMobile();

    // Sidebar state initialization for mobile
    useEffect(() => {
        if (isMobile) {
            setIsSidebarOpen(false);
        }
    }, [isMobile]);

    // SSR Fix: Initialize browser-only components on mount
    useEffect(() => {
        setIsMounted(true);
        if (!sourceRef.current) sourceRef.current = new VectorSource();
        if (!existingSourceRef.current) existingSourceRef.current = new VectorSource();
        if (!ruasUtamaSourceRef.current) ruasUtamaSourceRef.current = new VectorSource();
        if (!segmenDesaSourceRef.current) segmenDesaSourceRef.current = new VectorSource();
        if (!jalanKabupatenSourceRef.current) jalanKabupatenSourceRef.current = new VectorSource();
        if (!nonBaseSourceRef.current) nonBaseSourceRef.current = new VectorSource();
        if (!searchSourceRef.current) searchSourceRef.current = new VectorSource();
        if (!staSourceRef.current) staSourceRef.current = new VectorSource();
        if (!desaSourceRef.current) desaSourceRef.current = new VectorSource();
    }, []);

    // Auto-collapse sidebar on mobile
    useEffect(() => {
        if (isMobile) {
            setIsSidebarOpen(false);
        }
    }, [isMobile]);

    useEffect(() => {
        if (!isMounted || !mapElement.current || !sourceRef.current || !existingSourceRef.current || !nonBaseSourceRef.current) return;

        const vectorLayer = new VectorLayer({
            source: sourceRef.current ?? undefined,
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
            style: (feature) => {
                const geometry = feature.getGeometry();
                return [
                    new Style({
                        stroke: new Stroke({
                            color: "rgba(255, 176, 72, 0.5)", // orange 400 light
                            width: 8,
                            lineCap: 'round'
                        })
                    })
                ];
            }
        });
        ruasUtamaLayerRef.current = ruasUtamaLayer;

        const segmenDesaLayer = new VectorLayer({
            source: segmenDesaSourceRef.current ?? undefined,
            style: (feature) => {
                const kondisi = feature.get("kondisi") || "baik";
                let color = "#22c55e"; // emerald 500
                if (kondisi.toLowerCase().includes("rusak berat")) color = "#f43f5e";
                else if (kondisi.toLowerCase().includes("rusak ringan")) color = "#f59e0b";
                else if (kondisi.toLowerCase().includes("sedang")) color = "#3b82f6";

                return new Style({
                    stroke: new Stroke({ color: color, width: 6, lineJoin: 'round', lineCap: 'round' }),
                    text: new Text({
                        text: (feature.get("tahun_pembangunan") || "").toString(),
                        font: "bold 10px sans-serif",
                        fill: new Fill({ color: "#fff" }),
                        stroke: new Stroke({ color: color, width: 2 }),
                        offsetY: -10
                    })
                });
            }
        });
        segmenDesaLayerRef.current = segmenDesaLayer;

        const jalanKabupatenLayer = new VectorLayer({
            source: jalanKabupatenSourceRef.current ?? undefined,
            style: new Style({
                stroke: new Stroke({ color: "oklch(0.546 0.245 262.881)", width: 6, lineJoin: 'round', lineCap: 'round' }),
                text: new Text({
                    text: "Jalan Kabupaten",
                    font: "bold 10px sans-serif",
                    fill: new Fill({ color: "#fff" }),
                    stroke: new Stroke({ color: "oklch(0.546 0.245 262.881)", width: 2 }),
                    offsetY: -10
                })
            })
        });
        jalanKabupatenLayerRef.current = jalanKabupatenLayer;

        const desaSource = new VectorSource();
        desaSourceRef.current = desaSource;
        const desaLayer = new VectorLayer({
            source: desaSource,
            style: new Style({
                stroke: new Stroke({
                    color: "rgba(124, 58, 237, 0.8)", // Violet 600
                    width: 2,
                    lineDash: [4, 8],
                }),
                fill: new Fill({
                    color: "rgba(124, 58, 237, 0.05)",
                }),
            }),
            zIndex: 5,
        });
        desaLayerRef.current = desaLayer;

        const existingLayer = new VectorLayer({
            source: existingSourceRef.current ?? undefined,
            style: (feature) => {
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

                const kondisi = feature.get("kondisi") || "baik";

                let color = "#22c55e"; // emerald 500
                if (isKabupaten) color = "oklch(0.546 0.245 262.881)"; 
                else if (kondisi.toLowerCase().includes("rusak berat")) color = "#f43f5e"; // rose 500
                else if (kondisi.toLowerCase().includes("rusak ringan")) color = "#f59e0b"; // amber 500
                else if (kondisi.toLowerCase().includes("sedang")) color = "#3b82f6"; // blue 500

                const labelText = isKabupaten ? "Jalan Kabupaten" : (feature.get("tahun_pembangunan") || "").toString();

                return new Style({
                    stroke: new Stroke({
                        color: color,
                        width: isKabupaten ? 6 : 5,
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

        const nonBaseLayer = new VectorLayer({
            source: nonBaseSourceRef.current ?? undefined,
            visible: visibleLayers.find(l => l.id === "non-base")?.visible,
            style: (feature) => {
                const kondisi = feature.get("kondisi") || "baik";
                const color = getConditionColor(kondisi);

                return new Style({
                    stroke: new Stroke({
                        color: color,
                        width: 3,
                        lineDash: [6, 6],
                        lineCap: 'round'
                    })
                });
            }
        });
        nonBaseLayerRef.current = nonBaseLayer;

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

        const tileLayer = new TileLayer({
            source: BASEMAPS[activeBasemap].source,
        });
        tileLayerRef.current = tileLayer;

        const wmsLayer = new TileLayer({
            source: new TileWMS({
                url: 'https://geoportal.bojonegorokab.go.id/geoserver/palapa/wms',
                params: {
                    'LAYERS': 'palapa:jalan_ln_2021_ruasporosdesa',
                    'TILED': true,
                    'TRANSPARENT': true,
                    'VERSION': '1.1.1'
                },
                serverType: 'geoserver'
            }),
            visible: visibleLayers.find(l => l.id === "wms-bojonegoro")?.visible,
            opacity: 0.7
        });

        const jalanKabupatenVectorLayer = new VectorLayer({
            source: new VectorSource({
                format: new GeoJSON(),
                url: function (extent) {
                    return (
                        'https://geoportal.bojonegorokab.go.id/geoserver/palapa/ows?service=WFS&' +
                        'version=1.0.0&request=GetFeature&typeName=palapa:JALAN_KABUPATEN_2022&' +
                        'outputFormat=application/json&srsname=EPSG:3857&' +
                        'bbox=' + extent.join(',') + ',EPSG:3857'
                    );
                },
                strategy: function (extent, resolution) {
                    return [extent];
                }
            }),
            style: function (feature) {
                const isSelected = feature.getId() === selectedVectorIdRef.current;
                return new Style({
                    stroke: new Stroke({
                        color: isSelected ? '#facc15' : 'oklch(0.546 0.245 262.881)',
                        width: isSelected ? 8 : 4,
                    }),
                    zIndex: isSelected ? 100 : 10,
                });
            },
            visible: visibleLayers.find(l => l.id === "wms-jalan-kabupaten")?.visible,
            opacity: 0.8,
            zIndex: 10
        });
        jalanKabupatenVectorLayerRef.current = jalanKabupatenVectorLayer;

        const map = new OLMap({
            target: mapElement.current,
            layers: [
                tileLayer,
                wmsLayer,
                jalanKabupatenVectorLayer,
                desaLayer,
                existingLayer,
                ruasUtamaLayer,
                segmenDesaLayer,
                jalanKabupatenLayer,
                nonBaseLayer,
                staLayer,
                searchLayer,
                vectorLayer,
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

            // Change cursor to pointer when over vector features
            const pixel = map.getEventPixel(evt.originalEvent);
            const hit = map.hasFeatureAtPixel(pixel, {
                layerFilter: (l) => l === jalanKabupatenVectorLayerRef.current
            });
            map.getTargetElement().style.cursor = hit ? 'pointer' : '';
        }, 50);

        map.on('pointermove', throttledPointerMove);

        // Map Click Handler (Coordinate Copy + Vector Feature Popup)
        map.on('click', async (evt) => {
            // 1. Check for Vector Feature Click (Jalan Kabupaten)
            const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f, {
                layerFilter: (l) => l === jalanKabupatenVectorLayerRef.current
            });
            if (feature) {
                const properties = feature.getProperties();
                const featureId = feature.getId();
                setSelectedVectorId(featureId ?? null);
                setSelectedVectorInfo({
                    properties,
                    coordinate: evt.coordinate,
                    id: featureId
                });
                vectorPopupRef.current?.setPosition(evt.coordinate);
                
                // Force refresh style
                jalanKabupatenVectorLayerRef.current?.changed();
                return;
            } else {
                setSelectedVectorId(null);
                setSelectedVectorInfo(null);
                vectorPopupRef.current?.setPosition(undefined);
                jalanKabupatenVectorLayerRef.current?.changed();
            }

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

    useEffect(() => {
        if (mode.startsWith("draw-")) {
            setEditingFeatureId(null);
            setEditingFeatureData(null);
        }
    }, [mode]);

    // Dynamic style for drawing and editing
    useEffect(() => {
        if (!vectorLayerRef.current) return;

        const dynamicStyle = (feature: any) => {
            const isLingkungan = feature.get("is_lingkungan_segment") === true;
            // Determine if it should be treated as Lingkungan (Non-Ruas)
            // A feature is Lingkungan if it has the flag OR if no road is selected while drawing a new feature
            const currentIsLingkungan = isLingkungan || (!feature.get("id") && mode.startsWith("draw-") && !selectedRoad);

            const kondisi = feature.get("kondisi") || "baik";
            const color = getConditionColor(kondisi);
            const fillColor = `${color}33`; // 20% opacity (0.2 in hex is roughly 33)

            const styles = [
                new Style({
                    stroke: new Stroke({
                        color: color,
                        width: 4,
                        lineDash: currentIsLingkungan ? [6, 6] : undefined,
                        lineCap: "round",
                    }),
                    fill: new Fill({
                        color: fillColor,
                    }),
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
    }, [mode, selectedRoad]);

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
            const modify = new Modify({
                source: sourceRef.current ?? undefined,
                deleteCondition: altKeyOnly
            });

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
            const snapRuasUtama = new Snap({ source: ruasUtamaSourceRef.current ?? undefined });
            const snapSegmenDesa = new Snap({ source: segmenDesaSourceRef.current ?? undefined });
            const snapJalanKab = new Snap({ source: jalanKabupatenSourceRef.current ?? undefined });

            mapRef.current.addInteraction(modify);
            mapRef.current.addInteraction(snap);
            mapRef.current.addInteraction(snapExisting);
            mapRef.current.addInteraction(snapNonBase);
            mapRef.current.addInteraction(snapSearch);
            mapRef.current.addInteraction(snapRuasUtama);
            mapRef.current.addInteraction(snapSegmenDesa);
            mapRef.current.addInteraction(snapJalanKab);
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
                const type = geometry.getType();
                const isLingkungan = !selectedRoad;
                let color = isLingkungan ? "#F43F5E" : "#3B82F6";
                let dash = isLingkungan ? [6, 6] : undefined;

                if (type === 'LineString') {
                    // Optimized: Removed turf.kinks from style function to prevent lag on every move.
                    // Visual state (color) is now handled primarily by the base street color.
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
            const snapRuasUtama = new Snap({ source: ruasUtamaSourceRef.current ?? undefined });
            const snapSegmenDesa = new Snap({ source: segmenDesaSourceRef.current ?? undefined });
            const snapJalanKab = new Snap({ source: jalanKabupatenSourceRef.current ?? undefined });

            mapRef.current.addInteraction(draw);
            mapRef.current.addInteraction(snap);
            mapRef.current.addInteraction(snapExisting);
            mapRef.current.addInteraction(snapNonBase);
            mapRef.current.addInteraction(snapSearch);
            mapRef.current.addInteraction(snapRuasUtama);
            mapRef.current.addInteraction(snapSegmenDesa);
            mapRef.current.addInteraction(snapJalanKab);

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
                if (geometry instanceof LineString) {
                    try {
                        const finalDistance = getLength(geometry);
                        setDrawnLength(finalDistance);

                        // ZOOM TO EXTENT of the newly drawn segment
                        const extent = geometry.getExtent();
                        mapRef.current?.getView().fit(extent, {
                            padding: [100, 100, 100, 100],
                            duration: 1000
                        });
                    } catch (e) { }
                }

                const format = new GeoJSON();
                const json = format.writeFeature(feature, {
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

    const refreshSegmentData = async (roadId: string) => {
        setIsFetchingDetail(true);
        try {
            const [segmentsResponse, backgroundResponse, nonBaseResponse, desaResponse] = await Promise.all([
                monitoringService.getSegmenByJalanId(roadId),
                monitoringService.getMonitoringJalanById(roadId),
                monitoringService.getNonBaseSegments(selectedRoad?.jalan.id_desa || ""),
                monitoringService.getDesaById(selectedRoad?.jalan.id_desa || "")
            ]);

            if (!existingSourceRef.current) return;

            // Selective clear: remove features that are NOT checked, OR are the current roadId (to refresh them)
            [ruasUtamaSourceRef, segmenDesaSourceRef, jalanKabupatenSourceRef, nonBaseSourceRef, desaSourceRef, staSourceRef].forEach(sourceRef => {
                const source = sourceRef.current;
                if (source) {
                    const featuresToRemove = source.getFeatures().filter(f => {
                        const isVillageLayer = sourceRef === desaSourceRef;
                        // For village layer: Always clear the current one to refresh
                        if (isVillageLayer) return true;

                        const kId = f.get("kode_ruas_layer");
                        // Remove if: 
                        // 1. No road ID attached (temporary/stale)
                        // 2. It IS the current road (we will re-add fresh data)
                        // 3. It's NOT in the checked list
                        return !kId || kId === roadId || !checkedRoadIds.includes(kId);
                    });
                    featuresToRemove.forEach(f => source.removeFeature(f));
                }
            });

            existingSourceRef.current.clear();

            const format = new GeoJSON();
            const panelFeatures: any[] = [];

            // 1. Prepare MAP FEATURES (from getMonitoringJalanById)
            if (backgroundResponse) {
                // Main road geometry
                if (backgroundResponse.jalan) {
                    const jalanFeatures = format.readFeatures(backgroundResponse.jalan, {
                        dataProjection: "EPSG:4326",
                        featureProjection: "EPSG:3857",
                    });
                    jalanFeatures.forEach(f => {
                        f.set("is_base_jalan", true);
                        f.set("hidden_from_panel", true);
                        f.set("kode_ruas_layer", roadId);
                    });
                    ruasUtamaSourceRef.current?.addFeatures(jalanFeatures);
                }
                // Village segments for background
                if (backgroundResponse.segmen) {
                    const segmenFeatures = format.readFeatures(backgroundResponse.segmen, {
                        dataProjection: "EPSG:4326",
                        featureProjection: "EPSG:3857",
                    });
                    segmenFeatures.forEach(f => {
                        f.set("hidden_from_panel", true);
                        f.set("kode_ruas_layer", roadId);
                    });
                    segmenDesaSourceRef.current?.addFeatures(segmenFeatures);
                }
                // Kabupaten segments for background
                if (backgroundResponse.segmenkab) {
                    const segmenKabFeatures = format.readFeatures(backgroundResponse.segmenkab, {
                        dataProjection: "EPSG:4326",
                        featureProjection: "EPSG:3857",
                    });
                    segmenKabFeatures.forEach(f => {
                        f.set("is_kabupaten_jalan", true);
                        f.set("hidden_from_panel", true);
                        f.set("kode_ruas_layer", roadId);
                    });
                    jalanKabupatenSourceRef.current?.addFeatures(segmenKabFeatures);
                }
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
                });
                panelFeatures.push(...features);
                segmenDesaSourceRef.current?.addFeatures(features);
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
            if (backgroundResponse && backgroundResponse.jalan) {
                updateSTAMarkers(roadId, backgroundResponse.jalan);
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

                [ruasUtamaSourceRef, segmenDesaSourceRef, jalanKabupatenSourceRef, desaSourceRef].forEach(sourceRef => {
                    if (sourceRef.current && sourceRef.current.getFeatures().length > 0) {
                        extendExtent(combinedExtent, sourceRef.current.getExtent());
                        hasAnyFeatures = true;
                    }
                });

                if (hasAnyFeatures) {
                    mapRef.current?.getView().fit(combinedExtent, {
                        padding: [50, 50, 50, 50],
                        duration: 1000
                    });
                } else {
                    toast.info("Belum ada data visual untuk jalan ini");
                }
            }

        } catch (error) {
            console.error("Error fetching detail:", error);
            toast.error("Gagal mengambil data segmen jalan");
        } finally {
            setIsFetchingDetail(false);
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
        setVisibleLayers(prev => {
            if (prev.find(l => l.id === "ruas-utama")) return prev;
            return [
                { id: "segmen-desa", label: "Segmen Jalan Desa", visible: true, color: "#22c55e" },
                { id: "jalan-kabupaten", label: "Jalan Kabupaten", visible: true, color: "oklch(0.546 0.245 262.881)" },
                { id: "ruas-utama", label: "Jalan Poros Desa", visible: true, color: "#FFA500" },
                ...prev
            ];
        });

        refreshSegmentData(selectedRoad.jalan.id);
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
            "wms-jalan-kabupaten": jalanKabupatenVectorLayerRef,
            "wms-bojonegoro": wmsLayerRef,
            "ruas-utama": ruasUtamaLayerRef,
            "segmen-desa": segmenDesaLayerRef,
            "jalan-kabupaten": jalanKabupatenLayerRef,
            "boundary-village": desaLayerRef,
            "sta-markers": staLayerRef
        };

        visibleLayers.forEach((layerItem) => {
            const ref = layerMap[layerItem.id];
            if (ref?.current) {
                ref.current.setVisible(layerItem.visible);
                // We use +10 to ensure they stay above the basemap (zIndex 0)
                // reversed index gives the correct visual stack order (top of list = highest zIndex)
                const zIndex = reversedLayers.findIndex(l => l.id === layerItem.id) + 10;
                ref.current.setZIndex(zIndex);
            }
        });
    }, [visibleLayers]);

    const handleResetLayerOrder = useCallback(() => {
        setVisibleLayers(prev => {
            // Define standard order
            const order = ["sta-markers", "segmen-desa", "jalan-kabupaten", "ruas-utama", "non-base", "boundary-village", "wms-jalan-kabupaten", "wms-bojonegoro"];

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
                view.fit(extent, { padding: [100, 100, 100, 100], duration: 1000 });
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
            if (selectedRoad) await refreshSegmentData(selectedRoad.jalan.id);
            sourceRef.current?.clear();
            setDrawnGeoJSON(null);
            setHasTemporaryFeature(false);
            setIsPanelVisible(false);
            setEditingFeatureId(null);
            setSegmentPanelVisible(true);
        } catch (error) {
            // Error toast is already handled by API client
        }
    };

    const handleCancelReshape = () => {
        if (editingFeatureId && originalEditFeatureRef.current) {
            existingSourceRef.current?.addFeature(originalEditFeatureRef.current);
            originalEditFeatureRef.current = null;
        }
        sourceRef.current?.clear();
        setDrawnGeoJSON(null);
        setHasTemporaryFeature(false);
        setIsPanelVisible(false);
        setEditingFeatureId(null);
        setEditingFeatureData(null);
        setMode("view");
        if (selectedRoad) setSegmentPanelVisible(true);
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
            padding: [100, 100, 100, 100],
            duration: 1000
        });
    };

    const handleEditSegment = (feature: any) => {
        if (!existingSourceRef.current || !sourceRef.current) return;
        existingSourceRef.current.removeFeature(feature);
        const clone = feature.clone();
        clone.setId(feature.getId());
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
            padding: [150, 150, 150, 150],
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
                padding: [100, 100, 100, 100],
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

    // Multi-select handler
    const handleToggleCheckRoad = async (id: string, checked: boolean) => {
        if (checked) {
            setCheckedRoadIds(prev => [...prev, id]);

            // Fetch road detail to get name for the layer label
            try {
                const response = await monitoringService.getMonitoringJalanById(id);
                if (response) {
                    const resp = response as any;
                    // Extract road data from GeoJSON for label
                    const jalanData = response.jalan?.features?.[0]?.properties?.dataValues ||
                        response.jalan?.features?.[0]?.properties ||
                        resp.features?.[0]?.properties?.dataValues ||
                        resp.features?.[0]?.properties ||
                        {};

                    const kodeRuas = jalanData.kode_ruas || id;
                    const namaRuas = jalanData.nama_ruas || 'Nama tidak tersedia';
                    const roadLabel = `${kodeRuas} - ${namaRuas}`;
                    const layerId = `road-${id}`;

                    // Add to visibleLayers if not already present
                    setVisibleLayers(prev => {
                        if (prev.find(l => l.id === layerId)) return prev;
                        return [...prev, {
                            id: layerId,
                            label: roadLabel,
                            visible: true,
                            color: "#ffa500" // Default blue for roads
                        }];
                    });

                    // Render the segments on the map
                    const format = new GeoJSON();

                    // Add main road
                    if (response.jalan) {
                        const features = format.readFeatures(response.jalan, {
                            dataProjection: "EPSG:4326",
                            featureProjection: "EPSG:3857",
                        });
                        features.forEach(f => {
                            f.set("is_base_jalan", true);
                            f.set("kode_ruas_layer", id);
                        });
                        ruasUtamaSourceRef.current?.addFeatures(features);
                    }

                    // Add segments
                    if (response.segmen) {
                        const features = format.readFeatures(response.segmen, {
                            dataProjection: "EPSG:4326",
                            featureProjection: "EPSG:3857",
                        });
                        features.forEach(f => {
                            f.set("kode_ruas_layer", id);
                        });
                        segmenDesaSourceRef.current?.addFeatures(features);
                    }

                    // Add Kabupaten segments
                    if (response.segmenkab) {
                        const features = format.readFeatures(response.segmenkab, {
                            dataProjection: "EPSG:4326",
                            featureProjection: "EPSG:3857",
                        });
                        features.forEach(f => {
                            f.set("is_kabupaten_jalan", true);
                            f.set("hidden_from_panel", true);
                            f.set("kode_ruas_layer", id);
                        });
                        jalanKabupatenSourceRef.current?.addFeatures(features);
                    }

                    // Add STA markers
                    if (response.jalan) {
                        updateSTAMarkers(id, response.jalan);
                    }
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
            [ruasUtamaSourceRef, segmenDesaSourceRef, jalanKabupatenSourceRef].forEach(sourceRef => {
                const source = sourceRef.current;
                if (source) {
                    const featuresToRemove = source.getFeatures().filter(f => f.get("kode_ruas_layer") === id);
                    featuresToRemove.forEach(f => source.removeFeature(f));
                }
            });
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
            <div className="flex flex-1 min-h-0 w-full overflow-hidden relative">
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
                                    }
                                }}
                            >
                                <div ref={mapElement} className="w-full h-full" />
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
                        />

                        <BasemapToggle
                            activeBasemap={activeBasemap}
                            onBasemapChange={(id) => setActiveBasemap(id as BasemapId)}
                            className={cn(
                                "absolute top-14 right-2 transition-transform duration-500 z-40 will-change-transform",
                                segmentPanelVisible && isSegmentPanelOpen && "-translate-x-80"
                            )}
                        />

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

                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none transition-all duration-500">
                        </div>

                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
                            {!selectedRoad && mode !== "view" ? (
                                <div className="bg-blue-600/90 backdrop-blur-md p-2 rounded-xl border border-blue-400 shadow-xl text-[10px] font-bold text-white uppercase tracking-widest animate-in slide-in-from-bottom-4">
                                    Menggambar Jalan Lingkungan (Non-Ruas)
                                </div>
                            ) : null}
                        </div>

                        <div
                            className={cn(
                                "absolute bottom-2 right-2 rounded-md border border-blue-400 shadow-xl text-[9px] font-bold text-white uppercase tracking-widest flex items-center gap-2 cursor-pointer bg-blue-600/90 hover:bg-blue-500/90 backdrop-blur-md p-1.5 transition-all duration-200 active:scale-95 will-change-transform",
                                segmentPanelVisible && isSegmentPanelOpen && "-translate-x-80",
                                isCopied && "ring-2 ring-emerald-400 ring-offset-1 ring-offset-blue-600"
                            )}
                            style={{
                                WebkitBackfaceVisibility: 'hidden',
                                WebkitBackdropFilter: 'blur(12px)',
                                backfaceVisibility: 'hidden'
                            }}
                            onClick={() => {
                                const coords = isMobile ? lastCopiedCoords : cursorCoords;
                                if (coords) {
                                    const text = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
                                    navigator.clipboard.writeText(text);
                                    setLastCopiedCoords(coords);
                                    setIsCopied(true);
                                    setTimeout(() => setIsCopied(false), 2000);
                                }
                            }}
                        >

                            {/* CONTENT */}
                            {isMobile ? (
                                // ===== MOBILE =====
                                isCopied ? (
                                    <div className="flex items-center gap-1 text-emerald-300 animate-in zoom-in-50 duration-200">
                                        <Check className="w-3.5 h-3.5 stroke-3" />
                                        <span className="text-[8px] font-black italic">COPIED</span>
                                    </div>
                                ) : (
                                    <span className="opacity-50">Ketuk Peta...</span>
                                )
                            ) : (
                                // ===== DESKTOP =====
                                lastCopiedCoords ? (
                                    <div className="flex items-center gap-1.5 animate-in fade-in duration-300">
                                        <code className="bg-blue-700/50 px-1.5 py-0.5 rounded font-mono text-[10px]">
                                            {lastCopiedCoords.lat.toFixed(6)}, {lastCopiedCoords.lng.toFixed(6)}
                                        </code>
                                        {isCopied && (
                                            <div className="flex items-center gap-1 text-emerald-300 animate-in zoom-in-50 duration-200">
                                                <Check className="w-3.5 h-3.5 stroke-3" />
                                                <span className="text-[8px] font-black italic">COPIED</span>
                                            </div>
                                        )}
                                    </div>
                                ) : null
                            )}

                        </div>

                        {/* Vector Feature Popup (Portal/Overlay) */}
                        {selectedVectorInfo && vectorPopupElementRef.current && createPortal(
                            <div 
                                className={cn(
                                    "bg-white/95 dark:bg-slate-950/95 backdrop-blur-md rounded-2xl border border-blue-100 dark:border-blue-900/50 shadow-2xl w-64 flex flex-col animate-in zoom-in-95 duration-300 pointer-events-auto relative overflow-visible group mb-4 transition-all ease-in-out",
                                    isPopupMinimized ? "p-2.5 h-auto overflow-hidden" : "p-3.5 max-h-[350px]"
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
                                            setSelectedVectorId(null);
                                            setSelectedVectorInfo(null);
                                            vectorPopupRef.current?.setPosition(undefined);
                                            jalanKabupatenVectorLayerRef.current?.changed();
                                            setIsPopupMinimized(false); // Reset for next use
                                        }}
                                        className="h-6 w-6 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center transition-all active:scale-95 text-slate-500 dark:text-slate-400"
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
                                        <div className="flex flex-col gap-3 pb-2">
                                            {Object.entries(selectedVectorInfo.properties)
                                                .filter(([key]) => !['geometry', 'bbox', 'fid', 'id', 'type'].includes(key.toLowerCase()))
                                                .map(([key, value]) => (
                                                    <div key={key} className="flex flex-col gap-1 group/item">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider group-hover/item:text-blue-400 transition-colors">
                                                            {key.replace(/_/g, ' ')}
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 wrap-break-word font-mono bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-lg border border-transparent group-hover/item:border-slate-100 dark:group-hover/item:border-slate-700 transition-all">
                                                            {typeof value === 'number' ? formatNumber(value) : String(value || '-')}
                                                            {key.toLowerCase().includes('panjang') || key.toLowerCase().includes('lebar') ? ' m' : ''}
                                                        </span>
                                                    </div>
                                                ))}
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
                    onZoom={handleZoomToSegment}
                    onEdit={handleEditSegment}
                    onDelete={handleDeleteSegment}
                    onMonitoring={handleMonitoringSegment}
                    onAddRuas={() => {
                        setEditingFeatureId(null);
                        setEditingFeatureData(null);
                        setSegmentPanelVisible(false);
                        setMode("draw-line");
                    }}
                    onAddLingkungan={() => {
                        setEditingFeatureId(null);
                        setEditingFeatureData(null);
                        setSelectedRoad(null);
                        setSegmentPanelVisible(false);
                        setMode("draw-line");
                    }}
                    selectedRoad={selectedRoad}
                    className="z-40"
                />

                <MonitoringProgressPanel
                    isVisible={isMonitoringPanelVisible}
                    onClose={() => setIsMonitoringPanelVisible(false)}
                    segment={selectedSegmentForMonitoring}
                />
            </div>
        </TooltipProvider>
    );
}
