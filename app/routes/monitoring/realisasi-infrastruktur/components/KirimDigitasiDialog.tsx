import React from "react";
import { Send, AlertCircle, Loader2 } from "lucide-react";
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
    segment: RealisasiSegmen | null;
    tipeNama?: string;
    namaKecamatan?: string;
    isSubmitting?: boolean;
    onConfirm: () => Promise<void>;
    onCancel: () => void;
}

export function KirimDigitasiDialog({
    open,
    segment,
    tipeNama = "Infrastruktur",
    namaKecamatan,
    isSubmitting = false,
    onConfirm,
    onCancel,
}: KirimDigitasiDialogProps) {
    if (!segment) return null;

    const displayKecamatan =
        segment.nama_kecamatan ||
        segment.atribut?.nama_kecamatan ||
        segment.atribut?.kecamatan ||
        namaKecamatan ||
        "-";

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o && !isSubmitting) onCancel(); }}>
            <DialogContent className="sm:max-w-[460px] bg-background border-border rounded-2xl shadow-2xl p-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="px-6 py-4 border-b border-border/80 bg-indigo-500/5 dark:bg-indigo-950/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                            <Send className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground">
                                Kirim Geometri Segmen
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                Konfirmasi pengiriman hasil digitasi segmen
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Body Content */}
                <div className="px-4 py-3 space-y-3 text-xs">
                    {/* Notice Box */}
                    <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/50 flex items-start gap-2.5 text-indigo-900 dark:text-indigo-200">
                        <AlertCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="font-bold text-xs">Informasi Pengiriman Data Geometri</p>
                            <p className="text-[11px] leading-relaxed opacity-90">
                                Setelah dikirim, data geometri segmen akan masuk ke daftar verifikasi Operator Bappeda dan status segmen akan diperbarui secara otomatis.
                            </p>
                        </div>
                    </div>

                    {/* Segment Summary Card */}
                    <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-3">
                        <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
                            <div className="space-y-0.5">
                                <span className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground">Nama Segmen / Jalan</span>
                                <h4 className="font-bold text-sm text-foreground leading-tight">{segment.nama_jalan || "Tanpa Nama Segmen"}</h4>
                            </div>
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                                {tipeNama}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-0.5">
                            <div className="space-y-0.5">
                                <span className="text-[10px] text-muted-foreground font-medium">Panjang / Volume</span>
                                <p className="font-bold text-xs text-foreground font-mono">{segment.panjang_m || 0} meter</p>
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-[10px] text-muted-foreground font-medium">Kondisi Fisik</span>
                                <p className="font-bold text-xs text-foreground capitalize">{segment.kondisi || "Baik"}</p>
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-[10px] text-muted-foreground font-medium">Desa / Kelurahan</span>
                                <p className="font-semibold text-xs text-foreground truncate">{segment.nama_desa || segment.atribut?.nama_desa || segment.atribut?.desa || "-"}</p>
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-[10px] text-muted-foreground font-medium">Kecamatan</span>
                                <p className="font-semibold text-xs text-foreground truncate">{displayKecamatan}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <DialogFooter className="px-6 py-4 border-t border-border/80 bg-muted/20 flex flex-row gap-2 justify-end">
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
                        className="h-9 px-5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 gap-1.5"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Mengirimkan...</span>
                            </>
                        ) : (
                            <>
                                <Send className="w-3.5 h-3.5" />
                                <span>Kirim Geometri Segmen</span>
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
