import { Search, RulerDimensionLineIcon, Info } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { SegmentActions } from "./SegmentActions";

export const formatNumber = (num: number) =>
    typeof num === 'number' ? num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

interface SegmentItemProps {
    segment: any;
    index: number;
    onZoom: (feature: any) => void;
    onEdit: (feature: any) => void;
    onDelete?: (feature: any) => void;
    onMonitoring?: (feature: any) => void;
}

export const SegmentItem = ({ segment, index, onZoom, onEdit, onDelete, onMonitoring }: SegmentItemProps) => {
    const props = segment.getProperties ? segment.getProperties() : segment;
    const condition = props.kondisi || "Unknown";
    const year = props.tahun_pembangunan || "-";
    const isBase = props.is_base_jalan;

    let cardClass = "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900";
    let badgeClass = "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700";
    
    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes("baik")) {
        cardClass = "border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-900/10";
        badgeClass = "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
    } else if (lowerCondition.includes("sedang")) {
        cardClass = "border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10";
        badgeClass = "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    } else if (lowerCondition.includes("rusak")) {
        cardClass = "border-rose-100 dark:border-rose-900/30 bg-rose-50/30 dark:bg-rose-900/10";
        badgeClass = "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800";
    }

    return (
        <div key={index} className={cn(
            "flex flex-col gap-2 p-3 rounded-xl border shadow-sm hover:shadow-md transition-all group",
            cardClass
        )}>
            <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[9px] uppercase font-black tracking-wider px-1.5 py-0 h-4 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
                            {props.jenis_perkerasan || 'Tanpa Perkerasan'}
                        </Badge>
                        <Badge className={cn("text-[9px] font-black px-1.5 py-0 h-4 uppercase border leading-none shadow-none", badgeClass)}>
                            {condition}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                         <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                            Thn: <span className="font-bold text-slate-700 dark:text-slate-200">{year}</span>
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <RulerDimensionLineIcon className="w-3 h-3 text-amber-500" />
                        {formatNumber(props.panjang)} m
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        onClick={() => onZoom(segment)}
                    >
                        <Search className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <SegmentActions 
                    segment={segment}
                    isBaseJalan={isBase}
                    onEdit={onEdit}
                    onMonitoring={onMonitoring}
                    onDelete={onDelete}
                />
            </div>
        </div>
    );
};
