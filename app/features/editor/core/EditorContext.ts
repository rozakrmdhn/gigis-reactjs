/**
 * Editor WebGIS - Context Builder
 * 
 * Membentuk EditorContext berdasarkan input dinamis infrastruktur_tipe
 */

import type { EditorCapabilities, EditorContext, GeometryType } from './editor.types';
import { resolveCapabilities } from '../capabilities/editorCapabilities';

/**
 * Membangun EditorContext secara dinamis tanpa asumsi default geometry
 */
export function buildEditorContext(
  infrastructureTypeId: string,
  geometryType: GeometryType,
  capabilitiesOverride?: Partial<EditorCapabilities>
): EditorContext {
  const capabilities = resolveCapabilities(geometryType, capabilitiesOverride);

  return {
    infrastructureTypeId,
    geometryType,
    capabilities,
  };
}

/**
 * Validasi apakah string merupakan GeometryType yang didukung
 */
export function isSupportedGeometryType(type: string): type is GeometryType {
  return type === 'Point' || type === 'LineString' || type === 'Polygon';
}

/**
 * Normalisasi string geometry type dari backend (e.g. 'LINESTRING' -> 'LineString')
 */
export function normalizeGeometryType(type: string): GeometryType | null {
  if (isSupportedGeometryType(type)) {
    return type;
  }
  const upper = type?.toUpperCase?.();
  if (upper === 'POINT') return 'Point';
  if (upper === 'LINESTRING') return 'LineString';
  if (upper === 'POLYGON') return 'Polygon';
  return null;
}
