import { useState } from "react";
import { Layers, ChevronUp, ChevronDown, Info } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export interface LegendItem {
    label: string;
    color: string;
    type?: 'line' | 'polygon' | 'dashed';
    active?: boolean;
}

interface MapLegendProps {
    legendUrls?: string[];
    items?: LegendItem[];
    title?: string;
    description?: string;
    footer?: string;
    className?: string;
    defaultMinimized?: boolean;
}

export function MapLegend({
    legendUrls,
    items,
    title = "Legenda Peta",
    description = "Detail Fitur Spasial",
    footer,
    className,
    defaultMinimized = false
}: MapLegendProps) {
    const [isMinimized, setIsMinimized] = useState(defaultMinimized);

    if ((!legendUrls || legendUrls.length === 0) && (!items || items.length === 0)) return null;

    return (
        <div className={cn(
            "absolute z-30 transition-all duration-500 ease-in-out",
            className
        )}>
            <div className={cn(
                "bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 dark:border-slate-700/50 p-3 md:p-3 transition-all duration-500 overflow-hidden animate-in zoom-in-95 slide-in-from-left-4",
                isMinimized ? "w-48 h-12" : "min-w-[180px] max-w-[260px] h-auto"
            )}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Layers size={10} />
                        </div>
                        <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">{title}</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="h-6 w-6 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </Button>
                </div>

                {!isMinimized && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* Custom Legend Items */}
                        {items && items.length > 0 && (
                            <div className="space-y-2 px-1">
                                {items.map((item, idx) => (
                                    <div key={idx} className={cn("flex items-center gap-3 transition-opacity duration-300", item.active === false && "opacity-40 grayscale-[0.5]")}>
                                        {item.type === 'dashed' ? (
                                            <div className="relative w-6 h-2 flex items-center justify-center shrink-0">
                                                <div className="w-full h-0 border-t-2 border-dashed" style={{ borderColor: item.color }} />
                                                <div className="absolute inset-0 rounded-sm" style={{ backgroundColor: `${item.color}1a` }} />
                                            </div>
                                        ) : item.type === 'polygon' ? (
                                            <div
                                                className="w-6 h-3 border-2 rounded-sm shrink-0"
                                                style={{
                                                    backgroundColor: `${item.color}33`,
                                                    borderColor: item.color
                                                }}
                                            />
                                        ) : (
                                            <div
                                                className="w-6 h-1.5 rounded-full shrink-0"
                                                style={{
                                                    backgroundColor: item.color,
                                                    boxShadow: item.active !== false ? `0 0 8px ${item.color}80` : 'none'
                                                }}
                                            />
                                        )}
                                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tighter text-left leading-none">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* WMS Legend Images */}
                        {legendUrls && legendUrls.length > 0 && (
                            <div className="space-y-3">
                                {legendUrls.map((url, idx) => (
                                    <div key={idx} className="bg-white dark:bg-slate-800/50 rounded-xl overflow-hidden">
                                        <img
                                            src={url.startsWith('http') ? url : `https://saggaserv.my.id${url}`}
                                            alt={`Legend ${idx}`}
                                            className="max-w-full h-auto dark:brightness-90 dark:contrast-125"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                if (!target.src.includes('/proxy/')) {
                                                    target.src = url.replace('https://saggaserv.my.id/geoserver', `${window.location.origin}/proxy/geoserver`);
                                                }
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {footer && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed uppercase tracking-widest text-left">
                                    {footer}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
