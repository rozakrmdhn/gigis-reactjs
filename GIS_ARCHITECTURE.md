# Arsitektur Editor WebGIS

## 1. Tujuan

Dokumen ini menjadi arsitektur dasar untuk pengembangan **Editor WebGIS dinamis** berbasis:

* ReactJS
* TypeScript
* OpenLayers
* Hapi.js
* PostgreSQL
* PostGIS

Editor digunakan untuk mengelola berbagai jenis infrastruktur dengan geometry:

* `Point`
* `LineString`
* `Polygon`

### Prinsip utama

Editor **tidak memiliki geometry type default**.

Geometry editor ditentukan secara dinamis berdasarkan:

```text
infrastruktur_tipe
```

yang berasal dari konfigurasi/data infrastruktur.

---

# 2. Konsep Utama

Arsitektur editor menggunakan pola:

```text
Infrastruktur
      ↓
infrastruktur_tipe
      ↓
EditorContext
      ↓
EditorCapabilities
      ↓
EditorController
      ↓
OpenLayers Interaction
```

Contoh:

```text
Jalan
  ↓
LineString
  ↓
Line Editor

Jembatan
  ↓
Point
  ↓
Point Editor

Embung
  ↓
Polygon
  ↓
Polygon Editor
```

Editor menggunakan satu engine OpenLayers yang sama, tetapi behavior editing ditentukan secara dinamis.

---

# 3. Supported Geometry Type

Editor minimal mendukung:

```ts
type GeometryType =
  | 'Point'
  | 'LineString'
  | 'Polygon';
```

Tidak boleh terdapat asumsi seperti:

```ts
const DEFAULT_GEOMETRY_TYPE = 'LineString';
```

atau:

```ts
new Draw({
  type: 'LineString'
});
```

tanpa mengambil tipe geometry dari `EditorContext`.

---

# 4. Arsitektur Tingkat Tinggi

```text
┌─────────────────────────────────────────────┐
│                  ReactJS                    │
│                                             │
│  ┌──────────────┐     ┌─────────────────┐  │
│  │ Editor UI    │     │ Editor Store    │  │
│  │              │◄───►│                 │  │
│  │ Toolbar      │     │ activeTool      │  │
│  │ Form         │     │ selectedFeature │  │
│  │ Attribute    │     │ geometryType    │  │
│  │ Save Bar     │     │ draft           │  │
│  └──────┬───────┘     └────────┬────────┘  │
│         │                       │           │
│         └───────────┬───────────┘           │
│                     ▼                       │
│           ┌──────────────────┐              │
│           │ EditorController │              │
│           └────────┬─────────┘              │
│                    │                        │
│                    ▼                        │
│           ┌──────────────────┐              │
│           │  EditorContext   │              │
│           │                  │              │
│           │ geometryType     │              │
│           │ capabilities     │              │
│           └────────┬─────────┘              │
│                    ▼                        │
│           ┌──────────────────┐              │
│           │   OpenLayers     │              │
│           │                  │              │
│           │ Map              │              │
│           │ Layer            │              │
│           │ Select           │              │
│           │ Draw             │              │
│           │ Modify           │              │
│           │ Snap             │              │
│           └────────┬─────────┘              │
└────────────────────┼────────────────────────┘
                     │
                     ▼
              ┌──────────────┐
              │   Hapi.js    │
              │     API      │
              └──────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │   PostGIS    │
              │ PostgreSQL   │
              └──────────────┘
```

---

# 5. Infrastruktur Type sebagai Editor Context

Ketika user memilih jenis infrastruktur, sistem membentuk `EditorContext`.

Contoh:

```ts
interface EditorContext {
  infrastructureTypeId: string;
  geometryType: GeometryType;
  capabilities: EditorCapabilities;
}
```

Contoh context:

```json
{
  "infrastructureTypeId": "jalan_poros_desa",
  "geometryType": "LineString",
  "capabilities": {
    "select": true,
    "draw": true,
    "modify": true,
    "snap": true,
    "split": true,
    "merge": true,
    "extend": true,
    "delete": true
  }
}
```

Contoh Point:

```json
{
  "infrastructureTypeId": "jembatan",
  "geometryType": "Point",
  "capabilities": {
    "select": true,
    "draw": true,
    "modify": true,
    "snap": true,
    "split": false,
    "merge": false,
    "extend": false,
    "delete": true
  }
}
```

---

# 6. Editor Capabilities

Tidak semua geometry mendukung semua operasi.

Gunakan capability system:

```ts
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
```

Contoh:

