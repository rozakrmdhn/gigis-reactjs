# Issue: UI/UX Cetak Berita Acara & Peningkatan Panel Infrastruktur

**Halaman Target:** `/admin/monitoring/realisasi-infrastruktur`
**File Utama:**
- `app/features/monitoring/components/InfrastrukturPanel.tsx`
- `app/routes/monitoring/realisasi-infrastruktur/index.tsx`

**Prioritas:** High
**Label:** `enhancement`, `frontend`, `ux`

---

## Ringkasan

Issue ini mencakup dua peningkatan besar pada halaman `/admin/monitoring/realisasi-infrastruktur`:

1. **Fitur Cetak Berita Acara** — UI/UX yang lebih baik: pengguna memilih Tahun Anggaran terlebih dahulu, lalu mencetak Berita Acara. Posisi UI dipindahkan ke tempat yang lebih ideal dan intuitif.
2. **Panel Infrastruktur** — Fokus pada peningkatan filter pencarian: pencarian lokasi teks, koordinat (single & multi), dan tampilan daftar segmen yang lebih informatif.

---

## Kondisi Saat Ini (Sebelum Perubahan)

### Fitur Cetak Berita Acara (existing)

Tombol "Cetak Berita Acara" saat ini berada di dalam daftar segmen
(`InfrastrukturPanel.tsx`, sekitar baris 773-784):

```tsx
// KONDISI SAAT INI — di dalam blok daftar segmen
{realisasiList.length > 0 && (
    <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-2 mx-1">
        <Label className="text-[10px] font-bold ...">Cetak Berita Acara</Label>
        <Button
            onClick={() => onPrintBeritaAcara(selectedDesa, selectedTahunFilter)}
            disabled={selectedTahunFilter === "Semua"}
        >
            <Printer className="size-3.5" />
            {selectedTahunFilter === "Semua"
                ? "Pilih Tahun di Atas untuk Cetak"
                : `Cetak Berita Acara TA ${selectedTahunFilter}`}
        </Button>
    </div>
)}
```

**Masalah:**
- UI tersembunyi di dalam daftar, tidak menonjol.
- Tombol disabled jika filter "Semua" dipilih — tidak ada guidance yang jelas bagi pengguna.
- Tidak ada pilihan tahun yang dedicated untuk cetak (berbagi dengan filter peta).
- Tidak ada feedback visual (loading state, success/error).

### Panel Infrastruktur (existing)

Panel saat ini memiliki:
- Pencarian lokasi/alamat via Nominatim (teks) — sudah berfungsi
- Pencarian koordinat (single & multi, Desimal/DMS) — sudah diimplementasikan via issue sebelumnya
- Filter kecamatan & desa
- Filter tahun anggaran
- Daftar segmen

**Yang perlu diperbaiki/ditambahkan:**
- Tampilan daftar segmen bisa lebih informatif dengan highlight berdasarkan filter tahun aktif.
- Tidak ada indikator visual jumlah segmen yang sedang difilter vs total.
- UI Cetak Berita Acara perlu direlokasi dan didesain ulang.

---

## Fitur yang Akan Diimplementasikan

### Fitur 1: UI/UX Cetak Berita Acara — Redesign

#### Deskripsi
Buat UI cetak Berita Acara yang berdiri sendiri, terpisah dari daftar segmen, dengan alur yang jelas:
1. Pengguna memilih **Tahun Anggaran** (dropdown dedicated).
2. Pengguna klik tombol **Cetak**.
3. Sistem memanggil `onPrintBeritaAcara(desaId, tahun)`.

#### Posisi Ideal UI

Letakkan bagian "Cetak Berita Acara" sebagai **section sticky di bagian bawah panel**
(setelah daftar segmen, sebelum tombol "Mulai Digitasi").

