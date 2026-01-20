import { useState, useEffect, useRef } from 'react';
import { usePetaMap } from '../hooks/usePetaMap';
import { infoPanelService } from '../services/info-panel.service';
import { InfoPanel } from '../components/InfoPanel';
import { JalanDropdown } from '../components/JalanDropdown';
import { type GeoJSONFeature } from '../types';

export function TabPeta() {
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [selectedJalan, setSelectedJalan] = useState<GeoJSONFeature | null>(null);
    const [isPanelVisible, setIsPanelVisible] = useState(false);
    const [fetchingGeojson, setFetchingGeojson] = useState(false);

    const { updateSelectedJalan } = usePetaMap({
        mapboxToken,
        containerRef: mapContainerRef
    });

    // Update map when selectedJalan changes
    useEffect(() => {
        updateSelectedJalan(selectedJalan, () => {
            setIsPanelVisible(true);
        });
        // Panel stays hidden by default on selection as per user request
        setIsPanelVisible(false);
    }, [selectedJalan]);

    const handleSelectJalan = async (id: string) => {
        setFetchingGeojson(true);
        const geojson = await infoPanelService.getJalanById(id);
        if (geojson) {
            setSelectedJalan(geojson);
        }
        setFetchingGeojson(false);
    };

    return (
        <div className="flex-1 mt-2 relative border rounded-md overflow-hidden min-h-[500px]">
            {!mapboxToken && (
                <div className="absolute top-0 left-0 z-50 p-4 bg-yellow-100 text-yellow-800 w-full text-center">
                    Warning: VITE_MAPBOX_TOKEN is missing in .env
                </div>
            )}

            <JalanDropdown
                selectedJalanName={selectedJalan?.properties.nama_ruas}
                onSelectJalan={handleSelectJalan}
            />

            <InfoPanel
                selectedJalan={selectedJalan}
                isPanelVisible={isPanelVisible}
                setIsPanelVisible={setIsPanelVisible}
            />

            <div ref={mapContainerRef} className="w-full h-full" />
        </div>
    );
}
