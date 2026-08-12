import { apiClient, type ApiResponse } from '~/lib/api-client';
import type { Kecamatan } from './kecamatan';
import type { GeoJSONGeometry } from '~/features/usulan-desa/types/usulan-desa.types';

export interface BatasDesa {
    id: string; // BIGINT is treated as string to prevent integer precision issues
    id_kecamatan: number;
    nama_desa: string;
    nama_pimpinan?: string | null;
    nama_jabatan?: string | null;
    nip?: string | null;
    pangkat_gol?: string | null;
    geom: GeoJSONGeometry | null;
    has_geom?: boolean;
    luas_m2: number | null;
    kecamatan: Kecamatan | null;
    created_at: string | null;
    updated_at: string | null;
}

export const batasDesaService = {
    getBatasDesa: async (params?: { 
        id_kecamatan?: string | number; 
        nama_desa?: string; 
        page?: number; 
        limit?: number; 
        format?: string;
    }): Promise<ApiResponse<BatasDesa[]>> => {
        const searchParams = new URLSearchParams();
        if (params?.id_kecamatan && params.id_kecamatan !== 'all') {
            searchParams.append('id_kecamatan', params.id_kecamatan.toString());
        }
        if (params?.nama_desa) {
            searchParams.append('nama_desa', params.nama_desa);
        }
        if (params?.page) {
            searchParams.append('page', params.page.toString());
        }
        if (params?.limit) {
            searchParams.append('limit', params.limit.toString());
        }
        if (params?.format) {
            searchParams.append('format', params.format);
        }

        const queryStr = searchParams.toString();
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/desa${queryStr ? `?${queryStr}` : ''}`;
        return apiClient.get<BatasDesa[]>(url);
    },

    getBatasDesaById: async (id: string | number, params?: { format?: string }): Promise<ApiResponse<any>> => {
        const searchParams = new URLSearchParams();
        if (params?.format) {
            searchParams.append('format', params.format);
        }
        const queryStr = searchParams.toString();
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/desa/${encodeURIComponent(id.toString())}${queryStr ? `?${queryStr}` : ''}`;
        return apiClient.get<any>(url);
    },

    createBatasDesa: async (data: { 
        id: string; 
        id_kecamatan: number; 
        nama_desa: string; 
        nama_pimpinan?: string | null;
        nama_jabatan?: string | null;
        nip?: string | null;
        pangkat_gol?: string | null;
        geom?: GeoJSONGeometry | null;
    }): Promise<ApiResponse<BatasDesa>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/desa`;
        return apiClient.post<BatasDesa>(url, data, {
            successMessage: "Berhasil menambahkan batas desa baru"
        });
    },

    updateBatasDesa: async (
        id: string | number, 
        data: { 
            id_kecamatan?: number; 
            nama_desa?: string; 
            nama_pimpinan?: string | null;
            nama_jabatan?: string | null;
            nip?: string | null;
            pangkat_gol?: string | null;
            geom?: GeoJSONGeometry | null;
        }
    ): Promise<ApiResponse<BatasDesa>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/desa/${encodeURIComponent(id.toString())}`;
        return apiClient.put<BatasDesa>(url, data, {
            successMessage: "Berhasil mengubah batas desa"
        });
    },

    deleteBatasDesa: async (id: string | number): Promise<ApiResponse<any>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/desa/${encodeURIComponent(id.toString())}`;
        return apiClient.delete(url, {
            successMessage: "Berhasil menghapus batas desa"
        });
    }
};
