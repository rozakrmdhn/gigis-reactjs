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
        <div className="flex flex-col h-full bg-[#080B11] text-slate-200 overflow-hidden">
            {/* Header / Search bar */}
            <div className="p-3 border-b border-white/[0.08] bg-[#0E131F]/90 flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <Input
                        placeholder="Cari layer dataset spasial..."
                        className="pl-9 h-9 text-xs bg-slate-900 border-white/[0.08] text-white font-medium rounded-xl focus-visible:ring-white/20 placeholder:text-slate-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 rounded-xl shrink-0 border border-white/[0.08] bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
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
                        <Loader2 className="animate-spin text-emerald-400" size={24} />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Memuat layer...</p>
                    </div>
                ) : filteredLayers.length > 0 ? (
                    <div className="flex flex-col gap-2.5">
                        {filteredLayers.map((layer) => {
                            const isAdded = activeLayerIds.includes(`layer-${layer.id}`);
                            return (
                                <div key={layer.id} className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#0C101A] transition-all hover:border-white/[0.16] hover:bg-slate-900/60 flex p-3 gap-3">
                                    {/* Small Map Indicator / Icon */}
                                    <div className="w-11 h-11 shrink-0 relative overflow-hidden rounded-lg bg-slate-800 border border-white/[0.08] flex items-center justify-center text-slate-300 group-hover:text-white transition-colors">
                                        <Database size={18} />
                                    </div>

                                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                        <div>
                                            <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                                                {layer.name || 'Untitled Layer'}
                                            </h4>
                                            {layer.description && (
                                                <p className="text-[10px] text-slate-400 font-normal line-clamp-1 mt-0.5 tracking-tight">
                                                    {layer.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between gap-2 mt-2.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest bg-slate-800 border border-white/[0.08] px-1.5 py-0.5 rounded">
                                                    {layer.protocol}
                                                </span>
                                                <span className={cn(
                                                    "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-white/[0.08]",
                                                    layer.source_type === 'internal'
                                                        ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/40"
                                                        : "bg-amber-950/40 text-amber-400 border-amber-800/40"
                                                )}>
                                                    {layer.source_type}
                                                </span>
                                            </div>

                                            <Button
                                                size="sm"
                                                className={cn(
                                                    "h-7 px-3 text-[9px] font-bold rounded-lg transition-all uppercase tracking-wider cursor-pointer",
                                                    isAdded
                                                        ? "border border-emerald-800/40 text-emerald-400 bg-emerald-950/40"
                                                        : "bg-white text-slate-950 hover:bg-slate-200 shadow-sm"
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
                        <Database className="text-slate-800 mb-2" size={32} />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tidak ada layer aktif</p>
                        <p className="text-[10px] text-slate-500 italic">Hubungi Admin Bappeda untuk mensinkronisasikan layer katalog.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
