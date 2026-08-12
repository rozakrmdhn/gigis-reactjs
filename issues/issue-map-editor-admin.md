# 🗺️ Feature: Halaman Map Editor dengan MapLibre GL JS + Geoman

**Route Baru:** `/admin/map-editor`  
**File Utama (Baru):** `app/routes/map-editor/index.tsx`  
**Prioritas:** 🟡 Medium-High  
**Label:** `feature`, `webgis`, `maplibre`, `geoman`, `infrastruktur`, `segmen`  
**Estimasi Waktu:** 3–5 hari kerja  

---

## 📋 Ringkasan Fitur

Fitur ini menambahkan halaman admin baru `/admin/map-editor` yang berfungsi sebagai **visual editor peta interaktif** untuk menggambar, mengedit, dan menyimpan data geometri segmen infrastruktur langsung di peta.

Halaman ini mengintegrasikan **MapLibre GL JS** (renderer peta berbasis WebGL) + **Geoman** (library draw/edit) dan menghubungkannya ke endpoint segmen yang sudah ada di backend, dengan pengelompokan (filtering) berdasarkan **tipe infrastruktur** dari `infrastrukturService.getTipeList()`.

---

## 🏗️ Arsitektur yang Perlu Dipahami Sebelum Mulai

Sebelum mulai coding, **baca dan pahami** file-file berikut terlebih dahulu:

### 1. Routing System
**File:** `app/routes.ts`

Proyek ini menggunakan **React Router v7** dengan konfigurasi manual di `app/routes.ts`. Semua route admin berada di dalam blok `route("admin", "routes/sidebar-layout.tsx", [...])`. Untuk menambah route baru, tambahkan entri di sini.

### 2. Layout Admin (Sidebar)
**File:** `app/routes/sidebar-layout.tsx`

Semua halaman admin dibungkus oleh `SidebarLayout`. Perhatikan variabel `isFullHeightView` di baris 42–48 — halaman peta biasanya ditandai di sini agar layout-nya 100% tinggi layar (tanpa padding/scroll).

### 3. Service Infrastruktur (API Layer)
**File:** `app/services/infrastruktur.service.ts`

Ini adalah service utama. Pelajari semua method berikut yang akan digunakan:

| Method | Endpoint | Kegunaan |
|---|---|---|
| `getTipeList()` | `GET /v1/infrastruktur` | Ambil daftar tipe infrastruktur aktif |
| `getAllSegmenGeoJSON(tipe, params)` | `GET /v1/infrastruktur/:tipe/segmen?format=geojson` | Ambil GeoJSON semua segmen per-tipe |
| `getSegmenGeoJSON(tipe, parentId)` | `GET /v1/infrastruktur/:tipe/:parentId/segmen?format=geojson` | Ambil GeoJSON segmen per-aset |
| `createSegmen(tipe, parentId, data)` | `POST /v1/infrastruktur/:tipe/:parentId/segmen` | Buat segmen baru |
| `updateSegmen(tipe, parentId, segmenId, data)` | `PUT /v1/infrastruktur/:tipe/:parentId/segmen/:segmenId` | Edit segmen |
| `deleteSegmen(tipe, parentId, segmenId)` | `DELETE /v1/infrastruktur/:tipe/:parentId/segmen/:segmenId` | Hapus segmen |

### 4. Tipe Data Infrastruktur
**File:** `app/services/infrastruktur.service.ts` (baris 5–55)

Perhatikan interface `InfrastrukturTipe`:
```typescript
interface InfrastrukturTipe {
    id: string;
    kode: string;       // contoh: 'jalan', 'jalan_lingkungan', 'jembatan', 'drainase'
    nama: string;       // contoh: 'Jalan Poros Desa'
    warna: string;      // warna layer di peta: '#3B82F6'
    geom_type: 'LINESTRING' | 'POINT' | 'POLYGON'; // tipe geometri segmennya
    has_segmen: boolean; // pastikan ini true sebelum load segmen
    is_active: boolean;
}
```

