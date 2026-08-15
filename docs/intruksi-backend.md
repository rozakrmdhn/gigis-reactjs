# 🛠️ Instruksi Backend: Aturan Validasi Status 'Terverifikasi' untuk Snapshot & Re-Snapshot Berita Acara

Dokumen ini berisi instruksi teknis untuk **Tim Backend** terkait validasi integritas data saat **Snapshot Awal** maupun **Snapshot Ulang (Re-Snapshot)** dokumen Berita Acara Monitoring (`monitoring_laporan`).

---

## 📌 1. Aturan Bisnis Utama (Business Rule)

> **"Snapshot Berita Acara (Status: Final) HANYA BISA DILAKUKAN jika SELURUH segmen realisasi pada Desa dan Tahun Anggaran terkait telah disetujui oleh Bappeda (Status: `terverifikasi`)."**

Jika masih terdapat segmen yang berstatus `verifikasi_kecamatan` (Draft) atau `verifikasi_bappeda` (Menunggu Review), proses pembuatan/pengesahan Berita Acara **WAJIB DITOLAK** oleh backend.

---

## 🔒 2. Validasi pada Endpoint Backend

### A. Endpoint `POST /v1/laporan` (Snapshot Baru & Re-Snapshot)
Sebelum melakukan *Insert* atau *Update (Upsert)* dokumen Berita Acara ke status `Final`:

1. **Ambil Seluruh Segmen pada Desa & Tahun Anggaran Terkait**:
   ```sql
   SELECT id, status_verifikasi, panjang_m 
   FROM infrastruktur_segmen
   WHERE id_desa = :id_desa
     AND tahun_pembangunan = :tahun_anggaran
     AND deleted_at IS NULL;
   ```

2. **Cek Kondisi Validasi**:
   - **Kondisi 1: Tidak ada segmen sama sekali (Count = 0)**:
     Tolak dengan status `422 Unprocessable Entity`:
     ```json
     {
       "status": "fail",
       "message": "Tidak dapat melakukan snapshot. Belum ada segmen realisasi yang terdata pada Desa dan Tahun Anggaran ini."
     }
     ```
   
   - **Kondisi 2: Terdapat segmen yang belum disetujui (`status_verifikasi != 'terverifikasi'`)**:
     Tolak dengan status `422 Unprocessable Entity`:
     ```json
     {
       "status": "fail",
       "message": "Tidak dapat melakukan snapshot Berita Acara. Seluruh segmen harus disetujui terlebih dahulu (status_verifikasi = 'terverifikasi'). Terdapat segmen yang masih berstatus 'verifikasi_kecamatan' atau 'verifikasi_bappeda'."
     }
     ```

3. **Jika Seluruh Segmen Sudah `terverifikasi`**:
   - Lanjutkan transaksi pembuatan / pembaruan dokumen `monitoring_laporan` (`status = 'Final'`).
   - Lakukan re-link ke tabel `monitoring_laporan_segmen`.
   - Hitung total panjang dan update kolom `realisasi_panjang`.

---

### B. Endpoint `PATCH /v1/laporan/:id` & `PATCH /v1/laporan/:id/sync-target`
Jika request mengubah status laporan menjadi `Final` (`status: "Final"`):
- Terapkan validasi yang sama: pastikan seluruh segmen terkait berstatus `terverifikasi`.

---

### C. Endpoint `PATCH /v1/infrastruktur/:tipe/segmen/:segmenId/verifikasi`
- Saat Bappeda mengembalikan satu segmen (`status_verifikasi = 'verifikasi_kecamatan'`):
  - Jika dokumen `monitoring_laporan` terkait berstatus `Final`, backend **otomatis me-revert status dokumen menjadi `Draft`** (atau `Revisi`) dan mencatat log di `history_revisi`.
  - Hal ini menjamin bahwa dokumen tidak lagi dalam status `Final` karena ada segmen yang perlu direvisi oleh kecamatan.

---

### D. Endpoint `DELETE /v1/laporan/:id` (Hapus Dokumen & Segmen Terikat)
Ketika dokumen Berita Acara Monitoring dihapus oleh Bappeda / Admin:
- **Logika Eksekusi (Database Transaction)**:
  1. Cari seluruh ID segmen yang terhubung pada `monitoring_laporan_segmen` untuk `id_laporan` tersebut.
  2. Hapus (soft-delete / update `deleted_at = NOW()`) seluruh segmen tersebut pada tabel `infrastruktur_segmen`.
  3. Hapus relasi junction pada `monitoring_laporan_segmen`.
  4. Hapus record dokumen pada `monitoring_laporan`.
- **Hasil**: Menghapus dokumen monitoring secara bersih juga akan membersihkan seluruh segmen spasial yang terikat dalam dokumen tersebut.

