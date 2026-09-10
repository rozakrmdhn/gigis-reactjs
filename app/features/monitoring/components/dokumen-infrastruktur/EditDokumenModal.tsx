import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
    Edit3,
    FileText,
    Building2,
    Calendar,
    Coins,
    Ruler,
    Loader2,
    Layers,
    AlertCircle,
    Check,
    Unlink,
    Link2,
    Save
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
import { Textarea } from "~/components/ui/textarea";
import { Combobox, type ComboboxOption } from "~/components/ui/combobox";
import {
    monitoringLaporanService,
    type MonitoringLaporan,
    type MonitoringLaporanPayload
} from "~/features/monitoring/services/monitoring_laporan.service";
import {
    plottingAnggaranService,
    type PlottingAnggaran
} from "~/features/monitoring/services/plotting_anggaran.service";

interface EditDokumenModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    laporan: MonitoringLaporan | null;
}

const SUMBER_DANA_OPTIONS: ComboboxOption[] = [
    { value: "BKK", label: "BKK (Bantuan Keuangan Khusus)" },
    { value: "APBD", label: "APBD Kabupaten" },
    { value: "APBDes", label: "APBDes (Dana Desa)" },
    { value: "Bankeu", label: "Bantuan Keuangan Provinsi" },
    { value: "Lainnya", label: "Lainnya" }
];

const TAHUN_OPTIONS: ComboboxOption[] = [
    { value: "2026", label: "TA 2026" },
    { value: "2025", label: "TA 2025" },
    { value: "2024", label: "TA 2024" },
    { value: "2023", label: "TA 2023" }
];