| Tool   | Point | LineString |    Polygon   |
| ------ | :---: | :--------: | :----------: |
| Select |   ✅   |      ✅     |       ✅      |
| Draw   |   ✅   |      ✅     |       ✅      |
| Modify |   ✅   |      ✅     |       ✅      |
| Snap   |   ✅   |      ✅     |       ✅      |
| Delete |   ✅   |      ✅     |       ✅      |
| Split  |   ❌   |      ✅     | configurable |
| Merge  |   ❌   |      ✅     |       ✅      |
| Extend |   ❌   |      ✅     |       ❌      |

Capability menentukan apakah tool:

1. tersedia,
2. dapat digunakan,
3. ditampilkan pada toolbar.

---

# 7. Dynamic Editor Flow

```text
User memilih Infrastruktur
          ↓
Ambil konfigurasi
          ↓
infrastruktur_tipe
          ↓
Build EditorContext
          ↓
geometryType
          +
capabilities
          ↓
EditorController
          ↓
Initialize tools
          ↓
Render Toolbar
          ↓
User melakukan editing
```

Editor tidak dibuat ulang untuk setiap tipe infrastruktur.

Yang berubah adalah `EditorContext`.

---

# 8. Dynamic Draw

Draw interaction tidak boleh hard-code.

Jangan:

```ts
new Draw({
  source,
  type: 'LineString'
});
```

Gunakan:

```ts
new Draw({
  source,
  type: editorContext.geometryType
});
```

Dengan demikian:

```text
Point
    ↓
Draw Point

LineString
    ↓
Draw LineString

Polygon
    ↓
Draw Polygon
```

---

# 9. Dynamic Modify

Modify dapat digunakan untuk geometry yang sedang diedit:

```text
Point
 ↓
Modify

LineString
 ↓
Modify

Polygon
 ↓
Modify
```

Tidak perlu membuat:

```text
PointModifyTool
LineModifyTool
PolygonModifyTool
```

kecuali terdapat behavior khusus yang memang berbeda.

---

# 10. Dynamic Toolbar

Toolbar harus mengikuti `EditorCapabilities`.

Contoh LineString:

```text
[Select]
[Draw]
[Modify]
[Snap]
[Split]
[Merge]
[Extend]
[Delete]
```

Point:

```text
[Select]
[Draw]
[Modify]
[Snap]
[Delete]
```

Polygon:

```text
[Select]
[Draw]
[Modify]
[Snap]
[Split]
[Merge]
[Delete]
```

Jangan membuat toolbar berdasarkan nama infrastruktur:

```ts
if (infrastructure === 'jalan') {
  ...
}
```

Gunakan:

```ts
if (capabilities.split) {
  ...
}
```

Dengan demikian sistem tidak bergantung pada nama bisnis tertentu.

---

# 11. Geometry Strategy

Geometry operation dikelompokkan berdasarkan jenisnya.

```text
features/editor/
│
├── geometry/
│   ├── common/
│   │   └── validation.ts
│   │
│   ├── point/
│   │   └── pointStrategy.ts
│   │
│   ├── line/
│   │   ├── split.ts
│   │   ├── merge.ts
│   │   └── extend.ts
│   │
│   └── polygon/
│       ├── split.ts
│       └── merge.ts
```

Tidak semua geometry operation harus tersedia untuk semua tipe.

---

# 12. Editor Controller

`EditorController` menjadi orchestrator.

Contoh:

```ts
editor.activate('select');

editor.activate('draw');

editor.activate('modify');

editor.activate('split');

editor.deactivate();
```

Controller membaca:

```text
EditorContext
      ↓
geometryType
      +
capabilities
```

Kemudian menentukan apakah tool boleh diaktifkan.

Contoh:

```text
Point + Split
       ↓
Tidak tersedia

LineString + Split
       ↓
Tersedia
```

---

# 13. Editor Store

Editor Store menyimpan application state.

Contoh:

```ts
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

Store tidak menyimpan object runtime OpenLayers seperti:

```text
Map
Layer
Interaction
VectorSource
```

Object tersebut tetap dikelola oleh OpenLayers.

---

# 14. Layer Architecture

Pisahkan:

```text
Reference Layer
```

dan:

```text
Editable Layer
```

## Reference Layer

Digunakan untuk data besar:

```text
PostGIS
   ↓
MVT / PMTiles
   ↓
OpenLayers VectorTileLayer
```

Contoh:

* jaringan jalan
* batas desa
* batas kecamatan
* layer referensi

## Editable Layer

Digunakan untuk:

* feature terpilih
* feature sedang diedit
* feature hasil digitasi
* draft geometry

```text
API
 ↓
GeoJSON
 ↓
VectorSource
 ↓
Editable VectorLayer
```

---

# 15. Data Flow Select

```text
User klik feature
       ↓
OpenLayers Select
       ↓
Feature ID
       ↓
Editor Store
       ↓
selectedFeatureId
       ↓
GET /api/infrastructure/:id
       ↓
Feature data
       ↓
