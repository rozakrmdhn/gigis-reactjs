# Spesifikasi API Backend & Database Schema WebGIS Editor

Dokumen ini merupakan panduan spesifikasi teknis REST API backend (Hapi.js + PostgreSQL / PostGIS) dan skema basis data yang digunakan oleh frontend **WebGIS Dynamic Editor**.

---

## 1. Skema Basis Data PostgreSQL / PostGIS

Sistem menggunakan arsitektur data **Dynamic Master Table + Shared Sub-Tables (Segmen & Area)**:

```
┌─────────────────────────────────────────────────────────────┐
│                     infrastruktur_tipe                      │
│ (id, kode, nama, geom_type, table_name, has_segmen, config) │
└──────────────┬───────────────────────────────┬──────────────┘
               │ 1 : N (table_name)            │ 1 : N (tipe_kode)
               ▼                               ▼
 ┌───────────────────────────┐   ┌───────────────────────────┐
 │   Master Table Dinamis    │   │   infrastruktur_segmen    │
 │ (e.g. jalan_porosdesa)    │   │ (parent_id, geom, kondisi)│
 │ id, geom, nama_ruas, dll. │   └───────────────────────────┘
 └─────────────┬─────────────┘                 ▲
               │ 1 : N (parent_id)             │
               └───────────────────────────────┘
               │ 1 : N (parent_id)
               ▼
 ┌───────────────────────────┐
 │    infrastruktur_area     │
 │ (parent_id, geom Polygon) │
 └───────────────────────────┘
```

### 1.1 Tabel `infrastruktur_tipe` (Metadata Konfigurasi)
| Nama Kolom | Tipe Data | Keterangan |
|---|---|---|
| `id` | `uuid` | Primary Key |
| `kode` | `varchar` | Unique identifier (e.g. `jalan`, `jembatan`, `drainase`) |
| `nama` | `varchar` | Nama label tampilan |
| `deskripsi` | `text` | Deskripsi tipe infrastruktur |
| `ikon` | `varchar` | Nama icon (Lucide icon) |
| `warna` | `varchar` | Hex color code (e.g. `#3B82F6`) |
| `geom_type` | `varchar` | `POINT` \| `LINESTRING` \| `POLYGON` |
| `table_name` | `varchar` | Nama tabel master di database (e.g. `jalan_porosdesa`) |
| `has_segmen` | `bool` | `true` jika mendukung segmentasi |
| `is_active` | `bool` | Status aktif |
| `sort_order` | `int4` | Urutan tampilan |
| `config` | `jsonb` | Konfigurasi tambahan (capabilities, form_schema) |
| `created_at` | `timestamptz` | Waktu dibuat |
| `updated_at` | `timestamptz` | Waktu diperbarui |

---

### 1.2 Tabel `infrastruktur_segmen` (Segmentasi Aset)
Menyimpan potongan ruas kondisi jalan/saluran yang terhubung ke parent master aset.

| Nama Kolom | Tipe Data | Keterangan |
|---|---|---|
| `id` | `uuid` | Primary Key |
| `tipe_kode` | `varchar` | Relasi ke `infrastruktur_tipe.kode` |
| `parent_id` | `uuid` | Relasi ke ID master aset di tabel dinamis |
| `geom` | `geometry` | Spasial geometry LineString segmen (SRID 4326) |
| `namobj` | `varchar` | Nama/label segmen |
| `panjang` | `float8` | Panjang fisik segmen (meter) |
| `lebar` | `float8` | Lebar fisik segmen (meter) |
| `kondisi` | `varchar` | Kondisi fisik (Baik, Sedang, Rusak Ringan, Rusak Berat) |
| `status_kondisi` | `varchar` | Status realisasi (Eksisting, Realisasi 100%, dll) |
| `tahun_pembangunan` | `int4` | Tahun pengerjaan/survei |
| `sumber_dana` | `varchar` | APBD, APBDes, DAK, dll |
| `sumber_data` | `varchar` | Survey Desa, Survey Bappeda, dll |
| `status_aset` | `varchar` | Aset Desa, Aset Kabupaten, dll |
| `status_parent` | `bool` | Flag apakah segmen mewakili parent |
| `status_verifikasi` | `varchar` | Draft, Terverifikasi, Ditolak |
| `verifikator` | `varchar` | Nama/ID verifikator |
| `user_id` | `uuid` | ID pengguna pembuat data |
| `plotting_id` | `uuid` | ID sesi plotting jika ada |
| `keterangan` | `text` | Catatan tambahan |
| `foto_url` | `varchar` | Path / URL foto dokumentasi lapangan |
| `atribut` | `jsonb` | Field atribut kustom tambahan |
| `desa` | `varchar` | Nama desa |
| `kecamatan` | `varchar` | Nama kecamatan |
| `id_desa` | `int8` | Kode Kemendagri / BPS Desa |
| `id_kecamatan` | `int4` | Kode Kemendagri / BPS Kecamatan |
| `created_at` | `timestamptz` | Waktu dibuat |
| `updated_at` | `timestamptz` | Waktu diperbarui |

