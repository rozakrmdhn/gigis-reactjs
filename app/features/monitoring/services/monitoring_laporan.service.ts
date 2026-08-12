import { apiClient } from "~/lib/api-client";

export interface MonitoringLaporanPayload {
    id_desa: number | string;
    id_kecamatan?: number | string;
    tahun_anggaran: number | string;
    sumber_dana?: string;
    rencana_panjang?: number | string;
    status?: string;
    keterangan?: string;
    tipe_kode?: string | string[];
    nomor_ba?: string;
    plotting_id?: string | null;
}

export const monitoringLaporanService = {
    createLaporan: async (payload: MonitoringLaporanPayload): Promise<any> => {
        return await apiClient.post(`${import.meta.env.VITE_API_BASE_URL}/v1/laporan`, payload, {
            showErrorToast: true
        });
    },

    getLaporanList: async (params?: { id_desa?: string | number; id_kecamatan?: string | number; tahun_anggaran?: string | number; status?: string }): Promise<any> => {
        const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/v1/laporan`, window.location.origin);
        if (params?.id_desa) url.searchParams.append("id_desa", params.id_desa.toString());
        if (params?.id_kecamatan) url.searchParams.append("id_kecamatan", params.id_kecamatan.toString());
        if (params?.tahun_anggaran) url.searchParams.append("tahun_anggaran", params.tahun_anggaran.toString());
        if (params?.status) url.searchParams.append("status", params.status);

        return await apiClient.get(url.toString(), {
            showErrorToast: true
        });
    },

    getLaporanById: async (id: string): Promise<any> => {
        return await apiClient.get(`${import.meta.env.VITE_API_BASE_URL}/v1/laporan/${id}`, {
            showErrorToast: true
        });
    },

    updateLaporan: async (id: string, payload: Partial<MonitoringLaporanPayload>): Promise<any> => {
        return await apiClient.put(`${import.meta.env.VITE_API_BASE_URL}/v1/laporan/${id}`, payload, {
            showErrorToast: true
        });
    },

    patchLaporan: async (id: string, payload: Partial<MonitoringLaporanPayload> & { sync_target?: boolean }): Promise<any> => {
        return await apiClient.patch(`${import.meta.env.VITE_API_BASE_URL}/v1/laporan/${id}`, payload, {
            showErrorToast: true
        });
    },

    syncTargetFisik: async (id: string): Promise<any> => {
        return await apiClient.patch(`${import.meta.env.VITE_API_BASE_URL}/v1/laporan/${id}/sync-target`, {}, {
            showErrorToast: true
        });
    },

    deleteLaporan: async (id: string): Promise<any> => {
        return await apiClient.delete(`${import.meta.env.VITE_API_BASE_URL}/v1/laporan/${id}`, {
            showErrorToast: true
        });
    }
};
