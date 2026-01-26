import React from 'react';
import { type MonitoringJalanResult } from "~/features/monitoring/services/monitoring.service";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

interface MonitoringListProps {
    data: MonitoringJalanResult[];
    onSelectJalan: (id: string) => void;
    selectedId?: string | null;
    isLoading?: boolean;
}

export const MonitoringList = React.memo(({ data, onSelectJalan, selectedId, isLoading }: MonitoringListProps) => {
    if (isLoading) {
        return (
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex flex-col gap-3 p-4 rounded-xl border border-slate-100 bg-white/50 animate-pulse">
                        <div className="flex justify-between items-start">
                            <Skeleton className="h-5 w-2/3 rounded-lg" />
                            <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                        <div className="flex gap-2">
                            <Skeleton className="h-4 w-20 rounded-md" />
                            <Skeleton className="h-4 w-24 rounded-md" />
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-1">
                            <Skeleton className="h-10 rounded-xl" />
                            <Skeleton className="h-10 rounded-xl" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed bg-slate-50/50">
                <p className="text-sm text-muted-foreground">Tidak ada data jalan ditemukan.</p>
            </div>
        );
    }

    const formatNumber = (num: number) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="space-y-1">
            {data.map((item) => {
                const isSelected = item.jalan.id === selectedId;
                return (
                    <button
                        key={item.jalan.id}
                        id={`road-${item.jalan.id}`}
                        className={cn(
                            "group relative flex flex-col gap-0 rounded-xl border cursor-pointer text-[13px] sm:text-sm text-left w-full overflow-hidden",
                            "transition-all active:scale-[0.98]",
                            "bg-gradient-to-br from-white via-white/80 to-slate-50",
                            "hover:shadow-lg hover:border-blue-200 transition-all duration-300",
                            isSelected
                                ? "border-blue-500 bg-blue-50/50 ring-1 sm:ring-2 ring-blue-500/20 shadow-xl z-10 sm:scale-[1.02] sm:-translate-y-0.5"
                                : "border-slate-100"
                        )}
                        onClick={() => onSelectJalan(item.jalan.id)}
                    >
                        <div className="flex flex-col gap-2 p-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 font-medium min-w-0">
                                    <span className={cn(
                                        "line-clamp-1 transition-colors text-sm sm:text-base",
                                        isSelected ? "text-primary font-bold" : "text-slate-900 group-hover:text-primary font-semibold"
                                    )}>
                                        {item.jalan.nama_ruas}
                                    </span>
                                </div>
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        "shrink-0 text-[10px] sm:text-[11px] px-1.5 h-5 font-normal capitalize bg-slate-100 text-slate-600 border border-slate-200",
                                        (item.summary?.kondisi_jalan?.nama || item.jalan.kondisi).toLowerCase() === 'baik' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                                        (item.summary?.kondisi_jalan?.nama || item.jalan.kondisi).toLowerCase().includes('rusak') && "bg-rose-50 text-rose-700 border-rose-200",
                                        (item.summary?.kondisi_jalan?.nama || item.jalan.kondisi).toLowerCase() === 'sedang' && "bg-yellow-50 text-yellow-700 border-yellow-200"
                                    )}
                                >
                                    {item.summary?.kondisi_jalan?.nama || item.jalan.kondisi}
                                </Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/80 font-medium">
                                <span className="flex items-center gap-1">
                                    {item.jalan.desa}
                                </span>
                                <span className="h-0.5 w-0.5 rounded-full bg-slate-300 hidden sm:block" />
                                <span>{item.jalan.kecamatan}</span>
                            </div>
                        </div>

                        <div className="w-full px-3 pb-3">
                            <div className={cn(
                                "grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] uppercase font-bold p-2.5 rounded-xl border transition-all",
                                isSelected
                                    ? "bg-white/80 border-blue-200 text-blue-700 shadow-sm"
                                    : "bg-slate-50 border-slate-100 text-slate-500 group-hover:bg-white group-hover:border-slate-200"
                            )}>
                                <div className="flex justify-between items-center min-w-0">
                                    <span className="opacity-70 shrink-0">Panjang</span>
                                    <span className="text-slate-600 truncate ml-1">{formatNumber(item.jalan.panjang)}m</span>
                                </div>
                                <div className="flex justify-between items-center border-l pl-3 border-slate-200/50 min-w-0">
                                    <span className="opacity-70 shrink-0">Lebar</span>
                                    <span className="text-slate-600 truncate ml-1">{item.jalan.lebar}m</span>
                                </div>
                            </div>
                        </div>

                        {item.summary && (
                            <div className={cn(
                                "border-t p-3 space-y-2.5 w-full transition-colors",
                                isSelected ? "border-blue-200/50 bg-blue-50/20" : "border-slate-100 bg-slate-50/30"
                            )}>
                                <div className="flex flex-row items-center justify-between text-[10px] gap-2 w-full">
                                    <div className="text-muted-foreground font-bold flex items-center gap-1.5 min-w-0 flex-1">
                                        <div className="w-1.5 h-1.5 shrink-0 rounded-full bg-emerald-500" />
                                        <span className="truncate">Dibangun: {formatNumber(item.summary.fisik.total)}m</span>
                                    </div>
                                    <div className="text-muted-foreground font-bold flex items-center gap-1.5 min-w-0 flex-1 justify-end">
                                        <div className="w-1.5 h-1.5 shrink-0 rounded-full bg-slate-300" />
                                        <span className="truncate">Sisa: {formatNumber(item.summary.panjang_belum_tertangani)}m</span>
                                    </div>
                                </div>

                                <div className="h-1.5 w-full bg-slate-200/50 rounded-full overflow-hidden flex shadow-inner border border-slate-200/30">
                                    <div
                                        className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all duration-700 ease-out"
                                        style={{
                                            width: `${Math.min(100, (item.summary.fisik.total / item.summary.total_panjang_jalan) * 100)}%`
                                        }}
                                    />
                                </div>

                                <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-tight italic">
                                    <span className="flex items-center gap-1">
                                        {(item.segmen.desa?.length || 0) + (item.segmen.kabupaten?.length || 0)} <span className="text-[8px] opacity-70">Segmen</span>
                                    </span>
                                    <span>{Math.round((item.summary.fisik.total / item.summary.total_panjang_jalan) * 100)}% Selesai</span>
                                </div>

                                {item.summary.kondisi_jalan && (
                                    <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-dashed border-slate-200">
                                        <div className={cn(
                                            "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight",
                                            item.summary.kondisi_jalan.nama === 'BAIK' ? "bg-emerald-50 text-emerald-700" :
                                                item.summary.kondisi_jalan.nama === 'SEDANG' ? "bg-yellow-50 text-yellow-700" :
                                                    "bg-red-50 text-red-700"
                                        )}>
                                            {item.summary.kondisi_jalan.nama}
                                        </div>
                                        <div className={cn(
                                            "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight",
                                            item.summary.kondisi_jalan.mantap === 'Mantap' ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"
                                        )}>
                                            {item.summary.kondisi_jalan.mantap}
                                        </div>
                                        <div className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 text-[10px] font-medium border border-slate-100">
                                            {item.summary.kondisi_jalan.persentase_mantap}%
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* {item.segmen && item.segmen.length > 0 ? (
                            <div className="flex gap-2 overflow-x-auto pt-1 pb-1.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent 
                                [&::-webkit-scrollbar]:h-1
                                [&::-webkit-scrollbar-thumb]:bg-slate-200/80
                                [&::-webkit-scrollbar-thumb]:rounded-full
                                [&::-webkit-scrollbar-track]:bg-transparent">
                                {item.segmen.map((seg, idx) => (
                                    <span key={idx} className="flex-shrink-0 inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 border border-slate-200">
                                        <span className="font-medium">{seg.tahun_pembangunan}</span>
                                        <span className="opacity-50 mx-0.5">|</span>
                                        <span>{seg.jenis_perkerasan}</span>
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div className="pt-1 pb-1">
                                <span className="text-[10px] italic text-muted-foreground/70">
                                    Belum ada riwayat pembangunan
                                </span>
                            </div>
                        )} */}
                    </button>
                );
            })}
        </div>
    );
});

MonitoringList.displayName = "MonitoringList";
