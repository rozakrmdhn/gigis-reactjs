import { type GeoJSONFeatureCollection } from '../types';
import { apiClient } from '~/lib/api-client';

export const petaService = {
    getGeojsonJalan: async (idKecamatan?: string): Promise<GeoJSONFeatureCollection | null> => {
        const url = idKecamatan
            ? `${import.meta.env.VITE_API_BASE_URL}/v1/jalan?format=geojson&id_kecamatan=${encodeURIComponent(idKecamatan)}`
            : `${import.meta.env.VITE_API_BASE_URL}/v1/jalan?format=geojson`;

        const response = await apiClient.get<GeoJSONFeatureCollection>(url);
        return response.result || null;
    },
};

