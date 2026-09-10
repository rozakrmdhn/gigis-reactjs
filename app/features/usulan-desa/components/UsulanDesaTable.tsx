import { type UsulanDesa, type UsulanStatus, type UsulanDesaFilters as IFilters, type VerifikasiAssignment, type VerifikasiStatus } from "../types/usulan-desa.types";
import { UsulanDesaFilters } from "./UsulanDesaFilters";
import { Card, CardContent } from "~/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "~/components/ui/table";
import { StatusBadge } from "./StatusBadge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { IconEdit, IconTrash, IconMapPin, IconSearch } from "@tabler/icons-react";
import { Skeleton } from "~/components/ui/skeleton";
import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "~/lib/utils";
import { kecamatanService, type Kecamatan } from "~/services/kecamatan";
import { desaService, type Desa } from "~/services/desa";
import { MoreHorizontal, ChevronRight, ChevronLeft, Check, X, Pencil, CalendarIcon, Mail, Send, ClipboardCheck, CheckCircle2, FileText, Building2, Search, SlidersHorizontal, RotateCw, Filter, Sparkles } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Calendar as CalendarPicker } from "~/components/ui/calendar";
import { toast } from "sonner";
import { usulanDesaService } from "../services/usulan-desa.service";
import { masterOpdService } from "../services/master-opd.service";
import { verifikasiService } from "../services/verifikasi.service";
import { authService } from "~/services/auth.service";
import { canCreateUsulanDesa, canVerifyUsulanDesa, isReadOnlyRole } from "~/utils/permissions";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
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
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "~/components/ui/sheet";

import { UsulanDesaPagination } from "./UsulanDesaPagination";

interface UsulanDesaTableProps {
    data: UsulanDesa[];
    isLoading: boolean;
    onEdit: (item: UsulanDesa) => void;
    onDelete: (item: UsulanDesa) => void;
    onDetail: (item: UsulanDesa) => void;
    pageIndex: number;
    pageSize: number;
    pageCount?: number;
    totalItems?: number;
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
    filters: IFilters;
    onFilterChange: (key: string, value: string) => void;
    onRefresh: () => void;
    onReset: () => void;
    onUpdateItem: (id: string | number, updates: Partial<UsulanDesa>) => void;
}

const parseNomorSurat = (nomorSurat: any): string[] => {
    if (!nomorSurat) return [];
    if (Array.isArray(nomorSurat)) {
        return nomorSurat;
    }
    if (typeof nomorSurat === "string") {
        const trimmed = nomorSurat.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            } catch (e) {
                // Ignore parsing error
            }
        }
        return [trimmed];
    }
    return [String(nomorSurat)];
};




