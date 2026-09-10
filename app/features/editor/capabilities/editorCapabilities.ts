/**
 * Editor WebGIS - Capabilities Resolution
 * 
 * Menentukan kapabilitas editor secara dinamis berdasarkan GeometryType.
 * Tidak bergantung pada nama infrastruktur bisnis.
 */

import type { EditorCapabilities, EditorTool, GeometryType } from '../core/editor.types';

/**
 * Mengembalikan capabilities default berdasarkan geometry type
 */
export function getDefaultCapabilities(geometryType: GeometryType): EditorCapabilities {
  switch (geometryType) {
    case 'Point':
      return {
        select: true,
        draw: true,
        modify: true,
        snap: true,
        delete: true,
        split: false,
        merge: false,
        extend: false,
      };

    case 'LineString':
      return {
        select: true,
        draw: true,
        modify: true,
        snap: true,
        delete: true,
        split: true,
        merge: true,
        extend: true,
      };

    case 'Polygon':
      return {
        select: true,
        draw: true,
        modify: true,
        snap: true,
        delete: true,
        split: true,
        merge: true,
        extend: false,
      };
  }
}

/**
 * Menggabungkan default capabilities dengan override dari konfigurasi master data
 */
export function resolveCapabilities(
  geometryType: GeometryType,
  overrides?: Partial<EditorCapabilities>
): EditorCapabilities {
  const defaults = getDefaultCapabilities(geometryType);
  if (!overrides) {
    return defaults;
  }
  return {
    ...defaults,
    ...overrides,
  };
}

/**
 * Memeriksa apakah tool didukung oleh capabilities saat ini
 */
export function isToolSupported(
  capabilities: EditorCapabilities,
  tool: EditorTool
): boolean {
  return Boolean(capabilities[tool]);
}
