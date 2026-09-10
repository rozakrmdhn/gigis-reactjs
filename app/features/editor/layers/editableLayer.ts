/**
 * Editor WebGIS - Editable Layer
 * 
 * Layer untuk feature yang sedang dipilih, diedit, atau didigitasi (GeoJSON).
 */

import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import type { Geometry as GeoJsonGeometry } from 'geojson';
import { geoJsonToFeature } from '../geometry/common/geoJsonConverter';

export interface EditableLayerInstance {
  layer: VectorLayer<VectorSource<Feature<Geometry>>>;
  source: VectorSource<Feature<Geometry>>;
}

import { Style, Stroke, Fill, Circle as CircleStyle } from 'ol/style';

let activeEditableLayer: EditableLayerInstance | null = null;

/**
 * Style standar berkontras tinggi untuk editable layer
 */
export const editableLayerStyle = new Style({
  stroke: new Stroke({
    color: '#2563EB', // Blue 600
    width: 5,
  }),
  fill: new Fill({
    color: 'rgba(37, 99, 235, 0.25)',
  }),
  image: new CircleStyle({
    radius: 8,
    fill: new Fill({
      color: '#2563EB',
    }),
    stroke: new Stroke({
      color: '#FFFFFF',
      width: 2.5,
    }),
  }),
});

/**
 * Membuat VectorLayer dan VectorSource untuk editing
 */
export function createEditableLayer(): EditableLayerInstance {
  if (activeEditableLayer) {
    return activeEditableLayer;
  }

  const source = new VectorSource<Feature<Geometry>>({
    wrapX: false,
  });

  const layer = new VectorLayer({
    source,
    style: editableLayerStyle,
    properties: {
      id: 'editable-layer',
      isEditableLayer: true,
    },
    zIndex: 100,
  });

  activeEditableLayer = { layer, source };
  return activeEditableLayer;
}

/**
 * Mendapatkan instance editable layer & source saat ini
 */
export function getEditableLayer(): EditableLayerInstance | null {
  return activeEditableLayer;
}

/**
 * Mengatur instance editable layer
 */
export function setEditableLayer(instance: EditableLayerInstance | null): void {
  activeEditableLayer = instance;
}

/**
 * Memuat geometry GeoJSON ke editable VectorSource
 */
export function loadFeatureToEditableLayer(
  source: VectorSource<Feature<Geometry>>,
  featureId?: string | null,
  geometry?: GeoJsonGeometry | null
): Feature<Geometry> | null {
  if (!geometry) return null;

  source.clear();
  const olFeature = geoJsonToFeature(geometry, featureId || undefined);
  source.addFeature(olFeature);
  return olFeature;
}

/**
 * Membersihkan semua feature dari editable layer
 */
export function clearEditableLayer(source?: VectorSource<Feature<Geometry>> | null): void {
  if (source) {
    source.clear();
  } else if (activeEditableLayer?.source) {
    activeEditableLayer.source.clear();
  }
}

/**
 * Membersihkan data feature di editable layer
 */
export function clearEditableLayerSource(): void {
  clearEditableLayer();
}

/**
 * Membersihkan instance editable layer
 */
export function destroyEditableLayer(): void {
  clearEditableLayerSource();
  activeEditableLayer = null;
}
