# ISSUE-005 · Tahap 5: Feature Detail

**Label:** `enhancement` · `editor` · `feature` · `api`
**Milestone:** Phase 5 — Feature Detail
**Depends on:** [ISSUE-004](./ISSUE-004-select.md)
**Referensi:** [GIS_ARCHITECTURE.md](../GIS_ARCHITECTURE.md) — Bab 15, 17, 18, 27 (Tahap 05)

---

## 🎯 Tujuan

Setelah user memilih feature di peta (Tahap 4), sistem **mengambil data lengkap feature tersebut dari API** dan menampilkan informasinya di panel detail.

Tahap ini menghubungkan `selectedFeatureId` di store dengan data atribut dan geometry aktual dari backend.

---

## 📋 Latar Belakang

Dari arsitektur (§15 Data Flow Select & §17 Data Flow Edit):

```
selectedFeatureId
       ↓
GET /api/infrastructure/:id
       ↓
{ id, attributes, geom, infrastruktur_tipe }
       ↓
Verifikasi geometry type sesuai EditorContext
       ↓
EditorStore:
  geometry = geom
  originalGeometry = geom
  formData = attributes
       ↓
FeatureInfo panel (read-only)
```

**Geometry type harus diverifikasi** dari data feature yang diterima API — bukan diasumsikan dari context saja (§15).

---

## ✅ Task List

### 1. Type Data Feature Response

Definisikan type untuk response API `GET /api/infrastructure/:id`.

**File:** `app/features/editor/core/editor.types.ts` (tambahkan)

```ts
export interface FeatureAttributes {
  [key: string]: unknown;
}

export interface InfrastructureFeature {
  id: string;
  infrastructure_type_id: string;
  attributes: FeatureAttributes;
  geom: GeoJSON.Geometry;
  created_at?: string;
  updated_at?: string;
}
```

**Aturan:**
- `geom` selalu berupa `GeoJSON.Geometry` — proyeksi EPSG:4326
- `infrastructure_type_id` digunakan untuk verifikasi konsistensi dengan `EditorContext`

---

### 2. Service: `getInfrastructureFeature()`

Tambahkan fungsi fetch ke service layer.

**File:** `app/features/editor/services/editorApi.ts` (tambahkan)

```ts
// Mengambil data lengkap satu feature berdasarkan ID
async function getInfrastructureFeature(
  id: string
): Promise<InfrastructureFeature>
```

**Aturan:**
- Validasi bahwa `feature.geom.type` sesuai dengan `EditorContext.geometryType`
- Jika tidak sesuai → throw error deskriptif (tidak boleh silent fail)
- Gunakan base URL dari environment variable

---

### 3. Hook `useFeatureDetail.ts`

Buat hook untuk fetch dan simpan data feature ke store.

**File:** `app/features/editor/hooks/useFeatureDetail.ts`

```ts
interface UseFeatureDetailOptions {
  featureId: string | null;
  expectedGeometryType: GeometryType | null;
  enabled?: boolean;
}

interface UseFeatureDetailResult {
  feature: InfrastructureFeature | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

function useFeatureDetail(
  options: UseFeatureDetailOptions
): UseFeatureDetailResult
```

Flow internal:
```
featureId berubah (selectedFeatureId dari store)
       ↓
getInfrastructureFeature(featureId)
       ↓
validateGeometryType(feature.geom, expectedGeometryType)
       ↓
setOriginalGeometry(feature.geom)   → store
setFormData(feature.attributes)     → store
```

**Aturan:**
- Auto-trigger saat `selectedFeatureId` berubah
- `expectedGeometryType` dari `EditorContext.geometryType`
- Jika `featureId = null` → reset detail, tidak fetch

---

### 4. Komponen `FeatureInfo.tsx`

Buat panel info read-only untuk menampilkan data feature yang dipilih.

**File:** `app/components/editor/FeatureInfo.tsx`

```tsx
interface FeatureInfoProps {
  feature: InfrastructureFeature | null;
  isLoading: boolean;
  error: Error | null;
  onStartEdit?: () => void;
  onClose?: () => void;
}

function FeatureInfo({
  feature,
  isLoading,
  error,
  onStartEdit,
  onClose,
}: FeatureInfoProps)
```

UI yang ditampilkan:

```
┌─────────────────────────────────┐
│ 📍 Feature Detail        [✕]    │
├─────────────────────────────────┤
│  ID       : 12345               │
│  Tipe     : Jalan Poros Desa    │
│  Geometry : LineString          │
│                                 │
│  [Atribut A]  nilai...          │
│  [Atribut B]  nilai...          │
│  [Atribut C]  nilai...          │
│                                 │
│  [Edit]          [Tutup]        │
└─────────────────────────────────┘
```

**Aturan:**
- Panel ini **read-only** — belum ada form editing (itu Tahap 6)
- Tombol `[Edit]` hanya mengubah state `isEditing` di store
- Atribut ditampilkan secara dinamis dari `feature.attributes` — tidak hardcode field name
- Geometry type ditampilkan dari data (`feature.geom.type`) — bukan dari nama infrastruktur

---

