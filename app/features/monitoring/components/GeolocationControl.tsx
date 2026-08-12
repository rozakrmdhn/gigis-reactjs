import { useEffect, useState, useCallback, useRef } from "react";
import OLMap from "ol/Map";
import Geolocation from "ol/Geolocation";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from "ol/style";
import { Navigation, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

interface GeolocationControlProps {
    map: OLMap | null;
    className?: string;
    tooltipSide?: "left" | "right" | "top" | "bottom";
}

export function GeolocationControl({ map, className, tooltipSide = "left" }: GeolocationControlProps) {
    const [isTracking, setIsTracking] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [accuracy, setAccuracy] = useState<number | null>(null);
    const geolocationRef = useRef<Geolocation | null>(null);
    const positionFeatureRef = useRef<Feature | null>(null);
    const accuracyFeatureRef = useRef<Feature | null>(null);
    const sourceRef = useRef<VectorSource | null>(null);

    useEffect(() => {
        if (!map) return;

        // Initialize geolocation
        const geolocation = new Geolocation({
            trackingOptions: {
                enableHighAccuracy: true,
            },
            projection: map.getView().getProjection(),
        });
        geolocationRef.current = geolocation;

        // Initialize markers
        const positionFeature = new Feature();

        const getPositionStyle = (acc: number | null) => new Style({
            image: new CircleStyle({
                radius: 7,
                fill: new Fill({ color: "#3388ff" }),
                stroke: new Stroke({ color: "#fff", width: 2 }),
            }),
            text: acc !== null ? new Text({
                text: `${acc.toFixed(1)}m`,
                font: "bold 10px sans-serif",
                fill: new Fill({ color: "#3388ff" }),
                stroke: new Stroke({ color: "#fff", width: 3 }),
                offsetY: -15,
                textAlign: 'center'
            }) : undefined
        });

        positionFeature.setStyle(getPositionStyle(null));
        positionFeatureRef.current = positionFeature;

        const accuracyFeature = new Feature();
        accuracyFeature.setStyle(
            new Style({
                fill: new Fill({ color: "rgba(51, 136, 255, 0.1)" }),
                stroke: new Stroke({ color: "rgba(51, 136, 255, 0.4)", width: 1 }),
            })
        );
        accuracyFeatureRef.current = accuracyFeature;

        const source = new VectorSource({
            features: [accuracyFeature, positionFeature],
        });
        sourceRef.current = source;

        const layer = new VectorLayer({
            source: source,
            zIndex: 100,
        });
        map.addLayer(layer);

        // Listen for geolocation changes
        geolocation.on("change:position", () => {
            const coordinates = geolocation.getPosition();
            if (coordinates) {
                positionFeature.setGeometry(new Point(coordinates));
                setIsLoading(false);
            }
        });

        geolocation.on("change:accuracyGeometry", () => {
            const accuracyGeom = geolocation.getAccuracyGeometry();
            if (accuracyGeom) {
                accuracyFeature.setGeometry(accuracyGeom);
            }
        });

        geolocation.on("change:accuracy", () => {
            const acc = geolocation.getAccuracy() ?? null;
            setAccuracy(acc);
            positionFeature.setStyle(getPositionStyle(acc));
        });

        geolocation.on("error", (error) => {
            toast.error(`Geolocation error: ${error.message}`);
            setIsTracking(false);
            setIsLoading(false);
        });

        return () => {
            geolocation.setTracking(false);
            map.removeLayer(layer);
        };
    }, [map]);

    const handleToggleTracking = useCallback(() => {
        if (!geolocationRef.current || !map) return;

        const newTracking = !isTracking;
        setIsTracking(newTracking);

        if (newTracking) {
            setIsLoading(true);
            geolocationRef.current.setTracking(true);

            // Once we have a position, center the map
            const onceChangePosition = () => {
                const coordinates = geolocationRef.current?.getPosition();
                if (coordinates) {
                    map.getView().animate({
                        center: coordinates,
                        zoom: 17,
                        duration: 1000,
                    });
                    geolocationRef.current?.un("change:position", onceChangePosition);
                }
            };
            geolocationRef.current.on("change:position", onceChangePosition);
        } else {
            geolocationRef.current.setTracking(false);
            if (positionFeatureRef.current) positionFeatureRef.current.setGeometry(undefined);
            if (accuracyFeatureRef.current) accuracyFeatureRef.current.setGeometry(undefined);
            setAccuracy(null);
            setIsLoading(false);
        }
    }, [isTracking, map]);

    return (
        <TooltipProvider>
            <div className={cn("relative flex items-center justify-center", className)}>
                {isTracking && accuracy !== null && (
                    <div className={cn(
                        "absolute bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-2.5 py-1 rounded-lg border border-white/50 dark:border-slate-700/50 shadow-xl text-[10px] font-bold text-blue-600 dark:text-blue-400 animate-in fade-in duration-300 whitespace-nowrap z-50 pointer-events-none",
                        tooltipSide === "right" ? "left-full ml-3" : "right-full mr-3"
                    )}>
                        Akurasi: {accuracy.toFixed(1)}m
                    </div>
                )}

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-8 w-8 rounded-xl transition-all duration-300 relative cursor-pointer",
                                isTracking
                                    ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30"
                                    : "text-slate-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 dark:text-slate-100"
                            )}
                            onClick={handleToggleTracking}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Navigation className={cn("h-4 w-4", isTracking && "fill-current")} />
                            )}
                            {isTracking && !isLoading && (
                                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-400 rounded-full border border-white dark:border-slate-900 animate-pulse" />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side={tooltipSide} className="bg-slate-900 text-white border-slate-800">
                        <p className="text-[10px] font-bold uppercase tracking-wider">
                            {isTracking ? "Matikan GPS" : "Lokasi Saya"}
                        </p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
}
