/**
 * Editor WebGIS - Selected Feature Style
 * 
 * Style highlight visual saat feature dipilih di peta.
 * Ditentukan dinamis berdasarkan geometryType dari EditorContext.
 */

import { Style, Stroke, Fill, Circle as CircleStyle } from 'ol/style';
import type { GeometryType } from '../../core/editor.types';

/**
 * Mendapatkan OpenLayers Style highlight sesuai geometryType
 */
export function getSelectedStyle(geometryType: GeometryType): Style {
  switch (geometryType) {
    case 'Point':
      return new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({
            color: '#2563EB', // Blue 600
          }),
          stroke: new Stroke({
            color: '#FFFFFF',
            width: 2.5,
          }),
        }),
      });

    case 'LineString':
      return new Style({
        stroke: new Stroke({
          color: '#2563EB',
          width: 5,
        }),
      });

    case 'Polygon':
      return new Style({
        fill: new Fill({
          color: 'rgba(37, 99, 235, 0.25)', // Blue with opacity
        }),
        stroke: new Stroke({
          color: '#2563EB',
          width: 3,
        }),
      });
  }
}
