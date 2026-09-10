# ISSUE-007 · Tahap 7: Modify

**Label:** `enhancement` · `editor` · `modify` · `geometry` · `openlayers`
**Milestone:** Phase 7 — Modify
**Depends on:** [ISSUE-006](./ISSUE-006-form.md)
**Referensi:** [GIS_ARCHITECTURE.md](../GIS_ARCHITECTURE.md) — Bab 9, 13, 17, 18, 27 (Tahap 07)

---

## 🎯 Tujuan

Mengaktifkan **Modify interaction** sehingga user dapat mengedit geometry feature yang sudah ada langsung di peta.

Modify bekerja untuk **semua geometry type** — tidak ada `PointModifyTool`, `LineModifyTool`, atau `PolygonModifyTool` yang terpisah. Satu interaction `ol/interaction/Modify` menangani semuanya.

---

## 📋 Latar Belakang

Dari arsitektur (§9 Dynamic Modify):

```
Point     → Modify (drag titik)
LineString → Modify (drag vertex / add vertex)
Polygon    → Modify (drag vertex / add vertex)
```

Dan dari §17 Data Flow Edit:

```
Select Feature
      ↓
Load Feature (Tahap 5)
      ↓
Read geometry type → EditorContext
      ↓
Create Draft (originalGeometry → geometry clone)
      ↓
Form Editing (Tahap 6) + Geometry Editing (Tahap 7 ← ini)
      ↓
isDirty = true
      ↓
Validation → Save (Tahap 8)
```

Perubahan geometry melalui Modify:
- Memperbarui `EditorStore.geometry` (draft)
- Tidak langsung disimpan ke server
- Men-trigger `isDirty = true`

---

## ✅ Task List

### 1. Load Feature ke Editable Layer

Sebelum Modify bisa berjalan, geometry feature yang dipilih harus dimuat ke `VectorSource` editable layer.

**File:** `app/features/editor/layers/editableLayer.ts` (update)

```ts
import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import type { Geometry } from 'geojson';
import { DEFAULT_EDITOR_CONFIG } from '../core/editor.config';

// Load geometry GeoJSON ke editable VectorSource
function loadFeatureToEditableLayer(
  source: VectorSource,
  featureId: string,
  geometry: Geometry
): Feature

// Hapus semua feature dari editable layer
function clearEditableLayer(source: VectorSource): void
```

**Aturan:**
- Format konversi: GeoJSON (EPSG:4326) → OpenLayers Feature (EPSG:3857)
- Gunakan `dataProjection` dan `featureProjection` dari `editor.config.ts`
- Feature yang dimuat ke layer diberi ID yang sama dengan `featureId` dari store

---

### 2. Aktifkan Modify dari `EditorController`

Update `EditorController.activate('modify')` agar:
1. Memuat geometry dari `EditorStore.geometry` ke `editableLayer`
2. Mengaktifkan `ol/interaction/Modify` pada source tersebut
3. Mendengarkan event `modifyend` untuk update store

```ts
// Di EditorController.activate('modify'):
case 'modify': {
  const geometry = this.getStoreGeometry?.(); // callback ke store
  if (!geometry) {
    console.warn('[EditorController] Tidak ada geometry untuk dimodifikasi.');
    return false;
  }

  // Load geometry ke editable layer
  const feature = loadFeatureToEditableLayer(
    this.source,
    this.editingFeatureId,
    geometry
  );

  // Aktifkan Modify interaction
  const modify = createModifyInteraction({
    source: this.source,
    onModifyEnd: (features) => {
      const updatedGeom = extractGeometryFromFeature(features[0]);
      this.onGeometryChange?.(updatedGeom);
    },
  });

  this.map?.addInteraction(modify);
  this._activeInteraction = modify;
  break;
}
```

Tambahkan callbacks ke `EditorController`:

```ts
class EditorController {
  getStoreGeometry?: () => GeoJSON.Geometry | null;
  onGeometryChange?: (geometry: GeoJSON.Geometry) => void;
  editingFeatureId?: string | null;
}
```

---

### 3. GeoJSON ↔ OpenLayers Feature Converter

Buat utility konversi antara GeoJSON dan OpenLayers geometry.

**File:** `app/features/editor/geometry/common/geoJsonConverter.ts`

```ts
import GeoJSON from 'ol/format/GeoJSON';
import type { Feature } from 'ol';
import type { Geometry as OlGeometry } from 'ol/geom';
import type { Geometry as GeoJsonGeometry } from 'geojson';

const format = new GeoJSON();

// GeoJSON → ol/Feature (dengan reprojektion)
function geoJsonToFeature(
  geojson: GeoJsonGeometry,
  featureId?: string
): Feature<OlGeometry>

// ol/Feature → GeoJSON Geometry (dengan reprojektion)
function featureToGeoJson(feature: Feature<OlGeometry>): GeoJsonGeometry

// Ekstrak geometry dari ol/Feature dan konversi ke GeoJSON
function extractGeometryFromFeature(
  feature: Feature<OlGeometry>
): GeoJsonGeometry | null
```

**Aturan:**
- Selalu gunakan `dataProjection: 'EPSG:4326'` dan `featureProjection: 'EPSG:3857'`
- Nilai proyeksi diambil dari `DEFAULT_EDITOR_CONFIG`

---

### 4. Update `useEditor` — Wire Geometry Callbacks

Di `useEditor.ts`, sambungkan callbacks geometry controller ke store:

```ts
// Di initEditor():
controller.getStoreGeometry = () => {
  return useEditorStore.getState().geometry;
};

controller.onGeometryChange = (geometry) => {
  setGeometry(geometry);  // → isDirty otomatis true
};
```

