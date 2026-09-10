# ISSUE-002 · Tahap 2: Dynamic EditorContext

**Label:** `enhancement` · `editor` · `context` · `api`
**Milestone:** Phase 2 — Dynamic EditorContext
**Depends on:** [ISSUE-001](./ISSUE-001-core-editor.md) ✅
**Referensi:** [GIS_ARCHITECTURE.md](../GIS_ARCHITECTURE.md) — Bab 5, 7, 22, 27 (Tahap 02)

---

## 🎯 Tujuan

Menyambungkan **EditorContext** dengan sumber data dinamis dari master data `infrastruktur_tipe`.

Setelah Tahap 1 membangun fondasi static (types, controller, store, hooks), Tahap 2 memastikan context editor terbentuk **secara dinamis** berdasarkan konfigurasi yang diambil dari API — bukan dari hard-code frontend.

---

## 📋 Latar Belakang

Dari arsitektur (§22 Dynamic Feature Configuration):

```
master_infrastruktur_tipe
        ↓ (API fetch)
{ infrastruktur_tipe, capabilities }
        ↓
buildEditorContext()
        ↓
EditorContext
```

Contoh data dari master:

```json
{
  "kode": "JLN",
  "nama": "Jalan Poros Desa",
  "infrastruktur_tipe": "LineString",
  "capabilities": {
    "draw": true,
    "modify": true,
    "snap": true,
    "split": true,
    "merge": true,
    "extend": true
  },
  "aktif": true
}
```

**Prinsip:** penambahan jenis infrastruktur baru **tidak membutuhkan perubahan kode frontend** — cukup tambah data di master.

---

## ✅ Task List

### 1. Type Data Master Infrastruktur Tipe

Buat type yang merepresentasikan response API master data:

```ts
// app/features/editor/core/editor.types.ts (tambahkan)

export interface InfrastrukturTipeConfig {
  id: string;
  kode: string;
  nama: string;
  infrastruktur_tipe: GeometryType;
  capabilities: Partial<EditorCapabilities>;
  aktif: boolean;
}
```

**Aturan:**
- Field `infrastruktur_tipe` wajib berupa `GeometryType` yang valid
- Field `capabilities` dari API bersifat partial — sistem merge dengan default

---

### 2. Service: `editorApi.ts`

Buat service layer untuk komunikasi dengan API master data.

**File:** `app/features/editor/services/editorApi.ts`

```ts
// Mengambil konfigurasi infrastruktur_tipe berdasarkan ID
async function getInfrastrukturTipeConfig(
  id: string
): Promise<InfrastrukturTipeConfig>

// Mengambil semua daftar infrastruktur_tipe yang aktif
async function listInfrastrukturTipe(): Promise<InfrastrukturTipeConfig[]>
```

**Aturan:**
- Gunakan `fetch` atau `axios` yang sudah ada
- Validasi bahwa `infrastruktur_tipe` dari API merupakan GeometryType yang didukung (`isSupportedGeometryType()`)
- Jika `infrastruktur_tipe` tidak valid, throw error deskriptif
- Gunakan path alias `~/` sesuai tsconfig

---

### 3. Hook: `useEditorContext.ts`

Buat hook untuk fetch dan build EditorContext secara dinamis.

**File:** `app/features/editor/hooks/useEditorContext.ts`

```ts
interface UseEditorContextOptions {
  infrastructureTypeId: string;
  enabled?: boolean;
}

interface UseEditorContextResult {
  context: EditorContext | null;
  config: InfrastrukturTipeConfig | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

function useEditorContext(
  options: UseEditorContextOptions
): UseEditorContextResult
```

Flow internal hook:
```
infrastructureTypeId
        ↓
getInfrastrukturTipeConfig(id)
        ↓
isSupportedGeometryType(config.infrastruktur_tipe) ?
        ↓
buildEditorContext(id, geometryType, capabilitiesOverride)
        ↓
EditorContext
```

**Aturan:**
- Jangan set default geometry type jika fetch gagal — biarkan `context = null`
- Gunakan `useEffect` + `useState` atau React Query jika sudah ada di project
- Tampilkan loading state selama fetch berlangsung

---

### 4. Update `MapEditor.tsx`

