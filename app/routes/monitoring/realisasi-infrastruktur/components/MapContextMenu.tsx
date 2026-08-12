import { BarChart2, Info, Edit3, Lock, MapPin as PinIcon, Scissors, Trash2 } from "lucide-react";
import type { InfrastrukturTipe } from "~/services/infrastruktur.service";
import type { RealisasiSegmen, ContextMenuState } from "../types";

interface MapContextMenuProps {
    contextMenu: ContextMenuState | null;
    activeTipe: InfrastrukturTipe | null;
    lockedSegmenIds: Set<string>;
    onClose: () => void;
    onOpenGarisVisual: () => void;
    onShowDetail: (segment: RealisasiSegmen) => void;
    onEditAttributes: (segment: RealisasiSegmen) => void;
    onEditGeometry: (segment: RealisasiSegmen) => void;
    onStartSplit: (segment: RealisasiSegmen) => void;
    onDelete: (id: string) => void;
}

export function MapContextMenu({
    contextMenu,
    activeTipe,
    lockedSegmenIds,
    onClose,
    onOpenGarisVisual,
    onShowDetail,
    onEditAttributes,
    onEditGeometry,
    onStartSplit,
    onDelete,
}: MapContextMenuProps) {
    if (!contextMenu) return null;

    const isAreaGeom =
        activeTipe?.geom_type?.toUpperCase() === "POLYGON" ||
        activeTipe?.geom_type?.toUpperCase() === "MULTIPOLYGON";

    return (
        <div
            className="fixed z-50 min-w-[10rem] max-w-[240px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80 zoom-in-95 duration-100 outline-none"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header: nama jalan/ruas */}
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground select-none truncate max-w-[220px]">
                {contextMenu.segment?.nama_jalan || contextMenu.masterFeature?.nama_ruas || "Layer Jalan"}
            </div>
            <div className="h-px bg-border -mx-1 my-1" />

            {/* Garis Visual — tersedia untuk Segmen Realisasi dan Master Rujukan */}
            <button
                onClick={() => {
                    onOpenGarisVisual();
                    onClose();
                }}
                className="w-full text-left relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs font-semibold outline-none text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-300 focus:bg-violet-500/10 transition-colors min-w-0"
            >
                <BarChart2 className="size-3.5 shrink-0" />
                <span className="truncate block flex-1">Garis Visual</span>
            </button>

            {/* Item khusus Segmen Realisasi */}
            {contextMenu.segment && (
                <>
                    <div className="h-px bg-border -mx-1 my-1" />
                    <button
                        onClick={() => {
                            onShowDetail(contextMenu.segment!);
                            onClose();
                        }}
                        className="w-full text-left relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs font-semibold outline-none text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-300 focus:bg-blue-500/10 transition-colors min-w-0"
                    >
                        <Info className="size-3.5 text-blue-550 shrink-0" />
                        <span className="truncate block flex-1">Detail Segmen {contextMenu.segment.nama_jalan}</span>
                    </button>
                    <div className="h-px bg-border -mx-1 my-1" />
                    <button
                        onClick={() => {
                            onEditAttributes(contextMenu.segment!);
                            onClose();
                        }}
                        className="w-full text-left relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs font-semibold outline-none text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 focus:bg-emerald-500/10 transition-colors"
                    >
                        <Edit3 className="size-3.5" />
                        <span>
                            {lockedSegmenIds.has(contextMenu.segment.id.toString())
                                ? "Edit Atribut Segmen (Terikat BA)"
                                : "Edit Atribut Segmen"}
                        </span>
                    </button>

                    {!lockedSegmenIds.has(contextMenu.segment.id.toString()) ? (
                        <>
                            <button
                                onClick={() => {
                                    onEditGeometry(contextMenu.segment!);
                                    onClose();
                                }}
                                className="w-full text-left relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground transition-colors"
                            >
                                <PinIcon className="size-3.5" />
                                <span>Edit Geometri &amp; Atribut</span>
                            </button>
                            <button
                                onClick={() => {
                                    onStartSplit(contextMenu.segment!);
                                    onClose();
                                }}
                                className="w-full text-left relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground transition-colors"
                            >
                                <Scissors className="size-3.5" />
                                <span>Split Segmen</span>
                            </button>
                            <div className="h-px bg-border -mx-1 my-1" />
                            <button
                                onClick={() => {
                                    onDelete(contextMenu.segment!.id);
                                    onClose();
                                }}
                                className="w-full text-left relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-none text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 hover:text-destructive focus:bg-destructive/10 focus:text-destructive transition-colors"
                            >
                                <Trash2 className="size-3.5" />
                                <span>{isAreaGeom ? "Hapus Area" : "Hapus Segmen"}</span>
                            </button>
                        </>
                    ) : (
                        <div className="px-2 py-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded flex items-center gap-1 font-medium my-1">
                            <Lock className="size-3 shrink-0" />
                            <span>Geometri dikunci (Terikat BA Final)</span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
