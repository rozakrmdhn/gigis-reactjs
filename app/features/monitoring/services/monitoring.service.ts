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
    id_desa: string;
    id_kecamatan: number;
    created_at: string | null;
    updated_at: string | null;
    JalanSegmens: any[];
}

export interface Segmen {
    id: string;
    check_melarosa: string;
    status_jalan: string;
    sumber_data: string;
    tahun_pembangunan: number;
    verifikator: string;
    desa: string;
    kecamatan: string;
    panjang: number;
    lebar: string;
    jenis_perkerasan: string;
    tahun_renovasi_terakhir: number | null;
    kondisi: string;
    nama_jalan: string;
    kode_ruas: number;
    kecamatan_id: number;
    desa_id: number;
    keterangan: string;
    foto_url: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface MonitoringJalanResult {
    jalan: Jalan;
    segmen: Segmen[];
    summary: {
        total_segmens: number;
        total_panjang_segmen: number;
        total_panjang_jalan: number;
        total_selisih_panjang: number;
        kondisi_jalan?: {
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

export const monitoringService = {
    getMonitoringJalan: async (params?: { id_kecamatan?: string; page?: number; limit?: number; search?: string }): Promise<MonitoringJalanResponse> => {
        try {
            const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/monitoring/jalan`);
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

            const response = await fetch(url.toString());
            if (!response.ok) {
                throw new Error(`Failed to fetch monitoring data: ${response.statusText}`);
            }
            const data: MonitoringJalanResponse = await response.json();
            return data;
        } catch (error) {
            console.error("Error fetching monitoring jalan data:", error);
            return { status: "error", message: "Failed to fetch", result: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } };
        }
    },

    getMonitoringJalanById: async (id: string): Promise<{ jalan: any; segmen: any } | null> => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/monitoring/jalan/${id}/geojson`);
            if (!response.ok) {
                throw new Error(`Failed to fetch monitoring detail data: ${response.statusText}`);
            }
            const data = await response.json();
            return data.result || null;
        } catch (error) {
            console.error("Error fetching monitoring detail data:", error);
            return null;
        }
    }
};
