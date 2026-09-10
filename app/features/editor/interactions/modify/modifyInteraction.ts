/**
 * Editor WebGIS - Dynamic Modify Interaction
 * 
 * Modify interaction OpenLayers yang bekerja seragam untuk semua geometry type.
 */

import Modify from 'ol/interaction/Modify';
import type VectorSource from 'ol/source/Vector';
import type Collection from 'ol/Collection';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import type { StyleLike } from 'ol/style/Style';
import { getModifyStyle } from './modifyStyle';

export interface ModifyInteractionOptions {
  source?: VectorSource<Feature<Geometry>>;
  features?: Collection<Feature<Geometry>>;
  style?: StyleLike;
  pixelTolerance?: number;
  onModifyStart?: () => void;
  onModifyEnd?: (features: Feature<Geometry>[]) => void;
}

export function createModifyInteraction(options: ModifyInteractionOptions): Modify {
  const modifyConfig: any = {
    style: options.style ?? getModifyStyle(),
    pixelTolerance: options.pixelTolerance ?? 20,
    insertVertexCondition: () => true,
  };

  if (options.features) {
    modifyConfig.features = options.features;
  } else if (options.source) {
    modifyConfig.source = options.source;
  }

  const modify = new Modify(modifyConfig);

  if (options.onModifyStart) {
    modify.on('modifystart', () => {
      options.onModifyStart?.();
    });
  }

  if (options.onModifyEnd) {
    modify.on('modifyend', (event) => {
      const features = event.features.getArray() as Feature<Geometry>[];
      options.onModifyEnd?.(features);
    });
  }

  return modify;
}
