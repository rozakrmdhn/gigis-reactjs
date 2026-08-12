# Issue: Optimasi UI/UX & Fitur Halaman Rekap Jalan Poros Desa

**Halaman:** `/admin/monitoring/rekap-jalan`  
**Prioritas:** Medium  
**Jenis:** Enhancement + Bug Fix  
**Estimasi:** 1–2 hari kerja  

---

## Latar Belakang

Halaman Rekap Jalan Poros Desa menampilkan rekapitulasi progres pembangunan jalan secara hierarkis (Desa → Ruas → Segmen). Saat ini halaman sudah berfungsi dasar, namun masih terdapat beberapa area yang perlu dioptimasi dari sisi UI/UX, kelengkapan data filter, dan tampilan total panjang ruas jalan.

---

## Cakupan Pekerjaan

### 1. Optimasi Layout UI/UX Halaman
### 2. Perbaikan & Penambahan Opsi Filter Sumber Dana
### 3. Tampilkan Total Panjang Semua Ruas Jalan di Summary Card

---

## Bagian 1 – Optimasi Layout UI/UX Halaman

### Tujuan
Membuat halaman terasa lebih modern, informatif, dan mudah digunakan oleh pengguna akhir (staf Dinas PU / monitoring).

### Daftar Perbaikan UI/UX

#### 1.1 Summary Cards (Kartu Ringkasan)

File: `app/routes/monitoring/rekap-jalan/index.tsx`

**Kondisi Saat Ini:**
- Terdapat 5 kartu summary: Total Desa, Total Ruas Poros, Panjang Dibangun, Sisa Belum, dan Overall Progress
- Kartu masih polos tanpa visual tambahan

**Target Perbaikan:**
- Tambahkan **Total Panjang Semua Ruas Master** sebagai kartu summary baru (lihat Bagian 3)
- Tambahkan trend mini chip / badge persentase di bawah angka progress
- Tambahkan warna aksen berbeda per kartu (indigo, blue, emerald, amber, rose)
- Pastikan kartu summary tampil dengan ikon yang lebih besar dan konsisten

#### 1.2 Layout Filter Bar

**Kondisi Saat Ini:**
- Filter ditampilkan dalam satu baris horizontal menggunakan `flex-wrap`
- Terasa padat dan kurang terstruktur

**Target Perbaikan:**
- Pisahkan filter menjadi 2 kelompok: **Lokasi** (Kecamatan, Desa) dan **Data** (Tahun, Kondisi, Sumber Dana)
- Tambahkan label grup filter yang jelas
- Tambahkan animasi transisi saat filter aktif/tidak aktif

#### 1.3 Tabel Accordion (Level 1 – Desa)

**Kondisi Saat Ini:**
- Kolom sederhana tanpa visual indicator row aktif
- Tidak ada counter badge untuk desa yang sudah di-expand

**Target Perbaikan:**
- Tambahkan warna row-highlight yang lebih jelas saat accordion terbuka (`ring-1 ring-inset ring-blue-300 dark:ring-blue-800`)
- Tampilkan badge indikator jumlah ruas di kolom "Ruas Poros" dengan warna aksen
- Tambahkan animasi expand/collapse yang smooth menggunakan CSS transition

#### 1.4 Tabel Level 2 (Ruas) dan Level 3 (Segmen)

**Kondisi Saat Ini:**
- Header nested table tidak cukup informatif

**Target Perbaikan:**
- Tambahkan jumlah segmen sebagai badge di kolom header ruas
- Pada Level 3 (Segmen), tampilkan badge kondisi dengan warna yang sesuai:
  - `Baik` → emerald/green
  - `Sedang` → yellow/amber
  - `Rusak Ringan` → orange
  - `Rusak Berat` → red/rose

Contoh implementasi badge kondisi:

```tsx
// Ganti badge kondisi di Level 3 (Segmen table)
// Dari:
<Badge className="bg-blue-500/10 hover:bg-blue-500/10 text-blue-600 ...">
    {seg.kondisi || "Baik"}
</Badge>

// Menjadi:
const kondisiColor = {
    'Baik': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    'Sedang': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    'Rusak Ringan': 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    'Rusak Berat': 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

<Badge className={`${kondisiColor[seg.kondisi] || kondisiColor['Baik']} text-[10px] font-semibold py-0.5 px-1.5 rounded`}>
    {seg.kondisi || "Baik"}
</Badge>
```

#### 1.5 Empty State & Loading State

**Kondisi Saat Ini:**
- Loading spinner sederhana
- Empty state sudah ada tapi tidak kontekstual

**Target Perbaikan:**
- Tambahkan pesan empty state yang lebih kontekstual sesuai filter aktif
- Contoh: *"Tidak ada data untuk Kecamatan Bojonegoro pada Tahun 2025"*

