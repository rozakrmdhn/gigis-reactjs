import { Pencil, Trash2, Activity, Search } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

interface SegmentActionsProps {
    segment: any;
    isBaseJalan: boolean;
    onZoom: (feature: any) => void;
    onEdit: (feature: any) => void;
    onMonitoring?: (feature: any) => void;
    onDelete?: (feature: any) => void;
}

export const SegmentActions = ({ segment, isBaseJalan, onZoom, onEdit, onMonitoring, onDelete }: SegmentActionsProps) => {
    return (
        <TooltipProvider>
            <div className="flex items-center justify-end gap-1 w-full">
                {/* Zoom Button */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-all cursor-pointer"
                            onClick={() => onZoom(segment)}
                        >
                            <Search className="w-3.5 h-3.5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-[10px]">Fokus Peta</TooltipContent>
                </Tooltip>

                {/* Edit Button */}
                {!isBaseJalan && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-all cursor-pointer"
                                onClick={() => onEdit(segment)}
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-[10px]">Edit Segmen</TooltipContent>
                    </Tooltip>
                )}

                {/* Monitoring Button */}
                {onMonitoring && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-all cursor-pointer"
                                onClick={() => onMonitoring(segment)}
                            >
                                <Activity className="w-3.5 h-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-[10px]">Monitoring Progres</TooltipContent>
                    </Tooltip>
                )}
                
                {/* Delete Button */}
                {onDelete && (
                    <AlertDialog>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all cursor-pointer"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </AlertDialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent className="text-[10px]">Hapus Segmen</TooltipContent>
                        </Tooltip>
                        <AlertDialogContent className="rounded-2xl">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Segmen Jalan?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Tindakan ini tidak dapat dibatalkan. Segmen jalan akan dihapus secara permanen dari database.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-rose-600 hover:bg-rose-700 rounded-xl"
                                    onClick={() => onDelete?.(segment)}
                                >
                                    Hapus Sekarang
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
        </TooltipProvider>
    );
};
