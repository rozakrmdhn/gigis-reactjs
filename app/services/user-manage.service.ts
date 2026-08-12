import { apiClient, type ApiResponse } from '~/lib/api-client';

export interface UserDetail {
    id: string | number;
    nama: string;
    email: string;
    role: 'super_admin' | 'operator_bappeda' | 'operator_kecamatan' | 'operator_desa' | string;
    id_kecamatan: number | null;
    id_desa: number | null;
    nip?: string | null;
    no_hp?: string | null;
    jabatan?: string | null;
    created_at?: string;
    updated_at?: string;
    status?: 'active' | 'pending' | 'inactive';
    kecamatan?: {
        id: number;
        nama_kecamatan: string;
    } | null;
    desa?: {
        id: number;
        nama_desa: string;
    } | null;
}

export interface RoleDetail {
    id: 'super_admin' | 'operator_bappeda' | 'operator_kecamatan' | 'operator_desa' | string;
    name: string;
    description: string;
}

export const userManageService = {
    getUsers: async (params?: { search?: string; page?: number; limit?: number }): Promise<ApiResponse<UserDetail[]>> => {
        const searchParams = new URLSearchParams();
        if (params?.search) searchParams.append('search', params.search);
        if (params?.page) searchParams.append('page', params.page.toString());
        if (params?.limit) searchParams.append('limit', params.limit.toString());

        const queryStr = searchParams.toString();
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/master/users${queryStr ? `?${queryStr}` : ''}`;
        return apiClient.get<UserDetail[]>(url);
    },

    getUserById: async (id: string | number): Promise<ApiResponse<UserDetail>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/master/users/${encodeURIComponent(id.toString())}`;
        return apiClient.get<UserDetail>(url);
    },

    createUser: async (payload: any): Promise<ApiResponse<UserDetail>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/master/users`;
        return apiClient.post<UserDetail>(url, payload);
    },

    updateUser: async (id: string | number, payload: any): Promise<ApiResponse<UserDetail>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/master/users/${encodeURIComponent(id.toString())}`;
        return apiClient.put<UserDetail>(url, payload);
    },

    deleteUser: async (id: string | number): Promise<ApiResponse<any>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/master/users/${encodeURIComponent(id.toString())}`;
        return apiClient.delete(url);
    },

    getRoles: async (): Promise<ApiResponse<RoleDetail[]>> => {
        const url = `${import.meta.env.VITE_API_BASE_URL}/v1/master/roles`;
        return apiClient.get<RoleDetail[]>(url);
    }
};
