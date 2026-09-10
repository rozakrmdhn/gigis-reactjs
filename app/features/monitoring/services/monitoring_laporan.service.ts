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
    nomor_ba?: string | null;
    plotting_id?: string | null;
}

export interface MonitoringLaporan {
    id: string;
    nomor_ba?: string | null;
    id_desa?: string | number;
    id_kecamatan?: string | number;
    tahun_anggaran?: string | number;
    sumber_dana?: string;
    rencana_panjang?: string | number;
    realisasi_panjang?: string | number;
    panjang_realisasi?: string | number;
    target_panjang_m?: string | number;
    total_panjang_m?: string | number;
    total_segmen?: number;
    status?: string;
    keterangan?: string;
    catatan_revisi?: string;
    kegiatan?: string;
    nama_desa?: string;
    created_at?: string;
    updated_at?: string;
    verifikator?: string;
    Desa?: { id: string | number; nama_desa: string; id_kecamatan?: string | number; nama_kecamatan?: string; nama_pimpinan?: string; nama_jabatan?: string; nip?: string; };
    Kecamatan?: { id: string | number; nama_kecamatan: string; nama_pimpinan?: string; nama_jabatan?: string; nip?: string; };
    PlottingAnggaran?: any;
    SegmensFormatted?: any[];
    LaporanSegmens?: any[];
    segmens?: any[];
}

export const monitoringLaporanService = {
    createLaporan: async (payload: MonitoringLaporanPayload): Promise<any> => {
        return await apiClient.post(`${import.meta.env.VITE_API_BASE_URL}/v1/laporan`, payload, {
            showErrorToast: true
        });
    },

    createLaporanBulk: async (payload: { items: MonitoringLaporanPayload[] } | MonitoringLaporanPayload[]): Promise<any> => {
        const items = Array.isArray(payload) ? payload : payload.items;
        if (!items || items.length === 0) {
            return { status: "success", message: "Tidak ada data yang diproses", data: [] };
        }

        try {
            // Coba panggil dedicated bulk endpoint
            const res = await apiClient.post(`${import.meta.env.VITE_API_BASE_URL}/v1/laporan/bulk`, { items }, {
                showErrorToast: false
            });
            return res;
        } catch (err: any) {
            console.warn("Dedicated POST /v1/laporan/bulk not available, executing fallback per-item:", err);
            // Fallback resilient: buat laporan satu per satu
            const results = await Promise.allSettled(
                items.map(item => apiClient.post(`${import.meta.env.VITE_API_BASE_URL}/v1/laporan`, item, { showErrorToast: false }))
            );

            const successItems: any[] = [];
            const failedItems: any[] = [];

            results.forEach((r, idx) => {
                if (r.status === "fulfilled" && (r.value?.status === "success" || r.value?.data || r.value?.result)) {
                    successItems.push(r.value);
                } else {
                    failedItems.push({ item: items[idx], error: (r as any).reason });
                }
            });

            if (successItems.length === 0 && failedItems.length > 0) {
                const errorMsg = failedItems[0]?.error?.message || "Gagal membuat draft dokumen monitoring";
                throw new Error(errorMsg);
            }

            return {
                status: "success",
                message: `Berhasil menerbitkan ${successItems.length} dari ${items.length} draft dokumen monitoring${failedItems.length > 0 ? ` (${failedItems.length} gagal)` : ''}`,
                data: successItems,
                result: successItems,
                summary: {
                    total: items.length,
                    success: successItems.length,
                    failed: failedItems.length
                }
            };
        }
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

    submitLaporan: async (id: string, payload?: any): Promise<any> => {
        try {
            return await apiClient.post(`${import.meta.env.VITE_API_BASE_URL}/v1/laporan/${id}/submit`, payload || {}, {
                showErrorToast: false
            });
        } catch {
            return await apiClient.patch(`${import.meta.env.VITE_API_BASE_URL}/v1/laporan/${id}`, {
                status: "Submitted",
                ...(payload || {})
            }, {
                showErrorToast: true
            });
        }
    },

    deleteLaporan: async (id: string, deleteSegments: boolean = true): Promise<any> => {
        return await apiClient.delete(`${import.meta.env.VITE_API_BASE_URL}/v1/laporan/${id}?delete_segments=${deleteSegments}`, {
            showErrorToast: true
        });
    },

    revertToDraft: async (id: string, payload?: { catatan?: string; unlock_segments?: boolean; target_segment_status?: string }): Promise<any> => {
        try {
            return await apiClient.post(`${import.meta.env.VITE_API_BASE_URL}/v1/laporan/${id}/revert-to-draft`, {
                catatan: payload?.catatan || "",
                unlock_segments: payload?.unlock_segments ?? true,
                target_segment_status: payload?.target_segment_status || "verifikasi_kecamatan"
            }, {
                showErrorToast: false
            });
        } catch (err: any) {
            // Fallback for transition phase before backend custom endpoint is deployed
            console.warn("revert-to-draft endpoint failed or not yet available, falling back to patchLaporan:", err);
            return await apiClient.patch(`${import.meta.env.VITE_API_BASE_URL}/v1/laporan/${id}`, {
                status: "Draft",
                catatan: payload?.catatan || "",
                keterangan: payload?.catatan ? `Revisi: ${payload.catatan}` : undefined
            }, {
                showErrorToast: true
            });
        }
    }
};