Editor Store
```

Geometry type harus diverifikasi dari data feature/configuration.

---

# 16. Data Flow Create

```text
User memilih jenis Infrastruktur
          ↓
infrastruktur_tipe
          ↓
EditorContext
          ↓
geometryType
          ↓
Activate Draw
          ↓
Draw sesuai geometryType
          ↓
Point / LineString / Polygon
          ↓
Draft Feature
          ↓
Form
          ↓
Validation
          ↓
POST API
          ↓
PostGIS
```

Tidak ada default geometry.

---

# 17. Data Flow Edit

```text
Select Feature
      ↓
Load Feature
      ↓
Read geometry type
      ↓
Build EditorContext
      ↓
Create Draft
      ↓
Form Editing
      +
Geometry Editing
      ↓
Validation
      ↓
Save
      ↓
PATCH API
      ↓
PostGIS Transaction
```

---

# 18. Draft State

Ketika user mulai melakukan editing:

```text
Original
   │
   ▼
Draft
```

Draft dapat berubah melalui:

```text
Form Change
Geometry Change
Split
Merge
Extend
```

Draft tidak langsung dikirim ke server.

```text
User Editing
     ↓
Draft
     ↓
isDirty = true
```

Ketika user menekan Simpan:

```text
Draft
 ↓
Validate
 ↓
Build Payload
 ↓
PATCH / POST
```

---

# 19. Save Architecture

## Create

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

## Update

```http
PATCH /api/infrastructure/:id
```

Payload:

```json
{
  "attributes": {},
  "geom": {}
}
```

Geometry dan atribut disimpan dalam satu database transaction.

---

# 20. Backend Validation

Backend wajib melakukan validasi geometry.

Minimal:

```text
Geometry Type
SRID
Geometry Validity
Required Geometry
Business Rules
```

Contoh:

```text
infrastruktur_tipe = LineString
        ↓
geometry type harus LineString
```

Jika:

```text
infrastruktur_tipe = Point
geometry = Polygon
```

maka request ditolak.

Frontend validation membantu UX, tetapi backend tetap menjadi validator akhir.

---

# 21. Geometry Type Consistency

Aturan utama:

```text
infrastruktur_tipe
        =
geometry type
```

Contoh valid:

```text
Jalan       → LineString
Jembatan    → Point
Embung      → Polygon
```

Contoh tidak valid:

```text
Jalan       → Point
Jembatan    → Polygon
Embung      → LineString
```

Sistem harus mencegah penyimpanan geometry yang tidak sesuai.

---

# 22. Dynamic Feature Configuration

Konfigurasi idealnya berasal dari master data, bukan hard-code frontend.

Contoh:

```text
master_infrastruktur_tipe
```

Field:

```text
id
kode
nama
infrastruktur_tipe
capabilities
aktif
```

Contoh:

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
  }
}
```

Dengan pendekatan ini, penambahan jenis infrastruktur baru tidak membutuhkan perubahan besar pada engine editor.

---

# 23. Struktur Project

Struktur project:

```text
src/
│
├── components/
│   └── editor/
│       ├── MapEditor.tsx
│       ├── EditorToolbar.tsx
│       ├── FeatureForm.tsx
│       ├── FeatureInfo.tsx
│       ├── SaveBar.tsx
│       └── ConfirmDialog.tsx
│
├── features/
│   └── editor/
│       │
│       ├── core/
│       │   ├── EditorController.ts
│       │   ├── EditorContext.ts
│       │   ├── editor.types.ts
│       │   └── editor.config.ts
│       │
│       ├── interactions/
│       │   ├── select/
│       │   ├── draw/
│       │   ├── modify/
│       │   ├── snap/
│       │   └── delete/
│       │
│       ├── geometry/
│       │   ├── common/
│       │   ├── point/
│       │   ├── line/
│       │   └── polygon/
│       │
│       ├── capabilities/
│       │   └── editorCapabilities.ts
│       │
│       ├── layers/
│       │   ├── referenceLayer.ts
│       │   └── editableLayer.ts
│       │
│       ├── services/
│       │   └── editorApi.ts
│       │
│       └── hooks/
│           ├── useEditor.ts
│           ├── useEditorTool.ts
│           └── useEditorSelection.ts
│
├── routes/
│   └── monitoring/
│       └── index.tsx
│
└── stores/
    ├── editorStore.ts
    └── editorHistoryStore.ts
```

---

# 24. Responsibility `routes/monitoring/index.tsx`

File:

```text
routes/monitoring/index.tsx
```

hanya bertanggung jawab terhadap halaman.

```text
Monitoring Page
      ↓
Render MapEditor
      ↓
Pass initial configuration jika diperlukan
```

Tidak boleh berisi:

