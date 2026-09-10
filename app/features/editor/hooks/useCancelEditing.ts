/**
 * Editor WebGIS - useCancelEditing Hook (Tahap 9)
 * 
 * Hook terpusat untuk menangani alur Cancel/Reset secara aman saat isDirty.
 */

import { useState, useCallback, useRef } from 'react';
import { useEditorStore } from '../../../stores/editorStore';
import type { EditorTool } from '../core/editor.types';

export interface CancelEditingOptions {
  onAfterReset?: () => void;
  onClearMap?: () => void;
}

export type PendingCancelAction =
  | { type: 'cancel' }
  | { type: 'deselect' }
  | { type: 'switch-tool'; tool: EditorTool; onConfirm?: () => void }
  | { type: 'switch-feature'; featureId: string | null }
  | null;

export function useCancelEditing(options?: CancelEditingOptions) {
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<PendingCancelAction>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const resetDraft = useEditorStore((s) => s.resetDraft);
  const setSelectedFeatureId = useEditorStore((s) => s.setSelectedFeatureId);
  const setEditingFeatureId = useEditorStore((s) => s.setEditingFeatureId);

  const forceReset = useCallback(() => {
    resetDraft();
    setEditingFeatureId(null);
    optionsRef.current?.onClearMap?.();
    optionsRef.current?.onAfterReset?.();
  }, [resetDraft, setEditingFeatureId]);

  const executeAction = useCallback(
    (action: PendingCancelAction) => {
      forceReset();
      if (!action) return;

      switch (action.type) {
        case 'deselect':
          setSelectedFeatureId(null);
          break;
        case 'switch-feature':
          setSelectedFeatureId(action.featureId);
          break;
        case 'switch-tool':
          action.onConfirm?.();
          break;
        case 'cancel':
        default:
          break;
      }
    },
    [forceReset, setSelectedFeatureId]
  );

  const requestCancel = useCallback(() => {
    const dirty = useEditorStore.getState().isDirty;
    if (dirty) {
      setPendingAction({ type: 'cancel' });
      setShowConfirmDialog(true);
    } else {
      executeAction({ type: 'cancel' });
    }
  }, [executeAction]);

  const requestDeselect = useCallback(() => {
    const dirty = useEditorStore.getState().isDirty;
    if (dirty) {
      setPendingAction({ type: 'deselect' });
      setShowConfirmDialog(true);
    } else {
      executeAction({ type: 'deselect' });
    }
  }, [executeAction]);

  const requestSwitchFeature = useCallback(
    (featureId: string | null) => {
      const dirty = useEditorStore.getState().isDirty;
      if (dirty) {
        setPendingAction({ type: 'switch-feature', featureId });
        setShowConfirmDialog(true);
      } else {
        executeAction({ type: 'switch-feature', featureId });
      }
    },
    [executeAction]
  );

  const requestSwitchTool = useCallback(
    (tool: EditorTool, onAllowSwitch: () => void) => {
      // Snap adalah toggle sekunder, tidak pernah membatalkan draft
      if (tool === 'snap') {
        onAllowSwitch();
        return;
      }

      // Berpindah ke Modify pada feature yang sedang aktif adalah alur normal
      const currentActiveTool = useEditorStore.getState().activeTool;
      if (tool === 'modify' && (currentActiveTool === 'select' || currentActiveTool === null)) {
        onAllowSwitch();
        return;
      }

      const dirty = useEditorStore.getState().isDirty;
      if (dirty) {
        setPendingAction({ type: 'switch-tool', tool, onConfirm: onAllowSwitch });
        setShowConfirmDialog(true);
      } else {
        onAllowSwitch();
      }
    },
    []
  );

  const confirmCancel = useCallback(() => {
    setShowConfirmDialog(false);
    executeAction(pendingAction);
    setPendingAction(null);
  }, [executeAction, pendingAction]);

  const dismissConfirm = useCallback(() => {
    setShowConfirmDialog(false);
    setPendingAction(null);
  }, []);

  return {
    showConfirmDialog,
    pendingAction,
    requestCancel,
    requestDeselect,
    requestSwitchFeature,
    requestSwitchTool,
    confirmCancel,
    dismissConfirm,
    forceReset,
  };
}

export default useCancelEditing;
