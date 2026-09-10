/**
 * Editor WebGIS - Editor Loading & Error State Components
 */

import React from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export interface EditorLoadingStateProps {
  message?: string;
  className?: string;
}

export function EditorLoadingState({
  message = 'Memuat konfigurasi editor...',
  className = '',
}: EditorLoadingStateProps) {
  return (
    <div
      id="editor-loading-state"
      className={`flex flex-col items-center justify-center p-8 bg-slate-900/80 text-white rounded-xl backdrop-blur-md border border-slate-700/50 shadow-2xl ${className}`}
    >
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-200">{message}</p>
      <p className="text-xs text-slate-400 mt-1">Menyiapkan konfigurasi infrastruktur</p>
    </div>
  );
}

export interface EditorErrorStateProps {
  error: Error | null;
  onRetry?: () => void;
  className?: string;
}

export function EditorErrorState({
  error,
  onRetry,
  className = '',
}: EditorErrorStateProps) {
  return (
    <div
      id="editor-error-state"
      className={`flex flex-col items-center justify-center p-8 bg-slate-900/90 text-white rounded-xl backdrop-blur-md border border-red-500/30 shadow-2xl max-w-md text-center ${className}`}
    >
      <div className="p-3 bg-red-500/10 rounded-full mb-3 text-red-400">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h3 className="text-sm font-semibold text-white mb-1">Gagal Memuat Editor</h3>
      <p className="text-xs text-red-300/90 mb-4 bg-red-950/40 p-2.5 rounded-lg border border-red-900/50 w-full text-left font-mono">
        {error?.message || 'Terjadi kesalahan saat memuat konfigurasi editor.'}
      </p>

      {onRetry && (
        <button
          id="btn-retry-editor-context"
          type="button"
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Coba Lagi</span>
        </button>
      )}
    </div>
  );
}
