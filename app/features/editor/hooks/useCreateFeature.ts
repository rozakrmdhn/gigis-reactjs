/**
 * Editor WebGIS - useCreateFeature Hook (Tahap 10)
 * 
 * Hook untuk memvalidasi dan mengirim pembuatan feature baru (POST) ke backend.
 */

import { useState, useCallback } from 'react';
import { useEditorStore } from '../../../stores/editorStore';
import type { FormSchema } from '../core/editor.types';
import { validateFormData, validateGeometryNotEmpty } from '../geometry/common/validation';
import { createInfrastructureFeature, type CreateFeatureResult } from '../services/editorApi';
import { clearEditableLayerSource } from '../layers/editableLayer';

export interface CreateFeatureOptions {
  infrastructureTypeId: string | null;
  formSchema?: FormSchema;
  onCreateSuccess?: (newId: string) => void;
}

export function useCreateFeature(options: CreateFeatureOptions) {
  const { infrastructureTypeId, formSchema, onCreateSuccess } = options;

  const [createError, setCreateError] = useState<string | null>(null);

  const isSaving = useEditorStore((s) => s.isSaving);
  const setIsSaving = useEditorStore((s) => s.setIsSaving);
  const setValidationErrors = useEditorStore((s) => s.setValidationErrors);
  const setSelectedFeatureId = useEditorStore((s) => s.setSelectedFeatureId);
  const resetDraft = useEditorStore((s) => s.resetDraft);

  const create = useCallback(async (): Promise<CreateFeatureResult | null> => {
    if (!infrastructureTypeId) {
      const err = 'Tipe infrastruktur belum ditentukan.';
      setCreateError(err);
      setValidationErrors([err]);
      return null;
    }

    const { formData, geometry } = useEditorStore.getState();

    // 1. Validasi geometri sudah dibuat
    const geomValidation = validateGeometryNotEmpty(geometry);
    if (!geomValidation.valid) {
      setValidationErrors(geomValidation.errors);
      setCreateError(geomValidation.errors[0] || 'Geometri belum dibuat di peta.');
      return null;
    }

    // 2. Validasi form data
    const formValidation = validateFormData(formData, formSchema);
    if (!formValidation.valid) {
      const errors = Object.values(formValidation.errors);
      setValidationErrors(errors);
      setCreateError(errors[0] || 'Terdapat kesalahan validasi form.');
      return null;
    }

    setCreateError(null);
    setValidationErrors([]);
    setIsSaving(true);

    try {
      const result = await createInfrastructureFeature({
        infrastructure_type_id: infrastructureTypeId,
        attributes: formData,
        geom: geometry!,
      });

      // Sukses: reset draft, bersihkan layer edit digitasi sementara, dan pilih feature baru
      resetDraft();
      clearEditableLayerSource();
      if (result.id) {
        setSelectedFeatureId(result.id);
      }
      onCreateSuccess?.(result.id);

      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setCreateError(msg);
      setValidationErrors([msg]);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [
    infrastructureTypeId,
    formSchema,
    onCreateSuccess,
    setIsSaving,
    setValidationErrors,
    resetDraft,
    setSelectedFeatureId,
  ]);

  return {
    create,
    isSaving,
    createError,
  };
}

export default useCreateFeature;
