import React from "react";
import { Send, AlertCircle, Loader2, Layers } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "~/components/ui/dialog";
import type { RealisasiSegmen } from "../types";

interface KirimDigitasiDialogProps {
    open: boolean;
    segment?: RealisasiSegmen | null;
    segments?: RealisasiSegmen[];
    tipeNama?: string;
    namaKecamatan?: string;
    isSubmitting?: boolean;
    onConfirm: () => Promise<void>;
    onCancel: () => void;
}

export function KirimDigitasiDialog({
    open,
    segment,
    segments,
    tipeNama = "Infrastruktur",
    namaKecamatan,
    isSubmitting = false,
    onConfirm,
    onCancel,
}: KirimDigitasiDialogProps) {
    const listToSend = segments && segments.length > 0 ? segments : segment ? [segment] : [];
    if (listToSend.length === 0) return null;

    const isBatch = listToSend.length > 1;
    const singleSegment = listToSend[0];

    const totalLengthM = listToSend.reduce((acc, s) => {
        return acc + (parseFloat(s.panjang_m?.toString() || "0") || 0);
    }, 0);

    const displayKecamatan =
        singleSegment.nama_kecamatan ||
        singleSegment.atribut?.nama_kecamatan ||
        singleSegment.atribut?.kecamatan ||
        namaKecamatan ||
        "-";

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o && !isSubmitting) onCancel(); }}>
            <DialogContent className="sm:max-w-[500px] bg-background border-border rounded-2xl shadow-2xl p-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="px-6 py-4 border-b border-border/80 bg-indigo-500/5 dark:bg-indigo-950/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                            {isBatch ? <Layers className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground">
                                {isBatch ? `Ajukan ${listToSend.length} Segmen ke Bappeda` : "Kirim Geometri Segmen"}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                {isBatch
                                    ? `Konfirmasi pengajuan massal ${listToSend.length} hasil digitasi`
                                    : "Konfirmasi pengiriman hasil digitasi segmen"}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Body Content */}
                <div className="px-5 py-4 space-y-3.5 text-xs">
                    {/* Notice Box */}
                    <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/50 flex items-start gap-2.5 text-indigo-900 dark:text-indigo-200">
                        <AlertCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="font-bold text-xs">Informasi Verifikasi Bappeda</p>
                            <p className="text-[11px] leading-relaxed opacity-90">
                                {isBatch
                                    ? `Sebanyak ${listToSend.length} segmen terpilih akan diajukan ke Operator Bappeda dan statusnya akan diperbarui menjadi 'Menunggu Verifikasi'.`
                                    : "Setelah dikirim, data geometri segmen akan masuk ke antrean verifikasi Operator Bappeda."}
                            </p>
                        </div>
                    </div>

                    {isBatch ? (
                        /* BATCH SUMMARY */
                        <div className="space-y-2.5">
                            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-muted/40 border border-border/70 text-xs">
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Jumlah Segmen</span>
                                    <p className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">{listToSend.length} Ruas</p>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Panjang</span>
                                    <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{totalLengthM.toFixed(1)} meter</p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Daftar Segmen Terpilih:</div>
                                <div className="max-h-[160px] overflow-y-auto custom-scrollbar space-y-1.5 p-2 rounded-xl bg-muted/20 border border-border/60">
                                    {listToSend.map((s, idx) => (
                                        <div key={s.id || idx} className="flex items-center justify-between p-2 rounded-lg bg-card border border-border/50 text-xs">
                                            <div className="min-w-0 pr-2">
                                                <div className="font-bold text-foreground truncate">{s.nama_jalan || s.namobj || `Segmen #${idx + 1}`}</div>
                                                <div className="text-[10px] text-muted-foreground">TA: {s.tahun_anggaran || "-"} • Kondisi: {s.kondisi || "Baik"}</div>
                                            </div>
                                            <div className="shrink-0 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                                {parseFloat(s.panjang_m?.toString() || "0").toFixed(1)} m
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* SINGLE SEGMENT SUMMARY */
                        <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-3">
                            <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground">NAMA SEGMEN / JALAN</span>
                                    <h4 className="font-bold text-sm text-foreground leading-tight">{singleSegment.nama_jalan || singleSegment.namobj || "Tanpa Nama Segmen"}</h4>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 shadow-2xs">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                        <span>{tipeNama || "Jalan Desa"}</span>
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-0.5">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-muted-foreground font-medium">Panjang / Volume</span>
                                    <p className="font-bold text-xs text-foreground font-mono">
                                        {singleSegment.panjang_m !== undefined && singleSegment.panjang_m !== null
                                            ? `${parseFloat(singleSegment.panjang_m.toString()).toFixed(1)} meter`
                                            : "0 meter"}
                                    </p>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-muted-foreground font-medium">Kondisi Fisik</span>
                                    <p className="font-bold text-xs text-foreground capitalize">{singleSegment.kondisi || "Baik"}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-muted-foreground font-medium">Desa / Kelurahan</span>
                                    <p className="font-semibold text-xs text-foreground truncate">{singleSegment.nama_desa || singleSegment.atribut?.nama_desa || singleSegment.atribut?.desa || "-"}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-muted-foreground font-medium">Kecamatan</span>
                                    <p className="font-semibold text-xs text-foreground truncate">{displayKecamatan}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <DialogFooter className="px-6 py-3.5 border-t border-border/80 bg-muted/20 flex flex-row gap-2 justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={onCancel}
                        className="h-9 px-4 text-xs font-semibold rounded-xl"
                    >
                        Batal
                    </Button>
                    <Button
                        type="button"
                        disabled={isSubmitting}
                        onClick={onConfirm}
                        className="h-9 px-5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 gap-1.5 cursor-pointer"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Mengirimkan...</span>
                            </>
                        ) : (
                            <>
                                <Send className="w-3.5 h-3.5" />
                                <span>{isBatch ? `Ajukan ${listToSend.length} Segmen` : "Kirim Geometri Segmen"}</span>
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
