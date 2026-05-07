import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { cn } from "~/lib/utils";
import { PanelHeader } from "./PanelHeader";
import { SegmentList } from "./SegmentList";

export interface RoadSegmentsPanelProps {
    isVisible: boolean;
    onClose: () => void;
    segments: any[];
    onZoom: (feature: any) => void;
    onEdit: (feature: any) => void;
    onDelete?: (feature: any) => void;
    onMonitoring?: (feature: any) => void;
    onAddRuas?: (type: 'manual' | 'otomatis') => void;
    onAddNonMelarosa?: (type: 'manual' | 'otomatis') => void;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    className?: string;
    selectedRoad?: any | null;
    filters?: { kondisi: string; status_kondisi: string };
    onFilterChange?: (filters: { kondisi: string; status_kondisi: string }) => void;
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
    onAddNonMelarosa,
    isOpen: propIsOpen,
    onOpenChange,
    className,
    filters = { kondisi: 'all', status_kondisi: 'all' },
    onFilterChange
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

    // Split and Filter segments into categories
    const filterFn = (s: any) => {
        const props = s.getProperties ? s.getProperties() : s;
        
        if (filters.status_kondisi !== 'all') {
            if (props.status_kondisi !== filters.status_kondisi) return false;
        }
        
        if (filters.kondisi !== 'all') {
            const currentKondisi = (props.kondisi || "").toLowerCase().replace(/_/g, ' ');
            const targetKondisi = filters.kondisi.toLowerCase().replace(/_/g, ' ');
            if (!currentKondisi.includes(targetKondisi)) return false;
        }
        
        return true;
    };

    const ruasSegments = segments.filter(s => {
        const props = s.getProperties ? s.getProperties() : s;
        if (!filterFn(s)) return false;
        if (props.check_melarosa === "Ya") return true;
        if (props.check_melarosa === "Tidak") return false;
        return !props.is_lingkungan_segment;
    });

    const nonMelarosaSegments = segments.filter(s => {
        const props = s.getProperties ? s.getProperties() : s;
        if (!filterFn(s)) return false;
        if (props.check_melarosa === "Tidak") return true;
        if (props.check_melarosa === "Ya") return false;
        return props.is_lingkungan_segment === true;
    });

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
                className="absolute top-1/2 -translate-y-1/2 -left-8 h-10 w-8 rounded-r-none shadow-md z-50 bg-white dark:bg-slate-900 border border-l-0 cursor-pointer border-slate-200 dark:border-slate-800 shrink-0"
                onClick={handleToggle}
            >
                {isOpen ? <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" /> : <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />}
            </Button>

            <div className="flex-1 flex flex-col overflow-hidden">
                <PanelHeader title="Segmen List" onClose={handleToggle} />

                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0 gap-0">
                        <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 shrink-0">
                            <TabsList className="grid w-full grid-cols-2 h-9 p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl">
                                <TabsTrigger
                                    value="ruas"
                                    className="text-[10px] font-bold uppercase tracking-tight data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm rounded-lg transition-all dark:text-slate-400"
                                >
                                    Ruas ({ruasSegments.length})
                                </TabsTrigger>
                                <TabsTrigger
                                    value="lingkungan"
                                    className="text-[10px] font-bold uppercase tracking-tight data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm rounded-lg transition-all dark:text-slate-400"
                                >
                                    Non Melarosa ({nonMelarosaSegments.length})
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="ruas" className="flex-1 min-h-0 p-0 mt-0 focus-visible:outline-none flex flex-col data-[state=active]:flex overflow-hidden">
                            <SegmentList
                                items={ruasSegments}
                                emptyMessage="Tidak ada segmen ruas jalan"
                                onAdd={onAddRuas}
                                showFilter={true}
                                filters={filters}
                                onFilterChange={onFilterChange}
                                onZoom={onZoom}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onMonitoring={onMonitoring}
                            />
                        </TabsContent>

                        <TabsContent value="lingkungan" className="flex-1 min-h-0 p-0 mt-0 focus-visible:outline-none flex flex-col data-[state=active]:flex overflow-hidden">
                            <SegmentList
                                items={nonMelarosaSegments}
                                emptyMessage="Tidak ada segmen Non Melarosa"
                                onAdd={onAddNonMelarosa}
                                showFilter={false}
                                filters={filters}
                                onFilterChange={onFilterChange}
                                onZoom={onZoom}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onMonitoring={onMonitoring}
                            />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
