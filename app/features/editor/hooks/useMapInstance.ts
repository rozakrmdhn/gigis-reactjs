/**
 * Editor WebGIS - useMapInstance Hook
 * 
 * Hook untuk mengelola lifecycle OpenLayers Map & Layers
 */

import { useEffect, useState, useRef } from 'react';
import type Map from 'ol/Map';
import type VectorTileLayer from 'ol/layer/VectorTile';
import { createMap, getMap, destroyMap, type MapInitConfig } from '../layers/mapInstance';
import { createReferenceLayer, getReferenceLayer, clearReferenceLayer } from '../layers/referenceLayer';
import { createEditableLayer, getEditableLayer, destroyEditableLayer, type EditableLayerInstance } from '../layers/editableLayer';

export interface UseMapInstanceOptions extends MapInitConfig {
  targetId: string;
}

export function useMapInstance({
  targetId,
  center,
  zoom,
  minZoom,
  maxZoom,
}: UseMapInstanceOptions) {
  const [isReady, setIsReady] = useState(false);
  const mapRef = useRef<Map | null>(null);

  useEffect(() => {
    // 1. Inisialisasi Map
    const map = createMap(targetId, {
      center,
      zoom,
      minZoom,
      maxZoom,
    });
    mapRef.current = map;

    // 2. Tambahkan Reference Layer (MVT)
    const refLayer = createReferenceLayer();
    map.addLayer(refLayer);

    // 3. Tambahkan Editable Layer (Vector)
    const { layer: editLayer } = createEditableLayer();
    map.addLayer(editLayer);

    setIsReady(true);

    return () => {
      setIsReady(false);
      destroyEditableLayer();
      clearReferenceLayer();
      destroyMap();
      mapRef.current = null;
    };
  }, [targetId, center, zoom, minZoom, maxZoom]);

  return {
    isReady,
    getMap,
    getEditableLayer,
    getReferenceLayer,
  };
}
