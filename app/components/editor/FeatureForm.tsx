/**
 * Editor WebGIS - FeatureForm Component
 * 
 * Form editing dinamis yang me-render input field berdasarkan FormSchema.
 */

import React from 'react';
import type { FormSchema, FormFieldSchema } from '../../features/editor/core/editor.types';
import { FormField } from './FormField';
import { Edit, X, Save, AlertTriangle } from 'lucide-react';

export interface FeatureFormProps {
  schema?: FormSchema;
  formData: Record<string, unknown>;
  validationErrors?: Record<string, string> | string[];
  isLoading?: boolean;
  onChange: (key: string, value: unknown) => void;
  onCancel: () => void;
  onSave?: () => void;
  className?: string;
}

export function FeatureForm({
  schema,
  formData,
  validationErrors = {},
  isLoading = false,
  onChange,
  onCancel,
  onSave,
  className = '',
}: FeatureFormProps) {
  // Parsing validation errors jika formatnya string array atau record
  const errorsMap: Record<string, string> = React.useMemo(() => {
    if (!validationErrors) return {};
    if (Array.isArray(validationErrors)) {
      const map: Record<string, string> = {};
      validationErrors.forEach((err, idx) => {
        map[`error_${idx}`] = err;
      });
      return map;
    }
    return validationErrors;
  }, [validationErrors]);

  // Jika schema belum didefinisikan dari master, buat schema dinamis dari keys formData
  const resolvedFields: FormFieldSchema[] = React.useMemo(() => {
    if (schema?.fields && schema.fields.length > 0) {
      return schema.fields;
    }

    // Auto-generate fields dari keys formData jika schema kosong
    return Object.keys(formData).map((key) => {
      const val = formData[key];
      const type =
        typeof val === 'number'
          ? 'number'
          : typeof val === 'boolean'
          ? 'boolean'
          : 'text';

      return {
        key,
        label: key.replace(/_/g, ' ').toUpperCase(),
        type,
      };
    });
  }, [schema, formData]);

  return (
    <div
      id="feature-form-panel"
      className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-800 dark:text-slate-100 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] w-80 animate-in fade-in slide-in-from-right-4 duration-200 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
            <Edit className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold leading-none">Edit Atribut</h3>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Mode Pengeditan</span>
          </div>
        </div>
        <button
          id="btn-cancel-feature-form"
          type="button"
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form Fields Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {resolvedFields.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            <AlertTriangle className="w-6 h-6 mx-auto mb-1 opacity-40 text-amber-500" />
            <span>Tidak ada field atribut yang dapat diedit</span>
          </div>
        ) : (
          resolvedFields.map((field) => (
            <FormField
              key={field.key}
              schema={field}
              value={formData[field.key]}
              error={errorsMap[field.key]}
              disabled={isLoading}
              onChange={(value) => onChange(field.key, value)}
            />
          ))
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-end gap-2">
        <button
          id="btn-form-cancel"
          type="button"
          disabled={isLoading}
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
        >
          Batal
        </button>

        {onSave && (
          <button
            id="btn-form-save"
            type="button"
            disabled={isLoading}
            onClick={onSave}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default FeatureForm;
