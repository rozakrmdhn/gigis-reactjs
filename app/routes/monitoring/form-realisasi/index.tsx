import React, { useEffect, useState } from "react";
import type { MetaFunction } from "react-router";
import { toast } from "sonner";
import { Plus, Trash2, Edit3, Lock, Unlock, Calendar, FileText, Settings, Link2, X, MoreHorizontal, ChevronLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { authService } from "~/services/auth.service";
import { realisasiService, type FormRealisasi } from "~/features/monitoring/services/realisasi.service";

export const meta: MetaFunction = () => {
    return [
        { title: "Form Realisasi - MELAROSA" },
        { name: "description", content: "Manajemen Form Realisasi Spasial Pembangunan." },
    ];
};

export default function FormRealisasiPage() {
    const [forms, setForms] = useState<FormRealisasi[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [activeRowId, setActiveRowId] = useState<string | null>(null);

    // Form Dialog state
    const [isOpenDialog, setIsOpenDialog] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

    // Form inputs
    const [judul, setJudul] = useState("");
    const [deskripsi, setDeskripsi] = useState("");
    const [tahunAnggaran, setTahunAnggaran] = useState<number>(new Date().getFullYear());
    const [isOpenForm, setIsOpenForm] = useState(false);
    const [opsiFungsi, setOpsiFungsi] = useState<Array<{ id: string; label: string }>>([
        { id: "perdagangan", label: "Perdagangan" },
        { id: "kesehatan", label: "Kesehatan" },
        { id: "pendidikan", label: "Pendidikan" },
        { id: "pertanian", label: "Pertanian" },
        { id: "permukiman", label: "Permukiman" },
    ]);
    const [newFungsiInput, setNewFungsiInput] = useState("");

    const [opsiKonstruksi, setOpsiKonstruksi] = useState<Array<{ id: string; label: string }>>([
        { id: "aspal_hotmix", label: "Aspal / Hotmix" },
        { id: "lapen", label: "Lapen (Lapis Penetrasi)" },
        { id: "rigid_beton", label: "Rigid / Beton" },
        { id: "paving_block", label: "Paving Block" },
        { id: "telford_makadam", label: "Telford / Makadam" },
        { id: "tanah", label: "Tanah" },
    ]);
    const [newKonstruksiInput, setNewKonstruksiInput] = useState("");

    useEffect(() => {
        const user = authService.getUser();
        setCurrentUser(user);
        fetchForms();

        // Lock HTML and Body elements scroll to prevent page-level vertical scrolling
        const originalHtmlOverflow = document.documentElement.style.overflow;
        const originalBodyOverflow = document.body.style.overflow;
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";

        return () => {
            document.documentElement.style.overflow = originalHtmlOverflow;
            document.body.style.overflow = originalBodyOverflow;
        };
    }, []);

    const fetchForms = async () => {
        setIsLoading(true);
        try {
            const res = await realisasiService.getAllForms();
            if (res.status === "success" && res.result) {
                setForms(res.result);
            }
        } catch (err) {
            console.error("Gagal mengambil form:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddFungsi = () => {
        if (!newFungsiInput.trim()) return;
        const label = newFungsiInput.trim();
        const id = label.toLowerCase().replace(/\s+/g, "_");
        if (opsiFungsi.some((f) => f.label.toLowerCase() === label.toLowerCase())) {
            toast.error("Opsi fungsi ini sudah ada.");
            return;
        }
        setOpsiFungsi((prev) => [...prev, { id, label }]);
        setNewFungsiInput("");
    };

    const handleRemoveFungsi = (id: string) => {
        if (opsiFungsi.length <= 1) {
            toast.error("Minimal harus ada 1 opsi fungsi.");
            return;
        }
        setOpsiFungsi((prev) => prev.filter((f) => f.id !== id));
    };

    const handleAddKonstruksi = () => {
        if (!newKonstruksiInput.trim()) return;
        const label = newKonstruksiInput.trim();
        const id = label.toLowerCase().replace(/\s+/g, "_");
        if (opsiKonstruksi.some((k) => k.label.toLowerCase() === label.toLowerCase())) {
            toast.error("Opsi konstruksi ini sudah ada.");
            return;
        }
        setOpsiKonstruksi((prev) => [...prev, { id, label }]);
        setNewKonstruksiInput("");
    };

    const handleRemoveKonstruksi = (id: string) => {
        if (opsiKonstruksi.length <= 1) {
            toast.error("Minimal harus ada 1 opsi konstruksi.");
            return;
        }
        setOpsiKonstruksi((prev) => prev.filter((k) => k.id !== id));
    };

    const handleOpenCreateDialog = () => {
        setIsEditMode(false);
        setSelectedFormId(null);
        setJudul("");
        setDeskripsi("");
        setTahunAnggaran(new Date().getFullYear());
        setIsOpenForm(false);
        setOpsiFungsi([
            { id: "perdagangan", label: "Perdagangan" },
            { id: "kesehatan", label: "Kesehatan" },
            { id: "pendidikan", label: "Pendidikan" },
            { id: "pertanian", label: "Pertanian" },
            { id: "permukiman", label: "Permukiman" },
        ]);
        setNewFungsiInput("");
        setOpsiKonstruksi([
            { id: "aspal_hotmix", label: "Aspal / Hotmix" },
            { id: "lapen", label: "Lapen (Lapis Penetrasi)" },
            { id: "rigid_beton", label: "Rigid / Beton" },
            { id: "paving_block", label: "Paving Block" },
            { id: "telford_makadam", label: "Telford / Makadam" },
            { id: "tanah", label: "Tanah" },
        ]);
        setNewKonstruksiInput("");
        setIsOpenDialog(true);
    };

    const handleOpenEditDialog = (form: FormRealisasi) => {
        setIsEditMode(true);
        setSelectedFormId(form.id);
        setJudul(form.judul);
        setDeskripsi(form.deskripsi || "");
        setTahunAnggaran(form.tahun_anggaran);
        setIsOpenForm(form.is_open);

        let loadedFungsi: Array<{ id: string; label: string }> = [
            { id: "perdagangan", label: "Perdagangan" },
            { id: "kesehatan", label: "Kesehatan" },
            { id: "pendidikan", label: "Pendidikan" },
            { id: "pertanian", label: "Pertanian" },
            { id: "permukiman", label: "Permukiman" },
        ];
        if (form.opsi_fungsi && Array.isArray(form.opsi_fungsi) && form.opsi_fungsi.length > 0) {
            loadedFungsi = form.opsi_fungsi.map((opt: any) =>
                typeof opt === "string" ? { id: opt.toLowerCase().replace(/\s+/g, "_"), label: opt } : opt
            );
        }
        setOpsiFungsi(loadedFungsi);
        setNewFungsiInput("");

        let loadedKonstruksi: Array<{ id: string; label: string }> = [
            { id: "aspal_hotmix", label: "Aspal / Hotmix" },
            { id: "lapen", label: "Lapen (Lapis Penetrasi)" },
            { id: "rigid_beton", label: "Rigid / Beton" },
            { id: "paving_block", label: "Paving Block" },
            { id: "telford_makadam", label: "Telford / Makadam" },
            { id: "tanah", label: "Tanah" },
        ];
        if (form.opsi_konstruksi && Array.isArray(form.opsi_konstruksi) && form.opsi_konstruksi.length > 0) {
            loadedKonstruksi = form.opsi_konstruksi.map((opt: any) =>
                typeof opt === "string" ? { id: opt.toLowerCase().replace(/\s+/g, "_"), label: opt } : opt
            );
        }
        setOpsiKonstruksi(loadedKonstruksi);
        setNewKonstruksiInput("");
        setIsOpenDialog(true);
    };

    const handleSaveForm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!judul.trim() || !tahunAnggaran) {
            toast.error("Judul dan Tahun Anggaran wajib diisi.");
            return;
        }

        try {
            if (isEditMode && selectedFormId) {
                await realisasiService.updateForm(selectedFormId, {
                    judul,
                    deskripsi,
                    tahun_anggaran: Number(tahunAnggaran),
                    is_open: isOpenForm,
                    opsi_fungsi: opsiFungsi,
                    opsi_konstruksi: opsiKonstruksi,
                });
            } else {
                const res = await realisasiService.createForm({
                    judul,
                    deskripsi,
                    tahun_anggaran: Number(tahunAnggaran),
                    is_open: isOpenForm,
                    opsi_fungsi: opsiFungsi,
                    opsi_konstruksi: opsiKonstruksi,
                });
                if (res.status === "success" && res.result) {
                    const newUrl = `${window.location.origin}/form-id/${res.result.id}`;
                    navigator.clipboard.writeText(newUrl);
                    toast.success(`Form berhasil dibuat! Link unik untuk desa telah disalin ke clipboard:\n${newUrl}`, {
                        duration: 8000,
                    });
                }
            }
            setIsOpenDialog(false);
            fetchForms();
        } catch (err) {
            console.error("Gagal menyimpan form:", err);
        }
    };

    const handleToggleStatus = async (form: FormRealisasi) => {
        try {
            await realisasiService.updateForm(form.id, {
                is_open: !form.is_open,
            });
            toast.success(`Form berhasil ${!form.is_open ? 'dibuka' : 'ditutup'}`);
            fetchForms();
        } catch (err) {
            console.error("Gagal mengubah status form:", err);
        }
    };

    const handleDeleteForm = async (id: string) => {
        if (!window.confirm("Apakah Anda yakin ingin menghapus form realisasi ini? Semua data isian desa pada form ini juga akan ikut terhapus.")) {
            return;
        }
        try {
            await realisasiService.deleteForm(id);
            fetchForms();
        } catch (err) {
            console.error("Gagal menghapus form:", err);
        }
    };

    const isAuthorized = currentUser?.role === "super_admin" || currentUser?.role === "operator_bappeda";

    if (!isAuthorized && currentUser) {
        return (
            <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
                <Lock className="h-16 w-16 text-muted-foreground" />
                <h1 className="text-2xl font-bold">Akses Ditolak</h1>
                <p className="text-muted-foreground text-center max-w-md">
                    Anda tidak memiliki hak akses untuk mengelola Form Realisasi. Silakan hubungi Administrator.
                </p>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 flex flex-col gap-4 p-4 bg-background dark:bg-slate-950 overflow-hidden">
            {/* Page Header */}
            <div className="flex items-center justify-between gap-4 shrink-0 pb-1 border-b border-slate-100 dark:border-slate-800/50">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                        Daftar Form Realisasi Spasial
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                        Kelola formulir inventarisasi lokasi koordinat realisasi pembangunan per tahun anggaran.
                    </p>
                </div>
                <Button onClick={handleOpenCreateDialog} className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shrink-0">
                    <Plus className="h-4 w-4" />
                    <span>Tambah Form</span>
                </Button>
            </div>

            {/* Table Container */}
            <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-md border shadow-sm flex flex-col overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-1 items-center justify-center">
                        <span className="text-muted-foreground">Memuat data...</span>
                    </div>
                ) : forms.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2">
                        <FileText className="h-10 w-10 text-muted-foreground" />
                        <span className="text-muted-foreground font-semibold">Belum ada form realisasi</span>
                    </div>
                ) : (
                    <div className="flex-1 min-h-0 overflow-auto">
                        <Table className="relative w-full border-collapse">
                            <TableHeader className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">
                                <TableRow>
                                    <TableHead className="w-[60px] min-w-[60px] bg-slate-50 dark:bg-slate-800 text-center sticky left-0 z-20 border-r border-slate-200 dark:border-slate-800">Aksi</TableHead>
                                    <TableHead className="bg-slate-50 dark:bg-slate-800">Judul Form</TableHead>
                                    <TableHead className="bg-slate-50 dark:bg-slate-800">Deskripsi</TableHead>
                                    <TableHead className="w-[150px] bg-slate-50 dark:bg-slate-800">Tahun Anggaran</TableHead>
                                    <TableHead className="w-[150px] bg-slate-50 dark:bg-slate-800">Status Pengisian</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                    {forms.map((form) => (
                                        <TableRow key={form.id} className="group">
                                            <TableCell className="w-[60px] min-w-[60px] p-0 relative sticky left-0 bg-white dark:bg-slate-950 group-hover:bg-slate-50 dark:group-hover:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] z-10">
                                                <div className="flex items-center justify-center h-12 w-full">
                                                    <Button
                                                        variant="ghost"
                                                        onClick={(e) => { e.stopPropagation(); setActiveRowId(form.id); }}
                                                        className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                                    </Button>
                                                </div>
                                                {/* Sliding Actions Panel */}
                                                <div className={cn(
                                                    "absolute top-0 bottom-0 left-0 z-20 flex items-center justify-center gap-1 bg-blue-50/95 dark:bg-blue-950/95 backdrop-blur-xs transition-all duration-300 ease-in-out px-2 border-r border-slate-200 dark:border-slate-800 rounded-r-xl w-[140px]",
                                                    activeRowId === form.id ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0 pointer-events-none"
                                                )}>
                                                    <Button
                                                        variant="ghost" size="sm"
                                                        className="h-7 w-7 p-0 hover:bg-slate-200 text-slate-500 rounded-md shrink-0"
                                                        onClick={(e) => { e.stopPropagation(); setActiveRowId(null); }}
                                                    >
                                                        <ChevronLeft className="h-4 w-4" />
                                                    </Button>
                                                    <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-0.5 shrink-0" />
                                                    <Button
                                                        variant="outline" size="sm"
                                                        className="h-7 w-7 p-0 border-slate-200 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 shrink-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const url = `${window.location.origin}/form-id/${form.id}`;
                                                            navigator.clipboard.writeText(url);
                                                            toast.success("Link formulir publik berhasil disalin ke clipboard!");
                                                            setActiveRowId(null);
                                                        }}
                                                        title="Salin Link Publik"
                                                    >
                                                        <Link2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="outline" size="sm"
                                                        className="h-7 w-7 p-0 border-slate-200 text-blue-600 hover:text-blue-700 hover:bg-blue-50 shrink-0"
                                                        onClick={(e) => { e.stopPropagation(); handleOpenEditDialog(form); setActiveRowId(null); }}
                                                        title="Edit Form"
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="outline" size="sm"
                                                        className="h-7 w-7 p-0 border-slate-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteForm(form.id); setActiveRowId(null); }}
                                                        title="Hapus Form"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">{form.judul}</TableCell>
                                            <TableCell className="text-muted-foreground max-w-[300px] truncate">
                                                {form.deskripsi || "-"}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                    <span>{form.tahun_anggaran}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={form.is_open}
                                                        onCheckedChange={() => handleToggleStatus(form)}
                                                    />
                                                    <Badge variant={form.is_open ? "default" : "secondary"}>
                                                        {form.is_open ? "Buka" : "Tutup"}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
            </div>

            <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
                <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? "Edit Form Realisasi" : "Tambah Form Realisasi"}</DialogTitle>
                        <DialogDescription>
                            Isi detail informasi form di bawah ini. Pastikan tahun anggaran sudah benar.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveForm} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="judul">Judul Form</Label>
                            <Input
                                id="judul"
                                value={judul}
                                onChange={(e) => setJudul(e.target.value)}
                                placeholder="Contoh: Realisasi Fisik Infrastruktur 2025"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="deskripsi">Deskripsi</Label>
                            <Textarea
                                id="deskripsi"
                                value={deskripsi}
                                onChange={(e) => setDeskripsi(e.target.value)}
                                placeholder="Tulis deskripsi atau instruksi pengisian..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="tahun">Tahun Anggaran</Label>
                                <Input
                                    id="tahun"
                                    type="number"
                                    value={tahunAnggaran}
                                    onChange={(e) => setTahunAnggaran(Number(e.target.value))}
                                    required
                                />
                            </div>
                            <div className="flex flex-col justify-end space-y-2">
                                <Label htmlFor="isOpen">Buka Pengisian?</Label>
                                <div className="flex h-10 items-center space-x-2">
                                    <Switch
                                        id="isOpen"
                                        checked={isOpenForm}
                                        onCheckedChange={setIsOpenForm}
                                    />
                                    <span>{isOpenForm ? "Ya" : "Tidak"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Konfigurasi Opsi Fungsi Checkbox */}
                        <div className="space-y-2 rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/30">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Konfigurasi Opsi Fungsi Infrastruktur
                            </Label>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                Tentukan opsi fungsi yang dapat dipilih oleh publik/desa saat mengisi form ini.
                            </p>

                            {/* Options Tags list */}
                            <div className="flex flex-wrap gap-1.5 py-1">
                                {opsiFungsi.map((f) => (
                                    <span
                                        key={f.id}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60"
                                    >
                                        {f.label}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveFungsi(f.id)}
                                            className="text-indigo-400 hover:text-rose-500 rounded-full p-0.5 transition-colors"
                                            title="Hapus Opsi"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>

                            {/* Add New Option Input */}
                            <div className="flex gap-2 pt-1">
                                <Input
                                    value={newFungsiInput}
                                    onChange={(e) => setNewFungsiInput(e.target.value)}
                                    placeholder="Tambah opsi baru (misal: Irigasi)..."
                                    className="h-8 text-xs bg-white dark:bg-slate-950"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddFungsi();
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs font-semibold shrink-0 gap-1"
                                    onClick={handleAddFungsi}
                                >
                                    <Plus className="h-3.5 w-3.5" /> Tambah
                                </Button>
                            </div>
                        </div>

                        {/* Konfigurasi Opsi Jenis Konstruksi */}
                        <div className="space-y-2 rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/30">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Konfigurasi Opsi Jenis Konstruksi
                            </Label>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                Tentukan opsi jenis konstruksi yang dapat dipilih oleh publik/desa saat mengisi form ini.
                            </p>

                            {/* Options Tags list */}
                            <div className="flex flex-wrap gap-1.5 py-1">
                                {opsiKonstruksi.map((k) => (
                                    <span
                                        key={k.id}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                                    >
                                        {k.label}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveKonstruksi(k.id)}
                                            className="text-emerald-400 hover:text-rose-500 rounded-full p-0.5 transition-colors"
                                            title="Hapus Opsi"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>

                            {/* Add New Option Input */}
                            <div className="flex gap-2 pt-1">
                                <Input
                                    value={newKonstruksiInput}
                                    onChange={(e) => setNewKonstruksiInput(e.target.value)}
                                    placeholder="Tambah konstruksi baru (misal: Sirtu)..."
                                    className="h-8 text-xs bg-white dark:bg-slate-950"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddKonstruksi();
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs font-semibold shrink-0 gap-1"
                                    onClick={handleAddKonstruksi}
                                >
                                    <Plus className="h-3.5 w-3.5" /> Tambah
                                </Button>
                            </div>
                        </div>
                        {isEditMode && selectedFormId && (
                            <div className="space-y-2 rounded-md border bg-slate-50 p-2.5 dark:bg-slate-900">
                                <Label className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Link Unik Pengisian Desa (Publik)</Label>
                                <div className="flex gap-1.5 items-center mt-1">
                                    <Input
                                        className="h-8 text-xs select-all bg-white dark:bg-slate-950 font-mono"
                                        value={`${window.location.origin}/form-id/${selectedFormId}`}
                                        readOnly
                                    />
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="h-8 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 text-xs"
                                        onClick={() => {
                                            const url = `${window.location.origin}/form-id/${selectedFormId}`;
                                            navigator.clipboard.writeText(url);
                                            toast.success("Link formulir berhasil disalin!");
                                        }}
                                    >
                                        Salin
                                    </Button>
                                </div>
                            </div>
                        )}
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsOpenDialog(false)}>
                                Batal
                            </Button>
                            <Button type="submit">Simpan</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
