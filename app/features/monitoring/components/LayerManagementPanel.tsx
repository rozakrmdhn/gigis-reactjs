import React, { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Slider } from "~/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "~/components/ui/accordion";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "~/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "~/components/ui/command";
import {
    Search,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Trash2,
    Eye,
    EyeOff,
    Filter,
    RotateCcw,
    GripVertical,
    X,
    ChevronsUpDown,
    Check
} from "lucide-react";
import { toast } from "sonner";
import { cn, getProxiedLayerUrl } from "~/lib/utils";

interface LayerManagementPanelProps {
    dbLayers: any[];
    setDbLayers: React.Dispatch<React.SetStateAction<any[]>>;
    activeOverlays: string[];
    setActiveOverlays: React.Dispatch<React.SetStateAction<string[]>>;
    visibleOverlays: string[];
    setVisibleOverlays: React.Dispatch<React.SetStateAction<string[]>>;
    overlayOpacities: Record<string, number>;
    setOverlayOpacities: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    overlayCqlFilters: Record<string, string>;
    setOverlayCqlFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    activeTab?: string;
    setActiveTab?: (tab: string) => void;
    hideTabsList?: boolean;
}

export function LayerManagementPanel({
    dbLayers,
    setDbLayers,
    activeOverlays,
    setActiveOverlays,
    visibleOverlays,
    setVisibleOverlays,
    overlayOpacities,
    setOverlayOpacities,
    overlayCqlFilters,
    setOverlayCqlFilters,
    activeTab,
    setActiveTab,
    hideTabsList = false
}: LayerManagementPanelProps) {
    const [localActiveTab, setLocalActiveTab] = useState<string>("katalog");
    const currentActiveTab = activeTab ?? localActiveTab;
    const handleActiveTabChange = setActiveTab ?? setLocalActiveTab;

    // Catalog search and pagination states
    const [catalogLayers, setCatalogLayers] = useState<any[]>([]);
    const [catalogQuery, setCatalogQuery] = useState("");
    const [catalogPage, setCatalogPage] = useState(1);
    const [catalogLimit, setCatalogLimit] = useState(10);
    const [catalogTotal, setCatalogTotal] = useState(0);
    const [isFetchingCatalog, setIsFetchingCatalog] = useState(false);
    const [debouncedQuery, setDebouncedQuery] = useState("");

    // Drag-and-drop state
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

    // Operator Dynamic Styles State
    const [customStyles, setCustomStyles] = useState<Record<string, any>>(() => {
        try {
            if (typeof window !== 'undefined') {
                const stored = localStorage.getItem('gigis_custom_vector_styles');
                if (stored) return JSON.parse(stored);
            }
        } catch (e) {}
        return {
            jalan_desa_baik: { color: '#22c55e', width: 5, lineDash: 'solid' },
            jalan_desa_sedang: { color: '#f59e0b', width: 5, lineDash: 'solid' },
            jalan_desa_rusak: { color: '#ef4444', width: 5, lineDash: 'solid' },
            jalan_lingkungan_baik: { color: '#22c55e', width: 5, lineDash: 'dashed' },
            jalan_lingkungan_sedang: { color: '#f59e0b', width: 5, lineDash: 'dashed' },
            jalan_lingkungan_rusak: { color: '#ef4444', width: 5, lineDash: 'dashed' },
            jalan_kabupaten_baik: { color: '#2563eb', width: 5, lineDash: 'solid' },
            jalan_kabupaten_sedang: { color: '#60a5fa', width: 5, lineDash: 'solid' },
            jalan_kabupaten_rusak: { color: '#60a5fa', width: 5, lineDash: 'dashed' },
            batas_desa: { color: '#f97316', width: 2, lineDash: 'dashed' },
            jalan_utama: { color: '#f97316', width: 2, lineDash: 'solid' },
            marker_titik: { color: '#1e40af', scale: 0.07 }
        };
    });

    const updateStyle = (key: string, field: string, value: any) => {
        setCustomStyles(prev => {
            const next = {
                ...prev,
                [key]: {
                    ...prev[key],
                    [field]: value
                }
            };
            try {
                localStorage.setItem('gigis_custom_vector_styles', JSON.stringify(next));
                window.dispatchEvent(new Event('MELAROSA-vector-styles-changed'));
            } catch (e) {
                console.error(e);
            }
            return next;
        });
    };

    const resetStyles = () => {
        const defaults = {
            jalan_desa_baik: { color: '#22c55e', width: 5, lineDash: 'solid' },
            jalan_desa_sedang: { color: '#f59e0b', width: 5, lineDash: 'solid' },
            jalan_desa_rusak: { color: '#ef4444', width: 5, lineDash: 'solid' },
            jalan_lingkungan_baik: { color: '#22c55e', width: 5, lineDash: 'dashed' },
            jalan_lingkungan_sedang: { color: '#f59e0b', width: 5, lineDash: 'dashed' },
            jalan_lingkungan_rusak: { color: '#ef4444', width: 5, lineDash: 'dashed' },
            jalan_kabupaten_baik: { color: '#2563eb', width: 5, lineDash: 'solid' },
            jalan_kabupaten_sedang: { color: '#60a5fa', width: 5, lineDash: 'solid' },
            jalan_kabupaten_rusak: { color: '#60a5fa', width: 5, lineDash: 'dashed' },
            batas_desa: { color: '#f97316', width: 2, lineDash: 'dashed' },
            jalan_utama: { color: '#f97316', width: 2, lineDash: 'solid' },
            marker_titik: { color: '#1e40af', scale: 0.07 }
        };
        setCustomStyles(defaults);
        try {
            localStorage.setItem('gigis_custom_vector_styles', JSON.stringify(defaults));
            window.dispatchEvent(new Event('MELAROSA-vector-styles-changed'));
            toast.success("Gaya peta berhasil dikembalikan ke standar");
        } catch (e) {}
    };

    useEffect(() => {
        const handleStyleChange = () => {
            try {
                const stored = localStorage.getItem('gigis_custom_vector_styles');
                if (stored) setCustomStyles(JSON.parse(stored));
            } catch (e) {}
        };
        window.addEventListener('MELAROSA-vector-styles-changed', handleStyleChange);
        return () => window.removeEventListener('MELAROSA-vector-styles-changed', handleStyleChange);
    }, []);

    // CQL Filter builder states
    const [expandedLayerFilter, setExpandedLayerFilter] = useState<Record<string, boolean>>({});
    const [cqlBuilders, setCqlBuilders] = useState<Record<string, { attribute: string; operator: string; value: string }>>({});
    const [wmsAttributes, setWmsAttributes] = useState<Record<string, string[]>>({});
    const [loadingAttrs, setLoadingAttrs] = useState<Record<string, boolean>>({});
    const [openAttrCombobox, setOpenAttrCombobox] = useState<Record<string, boolean>>({});
    const [openOpCombobox, setOpenOpCombobox] = useState<Record<string, boolean>>({});

    const CQL_OPERATORS = [
        { label: '= (sama dengan)', value: '=' },
        { label: '<> (tidak sama)', value: '<>' },
        { label: '> (lebih dari)', value: '>' },
        { label: '>= (lebih dari sama)', value: '>=' },
        { label: '< (kurang dari)', value: '<' },
        { label: '<= (kurang dari sama)', value: '<=' },
        { label: 'LIKE (mengandung)', value: 'LIKE' },
        { label: 'ILIKE (mengandung, case insensitive)', value: 'ILIKE' },
    ];

    // Debounce catalogQuery
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(catalogQuery);
        }, 350);
        return () => clearTimeout(handler);
    }, [catalogQuery]);

    // Fetch paginated catalog layers whenever debouncedQuery, page, or limit changes
    useEffect(() => {
        const fetchCatalogLayers = async () => {
            setIsFetchingCatalog(true);
            try {
                const queryParams = new URLSearchParams({
                    active_only: "true",
                    page: catalogPage.toString(),
                    limit: catalogLimit.toString()
                });
                if (debouncedQuery) {
                    queryParams.set("q", debouncedQuery);
                }
                const baseUrl = import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "");
                const response = await fetch(`${baseUrl}/v1/layers?${queryParams.toString()}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'success' && Array.isArray(data.result)) {
                        setCatalogLayers(data.result);
                        setCatalogTotal(data.meta?.total ?? data.result.length);

                        // Merge into dbLayers registry to ensure active overlays details can be resolved
                        setDbLayers(prev => {
                            const existingIds = new Set(prev.map(l => l.id));
                            const newLayers = data.result.filter((l: any) => !existingIds.has(l.id));
                            return [...prev, ...newLayers];
                        });
                    }
                }
            } catch (err) {
                console.error("Gagal memuat katalog dataset:", err);
            } finally {
                setIsFetchingCatalog(false);
            }
        };
        fetchCatalogLayers();
    }, [debouncedQuery, catalogPage, catalogLimit, setDbLayers]);

    const handleReorder = (draggedIndex: number, targetIndex: number) => {
        if (draggedIndex === targetIndex) return;
        setActiveOverlays(prev => {
            const next = [...prev];
            const [removed] = next.splice(draggedIndex, 1);
            next.splice(targetIndex, 0, removed);
            return next;
        });
    };

    const fetchWmsAttributes = async (layerId: string, wmsUrl: string, layerName: string) => {
        if (wmsAttributes[layerId] || loadingAttrs[layerId]) return;
        setLoadingAttrs(prev => ({ ...prev, [layerId]: true }));
        try {
            const describeUrl = `${wmsUrl}?service=WFS&version=1.0.0&request=DescribeFeatureType&typeName=${layerName}&outputFormat=application/json`;
            const resp = await fetch(describeUrl);
            if (!resp.ok) throw new Error('Failed');
            const json = await resp.json();
            const props: string[] = json?.featureTypes?.[0]?.properties?.map((p: any) => p.name) ?? [];
            setWmsAttributes(prev => ({ ...prev, [layerId]: props }));
        } catch {
            setWmsAttributes(prev => ({ ...prev, [layerId]: [] }));
        } finally {
            setLoadingAttrs(prev => ({ ...prev, [layerId]: false }));
        }
    };

    const applyCqlBuilder = (layerId: string) => {
        const b = cqlBuilders[layerId];
        if (!b?.attribute || !b?.operator) return;
        const needsQuotes = !['>', '>=', '<', '<='].includes(b.operator);
        const val = b.operator === 'LIKE' || b.operator === 'ILIKE'
            ? `'%${b.value}%'`
            : needsQuotes ? `'${b.value}'` : b.value;
        const cql = `${b.attribute} ${b.operator} ${val}`;
        setOverlayCqlFilters(prev => ({ ...prev, [layerId]: cql }));
    };

    const resetCqlBuilder = (layerId: string) => {
        setCqlBuilders(prev => ({ ...prev, [layerId]: { attribute: '', operator: '=', value: '' } }));
        setOverlayCqlFilters(prev => {
            const n = { ...prev };
            delete n[layerId];
            return n;
        });
    };

    return (
        <Tabs value={currentActiveTab} onValueChange={handleActiveTabChange} className="flex-1 flex flex-col min-h-0 gap-0">
            {!hideTabsList && (
                <div className="bg-white dark:bg-slate-950 border-b dark:border-slate-800 px-2 py-2 shrink-0">
                    <TabsList className="w-full grid h-9 grid-cols-3">
                        <TabsTrigger value="katalog" className="text-[10px] uppercase font-bold tracking-tight">Katalog</TabsTrigger>
                        <TabsTrigger value="layers" className="text-[10px] uppercase font-bold tracking-tight">
                            Layer
                            {activeOverlays.length > 0 && (
                                <span className="ml-1 px-1.5 py-0.2 text-[8px] bg-blue-100 text-blue-700 rounded-full font-black">
                                    {activeOverlays.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="acuan" className="text-[10px] uppercase font-bold tracking-tight">Acuan</TabsTrigger>
                    </TabsList>
                </div>
            )}

            {/* Tab Content: Katalog Data */}
            <TabsContent value="katalog" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden bg-white dark:bg-slate-950/50 relative pb-[48px]">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-2 bg-slate-50/50">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Katalog Data Spasial</span>
                    <p className="text-[10px] text-slate-500">Pilih data spasial yang ingin ditambahkan ke peta sebagai overlay.</p>

                    {/* Search & Limit Row Container */}
                    <div className="flex gap-2 mt-1.5">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                type="text"
                                placeholder="Cari dataset..."
                                className="pl-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-blue-500"
                                value={catalogQuery}
                                onChange={(e) => {
                                    setCatalogQuery(e.target.value);
                                    setCatalogPage(1);
                                }}
                            />
                            {isFetchingCatalog && (
                                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-blue-500" />
                            )}
                        </div>
                        <Select
                            value={catalogLimit.toString()}
                            onValueChange={(val) => {
                                setCatalogLimit(parseInt(val, 10));
                                setCatalogPage(1);
                            }}
                        >
                            <SelectTrigger className="h-8 w-20 text-[10px] font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
                                <SelectValue placeholder="Limit" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="5" className="text-xs">5 Baris</SelectItem>
                                <SelectItem value="10" className="text-xs">10 Baris</SelectItem>
                                <SelectItem value="20" className="text-xs">20 Baris</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Catalog list container */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {catalogLayers.length > 0 ? (
                        catalogLayers.map((layer) => {
                            const isAdded = activeOverlays.includes(layer.id);
                            return (
                                <div key={layer.id} className="p-2.5 rounded-xl border border-slate-105 dark:border-slate-800/80 bg-white dark:bg-slate-900/50 flex flex-col gap-2 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                                    <div className="min-w-0 pr-1">
                                        <h4 className="text-[12px] font-semibold text-slate-850 dark:text-slate-200 tracking-tight line-clamp-1 leading-snug">
                                            {layer.name}
                                        </h4>
                                        {layer.description && (
                                            <p className="text-[9px] text-slate-400 italic line-clamp-1 mt-0.5">{layer.description}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <div className="flex gap-1">
                                            <span className="text-[8px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded uppercase">
                                                {layer.protocol}
                                            </span>
                                            <span className="text-[8px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded uppercase">
                                                {layer.source_type}
                                            </span>
                                        </div>
                                        <Button
                                             size="sm"
                                             variant={isAdded ? "destructive" : "default"}
                                             type="button"
                                             onClick={() => {
                                                 if (isAdded) {
                                                     setActiveOverlays(prev => prev.filter(id => id !== layer.id));
                                                     setVisibleOverlays(prev => prev.filter(id => id !== layer.id));
                                                     toast.success(`Layer ${layer.name} dihapus dari peta`);
                                                 } else {
                                                     setActiveOverlays(prev => [...prev, layer.id]);
                                                     setVisibleOverlays(prev => [...prev, layer.id]);
                                                     setOverlayOpacities(prev => ({ ...prev, [layer.id]: layer.opacity ?? 1.0 }));
                                                     toast.success(`Layer ${layer.name} ditambahkan ke peta`);
                                                 }
                                             }}
                                             className="h-6 text-[10px] font-bold rounded-lg uppercase tracking-tight"
                                         >
                                             {isAdded ? "Hapus" : "Tambah"}
                                         </Button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-8 text-xs text-slate-450 dark:text-slate-500 italic">
                            {isFetchingCatalog ? "Memuat data..." : "Tidak ada dataset tematik."}
                        </div>
                    )}
                </div>

                {/* Fixed bottom pagination bar */}
                <div className="absolute bottom-0 left-0 right-0 h-[48px] bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 px-3 flex items-center justify-between shrink-0 z-10 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                        Total: {catalogTotal} Data
                    </span>
                    <div className="flex items-center gap-1">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={catalogPage <= 1 || isFetchingCatalog}
                            onClick={() => setCatalogPage(prev => Math.max(prev - 1, 1))}
                            className="h-7 px-2 text-[9px] font-bold rounded-lg uppercase tracking-tight gap-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                        >
                            <ChevronLeft size={10} /> Prev
                        </Button>
                        <span className="text-[9px] font-black px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 min-w-[28px] text-center">
                            {catalogPage} / {Math.ceil(catalogTotal / catalogLimit) || 1}
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={catalogPage >= Math.ceil(catalogTotal / catalogLimit) || isFetchingCatalog}
                            onClick={() => setCatalogPage(prev => prev + 1)}
                            className="h-7 px-2 text-[9px] font-bold rounded-lg uppercase tracking-tight gap-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                        >
                            Next <ChevronRight size={10} />
                        </Button>
                    </div>
                </div>
            </TabsContent>

            {/* Tab Content: Daftar Layer */}
            <TabsContent value="layers" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden bg-white dark:bg-slate-950/50">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-2 bg-slate-50/50 dark:bg-slate-900/50">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Layer Aktif Peta</span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Urutkan, atur transparansi, atau hapus overlay di peta.</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar">
                    {activeOverlays.length > 0 ? (
                        [...activeOverlays].reverse().map((layerId, reversedIndex) => {
                            const actualIndex = activeOverlays.length - 1 - reversedIndex;
                            const layer = dbLayers.find(l => l.id === layerId);
                            if (!layer) return null;
                            const isVisible = visibleOverlays.includes(layerId);
                            const opacity = overlayOpacities[layerId] ?? 1.0;
                            const isFilterOpen = expandedLayerFilter[layerId] ?? false;
                            const activeCql = overlayCqlFilters[layerId];
                            const builder = cqlBuilders[layerId] ?? { attribute: '', operator: '=', value: '' };
                            const attrs = wmsAttributes[layerId] ?? [];
                            const isLoading = loadingAttrs[layerId];
                            const proxyUrl = getProxiedLayerUrl(layer.url);

                            return (
                                <div
                                    key={layerId}
                                    draggable={!isFilterOpen}
                                    onDragStart={(e) => {
                                        if (isFilterOpen) { e.preventDefault(); return; }
                                        setDraggingIndex(actualIndex);
                                        e.dataTransfer.effectAllowed = "move";
                                    }}
                                    onDragEnd={() => {
                                        setDraggingIndex(null);
                                    }}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        if (draggingIndex !== null && draggingIndex !== actualIndex) {
                                            handleReorder(draggingIndex, actualIndex);
                                            setDraggingIndex(actualIndex);
                                        }
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                    }}
                                    className={cn(
                                        "relative rounded-xl border transition-all duration-200 overflow-hidden hover:border-blue-300 dark:hover:border-blue-700 shadow-sm",
                                        (activeCql || isFilterOpen)
                                            ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                            : "bg-blue-50/30 dark:bg-blue-950/15 border-blue-100/50 dark:border-blue-900/30",
                                        !isVisible && "opacity-60 bg-slate-50/50 dark:bg-slate-950/20",
                                        draggingIndex === actualIndex && "opacity-30 scale-[0.98] border-blue-500 bg-blue-50/5 dark:bg-blue-950/10 shadow-inner"
                                    )}
                                >
                                    {/* ── Sliding panels ── */}
                                    <div className="overflow-hidden">
                                        <div
                                            className="flex transition-transform duration-300 ease-in-out"
                                            style={{
                                                width: layer.protocol === 'OGC:WMS' ? '200%' : '100%',
                                                transform: isFilterOpen ? 'translateX(-50%)' : 'translateX(0%)'
                                            }}
                                        >
                                            {/* Panel 1 – Main card content */}
                                            <div className="min-w-0" style={{ width: layer.protocol === 'OGC:WMS' ? '50%' : '100%' }}>
                                                {/* Layer card header */}
                                                <div className="flex items-center gap-2.5 px-3 py-2.5">
                                                    {/* Drag handle */}
                                                    <div className="cursor-grab active:cursor-grabbing p-1 text-slate-300 dark:text-slate-600 hover:text-blue-600 transition-colors shrink-0">
                                                        <GripVertical size={13} />
                                                    </div>
                                                    {/* Layer info */}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1.5 mb-0.5">
                                                            <span className="text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
                                                                Dataset
                                                            </span>
                                                            {activeCql && (
                                                                <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 uppercase tracking-widest shrink-0">
                                                                    Filtered
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h4 className={cn(
                                                            "text-[12px] font-semibold tracking-tight text-left leading-tight truncate",
                                                            isVisible ? "text-slate-900 dark:text-slate-100" : "text-slate-400"
                                                        )}>
                                                            {layer.name}
                                                        </h4>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <span className="text-[8px] font-black px-1 py-px rounded uppercase bg-slate-100 dark:bg-slate-800 text-slate-400">
                                                                {layer.protocol}
                                                            </span>
                                                            <span className="text-[8px] font-bold text-slate-400">z:{actualIndex + 1}</span>
                                                        </div>
                                                    </div>
                                                    {/* Actions */}
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (isVisible) {
                                                                    setVisibleOverlays(prev => prev.filter(id => id !== layerId));
                                                                } else {
                                                                    setVisibleOverlays(prev => [...prev, layerId]);
                                                                }
                                                            }}
                                                            className={cn(
                                                                "h-7 w-7 rounded-lg flex items-center justify-center transition-colors",
                                                                isVisible
                                                                    ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20"
                                                                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                            )}
                                                            title={isVisible ? "Sembunyikan" : "Tampilkan"}
                                                        >
                                                            {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                                                        </button>
                                                        {layer.protocol === 'OGC:WMS' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setExpandedLayerFilter(prev => ({ ...prev, [layerId]: !isFilterOpen }))}
                                                                className={cn(
                                                                    "h-7 w-7 rounded-lg flex items-center justify-center transition-all",
                                                                    isFilterOpen ? "bg-blue-600 text-white shadow-md" : (activeCql ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20" : "text-slate-400 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800")
                                                                )}
                                                                title="Filter CQL"
                                                            >
                                                                <Filter size={12} className={isFilterOpen ? "fill-white/20" : ""} />
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setActiveOverlays(prev => prev.filter(id => id !== layerId));
                                                                setVisibleOverlays(prev => prev.filter(id => id !== layerId));
                                                                toast.success(`Layer ${layer.name} dihapus dari peta`);
                                                            }}
                                                            className="h-7 w-7 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                                                            title="Hapus dari peta"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                                {/* Opacity slider - isolated bottom tray */}
                                                <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/20">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold uppercase w-12 shrink-0 tracking-wider">Opacity</span>
                                                        <Slider
                                                            value={[opacity * 100]}
                                                            onValueChange={(val) => setOverlayOpacities(prev => ({ ...prev, [layerId]: val[0] / 100 }))}
                                                            max={100} min={0} step={5}
                                                            className="flex-1"
                                                        />
                                                        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold w-7 text-right shrink-0">{Math.round(opacity * 100)}%</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Panel 2 – CQL Filter form (WMS only, always in DOM for height calc) */}
                                            {layer.protocol === 'OGC:WMS' && (
                                                <div className="min-w-0 bg-white dark:bg-slate-900" style={{ width: '50%' }}>
                                                    <div className="p-2.5 flex flex-col gap-1.5 justify-center h-full">
                                                        {activeCql && (
                                                            <div className="flex items-center gap-1.5 bg-blue-50/50 dark:bg-blue-950/20 px-2 py-0.5 rounded border border-blue-100/50 dark:border-blue-900/30 shrink-0">
                                                                <span className="text-[8px] font-mono text-blue-600 dark:text-blue-400 truncate flex-1">
                                                                    {activeCql}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => resetCqlBuilder(layerId)}
                                                                    className="text-rose-500 hover:text-rose-600 p-0.5 shrink-0"
                                                                    title="Clear"
                                                                >
                                                                    <RotateCcw size={9} />
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Row 1: Attribute (60%) | Operator (40%) */}
                                                        <div className="grid grid-cols-10 gap-1.5 shrink-0">
                                                            <Popover
                                                                open={openAttrCombobox[layerId] || false}
                                                                onOpenChange={(open) => {
                                                                    setOpenAttrCombobox(prev => ({ ...prev, [layerId]: open }));
                                                                    if (open && attrs.length === 0) {
                                                                        fetchWmsAttributes(layerId, proxyUrl, layer.layer_name);
                                                                    }
                                                                }}
                                                            >
                                                                <PopoverTrigger asChild>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        role="combobox"
                                                                        aria-expanded={openAttrCombobox[layerId] || false}
                                                                        className="h-8 w-full text-sm rounded-lg col-span-6 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm justify-between px-2 font-normal text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-850"
                                                                    >
                                                                        <span className="text-sm truncate">
                                                                            {builder.attribute || (isLoading ? '...' : 'Pilih Atribut')}
                                                                        </span>
                                                                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-1" />
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                                                    <Command>
                                                                        <CommandInput placeholder="Cari atribut..." className="h-8 text-sm" />
                                                                        <CommandList>
                                                                            {isLoading ? (
                                                                                <CommandEmpty className="py-2 text-center text-sm text-slate-500">Memuat atribut...</CommandEmpty>
                                                                            ) : attrs.length === 0 ? (
                                                                                <CommandEmpty className="py-2 text-center text-sm text-slate-500">Tidak ada atribut</CommandEmpty>
                                                                            ) : (
                                                                                <>
                                                                                    <CommandEmpty className="py-2 text-center text-sm text-slate-500">Atribut tidak ditemukan</CommandEmpty>
                                                                                    <CommandGroup>
                                                                                        {attrs.map((attr) => (
                                                                                            <CommandItem
                                                                                                key={attr}
                                                                                                value={attr}
                                                                                                onSelect={(currentValue) => {
                                                                                                    setCqlBuilders(prev => ({
                                                                                                        ...prev,
                                                                                                        [layerId]: {
                                                                                                            ...builder,
                                                                                                            attribute: currentValue === builder.attribute ? "" : currentValue
                                                                                                        }
                                                                                                    }));
                                                                                                    setOpenAttrCombobox(prev => ({ ...prev, [layerId]: false }));
                                                                                                }}
                                                                                                className="text-sm cursor-pointer"
                                                                                            >
                                                                                                {attr}
                                                                                                <Check
                                                                                                    className={cn(
                                                                                                        "ml-auto h-4 w-4",
                                                                                                        builder.attribute === attr ? "opacity-100" : "opacity-0"
                                                                                                    )}
                                                                                                />
                                                                                            </CommandItem>
                                                                                        ))}
                                                                                    </CommandGroup>
                                                                                </>
                                                                            )}
                                                                        </CommandList>
                                                                    </Command>
                                                                </PopoverContent>
                                                            </Popover>
                                                            <Popover
                                                                open={openOpCombobox[layerId] || false}
                                                                onOpenChange={(open) => {
                                                                    setOpenOpCombobox(prev => ({ ...prev, [layerId]: open }));
                                                                }}
                                                            >
                                                                <PopoverTrigger asChild>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        role="combobox"
                                                                        aria-expanded={openOpCombobox[layerId] || false}
                                                                        className="h-8 w-full text-sm rounded-lg col-span-4 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm justify-between px-2 font-normal text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-850"
                                                                    >
                                                                        <span className="truncate">
                                                                            {builder.operator || 'Op'}
                                                                        </span>
                                                                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-1" />
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                                                    <Command>
                                                                        <CommandInput placeholder="Cari..." className="h-8 text-sm" />
                                                                        <CommandList>
                                                                            <CommandEmpty className="py-2 text-center text-sm text-slate-500">Tidak ditemukan</CommandEmpty>
                                                                            <CommandGroup>
                                                                                {CQL_OPERATORS.map((op) => (
                                                                                    <CommandItem
                                                                                        key={op.value}
                                                                                        value={`${op.value} ${op.label}`}
                                                                                        onSelect={() => {
                                                                                            setCqlBuilders(prev => ({
                                                                                                ...prev,
                                                                                                [layerId]: {
                                                                                                    ...builder,
                                                                                                    operator: op.value
                                                                                                }
                                                                                            }));
                                                                                            setOpenOpCombobox(prev => ({ ...prev, [layerId]: false }));
                                                                                        }}
                                                                                        className="text-sm cursor-pointer"
                                                                                    >
                                                                                        {op.label}
                                                                                        <Check
                                                                                            className={cn(
                                                                                                "ml-auto h-4 w-4",
                                                                                                builder.operator === op.value ? "opacity-100" : "opacity-0"
                                                                                            )}
                                                                                        />
                                                                                    </CommandItem>
                                                                                ))}
                                                                            </CommandGroup>
                                                                        </CommandList>
                                                                    </Command>
                                                                </PopoverContent>
                                                            </Popover>
                                                        </div>

                                                        {/* Row 2: Value (60%) | Filter (20%) | Tutup (20%) */}
                                                        <div className="grid grid-cols-10 gap-1.5 shrink-0">
                                                            <Input
                                                                value={builder.value}
                                                                onChange={(e) => setCqlBuilders(prev => ({ ...prev, [layerId]: { ...builder, value: e.target.value } }))}
                                                                onKeyDown={(e) => { if (e.key === 'Enter') applyCqlBuilder(layerId); }}
                                                                placeholder="Nilai..."
                                                                className="h-8 w-full text-sm px-2.5 rounded-lg col-span-6 min-w-0"
                                                            />
                                                            <button
                                                                type="button"
                                                                disabled={!builder.attribute || !builder.value}
                                                                onClick={() => applyCqlBuilder(layerId)}
                                                                className="h-8 col-span-2 rounded-lg flex items-center justify-center bg-blue-500 hover:bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 text-white transition-colors"
                                                                title="Terapkan Filter"
                                                            >
                                                                <Search size={13} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setExpandedLayerFilter(prev => ({ ...prev, [layerId]: false }))}
                                                                className="h-8 col-span-2 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors shadow-sm"
                                                                title="Tutup filter"
                                                            >
                                                                <X size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-12 text-xs text-slate-450 dark:text-slate-500 italic">Peta belum memiliki layer overlay. Tambahkan dari katalog.</div>
                    )}
                </div>
            </TabsContent>

            {/* Tab Content: Acuan Style Layer */}
            <TabsContent value="acuan" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden bg-white dark:bg-slate-950/50">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-widest block">Acuan & Legenda Peta</span>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">Kustomisasi warna & ketebalan layer vector secara dinamis.</p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={resetStyles}
                        className="h-7 px-2 text-[9px] font-bold rounded-lg uppercase tracking-tight gap-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shrink-0 shadow-sm text-slate-700 dark:text-slate-350 hover:bg-slate-50"
                        title="Kembalikan semua gaya ke pengaturan awal"
                    >
                        <RotateCcw size={10} />
                        <span>Reset</span>
                    </Button>
                </div>
                     <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                    <Accordion type="multiple" defaultValue={["poros", "lingkungan", "kabupaten", "batas", "utama", "marker"]} className="w-full space-y-2">
                        {/* 1. Jalan Segmen Poros */}
                        <AccordionItem value="poros" className="border-b border-slate-100 dark:border-slate-800">
                            <AccordionTrigger className="text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:no-underline py-2">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-3 bg-green-500 rounded-sm" />
                                    Jalan Segmen Desa (Ruas Poros)
                                </span>
                            </AccordionTrigger>
                            <AccordionContent className="pb-3 pt-1 space-y-2">
                                <div className="space-y-2 bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                    {[
                                        { key: 'jalan_desa_baik', label: 'Poros - Kondisi Baik (Hijau)', defaultColor: '#22c55e' },
                                        { key: 'jalan_desa_sedang', label: 'Poros - Kondisi Sedang (Orange)', defaultColor: '#f59e0b' },
                                        { key: 'jalan_desa_rusak', label: 'Poros - Kondisi Rusak (Merah)', defaultColor: '#ef4444' }
                                    ].map((item) => {
                                        const style = customStyles[item.key] || { color: item.defaultColor, width: 5 };
                                        return (
                                            <div key={item.key} className="flex items-center justify-between gap-3 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-[10px] font-semibold text-slate-750 dark:text-slate-300 block truncate">{item.label}</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="w-12 h-1 rounded" style={{ backgroundColor: style.color }} />
                                                        <span className="text-[8px] font-mono text-slate-400 font-bold">{style.color}</span>
                                                        <span className="text-[8px] font-mono text-slate-400 font-bold">({style.width}px)</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <input
                                                        type="color"
                                                        value={style.color}
                                                        onChange={(e) => updateStyle(item.key, 'color', e.target.value)}
                                                        className="w-5 h-5 rounded cursor-pointer border border-slate-200 dark:border-slate-800 bg-transparent p-0"
                                                    />
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="12"
                                                        value={style.width}
                                                        onChange={(e) => updateStyle(item.key, 'width', parseInt(e.target.value, 10) || 1)}
                                                        className="w-9 h-6 text-[10px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-center font-bold"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {/* 2. Jalan Segmen Lingkungan */}
                        <AccordionItem value="lingkungan" className="border-b border-slate-100 dark:border-slate-800">
                            <AccordionTrigger className="text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:no-underline py-2">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-3 bg-teal-500 rounded-sm" />
                                    Jalan Segmen Desa (Ruas Lingkungan)
                                </span>
                            </AccordionTrigger>
                            <AccordionContent className="pb-3 pt-1 space-y-2">
                                <div className="space-y-2 bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                    {[
                                        { key: 'jalan_lingkungan_baik', label: 'Lingkungan - Kondisi Baik', defaultColor: '#22c55e' },
                                        { key: 'jalan_lingkungan_sedang', label: 'Lingkungan - Kondisi Sedang', defaultColor: '#f59e0b' },
                                        { key: 'jalan_lingkungan_rusak', label: 'Lingkungan - Kondisi Rusak', defaultColor: '#ef4444' }
                                    ].map((item) => {
                                        const style = customStyles[item.key] || { color: item.defaultColor, width: 5 };
                                        return (
                                            <div key={item.key} className="flex items-center justify-between gap-3 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-[10px] font-semibold text-slate-750 dark:text-slate-300 block truncate">{item.label}</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="w-12 h-1 border-t border-dashed" style={{ borderColor: style.color }} />
                                                        <span className="text-[8px] font-mono text-slate-400 font-bold">{style.color}</span>
                                                        <span className="text-[8px] font-mono text-slate-400 font-bold">({style.width}px)</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <input
                                                        type="color"
                                                        value={style.color}
                                                        onChange={(e) => updateStyle(item.key, 'color', e.target.value)}
                                                        className="w-5 h-5 rounded cursor-pointer border border-slate-200 dark:border-slate-800 bg-transparent p-0"
                                                    />
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="12"
                                                        value={style.width}
                                                        onChange={(e) => updateStyle(item.key, 'width', parseInt(e.target.value, 10) || 1)}
                                                        className="w-9 h-6 text-[10px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-center font-bold"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {/* 3. Jalan Kabupaten */}
                        <AccordionItem value="kabupaten" className="border-b border-slate-100 dark:border-slate-800">
                            <AccordionTrigger className="text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:no-underline py-2">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-3 bg-blue-500 rounded-sm" />
                                    Jalan Segmen Kabupaten
                                </span>
                            </AccordionTrigger>
                            <AccordionContent className="pb-3 pt-1 space-y-2">
                                <div className="space-y-2 bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                    {[
                                        { key: 'jalan_kabupaten_baik', label: 'Kabupaten - Kondisi Baik (Solid)', defaultColor: '#2563eb', lineDash: 'solid' },
                                        { key: 'jalan_kabupaten_sedang', label: 'Kabupaten - Kondisi Sedang (Solid)', defaultColor: '#60a5fa', lineDash: 'solid' },
                                        { key: 'jalan_kabupaten_rusak', label: 'Kabupaten - Kondisi Rusak (Dashed)', defaultColor: '#60a5fa', lineDash: 'dashed' }
                                    ].map((item) => {
                                        const style = customStyles[item.key] || { color: item.defaultColor, width: 5 };
                                        return (
                                            <div key={item.key} className="flex items-center justify-between gap-3 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-[10px] font-semibold text-slate-755 dark:text-slate-300 block truncate">{item.label}</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className={`w-12 h-1 ${item.lineDash === 'dashed' ? 'border-t border-dashed' : 'rounded'}`} style={{ backgroundColor: item.lineDash === 'solid' ? style.color : undefined, borderColor: item.lineDash === 'dashed' ? style.color : undefined }} />
                                                        <span className="text-[8px] font-mono text-slate-400 font-bold">{style.color}</span>
                                                        <span className="text-[8px] font-mono text-slate-400 font-bold">({style.width}px)</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <input
                                                        type="color"
                                                        value={style.color}
                                                        onChange={(e) => updateStyle(item.key, 'color', e.target.value)}
                                                        className="w-5 h-5 rounded cursor-pointer border border-slate-200 dark:border-slate-800 bg-transparent p-0"
                                                    />
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="12"
                                                        value={style.width}
                                                        onChange={(e) => updateStyle(item.key, 'width', parseInt(e.target.value, 10) || 1)}
                                                        className="w-9 h-6 text-[10px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-center font-bold"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {/* 4. Batas Administrasi */}
                        <AccordionItem value="batas" className="border-b border-slate-100 dark:border-slate-800">
                            <AccordionTrigger className="text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:no-underline py-2">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-3 bg-orange-500 rounded-sm" />
                                    Batas Administrasi Desa
                                </span>
                            </AccordionTrigger>
                            <AccordionContent className="pb-3 pt-1 space-y-2">
                                <div className="bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                    {(() => {
                                        const style = customStyles['batas_desa'] || { color: '#f97316', width: 2 };
                                        return (
                                            <div className="flex items-center justify-between gap-3 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-[10px] font-semibold text-slate-750 dark:text-slate-300 block">Batas Desa / Kelurahan</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="w-12 h-4 rounded border border-dashed bg-orange-500/5" style={{ borderColor: style.color, backgroundColor: `${style.color}0d` }} />
                                                        <span className="text-[8px] font-mono text-slate-400 font-bold">{style.color}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <input
                                                        type="color"
                                                        value={style.color}
                                                        onChange={(e) => updateStyle('batas_desa', 'color', e.target.value)}
                                                        className="w-5 h-5 rounded cursor-pointer border border-slate-200 dark:border-slate-800 bg-transparent p-0"
                                                    />
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="8"
                                                        value={style.width}
                                                        onChange={(e) => updateStyle('batas_desa', 'width', parseInt(e.target.value, 10) || 1)}
                                                        className="w-9 h-6 text-[10px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-center font-bold"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {/* 5. Jalan Utama */}
                        <AccordionItem value="utama" className="border-b border-slate-100 dark:border-slate-800">
                            <AccordionTrigger className="text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:no-underline py-2">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-3 bg-blue-600 rounded-sm" />
                                    Jalan Utama (Base)
                                </span>
                            </AccordionTrigger>
                            <AccordionContent className="pb-3 pt-1 space-y-2">
                                <div className="bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                    {(() => {
                                        const style = customStyles['jalan_utama'] || { color: '#f97316', width: 2 };
                                        return (
                                            <div className="flex items-center justify-between gap-3 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-[10px] font-semibold text-slate-750 dark:text-slate-300 block">Jalan Utama Kabupaten</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="w-12 h-1 rounded animate-pulse" style={{ backgroundColor: style.color }} />
                                                        <span className="text-[8px] font-mono text-slate-400 font-bold">{style.color}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <input
                                                        type="color"
                                                        value={style.color}
                                                        onChange={(e) => updateStyle('jalan_utama', 'color', e.target.value)}
                                                        className="w-5 h-5 rounded cursor-pointer border border-slate-200 dark:border-slate-800 bg-transparent p-0"
                                                    />
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="8"
                                                        value={style.width}
                                                        onChange={(e) => updateStyle('jalan_utama', 'width', parseInt(e.target.value, 10) || 1)}
                                                        className="w-9 h-6 text-[10px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-center font-bold"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {/* 6. Marker Titik */}
                        <AccordionItem value="marker" className="border-b border-slate-105 last:border-0 border-slate-100 dark:border-slate-800">
                            <AccordionTrigger className="text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:no-underline py-2">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-3 bg-sky-600 rounded-sm" />
                                    Pin Penanda (Marker)
                                </span>
                            </AccordionTrigger>
                            <AccordionContent className="pb-3 pt-1 space-y-2">
                                <div className="bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                    {(() => {
                                        const style = customStyles['marker_titik'] || { color: '#1e40af', scale: 0.07 };
                                        return (
                                            <div className="flex items-center justify-between gap-3 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-[10px] font-semibold text-slate-755 dark:text-slate-300 block">Marker / Titik Lokasi</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <img src="https://cdn-icons-png.flaticon.com/512/684/684908.png" className="w-4 h-4 object-contain" alt="pin" style={{ filter: style.color !== '#1e40af' ? `hue-rotate(${Math.floor(Math.random() * 360)}deg)` : undefined }} />
                                                        <span className="text-[8px] font-mono text-slate-400 font-bold">{style.color}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <input
                                                        type="color"
                                                        value={style.color}
                                                        onChange={(e) => updateStyle('marker_titik', 'color', e.target.value)}
                                                        className="w-5 h-5 rounded cursor-pointer border border-slate-200 dark:border-slate-800 bg-transparent p-0"
                                                    />
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0.02"
                                                        max="0.2"
                                                        value={style.scale}
                                                        onChange={(e) => updateStyle('marker_titik', 'scale', parseFloat(e.target.value) || 0.07)}
                                                        className="w-12 h-6 text-[10px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-center font-bold font-mono"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </TabsContent>
        </Tabs>
    );
}
