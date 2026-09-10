# ISSUE-010 · Tahap 10: Draw / Create

**Label:** `enhancement` · `editor` · `draw` · `create` · `post`
**Milestone:** Phase 10 — Draw / Create
**Depends on:** [ISSUE-009](./ISSUE-009-cancel.md)
**Referensi:** [GIS_ARCHITECTURE.md](../GIS_ARCHITECTURE.md) — Bab 8, 13, 16, 18, 19, 27 (Tahap 10)

---

## 🎯 Tujuan

Mengimplementasikan **alur Draw / Create** — user dapat mendigitasi geometry baru di peta,
mengisi atribut melalui form, kemudian menyimpannya ke server via `POST` API.

Ini adalah alur **Create**, bukan Edit. Feature belum memiliki ID dari server.

---

## 📋 Latar Belakang

Dari arsitektur (§16 Data Flow Create):

```
User memilih jenis Infrastruktur
          ↓
infrastruktur_tipe → EditorContext
          ↓
geometryType (Point / LineString / Polygon)
          ↓
Activate Draw
          ↓
User mendigitasi geometry
          ↓
drawend → Draft Feature (geometry di store)
          ↓
Form Editing (isi atribut)
          ↓
Validation (frontend)
          ↓
POST /api/infrastructure
          ↓
PostGIS
```

Dari arsitektur (§8 Dynamic Draw):

```ts
// Jangan:
new Draw({ source, type: 'LineString' });

// Gunakan:
new Draw({ source, type: editorContext.geometryType });
```

Dari arsitektur (§19 Save Architecture — Create):

```http
POST /api/infrastructure
```

Payload:

```json
{
  "infrastructure_type_id": "xxx",
  "attributes": {},
  "geom": {}
}
```

---

## ✅ Task List

### 1. Tambah Fungsi `createInfrastructureFeature()` di `editorApi.ts`

Implementasi fungsi POST ke backend.

**File:** `app/features/editor/services/editorApi.ts` (update)

```ts
export interface CreateFeaturePayload {
  infrastructure_type_id: string;
  attributes: Record<string, unknown>;
  geom: GeoJSON.Geometry;
}

export interface CreateFeatureResult {
  id: string;
  success: boolean;
  message?: string;
}

export async function createInfrastructureFeature(
  payload: CreateFeaturePayload
): Promise<CreateFeatureResult>
```

**Aturan:**
- Endpoint: `POST /v1/infrastruktur`
- Payload mengikuti `{ infrastructure_type_id, attributes, geom }` sesuai §19
- Gunakan `getBaseUrl()` — tidak hardcode path
- Tidak ada default geometry type di payload — `geom` selalu dari store draft

---

### 2. Update `EditorController.activate('draw')` — Hook ke Store

Draw interaction sudah ada dari Tahap 3. Update agar event `drawend` disinkronkan ke store.

**File:** `app/features/editor/core/EditorController.ts` (update)

```ts
case 'draw': {
  // Bersihkan layer dulu sebelum draw baru
  clearEditableLayer(this.source);

  const draw = createDrawInteraction({
    source: this.source,
    geometryType: this.context.geometryType,
    onDrawEnd: (olFeature) => {
      // Ekstrak GeoJSON dan kirim ke store
      const geoJsonGeom = extractGeometryFromFeature(olFeature);
      if (geoJsonGeom) {
        this.onGeometryChange?.(geoJsonGeom);    // → setGeometry() → isDirty = true
        this.onDrawFeatureEnd?.(olFeature);      // → trigger form panel
      }
    },
  });

  this.map?.addInteraction(draw);
  this.activeInteraction = draw;
  break;
}
```

Tambahkan callback baru ke `EditorController`:

```ts
public onDrawFeatureEnd?: (feature: Feature<Geometry>) => void;
```

**Aturan:**
- Geometry type dari `this.context.geometryType` — TIDAK hardcode
- Clear layer sebelum mulai draw baru
- Setelah `drawend`: geometry tersimpan ke store, bukan langsung ke server

---

