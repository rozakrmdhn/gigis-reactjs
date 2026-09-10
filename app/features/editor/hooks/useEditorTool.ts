/**
 * Editor WebGIS - useEditorTool Hook
 * 
 * Hook helper untuk berinteraksi dengan tool tertentu pada toolbar
 */

import { useCallback } from 'react';
import { useEditor } from './useEditor';
import type { EditorTool } from '../core/editor.types';

export function useEditorTool(tool: EditorTool) {
  const { activeTool, activateTool, deactivateTool, canActivate } = useEditor();

  const isActive = activeTool === tool;
  const isEnabled = canActivate(tool);

  const toggle = useCallback(() => {
    if (isActive) {
      deactivateTool();
    } else {
      activateTool(tool);
    }
  }, [isActive, activateTool, deactivateTool, tool]);

  return {
    isActive,
    isEnabled,
    activate: () => activateTool(tool),
    deactivate: deactivateTool,
    toggle,
  };
}
