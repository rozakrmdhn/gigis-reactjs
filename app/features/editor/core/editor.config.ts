/**
 * Editor WebGIS - Core Configurations
 * 
 * Konfigurasi umum untuk editor engine.
 * TIDAK memuat default geometry type.
 */

export interface EditorConfig {
  /** Snap tolerance dalam pixel */
  snapPixelTolerance: number;
  /** Max zoom level untuk snapping */
  minZoomForSnap: number;
  /** Koordinat proyeksi map default */
  mapProjection: string;
  /** Koordinat proyeksi penyimpanan data (GeoJSON / PostGIS) */
  dataProjection: string;
  /** Debounce delay (ms) untuk form attribute editing */
  formDebounceMs: number;
}

export const DEFAULT_EDITOR_CONFIG: EditorConfig = {
  snapPixelTolerance: 12,
  minZoomForSnap: 12,
  mapProjection: 'EPSG:3857',
  dataProjection: 'EPSG:4326',
  formDebounceMs: 300,
};
