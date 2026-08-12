import { apiClient } from '~/lib/api-client';

const getBaseUrl = () => {
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
};

export interface AgregasiSegment {
    id: string;
    namobj: string;
    panjang: number;
    lebar: number;
    kondisi: string;
    tahun_pembangunan: number;
    sumber_dana: string;
    geom: any;
}

export interface AgregasiDesa {
    plotting_id: string;
    id_desa: number;
    nama_desa: string;
    id_kecamatan: number;
    nama_kecamatan: string;
    nama_kegiatan: string;
    lokasi_kegiatan: string;
    target_pagu_anggaran: number | string;
    target_panjang_m: number | string;
    status_monitoring: 'Sudah Monitoring' | 'Belum Monitoring';
    laporan_id?: string;
    nomor_ba?: string;
    tanggal_monitoring?: string;
    rencana_panjang?: number | string;
    realisasi_panjang?: number | string;
    status_laporan?: string;
    jumlah_segmen?: number;
    segmen?: AgregasiSegment[];
}

export interface AgregasiKecamatan {
    id_kecamatan: number;
    nama_kecamatan: string;
    jumlah_desa_plotting: number;
    jumlah_desa_monitoring: number;
    jumlah_desa_belum_monitoring: number;
    total_target_pagu: number | string;
    total_target_panjang: number | string;
    total_realisasi_panjang: number | string;
    persentase_progres_desa: number;
    persentase_progres_panjang: number;
}

export interface AgregasiAnggaranGroup {
    tahun_anggaran: number;
    jenis_bantuan: string;
    jumlah_desa_plotting: number;
    jumlah_desa_monitoring: number;
    jumlah_desa_belum_monitoring: number;
    total_target_pagu: number | string;
    total_target_panjang: number | string;
    total_realisasi_panjang: number | string;
    persentase_progres_desa: number;
    persentase_progres_panjang: number;
    desa?: AgregasiDesa[];
}

export const agregasiService = {
    getAgregasi: async (filters?: { tahun_anggaran?: string | number; jenis_bantuan?: string; sumber_dana?: string }): Promise<AgregasiAnggaranGroup[]> => {
        const url = new URL(`${getBaseUrl()}/v1/monitoring/agregasi-anggaran`, window.location.origin);
        if (filters?.tahun_anggaran) url.searchParams.append("tahun_anggaran", filters.tahun_anggaran.toString());
        if (filters?.jenis_bantuan) url.searchParams.append("jenis_bantuan", filters.jenis_bantuan);
        if (filters?.sumber_dana) url.searchParams.append("sumber_dana", filters.sumber_dana);

        const response = await apiClient.get<AgregasiAnggaranGroup[]>(url.toString());
        return response.result || [];
    },

    getAgregasiKecamatan: async (params: { tahun_anggaran: number; jenis_bantuan: string; status_monitoring?: string; search?: string; sumber_dana?: string }): Promise<AgregasiKecamatan[]> => {
        const url = new URL(`${getBaseUrl()}/v1/monitoring/agregasi-anggaran/kecamatan`, window.location.origin);
        url.searchParams.append("tahun_anggaran", params.tahun_anggaran.toString());
        url.searchParams.append("jenis_bantuan", params.jenis_bantuan);
        if (params.status_monitoring && params.status_monitoring !== 'all') {
            url.searchParams.append("status_monitoring", params.status_monitoring);
        }
        if (params.search) {
            url.searchParams.append("search", params.search);
        }
        if (params.sumber_dana && params.sumber_dana !== 'all') {
            url.searchParams.append("sumber_dana", params.sumber_dana);
        }

        const response = await apiClient.get<AgregasiKecamatan[]>(url.toString());
        return response.result || [];
    },

    getAgregasiDesa: async (params: { tahun_anggaran: number; jenis_bantuan: string; id_kecamatan?: number | string; status_monitoring?: string; search?: string; sumber_dana?: string }): Promise<AgregasiDesa[]> => {
        const url = new URL(`${getBaseUrl()}/v1/monitoring/agregasi-anggaran/desa`, window.location.origin);
        url.searchParams.append("tahun_anggaran", params.tahun_anggaran.toString());
        url.searchParams.append("jenis_bantuan", params.jenis_bantuan);
        if (params.id_kecamatan && params.id_kecamatan !== 'all') {
            url.searchParams.append("id_kecamatan", params.id_kecamatan.toString());
        }
        if (params.status_monitoring && params.status_monitoring !== 'all') {
            url.searchParams.append("status_monitoring", params.status_monitoring);
        }
        if (params.search) {
            url.searchParams.append("search", params.search);
        }
        if (params.sumber_dana && params.sumber_dana !== 'all') {
            url.searchParams.append("sumber_dana", params.sumber_dana);
        }

        const response = await apiClient.get<AgregasiDesa[]>(url.toString());
        return response.result || [];
    },

    getAgregasiSegmen: async (params: { laporan_id?: string; plotting_id?: string }): Promise<AgregasiSegment[]> => {
        const url = new URL(`${getBaseUrl()}/v1/monitoring/agregasi-anggaran/segmen`, window.location.origin);
        if (params.laporan_id) url.searchParams.append("laporan_id", params.laporan_id);
        if (params.plotting_id) url.searchParams.append("plotting_id", params.plotting_id);

        const response = await apiClient.get<AgregasiSegment[]>(url.toString());
        return response.result || [];
    }
};