```
┌─────────────────────────────────┐
│  [Panel Filter Pencarian]       │  <- Existing (search, kec/desa, tahun filter)
├─────────────────────────────────┤
│  [Daftar Segmen]                │  <- Scrollable area
│  • Segmen A                     │
│  • Segmen B                     │
│  ...                            │
├─────────────────────────────────┤
│  ┌─────────────────────────┐    │
│  │  Printer  CETAK BA      │    │  <- NEW: Section baru di sticky bottom
│  │  Tahun: [2024    ▼]     │    │
│  │  [Cetak Sekarang  🖨️]   │    │
│  └─────────────────────────┘    │
│  [Mulai Digitasi Segmen Baru]   │  <- Existing button (tidak diubah)
└─────────────────────────────────┘
```

#### Desain UI Component (kode lengkap)

Letakkan di dalam blok `{!isFormOpen && ...}` di bagian sticky bottom
(setelah `</div>` daftar segmen, sebelum tombol digitasi):

```tsx
{/* Cetak Berita Acara Section — hanya tampil jika desa sudah dipilih dan ada data */}
{!isFormOpen && selectedDesa && realisasiList.length > 0 && (
    <div className="pb-2">
        <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 dark:bg-violet-500/10 p-3 space-y-2">
            {/* Header Row */}
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                    <Printer className="size-3.5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                    <p className="text-[10px] font-extrabold text-foreground leading-tight">
                        Cetak Berita Acara
                    </p>
                    <p className="text-[9px] text-muted-foreground leading-tight">
                        Pilih tahun anggaran lalu cetak
                    </p>
                </div>
            </div>

            {/* Select Tahun + Button Cetak */}
            <div className="flex gap-1.5 items-center">
                <Select
                    value={printYear}
                    onValueChange={setPrintYear}
                    disabled={isPrinting}
                >
                    <SelectTrigger className="h-8 text-[11px] font-semibold bg-background border-violet-500/30 hover:border-violet-500/60 rounded-lg flex-1 transition-colors">
                        <SelectValue placeholder="Pilih Tahun..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                        {uniqueYears.map(y => (
                            <SelectItem key={y} value={y} className="text-xs font-medium cursor-pointer">
                                TA {y}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button
                    type="button"
                    onClick={async () => {
                        if (!printYear) {
                            toast.warning("Pilih tahun anggaran terlebih dahulu.");
                            return;
                        }
                        setIsPrinting(true);
                        try {
                            await onPrintBeritaAcara(selectedDesa, printYear);
                        } finally {
                            setIsPrinting(false);
                        }
                    }}
                    disabled={!printYear || isPrinting}
                    className="h-8 px-3 text-[11px] font-bold bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white rounded-lg flex items-center gap-1.5 shrink-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    {isPrinting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                        <Printer className="size-3.5" />
                    )}
                    <span>{isPrinting ? "Memproses..." : "Cetak"}</span>
                </Button>
            </div>
        </div>
    </div>
)}
```

#### State Baru yang Dibutuhkan

Di dalam komponen `InfrastrukturPanel`, tambahkan state berikut
(CATATAN: `printYear` sudah ada di baris 243, jangan duplikat):

```tsx
// State untuk loading saat cetak (tambahkan setelah parsedCoordCount ~baris 253)
const [isPrinting, setIsPrinting] = React.useState(false);
```

#### Update TypeScript Interface (jika perlu)

Jika `onPrintBeritaAcara` belum mendukung async, update di baris ~138:

```typescript
// Di InfrastrukturPanelProps
onPrintBeritaAcara: (desaId: string, tahun: string) => Promise<void> | void;
```

---

### Fitur 2: Panel Infrastruktur — Peningkatan Filter & Daftar Segmen

#### 2A. Badge Filter Aktif di Header Daftar Segmen

Tampilkan badge yang menunjukkan tahun anggaran yang sedang aktif sebagai filter.

**Target baris ~763–771:**

```tsx
// SEBELUM:
<span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
    Daftar Segmen
</span>

// SESUDAH:
<div className="flex items-center gap-1.5 flex-wrap">
    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
        Daftar Segmen
    </span>
    {selectedTahunFilter !== "Semua" && (
        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-wide">
            TA {selectedTahunFilter}
        </span>
    )}
</div>
```

