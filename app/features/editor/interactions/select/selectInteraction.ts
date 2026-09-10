/**
 * Editor WebGIS - Select Interaction
 * 
 * Interaksi pemilihan feature OpenLayers untuk semua geometry type.
 */

import Select from 'ol/interaction/Select';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import type Layer from 'ol/layer/Layer';
import type Map from 'ol/Map';
import type { StyleLike } from 'ol/style/Style';
import { click } from 'ol/events/condition';

export interface SelectInteractionOptions {
  layers?: Layer[];
  style?: StyleLike;
  onSelect?: (feature: Feature<Geometry> | null) => void;
  onDeselect?: () => void;
}

/**
 * Ekstraksi ID feature dari instance ol/Feature
 */
export function getFeatureId(feature: Feature<Geometry>): string | null {
  const directId = feature.getId();
  if (directId !== undefined && directId !== null && directId !== '') {
    return String(directId);
  }

  const props = feature.getProperties?.();
  const propId = props?.id ?? props?.uuid ?? props?.feature_id ?? props?.kode;
  if (propId !== undefined && propId !== null && propId !== '') {
    return String(propId);
  }

  return null;
}

/**
 * Membuat interaksi Select OpenLayers
 */
export function createSelectInteraction(options: SelectInteractionOptions): Select {
  const select = new Select({
    condition: click,
    layers: options.layers,
    style: options.style,
    multi: false,
  });

  select.on('select', (event) => {
    const selectedFeatures = event.selected;
    if (selectedFeatures.length > 0) {
      const selectedFeature = selectedFeatures[0] as Feature<Geometry>;
      options.onSelect?.(selectedFeature);
    } else if (event.deselected.length > 0) {
      options.onSelect?.(null);
      options.onDeselect?.();
    }
  });

  return select;
}

/**
 * Mengubah kursor menjadi pointer saat hover di atas feature yang dapat dipilih
 */
export function setupHoverCursor(
  map: Map,
  layerFilter?: (layer: Layer) => boolean
): () => void {
  const handlePointerMove = (event: { pixel: number[] }) => {
    const hit = map.hasFeatureAtPixel(event.pixel, {
      layerFilter,
      hitTolerance: 6,
    });

    const targetElement = map.getTargetElement();
    if (targetElement) {
      targetElement.style.cursor = hit ? 'pointer' : '';
    }
  };

  map.on('pointermove', handlePointerMove);

  return () => {
    map.un('pointermove', handlePointerMove);
    const targetElement = map.getTargetElement();
    if (targetElement) {
      targetElement.style.cursor = '';
    }
  };
}
