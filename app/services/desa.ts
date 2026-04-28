import type { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import { apiClient } from '~/lib/api-client';

export interface DesaGeoJSONResponse {
    status: string;
    message: string;
    result: FeatureCollection<Geometry, GeoJsonProperties>;
}

export interface Desa {
    id: number;
    id_kecamatan: number;
    nama_desa: string;
    created_at: string | null;
    updated_at: string | null;
}

/**
 * Normalizes API URL by removing potential double slashes
 */
const getUrl = (path: string) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return `${baseUrl}/${cleanPath}`;
};

export const desaService = {
    /**
     * Fetch list of villages (desa), optionally filtered by kecamatan.
     * @param idKecamatan Optional kecamatan ID to filter villages
     * @returns Promise resolving to a list of Desa
     */
    getDesa: async (idKecamatan?: string | number): Promise<Desa[]> => {
        const url = idKecamatan
            ? getUrl(`/desa?id_kecamatan=${encodeURIComponent(idKecamatan.toString())}`)
            : getUrl(`/desa`);

        const response = await apiClient.get<Desa[]>(url);
        return response.result || [];
    },

    /**
     * Fetch GeoJSON data for villages (desa), optionally filtered by kecamatan.
     * @param idKecamatan Optional kecamatan ID to filter villages
     * @returns Promise resolving to a GeoJSON FeatureCollection
     */
    getGeojsonDesa: async (idKecamatan?: string | number): Promise<FeatureCollection<Geometry, GeoJsonProperties> | null> => {
        try {
            const url = idKecamatan
                ? getUrl(`/desa/geojson?id_kecamatan=${encodeURIComponent(idKecamatan.toString())}&format=geojson`)
                : getUrl(`/desa/geojson?format=geojson`);

            const response = await apiClient.get<any>(url) as any;
            if (response.type === 'FeatureCollection' || response.type === 'Feature') return response;
            if (response.result?.type === 'FeatureCollection') return response.result;
            return response.result || response.data || null;
        } catch (error) {
            console.error("Failed to fetch geojson desa:", error);
            return null;
        }
    },
    /**
     * Fetch GeoJSON data for a specific Desa by its ID.
     * @param idDesa The ID of the Desa
     * @returns Promise resolving to a GeoJSON FeatureCollection
     */
    getDesaGeojsonById: async (idDesa: string | number): Promise<FeatureCollection<Geometry, GeoJsonProperties> | null> => {
        try {
            const url = getUrl(`/desa/geojson?id_desa=${encodeURIComponent(idDesa.toString())}&format=geojson`);
            const response = await apiClient.get<any>(url, {
                errorMessage: "Gagal mengambil batas wilayah desa"
            }) as any;

            if (response.type === 'FeatureCollection' || response.type === 'Feature') return response;
            if (response.result?.type === 'FeatureCollection') return response.result;
            return response.result || response.data || null;
        } catch (error) {
            console.error(`Failed to fetch geojson for desa ${idDesa}:`, error);
            return null;
        }
    },
};
