# Issue: Standardisasi Panel Kanan & Toggle Geometry pada Halaman Usulan Desa

## Latar Belakang

Halaman `/admin/monitoring/realisasi-infrastruktur` sudah memiliki desain panel kanan (Slide Panel) dan tombol toggle yang konsisten dan responsif.
Dua halaman Usulan Desa berikut belum mengikuti standar tersebut:
- `/admin/usulan-desa/registrasi` → file: `app/routes/usulan-desa/registrasi/index.tsx`
- `/admin/usulan-desa/edit/{id}` → file yang sama, karena route edit dan registrasi menggunakan komponen yang sama dengan parameter `id`

---

## Tujuan

1. **Seragamkan Slide Panel Kanan** dengan referensi di `realisasi-infrastruktur`.
2. **Hilangkan animasi pada toggle Geometry List** — panel harus langsung muncul/hilang tanpa slide/fade animation.
3. **Seragamkan bentuk tombol toggle** — dari `rounded-full` menjadi `rounded-xl` (kotak rounded), konsisten dengan referensi halaman `realisasi-infrastruktur`.

---

## File yang Akan Dimodifikasi

| File | Keterangan |
|---|---|
| `app/routes/usulan-desa/registrasi/index.tsx` | Halaman registrasi dan edit usulan desa |
| `app/routes/usulan-desa/detail/$id.tsx` | Halaman detail/view usulan desa |

---

## Referensi

File referensi untuk desain panel kanan:
- `app/routes/monitoring/realisasi-infrastruktur/index.tsx` → sekitar baris 3379–3625

### Poin-poin penting dari referensi:

**Container Panel Kanan (baris ~3380-3383):**
```tsx
<div className={cn(
    "absolute top-0 bottom-0 right-0 w-full sm:w-[380px] max-w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-2xl border-l border-slate-200 dark:border-slate-800 transition-all duration-300 z-30 flex flex-col overflow-hidden",
    isRightPanelOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
)}>
```

**Tombol Toggle (baris ~3589-3591):**
```tsx
className={cn(
    "h-10 w-10 md:h-9 md:w-9 rounded-xl border border-border bg-background/90 backdrop-blur-sm shadow-md hover:bg-muted text-foreground transition-all duration-300",
    isRightPanelOpen && ... && "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white"
)}
```

---

## Tahapan Implementasi

### TAHAP 1 — Verifikasi Container Panel Kanan (registrasi/index.tsx)

**Lokasi kode:** sekitar baris 935-939 di `app/routes/usulan-desa/registrasi/index.tsx`

Pastikan panel container sudah menggunakan `transition-all duration-300`, sama seperti referensi:
```tsx
// ✅ Pastikan panel container seperti ini:
<div className={cn(
    "absolute top-0 bottom-0 right-0 w-full sm:w-[380px] max-w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-2xl border-l border-slate-200 dark:border-slate-800 transition-all duration-300 z-30 flex flex-col overflow-hidden",
    isRightPanelOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
)}>
```

---

### TAHAP 2 — Hilangkan Animasi Pada Toggle Geometry List

**Konteks:** Animasi `animate-bounce` pada ikon MapPin di tombol Toggle Lokasi harus dihapus agar terlihat lebih rapi dan profesional.

**Lokasi kode:** sekitar baris 511, 517 di `registrasi/index.tsx`

**Kode saat ini (Toggle MapPin button):**
```tsx
className={cn(
    "h-10 w-10 rounded-full shadow-xl border cursor-pointer flex items-center justify-center pointer-events-auto transition-all duration-300",
    ...
)}
>
    <MapPin className="h-4.5 w-4.5 text-red-500 animate-bounce" />
```

**Perubahan yang harus dilakukan:**
```tsx
// ❌ Sebelum: rounded-full, ada animate-bounce
"h-10 w-10 rounded-full shadow-xl border cursor-pointer flex items-center justify-center pointer-events-auto transition-all duration-300"
<MapPin className="h-4.5 w-4.5 text-red-500 animate-bounce" />

// ✅ Sesudah: rounded-xl, hilangkan animate-bounce dari icon
"h-10 w-10 md:h-9 md:w-9 rounded-xl border border-border bg-background/90 backdrop-blur-sm shadow-md hover:bg-muted text-foreground"
<MapPin className="h-4 w-4 text-red-500" />
```

---

### TAHAP 3 — Seragamkan Bentuk Semua Tombol Toggle (rounded-xl)

**Lokasi kode:** baris 480–488 dan 510–518 di `registrasi/index.tsx`

Saat ini semua tombol toggle di `registrasi/index.tsx` menggunakan `rounded-full`.  
Harus diubah ke `rounded-xl` agar seragam dengan referensi `realisasi-infrastruktur`.