#### 2B. Input Filter Nama Segmen

Tambahkan input pencarian kecil di atas daftar untuk memfilter berdasarkan nama jalan.

**State baru di komponen:**

```tsx
// Tambahkan setelah state isPrinting
const [segmenSearch, setSegmenSearch] = React.useState("");

// Computed list (tambahkan setelah uniqueYears ~baris 313)
const filteredRealisasiList = React.useMemo(() => {
    if (!segmenSearch.trim()) return realisasiList;
    return realisasiList.filter(r =>
        r.nama_jalan.toLowerCase().includes(segmenSearch.toLowerCase())
    );
}, [realisasiList, segmenSearch]);
```

**UI input (tambahkan setelah header "Daftar Segmen", sebelum map realisasiList):**

```tsx
{/* Filter nama segmen — tampil hanya jika ada lebih dari 3 segmen */}
{realisasiList.length > 3 && (
    <div className="relative mx-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
        <Input
            type="text"
            placeholder="Filter nama jalan..."
            value={segmenSearch}
            onChange={(e) => setSegmenSearch(e.target.value)}
            className="h-7 pl-7 pr-2 text-[11px] rounded-lg bg-background border-input focus-visible:ring-1"
        />
    </div>
)}

{/* Empty state saat filter tidak menemukan hasil */}
{filteredRealisasiList.length === 0 && segmenSearch && (
    <div className="text-center py-6 text-slate-400 text-xs">
        <Search className="size-6 mx-auto mb-2 opacity-40" />
        <p>Tidak ada segmen dengan nama "<strong>{segmenSearch}</strong>"</p>
    </div>
)}
```

> **Penting:** Ganti `realisasiList.map(...)` di template render menjadi `filteredRealisasiList.map(...)`
> tapi `realisasiList.length` untuk logika tampil/sembunyi tetap pakai yang asli.

#### 2C. Border Kiri Kondisi Warna pada Card Segmen

Tambahkan indikator visual berupa border kiri berwarna berdasarkan kondisi jalan di setiap card.

**Target baris ~795–797 (className pada div card segmen):**

```tsx
// SEBELUM:
className="group p-2.5 border border-border/80 rounded-xl bg-card hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all duration-200 relative"

// SESUDAH:
className={cn(
    "group p-2.5 border border-border/80 rounded-xl bg-card hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all duration-200 relative",
    r.kondisi === "BAIK" && "border-l-[3px] border-l-emerald-500",
    r.kondisi === "SEDANG" && "border-l-[3px] border-l-sky-500",
    r.kondisi === "RUSAK_RINGAN" && "border-l-[3px] border-l-amber-500",
    r.kondisi === "RUSAK_BERAT" && "border-l-[3px] border-l-rose-500",
)}
```

---

## Referensi File yang Perlu Dimodifikasi

### File Utama

**`app/features/monitoring/components/InfrastrukturPanel.tsx`**

| Bagian | Baris Saat Ini | Aksi |
|--------|----------------|------|
| Interface `onPrintBeritaAcara` | ~138 | Update type jadi `Promise<void> \| void` |
| State `printYear` | ~243 | Sudah ada, JANGAN duplikat |
| Tambah `isPrinting` state | Setelah ~253 | TAMBAH state baru |
| Tambah `segmenSearch` state | Setelah ~253 | TAMBAH state baru |
| Tambah `filteredRealisasiList` | Setelah ~313 | TAMBAH computed value |
| Section "Cetak Berita Acara" lama | ~773–784 | HAPUS dari sini |
| Header "Daftar Segmen" | ~763–771 | UPDATE dengan badge filter |
| Input filter segmen | Setelah header | TAMBAH input baru |
| Card segmen `className` | ~795–797 | UPDATE dengan border kondisi |
| Render `.map(...)` segmen | ~793 | Ganti ke `filteredRealisasiList.map(...)` |
| Sticky bottom — Cetak BA baru | Sebelum ~944 | TAMBAH section baru |

