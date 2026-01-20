export interface RekapDibangun {
    id_kecamatan: number;
    id_desa: number;
    nama_desa: string;
    nama_kecamatan: string;
    total_panjang_aset: number;
    total_panjang_puk: number;
    total_panjang_dibangun: number;
    selisih: number;
}

export interface RekapDibangunResponse {
    status: string;
    message: string;
    result: RekapDibangun[];
}

export const laporanService = {
    getRekapJalanByDibangun: async (params?: { kecamatan?: string; desa?: string }): Promise<RekapDibangun[]> => {
        try {
            const url = new URL("https://api-melarosa.saggaserv.my.id/rekap/dibangun");
            if (params?.kecamatan) url.searchParams.append("kecamatan", params.kecamatan);
            if (params?.desa) url.searchParams.append("desa", params.desa);

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
