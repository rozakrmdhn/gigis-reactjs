import { apiClient, type ApiResponse } from "~/lib/api-client";
import type { UserDetail } from "./user-manage.service";

export interface UpdateProfilePayload {
    nama?: string;
    email?: string;
    nip?: string;
    no_hp?: string;
    foto_url?: string;
    jabatan?: string;
}

export interface ChangePasswordPayload {
    password_lama: string;
    password_baru: string;
    konfirmasi_password: string;
}

const getBaseUrl = (): string => {
    if (typeof window !== "undefined" && (window as any)._env_?.VITE_API_BASE_URL) {
        return (window as any)._env_.VITE_API_BASE_URL;
    }
    return import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
};

export const profileService = {
    getProfile: async (): Promise<ApiResponse<UserDetail>> => {
        return apiClient.get<UserDetail>(`${getBaseUrl()}/v1/profile`);
    },
    updateProfile: async (payload: UpdateProfilePayload): Promise<ApiResponse<UserDetail>> => {
        return apiClient.put<UserDetail>(`${getBaseUrl()}/v1/profile`, payload);
    },
    changePassword: async (payload: ChangePasswordPayload): Promise<ApiResponse<any>> => {
        return apiClient.put<any>(`${getBaseUrl()}/v1/profile/password`, payload);
    }
};
