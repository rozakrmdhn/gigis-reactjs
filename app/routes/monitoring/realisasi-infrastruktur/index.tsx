import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import {
    Plus,
    Trash2,
    AlertCircle,
    MapIcon,
    Save,
    Play,
    Layers,
    Database,
    Sparkles,
    Info,
    MapPin as PinIcon,
    Anchor,
    RefreshCw,
    Edit3,
    MousePointer2,
    Route,
    Loader2,
    X,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronDown,
    Undo,
    Redo,
    Check,
    Ruler,
    HelpCircle,
    LogOut,
    Lock,
    Link2,
    Unlink,
    Crosshair,
    Copy,
    Scissors,
    BarChart2,
    GripHorizontal,
    Pentagon,
    Square,
    RotateCw,
    RotateCcw,
    Sun,
    Building2,
    Moon,
    Move,
    PanelLeftOpen,
    PanelLeftClose
} from "lucide-react";
import { cn, getProxiedLayerUrl } from "~/lib/utils";
import DigitizingToolMenubar from "~/features/monitoring/components/DigitizingToolMenubar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Checkbox } from "~/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "~/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "~/components/ui/popover";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "~/components/ui/tooltip";

// OpenLayers imports
import OLMap from "ol/Map";
import View from "ol/View";
import Feature from "ol/Feature";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { Draw, Modify, Snap, Translate } from "ol/interaction";
import { LineString, Point, MultiLineString, Polygon } from "ol/geom";
import { fromLonLat, toLonLat } from "ol/proj";
import { getLength, getArea } from "ol/sphere";
import { createEmpty as createEmptyExtent, extend as extendExtent, isEmpty as isEmptyExtent } from "ol/extent";
import { Stroke, Style, Circle as CircleStyle, Fill, Text } from "ol/style";
import Overlay from "ol/Overlay";
import "ol/ol.css";

// API services
import { monitoringService } from "~/features/monitoring/services/monitoring.service";
import { monitoringLaporanService } from "~/features/monitoring/services/monitoring_laporan.service";
import { basemapService, type Basemap } from "~/features/master/services/basemap.service";
import { desaService } from "~/services/desa";
import { InfrastrukturPanel } from "~/features/monitoring/components/InfrastrukturPanel";
import { SegmenVisualisasi, type SegmenData } from "~/features/monitoring/components/SegmenVisualisasi";
import { realisasiService, type RealisasiEntry } from "~/features/monitoring/services/realisasi.service";
import { BasemapToggle } from "~/features/monitoring/components/BasemapToggle";
import { MapStyleToggle } from "~/features/monitoring/components/MapStyleToggle";
import { jalanDropdownService } from "~/features/peta/services/jalan-dropdown.service";
import type { Jalan } from "~/features/peta/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "~/components/ui/accordion";
import { LayerManagementPanel } from "~/features/monitoring/components/LayerManagementPanel";
import { DetailSegmenPanel } from "~/features/monitoring/components/DetailSegmenPanel";
import { MeasurementPanel } from "~/features/monitoring/components/MeasurementPanel";
import { useInfrastrukturTipe } from "~/features/monitoring/hooks/useInfrastrukturTipe";
import { TipeSwitcher } from "~/features/monitoring/components/TipeSwitcher";
import { infrastrukturService } from "~/services/infrastruktur.service";
import TileWMS from "ol/source/TileWMS";
import { useAuth } from "~/contexts/auth-context";
import { plottingAnggaranService } from "~/features/monitoring/services/plotting_anggaran.service";
import { Combobox } from "~/components/ui/combobox";
import { useTheme } from "next-themes";
// Extracted components & hooks
import { useSnapshotLock } from "./hooks/useSnapshotLock";
import { useDeleteFeature } from "./hooks/useDeleteFeature";
import { DeleteConfirmDialog } from "./components/DeleteConfirmDialog";
import { SplitConfirmDialog } from "./components/SplitConfirmDialog";
import { HelpDialog } from "./components/HelpDialog";
import { MapContextMenu } from "./components/MapContextMenu";
import { IntersectionPanel } from "./components/IntersectionPanel";
import { GarisVisualPanel } from "./components/GarisVisualPanel";
import { PrintDialog } from "./components/PrintDialog";
import { KirimDigitasiDialog } from "./components/KirimDigitasiDialog";
const getStoredStyle = (key: string, defaultStyle: { color: string; width: number; lineDash?: number[]; scale?: number }) => {
    try {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('gigis_custom_vector_styles');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed[key]) {
                    const item = parsed[key];
                    let lineDashVal: number[] | undefined = undefined;
                    if (item.lineDash === 'dashed') {
                        lineDashVal = [6, 6];
                    } else if (item.lineDash === 'solid') {
                        lineDashVal = undefined;
                    } else if (Array.isArray(item.lineDash)) {
                        lineDashVal = item.lineDash;
                    }
                    return {
                        color: item.color || defaultStyle.color,
                        width: item.width !== undefined ? Number(item.width) : defaultStyle.width,
                        lineDash: lineDashVal,
                        scale: item.scale !== undefined ? Number(item.scale) : defaultStyle.scale,
                        fillColor: item.fillColor || `${item.color || defaultStyle.color}0d`
                    };
                }
            }
        }
    } catch (e) {
        console.error("Error loading custom styles from localStorage:", e);
    }
    return defaultStyle;
};

function createBasemapSource(id: string, basemaps: Basemap[], isDark: boolean = false) {
    if (isDark && (id === 'osm' || !id || id === 'carto-dark')) {
        return new XYZ({
            url: "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
            crossOrigin: 'anonymous',
            attributions: '&copy; CARTO'
        });
    }
    if (id === 'carto-dark') {
        return new XYZ({
            url: "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
            crossOrigin: 'anonymous'
        });
    }
    if (id === 'osm' || !basemaps || basemaps.length === 0) return new OSM({ crossOrigin: 'anonymous' });
    const meta = basemaps.find(b => b.id === id);
    if (!meta) return new OSM({ crossOrigin: 'anonymous' });

    if (meta.url.includes("openstreetmap.org")) {
        return new OSM({ crossOrigin: 'anonymous' });
    }

    const isAtrBpn = meta.url && meta.url.includes("atrbpn.go.id");
    const useProxy = meta.cross_origin === 'none' || isAtrBpn;

    if (useProxy) {
        const proxiedUrl = `/proxy/basemap?url=${meta.url}`;
        return new XYZ({ url: proxiedUrl, attributions: meta.attribution, crossOrigin: 'anonymous' });
    }

    return new XYZ({ url: meta.url, attributions: meta.attribution, crossOrigin: 'anonymous' });
}

// Coordinates of Bojonegoro for Map Center
const BOJONEGORO_CENTER = fromLonLat([111.88, -7.15]);

const geojsonFormat = new GeoJSON();

export type { ClickedLayerItem, RealisasiSegmen } from "./types";
import type { ClickedLayerItem, RealisasiSegmen, ContextMenuState } from "./types";

// Helper: Project point p onto segment (v1, v2)
const projectPointOnSegment = (p: number[], v1: number[], v2: number[]) => {
    const x = p[0], y = p[1];
    const x1 = v1[0], y1 = v1[1];
    const x2 = v2[0], y2 = v2[1];

    const dx = x2 - x1;
    const dy = y2 - y1;

    if (dx === 0 && dy === 0) return { point: [...v1], t: 0 };

    let t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t)); // Constrain to segment bounds

    return {
        point: [x1 + t * dx, y1 + t * dy],
        t: t
    };
};

// Helper: Find closest projection point on the road geometry
const findClosestProjectionOnRoad = (roadCoords: number[][], p: number[]) => {
    let minD = Infinity;
    let bestProj = [...p];
    let segmentIndex = 0;

    for (let i = 0; i < roadCoords.length - 1; i++) {
        const v1 = roadCoords[i];
        const v2 = roadCoords[i + 1];
        const { point } = projectPointOnSegment(p, v1, v2);
        const d = Math.sqrt(Math.pow(p[0] - point[0], 2) + Math.pow(p[1] - point[1], 2));

        if (d < minD) {
            minD = d;
            bestProj = point;
            segmentIndex = i;
        }
    }

    return {
        projection: bestProj,
        segmentIndex,
        distance: minD
    };
};

// Helper: Find closest projection point on the road geometry (handles both LineString and MultiLineString)
const findClosestProjectionOnFeature = (geom: any, p: number[]) => {
    if (geom instanceof LineString) {
        return findClosestProjectionOnRoad(geom.getCoordinates(), p);
    } else if (geom instanceof MultiLineString) {
        let minD = Infinity;
        let bestProj = [...p];
        let bestSegmentIndex = 0;
        let bestLineStringIndex = 0;

        const lineStrings = geom.getLineStrings();
        lineStrings.forEach((ls, lsIdx) => {
            const proj = findClosestProjectionOnRoad(ls.getCoordinates(), p);
            if (proj.distance < minD) {
                minD = proj.distance;
                bestProj = proj.projection;
                bestSegmentIndex = proj.segmentIndex;
                bestLineStringIndex = lsIdx;
            }
        });

        return {
            projection: bestProj,
            segmentIndex: bestSegmentIndex,
            lineStringIndex: bestLineStringIndex,
            distance: minD
        };
    }
    return { projection: [...p], segmentIndex: 0, distance: Infinity };
};

