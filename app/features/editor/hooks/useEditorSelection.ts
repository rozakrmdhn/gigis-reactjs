/**
 * Editor WebGIS - useEditorSelection Hook
 * 
 * Hook helper untuk mengelola state seleksi feature di editor
 */

import { useCallback } from 'react';
import { useEditorStore } from '../../../stores/editorStore';
import type { Geometry } from 'geojson';

export function useEditorSelection() {
  const selectedFeatureId = useEditorStore((s) => s.selectedFeatureId);
  const editingFeatureId = useEditorStore((s) => s.editingFeatureId);
  const geometry = useEditorStore((s) => s.geometry);
  const originalGeometry = useEditorStore((s) => s.originalGeometry);
  const formData = useEditorStore((s) => s.formData);
  const isDirty = useEditorStore((s) => s.isDirty);

  const setSelectedFeatureId = useEditorStore((s) => s.setSelectedFeatureId);
  const setEditingFeatureId = useEditorStore((s) => s.setEditingFeatureId);
  const setGeometry = useEditorStore((s) => s.setGeometry);
  const setOriginalGeometry = useEditorStore((s) => s.setOriginalGeometry);
  const setFormData = useEditorStore((s) => s.setFormData);
  const updateFormField = useEditorStore((s) => s.updateFormField);
  const resetDraft = useEditorStore((s) => s.resetDraft);

  const selectFeature = useCallback(
    (id: string | null) => {
      setSelectedFeatureId(id);
    },
    [setSelectedFeatureId]
  );

  const onMapFeatureSelected = useCallback(
    (id: string | null) => {
      setSelectedFeatureId(id);
    },
    [setSelectedFeatureId]
  );

  const startEditing = useCallback(
    (id: string, initialGeometry: Geometry, initialFormData: Record<string, unknown> = {}) => {
      setEditingFeatureId(id);
      setSelectedFeatureId(id);
      setOriginalGeometry(initialGeometry);
      setFormData(initialFormData);
    },
    [setEditingFeatureId, setSelectedFeatureId, setOriginalGeometry, setFormData]
  );

  const onFormChange = useCallback(
    (key: string, value: unknown) => {
      updateFormField(key, value);
    },
    [updateFormField]
  );

  const cancelEditing = useCallback(() => {
    resetDraft();
    setEditingFeatureId(null);
  }, [resetDraft, setEditingFeatureId]);

  return {
    selectedFeatureId,
    editingFeatureId,
    geometry,
    originalGeometry,
    formData,
    isDirty,
    isSelected: selectedFeatureId !== null,
    isEditing: editingFeatureId !== null,
    selectFeature,
    onMapFeatureSelected,
    onFormChange,
    setEditingFeatureId,
    startEditing,
    cancelEditing,
    updateGeometry: setGeometry,
    updateFormField,
  };
}
