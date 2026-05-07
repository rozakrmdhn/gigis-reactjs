# Redesign UI/UX RoadSegmentsPanel - Simple & Fungsional

## Deskripsi

Melakukan redesign pada komponen `RoadSegmentsPanel` agar tampilannya lebih **sederhana (simple)** dan **fungsional**. Saat ini seluruh fitur panel (header, tabs, filter, list item, action buttons, dll.) berada di dalam satu file monolitik (`RoadSegmentsPanel.tsx` — 458 baris). Hal ini menyulitkan pemeliharaan, pengembangan fitur baru, dan pengujian.

**Tujuan utama:**
1. Menyederhanakan tampilan panel agar lebih clean dan mudah digunakan.
2. Memecah file monolitik menjadi komponen-komponen kecil yang modular sesuai fungsionalitasnya.

**Route:** `/admin/monitoring/draw`

**File utama:** `app/features/monitoring/components/RoadSegmentsPanel.tsx`

---

## Analisis Komponen Saat Ini

Komponen `RoadSegmentsPanel` saat ini terdiri dari bagian-bagian berikut yang semuanya ada di satu file:

| Bagian | Deskripsi | Baris (kurang lebih) |
|---|---|---|
| `SegmentItem` | Kartu individual untuk setiap segmen jalan (kondisi, tahun, panjang, aksi) | 48–153 |
| `SegmentList` | Daftar scrollable segmen + filter + tombol Tambah | 168–280 |
| `RoadSegmentsPanel` | Panel utama (header, tabs Ruas/Non Melarosa, toggle buka/tutup) | 300–457 |
| `formatNumber` | Helper formatting angka | 36–37 |

---

## Tahapan Implementasi

### Tahap 1: Persiapan — Buat Folder & Struktur File

1. Buat folder baru: `app/features/monitoring/components/road-segments/`
2. Di dalam folder tersebut, buat file-file berikut (masih kosong):

```
app/features/monitoring/components/road-segments/
├── index.ts                    # Barrel export
├── RoadSegmentsPanel.tsx       # Komponen panel utama (container)
├── SegmentItem.tsx             # Kartu segmen individual
├── SegmentList.tsx             # Daftar segmen + scroll
├── SegmentFilters.tsx          # Filter kondisi & status
├── SegmentActions.tsx          # Tombol aksi (Edit, Monitoring, Delete)
├── AddSegmentDropdown.tsx      # Dropdown "Tambah" (Manual/Otomatis)
└── PanelHeader.tsx             # Header panel (judul + tombol close)
```

3. Setelah semua file dibuat, update import di `app/routes/monitoring/draw/index.tsx`:
   ```typescript
   // SEBELUM
   import { RoadSegmentsPanel } from "~/features/monitoring/components/RoadSegmentsPanel";
   // SESUDAH
   import { RoadSegmentsPanel } from "~/features/monitoring/components/road-segments";
   ```

---

### Tahap 2: Pindahkan `SegmentItem` → `SegmentItem.tsx`

1. **Salin** komponen `SegmentItem` (baris 48–153 dari file asli) ke file baru `SegmentItem.tsx`.
2. **Pindahkan juga** helper `formatNumber` ke file ini (atau buat file `utils.ts` terpisah di folder yang sama).
3. **Sederhanakan tampilan kartu** dengan prinsip berikut:
   - Hapus bagian `sumber_data` dan `created_at` yang terlalu verbose (pindahkan ke tooltip jika perlu).
   - Hapus tampilan `props.id` yang tidak diperlukan end-user.
   - Buat layout kartu lebih compact: satu baris untuk info utama (kondisi + panjang), satu baris untuk aksi.
4. **Export** komponen dan interface `SegmentItemProps`.

**Contoh struktur baru yang disederhanakan:**
```
┌──────────────────────────────────────────────┐
│ [Badge: Jenis] [Badge: Kondisi]    123.45 m  │
│ Tahun: 2024                          🔍 Zoom │
│ ─────────────────────────────────────────── │
│ [Edit]    [Monitoring]    [Delete]            │
└──────────────────────────────────────────────┘
```

