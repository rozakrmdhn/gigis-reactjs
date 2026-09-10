/**
 * Editor WebGIS - FormField Component
 * 
 * Renderer untuk satu field form dinamis berdasarkan FormFieldSchema.
 */

import React from 'react';
import type { FormFieldSchema } from '../../features/editor/core/editor.types';

export interface FormFieldProps {
  schema: FormFieldSchema;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export function FormField({
  schema,
  value,
  error,
  onChange,
  disabled = false,
}: FormFieldProps) {
  const { key, label, type, required, placeholder, options, min, max, maxLength } = schema;

  const renderInput = () => {
    switch (type) {
      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer mt-1">
            <input
              id={`field-${key}`}
              type="checkbox"
              checked={Boolean(value)}
              disabled={disabled}
              onChange={(e) => onChange(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 dark:bg-slate-800"
            />
            <span className="text-xs text-slate-700 dark:text-slate-300">
              {value ? 'Ya / Aktif' : 'Tidak / Nonaktif'}
            </span>
          </label>
        );

      case 'select':
        return (
          <select
            id={`field-${key}`}
            value={value !== undefined && value !== null ? String(value) : ''}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-slate-100 transition-colors ${
              error ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
            }`}
          >
            <option value="">{placeholder || `-- Pilih ${label} --`}</option>
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            id={`field-${key}`}
            value={value !== undefined && value !== null ? String(value) : ''}
            placeholder={placeholder}
            maxLength={maxLength}
            rows={3}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-slate-100 transition-colors resize-none ${
              error ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
            }`}
          />
        );

      case 'number':
        return (
          <input
            id={`field-${key}`}
            type="number"
            value={value !== undefined && value !== null ? String(value) : ''}
            placeholder={placeholder}
            min={min}
            max={max}
            disabled={disabled}
            onChange={(e) => {
              const val = e.target.value;
              onChange(val === '' ? '' : Number(val));
            }}
            className={`w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-slate-100 transition-colors ${
              error ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
            }`}
          />
        );

      case 'date':
        return (
          <input
            id={`field-${key}`}
            type="date"
            value={value !== undefined && value !== null ? String(value) : ''}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-slate-100 transition-colors ${
              error ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
            }`}
          />
        );

      case 'text':
      default:
        return (
          <input
            id={`field-${key}`}
            type="text"
            value={value !== undefined && value !== null ? String(value) : ''}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-slate-100 transition-colors ${
              error ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
            }`}
          />
        );
    }
  };

  return (
    <div className="flex flex-col gap-1 py-1.5">
      <label
        htmlFor={`field-${key}`}
        className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between"
      >
        <span>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
        {maxLength && type === 'text' && (
          <span className="text-[10px] text-slate-400 font-normal">
            max {maxLength}
          </span>
        )}
      </label>

      {renderInput()}

      {error && (
        <span className="text-[10px] text-red-500 font-medium leading-tight mt-0.5">
          {error}
        </span>
      )}
    </div>
  );
}

export default FormField;
