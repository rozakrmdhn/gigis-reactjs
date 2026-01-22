import { useState } from "react";
import { ChevronDown, MapPin, Activity } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "~/components/ui/collapsible";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { MonitoringJalanResult, Segmen } from "~/features/monitoring/services/monitoring.service";

interface DataMonitoringItemProps {
    data: MonitoringJalanResult;
    index: number;
}

export function DataMonitoringItem({ data, index }: DataMonitoringItemProps) {
    const [isOpen, setIsOpen] = useState(false);
    const jalan = data.jalan;
    const summary = data.summary;
    const isMantap = summary.kondisi_jalan.mantap === "Mantap";

    return (
        <Card className={cn(
            "py-0 overflow-hidden transition-all duration-300 border-l-4",
            isMantap ? "border-l-emerald-500" : "border-l-rose-500",
            isOpen && "shadow-md ring-1 ring-slate-200"
        )}>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                    <div className="flex flex-col md:flex-row md:items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors gap-4">
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-muted-foreground bg-slate-100 px-1.5 py-0.5 rounded">
                                    #{index + 1}
                                </span>
                                <h3 className="font-semibold text-md text-slate-800 tracking-tight">
                                    {jalan.nama_ruas}
                                </h3>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span>{jalan.kecamatan}</span>
                                </div>
                                <span className="text-slate-300">•</span>
                                <span>{jalan.desa}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 justify-between md:justify-end">
                            <div className="text-right space-y-0.5">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Panjang</p>
                                <p className="font-mono font-medium">{jalan.panjang.toLocaleString()} m</p>
                            </div>

                            <div className="text-right space-y-0.5">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Kondisi</p>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "px-2.5 py-0.5 rounded-full font-semibold border-0",
                                        isMantap
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-rose-100 text-rose-700"
                                    )}
                                >
                                    {summary.kondisi_jalan.nama}
                                </Badge>
                            </div>

                            <Button variant="ghost" size="icon" className={cn("transition-transform duration-300", isOpen && "rotate-180")}>
                                <ChevronDown className="h-5 w-5 text-slate-400" />
                            </Button>
                        </div>
                    </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <div className="p-4 pt-0 space-y-6">
                        {/* Segment Grid Layout */}
                        <div className="grid md:grid-cols-2 gap-6 bg-slate-50/50 p-2 rounded-xl border border-dashed">
                            {/* Segmen Desa */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                                    <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-600">Segmen Desa</h4>
                                    <Badge variant="secondary" className="ml-auto text-xs">{data.segmen.desa.length} Segmen</Badge>
                                </div>
                                {data.segmen.desa.length > 0 ? (
                                    <div className="space-y-2">
                                        {data.segmen.desa.map((seg, idx) => (
                                            <SegmentCard key={idx} segment={seg} />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState label="Tidak ada data segmen desa" />
                                )}
                            </div>

                            {/* Segmen Kabupaten */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                    <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-600">Segmen Kabupaten</h4>
                                    <Badge variant="secondary" className="ml-auto text-xs">{data.segmen.kabupaten.length} Segmen</Badge>
                                </div>
                                {data.segmen.kabupaten.length > 0 ? (
                                    <div className="space-y-2">
                                        {data.segmen.kabupaten.map((seg, idx) => (
                                            <SegmentCard key={idx} segment={seg} />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState label="Tidak ada data segmen kabupaten" />
                                )}
                            </div>
                        </div>

                        {/* Summary Footer */}
                        <div className="flex flex-wrap gap-4 text-sm border-t pt-2">
                            <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Total Penanganan Fisik:</span>
                                <span className="font-mono font-medium text-emerald-600">
                                    {summary.fisik.total.toLocaleString()} m
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground border-l pl-4">Belum Tertangani:</span>
                                <span className="font-mono font-medium text-orange-600">
                                    {summary.panjang_belum_tertangani.toLocaleString()} m
                                </span>
                            </div>
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}

function SegmentCard({ segment }: { segment: Segmen }) {
    return (
        <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm hover:border-slate-300 transition-colors text-sm space-y-1.5">
            <div className="flex justify-between items-start">
                <span className="font-medium text-slate-700 clamp-1">{segment.perkerasan || "Tanpa Keterangan"}</span>
                <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                    {segment.panjang}m
                </span>
            </div>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>{segment.kondisi}</span>
                <span>{segment.lebar}m (L)</span>
            </div>
            {segment.tahun_pembangunan && (
                <div className="text-xs text-slate-400">
                    Thn: {segment.tahun_pembangunan}
                </div>
            )}
        </div>
    );
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="flex flex-col items-center justify-center p-6 text-center border-2 border-dashed rounded-lg border-slate-100 bg-slate-50/50">
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    );
}
