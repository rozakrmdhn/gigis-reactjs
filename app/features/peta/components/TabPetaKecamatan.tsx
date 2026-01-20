import { useState, useEffect, useRef } from 'react';
import { usePetaKecamatanMap } from '../hooks/usePetaKecamatanMap';
import { infoPanelService } from '../services/info-panel.service';
import { type Kecamatan } from '~/services/kecamatan';
import { desaService } from '~/services/desa';
import { petaService } from '../services/peta.service';
import { Loader2 } from 'lucide-react';
import { InfoPanel } from './InfoPanel';
import { KecamatanDropdown } from './KecamatanDropdown';
import { type GeoJSONFeature } from '../types';

export function TabPetaKecamatan() {
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
    const mapContainerRef = useRef<HTMLDivElement>(null);

    const [selectedKecamatan, setSelectedKecamatan] = useState<Kecamatan | null>(null);
    const [fetchingGeojson, setFetchingGeojson] = useState(false);
    const [selectedJalan, setSelectedJalan] = useState<GeoJSONFeature | null>(null);
    const [isPanelVisible, setIsPanelVisible] = useState(false);

    const { updateKecamatanData, updateSelectedJalan, setOnRoadClick } = usePetaKecamatanMap({
        mapboxToken,
        containerRef: mapContainerRef
    });

    // Update Map when selectedKecamatan changes
    useEffect(() => {
        if (!selectedKecamatan) return;

        const handleKecamatanChange = async () => {
            setFetchingGeojson(true);
            const [geojsonJalan, geojsonDesa] = await Promise.all([
                petaService.getGeojsonJalan(selectedKecamatan.id.toString()),
                desaService.getGeojsonDesa(selectedKecamatan.id.toString())
            ]);

            updateKecamatanData(geojsonJalan, geojsonDesa);
            setFetchingGeojson(false);
        };

        handleKecamatanChange();
        setSelectedJalan(null);
    }, [selectedKecamatan]);

    // Update Map when selectedJalan changes
    useEffect(() => {
        updateSelectedJalan(selectedJalan, () => {
            setIsPanelVisible(true);
        });
        // Panel stays hidden by default on selection change
        setIsPanelVisible(false);
    }, [selectedJalan]);

    useEffect(() => {
        setOnRoadClick((id) => handleSelectJalan(id));
    }, []);

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

            <div className="absolute top-3 left-3 z-10 flex gap-2 items-center">
                <KecamatanDropdown
                    selectedKecamatanName={selectedKecamatan?.nama_kecamatan}
                    onSelectKecamatan={setSelectedKecamatan}
                />

                {fetchingGeojson && (
                    <div className="bg-white/80 dark:bg-black/80 p-2 rounded-full shadow-md animate-spin">
                        <Loader2 className="h-4 w-4 text-primary" />
                    </div>
                )}
            </div>


            <InfoPanel
                selectedJalan={selectedJalan}
                isPanelVisible={isPanelVisible}
                setIsPanelVisible={setIsPanelVisible}
            />

            <div ref={mapContainerRef} className="w-full h-full" />
        </div>
    );
}
