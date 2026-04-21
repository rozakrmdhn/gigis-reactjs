# GIGIS - Monitoring Jalan Poros Desa

**GIGIS (Geographic Information & Infrastructure System)** adalah platform pemantauan infrastruktur jalan poros desa di Kabupaten Bojonegoro. Aplikasi ini dirancang untuk memberikan visualisasi real-time kondisi jalan serta mempermudah pengambilan keputusan berbasis data geospasial.

## 🚀 Fitur Utama

### 📊 Dashboard & Analisis
- **Statistik Kondisi Jalan**: Ringkasan total panjang jalan dalam kondisi Baik, Sedang, Rusak Ringan, dan Rusak Berat.
- **Visualisasi Grafik**: Representasi data infrastruktur menggunakan chart yang interaktif (Recharts).
- **Laporan Hierarkis**: Sistem pelaporan data jalan berdasarkan tingkat Kabupaten, Kecamatan, hingga Desa.

### 🗺️ Visualisasi Peta (GIS)
- **Multi-Engine GIS Support**: Integrasi OpenLayers, Leaflet, dan Mapbox GL untuk visualisasi peta yang kaya.
- **Basemap Toggle**: Pilihan berbagai jenis peta (Satelit, Street, Dark/Light mode).
- **Layer Management**: Kontrol tampilan berbagai layer seperti batas administrasi, ruas jalan, dan titik STA.
- **Interactive Popup**: Informasi detail ruas jalan yang muncul saat berinteraksi dengan peta.

### 🛠️ Monitoring & Infrastruktur
- **Draw & Edit Tools**: Alat untuk menggambar dan mengedit fitur geografis langsung di peta.
- **Tracking Progress**: Pemantauan tahapan pembangunan konstruksi jalan dari pengurukan hingga pengaspalan.
- **Histori Konstruksi**: Log detail perubahan dan pembangunan pada setiap ruas jalan.
- **Geolocation**: Fitur pelacakan lokasi pengguna secara real-time untuk verifikasi lapangan.

### 📁 Manajemen Data (Master Data)
- **Data Jalan**: Pengelolaan basis data ruas jalan poros desa.
- **Wilayah Administrasi**: Manajemen data Kecamatan dan Desa.
- **Data Monitoring**: Integrasi data lapangan dengan sistem pusat.

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/), [React Router 7](https://reactrouter.com/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/)
- **Geospasial**: [OpenLayers](https://openlayers.org/), [Leaflet](https://leafletjs.com/), [Mapbox GL](https://www.mapbox.com/mapbox-gljs), [Turf.js](https://turfjs.org/)
- **Data & Forms**: [TanStack Table](https://tanstack.com/table/v8), [React Hook Form](https://react-hook-form.com/), [Zod](https://zod.dev/)
- **Visualisasi**: [Recharts](https://recharts.org/)
- **Icons**: [Tabler Icons](https://tabler.io/icons), [Lucide React](https://lucide.dev/)
- **Notifications**: [Sonner](https://sonner.stevenly.me/)

## 📦 Memulai Pengembangan

### Instalasi Dependensi
```bash
npm install
```

### Jalankan Server Pengembangan
```bash
npm run dev
```
Aplikasi akan berjalan di `http://localhost:5173`.

### Build untuk Produksi
```bash
npm run build
```

---

Dibuat untuk mendukung transparansi dan efisiensi pembangunan infrastruktur di Kabupaten Bojonegoro.