Dan interface `InfrastrukturSegmen`:
```typescript
interface InfrastrukturSegmen {
    id: string;
    tipe_kode: string;
    parent_id: string;
    panjang?: number;
    lebar?: number;
    kondisi?: string;
    // ...
}
```

### 5. Contoh Halaman Peta yang Sudah Ada
**File:** `app/routes/monitoring/peta-infrastruktur/index.tsx`

Ini adalah halaman peta yang sudah ada dan menggunakan **OpenLayers** (bukan MapLibre). Gunakan sebagai referensi untuk memahami pola yang dipakai di proyek (state management, service call, loading state, dll), **tapi jangan copy implementasi map-nya** karena halaman baru menggunakan MapLibre GL JS.

---

## 📦 Tahap 1: Setup dan Instalasi Library

### 1.1. Install MapLibre GL JS

MapLibre GL JS adalah engine peta WebGL open-source. Proyek ini sudah memiliki `mapbox-gl` (versi komersial), tapi untuk Map Editor kita gunakan **MapLibre** yang open-source dan tidak memerlukan access token.

```bash
npm install maplibre-gl @types/maplibre-gl
```

> **⚠️ Catatan:** Jangan bingung antara `mapbox-gl` (sudah ada di project, perlu token) dan `maplibre-gl` (gratis, tidak perlu token). Kita install yang baru untuk Map Editor.

### 1.2. Install Geoman untuk MapLibre (Gratis)

**Geoman** adalah library untuk menggambar dan mengedit geometri (Point, LineString, Polygon) di atas peta MapLibre.

```bash
npm install @geoman-io/maplibre-geoman-free
```

> **📌 Catatan tentang "GeoLibre":** Berdasarkan riset, "GeoLibre" (geolibre.app) adalah aplikasi GIS lengkap berbasis browser, bukan library yang bisa di-embed. Stack teknologinya sendiri menggunakan **MapLibre GL JS + Geoman**. Oleh karena itu, implementasi ini menggunakan kombinasi MapLibre GL JS + Geoman sebagai equivalent dari GeoLibre yang dapat di-integrasikan ke dalam React app kita.

### 1.3. Verifikasi Instalasi

Setelah install, pastikan `package.json` memiliki dependency baru:

```json
{
  "dependencies": {
    "maplibre-gl": "^X.X.X",
    "@geoman-io/maplibre-geoman-free": "^X.X.X"
  }
}
```

---

## 🗂️ Tahap 2: Struktur File yang Harus Dibuat

Buat file-file berikut sesuai urutan:

```
app/
└── routes/
    └── map-editor/
        └── index.tsx           ← Halaman utama Map Editor
```

> **Konvensi:** Proyek ini menggunakan folder per-route dengan file `index.tsx` di dalamnya, seperti `app/routes/monitoring/peta-infrastruktur/index.tsx`. Ikuti konvensi yang sama.

---

## 🔧 Tahap 3: Registrasi Route di `routes.ts`

**File:** `app/routes.ts`

Tambahkan satu baris di dalam blok `route("admin", ..., [...])`, di bagian bawah (sebelum baris penutup `])`):

```typescript
// Di dalam blok route("admin", "routes/sidebar-layout.tsx", [...])
route("map-editor", "routes/map-editor/index.tsx"),
```

**Lokasi penambahan** (setelah baris 57, sebelum baris 58 `])`):
```typescript
// Sebelum:
        route("manage/infrastruktur/edit/:id", "routes/manage/infrastruktur/form.tsx", { id: "manage-infrastruktur-edit" }),
    ]),

// Sesudah:
        route("manage/infrastruktur/edit/:id", "routes/manage/infrastruktur/form.tsx", { id: "manage-infrastruktur-edit" }),
        route("map-editor", "routes/map-editor/index.tsx"),  // ← TAMBAH INI
    ]),
```

---

## 🖼️ Tahap 4: Update `sidebar-layout.tsx` untuk Full-Height View

**File:** `app/routes/sidebar-layout.tsx`