---

## 💻 3. Contoh Implementasi Handler Backend (Node.js / Express / Knex / Prisma)

```javascript
async function handleCreateOrUpsertLaporan(req, res) {
    const { id_desa, tahun_anggaran, nomor_ba, sumber_dana, rencana_panjang, status = 'Final', tipe_kode } = req.body;
    
    // 1. Ambil seluruh segmen aktif pada desa & tahun ini
    const segmens = await db('infrastruktur_segmen')
        .where({ id_desa, tahun_pembangunan: tahun_anggaran })
        .whereNull('deleted_at');

    if (segmens.length === 0) {
        return res.status(422).json({
            status: "fail",
            message: "Tidak dapat melakukan snapshot. Belum ada data segmen realisasi pada wilayah dan tahun anggaran ini."
        });
    }

    // 2. Validasi: Seluruh segmen WAJIB 'terverifikasi' jika status laporan adalah 'Final'
    if (status === 'Final') {
        const unverifiedSegmens = segmens.filter(s => s.status_verifikasi !== 'terverifikasi');
        if (unverifiedSegmens.length > 0) {
            return res.status(422).json({
                status: "fail",
                message: `Tidak dapat melakukan snapshot Berita Acara. Terdapat ${unverifiedSegmens.length} segmen yang belum disetujui (status_verifikasi harus 'terverifikasi').`
            });
        }
    }

    // 3. Eksekusi Snapshot / Upsert dalam Database Transaction
    let savedLaporan = null;
    await db.transaction(async (trx) => {
        let laporan = await trx('monitoring_laporan')
            .where({ id_desa, tahun_anggaran })
            .first();

        const totalRealisasiPanjang = segmens.reduce((acc, s) => acc + parseFloat(s.panjang_m || 0), 0);

        if (laporan) {
            // Update dokumen eksisting (Re-Snapshot)
            await trx('monitoring_laporan')
                .where({ id: laporan.id })
                .update({
                    nomor_ba: nomor_ba || laporan.nomor_ba,
                    sumber_dana: sumber_dana || laporan.sumber_dana,
                    rencana_panjang: rencana_panjang || laporan.rencana_panjang,
                    realisasi_panjang: totalRealisasiPanjang,
                    status: status,
                    tipe_kode: tipe_kode || laporan.tipe_kode,
                    updated_at: new Date()
                });
            savedLaporan = await trx('monitoring_laporan').where({ id: laporan.id }).first();
        } else {
            // Insert dokumen baru (First Snapshot)
            const [inserted] = await trx('monitoring_laporan')
                .insert({
                    id_desa,
                    id_kecamatan: req.body.id_kecamatan || segmens[0]?.id_kecamatan,
                    tahun_anggaran,
                    nomor_ba: nomor_ba || `050/XXX/412.302/${tahun_anggaran}`,
                    sumber_dana: sumber_dana || 'BKK',
                    rencana_panjang: rencana_panjang || 0,
                    realisasi_panjang: totalRealisasiPanjang,
                    status: status,
                    tipe_kode: tipe_kode || 'jalan',
                    created_by: req.user.id
                })
                .returning('*');
            savedLaporan = inserted;
        }

        // 4. Re-link Junction Tabel Segmen
        await trx('monitoring_laporan_segmen').where({ id_laporan: savedLaporan.id }).delete();
        const junctionRows = segmens.map(s => ({
            id_laporan: savedLaporan.id,
            id_segmen: s.id,
            panjang_m: parseFloat(s.panjang_m || 0)
        }));
        await trx('monitoring_laporan_segmen').insert(junctionRows);
    });

    return res.json({
        status: "success",
        message: "Berita Acara Monitoring berhasil disahkan dan seluruh segmen terkunci.",
        data: savedLaporan,
        result: savedLaporan
    });
}
```

---

## 🧪 4. Kriteria Pengujian (Acceptance Criteria)

- [ ] Jika ada 1 segmen berstatus `verifikasi_kecamatan` atau `verifikasi_bappeda`, request `POST /v1/laporan` (status: Final) ditolak dengan status 422.
- [ ] Jika seluruh segmen berstatus `terverifikasi`, request `POST /v1/laporan` (status: Final) berhasil 100% dan mengembalikan Berita Acara yang sah.
- [ ] Snapshot ulang (*Re-Snapshot*) pada dokumen yang berstatus `Draft` berhasil memperbarui dokumen menjadi `Final` dan merefresh tabel `monitoring_laporan_segmen`.
- [ ] Total `realisasi_panjang` di dokumen Berita Acara akurat sesuai penjumlahan panjang seluruh segmen yang terverifikasi.

Terima kasih atas kerja samanya!
