import { type Jalan } from '../types';
import { apiClient, type ApiResponse } from '~/lib/api-client';

export const jalanDropdownService = {
    getJalan: async (params?: { page?: number; limit?: number; search?: string } | string): Promise<Jalan[]> => {
        const queryParams = typeof params === 'string' ? { search: params } : params;
        const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/v1/jalan`, window.location.origin);
        if (queryParams?.page) url.searchParams.append("page", queryParams.page.toString());
        if (queryParams?.limit) url.searchParams.append("limit", queryParams.limit.toString());
        if (queryParams?.search) url.searchParams.append("nama_ruas", queryParams.search);

        const response = await apiClient.get<Jalan[]>(url.toString());
        return response.result || [];
    },

    getJalanById: async (id: string): Promise<Jalan | null> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/jalan/${id}`;
        const response = await apiClient.get<any>(url);
        return response.result || null;
    },

    getSegmenByJalanId: async (jalanId: string): Promise<any | null> => {
        try {
            const response = await apiClient.get(
                `${import.meta.env.VITE_API_BASE_URL}/v1/jalan/${jalanId}/segmen?format=geojson`,
                { showErrorToast: false }
            );
            // API wraps GeoJSON FeatureCollection inside { result: ... }
            return response.result || null;
        } catch {
            return null;
        }
    },
};
