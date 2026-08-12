import { Sparkles } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "~/components/ui/dialog";
import type { InfrastrukturTipe } from "~/services/infrastruktur.service";

interface PrintDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    printParams: { desaId: string; tahun: string } | null;
    printTotalLength: number;
    tipes: InfrastrukturTipe[];
    selectedPrintTipeKodes: string[];
    onSelectAllTipes: () => void;
    onToggleTipe: (kode: string, checked: boolean) => void;
    plottingOptionsList: any[];
    selectedPlottingId: string;
    onChangePlottingId: (val: string) => void;
    namaPimpinanInput: string;
    setNamaPimpinanInput: (v: string) => void;
    namaJabatanInput: string;
    setNamaJabatanInput: (v: string) => void;
    nipInput: string;
    setNipInput: (v: string) => void;
    nomorBaInput: string;
    setNomorBaInput: (v: string) => void;
    rencanaPanjangInput: string;
    setRencanaPanjangInput: (v: string) => void;
    sumberDanaPrintInput: string;
    onChangeSumberDana: (val: string) => Promise<void>;
    onConfirm: () => Promise<void>;
    onCancel: () => void;
}

export function PrintDialog({
    open,
    onOpenChange,
    printParams,
    printTotalLength,
    tipes,
    selectedPrintTipeKodes,
    onSelectAllTipes,
    onToggleTipe,
    plottingOptionsList,
    selectedPlottingId,
    onChangePlottingId,
    namaPimpinanInput,
    setNamaPimpinanInput,
    namaJabatanInput,
    setNamaJabatanInput,
    nipInput,
    setNipInput,
    nomorBaInput,
    setNomorBaInput,
    rencanaPanjangInput,
    setRencanaPanjangInput,
    sumberDanaPrintInput,
    onChangeSumberDana,
    onConfirm,
    onCancel,
}: PrintDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-popover border-border rounded-xl shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-sm font-bold flex items-center gap-2">
                        <Sparkles className="size-4 text-violet-600" />
                        <span>Finalisasi & Snapshot Digitasi Infrastruktur</span>
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-3 text-xs">
                    {/* Summary Info */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg space-y-2 border border-border">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground font-medium">Tahun Pembangunan:</span>
                            <span className="font-bold text-foreground">{printParams?.tahun}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground font-medium">Total Panjang Realisasi:</span>
                            <span className="font-bold text-foreground">{printTotalLength.toFixed(1)} m</span>
                        </div>
                    </div>

                    {/* Tipe Infrastruktur Selector */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                                Tipe Infrastruktur Disnapshot (
                                {selectedPrintTipeKodes.length === 0 || selectedPrintTipeKodes.includes("semua")
                                    ? "Semua Tipe"
                                    : `${selectedPrintTipeKodes.length} Tipe Terpilih`}
                                )
                            </Label>
                            <button
                                type="button"
                                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                                onClick={onSelectAllTipes}
                            >
                                Pilih Semua Tipe
                            </button>
                        </div>
                        <div className="p-2 bg-background border border-input rounded-lg max-h-36 overflow-y-auto space-y-1">
                            {tipes.map((t) => {
                                const isChecked =
                                    selectedPrintTipeKodes.length === 0 ||
                                    selectedPrintTipeKodes.includes("semua") ||
                                    selectedPrintTipeKodes.includes(t.kode);
                                return (
                                    <label
                                        key={t.kode}
                                        className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent/50 p-1.5 rounded transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => onToggleTipe(t.kode, e.target.checked)}
                                            className="rounded border-input text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                                        />
                                        <span className="font-medium text-foreground">{t.nama}</span>
                                        <span className="text-[9px] text-muted-foreground ml-auto uppercase font-semibold">
                                            ({t.geom_type})
                                        </span>
                                    </label>
                                );
                            })}
                            <p className="text-[10px] text-muted-foreground italic">
                                * Hanya segmen dari tipe infrastruktur yang dipilih yang akan di-snapshot ke dalam Berita Acara.
                            </p>
                        </div>
                    </div>

                    {/* Plotting Anggaran */}
                    {plottingOptionsList.length > 0 && (
                        <div className="space-y-1.5 p-2.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 rounded-xl">
                            <Label className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider block">
                                Referensi Anggaran
                            </Label>
                            <Select value={selectedPlottingId} onValueChange={onChangePlottingId}>
                                <SelectTrigger className="w-full h-9 text-xs bg-background border-input rounded-lg font-medium">
                                    <SelectValue placeholder="Pilih Plotting Anggaran..." />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border">
                                    <SelectItem value="none">-- Tanpa Relasi Plotting --</SelectItem>
                                    {plottingOptionsList.map((p) => (
                                        <SelectItem key={p.id} value={p.id.toString()}>
                                            {p.nama_kegiatan} ({p.target_panjang_m || 0}m - {p.sumber_dana || "BKK"})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground italic">
                                * Menghubungkan Berita Acara langsung ke tabel Plotting Anggaran.
                            </p>
                        </div>
                    )}

                    {/* Informasi Pimpinan */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-border/80 space-y-3">
                        <Label className="text-[10px] font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                            Informasi Kepala Desa / Pimpinan
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-muted-foreground block">Nama Kepala Desa / Pimpinan</Label>
                                <Input
                                    type="text"
                                    placeholder="Nama Kepala Desa..."
                                    value={namaPimpinanInput}
                                    onChange={(e) => setNamaPimpinanInput(e.target.value)}
                                    className="h-9 bg-background border-input text-xs rounded-lg focus:border-blue-500"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-muted-foreground block">Nama Jabatan</Label>
                                <Input
                                    type="text"
                                    placeholder="Kepala Desa..."
                                    value={namaJabatanInput}
                                    onChange={(e) => setNamaJabatanInput(e.target.value)}
                                    className="h-9 bg-background border-input text-xs rounded-lg focus:border-blue-500"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-muted-foreground block">NIP Pimpinan (Opsional)</Label>
                            <Input
                                type="text"
                                placeholder="NIP..."
                                value={nipInput}
                                onChange={(e) => setNipInput(e.target.value)}
                                className="h-9 bg-background border-input text-xs rounded-lg focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Nomor BA */}
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                            Nomor Berita Acara (Manual)
                        </Label>
                        <Input
                            type="text"
                            placeholder="050/XXX/412.302/2026"
                            value={nomorBaInput}
                            onChange={(e) => setNomorBaInput(e.target.value)}
                            className="h-9 bg-background border-input text-xs font-mono font-bold rounded-lg focus:border-blue-500"
                        />
                        <p className="text-[10px] text-muted-foreground italic">
                            * Masukkan format nomor dokumen resmi (misal: 050/012/412.302/2026).
                        </p>
                    </div>

                    {/* Rencana Panjang & Sumber Dana */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 space-y-1.5">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                                Rencana Panjang (Meter)
                            </Label>
                            <Input
                                type="number"
                                placeholder="Masukkan rencana panjang..."
                                value={rencanaPanjangInput}
                                onChange={(e) => setRencanaPanjangInput(e.target.value)}
                                className="h-9 bg-background border-input text-xs rounded-lg focus:border-blue-500"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Sumber Dana</Label>
                            <Select value={sumberDanaPrintInput} onValueChange={onChangeSumberDana}>
                                <SelectTrigger className="w-full h-9 text-xs bg-background border-input rounded-lg">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border">
                                    {["BKK", "Sektoral", "Lainnya"].map((sd) => (
                                        <SelectItem key={sd} value={sd}>{sd}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Persentase Capaian */}
                    {parseFloat(rencanaPanjangInput) > 0 && (
                        <div className="p-3 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg flex justify-between items-center font-bold">
                            <span>Persentase Capaian Realisasi:</span>
                            <span>{((printTotalLength / parseFloat(rencanaPanjangInput)) * 100).toFixed(1)}%</span>
                        </div>
                    )}
                </div>

                <DialogFooter className="border-t border-border pt-3 flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={onCancel} className="h-9 text-xs">
                        Batal
                    </Button>
                    <Button
                        type="button"
                        onClick={onConfirm}
                        className="h-9 text-xs bg-violet-600 hover:bg-violet-700 text-white font-bold gap-1.5"
                    >
                        <Sparkles className="size-3.5" />
                        <span>Finalisasi & Snapshot Berita Acara</span>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
