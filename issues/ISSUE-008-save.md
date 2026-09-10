# ISSUE-008 · Tahap 8: Save / PATCH

**Label:** `enhancement` · `editor` · `save` · `api` · `patch`
**Milestone:** Phase 8 — Save / PATCH
**Depends on:** [ISSUE-007](./ISSUE-007-modify.md)
**Referensi:** [GIS_ARCHITECTURE.md](../GIS_ARCHITECTURE.md) — Bab 13, 17, 18, 19, 20, 21, 27 (Tahap 08)

---

## 🎯 Tujuan

Mengimplementasikan **alur Save / PATCH** — yaitu pengiriman perubahan draft (atribut + geometri) ke backend API dan sinkronisasi state editor setelah simpan berhasil.

Tahap ini menutup data flow edit dari sisi frontend:

```
Draft (form + geometry)
      ↓
Validate (frontend)
      ↓
Build Payload
      ↓
PATCH /api/infrastructure/:id
      ↓
Success → Reset Draft → Refresh Feature
```

---

## 📋 Latar Belakang

Dari arsitektur (§17 Data Flow Edit & §18 Draft State):

```
Select Feature
      ↓
Load Feature (Tahap 5)
      ↓
Form Editing (Tahap 6) + Geometry Editing (Tahap 7)
      ↓
isDirty = true
      ↓
Validasi (frontend) ← Tahap ini
      ↓
Save → PATCH API ← Tahap ini
      ↓
Reset Draft → isDirty = false
```

Dari arsitektur (§19 Save Architecture):

```http
PATCH /api/infrastructure/:id
```

Payload update:

```json
{
  "attributes": {},
  "geom": {}
}
```

Dari arsitektur (§20 Backend Validation & §21 Geometry Type Consistency):

- Backend wajib memvalidasi geometry type, SRID, dan business rules.
- Frontend hanya memberikan UX validation sebelum mengirim request.
- Jika backend menolak (misal geometry mismatch), error ditampilkan ke user.

---

## ✅ Task List

### 1. Tambah Fungsi `updateInfrastructureFeature()` di `editorApi.ts`

Implementasi fungsi PATCH ke backend.

**File:** `app/features/editor/services/editorApi.ts` (update)

```ts
export interface UpdateFeaturePayload {
  attributes: Record<string, unknown>;
  geom: GeoJSON.Geometry;
}

export interface UpdateFeatureResult {
  id: string;
  success: boolean;
  message?: string;
}

export async function updateInfrastructureFeature(
  id: string,
  payload: UpdateFeaturePayload,
  infrastructureTypeId?: string
): Promise<UpdateFeatureResult>
```

**Aturan:**
- Endpoint: `PATCH /v1/infrastruktur/{id}` atau `PATCH /v1/infrastruktur/{typeId}/{id}` jika `infrastructureTypeId` tersedia
- Payload mengikuti format `{ attributes, geom }` sesuai §19
- Tangani HTTP error dengan pesan yang user-friendly
- Tidak boleh ada hardcode endpoint path — gunakan `getBaseUrl()` yang sudah ada

---

### 2. Tambah `useSaveFeature` Hook

Buat hook khusus untuk mengelola proses simpan dari React component.

**File:** `app/features/editor/hooks/useSaveFeature.ts` (BARU)

```ts
export interface SaveFeatureOptions {
  featureId: string | null;
  infrastructureTypeId: string | null;
  formSchema?: FormSchema;
}

export function useSaveFeature(options: SaveFeatureOptions) {
  return {
    save,      // () => Promise<void>
    isSaving,  // boolean
    saveError, // string | null
  };
}
```

Flow di dalam `save()`:

```
1. Ambil formData & geometry dari EditorStore (getState)
   ↓
2. Validasi form: validateFormData(formData, formSchema)
   → jika gagal: setValidationErrors() dan return (jangan panggil API)
   ↓
3. Validasi geometry: validateGeometryNotEmpty(geometry)
   → jika gagal: setValidationErrors() dan return
   ↓
4. setIsSaving(true)
   ↓
5. try { PATCH via updateInfrastructureFeature() }
   ↓
6a. Sukses → setOriginalGeometry(sentGeometry) + resetDraft()
6b. Gagal → setValidationErrors([error.message])
   ↓
7. finally { setIsSaving(false) }
```

**Aturan:**
- `setIsSaving(true)` sebelum fetch, `setIsSaving(false)` di `finally` — selalu dipanggil
- Validasi frontend gagal → JANGAN panggil API
- Geometry null → tampilkan error, jangan kirim
- Ambil `formData` dan `geometry` dari `useEditorStore.getState()` — bukan dari props

---

### 3. Update `SaveBar.tsx` — Disable saat Saving

