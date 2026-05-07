import { List } from "lucide-react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";
import { SegmentItem } from "./SegmentItem";
import { SegmentFilters } from "./SegmentFilters";
import { AddSegmentDropdown } from "./AddSegmentDropdown";

interface SegmentListProps {
    items: any[];
    emptyMessage: string;
    onAdd?: (type: 'manual' | 'otomatis') => void;
    showFilter?: boolean;
    filters: { kondisi: string; status_kondisi: string };
    onFilterChange?: (filters: { kondisi: string; status_kondisi: string }) => void;
    onZoom: (feature: any) => void;
    onEdit: (feature: any) => void;
    onDelete?: (feature: any) => void;
    onMonitoring?: (feature: any) => void;
}

export const SegmentList = ({
    items,
    emptyMessage,
    onAdd,
    showFilter,
    filters,
    onFilterChange,
    onZoom,
    onEdit,
    onDelete,
    onMonitoring
}: SegmentListProps) => (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50/20 dark:bg-slate-900/5">
        <div className="flex flex-col bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 shadow-sm z-10">
            {showFilter && onFilterChange && (
                <div className="px-3 pt-2.5">
                    <SegmentFilters filters={filters} onFilterChange={onFilterChange} />
                </div>
            )}
            <div className={cn(
                "px-3 py-2 flex items-center justify-between gap-2",
                !showFilter && "pt-2.5"
            )}>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {items.length} Segmen ditemukan
                </div>
                {onAdd && (
                    <AddSegmentDropdown onAdd={onAdd} />
                )}
            </div>
        </div>
        
        <ScrollArea className="flex-1 min-h-0">
            <div className="flex flex-col gap-2 p-3">
                {items.length === 0 ? (
                    <div className="text-center py-10 px-4 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        <List className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2 opacity-30" />
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{emptyMessage}</p>
                    </div>
                ) : (
                    items.map((seg, idx) => (
                        <SegmentItem
                            key={idx}
                            segment={seg}
                            index={idx}
                            onZoom={onZoom}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onMonitoring={onMonitoring}
                        />
                    ))
                )}
            </div>
        </ScrollArea>
    </div>
);
