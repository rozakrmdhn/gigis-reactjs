import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { geonodeService, type GeoNodeResource } from "~/features/katalog/services/geonode.service";
import { OpenLayersMap, type OpenLayersMapRef, type MapLayerConfig } from "~/features/peta/components/OpenLayersMap";
import { 
    ArrowLeft, 
    Layers, 
    Info, 
    Map as MapIcon, 
    Maximize, 
    Minimize,
    Database,
    Share2,
    Download,
    ChevronLeft,
    ChevronRight,
    Globe,
    ExternalLink
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
    return [
        { title: "Preview Dataset - GIGIS Monitoring" },
    ];
};

const BASEMAPS = [
    { id: 'osm', name: 'OSM Standard', url: 'osm', thumbnail: 'https://a.tile.openstreetmap.org/0/0/0.png' },
    { id: 'satellite', name: 'Google Satellite', url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', thumbnail: 'https://mt1.google.com/vt/lyrs=s&x=0&y=0&z=0' },
    { id: 'hybrid', name: 'Google Hybrid', url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', thumbnail: 'https://mt1.google.com/vt/lyrs=y&x=0&y=0&z=0' },
    { id: 'terrain', name: 'Google Terrain', url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', thumbnail: 'https://mt1.google.com/vt/lyrs=p&x=0&y=0&z=0' },
];

export default function DatasetPreviewPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const mapRef = useRef<OpenLayersMapRef>(null);
    
    const [dataset, setDataset] = useState<GeoNodeResource | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeBasemap, setActiveBasemap] = useState(BASEMAPS[0]);
    const [showBasemapMenu, setShowBasemapMenu] = useState(false);

    useEffect(() => {
        const fetchDetail = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const data = await geonodeService.getDatasetDetail(id);
                setDataset(data);
            } catch (error) {
                console.error("Failed to load dataset detail:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDetail();
    }, [id]);

    const layers: MapLayerConfig[] = dataset ? [
        {
            id: `geonode-${dataset.pk}`,
            title: dataset.title,
            type: 'wms',
            url: `${window.location.origin}/proxy/geoserver/wms`,
            params: {
                'LAYERS': dataset.alternate,
                'TILED': true,
            },
            visible: true,
            zIndex: 100
        }
    ] : [];

    // Zoom to bbox when dataset loaded
    useEffect(() => {
        if (dataset && dataset.ll_bbox && mapRef.current) {
            // dataset.ll_bbox format: [minx, miny, maxx, maxy]
            // We use zoomToCoordinate or ideally a fitExtent if available
            // Since we don't have fitExtent in ref, we use the coordinate of center
            const centerLon = (dataset.ll_bbox[0] + dataset.ll_bbox[2]) / 2;
            const centerLat = (dataset.ll_bbox[1] + dataset.ll_bbox[3]) / 2;
            mapRef.current.zoomToCoordinate(centerLon, centerLat, 12);
        }
    }, [dataset]);

    return (
        <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
            {/* Header / Top Bar */}
            <div className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 z-40 shrink-0">
                <div className="flex items-center gap-4">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => navigate(-1)}
                        className="rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <ArrowLeft size={20} />
                    </Button>
                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1" />
                    <div className="flex flex-col">
                        <h1 className="text-sm font-black text-slate-900 dark:text-white truncate max-w-[200px] md:max-w-md">
                            {isLoading ? "Memuat..." : dataset?.title}
                        </h1>
                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Globe size={10} /> Preview Dataset
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="hidden md:flex rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2">
                        <Share2 size={14} /> Bagikan
                    </Button>
                    <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 font-bold uppercase tracking-widest text-[10px] gap-2 shadow-lg shadow-blue-200 dark:shadow-none">
                        <Download size={14} /> Download
                    </Button>
                </div>
            </div>

            <div className="flex-1 relative flex overflow-hidden">
                {/* Sidebar Info */}
                <div className={cn(
                    "absolute md:relative z-30 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-2xl md:shadow-none flex flex-col",
                    isSidebarOpen ? "w-[360px] translate-x-0" : "w-0 -translate-x-full md:translate-x-0 md:w-0"
                )}>
                    {/* Sidebar Content */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                        <div className="p-6 space-y-8">
                            {/* Thumbnail & Title */}
                            <div className="space-y-5">
                                <div className="group relative aspect-video rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
                                    {dataset?.thumbnail_url ? (
                                        <img 
                                            src={dataset.thumbnail_url.startsWith('http') ? dataset.thumbnail_url : `https://saggaserv.my.id${dataset.thumbnail_url}`}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            alt="Thumbnail"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                                            <MapIcon size={48} strokeWidth={1.5} />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">
                                        <Database size={10} />
                                        <span>Resource Detail</span>
                                    </div>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white leading-[1.2] tracking-tight">
                                        {dataset?.title}
                                    </h2>
                                </div>
                            </div>

                            {/* Abstract / Description */}
                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50 space-y-3">
                                <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                                    <Info size={14} className="text-blue-500" />
                                    <span className="text-[11px] font-black uppercase tracking-widest">Abstrak</span>
                                </div>
                                <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed italic">
                                    {dataset?.abstract || "Tidak ada deskripsi rinci yang tersedia untuk dataset ini."}
                                </p>
                            </div>

                            {/* Metadata Grid */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-2">
                                    <Layers size={14} className="text-blue-500" />
                                    <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Informasi Atribut</span>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-1">
                                    {dataset && Object.entries(dataset)
                                        .filter(([key, value]) => 
                                            value !== null && 
                                            value !== undefined && 
                                            typeof value !== 'object' &&
                                            !['thumbnail_url', 'detail_url', 'pk', 'uuid', 'id'].includes(key)
                                        )
                                        .map(([key, value]) => (
                                            <div key={key} className="flex flex-col py-3 px-1 border-b border-slate-100 dark:border-slate-800/50 group">
                                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 group-hover:text-blue-500 transition-colors">
                                                    {key.replace(/_/g, ' ')}
                                                </span>
                                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 break-words leading-tight">
                                                    {String(value)}
                                                </span>
                                            </div>
                                        ))
                                    }
                                    {/* Additional specific fields if they are objects but important */}
                                    <div className="flex flex-col py-3 px-1 border-b border-slate-100 dark:border-slate-800/50 group">
                                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 group-hover:text-blue-500 transition-colors">
                                            Workspace
                                        </span>
                                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                            {dataset?.alternate?.split(':')[0] || '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Bar (Pinned to bottom) */}
                    <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 backdrop-blur-sm">
                        <Button 
                            className="w-full h-11 rounded-xl bg-slate-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 font-bold uppercase tracking-widest text-[10px] gap-2 shadow-xl shadow-slate-200 dark:shadow-none"
                            onClick={() => window.open(`https://saggaserv.my.id${dataset?.detail_url}`, '_blank')}
                        >
                            <ExternalLink size={14} /> Lihat Detail di Geonode
                        </Button>
                    </div>
                </div>

                {/* Map Section */}
                <div className="flex-1 relative bg-slate-100 dark:bg-slate-900">
                    {/* Toggle Sidebar Button */}
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={cn(
                            "absolute left-4 top-1/2 -translate-y-1/2 z-30 w-8 h-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all",
                            !isSidebarOpen && "left-4"
                        )}
                    >
                        {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                    </button>

                    {/* Basemap Switcher */}
                    <div className="absolute top-4 right-4 z-30 flex flex-col items-end gap-2">
                        <Button 
                            onClick={() => setShowBasemapMenu(!showBasemapMenu)}
                            className="w-12 h-12 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/60 dark:border-slate-700 shadow-xl text-slate-700 dark:text-slate-200 hover:bg-white p-0"
                        >
                            <Layers size={20} />
                        </Button>
                        
                        {showBasemapMenu && (
                            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shadow-2xl w-48 animate-in slide-in-from-top-2 duration-300">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Pilih Basemap</p>
                                <div className="grid grid-cols-1 gap-2">
                                    {BASEMAPS.map((bm) => (
                                        <button 
                                            key={bm.id}
                                            onClick={() => {
                                                setActiveBasemap(bm);
                                                setShowBasemapMenu(false);
                                            }}
                                            className={cn(
                                                "group flex items-center gap-3 p-2 rounded-2xl transition-all",
                                                activeBasemap.id === bm.id ? "bg-blue-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                                            )}
                                        >
                                            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border-2 border-transparent group-hover:border-white/20">
                                                <img src={bm.thumbnail} className="w-full h-full object-cover" alt={bm.name} />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-tight text-left leading-tight">
                                                {bm.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Map Instance */}
                    <OpenLayersMap 
                        ref={mapRef}
                        className="w-full h-full"
                        basemapUrl={activeBasemap.url}
                        layers={layers}
                        showBatasDesa={false}
                        showJalanUtama={false}
                        showSegmenJalan={false}
                    />
                    
                    {isLoading && (
                        <div className="absolute inset-0 z-20 bg-slate-50/50 dark:bg-slate-950/50 backdrop-blur-[2px] flex items-center justify-center">
                            <div className="bg-white dark:bg-slate-900 px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-white dark:border-slate-800">
                                <div className="h-5 w-5 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mt-0.5">Memuat Peta...</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
