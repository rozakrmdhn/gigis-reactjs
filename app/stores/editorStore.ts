/**
 * Editor WebGIS - Application Store (Zustand)
 * 
 * Mengelola state editor UI, draft editing, form, dan validasi.
 * TIDAK menyimpan runtime object OpenLayers (Map, Layer, Interaction, VectorSource).
 */

import { create } from 'zustand';
import type { EditorContext, EditorState, EditorStore, EditorTool } from '../features/editor/core/editor.types';
import type { Geometry } from 'geojson';

const initialState: EditorState = {
  activeTool: null,
  infrastructureTypeId: null,
  geometryType: null,
  capabilities: null,
  selectedFeatureId: null,
  editingFeatureId: null,
  formData: {},
  geometry: null,
  originalGeometry: null,
  isDirty: false,
  isSaving: false,
  isSnapEnabled: false,
  validationErrors: [],
};

export const useEditorStore = create<EditorStore>((set) => ({
  ...initialState,

  setEditorContext: (context: EditorContext) => {
    set({
      infrastructureTypeId: context.infrastructureTypeId,
      geometryType: context.geometryType,
      capabilities: context.capabilities,
    });
  },

  setActiveTool: (tool: EditorTool | null) => {
    set({ activeTool: tool });
  },

  setSelectedFeatureId: (id: string | null) => {
    set({ selectedFeatureId: id });
  },

  setEditingFeatureId: (id: string | null) => {
    set({ editingFeatureId: id });
  },

  setGeometry: (geometry: Geometry | null) => {
    set((state) => ({
      geometry,
      isDirty: state.originalGeometry !== null 
        ? JSON.stringify(geometry) !== JSON.stringify(state.originalGeometry) 
        : false,
    }));
  },

  setOriginalGeometry: (geometry: Geometry | null) => {
    set({
      originalGeometry: geometry,
      geometry: geometry ? JSON.parse(JSON.stringify(geometry)) : null,
      isDirty: false,
    });
  },

  setFormData: (data: Record<string, unknown>, isDirty = false) => {
    set({
      formData: data,
      isDirty,
    });
  },

  updateFormField: (key: string, value: unknown) => {
    set((state) => ({
      formData: {
        ...state.formData,
        [key]: value,
      },
      isDirty: true,
    }));
  },

  setIsDirty: (isDirty: boolean) => {
    set({ isDirty });
  },

  setIsSaving: (isSaving: boolean) => {
    set({ isSaving });
  },

  setSnapEnabled: (enabled: boolean) => {
    set({ isSnapEnabled: enabled });
  },

  setValidationErrors: (errors: string[]) => {
    set({ validationErrors: errors });
  },

  resetDraft: () => {
    set((state) => ({
      geometry: state.originalGeometry ? JSON.parse(JSON.stringify(state.originalGeometry)) : null,
      formData: {},
      isDirty: false,
      validationErrors: [],
    }));
  },

  resetEditor: () => {
    set({ ...initialState });
  },
}));