**Tombol Toggle Layers (baris ~480-488):**
```tsx
// ❌ Sebelum:
className={cn(
    "h-10 w-10 rounded-full shadow-xl border cursor-pointer flex items-center justify-center pointer-events-auto transition-all duration-300",
    ...
)}

// ✅ Sesudah (gunakan class persis seperti referensi):
className={cn(
    "h-10 w-10 md:h-9 md:w-9 rounded-xl border border-border bg-background/90 backdrop-blur-sm shadow-md hover:bg-muted text-foreground transition-all duration-300",
    isRightPanelOpen && (activeRightTab === 'katalog' || activeRightTab === 'layers')
        ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white"
        : ""
)}
```

**Tombol Toggle Lokasi / MapPin (baris ~510-518):**
```tsx
// ❌ Sebelum:
"h-10 w-10 rounded-full shadow-xl border cursor-pointer ... pointer-events-auto transition-all duration-300"

// ✅ Sesudah:
"h-10 w-10 md:h-9 md:w-9 rounded-xl border border-border bg-background/90 backdrop-blur-sm shadow-md hover:bg-muted text-foreground transition-all duration-300"
```

---

### TAHAP 4 — Seragamkan Tombol Toggle di detail/$id.tsx

**Lokasi kode:** baris 334–342 di `app/routes/usulan-desa/detail/$id.tsx`

Halaman detail menggunakan pola berbeda: tombol trigger terpisah yang hanya muncul ketika panel tertutup (`!isGeometryListOpen`). Perlu diubah menjadi tombol ikon kotak kecil seperti referensi.

**Ubah tombol trigger Geometry List di detail page:**
```tsx
// ❌ Sebelum (tombol teks lebar):
<Button
    onClick={() => setIsGeometryListOpen(true)}
    className="absolute top-4 right-4 z-20 shadow-xl gap-2 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-bold text-xs rounded-xl"
>
    <ChevronLeft size={15} className="text-slate-400" />
    Daftar Geometry ({geometries.length})
    <MapPin size={15} className="text-red-500 animate-bounce" />
</Button>

// ✅ Sesudah (tombol ikon kotak kecil, seragam dengan registrasi/index.tsx):
<div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => setIsGeometryListOpen(true)}
                    className="h-10 w-10 md:h-9 md:w-9 rounded-xl border border-border bg-background/90 backdrop-blur-sm shadow-md hover:bg-muted text-foreground"
                >
                    <MapPin className="h-4 w-4 text-red-500" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Daftar Geometry ({geometries.length})</TooltipContent>
        </Tooltip>
    </TooltipProvider>
</div>
```

> **Catatan:** Ubah juga kondisi render tombol trigger. Saat ini hanya muncul ketika `!isGeometryListOpen`. Idealnya ubah menjadi selalu tampil (toggle on/off), atau pertahankan pola yang sama dengan `registrasi/index.tsx` (tombol selalu tampil di kanan atas, di luar panel).

---

### TAHAP 5 — Verifikasi Panel Kanan di detail/$id.tsx

**Lokasi kode:** sekitar baris 710-712 di `app/routes/usulan-desa/detail/$id.tsx`

Pastikan container panel kanan di detail page sudah menggunakan `transition-all duration-300`:
```tsx
// ✅ Yang benar (pastikan ini sudah ada):
"absolute top-0 bottom-0 right-0 w-full sm:w-[420px] max-w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-2xl border-l border-slate-200 dark:border-slate-800 transition-all duration-300 z-30 flex flex-col overflow-hidden"
```

---

## Checklist Implementasi

- [ ] **TAHAP 1** — Verifikasi container panel kanan di `registrasi/index.tsx` sudah sesuai referensi (`transition-all duration-300` ada)
- [ ] **TAHAP 2** — Hapus `animate-bounce` dari ikon `<MapPin>` pada tombol Toggle Lokasi di `registrasi/index.tsx`
- [ ] **TAHAP 3** — Ubah semua tombol toggle di `registrasi/index.tsx` dari `rounded-full` ke `rounded-xl`, dan sesuaikan class dengan referensi `realisasi-infrastruktur`
- [ ] **TAHAP 4** — Ubah tombol trigger Geometry List di `detail/$id.tsx` dari tombol teks lebar ke tombol ikon kotak kecil (`rounded-xl`) dengan Tooltip, konsisten dengan `registrasi/index.tsx`
- [ ] **TAHAP 5** — Verifikasi container panel kanan di `detail/$id.tsx` sudah ada `transition-all duration-300`
- [ ] **Verifikasi** — Jalankan `npm run typecheck` dan pastikan tidak ada error TypeScript baru

---

## Catatan untuk Implementor

> **Jangan** mengubah behavior/logika state `isRightPanelOpen`, `setIsRightPanelOpen`, `activeRightTab`, dll. Hanya ubah **tampilan** (class CSS) dari komponen tombol toggle dan kontainer panel.

> **Jangan** menghapus `transition-all duration-300` dari container panel kanan — animasi slide-in/slide-out panel tetap dipertahankan. Yang dihilangkan hanya animasi `animate-bounce` pada ikon MapPin saja.

> Import yang mungkin perlu ditambahkan di `detail/$id.tsx` jika belum ada:
> ```tsx
> import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
> ```
