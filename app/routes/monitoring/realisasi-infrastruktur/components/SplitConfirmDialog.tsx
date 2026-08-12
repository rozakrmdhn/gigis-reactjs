import { Scissors } from "lucide-react";
import { LineString } from "ol/geom";
import { getLength } from "ol/sphere";
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

interface SplitConfirmDialogProps {
    open: boolean;
    splittingSegment: RealisasiSegmen | null;
    splitPreviewCoords: { part1: number[][]; part2: number[][] } | null;
    onConfirm: () => Promise<void>;
    onCancel: () => void;
}

export function SplitConfirmDialog({
    open,
    splittingSegment,
    splitPreviewCoords,
    onConfirm,
    onCancel,
}: SplitConfirmDialogProps) {
    if (!splittingSegment || !splitPreviewCoords) return null;

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
            <DialogContent className="sm:max-w-[420px] bg-popover border-border rounded-xl shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="px-5 py-4 border-b border-border/80 bg-amber-500/5">
                    <DialogTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                        <Scissors className="size-4 text-amber-500" />
                        Konfirmasi Split Segmen
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                        Segmen akan dipecah menjadi dua. Tindakan ini tidak dapat dibatalkan.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-5 py-4 space-y-3 text-xs">
                    <div className="p-3 bg-muted/40 rounded-lg border border-border/60 space-y-1.5">
                        <p className="font-semibold text-foreground">{splittingSegment.nama_jalan}</p>
                        <p className="text-muted-foreground">
                            Panjang asli: <span className="font-medium text-foreground">{splittingSegment.panjang_m}m</span>
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-lg border border-border/60 bg-blue-500/5 text-center">
                            <p className="text-[10px] text-muted-foreground mb-0.5">Segmen Bagian 1</p>
                            <p className="font-bold text-blue-600 dark:text-blue-400">
                                {Math.round(getLength(new LineString(splitPreviewCoords.part1), { projection: "EPSG:3857" }))}m
                            </p>
                        </div>
                        <div className="p-2.5 rounded-lg border border-border/60 bg-emerald-500/5 text-center">
                            <p className="text-[10px] text-muted-foreground mb-0.5">Segmen Bagian 2</p>
                            <p className="font-bold text-emerald-600 dark:text-emerald-400">
                                {Math.round(getLength(new LineString(splitPreviewCoords.part2), { projection: "EPSG:3857" }))}m
                            </p>
                        </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Kedua segmen baru akan mewarisi semua atribut dari segmen asli. Anda bisa mengedit atributnya setelah split selesai.
                    </p>
                </div>

                <DialogFooter className="px-5 py-3 border-t border-border/80 bg-muted/30 flex flex-row gap-2 justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onCancel}
                        className="h-9 px-4 text-xs rounded-xl"
                    >
                        Batal
                    </Button>
                    <Button
                        size="sm"
                        onClick={onConfirm}
                        className="h-9 px-4 text-xs rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold"
                    >
                        <Scissors className="size-3.5 mr-1.5" />
                        Konfirmasi Split
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
