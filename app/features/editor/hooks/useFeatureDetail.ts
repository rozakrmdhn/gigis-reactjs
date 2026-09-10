/**
 * Editor WebGIS - useFeatureDetail Hook
 * 
 * Mengambil data lengkap feature dari backend saat feature terpilih,
 * memvalidasi konsistensi tipe geometri, dan memperbarui EditorStore.
 */

import { useCallback, useEffect, useState } from 'react';
import type { GeometryType, InfrastructureFeature } from '../core/editor.types';
import { getInfrastructureFeature } from '../services/editorApi';
import { useEditorStore } from '../../../stores/editorStore';
import { validateGeometryType } from '../geometry/common/validation';

export interface UseFeatureDetailOptions {
  featureId: string | null;
  expectedGeometryType?: GeometryType | null;
  infrastructureTypeId?: string | null;
  enabled?: boolean;
}

export interface UseFeatureDetailResult {
  feature: InfrastructureFeature | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useFeatureDetail({
  featureId,
  expectedGeometryType,
  infrastructureTypeId,
  enabled = true,
}: UseFeatureDetailOptions): UseFeatureDetailResult {
  const [feature, setFeature] = useState<InfrastructureFeature | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const setOriginalGeometry = useEditorStore((s) => s.setOriginalGeometry);
  const setFormData = useEditorStore((s) => s.setFormData);

  const fetchFeature = useCallback(async () => {
    if (!featureId || !enabled) {
      setFeature(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getInfrastructureFeature(
        featureId,
        infrastructureTypeId ?? undefined
      );

      // Verifikasi konsistensi geometry type (§21)
      if (expectedGeometryType) {
        const validation = validateGeometryType(data.geom, expectedGeometryType);
        if (!validation.valid) {
          throw new Error(
            `Geometry type tidak konsisten: context="${expectedGeometryType}", feature="${data.geom.type}" (ID: ${data.id})`
          );
        }
      }

      setFeature(data);
      setOriginalGeometry(data.geom);
      setFormData(data.attributes);
      setError(null);
    } catch (err) {
      const resolvedError = err instanceof Error ? err : new Error(String(err));
      setError(resolvedError);
      setFeature(null);
    } finally {
      setIsLoading(false);
    }
  }, [featureId, expectedGeometryType, infrastructureTypeId, enabled, setOriginalGeometry, setFormData]);

  useEffect(() => {
    fetchFeature();
  }, [fetchFeature]);

  return {
    feature,
    isLoading,
    error,
    refetch: fetchFeature,
  };
}
