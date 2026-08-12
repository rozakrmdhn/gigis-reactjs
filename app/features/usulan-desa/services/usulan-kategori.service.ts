import { apiClient } from "~/lib/api-client";
import { authService } from "~/services/auth.service";
import type { UsulanKategori, UsulanKategoriFilters } from "../types/usulan-kategori.types";

const BASE_URL = `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "")}/v1/usulan-kategori`;

export const usulanKategoriService = {
  getAll: async (filters?: UsulanKategoriFilters): Promise<UsulanKategori[]> => {
    const url = new URL(BASE_URL, window.location.origin);
    if (filters) {
      if (filters.page) url.searchParams.append("page", filters.page.toString());
      if (filters.limit) url.searchParams.append("limit", filters.limit.toString());
      if (filters.search) url.searchParams.append("search", filters.search);
      if (filters.all !== undefined) url.searchParams.append("all", filters.all.toString());
      if (filters.is_active !== undefined && filters.is_active !== "all") {
        url.searchParams.append("is_active", filters.is_active.toString());
      }
    }
    
    const response = await apiClient.get<UsulanKategori[]>(url.toString(), {
      headers: authService.getAuthHeaders(),
    });
    return response.result || [];
  },

  getById: async (id: string): Promise<UsulanKategori | null> => {
    const response = await apiClient.get<UsulanKategori>(`${BASE_URL}/${id}`, {
      headers: authService.getAuthHeaders(),
    });
    return response.result || null;
  },

  create: async (payload: { nama: string; kode?: string; deskripsi?: string; opd_id?: string; is_active?: boolean }): Promise<UsulanKategori | null> => {
    const response = await apiClient.post<UsulanKategori>(BASE_URL, payload, {
      headers: authService.getAuthHeaders(),
    });
    return response.result || null;
  },

  update: async (id: string, payload: { nama?: string; kode?: string; deskripsi?: string; opd_id?: string; is_active?: boolean }): Promise<boolean> => {
    const response = await apiClient.put<UsulanKategori>(`${BASE_URL}/${id}`, payload, {
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