### 5. Integrasi ke `MapEditor.tsx`

Tambahkan panel `FeatureInfo` ke dalam `MapEditor`.

```tsx
function MapEditor({ ... }) {
  const { selectedFeatureId, geometryType } = useEditor();

  const { feature, isLoading, error } = useFeatureDetail({
    featureId: selectedFeatureId,
    expectedGeometryType: geometryType,
  });

  return (
    <div id="map-editor-container">
      <EditorToolbar />
      <div id="map-viewport" />

      {/* Panel Feature Detail — muncul saat ada feature terpilih */}
      {selectedFeatureId && (
        <div className="absolute right-4 top-4 z-10 w-80">
          <FeatureInfo
            feature={feature}
            isLoading={isLoading}
            error={error}
            onStartEdit={() => { /* Tahap 6 */ }}
            onClose={() => setSelectedFeatureId(null)}
          />
        </div>
      )}

      <SaveBar />
    </div>
  );
}
```

---

### 6. Loading & Error State `FeatureInfo`

Tangani kondisi saat data sedang di-fetch atau terjadi error:

```tsx
// Loading state
if (isLoading) {
  return <FeatureInfoSkeleton />;  // Skeleton loader
}

// Error state
if (error) {
  return (
    <FeatureInfoError
      message={error.message}
      onRetry={refetch}
    />
  );
}
```

---

### 7. Verifikasi Konsistensi Geometry Type

Setelah data feature diterima, validasi konsistensi dengan context:

```ts
// Di useFeatureDetail atau getInfrastructureFeature
const featureGeomType = feature.geom.type; // 'Point' | 'LineString' | 'Polygon'

if (expectedGeometryType && featureGeomType !== expectedGeometryType) {
  throw new Error(
    `Geometry type tidak konsisten: ` +
    `context="${expectedGeometryType}", ` +
    `feature="${featureGeomType}" (ID: ${feature.id})`
  );
}
```

Ini mengimplementasikan §21 Geometry Type Consistency dari arsitektur.

---

### 8. Update EditorStore — `setOriginalGeometry` & `setFormData`

Saat data feature berhasil di-fetch, update store:

```ts
// Di useFeatureDetail, setelah fetch berhasil:
setOriginalGeometry(feature.geom);  // set draft = original
setFormData(feature.attributes);    // populate form data
```

Fungsi `setOriginalGeometry` sudah tersedia dari Tahap 1 — pastikan dipanggil dengan benar sehingga:
- `geometry` = deep copy dari `originalGeometry`
- `isDirty = false`

---

### 9. Panel Close — Reset State

Saat user menutup panel `FeatureInfo`:

```ts
// onClose handler:
setSelectedFeatureId(null);   // hapus seleksi di store
resetDraft();                 // reset geometry dan formData
// EditorController akan clear selection dari map (Tahap 4 §6)
```

---

### 10. Update barrel export

```ts
// app/features/editor/index.ts — tambahkan
export * from './hooks/useFeatureDetail';
export type { InfrastructureFeature, FeatureAttributes } from './core/editor.types';

// app/components/editor/index.ts — tambahkan
export * from './FeatureInfo';
```

---

## 🚫 Larangan pada Tahap Ini

- ❌ Jangan tampilkan form yang bisa diedit di `FeatureInfo` (itu Tahap 6)
- ❌ Jangan hardcode nama field atribut: `feature.attributes.nama_jalan` — tampilkan dinamis
- ❌ Jangan asumsikan geometry type tanpa verifikasi dari data API
- ❌ Jangan simpan `GeoJSON.Geometry` langsung sebagai string ke store — gunakan object
- ❌ Jangan mulai Modify geometry dari UI (itu Tahap 7)

---

## 🧪 Kriteria Selesai (Definition of Done)

- [x] Type `InfrastructureFeature` dan `FeatureAttributes` didefinisikan
- [x] `getInfrastructureFeature(id)` melakukan fetch ke API dan mengembalikan data feature
- [x] `useFeatureDetail` auto-fetch saat `selectedFeatureId` berubah
- [x] Geometry type dari response API divalidasi terhadap `expectedGeometryType`
- [x] `setOriginalGeometry()` dan `setFormData()` dipanggil setelah fetch berhasil
- [x] Panel `FeatureInfo` menampilkan atribut secara dinamis (tidak hardcode field)
- [x] Loading skeleton tampil saat fetch berlangsung
- [x] Error state tampil dengan tombol retry jika fetch gagal
- [x] Panel menutup dengan benar dan mereset state store
- [x] `npx tsc --noEmit` tidak menghasilkan error

---

## 📌 Catatan

Tahap ini **belum** membutuhkan:
- Form editing atribut (itu Tahap 6)
- Modify geometry via peta (itu Tahap 7)
- Tombol Simpan yang fungsional (itu Tahap 8)

Fokus Tahap 5 adalah **fetch data lengkap feature → tampilkan info read-only** — menjembatani state select dengan data aktual dari backend.

---

**Dibuat:** 2026-08-14
**Referensi Arsitektur:** GIS_ARCHITECTURE.md §15, §17, §18, §21, §27 Tahap 05
