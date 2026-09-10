# PANDUAN INTEGRASI FRONTEND: Peran `operator_opd` & Guardrail Validasi Sistem

Dokumen ini ditujukan untuk **Tim Frontend** sebagai panduan teknis dan spesifikasi UI/UX terkait:
1. **Penambahan Role Baru**: `operator_opd` (Operator Organisasi Perangkat Daerah).
2. **Aturan Hak Akses Global & Read-Only** untuk `operator_opd`.
3. **Penanganan Error Code & Status Penugasan** dari Backend.

---

## 📌 1. Ringkasan Karakteristik Role `operator_opd`

| Aspek | Deskripsi |
| :--- | :--- |
| **Kode Role** | `operator_opd` (dapat dibaca dari payload JWT `user.role` atau endpoint `/auth/me`) |
| **Cakupan Wilayah** | **Global se-Kabupaten Bojonegoro** (Bebas memilih filter seluruh kecamatan dan desa tanpa batasan) |
| **Sifat Hak Akses** | **MURNI READ-ONLY (Viewer Global)** |
| **Aksi Terlarang** | **DILARANG** melakukan Tambah, Edit, Hapus, Digitasi Peta, Submit Dokumen, atau Pengesahan Berita Acara |

---

## 🎨 2. Aturan UI / UX Per Modul untuk `operator_opd`

### A. Peta Spasial & WebGIS (Infrastruktur Jalan Poros, Lingkungan, Jembatan, dsb.)
- **Boleh Diakses (Tampilkan)**:
  - Visualisasi layer peta, basemap switcher, dan layer control.
  - Filter wilayah (dropdown Kecamatan & Desa dapat memilih semua wilayah se-Bojonegoro).
  - Klik fitur segmen / area untuk melihat Popup Detail & Kondisi Fisik.
  - Search / pencarian ruas jalan dan segmen.
- **Wajib Disembunyikan / Dinonaktifkan (Hide / Disable)**:
  - 🚫 **Toolbar Digitasi Peta**: Tombol *Draw Line*, *Draw Polygon*, *Edit Geometry*, *Delete Feature*, *Split Segment*.
  - 🚫 **Form Modal**: Tombol *Tambah Segmen Baru*, *Edit Atribut*, *Hapus Segmen*.

### B. Modul Monitoring Laporan & Dokumen Berita Acara
- **Boleh Diakses (Tampilkan)**:
  - Tabel Dokumen Penugasan / Berita Acara se-Kabupaten Bojonegoro.
  - Filter berdasarkan Tahun Anggaran, Kecamatan, Desa, dan Status Laporan.
  - Modal / Halaman Detail Berita Acara beserta lampiran daftar segmen realisasi.
  - Tombol **Cetak PDF Berita Acara** (`GET /v1/laporan/:id/cetak`).
- **Wajib Disembunyikan / Dinonaktifkan (Hide / Disable)**:
  - 🚫 Tombol **Terbitkan Dokumen Penugasan Baru** (Khusus Bappeda/Admin).
  - 🚫 Tombol **Ajukan Verifikasi (Submit)** (Khusus Operator Kecamatan/Desa).
  - 🚫 Tombol **Sahkan Berita Acara (Finalize)** / **Minta Revisi** (Khusus Bappeda/Admin).
  - 🚫 Tombol **Tambah / Hapus Segmen dari Laporan** (`POST/DELETE /v1/laporan/:id/segmen`).

### C. Modul Usulan Desa
- **Boleh Diakses (Tampilkan)**:
  - Tabel Daftar Usulan Desa se-Kabupaten.
  - Filter usulan berdasarkan kategori OPD terkait, kecamatan, desa, dan status usulan.
  - Melihat riwayat verifikasi usulan.
- **Wajib Disembunyikan / Dinonaktifkan (Hide / Disable)**:
  - 🚫 Tombol *Buat Usulan Desa Baru* (Khusus Operator Desa).
  - 🚫 Tombol *Verifikasi Usulan Bappeda / Bupati* (Khusus Bappeda / Super Admin).

### D. Modul Manajemen User & Hak Akses
- 🚫 **Sembunyikan menu Pengguna & Role** dari sidebar navigasi (Hanya untuk Super Admin dan Bappeda).

---

## 🔒 3. Matriks Hak Akses Antar Role (Ringkasan Lengkap)

| Fitur / Modul | `super_admin` / `admin` | `operator_bappeda` | `operator_kecamatan` | `operator_desa` | `operator_opd` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Scope Wilayah** | Se-Kabupaten | Se-Kabupaten | 1 Kecamatan | 1 Desa | **Se-Kabupaten** |
| **Lihat Peta & Data** | ✅ Ya | ✅ Ya | ✅ Ya (Kecamatan) | ✅ Ya (Desa) | ✅ **Ya (Global)** |
| **Digitasi Segmen Spasial** | ✅ Bypass Langsung | ✅ Bypass Langsung | ⚠️ Butuh Draft Aktif | ⚠️ Butuh Draft Aktif | ❌ **Dilarang (Read-Only)** |
| **Terbitkan Draft Penugasan**| ✅ Ya | ✅ Ya | ❌ Tidak | ❌ Tidak | ❌ **Tidak** |
| **Submit Laporan Monitoring**| ❌ Tidak | ❌ Tidak | ✅ Ya | ✅ Ya | ❌ **Tidak** |
| **Sahkan / Final Berita Acara**| ✅ Ya | ✅ Ya | ❌ Tidak | ❌ Tidak | ❌ **Tidak** |
| **Kelola Akun Pengguna** | ✅ Semua Role | ✅ Desa, Kec, OPD | ❌ Tidak | ❌ Tidak | ❌ **Tidak** |

