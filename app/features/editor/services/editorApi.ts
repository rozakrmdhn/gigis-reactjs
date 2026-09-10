/**
 * Editor WebGIS - Editor API Service
 * 
 * Service layer untuk mengambil master data konfigurasi infrastruktur,
 * master aset spasial, segmen aset, dan area poligon pendukung.
 * Sesuai spesifikasi docs/API_DOCUMENTATION.md.
 */

import { apiClient } from '~/lib/api-client';
import type { 
  InfrastrukturTipeConfig, 
  InfrastructureFeature, 
  InfrastructureSegmen, 
  InfrastructureArea,
  FormSchema
} from '../core/editor.types';
import { isSupportedGeometryType, normalizeGeometryType } from '../core/EditorContext';
import type { FeatureCollection } from 'geojson';

const getBaseUrl = () => import.meta.env.VITE_API_BASE_URL || '';

interface RawInfrastrukturTipe {
  id: string | number;
  kode: string;
  nama: string;
  deskripsi?: string;
  ikon?: string;
  warna?: string;
  geom_type?: string;
  infrastruktur_tipe?: string;
  table_name?: string;
  has_segmen?: boolean;
  is_active?: boolean;
  aktif?: boolean;
  sort_order?: number;
  capabilities?: Record<string, boolean>;
  config?: Record<string, unknown>;
  form_schema?: FormSchema;
}

/**
 * Mapping dari data mentah backend ke InfrastrukturTipeConfig
 */
function mapToInfrastrukturTipeConfig(raw: RawInfrastrukturTipe): InfrastrukturTipeConfig {
  const rawGeomType = raw.infrastruktur_tipe || raw.geom_type || '';
  const normalizedGeomType = normalizeGeometryType(rawGeomType);

  if (!normalizedGeomType || !isSupportedGeometryType(normalizedGeomType)) {
    throw new Error(
      `Geometry type tidak didukung: "${rawGeomType}" untuk infrastruktur "${raw.id || raw.kode}". Nilai valid: Point | LineString | Polygon.`
    );
  }

  const id = String(raw.id || raw.kode);
  const kode = raw.kode || id;
  const nama = raw.nama || kode;
  const aktif = raw.aktif ?? raw.is_active ?? true;
  const capabilities = (raw.capabilities || (raw.config?.capabilities as Record<string, boolean>) || {});
  const formSchema = (raw.form_schema || (raw.config?.form_schema as FormSchema) || undefined);

  return {
    id,
    kode,
    nama,
    infrastruktur_tipe: normalizedGeomType,
    table_name: raw.table_name,
    has_segmen: raw.has_segmen ?? false,
    is_active: aktif,
    sort_order: raw.sort_order,
    capabilities,
    formSchema,
    aktif,
    deskripsi: raw.deskripsi,
    ikon: raw.ikon,
    warna: raw.warna,
    config: raw.config,
  };
}

/* ========================================================================= */
/* 1. METADATA INFRASTRUKTUR TIPE                                            */
/* ========================================================================= */

/**
 * Mengambil seluruh daftar infrastruktur_tipe aktif dari master data
 * Endpoint: GET /v1/infrastruktur
 */
export async function listInfrastrukturTipe(): Promise<InfrastrukturTipeConfig[]> {
  try {
    const response = await apiClient.get<RawInfrastrukturTipe[]>(
      `${getBaseUrl()}/v1/infrastruktur`,
      { showErrorToast: false }
    );

    const items = response.result || response.data || [];
    return items
      .filter((item) => (item.aktif ?? item.is_active ?? true))
      .map(mapToInfrastrukturTipeConfig);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Geometry type tidak didukung')) {
      throw error;
    }
    throw new Error(`Gagal memuat daftar tipe infrastruktur: ${(error as Error).message}`);
  }
}

/**
 * Mengambil konfigurasi infrastruktur_tipe berdasarkan ID atau Kode
 */
export async function getInfrastrukturTipeConfig(
  idOrKode: string
): Promise<InfrastrukturTipeConfig> {
  if (!idOrKode) {
    throw new Error('ID atau Kode tipe infrastruktur wajib diisi.');
  }

  // 1. Coba cari dari list master data
  const list = await listInfrastrukturTipe();
  const found = list.find(
    (item) => String(item.id).toLowerCase() === idOrKode.toLowerCase() ||
              item.kode.toLowerCase() === idOrKode.toLowerCase()
  );

  if (found) {
    return found;
  }

  // 2. Jika tidak ada di list, coba fetch endpoint spesifik
  try {
    const response = await apiClient.get<RawInfrastrukturTipe>(
      `${getBaseUrl()}/v1/infrastruktur/${idOrKode}`,
      { showErrorToast: false }
    );

    const data = response.result || response.data;
    if (data) {
      return mapToInfrastrukturTipeConfig(data);
    }
  } catch {
    // Abaikan error direct fetch
  }

  throw new Error(`Konfigurasi untuk tipe infrastruktur "${idOrKode}" tidak ditemukan.`);
}

