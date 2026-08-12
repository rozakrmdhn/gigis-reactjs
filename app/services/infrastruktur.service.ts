import { apiClient } from '~/lib/api-client';
import type { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

// --- Type Definitions ---
export interface InfrastrukturTipe {
    id: string;
    kode: string;          // 'jalan', 'jalan_lingkungan', 'jembatan', 'drainase'
    nama: string;          // 'Jalan Poros Desa', 'Jalan Lingkungan Desa'
    deskripsi?: string;
    ikon: string;          // 'road', 'path', 'bridge', 'droplets' (Lucide Icon name)
    warna: string;         // '#3B82F6', '#10B981', '#EF4444'
    geom_type: 'LINESTRING' | 'POINT' | 'POLYGON';
    table_name: string;
    has_segmen: boolean;
    is_active?: boolean;
    sort_order: number;
    config?: Record<string, any>;
}

export interface InfrastrukturAset {
    id: string;
    nama_ruas?: string;
    nama_jalan?: string;
    desa?: string;
    kecamatan?: string;
    id_desa?: number;
    id_kecamatan?: number;
    panjang?: number;
    lebar?: number;
    kondisi?: string;
    perkerasan?: string;
    sumber_data?: string;
    created_at?: string;
    updated_at?: string;
    [key: string]: any;
}

export interface InfrastrukturSegmen {
    id: string;
    tipe_kode: string;
    parent_id: string;
    panjang?: number;
    lebar?: number;
    kondisi?: string;
    status_kondisi?: string;
    status_verifikasi?: 'verifikasi_kecamatan' | 'verifikasi_bappeda' | 'terverifikasi' | 'ditolak_bappeda';
    catatan_verifikasi?: string;
    id_entry?: string;
    tahun_pembangunan?: number;
    sumber_dana?: string;
    keterangan?: string;
    foto_url?: string;
    atribut?: Record<string, any>; // JSONB atribut khusus per-tipe
    desa?: string;
    kecamatan?: string;
    created_at?: string;
    updated_at?: string;
}

export interface InfrastrukturArea {
    id: string;
    tipe_kode: string;
    parent_id?: string | null;
    namobj?: string;
    panjang?: number;
    lebar?: number;
    kondisi?: string;
    status_kondisi?: string;
    tahun_pembangunan?: number;
    sumber_dana?: string;
    sumber_data?: string;
    status_parent?: boolean;
    keterangan?: string;
    foto_url?: string;
    atribut?: Record<string, any>;
    desa?: string;
    kecamatan?: string;
    id_desa?: number;
    id_kecamatan?: number;
    created_at?: string;
    updated_at?: string;
}

export interface MonitoringLog {
    id: string;
    segmen_id: string;
    tanggal: string;
    progres: number;
    catatan?: string;
    user_id?: number;
    Creator?: {
        id: number;
        nama?: string;
        email?: string;
    };
    created_at?: string;
    updated_at?: string;
}

// --- Service Object ---
const getBaseUrl = () => import.meta.env.VITE_API_BASE_URL || '';

export const infrastrukturService = {
    /** Fetch daftar tipe infrastruktur aktif (Registry) */
    getTipeList: async (): Promise<InfrastrukturTipe[]> => {
        const response = await apiClient.get<InfrastrukturTipe[]>(`${getBaseUrl()}/v1/infrastruktur`);
        return response.result || [];
    },

    /** Fetch master aset GeoJSON per-tipe */
    getGeoJSON: async (
        tipe: string,
        params?: { id_kecamatan?: string | number; id_desa?: string | number; search?: string }
    ): Promise<FeatureCollection<Geometry, GeoJsonProperties> | null> => {
        const url = new URL(`${getBaseUrl()}/v1/infrastruktur/${tipe}`, window.location.origin);
        url.searchParams.append("format", "geojson");
        if (params?.id_kecamatan) url.searchParams.append("id_kecamatan", params.id_kecamatan.toString());
        if (params?.id_desa) url.searchParams.append("id_desa", params.id_desa.toString());
        if (params?.search) url.searchParams.append("search", params.search);

        const response = await apiClient.get<any>(url.toString(), { showErrorToast: false });
        return response.result || null;
    },

    /** Fetch detail master aset berdasarkan ID */
    getById: async (tipe: string, id: string): Promise<InfrastrukturAset | null> => {
        const response = await apiClient.get<InfrastrukturAset>(`${getBaseUrl()}/v1/infrastruktur/${tipe}/${id}`);
        return response.result || null;
    },

    /** Create master aset baru */
    createAset: async (tipe: string, data: Partial<InfrastrukturAset>): Promise<any> => {
        return await apiClient.post(`${getBaseUrl()}/v1/infrastruktur/${tipe}`, data, {
            successMessage: "Aset infrastruktur berhasil ditambahkan!",
            errorMessage: "Gagal menambahkan aset infrastruktur"
        });
    },

    /** Update master aset */
    updateAset: async (tipe: string, id: string, data: Partial<InfrastrukturAset>): Promise<any> => {
        return await apiClient.put(`${getBaseUrl()}/v1/infrastruktur/${tipe}/${id}`, data, {
            successMessage: "Aset infrastruktur berhasil diperbarui!",
            errorMessage: "Gagal memperbarui aset infrastruktur"
        });
    },

    /** Delete master aset */
    deleteAset: async (tipe: string, id: string): Promise<any> => {
        return await apiClient.delete(`${getBaseUrl()}/v1/infrastruktur/${tipe}/${id}`, {
            successMessage: "Aset infrastruktur berhasil dihapus!",
            errorMessage: "Gagal menghapus aset infrastruktur"
        });
    },

    /** Fetch SELURUH segmen GeoJSON per-tipe (misal: /v1/infrastruktur/jalan_lingkungan/segmen?format=geojson) */
    getAllSegmenGeoJSON: async (
        tipe: string,
        params?: { id_kecamatan?: string | number; id_desa?: string | number; kondisi?: string; status_verifikasi?: string }
    ): Promise<FeatureCollection<Geometry, GeoJsonProperties> | null> => {
        const url = new URL(`${getBaseUrl()}/v1/infrastruktur/${tipe}/segmen`, window.location.origin);
        url.searchParams.append("format", "geojson");
        if (params?.id_kecamatan) url.searchParams.append("id_kecamatan", params.id_kecamatan.toString());
        if (params?.id_desa) url.searchParams.append("id_desa", params.id_desa.toString());
        if (params?.kondisi) url.searchParams.append("kondisi", params.kondisi);
        if (params?.status_verifikasi) url.searchParams.append("status_verifikasi", params.status_verifikasi);

        const response = await apiClient.get<any>(url.toString(), { showErrorToast: false });
        return response.result || null;
    },

    /** Fetch segmen GeoJSON untuk master aset tertentu */
    getSegmenGeoJSON: async (tipe: string, parentId: string): Promise<FeatureCollection<Geometry, GeoJsonProperties> | null> => {
        const response = await apiClient.get<any>(
            `${getBaseUrl()}/v1/infrastruktur/${tipe}/${parentId}/segmen?format=geojson`,
            { showErrorToast: false }
        );
        return response.result || null;
    },

    /** Create segmen fisik baru */
    createSegmen: async (tipe: string, parentId: string, data: Partial<InfrastrukturSegmen>): Promise<any> => {
        const endpoint = parentId && parentId !== '0'
            ? `${getBaseUrl()}/v1/infrastruktur/${tipe}/${parentId}/segmen`
            : `${getBaseUrl()}/v1/infrastruktur/${tipe}/segmen`;

        return await apiClient.post(endpoint, data, {
            successMessage: "Segmen fisik berhasil disimpan!",
            errorMessage: "Gagal menyimpan segmen fisik"
        });
    },

    /** Update segmen fisik */
    updateSegmen: async (tipe: string, parentId: string, segmenId: string, data: Partial<InfrastrukturSegmen>): Promise<any> => {
        const endpoint = parentId && parentId !== '0'
            ? `${getBaseUrl()}/v1/infrastruktur/${tipe}/${parentId}/segmen/${segmenId}`
            : `${getBaseUrl()}/v1/infrastruktur/${tipe}/segmen/${segmenId}`;

        return await apiClient.put(endpoint, data, {
            successMessage: "Segmen fisik berhasil diperbarui!",
            errorMessage: "Gagal memperbarui segmen fisik"
        });
    },

    /** Delete segmen fisik */
    deleteSegmen: async (tipe: string, parentId: string, segmenId: string): Promise<any> => {
        const endpoint = parentId && parentId !== '0'
            ? `${getBaseUrl()}/v1/infrastruktur/${tipe}/${parentId}/segmen/${segmenId}`
            : `${getBaseUrl()}/v1/infrastruktur/${tipe}/segmen/${segmenId}`;

        return await apiClient.delete(endpoint, {
            successMessage: "Segmen fisik berhasil dihapus!",
            errorMessage: "Gagal menghapus segmen fisik"
        });
    },

    /** Kirim hasil digitasi segmen dari Kecamatan ke Bappeda */
    submitSegmenToBappeda: async (tipe: string, segmenId: string): Promise<any> => {
        return await apiClient.put(
            `${getBaseUrl()}/v1/infrastruktur/${tipe}/segmen/${segmenId}/submit-bappeda`,
            {},
            {
                successMessage: "Hasil digitasi segmen berhasil dikirim ke Bappeda!",
                errorMessage: "Gagal mengirimkan segmen ke Bappeda"
            }
        );
    },

    /** Verifikasi & Approve segmen oleh Bappeda */
    approveSegmenByBappeda: async (
        tipe: string,
        segmenId: string,
        data?: { status_verifikasi?: string; catatan_verifikasi?: string }
    ): Promise<any> => {
        return await apiClient.put(
            `${getBaseUrl()}/v1/infrastruktur/${tipe}/segmen/${segmenId}/approve-bappeda`,
            data || { status_verifikasi: 'terverifikasi' },
            {
                successMessage: "Verifikasi segmen Bappeda berhasil diproses!",
                errorMessage: "Gagal memproses verifikasi segmen Bappeda"
            }
        );
    },

    /** Fetch SELURUH area polygon GeoJSON per-tipe (misal: /v1/infrastruktur/jalan/area?format=geojson) */
    getAllAreaGeoJSON: async (
        tipe: string,
        params?: { id_kecamatan?: string | number; id_desa?: string | number; kondisi?: string }
    ): Promise<FeatureCollection<Geometry, GeoJsonProperties> | null> => {
        const url = new URL(`${getBaseUrl()}/v1/infrastruktur/${tipe}/area`, window.location.origin);
        url.searchParams.append("format", "geojson");
        if (params?.id_kecamatan) url.searchParams.append("id_kecamatan", params.id_kecamatan.toString());
        if (params?.id_desa) url.searchParams.append("id_desa", params.id_desa.toString());
        if (params?.kondisi) url.searchParams.append("kondisi", params.kondisi);

        const response = await apiClient.get<any>(url.toString(), { showErrorToast: false });
        return response.result || null;
    },

    /** Fetch area GeoJSON untuk master aset tertentu */
    getAreaGeoJSON: async (tipe: string, parentId: string): Promise<FeatureCollection<Geometry, GeoJsonProperties> | null> => {
        const response = await apiClient.get<any>(
            `${getBaseUrl()}/v1/infrastruktur/${tipe}/${parentId}/area?format=geojson`,
            { showErrorToast: false }
        );
        return response.result || null;
    },

    /** Create area polygon baru */
    createArea: async (tipe: string, parentId: string | null, data: Partial<InfrastrukturArea>): Promise<any> => {
        const endpoint = parentId && parentId !== '0'
            ? `${getBaseUrl()}/v1/infrastruktur/${tipe}/${parentId}/area`
            : `${getBaseUrl()}/v1/infrastruktur/${tipe}/area`;

        return await apiClient.post(endpoint, data, {
            successMessage: "Area infrastruktur berhasil disimpan!",
            errorMessage: "Gagal menyimpan area infrastruktur"
        });
    },

    /** Update area polygon */
    updateArea: async (tipe: string, parentId: string | null, areaId: string, data: Partial<InfrastrukturArea>): Promise<any> => {
        const endpoint = parentId && parentId !== '0'
            ? `${getBaseUrl()}/v1/infrastruktur/${tipe}/${parentId}/area/${areaId}`
            : `${getBaseUrl()}/v1/infrastruktur/${tipe}/area/${areaId}`;

        return await apiClient.put(endpoint, data, {
            successMessage: "Area infrastruktur berhasil diperbarui!",
            errorMessage: "Gagal memperbarui area infrastruktur"
        });
    },

    /** Delete area polygon */
    deleteArea: async (tipe: string, parentId: string | null, areaId: string): Promise<any> => {
        const endpoint = parentId && parentId !== '0'
            ? `${getBaseUrl()}/v1/infrastruktur/${tipe}/${parentId}/area/${areaId}`
            : `${getBaseUrl()}/v1/infrastruktur/${tipe}/area/${areaId}`;

        return await apiClient.delete(endpoint, {
            successMessage: "Area infrastruktur berhasil dihapus!",
            errorMessage: "Gagal menghapus area infrastruktur"
        });
    },

    /** Fetch log riwayat monitoring untuk segmen tertentu */
    getRiwayat: async (tipe: string, parentId: string, segmenId: string): Promise<MonitoringLog[]> => {
        const response = await apiClient.get<MonitoringLog[]>(
            `${getBaseUrl()}/v1/infrastruktur/${tipe}/${parentId}/segmen/${segmenId}/riwayat`
        );
        return response.result || [];
    },

    /** Create log riwayat progres monitoring baru */
    createRiwayat: async (
        tipe: string,
        parentId: string,
        segmenId: string,
        data: { tanggal: string; progres: number; catatan?: string }
    ): Promise<any> => {
        return await apiClient.post(
            `${getBaseUrl()}/v1/infrastruktur/${tipe}/${parentId}/segmen/${segmenId}/riwayat`,
            data,
            {
                successMessage: "Progres monitoring berhasil dicatat!",
                errorMessage: "Gagal mencatat progres monitoring"
            }
        );
    },

    /** Update log riwayat progres monitoring */
    updateRiwayat: async (
        tipe: string,
        parentId: string,
        segmenId: string,
        riwayatId: string,
        data: { tanggal?: string; progres?: number; catatan?: string }
    ): Promise<any> => {
        return await apiClient.put(
            `${getBaseUrl()}/v1/infrastruktur/${tipe}/${parentId}/segmen/${segmenId}/riwayat/${riwayatId}`,
            data,
            {
                successMessage: "Progres monitoring berhasil diperbarui!",
                errorMessage: "Gagal memperbarui progres monitoring"
            }
        );
    },

    /** Delete log riwayat progres monitoring */
    deleteRiwayat: async (
        tipe: string,
        parentId: string,
        segmenId: string,
        riwayatId: string
    ): Promise<any> => {
        return await apiClient.delete(
            `${getBaseUrl()}/v1/infrastruktur/${tipe}/${parentId}/segmen/${segmenId}/riwayat/${riwayatId}`,
            {
                successMessage: "Progres monitoring berhasil dihapus!",
                errorMessage: "Gagal menghapus progres monitoring"
            }
        );
    },

    /** Ambil semua tipe infrastruktur untuk admin (termasuk yang tidak aktif) */
    getAllTipeAdmin: async (): Promise<InfrastrukturTipe[]> => {
        const response = await apiClient.get<any>(`${getBaseUrl()}/v1/manage/infrastruktur-tipe`);
        return response.result || [];
    },

    /** Ambil detail satu tipe infrastruktur berdasarkan ID untuk admin */
    getTipeByIdAdmin: async (id: string): Promise<InfrastrukturTipe | null> => {
        const response = await apiClient.get<any>(`${getBaseUrl()}/v1/manage/infrastruktur-tipe/${id}`);
        return response.result || null;
    },

    /** Buat tipe infrastruktur baru */
    createTipe: async (payload: CreateInfrastrukturTipePayload): Promise<InfrastrukturTipe> => {
        const response = await apiClient.post<any>(`${getBaseUrl()}/v1/manage/infrastruktur-tipe`, payload, {
            successMessage: "Tipe infrastruktur berhasil dibuat!",
            errorMessage: "Gagal membuat tipe infrastruktur"
        });
        return response.result;
    },

    /** Edit tipe infrastruktur */
    updateTipe: async (id: string, payload: Partial<CreateInfrastrukturTipePayload>): Promise<InfrastrukturTipe> => {
        const response = await apiClient.put<any>(`${getBaseUrl()}/v1/manage/infrastruktur-tipe/${id}`, payload, {
            successMessage: "Tipe infrastruktur berhasil diperbarui!",
            errorMessage: "Gagal memperbarui tipe infrastruktur"
        });
        return response.result;
    },

    /** Hapus tipe infrastruktur */
    deleteTipe: async (id: string): Promise<any> => {
        return await apiClient.delete(`${getBaseUrl()}/v1/manage/infrastruktur-tipe/${id}`, {
            successMessage: "Tipe infrastruktur berhasil dihapus!",
            errorMessage: "Gagal menghapus tipe infrastruktur"
        });
    }
};

export interface CreateInfrastrukturTipePayload {
    kode: string;
    nama: string;
    deskripsi?: string | null;
    ikon?: string;
    warna?: string;
    geom_type?: 'LINESTRING' | 'POINT' | 'POLYGON';
    table_name: string;
    has_segmen?: boolean;
    is_active?: boolean;
    sort_order?: number;
    config?: Record<string, any>;
}

export const monitoringService = infrastrukturService;
