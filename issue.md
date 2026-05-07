# Issue: DrawControl Panel — Responsive UI/UX (Mobile & Desktop)

**Route:** `/admin/monitoring/draw`  
**Prioritas:** High  
**Estimasi:** 2–3 jam  
**Label:** `enhancement`, `ui/ux`, `responsive`

---

## Ringkasan

Perbaikan UI/UX komponen `DrawControls` agar **responsive** untuk mobile dan desktop, dengan penyesuaian:
- **Mobile:** Hanya tampilkan ikon (tanpa teks label)
- **Desktop:** Tampilkan ikon + teks label di bawahnya
- Panel tetap di bagian **bawah tengah (bottom center)** secara horizontal
- Jika tombol terlalu banyak, gunakan **scroll horizontal** agar tidak overflow
- Ikon menggunakan `lucide-react`
- Teks menggunakan **First Capital** (contoh: "Select", "Draw Line", "Clear All")

---

## File yang Perlu Diubah

| # | File | Aksi | Keterangan |
|---|------|------|-----------|
| 1 | `app/features/monitoring/components/DrawControls.tsx` | **MODIFY** | Responsive layout + horizontal scroll + first capital text |

---

## Kondisi Saat Ini

File `DrawControls.tsx` saat ini sudah memiliki:
- Layout horizontal (`flex-row`) — ✅
- Posisi bottom center — ✅ (diatur dari parent `index.tsx`)
- Icon dari `lucide-react` — ✅
- Teks label — ✅ (tapi menggunakan `UPPERCASE`, harus diubah ke First Capital)
- Props enable/disable logic — ✅
- Sub-komponen `ToolButton` — ✅

**Yang BELUM ada:**
- ❌ Responsive: teks label tidak disembunyikan di mobile
- ❌ Horizontal scroll: tidak ada scroll jika tombol overflow
- ❌ First Capital: teks masih UPPERCASE

---

## Tahapan Implementasi

### Tahap 1: Ubah Teks Label ke First Capital

Buka `app/features/monitoring/components/DrawControls.tsx`.

Cari bagian `ToolButton` yang menampilkan label teks (sekitar baris 164):

**SEBELUM:**
```tsx
<span className="text-[9px] font-black uppercase tracking-tight leading-none">{label}</span>
```

**SESUDAH:**
```tsx
<span className="text-[9px] font-black tracking-tight leading-none hidden md:block">{label}</span>
```

**Penjelasan:**
- Hapus class `uppercase` — label sudah ditulis dengan First Capital di props (misalnya `"Select"`, `"Draw Line"`)
- Tambahkan `hidden md:block` — menyembunyikan teks di mobile, tampilkan di desktop (≥768px)

---

### Tahap 2: Tambahkan Horizontal Scroll pada Container

Cari container utama `DrawControls` (sekitar baris 43–46):

**SEBELUM:**
```tsx
<div className={cn(
    "flex flex-row items-center gap-1 p-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border dark:border-slate-800 rounded-2xl shadow-2xl no-print",
    className
)}>
```

**SESUDAH:**
```tsx
<div className={cn(
    "flex flex-row items-center gap-1 p-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border dark:border-slate-800 rounded-2xl shadow-2xl no-print overflow-x-auto max-w-[calc(100vw-2rem)] scrollbar-none",
    className
)}>
```

**Penjelasan:**
- `overflow-x-auto` — mengaktifkan scroll horizontal ketika konten melebihi lebar container
- `max-w-[calc(100vw-2rem)]` — membatasi lebar maksimum container agar tidak melebihi layar (dikurangi 1rem padding kiri-kanan)
- `scrollbar-none` — menyembunyikan scrollbar agar lebih bersih (Tailwind plugin). Jika class ini tidak tersedia, tambahkan CSS manual (lihat Tahap 3)

---

### Tahap 3: Tambahkan CSS untuk Menyembunyikan Scrollbar (Jika Diperlukan)

Jika class `scrollbar-none` tidak tersedia di project, tambahkan CSS berikut di file global CSS (misalnya `app/index.css` atau `app/globals.css`):

```css
/* Hide scrollbar for DrawControls horizontal scroll */
.scrollbar-none::-webkit-scrollbar {
    display: none;
}
.scrollbar-none {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
```

> **CATATAN:** Cek dulu apakah class `scrollbar-none` sudah ada di project. Jika sudah ada (misalnya dari plugin `tailwind-scrollbar-hide`), Tahap ini bisa dilewati.

---

### Tahap 4: Sesuaikan `ToolButton` untuk Responsive

Ubah sizing `ToolButton` agar adaptif di mobile:

**SEBELUM:**
```tsx
<Button
    variant={active ? "default" : "ghost"}
    size="sm"
    className={cn(
        "flex flex-col items-center justify-center gap-1 h-auto min-w-[64px] px-2 py-1.5 rounded-xl transition-all duration-300",
        variantClasses[variant],
        disabled && "opacity-40 cursor-not-allowed pointer-events-none",
        pulse && "animate-pulse"
    )}
    onClick={onClick}
    disabled={disabled}
>
    <Icon className="h-4 w-4" />
    <span className="text-[9px] font-black uppercase tracking-tight leading-none">{label}</span>
</Button>
```

