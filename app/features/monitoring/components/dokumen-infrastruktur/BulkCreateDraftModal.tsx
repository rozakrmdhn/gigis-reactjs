import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
    Sparkles,
    Layers,
    Search,
    Check,
    RotateCw,
    X,
    Filter,
    FileText,
    Building2,
    Calendar,
    Coins,
    Ruler,
    Loader2,
    CheckSquare,
    Square,
    AlertCircle,
    Info,
    ArrowRight,
    FileCheck,
    MapPin
} from "lucide-react";
import { cn } from "~/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Checkbox } from "~/components/ui/checkbox";
import { Combobox, type ComboboxOption } from "~/components/ui/combobox";
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell
} from "~/components/ui/table";
import { Skeleton } from "~/components/ui/skeleton";
import { plottingAnggaranService, type PlottingAnggaran } from "~/features/monitoring/services/plotting_anggaran.service";
import { monitoringLaporanService, type MonitoringLaporanPayload } from "~/features/monitoring/services/monitoring_laporan.service";
import { desaService } from "~/services/desa";

interface BulkCreateDraftModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    kecamatanList: Array<{ id: number | string; nama_kecamatan: string }>;
    existingLaporanList?: any[];
    defaultTahun?: string;
    defaultKecamatan?: string;
}

