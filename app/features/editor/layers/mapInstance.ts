/**
 * Editor WebGIS - OpenLayers Map Instance Manager
 * 
 * Mengelola lifecycle instance ol/Map di luar React state.
 */

import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
import { DEFAULT_EDITOR_CONFIG } from '../core/editor.config';

export interface MapInitConfig {
  /** Center koordinat dalam [lon, lat] (EPSG:4326) */
  center?: [number, number];
  /** Zoom level default */
  zoom?: number;
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
}

let activeMapInstance: Map | null = null;

const DEFAULT_CENTER: [number, number] = [110.3695, -7.7956]; // Default Center (Indonesia / DIY)
const DEFAULT_ZOOM = 13;

/**
 * Membuat dan menginisialisasi instance ol/Map
 */
export function createMap(target: string | HTMLElement, config?: Partial<MapInitConfig>): Map {
  if (activeMapInstance) {
    activeMapInstance.setTarget(undefined);
    activeMapInstance.dispose();
    activeMapInstance = null;
  }

  const centerCoords = config?.center ?? DEFAULT_CENTER;
  const zoomLevel = config?.zoom ?? DEFAULT_ZOOM;

  const baseTileLayer = new TileLayer({
    source: new OSM(),
    properties: {
      id: 'basemap-osm',
      isBaseLayer: true,
    },
  });

  const map = new Map({
    target,
    layers: [baseTileLayer],
    view: new View({
      projection: DEFAULT_EDITOR_CONFIG.mapProjection,
      center: fromLonLat(centerCoords, DEFAULT_EDITOR_CONFIG.mapProjection),
      zoom: zoomLevel,
      minZoom: config?.minZoom ?? 5,
      maxZoom: config?.maxZoom ?? 20,
    }),
    controls: [], // Controls dapat dikustomisasi via UI React
  });

  activeMapInstance = map;
  return map;
}

/**
 * Mendapatkan instance ol/Map yang sedang aktif
 */
export function getMap(): Map | null {
  return activeMapInstance;
}

/**
 * Mengatur instance ol/Map aktif
 */
export function setMap(map: Map | null): void {
  activeMapInstance = map;
}

/**
 * Membersihkan instance ol/Map
 */
export function destroyMap(): void {
  if (activeMapInstance) {
    activeMapInstance.setTarget(undefined);
    activeMapInstance.dispose();
    activeMapInstance = null;
  }
}