**SESUDAH:**
```tsx
<Button
    variant={active ? "default" : "ghost"}
    size="sm"
    className={cn(
        "flex flex-col items-center justify-center gap-1 h-auto min-w-[40px] md:min-w-[64px] px-2 py-1.5 rounded-xl transition-all duration-300 shrink-0",
        variantClasses[variant],
        disabled && "opacity-40 cursor-not-allowed pointer-events-none",
        pulse && "animate-pulse"
    )}
    onClick={onClick}
    disabled={disabled}
>
    <Icon className="h-4 w-4" />
    <span className="text-[9px] font-black tracking-tight leading-none hidden md:block">{label}</span>
</Button>
```

**Perubahan yang dilakukan:**
| Perubahan | Sebelum | Sesudah | Alasan |
|-----------|---------|---------|--------|
| min-width | `min-w-[64px]` | `min-w-[40px] md:min-w-[64px]` | Tombol lebih kecil di mobile |
| shrink | _(tidak ada)_ | `shrink-0` | Mencegah tombol menyusut saat scroll |
| text class | `uppercase` | _(dihapus)_ | Label sudah First Capital |
| text visibility | _(selalu tampil)_ | `hidden md:block` | Sembunyikan teks di mobile |

---

### Tahap 5: Pastikan Separator Juga Responsive

Separator vertikal antar grup tool (baris 73 dan 93) sudah OK karena hanya menggunakan `h-8` dan tidak ada teks. Tidak perlu diubah.

Namun jika ingin separator lebih pendek di mobile, bisa ditambahkan:

```tsx
<div className="w-px h-6 md:h-8 bg-slate-200/60 dark:bg-slate-800/60 mx-0.5 md:mx-1 shrink-0" />
```

---

### Tahap 6: Pastikan Tooltip Tetap Berfungsi di Mobile

Tooltip pada `ToolButton` sangat penting di mobile karena teks label tidak ditampilkan. Pastikan:
- `TooltipContent` dengan `side="top"` sudah benar — ✅ (sudah ada di kode saat ini)
- Tooltip akan muncul saat long-press di mobile

Tidak perlu mengubah kode tooltip. Hanya pastikan saat testing bahwa tooltip muncul.

---

## Referensi Visual

### Desktop (≥768px)
```
┌──────────────────────────────────────────────────────────────────────┐
│  🖱️     ✏️       🔗        │  🗑️       ✖️      │  📥       💾       │
│ Select  Draw Line Edit&Snap │ Clear All Batal   │ Export   Simpan   │
└──────────────────────────────────────────────────────────────────────┘
```

### Mobile (<768px)
```
┌──────────────────────────────────────┐
│  🖱️   ✏️   🔗  │  🗑️  ✖️  │  📥  💾  │  ← scroll horizontal
└──────────────────────────────────────┘
```

---

## Daftar Tombol dan Label (First Capital)

| Tool | Icon (lucide-react) | Label Desktop | Mobile |
|------|-------------------|---------------|--------|
| Select | `MousePointer2` | Select | ikon saja |
| Draw Line | `Spline` | Draw Line | ikon saja |
| Edit & Snap | `SplinePointer` | Edit & Snap | ikon saja |
| Clear All | `Trash2` | Clear All | ikon saja |
| Batal Edit | `X` | Batal Edit | ikon saja |
| Export | `Download` | Export | ikon saja |
| Simpan | `SaveIcon` | Simpan | ikon saja |

---

## Checklist Testing

- [ ] **Desktop:** Semua tombol menampilkan ikon + teks "First Capital"
- [ ] **Mobile (< 768px):** Semua tombol hanya menampilkan ikon, teks tersembunyi
- [ ] **Mobile:** Tooltip muncul saat long-press/hover pada tombol
- [ ] **Scroll horizontal:** Jika layar sempit, panel bisa di-scroll horizontal
- [ ] **Scrollbar tersembunyi:** Tidak ada scrollbar yang terlihat saat scroll
- [ ] **Tombol tidak menyusut:** Semua tombol mempertahankan ukuran minimum
- [ ] **Dark mode:** Panel terlihat baik di dark mode (mobile & desktop)
- [ ] **Enable/Disable:** Logika enable/disable masih berfungsi setelah perubahan

---

## Catatan untuk Implementor

> **PERINGATAN:** Hanya ubah file `DrawControls.tsx`. JANGAN mengubah file `index.tsx` atau file lain untuk issue ini.

> **TIPS:** Untuk testing responsive, gunakan Chrome DevTools → Toggle Device Toolbar (Ctrl+Shift+M) dan pilih ukuran mobile (contoh: iPhone 14, 390×844px).

> **PENTING:** Pastikan label props di komponen `DrawControls` sudah menggunakan First Capital. Cek di tempat komponen dipanggil (di `index.tsx`) — label sudah benar karena ditulis langsung di `DrawControls.tsx` (baris 50, 58, 67, 78, 87, 98, 107).
