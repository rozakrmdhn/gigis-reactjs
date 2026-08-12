import type Feature from "ol/Feature";

export interface ClickedLayerItem {
    id: string;
    layerName: string;
    layerType: string;
    badgeColor: string;
    title: string;
    properties: Record<string, any>;
    feature?: Feature;
    realisasiSegment?: RealisasiSegmen | null;
    coordinate: number[];
}

export type StatusVerifikasi =
    | 'verifikasi_kecamatan'
    | 'verifikasi_bappeda'
    | 'dikembalikan'
    | 'terverifikasi';

export interface RealisasiSegmen {
    id: string;
    namobj?: string;
    nama_jalan: string;
    id_desa: string;
    nama_desa: string;
    nama_kecamatan?: string;
    status_parent?: boolean;
    check_melarosa: boolean;
    panjang_m: number;
    lebar_m: number;
    perkerasan: string;
    kondisi: string;
    tahun_anggaran: number;
    coordinates_count: number;
    snapped_road_id?: string;
    parent_id?: string;
    kode_ruas?: string;
    status_verifikasi?: StatusVerifikasi;
    status_jalan?: string;
    sumber_data?: string;
    sumber_dana?: string;
    verifikator?: string;
    catatan_verifikasi?: string;
    keterangan?: string;
    status_kondisi?: string;
    plotting_id?: string | null;
    status_aset?: string | null;
    jenis_bantuan_plotting?: string | null;
    lokasi_kegiatan_plotting?: string | null;
    nama_kegiatan_plotting?: string | null;
    atribut?: Record<string, any>;
    geom?: any;
}

export interface ContextMenuState {
    x: number;
    y: number;
    segment?: RealisasiSegmen;
    masterFeature?: {
        id: string;
        kode_ruas: string;
        nama_ruas: string;
        panjang_m: number;
        feature: Feature;
    };
}
