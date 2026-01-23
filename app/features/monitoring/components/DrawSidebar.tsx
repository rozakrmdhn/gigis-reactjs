import { useEffect, useState } from "react";
import { MonitoringSidebar } from "./MonitoringSidebar";
import { MonitoringList } from "./MonitoringList";
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
                <div className="p-3 bg-white border-b sticky top-0 z-10 space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                            <MapPin className="w-4 h-4" />
                        </div>
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">DAFTAR JALAN</h2>
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
                    ) : (
                        <MonitoringList
                            data={roads}
                            onSelectJalan={(id) => {
                                const road = roads.find(r => r.jalan.id === id);
                                if (road) onSelectRoad(road);
                            }}
                            selectedId={selectedRoad?.jalan.id}
                        />
                    )}
                </div>
            </div>
        </MonitoringSidebar>
    );
}
