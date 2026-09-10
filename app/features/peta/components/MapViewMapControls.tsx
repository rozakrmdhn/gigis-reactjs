import { Plus, Minus, Compass, Sparkles, Radio, Layers2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { GeolocationControl } from "~/features/monitoring/components/GeolocationControl";
import OLMap from "ol/Map";

interface MapViewMapControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetBearing: () => void;
    map?: OLMap | null;
    isInspectMode?: boolean;
    onToggleInspectMode?: () => void;
    isBufferMode?: boolean;
    onToggleBufferMode?: () => void;
    isCrossLayerMode?: boolean;
    onToggleCrossLayerMode?: () => void;
    className?: string;
}

export function MapViewMapControls({
    onZoomIn,
    onZoomOut,
    onResetBearing,
    map = null,
    isInspectMode = false,
    onToggleInspectMode,
    isBufferMode = false,
    onToggleBufferMode,
    isCrossLayerMode = false,
    onToggleCrossLayerMode,
    className,
}: MapViewMapControlsProps) {
    return (
        <TooltipProvider>
            <div className={cn("flex flex-col gap-1.5 p-1 bg-[#080B11]/90 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl", className)}>
                {onToggleInspectMode && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-8 w-8 rounded-xl transition-all duration-200 cursor-pointer",
                                    isInspectMode
                                        ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold shadow-lg shadow-emerald-500/20"
                                        : "hover:bg-white/[0.08] hover:text-white text-slate-300"
                                )}
                                onClick={onToggleInspectMode}
                            >
                                <Sparkles className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-slate-900 border-white/[0.08] text-white">
                            <p className="text-xs font-semibold">
                                {isInspectMode ? "Nonaktifkan Analisa Titik" : "Mode Analisa Spasial (GetFeatureInfo)"}
                            </p>
                        </TooltipContent>
                    </Tooltip>
                )}

                {onToggleBufferMode && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-8 w-8 rounded-xl transition-all duration-200 cursor-pointer",
                                    isBufferMode
                                        ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold shadow-lg shadow-cyan-500/20"
                                        : "hover:bg-white/[0.08] hover:text-white text-slate-300"
                                )}
                                onClick={onToggleBufferMode}
                            >
                                <Radio className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-slate-900 border-white/[0.08] text-white">
                            <p className="text-xs font-semibold">
                                {isBufferMode ? "Nonaktifkan Analisa Buffer" : "Mode Analisis Radius / Buffer (Turf.js)"}
                            </p>
                        </TooltipContent>
                    </Tooltip>
                )}

                {onToggleCrossLayerMode && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-8 w-8 rounded-xl transition-all duration-200 cursor-pointer",
                                    isCrossLayerMode
                                        ? "bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold shadow-lg shadow-amber-500/20"
                                        : "hover:bg-white/[0.08] hover:text-white text-slate-300"
                                )}
                                onClick={onToggleCrossLayerMode}
                            >
                                <Layers2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-slate-900 border-white/[0.08] text-white">
                            <p className="text-xs font-semibold">
                                {isCrossLayerMode ? "Tutup Analisa Antar-Layer" : "Analisis Tumpang Tindih Antar-Layer (Jalan vs Pola Ruang/Hutan)"}
                            </p>
                        </TooltipContent>
                    </Tooltip>
                )}

                {(onToggleInspectMode || onToggleBufferMode || onToggleCrossLayerMode) && (
                    <div className="h-px bg-white/[0.06] mx-1" />
                )}

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl hover:bg-white/[0.08] hover:text-white text-slate-300 transition-all duration-200 cursor-pointer"
                            onClick={onZoomIn}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-slate-900 border-white/[0.08] text-white">
                        <p className="text-xs font-semibold">Zoom In</p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl hover:bg-white/[0.08] hover:text-white text-slate-300 transition-all duration-200 cursor-pointer"
                            onClick={onZoomOut}
                        >
                            <Minus className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-slate-900 border-white/[0.08] text-white">
                        <p className="text-xs font-semibold">Zoom Out</p>
                    </TooltipContent>
                </Tooltip>

                <div className="h-px bg-white/[0.06] mx-1" />

                <GeolocationControl map={map} tooltipSide="right" />

                <div className="h-px bg-white/[0.06] mx-1" />

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl hover:bg-white/[0.08] hover:text-white text-slate-300 transition-all duration-200 cursor-pointer"
                            onClick={onResetBearing}
                        >
                            <Compass className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-slate-900 border-white/[0.08] text-white">
                        <p className="text-xs font-semibold">Reset View</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
}
