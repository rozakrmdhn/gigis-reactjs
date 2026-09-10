/**
 * Editor WebGIS - Core Type Definitions
 * 
 * Sesuai arsitektur GIS_ARCHITECTURE.md:
 * - Tidak memiliki DEFAULT_GEOMETRY_TYPE
 * - Semua geometry ditentukan secara dinamis dari infrastruktur_tipe
 */

import type { Geometry } from 'geojson';

export type GeometryType = 'Point' | 'LineString' | 'Polygon';

export type EditorTool =
  | 'select'
  | 'draw'
  | 'modify'
  | 'snap'
  | 'split'
  | 'merge'
  | 'extend'
  | 'delete';

export interface EditorCapabilities {
  select: boolean;
  draw: boolean;
  modify: boolean;
  snap: boolean;
  split: boolean;
  merge: boolean;
  extend: boolean;
  delete: boolean;
}

export interface EditorContext {
  infrastructureTypeId: string;
  geometryType: GeometryType;
  capabilities: EditorCapabilities;
}

export interface EditorState {
  activeTool: EditorTool | null;
  infrastructureTypeId: string | null;
  geometryType: GeometryType | null;
  capabilities: EditorCapabilities | null;
  selectedFeatureId: string | null;
  editingFeatureId: string | null;
  formData: Record<string, unknown>;
  geometry: Geometry | null;
  originalGeometry: Geometry | null;
  isDirty: boolean;
  isSaving: boolean;
  isSnapEnabled: boolean;
  validationErrors: string[];
}

export interface EditorStoreActions {
  setEditorContext: (context: EditorContext) => void;
  setActiveTool: (tool: EditorTool | null) => void;
  setSelectedFeatureId: (id: string | null) => void;
  setEditingFeatureId: (id: string | null) => void;
  setGeometry: (geometry: Geometry | null) => void;
  setOriginalGeometry: (geometry: Geometry | null) => void;
  setFormData: (data: Record<string, unknown>) => void;
  updateFormField: (key: string, value: unknown) => void;
  setIsDirty: (isDirty: boolean) => void;
  setIsSaving: (isSaving: boolean) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setValidationErrors: (errors: string[]) => void;
  resetDraft: () => void;
  resetEditor: () => void;
}

export type FormFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'textarea'
  | 'date'
  | 'boolean';

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormFieldSchema {
  key: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  options?: FormFieldOption[];
  min?: number;
  max?: number;
  maxLength?: number;
}

export interface FormSchema {
  fields: FormFieldSchema[];
}

export interface InfrastrukturTipeConfig {
  id: string;
  kode: string;
  nama: string;
  infrastruktur_tipe: GeometryType;
  table_name?: string;
  has_segmen?: boolean;
  is_active?: boolean;
  sort_order?: number;
  capabilities: Partial<EditorCapabilities>;
  aktif: boolean;
  formSchema?: FormSchema;
  deskripsi?: string;
  ikon?: string;
  warna?: string;
  config?: Record<string, unknown>;
}

export interface FeatureAttributes {
  [key: string]: unknown;
}

export interface InfrastructureFeature {
  id: string;
  infrastructure_type_id: string;
  attributes: FeatureAttributes;
  geom: Geometry;
  created_at?: string;
  updated_at?: string;
}

export interface InfrastructureSegmen {
  id: string;
  tipe_kode: string;
  parent_id?: string | null;
  namobj?: string;
  geom?: Geometry | null;
  panjang?: number | null;
  lebar?: number | null;
  kondisi?: string | null;
  status_kondisi?: string | null;
  tahun_pembangunan?: number | null;
  sumber_dana?: string | null;
  sumber_data?: string | null;
  status_aset?: string | null;
  status_parent?: boolean;
  status_verifikasi?: string | null;
  catatan_verifikasi?: string | null;
  verifikator?: string | null;
  user_id?: string | null;
  plotting_id?: string | null;
  foto_url?: string | null;
  keterangan?: string | null;
  atribut?: Record<string, unknown>;
  desa?: string | null;
  kecamatan?: string | null;
  id_desa?: number | string | null;
  id_kecamatan?: number | string | null;
  created_at?: string;
  updated_at?: string;
}

export interface InfrastructureArea {
  id: string;
  tipe_kode: string;
  parent_id?: string | null;
  namobj?: string;
  geom: Geometry;
  panjang?: number | null;
  lebar?: number | null;
  kondisi?: string | null;
  status_kondisi?: string | null;
  tahun_pembangunan?: number | null;
  sumber_dana?: string | null;
  sumber_data?: string | null;
  status_parent?: boolean;
  keterangan?: string | null;
  foto_url?: string | null;
  atribut?: Record<string, unknown>;
  desa?: string | null;
  kecamatan?: string | null;
  id_desa?: number | string | null;
  id_kecamatan?: number | string | null;
  created_at?: string;
  updated_at?: string;
}

export type EditorStore = EditorState & EditorStoreActions;
