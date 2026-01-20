import type { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

export interface DesaGeoJSONResponse {
    status: string;
    message: string;
    result: FeatureCollection<Geometry, GeoJsonProperties>;
}

export const desaService = {
    /**
     * Fetch GeoJSON data for villages (desa), optionally filtered by kecamatan.
     * @param idKecamatan Optional kecamatan ID to filter villages
     * @returns Promise resolving to a GeoJSON FeatureCollection
     */
    getGeojsonDesa: async (idKecamatan?: string): Promise<FeatureCollection<Geometry, GeoJsonProperties> | null> => {
        try {
            const url = idKecamatan
                ? `https://api-melarosa.saggaserv.my.id/desa/geojson?id_kecamatan=${encodeURIComponent(idKecamatan)}`
                : "https://api-melarosa.saggaserv.my.id/desa/geojson";

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch desa geojson: ${response.statusText}`);
            }

            const data: DesaGeoJSONResponse = await response.json();
            return data.result || null;
        } catch (error) {
            console.error("Error fetching desa geojson:", error);
            return null;
        }
    },
};
