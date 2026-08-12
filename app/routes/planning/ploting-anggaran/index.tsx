import React, { useEffect, useState, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Building2,
    Coins,
    Ruler,
    FileSpreadsheet,
    RotateCw,
    MoreHorizontal,
    ChevronLeft,
    Layers,
    SlidersHorizontal,
    Filter,
    Upload,
    Download,
    CheckCircle2,
    AlertCircle,
    X,
    Sparkles,
    Loader2
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Combobox, type ComboboxOption } from "~/components/ui/combobox";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
} from "~/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
import { toast } from "sonner";
import { UsulanDesaPagination } from "~/features/usulan-desa/components/UsulanDesaPagination";
import { kecamatanService, type Kecamatan } from "~/services/kecamatan";
import { desaService, type Desa } from "~/services/desa";
import {
    plottingAnggaranService,
    type PlottingAnggaran,
    type PlottingAnggaranPayload
} from "~/features/monitoring/services/plotting_anggaran.service";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
    return [
        { title: "Ploting Anggaran Infrastruktur - MELAROSA" },
        { name: "description", content: "Manajemen alokasi pagu anggaran & target fisik pembangunan infrastruktur desa" },
    ];
};

export default function PlotingAnggaranPage() {
    const [dataList, setDataList] = useState<PlottingAnggaran[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [activeRowId, setActiveRowId] = useState<string | null>(null);
    const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState<boolean>(false);

    // Summary totals
    const [metaSummary, setMetaSummary] = useState({
        total: 0,
        totalPagu: 0,
        totalPanjang: 0
    });

    // Master region options
    const [kecamatanList, setKecamatanList] = useState<Kecamatan[]>([]);
    const [desaList, setDesaList] = useState<Desa[]>([]);
    const [formDesaList, setFormDesaList] = useState<Desa[]>([]);

    // Filters & Search
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [selectedTahun, setSelectedTahun] = useState<string>("all");
    const [selectedKec, setSelectedKec] = useState<string>("all");
    const [selectedDesa, setSelectedDesa] = useState<string>("all");
    const [selectedSumberDana, setSelectedSumberDana] = useState<string>("all");

    // Pagination State
    const [page, setPage] = useState<number>(1);
    const [limit, setLimit] = useState<number>(25);

    // Modal state
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
    const [editingItem, setEditingItem] = useState<PlottingAnggaran | null>(null);
    const [submitting, setSubmitting] = useState<boolean>(false);

    // Delete dialog state
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    // Import Excel modal state
    const [isImportDialogOpen, setIsImportDialogOpen] = useState<boolean>(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState<boolean>(false);
    const [importResult, setImportResult] = useState<{
        imported_count: number;
        created_count: number;
        updated_count: number;
        failed_count: number;
        details?: { row: number; status: "Created" | "Updated"; nama_kegiatan: string; message: string }[];
        errors: { row: number; error: string }[];
    } | null>(null);

    const handleDownloadTemplate = () => {
        let sampleData = [];
        if (dataList && dataList.length > 0) {
            sampleData = dataList.map((item) => ({
                "ID Plotting (Kosongkan Jika Baru)": item.id,
                "Tahun Anggaran": item.tahun_anggaran,
                "Kecamatan": item.Kecamatan?.nama_kecamatan || item.id_kecamatan,
                "Desa": item.Desa?.nama_desa || item.id_desa,
                "Jenis Bantuan": item.jenis_bantuan,
                "Nama Kegiatan": item.nama_kegiatan,
                "Lokasi Kegiatan": item.lokasi_kegiatan || "",
                "Sumber Dana": item.sumber_dana,
                "Target Pagu Anggaran": Number(item.target_pagu_anggaran) || 0,
                "Target Panjang (m)": Number(item.target_panjang_m) || 0,
                "Status Database (Auto Sync)": "Sudah Ada di DB (Siap Edit)"
            }));
        } else {
            sampleData = [
                {
                    "ID Plotting (Kosongkan Jika Baru)": "",
                    "Tahun Anggaran": 2025,
                    "Kecamatan": "KEDUNGADEM",
                    "Desa": "SRATEN",
                    "Jenis Bantuan": "BKK Desa",
                    "Nama Kegiatan": "Pembangunan Jalan Poros Desa Sraten",
                    "Lokasi Kegiatan": "RT 02 / RW 01 Desa Sraten",
                    "Sumber Dana": "BKK",
                    "Target Pagu Anggaran": 150000000,
                    "Target Panjang (m)": 500,
                    "Status Database (Auto Sync)": "Contoh Baru (Kosongkan ID)"
                }
            ];
        }

        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        worksheet["!cols"] = [
            { wch: 36 }, // ID Plotting
            { wch: 16 }, // Tahun Anggaran
            { wch: 22 }, // Kecamatan
            { wch: 22 }, // Desa
            { wch: 18 }, // Jenis Bantuan
            { wch: 45 }, // Nama Kegiatan
            { wch: 35 }, // Lokasi Kegiatan
            { wch: 15 }, // Sumber Dana
            { wch: 24 }, // Target Pagu Anggaran
            { wch: 20 }, // Target Panjang (m)
            { wch: 32 }  // Status Database
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Plotting Anggaran");
        XLSX.writeFile(workbook, "Data_Plotting_Anggaran_Siap_Edit.xlsx");
    };

    const handleImportSubmit = async () => {
        if (!importFile) {
            toast.error("Pilih file Excel terlebih dahulu");
            return;
        }

        setIsImporting(true);
        setImportResult(null);
        try {
            const res = await plottingAnggaranService.importPlottingExcel(importFile);
            if (res && (res.status === 'success' || res.result)) {
                const resData = res.result || res;
                setImportResult(resData);
                toast.success(res.message || `Berhasil mengimpor ${resData.imported_count || 0} data!`);
                fetchData();
            } else {
                toast.error(res?.message || "Gagal mengimpor data Excel");
            }
        } catch (err: any) {
            console.error("Import excel error:", err);
            toast.error(err?.message || "Gagal mengimpor file Excel");
        } finally {
            setIsImporting(false);
        }
    };

    // Form inputs
    const [formData, setFormData] = useState<{
        tahun_anggaran: number;
        id_kecamatan: string;
        id_desa: string;
        jenis_bantuan: string;
        nama_kegiatan: string;
        lokasi_kegiatan: string;
        sumber_dana: string;
        target_pagu_anggaran: string;
        target_panjang_m: string;
    }>({
        tahun_anggaran: 2026,
        id_kecamatan: "",
        id_desa: "",
        jenis_bantuan: "BKK Desa",
        nama_kegiatan: "",
        lokasi_kegiatan: "",
        sumber_dana: "BKK",
        target_pagu_anggaran: "",
        target_panjang_m: ""
    });

    // Active filter counter
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (selectedTahun && selectedTahun !== "all") count++;
        if (selectedKec && selectedKec !== "all") count++;
        if (selectedDesa && selectedDesa !== "all") count++;
        if (selectedSumberDana && selectedSumberDana !== "all") count++;
        return count;
    }, [selectedTahun, selectedKec, selectedDesa, selectedSumberDana]);

    // Combobox Options Memo
    const tahunOptions: ComboboxOption[] = useMemo(() => [
        { value: "all", label: "Semua Tahun" },
        { value: "2024", label: "TA 2024" },
        { value: "2025", label: "TA 2025" },
        { value: "2026", label: "TA 2026" },
        { value: "2027", label: "TA 2027" },
    ], []);

    const sumberDanaOptions: ComboboxOption[] = useMemo(() => [
        { value: "all", label: "Semua Sumber Dana" },
        { value: "BKK", label: "BKK" },
        { value: "ADD", label: "ADD" },
        { value: "DAK", label: "DAK" },
        { value: "Sektoral", label: "Sektoral" },
        { value: "Lainnya", label: "Lainnya" },
    ], []);

    const kecamatanFilterOptions: ComboboxOption[] = useMemo(() => [
        { value: "all", label: "Semua Kecamatan" },
        ...kecamatanList.map(k => ({ value: k.id.toString(), label: k.nama_kecamatan }))
    ], [kecamatanList]);

    const desaFilterOptions: ComboboxOption[] = useMemo(() => [
        { value: "all", label: "Semua Desa" },
        ...desaList.map(d => ({ value: d.id.toString(), label: d.nama_desa }))
    ], [desaList]);

    const formKecamatanOptions: ComboboxOption[] = useMemo(() => [
        ...kecamatanList.map(k => ({ value: k.id.toString(), label: k.nama_kecamatan }))
    ], [kecamatanList]);

    const formDesaOptions: ComboboxOption[] = useMemo(() => [
        ...formDesaList.map(d => ({ value: d.id.toString(), label: d.nama_desa }))
    ], [formDesaList]);

    // Load master kecamatan on mount
    useEffect(() => {
        const loadMasterKecamatan = async () => {
            try {
                const list = await kecamatanService.getKecamatan();
                setKecamatanList(list || []);
            } catch (err) {
                console.error("Failed to load kecamatan:", err);
            }
        };
        loadMasterKecamatan();
    }, []);

    // Load desa options for filter when selectedKec changes
    useEffect(() => {
        const loadDesaForFilter = async () => {
            try {
                const list = await desaService.getDesa(selectedKec !== "all" ? selectedKec : undefined);
                setDesaList(list || []);
            } catch (err) {
                console.error("Failed to load desa for filter:", err);
                setDesaList([]);
            }
        };
        loadDesaForFilter();
    }, [selectedKec]);

    // Load desa options for dialog form when formData.id_kecamatan changes
    useEffect(() => {
        const loadDesaForForm = async () => {
            try {
                const list = await desaService.getDesa(formData.id_kecamatan || undefined);
                setFormDesaList(list || []);
            } catch (err) {
                console.error("Failed to load desa for form:", err);
                setFormDesaList([]);
            }
        };
        loadDesaForForm();
    }, [formData.id_kecamatan]);

    // Main data fetching
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await plottingAnggaranService.getPlottingList({
                tahun_anggaran: selectedTahun !== "all" ? selectedTahun : undefined,
                id_kecamatan: selectedKec !== "all" ? selectedKec : undefined,
                id_desa: selectedDesa !== "all" ? selectedDesa : undefined,
                sumber_dana: selectedSumberDana !== "all" ? selectedSumberDana : undefined,
                search: searchTerm.trim() || undefined,
                page: page,
                limit: limit
            });

            if (res?.status === "success") {
                setDataList(res.result || []);
                const summaryMeta = res.summary || res.meta || {};
                setMetaSummary({
                    total: summaryMeta.total_kegiatan ?? summaryMeta.total ?? 0,
                    totalPagu: summaryMeta.total_pagu_anggaran ?? summaryMeta.total_pagu ?? 0,
                    totalPanjang: summaryMeta.total_target_fisik ?? summaryMeta.total_panjang_m ?? 0
                });
            } else {
                setDataList([]);
            }
        } catch (err) {
            console.error("Fetch plotting data error:", err);
            setDataList([]);
        } finally {
            setLoading(false);
        }
    }, [selectedTahun, selectedKec, selectedDesa, selectedSumberDana, searchTerm, page, limit]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleResetFilters = () => {
        setSearchTerm("");
        setSelectedTahun("all");
        setSelectedKec("all");
        setSelectedDesa("all");
        setSelectedSumberDana("all");
        setPage(1);
        fetchData();
    };

    // Handle Open Create Dialog
    const handleOpenCreate = () => {
        setEditingItem(null);
        setFormData({
            tahun_anggaran: parseInt(selectedTahun !== "all" ? selectedTahun : "2026"),
            id_kecamatan: selectedKec !== "all" ? selectedKec : "",
            id_desa: selectedDesa !== "all" ? selectedDesa : "",
            jenis_bantuan: "BKK Desa",
            nama_kegiatan: "",
            lokasi_kegiatan: "",
            sumber_dana: "BKK",
            target_pagu_anggaran: "",
            target_panjang_m: ""
        });
        setIsDialogOpen(true);
    };

    // Handle Open Edit Dialog
    const handleOpenEdit = (item: PlottingAnggaran) => {
        setEditingItem(item);
        setFormData({
            tahun_anggaran: item.tahun_anggaran,
            id_kecamatan: item.id_kecamatan.toString(),
            id_desa: item.id_desa.toString(),
            jenis_bantuan: item.jenis_bantuan || "BKK Desa",
            nama_kegiatan: item.nama_kegiatan,
            lokasi_kegiatan: item.lokasi_kegiatan || "",
            sumber_dana: item.sumber_dana || "BKK",
            target_pagu_anggaran: item.target_pagu_anggaran.toString(),
            target_panjang_m: item.target_panjang_m.toString()
        });
        setIsDialogOpen(true);
    };

    // Handle Submit Create / Update
    const handleSubmitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.id_kecamatan || !formData.id_desa) {
            toast.error("Kecamatan dan Desa wajib dipilih");
            return;
        }
        if (!formData.nama_kegiatan.trim()) {
            toast.error("Nama Kegiatan wajib diisi");
            return;
        }

        setSubmitting(true);
        const payload: PlottingAnggaranPayload = {
            tahun_anggaran: Number(formData.tahun_anggaran),
            id_kecamatan: formData.id_kecamatan,
            id_desa: formData.id_desa,
            jenis_bantuan: formData.jenis_bantuan.trim(),
            nama_kegiatan: formData.nama_kegiatan.trim(),
            lokasi_kegiatan: formData.lokasi_kegiatan.trim(),
            sumber_dana: formData.sumber_dana,
            target_pagu_anggaran: parseFloat(formData.target_pagu_anggaran) || 0,
            target_panjang_m: parseFloat(formData.target_panjang_m) || 0,
        };

        try {
            if (editingItem) {
                await plottingAnggaranService.updatePlotting(editingItem.id, payload);
                toast.success("Data Ploting Anggaran berhasil diperbarui!");
            } else {
                await plottingAnggaranService.createPlotting(payload);
                toast.success("Data Ploting Anggaran berhasil ditambahkan!");
            }
            setIsDialogOpen(false);
            fetchData();
        } catch (err) {
            console.error("Save plotting error:", err);
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Confirm Delete
    const handleConfirmDelete = async () => {
        if (!deleteTargetId) return;
        setIsDeleting(true);
        try {
            await plottingAnggaranService.deletePlotting(deleteTargetId);
            toast.success("Data Ploting Anggaran berhasil dihapus");
            fetchData();
        } catch (err) {
            console.error("Delete plotting error:", err);
        } finally {
            setIsDeleting(false);
            setDeleteTargetId(null);
        }
    };

    // Formatters
    const formatIDR = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const formatMeter = (m: number) => {
        return new Intl.NumberFormat("id-ID", {
            maximumFractionDigits: 1
        }).format(m || 0) + " m";
    };

    const totalPages = Math.ceil(metaSummary.total / limit) || 1;

    return (
        <div className="absolute inset-0 flex flex-col gap-4 p-4 bg-background dark:bg-slate-950 overflow-hidden">
            {/* Header Section */}
            <div className="flex items-center justify-between gap-4 shrink-0 pb-1 border-b border-slate-100 dark:border-slate-800/50">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                        Ploting Anggaran Infrastruktur Desa
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                        Manajemen alokasi pagu anggaran & target fisik pembangunan infrastruktur desa per Tahun Anggaran.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        onClick={() => {
                            setIsImportDialogOpen(true);
                            setImportFile(null);
                            setImportResult(null);
                        }}
                        variant="outline"
                        className="h-9 font-semibold gap-1.5 shrink-0 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-950/30"
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>Import Excel</span>
                    </Button>
                    <Button
                        onClick={handleOpenCreate}
                        className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shrink-0"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Tambah Ploting Anggaran</span>
                    </Button>
                </div>
            </div>

            {/* Stat Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
                <Card className="p-3 border dark:border-slate-800 bg-white dark:bg-slate-950">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                            <Coins className="size-5" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                                Total Pagu Anggaran
                            </span>
                            <span className="text-base font-extrabold text-foreground">
                                {formatIDR(metaSummary.totalPagu)}
                            </span>
                        </div>
                    </div>
                </Card>

                <Card className="p-3 border dark:border-slate-800 bg-white dark:bg-slate-950">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <Ruler className="size-5" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                                Total Target Fisik
                            </span>
                            <span className="text-base font-extrabold text-foreground">
                                {formatMeter(metaSummary.totalPanjang)}
                            </span>
                        </div>
                    </div>
                </Card>

                <Card className="p-3 border dark:border-slate-800 bg-white dark:bg-slate-950">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <FileSpreadsheet className="size-5" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                                Total Kegiatan Plotting
                            </span>
                            <span className="text-base font-extrabold text-foreground">
                                {metaSummary.total} Kegiatan
                            </span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Card Table Area with Full-Width Combobox Filter Toolbar */}
            <div className="flex-1 min-h-0 flex flex-col mb-4">
                <Card className="gap-0 py-0 overflow-hidden border dark:border-slate-800 bg-white dark:bg-slate-950 relative flex flex-col flex-1 min-h-0">
                    {/* Sleek Toolbar */}
                    <div className="p-4 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-slate-50/30 dark:bg-slate-900/10">
                        {/* Search Input on Left */}
                        <div className="relative w-full max-w-xs sm:max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari desa, kecamatan, kegiatan, atau lokasi..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setPage(1);
                                }}
                                className="pl-9 h-9 w-full text-xs"
                            />
                        </div>

                        {/* Filter Popover & Action Controls on Right */}
                        <div className="flex items-center gap-2 shrink-0">
                            <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            "h-9 text-xs font-semibold gap-2 dark:border-slate-800",
                                            activeFilterCount > 0 && "border-blue-500 text-blue-600 bg-blue-50/50 dark:bg-blue-950/40"
                                        )}
                                    >
                                        <SlidersHorizontal className="h-3.5 w-3.5" />
                                        <span>Filter</span>
                                        {activeFilterCount > 0 && (
                                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-blue-600 text-white rounded-full">
                                                {activeFilterCount}
                                            </Badge>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-80 p-4 space-y-4 shadow-xl border dark:border-slate-800">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                                            <Filter className="h-3.5 w-3.5 text-blue-600" />
                                            <span>Filter Ploting Anggaran</span>
                                        </div>
                                        {activeFilterCount > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleResetFilters}
                                                className="h-6 text-[10px] text-muted-foreground hover:text-foreground px-1"
                                            >
                                                Reset
                                            </Button>
                                        )}
                                    </div>

                                    <div className="space-y-3 text-xs">
                                        {/* Tahun Filter — Full Width Combobox */}
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Tahun Anggaran</Label>
                                            <Combobox
                                                options={tahunOptions}
                                                value={selectedTahun}
                                                onChange={(val) => { setSelectedTahun(val); setPage(1); }}
                                                placeholder="Semua Tahun"
                                                searchPlaceholder="Cari tahun..."
                                                className="w-full"
                                            />
                                        </div>

                                        {/* Kecamatan Filter — Full Width Combobox */}
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Kecamatan</Label>
                                            <Combobox
                                                options={kecamatanFilterOptions}
                                                value={selectedKec}
                                                onChange={(val) => { setSelectedKec(val); setPage(1); }}
                                                placeholder="Semua Kecamatan"
                                                searchPlaceholder="Cari kecamatan..."
                                                className="w-full"
                                            />
                                        </div>

                                        {/* Desa Filter — Full Width Combobox */}
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Desa</Label>
                                            <Combobox
                                                options={desaFilterOptions}
                                                value={selectedDesa}
                                                onChange={(val) => {
                                                    setSelectedDesa(val);
                                                    setPage(1);
                                                    if (val !== "all" && selectedKec === "all") {
                                                        const found = desaList.find(d => d.id.toString() === val);
                                                        if (found?.id_kecamatan) {
                                                            setSelectedKec(found.id_kecamatan.toString());
                                                        }
                                                    }
                                                }}
                                                placeholder="Semua Desa"
                                                searchPlaceholder="Cari desa..."
                                                className="w-full"
                                            />
                                        </div>

                                        {/* Sumber Dana Filter — Full Width Combobox */}
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Sumber Dana</Label>
                                            <Combobox
                                                options={sumberDanaOptions}
                                                value={selectedSumberDana}
                                                onChange={(val) => { setSelectedSumberDana(val); setPage(1); }}
                                                placeholder="Semua Sumber Dana"
                                                searchPlaceholder="Cari sumber dana..."
                                                className="w-full"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t flex gap-2">
                                        <Button
                                            onClick={() => setIsFilterPopoverOpen(false)}
                                            size="sm"
                                            className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                        >
                                            Terapkan Filter
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {(activeFilterCount > 0 || searchTerm) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleResetFilters}
                                    className="h-9 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    Reset
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 dark:border-slate-800"
                                onClick={fetchData}
                                disabled={loading}
                            >
                                <RotateCw className={cn("h-4 w-4", loading && "animate-spin")} />
                            </Button>
                        </div>
                    </div>

                    {/* Table Area */}
                    <CardContent className="p-0 overflow-hidden flex-1 min-h-0 flex flex-row relative">
                        <div className="flex-1 overflow-auto custom-scrollbar [&_[data-slot=table-container]]:overflow-visible">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-20 border-b border-border shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
                                    <TableRow>
                                        <TableHead className="text-center font-semibold sticky top-0 left-0 z-30 bg-slate-50 dark:bg-slate-900 border-r shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] w-[110px] min-w-[110px] md:w-[110px] md:min-w-[110px]">Aksi</TableHead>
                                        <TableHead className="font-semibold">Tahun</TableHead>
                                        <TableHead className="font-semibold">Nama Kegiatan & Lokasi</TableHead>
                                        <TableHead className="font-semibold">Kecamatan</TableHead>
                                        <TableHead className="font-semibold">Desa</TableHead>
                                        <TableHead className="font-semibold">Jenis Bantuan</TableHead>
                                        <TableHead className="font-semibold">Sumber Dana</TableHead>
                                        <TableHead className="font-semibold text-right">Target Pagu (Rp)</TableHead>
                                        <TableHead className="font-semibold text-right">Target Fisik (m)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="h-24">
                                                <div className="p-4 space-y-4">
                                                    <Skeleton className="h-10 w-full" />
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <Skeleton key={i} className="h-12 w-full" />
                                                    ))}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : dataList.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                                                <Layers className="size-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                                                <p className="font-medium">Tidak ada data ploting anggaran ditemukan.</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        dataList.map((item) => (
                                            <TableRow key={item.id} className="group transition-colors">
                                                {/* Action Column */}
                                                <TableCell className="w-[110px] min-w-[110px] md:w-[110px] md:min-w-[110px] p-0 relative sticky left-0 bg-white dark:bg-slate-950 group-hover:bg-slate-50 dark:group-hover:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] z-10 transition-colors">
                                                    {/* Desktop Actions Layout */}
                                                    <div className="hidden md:flex flex-row items-center justify-center gap-1.5 h-12 w-full px-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 w-7 p-0 border-slate-200 dark:border-slate-800 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 shrink-0"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenEdit(item);
                                                            }}
                                                            title="Edit Ploting"
                                                        >
                                                            <Edit2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 w-7 p-0 border-slate-200 dark:border-slate-800 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDeleteTargetId(item.id);
                                                            }}
                                                            title="Hapus Ploting"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>

                                                    {/* Mobile Dropdown Menu Layout */}
                                                    <div className="flex md:hidden items-center justify-center h-12 w-full">
                                                        <Popover open={activeRowId === item.id} onOpenChange={(open) => setActiveRowId(open ? item.id : null)}>
                                                            <PopoverTrigger asChild>
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent align="start" className="w-36 p-1 bg-popover border-border">
                                                                <div className="flex flex-col gap-0.5">
                                                                    <Button
                                                                        variant="ghost" size="sm"
                                                                        className="justify-start h-8 text-xs font-semibold text-blue-600"
                                                                        onClick={() => { handleOpenEdit(item); setActiveRowId(null); }}
                                                                    >
                                                                        <Edit2 className="h-3.5 w-3.5 mr-2" />
                                                                        Edit Ploting
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost" size="sm"
                                                                        className="justify-start h-8 text-xs font-semibold text-rose-600"
                                                                        onClick={() => { setDeleteTargetId(item.id); setActiveRowId(null); }}
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                                        Hapus Data
                                                                    </Button>
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded font-bold text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                        TA {item.tahun_anggaran}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="max-w-[280px]">
                                                    <div className="font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                                        {item.nama_kegiatan}
                                                    </div>
                                                    {item.lokasi_kegiatan && (
                                                        <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                                                            {item.lokasi_kegiatan}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                                                    {item.Kecamatan?.nama_kecamatan || item.id_kecamatan}
                                                </TableCell>
                                                <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                                                    {item.Desa?.nama_desa || item.id_desa}
                                                </TableCell>
                                                <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                                                    {item.jenis_bantuan}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 uppercase">
                                                        {item.sumber_dana}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right font-extrabold text-slate-900 dark:text-slate-100">
                                                    {formatIDR(item.target_pagu_anggaran)}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                                                    {formatMeter(item.target_panjang_m)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Sticky Bottom Pagination */}
            <UsulanDesaPagination
                pageCount={totalPages}
                pageIndex={page - 1}
                pageSize={limit}
                totalItems={metaSummary.total}
                onPageChange={(newPageIndex) => setPage(newPageIndex + 1)}
                onPageSizeChange={(newSize) => {
                    setLimit(newSize);
                    setPage(1);
                }}
            />

            {/* Create & Edit Modal Dialog with Full-Width Comboboxes */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent
                    className="sm:max-w-[550px] bg-popover border-border rounded-xl shadow-2xl"
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle className="text-sm font-bold flex items-center gap-2">
                            <Building2 className="size-4 text-blue-600" />
                            <span>{editingItem ? "Edit Ploting Anggaran" : "Tambah Ploting Anggaran Baru"}</span>
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmitForm} className="space-y-4 py-2 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                            {/* Tahun Anggaran — Combobox */}
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Tahun Anggaran</Label>
                                <Combobox
                                    options={tahunOptions.filter(o => o.value !== "all")}
                                    value={formData.tahun_anggaran.toString()}
                                    onChange={(val) => setFormData({ ...formData, tahun_anggaran: parseInt(val) })}
                                    placeholder="Pilih Tahun"
                                    searchPlaceholder="Cari tahun..."
                                    className="w-full"
                                />
                            </div>

                            {/* Sumber Dana — Combobox */}
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Sumber Dana</Label>
                                <Combobox
                                    options={sumberDanaOptions.filter(o => o.value !== "all")}
                                    value={formData.sumber_dana}
                                    onChange={(val) => setFormData({ ...formData, sumber_dana: val })}
                                    placeholder="Pilih Sumber Dana"
                                    searchPlaceholder="Cari sumber dana..."
                                    className="w-full"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Kecamatan — Combobox */}
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Kecamatan</Label>
                                <Combobox
                                    options={formKecamatanOptions}
                                    value={formData.id_kecamatan}
                                    onChange={(val) => setFormData({ ...formData, id_kecamatan: val, id_desa: "" })}
                                    placeholder="Pilih Kecamatan"
                                    searchPlaceholder="Cari kecamatan..."
                                    className="w-full"
                                />
                            </div>

                            {/* Desa — Combobox */}
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Desa</Label>
                                <Combobox
                                    options={formDesaOptions}
                                    value={formData.id_desa}
                                    onChange={(val) => {
                                        const foundDesa = formDesaList.find(d => d.id.toString() === val);
                                        setFormData(prev => ({
                                            ...prev,
                                            id_desa: val,
                                            id_kecamatan: foundDesa?.id_kecamatan ? foundDesa.id_kecamatan.toString() : prev.id_kecamatan
                                        }));
                                    }}
                                    placeholder="Pilih Desa"
                                    searchPlaceholder="Cari desa..."
                                    className="w-full"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Jenis Bantuan</Label>
                                <Input
                                    placeholder="Contoh: BKK Desa / Hibah"
                                    value={formData.jenis_bantuan}
                                    onChange={(e) => setFormData({ ...formData, jenis_bantuan: e.target.value })}
                                    className="h-9 text-xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Target Pagu Anggaran (Rp)</Label>
                                <Input
                                    type="number"
                                    placeholder="Contoh: 500000000"
                                    value={formData.target_pagu_anggaran}
                                    onChange={(e) => setFormData({ ...formData, target_pagu_anggaran: e.target.value })}
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Nama Kegiatan</Label>
                            <Input
                                placeholder="Masukkan nama kegiatan pembangunan..."
                                value={formData.nama_kegiatan}
                                onChange={(e) => setFormData({ ...formData, nama_kegiatan: e.target.value })}
                                className="h-9 text-xs"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Target Panjang (Meter)</Label>
                                <Input
                                    type="number"
                                    placeholder="Contoh: 2000"
                                    value={formData.target_panjang_m}
                                    onChange={(e) => setFormData({ ...formData, target_panjang_m: e.target.value })}
                                    className="h-9 text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Lokasi Kegiatan</Label>
                                <Input
                                    placeholder="Detail dusun / RT / RW..."
                                    value={formData.lokasi_kegiatan}
                                    onChange={(e) => setFormData({ ...formData, lokasi_kegiatan: e.target.value })}
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-3 border-t border-border">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsDialogOpen(false)}
                                className="h-9 text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5"
                            >
                                {submitting && <RotateCw className="size-3.5 animate-spin" />}
                                <span>{editingItem ? "Simpan Perubahan" : "Tambah Ploting"}</span>
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Alert Delete Confirmation */}
            <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
                <AlertDialogContent className="bg-popover border-border rounded-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-sm font-bold text-foreground">
                            Hapus Data Ploting Anggaran?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-muted-foreground">
                            Tindakan ini akan menghapus data alokasi ploting anggaran dari sistem secara permanen.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="pt-2">
                        <AlertDialogCancel className="h-9 text-xs">Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="h-9 text-xs bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5"
                        >
                            {isDeleting && <RotateCw className="size-3.5 animate-spin" />}
                            <span>Hapus Data</span>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Import Excel Modal */}
            <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
                setIsImportDialogOpen(open);
                if (!open) {
                    setImportFile(null);
                    setImportResult(null);
                }
            }}>
                <DialogContent
                    className="max-w-xl max-h-[90vh] flex flex-col p-6 overflow-hidden"
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                            <FileSpreadsheet className="size-5 text-emerald-600 dark:text-emerald-400" />
                            <span>Import Data Plotting Anggaran dari Excel</span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2 flex-1 overflow-y-auto pr-1">
                        {/* Information / Instructions */}
                        <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 rounded-xl space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                                    <Sparkles className="size-3.5 text-emerald-600" />
                                    Format Kolom File Excel (.xlsx / .xls / .csv)
                                </span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownloadTemplate}
                                    className="h-7 text-[11px] border-emerald-600 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 font-medium gap-1 rounded-lg"
                                >
                                    <Download className="size-3" />
                                    Unduh Data & Template Excel (.xlsx)
                                </Button>
                            </div>
                            <p className="text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed text-[11px]">
                                Pastikan baris pertama Excel berisi nama kolom: <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded border text-emerald-900 font-semibold">Tahun Anggaran</code>, <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded border text-emerald-900 font-semibold">Kecamatan</code>, <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded border text-emerald-900 font-semibold">Desa</code>, <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded border text-emerald-900 font-semibold">Jenis Bantuan</code>, <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded border text-emerald-900 font-semibold">Nama Kegiatan</code>, <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded border text-emerald-900 font-semibold">Lokasi Kegiatan</code>, <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded border text-emerald-900 font-semibold">Sumber Dana</code>, <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded border text-emerald-900 font-semibold">Target Pagu Anggaran</code>, dan <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded border text-emerald-900 font-semibold">Target Panjang (m)</code>.
                            </p>
                        </div>

                        {/* Dropzone File Upload */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Pilih File Excel / CSV</Label>
                            <div className={cn(
                                "border-2 border-dashed rounded-xl p-6 text-center transition-colors flex flex-col items-center justify-center cursor-pointer",
                                importFile ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10" : "border-slate-300 dark:border-slate-700 hover:border-emerald-400"
                            )}
                            onClick={() => {
                                const input = document.getElementById("excel-file-input") as HTMLInputElement;
                                if (input) input.click();
                            }}>
                                <input
                                    id="excel-file-input"
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setImportFile(e.target.files[0]);
                                            setImportResult(null);
                                        }
                                    }}
                                />
                                {importFile ? (
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-lg">
                                            <FileSpreadsheet className="size-6" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-bold text-foreground">{importFile.name}</p>
                                            <p className="text-[10px] text-muted-foreground">{(importFile.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={(evt) => {
                                                evt.stopPropagation();
                                                setImportFile(null);
                                                setImportResult(null);
                                            }}
                                            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-500 rounded-full"
                                        >
                                            <X className="size-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <Upload className="size-8 text-slate-400 mx-auto" />
                                        <p className="text-xs font-semibold text-foreground">Klik untuk memilih file Excel atau tarik ke sini</p>
                                        <p className="text-[10px] text-muted-foreground">Format yang didukung: .xlsx, .xls, .csv (Maks. 15MB)</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Import Execution Result Breakdown */}
                        {importResult && (
                            <div className="space-y-3 pt-3 border-t">
                                {/* Summary Badges */}
                                <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-300">
                                        <span className="block text-[10px] uppercase font-bold text-emerald-600/70">Data Baru</span>
                                        <span className="text-sm font-extrabold">{importResult.created_count || 0}</span>
                                    </div>
                                    <div className="p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-300">
                                        <span className="block text-[10px] uppercase font-bold text-blue-600/70">Tersinkron (Update)</span>
                                        <span className="text-sm font-extrabold">{importResult.updated_count || 0}</span>
                                    </div>
                                    <div className="p-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300">
                                        <span className="block text-[10px] uppercase font-bold text-rose-600/70">Gagal</span>
                                        <span className="text-sm font-extrabold">{importResult.failed_count || 0}</span>
                                    </div>
                                </div>

                                {/* Detail List */}
                                {importResult.details && importResult.details.length > 0 && (
                                    <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar">
                                        <p className="font-bold text-foreground text-[11px]">Rincian Status Impor Data:</p>
                                        {importResult.details.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-[11px] py-1 border-b border-border/50 last:border-none">
                                                <div className="flex items-center gap-2 truncate max-w-[80%]">
                                                    <Badge variant="outline" className={cn(
                                                        "text-[9px] px-1.5 py-0 h-4 font-bold shrink-0",
                                                        item.status === "Updated" ? "border-blue-500 text-blue-600 bg-blue-50/50" : "border-emerald-500 text-emerald-600 bg-emerald-50/50"
                                                    )}>
                                                        {item.status === "Updated" ? "TERBARUI" : "BARU"}
                                                    </Badge>
                                                    <span className="truncate text-foreground font-medium">{item.nama_kegiatan}</span>
                                                </div>
                                                <span className="text-[10px] text-muted-foreground shrink-0">Baris {item.row}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Error List */}
                                {importResult.errors && importResult.errors.length > 0 && (
                                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg text-xs max-h-32 overflow-y-auto space-y-1">
                                        <p className="font-bold text-rose-800 dark:text-rose-300">Rincian Baris Gagal:</p>
                                        {importResult.errors.map((err, idx) => (
                                            <p key={idx} className="text-[11px] text-rose-700 dark:text-rose-400">
                                                • Baris {err.row}: {err.error}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="pt-3 border-t flex items-center justify-end gap-2 shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsImportDialogOpen(false)}
                            disabled={isImporting}
                            className="h-9 text-xs"
                        >
                            {importResult ? "Tutup" : "Batal"}
                        </Button>
                        {!importResult && (
                            <Button
                                type="button"
                                onClick={handleImportSubmit}
                                disabled={!importFile || isImporting}
                                className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
                            >
                                {isImporting ? (
                                    <>
                                        <Loader2 className="size-3.5 animate-spin" />
                                        <span>Memproses Import...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="size-3.5" />
                                        <span>Mulai Import Data</span>
                                    </>
                                )}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
