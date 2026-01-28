import { MapPin, Pencil, Search, X, ChevronLeft, ChevronRight, List, Plus, Trash2, Info } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "~/components/ui/alert-dialog";

interface RoadSegmentsPanelProps {
    isVisible: boolean;
    onClose: () => void;
    segments: any[];
    onZoom: (feature: any) => void;
    onEdit: (feature: any) => void;
    onDelete?: (feature: any) => void;
    onAddRuas?: () => void;
    onAddLingkungan?: () => void;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    className?: string;
}

export function RoadSegmentsPanel({
    isVisible,
    onClose,
    segments,
    onZoom,
    onEdit,
    onDelete,
    onAddRuas,
    onAddLingkungan,
    isOpen: propIsOpen,
    onOpenChange,
    className
}: RoadSegmentsPanelProps) {
    const [internalIsOpen, setInternalIsOpen] = useState(true);

    const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
    const [activeTab, setActiveTab] = useState("ruas");

    if (!isVisible) return null;

    const handleToggle = () => {
        if (onOpenChange) {
            onOpenChange(!isOpen);
        } else {
            setInternalIsOpen(!isOpen);
        }
    };

    // Split segments into categories
    const ruasSegments = segments.filter(s => {
        const props = s.getProperties ? s.getProperties() : s;
        return !props.is_lingkungan_segment;
    });

    const lingkunganSegments = segments.filter(s => {
        const props = s.getProperties ? s.getProperties() : s;
        return props.is_lingkungan_segment === true;
    });

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
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0 h-5">
                                {props.jenis_perkerasan}
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

                <div className="p-2 rounded-lg bg-amber-50/50 border border-amber-100/50 text-[12px] text-slate-600 italic">
                    <Info className="inline w-4 h-4 mr-2 text-amber-500 shrink-0" />
                    {props.sumber_data}
                    <span className="block text-[10px] text-slate-400">Update: {props.created_at ? new Date(props.created_at).toLocaleDateString() : '-'}</span>
                </div>

                <span className="text-[10px] font-normal text-slate-600 italic">{props.id}</span>

                <div className="flex gap-2 mt-1">
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs flex-1 gap-1.5 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 shadow-sm"
                        onClick={() => onZoom(segment)}
                    >
                        <Search className="w-3 h-3" />
                        Zoom
                    </Button>
                    {!props.is_base_jalan && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs flex-1 gap-1.5 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 shadow-sm"
                            onClick={() => onEdit(segment)}
                        >
                            <Pencil className="w-3 h-3" />
                            Edit
                        </Button>
                    )}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs flex-1 gap-1.5 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 shadow-sm"
                            >
                                <Trash2 className="w-3 h-3" />
                                Delete
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data segmen jalan ini secara permanen dari server.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                                    onClick={() => onDelete?.(segment)}
                                >
                                    Hapus
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        );
    };

    const SegmentList = ({ items, emptyMessage, onAdd, addLabel }: { items: any[], emptyMessage: string, onAdd?: () => void, addLabel: string }) => (
        <ScrollArea className="h-[calc(100vh-14rem)]">
            <div className="flex flex-col gap-3 p-3">
                {items.length === 0 ? (
                    <div className="text-center py-12 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        <List className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{emptyMessage}</p>
                    </div>
                ) : (
                    items.map((seg, idx) => renderSegmentItem(seg, idx))
                )}

                {onAdd && (
                    <Button
                        onClick={onAdd}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] h-10 gap-2 shadow-lg shadow-blue-200 rounded-xl uppercase tracking-widest mt-2 shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        {addLabel}
                    </Button>
                )}
            </div>
        </ScrollArea>
    );

    return (
        <div className={cn(
            "absolute inset-y-0 right-0 z-30 w-full sm:w-80 bg-white/95 backdrop-blur-md border-l border-slate-200 shadow-2xl transition-transform duration-500 ease-in-out transform flex flex-col",
            isOpen ? "translate-x-0" : "translate-x-full",
            className
        )}>
            {/* Toggle Button */}
            <Button
                variant="secondary"
                size="icon"
                className="absolute top-1/2 -translate-y-1/2 -left-8 h-10 w-8 rounded-r-none shadow-md z-50 bg-white border border-l-0 cursor-pointer border-slate-200"
                onClick={handleToggle}
            >
                {isOpen ? <ChevronRight className="h-4 w-4 text-slate-600" /> : <ChevronLeft className="h-4 w-4 text-slate-600" />}
            </Button>

            <div className="p-3 border-b bg-white space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-100">
                            <List className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-600 tracking-tight uppercase">Segmen List</h2>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">
                                {segments.length} total entry
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100" onClick={handleToggle}>
                        <X className="w-4 h-4 text-slate-500" />
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0 gap-0">
                    <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100">
                        <TabsList className="grid w-full grid-cols-2 h-9 p-1 bg-slate-200/50 rounded-xl">
                            <TabsTrigger
                                value="ruas"
                                className="text-[10px] font-bold uppercase tracking-tight data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-lg transition-all"
                            >
                                Ruas Jalan
                            </TabsTrigger>
                            <TabsTrigger
                                value="lingkungan"
                                className="text-[10px] font-bold uppercase tracking-tight data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-lg transition-all"
                            >
                                Lingkungan
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="ruas" className="flex-1 min-h-0 p-0 mt-0 focus-visible:outline-none">
                        <SegmentList items={ruasSegments} emptyMessage="Tidak ada segmen ruas jalan" onAdd={onAddRuas} addLabel="TAMBAH SEGMEN RUAS" />
                    </TabsContent>

                    <TabsContent value="lingkungan" className="flex-1 min-h-0 p-0 mt-0 focus-visible:outline-none">
                        <SegmentList items={lingkunganSegments} emptyMessage="Tidak ada jalan lingkungan" onAdd={onAddLingkungan} addLabel="TAMBAH JALAN LINGKUNGAN" />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
