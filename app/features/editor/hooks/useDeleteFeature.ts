/**
 * Editor WebGIS - useDeleteFeature Hook (Tahap 12)
 *
 * Hook untuk menghapus feature infrastruktur dengan konfirmasi.
 * Menggunakan `deleteInfrastructureFeature()` dari editorApi.
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { deleteInfrastructureFeature } from '../services/editorApi';
import { useEditorStore } from '../../../stores/editorStore';

export interface DeleteFeatureOptions {
  /** ID feature yang akan dihapus (dari selectedFeatureId store) */
  featureId: string | null;
  /** Kode tipe infrastruktur, dibutuhkan untuk URL endpoint */
  infrastructureTypeId?: string | null;
  /** Callback dipanggil setelah penghapusan berhasil */
  onDeleteSuccess?: () => void;
}

export function useDeleteFeature(options: DeleteFeatureOptions) {
  const { featureId, infrastructureTypeId, onDeleteSuccess } = options;

  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const resetDraft = useEditorStore((s) => s.resetDraft);
  const setSelectedFeatureId = useEditorStore((s) => s.setSelectedFeatureId);

  /** Meminta konfirmasi penghapusan — membuka dialog */
  const requestDelete = useCallback(() => {
    if (!featureId) {
      toast.warning('Pilih feature terlebih dahulu sebelum menghapus.');
      return;
    }
    setShowConfirm(true);
  }, [featureId]);

  /** Eksekusi penghapusan setelah user konfirmasi */
  const confirmDelete = useCallback(async () => {
    if (!featureId || !infrastructureTypeId) {
      toast.error('Tipe infrastruktur atau ID feature tidak tersedia.');
      setShowConfirm(false);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteInfrastructureFeature(featureId, infrastructureTypeId);
      toast.success('Feature berhasil dihapus.');
      // Reset state editor
      setSelectedFeatureId(null);
      resetDraft();
      onDeleteSuccess?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Gagal menghapus feature: ${msg}`);
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  }, [featureId, infrastructureTypeId, onDeleteSuccess, setSelectedFeatureId, resetDraft]);

  /** Batalkan dialog konfirmasi */
  const cancelDelete = useCallback(() => {
    setShowConfirm(false);
  }, []);

  return {
    /** Buka dialog konfirmasi hapus */
    requestDelete,
    /** Eksekusi penghapusan (setelah konfirmasi) */
    confirmDelete,
    /** Tutup dialog tanpa hapus */
    cancelDelete,
    /** Apakah proses DELETE sedang berjalan */
    isDeleting,
    /** Apakah dialog konfirmasi terbuka */
    showConfirm,
  };
}

export default useDeleteFeature;
