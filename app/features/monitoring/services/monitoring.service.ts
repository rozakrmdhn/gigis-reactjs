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
            panjang_belum_mantap: number;
            persentase_mantap: number;
            persentase_per_kondisi: {
                baik: number;
                sedang: number;
                "rusak ringan": number;
                "rusak berat": number;
            };
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
    user_id?: number | null;
    Creator?: {
        id: number;
        nama?: string;
        email?: string;
    } | null;
    created_at?: string;
    updated_at?: string;
}

export const monitoringService = {
    getMonitoringJalan: async (params?: { id_kecamatan?: string; id_desa?: string; page?: number; limit?: number; search?: string }): Promise<MonitoringJalanResponse> => {
        const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/v1/monitoring/jalan`, window.location.origin);
        if (params?.id_kecamatan) {
            url.searchParams.append("id_kecamatan", params.id_kecamatan);
        }
        if (params?.id_desa) {
            url.searchParams.append("id_desa", params.id_desa);
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
        const response = await apiClient.get<any>(`${import.meta.env.VITE_API_BASE_URL}/v1/jalan/${id}?format=geojson`);
        return response.result || null;
    },

    /**
     * Fetch detail ruas jalan dari /v1/monitoring/jalan/:id
     * Mengembalikan { jalan, segmen: Segmen[] } — segmen adalah array plain object dengan field geom
     */
    getMonitoringJalanDetail: async (id: string): Promise<MonitoringJalanResult | null> => {
        try {
            const response = await apiClient.get<MonitoringJalanResult>(
                `${import.meta.env.VITE_API_BASE_URL}/v1/monitoring/jalan/${id}`,
                { showErrorToast: false }
            );
            return response.result || null;
        } catch {
            return null;
        }
    },

    createSegment: async (data: any, tipe: string = 'jalan'): Promise<any> => {
        const endpoint = data?.parent_id 
            ? `${import.meta.env.VITE_API_BASE_URL}/v1/infrastruktur/${tipe}/${data.parent_id}/segmen`
            : `${import.meta.env.VITE_API_BASE_URL}/v1/infrastruktur/${tipe}/segmen`;
        return await apiClient.post(
            endpoint,
            data,
            {
                successMessage: "Segmen infrastruktur berhasil ditambahkan!",
                errorMessage: "Gagal menambahkan segmen infrastruktur"
            }
        );
    },

    updateSegment: async (id: string, data: any, tipe: string = 'jalan'): Promise<any> => {
        return await apiClient.put(
            `${import.meta.env.VITE_API_BASE_URL}/v1/infrastruktur/${tipe}/segmen/${id}`,
            data,
            {
                successMessage: "Segmen infrastruktur berhasil diperbarui!",
                errorMessage: "Gagal memperbarui segmen infrastruktur"
            }
        );
    },

    deleteSegment: async (id: string, tipe: string = 'jalan'): Promise<any> => {
        return await apiClient.delete(
            `${import.meta.env.VITE_API_BASE_URL}/v1/infrastruktur/${tipe}/segmen/${id}`,
            {
                successMessage: "Segmen infrastruktur berhasil dihapus!",
                errorMessage: "Gagal menghapus segmen infrastruktur"
            }
        );
    },

    getSegmentDetail: async (id: string): Promise<any> => {
        return await apiClient.get(`${import.meta.env.VITE_API_BASE_URL}/v1/segmen/${id}`);
    },

    getSegmenByKodeRuas: async (kode_ruas: string | number): Promise<any> => {
        const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/v1/segmen`, window.location.origin);
        url.searchParams.append("format", "geojson");
        if (kode_ruas) {
            url.searchParams.append("kode_ruas", kode_ruas.toString());
        }

        const response = await apiClient.get(url.toString(), { showErrorToast: false });
        return response.result;
    },

    getSegmenByJalanId: async (id: string, filters?: { kondisi?: string; status_kondisi?: string }): Promise<any> => {
        const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/v1/jalan/${id}/segmen`, window.location.origin);
        url.searchParams.append("format", "geojson");
        if (filters?.kondisi && filters.kondisi !== 'all') {
            url.searchParams.append("kondisi", filters.kondisi);
        }
        if (filters?.status_kondisi && filters.status_kondisi !== 'all') {
            url.searchParams.append("status_kondisi", filters.status_kondisi);
        }
        return await apiClient.get(url.toString(), { showErrorToast: false });
    },

    getDesaById: async (id: string | number): Promise<any> => {
        if (!id || id === 'all' || isNaN(Number(id)) || Number(id) <= 0) {
            return null;
        }
        return await apiClient.get(`${import.meta.env.VITE_API_BASE_URL}/v1/desa/${id}?format=geojson`, { showErrorToast: false });
    },

    getAllSegmentsGeoJSON: async (): Promise<any> => {
        return await apiClient.get(`${import.meta.env.VITE_API_BASE_URL}/v1/infrastruktur/jalan/segmen?format=geojson`, { showErrorToast: false });
    },

    getKabupatenSegmentsGeoJSON: async (): Promise<any> => {
        return await apiClient.get(`${import.meta.env.VITE_API_BASE_URL}/v1/infrastruktur/jalan_lingkungan/segmen?format=geojson`, { showErrorToast: false });
    },

    getJalanGeoJSON: async (params?: { id?: string; search?: string; kode_ruas?: string | number; limit?: number }): Promise<any> => {
        const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/v1/jalan`, window.location.origin);
        url.searchParams.append("format", "geojson");
        if (params?.id) url.searchParams.append("id", params.id);
        if (params?.search) url.searchParams.append("search", params.search);
        if (params?.kode_ruas) url.searchParams.append("kode_ruas", params.kode_ruas.toString());
        if (params?.limit) url.searchParams.append("limit", params.limit.toString());

        const response = await apiClient.get(url.toString(), { showErrorToast: false });
        return response.result;
    },

    getJalanByIdGeoJSON: async (id: string | number): Promise<any> => {
        if (!id || id === 'all') {
            return null;
        }
        const response = await apiClient.get(`${import.meta.env.VITE_API_BASE_URL}/v1/jalan/${id}?format=geojson`, { showErrorToast: false });
        return response.result;
    },

    getKecamatan: async (): Promise<any> => {
        return await apiClient.get(`${import.meta.env.VITE_API_BASE_URL}/v1/kecamatan`);
    },

    getDesa: async (id_kecamatan: string | number): Promise<any> => {
        if (!id_kecamatan || id_kecamatan === 'all' || isNaN(Number(id_kecamatan)) || Number(id_kecamatan) <= 0) {
            return { status: "success", result: [] };
        }
        return await apiClient.get(`${import.meta.env.VITE_API_BASE_URL}/v1/desa?id_kecamatan=${id_kecamatan}`);
    },

    getDesaGeoJSONByKecamatan: async (id_kecamatan: string | number): Promise<any> => {
        if (!id_kecamatan || id_kecamatan === 'all' || isNaN(Number(id_kecamatan)) || Number(id_kecamatan) <= 0) {
            return null;
        }
        const response = await apiClient.get(`${import.meta.env.VITE_API_BASE_URL}/v1/desa?id_kecamatan=${id_kecamatan}&format=geojson`, { showErrorToast: false }) as any;
        if (response.type === 'FeatureCollection' || response.type === 'Feature') return response;
        return response.result || response.data || null;
    },

    getNonBaseSegments: async (id_desa?: string | number, tipe: string = 'jalan'): Promise<any> => {
        let url = `${import.meta.env.VITE_API_BASE_URL}/v1/infrastruktur/${tipe}/segmen?format=geojson`;
        if (id_desa && id_desa !== 'all' && !isNaN(Number(id_desa)) && Number(id_desa) > 0) {
            url += `&id_desa=${id_desa}`;
        }
        const response = await apiClient.get(url) as any;
        if (response.type === 'FeatureCollection' || response.type === 'Feature') return response;
        return response.result || response.data || null;
    },

    getMonitoringProgress: async (id_segmen: string): Promise<MonitoringProgress[]> => {
        const response = await apiClient.get<MonitoringProgress[]>(`${import.meta.env.VITE_API_BASE_URL}/v1/segmen/${id_segmen}/riwayat`);
        return response.result || [];
    },

    createMonitoringProgress: async (data: Partial<MonitoringProgress>): Promise<any> => {
        const segmenId = data.id_segmen;
        return await apiClient.post(
            `${import.meta.env.VITE_API_BASE_URL}/v1/segmen/${segmenId}/riwayat`,
            data,
            {
                successMessage: "Data monitoring berhasil disimpan!",
                errorMessage: "Gagal menyimpan data monitoring"
            }
        );
    },

    updateMonitoringProgress: async (id: string, data: Partial<MonitoringProgress>): Promise<any> => {
        const segmenId = data.id_segmen || 'unknown';
        return await apiClient.put(
            `${import.meta.env.VITE_API_BASE_URL}/v1/segmen/${segmenId}/riwayat/${id}`,
            data,
            {
                successMessage: "Data monitoring berhasil diperbarui!",
                errorMessage: "Gagal memperbarui data monitoring"
            }
        );
    },

    deleteMonitoringProgress: async (id: string, segmenId?: string): Promise<any> => {
        const targetSegmenId = segmenId || 'unknown';
        return await apiClient.delete(
            `${import.meta.env.VITE_API_BASE_URL}/v1/segmen/${targetSegmenId}/riwayat/${id}`,
            {
                successMessage: "Data monitoring berhasil dihapus!",
                errorMessage: "Gagal menghapus data monitoring"
            }
        );
    },

    getSegmenGeoJSONByKodeRuas: async (kode_ruas: string | number): Promise<any> => {
        const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/v1/segmen`, window.location.origin);
        url.searchParams.append("format", "geojson");
        if (kode_ruas) {
            url.searchParams.append("kode_ruas", kode_ruas.toString());
        }

        const response = await apiClient.get(url.toString(), { showErrorToast: false }) as any;
        if (response.type === 'FeatureCollection' || response.type === 'Feature') return response;
        return response.result || response.data || null;
    },

    extractSegment: async (data: {
        point1: { lng: number; lat: number };
        point2: { lng: number; lat: number };
        kode_ruas?: string | number
    }): Promise<any> => {
        return await apiClient.post(
            `${import.meta.env.VITE_API_BASE_URL}/v1/analisis/jalan/extract-segmen`,
            data,
            {
                successMessage: "Berhasil mengekstraksi segmen jalan!",
                errorMessage: "Gagal mengekstraksi segmen jalan"
            }
        );
    },
    
    getJalanByKecamatanGeoJSON: async (id_kecamatan: string | number, tipe: string = 'jalan'): Promise<any> => {
        const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/v1/infrastruktur/${tipe}`, window.location.origin);
        url.searchParams.append("format", "geojson");
        url.searchParams.append("kecamatan_id", id_kecamatan.toString());
        url.searchParams.append("limit", "1000");

        const response = await apiClient.get(url.toString(), { showErrorToast: false }) as any;
        if (response?.type === 'FeatureCollection' || response?.type === 'Feature') return response;
        if (response?.result?.type === 'FeatureCollection' || response?.result?.type === 'Feature') return response.result;
        return response?.result || response?.data || null;
    },

    getSegmenByKecamatanGeoJSON: async (id_kecamatan: string | number, tipe: string = 'jalan'): Promise<any> => {
        const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/v1/infrastruktur/${tipe}/segmen`, window.location.origin);
        url.searchParams.append("format", "geojson");
        url.searchParams.append("kecamatan_id", id_kecamatan.toString());
        url.searchParams.append("limit", "2000");

        const response = await apiClient.get(url.toString(), { showErrorToast: false }) as any;
        if (response?.type === 'FeatureCollection' || response?.type === 'Feature') return response;
        if (response?.result?.type === 'FeatureCollection' || response?.result?.type === 'Feature') return response.result;
        return response?.result || response?.data || null;
    },

    getJalanByDesaGeoJSON: async (id_desa: string | number, tipe: string = 'jalan'): Promise<any> => {
        const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/v1/infrastruktur/${tipe}`, window.location.origin);
        url.searchParams.append("format", "geojson");
        url.searchParams.append("id_desa", id_desa.toString());
        url.searchParams.append("limit", "1000");

        const response = await apiClient.get(url.toString(), { showErrorToast: false }) as any;
        if (response?.type === 'FeatureCollection' || response?.type === 'Feature') return response;
        if (response?.result?.type === 'FeatureCollection' || response?.result?.type === 'Feature') return response.result;
        return response?.result || response?.data || null;
    },

    getSegmenByDesaGeoJSON: async (id_desa: string | number, tipe: string = 'jalan'): Promise<any> => {
        const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/v1/infrastruktur/${tipe}/segmen`, window.location.origin);
        url.searchParams.append("format", "geojson");
        url.searchParams.append("id_desa", id_desa.toString());
        url.searchParams.append("limit", "2000");

        const response = await apiClient.get(url.toString(), { showErrorToast: false }) as any;
        if (response?.type === 'FeatureCollection' || response?.type === 'Feature') return response;
        if (response?.result?.type === 'FeatureCollection' || response?.result?.type === 'Feature') return response.result;
        return response?.result || response?.data || null;
    },

    getBeritaAcara: async (desa_id: string | number, tahun_pembangunan: string | number, sumber_dana?: string, tipe_kode?: string | string[]): Promise<any> => {
        const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/v1/rekap/cetak-berita-acara`, window.location.origin);
        url.searchParams.append("desa_id", desa_id.toString());
        url.searchParams.append("tahun_pembangunan", tahun_pembangunan.toString());
        if (sumber_dana && sumber_dana !== "Semua") {
            url.searchParams.append("sumber_dana", sumber_dana);
        }
        if (tipe_kode) {
            const strTipe = Array.isArray(tipe_kode) ? tipe_kode.join(",") : tipe_kode;
            if (strTipe !== "semua") {
                url.searchParams.append("tipe_kode", strTipe);
            }
        }

        return await apiClient.get(url.toString(), {
            showErrorToast: true
        });
    },

    relinkSpatial: async (data: {
        id_desa: string | number;
        tipe_kode?: string;
        buffer_meters?: number;
    }): Promise<any> => {
        return await apiClient.post(
            `${import.meta.env.VITE_API_BASE_URL}/v1/infrastruktur/relink-spatial`,
            data,
            {
                showErrorToast: false
            }
        );
    },

    batchSubmitSegmenToBappeda: async (tipe: string, payload: { ids?: string[]; id_desa?: string | number; tahun_pembangunan?: string | number }): Promise<any> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/infrastruktur/${tipe}/segmen/batch-submit-bappeda`;
        return await apiClient.post(url, payload, { showErrorToast: true });
    },

    verifikasiSegmenByBappeda: async (tipe: string, segmenId: string, payload: { status_verifikasi: string; catatan_verifikasi?: string }): Promise<any> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/infrastruktur/${tipe}/segmen/${segmenId}/verifikasi`;
        return await apiClient.patch(url, payload, { showErrorToast: true });
    }
};

