import { useState, useMemo } from "react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
    MapPin,
    Route,
    Pentagon,
    Edit3,
    Trash2,
    Copy,
    Maximize2,
    LocateFixed,
    Plus,
    Check,
    CheckCircle2
} from "lucide-react";
import * as turf from "@turf/turf";
import { usulanDesaGeometryService } from "../services/usulan-desa-geometry.service";
import type { UsulanDesaGeometry, GeoJSONGeometry } from "../types/usulan-desa.types";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

interface GeometryListProps {
    data: UsulanDesaGeometry[];
    isLoading: boolean;
    onFocus: (item: UsulanDesaGeometry) => void;
    onRefresh: () => void;
    onEdit?: (item: UsulanDesaGeometry) => void;
    onFitAll?: () => void;
    onStartDraw?: (type: "Point" | "LineString" | "Polygon") => void;
}

export function GeometryList({
    data,
    isLoading,
    onFocus,
    onRefresh,
    onEdit,
    onFitAll,
    onStartDraw
}: GeometryListProps) {
    const isEditable = !!onEdit;

    // State for deletion
    const [deleteItem, setDeleteItem] = useState<UsulanDesaGeometry | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // State for inline editing
    const [editingValues, setEditingValues] = useState<Record<number | string, string>>({});
    const [savingId, setSavingId] = useState<number | string | null>(null);
    const [copiedId, setCopiedId] = useState<number | string | null>(null);

    // Summary counts
    const counts = useMemo(() => {
        const pointCount = data.filter(d => d.geom?.type === "Point").length;
        const lineCount = data.filter(d => d.geom?.type === "LineString").length;
        const polygonCount = data.filter(d => d.geom?.type === "Polygon").length;
        return { pointCount, lineCount, polygonCount, total: data.length };
    }, [data]);

    // Calculate human-friendly geodetic metrics (length in m/km, area in m²/Ha)
    const getMetrics = (geom: GeoJSONGeometry) => {
        if (!geom || !geom.coordinates) return null;

        try {
            if (geom.type === "Point") {
                const [lon, lat] = geom.coordinates;
                return {
                    label: "Koordinat",
                    value: `${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)}`,
                    copyText: `${lat}, ${lon}`,
                    extra: "Titik Tunggal"
                };
            } else if (geom.type === "LineString") {
                const line = turf.lineString(geom.coordinates);
                const lengthKm = turf.length(line, { units: "kilometers" });
                const lengthM = lengthKm * 1000;
                const formatted = lengthM >= 1000
                    ? `${lengthKm.toFixed(2)} km`
                    : `${Math.round(lengthM).toLocaleString("id-ID")} m`;

                let firstCoord = "";
                if (geom.coordinates.length > 0) {
                    firstCoord = `${geom.coordinates[0][1].toFixed(5)}, ${geom.coordinates[0][0].toFixed(5)}`;
                }

                return {
                    label: "Panjang Jalur",
                    value: `± ${formatted}`,
                    copyText: geom.coordinates.map((c: any) => `${c[1]}, ${c[0]}`).join("\n"),
                    extra: `${geom.coordinates.length} titik vertex`,
                    subText: firstCoord ? `Mulai: ${firstCoord}` : undefined
                };
            } else if (geom.type === "Polygon") {
                const poly = turf.polygon(geom.coordinates);
                const areaM2 = turf.area(poly);
                const formatted = areaM2 >= 10000
                    ? `${(areaM2 / 10000).toFixed(2)} Ha`
                    : `${Math.round(areaM2).toLocaleString("id-ID")} m²`;

                const pointsCount = (geom.coordinates[0] || []).length;
                return {
                    label: "Luas Wilayah",
                    value: `± ${formatted}`,
                    copyText: (geom.coordinates[0] || []).map((c: any) => `${c[1]}, ${c[0]}`).join("\n"),
                    extra: `${pointsCount} titik sudut`
                };
            }
        } catch (e) {
            console.error("Gagal menghitung metrik geometri:", e);
        }

        return null;
    };

    const handleCopy = (item: UsulanDesaGeometry, copyText: string) => {
        if (!copyText) return;
        navigator.clipboard.writeText(copyText)
            .then(() => {
                setCopiedId(item.id);
                toast.success("Koordinat lokasi disalin ke clipboard!");
                setTimeout(() => setCopiedId(null), 2000);
            })
            .catch(() => toast.error("Gagal menyalin koordinat."));
    };

    const handleTextChange = (id: number | string, val: string) => {
        setEditingValues(prev => ({ ...prev, [id]: val }));
    };

    const handleSaveInline = async (item: UsulanDesaGeometry) => {
        const currentVal = editingValues[item.id];
        if (currentVal === undefined || currentVal.trim() === item.keterangan_geometry) {
            return;
        }

        if (currentVal.trim() === "") {
            toast.error("Keterangan lokasi tidak boleh kosong.");
            setEditingValues(prev => {
                const updated = { ...prev };
                delete updated[item.id];
                return updated;
            });
            return;
        }

        setSavingId(item.id);
        try {
            const sanitizedGeom = item.geom ? {
                type: item.geom.type,
                coordinates: item.geom.coordinates
            } : undefined;

            const success = await usulanDesaGeometryService.update(item.id, {
                geom: sanitizedGeom,
                keterangan_geometry: currentVal.trim()
            });
            if (success) {
                toast.success("Keterangan lokasi berhasil diperbarui.");
                setEditingValues(prev => {
                    const updated = { ...prev };
                    delete updated[item.id];
                    return updated;
                });
                onRefresh();
            } else {
                toast.error("Gagal memperbarui keterangan.");
            }
        } catch (err) {
            console.error("Gagal memperbarui keterangan:", err);
            toast.error("Gagal memperbarui keterangan.");
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async () => {
        if (!deleteItem) return;

        setIsDeleting(true);
        try {
            const success = await usulanDesaGeometryService.remove(deleteItem.id);
            if (success) {
                toast.success("Lokasi spasial berhasil dihapus.");
                setDeleteItem(null);
                onRefresh();
            } else {
                toast.error("Gagal menghapus lokasi spasial.");
            }
        } catch (error) {
            console.error("Gagal menghapus geometry:", error);
            toast.error("Terjadi kesalahan saat menghapus data.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <TooltipProvider>
            <div className="flex flex-col h-full bg-background">
                {/* Header Summary & Actions */}
                <div className="p-3.5 border-b border-border bg-muted/20 flex items-center justify-between gap-2 shrink-0">
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                                Lokasi Spasial
                            </span>
                            <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[9px] bg-indigo-600 text-white rounded-full font-bold">
                                {data.length}
                            </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            {counts.total > 0
                                ? `${counts.pointCount > 0 ? `${counts.pointCount} Titik` : ''}${counts.lineCount > 0 ? ` • ${counts.lineCount} Garis` : ''}${counts.polygonCount > 0 ? ` • ${counts.polygonCount} Area` : ''}`
                                : "Belum ada objek spasial"}
                        </p>
                    </div>

                    {data.length > 0 && onFitAll && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onFitAll}
                            className="h-7 px-2.5 text-[10px] font-bold rounded-xl gap-1 bg-background border-border text-foreground hover:bg-muted shadow-sm cursor-pointer"
                            title="Tampilkan semua lokasi di peta"
                        >
                            <Maximize2 className="h-3 w-3 text-indigo-600" />
                            <span>Fit Semua</span>
                        </Button>
                    )}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground space-y-2">
                            <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs font-semibold">Memuat lokasi spasial...</p>
                        </div>
                    ) : data.length === 0 ? (
                        /* Modern Empty State */
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl border border-dashed border-border bg-muted/10 space-y-3">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
                                <MapPin className="h-6 w-6" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-xs font-bold text-foreground">Belum Ada Lokasi Spasial</h4>
                                <p className="text-[11px] text-muted-foreground max-w-[240px] leading-relaxed">
                                    Gunakan toolbar di bagian bawah peta untuk mendigitasi titik, garis, atau area usulan pembangunan.
                                </p>
                            </div>
                            {onStartDraw && (
                                <div className="flex items-center gap-1.5 pt-1">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onStartDraw("Point")}
                                        className="h-7 px-2 text-[10px] font-bold rounded-xl gap-1 border-border hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300"
                                    >
                                        <Plus className="h-3 w-3" /> Titik
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onStartDraw("LineString")}
                                        className="h-7 px-2 text-[10px] font-bold rounded-xl gap-1 border-border hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                                    >
                                        <Plus className="h-3 w-3" /> Garis
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onStartDraw("Polygon")}
                                        className="h-7 px-2 text-[10px] font-bold rounded-xl gap-1 border-border hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300"
                                    >
                                        <Plus className="h-3 w-3" /> Area
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Feed of Location Cards */
                        data.map((item, index) => {
                            const geomType = item.geom?.type || "Point";
                            const metrics = getMetrics(item.geom);
                            const isCurrentlyEditing = savingId === item.id;
                            const isCopied = copiedId === item.id;

                            return (
                                <div
                                    key={item.id}
                                    className="group relative rounded-2xl border border-border bg-card hover:bg-muted/20 hover:border-indigo-400/50 dark:hover:border-indigo-600/50 transition-all duration-200 shadow-sm p-3 flex flex-col gap-2.5"
                                >
                                    {/* Card Header: Type Badge & Quick Actions */}
                                    <div className="flex items-center justify-between gap-2">
                                        {/* Type Pill */}
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {geomType === "Point" && (
                                                <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 text-[10px] font-bold gap-1 px-2 py-0.5 rounded-lg shadow-none">
                                                    <MapPin className="h-3 w-3 text-rose-500" />
                                                    Titik #{index + 1}
                                                </Badge>
                                            )}
                                            {geomType === "LineString" && (
                                                <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 text-[10px] font-bold gap-1 px-2 py-0.5 rounded-lg shadow-none">
                                                    <Route className="h-3 w-3 text-blue-500" />
                                                    Garis #{index + 1}
                                                </Badge>
                                            )}
                                            {geomType === "Polygon" && (
                                                <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 text-[10px] font-bold gap-1 px-2 py-0.5 rounded-lg shadow-none">
                                                    <Pentagon className="h-3 w-3 text-emerald-500" />
                                                    Area #{index + 1}
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Action Icon Buttons */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            {/* Focus / Zoom Button */}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => onFocus(item)}
                                                        className="h-7 w-7 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg cursor-pointer"
                                                    >
                                                        <LocateFixed className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">
                                                    <p className="text-xs font-semibold">Fokuskan di Peta</p>
                                                </TooltipContent>
                                            </Tooltip>

                                            {/* Edit / Redraw Button */}
                                            {isEditable && onEdit && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => onEdit(item)}
                                                            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg cursor-pointer"
                                                        >
                                                            <Edit3 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">
                                                        <p className="text-xs font-semibold">Ubah Posisi Geometri</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}

                                            {/* Delete Button */}
                                            {isEditable && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setDeleteItem(item)}
                                                            className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">
                                                        <p className="text-xs font-semibold">Hapus Lokasi Ini</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </div>
                                    </div>

                                    {/* Card Body: Description Input */}
                                    <div className="space-y-1">
                                        {isEditable ? (
                                            <input
                                                type="text"
                                                value={editingValues[item.id] !== undefined ? editingValues[item.id] : (item.keterangan_geometry || '')}
                                                onChange={(e) => handleTextChange(item.id, e.target.value)}
                                                onBlur={() => handleSaveInline(item)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        handleSaveInline(item);
                                                        e.currentTarget.blur();
                                                    }
                                                }}
                                                disabled={isCurrentlyEditing}
                                                className="w-full font-bold text-xs text-foreground bg-transparent hover:bg-muted/40 focus:bg-background border border-transparent hover:border-border focus:border-indigo-500 rounded-lg px-2 py-1 transition-all focus:outline-none placeholder:text-muted-foreground/60"
                                                placeholder="Beri nama / keterangan lokasi..."
                                            />
                                        ) : (
                                            <p className="font-bold text-xs text-foreground px-2 py-0.5">
                                                {item.keterangan_geometry || <span className="italic text-muted-foreground font-normal">Tanpa keterangan lokasi</span>}
                                            </p>
                                        )}
                                    </div>

                                    {/* Card Footer: Metric & 1-Click Copy */}
                                    {metrics && (
                                        <div className="pt-2 border-t border-border flex items-center justify-between gap-2 text-[10.5px]">
                                            <div className="min-w-0 flex items-center gap-1.5 text-muted-foreground">
                                                <span className="font-bold text-foreground truncate">
                                                    {metrics.value}
                                                </span>
                                                {metrics.extra && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-[9.5px] truncate">{metrics.extra}</span>
                                                    </>
                                                )}
                                            </div>

                                            {/* Copy Button */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleCopy(item, metrics.copyText)}
                                                className="h-6 px-2 text-[9.5px] font-bold rounded-md gap-1 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 cursor-pointer"
                                                title="Salin Koordinat"
                                            >
                                                {isCopied ? (
                                                    <>
                                                        <Check className="h-3 w-3 text-emerald-600" />
                                                        <span className="text-emerald-600">Disalin</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="h-3 w-3" />
                                                        <span>Salin</span>
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Delete Confirmation Alert Dialog */}
                {isEditable && (
                    <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
                        <AlertDialogContent className="rounded-2xl">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-sm font-bold">Hapus Lokasi Spasial?</AlertDialogTitle>
                                <AlertDialogDescription className="text-xs">
                                    Lokasi <span className="font-bold text-foreground">{deleteItem?.keterangan_geometry || "ini"}</span> akan dihapus secara permanen dari peta usulan. Tindakan ini tidak dapat dibatalkan.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex gap-2">
                                <AlertDialogCancel disabled={isDeleting} className="rounded-xl text-xs">Batal</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDelete}
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs"
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? "Menghapus..." : "Ya, Hapus Lokasi"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
        </TooltipProvider>
    );
}
