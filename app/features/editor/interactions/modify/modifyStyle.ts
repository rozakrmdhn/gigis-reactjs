import Style from 'ol/style/Style';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';

/**
 * Mendapatkan OpenLayers Style untuk vertex handle saat mode Modify aktif
 */
export function getModifyStyle(): Style {
  return new Style({
    image: new CircleStyle({
      radius: 8,
      fill: new Fill({
        color: '#FFFFFF',
      }),
      stroke: new Stroke({
        color: '#2563EB', // Blue 600
        width: 3,
      }),
    }),
  });
}