---

## Bagian 2 – Perbaikan Filter Sumber Dana

### Tujuan
Mengganti opsi Sumber Dana yang saat ini tidak standar menjadi opsi yang sesuai dengan data aktual di database.

### 2.1 Kondisi Saat Ini

File: `app/routes/monitoring/rekap-jalan/index.tsx` (sekitar baris 346–360)

```tsx
<SelectItem value="BKKD" className="text-xs">BKKD / BKK</SelectItem>
<SelectItem value="Sektoral" className="text-xs">Sektoral</SelectItem>
<SelectItem value="PBD" className="text-xs">PBD</SelectItem>
<SelectItem value="APBD" className="text-xs">APBD</SelectItem>
<SelectItem value="APBDes" className="text-xs">APBDes</SelectItem>
```

**Masalah:** Nilai filter tidak konsisten dengan nilai yang tersimpan di database. Pengguna memilih filter tapi data tidak ter-filter karena nilai tidak cocok.

### 2.2 Target Opsi Filter Sumber Dana

Ganti opsi filter sumber dana menjadi:

| Nilai (`value`) | Label Tampil |
|---|---|
| `BKK` | BKK (Bantuan Keuangan Kabupaten) |
| `DD` | DD (Dana Desa) |
| `ADD` | ADD (Alokasi Dana Desa) |
| `APBD` | APBD |
| `Lainnya` | Lainnya |

### 2.3 Langkah Implementasi

#### Langkah 1 – Cek Nilai Sumber Dana di Database (Backend)

> ⚠️ **WAJIB DILAKUKAN SEBELUM MENGUBAH FRONTEND.** Verifikasi nilai yang benar-benar ada di database.

Jalankan query berikut di PostgreSQL:

```sql
SELECT DISTINCT sumber_dana, COUNT(*) as jumlah
FROM (
    SELECT sumber_dana FROM infrastruktur_segmen WHERE sumber_dana IS NOT NULL
    UNION ALL
    SELECT sumber_dana FROM infrastruktur_area WHERE sumber_dana IS NOT NULL
) t
GROUP BY sumber_dana
ORDER BY sumber_dana;
```

Catat hasilnya dan sesuaikan nilai `value` pada `<SelectItem>` dengan hasil query.

#### Langkah 2 – Update Frontend Filter

File: `app/routes/monitoring/rekap-jalan/index.tsx`

Temukan blok filter Sumber Dana dan ganti seluruh konten `<SelectContent>`:

```tsx
<SelectContent>
    <SelectItem value="all" className="text-xs">Semua Sumber</SelectItem>
    <SelectItem value="BKK" className="text-xs">BKK</SelectItem>
    <SelectItem value="DD" className="text-xs">DD (Dana Desa)</SelectItem>
    <SelectItem value="ADD" className="text-xs">ADD</SelectItem>
    <SelectItem value="APBD" className="text-xs">APBD</SelectItem>
    <SelectItem value="Lainnya" className="text-xs">Lainnya</SelectItem>
</SelectContent>
```

> ⚠️ **Penting:** Nilai `value` harus cocok persis (case-sensitive) dengan nilai di kolom `sumber_dana` di tabel database `infrastruktur_segmen` dan `infrastruktur_area`. Jika tidak cocok, filter akan aktif tapi hasil selalu kosong.

#### Langkah 3 – Verifikasi Filter Bekerja

Setelah deploy, uji filter dengan:
1. Pilih `Sumber Dana = BKK` → pastikan hanya desa/ruas dengan sumber dana "BKK" yang tampil
2. Kombinasikan dengan filter Tahun dan Kondisi → pastikan hasilnya konsisten
3. Klik Reset → pastikan semua filter kembali ke "Semua"

---

## Bagian 3 – Tampilkan Total Panjang Semua Ruas di Summary Card

### Tujuan
Menampilkan total panjang keseluruhan ruas master (dari tabel `jalan_porosdesa`) sebagai indikator kapasitas jalan yang perlu dibangun.

### 3.1 Analisa Backend

#### Data yang Tersedia

Endpoint `GET /v1/rekap/desa` sudah mengembalikan field `total_panjang` per desa:

```json
{
  "id_desa": 1,
  "nama_desa": "Sumber Agung",
  "kecamatan": "Bojonegoro",
  "jumlah_ruas": 5,
  "total_panjang": 12500,
  "panjang_dibangun": 8000,
  "panjang_belum": 4500,
  "progress": 64.00,
  "jumlah_segmen": 12
}
```

> ✅ **Tidak ada perubahan backend yang diperlukan.** Data sudah tersedia, hanya perlu dijumlahkan di frontend.

