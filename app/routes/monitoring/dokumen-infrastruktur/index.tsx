import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
    Printer,
    FileText,
    Plus,
    Search,
    RotateCw,
    RotateCcw,
    Trash2,
    CheckCircle,
    Building2,
    Calendar,
    Eye,
    ChevronRight,
    Sparkles,
    MapPin,
    X,
    Layers,
    Table as TableIcon,
    Lock,
    MoreHorizontal,
    ChevronLeft,
    SlidersHorizontal,
    Filter,
    Check,
    Edit3,
    Download,
    Loader2,
    AlertCircle,
    AlertTriangle,
    ShieldCheck,
    Clock,
    CheckCheck,
    TrendingUp,
    Compass,
    ArrowRight,
    ArrowUpRight,
    Copy,
    ZoomIn,
    ZoomOut,
    Maximize2,
    Activity,
    Coins,
    Ruler,
    Info
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Combobox, type ComboboxOption } from "~/components/ui/combobox";
import { DatePicker } from "~/components/ui/date-picker";
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
} from "~/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "~/components/ui/dialog";
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent
} from "~/components/ui/tabs";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "~/components/ui/alert-dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "~/components/ui/tooltip";
import { UsulanDesaPagination } from "~/features/usulan-desa/components/UsulanDesaPagination";
import { monitoringLaporanService, type MonitoringLaporan } from "~/features/monitoring/services/monitoring_laporan.service";
import { BulkCreateDraftModal } from "~/features/monitoring/components/dokumen-infrastruktur/BulkCreateDraftModal";
import { EditDokumenModal } from "~/features/monitoring/components/dokumen-infrastruktur/EditDokumenModal";
import { ConfirmDeleteDialog } from "~/components/ConfirmDeleteDialog";
import { monitoringService } from "~/features/monitoring/services/monitoring.service";
import { plottingAnggaranService } from "~/features/monitoring/services/plotting_anggaran.service";
import { kecamatanService } from "~/services/kecamatan";
import { desaService } from "~/services/desa";
import { useAuth } from "~/contexts/auth-context";
import { canManagePenugasan, canPrintBeritaAcara, hasGlobalRegionalScope, isReadOnlyRole } from "~/utils/permissions";
import { useNavigate, useSearchParams } from "react-router";
import type { MetaFunction } from "react-router";

import OLMap from "ol/Map";
import View from "ol/View";
import Feature from "ol/Feature";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { Point, LineString } from "ol/geom";
import { fromLonLat } from "ol/proj";
import { Stroke, Style, Circle as CircleStyle, Fill } from "ol/style";
import { BasemapToggle } from "~/features/monitoring/components/BasemapToggle";
import "ol/ol.css";

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
        maxZoom: 19
    });
};

export const meta: MetaFunction = () => {
    return [
        { title: "Dokumen Infrastruktur - MELAROSA" },
        { name: "description", content: "Halaman pengarsipan dan cetak dokumen resmi Berita Acara realisasi infrastruktur desa" },
    ];
};

