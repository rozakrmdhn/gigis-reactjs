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
