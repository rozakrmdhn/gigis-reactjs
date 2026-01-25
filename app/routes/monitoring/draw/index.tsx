import { useEffect, useRef, useState } from "react";
import OLMap from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Draw, Modify, Snap, Select } from "ol/interaction";
import { createBox } from "ol/interaction/Draw";
import { defaults as defaultControls } from "ol/control";
import GeoJSON from "ol/format/GeoJSON";
import { fromLonLat, toLonLat } from "ol/proj";
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from "ol/style";
import { altKeyOnly } from "ol/events/condition";
import Overlay from "ol/Overlay";
import * as turf from "@turf/turf";
import { LineString, Polygon } from "ol/geom";
import "ol/ol.css";
import "./map.css";
import {
    Square,
    Type,
    MousePointer2,
    Trash2,
    Download,
    Circle,
    Pentagon,
    Minus,
    Save,
    Eraser,
    Map as MapIcon,
    Loader2,
    Check
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import { DrawSidebar } from "~/features/monitoring/components/DrawSidebar";
import { DrawFormPanel } from "~/features/monitoring/components/DrawFormPanel";
import { MapControls } from "~/features/monitoring/components/MapControls";
import { DrawControls, type DrawMode } from "~/features/monitoring/components/DrawControls";
import { RoadSegmentsPanel } from "~/features/monitoring/components/RoadSegmentsPanel";
import { cn } from "~/lib/utils";
import { useIsMobile } from "~/hooks/use-mobile";
import { monitoringService, type MonitoringJalanResult } from "~/features/monitoring/services/monitoring.service";
import { DrawEditFormPanel } from "~/features/monitoring/components/DrawEditFormPanel";
import { LayerToggle } from "~/features/monitoring/components/LayerToggle";

export default function DrawPage() {
    const mapElement = useRef<HTMLDivElement>(null);
    const mapRef = useRef<OLMap | null>(null);
    const sourceRef = useRef<VectorSource | null>(null);
    const existingSourceRef = useRef<VectorSource | null>(null);
    const nonBaseSourceRef = useRef<VectorSource | null>(null);
    const nonBaseLayerRef = useRef<VectorLayer | null>(null);
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
    const [visibleLayers, setVisibleLayers] = useState([
        { id: "non-base", label: "Jalan Lingkungan", visible: true }
    ]);

    const tooltipRef = useRef<Overlay | null>(null);
    const tooltipElementRef = useRef<HTMLDivElement | null>(null);
    const originalEditFeatureRef = useRef<any>(null);
    const isMobile = useIsMobile();



    // SSR Fix: Initialize browser-only components on mount
    useEffect(() => {
        setIsMounted(true);
        if (!sourceRef.current) sourceRef.current = new VectorSource();
        if (!existingSourceRef.current) existingSourceRef.current = new VectorSource();
        if (!nonBaseSourceRef.current) nonBaseSourceRef.current = new VectorSource();
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
            source: sourceRef.current,
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

        const existingLayer = new VectorLayer({
            source: existingSourceRef.current,
            style: (feature) => {
                const isBase = feature.get("is_base_jalan");
                if (isBase) {
                    return new Style({
                        stroke: new Stroke({
                            color: "rgba(100, 116, 139, 0.4)", // slate 500 light
                            width: 8,
                            lineCap: 'round'
                        })
                    });
                }

                const kondisi = feature.get("kondisi") || "baik";
                const isKabupaten = feature.get("is_kabupaten_jalan");

                let color = "#10b981"; // emerald 500
                if (isKabupaten) color = "#3b82f6"; // blue 500
                else if (kondisi.toLowerCase().includes("rusak berat")) color = "#f43f5e"; // rose 500
                else if (kondisi.toLowerCase().includes("rusak ringan")) color = "#f59e0b"; // amber 500
                else if (kondisi.toLowerCase().includes("sedang")) color = "#3b82f6"; // blue 500

                const labelText = isKabupaten ? "Jalan Kabupaten" : (feature.get("tahun_pembangunan") || "").toString();

                return new Style({
                    stroke: new Stroke({
                        color: color,
                        width: isKabupaten ? 5 : 4,
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

        const nonBaseLayer = new VectorLayer({
            source: nonBaseSourceRef.current,
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

        const map = new OLMap({
            target: mapElement.current,
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
                existingLayer,
                nonBaseLayer,
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

        return () => {
            map.setTarget(undefined);
            map.removeOverlay(overlay);
        };
    }, [isMounted]);

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
                source: sourceRef.current as any,
                deleteCondition: altKeyOnly
            });
            const snap = new Snap({ source: sourceRef.current as any });
            const snapExisting = new Snap({ source: existingSourceRef.current as any });
            const snapNonBase = new Snap({ source: nonBaseSourceRef.current as any });
            mapRef.current.addInteraction(modify);
            mapRef.current.addInteraction(snap);
            mapRef.current.addInteraction(snapExisting);
            mapRef.current.addInteraction(snapNonBase);
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
                let color = "#EF4444";
                let dash = undefined;

                if (type === 'LineString') {
                    const coords = geometry.getCoordinates();
                    if (coords.length > 2) {
                        const format = new GeoJSON();
                        try {
                            const gj = format.writeGeometryObject(geometry, {
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

                return new Style({
                    stroke: new Stroke({ color, width: 4, lineDash: dash }),
                    image: new CircleStyle({ radius: 6, fill: new Fill({ color }) })
                });
            };

            const draw = new Draw({
                source: sourceRef.current,
                type: type,
                geometryFunction: geometryFunction,
                style: drawStyle
            });

            const snap = new Snap({ source: sourceRef.current });
            const snapExisting = new Snap({ source: existingSourceRef.current });
            const snapNonBase = new Snap({ source: nonBaseSourceRef.current });

            mapRef.current.addInteraction(draw);
            mapRef.current.addInteraction(snap);
            mapRef.current.addInteraction(snapExisting);
            mapRef.current.addInteraction(snapNonBase);

            draw.on("drawstart", (event) => {
                const sketch = event.feature;
                const tooltipEl = tooltipElementRef.current;

                sketch.getGeometry()?.on('change', (evt: any) => {
                    const geom = evt.target;
                    if (!(geom instanceof LineString)) return;

                    let distance = 0;
                    let lastCoord = null;
                    let isValid = true;

                    const format = new GeoJSON();
                    try {
                        const gj = format.writeGeometryObject(geom, {
                            dataProjection: 'EPSG:4326',
                            featureProjection: 'EPSG:3857'
                        }) as any;
                        distance = turf.length(turf.lineString(gj.coordinates), { units: 'meters' });
                        setDrawnLength(distance);
                        const kinks = turf.kinks(turf.lineString(gj.coordinates));
                        isValid = kinks.features.length === 0;
                    } catch (e) { }
                    lastCoord = geom.getLastCoordinate();

                    if (tooltipEl && lastCoord) {
                        tooltipEl.innerText = !isValid ? "⚠ Jalur Berpotongan" : `${distance.toFixed(1)} m`;
                        tooltipEl.style.background = isValid ? 'rgba(15, 23, 42, 0.9)' : '#e11d48';
                        tooltipRef.current?.setPosition(lastCoord);
                        tooltipEl.style.display = 'block';
                    }
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
            const format = new GeoJSON();
            const panelFeatures: any[] = [];
            const mapFeatures: any[] = [];

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
                    mapFeatures.push(...jalanFeatures);
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
                    mapFeatures.push(...segmenFeatures);
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
                    mapFeatures.push(...segmenKabFeatures);
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

            // Add all to source
            if (mapFeatures.length > 0) {
                existingSourceRef.current.addFeatures(mapFeatures);
            }

            // Set features for panel display
            setFeaturesList(panelFeatures);
            setSegmentPanelVisible(true);

            // 3. ZOOM TO BOUNDING BOX (Extent of map features)
            if (mapFeatures.length > 0) {
                const combinedExtent = existingSourceRef.current.getExtent();
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
            return;
        }
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
        if (nonBaseLayerRef.current) {
            const isVisible = visibleLayers.find(l => l.id === "non-base")?.visible;
            nonBaseLayerRef.current.setVisible(!!isVisible);
        }
    }, [visibleLayers]);

    const handleToggleLayer = (id: string, visible: boolean) => {
        setVisibleLayers(prev => prev.map(l => l.id === id ? { ...l, visible } : l));
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
                toast.success("Berhasil memperbarui segmen jalan!");
            } else {
                await monitoringService.createSegment(data);
                toast.success("Berhasil menambahkan segmen jalan baru!");
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
            toast.error("Gagal menyimpan data segmen");
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
            toast.success("Segmen berhasil dihapus");
            existingSourceRef.current?.removeFeature(feature);
            if (editingFeatureId === id) {
                setEditingFeatureId(null);
                setMode("view");
            }
            setSidebarRefreshTrigger(prev => prev + 1);
            if (selectedRoad) await refreshSegmentData(selectedRoad.jalan.id);
        } catch (error) {
            toast.error("Gagal menghapus segmen");
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
        toast.info("Map cleared");
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden relative">
            <DrawSidebar
                onSelectRoad={setSelectedRoad}
                selectedRoad={selectedRoad}
                onStartDraw={() => setMode("draw-line")}
                isDrawing={mode.startsWith("draw-")}
                isOpen={isSidebarOpen}
                onToggle={setIsSidebarOpen}
                refreshTrigger={sidebarRefreshTrigger}
            />

            <div className="flex-1 flex flex-col relative">
                <div className="relative flex-1 overflow-hidden">
                    <div ref={mapElement} className="absolute inset-0" />

                    <MapControls
                        onZoomIn={handleZoomIn}
                        onZoomOut={handleZoomOut}
                        onResetBearing={handleResetView}
                        className={cn(
                            "absolute bottom-4 transition-all duration-500 z-40",
                            isSidebarOpen ? "left-[336px]" : "left-4"
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
                            "absolute top-4 transition-all duration-500 z-40",
                            isSidebarOpen ? "left-[336px]" : "left-4"
                        )}
                    />

                    <LayerToggle
                        layers={visibleLayers}
                        onToggle={handleToggleLayer}
                        className={cn(
                            "absolute bottom-38 transition-all duration-500 z-40",
                            isSidebarOpen ? "left-[336px]" : "left-4"
                        )}
                    />

                    <div className={cn(
                        "absolute top-4 z-20 pointer-events-none transition-all duration-500",
                        isSidebarOpen ? "left-[384px]" : "left-16"
                    )}>
                        <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md px-2.5 py-2.5 rounded-2xl border border-slate-200 shadow-2xl">
                            <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                                <MapIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-sm font-black text-slate-800 tracking-tight uppercase leading-none">Map Editor</h1>
                                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">Vector Studio</p>
                            </div>
                        </div>
                    </div>

                    {mode !== "view" && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-2xl z-10 flex items-center gap-2 animate-in slide-in-from-top-4 border border-blue-400">
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

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                        {selectedRoad ? (
                            <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-blue-100 shadow-xl max-w-xs animate-in slide-in-from-bottom-4">
                                <p className="text-[10px] uppercase font-bold text-blue-500 mb-1">Ruas Terpilih</p>
                                <h4 className="text-sm font-bold text-slate-800 mb-2 truncate">{selectedRoad.jalan.nama_ruas}</h4>
                                <div className="flex gap-4">
                                    <div>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">Panjang</p>
                                        <p className="text-xs font-bold text-slate-600">{selectedRoad.jalan.panjang}m</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">Lebar</p>
                                        <p className="text-xs font-bold text-slate-600">{selectedRoad.jalan.lebar}m</p>
                                    </div>
                                </div>
                            </div>
                        ) : mode !== "view" ? (
                            <div className="bg-blue-600/90 backdrop-blur-md p-3 rounded-xl border border-blue-400 shadow-xl text-[10px] font-bold text-white uppercase tracking-widest animate-in slide-in-from-bottom-4">
                                Menggambar Jalan Lingkungan (Non-Ruas)
                            </div>
                        ) : (
                            <div className="bg-white/80 backdrop-blur p-3 rounded-xl border shadow-sm text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Pilih jalan di sidebar untuk mulai
                            </div>
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
                isVisible={segmentPanelVisible && !!selectedRoad}
                onClose={() => setSegmentPanelVisible(false)}
                segments={featuresList}
                onZoom={handleZoomToSegment}
                onEdit={handleEditSegment}
                onDelete={handleDeleteSegment}
                onAddRuas={() => {
                    setSegmentPanelVisible(false);
                    setMode("draw-line");
                }}
                onAddLingkungan={() => {
                    setSelectedRoad(null);
                    setSegmentPanelVisible(false);
                    setMode("draw-line");
                }}
                className="z-30"
            />
        </div>
    );
}
