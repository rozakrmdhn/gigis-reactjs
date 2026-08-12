import { apiClient, type ApiResponse } from '~/lib/api-client';
import type { GeoJSONGeometry } from '~/features/usulan-desa/types/usulan-desa.types';

export interface DesaSingkat {
    id: string;
    nama_desa: string;
}

export interface BatasKecamatan {
    id: number; // INTEGER primary key
    nama_kecamatan: string;
    nama_pimpinan?: string | null;
    nama_jabatan?: string | null;
    nip?: string | null;
    pangkat_gol?: string | null;
    geom: GeoJSONGeometry | null;
    has_geom?: boolean;
    luas_m2: number | null;
    desa: DesaSingkat[] | null;
    created_at: string | null;
    updated_at: string | null;
}

export const batasKecamatanService = {
    getBatasKecamatan: async (params?: { 
        nama_kecamatan?: string; 
        page?: number; 
        limit?: number; 
        format?: string;
    }): Promise<ApiResponse<BatasKecamatan[]>> => {
        const searchParams = new URLSearchParams();
        if (params?.nama_kecamatan) {
            searchParams.append('nama_kecamatan', params.nama_kecamatan);
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
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/kecamatan${queryStr ? `?${queryStr}` : ''}`;
        return apiClient.get<BatasKecamatan[]>(url);
    },

    getBatasKecamatanById: async (id: number, params?: { format?: string }): Promise<ApiResponse<any>> => {
        const searchParams = new URLSearchParams();
        if (params?.format) {
            searchParams.append('format', params.format);
        }
        const queryStr = searchParams.toString();
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/kecamatan/${encodeURIComponent(id.toString())}${queryStr ? `?${queryStr}` : ''}`;
        return apiClient.get<any>(url);
    },

    createBatasKecamatan: async (data: { 
        id: number; 
        nama_kecamatan: string; 
        nama_pimpinan?: string | null;
        nama_jabatan?: string | null;
        nip?: string | null;
        pangkat_gol?: string | null;
        geom?: GeoJSONGeometry | null;
    }): Promise<ApiResponse<BatasKecamatan>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/kecamatan`;
        return apiClient.post<BatasKecamatan>(url, data, {
            successMessage: "Berhasil menambahkan batas kecamatan baru"
        });
    },

    updateBatasKecamatan: async (
        id: number, 
        data: { 
            nama_kecamatan?: string;
            nama_pimpinan?: string | null;
            nama_jabatan?: string | null;
            nip?: string | null;
            pangkat_gol?: string | null;
            geom?: GeoJSONGeometry | null;
        }
    ): Promise<ApiResponse<BatasKecamatan>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/kecamatan/${encodeURIComponent(id.toString())}`;
        return apiClient.put<BatasKecamatan>(url, data, {
            successMessage: "Berhasil mengubah batas kecamatan"
        });
    },

    deleteBatasKecamatan: async (id: number): Promise<ApiResponse<any>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/kecamatan/${encodeURIComponent(id.toString())}`;
        return apiClient.delete(url, {
            successMessage: "Berhasil menghapus batas kecamatan"
        });
    }
};
