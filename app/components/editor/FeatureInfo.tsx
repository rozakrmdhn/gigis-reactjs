/**
 * Editor WebGIS - FeatureInfo Component
 * 
 * Panel read-only untuk menampilkan data lengkap feature terpilih (atribut & geometri).
 */

import React from 'react';
import type { InfrastructureFeature } from '../../features/editor/core/editor.types';
import { X, Edit3, AlertCircle, RefreshCw, Layers, MapPin, Calendar, Database } from 'lucide-react';

export interface FeatureInfoProps {
  feature: InfrastructureFeature | null;
  isLoading: boolean;
  error: Error | null;
  onStartEdit?: () => void;
  onClose?: () => void;
  onRetry?: () => void;
  className?: string;
}

export function FeatureInfo({
  feature,
  isLoading,
  error,
  onStartEdit,
  onClose,
  onRetry,
  className = '',
}: FeatureInfoProps) {
  if (isLoading) {
    return (
      <div
        id="feature-info-panel"
        className={`bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 w-80 animate-pulse ${className}`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-28" />
          <div className="h-4 w-4 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
        <div className="space-y-3 py-3">
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full" />
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-5/6" />
        </div>
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-16" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        id="feature-info-panel"
        className={`bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl shadow-2xl border border-red-200 dark:border-red-900/50 p-4 w-80 ${className}`}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            Gagal Memuat Detail
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 py-3">{error.message}</p>
        <div className="pt-2 flex justify-end gap-2">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Lagi</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!feature) {
    return null;
  }

  const attributesList = Object.entries(feature.attributes || {});

  return (
    <div
      id="feature-info-panel"
      className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-800 dark:text-slate-100 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] w-80 animate-in fade-in slide-in-from-right-4 duration-200 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold leading-none">Detail Fitur</h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">ID: {feature.id}</span>
          </div>
        </div>
        {onClose && (
          <button
            id="btn-close-feature-info"
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Meta Bar */}
      <div className="px-4 py-2 bg-blue-50/50 dark:bg-blue-950/20 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
          <MapPin className="w-3.5 h-3.5 text-blue-500" />
          <span>Tipe:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100">{feature.geom.type}</span>
        </div>
        {feature.infrastructure_type_id && (
          <span className="px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300 font-medium">
            {feature.infrastructure_type_id}
          </span>
        )}
      </div>

      {/* Attributes Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
        {attributesList.length === 0 ? (
          <div className="py-6 text-center text-slate-400">
            <Database className="w-6 h-6 mx-auto mb-1 opacity-40" />
            <span>Tidak ada atribut</span>
          </div>
        ) : (
          attributesList.map(([key, value]) => {
            const formattedValue =
              value === null || value === undefined
                ? '-'
                : typeof value === 'object'
                ? JSON.stringify(value)
                : typeof value === 'boolean'
                ? value ? 'Ya' : 'Tidak'
                : String(value);

            return (
              <div key={key} className="py-2 flex flex-col gap-0.5 first:pt-0 last:pb-0">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200 break-words">
                  {formattedValue}
                </span>
              </div>
            );
          })
        )}

        {feature.created_at && (
          <div className="py-2 flex items-center gap-1.5 text-[10px] text-slate-400">
            <Calendar className="w-3 h-3" />
            <span>Dibuat: {feature.created_at}</span>
          </div>
        )}
      </div>

      {/* Actions Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-end gap-2">
        {onClose && (
          <button
            id="btn-dismiss-feature-info"
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            Tutup
          </button>
        )}
        {onStartEdit && (
          <button
            id="btn-edit-feature-info"
            type="button"
            onClick={onStartEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default FeatureInfo;
