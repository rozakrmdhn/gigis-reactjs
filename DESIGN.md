# DESIGN.md — MELAROSA WebGIS Design System

> Panduan desain ini adalah **sumber kebenaran** untuk semua pekerjaan UI/UX pada sistem MELAROSA.
> Baca file ini sebelum menghasilkan atau memodifikasi antarmuka apapun.
> Gunakan bersama `ANTISLOP.md` sebagai filter.

---

## Design Read (Dial)

> **Reading this as:** Sistem informasi pemerintahan (WebGIS) untuk operator & admin Bappeda Kabupaten Bojonegoro, dalam bahasa visual **clean-government-grade dengan aksen kartografi**. Dial **ENERGY 2 / RHYTHM 2 / MOTION 1**.

| Dial | Nilai | Alasan |
|---|---|---|
| **ENERGY** | 2 (Balanced) | Sistem pemerintahan: harus profesional dan terpercaya, bukan steril. Ada identitas kuat lewat warna dan logo, tapi tidak berlebihan |
| **RHYTHM** | 2 (Consistent with breaks) | Sebagian besar halaman uniform (tabel, form, rekap), namun halaman peta dan dashboard boleh memiliki komposisi yang lebih bebas |
| **MOTION** | 1 (Hover states only) | Pengguna utama adalah operator lapangan dan admin — kecepatan & kejelasan lebih penting dari animasi cinematic |

---

## 1. Brand Identity

### Nama & Tagline
- **Nama Sistem**: MELAROSA
- **Kepanjangan**: Monitoring Layanan dan Realisasi Infrastruktur Berbasis Spasial
- **Tagline Utama**: *Sistem Informasi Geospasial Terpadu Kabupaten Bojonegoro*
- **Sub-label**: *Panel Spasial / GIS MELAROSA* (di sidebar/header)
- **Afiliasi**: Bappeda Kabupaten Bojonegoro
- **Konteks Domain**: Monitoring & verifikasi spasial infrastruktur daerah (jalan poros desa, jembatan, drainase, TPT, jalan lingkungan, & BKK APBD)

### Karakter Brand
MELAROSA adalah alat kerja pemerintahan, bukan produk konsumer. Karakter desainnya:

- **Terpercaya**: Data spasial harus terasa akurat, presisi, dan dapat diverifikasi
- **Profesional namun hangat**: Bukan kaku seperti portal lama, tapi juga bukan flashy startup
- **Spasial/Kartografis**: Ada DNA peta di dalamnya — warna biru geografi, emerald untuk data aktif, amber untuk status perhatian
- **Ringan & Cepat**: Pengguna sering di lapangan dengan koneksi lambat; setiap layer UI harus ringan

### Motif Identitas
Elemen visual yang diulang untuk memberi karakter khas MELAROSA:
1. **Ikon jaringan topologi** (`IconTopologyComplex`) sebagai logo mark — mewakili koneksi spasial infrastruktur
2. **Gradien Blue-to-Emerald** pada logo mark (`from-blue-600 via-blue-500 to-emerald-500`) — bumi + vegetasi, warna kartografi
3. **Dot grid ultra-tipis** sebagai background pattern (`opacity-[0.015]` - `[0.04]`) di halaman auth/landing — referensi kertas grafik GIS
4. **Marker pulse** (ripple animasi) pada titik GPS di peta — satu-satunya animasi "hidup" di UI

---

## 2. Color Palette

### Core Colors

| Token | Light (oklch) | Dark (oklch) | Hex Ekuivalen | Kegunaan |
|---|---|---|---|---|
| `--background` | `oklch(1 0 0)` | `oklch(0.129 0.042 264)` | `#fff` / `#0f172a` | Background utama halaman |
| `--foreground` | `oklch(0.129 0.042 264)` | `oklch(0.984 0.003 247)` | `#1e293b` / `#f8fafc` | Teks utama |
| `--card` | `oklch(1 0 0)` | `oklch(0.208 0.042 265)` | `#fff` / `#1e293b` | Card & surface |
| `--primary` | `oklch(0.208 0.042 265)` | `oklch(0.929 0.013 255)` | `#1e293b` / `#cbd5e1` | Tombol primary, brand utama |
| `--muted` | `oklch(0.968 0.007 247)` | `oklch(0.279 0.041 260)` | `#f1f5f9` / `#334155` | Background ringan, row hover |
| `--border` | `oklch(0.929 0.013 255)` | `oklch(1 0 0 / 10%)` | `#e2e8f0` / `rgba(255,255,255,0.1)` | Semua border |

