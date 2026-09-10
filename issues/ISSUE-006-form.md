# ISSUE-006 · Tahap 6: Form

**Label:** `enhancement` · `editor` · `form` · `attributes`
**Milestone:** Phase 6 — Form
**Depends on:** [ISSUE-005](./ISSUE-005-feature-detail.md)
**Referensi:** [GIS_ARCHITECTURE.md](../GIS_ARCHITECTURE.md) — Bab 13, 16, 17, 18, 27 (Tahap 06)

---

## 🎯 Tujuan

Mengimplementasikan **form editing atribut** sehingga user dapat mengubah data non-geometri dari feature yang dipilih.

Form bersifat **dinamis** — field-field yang ditampilkan berasal dari skema master data infrastruktur, bukan hardcode di frontend.

---

## 📋 Latar Belakang

Dari arsitektur (§18 Draft State):

```
FeatureInfo (read-only)
       ↓
User klik [Edit]
       ↓
FeatureForm (editable)
       ↓
Form Change → updateFormField()
       ↓
EditorStore.formData (draft)
       ↓
isDirty = true
       ↓
SaveBar tampil
```

Draft tidak langsung dikirim ke server. Perubahan form hanya mengubah `EditorStore.formData` sampai user menekan Simpan.

Form field ditampilkan **dinamis** berdasarkan skema atribut dari `InfrastrukturTipeConfig` — bukan hardcode per jenis infrastruktur.

---

## ✅ Task List

### 1. Type Skema Form Dinamis

Definisikan type untuk skema field form yang berasal dari konfigurasi master data.

**File:** `app/features/editor/core/editor.types.ts` (tambahkan)

```ts
export type FormFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'textarea'
  | 'date'
  | 'boolean';

export interface FormFieldSchema {
  key: string;              // key dalam attributes object
  label: string;            // label yang ditampilkan
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[]; // untuk type 'select'
  min?: number;             // untuk type 'number'
  max?: number;
  maxLength?: number;       // untuk type 'text' | 'textarea'
}

export interface FormSchema {
  fields: FormFieldSchema[];
}
```

**Aturan:**
- `FormSchema` berasal dari API / konfigurasi master — tidak hardcode per infrastruktur
- Field `options` wajib ada jika `type = 'select'`

---

### 2. Update `InfrastrukturTipeConfig` (dari Tahap 2)

Tambahkan `formSchema` ke type konfigurasi yang sudah ada.

**File:** `app/features/editor/core/editor.types.ts` (update)

```ts
export interface InfrastrukturTipeConfig {
  id: string;
  kode: string;
  nama: string;
  infrastruktur_tipe: GeometryType;
  capabilities: Partial<EditorCapabilities>;
  formSchema?: FormSchema;   // ← tambahkan field ini
  aktif: boolean;
}
```

---

### 3. Komponen `FeatureForm.tsx`

Buat form dinamis yang me-render field berdasarkan `FormSchema`.

**File:** `app/components/editor/FeatureForm.tsx`

```tsx
interface FeatureFormProps {
  schema: FormSchema;
  formData: Record<string, unknown>;
  validationErrors: string[];
  isLoading?: boolean;
  onChange: (key: string, value: unknown) => void;
  onCancel: () => void;
}

function FeatureForm({
  schema,
  formData,
  validationErrors,
  onChange,
  onCancel,
}: FeatureFormProps)
```

Rendering field dinamis:

```tsx
{schema.fields.map((field) => (
  <FormField
    key={field.key}
    schema={field}
    value={formData[field.key]}
    error={getFieldError(field.key, validationErrors)}
    onChange={(value) => onChange(field.key, value)}
  />
))}
```

**Aturan:**
- Tidak ada `if (infrastrukturType === 'jalan')` di dalam form
- Semua field di-render dari `schema.fields`
- Form hanya mengubah `EditorStore.formData` via `updateFormField()`
- `isDirty` otomatis `true` saat ada perubahan

---

### 4. Komponen `FormField.tsx`

Buat renderer untuk satu field berdasarkan `FormFieldSchema.type`.

**File:** `app/components/editor/FormField.tsx`

```tsx
interface FormFieldProps {
  schema: FormFieldSchema;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}

function FormField({ schema, value, error, onChange }: FormFieldProps)
```

Mapping type ke input:

| `FormFieldType` | Komponen |
|----------------|---------|
| `text`         | `<input type="text">` |
| `number`       | `<input type="number">` |
| `textarea`     | `<textarea>` |
| `select`       | `<select>` / Radix Select |
| `date`         | `<input type="date">` |
| `boolean`      | Checkbox / Switch |

**Aturan:**
- Gunakan komponen dari Radix UI / ShadCN yang sudah ada di project
- Tampilkan error message di bawah field jika ada

---

### 5. Validasi Frontend Form

Buat fungsi validasi form berdasarkan `FormSchema`.

**File:** `app/features/editor/core/editor.types.ts` atau file baru
`app/features/editor/geometry/common/validation.ts` (tambahkan)

```ts
interface FormValidationResult {
  valid: boolean;
  errors: Record<string, string>; // key = field.key, value = pesan error
}

function validateFormData(
  formData: Record<string, unknown>,
  schema: FormSchema
): FormValidationResult
```

