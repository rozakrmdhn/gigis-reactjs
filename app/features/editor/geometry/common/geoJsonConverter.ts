/**
 * Editor WebGIS - GeoJSON & OpenLayers Converter
 * 
 * Konversi dua arah antara GeoJSON (EPSG:4326) dan OpenLayers Feature (EPSG:3857)
 * dengan reprojektion sesuai konfigurasi editor.
 */

import GeoJSON from 'ol/format/GeoJSON';
import type { Feature } from 'ol';
import type { Geometry as OlGeometry } from 'ol/geom';
import type { Geometry as GeoJsonGeometry } from 'geojson';
import { DEFAULT_EDITOR_CONFIG } from '../../core/editor.config';

const geoJsonFormat = new GeoJSON();

function getCoordinateProjection(rawGeom: any): string {
  if (!rawGeom || !rawGeom.coordinates) return DEFAULT_EDITOR_CONFIG.dataProjection;
  let sample = rawGeom.coordinates;
  while (Array.isArray(sample) && sample.length > 0 && Array.isArray(sample[0])) {
    sample = sample[0];
  }
  if (Array.isArray(sample) && typeof sample[0] === 'number') {
    const x = sample[0];
    const y = sample[1];
    if (Math.abs(x) > 180 || Math.abs(y) > 90) {
      return DEFAULT_EDITOR_CONFIG.mapProjection; // EPSG:3857
    }
  }
  return DEFAULT_EDITOR_CONFIG.dataProjection; // EPSG:4326
}

/**
 * Konversi GeoJSON Geometry ke OpenLayers Feature dengan reprojektion (4326 -> 3857)
 */
export function geoJsonToFeature(
  geojson: any,
  featureId?: string
): Feature<OlGeometry> {
  if (!geojson) {
    throw new Error('Geometri kosong');
  }

  let geomObj = geojson;
  if (typeof geomObj === 'string') {
    try {
      geomObj = JSON.parse(geomObj);
    } catch {
      // bukan JSON string
    }
  }

  const rawGeom = geomObj.type === 'Feature' ? geomObj.geometry : (geomObj.geometry || geomObj);
  const dataProj = getCoordinateProjection(rawGeom);

  // Jika input adalah GeoJSON Feature lengkap
  if (geomObj.type === 'Feature') {
    return geoJsonFormat.readFeature(geomObj, {
      dataProjection: dataProj,
      featureProjection: DEFAULT_EDITOR_CONFIG.mapProjection,
    }) as Feature<OlGeometry>;
  }

  const feature = geoJsonFormat.readFeature(
    {
      type: 'Feature',
      id: featureId,
      geometry: rawGeom,
      properties: featureId ? { id: featureId } : {},
    },
    {
      dataProjection: dataProj,
      featureProjection: DEFAULT_EDITOR_CONFIG.mapProjection,
    }
  ) as Feature<OlGeometry>;

  if (featureId) {
    feature.setId(featureId);
  }

  return feature;
}

/**
 * Konversi OpenLayers Feature ke GeoJSON Geometry dengan reprojektion (3857 -> 4326)
 */
export function featureToGeoJson(feature: Feature<OlGeometry>): GeoJsonGeometry {
  const geometry = feature.getGeometry();
  if (!geometry) {
    throw new Error('Feature tidak memiliki objek geometri.');
  }

  const geojsonFeature = geoJsonFormat.writeFeatureObject(feature, {
    dataProjection: DEFAULT_EDITOR_CONFIG.dataProjection,
    featureProjection: DEFAULT_EDITOR_CONFIG.mapProjection,
  });

  return geojsonFeature.geometry;
}

/**
 * Ekstraksi objek GeoJSON Geometry dari OpenLayers Feature
 */
export function extractGeometryFromFeature(
  feature: Feature<OlGeometry> | undefined | null
): GeoJsonGeometry | null {
  if (!feature) return null;

  try {
    return featureToGeoJson(feature);
  } catch (error) {
    console.error('[geoJsonConverter] Gagal mengekstrak geometri dari feature:', error);
    return null;
  }
}
