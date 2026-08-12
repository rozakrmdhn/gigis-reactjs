import { useState } from "react";
import { cn } from "~/lib/utils";
import { useIsMobile } from "~/hooks/use-mobile";
import type { Basemap } from "~/features/master/services/basemap.service";
import { Map, Check, X } from "lucide-react";

export interface BasemapItem {
    id: string;
    name: string;
    thumbnail: string;
    url?: string;
    attribution?: string;
}

export const BASEMAP_LIST: BasemapItem[] = [
    { id: 'osm', name: 'OpenStreetMap', thumbnail: 'https://tile.openstreetmap.org/14/13283/8518.png' },
    { id: 'google-road', name: 'Google Maps', thumbnail: 'https://mt1.google.com/vt/lyrs=m&x=13283&y=8518&z=14' },
    { id: 'google-sat', name: 'Google Satellite', thumbnail: 'https://mt1.google.com/vt/lyrs=y&x=13283&y=8518&z=14' },
    { id: 'carto-light', name: 'Positron Light', thumbnail: 'https://a.basemaps.cartocdn.com/light_all/14/13283/8518.png' },
    { id: 'carto-dark', name: 'Dark Matter', thumbnail: 'https://a.basemaps.cartocdn.com/dark_all/14/13283/8518.png' },
    { id: 'satellite', name: 'Esri Satellite', thumbnail: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/14/8518/13283' },
];

interface BasemapToggleProps {
    basemaps?: any[];
    activeBasemap: string;
    onBasemapChange: (id: string) => void;
    className?: string;
}

export function BasemapToggle({ basemaps, activeBasemap, onBasemapChange, className }: BasemapToggleProps) {
    const isMobile = useIsMobile();
    const [isOpen, setIsOpen] = useState(false);
    
    const list = basemaps && basemaps.length > 0 ? basemaps : BASEMAP_LIST;
    const activeItem = list.find(b => b.id === activeBasemap) || list[0];

    return (
        <div className={cn("relative inline-flex items-center pointer-events-auto", className)}>
            {/* Main Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative group overflow-hidden rounded-xl border transition-colors duration-200 flex items-center justify-center shrink-0 shadow-md shadow-slate-950/10 dark:shadow-black/50",
                    isOpen
                        ? "border-blue-600 ring-2 ring-blue-600/30 dark:ring-blue-500/40"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500",
                    isMobile ? "w-11 h-11" : "w-12 h-12"
                )}
                title={isOpen ? "Tutup Pilihan Basemap" : "Pilih Basemap"}
            >
                <img
                    src={activeItem.thumbnail || "https://tile.openstreetmap.org/14/13283/8518.png"}
                    alt="Active Basemap"
                    className="w-full h-full object-cover bg-slate-100 dark:bg-slate-800"
                />
                
                {/* Overlay Label Badge */}
                <div className="absolute inset-x-0 bottom-0 bg-slate-950/75 dark:bg-slate-950/85 backdrop-blur-xs px-0.5 py-0.5 flex items-center justify-center gap-0.5 group-hover:bg-blue-600/90 transition-colors">
                    <Map className="w-2 h-2 text-white/90 shrink-0" />
                    <span className="text-[7px] font-black text-white uppercase tracking-tighter truncate max-w-[42px]">
                        {activeItem.name}
                    </span>
                </div>

                {/* Close Indicator when open */}
                {isOpen && (
                    <div className="absolute top-0.5 right-0.5 bg-blue-600 text-white rounded-full p-0.5 shadow-sm">
                        <X className="w-2 h-2" />
                    </div>
                )}
            </button>

            {/* Horizontal Basemap Selector Panel (Positioned Absolutely to Prevent Vertical Shift) */}
            {isOpen && (
                <div className={cn(
                    "absolute right-full mr-2 bottom-0 z-50 flex flex-row items-center gap-1.5 p-1 rounded-xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl shadow-slate-950/15 dark:shadow-black/70 overflow-x-auto custom-scrollbar animate-in fade-in duration-150",
                    isMobile ? "max-w-[65vw]" : "max-w-[460px]"
                )}>
                    {list.map((b) => {
                        const isActive = activeBasemap === b.id;
                        return (
                            <button
                                key={b.id}
                                type="button"
                                onClick={() => { 
                                    onBasemapChange(b.id); 
                                    setIsOpen(false); 
                                }}
                                className={cn(
                                    "relative group shrink-0 overflow-hidden rounded-lg border transition-colors duration-150 text-left",
                                    isMobile ? "w-15 h-11" : "w-18 h-13",
                                    isActive 
                                        ? "border-blue-600 ring-2 ring-blue-600/30 dark:ring-blue-500/40 shadow-xs" 
                                        : "border-slate-200/80 dark:border-slate-800/80 hover:border-blue-400 dark:hover:border-blue-500"
                                )}
                            >
                                <img
                                    src={b.thumbnail || "https://tile.openstreetmap.org/14/13283/8518.png"}
                                    alt={b.name}
                                    className="w-full h-full object-cover bg-slate-100 dark:bg-slate-800"
                                />
                                
                                {/* Active Checkmark Badge */}
                                {isActive && (
                                    <div className="absolute top-0.5 right-0.5 bg-blue-600 text-white rounded-full p-0.5 shadow-xs">
                                        <Check className="w-2 h-2" />
                                    </div>
                                )}

                                {/* Card Label Bar */}
                                <div className={cn(
                                    "absolute inset-x-0 bottom-0 px-0.5 py-0.5 backdrop-blur-xs transition-colors",
                                    isActive
                                        ? "bg-blue-600/90 text-white"
                                        : "bg-slate-950/70 text-slate-200 dark:bg-slate-950/80 dark:text-slate-300 group-hover:bg-blue-600/85 group-hover:text-white"
                                )}>
                                    <p className="text-[7.5px] font-extrabold text-center truncate uppercase tracking-tighter leading-tight">
                                        {b.name}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
