import { Layers, X, GripVertical, Trash2, Eye, EyeOff, RotateCcw, Filter, Search, Info, Loader2, RefreshCw, Play } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Slider } from "~/components/ui/slider";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { Collapsible, CollapsibleContent } from "~/components/ui/collapsible";
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
import type { MapLayerConfig } from "./OpenLayersMap";
import { getCoreLayerStyle } from "~/lib/map-config";

const CQL_OPERATORS = [
    { label: "=", value: "=" },
    { label: "!=", value: "!=" },
    { label: ">", value: ">" },
    { label: "<", value: "<" },
    { label: ">=", value: ">=" },
    { label: "<=", value: "<=" },
    { label: "LIKE", value: "LIKE" },
    { label: "ILIKE", value: "ILIKE" },
];

interface SortableLayerItemProps {
    layer: MapLayerConfig;
    onToggleVisibility: (id: string) => void;
    onRemoveLayer: (id: string) => void;
    onOpacityChange: (id: string, opacity: number) => void;
    onUpdateParams: (id: string, params: any) => void;
}

function SortableLayerItem({
    layer,
    onToggleVisibility,
    onRemoveLayer,
    onOpacityChange,
    onUpdateParams,
}: SortableLayerItemProps) {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [attributes, setAttributes] = useState<{ name: string; type: string }[] | null>(null);
    const [loadingAttributes, setLoadingAttributes] = useState(false);

    // Builder State
    const [builderField, setBuilderField] = useState("");
    const [builderOp, setBuilderOp] = useState("=");
    const [builderVal, setBuilderVal] = useState("");
    const isLegacy = layer.id.startsWith('legacy_');
    const isWms = layer.type === 'wms';
    const hasActiveFilter = !!layer.params?.CQL_FILTER;

    const {
        attributes: dndAttributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: layer.id });

    // Fetch Layer Schema (DescribeFeatureType)
    const fetchLayerSchema = async () => {
        if (!isWms || !layer.url) return;
        setLoadingAttributes(true);
        try {
            // Construct WFS URL from WMS URL
            const url = new URL(layer.url);
            url.searchParams.set('service', 'WFS');
            url.searchParams.set('version', '1.0.0');
            url.searchParams.set('request', 'DescribeFeatureType');
            url.searchParams.set('typeName', layer.params.LAYERS);
            url.searchParams.set('outputFormat', 'application/json');

            const response = await fetch(url.toString());
            const data = await response.json();
            
            if (data.targetNamespace && data.featureTypes?.[0]?.properties) {
                const fields = data.featureTypes[0].properties.map((p: any) => ({
                    name: p.name,
                    type: p.type.split(':').pop() || p.type
                }));
                // Filter out common geom fields
                setAttributes(fields.filter((f: any) => !f.type.toLowerCase().includes('geometry')));
            }
        } catch (error) {
            console.error('Failed to fetch layer schema:', error);
        } finally {
            setLoadingAttributes(false);
        }
    };

    useEffect(() => {
        if (isFilterOpen && !attributes && !loadingAttributes) {
            fetchLayerSchema();
        }
    }, [isFilterOpen]);

    const handleAttributeClick = (attrName: string) => {
        setBuilderField(attrName);
    };

    const applyBuilderFilter = () => {
        if (!builderField) return;
        
        // Smart quote handling for strings
        const attr = attributes?.find(a => a.name === builderField);
        const isString = attr?.type.toLowerCase().includes('string') || attr?.type.toLowerCase().includes('text');
        
        let formattedVal = builderVal;
        if (isString) {
            // Ensure single quotes for CQL strings
            // Handle LIKE/ILIKE wildcards if not already present
            if ((builderOp === 'LIKE' || builderOp === 'ILIKE') && !builderVal.includes('%')) {
                formattedVal = `'%${builderVal}%'`;
            } else {
                formattedVal = `'${builderVal}'`;
            }
        }

        const newCql = `${builderField} ${builderOp} ${formattedVal}`;
        // Update both local state and parent state
        onUpdateParams(layer.id, { CQL_FILTER: newCql });
    };

    const resetFilter = () => {
        setBuilderField("");
        setBuilderVal("");
        onUpdateParams(layer.id, { CQL_FILTER: null });
    };

    const sortableStyle = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : 1,
    };

    const layerStyle = getCoreLayerStyle(layer.id);

    return (
        <div
            ref={setNodeRef}
            style={sortableStyle}
            className={cn(
                "group flex flex-col p-2.5 rounded-xl border transition-all",
                isDragging
                    ? "bg-blue-50/90 dark:bg-blue-900/40 border-blue-200 dark:border-blue-900 shadow-xl opacity-90 scale-[1.02]"
                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700",
                hasActiveFilter && !isDragging && "border-blue-200 dark:border-blue-800 ring-1 ring-blue-500/10"
            )}
        >
            <div className="flex items-center gap-3">
                <div
                    {...dndAttributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-1 text-slate-300 dark:text-slate-600 hover:text-blue-600 transition-colors"
                >
                    <GripVertical size={16} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn(
                            "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest",
                            layer.type === 'wms' ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                        )}>
                            {layer.type}
                        </span>
                        {isLegacy && (
                            <span className={cn(
                                "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest shadow-sm border",
                                layerStyle.bg,
                                layerStyle.bgDark,
                                layerStyle.text,
                                layerStyle.border
                            )}>
                                Core
                            </span>
                        )}
                        {hasActiveFilter && (
                            <span className="text-[7px] font-black px-1 py-0.5 rounded bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 uppercase tracking-widest animate-pulse">
                                Filtered
                            </span>
                        )}
                    </div>
                    <h4 className="text-[11px] font-extrabold text-slate-900 dark:text-slate-100 truncate uppercase tracking-tight">
                        {layer.title}
                    </h4>
                </div>

                <div className="flex items-center gap-1">
                    {isWms && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-7 w-7 rounded-lg transition-all",
                                isFilterOpen ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : (hasActiveFilter ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-blue-600 hover:bg-slate-50")
                            )}
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                        >
                            <Filter size={14} className={isFilterOpen ? "fill-white/20" : ""} />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-7 w-7 rounded-lg transition-colors",
                            layer.visible !== false ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20" : "text-slate-400"
                        )}
                        onClick={() => onToggleVisibility(layer.id)}
                    >
                        {layer.visible !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                    </Button>
                    {!isLegacy && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => onRemoveLayer(layer.id)}
                        >
                            <Trash2 size={14} />
                        </Button>
                    )}
                </div>
            </div>

            {/* Expansions */}
            <div className="pl-8 space-y-3 overflow-hidden transition-all">
                {/* Opacity Slider */}
                <div className="mt-2 text-slate-400 flex items-center gap-3">
                    <span className="text-[9px] font-bold uppercase tracking-tighter w-12 truncate shrink-0">
                        Alpha {Math.round((layer.opacity ?? 1) * 100)} %
                    </span>
                    <Slider
                        value={[(layer.opacity ?? 1) * 100]}
                        max={100}
                        step={1}
                        className="flex-1"
                        onValueChange={(val) => onOpacityChange(layer.id, val[0] / 100)}
                    />
                </div>

                {/* Filter Builder Section */}
                <Collapsible open={isFilterOpen && isWms}>
                    <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                        <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/50 space-y-3">
                            {/* Header Discovery */}
                            <div className="flex items-center justify-between">
                                <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <Filter size={10} /> Filter Builder
                                </span>
                                <button 
                                    onClick={fetchLayerSchema}
                                    disabled={loadingAttributes}
                                    className="text-[8px] font-bold text-slate-400 hover:text-blue-600 transition-colors p-1"
                                >
                                    <RefreshCw size={10} className={cn(loadingAttributes && "animate-spin")} />
                                </button>
                            </div>
                            
                            {/* Row 1: Attribute & Symbol */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[7px] font-black text-slate-400 uppercase ml-0.5">Atribut</label>
                                    <Select value={builderField} onValueChange={setBuilderField}>
                                        <SelectTrigger size="sm" className="h-8 text-[9px] font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg w-full">
                                            <SelectValue placeholder="Pilih field..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {attributes?.map(attr => (
                                                <SelectItem key={attr.name} value={attr.name} className="text-[10px] font-medium">
                                                    {attr.name} <span className="text-[8px] text-slate-400 italic">({attr.type})</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[7px] font-black text-slate-400 uppercase ml-0.5">Simbol</label>
                                    <Select value={builderOp} onValueChange={setBuilderOp}>
                                        <SelectTrigger size="sm" className="h-8 text-[9px] font-black bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CQL_OPERATORS.map(op => (
                                                <SelectItem key={op.value} value={op.value} className="text-[10px] font-bold">
                                                    {op.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Row 2: Value */}
                            <div className="space-y-1">
                                <label className="text-[7px] font-black text-slate-400 uppercase ml-0.5">Value</label>
                                <Input
                                    value={builderVal}
                                    onChange={(e) => setBuilderVal(e.target.value)}
                                    placeholder="Ketik nilai..."
                                    className="h-8 text-[10px] font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg focus-visible:ring-blue-500/30 w-full placeholder:font-normal"
                                />
                            </div>

                            {/* Row 3: Actions */}
                            <div className="flex gap-2 pt-1">
                                <Button 
                                    onClick={applyBuilderFilter}
                                    disabled={!builderField || !builderVal}
                                    className="flex-1 h-8 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black rounded-lg shadow-lg shadow-blue-200 dark:shadow-none transition-all uppercase tracking-widest gap-2"
                                >
                                    <Play size={10} fill="currentColor" /> Terapkan Filter
                                </Button>
                                {hasActiveFilter && (
                                    <Button 
                                        onClick={resetFilter}
                                        variant="outline"
                                        className="px-4 h-8 text-[9px] font-black text-rose-500 border-rose-100 hover:bg-rose-50 rounded-lg uppercase tracking-widest"
                                    >
                                        Reset
                                    </Button>
                                )}
                            </div>

                            {!attributes && !loadingAttributes && (
                                <button 
                                    onClick={fetchLayerSchema}
                                    className="w-full py-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-[9px] font-black text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-all uppercase tracking-widest"
                                >
                                    Muat Daftar Atribut
                                </button>
                            )}
                            
                            {hasActiveFilter && (
                                <div className="p-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100/50 dark:border-blue-900/20">
                                    <p className="text-[8px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest opacity-70 mb-1">Filter Aktif:</p>
                                    <p className="text-[9px] font-mono text-slate-600 dark:text-slate-300 break-all bg-white dark:bg-slate-900 p-1 rounded border border-blue-100 dark:border-blue-900/30">
                                        {layer.params.CQL_FILTER}
                                    </p>
                                </div>
                            )}
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </div>
        </div>
    );
}

