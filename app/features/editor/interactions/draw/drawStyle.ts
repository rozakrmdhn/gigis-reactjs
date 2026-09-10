/**
 * Editor WebGIS - Draw Interaction Styling
 * 
 * Visual styling untuk preview dan feature yang sedang didigitasi pada mode Draw.
 */

import { Style, Circle as CircleStyle, Fill, Stroke } from 'ol/style';

/**
 * Mendapatkan OpenLayers Style untuk interaksi Draw
 */
export function getDrawStyle(): Style[] {
  return [
    new Style({
      stroke: new Stroke({
        color: '#16A34A', // Emerald 600
        width: 3,
        lineDash: [6, 6],
      }),
      fill: new Fill({
        color: 'rgba(22, 163, 74, 0.15)',
      }),
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({
          color: '#16A34A',
        }),
        stroke: new Stroke({
          color: '#FFFFFF',
          width: 2,
        }),
      }),
    }),
  ];
}
