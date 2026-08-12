import { apiClient, type ApiResponse } from '~/lib/api-client';

export interface RoleDetail {
    id: string;
    name: string;
    description: string | null;
    created_at?: string;
    updated_at?: string;
}

export const roleService = {
    getRoles: async (): Promise<ApiResponse<RoleDetail[]>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/master/roles`;
        return apiClient.get<RoleDetail[]>(url);
    },

    createRole: async (payload: Omit<RoleDetail, 'created_at' | 'updated_at'>): Promise<ApiResponse<RoleDetail>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/master/roles`;
        return apiClient.post<RoleDetail>(url, payload);
    },

    updateRole: async (id: string, payload: Omit<RoleDetail, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<RoleDetail>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/master/roles/${encodeURIComponent(id)}`;
        return apiClient.put<RoleDetail>(url, payload);
    },

    deleteRole: async (id: string): Promise<ApiResponse<any>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/master/roles/${encodeURIComponent(id)}`;
        return apiClient.delete(url);
    }
};
