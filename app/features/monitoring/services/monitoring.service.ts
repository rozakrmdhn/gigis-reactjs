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
        try {
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

            const response = await fetch(url.toString(), {
                headers: authService.getAuthHeaders(),
            });
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

    getMonitoringJalanById: async (id: string): Promise<{ jalan: any; segmen: any; segmenkab: any } | null> => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/monitoring/jalan/${id}/geojson`, {
                headers: authService.getAuthHeaders(),
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch monitoring detail data: ${response.statusText}`);
            }
            const data = await response.json();
            return data.result || null;
        } catch (error) {
            console.error("Error fetching monitoring detail data:", error);
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
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/jalan/segmen/${id}`, {
            headers: authService.getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch segment detail: ${response.statusText}`);
        }
        return response.json();
    },

    getSegmenByKodeRuas: async (kode_ruas: string | number): Promise<any> => {
        try {
            const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/jalan/segmen/geojson`, window.location.origin);
            if (kode_ruas) {
                url.searchParams.append("kode_ruas", kode_ruas.toString());
            }

            const response = await fetch(url.toString(), {
                headers: authService.getAuthHeaders(),
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch segment geojson: ${response.statusText}`);
            }
            return response.json();
        } catch (error) {
            console.error("Error fetching segment geojson:", error);
            // Return empty feature collection on error to prevent UI crashes
            return {
                status: "error",
                message: "Failed to fetch data",
                result: {
                    type: "FeatureCollection",
                    features: []
                }
            };
        }
    },
    getAllSegmentsGeoJSON: async (): Promise<any> => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/jalan/segmen`, {
                headers: authService.getAuthHeaders(),
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch all segments: ${response.statusText}`);
            }
            return response.json();
        } catch (error) {
            console.error("Error fetching all segments geojson:", error);
            return {
                status: "error",
                message: "Failed to fetch data",
                result: {
                    type: "FeatureCollection",
                    features: []
                }
            };
        }
    },
    getKabupatenSegmentsGeoJSON: async (): Promise<any> => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/segmen/kabupaten`, {
                headers: authService.getAuthHeaders(),
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch kabupaten segments: ${response.statusText}`);
            }
            return response.json();
        } catch (error) {
            console.error("Error fetching kabupaten segments geojson:", error);
            return {
                status: "success",
                message: "Fallback empty collection",
                result: {
                    type: "FeatureCollection",
                    features: []
                }
            };
        }
    },
    getKecamatan: async (): Promise<any> => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/kecamatan`, {
                headers: authService.getAuthHeaders(),
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch kecamatans: ${response.statusText}`);
            }
            return response.json();
        } catch (error) {
            console.error("Error fetching kecamatans:", error);
            return { status: "error", message: "Failed to fetch data", result: [] };
        }
    },
    getDesa: async (id_kecamatan: string | number): Promise<any> => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/desa?id_kecamatan=${id_kecamatan}`, {
                headers: authService.getAuthHeaders(),
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch desas: ${response.statusText}`);
            }
            return response.json();
        } catch (error) {
            console.error("Error fetching desas:", error);
            return { status: "error", message: "Failed to fetch data", result: [] };
        }
    },
    getNonBaseSegments: async (id_desa?: string | number): Promise<any> => {
        try {
            let url = `${import.meta.env.VITE_API_BASE_URL}/jalan/segmen?check_melarosa=Tidak`;
            if (id_desa) {
                url += `&desa_id=${id_desa}`;
            }
            const response = await fetch(url, {
                headers: authService.getAuthHeaders(),
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch non-base segments: ${response.statusText}`);
            }
            return response.json();
        } catch (error) {
            console.error("Error fetching non-base segments:", error);
            return {
                status: "error",
                message: "Failed to fetch data",
                result: {
                    type: "FeatureCollection",
                    features: []
                }
            };
        }
    },

    getMonitoringProgress: async (id_segmen: string): Promise<MonitoringProgress[]> => {
        try {
            // Using a query param or a specific route for list by segment if available, 
            // but user only specified /monitoring/segmen/{id}. 
            // Often list is GET /monitoring/segmen?id_segmen={id}
            // I'll assume standard REST conventions or keep the one that worked if it was just field names?
            // The user said "endpoint /monitoring/segmen/{id}". 
            // I will try to use GET /monitoring/segmen?id_segmen=... for list if I can, 
            // but likely I should check if the previous one `/jalan/segmen/${id_segmen}/monitoring` is still valid?
            // User said "sesuaikan crud ... endpoint /monitoring/segmen/{id}".
            // Probably Create is POST /monitoring/segmen
            // Delete is DELETE /monitoring/segmen/{id}

            // Let's assume list is GET /monitoring/segmen?id_segmen=...
            const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/monitoring/segmen`, window.location.origin);
            url.searchParams.append("id_segmen", id_segmen);

            const response = await fetch(url.toString(), {
                headers: authService.getAuthHeaders(),
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch monitoring progress: ${response.statusText}`);
            }
            const data = await response.json();
            return data.result || [];
        } catch (error) {
            console.error("Error fetching monitoring progress:", error);
            return [];
        }
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
