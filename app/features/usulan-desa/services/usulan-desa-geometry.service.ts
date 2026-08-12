import { apiClient } from '~/lib/api-client';
import { authService } from '~/services/auth.service';
import type {
    UsulanDesaGeometry,
    CreateGeometryPayload,
    UpdateGeometryPayload,
} from '../types/usulan-desa.types';

const BASE_URL = `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}/v1/usulan-desa/geometry`;

export const usulanDesaGeometryService = {
    /**
     * Ambil semua geometry milik satu usulan desa
     */
    getByUsulanId: async (idUsulanDesa: number | string): Promise<UsulanDesaGeometry[]> => {
        const response = await apiClient.get<UsulanDesaGeometry[]>(
            `${BASE_URL}/by-usulan/${idUsulanDesa}`,
            { headers: authService.getAuthHeaders() }
        );
        return response.result || response.data || [];
    },

    /**
     * Tambah geometry baru
     */
    create: async (payload: CreateGeometryPayload): Promise<UsulanDesaGeometry | null> => {
        const response = await apiClient.post<UsulanDesaGeometry>(BASE_URL, payload, {
            successMessage: 'Geometry berhasil ditambahkan',
        });
        return response.result || response.data || null;
    },

    /**
     * Update keterangan geometry
     */
    update: async (geometryId: number | string, payload: UpdateGeometryPayload): Promise<boolean> => {
        await apiClient.put<any>(
            `${BASE_URL}/${geometryId}`,
            payload,
            { successMessage: 'Geometry berhasil diperbarui' }
        );
        return true;
    },

    /**
     * Hapus geometry by ID
     */
    remove: async (geometryId: number | string): Promise<boolean> => {
        await apiClient.delete(`${BASE_URL}/${geometryId}`, {
            successMessage: 'Geometry berhasil dihapus',
        });
        return true;
    },
};
