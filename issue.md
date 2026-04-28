# Issue: Implementasi Halaman Katalog Dataset (GeoNode Integration)

## 📌 Deskripsi Tugas
Kita perlu membuat halaman **Katalog Dataset** baru di aplikasi GIGIS. Halaman ini akan menampilkan daftar dataset yang diambil dari server GeoNode kita (`saggaserv.my.id`), serta memungkinkan pengguna untuk melakukan preview dataset langsung di atas peta (OpenLayers). Peta preview juga harus interaktif dengan fitur pop-up informasi atribut dan pilihan basemap.

Dokumen ini ditulis agar mudah diikuti oleh Junior Programmer atau AI Assistant untuk mengimplementasikan fitur tersebut.

---

## ✅ Kriteria Penerimaan (Acceptance Criteria)
1. **Halaman Katalog (`/katalog-dataset`)**: Menampilkan daftar dataset dari GeoNode dalam bentuk card grid.
2. **Preview Peta**: Pengguna dapat melihat layer dataset di atas peta OpenLayers.
3. **Fitur Pop-up (Feature Info)**: Jika pengguna mengklik fitur/layer di peta, akan muncul pop-up berisi informasi atribut data tersebut.
4. **Basemap**: Tersedia opsi untuk mengganti basemap (misalnya: OSM, Google Satellite, dll).

---

## 🛠 Langkah-langkah Implementasi

### Langkah 1: Setup Service API GeoNode
Buat service baru untuk menangani request ke API GeoNode.
*   **File**: `app/features/katalog/services/geonode.service.ts`
*   **Tugas**:
    *   Buat fungsi `getDatasets()` yang memanggil endpoint GeoNode API (biasanya `https://saggaserv.my.id/api/v2/datasets`).
    *   Pastikan untuk mengambil informasi penting seperti `title`, `abstract` (deskripsi), `alternate` (nama layer/workspace geoserver), dan link `thumbnail`.
    *   **Catatan Penting**: Waspada terhadap masalah **CORS**. Jika API GeoNode tidak mengizinkan akses langsung dari browser frontend, mintalah backend untuk membuatkan endpoint *proxy* atau setel header proxy di sisi server (jika menggunakan framework fullstack seperti Remix).

### Langkah 2: Buat Halaman UI Katalog
Buat route baru untuk menampilkan list dataset.
*   **File**: `app/routes/katalog-dataset.tsx`
*   **Tugas**:
    *   Gunakan komponen `PublicNavbar` agar konsisten dengan halaman lain.
    *   Fetch data dari `geonode.service.ts`.
    *   Tampilkan data dalam bentuk **Card Grid** (gunakan `grid-cols-1 md:grid-cols-3` dll).
    *   Tiap Card harus menampilkan: Thumbnail/Ikon, Judul Dataset, Deskripsi singkat, dan tombol **"Preview Peta"**.

### Langkah 3: Buat Halaman Preview Peta
Buat route detail untuk memuat peta berdasarkan dataset yang dipilih.
*   **File**: `app/routes/katalog-dataset.$id.tsx` (atau bisa juga dibuat dalam bentuk Modal/Dialog besar di halaman yang sama).
*   **Tugas**:
    *   Gunakan pustaka **OpenLayers** (bisa merujuk/me-reuse `OpenLayersMap.tsx` yang sudah ada di proyek).
    *   **Tambahkan Basemap**: Implementasikan layer grup atau kontrol sederhana untuk beralih antara Basemap (OSM Standar dan Satelit).
    *   **Load Layer GeoNode**:
        *   GeoNode menggunakan GeoServer di belakangnya.
        *   Tambahkan layer sebagai **WMS (Web Map Service)** (lebih ringan untuk data besar) atau **Vector/WFS** (jika data kecil). URL WMS biasanya mengarah ke `https://saggaserv.my.id/geoserver/wms`.
        *   Gunakan parameter `LAYERS` dengan nilai dari atribut `alternate` (misal: `geonode:nama_layer`) yang didapat dari API pada langkah 1.

### Langkah 4: Implementasi Fitur Pop-up (Feature Info)
Agar peta interaktif, kita harus menampilkan data saat fitur diklik.
*   **Tugas**:
    *   **Jika menggunakan WMS**: Gunakan method `getFeatureInfoUrl` dari sumber WMS OpenLayers (`TileWMS` atau `ImageWMS`) saat event `singleclick` terjadi pada peta. Fetch URL tersebut (biasanya mereturn format JSON) dan parse isinya.
    *   **Jika menggunakan WFS/Vector**: Gunakan interaksi `Select` dari OpenLayers dan ambil properties dari fitur yang ter-select.
    *   **UI Pop-up**: Buat elemen HTML absolute atau gunakan `Overlay` bawaan OpenLayers untuk menampilkan tabel `Key-Value` dari atribut data yang diklik tersebut.

---

## 💡 Panduan Khusus & Tips
1. **Desain UI/UX**: Gunakan kelas Tailwind CSS yang sudah ada (misalnya komponen UI dari Radix/Shadcn) agar memiliki kesan modern, "glassmorphism", dan profesional seperti halaman `/jalan-desa`.
2. **Loading State**: Pastikan memberikan state loading (seperti komponen Skeleton) saat mengambil data dari server `saggaserv.my.id` karena server spasial kadang membutuhkan waktu respon beberapa detik.
3. **Pusatkan Peta (Fit Bounds)**: Saat layer berhasil dimuat, idealnya peta otomatis melakukan `fit` ke koordinat batas layer (Bounding Box / Extent). Metadata API GeoNode biasanya menyediakan atribut `bbox`.
4. **Handling CORS Layer**: Seringkali pemuatan image WMS terblokir CORS. Pastikan saat inisialisasi WMS di OpenLayers menggunakan konfigurasi `crossOrigin: 'anonymous'` atau `'use-credentials'` tergantung settingan server saggaserv.

---
*Siap dikerjakan? Silakan mulai dari Langkah 1!*
