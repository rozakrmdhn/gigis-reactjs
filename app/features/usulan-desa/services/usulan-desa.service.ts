import { apiClient, type ApiResponse } from '~/lib/api-client';
import { authService } from '~/services/auth.service';
import type {
    UsulanDesa,
    CreateUsulanDesaPayload,
    UpdateUsulanDesaPayload,
    UsulanDesaFilters,
} from '../types/usulan-desa.types';

const BASE_URL = `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}/v1/usulan-desa`;

export const usulanDesaService = {
    getAll: async (filters?: UsulanDesaFilters): Promise<ApiResponse<UsulanDesa[]>> => {
        const url = new URL(BASE_URL, window.location.origin);
        if (filters?.status && filters.status !== 'all') {
            url.searchParams.append('status', filters.status);
        }
        if (filters?.tahun_anggaran && filters.tahun_anggaran !== 'all') {
            url.searchParams.append('tahun_anggaran', String(filters.tahun_anggaran));
        }
        if (filters?.jenis_usulan && filters.jenis_usulan !== 'all') {
            url.searchParams.append('jenis_usulan', filters.jenis_usulan);
        }
        if (filters?.id_desa && filters.id_desa !== 'all') {
            url.searchParams.append('id_desa', String(filters.id_desa));
        }
        if (filters?.id_kecamatan && filters.id_kecamatan !== 'all') {
            url.searchParams.append('id_kecamatan', String(filters.id_kecamatan));
        }
        if (filters?.nama_desa) {
            url.searchParams.append('nama_desa', filters.nama_desa);
        }
        if (filters?.nama_kecamatan) {
            url.searchParams.append('nama_kecamatan', filters.nama_kecamatan);
        }
        if (filters?.nomor_surat) {
            url.searchParams.append('nomor_surat', filters.nomor_surat);
        }
        if (filters?.tanggal_surat_from) {
            url.searchParams.append('tanggal_surat_from', filters.tanggal_surat_from);
        }
        if (filters?.tanggal_surat_to) {
            url.searchParams.append('tanggal_surat_to', filters.tanggal_surat_to);
        }
        if (filters?.page !== undefined) {
            url.searchParams.append('page', String(filters.page));
        }
        if (filters?.limit !== undefined) {
            url.searchParams.append('limit', String(filters.limit));
        }
        if (filters?.sortBy) {
            url.searchParams.append('sortBy', filters.sortBy);
        }
        if (filters?.order) {
            url.searchParams.append('order', filters.order);
        }
        const response = await apiClient.get<UsulanDesa[]>(url.toString(), {
            headers: authService.getAuthHeaders(),
        });
        return response;
    },

    getById: async (id: number | string): Promise<UsulanDesa | null> => {
        const response = await apiClient.get<UsulanDesa>(`${BASE_URL}/${id}`, {
            headers: authService.getAuthHeaders(),
        });
        return response.result || response.data || null;
    },

    create: async (payload: CreateUsulanDesaPayload): Promise<UsulanDesa | null> => {
        const response = await apiClient.post<UsulanDesa>(BASE_URL, payload, {
            successMessage: 'Usulan berhasil ditambahkan',
        });
        return response.result || response.data || null;
    },

    update: async (id: number | string, payload: UpdateUsulanDesaPayload): Promise<UsulanDesa | null> => {
        const response = await apiClient.put<UsulanDesa>(`${BASE_URL}/${id}`, payload, {
            successMessage: 'Usulan berhasil diperbarui',
        });
        return response.result || response.data || null;
    },

    patch: async (id: number | string, payload: Partial<UpdateUsulanDesaPayload>): Promise<UsulanDesa | null> => {
        const response = await apiClient.patch<UsulanDesa>(`${BASE_URL}/${id}`, payload, {
            successMessage: 'Usulan berhasil diperbarui',
        });
        return response.result || response.data || null;
    },

    remove: async (id: number | string): Promise<boolean> => {
        await apiClient.delete(`${BASE_URL}/${id}`, {
            successMessage: 'Usulan berhasil dihapus',
        });
        return true;
    },

    getJenisUsulanList: (): string[] => {
        return [
            "Jalan",
            "Jembatan",
            "Drainase",
            "TPT",
            "Jalan Lingkungan"
        ];
    }
};