### 3.2 Implementasi Frontend

#### Langkah 1 – Tambahkan field `totalPanjangMaster` pada `summaryStats`

File: `app/routes/monitoring/rekap-jalan/index.tsx`

Temukan `useMemo` untuk `summaryStats` (sekitar baris 215) dan tambahkan field baru:

```tsx
const summaryStats = React.useMemo(() => {
    return filteredRekapDesa.reduce((acc, curr) => {
        acc.totalDesa += 1;
        acc.totalRuas += curr.jumlah_ruas;
        acc.totalPanjangMaster += curr.total_panjang;   // ← TAMBAHKAN BARIS INI
        acc.panjangJalan += curr.total_panjang;
        acc.panjangDibangun += curr.panjang_dibangun;
        acc.panjangBelum += curr.panjang_belum;
        return acc;
    }, {
        totalDesa: 0,
        totalRuas: 0,
        totalPanjangMaster: 0,    // ← TAMBAHKAN INITIAL VALUE
        panjangJalan: 0,
        panjangDibangun: 0,
        panjangBelum: 0
    });
}, [filteredRekapDesa]);
```

#### Langkah 2 – Tambahkan Kartu Summary Baru

Tambahkan kartu baru di antara kartu "Total Ruas Poros" dan "Panjang Dibangun":

```tsx
<Card className="rounded-2xl border dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
    <CardHeader className="px-4 pt-3 pb-1">
        <CardTitle className="text-xs uppercase font-semibold text-slate-400 dark:text-slate-500 flex items-center justify-between">
            Total Panjang Ruas
            <Ruler className="w-4 h-4 text-sky-500" />
        </CardTitle>
    </CardHeader>
    <CardContent className="px-4 pb-3 pt-0">
        <div className="text-2xl font-semibold text-slate-850 dark:text-white mt-1">
            {formatKilometer(summaryStats.totalPanjangMaster)}
        </div>
        <p className="text-[10px] text-slate-400 mt-1 font-medium">Total panjang ruas master</p>
    </CardContent>
</Card>
```

#### Langkah 3 – Update Grid Layout Kartu

Karena jumlah kartu bertambah dari 5 menjadi 6, sesuaikan kelas grid:

```tsx
// Sebelum:
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">

// Sesudah:
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-4">
```

---

## Urutan Implementasi yang Disarankan

```
Langkah 1  (5 menit)   → Cek query DB untuk nilai sumber_dana yang valid
Langkah 2  (10 menit)  → Update opsi filter Sumber Dana di frontend
Langkah 3  (5 menit)   → Tambahkan field totalPanjangMaster pada summaryStats
Langkah 4  (10 menit)  → Tambahkan kartu "Total Panjang Ruas" + update grid layout
Langkah 5  (30 menit)  → Perbaikan UI/UX: badge kondisi, row highlight accordion, empty state kontekstual
Langkah 6  (20 menit)  → Testing manual end-to-end untuk semua filter dan kombinasi
```

---

## File yang Perlu Dimodifikasi

| File | Lokasi | Perubahan |
|---|---|---|
| `app/routes/monitoring/rekap-jalan/index.tsx` | Frontend | Filter sumber dana, summaryStats, kartu baru, UI polish |

> ✅ Tidak ada perubahan backend yang diperlukan untuk semua fitur di issue ini.

---

## Testing Checklist

- [ ] Filter Sumber Dana: BKK, DD, ADD, APBD, Lainnya bekerja dengan benar
- [ ] Filter dapat dikombinasikan (Tahun + Sumber Dana + Kondisi)
- [ ] Klik Reset mengembalikan semua filter ke kondisi awal
- [ ] Kartu "Total Panjang Ruas" menampilkan angka yang benar
- [ ] Angka "Total Panjang Ruas" berubah mengikuti filter Kecamatan/Desa yang aktif
- [ ] Grid kartu summary tidak overflow di layar tablet/mobile
- [ ] Badge kondisi segmen berwarna sesuai (Baik=hijau, Sedang=kuning, Rusak Ringan=oranye, Rusak Berat=merah)
- [ ] Halaman tetap responsive di layar tablet dan mobile

---

## Referensi File

- **Frontend Page:** `app/routes/monitoring/rekap-jalan/index.tsx`
- **Service Layer:** `app/services/rekap.service.ts`
- **Backend Handler:** `gigis-bappedabjn/src/modules/rekap-analisis/rekap_analisis.handler.js`
- **Backend Routes:** `gigis-bappedabjn/src/modules/rekap-analisis/rekap_analisis.routes.js`
- **REST Docs:** `gigis-bappedabjn/src/modules/rekap-analisis/docs/rekap-jalan.rest`