**`app/routes/monitoring/realisasi-infrastruktur/index.tsx`**

| Bagian | Aksi |
|--------|------|
| `handlePrintBeritaAcara` handler | Pastikan sudah ada dan dipassing ke `<InfrastrukturPanel>` |
| Prop `onPrintBeritaAcara` di JSX | Verifikasi dipassing dengan benar |

---

## Tahapan Implementasi

> **Catatan untuk Junior Programmer / AI Model:**
> Ikuti tahapan di bawah secara **berurutan**. Jangan skip tahapan.
> Baca kode yang direferensikan terlebih dahulu sebelum melakukan perubahan apapun.

---

### Tahap 1: Baca dan Pahami Kode yang Ada

**Tujuan:** Memahami struktur kode agar tidak merusak yang sudah berfungsi.

Buka file `app/features/monitoring/components/InfrastrukturPanel.tsx` dan baca:

| Baris | Apa yang dibaca |
|-------|-----------------|
| 75–148 | Semua `props` yang diterima komponen (`InfrastrukturPanelProps`) |
| 239–322 | Semua `state` dan computed value yang ada |
| 760–910 | Struktur daftar segmen & tombol cetak yang lama |
| 911–954 | Struktur `sticky bottom bar` yang ada |

**Checklist Tahap 1:**
- [ ] Pahami props: `selectedDesa`, `onPrintBeritaAcara`, `selectedTahunFilter`, `realisasiList`, `isFormOpen`
- [ ] Pahami state yang ada: `printYear` (baris 243), `kecOpen`, `desaOpen`, dll
- [ ] Pahami kondisi render: kapan `isFormOpen` true/false dan effect-nya ke UI

---

### Tahap 2: Hapus Tombol Cetak Lama dari Lokasi Lama

**File:** `app/features/monitoring/components/InfrastrukturPanel.tsx`
**Cari dengan:** Teks `Cetak Berita Acara` (sekitar baris 775)

Hapus **seluruh blok** berikut:

```tsx
// HAPUS SELURUH BLOK INI (sekitar baris 773-784):
{realisasiList.length > 0 && (
    <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-2 mx-1">
        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Cetak Berita Acara
        </Label>
        <Button
            onClick={() => onPrintBeritaAcara(selectedDesa, selectedTahunFilter)}
            className="w-full h-8 text-[11px] font-bold bg-violet-600 ..."
            disabled={selectedTahunFilter === "Semua"}
        >
            <Printer className="size-3.5" />
            <span>...</span>
        </Button>
    </div>
)}
```

**Verifikasi:** Pastikan komponen masih bisa di-build setelah penghapusan.

---

### Tahap 3: Tambahkan State dan Computed Value Baru

**File:** `app/features/monitoring/components/InfrastrukturPanel.tsx`

**Lokasi:** Di dalam komponen, **setelah baris 253** (setelah `parsedCoordCount`)

Tambahkan 2 state baru:

```tsx
// State loading saat cetak Berita Acara
const [isPrinting, setIsPrinting] = React.useState(false);

// State untuk filter teks nama segmen
const [segmenSearch, setSegmenSearch] = React.useState("");
```

**Lokasi:** Setelah `uniqueYears` (sekitar baris 313–321)

Tambahkan computed value:

```tsx
// Filtered list berdasarkan teks pencarian nama jalan
const filteredRealisasiList = React.useMemo(() => {
    if (!segmenSearch.trim()) return realisasiList;
    return realisasiList.filter(r =>
        r.nama_jalan.toLowerCase().includes(segmenSearch.toLowerCase())
    );
}, [realisasiList, segmenSearch]);
```

---

### Tahap 4: Tambahkan UI Cetak Berita Acara di Posisi Baru (Sticky Bottom)

