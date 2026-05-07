import { Pencil, Trash2, Activity } from "lucide-react";
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
    onEdit: (feature: any) => void;
    onMonitoring?: (feature: any) => void;
    onDelete?: (feature: any) => void;
}

export const SegmentActions = ({ segment, isBaseJalan, onEdit, onMonitoring, onDelete }: SegmentActionsProps) => {
    return (
        <TooltipProvider>
            <div className="flex items-center gap-1.5 w-full">
                {!isBaseJalan && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[10px] font-bold flex-1 gap-1.5 rounded-lg border-slate-200 dark:border-slate-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-400 transition-all"
                                onClick={() => onEdit(segment)}
                            >
                                <Pencil className="w-3 h-3" />
                                <span className="hidden sm:inline">Edit</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-[10px]">Edit Segmen</TooltipContent>
                    </Tooltip>
                )}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[10px] font-bold flex-1 gap-1.5 rounded-lg border-slate-200 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all"
                            onClick={() => onMonitoring?.(segment)}
                        >
                            <Activity className="w-3 h-3" />
                            <span className="hidden sm:inline">Monitoring</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-[10px]">Monitoring Progres</TooltipContent>
                </Tooltip>
                
                <AlertDialog>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-[10px] font-bold flex-1 gap-1.5 rounded-lg border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 transition-all"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    <span className="hidden sm:inline">Delete</span>
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
            </div>
        </TooltipProvider>
    );
};
