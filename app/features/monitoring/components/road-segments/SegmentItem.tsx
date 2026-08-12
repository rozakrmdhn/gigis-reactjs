import { RulerDimensionLineIcon } from "lucide-react";
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

    let conditionColor = "border-l-slate-400";
    let badgeClass = "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700";

    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes("baik")) {
        conditionColor = "border-l-emerald-500";
        badgeClass = "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30";
    } else if (lowerCondition.includes("sedang")) {
        conditionColor = "border-l-blue-500";
        badgeClass = "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30";
    } else if (lowerCondition.includes("rusak")) {
        conditionColor = "border-l-rose-500";
        badgeClass = "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30";
    }

    return (
        <div key={index} className={cn(
            "flex flex-col gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all border-l-4",
            conditionColor
        )}>
            <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                    <div className="flex items-center gap-1 flex-wrap">
                        <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0 h-4 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                            {props.jenis_perkerasan || 'Tanpa Perkerasan'}
                        </Badge>
                        <Badge className={cn("text-[9px] font-bold px-1.5 py-0 h-4 uppercase border leading-none shadow-none", badgeClass)}>
                            {condition}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        <span>Thn: <span className="font-bold text-slate-700 dark:text-slate-200">{year}</span></span>
                    </div>
                </div>
                
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-800/60 shrink-0">
                    <RulerDimensionLineIcon className="w-3.5 h-3.5 text-amber-500" />
                    {formatNumber(props.panjang)} m
                </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <SegmentActions 
                    segment={segment}
                    isBaseJalan={isBase}
                    onZoom={onZoom}
                    onEdit={onEdit}
                    onMonitoring={onMonitoring}
                    onDelete={onDelete}
                />
            </div>
        </div>
    );
};
