import { useState } from "react";
import { cn } from "~/lib/utils";
import { useIsMobile } from "~/hooks/use-mobile";

interface BasemapItem {
    id: string;
    name: string;
    thumbnail: string;
}

interface BasemapToggleProps {
    activeBasemap: string;
    onBasemapChange: (id: string) => void;
    className?: string;
}

export const BASEMAP_LIST: BasemapItem[] = [
    { id: 'osm', name: 'OpenStreetMap', thumbnail: 'https://tile.openstreetmap.org/14/13283/8518.png' },
    { id: 'google-road', name: 'Google Maps', thumbnail: 'https://mt1.google.com/vt/lyrs=m&x=13283&y=8518&z=14' },
    { id: 'google-sat', name: 'Google Satellite', thumbnail: 'https://mt1.google.com/vt/lyrs=y&x=13283&y=8518&z=14' },
    { id: 'carto-light', name: 'Positron Light', thumbnail: 'https://a.basemaps.cartocdn.com/light_all/14/13283/8518.png' },
    { id: 'carto-dark', name: 'Dark Matter', thumbnail: 'https://a.basemaps.cartocdn.com/dark_all/14/13283/8518.png' },
    { id: 'satellite', name: 'Esri Satellite', thumbnail: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/14/8518/13283' },
];

export function BasemapToggle({ activeBasemap, onBasemapChange, className }: BasemapToggleProps) {
    const isMobile = useIsMobile();
    const [isOpen, setIsOpen] = useState(false);
    
    const activeItem = BASEMAP_LIST.find(b => b.id === activeBasemap) || BASEMAP_LIST[0];

    return (
        <div className={cn("flex flex-col items-end pointer-events-auto", className)}>
            {isOpen && (
                <div className={cn(
                    "mb-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-3xl border border-white dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.3)] grid grid-cols-2 gap-2 animate-in fade-in zoom-in slide-in-from-bottom-10 duration-300 origin-bottom-right max-h-[60vh] overflow-y-auto z-50",
                    isMobile ? "gap-2" : "gap-3 p-4"
                )}>
                    {BASEMAP_LIST.map((b) => (
                        <button
                            key={b.id}
                            onClick={() => { 
                                onBasemapChange(b.id); 
                                setIsOpen(false); 
                            }}
                            className={cn(
                                "relative overflow-hidden rounded-xl shadow-sm border-2 transition-all active:scale-95 group h-16 w-16 md:w-20 md:h-20",
                                activeBasemap === b.id 
                                    ? "border-blue-600 shadow-lg shadow-blue-200 dark:shadow-none bg-blue-50 dark:bg-blue-900/20" 
                                    : "border-slate-100 dark:border-slate-800 hover:border-blue-400"
                            )}
                        >
                            <img src={b.thumbnail} alt={b.name} className="w-full h-full object-cover" />
                            <div className={cn(
                                "absolute inset-x-0 bottom-0 transition-colors p-1 md:p-2",
                                activeBasemap === b.id ? "bg-blue-600/90 backdrop-blur-sm" : "bg-slate-900/60 backdrop-blur-sm group-hover:bg-blue-600/80"
                            )}>
                                <p className="text-[8px] font-black text-white text-center leading-tight truncate px-0.5 uppercase tracking-tighter">{b.name}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "overflow-hidden rounded-2xl border-2 border-white dark:border-slate-800 shadow-2xl hover:scale-105 active:scale-95 transition-all group relative",
                    isMobile ? "w-14 h-14" : "w-16 h-16"
                )}
                title="Pilih Basemap"
            >
                <img src={activeItem.thumbnail} alt="Active Basemap" className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-slate-900/60 backdrop-blur-sm p-1 flex justify-center group-hover:bg-blue-600/90 transition-colors">
                    <span className="text-[7px] font-black text-white uppercase tracking-tighter truncate px-0.5">{activeItem.name}</span>
                </div>
            </button>
        </div>
    );
}