### 3. Tambah Style Kustom untuk Draw

Buat style visual untuk feature yang sedang didigitasi.

**File:** `app/features/editor/interactions/draw/drawStyle.ts` (BARU)

```ts
import { Style, Circle as CircleStyle, Fill, Stroke } from 'ol/style';

// Style untuk geometry saat proses draw berlangsung
export function getDrawStyle(): Style[]
```

Spesifikasi visual:
- Garis/area sedang dibuat → warna hijau dengan opacity rendah
- Vertex → lingkaran hijau kecil
- Preview segment (sebelum klik) → dashed line hijau

---

### 4. Update `createDrawInteraction()` — Tambah Style

**File:** `app/features/editor/interactions/draw/drawInteraction.ts` (update)

```ts
export interface DrawInteractionOptions {
  source: VectorSource<Feature<Geometry>>;
  geometryType: GeometryType;
  style?: StyleLike;              // ← tambahkan
  onDrawStart?: (feature: Feature<Geometry>) => void;
  onDrawEnd?: (feature: Feature<Geometry>) => void;
}

export function createDrawInteraction(options: DrawInteractionOptions): Draw {
  const draw = new Draw({
    source: options.source,
    type: options.geometryType,
    style: options.style ?? getDrawStyle(),
  });
  // ...
}
```

---

### 5. Buat `useCreateFeature` Hook

Hook untuk mengelola proses create/POST dari React component.

**File:** `app/features/editor/hooks/useCreateFeature.ts` (BARU)

```ts
export interface CreateFeatureOptions {
  infrastructureTypeId: string | null;
  formSchema?: FormSchema;
}

export function useCreateFeature(options: CreateFeatureOptions) {
  return {
    create,      // () => Promise<void> — validasi → POST → reset
    isSaving,    // boolean (gunakan isSaving dari store)
    createError, // string | null
  };
}
```

Flow di dalam `create()`:

```
1. Ambil geometry dari store (getState)
   → geometry null → setValidationErrors(['Geometri belum dibuat.']) → return
   ↓
2. Ambil formData dari store
   → validateFormData(formData, formSchema)
   → jika gagal → setValidationErrors() → return
   ↓
3. validateGeometryNotEmpty(geometry)
   → jika gagal → setValidationErrors() → return
   ↓
4. setIsSaving(true)
   ↓
5. try {
     POST via createInfrastructureFeature({
       infrastructure_type_id: infrastructureTypeId,
       attributes: formData,
       geom: geometry,
     })
   }
   ↓
6a. Sukses → resetDraft() + clearEditableLayer() + setSelectedFeatureId(newId)
6b. Gagal → setValidationErrors([error.message])
   ↓
7. finally { setIsSaving(false) }
```

**Aturan:**
- Tidak ada default geometry type
- `infrastructure_type_id` dari `activeContext` — bukan hardcode
- Setelah POST sukses: `setSelectedFeatureId(newId)` → FeatureInfo otomatis load feature baru

---

### 6. Mode Draw di `MapEditor` — Panel Form

Saat `drawend` terpanggil, tampilkan panel form agar user bisa mengisi atribut
SEBELUM menyimpan (bukan langsung POST).

**File:** `app/components/editor/MapEditor.tsx` (update)

State flow:

```
activeTool === 'draw' → user klik peta
       ↓
drawend → geometry masuk store → isDirty = true
       ↓
isDrawingNew = true (local state)
       ↓
Tampilkan FeatureForm (bukan FeatureInfo)
       ↓
User isi atribut → updateFormField → isDirty tetap true
       ↓
User klik [Simpan] → create() → POST
       ↓
Sukses → isDrawingNew = false + resetDraft()
```

Tambahkan local state di `MapEditor`:

```tsx
const [isDrawingNew, setIsDrawingNew] = useState<boolean>(false);
```

Wire ke controller:

```tsx
controllerRef.current.onDrawFeatureEnd = () => {
  setIsDrawingNew(true);
  setIsEditingForm(true);
};
```

---