Update `SaveBar.tsx` agar:
- Tombol `[Simpan]` disabled ketika `isSaving = true`
- Tombol `[Batal]` disabled ketika `isSaving = true`
- Spinner `<Loader2 className="animate-spin" />` muncul di tombol Simpan saat loading

**File:** `app/components/editor/SaveBar.tsx` (update)

> `SaveBar` sudah ada dari Tahap 6. Yang perlu diverifikasi adalah bahwa prop `onSave`
> sudah di-wire dan state `isSaving` dari store sudah digunakan untuk disable tombol.
> Tidak perlu perubahan besar jika implementasi sebelumnya sudah menggunakan `isSaving` dari store.

---

### 4. Update `MapEditor.tsx` — Wire `useSaveFeature`

Ganti handler `handleSave` yang manual di `MapEditor.tsx` dengan `useSaveFeature` hook.

**File:** `app/components/editor/MapEditor.tsx` (update)

```tsx
const { save, isSaving, saveError } = useSaveFeature({
  featureId: editingFeatureId || selectedFeatureId,
  infrastructureTypeId: activeContext?.infrastructureTypeId,
  formSchema: activeFormSchema,
});
```

Wire:
- `save` → ke prop `onSave` di `SaveBar` dan `onSave` di `FeatureForm`
- Setelah save berhasil → `refetchFeature()` untuk refresh data panel
- `saveError` → jika ada, tampilkan melalui `setValidationErrors`

---

### 5. Tampilkan Error Simpan

Ketika PATCH gagal:
- Error masuk ke `validationErrors` di store via `setValidationErrors([error.message])`
- `SaveBar` menampilkan jumlah error (sudah ada)
- `FeatureForm` menampilkan error per field (sudah ada)

Tidak perlu membuat komponen error baru — gunakan sistem `validationErrors` yang sudah ada.

---

### 6. Reset State Setelah Save Berhasil

Setelah PATCH sukses:

```
setOriginalGeometry(sentGeometry)
      ↓
resetDraft()
      ↓
isDirty = false
      ↓
SaveBar menghilang
      ↓
refetchFeature() → update FeatureInfo panel (opsional, direkomendasikan)
```

**Aturan:**
- `resetDraft()` hanya dipanggil setelah konfirmasi sukses
- Jangan reset sebelum response diterima
- `setOriginalGeometry()` dipanggil dengan geometry yang dikirim ke server

---

### 7. Update Barrel Export

```ts
// app/features/editor/index.ts — tambahkan
export * from './hooks/useSaveFeature';
```

---

## 🚫 Larangan pada Tahap Ini

- ❌ Jangan panggil API jika validasi frontend gagal
- ❌ Jangan hardcode endpoint path — gunakan `getBaseUrl()`
- ❌ Jangan simpan runtime OL object ke store
- ❌ Jangan reset draft sebelum response sukses dari server
- ❌ Jangan gunakan `isSaving = true` tanpa `finally` yang menjamin `isSaving = false`
- ❌ Jangan buat flow save berbeda per geometry type — satu `useSaveFeature` untuk semua
- ❌ Jangan kirim geometry null ke server — validasi dan tampilkan error dulu

---

## 🧪 Kriteria Selesai (Definition of Done)

- [x] `updateInfrastructureFeature()` mengirim `PATCH` dengan payload `{ attributes, geom }`
- [x] `useSaveFeature.save()` menjalankan validasi frontend sebelum memanggil API
- [x] `isSaving = true` saat request berlangsung, `false` setelah selesai (sukses/gagal)
- [x] Setelah simpan sukses: `resetDraft()` dipanggil → `isDirty = false` → `SaveBar` hilang
- [x] Error dari backend ditampilkan ke user via `validationErrors`
- [x] Tombol `[Simpan]` di `SaveBar` dan `FeatureForm` disabled saat `isSaving = true`
- [x] Geometry null → tidak dikirim ke API → pesan error ditampilkan
- [x] Tidak ada hardcode geometry type, endpoint path, atau nama infrastruktur
- [x] `npx tsc --noEmit` tidak menghasilkan error

---

## 📌 Catatan

Tahap ini **belum** membutuhkan:
- POST / Create feature baru (itu Tahap 10)
- Cancel/Reset flow yang kompleks (itu Tahap 9)
- Snap (itu Tahap 11)
- Delete (itu Tahap 12)

Fokus Tahap 8 adalah **mengirim perubahan draft ke server via PATCH dan menangani
response sukses/gagal dengan benar** — tidak ada operasi create atau operasi lain ke server.

---

**Dibuat:** 2026-08-14
**Referensi Arsitektur:** GIS_ARCHITECTURE.md §13, §17, §18, §19, §20, §21, §27 Tahap 08
