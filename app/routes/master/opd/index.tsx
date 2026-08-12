import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Edit2, Trash2, ShieldAlert, Building2 } from "lucide-react";
import { useAuth } from "~/contexts/auth-context";
import { masterOpdService } from "~/features/usulan-desa/services/master-opd.service";
import type { MasterOpd } from "~/features/usulan-desa/types/usulan-desa.types";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Switch } from "~/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
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
    { title: "Master OPD - MELAROSA" },
    { name: "description", content: "Manajemen daftar Organisasi Perangkat Daerah" },
  ];
};

export default function MasterOpdIndex() {
  const { user } = useAuth();
  
  // Access control
  const isAllowed = user?.role === "super_admin" || user?.role === "operator_bappeda";

  // State
  const [data, setData] = useState<MasterOpd[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog forms state
  const [isOpenForm, setIsOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNama, setFormNama] = useState("");
  const [formKode, setFormKode] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog delete state
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch Data
  const fetchData = useCallback(async () => {
    if (!isAllowed) return;
    setIsLoading(true);
    try {
      const active_only = statusFilter === "true" ? true : statusFilter === "false" ? false : undefined;
      const response = await masterOpdService.getAll({
        search: search || undefined,
        active_only
      });
      const sorted = [...response].sort((a, b) => a.nama.localeCompare(b.nama));
      setData(sorted);
    } catch (error: any) {
      toast.error(error.message || "Gagal mengambil data OPD");
    } finally {
      setIsLoading(false);
    }
  }, [isAllowed, search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
              Anda tidak memiliki izin yang cukup untuk mengakses halaman manajemen master OPD ini.
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
    setFormIsActive(true);
    setIsOpenForm(true);
  };

  const handleOpenEdit = (opd: MasterOpd) => {
    setEditingId(opd.id);
    setFormNama(opd.nama);
    setFormKode(opd.kode);
    setFormIsActive(opd.is_active);
    setIsOpenForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) {
      toast.error("Nama OPD wajib diisi!");
      return;
    }
    if (!formKode.trim()) {
      toast.error("Kode OPD wajib diisi!");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        nama: formNama.trim(),
        kode: formKode.trim().toUpperCase(),
        is_active: formIsActive
      };

      if (editingId) {
        await masterOpdService.update(editingId, payload);
        toast.success("OPD berhasil diperbarui!");
      } else {
        await masterOpdService.create(payload);
        toast.success("OPD baru berhasil dibuat!");
      }
      setIsOpenForm(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan OPD");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (id: string) => {
    setDeletingId(id);
    setIsOpenDelete(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsSubmitting(true);
    try {
      const success = await masterOpdService.delete(deletingId);
      if (success) {
        toast.success("OPD berhasil dihapus!");
        setIsOpenDelete(false);
        fetchData();
      } else {
        toast.error("Gagal menghapus OPD.");
      }
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus OPD");
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
            Master OPD
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
            Manajemen daftar Organisasi Perangkat Daerah teknis pemverifikasi usulan.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah OPD</span>
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau kode OPD..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="w-full sm:w-40">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-9 rounded-lg border border-input bg-background dark:bg-slate-950 px-3 py-1 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">Semua Status</option>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <Card className="flex-1 min-h-0 flex flex-col border dark:border-slate-800 bg-white dark:bg-slate-950">
        <CardContent className="flex-1 min-h-0 overflow-auto p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <p className="text-xs text-muted-foreground">Memuat data OPD...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-2">
              <Building2 className="w-8 h-8 text-muted-foreground/50" />
              <div className="space-y-0.5">
                <p className="text-xs font-medium">OPD tidak ditemukan</p>
                <p className="text-[10px] text-muted-foreground">Silakan tambah OPD baru atau sesuaikan filter Anda.</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Nama OPD</TableHead>
                  <TableHead className="w-[200px] text-xs">Kode OPD</TableHead>
                  <TableHead className="w-[120px] text-xs text-center">Status</TableHead>
                  <TableHead className="w-[100px] text-xs text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((opd) => (
                  <TableRow key={opd.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-xs text-slate-850 dark:text-slate-200">{opd.nama}</TableCell>
                    <TableCell className="font-mono text-[10px] text-slate-650 dark:text-slate-355 font-bold">
                      {opd.kode}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={opd.is_active ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                        {opd.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(opd)}
                          className="h-7 w-7 rounded-md hover:bg-muted"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete(opd.id)}
                          className="h-7 w-7 rounded-md hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Form Modal Dialog */}
      <Dialog open={isOpenForm} onOpenChange={setIsOpenForm}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold">
                {editingId ? "Edit Master OPD" : "Tambah Master OPD"}
              </DialogTitle>
              <DialogDescription className="text-[11px]">
                Lengkapi rincian Organisasi Perangkat Daerah teknis.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="form-nama" className="text-xs">Nama OPD</Label>
                <Input
                  id="form-nama"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="e.g. Dinas Pekerjaan Umum dan Penataan Ruang"
                  className="h-8.5 text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="form-kode" className="text-xs">Kode OPD (Unik)</Label>
                <Input
                  id="form-kode"
                  value={formKode}
                  onChange={(e) => setFormKode(e.target.value)}
                  placeholder="e.g. DPUPR"
                  className="h-8.5 text-xs font-mono"
                  required
                />
              </div>
              <div className="flex items-center justify-between py-1 border-t border-border/40 pt-3">
                <div className="space-y-0.5">
                  <Label htmlFor="form-status" className="text-xs font-medium cursor-pointer">Status OPD</Label>
                  <p className="text-[10px] text-muted-foreground">OPD nonaktif tidak akan muncul di form disposisi verifikator.</p>
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
                className="h-8 text-xs"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isOpenDelete} onOpenChange={setIsOpenDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Konfirmasi Hapus</DialogTitle>
            <DialogDescription className="text-[11px]">
              Apakah Anda yakin ingin menghapus OPD ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpenDelete(false)}
              className="h-8 text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isSubmitting}
              onClick={handleDelete}
              className="h-8 text-xs"
            >
              {isSubmitting ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