export default function DokumenInfrastrukturPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const currentUserName = React.useMemo(() => user?.nama || (user as any)?.nama_user || (user as any)?.name || (user as any)?.username || (user as any)?.email || "Operator Bappeda", [user]);

    const handleNavigateToPeta = (lap: any) => {
        if (!lap) return;
        const idKec = lap.id_kecamatan || lap.Kecamatan?.id || lap.Desa?.id_kecamatan || "";
        const idDesa = lap.id_desa || lap.Desa?.id || "";
        const tahun = lap.tahun_anggaran || "";
        const tipe = lap.tipe_kode || (Array.isArray(lap.tipe_kode) ? lap.tipe_kode[0] : "") || "jalan";
        const params = new URLSearchParams();
        if (idKec) params.append("id_kecamatan", idKec.toString());
        if (idDesa) params.append("id_desa", idDesa.toString());
        if (tahun) params.append("tahun", tahun.toString());
        if (tipe) params.append("tipe", tipe.toString());
        params.append("mode", "revisi");

        navigate(`/admin/monitoring/realisasi-infrastruktur?${params.toString()}`);
    };

    const [laporanList, setLaporanList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeRowId, setActiveRowId] = useState<string | null>(null);
    const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

    const [kecamatanList, setKecamatanList] = useState<any[]>([]);
    const [desaList, setDesaList] = useState<any[]>([]);
    const [selectedKec, setSelectedKec] = useState<string>("all");
    const [selectedDesa, setSelectedDesa] = useState<string>("all");
    const [selectedTahun, setSelectedTahun] = useState<string>("Semua");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    const activeFilterCount = React.useMemo(() => {
        let count = 0;
        if (selectedKec && selectedKec !== "all") count++;
        if (selectedDesa && selectedDesa !== "all") count++;
        if (selectedTahun && selectedTahun !== "Semua") count++;
        if (selectedStatus && selectedStatus !== "all") count++;
        if (startDate) count++;
        if (endDate) count++;
        return count;
    }, [selectedKec, selectedDesa, selectedTahun, selectedStatus, startDate, endDate]);

    const kecamatanFilterOptions: ComboboxOption[] = React.useMemo(() => [
        { value: "all", label: "Semua Kecamatan" },
        ...kecamatanList.map(k => ({ value: k.id.toString(), label: k.nama_kecamatan }))
    ], [kecamatanList]);

    const desaFilterOptions: ComboboxOption[] = React.useMemo(() => [
        { value: "all", label: "Semua Desa" },
        ...desaList.map(d => ({ value: d.id.toString(), label: d.nama_desa }))
    ], [desaList]);

    const tahunFilterOptions: ComboboxOption[] = React.useMemo(() => [
        { value: "2026", label: "TA 2026" },
        { value: "2025", label: "TA 2025" },
        { value: "2024", label: "TA 2024" },
        { value: "2023", label: "TA 2023" },
        { value: "Semua", label: "Semua Tahun" },
    ], []);

    const statusFilterOptions: ComboboxOption[] = React.useMemo(() => [
        { value: "all", label: "Semua Status" },
        { value: "Draft", label: "Draft / Revisi" },
        { value: "Submitted", label: "Submitted" },
        { value: "Final", label: "Final" }
    ], []);

    // Pagination State
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);

    // Detail Modal State
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedDetailLaporan, setSelectedDetailLaporan] = useState<any>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [mapElement, setMapElement] = useState<HTMLDivElement | null>(null);
    const [detailActiveTab, setDetailActiveTab] = useState<'map' | 'segments'>('map');
    const [detailActiveBasemap, setDetailActiveBasemap] = useState<string>("google-sat");
    const [segmentSearch, setSegmentSearch] = useState<string>("");
    const [segmentFilter, setSegmentFilter] = useState<'all' | 'poros' | 'non_poros'>('all');
    const [isPrintDraftAlertOpen, setIsPrintDraftAlertOpen] = useState(false);

    // Revert to Draft Modal State
    const [revertDialogOpen, setRevertDialogOpen] = useState(false);
    const [selectedLaporanToRevert, setSelectedLaporanToRevert] = useState<any>(null);
    const [catatanRevisiInput, setCatatanRevisiInput] = useState("");
    const [isSubmittingRevert, setIsSubmittingRevert] = useState(false);

    // OpenLayers detail map refs
    const mapDetailContainerRef = useRef<HTMLDivElement | null>(null);
    const detailMapRef = useRef<OLMap | null>(null);
    const detailSourceRef = useRef<VectorSource | null>(null);
    const detailBaseLayerRef = useRef<TileLayer<XYZ | OSM> | null>(null);

    const handleDetailMapZoomIn = () => {
        if (!detailMapRef.current) return;
        const view = detailMapRef.current.getView();
        view.animate({ zoom: (view.getZoom() || 13) + 1, duration: 200 });
    };

    const handleDetailMapZoomOut = () => {
        if (!detailMapRef.current) return;
        const view = detailMapRef.current.getView();
        view.animate({ zoom: (view.getZoom() || 13) - 1, duration: 200 });
    };

    const handleDetailMapFitBounds = () => {
        if (!detailMapRef.current || !detailSourceRef.current) return;
        const extent = detailSourceRef.current.getExtent();
        if (extent && extent.some(v => isFinite(v)) && extent[0] !== Infinity && extent[0] !== -Infinity) {
            detailMapRef.current.getView().fit(extent, {
                padding: [60, 60, 60, 60],
                maxZoom: 17,
                duration: 300
            });
        }
    };

    const handleCopyNomorBa = (nomorBa: string) => {
        if (!nomorBa) return;
        navigator.clipboard.writeText(nomorBa);
        toast.success("Nomor dokumen berhasil disalin ke clipboard!");
    };

    // Modal Create State
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Modal Edit Dokumen State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedLaporanToEdit, setSelectedLaporanToEdit] = useState<MonitoringLaporan | null>(null);

    const handleOpenEdit = (lap: MonitoringLaporan) => {
        setSelectedLaporanToEdit(lap);
        setEditModalOpen(true);
    };

    // Delete Confirmation Modal State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedLaporanToDelete, setSelectedLaporanToDelete] = useState<MonitoringLaporan | null>(null);
    const [isDeletingLaporan, setIsDeletingLaporan] = useState(false);
    const [loadingDeleteDetail, setLoadingDeleteDetail] = useState(false);

    // Inline Edit Nomor Dokumen State
    const [editingBaId, setEditingBaId] = useState<string | null>(null);
    const [editingBaValue, setEditingBaValue] = useState<string>("");
    const [savingBa, setSavingBa] = useState(false);
    const [isSyncingTarget, setIsSyncingTarget] = useState(false);

    // Load kecamatan list on mount & set default for operator_kecamatan
    useEffect(() => {
        if (user?.role === 'operator_kecamatan' && (user as any)?.id_kecamatan) {
            setSelectedKec(String((user as any).id_kecamatan));
        }
    }, [user]);

    // Handle incoming search params (e.g. from WebGIS realisasi-infrastruktur)
    useEffect(() => {
        const paramTahun = searchParams.get("tahun");
        const paramKec = searchParams.get("kec") || searchParams.get("id_kecamatan");
        const paramDesa = searchParams.get("desa") || searchParams.get("id_desa");
        const paramAction = searchParams.get("action");

        if (paramTahun) {
            setSelectedTahun(paramTahun);
        }
        if (paramKec) {
            setSelectedKec(paramKec);
        }
        if (paramDesa) {
            setSelectedDesa(paramDesa);
        }
        if (paramAction === "create_draft") {
            setIsCreateOpen(true);
        }
    }, [searchParams]);

    useEffect(() => {
        const fetchKec = async () => {
            try {
                const res = await kecamatanService.getKecamatan();
                if (Array.isArray(res)) {
                    setKecamatanList(res);
                } else if ((res as any)?.data && Array.isArray((res as any).data)) {
                    setKecamatanList((res as any).data);
                }
            } catch (err) {
                console.error("Error fetching kecamatan:", err);
            }
        };
        fetchKec();
    }, []);

    // Load desa when kecamatan changes
    useEffect(() => {
        if (!selectedKec || selectedKec === "all") {
            setDesaList([]);
            setSelectedDesa("all");
            return;
        }
        const fetchDesa = async () => {
            try {
                const res = await desaService.getDesa(selectedKec);
                if (Array.isArray(res)) {
                    setDesaList(res);
                } else if ((res as any)?.data && Array.isArray((res as any).data)) {
                    setDesaList((res as any).data);
                }
            } catch (err) {
                console.error("Error fetching desa:", err);
            }
        };
        fetchDesa();
    }, [selectedKec]);

    // Initialize OpenLayers Map inside Detail Modal
    useEffect(() => {
        const targetContainer = mapElement || mapDetailContainerRef.current;
        if (!isDetailOpen || !selectedDetailLaporan || !targetContainer) return;

        let isMounted = true;

        if (detailMapRef.current) {
            detailMapRef.current.setTarget(undefined);
            detailMapRef.current = null;
        }

        const vectorSource = new VectorSource();
        const otherSource = new VectorSource();
        const segmens = selectedDetailLaporan.SegmensFormatted || [];
        const segmenIds = new Set(segmens.map((s: any) => s.id?.toString()));
        const geojsonFormat = new GeoJSON();
        const features: Feature[] = [];

        segmens.forEach((s: any) => {
            let geomObj = s.geom;
            if (typeof geomObj === "string") {
                try {
                    geomObj = JSON.parse(geomObj);
                } catch (e) { }
            }

            if (geomObj && geomObj.type) {
                try {
                    const feat = geojsonFormat.readFeature({
                        type: "Feature",
                        geometry: geomObj,
                        properties: s
                    }, {
                        dataProjection: "EPSG:4326",
                        featureProjection: "EPSG:3857"
                    });
                    features.push(feat as Feature);
                } catch (e) {
                    console.error("Parse feature geom error:", e);
                }
            }
        });

        vectorSource.addFeatures(features);
        detailSourceRef.current = vectorSource;

        const baseLayer = new TileLayer({
            source: getBasemapSource(detailActiveBasemap)
        });
        detailBaseLayerRef.current = baseLayer;

        const vectorLayer = new VectorLayer({
            source: vectorSource,
            style: (feature) => {
                const props = feature.getProperties();
                const isPoros = !!(props.is_jalan_poros || props.check_melarosa);
                const geom = feature.getGeometry();

                const styles: Style[] = [
                    new Style({
                        stroke: new Stroke({
                            color: isPoros ? "#2563eb" : "#059669",
                            width: 5
                        })
                    })
                ];

                if (geom && geom.getType() === "LineString") {
                    const coords = (geom as LineString).getCoordinates();
                    if (coords.length > 0) {
                        styles.push(
                            // Start Point (Red)
                            new Style({
                                geometry: new Point(coords[0]),
                                image: new CircleStyle({
                                    radius: 5,
                                    fill: new Fill({ color: "#dc2626" }),
                                    stroke: new Stroke({ color: "#ffffff", width: 2 })
                                })
                            }),
                            // End Point (Blue)
                            new Style({
                                geometry: new Point(coords[coords.length - 1]),
                                image: new CircleStyle({
                                    radius: 5,
                                    fill: new Fill({ color: "#2563eb" }),
                                    stroke: new Stroke({ color: "#ffffff", width: 2 })
                                })
                            })
                        );
                    }
                }

                return styles;
            }
        });

        const otherLayer = new VectorLayer({
            source: otherSource,
            style: new Style({
                stroke: new Stroke({
                    color: "rgba(148, 163, 184, 0.35)", // slate-400 faded for other segments in village
                    width: 2.2,
                    lineDash: [4, 4]
                })
            })
        });

        const map = new OLMap({
            target: targetContainer,
            layers: [baseLayer, otherLayer, vectorLayer],
            view: new View({
                center: fromLonLat([111.88, -7.15]),
                zoom: 12
            }),
            controls: []
        });

        detailMapRef.current = map;
        detailSourceRef.current = vectorSource;

        const updateAndFit = () => {
            if (!isMounted || !detailMapRef.current) return;
            detailMapRef.current.updateSize();

            // Fit bounds ONLY based on the BA-bound segments (vectorSource)
            const extent = vectorSource.getExtent();
            if (extent && extent.some(v => isFinite(v)) && extent[0] !== Infinity && extent[0] !== -Infinity) {
                detailMapRef.current.getView().fit(extent, {
                    padding: [60, 60, 60, 60],
                    maxZoom: 17,
                    duration: 350
                });
            } else {
                // Fallback to otherSource if vectorSource is empty
                const otherExtent = otherSource.getExtent();
                if (otherExtent && otherExtent.some(v => isFinite(v)) && otherExtent[0] !== Infinity && otherExtent[0] !== -Infinity) {
                    detailMapRef.current.getView().fit(otherExtent, {
                        padding: [40, 40, 40, 40],
                        maxZoom: 16,
                        duration: 350
                    });
                }
            }
        };

        if (selectedDetailLaporan.id_desa) {
            monitoringService.getSegmenByDesaGeoJSON(selectedDetailLaporan.id_desa)
                .then(fc => {
                    if (!isMounted) return;
                    if (fc && fc.features) {
                        fc.features.forEach((f: any) => {
                            if (segmenIds.has(f.id?.toString())) return;
                            try {
                                const feat = geojsonFormat.readFeature(f, {
                                    dataProjection: "EPSG:4326",
                                    featureProjection: "EPSG:3857"
                                });
                                otherSource.addFeature(feat as Feature);
                            } catch (e) { }
                        });
                    }
                    updateAndFit();
                })
                .catch(err => {
                    console.error("Fallback fetch error:", err);
                    updateAndFit();
                });
        } else {
            updateAndFit();
        }

        return () => {
            isMounted = false;
            if (map) {
                map.setTarget(undefined);
            }
        };
    }, [isDetailOpen, selectedDetailLaporan, mapElement]);

    // Dynamically update basemap source without recreating the map
    useEffect(() => {
        if (!detailBaseLayerRef.current) return;
        detailBaseLayerRef.current.setSource(getBasemapSource(detailActiveBasemap));
    }, [detailActiveBasemap]);

    const fetchLaporan = useCallback(async () => {
        setLoading(true);
        try {
            const res = await monitoringLaporanService.getLaporanList({
                id_desa: selectedDesa !== "all" ? selectedDesa : undefined,
                id_kecamatan: selectedKec !== "all" ? selectedKec : undefined,
                tahun_anggaran: selectedTahun !== "Semua" ? selectedTahun : undefined,
                status: selectedStatus !== "all" ? selectedStatus : undefined
            });
            if (res.status === "success" && Array.isArray(res.result)) {
                setLaporanList(res.result.map((item: any) => ({
                    ...item,
                    total_segmen: item.total_segmen ?? item.SegmensFormatted?.length ?? item.LaporanSegmens?.length ?? item.segmens?.length ?? item.total_segments ?? item.jumlah_segmen ?? undefined
                })));
            } else {
                setLaporanList([]);
            }
        } catch (err) {
            console.error("Fetch laporan error:", err);
            toast.error("Gagal memuat daftar Berita Acara");
        } finally {
            setLoading(false);
        }
    }, [selectedDesa, selectedKec, selectedTahun, selectedStatus]);

    useEffect(() => {
        fetchLaporan();
    }, [fetchLaporan]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchLaporan();
    };

    const handleReset = () => {
        setSearchTerm("");
        if (user?.role !== 'operator_kecamatan') {
            setSelectedKec("all");
        }
        setSelectedDesa("all");
        setSelectedTahun("Semua");
        setSelectedStatus("all");
        setStartDate("");
        setEndDate("");
        setPage(1);
    };

    const handleOpenDetail = async (laporanId: string) => {
        setLoadingDetail(true);
        const toastId = toast.loading("Memuat detail dan peta Berita Acara...");
        try {
            const res = await monitoringLaporanService.getLaporanById(laporanId);
            if (res.status === "success" && res.result) {
                setSelectedDetailLaporan(res.result);
                setDetailActiveTab('map');
                setSegmentSearch("");
                setSegmentFilter("all");
                setIsDetailOpen(true);
                toast.dismiss(toastId);
            } else {
                toast.error("Gagal memuat detail Berita Acara", { id: toastId });
            }
        } catch (err) {
            console.error("Open detail error:", err);
            toast.error("Gagal memuat detail Berita Acara", { id: toastId });
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleSyncTargetFisik = async () => {
        if (!selectedDetailLaporan?.id) return;
        setIsSyncingTarget(true);
        const toastId = toast.loading("Menyinkronkan target fisik dengan Plotting Anggaran...");
        try {
            const res = await monitoringLaporanService.syncTargetFisik(selectedDetailLaporan.id);
            if (res.status === "success" && res.result) {
                toast.success(res.message || "Target fisik berhasil disinkronkan!", { id: toastId });
                setSelectedDetailLaporan((prev: any) => ({
                    ...prev,
                    rencana_panjang: res.result.rencana_panjang,
                    PlottingAnggaran: res.result.PlottingAnggaran || prev?.PlottingAnggaran
                }));
                fetchLaporan();
            } else {
                toast.error("Gagal menyinkronkan target fisik", { id: toastId });
            }
        } catch (err) {
            console.error("Sync target error:", err);
            toast.error("Gagal menyinkronkan target fisik", { id: toastId });
        } finally {
            setIsSyncingTarget(false);
        }
    };

    const handleSaveNomorBa = async (laporanId: string) => {
        if (!editingBaValue.trim()) {
            toast.error("Nomor dokumen tidak boleh kosong");
            return;
        }
        setSavingBa(true);
        const toastId = toast.loading("Memperbarui Nomor Dokumen...");
        try {
            const res = await monitoringLaporanService.updateLaporan(laporanId, {
                nomor_ba: editingBaValue.trim()
            });
            if (res.status === "success" || res.result) {
                toast.success("Nomor Dokumen berhasil diperbarui!", { id: toastId });
                setEditingBaId(null);
                // Optimistic UI update + reload endpoint
                setLaporanList(prev => prev.map(item => item.id === laporanId ? { ...item, nomor_ba: editingBaValue.trim() } : item));
                await fetchLaporan();
            } else {
                toast.error("Gagal memperbarui Nomor Dokumen", { id: toastId });
            }
        } catch (err) {
            console.error("Update nomor_ba error:", err);
            toast.error("Gagal memperbarui Nomor Dokumen", { id: toastId });
        } finally {
            setSavingBa(false);
        }
    };



    const handleDeleteClick = async (lap: MonitoringLaporan) => {
        setSelectedLaporanToDelete(lap);
        setDeleteDialogOpen(true);

        // Fetch detail laporan untuk memastikan jumlah segmen terikat akurat (dari SegmensFormatted)
        if (lap?.id && (!lap.SegmensFormatted || lap.SegmensFormatted.length === 0)) {
            setLoadingDeleteDetail(true);
            try {
                const res = await monitoringLaporanService.getLaporanById(lap.id);
                if (res?.status === "success" && res.result) {
                    const fullData = res.result;
                    const segmentCount = fullData.SegmensFormatted?.length ?? fullData.LaporanSegmens?.length ?? fullData.segmens?.length ?? fullData.total_segmen ?? 0;
                    setSelectedLaporanToDelete((prev: any) => {
                        if (prev && prev.id === lap.id) {
                            return {
                                ...prev,
                                ...fullData,
                                total_segmen: segmentCount
                            };
                        }
                        return prev;
                    });
                }
            } catch (err) {
                console.warn("Failed to fetch full detail for delete confirmation:", err);
            } finally {
                setLoadingDeleteDetail(false);
            }
        }
    };

    const handleConfirmDeleteLaporan = async () => {
        if (!selectedLaporanToDelete) return;
        setIsDeletingLaporan(true);
        const toastId = toast.loading("Menghapus Dokumen Berita Acara dan segmen terkait...");
        try {
            await monitoringLaporanService.deleteLaporan(selectedLaporanToDelete.id, true);
            toast.success("Berita Acara dan seluruh segmen yang terikat berhasil dihapus", { id: toastId });
            setLaporanList(prev => prev.filter(item => item.id !== selectedLaporanToDelete.id));
            setDeleteDialogOpen(false);
            setSelectedLaporanToDelete(null);
            await fetchLaporan();
        } catch (err) {
            console.error("Delete error:", err);
            toast.error("Gagal menghapus Dokumen Berita Acara", { id: toastId });
        } finally {
            setIsDeletingLaporan(false);
        }
    };

    const handleOpenRevert = (laporan: any) => {
        setSelectedLaporanToRevert(laporan);
        setCatatanRevisiInput(laporan.catatan_revisi || "");
        setRevertDialogOpen(true);
    };

    const handleRevertToDraft = async () => {
        if (!selectedLaporanToRevert) return;
        setIsSubmittingRevert(true);
        const toastId = toast.loading("Mengembalikan status dokumen ke Draft...");
        try {
            await monitoringLaporanService.revertToDraft(selectedLaporanToRevert.id, {
                catatan: catatanRevisiInput.trim(),
                unlock_segments: true,
                target_segment_status: "verifikasi_kecamatan"
            });
            toast.success("Dokumen berhasil dikembalikan ke status Draft. Kunci segmen telah dibuka untuk revisi kecamatan.", { id: toastId });
            setRevertDialogOpen(false);
            setLaporanList(prev => prev.map(item =>
                item.id === selectedLaporanToRevert.id
                    ? { ...item, status: "Draft", catatan_revisi: catatanRevisiInput.trim() }
                    : item
            ));
            await fetchLaporan();
        } catch (err: any) {
            console.error("Revert to draft error:", err);
            toast.error(err?.message || "Gagal mengembalikan status dokumen ke Draft", { id: toastId });
        } finally {
            setIsSubmittingRevert(false);
        }
    };

    const getDetailMapImage = (): Promise<string> => {
        return new Promise((resolve) => {
            if (!detailMapRef.current || !mapElement) {
                resolve("");
                return;
            }

            const exportCanvas = () => {
                try {
                    const size = detailMapRef.current!.getSize();
                    if (!size || size[0] === 0 || size[1] === 0) {
                        resolve("");
                        return;
                    }

                    const scaleFactor = 2;
                    const mapCanvas = document.createElement("canvas");
                    mapCanvas.width = size[0] * scaleFactor;
                    mapCanvas.height = size[1] * scaleFactor;
                    const mapContext = mapCanvas.getContext("2d");
                    if (!mapContext) {
                        resolve("");
                        return;
                    }

                    mapContext.fillStyle = "#ffffff";
                    mapContext.fillRect(0, 0, mapCanvas.width, mapCanvas.height);

                    const canvasList = mapElement.querySelectorAll(".ol-layer canvas");
                    let drewAny = false;
                    canvasList.forEach((canvasElement: any) => {
                        if (canvasElement.width > 0) {
                            try {
                                const opacity = canvasElement.parentNode.style.opacity;
                                mapContext.globalAlpha = opacity === "" ? 1 : Number(opacity);
                                const transform = canvasElement.style.transform;

                                mapContext.save();
                                if (transform) {
                                    const match = transform.match(/^matrix\(([^)]+)\)$/);
                                    if (match) {
                                        const matrix = match[1].split(",").map(Number);
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
                                drewAny = true;
                            } catch (e) {
                                console.warn("Canvas drawImage error (CORS or tainted canvas):", e);
                            }
                        }
                    });

                    mapContext.setTransform(1, 0, 0, 1, 0, 0);
                    const dataUrl = mapCanvas.toDataURL("image/png", 1.0);
                    resolve(dataUrl);
                } catch (err) {
                    console.error("Detail map export error:", err);
                    resolve("");
                }
            };

            detailMapRef.current.once("rendercomplete", exportCanvas);
            detailMapRef.current.renderSync();

            // Safety timeout in case rendercomplete event already fired or delayed
            setTimeout(() => {
                exportCanvas();
            }, 300);
        });
    };

    const handlePrintFromDetail = async () => {
        if (!selectedDetailLaporan) return;
        if (user?.role === 'operator_kecamatan') {
            toast.error("Role Operator Kecamatan bertugas mengirimkan digitasi segmen ke Bappeda. Cetak Berita Acara hanya dapat dilakukan oleh Operator Bappeda setelah hasil digitasi diverifikasi.");
            return;
        }

        const segmens = selectedDetailLaporan.SegmensFormatted || selectedDetailLaporan.Segmens || selectedDetailLaporan.segmens || [];
        const totalRealized = parseFloat(selectedDetailLaporan.realisasi_panjang || selectedDetailLaporan.panjang_realisasi || selectedDetailLaporan.total_panjang_m || 0);
        const isDraft = (selectedDetailLaporan.status || "draft").toLowerCase() === "draft";

        // VALIDASI KEAMANAN: Buka Alert Dialog jika dokumen masih Draft dan 0 segmen
        if (segmens.length === 0 && totalRealized <= 0 && isDraft) {
            setIsPrintDraftAlertOpen(true);
            return;
        }

        const toastId = toast.loading("Mempersiapkan dokumen cetak & lampiran peta Berita Acara...");
        try {
            const mapImageSrc = await getDetailMapImage();
            const lap = selectedDetailLaporan;

            // Automatically transition status to Final upon printing Berita Acara HANYA jika memiliki segmen
            if (lap?.id && (segmens.length > 0 || totalRealized > 0) && (lap.status === 'Submitted' || lap.status === 'Draft' || !lap.status)) {
                try {
                    await monitoringLaporanService.updateLaporan(lap.id, { status: "Final" });
                    lap.status = "Final";
                    setSelectedDetailLaporan((prev: any) => prev ? { ...prev, status: "Final" } : prev);
                    setLaporanList(prev => prev.map(item => item.id === lap.id ? { ...item, status: "Final" } : item));
                } catch (errUpdateStatus: any) {
                    console.warn("Failed to update status to Final on print:", errUpdateStatus);
                    const errMsg = errUpdateStatus?.response?.data?.message || errUpdateStatus?.message;
                    if (errMsg) {
                        toast.error(`Peringatan: ${errMsg}`);
                    }
                }
            }

            const targetDesaName = lap.Desa?.nama_desa || "Desa";
            const targetKecName = lap.Kecamatan?.nama_kecamatan || "Kecamatan";
            const targetDesaPimpinan = lap.Desa?.nama_pimpinan || "";
            const targetDesaJabatan = lap.Desa?.nama_jabatan || `Kepala Desa ${targetDesaName}`;
            const targetDesaNip = lap.Desa?.nip || "";
            const targetKecPimpinan = lap.Kecamatan?.nama_pimpinan || "";
            const targetKecJabatan = lap.Kecamatan?.nama_jabatan || `Camat ${targetKecName}`;
            const targetKecNip = lap.Kecamatan?.nip || "";

            const indonesianDays = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
            const indonesianMonths = [
                "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                "Juli", "Agustus", "September", "Oktober", "November", "Desember"
            ];

            // Tanggal Pembuatan Berita Acara (created_at)
            const baDate = new Date(lap.created_at || new Date());
            const currentDayName = indonesianDays[baDate.getDay()];
            const currentDayNum = baDate.getDate();
            const currentMonthName = indonesianMonths[baDate.getMonth()];
            const currentYear = baDate.getFullYear();
            const formattedBaDate = baDate.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });

            // Tanggal Cetak Riil (Waktu Sekarang)
            const printDate = new Date();
            const formattedPrintDateOnly = printDate.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });
            const formattedPrintTimeOnly = printDate.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            const rencanaPanjang = parseFloat(lap.rencana_panjang || 0);

            const verifikatorName = (segmens.find((s: any) => s.verifikator && s.verifikator !== "Operator Bappeda")?.verifikator) || lap.verifikator || currentUserName;

            const rowsHtml = segmens.map((row: any, idx: number) => {
                const objectName = row.namobj || row.nama_jalan || row.nama_ruas || "Segmen Infrastruktur";
                const isSesuaiBasisData = !!(row.is_jalan_poros || row.check_melarosa) && row.kode_ruas && row.kode_ruas !== "0" && row.kode_ruas !== 0 && row.kode_ruas !== "-";
                const statusLabel = isSesuaiBasisData ? "Sesuai Basis Data" : "Diluar Basis Data";
                const kodeRuasLabel = isSesuaiBasisData ? row.kode_ruas : "-";
                const materialPerkerasan = row.jenis_perkerasan || row.perkerasan || (row.atribut && (row.atribut.jenis_perkerasan || row.atribut.perkerasan)) || "Beton Cor";

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
                    <td style="border: 1px solid black; padding: 6px; text-align: right;">${parseFloat(row.panjang_m || row.panjang || 0).toFixed(1)}</td>
                    <td style="border: 1px solid black; padding: 6px; text-align: center;">${row.lebar_m || row.lebar || "-"}</td>
                    <td style="border: 1px solid black; padding: 6px; text-align: center;">${materialPerkerasan}</td>
                    <td style="border: 1px solid black; padding: 6px; text-align: center; text-transform: capitalize;">${row.kondisi || "Baik"}</td>
                </tr>
            `;
            }).join("");

            toast.dismiss(toastId);

            const printWindow = window.open("", "_blank");
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                        <head>
                            <title>Berita Acara - ${lap.nomor_ba}</title>
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
                                <h3 class="font-extrabold uppercase" style="margin: 0 0 8px 0; font-size: 14px;">MONITORING DAN EVALUASI REALISASI INFRASTRUKTUR DESA</h3>
                                <p style="margin: 0; font-size: 14px;">Nomor: ${lap.nomor_ba || '-'}</p>
                            </div>

                            <p class="text-justify indent-8 mb-4" style="font-size: 14px;">
                                Pada hari ini ${currentDayName}, tanggal ${currentDayNum} bulan ${currentMonthName} tahun ${currentYear} dari Desa ${targetDesaName} Kecamatan ${targetKecName} telah dilaksanakan Evaluasi Realisasi Infrastruktur Jalan Poros Antar Desa oleh Badan Perencanaan Pembangunan Daerah Kabupaten Bojonegoro dengan pelaksanaan Tahun Anggaran ${lap.tahun_anggaran || '2026'} dengan mekanisme Sumber Dana ${lap.sumber_dana || 'BKK'} dengan rincian sebagai berikut:
                            </p>

                            <div class="mb-6">
                                <p class="mb-4" style="font-size: 14px;">Daftar rincian segmen infrastruktur jalan poros antar desa yang telah terealisasi dan terdigitasi:</p>
                                <table class="w-full border-collapse" style="border: 1px solid black; text-align: left;">
                                    <thead>
                                        <tr class="bg-gray-100 font-bold">
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 25px;">No</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 40px;">Kode</th>
                                            <th style="border: 1px solid black; padding: 6px; width: 140px;">Nama Objek / Ruas</th>
                                            <th style="border: 1px solid black; padding: 6px; width: 160px;">Koordinat<br>(Awal - Akhir)</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 70px;">Kategori Spasial</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: right; width: 60px;">Panjang (m)</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 40px;">Lebar (m)</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 50px;">Material / Perkerasan</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 50px;">Kondisi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${rowsHtml || `<tr><td colspan="9" style="border: 1px solid black; padding: 12px; text-align: center;">Tidak ada segmen terikat</td></tr>`}
                                    </tbody>
                                    <tfoot>
                                        ${rencanaPanjang > 0 ? `
                                        <tr class="bg-gray-50 font-bold">
                                            <td colspan="5" style="border: 1px solid black; padding: 6px; text-align: right;">Total Panjang Perencanaan:</td>
                                            <td style="border: 1px solid black; padding: 6px; text-align: right;">
                                                ${rencanaPanjang.toFixed(1)}
                                            </td>
                                            <td colspan="3" style="border: 1px solid black; padding: 6px; background-color: #f3f4f6;"></td>
                                        </tr>
                                        ` : ''}
                                        <tr class="bg-gray-50 font-bold">
                                            <td colspan="5" style="border: 1px solid black; padding: 6px; text-align: right;">Total Panjang Segmen Terdigitasi:</td>
                                            <td style="border: 1px solid black; padding: 6px; text-align: right;">
                                                ${totalRealized.toFixed(1)}
                                            </td>
                                            <td colspan="3" style="border: 1px solid black; padding: 6px; background-color: #f3f4f6;"></td>
                                        </tr>
                                        ${rencanaPanjang > 0 ? `
                                        <tr class="bg-gray-50 font-bold">
                                            <td colspan="5" style="border: 1px solid black; padding: 6px; text-align: right;">Persentase Realisasi:</td>
                                            <td style="border: 1px solid black; padding: 6px; text-align: right;">
                                                ${((totalRealized / rencanaPanjang) * 100).toFixed(1)}%
                                            </td>
                                            <td colspan="3" style="border: 1px solid black; padding: 6px; background-color: #f3f4f6;"></td>
                                        </tr>
                                        ` : ''}
                                    </tfoot>
                                </table>
                            </div>

                            <p class="text-justify indent-8" style="font-size: 14px;">
                                Demikian berita acara ini dibuat dengan sebenar-benarnya dan dapat dipergunakan sebagaimana mestinya.
                            </p>

                            <div class="grid mt-6" style="grid-template-columns: 1fr 1fr; gap: 24px;">

                            <!-- Baris 1 Kolom 1 -->
                            <div class="text-center">
                                <p style="margin: 0;">&nbsp;</p>
                                <p style="margin: 0;">&nbsp;</p>
                                <p class="font-bold" style="margin: 0; font-size: 14px;">
                                    ${targetDesaJabatan}
                                </p>
                                <p style="margin: 0 0 50px 0;">&nbsp;</p>
                                <p class="font-bold underline" style="margin: 0; font-size: 14px;">
                                    ${targetDesaPimpinan || '_________________________'}
                                </p>
                                ${targetDesaNip
                        ? `<p style="margin: 0; font-size: 12px; margin-top: 0px;">NIP. ${targetDesaNip}</p>`
                        : ''}
                            </div>

                            <!-- Baris 1 Kolom 2 -->
                            <div class="text-center">
                                <p style="margin: 0; font-size: 14px;">
                                    Bojonegoro, ${formattedBaDate}
                                </p>
                                <p style="margin: 0;">&nbsp;</p>
                                <p class="font-bold" style="margin: 0; font-size: 14px;">
                                    Verifikator BAPPEDA
                                </p>
                                <p style="margin: 0 0 50px 0;">&nbsp;</p>
                                <p class="font-bold underline" style="margin: 0; font-size: 14px;">
                                    ${verifikatorName}
                                </p>
                            </div>

                            <!-- Baris 2 -->
                            <div class="text-center" style="grid-column: 1 / span 2; margin-top: 0;">
                                <p style="margin: 0;">Mengetahui,</p>
                                <p class="font-bold" style="margin: 0; font-size: 14px;">
                                    ${targetKecJabatan}
                                </p>
                                <p style="margin: 0 0 50px 0;">&nbsp;</p>
                                <p class="font-bold underline" style="margin: 0; font-size: 14px;">
                                    ${targetKecPimpinan || '_________________________'}
                                </p>
                                ${targetKecNip
                        ? `<p style="margin: 0; font-size: 12px; margin-top: 0px;">NIP. ${targetKecNip}</p>`
                        : ''}
                            </div>

                            </div>

                            <div class="print-footer">
                                Dokumen ini dicetak oleh sistem pada tanggal: ${formattedPrintDateOnly} pukul ${formattedPrintTimeOnly} WIB
                            </div>

                             ${mapImageSrc ? `
                             <div style="page-break-before: always; text-align: center; padding-top: 10px; width: 100%;">
                                 <h3 class="font-bold uppercase" style="font-size: 14px; margin-bottom: 12px;">LAMPIRAN: PETA DIGITASI SEGMEN SPASIAL INFRASTRUKTUR JALAN POROS ANTAR DESA</h3>
                                 <div style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background-color: #ffffff; box-sizing: border-box; margin: 0 auto;">
                                     <img src="${mapImageSrc}" style="width: 100%; height: auto; display: block;" />
                                 </div>
                                 <p style="font-size: 10px; margin-top: 8px; color: #4b5563;">
                                     Peta Realisasi Infrastruktur Desa - Desa ${targetDesaName}, Kecamatan ${targetKecName} - Tahun Anggaran ${lap.tahun_anggaran || '2026'}
                                 </p>
                                <div style="margin-top: 14px; font-size: 12px; font-weight: bold; color: #0f172a; display: flex; justify-content: center; align-items: center; gap: 32px;">
                                    <span style="display: inline-flex; align-items: center; gap: 8px;">
                                        <svg width="40" height="12" style="vertical-align: middle;">
                                            <line x1="0" y1="6" x2="40" y2="6" stroke="#2563eb" stroke-width="6" stroke-linecap="round" />
                                        </svg>
                                        Sesuai Basis Data
                                    </span>
                                    <span style="display: inline-flex; align-items: center; gap: 8px;">
                                        <svg width="40" height="12" style="vertical-align: middle;">
                                            <line x1="0" y1="6" x2="40" y2="6" stroke="#059669" stroke-width="6" stroke-linecap="round" />
                                        </svg>
                                        Diluar Basis Data
                                    </span>
                                </div>
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
                                    }, 400);
                                };
                            </script>
                        </body>
                    </html>
                `);
                printWindow.document.close();
            }
        } catch (err) {
            console.error("Print BA error:", err);
            toast.error("Gagal mencetak dokumen Berita Acara", { id: toastId });
        }
    };

    const handleDownloadFromDetail = async () => {
        if (!selectedDetailLaporan) return;
        if (user?.role !== 'operator_kecamatan') return;
        const toastId = toast.loading("Mempersiapkan dokumen unduhan Berita Acara...");
        try {
            const mapImageSrc = await getDetailMapImage();
            const lap = selectedDetailLaporan;

            const segmens = lap.SegmensFormatted || [];
            const targetDesaName = lap.Desa?.nama_desa || "Desa";
            const targetKecName = lap.Kecamatan?.nama_kecamatan || "Kecamatan";
            const targetDesaPimpinan = lap.Desa?.nama_pimpinan || "";
            const targetDesaJabatan = lap.Desa?.nama_jabatan || `Kepala Desa ${targetDesaName}`;
            const targetDesaNip = lap.Desa?.nip || "";
            const targetKecPimpinan = lap.Kecamatan?.nama_pimpinan || "";
            const targetKecJabatan = lap.Kecamatan?.nama_jabatan || `Camat ${targetKecName}`;
            const targetKecNip = lap.Kecamatan?.nip || "";

            const indonesianDays = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
            const indonesianMonths = [
                "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                "Juli", "Agustus", "September", "Oktober", "November", "Desember"
            ];

            const baDate = new Date(lap.created_at || new Date());
            const currentDayName = indonesianDays[baDate.getDay()];
            const currentDayNum = baDate.getDate();
            const currentMonthName = indonesianMonths[baDate.getMonth()];
            const currentYear = baDate.getFullYear();
            const formattedBaDate = baDate.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });

            const printDate = new Date();
            const formattedPrintDateOnly = printDate.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });
            const formattedPrintTimeOnly = printDate.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            const totalRealized = parseFloat(lap.realisasi_panjang || 0);
            const rencanaPanjang = parseFloat(lap.rencana_panjang || 0);

            const verifikatorName = (segmens.find((s: any) => s.verifikator && s.verifikator !== "Operator Bappeda")?.verifikator) || lap.verifikator || currentUserName;

            const rowsHtml = segmens.map((row: any, idx: number) => {
                const objectName = row.namobj || row.nama_jalan || row.nama_ruas || "Segmen Infrastruktur";
                const isSesuaiBasisData = !!(row.is_jalan_poros || row.check_melarosa) && row.kode_ruas && row.kode_ruas !== "0" && row.kode_ruas !== 0 && row.kode_ruas !== "-";
                const statusLabel = isSesuaiBasisData ? "Sesuai Basis Data" : "Diluar Basis Data";
                const kodeRuasLabel = isSesuaiBasisData ? row.kode_ruas : "-";
                const materialPerkerasan = row.jenis_perkerasan || row.perkerasan || (row.atribut && (row.atribut.jenis_perkerasan || row.atribut.perkerasan)) || "Beton Cor";

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
                    <td style="border: 1px solid black; padding: 6px; text-align: right;">${parseFloat(row.panjang_m || row.panjang || 0).toFixed(1)}</td>
                    <td style="border: 1px solid black; padding: 6px; text-align: center;">${row.lebar_m || row.lebar || "-"}</td>
                    <td style="border: 1px solid black; padding: 6px; text-align: center;">${materialPerkerasan}</td>
                    <td style="border: 1px solid black; padding: 6px; text-align: center; text-transform: capitalize;">${row.kondisi || "Baik"}</td>
                </tr>
            `;
            }).join("");

            toast.dismiss(toastId);

            const printWindow = window.open("", "_blank");
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                        <head>
                            <title>Berita Acara - ${lap.nomor_ba}</title>
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
                                <h3 class="font-extrabold uppercase" style="margin: 0 0 8px 0; font-size: 14px;">MONITORING DAN EVALUASI REALISASI INFRASTRUKTUR DESA</h3>
                                <p style="margin: 0; font-size: 14px;">Nomor: ${lap.nomor_ba || '-'}</p>
                            </div>

                            <p class="text-justify indent-8 mb-4" style="font-size: 14px;">
                                Pada hari ini ${currentDayName}, tanggal ${currentDayNum} bulan ${currentMonthName} tahun ${currentYear} dari Desa ${targetDesaName} Kecamatan ${targetKecName} telah dilaksanakan Evaluasi Realisasi Infrastruktur Jalan Poros Antar Desa oleh Badan Perencanaan Pembangunan Daerah Kabupaten Bojonegoro dengan pelaksanaan Tahun Anggaran ${lap.tahun_anggaran || '2026'} dengan mekanisme Sumber Dana ${lap.sumber_dana || 'BKK'} dengan rincian sebagai berikut:
                            </p>

                            <div class="mb-6">
                                <p class="mb-4" style="font-size: 14px;">Daftar rincian segmen infrastruktur jalan poros antar desa yang telah terealisasi dan terdigitasi:</p>
                                <table class="w-full border-collapse" style="border: 1px solid black; text-align: left;">
                                    <thead>
                                        <tr class="bg-gray-100 font-bold">
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 25px;">No</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 40px;">Kode</th>
                                            <th style="border: 1px solid black; padding: 6px; width: 140px;">Nama Objek / Ruas</th>
                                            <th style="border: 1px solid black; padding: 6px; width: 160px;">Koordinat<br>(Awal - Akhir)</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 70px;">Kategori Spasial</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: right; width: 60px;">Panjang (m)</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 40px;">Lebar (m)</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 50px;">Material / Perkerasan</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 50px;">Kondisi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${rowsHtml || `<tr><td colspan="9" style="border: 1px solid black; padding: 12px; text-align: center;">Tidak ada segmen terikat</td></tr>`}
                                    </tbody>
                                    <tfoot>
                                        ${rencanaPanjang > 0 ? `
                                        <tr class="bg-gray-50 font-bold">
                                            <td colspan="5" style="border: 1px solid black; padding: 6px; text-align: right;">Total Panjang Perencanaan:</td>
                                            <td style="border: 1px solid black; padding: 6px; text-align: right;">
                                                ${rencanaPanjang.toFixed(1)}
                                            </td>
                                            <td colspan="3" style="border: 1px solid black; padding: 6px; background-color: #f3f4f6;"></td>
                                        </tr>
                                        ` : ''}
                                        <tr class="bg-gray-50 font-bold">
                                            <td colspan="5" style="border: 1px solid black; padding: 6px; text-align: right;">Total Panjang Segmen Terdigitasi:</td>
                                            <td style="border: 1px solid black; padding: 6px; text-align: right;">
                                                ${totalRealized.toFixed(1)}
                                            </td>
                                            <td colspan="3" style="border: 1px solid black; padding: 6px; background-color: #f3f4f6;"></td>
                                        </tr>
                                        ${rencanaPanjang > 0 ? `
                                        <tr class="bg-gray-50 font-bold">
                                            <td colspan="5" style="border: 1px solid black; padding: 6px; text-align: right;">Persentase Realisasi:</td>
                                            <td style="border: 1px solid black; padding: 6px; text-align: right;">
                                                ${((totalRealized / rencanaPanjang) * 100).toFixed(1)}%
                                            </td>
                                            <td colspan="3" style="border: 1px solid black; padding: 6px; background-color: #f3f4f6;"></td>
                                        </tr>
                                        ` : ''}
                                    </tfoot>
                                </table>
                            </div>

                            <p class="text-justify indent-8" style="font-size: 14px;">
                                Demikian berita acara ini dibuat dengan sebenar-benarnya dan dapat dipergunakan sebagaimana mestinya.
                            </p>

                            <div class="grid mt-6" style="grid-template-columns: 1fr 1fr; gap: 24px;">

                            <!-- Baris 1 Kolom 1 -->
                            <div class="text-center">
                                <p style="margin: 0;">&nbsp;</p>
                                <p style="margin: 0;">&nbsp;</p>
                                <p class="font-bold" style="margin: 0; font-size: 14px;">
                                    ${targetDesaJabatan}
                                </p>
                                <p style="margin: 0 0 50px 0;">&nbsp;</p>
                                <p class="font-bold underline" style="margin: 0; font-size: 14px;">
                                    ${targetDesaPimpinan || '_________________________'}
                                </p>
                                ${targetDesaNip
                        ? `<p style="margin: 0; font-size: 12px; margin-top: 0px;">NIP. ${targetDesaNip}</p>`
                        : ''}
                            </div>

                            <!-- Baris 1 Kolom 2 -->
                            <div class="text-center">
                                <p style="margin: 0; font-size: 14px;">
                                    Bojonegoro, ${formattedBaDate}
                                </p>
                                <p style="margin: 0;">&nbsp;</p>
                                <p class="font-bold" style="margin: 0; font-size: 14px;">
                                    Verifikator BAPPEDA
                                </p>
                                <p style="margin: 0 0 50px 0;">&nbsp;</p>
                                <p class="font-bold underline" style="margin: 0; font-size: 14px;">
                                    ${verifikatorName}
                                </p>
                            </div>

                            <!-- Baris 2 -->
                            <div class="text-center" style="grid-column: 1 / span 2; margin-top: 0;">
                                <p style="margin: 0;">Mengetahui,</p>
                                <p class="font-bold" style="margin: 0; font-size: 14px;">
                                    ${targetKecJabatan}
                                </p>
                                <p style="margin: 0 0 50px 0;">&nbsp;</p>
                                <p class="font-bold underline" style="margin: 0; font-size: 14px;">
                                    ${targetKecPimpinan || '_________________________'}
                                </p>
                                ${targetKecNip
                        ? `<p style="margin: 0; font-size: 12px; margin-top: 0px;">NIP. ${targetKecNip}</p>`
                        : ''}
                            </div>

                            </div>

                            <div class="print-footer">
                                Dokumen ini dicetak oleh sistem pada tanggal: ${formattedPrintDateOnly} pukul ${formattedPrintTimeOnly} WIB
                            </div>

                             ${mapImageSrc ? `
                             <div style="page-break-before: always; text-align: center; padding-top: 10px; width: 100%;">
                                 <h3 class="font-bold uppercase" style="font-size: 14px; margin-bottom: 12px;">LAMPIRAN: PETA DIGITASI SEGMEN SPASIAL INFRASTRUKTUR JALAN POROS ANTAR DESA</h3>
                                 <div style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background-color: #ffffff; box-sizing: border-box; margin: 0 auto;">
                                     <img src="${mapImageSrc}" style="width: 100%; height: auto; display: block;" />
                                 </div>
                                 <p style="font-size: 10px; margin-top: 8px; color: #4b5563;">
                                     Peta Realisasi Infrastruktur Desa - Desa ${targetDesaName}, Kecamatan ${targetKecName} - Tahun Anggaran ${lap.tahun_anggaran || '2026'}
                                 </p>
                                <div style="margin-top: 14px; font-size: 12px; font-weight: bold; color: #0f172a; display: flex; justify-content: center; align-items: center; gap: 32px;">
                                    <span style="display: inline-flex; align-items: center; gap: 8px;">
                                        <svg width="40" height="12" style="vertical-align: middle;">
                                            <line x1="0" y1="6" x2="40" y2="6" stroke="#2563eb" stroke-width="6" stroke-linecap="round" />
                                        </svg>
                                        Sesuai Basis Data
                                    </span>
                                    <span style="display: inline-flex; align-items: center; gap: 8px;">
                                        <svg width="40" height="12" style="vertical-align: middle;">
                                            <line x1="0" y1="6" x2="40" y2="6" stroke="#059669" stroke-width="6" stroke-linecap="round" />
                                        </svg>
                                        Diluar Basis Data
                                    </span>
                                </div>
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
                                    }, 400);
                                };
                            </script>
                        </body>
                    </html>
                `);
                printWindow.document.close();
            }
            toast.dismiss(toastId);
            toast.success("Dokumen Berita Acara siap diunduh!");
        } catch (err) {
            console.error("Print BA error:", err);
            toast.error("Gagal mengunduh dokumen Berita Acara", { id: toastId });
        }
    };

    const stats = React.useMemo(() => {
        const total = laporanList.length;
        const draft = laporanList.filter(l => (l.status || "").toLowerCase() === 'draft').length;
        const submitted = laporanList.filter(l => (l.status || "").toLowerCase() === 'submitted').length;
        const revisi = laporanList.filter(l => (l.status || "").toLowerCase() === 'revisi').length;
        const final = laporanList.filter(l => (l.status || "").toLowerCase() === 'final' || !l.status).length;
        return { total, draft, submitted, revisi, final };
    }, [laporanList]);

    const filteredList = laporanList.filter(lap => {
        const q = searchTerm.toLowerCase();
        const matchQuery = (
            (lap.nomor_ba && lap.nomor_ba.toLowerCase().includes(q)) ||
            (lap.Desa?.nama_desa && lap.Desa.nama_desa.toLowerCase().includes(q)) ||
            (lap.Kecamatan?.nama_kecamatan && lap.Kecamatan.nama_kecamatan.toLowerCase().includes(q)) ||
            (lap.PlottingAnggaran?.nama_kegiatan && lap.PlottingAnggaran.nama_kegiatan.toLowerCase().includes(q))
        );

        let matchDate = true;
        if (startDate || endDate) {
            if (!lap.created_at) {
                matchDate = false;
            } else {
                const itemDate = new Date(lap.created_at).getTime();
                if (startDate) {
                    const startMs = new Date(startDate).setHours(0, 0, 0, 0);
                    if (itemDate < startMs) matchDate = false;
                }
                if (endDate) {
                    const endMs = new Date(endDate).setHours(23, 59, 59, 999);
                    if (itemDate > endMs) matchDate = false;
                }
            }
        }

        return matchQuery && matchDate;
    });

    const totalItems = filteredList.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const paginatedList = filteredList.slice((page - 1) * limit, page * limit);

    const renderStatusBadge = (status: string | undefined) => {
        const s = (status || "Final").toLowerCase();
        if (s === "draft") {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                    <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span>Draft (Penugasan)</span>
                </span>
            );
        }
        if (s === "submitted") {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30 shrink-0">
                    <Loader2 className="w-3 h-3 animate-spin text-sky-600 dark:text-sky-400" />
                    <span>Submitted (Menunggu Review)</span>
                </span>
            );
        }
        if (s === "revisi") {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 shrink-0">
                    <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                    <span>Perlu Revisi</span>
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Final / Disahkan</span>
            </span>
        );
    };

    return (
        <div className="relative min-h-full flex-1 flex flex-col bg-background dark:bg-slate-950 overflow-y-auto overflow-x-hidden custom-scrollbar">
            {/* 1. Header Area with Clean Modern Hierarchy (Scrolls with page) */}
            <div className="px-4 sm:px-6 pt-3 sm:pt-5 pb-2.5 sm:pb-3 border-b border-border/80 shrink-0">
                <div className="flex items-center justify-between gap-2.5 sm:gap-3">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <h1 className="text-base sm:text-xl font-bold text-foreground tracking-tight">Dokumen Infrastruktur</h1>
                            <Badge variant="outline" className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30">
                                Berita Acara
                            </Badge>
                        </div>
                        <p className="hidden sm:block text-xs text-muted-foreground">
                            Kelola dokumen monitoring penugasan & pengarsipan resmi Berita Acara realisasi per Tahun Anggaran.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {canManagePenugasan(user) && (
                            <Button
                                onClick={() => setIsCreateOpen(true)}
                                className="h-8 sm:h-9 px-2.5 sm:px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-sm rounded-xl cursor-pointer"
                            >
                                <Plus className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                                <span className="hidden sm:inline">Terbitkan Draft Baru</span>
                                <span className="sm:hidden">Draft Baru</span>
                            </Button>
                        )}
                    </div>
                </div>

                {user?.role === 'operator_kecamatan' && (
                    <div className="mt-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span>
                                <strong>Mode Penugasan & Digitasi:</strong> Operator Kecamatan mendigitasi segmen jalan berdasarkan <strong>Draft Dokumen</strong> yang diterbitkan Bappeda. Setelah selesai, kirimkan hasil digitasi ke Bappeda untuk diverifikasi.
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. STICKY TOP MENUBAR: Search, Filters, Reset, Refresh, Status Pill Tabs */}
            <div className="sticky top-0 z-40 bg-background dark:bg-slate-950 border-b border-border shadow-xs">
                {/* Search & Actions Toolbar */}
                <div className="px-4 sm:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 bg-muted/20">
                    {/* Search Input on Left */}
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari Nomor Dokumen / Desa / Plotting..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(1);
                            }}
                            className="pl-9 h-9 w-full text-xs rounded-xl bg-background border-border"
                            autoComplete="off"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Filter Popover & Action Controls on Right */}
                    <div className="flex items-center gap-2 shrink-0">
                        <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "h-9 text-xs font-bold gap-2 rounded-xl border-border cursor-pointer",
                                        activeFilterCount > 0 && "border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10"
                                    )}
                                >
                                    <SlidersHorizontal className="h-3.5 w-3.5" />
                                    <span>Filter</span>
                                    {activeFilterCount > 0 && (
                                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-indigo-600 text-white rounded-full">
                                            {activeFilterCount}
                                        </Badge>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-80 p-4 space-y-4 shadow-xl border border-border rounded-2xl">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                        <Filter className="h-3.5 w-3.5 text-indigo-600" />
                                        <span>Filter Dokumen Infrastruktur</span>
                                    </div>
                                    {activeFilterCount > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleReset}
                                            className="h-6 text-[10px] text-muted-foreground hover:text-foreground px-1 cursor-pointer"
                                        >
                                            Reset
                                        </Button>
                                    )}
                                </div>

                                <div className="space-y-3 text-xs">
                                    {/* Kecamatan Filter */}
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Kecamatan</Label>
                                        <Combobox
                                            options={kecamatanFilterOptions}
                                            value={selectedKec}
                                            onChange={(value) => { setSelectedKec(value); setPage(1); }}
                                            placeholder="Semua Kecamatan"
                                            searchPlaceholder="Cari kecamatan..."
                                            disabled={user?.role === 'operator_kecamatan'}
                                            className="w-full"
                                        />
                                    </div>

                                    {/* Desa Filter */}
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Desa</Label>
                                        <Combobox
                                            options={desaFilterOptions}
                                            value={selectedDesa}
                                            onChange={(value) => { setSelectedDesa(value); setPage(1); }}
                                            placeholder="Semua Desa"
                                            searchPlaceholder="Cari desa..."
                                            disabled={!selectedKec || selectedKec === "all"}
                                            className="w-full"
                                        />
                                    </div>

                                    {/* Tahun Filter */}
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Tahun Anggaran</Label>
                                        <Combobox
                                            options={tahunFilterOptions}
                                            value={selectedTahun}
                                            onChange={(value) => { setSelectedTahun(value); setPage(1); }}
                                            placeholder="Semua Tahun"
                                            searchPlaceholder="Cari tahun..."
                                            className="w-full"
                                        />
                                    </div>

                                    {/* Status Filter */}
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Status Dokumen</Label>
                                        <Combobox
                                            options={statusFilterOptions}
                                            value={selectedStatus}
                                            onChange={(value) => { setSelectedStatus(value); setPage(1); }}
                                            placeholder="Semua Status"
                                            searchPlaceholder="Cari status..."
                                            className="w-full"
                                        />
                                    </div>

                                    {/* Filter Rentang Tanggal */}
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Rentang Tanggal Dibuat</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <span className="text-[10px] text-muted-foreground block mb-0.5">Dari</span>
                                                <DatePicker
                                                    value={startDate}
                                                    onChange={(val) => { setStartDate(val); setPage(1); }}
                                                    placeholder="Mulai..."
                                                />
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-muted-foreground block mb-0.5">Sampai</span>
                                                <DatePicker
                                                    value={endDate}
                                                    onChange={(val) => { setEndDate(val); setPage(1); }}
                                                    placeholder="Selesai..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2 border-t flex gap-2">
                                    <Button
                                        onClick={() => {
                                            setPage(1);
                                            fetchLaporan();
                                            setIsFilterPopoverOpen(false);
                                        }}
                                        size="sm"
                                        className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer"
                                    >
                                        Terapkan Filter
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>

                        {(activeFilterCount > 0 || searchTerm) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleReset}
                                className="h-9 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                Reset
                            </Button>
                        )}

                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-xl border-border cursor-pointer"
                            onClick={fetchLaporan}
                            disabled={loading}
                            title="Perbarui Data"
                        >
                            <RotateCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        </Button>
                    </div>
                </div>

                {/* Quick Status Filter Tabs with Counts (Horizontally scrollable on mobile/small screens) */}
                <div className="relative border-t border-border/60 bg-muted/10 shrink-0">
                    <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:overflow-x-visible sm:flex-wrap scroll-smooth touch-pan-x overscroll-x-contain">
                        {[
                            { value: "all", label: "Semua Dokumen", count: stats.total, color: "slate" },
                            { value: "Draft", label: "Draft Penugasan", count: stats.draft, color: "amber" },
                            { value: "Submitted", label: "Menunggu Review", count: stats.submitted, color: "sky" },
                            { value: "Revisi", label: "Perlu Revisi", count: stats.revisi, color: "rose" },
                            { value: "Final", label: "Final / Disahkan", count: stats.final, color: "emerald" },
                        ].map((tab) => (
                            <button
                                key={tab.value}
                                onClick={() => {
                                    setSelectedStatus(tab.value);
                                    setPage(1);
                                }}
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border shrink-0 whitespace-nowrap select-none active:scale-95",
                                    selectedStatus === tab.value
                                        ? tab.color === 'amber'
                                            ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                                            : tab.color === 'sky'
                                                ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                                                : tab.color === 'rose'
                                                    ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                                                    : tab.color === 'emerald'
                                                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                                        : "bg-foreground text-background border-foreground shadow-xs"
                                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                                )}
                            >
                                <span>{tab.label}</span>
                                {tab.count > 0 && (
                                    <span className={cn(
                                        "inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] font-mono font-black",
                                        selectedStatus === tab.value ? "bg-white/20 text-white" : "bg-muted-foreground/15 text-foreground"
                                    )}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Active Filter Chips (if any active filter applied) */}
                {activeFilterCount > 0 && (
                    <div className="flex items-center gap-1.5 px-4 sm:px-6 py-1.5 border-t border-border/60 bg-muted/5 text-[11px] overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap shrink-0">
                        <span className="text-muted-foreground font-semibold shrink-0">Filter aktif:</span>
                        {selectedKec !== "all" && (
                            <Badge variant="secondary" className="gap-1 px-2 py-0.5 rounded-lg text-[10px] shrink-0 whitespace-nowrap">
                                Kec: {kecamatanList.find(k => k.id.toString() === selectedKec)?.nama_kecamatan}
                                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedKec("all")} />
                            </Badge>
                        )}
                        {selectedDesa !== "all" && (
                            <Badge variant="secondary" className="gap-1 px-2 py-0.5 rounded-lg text-[10px] shrink-0 whitespace-nowrap">
                                Desa: {desaList.find(d => d.id.toString() === selectedDesa)?.nama_desa}
                                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedDesa("all")} />
                            </Badge>
                        )}
                        {selectedTahun !== "Semua" && (
                            <Badge variant="secondary" className="gap-1 px-2 py-0.5 rounded-lg text-[10px] shrink-0 whitespace-nowrap">
                                TA {selectedTahun}
                                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedTahun("Semua")} />
                            </Badge>
                        )}
                    </div>
                )}
            </div>

            {/* 3. Main Data Content Area (Natural page flow, no inner scroll on card/table) */}
            <div className="flex-1 px-4 sm:px-6 py-4 space-y-4 max-w-full overflow-x-hidden">
                {/* A. Desktop High-Density Table View (hidden on small screens) */}
                <div className="hidden md:block rounded-sm border border-border bg-card shadow-xs overflow-x-auto custom-scrollbar">
                    <Table className="min-w-[1050px]">
                        <TableHeader className="bg-muted/60 dark:bg-slate-900 border-b border-border">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="text-center font-bold sticky left-0 z-20 bg-muted/90 dark:bg-slate-900 border-r border-border w-[165px] min-w-[165px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                                    Aksi
                                </TableHead>
                                <TableHead className="w-12 text-center font-bold text-xs text-foreground">
                                    No
                                </TableHead>
                                <TableHead className="font-bold min-w-[200px] text-xs text-foreground">
                                    Nomor Dokumen
                                </TableHead>
                                <TableHead className="font-bold min-w-[180px] text-xs text-foreground">
                                    Desa & Kecamatan
                                </TableHead>
                                <TableHead className="text-center font-bold min-w-[130px] text-xs text-foreground">
                                    Tahun / Sumber
                                </TableHead>
                                <TableHead className="font-bold min-w-[180px] text-xs text-foreground">
                                    Plotting Anggaran
                                </TableHead>
                                <TableHead className="font-bold min-w-[180px] text-xs text-foreground">
                                    Target vs Realisasi
                                </TableHead>
                                <TableHead className="text-center font-bold min-w-[130px] text-xs text-foreground">
                                    Status
                                </TableHead>
                                <TableHead className="text-center font-bold min-w-[110px] text-xs text-foreground">
                                    Tanggal
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-40">
                                        <div className="p-4 space-y-3">
                                            <Skeleton className="h-10 w-full rounded-xl" />
                                            {Array.from({ length: 4 }).map((_, i) => (
                                                <Skeleton key={i} className="h-12 w-full rounded-xl" />
                                            ))}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-48 text-center text-muted-foreground text-xs">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <FileText className="w-8 h-8 opacity-40 text-muted-foreground" />
                                            <p className="font-semibold">Tidak ada dokumen monitoring yang sesuai filter.</p>
                                            <p className="text-[11px] text-muted-foreground">Silakan sesuaikan kriteria pencarian atau terbitkan draft penugasan baru.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedList.map((lap, idx) => {
                                    const targetPanjang = parseFloat(lap.rencana_panjang || lap.target_panjang_m || 0);
                                    const realisasiPanjang = parseFloat(lap.realisasi_panjang || lap.panjang_realisasi || lap.total_panjang_m || 0);
                                    const pct = targetPanjang > 0 ? Math.min(100, Math.round((realisasiPanjang / targetPanjang) * 100)) : 0;
                                    const segCount = lap.total_segmen ?? lap.jumlah_segmen ?? lap.SegmensFormatted?.length ?? lap.LaporanSegmens?.length ?? lap.segmens?.length;
                                    const segmenLabel = typeof segCount === 'number' && segCount > 0 ? `${segCount} Segmen` : 'Belum Ada Segmen';

                                    return (
                                        <TableRow key={lap.id} className="hover:bg-muted/50 transition-colors group">
                                            {/* Action Buttons Column */}
                                            <TableCell className="sticky left-0 z-10 bg-card group-hover:bg-muted/80 border-r border-border p-2 text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                                                                onClick={() => handleOpenDetail(lap.id)}
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Lihat Detail Dokumen</TooltipContent>
                                                    </Tooltip>

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer"
                                                                onClick={() => handleNavigateToPeta(lap)}
                                                            >
                                                                <MapPin className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Buka Peta Monitoring</TooltipContent>
                                                    </Tooltip>

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer"
                                                                onClick={() => handleOpenDetail(lap.id)}
                                                            >
                                                                <Printer className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Cetak Berita Acara (PDF)</TooltipContent>
                                                    </Tooltip>

                                                    {(user?.role === 'operator_bappeda' || user?.role === 'super_admin' || user?.role === 'admin') && (lap.status === 'Submitted' || lap.status === 'Final') && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50 cursor-pointer"
                                                                    onClick={() => handleOpenRevert(lap)}
                                                                >
                                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Kembalikan ke Draft (Buka Revisi)</TooltipContent>
                                                        </Tooltip>
                                                    )}

                                                    {canManagePenugasan(user) && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer"
                                                                    onClick={() => handleOpenEdit(lap)}
                                                                >
                                                                    <Edit3 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Edit Metadata Dokumen</TooltipContent>
                                                        </Tooltip>
                                                    )}

                                                    {canManagePenugasan(user) && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                                                                    onClick={() => handleDeleteClick(lap)}
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Hapus Dokumen</TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Number */}
                                            <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                {(page - 1) * limit + idx + 1}
                                            </TableCell>

                                            {/* Nomor BA */}
                                            <TableCell className="font-semibold text-xs text-foreground">
                                                <span className="font-mono text-xs">
                                                    {lap.nomor_ba || `050/XXX/412.302/${lap.tahun_anggaran || '2026'}`}
                                                </span>
                                            </TableCell>

                                            {/* Desa & Kecamatan */}
                                            <TableCell className="text-xs">
                                                <div className="font-semibold text-foreground">
                                                    Desa {lap.Desa?.nama_desa || "-"}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    Kec. {lap.Kecamatan?.nama_kecamatan || lap.Desa?.nama_kecamatan || "-"}
                                                </div>
                                            </TableCell>

                                            {/* Tahun & Sumber Dana */}
                                            <TableCell className="text-center text-xs">
                                                <div className="font-mono font-bold text-foreground">
                                                    {lap.tahun_anggaran || "2026"}
                                                </div>
                                                <Badge variant="outline" className="text-[9.5px] px-1.5 py-0 h-4 bg-muted/30">
                                                    {lap.sumber_dana || "BKK"}
                                                </Badge>
                                            </TableCell>

                                            {/* Plotting Anggaran */}
                                            <TableCell className="text-xs">
                                                {lap.PlottingAnggaran ? (
                                                    <div className="space-y-0.5 max-w-[220px]">
                                                        <span className="font-semibold text-foreground truncate block" title={lap.PlottingAnggaran.nama_kegiatan}>
                                                            {lap.PlottingAnggaran.nama_kegiatan}
                                                        </span>
                                                        <span className="text-[10.5px] text-muted-foreground block font-mono">
                                                            Rp {parseFloat(lap.PlottingAnggaran.target_pagu_anggaran || '0').toLocaleString('id-ID')}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs italic">Tanpa Tautan Plotting</span>
                                                )}
                                            </TableCell>

                                            {/* Target vs Realisasi */}
                                            <TableCell className="text-xs">
                                                <div className="space-y-1 max-w-[180px]">
                                                    <div className="flex justify-between text-[10.5px] font-mono">
                                                        <span className="font-bold text-foreground">
                                                            {realisasiPanjang.toLocaleString('id-ID')}m
                                                        </span>
                                                        <span className="text-muted-foreground">
                                                            / {targetPanjang > 0 ? `${targetPanjang.toLocaleString('id-ID')}m` : '-'}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className={cn(
                                                                "h-full rounded-full transition-all",
                                                                pct >= 80 ? "bg-emerald-600" : pct >= 50 ? "bg-amber-500" : "bg-rose-500"
                                                            )}
                                                            style={{ width: `${Math.min(100, pct)}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between items-center text-[9.5px]">
                                                        <span className={cn("font-bold", pct >= 80 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                                                            {targetPanjang > 0 ? `${pct}% Tercapai` : (realisasiPanjang > 0 ? "Realisasi Fisik" : "Belum Ada Target")}
                                                        </span>
                                                        <span className={cn("text-[9px] font-medium", typeof segCount === 'number' && segCount > 0 ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground")}>
                                                            {segmenLabel}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Status Badge */}
                                            <TableCell className="text-center">
                                                {renderStatusBadge(lap.status)}
                                            </TableCell>

                                            {/* Creation Date */}
                                            <TableCell className="text-center text-[10.5px] text-muted-foreground font-mono">
                                                {lap.created_at ? new Date(lap.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* B. Mobile / Tablet Responsive Reflow Cards (visible only on small screens) */}
                <div className="block md:hidden space-y-3">
                    {loading ? (
                        <div className="space-y-3">
                            <Skeleton className="h-28 w-full rounded-2xl" />
                            <Skeleton className="h-28 w-full rounded-2xl" />
                        </div>
                    ) : paginatedList.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-xs rounded-2xl border border-border bg-card">
                            <FileText className="w-8 h-8 opacity-40 mx-auto mb-2" />
                            <p className="font-semibold">Belum ada dokumen yang sesuai filter.</p>
                        </div>
                    ) : (
                        paginatedList.map((lap) => {
                            const targetPanjang = parseFloat(lap.rencana_panjang || lap.target_panjang_m || 0);
                            const realisasiPanjang = parseFloat(lap.realisasi_panjang || lap.panjang_realisasi || lap.total_panjang_m || 0);
                            const pct = targetPanjang > 0 ? Math.min(100, Math.round((realisasiPanjang / targetPanjang) * 100)) : 0;
                            const segCount = lap.total_segmen ?? lap.jumlah_segmen ?? lap.SegmensFormatted?.length ?? lap.LaporanSegmens?.length ?? lap.segmens?.length;

                            return (
                                <div key={lap.id} className="p-4 rounded-2xl border border-border bg-card space-y-3 shadow-xs">
                                    {/* Header Card: Nomor & Status */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="space-y-0.5">
                                            <span className="font-mono font-bold text-xs text-foreground block">
                                                {lap.nomor_ba || `050/XXX/412.302/${lap.tahun_anggaran || '2026'}`}
                                            </span>
                                            <span className="text-[11px] font-semibold text-foreground">
                                                Desa {lap.Desa?.nama_desa}, Kec. {lap.Kecamatan?.nama_kecamatan || lap.Desa?.nama_kecamatan}
                                            </span>
                                        </div>
                                        {renderStatusBadge(lap.status)}
                                    </div>

                                    {/* Linked Plotting Anggaran if available */}
                                    {lap.PlottingAnggaran && (
                                        <div className="p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-xs space-y-1">
                                            <div className="flex items-center gap-1 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] uppercase">
                                                <Layers className="w-3 h-3" />
                                                <span>Kegiatan Plotting</span>
                                            </div>
                                            <span className="font-semibold text-foreground block truncate">
                                                {lap.PlottingAnggaran.nama_kegiatan}
                                            </span>
                                        </div>
                                    )}

                                    {/* Progress Target Fisik */}
                                    <div className="space-y-1.5 p-2.5 rounded-xl bg-muted/20 border border-border/60">
                                        <div className="flex justify-between text-xs font-mono">
                                            <span className="font-bold text-foreground">Realisasi: {realisasiPanjang.toLocaleString('id-ID')}m</span>
                                            <span className="text-muted-foreground">Target: {targetPanjang.toLocaleString('id-ID')}m</span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full transition-all",
                                                    pct >= 80 ? "bg-emerald-600" : pct >= 50 ? "bg-amber-500" : "bg-rose-500"
                                                )}
                                                style={{ width: `${Math.min(100, pct)}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className={cn("font-bold", pct >= 80 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                                                {targetPanjang > 0 ? `${pct}% Tercapai` : (realisasiPanjang > 0 ? "Realisasi Fisik" : "Belum Ada Target")}
                                            </span>
                                            <span className="text-muted-foreground">
                                                {typeof segCount === 'number' && segCount > 0 ? `${segCount} Segmen • ` : ''}TA {lap.tahun_anggaran || '2026'} ({lap.sumber_dana || 'BKK'})
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons with 44px touch targets */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-border/60">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleOpenDetail(lap.id)}
                                            className="h-9 text-xs font-bold rounded-xl gap-1 cursor-pointer"
                                        >
                                            <Eye className="w-3.5 h-3.5 text-foreground" />
                                            <span>Detail</span>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleNavigateToPeta(lap)}
                                            className="h-9 text-xs font-bold rounded-xl text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 gap-1 cursor-pointer"
                                        >
                                            <MapPin className="w-3.5 h-3.5" />
                                            <span>Peta</span>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleOpenDetail(lap.id)}
                                            className="h-9 text-xs font-bold rounded-xl text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 gap-1 cursor-pointer"
                                        >
                                            <Printer className="w-3.5 h-3.5" />
                                            <span>Cetak</span>
                                        </Button>
                                        {canManagePenugasan(user) && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleOpenEdit(lap)}
                                                className="h-9 text-xs font-bold rounded-xl text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 gap-1 cursor-pointer"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                                <span>Edit</span>
                                            </Button>
                                        )}
                                        {(user?.role === 'operator_bappeda' || user?.role === 'super_admin' || user?.role === 'admin') && (lap.status === 'Submitted' || lap.status === 'Final') && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleOpenRevert(lap)}
                                                className="h-9 text-xs font-bold rounded-xl text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 gap-1 cursor-pointer col-span-2 sm:col-span-1"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                                <span>Revisi</span>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* 4. Non-Sticky Bottom Pagination (Minimalist flush layout) */}
                <div className="pt-1 pb-0">
                    <UsulanDesaPagination
                        className="p-0 py-0 sm:py-0 px-0 sm:px-0 gap-2"
                        pageIndex={page - 1}
                        pageCount={totalPages}
                        totalItems={totalItems}
                        pageSize={limit}
                        onPageChange={(newIdx: number) => setPage(newIdx + 1)}
                        onPageSizeChange={(newSize: number) => {
                            setLimit(newSize);
                            setPage(1);
                        }}
                    />
                </div>
            </div>

            {/* MODAL DETAIL & PRATINJAU DOKUMEN (WITH SHADCN UI TABS & EXPANDED RESPONSIVE SIZING) */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-[100vw] w-full h-[100dvh] sm:h-[92vh] sm:max-h-[94vh] sm:max-w-[96vw] xl:max-w-[1440px] 2xl:max-w-[1600px] flex flex-col gap-0 p-0 overflow-hidden bg-background border-0 sm:border sm:border-border rounded-none sm:rounded-2xl shadow-2xl">
                    {selectedDetailLaporan && (() => {
                        const targetPaguVal = parseFloat(selectedDetailLaporan.PlottingAnggaran?.target_pagu_anggaran || selectedDetailLaporan.pagu_anggaran || 0);
                        const targetPanjangVal = parseFloat(selectedDetailLaporan.rencana_panjang || selectedDetailLaporan.target_panjang_m || selectedDetailLaporan.PlottingAnggaran?.target_panjang_m || 0);

                        // Extract segmens list & calculate actual mapped sum fallback
                        const segmensList = selectedDetailLaporan.SegmensFormatted || selectedDetailLaporan.Segmens || selectedDetailLaporan.segmens || [];
                        const totalSegmenLengthAll = segmensList.reduce((acc: number, s: any) => acc + parseFloat(s.panjang_m || s.panjang || 0), 0);
                        const rawRealisasi = parseFloat(selectedDetailLaporan.realisasi_panjang || selectedDetailLaporan.panjang_realisasi || selectedDetailLaporan.total_panjang_m || 0);
                        const realisasiPanjangVal = rawRealisasi > 0 ? rawRealisasi : totalSegmenLengthAll;

                        const persentaseCapaian = targetPanjangVal > 0 ? Math.min(100, (realisasiPanjangVal / targetPanjangVal) * 100) : 0;
                        const statusLower = (selectedDetailLaporan.status || "final").toLowerCase();

                        // Filter segmen for Tab Daftar Segmen
                        const filteredSegmens = segmensList.filter((s: any) => {
                            let matchCat = true;
                            if (segmentFilter === 'poros') matchCat = s.is_jalan_poros === true;
                            if (segmentFilter === 'non_poros') matchCat = s.is_jalan_poros === false;

                            let matchQuery = true;
                            if (segmentSearch.trim()) {
                                const q = segmentSearch.toLowerCase();
                                matchQuery = (
                                    (s.kode_ruas && s.kode_ruas.toLowerCase().includes(q)) ||
                                    (s.namobj && s.namobj.toLowerCase().includes(q)) ||
                                    (s.nama_jalan && s.nama_jalan.toLowerCase().includes(q)) ||
                                    (s.jenis_perkerasan && s.jenis_perkerasan.toLowerCase().includes(q)) ||
                                    (s.kondisi && s.kondisi.toLowerCase().includes(q))
                                );
                            }
                            return matchCat && matchQuery;
                        });

                        const totalSegmenLength = filteredSegmens.reduce((acc: number, s: any) => acc + parseFloat(s.panjang_m || s.panjang || 0), 0);
                        const porosCount = segmensList.filter((s: any) => s.is_jalan_poros).length;
                        const nonPorosCount = segmensList.filter((s: any) => !s.is_jalan_poros).length;

                        return (
                            <>
                                {/* 1. Executive Top Header (Clean Mobile & Desktop Layout) */}
                                <DialogHeader className="px-3.5 py-3 sm:px-6 sm:py-3.5 border-b border-border bg-muted/20 shrink-0 pr-12 sm:pr-14 gap-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                                        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
                                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20 shadow-xs mt-0.5 sm:mt-0">
                                                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                            <div className="space-y-1 min-w-0 flex-1">
                                                {/* Title & Desktop Status Badge */}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <DialogTitle className="text-sm sm:text-base font-bold text-foreground tracking-tight leading-tight">
                                                        Detail Dokumen Monitoring
                                                    </DialogTitle>
                                                    <div className="hidden sm:inline-flex">
                                                        {renderStatusBadge(selectedDetailLaporan.status)}
                                                    </div>
                                                </div>

                                                {/* Village / District / Year Metadata */}
                                                <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-semibold text-foreground">Desa {selectedDetailLaporan.Desa?.nama_desa || '-'}</span>
                                                    <span>•</span>
                                                    <span>Kec. {selectedDetailLaporan.Kecamatan?.nama_kecamatan || selectedDetailLaporan.Desa?.nama_kecamatan || '-'}</span>
                                                    <span>•</span>
                                                    <span>TA {selectedDetailLaporan.tahun_anggaran || '2026'} ({selectedDetailLaporan.sumber_dana || 'BKK'})</span>
                                                </DialogDescription>

                                                {/* Mobile Only: Unified Status Badge & Nomor BA Row */}
                                                <div className="flex sm:hidden items-center gap-1.5 flex-wrap pt-0.5">
                                                    {renderStatusBadge(selectedDetailLaporan.status)}
                                                    {selectedDetailLaporan.nomor_ba && (
                                                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-background border border-border text-[10.5px] font-mono font-bold text-foreground shadow-2xs">
                                                            <span className="truncate max-w-[170px]">{selectedDetailLaporan.nomor_ba}</span>
                                                            <button
                                                                onClick={() => handleCopyNomorBa(selectedDetailLaporan.nomor_ba)}
                                                                className="text-muted-foreground hover:text-indigo-600 p-0.5 rounded cursor-pointer transition-colors"
                                                                title="Salin Nomor Dokumen"
                                                            >
                                                                <Copy className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Desktop Only: Nomor BA Pill & Copy Action */}
                                        <div className="hidden sm:flex items-center gap-2 shrink-0 self-start sm:self-auto">
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-border text-xs font-mono font-bold text-foreground shadow-xs">
                                                <span className="truncate max-w-[200px]">{selectedDetailLaporan.nomor_ba || '-'}</span>
                                                {selectedDetailLaporan.nomor_ba && (
                                                    <button
                                                        onClick={() => handleCopyNomorBa(selectedDetailLaporan.nomor_ba)}
                                                        className="text-muted-foreground hover:text-indigo-600 p-0.5 rounded cursor-pointer transition-colors"
                                                        title="Salin Nomor Dokumen"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </DialogHeader>

                                {/* 2. Scrollable Body: Metrics + Tabs (Header & Footer fixed) */}
                                <div className="flex-1 min-h-0 overflow-y-auto">

                                {/* Document Metrics & Lifecycle Summary Strip */}
                                <div className="p-3 sm:p-4 border-b border-border bg-muted/10 space-y-2.5 sm:space-y-3">
                                    {/* 4 KPI Metrics Strip */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
                                        {/* KPI 1: Total Segmen */}
                                        <div className="p-2 sm:p-2.5 rounded-xl bg-background border border-border/80 flex items-center gap-2 sm:gap-3">
                                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">Total Segmen</p>
                                                <p className="text-[11px] sm:text-xs font-bold text-foreground truncate">{segmensList.length} Ruas Segmen</p>
                                                <p className="text-[9.5px] text-muted-foreground truncate">{porosCount} Poros • {nonPorosCount} Non-Poros</p>
                                            </div>
                                        </div>

                                        {/* KPI 2: Realisasi Fisik */}
                                        <div className="p-2 sm:p-2.5 rounded-xl bg-background border border-border/80 flex items-center gap-2 sm:gap-3">
                                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                                <Ruler className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center justify-between gap-1">
                                                    <p className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">Realisasi Fisik</p>
                                                    {canManagePenugasan(user) && (
                                                        <button
                                                            onClick={handleSyncTargetFisik}
                                                            disabled={isSyncingTarget}
                                                            className="text-[9px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                                                            title="Sinkronkan target fisik dari Plotting Anggaran"
                                                        >
                                                            <RotateCw className={cn("w-2.5 h-2.5", isSyncingTarget && "animate-spin")} />
                                                            <span>Sync</span>
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-[11px] sm:text-xs font-bold font-mono text-foreground truncate">
                                                    {realisasiPanjangVal.toLocaleString('id-ID')} m <span className="text-[9.5px] font-normal text-muted-foreground">({(realisasiPanjangVal / 1000).toFixed(2)} km)</span>
                                                </p>
                                                <p className={cn("text-[9.5px] font-bold truncate", targetPanjangVal > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                                                    {targetPanjangVal > 0 ? `${persentaseCapaian.toFixed(1)}% dari target ${targetPanjangVal.toLocaleString('id-ID')} m` : "Target fisik belum diisi"}
                                                </p>
                                            </div>
                                        </div>

                                        {/* KPI 3: Plotting Kegiatan */}
                                        <div className="p-2 sm:p-2.5 rounded-xl bg-background border border-border/80 flex items-center gap-2 sm:gap-3">
                                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                                <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">Plotting Kegiatan</p>
                                                <p className="text-[11px] sm:text-xs font-bold text-foreground truncate" title={selectedDetailLaporan.PlottingAnggaran?.nama_kegiatan || 'Non-Plotting'}>
                                                    {selectedDetailLaporan.PlottingAnggaran?.nama_kegiatan || 'Non-Plotting / Mandiri'}
                                                </p>
                                                <p className="text-[9.5px] text-muted-foreground truncate">
                                                    {selectedDetailLaporan.PlottingAnggaran?.lokasi_kegiatan || `Desa ${selectedDetailLaporan.Desa?.nama_desa || '-'}`}
                                                </p>
                                            </div>
                                        </div>

                                        {/* KPI 4: Pagu Anggaran */}
                                        <div className="p-2 sm:p-2.5 rounded-xl bg-background border border-border/80 flex items-center gap-2 sm:gap-3">
                                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                                <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">Pagu Anggaran</p>
                                                <p className="text-[11px] sm:text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono truncate">
                                                    {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(targetPaguVal)}
                                                </p>
                                                <p className="text-[9.5px] text-muted-foreground truncate">
                                                    Sumber: {selectedDetailLaporan.sumber_dana || 'BKK'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Revision Alert Banner if any */}
                                    {(selectedDetailLaporan.catatan_revisi || (Array.isArray(selectedDetailLaporan.history_revisi) && selectedDetailLaporan.history_revisi.length > 0)) && (
                                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                                                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                                                    <span>Catatan Evaluasi & Riwayat Revisi oleh Bappeda</span>
                                                </div>
                                                {Array.isArray(selectedDetailLaporan.history_revisi) && selectedDetailLaporan.history_revisi.length > 0 && (
                                                    <Badge variant="outline" className="text-[9.5px] bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30 font-mono">
                                                        {selectedDetailLaporan.history_revisi.length}x Pengembalian
                                                    </Badge>
                                                )}
                                            </div>
                                            {selectedDetailLaporan.catatan_revisi && (
                                                <p className="bg-background/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-amber-500/20 text-foreground font-mono text-[11px] leading-relaxed">
                                                    {selectedDetailLaporan.catatan_revisi}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Streamlined Lifecycle Stepper */}
                                    <div className="p-2.5 sm:p-3 rounded-xl bg-background border border-border/80">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                <TrendingUp className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                                <span>Alur Siklus Dokumen</span>
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                Dibuat: {selectedDetailLaporan.created_at ? new Date(selectedDetailLaporan.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                                            {/* Step 1 */}
                                            <div className={cn(
                                                "p-2 rounded-lg border text-left transition-all",
                                                ["draft", "submitted", "revisi", "final"].includes(statusLower)
                                                    ? "bg-muted/30 border-indigo-500/30"
                                                    : "bg-muted/10 border-border opacity-50"
                                            )}>
                                                <div className="flex items-center gap-1.5">
                                                    <div className={cn(
                                                        "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0",
                                                        statusLower === "draft" ? "bg-amber-600 text-white animate-pulse" : "bg-emerald-600 text-white"
                                                    )}>
                                                        {statusLower === "draft" ? "1" : <Check className="w-2.5 h-2.5" />}
                                                    </div>
                                                    <span className="text-[11px] font-bold text-foreground truncate">1. Draft Penugasan</span>
                                                </div>
                                            </div>

                                            {/* Step 2 */}
                                            <div className={cn(
                                                "p-2 rounded-lg border text-left transition-all",
                                                ["submitted", "revisi", "final"].includes(statusLower)
                                                    ? "bg-muted/30 border-sky-500/30"
                                                    : "bg-muted/10 border-border opacity-50"
                                            )}>
                                                <div className="flex items-center gap-1.5">
                                                    <div className={cn(
                                                        "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0",
                                                        statusLower === "submitted" ? "bg-sky-600 text-white animate-pulse" : ["revisi", "final"].includes(statusLower) ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                                                    )}>
                                                        {["revisi", "final"].includes(statusLower) ? <Check className="w-2.5 h-2.5" /> : "2"}
                                                    </div>
                                                    <span className="text-[11px] font-bold text-foreground truncate">2. Pengajuan Digitasi</span>
                                                </div>
                                            </div>

                                            {/* Step 3 */}
                                            <div className={cn(
                                                "p-2 rounded-lg border text-left transition-all",
                                                ["revisi", "final"].includes(statusLower)
                                                    ? "bg-muted/30 border-amber-500/30"
                                                    : "bg-muted/10 border-border opacity-50"
                                            )}>
                                                <div className="flex items-center gap-1.5">
                                                    <div className={cn(
                                                        "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0",
                                                        statusLower === "revisi" ? "bg-rose-600 text-white animate-pulse" : statusLower === "final" ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                                                    )}>
                                                        {statusLower === "final" ? <Check className="w-2.5 h-2.5" /> : "3"}
                                                    </div>
                                                    <span className="text-[11px] font-bold text-foreground truncate">3. Evaluasi Bappeda</span>
                                                </div>
                                            </div>

                                            {/* Step 4 */}
                                            <div className={cn(
                                                "p-2 rounded-lg border text-left transition-all",
                                                statusLower === "final"
                                                    ? "bg-muted/30 border-emerald-500/40 ring-1 ring-emerald-500/20"
                                                    : "bg-muted/10 border-border opacity-50"
                                            )}>
                                                <div className="flex items-center gap-1.5">
                                                    <div className={cn(
                                                        "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0",
                                                        statusLower === "final" ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                                                    )}>
                                                        {statusLower === "final" ? <Check className="w-2.5 h-2.5" /> : "4"}
                                                    </div>
                                                    <span className="text-[11px] font-bold text-foreground truncate">4. Berita Acara Final</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. SHADCN UI TABS COMPONENT (Preview Peta | Daftar Segmen) */}
                                <Tabs
                                    value={detailActiveTab}
                                    onValueChange={(val) => {
                                        setDetailActiveTab(val as 'map' | 'segments');
                                        if (val === 'map') {
                                            setTimeout(() => {
                                                if (detailMapRef.current) {
                                                    detailMapRef.current.updateSize();
                                                    handleDetailMapFitBounds();
                                                }
                                            }, 100);
                                        }
                                    }}
                                    className="flex flex-col gap-0"
                                >
                                    {/* Tabs Header Navigation */}
                                    <div className="px-4 sm:px-6 py-2.5 border-b border-border bg-muted/10 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                        <TabsList className="bg-muted/80 border border-border p-1 rounded-xl h-auto grid grid-cols-2 w-full sm:w-auto">
                                            <TabsTrigger
                                                value="map"
                                                className="gap-2 px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-xs transition-all"
                                            >
                                                <MapPin className="w-3.5 h-3.5" />
                                                <span>Preview Peta</span>
                                                <Badge
                                                    variant="secondary"
                                                    className={cn(
                                                        "px-1.5 py-0.2 text-[10px] font-mono rounded-full",
                                                        detailActiveTab === 'map' ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                                                    )}
                                                >
                                                    {segmensList.length}
                                                </Badge>
                                            </TabsTrigger>

                                            <TabsTrigger
                                                value="segments"
                                                className="gap-2 px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-xs transition-all"
                                            >
                                                <TableIcon className="w-3.5 h-3.5" />
                                                <span>Daftar Segmen</span>
                                                <Badge
                                                    variant="secondary"
                                                    className={cn(
                                                        "px-1.5 py-0.2 text-[10px] font-mono rounded-full",
                                                        detailActiveTab === 'segments' ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                                                    )}
                                                >
                                                    {segmensList.length}
                                                </Badge>
                                            </TabsTrigger>
                                        </TabsList>

                                        {/* Right Tab Meta indicator */}
                                        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>Wilayah Desa:</span>
                                            <strong className="text-foreground">Desa {selectedDetailLaporan.Desa?.nama_desa || '-'}</strong>
                                        </div>
                                    </div>

                                    {/* TAB CONTENT 1: PREVIEW PETA (forceMount to keep map canvas attached) */}
                                    <TabsContent
                                        value="map"
                                        forceMount
                                        className={cn(
                                            "flex flex-col p-3 sm:p-4 space-y-3 mt-0",
                                            detailActiveTab === 'map' ? "flex" : "hidden"
                                        )}
                                    >
                                        {/* Map Header Toolbar with Zoom & Fit Controls (Always Single Row) */}
                                        <div className="flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl bg-muted/30 border border-border text-xs shrink-0">
                                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                                <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                                <span className="font-bold text-foreground truncate text-[11px] sm:text-xs">
                                                    Pratinjau Peta ({segmensList.length} Segmen Terpetakan)
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleDetailMapZoomIn}
                                                    className="h-7 w-7 p-0 rounded-lg cursor-pointer"
                                                    title="Perbesar Peta"
                                                >
                                                    <ZoomIn className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleDetailMapZoomOut}
                                                    className="h-7 w-7 p-0 rounded-lg cursor-pointer"
                                                    title="Perkecil Peta"
                                                >
                                                    <ZoomOut className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleDetailMapFitBounds}
                                                    className="h-7 px-2 sm:px-2.5 text-[10px] font-bold rounded-lg gap-1 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                                                    title="Pusatkan Peta ke Seluruh Segmen"
                                                >
                                                    <Maximize2 className="w-3 h-3" />
                                                    <span className="hidden sm:inline">Pusatkan Peta</span>
                                                    <span className="inline sm:hidden">Pusatkan</span>
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Map Container (Spacious and high-contrast with Floating Basemap Switcher) */}
                                        <div className="relative w-full h-[380px] sm:h-[460px] lg:h-[500px] rounded-2xl border border-border overflow-hidden bg-slate-100 dark:bg-slate-900 shadow-inner">
                                            <div
                                                ref={(node) => {
                                                    mapDetailContainerRef.current = node;
                                                    setMapElement(node);
                                                }}
                                                className="w-full h-full"
                                            />

                                            {/* FLOATING: Basemap Switcher (Bottom-Right) */}
                                            <div className="absolute bottom-3 right-3 z-20">
                                                <BasemapToggle
                                                    activeBasemap={detailActiveBasemap}
                                                    onBasemapChange={setDetailActiveBasemap}
                                                />
                                            </div>
                                        </div>

                                        {/* Map Legend Footer */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/20 border border-border text-[11px] shrink-0">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className="font-semibold text-muted-foreground">Keterangan:</span>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-3 h-3 rounded-full bg-blue-600" />
                                                    <span className="font-medium text-foreground">Sesuai Basis Data ({porosCount})</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-3 h-3 rounded-full bg-emerald-600" />
                                                    <span className="font-medium text-foreground">Diluar Basis Data ({nonPorosCount})</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-3 h-1 border-b-2 border-dashed border-slate-400" />
                                                    <span className="text-muted-foreground">Segmen Sekitar Desa</span>
                                                </div>
                                            </div>
                                            <div className="font-mono text-xs font-bold text-foreground">
                                                Total Terpetakan: {realisasiPanjangVal.toLocaleString('id-ID')} m
                                            </div>
                                        </div>
                                    </TabsContent>

                                    {/* TAB CONTENT 2: DAFTAR SEGMEN */}
                                    <TabsContent
                                        value="segments"
                                        className="flex flex-col p-3 sm:p-4 space-y-3 mt-0"
                                    >
                                        {/* Search & Filter Toolbar */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
                                            <div className="relative w-full sm:max-w-xs">
                                                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                                                <Input
                                                    placeholder="Cari ruas / kode / material / kondisi..."
                                                    value={segmentSearch}
                                                    onChange={(e) => setSegmentSearch(e.target.value)}
                                                    className="pl-8 h-8 text-xs rounded-xl"
                                                />
                                                {segmentSearch && (
                                                    <button
                                                        onClick={() => setSegmentSearch("")}
                                                        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {[
                                                    { value: 'all', label: `Semua (${segmensList.length})` },
                                                    { value: 'poros', label: `Poros Desa (${porosCount})` },
                                                    { value: 'non_poros', label: `Non-Poros (${nonPorosCount})` },
                                                ].map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => setSegmentFilter(opt.value as any)}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                                                            segmentFilter === opt.value
                                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                                                                : "bg-background text-muted-foreground border-border hover:bg-muted"
                                                        )}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Segments Table Container (Horizontal Scroll Enabled) */}
                                        <div className="w-full border border-border rounded-xl overflow-x-auto bg-background shadow-xs">
                                            <table className="w-full min-w-[860px] text-xs text-left">
                                                <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-10 text-[10px] uppercase font-bold text-muted-foreground border-b border-border shadow-2xs">
                                                    <tr>
                                                        <th className="p-2.5 text-center w-10 whitespace-nowrap">No</th>
                                                        <th className="p-2.5 text-center w-28 whitespace-nowrap">Kode Ruas</th>
                                                        <th className="p-2.5 min-w-[160px] whitespace-nowrap">Nama Objek / Ruas</th>
                                                        <th className="p-2.5 min-w-[180px] whitespace-nowrap">Koordinat (Awal - Akhir)</th>
                                                        <th className="p-2.5 text-center whitespace-nowrap">Kategori</th>
                                                        <th className="p-2.5 text-right whitespace-nowrap">Panjang (m)</th>
                                                        <th className="p-2.5 text-center whitespace-nowrap">Lebar (m)</th>
                                                        <th className="p-2.5 text-center whitespace-nowrap">Material</th>
                                                        <th className="p-2.5 text-center whitespace-nowrap">Kondisi</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {filteredSegmens.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={9} className="p-8 text-center text-muted-foreground">
                                                                <TableIcon className="w-7 h-7 mx-auto mb-2 opacity-40" />
                                                                <span className="font-semibold block text-sm">Tidak ada segmen yang sesuai filter.</span>
                                                                <span className="text-[11px] text-muted-foreground block mt-0.5">Coba sesuaikan kata kunci pencarian atau kategori filter.</span>
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        filteredSegmens.map((s: any, idx: number) => (
                                                            <tr key={s.id || idx} className="hover:bg-muted/20 transition-colors">
                                                                <td className="p-2.5 text-center font-mono text-muted-foreground whitespace-nowrap">{idx + 1}</td>
                                                                <td className="p-2.5 text-center font-mono font-bold text-foreground whitespace-nowrap">{s.kode_ruas || '-'}</td>
                                                                <td className="p-2.5 font-bold text-foreground whitespace-nowrap">{s.namobj || s.nama_jalan || '-'}</td>
                                                                <td className="p-2.5 font-mono text-[10px] text-muted-foreground leading-tight whitespace-nowrap">
                                                                    <div>Awal: {s.start_lat && s.start_lon ? `${parseFloat(s.start_lat).toFixed(5)}, ${parseFloat(s.start_lon).toFixed(5)}` : "-"}</div>
                                                                    <div>Akhir: {s.end_lat && s.end_lon ? `${parseFloat(s.end_lat).toFixed(5)}, ${parseFloat(s.end_lon).toFixed(5)}` : "-"}</div>
                                                                </td>
                                                                <td className="p-2.5 text-center whitespace-nowrap">
                                                                    <span className={cn(
                                                                        "px-2 py-0.5 text-[9.5px] rounded-md font-bold",
                                                                        s.is_jalan_poros
                                                                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                                                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                                                    )}>
                                                                        {s.is_jalan_poros ? "Poros Desa" : "Non-Poros"}
                                                                    </span>
                                                                </td>
                                                                <td className="p-2.5 text-right font-mono font-bold text-foreground whitespace-nowrap">
                                                                    {parseFloat(s.panjang_m || 0).toFixed(1)}
                                                                </td>
                                                                <td className="p-2.5 text-center font-mono whitespace-nowrap">{s.lebar_m || '-'}</td>
                                                                <td className="p-2.5 text-center font-medium whitespace-nowrap">
                                                                    {s.jenis_perkerasan || s.perkerasan || (s.atribut && (s.atribut.jenis_perkerasan || s.atribut.perkerasan)) || "Beton Cor"}
                                                                </td>
                                                                <td className="p-2.5 text-center whitespace-nowrap">
                                                                    <span className={cn(
                                                                        "px-2 py-0.5 text-[9.5px] rounded-md font-bold capitalize",
                                                                        (s.kondisi || "").toLowerCase() === 'rusak'
                                                                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                                                            : (s.kondisi || "").toLowerCase() === 'sedang'
                                                                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                                                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                                    )}>
                                                                        {s.kondisi || 'Baik'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Segments Footer Summary */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/20 border border-border text-xs shrink-0">
                                            <span className="text-muted-foreground">
                                                Menampilkan <strong>{filteredSegmens.length}</strong> dari <strong>{segmensList.length}</strong> segmen
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <span className="font-semibold text-muted-foreground">
                                                    Total Panjang: <strong className="font-mono text-foreground">{totalSegmenLength.toFixed(1)} m</strong> <span className="text-[11px] text-muted-foreground">({(totalSegmenLength / 1000).toFixed(2)} km)</span>
                                                </span>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>

                                </div>{/* end scrollable body */}

                                {/* 4. Executive Dialog Footer (Responsive Layout on Mobile) */}
                                <DialogFooter className="px-3 py-2 sm:px-6 sm:py-3.5 border-t border-border bg-muted/10 shrink-0 flex flex-row items-center justify-between sm:justify-end gap-1.5 sm:gap-2 w-full">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsDetailOpen(false)}
                                        className="h-8 sm:h-9 px-2.5 sm:px-4 text-xs font-semibold rounded-xl cursor-pointer shrink-0"
                                    >
                                        Tutup
                                    </Button>

                                    <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setIsDetailOpen(false);
                                                handleNavigateToPeta(selectedDetailLaporan);
                                            }}
                                            className="h-8 sm:h-9 px-2 sm:px-3.5 text-xs font-bold rounded-xl border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 gap-1 sm:gap-1.5 cursor-pointer shrink-0"
                                            title={`Buka di Peta Realisasi (TA ${selectedDetailLaporan.tahun_anggaran || '2026'})`}
                                        >
                                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                                            <span className="hidden sm:inline">Buka Peta</span>
                                            <span className="sm:hidden">Peta</span>
                                        </Button>
                                        {user?.role === 'operator_kecamatan' && (
                                            <Button
                                                type="button"
                                                onClick={handleDownloadFromDetail}
                                                className="h-8 sm:h-9 px-2.5 sm:px-4 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 sm:gap-1.5 font-bold shadow-xs rounded-xl cursor-pointer shrink-0"
                                                title="Unduh Dokumen Berita Acara"
                                            >
                                                <Download className="w-3.5 h-3.5 shrink-0" />
                                                <span className="hidden sm:inline">Unduh BA</span>
                                                <span className="sm:hidden">Unduh</span>
                                            </Button>
                                        )}
                                        {(user?.role === 'operator_bappeda' || user?.role === 'super_admin' || user?.role === 'admin') && (selectedDetailLaporan.status === 'Submitted' || selectedDetailLaporan.status === 'Final') && (
                                            <Button
                                                type="button"
                                                onClick={() => {
                                                    setIsDetailOpen(false);
                                                    handleOpenRevert(selectedDetailLaporan);
                                                }}
                                                className="h-8 sm:h-9 px-2 sm:px-3.5 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1 sm:gap-1.5 font-bold shadow-xs rounded-xl cursor-pointer shrink-0"
                                                title="Kembalikan Dokumen ke Draft untuk Revisi Kecamatan"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                                                <span className="hidden sm:inline">Buka Revisi</span>
                                                <span className="sm:hidden">Revisi</span>
                                            </Button>
                                        )}
                                        {canManagePenugasan(user) && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    handleOpenEdit(selectedDetailLaporan);
                                                }}
                                                className="h-8 sm:h-9 px-2 sm:px-3.5 text-xs font-bold rounded-xl border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 gap-1 sm:gap-1.5 cursor-pointer shrink-0"
                                                title="Edit Metadata Dokumen"
                                            >
                                                <Edit3 className="w-3.5 h-3.5 shrink-0" />
                                                <span className="hidden sm:inline">Edit Dokumen</span>
                                                <span className="sm:hidden">Edit</span>
                                            </Button>
                                        )}
                                        {canPrintBeritaAcara(user) && (
                                            <Button
                                                type="button"
                                                onClick={handlePrintFromDetail}
                                                className="h-8 sm:h-9 px-2.5 sm:px-4 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1 sm:gap-1.5 font-bold shadow-xs rounded-xl cursor-pointer shrink-0"
                                                title="Cetak Berita Acara & Lampiran Peta Spasial"
                                            >
                                                <Printer className="w-3.5 h-3.5 shrink-0" />
                                                <span className="hidden sm:inline">Cetak Dokumen</span>
                                                <span className="sm:hidden">Cetak</span>
                                            </Button>
                                        )}
                                    </div>
                                </DialogFooter>
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            {/* Bulk Create & Tabular Plotting Dialog */}
            <BulkCreateDraftModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={fetchLaporan}
                kecamatanList={kecamatanList}
                existingLaporanList={laporanList}
                defaultTahun={selectedTahun !== "Semua" ? selectedTahun : "2026"}
                defaultKecamatan={selectedKec}
            />

            {/* Edit Metadata Dokumen Modal */}
            <EditDokumenModal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                onSuccess={fetchLaporan}
                laporan={selectedLaporanToEdit}
            />

            {/* REVERT TO DRAFT / BUKA REVISI MODAL */}
            <Dialog open={revertDialogOpen} onOpenChange={setRevertDialogOpen}>
                <DialogContent className="sm:max-w-md bg-background border-border rounded-2xl shadow-2xl p-0 overflow-hidden">
                    <DialogHeader className="px-6 py-4 border-b border-border/80 bg-amber-500/10 dark:bg-amber-950/20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <RotateCcw className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-bold text-foreground">
                                    Kembalikan Dokumen ke Draft
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                    Membuka kunci segmen agar Operator Kecamatan dapat merevisi data
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-6 space-y-4 text-xs">
                        {selectedLaporanToRevert && (
                            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 space-y-1.5">
                                <p className="font-bold text-xs">Informasi Dokumen Berita Acara:</p>
                                <div className="grid grid-cols-2 gap-1 text-[11px]">
                                    <div>No. BA: <strong className="font-mono">{selectedLaporanToRevert.nomor_ba || '-'}</strong></div>
                                    <div>Tahun: <strong className="font-mono">{selectedLaporanToRevert.tahun_anggaran}</strong></div>
                                    <div className="col-span-2">
                                        Wilayah: <strong>{selectedLaporanToRevert.Desa?.nama_desa} (Kec. {selectedLaporanToRevert.Kecamatan?.nama_kecamatan})</strong>
                                    </div>
                                    <div className="col-span-2 text-muted-foreground pt-1">
                                        Realisasi Panjang: <strong className="font-mono text-foreground">{parseFloat(selectedLaporanToRevert.realisasi_panjang || 0).toFixed(1)} m</strong>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="p-3 rounded-xl bg-muted/40 border border-border/80 flex items-start gap-2.5 text-muted-foreground">
                            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-[11px] leading-relaxed">
                                Setelah status dikembalikan ke <strong>Draft</strong>, kunci snapshot akan dilepas sehingga Operator Kecamatan dapat mengedit geometri, mengubah atribut, dan menambahkan segmen baru pada desa dan tahun anggaran terkait.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="catatanRevisi" className="text-xs font-bold text-foreground">
                                Catatan Revisi untuk Kecamatan <span className="text-muted-foreground font-normal text-[10px]">(opsional)</span>
                            </Label>
                            <textarea
                                id="catatanRevisi"
                                rows={3}
                                value={catatanRevisiInput}
                                onChange={(e) => setCatatanRevisiInput(e.target.value)}
                                placeholder="Tuliskan catatan perbaikan atau arahan untuk operator kecamatan..."
                                className="w-full text-xs p-2.5 rounded-xl border border-input bg-background focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                            />
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-4 border-t border-border/80 bg-muted/20 flex flex-row gap-2 justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setRevertDialogOpen(false)}
                            disabled={isSubmittingRevert}
                            className="h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer"
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            onClick={handleRevertToDraft}
                            disabled={isSubmittingRevert}
                            className="h-9 px-5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/20 gap-1.5 cursor-pointer"
                        >
                            {isSubmittingRevert ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                            <span>Konfirmasi Buka Revisi</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Redesigned Premium Delete Confirmation Dialog */}
            <ConfirmDeleteDialog
                open={deleteDialogOpen}
                onClose={() => {
                    if (!isDeletingLaporan) {
                        setDeleteDialogOpen(false);
                        setSelectedLaporanToDelete(null);
                        setLoadingDeleteDetail(false);
                    }
                }}
                onConfirm={handleConfirmDeleteLaporan}
                loading={isDeletingLaporan}
                title="Konfirmasi Hapus Dokumen Monitoring"
                description="Apakah Anda yakin ingin menghapus Berita Acara ini beserta seluruh segmen realisasi yang terikat?"
                itemType="Dokumen Berita Acara"
                itemName={selectedLaporanToDelete?.nomor_ba || selectedLaporanToDelete?.kegiatan || `Dokumen Monitoring #${selectedLaporanToDelete?.id}`}
                details={[
                    { label: "Wilayah Desa", value: `Desa ${selectedLaporanToDelete?.Desa?.nama_desa || selectedLaporanToDelete?.nama_desa || '-'}` },
                    { label: "Tahun Anggaran", value: `TA ${selectedLaporanToDelete?.tahun_anggaran || '-'}` },
                    { label: "Status Dokumen", value: selectedLaporanToDelete?.status || 'Draft' },
                    {
                        label: "Segmen Terikat",
                        value: loadingDeleteDetail ? (
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Loader2 className="w-3 h-3 animate-spin" /> Memuat data segmen...
                            </span>
                        ) : (
                            `${selectedLaporanToDelete?.SegmensFormatted?.length ?? selectedLaporanToDelete?.LaporanSegmens?.length ?? selectedLaporanToDelete?.segmens?.length ?? selectedLaporanToDelete?.total_segmen ?? 0} Segmen Garis / Area`
                        )
                    }
                ]}
                warningText="PERINGATAN: Tindakan ini bersifat permanen. Seluruh geometri segmen jalan, titik koordinat, dan riwayat verifikasi yang terikat pada dokumen ini akan dihapus secara permanen dari basis data."
                confirmText="Hapus Dokumen & Segmen"
                cancelText="Batal"
            />

            {/* Alert Dialog: Pencegahan Cetak Dokumen Kosong / Masih Draft */}
            <AlertDialog open={isPrintDraftAlertOpen} onOpenChange={setIsPrintDraftAlertOpen}>
                <AlertDialogContent className="rounded-2xl max-w-md">
                    <AlertDialogHeader className="gap-2">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <AlertDialogTitle className="text-base font-bold text-foreground">
                            Dokumen Masih Berstatus Draft
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
                            Dokumen ini belum memiliki data ruas jalan yang terpetakan ({selectedDetailLaporan?.Desa?.nama_desa ? `Desa ${selectedDetailLaporan.Desa.nama_desa}` : "desa target"}). Silakan lakukan digitasi segmen terlebih dahulu pada peta sebelum mencetak Berita Acara Final.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-row items-center justify-end gap-2 pt-2">
                        <AlertDialogCancel className="h-9 px-4 text-xs rounded-xl cursor-pointer">
                            Tutup
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                setIsPrintDraftAlertOpen(false);
                                setIsDetailOpen(false);
                                handleNavigateToPeta(selectedDetailLaporan);
                            }}
                            className="h-9 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-1.5 cursor-pointer"
                        >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Buka Peta Digitasi</span>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
