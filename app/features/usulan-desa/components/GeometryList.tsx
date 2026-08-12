import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
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
import { Search, MapPin, Route, Pentagon, Edit3, Trash2, Copy } from "lucide-react";
import { usulanDesaGeometryService } from "../services/usulan-desa-geometry.service";
import type { UsulanDesaGeometry } from "../types/usulan-desa.types";
import { toast } from "sonner";
import { cn } from "~/lib/utils";

interface GeometryListProps {
    data: UsulanDesaGeometry[];
    isLoading: boolean;
    onFocus: (item: UsulanDesaGeometry) => void;
    onRefresh: () => void;
    onEdit?: (item: UsulanDesaGeometry) => void; // If provided, shows edit and delete actions
}

export function GeometryList({ data, isLoading, onFocus, onRefresh, onEdit }: GeometryListProps) {
    const isEditable = !!onEdit;
    
    // States for deletion
    const [deleteItem, setDeleteItem] = useState<UsulanDesaGeometry | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // States for inline editing of descriptions
    const [editingValues, setEditingValues] = useState<Record<number | string, string>>({});
    const [savingId, setSavingId] = useState<number | string | null>(null);

    const formatCoordinatesText = (geom: any) => {
        if (!geom || !geom.coordinates) return "";
        if (geom.type === "Point") {
            const [lon, lat] = geom.coordinates;
            return `${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)}`;
        } else if (geom.type === "LineString") {
            return `Garis (${geom.coordinates.length} titik)`;
        } else if (geom.type === "Polygon") {
            return `Area (${geom.coordinates[0]?.length || 0} titik)`;
        }
        return geom.type;
    };

    const handleCopyCoordinates = (geom: any) => {
        if (!geom || !geom.coordinates) return;
        let textToCopy = "";
        if (geom.type === "Point") {
            const [lon, lat] = geom.coordinates;
            textToCopy = `${lat}, ${lon}`;
        } else if (geom.type === "LineString") {
            textToCopy = geom.coordinates.map((coord: any) => `${coord[1]}, ${coord[0]}`).join("\n");
        } else if (geom.type === "Polygon") {
            textToCopy = (geom.coordinates[0] || []).map((coord: any) => `${coord[1]}, ${coord[0]}`).join("\n");
        }

        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy)
                .then(() => toast.success("Koordinat lokasi berhasil disalin!"))
                .catch(() => toast.error("Gagal menyalin koordinat."));
        }
    };

    const handleTextChange = (id: number | string, val: string) => {
        setEditingValues(prev => ({ ...prev, [id]: val }));
    };

    const handleSaveInline = async (item: UsulanDesaGeometry) => {
        const currentVal = editingValues[item.id];
        // If undefined or hasn't changed, skip
        if (currentVal === undefined || currentVal.trim() === item.keterangan_geometry) {
            return;
        }

        if (currentVal.trim() === "") {
            toast.error("Keterangan lokasi tidak boleh kosong.");
            // Reset to original value
            setEditingValues(prev => {
                const updated = { ...prev };
                delete updated[item.id];
                return updated;
            });
            return;
        }

        setSavingId(item.id);
        try {
            // Sanitize geom to only include type and coordinates, avoiding extra fields like "crs"
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
            console.error("Gagal memperbarui keterangan inline:", err);
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
                toast.success("Geometry berhasil dihapus.");
                setDeleteItem(null);
                onRefresh();
            } else {
                toast.error("Gagal menghapus geometry.");
            }
        } catch (error) {
            console.error("Gagal menghapus geometry:", error);
            toast.error("Terjadi kesalahan saat menghapus data.");
        } finally {
            setIsDeleting(false);
        }
    };

    const renderTypeBadge = (type: string) => {
        switch (type) {
            case "Point":
                return (
                    <Badge className="bg-red-100 hover:bg-red-100 text-red-700 border border-red-200 font-semibold gap-1 pr-2">
                        <MapPin className="h-3 w-3" />
                        Titik
                    </Badge>
                );
            case "LineString":
                return (
                    <Badge className="bg-blue-100 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold gap-1 pr-2">
                        <Route className="h-3 w-3" />
                        Garis
                    </Badge>
                );
            case "Polygon":
                return (
                    <Badge className="bg-emerald-100 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold gap-1 pr-2">
                        <Pentagon className="h-3 w-3" />
                        Area
                    </Badge>
                );
            default:
                return <Badge variant="outline">{type}</Badge>;
        }
    };

    return (
        <Card className="border py-0 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-none border-none">
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/75 dark:bg-slate-900/50">
                                <TableHead className="w-[50px] text-center font-bold text-[10px] text-slate-400 dark:text-slate-550 uppercase tracking-wider">No</TableHead>
                                <TableHead className="w-[110px] font-bold text-[10px] text-slate-400 dark:text-slate-550 uppercase tracking-wider">Tipe</TableHead>
                                <TableHead className="font-bold text-[10px] text-slate-400 dark:text-slate-550 uppercase tracking-wider">Keterangan Lokasi</TableHead>
                                <TableHead className={cn("text-center font-bold text-[10px] text-slate-400 dark:text-slate-550 uppercase tracking-wider", isEditable ? "w-[120px]" : "w-[60px]")}>
                                    Aksi
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-slate-500 text-xs">
                                        Memuat data geometry...
                                    </TableCell>
                                </TableRow>
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10 text-slate-400 text-xs">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-2xl">📭</span>
                                            <span>Belum ada lokasi spasial yang disimpan.</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((item, index) => (
                                    <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                                        <TableCell className="text-center font-semibold text-slate-550 text-xs">
                                            {index + 1}
                                        </TableCell>
                                        <TableCell>
                                            {renderTypeBadge(item.geom.type)}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-700 dark:text-slate-350 p-1">
                                            <div className="flex flex-col gap-1 w-full">
                                                {isEditable ? (
                                                    <input
                                                        type="text"
                                                        value={editingValues[item.id] !== undefined ? editingValues[item.id] : item.keterangan_geometry}
                                                        onChange={(e) => handleTextChange(item.id, e.target.value)}
                                                        onBlur={() => handleSaveInline(item)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                handleSaveInline(item);
                                                                e.currentTarget.blur();
                                                            }
                                                        }}
                                                        disabled={savingId === item.id}
                                                        className="w-full bg-transparent hover:bg-slate-100/50 dark:hover:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:border-blue-500 rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-200 transition-all focus:outline-none disabled:opacity-50"
                                                        placeholder="Isi keterangan lokasi..."
                                                    />
                                                ) : (
                                                    <div className="px-2 py-1">
                                                        {item.keterangan_geometry || <span className="italic text-slate-400">—</span>}
                                                    </div>
                                                )}
                                                {item.geom && (
                                                    <div className="flex items-center gap-1.5 px-2 pb-1 text-[10px] text-slate-500 font-mono">
                                                        <span className="bg-slate-100 dark:bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-200/50 dark:border-slate-750/50 select-all truncate max-w-[180px]" title={formatCoordinatesText(item.geom)}>
                                                            {formatCoordinatesText(item.geom)}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-4 w-4 p-0 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded shrink-0"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCopyCoordinates(item.geom);
                                                            }}
                                                            title="Salin Koordinat"
                                                        >
                                                            <Copy className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 border-slate-200 dark:border-slate-800 text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/30"
                                                    onClick={() => onFocus(item)}
                                                    title="Fokus ke Peta"
                                                >
                                                    <Search className="h-4 w-4" />
                                                </Button>

                                                {isEditable && onEdit && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 border-slate-200 dark:border-slate-800 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                                            onClick={() => onEdit(item)}
                                                            title="Edit Lokasi & Keterangan"
                                                        >
                                                            <Edit3 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 border-slate-200 dark:border-slate-800 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                            onClick={() => setDeleteItem(item)}
                                                            title="Hapus Lokasi"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            {/* Dialog Konfirmasi Hapus */}
            {isEditable && (
                <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Geometry Lokasi?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Apakah Anda yakin ingin menghapus data spasial ini? Tindakan ini tidak dapat dibatalkan dan objek akan hilang dari peta usulan.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700 text-white font-semibold" disabled={isDeleting}>
                                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </Card>
    );
}