Halaman Map Editor harus ditampilkan full-screen (tanpa padding sidebar yang mengurangi tinggi). Tambahkan path-nya ke variabel `isFullHeightView`.

**Lokasi:** Baris 42–48:

```typescript
// Sebelum:
const isFullHeightView =
    location.pathname.includes("/admin/monitoring/peta-infrastruktur") ||
    location.pathname.includes("/admin/monitoring/maps") ||
    location.pathname.includes("/admin/usulan-desa/registrasi") ||
    location.pathname.includes("/admin/usulan-desa/edit") ||
    location.pathname.includes("/admin/usulan-desa/detail") ||
    location.pathname.includes("/admin/data-spasial/infrastruktur-jalan-desa");

// Sesudah:
const isFullHeightView =
    location.pathname.includes("/admin/monitoring/peta-infrastruktur") ||
    location.pathname.includes("/admin/monitoring/maps") ||
    location.pathname.includes("/admin/usulan-desa/registrasi") ||
    location.pathname.includes("/admin/usulan-desa/edit") ||
    location.pathname.includes("/admin/usulan-desa/detail") ||
    location.pathname.includes("/admin/data-spasial/infrastruktur-jalan-desa") ||
    location.pathname.includes("/admin/map-editor"); // ← TAMBAH INI
```

---

## 💻 Tahap 5: Implementasi Halaman Map Editor

**File:** `app/routes/map-editor/index.tsx`

### 5.1. State Management yang Dibutuhkan

```typescript
// Map instance refs (JANGAN gunakan useState untuk ini, gunakan useRef)
const mapContainerRef = useRef<HTMLDivElement>(null);
const mapRef = useRef<maplibregl.Map | null>(null);
const geomanRef = useRef<any>(null);

// State untuk daftar tipe infrastruktur
const [tipeList, setTipeList] = useState<InfrastrukturTipe[]>([]);
const [selectedTipe, setSelectedTipe] = useState<InfrastrukturTipe | null>(null);

// State untuk data GeoJSON yang dimuat
const [segmenGeoJSON, setSegmenGeoJSON] = useState<FeatureCollection | null>(null);

// State UI
const [isLoading, setIsLoading] = useState(false);
const [isMounted, setIsMounted] = useState(false); // Untuk SSR guard

// State panel edit atribut
const [editingSegmen, setEditingSegmen] = useState<InfrastrukturSegmen | null>(null);
const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
```

### 5.2. Pola Inisialisasi MapLibre (SSR-Safe)

> **⚠️ PENTING (SSR Guard):** Proyek ini menggunakan React Router v7 dengan SSR. MapLibre GL JS memanggil API browser (`window`, `document`), sehingga **tidak boleh dijalankan di server**. Gunakan pola `useEffect` + `isMounted` state.

```typescript
// Langkah 1: Set isMounted = true hanya di client-side
useEffect(() => {
    setIsMounted(true);
}, []);

// Langkah 2: Inisialisasi peta HANYA setelah isMounted = true
useEffect(() => {
    if (!isMounted || !mapContainerRef.current || mapRef.current) return;

    mapRef.current = new maplibregl.Map({
        container: mapContainerRef.current,
        style: 'https://demotiles.maplibre.org/style.json', // atau URL style kustom
        center: [111.8816, -7.1542], // Koordinat Bojonegoro
        zoom: 10,
    });

    mapRef.current.on('load', () => {
        // Inisialisasi Geoman setelah map load
        const { Geoman } = require('@geoman-io/maplibre-geoman-free');
        geomanRef.current = new Geoman(mapRef.current);
        
        // Setup event listener Geoman
        setupGeomanEvents();
    });

    // Cleanup saat komponen unmount
    return () => {
        mapRef.current?.remove();
        mapRef.current = null;
    };
}, [isMounted]);
```

### 5.3. Load Daftar Tipe Infrastruktur