---

### 5. Modify Style — Visual Feedback

Buat style khusus untuk vertex dan handle saat mode Modify aktif.

**File:** `app/features/editor/interactions/modify/modifyStyle.ts`

```ts
import { Style, Circle, Fill, Stroke } from 'ol/style';

// Style untuk vertex handle saat mode Modify aktif
function getModifyStyle(): Style[]
```

Spesifikasi visual:
- Vertex yang bisa di-drag → lingkaran putih dengan border biru
- Midpoint (add vertex) → lingkaran abu-abu kecil
- Geometry aktif → highlight warna lebih terang

---

### 6. Update `createModifyInteraction` (dari Tahap 3)

Tambahkan support style dan event `modifyend`:

```ts
interface ModifyInteractionOptions {
  source: VectorSource;
  style?: StyleLike;                              // ← tambahkan
  onModifyStart?: () => void;                     // ← tambahkan
  onModifyEnd?: (features: Feature[]) => void;
}

function createModifyInteraction(options: ModifyInteractionOptions): Modify {
  const modify = new Modify({
    source: options.source,
    style: options.style ?? getModifyStyle(),
  });

  if (options.onModifyEnd) {
    modify.on('modifyend', (e) => {
      const features = e.features.getArray();
      options.onModifyEnd!(features);
    });
  }

  return modify;
}
```

---

### 7. Sinkronisasi Geometry: Store → Peta

Saat user beralih ke tool Modify, geometry terbaru dari store harus dimuat ke editable layer. Tangani juga kasus ketika geometry sudah berubah (misal user sudah edit form terlebih dahulu):

```ts
// Di activate('modify'):
// 1. Clear layer dulu
clearEditableLayer(this.source);
// 2. Load geometry dari store (bisa saja sudah berubah sejak select)
const geometry = this.getStoreGeometry?.();
if (geometry) {
  loadFeatureToEditableLayer(this.source, this.editingFeatureId, geometry);
}
```

---

### 8. Sinkronisasi Geometry: Peta → Store

Setiap kali event `modifyend` terjadi, update store:

```ts
// Event flow:
ol/Modify modifyend
      ↓
extractGeometryFromFeature(feature)
      ↓
EditorController.onGeometryChange(geojsonGeometry)
      ↓
EditorStore.setGeometry(geometry)
      ↓
isDirty = true
      ↓
SaveBar muncul
```

---

### 9. Tombol Modify di Toolbar

Pastikan tombol `[Modify]` di `EditorToolbar`:
- Ditampilkan hanya jika `capabilities.modify === true`
- Dinonaktifkan jika belum ada feature yang dipilih (`selectedFeatureId === null`)
- Mengaktifkan `EditorController.activate('modify')` saat diklik

```tsx
// Di EditorToolbar:
const isModifyDisabled = !capabilities?.modify || !selectedFeatureId;

<button
  id="tool-btn-modify"
  disabled={isModifyDisabled}
  onClick={() => activateTool('modify')}
>
  <Pencil />
</button>
```

---

### 10. Update barrel export

```ts
// app/features/editor/index.ts — tambahkan
export * from './geometry/common/geoJsonConverter';
export * from './interactions/modify/modifyStyle';

// app/features/editor/layers/index.ts — tambahkan
export * from './editableLayer';
```

---

## 🚫 Larangan pada Tahap Ini

- ❌ Jangan buat `PointModifyTool`, `LineModifyTool`, `PolygonModifyTool` — satu `Modify` untuk semua
- ❌ Jangan simpan `ol/Feature` atau `ol/geom/*` ke Zustand store — konversi ke GeoJSON terlebih dahulu
- ❌ Jangan langsung PATCH ke API saat geometry berubah (itu Tahap 8)
- ❌ Jangan gunakan proyeksi hardcode: selalu dari `editor.config.ts`
- ❌ Jangan aktifkan Modify tanpa feature yang tersedia di editable layer

---

## 🧪 Kriteria Selesai (Definition of Done)

- [x] `loadFeatureToEditableLayer()` memuat geometry GeoJSON ke OpenLayers VectorSource dengan konversi proyeksi
- [x] `geoJsonToFeature()` dan `featureToGeoJson()` berfungsi untuk Point, LineString, dan Polygon
- [x] `EditorController.activate('modify')` memuat geometry ke layer dan mengaktifkan Modify interaction
- [x] Event `modifyend` → `extractGeometryFromFeature()` → `EditorStore.setGeometry()`
- [x] `isDirty = true` setelah geometry dimodifikasi
- [x] `SaveBar` muncul setelah geometry berubah
- [x] Tombol `[Modify]` di toolbar disabled jika tidak ada feature yang dipilih
- [x] Vertex handle tampil dengan style yang jelas saat mode Modify aktif
- [x] Proyeksi selalu EPSG:4326 ↔ EPSG:3857 via config — tidak hardcode
- [x] `npx tsc --noEmit` tidak menghasilkan error

---

## 📌 Catatan

Tahap ini **belum** membutuhkan:
- Simpan perubahan ke API (itu Tahap 8)
- Cancel / Reset flow (itu Tahap 9)
- Draw / Create feature baru (itu Tahap 10)
- Snap ke feature lain (itu Tahap 11)

Fokus Tahap 7 adalah **edit geometry feature yang ada → perubahan tersimpan ke draft di EditorStore** — tidak ada operasi ke server.

---

**Dibuat:** 2026-08-14
**Referensi Arsitektur:** GIS_ARCHITECTURE.md §9, §13, §14, §17, §18, §27 Tahap 07
