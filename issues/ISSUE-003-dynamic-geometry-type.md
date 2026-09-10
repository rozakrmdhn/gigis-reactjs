# ISSUE-003 · Tahap 3: Dynamic Geometry Type

**Label:** `enhancement` · `editor` · `geometry` · `openlayers`
**Milestone:** Phase 3 — Dynamic Geometry Type
**Depends on:** [ISSUE-001](./ISSUE-001-core-editor.md) ✅ · [ISSUE-002](./ISSUE-002-dynamic-editor-context.md)
**Referensi:** [GIS_ARCHITECTURE.md](../GIS_ARCHITECTURE.md) — Bab 3, 8, 9, 11, 21, 29 (Tahap 03)

---

## 🎯 Tujuan

Memastikan **Geometry Type mengalir secara dinamis** dari `EditorContext` ke seluruh lapisan engine editor — khususnya ke interaksi OpenLayers.

Tahap ini mengintegrasikan OpenLayers ke dalam proyek untuk pertama kalinya dan membangun infrastruktur peta dasar yang siap menerima context dinamis.

---

## 📋 Latar Belakang

Dari arsitektur (§8 Dynamic Draw, §9 Dynamic Modify):

**Jangan:**
```ts
new Draw({ source, type: 'LineString' }); // ❌ HARD-CODE
```

**Gunakan:**
```ts
new Draw({ source, type: editorContext.geometryType }); // ✅ DINAMIS
```

Prinsip ini berlaku untuk **semua** OpenLayers interaction yang menerima geometry type sebagai parameter.

Alur yang harus terbentuk:

```
EditorContext.geometryType
       ↓
EditorController
       ↓
ol/interaction/Draw   → type: geometryType
ol/interaction/Modify → bekerja pada geometry apapun
ol/interaction/Snap   → bekerja pada source apapun
```

---

## ✅ Task List

### 1. Inisialisasi OpenLayers Map (`mapInstance.ts`)

Buat module singleton untuk inisialisasi dan akses instance `ol/Map`.

**File:** `app/features/editor/layers/mapInstance.ts`

```ts
import Map from 'ol/Map';
import View from 'ol/View';
import { fromLonLat } from 'ol/proj';

// Membuat instance ol/Map terikat pada HTML container
function createMap(targetId: string, config?: Partial<MapInitConfig>): Map

// Referensi ke map yang sedang aktif (dikelola di luar React state/store)
let _mapInstance: Map | null = null;

function getMap(): Map | null
function setMap(map: Map): void
function destroyMap(): void
```

**Aturan:**
- Instance map **TIDAK** disimpan di Zustand store
- `targetId` diambil dari `id="map-viewport"` di `MapEditor.tsx`
- Proyeksi default: `EPSG:3857` (dari `editor.config.ts`)

---

### 2. Layer Architecture — Reference & Editable

Buat dua layer sesuai arsitektur §14:

**File:** `app/features/editor/layers/referenceLayer.ts`
```ts
import VectorTileLayer from 'ol/layer/VectorTile';

// Layer untuk data besar (read-only): MVT / PMTiles
// Tahap ini: buat layer kosong sebagai placeholder
function createReferenceLayer(): VectorTileLayer
```

**File:** `app/features/editor/layers/editableLayer.ts`
```ts
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';

// Layer untuk feature yang sedang diedit/digitasi
function createEditableLayer(): { layer: VectorLayer, source: VectorSource }
```

**Aturan:**
- `VectorSource` instance dikelola di luar store React
- Layer dan source bersifat **mutable object** — jangan serialisasi ke Zustand

---

### 3. Hook `useMapInstance.ts`

Buat hook untuk inisialisasi dan lifecycle OpenLayers Map.

**File:** `app/features/editor/hooks/useMapInstance.ts`

```ts
interface UseMapInstanceOptions {
  targetId: string;
  center?: [number, number]; // [lon, lat] dalam EPSG:4326
  zoom?: number;
}

function useMapInstance(options: UseMapInstanceOptions): {
  isReady: boolean;
  getMap: () => ol.Map | null;
}
```

Flow hook:
```
Mount
  ↓
createMap(targetId)
  ↓
addLayer(referenceLayer)
addLayer(editableLayer)
  ↓
isReady = true

Unmount
  ↓
destroyMap()
```

**Aturan:**
- `useEffect` dengan cleanup untuk dispose map saat unmount
- Jangan expose instance map sebagai React state

---

### 4. Dynamic Draw Interaction (`draw/`)

Buat modul draw yang menerima geometry type dari context.

**File:** `app/features/editor/interactions/draw/drawInteraction.ts`

```ts
import Draw from 'ol/interaction/Draw';
import type { GeometryType } from '../../core/editor.types';

interface DrawInteractionOptions {
  source: VectorSource;
  geometryType: GeometryType; // WAJIB dari EditorContext
  onDrawEnd?: (feature: Feature) => void;
}

function createDrawInteraction(options: DrawInteractionOptions): Draw
```

**Aturan:**
- Parameter `geometryType` wajib — tidak ada default value
- `new Draw({ type: geometryType })` — bukan hardcode string
- Untuk `Point` → Draw Point
- Untuk `LineString` → Draw LineString
- Untuk `Polygon` → Draw Polygon (satu interaksi yang sama)

---

### 5. Dynamic Modify Interaction (`modify/`)

Buat modul modify yang berfungsi untuk semua geometry type.

**File:** `app/features/editor/interactions/modify/modifyInteraction.ts`

