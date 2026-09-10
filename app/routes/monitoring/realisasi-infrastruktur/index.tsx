import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
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
    PanelLeftClose,
    PanelBottomOpen,
    PanelBottomClose,
    Table2,
    MapPin,
    ChevronsUpDown,
    Calendar,
    Clock,
    Printer,
    MoreHorizontal,
    FileText,
    Palette,
    Pencil,
    ExternalLink
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
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "~/components/ui/drawer";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "~/components/ui/command";
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
import { BottomSegmentPanel } from "~/features/monitoring/components/BottomSegmentPanel";
import { SegmenVisualisasi, type SegmenData } from "~/features/monitoring/components/SegmenVisualisasi";
import { realisasiService, type RealisasiEntry } from "~/features/monitoring/services/realisasi.service";
import { BasemapToggle } from "~/features/monitoring/components/BasemapToggle";
import { MapStyleToggle } from "~/features/monitoring/components/MapStyleToggle";
import { jalanDropdownService } from "~/features/peta/services/jalan-dropdown.service";
import type { Jalan } from "~/features/peta/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "~/components/ui/accordion";
import { LayerManagementPanel } from "~/features/monitoring/components/LayerManagementPanel";
import { ThematicSymbologyPanel } from "~/features/monitoring/components/ThematicSymbologyPanel";
import { DetailSegmenPanel } from "~/features/monitoring/components/DetailSegmenPanel";
import { MeasurementPanel } from "~/features/monitoring/components/MeasurementPanel";
import { useInfrastrukturTipe } from "~/features/monitoring/hooks/useInfrastrukturTipe";
import { TipeSwitcher } from "~/features/monitoring/components/TipeSwitcher";
import { infrastrukturService, type InfrastrukturTipe } from "~/services/infrastruktur.service";
import TileWMS from "ol/source/TileWMS";
import { useAuth } from "~/contexts/auth-context";
import { plottingAnggaranService } from "~/features/monitoring/services/plotting_anggaran.service";
import { Combobox } from "~/components/ui/combobox";
import { useTheme } from "next-themes";
import { canDigitize, hasGlobalRegionalScope, isReadOnlyRole, canPrintBeritaAcara } from "~/utils/permissions";
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
import { TipeInfrastrukturDialog } from "./components/TipeInfrastrukturDialog";
import { KirimDigitasiDialog } from "./components/KirimDigitasiDialog";
let _cachedCustomStyles: Record<string, any> | null = null;
let _lastCustomStylesReadTime = 0;

export const isUUID = (str: any): boolean => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export const invalidateCustomStylesCache = () => {
    _cachedCustomStyles = null;
};

const getStoredStyle = (key: string, defaultStyle: { color: string; width: number; lineDash?: number[]; scale?: number; visible?: boolean }) => {
    try {
        if (typeof window !== 'undefined') {
            const now = Date.now();
            // Cache for 3 seconds to avoid synchronous localStorage hits on every vector feature frame
            if (!_cachedCustomStyles || now - _lastCustomStylesReadTime > 3000) {
                const stored = localStorage.getItem('gigis_custom_vector_styles');
                _cachedCustomStyles = stored ? JSON.parse(stored) : {};
                _lastCustomStylesReadTime = now;
            }
            if (_cachedCustomStyles && _cachedCustomStyles[key]) {
                const item = _cachedCustomStyles[key];
                let lineDashVal: number[] | undefined = undefined;
                if (item.lineDash === 'dashed') {
                    lineDashVal = [6, 6];
                } else if (item.lineDash === 'dotted') {
                    lineDashVal = [2, 4];
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
                    fillColor: item.fillColor || `${item.color || defaultStyle.color}0d`,
                    visible: item.visible !== undefined ? Boolean(item.visible) : true
                };
            }
        }
    } catch (e) {
        console.error("Error loading custom styles from localStorage:", e);
    }
    return { ...defaultStyle, visible: defaultStyle.visible !== false };
};

