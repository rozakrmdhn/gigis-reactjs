import { useEffect, useState } from "react";
import { MonitoringSidebar } from "./MonitoringSidebar";
import { MonitoringList } from "./MonitoringList";
import { monitoringService, type MonitoringJalanResult } from "../services/monitoring.service";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Search, MapPin, Plus } from "lucide-react";
import { ScrollArea } from "~/components/ui/scroll-area";

interface DrawSidebarProps {
    onSelectRoad: (road: MonitoringJalanResult | null) => void;
    selectedRoad: MonitoringJalanResult | null;
    onStartDraw: () => void;
    isDrawing: boolean;
    isOpen?: boolean;
    onToggle?: (isOpen: boolean) => void;
    refreshTrigger?: number;
}

export function DrawSidebar({
    onSelectRoad,
    selectedRoad,
    onStartDraw,
    isDrawing,
    isOpen,
    onToggle,
    refreshTrigger
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
    }, [search, refreshTrigger]);

    // Auto-scroll to selected road
    useEffect(() => {
        if (selectedRoad?.jalan.id) {
            const timer = setTimeout(() => {
                const element = document.getElementById(`road-${selectedRoad.jalan.id}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [selectedRoad?.jalan.id, roads]);

    return (
        <MonitoringSidebar widthClass="w-80" isOpen={isOpen} onToggle={onToggle}>
            <div className="flex flex-col h-full bg-slate-50/50 min-h-0">
                <div className="p-3 bg-white border-b sticky top-0 z-10 space-y-3 shrink-0">
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

                <div className="flex-1 overflow-hidden min-h-0">
                    <ScrollArea className="h-full">
                        <div className="p-2 space-y-2">
                            <MonitoringList
                                data={roads}
                                isLoading={loading}
                                onSelectJalan={(id) => {
                                    const road = roads.find(r => r.jalan.id === id);
                                    if (road) onSelectRoad(road);
                                }}
                                selectedId={selectedRoad?.jalan.id}
                            />
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </MonitoringSidebar>
    );
}