```typescript
// Di useEffect terpisah, load tipe list saat component mount
useEffect(() => {
    const loadTipeList = async () => {
        try {
            const list = await infrastrukturService.getTipeList();
            // Filter hanya yang has_segmen = true
            const tipeWithSegmen = list.filter(t => t.has_segmen && t.is_active !== false);
            setTipeList(tipeWithSegmen);
        } catch (err) {
            toast.error('Gagal memuat daftar tipe infrastruktur');
        }
    };
    loadTipeList();
}, []);
```

### 5.4. Load Segmen GeoJSON ke Peta Saat Tipe Dipilih

```typescript
const handleTipeChange = async (tipe: InfrastrukturTipe) => {
    setSelectedTipe(tipe);
    setIsLoading(true);
    
    try {
        // Gunakan getAllSegmenGeoJSON dari infrastrukturService
        const geojson = await infrastrukturService.getAllSegmenGeoJSON(tipe.kode);
        
        if (!geojson || !mapRef.current) return;
        
        setSegmenGeoJSON(geojson);
        
        // Hapus layer lama jika ada
        if (mapRef.current.getLayer('segmen-layer')) {
            mapRef.current.removeLayer('segmen-layer');
        }
        if (mapRef.current.getSource('segmen-source')) {
            mapRef.current.removeSource('segmen-source');
        }
        
        // Tambahkan source GeoJSON baru
        mapRef.current.addSource('segmen-source', {
            type: 'geojson',
            data: geojson,
        });
        
        // Tambahkan layer berdasarkan geom_type dari tipe infrastruktur
        if (tipe.geom_type === 'LINESTRING') {
            mapRef.current.addLayer({
                id: 'segmen-layer',
                type: 'line',
                source: 'segmen-source',
                paint: {
                    'line-color': tipe.warna || '#3B82F6',
                    'line-width': 3,
                },
            });
        } else if (tipe.geom_type === 'POINT') {
            mapRef.current.addLayer({
                id: 'segmen-layer',
                type: 'circle',
                source: 'segmen-source',
                paint: {
                    'circle-color': tipe.warna || '#EF4444',
                    'circle-radius': 6,
                },
            });
        } else if (tipe.geom_type === 'POLYGON') {
            mapRef.current.addLayer({
                id: 'segmen-layer',
                type: 'fill',
                source: 'segmen-source',
                paint: {
                    'fill-color': tipe.warna || '#10B981',
                    'fill-opacity': 0.5,
                },
            });
        }
        
        // Zoom ke extent data
        if (geojson.features.length > 0) {
            // Gunakan library turf (sudah ada di package.json: @turf/turf)
            // untuk menghitung bbox dan fitBounds
        }
        
    } catch (err) {
        toast.error('Gagal memuat data segmen');
    } finally {
        setIsLoading(false);
    }
};
```

### 5.5. Setup Event Listener Geoman untuk Save ke Backend

```typescript
const setupGeomanEvents = () => {
    if (!geomanRef.current || !mapRef.current) return;
    
    const map = mapRef.current;
    
    // Event: setelah user selesai menggambar shape baru
    map.on('gm:create', async (e: any) => {
        const feature = e.feature;
        const geojsonGeometry = feature.geometry;
        
        if (!selectedTipe) {
            toast.warning('Pilih tipe infrastruktur terlebih dahulu');
            return;
        }
        
        // Buka dialog/panel untuk input atribut segmen
        // sebelum save ke backend
        setEditingSegmen({
            id: '', // Belum ada ID, ini segmen baru
            tipe_kode: selectedTipe.kode,
            parent_id: '',  // Perlu ditentukan dari UI (pilih aset parent)
            // simpan geometry sementara di state atau ref
        });
        setIsEditPanelOpen(true);
        
        // ATAU langsung save jika tidak perlu atribut tambahan:
        // await infrastrukturService.createSegmen(selectedTipe.kode, parentId, {
        //     geometry: geojsonGeometry,
        // });
    });
    
    // Event: setelah user mengedit/menggeser shape yang sudah ada
    map.on('gm:update', async (e: any) => {
        const feature = e.feature;
        const segmenId = feature.properties?.id;
        const parentId = feature.properties?.parent_id;
        
        if (!selectedTipe || !segmenId || !parentId) return;
        
        try {
            await infrastrukturService.updateSegmen(
                selectedTipe.kode,
                parentId,
                segmenId,
                { geometry: feature.geometry }
            );
            toast.success('Segmen berhasil diperbarui');
        } catch (err) {
            toast.error('Gagal memperbarui segmen');
        }
    });
    
    // Event: setelah user menghapus shape
    map.on('gm:remove', async (e: any) => {
        const feature = e.feature;
        const segmenId = feature.properties?.id;
        const parentId = feature.properties?.parent_id;
        
        if (!selectedTipe || !segmenId || !parentId) return;
        
        try {
            await infrastrukturService.deleteSegmen(selectedTipe.kode, parentId, segmenId);
            toast.success('Segmen berhasil dihapus');
        } catch (err) {
            toast.error('Gagal menghapus segmen');
        }
    });
};
```