```ts
import Modify from 'ol/interaction/Modify';

interface ModifyInteractionOptions {
  source: VectorSource;
  onModifyEnd?: (features: Feature[]) => void;
}

// Satu Modify interaction untuk semua geometry type
// Tidak perlu PointModifyTool / LineModifyTool / PolygonModifyTool
function createModifyInteraction(options: ModifyInteractionOptions): Modify
```

---

### 6. Snap Interaction (`snap/`)

**File:** `app/features/editor/interactions/snap/snapInteraction.ts`

```ts
import Snap from 'ol/interaction/Snap';

interface SnapInteractionOptions {
  source: VectorSource;
  pixelTolerance?: number; // default dari editor.config.ts
}

function createSnapInteraction(options: SnapInteractionOptions): Snap
```

---

### 7. Update `EditorController.ts` — Integrasi Interaction

Update `EditorController` untuk mengelola lifecycle OpenLayers interactions.

```ts
import type Map from 'ol/Map';
import type VectorSource from 'ol/source/Vector';

class EditorController {
  private map: Map | null = null;
  private source: VectorSource | null = null;

  // Existing methods...

  // Baru di Tahap 3:
  attachMap(map: Map, source: VectorSource): void
  detachMap(): void

  // Override activate() untuk menginisialisasi interaction yang sesuai
  activate(tool: EditorTool): boolean {
    // Jika tool = 'draw' → createDrawInteraction({ geometryType })
    // Jika tool = 'modify' → createModifyInteraction(...)
    // Jika tool = 'snap' → createSnapInteraction(...)
    // TIDAK ADA default geometryType
  }
}
```

---

### 8. Update `MapEditor.tsx` — Inisialisasi Map

Update `MapEditor` untuk menginisialisasi map setelah EditorContext tersedia.

```tsx
function MapEditor({ ... }) {
  const { initEditor } = useEditor();
  const { isReady } = useMapInstance({ targetId: 'map-viewport' });

  // Inisialisasi EditorContext dulu, baru attach map ke controller
  useEffect(() => {
    if (!isReady || !context) return;
    
    const map = getMap();
    const { source } = getEditableLayer();
    
    controller.attachMap(map, source);
  }, [isReady, context]);

  return (
    <div id="map-editor-container">
      <EditorToolbar />
      <div id="map-viewport" className="w-full h-full" />
      <SaveBar />
    </div>
  );
}
```

---

### 9. Geometry Type Validation Layer (`common/validation.ts`)

Buat validasi geometry di sisi frontend sebelum operasi editing.

**File:** `app/features/editor/geometry/common/validation.ts`

```ts
import type { Geometry } from 'geojson';
import type { GeometryType } from '../../core/editor.types';

interface GeometryValidationResult {
  valid: boolean;
  errors: string[];
}

// Validasi bahwa geometry type sesuai dengan EditorContext
function validateGeometryType(
  geometry: Geometry,
  expectedType: GeometryType
): GeometryValidationResult

// Validasi geometry tidak null/kosong
function validateGeometryNotEmpty(
  geometry: Geometry | null
): GeometryValidationResult
```

---

### 10. Update barrel export

```ts
// app/features/editor/index.ts — tambahkan
export * from './layers/mapInstance';
export * from './layers/editableLayer';
export * from './hooks/useMapInstance';
export * from './interactions/draw/drawInteraction';
export * from './interactions/modify/modifyInteraction';
export * from './interactions/snap/snapInteraction';
export * from './geometry/common/validation';
```

---

## 🚫 Larangan pada Tahap Ini

- ❌ `new Draw({ type: 'LineString' })` — selalu gunakan `editorContext.geometryType`
- ❌ Menyimpan instance OpenLayers (`Map`, `Draw`, `Modify`, `Source`) di Zustand store
- ❌ Membuat `PointDrawTool`, `LineDrawTool`, `PolygonDrawTool` terpisah — cukup satu `drawInteraction` yang dinamis
- ❌ Menggunakan `if (geometryType === 'LineString')` untuk switch logic draw — OpenLayers sudah menangani ini
- ❌ Memulai implementasi Select interaction (itu Tahap 4)

---

## 🧪 Kriteria Selesai (Definition of Done)

- [x] OpenLayers Map terinisialisasi di `map-viewport` container
- [x] `referenceLayer` dan `editableLayer` dibuat dan ditambahkan ke map
- [x] `useMapInstance` hook mengelola lifecycle map (init + cleanup)
- [x] `createDrawInteraction({ geometryType })` berfungsi untuk Point, LineString, dan Polygon tanpa hardcode
- [x] `createModifyInteraction()` berfungsi untuk semua geometry type
- [x] `createSnapInteraction()` berfungsi
- [x] `EditorController.attachMap()` menghubungkan map dan source
- [x] `EditorController.activate('draw')` menggunakan `context.geometryType` — bukan hardcode
- [x] `geometry/common/validation.ts` memvalidasi tipe geometry
- [x] Tidak ada satu pun hardcode geometry string di seluruh kode baru Tahap 3
- [x] `npx tsc --noEmit` tidak menghasilkan error

---

## 📌 Catatan

Tahap ini **belum** membutuhkan:
- Select interaction untuk klik feature dari peta (itu Tahap 4)
- Feature detail panel (itu Tahap 5)
- Form attribute editing (itu Tahap 6)
- Simpan ke API (itu Tahap 8)

Fokus Tahap 3 adalah **Map + Layer + Draw/Modify/Snap yang sepenuhnya dinamis** — siap menerima geometry type apapun dari context tanpa asumsi.

---

**Dibuat:** 2026-08-14
**Referensi Arsitektur:** GIS_ARCHITECTURE.md §3, §8, §9, §11, §14, §21, §29, §27 Tahap 03
