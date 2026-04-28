import { authService } from '~/services/auth.service';
import { apiClient } from '~/lib/api-client';

export interface Jalan {
    id: string;
    kode_ruas: number;
    nama_ruas: string;
    desa: string;
    kecamatan: string;
    panjang: number;
    lebar: number;
    perkerasan: string;
    kondisi: string;
    status_awal: string;
    status_eksisting: string;
    sumber_data: string;
    id_desa?: string;
    id_kecamatan?: number;
    created_at: string | null;
    updated_at: string | null;
    JalanSegmens?: any[];
}

export interface Segmen {
    id: string;
    check_melarosa?: string;
    status_jalan?: string;
    sumber_data?: string;
    sumber_dana?: string;
    tahun_pembangunan?: number;
    verifikator?: string;
    desa: string;
    kecamatan: string;
    panjang: number;
    lebar: string | number;
    jenis_perkerasan?: string;
    perkerasan?: string;
    tahun_renovasi_terakhir?: number | null;
    kondisi: string;
    nama_jalan?: string | null;
    nama_ruas?: string;
    kode_ruas: number;
    kecamatan_id?: number | string;
    id_kecamatan?: number | string;
    desa_id?: number | string;
    id_desa?: string;
    keterangan?: string;
    foto_url?: string | null;
    status_eksisting?: string;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface MonitoringJalanResult {
    jalan: Jalan;
    segmen: {
        desa: Segmen[];
        kabupaten: Segmen[];
    };
    summary: {
        total_panjang_jalan: number;
        fisik: {
            desa: number;
            kabupaten: number;
            total: number;
        };
        panjang_belum_tertangani: number;
        kondisi_jalan: {
            kode: number;
            nama: string;
            mantap: string;
            persentase_mantap: number;
        };
    };
}

export interface MonitoringJalanResponse {
    status: string;
    message: string;
    result: MonitoringJalanResult[];
    pagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface MonitoringProgress {
    id: string;
    id_segmen: string;
    kode_ruas: number;
    tanggal: string;
    progres: number;
    catatan: string;
    created_at?: string;
    updated_at?: string;
}

export const monitoringService = {
    getMonitoringJalan: async (params?: { id_kecamatan?: string; page?: number; limit?: number; search?: string }): Promise<MonitoringJalanResponse> => {
        const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/monitoring/jalan`, window.location.origin);
        if (params?.id_kecamatan) {
            url.searchParams.append("id_kecamatan", params.id_kecamatan);
        }
        if (params?.page) {
            url.searchParams.append("page", params.page.toString());
        }
        if (params?.limit) {
            url.searchParams.append("limit", params.limit.toString());
        }
        if (params?.search) {
            url.searchParams.append("search", params.search);
        }

        return await apiClient.get<MonitoringJalanResult[]>(url.toString()) as MonitoringJalanResponse;
    },

    getMonitoringJalanById: async (id: string): Promise<{ jalan: any; segmen: any; segmenkab: any } | null> => {
        const response = await apiClient.get<any>(`${import.meta.env.VITE_API_BASE_URL}/monitoring/jalan/${id}/geojson`);
        return response.result || null;
    },

    /**
     * Fetch detail ruas jalan dari /monitoring/jalan/:id
     * Mengembalikan { jalan, segmen: Segmen[] } — segmen adalah array plain object dengan field geom
     */
    getMonitoringJalanDetail: async (id: string): Promise<{ jalan: any; segmen: any[] } | null> => {
        try {
            const response = await apiClient.get<any>(
                `${import.meta.env.VITE_API_BASE_URL}/monitoring/jalan/${id}`,
                { showErrorToast: false }
            );
            return response.result || null;
        } catch {
            return null;
        }
    },

    createSegment: async (data: any): Promise<any> => {
        return await apiClient.post(
            `${import.meta.env.VITE_API_BASE_URL}/jalan/segmen`,
            data,
            {
                successMessage: "Segmen jalan berhasil ditambahkan!",
                errorMessage: "Gagal menambahkan segmen jalan"
            }
        );
    },

    updateSegment: async (id: string, data: any): Promise<any> => {
        return await apiClient.put(
            `${import.meta.env.VITE_API_BASE_URL}/jalan/segmen/${id}`,
            data,
            {
                successMessage: "Segmen jalan berhasil diperbarui!",
                errorMessage: "Gagal memperbarui segmen jalan"
            }
        );
    },

    deleteSegment: async (id: string): Promise<any> => {
        return await apiClient.delete(
            `${import.meta.env.VITE_API_BASE_URL}/jalan/segmen/${id}`,
            {
                successMessage: "Segmen jalan berhasil dihapus!",
                errorMessage: "Gagal menghapus segmen jalan"
            }
        );
    },

    getSegmentDetail: async (id: string): Promise<any> => {
        return await apiClient.get(`${import.meta.env.VITE_API_BASE_URL}/jalan/segmen/${id}`);
    },

    getSegmenByKodeRuas: async (kode_ruas: string | number): Promise<any> => {
        const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/jalan/segmen`, window.location.origin);
        url.searchParams.append("format", "geojson");
        if (kode_ruas) {
            url.searchParams.append("kode_ruas", kode_ruas.toString());
        }

        return await apiClient.get(url.toString(), { showErrorToast: false });
    },

