import { apiClient } from '~/lib/api-client';

export interface Basemap {
    id: string;
    name: string;
    url: string;
    attribution: string;
    thumbnail: string | null;
    is_active: boolean;
    description: string | null;
    order: number;
    cross_origin: string;
    created_at: string;
    updated_at: string;
}

export const basemapService = {
    getAll: async (activeOnly: boolean = false): Promise<Basemap[]> => {
        const query = activeOnly ? '?active_only=true' : '';
        const response = await apiClient.get(`${import.meta.env.VITE_API_BASE_URL}/v1/master/basemaps${query}`);
        return response.result || [];
    },

    getById: async (id: string): Promise<Basemap> => {
        const response = await apiClient.get(`${import.meta.env.VITE_API_BASE_URL}/v1/master/basemaps/${id}`);
        return response.result;
    },

    create: async (data: Partial<Basemap>): Promise<Basemap> => {
        const response = await apiClient.post(`${import.meta.env.VITE_API_BASE_URL}/v1/master/basemaps`, data);
        return response.result;
    },

    update: async (id: string, data: Partial<Basemap>): Promise<Basemap> => {
        const response = await apiClient.put(`${import.meta.env.VITE_API_BASE_URL}/v1/master/basemaps/${id}`, data);
        return response.result;
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`${import.meta.env.VITE_API_BASE_URL}/v1/master/basemaps/${id}`);
    }
};
