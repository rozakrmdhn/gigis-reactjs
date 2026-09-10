import React from "react";
import { AlertTriangle, Trash2, Loader2, X } from "lucide-react";
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

export interface DeleteDetailItem {
    label: string;
    value: React.ReactNode;
}

export interface ConfirmDeleteDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void> | void;
    title?: string;
    description?: string;
    itemName?: string;
    itemType?: string;
    details?: DeleteDetailItem[];
    loading?: boolean;
    confirmText?: string;
    cancelText?: string;
    warningText?: string;
}

export function ConfirmDeleteDialog({
    open,
    onClose,
    onConfirm,
    title = "Hapus Data",
    description = "Apakah Anda yakin ingin menghapus data ini?",
    itemName,
    itemType,
    details = [],
    loading = false,
    confirmText = "Ya, Hapus Permanen",
    cancelText = "Batal",
    warningText = "Tindakan ini tidak dapat dibatalkan. Seluruh data dan keterikatan yang terkait akan dihapus secara permanen dari sistem."
}: ConfirmDeleteDialogProps) {
    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o && !loading) onClose(); }}>
            <DialogContent
                className="w-full max-w-[calc(100%-2rem)] sm:max-w-[440px] p-0 overflow-hidden bg-background border-border rounded-2xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200"
            >
                {/* Header with Danger Accent Glow */}
                <div className="relative pt-6 pb-4 px-6 text-center border-b border-border/40 bg-linear-to-b from-rose-500/10 via-rose-500/5 to-transparent">
                    {/* Glowing Danger Icon */}
                    <div className="relative mx-auto w-14 h-14 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center ring-8 ring-rose-500/5 mb-3 shadow-inner">
                        <Trash2 className="w-6 h-6 animate-in zoom-in-50 duration-300" />
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-600 rounded-full border-2 border-background animate-pulse" />
                    </div>

                    <DialogHeader className="space-y-1 text-center">
                        <DialogTitle className="text-base font-bold text-foreground text-center tracking-tight">
                            {title}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground text-center leading-relaxed">
                            {description}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Content Details Box */}
                <div className="p-5 space-y-3.5">
                    {/* Item Highlight Banner */}
                    {(itemName || itemType) && (
                        <div className="p-3 rounded-xl bg-muted/50 border border-border/80 space-y-1">
                            {itemType && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                                    {itemType}
                                </span>
                            )}
                            {itemName && (
                                <p className="text-xs font-bold text-foreground leading-snug break-words">
                                    {itemName}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Metadata Table / Key-Values */}
                    {details && details.length > 0 && (
                        <div className="rounded-xl border border-border/60 divide-y divide-border/40 overflow-hidden text-xs bg-card">
                            {details.map((detail, index) => (
                                <div key={index} className="flex items-center justify-between px-3 py-2 text-xs">
                                    <span className="text-muted-foreground text-[11px] font-medium">{detail.label}</span>
                                    <span className="font-semibold text-foreground text-right">{detail.value}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Warning Notice Card */}
                    {warningText && (
                        <div className="p-3 rounded-xl bg-rose-500/8 dark:bg-rose-950/30 border border-rose-500/20 flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed font-medium">
                                {warningText}
                            </p>
                        </div>
                    )}
                </div>

                {/* Action Buttons Footer */}
                <DialogFooter className="p-4 sm:px-5 sm:py-3.5 border-t border-border bg-muted/20 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={loading}
                        className="h-10 sm:h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer w-full sm:w-auto"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className="h-10 sm:h-9 px-5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md gap-1.5 cursor-pointer disabled:opacity-50 w-full sm:w-auto transition-all"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Menghapus...</span>
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{confirmText}</span>
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
