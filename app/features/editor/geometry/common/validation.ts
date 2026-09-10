/**
 * Editor WebGIS - Validation Utilities
 * 
 * Validasi frontend untuk tipe geometri, kelengkapan koordinat, dan form data atribut.
 */

import type { Geometry } from 'geojson';
import type { GeometryType, FormSchema } from '../../core/editor.types';

export interface GeometryValidationResult {
  valid: boolean;
  errors: string[];
}

export interface FormValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validasi apakah geometry GeoJSON sesuai dengan expected GeometryType
 */
export function validateGeometryType(
  geometry: Geometry | null,
  expectedType: GeometryType
): GeometryValidationResult {
  const errors: string[] = [];

  if (!geometry) {
    errors.push('Geometri tidak boleh kosong.');
    return { valid: false, errors };
  }

  if (geometry.type !== expectedType) {
    errors.push(
      `Tipe geometri tidak sesuai: diharapkan "${expectedType}", tetapi didapat "${geometry.type}".`
    );
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

/**
 * Validasi geometry tidak null dan memiliki koordinat yang memadai
 */
export function validateGeometryNotEmpty(geometry: Geometry | null): GeometryValidationResult {
  const errors: string[] = [];

  if (!geometry) {
    errors.push('Geometri belum dibuat.');
    return { valid: false, errors };
  }

  switch (geometry.type) {
    case 'Point':
      if (!geometry.coordinates || geometry.coordinates.length < 2) {
        errors.push('Koordinat Point tidak valid.');
      }
      break;

    case 'LineString':
      if (!geometry.coordinates || geometry.coordinates.length < 2) {
        errors.push('LineString harus memiliki minimal 2 titik koordinat.');
      }
      break;

    case 'Polygon':
      if (
        !geometry.coordinates ||
        geometry.coordinates.length === 0 ||
        geometry.coordinates[0].length < 4
      ) {
        errors.push('Polygon harus memiliki minimal 3 titik koordinat tertutup (4 koordinat).');
      }
      break;

    default:
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validasi form data atribut dinamis berdasarkan FormSchema
 */
export function validateFormData(
  formData: Record<string, unknown>,
  schema?: FormSchema
): FormValidationResult {
  const errors: Record<string, string> = {};

  if (!schema || !schema.fields || schema.fields.length === 0) {
    return { valid: true, errors: {} };
  }

  for (const field of schema.fields) {
    const value = formData[field.key];
    const isValueEmpty = value === undefined || value === null || value === '';

    // 1. Required Check
    if (field.required && isValueEmpty) {
      errors[field.key] = `${field.label} wajib diisi.`;
      continue;
    }

    if (isValueEmpty) {
      continue;
    }

    // 2. Type-specific validation
    switch (field.type) {
      case 'number': {
        const num = Number(value);
        if (isNaN(num)) {
          errors[field.key] = `${field.label} harus berupa angka.`;
        } else {
          if (field.min !== undefined && num < field.min) {
            errors[field.key] = `${field.label} minimal ${field.min}.`;
          }
          if (field.max !== undefined && num > field.max) {
            errors[field.key] = `${field.label} maksimal ${field.max}.`;
          }
        }
        break;
      }

      case 'text':
      case 'textarea': {
        const str = String(value);
        if (field.maxLength !== undefined && str.length > field.maxLength) {
          errors[field.key] = `${field.label} tidak boleh melebihi ${field.maxLength} karakter.`;
        }
        break;
      }

      case 'select': {
        if (field.options && field.options.length > 0) {
          const isValidOption = field.options.some((opt) => opt.value === String(value));
          if (!isValidOption) {
            errors[field.key] = `Pilihan ${field.label} tidak valid.`;
          }
        }
        break;
      }

      default:
        break;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
