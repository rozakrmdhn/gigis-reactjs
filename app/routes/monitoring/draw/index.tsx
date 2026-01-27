import React, { useEffect, useRef, useState, useCallback, useMemo, type MutableRefObject } from "react";
import OLMap from "ol/Map";
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
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from "ol/style";
import { altKeyOnly } from "ol/events/condition";
import Overlay from "ol/Overlay";
import * as turf from "@turf/turf";
import { LineString, Polygon, MultiPoint } from "ol/geom";
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
    Loader2,
    Check,
    X,
    Layers
} from "lucide-react";
import { Button } from "~/components/ui/button";
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
import { BasemapToggle } from "~/features/monitoring/components/BasemapToggle";
import { GeolocationControl } from "~/features/monitoring/components/GeolocationControl";

// Performance Optimization: Reusable static instances and helpers
const geojsonFormat = new GeoJSON();

const BASEMAPS = {
    osm: {
        name: "Standard",
        source: new OSM(),
    },
    satellite: {
        name: "Satellite",
        source: new XYZ({
            url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
            attributions: '© Google',
        })
    },
    hybrid: {
        name: "Hybrid",
        source: new XYZ({
            url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
            attributions: '© Google',
        })
    },
    terrain: {
        name: "Terrain",
        source: new XYZ({
            url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
            attributions: '© Google',
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

export default function DrawPage() {
    const mapElement = useRef<HTMLDivElement>(null);
    const mapRef = useRef<OLMap | null>(null);
    const sourceRef = useRef<VectorSource | null>(null);
    const existingSourceRef = useRef<VectorSource | null>(null);
    const ruasUtamaSourceRef = useRef<VectorSource | null>(null);
    const segmenDesaSourceRef = useRef<VectorSource | null>(null);
    const jalanKabupatenSourceRef = useRef<VectorSource | null>(null);

    const ruasUtamaLayerRef = useRef<VectorLayer | null>(null);
    const segmenDesaLayerRef = useRef<VectorLayer | null>(null);
    const jalanKabupatenLayerRef = useRef<VectorLayer | null>(null);
    const existingLayerRef = useRef<VectorLayer | null>(null); // Deprecated, but keep for now if needed for other refs
    const vectorLayerRef = useRef<VectorLayer | null>(null);

    const nonBaseSourceRef = useRef<VectorSource | null>(null);
    const nonBaseLayerRef = useRef<VectorLayer | null>(null);
    const wmsLayerRef = useRef<TileLayer<any> | null>(null);
    const searchSourceRef = useRef<VectorSource | null>(null);
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
    const [visibleLayers, setVisibleLayers] = useState([
        { id: "non-base", label: "Jalan Lingkungan", visible: true, color: "#ef4444", lineDash: [6, 6] },
        { id: "wms-bojonegoro", label: "WMS Bojonegoro", visible: false, color: "#94a3b8" }
    ]);
    const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [lastCopiedCoords, setLastCopiedCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [isRoadInfoVisible, setIsRoadInfoVisible] = useState(false);
    const [activeBasemap, setActiveBasemap] = useState<BasemapId>("osm");

    const tileLayerRef = useRef<TileLayer<any> | null>(null);
    const tooltipRef = useRef<Overlay | null>(null);
    const tooltipElementRef = useRef<HTMLDivElement | null>(null);
    const originalEditFeatureRef = useRef<any>(null);
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
            style: new Style({
                stroke: new Stroke({
                    color: "rgba(255, 176, 72, 0.5)", // orange 400 light
                    width: 8,
                    lineCap: 'round'
                })
            })
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
                    stroke: new Stroke({ color: color, width: 5, lineJoin: 'round', lineCap: 'round' }),
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
                stroke: new Stroke({ color: "#3b82f6", width: 6, lineJoin: 'round', lineCap: 'round' }),
                text: new Text({
                    text: "Jalan Kabupaten",
                    font: "bold 10px sans-serif",
                    fill: new Fill({ color: "#fff" }),
                    stroke: new Stroke({ color: "#3b82f6", width: 2 }),
                    offsetY: -10
                })
            })
        });
        jalanKabupatenLayerRef.current = jalanKabupatenLayer;

        const existingLayer = new VectorLayer({
            source: existingSourceRef.current ?? undefined,
            style: (feature) => {
                const isBase = feature.get("is_base_jalan");
                const isKabupaten = feature.get("is_kabupaten_jalan");
                const isVillageSegmen = !isBase && !isKabupaten && feature.get("hidden_from_panel");
                const isEditableSegmen = !isBase && !isKabupaten && !feature.get("hidden_from_panel");

                // Check visibility from LayerToggle
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
                if (isKabupaten) color = "#3b82f6"; // blue 500
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
            style: new Style({
                stroke: new Stroke({
                    color: "#ef4444", // red 500
                    width: 3,
                    lineDash: [6, 6],
                    lineCap: 'round'
                })
            })
        });
        nonBaseLayerRef.current = nonBaseLayer;

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
        wmsLayerRef.current = wmsLayer;

        const map = new OLMap({
            target: mapElement.current,
            layers: [
                tileLayer,
                wmsLayer,
                existingLayer,
                ruasUtamaLayer,
                segmenDesaLayer,
                jalanKabupatenLayer,
                nonBaseLayer,
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

        // Pointer move for coordinate display (Throttled for performance)
        const throttledPointerMove = throttle((evt: any) => {
            if (evt.dragging) return;
            const coordinate = toLonLat(evt.coordinate);
            setCursorCoords({
                lng: coordinate[0],
                lat: coordinate[1]
            });
        }, 50);

        map.on('pointermove', throttledPointerMove);

        // Click to copy coordinates
        map.on('click', (evt) => {
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

            const color = currentIsLingkungan ? "#f43f5e" : "#3b82f6"; // Rose for Lingkungan, Blue for Ruas
            const fillColor = currentIsLingkungan ? "rgba(244, 63, 94, 0.2)" : "rgba(59, 130, 246, 0.2)";

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
                    const coords = geometry.getCoordinates();
                    if (coords.length > 2) {
                        try {
                            const gj = geojsonFormat.writeGeometryObject(geometry, {
                                dataProjection: 'EPSG:4326',
                                featureProjection: 'EPSG:3857'
                            }) as any;
                            const kinks = turf.kinks(turf.lineString(gj.coordinates));
                            if (kinks.features.length > 0) {
                                color = "#FB7185";
                                dash = [6, 6];
                            }
                        } catch (e) { }
                    }
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
                        const gj = geojsonFormat.writeGeometryObject(geom, {
                            dataProjection: 'EPSG:4326',
                            featureProjection: 'EPSG:3857'
                        }) as any;
                        distance = turf.length(turf.lineString(gj.coordinates), { units: 'meters' });
                        setDrawnLength(distance);
                        const kinks = turf.kinks(turf.lineString(gj.coordinates));
                        isValid = kinks.features.length === 0;
                    } catch (e) { }

                    const lastCoord = geom.getLastCoordinate();
                    if (tooltipEl && lastCoord) {
                        tooltipEl.innerText = !isValid ? "⚠ Jalur Berpotongan" : `${distance.toFixed(1)} m`;
                        tooltipEl.style.background = isValid ? 'rgba(15, 23, 42, 0.9)' : '#e11d48';
                        tooltipRef.current?.setPosition(lastCoord);
                        tooltipEl.style.display = 'block';
                    }
                }, 100);

                sketch.getGeometry()?.on('change', (evt: any) => {
                    throttledDrawUpdate(evt.target);
                });
            });

            draw.on("drawend", (event) => {
                const feature = event.feature;

                // Final length calculation on draw end
                const geometry = feature.getGeometry();
                if (geometry instanceof LineString) {
                    const format = new GeoJSON();
                    try {
                        const gj = format.writeGeometryObject(geometry, {
                            dataProjection: 'EPSG:4326',
                            featureProjection: 'EPSG:3857'
                        }) as any;
                        const finalDistance = turf.length(turf.lineString(gj.coordinates), { units: 'meters' });
                        setDrawnLength(finalDistance);
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
            const [segmentsResponse, backgroundResponse, nonBaseResponse] = await Promise.all([
                monitoringService.getSegmenByKodeRuas(roadId),
                monitoringService.getMonitoringJalanById(roadId),
                monitoringService.getNonBaseSegments(selectedRoad?.jalan.id_desa || "")
            ]);

            if (!existingSourceRef.current) return;
            existingSourceRef.current.clear();
            ruasUtamaSourceRef.current?.clear();
            segmenDesaSourceRef.current?.clear();
            jalanKabupatenSourceRef.current?.clear();

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
            }

            // Set features for panel display
            setFeaturesList(panelFeatures);
            setSegmentPanelVisible(true);
            if (isMobile) {
                setIsSegmentPanelOpen(false);
            } else {
                setIsSegmentPanelOpen(true);
            }

            // 3. ZOOM TO BOUNDING BOX (Combined extent of all sources)
            const combinedExtent = createEmptyExtent();
            let hasAnyFeatures = false;

            [ruasUtamaSourceRef, segmenDesaSourceRef, jalanKabupatenSourceRef].forEach(sourceRef => {
                if (sourceRef.current && sourceRef.current.getFeatures().length > 0) {
                    extendExtent(combinedExtent, sourceRef.current.getExtent());
                    hasAnyFeatures = true;
                }
            });

            if (hasAnyFeatures) {
                mapRef.current?.getView().fit(combinedExtent, {
                    padding: [150, 150, 150, 150],
                    duration: 1000
                });
            } else {
                toast.info("Belum ada data visual untuk jalan ini");
            }

        } catch (error) {
            console.error("Error fetching detail:", error);
            toast.error("Gagal mengambil data segmen jalan");
        } finally {
            setIsFetchingDetail(false);
        }
    };

    useEffect(() => {
        if (!isMounted || !selectedRoad || !existingSourceRef.current) {
            existingSourceRef.current?.clear();
            ruasUtamaSourceRef.current?.clear();
            segmenDesaSourceRef.current?.clear();
            jalanKabupatenSourceRef.current?.clear();
            // Remove road categories from layer toggle if cleared
            setVisibleLayers(prev => prev.filter(l =>
                !["ruas-utama", "segmen-desa", "jalan-kabupaten"].includes(l.id)
            ));
            return;
        }

        // Add Road Categories to layer toggle if they're not already there
        setVisibleLayers(prev => {
            if (prev.find(l => l.id === "ruas-utama")) return prev;
            return [
                { id: "segmen-desa", label: "Segmen Jalan Desa", visible: true, color: "#22c55e" },
                { id: "jalan-kabupaten", label: "Jalan Kabupaten", visible: true, color: "#3b82f6" },
                { id: "ruas-utama", label: "Jalan Poros Desa", visible: true, color: "#94a3b8" },
                ...prev
            ];
        });

        refreshSegmentData(selectedRoad.jalan.id);
    }, [selectedRoad, isMounted]);

    useEffect(() => {
        if (!isMounted || !nonBaseSourceRef.current) return;

        const fetchNonBase = async () => {
            // Filter by selectedRoad.jalan.id_desa if a road is selected
            const villageId = selectedRoad?.jalan.id_desa || "";
            const response = await monitoringService.getNonBaseSegments(villageId);

            if (response.status === "success") {
                const format = new GeoJSON();
                const features = format.readFeatures(response.result, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: 'EPSG:3857'
                });
                nonBaseSourceRef.current?.clear();
                nonBaseSourceRef.current?.addFeatures(features);
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
            "wms-bojonegoro": wmsLayerRef,
            "ruas-utama": ruasUtamaLayerRef,
            "segmen-desa": segmenDesaLayerRef,
            "jalan-kabupaten": jalanKabupatenLayerRef
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
            const order = ["segmen-desa", "jalan-kabupaten", "ruas-utama", "non-base", "wms-bojonegoro"];

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
            existingSourceRef.current?.removeFeature(feature);
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
            setDrawnGeoJSON(json);
            setIsPanelVisible(true);
            setMode("view");
        }
    };

    const handleClear = () => {
        sourceRef.current?.clear();
        setDrawnGeoJSON(null);
        setHasTemporaryFeature(false);
        setDrawnLength(0);
        setIsRoadInfoVisible(false);
        toast.info("Map cleared");
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

    const handleSelectRoadOnMobile = (road: MonitoringJalanResult | null) => {
        setSelectedRoad(road);
        if (road) setIsRoadInfoVisible(true);
        if (isMobile && road) {
            setIsSidebarOpen(false);
        }
    };

    const formatNumber = (num: number) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
                />

                <div className="flex-1 flex flex-col relative">
                    <div className="relative flex-1 overflow-hidden">
                        <div ref={mapElement} className="absolute inset-0" />

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

                        <LayerToggle
                            layers={visibleLayers}
                            onToggle={handleToggleLayer}
                            onReorder={handleReorderLayers}
                            onResetOrder={handleResetLayerOrder}
                            className={cn(
                                "absolute top-2 right-2 transition-transform duration-500 z-40 will-change-transform",
                                segmentPanelVisible && isSegmentPanelOpen && "-translate-x-80"
                            )}
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
                            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-2xl">
                                <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                                    <MapIcon className="w-4 h-4" />
                                </div>
                                <div>
                                    <h1 className="text-xs font-bold text-slate-800 tracking-tight uppercase leading-none">Map Editor</h1>
                                    <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">Vector Studio</p>
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

                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none">
                            {selectedRoad && isRoadInfoVisible && (
                                <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-blue-100 shadow-xl max-w-xs animate-in slide-in-from-bottom-full duration-500 pointer-events-auto relative">
                                    <button
                                        onClick={() => setIsRoadInfoVisible(false)}
                                        className="absolute -top-2 -right-2 h-6 w-6 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-md hover:bg-slate-50 transition-colors z-10"
                                    >
                                        <X className="w-3 h-3 text-slate-400" />
                                    </button>
                                    <p className="text-[10px] uppercase font-bold text-blue-500 mb-1">Ruas Terpilih</p>
                                    <h4 className="text-sm font-bold text-slate-800 mb-2 truncate">{selectedRoad.jalan.nama_ruas}</h4>
                                    <div className="flex gap-4">
                                        <div>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase">Panjang</p>
                                            <p className="text-xs font-bold text-slate-600">{formatNumber(selectedRoad.jalan.panjang)}m</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase">Lebar</p>
                                            <p className="text-xs font-bold text-slate-600">{formatNumber(selectedRoad.jalan.lebar)}m</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
                            {!selectedRoad && mode !== "view" ? (
                                <div className="text-[8px] bg-blue-600/90 backdrop-blur-md p-2 rounded-xl border border-blue-400 shadow-xl text-[10px] font-bold text-white uppercase tracking-widest animate-in slide-in-from-bottom-4">
                                    Menggambar Jalan Lingkungan (Non-Ruas)
                                </div>
                            ) : !selectedRoad ? (
                                <div className="text-[8px] bg-white/80 backdrop-blur p-2 rounded-xl border shadow-sm text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Pilih jalan di sidebar untuk mulai
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
                            {/* LABEL */}
                            {!isMobile && (
                                <span className="opacity-70">Lat Long :</span>
                            )}

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
                                cursorCoords ? (
                                    <div className="flex items-center gap-1.5">
                                        <code className="bg-blue-700/50 px-1.5 py-0.5 rounded font-mono">
                                            {cursorCoords.lat.toFixed(6)}, {cursorCoords.lng.toFixed(6)}
                                        </code>

                                        {isCopied && (
                                            <div className="flex items-center gap-1 text-emerald-300 animate-in zoom-in-50 duration-200">
                                                <Check className="w-3.5 h-3.5 stroke-3" />
                                                <span className="text-[8px] font-black italic">COPIED</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <span className="opacity-50">Gerakkan Mouse...</span>
                                )
                            )}

                        </div>
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
                    className="z-40"
                />
            </div>
        </TooltipProvider>
    );
}
