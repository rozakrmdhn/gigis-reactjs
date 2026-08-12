import { AlertCircle } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "~/components/ui/dialog";
import type { InfrastrukturTipe } from "~/services/infrastruktur.service";

interface DeleteConfirmDialogProps {
    open: boolean;
    activeTipe: InfrastrukturTipe | null;
    onConfirm: () => Promise<void>;
    onClose: () => void;
}

export function DeleteConfirmDialog({
    open,
    activeTipe,
    onConfirm,
    onClose,
}: DeleteConfirmDialogProps) {
    const isArea =
        activeTipe?.geom_type?.toUpperCase() === "POLYGON" ||
        activeTipe?.geom_type?.toUpperCase() === "MULTIPOLYGON";

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="sm:max-w-[400px] bg-popover border-border rounded-xl shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
                        <AlertCircle className="size-4" />
                        <span>{isArea ? "Konfirmasi Hapus Area" : "Konfirmasi Hapus Segmen"}</span>
                    </DialogTitle>
                </DialogHeader>
                <div className="py-3 text-xs text-muted-foreground">
                    {isArea
                        ? "Apakah Anda yakin ingin menghapus area realisasi ini? Tindakan ini tidak dapat dibatalkan dan data area akan dihapus secara permanen dari database."
                        : "Apakah Anda yakin ingin menghapus segmen realisasi ini? Tindakan ini tidak dapat dibatalkan dan data segmen akan dihapus secara permanen dari database."}
                </div>
                <DialogFooter className="border-t border-border pt-3 flex gap-2 justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="h-9 text-xs"
                    >
                        Batal
                    </Button>
                    <Button
                        type="button"
                        onClick={onConfirm}
                        className="h-9 text-xs bg-destructive hover:bg-destructive/90 text-white border-0"
                    >
                        Hapus Permanen
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
