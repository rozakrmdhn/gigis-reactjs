/**
 * Editor WebGIS - useEditor Hook
 * 
 * Custom hook utama sebagai antarmuka React terhadap Editor Store dan Controller.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useEditorStore } from '../../../stores/editorStore';
import { EditorController, getActiveEditorController } from '../core/EditorController';
import type { EditorCapabilities, EditorContext, EditorTool, GeometryType } from '../core/editor.types';
import { isToolSupported } from '../capabilities/editorCapabilities';

export function useEditor() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const infrastructureTypeId = useEditorStore((s) => s.infrastructureTypeId);
  const geometryType = useEditorStore((s) => s.geometryType);
  const capabilities = useEditorStore((s) => s.capabilities);
  const selectedFeatureId = useEditorStore((s) => s.selectedFeatureId);
  const editingFeatureId = useEditorStore((s) => s.editingFeatureId);
  const isDirty = useEditorStore((s) => s.isDirty);
  const isSaving = useEditorStore((s) => s.isSaving);
  const validationErrors = useEditorStore((s) => s.validationErrors);

  const setEditorContext = useEditorStore((s) => s.setEditorContext);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const setSelectedFeatureId = useEditorStore((s) => s.setSelectedFeatureId);
  const resetDraft = useEditorStore((s) => s.resetDraft);
  const resetEditor = useEditorStore((s) => s.resetEditor);

  const controllerRef = useRef<EditorController | null>(null);

  const context: EditorContext | null = useMemo(() => {
    if (!infrastructureTypeId || !geometryType || !capabilities) {
      return null;
    }
    return {
      infrastructureTypeId,
      geometryType,
      capabilities,
    };
  }, [infrastructureTypeId, geometryType, capabilities]);

  const setGeometry = useEditorStore((s) => s.setGeometry);

  const initEditor = useCallback(
    (newContext: EditorContext) => {
      setEditorContext(newContext);

      let controller = controllerRef.current || getActiveEditorController();
      if (!controller) {
        controller = new EditorController(newContext);
        controller.onToolChange((tool) => {
          setActiveTool(tool);
        });
        controllerRef.current = controller;
      } else {
        controller.updateContext(newContext);
      }

      controller.onFeatureSelect = (id) => {
        setSelectedFeatureId(id);
      };
      controller.getStoreGeometry = () => {
        return useEditorStore.getState().geometry;
      };
      controller.onGeometryChange = (updatedGeometry) => {
        setGeometry(updatedGeometry);
      };
      controller.editingFeatureId = useEditorStore.getState().editingFeatureId || useEditorStore.getState().selectedFeatureId;

      return controller;
    },
    [setEditorContext, setActiveTool, setSelectedFeatureId, setGeometry]
  );

  const canActivate = useCallback(
    (tool: EditorTool): boolean => {
      if (!capabilities) return false;
      return isToolSupported(capabilities, tool);
    },
    [capabilities]
  );

  const activateTool = useCallback(
    (tool: EditorTool): boolean => {
      const ctrl = controllerRef.current || getActiveEditorController();
      if (ctrl) {
        return ctrl.activate(tool);
      }
      if (canActivate(tool)) {
        setActiveTool(tool);
        return true;
      }
      return false;
    },
    [canActivate, setActiveTool]
  );

  const deactivateTool = useCallback(() => {
    const ctrl = controllerRef.current || getActiveEditorController();
    if (ctrl) {
      ctrl.deactivate();
    } else {
      setActiveTool(null);
    }
  }, [setActiveTool]);

  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.destroy();
        controllerRef.current = null;
      }
    };
  }, []);

  return {
    context,
    activeTool,
    capabilities,
    geometryType,
    selectedFeatureId,
    editingFeatureId,
    isDirty,
    isSaving,
    validationErrors,
    initEditor,
    activateTool,
    deactivateTool,
    canActivate,
    setSelectedFeatureId,
    resetDraft,
    resetEditor,
    controller: controllerRef.current,
  };
}