---

### 1.3 Tabel `infrastruktur_area` (Area Poligon Pendukung)
Menyimpan area polygon pendukung (seperti area parkir, tambatan, embung, shelter terminal, dll).

| Nama Kolom | Tipe Data | Keterangan |
|---|---|---|
| `id` | `uuid` | Primary Key |
| `tipe_kode` | `varchar` | Relasi ke `infrastruktur_tipe.kode` |
| `parent_id` | `uuid` | Relasi ke ID master aset (opsional / nullable) |
| `namobj` | `varchar` | Nama objek fasilitas / area |
| `geom` | `geometry` | Spasial geometry Polygon (SRID 4326) |
| `panjang` | `float8` | Panjang area (meter) |
| `lebar` | `float8` | Lebar area (meter) |
| `kondisi` | `varchar` | Kondisi fisik |
| `status_kondisi` | `varchar` | Status eksisting / rencana |
| `tahun_pembangunan` | `int4` | Tahun pembangunan |
| `sumber_dana` | `varchar` | APBD, APBDes, dll |
| `sumber_data` | `varchar` | Sumber data survei |
| `status_parent` | `bool` | Flag keterikatan parent |
| `keterangan` | `text` | Keterangan |
| `foto_url` | `varchar` | URL foto |
| `atribut` | `jsonb` | Atribut tambahan |
| `desa` | `varchar` | Nama desa |
| `kecamatan` | `varchar` | Nama kecamatan |
| `id_desa` | `int8` | Kode desa |
| `id_kecamatan` | `int4` | Kode kecamatan |
| `plotting_id` | `uuid` | ID sesi plotting |
| `verifikator` | `varchar` | Nama verifikator |
| `user_id` | `uuid` | ID user pembuat |
| `created_at` | `timestamptz` | Waktu dibuat |
| `updated_at` | `timestamptz` | Waktu diperbarui |

---

### 1.4 Contoh Master Table Dinamis: `jalan_porosdesa`
Tabel master ruas jalan utama (terkait dengan `table_name: 'jalan_porosdesa'`).

| Nama Kolom | Tipe Data | Keterangan |
|---|---|---|
| `id` | `uuid` | Primary Key |
| `kode_ruas` | `int4` | Nomor kode ruas jalan |
| `nama_ruas` | `varchar` | Nama ruas jalan utama |
| `desa` | `varchar` | Nama desa |
| `kecamatan` | `varchar` | Nama kecamatan |
| `panjang` | `float8` | Total panjang ruas (meter) |
| `lebar` | `float8` | Lebar rata-rata (meter) |
| `perkerasan` | `varchar` | Aspal, Beton, Telford, Tanah |
| `kondisi` | `varchar` | Kondisi umum ruas |
| `status_awal` | `varchar` | Status status awal aset |
| `status_eksisting` | `varchar` | Status operasional saat ini |
| `sumber_data` | `varchar` | Sumber pendataan |
| `geom` | `geometry` | Spasial geometry LineString master ruas (SRID 4326) |
| `id_desa` | `int8` | ID desa Kemendagri |
| `id_kecamatan` | `int4` | ID kecamatan Kemendagri |
| `created_at` | `timestamptz` | Waktu dibuat |
| `updated_at` | `timestamptz` | Waktu diperbarui |

---

