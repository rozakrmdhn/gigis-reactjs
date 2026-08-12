import { lazy, Suspense, useCallback, useEffect, useState, useRef } from "react";
import type { MetaFunction } from "react-router";
import { useParams, useSearchParams, useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import {
    ArrowLeft,
    MapPin,
    ClipboardList,
    ChevronLeft,
    ChevronRight,
    X,
    Route,
    Pentagon,
    Save,
    Keyboard,
    Layers,
    Trash2,
    Eye,
    EyeOff,
    ArrowUp,
    ArrowDown,
    Plus,
    Database,
    Sliders,
    Globe,
    Filter,
    RotateCcw,
    GripVertical,
    Search,
    Loader2
} from "lucide-react";
import { usulanDesaService } from "~/features/usulan-desa/services/usulan-desa.service";
import { getProxiedLayerUrl } from "~/lib/utils";
import { usulanDesaGeometryService } from "~/features/usulan-desa/services/usulan-desa-geometry.service";
import type { UsulanDesa, UsulanDesaGeometry, GeometryType, GeoJSONGeometry } from "~/features/usulan-desa/types/usulan-desa.types";
import { UsulanDesaForm } from "~/features/usulan-desa/components/UsulanDesaForm";
import { GeometryList } from "~/features/usulan-desa/components/GeometryList";
import { CoordinateInputPanel } from "~/features/usulan-desa/components/CoordinateInputPanel";
import { MapControls } from "~/features/monitoring/components/MapControls";
import { LayerManagementPanel } from "~/features/monitoring/components/LayerManagementPanel";
import { basemapService, type Basemap } from "~/features/master/services/basemap.service";
import type { GeometryMapRef } from "~/features/usulan-desa/components/GeometryMap";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import { useIsMobile } from "~/hooks/use-mobile";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "~/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Slider } from "~/components/ui/slider";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";

const BASEMAP_URLS: Record<string, string> = {
    'osm': 'osm',
    'google-road': 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    'google-sat': 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    'carto-light': 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    'carto-dark': 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    'satellite': 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

// Lazy import OpenLayers map to prevent SSR issues during build
const GeometryMap = lazy(() =>
    import("~/features/usulan-desa/components/GeometryMap").then((m) => ({ default: m.GeometryMap }))
);

export const meta: MetaFunction = () => {
    return [
        { title: "Registrasi Spasial Usulan - MELAROSA" },
        { name: "description", content: "Form registrasi usulan beserta peta spasial interaktif." },
    ];
};

export default function RegistrasiUsulanPage() {
    const { id: routeId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const id = routeId || searchParams.get("id"); // edit mode if exists

    // Map ref
    const mapRef = useRef<GeometryMapRef>(null);

    // States
    const [savedUsulan, setSavedUsulan] = useState<UsulanDesa | null>(null);
    const [isLoadingUsulan, setIsLoadingUsulan] = useState(false);

    const [geometries, setGeometries] = useState<UsulanDesaGeometry[]>([]);
    const [isLoadingGeoms, setIsLoadingGeoms] = useState(false);

    // Panels state
    const [isFormPanelOpen, setIsFormPanelOpen] = useState(true);
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
    const [activeRightTab, setActiveRightTab] = useState<string>("katalog");

    const [drawMode, setDrawMode] = useState<GeometryType | null>(null);
    const [drawnGeom, setDrawnGeom] = useState<GeoJSONGeometry | GeoJSONGeometry[] | null>(null);
    const [editingGeometry, setEditingGeometry] = useState<UsulanDesaGeometry | null>(null);
    const [showCoordInput, setShowCoordInput] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showKeteranganDialog, setShowKeteranganDialog] = useState(false);
    const [tempKeterangan, setTempKeterangan] = useState("");

    const [selectedKecamatanId, setSelectedKecamatanId] = useState<number | null>(null);
    const [showDesaBoundaries, setShowDesaBoundaries] = useState(false);

    const [activeBasemap, setActiveBasemap] = useState<string>("osm");
    const [basemaps, setBasemaps] = useState<Basemap[]>([]);
    const [isBasemapPanelOpen, setIsBasemapPanelOpen] = useState(false);

    // Overlay layers state
    const [dbLayers, setDbLayers] = useState<any[]>([]);
    const [activeOverlays, setActiveOverlays] = useState<string[]>([]);
    const [visibleOverlays, setVisibleOverlays] = useState<string[]>([]);
    const [overlayOpacities, setOverlayOpacities] = useState<Record<string, number>>({});
    const [overlayCqlFilters, setOverlayCqlFilters] = useState<Record<string, string>>({});



    useEffect(() => {
        basemapService.getAll(true)
            .then((data) => {
                setBasemaps(data);
                if (data.length > 0) {
                    setActiveBasemap(data[0].id);
                }
            })
            .catch((err) => console.error("Gagal memuat basemap:", err));
    }, []);

    // 1. Initial load of all active layers for registry / default layers
    useEffect(() => {
        const fetchInitialLayers = async () => {
            try {
                const baseUrl = import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "");
                const response = await fetch(`${baseUrl}/v1/layers?active_only=true`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'success' && Array.isArray(data.result)) {
                        setDbLayers(data.result);

                        // By default, activate layers where default_visible is true
                        const defaultActive = data.result
                            .filter((l: any) => l.default_visible)
                            .map((l: any) => l.id);
                        setActiveOverlays(defaultActive);
                        setVisibleOverlays(defaultActive);

                        const initialOpacities: Record<string, number> = {};
                        data.result.forEach((l: any) => {
                            initialOpacities[l.id] = l.opacity ?? 1.0;
                        });
                        setOverlayOpacities(initialOpacities);
                    }
                }
            } catch (err) {
                console.error("Gagal memuat default layers:", err);
            }
        };
        fetchInitialLayers();
    }, []);



    const selectedBasemap = basemaps.find(b => b.id === activeBasemap);
    const basemapUrl = selectedBasemap ? selectedBasemap.url : "osm";
    const isMobile = useIsMobile();

    // Map overlays from active layers
    const mapOverlays = activeOverlays
        .map((layerId, index) => {
            const l = dbLayers.find(layer => layer.id === layerId);
            if (!l) return null;
            const proxyUrl = getProxiedLayerUrl(l.url);
            const layerType: 'wms' | 'tile' | 'vector' = l.protocol === 'OGC:WMS' ? 'wms' : (l.protocol === 'XYZ' ? 'tile' : 'vector');
            return {
                id: l.id,
                title: l.name,
                type: layerType,
                url: proxyUrl,
                params: {
                    'LAYERS': l.layer_name,
                    'VERSION': '1.1.1',
                    ...(l.protocol === 'OGC:WMS' && overlayCqlFilters[l.id]
                        ? { 'CQL_FILTER': overlayCqlFilters[l.id] }
                        : {})
                },
                visible: visibleOverlays.includes(l.id),
                opacity: overlayOpacities[l.id] ?? 1.0,
                zIndex: index + 50
            };
        })
        .filter(Boolean) as any[];

    // Computed toolbar center offset (desktop only, panels don't offset on mobile)
    const toolbarLeft = !isMobile && isFormPanelOpen ? '24rem' : '0px';
    const toolbarRight = !isMobile && isRightPanelOpen ? '26.25rem' : '0px';

    // Load geometries
    const fetchGeometries = useCallback(async (usulanId: number | string) => {
        setIsLoadingGeoms(true);
        try {
            const data = await usulanDesaGeometryService.getByUsulanId(usulanId);
            setGeometries(data);
        } catch (err) {
            console.error("Gagal load geometry list:", err);
            toast.error("Gagal memuat daftar geometry.");
        } finally {
            setIsLoadingGeoms(false);
        }
    }, []);

    useEffect(() => {
        if (id) {
            setIsLoadingUsulan(true);
            usulanDesaService.getById(id)
                .then((data) => {
                    if (data) {
                        setSavedUsulan(data);
                        setSelectedKecamatanId(Number(data.id_kecamatan));
                        fetchGeometries(data.id);
                        setIsRightPanelOpen(false);
                    } else {
                        toast.error("Usulan tidak ditemukan.");
                        navigate("/admin/usulan-desa/daftar-usulan");
                    }
                })
                .catch((err) => {
                    console.error("Gagal memuat detail usulan:", err);
                    toast.error("Gagal memuat detail usulan.");
                })
                .finally(() => setIsLoadingUsulan(false));
        } else {
            setSavedUsulan(null);
            setGeometries([]);
            setEditingGeometry(null);
            setSelectedKecamatanId(null);
            setShowDesaBoundaries(false);
            setIsRightPanelOpen(false);
            setIsFormPanelOpen(true);
        }
    }, [id, navigate, fetchGeometries]);

    // Handlers
    const handleFormSuccess = useCallback((result: UsulanDesa) => {
        setSavedUsulan(result);
        setSelectedKecamatanId(Number(result.id_kecamatan));
        setIsRightPanelOpen(false);
        fetchGeometries(result.id);
        if (id) {
            toast.success("Data usulan berhasil diperbarui.");
        } else {
            toast.success("Data usulan berhasil disimpan. Silakan tambahkan lokasi spasial di peta.");
        }
    }, [id, fetchGeometries]);

    const handleRegisterNew = useCallback(() => {
        setSavedUsulan(null);
        setGeometries([]);
        setEditingGeometry(null);
        setSelectedKecamatanId(null);
        setShowDesaBoundaries(false);
        setIsRightPanelOpen(false);
        setIsFormPanelOpen(true);
        setDrawMode(null);
        setDrawnGeom(null);
    }, []);

    const handleDelete = useCallback(async () => {
        if (!savedUsulan) return;
        setIsDeleting(true);
        try {
            // 1. Fetch geometries
            const geoms = await usulanDesaGeometryService.getByUsulanId(savedUsulan.id);

            // 2. Delete geometries if they exist
            if (geoms && geoms.length > 0) {
                for (const geom of geoms) {
                    await usulanDesaGeometryService.remove(geom.id);
                }
            }

            // 3. Delete usulan
            const success = await usulanDesaService.remove(savedUsulan.id);
            if (success) {
                toast.success("Usulan beserta seluruh lokasinya berhasil dihapus.");
                navigate("/admin/usulan-desa/daftar-usulan");
            }
        } catch (error) {
            console.error("Gagal menghapus usulan:", error);
            toast.error("Gagal menghapus usulan.");
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    }, [savedUsulan, navigate]);

    const handleDrawComplete = useCallback((geom: GeoJSONGeometry | GeoJSONGeometry[]) => {
        setDrawnGeom(geom);
    }, []);

    const handleSaveGeometryClick = () => {
        setTempKeterangan("");
        setShowKeteranganDialog(true);
    };

    const handleSaveEditedGeometryClick = () => {
        if (editingGeometry) {
            setTempKeterangan(editingGeometry.keterangan_geometry || "");
            setShowKeteranganDialog(true);
        }
    };

    const handleConfirmSave = async () => {
        if (!tempKeterangan.trim()) {
            toast.error("Keterangan lokasi harus diisi.");
            return;
        }

        if (editingGeometry) {
            try {
                const isGeomChanged = !!(
                    drawnGeom &&
                    JSON.stringify(Array.isArray(drawnGeom) ? drawnGeom[0].coordinates : drawnGeom.coordinates) !== JSON.stringify(editingGeometry.geom.coordinates)
                );

                const payload: any = {
                    keterangan_geometry: tempKeterangan.trim()
                };

                if (isGeomChanged && drawnGeom) {
                    const activeGeom = Array.isArray(drawnGeom) ? drawnGeom[0] : drawnGeom;
                    payload.geom = {
                        type: activeGeom.type,
                        coordinates: activeGeom.coordinates
                    };
                }

                const success = await usulanDesaGeometryService.update(editingGeometry.id, payload);

                if (success) {
                    toast.success("Geometri lokasi berhasil diperbarui.");
                    setEditingGeometry(null);
                    setDrawnGeom(null);
                    setDrawMode(null);
                    setShowCoordInput(false);
                    setShowKeteranganDialog(false);
                    fetchGeometries(savedUsulan!.id);
                } else {
                    toast.error("Gagal memperbarui geometri.");
                }
            } catch (err) {
                console.error("Gagal memperbarui geometri:", err);
                toast.error("Terjadi kesalahan saat memperbarui.");
            }
        } else {
            if (!drawnGeom || !savedUsulan) return;
            try {
                const geomsToSave = Array.isArray(drawnGeom) ? drawnGeom : [drawnGeom];

                for (const geom of geomsToSave) {
                    await usulanDesaGeometryService.create({
                        id_usulan_desa: savedUsulan.id,
                        geom: geom,
                        keterangan_geometry: tempKeterangan.trim(),
                    });
                }

                toast.success("Geometry lokasi berhasil disimpan.");
                setDrawnGeom(null);
                setDrawMode(null);
                setShowCoordInput(false);
                setShowKeteranganDialog(false);
                fetchGeometries(savedUsulan.id);
                setIsRightPanelOpen(true);
                setActiveRightTab("lokasi");
            } catch (err) {
                console.error("Gagal menyimpan geometry:", err);
                toast.error("Gagal menyimpan geometry.");
            }
        }
    };

    const handleCancelDraw = () => {
        setDrawMode(null);
        setDrawnGeom(null);
        setEditingGeometry(null);
        setShowCoordInput(false);
    };

    const handleFocusGeometry = (item: UsulanDesaGeometry) => {
        mapRef.current?.zoomToGeometry(item);
    };

    return (
        <div className="relative flex-1 min-h-0 w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
            {/* Background Fullscreen Map */}
            <div className="absolute inset-0 w-full h-full z-0">
                <Suspense fallback={
                    <div className="w-full h-full bg-slate-100 dark:bg-slate-900 animate-pulse flex items-center justify-center text-slate-400">
                        <div className="text-center space-y-2">
                            <Spinner className="h-8 w-8 text-blue-600 mx-auto animate-spin" />
                            <p className="text-sm font-semibold">Menginisialisasi Peta Spasial...</p>
                        </div>
                    </div>
                }>
                    <GeometryMap
                        ref={mapRef}
                        savedGeometries={geometries}
                        drawMode={drawMode}
                        editingGeometry={editingGeometry}
                        onDrawComplete={handleDrawComplete}
                        showDesaBoundaries={showDesaBoundaries}
                        idKecamatanForDesa={selectedKecamatanId}
                        basemapUrl={basemapUrl}
                        isLeftPanelOpen={isFormPanelOpen}
                        isRightPanelOpen={isRightPanelOpen}
                        layers={mapOverlays}
                        className="w-full h-full border-none rounded-none"
                    />
                </Suspense>
            </div>

            {/* Left Trigger Button (if panel is closed) */}
            {!isFormPanelOpen && (
                <Button
                    onClick={() => setIsFormPanelOpen(true)}
                    className="absolute top-4 left-4 z-20 shadow-xl gap-2 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-bold text-xs rounded-xl"
                >
                    <ClipboardList size={15} />
                    Form Usulan
                    <ChevronRight size={15} className="text-slate-400" />
                </Button>
            )}

            {/* Top Right Controls Group */}
            <div className={cn(
                "absolute top-4 z-20 flex flex-col items-end gap-2.5 pointer-events-none",
                isRightPanelOpen ? "right-[400px]" : "right-4"
            )}>
                {/* Toggle Workspace Spasial Button */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                onClick={() => {
                                    if (isRightPanelOpen && (activeRightTab === 'katalog' || activeRightTab === 'layers')) {
                                        setIsRightPanelOpen(false);
                                    } else {
                                        setIsRightPanelOpen(true);
                                        if (activeRightTab === 'lokasi') {
                                            setActiveRightTab('katalog');
                                        }
                                    }
                                }}
                                className={cn(
                                    "h-10 w-10 md:h-9 md:w-9 rounded-xl border border-border bg-background/90 backdrop-blur-sm shadow-md hover:bg-muted text-foreground pointer-events-auto transition-all duration-300",
                                    isRightPanelOpen && (activeRightTab === 'katalog' || activeRightTab === 'layers')
                                        ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white"
                                        : ""
                                )}
                            >
                                <Layers className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                            <p className="text-xs font-semibold">Manajemen Layer</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {/* Toggle Lokasi Button (only when usulan exists) */}
                {savedUsulan && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={() => {
                                        if (isRightPanelOpen && activeRightTab === 'lokasi') {
                                            setIsRightPanelOpen(false);
                                        } else {
                                            setIsRightPanelOpen(true);
                                            setActiveRightTab("lokasi");
                                        }
                                    }}
                                    className={cn(
                                        "h-10 w-10 md:h-9 md:w-9 rounded-xl border border-border bg-background/90 backdrop-blur-sm shadow-md hover:bg-muted text-foreground pointer-events-auto transition-all duration-300",
                                        isRightPanelOpen && activeRightTab === 'lokasi'
                                            ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white"
                                            : ""
                                    )}
                                >
                                    <MapPin className={cn("h-4 w-4", isRightPanelOpen && activeRightTab === 'lokasi' ? "text-white" : "text-blue-500")} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                                <p className="text-xs font-semibold">Daftar Lokasi ({geometries.length})</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>

            {/* Bottom Center: Draw Toolbar (only show when usulan is saved) */}
            {savedUsulan && !drawnGeom && (
                <TooltipProvider>
                    <div
                        className="absolute bottom-6 z-20 flex justify-center items-center pointer-events-none transition-all duration-300"
                        style={{
                            left: toolbarLeft,
                            right: toolbarRight,
                        }}
                    >
                        <div className="flex items-center gap-1 p-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border dark:border-slate-800 rounded-2xl shadow-2xl pointer-events-auto">
                            {!drawMode && !editingGeometry ? (
                                <>
                                    {/* Titik Tool */}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="flex flex-col items-center justify-center gap-1 h-auto min-w-[44px] md:min-w-[64px] px-2 py-1.5 rounded-xl transition-all duration-300 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                                                onClick={() => setDrawMode("Point")}
                                            >
                                                <MapPin className="h-4 w-4 text-rose-500" />
                                                <span className="text-[9px] font-black tracking-tight leading-none uppercase hidden md:block">Titik</span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            <p className="text-xs font-semibold">Gambar Titik Koordinat</p>
                                        </TooltipContent>
                                    </Tooltip>

                                    {/* Garis Tool */}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="flex flex-col items-center justify-center gap-1 h-auto min-w-[44px] md:min-w-[64px] px-2 py-1.5 rounded-xl transition-all duration-300 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 cursor-pointer"
                                                onClick={() => setDrawMode("LineString")}
                                            >
                                                <Route className="h-4 w-4 text-blue-500" />
                                                <span className="text-[9px] font-black tracking-tight leading-none uppercase hidden md:block">Garis</span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            <p className="text-xs font-semibold">Gambar Garis Ruas</p>
                                        </TooltipContent>
                                    </Tooltip>

                                    {/* Polygon Tool */}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="flex flex-col items-center justify-center gap-1 h-auto min-w-[44px] md:min-w-[64px] px-2 py-1.5 rounded-xl transition-all duration-300 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 cursor-pointer"
                                                onClick={() => setDrawMode("Polygon")}
                                            >
                                                <Pentagon className="h-4 w-4 text-emerald-500" />
                                                <span className="text-[9px] font-black tracking-tight leading-none uppercase hidden md:block">Area</span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            <p className="text-xs font-semibold">Gambar Polygon Area</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </>
                            ) : (
                                <>
                                    {/* Active Mode Info */}
                                    <div className="flex flex-col items-start justify-center px-3 py-1 shrink-0">
                                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider block">Mode Aktif</span>
                                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                                            {drawMode
                                                ? `Menggambar ${drawMode === "Point" ? "Titik" : drawMode === "LineString" ? "Garis" : "Area"}...`
                                                : "Menggeser Geometry..."}
                                        </span>
                                    </div>

                                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />

                                    {/* If we are editing, we can still choose to redraw */}
                                    {editingGeometry && !drawMode && (
                                        <>
                                            <div className="flex items-center gap-1">
                                                {/* Redraw Point */}
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="flex flex-col items-center justify-center gap-0.5 h-auto min-w-[36px] px-1 py-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                                                            onClick={() => setDrawMode("Point")}
                                                        >
                                                            <MapPin className="h-3.5 w-3.5 text-rose-500" />
                                                            <span className="text-[8px] font-bold uppercase leading-none">Redraw Titik</span>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">
                                                        <p className="text-xs font-semibold">Gambar Ulang sebagai Titik</p>
                                                    </TooltipContent>
                                                </Tooltip>

                                                {/* Redraw Line */}
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="flex flex-col items-center justify-center gap-0.5 h-auto min-w-[36px] px-1 py-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                                            onClick={() => setDrawMode("LineString")}
                                                        >
                                                            <Route className="h-3.5 w-3.5 text-blue-500" />
                                                            <span className="text-[8px] font-bold uppercase leading-none">Redraw Garis</span>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">
                                                        <p className="text-xs font-semibold">Gambar Ulang sebagai Garis</p>
                                                    </TooltipContent>
                                                </Tooltip>

                                                {/* Redraw Area */}
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="flex flex-col items-center justify-center gap-0.5 h-auto min-w-[36px] px-1 py-1 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                                                            onClick={() => setDrawMode("Polygon")}
                                                        >
                                                            <Pentagon className="h-3.5 w-3.5 text-emerald-500" />
                                                            <span className="text-[8px] font-bold uppercase leading-none">Redraw Area</span>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">
                                                        <p className="text-xs font-semibold">Gambar Ulang sebagai Area (Polygon)</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />
                                        </>
                                    )}

                                    {/* If drawMode is active, show Manual Coordinate entry button */}
                                    {drawMode && (
                                        <>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className={cn(
                                                            "flex flex-col items-center justify-center gap-1 h-auto min-w-[44px] md:min-w-[64px] px-2 py-1.5 rounded-xl transition-all duration-300 text-slate-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20 cursor-pointer",
                                                            showCoordInput && "bg-violet-50 text-violet-600 dark:bg-violet-950/40"
                                                        )}
                                                        onClick={() => setShowCoordInput(!showCoordInput)}
                                                    >
                                                        <Keyboard className="h-4 w-4 text-violet-500" />
                                                        <span className="text-[9px] font-black tracking-tight leading-none uppercase hidden md:block">Koordinat</span>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">
                                                    <p className="text-xs font-semibold">Input Koordinat Manual</p>
                                                </TooltipContent>
                                            </Tooltip>
                                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />
                                        </>
                                    )}

                                    {/* Tombol Batal */}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="flex flex-col items-center justify-center gap-1 h-auto min-w-[44px] md:min-w-[64px] px-2 py-1.5 rounded-xl transition-all duration-300 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 cursor-pointer"
                                                onClick={handleCancelDraw}
                                            >
                                                <X className="h-4 w-4" />
                                                <span className="text-[9px] font-black tracking-tight leading-none uppercase hidden md:block">Batal</span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            <p className="text-xs font-semibold">Batalkan interaksi peta</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </>
                            )}
                        </div>
                    </div>
                </TooltipProvider>
            )}

            {/* Panel Input Koordinat Manual */}
            {showCoordInput && drawMode && (
                <div
                    className="absolute bottom-24 z-20 flex justify-center pointer-events-none animate-in fade-in slide-in-from-bottom-2 transition-all duration-300"
                    style={{
                        left: toolbarLeft,
                        right: toolbarRight,
                    }}
                >
                    <div className="pointer-events-auto">
                        <CoordinateInputPanel
                            drawMode={drawMode}
                            onAddPoint={(coords) => mapRef.current?.addPointsFromCoordinates(coords)}
                            onAddLine={(coords) => mapRef.current?.addLineFromCoordinates(coords)}
                            onAddPolygon={(coords) => mapRef.current?.addPolygonFromCoordinates(coords)}
                            onClose={() => setShowCoordInput(false)}
                        />
                    </div>
                </div>
            )}

            {/* Floating Basemap Selector (Bottom Right) */}
            <div className={cn(
                "absolute bottom-6 transition-all duration-300 z-20",
                isRightPanelOpen ? "right-[400px]" : "right-6"
            )}>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="relative pointer-events-auto">
                                <Button
                                    onClick={() => setIsBasemapPanelOpen(!isBasemapPanelOpen)}
                                    className={cn(
                                        "h-12 w-12 rounded-full shadow-2xl border cursor-pointer flex items-center justify-center transition-all duration-300",
                                        isBasemapPanelOpen
                                            ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
                                            : "bg-white/95 dark:bg-slate-900/95 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800"
                                    )}
                                >
                                    <Globe className="h-5 w-5" />
                                </Button>

                                {isBasemapPanelOpen && (
                                    <div className="absolute bottom-14 right-0 w-64 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 p-3 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
                                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider block border-b pb-1">Pilihan Basemap</span>
                                        <div className="grid grid-cols-3 gap-2 pt-1">
                                            {basemaps.map((b) => (
                                                <button
                                                    key={b.id}
                                                    type="button"
                                                    onClick={() => { setActiveBasemap(b.id); setIsBasemapPanelOpen(false); }}
                                                    className={cn(
                                                        "relative overflow-hidden rounded-xl border transition-all active:scale-95 group h-14 cursor-pointer",
                                                        activeBasemap === b.id
                                                            ? "border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-md"
                                                            : "border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700"
                                                    )}
                                                    title={b.name}
                                                >
                                                    {b.thumbnail ? (
                                                        <img src={b.thumbnail} alt={b.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 dark:text-slate-650">
                                                            <Layers className="h-4 w-4" />
                                                        </div>
                                                    )}
                                                    <div className={cn(
                                                        "absolute inset-x-0 bottom-0 p-0.5 transition-colors",
                                                        activeBasemap === b.id ? "bg-blue-600/90" : "bg-slate-950/60 group-hover:bg-blue-600/90"
                                                    )}>
                                                        <p className="text-[7px] font-bold text-white text-center truncate tracking-tighter uppercase px-0.5 leading-tight">{b.name}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                            <p className="text-xs font-semibold">Pilih Basemap</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Map Controls */}
            <MapControls
                onZoomIn={() => mapRef.current?.zoomIn()}
                onZoomOut={() => mapRef.current?.zoomOut()}
                onResetBearing={() => mapRef.current?.resetRotation()}
                className={cn(
                    "absolute bottom-6 transition-all duration-300 z-20 shadow-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border dark:border-slate-800 rounded-xl p-1",
                    isFormPanelOpen ? "left-[400px]" : "left-6"
                )}
            />

            {/* Floating Save Geometry Panel */}
            {(drawnGeom || editingGeometry) && savedUsulan && (
                <div
                    className="absolute bottom-6 z-20 flex justify-center items-center pointer-events-none transition-all duration-300"
                    style={{
                        left: toolbarLeft,
                        right: toolbarRight,
                    }}
                >
                    <div className="pointer-events-auto bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5 duration-200">
                        <div className="min-w-0">
                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider block">Status Menggambar</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                {editingGeometry
                                    ? (drawnGeom ? "Posisi geometry telah diubah" : "Mengubah lokasi spasial...")
                                    : "Geometri lokasi baru berhasil digambar"}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {editingGeometry ? (
                                <Button
                                    size="sm"
                                    onClick={handleSaveEditedGeometryClick}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 text-xs rounded-xl"
                                >
                                    <Save size={13} />
                                    Simpan Perubahan
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    onClick={handleSaveGeometryClick}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 text-xs rounded-xl"
                                >
                                    <Save size={13} />
                                    Simpan Lokasi
                                </Button>
                            )}
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelDraw}
                                className="text-slate-500 hover:text-slate-700 dark:border-slate-800 dark:hover:bg-slate-900 text-xs rounded-xl"
                            >
                                {editingGeometry ? "Batal" : "Hapus"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Left Panel: Form Panel */}
            <div className={cn(
                "absolute top-0 bottom-0 left-0 w-full sm:w-96 max-w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-2xl border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-30 flex flex-col overflow-hidden",
                isFormPanelOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none"
            )}>
                {/* Panel Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate("/admin/usulan-desa/daftar-usulan")}
                            className="h-8 w-8 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-md"
                            title="Kembali ke Daftar"
                        >
                            <ArrowLeft size={16} />
                        </Button>
                        <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                            {savedUsulan ? "Edit Usulan" : "Registrasi Usulan"}
                        </h3>
                    </div>
                    <div className="flex items-center gap-1">
                        {savedUsulan && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 rounded-md"
                                title="Hapus Usulan"
                                disabled={isDeleting}
                            >
                                <Trash2 size={16} />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsFormPanelOpen(false)}
                            className="h-8 w-8 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
                        >
                            <X size={16} />
                        </Button>
                    </div>
                </div>

                {/* Form Wrapper */}
                <div className="flex-1 overflow-y-auto px-4 pt-4 pb-0 custom-scrollbar flex flex-col">
                    {isLoadingUsulan ? (
                        <div className="flex h-full items-center justify-center bg-slate-50/50 dark:bg-slate-950/20">
                            <Spinner className="h-8 w-8 text-blue-600 animate-spin" />
                        </div>
                    ) : (
                        <UsulanDesaForm
                            key={savedUsulan ? savedUsulan.id : "new-usulan"}
                            initialData={savedUsulan ?? undefined}
                            compactMode={true}
                            onSuccess={handleFormSuccess}
                            onCancel={() => navigate("/admin/usulan-desa/daftar-usulan")}
                            onKecamatanChange={(kecId) => setSelectedKecamatanId(kecId)}
                            disableButtons={!!savedUsulan && !id}
                            onRegisterNew={!id ? handleRegisterNew : undefined}
                        />
                    )}
                </div>
            </div>

            {/* Right Panel: Panel Spasial (Katalog, Layer, Lokasi) */}
            <div className={cn(
                "absolute top-0 bottom-0 right-0 w-full sm:w-[380px] max-w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-2xl border-l border-slate-200 dark:border-slate-800 z-30 flex flex-col overflow-hidden",
                isRightPanelOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
            )}>
                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <span className="text-sm font-semibold text-slate-855 dark:text-slate-200 flex items-center gap-2">
                        <Layers className="h-4 w-4 text-blue-500" />
                        Manajemen Layer
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsRightPanelOpen(false)}
                        className="h-8 w-8 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
                    >
                        <X size={16} />
                    </Button>
                </div>

                <Tabs value={activeRightTab} onValueChange={setActiveRightTab} className="flex-1 flex flex-col min-h-0 gap-0">
                    <div className="bg-white dark:bg-slate-950 border-b dark:border-slate-800 px-2 py-2 shrink-0">
                        <TabsList className={cn("w-full grid h-9", savedUsulan ? "grid-cols-3" : "grid-cols-2")}>
                            <TabsTrigger value="katalog" className="text-[10px] uppercase font-bold tracking-tight">Katalog</TabsTrigger>
                            <TabsTrigger value="layers" className="text-[10px] uppercase font-bold tracking-tight">
                                Layer
                                {activeOverlays.length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.2 text-[8px] bg-blue-100 text-blue-700 rounded-full font-black">
                                        {activeOverlays.length}
                                    </span>
                                )}
                            </TabsTrigger>
                            {savedUsulan && (
                                <TabsTrigger value="lokasi" className="text-[10px] uppercase font-bold tracking-tight">Lokasi</TabsTrigger>
                            )}
                        </TabsList>
                    </div>

                    {/* Tab Content: Katalog & Layer (Managed by LayerManagementPanel component) */}
                    {activeRightTab !== "lokasi" ? (
                        <LayerManagementPanel
                            dbLayers={dbLayers}
                            setDbLayers={setDbLayers}
                            activeOverlays={activeOverlays}
                            setActiveOverlays={setActiveOverlays}
                            visibleOverlays={visibleOverlays}
                            setVisibleOverlays={setVisibleOverlays}
                            overlayOpacities={overlayOpacities}
                            setOverlayOpacities={setOverlayOpacities}
                            overlayCqlFilters={overlayCqlFilters}
                            setOverlayCqlFilters={setOverlayCqlFilters}
                            activeTab={activeRightTab}
                            setActiveTab={setActiveRightTab}
                            hideTabsList={true}
                        />
                    ) : (
                        /* Tab Content: Lokasi Spasial */
                        savedUsulan && (
                            <TabsContent value="lokasi" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden bg-white dark:bg-slate-950/50">
                                <div className="flex-1 overflow-y-auto">
                                    <GeometryList
                                        data={geometries}
                                        isLoading={isLoadingGeoms}
                                        onFocus={handleFocusGeometry}
                                        onEdit={(item) => {
                                            setEditingGeometry(item);
                                            setDrawMode(null);
                                            handleFocusGeometry(item);
                                        }}
                                        onRefresh={() => fetchGeometries(savedUsulan.id)}
                                    />
                                </div>
                            </TabsContent>
                        )
                    )}
                </Tabs>
            </div>

            <AlertDialog open={showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(false)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini tidak dapat dibatalkan. Usulan dengan nomor agenda{" "}
                            <span className="font-semibold text-foreground">
                                {savedUsulan?.nomor_agenda}
                            </span>{" "}
                            beserta seluruh geometry/lokasi terkait akan dihapus secara permanen dari server.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-rose-600 hover:bg-rose-700 text-white"
                        >
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={showKeteranganDialog} onOpenChange={setShowKeteranganDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Keterangan Lokasi</DialogTitle>
                        <DialogDescription>
                            Masukkan keterangan atau nama lokasi untuk geometri yang baru digambar ini.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Input
                                id="keterangan_geometry"
                                value={tempKeterangan}
                                onChange={(e) => setTempKeterangan(e.target.value)}
                                placeholder="Contoh: RT 03 RW 01, Dusun Krajan"
                                className="w-full"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleConfirmSave();
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowKeteranganDialog(false)}>
                            Batal
                        </Button>
                        <Button onClick={handleConfirmSave} className="bg-blue-600 hover:bg-blue-700 text-white">
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