export function EditDokumenModal({
    isOpen,
    onClose,
    onSuccess,
    laporan
}: EditDokumenModalProps) {
    const [nomorBa, setNomorBa] = useState<string>("");
    const [tahunAnggaran, setTahunAnggaran] = useState<string>("2026");
    const [sumberDana, setSumberDana] = useState<string>("BKK");
    const [rencanaPanjang, setRencanaPanjang] = useState<string>("0");
    const [plottingId, setPlottingId] = useState<string>("none");
    const [keterangan, setKeterangan] = useState<string>("");

    const [plottingList, setPlottingList] = useState<PlottingAnggaran[]>([]);
    const [loadingPlotting, setLoadingPlotting] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    // Inisialisasi form dari data laporan saat modal dibuka
    useEffect(() => {
        if (isOpen && laporan) {
            setNomorBa(laporan.nomor_ba || `050/XXX/412.302/${laporan.tahun_anggaran || '2026'}`);
            setTahunAnggaran(laporan.tahun_anggaran ? String(laporan.tahun_anggaran) : "2026");
            setSumberDana(laporan.sumber_dana || "BKK");
            setRencanaPanjang(
                laporan.rencana_panjang !== undefined && laporan.rencana_panjang !== null
                    ? String(laporan.rencana_panjang)
                    : (laporan.target_panjang_m !== undefined ? String(laporan.target_panjang_m) : "0")
            );
            const currentPlottingId = laporan.PlottingAnggaran?.id || (laporan as any).plotting_id;
            setPlottingId(currentPlottingId ? String(currentPlottingId) : "none");
            setKeterangan(laporan.keterangan || (laporan as any).catatan || "");
        }
    }, [isOpen, laporan]);

    // Fetch daftar Plotting Anggaran untuk desa & tahun laporan aktif
    const fetchPlotting = useCallback(async () => {
        const idDesa = laporan?.id_desa || (laporan?.Desa as any)?.id;
        if (!isOpen || !idDesa) return;

        setLoadingPlotting(true);
        try {
            const params: any = {
                id_desa: idDesa,
                tahun_anggaran: tahunAnggaran
            };
            const res = await plottingAnggaranService.getPlottingList(params);
            const list = Array.isArray(res?.result) ? res.result : (Array.isArray(res?.data) ? res.data : []);
            setPlottingList(list);
        } catch (err) {
            console.error("Error fetching plotting for edit modal:", err);
            setPlottingList([]);
        } finally {
            setLoadingPlotting(false);
        }
    }, [isOpen, laporan, tahunAnggaran]);

    useEffect(() => {
        if (isOpen && laporan) {
            fetchPlotting();
        }
    }, [isOpen, laporan, fetchPlotting]);

    // Pilihan Plotting Options untuk Combobox
    const plottingOptions: ComboboxOption[] = React.useMemo(() => {
        const options: ComboboxOption[] = [
            { value: "none", label: "Tanpa Tautan Plotting (Mandiri)" }
        ];

        plottingList.forEach((p) => {
            const targetM = p.target_panjang_m ? `${Number(p.target_panjang_m).toLocaleString('id-ID')}m` : '';
            const pagu = p.target_pagu_anggaran ? `Rp ${Number(p.target_pagu_anggaran).toLocaleString('id-ID')}` : '';
            const desc = [targetM, pagu].filter(Boolean).join(' • ');
            options.push({
                value: String(p.id),
                label: `${p.nama_kegiatan} ${desc ? `(${desc})` : ''}`
            });
        });

        return options;
    }, [plottingList]);

    // Ketika memilih Plotting Anggaran, auto-fill target & sumber dana
    const handleSelectPlotting = (val: string) => {
        setPlottingId(val);
        if (val !== "none") {
            const selected = plottingList.find((p) => String(p.id) === val);
            if (selected) {
                if (selected.target_panjang_m) {
                    setRencanaPanjang(String(selected.target_panjang_m));
                }
                if (selected.sumber_dana) {
                    setSumberDana(selected.sumber_dana);
                }
                toast.info(`Target fisik disinkronkan dari: ${selected.nama_kegiatan}`);
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!laporan?.id) return;

        if (!nomorBa.trim()) {
            toast.error("Nomor Dokumen / Berita Acara wajib diisi");
            return;
        }

        const parsedPanjang = parseFloat(rencanaPanjang) || 0;
        if (parsedPanjang < 0) {
            toast.error("Target rencana panjang fisik tidak boleh bernilai negatif");
            return;
        }

        setIsSaving(true);
        const toastId = toast.loading("Menyimpan perubahan metadata dokumen...");

        try {
            const payload: Partial<MonitoringLaporanPayload> = {
                nomor_ba: nomorBa.trim(),
                tahun_anggaran: tahunAnggaran,
                sumber_dana: sumberDana,
                rencana_panjang: parsedPanjang,
                plotting_id: plottingId !== "none" ? plottingId : null,
                keterangan: keterangan.trim() || undefined
            };

            await monitoringLaporanService.updateLaporan(laporan.id, payload);
            toast.success("Metadata dokumen monitoring berhasil diperbarui!", { id: toastId });
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Error updating laporan:", err);
            toast.error(err?.message || "Gagal memperbarui metadata dokumen", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const namaDesa = laporan?.Desa?.nama_desa || (laporan as any)?.nama_desa || "-";
    const namaKec = laporan?.Kecamatan?.nama_kecamatan || (laporan?.Desa as any)?.nama_kecamatan || "-";

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg w-full max-h-[92vh] flex flex-col bg-background border-border rounded-2xl shadow-2xl p-0 overflow-hidden">
                {/* Modal Header */}
                <DialogHeader className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-border/80 bg-muted/20 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-600/20 shadow-xs">
                            <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                            <DialogTitle className="text-sm sm:text-base font-bold text-foreground">
                                Edit Metadata Dokumen Monitoring
                            </DialogTitle>
                            <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1 sm:line-clamp-none">
                                Sesuaikan nomor berita acara, tahun anggaran, target fisik, atau tautan plotting.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Form Content */}
                <form onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 sm:p-5 space-y-3">
                        {/* Badge Info Wilayah */}
                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/70 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="text-xs font-semibold text-foreground truncate">
                                    Desa {namaDesa}, Kec. {namaKec}
                                </span>
                            </div>
                            <Badge variant="outline" className="text-[9.5px] font-mono shrink-0 bg-background">
                                ID: {laporan?.id ? String(laporan.id).slice(0, 8) : '-'}
                            </Badge>
                        </div>

                        {/* Nomor Dokumen / BA */}
                        <div className="space-y-1">
                            <Label htmlFor="edit-nomor-ba" className="text-[11px] sm:text-xs font-bold text-foreground">
                                Nomor Dokumen / Berita Acara <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                id="edit-nomor-ba"
                                value={nomorBa}
                                onChange={(e) => setNomorBa(e.target.value)}
                                placeholder="Contoh: 050/001/412.302/2026"
                                className="font-mono text-xs h-8 sm:h-9 bg-background"
                                required
                            />
                        </div>

                        {/* Tahun Anggaran & Sumber Dana (Grid 2 Kolom di Mobile & Desktop) */}
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                            <div className="space-y-1">
                                <Label className="text-[11px] sm:text-xs font-bold text-foreground">
                                    Tahun Anggaran
                                </Label>
                                <Combobox
                                    options={TAHUN_OPTIONS}
                                    value={tahunAnggaran}
                                    onChange={setTahunAnggaran}
                                    placeholder="Tahun"
                                    searchPlaceholder="Cari tahun..."
                                    className="w-full h-8 sm:h-9 text-xs bg-background"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[11px] sm:text-xs font-bold text-foreground">
                                    Sumber Dana
                                </Label>
                                <Combobox
                                    options={SUMBER_DANA_OPTIONS}
                                    value={sumberDana}
                                    onChange={setSumberDana}
                                    placeholder="Sumber Dana"
                                    searchPlaceholder="Cari sumber dana..."
                                    className="w-full h-8 sm:h-9 text-xs bg-background"
                                />
                            </div>
                        </div>

                        {/* Target Rencana Panjang Fisik (Meter) */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="edit-rencana-panjang" className="text-[11px] sm:text-xs font-bold text-foreground">
                                    Target Rencana Panjang Fisik (Meter)
                                </Label>
                                {parseFloat(rencanaPanjang) > 0 && (
                                    <span className="text-[10.5px] font-mono text-muted-foreground">
                                        ≈ {(parseFloat(rencanaPanjang) / 1000).toFixed(2)} km
                                    </span>
                                )}
                            </div>
                            <div className="relative">
                                <Ruler className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <Input
                                    id="edit-rencana-panjang"
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={rencanaPanjang}
                                    onChange={(e) => setRencanaPanjang(e.target.value)}
                                    placeholder="0"
                                    className="pl-8 pr-14 font-mono text-xs h-8 sm:h-9 bg-background"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                                    meter
                                </span>
                            </div>
                        </div>

                        {/* Tautan Plotting Anggaran */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <Label className="text-[11px] sm:text-xs font-bold text-foreground">
                                    Tautan Plotting Anggaran
                                </Label>
                                {loadingPlotting && (
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Memuat...
                                    </span>
                                )}
                            </div>
                            <Combobox
                                options={plottingOptions}
                                value={plottingId}
                                onChange={handleSelectPlotting}
                                placeholder="Pilih Plotting Anggaran"
                                searchPlaceholder="Cari kegiatan plotting..."
                                disabled={loadingPlotting}
                                className="w-full text-xs bg-background"
                            />
                            <p className="text-[10.5px] text-muted-foreground leading-tight">
                                Hubungkan dengan kegiatan plotting untuk sinkronisasi target fisik & pagu anggaran otomatis.
                            </p>
                        </div>

                        {/* Catatan / Keterangan */}
                        <div className="space-y-1">
                            <Label htmlFor="edit-keterangan" className="text-[11px] sm:text-xs font-bold text-foreground">
                                Keterangan / Catatan Tambahan (Opsional)
                            </Label>
                            <Textarea
                                id="edit-keterangan"
                                value={keterangan}
                                onChange={(e) => setKeterangan(e.target.value)}
                                placeholder="Catatan khusus terkait dokumen..."
                                rows={2}
                                className="text-xs bg-background resize-none"
                            />
                        </div>
                    </div>

                    {/* Modal Footer (Side-by-side on mobile, right-aligned on desktop) */}
                    <div className="p-3 sm:px-6 sm:py-3 border-t border-border bg-muted/20 shrink-0">
                        <div className="grid grid-cols-2 sm:flex sm:justify-end items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={isSaving}
                                className="h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer w-full sm:w-auto"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSaving}
                                className="h-9 px-5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md gap-1.5 cursor-pointer w-full sm:w-auto"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-3.5 h-3.5" />
                                        <span>Simpan Perubahan</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
