import {
    Layers, X, GripVertical, RotateCcw, Search, Trash2,
    Database, Filter, Play, RefreshCw, Loader2, Eye, EyeOff, Plus
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import {
    Collapsible, CollapsibleContent
} from "~/components/ui/collapsible";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { cn, getProxiedLayerUrl } from "~/lib/utils";
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
    cql?: string;
    url?: string;
    wmsParams?: any;
    category?: string;
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
    onOpenCatalog?: () => void;
    onRemoveLayer?: (id: string) => void;
    onApplyCQL?: (id: string, cql: string) => void;
}

function SortableLayerItem({
    layer,
    onToggle,
    onRemove,
    onApplyCQL,
}: {
    layer: LayerItem;
    onToggle: (id: string, visible: boolean) => void;
    onRemove?: (id: string) => void;
    onApplyCQL?: (id: string, cql: string) => void;
}) {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [attributes, setAttributes] = useState<{ name: string; type: string }[] | null>(null);
    const [isLoadingAttrs, setIsLoadingAttrs] = useState(false);

    const [builderField, setBuilderField] = useState("");
    const [builderOp, setBuilderOp] = useState("=");
    const [builderVal, setBuilderVal] = useState("");

    const hasActiveFilter = !!layer.cql;

    const loadAttributes = async () => {
        if ((attributes && attributes.length > 0) || isLoadingAttrs) return;
        
        // We need either url/wmsParams or a valid geonode/wms prefixed ID
        if (!layer.url && !layer.id.startsWith('geonode-') && !layer.id.startsWith('wms-')) return;
        
        setIsLoadingAttrs(true);
        try {
            const fetchSchema = async () => {
                let url;
                let targetType = "";
                
                if (layer.url && layer.wmsParams?.LAYERS) {
                    targetType = layer.wmsParams.LAYERS;
                    const proxyUrl = getProxiedLayerUrl(layer.url);
                    url = new URL(proxyUrl, window.location.origin);
                    url.searchParams.set('service', 'WFS');
                    url.searchParams.set('version', '1.0.0');
                    url.searchParams.set('request', 'DescribeFeatureType');
                    url.searchParams.set('typeName', targetType);
                    url.searchParams.set('outputFormat', 'application/json');
                } else {
                    // Fallback using proxy pattern
                    targetType = layer.id;
                    if (targetType.startsWith('geonode-')) targetType = targetType.replace('geonode-', 'geonode:');
                    else if (targetType.startsWith('wms-')) targetType = targetType.replace('wms-', 'geonode:');
                    else if (!targetType.includes(':')) targetType = `geonode:${targetType}`;
                    
                    url = new URL(`/proxy/geoserver/wfs`, window.location.origin);
                    url.searchParams.set('service', 'WFS');
                    url.searchParams.set('version', '1.0.0');
                    url.searchParams.set('request', 'DescribeFeatureType');
                    url.searchParams.set('typeName', targetType);
                    url.searchParams.set('outputFormat', 'application/json');
                }

                console.log(`[CQL Builder] Schema discovery for ${targetType} via ${url.toString()}`);
                
                const response = await fetch(url.toString());
                if (!response.ok) return null;
                const text = await response.text();
                
                if (text.includes('ExceptionReport') || text.includes('ServiceException')) {
                    console.warn(`[CQL Builder] Exception for ${targetType}:`, text.substring(0, 200));
                    return null;
                }
                
                try {
                    const data = JSON.parse(text);
                    if (data.targetNamespace && data.featureTypes?.[0]?.properties) {
                        const fields = data.featureTypes[0].properties.map((p: any) => ({
                            name: p.name,
                            type: p.type.split(':').pop() || p.type
                        }));
                        return fields.filter((f: any) => !f.type.toLowerCase().includes('geometry') && !['geom', 'the_geom', 'fid', 'row_number'].includes(f.name.toLowerCase()));
                    }
                } catch (e) {
                    console.error("[CQL Builder] Failed to parse DescribeFeatureType JSON", e);
                }
                return null;
            };

            let parsedAttrs = await fetchSchema();

            if (parsedAttrs && parsedAttrs.length > 0) {
                console.log(`[CQL Builder] Schema loaded: ${parsedAttrs.length} attributes`);
                setAttributes(parsedAttrs);
                if (!builderField) setBuilderField(parsedAttrs[0].name);
            } else {
                console.warn("[CQL Builder] Failed to load schema after all attempts");
            }
        } catch (e) {
            console.error("[CQL Builder] Error loading attributes", e);
        } finally {
            setIsLoadingAttrs(false);
        }
    };

    useEffect(() => {
        if (isFilterOpen && !attributes && !isLoadingAttrs) {
            loadAttributes();
        }
    }, [isFilterOpen]);

    const handleApplyFilter = () => {
        if (!builderField || !builderVal) return;

        const attr = attributes?.find(a => a.name === builderField);
        const isString = attr?.type?.toLowerCase().includes('string') || attr?.type?.toLowerCase().includes('text');

        let val = builderVal.trim();

        if (isString) {
            if ((builderOp === 'LIKE' || builderOp === 'ILIKE') && !val.includes('%')) {
                val = `'%${val}%'`;
            } else if (!val.startsWith("'") && !val.startsWith('"')) {
                val = `'${val}'`;
            }
        }

        const newCql = `${builderField} ${builderOp} ${val}`;
        onApplyCQL?.(layer.id, newCql);
    };

    const handleResetFilter = () => {
        setBuilderField("");
        setBuilderVal("");
        onApplyCQL?.(layer.id, "");
    };

    const {
        attributes: dndAttributes,
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

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group flex flex-col p-2.5 rounded-xl border transition-all",
                isDragging
                    ? "bg-blue-50/90 dark:bg-blue-900/40 border-blue-200 dark:border-blue-900 shadow-xl opacity-90"
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
                    <GripVertical size={14} />
                </div>

                <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onToggle(layer.id, !layer.visible)}
                >
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            Dataset
                        </span>
                        {layer.color && (
                            <div className="flex items-center justify-center w-6 h-3 bg-slate-100/50 dark:bg-slate-800/50 rounded overflow-hidden shrink-0">
                                <div
                                    className={cn(
                                        "w-full h-0.5 rounded-full",
                                        layer.lineDash ? "border-t-[1px] border-dashed bg-transparent" : "bg-current"
                                    )}
                                    style={{
                                        background: layer.lineDash ? 'transparent' : layer.color,
                                        borderColor: layer.color,
                                        color: layer.color
                                    }}
                                />
                            </div>
                        )}
                        {hasActiveFilter && (
                            <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 uppercase tracking-widest animate-pulse">
                                Filtered
                            </span>
                        )}
                    </div>
                    <h4 className="text-[10px] font-extrabold text-slate-900 dark:text-slate-100 truncate uppercase tracking-tight text-left">
                        {layer.label}
                    </h4>
                </div>

                <div className="flex items-center gap-1">
                    {onApplyCQL && (!!layer.url || layer.id.startsWith("geonode-") || layer.id.startsWith("wms-")) && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-7 w-7 rounded-lg transition-all",
                                isFilterOpen ? "bg-blue-600 text-white shadow-lg" : (hasActiveFilter ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-blue-600 hover:bg-slate-50")
                            )}
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            title="Filter Builder"
                        >
                            <Filter size={12} className={isFilterOpen ? "fill-white/20" : ""} />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-7 w-7 rounded-lg transition-colors",
                            layer.visible ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20" : "text-slate-400"
                        )}
                        onClick={() => onToggle(layer.id, !layer.visible)}
                    >
                        {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                    </Button>
                    {onRemove && (!!layer.url || layer.id.startsWith("geonode-") || layer.id.startsWith("wms-")) && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-rose-400 hover:text-rose-500 hover:bg-rose-50"
                            onClick={() => onRemove(layer.id)}
                            title="Hapus Layer"
                        >
                            <Trash2 size={12} />
                        </Button>
                    )}
                </div>
            </div>

            <Collapsible open={isFilterOpen}>
                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/50 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <Filter size={10} /> Filter Builder
                            </span>
                            <button
                                onClick={loadAttributes}
                                disabled={isLoadingAttrs}
                                className="text-[8px] font-bold text-slate-400 hover:text-blue-600 transition-colors p-1"
                            >
                                <RefreshCw size={10} className={cn(isLoadingAttrs && "animate-spin")} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <label className="text-[7px] font-black text-slate-400 uppercase ml-0.5">Atribut</label>
                                <Select value={builderField} onValueChange={setBuilderField}>
                                    <SelectTrigger className="h-8 text-[9px] font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg w-full">
                                        <SelectValue placeholder="Pilih atribut..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
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
                                    <SelectTrigger className="h-8 text-[9px] font-black bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg w-full">
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

                        <div className="space-y-1">
                            <label className="text-[7px] font-black text-slate-400 uppercase ml-0.5">Value</label>
                            <Input
                                value={builderVal}
                                onChange={(e) => setBuilderVal(e.target.value)}
                                placeholder="Ketik nilai..."
                                className="h-8 text-[10px] font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg w-full placeholder:font-normal"
                            />
                        </div>

                        <div className="flex gap-2 pt-1">
                            <Button
                                onClick={handleApplyFilter}
                                disabled={!builderField || !builderVal}
                                className="flex-1 h-8 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black rounded-lg shadow-lg shadow-blue-200 dark:shadow-none transition-all uppercase tracking-widest gap-2"
                            >
                                <Play size={10} fill="currentColor" /> Terapkan Filter
                            </Button>
                            {hasActiveFilter && (
                                <Button
                                    onClick={handleResetFilter}
                                    variant="outline"
                                    className="px-4 h-8 text-[9px] font-black text-rose-500 border-rose-100 hover:bg-rose-50 rounded-lg uppercase tracking-widest"
                                >
                                    Reset
                                </Button>
                            )}
                        </div>

                        {(!attributes || !attributes.length) && !isLoadingAttrs && (
                            <button
                                onClick={loadAttributes}
                                className="w-full py-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-[9px] font-black text-slate-400 hover:text-blue-600 transition-all uppercase tracking-widest"
                            >
                                Muat Daftar Atribut
                            </button>
                        )}

                        {hasActiveFilter && (
                            <div className="p-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100/50 dark:border-blue-900/20">
                                <p className="text-[8px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest opacity-70 mb-1">Filter Aktif:</p>
                                <p className="text-[9px] font-mono text-slate-600 dark:text-slate-300 break-all bg-white dark:bg-slate-900 p-1 rounded border border-blue-100 dark:border-blue-900/30">
                                    {layer.cql}
                                </p>
                            </div>
                        )}
                    </div>
                </CollapsibleContent>
            </Collapsible>
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
    isShifted,
    onOpenCatalog,
    onRemoveLayer,
    onApplyCQL
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
            <DrawerContent className={cn("h-full dark:bg-slate-900 dark:border-slate-800", className)}>
                <DrawerHeader className="p-3 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col gap-3 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-600 rounded-lg text-white">
                                <Layers className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <DrawerTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight text-left">LAYER SETTINGS</DrawerTitle>
                                <DrawerDescription className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold text-left">Manage map layers</DrawerDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-200 dark:hover:bg-slate-800">
                                <X className="w-5 h-5 dark:text-slate-400" />
                            </Button>
                        </div>
                    </div>

                    {/* Layer Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="SEARCH LAYERS..."
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-4 text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </DrawerHeader>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase">Visible Layers</h3>
                            <div className="flex items-center gap-2">
                                {onClearAll && layers.some(l => l.id.startsWith("road-")) && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onClearAll}
                                        className="h-7 px-2 text-[9px] font-bold text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg gap-2 uppercase tracking-tight transition-all"
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
                                        className="h-7 px-2 text-[9px] font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg gap-2 uppercase tracking-tight transition-all"
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        Reset Order
                                    </Button>
                                )}
                                {onOpenCatalog && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onOpenCatalog}
                                        className="h-7 px-2 rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-all gap-2 text-[9px] font-bold uppercase tracking-wider"
                                    >
                                        <Database className="w-3 h-3 text-blue-600" />
                                        Katalog
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
                                        {Object.entries(
                                            filteredLayers.reduce((acc, layer) => {
                                                const cat = layer.category || "General";
                                                if (!acc[cat]) acc[cat] = [];
                                                acc[cat].push(layer);
                                                return acc;
                                            }, {} as Record<string, LayerItem[]>)
                                        ).map(([category, catLayers]) => (
                                            <div key={category} className="space-y-2">
                                                {category !== "General" && (
                                                    <div className="flex items-center gap-2 px-2 py-1">
                                                        <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                                                        <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{category}</span>
                                                        <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                                                    </div>
                                                )}
                                                <div className="space-y-1">
                                                    {catLayers.map((layer: LayerItem) => (
                                                        <SortableLayerItem
                                                            key={layer.id}
                                                            layer={layer}
                                                            onToggle={onToggle}
                                                            onRemove={onRemoveLayer}
                                                            onApplyCQL={onApplyCQL}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
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
                                        {onRemoveLayer && (layer.id.startsWith("geonode-") || layer.id.startsWith("wms-")) && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRemoveLayer(layer.id);
                                                }}
                                                className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors rounded-md"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}

                            {filteredLayers.length === 0 && (
                                <div className="py-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 px-4">
                                    <Search className="w-8 h-8 text-slate-200 dark:text-slate-800 mx-auto mb-2" />
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">No layers found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DrawerFooter className="p-4 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                    <p className="text-[9px] text-center text-slate-400 dark:text-slate-500 font-medium">
                        Drag <GripVertical className="inline w-2 h-2 mb-0.5" /> to reorder layers priority
                    </p>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}