Setelah Tahap 1 MapEditor menerima props `geometryType` statis, update agar bisa mengambil dari API.

**Dua mode yang didukung:**

**Mode A — Props statis (backward compatible, Tahap 1):**
```tsx
<MapEditor
  infrastructureTypeId="jalan_poros_desa"
  geometryType="LineString"
/>
```

**Mode B — Dynamic dari API (Tahap 2):**
```tsx
<MapEditor
  infrastructureTypeId="jalan_poros_desa"
  dynamic
/>
```

Ketika `dynamic={true}`:
1. Gunakan `useEditorContext` untuk fetch config
2. Tampilkan loading state sampai context tersedia
3. Inisialisasi editor hanya setelah context valid

```tsx
interface MapEditorProps {
  infrastructureTypeId: string;
  geometryType?: GeometryType;          // opsional jika dynamic
  capabilities?: Partial<EditorCapabilities>;
  dynamic?: boolean;                    // mode fetch dari API
  className?: string;
  children?: React.ReactNode;
}
```

**Aturan:**
- Jika `dynamic=true` dan `geometryType` juga diisi, `dynamic` mengambil prioritas
- Tidak boleh ada `geometryType` default

---

### 5. Loading & Error State UI

Buat komponen sederhana untuk state loading dan error saat fetch context:

**File:** `app/components/editor/EditorLoadingState.tsx`

```tsx
function EditorLoadingState()  // Spinner / skeleton
function EditorErrorState({ error, onRetry }: ...) // Pesan error + tombol retry
```

Kedua komponen ini digunakan di dalam `MapEditor` saat mode `dynamic`.

---

### 6. Validasi geometry type dari API

Tambahkan guard di `editorApi.ts` dan/atau `useEditorContext.ts`:

```ts
if (!isSupportedGeometryType(config.infrastruktur_tipe)) {
  throw new Error(
    `Geometry type tidak didukung: "${config.infrastruktur_tipe}" ` +
    `untuk infrastruktur "${id}". Nilai valid: Point | LineString | Polygon.`
  );
}
```

Ini memastikan backend yang mengembalikan nilai tidak valid akan menghasilkan error
yang informatif di frontend.

---

### 7. Update barrel export

Update `app/features/editor/index.ts` dengan export yang baru:

```ts
export * from './core/editor.types';      // InfrastrukturTipeConfig
export * from './services/editorApi';
export * from './hooks/useEditorContext';
```

---

## 🚫 Larangan pada Tahap Ini

- ❌ Jangan set default geometry type: `geometryType = geometryType ?? 'LineString'`
- ❌ Jangan skip validasi `isSupportedGeometryType()` saat menerima data dari API
- ❌ Jangan buat kondisi berdasarkan nama infrastruktur bisnis: `if (nama === 'Jalan')`
- ❌ Jangan mulai implementasi OpenLayers interaction (itu Tahap 4+)
- ❌ Jangan mulai implementasi Draw/Select/Modify (itu Tahap 4+)

---

## 🧪 Kriteria Selesai (Definition of Done)

- [x] Type `InfrastrukturTipeConfig` ditambahkan ke `editor.types.ts`
- [x] `editorApi.ts` menyediakan `getInfrastrukturTipeConfig()` dan `listInfrastrukturTipe()`
- [x] `useEditorContext()` hook membangun `EditorContext` secara dinamis dari API response
- [x] Validasi `isSupportedGeometryType()` berjalan sebelum `buildEditorContext()`
- [x] `MapEditor.tsx` mendukung mode `dynamic` tanpa default geometry type
- [x] Loading dan error state ditampilkan dengan benar saat fetch berlangsung
- [x] Barrel export di-update
- [x] `npx tsc --noEmit` tidak menghasilkan error

---

## 📌 Catatan

Tahap ini **belum** membutuhkan:
- OpenLayers map atau interaction
- Koneksi ke data geospasial / layer peta
- CRUD feature (itu Tahap 8+)

Fokus Tahap 2 adalah **sambungan antara master data dan EditorContext** — memastikan engine editor benar-benar tidak bergantung pada konfigurasi statis di frontend.

---

**Dibuat:** 2026-08-14
**Referensi Arsitektur:** GIS_ARCHITECTURE.md §5, §7, §22, §27 Tahap 02
