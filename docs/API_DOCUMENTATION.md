# Dokumentasi Teknis REST API WebGIS Editor (Backend Hapi.js + PostgreSQL / PostGIS)

Dokumentasi ini menjelaskan arsitektur backend, skema basis data spasial, dan referensi endpoint RESTful API untuk modul **Infrastruktur Tipe, Master Aset Dinamis, Segmen Aset, dan Area Poligon Pendukung**.

---

## 1. Arsitektur Data & Basis Data Spasial

Sistem menggunakan arsitektur data **Dynamic Master Table + Shared Sub-Tables**:

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

### 1.1 Tabel Konfigurasi: `infrastruktur_tipe`
Menyimpan metadata dan konfigurasi tipe infrastruktur (seperti kapabilitas digitasi, ikon, form schema).

| Kolom | Tipe Data | Deskripsi |
|---|---|---|
| `id` | `UUID` (PK) | Identifier unik |
| `kode` | `VARCHAR(50)` (Unique) | Kode tipe (contoh: `jalan`, `jembatan`, `drainase`) |
| `nama` | `VARCHAR(100)` | Label tampilan tipe |
| `deskripsi` | `TEXT` | Deskripsi detail |
| `ikon` | `VARCHAR(100)` | Nama icon (Lucide icon) |
| `warna` | `VARCHAR(20)` | Kode hex warna layer (contoh: `#3B82F6`) |
| `geom_type` | `VARCHAR(30)` | Tipe geometri (`LINESTRING`, `POINT`, `POLYGON`) |
| `table_name` | `VARCHAR(100)` | Nama tabel master di PostgreSQL (contoh: `jalan_porosdesa`) |
| `has_segmen` | `BOOLEAN` | Flag ketersediaan segmentasi |
| `is_active` | `BOOLEAN` | Status aktif |
| `sort_order` | `INTEGER` | Urutan tampilan |
| `config` | `JSONB` | Pengaturan dinamis (`capabilities`, `attributes`, `form_schema`) |
| `created_at` | `TIMESTAMPTZ` | Waktu dibuat |
| `updated_at` | `TIMESTAMPTZ` | Waktu diperbarui |

---

### 1.2 Tabel Shared: `infrastruktur_segmen`
Menyimpan segmen ruas fisik, kondisi, dan status verifikasi yang terhubung ke parent master aset.

| Kolom | Tipe Data | Deskripsi |
|---|---|---|
| `id` | `UUID` (PK) | Identifier unik segmen |
| `tipe_kode` | `VARCHAR(50)` | Relasi logis ke `infrastruktur_tipe.kode` |
| `parent_id` | `UUID` (Nullable) | Relasi ke ID master aset (contoh: `jalan_porosdesa.id`) |
| `namobj` | `VARCHAR(255)` | Nama/label segmen |
| `geom` | `GEOMETRY(4326)` | Geometri spasial WGS 84 (LineString/MultiLineString) |
| `panjang` | `DOUBLE PRECISION` | Panjang fisik (meter) |
| `lebar` | `DOUBLE PRECISION` | Lebar fisik (meter) |
| `kondisi` | `VARCHAR(50)` | Kondisi fisik (`Baik`, `Sedang`, `Rusak Ringan`, `Rusak Berat`) |
| `status_kondisi` | `VARCHAR(50)` | Status realisasi (`Eksisting`, `Realisasi 100%`, dll) |
| `tahun_pembangunan` | `INTEGER` | Tahun pengerjaan/survei |
| `sumber_dana` | `VARCHAR(100)` | Sumber pendanaan (`APBD`, `APBDes`, `DAK`, dll) |
| `sumber_data` | `VARCHAR(100)` | Sumber data (`Survey Desa`, `Survey Bappeda`, dll) |
| `status_aset` | `VARCHAR(100)` | Status kepemilikan (`Aset Desa`, `Aset Kabupaten`, dll) |
| `status_parent` | `BOOLEAN` | Flag keterikatan ke parent master |
| `status_verifikasi` | `VARCHAR(50)` | Status alur verifikasi (`verifikasi_kecamatan`, `verifikasi_bappeda`, `terverifikasi`, `ditolak_bappeda`) |
| `catatan_verifikasi`| `TEXT` | Catatan dari verifikator |
| `verifikator` | `VARCHAR(255)` | Nama/ID verifikator terakhir |
| `user_id` | `UUID` | ID pengguna pembuat data |
| `plotting_id` | `UUID` (Nullable) | Relasi ke sesi plotting anggaran |
| `foto_url` | `VARCHAR(500)` | URL/path foto dokumentasi lapangan |
| `atribut` | `JSONB` | Atribut dinamis tambahan |
| `desa` / `kecamatan`| `VARCHAR(100)` | Nama wilayah administratif |
| `id_desa` / `id_kecamatan` | `BIGINT` / `INTEGER` | Kode Kemendagri wilayah |

