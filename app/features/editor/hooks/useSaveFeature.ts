/**
 * Editor WebGIS - useSaveFeature Hook (Tahap 8)
 * 
 * Hook untuk memvalidasi dan mengirim perubahan feature (PATCH) ke backend.
 */

import { useState, useCallback } from 'react';
import { useEditorStore } from '../../../stores/editorStore';
import type { FormSchema, GeometryType } from '../core/editor.types';
import { validateFormData, validateGeometryNotEmpty, validateGeometryType } from '../geometry/common/validation';
import { updateInfrastructureFeature, type UpdateFeatureResult } from '../services/editorApi';
import type { Geometry } from 'geojson';

export interface SaveFeatureOptions {
  featureId: string | null;
  infrastructureTypeId?: string | null;
  expectedGeometryType?: GeometryType | null;
  formSchema?: FormSchema;
  onSaveSuccess?: (geometry: Geometry) => void;
}

export function useSaveFeature(options: SaveFeatureOptions) {
  const {
    featureId,
    infrastructureTypeId,
    expectedGeometryType,
    formSchema,
    onSaveSuccess,
  } = options;

  const [saveError, setSaveError] = useState<string | null>(null);

  const isSaving = useEditorStore((s) => s.isSaving);
  const setIsSaving = useEditorStore((s) => s.setIsSaving);
  const setValidationErrors = useEditorStore((s) => s.setValidationErrors);
  const setOriginalGeometry = useEditorStore((s) => s.setOriginalGeometry);
  const resetDraft = useEditorStore((s) => s.resetDraft);

  const save = useCallback(async (): Promise<UpdateFeatureResult | null> => {
    if (!featureId) {
      const err = 'Tidak ada feature yang dipilih untuk disimpan.';
      setSaveError(err);
      setValidationErrors([err]);
      return null;
    }

    const { formData, geometry } = useEditorStore.getState();

    // 1. Validasi form data
    const formValidation = validateFormData(formData, formSchema);
    if (!formValidation.valid) {
      const errors = Object.values(formValidation.errors);
      setValidationErrors(errors);
      setSaveError(errors[0] || 'Terdapat kesalahan validasi form.');
      return null;
    }

    // 2. Validasi kelengkapan geometri
    const geomValidation = validateGeometryNotEmpty(geometry);
    if (!geomValidation.valid) {
      setValidationErrors(geomValidation.errors);
      setSaveError(geomValidation.errors[0] || 'Geometri tidak valid.');
      return null;
    }

    // 3. Validasi kesesuaian tipe geometri
    if (expectedGeometryType) {
      const typeValidation = validateGeometryType(geometry, expectedGeometryType);
      if (!typeValidation.valid) {
        setValidationErrors(typeValidation.errors);
        setSaveError(typeValidation.errors[0]);
        return null;
      }
    }

    setSaveError(null);
    setValidationErrors([]);
    setIsSaving(true);

    try {
      const result = await updateInfrastructureFeature(
        featureId,
        {
          attributes: formData,
          geom: geometry!,
        },
        infrastructureTypeId || undefined
      );

      // Sukses: update original geometry ke versi yang baru disimpan dan reset dirty
      setOriginalGeometry(geometry);
      resetDraft();
      onSaveSuccess?.(geometry!);

      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setSaveError(msg);
      setValidationErrors([msg]);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [
    featureId,
    infrastructureTypeId,
    expectedGeometryType,
    formSchema,
    onSaveSuccess,
    setIsSaving,
    setValidationErrors,
    setOriginalGeometry,
    resetDraft,
  ]);

  return {
    save,
    isSaving,
    saveError,
  };
}

export default useSaveFeature;
