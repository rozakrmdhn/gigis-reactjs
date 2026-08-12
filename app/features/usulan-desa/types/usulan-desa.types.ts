export interface UsulanDesa {
    id: number;
    nomor_agenda: string;
    nomor_surat: string | string[];
    tanggal_surat: string;         // format: "YYYY-MM-DD"
    uraian_usulan: string;
    jenis_usulan: string;
    alamat_usulan: string;
    tahun_anggaran: number;
    url_dokumen_usulan?: string | null;   // nullable
    status: UsulanStatus;
    catatan_bappeda?: string;      // nullable
    catatan_opd?: string;          // nullable
    catatan_bupati?: string;       // nullable
    anggaran_usulan?: number;      // nullable
    volume?: string;               // nullable
    id_desa: number;
    id_kecamatan: number;
    id_kategori?: string;
    nama_desa?: string;            // nullable
    nama_kecamatan?: string;       // nullable
    created_at?: string;
    updated_at?: string;
    geometries?: UsulanDesaGeometry[];
    nomor_pengantar_verifikasi?: string | null;
    kategori?: KategoriUsulan;
    assignments?: VerifikasiAssignment[];
}

export interface KategoriUsulan {
    id: string;
    nama: string;
    kode: string | null;
    deskripsi: string | null;
    is_active: boolean;
    opd_id?: string | null;
}

export interface MasterOpd {
    id: string;
    nama: string;
    kode: string;
    is_active: boolean;
}

export type VerifikasiStatus = 'pending' | 'revisi' | 'perbaikan_diterima' | 'disetujui' | 'ditolak' | 'terkirim';

export interface VerifikasiHistory {
    id: string;
    assignment_id: string;
    status: VerifikasiStatus;
    catatan: string | null;
    verifikator_id: string | null;
    created_at: string;
}

export interface VerifikasiAssignment {
    id: string;
    usulan_id: string;
    opd_id: string;
    status_terakhir: VerifikasiStatus;
    volume_verifikasi?: string | null;
    anggaran_verifikasi?: number | null;
    nomor_dokumen_verifikasi?: string | null;
    tanggal_dokumen_verifikasi?: string | null;
    url_dokumen_verifikasi?: string | null;
    nomor_dokumen_pengantar?: string | null;
    tanggal_dokumen_pengantar?: string | null;
    url_dokumen_pengantar?: string | null;
    assigned_by: string | null;
    assigned_at: string;
    created_at: string;
    updated_at: string;
    opd?: MasterOpd;
    history?: VerifikasiHistory[];
}

export interface UsulanKategori {
    id: string;
    usulan_id: string;
    kategori_id: string;
    volume: string | null;
    anggaran: number | null;
    keterangan: string | null;
    kategori?: KategoriUsulan;
    assignments?: VerifikasiAssignment[];
}

export type UsulanStatus = 
    | 'pending' 
    | 'verifikasi_bappeda' 
    | 'verifikasi_opd'
    | 'selesai' 
    | 'ditolak';

export interface CreateUsulanDesaPayload {
    nomor_agenda: string;
    nomor_surat: string | string[];
    tanggal_surat: string;
    uraian_usulan: string;
    jenis_usulan: string;
    alamat_usulan: string;
    tahun_anggaran: number;
    url_dokumen_usulan?: string | null;
    status: UsulanStatus;
    id_desa: number;
    id_kecamatan: number;
    id_kategori?: string;
    nama_desa?: string;
    nama_kecamatan?: string;
    anggaran_usulan?: number | null;
    catatan_bupati?: string;
    volume?: string;
    nomor_pengantar_verifikasi?: string | null;
    kategoriList?: Array<{
        kategori_id: string;
        volume?: string;
        anggaran?: number | null;
        keterangan?: string;
    }>;
    kategori?: Array<{
        kategori_id: string;
        volume?: string;
        anggaran?: number | null;
        keterangan?: string;
    }>;
}

export interface UpdateUsulanDesaPayload extends Partial<CreateUsulanDesaPayload> {
    catatan_bappeda?: string;
    catatan_opd?: string;
}

export interface UsulanDesaFilters {
    status?: UsulanStatus | 'all';
    tahun_anggaran?: number | string;
    jenis_usulan?: string;
    id_desa?: number | string;
    id_kecamatan?: number | string;
    nama_desa?: string;
    nama_kecamatan?: string;
    nomor_surat?: string;
    tanggal_surat_from?: string;
    tanggal_surat_to?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: 'ASC' | 'DESC' | 'asc' | 'desc';
}

export interface UsulanDesaPaginatedResponse {
    status: string;
    message: string;
    pagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    result: UsulanDesa[];
}

// ─── Geometry Types ───────────────────────────────────────────────────────────

export type GeometryType = 'Point' | 'LineString' | 'Polygon';

/**
 * GeoJSON Geometry Object (bukan FeatureCollection)
 * Point:       coordinates: [lng, lat]
 * LineString:  coordinates: [[lng, lat], [lng, lat], ...]
 * Polygon:     coordinates: [[[lng, lat], [lng, lat], ...]]  ← double array
 */
export interface GeoJSONGeometry {
    type: GeometryType;
    coordinates: any; // Using any to flexibly support Point, LineString, and Polygon structures
}

export interface UsulanDesaGeometry {
    id: number;
    id_usulan_desa: number;
    geom: GeoJSONGeometry;
    keterangan_geometry: string;
    created_at?: string;
    updated_at?: string;
}

export interface CreateGeometryPayload {
    id_usulan_desa: number;
    geom: GeoJSONGeometry;
    keterangan_geometry: string;
}

export interface UpdateGeometryPayload {
    geom?: GeoJSONGeometry;
    keterangan_geometry: string;
}

