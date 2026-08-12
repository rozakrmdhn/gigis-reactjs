import { Filter, X } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";

interface SegmentFiltersProps {
    filters: { kondisi: string; status_kondisi: string };
    onFilterChange: (filters: { kondisi: string; status_kondisi: string }) => void;
}

export const SegmentFilters = ({ filters, onFilterChange }: SegmentFiltersProps) => {
    const isFiltered = filters.kondisi !== 'all' || filters.status_kondisi !== 'all';

    return (
        <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <Select
                    value={filters.status_kondisi}
                    onValueChange={(val) => onFilterChange({ ...filters, status_kondisi: val })}
                >
                    <SelectTrigger className="h-7.5 flex-1 text-[10px] font-bold uppercase rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl">
                        <SelectItem value="all" className="text-[11px] font-medium">Semua Status</SelectItem>
                        <SelectItem value="Eksisting" className="text-[11px] font-medium">Eksisting</SelectItem>
                        <SelectItem value="Riwayat" className="text-[11px] font-medium">Riwayat</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={filters.kondisi}
                    onValueChange={(val) => onFilterChange({ ...filters, kondisi: val })}
                >
                    <SelectTrigger className="h-7.5 flex-1 text-[10px] font-bold uppercase rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <SelectValue placeholder="Kondisi" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl">
                        <SelectItem value="all" className="text-[11px] font-medium">Semua Kondisi</SelectItem>
                        <SelectItem value="baik" className="text-[11px] font-medium">Baik</SelectItem>
                        <SelectItem value="sedang" className="text-[11px] font-medium">Sedang</SelectItem>
                        <SelectItem value="rusak_ringan" className="text-[11px] font-medium">Rusak Ringan</SelectItem>
                        <SelectItem value="rusak_berat" className="text-[11px] font-medium">Rusak Berat</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {isFiltered && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7.5 w-7.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 shrink-0"
                    onClick={() => onFilterChange({ kondisi: 'all', status_kondisi: 'all' })}
                >
                    <X className="h-3.5 w-3.5" />
                </Button>
            )}
        </div>
    );
};