interface MapLayerControlPanelProps {
    layers: MapLayerConfig[];
    onReorder: (layers: MapLayerConfig[]) => void;
    onToggleVisibility: (id: string) => void;
    onRemoveLayer: (id: string) => void;
    onOpacityChange: (id: string, opacity: number) => void;
    onUpdateLayerParams: (id: string, params: any) => void;
    onReset?: () => void;
}

export function MapLayerControlPanel({
    layers,
    onReorder,
    onToggleVisibility,
    onRemoveLayer,
    onOpacityChange,
    onUpdateLayerParams,
    onReset,
}: MapLayerControlPanelProps) {
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

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = layers.findIndex((l) => l.id === active.id);
            const newIndex = layers.findIndex((l) => l.id === over?.id);
            onReorder(arrayMove(layers, oldIndex, newIndex));
        }
    };

    return (
        <div className="flex flex-col h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-white dark:border-slate-800 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-200 dark:shadow-none">
                        <Layers size={18} />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight uppercase">MANAJEMEN LAYER</h3>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest italic">{layers.length} Layer Aktif</p>
                    </div>
                </div>

                {onReset && (
                    <Button variant="ghost" size="sm" onClick={onReset} className="h-8 px-2 text-[10px] font-bold text-slate-500 hover:text-blue-600 rounded-lg gap-1.5 uppercase transition-all">
                        <RotateCcw size={12} /> Reset
                    </Button>
                )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                {layers.length > 0 ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                        modifiers={[restrictToVerticalAxis]}
                    >
                        <SortableContext
                            items={layers.map((l) => l.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-3 pb-8">
                                {layers.map((layer) => (
                                <SortableLayerItem
                                    key={layer.id}
                                    layer={layer}
                                    onToggleVisibility={onToggleVisibility}
                                    onRemoveLayer={onRemoveLayer}
                                    onOpacityChange={onOpacityChange}
                                    onUpdateParams={onUpdateLayerParams}
                                />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-8 text-center gap-3">
                        <div className="relative">
                            <Layers className="text-slate-100 dark:text-slate-800" size={48} />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <X className="text-slate-200 dark:text-slate-700" size={24} />
                            </div>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Belum ada layer aktif</p>
                        <p className="text-[10px] text-slate-400 italic">Pilih dataset dari katalog untuk menampilkan data di peta.</p>
                    </div>
                )}
            </div>

            {/* Footer Tips */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[9px] text-center text-slate-400 font-medium italic">
                    Tarik <GripVertical className="inline w-2 h-2 mb-0.5" /> untuk mengatur urutan tumpukan layer
                </p>
            </div>
        </div>
    );
}
