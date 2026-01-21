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

export function MonitoringList({ data, onSelectJalan, selectedId, isLoading }: MonitoringListProps) {
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
                        className={cn(
                            "group relative flex flex-col gap-2 rounded-lg border cursor-pointer px-3 py-3 text-sm text-left w-full",
                            "transition-all active:scale-[0.98]",
                            "bg-gradient-to-br from-white/80 via-white/60 to-emerald-50/30 backdrop-blur",
                            "hover:shadow-md hover:from-white hover:to-emerald-100/40",
                            isSelected
                                ? "border-emerald-500/30 ring-1 ring-emerald-500/20 shadow-md"
                                : "border-transparent"
                        )}
                        onClick={() => onSelectJalan(item.jalan.id)}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 font-medium">
                                <span className={cn(
                                    "line-clamp-1 transition-colors",
                                    isSelected ? "text-primary font-semibold" : "text-slate-900 group-hover:text-primary"
                                )}>
                                    {item.jalan.nama_ruas}
                                </span>
                            </div>
                            <Badge
                                variant="secondary"
                                className={cn(
                                    "shrink-0 text-[10px] px-1.5 h-5 font-normal capitalize bg-slate-100 text-slate-600 border border-slate-200",
                                    (item.summary?.kondisi_jalan?.nama || item.jalan.kondisi).toLowerCase() === 'baik' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                                    (item.summary?.kondisi_jalan?.nama || item.jalan.kondisi).toLowerCase().includes('rusak') && "bg-rose-50 text-rose-700 border-rose-200",
                                    (item.summary?.kondisi_jalan?.nama || item.jalan.kondisi).toLowerCase() === 'sedang' && "bg-yellow-50 text-yellow-700 border-yellow-200"
                                )}
                            >
                                {item.summary?.kondisi_jalan?.nama || item.jalan.kondisi}
                            </Badge>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                {item.jalan.desa}
                            </span>
                            <span className="h-0.5 w-0.5 rounded-full bg-slate-300" />
                            <span>{item.jalan.kecamatan}</span>
                        </div>

                        <div className={cn(
                            "grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1 p-2 rounded border transition-colors",
                            isSelected
                                ? "bg-white border-primary/10"
                                : "bg-slate-50/50 border-slate-100 group-hover:bg-white group-hover:border-slate-200"
                        )}>
                            <div className="flex justify-between">
                                <span className="opacity-70">Panjang</span>
                                <span className="font-medium text-slate-700">{formatNumber(item.jalan.panjang)} m</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="opacity-70">Lebar</span>
                                <span className="font-medium text-slate-700">{item.jalan.lebar} m</span>
                            </div>
                        </div>

                        {item.summary && (
                            <div className="mt-2 space-y-1.5 border-t pt-2">
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Terbangun: {formatNumber(item.summary.total_panjang_segmen)} m
                                    </span>
                                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                        Sisa: {formatNumber(item.summary.total_selisih_panjang)} m
                                    </span>
                                </div>

                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                                    <div
                                        className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                                        style={{
                                            width: `${Math.min(100, (item.summary.total_panjang_segmen / item.summary.total_panjang_jalan) * 100)}%`
                                        }}
                                    />
                                </div>

                                <div className="flex justify-between text-[10px] text-muted-foreground/80 italic">
                                    <span>{item.summary.total_segmens} Segmen</span>
                                    <span>{Math.round((item.summary.total_panjang_segmen / item.summary.total_panjang_jalan) * 100)}% Selesai</span>
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
}
