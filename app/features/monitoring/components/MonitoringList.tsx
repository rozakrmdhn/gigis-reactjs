import React from 'react';
import { type MonitoringJalanResult } from "~/features/monitoring/services/monitoring.service";
import { Badge } from "~/components/ui/badge";
import { Checkbox } from "~/components/ui/checkbox";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

interface MonitoringListProps {
    data: MonitoringJalanResult[];
    onSelectJalan: (id: string) => void;
    selectedId?: string | null;
    isLoading?: boolean;
    checkedIds?: string[];
    onToggleCheck?: (id: string, checked: boolean) => void;
}

interface MonitoringListItemProps {
    item: MonitoringJalanResult;
    isSelected: boolean;
    isChecked: boolean;
    onSelect: (id: string) => void;
    onToggleCheck: (id: string, checked: boolean) => void;
}

const MonitoringListItem = React.memo(({ item, isSelected, isChecked, onSelect, onToggleCheck }: MonitoringListItemProps) => {
    const formatNumber = (val: any) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (typeof num !== 'number' || isNaN(num)) return '0,00';
        return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handleCheckClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const handleCheckboxChange = (checked: boolean) => {
        onToggleCheck(item.jalan.id, checked);
    };

    const kondisi = (item.summary?.kondisi_jalan?.nama || item.jalan.kondisi || "Unknown").toLowerCase();
    let conditionColor = "border-l-slate-400";
    let badgeClass = "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700";

    if (kondisi.includes("baik")) {
        conditionColor = "border-l-emerald-500";
        badgeClass = "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30";
    } else if (kondisi.includes("sedang")) {
        conditionColor = "border-l-blue-500";
        badgeClass = "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30";
    } else if (kondisi.includes("rusak")) {
        conditionColor = "border-l-rose-500";
        badgeClass = "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30";
    }

    const kemantapan = item.summary?.kondisi_jalan?.persentase_mantap ?? null;

    return (
        <div
            key={item.jalan.id}
            id={`road-${item.jalan.id}`}
            className={cn(
                "group relative flex flex-col gap-2 p-3 rounded-xl border cursor-pointer text-xs w-full transition-all duration-250 border-l-4",
                "bg-white dark:bg-slate-900 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700",
                isSelected
                    ? "border-blue-500 dark:border-blue-600 bg-blue-50/20 dark:bg-blue-900/10 ring-1 ring-blue-500/20 shadow-md"
                    : "border-slate-200 dark:border-slate-800 shadow-sm",
                conditionColor
            )}
            onClick={() => onSelect(item.jalan.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(item.jalan.id);
                }
            }}
        >
            {/* Header Section */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div onClick={handleCheckClick} className="shrink-0 flex items-center">
                        <Checkbox
                            checked={isChecked}
                            onCheckedChange={handleCheckboxChange}
                            className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 transition-all cursor-pointer"
                        />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className={cn(
                            "line-clamp-1 transition-colors text-xs tracking-tight",
                            isSelected ? "font-bold text-blue-700 dark:text-blue-400" : "text-slate-800 dark:text-slate-200 font-semibold"
                        )}>
                            {item.jalan.nama_ruas}
                        </span>
                        <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                            <span>No. {item.jalan.kode_ruas}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                            <span className="truncate">{item.jalan.desa}</span>
                        </div>
                    </div>
                </div>

                <Badge className={cn("text-[9px] font-bold px-1.5 py-0 h-4 uppercase border leading-none shadow-none shrink-0", badgeClass)}>
                    {item.summary?.kondisi_jalan?.nama || item.jalan.kondisi}
                </Badge>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-500 dark:text-slate-400">
                <div className="flex flex-col">
                    <span className="text-[8px] text-slate-400 uppercase tracking-tight font-medium">Panjang</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                        {formatNumber(item.summary?.total_panjang_jalan || item.jalan.panjang)} m
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[8px] text-slate-400 uppercase tracking-tight font-medium">Lebar</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                        {formatNumber(item.jalan.lebar)} m
                    </span>
                </div>
                {kemantapan !== null && (
                    <div className="flex flex-col">
                        <span className="text-[8px] text-slate-400 uppercase tracking-tight font-medium">Kemantapan</span>
                        <span className={cn(
                            "font-bold mt-0.5",
                            kemantapan > 80 ? "text-emerald-600 dark:text-emerald-400" :
                            kemantapan > 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
                        )}>
                            {kemantapan}%
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
});

MonitoringListItem.displayName = "MonitoringListItem";

export const MonitoringList = React.memo(({ data, onSelectJalan, selectedId, isLoading, checkedIds, onToggleCheck }: MonitoringListProps) => {
    if (isLoading) {
        return (
            <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex flex-col gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 animate-pulse border-l-4 border-l-slate-200 dark:border-l-slate-800">
                        <div className="flex justify-between items-start">
                            <Skeleton className="h-4 w-2/3 rounded dark:bg-slate-800" />
                            <Skeleton className="h-4 w-12 rounded-full dark:bg-slate-800" />
                        </div>
                        <div className="flex gap-2 mt-1">
                            <Skeleton className="h-3 w-12 rounded dark:bg-slate-800" />
                            <Skeleton className="h-3 w-16 rounded dark:bg-slate-800" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                <p className="text-xs text-muted-foreground dark:text-slate-400 font-bold uppercase tracking-wider">Tidak ada data jalan ditemukan.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {data.map((item) => (
                <MonitoringListItem
                    key={item.jalan.id}
                    item={item}
                    isSelected={item.jalan.id === selectedId}
                    isChecked={checkedIds?.includes(item.jalan.id) ?? false}
                    onSelect={onSelectJalan}
                    onToggleCheck={onToggleCheck ?? (() => { })}
                />
            ))}
        </div>
    );
});

MonitoringList.displayName = "MonitoringList";
