import { type GeoJSONFeatureCollection } from '../types';
import { apiClient } from '~/lib/api-client';

export const petaService = {
    getGeojsonJalan: async (idKecamatan?: string): Promise<GeoJSONFeatureCollection | null> => {
        const url = idKecamatan
            ? `${import.meta.env.VITE_API_BASE_URL}/jalan/geojson?id_kecamatan=${encodeURIComponent(idKecamatan)}`
            : `${import.meta.env.VITE_API_BASE_URL}/jalan/geojson`;

        const response = await apiClient.get<GeoJSONFeatureCollection>(url);
        return response.result || null;
    },
};

