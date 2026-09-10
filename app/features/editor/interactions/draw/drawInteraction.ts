/**
 * Editor WebGIS - Dynamic Draw Interaction
 * 
 * Draw interaction OpenLayers yang sepenuhnya dinamis berdasarkan geometryType
 * dari EditorContext. Tidak memiliki default type statis.
 */

import Draw from 'ol/interaction/Draw';
import type VectorSource from 'ol/source/Vector';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import type { StyleLike } from 'ol/style/Style';
import type { GeometryType } from '../../core/editor.types';
import { getDrawStyle } from './drawStyle';

export interface DrawInteractionOptions {
  source: VectorSource<Feature<Geometry>>;
  /** Geometry type dinamis dari EditorContext (Point | LineString | Polygon) */
  geometryType: GeometryType;
  style?: StyleLike;
  onDrawStart?: (feature: Feature<Geometry>) => void;
  onDrawEnd?: (feature: Feature<Geometry>) => void;
  onDrawAbort?: () => void;
}

/**
 * Membuat interaksi Draw dinamis tanpa hard-code geometry type
 */
export function createDrawInteraction(options: DrawInteractionOptions): Draw {
  const draw = new Draw({
    source: options.source,
    type: options.geometryType,
    style: options.style ?? getDrawStyle(),
  });

  if (options.onDrawStart) {
    draw.on('drawstart', (event) => {
      options.onDrawStart?.(event.feature);
    });
  }

  if (options.onDrawEnd) {
    draw.on('drawend', (event) => {
      options.onDrawEnd?.(event.feature);
    });
  }

  if (options.onDrawAbort) {
    draw.on('drawabort', () => {
      options.onDrawAbort?.();
    });
  }

  return draw;
}
