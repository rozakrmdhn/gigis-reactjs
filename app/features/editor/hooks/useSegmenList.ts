/**
 * Editor WebGIS - useSegmenList Hook
 * 
 * Hook untuk memuat, membuat, mengupdate, menghapus, dan mengajukan data segmen
 * untuk suatu master feature infrastruktur.
 */

import { useState, useEffect, useCallback } from 'react';
import type { InfrastructureSegmen } from '../core/editor.types';
import { 
  listInfrastructureSegmen, 
  createInfrastructureSegmen, 
  updateInfrastructureSegmen, 
  deleteInfrastructureSegmen,
  submitSegmenBappeda,
  verifySegmenBappeda 
} from '../services/editorApi';

export interface UseSegmenListOptions {
  tipeKode: string | null;
  parentId?: string | null;
  enabled?: boolean;
}

export function useSegmenList({ tipeKode, parentId, enabled = true }: UseSegmenListOptions) {
  const [segmenList, setSegmenList] = useState<InfrastructureSegmen[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSegmen = useCallback(async () => {
    if (!tipeKode || !enabled) {
      setSegmenList([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await listInfrastructureSegmen(tipeKode, parentId);
      setSegmenList(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [tipeKode, parentId, enabled]);

  useEffect(() => {
    fetchSegmen();
  }, [fetchSegmen]);

  const addSegmen = useCallback(
    async (payload: Partial<InfrastructureSegmen>) => {
      if (!tipeKode) throw new Error('Tipe infrastruktur belum ditentukan.');
      const result = await createInfrastructureSegmen(tipeKode, payload, parentId);
      await fetchSegmen();
      return result;
    },
    [tipeKode, parentId, fetchSegmen]
  );

  const editSegmen = useCallback(
    async (segmenId: string, payload: Partial<InfrastructureSegmen>) => {
      if (!tipeKode) throw new Error('Tipe infrastruktur belum ditentukan.');
      const result = await updateInfrastructureSegmen(tipeKode, segmenId, payload);
      await fetchSegmen();
      return result;
    },
    [tipeKode, fetchSegmen]
  );

  const removeSegmen = useCallback(
    async (segmenId: string) => {
      if (!tipeKode) throw new Error('Tipe infrastruktur belum ditentukan.');
      const result = await deleteInfrastructureSegmen(tipeKode, segmenId);
      await fetchSegmen();
      return result;
    },
    [tipeKode, fetchSegmen]
  );

  const submitToBappeda = useCallback(
    async (segmenId: string) => {
      if (!tipeKode) throw new Error('Tipe infrastruktur belum ditentukan.');
      const result = await submitSegmenBappeda(tipeKode, segmenId);
      await fetchSegmen();
      return result;
    },
    [tipeKode, fetchSegmen]
  );

  const verifySegmen = useCallback(
    async (segmenId: string, payload: { status_verifikasi: string; catatan_verifikasi?: string }) => {
      if (!tipeKode) throw new Error('Tipe infrastruktur belum ditentukan.');
      const result = await verifySegmenBappeda(tipeKode, segmenId, payload);
      await fetchSegmen();
      return result;
    },
    [tipeKode, fetchSegmen]
  );

  return {
    segmenList,
    isLoading,
    error,
    refetch: fetchSegmen,
    addSegmen,
    editSegmen,
    removeSegmen,
    submitToBappeda,
    verifySegmen,
  };
}

export default useSegmenList;
