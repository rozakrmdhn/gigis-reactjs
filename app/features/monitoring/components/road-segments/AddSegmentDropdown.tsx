import { Plus, MousePointerClick, Sparkles } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "~/components/ui/dropdown-menu";

interface AddSegmentDropdownProps {
    onAdd: (type: 'manual' | 'otomatis') => void;
}

export const AddSegmentDropdown = ({ onAdd }: AddSegmentDropdownProps) => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] h-8 px-4 gap-2 shadow-md rounded-xl uppercase tracking-widest font-black transition-all active:scale-95 border-none"
                >
                    <Plus className="w-4 h-4" />
                    Tambah
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 p-1 rounded-xl border-slate-200 dark:border-slate-800 shadow-xl">
                <DropdownMenuLabel className="text-[9px] uppercase font-bold text-slate-400 px-2 py-1.5">Metode Digitasi</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={() => onAdd('manual')}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg cursor-pointer"
                >
                    <div className="p-1 bg-blue-100 dark:bg-blue-900/40 rounded-md text-blue-600 dark:text-blue-400">
                        <MousePointerClick className="w-3.5 h-3.5" />
                    </div>
                    <span>Manual</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => onAdd('otomatis')}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg cursor-pointer"
                >
                    <div className="p-1 bg-emerald-100 dark:bg-emerald-900/40 rounded-md text-emerald-600 dark:text-emerald-400">
                        <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <span>Otomatis (AI)</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
