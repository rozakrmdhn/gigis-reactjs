import { X, Calendar, MapPin, Ruler, HardHat, Info } from "lucide-react";
import { type MonitoringJalanResult, type Segmen } from "~/features/monitoring/services/monitoring.service";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { Separator } from "~/components/ui/separator";

interface ConstructionHistoryPanelProps {
    data: MonitoringJalanResult | null;
    isVisible: boolean;
    onClose: () => void;
}

export function ConstructionHistoryPanel({ data, isVisible, onClose }: ConstructionHistoryPanelProps) {
    if (!data) return null;

    const { jalan, segmen, summary } = data;

    // Combine desa and kabupaten segments with source tag
    const allSegments = [
        ...(segmen.desa || []).map(s => ({ ...s, _source: 'desa' })),
        ...(segmen.kabupaten || []).map(s => ({ ...s, _source: 'kabupaten' }))
    ];

    // Group segments by year
    const groupedSegments = allSegments.reduce((acc, curr) => {
        const year = curr.tahun_pembangunan || "Tidak Diketahui";
        if (!acc[year]) acc[year] = [];
        acc[year].push(curr);
        return acc;
    }, {} as Record<string | number, (Segmen & { _source: string })[]>);

    // Sort years descending
    const sortedYears = Object.keys(groupedSegments).sort((a, b) => {
        if (a === "Tidak Diketahui") return 1;
        if (b === "Tidak Diketahui") return -1;
        return Number(b) - Number(a);
    });

    const formatNumber = (num: number) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div
            className={cn(
                "absolute inset-y-0 right-0 z-50 w-full sm:w-[350px] bg-background/80 backdrop-blur-xl border-l shadow-xl transition-transform duration-500 ease-in-out transform overflow-hidden",
                isVisible ? "translate-x-0" : "translate-x-full"
            )}
        >
            <div className="flex flex-col h-full min-h-0">
                {/* Header */}
                <div className="p-4 border-b bg-linear-to-br from-emerald-500/10 to-transparent">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-1">
                            <span className="text-sm w-12 font-bold text-monospace text-muted-foreground">No. {jalan.kode_ruas}</span>
                            <h2 className="text-md font-bold text-slate-900 tracking-tight">
                                {jalan.nama_ruas}</h2>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/50">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                    <div className="mb-3">
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                            {jalan.desa}, {jalan.kecamatan}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/50 backdrop-blur-sm p-3 rounded-xl border border-white/20 shadow-sm">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 mb-1.5">
                                <Ruler className="w-3 h-3" /> Panjang Total
                            </span>
                            <span className="text-base font-bold text-slate-700">{formatNumber(jalan.panjang)} m</span>
                        </div>
                        <div className="bg-white/50 backdrop-blur-sm p-3 rounded-xl border border-white/20 shadow-sm">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 mb-1.5">
                                <HardHat className="w-3 h-3" /> Lebar Ruas
                            </span>
                            <span className="text-base font-bold text-slate-700">{jalan.lebar} m</span>
                        </div>
                    </div>

                    {summary && (
                        <div className="mt-4 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-semibold text-emerald-700">Progres Pembangunan</span>
                                <span className="text-xs font-bold text-emerald-700">
                                    {Math.round((summary.fisik.total / summary.total_panjang_jalan) * 100)}%
                                </span>
                            </div>
                            <div className="h-2 w-full bg-slate-200/50 rounded-full overflow-hidden flex">
                                <div
                                    className="h-full bg-emerald-500 transition-all duration-700 ease-out"
                                    style={{ width: `${Math.min(100, (summary.fisik.total / summary.total_panjang_jalan) * 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between mt-2 text-[10px] text-emerald-600/80 font-medium">
                                <span>{formatNumber(summary.fisik.total)}m Terbangun</span>
                                <span>{allSegments.length} Segmen</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent">
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                                <Calendar className="w-4 h-4" />
                            </div>
                            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Riwayat Pembangunan</h3>
                        </div>

                        {sortedYears.length > 0 ? (
                            <div className="relative space-y-8 before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-linear-to-b before:from-emerald-500 before:via-emerald-500/40 before:to-transparent">
                                {sortedYears.map((year) => (
                                    <div key={year} className="relative pl-10">
                                        <div className="absolute left-0 top-1 transition-transform group-hover:scale-110">
                                            <div className="flex items-center justify-center w-8 h-8 bg-emerald-500 rounded-full text-white shadow-lg ring-4 ring-white">
                                                <span className="text-[10px] font-bold">{year === "Tidak Diketahui" ? "?" : year}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {groupedSegments[year].map((seg, idx) => {
                                                const isKabupaten = seg._source === 'kabupaten';
                                                const baseColor = isKabupaten ? "blue" : "emerald";

                                                return (
                                                    <div
                                                        key={idx}
                                                        className={cn(
                                                            "group bg-slate-50 border p-3 rounded-2xl transition-all duration-300",
                                                            isKabupaten
                                                                ? "border-blue-100/60 hover:bg-blue-50/30 hover:border-blue-500/30 hover:shadow-blue-100"
                                                                : "border-emerald-100/60 hover:bg-emerald-50/30 hover:border-emerald-500/30 hover:shadow-emerald-100",
                                                            "hover:shadow-xl"
                                                        )}
                                                    >
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div className="flex flex-wrap gap-1">
                                                                <Badge variant="outline" className={cn(
                                                                    "bg-white px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-tight",
                                                                    isKabupaten ? "border-blue-100 text-blue-700" : "border-emerald-100 text-emerald-700"
                                                                )}>
                                                                    {seg.jenis_perkerasan || seg.perkerasan}
                                                                </Badge>
                                                                <Badge variant="secondary" className={cn(
                                                                    "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                                                                    isKabupaten ? "bg-blue-100 text-blue-600 border-blue-200" : "bg-emerald-100 text-emerald-600 border-emerald-200"
                                                                )}>
                                                                    {isKabupaten ? 'Kabupaten' : 'Desa'}
                                                                </Badge>
                                                            </div>
                                                            <Badge
                                                                className={cn(
                                                                    "text-[10px] px-2 h-5 font-bold uppercase rounded-md",
                                                                    seg.kondisi.toLowerCase() === 'baik'
                                                                        ? (isKabupaten ? "bg-blue-500 text-white" : "bg-emerald-500 text-white")
                                                                        : seg.kondisi.toLowerCase().includes('rusak')
                                                                            ? "bg-rose-500 text-white"
                                                                            : "bg-amber-500 text-white"
                                                                )}
                                                            >
                                                                {seg.kondisi}
                                                            </Badge>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-y-2 text-xs">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-slate-400 font-medium text-[10px] uppercase">Panjang</span>
                                                                <span className="font-bold text-slate-700">{formatNumber(seg.panjang)} m</span>
                                                            </div>
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-slate-400 font-medium text-[10px] uppercase">Lebar</span>
                                                                <span className="font-bold text-slate-700">{seg.lebar} m</span>
                                                            </div>
                                                        </div>
                                                        <span className="block text-[10px] pt-1 text-slate-400">{seg.id}</span>

                                                        {seg.verifikator && (
                                                            <div className="mt-3 pt-3 border-t border-slate-200/50 flex items-center gap-2 text-[10px]">
                                                                <div className={cn(
                                                                    "w-5 h-5 rounded-full flex items-center justify-center",
                                                                    isKabupaten ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"
                                                                )}>
                                                                    <HardHat className="w-3 h-3" />
                                                                </div>
                                                                <span className="text-slate-400 uppercase font-medium">Verifikator:</span>
                                                                <span className="text-slate-600 font-bold">{seg.verifikator}</span>
                                                            </div>
                                                        )}

                                                        {seg.sumber_data && (
                                                            <div className="mt-2 p-2 rounded-lg bg-amber-50/50 border border-amber-100/50 text-[10px] text-slate-600 italic">
                                                                <Info className="inline w-3 h-3 mr-1 text-amber-500 shrink-0" />
                                                                {seg.sumber_data}
                                                                <span className="block text-[10px] text-slate-400">Update: {seg.created_at ? new Date(seg.created_at).toLocaleDateString() : '-'}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                                <div className="p-4 rounded-full bg-slate-100 mb-3">
                                    <Calendar className="w-8 h-8 text-slate-400" />
                                </div>
                                <p className="text-sm font-medium text-slate-500">Belum ada riwayat pembangunan</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Info */}
                <div className="p-4 border-t bg-slate-50/50 text-[10px] text-muted-foreground">
                    <div className="flex justify-between items-center">
                        <span>Sumber Data: {jalan.sumber_data}</span>
                        <span>Update: {jalan.created_at ? new Date(jalan.created_at).toLocaleDateString() : '-'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
