import { MapPin, Pencil, Search, X, ChevronLeft, ChevronRight, List, Plus, Trash2, Info, Ruler, RulerDimensionLineIcon, Activity } from "lucide-react";
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
    onMonitoring?: (feature: any) => void;
    onAddRuas?: () => void;
    onAddLingkungan?: () => void;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    className?: string;
    selectedRoad?: any | null;
}

export function RoadSegmentsPanel({
    isVisible,
    onClose,
    segments,
    onZoom,
    onEdit,
    onDelete,
    onMonitoring,
    onAddRuas,
    onAddLingkungan,
    isOpen: propIsOpen,
    onOpenChange,
    className,
    selectedRoad
}: RoadSegmentsPanelProps) {
    const [internalIsOpen, setInternalIsOpen] = useState(true);

    const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
    const [activeTab, setActiveTab] = useState("ruas");

    const formatNumber = (num: number) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
        if (props.check_melarosa === "Ya") return true;
        if (props.check_melarosa === "Tidak") return false;
        return !props.is_lingkungan_segment;
    });

    const lingkunganSegments = segments.filter(s => {
        const props = s.getProperties ? s.getProperties() : s;
        if (props.check_melarosa === "Tidak") return true;
        if (props.check_melarosa === "Ya") return false;
        return props.is_lingkungan_segment === true;
    });

    const renderSegmentItem = (segment: any, index: number) => {
        const props = segment.getProperties ? segment.getProperties() : segment;
        const condition = props.kondisi || "Unknown";
        const year = props.tahun_pembangunan || "-";
        const type = props.is_base_jalan ? "Jalan Utama" : (props.sumber_data || "Segmen");

        let colorClass = "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
        if (condition.toLowerCase().includes("baik")) colorClass = "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
        if (condition.toLowerCase().includes("sedang")) colorClass = "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
        if (condition.toLowerCase().includes("rusak")) colorClass = "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400";

        return (
            <div key={index} className="flex flex-col gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all">
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
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Tahun: <span className="font-bold text-slate-800 dark:text-slate-200">{year}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1">
                            <RulerDimensionLineIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            {formatNumber(props.panjang)} m
                        </div>
                        <div className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                            onClick={() => onZoom(segment)}
                        >
                            <Search className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>

                <div className="p-2 rounded-lg bg-amber-50/50 dark:bg-amber-900/20 border border-amber-100/50 dark:border-amber-900/30 text-[12px] text-slate-600 dark:text-slate-300 italic">
                    <Info className="inline w-4 h-4 mr-2 text-amber-500 shrink-0" />
                    {props.sumber_data}
                    <span className="block text-[10px] text-slate-400 dark:text-slate-500">Update: {props.created_at ? new Date(props.created_at).toLocaleDateString() : '-'}</span>
                </div>

                <span className="text-[10px] font-normal text-slate-600 dark:text-slate-400 italic">{props.id}</span>

                <div className="flex gap-2 mt-1">
                    {!props.is_base_jalan && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs flex-1 gap-1.5 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-200 dark:hover:border-amber-900/50 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                            onClick={() => onEdit(segment)}
                        >
                            <Pencil className="w-3 h-3" />
                            Edit
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs flex-1 gap-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-900/50 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                        onClick={() => onMonitoring?.(segment)}
                    >
                        <Activity className="w-3 h-3" />
                        Monitoring
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs flex-1 gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900/50 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
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
                    <div className="text-center py-12 px-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        <List className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2 opacity-50" />
                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{emptyMessage}</p>
                    </div>
                ) : (
                    items.map((seg, idx) => renderSegmentItem(seg, idx))
                )}

                {onAdd && (
                    <Button
                        onClick={onAdd}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] h-10 gap-2 shadow-lg shadow-blue-200 dark:shadow-blue-900/40 rounded-xl uppercase tracking-widest mt-2 shrink-0"
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
            "absolute inset-y-0 right-0 z-30 w-full sm:w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-500 ease-in-out transform flex flex-col",
            isOpen ? "translate-x-0" : "translate-x-full",
            className
        )}>
            {/* Toggle Button */}
            <Button
                variant="secondary"
                size="icon"
                className="absolute top-1/2 -translate-y-1/2 -left-8 h-10 w-8 rounded-r-none shadow-md z-50 bg-white dark:bg-slate-900 border border-l-0 cursor-pointer border-slate-200 dark:border-slate-800"
                onClick={handleToggle}
            >
                {isOpen ? <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" /> : <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />}
            </Button>

            <div className="p-3 border-b dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-100 dark:shadow-blue-900/40">
                            <List className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-600 tracking-tight uppercase">Segmen List</h2>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">
                                {segments.length} total entry
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" onClick={handleToggle}>
                        <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </Button>
                </div>

                {/* Road Info Section */}
                {selectedRoad && (
                    <div className="mt-2 p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl border border-blue-100/50 dark:border-blue-900/30 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1 bg-blue-500 rounded-lg">
                                <MapPin className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-[10px] uppercase font-black text-blue-600 dark:text-blue-400 tracking-widest">Ruas Terpilih</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight mb-3">
                            {selectedRoad.jalan.nama_ruas || 'Nama tidak tersedia'}
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded-xl border border-blue-100/30 dark:border-blue-900/30">
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">Panjang</p>
                                <p className="text-xs font-black text-slate-700 dark:text-slate-300">{formatNumber(selectedRoad.jalan.panjang)}m</p>
                            </div>
                            <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded-xl border border-blue-100/30 dark:border-blue-900/30">
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">Lebar</p>
                                <p className="text-xs font-black text-slate-700 dark:text-slate-300">{formatNumber(selectedRoad.jalan.lebar)}m</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 flex flex-col min-h-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0 gap-0">
                    <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                        <TabsList className="grid w-full grid-cols-2 h-9 p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl">
                            <TabsTrigger
                                value="ruas"
                                className="text-[10px] font-bold uppercase tracking-tight data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm rounded-lg transition-all dark:text-slate-400"
                            >
                                Ruas Jalan
                            </TabsTrigger>
                            <TabsTrigger
                                value="lingkungan"
                                className="text-[10px] font-bold uppercase tracking-tight data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm rounded-lg transition-all dark:text-slate-400"
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
