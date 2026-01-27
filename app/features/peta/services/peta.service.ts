import { type GeoJSONFeatureCollection, type GeoJSONFeatureCollectionResponse } from '../types';
import { authService } from '~/services/auth.service';

export const petaService = {
    getGeojsonJalan: async (idKecamatan?: string): Promise<GeoJSONFeatureCollection | null> => {
        try {
            const url = idKecamatan
                ? `${import.meta.env.VITE_API_BASE_URL}/jalan/geojson?id_kecamatan=${encodeURIComponent(idKecamatan)}`
                : `${import.meta.env.VITE_API_BASE_URL}/jalan/geojson`;

            const response = await fetch(url, {
                headers: authService.getAuthHeaders(),
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch geojson collection: ${response.statusText}`);
            }
            const data: GeoJSONFeatureCollectionResponse = await response.json();
            return data.result || null;
        } catch (error) {
            console.error("Error fetching geojson collection:", error);
            return null;
        }
    },
};
