/**
 * Editor WebGIS - useAreaList Hook
 * 
 * Hook untuk memuat dan mengelola data area poligon pendukung.
 */

import { useState, useEffect, useCallback } from 'react';
import type { InfrastructureArea } from '../core/editor.types';
import type { FeatureCollection } from 'geojson';
import { 
  listInfrastructureAreaGeoJSON, 
  createInfrastructureArea, 
  updateInfrastructureArea, 
  deleteInfrastructureArea 
} from '../services/editorApi';

export interface UseAreaListOptions {
  tipeKode: string | null;
  parentId?: string | null;
  enabled?: boolean;
}

export function useAreaList({ tipeKode, parentId, enabled = true }: UseAreaListOptions) {
  const [areaGeoJSON, setAreaGeoJSON] = useState<FeatureCollection | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchArea = useCallback(async () => {
    if (!tipeKode || !enabled) {
      setAreaGeoJSON(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await listInfrastructureAreaGeoJSON(tipeKode, parentId);
      setAreaGeoJSON(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [tipeKode, parentId, enabled]);

  useEffect(() => {
    fetchArea();
  }, [fetchArea]);

  const addArea = useCallback(
    async (payload: Partial<InfrastructureArea>) => {
      if (!tipeKode) throw new Error('Tipe infrastruktur belum ditentukan.');
      const result = await createInfrastructureArea(tipeKode, { ...payload, parent_id: parentId });
      await fetchArea();
      return result;
    },
    [tipeKode, parentId, fetchArea]
  );

  const editArea = useCallback(
    async (areaId: string, payload: Partial<InfrastructureArea>) => {
      if (!tipeKode) throw new Error('Tipe infrastruktur belum ditentukan.');
      const result = await updateInfrastructureArea(tipeKode, areaId, payload);
      await fetchArea();
      return result;
    },
    [tipeKode, fetchArea]
  );

  const removeArea = useCallback(
    async (areaId: string) => {
      if (!tipeKode) throw new Error('Tipe infrastruktur belum ditentukan.');
      const result = await deleteInfrastructureArea(tipeKode, areaId);
      await fetchArea();
      return result;
    },
    [tipeKode, fetchArea]
  );

  return {
    areaGeoJSON,
    isLoading,
    error,
    refetch: fetchArea,
    addArea,
    editArea,
    removeArea,
  };
}

export default useAreaList;
