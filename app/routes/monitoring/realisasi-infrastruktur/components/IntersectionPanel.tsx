import React from "react";
import { Route, GripHorizontal, Compass, Sparkles } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

interface IntersectionRoad {
    id: string;
    nama?: string;
    kode_ruas?: string | number;
}

interface IntersectionPanelProps {
    show: boolean;
    candidates: IntersectionRoad[];
    panelPos: { x: number; y: number };
    hasDragged: boolean;
    onSelectRoad: (roadId: string) => void;
    onSelectNearest: () => void;
    onCancel: () => void;
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
}

export function IntersectionPanel({
    show,
    candidates,
    panelPos,
    hasDragged,
    onSelectRoad,
    onSelectNearest,
    onCancel,
    onMouseDown,
    onTouchStart,
}: IntersectionPanelProps) {
    if (!show) return null;

    const posStyle = hasDragged
        ? { left: `${panelPos.x}px`, top: `${panelPos.y}px`, position: "absolute" as const }
        : { left: "50%", top: "50%", transform: "translate(-50%, -50%)", position: "absolute" as const };

    return (
        <div
            style={posStyle}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            className="z-50 w-[360px] max-w-[92vw] bg-popover/95 backdrop-blur-md border border-border/80 rounded-2xl shadow-2xl overflow-hidden select-none pointer-events-auto flex flex-col transition-shadow"
        >
            {/* Header / Drag Handle */}
            <div className="drag-handle cursor-grab active:cursor-grabbing bg-muted/50 px-4 py-3 border-b border-border/80 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                    <GripHorizontal className="size-4 text-muted-foreground/60 shrink-0" />
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Route className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="text-xs font-bold text-foreground truncate">Persimpangan Terdeteksi</span>
                    </div>
                </div>
                <Badge variant="secondary" className="text-[10px] font-mono px-2 py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 shrink-0">
                    {candidates.length} Opsi Ruas
                </Badge>
            </div>

            {/* Body Description & Candidates List */}
            <div className="p-4 space-y-3">
                <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 p-2.5 rounded-xl text-xs text-muted-foreground">
                    <Compass className="size-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed text-foreground/90">
                        Titik digitasi menyentuh persimpangan. Silakan pilih ruas jalan rujukan yang ingin ditelusuri:
                    </p>
                </div>

                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {candidates.map((road, idx) => (
                        <button
                            key={road.id || idx}
                            type="button"
                            onClick={() => onSelectRoad(road.id)}
                            className="w-full text-left p-3 rounded-xl border border-border/80 bg-background hover:bg-blue-500/5 hover:border-blue-500/50 group transition-all duration-150 flex flex-col gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer shadow-2xs"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-xs text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                                    {road.nama || "Ruas Master Rujukan"}
                                </span>
                            </div>
                            
                            {/* Kode Ruas - Prominent Display */}
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10.5px] text-muted-foreground font-medium">Kode Ruas:</span>
                                <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/25 group-hover:border-blue-500/40 transition-colors">
                                    {road.kode_ruas || "(Tanpa Kode)"}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Actions Footer */}
                <div className="border-t border-border/80 pt-3 mt-1 flex items-center justify-between gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onCancel}
                        className="h-8.5 px-3 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground"
                    >
                        Batal
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={onSelectNearest}
                        className="h-8.5 px-3.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs flex items-center gap-1.5"
                    >
                        <Sparkles className="size-3.5" />
                        <span>Pilih Terdekat</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