> **Catatan:** Pastikan tombol `Edit` hanya tampil jika `!props.is_base_jalan`.

---

### Tahap 3: Pindahkan Tombol Aksi → `SegmentActions.tsx`

1. **Ekstrak** bagian tombol aksi dari `SegmentItem` (baris 100–150) ke komponen terpisah.
2. Interface props:
   ```typescript
   interface SegmentActionsProps {
     segment: any;
     isBaseJalan: boolean;
     onEdit: (feature: any) => void;
     onMonitoring?: (feature: any) => void;
     onDelete?: (feature: any) => void;
   }
   ```
3. Pindahkan juga komponen `AlertDialog` untuk konfirmasi delete ke dalam file ini.
4. **Sederhanakan styling:** gunakan icon-only buttons dengan tooltip untuk menghemat ruang, terutama pada mobile.

---

### Tahap 4: Pindahkan Filter → `SegmentFilters.tsx`

1. **Ekstrak** dropdown filter Status Kondisi dan Kondisi (baris 183–217 dari file asli) ke komponen baru.
2. Interface props:
   ```typescript
   interface SegmentFiltersProps {
     filters: { kondisi: string; status_kondisi: string };
     onFilterChange: (filters: { kondisi: string; status_kondisi: string }) => void;
   }
   ```
3. **Sederhanakan tampilan:** Jika filter aktif, tampilkan indikator kecil (badge/dot) agar pengguna tahu ada filter yang aktif. Tambahkan tombol reset filter.

---

### Tahap 5: Pindahkan Dropdown Tambah → `AddSegmentDropdown.tsx`

1. **Ekstrak** `DropdownMenu` untuk opsi Digitasi (baris 220–254) ke komponen terpisah.
2. Interface props:
   ```typescript
   interface AddSegmentDropdownProps {
     onAdd: (type: 'manual' | 'otomatis') => void;
   }
   ```
3. Komponen ini hanya render dropdown button "Tambah" dengan 2 opsi: Manual dan Otomatis.

---

### Tahap 6: Pindahkan Header Panel → `PanelHeader.tsx`

1. **Ekstrak** bagian header panel (baris 387–401) ke komponen `PanelHeader.tsx`.
2. Interface props:
   ```typescript
   interface PanelHeaderProps {
     title: string;
     onClose: () => void;
   }
   ```
3. Sederhanakan: cukup judul + tombol close. Hapus icon besar yang tidak perlu.

---

### Tahap 7: Pindahkan `SegmentList` → `SegmentList.tsx`

1. **Salin** komponen `SegmentList` ke file baru.
2. Import `SegmentItem`, `SegmentFilters`, dan `AddSegmentDropdown` dari file-file yang sudah dibuat.
3. **Sederhanakan layout:**
   - Filter dan tombol Tambah diletakkan di satu baris horizontal.
   - Daftar segmen menggunakan `ScrollArea` seperti sebelumnya.
   - Tampilkan jumlah segmen (count) di dekat judul tab.

---

### Tahap 8: Rakit Ulang `RoadSegmentsPanel.tsx`

1. Buka file `RoadSegmentsPanel.tsx` yang baru (di folder `road-segments/`).
2. Import semua komponen yang sudah dipisah:
   ```typescript
   import { PanelHeader } from "./PanelHeader";
   import { SegmentList } from "./SegmentList";
   ```
3. Pertahankan logika:
   - Toggle buka/tutup panel (slide in/out).
   - Tabs "Ruas Jalan" dan "Non Melarosa" dengan counter badge.
   - Filtering segmen berdasarkan `check_melarosa`.
4. **Redesign layout panel:**
   - Tampilan lebih compact tanpa padding berlebih.
   - Tab menampilkan jumlah item: `Ruas Jalan (12)` | `Non Melarosa (5)`.
   - Warna dan spacing yang konsisten.

