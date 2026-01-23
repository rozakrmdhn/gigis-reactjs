import { MapPin, Pencil, Search, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";

interface RoadSegmentsPanelProps {
    isVisible: boolean;
    onClose: () => void;
    segments: any[];
    onZoom: (feature: any) => void;
    onEdit: (feature: any) => void;
    className?: string;
}

export function RoadSegmentsPanel({
    isVisible,
    onClose,
    segments,
    onZoom,
    onEdit,
    className
}: RoadSegmentsPanelProps) {
    if (!isVisible) return null;

    // Group segments by type/source if possible, or just list them.
    // Assuming segments are OL features or objects with properties.
    const renderSegmentItem = (segment: any, index: number) => {
        const props = segment.getProperties ? segment.getProperties() : segment;
        const condition = props.kondisi || "Unknown";
        const year = props.tahun_pembangunan || "-";
        const type = props.is_base_jalan ? "Jalan Utama" : (props.sumber_data || "Segmen");

        let colorClass = "bg-slate-100 text-slate-600";
        if (condition.toLowerCase().includes("baik")) colorClass = "bg-emerald-100 text-emerald-700";
        if (condition.toLowerCase().includes("sedang")) colorClass = "bg-blue-100 text-blue-700";
        if (condition.toLowerCase().includes("rusak")) colorClass = "bg-rose-100 text-rose-700";

        return (
            <div key={index} className="flex flex-col gap-2 p-3 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0 h-5">
                                {type}
                            </Badge>
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase", colorClass)}>
                                {condition}
                            </span>
                        </div>
                        <p className="text-xs font-medium text-slate-600">
                            Tahun: <span className="font-bold text-slate-800">{year}</span>
                        </p>
                    </div>
                </div>

                <div className="flex gap-2 mt-1">
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs flex-1 gap-1.5 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                        onClick={() => onZoom(segment)}
                    >
                        <Search className="w-3 h-3" />
                        Zoom
                    </Button>
                    {!props.is_base_jalan && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs flex-1 gap-1.5 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200"
                            onClick={() => onEdit(segment)}
                        >
                            <Pencil className="w-3 h-3" />
                            Edit
                        </Button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={cn(
            "absolute top-4 bottom-4 right-4 w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 z-30 flex flex-col animate-in slide-in-from-right-4 duration-500",
            className
        )}>
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <div>
                    <h3 className="font-bold text-slate-800 text-sm">Daftar Segmen</h3>
                    <p className="text-[10px] text-slate-500 font-medium">
                        {segments.length} segment ditemukan
                    </p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100" onClick={onClose}>
                    <X className="w-4 h-4 text-slate-500" />
                </Button>
            </div>

            <ScrollArea className="flex-1 p-3">
                <div className="flex flex-col gap-3">
                    {segments.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-xs">
                            Tidak ada segmen data.
                        </div>
                    ) : (
                        segments.map((seg, idx) => renderSegmentItem(seg, idx))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