---

### 1.3 Tabel Shared: `infrastruktur_area`
Menyimpan geometri Polygon pendukung (seperti area parkir, embung, shelter, tambatan).

| Kolom | Tipe Data | Deskripsi |
|---|---|---|
| `id` | `UUID` (PK) | Identifier unik area |
| `tipe_kode` | `VARCHAR(50)` | Relasi logis ke `infrastruktur_tipe.kode` |
| `parent_id` | `UUID` (Nullable) | Relasi ke ID master aset |
| `namobj` | `VARCHAR(255)` | Nama objek area / fasilitas |
| `geom` | `GEOMETRY(4326)` | Geometri spasial WGS 84 (Polygon/MultiPolygon) |
| `panjang` / `lebar` | `DOUBLE PRECISION` | Dimensi fisik |
| `kondisi` | `VARCHAR(50)` | Kondisi fisik objek |
| `status_kondisi` | `VARCHAR(50)` | Status eksisting / rencana |
| `tahun_pembangunan` | `INTEGER` | Tahun pembangunan |
| `sumber_dana` | `VARCHAR(100)` | Sumber pendanaan |
| `sumber_data` | `VARCHAR(100)` | Sumber data survei |
| `status_parent` | `BOOLEAN` | Status keterikatan parent |
| `atribut` | `JSONB` | Field atribut kustom tambahan |
| `foto_url` | `VARCHAR(500)` | Dokumentasi foto |
| `desa` / `kecamatan`| `VARCHAR(100)` | Wilayah administratif |
| `id_desa` / `id_kecamatan` | `BIGINT` / `INTEGER` | Kode wilayah Kemendagri |

---

## 2. Standar Koordinat & Response Envelope

- **Sistem Koordinat Spasial**: Seluruh geometri menggunakan koordinat **WGS 84 (EPSG:4326)** dengan format GeoJSON array `[longitude, latitude]`.
- **Standard Response Envelope**:
  ```json
  {
    "status": "success",
    "message": "Operasi berhasil.",
    "data": {},
    "result": {}
  }
  ```
- **GeoJSON Direct Response**: Jika parameter `?format=geojson` diberikan, endpoint mengembalikan objek GeoJSON `FeatureCollection` standar RFC 7946 langsung (dapat langsung di-load menggunakan `L.geoJSON()` di Leaflet).

---

## 3. Dokumentasi REST API

### 3.1 Metadata & Registry Tipe Infrastruktur

#### `GET /v1/infrastruktur`
Mengambil daftar tipe infrastruktur aktif beserta konfigurasi kapabilitas drawing dan form schemas.

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Berhasil mengambil daftar tipe infrastruktur",
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

### 3.2 Master Aset Dinamis (Geometri Utama)

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

Mendukung payload bersarang (`attributes` + `geom`) maupun payload flat. Panjang garis dihitung otomatis jika tidak disediakan.

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

