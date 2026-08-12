import type { MasterOpd } from "./usulan-desa.types";

export interface UsulanKategori {
  id: string;
  nama: string;
  kode: string | null;
  deskripsi: string | null;
  is_active: boolean;
  opd_id?: string | null;
  opd?: MasterOpd | null;
  created_at: string;
  updated_at: string;
}

export interface UsulanKategoriFilters {
  search?: string;
  is_active?: boolean | "all" | string;
  page?: number;
  limit?: number | string;
  all?: boolean | string;
}
