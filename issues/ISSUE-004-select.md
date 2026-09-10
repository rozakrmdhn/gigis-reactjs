# ISSUE-004 · Tahap 4: Select

**Label:** `enhancement` · `editor` · `select` · `openlayers`
**Milestone:** Phase 4 — Select
**Depends on:** [ISSUE-003](./ISSUE-003-dynamic-geometry-type.md)
**Referensi:** [GIS_ARCHITECTURE.md](../GIS_ARCHITECTURE.md) — Bab 6, 12, 15, 27 (Tahap 04)

---

## 🎯 Tujuan

Mengimplementasikan **Select interaction** sehingga user dapat mengklik feature di peta untuk memilihnya.

Ketika feature dipilih, sistem menyimpan `selectedFeatureId` ke `EditorStore` dan memicu fetch data lengkap feature tersebut dari API.

---

## 📋 Latar Belakang

Dari arsitektur (§15 Data Flow Select):

```
User klik feature
       ↓
OpenLayers Select
       ↓
Feature ID
       ↓
Editor Store → selectedFeatureId
       ↓
GET /api/infrastructure/:id
       ↓
Feature data
       ↓
Editor Store
```

Select adalah **pintu masuk** ke semua operasi editing berikutnya (Modify, Delete, Form).

Select harus bekerja untuk **semua geometry type** — Point, LineString, maupun Polygon — tanpa kondisi berdasarkan tipe.

---

## ✅ Task List

### 1. Select Interaction (`select/`)

Buat modul Select yang membungkus `ol/interaction/Select`.

**File:** `app/features/editor/interactions/select/selectInteraction.ts`

```ts
import Select from 'ol/interaction/Select';
import type { Feature } from 'ol';
import type { StyleLike } from 'ol/style/Style';

interface SelectInteractionOptions {
  layers?: Layer[];
  style?: StyleLike;        // style highlight saat feature dipilih
  onSelect?: (feature: Feature | null) => void;
  onDeselect?: () => void;
}

function createSelectInteraction(options: SelectInteractionOptions): Select
```

Behavior:
- Klik feature → `onSelect(feature)` dipanggil
- Klik area kosong → `onSelect(null)` / `onDeselect()` dipanggil
- Hanya satu feature yang dapat dipilih dalam satu waktu

---

### 2. Feature ID Extraction

Extract feature ID dari OpenLayers Feature ke format string yang disimpan di store.

**File:** `app/features/editor/interactions/select/selectInteraction.ts` (tambahkan)

```ts
// Mendapatkan ID dari ol/Feature
function getFeatureId(feature: Feature): string | null {
  const id = feature.getId();
  if (id === undefined || id === null) return null;
  return String(id);
}
```

**Aturan:**
- Feature ID berasal dari data (misal `feature.getId()`)
- Jika feature tidak memiliki ID → `selectedFeatureId = null`, tidak crash

---

### 3. Update `EditorController.ts` — Select Tool

Integrasikan `createSelectInteraction()` ke dalam `EditorController.activate('select')`.

```ts
// Di dalam activate(tool):
case 'select': {
  const interaction = createSelectInteraction({
    layers: [editableLayer, referenceLayer],
    style: SELECTED_FEATURE_STYLE,
    onSelect: (feature) => {
      const id = feature ? getFeatureId(feature) : null;
      // Notify store melalui callback / event
      this.onFeatureSelect?.(id);
    },
    onDeselect: () => {
      this.onFeatureSelect?.(null);
    },
  });
  this.map?.addInteraction(interaction);
  this._activeInteraction = interaction;
  break;
}
```

Tambahkan callback ke `EditorController`:

```ts
class EditorController {
  onFeatureSelect?: (featureId: string | null) => void;
  // ...
}
```

---

### 4. Selected Feature Style

Buat style khusus untuk feature yang sedang dipilih (highlight).

**File:** `app/features/editor/interactions/select/selectStyle.ts`

```ts
import { Style, Stroke, Fill, Circle } from 'ol/style';
import type { GeometryType } from '../../core/editor.types';

// Style highlight saat dipilih — dinamis berdasarkan geometry type
function getSelectedStyle(geometryType: GeometryType): Style
```

Contoh style per type:
- **Point** → lingkaran biru dengan border putih
- **LineString** → garis biru tebal dengan outline putih
- **Polygon** → fill biru transparan dengan border biru

**Aturan:**
- Style **boleh** berbeda per geometry type untuk UX
- Penentuan style berdasarkan geometry type dari context — **bukan nama infrastruktur**

