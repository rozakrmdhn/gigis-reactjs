import { useRef, useEffect } from "react";
import { type GeoJSONFeatureCollection } from "~/features/peta/types";
import { useMonitoringMap } from "~/features/monitoring/hooks/useMonitoringMap";
import { useIsMobile } from "~/hooks/use-mobile";
import { cn } from "~/lib/utils";
import { MapControls } from "./MapControls";

interface MonitoringMapProps {
    jalanFeatures?: GeoJSONFeatureCollection | null;
    segmenFeatures?: GeoJSONFeatureCollection | null;
    segmenKabFeatures?: GeoJSONFeatureCollection | null;
    isSidebarOpen?: boolean;
}

export function MonitoringMap({ jalanFeatures, segmenFeatures, segmenKabFeatures, isSidebarOpen = true }: MonitoringMapProps) {
    const isMobile = useIsMobile();
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
    const mapContainerRef = useRef<HTMLDivElement>(null);

    const { mapRef, updateData, zoomIn, zoomOut, resetBearing } = useMonitoringMap({
        mapboxToken,
        containerRef: mapContainerRef
    });

    useEffect(() => {
        const resizeObserver = new ResizeObserver(() => {
            if (mapRef.current) {
                mapRef.current.resize();
            }
        });

        if (mapContainerRef.current) {
            resizeObserver.observe(mapContainerRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, [mapRef]);

    useEffect(() => {
        updateData(jalanFeatures || null, segmenFeatures || null, segmenKabFeatures || null, isMobile);
    }, [jalanFeatures, segmenFeatures, segmenKabFeatures, updateData, isMobile]);

    return (
        <div className="flex-1 relative h-full w-full bg-slate-100">
            {!mapboxToken && (
                <div className="absolute top-0 left-0 z-50 p-4 bg-yellow-100 text-yellow-800 w-full text-center">
                    Warning: VITE_MAPBOX_TOKEN is missing in .env
                </div>
            )}
            <div ref={mapContainerRef} className="w-full h-full" />

            <MapControls
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                onResetBearing={resetBearing}
                className={cn(
                    "absolute bottom-4 transition-all duration-500 z-30",
                    isSidebarOpen ? "left-[336px]" : "left-4"
                )}
            />
        </div>
    );
}
