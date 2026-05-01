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
    ExternalLink,
    Hash,
    Link as LinkIcon,
    Check,
    Copy,
    FileJson,
    FileText,
    FileArchive,
    Code,
    FileImage
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import type { MetaFunction } from "react-router";

import { MonitoringSidebar } from "~/features/monitoring/components/MonitoringSidebar";
import { BasemapToggle } from "~/features/monitoring/components/BasemapToggle";

export const meta: MetaFunction = () => {
    return [
        { title: "Preview Dataset - GIGIS Monitoring" },
    ];
};

const BASEMAP_URLS: Record<string, string> = {
    'osm': 'osm',
    'google-road': 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    'google-sat': 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    'carto-light': 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    'carto-dark': 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    'satellite': 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

export default function DatasetPreviewPage() {
    const { slug } = useParams();
    const id = slug?.split('-')[0];
    const navigate = useNavigate();
    const mapRef = useRef<OpenLayersMapRef>(null);

    const [dataset, setDataset] = useState<GeoNodeResource | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeBasemapId, setActiveBasemapId] = useState('osm');
    const [isCopied, setIsCopied] = useState(false);

    const handleCopyLink = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        setIsCopied(true);
        toast.success("Link berhasil disalin!", {
            description: "URL dataset telah disalin ke clipboard.",
            icon: <LinkIcon className="h-4 w-4 text-blue-500" />,
        });
        setTimeout(() => setIsCopied(false), 2000);
    };

    useEffect(() => {
        const fetchDetail = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const data = await geonodeService.getDatasetDetail(id);
                setDataset(data);
                if (data.links) {
                    console.log("Dataset Links:", data.links);
                }
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
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyLink}
                        className={cn(
                            "hidden md:flex rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2 transition-all duration-300",
                            isCopied ? "border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20" : "hover:border-blue-500 hover:text-blue-600"
                        )}
                    >
                        {isCopied ? (
                            <>
                                <Check size={14} className="animate-in zoom-in duration-300" />
                                Tersalin
                            </>
                        ) : (
                            <>
                                <Share2 size={14} /> Bagikan
                            </>
                        )}
                    </Button>
                    <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 font-bold uppercase tracking-widest text-[10px] gap-2 shadow-lg shadow-blue-200 dark:shadow-none">
                        <Download size={14} /> Download
                    </Button>
                </div>
            </div>

            <div className="flex-1 relative flex overflow-hidden">
                {/* Sidebar Info */}
                <MonitoringSidebar
                    isOpen={isSidebarOpen}
                    onToggle={setIsSidebarOpen}
                    widthClass="w-[360px]"
                    className="bg-white/95 dark:bg-slate-900/95 shadow-2xl border-r border-slate-200 dark:border-slate-800 backdrop-blur-md"
                >
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
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-[1.2] tracking-tight">
                                        {dataset?.title}
                                    </h2>
                                </div>
                            </div>

                            {/* Abstract / Description */}
                            <div className="p-5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50 space-y-3">
                                <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                                    <Info size={14} className="text-blue-500" />
                                    <span className="text-[11px] font-black uppercase tracking-widest">Abstrak</span>
                                </div>
                                <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed italic">
                                    {dataset?.abstract || "Tidak ada deskripsi rinci yang tersedia untuk dataset ini."}
                                </p>
                            </div>

                            {/* Metadata Section */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                            <Layers size={16} className="text-blue-500" />
                                        </div>
                                        <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Informasi Atribut</span>
                                    </div>
                                    {dataset?.resource_type && (
                                        <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-none rounded-full px-3 py-0.5 text-[9px] font-black uppercase tracking-tighter">
                                            {dataset.resource_type}
                                        </Badge>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {/* Primary Metadata Cards */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm space-y-2">
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Hash size={12} />
                                                <span className="text-[9px] font-black uppercase tracking-tight">ID Dataset</span>
                                            </div>
                                            <p className="text-xs font-black text-slate-900 dark:text-white">#{dataset?.pk}</p>
                                        </div>
                                        <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm space-y-2">
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Database size={12} />
                                                <span className="text-[9px] font-black uppercase tracking-tight">Workspace</span>
                                            </div>
                                            <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                                                {dataset?.alternate?.split(':')[0] || '-'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Secondary Metadata List */}
                                    <div className="space-y-1">
                                        {dataset && Object.entries(dataset)
                                            .filter(([key]) =>
                                                ['abstract', 'alternate', 'created', 'srid', 'title', 'category'].includes(key)
                                            )
                                            .map(([key, value]) => {
                                                const isValueUrl = typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));

                                                if (key === 'category' && typeof value === 'object' && value !== null) {
                                                    const category = value as { gn_description: string; identifier: string };
                                                    return (
                                                        <div key={key} className="space-y-1">
                                                            <div className="flex flex-col py-3 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-3 rounded-xl transition-all group">
                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                    <div className="w-1 h-3 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-blue-500 transition-colors" />
                                                                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">Category Description</span>
                                                                </div>
                                                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 break-all leading-relaxed">
                                                                    {category.gn_description || '-'}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-col py-3 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-3 rounded-xl transition-all group">
                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                    <div className="w-1 h-3 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-blue-500 transition-colors" />
                                                                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">Category Identifier</span>
                                                                </div>
                                                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 break-all leading-relaxed">
                                                                    {category.identifier || '-'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                const stringValue = String(value);

                                                return (
                                                    <div key={key} className="flex flex-col py-3 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-3 rounded-xl transition-all group">
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-1 h-3 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-blue-500 transition-colors" />
                                                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">
                                                                    {key.replace(/_/g, ' ')}
                                                                </span>
                                                            </div>
                                                            {isValueUrl && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600"
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(stringValue);
                                                                        toast.success("Link disalin!", {
                                                                            description: `${key.replace(/_/g, ' ')} telah disalin.`,
                                                                            icon: <Copy size={12} />
                                                                        });
                                                                    }}
                                                                >
                                                                    <Copy size={12} />
                                                                </Button>
                                                            )}
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <span className={cn(
                                                                "text-[11px] font-bold break-all leading-relaxed",
                                                                isValueUrl ? "text-blue-600 dark:text-blue-400 underline underline-offset-4 decoration-blue-500/30" : "text-slate-700 dark:text-slate-300"
                                                            )}>
                                                                {stringValue}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        }

                                    </div>
                                </div>
                            </div>

                            {/* Links & Resources Section */}
                            {dataset?.links && dataset.links.length > 0 && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                            <LinkIcon size={16} className="text-emerald-500" />
                                        </div>
                                        <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Links</span>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2">
                                        {dataset.links.map((link, index) => {
                                            // Determine icon based on link type or extension
                                            let Icon = ExternalLink;
                                            if (link.link_type === 'metadata') Icon = FileText;
                                            else if (link.link_type === 'image' || link.mime.includes('image')) Icon = FileImage;
                                            else if (link.link_type.includes('WMS') || link.link_type.includes('WFS')) Icon = Globe;
                                            else if (link.extension === 'json' || link.extension === 'geojson') Icon = FileJson;
                                            else if (link.extension === 'zip' || link.extension === 'shp') Icon = FileArchive;
                                            else if (link.extension === 'xml') Icon = Code;
                                            else if (link.link_type === 'data') Icon = Database;

                                            return (
                                                <Button
                                                    key={index}
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full justify-start h-auto py-3 px-4 rounded-xl border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 group transition-all"
                                                    onClick={() => window.open(link.url, '_blank')}
                                                >
                                                    <div className="flex items-center gap-3 w-full overflow-hidden">
                                                        <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-800 transition-colors">
                                                            <Icon size={14} className="text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                                                        </div>
                                                        <div className="flex flex-col items-start overflow-hidden">
                                                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-blue-300 truncate w-full text-left">
                                                                {link.name}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                                                                    {link.link_type}
                                                                </span>
                                                                {link.extension && (
                                                                    <Badge variant="outline" className="px-1.5 py-0 text-[8px] h-3.5 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 uppercase">
                                                                        {link.extension}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <ExternalLink size={12} className="ml-auto shrink-0 text-slate-300 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all" />
                                                    </div>
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Bar (Pinned to bottom) */}
                    <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 backdrop-blur-sm mt-auto">
                        <Button
                            className="w-full h-11 rounded-xl bg-slate-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 font-bold uppercase tracking-widest text-[10px] gap-2 shadow-xl shadow-slate-200 dark:shadow-none"
                            onClick={() => window.open(`${dataset?.detail_url}`, '_blank')}
                        >
                            <ExternalLink size={14} /> Lihat Detail di Geonode
                        </Button>
                    </div>
                </MonitoringSidebar>

                {/* Map Section */}
                <div className="flex-1 relative bg-slate-100 dark:bg-slate-900">
                    {/* Toggle button removed as it's now handled by MonitoringSidebar */}

                    {/* Basemap Toggle Component */}
                    <div className="absolute bottom-4 right-4 z-30">
                        <BasemapToggle
                            activeBasemap={activeBasemapId}
                            onBasemapChange={setActiveBasemapId}
                        />
                    </div>

                    {/* Map Instance */}
                    <OpenLayersMap
                        ref={mapRef}
                        className="w-full h-full"
                        basemapUrl={BASEMAP_URLS[activeBasemapId]}
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