---

### 5. Hook `useEditorSelection.ts` — Update

Update hook `useEditorSelection` (sudah ada dari Tahap 1) untuk menangani alur select dari map.

Tambahkan method:

```ts
// Dipanggil saat EditorController mendeteksi klik feature di map
function onMapFeatureSelected(featureId: string | null): void
```

Flow:
```
Map klik → EditorController.onFeatureSelect(id)
                    ↓
          useEditorSelection.onMapFeatureSelected(id)
                    ↓
          setSelectedFeatureId(id)
                    ↓
          [Tahap 5] trigger fetch feature detail
```

---

### 6. Deselect saat ganti tool

Ketika user beralih dari `select` ke tool lain (misal `draw`), feature yang dipilih harus di-deselect.

```ts
// Di EditorController.activate():
// Sebelum aktivasi tool baru, clear selection jika tool sebelumnya adalah 'select'
if (this.activeTool === 'select' && tool !== 'select') {
  this.clearSelection();
}
```

Tambahkan method:
```ts
clearSelection(): void {
  // Remove ol/Select interaction
  // this.onFeatureSelect?.(null)
}
```

---

### 7. Visual Feedback: Cursor Pointer

Saat tool `select` aktif dan user hover di atas feature, ubah cursor menjadi pointer.

**File:** `app/features/editor/interactions/select/selectInteraction.ts` (tambahkan)

```ts
// Setup pointer cursor saat hover feature
function setupHoverCursor(map: Map, layers: Layer[]): () => void {
  // map.on('pointermove', ...) → ubah cursor jika ada feature di bawah pointer
  // return cleanup function
}
```

---

### 8. Update `EditorController` — Wire ke `useEditor` hook

Di `useEditor.ts`, sambungkan callback `onFeatureSelect` dari controller ke store:

```ts
// Di dalam initEditor():
controller.onFeatureSelect = (id) => {
  setSelectedFeatureId(id);
};
```

---

### 9. Update `EditorToolbar.tsx` — Tombol Select

Pastikan tombol `[Select]` di toolbar:
- Ditampilkan jika `capabilities.select === true`
- Menampilkan state aktif dengan warna berbeda
- Mengaktifkan `EditorController.activate('select')` saat diklik

Ini sudah ada di shell Tahap 1, pastikan tombol benar-benar memicu interaksi map.

---

### 10. Update barrel export

```ts
// app/features/editor/index.ts — tambahkan
export * from './interactions/select/selectInteraction';
export * from './interactions/select/selectStyle';
```

---

## 🚫 Larangan pada Tahap Ini

- ❌ Jangan tampilkan form attribute di tahap ini (itu Tahap 6)
- ❌ Jangan fetch data feature detail di tahap ini (itu Tahap 5)
- ❌ Jangan hardcode style berdasarkan nama infrastruktur: `if (nama === 'Jalan')`
- ❌ Jangan simpan `ol/Feature` object ke Zustand store — hanya simpan `featureId: string`
- ❌ Jangan aktifkan Select di atas Reference Layer (MVT) jika data belum siap — fokus ke Editable Layer dulu

---

## 🧪 Kriteria Selesai (Definition of Done)

- [x] `createSelectInteraction()` berfungsi dan memanggil callback saat feature diklik
- [x] `getFeatureId()` mengekstrak ID feature dari `ol/Feature`
- [x] `EditorController.activate('select')` menambahkan Select interaction ke map
- [x] Klik feature → `selectedFeatureId` tersimpan di `EditorStore`
- [x] Klik area kosong → `selectedFeatureId = null`
- [x] Feature yang dipilih memiliki visual highlight yang jelas
- [x] Cursor berubah menjadi pointer saat hover di atas feature
- [x] Deselect otomatis terjadi saat user beralih ke tool lain
- [x] Tombol `[Select]` di toolbar memicu interaksi map yang benar
- [x] `npx tsc --noEmit` tidak menghasilkan error

---

## 📌 Catatan

Tahap ini **belum** membutuhkan:
- Fetch data detail feature dari API (itu Tahap 5)
- Panel detail / info feature (itu Tahap 5)
- Form attribute editing (itu Tahap 6)
- Modify geometry dari UI (itu Tahap 7)

Fokus Tahap 4 adalah **interaksi klik map → `selectedFeatureId` di store** — koneksi antara peta dan state React.

---

**Dibuat:** 2026-08-14
**Referensi Arsitektur:** GIS_ARCHITECTURE.md §6, §12, §15, §27 Tahap 04
