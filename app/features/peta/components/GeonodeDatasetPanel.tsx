import { useState, useEffect } from 'react';
import { Search, Plus, Check, Loader2, Database, Info, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { cn } from '~/lib/utils';
import type { MapLayerConfig } from './OpenLayersMap';

interface GeonodeDataset {
    pk: string;
    title: string;
    name: string;
    alternate: string;
    thumbnail_url: string;
    abstract: string;
    links: Array<{
        link_type: string;
        url: string;
    }>;
}

interface GeonodeDatasetPanelProps {
    onAddLayer: (layer: MapLayerConfig) => void;
    activeLayerIds: string[];
}

let cachedDatasets: GeonodeDataset[] | null = null;

export function GeonodeDatasetPanel({ onAddLayer, activeLayerIds }: GeonodeDatasetPanelProps) {
    const [datasets, setDatasets] = useState<GeonodeDataset[]>(cachedDatasets || []);
    const [loading, setLoading] = useState(!cachedDatasets);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchDatasets = async (force = false) => {
        if (!force && cachedDatasets) {
            setDatasets(cachedDatasets);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const response = await fetch('https://saggaserv.my.id/api/v2/datasets?format=json');
            const data = await response.json();
            cachedDatasets = data.datasets || [];
            setDatasets(cachedDatasets);
        } catch (error) {
            console.error('Failed to fetch Geonode datasets:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!cachedDatasets) {
            fetchDatasets();
        }
    }, []);

    const filteredDatasets = datasets.filter((ds) =>
        ds.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ds.abstract.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAdd = (ds: GeonodeDataset) => {
        const wmsLink = ds.links.find(l => l.link_type === 'OGC:WMS');
        if (!wmsLink) return;

        onAddLayer({
            id: `geonode-${ds.pk}`,
            title: ds.title,
            type: 'wms',
            url: wmsLink.url,
            params: {
                'LAYERS': ds.alternate || ds.name,
                'VERSION': '1.1.1'
            },
            visible: true,
            opacity: 1,
            zIndex: 50
        });
    };

    return (
        <div className="flex flex-col h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-white dark:border-slate-800 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-2">
                <div className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-200 dark:shadow-none">
                            <Database size={18} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">KATALOG DATASET</h3>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Geonode Repository</p>
                        </div>
                    </div>
                    <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 rounded-lg shrink-0 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                        onClick={() => fetchDatasets(true)}
                        disabled={loading}
                        aria-label="Muat ulang data"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    </Button>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <Input
                        placeholder="Cari dataset..."
                        className="pl-9 h-9 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-medium rounded-xl focus-visible:ring-blue-500/20"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="animate-spin text-blue-600" size={24} />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Memuat datasets...</p>
                    </div>
                ) : filteredDatasets.length > 0 ? (
                    <div className="flex flex-col gap-2">
                        {filteredDatasets.map((ds) => {
                            const isAdded = activeLayerIds.includes(`geonode-${ds.pk}`);
                            return (
                                <div key={ds.pk} className="group relative overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-blue-100 dark:hover:border-blue-900/30 flex p-2 gap-3">
                                    <div className="w-20 h-16 shrink-0 relative overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                        <img
                                            src={ds.thumbnail_url || 'https://placehold.co/400x225?text=No+Preview'}
                                            alt={ds.title}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    </div>

                                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                        <div>
                                            <div className="flex items-start justify-between gap-2 mb-0.5">
                                                <h4 className="text-[11px] font-extrabold text-slate-900 dark:text-slate-100 line-clamp-1 uppercase tracking-tight">
                                                    {ds.title}
                                                </h4>
                                            </div>
                                            <p className="text-[9px] text-slate-400 font-medium line-clamp-1 lowercase tracking-tight italic">
                                                {ds.abstract || 'Tidak ada deskripsi.'}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 mt-1">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                {ds.alternate.split(':')[0]}
                                            </span>

                                            <Button
                                                size="sm"
                                                variant={isAdded ? "outline" : "default"}
                                                className={cn(
                                                    "h-6 px-3 text-[9px] font-black rounded-lg transition-all uppercase tracking-tighter",
                                                    isAdded
                                                        ? "border-emerald-200 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-900/30 dark:text-emerald-400"
                                                        : "bg-blue-600 hover:bg-blue-700 h-6"
                                                )}
                                                onClick={() => !isAdded && handleAdd(ds)}
                                                disabled={isAdded}
                                            >
                                                {isAdded ? (
                                                    <>
                                                        <Check size={10} className="mr-1" /> AKTIF
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus size={10} className="mr-1" />
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
                        <Search className="text-slate-200 dark:text-slate-800 mb-2" size={32} />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tidak ada dataset</p>
                        <p className="text-[10px] text-slate-400 italic">Coba gunakan kata kunci pencarian lain.</p>
                    </div>
                )}
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border-t border-blue-100 dark:border-blue-900/20 flex items-center justify-center gap-2">
                <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                    Total {filteredDatasets.length} Layer Tersedia <ExternalLink size={10} />
                </span>
            </div>
        </div>
    );
}