### 5.6. Struktur JSX / UI Layout

Layout halaman menggunakan pola split-panel (kiri: kontrol/panel, kanan: peta):

```tsx
return (
    <div className="flex h-full w-full overflow-hidden">
        {/* Panel Kiri: Kontrol & Filter */}
        <div className="w-80 flex-shrink-0 bg-background border-r flex flex-col gap-4 p-4 overflow-y-auto z-10">
            <h2>Map Editor</h2>
            
            {/* Selector Tipe Infrastruktur */}
            <Select onValueChange={...}>
                {tipeList.map(tipe => (
                    <SelectItem key={tipe.id} value={tipe.kode}>
                        {tipe.nama}
                    </SelectItem>
                ))}
            </Select>
            
            {/* Info tipe terpilih */}
            {selectedTipe && (
                <div>Tipe Geometri: {selectedTipe.geom_type}</div>
            )}
            
            {/* Loading indicator */}
            {isLoading && <Spinner />}
        </div>
        
        {/* Area Peta (Full Height) */}
        <div className="flex-1 relative">
            {isMounted ? (
                <div ref={mapContainerRef} className="absolute inset-0" />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Spinner />
                </div>
            )}
        </div>
        
        {/* Panel Edit Atribut (Conditional) */}
        {isEditPanelOpen && editingSegmen && (
            <EditSegmenPanel
                segmen={editingSegmen}
                onClose={() => setIsEditPanelOpen(false)}
                onSave={handleSaveSegmen}
            />
        )}
    </div>
);
```

---

## 🔗 Tahap 6: Import CSS MapLibre dan Geoman

**File:** `app/routes/map-editor/index.tsx`

Di bagian atas file, tambahkan import CSS:

```typescript
import 'maplibre-gl/dist/maplibre-gl.css';
import '@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css';
```

> **⚠️ Catatan:** Import CSS langsung di dalam komponen React Router **harus diuji** apakah Vite mendukungnya. Jika tidak bisa, bisa ditambahkan di `app/app.css` atau di `app/root.tsx`. Lihat pola yang dipakai file lain di proyek ini.

---

## 🧪 Tahap 7: Verifikasi dan Testing

Setelah implementasi selesai, lakukan pengecekan berikut secara manual:

### Checklist Verifikasi

- [ ] Route `/admin/map-editor` dapat diakses tanpa error
- [ ] Halaman tampil full-height (sama seperti `/admin/monitoring/peta-infrastruktur`)
- [ ] Peta MapLibre berhasil dirender di browser
- [ ] Daftar tipe infrastruktur muncul di Select/Dropdown panel kiri
- [ ] Setelah memilih tipe, segmen GeoJSON tampil di peta
- [ ] Warna layer sesuai dengan `tipe.warna` dari API
- [ ] Geoman toolbar muncul di peta (control draw/edit)
- [ ] Menggambar shape baru tidak throw error di console
- [ ] Mengedit shape yang sudah ada tidak throw error di console
- [ ] Tidak ada error `window is not defined` atau SSR-related error di console
- [ ] Halaman tidak crash saat route lain diakses setelah meninggalkan halaman ini (cleanup bekerja)