## 2. Standar Koordinat & Response Envelope

* **Koordinat Spasial:** Selalu menggunakan **WGS 84 (EPSG:4326)** dengan format array GeoJSON `[longitude, latitude]`.
* **Standard Response Envelope:**
  ```json
  {
    "status": "success",
    "message": "Operasi berhasil.",
    "data": {}
  }
  ```

---

## 3. Endpoints REST API

### 3.1 Modul Metadata Tipe
#### `GET /v1/infrastruktur` atau `GET /v1/manage/infrastruktur-tipe`
*Mengambil daftar master tipe infrastruktur beserta kapabilitas dan form_schema.*

**Response (200 OK):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "a85c8e2b-47e0-47b8-b769-63a2a6de1451",
      "kode": "jalan",
      "nama": "Jalan Poros Desa",
      "deskripsi": "Jaringan jalan poros desa",
      "ikon": "route",
      "warna": "#3B82F6",
      "geom_type": "LINESTRING",
      "table_name": "jalan_porosdesa",
      "has_segmen": true,
      "is_active": true,
      "sort_order": 1,
      "config": {
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
    }
  ]
}
```

---

### 3.2 Modul Master Aset (Digitasi Geometri Utama)

#### A. GeoJSON Layer Peta
`GET /v1/infrastruktur/{kode}?format=geojson`

**Response (200 OK):**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "e9b28b70-76bc-47bb-84a1-0cfd80e7a2b3",
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [111.8812, -7.1523],
          [111.8835, -7.1545]
        ]
      },
      "properties": {
        "id": "e9b28b70-76bc-47bb-84a1-0cfd80e7a2b3",
        "kode_ruas": 101,
        "nama_ruas": "Ruas Sukomaju - Karangrejo",
        "panjang": 1250.0,
        "lebar": 3.5,
        "perkerasan": "Aspal",
        "kondisi": "Baik",
        "desa": "Sukomaju",
        "kecamatan": "Bojonegoro"
      }
    }
  ]
}
```

#### B. Detail Master Aset
`GET /v1/infrastruktur/{kode}/{id}`

#### C. Create Master Aset Baru (Draw Tool)
`POST /v1/infrastruktur/{kode}`

**Request Body:**
```json
{
  "attributes": {
    "kode_ruas": 102,
    "nama_ruas": "Ruas Mawar Indah",
    "lebar": 3.5,
    "perkerasan": "Beton",
    "kondisi": "Baik",
    "desa": "Sukomaju",
    "kecamatan": "Bojonegoro",
    "id_desa": 3522012001,
    "id_kecamatan": 352201
  },
  "geom": {
    "type": "LineString",
    "coordinates": [
      [111.8812, -7.1523],
      [111.8835, -7.1545]
    ]
  }
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Master aset berhasil dibuat.",
  "data": {
    "id": "e9b28b70-76bc-47bb-84a1-0cfd80e7a2b3"
  }
}
```

#### D. Update Master Aset (Modify Tool / PATCH)
`PATCH /v1/infrastruktur/{kode}/{id}`

**Request Body:**
```json
{
  "attributes": {
    "nama_ruas": "Ruas Mawar Indah (Diperlebar)",
    "lebar": 4.0,
    "kondisi": "Baik"
  },
  "geom": {
    "type": "LineString",
    "coordinates": [
      [111.8812, -7.1523],
      [111.8840, -7.1550]
    ]
  }
}
```

#### E. Delete Master Aset
`DELETE /v1/infrastruktur/{kode}/{id}`

---

### 3.3 Modul Segmen Infrastruktur (`infrastruktur_segmen`)

#### A. List Segmen Milik Suatu Master Aset
`GET /v1/infrastruktur/{kode}/{parentId}/segmen`

