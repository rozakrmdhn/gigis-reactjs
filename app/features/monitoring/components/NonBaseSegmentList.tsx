import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Search, Pencil, Trash2, MapPin } from "lucide-react";
import { cn } from "~/lib/utils";

interface NonBaseSegmentListProps {
    segments: any[];
    onZoom: (segment: any) => void;
    onEdit: (segment: any) => void;
    onDelete: (segment: any) => void;
    isLoading?: boolean;
}

export function NonBaseSegmentList({ segments, onZoom, onEdit, onDelete, isLoading }: NonBaseSegmentListProps) {
    if (isLoading) {
        return (
            <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-xl" />
                ))}
            </div>
        );
    }

    if (!segments || segments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 m-2">
                <MapPin className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs text-slate-400 font-medium tracking-tight">Belum ada jalan lingkungan dipetakan</p>
            </div>
        );
    }

    return (
        <div className="p-2 space-y-2">
            {segments.map((segment, idx) => {
                // Handle both Feature and plain object
                const props = segment.getProperties ? segment.getProperties() : segment.properties || segment;
                const id = segment.id || props.id;

                return (
                    <div key={id || idx} className="flex flex-col gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-200 transition-all shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-bold text-slate-800 truncate">
                                    {props.nama_jalan || "Tanpa Nama"}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-wider px-1.5 h-4">
                                        {props.status_jalan || "Non-Ruas"}
                                    </Badge>
                                    <span className="text-[10px] text-slate-500 font-medium">
                                        {props.panjang ? `${parseFloat(props.panjang).toFixed(1)}m` : "- m"}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1 truncate">
                                    {props.desa}, {props.kecamatan}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-1.5 mt-1">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] flex-1 gap-1 px-1 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 font-bold"
                                onClick={() => onZoom(segment)}
                            >
                                <Search className="w-3 h-3" />
                                ZOOM
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] flex-1 gap-1 px-1 border-slate-200 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 font-bold"
                                onClick={() => onEdit(segment)}
                            >
                                <Pencil className="w-3 h-3" />
                                EDIT
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] flex-1 gap-1 px-1 border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 font-bold"
                                onClick={() => {
                                    if (window.confirm("Hapus segmen jalan ini?")) {
                                        onDelete(segment);
                                    }
                                }}
                            >
                                <Trash2 className="w-3 h-3" />
                                DELETE
                            </Button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