---

### Tahap 9: Update Barrel Export → `index.ts`

Buat file `index.ts` untuk barrel export:

```typescript
export { RoadSegmentsPanel } from "./RoadSegmentsPanel";
export type { RoadSegmentsPanelProps } from "./RoadSegmentsPanel";
```

---

### Tahap 10: Update Import di Parent & Verifikasi

1. Update import di `app/routes/monitoring/draw/index.tsx` (baris 77):
   ```typescript
   import { RoadSegmentsPanel } from "~/features/monitoring/components/road-segments";
   ```
2. **Pastikan semua props yang diteruskan masih sama** — tidak ada perubahan pada interface `RoadSegmentsPanelProps`.
3. Jalankan aplikasi dan verifikasi:
   - [ ] Panel bisa dibuka/ditutup dengan slide animation.
   - [ ] Tabs "Ruas Jalan" dan "Non Melarosa" berfungsi normal.
   - [ ] Filter Kondisi dan Status berfungsi.
   - [ ] Tombol Tambah (Manual/Otomatis) berfungsi.
   - [ ] Tombol Edit, Monitoring, Delete pada setiap segmen berfungsi.
   - [ ] Alert dialog konfirmasi delete masih muncul.
   - [ ] Zoom ke segmen berfungsi.
   - [ ] Tampilan responsive pada mobile dan desktop.

---

### Tahap 11: Hapus File Lama

Setelah semua verifikasi berhasil:

1. Hapus file lama: `app/features/monitoring/components/RoadSegmentsPanel.tsx`
2. Pastikan tidak ada file lain yang mengimport dari path lama.

---

## Struktur File Akhir

```
app/features/monitoring/components/
├── road-segments/
│   ├── index.ts                    # Barrel export
│   ├── RoadSegmentsPanel.tsx       # Panel container (tabs, toggle, filtering logic)
│   ├── PanelHeader.tsx             # Header: judul + close button
│   ├── SegmentList.tsx             # Daftar scrollable + filter bar + add button
│   ├── SegmentItem.tsx             # Kartu segmen individual (compact)
│   ├── SegmentActions.tsx          # Tombol aksi (Edit/Monitoring/Delete + alert dialog)
│   ├── SegmentFilters.tsx          # Dropdown filter (Status & Kondisi)
│   └── AddSegmentDropdown.tsx      # Dropdown tambah (Manual/Otomatis)
├── DrawControls.tsx                # (tidak diubah)
├── DrawSidebar.tsx                 # (tidak diubah)
└── ... (file lain tetap)
```

---

## Prinsip Redesign UI/UX

1. **Compact & Clean:** Kurangi padding, margin, dan elemen dekoratif yang tidak perlu.
2. **Information Density:** Tampilkan info penting saja pada kartu segmen; detail lainnya bisa diakses via tooltip atau expand.
3. **Consistent Spacing:** Gunakan spacing yang seragam (p-2, gap-2 sebagai base).
4. **Action Clarity:** Tombol aksi harus jelas dan mudah dijangkau. Pada mobile, gunakan icon-only dengan tooltip.
5. **State Feedback:** Berikan indikator visual saat filter aktif (dot/badge) dan jumlah item pada tab.

---

## Checklist

- [x] Folder `road-segments/` dibuat
- [x] `SegmentItem.tsx` — kartu segmen yang lebih compact
- [x] `SegmentActions.tsx` — tombol aksi + dialog konfirmasi
- [x] `SegmentFilters.tsx` — dropdown filter
- [x] `AddSegmentDropdown.tsx` — dropdown tambah segmen
- [x] `PanelHeader.tsx` — header panel
- [x] `SegmentList.tsx` — daftar segmen
- [x] `RoadSegmentsPanel.tsx` — panel container baru
- [x] `index.ts` — barrel export
- [x] Import di `draw/index.tsx` diperbarui
- [x] Verifikasi semua fitur berfungsi
- [x] File lama dihapus
