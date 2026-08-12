import { apiClient } from "~/lib/api-client";
import { authService } from "~/services/auth.service";
import type { MasterOpd } from "../types/usulan-desa.types";

const BASE_URL = `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "")}/v1/master/opd`;

export const masterOpdService = {
  getAll: async (filters?: { search?: string; active_only?: boolean }) => {
    const url = new URL(BASE_URL, window.location.origin);
    if (filters) {
      if (filters.search) url.searchParams.append("search", filters.search);
      if (filters.active_only !== undefined) {
        url.searchParams.append("active_only", filters.active_only.toString());
      }
    }
    
    const response = await apiClient.get<MasterOpd[]>(url.toString(), {
      headers: authService.getAuthHeaders(),
    });
    return response.result || [];
  },

  getById: async (id: string): Promise<MasterOpd | null> => {
    const response = await apiClient.get<MasterOpd>(`${BASE_URL}/${id}`, {
      headers: authService.getAuthHeaders(),
    });
    return response.result || null;
  },

  create: async (payload: { nama: string; kode: string; is_active?: boolean }): Promise<MasterOpd | null> => {
    const response = await apiClient.post<MasterOpd>(BASE_URL, payload, {
      headers: authService.getAuthHeaders(),
    });
    return response.result || null;
  },

  update: async (id: string, payload: { nama?: string; kode?: string; is_active?: boolean }): Promise<boolean> => {
    const response = await apiClient.put<MasterOpd>(`${BASE_URL}/${id}`, payload, {
      headers: authService.getAuthHeaders(),
    });
    return response.status === "success";
  },

  delete: async (id: string): Promise<boolean> => {
    const response = await apiClient.delete<void>(`${BASE_URL}/${id}`, {
      headers: authService.getAuthHeaders(),
    });
    return response.status === "success";
  },
};
