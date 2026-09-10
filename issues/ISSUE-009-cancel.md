# ISSUE-009 · Tahap 9: Cancel / Reset

**Label:** `enhancement` · `editor` · `cancel` · `reset` · `ux`
**Milestone:** Phase 9 — Cancel / Reset
**Depends on:** [ISSUE-008](./ISSUE-008-save.md)
**Referensi:** [GIS_ARCHITECTURE.md](../GIS_ARCHITECTURE.md) — Bab 13, 18, 27 (Tahap 09)

---

## 🎯 Tujuan

Mengimplementasikan **alur Cancel / Reset yang aman dan konsisten** — mencakup semua
skenario ketika user membatalkan pengeditan, menutup panel, berpindah feature, atau
berpindah tool, saat `isDirty = true`.

Tahap ini memastikan tidak ada perubahan draft yang "bocor" antar sesi editing.

---

## 📋 Latar Belakang

Dari arsitektur (§18 Draft State):

```
User Editing
     ↓
Draft (isDirty = true)
     ↓
User Batal / Tutup / Pindah Feature
     ↓
Konfirmasi (jika isDirty)
     ↓
Reset Draft → isDirty = false
     ↓
State bersih (siap untuk sesi editing baru)
```

Skenario cancel yang harus ditangani:

| Skenario | Trigger | Behavior |
|----------|---------|----------|
| Klik `[Batal]` di form | `FeatureForm.onCancel` | Jika dirty → ConfirmDialog → reset |
| Klik `[Batal]` di SaveBar | `SaveBar.onCancel` | Jika dirty → ConfirmDialog → reset |
| Klik tombol `[X]` di FeatureInfo | `FeatureInfo.onClose` | Jika dirty → ConfirmDialog → reset |
| Klik feature lain di peta | Select interaction | Jika dirty → ConfirmDialog → ganti feature |
| Ganti tool aktif | Toolbar tool click | Jika dirty → ConfirmDialog → ganti tool |
| Unmount MapEditor | React unmount | Paksa reset tanpa konfirmasi |

---

## ✅ Task List

### 1. Buat `useCancelEditing` Hook

Hook yang mengenkapsulasi logika cancel/reset sehingga bisa dipakai dari berbagai tempat.

**File:** `app/features/editor/hooks/useCancelEditing.ts` (BARU)

```ts
export interface CancelEditingOptions {
  /** Callback dipanggil setelah reset selesai */
  onAfterReset?: () => void;
  /** Callback dipanggil setelah user konfirmasi cancel feature selection */
  onAfterDeselect?: () => void;
}

export function useCancelEditing(options?: CancelEditingOptions) {
  return {
    // State
    showConfirmDialog,       // boolean
    pendingAction,           // 'cancel' | 'deselect' | 'switch-tool' | null

    // Actions
    requestCancel,           // () => void — minta cancel (tampilkan confirm jika dirty)
    requestDeselect,         // () => void — minta deselect feature
    confirmCancel,           // () => void — konfirmasi → reset
    dismissConfirm,          // () => void — tutup dialog tanpa reset

    // Immediate actions (tanpa confirm)
    forceReset,              // () => void — reset paksa (untuk unmount)
  };
}
```

Flow di dalam hook:

```
requestCancel()
     ↓
isDirty === true → setShowConfirmDialog(true)
isDirty === false → langsung reset + onAfterReset()

confirmCancel()
     ↓
resetDraft()
setEditingFeatureId(null)
setIsEditingForm(false) ← via callback ke MapEditor
clearEditableLayer()   ← via EditorController callback
onAfterReset?.()
```

**Aturan:**
- Selalu cek `isDirty` dari `useEditorStore.getState()` — bukan dari props
- `forceReset()` tidak perlu cek `isDirty` — digunakan saat component unmount
- Setelah reset: `clearEditableLayer()` dipanggil agar layer peta ikut bersih

---

### 2. Sinkronisasi `clearEditableLayer()` Saat Reset

Saat user cancel/reset, geometry di editable layer harus dihapus dari peta.

**File:** `app/features/editor/hooks/useCancelEditing.ts`

```ts
// Di dalam confirmCancel / forceReset:
clearEditableLayer();       // Hapus feature dari OL layer
controllerRef.current?.deactivate(); // Nonaktifkan tool aktif
```

Karena `useCancelEditing` tidak punya akses langsung ke controller, tambahkan callback:

```ts
export interface CancelEditingOptions {
  onAfterReset?: () => void;
  onClearMap?: () => void;   // ← MapEditor menyediakan ini
}
```

Di `MapEditor.tsx`:

```tsx
const { requestCancel, confirmCancel, dismissConfirm, showConfirmDialog } = useCancelEditing({
  onClearMap: () => {
    clearEditableLayer(controllerRef.current?.getSource());
    controllerRef.current?.deactivate();
  },
  onAfterReset: () => {
    setIsEditingForm(false);
  },
});
```

---

### 3. Tangani Cancel Saat Ganti Feature di Peta

