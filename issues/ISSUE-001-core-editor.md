# ISSUE-001 · Tahap 1: Core Editor

**Label:** `enhancement` · `editor` · `core`
**Milestone:** Phase 1 — Core Editor
**Referensi:** [GIS_ARCHITECTURE.md](../GIS_ARCHITECTURE.md) — Bab 27, Tahap 01

---

## 🎯 Tujuan

Membangun fondasi **Core Editor** WebGIS yang bersifat dinamis berdasarkan `infrastruktur_tipe`.

Ini adalah tahap pertama dari 18 tahap implementasi.
Seluruh tahap berikutnya bergantung pada fondasi yang dibangun di sini.

---

## 📋 Latar Belakang

Editor WebGIS tidak boleh memiliki geometry type default.
Semua behavior editing harus ditentukan secara dinamis melalui alur:

```
infrastruktur_tipe → EditorContext → EditorCapabilities → EditorController → OpenLayers
```

Tahap ini membangun **kerangka** dari alur tersebut, tanpa interaksi OpenLayers yang nyata
(interaksi akan ditambahkan di tahap selanjutnya).

---

## ✅ Task List

### 1. Setup Struktur Folder

Buat struktur folder sesuai arsitektur:

```
src/
├── components/
│   └── editor/
│       ├── MapEditor.tsx           ← shell kosong dulu
│       ├── EditorToolbar.tsx       ← shell kosong dulu
│       └── SaveBar.tsx             ← shell kosong dulu
│
├── features/
│   └── editor/
│       ├── core/
│       │   ├── editor.types.ts     ← [PRIORITAS]
│       │   ├── EditorContext.ts    ← [PRIORITAS]
│       │   ├── EditorController.ts ← [PRIORITAS]
│       │   └── editor.config.ts
│       │
│       ├── capabilities/
│       │   └── editorCapabilities.ts
│       │
│       ├── interactions/           ← folder kosong dulu
│       ├── geometry/               ← folder kosong dulu
│       ├── layers/                 ← folder kosong dulu
│       ├── services/               ← folder kosong dulu
│       └── hooks/
│           └── useEditor.ts        ← [PRIORITAS]
│
└── stores/
    ├── editorStore.ts              ← [PRIORITAS]
    └── editorHistoryStore.ts       ← shell kosong dulu
```

---

### 2. Definisi Types (`editor.types.ts`)

Buat semua type dasar:

```ts
// Geometry types yang didukung — TIDAK ADA DEFAULT
type GeometryType = 'Point' | 'LineString' | 'Polygon';

// Tool yang tersedia di editor
type EditorTool =
  | 'select'
  | 'draw'
  | 'modify'
  | 'snap'
  | 'split'
  | 'merge'
  | 'extend'
  | 'delete';

// Kapabilitas editor berdasarkan infrastruktur_tipe
interface EditorCapabilities {
  select: boolean;
  draw: boolean;
  modify: boolean;
  snap: boolean;
  split: boolean;
  merge: boolean;
  extend: boolean;
  delete: boolean;
}

// Context editor yang dibentuk dari infrastruktur_tipe
interface EditorContext {
  infrastructureTypeId: string;
  geometryType: GeometryType;
  capabilities: EditorCapabilities;
}

// State aplikasi editor
interface EditorState {
  activeTool: EditorTool | null;
  infrastructureTypeId: string | null;
  geometryType: GeometryType | null;
  capabilities: EditorCapabilities | null;
  selectedFeatureId: string | null;
  editingFeatureId: string | null;
  formData: Record<string, unknown>;
  geometry: GeoJSON.Geometry | null;
  originalGeometry: GeoJSON.Geometry | null;
  isDirty: boolean;
  isSaving: boolean;
  validationErrors: string[];
}
```

**Aturan:**
- Tidak boleh ada `DEFAULT_GEOMETRY_TYPE`
- Semua field geometry nullable di `EditorState`

---

### 3. Editor Capabilities (`editorCapabilities.ts`)

Buat fungsi helper untuk membentuk capabilities default berdasarkan geometry type:

```ts
function getDefaultCapabilities(geometryType: GeometryType): EditorCapabilities
```

Mapping default:

| Capability | Point | LineString | Polygon |
|------------|:-----:|:----------:|:-------:|
| select     |  ✅   |     ✅     |   ✅    |
| draw       |  ✅   |     ✅     |   ✅    |
| modify     |  ✅   |     ✅     |   ✅    |
| snap       |  ✅   |     ✅     |   ✅    |
| delete     |  ✅   |     ✅     |   ✅    |
| split      |  ❌   |     ✅     |   ✅    |
| merge      |  ❌   |     ✅     |   ✅    |
| extend     |  ❌   |     ✅     |   ❌    |

**Aturan:**
- Capabilities dari master data dapat meng-override default ini
- Tidak boleh ada kondisi berdasarkan nama infrastruktur

---

### 4. Editor Context (`EditorContext.ts`)