export function UsulanDesaTable({
    data,
    isLoading,
    onEdit,
    onDelete,
    onDetail,
    pageIndex,
    pageSize,
    pageCount = 0,
    totalItems = 0,
    onPageChange,
    onPageSizeChange,
    filters,
    onFilterChange,
    onRefresh,
    onReset,
    onUpdateItem
}: UsulanDesaTableProps) {
    const currentUser = authService.getUser();
    const isOpd = isReadOnlyRole(currentUser);
    const canEditOrDelete = !isOpd && canCreateUsulanDesa(currentUser);
    const canVerify = !isOpd && canVerifyUsulanDesa(currentUser);

    const [deleteItem, setDeleteItem] = useState<UsulanDesa | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedAssignmentUsulan, setSelectedAssignmentUsulan] = useState<UsulanDesa | null>(null);
    const [deleteSingleOpdItem, setDeleteSingleOpdItem] = useState<{ usulan: UsulanDesa, opdId: string, opdName?: string } | null>(null);

    // Verify Decision states
    const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<VerifikasiAssignment | null>(null);
    const [verifyStatus, setVerifyStatus] = useState<VerifikasiStatus>('pending');
    const [verifyVolume, setVerifyVolume] = useState('');
    const [verifyAnggaran, setVerifyAnggaran] = useState<number | ''>('');
    const [verifyCatatan, setVerifyCatatan] = useState('');
    const [verifyNomorDokumen, setVerifyNomorDokumen] = useState('');
    const [verifyTanggalDokumen, setVerifyTanggalDokumen] = useState('');
    const [verifyUrlDokumen, setVerifyUrlDokumen] = useState('');
    const [isVerifyCalendarOpen, setIsVerifyCalendarOpen] = useState(false);
    const [isSavingVerify, setIsSavingVerify] = useState(false);
    const [isSavingSelesai, setIsSavingSelesai] = useState(false);


    const [kecamatanList, setKecamatanList] = useState<Kecamatan[]>([]);
    const [desaList, setDesaList] = useState<Desa[]>([]);
    const [activeRowId, setActiveRowId] = useState<number | string | null>(null);
    const [localSearch, setLocalSearch] = useState(filters.nama_desa || "");

    // Dialog & OPD state for verifikasi_opd disposition flow
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [assigningItem, setAssigningItem] = useState<UsulanDesa | null>(null);
    const [opdList, setOpdList] = useState<any[]>([]);
    const [selectedOpdIds, setSelectedOpdIds] = useState<string[]>([]);
    const [isSavingAssign, setIsSavingAssign] = useState(false);

    // Edit Surat Pengantar per-assignment state
    const [isPengantarDialogOpen, setIsPengantarDialogOpen] = useState(false);
    const [editingPengantarAssignment, setEditingPengantarAssignment] = useState<VerifikasiAssignment | null>(null);
    const [pengantarNomor, setPengantarNomor] = useState('');
    const [pengantarTanggal, setPengantarTanggal] = useState('');
    const [pengantarUrl, setPengantarUrl] = useState('');
    const [isPengantarCalendarOpen, setIsPengantarCalendarOpen] = useState(false);
    const [isSavingPengantar, setIsSavingPengantar] = useState(false);

    // Pengecekan Usulan Bappeda state (pending -> verifikasi_bappeda)
    const [isCekBappedaDialogOpen, setIsCekBappedaDialogOpen] = useState(false);
    const [checkingUsulan, setCheckingUsulan] = useState<UsulanDesa | null>(null);
    const [catatanBappedaInput, setCatatanBappedaInput] = useState('');
    const [isSavingCekBappeda, setIsSavingCekBappeda] = useState(false);

    useEffect(() => {
        masterOpdService.getAll({ active_only: true })
            .then((res) => setOpdList(res || []))
            .catch((err) => console.error("Gagal memuat daftar OPD:", err));
    }, []);

    const handleConfirmAssign = async () => {
        if (!assigningItem) return;

        setIsSavingAssign(true);
        try {
            // 1. Assign OPDs (sending empty array removes all assignments)
            await verifikasiService.assignOpd({
                usulan_id: String(assigningItem.id),
                opd_ids: selectedOpdIds
            });

            // 2. Determine new status: if no OPD is selected, revert back to 'verifikasi_bappeda'.
            // If the status was pending and OPDs are selected, it changes to verifikasi_bappeda.
            const newStatus = selectedOpdIds.length === 0
                ? 'verifikasi_bappeda'
                : (assigningItem.status === 'pending' ? 'verifikasi_bappeda' : assigningItem.status);

            // 3. Update local state optimistically
            onUpdateItem(assigningItem.id, {
                status: newStatus,
                assignments: selectedOpdIds.map(opdId => {
                    const opd = opdList.find(o => o.id === opdId);
                    return {
                        id: opdId,
                        usulan_id: String(assigningItem.id),
                        opd_id: opdId,
                        status_terakhir: 'pending',
                        opd: opd
                    } as any;
                })
            });

            toast.success(
                selectedOpdIds.length === 0
                    ? "Penerusan OPD berhasil dibatalkan. Status usulan kembali ke Verifikasi Bappeda."
                    : "Berhasil meneruskan usulan ke OPD pemverifikasi."
            );
            setIsAssignDialogOpen(false);
            setAssigningItem(null);
            onRefresh();
        } catch (err: any) {
            toast.error(err.message || "Gagal menyimpan penerusan OPD");
        } finally {
            setIsSavingAssign(false);
        }
    };

    const handleDeleteSingleOpd = (usulan: UsulanDesa | null, opdId: string, opdName?: string) => {
        if (!usulan) return;
        setDeleteSingleOpdItem({
            usulan,
            opdId,
            opdName
        });
    };

    const executeDeleteSingleOpd = async (usulan: UsulanDesa, opdId: string) => {
        const remainingOpdIds = (usulan.assignments || [])
            .map(a => a.opd_id)
            .filter(id => id !== opdId);

        try {
            // 1. Assign remaining OPDs (sending empty array removes all assignments)
            await verifikasiService.assignOpd({
                usulan_id: String(usulan.id),
                opd_ids: remainingOpdIds
            });

            // 2. Determine new status: if no OPD is selected, revert back to 'verifikasi_bappeda'.
            // If the status was pending and OPDs are selected, it changes to verifikasi_bappeda.
            const newStatus = remainingOpdIds.length === 0
                ? 'verifikasi_bappeda'
                : (usulan.status === 'pending' ? 'verifikasi_bappeda' : usulan.status);

            // 3. Update local state optimistically
            const updatedAssignments = (usulan.assignments || [])
                .filter(a => a.opd_id !== opdId);

            onUpdateItem(usulan.id, {
                status: newStatus,
                assignments: updatedAssignments
            });

            // Update selected dialog state
            setSelectedAssignmentUsulan({
                ...usulan,
                status: newStatus,
                assignments: updatedAssignments
            });

            toast.success("Berhasil membatalkan penerusan ke OPD tersebut.");
            onRefresh();
        } catch (err: any) {
            toast.error(err.message || "Gagal membatalkan penerusan OPD");
        }
    };

    const handleTriggerCekBappeda = (usulan: UsulanDesa) => {
        setCheckingUsulan(usulan);
        setCatatanBappedaInput(usulan.catatan_bappeda || '');
        setIsCekBappedaDialogOpen(true);
    };

    const handleProcessCekBappeda = async (targetStatus: 'verifikasi_bappeda' | 'ditolak') => {
        if (!checkingUsulan) return;
        setIsSavingCekBappeda(true);
        try {
            await usulanDesaService.patch(checkingUsulan.id, {
                status: targetStatus,
                catatan_bappeda: catatanBappedaInput || undefined,
            });

            toast.success(
                targetStatus === 'verifikasi_bappeda'
                    ? "Usulan berhasil diproses ke Verifikasi Bappeda!"
                    : "Usulan berhasil ditolak oleh Bappeda."
            );
            setIsCekBappedaDialogOpen(false);

            // Update local optimistic state
            onUpdateItem(checkingUsulan.id, {
                status: targetStatus,
                catatan_bappeda: catatanBappedaInput || undefined,
            });

            if (selectedAssignmentUsulan && selectedAssignmentUsulan.id === checkingUsulan.id) {
                setSelectedAssignmentUsulan({
                    ...selectedAssignmentUsulan,
                    status: targetStatus,
                    catatan_bappeda: catatanBappedaInput || undefined,
                });
            }

            onRefresh();
        } catch (err: any) {
            toast.error(err.message || "Gagal memproses usulan");
        } finally {
            setIsSavingCekBappeda(false);
        }
    };

    const handleTriggerEditAssignments = (usulan: UsulanDesa) => {
        setSelectedAssignmentUsulan(null);
        setAssigningItem(usulan);
        let existingIds = (usulan.assignments || []).map(a => a.opd_id);

        // If there are no assignments yet, pre-select the initial OPD from the category
        if (existingIds.length === 0 && usulan.kategori?.opd_id) {
            existingIds = [usulan.kategori.opd_id];
        }

        setSelectedOpdIds(existingIds);
        setIsAssignDialogOpen(true);
    };

    const handleTriggerEditPengantar = (assign: VerifikasiAssignment) => {
        setEditingPengantarAssignment(assign);
        setPengantarNomor(assign.nomor_dokumen_pengantar || '');
        setPengantarTanggal(assign.tanggal_dokumen_pengantar || '');
        setPengantarUrl(assign.url_dokumen_pengantar || '');
        setIsPengantarDialogOpen(true);
    };

    const handleSavePengantar = async (isKirim: boolean = false) => {
        if (!editingPengantarAssignment || !selectedAssignmentUsulan) return;
        setIsSavingPengantar(true);
        try {
            // 1. Update assignment metadata and status_terakhir via PATCH
            await verifikasiService.patchAssignment(editingPengantarAssignment.id, {
                nomor_dokumen_pengantar: pengantarNomor || undefined,
                tanggal_dokumen_pengantar: pengantarTanggal || undefined,
                url_dokumen_pengantar: pengantarUrl || undefined,
                status_terakhir: isKirim ? 'terkirim' : undefined,
            });

            let newHistoryRecord: any = null;

            // 2. If sending, submit verification status 'terkirim'
            if (isKirim) {
                const opdNama = editingPengantarAssignment.opd?.nama || editingPengantarAssignment.opd_id;
                const nomorInfo = pengantarNomor ? ` (No: ${pengantarNomor})` : '';
                const catatanStr = `Surat Pengantar Bappeda${nomorInfo} telah dikirim ke ${opdNama}.`;

                try {
                    await verifikasiService.submitVerifikasi({
                        assignment_id: editingPengantarAssignment.id,
                        status: 'terkirim',
                        catatan: catatanStr,
                    });
                } catch (subErr) {
                    console.warn('History submit info:', subErr);
                }

                const currentUser = authService.getUser();
                const verifikatorNama = currentUser?.nama || currentUser?.id || "Operator Bappeda";

                newHistoryRecord = {
                    id: String(Date.now()),
                    assignment_id: editingPengantarAssignment.id,
                    status: 'terkirim',
                    catatan: catatanStr,
                    verifikator_id: verifikatorNama,
                    created_at: new Date().toISOString()
                };
            }

            toast.success(isKirim ? 'Surat pengantar berhasil dikirim!' : 'Berhasil memperbarui data surat pengantar');
            setIsPengantarDialogOpen(false);

            // Update local state
            const updatedAssignments = (selectedAssignmentUsulan.assignments || []).map(a => {
                if (a.id === editingPengantarAssignment.id) {
                    const existingHistory = a.history || [];
                    const newHistory = newHistoryRecord ? [newHistoryRecord, ...existingHistory] : existingHistory;
                    return {
                        ...a,
                        status_terakhir: isKirim ? ('terkirim' as const) : a.status_terakhir,
                        nomor_dokumen_pengantar: pengantarNomor || null,
                        tanggal_dokumen_pengantar: pengantarTanggal || null,
                        url_dokumen_pengantar: pengantarUrl || null,
                        history: newHistory
                    };
                }
                return a;
            });

            onUpdateItem(selectedAssignmentUsulan.id, { assignments: updatedAssignments });
            setSelectedAssignmentUsulan({ ...selectedAssignmentUsulan, assignments: updatedAssignments });
            onRefresh();
        } catch (err: any) {
            toast.error(err.message || 'Gagal menyimpan data surat pengantar');
        } finally {
            setIsSavingPengantar(false);
        }
    };

    const handleTriggerVerify = (assign: VerifikasiAssignment) => {
        setSelectedAssignment(assign);
        setVerifyStatus(assign.status_terakhir);
        setVerifyVolume(assign.volume_verifikasi || '');
        setVerifyAnggaran(assign.anggaran_verifikasi !== undefined && assign.anggaran_verifikasi !== null ? assign.anggaran_verifikasi : '');

        let latestCatatan = '';
        if (assign.history && assign.history.length > 0) {
            const sortedHistory = [...assign.history].sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            latestCatatan = sortedHistory[0].catatan || '';
        }
        setVerifyCatatan(latestCatatan);

        setVerifyNomorDokumen(assign.nomor_dokumen_verifikasi || '');
        setVerifyTanggalDokumen(assign.tanggal_dokumen_verifikasi || '');
        setVerifyUrlDokumen(assign.url_dokumen_verifikasi || '');
        setIsVerifyDialogOpen(true);
    };

    const handleSaveVerify = async () => {
        if (!selectedAssignment || !selectedAssignmentUsulan) return;
        setIsSavingVerify(true);
        try {
            await verifikasiService.submitVerifikasi({
                assignment_id: selectedAssignment.id,
                status: verifyStatus,
                catatan: verifyCatatan,
                volume_verifikasi: verifyVolume || undefined,
                anggaran_verifikasi: verifyAnggaran !== '' ? Number(verifyAnggaran) : undefined,
                nomor_dokumen_verifikasi: verifyNomorDokumen || undefined,
                tanggal_dokumen_verifikasi: verifyTanggalDokumen || undefined,
                url_dokumen_verifikasi: verifyUrlDokumen || undefined
            });

            toast.success("Berhasil menyimpan keputusan verifikasi");
            setIsVerifyDialogOpen(false);

            const currentUser = authService.getUser();
            const verifikatorNama = currentUser?.nama || currentUser?.id || "Admin Bappeda";

            // Build the new assignment object with updated values
            const updatedAssignments = (selectedAssignmentUsulan.assignments || []).map(assign => {
                if (assign.id === selectedAssignment.id) {
                    const newHistoryRecord = {
                        id: String(Date.now()),
                        assignment_id: assign.id,
                        status: verifyStatus,
                        catatan: verifyCatatan || null,
                        verifikator_id: verifikatorNama,
                        created_at: new Date().toISOString()
                    };
                    const newHistory = [newHistoryRecord, ...(assign.history || [])];

                    return {
                        ...assign,
                        status_terakhir: verifyStatus,
                        volume_verifikasi: verifyVolume || null,
                        anggaran_verifikasi: verifyAnggaran !== '' ? Number(verifyAnggaran) : null,
                        nomor_dokumen_verifikasi: verifyNomorDokumen || null,
                        tanggal_dokumen_verifikasi: verifyTanggalDokumen || null,
                        url_dokumen_verifikasi: verifyUrlDokumen || null,
                        history: newHistory
                    };
                }
                return assign;
            });

            // Update parent state
            onUpdateItem(selectedAssignmentUsulan.id, {
                assignments: updatedAssignments
            });

            // Update current dialog state
            setSelectedAssignmentUsulan({
                ...selectedAssignmentUsulan,
                assignments: updatedAssignments
            });

            onRefresh();
        } catch (err: any) {
            toast.error(err.message || "Gagal memproses verifikasi");
        } finally {
            setIsSavingVerify(false);
        }
    };

    const handleMarkAsSelesai = async () => {
        if (!selectedAssignmentUsulan) return;
        setIsSavingSelesai(true);
        try {
            await usulanDesaService.update(selectedAssignmentUsulan.id, { status: 'selesai' });
            toast.success("Berhasil menandai usulan desa sebagai selesai.");

            // Update local state
            onUpdateItem(selectedAssignmentUsulan.id, { status: 'selesai' });
            setSelectedAssignmentUsulan({
                ...selectedAssignmentUsulan,
                status: 'selesai'
            });
            onRefresh();
        } catch (err: any) {
            toast.error(err.message || "Gagal mengubah status usulan");
        } finally {
            setIsSavingSelesai(false);
        }
    };

    const handleUndoSelesai = async () => {
        if (!selectedAssignmentUsulan) return;
        setIsSavingSelesai(true);
        try {
            await usulanDesaService.update(selectedAssignmentUsulan.id, { status: 'verifikasi_opd' });
            toast.success("Berhasil membatalkan status selesai. Status kembali ke Verifikasi OPD.");

            // Update local state
            onUpdateItem(selectedAssignmentUsulan.id, { status: 'verifikasi_opd' });
            setSelectedAssignmentUsulan({
                ...selectedAssignmentUsulan,
                status: 'verifikasi_opd'
            });
            onRefresh();
        } catch (err: any) {
            toast.error(err.message || "Gagal mengubah status usulan");
        } finally {
            setIsSavingSelesai(false);
        }
    };


    // Sync local text state on external filter reset
    useEffect(() => {
        setLocalSearch(filters.nama_desa || "");
    }, [filters.nama_desa]);

    // Debounce main search input to trigger server-side query for nama_desa
    useEffect(() => {
        const t = setTimeout(() => {
            if (localSearch !== (filters.nama_desa || "")) {
                onFilterChange("nama_desa", localSearch);
            }
        }, 500);
        return () => clearTimeout(t);
    }, [localSearch, onFilterChange, filters.nama_desa]);

    useEffect(() => {
        kecamatanService.getKecamatan()
            .then(setKecamatanList)
            .catch((err) => console.error("Gagal load kecamatan list:", err));

        desaService.getDesa()
            .then(setDesaList)
            .catch((err) => console.error("Gagal load desa list:", err));
    }, []);

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            });
        } catch {
            return dateStr;
        }
    };

    const activeFilterCount = useMemo(() => {
        let n = 0;
        if (filters.status && filters.status !== "all") n++;
        if (filters.tahun_anggaran && filters.tahun_anggaran !== "all") n++;
        if (filters.jenis_usulan && filters.jenis_usulan !== "all") n++;
        if (filters.nama_desa) n++;
        if (filters.nama_kecamatan) n++;
        if (filters.nomor_surat) n++;
        if (filters.tanggal_surat_from) n++;
        if (filters.tanggal_surat_to) n++;
        return n;
    }, [filters]);

    const statusTabs = useMemo(() => [
        { value: "all", label: "Semua Usulan", color: "slate" },
        { value: "pending", label: "Pending", color: "amber" },
        { value: "verifikasi_bappeda", label: "Verifikasi Bappeda", color: "sky" },
        { value: "verifikasi_opd", label: "Verifikasi OPD", color: "indigo" },
        { value: "disetujui", label: "Disetujui", color: "emerald" },
        { value: "selesai", label: "Selesai", color: "emerald" },
        { value: "ditolak", label: "Ditolak", color: "rose" },
    ], []);

    return (
        <div className="flex-1 flex flex-col">
            {/* 1. STICKY TOP MENUBAR: Search, Filters, Reset, Refresh, Status Pill Tabs */}
            <div className="sticky top-0 z-40 bg-background dark:bg-slate-950 border-b border-border shadow-xs">
                {/* Search & Actions Toolbar */}
                <div className="px-4 sm:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 bg-muted/20">
                    {/* Search Input on Left */}
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari nama desa / kecamatan / nomor..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="pl-9 h-9 w-full text-xs rounded-xl bg-background border-border"
                            autoComplete="off"
                        />
                        {localSearch && (
                            <button
                                onClick={() => {
                                    setLocalSearch("");
                                    onFilterChange("nama_desa", "");
                                }}
                                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Filter Trigger & Action Controls on Right */}
                    <div className="flex items-center gap-2 shrink-0">
                        <UsulanDesaFilters
                            filters={filters}
                            onFilterChange={onFilterChange}
                            onRefresh={onRefresh}
                            onReset={onReset}
                            isLoading={isLoading}
                            isOpen={isFilterOpen}
                            setIsOpen={setIsFilterOpen}
                        />
                    </div>
                </div>

                {/* Quick Status Filter Tabs with Counts (Horizontally scrollable on mobile) */}
                <div className="relative border-t border-border/60 bg-muted/10 shrink-0">
                    <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:overflow-x-visible sm:flex-wrap scroll-smooth touch-pan-x overscroll-x-contain">
                        {statusTabs.map((tab) => (
                            <button
                                key={tab.value}
                                onClick={() => onFilterChange("status", tab.value)}
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border shrink-0 whitespace-nowrap select-none active:scale-95",
                                    (filters.status || "all") === tab.value
                                        ? tab.color === 'amber'
                                            ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                                            : tab.color === 'sky'
                                                ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                                                : tab.color === 'indigo'
                                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                                    : tab.color === 'rose'
                                                        ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                                                        : tab.color === 'emerald'
                                                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                                            : "bg-foreground text-background border-foreground shadow-xs"
                                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                                )}
                            >
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Active Filter Chips */}
                {activeFilterCount > 0 && (
                    <div className="flex items-center gap-1.5 px-4 sm:px-6 py-1.5 border-t border-border/60 bg-muted/5 text-[11px] overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap shrink-0">
                        <span className="text-muted-foreground font-semibold shrink-0">Filter aktif:</span>
                        {filters.status && filters.status !== "all" && (
                            <Badge variant="secondary" className="gap-1 px-2 py-0.5 rounded-lg text-[10px] shrink-0 whitespace-nowrap">
                                Status: {filters.status}
                                <X className="w-3 h-3 cursor-pointer" onClick={() => onFilterChange("status", "all")} />
                            </Badge>
                        )}
                        {filters.tahun_anggaran && filters.tahun_anggaran !== "all" && (
                            <Badge variant="secondary" className="gap-1 px-2 py-0.5 rounded-lg text-[10px] shrink-0 whitespace-nowrap">
                                TA {filters.tahun_anggaran}
                                <X className="w-3 h-3 cursor-pointer" onClick={() => onFilterChange("tahun_anggaran", "all")} />
                            </Badge>
                        )}
                        {filters.jenis_usulan && filters.jenis_usulan !== "all" && (
                            <Badge variant="secondary" className="gap-1 px-2 py-0.5 rounded-lg text-[10px] shrink-0 whitespace-nowrap">
                                Jenis: {filters.jenis_usulan}
                                <X className="w-3 h-3 cursor-pointer" onClick={() => onFilterChange("jenis_usulan", "all")} />
                            </Badge>
                        )}
                        {filters.nama_kecamatan && (
                            <Badge variant="secondary" className="gap-1 px-2 py-0.5 rounded-lg text-[10px] shrink-0 whitespace-nowrap">
                                Kec: {filters.nama_kecamatan}
                                <X className="w-3 h-3 cursor-pointer" onClick={() => onFilterChange("nama_kecamatan", "")} />
                            </Badge>
                        )}
                        {filters.nama_desa && (
                            <Badge variant="secondary" className="gap-1 px-2 py-0.5 rounded-lg text-[10px] shrink-0 whitespace-nowrap">
                                Desa: {filters.nama_desa}
                                <X className="w-3 h-3 cursor-pointer" onClick={() => { setLocalSearch(""); onFilterChange("nama_desa", ""); }} />
                            </Badge>
                        )}
                        {filters.nomor_surat && (
                            <Badge variant="secondary" className="gap-1 px-2 py-0.5 rounded-lg text-[10px] shrink-0 whitespace-nowrap">
                                No. Surat: {filters.nomor_surat}
                                <X className="w-3 h-3 cursor-pointer" onClick={() => onFilterChange("nomor_surat", "")} />
                            </Badge>
                        )}
                    </div>
                )}
            </div>

            {/* 2. Main Data Content Area: Desktop Table & Mobile Card Feed */}
            <div className="px-4 sm:px-6 py-4 space-y-4 max-w-full overflow-x-hidden">
                {/* A. Desktop High-Density Table View */}
                <div className="hidden md:block rounded-md border border-border bg-card shadow-xs overflow-x-auto custom-scrollbar">
                    <Table className="min-w-[1100px]">
                        <TableHeader className="bg-muted/60 dark:bg-slate-900 border-b border-border">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="text-center font-bold sticky left-0 z-20 bg-muted/90 dark:bg-slate-900 border-r border-border w-[120px] min-w-[120px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                                    Aksi
                                </TableHead>
                                <TableHead className="w-16 font-bold text-xs text-foreground">Agenda</TableHead>
                                <TableHead className="font-bold min-w-[140px] text-xs text-foreground">Nomor Surat</TableHead>
                                <TableHead className="font-bold min-w-[110px] text-xs text-foreground">Tanggal</TableHead>
                                <TableHead className="font-bold min-w-[160px] text-xs text-foreground">Desa & Kecamatan</TableHead>
                                <TableHead className="font-bold min-w-[240px] max-w-[380px] text-xs text-foreground">Uraian Usulan</TableHead>
                                <TableHead className="font-bold min-w-[130px] text-xs text-foreground">Jenis / Kategori</TableHead>
                                <TableHead className="font-bold min-w-[120px] text-xs text-foreground">Lokasi Spasial</TableHead>
                                <TableHead className="font-bold min-w-[160px] text-xs text-foreground">Verifikasi OPD</TableHead>
                                <TableHead className="font-bold min-w-[110px] text-xs text-foreground text-center">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="h-24">
                                        <div className="p-4 space-y-3">
                                            <Skeleton className="h-8 w-full rounded-lg" />
                                            <Skeleton className="h-8 w-full rounded-lg" />
                                            <Skeleton className="h-8 w-full rounded-lg" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center gap-1.5">
                                            <FileText className="w-8 h-8 opacity-30" />
                                            <span className="font-semibold text-sm">Tidak ada data usulan desa.</span>
                                            <span className="text-xs text-muted-foreground">Coba sesuaikan filter pencarian Anda.</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((item) => {
                                    const desaName = item.nama_desa || desaList.find((d) => Number(d.id) === Number(item.id_desa))?.nama_desa || "-";
                                    const kecamatanName = item.nama_kecamatan || kecamatanList.find((k) => Number(k.id) === Number(item.id_kecamatan))?.nama_kecamatan || "-";
                                    const isSelesaiOrApproved = item.status === 'selesai' || (item.assignments && item.assignments.some(a => a.status_terakhir === 'disetujui'));

                                    return (
                                        <TableRow
                                            key={item.id}
                                            className={cn(
                                                "group transition-colors",
                                                isSelesaiOrApproved && "bg-emerald-500/5 hover:bg-emerald-500/10"
                                            )}
                                        >
                                            <TableCell
                                                className={cn(
                                                    "w-[120px] min-w-[120px] p-2 sticky left-0 border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)] z-10 transition-colors",
                                                    isSelesaiOrApproved
                                                        ? "bg-card group-hover:bg-muted/80"
                                                        : "bg-card group-hover:bg-muted/80"
                                                )}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg shrink-0 cursor-pointer"
                                                        onClick={() => onDetail(item)}
                                                        title="Lihat Detail"
                                                    >
                                                        <IconMapPin className="h-3.5 w-3.5" />
                                                    </Button>
                                                    {canEditOrDelete && (
                                                        <>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 w-7 p-0 border-blue-200 dark:border-blue-800 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg shrink-0 cursor-pointer"
                                                                onClick={() => onEdit(item)}
                                                                title="Edit Usulan"
                                                            >
                                                                <IconEdit className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 w-7 p-0 border-rose-200 dark:border-rose-800 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg shrink-0 cursor-pointer"
                                                                onClick={() => setDeleteItem(item)}
                                                                title="Hapus Usulan"
                                                            >
                                                                <IconTrash className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono font-bold text-xs text-foreground">
                                                #{item.nomor_agenda}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {(() => {
                                                    const list = parseNomorSurat(item.nomor_surat);
                                                    if (list.length === 0) return <span className="text-muted-foreground">-</span>;
                                                    return (
                                                        <div className="flex flex-col gap-1 min-w-[120px]">
                                                            {list.map((num, idx) => (
                                                                <div key={idx} className="bg-muted px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium truncate max-w-[180px]" title={num}>
                                                                    {num}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                                                {formatDate(item.tanggal_surat)}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <div className="font-bold text-foreground truncate max-w-[180px]">Desa {desaName}</div>
                                                <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">Kec. {kecamatanName}</div>
                                            </TableCell>
                                            <TableCell className="text-xs text-foreground font-medium max-w-[350px]">
                                                <p className="line-clamp-2 leading-relaxed" title={item.uraian_usulan}>
                                                    {item.uraian_usulan}
                                                </p>
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {item.kategori ? (
                                                    <Badge variant="outline" className="text-[10px] bg-muted/40 font-medium truncate max-w-[150px]" title={`${item.kategori.nama}${item.volume ? ` (${item.volume})` : ''}`}>
                                                        {item.kategori.nama}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">{item.jenis_usulan || "-"}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {item.geometries && item.geometries.length > 0 ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] border border-indigo-500/20">
                                                            <IconMapPin className="w-3 h-3" />
                                                            {item.geometries.length} Spasial
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground/50 text-[11px]">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell
                                                className={cn("text-xs", item.assignments && item.assignments.length > 0 && "cursor-pointer hover:bg-muted/30 transition-colors")}
                                                onClick={() => {
                                                    if (item.assignments && item.assignments.length > 0) {
                                                        setSelectedAssignmentUsulan(item);
                                                    }
                                                }}
                                                title={item.assignments && item.assignments.length > 0 ? "Klik untuk melihat detail verifikasi" : undefined}
                                            >
                                                {item.assignments && item.assignments.length > 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        {item.assignments.map((assign) => (
                                                            <div key={assign.id} className="flex items-center justify-between gap-2 bg-muted/50 px-2 py-0.5 rounded-md border border-border">
                                                                <span className="font-bold text-[10px] text-foreground truncate max-w-[80px]" title={assign.opd?.nama || assign.opd_id}>
                                                                    {assign.opd?.kode || assign.opd_id}
                                                                </span>
                                                                <span className={cn(
                                                                    "px-1.5 py-0.2 rounded text-[9px] font-black uppercase shrink-0 border",
                                                                    assign.status_terakhir === 'disetujui' && "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400",
                                                                    assign.status_terakhir === 'ditolak' && "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/30 dark:text-rose-400",
                                                                    assign.status_terakhir === 'revisi' && "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400",
                                                                    assign.status_terakhir === 'pending' && "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400",
                                                                    assign.status_terakhir === 'terkirim' && "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/30 dark:text-blue-400"
                                                                )}>
                                                                    {assign.status_terakhir}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : item.status === 'pending' ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleTriggerCekBappeda(item)}
                                                        className="h-7 text-[10px] font-bold text-amber-700 bg-amber-500/10 hover:bg-amber-500/20 dark:text-amber-300 px-2.5 rounded-lg border border-amber-500/30 flex items-center gap-1 w-fit cursor-pointer"
                                                    >
                                                        <ClipboardCheck className="h-3 w-3 text-amber-600" />
                                                        Cek Bappeda
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleTriggerEditAssignments(item)}
                                                        className="h-7 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30 px-2.5 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-800 flex items-center gap-1 w-fit cursor-pointer"
                                                    >
                                                        + Verifikasi OPD
                                                    </Button>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <StatusBadge status={item.status} />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* B. Mobile High-Contrast Card Feed (hidden on desktop) */}
                <div className="block md:hidden space-y-3">
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="p-4 rounded-2xl border border-border bg-card space-y-2.5 shadow-xs">
                                <Skeleton className="h-4 w-3/4 rounded-md" />
                                <Skeleton className="h-3 w-1/2 rounded-md" />
                                <Skeleton className="h-10 w-full rounded-xl" />
                                <div className="flex gap-2 pt-2">
                                    <Skeleton className="h-8 w-20 rounded-xl" />
                                    <Skeleton className="h-8 w-20 rounded-xl" />
                                </div>
                            </div>
                        ))
                    ) : data.length === 0 ? (
                        <div className="p-8 text-center border border-dashed border-border rounded-2xl bg-muted/10 text-muted-foreground">
                            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
                            <p className="text-xs font-semibold">Tidak ada data usulan desa.</p>
                        </div>
                    ) : (
                        data.map((item) => {
                            const desaName = item.nama_desa || desaList.find((d) => Number(d.id) === Number(item.id_desa))?.nama_desa || "-";
                            const kecamatanName = item.nama_kecamatan || kecamatanList.find((k) => Number(k.id) === Number(item.id_kecamatan))?.nama_kecamatan || "-";
                            const nomorSuratList = parseNomorSurat(item.nomor_surat);

                            return (
                                <div
                                    key={item.id}
                                    className="p-3.5 rounded-2xl border border-border bg-card shadow-xs hover:shadow-md transition-all space-y-3"
                                >
                                    {/* Header: Desa & Kecamatan + Status Badge */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="space-y-0.5 min-w-0">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                                <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                                <span className="truncate">Desa {desaName}</span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground truncate">
                                                Kec. {kecamatanName} {item.tahun_anggaran ? `• TA ${item.tahun_anggaran}` : ''}
                                            </p>
                                        </div>
                                        <StatusBadge status={item.status} />
                                    </div>

                                    {/* Agenda & Nomor Surat */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="px-2 py-0.5 rounded-md bg-muted text-[10.5px] font-mono font-bold text-foreground">
                                            Agenda #{item.nomor_agenda}
                                        </span>
                                        {nomorSuratList.length > 0 && (
                                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-muted-foreground truncate max-w-[200px]" title={nomorSuratList.join(', ')}>
                                                {nomorSuratList[0]} {nomorSuratList.length > 1 ? `(+${nomorSuratList.length - 1})` : ''}
                                            </span>
                                        )}
                                        {item.tanggal_surat && (
                                            <span className="text-[10.5px] text-muted-foreground flex items-center gap-1 font-mono">
                                                <CalendarIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                                                {formatDate(item.tanggal_surat)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Uraian Usulan */}
                                    <div className="bg-muted/30 p-2.5 rounded-xl border border-border/60">
                                        <p className="text-xs text-foreground font-medium line-clamp-3 leading-relaxed">
                                            {item.uraian_usulan}
                                        </p>
                                    </div>

                                    {/* Metadata Badges: Jenis, Volume, Geometri */}
                                    <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                                        {item.kategori ? (
                                            <Badge variant="outline" className="text-[10px] bg-background">
                                                {item.kategori.nama} {item.volume ? `(${item.volume})` : ''}
                                            </Badge>
                                        ) : item.jenis_usulan ? (
                                            <Badge variant="outline" className="text-[10px] bg-background">
                                                {item.jenis_usulan}
                                            </Badge>
                                        ) : null}

                                        {item.geometries && item.geometries.length > 0 && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold">
                                                <IconMapPin className="w-2.5 h-2.5" />
                                                {item.geometries.length} Spasial
                                            </span>
                                        )}
                                    </div>

                                    {/* Verifikasi OPD Section (if any) */}
                                    {item.assignments && item.assignments.length > 0 && (
                                        <div
                                            className="pt-2 border-t border-border/80 flex items-center justify-between gap-2 cursor-pointer"
                                            onClick={() => setSelectedAssignmentUsulan(item)}
                                        >
                                            <span className="text-[10.5px] font-semibold text-muted-foreground">Verifikasi OPD:</span>
                                            <div className="flex items-center gap-1 flex-wrap justify-end">
                                                {item.assignments.map((assign) => (
                                                    <span
                                                        key={assign.id}
                                                        className={cn(
                                                            "px-1.5 py-0.5 rounded text-[9px] font-black uppercase border",
                                                            assign.status_terakhir === 'disetujui' && "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400",
                                                            assign.status_terakhir === 'ditolak' && "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/30 dark:text-rose-400",
                                                            assign.status_terakhir === 'revisi' && "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400",
                                                            assign.status_terakhir === 'pending' && "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400",
                                                            assign.status_terakhir === 'terkirim' && "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/30 dark:text-blue-400"
                                                        )}
                                                    >
                                                        {assign.opd?.kode || assign.opd_id}: {assign.status_terakhir}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Footer Actions */}
                                    <div className="pt-2 border-t border-border/80 flex items-center justify-end gap-1.5">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onDetail(item)}
                                            className="h-8 px-2.5 text-xs font-semibold rounded-xl text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1 cursor-pointer"
                                        >
                                            <IconMapPin className="w-3.5 h-3.5" />
                                            <span>Detail</span>
                                        </Button>
                                        {canEditOrDelete && (
                                            <>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onEdit(item)}
                                                    className="h-8 px-2.5 text-xs font-semibold rounded-xl text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/30 gap-1 cursor-pointer"
                                                >
                                                    <IconEdit className="w-3.5 h-3.5" />
                                                    <span>Edit</span>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setDeleteItem(item)}
                                                    className="h-8 px-2.5 text-xs font-semibold rounded-xl text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1 cursor-pointer"
                                                >
                                                    <IconTrash className="w-3.5 h-3.5" />
                                                    <span>Hapus</span>
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* 3. Non-Sticky Bottom Pagination (Minimalist flush layout) */}
                {onPageChange && onPageSizeChange && (
                    <div className="pt-1 pb-0">
                        <UsulanDesaPagination
                            className="p-0 py-0 sm:py-0 px-0 sm:px-0 gap-2"
                            pageIndex={pageIndex}
                            pageCount={pageCount}
                            totalItems={totalItems}
                            pageSize={pageSize}
                            onPageChange={onPageChange}
                            onPageSizeChange={onPageSizeChange}
                        />
                    </div>
                )}
            </div>

            <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini tidak dapat dibatalkan. Usulan dengan nomor agenda{" "}
                            <span className="font-semibold text-foreground">
                                {deleteItem?.nomor_agenda}
                            </span>{" "}
                            akan dihapus secara permanen dari server.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (deleteItem) {
                                    onDelete(deleteItem);
                                    setDeleteItem(null);
                                }
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white"
                        >
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* AlertDialog for single OPD verification deletion */}
            <AlertDialog open={!!deleteSingleOpdItem} onOpenChange={(open) => !open && setDeleteSingleOpdItem(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Batalkan Penerusan OPD?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin membatalkan/menghapus penerusan verifikasi ke OPD <span className="font-semibold text-foreground">{deleteSingleOpdItem?.opdName}</span>?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (deleteSingleOpdItem) {
                                    executeDeleteSingleOpd(deleteSingleOpdItem.usulan, deleteSingleOpdItem.opdId);
                                    setDeleteSingleOpdItem(null);
                                }
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white"
                        >
                            Ya, Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dialog Penerusan / Pilih OPD */}
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-semibold">Penerusan OPD Verifikator</DialogTitle>
                        <DialogDescription className="text-[11px]">
                            Pilih satu atau lebih OPD teknis yang akan ditugaskan memverifikasi usulan ini.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {opdList.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center">Memuat daftar OPD...</p>
                        ) : (
                            <div className="grid gap-2">
                                {opdList.map((opd) => {
                                    const isChecked = selectedOpdIds.includes(opd.id);
                                    return (
                                        <label
                                            key={opd.id}
                                            className="flex items-center gap-3 p-2.5 rounded-lg border dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer select-none text-xs"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {
                                                    setSelectedOpdIds((prev) =>
                                                        isChecked
                                                            ? prev.filter((id) => id !== opd.id)
                                                            : [...prev, opd.id]
                                                    );
                                                }}
                                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <span className="font-bold text-slate-800 dark:text-slate-200">[{opd.kode}]</span>{" "}
                                                <span className="text-slate-600 dark:text-slate-400">{opd.nama}</span>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsAssignDialogOpen(false)}
                            className="h-8 text-xs"
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmAssign}
                            disabled={isSavingAssign}
                            className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                        >
                            {isSavingAssign
                                ? "Menyimpan..."
                                : (selectedOpdIds.length === 0 ? "Batalkan Penerusan" : "Kirim / Teruskan")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Detail Verifikasi OPD */}
            <Dialog open={!!selectedAssignmentUsulan} onOpenChange={(open) => !open && setSelectedAssignmentUsulan(null)}>
                <DialogContent className="w-full sm:w-[600px] md:w-[680px] h-[620px] max-h-[85vh] flex flex-col overflow-hidden p-0 gap-0">
                    <DialogHeader className="shrink-0 px-6 pt-6 pb-3 border-b">
                        <DialogTitle className="text-sm font-bold flex items-center gap-2">
                            Detail Verifikasi OPD
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Usulan Agenda: <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedAssignmentUsulan?.nomor_agenda}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col flex-1 min-h-0 px-6 pt-3 pb-4 gap-3">
                        {/* Uraian Usulan Quick Info */}
                        <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-xs space-y-1 shrink-0">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Uraian Usulan</div>
                            <div className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedAssignmentUsulan?.uraian_usulan}</div>
                            <div className="flex gap-4 mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 text-[11px] text-muted-foreground">
                                <div>Kecamatan: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedAssignmentUsulan?.nama_kecamatan || '-'}</span></div>
                                <div>Desa: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedAssignmentUsulan?.nama_desa || '-'}</span></div>
                                <div>Tahun: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedAssignmentUsulan?.tahun_anggaran}</span></div>
                            </div>
                        </div>

                        {/* Pending Status Action Banner */}
                        {selectedAssignmentUsulan?.status === 'pending' && (
                            <div className="p-3 rounded-xl border border-amber-300/80 dark:border-amber-900/60 bg-amber-50/90 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0 shadow-xs">
                                <div className="flex items-center gap-2.5">
                                    <ClipboardCheck className="h-5 w-5 text-amber-600 shrink-0" />
                                    <div>
                                        <span className="font-extrabold text-amber-900 dark:text-amber-200">Usulan Berstatus Pending</span>
                                        <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">Lakukan penelaahan Bappeda untuk memproses usulan ini ke Verifikasi Bappeda.</p>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => handleTriggerCekBappeda(selectedAssignmentUsulan)}
                                    className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5 px-3 rounded-xl shadow-xs shrink-0"
                                >
                                    <ClipboardCheck className="h-3.5 w-3.5" />
                                    Cek Usulan Bappeda
                                </Button>
                            </div>
                        )}

                        {/* Tabs Layout */}
                        <Tabs defaultValue="status" className="w-full flex-1 flex flex-col min-h-0">
                            <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl h-9 shrink-0">
                                <TabsTrigger value="status" className="text-xs font-semibold rounded-lg h-7">Status Verifikasi</TabsTrigger>
                                <TabsTrigger value="logs" className="text-xs font-semibold rounded-lg h-7">Log Verifikasi</TabsTrigger>
                            </TabsList>

                            {/* Tab 1: Status Verifikasi */}
                            <TabsContent value="status" className="mt-2 flex-1 overflow-y-auto custom-scrollbar pr-1 pb-1">
                                <div className="flex items-center justify-between border-b pb-1">
                                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                        Diteruskan & Status Verifikasi
                                    </h4>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {canVerify && (
                                            <>
                                                {selectedAssignmentUsulan?.status !== 'selesai' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleMarkAsSelesai}
                                                        disabled={isSavingSelesai}
                                                        className="h-7 text-[10px] font-semibold gap-1 px-2.5 border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                                                    >
                                                        <Check className="h-3 w-3" />
                                                        Tandai Selesai
                                                    </Button>
                                                )}
                                                {selectedAssignmentUsulan?.status === 'selesai' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleUndoSelesai}
                                                        disabled={isSavingSelesai}
                                                        className="h-7 text-[10px] font-semibold gap-1 px-2.5 border-rose-200 dark:border-rose-900/50 bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400"
                                                    >
                                                        <X className="h-3 w-3" />
                                                        Batal Selesai
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleTriggerEditAssignments(selectedAssignmentUsulan!)}
                                                    className="h-7 text-[10px] font-semibold gap-1 px-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                                                >
                                                    <IconEdit className="h-3 w-3" />
                                                    Ubah Penerusan
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {selectedAssignmentUsulan?.assignments && selectedAssignmentUsulan.assignments.length > 0 ? (
                                    <div className="space-y-4">
                                        {selectedAssignmentUsulan.assignments.map((assign) => {
                                            return (
                                                <div key={assign.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs space-y-3">
                                                    {/* Header info for each OPD */}
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                                                [{assign.opd?.kode || assign.opd_id}] {assign.opd?.nama || 'OPD Terkait'}
                                                            </h5>
                                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                                                Ditugaskan pada {assign.assigned_at ? new Date(assign.assigned_at).toLocaleDateString("id-ID", {
                                                                    day: "2-digit",
                                                                    month: "long",
                                                                    year: "numeric",
                                                                    hour: "2-digit",
                                                                    minute: "2-digit"
                                                                }) : '-'}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <span className={cn(
                                                                "px-2 py-0.5 rounded text-[10px] font-black uppercase border shrink-0",
                                                                assign.status_terakhir === 'disetujui' && "bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50",
                                                                assign.status_terakhir === 'ditolak' && "bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50",
                                                                assign.status_terakhir === 'revisi' && "bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50",
                                                                assign.status_terakhir === 'pending' && "bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50",
                                                                assign.status_terakhir === 'terkirim' && "bg-blue-50 text-blue-700 border-blue-250 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50"
                                                            )}>
                                                                {assign.status_terakhir.replace(/_/g, ' ')}
                                                            </span>
                                                            {canVerify && (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleTriggerEditPengantar(assign);
                                                                        }}
                                                                        className="h-7 w-7 rounded text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/30 shrink-0"
                                                                        title="Edit Surat Pengantar Bappeda"
                                                                    >
                                                                        <Mail className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleTriggerVerify(assign);
                                                                        }}
                                                                        className="h-7 w-7 rounded text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 shrink-0"
                                                                        title="Input Hasil Verifikasi"
                                                                    >
                                                                        <Pencil className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteSingleOpd(selectedAssignmentUsulan, assign.opd_id, assign.opd?.nama || assign.opd_id);
                                                                        }}
                                                                        className="h-7 w-7 rounded text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0"
                                                                        title="Hapus Penerusan OPD"
                                                                    >
                                                                        <IconTrash className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Surat Pengantar Bappeda */}
                                                    <div className="space-y-1.5 bg-violet-50/50 dark:bg-violet-950/10 p-2.5 rounded-lg border border-violet-100/70 dark:border-violet-900/30 text-[11px]">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wider flex items-center gap-1">
                                                                <Mail className="h-3 w-3" />
                                                                Surat Pengantar Bappeda
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3 mt-1">
                                                            <div>
                                                                <span className="text-muted-foreground">No. Surat Pengantar:</span>
                                                                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                                                                    {assign.nomor_dokumen_pengantar || <span className="text-slate-400 font-normal italic">Belum diisi</span>}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <span className="text-muted-foreground">Tgl. Surat Pengantar:</span>
                                                                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                                                                    {assign.tanggal_dokumen_pengantar
                                                                        ? new Date(assign.tanggal_dokumen_pengantar + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                                                                        : <span className="text-slate-400 font-normal italic">Belum diisi</span>}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {assign.url_dokumen_pengantar && (
                                                            <div className="pt-1.5 border-t border-violet-100 dark:border-violet-900/40">
                                                                <a
                                                                    href={assign.url_dokumen_pengantar}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400 hover:underline font-semibold"
                                                                >
                                                                    Lihat Dokumen Pengantar ➔
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Verification details (anggaran & volume) */}
                                                    <div className="space-y-2.5 bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-100/50 dark:border-slate-800/50 text-[11px]">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <span className="text-muted-foreground">Volume Verifikasi:</span>
                                                                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                                                                    {assign.volume_verifikasi || 'Belum diisi'}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <span className="text-muted-foreground">Anggaran Verifikasi:</span>
                                                                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                                                                    {assign.anggaran_verifikasi
                                                                        ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(assign.anggaran_verifikasi)
                                                                        : 'Belum diisi'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {(assign.nomor_dokumen_verifikasi || assign.tanggal_dokumen_verifikasi || assign.url_dokumen_verifikasi) && (
                                                            <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/50 space-y-1 text-[11px]">
                                                                {assign.nomor_dokumen_verifikasi && (
                                                                    <div>
                                                                        <span className="text-muted-foreground">No. Dokumen: </span>
                                                                        <span className="font-medium text-slate-800 dark:text-slate-200">{assign.nomor_dokumen_verifikasi}</span>
                                                                    </div>
                                                                )}
                                                                {assign.tanggal_dokumen_verifikasi && (
                                                                    <div>
                                                                        <span className="text-muted-foreground">Tgl. Dokumen: </span>
                                                                        <span className="font-medium text-slate-800 dark:text-slate-200">
                                                                            {new Date(assign.tanggal_dokumen_verifikasi).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {assign.url_dokumen_verifikasi && (
                                                                    <div className="mt-1">
                                                                        <a
                                                                            href={assign.url_dokumen_verifikasi}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                                                                        >
                                                                            Lihat Dokumen Hasil Verifikasi ➔
                                                                        </a>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed rounded-xl border-slate-200 dark:border-slate-850 bg-slate-50/30 dark:bg-slate-900/10 mt-2">
                                        <p className="text-xs text-muted-foreground text-center mb-3">Tidak ada penugasan verifikasi OPD untuk usulan ini.</p>
                                        <Button
                                            onClick={() => handleTriggerEditAssignments(selectedAssignmentUsulan!)}
                                            className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1 px-3 rounded-xl shadow-xs"
                                        >
                                            + Tambah Verifikasi OPD
                                        </Button>
                                    </div>
                                )}
                            </TabsContent>

                            {/* Tab 2: Log Verifikasi */}
                            <TabsContent value="logs" className="mt-3 flex-1 flex flex-col min-h-0 overflow-hidden">
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 border-b pb-1 shrink-0">
                                    Log Aktivitas & Riwayat Verifikasi
                                </h4>
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mt-2">
                                    {(() => {
                                        // Collect all history items from all assignments
                                        const allLogs = (selectedAssignmentUsulan?.assignments || []).flatMap(assign => {
                                            const opdLabel = `[${assign.opd?.kode || assign.opd_id}] ${assign.opd?.nama || 'OPD Terkait'}`;
                                            return (assign.history || []).map(hist => ({
                                                ...hist,
                                                opdLabel,
                                                opdId: assign.opd_id
                                            }));
                                        });

                                        // Sort by created_at in descending order (latest first / by date and time)
                                        allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                                        if (allLogs.length === 0) {
                                            return (
                                                <p className="text-xs text-muted-foreground text-center py-4">
                                                    Belum ada log aktivitas verifikasi.
                                                </p>
                                            );
                                        }

                                        return (
                                            <div className="relative border-l-2 border-slate-200 dark:border-slate-800 pl-5 space-y-5 ml-2 mt-2 pb-4">
                                                {allLogs.map((log) => (
                                                    <div key={log.id} className="relative text-xs space-y-1">
                                                        {/* Dot on timeline */}
                                                        <div className={cn(
                                                            "absolute -left-[26px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-950 flex items-center justify-center shrink-0",
                                                            log.status === 'disetujui' && "bg-emerald-500",
                                                            log.status === 'ditolak' && "bg-rose-500",
                                                            log.status === 'revisi' && "bg-amber-500",
                                                            log.status === 'pending' && "bg-amber-500",
                                                            log.status === 'terkirim' && "bg-blue-500"
                                                        )} />
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                                                    {log.opdLabel}
                                                                </span>
                                                                <span className={cn(
                                                                    "px-1.5 py-0.5 rounded text-[9px] font-black uppercase border shrink-0",
                                                                    log.status === 'disetujui' && "bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50",
                                                                    log.status === 'ditolak' && "bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50",
                                                                    log.status === 'revisi' && "bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50",
                                                                    log.status === 'pending' && "bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50",
                                                                    log.status === 'terkirim' && "bg-blue-50 text-blue-700 border-blue-250 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50"
                                                                )}>
                                                                    {log.status.replace(/_/g, ' ')}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                                                {new Date(log.created_at).toLocaleDateString("id-ID", {
                                                                    day: "2-digit",
                                                                    month: "short",
                                                                    year: "numeric",
                                                                    hour: "2-digit",
                                                                    minute: "2-digit"
                                                                })}
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            Verifikator: <span className="font-medium text-slate-700 dark:text-slate-350">{log.verifikator_id || 'Sistem'}</span>
                                                        </div>
                                                        {log.catatan && (
                                                            <p className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-dashed border-slate-200/50 dark:border-slate-800/50 italic text-[11px] leading-relaxed">
                                                                "{log.catatan}"
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Input Hasil Verifikasi OPD */}
            <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-extrabold">Input Hasil Verifikasi</DialogTitle>
                        <DialogDescription className="text-xs">
                            Isi hasil verifikasi oleh <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedAssignment?.opd?.nama || selectedAssignment?.opd_id}</span>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-[11px] text-muted-foreground">Status Keputusan</Label>
                            <Select
                                value={verifyStatus}
                                onValueChange={(val: any) => setVerifyStatus(val)}
                            >
                                <SelectTrigger className="h-9 text-xs rounded-xl">
                                    <SelectValue placeholder="Pilih Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending" className="text-xs">PENDING (Antrean)</SelectItem>
                                    <SelectItem value="revisi" className="text-xs">REVISI (Butuh Perbaikan)</SelectItem>
                                    <SelectItem value="perbaikan_diterima" className="text-xs">PERBAIKAN DITERIMA</SelectItem>
                                    <SelectItem value="disetujui" className="text-xs">DISETUJUI</SelectItem>
                                    <SelectItem value="ditolak" className="text-xs">DITOLAK</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[11px] text-muted-foreground">Volume Verifikasi</Label>
                                <Input
                                    type="text"
                                    placeholder="Contoh: 500 Meter"
                                    value={verifyVolume}
                                    onChange={(e) => setVerifyVolume(e.target.value)}
                                    className="h-9 text-xs rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[11px] text-muted-foreground">Anggaran Verifikasi (Rp)</Label>
                                <Input
                                    type="number"
                                    placeholder="Contoh: 150000000"
                                    value={verifyAnggaran === '' ? '' : verifyAnggaran}
                                    onChange={(e) => setVerifyAnggaran(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="h-9 text-xs rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[11px] text-muted-foreground">Catatan / Rincian</Label>
                            <Textarea
                                placeholder="Tulis alasan keputusan, rincian perbaikan, atau catatan verifikasi..."
                                value={verifyCatatan}
                                onChange={(e) => setVerifyCatatan(e.target.value)}
                                className="min-h-16 text-xs rounded-xl"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[11px] text-muted-foreground">No. Dokumen Verifikasi</Label>
                                <Input
                                    type="text"
                                    placeholder="Contoh: S-123/2026"
                                    value={verifyNomorDokumen}
                                    onChange={(e) => setVerifyNomorDokumen(e.target.value)}
                                    className="h-9 text-xs rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5 flex flex-col justify-end">
                                <Label className="text-[11px] text-muted-foreground">Tgl. Dokumen Verifikasi</Label>
                                <Popover open={isVerifyCalendarOpen} onOpenChange={setIsVerifyCalendarOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal gap-2 h-9 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950",
                                                !verifyTanggalDokumen && "text-slate-400"
                                            )}
                                        >
                                            <CalendarIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                            {verifyTanggalDokumen
                                                ? new Date(verifyTanggalDokumen + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                                                : "Pilih tanggal"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="end">
                                        <CalendarPicker
                                            mode="single"
                                            selected={verifyTanggalDokumen ? new Date(verifyTanggalDokumen + "T00:00:00") : undefined}
                                            onSelect={(date: Date | undefined) => {
                                                if (date) {
                                                    const yyyy = date.getFullYear();
                                                    const mm = String(date.getMonth() + 1).padStart(2, "0");
                                                    const dd = String(date.getDate()).padStart(2, "0");
                                                    setVerifyTanggalDokumen(`${yyyy}-${mm}-${dd}`);
                                                } else {
                                                    setVerifyTanggalDokumen("");
                                                }
                                                setIsVerifyCalendarOpen(false);
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[11px] text-muted-foreground">URL Dokumen Verifikasi</Label>
                            <Input
                                type="text"
                                placeholder="Link dokumen pendukung (PDF/Drive)..."
                                value={verifyUrlDokumen}
                                onChange={(e) => setVerifyUrlDokumen(e.target.value)}
                                className="h-9 text-xs rounded-xl"
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => setIsVerifyDialogOpen(false)}
                            className="h-9 text-xs rounded-xl"
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleSaveVerify}
                            disabled={isSavingVerify}
                            className="h-9 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                        >
                            {isSavingVerify ? "Menyimpan..." : "Simpan Keputusan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Edit Surat Pengantar per Assignment */}
            <Dialog open={isPengantarDialogOpen} onOpenChange={(open) => { if (!open) { setIsPengantarDialogOpen(false); setEditingPengantarAssignment(null); } }}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-extrabold flex items-center gap-2">
                            <Mail className="h-4 w-4 text-violet-600" />
                            Surat Pengantar Bappeda
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Edit nomor & dokumen surat pengantar ke{" "}
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {editingPengantarAssignment?.opd?.nama || editingPengantarAssignment?.opd_id}
                            </span>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[11px] text-muted-foreground">No. Surat Pengantar</Label>
                                <Input
                                    type="text"
                                    placeholder="Contoh: 005/BAPPEDA/2025"
                                    value={pengantarNomor}
                                    onChange={(e) => setPengantarNomor(e.target.value)}
                                    className="h-9 text-xs rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5 flex flex-col justify-end">
                                <Label className="text-[11px] text-muted-foreground">Tgl. Surat Pengantar</Label>
                                <Popover open={isPengantarCalendarOpen} onOpenChange={setIsPengantarCalendarOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal gap-2 h-9 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950",
                                                !pengantarTanggal && "text-slate-400"
                                            )}
                                        >
                                            <CalendarIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                            {pengantarTanggal
                                                ? new Date(pengantarTanggal + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                                                : "Pilih tanggal"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="end">
                                        <CalendarPicker
                                            mode="single"
                                            selected={pengantarTanggal ? new Date(pengantarTanggal + "T00:00:00") : undefined}
                                            onSelect={(date: Date | undefined) => {
                                                if (date) {
                                                    const yyyy = date.getFullYear();
                                                    const mm = String(date.getMonth() + 1).padStart(2, "0");
                                                    const dd = String(date.getDate()).padStart(2, "0");
                                                    setPengantarTanggal(`${yyyy}-${mm}-${dd}`);
                                                } else {
                                                    setPengantarTanggal("");
                                                }
                                                setIsPengantarCalendarOpen(false);
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[11px] text-muted-foreground">URL Dokumen Surat Pengantar</Label>
                            <Input
                                type="text"
                                placeholder="Link dokumen surat pengantar (PDF/Drive)..."
                                value={pengantarUrl}
                                onChange={(e) => setPengantarUrl(e.target.value)}
                                className="h-9 text-xs rounded-xl"
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex gap-2 justify-end">
                        <Button
                            variant="ghost"
                            onClick={() => { setIsPengantarDialogOpen(false); setEditingPengantarAssignment(null); }}
                            className="h-9 text-xs rounded-xl"
                        >
                            Batal
                        </Button>
                        <Button
                            variant="outline"
                            type="button"
                            onClick={() => handleSavePengantar(false)}
                            disabled={isSavingPengantar}
                            className="h-9 text-xs rounded-xl border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30 font-semibold"
                        >
                            {isSavingPengantar ? "Menyimpan..." : "Simpan Draft"}
                        </Button>
                        <Button
                            type="button"
                            onClick={() => handleSavePengantar(true)}
                            disabled={isSavingPengantar}
                            className="h-9 text-xs rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold flex items-center gap-1.5"
                        >
                            <Send className="h-3.5 w-3.5" />
                            {isSavingPengantar ? "Mengirim..." : "Kirim Surat Pengantar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Pengecekan Usulan oleh Bappeda (pending -> verifikasi_bappeda) */}
            <Dialog open={isCekBappedaDialogOpen} onOpenChange={setIsCekBappedaDialogOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-extrabold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                            <ClipboardCheck className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                            Pengecekan & Penelaahan Usulan (Bappeda)
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Periksa kelengkapan & informasi usulan sebelum memproses ke tahap Verifikasi Bappeda.
                        </DialogDescription>
                    </DialogHeader>

                    {checkingUsulan && (
                        <div className="space-y-4 py-2">
                            {/* Ringkasan Data Usulan */}
                            <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-xs space-y-2">
                                <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-1.5">
                                    <span className="font-mono text-[11px] text-muted-foreground">No. Agenda: <strong className="text-slate-800 dark:text-slate-200">{checkingUsulan.nomor_agenda}</strong></span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                                        {checkingUsulan.status}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Uraian Usulan</span>
                                    <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5 leading-relaxed">{checkingUsulan.uraian_usulan}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                                    <div>
                                        <span className="text-muted-foreground">Desa / Kecamatan:</span>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{checkingUsulan.nama_desa || '-'} / {checkingUsulan.nama_kecamatan || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Tahun Anggaran:</span>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{checkingUsulan.tahun_anggaran}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Input Catatan Penelaahan Bappeda */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Catatan Penelaahan Bappeda</Label>
                                <Textarea
                                    placeholder="Tuliskan catatan hasil pengecekan / penelaahan Bappeda..."
                                    value={catatanBappedaInput}
                                    onChange={(e) => setCatatanBappedaInput(e.target.value)}
                                    className="text-xs rounded-xl min-h-[90px] resize-none"
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex gap-2 justify-end">
                        <Button
                            variant="ghost"
                            onClick={() => setIsCekBappedaDialogOpen(false)}
                            className="h-9 text-xs rounded-xl"
                        >
                            Batal
                        </Button>
                        <Button
                            variant="outline"
                            type="button"
                            onClick={() => handleProcessCekBappeda('ditolak')}
                            disabled={isSavingCekBappeda}
                            className="h-9 text-xs rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30 font-semibold"
                        >
                            Tolak Usulan
                        </Button>
                        <Button
                            type="button"
                            onClick={() => handleProcessCekBappeda('verifikasi_bappeda')}
                            disabled={isSavingCekBappeda}
                            className="h-9 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-xs"
                        >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {isSavingCekBappeda ? "Memproses..." : "Terima & Verifikasi Bappeda"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>

    );
}
