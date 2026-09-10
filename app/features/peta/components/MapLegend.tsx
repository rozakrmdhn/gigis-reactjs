import { useState } from "react";
import { Layers, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { cn, getProxiedLayerUrl } from "~/lib/utils";

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
  footer = "MELAROSA GIS Bojonegoro",
  className,
  defaultMinimized = false
}: MapLegendProps) {
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);

  const totalCount = (items?.length || 0) + (legendUrls?.length || 0);

  if (!legendUrls?.length && !items?.length) return null;

  return (
    <div className={cn("absolute z-20 transition-all duration-300 select-none", className)}>
      <div
        className={cn(
          "bg-[#080B11]/95 text-slate-200 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/[0.08] transition-all duration-300 overflow-hidden",
          isMinimized ? "w-[180px] p-2" : "w-[240px] md:w-[260px] p-3"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="flex items-center gap-2 text-left flex-1 min-w-0 cursor-pointer group"
          >
            <div className="w-6 h-6 rounded-lg bg-slate-800 border border-white/[0.1] flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
              <Layers size={14} />
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-xs font-bold text-white truncate">
                {title}
              </span>
              {isMinimized && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-4 bg-slate-800 border border-white/[0.08] text-slate-300 font-semibold">
                  {totalCount}
                </Badge>
              )}
            </div>
          </button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-6 w-6 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] shrink-0 cursor-pointer"
            title={isMinimized ? "Perbesar Legenda" : "Kecilkan Legenda"}
          >
            {isMinimized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </Button>
        </div>

        {/* Content (Shown when expanded) */}
        {!isMinimized && (
          <div className="mt-3 pt-2.5 border-t border-white/[0.08] space-y-3 animate-in fade-in duration-200">
            {/* Custom Vector Legend Items */}
            {items && items.length > 0 && (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center gap-2.5 transition-opacity duration-200",
                      item.active === false && "opacity-40 grayscale"
                    )}
                  >
                    {/* Swatch Graphics */}
                    {item.type === 'dashed' ? (
                      <div className="relative w-6 h-3 flex items-center justify-center shrink-0">
                        <div className="w-full h-0 border-t-2 border-dashed rounded-xs" style={{ borderColor: item.color }} />
                        <div className="absolute inset-0 rounded-xs opacity-20" style={{ backgroundColor: item.color }} />
                      </div>
                    ) : item.type === 'polygon' ? (
                      <div
                        className="w-6 h-3 border-2 rounded-xs shrink-0"
                        style={{
                          backgroundColor: `${item.color}33`,
                          borderColor: item.color
                        }}
                      />
                    ) : (
                      <div
                        className="w-6 h-1 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                    )}

                    {/* Label */}
                    <span className="text-xs font-medium text-slate-200 truncate">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* WMS Legend Images */}
            {legendUrls && legendUrls.length > 0 && (
              <div className="space-y-2">
                {legendUrls.map((url, idx) => (
                  <div key={idx} className="bg-[#0C101A] rounded-xl p-1.5 border border-white/[0.08] overflow-hidden">
                    <img
                      src={getProxiedLayerUrl(url.startsWith('http') ? url : `https://saggaserv.my.id${url}`)}
                      alt={`Legenda ${idx + 1}`}
                      className="max-w-full h-auto rounded invert-[0.85] hue-rotate-180 contrast-125"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.src.includes('/proxy/')) {
                          target.src = getProxiedLayerUrl(url);
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            {footer && (
              <div className="pt-2 border-t border-white/[0.08]">
                <span className="text-[10px] text-slate-500 font-medium block">
                  {footer}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
