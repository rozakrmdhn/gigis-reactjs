import React from 'react';
import { type MonitoringJalanResult } from "~/features/monitoring/services/monitoring.service";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Checkbox } from "~/components/ui/checkbox";
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

    return (
        <div
            key={item.jalan.id}
            id={`road-${item.jalan.id}`}
            className={cn(
                "group relative flex flex-col gap-0 rounded-2xl border cursor-pointer text-[13px] sm:text-sm text-left w-full overflow-hidden",
                "transition-all duration-300 active:scale-[0.98]",
                "bg-white dark:bg-slate-950",
                "bg-gradient-to-br from-white via-white/80 to-slate-50 dark:from-slate-900/40 dark:via-slate-950 dark:to-slate-950",
                "hover:shadow-2xl hover:border-blue-300/50 dark:hover:border-blue-500/30",
                isSelected
                    ? "border-blue-500 dark:border-blue-600 bg-blue-50/40 dark:bg-blue-600/5 ring-1 sm:ring-4 ring-blue-500/10 shadow-2xl z-10 sm:scale-[1.01]"
                    : "border-slate-200/60 dark:border-slate-800/60 shadow-sm"
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
            <div className="flex flex-col gap-2 p-4 pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div onClick={handleCheckClick} className="shrink-0">
                            <Checkbox
                                checked={isChecked}
                                onCheckedChange={handleCheckboxChange}
                                className="h-4.5 w-4.5 rounded-md border-slate-300 dark:border-slate-700 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 transition-all duration-300"
                            />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className={cn(
                                "line-clamp-1 transition-colors text-[14px] tracking-tight",
                                isSelected ? "font-black text-blue-700 dark:text-blue-400" : "text-slate-900 dark:text-slate-100 font-bold"
                            )}>
                                {item.jalan.nama_ruas}
                            </span>
                            <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-0.5">
                                <span>No. {item.jalan.kode_ruas}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                <span className="truncate">{item.jalan.desa}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 items-end shrink-0">
                        <Badge
                            className={cn(
                                "text-[9px] px-2 h-5 font-black uppercase tracking-wider rounded-lg border shadow-sm",
                                (item.summary?.kondisi_jalan?.nama || item.jalan.kondisi).toLowerCase() === 'baik'
                                    ? "bg-emerald-500 text-white border-emerald-400 dark:border-emerald-600 shadow-emerald-200/50 dark:shadow-none"
                                    : (item.summary?.kondisi_jalan?.nama || item.jalan.kondisi).toLowerCase() === 'sedang'
                                        ? "bg-amber-500 text-white border-amber-400 dark:border-amber-600 shadow-amber-200/50 dark:shadow-none"
                                        : "bg-rose-500 text-white border-rose-400 dark:border-rose-600 shadow-rose-200/50 dark:shadow-none"
                            )}
                        >
                            {item.summary?.kondisi_jalan?.nama || item.jalan.kondisi}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="px-4 pb-3">
                <div className={cn(
                    "grid grid-cols-2 gap-px rounded-xl border overflow-hidden bg-slate-200/50 dark:bg-slate-800/50",
                    isSelected ? "border-blue-200/50 dark:border-blue-500/20" : "border-slate-100 dark:border-slate-800"
                )}>
                    <div className="bg-white dark:bg-slate-900/50 p-2.5 flex flex-col gap-0.5">
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-tight">Panjang Total</span>
                        <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 leading-none">
                            {formatNumber(item.summary?.total_panjang_jalan || item.jalan.panjang)} <span className="text-[10px] font-medium opacity-60">m</span>
                        </span>
                    </div>
                    <div className="bg-white dark:bg-slate-900/50 p-2.5 flex flex-col gap-0.5">
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-tight">Lebar Ruas</span>
                        <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 leading-none">
                            {formatNumber(item.jalan.lebar)} <span className="text-[10px] font-medium opacity-60">m</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Summary Dashboard Section */}
            {item.summary && (
                <div className={cn(
                    "mt-auto border-t p-4 pt-3 space-y-4 bg-gradient-to-b transition-colors",
                    isSelected
                        ? "border-blue-100 dark:border-blue-500/20 from-blue-50/50 to-white dark:from-blue-600/5 dark:to-slate-950"
                        : "border-slate-100 dark:border-slate-800 from-slate-50/50 to-white dark:from-slate-900/40 dark:to-slate-950"
                )}>
                    {/* Stability and Physical Completion Header */}
                    <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest mb-1">Kemantapan</span>
                            <div className="flex items-baseline gap-1">
                                <span className={cn(
                                    "text-xl font-black leading-none tracking-tighter",
                                    item.summary.kondisi_jalan.persentase_mantap > 80 ? "text-emerald-600 dark:text-emerald-400" :
                                        item.summary.kondisi_jalan.persentase_mantap > 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
                                )}>
                                    {item.summary.kondisi_jalan.persentase_mantap}%
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest text-right mb-1">Fisik Selesai</span>
                            <span className="text-sm font-black text-slate-700 dark:text-slate-200 leading-none">
                                {formatNumber(item.summary.kondisi_jalan.panjang_belum_mantap)} <span className="text-[10px] font-medium opacity-60 italic text-slate-400">/ {formatNumber(item.summary.total_panjang_jalan)}m</span>
                            </span>
                        </div>
                    </div>

                    {/* Condition Distribution Multi-Bar */}
                    <div className="space-y-1.5">
                        <div className="h-2 w-full flex rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
                            <div
                                className="h-full bg-emerald-500 transition-all duration-700 ease-out shadow-[inset_0_0_8px_rgba(255,255,255,0.2)]"
                                style={{ width: `${item.summary.kondisi_jalan.persentase_per_kondisi.baik}%` }}
                            />
                            <div
                                className="h-full bg-amber-400 transition-all duration-700 ease-out shadow-[inset_0_0_8px_rgba(255,255,255,0.1)]"
                                style={{ width: `${item.summary.kondisi_jalan.persentase_per_kondisi.sedang}%` }}
                            />
                            <div
                                className="h-full bg-orange-500 transition-all duration-700 ease-out shadow-[inset_0_0_8px_rgba(255,255,255,0.1)]"
                                style={{ width: `${item.summary.kondisi_jalan.persentase_per_kondisi['rusak ringan']}%` }}
                            />
                            <div
                                className="h-full bg-rose-600 transition-all duration-700 ease-out shadow-[inset_0_0_8px_rgba(255,255,255,0.2)]"
                                style={{ width: `${item.summary.kondisi_jalan.persentase_per_kondisi['rusak berat']}%` }}
                            />
                        </div>

                        <div className="flex justify-between text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Baik
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Sedang
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" /> Rusak
                            </span>
                            <span className="ml-auto italic opacity-70">
                                {Math.round((item.summary.fisik.total / item.summary.total_panjang_jalan) * 100)}% Progress
                            </span>
                        </div>
                    </div>

                    {/* Footer Info: Segments & Ownership */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                <span className="text-slate-700 dark:text-slate-300">{(item.segmen.desa?.length || 0) + (item.segmen.kabupaten?.length || 0)}</span>
                                <span className="opacity-60 uppercase tracking-tighter">Segmen</span>
                            </div>
                            <span className="w-px h-3 bg-slate-200 dark:bg-slate-800" />
                            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                <span className="text-slate-700 dark:text-slate-300">{formatNumber(item.summary.panjang_belum_tertangani)}m</span>
                                <span className="opacity-60 uppercase tracking-tighter text-rose-500/80">Sisa</span>
                            </div>
                            {item.summary?.kondisi_jalan?.mantap && (
                                <span className={cn(
                                    "text-[9px] font-bold uppercase tracking-widest px-1",
                                    item.summary.kondisi_jalan.mantap === 'Mantap' ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"
                                )}>
                                    {item.summary.kondisi_jalan.mantap}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
});

export const MonitoringList = React.memo(({ data, onSelectJalan, selectedId, isLoading, checkedIds, onToggleCheck }: MonitoringListProps) => {
    if (isLoading) {
        return (
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex flex-col gap-3 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 animate-pulse">
                        <div className="flex justify-between items-start">
                            <Skeleton className="h-5 w-2/3 rounded-lg dark:bg-slate-800" />
                            <Skeleton className="h-5 w-16 rounded-full dark:bg-slate-800" />
                        </div>
                        <div className="flex gap-2">
                            <Skeleton className="h-4 w-20 rounded-md dark:bg-slate-800" />
                            <Skeleton className="h-4 w-24 rounded-md dark:bg-slate-800" />
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-1">
                            <Skeleton className="h-10 rounded-xl dark:bg-slate-800" />
                            <Skeleton className="h-10 rounded-xl dark:bg-slate-800" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                <p className="text-sm text-muted-foreground dark:text-slate-400">Tidak ada data jalan ditemukan.</p>
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
