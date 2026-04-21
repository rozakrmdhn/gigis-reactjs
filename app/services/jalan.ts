import type { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import { apiClient } from '~/lib/api-client';

export interface RekapDibangun {
    id_kecamatan: number;
    id_desa: number;
    nama_desa: string;
    nama_kecamatan: string;
    total_panjang_aset: number;
    total_panjang_puk: number;
    total_panjang_dibangun: number;
    selisih: number;
    sisa_intervensi: number;
    status_pembangunan: string;
}

/**
 * Normalizes API URL by removing potential double slashes
 */
const getUrl = (path: string) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return `${baseUrl}/${cleanPath}`;
};

export const jalanService = {
    /**
     * Fetch road segments GeoJSON filtered by desa ID.
     * @param idDesa The ID of the Desa
     * @returns Promise resolving to a GeoJSON FeatureCollection
     */
    getSegmenByDesa: async (idDesa: string | number): Promise<FeatureCollection<Geometry, GeoJsonProperties> | null> => {
        try {
            // Added format=geojson to segments as well
            const url = getUrl(`/jalan/segmen?id_desa=${encodeURIComponent(idDesa.toString())}&format=geojson`);
            const response = await apiClient.get<any>(url, {
                errorMessage: "Gagal mengambil data segmen jalan"
            }) as any;

            if (response.type === 'FeatureCollection' || response.type === 'Feature') return response;
            if (response.result?.type === 'FeatureCollection') return response.result;
            return response.result || response.data || null;
        } catch (error) {
            console.error(`Failed to fetch segments for desa ${idDesa}:`, error);
            return null;
        }
    },

    /**
     * Fetch Master Road (Jalan Poros Desa) GeoJSON by desa ID.
     * @param idDesa The ID of the Desa
     * @returns Promise resolving to a GeoJSON FeatureCollection
     */
    getJalanPorosByDesa: async (idDesa: string | number): Promise<FeatureCollection<Geometry, GeoJsonProperties> | null> => {
        try {
            const url = getUrl(`/jalan?id_desa=${encodeURIComponent(idDesa.toString())}&format=geojson`);
            const response = await apiClient.get<any>(url, {
                errorMessage: "Gagal mengambil data jalan poros desa"
            }) as any;

            if (response.type === 'FeatureCollection' || response.type === 'Feature') return response;
            if (response.result?.type === 'FeatureCollection') return response.result;
            return response.result || response.data || null;
        } catch (error) {
            console.error(`Failed to fetch poros for desa ${idDesa}:`, error);
            return null;
        }
    },

    /**
     * Fetch development summary (rekap) by desa ID.
     * @param idDesa The ID of the Desa
     */
    getRekapDibangunByDesa: async (idDesa: string | number): Promise<RekapDibangun | null> => {
        try {
            const url = getUrl(`/rekap/dibangun?id_desa=${encodeURIComponent(idDesa.toString())}&check_melarosa=Ya`);
            const response = await apiClient.get<any>(url, {
                errorMessage: "Gagal mengambil data rekap pembangunan"
            }) as any;

            if (response.status === 'success' && response.result && response.result.length > 0) {
                return response.result[0];
            }
            return null;
        } catch (error) {
            console.error(`Failed to fetch rekap for desa ${idDesa}:`, error);
            return null;
        }
    },
};
