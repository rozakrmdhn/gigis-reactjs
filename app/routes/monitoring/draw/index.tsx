import { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Draw, Modify, Snap, Select } from "ol/interaction";
import { createBox } from "ol/interaction/Draw";
import { defaults as defaultControls } from "ol/control";
import GeoJSON from "ol/format/GeoJSON";
import { fromLonLat } from "ol/proj";
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from "ol/style";
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
import { cn } from "~/lib/utils";
import { useIsMobile } from "~/hooks/use-mobile";
import { monitoringService, type MonitoringJalanResult } from "~/features/monitoring/services/monitoring.service";

export default function DrawPage() {
    const mapElement = useRef<HTMLDivElement>(null);
    const mapRef = useRef<Map | null>(null);
    const sourceRef = useRef<VectorSource>(new VectorSource());
    const existingSourceRef = useRef<VectorSource>(new VectorSource());
    const [mode, setMode] = useState<DrawMode>("view");
    const [selectedRoad, setSelectedRoad] = useState<MonitoringJalanResult | null>(null);
    const [isPanelVisible, setIsPanelVisible] = useState(false);
    const [drawnGeoJSON, setDrawnGeoJSON] = useState<string | null>(null);
    const [isFetchingDetail, setIsFetchingDetail] = useState(false);
    const [hasTemporaryFeature, setHasTemporaryFeature] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const isMobile = useIsMobile();

    // Auto-collapse sidebar on mobile
    useEffect(() => {
        if (isMobile) {
            setIsSidebarOpen(false);
        }
    }, [isMobile]);

    useEffect(() => {
        if (!mapElement.current) return;

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
                let color = "#10b981"; // emerald 500
                if (kondisi.toLowerCase().includes("rusak berat")) color = "#f43f5e"; // rose 500
                else if (kondisi.toLowerCase().includes("rusak ringan")) color = "#f59e0b"; // amber 500
                else if (kondisi.toLowerCase().includes("sedang")) color = "#3b82f6"; // blue 500

                return new Style({
                    stroke: new Stroke({
                        color: color,
                        width: 4,
                        lineJoin: 'round',
                        lineCap: 'round'
                    }),
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

        const map = new Map({
            target: mapElement.current,
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
                existingLayer,
                vectorLayer,
            ],
            controls: defaultControls({
                zoom: false,
                rotate: false,
                attribution: false,
            }),
            view: new View({
                center: fromLonLat([111.8328268, -7.2288555]), // Indonesia (Bojonegoro) as example
                zoom: 11,
            }),
        });

        mapRef.current = map;

        return () => map.setTarget(undefined);
    }, []);

    useEffect(() => {
        if (!mapRef.current) return;

        // Remove existing interactions
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
            const modify = new Modify({ source: sourceRef.current });
            const snap = new Snap({ source: sourceRef.current });
            const snapExisting = new Snap({ source: existingSourceRef.current });
            mapRef.current.addInteraction(modify);
            mapRef.current.addInteraction(snap);
            mapRef.current.addInteraction(snapExisting);
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

            const draw = new Draw({
                source: sourceRef.current,
                type: type,
                geometryFunction: geometryFunction,
            });

            const snap = new Snap({ source: sourceRef.current });
            const snapExisting = new Snap({ source: existingSourceRef.current });

            mapRef.current.addInteraction(draw);
            mapRef.current.addInteraction(snap);
            mapRef.current.addInteraction(snapExisting);

            draw.on("drawend", (event) => {
                const feature = event.feature;
                const format = new GeoJSON();
                const json = format.writeFeature(feature, {
                    dataProjection: "EPSG:4326",
                    featureProjection: "EPSG:3857",
                });

                setDrawnGeoJSON(json);
                setHasTemporaryFeature(true);
                setIsPanelVisible(true);
                setMode("view");
            });
        }

    }, [mode]);

    // Fetch existing road segments when selectedRoad changes
    useEffect(() => {
        if (!selectedRoad) {
            existingSourceRef.current.clear();
            return;
        }

        const fetchDetails = async () => {
            setIsFetchingDetail(true);
            try {
                const data = await monitoringService.getMonitoringJalanById(selectedRoad.jalan.id);
                if (data) {
                    existingSourceRef.current.clear();
                    const format = new GeoJSON();

                    const features: any[] = [];

                    if (data.jalan) {
                        const parsed = format.readFeatures(data.jalan, {
                            dataProjection: "EPSG:4326",
                            featureProjection: "EPSG:3857",
                        });
                        parsed.forEach(f => f.set("is_base_jalan", true));
                        features.push(...parsed);
                    }

                    if (data.segmen) {
                        const parsed = format.readFeatures(data.segmen, {
                            dataProjection: "EPSG:4326",
                            featureProjection: "EPSG:3857",
                        });
                        features.push(...parsed);
                    }

                    if (data.segmenkab) {
                        const parsed = format.readFeatures(data.segmenkab, {
                            dataProjection: "EPSG:4326",
                            featureProjection: "EPSG:3857",
                        });
                        features.push(...parsed);
                    }

                    if (features.length > 0) {
                        existingSourceRef.current.addFeatures(features);

                        // Zoom to extent
                        const extent = existingSourceRef.current.getExtent();
                        mapRef.current?.getView().fit(extent, {
                            padding: [150, 150, 150, 150],
                            duration: 1000
                        });
                    } else {
                        toast.info("Belum ada data GeoJSON untuk jalan ini");
                    }
                }
            } catch (error) {
                console.error("Error fetching detail:", error);
                toast.error("Gagal mengambil data segmen jalan");
            } finally {
                setIsFetchingDetail(false);
            }
        };

        fetchDetails();
    }, [selectedRoad]);

    const handleZoomIn = () => {
        const view = mapRef.current?.getView();
        if (view) {
            view.animate({ zoom: (view.getZoom() || 0) + 1, duration: 500 });
        }
    };

    const handleZoomOut = () => {
        const view = mapRef.current?.getView();
        if (view) {
            view.animate({ zoom: (view.getZoom() || 0) - 1, duration: 500 });
        }
    };

    const handleResetView = () => {
        const view = mapRef.current?.getView();
        if (view) {
            view.animate({ rotation: 0, duration: 250 });
            if (existingSourceRef.current.getFeatures().length > 0) {
                const extent = existingSourceRef.current.getExtent();
                view.fit(extent, { padding: [100, 100, 100, 100], duration: 1000 });
            }
        }
    };

    const handleExport = () => {
        const format = new GeoJSON();
        const features = sourceRef.current.getFeatures();
        const json = format.writeFeatures(features, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
        });
        console.log(json);
        toast.success("GeoJSON exported to console");

        // Optional: download as file
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "map-features.geojson";
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSaveSegment = (data: any) => {
        console.log("Saving segment data:", data);
        // Here you would typically call an API to save the segment
        // After success:
        sourceRef.current.clear();
        setDrawnGeoJSON(null);
        setHasTemporaryFeature(false);
        setIsPanelVisible(false);
    };

    const handleFinishReshape = () => {
        const features = sourceRef.current.getFeatures();
        if (features.length > 0) {
            const format = new GeoJSON();
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
        sourceRef.current.clear();
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
            />

            <div className="flex-1 flex flex-col relative">
                <div className="relative flex-1 overflow-hidden">
                    <div ref={mapElement} className="absolute inset-0" />

                    <MapControls
                        onZoomIn={handleZoomIn}
                        onZoomOut={handleZoomOut}
                        onResetBearing={handleResetView}
                        className="absolute top-4 right-4 z-40"
                    />

                    <DrawControls
                        mode={mode}
                        onSetMode={setMode}
                        onClear={handleClear}
                        onExport={handleExport}
                        className={cn(
                            "absolute top-4 transition-all duration-500 z-40",
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

                    {mode === "edit" && hasTemporaryFeature && !isPanelVisible && (
                        <div className="absolute bottom-34 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-top-4">
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xl rounded-full px-6 border-2 border-white"
                                onClick={handleFinishReshape}
                            >
                                <Check className="w-3 h-3 mr-2" />
                                SELESAI RESHAPE & SIMPAN
                            </Button>
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
                        ) : (
                            <div className="bg-white/80 backdrop-blur p-3 rounded-xl border shadow-sm text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Pilih jalan di sidebar untuk mulai
                            </div>
                        )}
                    </div>
                </div>
            </div>

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
            />
        </div>
    );
}
