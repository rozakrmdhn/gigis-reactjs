import type { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import { authService } from './auth.service';

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
                ? `${import.meta.env.VITE_API_BASE_URL}/desa/geojson?id_kecamatan=${encodeURIComponent(idKecamatan)}`
                : `${import.meta.env.VITE_API_BASE_URL}/desa/geojson`;

            const response = await fetch(url, {
                headers: authService.getAuthHeaders(),
            });
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
