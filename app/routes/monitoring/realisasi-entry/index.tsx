import React, { useEffect, useState, useRef } from "react";
import type { MetaFunction } from "react-router";
import { toast } from "sonner";
import {
    Plus,
    Trash2,
    Check,
    X,
    MapPin,
    AlertCircle,
    Send,
    Eye,
    FileText,
    Layers,
    Edit3,
    Calendar,
    Loader2,
    ChevronsUpDown,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Building2,
    Map,
    Info,
    CheckCircle2,
    Clock,
    XCircle,
    Crosshair,
    LocateFixed,
    Building,
    RotateCw,
    Search,
    Table as TableIcon,
    PanelLeftClose,
    PanelLeftOpen,
    PanelBottomClose,
    PanelBottomOpen,
    ShieldCheck,
    ArrowRight,
    ArrowDown,
    Navigation,
    Route,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "~/components/ui/tooltip";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "~/components/ui/sheet";
import { UsulanDesaPagination } from "~/features/usulan-desa/components/UsulanDesaPagination";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "~/components/ui/popover";
import {
    Command,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
} from "~/components/ui/command";
import { authService } from "~/services/auth.service";
import { realisasiService, type FormRealisasi, type RealisasiEntry, type RealisasiTitik } from "~/features/monitoring/services/realisasi.service";
import { kecamatanService, type Kecamatan } from "~/services/kecamatan";
import { desaService, type Desa } from "~/services/desa";
import { jalanService } from "~/services/jalan";
import { MapControls } from "~/features/monitoring/components/MapControls";
import { BasemapToggle } from "~/features/monitoring/components/BasemapToggle";

// OpenLayers imports
import OLMap from "ol/Map";
import View from "ol/View";
import Feature from "ol/Feature";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import XYZ from "ol/source/XYZ";
import { fromLonLat, toLonLat } from "ol/proj";
import Point from "ol/geom/Point";
import LineString from "ol/geom/LineString";
import GeoJSON from "ol/format/GeoJSON";
import { Style, Stroke, Fill, Circle as CircleStyle, Text as StyleText } from "ol/style";
import { defaults as defaultInteractions } from "ol/interaction/defaults";
import "ol/ol.css";

export const meta: MetaFunction = () => {
    return [
        { title: "Input & Verifikasi Realisasi - MELAROSA" },
        { name: "description", content: "Inventarisasi dan Peta Spasial Realisasi Pembangunan Infrastruktur Desa." },
    ];
};

const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        
        if (diffMs < 60000) return "Baru saja";
        
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 60) return `${diffMins} menit yang lalu`;
        if (diffHours < 24) return `${diffHours} jam yang lalu`;
        if (diffDays < 7) return `${diffDays} hari yang lalu`;
        
        return date.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    } catch {
        return dateStr;
    }
};

const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
        draft: {
            label: "Draft",
            icon: <Clock className="w-2.5 h-2.5" />,
            cls: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
        },
        submitted: {
            label: "Dikirim",
            icon: <Send className="w-2.5 h-2.5" />,
            cls: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
        },
        verified: {
            label: "Disetujui",
            icon: <CheckCircle2 className="w-2.5 h-2.5" />,
            cls: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
        },
        rejected: {
            label: "Ditolak",
            icon: <XCircle className="w-2.5 h-2.5" />,
            cls: "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800",
        },
    };
    const s = map[status] || map.draft;
    return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold", s.cls)}>
            {s.icon}
            {s.label}
        </span>
    );
};

