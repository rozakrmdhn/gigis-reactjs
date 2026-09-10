/**
 * Editor WebGIS - EditorToolbar Component
 * 
 * Toolbar dinamis yang menampilkan tombol berdasarkan EditorCapabilities.
 * - Snap  : toggle sekunder (berjalan berdampingan dengan Draw/Modify)
 * - Delete: disabled jika tidak ada feature yang dipilih
 */

import React from 'react';
import { useEditor } from '../../features/editor/hooks/useEditor';
import { useEditorStore } from '../../stores/editorStore';
import type { EditorTool } from '../../features/editor/core/editor.types';
import {
  MousePointer,
  PenTool,
  Pencil,
  Magnet,
  Scissors,
  Merge,
  GitBranchPlus,
  Trash2,
} from 'lucide-react';

interface ToolItem {
  id: EditorTool;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TOOLS: ToolItem[] = [
  { id: 'select', label: 'Select', icon: MousePointer },
  { id: 'draw', label: 'Draw', icon: PenTool },
  { id: 'modify', label: 'Modify', icon: Pencil },
  { id: 'snap', label: 'Snap', icon: Magnet },
  { id: 'split', label: 'Split', icon: Scissors },
  { id: 'merge', label: 'Merge', icon: Merge },
  { id: 'extend', label: 'Extend', icon: GitBranchPlus },
  { id: 'delete', label: 'Delete', icon: Trash2 },
];

export interface EditorToolbarProps {
  onToolSelect?: (tool: EditorTool, activate: () => void) => void;
}

export function EditorToolbar({ onToolSelect }: EditorToolbarProps = {}) {
  const { activeTool, capabilities, selectedFeatureId, activateTool, deactivateTool, canActivate } = useEditor();

  // Snap state dari store (toggle independen)
  const isSnapEnabled = useEditorStore((s) => s.isSnapEnabled);

  if (!capabilities) {
    return null;
  }

  // Filter tools berdasarkan capabilities (TIDAK berdasarkan nama infrastruktur)
  const availableTools = TOOLS.filter((tool) => canActivate(tool.id));

  const handleToolClick = (toolId: EditorTool, isActive: boolean) => {
    // Snap: toggle sekunder — delegate ke controller via activate()
    // EditorController.activate('snap') sudah meng-handle toggle internal
    if (toolId === 'snap') {
      activateTool('snap');
      return;
    }

    if (isActive) {
      deactivateTool();
      return;
    }

    if (onToolSelect) {
      onToolSelect(toolId, () => activateTool(toolId));
    } else {
      activateTool(toolId);
    }
  };

  return (
    <div
      id="editor-toolbar"
      className="flex items-center gap-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-1.5 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700"
    >
      {availableTools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id && tool.id !== 'snap';

        // Snap: ditampilkan sebagai toggle (emerald = aktif)
        const isSnapOn = tool.id === 'snap' && isSnapEnabled;

        // Guard: modify dan delete hanya aktif jika ada feature terpilih
        const isDisabled =
          (tool.id === 'modify' && !selectedFeatureId) ||
          (tool.id === 'delete' && !selectedFeatureId);

        const title = isDisabled
          ? `${tool.label} (Pilih feature terlebih dahulu)`
          : tool.id === 'snap'
          ? `Snap ${isSnapOn ? '— Aktif (klik untuk nonaktifkan)' : '— Nonaktif (klik untuk aktifkan)'}`
          : tool.label;

        return (
          <button
            key={tool.id}
            id={`tool-btn-${tool.id}`}
            type="button"
            title={title}
            disabled={isDisabled}
            onClick={() => handleToolClick(tool.id, isActive)}
            className={`flex items-center justify-center p-2 rounded-md transition-all text-xs font-medium ${
              isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : isSnapOn
                ? 'bg-emerald-500 text-white shadow-sm ring-1 ring-emerald-400'
                : isDisabled
                ? 'text-slate-400 dark:text-slate-600 opacity-50 cursor-not-allowed'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}

export default EditorToolbar;