    getSegmenByJalanId: async (id: string): Promise<any> => {
        return await apiClient.get(`${import.meta.env.VITE_API_BASE_URL}/jalan/${id}/segmen?format=geojson`, { showErrorToast: false });
    },

    getDesaById: async (id: string | number): Promise<any> => {
        return await apiClient.get(`${import.meta.env.VITE_API_BASE_URL}/desa/${id}?format=geojson`, { showErrorToast: false });
    },

    getAllSegmentsGeoJSON: async (): Promise<any> => {
        return await apiClient.get(`${import.meta.env.VITE_API_BASE_URL}/jalan/segmen?format=geojson`);
    },

    getKabupatenSegmentsGeoJSON: async (): Promise<any> => {
        return await apiClient.get(`${import.meta.env.VITE_API_BASE_URL}/segmen/kabupaten?format=geojson`);
    },

    getKecamatan: async (): Promise<any> => {
        return await apiClient.get(`${import.meta.env.VITE_API_BASE_URL}/kecamatan`);
    },

    getDesa: async (id_kecamatan: string | number): Promise<any> => {
        return await apiClient.get(`${import.meta.env.VITE_API_BASE_URL}/desa?id_kecamatan=${id_kecamatan}`);
    },

    getNonBaseSegments: async (id_desa?: string | number): Promise<any> => {
        let url = `${import.meta.env.VITE_API_BASE_URL}/jalan/segmen?check_melarosa=Tidak&format=geojson`;
        if (id_desa) {
            url += `&desa_id=${id_desa}`;
        }
        return await apiClient.get(url);
    },

    getMonitoringProgress: async (id_segmen: string): Promise<MonitoringProgress[]> => {
        const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/monitoring/segmen`, window.location.origin);
        url.searchParams.append("id_segmen", id_segmen);

        const response = await apiClient.get<MonitoringProgress[]>(url.toString());
        return response.result || [];
    },

    createMonitoringProgress: async (data: Partial<MonitoringProgress>): Promise<any> => {
        return await apiClient.post(
            `${import.meta.env.VITE_API_BASE_URL}/monitoring/segmen`,
            data,
            {
                successMessage: "Data monitoring berhasil disimpan!",
                errorMessage: "Gagal menyimpan data monitoring"
            }
        );
    },

    updateMonitoringProgress: async (id: string, data: Partial<MonitoringProgress>): Promise<any> => {
        return await apiClient.put(
            `${import.meta.env.VITE_API_BASE_URL}/monitoring/segmen/${id}`,
            data,
            {
                successMessage: "Data monitoring berhasil diperbarui!",
                errorMessage: "Gagal memperbarui data monitoring"
            }
        );
    },

    deleteMonitoringProgress: async (id: string): Promise<any> => {
        return await apiClient.delete(
            `${import.meta.env.VITE_API_BASE_URL}/monitoring/segmen/${id}`,
            {
                successMessage: "Data monitoring berhasil dihapus!",
                errorMessage: "Gagal menghapus data monitoring"
            }
        );
    }
};

