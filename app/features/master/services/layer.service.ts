import { apiClient } from '~/lib/api-client';

export interface Layer {
    id: string;
    name: string;
    protocol: 'OGC:WMS' | 'OGC:WFS' | 'XYZ';
    source_type: 'internal' | 'external';
    is_synced: boolean;
    url: string;
    layer_name: string | null;
    is_active: boolean;
    default_visible: boolean;
    opacity: number;
    order: number;
    attribution: string | null;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export const layerService = {
    getAll: async (activeOnly: boolean = false): Promise<Layer[]> => {
        const query = activeOnly ? '?active_only=true' : '';
        const response = await apiClient.get(`${import.meta.env.VITE_API_BASE_URL}/v1/layers${query}`);
        return response.result || [];
    },

    getById: async (id: string): Promise<Layer> => {
        const response = await apiClient.get(`${import.meta.env.VITE_API_BASE_URL}/v1/layers/${id}`);
        return response.result;
    },

    create: async (data: Partial<Layer>): Promise<Layer> => {
        const response = await apiClient.post(`${import.meta.env.VITE_API_BASE_URL}/v1/layers`, data);
        return response.result;
    },

    update: async (id: string, data: Partial<Layer>): Promise<Layer> => {
        const response = await apiClient.put(`${import.meta.env.VITE_API_BASE_URL}/v1/layers/${id}`, data);
        return response.result;
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`${import.meta.env.VITE_API_BASE_URL}/v1/layers/${id}`);
    },

    syncCSW: async (): Promise<{ status: string; message: string }> => {
        const response = await apiClient.post(`${import.meta.env.VITE_API_BASE_URL}/v1/layers/sync-csw`, {});
        return response;
    }
};