**File:** `app/features/monitoring/components/InfrastrukturPanel.tsx`
**Lokasi:** Di dalam blok else (`!isFormOpen`) pada sticky bottom bar, sekitar baris 943–944
          SEBELUM tombol "Mulai Digitasi Segmen Baru"

Sisipkan kode berikut tepat sebelum `<Button onClick={() => { setIsFormOpen(true); startDraw(); }} ...>`:

```tsx
{/* Cetak Berita Acara — tampil jika desa dipilih dan ada data */}
{selectedDesa && realisasiList.length > 0 && (
    <div className="pb-2">
        <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 dark:bg-violet-500/10 p-3 space-y-2">
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                    <Printer className="size-3.5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                    <p className="text-[10px] font-extrabold text-foreground leading-tight">
                        Cetak Berita Acara
                    </p>
                    <p className="text-[9px] text-muted-foreground leading-tight">
                        Pilih tahun anggaran lalu cetak
                    </p>
                </div>
            </div>

            <div className="flex gap-1.5 items-center">
                <Select
                    value={printYear}
                    onValueChange={setPrintYear}
                    disabled={isPrinting}
                >
                    <SelectTrigger className="h-8 text-[11px] font-semibold bg-background border-violet-500/30 hover:border-violet-500/60 rounded-lg flex-1 transition-colors">
                        <SelectValue placeholder="Pilih Tahun..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                        {uniqueYears.map(y => (
                            <SelectItem key={y} value={y} className="text-xs font-medium cursor-pointer">
                                TA {y}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button
                    type="button"
                    onClick={async () => {
                        if (!printYear) {
                            toast.warning("Pilih tahun anggaran terlebih dahulu.");
                            return;
                        }
                        setIsPrinting(true);
                        try {
                            await onPrintBeritaAcara(selectedDesa, printYear);
                        } finally {
                            setIsPrinting(false);
                        }
                    }}
                    disabled={!printYear || isPrinting}
                    className="h-8 px-3 text-[11px] font-bold bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white rounded-lg flex items-center gap-1.5 shrink-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    {isPrinting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                        <Printer className="size-3.5" />
                    )}
                    <span>{isPrinting ? "Memproses..." : "Cetak"}</span>
                </Button>
            </div>
        </div>
    </div>
)}
```

---

### Tahap 5: Update Header Daftar Segmen dengan Badge Filter Aktif

**File:** `app/features/monitoring/components/InfrastrukturPanel.tsx`
**Lokasi:** Sekitar baris 763–764

Cari teks:
```
Daftar Segmen
```

Ganti `<span>` tunggal menjadi `<div>` dengan badge:

```tsx
// SEBELUM:
<span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
    Daftar Segmen
</span>

// SESUDAH:
<div className="flex items-center gap-1.5 flex-wrap">
    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
        Daftar Segmen
    </span>
    {selectedTahunFilter !== "Semua" && (
        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-wide">
            TA {selectedTahunFilter}
        </span>
    )}
</div>
```

---

### Tahap 6: Tambahkan Input Filter Nama Segmen

**File:** `app/features/monitoring/components/InfrastrukturPanel.tsx`
**Lokasi:** Setelah blok header "Daftar Segmen" (~baris 771), sebelum `{realisasiList.length > 0 && ...}`

```tsx
{/* Filter nama segmen — tampil hanya jika ada lebih dari 3 segmen */}
{realisasiList.length > 3 && (
    <div className="relative mx-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
        <Input
            type="text"
            placeholder="Filter nama jalan..."
            value={segmenSearch}
            onChange={(e) => setSegmenSearch(e.target.value)}
            className="h-7 pl-7 pr-2 text-[11px] rounded-lg bg-background border-input focus-visible:ring-1"
        />
    </div>
)}
```

Kemudian ganti seluruh blok `realisasiList.map(r => ...)` di template menjadi
`filteredRealisasiList.map(r => ...)`.

Tambahkan empty state untuk hasil filter kosong, tepat sebelum/sesudah blok map:

