import { useEffect, useState } from "react";
import { MonitoringSidebar } from "./MonitoringSidebar";
import { monitoringService, type MonitoringJalanResult } from "../services/monitoring.service";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Search, MapPin, PencilLine, Plus } from "lucide-react";
import { cn } from "~/lib/utils";

interface DrawSidebarProps {
    onSelectRoad: (road: MonitoringJalanResult) => void;
    selectedRoad: MonitoringJalanResult | null;
    onStartDraw: () => void;
    isDrawing: boolean;
    isOpen?: boolean;
    onToggle?: (isOpen: boolean) => void;
}

export function DrawSidebar({
    onSelectRoad,
    selectedRoad,
    onStartDraw,
    isDrawing,
    isOpen,
    onToggle
}: DrawSidebarProps) {
    const [roads, setRoads] = useState<MonitoringJalanResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchRoads = async () => {
            setLoading(true);
            const response = await monitoringService.getMonitoringJalan({ limit: 100, search });
            if (response.status === "success") {
                setRoads(response.result);
            }
            setLoading(false);
        };

        const timer = setTimeout(fetchRoads, 500);
        return () => clearTimeout(timer);
    }, [search]);

    return (
        <MonitoringSidebar widthClass="w-80" isOpen={isOpen} onToggle={onToggle}>
            <div className="flex flex-col h-full bg-slate-50/50">
                <div className="p-4 bg-white border-b sticky top-0 z-10 space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                            <MapPin className="w-4 h-4" />
                        </div>
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Ruas Jalan Poros</h2>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            placeholder="Cari ruas jalan..."
                            className="pl-9 h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-lg"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent">
                    {loading ? (
                        <div className="flex flex-col gap-2 p-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-20 bg-white border border-slate-100 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : roads.length > 0 ? (
                        roads.map((item) => {
                            const isSelected = selectedRoad?.jalan.kode_ruas === item.jalan.kode_ruas;
                            const progress = Math.round((item.summary.fisik.total / item.summary.total_panjang_jalan) * 100);

                            return (
                                <div
                                    key={item.jalan.id}
                                    className={cn(
                                        "px-4 py-3 border-b border-slate-100 transition-all cursor-pointer group relative",
                                        isSelected
                                            ? "bg-blue-50/50"
                                            : "bg-white hover:bg-slate-50"
                                    )}
                                    onClick={() => onSelectRoad(item)}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">#{item.jalan.kode_ruas}</span>
                                            <h3 className={cn(
                                                "text-xs font-bold truncate transition-colors",
                                                isSelected ? "text-blue-600" : "text-slate-700 group-hover:text-blue-600"
                                            )}>
                                                {item.jalan.nama_ruas}
                                            </h3>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            <span className={cn(
                                                "text-[10px] font-bold",
                                                progress >= 100 ? "text-emerald-500" : "text-blue-500"
                                            )}>
                                                {progress}%
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mt-1.5">
                                        <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full transition-all duration-500 rounded-full", progress >= 100 ? "bg-emerald-500" : "bg-blue-500")}
                                                style={{ width: `${Math.min(100, progress)}%` }}
                                            />
                                        </div>
                                        <span className="text-[9px] font-medium text-slate-400 shrink-0">{item.jalan.panjang}m</span>
                                    </div>

                                    {isSelected && (
                                        <div className="mt-3 flex gap-2 animate-in slide-in-from-top-1">
                                            <Button
                                                size="sm"
                                                className="w-full h-8 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 shadow-sm"
                                                disabled={isDrawing}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onStartDraw();
                                                }}
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-1" />
                                                MULAI DRAW SEGMEN
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-8 text-center text-slate-400 text-sm italic">
                            Tidak ada data jalan found
                        </div>
                    )}
                </div>
            </div>
        </MonitoringSidebar>
    );
}
