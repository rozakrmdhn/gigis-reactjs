import { apiClient, type ApiResponse } from '~/lib/api-client';

export interface FormRealisasi {
    id: string;
    judul: string;
    deskripsi?: string | null;
    tahun_anggaran: number;
    is_open: boolean;
    tanggal_buka?: string | null;
    tanggal_tutup?: string | null;
    opsi_fungsi?: Array<{ id: string; label: string }> | string[] | null;
    opsi_konstruksi?: Array<{ id: string; label: string }> | string[] | null;
    created_by?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface RealisasiTitik {
    id?: string;
    id_entry: string;
    tipe: 'start' | 'end';
    urutan: number;
    latitude: number;
    longitude: number;
    keterangan?: string | null;
}

export interface RealisasiEntry {
    id: string;
    id_form: string;
    id_desa?: string | null;
    id_kecamatan?: string | null;
    nama_desa?: string | null;
    nama_kecamatan?: string | null;
    nama_kegiatan: string;
    deskripsi?: string | null;
    volume?: string | null;
    anggaran?: number | string | null;
    fungsi_infrastruktur?: string[] | null;
    opsi_konstruksi?: string[] | null;
    status: 'draft' | 'submitted' | 'verified' | 'rejected';
    catatan_admin?: string | null;
    submitted_by?: string | null;
    submitted_at?: string | null;
    created_at?: string;
    updated_at?: string;
    form?: FormRealisasi;
    titik?: RealisasiTitik[];
}

export interface CreateFormPayload {
    judul: string;
    deskripsi?: string;
    tahun_anggaran: number;
    is_open: boolean;
    opsi_fungsi?: Array<{ id: string; label: string }>;
    opsi_konstruksi?: Array<{ id: string; label: string }>;
}

export interface CreateEntryPayload {
    id_form: string;
    nama_kegiatan: string;
    deskripsi?: string;
    volume?: string;
    anggaran?: number;
    fungsi_infrastruktur?: string[];
    opsi_konstruksi?: string[];
    id_desa?: number;
    id_kecamatan?: number;
    nama_desa?: string;
    nama_kecamatan?: string;
}

export interface RealisasiFilters {
    id_form?: string;
    id_desa?: string | number;
    id_kecamatan?: string | number;
    status?: string;
    tahun_anggaran?: string | number;
    page?: number;
    limit?: number;
}

const BASE_URL = `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}/v1`;
const FORM_BASE_URL = `${BASE_URL}/form-realisasi`;
const ENTRY_BASE_URL = `${BASE_URL}/form-realisasi/entry`;
const TITIK_BASE_URL = `${BASE_URL}/form-realisasi/titik`;

export const realisasiService = {
    // === FORM REALISASI API ===
    getAllForms: async (params?: { tahun_anggaran?: number | string; is_open?: boolean | string }): Promise<ApiResponse<FormRealisasi[]>> => {
        let url = FORM_BASE_URL;
        const qp = new URLSearchParams();
        if (params?.tahun_anggaran) qp.append('tahun_anggaran', String(params.tahun_anggaran));
        if (params?.is_open !== undefined) qp.append('is_open', String(params.is_open));
        const q = qp.toString();
        if (q) url += `?${q}`;
        return apiClient.get<FormRealisasi[]>(url);
    },

    getFormById: async (id: string): Promise<ApiResponse<FormRealisasi>> => {
        return apiClient.get<FormRealisasi>(`${FORM_BASE_URL}/${id}`);
    },

    createForm: async (payload: CreateFormPayload): Promise<ApiResponse<FormRealisasi>> => {
        return apiClient.post<FormRealisasi>(FORM_BASE_URL, payload, {
            successMessage: 'Form realisasi berhasil dibuat',
        });
    },

    updateForm: async (id: string, payload: Partial<CreateFormPayload>): Promise<ApiResponse<any>> => {
        return apiClient.put<any>(`${FORM_BASE_URL}/${id}`, payload, {
            successMessage: 'Form realisasi berhasil diperbarui',
        });
    },

    deleteForm: async (id: string): Promise<ApiResponse<any>> => {
        return apiClient.delete<any>(`${FORM_BASE_URL}/${id}`, {
            successMessage: 'Form realisasi berhasil dihapus',
        });
    },

    // === REALISASI ENTRY API ===
    getAllEntries: async (filters?: RealisasiFilters): Promise<ApiResponse<RealisasiEntry[]>> => {
        let url = ENTRY_BASE_URL;
        if (filters) {
            const qp = new URLSearchParams();
            Object.entries(filters).forEach(([key, val]) => {
                if (val !== undefined && val !== null && val !== '') {
                    if (key === 'limit' || key === 'page' || val !== 'all') {
                        qp.append(key, String(val));
                    }
                }
            });
            const q = qp.toString();
            if (q) url += `?${q}`;
        }
        return apiClient.get<RealisasiEntry[]>(url);
    },

    getEntryById: async (id: string): Promise<ApiResponse<RealisasiEntry>> => {
        return apiClient.get<RealisasiEntry>(`${ENTRY_BASE_URL}/${id}`);
    },

    createEntry: async (payload: CreateEntryPayload): Promise<ApiResponse<RealisasiEntry>> => {
        return apiClient.post<RealisasiEntry>(ENTRY_BASE_URL, payload, {
            successMessage: 'Entry realisasi berhasil dibuat',
        });
    },

    updateEntry: async (id: string, payload: Partial<CreateEntryPayload>): Promise<ApiResponse<any>> => {
        return apiClient.put<any>(`${ENTRY_BASE_URL}/${id}`, payload, {
            successMessage: 'Entry realisasi berhasil diperbarui',
        });
    },

    submitEntry: async (id: string): Promise<ApiResponse<any>> => {
        return apiClient.fetch<any>(`${ENTRY_BASE_URL}/${id}/submit`, {
            method: 'PATCH',
            showSuccessToast: true,
            successMessage: 'Entry realisasi berhasil disubmit',
        });
    },

    verifyEntry: async (id: string, payload: { status: 'verified' | 'rejected' | 'submitted'; catatan_admin?: string }): Promise<ApiResponse<any>> => {
        const successMsg = payload.status === 'submitted'
            ? 'Verifikasi laporan berhasil dibatalkan'
            : `Laporan realisasi berhasil di-${payload.status === 'verified' ? 'verifikasi' : 'tolak'}`;
        return apiClient.fetch<any>(`${ENTRY_BASE_URL}/${id}/verify`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
            showSuccessToast: true,
            successMessage: successMsg,
        });
    },

