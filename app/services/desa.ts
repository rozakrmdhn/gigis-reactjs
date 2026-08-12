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
        // Sanitize: If idKecamatan is 'all', '', 0, negative, or NaN, remove it so we fetch all desa
        const cleanId = idKecamatan === 'all' || !idKecamatan || isNaN(Number(idKecamatan)) || Number(idKecamatan) <= 0
            ? undefined
            : idKecamatan;

        const url = cleanId
            ? getUrl(`/v1/desa?id_kecamatan=${encodeURIComponent(cleanId.toString())}`)
            : getUrl(`/v1/desa`);

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
            // Sanitize: If idKecamatan is 'all', '', 0, negative, or NaN, remove it so we fetch all desa GeoJSON
            const cleanId = idKecamatan === 'all' || !idKecamatan || isNaN(Number(idKecamatan)) || Number(idKecamatan) <= 0
                ? undefined
                : idKecamatan;

            const url = cleanId
                ? getUrl(`/v1/desa?id_kecamatan=${encodeURIComponent(cleanId.toString())}&format=geojson`)
                : getUrl(`/v1/desa?format=geojson`);

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
            const url = getUrl(`/v1/desa/${encodeURIComponent(idDesa.toString())}?format=geojson`);
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

    /**
     * Fetch village (desa) details by ID (returns JSON object).
     */
    getDesaById: async (idDesa: string | number): Promise<any> => {
        const url = getUrl(`/v1/desa/${encodeURIComponent(idDesa.toString())}`);
        const response = await apiClient.get<any>(url);
        return response.result || response.data || null;
    },

    /**
     * Update village (desa) profile details by ID using PATCH.
     */
    patchDesa: async (idDesa: string | number, payload: { nama_pimpinan?: string; nama_jabatan?: string; nip?: string }): Promise<any> => {
        const url = getUrl(`/v1/desa/${encodeURIComponent(idDesa.toString())}`);
        const response = await apiClient.patch<any>(url, payload);
        return response.result || response.data || null;
    },
};