* Draw
* Modify
* Select
* Snap
* Geometry processing
* CRUD editor
* Editor business logic

---

# 25. Responsibility `MapEditor.tsx`

`MapEditor.tsx` menjadi orchestration layer.

Tanggung jawab:

```text
Initialize Map
      ↓
Initialize Layers
      ↓
Initialize EditorController
      ↓
Connect Editor Store
      ↓
Cleanup
```

Tidak menjadi tempat seluruh logic editing.

---

# 26. MVT / PMTiles dan Editable Layer

Untuk data besar:

```text
PostGIS
   ↓
MVT / PMTiles
   ↓
Reference Layer
```

Untuk editing:

```text
PostGIS
   ↓
API
   ↓
GeoJSON
   ↓
Editable Layer
```

Arsitektur:

```text
                 PostGIS
                    │
          ┌─────────┴─────────┐
          │                   │
          ▼                   ▼
       Hapi.js             MVT/PMTiles
          │                   │
          ▼                   ▼
      GeoJSON             Reference
          │                   │
          ▼                   │
     Editable Layer            │
          │                   │
          └─────────┬─────────┘
                    ▼
                OpenLayers
```

---

# 27. Tahapan Implementasi

Editor tidak dibangun sekaligus.

Urutan implementasi:

```text
01. Core Editor
       ↓
02. Dynamic EditorContext
       ↓
03. Dynamic Geometry Type
       ↓
04. Select
       ↓
05. Feature Detail
       ↓
06. Form
       ↓
07. Modify
       ↓
08. Save / PATCH
       ↓
09. Cancel / Reset
       ↓
10. Draw / Create
       ↓
11. Snap
       ↓
12. Delete
       ↓
13. Split
       ↓
14. Merge
       ↓
15. Extend
       ↓
16. Geometry Validation
       ↓
17. Undo / Redo
       ↓
18. MVT / PMTiles Optimization
```

Setiap tahap harus selesai dan diuji sebelum melanjutkan tahap berikutnya.

---

# 28. Aturan Pengembangan Fitur

Setiap fitur baru mengikuti:

```text
Define Feature
      ↓
Check Geometry Compatibility
      ↓
Check Capability
      ↓
Create Feature Module
      ↓
Connect EditorController
      ↓
Connect Store jika diperlukan
      ↓
Connect API jika diperlukan
      ↓
Integrate UI
      ↓
Test
```

Contoh:

```text
Split
 ↓
Apakah geometry = LineString?
 ↓
Apakah capabilities.split = true?
 ↓
Load SplitTool
 ↓
Execute
```

---

# 29. Larangan Hard-Code Geometry

Hindari:

```ts
const geometryType = 'LineString';
```

Hindari:

```ts
if (infrastructureName === 'jalan') {
  ...
}
```

Hindari:

```ts
new Draw({
  type: 'LineString'
});
```

Gunakan:

```ts
const geometryType =
  editorContext.geometryType;
```

dan:

```ts
new Draw({
  source,
  type: geometryType
});
```

---

# 30. Target Arsitektur

Target akhir:

```text
                 Infrastructure Type
                         │
                         ▼
                Editor Configuration
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
       Geometry Type           Capabilities
             │                       │
       Point / Line / Polygon        │
             │                       │
             └───────────┬───────────┘
                         ▼
                 EditorController
                         │
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
         Select         Draw         Modify
           │             │             │
           └─────────────┼─────────────┘
                         ▼
                  Editable Layer
                         │
                         ▼
                      GeoJSON
                         │
                         ▼
                       Hapi.js
                         │
                         ▼
                       PostGIS
```

---

# 31. Kesimpulan

Editor menggunakan pendekatan **Dynamic Geometry Editor**.

Prinsip utamanya:

```text
infrastruktur_tipe
        ↓
geometryType
        ↓
capabilities
        ↓
EditorController
        ↓
OpenLayers
```

Dengan demikian:

* `Point` dapat diedit sebagai Point.
* `LineString` dapat diedit sebagai LineString.
* `Polygon` dapat diedit sebagai Polygon.
* Tidak ada geometry default.
* Toolbar menyesuaikan capability.
* Geometry operation menyesuaikan geometry type.
* Backend memastikan geometry type sesuai dengan tipe infrastruktur.
* Penambahan jenis infrastruktur baru tidak membutuhkan pembuatan editor baru.

Arsitektur ini memungkinkan satu **Editor Engine** menangani berbagai jenis infrastruktur tanpa bergantung pada jenis infrastruktur tertentu.

Target akhirnya bukan:

```text
Jalan Editor
Jembatan Editor
Embung Editor
Bangunan Editor
```

tetapi:

```text
                Dynamic Editor Engine
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       Point          LineString      Polygon
          │              │              │
       Config         Config          Config
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                    OpenLayers
```