### Accent Colors (Non-Token, digunakan langsung)

Maksimum **1 aksen dominan + 2 aksen pendukung** per halaman.

| Warna | Tailwind | Hex | Kegunaan |
|---|---|---|---|
| **Biru GIS** (aksen utama) | `blue-500` / `blue-600` | `#3b82f6` / `#2563eb` | Logo, tombol aktif, link, fokus ring, marker peta |
| **Indigo** (aksen logo) | `indigo-600` | `#4f46e5` | Gradien logo mark, ikon auth |
| **Emerald** (status aktif/selesai) | `emerald-500` / `emerald-400` | `#10b981` / `#34d399` | Status selesai, marker GPS start, indikator positif |
| **Amber** (perhatian/pending) | `amber-500` / `amber-400` | `#f59e0b` / `#fbbf24` | Status pending, warning, chart-4 |
| **Violet** (analisis/laporan) | `violet-500` / `violet-400` | `#8b5cf6` / `#a78bfa` | Modul analisis, chart sekunder |
| **Rose/Red** (destruktif/error) | `rose-500` / `red-400` | `#ef4444` | Status ditolak, error, marker GPS end, destructive action |

### Chart Colors

Digunakan secara berurutan untuk legenda peta dan grafik:

1. `chart-1` = Amber/Orange — kondisi rusak berat / nilai kritis
2. `chart-2` = Teal/Cyan — kondisi sedang
3. `chart-3` = Navy — kondisi baik
4. `chart-4` = Kuning — kondisi rusak ringan
5. `chart-5` = Gold — data historis

### Aturan Palette

- Maksimum **2 aksen per halaman yang terlihat bersamaan** (biru + satu lainnya)
- Gradien hanya untuk **logo mark** dan **hero panel login/register** (punya alasan identitas)
- Tidak menggunakan gradien blue-to-purple sebagai background penuh halaman
- Latar halaman utama: selalu `bg-white dark:bg-slate-950`
- Sidebar: `bg-white/95 dark:bg-slate-950/95 backdrop-blur-md` — semi-transparan melayang

---

## 3. Typography

### Typeface

| Font | Kelas | Alasan |
|---|---|---|
| **Inter** | `font-sans` (global) | Font pemerintahan modern: sangat readable di ukuran kecil, ideal untuk tabel data dan label koordinat |

### Skala Typography

| Elemen | Kelas | Keterangan |
|---|---|---|
| Hero heading (login/auth) | `text-4xl xl:text-5xl font-black tracking-tight` | Hanya halaman splash/auth |
| Page title (h1) | `text-xl font-bold tracking-tight` | 1 per halaman |
| Section heading (h2) | `text-base font-semibold` | Header card atau section |
| Label uppercase | `text-[10px] font-bold tracking-[0.2em] uppercase` | Badge status, afiliasi instansi |
| Body text | `text-sm font-medium` | Konten utama |
| Caption / meta | `text-xs text-muted-foreground` | Timestamp, koordinat, footnote |
| Tiny label | `text-[10px]` | Label peta, legend, badge sekunder |

### Aturan Typography

- Single accent color pada headline (teks putih/gelap + 1 kata aksen `text-blue-400` / `text-blue-600`), tidak ada gradien teks multi-warna pada headline
- Tidak ada heading uppercase dengan `tracking-[0.3em]` kecuali untuk label instansi (badge)
- Tidak ada font monospace kecuali untuk menampilkan koordinat GPS (`font-mono text-xs`)
- `font-black` (900) hanya untuk brand mark dan hero headline
- Gunakan `tracking-tight` untuk semua heading, `tracking-widest` hanya untuk badge instansi

---

## 4. Spacing & Layout

### Grid System

| Konteks | Layout |
|---|---|
| Dashboard (sidebar + konten) | `flex` sidebar 16rem + konten fluid |
| Form halaman auth | Split screen desktop 55%/45%, card `max-w-sm` (login) / `max-w-md` (register) |
| Halaman peta | Full-screen `w-screen h-screen`, floating overlays |
| Tabel data | Full-width dengan horizontal scroll di mobile |
| Card grid statistik | `grid-cols-2 md:grid-cols-4 gap-4` |

### Radius

