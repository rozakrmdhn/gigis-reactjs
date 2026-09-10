/**
 * Editor WebGIS - useEditorContext Hook
 * 
 * Hook untuk fetch dan build EditorContext secara dinamis dari API master data
 */

import { useCallback, useEffect, useState } from 'react';
import type { EditorContext, InfrastrukturTipeConfig } from '../core/editor.types';
import { buildEditorContext, isSupportedGeometryType } from '../core/EditorContext';
import { getInfrastrukturTipeConfig } from '../services/editorApi';

export interface UseEditorContextOptions {
  infrastructureTypeId: string;
  enabled?: boolean;
}

export interface UseEditorContextResult {
  context: EditorContext | null;
  config: InfrastrukturTipeConfig | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useEditorContext({
  infrastructureTypeId,
  enabled = true,
}: UseEditorContextOptions): UseEditorContextResult {
  const [context, setContext] = useState<EditorContext | null>(null);
  const [config, setConfig] = useState<InfrastrukturTipeConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchContext = useCallback(async () => {
    if (!infrastructureTypeId || !enabled) {
      setContext(null);
      setConfig(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const typeConfig = await getInfrastrukturTipeConfig(infrastructureTypeId);

      if (!isSupportedGeometryType(typeConfig.infrastruktur_tipe)) {
        throw new Error(
          `Geometry type tidak didukung: "${typeConfig.infrastruktur_tipe}" untuk infrastruktur "${infrastructureTypeId}". Nilai valid: Point | LineString | Polygon.`
        );
      }

      const editorContext = buildEditorContext(
        typeConfig.kode || typeConfig.id,
        typeConfig.infrastruktur_tipe,
        typeConfig.capabilities
      );

      setConfig(typeConfig);
      setContext(editorContext);
      setError(null);
    } catch (err) {
      const resolvedError = err instanceof Error ? err : new Error(String(err));
      setError(resolvedError);
      setContext(null);
      setConfig(null);
    } finally {
      setIsLoading(false);
    }
  }, [infrastructureTypeId, enabled]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  return {
    context,
    config,
    isLoading,
    error,
    refetch: fetchContext,
  };
}