```tsx
{filteredRealisasiList.length === 0 && segmenSearch.trim() && (
    <div className="text-center py-6 text-slate-400 text-xs mx-2">
        <Search className="size-6 mx-auto mb-2 opacity-40" />
        <p>Tidak ada segmen dengan nama</p>
        <p className="font-bold mt-0.5">"{segmenSearch}"</p>
    </div>
)}
```

---

### Tahap 7: Tambahkan Border Kiri Kondisi Warna pada Card Segmen

**File:** `app/features/monitoring/components/InfrastrukturPanel.tsx`
**Lokasi:** Sekitar baris 795–797 (deklarasi className pada div card segmen)

Cari className yang berisi `"group p-2.5 border border-border/80 rounded-xl bg-card ..."` dan ganti dengan:

```tsx
className={cn(
    "group p-2.5 border border-border/80 rounded-xl bg-card hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all duration-200 relative",
    r.kondisi === "BAIK"         && "border-l-[3px] border-l-emerald-500",
    r.kondisi === "SEDANG"       && "border-l-[3px] border-l-sky-500",
    r.kondisi === "RUSAK_RINGAN" && "border-l-[3px] border-l-amber-500",
    r.kondisi === "RUSAK_BERAT"  && "border-l-[3px] border-l-rose-500",
)}
```

---

### Tahap 8: Update Handler di Route Parent (Opsional tapi Disarankan)

**File:** `app/routes/monitoring/realisasi-infrastruktur/index.tsx`

Cari fungsi `handlePrintBeritaAcara` atau `onPrintBeritaAcara`. Pastikan sudah ada dan
dipassing ke `<InfrastrukturPanel>`. Jika belum ada, buat dengan pola:

```tsx
const handlePrintBeritaAcara = async (desaId: string, tahun: string) => {
    try {
        // Sesuaikan dengan implementasi cetak yang ada di proyek
        // Contoh: buka URL cetak di tab baru
        const url = `/api/cetak/berita-acara?desa_id=${desaId}&tahun=${tahun}`;
        window.open(url, "_blank");
    } catch (error) {
        toast.error("Gagal mencetak Berita Acara.");
        console.error(error);
    }
};
```

Verifikasi prop dipassing:
```tsx
<InfrastrukturPanel
    ...
    onPrintBeritaAcara={handlePrintBeritaAcara}
    ...
/>
```

---

### Tahap 9: Verifikasi TypeScript

Setelah semua perubahan selesai, jalankan perintah berikut di terminal:

```bash
npx tsc --noEmit
```

Atau di PowerShell:
```powershell
npx tsc --noEmit 2>&1 | Select-Object -First 50
```

Pastikan **tidak ada TypeScript error baru** dari perubahan yang dibuat.
Error yang sudah ada sebelumnya (di file lain) boleh diabaikan.

---

### Tahap 10: Testing Manual di Browser

Buka aplikasi, navigasi ke `/admin/monitoring/realisasi-infrastruktur`, dan uji skenario berikut:

| # | Skenario | Langkah | Expected Result |
|---|----------|---------|-----------------|
| 1 | Belum pilih desa | Buka halaman, jangan pilih desa | Section "Cetak Berita Acara" tidak tampil di sticky bottom |
| 2 | Desa dipilih, tidak ada data | Pilih desa yang kosong | Section Cetak BA tidak tampil |
| 3 | Desa dipilih, ada data | Pilih desa dengan data segmen | Section Cetak BA muncul di sticky bottom |
| 4 | Pilih tahun lalu cetak | Pilih tahun dari dropdown, klik "Cetak" | `onPrintBeritaAcara(desaId, tahun)` dipanggil dengan nilai benar |
| 5 | Cetak tanpa pilih tahun | Klik "Cetak" tanpa pilih tahun | Toast warning: "Pilih tahun anggaran terlebih dahulu." |
| 6 | Loading state | Klik "Cetak" | Tombol berubah ke "Memproses..." + spinner, disabled selama proses |
| 7 | Filter segmen — input teks | Ketik nama jalan di filter input | Daftar segmen ter-filter real-time |
| 8 | Filter segmen — clear | Hapus teks filter | Semua segmen tampil kembali |
| 9 | Filter segmen — tidak ada hasil | Ketik nama yang tidak ada | Empty state tampil dengan pesan |
| 10 | Badge tahun aktif | Pilih tahun dari dropdown filter | Badge "TA 2024" muncul di header daftar segmen |
| 11 | Border kondisi | Lihat card segmen | Border kiri berwarna sesuai kondisi (hijau/biru/kuning/merah) |
| 12 | Form digitasi terbuka | Klik "Mulai Digitasi" | Section Cetak BA tersembunyi (hanya tampil saat form tutup) |