Ketika user mengklik feature baru di peta sementara `isDirty = true`, jangan langsung ganti feature — tampilkan konfirmasi dulu.

**File:** `app/features/editor/hooks/useEditor.ts` (update)

Tambahkan `pendingFeatureId` state dan logika intercept di `onFeatureSelect` controller callback:

```ts
// Di initEditor():
controller.onFeatureSelect = (id) => {
  const { isDirty } = useEditorStore.getState();
  if (isDirty && id !== null) {
    // Tunda pemilihan — biarkan useCancelEditing yang menangani
    setPendingFeatureId(id);
    requestCancelForSwitch();
  } else {
    setSelectedFeatureId(id);
  }
};
```

> Alternatif yang lebih sederhana: handle di level `MapEditor.tsx` dengan menyimpan
> `pendingFeatureId` sebagai local state dan menampilkan ConfirmDialog.

---

### 4. Tangani Cancel Saat Ganti Tool

Ketika user mengklik tool lain di toolbar saat `isDirty = true`:

**File:** `app/components/editor/EditorToolbar.tsx` (update)

```tsx
const handleToolClick = (tool: EditorTool) => {
  if (isDirty && tool !== activeTool) {
    requestCancelForSwitchTool(tool);
    return;
  }
  if (isActive) {
    deactivateTool();
  } else {
    activateTool(tool.id);
  }
};
```

---

### 5. Pastikan `ConfirmDialog` Sudah Reusable

`ConfirmDialog` sudah dibuat di Tahap 6. Pastikan props `title`, `description`,
`confirmLabel`, `cancelLabel` bisa disesuaikan untuk berbagai skenario:

| Skenario | Title | Description |
|----------|-------|-------------|
| Cancel edit form | "Batalkan Perubahan?" | "Perubahan atribut/geometri akan hilang." |
| Deselect feature | "Batal Pilih Feature?" | "Perubahan yang belum disimpan akan hilang." |
| Switch tool | "Ganti Tool?" | "Perubahan aktif akan dibatalkan." |

> `ConfirmDialog` sudah mendukung props ini dari Tahap 6, tidak perlu perubahan.

---

### 6. Reset Saat Component Unmount

Pastikan saat `MapEditor` di-unmount, semua state editor direset.

**File:** `app/components/editor/MapEditor.tsx` (update)

```tsx
useEffect(() => {
  return () => {
    // Cleanup saat unmount — tidak perlu confirm
    clearEditableLayer();
    resetEditor();
    controllerRef.current = null;
  };
}, []);
```

> `resetEditor()` sudah ada — pastikan juga `clearEditableLayer()` dipanggil.

---

### 7. Tambah `clearEditableLayer` ke EditorController

Untuk kemudahan akses dari hook, tambahkan method `clearLayer()` ke `EditorController`:

**File:** `app/features/editor/core/EditorController.ts` (update)

```ts
public clearLayer(): void {
  if (this.source) {
    this.source.clear();
  }
}
```

---

### 8. Update Barrel Export

```ts
// app/features/editor/index.ts — tambahkan
export * from './hooks/useCancelEditing';
```

---

## 🚫 Larangan pada Tahap Ini

- ❌ Jangan langsung reset saat user klik feature lain — harus lewat confirm jika dirty
- ❌ Jangan skip `clearEditableLayer()` saat reset — layer peta harus ikut bersih
- ❌ Jangan buat state cancel yang berbeda per komponen — gunakan `useCancelEditing` terpusat
- ❌ Jangan reset sebelum user konfirmasi (kecuali unmount)
- ❌ Jangan hardcode pesan dialog — gunakan props `title`/`description`

---

## 🧪 Kriteria Selesai (Definition of Done)

- [x] Klik `[Batal]` di form/SaveBar saat `isDirty = true` → ConfirmDialog tampil
- [x] Konfirmasi → `resetDraft()` + `clearEditableLayer()` + `isDirty = false`
- [x] Dismiss → kembali ke form tanpa perubahan
- [x] Klik feature lain di peta saat dirty → ConfirmDialog → setelah confirm: load feature baru
- [x] Ganti tool saat dirty → ConfirmDialog → setelah confirm: ganti tool
- [x] Unmount MapEditor → `resetEditor()` + `clearEditableLayer()` paksa (tanpa confirm)
- [x] Tidak ada "kebocoran" state dari satu sesi editing ke sesi berikutnya
- [x] `npx tsc --noEmit` tidak menghasilkan error

---

## 📌 Catatan

Tahap ini **belum** membutuhkan:
- Draw / Create baru (itu Tahap 10)
- Snap (itu Tahap 11)
- Delete (itu Tahap 12)

Fokus Tahap 9 adalah **memastikan state selalu bersih setelah sesi editing dibatalkan** —
tidak ada data draft yang tertinggal di store atau di editable layer.

---

**Dibuat:** 2026-08-14
**Referensi Arsitektur:** GIS_ARCHITECTURE.md §13, §18, §27 Tahap 09
