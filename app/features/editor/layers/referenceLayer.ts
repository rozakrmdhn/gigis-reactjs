/**
 * Editor WebGIS - Reference Layer (MVT / PMTiles Placeholder)
 * 
 * Layer untuk data besar (read-only): jaringan jalan, batas desa, dsb.
 */

import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';

let referenceLayerInstance: VectorTileLayer | null = null;

/**
 * Membuat VectorTileLayer untuk referensi peta
 */
export function createReferenceLayer(): VectorTileLayer {
  if (referenceLayerInstance) {
    return referenceLayerInstance;
  }

  const layer = new VectorTileLayer({
    declutter: true,
    source: new VectorTileSource({}),
    properties: {
      id: 'reference-layer',
      isReferenceLayer: true,
    },
  });

  referenceLayerInstance = layer;
  return layer;
}

export function getReferenceLayer(): VectorTileLayer | null {
  return referenceLayerInstance;
}

export function clearReferenceLayer(): void {
  referenceLayerInstance = null;
}