function createBasemapSource(id: string, basemaps: Basemap[], isDark: boolean = false) {
    if (id === 'carto-dark' || (isDark && (id === 'carto-dark' || id === 'dark'))) {
        return new XYZ({
            url: "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
            crossOrigin: 'anonymous',
            attributions: '&copy; CARTO'
        });
    }

    if (id === 'google-sat' || id === 'google-earth' || id === 'google-satellite' || id === 'google-hybrid') {
        return new XYZ({
            url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
            crossOrigin: 'anonymous',
            attributions: '&copy; Google Earth'
        });
    }

    if (id === 'google-road' || id === 'google-maps') {
        return new XYZ({
            url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
            crossOrigin: 'anonymous',
            attributions: '&copy; Google Maps'
        });
    }

    if (id === 'osm') {
        return new OSM({ crossOrigin: 'anonymous' });
    }

    const meta = basemaps.find(b => b.id === id);
    if (!meta) {
        // Default to Google Earth (Satellite with labels)
        return new XYZ({
            url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
            crossOrigin: 'anonymous',
            attributions: '&copy; Google Earth'
        });
    }

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
    const navigate = useNavigate();
    const routeParams = useParams();
    const { tipes, activeTipe, setActiveTipe } = useInfrastrukturTipe();

    const [searchParams, setSearchParams] = useSearchParams();
    const params = useParams();
    const activeDesaIdParam = params.desaId;

    const [isSelectTipeDialogOpen, setIsSelectTipeDialogOpen] = useState(false);

    // Auto-select active infrastructure type from URL parameter /admin/monitoring/:kode OR query param ?tipe=...
    // If no type is specified in the URL upon opening the page, prompt the user with the TipeInfrastrukturDialog
    useEffect(() => {
        if (tipes.length === 0) return;

        const targetKode = routeParams.kode || searchParams.get("tipe") || searchParams.get("tipe_kode") || (searchParams.get("mode") ? "jalan" : undefined);
        if (targetKode) {
            const found = tipes.find(t => t.kode === targetKode);
            if (found) {
                if (found.kode !== activeTipe?.kode) {
                    setActiveTipe(found);
                }
                return;
            }
        }

        // If no tipe parameter in URL and activeTipe is not yet set, open the selection dialog
        if (!activeTipe) {
            setIsSelectTipeDialogOpen(true);
        }
    }, [routeParams.kode, searchParams, tipes, activeTipe, setActiveTipe]);

    const handleSelectTipe = (tipe: InfrastrukturTipe) => {
        setActiveTipe(tipe);
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set("tipe", tipe.kode);
            return next;
        }, { replace: true });
        setIsSelectTipeDialogOpen(false);
    };

    const [headerTipeOpen, setHeaderTipeOpen] = useState(false);
    const [headerMobileTipeOpen, setHeaderMobileTipeOpen] = useState(false);
    const [headerKecOpen, setHeaderKecOpen] = useState(false);
    const [headerDesaOpen, setHeaderDesaOpen] = useState(false);
    const [headerTahunOpen, setHeaderTahunOpen] = useState(false);
    const [headerMobileRegionOpen, setHeaderMobileRegionOpen] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth < 768; // Auto-open guidance drawer on mobile initial load
        }
        return false;
    });
    const [mobileDesaSearch, setMobileDesaSearch] = useState("");

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
        } catch (e) { }
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
        } catch (e) { }
    };

    useEffect(() => {
        const handleStyleChange = () => {
            try {
                const stored = localStorage.getItem('gigis_custom_vector_styles');
                if (stored) setCustomStyles(JSON.parse(stored));
            } catch (e) { }
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

    const mouseCoordsRef = useRef<{ lng: number; lat: number }>({ lng: 0, lat: 0 });
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
    const [dialogKec, setDialogKec] = useState<string>("");
    const [dialogDesa, setDialogDesa] = useState<string>("");
    const [dialogDesaList, setDialogDesaList] = useState<{ id: string; nama_desa: string }[]>([]);
    const [isLoadingDialogDesa, setIsLoadingDialogDesa] = useState(false);

    const handleDialogKecChange = async (newKecId: string) => {
        setDialogKec(newKecId);
        setDialogDesa("");
        if (!newKecId) {
            setDialogDesaList([]);
            return;
        }
        setIsLoadingDialogDesa(true);
        try {
            const resp = await monitoringService.getDesa(newKecId);
            if (resp.status === "success" && resp.result) {
                setDialogDesaList(resp.result);
            } else {
                setDialogDesaList([]);
            }
        } catch (err) {
            console.error("Gagal memuat desa untuk dialog:", err);
            toast.error("Gagal memuat daftar desa");
            setDialogDesaList([]);
        } finally {
            setIsLoadingDialogDesa(false);
        }
    };
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

    const uniqueYears = useMemo(() => {
        const set = new Set<string>();
        realisasiList.forEach(r => {
            if (r.tahun_anggaran) set.add(r.tahun_anggaran.toString());
        });
        const currentYear = new Date().getFullYear().toString();
        set.add(currentYear);
        return Array.from(set).sort((a, b) => b.localeCompare(a));
    }, [realisasiList]);

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

                // Inisialisasi Wilayah untuk Edit Segmen
                const segKecId = editingSegmentData.id_kecamatan?.toString() || (editingSegmentData as any).kecamatan_id?.toString() || (kecamatanList.find(k => k.nama_kecamatan?.toLowerCase() === editingSegmentData.nama_kecamatan?.toLowerCase())?.id?.toString()) || selectedKec;
                const segDesaId = editingSegmentData.id_desa?.toString() || (editingSegmentData as any).desa_id?.toString() || selectedDesa;
                setDialogKec(segKecId || "");
                setDialogDesa(segDesaId || "");
                if (segKecId && segKecId !== selectedKec) {
                    setIsLoadingDialogDesa(true);
                    monitoringService.getDesa(segKecId).then(resp => {
                        if (resp.status === "success" && resp.result) {
                            setDialogDesaList(resp.result);
                        } else {
                            setDialogDesaList([]);
                        }
                    }).catch(() => setDialogDesaList([])).finally(() => setIsLoadingDialogDesa(false));
                } else {
                    setDialogDesaList(desaList);
                }
            } else {
                // Inisialisasi Wilayah untuk Tambah Segmen Baru (Create)
                const defKec = selectedKec || (user?.id_kecamatan ? String(user.id_kecamatan) : "");
                const defDesa = selectedDesa || (user?.id_desa ? String(user.id_desa) : "");
                setDialogKec(defKec);
                setDialogDesa(defDesa);
                setDialogDesaList(desaList);
            }
        }
    }, [isAttributeDialogOpen, currentUserName, editingSegmentData, selectedKec, selectedDesa, desaList, kecamatanList, user]);

    const extractPlottingId = (seg: any): string => {
        if (!seg) return "";
        let val = seg.plotting_id ?? seg.id_plotting ?? seg.Plotting?.id;
        if (val !== undefined && val !== null && val !== "" && val !== "0" && val !== 0) return String(val);

        let attr = seg.atribut;
        if (typeof attr === "string") {
            try { attr = JSON.parse(attr); } catch (e) { }
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
    const [activeBasemap, setActiveBasemap] = useState<string>("google-sat");
    const [showOfficialOverlay, setShowOfficialOverlay] = useState(true);
    const [showRealisasiRefOverlay, setShowRealisasiRefOverlay] = useState(true);
    const [showExistingOverlay, setShowExistingOverlay] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        if (typeof window !== "undefined") {
            return window.innerWidth >= 768; // Open on desktop, closed on mobile by default
        }
        return true;
    });
    const [isBottomSegmentPanelOpen, setIsBottomSegmentPanelOpen] = useState(false);

    // Responsive sidebar resizing state (Desktop horizontal width & Mobile vertical height)
    const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
        if (typeof window !== "undefined") {
            try {
                const saved = localStorage.getItem("gigis_sidebar_width");
                if (saved) {
                    const parsed = parseInt(saved, 10);
                    if (!isNaN(parsed) && parsed >= 280 && parsed <= 720) return parsed;
                }
            } catch (e) {
                // Ignore localStorage error
            }
        }
        return 384; // Default 384px (w-96)
    });
    const [isSidebarDragging, setIsSidebarDragging] = useState(false);
    const sidebarContainerRef = useRef<HTMLDivElement | null>(null);
    const [mobileSheetHeight, setMobileSheetHeight] = useState<number>(70); // 70vh default
    const [isMobileSheetDragging, setIsMobileSheetDragging] = useState(false);
    const [bottomPanelHeight, setBottomPanelHeight] = useState<number>(() => {
        if (typeof window !== "undefined") {
            return Math.min(360, Math.max(220, Math.round(window.innerHeight * 0.38)));
        }
        return 320;
    });

    // Desktop Horizontal Drag-to-Resize Listener
    useEffect(() => {
        if (!isSidebarDragging) return;

        // Set global drag cursor and disable text selection
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const handleMouseMove = (e: MouseEvent) => {
            const containerLeft = sidebarContainerRef.current
                ? sidebarContainerRef.current.getBoundingClientRect().left
                : 0;
            const calculatedWidth = e.clientX - containerLeft;
            const minWidth = 280;
            const maxWidth = Math.min(window.innerWidth * 0.6, 750);
            const newWidth = Math.max(minWidth, Math.min(maxWidth, calculatedWidth));
            setSidebarWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsSidebarDragging(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            try {
                localStorage.setItem("gigis_sidebar_width", sidebarWidth.toString());
            } catch (e) { }
            if (mapRef.current) {
                setTimeout(() => {
                    mapRef.current?.updateSize();
                }, 50);
            }
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isSidebarDragging, sidebarWidth]);

    // Mobile Vertical Drag-to-Resize Listener
    useEffect(() => {
        if (!isMobileSheetDragging) return;

        const handleTouchMove = (e: TouchEvent) => {
            if (!e.touches[0]) return;
            const touchY = e.touches[0].clientY;
            const windowHeight = window.innerHeight;
            const newHeightVh = Math.max(30, Math.min(92, ((windowHeight - touchY) / windowHeight) * 100));
            setMobileSheetHeight(Math.round(newHeightVh));
        };

        const handleTouchEnd = () => {
            setIsMobileSheetDragging(false);
        };

        window.addEventListener("touchmove", handleTouchMove);
        window.addEventListener("touchend", handleTouchEnd);
        return () => {
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleTouchEnd);
        };
    }, [isMobileSheetDragging]);

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

    const isBottomSegmentPanelOpenRef = useRef(isBottomSegmentPanelOpen);
    useEffect(() => {
        isBottomSegmentPanelOpenRef.current = isBottomSegmentPanelOpen;
    }, [isBottomSegmentPanelOpen]);

    const bottomPanelHeightRef = useRef(bottomPanelHeight);
    useEffect(() => {
        bottomPanelHeightRef.current = bottomPanelHeight;
    }, [bottomPanelHeight]);

    const isRightPanelOpenRef = useRef(isRightPanelOpen);
    useEffect(() => {
        isRightPanelOpenRef.current = isRightPanelOpen;
    }, [isRightPanelOpen]);

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
                // Find matching Google Earth / Google Satellite basemap to set as default active
                const googleEarthExists = data.find(b =>
                    b.id === 'google-sat' ||
                    b.id === 'google-earth' ||
                    b.id === 'google-satellite' ||
                    b.id === 'google-hybrid' ||
                    b.name.toLowerCase().includes('google earth') ||
                    b.name.toLowerCase().includes('google satellite') ||
                    b.name.toLowerCase().includes('satellite') ||
                    b.name.toLowerCase().includes('satelit')
                );
                if (googleEarthExists) {
                    setActiveBasemap(googleEarthExists.id);
                }
            }
        }).catch(err => console.error("Basemap load error:", err));
    }, []);

    // Sync map tile source only when activeBasemap or theme actually changes
    const lastAppliedBasemapKeyRef = useRef<string>("");
    useEffect(() => {
        const key = `${activeBasemap}_${isDark ? 'dark' : 'light'}`;
        if (tileLayerRef.current && basemapsList.length > 0 && lastAppliedBasemapKeyRef.current !== key) {
            lastAppliedBasemapKeyRef.current = key;
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

    const lastHoveredSegmentIdRef = useRef<string | null>(null);
    useEffect(() => {
        if (lastHoveredSegmentIdRef.current !== hoveredSegmentId) {
            lastHoveredSegmentIdRef.current = hoveredSegmentId;
            hoveredSegmentIdRef.current = hoveredSegmentId;
            if (existingLayerRef.current) {
                existingLayerRef.current.changed();
            }
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
    const staLayerRef = useRef<VectorLayer | null>(null);

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

    // Auto-select from URL search parameters (deep-linking from dokumen-infrastruktur)
    useEffect(() => {
        const paramKec = searchParams.get("id_kecamatan") || searchParams.get("kecamatan_id");
        const paramDesa = searchParams.get("id_desa") || searchParams.get("desa_id") || searchParams.get("desaId");
        const paramTahun = searchParams.get("tahun") || searchParams.get("tahun_anggaran");
        const paramMode = searchParams.get("mode");

        if (paramKec) {
            setSelectedKec(String(paramKec));
        }
        if (paramDesa) {
            setSelectedDesa(String(paramDesa));
        }
        if (paramTahun) {
            selectedTahunFilterRef.current = String(paramTahun);
            setSelectedTahunFilter(String(paramTahun));
        }
        if (paramMode === "revisi") {
            setIsSidebarOpen(true);
        }
    }, [searchParams]);

    // Fetch Desa list when Kecamatan changes
    useEffect(() => {
        const fetchDesa = async () => {
            if (!selectedKec) return;
            try {
                const resp = await monitoringService.getDesa(selectedKec);
                if (resp.status === "success" && resp.result) {
                    setDesaList(resp.result);
                    const paramDesa = searchParams.get("id_desa") || searchParams.get("desa_id") || searchParams.get("desaId");
                    if (paramDesa && resp.result.some((d: any) => String(d.id) === String(paramDesa))) {
                        setSelectedDesa(String(paramDesa));
                    } else {
                        setSelectedDesa(prev => {
                            if (prev && resp.result.some((d: any) => String(d.id) === String(prev))) {
                                return prev;
                            }
                            return "";
                        });
                    }
                }
            } catch (err) {
                console.error("Desa load error:", err);
                toast.error("Gagal memuat data desa");
            }
        };
        fetchDesa();
    }, [selectedKec, searchParams]);

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
    const loadDesaData = async (desaId: string, currentTipeKode?: string | null, options?: { skipFitBounds?: boolean; silent?: boolean }) => {
        const tipeToFetch = currentTipeKode !== undefined ? currentTipeKode : activeTipe?.kode;
        if (!desaId) return;
        const isSilent = Boolean(options?.silent);
        if (!isSilent) {
            setIsLoading(true);
            setRealisasiList([]);
        }
        try {
            if (!isSilent) {
                // Clear current map layers only when NOT silent
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
            }

            // Load and render village boundary
            const boundaryResp = await monitoringService.getDesaById(desaId);
            const boundaryGeoJSON = boundaryResp?.result || boundaryResp;
            let boundaryFeatures: Feature[] = [];
            if (boundaryGeoJSON && (boundaryGeoJSON.type === "Feature" || boundaryGeoJSON.type === "FeatureCollection" || boundaryGeoJSON.geometry)) {
                boundaryFeatures = geojsonFormat.readFeatures(boundaryGeoJSON, {
                    dataProjection: "EPSG:4326",
                    featureProjection: "EPSG:3857"
                });
                if (isSilent) {
                    boundarySourceRef.current?.clear();
                }
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
                    if (isSilent) {
                        refSourceRef.current?.clear();
                    }
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
                    segFeatures.forEach(f => {
                        if (!f.get('tipe_kode')) {
                            f.set('tipe_kode', tipeToFetch);
                        }
                        if (!f.get('tahun_pembangunan')) {
                            const resolvedThn = f.get('tahun_anggaran') || f.get('tahun') || f.get('thn_anggaran') || f.get('atribut')?.tahun_anggaran || 2025;
                            f.set('tahun_pembangunan', resolvedThn);
                        }
                    });
                    combinedFeatures.push(...segFeatures);
                }

                if (areasGeoJSON) {
                    const areaFeatures = geojsonFormat.readFeatures(areasGeoJSON, {
                        dataProjection: "EPSG:4326",
                        featureProjection: "EPSG:3857"
                    });
                    areaFeatures.forEach(f => {
                        if (!f.get('tipe_kode')) {
                            f.set('tipe_kode', tipeToFetch);
                        }
                        if (!f.get('tahun_pembangunan')) {
                            const resolvedThn = f.get('tahun_anggaran') || f.get('tahun') || f.get('thn_anggaran') || f.get('atribut')?.tahun_anggaran || 2025;
                            f.set('tahun_pembangunan', resolvedThn);
                        }
                    });
                    combinedFeatures.push(...areaFeatures);
                }

                existingSourceRef.current?.clear();
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
                            id_desa: props.id_desa?.toString() || props.desa_id?.toString() || desaId,
                            nama_desa: props.desa || props.nama_desa || "",
                            id_kecamatan: props.id_kecamatan?.toString() || props.kecamatan_id?.toString() || selectedKec,
                            nama_kecamatan: props.kecamatan || props.nama_kecamatan || "",
                            status_parent: isStatusParent,
                            check_melarosa: isStatusParent,
                            panjang_m: props.panjang || len,
                            lebar_m: props.lebar || 3.0,
                            perkerasan: props.perkerasan || props.jenis_perkerasan || "Beton Cor",
                            kondisi: props.kondisi || "baik",
                            tahun_anggaran: props.tahun_pembangunan || 2025,
                            coordinates_count: coordCount,
                            kode_ruas: (props.kode_ruas != null && !isUUID(String(props.kode_ruas)) && String(props.kode_ruas) !== "0") ? String(props.kode_ruas) : (isUUID(String(props.parent_id)) ? "" : String(props.parent_id || "0")),
                            snapped_road_id: props.parent_id?.toString() || props.kode_ruas?.toString() || "",
                            parent_id: props.parent_id?.toString() || null,
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
            const paramTahun = searchParams.get("tahun") || searchParams.get("tahun_anggaran");
            if (paramTahun) {
                selectedTahunFilterRef.current = String(paramTahun);
                setSelectedTahunFilter(String(paramTahun));
            } else {
                setSelectedTahunFilter("Semua");
            }
        }
    }, [selectedDesa, activeTipe?.kode, searchParams]);

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
                const featureTahun =
                    feature.get("tahun_pembangunan") ||
                    feature.get("tahun_anggaran") ||
                    feature.get("tahun") ||
                    feature.get("thn_anggaran") ||
                    feature.get("atribut")?.tahun_anggaran ||
                    feature.get("atribut")?.tahun_pembangunan;

                if (
                    selectedTahunFilterRef.current !== "Semua" &&
                    featureTahun &&
                    featureTahun.toString() !== selectedTahunFilterRef.current
                ) {
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

                let symbologyMode = 'kondisi';
                try {
                    if (typeof window !== 'undefined') {
                        symbologyMode = localStorage.getItem('gigis_symbology_mode') || 'kondisi';
                    }
                } catch (e) { }

                let styleKey = 'jalan_desa_baik';
                let defaultColor = '#22c55e';
                let defaultWidth = 5;
                let defaultLineDash: number[] | undefined = undefined;

                if (symbologyMode === 'status_verifikasi') {
                    const rawStatus = (feature.get("status_verifikasi") || feature.get("status") || feature.get("status_kondisi") || '').toString().toLowerCase();
                    const verifikator = feature.get("verifikator");
                    if (rawStatus.includes('setuju') || rawStatus.includes('approved') || rawStatus.includes('terverifikasi') || Boolean(verifikator)) {
                        styleKey = 'verif_approved';
                        defaultColor = '#10b981';
                    } else if (rawStatus.includes('ajuk') || rawStatus.includes('submit') || rawStatus.includes('proses') || rawStatus.includes('evaluasi')) {
                        styleKey = 'verif_submitted';
                        defaultColor = '#3b82f6';
                    } else if (rawStatus.includes('revisi') || rawStatus.includes('tolak') || rawStatus.includes('catatan')) {
                        styleKey = 'verif_revision';
                        defaultColor = '#f43f5e';
                    } else {
                        styleKey = 'verif_draft';
                        defaultColor = '#94a3b8';
                        defaultLineDash = [6, 6];
                    }
                } else if (symbologyMode === 'jenis_perkerasan') {
                    const rawPerkerasan = (feature.get("perkerasan") || feature.get("jenis_perkerasan") || feature.get("tipe_perkerasan") || '').toString().toLowerCase();
                    if (rawPerkerasan.includes('aspal') || rawPerkerasan.includes('hotmix') || rawPerkerasan.includes('lapen')) {
                        styleKey = 'perkerasan_aspal';
                        defaultColor = '#0f172a';
                    } else if (rawPerkerasan.includes('beton') || rawPerkerasan.includes('rigid') || rawPerkerasan.includes('cor')) {
                        styleKey = 'perkerasan_beton';
                        defaultColor = '#0284c7';
                    } else if (rawPerkerasan.includes('paving') || rawPerkerasan.includes('conblock')) {
                        styleKey = 'perkerasan_paving';
                        defaultColor = '#d97706';
                    } else {
                        styleKey = 'perkerasan_tanah';
                        defaultColor = '#854d0e';
                        defaultLineDash = [6, 6];
                    }
                } else if (symbologyMode === 'status_jalan') {
                    const statusJalan = feature.get("status_jalan") || "Jalan Desa";
                    if (statusJalan === 'Jalan Kabupaten') {
                        styleKey = 'hirarki_kabupaten';
                        defaultColor = '#9333ea';
                        defaultWidth = 6;
                    } else if (checkMelarosa === 'Tidak' || checkMelarosa === false) {
                        styleKey = 'hirarki_lingkungan';
                        defaultColor = '#06b6d4';
                        defaultWidth = 4;
                    } else {
                        styleKey = 'hirarki_poros';
                        defaultColor = '#4f46e5';
                        defaultWidth = 6;
                    }
                } else {
                    // Default Mode: 'kondisi'
                    const statusJalan = feature.get("status_jalan") || "Jalan Desa";

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
                }

                const isHovered = hoveredSegmentIdRef.current && (fId === hoveredSegmentIdRef.current || fId === `jalan_segmen.${hoveredSegmentIdRef.current}`);

                const isActiveInDialog = isAttributeDialogOpenRef.current && editingSegmentIdRef.current &&
                    (editingSegmentIdRef.current.toString() === fId || editingSegmentIdRef.current.toString() === cleanId);

                const custom = getStoredStyle(styleKey, { color: defaultColor, width: defaultWidth, lineDash: defaultLineDash });
                if (custom.visible === false) {
                    return []; // Layer category isolated/hidden by user
                }

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
                mouseCoordsRef.current = { lng: lonLat[0], lat: lonLat[1] };
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
            const isPoint = geomUp === 'POINT' || geomUp === 'MULTIPOINT';

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
                        const masterDbId = bProps.id ? String(bProps.id) : returnedKodeRuas.toString();
                        setSnappedRoad({
                            id: masterDbId,
                            nama: roadName,
                            kode_ruas: returnedKodeRuas.toString()
                        });
                        setCheckMelarosa(true);
                    } else {
                        setSnappedRoad({
                            id: returnedKodeRuas.toString(),
                            nama: `Ruas Poros Desa (${returnedKodeRuas})`,
                            kode_ruas: returnedKodeRuas.toString()
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
                    const rawKode = feat.get("kode_ruas") ?? feat.get("KODE_RUAS") ?? feat.get("kode") ?? feat.get("KODE");
                    const kodeRuasVal = (rawKode != null && !isUUID(String(rawKode))) ? String(rawKode) : "";
                    const name = feat.get("nama_ruas") || feat.get("nama") || feat.get("NM_RUAS") || feat.get("NAME") || feat.get("nama_jalan") || feat.get("namobj") || feat.get("label") || "Ruas Master";
                    closestRoad = {
                        id: masterDbId != null && masterDbId !== "" ? String(masterDbId) : "",
                        kode_ruas: kodeRuasVal,
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
    const handleInteractiveRelinkToMaster = async () => {
        if (!activeTipe?.kode) {
            toast.warning("Tipe infrastruktur belum dipilih.");
            return;
        }

        let geomObj: any = null;
        if (isFormOpen && drawSourceRef.current) {
            const features = drawSourceRef.current.getFeatures();
            if (features.length > 0) {
                geomObj = features[0].getGeometry();
            }
        } else if (editingSegmentId) {
            const targetId = editingSegmentId.toString();
            const feat = existingSourceRef.current?.getFeatures().find(f => {
                const fId = f.get("id")?.toString();
                const featId = f.getId()?.toString();
                return fId === targetId || fId === `jalan_segmen.${targetId}` || featId === targetId || featId === `jalan_segmen.${targetId}`;
            });
            if (feat && feat.getGeometry()) {
                geomObj = feat.getGeometry();
            } else if (editingSegmentData?.geom) {
                try {
                    const parsedGeom = typeof editingSegmentData.geom === 'string' ? JSON.parse(editingSegmentData.geom) : editingSegmentData.geom;
                    if (parsedGeom) {
                        geomObj = geojsonFormat.readGeometry(parsedGeom, {
                            dataProjection: "EPSG:4326",
                            featureProjection: "EPSG:3857"
                        });
                    }
                } catch (e) {
                    console.error("Geom parse error in relink:", e);
                }
            }
        }

        if (!geomObj) {
            toast.warning("Geometri segmen tidak ditemukan untuk penambatan spasial.");
            return;
        }

        // Convert the EPSG:3857 geometry back to GeoJSON Feature (EPSG:4326) to send to backend
        let geojsonFeatureStr = "";
        try {
            // @ts-ignore
            geojsonFeatureStr = geojsonFormat.writeFeature(
                new Feature(geomObj),
                { dataProjection: "EPSG:4326", featureProjection: "EPSG:3857" }
            );
        } catch (e) {
            console.error("Error writing GeoJSON feature:", e);
            toast.warning("Gagal memformat geometri.");
            return;
        }
        
        const geojsonFeature = JSON.parse(geojsonFeatureStr);

        try {
            toast.info("Mendeteksi ruas master dominan...");
            const res = await monitoringService.detectDominantParent(activeTipe.kode, geojsonFeature);
            
            if (res && res.status === 'success' && res.result) {
                const dominant = res.result;
                const closestRoad = {
                    id: dominant.id?.toString() || dominant.kode_ruas?.toString(),
                    kode_ruas: dominant.kode_ruas?.toString(),
                    nama: dominant.nama || "Master Infrastruktur",
                    dist: 0 // Jarak tidak relevan lagi, berbasis intersection length
                };

                setSnappedCandidates([closestRoad]);
                setSnappedRoad(closestRoad);
                setCheckMelarosa(true);
                toast.success(`Berhasil terhubung ke Master ${activeTipe.nama}: ${closestRoad.nama}`);
            } else {
                setSnappedCandidates([]);
                setSnappedRoad(null);
                setCheckMelarosa(false);
                toast.warning(res?.message || `Tidak ditemukan master ${activeTipe.nama} terdekat yang saling beririsan.`);
            }
        } catch (error) {
            console.error("Error detectDominantParent:", error);
            toast.error("Gagal mendeteksi parent dominan. Terjadi kesalahan pada server.");
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
                loadDesaData(selectedDesa, activeTipe?.kode, { skipFitBounds: true, silent: true });
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
            loadDesaData(selectedDesa, activeTipe?.kode, { skipFitBounds: true, silent: true });
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
        if (!canDigitize(user)) {
            toast.warning("Akun Operator OPD berstatus Read-Only dan tidak diizinkan mendigitasi peta.");
            return;
        }
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

    const handleGenerateDimensionAreaRef = useRef<(panjangM: number, lebarM: number, customCenter?: number[]) => void>(() => { });

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
        setEditingSegmentData(null);
        setDialogKec("");
        setDialogDesa("");
        setDialogDesaList([]);
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

    // Zoom map view to show a specific segment feature centered in visible viewport
    const zoomToSegment = (segmentTarget: string | any) => {
        if (!mapRef.current) return;

        const segmentId = (typeof segmentTarget === 'object' && segmentTarget !== null)
            ? (segmentTarget.id || segmentTarget.properties?.id)?.toString()
            : segmentTarget?.toString();

        if (!segmentId) return;

        let targetGeom: any = null;

        if (existingSourceRef.current) {
            const features = existingSourceRef.current.getFeatures();
            const feat = features.find(f => {
                const fId = f.get("id")?.toString();
                return fId === segmentId || fId === `jalan_segmen.${segmentId}` || f.getId()?.toString() === segmentId || f.getId()?.toString() === `jalan_segmen.${segmentId}`;
            });
            if (feat) {
                targetGeom = feat.getGeometry();
            }
        }

        if (!targetGeom && realisasiListRef.current) {
            const seg = realisasiListRef.current.find(s => s.id?.toString() === segmentId?.toString());
            if (seg?.geom) {
                try {
                    const parsedFeature = geojsonFormat.readFeature(
                        typeof seg.geom === 'string' ? JSON.parse(seg.geom) : seg.geom,
                        { featureProjection: 'EPSG:3857', dataProjection: 'EPSG:4326' }
                    );
                    if (parsedFeature) {
                        targetGeom = Array.isArray(parsedFeature)
                            ? parsedFeature[0]?.getGeometry()
                            : parsedFeature.getGeometry();
                    }
                } catch (e) {
                    // Ignore parse error
                }
            }
        }

        if (targetGeom) {
            const extent = targetGeom.getExtent();
            // Calculate dynamic padding so the segment is positioned centrally in the visible map region above BottomSegmentPanel
            const isBottomOpen = isBottomSegmentPanelOpenRef.current;
            const bHeight = bottomPanelHeightRef.current || 320;
            const bottomPad = isBottomOpen ? (bHeight + 40) : 60;
            const rightPad = isRightPanelOpenRef.current ? 420 : 60;
            const topPad = 60;
            const leftPad = 60;

            mapRef.current.getView().fit(extent, {
                padding: [topPad, rightPad, bottomPad, leftPad],
                duration: 800,
                maxZoom: 18
            });
        }
    };

    // Attach zoomToSegment to window for external sub-panels
    useEffect(() => {
        (window as any).zoomToSegment = zoomToSegment;
        return () => {
            delete (window as any).zoomToSegment;
        };
    }, []);

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
            const isBottomOpen = isBottomSegmentPanelOpenRef.current;
            const bHeight = bottomPanelHeightRef.current || 320;
            const bottomPad = isBottomOpen ? (bHeight + 40) : 60;
            const rightPad = isRightPanelOpenRef.current ? 420 : 60;
            mapRef.current.getView().fit(extent, {
                padding: [60, rightPad, bottomPad, 60],
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
                        try { geomObj = JSON.parse(geomObj); } catch (e) { }
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
                        try { geomObj = JSON.parse(geomObj); } catch (e) { }
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
        if (!canDigitize(user)) {
            toast.warning("Akun Operator OPD berstatus Read-Only dan tidak diizinkan mengubah atribut segmen.");
            return;
        }
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

        const segKecId = segment.id_kecamatan?.toString() || (segment as any).kecamatan_id?.toString() || (kecamatanList.find(k => k.nama_kecamatan?.toLowerCase() === segment.nama_kecamatan?.toLowerCase())?.id?.toString()) || selectedKec;
        const segDesaId = segment.id_desa?.toString() || (segment as any).desa_id?.toString() || selectedDesa;
        setDialogKec(segKecId || "");
        setDialogDesa(segDesaId || "");
        if (segKecId && segKecId !== selectedKec) {
            setIsLoadingDialogDesa(true);
            monitoringService.getDesa(segKecId).then(resp => {
                if (resp.status === "success" && resp.result) {
                    setDialogDesaList(resp.result);
                } else {
                    setDialogDesaList([]);
                }
            }).catch(() => setDialogDesaList([])).finally(() => setIsLoadingDialogDesa(false));
        } else {
            setDialogDesaList(desaList);
        }

        const parentIdVal = (segment as any).parent_id || (isUUID(segment.snapped_road_id) ? segment.snapped_road_id : null);
        const rawSegKode = (segment as any).kode_ruas || (!isUUID(segment.snapped_road_id) ? segment.snapped_road_id : null);
        const kodeRuasVal = (rawSegKode != null && !isUUID(String(rawSegKode)) && String(rawSegKode) !== "0") ? String(rawSegKode) : "";
        const isMaster = Boolean(segment.check_melarosa || (parentIdVal && parentIdVal !== "0") || (kodeRuasVal && kodeRuasVal !== "0"));
        setCheckMelarosa(isMaster);
        setTipeJalanDigitasi(isMaster ? "poros" : "lingkungan");

        if (isMaster) {
            const roadFeat = (parentIdVal || kodeRuasVal) ? refSourceRef.current?.getFeatures().find(rf => {
                const rfId = rf.get("id")?.toString() || rf.getId()?.toString();
                const rfKode = rf.get("kode_ruas")?.toString() || rf.get("KODE_RUAS")?.toString();
                return (parentIdVal && rfId === parentIdVal.toString()) || (kodeRuasVal && rfKode === kodeRuasVal.toString());
            }) : null;

            const roadName = segment.namobj || segment.nama_jalan || (roadFeat ? (roadFeat.get("nama_ruas") || roadFeat.get("nama") || "Ruas Master") : "Ruas Master Rujukan");
            const masterDbId = roadFeat ? (roadFeat.get("id") || roadFeat.getId()) : (isUUID(parentIdVal) ? parentIdVal : null);
            const rawFeatKode = roadFeat ? (roadFeat.get("kode_ruas") ?? roadFeat.get("KODE_RUAS") ?? roadFeat.get("kode")) : null;
            const masterKodeRuas = (rawFeatKode != null && !isUUID(String(rawFeatKode))) ? String(rawFeatKode) : (kodeRuasVal || "0");

            setSnappedRoad({
                id: masterDbId ? String(masterDbId) : (parentIdVal ? String(parentIdVal) : ""),
                kode_ruas: masterKodeRuas,
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
                                    const rawKode = feat.get("kode_ruas") ?? feat.get("KODE_RUAS") ?? feat.get("kode") ?? feat.get("KODE");
                                    const resolvedParentId = masterDbId != null && masterDbId !== "" ? String(masterDbId) : "";
                                    const resolvedKodeRuas = (rawKode != null && !isUUID(String(rawKode))) ? String(rawKode) : "0";
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
        if (!canDigitize(user)) {
            toast.warning("Akun Operator OPD berstatus Read-Only dan tidak diizinkan mendigitasi atau mengedit geometri.");
            return;
        }
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

        const segKecId = segment.id_kecamatan?.toString() || (segment as any).kecamatan_id?.toString() || (kecamatanList.find(k => k.nama_kecamatan?.toLowerCase() === segment.nama_kecamatan?.toLowerCase())?.id?.toString()) || selectedKec;
        const segDesaId = segment.id_desa?.toString() || (segment as any).desa_id?.toString() || selectedDesa;
        setDialogKec(segKecId || "");
        setDialogDesa(segDesaId || "");
        if (segKecId && segKecId !== selectedKec) {
            setIsLoadingDialogDesa(true);
            monitoringService.getDesa(segKecId).then(resp => {
                if (resp.status === "success" && resp.result) {
                    setDialogDesaList(resp.result);
                } else {
                    setDialogDesaList([]);
                }
            }).catch(() => setDialogDesaList([])).finally(() => setIsLoadingDialogDesa(false));
        } else {
            setDialogDesaList(desaList);
        }

        if (geom instanceof LineString) {
            const coords = geom.getCoordinates();
            setCoordsCount(coords.length);
            setDrawnCoords(coords.map(c => toLonLat(c)));
            setGeomHistory([coords]);
            setGeomRedoStack([]);
        }

        const parentIdVal = (segment as any).parent_id || (isUUID(segment.snapped_road_id) ? segment.snapped_road_id : null);
        const rawSegKode = (segment as any).kode_ruas || (!isUUID(segment.snapped_road_id) ? segment.snapped_road_id : null);
        const isMaster = Boolean(segment.check_melarosa || (parentIdVal && parentIdVal !== "0") || (rawSegKode && rawSegKode !== "0"));
        setCheckMelarosa(isMaster);
        setTipeJalanDigitasi(isMaster ? "poros" : "lingkungan");

        if (isMaster) {
            const roadFeat = (parentIdVal || rawSegKode) ? refSourceRef.current?.getFeatures().find(rf => {
                const rfId = rf.get("id")?.toString() || rf.getId()?.toString();
                const rfKode = rf.get("kode_ruas")?.toString() || rf.get("KODE_RUAS")?.toString();
                return (parentIdVal && rfId === parentIdVal.toString()) || (rawSegKode && rfKode === rawSegKode.toString());
            }) : null;
            const roadName = segment.namobj || segment.nama_jalan || (roadFeat ? (roadFeat.get("nama_ruas") || roadFeat.get("nama") || "Ruas Master") : "Ruas Master Rujukan");
            const rawFeatKode = roadFeat ? (roadFeat.get("kode_ruas") ?? roadFeat.get("KODE_RUAS") ?? roadFeat.get("kode")) : null;
            const finalKodeRuas = (rawFeatKode != null && !isUUID(String(rawFeatKode)))
                ? String(rawFeatKode)
                : (rawSegKode && !isUUID(String(rawSegKode)) ? String(rawSegKode) : "0");

            setSnappedRoad({
                id: parentIdVal ? parentIdVal.toString() : (roadFeat ? (roadFeat.get("id") || roadFeat.getId() || "Master") : "Master"),
                kode_ruas: finalKodeRuas,
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
     * Memulai alur digitasi segmen realisasi baru:
     * Menutup bottom panel, membuka form sidebar kiri, dan mengaktifkan tool digitasi di peta.
     */
    const handleStartDigitasiNew = () => {
        if (!selectedDesa) {
            toast.warning("Silakan pilih wilayah desa terlebih dahulu.");
            return;
        }
        if (!activeTipe) {
            toast.warning("Silakan pilih tipe infrastruktur terlebih dahulu.");
            return;
        }
        if (isYearLocked || (activeSnapshotLaporan && activeSnapshotLaporan.status === 'Final')) {
            toast.warning("Tahun anggaran ini telah terkunci (Berita Acara Final). Digitasi dinonaktifkan.");
            return;
        }
        if (activeSnapshotLaporan && activeSnapshotLaporan.status === 'Submitted') {
            toast.warning("Laporan realisasi sedang dalam proses verifikasi Bappeda. Digitasi dikunci sementara.");
            return;
        }

        // Guardrail: Operator Kecamatan wajib memiliki Draft Penugasan aktif dari Bappeda
        if (!isBappedaOrAdmin) {
            const hasActiveDraft = activeSnapshotLaporan && (activeSnapshotLaporan.status === 'Draft' || activeSnapshotLaporan.status === 'Revisi');
            if (!hasActiveDraft) {
                toast.error(
                    selectedTahunFilter !== "Semua"
                        ? `Akses digitasi ditutup. Bappeda belum menerbitkan Draft Penugasan untuk TA ${selectedTahunFilter}.`
                        : "Akses digitasi ditutup. Silakan pilih tahun anggaran yang memiliki Draft Penugasan aktif dari Bappeda."
                );
                return;
            }
        }

        if (activeTipe.kode === 'jalan_lingkungan') {
            setTipeJalanDigitasi('lingkungan');
        } else {
            setTipeJalanDigitasi('poros');
        }

        // Minimize bottom panel so operator gets full canvas view
        setIsBottomSegmentPanelOpen(false);
        // Open sidebar form & reset editing state
        setIsSidebarOpen(true);
        setIsFormOpen(true);
        setEditingSegmentId(null);
        setEditingSegmentData(null);

        const currentGeomType = (activeTipe?.geom_type || "").toUpperCase();
        const isPolygon = currentGeomType === "POLYGON" || currentGeomType === "MULTIPOLYGON";
        const isPoint = currentGeomType === "POINT" || currentGeomType === "MULTIPOINT";

        if (digitizeMode === "otomatis" && activeTipe.kode !== 'jalan_lingkungan' && !isPolygon && !isPoint) {
            startAutoTraceMode(true);
        } else {
            startDraw();
        }
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
        if (!canDigitize(user)) {
            toast.warning("Akun Operator OPD berstatus Read-Only dan tidak diizinkan memotong segmen.");
            return;
        }
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
            loadDesaData(selectedDesa, activeTipe?.kode, { skipFitBounds: true, silent: true });

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

        // Guardrail: Non-Bappeda/Admin users require active draft assignment to save
        if (!isBappedaOrAdmin) {
            const hasActiveDraft = activeSnapshotLaporan && (activeSnapshotLaporan.status === 'Draft' || activeSnapshotLaporan.status === 'Revisi');
            if (!hasActiveDraft) {
                const msg = `Gagal menyimpan segmen: Operator Kecamatan wajib memiliki Draft Penugasan aktif dari Bappeda untuk TA ${tahun || selectedTahunFilter}.`;
                setErrorMsg(msg);
                toast.error(msg);
                return;
            }
        }

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

        const targetKecId = dialogKec || selectedKec;
        const targetDesaId = dialogDesa || selectedDesa;

        if (!targetKecId || !targetDesaId) {
            setErrorMsg("Kecamatan dan Desa wajib dipilih");
            toast.error("Kecamatan dan Desa wajib dipilih");
            return;
        }

        const activeKecObj = kecamatanList.find(k => k.id.toString() === targetKecId);
        const activeDesaObj = dialogDesaList.find(d => d.id.toString() === targetDesaId) || desaList.find(d => d.id.toString() === targetDesaId);

        const isUUID = (str: any) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

        // Preserve parent_id and kode_ruas when editing segment geometry or when snapped to master road
        const isValidId = (val: any) => val != null && val !== "" && val !== "0" && val !== 0 && val !== "null" && val !== "Master" && val !== "undefined";
        const existingParentId = (editingSegmentData as any)?.parent_id || (editingSegmentData as any)?.snapped_road_id;
        const existingKodeRuas = (editingSegmentData as any)?.kode_ruas;

        const validSnappedParentId = isValidId(snappedRoad?.id) ? String(snappedRoad?.id) : null;
        const validExistingParentId = isValidId(existingParentId) ? String(existingParentId) : null;

        const validSnappedKodeRuas = isValidId(snappedRoad?.kode_ruas) && !isUUID(snappedRoad?.kode_ruas) ? String(snappedRoad?.kode_ruas) : null;
        const validExistingKodeRuas = isValidId(existingKodeRuas) && !isUUID(existingKodeRuas) ? String(existingKodeRuas) : null;

        const isMasterRoad = Boolean(checkMelarosa) && !isPolygonGeom && !isPointGeom;
        const resolvedParentId = isMasterRoad
            ? (validSnappedParentId || validExistingParentId || (snappedRoad?.id && snappedRoad.id !== "Master" ? String(snappedRoad.id) : null))
            : null;

        let resolvedKodeRuas = isMasterRoad
            ? (validSnappedKodeRuas || validExistingKodeRuas || (snappedRoad?.kode_ruas && !isUUID(snappedRoad?.kode_ruas) ? String(snappedRoad?.kode_ruas) : null))
            : "0";

        // If kode_ruas is missing or UUID, attempt to resolve integer kode_ruas from refSource layer using parent_id
        if (isMasterRoad && (!resolvedKodeRuas || resolvedKodeRuas === "0") && resolvedParentId && refSourceRef.current) {
            const masterFeats = refSourceRef.current.getFeatures();
            const matched = masterFeats.find(f => {
                const p = f.getProperties();
                return String(p.id) === String(resolvedParentId) || String(f.getId()) === String(resolvedParentId);
            });
            if (matched) {
                const mp = matched.getProperties();
                const k = mp.kode_ruas || mp.KODE_RUAS || mp.no_ruas;
                if (k && !isUUID(k)) {
                    resolvedKodeRuas = String(k);
                }
            }
        }
        if (!resolvedKodeRuas) resolvedKodeRuas = "0";

        if (isMasterRoad && !resolvedParentId) {
            setErrorMsg(`Hubungan ke data master wajib diisi jika status_parent bernilai true. Silakan hubungkan ke master terdekat terlebih dahulu.`);
            return;
        }

        const resolvedPlottingId = plottingId && isUUID(plottingId) ? plottingId : (plottingId && plottingId !== "none" ? plottingId : null);
        const resolvedUserId = currentUserId && isUUID(currentUserId) ? currentUserId : null;

        const resolvedStatusVerifikasi = (editingSegmentData as any)?.status_verifikasi || (isBappedaOrAdmin ? "terverifikasi" : "verifikasi_kecamatan");

        const mergedAtribut = {
            ...dynamicAtribut,
            status_jalan: statusJalan,
            jenis_perkerasan: perkerasan,
            status_aset: statusAset || "Pemerintah Desa",
            plotting_id: resolvedPlottingId,
            sumber_data: sumberData || "Survey Desa",
            status_verifikasi: resolvedStatusVerifikasi,
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
            status_verifikasi: resolvedStatusVerifikasi,
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
            kecamatan_id: parseInt(targetKecId, 10) || null,
            id_kecamatan: parseInt(targetKecId, 10) || null,
            desa_id: parseInt(targetDesaId, 10) || null,
            id_desa: parseInt(targetDesaId, 10) || null,
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

            const movedDesa = Boolean(editingSegmentId && targetDesaId !== selectedDesa);
            if (movedDesa) {
                toast.info(`Segmen disimpan dan dialihkan ke wilayah Desa ${activeDesaObj?.nama_desa || targetDesaId}`);
            }

            closeForm();
            setErrorMsg("");
            setCustomRoadName("");

            // Refresh layers without resetting zoom/extent
            loadDesaData(selectedDesa, activeTipe?.kode, { skipFitBounds: true, silent: true });
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
        onRefresh: () => loadDesaData(selectedDesa, activeTipe?.kode, { skipFitBounds: true, silent: true }),
    });

    // ── Kirim Digitasi Segmen ke Bappeda Dialog State & Handler ──────────────
    const [segmentToKirim, setSegmentToKirim] = useState<RealisasiSegmen | null>(null);
    const [batchSegmentsToKirim, setBatchSegmentsToKirim] = useState<RealisasiSegmen[]>([]);
    const [isKirimDialogOpen, setIsKirimDialogOpen] = useState(false);
    const [isSubmittingKirim, setIsSubmittingKirim] = useState(false);

    const handleConfirmKirimDigitasi = async () => {
        const listToSend = batchSegmentsToKirim.length > 0 ? batchSegmentsToKirim : segmentToKirim ? [segmentToKirim] : [];
        if (listToSend.length === 0) return;

        setIsSubmittingKirim(true);
        const isBatch = listToSend.length > 1;
        const toastId = toast.loading(isBatch ? `Mengirimkan ${listToSend.length} segmen ke Operator Bappeda...` : "Mengirimkan hasil digitasi ke Operator Bappeda...");
        const tipeKode = activeTipe?.kode || 'jalan';

        try {
            if (isBatch) {
                const results = await Promise.allSettled(
                    listToSend.map(s => infrastrukturService.submitSegmenToBappeda(tipeKode, s.id))
                );
                const succeeded = results.filter(r => r.status === "fulfilled").length;
                const failed = results.filter(r => r.status === "rejected").length;

                if (failed === 0) {
                    toast.success(`Berhasil mengajukan ${succeeded} segmen ke Operator Bappeda!`, { id: toastId });
                } else {
                    toast.warning(`${succeeded} segmen berhasil dikirim, ${failed} segmen gagal.`, { id: toastId });
                }
            } else {
                await infrastrukturService.submitSegmenToBappeda(tipeKode, listToSend[0].id);
                toast.success("Hasil digitasi segmen berhasil dikirimkan ke Operator Bappeda!", { id: toastId });
            }

            // Auto-submit parent report if currently in Draft/Revisi
            if (activeSnapshotLaporan && (activeSnapshotLaporan.status === 'Draft' || activeSnapshotLaporan.status === 'Revisi')) {
                try {
                    await monitoringLaporanService.submitLaporan(activeSnapshotLaporan.id);
                    checkSnapshotLock(selectedDesa, selectedTahunFilter);
                } catch (errLap) {
                    console.warn("Auto-submit draft report warning:", errLap);
                }
            }

            loadDesaData(selectedDesa, activeTipe?.kode, { skipFitBounds: true, silent: true });
            setIsKirimDialogOpen(false);
            setSegmentToKirim(null);
            setBatchSegmentsToKirim([]);
        } catch (err: any) {
            console.error("Gagal mengirim digitasi ke Bappeda:", err);
            toast.error(err?.message || "Gagal mengirim digitasi ke Bappeda", { id: toastId });
        } finally {
            setIsSubmittingKirim(false);
        }
    };

    const handleSubmitLaporanRevisi = async () => {
        if (!activeSnapshotLaporan?.id) {
            toast.warning("Draft penugasan tidak ditemukan untuk tahun anggaran ini.");
            return;
        }
        if (activeSnapshotLaporan.status === 'Submitted' || activeSnapshotLaporan.status === 'Final') {
            toast.warning("Dokumen hasil digitasi untuk tahun anggaran ini sudah dikirimkan atau telah difinalisasi.");
            return;
        }
        const toastId = toast.loading("Mengirimkan seluruh hasil digitasi ke Bappeda...");
        try {
            await monitoringLaporanService.submitLaporan(activeSnapshotLaporan.id);
            toast.success("Laporan Berita Acara & seluruh segmen berhasil dikirimkan ke Bappeda untuk diverifikasi!", { id: toastId });
            checkSnapshotLock(selectedDesa, selectedTahunFilter);
            loadDesaData(selectedDesa, activeTipe?.kode, { skipFitBounds: true, silent: true });
        } catch (err: any) {
            console.error("Gagal submit laporan revisi:", err);
            toast.error(err?.message || "Gagal mengirimkan laporan ke Bappeda", { id: toastId });
        }
    };

    // Fetch Berita Acara data first, then open dialog
    // Filter map layer features to show ONLY selected print infrastructure types for map attachment
    const updatePrintMapStyles = (tipeKodes: string[]) => {
        if (!existingSourceRef.current) return;
        const features = existingSourceRef.current.getFeatures();
        features.forEach(feat => {
            const featTipe = feat.get('tipe_kode') || feat.get('tipe') || feat.get('tipe_infrastruktur') || activeTipe?.kode;
            const isSelected =
                tipeKodes.length === 0 ||
                tipeKodes.includes('semua') ||
                (featTipe ? tipeKodes.includes(featTipe) : true);
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

    // Save formal Berita Acara snapshot to DB (pure snapshot and lock)
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

            let generatedNomorBA = "";

            if (activeSnapshotLaporan?.id) {
                // Re-snapshot: Update existing report record and re-sync physical targets
                const updateRes = await monitoringLaporanService.patchLaporan(activeSnapshotLaporan.id, {
                    id_desa: printParams.desaId,
                    id_kecamatan: selectedKec,
                    tahun_anggaran: printParams.tahun,
                    plotting_id: (selectedPlottingId && selectedPlottingId !== 'none') ? selectedPlottingId : null,
                    nomor_ba: nomorBaInput.trim() || activeSnapshotLaporan.nomor_ba || `050/XXX/412.302/${printParams.tahun}`,
                    sumber_dana: sumberDanaPrintInput,
                    rencana_panjang: rencanaPanjangInput,
                    status: "Final",
                    tipe_kode: selectedPrintTipeKodes.length === 0 ? "semua" : selectedPrintTipeKodes,
                    sync_target: true
                });
                try {
                    await monitoringLaporanService.syncTargetFisik(activeSnapshotLaporan.id);
                } catch (e) {
                    console.warn("Sync target fisik warning:", e);
                }
                generatedNomorBA = updateRes?.result?.nomor_ba || activeSnapshotLaporan.nomor_ba;
            } else {
                // First-time snapshot: Create new report record
                const createRes = await monitoringLaporanService.createLaporan({
                    id_desa: printParams.desaId,
                    id_kecamatan: selectedKec,
                    tahun_anggaran: printParams.tahun,
                    plotting_id: (selectedPlottingId && selectedPlottingId !== 'none') ? selectedPlottingId : null,
                    nomor_ba: nomorBaInput.trim() || `050/XXX/412.302/${printParams.tahun}`,
                    sumber_dana: sumberDanaPrintInput,
                    rencana_panjang: rencanaPanjangInput,
                    status: "Final",
                    tipe_kode: selectedPrintTipeKodes.length === 0 ? "semua" : selectedPrintTipeKodes
                });
                generatedNomorBA = createRes?.result?.nomor_ba;
            }

            toast.success(`Snapshot Berita Acara (${generatedNomorBA || 'Resmi'}) berhasil disimpan & disahkan! Dokumen dapat dilihat dan dicetak di menu Dokumen Infrastruktur.`, { id: toastId });

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
        const isAlreadyFinal = isYearLocked && activeSnapshotLaporan?.status === 'Final';
        const isOpd = user?.role === 'operator_opd';

        if (isOpd) {
            toast.warning("Akun Operator OPD berstatus Read-Only. Untuk melihat atau mencetak Berita Acara, silakan akses menu Dokumen Infrastruktur.");
            return;
        }

        if (user?.role !== 'operator_bappeda' && user?.role !== 'super_admin' && user?.role !== 'admin') {
            toast.error("Fitur Snapshot / Finalisasi Berita Acara hanya dapat diakses oleh Operator Bappeda dan Super Admin.");
            return;
        }

        // Guard: Jika belum final, validasi bahwa seluruh segmen pada tahun ini telah diverifikasi & disetujui oleh Bappeda
        if (!isAlreadyFinal) {
            const targetSegments = realisasiList.filter(r => (tahun === "Semua" || String(r.tahun_anggaran) === String(tahun)));
            if (targetSegments.length === 0) {
                toast.warning(`Tidak ada segmen realisasi yang terdata untuk TA ${tahun}.`);
                return;
            }
            const unverifiedSegmens = targetSegments.filter(r => r.status_verifikasi !== 'terverifikasi');
            if (unverifiedSegmens.length > 0) {
                toast.warning(`Snapshot Berita Acara hanya dapat disahkan jika seluruh segmen realisasi TA ${tahun} telah disetujui (Status: Terverifikasi). Masih terdapat ${unverifiedSegmens.length} segmen yang belum disetujui.`);
                return;
            }
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
            const defaultSumberDana = activeSnapshotLaporan?.sumber_dana || "BKK";
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
                setNomorBaInput(activeSnapshotLaporan?.nomor_ba || `050/XXX/412.302/${tahun}`);
                if (activeSnapshotLaporan?.rencana_panjang) {
                    setRencanaPanjangInput(activeSnapshotLaporan.rencana_panjang.toString());
                }

                // Initialize selectedPrintTipeKodes properly so map segments remain visible
                let initialTipeKodes: string[] = [];
                if (activeSnapshotLaporan?.tipe_kode) {
                    if (Array.isArray(activeSnapshotLaporan.tipe_kode)) {
                        initialTipeKodes = activeSnapshotLaporan.tipe_kode;
                    } else if (typeof activeSnapshotLaporan.tipe_kode === 'string') {
                        if (activeSnapshotLaporan.tipe_kode === 'semua' || activeSnapshotLaporan.tipe_kode === '') {
                            initialTipeKodes = ['semua'];
                        } else if (activeSnapshotLaporan.tipe_kode.includes(',')) {
                            initialTipeKodes = activeSnapshotLaporan.tipe_kode.split(',').map((s: string) => s.trim());
                        } else {
                            initialTipeKodes = [activeSnapshotLaporan.tipe_kode];
                        }
                    }
                } else if (activeTipe?.kode) {
                    initialTipeKodes = [activeTipe.kode];
                } else {
                    initialTipeKodes = ['semua'];
                }
                setSelectedPrintTipeKodes(initialTipeKodes);
                updatePrintMapStyles(initialTipeKodes);

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

    // State for Bappeda Revert Berita Acara to Draft Dialog
    const [revertLaporanOpen, setRevertLaporanOpen] = useState(false);
    const [revertCatatanInput, setRevertCatatanInput] = useState("");
    const [isRevertingLaporan, setIsRevertingLaporan] = useState(false);

    const handleRevertToDraft = async () => {
        if (!activeSnapshotLaporan?.id) return;
        setIsRevertingLaporan(true);
        const toastId = toast.loading("Membuka kunci & mengembalikan Berita Acara ke status Draft...");
        try {
            await monitoringLaporanService.revertToDraft(activeSnapshotLaporan.id, {
                catatan: revertCatatanInput.trim() || "Dikembalikan ke Draft untuk perbaikan oleh Bappeda",
                unlock_segments: true,
                target_segment_status: "verifikasi_kecamatan"
            });
            toast.success("Berita Acara berhasil dikembalikan ke status Draft / Revisi.", { id: toastId });
            setRevertLaporanOpen(false);
            setRevertCatatanInput("");
            await checkSnapshotLock(selectedDesa, selectedTahunFilter);
            if (selectedDesa) {
                loadDesaData(selectedDesa, activeTipe?.kode, { skipFitBounds: true, silent: true });
            }
        } catch (err: any) {
            console.error("Revert laporan error:", err);
            toast.error(err?.message || "Gagal mengembalikan Berita Acara ke draft", { id: toastId });
        } finally {
            setIsRevertingLaporan(false);
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
                <div className="h-14 border-b border-border bg-card px-2.5 sm:px-4 flex items-center justify-between shrink-0 gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="flex items-center shrink-0">
                            <div className="p-1.5 sm:p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-500/20">
                                <MapIcon className="size-4 sm:size-5" />
                            </div>
                        </div>

                        {/* Title & Region Breadcrumb Selector (Strictly 1 Row, No Wrap) */}
                        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                            {/* 2-Row Title with Interactive Tipe Switcher */}
                            <div className="flex flex-col justify-center shrink-0 min-w-0">
                                <div className="flex items-center gap-1 leading-none">
                                    <span className="text-[8.5px] sm:text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                        Workspace
                                    </span>
                                    <span className="inline-flex items-center text-[7px] sm:text-[8px] bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-1 py-0.2 rounded font-black uppercase tracking-wider leading-none">
                                        Digitasi
                                    </span>
                                </div>

                                {/* DESKTOP / TABLET TIPE SWITCHER POPOVER */}
                                <div className="hidden sm:block mt-0.5">
                                    <Popover open={headerTipeOpen} onOpenChange={setHeaderTipeOpen}>
                                        <PopoverTrigger asChild>
                                            <button
                                                type="button"
                                                disabled={isFormOpen}
                                                className={cn(
                                                    "group flex items-center gap-1 text-xs sm:text-sm font-bold text-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:outline-none text-left truncate max-w-[170px] cursor-pointer",
                                                    isFormOpen && "opacity-60 cursor-not-allowed"
                                                )}
                                                title="Klik untuk ganti tipe infrastruktur"
                                            >
                                                <span className="truncate">{activeTipe ? activeTipe.nama : "Infrastruktur"}</span>
                                                <ChevronsUpDown className="size-3 text-muted-foreground/60 group-hover:text-foreground shrink-0 transition-transform" />
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="p-1.5 w-[260px]" align="start">
                                            <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1">
                                                Pilih Tipe Infrastruktur
                                            </div>
                                            <div className="space-y-0.5 max-h-[280px] overflow-y-auto custom-scrollbar">
                                                {tipes.map((t) => {
                                                    const isSelected = activeTipe?.kode === t.kode;
                                                    return (
                                                        <button
                                                            key={t.kode}
                                                            type="button"
                                                            onClick={() => {
                                                                setActiveTipe(t);
                                                                setSearchParams((prev) => {
                                                                    const next = new URLSearchParams(prev);
                                                                    next.set("tipe", t.kode);
                                                                    return next;
                                                                });
                                                                setHeaderTipeOpen(false);
                                                            }}
                                                            className={cn(
                                                                "w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between text-xs transition-colors hover:bg-muted/80 cursor-pointer",
                                                                isSelected && "bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span
                                                                    className="size-2.5 rounded-full shrink-0 shadow-2xs"
                                                                    style={{ backgroundColor: t.warna || "#3b82f6" }}
                                                                />
                                                                <div className="min-w-0">
                                                                    <div className="truncate font-semibold">{t.nama}</div>
                                                                    <div className="text-[9px] text-muted-foreground font-normal">
                                                                        {t.geom_type?.toUpperCase() === "POINT" ? "Titik (Point)" : t.geom_type?.toUpperCase() === "POLYGON" ? "Poligon (Area)" : "Garis (Line)"}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {isSelected && (
                                                                <Check className="size-4 text-blue-600 dark:text-blue-400 shrink-0 ml-1" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <div className="p-1 pt-1.5 border-t border-border/50 bg-muted/20">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setHeaderTipeOpen(false);
                                                        setIsSelectTipeDialogOpen(true);
                                                    }}
                                                    className="w-full text-center py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 rounded-md flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                                                >
                                                    <Sparkles className="size-3" />
                                                    <span>Buka Dialog Pilihan Tipe</span>
                                                </button>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {/* MOBILE TIPE SWITCHER DRAWER */}
                                <div className="sm:hidden mt-0.5">
                                    <Drawer open={headerMobileTipeOpen} onOpenChange={setHeaderMobileTipeOpen}>
                                        <DrawerTrigger asChild>
                                            <button
                                                type="button"
                                                disabled={isFormOpen}
                                                className={cn(
                                                    "flex items-center gap-0.5 text-xs font-bold text-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:outline-none text-left truncate max-w-[95px] xs:max-w-[125px] cursor-pointer",
                                                    isFormOpen && "opacity-60 cursor-not-allowed"
                                                )}
                                            >
                                                <span className="truncate">{activeTipe ? activeTipe.nama : "Infrastruktur"}</span>
                                                <ChevronsUpDown className="size-2.5 text-muted-foreground/60 shrink-0" />
                                            </button>
                                        </DrawerTrigger>
                                        <DrawerContent className="p-4 pt-2 pb-6 max-h-[70vh]">
                                            <DrawerHeader className="px-0 pt-0 text-left">
                                                <DrawerTitle className="text-sm font-bold">Pilih Tipe Infrastruktur</DrawerTitle>
                                                <DrawerDescription className="text-xs text-muted-foreground">
                                                    Ganti ruang kerja pemantauan dan digitasi spasial
                                                </DrawerDescription>
                                            </DrawerHeader>
                                            <div className="space-y-1.5 mt-2 overflow-y-auto max-h-[50vh]">
                                                {tipes.map((t) => {
                                                    const isSelected = activeTipe?.kode === t.kode;
                                                    return (
                                                        <button
                                                            key={t.kode}
                                                            type="button"
                                                            onClick={() => {
                                                                setActiveTipe(t);
                                                                setSearchParams((prev) => {
                                                                    const next = new URLSearchParams(prev);
                                                                    next.set("tipe", t.kode);
                                                                    return next;
                                                                });
                                                                setHeaderMobileTipeOpen(false);
                                                            }}
                                                            className={cn(
                                                                "w-full text-left p-3 rounded-xl flex items-center justify-between border transition-all cursor-pointer",
                                                                isSelected
                                                                    ? "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold shadow-xs"
                                                                    : "border-border/60 bg-card hover:bg-muted/60 text-foreground"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <span
                                                                    className="size-3.5 rounded-full shrink-0 shadow-sm"
                                                                    style={{ backgroundColor: t.warna || "#3b82f6" }}
                                                                />
                                                                <div className="min-w-0">
                                                                    <div className="text-xs font-bold truncate">{t.nama}</div>
                                                                    <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                                                                        Tipe {t.geom_type?.toUpperCase() === "POINT" ? "Titik (Point)" : t.geom_type?.toUpperCase() === "POLYGON" ? "Poligon / Area" : "Garis (LineString)"}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {isSelected && (
                                                                <Check className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <div className="mt-3 pt-2 border-t border-border/50">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setHeaderMobileTipeOpen(false);
                                                        setIsSelectTipeDialogOpen(true);
                                                    }}
                                                    className="w-full text-center py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                                                >
                                                    <Sparkles className="size-3.5" />
                                                    <span>Buka Dialog Pilihan Tipe</span>
                                                </button>
                                            </div>
                                        </DrawerContent>
                                    </Drawer>
                                </div>
                            </div>

                            <ChevronRight className="size-3.5 text-muted-foreground/50 shrink-0 hidden sm:block" />

                            {/* DESKTOP / TABLET REGION BREADCRUMB SELECTORS */}
                            <div className="hidden sm:flex items-center gap-1.5 min-w-0">
                                {/* Kecamatan Popover Selector */}
                                <Popover open={headerKecOpen} onOpenChange={setHeaderKecOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            role="combobox"
                                            aria-expanded={headerKecOpen}
                                            disabled={isFormOpen || user?.role === 'operator_desa' || user?.role === 'operator_kecamatan'}
                                            className={cn(
                                                "h-7 text-xs font-semibold px-2.5 rounded-lg border-border/80 bg-background/80 hover:bg-muted transition-all max-w-[170px] justify-between gap-1",
                                                selectedKec && "border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-bold bg-indigo-500/5"
                                            )}
                                        >
                                            <span className="truncate">
                                                {activeKecName ? `Kec. ${activeKecName}` : "Pilih Kecamatan..."}
                                            </span>
                                            {user?.role !== 'operator_desa' && user?.role !== 'operator_kecamatan' && (
                                                <ChevronsUpDown className="size-3 shrink-0 opacity-50 ml-0.5" />
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="p-0 w-[220px]" align="start">
                                        <Command>
                                            <CommandInput placeholder="Cari kecamatan..." className="h-8 text-xs" />
                                            <CommandList>
                                                <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">Kecamatan tidak ditemukan</CommandEmpty>
                                                <CommandGroup>
                                                    {kecamatanList.map((kec) => (
                                                        <CommandItem
                                                            key={kec.id}
                                                            value={kec.nama_kecamatan}
                                                            onSelect={() => {
                                                                setSelectedKec(kec.id.toString());
                                                                setSelectedDesa("");
                                                                setHeaderKecOpen(false);
                                                                setHeaderDesaOpen(true);
                                                            }}
                                                            className="text-xs flex items-center justify-between"
                                                        >
                                                            <span>{kec.nama_kecamatan}</span>
                                                            {selectedKec === kec.id.toString() && (
                                                                <Check className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                                                            )}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>

                                <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" />

                                {/* Desa Popover Selector */}
                                <Popover open={headerDesaOpen} onOpenChange={setHeaderDesaOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            role="combobox"
                                            aria-expanded={headerDesaOpen}
                                            disabled={isFormOpen || !selectedKec || user?.role === 'operator_desa'}
                                            className={cn(
                                                "h-7 text-xs font-semibold px-2.5 rounded-lg border-border/80 bg-background/80 hover:bg-muted transition-all max-w-[170px] justify-between gap-1",
                                                selectedDesa && "border-blue-500/40 text-blue-700 dark:text-blue-300 font-bold bg-blue-500/10 shadow-2xs",
                                                !selectedKec && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            <span className="truncate">
                                                {activeDesaName ? `Desa ${activeDesaName}` : "Pilih Desa..."}
                                            </span>
                                            {user?.role !== 'operator_desa' && (
                                                <ChevronsUpDown className="size-3 shrink-0 opacity-50 ml-0.5" />
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="p-0 w-[220px]" align="start">
                                        <Command>
                                            <CommandInput placeholder="Cari desa..." className="h-8 text-xs" />
                                            <CommandList>
                                                <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">Desa tidak ditemukan</CommandEmpty>
                                                <CommandGroup>
                                                    {desaList.map((d) => (
                                                        <CommandItem
                                                            key={d.id}
                                                            value={d.nama_desa}
                                                            onSelect={() => {
                                                                setSelectedDesa(d.id.toString());
                                                                setHeaderDesaOpen(false);
                                                            }}
                                                            className="text-xs flex items-center justify-between"
                                                        >
                                                            <span>{d.nama_desa}</span>
                                                            {selectedDesa === d.id.toString() && (
                                                                <Check className="size-3.5 text-blue-600 dark:text-blue-400" />
                                                            )}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>

                                <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" />

                                {/* Tahun Anggaran Popover Selector */}
                                <Popover open={headerTahunOpen} onOpenChange={setHeaderTahunOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            role="combobox"
                                            aria-expanded={headerTahunOpen}
                                            disabled={isFormOpen}
                                            className={cn(
                                                "h-7 text-xs font-semibold px-2.5 rounded-lg border-border/80 bg-background/80 hover:bg-muted transition-all max-w-[150px] justify-between gap-1",
                                                selectedTahunFilter !== "Semua" && "border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold bg-amber-500/10 shadow-2xs"
                                            )}
                                        >
                                            <span className="truncate">
                                                {selectedTahunFilter === "Semua" ? "Semua TA" : `TA ${selectedTahunFilter}`}
                                            </span>
                                            <ChevronsUpDown className="size-3 shrink-0 opacity-50 ml-0.5" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="p-0 w-[180px]" align="start">
                                        <Command>
                                            <CommandInput placeholder="Cari tahun anggaran..." className="h-8 text-xs" />
                                            <CommandList>
                                                <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">Tahun tidak ditemukan</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem
                                                        value="Semua Tahun Anggaran"
                                                        onSelect={() => {
                                                            setSelectedTahunFilter("Semua");
                                                            setHeaderTahunOpen(false);
                                                        }}
                                                        className="text-xs flex items-center justify-between cursor-pointer"
                                                    >
                                                        <span>Semua Tahun</span>
                                                        {selectedTahunFilter === "Semua" && (
                                                            <Check className="size-3.5 text-amber-600 dark:text-amber-400" />
                                                        )}
                                                    </CommandItem>
                                                    {uniqueYears.map((y) => (
                                                        <CommandItem
                                                            key={y}
                                                            value={`TA ${y} ${y}`}
                                                            onSelect={() => {
                                                                setSelectedTahunFilter(y);
                                                                setHeaderTahunOpen(false);
                                                            }}
                                                            className="text-xs flex items-center justify-between cursor-pointer font-medium"
                                                        >
                                                            <span>TA {y}</span>
                                                            {selectedTahunFilter === y && (
                                                                <Check className="size-3.5 text-amber-600 dark:text-amber-400" />
                                                            )}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Mobile Chevron Divider */}
                            <ChevronRight className="size-3 text-muted-foreground/40 shrink-0 sm:hidden" />

                            {/* MOBILE COMPACT REGION DRAWER */}
                            <div className="flex sm:hidden items-center shrink-0 min-w-0">
                                <Drawer open={headerMobileRegionOpen} onOpenChange={setHeaderMobileRegionOpen}>
                                    <DrawerTrigger asChild>
                                        <button
                                            type="button"
                                            disabled={isFormOpen || user?.role === 'operator_desa'}
                                            className={cn(
                                                "h-7 text-[10px] sm:text-[10.5px] font-bold px-2 rounded-lg border flex items-center gap-1 max-w-[140px] xs:max-w-[170px] cursor-pointer transition-all shrink-0",
                                                selectedDesa
                                                    ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 shadow-2xs"
                                                    : "border-border bg-muted/60 text-foreground hover:bg-muted"
                                            )}
                                        >
                                            <MapPin className="size-2.5 text-indigo-500 shrink-0" />
                                            <span className="truncate">
                                                {activeDesaName
                                                    ? `${activeKecName} › ${activeDesaName}${selectedTahunFilter !== "Semua" ? ` (${selectedTahunFilter})` : ""}`
                                                    : activeKecName
                                                    ? `Kec. ${activeKecName}`
                                                    : "Pilih Wilayah"}
                                            </span>
                                            <ChevronsUpDown className="size-2 text-muted-foreground/60 shrink-0 opacity-60" />
                                        </button>
                                    </DrawerTrigger>
                                    <DrawerContent className="p-4 pt-2 pb-5 max-h-[85vh] flex flex-col bg-background">
                                        {/* Drawer Header & Summary */}
                                        <div className="flex items-center justify-between pb-2.5 border-b border-border/60 shrink-0">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                                <MapPin className="size-3.5 text-indigo-500" />
                                                <span>Pilih Wilayah &amp; Tahun Anggaran</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] font-bold">
                                                {activeKecName && (
                                                    <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                                                        {activeKecName}
                                                    </span>
                                                )}
                                                {activeDesaName && (
                                                    <span className="text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                                                        › {activeDesaName}
                                                    </span>
                                                )}
                                                {selectedTahunFilter !== "Semua" && (
                                                    <span className="text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                                                        TA {selectedTahunFilter}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-3 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                                            {/* 1. KECAMATAN SECTION */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="flex items-center justify-center size-4 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-extrabold text-[9px]">1</span>
                                                        <span>Kecamatan</span>
                                                    </div>
                                                    {activeKecName && (
                                                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Kec. {activeKecName}</span>
                                                    )}
                                                </div>

                                                {user?.role === 'operator_desa' || user?.role === 'operator_kecamatan' ? (
                                                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/50 text-xs">
                                                        <span className="text-muted-foreground font-medium">Kecamatan:</span>
                                                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{activeKecName}</span>
                                                        <span className="text-[9px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-medium">Terkunci</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto custom-scrollbar p-1.5 bg-muted/20 rounded-lg border border-border/40">
                                                        {kecamatanList.map((k) => {
                                                            const isSelected = selectedKec === k.id.toString();
                                                            return (
                                                                <button
                                                                    key={k.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedKec(k.id.toString());
                                                                        setSelectedDesa("");
                                                                        setMobileDesaSearch("");
                                                                    }}
                                                                    className={cn(
                                                                        "px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer",
                                                                        isSelected
                                                                            ? "border-indigo-500 bg-indigo-600 text-white shadow-2xs font-bold"
                                                                            : "border-border/60 bg-card hover:bg-muted text-foreground"
                                                                    )}
                                                                >
                                                                    {k.nama_kecamatan}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* 2. DESA SECTION */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="flex items-center justify-center size-4 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 font-extrabold text-[9px]">2</span>
                                                        <span>Desa</span>
                                                    </div>
                                                    {selectedKec && (
                                                        <span className="text-[10px] font-normal text-muted-foreground lowercase">
                                                            {desaList.length} desa tersedia
                                                        </span>
                                                    )}
                                                </div>

                                                {selectedKec ? (
                                                    <div className="space-y-2">
                                                        {/* Quick Search for Villages */}
                                                        {desaList.length > 8 && (
                                                            <Input
                                                                type="text"
                                                                placeholder="Cari nama desa..."
                                                                value={mobileDesaSearch}
                                                                onChange={(e) => setMobileDesaSearch(e.target.value)}
                                                                className="h-7 text-xs bg-muted/30 border-border/60 rounded-md"
                                                            />
                                                        )}

                                                        <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto custom-scrollbar p-1.5 bg-muted/20 rounded-lg border border-border/40">
                                                            {desaList
                                                                .filter((d) => !mobileDesaSearch || d.nama_desa.toLowerCase().includes(mobileDesaSearch.toLowerCase()))
                                                                .map((d) => {
                                                                    const isSelected = selectedDesa === d.id.toString();
                                                                    return (
                                                                        <button
                                                                            key={d.id}
                                                                            type="button"
                                                                            disabled={user?.role === 'operator_desa'}
                                                                            onClick={() => {
                                                                                setSelectedDesa(d.id.toString());
                                                                                setMobileDesaSearch("");
                                                                            }}
                                                                            className={cn(
                                                                                "px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1",
                                                                                isSelected
                                                                                    ? "border-blue-500 bg-blue-600 text-white shadow-2xs font-bold"
                                                                                    : "border-border/60 bg-card hover:bg-muted text-foreground"
                                                                            )}
                                                                        >
                                                                            <span>{d.nama_desa}</span>
                                                                            {isSelected && <Check className="size-3 text-white" />}
                                                                        </button>
                                                                    );
                                                                })}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-3 text-center text-xs text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border/60">
                                                        Pilih kecamatan pada langkah 1 di atas terlebih dahulu
                                                    </div>
                                                )}
                                            </div>

                                            {/* 3. TAHUN ANGGARAN SECTION */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="flex items-center justify-center size-4 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold text-[9px]">3</span>
                                                        <span>Tahun Anggaran (TA)</span>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                                        {selectedTahunFilter === "Semua" ? "Semua TA" : `TA ${selectedTahunFilter}`}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 p-1.5 bg-muted/20 rounded-lg border border-border/40">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedTahunFilter("Semua");
                                                            if (selectedDesa) {
                                                                setHeaderMobileRegionOpen(false);
                                                                setIsBottomSegmentPanelOpen(true);
                                                            }
                                                        }}
                                                        className={cn(
                                                            "px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer",
                                                            selectedTahunFilter === "Semua"
                                                                ? "border-amber-500 bg-amber-600 text-white shadow-2xs font-bold"
                                                                : "border-border/60 bg-card hover:bg-muted text-foreground"
                                                        )}
                                                    >
                                                        Semua TA
                                                    </button>
                                                    {uniqueYears.map((y) => {
                                                        const isSelected = selectedTahunFilter === y;
                                                        return (
                                                            <button
                                                                key={y}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedTahunFilter(y);
                                                                    if (selectedDesa) {
                                                                        setHeaderMobileRegionOpen(false);
                                                                        setIsBottomSegmentPanelOpen(true);
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    "px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1",
                                                                    isSelected
                                                                        ? "border-amber-500 bg-amber-600 text-white shadow-2xs font-bold"
                                                                        : "border-border/60 bg-card hover:bg-muted text-foreground"
                                                                )}
                                                            >
                                                                <span>TA {y}</span>
                                                                {isSelected && <Check className="size-3 text-white" />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Apply / Terapkan Button */}
                                        <div className="pt-3 border-t border-border/60 shrink-0">
                                            <Button
                                                type="button"
                                                onClick={() => {
                                                    if (!selectedDesa && user?.role !== 'super_admin' && user?.role !== 'admin') {
                                                        toast.warning("Silakan pilih Desa terlebih dahulu.");
                                                        return;
                                                    }
                                                    setHeaderMobileRegionOpen(false);
                                                    if (selectedDesa) {
                                                        setIsBottomSegmentPanelOpen(true);
                                                    }
                                                }}
                                                className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 cursor-pointer gap-1.5"
                                            >
                                                <Check className="size-4" />
                                                <span>
                                                    {selectedDesa
                                                        ? `Terapkan Wilayah (${activeDesaName || "Desa"}) & Buka Segmen`
                                                        : "Tampilkan Peta"}
                                                </span>
                                            </Button>
                                        </div>
                                    </DrawerContent>
                                </Drawer>
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
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={isBottomSegmentPanelOpen ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setIsBottomSegmentPanelOpen(prev => !prev)}
                                    className={cn(
                                        "h-8 text-xs gap-1.5 rounded-lg border-border/80 cursor-pointer transition-all",
                                        isBottomSegmentPanelOpen
                                            ? "bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs"
                                            : "hover:bg-muted/50 text-foreground"
                                    )}
                                >
                                    <Table2 className="size-3.5" />
                                    <span className="hidden sm:inline">Tabel Segmen</span>
                                    {realisasiList.length > 0 && (
                                        <span className={cn(
                                            "px-1.5 py-0.2 rounded-full text-[9px] font-black",
                                            isBottomSegmentPanelOpen ? "bg-white/20 text-white" : "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
                                        )}>
                                            {realisasiList.length}
                                        </span>
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                {isBottomSegmentPanelOpen ? "Sembunyikan Panel Bawah Segmen" : "Buka Panel Bawah Segmen (Tabel & Kartu Atribut)"}
                            </TooltipContent>
                        </Tooltip>
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

                    {/* Left Form Panel componentized with Responsive Drag-to-Resize */}
                    {/* DESKTOP SIDEBAR (md ke atas) */}
                    <div
                        ref={sidebarContainerRef}
                        style={{
                            width: isSidebarOpen ? `${sidebarWidth}px` : "0px",
                            minWidth: isSidebarOpen ? `${sidebarWidth}px` : "0px",
                            maxWidth: isSidebarOpen ? `${sidebarWidth}px` : "0px",
                        }}
                        className={cn(
                            "hidden md:flex md:relative md:h-full md:flex-col md:shrink-0",
                            isSidebarDragging ? "transition-none select-none" : "transition-[width,min-width,max-width] duration-300 ease-in-out",
                            isSidebarOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-full pointer-events-none overflow-hidden"
                        )}
                    >
                        <InfrastrukturPanel
                            tipes={tipes}
                            activeTipe={activeTipe}
                            setActiveTipe={setActiveTipe}
                            className="w-full h-full flex-1 min-h-0 border-r border-border"
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
                                loadDesaData(selectedDesa, activeTipe?.kode, { skipFitBounds: true, silent: true });
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
                            onSubmitLaporanRevisi={handleSubmitLaporanRevisi}
                            onOpenBottomPanel={() => setIsBottomSegmentPanelOpen(true)}
                        />

                        {/* Desktop Vertical Drag Resize Handle Divider */}
                        {isSidebarOpen && (
                            <div
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    setIsSidebarDragging(true);
                                }}
                                onDoubleClick={() => {
                                    setSidebarWidth(384);
                                    try {
                                        localStorage.setItem("gigis_sidebar_width", "384");
                                    } catch (e) { }
                                }}
                                className={cn(
                                    "absolute top-0 bottom-0 -right-2 w-4 z-50 cursor-col-resize items-center justify-center group select-none touch-none hover:bg-indigo-500/10 flex transition-colors",
                                    isSidebarDragging && "bg-indigo-500/20"
                                )}
                                title="Tarik ke kiri atau ke kanan untuk mengubah lebar panel infrastruktur (Klik ganda untuk reset lebar ke 384px)"
                            >
                                <div className={cn(
                                    "w-1 h-10 rounded-full bg-border/80 group-hover:bg-indigo-500 group-hover:h-16 group-hover:w-1.5 transition-all duration-150 shadow-xs",
                                    isSidebarDragging && "bg-indigo-600 dark:bg-indigo-400 h-20 w-1.5 shadow-md"
                                )} />
                            </div>
                        )}
                    </div>

                    {/* MOBILE BOTTOM SHEET PANEL (di bawah md) with Vertical Drag */}
                    <div
                        style={{
                            height: isSidebarOpen ? `${mobileSheetHeight}vh` : "0px",
                            maxHeight: "92vh",
                            minHeight: isSidebarOpen ? "180px" : "0px",
                        }}
                        className={cn(
                            "md:hidden fixed inset-x-0 bottom-0 z-40 flex flex-col bg-card rounded-t-2xl shadow-2xl border-t border-border overflow-hidden",
                            isMobileSheetDragging ? "transition-none select-none" : "transition-[height,transform,opacity] duration-300 ease-in-out",
                            isSidebarOpen
                                ? "opacity-100 translate-y-0 pointer-events-auto"
                                : "opacity-0 translate-y-full pointer-events-none"
                        )}
                    >
                        {/* Mobile Top Drag Handle Bar */}
                        <div
                            onTouchStart={() => setIsMobileSheetDragging(true)}
                            onDoubleClick={() => setMobileSheetHeight(prev => prev > 60 ? 40 : 75)}
                            className="flex items-center justify-between px-3.5 py-2 shrink-0 bg-muted/60 hover:bg-muted active:bg-indigo-500/20 cursor-row-resize touch-none select-none border-b border-border/40"
                            title="Tarik ke atas atau ke bawah untuk mengubah tinggi panel (Klik ganda untuk memperbesar/memperkecil)"
                        >
                            <div className="w-7" />
                            <div className={cn(
                                "w-12 h-1 rounded-full bg-muted-foreground/40 transition-all",
                                isMobileSheetDragging && "w-20 bg-indigo-500 h-1.5"
                            )} />
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setIsSidebarOpen(false)}
                                className="size-7 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                                title="Tutup panel bawah infrastruktur"
                            >
                                <PanelBottomClose className="size-4" />
                            </Button>
                        </div>

                        <InfrastrukturPanel
                            tipes={tipes}
                            activeTipe={activeTipe}
                            setActiveTipe={setActiveTipe}
                            className="w-full h-full flex-1 min-h-0"
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
                                loadDesaData(selectedDesa, activeTipe?.kode, { skipFitBounds: true, silent: true });
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
                            onSubmitLaporanRevisi={handleSubmitLaporanRevisi}
                            onOpenBottomPanel={() => setIsBottomSegmentPanelOpen(true)}
                        />
                    </div>

                    {/* Right Panel: OpenLayers Map Component */}
                    <div className="flex-1 h-full relative flex flex-col min-h-0 select-none overflow-hidden">
                        <div
                            ref={mapElement}
                            className="absolute inset-0 w-full h-full z-0 bg-slate-50 dark:bg-slate-950 overflow-hidden [&_.ol-layer_canvas]:will-change-transform"
                            style={{ transform: 'translateZ(0)', willChange: 'transform' }}
                        />

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

                            {/* Floating Active Digitizing HUD */}
                            {isFormOpen && (
                                <div className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2.5 
                                                bg-slate-900/90 dark:bg-slate-950/95 text-white text-xs font-semibold px-4 py-2 rounded-2xl shadow-2xl border border-white/10
                                                backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-3 z-30">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                        <span className="font-bold text-emerald-400">
                                            {digitizeMode === "otomatis"
                                                ? "Auto-Trace Jalan"
                                                : digitizeMode === "dimensions"
                                                    ? "Area Dimensi"
                                                    : isReshaping
                                                        ? "Ubah Bentuk Geometri"
                                                        : `Digitasi ${activeTipe?.nama || "Segmen"}`}
                                        </span>
                                    </div>

                                    <div className="h-3.5 w-px bg-white/20" />

                                    <div className="flex items-center gap-2 font-mono text-[11px]">
                                        <span className="text-slate-300">
                                            Panjang: <strong className="text-white font-bold">{drawnLength > 0 ? `${Number(drawnLength).toFixed(1)}m` : "0m"}</strong>
                                        </span>
                                        <span className="text-slate-500">•</span>
                                        <span className="text-slate-300">
                                            Node: <strong className="text-white font-bold">{coordsCount}</strong>
                                        </span>
                                    </div>

                                    <div className="h-3.5 w-px bg-white/20" />

                                    <div className="flex items-center gap-1.5">
                                        {drawnCoords && drawnCoords.length >= 2 && (
                                            <Button
                                                size="sm"
                                                onClick={() => setIsAttributeDialogOpen(true)}
                                                className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-sm gap-1 cursor-pointer"
                                            >
                                                <Check className="size-3" />
                                                <span>Selesai</span>
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={closeForm}
                                            className="h-7 px-2 text-slate-300 hover:text-white hover:bg-white/10 text-[11px] rounded-lg gap-1 cursor-pointer"
                                        >
                                            <X className="size-3" />
                                            <span>Batal</span>
                                        </Button>
                                    </div>
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
                                                                        {!isLocked && canDigitize(user) && (
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

                        {/* Top-Left Floating Controls: Show/Hide Infrastruktur Panel & Snapshot Status Capsule */}
                        <div className="absolute top-4 left-4 z-30 flex items-center gap-2 pointer-events-auto select-none max-w-[calc(100vw-120px)] sm:max-w-none">
                            {/* 1. Toggle Show/Hide Panel Button */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        onClick={() => setIsSidebarOpen(prev => !prev)}
                                        className="h-10 w-10 shrink-0 rounded-xl border border-border bg-card dark:bg-slate-900 shadow-md hover:bg-muted dark:hover:bg-slate-800 text-foreground transition-all duration-200 cursor-pointer active:scale-95"
                                    >
                                        {/* Desktop: Panel Kiri (>= md) */}
                                        <span className="hidden md:flex items-center justify-center">
                                            {isSidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
                                        </span>
                                        {/* Mobile: Bottom Sheet (< md) */}
                                        <span className="flex md:hidden items-center justify-center">
                                            {isSidebarOpen ? <PanelBottomClose className="size-4" /> : <PanelBottomOpen className="size-4" />}
                                        </span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs font-semibold">
                                    {isSidebarOpen ? "Sembunyikan Panel Infrastruktur" : "Tampilkan Panel Infrastruktur"}
                                </TooltipContent>
                            </Tooltip>

                            {/* 2. Smart Snapshot / Berita Acara Status Capsule */}
                            {selectedDesa && (() => {
                                const reportStatus = activeSnapshotLaporan?.status;
                                const targetYear = selectedTahunFilter !== "Semua" ? selectedTahunFilter : (activeSnapshotLaporan?.tahun_anggaran || new Date().getFullYear().toString());
                                const nomorBa = activeSnapshotLaporan?.nomor_ba;

                                // Condition 1: FINAL (Sah & Terkunci)
                                if (reportStatus === "Final" || isYearLocked) {
                                    return (
                                        <div className="flex items-center gap-1.5 p-1 pl-2.5 rounded-xl border bg-card/90 dark:bg-slate-900/90 backdrop-blur-md shadow-md border-emerald-500/30 animate-in fade-in zoom-in-95">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="flex items-center justify-center size-6 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                                                    <Lock className="size-3.5" />
                                                </span>
                                                <div className="flex flex-col min-w-0 leading-tight">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 truncate">
                                                            BA Final
                                                        </span>
                                                        <span className="text-[10px] font-semibold text-muted-foreground hidden sm:inline">
                                                            • TA {targetYear}
                                                        </span>
                                                    </div>
                                                    {nomorBa && (
                                                        <span className="text-[9.5px] font-mono text-muted-foreground truncate max-w-[130px] hidden md:inline">
                                                            {nomorBa}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 ml-1 shrink-0">
                                                <Button
                                                    size="sm"
                                                    onClick={() => navigate(`/admin/monitoring/dokumen-infrastruktur?tahun=${targetYear}&desa=${selectedDesa}&kec=${selectedKec}`)}
                                                    className="h-7 px-2.5 text-xs font-bold gap-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs cursor-pointer"
                                                    title="Buka dan cetak Berita Acara di menu Dokumen Infrastruktur"
                                                >
                                                    <FileText className="size-3.5" />
                                                    <span className="hidden sm:inline">Buka Dokumen BA</span>
                                                    <span className="sm:hidden">Dokumen</span>
                                                </Button>

                                                {isBappedaOrAdmin && (
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="size-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                                                                title="Opsi Berita Acara"
                                                            >
                                                                <MoreHorizontal className="size-3.5" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent align="start" className="w-56 p-1.5 shadow-xl bg-card border-border">
                                                            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50">
                                                                Opsi Berita Acara
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => triggerPrintBeritaAcaraDialog(selectedDesa, targetYear)}
                                                                className="w-full text-left px-2 py-1.5 mt-1 rounded-md text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 flex items-center gap-2 cursor-pointer transition-colors"
                                                            >
                                                                <Pencil className="size-3.5" />
                                                                <span>Edit Metadata / Snapshot</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setRevertLaporanOpen(true)}
                                                                className="w-full text-left px-2 py-1.5 mt-0.5 rounded-md text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 flex items-center gap-2 cursor-pointer transition-colors"
                                                            >
                                                                <RotateCcw className="size-3.5" />
                                                                <span>Buka Kunci / Revisi BA</span>
                                                            </button>
                                                        </PopoverContent>
                                                    </Popover>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }

                                // Condition 2: SUBMITTED (Terkirim & Menunggu Verifikasi Bappeda)
                                if (reportStatus === "Submitted") {
                                    return (
                                        <div className="flex items-center gap-1.5 p-1 pl-2.5 rounded-xl border bg-card/90 dark:bg-slate-900/90 backdrop-blur-md shadow-md border-blue-500/30 animate-in fade-in zoom-in-95">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="flex items-center justify-center size-6 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
                                                    <Sparkles className="size-3.5" />
                                                </span>
                                                <div className="flex flex-col min-w-0 leading-tight">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 truncate">
                                                            Diajukan ke Bappeda
                                                        </span>
                                                        <span className="text-[10px] font-semibold text-muted-foreground hidden sm:inline">
                                                            • TA {targetYear}
                                                        </span>
                                                    </div>
                                                    <span className="text-[9.5px] text-muted-foreground hidden md:inline">
                                                        Siap diverifikasi &amp; disahkan
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 ml-1 shrink-0">
                                                {isBappedaOrAdmin ? (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => triggerPrintBeritaAcaraDialog(selectedDesa, targetYear)}
                                                        className="h-7 px-2.5 text-xs font-bold gap-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs cursor-pointer"
                                                        title="Buka form verifikasi snapshot dan pengesahan Berita Acara"
                                                    >
                                                        <Sparkles className="size-3.5" />
                                                        <span className="hidden sm:inline">Finalisasi &amp; Sahkan BA</span>
                                                    </Button>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                                        Menunggu Verifikasi
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }

                                // Condition 3: DRAFT / REVISI
                                if (reportStatus === "Draft" || reportStatus === "Revisi") {
                                    const isRevisi = reportStatus === "Revisi";
                                    return (
                                        <div className="flex items-center gap-1.5 p-1 pl-2.5 rounded-xl border bg-card/90 dark:bg-slate-900/90 backdrop-blur-md shadow-md border-amber-500/30 animate-in fade-in zoom-in-95">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="flex items-center justify-center size-6 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                                                    <Clock className="size-3.5" />
                                                </span>
                                                <div className="flex flex-col min-w-0 leading-tight">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 truncate">
                                                            {isRevisi ? "Perlu Revisi" : "Draft Penugasan"}
                                                        </span>
                                                        <span className="text-[10px] font-semibold text-muted-foreground hidden sm:inline">
                                                            • TA {targetYear}
                                                        </span>
                                                    </div>
                                                    <span className="text-[9.5px] text-muted-foreground hidden md:inline">
                                                        {isRevisi ? "Menunggu perbaikan kecamatan" : "Sedang dikerjakan kecamatan"}
                                                    </span>
                                                </div>
                                            </div>

                                            {isBappedaOrAdmin && (
                                                <div className="flex items-center gap-1 ml-1 shrink-0">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => triggerPrintBeritaAcaraDialog(selectedDesa, targetYear)}
                                                        className="h-7 px-2 text-xs font-bold gap-1 rounded-lg border-indigo-500/30 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 cursor-pointer"
                                                    >
                                                        <Sparkles className="size-3.5" />
                                                        <span className="hidden sm:inline">Sahkan BA</span>
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                // Condition 4: BELUM ADA PENUGASAN
                                return (
                                    <div className="flex items-center gap-1.5 p-1 pl-2.5 rounded-xl border bg-card/90 dark:bg-slate-900/90 backdrop-blur-md shadow-md border-border/80 animate-in fade-in zoom-in-95">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="flex items-center justify-center size-6 rounded-lg bg-muted text-muted-foreground shrink-0">
                                                <FileText className="size-3.5" />
                                            </span>
                                            <div className="flex flex-col min-w-0 leading-tight">
                                                <span className="text-[11px] font-semibold text-foreground truncate">
                                                    Belum Ada Penugasan
                                                </span>
                                                <span className="text-[9.5px] text-muted-foreground hidden md:inline">
                                                    TA {targetYear}
                                                </span>
                                            </div>
                                        </div>

                                        {isBappedaOrAdmin ? (
                                            <div className="flex items-center gap-1 ml-1 shrink-0">
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        const url = `/admin/monitoring/dokumen-infrastruktur?tahun=${targetYear}&desa=${selectedDesa}&kec=${selectedKec}&action=create_draft`;
                                                        navigate(url);
                                                    }}
                                                    className="h-7 px-2.5 text-xs font-bold gap-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs cursor-pointer"
                                                    title="Buka modul Dokumen Infrastruktur untuk membuat draft penugasan & memilih plotting anggaran"
                                                >
                                                    <ExternalLink className="size-3.5" />
                                                    <span>Buat Draft Penugasan</span>
                                                </Button>
                                            </div>
                                        ) : (
                                            <span className="px-2 py-0.5 text-[10px] text-muted-foreground italic hidden sm:inline">
                                                Menunggu Bappeda
                                            </span>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Floating Vertical QGIS-Style Digitizing Tool Menubar on Map (diletakkan di bawah tombol show hide panel) */}
                        {((isFormOpen || isDrawing || isReshaping || digitizeMode === "dimensions" || drawnCoords.length > 0 || coordsCount > 0) && !isAttributeDialogOpen && canDigitize(user)) && (
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
                                    ) : activeRightTab === "simbologi" ? (
                                        <>
                                            <Palette className="h-4 w-4 text-indigo-600" />
                                            Simbologi & Legenda
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
                                    <TabsList className="w-full grid h-9 grid-cols-5">
                                        <TabsTrigger value="katalog" className="text-[8.5px] uppercase font-bold tracking-tight">Katalog</TabsTrigger>
                                        <TabsTrigger value="layers" className="text-[8.5px] uppercase font-bold tracking-tight">
                                            Layer
                                            {activeOverlays.length > 0 && (
                                                <span className="ml-1 px-1.5 py-0.2 text-[8px] bg-blue-100 text-blue-700 rounded-full font-black">
                                                    {activeOverlays.length}
                                                </span>
                                            )}
                                        </TabsTrigger>
                                        <TabsTrigger value="simbologi" className="text-[8.5px] uppercase font-bold tracking-tight">Simbologi</TabsTrigger>
                                        <TabsTrigger value="acuan" className="text-[8.5px] uppercase font-bold tracking-tight">Acuan</TabsTrigger>
                                        <TabsTrigger value="pengukuran" className="text-[8.5px] uppercase font-bold tracking-tight">Ukur</TabsTrigger>
                                    </TabsList>
                                </div>

                                {/* Tab Content: Simbologi & Legenda */}
                                {activeRightTab === "simbologi" && (
                                    <TabsContent value="simbologi" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden bg-background">
                                        <ThematicSymbologyPanel />
                                    </TabsContent>
                                )}

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

                        {/* Floating Quick Action: Mulai Digitasi Segmen Baru di Pojok Kiri Bawah (Responsif terhadap Panel Bawah) */}
                        {selectedDesa && activeTipe && !isFormOpen && !isDrawing && !isReshaping && !isSplitMode && (
                            isBappedaOrAdmin || (
                                !isYearLocked &&
                                activeSnapshotLaporan?.status !== 'Final' &&
                                activeSnapshotLaporan?.status !== 'Submitted' &&
                                (activeSnapshotLaporan && (activeSnapshotLaporan.status === 'Draft' || activeSnapshotLaporan.status === 'Revisi'))
                            )
                        ) && (
                            <div
                                style={{
                                    bottom: isBottomSegmentPanelOpen ? `${bottomPanelHeight + 16}px` : "16px",
                                }}
                                className="absolute left-4 z-30 transition-[bottom,transform] duration-300 ease-out animate-in fade-in slide-in-from-bottom-2 select-none"
                            >
                                <Button
                                    size="sm"
                                    onClick={handleStartDigitasiNew}
                                    className="h-9 px-2.5 sm:px-3.5 gap-1.5 sm:gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 backdrop-blur-md border border-emerald-400/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                                >
                                    <Plus className="size-4" />
                                    <span className="hidden sm:inline">Mulai Digitasi</span>
                                    {selectedTahunFilter !== "Semua" && (
                                        <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-black uppercase">
                                            TA {selectedTahunFilter}
                                        </span>
                                    )}
                                </Button>
                            </div>
                        )}

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

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        onClick={() => {
                                            if (isRightPanelOpen && activeRightTab === "simbologi") {
                                                setIsRightPanelOpen(false);
                                            } else {
                                                setIsRightPanelOpen(true);
                                                setActiveRightTab("simbologi");
                                            }
                                            setIsDetailPanelOpen(false);
                                        }}
                                        className={cn(
                                            "h-10 w-10 md:h-9 md:w-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all duration-300",
                                            isRightPanelOpen && activeRightTab === "simbologi" && "bg-indigo-600 dark:bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 hover:text-white"
                                        )}
                                    >
                                        <Palette className="size-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left">Simbologi & Legenda</TooltipContent>
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

                        {/* Floating Basemap Switcher (Responsively floats above BottomSegmentPanel) */}
                        <BasemapToggle
                            basemaps={basemapsList}
                            activeBasemap={activeBasemap}
                            onBasemapChange={setActiveBasemap}
                            style={{
                                bottom: isBottomSegmentPanelOpen ? `${bottomPanelHeight + 16}px` : "16px",
                            }}
                            className={cn(
                                "absolute transition-[bottom,right,transform] duration-300 ease-out z-30",
                                isRightPanelOpen ? "right-4 sm:right-[400px]" : "right-4"
                            )}
                        />

                        {/* Bottom Segment Panel Component */}
                        <BottomSegmentPanel
                            isOpen={isBottomSegmentPanelOpen}
                            onToggleOpen={() => setIsBottomSegmentPanelOpen(prev => !prev)}
                            panelHeight={bottomPanelHeight}
                            onPanelHeightChange={setBottomPanelHeight}
                            realisasiList={realisasiList}
                            activeTipe={activeTipe}
                            selectedKec={selectedKec}
                            selectedDesa={selectedDesa}
                            desaName={activeDesaName}
                            kecName={activeKecName}
                            selectedTahunFilter={selectedTahunFilter}
                            setSelectedTahunFilter={setSelectedTahunFilter}
                            zoomToSegment={zoomToSegment}
                            onHoverSegment={setHoveredSegmentId}
                            handleEditAttributesOnly={handleEditAttributesOnly}
                            handleEditGeometryAndAttributes={handleEditGeometryAndAttributes}
                            handleSplitSegmen={handleStartSplitMode}
                            handleDelete={handleDelete}
                            onStartDigitasi={handleStartDigitasiNew}
                            onKirimDigitasi={(segment) => {
                                setSegmentToKirim(segment);
                                setBatchSegmentsToKirim([]);
                                setIsKirimDialogOpen(true);
                            }}
                            onBatchKirimDigitasi={(segments) => {
                                setBatchSegmentsToKirim(segments);
                                setSegmentToKirim(null);
                                setIsKirimDialogOpen(true);
                            }}
                            onRefreshSegments={() => {
                                if (!selectedDesa) {
                                    toast.warning("Silakan pilih wilayah desa terlebih dahulu.");
                                    return;
                                }
                                loadDesaData(selectedDesa, activeTipe?.kode, { skipFitBounds: true, silent: true });
                                toast.success("Daftar segmen realisasi berhasil diperbarui.");
                            }}
                            lockedSegmenIds={lockedSegmenIds}
                            isYearLocked={isYearLocked}
                            activeSnapshotLaporan={activeSnapshotLaporan}
                            isLoading={isLoading}
                            className={cn(
                                isRightPanelOpen && "sm:right-[380px]"
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
                                                        {(() => {
                                                            const candidate = snappedRoad?.kode_ruas || editingSegmentData?.kode_ruas;
                                                            if (candidate && !isUUID(candidate)) {
                                                                return candidate;
                                                            }
                                                            const parentId = snappedRoad?.id || editingSegmentData?.parent_id;
                                                            if (parentId && refSourceRef.current) {
                                                                const feat = refSourceRef.current.getFeatures().find(f => {
                                                                    const p = f.getProperties();
                                                                    return String(p.id) === String(parentId) || String(f.getId()) === String(parentId);
                                                                });
                                                                if (feat) {
                                                                    const p = feat.getProperties();
                                                                    const k = p.kode_ruas || p.KODE_RUAS || p.no_ruas;
                                                                    if (k && !isUUID(k)) return String(k);
                                                                }
                                                            }
                                                            return "(Tanpa Kode)";
                                                        })()}
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
                                                        <SelectTrigger className="w-full border-emerald-500/40 shadow-xs">
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
                                                <Label className="text-sm font-medium">
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
                                                
                                                required
                                            />
                                        </div>
                                    )}

                                    {/* Wilayah Administrasi (Kecamatan & Desa) */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3 rounded-xl bg-muted/30 border border-border/70">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                                                    <MapPin className="size-3.5 text-blue-500" />
                                                    <span>Kecamatan</span>
                                                    <span className="text-rose-500">*</span>
                                                </Label>
                                                {!isBappedaOrAdmin && user?.role === 'operator_kecamatan' && (
                                                    <span className="text-[10px] text-muted-foreground font-normal">(Terkunci Wilayah)</span>
                                                )}
                                            </div>
                                            <Select
                                                value={dialogKec || undefined}
                                                onValueChange={handleDialogKecChange}
                                                disabled={!isBappedaOrAdmin && (user?.role === 'operator_kecamatan' || user?.role === 'operator_desa')}
                                            >
                                                <SelectTrigger className="w-full h-9 text-xs bg-background">
                                                    <SelectValue placeholder="Pilih Kecamatan" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-popover border-border z-[100] max-h-[220px]">
                                                    {kecamatanList.map(kec => (
                                                        <SelectItem key={kec.id} value={kec.id.toString()} className="text-xs py-1.5 cursor-pointer">
                                                            {kec.nama_kecamatan}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                                                    <Building2 className="size-3.5 text-emerald-500" />
                                                    <span>Desa / Kelurahan</span>
                                                    <span className="text-rose-500">*</span>
                                                </Label>
                                                {isLoadingDialogDesa && (
                                                    <Loader2 className="size-3 animate-spin text-blue-500" />
                                                )}
                                            </div>
                                            <Select
                                                value={dialogDesa || undefined}
                                                onValueChange={val => setDialogDesa(val)}
                                                disabled={isLoadingDialogDesa || (!isBappedaOrAdmin && user?.role === 'operator_desa')}
                                            >
                                                <SelectTrigger className="w-full h-9 text-xs bg-background">
                                                    <SelectValue placeholder={isLoadingDialogDesa ? "Memuat desa..." : "Pilih Desa"} />
                                                </SelectTrigger>
                                                <SelectContent className="bg-popover border-border z-[100] max-h-[220px]">
                                                    {(dialogDesaList.length > 0 ? dialogDesaList : (dialogKec === selectedKec ? desaList : [])).map(desa => (
                                                        <SelectItem key={desa.id} value={desa.id.toString()} className="text-xs py-1.5 cursor-pointer">
                                                            {desa.nama_desa}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div className="space-y-1.5">
                                            <Label className="text-sm font-medium">Kode Ruas</Label>
                                            <Input
                                                value={
                                                    (() => {
                                                        const candidate = snappedRoad?.kode_ruas || editingSegmentData?.kode_ruas;
                                                        if (candidate && !isUUID(candidate)) {
                                                            return candidate;
                                                        }
                                                        const parentId = snappedRoad?.id || editingSegmentData?.parent_id;
                                                        if (parentId && refSourceRef.current) {
                                                            const feat = refSourceRef.current.getFeatures().find(f => {
                                                                const p = f.getProperties();
                                                                return String(p.id) === String(parentId) || String(f.getId()) === String(parentId);
                                                            });
                                                            if (feat) {
                                                                const p = feat.getProperties();
                                                                const k = p.kode_ruas || p.KODE_RUAS || p.no_ruas;
                                                                if (k && !isUUID(k)) return String(k);
                                                            }
                                                        }
                                                        return "0";
                                                    })()
                                                }
                                                readOnly
                                                className="font-mono font-bold bg-muted"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-sm font-medium">
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
                                                className="font-mono font-bold"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div className="space-y-1.5">
                                            <Label className="text-sm font-medium">Lebar (Meter)</Label>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                value={lebar}
                                                onChange={e => setLebar(e.target.value)}
                                                
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-sm font-medium">Tahun Anggaran</Label>
                                            <Input
                                                type="number"
                                                value={tahun}
                                                onChange={e => setTahun(e.target.value)}
                                                
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div className="space-y-1.5">
                                            <Label className="text-sm font-medium">Kondisi Realisasi</Label>
                                            <Select value={kondisi || undefined} onValueChange={setKondisi}>
                                                <SelectTrigger >
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
                                            <Label className="text-sm font-medium">Status Kondisi</Label>
                                            <Select value={statusKondisi || undefined} onValueChange={setStatusKondisi}>
                                                <SelectTrigger >
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
                                            <Label className="text-sm font-medium">Sumber Data</Label>
                                            <Input
                                                value={sumberData}
                                                onChange={e => setSumberData(e.target.value)}
                                                
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-sm font-medium">Sumber Dana</Label>
                                            <Select value={sumberDana || undefined} onValueChange={setSumberDana}>
                                                <SelectTrigger >
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
                                                <Label className="text-sm font-medium whitespace-nowrap">Status Aset</Label>
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
                                                <SelectTrigger className="w-full h-9.5 text-xs bg-background border-input focus:ring-1 focus:ring-blue-500">
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
                                                    className="h-9.5 text-xs bg-background border-input mt-1.5 focus:border-blue-500 animate-in fade-in-50 duration-200"
                                                />
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between gap-1.5 h-5">
                                                <Label className="text-sm font-medium whitespace-nowrap shrink-0">Plotting Anggaran</Label>
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
                                                className="w-full h-9.5 text-xs"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium">Verifikator (User Login)</Label>
                                        <Input
                                            value={currentUserName}
                                            readOnly
                                            className="h-9.5 bg-muted text-muted-foreground font-semibold text-xs cursor-not-allowed"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium">Keterangan</Label>
                                        <textarea
                                            value={keterangan}
                                            onChange={e => setKeterangan(e.target.value)}
                                            placeholder="Tulis keterangan tambahan..."
                                            className="w-full min-h-[70px] bg-background border border-input text-xs rounded-md p-3 text-foreground focus:border-blue-500 focus:outline-none"
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
                                                                    <Label className="text-sm font-medium">
                                                                        {attr.label || attr.key}
                                                                        {attr.required && <span className="text-rose-500 ml-0.5">*</span>}
                                                                    </Label>
                                                                    {attr.type === 'select' ? (
                                                                        <Select
                                                                            value={val ? String(val) : undefined}
                                                                            onValueChange={handleAttrChange}
                                                                        >
                                                                            <SelectTrigger >
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
                                                                            className="w-full min-h-[60px] bg-background border border-input text-xs rounded-md p-3 text-foreground focus:border-blue-500 focus:outline-none"
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
                                                                            
                                                                            required={attr.required}
                                                                        />
                                                                    ) : attr.type === 'date' ? (
                                                                        <Input
                                                                            type="date"
                                                                            value={String(val)}
                                                                            onChange={e => handleAttrChange(e.target.value)}
                                                                            
                                                                            required={attr.required}
                                                                        />
                                                                    ) : (
                                                                        <Input
                                                                            type="text"
                                                                            value={String(val)}
                                                                            onChange={e => handleAttrChange(e.target.value)}
                                                                            placeholder={`Masukkan ${attr.label}...`}
                                                                            
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
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-400 rounded-lg flex items-start gap-2 text-[11px] leading-tight">
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
                                        className="h-9.5 px-4 text-xs font-semibold rounded-md border-border hover:bg-muted"
                                    >
                                        Batal
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="h-9.5 px-5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-md"
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

                    <TipeInfrastrukturDialog
                        open={isSelectTipeDialogOpen}
                        onOpenChange={setIsSelectTipeDialogOpen}
                        tipes={tipes}
                        activeTipe={activeTipe}
                        onSelectTipe={handleSelectTipe}
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
                        segments={batchSegmentsToKirim}
                        tipeNama={activeTipe?.nama || "Infrastruktur"}
                        namaKecamatan={activeKecName}
                        isSubmitting={isSubmittingKirim}
                        onConfirm={handleConfirmKirimDigitasi}
                        onCancel={() => {
                            if (!isSubmittingKirim) {
                                setIsKirimDialogOpen(false);
                                setSegmentToKirim(null);
                                setBatchSegmentsToKirim([]);
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

                    {/* Dialog: Buka Kunci / Kembalikan Berita Acara ke Status Draft (Bappeda) */}
                    <Dialog open={revertLaporanOpen} onOpenChange={setRevertLaporanOpen}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                    <RotateCcw className="size-5" />
                                    <span>Buka Kunci &amp; Revisi Berita Acara</span>
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    Berita Acara TA {selectedTahunFilter} untuk Desa <strong>{activeDesaName}</strong> akan dikembalikan ke status <strong>Draft / Revisi</strong>.
                                    Kunci tahun anggaran dan segmen akan dibuka sehingga operator dapat melakukan perbaikan data.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-3 py-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-foreground">
                                        Catatan / Alasan Pembukaan Kunci
                                    </label>
                                    <textarea
                                        value={revertCatatanInput}
                                        onChange={(e) => setRevertCatatanInput(e.target.value)}
                                        placeholder="Contoh: Perbaikan geometri segmen jalan poros batas timur desa sesuai hasil survey lapangan ulang."
                                        rows={3}
                                        className="w-full text-xs p-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                                    />
                                </div>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button
                                    variant="outline"
                                    onClick={() => setRevertLaporanOpen(false)}
                                    disabled={isRevertingLaporan}
                                    className="h-8 text-xs cursor-pointer"
                                >
                                    Batal
                                </Button>
                                <Button
                                    onClick={handleRevertToDraft}
                                    disabled={isRevertingLaporan}
                                    className="h-8 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 gap-1.5 cursor-pointer"
                                >
                                    {isRevertingLaporan ? (
                                        <Loader2 className="size-3.5 animate-spin" />
                                    ) : (
                                        <RotateCcw className="size-3.5" />
                                    )}
                                    <span>Buka Kunci &amp; Kembalikan ke Draft</span>
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <HelpDialog open={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
                </div>
            </div>

        </>
    );
}