    deleteEntry: async (id: string): Promise<ApiResponse<any>> => {
        return apiClient.delete<any>(`${ENTRY_BASE_URL}/${id}`, {
            successMessage: 'Entry realisasi berhasil dihapus',
        });
    },

    // === REALISASI TITIK API ===
    addTitik: async (payload: Omit<RealisasiTitik, 'id'>): Promise<ApiResponse<RealisasiTitik>> => {
        return apiClient.post<RealisasiTitik>(TITIK_BASE_URL, payload, {
            showSuccessToast: false,
        });
    },

    getTitikByEntry: async (entryId: string, tipe?: 'start' | 'end'): Promise<ApiResponse<RealisasiTitik[]>> => {
        let url = `${TITIK_BASE_URL}/entry/${entryId}`;
        if (tipe) url += `?tipe=${encodeURIComponent(tipe)}`;
        return apiClient.get<RealisasiTitik[]>(url);
    },

    updateTitik: async (id: string, payload: Partial<Omit<RealisasiTitik, 'id' | 'id_entry'>>): Promise<ApiResponse<any>> => {
        return apiClient.put<any>(`${TITIK_BASE_URL}/${id}`, payload);
    },

    deleteTitik: async (id: string): Promise<ApiResponse<any>> => {
        return apiClient.delete<any>(`${TITIK_BASE_URL}/${id}`);
    },