| Level | Nilai | Digunakan Pada |
|---|---|---|
| Global | `--radius: 0.625rem` (10px) | Default semua komponen |
| Logo mark | `rounded-xl` (12px) | Icon brand di sidebar/auth |
| Floating sidebar card | `rounded-2xl` (16px) | Sidebar drawer melayang di `/map-view` |
| Auth Card | `rounded-2xl` (16px) | Card login & register |
| Input | `rounded-xl` | Form input di halaman auth |
| Badge status | `rounded-full` atau `rounded-md` | Status workflow (pending, selesai) |
| Tombol | `rounded-xl` / `rounded-lg` | Semua tombol aksi |

---

## 5. Komponen & Pola UI

### Sidebar WebGIS (`/map-view`)

- **Header Terpadu Ringkas**: Menggabungkan brand icon (`IconTopologyComplex`), judul `"Panel Kontrol Spasial"`, dan Tab Switcher (`[Katalog] [Layer] [Filter]`) dalam satu container terpadu tanpa tumpukan header bertingkat.
- **Kartu Melayang (*Floating Card*)**: Sidebar diposisikan melayang di `top-16 left-3 bottom-3 h-[calc(100vh-76px)]` dengan sudut `rounded-2xl` dan bayangan `shadow-xl`.
- **Perilaku Disembunyikan**: Saat ditutup (`!isOpen`), sidebar meluncur keluar secara penuh dengan `-translate-x-[calc(100%+24px)] opacity-0 pointer-events-none` sehingga kanvas peta 100% bebas dari sisa visual. Pegangan pembuka samping (`ChevronRight`) hadir sebagai pill melayang yang rapi di pinggir kiri layar.

### Legenda Peta (`MapLegend`)

- **Posisi Standard**: Terletak di sudut **Bawah Kiri** (`bottom-6 left-4` saat sidebar tertutup, `bottom-6 left-[356px]` saat sidebar terbuka).
- **Default State**: `defaultMinimized={true}` agar kanvas peta utama tetap bersih saat pertama kali dibuka.
- **Desain Swatch**:
  - Menggunakan tipografi `text-xs font-bold` dan label `text-xs font-semibold`.
  - Swatch garis solid, putus-putus (*dashed line*), dan polygon terisi tanpa efek neon glow buatan.
  - Saat diciutkan, beralih menjadi pill ringkas `"Legenda Peta"` dengan badge angka total layer aktif.

### Halaman Auth (`/login` & `/register`)

- **Split Screen**: Desktop 55% hero panel / 45% form panel.
- **Hero Panel**: Background `bg-slate-950` dengan motif dot grid GIS `opacity-[0.04]`, logo mark resmi `IconTopologyComplex` dalam container `from-blue-600 via-blue-500 to-emerald-500`, dan daftar fitur utama.
- **Primary CTA Button**: Menggunakan solid `bg-blue-600 hover:bg-blue-700` dengan label spesifik: **`Masuk ke MELAROSA`** (login) atau **`Kirim Pengajuan Registrasi`** (register).

---

## 6. Ikon

Gunakan dari **Tabler Icons** (`@tabler/icons-react`) sebagai library utama, dengan fallback ke **Lucide React** untuk ikon yang tidak tersedia di Tabler.

| Konteks | Ikon | Alasan |
|---|---|---|
| Logo/Brand | `IconTopologyComplex` | Representasi jaringan infrastruktur spasial |
| Peta / Spasial | `IconMap2` / `IconMap` | Modul peta & GIS |
| Auth Header | `IconShield` / `IconUserPlus` | Header card login & register |
| Dashboard | `IconDashboard` | Navigasi dashboard |
| Monitoring | `IconActivity` | Monitoring & rekap |
| Master Data | `IconDatabase` | Katalog dataset |
| Lokasi GPS | `MapPin` (Lucide) | Titik koordinat di form |

---

## 7. Copywriting

### Voice & Tone
- **Bahasa**: Indonesia formal namun profesional
- **Persona**: Alat kerja terpadu untuk pegawai Bappeda, Operator Kecamatan, dan Operator Desa
- **Gunakan**: Teks spesifik tupoksi ("verifikasi", "realisasi fisik", "koordinat GPS", "pemetaan spasial", "rekapitulasi realisasi")

### Label & CTA

| Konteks | Teks yang Benar |
|---|---|
| Login CTA | "Masuk ke MELAROSA" |
| Register CTA | "Kirim Pengajuan Registrasi" |
| Verifikasi CTA | "Verifikasi Kegiatan" |
| Map View Navigation | "Peta Spasial" |

---

*File ini adalah dokumen hidup. Perbarui setiap kali ada keputusan desain baru yang disepakati.*
