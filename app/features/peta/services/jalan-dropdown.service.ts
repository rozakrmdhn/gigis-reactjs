import { type Jalan } from '../types';
import { apiClient } from '~/lib/api-client';

export const jalanDropdownService = {
    getJalan: async (params?: { page?: number; limit?: number; search?: string }): Promise<JalanResponse> => {
        const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/jalan`, window.location.origin);
        if (params?.page) url.searchParams.append("page", params.page.toString());
        if (params?.limit) url.searchParams.append("limit", params.limit.toString());
        if (params?.search) url.searchParams.append("nama_ruas", params.search);

        return await apiClient.get<JalanResponse>(url.toString());
    },

    getJalanById: async (id: string): Promise<Jalan | null> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/jalan/${id}`;
        const response = await apiClient.get<any>(url);
        return response.result || null;
    },
};