**Response (200 OK):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "b3e67120-1a2b-4c3d-9e8f-0123456789ab",
      "tipe_kode": "jalan",
      "parent_id": "e9b28b70-76bc-47bb-84a1-0cfd80e7a2b3",
      "namobj": "Segmen 1 - STA 0+000 s/d 0+500",
      "panjang": 500.0,
      "lebar": 3.5,
      "kondisi": "Baik",
      "status_kondisi": "Realisasi 100%",
      "tahun_pembangunan": 2024,
      "sumber_dana": "APBDes",
      "sumber_data": "Survey Desa",
      "status_aset": "Aset Desa",
      "desa": "Sukomaju",
      "kecamatan": "Bojonegoro",
      "geom": {
        "type": "LineString",
        "coordinates": [
          [111.8812, -7.1523],
          [111.8820, -7.1530]
        ]
      }
    }
  ]
}
```

#### B. Create Segmen Baru
`POST /v1/infrastruktur/{kode}/{parentId}/segmen`

**Request Body:**
```json
{
  "namobj": "Segmen 2 - STA 0+500 s/d 1+000",
  "panjang": 500.0,
  "lebar": 3.5,
  "kondisi": "Sedang",
  "status_kondisi": "Eksisting",
  "tahun_pembangunan": 2024,
  "sumber_dana": "APBDes",
  "sumber_data": "Survey Desa",
  "status_aset": "Aset Desa",
  "status_parent": false,
  "geom": {
    "type": "LineString",
    "coordinates": [
      [111.8820, -7.1530],
      [111.8835, -7.1545]
    ]
  }
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Segmen berhasil dibuat.",
  "data": {
    "id": "c4d5e6f7-8a9b-0c1d-2e3f-456789abcdef"
  }
}
```

#### C. Update & Delete Segmen
* `PUT /v1/infrastruktur/{kode}/{parentId}/segmen/{segmenId}`
* `DELETE /v1/infrastruktur/{kode}/{parentId}/segmen/{segmenId}`

---

### 3.4 Modul Area Poligon Pendukung (`infrastruktur_area`)

#### A. List Area GeoJSON per Tipe
`GET /v1/infrastruktur/{kode}/area?format=geojson`
*(Opsional filter parent)*: `GET /v1/infrastruktur/{kode}/{parentId}/area?format=geojson`

#### B. Create Area Polygon Baru
`POST /v1/infrastruktur/{kode}/area`

**Request Body:**
```json
{
  "parent_id": "e9b28b70-76bc-47bb-84a1-0cfd80e7a2b3",
  "namobj": "Area Perkerasan Lahan Parkir / Tambatan",
  "panjang": 100.0,
  "lebar": 5.0,
  "kondisi": "Baik",
  "status_kondisi": "Eksisting",
  "tahun_pembangunan": 2025,
  "sumber_dana": "APBD",
  "sumber_data": "Survey Spasial",
  "status_parent": false,
  "desa": "Sukomaju",
  "kecamatan": "Bojonegoro",
  "geom": {
    "type": "Polygon",
    "coordinates": [
      [
        [111.880, -7.150],
        [111.881, -7.150],
        [111.881, -7.151],
        [111.880, -7.151],
        [111.880, -7.150]
      ]
    ]
  }
}
```

---

## 4. Query Helper PostGIS yang Disarankan untuk Backend

### 4.1 Insert Master Ruas dengan GeoJSON (WGS 84 -> SRID 4326)
```sql
INSERT INTO jalan_porosdesa (
  id, kode_ruas, nama_ruas, desa, kecamatan, lebar, kondisi,
  geom, panjang, id_desa, id_kecamatan, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  $1, $2, $3, $4, $5, $6,
  ST_SetSRID(ST_GeomFromGeoJSON($7), 4326),
  ST_Length(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($7), 4326), 3857)), -- Auto kalkulasi panjang meter
  $8, $9, NOW(), NOW()
) RETURNING id;
```

### 4.2 Query GeoJSON FeatureCollection Efisien
```sql
SELECT json_build_object(
  'type', 'FeatureCollection',
  'features', COALESCE(json_agg(
    json_build_object(
      'type', 'Feature',
      'id', id,
      'geometry', ST_AsGeoJSON(geom)::json,
      'properties', json_build_object(
        'id', id,
        'kode_ruas', kode_ruas,
        'nama_ruas', nama_ruas,
        'panjang', panjang,
        'lebar', lebar,
        'kondisi', kondisi,
        'desa', desa,
        'kecamatan', kecamatan
      )
    )
  ), '[]'::json)
) AS geojson
FROM jalan_porosdesa
WHERE geom IS NOT NULL;
```
