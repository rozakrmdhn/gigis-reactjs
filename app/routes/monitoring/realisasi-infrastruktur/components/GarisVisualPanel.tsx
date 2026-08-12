import { BarChart2, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { SegmenVisualisasi } from "~/features/monitoring/components/SegmenVisualisasi";
import type { SegmenData } from "~/features/monitoring/components/SegmenVisualisasi";
import { toast } from "sonner";

interface GarisVisualRuas {
    nama: string;
    desa?: string;
    kecamatan?: string;
    panjangTotal: number;
}

interface GarisVisualPanelState {
    isOpen: boolean;
    isLoading: boolean;
    ruas: GarisVisualRuas;
    segmens: SegmenData[];
}

interface GarisVisualPanelProps {
    panel: GarisVisualPanelState | null;
    isSidebarOpen: boolean;
    onRefresh: () => void;
    onClose: () => void;
}

export function GarisVisualPanel({ panel, isSidebarOpen, onRefresh, onClose }: GarisVisualPanelProps) {
    if (!panel?.isOpen) return null;

    return (
        <div
            className={cn(
                "fixed md:absolute bottom-4 right-4 z-50 max-h-[calc(100vh-8rem)] flex flex-col rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden transition-all duration-300 ease-in-out pointer-events-auto",
                isSidebarOpen ? "left-4 md:left-[336px]" : "left-4"
            )}
        >
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-lg bg-violet-500/10 shrink-0">
                        <BarChart2 className="size-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-xs font-bold text-foreground leading-tight truncate">
                            Garis Visual — {panel.ruas.nama}
                        </h3>
                        <p className="text-[10px] text-muted-foreground truncate">
                            {panel.ruas.desa ? `Desa ${panel.ruas.desa}` : ""}
                            {panel.ruas.kecamatan ? `, Kec. ${panel.ruas.kecamatan}` : ""}
                            {` • Total Ruas: ${panel.ruas.panjangTotal >= 1000
                                ? (panel.ruas.panjangTotal / 1000).toFixed(2) + " km"
                                : panel.ruas.panjangTotal + " m"
                            }`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        disabled={panel.isLoading}
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
                        onClick={onRefresh}
                        title="Segarkan Data Garis Visual"
                    >
                        <RefreshCw className={cn("size-3.5", panel.isLoading && "animate-spin text-violet-500")} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
                        onClick={onClose}
                        title="Tutup Panel"
                    >
                        <X className="size-4" />
                    </Button>
                </div>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 py-2 max-h-[60vh] [scrollbar-gutter:stable]">
                {panel.isLoading ? (
                    <div className="flex flex-col items-center justify-center py-6 gap-2">
                        <Loader2 className="size-6 animate-spin text-violet-500" />
                        <p className="text-xs text-muted-foreground font-medium">Memuat data segmen…</p>
                    </div>
                ) : panel.segmens.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 gap-1.5">
                        <BarChart2 className="size-6 text-muted-foreground/40" />
                        <p className="text-xs font-medium text-muted-foreground text-center">
                            Tidak ada data segmen untuk ruas ini.
                        </p>
                    </div>
                ) : (
                    <SegmenVisualisasi
                        ruas={panel.ruas}
                        segmens={panel.segmens}
                        onSelectSegment={(seg) => {
                            const raw = seg.rawSegmen || seg;
                            if (raw && typeof (window as any).zoomToSegment === "function") {
                                (window as any).zoomToSegment(raw);
                                toast.info(`Menyorot segmen ${seg.nama} di peta GIS`);
                            } else if (raw) {
                                toast.info(`Menyeleksi segmen ${seg.nama} (TA ${seg.tahun})`);
                            }
                        }}
                    />
                )}
            </div>
        </div>
    );
}
