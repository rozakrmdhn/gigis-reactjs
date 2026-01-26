import { Layers, Check, GripVertical, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
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

interface LayerItem {
    id: string;
    label: string;
    visible: boolean;
    color?: string;
    lineDash?: number[];
}

interface LayerToggleProps {
    layers: LayerItem[];
    onToggle: (id: string, visible: boolean) => void;
    onReorder: (layers: LayerItem[]) => void;
    onResetOrder?: () => void;
    className?: string;
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
                "flex items-center space-x-3 p-1.5 rounded-lg hover:bg-slate-50 transition-colors group",
                isDragging && "bg-blue-50/50 border border-blue-200 shadow-lg opacity-90"
            )}
        >
            <div
                className="flex flex-1 items-center space-x-3 cursor-pointer"
                onClick={() => onToggle(layer.id, !layer.visible)}
            >
                <Checkbox
                    id={layer.id}
                    checked={layer.visible}
                    onCheckedChange={(checked) => onToggle(layer.id, !!checked)}
                    className="h-4 w-4 border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />

                {/* Legend Icon */}
                {layer.color && (
                    <div className="flex items-center justify-center w-6 h-4">
                        <div
                            className={cn(
                                "w-full h-0.5 rounded-full",
                                layer.lineDash ? "border-t-[1.5px] border-dashed bg-transparent" : "bg-current"
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
                    className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900 cursor-pointer uppercase tracking-tight"
                >
                    {layer.label}
                </Label>
            </div>
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-2 -mr-1 text-slate-400 hover:text-blue-600 transition-colors touch-none"
            >
                <GripVertical className="w-3.5 h-3.5" />
            </div>
        </div>
    );
}

export function LayerToggle({
    layers,
    onToggle,
    onReorder,
    onResetOrder,
    className
}: LayerToggleProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                // Larger distance for mobile to differentiate from tap
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

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                        "bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl hover:bg-slate-50 transition-all rounded-xl h-10 w-10 cursor-pointer",
                        className
                    )}
                >
                    <Layers className="h-5 w-5 text-slate-600" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-3 rounded-2xl border border-slate-100 shadow-2xl bg-white/95 backdrop-blur-md z-50">
                <div className="space-y-4">
                    {/* Layer Visibility Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Layers className="w-3.5 h-3.5 text-blue-600" />
                                <h3 className="text-[10px] font-black text-slate-800 tracking-wider uppercase">Map Layers</h3>
                            </div>
                            {onResetOrder && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onResetOrder}
                                    className="h-6 px-1.5 text-[9px] font-bold text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-lg gap-1.5 uppercase tracking-tighter transition-all"
                                >
                                    <RotateCcw className="w-2.5 h-2.5" />
                                    Reset
                                </Button>
                            )}
                        </div>

                        <div className="space-y-1">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                                modifiers={[restrictToVerticalAxis]}
                            >
                                <SortableContext
                                    items={layers.map(l => l.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {layers.map((layer) => (
                                        <SortableLayerItem
                                            key={layer.id}
                                            layer={layer}
                                            onToggle={onToggle}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
