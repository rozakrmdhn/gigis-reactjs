/**
 * Editor WebGIS - SaveBar Component (Shell)
 * 
 * Bar notifikasi dan aksi simpan/batal saat draft berubah.
 */

import React from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { Save, RotateCcw, Loader2 } from 'lucide-react';

export interface SaveBarProps {
  onSave?: () => Promise<void> | void;
  onCancel?: () => void;
}

export function SaveBar({ onSave, onCancel }: SaveBarProps) {
  const isDirty = useEditorStore((s) => s.isDirty);
  const isSaving = useEditorStore((s) => s.isSaving);
  const validationErrors = useEditorStore((s) => s.validationErrors);
  const resetDraft = useEditorStore((s) => s.resetDraft);

  if (!isDirty) {
    return null;
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      resetDraft();
    }
  };

  return (
    <div
      id="editor-save-bar"
      className="flex items-center gap-3 bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-4 py-2 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="flex flex-col">
        <span className="text-xs font-semibold">Perubahan belum disimpan</span>
        {validationErrors.length > 0 && (
          <span className="text-[10px] text-red-500">
            {validationErrors.length} kesalahan validasi
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 ml-2">
        <button
          id="editor-btn-cancel"
          type="button"
          disabled={isSaving}
          onClick={handleCancel}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Batal</span>
        </button>

        <button
          id="editor-btn-save"
          type="button"
          disabled={isSaving || validationErrors.length > 0}
          onClick={onSave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>Simpan</span>
        </button>
      </div>
    </div>
  );
}

export default SaveBar;
