import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Edit2, Trash2, ShieldAlert, Tag } from "lucide-react";
import { useAuth } from "~/contexts/auth-context";
import { usulanKategoriService } from "~/features/usulan-desa/services/usulan-kategori.service";
import { masterOpdService } from "~/features/usulan-desa/services/master-opd.service";
import type { UsulanKategori } from "~/features/usulan-desa/types/usulan-kategori.types";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
  return [
    { title: "Kategori Usulan - MELAROSA" },
    { name: "description", content: "Manajemen daftar kategori usulan pembangunan desa" },
  ];
};

export default function UsulanKategoriIndex() {
  const { user } = useAuth();
  
  // Access control
  const isAllowed = user?.role === "super_admin" || user?.role === "operator_bappeda";

  // State
  const [data, setData] = useState<UsulanKategori[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog forms state
  const [isOpenForm, setIsOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNama, setFormNama] = useState("");
  const [formKode, setFormKode] = useState("");
  const [formDeskripsi, setFormDeskripsi] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formOpdId, setFormOpdId] = useState("");
  const [opdList, setOpdList] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog delete state
  const [deleteItem, setDeleteItem] = useState<UsulanKategori | null>(null);

  // Fetch Data
  const fetchData = useCallback(async () => {
    if (!isAllowed) return;
    setIsLoading(true);
    try {
      const response = await usulanKategoriService.getAll({
        search,
        is_active: statusFilter,
        all: true,
        limit: "all"
      });
      const sorted = [...response].sort((a, b) => a.nama.localeCompare(b.nama));
      setData(sorted);
    } catch (error: any) {
      toast.error(error.message || "Gagal mengambil data kategori");
    } finally {
      setIsLoading(false);
    }
  }, [isAllowed, search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch active OPDs
  useEffect(() => {
    if (isAllowed) {
      masterOpdService.getAll({ active_only: true })
        .then(setOpdList)
        .catch((err) => console.error("Gagal memuat OPD:", err));
    }
  }, [isAllowed]);

  // Lock HTML and Body elements scroll to prevent page-level vertical scrolling
  useEffect(() => {
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
    };
  }, []);

  // If not allowed, show Access Denied
  if (!isAllowed) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md border border-border bg-card rounded-xl p-6 text-center space-y-4 shadow-xs">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted border border-border mx-auto">
            <ShieldAlert className="w-5 h-5 text-destructive" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold tracking-tight">Akses Ditolak</h1>
            <p className="text-xs text-muted-foreground leading-normal max-w-xs mx-auto">
              Anda tidak memiliki izin yang cukup untuk mengakses halaman manajemen kategori usulan ini.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Handle Form Actions
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormNama("");
    setFormKode("");
    setFormDeskripsi("");
    setFormIsActive(true);
    setFormOpdId("");
    setIsOpenForm(true);
  };

  const handleOpenEdit = (kategori: UsulanKategori) => {
    setEditingId(kategori.id);
    setFormNama(kategori.nama);
    setFormKode(kategori.kode || "");
    setFormDeskripsi(kategori.deskripsi || "");
    setFormIsActive(kategori.is_active);
    setFormOpdId(kategori.opd_id || "");
    setIsOpenForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) {
      toast.error("Nama kategori wajib diisi!");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        nama: formNama,
        kode: formKode || undefined,
        deskripsi: formDeskripsi || undefined,
        is_active: formIsActive,
        opd_id: formOpdId || undefined
      };

      if (editingId) {
        await usulanKategoriService.update(editingId, payload);
        toast.success("Kategori berhasil diperbarui!");
      } else {
        await usulanKategoriService.create(payload);
        toast.success("Kategori baru berhasil dibuat!");
      }
      setIsOpenForm(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan kategori");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setIsSubmitting(true);
    try {
      await usulanKategoriService.delete(deleteItem.id);
      toast.success("Kategori berhasil dihapus!");
      setDeleteItem(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus kategori");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col gap-4 p-4 bg-background dark:bg-slate-950 overflow-hidden">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 shrink-0 pb-1 border-b border-slate-100 dark:border-slate-800/50">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Kategori Usulan
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
            Manajemen daftar kategori pembangunan masyarakat desa.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Kategori</span>
        </Button>
      </div>

      {/* Main Table Card */}
      <div className="flex-1 min-h-0 flex flex-col mb-2">
        <Card className="gap-0 py-0 overflow-hidden border dark:border-slate-800 bg-white dark:bg-slate-950 relative flex flex-col flex-1 min-h-0">
          {/* Custom Search & Filters Toolbar */}
          <div className="p-4 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-slate-50/30 dark:bg-slate-900/10">
            <div className="relative w-full max-w-xs sm:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cari nama atau kode kategori..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 w-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background dark:bg-slate-950 px-3 py-1 text-xs font-medium shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">Semua Status</option>
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>
            </div>
          </div>

          <CardContent className="p-0 overflow-hidden flex-1 min-h-0 flex flex-row relative">
            <div className="flex-1 overflow-auto custom-scrollbar [&_[data-slot=table-container]]:overflow-visible">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-20 border-b border-border shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
                  <TableRow>
                    <TableHead className="text-center font-semibold sticky top-0 left-0 z-30 bg-slate-50 dark:bg-slate-900 border-r shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] w-[100px] min-w-[100px]">Aksi</TableHead>
                    <TableHead className="font-semibold min-w-[200px]">Nama Kategori</TableHead>
                    <TableHead className="font-semibold min-w-[120px]">Kode</TableHead>
                    <TableHead className="font-semibold min-w-[200px]">OPD Verifikator</TableHead>
                    <TableHead className="font-semibold min-w-[250px]">Deskripsi</TableHead>
                    <TableHead className="font-semibold text-center w-[110px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24">
                        <div className="p-4 space-y-4">
                          <Skeleton className="h-10 w-full" />
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center p-6 space-y-2">
                          <Tag className="w-8 h-8 text-muted-foreground/50" />
                          <div className="space-y-0.5">
                            <p className="text-xs font-medium">Kategori tidak ditemukan</p>
                            <p className="text-[10px] text-muted-foreground">Silakan tambah kategori baru atau sesuaikan filter Anda.</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((kategori) => (
                      <TableRow key={kategori.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
                        <TableCell className="w-[100px] min-w-[100px] p-0 relative sticky left-0 border-r border-slate-200 dark:border-slate-800 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] z-10 bg-white dark:bg-slate-950 group-hover:bg-slate-50 dark:group-hover:bg-slate-900 transition-colors">
                          <div className="flex flex-row items-center justify-center gap-1.5 h-12 w-full px-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0 border-slate-200 dark:border-slate-800 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 shrink-0"
                              onClick={() => handleOpenEdit(kategori)}
                              title="Edit Kategori"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0 border-slate-200 dark:border-slate-800 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0"
                              onClick={() => setDeleteItem(kategori)}
                              title="Hapus Kategori"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                          {kategori.nama}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-slate-650 dark:text-slate-355">
                          {kategori.kode ? (
                            <span className="bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-700/50">
                              {kategori.kode}
                            </span>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                          {kategori.opd ? (
                            <div className="flex items-center gap-1.5">
                              <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-mono border border-blue-200/50 dark:border-blue-800/50">
                                {kategori.opd.kode}
                              </span>
                              <span className="truncate">{kategori.opd.nama}</span>
                            </div>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-normal break-words">
                          {kategori.deskripsi || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {kategori.is_active ? (
                            <span className="inline-flex items-center bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded text-[10px] font-semibold">
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                              Nonaktif
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>

          {/* Footer Summary */}
          <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-slate-50/30 dark:bg-slate-900/10 shrink-0">
            <span>Menampilkan <strong className="font-semibold text-foreground">{data.length}</strong> data kategori usulan</span>
          </div>
        </Card>
      </div>

      {/* Form Modal Dialog */}
      <Dialog open={isOpenForm} onOpenChange={setIsOpenForm}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold">
                {editingId ? "Edit Kategori Usulan" : "Tambah Kategori Usulan"}
              </DialogTitle>
              <DialogDescription className="text-[11px]">
                Lengkapi rincian kategori untuk memetakan jenis usulan masyarakat desa.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="form-nama" className="text-xs">Nama Kategori</Label>
                <Input
                  id="form-nama"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="e.g. Pembangunan Jembatan"
                  className="h-8.5 text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="form-kode" className="text-xs">Kode Kategori (Unik)</Label>
                <Input
                  id="form-kode"
                  value={formKode}
                  onChange={(e) => setFormKode(e.target.value)}
                  placeholder="e.g. INFRA_JEMBATAN"
                  className="h-8.5 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="form-opd" className="text-xs">OPD Verifikator</Label>
                <select
                  id="form-opd"
                  value={formOpdId}
                  onChange={(e) => setFormOpdId(e.target.value)}
                  className="w-full h-8.5 rounded-md border border-input bg-background dark:bg-slate-950 px-3 py-1.5 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Pilih OPD Verifikator</option>
                  {opdList.map((opd) => (
                    <option key={opd.id} value={opd.id}>
                      [{opd.kode}] {opd.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="form-deskripsi" className="text-xs">Deskripsi</Label>
                <textarea
                  id="form-deskripsi"
                  value={formDeskripsi}
                  onChange={(e) => setFormDeskripsi(e.target.value)}
                  placeholder="Tulis penjelasan singkat mengenai kategori ini..."
                  className="w-full min-h-20 rounded-md border border-input bg-background dark:bg-slate-950 px-3 py-2 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="flex items-center justify-between py-1 border-t border-border/40 pt-3">
                <div className="space-y-0.5">
                  <Label htmlFor="form-status" className="text-xs font-medium cursor-pointer">Status Kategori</Label>
                  <p className="text-[10px] text-muted-foreground">Kategori nonaktif tidak muncul saat pendaftaran usulan.</p>
                </div>
                <Switch
                  id="form-status"
                  checked={formIsActive}
                  onCheckedChange={setFormIsActive}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpenForm(false)}
                className="h-8 text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Kategori</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus kategori usulan{" "}
              <span className="font-semibold text-foreground">{deleteItem?.nama}</span>?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              {isSubmitting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
