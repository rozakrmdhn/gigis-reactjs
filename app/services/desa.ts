import type { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import { apiClient } from '~/lib/api-client';

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
        const url = idKecamatan
            ? `${import.meta.env.VITE_API_BASE_URL}/desa/geojson?id_kecamatan=${encodeURIComponent(idKecamatan)}`
            : `${import.meta.env.VITE_API_BASE_URL}/desa/geojson`;

        const response = await apiClient.get<FeatureCollection<Geometry, GeoJsonProperties>>(url);
        return response.result || null;
    },
};

