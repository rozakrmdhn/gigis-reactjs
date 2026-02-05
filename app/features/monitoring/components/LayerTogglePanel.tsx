import { Layers, X, GripVertical, RotateCcw, Search, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import { useState, useMemo, useEffect } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
} from "~/components/ui/drawer";

interface LayerItem {
    id: string;
    label: string;
    visible: boolean;
    color?: string;
    lineDash?: number[];
}

interface LayerTogglePanelProps {
    isVisible: boolean;
    onClose: () => void;
    layers: LayerItem[];
    onToggle: (id: string, visible: boolean) => void;
    onReorder: (layers: LayerItem[]) => void;
    onResetOrder?: () => void;
    onClearAll?: () => void;
    className?: string;
    isShifted?: boolean;
}

function SortableLayerItem({
    layer,
    onToggle,
}: {
    layer: LayerItem;
    onToggle: (id: string, visible: boolean) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: layer.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : 1,
        touchAction: 'none'
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-50 transition-colors group border border-transparent",
                isDragging && "bg-blue-50/50 border-blue-200 shadow-lg opacity-90"
            )}
        >
            <div
                className="flex flex-1 items-center space-x-2 cursor-pointer min-w-0"
                onClick={() => onToggle(layer.id, !layer.visible)}
            >
                <Checkbox
                    id={layer.id}
                    checked={layer.visible}
                    onCheckedChange={(checked) => onToggle(layer.id, !!checked)}
                    className="h-4 w-4 border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 rounded-md shrink-0"
                />

                {/* Legend Icon */}
                {layer.color && (
                    <div className="flex items-center justify-center w-6 h-4 bg-slate-100/50 rounded-md overflow-hidden shrink-0">
                        <div
                            className={cn(
                                "w-full h-1 rounded-full",
                                layer.lineDash ? "border-t-[2px] border-dashed bg-transparent" : "bg-current"
                            )}
                            style={{
                                background: layer.lineDash ? 'transparent' : layer.color,
                                borderColor: layer.color,
                                color: layer.color
                            }}
                        />
                    </div>
                )}

                <Label
                    htmlFor={layer.id}
                    className="text-[10px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase tracking-tight truncate flex-1"
                    title={layer.label}
                >
                    {layer.label}
                </Label>
            </div>
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1.5 -mr-1 text-slate-300 hover:text-blue-600 transition-colors touch-none shrink-0"
            >
                <GripVertical className="w-3.5 h-3.5" />
            </div>
        </div>
    );
}

export function LayerTogglePanel({
    isVisible,
    onClose,
    layers,
    onToggle,
    onReorder,
    onResetOrder,
    onClearAll,
    className,
    isShifted
}: LayerTogglePanelProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = layers.findIndex((item) => item.id === active.id);
            const newIndex = layers.findIndex((item) => item.id === over?.id);

            onReorder(arrayMove(layers, oldIndex, newIndex));
        }
    }

    const filteredLayers = useMemo(() => {
        if (!searchQuery) return layers;
        return layers.filter(layer =>
            layer.label.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [layers, searchQuery]);

    return (
        <Drawer open={isVisible} onOpenChange={(open) => !open && onClose()} direction="right">
            <DrawerContent className={cn("h-full", className)}>
                <DrawerHeader className="p-3 border-b bg-slate-50 flex flex-col gap-3 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-600 rounded-lg text-white">
                                <Layers className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <DrawerTitle className="text-sm font-bold text-slate-900 tracking-tight">LAYER SETTINGS</DrawerTitle>
                                <DrawerDescription className="text-[10px] text-slate-500 uppercase font-semibold">Manage map layers</DrawerDescription>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-200">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Layer Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="SEARCH LAYERS..."
                            className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-[10px] font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </DrawerHeader>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Visible Layers</h3>
                            <div className="flex items-center gap-2">
                                {onClearAll && layers.some(l => l.id.startsWith("road-")) && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onClearAll}
                                        className="h-7 px-2 text-[9px] font-bold text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg gap-2 uppercase tracking-tight transition-all"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Clear All
                                    </Button>
                                )}
                                {onResetOrder && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onResetOrder}
                                        className="h-7 px-2 text-[9px] font-bold text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 rounded-lg gap-2 uppercase tracking-tight transition-all"
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        Reset Order
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1 pb-10">
                            {isMounted ? (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                    modifiers={[restrictToVerticalAxis]}
                                >
                                    <SortableContext
                                        items={filteredLayers.map((l: LayerItem) => l.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {filteredLayers.map((layer: LayerItem) => (
                                            <SortableLayerItem
                                                key={layer.id}
                                                layer={layer}
                                                onToggle={onToggle}
                                            />
                                        ))}
                                    </SortableContext>
                                </DndContext>
                            ) : (
                                // Server-side fallback without drag functionality
                                filteredLayers.map((layer: LayerItem) => (
                                    <div key={layer.id} className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent">
                                        <Checkbox
                                            id={layer.id}
                                            checked={layer.visible}
                                            onCheckedChange={(checked) => onToggle(layer.id, !!checked)}
                                            className="h-4 w-4 border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 rounded-md shrink-0"
                                        />
                                        {layer.color && (
                                            <div className="flex items-center justify-center w-6 h-4 bg-slate-100/50 rounded-md overflow-hidden shrink-0">
                                                <div
                                                    className={cn(
                                                        "w-full h-1 rounded-full",
                                                        layer.lineDash ? "border-t-[2px] border-dashed bg-transparent" : "bg-current"
                                                    )}
                                                    style={{
                                                        background: layer.lineDash ? 'transparent' : layer.color,
                                                        borderColor: layer.color,
                                                        color: layer.color
                                                    }}
                                                />
                                            </div>
                                        )}
                                        <Label
                                            htmlFor={layer.id}
                                            className="text-[10px] font-bold text-slate-700 cursor-pointer uppercase tracking-tight truncate flex-1"
                                            title={layer.label}
                                        >
                                            {layer.label}
                                        </Label>
                                    </div>
                                ))
                            )}

                            {filteredLayers.length === 0 && (
                                <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 px-4">
                                    <Search className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No layers found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DrawerFooter className="p-4 border-t bg-slate-50">
                    <p className="text-[9px] text-center text-slate-400 font-medium">
                        Drag <GripVertical className="inline w-2 h-2 mb-0.5" /> to reorder layers priority
                    </p>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}

