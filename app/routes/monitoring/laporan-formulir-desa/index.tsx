import React, { useEffect, useState } from "react";
import type { MetaFunction } from "react-router";
import { toast } from "sonner";
import {
    Building,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Clock,
    Search,
    List,
    Coins,
    Eye,
    RotateCw,
    HelpCircle,
    FileSpreadsheet,
    Building2,
    FileText,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { realisasiService, type FormRealisasi, type RealisasiEntry } from "~/features/monitoring/services/realisasi.service";
import { kecamatanService, type Kecamatan } from "~/services/kecamatan";
import { Combobox } from "~/components/ui/combobox";

export const meta: MetaFunction = () => {
    return [
        { title: "Laporan Perekaman Desa - MELAROSA" },
        { name: "description", content: "Laporan agregasi perekaman koordinat realisasi pembangunan per desa." },
    ];
};

interface AggregationSummary {
    total_desa: number;
    sudah_mengisi: number;
    belum_mengisi: number;
    persentase_pengisian: number;
    total_anggaran: number;
}

interface VillageReportItem {
    id_desa: number;
    nama_desa: string;
    id_kecamatan: number;
    nama_kecamatan: string;
    total_entries: number;
    draft_count: number;
    submitted_count: number;
    verified_count: number;
    rejected_count: number;
    total_anggaran: number;
    status_pengisian: 'belum_mengisi' | 'draft' | 'submitted' | 'verified' | 'rejected';
    last_submitted_at: string | null;
}

export default function LaporanFormulirDesaPage() {
    const [allForms, setAllForms] = useState<FormRealisasi[]>([]);
    const [kecamatanList, setKecamatanList] = useState<Kecamatan[]>([]);
    const [selectedFormId, setSelectedFormId] = useState<string>("");
    const [selectedKecId, setSelectedKecId] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");

    const [isLoadingForms, setIsLoadingForms] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [reportSummary, setReportSummary] = useState<AggregationSummary>({
        total_desa: 0,
        sudah_mengisi: 0,
        belum_mengisi: 0,
        persentase_pengisian: 0,
        total_anggaran: 0
    });
    const [reportData, setReportData] = useState<VillageReportItem[]>([]);

    // Detail modal state
    const [selectedVillage, setSelectedVillage] = useState<VillageReportItem | null>(null);
    const [villageEntries, setVillageEntries] = useState<RealisasiEntry[]>([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const kecamatanOptions = React.useMemo(() => {
        return [
            { value: "all", label: "Semua Kecamatan" },
            ...kecamatanList.map(kec => ({
                value: String(kec.id),
                label: kec.nama_kecamatan
            }))
        ];
    }, [kecamatanList]);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedFormId) {
            fetchReport();
        }
    }, [selectedFormId, selectedKecId]);

    const loadInitialData = async () => {
        setIsLoadingForms(true);
        try {
            const [formsRes, kecList] = await Promise.all([
                realisasiService.getAllForms(),
                kecamatanService.getKecamatan()
            ]);

            setKecamatanList(kecList);

            if (formsRes.status === "success" && formsRes.result && formsRes.result.length > 0) {
                setAllForms(formsRes.result);
                // Set default to first active or first form available
                const openForm = formsRes.result.find(f => f.is_open);
                setSelectedFormId(openForm ? openForm.id : formsRes.result[0].id);
            } else {
                toast.error("Belum ada formulir realisasi pembangunan yang dibuat.");
            }
        } catch (err) {
            console.error("Gagal memuat data awal:", err);
            toast.error("Gagal memuat daftar formulir atau kecamatan.");
        } finally {
            setIsLoadingForms(false);
        }
    };

    const fetchReport = async () => {
        if (!selectedFormId) return;
        setIsLoadingData(true);
        try {
            const params: any = {};
            if (selectedKecId && selectedKecId !== "all") {
                params.id_kecamatan = selectedKecId;
            }

            const res = await realisasiService.getLaporanFormulirDesa(selectedFormId, params);
            if (res.status === "success" && res.result) {
                setReportSummary(res.result.summary);
                setReportData(res.result.data);
            }
        } catch (err) {
            console.error("Gagal mengambil laporan:", err);
            toast.error("Gagal mengambil data laporan agregasi desa.");
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleRefresh = () => {
        fetchReport();
        toast.success("Data laporan diperbarui.");
    };

    const handleOpenDetail = async (item: VillageReportItem) => {
        setSelectedVillage(item);
        setIsLoadingDetails(true);
        setIsDetailOpen(true);
        try {
            const res = await realisasiService.getAllEntries({
                id_form: selectedFormId,
                id_desa: item.id_desa,
                limit: 100 // Load all for this village
            });
            if (res.status === "success" && res.result) {
                setVillageEntries(res.result);
            }
        } catch (err) {
            console.error("Gagal memuat detail usulan desa:", err);
            toast.error("Gagal memuat detail laporan desa.");
        } finally {
            setIsLoadingDetails(false);
        }
    };

    // Filtered data based on search bar
    const filteredReportData = reportData.filter(item => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        return item.nama_desa.toLowerCase().includes(query) || 
               item.nama_kecamatan.toLowerCase().includes(query);
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'verified':
                return (
                    <Badge className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 gap-1 font-semibold">
                        <CheckCircle2 className="w-3 h-3 shrink-0" /> Disetujui
                    </Badge>
                );
            case 'submitted':
                return (
                    <Badge className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 gap-1 font-semibold">
                        <CheckCircle2 className="w-3 h-3 shrink-0 text-blue-500" /> Dikirim
                    </Badge>
                );
            case 'rejected':
                return (
                    <Badge className="bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 gap-1 font-semibold">
                        <XCircle className="w-3 h-3 shrink-0" /> Ditolak
                    </Badge>
                );
            case 'draft':
                return (
                    <Badge className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 gap-1 font-semibold">
                        <Clock className="w-3 h-3 shrink-0 text-amber-500" /> Draft
                    </Badge>
                );
            case 'belum_mengisi':
            default:
                return (
                    <Badge variant="outline" className="text-slate-400 border-slate-200 dark:border-slate-800 gap-1 font-normal">
                        <AlertCircle className="w-3 h-3 shrink-0" /> Belum Mengisi
                    </Badge>
                );
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "-";
        try {
            return new Date(dateStr).toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
        } catch {
            return dateStr;
        }
    };

    const handleExportExcel = () => {
        // Implement simple client-side HTML Table export to CSV or trigger printing
        toast.info("Mengekspor data laporan...");
        const headers = ["No", "Nama Desa", "Kecamatan", "Status", "Draft", "Dikirim", "Disetujui", "Ditolak", "Total Anggaran", "Tanggal Terakhir"];
        const csvRows = [headers.join(",")];

        filteredReportData.forEach((item, index) => {
            const row = [
                index + 1,
                `"${item.nama_desa}"`,
                `"${item.nama_kecamatan}"`,
                item.status_pengisian.toUpperCase(),
                item.draft_count,
                item.submitted_count,
                item.verified_count,
                item.rejected_count,
                item.total_anggaran,
                item.last_submitted_at ? `"${new Date(item.last_submitted_at).toISOString()}"` : "-"
            ];
            csvRows.push(row.join(","));
        });

        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Laporan_Perekaman_Desa_${selectedFormId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const activeFormDetails = allForms.find(f => f.id === selectedFormId);

    return (
        <div className="flex flex-col gap-6 p-6 bg-slate-50/30 dark:bg-slate-950/20 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-blue-600" /> Laporan Perekaman Desa
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">
                        Monitor progres pengisian dan status verifikasi koordinat realisasi fisik pembangunan jalan desa.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRefresh}
                        className="bg-white dark:bg-slate-900 h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800"
                        title="Segarkan Laporan"
                        disabled={isLoadingData}
                    >
                        <RotateCw className={`w-4 h-4 text-slate-500 ${isLoadingData ? "animate-spin" : ""}`} />
                    </Button>
                    <Button
                        onClick={handleExportExcel}
                        variant="outline"
                        className="bg-white dark:bg-slate-900 h-9 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold gap-1.5"
                        disabled={isLoadingData || reportData.length === 0}
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Ekspor CSV</span>
                    </Button>
                </div>
            </div>

            {/* Filter Section */}
            <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-2xl py-0 gap-0">
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Pilih Formulir Realisasi</Label>
                        <Select value={selectedFormId} onValueChange={setSelectedFormId} disabled={isLoadingForms}>
                            <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50/50 dark:bg-slate-950/30">
                                <SelectValue placeholder="Memuat formulir..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {allForms.map(form => (
                                    <SelectItem key={form.id} value={form.id}>
                                        {form.judul} ({form.tahun_anggaran}){form.is_open ? " ● Aktif" : ""}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {activeFormDetails && (
                            <div className="flex items-center gap-2 mt-1.5">
                                {activeFormDetails.is_open ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                                        Formulir Aktif · Terbuka
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                                        Formulir Ditutup
                                    </span>
                                )}
                                <span className="text-[10px] text-muted-foreground">TA. {activeFormDetails.tahun_anggaran}</span>
                            </div>
                        )}
                    </div>

                    <div className="w-full md:w-[220px] space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Filter Kecamatan</Label>
                        <Combobox
                            value={selectedKecId}
                            onChange={setSelectedKecId}
                            options={kecamatanOptions}
                            placeholder="Semua Kecamatan"
                            searchPlaceholder="Cari kecamatan..."
                            className="w-full h-10 rounded-xl bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800"
                        />
                    </div>

                    <div className="w-full md:w-[280px] space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Cari Desa / Kecamatan</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari nama desa..."
                                className="pl-9 h-10 rounded-xl bg-slate-50/50 dark:bg-slate-950/30"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm rounded-2xl overflow-hidden relative py-0 gap-0">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Wilayah Desa</span>
                            <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{isLoadingData ? "..." : reportSummary.total_desa}</span>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-2xl">
                            <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm rounded-2xl overflow-hidden relative py-0 gap-0">
                    <CardContent className="p-5 flex flex-col justify-between h-full gap-2">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Desa Sudah Mengisi</span>
                                <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{isLoadingData ? "..." : reportSummary.sudah_mengisi}</span>
                            </div>
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </div>
                        {!isLoadingData && (
                            <div className="space-y-1 mt-1">
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${reportSummary.persentase_pengisian}%` }} />
                                </div>
                                <span className="text-[9px] text-muted-foreground font-semibold font-mono">{reportSummary.persentase_pengisian}% dari total desa</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm rounded-2xl overflow-hidden relative py-0 gap-0">
                    <CardContent className="p-5 flex flex-col justify-between h-full gap-2">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Desa Belum Mengisi</span>
                                <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-500">{isLoadingData ? "..." : reportSummary.belum_mengisi}</span>
                            </div>
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-2xl">
                                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                        </div>
                        {!isLoadingData && (
                            <div className="space-y-1 mt-1">
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${100 - reportSummary.persentase_pengisian}%` }} />
                                </div>
                                <span className="text-[9px] text-muted-foreground font-semibold font-mono">{(100 - reportSummary.persentase_pengisian).toFixed(2)}% belum merekam</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm rounded-2xl overflow-hidden relative py-0 gap-0">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Anggaran Pembangunan</span>
                            <span className="text-lg font-extrabold text-slate-800 dark:text-slate-100 truncate block max-w-[200px]">
                                {isLoadingData ? "..." : `Rp ${Number(reportSummary.total_anggaran).toLocaleString("id-ID")}`}
                            </span>
                        </div>
                        <div className="p-3 bg-violet-50 dark:bg-violet-950/30 rounded-2xl">
                            <Coins className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Aggregation Table */}
            <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-2xl flex-1 flex flex-col overflow-hidden py-0 gap-0">
                <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between gap-4 shrink-0">
                    <div>
                        <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">Daftar Progres Pengisian Desa</CardTitle>
                        <CardDescription className="text-xs">
                            Menampilkan data usulan realisasi yang terekam per desa pada formulir "{activeFormDetails?.judul || "..."}"
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
                    {isLoadingData ? (
                        <div className="flex items-center justify-center p-12 min-h-[300px]">
                            <span className="text-muted-foreground text-sm">Memuat data agregasi laporan...</span>
                        </div>
                    ) : filteredReportData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 min-h-[300px] gap-2">
                            <FileText className="w-8 h-8 text-slate-300" />
                            <span className="text-slate-400 text-sm font-semibold">Tidak ada data desa ditemukan</span>
                        </div>
                    ) : (
                        <Table className="relative w-full border-collapse">
                            <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
                                <TableRow>
                                    <TableHead className="w-[50px] text-center font-bold text-xs uppercase text-slate-400">No</TableHead>
                                    <TableHead className="font-bold text-xs uppercase text-slate-400">Nama Desa</TableHead>
                                    <TableHead className="font-bold text-xs uppercase text-slate-400 hidden md:table-cell">Kecamatan</TableHead>
                                    <TableHead className="w-[140px] text-center font-bold text-xs uppercase text-slate-400">Status</TableHead>
                                    <TableHead className="text-center font-bold text-xs uppercase text-slate-400 hidden sm:table-cell">Progres Entry</TableHead>
                                    <TableHead className="w-[170px] font-bold text-xs uppercase text-slate-400 hidden lg:table-cell">Update Terakhir</TableHead>
                                    <TableHead className="w-[70px] text-center font-bold text-xs uppercase text-slate-400">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredReportData.map((item, idx) => (
                                    <TableRow key={item.id_desa} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/30 transition-colors">
                                        <TableCell className="text-center font-medium text-slate-500 text-xs">{idx + 1}</TableCell>
                                        <TableCell className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                            <div>{item.nama_desa}</div>
                                            <div className="text-[10px] text-slate-400 font-normal md:hidden mt-0.5">{item.nama_kecamatan}</div>
                                        </TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-400 text-xs hidden md:table-cell">{item.nama_kecamatan}</TableCell>
                                        <TableCell className="text-center">{getStatusBadge(item.status_pengisian)}</TableCell>
                                        <TableCell className="hidden sm:table-cell">
                                            {item.total_entries > 0 ? (
                                                <div className="flex items-center justify-center gap-1 flex-wrap">
                                                    {item.draft_count > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900 font-bold">{item.draft_count} Draft</span>}
                                                    {item.submitted_count > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded border bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900 font-bold">{item.submitted_count} Dikirim</span>}
                                                    {item.verified_count > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900 font-bold">{item.verified_count} Disetujui</span>}
                                                    {item.rejected_count > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded border bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900 font-bold">{item.rejected_count} Ditolak</span>}
                                                </div>
                                            ) : (
                                                <div className="text-center text-slate-400 text-[10px]">-</div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-slate-500 text-[10px] font-medium hidden lg:table-cell">{formatDate(item.last_submitted_at)}</TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl"
                                                onClick={() => handleOpenDetail(item)}
                                                disabled={item.total_entries === 0}
                                                title="Lihat Detail Perekaman Desa"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Detail Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-[750px] max-h-[85vh] overflow-y-auto rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-extrabold flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                            <Building className="w-5 h-5 text-blue-600" /> Detail Laporan: {selectedVillage?.nama_desa}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Kecamatan {selectedVillage?.nama_kecamatan} &bull; Formulir: {activeFormDetails?.judul} ({activeFormDetails?.tahun_anggaran})
                        </DialogDescription>
                    </DialogHeader>

                    {isLoadingDetails ? (
                        <div className="py-12 text-center text-xs text-muted-foreground">
                            Memuat daftar detail laporan desa...
                        </div>
                    ) : villageEntries.length === 0 ? (
                        <div className="py-12 text-center text-xs text-muted-foreground">
                            Belum ada entri data yang terekam.
                        </div>
                    ) : (
                        <div className="space-y-4 py-2">
                            {selectedVillage && (
                                <div className="flex flex-wrap items-center gap-2 px-1 py-2 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/60 dark:bg-slate-900/30">
                                    <span className="text-xs text-slate-500">
                                        Total <strong className="text-slate-800 dark:text-slate-200">{selectedVillage.total_entries}</strong> entry
                                    </span>
                                    <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 self-center" />
                                    {selectedVillage.draft_count > 0 && <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-800">{selectedVillage.draft_count} Draft</span>}
                                    {selectedVillage.submitted_count > 0 && <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 font-bold border border-sky-200 dark:border-sky-800">{selectedVillage.submitted_count} Dikirim</span>}
                                    {selectedVillage.verified_count > 0 && <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800">{selectedVillage.verified_count} Disetujui</span>}
                                    {selectedVillage.rejected_count > 0 && <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-800">{selectedVillage.rejected_count} Ditolak</span>}
                                    {selectedVillage.total_anggaran > 0 && (
                                        <>
                                            <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 self-center" />
                                            <span className="text-[10px] text-slate-500 font-semibold dark:text-slate-400">Rp {Number(selectedVillage.total_anggaran).toLocaleString("id-ID")}</span>
                                        </>
                                    )}
                                </div>
                            )}
                            <div className="border rounded-2xl overflow-hidden bg-slate-50/30 dark:bg-slate-900/10">
                                <Table>
                                    <TableHeader className="bg-slate-50 dark:bg-slate-900">
                                        <TableRow>
                                            <TableHead className="w-[50px] text-center text-[10px] font-bold uppercase">No</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase">Nama Kegiatan / Pembangunan</TableHead>
                                            <TableHead className="w-[100px] text-[10px] font-bold uppercase">Volume</TableHead>
                                            <TableHead className="w-[120px] text-[10px] font-bold uppercase">Anggaran</TableHead>
                                            <TableHead className="w-[100px] text-center text-[10px] font-bold uppercase">Status</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase">Catatan Verifikasi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {villageEntries.map((entry, idx) => (
                                            <TableRow key={entry.id} className="text-xs">
                                                <TableCell className="text-center font-medium text-slate-450">{idx + 1}</TableCell>
                                                <TableCell className="font-semibold text-slate-800 dark:text-slate-200">{entry.nama_kegiatan}</TableCell>
                                                <TableCell>{entry.volume || "-"}</TableCell>
                                                <TableCell className="font-semibold">
                                                    {entry.anggaran ? `Rp ${Number(entry.anggaran).toLocaleString("id-ID")}` : "-"}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge
                                                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase border-0 ${
                                                            entry.status === "verified" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" :
                                                            entry.status === "rejected" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400" :
                                                            entry.status === "submitted" ? "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400" :
                                                            "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                                                        }`}
                                                    >
                                                        {entry.status === "draft" && "Draft"}
                                                        {entry.status === "submitted" && "Dikirim"}
                                                        {entry.status === "verified" && "Disetujui"}
                                                        {entry.status === "rejected" && "Ditolak"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="italic text-slate-500 max-w-[180px] truncate" title={entry.catatan_admin || ""}>
                                                    {entry.catatan_admin || "-"}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="pt-2">
                        <Button variant="outline" className="rounded-xl h-9 text-xs" onClick={() => setIsDetailOpen(false)}>
                            Tutup Detail
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
