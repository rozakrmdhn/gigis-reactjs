import { apiClient } from "~/lib/api-client";
import { authService } from "~/services/auth.service";
import type { VerifikasiAssignment, VerifikasiHistory, UsulanKategori, VerifikasiStatus } from "../types/usulan-desa.types";

const BASE_URL = `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "")}/v1`;

export const verifikasiService = {
  assignOpd: async (payload: { usulan_id: string; opd_ids: string[] }): Promise<VerifikasiAssignment[] | null> => {
    const response = await apiClient.post<VerifikasiAssignment[]>(`${BASE_URL}/usulan-desa/verifikasi/assign`, payload, {
      headers: authService.getAuthHeaders(),
    });
    return response.result || null;
  },

  updateAssignment: async (assignmentId: string, payload: {
    nomor_dokumen_pengantar?: string;
    tanggal_dokumen_pengantar?: string;
    url_dokumen_pengantar?: string;
    status_terakhir?: VerifikasiStatus;
  }): Promise<VerifikasiAssignment | null> => {
    const response = await apiClient.put<VerifikasiAssignment>(`${BASE_URL}/usulan-desa/verifikasi/assignment/${assignmentId}`, payload, {
      headers: authService.getAuthHeaders(),
    });
    return response.result || null;
  },

  patchAssignment: async (assignmentId: string, payload: {
    nomor_dokumen_pengantar?: string;
    tanggal_dokumen_pengantar?: string;
    url_dokumen_pengantar?: string;
    status_terakhir?: VerifikasiStatus;
    volume_verifikasi?: string;
    anggaran_verifikasi?: number;
    nomor_dokumen_verifikasi?: string;
    tanggal_dokumen_verifikasi?: string;
    url_dokumen_verifikasi?: string;
  }): Promise<VerifikasiAssignment | null> => {
    const response = await apiClient.patch<VerifikasiAssignment>(`${BASE_URL}/usulan-desa/verifikasi/assignment/${assignmentId}`, payload, {
      headers: authService.getAuthHeaders(),
    });
    return response.result || null;
  },

  patchHistory: async (historyId: string, payload: {
    status?: VerifikasiStatus;
    catatan?: string;
    verifikator_id?: string;
  }): Promise<VerifikasiHistory | null> => {
    const response = await apiClient.patch<VerifikasiHistory>(`${BASE_URL}/usulan-desa/verifikasi/history/${historyId}`, payload, {
      headers: authService.getAuthHeaders(),
    });
    return response.result || null;
  },

  submitVerifikasi: async (payload: {
    assignment_id: string;
    status: VerifikasiStatus;
    catatan?: string;
    volume_verifikasi?: string;
    anggaran_verifikasi?: number;
    nomor_dokumen_verifikasi?: string;
    tanggal_dokumen_verifikasi?: string;
    url_dokumen_verifikasi?: string;
  }): Promise<VerifikasiHistory | null> => {
    const response = await apiClient.post<VerifikasiHistory>(`${BASE_URL}/usulan-desa/verifikasi/submit`, payload, {
      headers: authService.getAuthHeaders(),
    });
    return response.result || null;
  },

  getHistory: async (assignmentId: string): Promise<VerifikasiHistory[]> => {
    const response = await apiClient.get<VerifikasiHistory[]>(`${BASE_URL}/usulan-desa/verifikasi/history/${assignmentId}`, {
      headers: authService.getAuthHeaders(),
    });
    return response.result || [];
  },

  getUsulanVerificationStatus: async (usulanId: string): Promise<any[]> => {
    const response = await apiClient.get<any[]>(`${BASE_URL}/usulan-desa/verifikasi/usulan-desa/${usulanId}/status-verifikasi`, {
      headers: authService.getAuthHeaders(),
    });
    return response.result || [];
  },
};
