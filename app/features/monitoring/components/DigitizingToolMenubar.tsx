import React from "react";
import {
    MousePointer2,
    GitFork,
    PenLine,
    Hexagon,
    SquareDashed,
    Crosshair,
    Eraser,
    Undo2,
    Redo2,
    CheckCheck,
    RotateCcw,
    RotateCw,
    Spline,
    SaveAll,
    CircleX,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "~/components/ui/tooltip";

export interface DigitizingToolMenubarProps {
    activeTipe?: {
        nama?: string;
        geom_type?: string;
        [key: string]: any;
    } | null;
    digitizeMode: "manual" | "otomatis" | "dimensions" | "select";
    setDigitizeMode: (mode: "manual" | "otomatis" | "dimensions" | "select") => void;
    tipeJalanDigitasi: "poros" | "lingkungan";
    setTipeJalanDigitasi: (tipe: "poros" | "lingkungan") => void;
    checkMelarosa: boolean;
    setCheckMelarosa: (v: boolean) => void;
    isDrawing: boolean;
    setIsDrawing: (v: boolean) => void;
    isReshaping: boolean;
    isFormOpen: boolean;
    isAttributeDialogOpen: boolean;
    sketchPointsCount: number;
    geomHistory: any[];
    geomRedoStack: any[];
    coordsCount: number;
    drawnCoords: any[];
    drawSourceRef: React.RefObject<any>;
    measureSourceRef: React.RefObject<any>;
    handleRedraw: () => void;
    handleUndoDigitasi: () => void;
    handleRedoDigitasi: () => void;
    handleFinishDrawing: () => void;
    handleRotatePolygon: (deg: number) => void;
    enterReshapeMode: () => void;
    startDraw: () => void;
    removeInteractions: () => void;
    setIsAttributeDialogOpen: (v: boolean) => void;
    closeForm: () => void;
}

export const DigitizingToolMenubar: React.FC<DigitizingToolMenubarProps> = ({
    activeTipe,
    digitizeMode,
    setDigitizeMode,
    tipeJalanDigitasi,
    setTipeJalanDigitasi,
    checkMelarosa,
    setCheckMelarosa,
    isDrawing,
    setIsDrawing,
    isReshaping,
    isFormOpen,
    isAttributeDialogOpen,
    sketchPointsCount,
    geomHistory,
    geomRedoStack,
    coordsCount,
    drawnCoords,
    drawSourceRef,
    measureSourceRef,
    handleRedraw,
    handleUndoDigitasi,
    handleRedoDigitasi,
    handleFinishDrawing,
    handleRotatePolygon,
    enterReshapeMode,
    startDraw,
    removeInteractions,
    setIsAttributeDialogOpen,
    closeForm,
}) => {
    // Sembunyikan menubar saat dialog atribut terbuka (dialog bersifat non-modal)
    const isEditingAttributesOnly = isAttributeDialogOpen;

    const isPolygonGeom =
        activeTipe?.geom_type?.toUpperCase() === "POLYGON" ||
        activeTipe?.geom_type?.toUpperCase() === "MULTIPOLYGON" ||
        digitizeMode === "dimensions";
    const isPointGeom =
        activeTipe?.geom_type?.toUpperCase() === "POINT" ||
        activeTipe?.geom_type?.toUpperCase() === "MULTIPOINT";

    const hasDrawFeature = Boolean(
        (drawSourceRef.current && drawSourceRef.current.getFeatures().length > 0) ||
        (measureSourceRef.current && measureSourceRef.current.getFeatures().length > 0) ||
        coordsCount >= 3 ||
        drawnCoords.length >= 3
    );

    const canSaveDigitasi =
        hasDrawFeature ||
        (isPolygonGeom
            ? coordsCount >= 3 || drawnCoords.length >= 3
            : isPointGeom
            ? coordsCount >= 1
            : coordsCount >= 2);

    // Jika hanya edit atribut, jangan tampilkan aksi geometri digitasi di menubar
    if (isEditingAttributesOnly) {
        return null;
    }

    return (
        <div className="flex flex-col items-center gap-1.5 p-1.5 rounded-xl bg-card/95 dark:bg-card/90 border border-border/80 backdrop-blur-md shadow-xl w-11 pointer-events-auto shrink-0 select-none">
            {/* Mode Selection Group */}
            <div className="flex flex-col items-center gap-1 p-0.5 bg-muted/50 rounded-lg border border-border/50 shrink-0">
                {/* Pointer / Select Feature Mode Button */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                                removeInteractions();
                                setIsDrawing(false);
                                setDigitizeMode("select");
                            }}
                            className={cn(
                                "h-8 w-8 rounded-lg transition-all shrink-0",
                                digitizeMode === "select"
                                    ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-500 shadow-xs font-bold"
                                    : "text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/15"
                            )}
                        >
                            <MousePointer2 className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs font-semibold">
                        Pilih / Select Mode (Klik fitur di peta untuk melihat/edit data)
                    </TooltipContent>
                </Tooltip>
                {activeTipe?.geom_type?.toUpperCase() === "POLYGON" ||
                activeTipe?.geom_type?.toUpperCase() === "MULTIPOLYGON" ? (
                    <>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                        setDigitizeMode("manual");
                                        startDraw();
                                    }}
                                    className={cn(
                                        "h-8 w-8 rounded-lg transition-all shrink-0",
                                        digitizeMode === "manual"
                                            ? "bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white shadow-xs"
                                            : "text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/15"
                                    )}
                                >
                                    <Hexagon className="size-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="text-xs font-semibold">
                                Area Polygon (Klik titik-titik sudut, klik ganda untuk selesai)
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                        removeInteractions();
                                        setIsDrawing(false);
                                        setDigitizeMode("dimensions");
                                    }}
                                    className={cn(
                                        "h-8 w-8 rounded-lg transition-all shrink-0",
                                        digitizeMode === "dimensions"
                                            ? "bg-orange-600 text-white hover:bg-orange-700 hover:text-white shadow-xs"
                                            : "text-slate-700 dark:text-slate-200 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-500/15"
                                    )}
                                >
                                    <SquareDashed className="size-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="text-xs font-semibold">
                                Kotak P × L (Area Polygon dari Dimensi)
                            </TooltipContent>
                        </Tooltip>
                    </>
                ) : activeTipe?.geom_type?.toUpperCase() === "POINT" ||
                  activeTipe?.geom_type?.toUpperCase() === "MULTIPOINT" ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                    setDigitizeMode("manual");
                                    startDraw();
                                }}
                                className="h-8 w-8 rounded-lg transition-all shrink-0 bg-emerald-600 text-white shadow-xs"
                            >
                                <Crosshair className="size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs font-semibold">
                            Titik Lokasi (Klik satu titik di peta)
                        </TooltipContent>
                    </Tooltip>
                ) : (
                    <>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                        setTipeJalanDigitasi("poros");
                                        setCheckMelarosa(true);
                                        setDigitizeMode("otomatis");
                                    }}
                                    className={cn(
                                        "h-8 w-8 rounded-lg transition-all shrink-0",
                                        tipeJalanDigitasi === "poros" && checkMelarosa && digitizeMode === "otomatis"
                                            ? "bg-blue-600 text-white hover:bg-blue-700 hover:text-white shadow-xs"
                                            : "text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/15"
                                    )}
                                >
                                    <GitFork className="size-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="text-xs font-semibold">
                                Point to Point (Otomatis menempel rute master {activeTipe?.nama || "infrastruktur"})
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                        setTipeJalanDigitasi("lingkungan");
                                        setCheckMelarosa(false);
                                        setDigitizeMode("manual");
                                    }}
                                    className={cn(
                                        "h-8 w-8 rounded-lg transition-all shrink-0",
                                        digitizeMode === "manual" && (tipeJalanDigitasi === "lingkungan" || !checkMelarosa)
                                            ? "bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white shadow-xs"
                                            : "text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/15"
                                    )}
                                >
                                    <PenLine className="size-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="text-xs font-semibold">
                                Digitasi Manual (Penggambaran segmen bebas)
                            </TooltipContent>
                        </Tooltip>
                    </>
                )}
            </div>

            {/* Divider */}
            <div className="w-6 h-px bg-border/60 my-0.5 shrink-0" />

            {/* Editing & Actions Group */}
            <div className="flex flex-col items-center gap-1 shrink-0">
                {/* Gambar Ulang */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={handleRedraw}
                            className="h-8 w-8 rounded-lg border-border/60 bg-background/80 hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30 transition-all shrink-0"
                        >
                            <Eraser className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs font-semibold">
                        Gambar Ulang Digitasi (Redraw)
                    </TooltipContent>
                </Tooltip>

                {/* Undo */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={handleUndoDigitasi}
                            disabled={!((isDrawing && digitizeMode === "manual" && sketchPointsCount > 0) || (isReshaping && geomHistory.length > 1))}
                            className="h-8 w-8 rounded-lg border-border/60 bg-background/80 hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/30 transition-all disabled:opacity-40 shrink-0"
                        >
                            <Undo2 className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs font-semibold">
                        Undo (Ctrl+Z)
                    </TooltipContent>
                </Tooltip>

                {/* Redo */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={handleRedoDigitasi}
                            disabled={!(isReshaping && geomRedoStack.length > 0)}
                            className="h-8 w-8 rounded-lg border-border/60 bg-background/80 hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/30 transition-all disabled:opacity-40 shrink-0"
                        >
                            <Redo2 className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs font-semibold">
                        Redo (Ctrl+Y)
                    </TooltipContent>
                </Tooltip>

                {isDrawing && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                onClick={handleFinishDrawing}
                                disabled={sketchPointsCount < 2}
                                className="h-8 w-8 rounded-lg border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold transition-all disabled:opacity-40 shrink-0"
                            >
                                <CheckCheck className="size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs font-semibold">
                            Selesai Menggambar (Enter / Klik Kanan)
                        </TooltipContent>
                    </Tooltip>
                )}

                {isPolygonGeom && (
                    <>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    onClick={() => handleRotatePolygon(-15)}
                                    disabled={!canSaveDigitasi}
                                    className="h-8 w-8 rounded-lg border-border/60 bg-background/80 hover:bg-orange-500/10 hover:text-orange-600 hover:border-orange-500/30 transition-all disabled:opacity-40 shrink-0"
                                >
                                    <RotateCcw className="size-4 text-orange-500" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="text-xs font-semibold">
                                Putar Polygon Kiri (-15°)
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    onClick={() => handleRotatePolygon(15)}
                                    disabled={!canSaveDigitasi}
                                    className="h-8 w-8 rounded-lg border-border/60 bg-background/80 hover:bg-orange-500/10 hover:text-orange-600 hover:border-orange-500/30 transition-all disabled:opacity-40 shrink-0"
                                >
                                    <RotateCw className="size-4 text-orange-500" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="text-xs font-semibold">
                                Putar Polygon Kanan (+15°)
                            </TooltipContent>
                        </Tooltip>
                    </>
                )}
            </div>

            {/* Divider */}
            <div className="w-6 h-px bg-border/60 my-0.5 shrink-0" />

            {/* Save & Cancel Group */}
            <div className="flex flex-col items-center gap-1 shrink-0">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={enterReshapeMode}
                            disabled={!canSaveDigitasi}
                            className="h-8 w-8 rounded-lg border-border/60 bg-background/80 hover:bg-indigo-500/10 hover:text-indigo-600 hover:border-indigo-500/30 transition-all disabled:opacity-40 shrink-0"
                        >
                            <Spline className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs font-semibold">
                        Ubah Bentuk Geometri (Reshape)
                    </TooltipContent>
                </Tooltip>

                {/* Simpan Digitasi */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => setIsAttributeDialogOpen(true)}
                            disabled={!canSaveDigitasi}
                            className="h-8 w-8 rounded-lg border-emerald-500/30 bg-emerald-600 text-white hover:bg-emerald-700 transition-all disabled:opacity-40 shrink-0 shadow-xs"
                        >
                            <SaveAll className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs font-semibold">
                        Lengkapi Atribut & Simpan Digitasi
                    </TooltipContent>
                </Tooltip>

                {/* Batal Digitasi */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={closeForm}
                            className="h-8 w-8 rounded-lg border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-all shrink-0"
                        >
                            <CircleX className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs font-semibold">
                        Batalkan Digitasi & Reset Form
                    </TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
};

export default DigitizingToolMenubar;
