import { apiClient, type ApiResponse } from '~/lib/api-client';

export interface PermissionDetail {
    id: string;
    role: string;
    action: string;
    subject: string;
    conditions: Record<string, any> | null;
    created_at?: string;
    updated_at?: string;
}

export const permissionService = {
    getPermissions: async (): Promise<ApiResponse<PermissionDetail[]>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/master/permissions`;
        return apiClient.get<PermissionDetail[]>(url);
    },

    createPermission: async (payload: Omit<PermissionDetail, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<PermissionDetail>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/master/permissions`;
        return apiClient.post<PermissionDetail>(url, payload);
    },

    updatePermission: async (id: string, payload: Omit<PermissionDetail, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<PermissionDetail>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/master/permissions/${encodeURIComponent(id)}`;
        return apiClient.put<PermissionDetail>(url, payload);
    },

    deletePermission: async (id: string): Promise<ApiResponse<any>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/master/permissions/${encodeURIComponent(id)}`;
        return apiClient.delete(url);
    }
};