Buat fungsi untuk membangun `EditorContext` dari data infrastruktur:

```ts
function buildEditorContext(
  infrastructureTypeId: string,
  geometryType: GeometryType,
  capabilitiesOverride?: Partial<EditorCapabilities>
): EditorContext
```

---

### 5. Editor Controller (`EditorController.ts`)

Buat class/module `EditorController` sebagai orchestrator:

```ts
class EditorController {
  constructor(context: EditorContext) {}

  activate(tool: EditorTool): void
  deactivate(): void
  canActivate(tool: EditorTool): boolean
  getActiveContext(): EditorContext
  updateContext(context: EditorContext): void
  destroy(): void
}
```

**Aturan:**
- `activate('split')` pada geometry `Point` harus no-op (karena `canActivate` return false)
- `canActivate` membaca dari `capabilities` di dalam `EditorContext`
- Controller **belum** menginisialisasi OpenLayers interaction (itu Tahap 4+)

---

### 6. Editor Store (`editorStore.ts`)

Buat store (Zustand) untuk menyimpan `EditorState`:

```ts
// Actions minimal yang dibutuhkan:
setEditorContext(context: EditorContext): void
setActiveTool(tool: EditorTool | null): void
setSelectedFeatureId(id: string | null): void
setGeometry(geometry: GeoJSON.Geometry | null): void
setFormData(data: Record<string, unknown>): void
setIsDirty(isDirty: boolean): void
setIsSaving(isSaving: boolean): void
setValidationErrors(errors: string[]): void
resetEditor(): void
```

**Aturan:**
- Store **TIDAK** menyimpan object runtime OpenLayers (Map, Layer, Interaction, VectorSource)
- Object OpenLayers dikelola terpisah oleh OpenLayers itu sendiri

---

### 7. Hook `useEditor.ts`

Buat hook utama sebagai entry point ke editor:

```ts
function useEditor(): {
  context: EditorContext | null;
  activeTool: EditorTool | null;
  capabilities: EditorCapabilities | null;
  geometryType: GeometryType | null;
  isDirty: boolean;
  initEditor: (context: EditorContext) => void;
  activateTool: (tool: EditorTool) => void;
  deactivateTool: () => void;
  resetEditor: () => void;
}
```

---

### 8. Shell Komponen `MapEditor.tsx`

Buat komponen shell kosong yang siap diisi pada tahap selanjutnya:

```tsx
interface MapEditorProps {
  infrastructureTypeId: string;
  geometryType: GeometryType;
  capabilities?: Partial<EditorCapabilities>;
}

function MapEditor({
  infrastructureTypeId,
  geometryType,
  capabilities,
}: MapEditorProps) {
  // Tahap 1: inisialisasi context saja, belum ada map/OpenLayers
  useEffect(() => {
    const ctx = buildEditorContext(infrastructureTypeId, geometryType, capabilities);
    initEditor(ctx);
  }, [infrastructureTypeId, geometryType]);

  return <div id="map-editor-container" />;
}
```

---

## 🚫 Larangan pada Tahap Ini

- ❌ Jangan hard-code geometry type: `const type = 'LineString'`
- ❌ Jangan gunakan nama infrastruktur sebagai kondisi: `if (name === 'jalan')`
- ❌ Jangan simpan object OpenLayers ke store
- ❌ Jangan mulai implementasi OpenLayers interaction (itu Tahap 4+)
- ❌ Jangan mulai implementasi API call (itu Tahap 8+)

---

## 🧪 Kriteria Selesai (Definition of Done)

- [x] Semua types terdefinisi di `editor.types.ts` tanpa default geometry
- [x] `buildEditorContext()` dapat membentuk context dari `infrastructureTypeId` + `geometryType` + optional capabilities override
- [x] `getDefaultCapabilities()` mengembalikan capabilities yang benar untuk setiap geometry type
- [x] `EditorController` dapat menerima context dan menentukan tool mana yang boleh diaktifkan via `canActivate()`
- [x] `EditorStore` menyimpan state editor tanpa object OpenLayers
- [x] `useEditor` hook berfungsi sebagai interface utama ke editor
- [x] `MapEditor.tsx` sebagai shell komponen sudah ada dan menginisialisasi context
- [x] Struktur folder sesuai arsitektur sudah terbentuk
- [x] Tidak ada satu pun hard-code geometry type di seluruh kode Tahap 1
- [x] `npx tsc --noEmit` tidak menghasilkan error

---

## 📌 Catatan

Tahap ini **belum** membutuhkan:
- OpenLayers map (`ol/Map`)
- Interaksi Draw / Select / Modify
- Koneksi ke API
- UI toolbar yang fungsional
- Layer rendering

Fokus Tahap 1 adalah **fondasi data & logic** — bukan tampilan atau interaksi peta.

---

**Dibuat:** 2026-08-14
**Referensi Arsitektur:** GIS_ARCHITECTURE.md § 27 — Tahapan Implementasi
