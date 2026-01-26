import { Map as MapIcon, RotateCw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { cn } from "~/lib/utils";

interface BasemapItem {
    id: string;
    label: string;
    color: string;
    url: string;
}

interface BasemapToggleProps {
    activeBasemap: string;
    onBasemapChange: (id: string) => void;
    className?: string;
}

const BASEMAP_DATA: BasemapItem[] = [
    { id: 'osm', label: 'Standard', color: '#93c5fd', url: 'https://geoportal.bojonegorokab.go.id/main/static/media/rbi.494852622726ecff0319.png' },
    { id: 'satellite', label: 'Satellite', color: '#1e293b', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
    { id: 'hybrid', label: 'Hybrid', color: '#475569', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}' },
    { id: 'terrain', label: 'Terrain', color: '#94a3b8', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}' },
];

export function BasemapToggle({ activeBasemap, onBasemapChange, className }: BasemapToggleProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                        "bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl hover:bg-slate-50 transition-all rounded-xl h-10 w-10 cursor-pointer",
                        className
                    )}
                >
                    <MapIcon className="h-5 w-5 text-slate-600" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-3 rounded-2xl border border-slate-100 shadow-2xl bg-white/95 backdrop-blur-md z-50">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-600 flex items-center justify-center">
                            <div className="w-1 h-1 bg-blue-600 rounded-full" />
                        </div>
                        <h3 className="text-[10px] font-black text-slate-800 tracking-wider uppercase">Basemap</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {BASEMAP_DATA.map((map) => (
                            <button
                                key={map.id}
                                onClick={() => onBasemapChange(map.id)}
                                className={cn(
                                    "flex flex-col items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer",
                                    activeBasemap === map.id
                                        ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
                                        : "bg-white border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50"
                                )}
                            >
                                <div
                                    className={cn(
                                        "w-full h-8 rounded-lg border",
                                        activeBasemap === map.id ? "border-blue-400" : "border-slate-200"
                                    )}
                                    style={{ backgroundImage: `url(${map.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                                />
                                <span className="text-[9px] font-bold uppercase tracking-tighter">{map.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