/* ========================================================================= */
/* 2. MASTER ASET SPASIAL (CRUD)                                             */
/* ========================================================================= */

/**
 * Mengambil GeoJSON FeatureCollection lengkap untuk satu tipe infrastruktur
 * Endpoint: GET /v1/infrastruktur/{kode}?format=geojson
 */
export async function getInfrastructureGeoJSON(
  tipeKode: string,
  options?: { bbox?: string; tahun?: number | string }
): Promise<FeatureCollection> {
  if (!tipeKode) {
    throw new Error('Tipe infrastruktur wajib ditentukan.');
  }

  const queryParams = new URLSearchParams({ format: 'geojson' });
  if (options?.bbox) queryParams.set('bbox', options.bbox);
  if (options?.tahun) queryParams.set('tahun', String(options.tahun));

  const url = `${getBaseUrl()}/v1/infrastruktur/${tipeKode}?${queryParams.toString()}`;
  const response = await apiClient.get<FeatureCollection>(url, { showErrorToast: false });
  return (response.result || response.data || response) as unknown as FeatureCollection;
}

interface RawInfrastructureFeature {
  id?: string | number;
  infrastructure_type_id?: string;
  tipe_kode?: string;
  attributes?: Record<string, unknown>;
  atribut?: Record<string, unknown>;
  geom?: GeoJSON.Geometry;
  geometry?: GeoJSON.Geometry;
  properties?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

/**
 * Mengambil data lengkap satu feature (master aset atau segmen) berdasarkan ID
 * Endpoint: GET /v1/infrastruktur/{kode}/{id} dengan fallback ke endpoint segmen
 */
export async function getInfrastructureFeature(
  id: string,
  infrastructureTypeId?: string
): Promise<InfrastructureFeature> {
  if (!id) {
    throw new Error('ID feature wajib diisi.');
  }

  let raw: RawInfrastructureFeature | null = null;

  // 1. Coba endpoint master: /v1/infrastruktur/{tipe}/{id}
  try {
    const url = `${getBaseUrl()}/v1/infrastruktur/${infrastructureTypeId ? `${infrastructureTypeId}/${id}` : `detail/${id}`}`;
    const response = await apiClient.get<RawInfrastructureFeature>(url, {
      showErrorToast: false,
    });
    if (response && response.status !== 'fail') {
      raw = response.result || response.data || (response as unknown as RawInfrastructureFeature);
    }
  } catch {
    // Master gagal, lanjutkan ke fallback segmen
  }

  // 2. Fallback: jika master tidak ditemukan, coba cari di endpoint segmen
  if (!raw && infrastructureTypeId) {
    try {
      const segmenUrl = `${getBaseUrl()}/v1/infrastruktur/${infrastructureTypeId}/segmen/${id}`;
      const segResponse = await apiClient.get<RawInfrastructureFeature>(segmenUrl, {
        showErrorToast: false,
      });
      if (segResponse && segResponse.status !== 'fail') {
        raw = segResponse.result || segResponse.data || (segResponse as unknown as RawInfrastructureFeature);
      }
    } catch {
      // Fallback 3: cari di list segmen
      try {
        const segmenList = await listInfrastructureSegmen(infrastructureTypeId);
        const found = segmenList.find((s) => s.id === id);
        if (found) {
          raw = {
            id: found.id,
            infrastructure_type_id: infrastructureTypeId,
            tipe_kode: infrastructureTypeId,
            attributes: {
              namobj: found.namobj,
              kondisi: found.kondisi,
              status_kondisi: found.status_kondisi,
              panjang: found.panjang,
              lebar: found.lebar,
              tahun_pembangunan: found.tahun_pembangunan,
              sumber_dana: found.sumber_dana,
              desa: found.desa,
              kecamatan: found.kecamatan,
              keterangan: found.keterangan,
              ...found.atribut,
            },
            geom: found.geom || undefined,
            created_at: found.created_at,
            updated_at: found.updated_at,
          };
        }
      } catch {
        // Abaikan
      }
    }
  }

  if (!raw) {
    throw new Error(`Data feature dengan ID "${id}" tidak ditemukan.`);
  }

  const geom = raw.geom || raw.geometry;
  if (!geom || !geom.type) {
    throw new Error(`Feature "${id}" tidak memiliki data geometri yang valid.`);
  }

  // Ekstrak atribut
  const rawAttrs = raw.attributes || raw.atribut || raw.properties || {};
  const extractedAttributes: Record<string, unknown> = { ...rawAttrs };

  for (const [key, value] of Object.entries(raw)) {
    if (
      !['id', 'geom', 'geometry', 'attributes', 'atribut', 'properties', 'result', 'data', 'status', 'message'].includes(key)
    ) {
      if (extractedAttributes[key] === undefined) {
        extractedAttributes[key] = value;
      }
    }
  }

  return {
    id: String(raw.id || id),
    infrastructure_type_id: String(raw.infrastructure_type_id || raw.tipe_kode || infrastructureTypeId || ''),
    attributes: extractedAttributes,
    geom,
    created_at: raw.created_at ? String(raw.created_at) : undefined,
    updated_at: raw.updated_at ? String(raw.updated_at) : undefined,
  };
}

export interface CreateFeaturePayload {
  infrastructure_type_id: string;
  attributes: Record<string, unknown>;
  geom: GeoJSON.Geometry;
}

export interface CreateFeatureResult {
  id: string;
  success: boolean;
  message?: string;
  data?: unknown;
}

/**
 * Membuat master feature baru (atribut + geometri) ke backend via POST
 * Endpoint: POST /v1/infrastruktur/{kode}
 */
export async function createInfrastructureFeature(
  payload: CreateFeaturePayload
): Promise<CreateFeatureResult> {
  if (!payload.infrastructure_type_id) {
    throw new Error('Tipe infrastruktur wajib disertakan saat membuat feature baru.');
  }

  if (!payload.geom) {
    throw new Error('Geometri wajib disertakan saat membuat feature baru.');
  }

  try {
    const url = `${getBaseUrl()}/v1/infrastruktur/${payload.infrastructure_type_id}`;

    const response = await apiClient.post<{ id?: string | number; message?: string }>(
      url,
      payload,
      { showErrorToast: false }
    );

    const createdId = String(
      (response.result as { id?: string | number })?.id ||
      (response.data as { id?: string | number })?.id ||
      (response as unknown as { id?: string | number })?.id ||
      ''
    );

    return {
      id: createdId,
      success: true,
      message: response.message || 'Feature baru berhasil dibuat.',
      data: response.result || response.data,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Gagal membuat feature baru: ${String(error)}`);
  }
}

export interface UpdateFeaturePayload {
  attributes: Record<string, unknown>;
  geom: GeoJSON.Geometry;
}

export interface UpdateFeatureResult {
  id: string;
  success: boolean;
  message?: string;
  data?: unknown;
}

/**
 * Mengirim pembaruan master feature (atribut + geometri) via PATCH
 * Endpoint: PATCH /v1/infrastruktur/{kode}/{id}
 */
export async function updateInfrastructureFeature(
  id: string,
  payload: UpdateFeaturePayload,
  infrastructureTypeId?: string
): Promise<UpdateFeatureResult> {
  if (!id) {
    throw new Error('ID feature wajib diisi untuk melakukan pembaruan.');
  }

  if (!payload.geom) {
    throw new Error('Geometri wajib disertakan saat memperbarui feature.');
  }

  try {
    const url = `${getBaseUrl()}/v1/infrastruktur/${infrastructureTypeId ? `${infrastructureTypeId}/${id}` : id}`;

    const response = await apiClient.patch<{ id?: string | number; message?: string }>(
      url,
      payload,
      { showErrorToast: false }
    );

    return {
      id,
      success: true,
      message: response.message || 'Feature berhasil diperbarui.',
      data: response.result || response.data,
    };
  } catch (error) {
    // Fallback: Jika gagal update ke master, coba update ke endpoint segmen
    if (infrastructureTypeId) {
      try {
        const segmenPayload: Partial<InfrastructureSegmen> = {
          ...payload.attributes,
          geom: payload.geom,
        };
        const segResult = await updateInfrastructureSegmen(infrastructureTypeId, id, segmenPayload);
        return {
          id,
          success: true,
          message: segResult.message || 'Segmen berhasil diperbarui.',
        };
      } catch {
        // Lanjutkan lempar error asli jika fallback juga gagal
      }
    }

    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Gagal memperbarui feature "${id}": ${String(error)}`);
  }
}

/**
 * Menghapus master feature
 * Endpoint: DELETE /v1/infrastruktur/{kode}/{id}
 */
export async function deleteInfrastructureFeature(
  id: string,
  infrastructureTypeId: string
): Promise<{ success: boolean; message?: string }> {
  if (!id || !infrastructureTypeId) {
    throw new Error('ID dan tipe infrastruktur wajib diisi.');
  }

  try {
    const url = `${getBaseUrl()}/v1/infrastruktur/${infrastructureTypeId}/${id}`;
    const response = await apiClient.delete<{ message?: string }>(url, { showErrorToast: false });
    return {
      success: true,
      message: response.message || 'Feature berhasil dihapus.',
    };
  } catch (error) {
    // Fallback: coba hapus dari endpoint segmen
    try {
      const segResult = await deleteInfrastructureSegmen(infrastructureTypeId, id);
      return {
        success: true,
        message: segResult.message || 'Segmen berhasil dihapus.',
      };
    } catch {
      // Lanjutkan lempar error asli jika fallback juga gagal
    }

    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Gagal menghapus feature "${id}": ${String(error)}`);
  }
}

/* ========================================================================= */
/* 3. SEGMEN INFRASTRUKTUR (infrastruktur_segmen)                            */
/* ========================================================================= */

/**
 * Mengambil daftar segmen untuk suatu parent master aset atau seluruh segmen per tipe
 * Endpoint: GET /v1/infrastruktur/{kode}/{parentId}/segmen atau GET /v1/infrastruktur/{kode}/segmen
 */
export async function listInfrastructureSegmen(
  tipeKode: string,
  parentId?: string | null
): Promise<InfrastructureSegmen[]> {
  if (!tipeKode) {
    throw new Error('Kode tipe infrastruktur wajib diisi.');
  }

  const url = parentId
    ? `${getBaseUrl()}/v1/infrastruktur/${tipeKode}/${parentId}/segmen`
    : `${getBaseUrl()}/v1/infrastruktur/${tipeKode}/segmen`;

  const response = await apiClient.get<InfrastructureSegmen[]>(url, { showErrorToast: false });
  return response.result || response.data || [];
}

/**
 * Membuat segmen baru
 * Endpoint: POST /v1/infrastruktur/{kode}/{parentId}/segmen
 */
export async function createInfrastructureSegmen(
  tipeKode: string,
  payload: Partial<InfrastructureSegmen>,
  parentId?: string | null
): Promise<{ id: string; success: boolean; message?: string }> {
  const url = parentId
    ? `${getBaseUrl()}/v1/infrastruktur/${tipeKode}/${parentId}/segmen`
    : `${getBaseUrl()}/v1/infrastruktur/${tipeKode}/segmen`;

  const response = await apiClient.post<{ id?: string; message?: string }>(url, payload, { showErrorToast: false });
  const id = String(
    (response.result as { id?: string })?.id ||
    (response.data as { id?: string })?.id ||
    (response as unknown as { id?: string })?.id ||
    ''
  );
  return {
    id,
    success: true,
    message: response.message || 'Segmen berhasil dibuat.',
  };
}

/**
 * Mengupdate data segmen
 * Endpoint: PATCH /v1/infrastruktur/{kode}/segmen/{segmenId}
 */
export async function updateInfrastructureSegmen(
  tipeKode: string,
  segmenId: string,
  payload: Partial<InfrastructureSegmen>
): Promise<{ success: boolean; message?: string }> {
  const url = `${getBaseUrl()}/v1/infrastruktur/${tipeKode}/segmen/${segmenId}`;
  const response = await apiClient.patch<{ message?: string }>(url, payload, { showErrorToast: false });
  return {
    success: true,
    message: response.message || 'Segmen berhasil diperbarui.',
  };
}

/**
 * Menghapus segmen
 * Endpoint: DELETE /v1/infrastruktur/{kode}/segmen/{segmenId}
 */
export async function deleteInfrastructureSegmen(
  tipeKode: string,
  segmenId: string
): Promise<{ success: boolean; message?: string }> {
  const url = `${getBaseUrl()}/v1/infrastruktur/${tipeKode}/segmen/${segmenId}`;
  const response = await apiClient.delete<{ message?: string }>(url, { showErrorToast: false });
  return {
    success: true,
    message: response.message || 'Segmen berhasil dihapus.',
  };
}

/**
 * Mengajukan segmen ke Bappeda
 * Endpoint: PUT /v1/infrastruktur/{kode}/segmen/{segmenId}/submit-bappeda
 */
export async function submitSegmenBappeda(
  tipeKode: string,
  segmenId: string
): Promise<{ success: boolean; message?: string }> {
  const url = `${getBaseUrl()}/v1/infrastruktur/${tipeKode}/segmen/${segmenId}/submit-bappeda`;
  const response = await apiClient.put<{ message?: string }>(url, {}, { showErrorToast: false });
  return {
    success: true,
    message: response.message || 'Segmen berhasil diajukan ke Bappeda.',
  };
}

/**
 * Memverifikasi segmen (Bappeda)
 * Endpoint: PATCH /v1/infrastruktur/{kode}/segmen/{segmenId}/verifikasi
 */
export async function verifySegmenBappeda(
  tipeKode: string,
  segmenId: string,
  payload: { status_verifikasi: string; catatan_verifikasi?: string }
): Promise<{ success: boolean; message?: string }> {
  const url = `${getBaseUrl()}/v1/infrastruktur/${tipeKode}/segmen/${segmenId}/verifikasi`;
  const response = await apiClient.patch<{ message?: string }>(url, payload, { showErrorToast: false });
  return {
    success: true,
    message: response.message || 'Verifikasi segmen berhasil disimpan.',
  };
}

/* ========================================================================= */
/* 4. AREA POLIGON PENDUKUNG (infrastruktur_area)                            */
/* ========================================================================= */

/**
 * Mengambil daftar area GeoJSON per tipe infrastruktur
 * Endpoint: GET /v1/infrastruktur/{kode}/area?format=geojson
 */
export async function listInfrastructureAreaGeoJSON(
  tipeKode: string,
  parentId?: string | null
): Promise<FeatureCollection> {
  const queryParams = new URLSearchParams({ format: 'geojson' });
  const baseUrl = parentId
    ? `${getBaseUrl()}/v1/infrastruktur/${tipeKode}/${parentId}/area`
    : `${getBaseUrl()}/v1/infrastruktur/${tipeKode}/area`;

  const response = await apiClient.get<FeatureCollection>(`${baseUrl}?${queryParams.toString()}`, { showErrorToast: false });
  return (response.result || response.data || response) as unknown as FeatureCollection;
}

/**
 * Membuat area poligon baru
 * Endpoint: POST /v1/infrastruktur/{kode}/area
 */
export async function createInfrastructureArea(
  tipeKode: string,
  payload: Partial<InfrastructureArea>
): Promise<{ id: string; success: boolean; message?: string }> {
  const url = `${getBaseUrl()}/v1/infrastruktur/${tipeKode}/area`;
  const response = await apiClient.post<{ id?: string; message?: string }>(url, payload, { showErrorToast: false });
  const id = String(
    (response.result as { id?: string })?.id ||
    (response.data as { id?: string })?.id ||
    (response as unknown as { id?: string })?.id ||
    ''
  );
  return {
    id,
    success: true,
    message: response.message || 'Area berhasil dibuat.',
  };
}

/**
 * Mengupdate area poligon
 * Endpoint: PATCH /v1/infrastruktur/{kode}/area/{areaId}
 */
export async function updateInfrastructureArea(
  tipeKode: string,
  areaId: string,
  payload: Partial<InfrastructureArea>
): Promise<{ success: boolean; message?: string }> {
  const url = `${getBaseUrl()}/v1/infrastruktur/${tipeKode}/area/${areaId}`;
  const response = await apiClient.patch<{ message?: string }>(url, payload, { showErrorToast: false });
  return {
    success: true,
    message: response.message || 'Area berhasil diperbarui.',
  };
}

/**
 * Menghapus area poligon
 * Endpoint: DELETE /v1/infrastruktur/{kode}/area/{areaId}
 */
export async function deleteInfrastructureArea(
  tipeKode: string,
  areaId: string
): Promise<{ success: boolean; message?: string }> {
  const url = `${getBaseUrl()}/v1/infrastruktur/${tipeKode}/area/${areaId}`;
  const response = await apiClient.delete<{ message?: string }>(url, { showErrorToast: false });
  return {
    success: true,
    message: response.message || 'Area berhasil dihapus.',
  };
}
