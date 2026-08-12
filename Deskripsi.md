# MELAROSA — Monitoring Layanan dan Realisasi Infrastruktur Berbasis Spasial

**MELAROSA** adalah sebuah sistem aplikasi berbasis **WebGIS** yang dirancang untuk **Bappeda Kabupaten Bojonegoro** guna memantau pelaksanaan dan realisasi pembangunan infrastruktur yang dibiayai melalui mekanisme **BKK (Bantuan Keuangan Khusus)** dari Pemerintah Provinsi Jawa Timur kepada Pemerintah Desa.

Sistem ini memadukan visualisasi geospasial interaktif dengan manajemen data tabular untuk mendukung pengambilan keputusan yang presisi, transparan, dan berbasis data spasial.

---

## 🚀 Arsitektur Teknologi

Aplikasi ini dibangun menggunakan arsitektur modern berbasis *separation of concerns* (frontend dan backend terpisah):

### 1. Frontend Layer (`melarosa-reactjs`)
*   **Framework**: [React Router v7](https://reactrouter.com/) (menggunakan konfigurasi baru dengan Vite).
*   **Bahasa Pemrograman**: TypeScript (menjamin tipe data yang aman).
*   **Engine Peta (WebGIS)**: [OpenLayers](https://openlayers.org/) (untuk interaksi peta, penggambaran koordinat, dan layer spasial) serta [Mapbox-GL](https://docs.mapbox.com/mapbox-gl-js/api/) (sebagai visualisasi peta dasar).
*   **UI/Styling**: Tailwind CSS & Shadcn UI (menyediakan antarmuka premium, responsif, dan rapi).
*   **State & Form Management**: React Hook Form & Zod (untuk validasi sisi klien).

### 2. Backend Layer (`melarosa-bappedabjn`)
*   **Framework**: [Hapi.js](https://hapi.dev/) (terkenal dengan performa tinggi, robust, dan arsitektur plugin yang aman).
*   **Database**: PostgreSQL dengan ekstensi spasial **PostGIS**.
*   **ORM**: Sequelize (untuk abstraksi tabel database relasional).
*   **Security & Auth**: JWT (JSON Web Token), CASL (untuk kontrol otorisasi tingkat lanjut), dan Bcrypt (untuk enkripsi kata sandi).

---

## 🏗️ Mekanisme BKK (Bantuan Keuangan Khusus)

BKK adalah bantuan keuangan yang bersifat khusus dari Pemerintah Provinsi kepada Pemerintah Desa melalui APBD Kabupaten. MELAROSA menjadi instrumen monitoring digital untuk memastikan setiap rupiah BKK terealisasi sesuai perencanaan, terdokumentasi secara spasial, dan dapat diverifikasi secara berjenjang.

---

## 🛠️ Fitur-Fitur Utama Sistem

### 1. Manajemen Usulan Desa (Proposal Desa)
Fitur ini memfasilitasi operator desa untuk mendaftarkan dan memetakan rencana pembangunan fisik di daerah mereka.
*   **Registrasi Usulan**: Penginputan nomor agenda, nomor surat, uraian kegiatan, volume, estimasi anggaran (`anggaran_usulan`), dan unggah dokumen pendukung.
*   **Kategori Usulan**: Pengelompokan jenis usulan (seperti Jalan, Jembatan, Drainase, TPT, atau Jalan Lingkungan).
*   **Pemetaan Geometri Spasial**: Penggambaran langsung titik koordinat kegiatan di peta interaktif menggunakan tipe geometri:
    *   `Point` (untuk usulan titik tertentu, misal: jembatan).
    *   `LineString` (untuk jalur memanjang, misal: jalan desa).
    *   `Polygon` (untuk luasan area).
*   **Workflow Status**: Pelacakan proses usulan mulai dari `pending` ➔ `verifikasi_bappeda` ➔ `verifikasi_opd` ➔ `selesai` / `ditolak`.

### 2. Laporan Realisasi Pembangunan
Digunakan untuk memantau pengerjaan fisik proyek BKK di lapangan secara langsung.
*   **Entry Realisasi**: Formulir input laporan realisasi fisik berdasarkan data perencanaan yang disetujui.
*   **Peta Koordinat Realisasi**: Penandaan posisi pengerjaan riil di lapangan menggunakan koordinat GPS (spasial).
*   **Verifikasi Lapangan**: Verifikasi berkala oleh dinas terkait (OPD) dan Bappeda terhadap realisasi anggaran serta fisik proyek.

### 3. Peta Interaktif & Integrasi Spasial (WebGIS Portal)
Portal utama untuk menampilkan seluruh peta tematik secara terintegrasi.
*   **Batas Administrasi**: Overlay data batas desa (`bataswilayah_desa`) dan batas kecamatan (`bataswilayah_kecamatan`).
*   **Overlay Layer**: Dukungan integrasi server peta eksternal seperti GeoServer dan GeoNode (WMS/WFS layer) serta basemaps kustom.
*   **Katalog Dataset**: Portal katalog geospatial untuk menyimpan dan mencari berbagai dataset peta.

### 4. Sistem Keamanan & Akses Kontrol (RBAC & ABAC)
Kontrol keamanan berlapis untuk menjamin kerahasiaan dan integritas data daerah:
*   **Role-Based Access Control (RBAC)**: Pembagian akses berdasarkan peran pengguna:
    *   `super_admin`: Kontrol penuh atas seluruh sistem dan konfigurasi.
    *   `operator_bappeda`: Memvalidasi usulan, realisasi, dan memantau wilayah secara makro.
    *   `operator_opd`: Verifikasi teknis kegiatan sesuai bidang OPD.
    *   `operator_desa`: Hanya dapat mengelola usulan & realisasi di dalam batas wilayah desa mereka sendiri.
*   **Attribute-Based Access Control (ABAC)** via [CASL](https://casl.js.org/): Pembatasan akses dinamis (contoh: operator desa hanya bisa melihat/mengedit data jika `id_desa` pada data cocok dengan `id_desa` di profil mereka).
*   **Manajemen Sesi Aktif**: Melacak masuknya akun di berbagai perangkat dengan opsi cabut akses (*revoke session*) dari jarak jauh.

---

## 🔄 Alur Kerja Sistem (System Workflow)

```
[Operator Desa] ───> Input Usulan + Geometri Spasial ───> (Status: Pending)
                                                               │
                                                               ▼
                                                     { Verifikasi Bappeda }
                                                      ├── Ditolak ➔ (Status: Ditolak)
                                                      └── Setuju  ➔ (Status: Verifikasi OPD)
                                                                             │
                                                                             ▼
                                                                   { Verifikasi OPD }
                                                                    ├── Ditolak ➔ (Status: Ditolak)
                                                                    └── Setuju  ➔ (Status: Selesai)
                                                                                     │
                                                                                     ▼
                                                                         [ Laporan Realisasi ]
                                                                        (Input Fisik + GPS Lapangan)
```

---

## 🗄️ Model Database Utama (`melarosa-bappedabjn`)

*   **`User`**: Data pengguna, daerah tugas (`id_kecamatan`, `id_desa`), dan peran (*role*).
*   **`UserSession`**: Pencatatan token JWT aktif dan sidik jari perangkat pengguna.
*   **`UsulanDesa`**: Metadata usulan kegiatan pembangunan fisik dari desa.
*   **`UsulanDesaGeometry`**: Koordinat spasial (Point/Line/Polygon) yang terhubung ke `UsulanDesa`.
*   **`UsulanKategori`**: Kategori infrastruktur yang diajukan.
*   **`RealisasiEntry`**: Log realisasi pembangunan kegiatan fisik di lapangan.
*   **`RealisasiTitik`**: Titik spasial GPS hasil monitoring di lapangan.
*   **`BataswilayahKecamatan` & `BataswilayahDesa`**: Batas poligon administrasi wilayah Kabupaten Bojonegoro.


---

## 🚀 Arsitektur Teknologi

Aplikasi ini dibangun menggunakan arsitektur modern berbasis *separation of concerns* (frontend dan backend terpisah):

### 1. Frontend Layer (`gigis-reactjs`)
*   **Framework**: [React Router v7](https://reactrouter.com/) (menggunakan konfigurasi baru dengan Vite).
*   **Bahasa Pemrograman**: TypeScript (menjamin tipe data yang aman).
*   **Engine Peta (WebGIS)**: [OpenLayers](https://openlayers.org/) (untuk interaksi peta, penggambaran koordinat, dan layer spasial) serta [Mapbox-GL](https://docs.mapbox.com/mapbox-gl-js/api/) (sebagai visualisasi peta dasar).
*   **UI/Styling**: Tailwind CSS & Shadcn UI (menyediakan antarmuka premium, responsif, dan rapi).
*   **State & Form Management**: React Hook Form & Zod (untuk validasi sisi klien).

### 2. Backend Layer (`gigis-bappedabjn`)
*   **Framework**: [Hapi.js](https://hapi.dev/) (terkenal dengan performa tinggi, robust, dan arsitektur plugin yang aman).
*   **Database**: PostgreSQL dengan ekstensi spasial **PostGIS**.
*   **ORM**: Sequelize (untuk abstraksi tabel database relasional).
*   **Security & Auth**: JWT (JSON Web Token), CASL (untuk kontrol otorisasi tingkat lanjut), dan Bcrypt (untuk enkripsi kata sandi).

---

## 🛠️ Fitur-Fitur Utama Sistem

### 1. Manajemen Usulan Desa (Proposal Desa)
Fitur ini memfasilitasi operator desa untuk mendaftarkan dan memetakan rencana pembangunan fisik di daerah mereka.
*   **Registrasi Usulan**: Penginputan nomor agenda, nomor surat, uraian kegiatan, volume, estimasi anggaran (`anggaran_usulan`), dan unggah dokumen pendukung.
*   **Kategori Usulan**: Pengelompokan jenis usulan (seperti Jalan, Jembatan, Drainase, TPT, atau Jalan Lingkungan).
*   **Pemetaan Geometri Spasial**: Penggambaran langsung titik koordinat kegiatan di peta interaktif menggunakan tipe geometri:
    *   `Point` (untuk usulan titik tertentu, misal: jembatan).
    *   `LineString` (untuk jalur memanjang, misal: jalan desa).
    *   `Polygon` (untuk luasan area).
*   **Workflow Status**: Pelacakan proses usulan mulai dari `pending` ➔ `verifikasi_bappeda` ➔ `verifikasi_opd` ➔ `selesai` / `ditolak`.

### 2. Laporan Realisasi Pembangunan
Digunakan untuk memantau pengerjaan fisik proyek di lapangan secara langsung.
*   **Entry Realisasi**: Formulir input laporan realisasi fisik berdasarkan data perencanaan yang disetujui.
*   **Peta Koordinat Realisasi**: Penandaan posisi pengerjaan riil di lapangan menggunakan koordinat GPS (spasial).
*   **Verifikasi Lapangan**: Verifikasi berkala oleh dinas terkait (OPD) dan Bappeda terhadap realisasi anggaran serta fisik proyek.

### 3. Peta Interaktif & Integrasi Spasial (WebGIS Portal)
Portal utama untuk menampilkan seluruh peta tematik secara terintegrasi.
*   **Batas Administrasi**: Overlay data batas desa (`bataswilayah_desa`) dan batas kecamatan (`bataswilayah_kecamatan`).
*   **Overlay Layer**: Dukungan integrasi server peta eksternal seperti GeoServer dan GeoNode (WMS/WFS layer) serta basemaps kustom.
*   **Katalog Dataset**: Portal katalog geospatial untuk menyimpan dan mencari berbagai dataset peta.

### 4. Sistem Keamanan & Akses Kontrol (RBAC & ABAC)
Kontrol keamanan berlapis untuk menjamin kerahasiaan dan integritas data daerah:
*   **Role-Based Access Control (RBAC)**: Pembagian akses berdasarkan peran pengguna:
    *   `super_admin`: Kontrol penuh atas seluruh sistem dan konfigurasi.
    *   `operator_bappeda`: Memvalidasi usulan, realisasi, dan memantau wilayah secara makro.
    *   `operator_desa`: Hanya dapat mengelola usulan & realisasi di dalam batas wilayah desa mereka sendiri.
*   **Attribute-Based Access Control (ABAC)** via [CASL](https://casl.js.org/): Pembatasan akses dinamis (contoh: operator desa hanya bisa melihat/mengedit data jika `id_desa` pada data cocok dengan `id_desa` di profil mereka).
*   **Manajemen Sesi Aktif**: Melacak masuknya akun di berbagai perangkat dengan opsi cabut akses (*revoke session*) dari jarak jauh.

---

## 🔄 Alur Kerja Sistem (System Workflow)

```
[Operator Desa] ───> Input Usulan + Geometri Spasial ───> (Status: Pending)
                                                               │
                                                               ▼
                                                     { Verifikasi Bappeda }
                                                      ├── Ditolak ➔ (Status: Ditolak)
                                                      └── Setuju  ➔ (Status: Verifikasi OPD)
                                                                             │
                                                                             ▼
                                                                   { Verifikasi OPD }
                                                                    ├── Ditolak ➔ (Status: Ditolak)
                                                                    └── Setuju  ➔ (Status: Selesai)
                                                                                     │
                                                                                     ▼
                                                                         [ Laporan Realisasi ]
                                                                        (Input Fisik + GPS Lapangan)
```

---

## 🗄️ Model Database Utama (`gigis-bappedabjn`)

*   **`User`**: Data pengguna, daerah tugas (`id_kecamatan`, `id_desa`), dan peran (*role*).
*   **`UserSession`**: Pencatatan token JWT aktif dan sidik jari perangkat pengguna.
*   **`UsulanDesa`**: Metadata usulan kegiatan pembangunan fisik dari desa.
*   **`UsulanDesaGeometry`**: Koordinat spasial (Point/Line/Polygon) yang terhubung ke `UsulanDesa`.
*   **`UsulanKategori`**: Kategori infrastruktur yang diajukan.
*   **`RealisasiEntry`**: Log realisasi pembangunan kegiatan fisik di lapangan.
*   **`RealisasiTitik`**: Titik spasial GPS hasil monitoring di lapangan.
*   **`BataswilayahKecamatan` & `BataswilayahDesa`**: Batas poligon administrasi wilayah Kabupaten Bojonegoro.
