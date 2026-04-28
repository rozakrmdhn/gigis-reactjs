# Rencana Implementasi: Perbaikan Interaksi Peta dan Integrasi Geonode Katalog pada Monitoring Draw

Dokumen ini berisi panduan untuk mengimplementasikan beberapa fitur dan perbaikan pada rute `/admin/monitoring/draw` dan service terkait. Silakan ikuti langkah-langkah di bawah ini untuk mengimplementasikan perubahannya.

## Daftar Tugas

### 1. Menghilangkan Interaksi Pop-up Saat Draw Segmen
**Lokasi File:** `app/routes/monitoring/draw/index.tsx`

**Masalah:** Saat ini, ketika pengguna sedang melakukan *drawing* segmen jalan (menambahkan segmen baru), fitur pop-up mungkin masih terpicu jika pengguna tanpa sengaja menekan area peta yang memiliki fitur vector/WMS.
**Instruksi:**
- Cari fungsi handler `map.on('click', ...)` di dalam `useEffect`.
- Tambahkan pengecekan kondisi untuk mode draw. Jika variabel state `mode` sedang bernilai `"draw"`, maka instruksikan handler untuk melakukan *return/escape* awal (early return) atau melewatinya sehingga pop-up tidak muncul (`setSelectedVectorId` tidak dipanggil, dan `vectorPopupRef` tidak diset posisinya).

### 2. Menghilangkan Interaksi Pop-up Saat Edit Segmen
**Lokasi File:** `app/routes/monitoring/draw/index.tsx`

**Masalah:** Mirip dengan isu di atas, saat mode *edit* fitur jalan, pop-up tidak seharusnya mengganggu proses editing.
**Instruksi:**
- Cari handler klik yang sama (`map.on('click', ...)`).
- Tambahkan juga pengecekan jika state `mode` sedang bernilai `"edit"`, lakukan hal yang sama (early return atau matikan eksekusi pemanggilan pop-up informasi).
- Pastikan bahwa klik pada peta hanya berfokus pada interaksi `Modify` bawaan dari OpenLayers, tanpa membuka modal/popup detail fitur.

### 3. Fitur Dialog Katalog Dataset Geonode & Menghapus WMS Default
**Lokasi File Utama:** `app/routes/monitoring/draw/index.tsx`
**Komponen Referensi:** `app/features/peta/components/GeonodeDatasetPanel`

**Masalah:** Pengguna butuh kemudahan memuat layer data dari Geonode langsung pada halaman editor/draw, namun dua layer bawaan seringkali memberatkan atau menutupi view.
**Instruksi:**
- **Hapus Layer Default:** 
  1. Pada `useState` deklarasi `visibleLayers`, hapus atau set `visible: false` dan hilangkan inisialisasi default dari object WMS untuk `"wms-jalan-kabupaten"` dan `"road-desa-wms"`. 
  2. Pada inisialisasi objek `OLMap` (di dalam `useEffect`), hapus layer `roadDesaWmsLayer` dan `jalanKabupatenWmsLayer` dari array `layers`.
- **Tambahkan Fitur Dialog Katalog:**
  1. Import komponen dialog UI standar (seperti `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, dll dari `~/components/ui/dialog`).
  2. Import komponen `GeonodeDatasetPanel` dari `~/features/peta/components/GeonodeDatasetPanel`.
  3. Buat sebuah tombol baru di *map controls* (misalnya ikon `Database` atau `Layers`) yang membuka state Dialog ini (`isCatalogOpen`).
  4. Di dalam konten dialog, render komponen `<GeonodeDatasetPanel onAddLayer={handleAddLayer} activeLayerIds={...} />`.
  5. Pastikan membuat fungsi helper `handleAddLayer` yang menerima layer dari Geonode dan memasukkannya ke dalam map `mapRef.current` (menggunakan method `.addLayer()` dari OpenLayers) agar datanya tampil pada peta draw.

### 4. Perbaikan Query Parameter Endpoint Segmen (desa_id -> id_desa)
**Lokasi File:** `app/features/monitoring/services/monitoring.service.ts`

**Masalah:** Terdapat inkonsistensi query parameter saat mengambil data segmen non-base jalan, di mana backend meminta `id_desa` tetapi frontend mengirim `desa_id`.
**Instruksi:**
- Temukan metode `getNonBaseSegments` di dalam `monitoring.service.ts`.
- Saat ini kode terlihat seperti:
  ```typescript
  if (id_desa) {
      url += `&desa_id=${id_desa}`;
  }
  ```
- Ubah baris tersebut menjadi:
  ```typescript
  if (id_desa) {
      url += `&id_desa=${id_desa}`;
  }
  ```
- Pastikan tidak ada fungsi lain yang memanggil query parameter yang salah (lakukan pencarian teks `desa_id=` jika perlu).

---

## Catatan untuk Junior Programmer / AI:
Kerjakan langkah perbaikan API (`monitoring.service.ts`) terlebih dahulu untuk menstabilkan pengambilan data, kemudian lanjutkan ke logika penghapusan *pop-up* (draw/edit) di peta. Tutup pengerjaan dengan penambahan fitur UI Dialog untuk Katalog Geonode. Gunakan metode OpenLayers `map.addLayer()` secara dinamis ketika menerima output *layer* dari `GeonodeDatasetPanel`.