export function BulkCreateDraftModal({
    isOpen,
    onClose,
    onSuccess,
    kecamatanList,
    existingLaporanList = [],
    defaultTahun = "2026",
    defaultKecamatan = "all"
}: BulkCreateDraftModalProps) {
    // Mode Switch: 'plotting' (Bulk from Plotting Anggaran) | 'manual' (Single Manual Form)
    const [activeTab, setActiveTab] = useState<'plotting' | 'manual'>('plotting');

    // === TAB 1: PLOTTING ANGGARAN STATE ===
    const [selectedTahun, setSelectedTahun] = useState<string>(defaultTahun);
    const [selectedKec, setSelectedKec] = useState<string>(defaultKecamatan);
    const [selectedDesa, setSelectedDesa] = useState<string>("all");
    const [statusBaFilter, setStatusBaFilter] = useState<'all' | 'unassigned' | 'assigned'>('all');
    const [searchQuery, setSearchQuery] = useState<string>("");

    const [plottingList, setPlottingList] = useState<PlottingAnggaran[]>([]);
    const [loadingPlotting, setLoadingPlotting] = useState<boolean>(false);
    const [selectedPlottingIds, setSelectedPlottingIds] = useState<Set<string>>(new Set());
    const [desaOptions, setDesaOptions] = useState<Array<{ id: number | string; nama_desa: string }>>([]);
    const [submittingBulk, setSubmittingBulk] = useState<boolean>(false);

    // === TAB 2: MANUAL DRAFT FORM STATE ===
    const [manualKec, setManualKec] = useState<string>(defaultKecamatan !== "all" ? defaultKecamatan : "");
    const [manualDesa, setManualDesa] = useState<string>("");
    const [manualTahun, setManualTahun] = useState<string>(defaultTahun);
    const [manualSumberDana, setManualSumberDana] = useState<string>("BKK");
    const [manualRencanaPanjang, setManualRencanaPanjang] = useState<string>("0");
    const [manualNomorBa, setManualNomorBa] = useState<string>(`050/XXX/412.302/${defaultTahun}`);
    const [manualDesaOptions, setManualDesaOptions] = useState<Array<{ id: number | string; nama_desa: string }>>([]);
    const [submittingManual, setSubmittingManual] = useState<boolean>(false);

    // Reset state on modal open
    useEffect(() => {
        if (isOpen) {
            setSelectedTahun(defaultTahun);
            setSelectedKec(defaultKecamatan);
            setSelectedDesa("all");
            setStatusBaFilter("all");
            setSearchQuery("");
            setSelectedPlottingIds(new Set());
            setActiveTab('plotting');
        }
    }, [isOpen, defaultTahun, defaultKecamatan]);

    // Fetch Desa when Kecamatan changes in Tab 1
    useEffect(() => {
        if (!selectedKec || selectedKec === "all") {
            setDesaOptions([]);
            setSelectedDesa("all");
            return;
        }
        const fetchDesa = async () => {
            try {
                const res = await desaService.getDesa(selectedKec);
                const list = Array.isArray(res) ? res : ((res as any)?.data || []);
                setDesaOptions(list);
            } catch (err) {
                console.error("Error fetching desa for modal:", err);
                setDesaOptions([]);
            }
        };
        fetchDesa();
    }, [selectedKec]);

    // Fetch Desa when Kecamatan changes in Tab 2 (Manual)
    useEffect(() => {
        if (!manualKec || manualKec === "all") {
            setManualDesaOptions([]);
            setManualDesa("");
            return;
        }
        const fetchDesa = async () => {
            try {
                const res = await desaService.getDesa(manualKec);
                const list = Array.isArray(res) ? res : ((res as any)?.data || []);
                setManualDesaOptions(list);
            } catch (err) {
                console.error("Error fetching manual desa:", err);
                setManualDesaOptions([]);
            }
        };
        fetchDesa();
    }, [manualKec]);

    // Update manualNomorBa when manualTahun changes
    useEffect(() => {
        setManualNomorBa(prev => {
            if (!prev || prev.startsWith("050/")) {
                const parts = prev.split("/");
                if (parts.length === 4) {
                    return `${parts[0]}/${parts[1]}/${parts[2]}/${manualTahun}`;
                }
            }
            return `050/XXX/412.302/${manualTahun}`;
        });
    }, [manualTahun]);

    // Fetch Plotting Anggaran for Tab 1
    const fetchPlottingData = useCallback(async () => {
        if (!isOpen) return;
        setLoadingPlotting(true);
        try {
            const params: any = {};
            if (selectedTahun && selectedTahun !== "Semua" && selectedTahun !== "all") {
                params.tahun_anggaran = selectedTahun;
            }
            if (selectedKec && selectedKec !== "all") {
                params.id_kecamatan = selectedKec;
            }
            if (selectedDesa && selectedDesa !== "all") {
                params.id_desa = selectedDesa;
            }
            
            const res = await plottingAnggaranService.getPlottingList(params);
            const list = Array.isArray(res?.result) ? res.result : (Array.isArray(res?.data) ? res.data : []);
            setPlottingList(list);
        } catch (err) {
            console.error("Error fetching plotting list for bulk modal:", err);
            toast.error("Gagal memuat daftar Plotting Anggaran");
            setPlottingList([]);
        } finally {
            setLoadingPlotting(false);
        }
    }, [isOpen, selectedTahun, selectedKec, selectedDesa]);

    useEffect(() => {
        if (isOpen && activeTab === 'plotting') {
            fetchPlottingData();
        }
    }, [isOpen, activeTab, fetchPlottingData]);

    // Map existing Laporan by plotting_id for rapid O(1) status lookup
    const existingLaporanByPlottingId = useMemo(() => {
        const map = new Map<string, any>();
        existingLaporanList.forEach(lap => {
            if (lap.plotting_id) {
                map.set(lap.plotting_id.toString(), lap);
            }
            if (lap.PlottingAnggaran?.id) {
                map.set(lap.PlottingAnggaran.id.toString(), lap);
            }
        });
        return map;
    }, [existingLaporanList]);

    // Filter & Process Plotting Rows
    const processedPlottingList = useMemo(() => {
        return plottingList.map((p) => {
            const pid = p.id.toString();
            const existingLap = existingLaporanByPlottingId.get(pid);
            const isAssigned = !!existingLap;
            return {
                ...p,
                isAssigned,
                assignedLaporan: existingLap
            };
        });
    }, [plottingList, existingLaporanByPlottingId]);

    // Apply UI Search & Status Filter
    const filteredPlottingList = useMemo(() => {
        return processedPlottingList.filter((item) => {
            // Status BA filter
            if (statusBaFilter === 'unassigned' && item.isAssigned) return false;
            if (statusBaFilter === 'assigned' && !item.isAssigned) return false;

            // Search query filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const namaKegiatan = (item.nama_kegiatan || "").toLowerCase();
                const lokasi = (item.lokasi_kegiatan || "").toLowerCase();
                const jenis = (item.jenis_bantuan || "").toLowerCase();
                const namaDesa = (item.Desa?.nama_desa || "").toLowerCase();
                const namaKec = (item.Kecamatan?.nama_kecamatan || "").toLowerCase();
                const sumberDana = (item.sumber_dana || "").toLowerCase();

                const match = namaKegiatan.includes(q) ||
                    lokasi.includes(q) ||
                    jenis.includes(q) ||
                    namaDesa.includes(q) ||
                    namaKec.includes(q) ||
                    sumberDana.includes(q);

                if (!match) return false;
            }

            return true;
        });
    }, [processedPlottingList, statusBaFilter, searchQuery]);

    // Eligible Plotting items for bulk selection
    const selectablePlottingIds = useMemo(() => {
        return filteredPlottingList.map(p => p.id.toString());
    }, [filteredPlottingList]);

    const isAllSelected = useMemo(() => {
        if (selectablePlottingIds.length === 0) return false;
        return selectablePlottingIds.every(id => selectedPlottingIds.has(id));
    }, [selectablePlottingIds, selectedPlottingIds]);

    const isSomeSelected = useMemo(() => {
        if (selectablePlottingIds.length === 0) return false;
        const selectedCount = selectablePlottingIds.filter(id => selectedPlottingIds.has(id)).length;
        return selectedCount > 0 && selectedCount < selectablePlottingIds.length;
    }, [selectablePlottingIds, selectedPlottingIds]);

    // Toggle Select All
    const handleToggleSelectAll = () => {
        if (isAllSelected) {
            // Deselect all currently filtered
            setSelectedPlottingIds(prev => {
                const next = new Set(prev);
                selectablePlottingIds.forEach(id => next.delete(id));
                return next;
            });
        } else {
            // Select all currently filtered
            setSelectedPlottingIds(prev => {
                const next = new Set(prev);
                selectablePlottingIds.forEach(id => next.add(id));
                return next;
            });
        }
    };

    // Toggle Single Row Checkbox
    const handleToggleRow = (id: string) => {
        setSelectedPlottingIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Aggregate summary metrics of selected plottings
    const selectedMetrics = useMemo(() => {
        let totalPagu = 0;
        let totalPanjang = 0;
        let alreadyAssignedCount = 0;

        processedPlottingList.forEach(p => {
            if (selectedPlottingIds.has(p.id.toString())) {
                totalPagu += Number(p.target_pagu_anggaran || 0);
                totalPanjang += Number(p.target_panjang_m || 0);
                if (p.isAssigned) alreadyAssignedCount++;
            }
        });

        return {
            count: selectedPlottingIds.size,
            totalPagu,
            totalPanjang,
            alreadyAssignedCount
        };
    }, [processedPlottingList, selectedPlottingIds]);

    // Overall Metrics of available plotting list
    const listMetrics = useMemo(() => {
        let totalPanjang = 0;
        let totalPagu = 0;
        let assigned = 0;
        let unassigned = 0;

        processedPlottingList.forEach(p => {
            totalPanjang += Number(p.target_panjang_m || 0);
            totalPagu += Number(p.target_pagu_anggaran || 0);
            if (p.isAssigned) assigned++;
            else unassigned++;
        });

        return {
            totalItems: processedPlottingList.length,
            totalPanjang,
            totalPagu,
            assigned,
            unassigned
        };
    }, [processedPlottingList]);

    // 1-Click Select All Unassigned
    const handleSelectAllUnassigned = () => {
        const unassignedIds = filteredPlottingList.filter(p => !p.isAssigned).map(p => p.id.toString());
        setSelectedPlottingIds(new Set(unassignedIds));
    };

    // Clear all selections
    const handleClearSelection = () => {
        setSelectedPlottingIds(new Set());
    };

    // Combobox Options
    const kecamatanOptions: ComboboxOption[] = useMemo(() => [
        { value: "all", label: "Semua Kecamatan" },
        ...kecamatanList.map(k => ({ value: k.id.toString(), label: k.nama_kecamatan }))
    ], [kecamatanList]);

    const manualKecOptions: ComboboxOption[] = useMemo(() => [
        ...kecamatanList.map(k => ({ value: k.id.toString(), label: k.nama_kecamatan }))
    ], [kecamatanList]);

    const desaFilterOptions: ComboboxOption[] = useMemo(() => [
        { value: "all", label: "Semua Desa" },
        ...desaOptions.map(d => ({ value: d.id.toString(), label: d.nama_desa }))
    ], [desaOptions]);

    const manualDesaOptionsList: ComboboxOption[] = useMemo(() => [
        ...manualDesaOptions.map(d => ({ value: d.id.toString(), label: d.nama_desa }))
    ], [manualDesaOptions]);

    const tahunOptions: ComboboxOption[] = useMemo(() => [
        { value: "2026", label: "TA 2026" },
        { value: "2025", label: "TA 2025" },
        { value: "2024", label: "TA 2024" },
        { value: "2023", label: "TA 2023" },
        { value: "Semua", label: "Semua Tahun" }
    ], []);

    // Handle Bulk Insert Submit
    const handleBulkSubmit = async () => {
        if (selectedPlottingIds.size === 0) {
            toast.error("Pilih setidaknya satu kegiatan Plotting Anggaran");
            return;
        }

        const selectedItems = processedPlottingList.filter(p => selectedPlottingIds.has(p.id.toString()));
        if (selectedItems.length === 0) return;

        setSubmittingBulk(true);
        const toastId = toast.loading(`Menerbitkan ${selectedItems.length} Draft Dokumen Monitoring...`);

        try {
            // Build Payload Array
            const payloads: MonitoringLaporanPayload[] = selectedItems.map((p) => {
                const targetDesaId = p.id_desa || p.Desa?.id || "";
                const targetKecId = p.id_kecamatan || p.Kecamatan?.id || p.Desa?.id_kecamatan;
                const tahun = p.tahun_anggaran || Number(selectedTahun !== "Semua" ? selectedTahun : 2026);
                
                return {
                    id_desa: targetDesaId,
                    id_kecamatan: targetKecId,
                    tahun_anggaran: tahun,
                    sumber_dana: p.sumber_dana || "BKK",
                    rencana_panjang: p.target_panjang_m || 0,
                    nomor_ba: null, // Tanpa auto-penomoran saat draft, diisi manual saat verifikasi/finalisasi
                    plotting_id: p.id.toString(),
                    status: "Draft",
                    keterangan: `Draft Monitoring via Plotting: ${p.nama_kegiatan}`
                };
            });

            const res = await monitoringLaporanService.createLaporanBulk(payloads);
            if (res.status === "success" || res.data || res.result) {
                const count = res.summary?.success || payloads.length;
                toast.success(`Berhasil menerbitkan ${count} Draft Dokumen Monitoring!`, { id: toastId });
                onSuccess();
                onClose();
            } else {
                toast.error("Gagal membuat Draft Dokumen Monitoring secara massal", { id: toastId });
            }
        } catch (err: any) {
            console.error("Bulk create error:", err);
            toast.error(err?.message || "Terjadi kesalahan saat memproses bulk insert", { id: toastId });
        } finally {
            setSubmittingBulk(false);
        }
    };

    // Handle Manual Submit (Single Item Fallback)
    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualDesa) {
            toast.error("Silakan pilih Desa Target terlebih dahulu");
            return;
        }

        setSubmittingManual(true);
        const toastId = toast.loading("Menerbitkan Draft Dokumen Monitoring...");

        try {
            const res = await monitoringLaporanService.createLaporan({
                id_desa: manualDesa,
                id_kecamatan: manualKec && manualKec !== "all" ? manualKec : undefined,
                tahun_anggaran: manualTahun,
                sumber_dana: manualSumberDana,
                rencana_panjang: manualRencanaPanjang,
                nomor_ba: manualNomorBa.trim() || null,
                plotting_id: null,
                status: "Draft"
            });

            if (res.status === "success" || res.data || res.result) {
                const docNo = res.result?.nomor_ba || res.data?.nomor_ba || manualNomorBa;
                toast.success(`Draft Dokumen Monitoring (${docNo}) berhasil diterbitkan!`, { id: toastId });
                onSuccess();
                onClose();
            } else {
                toast.error("Gagal membuat Draft Dokumen Monitoring", { id: toastId });
            }
        } catch (err: any) {
            console.error("Manual create error:", err);
            toast.error(err?.message || "Terjadi kesalahan saat membuat Draft Dokumen Monitoring", { id: toastId });
        } finally {
            setSubmittingManual(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[100vw] w-full h-[100dvh] sm:h-[92vh] sm:max-h-[94vh] sm:max-w-[96vw] xl:max-w-[1440px] 2xl:max-w-[1600px] flex flex-col p-0 overflow-hidden bg-background border-0 sm:border sm:border-border rounded-none sm:rounded-2xl shadow-2xl">
                {/* Header Dialog */}
                <DialogHeader className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-border bg-muted/20 shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-600/20 shadow-xs">
                                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <DialogTitle className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                                        Penerbitan Draft Dokumen Monitoring
                                    </DialogTitle>
                                    <Badge variant="outline" className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30">
                                        Plotting Anggaran
                                    </Badge>
                                </div>
                                <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1 sm:line-clamp-none">
                                    Pilih kegiatan plotting untuk menerbitkan Berita Acara penugasan digitasi bagi Operator Kecamatan.
                                </DialogDescription>
                            </div>
                        </div>

                        {/* Mode Switcher Tabs */}
                        <div className="grid grid-cols-2 sm:flex items-center gap-1 p-1 bg-muted/60 border border-border rounded-xl shrink-0 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={() => setActiveTab('plotting')}
                                className={cn(
                                    "px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[36px] sm:min-h-0",
                                    activeTab === 'plotting'
                                        ? "bg-indigo-600 text-white shadow-xs"
                                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                )}
                            >
                                <Layers className="w-3.5 h-3.5" />
                                <span>Dari Plotting</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('manual')}
                                className={cn(
                                    "px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[36px] sm:min-h-0",
                                    activeTab === 'manual'
                                        ? "bg-indigo-600 text-white shadow-xs"
                                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                )}
                            >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Input Manual</span>
                            </button>
                        </div>
                    </div>
                </DialogHeader>

                {/* Tab 1: Dari Plotting Anggaran */}
                {activeTab === 'plotting' && (
                    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                        {/* Summary Metrics & Filter Toolbar */}
                        <div className="p-2.5 sm:p-4 border-b border-border bg-muted/10 shrink-0 space-y-2 sm:space-y-3">
                            {/* KPI Metrics: Mobile single-row scrollable pills strip | Desktop 4-column cards */}
                            {/* Desktop/Tablet (sm and up) */}
                            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
                                <div className="p-2 sm:p-2.5 rounded-xl bg-background border border-border/80 flex items-center gap-2 sm:gap-3">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                        <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">Total Plotting</p>
                                        <p className="text-[11px] sm:text-xs font-bold text-foreground truncate">{listMetrics.totalItems} Kegiatan</p>
                                    </div>
                                </div>

                                <div className="p-2 sm:p-2.5 rounded-xl bg-background border border-border/80 flex items-center gap-2 sm:gap-3">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                        <Ruler className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">Rencana Fisik</p>
                                        <p className="text-[11px] sm:text-xs font-bold font-mono text-foreground truncate">
                                            {(listMetrics.totalPanjang / 1000).toFixed(1)} km <span className="text-[9.5px] font-normal text-muted-foreground">({listMetrics.totalPanjang.toLocaleString('id-ID')}m)</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="p-2 sm:p-2.5 rounded-xl bg-background border border-border/80 flex items-center gap-2 sm:gap-3">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                        <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">Total Pagu</p>
                                        <p className="text-[11px] sm:text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate">
                                            Rp {listMetrics.totalPagu.toLocaleString('id-ID')}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-2 sm:p-2.5 rounded-xl bg-background border border-border/80 flex items-center gap-2 sm:gap-3">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                        <FileCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">Status BA</p>
                                        <p className="text-[11px] sm:text-xs font-bold text-foreground truncate">
                                            <span className="text-emerald-600 dark:text-emerald-400">{listMetrics.unassigned} Belum</span> / <span className="text-amber-600 dark:text-amber-400">{listMetrics.assigned} Sudah</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Mobile (under sm): Ultra-compact horizontal swipeable pills strip */}
                            <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background border border-border shrink-0 text-[10px] font-bold">
                                    <Layers className="size-3 text-indigo-500 shrink-0" />
                                    <span className="text-foreground">{listMetrics.totalItems} Kegiatan</span>
                                </div>
                                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background border border-border shrink-0 text-[10px] font-bold">
                                    <Ruler className="size-3 text-blue-500 shrink-0" />
                                    <span className="text-foreground font-mono">{(listMetrics.totalPanjang / 1000).toFixed(1)} km</span>
                                </div>
                                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background border border-border shrink-0 text-[10px] font-bold">
                                    <Coins className="size-3 text-emerald-500 shrink-0" />
                                    <span className="text-emerald-600 dark:text-emerald-400 font-mono">Rp {(listMetrics.totalPagu / 1000000000).toFixed(1)} M</span>
                                </div>
                                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background border border-border shrink-0 text-[10px] font-bold">
                                    <FileCheck className="size-3 text-amber-500 shrink-0" />
                                    <span className="text-emerald-600">{listMetrics.unassigned} Belum</span>
                                    <span className="text-muted-foreground">/</span>
                                    <span className="text-amber-600">{listMetrics.assigned} Sudah</span>
                                </div>
                            </div>

                            {/* Filter Bar Controls: 2 cols on mobile, 4 cols on tablet/desktop */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2.5 pt-0.5">
                                {/* Filter Tahun */}
                                <div className="space-y-0.5 sm:space-y-1">
                                    <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Tahun
                                    </Label>
                                    <Combobox
                                        options={tahunOptions}
                                        value={selectedTahun}
                                        onChange={setSelectedTahun}
                                        placeholder="Tahun"
                                        searchPlaceholder="Cari tahun..."
                                        className="w-full h-7.5 sm:h-8 text-xs bg-background"
                                    />
                                </div>

                                {/* Filter Kecamatan */}
                                <div className="space-y-0.5 sm:space-y-1">
                                    <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Kecamatan
                                    </Label>
                                    <Combobox
                                        options={kecamatanOptions}
                                        value={selectedKec}
                                        onChange={(val) => {
                                            setSelectedKec(val);
                                            setSelectedDesa("all");
                                        }}
                                        placeholder="Semua Kecamatan"
                                        searchPlaceholder="Cari kecamatan..."
                                        className="w-full h-7.5 sm:h-8 text-xs bg-background"
                                    />
                                </div>

                                {/* Filter Desa */}
                                <div className="space-y-0.5 sm:space-y-1">
                                    <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Desa
                                    </Label>
                                    <Combobox
                                        options={desaFilterOptions}
                                        value={selectedDesa}
                                        onChange={setSelectedDesa}
                                        placeholder="Semua Desa"
                                        searchPlaceholder="Cari desa..."
                                        disabled={!selectedKec || selectedKec === "all"}
                                        className="w-full h-7.5 sm:h-8 text-xs bg-background"
                                    />
                                </div>

                                {/* Quick Search */}
                                <div className="space-y-0.5 sm:space-y-1">
                                    <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Cari Lokasi
                                    </Label>
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
                                        <Input
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Nama / lokasi..."
                                            className="pl-7 sm:pl-8 h-7.5 sm:h-8 text-xs bg-background"
                                        />
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setSearchQuery("")}
                                                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Status Filter Chips & Quick Select Helpers (Single unified horizontal bar on all screen sizes) */}
                            <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-border/50 overflow-x-auto no-scrollbar">
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setStatusBaFilter('all')}
                                        className={cn(
                                            "px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all border cursor-pointer shrink-0",
                                            statusBaFilter === 'all'
                                                ? "bg-foreground text-background border-foreground shadow-2xs"
                                                : "bg-background text-muted-foreground border-border hover:bg-muted"
                                        )}
                                    >
                                        Semua ({listMetrics.totalItems})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStatusBaFilter('unassigned')}
                                        className={cn(
                                            "px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all border cursor-pointer shrink-0",
                                            statusBaFilter === 'unassigned'
                                                ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                                                : "bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/10"
                                        )}
                                    >
                                        Belum ({listMetrics.unassigned})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStatusBaFilter('assigned')}
                                        className={cn(
                                            "px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all border cursor-pointer shrink-0",
                                            statusBaFilter === 'assigned'
                                                ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                                                : "bg-amber-500/5 text-amber-700 dark:text-amber-300 border-amber-500/20 hover:bg-amber-500/10"
                                        )}
                                    >
                                        Sudah ({listMetrics.assigned})
                                    </button>
                                </div>

                                <div className="flex items-center gap-1 shrink-0 ml-auto">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleSelectAllUnassigned}
                                        disabled={loadingPlotting || listMetrics.unassigned === 0}
                                        className="h-6.5 sm:h-7 px-2 text-[10px] sm:text-[11px] font-bold gap-1 rounded-lg border-indigo-500/30 text-indigo-700 dark:text-indigo-300 bg-indigo-500/5 hover:bg-indigo-500/10 cursor-pointer shrink-0"
                                    >
                                        <CheckSquare className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-indigo-600 dark:text-indigo-400" />
                                        <span>Pilih Belum Terbit</span>
                                    </Button>

                                    {selectedPlottingIds.size > 0 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleClearSelection}
                                            className="h-6.5 sm:h-7 px-1.5 text-[10px] sm:text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                                        >
                                            Reset
                                        </Button>
                                    )}

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={fetchPlottingData}
                                        disabled={loadingPlotting}
                                        className="h-6.5 sm:h-7 px-2 text-[10px] sm:text-[11px] font-semibold gap-1 rounded-lg border-border cursor-pointer shrink-0"
                                    >
                                        <RotateCw className={cn("w-2.5 h-2.5 sm:w-3 sm:h-3", loadingPlotting && "animate-spin")} />
                                        <span className="hidden sm:inline">Segarkan</span>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Content Area: Mobile Card Grid (block md:hidden) + Desktop Table (hidden md:block) */}
                        <div className="flex-1 overflow-auto custom-scrollbar p-0 bg-background">
                            {/* MOBILE CARD VIEW (< md) */}
                            <div className="block md:hidden p-3 space-y-2.5">
                                {loadingPlotting ? (
                                    <div className="space-y-2.5">
                                        <Skeleton className="h-28 w-full rounded-xl" />
                                        <Skeleton className="h-28 w-full rounded-xl" />
                                        <Skeleton className="h-28 w-full rounded-xl" />
                                    </div>
                                ) : filteredPlottingList.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
                                        <Layers className="w-8 h-8 opacity-30" />
                                        <p className="font-bold text-xs text-foreground">Tidak ada plotting anggaran yang cocok.</p>
                                        <p className="text-[11px]">Silakan sesuaikan filter pencarian.</p>
                                    </div>
                                ) : (
                                    filteredPlottingList.map((item, idx) => {
                                        const itemId = item.id.toString();
                                        const isSelected = selectedPlottingIds.has(itemId);
                                        const targetPanjang = Number(item.target_panjang_m || 0);
                                        const targetPagu = Number(item.target_pagu_anggaran || 0);

                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => handleToggleRow(itemId)}
                                                className={cn(
                                                    "p-3 rounded-xl border transition-all cursor-pointer space-y-2",
                                                    isSelected
                                                        ? "bg-indigo-500/10 dark:bg-indigo-950/40 border-indigo-500/60 shadow-xs"
                                                        : "bg-card border-border hover:border-border/80"
                                                )}
                                            >
                                                <div className="flex items-start gap-2.5">
                                                    <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={() => handleToggleRow(itemId)}
                                                            aria-label={`Pilih ${item.nama_kegiatan}`}
                                                            className="cursor-pointer h-5 w-5"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="font-mono text-[10px] text-muted-foreground font-bold">#{idx + 1}</span>
                                                                {item.jenis_bantuan && (
                                                                    <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
                                                                        {item.jenis_bantuan}
                                                                    </span>
                                                                )}
                                                                <Badge variant="outline" className="text-[9px] font-bold font-mono px-1.5 py-0.2">
                                                                    TA {item.tahun_anggaran || selectedTahun}
                                                                </Badge>
                                                            </div>
                                                            <div>
                                                                {item.isAssigned ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                                                        <Check className="w-2.5 h-2.5" />
                                                                        <span>Sudah BA</span>
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                                                        <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                                                        <span>Belum Terbit</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <p className="font-bold text-xs text-foreground mt-1 leading-snug">
                                                            {item.nama_kegiatan}
                                                        </p>

                                                        {item.lokasi_kegiatan && (
                                                            <div className="flex items-center gap-1 text-[10.5px] text-muted-foreground mt-0.5">
                                                                <MapPin className="w-3 h-3 shrink-0 text-muted-foreground/70" />
                                                                <span className="truncate">{item.lokasi_kegiatan}</span>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center justify-between text-[11px] pt-2 border-t border-border/50 mt-2">
                                                            <span className="text-muted-foreground font-medium">
                                                                Desa {item.Desa?.nama_desa || '-'}, Kec. {item.Kecamatan?.nama_kecamatan || item.Desa?.nama_kecamatan || '-'}
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                                                            <div className="flex items-center gap-1 font-bold text-foreground">
                                                                <Ruler className="w-3 h-3 text-indigo-600 shrink-0" />
                                                                <span>{targetPanjang.toLocaleString('id-ID')} m</span>
                                                            </div>
                                                            <div className="flex items-center justify-end gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                                                                <span>Rp {targetPagu.toLocaleString('id-ID')}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* DESKTOP TABULAR VIEW (>= md) */}
                            <div className="hidden md:block">
                                <Table className="w-full">
                                    <TableHeader className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-20 border-b border-border shadow-2xs">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-12 text-center sticky left-0 z-30 bg-slate-100 dark:bg-slate-900 border-r border-border">
                                                <div className="flex items-center justify-center">
                                                    <Checkbox
                                                        checked={isAllSelected ? true : isSomeSelected ? "indeterminate" : false}
                                                        onCheckedChange={handleToggleSelectAll}
                                                        aria-label="Pilih semua baris plotting"
                                                        className="cursor-pointer"
                                                    />
                                                </div>
                                            </TableHead>
                                            <TableHead className="w-12 text-center font-bold text-[11px] bg-slate-100 dark:bg-slate-900">No</TableHead>
                                            <TableHead className="font-bold text-[11px] min-w-[280px] bg-slate-100 dark:bg-slate-900">Nama Kegiatan & Rincian Lokasi</TableHead>
                                            <TableHead className="font-bold text-[11px] min-w-[180px] bg-slate-100 dark:bg-slate-900">Wilayah Administrasi</TableHead>
                                            <TableHead className="font-bold text-[11px] text-center w-28 bg-slate-100 dark:bg-slate-900">Tahun / Sumber</TableHead>
                                            <TableHead className="font-bold text-[11px] text-right w-36 bg-slate-100 dark:bg-slate-900">Target Rencana Fisik</TableHead>
                                            <TableHead className="font-bold text-[11px] text-right w-44 bg-slate-100 dark:bg-slate-900">Pagu Anggaran</TableHead>
                                            <TableHead className="font-bold text-[11px] text-center w-40 bg-slate-100 dark:bg-slate-900">Status Dokumen BA</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loadingPlotting ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-60">
                                                    <div className="p-6 space-y-3">
                                                        <Skeleton className="h-9 w-full rounded-lg" />
                                                        <Skeleton className="h-9 w-full rounded-lg" />
                                                        <Skeleton className="h-9 w-full rounded-lg" />
                                                        <Skeleton className="h-9 w-full rounded-lg" />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredPlottingList.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-60 text-center text-muted-foreground text-xs">
                                                    <div className="flex flex-col items-center justify-center gap-2.5 py-10">
                                                        <Layers className="w-10 h-10 opacity-30 text-muted-foreground" />
                                                        <p className="font-bold text-sm text-foreground">Tidak ada kegiatan Plotting Anggaran yang sesuai kriteria.</p>
                                                        <p className="text-xs text-muted-foreground max-w-md">Silakan sesuaikan filter Tahun Anggaran, Kecamatan, Desa, atau kata kunci pencarian Anda.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredPlottingList.map((item, idx) => {
                                                const itemId = item.id.toString();
                                                const isSelected = selectedPlottingIds.has(itemId);
                                                const targetPanjang = Number(item.target_panjang_m || 0);
                                                const targetPagu = Number(item.target_pagu_anggaran || 0);

                                                return (
                                                    <TableRow
                                                        key={item.id}
                                                        onClick={() => handleToggleRow(itemId)}
                                                        className={cn(
                                                            "group transition-colors cursor-pointer text-xs border-b border-border/50",
                                                            isSelected
                                                                ? "bg-indigo-500/10 dark:bg-indigo-950/40 hover:bg-indigo-500/15"
                                                                : "hover:bg-muted/40"
                                                        )}
                                                    >
                                                        {/* Checkbox Column */}
                                                        <TableCell className="text-center p-2.5 sticky left-0 z-10 bg-inherit" onClick={(e) => e.stopPropagation()}>
                                                            <div className="flex items-center justify-center">
                                                                <Checkbox
                                                                    checked={isSelected}
                                                                    onCheckedChange={() => handleToggleRow(itemId)}
                                                                    aria-label={`Pilih kegiatan ${item.nama_kegiatan}`}
                                                                    className="cursor-pointer"
                                                                />
                                                            </div>
                                                        </TableCell>

                                                        {/* No */}
                                                        <TableCell className="text-center font-mono text-[11px] text-muted-foreground p-2.5">
                                                            {idx + 1}
                                                        </TableCell>

                                                        {/* Nama Kegiatan & Uraian */}
                                                        <TableCell className="p-3">
                                                            <div className="space-y-1">
                                                                <div className="flex items-start gap-2">
                                                                    {item.jenis_bantuan && (
                                                                        <span className="inline-block text-[9.5px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 shrink-0">
                                                                            {item.jenis_bantuan}
                                                                        </span>
                                                                    )}
                                                                    <span className="font-bold text-foreground leading-snug">
                                                                        {item.nama_kegiatan}
                                                                    </span>
                                                                </div>
                                                                {item.lokasi_kegiatan && (
                                                                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                                        <MapPin className="w-3 h-3 shrink-0 text-muted-foreground/70" />
                                                                        <span className="truncate max-w-[420px]">{item.lokasi_kegiatan}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>

                                                        {/* Wilayah Administrasi */}
                                                        <TableCell className="p-3">
                                                            <div className="space-y-0.5">
                                                                <span className="font-bold text-foreground block">
                                                                    Desa {item.Desa?.nama_desa || '-'}
                                                                </span>
                                                                <span className="text-[11px] text-muted-foreground block">
                                                                    Kec. {item.Kecamatan?.nama_kecamatan || item.Desa?.nama_kecamatan || '-'}
                                                                </span>
                                                            </div>
                                                        </TableCell>

                                                        {/* Tahun & Sumber Dana */}
                                                        <TableCell className="text-center p-3">
                                                            <div className="space-y-1 flex flex-col items-center">
                                                                <Badge variant="outline" className="text-[10px] font-bold font-mono px-2 py-0.5 bg-muted/60">
                                                                    TA {item.tahun_anggaran || selectedTahun}
                                                                </Badge>
                                                                <span className="text-[10px] font-semibold text-muted-foreground">
                                                                    {item.sumber_dana || 'BKK'}
                                                                </span>
                                                            </div>
                                                        </TableCell>

                                                        {/* Target Fisik (Meter) */}
                                                        <TableCell className="p-3 text-right">
                                                            <div className="space-y-0.5 font-mono">
                                                                <span className="font-bold text-foreground text-xs block">
                                                                    {targetPanjang.toLocaleString('id-ID')} m
                                                                </span>
                                                                <span className="text-[10px] text-muted-foreground block">
                                                                    {(targetPanjang / 1000).toFixed(2)} km
                                                                </span>
                                                            </div>
                                                        </TableCell>

                                                        {/* Pagu Anggaran */}
                                                        <TableCell className="p-3 text-right">
                                                            <div className="font-mono">
                                                                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs block">
                                                                    Rp {targetPagu.toLocaleString('id-ID')}
                                                                </span>
                                                            </div>
                                                        </TableCell>

                                                        {/* Status Dokumen BA */}
                                                        <TableCell className="text-center p-3">
                                                            {item.isAssigned ? (
                                                                <div className="space-y-0.5 flex flex-col items-center">
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                                                        <Check className="w-2.5 h-2.5" />
                                                                        <span>Sudah Terbit BA</span>
                                                                    </span>
                                                                    <span className="font-mono text-[9.5px] text-muted-foreground truncate max-w-[140px]" title={item.assignedLaporan?.nomor_ba}>
                                                                        {item.assignedLaporan?.nomor_ba || `Status: ${item.assignedLaporan?.status || 'Draft'}`}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                                                    <Sparkles className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                                                    <span>Belum Terbit</span>
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Sticky Wide Selection & Action Bar */}
                        <div className="p-3 sm:px-6 sm:py-3.5 border-t border-border bg-muted/40 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shadow-md">
                            <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs">
                                <div className="flex items-center gap-2 font-bold text-foreground bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-2.5 sm:px-3 py-1.5 rounded-xl border border-indigo-500/20">
                                    <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    <span>{selectedMetrics.count} Terpilih</span>
                                </div>

                                {selectedMetrics.count > 0 && (
                                    <>
                                        <div className="h-4 w-px bg-border hidden sm:block" />
                                        <div className="flex items-center gap-1 text-muted-foreground text-[11px] sm:text-xs">
                                            <span className="hidden sm:inline">Target:</span>
                                            <strong className="font-mono text-foreground font-bold">{selectedMetrics.totalPanjang.toLocaleString('id-ID')} m</strong>
                                        </div>
                                        <div className="flex items-center gap-1 text-muted-foreground text-[11px] sm:text-xs">
                                            <span className="hidden sm:inline">Pagu:</span>
                                            <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">Rp {selectedMetrics.totalPagu.toLocaleString('id-ID')}</strong>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-2.5 justify-end shrink-0 w-full sm:w-auto">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onClose}
                                    disabled={submittingBulk}
                                    className="h-10 sm:h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer w-full sm:w-auto"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleBulkSubmit}
                                    disabled={selectedPlottingIds.size === 0 || submittingBulk}
                                    className="h-10 sm:h-9 px-5 sm:px-6 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md gap-2 cursor-pointer disabled:opacity-50 w-full sm:w-auto"
                                >
                                    {submittingBulk ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Menerbitkan...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            <span>Terbitkan {selectedPlottingIds.size > 0 ? `(${selectedPlottingIds.size})` : ''}</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab 2: Single Manual Form (Ad-hoc Draft Creation) */}
                {activeTab === 'manual' && (
                    <form onSubmit={handleManualSubmit} className="flex-1 min-h-0 flex flex-col justify-between overflow-y-auto custom-scrollbar">
                        <div className="p-4 sm:p-6 space-y-4 max-w-2xl mx-auto w-full">
                            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-xs text-muted-foreground flex items-start gap-2.5">
                                <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                                <p className="leading-relaxed">
                                    Gunakan mode manual jika desa belum memiliki data Plotting Anggaran pada sistem. Draft yang diterbitkan akan membuka hak akses digitasi bagi Operator Kecamatan.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Kecamatan Target</Label>
                                    <Combobox
                                        options={manualKecOptions}
                                        value={manualKec}
                                        onChange={(val) => {
                                            setManualKec(val);
                                            setManualDesa("");
                                        }}
                                        placeholder="Pilih Kecamatan"
                                        searchPlaceholder="Cari kecamatan..."
                                        className="w-full h-9 text-xs bg-background"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Desa Target</Label>
                                    <Combobox
                                        options={manualDesaOptionsList}
                                        value={manualDesa}
                                        onChange={setManualDesa}
                                        placeholder="Pilih Desa"
                                        searchPlaceholder="Cari desa..."
                                        disabled={!manualKec || manualKec === "all"}
                                        className="w-full h-9 text-xs bg-background"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nomor Dokumen Penugasan / BA (Opsional)</Label>
                                <Input
                                    value={manualNomorBa}
                                    onChange={(e) => setManualNomorBa(e.target.value)}
                                    placeholder="Kosongkan jika nomor BA diisi manual saat finalisasi"
                                    className="h-9 text-xs font-mono bg-background"
                                />
                                <p className="text-[9.5px] text-muted-foreground">Boleh dikosongkan. Nomor BA resmi dapat diinput saat verifikasi/finalisasi dokumen.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tahun Anggaran</Label>
                                    <Combobox
                                        options={tahunOptions.filter(o => o.value !== "Semua")}
                                        value={manualTahun}
                                        onChange={setManualTahun}
                                        placeholder="Pilih Tahun"
                                        searchPlaceholder="Cari tahun..."
                                        className="w-full h-9 text-xs bg-background"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sumber Dana</Label>
                                    <Combobox
                                        options={[
                                            { value: "BKK", label: "BKK" },
                                            { value: "Sektoral", label: "Sektoral" },
                                            { value: "Lainnya", label: "Lainnya" }
                                        ]}
                                        value={manualSumberDana}
                                        onChange={setManualSumberDana}
                                        placeholder="Pilih Sumber Dana"
                                        searchPlaceholder="Cari..."
                                        className="w-full h-9 text-xs bg-background"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Target Rencana Panjang (Meter)</Label>
                                <Input
                                    type="number"
                                    placeholder="Contoh: 1500"
                                    value={manualRencanaPanjang}
                                    onChange={e => setManualRencanaPanjang(e.target.value)}
                                    className="h-9 text-xs rounded-xl font-mono font-bold bg-background"
                                />
                            </div>
                        </div>

                        <DialogFooter className="px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-muted/20 shrink-0 grid grid-cols-2 sm:flex sm:flex-row gap-2 justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={submittingManual}
                                className="h-10 sm:h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer w-full sm:w-auto"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={submittingManual || !manualDesa}
                                className="h-10 sm:h-9 px-5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs gap-1.5 cursor-pointer disabled:opacity-50 w-full sm:w-auto"
                            >
                                {submittingManual ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Sparkles className="w-3.5 h-3.5" />
                                )}
                                <span>Terbitkan Draft</span>
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