---

## ⚠️ 4. Penanganan Respons & Error Code dari Backend

Jika terjadi percobaan request mutasi ke backend oleh role yang tidak memiliki izin, backend akan mengembalikan respons HTTP `403 Forbidden` terstruktur berikut. Frontend disarankan menampilkan toast/notifikasi yang informatif sesuai `errorCode`:

### 1. Error Percobaan Mutasi oleh Operator OPD (`READ_ONLY_ROLE`)
```json
{
  "status": "error",
  "code": 403,
  "errorCode": "READ_ONLY_ROLE",
  "message": "Akses ditolak: Role Operator OPD hanya memiliki hak akses baca (Read-Only) dan tidak diizinkan melakukan digitasi data."
}
```
> **Aksi Frontend**: Tampilkan toast warning bahwa akun OPD berstatus *Read-Only*.

### 2. Error Belum Ada Draft Penugasan Bappeda (`NO_DRAFT_ASSIGNMENT`)
```json
{
  "status": "error",
  "code": 403,
  "errorCode": "NO_DRAFT_ASSIGNMENT",
  "message": "Akses ditolak: Bappeda belum menerbitkan Dokumen Draft Penugasan untuk wilayah Desa dan Tahun Anggaran ini. Silakan koordinasi dengan Bappeda."
}
```
> **Aksi Frontend**: Nonaktifkan tombol digitasi pada desa/tahun tersebut dan beri badge info *"Belum Ada Penugasan Bappeda"*.

### 3. Error Laporan Sedang Diverifikasi Bappeda (`REPORT_SUBMITTED`)
```json
{
  "status": "error",
  "code": 403,
  "errorCode": "REPORT_SUBMITTED",
  "message": "Akses ditolak: Dokumen realisasi untuk Tahun Anggaran ini sedang dalam proses verifikasi oleh Operator Bappeda."
}
```
> **Aksi Frontend**: Kunci form/peta dalam mode read-only dan tampilkan badge *"Menunggu Verifikasi Bappeda"*.

### 4. Error Berita Acara Sudah Sah & Terkunci (`REPORT_FINALIZED`)
```json
{
  "status": "error",
  "code": 403,
  "errorCode": "REPORT_FINALIZED",
  "message": "Akses ditolak: Data realisasi untuk Tahun Anggaran ini telah disahkan dalam Berita Acara Final dan terkunci permanen."
}
```
> **Aksi Frontend**: Kunci permanen data realisasi dengan status *"Final / Sah"*.

---

## 💻 5. Contoh Helper Permission di Frontend (JavaScript / TypeScript)

```typescript
// utils/permissions.ts

export interface User {
  id: string;
  nama: string;
  role: 'super_admin' | 'admin' | 'operator_bappeda' | 'operator_kecamatan' | 'operator_desa' | 'operator_opd';
  id_kecamatan?: number | null;
  id_desa?: number | null;
}

/**
 * Cek apakah user memiliki izin digitasi / mutasi data spasial
 */
export const canDigitize = (user: User | null): boolean => {
  if (!user) return false;
  // operator_opd strictly read-only
  if (user.role === 'operator_opd') return false;
  return ['super_admin', 'admin', 'operator_bappeda', 'operator_kecamatan', 'operator_desa'].includes(user.role);
};

/**
 * Cek apakah user memiliki scope global (seluruh kabupaten)
 */
export const hasGlobalRegionalScope = (user: User | null): boolean => {
  if (!user) return false;
  return ['super_admin', 'admin', 'operator_bappeda', 'operator_opd'].includes(user.role);
};

/**
 * Cek apakah user boleh mengelola dokumen penugasan (Bappeda/Admin)
 */
export const canManagePenugasan = (user: User | null): boolean => {
  if (!user) return false;
  return ['super_admin', 'admin', 'operator_bappeda'].includes(user.role);
};
```

---

## 📋 Checklist Integrasi Frontend

- [ ] Simpan `user.role` pada State Management (Redux / Pinia / Zustand / Context).
- [ ] Sembunyikan toolbar digitasi WebGIS saat login sebagai `operator_opd`.
- [ ] Izinkan dropdown filter wilayah (Kecamatan & Desa) memilih seluruh opsi se-Kabupaten Bojonegoro untuk `operator_opd`.
- [ ] Sembunyikan tombol *Create / Edit / Delete / Submit / Finalize* pada tabel laporan dan usulan saat login sebagai `operator_opd`.
- [ ] Tampilkan toast error ramah pengguna jika backend mengembalikan error code `READ_ONLY_ROLE` atau `NO_DRAFT_ASSIGNMENT`.
