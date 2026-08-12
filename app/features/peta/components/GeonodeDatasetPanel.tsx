import { useState, useEffect } from 'react';
import { Search, Plus, Check, Loader2, Database, RefreshCw } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { cn, getProxiedLayerUrl } from '~/lib/utils';
import type { MapLayerConfig } from './OpenLayersMap';
import { layerService, type Layer } from '~/features/master/services/layer.service';

interface GeonodeDatasetPanelProps {
    onAddLayer: (layer: MapLayerConfig) => void;
    activeLayerIds: string[];
}

let cachedLayers: Layer[] | null = null;

export function GeonodeDatasetPanel({ onAddLayer, activeLayerIds }: GeonodeDatasetPanelProps) {
    const [layers, setLayers] = useState<Layer[]>(cachedLayers || []);
    const [loading, setLoading] = useState(!cachedLayers);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchLayers = async (force = false) => {
        if (!force && cachedLayers) {
            setLayers(cachedLayers);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const data = await layerService.getAll(true); // active_only = true
            cachedLayers = data;
            setLayers(cachedLayers || []);
        } catch (error) {
            console.error('Failed to fetch map layers:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!cachedLayers) {
            fetchLayers();
        }
    }, []);

    const filteredLayers = layers.filter((layer) => {
        const nameMatch = layer.name ? layer.name.toLowerCase().includes(searchQuery.toLowerCase()) : false;
        const descMatch = layer.description ? layer.description.toLowerCase().includes(searchQuery.toLowerCase()) : false;
        return nameMatch || descMatch;
    });

    const handleAdd = (layer: Layer) => {
        // Redirect external Geoserver URL to our local proxy to avoid CORS
        const proxyUrl = getProxiedLayerUrl(layer.url);

        onAddLayer({
            id: `layer-${layer.id}`,
            title: layer.name,
            type: layer.protocol === 'OGC:WMS' ? 'wms' : (layer.protocol === 'XYZ' ? 'tile' : 'vector'),
            url: proxyUrl,
            params: {
                'LAYERS': layer.layer_name,
                'VERSION': '1.1.1'
            },
            legendUrl: layer.protocol === 'OGC:WMS' ? `${proxyUrl}?request=GetLegendGraphic&format=image/png&layer=${layer.layer_name}` : undefined,
            visible: true,
            opacity: layer.opacity ?? 1,
            zIndex: layer.order ?? 50
        });
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950/50 overflow-hidden">
            {/* Header / Search bar */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <Input
                        placeholder="Cari layer dataset spasial..."
                        className="pl-9 h-9 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium rounded-xl focus-visible:ring-blue-500/20"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-9 w-9 rounded-xl shrink-0 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                    onClick={() => fetchLayers(true)}
                    disabled={loading}
                    title="Muat ulang dataset"
                >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </Button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="animate-spin text-blue-600" size={24} />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Memuat layer...</p>
                    </div>
                ) : filteredLayers.length > 0 ? (
                    <div className="flex flex-col gap-2">
                        {filteredLayers.map((layer) => {
                            const isAdded = activeLayerIds.includes(`layer-${layer.id}`);
                            return (
                                <div key={layer.id} className="group relative overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-blue-100 dark:hover:border-blue-900/30 flex p-2.5 gap-3">
                                    {/* Small Map Indicator / Icon */}
                                    <div className="w-12 h-12 shrink-0 relative overflow-hidden rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center">
                                        <Database className="text-blue-500" size={20} />
                                    </div>

                                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                        <div>
                                            <h4 className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                                                {layer.name || 'Untitled Layer'}
                                            </h4>
                                            {layer.description && (
                                                <p className="text-[9px] text-slate-400 font-medium line-clamp-1 mt-0.5 tracking-tight italic">
                                                    {layer.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between gap-2 mt-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                    {layer.protocol}
                                                </span>
                                                <span className={cn(
                                                    "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                                                    layer.source_type === 'internal'
                                                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                                                        : "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400"
                                                )}>
                                                    {layer.source_type}
                                                </span>
                                            </div>

                                            <Button
                                                size="sm"
                                                variant={isAdded ? "outline" : "default"}
                                                className={cn(
                                                    "h-6 px-3 text-[9px] font-black rounded-lg transition-all uppercase tracking-tighter",
                                                    isAdded
                                                        ? "border-emerald-200 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-900/30 dark:text-emerald-400"
                                                        : "bg-blue-600 hover:bg-blue-700 h-6"
                                                )}
                                                onClick={() => !isAdded && handleAdd(layer)}
                                                disabled={isAdded}
                                            >
                                                {isAdded ? (
                                                    <>
                                                        <Check size={10} className="mr-1" /> AKTIF
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus size={10} className="mr-1" /> TAMBAH
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-8 text-center gap-2">
                        <Database className="text-slate-200 dark:text-slate-850 mb-2" size={32} />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tidak ada layer aktif</p>
                        <p className="text-[10px] text-slate-400 italic">Hubungi Admin Bappeda untuk mensinkronisasikan layer katalog.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
