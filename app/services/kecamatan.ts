import { apiClient } from '~/lib/api-client';

export interface Kecamatan {
    id: number;
    nama_kecamatan: string;
    nama_pimpinan?: string | null;
    nama_jabatan?: string | null;
    nip?: string | null;
    pangkat_gol?: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface KecamatanResponse {
    status: string;
    message: string;
    result: Kecamatan[];
}

export const kecamatanService = {
    getKecamatan: async (): Promise<Kecamatan[]> => {
        const response = await apiClient.get<Kecamatan[]>(`${import.meta.env.VITE_API_BASE_URL}/v1/kecamatan`);
        return response.result || [];
    },

    /**
     * Fetch GeoJSON data for a specific Kecamatan by its ID.
     * @param idKecamatan The ID of the Kecamatan
     * @returns Promise resolving to a GeoJSON data
     */
    getKecamatanGeojsonById: async (idKecamatan: string | number): Promise<any | null> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/kecamatan/${encodeURIComponent(idKecamatan.toString())}?format=geojson`;
        const response = await apiClient.get<any>(url) as any;
        if (response.type === 'FeatureCollection' || response.type === 'Feature') return response;
        return response.result || response.data || null;
    },

    /**
     * Fetch GeoJSON data for a specific Kecamatan by its Name.
     * @param namaKecamatan The name of the Kecamatan
     * @returns Promise resolving to a GeoJSON data
     */
    getKecamatanGeojsonByName: async (namaKecamatan: string): Promise<any | null> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/kecamatan?nama_kecamatan=${encodeURIComponent(namaKecamatan.toLowerCase())}&format=geojson`;
        const response = await apiClient.get<any>(url) as any;
        if (response.type === 'FeatureCollection' || response.type === 'Feature') return response;
        return response.result || response.data || null;
    },
};
