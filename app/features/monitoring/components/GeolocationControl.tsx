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
}

export function GeolocationControl({ map, className }: GeolocationControlProps) {
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
            <div className={cn("flex flex-col items-start gap-1", className)}>
                {isTracking && accuracy !== null && (
                    <div className="bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-full border border-blue-200 shadow-sm text-[10px] font-bold text-blue-600 animate-in fade-in zoom-in duration-300">
                        Accuracy: {accuracy.toFixed(1)}m
                    </div>
                )}

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className={cn(
                                "h-10 w-10 rounded-xl shadow-xl transition-all duration-300 cursor-pointer overflow-hidden relative",
                                isTracking
                                    ? "bg-blue-600 text-white border-blue-500 hover:bg-blue-700"
                                    : "bg-white/80 backdrop-blur-md border-slate-200 text-slate-600 hover:bg-slate-50"
                            )}
                            onClick={handleToggleTracking}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Navigation className={cn("h-5 w-5", isTracking && "fill-current")} />
                            )}
                            {isTracking && !isLoading && (
                                <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-400 rounded-full border border-white animate-pulse" />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p className="text-xs font-semibold">
                            {isTracking ? "Disable Location" : "Show My Location"}
                        </p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
}
