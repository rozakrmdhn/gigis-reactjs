/**
 * Editor WebGIS - Snap Interaction
 * 
 * Snap interaction OpenLayers untuk membantu presisi saat digitasi / editing.
 */

import Snap from 'ol/interaction/Snap';
import type VectorSource from 'ol/source/Vector';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import { DEFAULT_EDITOR_CONFIG } from '../../core/editor.config';

export interface SnapInteractionOptions {
  source: VectorSource<Feature<Geometry>>;
  pixelTolerance?: number;
}

/**
 * Membuat interaksi Snap ke VectorSource
 */
export function createSnapInteraction(options: SnapInteractionOptions): Snap {
  return new Snap({
    source: options.source,
    pixelTolerance: options.pixelTolerance ?? DEFAULT_EDITOR_CONFIG.snapPixelTolerance,
  });
}