const BASEMAP_URLS: Record<string, string> = {
    'google-sat': 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    'google-hybrid': 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    'google-road': 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    'osm': 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    'carto-light': 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    'carto-dark': 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    'satellite': 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

const getBasemapSource = (basemapId: string) => {
    if (basemapId === "osm") {
        return new OSM({ crossOrigin: "anonymous" });
    }
    const url = BASEMAP_URLS[basemapId] || BASEMAP_URLS["google-sat"];
    return new XYZ({
        url,
        crossOrigin: "anonymous",
    });
};

export default function RealisasiEntryPage() {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [entries, setEntries] = useState<RealisasiEntry[]>([]);
    const [openForms, setOpenForms] = useState<FormRealisasi[]>([]);
    const [allForms, setAllForms] = useState<FormRealisasi[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal Dialog state for Form Entry (Create & Edit)
    const [isOpenEntryDialog, setIsOpenEntryDialog] = useState(false);

    // Map & Layout Split State
    const [mapHeight, setMapHeight] = useState<number>(340);
    const [isCoordManagerOpen, setIsCoordManagerOpen] = useState(false);
    const [activeBasemap, setActiveBasemap] = useState<string>("google-sat");
    const isResizing = useRef(false);
    const resizeStartY = useRef(0);
    const resizeStartHeight = useRef(0);

    // Filters state
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [filterForm, setFilterForm] = useState<string>("all");
    const [filterLimit, setFilterLimit] = useState<string>("25");
    const [page, setPage] = useState<number>(1);
    const [paginationMeta, setPaginationMeta] = useState<{ total: number; totalPages: number }>({ total: 0, totalPages: 1 });
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");

    // Form Entry state
    const [selectedFormId, setSelectedFormId] = useState<string>("");
    const [namaKegiatan, setNamaKegiatan] = useState("");
    const [deskripsi, setDeskripsi] = useState("");
    const [volume, setVolume] = useState("");
    const [anggaran, setAnggaran] = useState("");
    const [selectedFungsi, setSelectedFungsi] = useState<string[]>([]);
    const [selectedKonstruksi, setSelectedKonstruksi] = useState<string[]>([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [activeRowId, setActiveRowId] = useState<string | null>(null);

    // Location state
    const [kecamatanList, setKecamatanList] = useState<Kecamatan[]>([]);
    const [desaList, setDesaList] = useState<Desa[]>([]);
    const [selectedKecId, setSelectedKecId] = useState<string>("");
    const [selectedDesaId, setSelectedDesaId] = useState<string>("");
    const [kecOpen, setKecOpen] = useState(false);
    const [desaOpen, setDesaOpen] = useState(false);

    // Coordinates Manager state
    const [activeEntry, setActiveEntry] = useState<RealisasiEntry | null>(null);
    const [coordsList, setCoordsList] = useState<RealisasiTitik[]>([]);
    const [editingPointId, setEditingPointId] = useState<string | null>(null);
    const [addingTipe, setAddingTipe] = useState<'start' | 'end' | null>(null);
    const [coordLat, setCoordLat] = useState("");
    const [coordLng, setCoordLng] = useState("");
    const [coordKet, setCoordKet] = useState("");
    const [isLocating, setIsLocating] = useState(false);
    const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

    const handleGetCurrentLocation = (targetTipe?: 'start' | 'end') => {
        if (typeof window === 'undefined' || !navigator.geolocation) {
            toast.error("Fitur Geolocation tidak didukung oleh peramban ini.");
            return;
        }

        setIsLocating(true);
        const loadingToast = toast.loading("Mengambil lokasi GPS perangkat...");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = Math.round(position.coords.accuracy);

                setCoordLat(lat.toFixed(6));
                setCoordLng(lng.toFixed(6));
                setGpsAccuracy(accuracy);

                if (targetTipe) {
                    setAddingTipe(targetTipe);
                }

                if (mapRef.current) {
                    const geomCoord = fromLonLat([lng, lat]);
                    mapRef.current.getView().animate({ center: geomCoord, zoom: 18, duration: 500 });
                }

                toast.dismiss(loadingToast);
                toast.success(`Lokasi GPS berhasil diambil: ${lat.toFixed(6)}, ${lng.toFixed(6)} (Akurasi: ±${accuracy} m)`);
                setIsLocating(false);
            },
            (error) => {
                toast.dismiss(loadingToast);
                setIsLocating(false);
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        toast.error("Akses lokasi (GPS) ditolak oleh pengguna/peramban.");
                        break;
                    case error.POSITION_UNAVAILABLE:
                        toast.error("Sinyal lokasi GPS tidak tersedia saat ini.");
                        break;
                    case error.TIMEOUT:
                        toast.error("Waktu permintaan lokasi GPS berakhir (timeout).");
                        break;
                    default:
                        toast.error("Gagal mendapatkan lokasi GPS.");
                        break;
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    };

    // Verification Detail Dialog State (Admin)
    const [isOpenDetailDialog, setIsOpenDetailDialog] = useState(false);
    const [detailEntry, setDetailEntry] = useState<RealisasiEntry | null>(null);
    const [catatanAdmin, setCatatanAdmin] = useState("");

    // Panel visibility
    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
    const [rightPanelTab, setRightPanelTab] = useState<'coords' | 'info'>('coords');
    const [isMobile, setIsMobile] = useState(false);
    const [formComboboxOpen, setFormComboboxOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 640;
            setIsMobile(mobile);
        };
        handleResize();
        if (typeof window !== 'undefined' && window.innerWidth < 640) {
            setIsLeftPanelOpen(false);
        }
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Confirmation AlertDialog State
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [confirmDialogType, setConfirmDialogType] = useState<'submit_entry' | 'delete_entry' | 'delete_coord' | null>(null);
    const [targetIdToConfirm, setTargetIdToConfirm] = useState<string | null>(null);

    // Map refs
    const mapElementRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<OLMap | null>(null);
    const basemapTileLayerRef = useRef<TileLayer<OSM | XYZ> | null>(null);
    const vectorSourceRef = useRef<VectorSource>(new VectorSource());
    const desaBoundarySourceRef = useRef<VectorSource>(new VectorSource());
    const jalanDesaSourceRef = useRef<VectorSource>(new VectorSource());
    const clickListenerRef = useRef<any>(null);

    // Plotting Check state
    const [hasPlotting, setHasPlotting] = useState<boolean | null>(null);

    const checkDesaPlottingStatus = async (user: any) => {
        if (!user || user.role !== 'operator_desa' || !user.id_desa) {
            setHasPlotting(true);
            return;
        }
        try {
            const res = await realisasiService.checkPlottingDesa(user.id_desa);
            if (res && res.status === "success" && Array.isArray(res.result) && res.result.length > 0) {
                setHasPlotting(true);
            } else {
                setHasPlotting(false);
            }
        } catch (e) {
            setHasPlotting(false);
        }
    };

    useEffect(() => {
        const user = authService.getUser();
        setCurrentUser(user);
        checkDesaPlottingStatus(user);
        fetchOpenForms();
        fetchAllForms();
        fetchKecamatan();
        fetchEntries();
    }, []);

    useEffect(() => {
        const handleCloseActions = () => setActiveRowId(null);
        window.addEventListener("click", handleCloseActions);
        return () => window.removeEventListener("click", handleCloseActions);
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    useEffect(() => {
        fetchEntries();
    }, [filterStatus, filterForm, filterLimit, page, debouncedSearch]);

    useEffect(() => {
        if (selectedKecId) {
            fetchDesa(selectedKecId);
        } else {
            setDesaList([]);
        }
    }, [selectedKecId]);

    const handleResizeStart = (e: React.MouseEvent) => {
        isResizing.current = true;
        resizeStartY.current = e.clientY;
        resizeStartHeight.current = mapHeight;
        e.preventDefault();
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing.current) return;
            const delta = e.clientY - resizeStartY.current;
            const newHeight = Math.max(150, Math.min(resizeStartHeight.current + delta, window.innerHeight - 200));
            setMapHeight(newHeight);
        };
        const handleMouseUp = () => {
            if (isResizing.current) {
                isResizing.current = false;
                setTimeout(() => mapRef.current?.updateSize(), 50);
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [mapHeight]);

    useEffect(() => {
        const timer = setTimeout(() => {
            mapRef.current?.updateSize();
        }, 100);
        return () => clearTimeout(timer);
    }, [isLeftPanelOpen, isRightPanelOpen]);

    const fetchOpenForms = async () => {
        try {
            const res = await realisasiService.getAllForms({ is_open: true });
            if (res.status === "success" && res.result) {
                setOpenForms(res.result);
            }
        } catch (err) {
            console.error("Gagal mengambil form terbuka:", err);
        }
    };

    const fetchAllForms = async () => {
        try {
            const res = await realisasiService.getAllForms();
            if (res.status === "success" && res.result) {
                setAllForms(res.result);
            }
        } catch (err) {
            console.error("Gagal mengambil semua form:", err);
        }
    };

    const fetchKecamatan = async () => {
        try {
            const data = await kecamatanService.getKecamatan();
            setKecamatanList(data);
        } catch (err) {
            console.error("Gagal mengambil kecamatan:", err);
        }
    };

    const fetchDesa = async (kecId: string) => {
        try {
            const data = await desaService.getDesa(kecId);
            setDesaList(data);
        } catch (err) {
            console.error("Gagal mengambil desa:", err);
        }
    };

    const fetchEntries = async () => {
        setIsLoading(true);
        try {
            const filters: any = {};
            if (filterStatus && filterStatus !== "all") filters.status = filterStatus;
            if (filterForm && filterForm !== "all") filters.id_form = filterForm;
            if (filterLimit) filters.limit = filterLimit;
            if (filterLimit !== "all") filters.page = page;
            if (debouncedSearch && debouncedSearch.trim() !== "") {
                filters.search = debouncedSearch;
            }

            const res = await realisasiService.getAllEntries(filters);
            if (res.status === "success" && res.result) {
                setEntries(res.result);
                if (res.pagination) {
                    setPaginationMeta({
                        total: res.pagination.total || res.result.length,
                        totalPages: res.pagination.totalPages || 1,
                    });
                } else {
                    setPaginationMeta({
                        total: res.result.length,
                        totalPages: 1,
                    });
                }
            }
        } catch (err) {
            console.error("Gagal mengambil entry:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefresh = async () => {
        try {
            await Promise.all([
                fetchOpenForms(),
                fetchAllForms(),
                fetchKecamatan(),
                fetchEntries()
            ]);
            toast.success("Data berhasil diperbarui.");
        } catch (err) {
            console.error("Gagal menyegarkan data:", err);
            toast.error("Gagal menyegarkan data.");
        }
    };

    // Format currency input (e.g. 150.000.000)
    const formatRupiahInput = (val: string | number) => {
        if (!val) return "";
        const digits = String(val).replace(/\D/g, "");
        if (!digits) return "";
        return Number(digits).toLocaleString("id-ID");
    };

    const availableFormsForSelect = isEditMode
        ? (allForms.length > 0 ? allForms : openForms)
        : openForms;

    const activeFormObj = allForms.find(f => f.id === selectedFormId) || openForms.find(f => f.id === selectedFormId);

    const fungsiOptions = React.useMemo(() => {
        if (!activeFormObj?.opsi_fungsi || !Array.isArray(activeFormObj.opsi_fungsi) || activeFormObj.opsi_fungsi.length === 0) {
            return [
                { id: "Perdagangan", label: "Perdagangan" },
                { id: "Kesehatan", label: "Kesehatan" },
                { id: "Pendidikan", label: "Pendidikan" },
                { id: "Pertanian", label: "Pertanian" },
                { id: "Permukiman", label: "Permukiman" }
            ];
        }
        return activeFormObj.opsi_fungsi.map((opt: any) => typeof opt === 'string' ? { id: opt, label: opt } : opt);
    }, [activeFormObj]);

    const konstruksiOptions = React.useMemo(() => {
        if (!activeFormObj?.opsi_konstruksi || !Array.isArray(activeFormObj.opsi_konstruksi) || activeFormObj.opsi_konstruksi.length === 0) {
            return [
                { id: "aspal_hotmix", label: "Aspal / Hotmix" },
                { id: "lapen", label: "Lapen (Lapis Penetrasi)" },
                { id: "rigid_beton", label: "Rigid / Beton" },
                { id: "paving_block", label: "Paving Block" },
                { id: "telford_makadam", label: "Telford / Makadam" },
                { id: "tanah", label: "Tanah" }
            ];
        }
        return activeFormObj.opsi_konstruksi.map((opt: any) => typeof opt === 'string' ? { id: opt, label: opt } : opt);
    }, [activeFormObj]);

    // Safe padding calculation for OpenLayers fitBounds / fitExtent
    const getViewportPadding = (): [number, number, number, number] => {
        const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
        const screenW = typeof window !== "undefined" ? window.innerWidth : 1200;
        const screenH = typeof window !== "undefined" ? window.innerHeight : 800;

        let topPadding = 30;
        let leftPadding = isDesktop && isLeftPanelOpen ? 390 : 30;
        let rightPadding = isDesktop && isRightPanelOpen ? 390 : 30;
        let bottomPadding = 30;

        // Ensure horizontal padding doesn't collapse available viewport width
        const maxHorizPadding = Math.max(30, Math.floor((screenW - 200) / 2));
        if (leftPadding + rightPadding > screenW - 200) {
            leftPadding = Math.min(leftPadding, maxHorizPadding);
            rightPadding = Math.min(rightPadding, maxHorizPadding);
        }

        const maxVertPadding = Math.max(30, Math.floor((screenH - 200) / 2));
        if (topPadding + bottomPadding > screenH - 200) {
            bottomPadding = Math.min(bottomPadding, maxVertPadding);
        }

        return [topPadding, rightPadding, bottomPadding, leftPadding];
    };

    // Safe fitExtent wrapper for OpenLayers to prevent NaN / 0-width padding crashes
    const safeFitExtent = (extent: number[], maxZoom = 16) => {
        if (!mapRef.current || !extent || extent.length !== 4) return;
        const [minX, minY, maxX, maxY] = extent;
        if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return;

        const padding = getViewportPadding();

        // Handle single-point extent (minX === maxX && minY === maxY)
        if (Math.abs(maxX - minX) < 0.000001 && Math.abs(maxY - minY) < 0.000001) {
            mapRef.current.getView().animate({
                center: [minX, minY],
                zoom: maxZoom,
                duration: 500,
            });
        } else {
            mapRef.current.getView().fit(extent, {
                padding,
                duration: 600,
                maxZoom,
            });
        }
    };

    // GeoJSON Loader for Desa Boundary & Roads
    const fetchDesaAndJalanGeoJSON = async (targetDesaId: string) => {
        if (!mapRef.current || !targetDesaId) return;
        try {
            desaBoundarySourceRef.current.clear();
            jalanDesaSourceRef.current.clear();

            const boundaryGeojson = await desaService.getDesaGeojsonById(targetDesaId);
            if (boundaryGeojson) {
                const bFeatures = new GeoJSON().readFeatures(boundaryGeojson, { featureProjection: "EPSG:3857" });
                if (bFeatures && bFeatures.length > 0) {
                    desaBoundarySourceRef.current.addFeatures(bFeatures);
                }
            }

            const [segmenGeojson, porosGeojson] = await Promise.all([
                jalanService.getSegmenByDesa(targetDesaId),
                jalanService.getJalanPorosByDesa(targetDesaId)
            ]);

            const reader = new GeoJSON();
            // 1. Tambahkan Jalan Poros Desa terlebih dahulu (di bawah, zIndex: 5)
            if (porosGeojson) {
                const pFeatures = reader.readFeatures(porosGeojson, { featureProjection: "EPSG:3857" });
                pFeatures.forEach((f) => {
                    const nama = f.get("nama_ruas") || f.get("nama_jalan") || "Jalan Poros";
                    f.setStyle(new Style({
                        stroke: new Stroke({ color: "#f97316", width: 4.5 }), // Orange
                        text: new StyleText({
                            text: String(nama),
                            font: "bold 11px sans-serif",
                            fill: new Fill({ color: "#c2410c" }),
                            stroke: new Stroke({ color: "#ffffff", width: 2.5 }),
                            placement: "line",
                        }),
                        zIndex: 5,
                    }));
                });
                jalanDesaSourceRef.current.addFeatures(pFeatures);
            }

            // 2. Tambahkan Segmen Desa di atas Jalan Poros (di atas, zIndex: 10)
            if (segmenGeojson) {
                const sFeatures = reader.readFeatures(segmenGeojson, { featureProjection: "EPSG:3857" });
                sFeatures.forEach((f) => {
                    const nama = f.get("nama_ruas") || f.get("nama_jalan") || f.get("nama_segmen") || "Ruas Jalan";
                    const statusJalan = String(f.get("status_jalan") || f.get("statusJalan") || f.get("status") || "").toLowerCase();

                    // Status Jalan:
                    // - Jalan Kabupaten: Biru (#3b82f6)
                    // - Jalan Desa: Hijau (#22c55e)
                    const isKabupaten = statusJalan.includes("kabupaten") || statusJalan.includes("kab");
                    const strokeColor = isKabupaten ? "#3b82f6" : "#22c55e";
                    const textColor = isKabupaten ? "#1d4ed8" : "#15803d";

                    f.setStyle(new Style({
                        stroke: new Stroke({ color: strokeColor, width: 3.5 }),
                        text: new StyleText({
                            text: String(nama),
                            font: "bold 10px sans-serif",
                            fill: new Fill({ color: textColor }),
                            stroke: new Stroke({ color: "#ffffff", width: 2.5 }),
                            placement: "line",
                        }),
                        zIndex: 10,
                    }));
                });
                jalanDesaSourceRef.current.addFeatures(sFeatures);
            }

            setTimeout(() => {
                if (!mapRef.current) return;
                mapRef.current.updateSize();
                const activePts = getActiveMapPoints();
                if (activePts.length > 0 && vectorSourceRef.current.getFeatures().length > 0) {
                    safeFitExtent(vectorSourceRef.current.getExtent(), 16);
                } else if (desaBoundarySourceRef.current.getFeatures().length > 0) {
                    safeFitExtent(desaBoundarySourceRef.current.getExtent(), 16);
                } else if (jalanDesaSourceRef.current.getFeatures().length > 0) {
                    safeFitExtent(jalanDesaSourceRef.current.getExtent(), 16);
                }
            }, 300);
        } catch (err) {
            console.error("Gagal memuat GeoJSON desa/jalan:", err);
        }
    };

    useEffect(() => {
        if (!mapRef.current) return;
        if (!selectedDesaId) {
            desaBoundarySourceRef.current.clear();
            jalanDesaSourceRef.current.clear();
            return;
        }
        fetchDesaAndJalanGeoJSON(selectedDesaId);
    }, [selectedDesaId]);

    // Update Basemap Source
    useEffect(() => {
        if (!basemapTileLayerRef.current) return;
        basemapTileLayerRef.current.setSource(getBasemapSource(activeBasemap));
    }, [activeBasemap]);

    // Map Initialization
    useEffect(() => {
        if (!mapElementRef.current || mapRef.current) return;

        const initialSource = getBasemapSource(activeBasemap);
        const tileLayer = new TileLayer({ source: initialSource });
        basemapTileLayerRef.current = tileLayer;

        mapRef.current = new OLMap({
            target: mapElementRef.current,
            controls: [],
            interactions: defaultInteractions({
                altShiftDragRotate: false,
                pinchRotate: false,
            }),
            layers: [
                tileLayer,
                new VectorLayer({
                    source: desaBoundarySourceRef.current,
                    style: new Style({
                        stroke: new Stroke({ color: "#3b82f6", width: 2.5, lineDash: [6, 6] }),
                    }),
                }),
                new VectorLayer({
                    source: jalanDesaSourceRef.current,
                }),
                new VectorLayer({ source: vectorSourceRef.current }),
            ],
            view: new View({
                center: fromLonLat([111.88, -7.15]),
                zoom: 11,
                enableRotation: false,
            }),
        });

        return () => {
            if (mapRef.current) {
                mapRef.current.setTarget(undefined);
                mapRef.current = null;
            }
        };
    }, []);

    const getActiveMapPoints = (): RealisasiTitik[] => {
        if (activeEntry) {
            return coordsList;
        }
        return [];
    };

    // Render Markers & Lines on Map with safe fitExtent
    useEffect(() => {
        if (!mapRef.current) return;
        mapRef.current.updateSize();
        vectorSourceRef.current.clear();

        const mkStyle = (color: string, label: string) => new Style({
            image: new CircleStyle({
                radius: 9,
                fill: new Fill({ color }),
                stroke: new Stroke({ color: "#ffffff", width: 2.5 }),
            }),
            text: new StyleText({
                text: label,
                font: "bold 10px sans-serif",
                fill: new Fill({ color: color === "#22c55e" ? "#14532d" : color === "#ef4444" ? "#7f1d1d" : "#78350f" }),
                offsetY: -18,
                backgroundFill: new Fill({ color: "rgba(255,255,255,0.8)" }),
                padding: [2, 4, 2, 4],
            }),
        });

        const startStyle = mkStyle("#22c55e", "START");
        const endStyle = mkStyle("#ef4444", "END");
        const previewStyle = mkStyle("#f59e0b", "PILIHAN");
        const lineStyle = new Style({ stroke: new Stroke({ color: "#6366f1", width: 2.5, lineDash: [6, 4] }) });

        const points = getActiveMapPoints();
        points.forEach((pt) => {
            const feat = new Feature({ geometry: new Point(fromLonLat([pt.longitude, pt.latitude])) });
            feat.setStyle(pt.tipe === "start" ? startStyle : endStyle);
            vectorSourceRef.current.addFeature(feat);
        });

        const uniqueOrders = Array.from(new Set(points.map(pt => pt.urutan || 1)));
        uniqueOrders.forEach((order) => {
            const startPt = points.find(pt => pt.tipe === "start" && (pt.urutan || 1) === order);
            const endPt = points.find(pt => pt.tipe === "end" && (pt.urutan || 1) === order);
            if (startPt && endPt) {
                const lineFeat = new Feature({
                    geometry: new LineString([fromLonLat([startPt.longitude, startPt.latitude]), fromLonLat([endPt.longitude, endPt.latitude])])
                });
                lineFeat.setStyle(lineStyle);
                vectorSourceRef.current.addFeature(lineFeat);
            }
        });

        if (coordLat && coordLng && !isNaN(Number(coordLat)) && !isNaN(Number(coordLng))) {
            const previewFeat = new Feature({ geometry: new Point(fromLonLat([Number(coordLng), Number(coordLat)])) });
            previewFeat.setStyle(previewStyle);
            vectorSourceRef.current.addFeature(previewFeat);
        }

        if (points.length > 0) {
            safeFitExtent(vectorSourceRef.current.getExtent(), 16);
        } else if (desaBoundarySourceRef.current.getFeatures().length > 0) {
            safeFitExtent(desaBoundarySourceRef.current.getExtent(), 16);
        } else if (jalanDesaSourceRef.current.getFeatures().length > 0) {
            safeFitExtent(jalanDesaSourceRef.current.getExtent(), 16);
        } else if (coordLat && coordLng && !isNaN(Number(coordLat)) && !isNaN(Number(coordLng))) {
            mapRef.current.getView().animate({
                center: fromLonLat([Number(coordLng), Number(coordLat)]),
                zoom: 15,
                duration: 500,
            });
        }
    }, [activeEntry, coordsList, selectedDesaId, coordLat, coordLng]);

    // Handle Map Click in Crosshair Mode
    useEffect(() => {
        if (!mapRef.current) return;
        if (clickListenerRef.current) {
            mapRef.current.un("singleclick", clickListenerRef.current);
            clickListenerRef.current = null;
        }
        const isInteracting = !!editingPointId || !!addingTipe;
        if (isInteracting) {
            mapRef.current.getTargetElement()?.style.setProperty("cursor", "crosshair");
            const handler = (evt: any) => {
                const lonLat = toLonLat(evt.coordinate);
                setCoordLat(lonLat[1].toFixed(6));
                setCoordLng(lonLat[0].toFixed(6));
            };
            mapRef.current.on("singleclick", handler);
            clickListenerRef.current = handler;
        } else {
            mapRef.current.getTargetElement()?.style.setProperty("cursor", "default");
        }
        return () => {
            if (clickListenerRef.current && mapRef.current) {
                mapRef.current.un("singleclick", clickListenerRef.current);
                clickListenerRef.current = null;
            }
        };
    }, [editingPointId, addingTipe]);

    // Handle Open Create Form Dialog
    const handleOpenCreateEntry = () => {
        if (openForms.length === 0 && allForms.length === 0) {
            toast.error("Tidak ada form realisasi yang tersedia.");
            return;
        }
        setIsEditMode(false);
        setSelectedEntryId(null);
        setSelectedFormId(openForms.length > 0 ? openForms[0].id : (allForms[0]?.id || ""));
        setNamaKegiatan("");
        setDeskripsi("");
        setVolume("");
        setAnggaran("");
        setSelectedFungsi([]);
        setSelectedKonstruksi([]);
        setSelectedKecId("");
        setSelectedDesaId("");
        setActiveEntry(null);
        setCoordsList([]);
        setIsOpenEntryDialog(true);
    };

    // Handle Open Edit Entry Dialog
    const handleOpenEditEntry = async (entry: RealisasiEntry) => {
        setIsEditMode(true);
        setSelectedEntryId(entry.id);
        setSelectedFormId(entry.id_form);
        setNamaKegiatan(entry.nama_kegiatan || "");
        setDeskripsi(entry.deskripsi || "");
        setVolume(entry.volume || "");
        setAnggaran(entry.anggaran ? formatRupiahInput(entry.anggaran) : "");
        setSelectedFungsi(entry.fungsi_infrastruktur || []);
        setSelectedKonstruksi(entry.opsi_konstruksi || []);
        setActiveEntry(entry);

        if (entry.id_kecamatan) {
            const kecIdStr = String(entry.id_kecamatan);
            setSelectedKecId(kecIdStr);
            fetchDesa(kecIdStr);
        } else {
            setSelectedKecId("");
            setDesaList([]);
        }

        if (entry.id_desa) {
            setSelectedDesaId(String(entry.id_desa));
        } else {
            setSelectedDesaId("");
        }

        try {
            const res = await realisasiService.getTitikByEntry(entry.id);
            if (res.status === "success" && res.result) {
                setCoordsList(res.result);
                entry.titik = res.result;
            }
        } catch {}

        setIsOpenEntryDialog(true);
    };

    // Handle Open Coordinates Manager in Sheet
    const handleOpenCoordsManager = async (entry: RealisasiEntry) => {
        setActiveEntry(entry);
        if (entry.id_kecamatan) {
            const kecIdStr = String(entry.id_kecamatan);
            setSelectedKecId(kecIdStr);
            fetchDesa(kecIdStr);
        }
        if (entry.id_desa) setSelectedDesaId(String(entry.id_desa));

        try {
            const res = await realisasiService.getTitikByEntry(entry.id);
            if (res.status === "success" && res.result) {
                setCoordsList(res.result);
                entry.titik = res.result;
            }
            setEditingPointId(null);
            setAddingTipe(null);
            setCoordLat("");
            setCoordLng("");
            setCoordKet("");
            setIsCoordManagerOpen(true);
        } catch (err) {
            console.error("Gagal memuat titik koordinat:", err);
        }
    };

    const handleSelectEntryOnMap = async (entry: RealisasiEntry) => {
        setActiveEntry(entry);
        if (entry.id_kecamatan) {
            const kecIdStr = String(entry.id_kecamatan);
            setSelectedKecId(kecIdStr);
            fetchDesa(kecIdStr);
        }
        if (entry.id_desa) setSelectedDesaId(String(entry.id_desa));

        let points = entry.titik || [];
        if (points.length === 0) {
            try {
                const res = await realisasiService.getTitikByEntry(entry.id);
                if (res.status === "success" && res.result) {
                    points = res.result;
                    setCoordsList(res.result);
                    entry.titik = res.result;
                } else {
                    setCoordsList([]);
                }
            } catch {
                setCoordsList([]);
            }
        } else {
            setCoordsList(points);
        }

        setTimeout(() => {
            if (!mapRef.current) return;
            mapRef.current.updateSize();
            if (points.length > 0 && vectorSourceRef.current.getFeatures().length > 0) {
                safeFitExtent(vectorSourceRef.current.getExtent(), 16);
            } else if (desaBoundarySourceRef.current.getFeatures().length > 0) {
                safeFitExtent(desaBoundarySourceRef.current.getExtent(), 16);
            } else if (jalanDesaSourceRef.current.getFeatures().length > 0) {
                safeFitExtent(jalanDesaSourceRef.current.getExtent(), 16);
            }
        }, 150);
    };

    const handleSaveEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFormId || !namaKegiatan.trim()) {
            toast.error("Form realisasi dan Nama Kegiatan wajib diisi.");
            return;
        }

        const kecObj = kecamatanList.find(k => String(k.id) === selectedKecId);
        const desaObj = desaList.find(d => String(d.id) === selectedDesaId);
        const cleanAnggaran = anggaran ? Number(anggaran.replace(/\D/g, "")) : undefined;

        try {
            const payload: any = {
                id_form: selectedFormId,
                nama_kegiatan: namaKegiatan,
                deskripsi,
                volume,
                anggaran: cleanAnggaran,
                fungsi_infrastruktur: selectedFungsi,
                opsi_konstruksi: selectedKonstruksi,
                id_kecamatan: selectedKecId ? Number(selectedKecId) : undefined,
                id_desa: selectedDesaId ? Number(selectedDesaId) : undefined,
                nama_kecamatan: kecObj?.nama_kecamatan || "",
                nama_desa: desaObj?.nama_desa || "",
            };

            let savedEntry: RealisasiEntry | null = null;
            if (isEditMode && selectedEntryId) {
                const { id_form, ...editPayload } = payload;
                const res = await realisasiService.updateEntry(selectedEntryId, editPayload);
                toast.success("Laporan berhasil diperbarui.");
                if (res.status === "success" && res.result) {
                    savedEntry = res.result;
                }
            } else {
                const res = await realisasiService.createEntry(payload);
                if (res.status === "success" && res.result) {
                    savedEntry = res.result;
                    toast.success("Laporan berhasil dibuat! Silakan kelola titik koordinat pada peta.");
                }
            }

            setIsOpenEntryDialog(false);
            fetchEntries();

            if (savedEntry) {
                await handleOpenCoordsManager(savedEntry);
            } else if (selectedEntryId) {
                const updated = entries.find(e => e.id === selectedEntryId);
                if (updated) await handleOpenCoordsManager(updated);
            }
        } catch (err) {
            console.error("Gagal menyimpan entry:", err);
        }
    };

    const handleDeleteEntry = (id: string) => {
        setTargetIdToConfirm(id);
        setConfirmDialogType('delete_entry');
        setConfirmDialogOpen(true);
    };

    const handleSaveCoordinate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeEntry || !coordLat || !coordLng) {
            toast.error("Latitude dan Longitude wajib diisi.");
            return;
        }
        try {
            if (editingPointId) {
                await realisasiService.updateTitik(editingPointId, {
                    latitude: Number(coordLat),
                    longitude: Number(coordLng),
                    keterangan: coordKet,
                });
                toast.success("Koordinat berhasil diperbarui.");
            } else if (addingTipe) {
                const currentOfTipe = coordsList.filter((pt) => pt.tipe === addingTipe);
                const nextOrder = currentOfTipe.length + 1;
                const res = await realisasiService.addTitik({
                    id_entry: activeEntry.id,
                    tipe: addingTipe,
                    urutan: nextOrder,
                    latitude: Number(coordLat),
                    longitude: Number(coordLng),
                    keterangan: coordKet,
                });
                if (res.status === "success") {
                    toast.success("Titik koordinat berhasil ditambahkan.");
                }
            }

            const res = await realisasiService.getTitikByEntry(activeEntry.id);
            if (res.status === "success" && res.result) {
                const freshPoints = res.result;
                setCoordsList(freshPoints);
                setActiveEntry((prev) => prev ? { ...prev, titik: freshPoints } : null);
                setEntries((prev) => prev.map((e) => e.id === activeEntry.id ? { ...e, titik: freshPoints } : e));
            }
            setEditingPointId(null);
            setAddingTipe(null);
            setCoordLat("");
            setCoordLng("");
            setCoordKet("");
        } catch (err) {
            console.error("Gagal menyimpan titik:", err);
        }
    };

    const handleDeleteCoordinate = (id: string) => {
        setTargetIdToConfirm(id);
        setConfirmDialogType('delete_coord');
        setConfirmDialogOpen(true);
    };

    const handleSubmitEntry = async (id: string) => {
        const entry = entries.find(e => e.id === id) || activeEntry;
        let points = (activeEntry?.id === id && coordsList.length > 0) ? coordsList : (entry?.titik || []);

        if (points.length === 0) {
            try {
                const res = await realisasiService.getTitikByEntry(id);
                if (res.status === 'success' && res.result) {
                    points = res.result;
                }
            } catch (err) {
                console.error("Gagal mengecek titik koordinat:", err);
            }
        }

        if (points.length === 0) {
            toast.error("Laporan tidak dapat dikirim karena koordinat lokasi belum diisi.");
            return;
        }

        setTargetIdToConfirm(id);
        setConfirmDialogType('submit_entry');
        setConfirmDialogOpen(true);
    };

    const handleConfirmAction = async () => {
        if (!targetIdToConfirm || !confirmDialogType) return;
        const id = targetIdToConfirm;

        if (confirmDialogType === 'submit_entry') {
            try {
                await realisasiService.submitEntry(id);
                if (activeEntry?.id === id) {
                    setActiveEntry((prev) => prev ? { ...prev, status: 'submitted' } : null);
                }
                toast.success("Data geotagging berhasil dikirim.");
                fetchEntries();
            } catch (err) {
                console.error("Gagal submit entry:", err);
            }
        } else if (confirmDialogType === 'delete_entry') {
            try {
                await realisasiService.deleteEntry(id);
                if (activeEntry?.id === id) {
                    setActiveEntry(null);
                    setIsRightPanelOpen(false);
                }
                toast.success("Data geotagging berhasil dihapus.");
                fetchEntries();
            } catch (err) {
                console.error("Gagal menghapus entry:", err);
                toast.error("Gagal menghapus laporan realisasi.");
            }
        } else if (confirmDialogType === 'delete_coord') {
            try {
                await realisasiService.deleteTitik(id);
                const updatedList = coordsList.filter((pt) => pt.id !== id);
                setCoordsList(updatedList);
                if (activeEntry) {
                    setActiveEntry({ ...activeEntry, titik: updatedList });
                    setEntries((prev) => prev.map((e) => e.id === activeEntry.id ? { ...e, titik: updatedList } : e));
                }
                toast.success("Titik koordinat berhasil dihapus.");
            } catch (err) {
                console.error("Gagal menghapus titik:", err);
                toast.error("Gagal menghapus titik koordinat.");
            }
        }

        setConfirmDialogOpen(false);
        setConfirmDialogType(null);
        setTargetIdToConfirm(null);
    };

    const handleOpenDetail = (entry: RealisasiEntry) => {
        setDetailEntry(entry);
        setCatatanAdmin(entry.catatan_admin || "");
        setIsOpenDetailDialog(true);
    };

    const handleVerify = async (status: 'verified' | 'rejected') => {
        const targetEntry = activeEntry || detailEntry;
        if (!targetEntry) return;

        const hasPoints = (targetEntry.titik && targetEntry.titik.length > 0) || coordsList.length > 0;
        if (status === 'verified' && !hasPoints) {
            toast.error("Laporan tidak dapat disetujui karena koordinat lokasi belum diisi.");
            return;
        }
        try {
            await realisasiService.verifyEntry(targetEntry.id, {
                status,
                catatan_admin: catatanAdmin,
            });

            if (activeEntry?.id === targetEntry.id) {
                setActiveEntry((prev) => prev ? { ...prev, status, catatan_admin: catatanAdmin } : null);
            }
            if (detailEntry?.id === targetEntry.id) {
                setDetailEntry((prev) => prev ? { ...prev, status, catatan_admin: catatanAdmin } : null);
            }

            setIsOpenDetailDialog(false);
            setRightPanelTab('info');
            setIsRightPanelOpen(true);
            toast.success(status === 'verified' ? "Data geotagging berhasil disetujui." : "Data geotagging telah ditolak.");
            fetchEntries();
        } catch (err) {
            console.error("Gagal verifikasi entry:", err);
            toast.error("Gagal melakukan verifikasi geotagging.");
        }
    };

    const handleCancelVerify = async () => {
        const targetEntry = activeEntry || detailEntry;
        if (!targetEntry) return;

        try {
            await realisasiService.verifyEntry(targetEntry.id, {
                status: 'submitted',
                catatan_admin: catatanAdmin,
            });

            if (activeEntry?.id === targetEntry.id) {
                setActiveEntry((prev) => prev ? { ...prev, status: 'submitted', catatan_admin: catatanAdmin } : null);
            }
            if (detailEntry?.id === targetEntry.id) {
                setDetailEntry((prev) => prev ? { ...prev, status: 'submitted', catatan_admin: catatanAdmin } : null);
            }

            setIsOpenDetailDialog(false);
            setRightPanelTab('info');
            setIsRightPanelOpen(true);
            toast.success("Verifikasi geotagging berhasil dibatalkan.");
            fetchEntries();
        } catch (err) {
            console.error("Gagal membatalkan verifikasi:", err);
            toast.error("Gagal membatalkan status verifikasi geotagging.");
        }
    };

    const handleZoomIn = () => { mapRef.current?.getView().animate({ zoom: (mapRef.current.getView().getZoom() || 0) + 1, duration: 250 }); };
    const handleZoomOut = () => { mapRef.current?.getView().animate({ zoom: (mapRef.current.getView().getZoom() || 0) - 1, duration: 250 }); };
    const handleResetBearing = () => { mapRef.current?.getView().animate({ rotation: 0, duration: 250 }); };

    const isDesa = currentUser?.role === "operator_desa";
    const isVerifier = Boolean(
        currentUser && ['operator_kecamatan', 'operator_bappeda', 'super_admin', 'admin', 'superadmin'].includes(currentUser.role)
    );

    const renderCoordForm = (pt: RealisasiTitik | null, tipe: 'start' | 'end', onCancel: () => void) => (
        <div className={cn(
            "rounded-2xl border p-4 space-y-3",
            tipe === 'start'
                ? "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/10"
                : "border-rose-200 dark:border-rose-800/60 bg-rose-50/30 dark:bg-rose-950/10"
        )}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold", tipe === 'start' ? "bg-emerald-500" : "bg-rose-500")}>
                        {tipe === 'start' ? "S" : "E"}
                    </div>
                    <span className="text-xs font-bold text-foreground">{pt ? `Edit Titik #${pt.urutan}` : "Tambah Titik Baru"}</span>
                </div>
                <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 animate-pulse flex items-center gap-1">
                    <Crosshair className="w-3 h-3" /> Klik peta untuk lokasi
                </span>
            </div>
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLocating}
                onClick={() => handleGetCurrentLocation(tipe)}
                className="w-full h-8 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded-xl gap-1.5 shadow-xs flex items-center justify-between px-3"
            >
                <div className="flex items-center gap-1.5 truncate">
                    {isLocating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 shrink-0" /> : <Crosshair className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                    <span className="truncate">{isLocating ? "Mengambil Lokasi GPS..." : "Gunakan Lokasi GPS Saya Saat Ini"}</span>
                </div>
                {gpsAccuracy !== null && (
                    <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                        ± {gpsAccuracy} m
                    </span>
                )}
            </Button>
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Latitude</Label>
                    <Input value={coordLat} onChange={(e) => setCoordLat(e.target.value)} placeholder="-7.123456" className="h-8 text-xs bg-background font-mono rounded-xl" required />
                </div>
                <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Longitude</Label>
                    <Input value={coordLng} onChange={(e) => setCoordLng(e.target.value)} placeholder="112.123456" className="h-8 text-xs bg-background font-mono rounded-xl" required />
                </div>
            </div>
            <div className="space-y-1">
                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Keterangan <span className="normal-case font-normal">(opsional)</span></Label>
                <Input value={coordKet} onChange={(e) => setCoordKet(e.target.value)} placeholder="Dekat tiang listrik / jembatan..." className="h-8 text-xs bg-background rounded-xl" />
            </div>
            <div className="flex items-center gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1 text-xs h-8 rounded-xl" onClick={onCancel}>Batal</Button>
                <Button type="button" className={cn("flex-1 text-xs h-8 text-white font-semibold rounded-xl shadow-sm gap-1.5", tipe === 'start' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700")} onClick={handleSaveCoordinate}>
                    <Check className="w-3 h-3" /> Simpan
                </Button>
            </div>
        </div>
    );

    const renderPointGroup = (tipe: 'start' | 'end') => {
        const groupPoints = coordsList.filter(pt => pt.tipe === tipe).sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
        const canEdit = activeEntry && (activeEntry.status === 'draft' || activeEntry.status === 'rejected');
        const isStart = tipe === 'start';

        const accent = isStart ? {
            dot: "bg-emerald-500",
            badge: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300",
            card: "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20",
            emptyBorder: "border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/20 dark:bg-emerald-950/10",
            emptyText: "text-emerald-600 dark:text-emerald-400",
            addBtn: "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40",
            pill: "bg-emerald-500 text-white",
            section: "text-emerald-700 dark:text-emerald-400",
            sectionBg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60",
            saveBtnCls: "bg-emerald-600 hover:bg-emerald-700",
        } : {
            dot: "bg-rose-500",
            badge: "bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300",
            card: "border-rose-200 dark:border-rose-800/60 bg-rose-50/40 dark:bg-rose-950/20",
            emptyBorder: "border-rose-200 dark:border-rose-800/50 bg-rose-50/20 dark:bg-rose-950/10",
            emptyText: "text-rose-600 dark:text-rose-400",
            addBtn: "text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40",
            pill: "bg-rose-500 text-white",
            section: "text-rose-700 dark:text-rose-400",
            sectionBg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60",
            saveBtnCls: "bg-rose-600 hover:bg-rose-700",
        };

        const labelText = isStart ? "Titik Awal (START)" : "Titik Akhir (END)";
        const labelShort = isStart ? "S" : "E";

        return (
            <div className="space-y-2">
                {/* Section Header */}
                <div className={cn("flex items-center justify-between px-3 py-2 rounded-xl border", accent.sectionBg)}>
                    <div className="flex items-center gap-2">
                        <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0", accent.pill)}>
                            {labelShort}
                        </span>
                        <span className={cn("text-xs font-bold", accent.section)}>{labelText}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                            {groupPoints.length} titik
                        </span>
                    </div>
                    {canEdit && addingTipe !== tipe && !editingPointId && (
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={isLocating}
                                className={cn("h-6 text-[10px] px-2 font-semibold gap-1", accent.addBtn)}
                                onClick={() => {
                                    setEditingPointId(null);
                                    setCoordKet("");
                                    handleGetCurrentLocation(tipe);
                                }}
                                title={`Gunakan posisi GPS peramban saat ini sebagai ${labelText}`}
                            >
                                {isLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crosshair className="w-3 h-3 text-indigo-500" />}
                                GPS Saya
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn("h-6 text-[10px] px-2 font-semibold gap-1", accent.addBtn)}
                                onClick={() => {
                                    setAddingTipe(tipe);
                                    setEditingPointId(null);
                                    setCoordLat("");
                                    setCoordLng("");
                                    setCoordKet("");
                                }}
                            >
                                <Plus className="w-3 h-3" /> Tambah
                            </Button>
                        </div>
                    )}
                </div>

                {/* Point Cards */}
                <div className="space-y-1.5 pl-2">
                    {groupPoints.map((pt, idx) => {
                        if (editingPointId === pt.id) {
                            return (
                                <div key={pt.id}>
                                    {renderCoordForm(pt, tipe, () => {
                                        setEditingPointId(null);
                                        setCoordLat("");
                                        setCoordLng("");
                                        setCoordKet("");
                                    })}
                                </div>
                            );
                        }
                        return (
                            <div
                                key={pt.id}
                                className={cn(
                                    "group relative rounded-xl border transition-all duration-150 overflow-hidden",
                                    accent.card
                                )}
                            >
                                {/* Left color bar */}
                                <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", accent.dot)} />

                                <div className="pl-4 pr-3 py-2.5">
                                    {/* Header row: index badge + coords + actions */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className={cn("text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0", accent.badge)}>
                                                #{pt.urutan || idx + 1}
                                            </span>
                                            <div className="min-w-0">
                                                <div className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                                                    {pt.latitude.toFixed(6)}
                                                </div>
                                                <div className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                                                    {pt.longitude.toFixed(6)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                                            {/* Copy */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg"
                                                title="Salin koordinat"
                                                onClick={() => {
                                                    navigator.clipboard?.writeText(`${pt.latitude.toFixed(6)}, ${pt.longitude.toFixed(6)}`);
                                                    toast.success("Koordinat disalin");
                                                }}
                                            >
                                                <ClipboardList className="h-3 w-3" />
                                            </Button>
                                            {/* Zoom */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg"
                                                title="Zoom ke titik di peta"
                                                onClick={() => {
                                                    const geomCoord = fromLonLat([pt.longitude, pt.latitude]);
                                                    mapRef.current?.getView().animate({ center: geomCoord, zoom: 17, duration: 500 });
                                                }}
                                            >
                                                <LocateFixed className="h-3 w-3" />
                                            </Button>
                                            {canEdit && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg"
                                                        title="Edit koordinat"
                                                        onClick={() => {
                                                            setEditingPointId(pt.id!);
                                                            setAddingTipe(null);
                                                            setCoordLat(String(pt.latitude));
                                                            setCoordLng(String(pt.longitude));
                                                            setCoordKet(pt.keterangan || "");
                                                        }}
                                                    >
                                                        <Edit3 className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg"
                                                        title="Hapus titik"
                                                        onClick={() => handleDeleteCoordinate(pt.id!)}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Keterangan */}
                                    {pt.keterangan && (
                                        <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-black/5 dark:border-white/5">
                                            <Info className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                                            <span className="text-[10px] text-muted-foreground italic leading-tight">
                                                {pt.keterangan}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Add Form */}
                    {addingTipe === tipe && renderCoordForm(null, tipe, () => {
                        setAddingTipe(null);
                        setCoordLat("");
                        setCoordLng("");
                        setCoordKet("");
                    })}

                    {/* Empty State */}
                    {groupPoints.length === 0 && addingTipe !== tipe && (
                        <div className={cn(
                            "flex flex-col items-center justify-center gap-2 py-6 rounded-xl border border-dashed text-center",
                            accent.emptyBorder
                        )}>
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold opacity-30", accent.dot, "text-white")}>
                                {labelShort}
                            </div>
                            <div>
                                <p className="text-[11px] text-muted-foreground">Belum ada titik {isStart ? "awal" : "akhir"}</p>
                                {canEdit && (
                                    <p className={cn("text-[10px] font-semibold mt-0.5", accent.emptyText)}>
                                        Klik "+ Tambah" untuk menandai lokasi
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };


    return (
        <div className="absolute inset-0 overflow-hidden bg-slate-100 dark:bg-slate-950">
            {/* ============================================================
                MODAL DIALOG: CREATE / EDIT LAPORAN REALISASI
            ============================================================ */}
            <Dialog open={isOpenEntryDialog} onOpenChange={setIsOpenEntryDialog}>
                <DialogContent
                    className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto"
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold">
                            <Edit3 className="w-4 h-4 text-indigo-600" />
                            <span>{isEditMode ? "Edit Laporan Realisasi" : "Tambah Laporan Realisasi"}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Isi dan perbarui atribut data laporan realisasi fisik infrastruktur.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveEntry} autoComplete="off" className="space-y-4 py-2">
                        {/* Form Selection */}
                        <div className="space-y-1.5">
                            <Label htmlFor="dialogFormSelect" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Form Realisasi</span>
                                <span className="text-rose-500">*</span>
                            </Label>
                            <Select value={selectedFormId} onValueChange={setSelectedFormId} disabled={isEditMode}>
                                <SelectTrigger id="dialogFormSelect" className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-700">
                                    <SelectValue placeholder="Pilih Form Realisasi..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableFormsForSelect.map((f) => (
                                        <SelectItem key={f.id} value={f.id} className="text-xs">
                                            {f.judul} ({f.tahun_anggaran})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Nama Kegiatan */}
                        <div className="space-y-1.5">
                            <Label htmlFor="dialogNamaKegiatan" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <ClipboardList className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Nama Kegiatan</span>
                                <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                id="dialogNamaKegiatan"
                                value={namaKegiatan}
                                onChange={(e) => setNamaKegiatan(e.target.value)}
                                placeholder="Contoh: Pengerasan Jalan Lingkungan RT 02"
                                required
                                autoComplete="off"
                                className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-700"
                            />
                        </div>

                        {/* Wilayah Administrasi */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <Building className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Wilayah Administrasi</span>
                                <span className="text-rose-500">*</span>
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label htmlFor="dialogKec" className="text-xs font-semibold text-slate-600 dark:text-slate-400">Kecamatan</Label>
                                    <Popover open={kecOpen} onOpenChange={setKecOpen}>
                                        <PopoverTrigger asChild>
                                            <Button id="dialogKec" variant="outline" role="combobox" aria-expanded={kecOpen}
                                                className="w-full h-9 text-xs justify-between px-3 font-normal rounded-xl border-slate-200 dark:border-slate-700">
                                                <span className="truncate">{selectedKecId ? (kecamatanList.find(k => String(k.id) === selectedKecId)?.nama_kecamatan || "Pilih...") : "Pilih..."}</span>
                                                <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-40" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="p-0 w-[200px]" align="start">
                                            <Command>
                                                <CommandInput placeholder="Cari kecamatan..." className="h-8 text-xs" />
                                                <CommandList>
                                                    <CommandEmpty className="text-xs py-2 text-center text-muted-foreground">Tidak ditemukan.</CommandEmpty>
                                                    <CommandGroup>
                                                        {kecamatanList.map(k => (
                                                            <CommandItem key={k.id} value={k.nama_kecamatan} onSelect={() => { setSelectedKecId(String(k.id)); setSelectedDesaId(""); setKecOpen(false); fetchDesa(String(k.id)); }} className="text-xs cursor-pointer uppercase font-medium">
                                                                <Check className={cn("mr-2 h-3.5 w-3.5", selectedKecId === String(k.id) ? "opacity-100" : "opacity-0")} />
                                                                {k.nama_kecamatan}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="dialogDesa" className="text-xs font-semibold text-slate-600 dark:text-slate-400">Desa</Label>
                                    <Popover open={desaOpen} onOpenChange={setDesaOpen}>
                                        <PopoverTrigger asChild>
                                            <Button id="dialogDesa" variant="outline" role="combobox" aria-expanded={desaOpen} disabled={!selectedKecId}
                                                className="w-full h-9 text-xs justify-between px-3 font-normal rounded-xl border-slate-200 dark:border-slate-700">
                                                <span className="truncate">{selectedDesaId ? (desaList.find(d => String(d.id) === selectedDesaId)?.nama_desa || "Pilih...") : "Pilih..."}</span>
                                                <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-40" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="p-0 w-[200px]" align="start">
                                            <Command>
                                                <CommandInput placeholder="Cari desa..." className="h-8 text-xs" />
                                                <CommandList>
                                                    <CommandEmpty className="text-xs py-2 text-center text-muted-foreground">Tidak ditemukan.</CommandEmpty>
                                                    <CommandGroup>
                                                        {desaList.map(d => (
                                                            <CommandItem key={d.id} value={d.nama_desa} onSelect={() => { setSelectedDesaId(String(d.id)); setDesaOpen(false); }} className="text-xs cursor-pointer uppercase font-medium">
                                                                <Check className={cn("mr-2 h-3.5 w-3.5", selectedDesaId === String(d.id) ? "opacity-100" : "opacity-0")} />
                                                                {d.nama_desa}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </div>

                        {/* Physical Volume & Budget */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="dialogVolume" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>Volume</span>
                                </Label>
                                <Input id="dialogVolume" value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="150 Meter" className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-700" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="dialogAnggaran" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>Nilai Anggaran (Rp)</span>
                                </Label>
                                <Input id="dialogAnggaran" type="text" value={anggaran} onChange={(e) => setAnggaran(formatRupiahInput(e.target.value))} placeholder="150.000.000" className="h-9 text-xs font-mono font-semibold rounded-xl border-slate-200 dark:border-slate-700" />
                            </div>
                        </div>

                        {/* Fungsi Infrastruktur */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Fungsi Infrastruktur</span>
                            </Label>
                            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                                {fungsiOptions.map((opt) => {
                                    const val = opt.label || opt.id;
                                    return (
                                        <label key={opt.id} className="flex items-center gap-2 cursor-pointer text-xs select-none p-0.5">
                                            <input type="checkbox" checked={selectedFungsi.includes(val)} onChange={(e) => { if (e.target.checked) setSelectedFungsi(prev => [...prev, val]); else setSelectedFungsi(prev => prev.filter(f => f !== val)); }} className="w-4 h-4 rounded border-slate-300 text-indigo-600 accent-indigo-600 cursor-pointer" />
                                            <span className="text-xs font-medium">{val}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Opsi Konstruksi */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Jenis Konstruksi</span>
                            </Label>
                            <div className="grid grid-cols-2 gap-2 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                                {konstruksiOptions.map((opt) => {
                                    const val = opt.label || opt.id;
                                    return (
                                        <label key={opt.id} className="flex items-center gap-2 cursor-pointer text-xs select-none p-0.5">
                                            <input type="checkbox" checked={selectedKonstruksi.includes(val)} onChange={(e) => { if (e.target.checked) setSelectedKonstruksi(prev => [...prev, val]); else setSelectedKonstruksi(prev => prev.filter(k => k !== val)); }} className="w-4 h-4 rounded border-slate-300 text-emerald-600 accent-emerald-600 cursor-pointer" />
                                            <span className="text-xs font-medium">{val}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Deskripsi */}
                        <div className="space-y-1.5">
                            <Label htmlFor="dialogDeskripsi" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Keterangan / Progress</span>
                            </Label>
                            <Textarea id="dialogDeskripsi" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} placeholder="Tulis detail pekerjaan..." className="text-xs min-h-[70px] resize-none rounded-xl border-slate-200 dark:border-slate-700" />
                        </div>

                        <DialogFooter className="pt-3 gap-2 flex items-center justify-between">
                            {isEditMode && selectedEntryId && (
                                <Button type="button" variant="destructive" className="h-9 text-xs font-bold gap-1.5 bg-rose-600 hover:bg-rose-700 mr-auto"
                                    onClick={() => { setIsOpenEntryDialog(false); handleDeleteEntry(selectedEntryId); }}>
                                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                                </Button>
                            )}
                            <div className="flex items-center gap-2 ml-auto">
                                <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setIsOpenEntryDialog(false)}>Batal</Button>
                                <Button type="submit" className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 font-bold gap-1.5">
                                    <Check className="w-3.5 h-3.5" />
                                    {isEditMode ? "Perbarui & Kelola Titik" : "Simpan & Kelola Titik"}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ============================================================
                MODAL DIALOG: VERIFIKASI LAPORAN REALISASI
            ============================================================ */}
            <Dialog open={isOpenDetailDialog} onOpenChange={setIsOpenDetailDialog}>
                <DialogContent className="sm:max-w-[540px] rounded-2xl border border-slate-200 dark:border-slate-800 p-0 overflow-hidden shadow-2xl">
                    <DialogHeader className="px-6 pt-5 pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b border-slate-200/80 dark:border-slate-800">
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                            <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <span>Verifikasi Geotagging Realisasi</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
                            Periksa rincian data geotagging dan berikan rekomendasi persetujuan atau penolakan.
                        </DialogDescription>
                    </DialogHeader>

                    {detailEntry && (
                        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                            {/* Summary Detail Card */}
                            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{detailEntry.nama_kegiatan}</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {detailEntry.nama_desa ? `${detailEntry.nama_desa}, Kec. ${detailEntry.nama_kecamatan}` : "Kab. Bojonegoro"}
                                        </p>
                                    </div>
                                    <StatusBadge status={detailEntry.status} />
                                </div>

                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 text-xs">
                                    <div>
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Volume</p>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{detailEntry.volume || "–"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Anggaran</p>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                                            {detailEntry.anggaran ? `Rp ${Number(detailEntry.anggaran).toLocaleString("id-ID")}` : "–"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Koordinat</p>
                                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                                            {detailEntry.titik && detailEntry.titik.length > 0 ? `${detailEntry.titik.length} Titik` : "Belum diisi"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Verification Notes Form */}
                            <div className="space-y-1.5">
                                <Label htmlFor="catatanAdminDialog" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Catatan / Rekomendasi Verifikasi
                                </Label>
                                <Textarea
                                    id="catatanAdminDialog"
                                    value={catatanAdmin}
                                    onChange={(e) => setCatatanAdmin(e.target.value)}
                                    placeholder="Tulis alasan jika menolak, atau catatan tambahan persetujuan..."
                                    className="text-xs min-h-[90px] rounded-xl bg-background border-slate-200 dark:border-slate-700 focus-visible:ring-indigo-500"
                                />
                            </div>

                            {/* Verification Log Preview if already verified/rejected */}
                            {(detailEntry.status === "verified" || detailEntry.status === "rejected") && (
                                <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300 space-y-2">
                                    <div className="flex items-center gap-1.5 font-bold">
                                        <AlertCircle className="w-4 h-4 text-amber-600" />
                                        Status Geotagging: {detailEntry.status === "verified" ? "Disetujui" : "Ditolak"}
                                    </div>
                                    <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                                        Anda dapat membatalkan atau mengubah status verifikasi geotagging ini.
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-xs h-8 font-bold border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/50 rounded-xl"
                                        onClick={handleCancelVerify}
                                    >
                                        <X className="w-3.5 h-3.5 mr-1 text-amber-600" /> Batalkan Status Verifikasi
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                        <Button type="button" variant="outline" className="h-9 text-xs rounded-xl" onClick={() => setIsOpenDetailDialog(false)}>
                            Batal
                        </Button>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="destructive"
                                className="h-9 text-xs rounded-xl font-bold px-4 gap-1.5"
                                onClick={() => handleVerify("rejected")}
                            >
                                <X className="w-3.5 h-3.5" /> Tolak Geotagging
                            </Button>
                            <Button
                                type="button"
                                className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold px-4 gap-1.5 shadow-sm"
                                onClick={() => handleVerify("verified")}
                            >
                                <Check className="w-3.5 h-3.5" /> Setujui Geotagging
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============================================================
                MAP FULLSCREEN LAYER
            ============================================================ */}
            <div ref={mapElementRef} className="absolute inset-0 w-full h-full z-0" />

            {/* ============================================================
                LEFT PANEL CONTENT HELPER
            ============================================================ */}
            {(() => {
                const renderLeftPanelContent = () => (
                    <>
                        {/* Panel Header */}
                        <div className="shrink-0 px-4 pt-3 pb-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-900/50">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center shrink-0">
                                        <ClipboardList className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-tight">Daftar Geotagging</h2>
                                        <p className="text-[10px] text-muted-foreground">{paginationMeta.total} data geotagging</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border-slate-200 dark:border-slate-700 rounded-xl"
                                        title="Muat ulang data geotagging"
                                        onClick={() => {
                                            fetchEntries();
                                            toast.success("Memuat ulang data geotagging...");
                                        }}
                                        disabled={isLoading}
                                    >
                                        <RotateCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 rounded-xl shadow-sm shadow-indigo-500/20"
                                        onClick={handleOpenCreateEntry}
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Tambah
                                    </Button>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="outline"
                                                    className="h-8 w-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all duration-200 cursor-pointer pointer-events-auto active:scale-95"
                                                    onClick={() => setIsLeftPanelOpen(false)}
                                                >
                                                    {isMobile ? <PanelBottomClose className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="text-xs font-semibold">
                                                Sembunyikan Panel Geotagging
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>

                            {/* Filter Bar */}
                            <div className="space-y-2">
                                {/* Status Filter Tabs Menu */}
                                <Tabs value={filterStatus} onValueChange={(val) => { setFilterStatus(val); setPage(1); }} className="w-full">
                                    <TabsList className="w-full grid grid-cols-5 h-8 bg-slate-200/60 dark:bg-slate-800/60 p-0.5 rounded-xl gap-0.5">
                                        <TabsTrigger value="all" className="w-full text-[10px] px-0.5 py-1 font-bold rounded-lg truncate data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-xs">
                                            Semua
                                        </TabsTrigger>
                                        <TabsTrigger value="draft" className="w-full text-[10px] px-0.5 py-1 font-bold rounded-lg truncate data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 data-[state=active]:shadow-xs">
                                            Draft
                                        </TabsTrigger>
                                        <TabsTrigger value="submitted" className="w-full text-[10px] px-0.5 py-1 font-bold rounded-lg truncate data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-xs">
                                            Dikirim
                                        </TabsTrigger>
                                        <TabsTrigger value="verified" className="w-full text-[10px] px-0.5 py-1 font-bold rounded-lg truncate data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-xs">
                                            Disetujui
                                        </TabsTrigger>
                                        <TabsTrigger value="rejected" className="w-full text-[10px] px-0.5 py-1 font-bold rounded-lg truncate data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400 data-[state=active]:shadow-xs">
                                            Ditolak
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>

                                {/* Search Input inside Panel Kiri */}
                                <div className="relative w-full">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Cari kegiatan / desa..."
                                        autoComplete="off"
                                        className="pl-8 pr-7 h-8 text-xs rounded-xl bg-background border-slate-200 dark:border-slate-700 w-full"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery("")}
                                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Entry Card List */}
                        <div className="flex-1 overflow-y-auto">
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2 py-16 text-xs text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin text-indigo-500" /> Memuat geotagging...
                                </div>
                            ) : entries.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center">
                                    <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700" />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Belum ada data</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Klik "+ Tambah" untuk menambahkan geotagging baru.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 space-y-2">
                                    {entries.map((entry) => {
                                        const isActive = activeEntry?.id === entry.id;
                                        const canManage = entry.status === "draft" || entry.status === "rejected";
                                        const titikCount = entry.titik?.length || 0;
                                        return (
                                            <div
                                                key={entry.id}
                                                className={cn(
                                                    "rounded-2xl border transition-all cursor-pointer text-xs space-y-2 p-3",
                                                    isActive
                                                        ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-sm shadow-indigo-200/60"
                                                        : "border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                                                )}
                                                onClick={async () => {
                                                    await handleSelectEntryOnMap(entry);
                                                    setIsRightPanelOpen(false);
                                                    if (typeof window !== 'undefined' && window.innerWidth < 640) {
                                                        setIsLeftPanelOpen(false);
                                                    }
                                                }}
                                            >
                                                {/* Card Header */}
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-slate-800 dark:text-slate-200 truncate" title={entry.nama_kegiatan}>
                                                            {entry.nama_kegiatan}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                                            {entry.nama_desa ? `${entry.nama_desa}, Kec. ${entry.nama_kecamatan}` : "Lokasi belum diisi"}
                                                        </div>
                                                    </div>
                                                    <StatusBadge status={entry.status} />
                                                </div>

                                                {/* Metadata chips */}
                                                {(entry.volume || entry.anggaran || (entry.fungsi_infrastruktur && entry.fungsi_infrastruktur.length > 0)) && (
                                                    <div className="flex flex-wrap items-center gap-1">
                                                        {titikCount > 0 && (
                                                            <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 px-1.5 py-0.5 rounded-md font-bold">
                                                                {titikCount} Titik
                                                            </span>
                                                        )}
                                                        {entry.volume && (
                                                            <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md font-medium text-slate-600 dark:text-slate-300">
                                                                {entry.volume}
                                                            </span>
                                                        )}
                                                        {entry.anggaran && (
                                                            <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 px-1.5 py-0.5 rounded-md font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
                                                                Rp {Number(entry.anggaran).toLocaleString("id-ID")}
                                                            </span>
                                                        )}
                                                        {entry.fungsi_infrastruktur?.map((f, i) => (
                                                            <span key={i} className="text-[9px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-medium border border-indigo-100 dark:border-indigo-900/40">
                                                                {f}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Actions — visible when card is active */}
                                                {isActive && (
                                                    <div className="flex flex-col gap-1.5 pt-2 border-t border-dashed border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                                                        <Button
                                                            size="sm"
                                                            className="w-full h-8 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs gap-1.5"
                                                            onClick={() => {
                                                                setIsRightPanelOpen(true);
                                                                setRightPanelTab('coords');
                                                                if (typeof window !== 'undefined' && window.innerWidth < 640) {
                                                                    setIsLeftPanelOpen(false);
                                                                }
                                                            }}
                                                        >
                                                            <MapPin className="w-3.5 h-3.5" /> Kelola Koordinat
                                                        </Button>

                                                        {isVerifier && entry.status === 'submitted' && (
                                                            <Button
                                                                size="sm"
                                                                className="w-full h-8 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs gap-1.5"
                                                                onClick={() => {
                                                                    handleOpenDetail(entry);
                                                                }}
                                                            >
                                                                <CheckCircle2 className="w-3.5 h-3.5" /> Verifikasi Geotagging
                                                            </Button>
                                                        )}

                                                        {canManage && (
                                                            <div className="flex items-center gap-1.5 pt-0.5">
                                                                <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px] rounded-lg border-slate-200 dark:border-slate-700 font-medium gap-1" onClick={() => handleOpenEditEntry(entry)}>
                                                                    <Edit3 className="w-3 h-3" /> Edit
                                                                </Button>
                                                                <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-[10px] rounded-lg border-rose-200 dark:border-rose-800/60 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20" onClick={() => handleDeleteEntry(entry.id)}>
                                                                    <Trash2 className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                        {canManage && (entry.status === 'draft' || entry.status === 'rejected') && (
                                                            <Button size="sm" className="w-full h-7 text-[10px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs gap-1" onClick={() => handleSubmitEntry(entry.id)}>
                                                                <Send className="w-2.5 h-2.5" /> {entry.status === 'rejected' ? "Kirim Ulang Geotagging" : "Kirim Geotagging"}
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Pagination Footer */}
                        <div className="shrink-0 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40">
                            <UsulanDesaPagination
                                compact
                                pageIndex={page - 1}
                                pageCount={paginationMeta.totalPages}
                                pageSize={filterLimit === "all" ? paginationMeta.total : Number(filterLimit || 25)}
                                totalItems={paginationMeta.total}
                                onPageChange={(idx: number) => setPage(idx + 1)}
                                onPageSizeChange={(newSize: number) => { setFilterLimit(String(newSize)); setPage(1); }}
                            />
                        </div>
                    </>
                );

                return (
                    <>
                        {/* DESKTOP SIDEBAR (sm and above) */}
                        <div className={cn(
                            "hidden sm:flex absolute top-0 bottom-0 left-0 w-96 max-w-full bg-white/97 dark:bg-slate-950/97 backdrop-blur-xl shadow-2xl border-r border-slate-200/80 dark:border-slate-800/80 transition-all duration-300 ease-in-out z-30 flex-col overflow-hidden",
                            isLeftPanelOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
                        )}>
                            {renderLeftPanelContent()}
                        </div>

                        {/* MOBILE BOTTOM SHEET (< sm) */}
                        {isMobile && (
                            <Sheet open={isLeftPanelOpen} onOpenChange={setIsLeftPanelOpen}>
                                <SheetContent side="bottom" showCloseButton={false} className="sm:hidden h-[85vh] max-h-[85vh] rounded-t-3xl p-0 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/98 dark:bg-slate-950/98 backdrop-blur-2xl shadow-2xl flex flex-col overflow-hidden z-50">
                                    <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 shrink-0" />
                                    {renderLeftPanelContent()}
                                </SheetContent>
                            </Sheet>
                        )}
                    </>
                );
            })()}

            {/* ============================================================
                RIGHT PANEL CONTENT HELPER
            ============================================================ */}
            {(() => {
                const renderRightPanelContent = () => (
                    activeEntry ? (
                        <>
                            {/* Right Panel Header */}
                            <div className="shrink-0 p-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-900/50">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center shrink-0 mt-0.5">
                                            <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h2 className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-tight">
                                                {(activeEntry.status === 'draft' || activeEntry.status === 'rejected') ? "Kelola Koordinat" : "Detail & Koordinat"}
                                            </h2>
                                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate" title={activeEntry.nama_kegiatan}>{activeEntry.nama_kegiatan}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg shrink-0" onClick={() => setIsRightPanelOpen(false)}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                                    <StatusBadge status={activeEntry.status} />
                                    <span className="text-[10px] text-muted-foreground">{activeEntry.nama_desa || "–"}, Kec. {activeEntry.nama_kecamatan || "–"}</span>
                                </div>

                                {/* 2 Tabs Menu */}
                                <Tabs value={rightPanelTab} onValueChange={(val) => setRightPanelTab(val as 'coords' | 'info')} className="w-full mt-3">
                                    <TabsList className="grid grid-cols-2 h-8 bg-slate-200/60 dark:bg-slate-800/60 p-0.5 rounded-xl">
                                        <TabsTrigger value="coords" className="text-xs font-bold rounded-lg gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-xs">
                                            <LocateFixed className="w-3.5 h-3.5" /> Data Koordinat
                                        </TabsTrigger>
                                        <TabsTrigger value="info" className="text-xs font-bold rounded-lg gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-xs">
                                            <FileText className="w-3.5 h-3.5" /> Detail Informasi
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>

                            {/* Right Panel Body */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {rightPanelTab === 'coords' ? (
                                    <>
                                        {/* Instruction Box */}
                                        {(activeEntry.status === 'draft' || activeEntry.status === 'rejected') && (
                                            <div className="p-3 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/50 bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                                                        <Crosshair className="w-3 h-3" />
                                                    </div>
                                                    <h4 className="font-bold text-xs">Petunjuk Penambahan Titik</h4>
                                                </div>
                                                <ol className="text-[11px] leading-relaxed text-indigo-800 dark:text-indigo-300 list-decimal list-inside space-y-1">
                                                    <li>Klik <strong>"+ Tambah"</strong> pada grup Titik Awal atau Titik Akhir.</li>
                                                    <li>Ketuk/klik lokasi langsung pada <strong>peta interaktif</strong>.</li>
                                                    <li>Simpan sebelum mengirim Geotagging.</li>
                                                </ol>
                                            </div>
                                        )}

                                        {/* Points */}
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 px-0.5 mb-2">
                                                <div className="w-5 h-5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center">
                                                    <LocateFixed className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <h3 className="font-bold text-xs text-slate-700 dark:text-slate-300">Data Koordinat Lokasi</h3>
                                            </div>
                                            <div className="space-y-4">
                                                {renderPointGroup('start')}
                                                {renderPointGroup('end')}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* LOG VERIFIKASI LAPORAN CARD */}
                                        <div className="bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center shrink-0">
                                                        <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 leading-tight">Log Verifikasi Geotagging</h4>
                                                        <p className="text-[10px] text-muted-foreground">Riwayat status & rekomendasi</p>
                                                    </div>
                                                </div>
                                                <StatusBadge status={activeEntry.status} />
                                            </div>

                                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="text-muted-foreground font-medium">Status Geotagging:</span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">{activeEntry.status}</span>
                                                </div>

                                                {activeEntry.catatan_admin ? (
                                                    <div className="p-2.5 rounded-xl border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20 text-[11px] space-y-1">
                                                        <p className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                                                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Catatan / Rekomendasi Verifikator:
                                                        </p>
                                                        <p className="text-amber-800 dark:text-amber-400 italic leading-relaxed pl-4">
                                                            "{activeEntry.catatan_admin}"
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className="text-[11px] text-muted-foreground italic">Belum ada catatan khusus verifikator.</p>
                                                )}

                                                {isVerifier && (
                                                    <div className="pt-2">
                                                        {activeEntry.status === 'submitted' ? (
                                                            <Button
                                                                size="sm"
                                                                className="w-full h-8 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 shadow-xs"
                                                                onClick={() => handleOpenDetail(activeEntry)}
                                                            >
                                                                <CheckCircle2 className="w-3.5 h-3.5" /> Verifikasi Geotagging
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="w-full h-8 text-xs rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold gap-1.5"
                                                                onClick={() => handleOpenDetail(activeEntry)}
                                                            >
                                                                <Edit3 className="w-3.5 h-3.5" /> Ubah Status Verifikasi
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Entry Metadata Summary */}
                                        {(activeEntry.volume || activeEntry.anggaran || activeEntry.deskripsi || (activeEntry.fungsi_infrastruktur && activeEntry.fungsi_infrastruktur.length > 0)) && (
                                            <div className="bg-slate-50/60 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-2xl p-3.5 space-y-3 text-xs">
                                                {(activeEntry.volume || activeEntry.anggaran) && (
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {activeEntry.volume && (
                                                            <div>
                                                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Volume</p>
                                                                <p className="font-semibold text-slate-800 dark:text-slate-200">{activeEntry.volume}</p>
                                                            </div>
                                                        )}
                                                        {activeEntry.anggaran && (
                                                            <div>
                                                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Anggaran</p>
                                                                <p className="font-semibold text-slate-800 dark:text-slate-200">Rp {Number(activeEntry.anggaran).toLocaleString("id-ID")}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {activeEntry.fungsi_infrastruktur && activeEntry.fungsi_infrastruktur.length > 0 && (
                                                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1">
                                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Fungsi Infrastruktur</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {activeEntry.fungsi_infrastruktur.map((f, i) => (
                                                                <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/60">{f}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {activeEntry.opsi_konstruksi && activeEntry.opsi_konstruksi.length > 0 && (
                                                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1">
                                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Jenis Konstruksi</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {activeEntry.opsi_konstruksi.map((k, i) => (
                                                                <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/60">{k}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {activeEntry.deskripsi && (
                                                    <div className={cn((activeEntry.volume || activeEntry.anggaran || (activeEntry.fungsi_infrastruktur && activeEntry.fungsi_infrastruktur.length > 0)) && "pt-2.5 border-t border-slate-100 dark:border-slate-800")}>
                                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Keterangan</p>
                                                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{activeEntry.deskripsi}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Right Panel Footer — Submit Button */}
                            {(activeEntry.status === 'draft' || activeEntry.status === 'rejected') && (
                                <div className="shrink-0 p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40">
                                    <Button className="w-full text-xs h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-500/25 gap-2" onClick={() => handleSubmitEntry(activeEntry.id)}>
                                        <Send className="w-3.5 h-3.5" /> {activeEntry.status === 'rejected' ? "Kirim Ulang Geotagging" : "Kirim Geotagging"}
                                    </Button>
                                </div>
                            )}
                        </>
                    ) : null
                );

                return (
                    <>
                        {/* DESKTOP RIGHT PANEL (sm and above) */}
                        <div className={cn(
                            "hidden sm:flex absolute top-0 bottom-0 right-0 w-96 max-w-full bg-white/97 dark:bg-slate-950/97 backdrop-blur-xl shadow-2xl border-l border-slate-200/80 dark:border-slate-800/80 transition-all duration-300 ease-in-out z-30 flex-col overflow-hidden",
                            activeEntry && isRightPanelOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
                        )}>
                            {renderRightPanelContent()}
                        </div>

                        {/* MOBILE RIGHT PANEL BOTTOM SHEET (< sm) */}
                        {isMobile && (
                            <Sheet open={Boolean(activeEntry && isRightPanelOpen)} onOpenChange={setIsRightPanelOpen}>
                                <SheetContent side="bottom" showCloseButton={false} className="sm:hidden h-[85vh] max-h-[85vh] rounded-t-3xl p-0 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/98 dark:bg-slate-950/98 backdrop-blur-2xl shadow-2xl flex flex-col overflow-hidden z-50">
                                    <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 shrink-0" />
                                    {renderRightPanelContent()}
                                </SheetContent>
                            </Sheet>
                        )}
                    </>
                );
            })()}

            {/* FLOATING: Show/Hide Left Panel Button on Map Canvas (Identical to InfrastrukturPanel) */}
            {!isLeftPanelOpen && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                onClick={() => setIsLeftPanelOpen(true)}
                                className="absolute top-4 left-4 z-40 h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all duration-200 cursor-pointer pointer-events-auto active:scale-95"
                            >
                                {isMobile ? <PanelBottomOpen className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs font-semibold">
                            Tampilkan Panel Laporan
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            {/* FLOATING: Form Combobox Filter (Sebelah Kanan Panel Kiri) */}
            <div className={cn(
                "absolute top-4 z-30 transition-all duration-300 ease-in-out pointer-events-auto flex items-center gap-2",
                isLeftPanelOpen
                    ? "left-4 sm:left-[calc(24rem+1rem)]"
                    : "left-16"
            )}>
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-1 shadow-xl shadow-slate-950/10">
                    <Popover open={formComboboxOpen} onOpenChange={setFormComboboxOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                role="combobox"
                                aria-expanded={formComboboxOpen}
                                className="w-48 sm:w-60 h-8 text-xs font-semibold justify-between bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl px-2.5"
                            >
                                <span className="truncate">
                                    {filterForm === "all"
                                        ? "Semua Form"
                                        : allForms.find((f) => f.id === filterForm)?.judul || "Pilih Form..."}
                                </span>
                                <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0 rounded-2xl border-slate-200 dark:border-slate-800 shadow-2xl z-50" align="start">
                            <Command>
                                <CommandInput placeholder="Cari formulir..." className="h-9 text-xs" />
                                <CommandList>
                                    <CommandEmpty className="text-xs py-3 text-center text-muted-foreground">Tidak ditemukan.</CommandEmpty>
                                    <CommandGroup>
                                        <CommandItem
                                            value="all Semua Form"
                                            onSelect={() => {
                                                setFilterForm("all");
                                                setPage(1);
                                                setFormComboboxOpen(false);
                                            }}
                                            className="text-xs cursor-pointer font-medium py-2"
                                        >
                                            <Check className={cn("mr-2 h-3.5 w-3.5 text-indigo-600", filterForm === "all" ? "opacity-100" : "opacity-0")} />
                                            <span>Semua Form</span>
                                        </CommandItem>
                                        {allForms.map((form) => (
                                            <CommandItem
                                                key={form.id}
                                                value={`${form.judul} ${form.tahun_anggaran}`}
                                                onSelect={() => {
                                                    setFilterForm(form.id);
                                                    setPage(1);
                                                    setFormComboboxOpen(false);
                                                }}
                                                className="text-xs cursor-pointer font-medium py-2"
                                            >
                                                <Check className={cn("mr-2 h-3.5 w-3.5 text-indigo-600", filterForm === form.id ? "opacity-100" : "opacity-0")} />
                                                <span className="truncate">{form.judul} ({form.tahun_anggaran})</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* FLOATING: Premium Active Entry Card Bar - Responsive Center */}
            {activeEntry && (
                <div className={cn(
                    "absolute bottom-6 z-20 transition-all duration-300 ease-in-out w-[92%] sm:w-auto max-w-md pointer-events-auto -translate-x-1/2",
                    isLeftPanelOpen && !isRightPanelOpen && "left-1/2 sm:left-[calc(50%+12rem)]",
                    !isLeftPanelOpen && isRightPanelOpen && "left-1/2 sm:left-[calc(50%-12rem)]",
                    ((isLeftPanelOpen && isRightPanelOpen) || (!isLeftPanelOpen && !isRightPanelOpen)) && "left-1/2"
                )}>
                    <div className="flex items-center gap-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-indigo-500/40 dark:border-indigo-500/30 rounded-2xl p-2.5 sm:px-4 sm:py-2.5 shadow-2xl shadow-indigo-950/20">
                        {/* Animated pulse dot */}
                        <div className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
                        </div>

                        {/* Title & info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[170px] sm:max-w-[220px]" title={activeEntry.nama_kegiatan}>
                                    {activeEntry.nama_kegiatan}
                                </span>
                                <StatusBadge status={activeEntry.status} />
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                {activeEntry.nama_desa ? `${activeEntry.nama_desa}, Kec. ${activeEntry.nama_kecamatan}` : "Kab. Bojonegoro"}
                                {activeEntry.titik && activeEntry.titik.length > 0 && ` • ${activeEntry.titik.length} Titik`}
                            </p>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                            <Button
                                size="sm"
                                className="h-7 text-[10px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 gap-1 shadow-xs"
                                onClick={() => setIsRightPanelOpen(true)}
                            >
                                <MapPin className="w-3 h-3" />
                                <span>Kelola</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                                title="Tutup detail aktif"
                                onClick={() => {
                                    setActiveEntry(null);
                                    setIsRightPanelOpen(false);
                                }}
                            >
                                <X className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* FLOATING: Draw Mode Indicator */}
            {activeEntry && (editingPointId || addingTipe) && (
                <div className="absolute bottom-6 z-20 flex justify-center items-center pointer-events-none"
                    style={{ left: isLeftPanelOpen ? '24rem' : '0px', right: isRightPanelOpen ? '24rem' : '0px' }}>
                    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-amber-200 dark:border-amber-800/60 rounded-2xl shadow-xl shadow-amber-500/10 pointer-events-auto">
                        <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0 animate-pulse">
                            <Crosshair className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">Mode Klik Peta Aktif</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">
                                Klik di peta untuk mengambil koordinat {editingPointId ? "titik" : (addingTipe === "start" ? "START" : "END")}.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* FLOATING: Map Controls (Zoom In / Zoom Out) - Pojok Kiri Bawah */}
            <MapControls
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                className={cn(
                    "absolute transition-all duration-300 z-20",
                    "bottom-6 left-4",
                    isLeftPanelOpen ? "sm:left-[calc(24rem+1rem)]" : "left-4"
                )}
            />

            {/* FLOATING: Basemap Switcher - Pojok Kanan Bawah */}
            <BasemapToggle
                activeBasemap={activeBasemap}
                onBasemapChange={setActiveBasemap}
                className={cn(
                    "absolute transition-all duration-300 z-20",
                    "bottom-6 right-4",
                    isRightPanelOpen ? "sm:right-[calc(24rem+1rem)]" : "right-4"
                )}
            />

            {/* Confirmation AlertDialog */}
            <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                <AlertDialogContent className="rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 max-w-sm sm:max-w-md shadow-2xl">
                    <AlertDialogHeader>
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3",
                            (confirmDialogType === 'delete_entry' || confirmDialogType === 'delete_coord')
                                ? "bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800"
                                : "bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800"
                        )}>
                            {(confirmDialogType === 'delete_entry' || confirmDialogType === 'delete_coord')
                                ? <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                                : <Send className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            }
                        </div>
                        <AlertDialogTitle className="text-slate-800 dark:text-slate-200 text-center font-bold">
                            {confirmDialogType === 'delete_entry' && "Hapus Data Geotagging"}
                            {confirmDialogType === 'delete_coord' && "Hapus Titik Koordinat"}
                            {confirmDialogType === 'submit_entry' && "Kirim Geotagging Realisasi"}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs leading-relaxed text-center text-slate-500 dark:text-slate-400">
                            {confirmDialogType === 'delete_entry' && "Apakah Anda yakin ingin menghapus data geotagging ini? Seluruh titik koordinat terkait akan terhapus secara permanen."}
                            {confirmDialogType === 'delete_coord' && "Apakah Anda yakin ingin menghapus titik koordinat ini?"}
                            {confirmDialogType === 'submit_entry' && "Apakah Anda yakin ingin mengirim hasil geotagging ini? Data geotagging yang dikirim akan segera diproses oleh verifikator."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 mt-2">
                        <AlertDialogCancel className="text-xs h-9 rounded-xl border-slate-200 dark:border-slate-700 flex-1 font-semibold">Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmAction} className={cn(
                            "text-xs h-9 rounded-xl text-white font-bold flex-1 gap-1.5",
                            (confirmDialogType === 'delete_entry' || confirmDialogType === 'delete_coord')
                                ? "bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-500/25"
                                : "bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-500/25"
                        )}>
                            {(confirmDialogType === 'delete_entry' || confirmDialogType === 'delete_coord') ? (
                                <>
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Ya, Hapus</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-3.5 h-3.5" />
                                    <span>Ya, Kirim</span>
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}