import { apiClient } from '~/lib/api-client';

const getBaseUrl = () => {
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
};

export interface RekapKecamatanResponse {
    id_kecamatan: number;
    nama_kecamatan: string;
    jumlah_desa: number;
    jumlah_ruas: number;
    total_panjang: number;
    panjang_dibangun: number;
    panjang_belum: number;
    progress: number;
    jumlah_segmen: number;
}

export interface RekapDesaResponse {
    id_desa: number;
    nama_desa: string;
    kecamatan: string;
    jumlah_ruas: number;
    total_panjang: number;
    panjang_dibangun: number;
    panjang_belum: number;
    progress: number;
    jumlah_segmen: number;
}

export interface RekapRuasResponse {
    id: string;
    kode_ruas: string;
    nama_ruas: string;
    panjang_master: number;
    panjang_dibangun: number;
    panjang_tersisa: number;
    progress: number;
    jumlah_segmen: number;
}

export interface RekapSegmenResponse {
    id: string;
    tahun: number;
    panjang: number;
    lebar: number;
    kondisi: string;
    sumber_dana: string;
    status_kondisi: string;
    keterangan: string;
    status_parent?: boolean;
    parent_id?: string | null;
    geom: any;
}

export interface RekapFilters {
    tahun?: string | number;
    kondisi?: string;
    sumber_dana?: string;
    id_kecamatan?: string | number;
    id_desa?: string | number;
    kecamatan?: string;
    desa?: string;
}

export const rekapService = {
    getKecamatan: async (filters?: RekapFilters): Promise<RekapKecamatanResponse[]> => {
        const url = new URL(`${getBaseUrl()}/v1/rekap/kecamatan`, window.location.origin);
        if (filters) {
            Object.entries(filters).forEach(([key, val]) => {
                if (val !== undefined && val !== null && val !== "") {
                    url.searchParams.append(key, val.toString());
                }
            });
        }
        const response = await apiClient.get<RekapKecamatanResponse[]>(url.toString());
        const data = response.result || response.data || [];
        return data.map((item: any) => ({
            ...item,
            id_kecamatan: Number(item.id_kecamatan || item.id),
            jumlah_desa: Number(item.jumlah_desa || 0),
            jumlah_ruas: Number(item.jumlah_ruas || 0),
            total_panjang: Number(item.total_panjang || 0),
            panjang_dibangun: Number(item.panjang_dibangun || 0),
            panjang_belum: Number(item.panjang_belum || 0),
            progress: Number(item.progress || 0),
            jumlah_segmen: Number(item.jumlah_segmen || 0)
        }));
    },

    getDesa: async (filters?: RekapFilters): Promise<RekapDesaResponse[]> => {
        const url = new URL(`${getBaseUrl()}/v1/rekap/desa`, window.location.origin);
        if (filters) {
            Object.entries(filters).forEach(([key, val]) => {
                if (val !== undefined && val !== null && val !== "") {
                    url.searchParams.append(key, val.toString());
                }
            });
        }
        const response = await apiClient.get<RekapDesaResponse[]>(url.toString());
        const data = response.result || response.data || [];
        return data.map((item: any) => ({
            ...item,
            id_desa: Number(item.id_desa || item.id),
            jumlah_ruas: Number(item.jumlah_ruas || 0),
            total_panjang: Number(item.total_panjang || 0),
            panjang_dibangun: Number(item.panjang_dibangun || 0),
            panjang_belum: Number(item.panjang_belum || 0),
            progress: Number(item.progress || 0),
            jumlah_segmen: Number(item.jumlah_segmen || 0)
        }));
    },

    getRuasByDesa: async (idDesa: number | string, filters?: Omit<RekapFilters, 'id_desa' | 'id_kecamatan' | 'desa' | 'kecamatan'>): Promise<RekapRuasResponse[]> => {
        const url = new URL(`${getBaseUrl()}/v1/rekap/desa/${idDesa}/ruas`, window.location.origin);
        if (filters) {
            Object.entries(filters).forEach(([key, val]) => {
                if (val !== undefined && val !== null && val !== "") {
                    url.searchParams.append(key, val.toString());
                }
            });
        }
        const response = await apiClient.get<RekapRuasResponse[]>(url.toString());
        const data = response.result || response.data || [];
        return data.map((item: any) => ({
            ...item,
            panjang_master: Number(item.panjang_master || 0),
            panjang_dibangun: Number(item.panjang_dibangun || 0),
            panjang_tersisa: Number(item.panjang_tersisa || 0),
            progress: Number(item.progress || 0),
            jumlah_segmen: Number(item.jumlah_segmen || 0)
        }));
    },

    getSegmensByRuas: async (idRuas: string, filters?: Omit<RekapFilters, 'id_desa' | 'id_kecamatan' | 'desa' | 'kecamatan'>): Promise<RekapSegmenResponse[]> => {
        const url = new URL(`${getBaseUrl()}/v1/rekap/ruas/${idRuas}/segmen`, window.location.origin);
        if (filters) {
            Object.entries(filters).forEach(([key, val]) => {
                if (val !== undefined && val !== null && val !== "") {
                    url.searchParams.append(key, val.toString());
                }
            });
        }
        const response = await apiClient.get<RekapSegmenResponse[]>(url.toString());
        const data = response.result || response.data || [];
        return data.map((item: any) => ({
            ...item,
            panjang: Number(item.panjang || 0),
            lebar: Number(item.lebar || 0),
            tahun: Number(item.tahun || 0)
        }));
    }
};
