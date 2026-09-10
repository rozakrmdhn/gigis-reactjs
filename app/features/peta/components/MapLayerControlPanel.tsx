import { Layers, X, GripVertical, Trash2, Eye, EyeOff, RotateCcw, Filter, RefreshCw, Play, SunMedium } from "lucide-react";
import { useState, useEffect } from "react";
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
            const url = new URL(layer.url, window.location.origin);
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

    const applyBuilderFilter = () => {
        if (!builderField) return;
        
        const attr = attributes?.find(a => a.name === builderField);
        const isString = attr?.type.toLowerCase().includes('string') || attr?.type.toLowerCase().includes('text');
        
        let formattedVal = builderVal;
        if (isString) {
            if ((builderOp === 'LIKE' || builderOp === 'ILIKE') && !builderVal.includes('%')) {
                formattedVal = `'%${builderVal}%'`;
            } else {
                formattedVal = `'${builderVal}'`;
            }
        }

        const newCql = `${builderField} ${builderOp} ${formattedVal}`;
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
                "group flex flex-col p-3 rounded-xl border transition-all select-none",
                isDragging
                    ? "bg-slate-800 border-white/20 shadow-2xl opacity-90 scale-[1.02]"
                    : "bg-[#0C101A] border-white/[0.08] hover:border-white/[0.16]",
                hasActiveFilter && !isDragging && "border-amber-500/40 ring-1 ring-amber-500/20"
            )}
        >
            <div className="flex items-center gap-3">
                <div
                    {...dndAttributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-white transition-colors"
                >
                    <GripVertical size={16} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={cn(
                            "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border border-white/[0.08]",
                            layer.type === 'wms' ? "bg-slate-800 text-slate-300" : "bg-emerald-950/50 text-emerald-400 border-emerald-800/40"
                        )}>
                            {layer.type}
                        </span>
                        {isLegacy && (
                            <span className={cn(
                                "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest shadow-sm border border-white/[0.08]",
                                layerStyle.bgDark || "bg-slate-800",
                                layerStyle.text || "text-slate-300"
                            )}>
                                Core
                            </span>
                        )}
                        {hasActiveFilter && (
                            <span className="text-[7px] font-black px-1 py-0.5 rounded bg-amber-950/50 text-amber-400 border border-amber-800/40 uppercase tracking-widest animate-pulse">
                                Filtered
                            </span>
                        )}
                    </div>
                    <h4 className="text-xs font-bold text-white truncate">
                        {layer.title}
                    </h4>
                </div>

                <div className="flex items-center gap-1">
                    {isWms && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-7 w-7 rounded-lg transition-all cursor-pointer",
                                isFilterOpen
                                    ? "bg-white text-slate-950 hover:bg-slate-200"
                                    : (hasActiveFilter ? "text-amber-400 bg-amber-950/40 border border-amber-800/40" : "text-slate-400 hover:text-white hover:bg-white/[0.08]")
                            )}
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            title="Filter Layer"
                        >
                            <Filter size={14} />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-7 w-7 rounded-lg transition-colors cursor-pointer",
                            layer.visible !== false ? "text-emerald-400 bg-emerald-950/40 border border-emerald-800/40" : "text-slate-500 hover:text-slate-300"
                        )}
                        onClick={() => onToggleVisibility(layer.id)}
                        title={layer.visible !== false ? "Sembunyikan layer" : "Tampilkan layer"}
                    >
                        {layer.visible !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                    </Button>
                    {!isLegacy && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 cursor-pointer"
                            onClick={() => onRemoveLayer(layer.id)}
                            title="Hapus layer dari peta"
                        >
                            <Trash2 size={14} />
                        </Button>
                    )}
                </div>
            </div>

            {/* Expansions */}
            <div className="pl-7 space-y-3 overflow-hidden transition-all">
                {/* Opacity Slider */}
                <div className="mt-2.5 p-2.5 bg-[#090D16] rounded-xl border border-white/[0.06] space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[10px]">
                            <SunMedium size={12} className="text-emerald-400" />
                            <span>Opasitas Layer</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/40 font-mono font-bold text-[10px] text-emerald-300">
                            {Math.round((layer.opacity ?? 1) * 100)}%
                        </span>
                    </div>

                    <div className="space-y-1">
                        <Slider
                            value={[(layer.opacity ?? 1) * 100]}
                            max={100}
                            min={0}
                            step={5}
                            className="cursor-pointer"
                            trackClassName="bg-slate-900 border border-white/[0.08] h-2"
                            rangeClassName="bg-gradient-to-r from-emerald-600 to-emerald-400"
                            thumbClassName="border-2 border-emerald-400 bg-[#0B101D] size-4 hover:scale-110 focus-visible:ring-emerald-500/40"
                            onValueChange={(val) => onOpacityChange(layer.id, val[0] / 100)}
                        />
                        <div className="flex justify-between items-center text-[8px] text-slate-500 font-semibold px-0.5 uppercase tracking-wider">
                            <span>0% Transparan</span>
                            <span>100% Pekat</span>
                        </div>
                    </div>
                </div>

                {/* Filter Builder Section */}
                <Collapsible open={isFilterOpen && isWms}>
                    <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                        <div className="mt-2 p-3 bg-[#080B11] rounded-xl border border-white/[0.08] space-y-3">
                            {/* Header Discovery */}
                            <div className="flex items-center justify-between">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <Filter size={10} /> Filter Builder
                                </span>
                                <button 
                                    onClick={fetchLayerSchema}
                                    disabled={loadingAttributes}
                                    className="text-[8px] font-bold text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
                                >
                                    <RefreshCw size={10} className={cn(loadingAttributes && "animate-spin")} />
                                </button>
                            </div>
                            
                            {/* Row 1: Attribute & Symbol */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[7px] font-black text-slate-400 uppercase ml-0.5">Atribut</label>
                                    <Select value={builderField} onValueChange={setBuilderField}>
                                        <SelectTrigger size="sm" className="h-8 text-[9px] font-bold bg-slate-900 border-white/[0.08] text-white rounded-lg w-full">
                                            <SelectValue placeholder="Pilih field..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#0C101A] border-white/[0.08] text-slate-200">
                                            {attributes?.map(attr => (
                                                <SelectItem key={attr.name} value={attr.name} className="text-[10px] font-medium text-slate-200 focus:bg-slate-800 focus:text-white">
                                                    {attr.name} <span className="text-[8px] text-slate-500 italic">({attr.type})</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[7px] font-black text-slate-400 uppercase ml-0.5">Simbol</label>
                                    <Select value={builderOp} onValueChange={setBuilderOp}>
                                        <SelectTrigger size="sm" className="h-8 text-[9px] font-black bg-slate-900 border-white/[0.08] text-white rounded-lg w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#0C101A] border-white/[0.08] text-slate-200">
                                            {CQL_OPERATORS.map(op => (
                                                <SelectItem key={op.value} value={op.value} className="text-[10px] font-bold text-slate-200 focus:bg-slate-800 focus:text-white">
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
                                    placeholder="Ketik nilai filter..."
                                    className="h-8 text-[10px] font-medium bg-slate-900 border-white/[0.08] text-white rounded-lg focus-visible:ring-white/20 w-full placeholder:text-slate-500"
                                />
                            </div>

                            {/* Row 3: Actions */}
                            <div className="flex gap-2 pt-1">
                                <Button 
                                    onClick={applyBuilderFilter}
                                    disabled={!builderField || !builderVal}
                                    className="flex-1 h-8 bg-white text-slate-950 hover:bg-slate-200 text-[9px] font-black rounded-lg transition-all uppercase tracking-widest gap-2 cursor-pointer shadow-sm"
                                >
                                    <Play size={10} fill="currentColor" /> Terapkan Filter
                                </Button>
                                {hasActiveFilter && (
                                    <Button 
                                        onClick={resetFilter}
                                        variant="outline"
                                        className="px-3 h-8 text-[9px] font-black text-rose-400 border-rose-900/40 hover:bg-rose-950/40 rounded-lg uppercase tracking-widest cursor-pointer"
                                    >
                                        Reset
                                    </Button>
                                )}
                            </div>

                            {!attributes && !loadingAttributes && (
                                <button 
                                    onClick={fetchLayerSchema}
                                    className="w-full py-2 border border-dashed border-white/[0.1] rounded-lg text-[9px] font-bold text-slate-400 hover:text-white hover:border-white/30 transition-all uppercase tracking-widest cursor-pointer"
                                >
                                    Muat Daftar Atribut
                                </button>
                            )}
                            
                            {hasActiveFilter && (
                                <div className="p-2 bg-slate-900 rounded-lg border border-amber-500/30">
                                    <p className="text-[8px] font-bold text-amber-400 uppercase tracking-widest opacity-80 mb-1">Filter Aktif:</p>
                                    <p className="text-[9px] font-mono text-slate-200 break-all bg-black/40 p-1.5 rounded border border-white/[0.06]">
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
        <div className="flex flex-col h-full bg-[#080B11] text-slate-200 overflow-hidden">
            {/* Header / Info bar */}
            <div className="px-4 py-2.5 border-b border-white/[0.08] bg-[#0E131F]/90 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                    {layers.length} Layer Terpasang di Peta
                </span>
                {onReset && (
                    <Button variant="ghost" size="sm" onClick={onReset} className="h-7 px-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg gap-1.5 transition-all cursor-pointer">
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
                            <div className="space-y-2.5 pb-8">
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
                            <Layers className="text-slate-800" size={48} />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <X className="text-slate-700" size={24} />
                            </div>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Belum ada layer aktif</p>
                        <p className="text-[10px] text-slate-500 italic">Pilih dataset dari katalog untuk menampilkan data di peta.</p>
                    </div>
                )}
            </div>

            {/* Footer Tips */}
            <div className="p-3 bg-[#0E131F]/90 border-t border-white/[0.08]">
                <p className="text-[9px] text-center text-slate-500 font-medium italic">
                    Tarik <GripVertical className="inline w-2 h-2 mb-0.5" /> untuk mengatur urutan tumpukan layer
                </p>
            </div>
        </div>
    );
}
