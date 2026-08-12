import { type RekapDibangun } from "../types/laporan.types";
import { apiClient } from '~/lib/api-client';

export const laporanService = {
    getRekapJalanByDibangun: async (params?: { kecamatan?: string; desa?: string; tahun_pembangunan?: string; check_melarosa?: string }): Promise<RekapDibangun[]> => {
        const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/v1/rekap/dibangun`, window.location.origin);
        if (params?.kecamatan) url.searchParams.append("kecamatan", params.kecamatan);
        if (params?.desa) url.searchParams.append("desa", params.desa);
        if (params?.tahun_pembangunan) url.searchParams.append("tahun_pembangunan", params.tahun_pembangunan);
        if (params?.check_melarosa) url.searchParams.append("check_melarosa", params.check_melarosa);

        const response = await apiClient.get<RekapDibangun[]>(url.toString());
        return response.result || [];
    },
    getCetakLaporanRealisasi: async (params?: { kecamatan?: string; desa?: string; tahun_pembangunan?: string; check_melarosa?: string }): Promise<RekapDibangun[]> => {
        const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/v1/rekap/cetak-berita-acara`, window.location.origin);
        if (params?.kecamatan) url.searchParams.append("kecamatan", params.kecamatan);
        if (params?.desa) url.searchParams.append("desa", params.desa);
        if (params?.tahun_pembangunan) url.searchParams.append("tahun_pembangunan", params.tahun_pembangunan);
        if (params?.check_melarosa) url.searchParams.append("check_melarosa", params.check_melarosa);

        const response = await apiClient.get<RekapDibangun[]>(url.toString());
        return response.result || [];
    },
};