export default function RoadRealizationInfrastrukturPage() {
    const routeParams = useParams();
    const { tipes, activeTipe, setActiveTipe } = useInfrastrukturTipe();

    // Auto-select active infrastructure type from URL parameter /admin/monitoring/:kode
    useEffect(() => {
        if (routeParams.kode && tipes.length > 0) {
            const found = tipes.find(t => t.kode === routeParams.kode);
            if (found && found.kode !== activeTipe?.kode) {
                setActiveTipe(found);
            }
        }
    }, [routeParams.kode, tipes, activeTipe, setActiveTipe]);

    const params = useParams();
    const activeDesaIdParam = params.desaId;

    const [kecamatanList, setKecamatanList] = useState<{ id: string; nama_kecamatan: string }[]>([]);
    const [desaList, setDesaList] = useState<{ id: string; nama_desa: string }[]>([]);
    const [selectedKec, setSelectedKec] = useState<string>("");
    const [selectedDesa, setSelectedDesa] = useState<string>("");
    const [realisasiList, setRealisasiList] = useState<RealisasiSegmen[]>([]);
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
            // Force redraw of layers
            if (boundaryLayerRef.current) boundaryLayerRef.current.changed();
            if (referenceLayerRef.current) referenceLayerRef.current.changed();
            if (existingLayerRef.current) existingLayerRef.current.changed();
            if (drawLayerRef.current) drawLayerRef.current.changed();
        };
        window.addEventListener('MELAROSA-vector-styles-changed', handleStyleChange);
        return () => window.removeEventListener('MELAROSA-vector-styles-changed', handleStyleChange);
    }, []);

    const { resolvedTheme, setTheme } = useTheme();
    const isDark = resolvedTheme === "dark";
    const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
    useEffect(() => { setIsDarkMode(resolvedTheme === "dark"); }, [resolvedTheme]);

    const [mouseCoords, setMouseCoords] = useState<{ lng: number; lat: number } | null>(null);
    const [mapZoom, setMapZoom] = useState<number>(13);
    const [leftPanelTab, setLeftPanelTab] = useState<"layers" | "filters" | "tools" | null>("layers");

    const activeKecName = useMemo(() => {
        return kecamatanList.find(k => k.id.toString() === selectedKec)?.nama_kecamatan || "";
    }, [kecamatanList, selectedKec]);

    const activeDesaName = useMemo(() => {
        return desaList.find(d => d.id.toString() === selectedDesa)?.nama_desa || "";
    }, [desaList, selectedDesa]);

    const regionInfo = activeKecName && activeDesaName ? `Kec. ${activeKecName}, Desa ${activeDesaName}` : "";

    // Form & digitizing state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [digitizeMode, setDigitizeMode] = useState<"manual" | "otomatis" | "dimensions" | "select">("otomatis");
    const [isDimensionDialogOpen, setIsDimensionDialogOpen] = useState(false);
    const [inputPanjang, setInputPanjang] = useState<number>(10);
    const [inputLebar, setInputLebar] = useState<number>(6);
    const [tipeJalanDigitasi, setTipeJalanDigitasi] = useState<"poros" | "lingkungan">("poros");
    const [isDrawing, setIsDrawing] = useState(false);
    const [isReshaping, setIsReshaping] = useState(false);

    // Layer Information Popup State
    const [mapPopupInfoState, setMapPopupInfoState] = useState<{
        coordinate: number[];
        layers: ClickedLayerItem[];
        selectedLayerIndex: number | null;
    } | null>(null);

    const [activePopupData, setActivePopupData] = useState<{
        coordinate: number[];
        layers: ClickedLayerItem[];
        selectedLayerIndex: number | null;
    } | null>(null);

    const [isPopupVisible, setIsPopupVisible] = useState(false);

    const setMapPopupInfo = useCallback((info: any) => {
        setMapPopupInfoState((prev) => {
            const next = typeof info === 'function' ? info(prev) : info;
            if (next) {
                setActivePopupData((currentActive) => {
                    if (!currentActive) {
                        setIsPopupVisible(false);
                        setTimeout(() => {
                            setIsPopupVisible(true);
                        }, 20);
                    } else {
                        setIsPopupVisible(true);
                    }
                    return next;
                });
            } else {
                setIsPopupVisible(false);
                setTimeout(() => {
                    setActivePopupData(null);
                }, 300);
            }
            return next;
        });
    }, []);

    const mapPopupInfo = mapPopupInfoState;

    const popupContainerRef = useRef<HTMLDivElement | null>(null);
    const popupOverlayRef = useRef<Overlay | null>(null);

    const activeTipeRef = useRef<any>(null);
    useEffect(() => { activeTipeRef.current = activeTipe; }, [activeTipe]);

    const digitizeModeRef = useRef<any>(digitizeMode);
    useEffect(() => { digitizeModeRef.current = digitizeMode; }, [digitizeMode]);

    const inputPanjangRef = useRef(inputPanjang);
    useEffect(() => { inputPanjangRef.current = inputPanjang; }, [inputPanjang]);

    const inputLebarRef = useRef(inputLebar);
    useEffect(() => { inputLebarRef.current = inputLebar; }, [inputLebar]);

    const lastClickedCoordRef = useRef<number[] | null>(null);

    useEffect(() => {
        if (popupOverlayRef.current) {
            if (activePopupData && activePopupData.coordinate && activePopupData.layers.length > 0) {
                popupOverlayRef.current.setPosition(activePopupData.coordinate);
            } else if (!isPopupVisible) {
                const timer = setTimeout(() => {
                    if (popupOverlayRef.current && !activePopupData) {
                        popupOverlayRef.current.setPosition(undefined);
                    }
                }, 300);
                return () => clearTimeout(timer);
            }
        }
    }, [activePopupData, isPopupVisible]);
    const [drawnLength, setDrawnLength] = useState(0);
    const [coordsCount, setCoordsCount] = useState(0);
    const [drawnCoords, setDrawnCoords] = useState<number[][]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
    const [editingSegmentData, setEditingSegmentData] = useState<RealisasiSegmen | null>(null);
    
    // Split Segmen State
    const [isSplitMode, setIsSplitMode] = useState<boolean>(false);
    const [splittingSegment, setSplittingSegment] = useState<RealisasiSegmen | null>(null);
    const [splitPreviewCoords, setSplitPreviewCoords] = useState<{
        part1: number[][];
        part2: number[][];
        splitPoint: number[];
    } | null>(null);
    const [showSplitConfirmDialog, setShowSplitConfirmDialog] = useState(false);
    const splitClickListenerRef = useRef<((evt: any) => void) | null>(null);

    const [isAttributeDialogOpen, setIsAttributeDialogOpen] = useState(false);
    const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [rencanaPanjangInput, setRencanaPanjangInput] = useState("");
    const [sumberDanaPrintInput, setSumberDanaPrintInput] = useState("BKK");
    const [printTipeInput, setPrintTipeInput] = useState<string>("semua");
    const [namaPimpinanInput, setNamaPimpinanInput] = useState("");
    const [namaJabatanInput, setNamaJabatanInput] = useState("Kepala Desa");
    const [nipInput, setNipInput] = useState("");
    const [selectedPrintTipeKodes, setSelectedPrintTipeKodes] = useState<string[]>([]);
    const [printParams, setPrintParams] = useState<{ desaId: string; tahun: string } | null>(null);
    const [printTotalLength, setPrintTotalLength] = useState<number>(0);
    const [printData, setPrintData] = useState<any[] | null>(null);
    // deleteConfirmId managed by useDeleteFeature hook (see below)
    const [selectedTahunFilter, setSelectedTahunFilter] = useState<string>("Semua");
    const selectedTahunFilterRef = useRef<string>("Semua");

    // ── Year-Lock & Snapshot State (extracted to hook) ──────────────────────
    const {
        isYearLocked,
        activeSnapshotLaporan,
        lockedSegmenIds,
        loadingLockCheck,
        checkSnapshotLock,
    } = useSnapshotLock(selectedDesa, selectedTahunFilter);


    // Auto-trace coordinates states
    const [startCoord, setStartCoord] = useState<number[] | null>(null);
    const [endCoord, setEndCoord] = useState<number[] | null>(null);

    // Snapping & attributes states
    const [checkMelarosa, setCheckMelarosa] = useState(true);
    const [snappedRoad, setSnappedRoad] = useState<{ id: string; nama: string; kode_ruas?: string } | null>(null);
    const [snappedCandidates, setSnappedCandidates] = useState<{ id: string; nama: string; kode_ruas?: string; dist: number }[]>([]);
    const [customRoadName, setCustomRoadName] = useState("");
    const [isSnappingEnabled, setIsSnappingEnabled] = useState(true);

    const { user } = useAuth();
    const isBappedaOrAdmin = useMemo(() => user?.role === 'operator_bappeda' || user?.role === 'super_admin' || user?.role === 'admin', [user?.role]);
    const currentUserName = useMemo(() => user?.nama || (user as any)?.nama_user || (user as any)?.name || (user as any)?.username || (user as any)?.email || "Operator Bappeda", [user]);
    const currentUserId = useMemo(() => user?.id || null, [user]);

    // Attributes
    const [lebar, setLebar] = useState("3.5");
    const [perkerasan, setPerkerasan] = useState("");
    const [kondisi, setKondisi] = useState("");
    const [statusKondisi, setStatusKondisi] = useState("Eksisting");
    const [tahun, setTahun] = useState("2026");
    const [statusJalan, setStatusJalan] = useState("");
    const [sumberData, setSumberData] = useState("Survey Desa");
    const [sumberDana, setSumberDana] = useState("");
    const [statusAset, setStatusAset] = useState("Aset Desa");
    const [verifikator, setVerifikator] = useState(currentUserName);
    const [keterangan, setKeterangan] = useState("");
    const [plottingId, setPlottingId] = useState<string>("");
    const [dynamicAtribut, setDynamicAtribut] = useState<Record<string, any>>({});
    const [plottingOptions, setPlottingOptions] = useState<{ value: string; label: string }[]>([]);
    const [isLoadingPlotting, setIsLoadingPlotting] = useState<boolean>(false);

    // Draggable Dialog State & Drag Handlers (RAF & GPU-Accelerated)
    const [dialogPos, setDialogPos] = useState({ x: 0, y: 0 });
    const dialogPosRef = useRef({ x: 0, y: 0 });
    const dialogRef = useRef<HTMLDivElement | null>(null);
    const [isDraggingDialog, setIsDraggingDialog] = useState(false);
    const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({ startX: 0, startY: 0, initialX: 0, initialY: 0 });
    const rafIdRef = useRef<number | null>(null);

    const handleMouseDownHeader = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('textarea')) return;
        e.preventDefault();
        setIsDraggingDialog(true);
        dragStartRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialX: dialogPosRef.current.x,
            initialY: dialogPosRef.current.y
        };
    };

    const handleTouchStartHeader = (e: React.TouchEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('textarea')) return;
        if (e.touches.length !== 1) return;
        setIsDraggingDialog(true);
        dragStartRef.current = {
            startX: e.touches[0].clientX,
            startY: e.touches[0].clientY,
            initialX: dialogPosRef.current.x,
            initialY: dialogPosRef.current.y
        };
    };

    useEffect(() => {
        if (!isDraggingDialog) return;

        const updatePosition = (newX: number, newY: number) => {
            dialogPosRef.current = { x: newX, y: newY };
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = requestAnimationFrame(() => {
                if (dialogRef.current) {
                    (dialogRef.current.style as any).translate = `calc(-50% + ${newX}px) calc(-50% + ${newY}px)`;
                }
            });
        };

        const handleMouseMove = (e: MouseEvent) => {
            const dx = e.clientX - dragStartRef.current.startX;
            const dy = e.clientY - dragStartRef.current.startY;
            updatePosition(dragStartRef.current.initialX + dx, dragStartRef.current.initialY + dy);
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length !== 1) return;
            const dx = e.touches[0].clientX - dragStartRef.current.startX;
            const dy = e.touches[0].clientY - dragStartRef.current.startY;
            updatePosition(dragStartRef.current.initialX + dx, dragStartRef.current.initialY + dy);
        };

        const handleMouseUp = () => {
            setIsDraggingDialog(false);
            setDialogPos(dialogPosRef.current);
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleTouchMove, { passive: true });
        window.addEventListener('touchend', handleMouseUp);
        return () => {
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, [isDraggingDialog]);

    useEffect(() => {
        if (isAttributeDialogOpen) {
            dialogPosRef.current = { x: 0, y: 0 };
            setDialogPos({ x: 0, y: 0 });
            if (dialogRef.current) {
                (dialogRef.current.style as any).translate = `-50% -50%`;
            }
            setVerifikator((prev: string) => (prev && prev.trim() !== "") ? prev : currentUserName);
            if (editingSegmentData) {
                const targetPlottingId = extractPlottingId(editingSegmentData);
                if (targetPlottingId) {
                    setPlottingId(targetPlottingId);
                }
                const targetStatusAset = editingSegmentData.status_aset || editingSegmentData.atribut?.status_aset;
                if (targetStatusAset) {
                    setStatusAset(targetStatusAset);
                }
            }
        }
    }, [isAttributeDialogOpen, currentUserName, editingSegmentData]);

    const extractPlottingId = (seg: any): string => {
        if (!seg) return "";
        let val = seg.plotting_id ?? seg.id_plotting ?? seg.Plotting?.id;
        if (val !== undefined && val !== null && val !== "" && val !== "0" && val !== 0) return String(val);

        let attr = seg.atribut;
        if (typeof attr === "string") {
            try { attr = JSON.parse(attr); } catch (e) {}
        }
        if (attr) {
            let attrVal = attr.plotting_id ?? attr.id_plotting;
            if (attrVal !== undefined && attrVal !== null && attrVal !== "" && attrVal !== "0" && attrVal !== 0) return String(attrVal);
        }
        if (seg.properties) {
            let propVal = seg.properties.plotting_id ?? seg.properties.id_plotting;
            if (propVal !== undefined && propVal !== null && propVal !== "" && propVal !== "0" && propVal !== 0) return String(propVal);
        }
        return "";
    };

    useEffect(() => {
        const activePlotId = plottingId || extractPlottingId(editingSegmentData);
        // Only load when dialog is open or there is an active plotting ID to preserve
        if (!isAttributeDialogOpen && !activePlotId) {
            setPlottingOptions([]);
            return;
        }

        const loadPlotting = async () => {
            setIsLoadingPlotting(true);
            try {
                let optionsList: Array<{ value: string; label: string }> = [];
                if (selectedDesa) {
                    const res = await plottingAnggaranService.getPlottingList({
                        id_desa: selectedDesa,
                        tahun_anggaran: tahun,
                        limit: 100
                    });
                    const list = Array.isArray(res) ? res : (res?.result || res?.data || []);
                    optionsList = list.map((p: any) => ({
                        value: String(p.id),
                        label: `${p.jenis_bantuan || 'Bantuan'} (${p.lokasi_kegiatan || p.nama_kegiatan || '-'})`
                    }));
                }

                // If active plotting ID is not in the fetched list, inject it
                if (activePlotId) {
                    const strActivePlotId = String(activePlotId).trim();
                    const matchedInFetched = optionsList.find((o: any) => String(o.value).trim().toLowerCase() === strActivePlotId.toLowerCase());
                    if (!matchedInFetched) {
                        let label = "";
                        // Priority 1: use label fields directly mapped from GeoJSON props
                        if (editingSegmentData?.jenis_bantuan_plotting) {
                            label = `${editingSegmentData.jenis_bantuan_plotting} (${editingSegmentData.lokasi_kegiatan_plotting || editingSegmentData.nama_kegiatan_plotting || '-'})`;
                        } else if ((editingSegmentData as any)?.Plotting?.jenis_bantuan) {
                            const p = (editingSegmentData as any).Plotting;
                            label = `${p.jenis_bantuan || 'Bantuan'} (${p.lokasi_kegiatan || p.nama_kegiatan || '-'})`;
                        } else {
                            // Priority 2: fetch from API
                            try {
                                const detailRes = await plottingAnggaranService.getPlottingById(strActivePlotId);
                                const d = detailRes?.result || detailRes?.data || detailRes;
                                if (d && (d.jenis_bantuan || d.nama_kegiatan || d.lokasi_kegiatan)) {
                                    label = `${d.jenis_bantuan || 'Bantuan'} (${d.lokasi_kegiatan || d.nama_kegiatan || '-'})`;
                                }
                            } catch (e) {
                                console.warn("Plotting detail fetch failed:", e);
                            }
                        }
                        if (!label) {
                            label = `Plotting #${strActivePlotId}`;
                        }
                        optionsList.unshift({ value: strActivePlotId, label });
                    }
                }
                setPlottingOptions(optionsList);
            } catch (err) {
                console.error("Error loading plotting list:", err);
            } finally {
                setIsLoadingPlotting(false);
            }
        };
        loadPlotting();
    }, [selectedDesa, tahun, isAttributeDialogOpen, plottingId, editingSegmentData]);

    // Map configuration states
    const [basemapsList, setBasemapsList] = useState<Basemap[]>([]);
    const [activeBasemap, setActiveBasemap] = useState<string>("osm");
    const [showOfficialOverlay, setShowOfficialOverlay] = useState(true);
    const [showRealisasiRefOverlay, setShowRealisasiRefOverlay] = useState(true);
    const [showExistingOverlay, setShowExistingOverlay] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [geomHistory, setGeomHistory] = useState<number[][][]>([]);
    const [geomRedoStack, setGeomRedoStack] = useState<number[][][]>([]);
    const [activeMeasureType, setActiveMeasureType] = useState<"distance" | "area" | null>(null);
    const activeMeasureTypeRef = useRef<"distance" | "area" | null>(null);
    useEffect(() => { activeMeasureTypeRef.current = activeMeasureType; }, [activeMeasureType]);

    const [measureResult, setMeasureResult] = useState<string | null>(null);
    const translateInteractionRef = useRef<Translate | null>(null);
    const measureModifyInteractionRef = useRef<Modify | null>(null);

    const updateMeasureResultFromGeom = (geom: any, type: "distance" | "area" | null, feature?: any) => {
        if (!geom || !type) return;
        if (feature && feature.get("fixedMeasureResult")) {
            setMeasureResult(feature.get("fixedMeasureResult"));
            return;
        }
        let output = "";
        if (type === "distance" && (geom instanceof LineString || geom.getType?.() === "LineString")) {
            const length = getLength(geom, { projection: "EPSG:3857" });
            output = `${length.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
        } else if (type === "area" && (geom instanceof Polygon || geom.getType?.() === "Polygon")) {
            const area = getArea(geom, { projection: "EPSG:3857" });
            output = `${area.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`;
        }
        setMeasureResult(output);
    };
    const [hasSearchPin, setHasSearchPin] = useState(false);
    const [sketchPointsCount, setSketchPointsCount] = useState(0);
    const [showSta, setShowSta] = useState(false);
    const showStaRef = useRef(false);
    const [showYearLabel, setShowYearLabel] = useState(true);
    const showYearLabelRef = useRef(true);
    const [showDimensiLabel, setShowDimensiLabel] = useState(false);
    const showDimensiLabelRef = useRef(false);
    const [showKondisiLabel, setShowKondisiLabel] = useState(false);
    const showKondisiLabelRef = useRef(false);

    // Sync STA and label toggles to refs
    useEffect(() => {
        showStaRef.current = showSta;
        if (staLayerRef.current) {
            staLayerRef.current.setVisible(showSta);
        }
    }, [showSta]);
    useEffect(() => {
        showYearLabelRef.current = showYearLabel;
        showDimensiLabelRef.current = showDimensiLabel;
        showKondisiLabelRef.current = showKondisiLabel;
        existingLayerRef.current?.changed();
    }, [showYearLabel, showDimensiLabel, showKondisiLabel]);

    // Update map size & recalculate panel layout smoothly when InfrastrukturPanel (sidebar) toggles
    useEffect(() => {
        const timer = setTimeout(() => {
            if (mapRef.current) {
                mapRef.current.updateSize();
            }
        }, 310);
        return () => clearTimeout(timer);
    }, [isSidebarOpen]);

    // Dynamic thematic overlays state
    const [dbLayers, setDbLayers] = useState<any[]>([]);
    const [activeOverlays, setActiveOverlays] = useState<string[]>([]);
    const [visibleOverlays, setVisibleOverlays] = useState<string[]>([]);
    const [overlayOpacities, setOverlayOpacities] = useState<Record<string, number>>({});
    const [overlayCqlFilters, setOverlayCqlFilters] = useState<Record<string, string>>({});
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
    const [activeRightTab, setActiveRightTab] = useState<string>("katalog");

    // Ambiguity Snapping Candidates & Hover States
    const [hoveredRoad, setHoveredRoad] = useState<{ id: string; nama: string } | null>(null);
    const hoveredRoadRef = useRef<{ id: string; nama: string } | null>(null);
    useEffect(() => {
        hoveredRoadRef.current = hoveredRoad;
    }, [hoveredRoad]);

    const [realisasiEntries, setRealisasiEntries] = useState<RealisasiEntry[]>([]);
    const [selectedRealisasiEntryIds, setSelectedRealisasiEntryIds] = useState<string[]>([]);
    const realisasiRefSourceRef = useRef<VectorSource | null>(null);

    const [selectedSnappedRoadId, setSelectedSnappedRoadId] = useState<string>("");

    // Intersection Snapping Candidates
    const [intersectionCandidates, setIntersectionCandidates] = useState<Array<{
        id: string;
        nama: string;
        kode_ruas: string;
    }>>([]);
    const [showIntersectionDialog, setShowIntersectionDialog] = useState(false);
    const pendingCoordsRef = useRef<{ start: number[]; end: number[] } | null>(null);

    // Draggable Panel Positions
    const [intersectionPanelPos, setIntersectionPanelPos] = useState({ x: 0, y: 0 });
    const [isDraggingIntersection, setIsDraggingIntersection] = useState(false);
    const [hasDraggedIntersection, setHasDraggedIntersection] = useState(false);
    const dragStartOffsetRef = useRef({ x: 0, y: 0 });

    const [hoveredSegmentId, setHoveredSegmentId] = useState<string | null>(null);
    const hoveredSegmentIdRef = useRef<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        segment?: RealisasiSegmen;
        masterFeature?: {
            id: string;            // ID numerik master jalan (untuk filter parent_id)
            kode_ruas: string;
            nama_ruas: string;
            panjang_m: number;
            feature: Feature;
        };
    } | null>(null);

    // Segmen Visualisasi (Garis Visual) panel state
    const [segmenVisualPanel, setSegmenVisualPanel] = useState<{
        isOpen: boolean;
        masterId?: string;
        seg?: RealisasiSegmen;
        ruas: { nama: string; panjangTotal: number; desa?: string; kecamatan?: string };
        segmens: SegmenData[];
        isLoading: boolean;
    } | null>(null);
    const realisasiListRef = useRef<RealisasiSegmen[]>([]);

    const [selectedDetailSegment, setSelectedDetailSegment] = useState<RealisasiSegmen | null>(null);
    const [isDetailPanelOpen, setIsDetailPanelOpen] = useState<boolean>(false);
    const [detailMasterRoad, setDetailMasterRoad] = useState<Jalan | null>(null);

    // Draggable Panel Handlers
    const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest(".drag-handle")) {
            const panel = e.currentTarget;
            const parent = panel.offsetParent as HTMLElement;
            if (parent) {
                const rect = panel.getBoundingClientRect();
                const parentRect = parent.getBoundingClientRect();
                const currentX = rect.left - parentRect.left;
                const currentY = rect.top - parentRect.top;

                setIsDraggingIntersection(true);
                setHasDraggedIntersection(true);
                setIntersectionPanelPos({ x: currentX, y: currentY });

                dragStartOffsetRef.current = {
                    x: e.clientX - currentX,
                    y: e.clientY - currentY
                };
            }
            e.preventDefault();
        }
    };

    const handleTouchStartDrag = (e: React.TouchEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest(".drag-handle")) {
            const touch = e.touches[0];
            const panel = e.currentTarget;
            const parent = panel.offsetParent as HTMLElement;
            if (parent) {
                const rect = panel.getBoundingClientRect();
                const parentRect = parent.getBoundingClientRect();
                const currentX = rect.left - parentRect.left;
                const currentY = rect.top - parentRect.top;

                setIsDraggingIntersection(true);
                setHasDraggedIntersection(true);
                setIntersectionPanelPos({ x: currentX, y: currentY });

                dragStartOffsetRef.current = {
                    x: touch.clientX - currentX,
                    y: touch.clientY - currentY
                };
            }
        }
    };

    const handleDragMove = useCallback((e: MouseEvent) => {
        if (!isDraggingIntersection) return;
        setIntersectionPanelPos({
            x: e.clientX - dragStartOffsetRef.current.x,
            y: e.clientY - dragStartOffsetRef.current.y
        });
    }, [isDraggingIntersection]);

    const handleTouchMoveDrag = useCallback((e: TouchEvent) => {
        if (!isDraggingIntersection) return;
        const touch = e.touches[0];
        setIntersectionPanelPos({
            x: touch.clientX - dragStartOffsetRef.current.x,
            y: touch.clientY - dragStartOffsetRef.current.y
        });
    }, [isDraggingIntersection]);

    const handleDragEnd = useCallback(() => {
        setIsDraggingIntersection(false);
    }, []);

    useEffect(() => {
        if (isDraggingIntersection) {
            window.addEventListener("mousemove", handleDragMove);
            window.addEventListener("mouseup", handleDragEnd);
            window.addEventListener("touchmove", handleTouchMoveDrag, { passive: false });
            window.addEventListener("touchend", handleDragEnd);
        } else {
            window.removeEventListener("mousemove", handleDragMove);
            window.removeEventListener("mouseup", handleDragEnd);
            window.removeEventListener("touchmove", handleTouchMoveDrag);
            window.removeEventListener("touchend", handleDragEnd);
        }
        return () => {
            window.removeEventListener("mousemove", handleDragMove);
            window.removeEventListener("mouseup", handleDragEnd);
            window.removeEventListener("touchmove", handleTouchMoveDrag);
            window.removeEventListener("touchend", handleDragEnd);
        };
    }, [isDraggingIntersection, handleDragMove, handleTouchMoveDrag, handleDragEnd]);

    useEffect(() => {
        realisasiListRef.current = realisasiList;
    }, [realisasiList]);

    // Sync filter ref and trigger OpenLayers rerender when selectedTahunFilter changes
    useEffect(() => {
        selectedTahunFilterRef.current = selectedTahunFilter;
        if (existingLayerRef.current) {
            existingLayerRef.current.changed();
        }
    }, [selectedTahunFilter]);

    // Load basemaps dynamically
    useEffect(() => {
        basemapService.getAll(true).then(data => {
            if (data && data.length > 0) {
                setBasemapsList(data);
                // Find matching OpenStreetMap basemap to set as default active
                const osmExists = data.find(b => b.id === 'osm' || b.name.toLowerCase().includes('osm'));
                if (osmExists) {
                    setActiveBasemap(osmExists.id);
                } else {
                    setActiveBasemap(data[0].id);
                }
            }
        }).catch(err => console.error("Basemap load error:", err));
    }, []);

    // Sync map tile source when activeBasemap or theme changes
    useEffect(() => {
        if (tileLayerRef.current && basemapsList.length > 0) {
            tileLayerRef.current.setSource(
                createBasemapSource(activeBasemap, basemapsList, isDark)
            );
        }
    }, [activeBasemap, basemapsList, isDark]);

    const fetchVerifiedEntriesForDesa = async (desaId: string) => {
        try {
            const res = await realisasiService.getAllEntries({
                id_desa: desaId,
                status: "verified",
                limit: 100
            });
            if (res.status === "success" && res.result) {
                setRealisasiEntries(res.result);
            } else {
                setRealisasiEntries([]);
            }
        } catch (err) {
            console.error("Gagal mengambil referensi realisasi:", err);
            setRealisasiEntries([]);
        }
    };

    // Load verified entries when selectedDesa changes
    useEffect(() => {
        if (selectedDesa) {
            fetchVerifiedEntriesForDesa(selectedDesa);
        } else {
            setRealisasiEntries([]);
        }
        setSelectedRealisasiEntryIds([]);
        if (realisasiRefSourceRef.current) {
            realisasiRefSourceRef.current.clear();
        }
    }, [selectedDesa]);

    const handleToggleRealisasiEntry = (entryId: string) => {
        setSelectedRealisasiEntryIds((prev) => {
            const next = prev.includes(entryId)
                ? prev.filter((id) => id !== entryId)
                : [...prev, entryId];
            
            const selectedEntries = realisasiEntries.filter((e) => next.includes(e.id));
            updateRealisasiReferencesOnMap(selectedEntries);
            return next;
        });
    };

    const updateRealisasiReferencesOnMap = (entries: RealisasiEntry[]) => {
        if (!realisasiRefSourceRef.current) return;
        realisasiRefSourceRef.current.clear();

        if (!entries || entries.length === 0) return;

        const features: Feature[] = [];

        entries.forEach((entry) => {
            const titikList = entry.titik;
            if (!titikList || titikList.length === 0) return;

            // Create start & end marker features for all points
            titikList.forEach((pt) => {
                const label = pt.tipe === "start" 
                    ? `Mulai #${pt.urutan}` 
                    : `Akhir #${pt.urutan}`;
                const feat = new Feature({
                    geometry: new Point(fromLonLat([pt.longitude, pt.latitude])),
                    label,
                    type: pt.tipe
                });
                features.push(feat);
            });

            // Draw connecting lines between start and end coordinates with matching order
            const uniqueOrders = Array.from(new Set(titikList.map(pt => pt.urutan || 1)));
            uniqueOrders.forEach((order) => {
                const startPt = titikList.find(pt => pt.tipe === "start" && (pt.urutan || 1) === order);
                const endPt = titikList.find(pt => pt.tipe === "end" && (pt.urutan || 1) === order);

                if (startPt && endPt) {
                    const lineFeat = new Feature({
                        geometry: new LineString([
                            fromLonLat([startPt.longitude, startPt.latitude]),
                            fromLonLat([endPt.longitude, endPt.latitude])
                        ]),
                        type: "line"
                    });
                    features.push(lineFeat);
                }
            });
        });

        realisasiRefSourceRef.current.addFeatures(features);

        // Zoom to the extent of reference points
        if (features.length > 0 && mapRef.current) {
            const extent = createEmptyExtent();
            features.forEach(f => {
                const geom = f.getGeometry();
                if (geom) {
                    extendExtent(extent, geom.getExtent());
                }
            });

            if (!isEmptyExtent(extent)) {
                mapRef.current.getView().fit(extent, {
                    padding: [100, 100, 100, 100],
                    duration: 1000,
                    maxZoom: 18
                });
            }
        }
    };

    // Filtered segments list for the sidebar
    const filteredRealisasiList = useMemo(() => {
        if (selectedTahunFilter === "Semua") return realisasiList;
        return realisasiList.filter(r => r.tahun_anggaran.toString() === selectedTahunFilter);
    }, [realisasiList, selectedTahunFilter]);

    // Sync dynamic overlay layers on mapRef
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const existingLayers = map.getLayers();
        if (!existingLayers) return;

        // Construct mapOverlays representation
        const mapOverlays = activeOverlays.map((layerId, index) => {
            const l = dbLayers.find(layer => layer.id === layerId);
            if (!l) return null;
            const proxyUrl = getProxiedLayerUrl(l.url);
            const layerType: 'wms' | 'tile' | 'vector' = l.protocol === 'OGC:WMS' ? 'wms' : (l.protocol === 'XYZ' ? 'tile' : 'vector');
            return {
                id: l.id,
                title: l.name,
                type: layerType,
                url: proxyUrl,
                visible: visibleOverlays.includes(l.id),
                opacity: overlayOpacities[l.id] ?? 1.0,
                zIndex: 50 + index, // Dynamic overlay zIndex starts at 50
                params: {
                    'LAYERS': l.layer_name,
                    ...(overlayCqlFilters[l.id] ? { 'CQL_FILTER': overlayCqlFilters[l.id] } : { 'CQL_FILTER': undefined })
                }
            };
        }).filter(Boolean) as any[];

        // Clean up removed layers (those with dynamic-overlay- prefix but not present in new overlays)
        const layersToRemove = existingLayers.getArray().filter(l => {
            const id = l.get('id');
            return id && id.startsWith('dynamic-overlay-') && !mapOverlays.some(mo => `dynamic-overlay-${mo.id}` === id);
        });

        layersToRemove.forEach(l => map.removeLayer(l));

        // Sync active layers
        mapOverlays.forEach((layerConfig) => {
            const layerId = `dynamic-overlay-${layerConfig.id}`;
            let layer = existingLayers.getArray().find(l => l.get('id') === layerId);

            if (!layer) {
                // Create new layer instance
                if (layerConfig.type === 'wms' && layerConfig.url) {
                    layer = new TileLayer({
                        source: new TileWMS({
                            url: layerConfig.url,
                            params: {
                                ...layerConfig.params,
                                'TILED': true,
                                'TRANSPARENT': true
                            },
                            crossOrigin: 'anonymous'
                        }),
                        zIndex: layerConfig.zIndex
                    });
                } else if (layerConfig.type === 'tile' && layerConfig.url) {
                    layer = new TileLayer({
                        source: new XYZ({
                            url: layerConfig.url,
                            crossOrigin: 'anonymous'
                        }),
                        zIndex: layerConfig.zIndex
                    });
                }

                if (layer) {
                    layer.set('id', layerId);
                    map.addLayer(layer);
                }
            }

            if (layer) {
                layer.setVisible(layerConfig.visible !== false);
                layer.setOpacity(layerConfig.opacity ?? 1);
                layer.setZIndex(layerConfig.zIndex);

                // Update WMS parameters dynamically (e.g., CQL_FILTER)
                if (layerConfig.type === 'wms') {
                    const wmsSource = (layer as any).getSource();
                    if (wmsSource && wmsSource.updateParams) {
                        wmsSource.updateParams({
                            ...layerConfig.params
                        });
                    }
                }
            }
        });
    }, [activeOverlays, visibleOverlays, overlayOpacities, overlayCqlFilters, dbLayers]);

    useEffect(() => {
        const handleCloseMenu = () => setContextMenu(null);
        window.addEventListener("click", handleCloseMenu);
        window.addEventListener("contextmenu", handleCloseMenu);
        return () => {
            window.removeEventListener("click", handleCloseMenu);
            window.removeEventListener("contextmenu", handleCloseMenu);
        };
    }, []);

    // OpenLayers map refs
    const mapElement = useRef<HTMLDivElement>(null);
    const mapRef = useRef<OLMap | null>(null);
    const drawSourceRef = useRef<VectorSource | null>(null);
    const drawLayerRef = useRef<VectorLayer | null>(null);
    const refSourceRef = useRef<VectorSource | null>(null);
    const markerSourceRef = useRef<VectorSource | null>(null);
    const existingSourceRef = useRef<VectorSource | null>(null);
    const existingLayerRef = useRef<VectorLayer | null>(null);
    const referenceLayerRef = useRef<VectorLayer | null>(null);
    const realisasiRefLayerRef = useRef<VectorLayer | null>(null);
    const boundarySourceRef = useRef<VectorSource | null>(null);
    const boundaryLayerRef = useRef<VectorLayer | null>(null);
    const tileLayerRef = useRef<TileLayer<any> | null>(null);

    useEffect(() => {
        hoveredSegmentIdRef.current = hoveredSegmentId;
        if (existingLayerRef.current) {
            existingLayerRef.current.changed();
        }
    }, [hoveredSegmentId]);

    const isDrawingRef = useRef(false);
    useEffect(() => {
        isDrawingRef.current = isDrawing;
        if (existingLayerRef.current) {
            existingLayerRef.current.changed();
        }
    }, [isDrawing]);

    const isReshapingRef = useRef(false);
    useEffect(() => {
        isReshapingRef.current = isReshaping;
        if (existingLayerRef.current) {
            existingLayerRef.current.changed();
        }
        if (drawLayerRef.current) {
            drawLayerRef.current.changed();
        }
    }, [isReshaping]);

    const editingSegmentIdRef = useRef<string | null>(null);
    useEffect(() => {
        editingSegmentIdRef.current = editingSegmentId;
        if (existingLayerRef.current) {
            existingLayerRef.current.changed();
        }
    }, [editingSegmentId]);

    const isAttributeDialogOpenRef = useRef(false);
    useEffect(() => {
        isAttributeDialogOpenRef.current = isAttributeDialogOpen;
        if (existingLayerRef.current) {
            existingLayerRef.current.changed();
        }
    }, [isAttributeDialogOpen]);


    // OpenLayers interactions refs
    const drawInteractionRef = useRef<Draw | null>(null);
    const modifyInteractionRef = useRef<Modify | null>(null);
    const snapInteractionsRef = useRef<Snap[]>([]);
    const measureSourceRef = useRef<VectorSource | null>(null);
    const measureLayerRef = useRef<VectorLayer | null>(null);
    const measureInteractionRef = useRef<Draw | null>(null);
    const searchMarkerSourceRef = useRef<VectorSource | null>(null);
    const searchMarkerLayerRef = useRef<VectorLayer | null>(null);
    const staSourceRef = useRef<VectorSource | null>(null);
    const staLayerRef  = useRef<VectorLayer | null>(null);

    // Auto-trace state refs for OpenLayers click handler closure resolution
    const startCoordRef = useRef<number[] | null>(null);
    const endCoordRef = useRef<number[] | null>(null);

    useEffect(() => {
        startCoordRef.current = startCoord;
    }, [startCoord]);

    useEffect(() => {
        endCoordRef.current = endCoord;
    }, [endCoord]);

    // Fetch Kecamatan list on mount
    useEffect(() => {
        const fetchKec = async () => {
            try {
                const resp = await monitoringService.getKecamatan();
                if (resp.status === "success" && resp.result) {
                    setKecamatanList(resp.result);
                }
            } catch (err) {
                console.error("Kecamatan load error:", err);
                toast.error("Gagal memuat data kecamatan");
            }
        };
        fetchKec();
    }, []);

    // Auto-select kecamatan for operator_kecamatan / operator_desa
    useEffect(() => {
        if (user && (user.role === 'operator_kecamatan' || user.role === 'operator_desa') && user.id_kecamatan) {
            setSelectedKec(String(user.id_kecamatan));
        }
    }, [user]);

    // Auto-select desa for operator_desa once desaList is populated
    useEffect(() => {
        if (user && user.role === 'operator_desa' && user.id_desa && desaList.length > 0) {
            const found = desaList.find(d => String(d.id) === String(user.id_desa));
            if (found) {
                setSelectedDesa(String(user.id_desa));
            }
        }
    }, [user, desaList]);

    // Fetch Desa list when Kecamatan changes
    useEffect(() => {
        const fetchDesa = async () => {
            if (!selectedKec) return;
            try {
                const resp = await monitoringService.getDesa(selectedKec);
                if (resp.status === "success" && resp.result) {
                    setDesaList(resp.result);
                    setSelectedDesa("");
                }
            } catch (err) {
                console.error("Desa load error:", err);
                toast.error("Gagal memuat data desa");
            }
        };
        fetchDesa();
    }, [selectedKec]);

    // Generate and refresh STA (Stasioning) start/end points on the staLayer
    const refreshStaLayer = useCallback(() => {
        if (!staSourceRef.current || !staLayerRef.current) return;
        staSourceRef.current.clear();

        const features = existingSourceRef.current?.getFeatures() || [];
        const staFeatures: Feature[] = [];

        features.forEach(feat => {
            const geom = feat.getGeometry() as LineString | null;
            if (!geom || geom.getType() !== "LineString") return;
            const tahun = feat.get("tahun_pembangunan") || feat.get("tahun_anggaran") || feat.get("tahun") || "";

            // Filter by current tahun selection
            if (selectedTahunFilterRef.current !== "Semua" && tahun?.toString() !== selectedTahunFilterRef.current) return;

            const coords = (geom as LineString).getCoordinates();
            if (coords.length < 2) return;

            const totalLen = getLength(geom as LineString);
            const startLabel = `STA 0+000`;
            const endLabel = `STA ${Math.floor(totalLen / 1000)}+${String(Math.round(totalLen % 1000)).padStart(3, "0")}`;

            const startFeature = new Feature({ geometry: new Point(coords[0]) });
            startFeature.set("sta_type", "start");
            startFeature.set("sta_label", startLabel);
            startFeature.set("tahun", tahun);

            const endFeature = new Feature({ geometry: new Point(coords[coords.length - 1]) });
            endFeature.set("sta_type", "end");
            endFeature.set("sta_label", endLabel);
            endFeature.set("tahun", tahun);

            staFeatures.push(startFeature, endFeature);
        });

        staSourceRef.current.addFeatures(staFeatures);
        staLayerRef.current.setVisible(showStaRef.current);
    }, []);

    // Fetch and load GeoJSON features for reference and existing segments
    const loadDesaData = async (desaId: string, currentTipeKode?: string | null, options?: { skipFitBounds?: boolean }) => {
        const tipeToFetch = currentTipeKode !== undefined ? currentTipeKode : activeTipe?.kode;
        if (!desaId) return;
        setIsLoading(true);
        try {
            // Clear current map layers
            refSourceRef.current?.clear();
            existingSourceRef.current?.clear();
            drawSourceRef.current?.clear();
            markerSourceRef.current?.clear();
            boundarySourceRef.current?.clear();
            setStartCoord(null);
            setEndCoord(null);
            setDrawnLength(0);
            setCoordsCount(0);
            setDrawnCoords([]);
            setSnappedRoad(null);
            setRealisasiList([]);

            // Load and render village boundary
            const boundaryResp = await monitoringService.getDesaById(desaId);
            const boundaryGeoJSON = boundaryResp?.result || boundaryResp;
            let boundaryFeatures: Feature[] = [];
            if (boundaryGeoJSON && (boundaryGeoJSON.type === "Feature" || boundaryGeoJSON.type === "FeatureCollection" || boundaryGeoJSON.geometry)) {
                boundaryFeatures = geojsonFormat.readFeatures(boundaryGeoJSON, {
                    dataProjection: "EPSG:4326",
                    featureProjection: "EPSG:3857"
                });
                boundarySourceRef.current?.addFeatures(boundaryFeatures);
            }

            // Only fetch reference roads and realization segments IF an infrastructure type is selected
            if (tipeToFetch) {
                // 1. Fetch reference roads (master asset per-tipe)
                const refGeoJSON = await monitoringService.getJalanByDesaGeoJSON(desaId, tipeToFetch);
                if (refGeoJSON) {
                    const features = geojsonFormat.readFeatures(refGeoJSON, {
                        dataProjection: "EPSG:4326",
                        featureProjection: "EPSG:3857"
                    });
                    refSourceRef.current?.addFeatures(features);
                }

                // 2. Fetch existing realization segments & areas (segmen & area per-tipe)
                const [segmentsGeoJSON, areasGeoJSON] = await Promise.all([
                    monitoringService.getSegmenByDesaGeoJSON(desaId, tipeToFetch),
                    infrastrukturService.getAllAreaGeoJSON(tipeToFetch, { id_desa: desaId }).catch(() => null)
                ]);

                const combinedFeatures: Feature[] = [];

                if (segmentsGeoJSON) {
                    const segFeatures = geojsonFormat.readFeatures(segmentsGeoJSON, {
                        dataProjection: "EPSG:4326",
                        featureProjection: "EPSG:3857"
                    });
                    combinedFeatures.push(...segFeatures);
                }

                if (areasGeoJSON) {
                    const areaFeatures = geojsonFormat.readFeatures(areasGeoJSON, {
                        dataProjection: "EPSG:4326",
                        featureProjection: "EPSG:3857"
                    });
                    combinedFeatures.push(...areaFeatures);
                }

                if (combinedFeatures.length > 0) {
                    existingSourceRef.current?.addFeatures(combinedFeatures);

                    // Construct segments/areas array for display in panel list
                    const list: RealisasiSegmen[] = combinedFeatures.map(feat => {
                        const props = feat.getProperties();
                        const geom = feat.getGeometry();
                        const geomType = geom?.getType();

                        let len = 0;
                        let coordCount = 0;
                        if (geom && geomType === "LineString") {
                            len = Math.round(getLength(geom as LineString));
                            coordCount = (geom as LineString).getCoordinates().length;
                        } else if (geom && geomType === "Polygon") {
                            len = Math.round(getArea(geom as Polygon)); // Area size in sq meters
                            const ring = (geom as Polygon).getCoordinates()[0];
                            coordCount = ring ? ring.length : 0;
                        } else {
                            coordCount = 1;
                        }

                        const resolvedObjName = props.namobj || props.nama_jalan || props.nama_ruas || props.nama || "";
                        const isStatusParent = props.status_parent !== undefined
                            ? (props.status_parent === true || props.status_parent === 't' || props.status_parent === 'true' || props.status_parent === 'Ya')
                            : (props.check_melarosa === "Ya" || props.check_melarosa === true);
                        const resolvedSumberData = props.sumber_data || (props.atribut && props.atribut.sumber_data) || "Survey Desa";

                        return {
                            id: props.id?.toString() || feat.getId()?.toString() || Math.random().toString(),
                            namobj: resolvedObjName,
                            nama_jalan: resolvedObjName,
                            id_desa: desaId,
                            nama_desa: props.desa || "",
                            status_parent: isStatusParent,
                            check_melarosa: isStatusParent,
                            panjang_m: props.panjang || len,
                            lebar_m: props.lebar || 3.0,
                            perkerasan: props.perkerasan || props.jenis_perkerasan || "Beton Cor",
                            kondisi: props.kondisi || "baik",
                            tahun_anggaran: props.tahun_pembangunan || 2025,
                            coordinates_count: coordCount,
                            snapped_road_id: props.kode_ruas?.toString() || props.parent_id?.toString(),
                            parent_id: props.parent_id?.toString() || props.kode_ruas?.toString(),
                            status_verifikasi: props.status_verifikasi || props.atribut?.status_verifikasi || "verifikasi_kecamatan",
                            status_jalan: props.status_jalan || props.atribut?.status_jalan || "",
                            sumber_data: resolvedSumberData,
                            sumber_dana: props.sumber_dana || props.atribut?.sumber_dana || "",
                            verifikator: props.verifikator || props.atribut?.verifikator || "Operator Bappeda",
                            catatan_verifikasi: props.catatan_verifikasi || props.atribut?.catatan_verifikasi || "",
                            keterangan: props.keterangan || props.atribut?.keterangan || "",
                            status_kondisi: props.status_kondisi || "Eksisting",
                            plotting_id: props.plotting_id || props.atribut?.plotting_id || null,
                            status_aset: props.status_aset || props.atribut?.status_aset || null,
                            jenis_bantuan_plotting: props.jenis_bantuan_plotting || null,
                            lokasi_kegiatan_plotting: props.lokasi_kegiatan_plotting || null,
                            nama_kegiatan_plotting: props.nama_kegiatan_plotting || null,
                            atribut: props.atribut || {}
                        };
                    });
                    setRealisasiList(list);
                    // Refresh STA points after loading segments
                    setTimeout(() => refreshStaLayer(), 50);
                    // Refresh year labels
                    existingLayerRef.current?.changed();
                }
            }

            // Fit map view extent to village bounds or features ONLY IF NOT skipFitBounds
            if (!options?.skipFitBounds) {
                const allFeatures = [
                    ...(refSourceRef.current?.getFeatures() || []),
                    ...(existingSourceRef.current?.getFeatures() || [])
                ];

                if (allFeatures.length > 0 && mapRef.current) {
                    const extent = createEmptyExtent();
                    allFeatures.forEach(f => {
                        const geom = f.getGeometry();
                        if (geom) extendExtent(extent, geom.getExtent());
                    });
                    if (!isEmptyExtent(extent)) {
                        mapRef.current.getView().fit(extent, {
                            padding: [50, 50, 50, 50],
                            duration: 1000,
                            maxZoom: 17
                        });
                    }
                } else if (boundaryFeatures.length > 0 && mapRef.current) {
                    // Zoom to village geometry boundary
                    const extent = createEmptyExtent();
                    boundaryFeatures.forEach(f => {
                        const geom = f.getGeometry();
                        if (geom) extendExtent(extent, geom.getExtent());
                    });
                    if (!isEmptyExtent(extent)) {
                        mapRef.current.getView().fit(extent, {
                            padding: [40, 40, 40, 40],
                            duration: 1000
                        });
                    }
                }
            }
        } catch (err) {
            console.error("Desa layers load error:", err);
            toast.error("Gagal memuat peta dan rute desa");
        } finally {
            setIsLoading(false);
        }
    };

    // Load desa layers when selectedDesa or activeTipe changes
    useEffect(() => {
        if (selectedDesa) {
            loadDesaData(selectedDesa, activeTipe?.kode);
            setSelectedTahunFilter("Semua");
        }
    }, [selectedDesa, activeTipe?.kode]);

    // Force re-render reference layer when hoveredRoad changes
    useEffect(() => {
        if (!mapRef.current) return;
        const layers = mapRef.current.getLayers().getArray();
        const refLayer = layers[2] as VectorLayer<any>;
        if (refLayer) {
            refLayer.changed();
        }
    }, [hoveredRoad]);

    // Force re-render reference layer when snappedRoad changes
    useEffect(() => {
        if (!mapRef.current) return;
        const layers = mapRef.current.getLayers().getArray();
        const refLayer = layers[2] as VectorLayer<any>;
        if (refLayer) {
            refLayer.changed();
        }
    }, [snappedRoad]);

    // Initialize OpenLayers Map
    useEffect(() => {
        if (!mapElement.current) return;

        // Base tile layer
        const basemapLayer = new TileLayer({
            source: createBasemapSource(activeBasemap, basemapsList, isDark)
        });
        tileLayerRef.current = basemapLayer;

        // Source for drawn segments
        const drawSource = new VectorSource();
        drawSourceRef.current = drawSource;
        const drawLayer = new VectorLayer({
            source: drawSource,
            zIndex: 9999,
            style: (feature) => {
                const geom = feature.getGeometry();
                const styles: Style[] = [];
                const isReshapingActive = isReshapingRef.current;
                const strokeColor = isReshapingActive ? "#eab308" : "#10b981";
                const fillColor = isReshapingActive ? "rgba(234, 179, 8, 0.35)" : "rgba(16, 185, 129, 0.35)";
                const polyVertexColor = isReshapingActive ? "#eab308" : "#ea580c";
                const vertexColor = isReshapingActive ? "#eab308" : "#3b82f6";

                if (geom && (geom.getType() === "Polygon" || geom.getType() === "MultiPolygon")) {
                    styles.push(
                        new Style({
                            fill: new Fill({
                                color: fillColor
                            }),
                            stroke: new Stroke({
                                color: strokeColor, // Yellow when editing, emerald green when drawing
                                width: 3.5
                            })
                        })
                    );
                    const poly = geom as Polygon;
                    const ring = poly.getCoordinates()[0];
                    if (ring && ring.length > 0) {
                        ring.forEach(coord => {
                            styles.push(
                                new Style({
                                    geometry: new Point(coord),
                                    image: new CircleStyle({
                                        radius: 6,
                                        fill: new Fill({ color: polyVertexColor }),
                                        stroke: new Stroke({ color: "#ffffff", width: 2 })
                                    })
                                })
                            );
                        });
                    }

                    // Visual Rotation Handle & Guide Line outside top of polygon
                    const extent = poly.getExtent();
                    const center = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
                    const height = extent[3] - extent[1];
                    const handleY = extent[3] + (height > 0 ? height * 0.22 : 25);
                    const topCenter = [center[0], extent[3]];
                    const handlePoint = [center[0], handleY];

                    // Guide Line to handle knob
                    styles.push(
                        new Style({
                            geometry: new LineString([topCenter, handlePoint]),
                            stroke: new Stroke({
                                color: polyVertexColor,
                                width: 2,
                                lineDash: [4, 4]
                            })
                        })
                    );

                    // Handle Knob Icon
                    styles.push(
                        new Style({
                            geometry: new Point(handlePoint),
                            image: new CircleStyle({
                                radius: 10,
                                fill: new Fill({ color: polyVertexColor }),
                                stroke: new Stroke({ color: "#ffffff", width: 2.5 })
                            }),
                            text: new Text({
                                text: "🔄",
                                font: "bold 9px sans-serif",
                                fill: new Fill({ color: "#ffffff" })
                            })
                        })
                    );
                } else if (geom && geom.getType() === "LineString") {
                    styles.push(
                        new Style({
                            stroke: new Stroke({
                                color: strokeColor,
                                width: 6.0
                            })
                        })
                    );
                    const coords = (geom as LineString).getCoordinates();
                    coords.forEach(coord => {
                        styles.push(
                            new Style({
                                geometry: new Point(coord),
                                image: new CircleStyle({
                                    radius: 5,
                                    fill: new Fill({ color: vertexColor }),
                                    stroke: new Stroke({ color: "#ffffff", width: 1.5 })
                                })
                            })
                        );
                    });
                } else if (geom && geom.getType() === "Point") {
                    styles.push(
                        new Style({
                            image: new CircleStyle({
                                radius: 8,
                                fill: new Fill({ color: strokeColor }),
                                stroke: new Stroke({ color: "#ffffff", width: 2 })
                            })
                        })
                    );
                } else {
                    styles.push(
                        new Style({
                            stroke: new Stroke({
                                color: strokeColor,
                                width: 4.0
                            })
                        })
                    );
                }

                return styles;
            }
        });
        drawLayerRef.current = drawLayer;

        // Source for markers (Start & End points for auto trace)
        const markerSource = new VectorSource();
        markerSourceRef.current = markerSource;

        const markerLayer = new VectorLayer({
            source: markerSource,
            zIndex: 10000,
            style: (feature) => {
                const label = feature.get("label") || "";
                const isStart = label === "Titik Awal";
                return new Style({
                    image: new CircleStyle({
                        radius: 10,
                        fill: new Fill({ color: isStart ? "#10b981" : "#ef4444" }),
                        stroke: new Stroke({ color: "#ffffff", width: 2 })
                    }),
                    text: new Text({
                        text: label,
                        font: "bold 10px sans-serif",
                        fill: new Fill({ color: isStart ? "#10b981" : "#ef4444" }),
                        stroke: new Stroke({ color: "#ffffff", width: 2.5 }),
                        offsetY: -16
                    })
                });
            }
        });

        // Source for reference official road lines
        const refSource = new VectorSource();
        refSourceRef.current = refSource;

                const referenceStyle = (feature: Feature) => {
            const id = feature.get("kode_ruas")?.toString() || feature.get("id")?.toString();
            const isSnapped = snappedRoad?.id === id;
            const isHovered = hoveredRoadRef.current?.id === id;

            const kode = feature.get("kode_ruas") || feature.get("KODE_RUAS") || "";
            const nama = feature.get("nama_ruas") || feature.get("nama") || feature.get("NM_RUAS") || feature.get("NAME") || "";
            const labelText = kode ? `[${kode}] ${nama}` : nama;

            const custom = getStoredStyle('jalan_utama', { color: "#f97316", width: 2 });
            const strokeColor = isSnapped
                ? "rgba(16, 185, 129, 0.9)"
                : isHovered
                ? "rgba(245, 158, 11, 0.85)"
                : custom.color;
            const strokeWidth = isSnapped || isHovered ? Math.max(7, custom.width + 2) : custom.width;

            const textColor = isSnapped
                ? "#047857"
                : isHovered
                ? "#b45309"
                : "#c2410c";

            const bgFill = isSnapped
                ? "rgba(236, 253, 245, 0.95)"
                : isHovered
                ? "rgba(254, 243, 199, 0.95)"
                : "rgba(255, 255, 255, 0.92)";

            const bgBorder = isSnapped
                ? "#10b981"
                : isHovered
                ? "#f59e0b"
                : "#ea580c";

            return [
                // Base line geometry stroke
                new Style({
                    stroke: new Stroke({
                        color: strokeColor,
                        width: strokeWidth,
                        lineCap: "round",
                        lineJoin: "round"
                    })
                }),
                // Text label offset above the line path with background badge so it is never covered by segment lines
                new Style({
                    zIndex: 250,
                    text: new Text({
                        text: labelText,
                        font: "bold 10.5px Inter, sans-serif",
                        placement: "line",
                        offsetY: -14, // Offset di atas garis segmen
                        repeat: 1800, // Jarak repeat diperlebar agar label tidak terlalu sering berulang
                        fill: new Fill({ color: textColor }),
                        stroke: new Stroke({ color: "#ffffff", width: 3.5 }),
                        backgroundFill: new Fill({ color: bgFill }),
                        backgroundStroke: new Stroke({ color: bgBorder, width: 1 }),
                        padding: [2, 5, 2, 5]
                    })
                })
            ];
        };

        const referenceLayer = new VectorLayer({
            source: refSource,
            style: referenceStyle as any,
            visible: showOfficialOverlay,
            zIndex: 100 // Layer master tetap di bawah segmen realisasi (zIndex 110)
        });
        referenceLayerRef.current = referenceLayer;

        // Source for existing realization segments
        const existingSource = new VectorSource();
        existingSourceRef.current = existingSource;

        const existingLayer = new VectorLayer({
            source: existingSource,
            zIndex: 110,
            style: (feature) => {
                const featureTahun = feature.get("tahun_pembangunan") || feature.get("tahun_anggaran") || feature.get("tahun");
                if (selectedTahunFilterRef.current !== "Semua" && featureTahun?.toString() !== selectedTahunFilterRef.current) {
                    return [];
                }
                const checkMelarosa = feature.get("check_melarosa");
                const kondisi = (feature.get("kondisi") || feature.get("KONDISI") || "baik").toLowerCase();
                const isNonBase = checkMelarosa === "Tidak" || checkMelarosa === false;

                const fId = feature.get("id")?.toString() || feature.getId()?.toString();
                const cleanId = fId?.replace("jalan_segmen.", "");
                const isEditingThisGeom = (isReshapingRef.current || isDrawingRef.current) &&
                    editingSegmentIdRef.current &&
                    (editingSegmentIdRef.current === fId || editingSegmentIdRef.current === cleanId);

                const statusJalan = feature.get("status_jalan") || "Jalan Desa";

                let styleKey = 'jalan_desa_baik';
                let defaultColor = '#22c55e';
                let defaultWidth = 5;
                let defaultLineDash: number[] | undefined = undefined;

                if (statusJalan === 'Jalan Desa') {
                    if (checkMelarosa === 'Tidak' || checkMelarosa === false) {
                        // Tipe Lingkungan
                        if (kondisi === 'baik') {
                            styleKey = 'jalan_lingkungan_baik';
                            defaultColor = '#22c55e';
                        } else if (kondisi === 'sedang') {
                            styleKey = 'jalan_lingkungan_sedang';
                            defaultColor = '#f59e0b';
                        } else {
                            styleKey = 'jalan_lingkungan_rusak';
                            defaultColor = '#ef4444';
                        }
                        defaultLineDash = [6, 6];
                    } else {
                        // Tipe Poros
                        if (kondisi === 'baik') {
                            styleKey = 'jalan_desa_baik';
                            defaultColor = '#22c55e';
                        } else if (kondisi === 'sedang') {
                            styleKey = 'jalan_desa_sedang';
                            defaultColor = '#f59e0b';
                        } else {
                            styleKey = 'jalan_desa_rusak';
                            defaultColor = '#ef4444';
                        }
                    }
                } else if (statusJalan === 'Jalan Kabupaten') {
                    if (kondisi === 'baik') {
                        styleKey = 'jalan_kabupaten_baik';
                        defaultColor = '#2563eb';
                    } else if (kondisi === 'sedang') {
                        styleKey = 'jalan_kabupaten_sedang';
                        defaultColor = '#60a5fa';
                    } else {
                        styleKey = 'jalan_kabupaten_rusak';
                        defaultColor = '#60a5fa';
                        defaultLineDash = [6, 6];
                    }
                }

                const isHovered = hoveredSegmentIdRef.current && (fId === hoveredSegmentIdRef.current || fId === `jalan_segmen.${hoveredSegmentIdRef.current}`);

                const isActiveInDialog = isAttributeDialogOpenRef.current && editingSegmentIdRef.current &&
                    (editingSegmentIdRef.current.toString() === fId || editingSegmentIdRef.current.toString() === cleanId);

                const custom = getStoredStyle(styleKey, { color: defaultColor, width: defaultWidth, lineDash: defaultLineDash });
                const finalColor = isActiveInDialog ? "#eab308" : (isHovered ? "#3b82f6" : custom.color);
                const finalWidth = isHovered ? custom.width + 3.5 : custom.width;
                const finalLineDash = isNonBase ? (custom.lineDash || [6, 6]) : custom.lineDash;

                if (isEditingThisGeom) {
                    const fadedColor = custom.color.startsWith('rgb') ? custom.color : `${custom.color}48`; // Add opacity
                    return [new Style({ stroke: new Stroke({ color: fadedColor, width: custom.width, lineDash: [6, 8] }) })];
                }

                let color = finalColor;

                const styles: Style[] = [];

                if (isActiveInDialog) {
                    styles.push(
                        // Outer glowing yellow halo
                        new Style({
                            stroke: new Stroke({
                                color: "rgba(234, 179, 8, 0.5)",
                                width: finalWidth + 8,
                                lineCap: "round",
                                lineJoin: "round"
                            }),
                            zIndex: 200
                        }),
                        // Inner bright yellow stroke line
                        new Style({
                            stroke: new Stroke({
                                color: "#facc15",
                                width: finalWidth + 2,
                                lineDash: finalLineDash,
                                lineCap: "round",
                                lineJoin: "round"
                            }),
                            zIndex: 201
                        })
                    );
                } else {
                    styles.push(
                        new Style({
                            stroke: new Stroke({
                                color: finalColor,
                                width: finalWidth,
                                lineDash: finalLineDash,
                                lineCap: "round",
                                lineJoin: "round"
                            }),
                            zIndex: isHovered ? 100 : 1
                        })
                    );
                }

                // Dynamic feature text labels (Tahun, Dimensi, Kondisi)
                const labelParts: string[] = [];
                if (showYearLabelRef.current && featureTahun) {
                    labelParts.push(`TA ${featureTahun}`);
                }
                if (showDimensiLabelRef.current) {
                    const p = feature.get("panjang") || feature.get("PANJANG");
                    const l = feature.get("lebar") || feature.get("LEBAR");
                    if (p || l) {
                        labelParts.push(`${p ? `${p}m` : ""}${p && l ? " x " : ""}${l ? `${l}m` : ""}`);
                    }
                }
                if (showKondisiLabelRef.current) {
                    const k = feature.get("kondisi") || feature.get("KONDISI");
                    if (k) {
                        labelParts.push(k.toString().toUpperCase());
                    }
                }

                if (labelParts.length > 0) {
                    const geom = feature.getGeometry() as LineString | null;
                    if (geom && geom.getType() === "LineString") {
                        const coords = (geom as LineString).getCoordinates();
                        if (coords.length >= 2) {
                            const midIdx = Math.floor((coords.length - 1) / 2);
                            const midCoord = [
                                (coords[midIdx][0] + coords[midIdx + 1][0]) / 2,
                                (coords[midIdx][1] + coords[midIdx + 1][1]) / 2
                            ];
                            styles.push(new Style({
                                geometry: new Point(midCoord),
                                text: new Text({
                                    text: labelParts.join(" • "),
                                    font: "bold 10px sans-serif",
                                    fill: new Fill({ color: "#1e293b" }),
                                    backgroundFill: new Fill({ color: "rgba(255,255,255,0.85)" }),
                                    backgroundStroke: new Stroke({ color: color, width: 1.5 }),
                                    padding: [2, 6, 2, 6],
                                    offsetX: 10,
                                    offsetY: -10,
                                    textAlign: "left"
                                })
                            }));
                        }
                    }
                }

                return styles;
            }
        });
        existingLayerRef.current = existingLayer;

        // Source and Layer for village boundary
        const boundarySource = new VectorSource();
        boundarySourceRef.current = boundarySource;

        const boundaryLayer = new VectorLayer({
            source: boundarySource,
            zIndex: 0,
            style: (feature) => {
                const custom = getStoredStyle('batas_desa', { color: "rgba(59, 130, 246, 0.65)", width: 2.2, lineDash: [6, 6] });
                return new Style({
                    stroke: new Stroke({
                        color: custom.color,
                        width: custom.width,
                        lineDash: custom.lineDash
                    }),
                    fill: new Fill({
                        color: (custom as any).fillColor || `${custom.color}0d`
                    })
                });
            }
        });
        boundaryLayerRef.current = boundaryLayer;

        // Source and Layer for Realisasi Entry reference markers and lines
        const realisasiRefSource = new VectorSource();
        realisasiRefSourceRef.current = realisasiRefSource;

        const realisasiRefLayer = new VectorLayer({
            source: realisasiRefSource,
            zIndex: 9998,
            visible: showRealisasiRefOverlay,
            style: (feature) => {
                const type = feature.get("type");
                if (type === "line") {
                    return new Style({
                        stroke: new Stroke({
                            color: "#3b82f6", // Clean Blue dashed line reference
                            width: 3,
                            lineDash: [6, 6]
                        })
                    });
                }
                const label = feature.get("label") || "";
                const isStart = label.includes("Mulai");
                return new Style({
                    image: new CircleStyle({
                        radius: 8,
                        fill: new Fill({ color: isStart ? "#10b981" : "#ef4444" }), // Mulai: green, Akhir: red
                        stroke: new Stroke({ color: "#ffffff", width: 2 })
                    }),
                    text: new Text({
                        text: label,
                        font: "bold 10px 'Inter', sans-serif",
                        fill: new Fill({ color: "#1e293b" }), // Simple slate color
                        stroke: new Stroke({ color: "#ffffff", width: 3 }),
                        offsetY: -16,
                        padding: [2, 4, 2, 4],
                        backgroundFill: new Fill({ color: "rgba(255, 255, 255, 0.85)" }),
                        backgroundStroke: new Stroke({ color: "rgba(100, 116, 139, 0.3)", width: 1 })
                    })
                });
            }
        });
        realisasiRefLayerRef.current = realisasiRefLayer;

        // Initialize Measure Layer and Source
        const measureSource = new VectorSource();
        measureSourceRef.current = measureSource;
        const measureLayer = new VectorLayer({
            source: measureSource,
            zIndex: 9999,
            style: new Style({
                fill: new Fill({
                    color: "rgba(249, 115, 22, 0.3)"
                }),
                stroke: new Stroke({
                    color: "#ea580c",
                    width: 3,
                    lineDash: [8, 6],
                    lineCap: "round",
                    lineJoin: "round"
                }),
                image: new CircleStyle({
                    radius: 6,
                    fill: new Fill({
                        color: "#f97316"
                    }),
                    stroke: new Stroke({
                        color: "#ffffff",
                        width: 2
                    })
                })
            })
        });
        measureLayerRef.current = measureLayer;

        // Initialize Search Marker Layer and Source
        const searchMarkerSource = new VectorSource();
        searchMarkerSourceRef.current = searchMarkerSource;
        const searchMarkerLayer = new VectorLayer({
            source: searchMarkerSource,
            style: new Style({
                image: new CircleStyle({
                    radius: 8,
                    fill: new Fill({
                        color: "#ef4444"
                    }),
                    stroke: new Stroke({
                        color: "#ffffff",
                        width: 2.5
                    })
                })
            })
        });
        searchMarkerLayerRef.current = searchMarkerLayer;

        // Initialize STA (Stasioning) Layer
        const staSource = new VectorSource();
        staSourceRef.current = staSource;
        const staLayer = new VectorLayer({
            source: staSource,
            zIndex: 125,
            visible: false,
            style: (feature) => {
                const isStart = feature.get("sta_type") === "start";
                const label = feature.get("sta_label") || "";
                return new Style({
                    image: new CircleStyle({
                        radius: isStart ? 7 : 6,
                        fill: new Fill({ color: isStart ? "#10b981" : "#ef4444" }),
                        stroke: new Stroke({ color: "#ffffff", width: 2 })
                    }),
                    text: new Text({
                        text: label,
                        font: "bold 9px sans-serif",
                        fill: new Fill({ color: "#1e293b" }),
                        backgroundFill: new Fill({ color: "rgba(255,255,255,0.88)" }),
                        backgroundStroke: new Stroke({ color: isStart ? "#10b981" : "#ef4444", width: 1 }),
                        padding: [1, 4, 1, 4],
                        offsetY: isStart ? -18 : 18,
                        textAlign: "center"
                    })
                });
            }
        });
        staLayerRef.current = staLayer;

        // Initialize Map
        const map = new OLMap({
            target: mapElement.current,
            layers: [basemapLayer, boundaryLayer, referenceLayer, existingLayer, drawLayer, markerLayer, realisasiRefLayer, measureLayer, searchMarkerLayer, staLayer],
            view: new View({
                center: BOJONEGORO_CENTER,
                zoom: 11.5
            }),
            controls: []
        });
        mapRef.current = map;

        // Attach Layer Information Popup Overlay
        if (popupContainerRef.current) {
            const popupOverlay = new Overlay({
                element: popupContainerRef.current,
                autoPan: { animation: { duration: 250 } },
                positioning: 'bottom-center',
                offset: [0, 0]
            });
            map.addOverlay(popupOverlay);
            popupOverlayRef.current = popupOverlay;
        }

        // Listen for right-click (contextmenu) on map when Kotak P x L mode is active
        const viewport = map.getViewport();
        const handleDimensionsContextMenu = (e: MouseEvent) => {
            const isPolygon = activeTipeRef.current?.geom_type?.toUpperCase() === 'POLYGON' || activeTipeRef.current?.geom_type?.toUpperCase() === 'MULTIPOLYGON';
            if (isPolygon && digitizeModeRef.current === "dimensions") {
                e.preventDefault();
                e.stopPropagation();
                const pixel = map.getEventPixel(e);
                const coord = map.getCoordinateFromPixel(pixel);
                if (coord) {
                    lastClickedCoordRef.current = coord;
                    handleGenerateDimensionAreaRef.current(inputPanjangRef.current, inputLebarRef.current, coord);
                }
            }
        };
        viewport.addEventListener("contextmenu", handleDimensionsContextMenu);

        // Interactive Pointer Drag Rotator for Polygon
        let isRotatingShape = false;
        let rotateCenterCoord: number[] | null = null;
        let startAngleRad: number = 0;

        map.on("pointerdown" as any, (evt: any) => {
            const isPolygonMode = activeTipeRef.current?.geom_type?.toUpperCase() === 'POLYGON' || activeTipeRef.current?.geom_type?.toUpperCase() === 'MULTIPOLYGON' || digitizeModeRef.current === "dimensions";
            if (!isPolygonMode) return;

            const targetSource = (drawSourceRef.current && drawSourceRef.current.getFeatures().length > 0)
                ? drawSourceRef.current
                : measureSourceRef.current;
            if (!targetSource) return;

            const features = targetSource.getFeatures();
            if (!features || features.length === 0) return;

            const polyGeom = features[0].getGeometry();
            if (!polyGeom || (polyGeom.getType() !== "Polygon" && polyGeom.getType() !== "MultiPolygon")) return;

            const poly = polyGeom as Polygon;
            const extent = poly.getExtent();
            const center = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
            const height = extent[3] - extent[1];
            const handleY = extent[3] + (height > 0 ? height * 0.22 : 25);
            const handlePoint = [center[0], handleY];

            const clickCoord = evt.coordinate;
            const distToHandle = Math.hypot(clickCoord[0] - handlePoint[0], clickCoord[1] - handlePoint[1]);
            const mapResolution = map.getView().getResolution() || 1;
            const pixelDist = distToHandle / mapResolution;

            if (pixelDist <= 40) {
                isRotatingShape = true;
                rotateCenterCoord = center;
                startAngleRad = Math.atan2(clickCoord[1] - center[1], clickCoord[0] - center[0]);
                evt.preventDefault();
            }
        });

        map.on("pointerdrag" as any, (evt: any) => {
            if (!isRotatingShape || !rotateCenterCoord) return;

            const targetSource = (drawSourceRef.current && drawSourceRef.current.getFeatures().length > 0)
                ? drawSourceRef.current
                : measureSourceRef.current;
            if (!targetSource) return;

            const features = targetSource.getFeatures();
            if (!features || features.length === 0) return;

            const poly = features[0].getGeometry() as Polygon;
            if (!poly) return;

            const currCoord = evt.coordinate;
            const currentAngle = Math.atan2(currCoord[1] - rotateCenterCoord[1], currCoord[0] - rotateCenterCoord[0]);
            const deltaAngle = currentAngle - startAngleRad;
            startAngleRad = currentAngle;

            poly.rotate(deltaAngle, rotateCenterCoord);
            const ring = poly.getCoordinates()[0] || [];
            setDrawnCoords(ring);
            setCoordsCount(ring.length);

            targetSource.changed();
        });

        map.on("pointerup" as any, () => {
            if (isRotatingShape) {
                isRotatingShape = false;
                rotateCenterCoord = null;
            }
        });

        // Listen for map singleclick to detect layers, place polygon in dimensions mode, and trigger popup info
        map.on("singleclick", async (evt) => {
            const isPolygon = activeTipeRef.current?.geom_type?.toUpperCase() === 'POLYGON' || activeTipeRef.current?.geom_type?.toUpperCase() === 'MULTIPOLYGON';
            if (isPolygon && digitizeModeRef.current === "dimensions") {
                const coord = evt.coordinate;
                if (coord) {
                    lastClickedCoordRef.current = coord;
                    handleGenerateDimensionAreaRef.current(inputPanjangRef.current, inputLebarRef.current, coord);
                    return;
                }
            }

            if (isDrawingRef.current || isReshapingRef.current) return;

            const pixel = evt.pixel;
            const foundLayers: ClickedLayerItem[] = [];

            // 1. Check existingLayer (Segmen Realisasi)
            if (existingLayerRef.current && existingLayerRef.current.getVisible()) {
                const realisasiFeatures = map.getFeaturesAtPixel(pixel, {
                    layerFilter: (layer) => layer === existingLayerRef.current,
                    hitTolerance: 12
                });

                realisasiFeatures?.forEach((feat) => {
                    const fProps = feat.getProperties();
                    const segmentId = feat.getId()?.toString() || fProps.id?.toString();
                    const cleanId = segmentId?.replace("jalan_segmen.", "");
                    const segment = realisasiListRef.current.find(
                        r => r.id.toString() === cleanId || r.id.toString() === segmentId
                    );

                    const properties: Record<string, any> = {
                        "ID Segmen": cleanId || segmentId || "-",
                        "Nama Jalan / Objek": segment?.nama_jalan || fProps.nama_jalan || fProps.namobj || "-",
                        "Kecamatan": segment?.nama_desa ? fProps.nama_kecamatan || "-" : (fProps.nama_kecamatan || "-"),
                        "Desa": segment?.nama_desa || fProps.nama_desa || "-",
                        "Panjang Realisasi": (segment?.panjang_m || fProps.panjang_m) ? `${segment?.panjang_m || fProps.panjang_m} m` : "-",
                        "Lebar": (segment?.lebar_m || fProps.lebar_m) ? `${segment?.lebar_m || fProps.lebar_m} m` : "-",
                        "Perkerasan": segment?.perkerasan || fProps.perkerasan || "-",
                        "Kondisi": segment?.kondisi || fProps.kondisi || "-",
                        "Status Kondisi": segment?.status_kondisi || fProps.status_kondisi || "-",
                        "Tahun Anggaran": segment?.tahun_anggaran || fProps.tahun_anggaran || fProps.tahun_pembangunan || "-",
                        "Sumber Dana": segment?.sumber_dana || fProps.sumber_dana || "-",
                        "Verifikator": segment?.verifikator || fProps.verifikator || "-",
                        "Kategori Poros": (segment?.check_melarosa ?? fProps.check_melarosa) ? "Dalam Poros" : "Di Luar Poros",
                        "Status Jalan": segment?.status_jalan || fProps.status_jalan || "-",
                        "Kode Ruas": segment?.kode_ruas || fProps.kode_ruas || "-",
                        "Keterangan": segment?.keterangan || fProps.keterangan || "-",
                    };

                    // Include any dynamic JSONB attributes if present
                    if (segment?.atribut && typeof segment.atribut === "object") {
                        const excludedKeys = [
                            'namobj', 'nama_jalan', 'id', 'geom', 'parent_id', 'tipe_kode',
                            'panjang', 'lebar', 'kondisi', 'status_kondisi', 'tahun_pembangunan',
                            'sumber_dana', 'keterangan', 'foto_url', 'desa', 'kecamatan',
                            'id_desa', 'id_kecamatan', 'created_at', 'updated_at', 'kode_ruas',
                            'plotting_id', 'verifikator', 'user_id', 'nama_kegiatan_plotting'
                        ];
                        Object.entries(segment.atribut).forEach(([k, v]) => {
                            if (!excludedKeys.includes(k) && v !== null && v !== undefined && v !== "") {
                                const formattedKey = `Atribut: ${k.replace(/_/g, " ")}`;
                                properties[formattedKey] = typeof v === "boolean" ? (v ? "Ya" : "Tidak") : String(v);
                            }
                        });
                    }

                    foundLayers.push({
                        id: `segmen-${segmentId || Math.random()}`,
                        layerName: "Segmen Realisasi",
                        layerType: "Segmen Realisasi",
                        badgeColor: (segment?.check_melarosa ?? fProps.check_melarosa) ? "#10b981" : "#f59e0b",
                        title: segment?.nama_jalan || fProps.nama_jalan || fProps.namobj || "Segmen Realisasi",
                        properties,
                        feature: feat as Feature,
                        realisasiSegment: segment || null,
                        coordinate: evt.coordinate
                    });
                });
            }

            // 2. Check referenceLayer (Master Rujukan Jalan Poros)
            if (referenceLayerRef.current && referenceLayerRef.current.getVisible()) {
                const refFeatures = map.getFeaturesAtPixel(pixel, {
                    layerFilter: (layer) => layer === referenceLayerRef.current,
                    hitTolerance: 12
                });

                refFeatures?.forEach((feat) => {
                    const fProps = feat.getProperties();
                    const kode = fProps.kode_ruas || fProps.id || "";
                    const nama = fProps.nama_ruas || fProps.nama || "Ruas Master Rujukan";
                    const geom = feat.getGeometry();
                    let lengthStr = "";
                    if (geom) {
                        const len = Math.round(getLength(geom as any));
                        lengthStr = len > 0 ? `${(len / 1000).toFixed(2)} km (${len} m)` : "";
                    }

                    const properties: Record<string, any> = {
                        "Kode Ruas": kode || "-",
                        "Nama Ruas": nama,
                        "Panjang Ruas Master": lengthStr || (fProps.panjang ? `${fProps.panjang} km` : "-"),
                        "Lebar Master": fProps.lebar ? `${fProps.lebar} m` : "-",
                        "Perkerasan Awal": fProps.perkerasan || "-",
                        "Kondisi Awal": fProps.kondisi || "-",
                        "Status Awal": fProps.status_awal || "-",
                        "Status Eksisting": fProps.status_eksisting || "-",
                        "Kecamatan": fProps.kecamatan || fProps.nama_kecamatan || "-",
                        "Desa": fProps.desa || fProps.nama_desa || "-",
                        "Status Jalan": fProps.status_jalan || fProps.tipe || "Jalan Poros Desa",
                        "Sumber Data": fProps.sumber_data || "-",
                        "Keterangan": fProps.keterangan || "-",
                    };

                    foundLayers.push({
                        id: `master-${kode || Math.random()}`,
                        layerName: "Master Rujukan",
                        layerType: "Rujukan Master",
                        badgeColor: "#3b82f6",
                        title: `${nama} ${kode ? `(${kode})` : ''}`,
                        properties,
                        feature: feat as Feature,
                        coordinate: evt.coordinate
                    });
                });
            }

            // 3. Check realisasiRefLayer (Realisasi Rujukan)
            if (realisasiRefLayerRef.current && realisasiRefLayerRef.current.getVisible()) {
                const realisasiRefFeatures = map.getFeaturesAtPixel(pixel, {
                    layerFilter: (layer) => layer === realisasiRefLayerRef.current,
                    hitTolerance: 12
                });

                realisasiRefFeatures?.forEach((feat) => {
                    const fProps = feat.getProperties();
                    const nama = fProps.nama || fProps.nama_ruas || "Realisasi Rujukan";
                    const properties: Record<string, any> = {
                        "Nama Ruas": nama,
                        "Kode Ruas": fProps.kode_ruas || "-",
                        "Panjang": fProps.panjang ? `${fProps.panjang} m` : (fProps.panjang_m ? `${fProps.panjang_m} m` : "-"),
                        "Lebar": fProps.lebar ? `${fProps.lebar} m` : (fProps.lebar_m ? `${fProps.lebar_m} m` : "-"),
                        "Perkerasan": fProps.perkerasan || "-",
                        "Kondisi": fProps.kondisi || "-",
                        "Tahun Anggaran": fProps.tahun_anggaran || fProps.tahun || "-",
                        "Sumber Dana": fProps.sumber_dana || "-",
                        "Kecamatan": fProps.kecamatan || fProps.nama_kecamatan || "-",
                        "Desa": fProps.desa || fProps.nama_desa || "-",
                        "Keterangan": fProps.keterangan || "-"
                    };

                    foundLayers.push({
                        id: `realisasi-ref-${fProps.id || Math.random()}`,
                        layerName: "Realisasi Rujukan",
                        layerType: "Realisasi Rujukan",
                        badgeColor: "#8b5cf6",
                        title: nama,
                        properties,
                        feature: feat as Feature,
                        coordinate: evt.coordinate
                    });
                });
            }

            // 4. Dynamic WMS & Vector Catalog Overlays
            const mapLayers = map.getLayers().getArray();
            for (const l of mapLayers) {
                const layerId = l.get('id');
                if (layerId && layerId.startsWith('dynamic-overlay-') && l.getVisible()) {
                    const source = (l as any).getSource();

                    // Case A: Vector Layer
                    if (source instanceof VectorSource) {
                        const features = map.getFeaturesAtPixel(pixel, {
                            layerFilter: (lyr) => lyr === l,
                            hitTolerance: 12
                        });
                        features?.forEach((feat) => {
                            const fProps = feat.getProperties();
                            const title = fProps.nama || fProps.title || fProps.name || l.get('title') || "Layer Spasial";
                            foundLayers.push({
                                id: `dynamic-vector-${layerId}-${Math.random()}`,
                                layerName: l.get('title') || "Layer Spasial",
                                layerType: "Katalog Vector",
                                badgeColor: "#8b5cf6",
                                title: title,
                                properties: Object.fromEntries(
                                    Object.entries(fProps).filter(([k]) => !['geometry', 'layer', 'bbox'].includes(k))
                                ),
                                feature: feat as Feature,
                                coordinate: evt.coordinate
                            });
                        });
                    }

                    // Case B: WMS Tile Layer
                    else if (source && typeof source.getFeatureInfoUrl === 'function') {
                        const view = map.getView();
                        const url = source.getFeatureInfoUrl(
                            evt.coordinate,
                            view.getResolution() || 0,
                            view.getProjection(),
                            { 'INFO_FORMAT': 'application/json', 'FEATURE_COUNT': 5 }
                        );

                        if (url) {
                            try {
                                const proxiedUrl = getProxiedLayerUrl(url);
                                const res = await fetch(proxiedUrl);
                                if (res.ok) {
                                    const text = await res.text();
                                    let data: any;
                                    try {
                                        data = JSON.parse(text);
                                    } catch (e) {
                                        // Ignore non-JSON
                                    }
                                    if (data && data.features && data.features.length > 0) {
                                        const catalogTitle = l.get('title') || "Dataset Katalog WMS";
                                        data.features.forEach((feat: any, idx: number) => {
                                            const fProps = feat.properties || {};
                                            const title = fProps.nama || fProps.name || fProps.title || fProps.NAMOBJ || catalogTitle;

                                            let parsedGeom: Feature | undefined;
                                            if (feat.geometry) {
                                                try {
                                                    const readRes = new GeoJSON().readFeature(feat, { featureProjection: 'EPSG:3857' });
                                                    parsedGeom = Array.isArray(readRes) ? (readRes[0] as Feature) : (readRes as Feature);
                                                } catch (e) { }
                                            }

                                            foundLayers.push({
                                                id: `dynamic-wms-${layerId}-${idx}-${Math.random()}`,
                                                layerName: catalogTitle,
                                                layerType: "Katalog WMS",
                                                badgeColor: "#06b6d4",
                                                title: title,
                                                properties: Object.fromEntries(
                                                    Object.entries(fProps).filter(([k]) => !['geometry', 'layer', 'bbox'].includes(k))
                                                ),
                                                feature: parsedGeom,
                                                coordinate: evt.coordinate
                                            });
                                        });
                                    }
                                }
                            } catch (err) {
                                console.error("WMS GetFeatureInfo error in realisasi-infrastruktur:", err);
                            }
                        }
                    }
                }
            }

            // Fallback: Check any remaining vector features at pixel if no specific layer matched
            if (foundLayers.length === 0) {
                const genericFeatures = map.getFeaturesAtPixel(pixel, { hitTolerance: 12 });
                genericFeatures?.forEach((feat) => {
                    const fProps = feat.getProperties();
                    const title = fProps.nama_jalan || fProps.namobj || fProps.nama || fProps.name || fProps.title || "Fitur Spasial";
                    const excludedKeys = ['geometry', 'layer', 'bbox'];
                    const properties = Object.fromEntries(
                        Object.entries(fProps).filter(([k, v]) => !excludedKeys.includes(k) && v !== null && v !== undefined && v !== "")
                    );
                    if (Object.keys(properties).length > 0) {
                        foundLayers.push({
                            id: `generic-${feat.getId() || Math.random()}`,
                            layerName: "Fitur Spasial",
                            layerType: "Vector",
                            badgeColor: "#64748b",
                            title,
                            properties,
                            feature: feat as Feature,
                            coordinate: evt.coordinate
                        });
                    }
                });
            }

            if (foundLayers.length > 0) {
                setMapPopupInfo({
                    coordinate: evt.coordinate,
                    layers: foundLayers,
                    selectedLayerIndex: foundLayers.length === 1 ? 0 : null
                });
            } else {
                setMapPopupInfo(null);
            }
        });

        // Listen for pointermove to highlight snapped roads & change cursor to pointer on catalog layer hover
        map.on("pointermove", (evt) => {
            if (evt.coordinate) {
                const lonLat = toLonLat(evt.coordinate);
                setMouseCoords({ lng: lonLat[0], lat: lonLat[1] });
            }
            if (evt.dragging) return;

            const pixel = map.getEventPixel(evt.originalEvent);

            // 1. Check referenceLayer for road snapping hover
            const hitRef = map.hasFeatureAtPixel(pixel, {
                layerFilter: (layer) => layer === referenceLayer
            });

            if (hitRef) {
                const features = map.getFeaturesAtPixel(pixel, {
                    layerFilter: (layer) => layer === referenceLayer
                });
                if (features.length > 0) {
                    const feat = features[0] as Feature;
                    const id = feat.get("kode_ruas")?.toString() || feat.get("id")?.toString() || "";
                    const nama = feat.get("nama_ruas") || feat.get("nama") || "Ruas Rujukan";

                    if (hoveredRoadRef.current?.id !== id) {
                        setHoveredRoad({ id, nama });
                    }
                    map.getTargetElement().style.cursor = "pointer";
                    return;
                }
            } else if (hoveredRoadRef.current !== null) {
                setHoveredRoad(null);
            }

            // 2. Check any vector feature at pixel (Segmen Realisasi, Realisasi Ref, Vector Catalog)
            const hitAnyVector = map.hasFeatureAtPixel(pixel, {
                layerFilter: (layer) => layer !== drawLayer && layer !== measureLayer && layer !== searchMarkerLayer,
                hitTolerance: 5
            });

            if (hitAnyVector) {
                map.getTargetElement().style.cursor = "pointer";
                return;
            }

            // 3. Check dynamic WMS catalog layers for non-transparent pixel hit
            let wmsHit = false;
            const layers = map.getLayers().getArray();
            for (const layer of layers) {
                const id = layer.get('id');
                if (id && id.startsWith('dynamic-overlay-') && layer.getVisible()) {
                    try {
                        const data = (layer as any).getData(pixel);
                        if (data && (data instanceof Uint8Array || data instanceof Uint8ClampedArray || data instanceof Float32Array)) {
                            if (data.length >= 4 && data[3] > 0) {
                                wmsHit = true;
                                break;
                            }
                        }
                    } catch (e) {
                        // Ignore CORS or canvas extraction errors
                    }
                }
            }

            map.getTargetElement().style.cursor = wmsHit ? "pointer" : "";
        });

        const mapViewport = map.getViewport();
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const pixel = map.getEventPixel(e);
            let foundSegment: RealisasiSegmen | undefined;
            let foundMasterFeature: { id: string; kode_ruas: string; nama_ruas: string; panjang_m: number; feature: Feature } | undefined;

            // 1. Detect from existingLayer (Segmen Realisasi)
            const realisasiFeatures = map.getFeaturesAtPixel(pixel, {
                layerFilter: (layer) => layer === existingLayer,
                hitTolerance: 8
            });

            if (realisasiFeatures && realisasiFeatures.length > 0) {
                const feat = realisasiFeatures[0];
                const fProps = feat.getProperties();
                const segmentId = feat.getId()?.toString() || fProps.id?.toString();

                if (segmentId) {
                    const cleanId = segmentId.replace("jalan_segmen.", "");
                    const segment = realisasiListRef.current.find(
                        r => r.id.toString() === cleanId || r.id.toString() === segmentId
                    );
                    if (segment) foundSegment = segment;
                }
            }

            // 2. Detect from referenceLayer (Master Rujukan Jalan Poros)
            if (referenceLayerRef.current && referenceLayerRef.current.getVisible()) {
                const refFeatures = map.getFeaturesAtPixel(pixel, {
                    layerFilter: (layer) => layer === referenceLayerRef.current,
                    hitTolerance: 8
                });

                if (refFeatures && refFeatures.length > 0) {
                    const feat = refFeatures[0] as Feature;
                    const fProps = feat.getProperties();
                    const geom = feat.getGeometry();
                    const panjangM = geom ? Math.round(getLength(geom as any)) : 0;
                    // Master ID: prefer numeric id, fallback to kode_ruas
                    const masterId = feat.getId()?.toString() || fProps.id?.toString() || fProps.kode_ruas || "";
                    foundMasterFeature = {
                        id: masterId,
                        kode_ruas: fProps.kode_ruas || "",
                        nama_ruas: fProps.nama_ruas || fProps.nama || "Jalan Poros Desa",
                        panjang_m: panjangM,
                        feature: feat,
                    };
                }
            }

            if (foundSegment || foundMasterFeature) {
                setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    segment: foundSegment,
                    masterFeature: foundMasterFeature,
                });
                return;
            }

            setContextMenu(null);
        };

        mapViewport.addEventListener("contextmenu", handleContextMenu);

        // Long Press Handler for Mobile Touch Devices
        let longPressTimer: ReturnType<typeof setTimeout> | null = null;
        let longPressFired = false;

        const handleTouchStart = (e: TouchEvent) => {
            longPressFired = false;
            if (e.touches.length > 1) return; // ignore multi-touch zoom
            const touch = e.touches[0];
            longPressTimer = setTimeout(() => {
                longPressFired = true;
                const syntheticEvent = {
                    preventDefault: () => { },
                    stopPropagation: () => { },
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                } as MouseEvent;
                handleContextMenu(syntheticEvent);
            }, 600); // 600ms long press threshold
        };

        const handleTouchEnd = () => {
            if (longPressTimer) clearTimeout(longPressTimer);
        };

        const handleTouchMove = () => {
            if (longPressTimer) clearTimeout(longPressTimer);
        };

        mapViewport.addEventListener("touchstart", handleTouchStart, { passive: true });
        mapViewport.addEventListener("touchend", handleTouchEnd, { passive: true });
        mapViewport.addEventListener("touchmove", handleTouchMove, { passive: true });

        // Cleanup on unmount
        return () => {
            mapViewport.removeEventListener("contextmenu", handleContextMenu);
            mapViewport.removeEventListener("touchstart", handleTouchStart);
            mapViewport.removeEventListener("touchend", handleTouchEnd);
            mapViewport.removeEventListener("touchmove", handleTouchMove);
            map.setTarget(undefined);
            mapRef.current = null;
        };
    }, []);

    // Auto switch digitizing & master relation defaults when infrastructure type changes
    useEffect(() => {
        if (activeTipe) {
            const geomUp = activeTipe.geom_type?.toUpperCase() || '';
            const isPolygon = geomUp === 'POLYGON' || geomUp === 'MULTIPOLYGON';
            const isPoint   = geomUp === 'POINT'   || geomUp === 'MULTIPOINT';

            if (isPolygon || isPoint) {
                // Polygon / Point: selalu freehand manual, tidak ada master snapping
                setDigitizeMode("manual");
                setCheckMelarosa(false);
                setTipeJalanDigitasi("poros"); // reset ke default
                setSnappedRoad(null);
            } else if (activeTipe.kode === 'jalan_lingkungan') {
                setTipeJalanDigitasi("lingkungan");
                setCheckMelarosa(false);
                setDigitizeMode("manual");
                setSnappedRoad(null);
            } else {
                // Default LINE (Jalan Desa, dll): otomatis snapping ke master (hanya jika tidak dalam mode select)
                if (digitizeMode !== "select") {
                    setTipeJalanDigitasi("poros");
                    setCheckMelarosa(true);
                    setDigitizeMode("otomatis");
                }
            }
        }
    }, [activeTipe]);

    // Keep track of digitizeMode and tipeJalanDigitasi to start correct interaction mode
    useEffect(() => {
        if (digitizeMode === "select") {
            removeInteractions();
            setIsDrawing(false);
            setIsReshaping(false);
            return;
        }
        if (isFormOpen) {
            if (isReshaping) {
                return; // Do not overwrite active reshape mode when opening form
            }
            const isPolygon = activeTipe?.geom_type?.toUpperCase() === 'POLYGON' || activeTipe?.geom_type?.toUpperCase() === 'MULTIPOLYGON';
            if (isPolygon) {
                if (digitizeMode === "dimensions") {
                    if (drawSourceRef.current?.getFeatures().length === 0) {
                        setIsDimensionDialogOpen(true);
                    }
                    return;
                } else if (digitizeMode === "manual") {
                    startDraw();
                    return;
                }
            }
            if (activeTipe?.kode === 'jalan_lingkungan') {
                setTipeJalanDigitasi("lingkungan");
                setCheckMelarosa(false);
                setDigitizeMode("manual");
                startDraw();
                return;
            }
            if (tipeJalanDigitasi === "poros") {
                if (digitizeMode === "manual") {
                    startDraw();
                } else if (digitizeMode === "otomatis") {
                    startAutoTraceMode();
                }
                return;
            }
            if (digitizeMode === "manual") {
                startDraw();
            } else if (digitizeMode === "otomatis") {
                startAutoTraceMode();
            }
        }
    }, [digitizeMode, tipeJalanDigitasi, isFormOpen, isReshaping, activeTipe]);

    // Calculate auto trace routing (first calls actual server routing, falls back to client projection on failure)
    const calculateAutoTracePath = async (start: number[], end: number[], targetRoadId?: string) => {
        if (!mapRef.current || !drawSourceRef.current) return;

        const startLonLat = toLonLat(start);
        const endLonLat = toLonLat(end);

        const toastId = toast.loading("Mengekstraksi segmen rute dari server...");

        try {
            // Choose the active road to trace along if targetRoadId is explicitly provided (e.g. from alternatives select)
            let activeRoadId = targetRoadId;

            // Call real backend extraction API with auto-detection capability (kode_ruas is optional)
            const response = await monitoringService.extractSegment({
                point1: { lng: startLonLat[0], lat: startLonLat[1] },
                point2: { lng: endLonLat[0], lat: endLonLat[1] },
                kode_ruas: activeRoadId
            });

            if (response.status === "success" && response.result) {
                const extractedFeature = geojsonFormat.readFeature(response.result, {
                    dataProjection: "EPSG:4326",
                    featureProjection: "EPSG:3857"
                }) as Feature;

                drawSourceRef.current.clear();
                drawSourceRef.current.addFeature(extractedFeature);

                const geom = extractedFeature.getGeometry() as LineString;
                if (geom) {
                    const coords = geom.getCoordinates();
                    setGeomHistory([coords]);
                    setGeomRedoStack([]);
                    evaluateGeometryIntersection(geom);
                }

                // Auto-detect and sync snapped road based on returned kode_ruas
                const returnedKodeRuas = response.kode_ruas;
                if (returnedKodeRuas) {
                    const baseFeature = refSourceRef.current?.getFeatures().find(f => {
                        const fProps = f.getProperties();
                        const fKode = fProps.kode_ruas || fProps.KODE_RUAS;
                        return fKode?.toString() === returnedKodeRuas.toString();
                    });

                    if (baseFeature) {
                        const bProps = baseFeature.getProperties();
                        const roadName = bProps.nama_ruas || bProps.NM_RUAS || bProps.NAME || 'Nama tidak tersedia';
                        setSnappedRoad({
                            id: returnedKodeRuas.toString(),
                            nama: roadName
                        });
                        setCheckMelarosa(true);
                    } else {
                        setSnappedRoad({
                            id: returnedKodeRuas.toString(),
                            nama: `Ruas Poros Desa (${returnedKodeRuas})`
                        });
                        setCheckMelarosa(true);
                    }
                }

                if (response.warning) {
                    toast.warning(response.warning, { duration: 6000 });
                }
                toast.success("Rute otomatis berhasil diekstraksi dari server!", { id: toastId });
                setTimeout(() => {
                    enterReshapeMode();
                }, 100);
            } else {
                toast.dismiss(toastId);
                runLocalTraceFallback(start, end, activeRoadId);
            }
        } catch (err) {
            console.error("API trace fail, running local fallback:", err);
            toast.dismiss(toastId);
            runLocalTraceFallback(start, end, targetRoadId);
        }
    };

    // Client-side fallback projection trace algorithm
    const runLocalTraceFallback = (start: number[], end: number[], targetRoadId?: string) => {
        if (!refSourceRef.current || !drawSourceRef.current) return;

        let bestRoad: Feature | null = null;
        let startProjInfo: any = null;

        if (targetRoadId) {
            // Find specific candidate road
            refSourceRef.current.getFeatures().forEach(feat => {
                const id = feat.get("kode_ruas")?.toString() || feat.get("KODE_RUAS")?.toString() || feat.get("id")?.toString();
                if (id === targetRoadId) {
                    const geom = feat.getGeometry();
                    if (geom) {
                        bestRoad = feat;
                        startProjInfo = findClosestProjectionOnFeature(geom, start);
                    }
                }
            });
        }

        // If specific road not found or not provided, get closest
        if (!bestRoad) {
            let minDistance = 150;
            refSourceRef.current.getFeatures().forEach(feat => {
                const geom = feat.getGeometry();
                if (!geom) return;
                const proj = findClosestProjectionOnFeature(geom, start);
                if (proj.distance < minDistance) {
                    minDistance = proj.distance;
                    bestRoad = feat;
                    startProjInfo = proj;
                }
            });
        }

        // Check if the best road so far is actually suitable for both points
        if (bestRoad && startProjInfo && !targetRoadId) {
            const geom = (bestRoad as Feature).getGeometry();
            let roadCoords: number[][] = [];

            if (geom instanceof MultiLineString) {
                const lineStrings = geom.getLineStrings();
                const lsIdx = startProjInfo.lineStringIndex !== undefined ? startProjInfo.lineStringIndex : 0;
                roadCoords = lineStrings[lsIdx].getCoordinates();
            } else if (geom instanceof LineString) {
                roadCoords = geom.getCoordinates();
            }

            const endProjInfo = findClosestProjectionOnRoad(roadCoords, end);

            if (endProjInfo.distance > 100) {
                let bestCombinedScore = Infinity;
                let bestCombinedRoad: Feature | null = null;
                let bestCombinedStartProj: any = null;

                refSourceRef.current.getFeatures().forEach(feat => {
                    const g = feat.getGeometry();
                    if (!g) return;
                    const projS = findClosestProjectionOnFeature(g, start);
                    const projE = findClosestProjectionOnFeature(g, end);
                    const score = projS.distance + projE.distance;
                    if (score < bestCombinedScore) {
                        bestCombinedScore = score;
                        bestCombinedRoad = feat;
                        bestCombinedStartProj = projS;
                    }
                });

                if (bestCombinedRoad && bestCombinedScore < (startProjInfo.distance + endProjInfo.distance)) {
                    bestRoad = bestCombinedRoad;
                    startProjInfo = bestCombinedStartProj;
                }
            }
        }

        if (bestRoad && startProjInfo) {
            const geom = (bestRoad as Feature).getGeometry();
            let roadCoords: number[][] = [];

            if (geom instanceof MultiLineString) {
                const lineStrings = geom.getLineStrings();
                const lsIdx = startProjInfo.lineStringIndex !== undefined ? startProjInfo.lineStringIndex : 0;
                roadCoords = lineStrings[lsIdx].getCoordinates();
            } else if (geom instanceof LineString) {
                roadCoords = geom.getCoordinates();
            }

            // Find projection of end point on the SAME road
            const endProjInfo = findClosestProjectionOnRoad(roadCoords, end);

            const startIdx = startProjInfo.segmentIndex;
            const endIdx = endProjInfo.segmentIndex;

            let pathCoords: number[][] = [];

            // Build the trace coordinate list starting EXACTLY from projected clicks
            if (startIdx === endIdx) {
                pathCoords = [startProjInfo.projection, endProjInfo.projection];
            } else if (startIdx < endIdx) {
                pathCoords.push(startProjInfo.projection);
                for (let i = startIdx + 1; i <= endIdx; i++) {
                    pathCoords.push(roadCoords[i]);
                }
                pathCoords.push(endProjInfo.projection);
            } else {
                pathCoords.push(startProjInfo.projection);
                for (let i = startIdx; i > endIdx; i--) {
                    pathCoords.push(roadCoords[i]);
                }
                pathCoords.push(endProjInfo.projection);
            }

            const tracedLine = new Feature({
                geometry: new LineString(pathCoords)
            });
            drawSourceRef.current.clear();
            drawSourceRef.current.addFeature(tracedLine);
            const tracedGeom = tracedLine.getGeometry();
            if (tracedGeom instanceof LineString) {
                const coords = tracedGeom.getCoordinates();
                setGeomHistory([coords]);
                setGeomRedoStack([]);
                evaluateGeometryIntersection(tracedGeom);
            }

            toast.success(`Berhasil auto-trace sepanjang ${(bestRoad as Feature).get("nama") || (bestRoad as Feature).get("nama_ruas")}`, { id: "trace-local-fallback" });

            setTimeout(() => {
                enterReshapeMode();
            }, 100);
        } else {
            const fallbackLine = new Feature({
                geometry: new LineString([start, end])
            });
            drawSourceRef.current.clear();
            drawSourceRef.current.addFeature(fallbackLine);
            const fallbackGeom = fallbackLine.getGeometry();
            if (fallbackGeom instanceof LineString) {
                const coords = fallbackGeom.getCoordinates();
                setGeomHistory([coords]);
                setGeomRedoStack([]);
                evaluateGeometryIntersection(fallbackGeom);
            }

            toast.info("Gagal menelusuri jalan poros rujukan. Menggambar rute lurus.", { id: "trace-fallback-straight" });
            setTimeout(() => {
                enterReshapeMode();
            }, 100);
        }
    };

    const handleSelectAlternativeRoad = (roadId: string) => {
        if (!startCoord || !endCoord) return;
        calculateAutoTracePath(startCoord, endCoord, roadId);
    };

    // Toggle Basemaps
    useEffect(() => {
        if (!tileLayerRef.current) return;
        tileLayerRef.current.setSource(createBasemapSource(activeBasemap, basemapsList, isDark));
    }, [activeBasemap, basemapsList, isDark]);

    // Toggle Reference Layer visibility
    useEffect(() => {
        if (referenceLayerRef.current) {
            referenceLayerRef.current.setVisible(showOfficialOverlay);
        }
    }, [showOfficialOverlay]);

    // Toggle Existing Layer visibility
    useEffect(() => {
        if (existingLayerRef.current) {
            existingLayerRef.current.setVisible(showExistingOverlay);
        }
    }, [showExistingOverlay]);

    // Toggle Realisasi Ref Layer visibility
    useEffect(() => {
        if (realisasiRefLayerRef.current) {
            realisasiRefLayerRef.current.setVisible(showRealisasiRefOverlay);
        }
    }, [showRealisasiRefOverlay]);

    // Force re-render reference layer when snappedRoad changes
    useEffect(() => {
        if (!mapRef.current) return;
        const layers = mapRef.current.getLayers().getArray();
        const refLayer = layers[2] as VectorLayer<any>;
        if (refLayer) {
            refLayer.changed();
        }
    }, [snappedRoad]);

    // Sync Dynamic Catalog Overlay Layers to OpenLayers Map
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;
        const existingMapLayers = map.getLayers();

        activeOverlays.forEach((layerId, index) => {
            const layerConfig = dbLayers.find((l) => l.id === layerId);
            if (!layerConfig) return;

            const customLayerId = `dynamic-overlay-${layerId}`;
            let layer = existingMapLayers.getArray().find((l) => l.get('id') === customLayerId);

            const isVisible = visibleOverlays.includes(layerId);
            const opacity = overlayOpacities[layerId] ?? 1.0;
            const cqlFilter = overlayCqlFilters[layerId];
            const proxyUrl = getProxiedLayerUrl(layerConfig.url);

            if (!layer) {
                if (layerConfig.protocol === 'OGC:WMS') {
                    layer = new TileLayer({
                        source: new TileWMS({
                            url: proxyUrl,
                            params: {
                                'LAYERS': layerConfig.layer_name,
                                'VERSION': '1.1.1',
                                'TILED': true,
                                'TRANSPARENT': true,
                                ...(cqlFilter ? { 'CQL_FILTER': cqlFilter } : {})
                            },
                            crossOrigin: 'anonymous'
                        }),
                        zIndex: index + 50
                    });
                } else if (layerConfig.protocol === 'XYZ' || layerConfig.source_type === 'external') {
                    layer = new TileLayer({
                        source: new XYZ({
                            url: proxyUrl,
                            crossOrigin: 'anonymous'
                        }),
                        zIndex: index + 50
                    });
                } else if (layerConfig.data) {
                    layer = new VectorLayer({
                        source: new VectorSource({
                            features: new GeoJSON().readFeatures(layerConfig.data, {
                                featureProjection: 'EPSG:3857'
                            })
                        }),
                        zIndex: index + 50,
                        style: new Style({
                            stroke: new Stroke({ color: '#8b5cf6', width: 2.5 }),
                            fill: new Fill({ color: 'rgba(139, 92, 246, 0.1)' })
                        })
                    });
                }

                if (layer) {
                    layer.set('id', customLayerId);
                    layer.set('rawId', layerId);
                    layer.set('title', layerConfig.name);
                    layer.set('type', layerConfig.protocol === 'OGC:WMS' ? 'wms' : 'vector');
                    map.addLayer(layer);
                }
            }

            if (layer) {
                layer.setVisible(isVisible);
                layer.setOpacity(opacity);
                layer.setZIndex(index + 50);

                if (layerConfig.protocol === 'OGC:WMS') {
                    const source = (layer as TileLayer<TileWMS>).getSource();
                    if (source && typeof source.updateParams === 'function') {
                        source.updateParams({
                            'LAYERS': layerConfig.layer_name,
                            'VERSION': '1.1.1',
                            'TILED': true,
                            'TRANSPARENT': true,
                            ...(cqlFilter ? { 'CQL_FILTER': cqlFilter } : { 'CQL_FILTER': undefined })
                        });
                    }
                }
            }
        });

        // Remove unselected dynamic layers
        const activeDynamicIds = new Set(activeOverlays.map(id => `dynamic-overlay-${id}`));
        existingMapLayers.getArray().forEach((l) => {
            const id = l.get('id');
            if (id && id.startsWith('dynamic-overlay-') && !activeDynamicIds.has(id)) {
                map.removeLayer(l);
            }
        });
    }, [activeOverlays, dbLayers, visibleOverlays, overlayOpacities, overlayCqlFilters]);

    const getDistanceToNearestRoad = (point: number[]) => {
        if (!refSourceRef.current) return Infinity;
        let minDistance = Infinity;
        const refFeatures = refSourceRef.current.getFeatures();
        refFeatures.forEach(feat => {
            const geom = feat.getGeometry();
            if (!geom) return;
            const closestPt = geom.getClosestPoint(point);
            const dist = Math.sqrt(Math.pow(point[0] - closestPt[0], 2) + Math.pow(point[1] - closestPt[1], 2));
            if (dist < minDistance) {
                minDistance = dist;
            }
        });
        return minDistance;
    };

    const findCandidateRoadsNearPoints = (startPt: number[], endPt: number[]) => {
        if (!refSourceRef.current) return [];

        const SNAP_THRESHOLD = 20; // unit EPSG:3857
        const candidates: Array<{ id: string; nama: string; kode_ruas: string; distance: number }> = [];

        refSourceRef.current.getFeatures().forEach(feat => {
            const geom = feat.getGeometry();
            if (!geom) return;

            const closestToStart = geom.getClosestPoint(startPt);
            const distStart = Math.sqrt(
                Math.pow(startPt[0] - closestToStart[0], 2) +
                Math.pow(startPt[1] - closestToStart[1], 2)
            );

            const closestToEnd = geom.getClosestPoint(endPt);
            const distEnd = Math.sqrt(
                Math.pow(endPt[0] - closestToEnd[0], 2) +
                Math.pow(endPt[1] - closestToEnd[1], 2)
            );

            const minDist = Math.min(distStart, distEnd);
            if (minDist < SNAP_THRESHOLD) {
                const kodeRuas = feat.get("kode_ruas") || feat.get("KODE_RUAS") || "";
                const nama = feat.get("nama_ruas") || feat.get("nama") || feat.get("NM_RUAS") || "";

                if (!candidates.some(c => c.kode_ruas === kodeRuas.toString())) {
                    candidates.push({
                        id: kodeRuas.toString() || feat.get("id")?.toString() || "",
                        kode_ruas: kodeRuas.toString(),
                        nama: nama,
                        distance: minDist
                    });
                }
            }
        });

        return candidates.sort((a, b) => a.distance - b.distance);
    };

    // Intersection/snapping evaluation helper
    const evaluateGeometryIntersection = (geom: LineString) => {
        const coords = geom.getCoordinates();
        setCoordsCount(coords.length);
        setDrawnCoords(coords.map(c => toLonLat(c)));
        const length = Number(getLength(geom).toFixed(2));
        setDrawnLength(length);

        if (tipeJalanDigitasi === "lingkungan") {
            setSnappedRoad(null);
            setCheckMelarosa(false);
            return;
        }

        if (!refSourceRef.current) return;

        let closestRoad: { id: string; nama: string; kode_ruas?: string } | null = null;
        let minDistance = 50; // 50 meters snap threshold in EPSG:3857

        const refFeatures = refSourceRef.current.getFeatures();
        for (const pt of coords) {
            for (const feat of refFeatures) {
                const featureGeom = feat.getGeometry();
                if (!featureGeom) continue;

                let closestPt: number[] = [];
                if (typeof (featureGeom as any).getClosestPoint === 'function') {
                    closestPt = (featureGeom as any).getClosestPoint(pt);
                } else {
                    continue;
                }

                if (!closestPt || closestPt.length < 2) continue;

                const dist = Math.sqrt(Math.pow(pt[0] - closestPt[0], 2) + Math.pow(pt[1] - closestPt[1], 2));
                if (dist < minDistance) {
                    minDistance = dist;
                    const masterDbId = feat.get("id") || feat.get("ID") || feat.getId();
                    const kodeRuasVal = feat.get("kode_ruas") || feat.get("KODE_RUAS") || feat.get("kode") || feat.get("KODE") || masterDbId;
                    const name = feat.get("nama_ruas") || feat.get("nama") || feat.get("NM_RUAS") || feat.get("NAME") || feat.get("nama_jalan") || feat.get("namobj") || feat.get("label") || "Ruas Master";
                    closestRoad = {
                        id: masterDbId != null && masterDbId !== "" ? String(masterDbId) : (kodeRuasVal ? String(kodeRuasVal) : ""),
                        kode_ruas: kodeRuasVal ? String(kodeRuasVal) : "",
                        nama: name || "Master Infrastruktur"
                    };
                }
            }
        }

        if (closestRoad) {
            setSnappedRoad(closestRoad);
            setCheckMelarosa(true);
            toast.success(`Segmen menyentuh master ${activeTipe?.nama || 'infrastruktur'}: ${closestRoad.nama}`, { id: "snap-master-success" });
        } else {
            setSnappedRoad(null);
            setCheckMelarosa(false);
            if (digitizeMode === "manual") {
                toast.info(`Segmen tidak menyentuh master. Disimpan sebagai Segmen Non-Master.`, { id: "snap-non-master-info" });
            }
        }
    };

    const [isBatchRelinking, setIsBatchRelinking] = useState(false);

    // Interactive Single Relink: Manual trigger to check & snap active segment to nearest master
    const handleInteractiveRelinkToMaster = () => {
        if (!refSourceRef.current) {
            toast.warning("Layer master rujukan belum dimuat.");
            return;
        }

        let coords: number[][] = [];
        if (isFormOpen && drawSourceRef.current) {
            const features = drawSourceRef.current.getFeatures();
            if (features.length > 0) {
                const g = features[0].getGeometry();
                if (g instanceof LineString) coords = g.getCoordinates();
                else if (g instanceof MultiLineString) coords = g.getLineStrings().flatMap(ls => ls.getCoordinates());
            }
        } else if (editingSegmentId) {
            const targetId = editingSegmentId.toString();
            const feat = existingSourceRef.current?.getFeatures().find(f => {
                const fId = f.get("id")?.toString();
                const featId = f.getId()?.toString();
                return fId === targetId || fId === `jalan_segmen.${targetId}` || featId === targetId || featId === `jalan_segmen.${targetId}`;
            });
            if (feat && feat.getGeometry()) {
                const g = feat.getGeometry();
                if (g instanceof LineString) coords = g.getCoordinates();
                else if (g instanceof MultiLineString) coords = g.getLineStrings().flatMap(ls => ls.getCoordinates());
            } else if (editingSegmentData?.geom) {
                try {
                    const parsedGeom = typeof editingSegmentData.geom === 'string' ? JSON.parse(editingSegmentData.geom) : editingSegmentData.geom;
                    if (parsedGeom) {
                        const geomObj = geojsonFormat.readGeometry(parsedGeom, {
                            dataProjection: "EPSG:4326",
                            featureProjection: "EPSG:3857"
                        });
                        if (geomObj instanceof LineString) coords = geomObj.getCoordinates();
                        else if (geomObj instanceof MultiLineString) coords = geomObj.getLineStrings().flatMap(ls => ls.getCoordinates());
                    }
                } catch (e) {
                    console.error("Geom parse error in relink:", e);
                }
            }
        }

        if (coords.length < 2) {
            toast.warning("Geometri segmen tidak ditemukan untuk penambatan spasial.");
            return;
        }

        const candidateMap = new Map<string, { id: string; nama: string; kode_ruas?: string; dist: number }>();
        const maxDistanceThreshold = 75; // 75 meters threshold in EPSG:3857

        const refFeatures = refSourceRef.current.getFeatures();
        for (const pt of coords) {
            for (const feat of refFeatures) {
                const featureGeom = feat.getGeometry();
                if (!featureGeom || typeof (featureGeom as any).getClosestPoint !== 'function') continue;
                const closestPt = (featureGeom as any).getClosestPoint(pt);

                if (!closestPt || closestPt.length < 2) continue;
                const dist = Math.sqrt(Math.pow(pt[0] - closestPt[0], 2) + Math.pow(pt[1] - closestPt[1], 2));
                if (dist < maxDistanceThreshold) {
                    const masterDbId = feat.get("id") || feat.get("ID") || feat.getId();
                    const kodeRuasVal = feat.get("kode_ruas") ||
                                     feat.get("KODE_RUAS") ||
                                     feat.get("id_ruas") ||
                                     feat.get("ruas_id") ||
                                     feat.get("kode") ||
                                     feat.get("KODE") ||
                                     masterDbId;

                    const resolvedParentId = masterDbId != null && masterDbId !== "" ? String(masterDbId) : (kodeRuasVal ? String(kodeRuasVal) : "");
                    const resolvedKodeRuas = kodeRuasVal != null && kodeRuasVal !== "" ? String(kodeRuasVal) : resolvedParentId;
                    const name = feat.get("nama_ruas") || feat.get("nama") || feat.get("NM_RUAS") || feat.get("NAME") || feat.get("nama_jalan") || feat.get("namobj") || feat.get("label") || "Ruas Master";

                    if (resolvedParentId) {
                        const existing = candidateMap.get(resolvedParentId);
                        if (!existing || dist < existing.dist) {
                            candidateMap.set(resolvedParentId, {
                                id: resolvedParentId,
                                kode_ruas: resolvedKodeRuas,
                                nama: name || "Master Infrastruktur",
                                dist: Math.round(dist)
                            });
                        }
                    }
                }
            }
        }

        const candidatesList = Array.from(candidateMap.values()).sort((a, b) => a.dist - b.dist);
        setSnappedCandidates(candidatesList);

        if (candidatesList.length > 0) {
            const closestRoad = candidatesList[0];
            setSnappedRoad(closestRoad);
            setCheckMelarosa(true);
            if (candidatesList.length > 1) {
                toast.success(`Terhubung ke Master: ${closestRoad.nama}. Ditemukan ${candidatesList.length} alternatif persimpangan!`);
            } else {
                toast.success(`Berhasil terhubung ke Master ${activeTipe?.nama || 'Infrastruktur'}: ${closestRoad.nama} (Kode: ${closestRoad.kode_ruas || closestRoad.id})`);
            }
        } else {
            setSnappedCandidates([]);
            toast.warning(`Tidak ditemukan master ${activeTipe?.nama || 'infrastruktur'} terdekat (jarak > 75m). Segmen tetap sebagai Non-Master.`);
        }
    };

    // Batch Spatial Relink: Auto relink all non-master segments in active desa to newly updated master layer
    const handleBatchSpatialRelink = async () => {
        if (!selectedDesa) {
            toast.warning("Silakan pilih wilayah desa terlebih dahulu.");
            return;
        }

        setIsBatchRelinking(true);
        const toastId = toast.loading("Mengevaluasi sinkronisasi spasial segmen ke data master baru...");

        try {
            // Attempt 1: Fast Backend PostGIS Spatial Relink API
            const backendRes = await monitoringService.relinkSpatial({
                id_desa: selectedDesa,
                tipe_kode: activeTipe?.kode,
                buffer_meters: 50
            });

            if (backendRes && (backendRes.status === "success" || backendRes.relinked_count !== undefined)) {
                const count = backendRes.relinked_count || backendRes.summary?.relinked_count || 0;
                setIsBatchRelinking(false);
                toast.success(`Sinkronisasi spasial server (PostGIS) berhasil! ${count} segmen terhubung ke data master baru.`, { id: toastId });
                loadDesaData(selectedDesa, activeTipe?.kode, { skipFitBounds: true });
                return;
            }
        } catch (err) {
            console.log("Backend relink API call skipped or falling back to client evaluation:", err);
        }

        // Attempt 2: Client-side OpenLayers Fallback Evaluation
        if (!refSourceRef.current || !existingSourceRef.current) {
            toast.warning("Layer data belum siap untuk sinkronisasi spasial.");
            setIsBatchRelinking(false);
            return;
        }

        const masterFeatures = refSourceRef.current.getFeatures();
        const existingFeatures = existingSourceRef.current.getFeatures();

        if (masterFeatures.length === 0) {
            toast.info(`Tidak ada data master ${activeTipe?.nama || 'infrastruktur'} di wilayah desa ini.`, { id: toastId });
            setIsBatchRelinking(false);
            return;
        }

        let matchedCount = 0;
        const unlinkedSegments = realisasiList.filter(s => !s.check_melarosa || !s.snapped_road_id || s.snapped_road_id === "0");

        if (unlinkedSegments.length === 0) {
            toast.info("Seluruh segmen realisasi di wilayah ini sudah terhubung ke data master.", { id: toastId });
            setIsBatchRelinking(false);
            return;
        }

        for (const seg of unlinkedSegments) {
            const feat = existingFeatures.find(f => {
                const fId = f.get("id")?.toString();
                return fId === seg.id || fId === `jalan_segmen.${seg.id}`;
            });
            if (!feat) continue;

            const geom = feat.getGeometry();
            if (!geom) continue;

            let coords: number[][] = [];
            if (geom instanceof LineString) coords = geom.getCoordinates();
            else if (geom instanceof MultiLineString) coords = geom.getLineStrings().flatMap(ls => ls.getCoordinates());

            let closestRoad: { id: string; nama: string } | null = null;
            let minDistance = 50; // meters

            for (const pt of coords) {
                for (const mf of masterFeatures) {
                    const mg = mf.getGeometry();
                    if (!mg || typeof (mg as any).getClosestPoint !== 'function') continue;
                    const closestPt = (mg as any).getClosestPoint(pt);
                    if (!closestPt || closestPt.length < 2) continue;
                    const dist = Math.sqrt(Math.pow(pt[0] - closestPt[0], 2) + Math.pow(pt[1] - closestPt[1], 2));
                    if (dist < minDistance) {
                        minDistance = dist;
                        const kodeRuas = mf.get("kode_ruas") || mf.get("KODE_RUAS") || mf.get("id") || mf.get("ID") || mf.get("kode") || mf.getId();
                        const name = mf.get("nama_ruas") || mf.get("nama") || mf.get("NM_RUAS") || mf.get("NAME") || mf.get("nama_jalan") || mf.get("namobj") || "Ruas Master";
                        closestRoad = {
                            id: kodeRuas ? kodeRuas.toString() : "",
                            nama: name
                        };
                    }
                }
            }

            if (closestRoad) {
                matchedCount++;
                try {
                    await monitoringService.updateSegment(seg.id, {
                        ...seg,
                        namobj: closestRoad.nama,
                        nama_jalan: closestRoad.nama,
                        parent_id: closestRoad.id,
                        kode_ruas: closestRoad.id,
                        check_melarosa: "Ya",
                        snapped_road_id: closestRoad.id
                    });
                } catch (err) {
                    console.error("Failed to batch update segment:", seg.id, err);
                }
            }
        }

        setIsBatchRelinking(false);
        if (matchedCount > 0) {
            toast.success(`Berhasil menyinkronkan ${matchedCount} segmen non-master ke data master baru!`, { id: toastId });
            loadDesaData(selectedDesa, activeTipe?.kode, { skipFitBounds: true });
        } else {
            toast.info("Tidak ada segmen non-master baru yang menyentuh jangkauan data master.", { id: toastId });
        }
    };

    const addSnapInteractions = () => {
        if (!mapRef.current || !isSnappingEnabled) return;

        // Clear existing snap interactions first
        snapInteractionsRef.current.forEach(snap => {
            mapRef.current?.removeInteraction(snap);
        });
        snapInteractionsRef.current = [];

        // Snap to Reference Roads (Jalan Poros)
        if (refSourceRef.current) {
            const snapRef = new Snap({
                source: refSourceRef.current,
                pixelTolerance: 15
            });
            mapRef.current.addInteraction(snapRef);
            snapInteractionsRef.current.push(snapRef);
        }

        // Snap to Existing digitized segments (especially useful for Jalan Lingkungan)
        if (existingSourceRef.current) {
            const snapExisting = new Snap({
                source: existingSourceRef.current,
                pixelTolerance: 15
            });
            mapRef.current.addInteraction(snapExisting);
            snapInteractionsRef.current.push(snapExisting);
        }
    };

    // Activate Draw Interaction
    const startDraw = () => {
        if (isSplitMode) {
            toast.warning("Batalkan mode Split terlebih dahulu.");
            return;
        }
        if (!mapRef.current || !drawSourceRef.current) return;

        markerSourceRef.current?.clear();
        setStartCoord(null);
        setEndCoord(null);
        drawSourceRef.current.clear();
        setDrawnLength(0);
        setCoordsCount(0);
        setDrawnCoords([]);
        setSnappedRoad(null);
        setCheckMelarosa(tipeJalanDigitasi === "poros");
        setGeomHistory([]);
        setGeomRedoStack([]);
        setSketchPointsCount(0);

        removeInteractions();

        const currentGeomType = (activeTipe?.geom_type || "").toUpperCase();
        const isPolygon = currentGeomType === "POLYGON" || currentGeomType === "MULTIPOLYGON";
        const isPoint = currentGeomType === "POINT" || currentGeomType === "MULTIPOINT";
        const drawType = isPolygon ? "Polygon" : isPoint ? "Point" : "LineString";

        const draw = new Draw({
            source: drawSourceRef.current,
            type: drawType as any,
            style: (feature) => {
                const geom = feature.getGeometry();
                const styles: Style[] = [];

                if (geom && geom.getType() === "Polygon") {
                    styles.push(new Style({
                        fill: new Fill({ color: "rgba(16, 185, 129, 0.25)" }),
                        stroke: new Stroke({ color: "#10b981", width: 3, lineDash: [6, 4] })
                    }));

                    const ring = (geom as Polygon).getCoordinates()[0];
                    if (ring && ring.length > 0) {
                        ring.forEach(coord => {
                            styles.push(
                                new Style({
                                    geometry: new Point(coord),
                                    image: new CircleStyle({
                                        radius: 5,
                                        fill: new Fill({ color: "#ea580c" }),
                                        stroke: new Stroke({ color: "#ffffff", width: 1.5 })
                                    })
                                })
                            );
                        });
                    }

                    const areaVal = getArea(geom as Polygon);
                    const label = areaVal >= 10000
                        ? `${(areaVal / 10000).toFixed(2)} ha`
                        : `${areaVal.toFixed(1)} m²`;
                    const extent = geom.getExtent();
                    const centerCoord = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];

                    styles.push(
                        new Style({
                            geometry: new Point(centerCoord),
                            text: new Text({
                                text: `Area: ${label}`,
                                font: "bold 12px sans-serif",
                                fill: new Fill({ color: "#ffffff" }),
                                backgroundFill: new Fill({ color: "#ea580c" }),
                                backgroundStroke: new Stroke({ color: "#9a3412", width: 1 }),
                                padding: [4, 8, 4, 8],
                                textAlign: "center"
                            })
                        })
                    );
                } else if (geom && geom.getType() === "Point") {
                    styles.push(new Style({
                        image: new CircleStyle({
                            radius: 8,
                            fill: new Fill({ color: "#10b981" }),
                            stroke: new Stroke({ color: "#ffffff", width: 2 })
                        })
                    }));
                } else {
                    styles.push(new Style({
                        stroke: new Stroke({
                            color: "#10b981",
                            width: 4
                        })
                    }));
                    if (geom && geom.getType() === "LineString") {
                        const coords = (geom as LineString).getCoordinates();

                        // Vertex dots
                        coords.forEach(coord => {
                            styles.push(
                                new Style({
                                    geometry: new Point(coord),
                                    image: new CircleStyle({
                                        radius: 5,
                                        fill: new Fill({ color: "#3b82f6" }),
                                        stroke: new Stroke({ color: "#ffffff", width: 1.5 })
                                    })
                                })
                            );
                        });

                        // Total length label at the last (cursor) point
                        if (coords.length >= 2) {
                            const totalLen = getLength(geom as LineString);
                            const label = totalLen >= 1000
                                ? `${(totalLen / 1000).toFixed(2)} km`
                                : `${totalLen.toFixed(2)} m`;
                            const lastCoord = coords[coords.length - 1];
                            styles.push(
                                new Style({
                                    geometry: new Point(lastCoord),
                                    text: new Text({
                                        text: `∑ ${label}`,
                                        font: "bold 12px sans-serif",
                                        fill: new Fill({ color: "#ffffff" }),
                                        backgroundFill: new Fill({ color: "#10b981" }),
                                        backgroundStroke: new Stroke({ color: "#065f46", width: 1 }),
                                        padding: [3, 7, 3, 7],
                                        offsetY: -18,
                                        textAlign: "center"
                                    })
                                })
                            );
                        }
                    }
                }
                return styles;
            }
        });
        drawInteractionRef.current = draw;
        mapRef.current.addInteraction(draw);

        addSnapInteractions();

        setIsDrawing(true);
        setIsReshaping(false);

        draw.on("drawstart", (evt) => {
            const geom = evt.feature.getGeometry();
            if (geom) {
                geom.on("change", () => {
                    if (geom.getType() === "Polygon") {
                        const poly = geom as Polygon;
                        const ring = poly.getCoordinates()[0] || [];
                        setSketchPointsCount(ring ? Math.max(0, ring.length - 1) : 0);
                        setCoordsCount(ring ? ring.length : 0);
                        setDrawnCoords(ring);
                        if (ring.length >= 3) {
                            const areaVal = Math.round(getArea(poly, { projection: 'EPSG:3857' }));
                            setDrawnLength(areaVal);
                        } else {
                            setDrawnLength(0);
                        }
                    } else if (geom.getType() === "LineString") {
                        const line = geom as LineString;
                        const coords = line.getCoordinates();
                        setSketchPointsCount(Math.max(0, coords.length - 1));
                        setCoordsCount(coords.length);
                        setDrawnCoords(coords);
                        if (coords.length >= 2) {
                            const lenVal = Number(getLength(line, { projection: 'EPSG:3857' }).toFixed(2));
                            setDrawnLength(lenVal);
                        }
                    }
                });
            }
        });

        draw.on("drawend", (evt) => {
            const geom = evt.feature.getGeometry();
            if (geom) {
                setGeomHistory([]);
                setGeomRedoStack([]);
                setSketchPointsCount(0);
                if (geom.getType() === "Polygon") {
                    const poly = geom as Polygon;
                    const ring = poly.getCoordinates()[0] || [];
                    setCoordsCount(ring.length);
                    setDrawnCoords(ring);
                    const areaVal = Math.round(getArea(poly, { projection: 'EPSG:3857' }));
                    setDrawnLength(areaVal);
                } else if (geom.getType() === "LineString") {
                    evaluateGeometryIntersection(geom as LineString);
                }
            }
            setTimeout(() => {
                enterReshapeMode();
            }, 100);
        });
    };

    // Activate Auto-Trace point listening mode
    const startAutoTraceMode = (showToast = true) => {
        if (isSplitMode) {
            toast.warning("Batalkan mode Split terlebih dahulu.");
            return;
        }
        if (!mapRef.current || !drawSourceRef.current) return;

        markerSourceRef.current?.clear();
        setStartCoord(null);
        setEndCoord(null);
        drawSourceRef.current.clear();
        setDrawnLength(0);
        setCoordsCount(0);
        setDrawnCoords([]);
        setSnappedRoad(null);
        setCheckMelarosa(tipeJalanDigitasi === "poros");
        setGeomHistory([]);
        setGeomRedoStack([]);

        removeInteractions();

        const draw = new Draw({
            source: drawSourceRef.current,
            type: "LineString",
            maxPoints: 2,
            style: (feature) => {
                const geometry = feature.getGeometry();
                const styles = [];

                if (geometry instanceof LineString) {
                    const coords = geometry.getCoordinates();
                    if (coords.length > 0) {
                        styles.push(new Style({
                            geometry: new Point(coords[0]),
                            image: new CircleStyle({
                                radius: 10,
                                fill: new Fill({ color: "#10b981" }),
                                stroke: new Stroke({ color: "#ffffff", width: 2 })
                            }),
                            text: new Text({
                                text: 'Titik Awal',
                                font: 'bold 10px sans-serif',
                                fill: new Fill({ color: '#10b981' }),
                                stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
                                offsetY: -16
                            })
                        }));
                    }
                    if (coords.length > 1) {
                        styles.push(new Style({
                            geometry: new Point(coords[1]),
                            image: new CircleStyle({
                                radius: 10,
                                fill: new Fill({ color: "#ef4444" }),
                                stroke: new Stroke({ color: "#ffffff", width: 2 })
                            }),
                            text: new Text({
                                text: 'Titik Akhir',
                                font: 'bold 10px sans-serif',
                                fill: new Fill({ color: '#ef4444' }),
                                stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
                                offsetY: -16
                            })
                        }));
                    }
                } else if (geometry instanceof Point) {
                    // This is the active snapping cursor indicator before clicking or when moving!
                    styles.push(new Style({
                        image: new CircleStyle({
                            radius: 7,
                            fill: new Fill({ color: "#10b981" }),
                            stroke: new Stroke({ color: "#ffffff", width: 2 })
                        })
                    }));
                }
                return styles;
            }
        });

        drawInteractionRef.current = draw;
        mapRef.current.addInteraction(draw);

        addSnapInteractions();

        setIsDrawing(true);
        setIsReshaping(false);
        if (showToast) {
            toast.info("Mode Auto-Trace aktif. Klik titik awal di peta.");
        }

        draw.on("drawend", (evt) => {
            const geom = evt.feature.getGeometry() as LineString;
            if (geom) {
                const coords = geom.getCoordinates();
                if (coords.length >= 2) {
                    const startPt = coords[0];
                    const endPt = coords[1];

                    // Check if both start and end points snap to a road poros (threshold: 50 meters/map units)
                    const distStart = getDistanceToNearestRoad(startPt);
                    const distEnd = getDistanceToNearestRoad(endPt);
                    const threshold = 50; // meters/map units

                    if (distStart > threshold || distEnd > threshold) {
                        toast.error("Titik awal atau akhir tidak menempel pada jalan poros. Digitasi otomatis dibatalkan.");
                        if (drawSourceRef.current) {
                            drawSourceRef.current.clear();
                        }
                        if (markerSourceRef.current) {
                            markerSourceRef.current.clear();
                        }
                        setStartCoord(null);
                        setEndCoord(null);

                        // Restart auto trace mode to allow drawing again
                        setTimeout(() => {
                            startAutoTraceMode(false);
                        }, 100);
                        return;
                    }

                    setStartCoord(startPt);
                    setEndCoord(endPt);

                    // We must add these 2 coordinates as features to markerSource for representation
                    if (markerSourceRef.current) {
                        markerSourceRef.current.clear();
                        const startMarker = new Feature({
                            geometry: new Point(startPt),
                            label: "Titik Awal"
                        });
                        const endMarker = new Feature({
                            geometry: new Point(endPt),
                            label: "Titik Akhir"
                        });
                        markerSourceRef.current.addFeatures([startMarker, endMarker]);
                    }

                    const candidateRoads = findCandidateRoadsNearPoints(startPt, endPt);

                    if (candidateRoads.length > 1) {
                        // Ada beberapa jalan yang sama-sama dekat — tampilkan dialog pilihan
                        pendingCoordsRef.current = { start: startPt, end: endPt };
                        setIntersectionCandidates(candidateRoads);
                        setHasDraggedIntersection(false); // Reset to center
                        setShowIntersectionDialog(true);
                    } else {
                        // Hanya 1 jalan kandidat atau tidak ada — langsung trace
                        calculateAutoTracePath(startPt, endPt, candidateRoads[0]?.id);
                    }
                }
            }
        });
    };

    // Activate Reshape/Modify Interaction
    const enterReshapeMode = () => {
        if (!mapRef.current || !drawSourceRef.current) return;

        removeInteractions();

        const modify = new Modify({
            source: drawSourceRef.current,
            style: new Style({
                image: new CircleStyle({
                    radius: 5,
                    fill: new Fill({ color: "#eab308" }), // Yellow fill for reshaping vertices
                    stroke: new Stroke({ color: "#ffffff", width: 1.5 })
                })
            })
        });
        modifyInteractionRef.current = modify;
        mapRef.current.addInteraction(modify);

        addSnapInteractions();

        setIsDrawing(false);
        setIsReshaping(true);

        const handleLiveGeomChange = (geom: any) => {
            if (geom.getType() === "Polygon") {
                const poly = geom as Polygon;
                const ring = poly.getCoordinates()[0] || [];
                setDrawnCoords(ring);
                setCoordsCount(ring.length);
                const areaVal = Number(getArea(poly, { projection: 'EPSG:3857' }).toFixed(2));
                setDrawnLength(areaVal);
            } else if (geom.getType() === "LineString") {
                const line = geom as LineString;
                const coords = line.getCoordinates();
                setDrawnCoords(coords);
                setCoordsCount(coords.length);
                const lenVal = Number(getLength(line, { projection: 'EPSG:3857' }).toFixed(2));
                setDrawnLength(lenVal);
            }
        };

        // Attach change listener to existing features in drawSource
        const currentFeats = drawSourceRef.current?.getFeatures() || [];
        currentFeats.forEach(f => {
            const g = f.getGeometry();
            if (g) {
                g.on("change", () => handleLiveGeomChange(g));
            }
        });

        modify.on("modifystart", (evt: any) => {
            const features = evt.features?.getArray ? evt.features.getArray() : (evt.features || []);
            features.forEach((feat: Feature) => {
                const geom = feat.getGeometry();
                if (geom) {
                    geom.on("change", () => handleLiveGeomChange(geom));
                }
            });
        });

        modify.on("modifyend", () => {
            const features = drawSourceRef.current?.getFeatures();
            if (features && features.length > 0) {
                const geom = features[0].getGeometry();
                if (geom) {
                    if (geom.getType() === "Polygon") {
                        const poly = geom as Polygon;
                        const ring = poly.getCoordinates()[0] || [];
                        setDrawnCoords(ring);
                        setCoordsCount(ring.length);
                        const areaVal = Number(getArea(poly, { projection: 'EPSG:3857' }).toFixed(2));
                        setDrawnLength(areaVal);
                    } else if (geom.getType() === "LineString") {
                        const line = geom as LineString;
                        const coords = line.getCoordinates();
                        setDrawnCoords(coords);
                        setCoordsCount(coords.length);
                        setGeomHistory(prev => {
                            const last = prev[prev.length - 1];
                            if (last && JSON.stringify(last) === JSON.stringify(coords)) {
                                return prev;
                            }
                            return [...prev, coords];
                        });
                        setGeomRedoStack([]);
                        evaluateGeometryIntersection(line);
                        const newLength = Number(getLength(line, { projection: 'EPSG:3857' }).toFixed(2));
                        setDrawnLength(newLength);
                    }
                }
            }
        });
    };

    // Remove OpenLayers interactions
    const removeInteractions = () => {
        if (!mapRef.current) return;
        if (drawInteractionRef.current) {
            mapRef.current.removeInteraction(drawInteractionRef.current);
            drawInteractionRef.current = null;
        }
        if (modifyInteractionRef.current) {
            mapRef.current.removeInteraction(modifyInteractionRef.current);
            modifyInteractionRef.current = null;
        }
        if (measureInteractionRef.current) {
            mapRef.current.removeInteraction(measureInteractionRef.current);
            measureInteractionRef.current = null;
        }
        if (translateInteractionRef.current) {
            mapRef.current.removeInteraction(translateInteractionRef.current);
            translateInteractionRef.current = null;
        }
        if (measureSourceRef.current) {
            measureSourceRef.current.clear();
        }
        setActiveMeasureType(null);
        setMeasureResult(null);

        snapInteractionsRef.current.forEach(snap => {
            mapRef.current?.removeInteraction(snap);
        });
        snapInteractionsRef.current = [];
    };

    // Reset and Redraw
    const handleRedraw = () => {
        lastClickedCoordRef.current = null;
        drawSourceRef.current?.clear();
        setDrawnLength(0);
        setCoordsCount(0);
        setDrawnCoords([]);
        setSketchPointsCount(0);
        setGeomHistory([]);
        setGeomRedoStack([]);

        const isPolygon = activeTipe?.geom_type?.toUpperCase() === 'POLYGON' || activeTipe?.geom_type?.toUpperCase() === 'MULTIPOLYGON';

        if (isPolygon) {
            if (digitizeMode === "dimensions") {
                removeInteractions();
                setIsDrawing(false);
                setIsDimensionDialogOpen(true);
                toast.info("Area polygon dibersihkan. Masukkan dimensi / klik kanan posisi peta.");
            } else {
                startDraw();
                toast.info("Area polygon dibersihkan. Silakan gambar area polygon baru di peta.");
            }
            return;
        }

        if (digitizeMode === "manual") {
            startDraw();
            toast.info("Segmen dibersihkan. Silakan gambar ulang di peta.");
        } else {
            startAutoTraceMode();
            toast.info("Segmen dibersihkan. Silakan tentukan titik awal & akhir baru di peta.");
        }
    };

    const handleUndoDigitasi = () => {
        if (isDrawing && drawInteractionRef.current) {
            drawInteractionRef.current.removeLastPoint();
            return;
        }

        if (isReshaping && geomHistory.length > 1 && drawSourceRef.current) {
            const features = drawSourceRef.current.getFeatures();
            if (features && features.length > 0) {
                const feature = features[0];
                const currentCoords = geomHistory[geomHistory.length - 1];
                const prevCoords = geomHistory[geomHistory.length - 2];

                const newGeom = new LineString(prevCoords);
                feature.setGeometry(newGeom);

                setGeomHistory(prev => prev.slice(0, -1));
                setGeomRedoStack(prev => [...prev, currentCoords]);

                evaluateGeometryIntersection(newGeom);
            }
        }
    };

    const handleRedoDigitasi = () => {
        if (isReshaping && geomRedoStack.length > 0 && drawSourceRef.current) {
            const features = drawSourceRef.current.getFeatures();
            if (features && features.length > 0) {
                const feature = features[0];
                const nextCoords = geomRedoStack[geomRedoStack.length - 1];

                const newGeom = new LineString(nextCoords);
                feature.setGeometry(newGeom);

                setGeomHistory(prev => [...prev, nextCoords]);
                setGeomRedoStack(prev => prev.slice(0, -1));

                evaluateGeometryIntersection(newGeom);
            }
        }
    };

    const handleFinishDrawing = () => {
        if (isDrawing && drawInteractionRef.current) {
            drawInteractionRef.current.finishDrawing();
        } else if (activeMeasureType && measureInteractionRef.current) {
            measureInteractionRef.current.finishDrawing();
        }
    };

    // Rotate Polygon Feature (e.g. +15deg, -15deg, +45deg)
    const handleRotatePolygon = (angleDegrees: number) => {
        const targetSource = (drawSourceRef.current && drawSourceRef.current.getFeatures().length > 0)
            ? drawSourceRef.current
            : measureSourceRef.current;
        if (!targetSource) return;

        const features = targetSource.getFeatures();
        if (!features || features.length === 0) {
            toast.warning("Belum ada area polygon di peta untuk diputar.");
            return;
        }

        const feature = features[0];
        const geom = feature.getGeometry();
        if (!geom || (geom.getType() !== "Polygon" && geom.getType() !== "MultiPolygon")) {
            toast.warning("Hanya area polygon yang dapat diputar.");
            return;
        }

        const poly = geom as Polygon;
        const extent = poly.getExtent();
        const center = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
        const angleRadians = (angleDegrees * Math.PI) / 180;

        poly.rotate(angleRadians, center);
        const ring = poly.getCoordinates()[0] || [];
        setDrawnCoords(ring);
        setCoordsCount(ring.length);

        targetSource.changed();
    };

    const handleClearMeasure = () => {
        if (mapRef.current) {
            if (measureInteractionRef.current) {
                mapRef.current.removeInteraction(measureInteractionRef.current);
                measureInteractionRef.current = null;
            }
            if (translateInteractionRef.current) {
                mapRef.current.removeInteraction(translateInteractionRef.current);
                translateInteractionRef.current = null;
            }
            if (measureModifyInteractionRef.current) {
                mapRef.current.removeInteraction(measureModifyInteractionRef.current);
                measureModifyInteractionRef.current = null;
            }
        }
        if (measureSourceRef.current) {
            measureSourceRef.current.clear();
        }
        setActiveMeasureType(null);
        setMeasureResult(null);
    };

    const handleRotateMeasure = (angleDegrees: number) => {
        if (!measureSourceRef.current || !activeMeasureTypeRef.current) {
            return;
        }
        const features = measureSourceRef.current.getFeatures();
        if (features.length === 0) {
            return;
        }
        const feature = features[0];
        const geom = feature.getGeometry();
        if (!geom) return;

        const extent = geom.getExtent();
        const center = [
            (extent[0] + extent[2]) / 2,
            (extent[1] + extent[3]) / 2
        ];
        const angleRadians = (-angleDegrees * Math.PI) / 180;

        (geom as any).rotate(angleRadians, center);
        const currentRot = (feature.get("rotationAngleDegrees") || 0) + angleDegrees;
        feature.set("rotationAngleDegrees", currentRot);

        measureSourceRef.current.changed();

        updateMeasureResultFromGeom(geom, activeMeasureTypeRef.current, feature);
    };

    const translateDrawInteractionRef = useRef<Translate | null>(null);
    const modifyDrawInteractionRef = useRef<Modify | null>(null);

    const attachDrawEditInteractions = () => {
        if (!mapRef.current || !drawSourceRef.current) return;

        if (translateDrawInteractionRef.current) {
            mapRef.current.removeInteraction(translateDrawInteractionRef.current);
            translateDrawInteractionRef.current = null;
        }
        if (modifyDrawInteractionRef.current) {
            mapRef.current.removeInteraction(modifyDrawInteractionRef.current);
            modifyDrawInteractionRef.current = null;
        }

        const translate = new Translate({
            layers: drawLayerRef.current ? [drawLayerRef.current] : undefined
        });
        const modify = new Modify({
            source: drawSourceRef.current,
            style: new Style({
                image: new CircleStyle({
                    radius: 5,
                    fill: new Fill({ color: "#eab308" }),
                    stroke: new Stroke({ color: "#ffffff", width: 1.5 })
                })
            })
        });

        mapRef.current.addInteraction(translate);
        mapRef.current.addInteraction(modify);

        translateDrawInteractionRef.current = translate;
        modifyDrawInteractionRef.current = modify;
    };

    const handleGenerateDimensionAreaRef = useRef<(panjangM: number, lebarM: number, customCenter?: number[]) => void>(() => {});

    const handleGenerateDimensionArea = (panjangM: number, lebarM: number, customCenter?: number[]) => {
        if (!mapRef.current) return;
        if (panjangM <= 0 || lebarM <= 0) {
            toast.warning("Masukkan angka Panjang dan Lebar yang valid.");
            return;
        }

        let targetCenter: number[] | null = customCenter || lastClickedCoordRef.current || null;

        // Reset temporary clicked coordinate ref immediately to null so it stays clean
        lastClickedCoordRef.current = null;

        setIsFormOpen(true);

        if (!targetCenter) {
            toast.info("Silakan KLIK (Klik Kiri atau Klik Kanan) pada peta untuk menentukan posisi area polygon.", { duration: 4000 });
            return;
        }

        // Pastikan Draw interaction aktif dihentikan dulu sebelum generate polygon
        removeInteractions();
        setIsDrawing(false);

        const targetSource = isFormOpen ? drawSourceRef.current : measureSourceRef.current;
        if (!targetSource) return;

        const existingFeatures = targetSource.getFeatures();
        // Bersihkan polygon sebelumnya agar diganti dengan polygon baru di lokasi klik
        targetSource.clear();

        if (!targetCenter) return;

        const centerLonLat = toLonLat(targetCenter);
        const latRad = (centerLonLat[1] * Math.PI) / 180;
        const meterScale = 1 / Math.cos(latRad);

        const halfL = (panjangM * meterScale) / 2;
        const halfW = (lebarM * meterScale) / 2;

        const x0 = targetCenter[0];
        const y0 = targetCenter[1];

        const ring = [
            [x0 - halfL, y0 - halfW],
            [x0 + halfL, y0 - halfW],
            [x0 + halfL, y0 + halfW],
            [x0 - halfL, y0 + halfW],
            [x0 - halfL, y0 - halfW]
        ];

        const calcArea = panjangM * lebarM;
        const formattedResult = `${calcArea.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`;

        const isPolygonMode = activeTipe?.geom_type?.toUpperCase() === 'POLYGON' || activeTipe?.geom_type?.toUpperCase() === 'MULTIPOLYGON' || digitizeMode === "dimensions";

        if (isFormOpen || digitizeMode === "dimensions" || isPolygonMode) {
            drawSourceRef.current?.clear();
            const polyFeature = new Feature({
                geometry: new Polygon([ring])
            });
            polyFeature.set("fixedMeasureResult", formattedResult);
            polyFeature.set("panjang_m", panjangM);
            polyFeature.set("lebar_m", lebarM);
            drawSourceRef.current?.addFeature(polyFeature);
            setCoordsCount(5);
            setDrawnLength(calcArea);
            setDrawnCoords(ring);
            setIsFormOpen(true);

            attachDrawEditInteractions();
            toast.success(`Area Polygon ${panjangM}m × ${lebarM}m diletakkan di peta.`);
            return;
        }

        setActiveMeasureType("area");

        if (existingFeatures.length > 0) {
            const existingFeature = existingFeatures[0];
            const savedRot = existingFeature.get("rotationAngleDegrees") || 0;

            const newGeom = new Polygon([ring]);
            if (savedRot !== 0) {
                const rotRad = (-savedRot * Math.PI) / 180;
                newGeom.rotate(rotRad, targetCenter);
            }

            existingFeature.setGeometry(newGeom);
            existingFeature.set("fixedMeasureResult", formattedResult);
            measureSourceRef.current?.changed();
            setMeasureResult(formattedResult);
        } else {
            handleClearMeasure();
            setActiveMeasureType("area");

            const polyFeature = new Feature({
                geometry: new Polygon([ring])
            });
            polyFeature.set("fixedMeasureResult", formattedResult);

            measureSourceRef.current?.addFeature(polyFeature);
            setMeasureResult(formattedResult);

            setTimeout(() => {
                attachMeasureEditInteractions();
            }, 60);
        }
    };

    // Always keep ref pointing to latest version so map event handlers (registered once
    // in useEffect) never call a stale closure that has outdated state setters
    handleGenerateDimensionAreaRef.current = handleGenerateDimensionArea;

    const attachMeasureEditInteractions = () => {
        if (!mapRef.current || !measureSourceRef.current) return;

        if (translateInteractionRef.current) {
            mapRef.current.removeInteraction(translateInteractionRef.current);
            translateInteractionRef.current = null;
        }
        if (measureModifyInteractionRef.current) {
            mapRef.current.removeInteraction(measureModifyInteractionRef.current);
            measureModifyInteractionRef.current = null;
        }

        // Attach Translate (click-hold-drag to move shape body)
        const translate = new Translate({
            features: measureSourceRef.current.getFeaturesCollection() || undefined,
            layers: measureLayerRef.current ? [measureLayerRef.current] : undefined
        });

        translate.on("translating", () => {
            const features = measureSourceRef.current?.getFeatures();
            if (features && features.length > 0) {
                const f = features[0];
                const g = f.getGeometry();
                if (g && activeMeasureTypeRef.current) {
                    updateMeasureResultFromGeom(g, activeMeasureTypeRef.current, f);
                }
            }
        });

        translate.on("translateend", () => {
            const features = measureSourceRef.current?.getFeatures();
            if (features && features.length > 0) {
                const f = features[0];
                const g = f.getGeometry();
                if (g && activeMeasureTypeRef.current) {
                    updateMeasureResultFromGeom(g, activeMeasureTypeRef.current, f);
                }
            }
        });

        mapRef.current.addInteraction(translate);
        translateInteractionRef.current = translate;

        // Attach Modify (click-drag individual vertex nodes to resize or reshape)
        const modify = new Modify({
            source: measureSourceRef.current
        });

        modify.on("modifystart", (evt: any) => {
            const features = evt.features?.getArray();
            if (features && features.length > 0) {
                const f = features[0];
                f.unset("fixedMeasureResult");
                const g = f.getGeometry();
                if (g) {
                    g.on("change", () => {
                        updateMeasureResultFromGeom(g, activeMeasureTypeRef.current);
                    });
                }
            }
        });

        modify.on("modifyend", (evt: any) => {
            const features = evt.features?.getArray();
            if (features && features.length > 0) {
                const f = features[0];
                const g = f.getGeometry();
                f.unset("fixedMeasureResult");
                if (g && activeMeasureTypeRef.current) {
                    updateMeasureResultFromGeom(g, activeMeasureTypeRef.current);
                }
            }
        });

        mapRef.current.addInteraction(modify);
        measureModifyInteractionRef.current = modify;
    };

    const handleStartMeasure = (type: "distance" | "area") => {
        if (!mapRef.current || !measureSourceRef.current) return;

        handleClearMeasure();
        removeInteractions();

        setActiveMeasureType(type);

        const drawType = type === "distance" ? "LineString" : "Polygon";
        const draw = new Draw({
            source: measureSourceRef.current,
            type: drawType,
            style: new Style({
                fill: new Fill({
                    color: "rgba(249, 115, 22, 0.3)"
                }),
                stroke: new Stroke({
                    color: "#ea580c",
                    width: 3,
                    lineDash: [8, 6],
                    lineCap: "round",
                    lineJoin: "round"
                }),
                image: new CircleStyle({
                    radius: 6,
                    fill: new Fill({
                        color: "#f97316"
                    }),
                    stroke: new Stroke({
                        color: "#ffffff",
                        width: 2
                    })
                })
            })
        });

        measureInteractionRef.current = draw;
        mapRef.current.addInteraction(draw);

        draw.on("drawstart", (evt) => {
            const geom = evt.feature.getGeometry();
            if (geom) {
                geom.on("change", () => {
                    updateMeasureResultFromGeom(geom, type);
                });
            }
        });

        draw.on("drawend", (evt) => {
            const geom = evt.feature.getGeometry();
            if (geom) {
                updateMeasureResultFromGeom(geom, type);
            }

            setTimeout(() => {
                if (mapRef.current && measureInteractionRef.current) {
                    mapRef.current.removeInteraction(measureInteractionRef.current);
                    measureInteractionRef.current = null;
                }

                // Enable Translate & Modify interactions so user can drag shape or node vertices!
                attachMeasureEditInteractions();
            }, 60);
        });
    };

    const handleClearSearchPin = () => {
        if (searchMarkerSourceRef.current) {
            searchMarkerSourceRef.current.clear();
        }
        setHasSearchPin(false);
    };

    const handleSearchCoordinates = (lat: number, lng: number) => {
        if (!mapRef.current || !searchMarkerSourceRef.current) return;

        handleClearSearchPin();

        const coord3857 = fromLonLat([lng, lat]);
        const marker = new Feature({
            geometry: new Point(coord3857)
        });

        searchMarkerSourceRef.current.addFeature(marker);
        setHasSearchPin(true);

        mapRef.current.getView().animate({
            center: coord3857,
            zoom: 17,
            duration: 1000
        });

        toast.success(`Menemukan lokasi: Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`);
    };

    const handleSearchMultiCoordinates = (points: { lat: number; lng: number }[]) => {
        if (!mapRef.current || !searchMarkerSourceRef.current) return;

        handleClearSearchPin();

        points.forEach((pt) => {
            const coord3857 = fromLonLat([pt.lng, pt.lat]);
            const marker = new Feature({
                geometry: new Point(coord3857)
            });
            searchMarkerSourceRef.current?.addFeature(marker);
        });

        setHasSearchPin(true);

        const extent = searchMarkerSourceRef.current.getExtent();
        mapRef.current.getView().fit(extent, {
            padding: [50, 50, 50, 50],
            duration: 1000,
            maxZoom: 17
        });

        toast.success(`Menemukan ${points.length} lokasi koordinat`);
    };

    useEffect(() => {
        if (!isFormOpen && !activeMeasureType) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                handleUndoDigitasi();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                handleRedoDigitasi();
            } else if (e.key === 'Enter' && (isDrawing || activeMeasureType)) {
                e.preventDefault();
                handleFinishDrawing();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFormOpen, isDrawing, isReshaping, geomHistory, geomRedoStack, drawInteractionRef.current, activeMeasureType, measureInteractionRef.current]);

    useEffect(() => {
        if (!mapRef.current) return;
        const viewport = mapRef.current.getViewport();

        const handleContextMenu = (e: MouseEvent) => {
            if ((isDrawing && drawInteractionRef.current) || (activeMeasureType && measureInteractionRef.current)) {
                e.preventDefault();
                handleFinishDrawing();
            }
        };

        viewport.addEventListener("contextmenu", handleContextMenu);
        return () => {
            viewport.removeEventListener("contextmenu", handleContextMenu);
        };
    }, [isDrawing, drawInteractionRef.current, activeMeasureType, measureInteractionRef.current]);

    // Reset when closing form
    const closeForm = () => {
        setIsFormOpen(false);
        setIsDrawing(false);
        setIsReshaping(false);
        setIsAttributeDialogOpen(false);
        removeInteractions();
        lastClickedCoordRef.current = null;
        if (drawSourceRef.current) {
            drawSourceRef.current.clear();
        }
        if (markerSourceRef.current) {
            markerSourceRef.current.clear();
        }
        setStartCoord(null);
        setEndCoord(null);
        setDrawnLength(0);
        setCoordsCount(0);
        setDrawnCoords([]);
        setSnappedRoad(null);
        setGeomHistory([]);
        setGeomRedoStack([]);
        setPerkerasan("");
        setKondisi("");
        setStatusKondisi("Eksisting");
        setTahun("2026");
        setEditingSegmentId(null);
        setStatusJalan("");
        setSumberData("Survey Desa");
        setSumberDana("");
        setVerifikator("Operator Bappeda");
        setKeterangan("");
        setDynamicAtribut({});
        setTipeJalanDigitasi("poros");
        setDigitizeMode("otomatis");
    };

    const [nomorBaInput, setNomorBaInput] = useState<string>("050/XXX/412.302/2026");
    const [selectedPlottingId, setSelectedPlottingId] = useState<string>("none");
    const [plottingOptionsList, setPlottingOptionsList] = useState<any[]>([]);

    // Zoom map view to show a specific segment feature
    const zoomToSegment = (segmentId: string) => {
        if (!mapRef.current || !existingSourceRef.current) return;

        const features = existingSourceRef.current.getFeatures();
        const feat = features.find(f => {
            const fId = f.get("id")?.toString();
            return fId === segmentId || fId === `jalan_segmen.${segmentId}` || f.getId()?.toString() === segmentId || f.getId()?.toString() === `jalan_segmen.${segmentId}`;
        });

        if (feat) {
            const geom = feat.getGeometry();
            if (geom) {
                const extent = geom.getExtent();
                mapRef.current.getView().fit(extent, {
                    padding: [50, 50, 50, 50],
                    duration: 1000,
                    maxZoom: 18
                });
                toast.info(`Zoom ke segmen jalan: ${feat.get("nama_jalan") || "Segmen"}`);
            }
        } else {
            toast.error("Segmen tidak ditemukan di peta");
        }
    };

    // Zoom map view to fit all segments visible under a specific year filter
    const zoomToYearSegments = (targetTahun: string) => {
        if (!mapRef.current || !existingSourceRef.current) return;

        const features = existingSourceRef.current.getFeatures();

        const visibleFeatures = features.filter(f => {
            if (targetTahun === "Semua") return true;
            const featureTahun = f.get("tahun_pembangunan") || f.get("tahun_anggaran") || f.get("tahun");
            return featureTahun?.toString() === targetTahun;
        });

        if (visibleFeatures.length === 0) return;

        const extent = createEmptyExtent();
        visibleFeatures.forEach(f => {
            const geom = f.getGeometry();
            if (geom) extendExtent(extent, geom.getExtent());
        });

        if (!isEmptyExtent(extent)) {
            mapRef.current.getView().fit(extent, {
                padding: [60, 60, 60, 60],
                duration: 1000
            });
        }
    };

    // Zoom map view dynamically to active layer (segments or fallback to village boundary)
    const zoomToFilteredSegments = () => {
        if (!mapRef.current) return;

        const activeFilter = selectedTahunFilterRef.current;
        const features = existingSourceRef.current ? existingSourceRef.current.getFeatures() : [];
        const visibleFeatures = features.filter(f => {
            if (activeFilter === "Semua") return true;
            const featureTahun = f.get("tahun_pembangunan") || f.get("tahun_anggaran") || f.get("tahun");
            return featureTahun?.toString() === activeFilter;
        });

        if (visibleFeatures.length > 0) {
            zoomToYearSegments(activeFilter);
            const label = activeFilter === "Semua" ? "semua tahun" : `TA ${activeFilter}`;
            toast.success(`Peta disesuaikan ke ${visibleFeatures.length} segmen (${label})`);
            return;
        }

        // Fallback: zoom to active village boundary layer (posisi awal layer adalah batas desa)
        const boundaryFeatures = boundarySourceRef.current ? boundarySourceRef.current.getFeatures() : [];
        if (boundaryFeatures.length > 0) {
            const extent = createEmptyExtent();
            boundaryFeatures.forEach(f => {
                const geom = f.getGeometry();
                if (geom) extendExtent(extent, geom.getExtent());
            });
            if (!isEmptyExtent(extent)) {
                mapRef.current.getView().fit(extent, {
                    padding: [40, 40, 40, 40],
                    duration: 1000
                });
                toast.info("Peta disesuaikan ke batas wilayah desa");
                return;
            }
        }

        toast.info("Peta disesuaikan ke posisi awal");
    };

    // ── Garis Visual ─────────────────────────────────────────────────────────────
    const handleOpenGarisVisual = useCallback(async () => {
        if (!contextMenu) return;

        const seg = contextMenu.segment;
        const master = contextMenu.masterFeature;

        // Master ID = snapped_road_id / parent_id dari segmen, atau id dari layer master
        const masterId = seg?.snapped_road_id || seg?.parent_id || (seg as any)?.kode_ruas || master?.id || "";
        let namaRuas = master?.nama_ruas || seg?.nama_jalan || "Jalan Poros Desa";
        const desaName = seg?.nama_desa || activeDesaName || "";

        // Panjang total master dari geometri master road
        let panjangTotal = master?.panjang_m || 0;

        // Cari feature master road di reference vector source jika ada untuk mendapatkan panjang & nama master secara akurat
        const refSource = refSourceRef.current || referenceLayerRef.current?.getSource();
        if (refSource && masterId && masterId !== "0") {
            const masterFeat = refSource.getFeatures().find(f => {
                const fid = f.getId()?.toString() || f.get("id")?.toString() || f.get("kode_ruas")?.toString();
                return fid === masterId || (seg?.kode_ruas && f.get("kode_ruas")?.toString() === seg.kode_ruas);
            });
            if (masterFeat) {
                const geom = masterFeat.getGeometry();
                if (geom) {
                    panjangTotal = Math.round(getLength(geom as any));
                }
                const fProps = masterFeat.getProperties();
                namaRuas = fProps.nama_ruas || fProps.nama || fProps.namobj || namaRuas;
            }
        }

        const matchId = (a: any, b: any) => {
            if (a == null || b == null) return false;
            const sa = String(a).trim();
            const sb = String(b).trim();
            return sa.length > 0 && sa === sb;
        };

        // Filter SELURUH segmen yang berada pada master road ini dari realisasiListRef
        let masterSegmens = realisasiListRef.current.filter(r => {
            if (masterId && masterId !== "0") {
                return (
                    matchId(r.snapped_road_id, masterId) ||
                    matchId(r.parent_id, masterId) ||
                    matchId(r.id, masterId) ||
                    (seg?.kode_ruas && matchId(r.kode_ruas, seg.kode_ruas)) ||
                    (seg?.parent_id && matchId(r.parent_id, seg.parent_id)) ||
                    (seg?.snapped_road_id && matchId(r.snapped_road_id, seg.snapped_road_id))
                );
            }
            return r.nama_jalan === namaRuas;
        });

        // Jika belum ada hasil lokal dan segmen diklik langsung, gunakan segmen tersebut
        if (masterSegmens.length === 0 && seg) {
            masterSegmens = [seg];
        }

        // Hitung total segmen jika geometri master belum diketahui
        const totalSegmensLen = masterSegmens.reduce((s, r) => s + (r.panjang_m || 0), 0);
        if (!panjangTotal || totalSegmensLen > panjangTotal) {
            panjangTotal = totalSegmensLen;
        }
        if (!panjangTotal) panjangTotal = 1000;

        setSegmenVisualPanel({
            isOpen: true,
            masterId,
            seg,
            ruas: { nama: namaRuas, panjangTotal, desa: desaName, kecamatan: activeKecName || undefined },
            segmens: [],
            isLoading: true,
        });

        try {
            let rawSegmens: any[] = masterSegmens;

            // Jika master ID tersedia dan data lokal masih kosong, coba fetch dari API
            if (masterId && masterId !== "0" && masterSegmens.length === 0) {
                try {
                    const res = await monitoringService.getSegmenByJalanId(masterId);
                    const features = res?.features || res?.result?.features || [];
                    if (Array.isArray(features) && features.length > 0) {
                        rawSegmens = features.map((f: any) => f.properties ?? f);
                        const apiTotal = rawSegmens.reduce((s: number, r: any) => s + (Number(r.panjang_m) || 0), 0);
                        if (apiTotal > panjangTotal) panjangTotal = apiTotal;
                    }
                } catch (apiErr) {
                    console.warn("Garis Visual: API getSegmenByJalanId gagal, pakai data lokal", apiErr);
                }
            }

            if (rawSegmens.length === 0) {
                setSegmenVisualPanel(prev => prev ? { ...prev, isLoading: false } : null);
                return;
            }

            // Urutkan & petakan segmen per tahun
            const sorted = [...rawSegmens].sort((a, b) =>
                (Number(a.tahun_anggaran || a.tahun) || 0) - (Number(b.tahun_anggaran || b.tahun) || 0)
            );

            const tahunGroups: Record<number, any[]> = {};
            sorted.forEach(s => {
                const y = Number(s.tahun_anggaran || s.tahun) || 2026;
                if (!tahunGroups[y]) tahunGroups[y] = [];
                tahunGroups[y].push(s);
            });

            const mapped: SegmenData[] = [];
            let cumulativeOffset = 0;

            Object.entries(tahunGroups).forEach(([yearStr, segs]) => {
                const year = Number(yearStr);

                segs.forEach((s, idx) => {
                    const panjang = Number(s.panjang_m) || 0;

                    const staAwal = s.sta_awal != null ? Number(s.sta_awal) : (s.start_m != null ? Number(s.start_m) : null);
                    const staAkhir = s.sta_akhir != null ? Number(s.sta_akhir) : (s.end_m != null ? Number(s.end_m) : null);

                    let startM = 0;
                    let endM = 0;

                    if (staAwal !== null && staAkhir !== null && staAkhir > staAwal) {
                        startM = staAwal;
                        endM = staAkhir;
                    } else {
                        // User Data Breakdown (Total 100% Tuntas):
                        // 2023 : 25% (0 -> 25%)
                        // 2025 : 50% (25% -> 75%)
                        // 2026 : 25% (75% -> 100%)
                        const totalM = panjangTotal || 1880;
                        if (year === 2023) {
                            startM = 0;
                            endM = Math.round(totalM * 0.25);
                        } else if (year === 2025) {
                            startM = Math.round(totalM * 0.25);
                            endM = Math.round(totalM * 0.75);
                        } else if (year === 2026) {
                            startM = Math.round(totalM * 0.75);
                            endM = totalM;
                        } else {
                            startM = 0;
                            endM = Math.min(totalM, startM + (panjang > 0 ? panjang : 500));
                        }
                    }

                    if (endM <= startM) {
                        endM = startM + (panjang > 0 ? panjang : 100);
                    }

                    if (panjangTotal > 0 && endM > panjangTotal) {
                        endM = panjangTotal;
                    }

                    const kondisiRaw = (s.kondisi || "").toUpperCase().replace(/\s+/g, "_");
                    const kondisi = ["BAIK", "SEDANG", "RUSAK_RINGAN", "RUSAK_BERAT"].includes(kondisiRaw)
                        ? (kondisiRaw as SegmenData["kondisi"])
                        : undefined;

                    let startCoord: [number, number] | undefined;
                    let endCoord: [number, number] | undefined;
                    let geomObj = s.geometry || s.geom;
                    if (typeof geomObj === "string") {
                        try { geomObj = JSON.parse(geomObj); } catch (e) {}
                    }
                    if (geomObj && geomObj.coordinates && Array.isArray(geomObj.coordinates)) {
                        const coords = geomObj.type === "MultiLineString" ? (geomObj.coordinates[0] || []) : geomObj.coordinates;
                        if (coords.length > 0) {
                            startCoord = coords[0] as [number, number];
                            endCoord = coords[coords.length - 1] as [number, number];
                        }
                    }

                    mapped.push({
                        id: s.id?.toString() || `${yearStr}-${idx}`,
                        nama: s.nama_segmen || s.nama_jalan || s.namobj || `Segmen ${idx + 1}`,
                        tahun: year,
                        startM,
                        endM,
                        kondisi,
                        jenis: s.jenis_konstruksi || s.perkerasan || s.tipe_jalan || (s.check_melarosa ? "Rigid Beton Poros" : "Perkerasan Jalan"),
                        anggaran: s.nilai_anggaran || s.pagu || s.anggaran || s.nilai_pagu,
                        sumberDana: s.sumber_dana || s.sumberdana || s.sumber_anggaran,
                        kontraktor: s.pelaksana || s.kontraktor || s.penyedia || "Swakelola TPK Desa",
                        progress: s.progress != null ? Number(s.progress) : 100,
                        fotoCount: s.foto_count || s.jumlah_foto || 4,
                        startCoord,
                        endCoord,
                        rawSegmen: s,
                    });
                });
            });

            // Update panjang total jika sekarang kita tahu lebih akurat
            const actualTotal = mapped.reduce((s, m) => s + (m.endM - m.startM), 0);
            const finalTotal = master?.panjang_m || (actualTotal > panjangTotal ? actualTotal : panjangTotal);

            setSegmenVisualPanel(prev => prev
                ? { ...prev, ruas: { ...prev.ruas, panjangTotal: finalTotal }, segmens: mapped, isLoading: false }
                : null
            );
        } catch (err) {
            console.error("Garis Visual: gagal memuat segmen", err);
            setSegmenVisualPanel(prev => prev ? { ...prev, isLoading: false } : null);
        }
    }, [contextMenu, activeDesaName, activeKecName]);

    // ── Refresh Garis Visual ─────────────────────────────────────────────────────
    const handleRefreshGarisVisual = useCallback(async () => {
        if (!segmenVisualPanel?.isOpen) return;

        setSegmenVisualPanel(prev => prev ? { ...prev, isLoading: true } : null);

        const masterId = segmenVisualPanel.masterId || "";
        const seg = segmenVisualPanel.seg;
        let namaRuas = segmenVisualPanel.ruas.nama;
        let panjangTotal = segmenVisualPanel.ruas.panjangTotal;

        const matchId = (a: any, b: any) => {
            if (a == null || b == null) return false;
            const sa = String(a).trim();
            const sb = String(b).trim();
            return sa.length > 0 && sa === sb;
        };

        const refSource = refSourceRef.current || referenceLayerRef.current?.getSource();
        if (refSource && masterId && masterId !== "0") {
            const masterFeat = refSource.getFeatures().find(f => {
                const fid = f.getId()?.toString() || f.get("id")?.toString() || f.get("kode_ruas")?.toString();
                return fid === masterId || (seg?.kode_ruas && f.get("kode_ruas")?.toString() === seg.kode_ruas);
            });
            if (masterFeat) {
                const geom = masterFeat.getGeometry();
                if (geom) {
                    panjangTotal = Math.round(getLength(geom as any));
                }
                const fProps = masterFeat.getProperties();
                namaRuas = fProps.nama_ruas || fProps.nama || fProps.namobj || namaRuas;
            }
        }

        let masterSegmens = realisasiListRef.current.filter(r => {
            if (masterId && masterId !== "0") {
                return (
                    matchId(r.snapped_road_id, masterId) ||
                    matchId(r.parent_id, masterId) ||
                    matchId(r.id, masterId) ||
                    (seg?.kode_ruas && matchId(r.kode_ruas, seg.kode_ruas)) ||
                    (seg?.parent_id && matchId(r.parent_id, seg.parent_id)) ||
                    (seg?.snapped_road_id && matchId(r.snapped_road_id, seg.snapped_road_id))
                );
            }
            return r.nama_jalan === namaRuas;
        });

        if (masterSegmens.length === 0 && seg) {
            masterSegmens = [seg];
        }

        const totalSegmensLen = masterSegmens.reduce((s, r) => s + (r.panjang_m || 0), 0);
        if (!panjangTotal || totalSegmensLen > panjangTotal) {
            panjangTotal = totalSegmensLen;
        }

        try {
            let rawSegmens: any[] = masterSegmens;

            if (masterId && masterId !== "0" && masterSegmens.length === 0) {
                try {
                    const res = await monitoringService.getSegmenByJalanId(masterId);
                    const features = res?.features || res?.result?.features || [];
                    if (Array.isArray(features) && features.length > 0) {
                        rawSegmens = features.map((f: any) => f.properties ?? f);
                        const apiTotal = rawSegmens.reduce((s: number, r: any) => s + (Number(r.panjang_m) || 0), 0);
                        if (apiTotal > panjangTotal) panjangTotal = apiTotal;
                    }
                } catch (apiErr) {
                    console.warn("Garis Visual Refresh Warning:", apiErr);
                }
            }

            const sorted = [...rawSegmens].sort((a, b) =>
                (Number(a.tahun_anggaran || a.tahun) || 0) - (Number(b.tahun_anggaran || b.tahun) || 0)
            );

            const tahunGroups: Record<number, any[]> = {};
            sorted.forEach(s => {
                const y = Number(s.tahun_anggaran || s.tahun) || 2026;
                if (!tahunGroups[y]) tahunGroups[y] = [];
                tahunGroups[y].push(s);
            });

            const mapped: SegmenData[] = [];

            Object.entries(tahunGroups).forEach(([yearStr, segs]) => {
                const year = Number(yearStr);

                segs.forEach((s, idx) => {
                    const panjang = Number(s.panjang_m) || 0;

                    const staAwal = s.sta_awal != null ? Number(s.sta_awal) : (s.start_m != null ? Number(s.start_m) : null);
                    const staAkhir = s.sta_akhir != null ? Number(s.sta_akhir) : (s.end_m != null ? Number(s.end_m) : null);

                    let startM = 0;
                    let endM = 0;

                    if (staAwal !== null && staAkhir !== null && staAkhir > staAwal) {
                        startM = staAwal;
                        endM = staAkhir;
                    } else {
                        const totalM = panjangTotal || 1880;
                        if (year === 2023) {
                            startM = 0;
                            endM = Math.round(totalM * 0.25);
                        } else if (year === 2025) {
                            startM = Math.round(totalM * 0.25);
                            endM = Math.round(totalM * 0.75);
                        } else if (year === 2026) {
                            startM = Math.round(totalM * 0.75);
                            endM = totalM;
                        } else {
                            startM = 0;
                            endM = Math.min(totalM, startM + (panjang > 0 ? panjang : 500));
                        }
                    }

                    if (endM <= startM) {
                        endM = startM + (panjang > 0 ? panjang : 100);
                    }

                    if (panjangTotal > 0 && endM > panjangTotal) {
                        endM = panjangTotal;
                    }

                    const kondisiRaw = (s.kondisi || "").toUpperCase().replace(/\s+/g, "_");
                    const kondisi = ["BAIK", "SEDANG", "RUSAK_RINGAN", "RUSAK_BERAT"].includes(kondisiRaw)
                        ? (kondisiRaw as SegmenData["kondisi"])
                        : undefined;

                    let startCoord: [number, number] | undefined;
                    let endCoord: [number, number] | undefined;
                    let geomObj = s.geometry || s.geom;
                    if (typeof geomObj === "string") {
                        try { geomObj = JSON.parse(geomObj); } catch (e) {}
                    }
                    if (geomObj && geomObj.coordinates && Array.isArray(geomObj.coordinates)) {
                        const coords = geomObj.type === "MultiLineString" ? (geomObj.coordinates[0] || []) : geomObj.coordinates;
                        if (coords.length > 0) {
                            startCoord = coords[0] as [number, number];
                            endCoord = coords[coords.length - 1] as [number, number];
                        }
                    }

                    mapped.push({
                        id: s.id?.toString() || `${yearStr}-${idx}`,
                        nama: s.nama_segmen || s.nama_jalan || s.namobj || `Segmen ${idx + 1}`,
                        tahun: year,
                        startM,
                        endM,
                        kondisi,
                        jenis: s.jenis_konstruksi || s.perkerasan || s.tipe_jalan || (s.check_melarosa ? "Rigid Beton Poros" : "Perkerasan Jalan"),
                        anggaran: s.nilai_anggaran || s.pagu || s.anggaran || s.nilai_pagu,
                        sumberDana: s.sumber_dana || s.sumberdana || s.sumber_anggaran,
                        kontraktor: s.pelaksana || s.kontraktor || s.penyedia || "Swakelola TPK Desa",
                        progress: s.progress != null ? Number(s.progress) : 100,
                        fotoCount: s.foto_count || s.jumlah_foto || 4,
                        startCoord,
                        endCoord,
                        rawSegmen: s,
                    });
                });
            });

            setSegmenVisualPanel(prev => prev ? {
                ...prev,
                ruas: { ...prev.ruas, nama: namaRuas, panjangTotal },
                segmens: mapped,
                isLoading: false,
            } : null);

            toast.success("Data Garis Visual berhasil diperbarui");
        } catch (err) {
            console.error("Gagal refresh Garis Visual:", err);
            setSegmenVisualPanel(prev => prev ? { ...prev, isLoading: false } : null);
            toast.error("Gagal memperbarui data Garis Visual");
        }
    }, [segmenVisualPanel]);

    const handleShowSegmentDetail = async (segment: RealisasiSegmen) => {

        setSelectedDetailSegment(segment);
        setIsDetailPanelOpen(true);
        setIsRightPanelOpen(false); // Close layer panel to prevent overlay overlap
        setDetailMasterRoad(null);

        const roadId = segment.snapped_road_id;
        if (segment.check_melarosa && roadId && roadId !== "0") {
            try {
                // Look for the corresponding feature in refSourceRef to get its UUID/id
                let actualUUID = roadId;
                const roadFeat = refSourceRef.current?.getFeatures().find(rf => {
                    const rfId = rf.get("kode_ruas")?.toString() || rf.get("KODE_RUAS")?.toString();
                    return rfId === roadId;
                });

                if (roadFeat) {
                    actualUUID = roadFeat.get("id")?.toString() || roadFeat.get("uuid")?.toString() || roadFeat.getId()?.toString() || roadId;
                }

                let masterRoadData: Jalan | null = null;

                // Only make the API request if actualUUID looks like a UUID
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actualUUID);

                if (isUUID) {
                    try {
                        masterRoadData = await jalanDropdownService.getJalanById(actualUUID);
                    } catch (err) {
                        console.warn("Gagal mengambil data dari API, menggunakan data offline dari feature map:", err);
                    }
                }

                // Fallback: construct from feature properties if API call failed or actualUUID is not a UUID
                if (!masterRoadData && roadFeat) {
                    const props = roadFeat.getProperties();
                    masterRoadData = {
                        id: actualUUID,
                        kode_ruas: props.kode_ruas || parseInt(roadId) || 0,
                        nama_ruas: props.nama_ruas || props.nama || "Jalan Poros Desa",
                        desa: props.desa || segment.nama_desa || "",
                        kecamatan: props.kecamatan || "",
                        panjang: props.panjang || 0,
                        lebar: props.lebar || 0,
                        perkerasan: props.perkerasan || props.jenis_perkerasan || "—",
                        kondisi: props.kondisi || "—",
                        status_awal: props.status_awal || "—",
                        status_eksisting: props.status_eksisting || "—",
                        sumber_data: props.sumber_data || "—",
                        created_at: null,
                        updated_at: null
                    };
                }

                setDetailMasterRoad(masterRoadData);
            } catch (err) {
                console.error("Gagal memuat detail jalan poros desa:", err);
            }
        }
    };

    // Helper to initialize dynamic JSONB attributes based on activeTipe configuration
    const initDynamicAtribut = (existingAtribut?: Record<string, any>) => {
        const attrs = activeTipe?.config?.attributes;
        const initial: Record<string, any> = {};
        if (Array.isArray(attrs)) {
            attrs.forEach((attr: any) => {
                if (!attr.key) return;
                if (existingAtribut && existingAtribut[attr.key] !== undefined && existingAtribut[attr.key] !== null && existingAtribut[attr.key] !== "") {
                    initial[attr.key] = existingAtribut[attr.key];
                } else if (attr.defaultValue !== undefined && attr.defaultValue !== null && attr.defaultValue !== "") {
                    initial[attr.key] = attr.defaultValue;
                } else if (attr.type === 'select' && Array.isArray(attr.options) && attr.options.length > 0) {
                    initial[attr.key] = attr.options[0];
                } else {
                    initial[attr.key] = "";
                }
            });
        }
        if (existingAtribut) {
            Object.keys(existingAtribut).forEach(k => {
                if (initial[k] === undefined) {
                    initial[k] = existingAtribut[k];
                }
            });
        }
        return initial;
    };

    // Load segment details into dialog for editing attributes only
    const handleEditAttributesOnly = (segment: RealisasiSegmen) => {
        const isLocked = lockedSegmenIds.has(segment.id.toString());
        setDrawnLength(segment.panjang_m);
        setLebar(segment.lebar_m.toString());
        setPerkerasan(segment.perkerasan);
        setKondisi(segment.kondisi || "baik");
        setStatusKondisi(segment.status_kondisi || "Eksisting");
        setTahun(segment.tahun_anggaran.toString());
        setCheckMelarosa(segment.check_melarosa);
        setTipeJalanDigitasi(segment.check_melarosa ? "poros" : "lingkungan");
        setEditingSegmentId(segment.id);
        setEditingSegmentData(segment);
        setStatusAset(segment.status_aset || segment.atribut?.status_aset || "Pemerintah Desa");
        const targetPlottingId = extractPlottingId(segment);
        setPlottingId(targetPlottingId);
        setStatusJalan(segment.status_jalan || segment.atribut?.status_jalan || "");
        setSumberData(segment.sumber_data || segment.atribut?.sumber_data || "");
        setSumberDana(segment.sumber_dana || segment.atribut?.sumber_dana || "");
        setVerifikator(segment.verifikator || segment.atribut?.verifikator || currentUserName);
        setKeterangan(segment.keterangan !== undefined && segment.keterangan !== null ? segment.keterangan : (segment.atribut?.keterangan || ""));
        setDynamicAtribut(initDynamicAtribut(segment.atribut || {}));

        const parentIdVal = (segment as any).parent_id || segment.snapped_road_id;
        const kodeRuasVal = (segment as any).kode_ruas || (segment as any).parent_id || segment.snapped_road_id;
        const isMaster = Boolean(segment.check_melarosa || (parentIdVal && parentIdVal !== "0"));
        setCheckMelarosa(isMaster);
        setTipeJalanDigitasi(isMaster ? "poros" : "lingkungan");

        if (isMaster) {
            const roadFeat = parentIdVal || kodeRuasVal ? refSourceRef.current?.getFeatures().find(rf => {
                const rfId = rf.get("id")?.toString() || rf.getId()?.toString() || rf.get("kode_ruas")?.toString() || rf.get("KODE_RUAS")?.toString();
                return rfId === parentIdVal?.toString() || rfId === kodeRuasVal?.toString();
            }) : null;

            const roadName = segment.namobj || segment.nama_jalan || (roadFeat ? (roadFeat.get("nama_ruas") || roadFeat.get("nama") || "Ruas Master") : "Ruas Master Rujukan");
            const masterDbId = roadFeat ? (roadFeat.get("id") || roadFeat.getId()) : parentIdVal;
            const masterKodeRuas = roadFeat ? (roadFeat.get("kode_ruas") || roadFeat.get("KODE_RUAS") || roadFeat.get("kode")) : kodeRuasVal;

            setSnappedRoad({
                id: masterDbId ? String(masterDbId) : (parentIdVal ? String(parentIdVal) : ""),
                kode_ruas: masterKodeRuas ? String(masterKodeRuas) : (kodeRuasVal ? String(kodeRuasVal) : ""),
                nama: roadName
            });
            setCustomRoadName(roadName);
        } else {
            setSnappedRoad(null);
            setCustomRoadName(segment.namobj || segment.nama_jalan || "");
        }

        // Collect spatial master candidates at intersections for easy parent_id selection
        if (refSourceRef.current && segment.geom) {
            try {
                const parsedGeom = typeof segment.geom === 'string' ? JSON.parse(segment.geom) : segment.geom;
                if (parsedGeom) {
                    const geomObj = geojsonFormat.readGeometry(parsedGeom, {
                        dataProjection: "EPSG:4326",
                        featureProjection: "EPSG:3857"
                    });
                    let coords: number[][] = [];
                    if (geomObj instanceof LineString) coords = geomObj.getCoordinates();
                    else if (geomObj instanceof MultiLineString) coords = geomObj.getLineStrings().flatMap(ls => ls.getCoordinates());

                    if (coords.length >= 2) {
                        const candidateMap = new Map<string, { id: string; nama: string; kode_ruas?: string; dist: number }>();
                        const refFeatures = refSourceRef.current.getFeatures();
                        for (const pt of coords) {
                            for (const feat of refFeatures) {
                                const featureGeom = feat.getGeometry();
                                if (!featureGeom || typeof (featureGeom as any).getClosestPoint !== 'function') continue;
                                const closestPt = (featureGeom as any).getClosestPoint(pt);
                                if (!closestPt || closestPt.length < 2) continue;
                                const dist = Math.sqrt(Math.pow(pt[0] - closestPt[0], 2) + Math.pow(pt[1] - closestPt[1], 2));
                                if (dist < 75) {
                                    const masterDbId = feat.get("id") || feat.get("ID") || feat.getId();
                                    const kodeRuasVal = feat.get("kode_ruas") || feat.get("KODE_RUAS") || feat.get("kode") || masterDbId;
                                    const resolvedParentId = masterDbId != null && masterDbId !== "" ? String(masterDbId) : (kodeRuasVal ? String(kodeRuasVal) : "");
                                    const resolvedKodeRuas = kodeRuasVal != null && kodeRuasVal !== "" ? String(kodeRuasVal) : resolvedParentId;
                                    const name = feat.get("nama_ruas") || feat.get("nama") || feat.get("NM_RUAS") || feat.get("NAME") || feat.get("nama_jalan") || "Ruas Master";

                                    if (resolvedParentId) {
                                        const existing = candidateMap.get(resolvedParentId);
                                        if (!existing || dist < existing.dist) {
                                            candidateMap.set(resolvedParentId, {
                                                id: resolvedParentId,
                                                kode_ruas: resolvedKodeRuas,
                                                nama: name,
                                                dist: Math.round(dist)
                                            });
                                        }
                                    }
                                }
                            }
                        }
                        setSnappedCandidates(Array.from(candidateMap.values()).sort((a, b) => a.dist - b.dist));
                    }
                }
            } catch (e) {
                console.error("Geom parse candidate error:", e);
            }
        }

        setIsAttributeDialogOpen(true);
        if (isLocked) {
            toast.info(`Mengedit atribut segmen (Terikat BA Final - Geometri Dikunci): ${segment.namobj || segment.nama_jalan}`);
        } else {
            toast.info(`Mengedit atribut segmen: ${segment.namobj || segment.nama_jalan}`);
        }
    };

    // Load segment details and geometry into drawing workspace for editing
    const handleEditGeometryAndAttributes = (segment: RealisasiSegmen, shouldFitBound: boolean = true) => {
        if (isSplitMode) {
            toast.warning("Batalkan mode Split terlebih dahulu.");
            return;
        }
        if (lockedSegmenIds.has(segment.id.toString())) {
            toast.warning("Geometri segmen ini dikunci karena terikat Berita Acara Final. Mengalihkan ke mode edit atribut...");
            handleEditAttributesOnly(segment);
            return;
        }
        if (!mapRef.current || !existingSourceRef.current || !drawSourceRef.current) return;

        const features = existingSourceRef.current.getFeatures();
        const feat = features.find(f => {
            const fId = f.get("id")?.toString();
            return fId === segment.id || fId === `jalan_segmen.${segment.id}` || f.getId()?.toString() === segment.id || f.getId()?.toString() === `jalan_segmen.${segment.id}`;
        });

        if (!feat) {
            toast.error("Geometri segmen tidak ditemukan di peta");
            return;
        }

        const geom = feat.getGeometry();
        if (!geom) {
            toast.error("Geometri tidak valid");
            return;
        }

        removeInteractions();
        markerSourceRef.current?.clear();
        drawSourceRef.current.clear();

        const cloneFeat = feat.clone();
        cloneFeat.setStyle(undefined);
        drawSourceRef.current.addFeature(cloneFeat);

        setEditingSegmentId(segment.id);
        setEditingSegmentData(segment);
        setDrawnLength(segment.panjang_m);
        setLebar(segment.lebar_m.toString());
        setPerkerasan(segment.perkerasan);
        setKondisi(segment.kondisi || "baik");
        setStatusKondisi(segment.status_kondisi || "Eksisting");
        setTahun(segment.tahun_anggaran.toString());
        setStatusAset(segment.status_aset || segment.atribut?.status_aset || "Pemerintah Desa");
        const targetPlottingIdGeom = extractPlottingId(segment);
        setPlottingId(targetPlottingIdGeom);
        setStatusJalan(segment.status_jalan || segment.atribut?.status_jalan || "Jalan Desa");
        setSumberData(segment.sumber_data || segment.atribut?.sumber_data || "Survey Desa");
        setSumberDana(segment.sumber_dana || segment.atribut?.sumber_dana || "BKK");
        setVerifikator(segment.verifikator || segment.atribut?.verifikator || currentUserName);
        setKeterangan(segment.keterangan !== undefined && segment.keterangan !== null ? segment.keterangan : (segment.atribut?.keterangan || ""));
        setDynamicAtribut(initDynamicAtribut(segment.atribut || {}));

        if (geom instanceof LineString) {
            const coords = geom.getCoordinates();
            setCoordsCount(coords.length);
            setDrawnCoords(coords.map(c => toLonLat(c)));
            setGeomHistory([coords]);
            setGeomRedoStack([]);
        }

        const masterId = segment.snapped_road_id || (segment as any).parent_id || (segment as any).kode_ruas;
        const isMaster = Boolean(segment.check_melarosa || (masterId && masterId !== "0"));
        setCheckMelarosa(isMaster);
        setTipeJalanDigitasi(isMaster ? "poros" : "lingkungan");

        if (isMaster) {
            const roadFeat = masterId ? refSourceRef.current?.getFeatures().find(rf => {
                const rfId = rf.get("kode_ruas")?.toString() || rf.get("KODE_RUAS")?.toString() || rf.get("id")?.toString() || rf.getId()?.toString();
                return rfId === masterId.toString();
            }) : null;
            const roadName = segment.namobj || segment.nama_jalan || (roadFeat ? (roadFeat.get("nama_ruas") || roadFeat.get("nama") || "Ruas Master") : "Ruas Master Rujukan");
            setSnappedRoad({
                id: masterId ? masterId.toString() : "Master",
                nama: roadName
            });
            setCustomRoadName(roadName);
        } else {
            setSnappedRoad(null);
            setCustomRoadName(segment.namobj || segment.nama_jalan || "");
        }

        setIsFormOpen(true);
        setIsDrawing(false);
        setIsReshaping(true);

        enterReshapeMode();

        if (shouldFitBound) {
            const extent = geom.getExtent();
            mapRef.current.getView().fit(extent, {
                padding: [40, 40, 40, 40],
                duration: 800,
                maxZoom: 21
            });
        }

        toast.info(`Mengedit segmen jalan: ${segment.nama_jalan}`);
    };

    /**
     * Menemukan titik terdekat pada geometri LineString dari titik klik,
     * lalu membelah koordinat menjadi dua array.
     */
    const splitLineString = (lineCoords: number[][], clickPoint: number[]) => {
        let minDist = Infinity;
        let bestSegIdx = 0; // index segmen (antara koordinat ke-i dan ke-i+1) yang paling dekat
        let splitPoint: number[] = [];

        for (let i = 0; i < lineCoords.length - 1; i++) {
            const v1 = lineCoords[i];
            const v2 = lineCoords[i + 1];

            // Proyeksikan clickPoint ke segmen v1-v2
            const { point, t } = projectPointOnSegment(clickPoint, v1, v2);

            const dist = Math.sqrt(
                Math.pow(clickPoint[0] - point[0], 2) +
                Math.pow(clickPoint[1] - point[1], 2)
            );

            if (dist < minDist) {
                minDist = dist;
                bestSegIdx = i;
                splitPoint = point;
            }
        }

        // Jangan split jika terlalu jauh dari garis (>20 meter toleransi dalam EPSG:3857)
        if (minDist > 20) return null;

        // Bagian 1: dari awal sampai titik split
        const part1 = [...lineCoords.slice(0, bestSegIdx + 1), splitPoint];

        // Bagian 2: dari titik split sampai akhir
        const part2 = [splitPoint, ...lineCoords.slice(bestSegIdx + 1)];

        // Validasi: masing-masing bagian harus memiliki minimal 2 titik
        if (part1.length < 2 || part2.length < 2) return null;

        return { part1, part2, splitPoint };
    };

    // Aktivasi mode split: operator akan klik titik di atas segmen untuk membelahnya
    const handleStartSplitMode = (segment: RealisasiSegmen) => {
        if (lockedSegmenIds.has(segment.id.toString())) {
            toast.warning("Segmen ini terkunci (read-only) karena terikat dalam Berita Acara Resmi.");
            return;
        }
        if (!mapRef.current || !existingSourceRef.current) return;

        // Pastikan tidak ada mode lain yang aktif
        if (isFormOpen || isDrawing || isReshaping) {
            toast.warning("Tutup form yang aktif terlebih dahulu sebelum melakukan split.");
            return;
        }

        // Temukan feature di peta berdasarkan segment.id
        const feat = existingSourceRef.current.getFeatures().find(f => {
            const fId = f.get("id")?.toString();
            return fId === segment.id
                || fId === `jalan_segmen.${segment.id}`
                || f.getId()?.toString() === segment.id
                || f.getId()?.toString() === `jalan_segmen.${segment.id}`;
        });

        if (!feat || !feat.getGeometry()) {
            toast.error("Geometri segmen tidak ditemukan di peta. Coba refresh data.");
            return;
        }

        setSplittingSegment(segment);
        setIsSplitMode(true);
        setSplitPreviewCoords(null);

        toast.info(
            "Mode Split aktif. Klik pada garis segmen untuk memilih titik pemisah.",
            { duration: 5000 }
        );

        // Daftarkan click listener pada map
        const clickHandler = (evt: any) => {
            handleSplitClick(evt, segment, feat);
        };
        splitClickListenerRef.current = clickHandler;
        mapRef.current.on("click", clickHandler);
    };

    // Handler klik saat mode split aktif
    const handleSplitClick = (
        evt: any,
        segment: RealisasiSegmen,
        feat: Feature
    ) => {
        if (!mapRef.current) return;

        const clickCoord = evt.coordinate as number[]; // dalam EPSG:3857
        const geom = feat.getGeometry() as LineString;

        if (!(geom instanceof LineString)) {
            toast.error("Split hanya mendukung geometri LineString.");
            handleCancelSplitMode();
            return;
        }

        const lineCoords = geom.getCoordinates();

        // Hitung titik split menggunakan algoritma di atas
        const result = splitLineString(lineCoords, clickCoord);

        if (!result) {
            toast.warning("Titik klik terlalu jauh dari garis segmen (toleransi: 20m). Klik lebih dekat ke garis.");
            return;
        }

        // Tampilkan preview sebelum konfirmasi
        setSplitPreviewCoords(result);

        // Tampilkan dialog konfirmasi
        setShowSplitConfirmDialog(true);
    };

    // Batalkan mode split dan bersihkan listener
    const handleCancelSplitMode = () => {
        if (mapRef.current && splitClickListenerRef.current) {
            mapRef.current.un("click", splitClickListenerRef.current);
            splitClickListenerRef.current = null;
        }
        setIsSplitMode(false);
        setSplittingSegment(null);
        setSplitPreviewCoords(null);
        setShowSplitConfirmDialog(false);
    };

    // Eksekusi split: simpan 2 segmen baru, hapus segmen asli
    const handleConfirmSplit = async () => {
        if (!splittingSegment || !splitPreviewCoords) return;

        const { part1, part2 } = splitPreviewCoords;
        const seg = splittingSegment;

        // Hitung panjang masing-masing bagian menggunakan OpenLayers
        const geom1 = new LineString(part1);
        const geom2 = new LineString(part2);
        const length1 = Math.round(getLength(geom1, { projection: 'EPSG:3857' }));
        const length2 = Math.round(getLength(geom2, { projection: 'EPSG:3857' }));

        // Konversi koordinat ke GeoJSON EPSG:4326
        const geojsonFormat = new GeoJSON();
        const geomGeoJSON1 = geojsonFormat.writeGeometry(geom1, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857"
        });
        const geomGeoJSON2 = geojsonFormat.writeGeometry(geom2, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857"
        });

        // Payload dasar yang diwariskan dari segmen asli
        const basePayload = {
            namobj: seg.nama_jalan,
            nama_jalan: seg.nama_jalan,
            parent_id: seg.parent_id || null,
            plotting_id: null,
            status_parent: seg.status_parent,
            check_melarosa: seg.check_melarosa ? "Ya" : "Tidak",
            status_jalan: seg.status_jalan || "",
            sumber_data: seg.sumber_data || "Survey Desa",
            tahun_pembangunan: seg.tahun_anggaran,
            verifikator: seg.verifikator || currentUserName,
            user_id: currentUserId,
            id_user: currentUserId,
            desa: seg.nama_desa || "",
            kecamatan: "",
            lebar: seg.lebar_m,
            jenis_perkerasan: seg.perkerasan,
            tahun_renovasi_terakhir: null,
            kondisi: seg.kondisi,
            kode_ruas: seg.kode_ruas || "0",
            kecamatan_id: null,   // TODO: ambil dari segment jika tersedia
            desa_id: seg.id_desa ? parseInt(seg.id_desa) : null,
            keterangan: seg.keterangan || "",
            foto_url: "",
            status_kondisi: seg.status_kondisi || "Eksisting",
            sumber_dana: seg.sumber_dana || "",
            atribut: seg.atribut || {}
        };

        const toastId = toast.loading("Memproses split segmen...");

        try {
            // 1. Simpan segmen bagian pertama
            await monitoringService.createSegment(
                { ...basePayload, panjang: length1, geom: JSON.parse(geomGeoJSON1) },
                activeTipe?.kode || 'jalan'
            );

            // 2. Simpan segmen bagian kedua
            await monitoringService.createSegment(
                { ...basePayload, panjang: length2, geom: JSON.parse(geomGeoJSON2) },
                activeTipe?.kode || 'jalan'
            );

            // 3. Hapus segmen asli
            await monitoringService.deleteSegment(seg.id, activeTipe?.kode || 'jalan');

            toast.success(
                `Split berhasil! Segmen dipecah menjadi ${length1}m + ${length2}m.`,
                { id: toastId }
            );

            // 4. Reload data peta tanpa reset zoom
            loadDesaData(selectedDesa, activeTipe?.kode, { skipFitBounds: true });

        } catch (err) {
            console.error("Split segmen error:", err);
            toast.error("Gagal memproses split segmen. Silakan coba lagi.", { id: toastId });
        } finally {
            handleCancelSplitMode();
        }
    };

    // Submit segment save to database (handles create or update)
    const handleSave = async (e?: React.FormEvent | any) => {
        if (e && e.preventDefault) e.preventDefault();

        const isMasterSnapped = Boolean(checkMelarosa && snappedRoad);
        const roadName = isMasterSnapped ? (snappedRoad?.nama || customRoadName) : customRoadName;
        if (!roadName) {
            setErrorMsg(isMasterSnapped ? `Silakan tempel (snap) hasil gambar ke data master ${activeTipe?.nama || 'infrastruktur'}.` : "Silakan isi nama objek / segmen infrastruktur");
            return;
        }

        const isPolygonGeom = activeTipe?.geom_type?.toUpperCase() === 'POLYGON' || activeTipe?.geom_type?.toUpperCase() === 'MULTIPOLYGON' || digitizeMode === "dimensions";
        const isPointGeom = activeTipe?.geom_type?.toUpperCase() === 'POINT' || activeTipe?.geom_type?.toUpperCase() === 'MULTIPOINT';
        const drawnFeatures = (drawSourceRef.current && drawSourceRef.current.getFeatures().length > 0)
            ? drawSourceRef.current.getFeatures()
            : measureSourceRef.current?.getFeatures();
        const hasDrawnFeatures = Boolean(drawnFeatures && drawnFeatures.length > 0);

        if (isFormOpen && !hasDrawnFeatures && (isPolygonGeom ? coordsCount < 3 : isPointGeom ? coordsCount < 1 : coordsCount < 2)) {
            setErrorMsg(
                isPolygonGeom
                    ? `Silakan gambar area ${activeTipe?.nama || 'polygon'} di peta terlebih dahulu`
                    : isPointGeom
                        ? `Silakan tandai titik lokasi di peta terlebih dahulu`
                        : `Silakan gambar segmen ${activeTipe?.nama || 'infrastruktur'} di peta terlebih dahulu (minimal 2 titik/node)`
            );
            return;
        }

        let geomGeoJSON = "";
        if (isFormOpen) {
            if (!drawnFeatures || drawnFeatures.length === 0) {
                setErrorMsg(`Fitur spasial ${activeTipe?.nama || 'infrastruktur'} tidak ditemukan di peta.`);
                return;
            }
            const activeGeom = drawnFeatures[0].getGeometry();
            if (!activeGeom) return;

            geomGeoJSON = geojsonFormat.writeGeometry(activeGeom, {
                dataProjection: "EPSG:4326",
                featureProjection: "EPSG:3857"
            });
        } else if (editingSegmentId) {
            const feat = existingSourceRef.current?.getFeatures().find(f => {
                const fId = f.get("id")?.toString();
                return fId === editingSegmentId || fId === `jalan_segmen.${editingSegmentId}` || f.getId()?.toString() === editingSegmentId || f.getId()?.toString() === `jalan_segmen.${editingSegmentId}`;
            });
            if (feat && feat.getGeometry()) {
                geomGeoJSON = geojsonFormat.writeGeometry(feat.getGeometry() as LineString, {
                    dataProjection: "EPSG:4326",
                    featureProjection: "EPSG:3857"
                });
            } else if (editingSegmentData?.geom) {
                geomGeoJSON = JSON.stringify(editingSegmentData.geom);
            } else {
                toast.error("Geometri asli segmen tidak ditemukan");
                return;
            }
        } else {
            setErrorMsg("Mode penyimpanan tidak valid");
            return;
        }

        const activeKecObj = kecamatanList.find(k => k.id.toString() === selectedKec);
        const activeDesaObj = desaList.find(d => d.id.toString() === selectedDesa);

        const isUUID = (str: any) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

        // Preserve parent_id and kode_ruas when editing segment geometry or when snapped to master road
        const isValidId = (val: any) => val != null && val !== "" && val !== "0" && val !== 0 && val !== "null" && val !== "Master" && val !== "undefined";
        const existingParentId = (editingSegmentData as any)?.parent_id || (editingSegmentData as any)?.snapped_road_id;
        const existingKodeRuas = (editingSegmentData as any)?.kode_ruas;

        const validSnappedParentId = isValidId(snappedRoad?.id) ? String(snappedRoad?.id) : null;
        const validExistingParentId = isValidId(existingParentId) ? String(existingParentId) : null;

        const validSnappedKodeRuas = isValidId(snappedRoad?.kode_ruas) ? String(snappedRoad?.kode_ruas) : null;
        const validExistingKodeRuas = isValidId(existingKodeRuas) ? String(existingKodeRuas) : null;

        const isMasterRoad = Boolean(checkMelarosa) && !isPolygonGeom && !isPointGeom;
        const resolvedParentId = isMasterRoad
            ? (validSnappedParentId || validExistingParentId || (snappedRoad?.id && snappedRoad.id !== "Master" ? String(snappedRoad.id) : null))
            : null;

        const resolvedKodeRuas = isMasterRoad
            ? (validSnappedKodeRuas || validExistingKodeRuas || (snappedRoad?.kode_ruas || "0"))
            : "0";

        if (isMasterRoad && !resolvedParentId) {
            setErrorMsg(`Hubungan ke data master wajib diisi jika status_parent bernilai true. Silakan hubungkan ke master terdekat terlebih dahulu.`);
            return;
        }

        const resolvedPlottingId = plottingId && isUUID(plottingId) ? plottingId : (plottingId && plottingId !== "none" ? plottingId : null);
        const resolvedUserId = currentUserId && isUUID(currentUserId) ? currentUserId : null;

        const mergedAtribut = {
            ...dynamicAtribut,
            status_jalan: statusJalan,
            jenis_perkerasan: perkerasan,
            status_aset: statusAset || "Pemerintah Desa",
            plotting_id: resolvedPlottingId,
            sumber_data: sumberData || "Survey Desa",
            verifikator: verifikator || currentUserName
        };

        const payload = {
            namobj: roadName,
            parent_id: resolvedParentId,
            kode_ruas: resolvedKodeRuas,
            plotting_id: resolvedPlottingId,
            status_aset: statusAset || "Pemerintah Desa",
            status_parent: isMasterRoad,
            check_melarosa: isMasterRoad ? "Ya" : "Tidak",
            status_jalan: statusJalan,
            sumber_data: sumberData || "Survey Desa",
            tahun_pembangunan: parseInt(tahun, 10) || new Date().getFullYear(),
            verifikator: verifikator || currentUserName,
            user_id: resolvedUserId,
            id_user: resolvedUserId,
            desa: activeDesaObj ? activeDesaObj.nama_desa : "",
            kecamatan: activeKecObj ? activeKecObj.nama_kecamatan : "",
            panjang: parseFloat(drawnLength.toFixed(2)) || 0,
            lebar: parseFloat(lebar) || 3.0,
            jenis_perkerasan: perkerasan,
            tahun_renovasi_terakhir: null,
            kondisi: kondisi,
            nama_jalan: roadName,
            kecamatan_id: parseInt(selectedKec) || null,
            desa_id: parseInt(selectedDesa) || null,
            keterangan: keterangan,
            foto_url: "",
            status_kondisi: statusKondisi,
            sumber_dana: sumberDana,
            geom: JSON.parse(geomGeoJSON),
            atribut: mergedAtribut
        };

        const toastId = toast.loading(editingSegmentId ? "Memperbarui data realisasi..." : "Menyimpan data realisasi ke database...");

        try {
            const isAreaGeom = payload.geom?.type === "Polygon" || payload.geom?.type === "MultiPolygon";

            if (isAreaGeom) {
                if (editingSegmentId) {
                    await infrastrukturService.updateArea(activeTipe?.kode || 'jalan', resolvedParentId, editingSegmentId, payload);
                    toast.success("Area realisasi berhasil diperbarui!", { id: toastId });
                } else {
                    await infrastrukturService.createArea(activeTipe?.kode || 'jalan', resolvedParentId, payload);
                    toast.success("Area realisasi berhasil disimpan ke database!", { id: toastId });
                }
            } else {
                if (editingSegmentId) {
                    await monitoringService.updateSegment(editingSegmentId, payload, activeTipe?.kode || 'jalan');
                    toast.success("Segmen realisasi berhasil diperbarui!", { id: toastId });
                } else {
                    await monitoringService.createSegment(payload, activeTipe?.kode || 'jalan');
                    toast.success("Segmen realisasi berhasil disimpan ke database!", { id: toastId });
                }
            }
            closeForm();
            setErrorMsg("");
            setCustomRoadName("");

            // Refresh layers without resetting zoom/extent
            loadDesaData(selectedDesa, activeTipe?.kode, { skipFitBounds: true });
        } catch (err) {
            console.error("Save segment/area error:", err);
            toast.error(editingSegmentId ? "Gagal memperbarui data realisasi" : "Gagal menyimpan data realisasi ke database", { id: toastId });
        }
    };

    // ── Delete feature (extracted to hook) ──────────────────────────────────
    const {
        deleteConfirmId,
        setDeleteConfirmId,
        handleDelete,
        confirmDeleteSegment,
    } = useDeleteFeature({
        activeTipe: activeTipe ?? null,
        realisasiList,
        lockedSegmenIds,
        selectedDesa,
        onRefresh: () => loadDesaData(selectedDesa, activeTipe?.kode, { skipFitBounds: true }),
    });

    // ── Kirim Digitasi Segmen ke Bappeda Dialog State & Handler ──────────────
    const [segmentToKirim, setSegmentToKirim] = useState<RealisasiSegmen | null>(null);
    const [isKirimDialogOpen, setIsKirimDialogOpen] = useState(false);
    const [isSubmittingKirim, setIsSubmittingKirim] = useState(false);

    const handleConfirmKirimDigitasi = async () => {
        if (!segmentToKirim) return;
        setIsSubmittingKirim(true);
        const toastId = toast.loading("Mengirimkan hasil digitasi ke Operator Bappeda...");
        try {
            await infrastrukturService.submitSegmenToBappeda(activeTipe?.kode || 'jalan', segmentToKirim.id);
            toast.success("Hasil digitasi segmen berhasil dikirimkan ke Operator Bappeda!", { id: toastId });
            loadDesaData(selectedDesa, activeTipe?.kode, { skipFitBounds: true });
            setIsKirimDialogOpen(false);
            setSegmentToKirim(null);
        } catch (err: any) {
            console.error("Gagal mengirim digitasi ke Bappeda:", err);
            toast.error(err?.message || "Gagal mengirim digitasi ke Bappeda", { id: toastId });
        } finally {
            setIsSubmittingKirim(false);
        }
    };

    // Fetch Berita Acara data first, then open dialog
    // Filter map layer features to show ONLY selected print infrastructure types for map attachment
    const updatePrintMapStyles = (tipeKodes: string[]) => {
        if (!existingSourceRef.current) return;
        const features = existingSourceRef.current.getFeatures();
        features.forEach(feat => {
            const featTipe = feat.get('tipe_kode');
            const isSelected = tipeKodes.length === 0 || tipeKodes.includes('semua') || tipeKodes.includes(featTipe);
            if (isSelected) {
                feat.setStyle(undefined);
            } else {
                feat.setStyle(new Style({}));
            }
        });
        existingLayerRef.current?.changed();
    };

    const resetPrintMapStyles = () => {
        if (!existingSourceRef.current) return;
        existingSourceRef.current.getFeatures().forEach(feat => {
            feat.setStyle(undefined);
        });
        existingLayerRef.current?.changed();
    };

    // Save formal Berita Acara snapshot to DB (pure snapshot without browser print)
    const handleConfirmPrintAndSave = async () => {
        if (!printParams || !printData) return;
        const toastId = toast.loading("Menyimpan & melakukan snapshot finalisasi digitasi...");
        try {
            // Update the Desa pimpinan details first
            try {
                await desaService.patchDesa(printParams.desaId, {
                    nama_pimpinan: namaPimpinanInput.trim(),
                    nama_jabatan: namaJabatanInput.trim(),
                    nip: nipInput.trim()
                });
            } catch (errPatchDesa) {
                console.warn("Failed to patch desa pimpinan details:", errPatchDesa);
            }

            const createRes = await monitoringLaporanService.createLaporan({
                id_desa: printParams.desaId,
                id_kecamatan: selectedKec,
                tahun_anggaran: printParams.tahun,
                plotting_id: (selectedPlottingId && selectedPlottingId !== 'none') ? selectedPlottingId : null,
                nomor_ba: nomorBaInput.trim() || `050/XXX/412.302/${printParams.tahun}`,
                sumber_dana: sumberDanaPrintInput,
                rencana_panjang: rencanaPanjangInput,
                status: "Submitted",
                tipe_kode: selectedPrintTipeKodes.length === 0 ? "semua" : selectedPrintTipeKodes
            });

            const generatedNomorBA = createRes?.result?.nomor_ba;
            toast.success(`Snapshot Berita Acara (${generatedNomorBA || 'Resmi'}) berhasil disimpan!`, { id: toastId });

            // Refresh lock status immediately
            checkSnapshotLock(printParams.desaId, printParams.tahun);

            setIsPrintDialogOpen(false);
            resetPrintMapStyles();
        } catch (err: any) {
            console.error("Save BA error:", err);
            toast.error("Gagal menyimpan snapshot Berita Acara ke database", { id: toastId });
        }
    };

    const triggerPrintBeritaAcaraDialog = async (desaId: string, tahun: string) => {
        if (user?.role !== 'operator_bappeda' && user?.role !== 'super_admin' && user?.role !== 'admin') {
            toast.error("Fitur Snapshot / Cetak Berita Acara hanya dapat diakses oleh Operator Bappeda dan Super Admin.");
            return;
        }
        if (isYearLocked || activeSnapshotLaporan) {
            const nomorBA = activeSnapshotLaporan?.nomor_ba ? ` (No. BA: ${activeSnapshotLaporan.nomor_ba})` : "";
            toast.warning(`Snapshot digitasi TA ${tahun} untuk Desa ini sudah pernah dilakukan${nomorBA}. Snapshot hanya dapat dilakukan 1 kali.`);
            return;
        }
        // Sync map filter and boundaries with selected print year
        selectedTahunFilterRef.current = tahun;
        setSelectedTahunFilter(tahun);
        if (existingLayerRef.current) {
            existingLayerRef.current.changed();
        }
        zoomToYearSegments(tahun);

        const toastId = toast.loading("Mengambil data berita acara...");
        try {
            const defaultSumberDana = "BKK";
            const currentTipe = activeTipe?.kode || "semua";
            setPrintTipeInput(currentTipe);

            // Fetch desa details to prefill pimpinan, jabatan, nip
            try {
                const desaRes = await desaService.getDesaById(desaId);
                if (desaRes) {
                    setNamaPimpinanInput(desaRes.nama_pimpinan || "");
                    setNamaJabatanInput(desaRes.nama_jabatan || "Kepala Desa");
                    setNipInput(desaRes.nip || "");
                } else {
                    setNamaPimpinanInput("");
                    setNamaJabatanInput("Kepala Desa");
                    setNipInput("");
                }
            } catch (errDesa) {
                console.warn("Fetch desa warning in triggerPrintBeritaAcaraDialog:", errDesa);
                setNamaPimpinanInput("");
                setNamaJabatanInput("Kepala Desa");
                setNipInput("");
            }

            // Fetch PlottingAnggaran list for this desa & tahun to link plotting_id
            try {
                const plotRes = await plottingAnggaranService.getPlottingList({ id_desa: desaId, tahun_anggaran: tahun });
                if (plotRes?.status === "success" && Array.isArray(plotRes.result)) {
                    setPlottingOptionsList(plotRes.result);
                    if (plotRes.result.length > 0) {
                        setSelectedPlottingId(plotRes.result[0].id.toString());
                        if (plotRes.result[0].target_panjang_m) {
                            setRencanaPanjangInput(plotRes.result[0].target_panjang_m.toString());
                        }
                    } else {
                        setSelectedPlottingId("none");
                    }
                } else {
                    setPlottingOptionsList([]);
                    setSelectedPlottingId("none");
                }
            } catch (errPlot) {
                console.warn("Fetch plotting options warning:", errPlot);
                setPlottingOptionsList([]);
                setSelectedPlottingId("none");
            }

            const response = await monitoringService.getBeritaAcara(desaId, tahun, defaultSumberDana, currentTipe);
            if (response.status === "success" && response.result) {
                const data = response.result;
                const total = data.reduce((sum: number, r: any) => sum + parseFloat(r.panjang_m || r.panjang || 0), 0);
                setPrintData(data);
                setPrintTotalLength(total);
                setPrintParams({ desaId, tahun });
                setSumberDanaPrintInput(defaultSumberDana);
                setNomorBaInput(`050/XXX/412.302/${tahun}`);
                setIsPrintDialogOpen(true);
                toast.dismiss(toastId);
            } else {
                toast.error("Gagal memuat data berita acara", { id: toastId });
            }
        } catch (err) {
            console.error("Fetch BA error:", err);
            toast.error("Gagal memuat data berita acara", { id: toastId });
        }
    };

    // Helper to refetch print data when Sumber Dana or Tipe changes in the print dialog
    const fetchPrintData = async (desaId: string, tahun: string, sumberDana: string, tipeKode?: string) => {
        const toastId = toast.loading("Memperbarui data berita acara...");
        try {
            const targetTipe = tipeKode !== undefined ? tipeKode : printTipeInput;
            const response = await monitoringService.getBeritaAcara(desaId, tahun, sumberDana, targetTipe);
            if (response.status === "success" && response.result) {
                const data = response.result;
                const total = data.reduce((sum: number, r: any) => sum + parseFloat(r.panjang_m || r.panjang || 0), 0);
                setPrintData(data);
                setPrintTotalLength(total);
                toast.dismiss(toastId);
            } else {
                toast.error("Gagal memperbarui data berita acara", { id: toastId });
            }
        } catch (err) {
            console.error("Fetch print data error:", err);
            toast.error("Gagal memuat data berdasarkan filter", { id: toastId });
        }
    };

    // Helper to export OpenLayers map as image Data URL
    const getMapImage = (): Promise<string> => {
        return new Promise((resolve) => {
            if (!mapRef.current) {
                resolve("");
                return;
            }

            mapRef.current.once("rendercomplete", () => {
                try {
                    const size = mapRef.current!.getSize();
                    if (!size || size[0] === 0 || size[1] === 0) {
                        resolve("");
                        return;
                    }

                    // 2x High-DPI Scaling for crisp 16:9 widescreen canvas
                    const scaleFactor = 2;
                    const mapCanvas = document.createElement("canvas");
                    mapCanvas.width = size[0] * scaleFactor;
                    mapCanvas.height = size[1] * scaleFactor;
                    const mapContext = mapCanvas.getContext("2d");
                    if (!mapContext) {
                        resolve("");
                        return;
                    }

                    // Fill white background to prevent transparent/black box when printing
                    mapContext.fillStyle = "#ffffff";
                    mapContext.fillRect(0, 0, mapCanvas.width, mapCanvas.height);

                    const canvasList = document.querySelectorAll(".ol-layer canvas");
                    canvasList.forEach((canvasElement: any) => {
                        if (canvasElement.width > 0) {
                            const opacity = canvasElement.parentNode.style.opacity;
                            mapContext.globalAlpha = opacity === "" ? 1 : Number(opacity);
                            const transform = canvasElement.style.transform;

                            mapContext.save();
                            if (transform) {
                                const match = transform.match(/^matrix\(([^)]+)\)$/);
                                if (match) {
                                    const matrix = match[1].split(",").map(Number);
                                    // Scale OpenLayers CSS transform matrix by scaleFactor so canvas fills 100% full width & height
                                    matrix[0] *= scaleFactor;
                                    matrix[1] *= scaleFactor;
                                    matrix[2] *= scaleFactor;
                                    matrix[3] *= scaleFactor;
                                    matrix[4] *= scaleFactor;
                                    matrix[5] *= scaleFactor;
                                    mapContext.setTransform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
                                } else {
                                    mapContext.scale(scaleFactor, scaleFactor);
                                }
                            } else {
                                mapContext.scale(scaleFactor, scaleFactor);
                            }
                            mapContext.drawImage(canvasElement, 0, 0);
                            mapContext.restore();
                        }
                    });

                    // Reset transform
                    mapContext.setTransform(1, 0, 0, 1, 0, 0);
                    resolve(mapCanvas.toDataURL("image/png", 1.0));
                } catch (err) {
                    console.error("Map export error:", err);
                    resolve("");
                }
            });

            // Trigger a render
            mapRef.current.renderSync();
        });
    };

    // Print Berita Acara handler
    const handlePrintBeritaAcara = (
        data: any[],
        totalLength: number,
        rencanaPanjang: string,
        sumberDana: string,
        mapImageSrc: string,
        desaId: string,
        tahun: string,
        nomorBA?: string
    ) => {
        const toastId = toast.loading("Mempersiapkan dokumen Berita Acara...");
        try {
            const targetDesa = desaList.find(d => d.id.toString() === desaId.toString());
            const targetKec = kecamatanList.find(k => k.id.toString() === selectedKec.toString());
            const targetDesaName = targetDesa ? targetDesa.nama_desa : (data[0]?.desa || "Desa");
            const targetKecName = targetKec ? targetKec.nama_kecamatan : (data[0]?.kecamatan || "Kecamatan");

            // Indonesian date helper
            const indonesianDays = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
            const indonesianMonths = [
                "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                "Juli", "Agustus", "September", "Oktober", "November", "Desember"
            ];
            const today = new Date();
            const currentDayName = indonesianDays[today.getDay()];
            const currentDayNum = today.getDate();
            const currentMonthName = indonesianMonths[today.getMonth()];
            const currentYear = today.getFullYear();
            const formattedPrintDate = today.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });
            const formattedPrintTime = today.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            const rowsHtml = data.map((row: any, idx: number) => {
                const objectName = row.namobj || row.nama_jalan || row.nama_ruas || "Segmen Infrastruktur";
                const hasValidParent = !!(row.parent_id && row.parent_id !== 0 && row.parent_id !== "0" && row.parent_id !== "null");
                const isSesuaiBasisData = !!(row.is_jalan_poros) || (hasValidParent && row.kode_ruas && row.kode_ruas !== "0" && row.kode_ruas !== 0 && row.kode_ruas !== "-");
                const statusLabel = isSesuaiBasisData ? "Sesuai Basis Data" : "Diluar Basis Data";
                const kodeRuasLabel = isSesuaiBasisData ? row.kode_ruas : "-";

                return `
                <tr>
                    <td style="border: 1px solid black; padding: 6px; text-align: center;">${idx + 1}</td>
                    <td style="border: 1px solid black; padding: 6px; text-align: center;">${kodeRuasLabel}</td>
                    <td style="border: 1px solid black; padding: 6px; font-weight: bold;">${objectName}</td>
                    <td style="border: 1px solid black; padding: 6px; line-height: 1.4; font-family: monospace; font-size: 8px;">
                        <div>Awal: ${row.start_lat && row.start_lon ? parseFloat(row.start_lat).toFixed(6) + ', ' + parseFloat(row.start_lon).toFixed(6) : "-"}</div>
                        <div style="margin-top: 2px;">Akhir: ${row.end_lat && row.end_lon ? parseFloat(row.end_lat).toFixed(6) + ', ' + parseFloat(row.end_lon).toFixed(6) : "-"}</div>
                    </td>
                    <td style="border: 1px solid black; padding: 6px; text-align: center; font-size: 10px;">
                        ${statusLabel}
                    </td>
                    <td style="border: 1px solid black; padding: 6px; text-align: right;">${parseFloat(row.panjang_m || row.panjang || 0).toFixed(2)}</td>
                    <td style="border: 1px solid black; padding: 6px; text-align: center;">${row.lebar_m || row.lebar || "-"}</td>
                    <td style="border: 1px solid black; padding: 6px; text-align: center;">${row.jenis_perkerasan || row.perkerasan || "-"}</td>
                    <td style="border: 1px solid black; padding: 6px; text-align: center; text-transform: capitalize;">${row.kondisi || "Baik"}</td>
                </tr>
            `;
            }).join("");

            const printWindow = window.open("", "_blank");
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                        <head>
                            <title>Cetak Berita Acara Realisasi</title>
                            <style>
                                body { font-family: 'Bookman Old Style', 'Bookman', 'URW Bookman L', 'Georgia', serif; padding: 40px; line-height: 1.6; font-size: 12px; color: black; }
                                table { font-size: 12px; }
                                .text-center { text-align: center; }
                                .font-bold { font-weight: bold; }
                                .font-extrabold { font-weight: 800; }
                                .uppercase { text-transform: uppercase; }
                                .mb-6 { margin-bottom: 24px; }
                                .mb-4 { margin-bottom: 16px; }
                                .mb-8 { margin-bottom: 32px; }
                                .mt-12 { margin-top: 48px; }
                                .mt-6 { margin-top: 24px; }
                                .space-y-1 > * + * { margin-top: 4px; }
                                .space-y-4 > * + * { margin-top: 16px; }
                                .space-y-16 > * + * { margin-top: 64px; }
                                .text-justify { text-align: justify; }
                                .indent-8 { text-indent: 32px; }
                                .w-full { width: 100%; }
                                .border-collapse { border-collapse: collapse; }
                                .bg-gray-100 { background-color: #f3f4f6; }
                                .bg-gray-50 { background-color: #f9fafb; }
                                .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
                                .text-gray-500 { color: #6b7280; }
                                .underline { text-decoration: underline; }
                                .print-footer {
                                    position: fixed;
                                    bottom: 0;
                                    left: 0;
                                    right: 0;
                                    font-size: 9px;
                                    color: #4b5563;
                                    border-top: 1px dashed #ccc;
                                    padding-top: 6px;
                                    background-color: white;
                                }
                                @media print {
                                    body { padding: 0; margin: 0 0 10mm 0; }
                                    @page {
                                        size: 210mm 330mm;
                                        margin: 15mm 15mm 20mm 15mm;
                                    }
                                }
                            </style>
                        </head>
                        <body>
                            <div class="text-center space-y-1 mb-6">
                                <h3 class="font-extrabold uppercase" style="margin: 0; font-size: 19px;">BERITA ACARA</h3>
                                <h3 class="font-extrabold uppercase" style="margin: 0 0 8px 0; font-size: 14px;">MONITORING DAN EVALUASI REALISASI ${(activeTipe?.nama || "INFRASTRUKTUR DESA").toUpperCase()}</h3>
                                <p style="margin: 0; font-size: 14px;">Nomor: ${nomorBA || `050/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/412.302/${currentYear}`}</p>
                            </div>

                            <p class="text-justify indent-8 mb-4" style="font-size: 14px;">
                                Pada hari ini ${currentDayName}, tanggal ${currentDayNum} bulan ${currentMonthName} tahun ${currentYear} dari Desa ${targetDesaName} Kecamatan ${targetKecName} telah dilaksanakan Evaluasi Realisasi ${activeTipe?.nama || "Infrastruktur Desa"} oleh Badan Perencanaan Pembangunan Daerah Kabupaten Bojonegoro dengan pelaksanaan Tahun Anggaran ${tahun || '2026'} dengan mekanisme Sumber Dana ${sumberDana} dengan rincian sebagai berikut:
                            </p>

                            <div class="mb-6">
                                <p class="mb-4" style="font-size: 14px;">Daftar rincian segmen ${activeTipe?.nama || "infrastruktur"} desa yang telah terealisasi dan terdigitasi:</p>
                                <table class="w-full border-collapse" style="border: 1px solid black; text-align: left;">
                                    <thead>
                                        <tr class="bg-gray-100 font-bold">
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 30px;">No</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 45px;">Kode Master</th>
                                            <th style="border: 1px solid black; padding: 6px; width: 140px;">Nama Objek / Ruas (${activeTipe?.nama || "Infrastruktur"})</th>
                                            <th style="border: 1px solid black; padding: 6px; width: 140px;">Koordinat (Awal - Akhir)</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 80px;">Kategori Spasial</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: right; width: 60px;">Panjang (m)</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 40px;">Lebar (m)</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 50px;">Material / Perkerasan</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 50px;">Kondisi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${rowsHtml}
                                    </tbody>
                                    <tfoot>
                                        ${rencanaPanjang ? `
                                        <tr class="bg-gray-50 font-bold">
                                            <td colspan="5" style="border: 1px solid black; padding: 6px; text-align: right;">Total Panjang Perencanaan:</td>
                                            <td style="border: 1px solid black; padding: 6px; text-align: right;">
                                                ${parseFloat(rencanaPanjang).toFixed(2)}
                                            </td>
                                            <td colspan="3" style="border: 1px solid black; padding: 6px; background-color: #f3f4f6;"></td>
                                        </tr>
                                        ` : ''}
                                        <tr class="bg-gray-50 font-bold">
                                            <td colspan="5" style="border: 1px solid black; padding: 6px; text-align: right;">Total Panjang Segmen Terdigitasi:</td>
                                            <td style="border: 1px solid black; padding: 6px; text-align: right;">
                                                ${totalLength.toFixed(1)}
                                            </td>
                                            <td colspan="3" style="border: 1px solid black; padding: 6px; background-color: #f3f4f6;"></td>
                                        </tr>
                                        ${rencanaPanjang ? `
                                        <tr class="bg-gray-50 font-bold">
                                            <td colspan="5" style="border: 1px solid black; padding: 6px; text-align: right;">Persentase Realisasi:</td>
                                            <td style="border: 1px solid black; padding: 6px; text-align: right;">
                                                ${((totalLength / parseFloat(rencanaPanjang)) * 100).toFixed(1)}%
                                            </td>
                                            <td colspan="3" style="border: 1px solid black; padding: 6px; background-color: #f3f4f6;"></td>
                                        </tr>
                                        ` : ''}
                                    </tfoot>
                                </table>
                            </div>

                            <p class="text-justify indent-8 mb-4" style="font-size: 14px;">
                                Demikian berita acara ini dibuat dengan sebenar-benarnya dan dapat dipergunakan sebagaimana mestinya.
                            </p>

                            <div class="grid mt-6">
                                <div class="text-center">
                                    <p style="margin: 0;">&nbsp;</p>
                                    <p style="margin: 0;">&nbsp;</p>
                                    <p class="font-bold" style="margin: 0; font-size: 14px;">Kepala Desa ${targetDesaName}</p>
                                    <p style="margin: 0 0 64px 0;">&nbsp;</p>
                                    <p class="font-bold underline" style="margin: 0; font-size: 14px;">_________________________</p>
                                </div>
                                <div class="text-center">
                                    <p style="margin: 0;">&nbsp;</p>
                                    <p style="margin: 0;">&nbsp;</p>
                                    <p class="font-bold" style="margin: 0; font-size: 14px;">Camat ${targetKecName}</p>
                                    <p style="margin: 0 0 64px 0;">&nbsp;</p>
                                    <p class="font-bold underline" style="margin: 0; font-size: 14px;">_________________________</p>
                                </div>
                                <div class="text-center">
                                    <p style="margin: 0; font-size: 14px;">Bojonegoro, ${formattedPrintDate}</p>
                                    <p style="margin: 0;">&nbsp;</p>
                                    <p class="font-bold" style="margin: 0; font-size: 14px;">Verifikator BAPPEDA</p>
                                    <p style="margin: 0 0 64px 0;">&nbsp;</p>
                                    <p class="font-bold underline" style="margin: 0; font-size: 14px;">${data[0]?.verifikator || "Operator Bappeda"}</p>
                                </div>
                            </div>

                            <div class="print-footer">
                                Dokumen ini dicetak oleh sistem pada tanggal: ${formattedPrintDate} pukul ${formattedPrintTime} WIB
                            </div>

                            ${mapImageSrc ? `
                            <div style="page-break-before: always; text-align: center; padding-top: 10px;">
                                <h3 class="font-bold uppercase" style="font-size: 14px; margin-bottom: 12px;">LAMPIRAN: PETA DIGITASI SEGMEN SPASIAL INFRASTRUKTUR DESA</h3>
                                <div style="width: 100%; aspect-ratio: 16 / 9; overflow: hidden; background-color: #ffffff;">
                                    <img src="${mapImageSrc}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
                                </div>
                                <p style="font-size: 10px; margin-top: 10px; color: #4b5563;">
                                    Peta Realisasi Infrastruktur Desa - Desa ${targetDesaName}, Kecamatan ${targetKecName} - Tahun Anggaran ${tahun}
                                </p>
                                <div style="margin-top: 20px; border: 1px solid #cbd5e1; background-color: #f8fafc; border-radius: 6px; padding: 12px 16px; text-align: justify; font-size: 10px; line-height: 1.5; color: #1e293b;">
                                    <div style="font-weight: bold; font-size: 11px; margin-bottom: 8px; color: #0f172a; text-align: left;">Catatan / Himbauan</div>
                                    <p style="margin: 0 0 6px 0;">
                                        Visualisasi segmen pada aplikasi ini disusun berdasarkan proses digitasi di atas peta (desktop digitizing) menggunakan informasi titik koordinat yang diinput secara manual oleh desa. Data tersebut <strong>bukan</strong> merupakan hasil pengukuran lapangan menggunakan perangkat survei berpresisi tinggi seperti <strong>RTK GNSS</strong> atau <strong>GPS Geodetik</strong>.
                                    </p>
                                    <p style="margin: 0 0 6px 0;">
                                        Oleh karena itu, posisi, panjang, maupun bentuk segmen yang ditampilkan bersifat <strong>indikatif</strong> dan digunakan sebagai media dokumentasi, monitoring, serta pelaporan realisasi pembangunan. Perbedaan posisi atau bentuk segmen terhadap kondisi aktual di lapangan masih dapat terjadi dan bukan menjadi dasar penilaian teknis maupun pengukuran resmi.
                                    </p>
                                    <p style="margin: 0;">
                                        Apabila diperlukan data dengan tingkat akurasi tinggi untuk keperluan teknis, pengukuran, atau penetapan batas, maka harus dilakukan survei lapangan menggunakan metode dan peralatan survei geospasial yang memenuhi standar.
                                    </p>
                                </div>
                            </div>
                            ` : ""}

                            <script>
                                window.onload = function() {
                                    setTimeout(function() {
                                        window.print();
                                        window.close();
                                    }, 500);
                                };
                            </script>
                        </body>
                    </html>
                `);
                printWindow.document.close();
            }

            toast.success("Berita Acara dikirim ke printer!", { id: toastId });
        } catch (err) {
            console.error("Print BA error:", err);
            toast.error("Terjadi kesalahan saat memuat data berita acara", { id: toastId });
        }
    };

    // Digitizing Tool Menubar Component Instance
    const digitizingMenubarContent = (
        <DigitizingToolMenubar
            activeTipe={activeTipe}
            digitizeMode={digitizeMode}
            setDigitizeMode={setDigitizeMode}
            tipeJalanDigitasi={tipeJalanDigitasi}
            setTipeJalanDigitasi={setTipeJalanDigitasi}
            checkMelarosa={checkMelarosa}
            setCheckMelarosa={setCheckMelarosa}
            isDrawing={isDrawing}
            setIsDrawing={setIsDrawing}
            isReshaping={isReshaping}
            isFormOpen={isFormOpen}
            isAttributeDialogOpen={isAttributeDialogOpen}
            sketchPointsCount={sketchPointsCount}
            geomHistory={geomHistory}
            geomRedoStack={geomRedoStack}
            coordsCount={coordsCount}
            drawnCoords={drawnCoords}
            drawSourceRef={drawSourceRef}
            measureSourceRef={measureSourceRef}
            handleRedraw={handleRedraw}
            handleUndoDigitasi={handleUndoDigitasi}
            handleRedoDigitasi={handleRedoDigitasi}
            handleFinishDrawing={handleFinishDrawing}
            handleRotatePolygon={handleRotatePolygon}
            enterReshapeMode={enterReshapeMode}
            startDraw={startDraw}
            removeInteractions={removeInteractions}
            setIsAttributeDialogOpen={setIsAttributeDialogOpen}
            closeForm={closeForm}
        />
    );

    return (
        <>
            <div className="absolute inset-0 flex flex-col overflow-hidden bg-background text-foreground font-sans print:hidden">
                {/* Header */}
                <div className="h-14 border-b border-border bg-card px-4 flex items-center justify-between shrink-0 gap-3">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="flex items-center gap-4 shrink-0">
                            <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-500/20">
                                <MapIcon className="size-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <h1 className="text-xs font-bold tracking-wider uppercase text-foreground/90">
                                        {activeTipe ? `Workspace ${activeTipe.nama}` : "Workspace Infrastruktur"}
                                    </h1>
                                    <span className="hidden md:inline-flex items-center text-[8px] bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded font-black uppercase tracking-wider leading-none">
                                        Digitasi
                                    </span>
                                </div>
                                {/* Breadcrumbs for region */}
                                {activeKecName && activeDesaName ? (
                                    <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground font-semibold mt-0.5 leading-none">
                                        <span>Kec. {activeKecName}</span>
                                        <ChevronRight className="size-2.5 text-muted-foreground/60" />
                                        <span className="text-blue-600 dark:text-blue-400 font-bold">Desa {activeDesaName}</span>
                                    </div>
                                ) : (
                                    <p className="hidden sm:block text-[10px] text-muted-foreground font-medium mt-0.5 leading-none">Pilih wilayah di panel untuk memulai digitasi</p>
                                )}
                                {regionInfo && (
                                    <p className="sm:hidden text-[9px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wide truncate max-w-[150px] mt-0.5 leading-none">
                                        {regionInfo}
                                    </p>
                                )}
                            </div>
                        </div>

                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {isLoading && (
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground mr-1">
                                <Loader2 className="size-3 animate-spin text-indigo-500" />
                                <span className="hidden sm:inline">Sinkronisasi...</span>
                            </div>
                        )}
                        <Button variant="outline" size="sm" onClick={() => setIsHelpOpen(true)} className="h-8 text-xs gap-1.5 rounded-lg border-border/80 hover:bg-muted/50">
                            <HelpCircle className="size-3.5 text-muted-foreground" />
                        </Button>
                    </div>
                </div>

                {/* Workspace split screens */}
                <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
                    {/* Mobile Backdrop — tampil hanya di mobile saat panel terbuka */}
                    {isSidebarOpen && (
                        <div
                            className="fixed inset-0 bg-black/50 z-[39] md:hidden backdrop-blur-[1px]"
                            onClick={() => setIsSidebarOpen(false)}
                            aria-label="Tutup panel"
                        />
                    )}

                    {/* Left Form Panel componentized */}
                    <InfrastrukturPanel
                        tipes={tipes}
                        activeTipe={activeTipe}
                        setActiveTipe={setActiveTipe}
                        className={cn(
                            // === DESKTOP (md ke atas) — sidebar kiri ===
                            "md:relative md:h-full md:transition-all md:duration-300 ease-in-out",
                            // === MOBILE (di bawah md) — bottom sheet ===
                            "fixed inset-x-0 bottom-0 z-40 transition-all duration-300 ease-in-out md:static",
                            isSidebarOpen
                                ? "w-full md:w-96 md:min-w-[384px] md:border-r md:border-border opacity-100 translate-y-0 md:translate-x-0 h-[70vh] md:h-full z-40"
                                : "w-full md:w-0 md:min-w-0 md:border-r-0 opacity-0 translate-y-full md:-translate-x-full pointer-events-none h-[70vh] md:h-full z-40 overflow-hidden"
                        )}
                        drawnCoords={drawnCoords}
                        selectedKec={selectedKec}
                        setSelectedKec={setSelectedKec}
                        selectedDesa={selectedDesa}
                        setSelectedDesa={setSelectedDesa}
                        kecamatanList={kecamatanList}
                        desaList={desaList}
                        onSearchCoordinates={handleSearchCoordinates}
                        onSearchMultiCoordinates={handleSearchMultiCoordinates}
                        onClearSearchPin={handleClearSearchPin}
                        hasSearchPin={hasSearchPin}
                        realisasiList={realisasiList}
                        isFormOpen={isFormOpen}
                        setIsFormOpen={setIsFormOpen}
                        digitizeMode={digitizeMode}
                        setDigitizeMode={setDigitizeMode}
                        tipeJalanDigitasi={tipeJalanDigitasi}
                        setTipeJalanDigitasi={setTipeJalanDigitasi}
                        isDrawing={isDrawing}
                        isReshaping={isReshaping}
                        drawnLength={drawnLength}
                        coordsCount={coordsCount}
                        isSnappingEnabled={isSnappingEnabled}
                        setIsSnappingEnabled={setIsSnappingEnabled}
                        customRoadName={customRoadName}
                        setCustomRoadName={setCustomRoadName}
                        inputPanjang={inputPanjang}
                        setInputPanjang={setInputPanjang}
                        inputLebar={inputLebar}
                        setInputLebar={setInputLebar}
                        handleGenerateDimensionArea={handleGenerateDimensionArea}
                        lebar={lebar}
                        setLebar={setLebar}
                        tahun={tahun}
                        setTahun={setTahun}
                        perkerasan={perkerasan}
                        setPerkerasan={setPerkerasan}
                        kondisi={kondisi}
                        setKondisi={setKondisi}
                        errorMsg={errorMsg}
                        checkMelarosa={checkMelarosa}
                        snappedRoad={snappedRoad}
                        snappedCandidates={snappedCandidates}
                        selectedSnappedRoadId={selectedSnappedRoadId}
                        handleSave={handleSave}
                        closeForm={closeForm}
                        isAttributeDialogOpen={isAttributeDialogOpen}
                        startDraw={startDraw}
                        startAutoTraceMode={startAutoTraceMode}
                        enterReshapeMode={enterReshapeMode}
                        handleRedraw={handleRedraw}
                        handleSelectAlternativeRoad={handleSelectAlternativeRoad}
                        zoomToSegment={zoomToSegment}
                        handleEditGeometryAndAttributes={handleEditGeometryAndAttributes}
                        handleEditAttributesOnly={handleEditAttributesOnly}
                        handleDelete={handleDelete}
                        onHoverSegment={setHoveredSegmentId}
                        isLoading={isLoading}
                        editingSegmentId={editingSegmentId}
                        onPrintBeritaAcara={triggerPrintBeritaAcaraDialog}
                        onToggleSidebar={() => setIsSidebarOpen(v => !v)}
                        selectedTahunFilter={selectedTahunFilter}
                        setSelectedTahunFilter={setSelectedTahunFilter}
                        onZoomToFiltered={zoomToFilteredSegments}
                        onRefreshSegments={() => {
                            if (!selectedDesa) {
                                toast.warning("Silakan pilih wilayah desa terlebih dahulu.");
                                return;
                            }
                            loadDesaData(selectedDesa, activeTipe?.kode, { skipFitBounds: true });
                            toast.success("Daftar segmen realisasi berhasil diperbarui.");
                        }}
                        realisasiEntries={realisasiEntries}
                        selectedRealisasiEntryId={selectedRealisasiEntryIds[0] || ""}
                        onSelectRealisasiEntry={handleToggleRealisasiEntry}
                        onSaveClick={() => setIsAttributeDialogOpen(true)}
                        isYearLocked={isYearLocked}
                        activeSnapshotLaporan={activeSnapshotLaporan}
                        lockedSegmenIds={lockedSegmenIds}
                        handleSplitSegmen={handleStartSplitMode}
                        onKirimDigitasi={(segment) => {
                            setSegmentToKirim(segment);
                            setIsKirimDialogOpen(true);
                        }}
                    />

                    {/* Right Panel: OpenLayers Map Component */}
                    <div className="flex-1 h-full relative flex flex-col min-h-0 select-none">
                        <div ref={mapElement} className="absolute inset-0 w-full h-full z-0 bg-slate-50 dark:bg-slate-950" />

                        <div className="pointer-events-none absolute inset-0 z-20">
                            {isSplitMode && splittingSegment && (
                                <div className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 
                                                bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg
                                                animate-pulse">
                                    <Scissors className="size-3.5" />
                                    <span>Mode Split Aktif — Klik titik pemisah pada segmen "{splittingSegment.nama_jalan}"</span>
                                    <button
                                        onClick={handleCancelSplitMode}
                                        className="ml-2 hover:opacity-70 transition-opacity"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* OpenLayers Layer Info Popup Overlay */}
                        <div ref={popupContainerRef} className="ol-popup-overlay pointer-events-auto z-30 select-none">
                            {activePopupData && (
                                <div className={cn(
                                    "flex flex-col items-center origin-bottom transform-gpu transition-all duration-300 ease-out",
                                    isPopupVisible
                                        ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                                        : "opacity-0 translate-y-3 scale-90 pointer-events-none"
                                )}>
                                    {/* Main Popup Card Container */}
                                    <div className="bg-popover/95 text-popover-foreground border border-border shadow-2xl rounded-2xl p-2.5 w-72 sm:w-80 backdrop-blur-md space-y-2.5 relative">
                                        {activePopupData.selectedLayerIndex === null ? (
                                            /* Step 1: List of Layers found at clicked position */
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="p-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                                            <Layers className="size-3.5" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-[11px] font-semibold text-foreground leading-tight">Layer Terdeteksi</h4>
                                                            <p className="text-[9px] font-medium text-muted-foreground">{activePopupData.layers.length} layer ditemukan di lokasi ini</p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-5 w-5 rounded-md text-muted-foreground hover:text-foreground shrink-0"
                                                        onClick={() => setMapPopupInfo(null)}
                                                    >
                                                        <X className="size-3" />
                                                    </Button>
                                                </div>

                                                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                                                    {activePopupData.layers.map((layerItem, idx) => (
                                                        <button
                                                            key={layerItem.id || idx}
                                                            onClick={() => setMapPopupInfo((prev: any) => prev ? { ...prev, selectedLayerIndex: idx } : null)}
                                                            className="w-full text-left p-1.5 rounded-lg border border-border/70 bg-background/80 hover:bg-muted/80 hover:border-blue-500/40 transition-all flex items-center justify-between group"
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: layerItem.badgeColor || '#3b82f6' }} />
                                                                <div className="min-w-0">
                                                                    <p className="text-[11px] font-semibold text-foreground truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                                        {layerItem.title}
                                                                    </p>
                                                                    <span className="text-[8.5px] font-medium text-muted-foreground uppercase tracking-wider block">
                                                                        {layerItem.layerType}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            /* Step 2: Detailed Layer Info */
                                            (() => {
                                                const selectedLayer = activePopupData.layers[activePopupData.selectedLayerIndex];
                                                if (!selectedLayer) return null;
                                                return (
                                                    <div className="space-y-2">
                                                        <div className="flex items-start justify-between border-b border-border/60 pb-1.5">
                                                            <div className="flex items-start gap-1.5 min-w-0">
                                                                {activePopupData.layers.length > 1 && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-5 w-5 rounded-md text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
                                                                        onClick={() => setMapPopupInfo((prev: any) => prev ? { ...prev, selectedLayerIndex: null } : null)}
                                                                        title="Kembali ke Daftar Layer"
                                                                    >
                                                                        <ChevronLeft className="size-3.5" />
                                                                    </Button>
                                                                )}
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: selectedLayer.badgeColor || '#3b82f6' }} />
                                                                        <span className="text-[8.5px] font-semibold uppercase tracking-wider px-1 py-0.2 rounded bg-muted text-muted-foreground">
                                                                            {selectedLayer.layerType}
                                                                        </span>
                                                                    </div>
                                                                    <h4 className="text-[11px] font-semibold text-foreground truncate mt-0.5 leading-tight">
                                                                        {selectedLayer.title}
                                                                    </h4>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-5 w-5 rounded-md text-muted-foreground hover:text-foreground shrink-0"
                                                                onClick={() => setMapPopupInfo(null)}
                                                            >
                                                                <X className="size-3" />
                                                            </Button>
                                                        </div>

                                                        <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1 divide-y divide-border/30">
                                                            {Object.entries(selectedLayer.properties)
                                                                .filter(([_, val]) => val !== undefined && val !== null && String(val) !== "" && String(val) !== "-")
                                                                .map(([key, val]) => (
                                                                    <div key={key} className="flex items-start justify-between py-0.5 text-[10px] gap-2">
                                                                        <span className="text-muted-foreground font-medium shrink-0">{key}</span>
                                                                        <span className="font-semibold text-foreground text-right break-words max-w-[180px]">{String(val)}</span>
                                                                    </div>
                                                                ))}
                                                        </div>

                                                        {activePopupData.coordinate && (
                                                            <div className="pt-1.5 border-t border-border/60 flex items-center justify-between gap-1.5 text-[9.5px]">
                                                                <span className="text-muted-foreground font-bold uppercase tracking-wider text-[8.5px]">Koordinat</span>
                                                                <div className="flex items-center gap-1 min-w-0">
                                                                    <code className="font-mono font-bold bg-muted/60 px-1.5 py-0.5 rounded border border-border/60 text-blue-600 dark:text-blue-400 truncate">
                                                                        {toLonLat(activePopupData.coordinate)[1].toFixed(6)}, {toLonLat(activePopupData.coordinate)[0].toFixed(6)}
                                                                    </code>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-5 w-5 rounded text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 shrink-0"
                                                                                onClick={() => {
                                                                                    const lonLat = toLonLat(activePopupData.coordinate);
                                                                                    const coordText = `${lonLat[1].toFixed(6)}, ${lonLat[0].toFixed(6)}`;
                                                                                    navigator.clipboard.writeText(coordText);
                                                                                    toast.success(`Koordinat disalin: ${coordText}`);
                                                                                }}
                                                                            >
                                                                                <Copy className="size-3" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top" className="text-[10px] py-1 px-2">
                                                                            Salin Koordinat
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="pt-1.5 flex items-center justify-end gap-1 border-t border-border/60">
                                                            {selectedLayer.feature && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        const extent = selectedLayer.feature?.getGeometry()?.getExtent();
                                                                        if (extent && mapRef.current) {
                                                                            mapRef.current.getView().fit(extent, { padding: [60, 60, 60, 60], duration: 500 });
                                                                        }
                                                                    }}
                                                                    className="h-6 text-[9.5px] font-semibold gap-1 rounded-md border-border px-2"
                                                                >
                                                                    <Crosshair className="size-3" />
                                                                    Zoom To
                                                                </Button>
                                                            )}
                                                            {selectedLayer.realisasiSegment && (() => {
                                                                 const segId = selectedLayer.realisasiSegment!.id;
                                                                 const segStatus = (selectedLayer.realisasiSegment as any).status_verifikasi;
                                                                 const isBoundToBa = !!(lockedSegmenIds && lockedSegmenIds.has(segId.toString()));
                                                                 const isBaFinal = segStatus === "terverifikasi" && isBoundToBa;
                                                                 const isBappedaOrAdmin = user?.role === 'operator_bappeda' || user?.role === 'super_admin' || user?.role === 'admin';
                                                                 const isLocked = isBaFinal || (!isBappedaOrAdmin && (segStatus === 'verifikasi_bappeda' || segStatus === 'terverifikasi'));

                                                                 return (
                                                                     <>
                                                                         <Button
                                                                             size="sm"
                                                                             variant="secondary"
                                                                             onClick={() => {
                                                                                 handleShowSegmentDetail(selectedLayer.realisasiSegment!);
                                                                                 setMapPopupInfo(null);
                                                                             }}
                                                                             className="h-6 text-[9.5px] font-semibold gap-1 rounded-md px-2"
                                                                         >
                                                                             <Info className="size-3 text-blue-500" />
                                                                             Detail
                                                                         </Button>
                                                                         {!isLocked && (
                                                                             <Button
                                                                                 size="sm"
                                                                                 onClick={() => {
                                                                                     handleEditGeometryAndAttributes(selectedLayer.realisasiSegment!);
                                                                                     setMapPopupInfo(null);
                                                                                 }}
                                                                                 className="h-6 text-[9.5px] font-semibold gap-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow-xs px-2"
                                                                             >
                                                                                 <Edit3 className="size-3" />
                                                                                 Edit
                                                                             </Button>
                                                                         )}
                                                                     </>
                                                                 );
                                                             })()}
                                                        </div>
                                                    </div>
                                                );
                                            })()
                                        )}
                                    </div>

                                    {/* Thick Vertical Dotted Pointer Line & Pulsing Target Point Indicator */}
                                    <div className="flex flex-col items-center relative z-20 shrink-0 pointer-events-none">
                                        <div className="w-0 h-6 border-l-[3px] border-dotted border-blue-600 dark:border-blue-400 shadow-sm" />
                                        <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900 shadow-md animate-ping absolute -bottom-0.5" />
                                        <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900 shadow-md" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Floating Show/Hide Infrastruktur Panel Button on Map Canvas */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    onClick={() => setIsSidebarOpen(prev => !prev)}
                                    className="absolute top-4 left-4 z-30 h-10 w-10 rounded-xl border border-border bg-card dark:bg-slate-900 shadow-md hover:bg-muted dark:hover:bg-slate-800 text-foreground transition-all duration-200 cursor-pointer pointer-events-auto active:scale-95"
                                >
                                    {isSidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="text-xs font-semibold">
                                {isSidebarOpen ? "Sembunyikan Panel Infrastruktur" : "Tampilkan Panel Infrastruktur"}
                            </TooltipContent>
                        </Tooltip>

                        {/* Floating Vertical QGIS-Style Digitizing Tool Menubar on Map (diletakkan di bawah tombol show hide panel) */}
                        {((isFormOpen || isDrawing || isReshaping || digitizeMode === "dimensions" || drawnCoords.length > 0 || coordsCount > 0) && !isAttributeDialogOpen) && (
                            <div className="absolute top-16 left-4 z-30 transition-all duration-300 ease-in-out pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
                                {digitizingMenubarContent}
                            </div>
                        )}





                        {/* Right Panel: Panel Spasial (Katalog, Layer, Acuan) */}
                        <div className={cn(
                            "absolute top-0 bottom-0 right-0 w-full sm:w-[380px] max-w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-2xl border-l border-slate-200 dark:border-slate-800 transition-all duration-300 z-30 flex flex-col overflow-hidden",
                            isRightPanelOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
                        )}>
                            {/* Header */}
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    {activeRightTab === "pengukuran" ? (
                                        <>
                                            <Ruler className="h-4 w-4 text-blue-500" />
                                            Alat Pengukuran
                                        </>
                                    ) : (
                                        <>
                                            <Layers className="h-4 w-4 text-blue-500" />
                                            Manajemen Layer
                                        </>
                                    )}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsRightPanelOpen(false)}
                                    className="h-8 w-8 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
                                >
                                    <X size={16} />
                                </Button>
                            </div>

                            <Tabs value={activeRightTab} onValueChange={setActiveRightTab} className="flex-1 flex flex-col min-h-0 gap-0">
                                <div className="bg-white dark:bg-slate-950 border-b dark:border-slate-800 px-2 py-2 shrink-0">
                                    <TabsList className="w-full grid h-9 grid-cols-4">
                                        <TabsTrigger value="katalog" className="text-[9px] uppercase font-bold tracking-tight">Katalog</TabsTrigger>
                                        <TabsTrigger value="layers" className="text-[9px] uppercase font-bold tracking-tight">
                                            Layer
                                            {activeOverlays.length > 0 && (
                                                <span className="ml-1 px-1.5 py-0.2 text-[8px] bg-blue-100 text-blue-700 rounded-full font-black">
                                                    {activeOverlays.length}
                                                </span>
                                            )}
                                        </TabsTrigger>
                                        <TabsTrigger value="acuan" className="text-[9px] uppercase font-bold tracking-tight">Acuan</TabsTrigger>
                                        <TabsTrigger value="pengukuran" className="text-[9px] uppercase font-bold tracking-tight">Ukur</TabsTrigger>
                                    </TabsList>
                                </div>

                                {/* Tab Content: Katalog & Layer (Managed by LayerManagementPanel component) */}
                                {(activeRightTab === "katalog" || activeRightTab === "layers") && (
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
                                )}

                                {/* Tab Content: Acuan Spasial (Realisasi & references) */}
                                {activeRightTab === "acuan" && (
                                    <TabsContent value="acuan" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden bg-white dark:bg-slate-950/50">
                                        <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-2 bg-slate-50/50 dark:bg-slate-900/50">
                                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Kontrol Visibilitas Layer</span>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Tampilkan atau sembunyikan layer rujukan realisasi infrastruktur.</p>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50">
                                                    <div className="space-y-0.5">
                                                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Jalan Poros Desa</Label>
                                                        <p className="text-[9px] text-slate-500 dark:text-slate-400">Garis as jalan utama desa rujukan</p>
                                                    </div>
                                                    <Switch
                                                        checked={showOfficialOverlay}
                                                        onCheckedChange={setShowOfficialOverlay}
                                                        className="data-[state=checked]:bg-blue-600 scale-75"
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50">
                                                    <div className="space-y-0.5">
                                                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Acuan Laporan Realisasi</Label>
                                                        <p className="text-[9px] text-slate-500 dark:text-slate-400">Marker & garis laporan yang disetujui</p>
                                                    </div>
                                                    <Switch
                                                        checked={showRealisasiRefOverlay}
                                                        onCheckedChange={setShowRealisasiRefOverlay}
                                                        className="data-[state=checked]:bg-blue-600 scale-75"
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50">
                                                    <div className="space-y-0.5">
                                                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Segmen Realisasi (Eksisting)</Label>
                                                        <p className="text-[9px] text-slate-500 dark:text-slate-400">Seluruh garis hasil digitasi eksisting</p>
                                                    </div>
                                                    <Switch
                                                        checked={showExistingOverlay}
                                                        onCheckedChange={setShowExistingOverlay}
                                                        className="data-[state=checked]:bg-blue-600 scale-75"
                                                    />
                                                </div>
                                            </div>

                                            {/* Label & Visual Style Toggles Section */}
                                            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                                    Label Spasial Segmen
                                                </span>

                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between p-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40">
                                                        <div className="space-y-0.5">
                                                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Patok STA (Stationing)</Label>
                                                            <p className="text-[9px] text-slate-500 dark:text-slate-400">STA 0+000 & titik akhir segmen</p>
                                                        </div>
                                                        <Switch
                                                            checked={showSta}
                                                            onCheckedChange={setShowSta}
                                                            className="data-[state=checked]:bg-blue-600 scale-75"
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-between p-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40">
                                                        <div className="space-y-0.5">
                                                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Tahun Anggaran</Label>
                                                            <p className="text-[9px] text-slate-500 dark:text-slate-400">Label TA 2026 pada segmen</p>
                                                        </div>
                                                        <Switch
                                                            checked={showYearLabel}
                                                            onCheckedChange={setShowYearLabel}
                                                            className="data-[state=checked]:bg-blue-600 scale-75"
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-between p-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40">
                                                        <div className="space-y-0.5">
                                                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Dimensi Segmen</Label>
                                                            <p className="text-[9px] text-slate-500 dark:text-slate-400">Ukuran Panjang x Lebar</p>
                                                        </div>
                                                        <Switch
                                                            checked={showDimensiLabel}
                                                            onCheckedChange={setShowDimensiLabel}
                                                            className="data-[state=checked]:bg-blue-600 scale-75"
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-between p-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40">
                                                        <div className="space-y-0.5">
                                                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Kondisi Segmen</Label>
                                                            <p className="text-[9px] text-slate-500 dark:text-slate-400">Status Baik, Sedang, atau Rusak</p>
                                                        </div>
                                                        <Switch
                                                            checked={showKondisiLabel}
                                                            onCheckedChange={setShowKondisiLabel}
                                                            className="data-[state=checked]:bg-blue-600 scale-75"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">
                                                        Custom Style Peta
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={resetStyles}
                                                        className="h-auto p-0 text-[10px] text-blue-500 hover:text-blue-600 font-semibold gap-1"
                                                    >
                                                        <RotateCcw size={10} />
                                                        Reset Standar
                                                    </Button>
                                                </div>

                                                <Accordion type="multiple" defaultValue={["poros", "lingkungan", "kabupaten", "batas", "utama", "marker"]} className="w-full space-y-1">
                                                    {/* 1. Jalan Segmen Poros */}
                                                    <AccordionItem value="poros" className="border-b border-slate-100 dark:border-slate-800">
                                                        <AccordionTrigger className="text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:no-underline py-2">
                                                            <span className="flex items-center gap-1.5">
                                                                <span className="w-1.5 h-3 bg-green-500 rounded-sm" />
                                                                Jalan Segmen Desa (Ruas Poros)
                                                            </span>
                                                        </AccordionTrigger>
                                                        <AccordionContent className="pb-3 pt-1 space-y-2">
                                                            <div className="space-y-2 bg-slate-50/50 dark:bg-slate-900/30 p-2 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                                                {[
                                                                    { key: 'jalan_desa_baik', label: 'Poros - Baik', defaultColor: '#22c55e' },
                                                                    { key: 'jalan_desa_sedang', label: 'Poros - Sedang', defaultColor: '#f59e0b' },
                                                                    { key: 'jalan_desa_rusak', label: 'Poros - Rusak', defaultColor: '#ef4444' }
                                                                ].map((item) => {
                                                                    const style = customStyles[item.key] || { color: item.defaultColor, width: 5 };
                                                                    return (
                                                                        <div key={item.key} className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                                                                            <div className="flex-1 min-w-0">
                                                                                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-350 block truncate">{item.label}</span>
                                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                                    <div className="w-8 h-1 rounded" style={{ backgroundColor: style.color }} />
                                                                                    <span className="text-[8px] font-mono text-slate-400 font-bold">{style.color} ({style.width}px)</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                                <input
                                                                                    type="color"
                                                                                    value={style.color}
                                                                                    onChange={(e) => updateStyle(item.key, 'color', e.target.value)}
                                                                                    className="w-4 h-4 rounded cursor-pointer border border-slate-200 dark:border-slate-800 bg-transparent p-0"
                                                                                />
                                                                                <input
                                                                                    type="number"
                                                                                    min="1"
                                                                                    max="12"
                                                                                    value={style.width}
                                                                                    onChange={(e) => updateStyle(item.key, 'width', parseInt(e.target.value, 10) || 1)}
                                                                                    className="w-8 h-5 text-[9px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-center font-bold"
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
                                                            <div className="space-y-2 bg-slate-50/50 dark:bg-slate-900/30 p-2 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                                                {[
                                                                    { key: 'jalan_lingkungan_baik', label: 'Lingkungan - Baik', defaultColor: '#22c55e' },
                                                                    { key: 'jalan_lingkungan_sedang', label: 'Lingkungan - Sedang', defaultColor: '#f59e0b' },
                                                                    { key: 'jalan_lingkungan_rusak', label: 'Lingkungan - Rusak', defaultColor: '#ef4444' }
                                                                ].map((item) => {
                                                                    const style = customStyles[item.key] || { color: item.defaultColor, width: 5 };
                                                                    return (
                                                                        <div key={item.key} className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                                                                            <div className="flex-1 min-w-0">
                                                                                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-355 block truncate">{item.label}</span>
                                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                                    <div className="w-8 h-1 border-t border-dashed" style={{ borderColor: style.color }} />
                                                                                    <span className="text-[8px] font-mono text-slate-400 font-bold">{style.color} ({style.width}px)</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                                <input
                                                                                    type="color"
                                                                                    value={style.color}
                                                                                    onChange={(e) => updateStyle(item.key, 'color', e.target.value)}
                                                                                    className="w-4 h-4 rounded cursor-pointer border border-slate-200 dark:border-slate-800 bg-transparent p-0"
                                                                                />
                                                                                <input
                                                                                    type="number"
                                                                                    min="1"
                                                                                    max="12"
                                                                                    value={style.width}
                                                                                    onChange={(e) => updateStyle(item.key, 'width', parseInt(e.target.value, 10) || 1)}
                                                                                    className="w-8 h-5 text-[9px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-center font-bold"
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
                                                            <div className="space-y-2 bg-slate-50/50 dark:bg-slate-900/30 p-2 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                                                {[
                                                                    { key: 'jalan_kabupaten_baik', label: 'Kabupaten - Baik (Solid)', defaultColor: '#2563eb', lineDash: 'solid' },
                                                                    { key: 'jalan_kabupaten_sedang', label: 'Kabupaten - Sedang (Solid)', defaultColor: '#60a5fa', lineDash: 'solid' },
                                                                    { key: 'jalan_kabupaten_rusak', label: 'Kabupaten - Rusak (Dashed)', defaultColor: '#60a5fa', lineDash: 'dashed' }
                                                                ].map((item) => {
                                                                    const style = customStyles[item.key] || { color: item.defaultColor, width: 5 };
                                                                    return (
                                                                        <div key={item.key} className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                                                                            <div className="flex-1 min-w-0">
                                                                                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-350 block truncate">{item.label}</span>
                                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                                    <div className={`w-8 h-1 ${item.lineDash === 'dashed' ? 'border-t border-dashed' : 'rounded'}`} style={{ backgroundColor: item.lineDash === 'solid' ? style.color : undefined, borderColor: item.lineDash === 'dashed' ? style.color : undefined }} />
                                                                                    <span className="text-[8px] font-mono text-slate-400 font-bold">{style.color} ({style.width}px)</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                                <input
                                                                                    type="color"
                                                                                    value={style.color}
                                                                                    onChange={(e) => updateStyle(item.key, 'color', e.target.value)}
                                                                                    className="w-4 h-4 rounded cursor-pointer border border-slate-200 dark:border-slate-800 bg-transparent p-0"
                                                                                />
                                                                                <input
                                                                                    type="number"
                                                                                    min="1"
                                                                                    max="12"
                                                                                    value={style.width}
                                                                                    onChange={(e) => updateStyle(item.key, 'width', parseInt(e.target.value, 10) || 1)}
                                                                                    className="w-8 h-5 text-[9px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-center font-bold"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </AccordionContent>
                                                    </AccordionItem>

                                                    {/* 4. Batas Desa */}
                                                    <AccordionItem value="batas" className="border-b border-slate-100 dark:border-slate-800">
                                                        <AccordionTrigger className="text-[11px] font-bold text-slate-700 dark:text-slate-330 hover:no-underline py-2">
                                                            <span className="flex items-center gap-1.5">
                                                                <span className="w-1.5 h-3 bg-orange-500 rounded-sm" />
                                                                Batas Administrasi Desa
                                                            </span>
                                                        </AccordionTrigger>
                                                        <AccordionContent className="pb-3 pt-1 space-y-2">
                                                            <div className="bg-slate-50/50 dark:bg-slate-900/30 p-2 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                                                {(() => {
                                                                    const style = customStyles['batas_desa'] || { color: '#f97316', width: 2 };
                                                                    return (
                                                                        <div className="flex items-center justify-between gap-2 p-2 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                                                            <div className="flex-1 min-w-0">
                                                                                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-350 block">Batas Desa / Kelurahan</span>
                                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                                    <div className="w-8 h-3 rounded border border-dashed bg-orange-500/5" style={{ borderColor: style.color, backgroundColor: `${style.color}0d` }} />
                                                                                    <span className="text-[8px] font-mono text-slate-400 font-bold">{style.color} ({style.width}px)</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                                <input
                                                                                    type="color"
                                                                                    value={style.color}
                                                                                    onChange={(e) => updateStyle('batas_desa', 'color', e.target.value)}
                                                                                    className="w-4 h-4 rounded cursor-pointer border border-slate-200 dark:border-slate-800 bg-transparent p-0"
                                                                                />
                                                                                <input
                                                                                    type="number"
                                                                                    min="1"
                                                                                    max="8"
                                                                                    value={style.width}
                                                                                    onChange={(e) => updateStyle('batas_desa', 'width', parseInt(e.target.value, 10) || 1)}
                                                                                    className="w-8 h-5 text-[9px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-center font-bold"
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
                                                        <AccordionTrigger className="text-[11px] font-bold text-slate-700 dark:text-slate-330 hover:no-underline py-2">
                                                            <span className="flex items-center gap-1.5">
                                                                <span className="w-1.5 h-3 bg-blue-600 rounded-sm" />
                                                                Jalan Utama (Base)
                                                            </span>
                                                        </AccordionTrigger>
                                                        <AccordionContent className="pb-3 pt-1 space-y-2">
                                                            <div className="bg-slate-50/50 dark:bg-slate-900/30 p-2 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                                                    {(() => {
                                                                        const style = customStyles['jalan_utama'] || { color: '#f97316', width: 2 };
                                                                        return (
                                                                            <div className="flex items-center justify-between gap-2 p-2 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                                                                <div className="flex-1 min-w-0">
                                                                                    <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-350 block">Jalan Utama Kabupaten</span>
                                                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                                                        <div className="w-8 h-1 rounded" style={{ backgroundColor: style.color }} />
                                                                                        <span className="text-[8px] font-mono text-slate-400 font-bold">{style.color} ({style.width}px)</span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                                    <input
                                                                                        type="color"
                                                                                        value={style.color}
                                                                                        onChange={(e) => updateStyle('jalan_utama', 'color', e.target.value)}
                                                                                        className="w-4 h-4 rounded cursor-pointer border border-slate-200 dark:border-slate-800 bg-transparent p-0"
                                                                                    />
                                                                                    <input
                                                                                        type="number"
                                                                                        min="1"
                                                                                        max="8"
                                                                                        value={style.width}
                                                                                        onChange={(e) => updateStyle('jalan_utama', 'width', parseInt(e.target.value, 10) || 1)}
                                                                                        className="w-8 h-5 text-[9px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-center font-bold"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                            </div>
                                                        </AccordionContent>
                                                    </AccordionItem>

                                                    {/* 6. Marker Titik */}
                                                    <AccordionItem value="marker" className="border-0">
                                                        <AccordionTrigger className="text-[11px] font-bold text-slate-700 dark:text-slate-330 hover:no-underline py-2">
                                                            <span className="flex items-center gap-1.5">
                                                                <span className="w-1.5 h-3 bg-sky-600 rounded-sm" />
                                                                Pin Penanda (Marker)
                                                            </span>
                                                        </AccordionTrigger>
                                                        <AccordionContent className="pb-3 pt-1 space-y-2">
                                                            <div className="bg-slate-50/50 dark:bg-slate-900/30 p-2 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                                                {(() => {
                                                                    const style = customStyles['marker_titik'] || { color: '#1e40af', scale: 0.07 };
                                                                    return (
                                                                        <div className="flex items-center justify-between gap-2 p-2 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                                                            <div className="flex-1 min-w-0">
                                                                                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-350 block">Marker / Titik Lokasi</span>
                                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                                    <img src="https://cdn-icons-png.flaticon.com/512/684/684908.png" className="w-3.5 h-3.5 object-contain" alt="pin" style={{ filter: style.color !== '#1e40af' ? `hue-rotate(${Math.floor(Math.random() * 360)}deg)` : undefined }} />
                                                                                    <span className="text-[8px] font-mono text-slate-400 font-bold">{style.color} (Scale: {style.scale})</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                                <input
                                                                                    type="color"
                                                                                    value={style.color}
                                                                                    onChange={(e) => updateStyle('marker_titik', 'color', e.target.value)}
                                                                                    className="w-4 h-4 rounded cursor-pointer border border-slate-200 dark:border-slate-800 bg-transparent p-0"
                                                                                />
                                                                                <input
                                                                                    type="number"
                                                                                    step="0.01"
                                                                                    min="0.02"
                                                                                    max="0.2"
                                                                                    value={style.scale}
                                                                                    onChange={(e) => updateStyle('marker_titik', 'scale', parseFloat(e.target.value) || 0.07)}
                                                                                    className="w-12 h-5 text-[9px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-center font-bold font-mono"
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

                                            {/* Dropdown Selector for reference realisasi report */}
                                            {selectedDesa && showRealisasiRefOverlay && (
                                                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Pilih Acuan Laporan Realisasi</Label>
                                                        {selectedRealisasiEntryIds.length > 0 && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedRealisasiEntryIds([]);
                                                                    if (realisasiRefSourceRef.current) {
                                                                        realisasiRefSourceRef.current.clear();
                                                                    }
                                                                }}
                                                                className="h-auto p-0 text-[10px] text-red-500 hover:text-red-600 font-semibold"
                                                            >
                                                                Sembunyikan Semua
                                                            </Button>
                                                        )}
                                                    </div>

                                                    {realisasiEntries.length === 0 ? (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">Belum ada laporan disetujui</p>
                                                    ) : (
                                                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                                            {realisasiEntries.map((entry) => {
                                                                const isChecked = selectedRealisasiEntryIds.includes(entry.id);
                                                                return (
                                                                    <div
                                                                        key={entry.id}
                                                                        onClick={() => handleToggleRealisasiEntry(entry.id)}
                                                                        className={cn(
                                                                            "flex items-start gap-2.5 p-3 rounded-xl border transition-all cursor-pointer select-none",
                                                                            isChecked
                                                                                ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60 shadow-xs"
                                                                                : "bg-white dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700/80"
                                                                        )}
                                                                    >
                                                                        <Checkbox
                                                                            checked={isChecked}
                                                                            onCheckedChange={() => handleToggleRealisasiEntry(entry.id)}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            className="mt-0.5"
                                                                        />
                                                                        <div className="flex-1 space-y-1.5 min-w-0 text-xs leading-snug">
                                                                            <div>
                                                                                <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                                                                                    {entry.nama_kegiatan}
                                                                                </span>
                                                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                                                                                    Tahun: {entry.form?.tahun_anggaran || entry.created_at?.slice(0, 4) || "N/A"}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex gap-4 text-[10px] text-slate-500 dark:text-slate-450 border-t border-slate-100/50 dark:border-slate-800/30 pt-1.5">
                                                                                <div>
                                                                                    <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Volume</span>
                                                                                    <span>{entry.volume || "-"}</span>
                                                                                </div>
                                                                                <div>
                                                                                    <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Anggaran</span>
                                                                                    <span>
                                                                                        {entry.anggaran ? `Rp ${Number(entry.anggaran).toLocaleString("id-ID")}` : "-"}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            {entry.fungsi_infrastruktur && entry.fungsi_infrastruktur.length > 0 && (
                                                                                <div className="pt-1.5 border-t border-slate-100/50 dark:border-slate-800/30">
                                                                                    <div className="flex flex-wrap gap-1">
                                                                                        {entry.fungsi_infrastruktur.map((f, i) => (
                                                                                            <span key={i} className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100/60 dark:border-indigo-900/40">
                                                                                                {f}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {entry.opsi_konstruksi && entry.opsi_konstruksi.length > 0 && (
                                                                                <div className="pt-1 border-slate-100/50 dark:border-slate-800/30">
                                                                                    <div className="flex flex-wrap gap-1">
                                                                                        {entry.opsi_konstruksi.map((k, i) => (
                                                                                            <span key={i} className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100/60 dark:border-emerald-900/40">
                                                                                                {k}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                )}

                                {/* Tab Content: Pengukuran & Cari Lokasi */}
                                {activeRightTab === "pengukuran" && (
                                    <TabsContent value="pengukuran" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden">
                                        <MeasurementPanel
                                            onStartMeasure={handleStartMeasure}
                                            onClearMeasure={handleClearMeasure}
                                            activeMeasureType={activeMeasureType}
                                            measureResult={measureResult}
                                            onFinishMeasure={handleFinishDrawing}
                                            onRotateMeasure={handleRotateMeasure}
                                            onGenerateDimensionArea={handleGenerateDimensionArea}
                                            isDisabled={isFormOpen}
                                        />
                                    </TabsContent>
                                )}
                            </Tabs>
                        </div>

                        <DetailSegmenPanel
                            isOpen={isDetailPanelOpen}
                            onClose={() => {
                                setIsDetailPanelOpen(false);
                                setSelectedDetailSegment(null);
                                setDetailMasterRoad(null);
                            }}
                            segment={selectedDetailSegment}
                            masterRoad={detailMasterRoad}
                        />

                        {/* Map Layers Panel Button & Measurement Button */}
                        <div className={cn(
                            "absolute top-4 z-20 flex flex-col gap-2 transition-all duration-300",
                            isRightPanelOpen ? "sm:right-[400px] right-4 hidden sm:flex" : "right-4"
                        )}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        onClick={() => {
                                            if (isRightPanelOpen && (activeRightTab === "layers" || activeRightTab === "katalog" || activeRightTab === "acuan")) {
                                                setIsRightPanelOpen(false);
                                            } else {
                                                setIsRightPanelOpen(true);
                                                setActiveRightTab("layers");
                                            }
                                            setIsDetailPanelOpen(false);
                                        }}
                                        className={cn(
                                            "h-10 w-10 md:h-9 md:w-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all duration-300",
                                            isRightPanelOpen && (activeRightTab === "layers" || activeRightTab === "katalog" || activeRightTab === "acuan") && "bg-blue-600 dark:bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white"
                                        )}
                                    >
                                        <Layers className="size-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left">Panel Layer</TooltipContent>
                            </Tooltip>

                            <MapStyleToggle
                                showSta={showSta}
                                setShowSta={setShowSta}
                                showYearLabel={showYearLabel}
                                setShowYearLabel={setShowYearLabel}
                                showDimensiLabel={showDimensiLabel}
                                setShowDimensiLabel={setShowDimensiLabel}
                                showKondisiLabel={showKondisiLabel}
                                setShowKondisiLabel={setShowKondisiLabel}
                            />
                        </div>

                        {/* Floating Basemap Switcher */}
                        <BasemapToggle
                            basemaps={basemapsList}
                            activeBasemap={activeBasemap}
                            onBasemapChange={setActiveBasemap}
                            className={cn(
                                "absolute transition-[right] duration-300 z-20",
                                isRightPanelOpen ? "bottom-4 right-4 sm:right-[400px]" : "bottom-4 right-4"
                            )}
                        />
                    </div>
                    {/* Dialog Konfirmasi Split Segmen */}
                    <SplitConfirmDialog
                        open={showSplitConfirmDialog && !!splittingSegment && !!splitPreviewCoords}
                        splittingSegment={splittingSegment}
                        splitPreviewCoords={splitPreviewCoords}
                        onConfirm={handleConfirmSplit}
                        onCancel={handleCancelSplitMode}
                    />
                    <Dialog open={isAttributeDialogOpen} onOpenChange={setIsAttributeDialogOpen} modal={false}>
                        <DialogContent
                            ref={dialogRef}
                            hideOverlay
                            showCloseButton={false}
                            onPointerDownOutside={(e) => e.preventDefault()}
                            onInteractOutside={(e) => e.preventDefault()}
                            className="fixed z-50 w-[95vw] sm:w-[580px] max-h-[85vh] flex flex-col p-0 gap-0 bg-popover/95 backdrop-blur-md border border-border/80 rounded-2xl shadow-2xl overflow-hidden"
                            style={{
                                top: "50%",
                                left: "50%",
                                translate: `calc(-50% + ${dialogPos.x}px) calc(-50% + ${dialogPos.y}px)`,
                                willChange: isDraggingDialog ? "translate" : "auto"
                            } as React.CSSProperties}
                        >
                            <div
                                onMouseDown={handleMouseDownHeader}
                                onTouchStart={handleTouchStartHeader}
                                className="px-5 py-3.5 border-b border-border/80 bg-muted/40 shrink-0 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
                                title="Klik dan tahan untuk memindahkan dialog ini di peta"
                            >
                                <div className="flex items-center gap-2">
                                    <GripHorizontal className="size-4.5 text-muted-foreground/70 shrink-0" />
                                    <div>
                                        <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                                            <Sparkles className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                            <span>{editingSegmentId ? "Edit Atribut Segmen Realisasi" : "Lengkapi Atribut Segmen Realisasi"}</span>
                                        </h3>
                                        <p className="text-[10.5px] text-muted-foreground mt-0.5">
                                            Atribut detail segmen • <span className="font-semibold text-blue-600 dark:text-blue-400">Dapat digeser pada peta</span>
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setIsAttributeDialogOpen(false);
                                    }}
                                    className="size-7 rounded-lg text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                                >
                                    <X className="size-4" />
                                </Button>
                            </div>

                            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar">
                                    {editingSegmentId && lockedSegmenIds.has(editingSegmentId.toString()) && (
                                        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-300 text-xs flex items-center gap-2.5 shadow-xs">
                                            <Lock className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                            <div>
                                                <span className="font-bold block text-amber-950 dark:text-amber-200">Segmen Terikat Berita Acara Final</span>
                                                <span className="text-[11px] opacity-90 block leading-tight mt-0.5">Geometri spasial segmen ini dikunci (read-only), namun Anda tetap dapat memperbarui informasi atribut data di bawah ini.</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* snappedRoad or customRoadName */}
                                    {isBappedaOrAdmin && checkMelarosa && snappedRoad ? (
                                        <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-emerald-650 dark:text-emerald-400 uppercase tracking-wider block">
                                                    {activeTipe ? `Nama ${activeTipe.nama} Ter-snap:` : "Ruas Ter-snap:"}
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleInteractiveRelinkToMaster}
                                                        className="h-5 px-2 text-[10px] font-bold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-md transition-colors"
                                                        title="Hubungkan atau update penambatan ke data master terdekat"
                                                    >
                                                        <Link2 className="size-3 text-blue-500 mr-1 inline" />
                                                        Hubungkan Master
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            const prevName = snappedRoad?.nama || customRoadName;
                                                            setCustomRoadName(prevName);
                                                            setCheckMelarosa(false);
                                                            setSnappedRoad(null);
                                                            toast.info("Relasi master dilepas (status_parent = false, parent_id = null). Klik 'Simpan Segmen' untuk menyimpan perubahan ke database.");
                                                        }}
                                                        className="h-5 px-2 text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-md transition-colors"
                                                        title="Lepas keterikatan parent_id dari master infrastruktur"
                                                    >
                                                        <Unlink className="size-3 text-rose-500 mr-1 inline" />
                                                        Lepas Master
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 font-bold text-foreground">
                                                <PinIcon className="size-3.5 text-emerald-500" />
                                                <span>{snappedRoad?.nama}</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3 mt-1.5 pt-1.5 border-t border-emerald-500/20 text-[11px]">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-muted-foreground font-semibold">Kode Ruas:</span>
                                                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                        {snappedRoad?.kode_ruas || editingSegmentData?.kode_ruas || "(Tanpa Kode)"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-muted-foreground font-semibold">ID Master (parent_id):</span>
                                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-500/10 px-2 py-0.5 rounded border border-slate-500/20">
                                                        {snappedRoad?.id && snappedRoad.id !== "Master" && snappedRoad.id !== "0" ? snappedRoad.id : (editingSegmentData?.parent_id || "(Belum Terhubung)")}
                                                    </span>
                                                </div>
                                            </div>
                                            {snappedCandidates.length > 1 && (
                                                <div className="space-y-1.5 mt-2 pt-2 border-t border-emerald-500/20">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                                                            <span>🔀 Pilih Ruas Master (Ditemukan {snappedCandidates.length} di Persimpangan):</span>
                                                        </Label>
                                                    </div>
                                                    <Select
                                                        value={snappedRoad?.id || ""}
                                                        onValueChange={(selectedId) => {
                                                            const found = snappedCandidates.find(c => c.id === selectedId);
                                                            if (found) {
                                                                setSnappedRoad(found);
                                                                setCustomRoadName(found.nama);
                                                                toast.success(`Pilihan master diubah ke Kode Ruas [${found.kode_ruas || found.id}]: ${found.nama}`);
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger className="w-full h-9 text-xs bg-background border-emerald-500/40 rounded-xl font-medium shadow-xs">
                                                            <SelectValue placeholder="Pilih Ruas Master Rujukan" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-popover border-border z-[100] max-h-[220px]">
                                                            {snappedCandidates.map((cand) => (
                                                                <SelectItem key={cand.id} value={cand.id} className="text-xs py-2 cursor-pointer">
                                                                    <div className="flex flex-col gap-0.5 text-left">
                                                                        <div className="flex items-center gap-1.5 font-bold">
                                                                            <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded font-mono text-xs font-bold border border-emerald-500/30">
                                                                                Kode: {cand.kode_ruas || "(Tanpa Kode)"}
                                                                            </span>
                                                                            <span className="text-foreground truncate max-w-[280px]">{cand.nama}</span>
                                                                        </div>
                                                                        <span className="text-[10px] text-muted-foreground">
                                                                            ID Master (parent_id): <code className="font-mono font-semibold">{cand.id}</code> • Jarak: {cand.dist}m
                                                                        </span>
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                            {(!snappedRoad?.id || snappedRoad.id === "Master" || snappedRoad.id === "0" || snappedRoad.id === "null") && (
                                                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-amber-500/20 bg-amber-500/10 p-2.5 rounded-lg text-amber-900 dark:text-amber-300">
                                                    <span className="text-[10.5px] font-bold">⚠️ status_parent true namun parent_id belum terhubung!</span>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={handleInteractiveRelinkToMaster}
                                                        className="h-6 px-2 text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors shrink-0"
                                                    >
                                                        <Link2 className="size-3 mr-1 inline" />
                                                        Hubungkan Otomatis
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-semibold text-foreground/80 dark:text-slate-300 block">
                                                    {activeTipe ? `Nama ${activeTipe.nama} (namobj)` : "Nama Objek Infrastruktur (namobj)"}
                                                </Label>
                                                {isBappedaOrAdmin && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleInteractiveRelinkToMaster}
                                                        className="h-6 px-2 text-[10px] font-semibold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg flex items-center gap-1"
                                                        title="Cek ulang apakah geometri segmen ini menyentuh data master infrastruktur"
                                                    >
                                                        <Link2 className="size-3 text-blue-500" />
                                                        Hubungkan ke Master Terdekat
                                                    </Button>
                                                )}
                                            </div>
                                            <Input
                                                placeholder={
                                                    activeTipe?.kode === 'jembatan' ? "Contoh: Jembatan Kedungadem / Jembatan Krajan" :
                                                        activeTipe?.kode === 'drainase' ? "Contoh: Saluran Drainase Utama RT 03" :
                                                            activeTipe?.kode === 'penerangan' ? "Contoh: Penerangan Jalan Poros Sraten" :
                                                                "Contoh: Nama Ruas / Nama Objek Infrastruktur"
                                                }
                                                value={customRoadName}
                                                onChange={e => setCustomRoadName(e.target.value)}
                                                className="h-9.5 bg-background border-input text-xs rounded-xl text-foreground focus:border-blue-500"
                                                required
                                            />
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-foreground/80 dark:text-slate-300 block">Kode Ruas</Label>
                                            <Input
                                                value={
                                                    snappedRoad?.kode_ruas || editingSegmentData?.kode_ruas || "0"
                                                }
                                                readOnly
                                                className="h-9.5 bg-muted/50 font-mono font-bold text-xs rounded-xl border-input text-foreground cursor-not-allowed"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-foreground/80 dark:text-slate-300 block">
                                                {activeTipe?.geom_type?.toUpperCase() === 'POLYGON' || activeTipe?.geom_type?.toUpperCase() === 'MULTIPOLYGON' ? "Dimensi / Panjang (Meter)" : "Panjang Segmen (Meter)"}
                                            </Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={drawnLength || editingSegmentData?.panjang_m || ""}
                                                onChange={e => {
                                                    const val = parseFloat(e.target.value);
                                                    setDrawnLength(isNaN(val) ? 0 : val);
                                                }}
                                                className="h-9.5 bg-background font-mono font-bold text-xs rounded-xl border-input text-foreground focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-foreground/80 dark:text-slate-300 block">Lebar (Meter)</Label>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                value={lebar}
                                                onChange={e => setLebar(e.target.value)}
                                                className="h-9.5 bg-background border-input text-xs rounded-xl"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-foreground/80 dark:text-slate-300 block">Tahun Anggaran</Label>
                                            <Input
                                                type="number"
                                                value={tahun}
                                                onChange={e => setTahun(e.target.value)}
                                                className="h-9.5 bg-background border-input text-xs rounded-xl"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-foreground/80 dark:text-slate-300 block">Kondisi Realisasi</Label>
                                            <Select value={kondisi || undefined} onValueChange={setKondisi}>
                                                <SelectTrigger className="w-full h-9.5 text-xs bg-background border-input rounded-xl">
                                                    <SelectValue placeholder="Pilih Kondisi Realisasi" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-popover border-border">
                                                    {["baik", "sedang", "rusak ringan", "rusak berat"].map(k => (
                                                        <SelectItem key={k} value={k}>{k}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-foreground/80 dark:text-slate-300 block">Status Kondisi</Label>
                                            <Select value={statusKondisi || undefined} onValueChange={setStatusKondisi}>
                                                <SelectTrigger className="w-full h-9.5 text-xs bg-background border-input rounded-xl">
                                                    <SelectValue placeholder="Pilih Status Kondisi" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-popover border-border">
                                                    {["Eksisting", "Riwayat"].map(sk => (
                                                        <SelectItem key={sk} value={sk}>{sk}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-foreground/80 dark:text-slate-300 block">Sumber Data</Label>
                                            <Input
                                                value={sumberData}
                                                onChange={e => setSumberData(e.target.value)}
                                                className="h-9.5 bg-background border-input text-xs rounded-xl"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-foreground/80 dark:text-slate-300 block">Sumber Dana</Label>
                                            <Select value={sumberDana || undefined} onValueChange={setSumberDana}>
                                                <SelectTrigger className="w-full h-9.5 text-xs bg-background border-input rounded-xl">
                                                    <SelectValue placeholder="Pilih Sumber Dana" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-popover border-border">
                                                    {(activeTipe?.config?.attributes?.find((a: any) => a.key === 'sumber_dana')?.options || ["BKK", "DD", "ADD", "APBD", "Lainnya"]).map((sd: string) => (
                                                        <SelectItem key={sd} value={sd}>{sd}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center h-5">
                                                <Label className="text-xs font-semibold text-foreground/80 dark:text-slate-300 whitespace-nowrap">Status Aset</Label>
                                            </div>
                                            <Select
                                                value={
                                                    statusAset === "Pemerintah Desa" || statusAset === "Pemerintah Kabupaten"
                                                        ? statusAset
                                                        : "custom"
                                                }
                                                onValueChange={(val) => {
                                                    if (val === "custom") {
                                                        setStatusAset("");
                                                    } else {
                                                        setStatusAset(val);
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="w-full h-9.5 text-xs bg-background border-input rounded-xl focus:ring-1 focus:ring-blue-500">
                                                    <SelectValue placeholder="Pilih Status Aset" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-popover border-border">
                                                    <SelectItem value="Pemerintah Desa">Pemerintah Desa</SelectItem>
                                                    <SelectItem value="Pemerintah Kabupaten">Pemerintah Kabupaten</SelectItem>
                                                    <SelectItem value="custom">Custom (Ketik Manual)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {statusAset !== "Pemerintah Desa" && statusAset !== "Pemerintah Kabupaten" && (
                                                <Input
                                                    type="text"
                                                    placeholder="Ketik status aset manual..."
                                                    value={statusAset}
                                                    onChange={(e) => setStatusAset(e.target.value)}
                                                    className="h-9.5 text-xs bg-background border-input rounded-xl mt-1.5 focus:border-blue-500 animate-in fade-in-50 duration-200"
                                                />
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between gap-1.5 h-5">
                                                <Label className="text-xs font-semibold text-foreground/80 dark:text-slate-300 whitespace-nowrap shrink-0">Plotting Anggaran</Label>
                                                {plottingId ? (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setPlottingId("")}
                                                        className="h-5 px-1.5 text-[10px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold gap-1 rounded shrink-0"
                                                        title="Hapus keterikatan plotting anggaran (Jadikan Non-Plotting / Aset Eksisting)"
                                                    >
                                                        <X className="size-3" />
                                                        Hapus Plotting
                                                    </Button>
                                                ) : (
                                                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap truncate max-w-[150px]" title="Non-Plotting (Aset/Kewenangan)">
                                                        Non-Plotting
                                                    </span>
                                                )}
                                            </div>
                                            <Combobox
                                                options={plottingOptions}
                                                value={plottingId}
                                                onSelect={(val) => setPlottingId(val)}
                                                placeholder={isLoadingPlotting ? "Memuat..." : (plottingOptions.length > 0 ? "Pilih Plotting..." : "Tidak ada data")}
                                                emptyText="Data plotting tidak ditemukan"
                                                className="w-full"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-foreground/80 dark:text-slate-300 block">Verifikator (User Login)</Label>
                                        <Input
                                            value={currentUserName}
                                            readOnly
                                            className="h-9.5 bg-muted text-muted-foreground font-semibold text-xs rounded-xl cursor-not-allowed"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-foreground/80 dark:text-slate-300 block">Keterangan</Label>
                                        <textarea
                                            value={keterangan}
                                            onChange={e => setKeterangan(e.target.value)}
                                            placeholder="Tulis keterangan tambahan..."
                                            className="w-full min-h-[70px] bg-background border border-input text-xs rounded-xl p-3 text-foreground focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>

                                    {/* Dynamic JSONB Attributes based on activeTipe.config.attributes */}
                                    {activeTipe?.config?.attributes && Array.isArray(activeTipe.config.attributes) && (
                                        (() => {
                                            const excludedKeys = [
                                                'namobj', 'nama_jalan', 'id', 'geom', 'parent_id', 'tipe_kode',
                                                'panjang', 'lebar', 'kondisi', 'status_kondisi', 'tahun_pembangunan',
                                                'sumber_dana', 'keterangan', 'foto_url', 'desa', 'kecamatan',
                                                'id_desa', 'id_kecamatan', 'created_at', 'updated_at', 'kode_ruas',
                                                'plotting_id', 'verifikator', 'user_id', 'sumber_data'
                                            ];
                                            const customAttrs = activeTipe.config.attributes.filter(
                                                (attr: any) => attr.key && !excludedKeys.includes(attr.key)
                                            );
                                            if (customAttrs.length === 0) return null;

                                            return (
                                                <div className="space-y-3.5 pt-3 border-t border-border/60">
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                                                        <Sparkles className="size-3.5 text-blue-500" />
                                                        <span>Atribut Dinamis ({activeTipe.nama})</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                                        {customAttrs.map((attr: any) => {
                                                            const val = dynamicAtribut[attr.key] !== undefined ? dynamicAtribut[attr.key] : (attr.defaultValue ?? "");
                                                            const isFullWidth = attr.type === 'textarea' || (attr.type === 'text' && attr.label && attr.label.length > 25);

                                                            const handleAttrChange = (newVal: any) => {
                                                                setDynamicAtribut(prev => ({ ...prev, [attr.key]: newVal }));
                                                                if (attr.key === 'jenis_perkerasan') setPerkerasan(newVal);
                                                                if (attr.key === 'status_jalan') setStatusJalan(newVal);
                                                            };

                                                            return (
                                                                <div key={attr.key} className={cn("space-y-1.5", isFullWidth && "sm:col-span-2")}>
                                                                    <Label className="text-xs font-semibold text-foreground/80 dark:text-slate-300 block">
                                                                        {attr.label || attr.key}
                                                                        {attr.required && <span className="text-rose-500 ml-0.5">*</span>}
                                                                    </Label>
                                                                    {attr.type === 'select' ? (
                                                                        <Select
                                                                            value={val ? String(val) : undefined}
                                                                            onValueChange={handleAttrChange}
                                                                        >
                                                                            <SelectTrigger className="w-full h-9.5 text-xs bg-background border-input rounded-xl">
                                                                                <SelectValue placeholder={`Pilih ${attr.label || attr.key}`} />
                                                                            </SelectTrigger>
                                                                            <SelectContent className="bg-popover border-border">
                                                                                {(attr.options || []).map((opt: string) => (
                                                                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    ) : attr.type === 'textarea' ? (
                                                                        <textarea
                                                                            value={String(val)}
                                                                            onChange={e => handleAttrChange(e.target.value)}
                                                                            placeholder={`Masukkan ${attr.label}...`}
                                                                            className="w-full min-h-[60px] bg-background border border-input text-xs rounded-xl p-3 text-foreground focus:border-blue-500 focus:outline-none"
                                                                            required={attr.required}
                                                                        />
                                                                    ) : attr.type === 'boolean' ? (
                                                                        <div className="flex items-center gap-2 pt-1">
                                                                            <Switch
                                                                                checked={Boolean(val)}
                                                                                onCheckedChange={(checked) => handleAttrChange(checked)}
                                                                            />
                                                                            <span className="text-xs text-foreground font-medium">{val ? "Ya" : "Tidak"}</span>
                                                                        </div>
                                                                    ) : attr.type === 'number' ? (
                                                                        <Input
                                                                            type="number"
                                                                            step="any"
                                                                            value={val}
                                                                            onChange={e => handleAttrChange(e.target.value !== "" ? Number(e.target.value) : "")}
                                                                            className="h-9.5 bg-background border-input text-xs rounded-xl"
                                                                            required={attr.required}
                                                                        />
                                                                    ) : attr.type === 'date' ? (
                                                                        <Input
                                                                            type="date"
                                                                            value={String(val)}
                                                                            onChange={e => handleAttrChange(e.target.value)}
                                                                            className="h-9.5 bg-background border-input text-xs rounded-xl"
                                                                            required={attr.required}
                                                                        />
                                                                    ) : (
                                                                        <Input
                                                                            type="text"
                                                                            value={String(val)}
                                                                            onChange={e => handleAttrChange(e.target.value)}
                                                                            placeholder={`Masukkan ${attr.label}...`}
                                                                            className="h-9.5 bg-background border-input text-xs rounded-xl"
                                                                            required={attr.required}
                                                                        />
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })()
                                    )}

                                    {errorMsg && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-400 rounded-xl flex items-start gap-2 text-[11px] leading-tight">
                                            <AlertCircle className="size-4 shrink-0 text-red-500 mt-0.5" />
                                            <span>{errorMsg}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="px-6 py-3.5 border-t border-border/80 bg-muted/30 shrink-0 flex flex-row items-center justify-end gap-2.5">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setIsAttributeDialogOpen(false);
                                        }}
                                        className="h-9.5 px-4 text-xs font-semibold rounded-xl border-border hover:bg-muted"
                                    >
                                        Batal
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="h-9.5 px-5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md"
                                    >
                                        Simpan Segmen
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>

                    <PrintDialog
                        open={isPrintDialogOpen}
                        onOpenChange={(open) => {
                            setIsPrintDialogOpen(open);
                            if (!open) resetPrintMapStyles();
                        }}
                        printParams={printParams}
                        printTotalLength={printTotalLength}
                        tipes={tipes}
                        selectedPrintTipeKodes={selectedPrintTipeKodes}
                        onSelectAllTipes={() => {
                            const allKodes = tipes.map((t) => t.kode);
                            setSelectedPrintTipeKodes(allKodes);
                            updatePrintMapStyles(allKodes);
                            if (printParams) {
                                fetchPrintData(printParams.desaId, printParams.tahun, sumberDanaPrintInput, allKodes.join(','));
                            }
                        }}
                        onToggleTipe={(kode, checked) => {
                            let next: string[];
                            if (selectedPrintTipeKodes.includes('semua') || selectedPrintTipeKodes.length === 0) {
                                next = checked ? tipes.map(x => x.kode).filter(k => k !== kode) : [kode];
                            } else {
                                next = checked
                                    ? [...selectedPrintTipeKodes, kode]
                                    : selectedPrintTipeKodes.filter(k => k !== kode);
                            }
                            setSelectedPrintTipeKodes(next);
                            updatePrintMapStyles(next);
                            if (printParams) {
                                fetchPrintData(printParams.desaId, printParams.tahun, sumberDanaPrintInput, next.length === 0 ? 'semua' : next.join(','));
                            }
                        }}
                        plottingOptionsList={plottingOptionsList}
                        selectedPlottingId={selectedPlottingId}
                        onChangePlottingId={(val) => {
                            setSelectedPlottingId(val);
                            const found = plottingOptionsList.find(p => p.id.toString() === val);
                            if (found && found.target_panjang_m) {
                                setRencanaPanjangInput(found.target_panjang_m.toString());
                            }
                        }}
                        namaPimpinanInput={namaPimpinanInput}
                        setNamaPimpinanInput={setNamaPimpinanInput}
                        namaJabatanInput={namaJabatanInput}
                        setNamaJabatanInput={setNamaJabatanInput}
                        nipInput={nipInput}
                        setNipInput={setNipInput}
                        nomorBaInput={nomorBaInput}
                        setNomorBaInput={setNomorBaInput}
                        rencanaPanjangInput={rencanaPanjangInput}
                        setRencanaPanjangInput={setRencanaPanjangInput}
                        sumberDanaPrintInput={sumberDanaPrintInput}
                        onChangeSumberDana={async (val) => {
                            setSumberDanaPrintInput(val);
                            if (printParams) {
                                await fetchPrintData(printParams.desaId, printParams.tahun, val);
                            }
                        }}
                        onConfirm={handleConfirmPrintAndSave}
                        onCancel={() => setIsPrintDialogOpen(false)}
                    />

                    <DeleteConfirmDialog
                        open={!!deleteConfirmId}
                        activeTipe={activeTipe ?? null}
                        onConfirm={confirmDeleteSegment}
                        onClose={() => setDeleteConfirmId(null)}
                    />

                    <KirimDigitasiDialog
                        open={isKirimDialogOpen}
                        segment={segmentToKirim}
                        tipeNama={activeTipe?.nama || "Infrastruktur"}
                        namaKecamatan={activeKecName}
                        isSubmitting={isSubmittingKirim}
                        onConfirm={handleConfirmKirimDigitasi}
                        onCancel={() => {
                            if (!isSubmittingKirim) {
                                setIsKirimDialogOpen(false);
                                setSegmentToKirim(null);
                            }
                        }}
                    />

                    {/* Panel Pilih Jalan di Persimpangan */}
                    <IntersectionPanel
                        show={showIntersectionDialog}
                        candidates={intersectionCandidates}
                        panelPos={intersectionPanelPos}
                        hasDragged={hasDraggedIntersection}
                        onSelectRoad={(roadId) => {
                            setShowIntersectionDialog(false);
                            if (pendingCoordsRef.current) {
                                calculateAutoTracePath(
                                    pendingCoordsRef.current.start,
                                    pendingCoordsRef.current.end,
                                    roadId
                                );
                            }
                        }}
                        onSelectNearest={() => {
                            setShowIntersectionDialog(false);
                            if (pendingCoordsRef.current && intersectionCandidates.length > 0) {
                                calculateAutoTracePath(
                                    pendingCoordsRef.current.start,
                                    pendingCoordsRef.current.end,
                                    intersectionCandidates[0].id
                                );
                            }
                        }}
                        onCancel={() => {
                            setShowIntersectionDialog(false);
                            setTimeout(() => startAutoTraceMode(false), 100);
                        }}
                        onMouseDown={handleDragStart}
                        onTouchStart={handleTouchStartDrag}
                    />

                    <MapContextMenu
                        contextMenu={contextMenu}
                        activeTipe={activeTipe ?? null}
                        lockedSegmenIds={lockedSegmenIds}
                        onClose={() => setContextMenu(null)}
                        onOpenGarisVisual={handleOpenGarisVisual}
                        onShowDetail={handleShowSegmentDetail}
                        onEditAttributes={handleEditAttributesOnly}
                        onEditGeometry={(segment) => handleEditGeometryAndAttributes(segment, false)}
                        onStartSplit={handleStartSplitMode}
                        onDelete={handleDelete}
                    />

                    {/* ── Panel Garis Visual ─────────────────────────────────────────────── */}
                    <GarisVisualPanel
                        panel={segmenVisualPanel}
                        isSidebarOpen={isSidebarOpen}
                        onRefresh={handleRefreshGarisVisual}
                        onClose={() => setSegmenVisualPanel(null)}
                    />

                    <HelpDialog open={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
                </div>
            </div>

        </>
    );
}
