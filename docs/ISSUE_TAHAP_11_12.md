# Issue: Tahap 11 – Snap & Tahap 12 – Delete

> Referensi arsitektur: [GIS_ARCHITECTURE.md §27](../GIS_ARCHITECTURE.md#27-tahapan-implementasi)

---

## 🧭 Konteks Urutan Implementasi

```
08. Save / PATCH  ✅
09. Cancel / Reset ✅
10. Draw / Create  ✅
──────────────────────
11. Snap           ⚠️  Parsial — perlu perbaikan & integrasi
12. Delete         ❌  Belum diimplementasikan
──────────────────────
13. Split          ❌
14. Merge          ❌
15. Extend         ❌
```

---

## 📋 Tahap 11 — Snap

### Status Saat Ini

| Komponen | Status | Catatan |
|---|---|---|
| `snapInteraction.ts` | ✅ Ada | `createSnapInteraction()` sudah dibuat |
| `EditorController` `case 'snap'` | ✅ Ada | Interaction ditambahkan ke map |
| `EditorToolbar` | ✅ Ada | Tombol **Snap** tampil sesuai capability |
| Snap aktif bersamaan dengan Draw/Modify | ❌ Belum | Snap harus berjalan **berbarengan**, bukan menggantikan interaksi lain |
| Snap ke Reference Layer (MVT/tile) | ❌ Belum | Saat ini hanya snap ke editable VectorSource |
| State snap (on/off) | ❌ Belum | Tidak ada state toggle; Snap saat ini hanya aktif sebagai satu-satunya tool |

### Masalah Utama

Snap di OpenLayers bukan tool eksklusif — ia adalah **helper interaction** yang harus hidup **berdampingan** dengan Draw atau Modify secara simultan.

Contoh alur yang benar:

```
User aktifkan Draw
      ↓
EditorController:
  - addInteraction(DrawInteraction)
  - addInteraction(SnapInteraction)   ← berjalan bersamaan
```

Implementasi saat ini memperlakukan Snap sebagai tool tunggal yang menggantikan interaksi lain — ini **salah secara konseptual**.

### Pekerjaan yang Harus Dilakukan

#### 1. Refactor `EditorController` — Snap sebagai Secondary Interaction

```typescript
// EditorController.ts
private snapInteraction: Snap | null = null;
private snapEnabled: boolean = false;

public setSnapEnabled(enabled: boolean): void {
  this.snapEnabled = enabled;
  if (enabled) {
    this.attachSnapIfPossible();
  } else {
    this.detachSnap();
  }
}

private attachSnapIfPossible(): void {
  // Snap hanya dipasang jika ada primary interaction aktif (draw/modify)
  if (!this.map || !this.source) return;
  if (this.snapInteraction) return; // sudah ada

  this.snapInteraction = createSnapInteraction({ source: this.source });
  this.map.addInteraction(this.snapInteraction);
}

private detachSnap(): void {
  if (this.snapInteraction && this.map) {
    this.map.removeInteraction(this.snapInteraction);
    this.snapInteraction = null;
  }
}
```

#### 2. Hapus `case 'snap'` dari `initInteractionForTool()`

`snap` tidak boleh menjadi tool utama. Hapus case tersebut, gantikan dengan mekanisme toggle di atas.

#### 3. Update `EditorToolbar` — Snap sebagai Toggle, bukan Tool Eksklusif

```tsx
// Snap: checkbox/toggle di toolbar, bukan tombol tool eksklusif
<SnapToggle
  enabled={isSnapEnabled}
  onToggle={() => controller.setSnapEnabled(!isSnapEnabled)}
  disabled={!capabilities?.snap}
/>
```

#### 4. Tambahkan State Snap ke Store

```typescript
// editorStore.ts — tambahkan field
isSnapEnabled: boolean;
setSnapEnabled: (val: boolean) => void;
```

#### 5. Auto-detach Snap saat Tool Berganti ke Select

Saat kembali ke `select`, Snap tidak relevan dan harus dilepas.

---

### File yang Diubah (Tahap 11)

| File | Aksi |
|---|---|
| `EditorController.ts` | Refactor: Snap sebagai secondary interaction, tambah `setSnapEnabled()` |
| `editorStore.ts` | Tambah `isSnapEnabled`, `setSnapEnabled` |
| `EditorToolbar.tsx` | Ubah Snap menjadi toggle button |
| `MapEditor.tsx` | Hubungkan `isSnapEnabled` dari store ke controller |
| `useSnapToggle.ts` | [NEW] Hook opsional untuk manajemen snap state |

---

## 🗑️ Tahap 12 — Delete

### Status Saat Ini

| Komponen | Status | Catatan |
|---|---|---|
| `EditorController` `case 'delete'` | ❌ Tidak ada | Masuk ke `default:` yang diam-diam diabaikan |
| API `DELETE /v1/infrastruktur/:tipe/:id` | ❌ Belum ada di `editorApi.ts` | Perlu ditambahkan |
| `useDeleteFeature` hook | ❌ Belum ada | |
| UI konfirmasi hapus | ❌ Belum ada | |
| Tombol Delete di toolbar | ✅ Tampil | Sudah di toolbar tapi tidak berfungsi |

### Alur Delete yang Diinginkan

```
User klik tool Delete di toolbar (capabilities.delete = true)
      ↓
Guard: harus ada selectedFeatureId
      ↓
Tampilkan ConfirmDialog ("Hapus feature ini?")
      ↓
User konfirmasi
      ↓
DELETE /v1/infrastruktur/{tipe}/{id}
      ↓
Berhasil:
  - clearLayer()
  - setSelectedFeatureId(null)
  - resetDraft()
  - toast.success("Feature berhasil dihapus")
      ↓
Gagal:
  - toast.error(...)
  - Tetap di state sebelumnya
```

### Pekerjaan yang Harus Dilakukan

#### 1. API — `deleteInfrastructureFeature()`

File: `editorApi.ts`

```typescript
/**
 * Menghapus feature infrastruktur berdasarkan tipe dan ID.
 * DELETE /v1/infrastruktur/{tipeKode}/{id}
 */
export async function deleteInfrastructureFeature(
  infrastructureTypeId: string,
  featureId: string
): Promise<void> {
  const baseUrl = getBaseUrl();
  await apiClient.delete(
    `${baseUrl}/v1/infrastruktur/${encodeURIComponent(infrastructureTypeId)}/${encodeURIComponent(featureId)}`
  );
}
```

> **PENTING:** Pastikan backend endpoint `DELETE /v1/infrastruktur/{tipe}/{id}` sudah tersedia dan melakukan soft-delete atau hard-delete sesuai kebijakan.

#### 2. Hook — `useDeleteFeature`

File: `app/features/editor/hooks/useDeleteFeature.ts` [NEW]

```typescript
export interface DeleteFeatureOptions {
  featureId: string | null;
  infrastructureTypeId?: string | null;
  onDeleteSuccess?: () => void;
}

export function useDeleteFeature(options: DeleteFeatureOptions) {
  const { featureId, infrastructureTypeId, onDeleteSuccess } = options;
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const requestDelete = useCallback(() => {
    if (!featureId) return;
    setShowConfirm(true);
  }, [featureId]);

  const confirmDelete = useCallback(async () => {
    if (!featureId || !infrastructureTypeId) return;
    setIsDeleting(true);
    try {
      await deleteInfrastructureFeature(infrastructureTypeId, featureId);
      toast.success('Feature berhasil dihapus.');
      onDeleteSuccess?.();
    } catch (e) {
      toast.error('Gagal menghapus feature.');
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  }, [featureId, infrastructureTypeId, onDeleteSuccess]);

  const cancelDelete = useCallback(() => setShowConfirm(false), []);

  return { requestDelete, confirmDelete, cancelDelete, isDeleting, showConfirm };
}
```

#### 3. `EditorController` — Tambah Callback `onDeleteRequest`

```typescript
// EditorController.ts
public onDeleteRequest?: () => void;

// Di initInteractionForTool() tambahkan case 'delete':
case 'delete': {
  // Delete bukan interaction OpenLayers — ia event/callback
  // Segera trigger callback, lalu kembali ke select
  this.onDeleteRequest?.();
  // Re-activate select setelah trigger delete
  setTimeout(() => this.activate('select'), 0);
  break;
}
```

#### 4. `MapEditor.tsx` — Integrasi `useDeleteFeature`

```tsx
// MapEditor.tsx
const { requestDelete, confirmDelete, cancelDelete, isDeleting, showConfirm } = useDeleteFeature({
  featureId: selectedFeatureId,
  infrastructureTypeId: activeContext?.infrastructureTypeId,
  onDeleteSuccess: () => {
    controllerRef.current?.clearLayer();
    forceReset();
  },
});

// Sambungkan ke controller
useEffect(() => {
  if (controllerRef.current) {
    controllerRef.current.onDeleteRequest = requestDelete;
  }
}, [requestDelete]);

// Render: ConfirmDialog kedua khusus delete
<ConfirmDialog
  open={showConfirm}
  title="Hapus Feature?"
  description="Feature yang dihapus tidak dapat dikembalikan. Lanjutkan?"
  onConfirm={confirmDelete}
  onCancel={cancelDelete}
/>
```

#### 5. `EditorToolbar.tsx` — Guard: Delete disabled jika tidak ada feature terpilih

```tsx
// Tambahkan kondisi disabled untuk Delete:
const isDisabled =
  (tool.id === 'modify' && !selectedFeatureId) ||
  (tool.id === 'delete' && !selectedFeatureId);  // ← tambahkan ini
```

---

### File yang Diubah (Tahap 12)

| File | Aksi |
|---|---|
| `editorApi.ts` | Tambah `deleteInfrastructureFeature()` |
| `useDeleteFeature.ts` | [NEW] Hook delete dengan confirm state |
| `EditorController.ts` | Tambah `onDeleteRequest` callback, tambah `case 'delete'` |
| `MapEditor.tsx` | Integrasi `useDeleteFeature`, sambungkan `ConfirmDialog` |
| `EditorToolbar.tsx` | Guard: tombol Delete disabled jika tidak ada `selectedFeatureId` |

---

## 🔗 Ketergantungan Antar Tahap

```
Tahap 11 (Snap)
  └── Harus selesai sebelum: Tahap 13 (Split) — Split memerlukan snap presisi

Tahap 12 (Delete)
  └── Tidak blocking tahap berikutnya, tapi API backend harus ready
```

---

## ✅ Kriteria Selesai

### Tahap 11 — Snap

- [ ] Snap berjalan **bersamaan** dengan Draw (tidak menggantikan)
- [ ] Snap berjalan **bersamaan** dengan Modify
- [ ] Toggle Snap on/off via toolbar tanpa menghentikan tool aktif
- [ ] Snap dilepas otomatis saat kembali ke tool Select
- [ ] `isSnapEnabled` tersimpan di EditorStore

### Tahap 12 — Delete

- [ ] Klik tombol Delete di toolbar → muncul dialog konfirmasi
- [ ] Tombol Delete **disabled** jika tidak ada feature yang dipilih
- [ ] Setelah konfirmasi: `DELETE` request dikirim ke API
- [ ] Berhasil: layer dibersihkan, state di-reset, toast sukses
- [ ] Gagal: toast error, state tidak berubah
- [ ] Delete tidak tersedia (disabled) untuk tipe yang `capabilities.delete = false`
