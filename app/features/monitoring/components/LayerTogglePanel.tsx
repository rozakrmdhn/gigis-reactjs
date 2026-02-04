import { Layers, X, GripVertical, RotateCcw } from "lucide-react";
import { Button } from "~/components/ui/button";
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

interface LayerTogglePanelProps {
    isVisible: boolean;
    onClose: () => void;
    layers: LayerItem[];
    onToggle: (id: string, visible: boolean) => void;
    onReorder: (layers: LayerItem[]) => void;
    onResetOrder?: () => void;
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
                "flex items-center space-x-3 p-2 rounded-xl hover:bg-slate-50 transition-colors group border border-transparent",
                isDragging && "bg-blue-50/50 border-blue-200 shadow-lg opacity-90"
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
                    className="h-5 w-5 border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 rounded-md"
                />

                {/* Legend Icon */}
                {layer.color && (
                    <div className="flex items-center justify-center w-7 h-5 bg-slate-100/50 rounded-md overflow-hidden">
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
                    className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase tracking-tight flex-1"
                >
                    {layer.label}
                </Label>
            </div>
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-2 -mr-1 text-slate-400 hover:text-blue-600 transition-colors touch-none"
            >
                <GripVertical className="w-4 h-4" />
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
}: LayerTogglePanelProps) {
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

    return (
        <div
            className={cn(
                "absolute inset-y-0 right-0 z-[60] w-full sm:w-[320px] bg-white border-l shadow-2xl transition-transform duration-500 ease-in-out transform flex flex-col",
                isVisible ? "translate-x-0" : "translate-x-full"
            )}
        >
            <div className="p-3 border-b bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-600 rounded-lg text-white">
                        <Layers className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 tracking-tight">LAYER SETTINGS</h2>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Manage map layers</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-200">
                    <X className="w-5 h-5" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Visible Layers</h3>
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

            <div className="p-4 border-t bg-slate-50">
                <p className="text-[9px] text-center text-slate-400 font-medium">
                    Drag <GripVertical className="inline w-2 h-2 mb-0.5" /> to reorder layers priority
                </p>
            </div>
        </div>
    );
}