### 7. Tombol Draw di Toolbar — Perlu Tidak Ada Feature Terpilih

Saat tool `draw` aktif, tidak perlu feature terpilih. Tombol Draw selalu enabled jika
`capabilities.draw === true`.

Pastikan `EditorToolbar` tidak salah disable tombol Draw (hanya Modify yang butuh selection).

**File:** `app/components/editor/EditorToolbar.tsx` — verifikasi

```tsx
// Hanya Modify yang butuh selectedFeatureId
const isDisabled = tool.id === 'modify' && !selectedFeatureId;
// Draw, Select, Snap, dll. → tidak butuh selectedFeatureId
```

---

### 8. Tangani Cancel Saat Draw (Sebelum drawend)

User bisa membatalkan proses draw sebelum selesai:
- Tekan **Escape** → batalkan draw saat ini, kembali ke tool sebelumnya
- Klik `[Batal]` toolbar → deactivate draw tool

**File:** `app/features/editor/interactions/draw/drawInteraction.ts` (update)

```ts
// Tambahkan keyboard shortcut Escape untuk abort draw
draw.on('drawabort', () => {
  options.onDrawAbort?.();
});
```

Dan tambahkan opsi:

```ts
interface DrawInteractionOptions {
  // ...
  onDrawAbort?: () => void; // ← tambahkan
}
```

Di `EditorController`:

```ts
public onDrawAbort?: () => void;
```

---

### 9. Update Barrel Export

```ts
// app/features/editor/index.ts — tambahkan
export * from './hooks/useCreateFeature';
export * from './interactions/draw/drawStyle';
```

---

## 🚫 Larangan pada Tahap Ini

- ❌ Jangan hardcode geometry type — selalu dari `EditorContext.geometryType`
- ❌ Jangan langsung POST saat `drawend` — tampilkan form atribut dulu
- ❌ Jangan simpan `ol/Feature` ke store — konversi ke GeoJSON dulu
- ❌ Jangan POST dengan geometry null atau formData tidak tervalidasi
- ❌ Jangan buat `PointDrawTool`, `LineDrawTool`, `PolygonDrawTool` terpisah
- ❌ Jangan mix Create flow dengan Edit/PATCH flow dalam satu hook

---

## 🧪 Kriteria Selesai (Definition of Done)

- [x] `createInfrastructureFeature()` mengirim `POST` dengan payload `{ infrastructure_type_id, attributes, geom }`
- [x] `createDrawInteraction()` menggunakan `geometryType` dari context — tidak hardcode
- [x] Event `drawend` → geometry masuk ke store (GeoJSON) → `isDirty = true`
- [x] Setelah `drawend`, panel `FeatureForm` otomatis tampil untuk pengisian atribut
- [x] `useCreateFeature.create()` memvalidasi geometry & form sebelum POST
- [x] Setelah POST sukses: `resetDraft()` + `clearEditableLayer()` + feature baru terpilih
- [x] Error dari backend ditampilkan via `validationErrors`
- [x] Tombol `[Draw]` enabled tanpa perlu ada feature yang dipilih
- [x] Cancel saat draw berlangsung (Escape/tombol Batal) → layer bersih, tool deactivate
- [x] Tidak ada hardcode geometry type, endpoint path, atau nama infrastruktur
- [x] `npx tsc --noEmit` tidak menghasilkan error

---

## 📌 Catatan

Tahap ini **belum** membutuhkan:
- Snap ke feature lain (itu Tahap 11 — bisa dikerjakan setelah Draw)
- Delete (itu Tahap 12)
- Split, Merge, Extend (itu Tahap 13–15)

Fokus Tahap 10 adalah **mendigitasi geometry baru → isi atribut → POST ke server**.
Draw interaction sudah ada dari Tahap 3, yang perlu ditambahkan adalah integrasi penuh
ke store, form panel, dan POST API.

---

**Dibuat:** 2026-08-14
**Referensi Arsitektur:** GIS_ARCHITECTURE.md §8, §13, §16, §18, §19, §27 Tahap 10
