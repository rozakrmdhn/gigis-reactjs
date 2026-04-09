import type { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import { apiClient } from '~/lib/api-client';

export const jalanService = {
    /**
     * Fetch road segments GeoJSON filtered by desa ID.
     * @param idDesa The ID of the Desa
     * @returns Promise resolving to a GeoJSON FeatureCollection
     */
    getSegmenByDesa: async (idDesa: string | number): Promise<FeatureCollection<Geometry, GeoJsonProperties> | null> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/jalan/segmen?id_desa=${encodeURIComponent(idDesa.toString())}`;
        const response = await apiClient.get<any>(url) as any;
        if (response.type === 'FeatureCollection' || response.type === 'Feature') return response;
        return response.result || response.data || null;
    },

    /**
     * Fetch Main Road (Jalan Utama) GeoJSON by desa ID.
     * @param idDesa The ID of the Desa
     * @returns Promise resolving to a GeoJSON FeatureCollection
     */
    getJalanUtamaByDesa: async (idDesa: string | number): Promise<FeatureCollection<Geometry, GeoJsonProperties> | null> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/jalan?id_desa=${encodeURIComponent(idDesa.toString())}&format=geojson`;
        const response = await apiClient.get<any>(url) as any;
        if (response.type === 'FeatureCollection' || response.type === 'Feature') return response;
        return response.result || response.data || null;
    },
};



