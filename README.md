# MELAROSA

**Monitoring Layanan dan Realisasi Infrastruktur Berbasis Spasial**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![React Router](https://img.shields.io/badge/React_Router-7-CA4245?logo=reactrouter&logoColor=white)](https://reactrouter.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![OpenLayers](https://img.shields.io/badge/OpenLayers-10-1F6B75)](https://openlayers.org/)
[![PostGIS](https://img.shields.io/badge/PostGIS-PostgreSQL-336791?logo=postgresql&logoColor=white)](https://postgis.net/)

---

## 📌 Tentang Sistem

**MELAROSA** adalah sistem **WebGIS** berbasis web yang dibangun untuk **Bappeda Kabupaten Bojonegoro** guna memantau pelaksanaan dan realisasi pembangunan infrastruktur yang dibiayai melalui mekanisme **BKK (Bantuan Keuangan Khusus)** dari Pemerintah Kabupaten Bojonegoro kepada Desa.

Sistem ini memadukan **visualisasi geospasial interaktif** dengan **manajemen data tabular** sehingga mendukung:

- Pengawasan realisasi fisik infrastruktur di tingkat desa secara real-time
- Pemetaan koordinat GPS titik pembangunan langsung di peta
- Verifikasi berjenjang dari Operator Desa → Operator Kecamatan → Bappeda → OPD terkait
- Pelaporan dan rekap anggaran BKK berbasis spasial

---

## 🏗️ Mekanisme BKK (Bantuan Keuangan Khusus)

BKK adalah bantuan keuangan yang bersifat khusus dari Pemerintah Kabupaten Bojonegoro kepada Pemerintah Desa melalui APBD Kabupaten, digunakan untuk pembangunan infrastruktur fisik seperti:

| Jenis Infrastruktur | Keterangan |
|---|---|
| 🛣️ Jalan Poros Desa | Pengerasan neton & Pengaspalan jalan desa |
| 🌉 Jembatan | Konstruksi jembatan antar desa/dusun |
| 🌊 Drainase | Saluran air & gorong-gorong |
| 🧱 TPT | Tembok Penahan Tanah |
| 🏘️ Jalan Lingkungan | Paving/cor jalan antar RT/RW |

MELAROSA berfungsi sebagai **platform monitoring end-to-end** mulai dari pengajuan usulan kegiatan, verifikasi, ploting anggaran, pelaksanaan, hingga pelaporan realisasi fisik.

---

## 🚀 Fitur Utama

### 📊 Dashboard & Analisis
- **Statistik Agregasi**: Ringkasan total realisasi anggaran BKK per kecamatan/desa
- **Visualisasi Grafik**: Chart interaktif kondisi dan progres realisasi infrastruktur (Recharts)
- **Laporan Hierarkis**: Data terstruktur dari level Kabupaten → Kecamatan → Desa
- **Hub Monitoring**: Pusat kendali pemantauan seluruh kegiatan infrastruktur aktif

### 🗺️ Visualisasi Peta (WebGIS)
- **Multi-Engine GIS**: Integrasi OpenLayers, Leaflet, dan Mapbox GL
- **Basemap Toggle**: Pilihan berbagai peta dasar (Satelit, Street, Dark/Light)
- **Layer Management**: Kontrol layer batas administrasi, ruas jalan, titik realisasi
- **Peta Monitoring**: Overlay semua titik realisasi infrastruktur di seluruh wilayah
- **Interactive Popup**: Detail kegiatan infrastruktur langsung dari peta

### 📋 Manajemen Usulan Desa
- **Registrasi Usulan**: Input nomor agenda, surat, uraian kegiatan, volume & estimasi anggaran
- **Pemetaan Geometri Spasial**: Gambar koordinat Point/LineString/Polygon langsung di peta
- **Workflow Verifikasi**: Pelacakan status `pending` → `verifikasi_bappeda` → `verifikasi_opd` → `selesai`
- **Kategori Infrastruktur**: Jalan, Jembatan, Drainase, TPT, Jalan Lingkungan

### 🛠️ Monitoring & Realisasi
- **Entry Realisasi**: Form input laporan realisasi fisik berdasarkan rencana yang disetujui
- **GPS Titik Lapangan**: Penandaan koordinat GPS riil lokasi pengerjaan
- **Verifikasi Lapangan**: Verifikasi berkala oleh Operator Kecamatan & Bappeda
- **Dokumen Infrastruktur**: Unggah & kelola dokumen pendukung (RAB, foto, berita acara)
- **Laporan Formulir Desa**: Rekap laporan per desa dengan detail pengerjaan

### 🗄️ Master Data
- **Data Jalan Poros**: Basis data ruas jalan poros desa beserta atributnya
- **Wilayah Administrasi**: Data Kecamatan dan Desa Kabupaten Bojonegoro
- **Layer & Basemap**: Manajemen layer GIS dan peta dasar kustom
- **OPD**: Data Organisasi Perangkat Daerah pelaksana kegiatan

### 🔐 Keamanan & Akses Kontrol
- **RBAC + ABAC**: Kontrol akses berbasis peran sekaligus atribut wilayah pengguna
- **Manajemen Sesi**: Monitor & revoke sesi aktif perangkat dari jarak jauh
- **JWT Auth**: Autentikasi berbasis JSON Web Token yang aman

---

## 🏛️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                        │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP / REST API
┌─────────────────────────▼───────────────────────────────┐
│              FRONTEND  (melarosa-reactjs)                │
│   React 19 + React Router 7 + TypeScript + Vite         │
│   OpenLayers / Mapbox GL / Leaflet (WebGIS Engine)      │
│   Tailwind CSS + Shadcn UI + Radix UI                   │
└─────────────────────────┬───────────────────────────────┘
                          │ REST API (JSON)
┌─────────────────────────▼───────────────────────────────┐
│              BACKEND   (melarosa-bappedabjn)             │
│   Hapi.js + Sequelize ORM + JWT + CASL                  │
└─────────────────────────┬───────────────────────────────┘
                          │ SQL + Spatial Query
┌─────────────────────────▼───────────────────────────────┐
│              DATABASE  PostgreSQL + PostGIS              │
│   Spatial data, Batas Wilayah, Usulan, Realisasi        │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend

| Kategori | Teknologi |
|---|---|
| Framework | [React 19](https://react.dev/) + [React Router 7](https://reactrouter.com/) |
| Bahasa | TypeScript 5.9 |
| Build Tool | [Vite](https://vitejs.dev/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/) |
| GIS Engine | [OpenLayers 10](https://openlayers.org/), [Leaflet](https://leafletjs.com/), [Mapbox GL](https://www.mapbox.com/mapbox-gljs) |
| Spatial Analysis | [Turf.js](https://turfjs.org/) |
| Tabel | [TanStack Table v8](https://tanstack.com/table/v8) |
| Form & Validasi | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| Chart | [Recharts](https://recharts.org/) |
| Ikon | [Tabler Icons](https://tabler.io/icons), [Lucide React](https://lucide.dev/) |
| Notifikasi | [Sonner](https://sonner.stevenly.me/) |
| Auth Client | [CASL](https://casl.js.org/) (ABAC) |

### Backend

| Kategori | Teknologi |
|---|---|
| Framework | [Hapi.js](https://hapi.dev/) |
| Database | PostgreSQL + [PostGIS](https://postgis.net/) |
| ORM | Sequelize |
| Auth | JWT + Bcrypt |
| Otorisasi | CASL (RBAC + ABAC) |

---

## 🔄 Alur Kerja Sistem

```
[Operator Desa]
      │
      ▼  Input Usulan Kegiatan + Gambar Geometri Spasial
[Status: Pending]
      │
      ▼
[Verifikasi Bappeda]
   ├── Ditolak ──────────────────► [Status: Ditolak]
   └── Disetujui
         │
         ▼
   [Verifikasi OPD]
      ├── Ditolak ─────────────► [Status: Ditolak]
      └── Disetujui
            │
            ▼
      [Status: Selesai / Aktif]
            │
            ▼
   [Input Realisasi Fisik]
   (Form + GPS Lapangan + Foto)
            │
            ▼
   [Monitoring & Pelaporan]
   (Dashboard / Peta / Rekap)
```

---

## 👥 Peran Pengguna

| Peran | Akses |
|---|---|
| `super_admin` | Kontrol penuh seluruh sistem, konfigurasi master data |
| `operator_bappeda` | Validasi usulan & realisasi, monitoring lintas wilayah |
| `operator_opd` | Verifikasi teknis kegiatan sesuai bidang OPD |
| `operator_desa` | Input & kelola usulan + realisasi di wilayah desanya sendiri |

---

## 🗄️ Model Database Utama

| Tabel | Deskripsi |
|---|---|
| `User` | Data pengguna, peran, dan wilayah tugas |
| `UserSession` | Token JWT aktif & sidik jari perangkat |
| `UsulanDesa` | Metadata usulan kegiatan pembangunan |
| `UsulanDesaGeometry` | Koordinat spasial (Point/LineString/Polygon) |
| `UsulanKategori` | Jenis kategori infrastruktur |
| `RealisasiEntry` | Log realisasi fisik kegiatan di lapangan |
| `RealisasiTitik` | Titik GPS hasil monitoring lapangan |
| `BataswilayahKecamatan` | Batas poligon administrasi kecamatan |
| `BataswilayahDesa` | Batas poligon administrasi desa |

---

## 📦 Memulai Pengembangan

### Prasyarat
- Node.js >= 18
- npm >= 9
- Backend API `melarosa-bappedabjn` berjalan (lihat repositori backend)

### Instalasi Dependensi
```bash
npm install
```

### Konfigurasi Environment
```bash
cp .env.example .env
```

Isi variabel:
```env
VITE_API_BASE_URL=http://localhost:3000
```

### Jalankan Server Pengembangan
```bash
npm run dev
```
Aplikasi akan berjalan di `http://localhost:5173`

### Build untuk Produksi
```bash
npm run build
```

### Jalankan Produksi
```bash
npm run start
```

### Type Check
```bash
npm run typecheck
```

---

## 🐳 Docker

```bash
docker build -t melarosa-app .
docker run -p 3001:3001 melarosa-app
```

---

## 📂 Struktur Direktori

```
melarosa-reactjs/
├── app/
│   ├── components/          # Komponen UI reusable (Shadcn + custom)
│   ├── contexts/            # React Context (Auth, dll)
│   ├── dashboard/           # Layout dashboard utama
│   ├── features/            # Fitur-fitur domain bisnis
│   │   ├── auth/            # Autentikasi & sesi
│   │   ├── monitoring/      # Modul monitoring & realisasi
│   │   └── spasial/         # Komponen & logika WebGIS
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities & helpers
│   ├── routes/              # Halaman aplikasi (React Router v7)
│   │   ├── dashboard/       # Dashboard utama
│   │   ├── monitoring/      # Monitoring infrastruktur & realisasi
│   │   ├── usulan-desa/     # Manajemen usulan desa
│   │   ├── master/          # Master data & konfigurasi
│   │   ├── manage/          # Manajemen tipe infrastruktur
│   │   ├── planning/        # Ploting anggaran
│   │   └── settings/        # Pengaturan akun & sistem
│   ├── services/            # API service layer
│   └── utils/               # Fungsi utilitas umum
├── public/                  # Aset statis
├── .env.example             # Contoh konfigurasi environment
├── react-router.config.ts   # Konfigurasi React Router
├── vite.config.ts           # Konfigurasi Vite
└── package.json
```

---

## 🌐 Deployment

Aplikasi ini dapat di-deploy ke:
- **VPS / Server Bare Metal** menggunakan Docker atau PM2
- **Netlify** (konfigurasi `netlify.toml` sudah tersedia)
- **Nginx** sebagai reverse proxy di depan server Node.js produksi

---

## 📄 Lisensi

Sistem ini dikembangkan untuk keperluan internal **Bappeda Kabupaten Bojonegoro**. Tidak untuk disebarluaskan tanpa izin.

---

*Dibuat untuk mendukung transparansi, akuntabilitas, dan efisiensi pembangunan infrastruktur desa di Kabupaten Bojonegoro melalui mekanisme BKK.*
