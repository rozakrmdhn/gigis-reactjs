import { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import { Heatmap as HeatmapLayer, Tile as TileLayer } from "ol/layer";
import { XYZ, Vector as VectorSource } from "ol/source";
import GeoJSON from "ol/format/GeoJSON";
import { fromLonLat } from "ol/proj";
import { defaults as defaultControls } from "ol/control";
import "ol/ol.css";
import * as turf from "@turf/turf";
import { monitoringService } from "~/features/monitoring/services/monitoring.service";
import { Loader2, Info, Plus, Minus, Compass } from "lucide-react";
import { toast } from "sonner";
import type { Route } from "./+types/index";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "~/components/ui/tooltip";

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Dashboard - Map Segmen" },
        { name: "description", content: "Visualisasi Segmen Jalan" },
    ];
}

export default function DashboardIndex() {
    const mapElement = useRef<HTMLDivElement>(null);
    const mapRef = useRef<Map | null>(null);
    const heatmapLayerRef = useRef<HeatmapLayer | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ totalFeatures: 0, totalPoints: 0 });

    useEffect(() => {
        if (!mapElement.current) return;

        const heatmapLayer = new HeatmapLayer({
            source: new VectorSource(),
            blur: 16,
            radius: 6,
            weight: (feature) => 0.2,
        });
        heatmapLayerRef.current = heatmapLayer;

        const map = new Map({
            target: mapElement.current,
            layers: [
                new TileLayer({
                    source: new XYZ({
                        url: 'https://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                        attributions: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                    }),
                }),
                heatmapLayer,
            ],
            controls: defaultControls({
                zoom: false,
                rotate: false,
                attribution: false,
            }),
            view: new View({
                center: fromLonLat([111.8328268, -7.2288555]),
                zoom: 11,
            }),
        });

        mapRef.current = map;

        const fetchData = async () => {
            try {
                // Fetch both data sources in parallel
                const [desaResponse, kabResponse] = await Promise.all([
                    monitoringService.getAllSegmentsGeoJSON(),
                    monitoringService.getKabupatenSegmentsGeoJSON()
                ]);

                const desaFeatures = (desaResponse.status === "success" && desaResponse.result?.features) || [];
                const kabFeatures = (kabResponse.status === "success" && kabResponse.result?.features) || [];

                // Combine features into a single FeatureCollection
                const combinedGeoJSON = {
                    type: "FeatureCollection",
                    features: [...desaFeatures, ...kabFeatures]
                };

                if (combinedGeoJSON.features.length > 0) {
                    const exploded = turf.explode(combinedGeoJSON as any);
                    const features = new GeoJSON().readFeatures(exploded, {
                        dataProjection: 'EPSG:4326',
                        featureProjection: 'EPSG:3857'
                    });

                    heatmapLayer.getSource()?.addFeatures(features);

                    setStats({
                        totalFeatures: combinedGeoJSON.features.length,
                        totalPoints: features.length
                    });

                    const extent = heatmapLayer.getSource()?.getExtent();
                    if (extent) {
                        map.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 1000 });
                    }
                } else {
                    toast.error("Tidak ada data segmen ditemukan");
                }
            } catch (error) {
                console.error("Error loading heatmap data:", error);
                toast.error("Gagal memuat data heatmap");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        return () => map.setTarget(undefined);
    }, []);

    const handleZoomIn = () => {
        const view = mapRef.current?.getView();
        if (view) view.animate({ zoom: (view.getZoom() || 0) + 1, duration: 250 });
    };

    const handleZoomOut = () => {
        const view = mapRef.current?.getView();
        if (view) view.animate({ zoom: (view.getZoom() || 0) - 1, duration: 250 });
    };

    const handleResetView = () => {
        const view = mapRef.current?.getView();
        if (view) {
            view.animate({ rotation: 0, duration: 250 });
            const extent = heatmapLayerRef.current?.getSource()?.getExtent();
            if (extent) view.fit(extent, { padding: [50, 50, 50, 50], duration: 1000 });
        }
    };

    return (
        <div className="relative flex flex-1 flex-col h-[calc(100vh-var(--spacing)*12)] overflow-hidden border bg-slate-50">
            <div ref={mapElement} className="absolute inset-0 w-full h-full" />

            {isLoading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white border border-slate-200 shadow-1xl animate-in zoom-in-95">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Memproses Data...</p>
                    </div>
                </div>
            )}

            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
                <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        <Info className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-slate-800 tracking-tight uppercase leading-none">Road Density Heatmap</h1>
                        <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-1">Light Theme Visualization</p>
                    </div>
                </div>

                {!isLoading && (
                    <div className="flex gap-2">
                        <Badge variant="secondary" className="bg-white/80 border-slate-200 text-slate-600 text-[10px] font-bold py-1">
                            {stats.totalFeatures} SEGMEN
                        </Badge>
                        <Badge variant="secondary" className="bg-white/80 border-slate-200 text-slate-600 text-[10px] font-bold py-1">
                            {stats.totalPoints} DATA POINTS
                        </Badge>
                    </div>
                )}
            </div>

            <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2">
                <TooltipProvider>
                    <div className="flex flex-col gap-1 bg-white/95 backdrop-blur-sm p-1 rounded-xl border border-slate-200 shadow-xl">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-slate-100 cursor-pointer" onClick={handleZoomIn}>
                                    <Plus className="h-4 w-4 text-slate-600" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Zoom In</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-slate-100 cursor-pointer" onClick={handleZoomOut}>
                                    <Minus className="h-4 w-4 text-slate-600" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Zoom Out</TooltipContent>
                        </Tooltip>
                        <div className="h-px bg-slate-200 mx-2" />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-slate-100 cursor-pointer" onClick={handleResetView}>
                                    <Compass className="h-4 w-4 text-slate-600" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Reset View</TooltipContent>
                        </Tooltip>
                    </div>
                </TooltipProvider>
            </div>

            <div className="absolute bottom-4 right-4 z-10">
                <div className="flex flex-col gap-1 bg-white/95 backdrop-blur-sm p-3 rounded-xl border border-slate-200 shadow-xl">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Density Legend</p>
                    <div className="h-2 w-24 rounded-full bg-linear-to-r from-blue-500 via-green-500 to-red-500" />
                    <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase mt-1">
                        <span>Low</span>
                        <span>High</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