---

## Catatan Penting untuk Implementor

> Baca semua catatan ini sebelum mulai coding!

1. **State `printYear` sudah ada** di baris 243 — JANGAN tambahkan duplikat.
   Cukup tambahkan `isPrinting` saja.

2. **`uniqueYears`** sudah dihitung di baris 312–313 — gunakan untuk dropdown tahun cetak.

3. **`filteredRealisasiList`** adalah computed value baru —
   ganti `realisasiList.map(...)` di template tapi `realisasiList.length`
   untuk logika tampil/sembunyi tetap pakai yang asli.

4. **Icon `Printer`** sudah diimport di baris ~21 — tidak perlu tambah import.

5. **Jika ada TypeScript error** seputar `onPrintBeritaAcara` returning `void` vs `Promise<void>`:
   ```typescript
   // Update di InfrastrukturPanelProps (~baris 138):
   onPrintBeritaAcara: (desaId: string, tahun: string) => Promise<void> | void;
   ```

6. **Urutan implementasi sangat penting** — lakukan Tahap 1–3 (hapus lama, tambah state)
   sebelum Tahap 4–7 (tambah UI baru).

7. **Tombol "Mulai Digitasi Segmen Baru"** dan "Batal Digitasi" di sticky bottom
   TIDAK BOLEH dihapus atau diubah — hanya tambahkan section Cetak BA DI ATASNYA.

8. **Section Cetak BA** dibungkus dengan kondisi `!isFormOpen` implisit karena
   berada di dalam else branch sticky bottom bar. Pastikan tidak memindahkan
   ke luar blok tersebut.

---

## Referensi Kode

- [InfrastrukturPanel.tsx — Props Interface (L75-148)](file:///c:/Development/gigis-reactjs/app/features/monitoring/components/InfrastrukturPanel.tsx#L75-L148)
- [InfrastrukturPanel.tsx — State printYear (L243)](file:///c:/Development/gigis-reactjs/app/features/monitoring/components/InfrastrukturPanel.tsx#L243)
- [InfrastrukturPanel.tsx — uniqueYears computed (L312-313)](file:///c:/Development/gigis-reactjs/app/features/monitoring/components/InfrastrukturPanel.tsx#L312-L313)
- [InfrastrukturPanel.tsx — Cetak BA lama yang akan dihapus (L773-784)](file:///c:/Development/gigis-reactjs/app/features/monitoring/components/InfrastrukturPanel.tsx#L773-L784)
- [InfrastrukturPanel.tsx — Header Daftar Segmen (L763-771)](file:///c:/Development/gigis-reactjs/app/features/monitoring/components/InfrastrukturPanel.tsx#L763-L771)
- [InfrastrukturPanel.tsx — Card Segmen className (L795-797)](file:///c:/Development/gigis-reactjs/app/features/monitoring/components/InfrastrukturPanel.tsx#L795-L797)
- [InfrastrukturPanel.tsx — Sticky Bottom Bar (L911-954)](file:///c:/Development/gigis-reactjs/app/features/monitoring/components/InfrastrukturPanel.tsx#L911-L954)
- [Issue Koordinat (sudah diimplementasikan)](file:///c:/Development/gigis-reactjs/issue.md)