    // === PUBLIC / ANONYMOUS APIS ===
    createEntryPublic: async (payload: any): Promise<ApiResponse<RealisasiEntry>> => {
        return apiClient.post<RealisasiEntry>(`${ENTRY_BASE_URL}/public`, payload, {
            successMessage: 'Laporan realisasi berhasil dibuat',
        });
    },

    getEntriesByIdsPublic: async (ids: string[]): Promise<ApiResponse<RealisasiEntry[]>> => {
        return apiClient.post<RealisasiEntry[]>(`${ENTRY_BASE_URL}/public/get-by-ids`, { ids });
    },

    getEntryByIdPublic: async (id: string): Promise<ApiResponse<RealisasiEntry>> => {
        return apiClient.get<RealisasiEntry>(`${ENTRY_BASE_URL}/public/${id}`);
    },

    updateEntryPublic: async (id: string, payload: any): Promise<ApiResponse<any>> => {
        return apiClient.put<any>(`${ENTRY_BASE_URL}/public/${id}`, payload, {
            successMessage: 'Laporan realisasi berhasil diperbarui',
        });
    },

    submitEntryPublic: async (id: string): Promise<ApiResponse<any>> => {
        return apiClient.fetch<any>(`${ENTRY_BASE_URL}/public/${id}/submit`, {
            method: 'PATCH',
            showSuccessToast: true,
            successMessage: 'Laporan realisasi berhasil dikirim',
        });
    },

    deleteEntryPublic: async (id: string): Promise<ApiResponse<any>> => {
        return apiClient.delete<any>(`${ENTRY_BASE_URL}/public/${id}`, {
            successMessage: 'Laporan realisasi berhasil dihapus',
        });
    },

    addTitikPublic: async (payload: Omit<RealisasiTitik, 'id'>): Promise<ApiResponse<RealisasiTitik>> => {
        return apiClient.post<RealisasiTitik>(`${TITIK_BASE_URL}/public`, payload, {
            showSuccessToast: false,
        });
    },

    getTitikByEntryPublic: async (entryId: string, tipe?: 'start' | 'end'): Promise<ApiResponse<RealisasiTitik[]>> => {
        let url = `${TITIK_BASE_URL}/public/entry/${entryId}`;
        if (tipe) url += `?tipe=${encodeURIComponent(tipe)}`;
        return apiClient.get<RealisasiTitik[]>(url);
    },

    updateTitikPublic: async (id: string, payload: Partial<Omit<RealisasiTitik, 'id' | 'id_entry'>>): Promise<ApiResponse<any>> => {
        return apiClient.put<any>(`${TITIK_BASE_URL}/public/${id}`, payload);
    },

    deleteTitikPublic: async (id: string): Promise<ApiResponse<any>> => {
        return apiClient.delete<any>(`${TITIK_BASE_URL}/public/${id}`);
    },

    getLaporanFormulirDesa: async (formId: string, params?: { id_kecamatan?: string }): Promise<ApiResponse<any>> => {
        let url = `${FORM_BASE_URL}/${formId}/laporan-desa`;
        if (params?.id_kecamatan) {
            url += `?id_kecamatan=${encodeURIComponent(params.id_kecamatan)}`;
        }
        return apiClient.get<any>(url);
    },

    checkPlottingDesa: async (id_desa: string | number, tahun_anggaran?: string | number): Promise<ApiResponse<any>> => {
        let url = `${BASE_URL}/plotting-anggaran?id_desa=${encodeURIComponent(id_desa)}`;
        if (tahun_anggaran) {
            url += `&tahun_anggaran=${encodeURIComponent(tahun_anggaran)}`;
        }
        return apiClient.get<any>(url);
    },
};
