import { apiClient } from '~/lib/api-client';

export interface Kecamatan {
    id: number;
    nama_kecamatan: string;
    created_at: string | null;
    updated_at: string | null;
}

export interface KecamatanResponse {
    status: string;
    message: string;
    result: Kecamatan[];
}

export const kecamatanService = {
    getKecamatan: async (): Promise<Kecamatan[]> => {
        const response = await apiClient.get<Kecamatan[]>(`${import.meta.env.VITE_API_BASE_URL}/kecamatan`);
        return response.result || [];
    },
};