### Jalankan Dev Server

```bash
npm run dev
```

Akses: `http://localhost:5173/admin/map-editor`

---

## ⚠️ Hal-Hal yang Perlu Diperhatikan (Gotcha)

### 1. SSR Guard — WAJIB
MapLibre GL JS menggunakan `window` dan `document`. Karena React Router v7 mendukung SSR, **selalu** bungkus inisialisasi map dalam `useEffect` dan pastikan sudah ada guard `typeof window !== 'undefined'` atau pattern `isMounted`.

```typescript
// ✅ Benar
useEffect(() => {
    if (!isMounted) return;
    // inisialisasi map
}, [isMounted]);

// ❌ Salah — akan crash di server
const map = new maplibregl.Map({ ... }); // Di luar useEffect!
```

### 2. Map Container Ref — Jangan Null
MapLibre membutuhkan DOM element sudah tersedia saat `new Map()` dipanggil. Pastikan `mapContainerRef.current` tidak null.

```typescript
if (!mapContainerRef.current) return; // Guard selalu
```

### 3. Cleanup — Wajib di return useEffect
Jika tidak di-cleanup, instance map lama akan tetap berjalan saat route berganti dan menyebabkan memory leak atau error.

```typescript
return () => {
    mapRef.current?.remove();
    mapRef.current = null;
};
```

### 4. Geoman Import — Cek Versi
Geoman untuk MapLibre menggunakan package `@geoman-io/maplibre-geoman-free`. Nama class/import mungkin berbeda dengan versi Leaflet. Selalu cek dokumentasi: https://geoman.io/docs/maplibre

### 5. `parent_id` Untuk Create Segmen
Endpoint `createSegmen` membutuhkan `parent_id` (ID aset induk). Pada implementasi awal, mungkin perlu menambahkan dropdown/selector untuk memilih aset parent (dari `infrastrukturService.getGeoJSON(tipe.kode)`). Ini bisa dijadikan fitur tambahan (iterasi kedua).

### 6. Basemap Style
Proyek menggunakan Mapbox GL dengan token. Untuk MapLibre, gunakan style yang tidak memerlukan token:
- **MapLibre Demo:** `https://demotiles.maplibre.org/style.json`
- **OpenMapTiles via MapTiler (gratis tier):** Butuh key tapi ada free tier
- **Basemap dari GeoServer lokal:** Cek endpoint di `app/routes/api/` untuk URL geoserver

---

## 📁 Ringkasan File yang Harus Diubah/Dibuat

| Status | File | Perubahan |
|--------|------|-----------|
| 🆕 Baru | `app/routes/map-editor/index.tsx` | Buat komponen halaman Map Editor |
| ✏️ Edit | `app/routes.ts` | Tambah 1 baris route `map-editor` |
| ✏️ Edit | `app/routes/sidebar-layout.tsx` | Tambah path ke `isFullHeightView` |

**Tidak ada perubahan di:**
- `app/services/infrastruktur.service.ts` — Service sudah ada, langsung pakai
- `app/components/` — Tidak perlu komponen baru di tahap awal

---

## 🔗 Referensi

- [MapLibre GL JS Docs](https://maplibre.org/maplibre-gl-js/docs/)
- [Geoman MapLibre Docs](https://geoman.io/docs/maplibre)
- [Geoman NPM - maplibre-geoman-free](https://www.npmjs.com/package/@geoman-io/maplibre-geoman-free)
- [MapLibre GL JS React Integration Guide](https://maplibre.org/maplibre-gl-js/docs/examples/)
- Lihat halaman peta yang sudah ada: `app/routes/monitoring/peta-infrastruktur/index.tsx` sebagai referensi pola umum
- Lihat service: `app/services/infrastruktur.service.ts` untuk semua endpoint yang tersedia
