import { apiClient } from "~/lib/api-client";

export interface PlottingAnggaran {
    id: string;
    tahun_anggaran: number;
    id_kecamatan: number | string;
    id_desa: number | string;
    jenis_bantuan: string;
    nama_kegiatan: string;
    lokasi_kegiatan?: string;
    sumber_dana: string;
    target_pagu_anggaran: number;
    target_panjang_m: number;
    user_id?: string;
    created_at?: string;
    updated_at?: string;
    Desa?: { id: number | string; nama_desa: string };
    Kecamatan?: { id: number | string; nama_kecamatan: string };
}

export interface PlottingAnggaranPayload {
    tahun_anggaran: number;
    id_kecamatan: number | string;
    id_desa: number | string;
    jenis_bantuan: string;
    nama_kegiatan: string;
    lokasi_kegiatan?: string;
    sumber_dana?: string;
    target_pagu_anggaran?: number;
    target_panjang_m?: number;
}

export interface PlottingQueryParams {
    page?: number;
    limit?: number;
    tahun_anggaran?: number | string;
    id_kecamatan?: number | string;
    id_desa?: number | string;
    sumber_dana?: string;
    jenis_bantuan?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
}

export const plottingAnggaranService = {
    getPlottingList: async (params?: PlottingQueryParams): Promise<any> => {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
        const url = new URL(`${baseUrl}/v1/plotting-anggaran`, window.location.origin);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== "") {
                    url.searchParams.append(key, value.toString());
                }
            });
        }
        return await apiClient.get(url.toString(), { showErrorToast: true });
    },

    getPlottingById: async (id: string): Promise<any> => {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
        return await apiClient.get(`${baseUrl}/v1/plotting-anggaran/${id}`, { showErrorToast: true });
    },

    createPlotting: async (payload: PlottingAnggaranPayload): Promise<any> => {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
        return await apiClient.post(`${baseUrl}/v1/plotting-anggaran`, payload, { showErrorToast: true });
    },

    updatePlotting: async (id: string, payload: Partial<PlottingAnggaranPayload>): Promise<any> => {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
        return await apiClient.put(`${baseUrl}/v1/plotting-anggaran/${id}`, payload, { showErrorToast: true });
    },

    deletePlotting: async (id: string): Promise<any> => {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
        return await apiClient.delete(`${baseUrl}/v1/plotting-anggaran/${id}`, { showErrorToast: true });
    },

    importPlottingExcel: async (file: File): Promise<any> => {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
        const formData = new FormData();
        formData.append("file", file);
        return await apiClient.postForm(`${baseUrl}/v1/plotting-anggaran/import`, formData, {
            showErrorToast: false
        });
    }
};