Validasi minimal per field:
- `required` → nilai tidak boleh kosong / null / undefined / `''`
- `number` + `min`/`max` → nilai dalam rentang
- `text` + `maxLength` → panjang string tidak melebihi batas
- `select` + `options` → nilai harus ada di daftar options

**Aturan:**
- Validasi frontend membantu UX — backend tetap validator akhir (§20)
- Error validasi disimpan ke `EditorStore.validationErrors`

---

### 6. Update `useEditorSelection` — Form Change Handler

Sambungkan perubahan form ke store.

**File:** `app/features/editor/hooks/useEditorSelection.ts` (update)

Tambahkan:

```ts
const onFormChange = useCallback(
  (key: string, value: unknown) => {
    updateFormField(key, value);  // → isDirty = true
  },
  [updateFormField]
);
```

---

### 7. Update `FeatureInfo.tsx` — Tombol Edit

Dari Tahap 5, `FeatureInfo` sudah memiliki tombol `[Edit]`. Hubungkan tombol tersebut untuk beralih ke mode form.

```tsx
// Di MapEditor atau parent:
const [isEditingForm, setIsEditingForm] = useState(false);

// FeatureInfo:
<button onClick={() => setIsEditingForm(true)}>Edit</button>

// Conditional render:
{isEditingForm ? (
  <FeatureForm
    schema={infrastrukturConfig.formSchema}
    formData={formData}
    validationErrors={validationErrors}
    onChange={onFormChange}
    onCancel={() => {
      setIsEditingForm(false);
      resetDraft();
    }}
  />
) : (
  <FeatureInfo
    feature={feature}
    onStartEdit={() => setIsEditingForm(true)}
  />
)}
```

---

### 8. SaveBar — Aktifasi Saat Form Dirty

`SaveBar` sudah ada dari Tahap 1. Pastikan:

- `isDirty = true` → SaveBar muncul
- Tombol `[Batal]` di SaveBar memanggil `resetDraft()` dan kembali ke mode read-only
- Tombol `[Simpan]` memanggil `validateFormData()` sebelum submit
  - Jika valid → `setValidationErrors([])` → lanjut ke PATCH (Tahap 8)
  - Jika tidak valid → `setValidationErrors(errors)` → tampilkan error di form

---

### 9. `ConfirmDialog.tsx` (shell)

Buat shell komponen dialog konfirmasi untuk digunakan saat:
- User mencoba menutup form saat `isDirty = true`
- User mencoba batal saat ada perubahan

**File:** `app/components/editor/ConfirmDialog.tsx`

```tsx
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ open, title, description, onConfirm, onCancel }: ConfirmDialogProps)
```

Gunakan `@radix-ui/react-alert-dialog` yang sudah ada di project.

---

### 10. Update barrel export

```ts
// app/components/editor/index.ts — tambahkan
export * from './FeatureForm';
export * from './FormField';
export * from './ConfirmDialog';

// app/features/editor/index.ts — tambahkan
export type {
  FormFieldType,
  FormFieldSchema,
  FormSchema,
} from './core/editor.types';
```

---

## 🚫 Larangan pada Tahap Ini

- ❌ Jangan hardcode field form per jenis infrastruktur: `if (tipe === 'jalan') showFieldJalan()`
- ❌ Jangan langsung POST/PATCH ke API saat form berubah (itu Tahap 8)
- ❌ Jangan simpan form state ke React `useState` lokal jika sudah ada di `EditorStore.formData`
- ❌ Jangan skip validasi frontend meski backend akan memvalidasi ulang
- ❌ Jangan mulai implementasi Modify geometry (itu Tahap 7)

---

## 🧪 Kriteria Selesai (Definition of Done)

- [x] Type `FormFieldSchema` dan `FormSchema` terdefinisi
- [x] `InfrastrukturTipeConfig` memiliki field `formSchema`
- [x] `FeatureForm` me-render field dinamis berdasarkan `FormSchema`
- [x] `FormField` menangani semua `FormFieldType` (text, number, textarea, select, date, boolean)
- [x] Perubahan field form → `updateFormField()` → `isDirty = true`
- [x] `validateFormData()` memvalidasi semua field berdasarkan skema
- [x] Error validasi disimpan ke `EditorStore.validationErrors` dan tampil di form
- [x] `SaveBar` muncul saat `isDirty = true`, tombol `[Batal]` memanggil `resetDraft()`
- [x] `ConfirmDialog` tampil saat user batal dengan data yang belum disimpan
- [x] Tidak ada hardcode field name / infrastruktur name di form logic
- [x] `npx tsc --noEmit` tidak menghasilkan error

---

## 📌 Catatan

Tahap ini **belum** membutuhkan:
- Modify geometry via peta (itu Tahap 7)
- Actual POST/PATCH ke API (itu Tahap 8)
- Cancel / Reset flow lengkap (itu Tahap 9)

Fokus Tahap 6 adalah **form atribut dinamis yang tersambung ke EditorStore.formData** — perubahan form memicu `isDirty = true` dan SaveBar muncul, tapi belum benar-benar menyimpan ke server.

---

**Dibuat:** 2026-08-14
**Referensi Arsitektur:** GIS_ARCHITECTURE.md §13, §16, §17, §18, §20, §27 Tahap 06