#### D. Update Master Aset (Modify Tool / PATCH & PUT)
`PATCH /v1/infrastruktur/{kode}/{id}` atau `PUT /v1/infrastruktur/{kode}/{id}`

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

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Master aset berhasil diperbarui.",
  "data": {
    "id": "e9b28b70-76bc-47bb-84a1-0cfd80e7a2b3",
    "nama_ruas": "Ruas Mawar Indah (Diperlebar)",
    "lebar": 4.0
  }
}
```

#### E. Delete Master Aset
`DELETE /v1/infrastruktur/{kode}/{id}`

---

### 3.3 Segmen Infrastruktur (`infrastruktur_segmen`)

#### A. List Segmen Per Master Parent
`GET /v1/infrastruktur/{kode}/{parentId}/segmen` (atau `?format=geojson`)

#### B. List Seluruh Segmen Per Tipe
`GET /v1/infrastruktur/{kode}/segmen` (atau `?format=geojson`)

#### C. Create Segmen Baru
`POST /v1/infrastruktur/{kode}/{parentId}/segmen` atau `POST /v1/infrastruktur/{kode}/segmen`

**Request Body:**
```json
{
  "namobj": "Segmen 1 - STA 0+000 s/d 0+500",
  "lebar": 3.5,
  "kondisi": "Baik",
  "status_kondisi": "Realisasi 100%",
  "tahun_pembangunan": 2024,
  "sumber_dana": "APBDes",
  "sumber_data": "Survey Desa",
  "status_aset": "Aset Desa",
  "status_parent": true,
  "geom": {
    "type": "LineString",
    "coordinates": [
      [111.8812, -7.1523],
      [111.8820, -7.1530]
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
    "id": "b3e67120-1a2b-4c3d-9e8f-0123456789ab"
  }
}
```

#### D. Update Segmen (PUT & PATCH)
`PATCH /v1/infrastruktur/{kode}/segmen/{segmenId}` atau `PUT /v1/infrastruktur/{kode}/{parentId}/segmen/{id}`

#### E. Delete Segmen
`DELETE /v1/infrastruktur/{kode}/segmen/{segmenId}` atau `DELETE /v1/infrastruktur/{kode}/{parentId}/segmen/{id}`

#### F. Verifikasi & Pengajuan Segmen Bappeda
- `PUT /v1/infrastruktur/{kode}/segmen/{segmenId}/submit-bappeda`: Mengajukan segmen dari operator kecamatan ke Bappeda (`verifikasi_bappeda`).
- `POST /v1/infrastruktur/{kode}/segmen/batch-submit-bappeda`: Pengajuan massal per desa/kecamatan/tahun.
- `PATCH /v1/infrastruktur/{kode}/segmen/{segmenId}/verifikasi`: Verifikasi segmen oleh operator Bappeda (`terverifikasi` / `ditolak_bappeda` / dikembalikan).

---

### 3.4 Area Poligon Pendukung (`infrastruktur_area`)

#### A. List Area GeoJSON per Tipe
`GET /v1/infrastruktur/{kode}/area?format=geojson`
*(Filter parent opsional)*: `GET /v1/infrastruktur/{kode}/{parentId}/area?format=geojson`

#### B. Create Area Polygon Baru
`POST /v1/infrastruktur/{kode}/area` atau `POST /v1/infrastruktur/{kode}/{parentId}/area`

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

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Area berhasil dibuat.",
  "data": {
    "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
  }
}
```

#### C. Detail, Update (PUT/PATCH), & Delete Area
- `GET /v1/infrastruktur/{kode}/area/{areaId}`
- `PATCH /v1/infrastruktur/{kode}/area/{areaId}`
- `DELETE /v1/infrastruktur/{kode}/area/{areaId}`

---

### 3.5 Monitoring Dokumen Laporan & Revert to Draft (`monitoring_laporan`)

#### A. List & Detail Laporan
- `GET /v1/laporan`: Mengambil daftar laporan monitoring (mendukung filter query `?id_desa=`, `?id_kecamatan=`, `?tahun_anggaran=`, `?status=Draft|Submitted|Final`).
- `GET /v1/laporan/{id}`: Mengambil detail lengkap dokumen berita acara beserta relasi segmen terdigitasi dan histori revisi.

#### B. Revert / Rollback to Draft (Buka Kunci untuk Revisi)
- `POST /v1/laporan/{id}/revert-to-draft` (atau `PATCH /v1/laporan/{id}/revert-to-draft`)
- **Role**: `operator_bappeda`, `super_admin`, `admin`

**Request Body:**
```json
{
  "catatan": "Perbaiki sambungan persimpangan pada segmen RT 04 sebelum difinalisasi.",
  "unlock_segments": true,
  "target_segment_status": "verifikasi_kecamatan"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Dokumen Berita Acara berhasil dikembalikan ke status Draft untuk revisi.",
  "data": {
    "id": "c7a8e2b1-5d9f-4e3a-8b1a-1e2f3a4b5c6d",
    "nomor_ba": "050/012/412.302/2026",
    "id_desa": 3522012001,
    "id_kecamatan": 352201,
    "tahun_anggaran": 2026,
    "status": "Draft",
    "catatan_revisi": "Perbaiki sambungan persimpangan pada segmen RT 04 sebelum difinalisasi.",
    "reverted_at": "2026-08-15T13:35:00.000Z",
    "updated_at": "2026-08-15T13:35:00.000Z",
    "unlocked_segments_count": 5
  },
  "result": {
    "id": "c7a8e2b1-5d9f-4e3a-8b1a-1e2f3a4b5c6d",
    "nomor_ba": "050/012/412.302/2026",
    "id_desa": 3522012001,
    "id_kecamatan": 352201,
    "tahun_anggaran": 2026,
    "status": "Draft",
    "catatan_revisi": "Perbaiki sambungan persimpangan pada segmen RT 04 sebelum difinalisasi.",
    "reverted_at": "2026-08-15T13:35:00.000Z",
    "updated_at": "2026-08-15T13:35:00.000Z",
    "unlocked_segments_count": 5
  }
}
```

#### C. Submit Laporan ke Bappeda (Operator Kecamatan / Bappeda)
- `POST /v1/laporan/{id}/submit` (atau `PATCH /v1/laporan/{id}` dengan body `{ "status": "Submitted" }`)
- **Role**: `operator_kecamatan`, `operator_bappeda`, `super_admin`, `admin`
- **Aturan RBAC**:
  - `operator_kecamatan` hanya dapat men-submit laporan di wilayah kecamatannya (`id_kecamatan` sesuai).
  - Saat laporan di-submit (`status: "Submitted"`), seluruh segmen terkait otomatis diperbarui menjadi `status_verifikasi: "verifikasi_bappeda"`.
  - `operator_kecamatan` tidak diizinkan mengubah status menjadi `Final` (403 Forbidden).

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Laporan Monitoring berhasil dikirimkan ke Bappeda. 5 segmen beralih ke status Verifikasi Bappeda.",
  "data": {
    "id": "c7a8e2b1-5d9f-4e3a-8b1a-1e2f3a4b5c6d",
    "nomor_ba": "050/012/412.302/2026",
    "status": "Submitted",
    "resubmitted_at": "2026-08-15T14:30:00.000Z"
  }
}
```

#### D. Safe Delete Laporan
- `DELETE /v1/laporan/{id}?delete_segments=false`
- Jika `delete_segments=false` (atau query param diberikan `false`), dokumen Berita Acara dan relasi junction dihapus, namun baris fisik `infrastruktur_segmen` dipertahankan dan status verifikasinya dikembalikan ke `verifikasi_kecamatan`.
