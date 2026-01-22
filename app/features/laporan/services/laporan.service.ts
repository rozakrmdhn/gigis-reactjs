import { type RekapDibangun, type RekapDibangunResponse } from "../types/laporan.types";

export const laporanService = {
    getRekapJalanByDibangun: async (params?: { kecamatan?: string; desa?: string; tahun_pembangunan?: string; check_melarosa?: string }): Promise<RekapDibangun[]> => {
        try {
            const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/rekap/dibangun`);
            if (params?.kecamatan) url.searchParams.append("kecamatan", params.kecamatan);
            if (params?.desa) url.searchParams.append("desa", params.desa);
            if (params?.tahun_pembangunan) url.searchParams.append("tahun_pembangunan", params.tahun_pembangunan);
            if (params?.check_melarosa) url.searchParams.append("check_melarosa", params.check_melarosa);

            const response = await fetch(url.toString());
            if (!response.ok) {
                throw new Error(`Failed to fetch rekap data: ${response.statusText}`);
            }
            const data: RekapDibangunResponse = await response.json();
            return data.result || [];
        } catch (error) {
            console.error("Error fetching rekap dibangun data:", error);
            return [];
        }
    },
};
