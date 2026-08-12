import React, { useEffect, useState, useRef } from "react";
import { type MetaFunction, useParams } from "react-router";
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
    Route,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { ModeToggle } from "~/components/mode-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "~/components/ui/sheet";
import { Badge } from "~/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
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
import { cn } from "~/lib/utils";
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
import { useTheme } from "next-themes";
import { fromLonLat, toLonLat } from "ol/proj";
import Point from "ol/geom/Point";
import LineString from "ol/geom/LineString";
import GeoJSON from "ol/format/GeoJSON";
import { Style, Stroke, Fill, Circle as CircleStyle, Text as StyleText } from "ol/style";
import "ol/ol.css";

export const meta: MetaFunction = () => {
    return [
        { title: "Formulir Laporan Realisasi - MELAROSA" },
        { name: "description", content: "Formulir publik pengisian koordinat realisasi infrastruktur desa." },
    ];
};

const LOCAL_STORAGE_KEY = "anonymous_realisasi_entries";

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

export default function RealisasiPublikPage() {
    const { idForm } = useParams<{ idForm: string }>();
    const [activeBasemap, setActiveBasemap] = useState<string>("google-sat");
    const [activeForm, setActiveForm] = useState<FormRealisasi | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [myEntries, setMyEntries] = useState<RealisasiEntry[]>([]);
    const [isLoadingForm, setIsLoadingForm] = useState(true);
    const [isLoadingEntries, setIsLoadingEntries] = useState(false);

    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
    const [isFormViewOpen, setIsFormViewOpen] = useState(false);

    const [kecamatanList, setKecamatanList] = useState<Kecamatan[]>([]);
    const [desaList, setDesaList] = useState<Desa[]>([]);
    const [selectedKecId, setSelectedKecId] = useState<string>("");
    const [selectedDesaId, setSelectedDesaId] = useState<string>("");

    const [kecOpen, setKecOpen] = useState(false);
    const [desaOpen, setDesaOpen] = useState(false);
    const [namaKegiatan, setNamaKegiatan] = useState("");
    const [deskripsi, setDeskripsi] = useState("");
    const [volume, setVolume] = useState("");
    const [anggaran, setAnggaran] = useState("");
    const [selectedFungsi, setSelectedFungsi] = useState<string[]>([]);
    const [selectedKonstruksi, setSelectedKonstruksi] = useState<string[]>([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

    const [activeEntry, setActiveEntry] = useState<RealisasiEntry | null>(null);
    const [coordsList, setCoordsList] = useState<RealisasiTitik[]>([]);
    const [editingPointId, setEditingPointId] = useState<string | null>(null);
    const [addingTipe, setAddingTipe] = useState<'start' | 'end' | null>(null);
    const [coordLat, setCoordLat] = useState("");
    const [coordLng, setCoordLng] = useState("");
    const [coordKet, setCoordKet] = useState("");

    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [confirmDialogType, setConfirmDialogType] = useState<'delete_entry' | 'delete_coord' | 'submit_entry' | null>(null);
    const [confirmTargetId, setConfirmTargetId] = useState<string | null>(null);

    // Mobile detection
    const [isMobile, setIsMobile] = useState(false);

    const mapElementRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<OLMap | null>(null);
    const basemapTileLayerRef = useRef<TileLayer<OSM | XYZ> | null>(null);
    const vectorSourceRef = useRef<VectorSource>(new VectorSource());
    const desaBoundarySourceRef = useRef<VectorSource>(new VectorSource());
    const jalanDesaSourceRef = useRef<VectorSource>(new VectorSource());
    const clickListenerRef = useRef<any>(null);

    useEffect(() => {
        fetchFormDetails();
        fetchKecamatan();
        fetchMyEntries();
    }, [idForm]);

    // Detect mobile screen size
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 640);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    useEffect(() => {
        if (selectedKecId) {
            fetchDesa(selectedKecId);
        } else {
            setDesaList([]);
        }
    }, [selectedKecId]);

    const getViewportPadding = (): [number, number, number, number] => {
        if (typeof window === "undefined") return [80, 40, 80, 40];
        const isDesktop = window.innerWidth >= 768;
        const topPadding = 80;
        const leftPadding = isDesktop && isLeftPanelOpen ? 384 + 40 : 40;
        const rightPadding = isDesktop && isRightPanelOpen ? 384 + 40 : 40;
        const bottomPadding = !isDesktop && (isLeftPanelOpen || isRightPanelOpen)
            ? Math.floor(window.innerHeight * 0.58)
            : 80;
        return [topPadding, rightPadding, bottomPadding, leftPadding];
    };

    const fetchDesaAndJalanGeoJSON = async (targetDesaId: string) => {
        if (!mapRef.current || !targetDesaId) return;
        try {
            desaBoundarySourceRef.current.clear();
            jalanDesaSourceRef.current.clear();

            // 1. Fetch & Render Desa Boundary Polygon
            const boundaryGeojson = await desaService.getDesaGeojsonById(targetDesaId);
            if (boundaryGeojson) {
                const bFeatures = new GeoJSON().readFeatures(boundaryGeojson, { featureProjection: "EPSG:3857" });
                if (bFeatures && bFeatures.length > 0) {
                    desaBoundarySourceRef.current.addFeatures(bFeatures);
                }
            }

            // 2. Fetch & Render Segmen & Jalan Poros GeoJSON by Desa ID
            const [segmenGeojson, porosGeojson] = await Promise.all([
                jalanService.getSegmenByDesa(targetDesaId),
                jalanService.getJalanPorosByDesa(targetDesaId)
            ]);

            const reader = new GeoJSON();
            if (segmenGeojson) {
                const sFeatures = reader.readFeatures(segmenGeojson, { featureProjection: "EPSG:3857" });
                sFeatures.forEach((f) => {
                    const nama = f.get("nama_ruas") || f.get("nama_jalan") || f.get("nama_segmen") || "Ruas Jalan";
                    f.setStyle(new Style({
                        stroke: new Stroke({ color: "#f97316", width: 3.5 }),
                        text: new StyleText({
                            text: String(nama),
                            font: "bold 10px sans-serif",
                            fill: new Fill({ color: "#9a3412" }),
                            stroke: new Stroke({ color: "#ffffff", width: 2.5 }),
                            placement: "line",
                        }),
                    }));
                });
                jalanDesaSourceRef.current.addFeatures(sFeatures);
            }

            if (porosGeojson) {
                const pFeatures = reader.readFeatures(porosGeojson, { featureProjection: "EPSG:3857" });
                pFeatures.forEach((f) => {
                    const nama = f.get("nama_ruas") || f.get("nama_jalan") || "Jalan Poros";
                    f.setStyle(new Style({
                        stroke: new Stroke({ color: "#ea580c", width: 4.5 }),
                        text: new StyleText({
                            text: String(nama),
                            font: "bold 11px sans-serif",
                            fill: new Fill({ color: "#7c2d12" }),
                            stroke: new Stroke({ color: "#ffffff", width: 2.5 }),
                            placement: "line",
                        }),
                    }));
                });
                jalanDesaSourceRef.current.addFeatures(pFeatures);
            }

            setTimeout(() => {
                if (!mapRef.current) return;
                mapRef.current.updateSize();
                let fitExtent: any = null;
                if (desaBoundarySourceRef.current.getFeatures().length > 0) {
                    fitExtent = desaBoundarySourceRef.current.getExtent();
                } else if (jalanDesaSourceRef.current.getFeatures().length > 0) {
                    fitExtent = jalanDesaSourceRef.current.getExtent();
                }
                if (fitExtent && fitExtent.every((n: number) => isFinite(n))) {
                    mapRef.current.getView().fit(fitExtent, {
                        padding: getViewportPadding(),
                        duration: 800,
                        maxZoom: 16
                    });
                }
            }, 300);
        } catch (err) {
            console.error("Gagal memuat GeoJSON desa/jalan:", err);
        }
    };

    // Load GeoJSON Batas Desa and GeoJSON Jalan Poros / Segmen when Desa is selected
    useEffect(() => {
        if (!mapRef.current) return;
        if (!selectedDesaId) {
            desaBoundarySourceRef.current.clear();
            jalanDesaSourceRef.current.clear();
            return;
        }
        fetchDesaAndJalanGeoJSON(selectedDesaId);
    }, [selectedDesaId]);

    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    useEffect(() => {
        if (!basemapTileLayerRef.current) return;
        basemapTileLayerRef.current.setSource(getBasemapSource(activeBasemap));
    }, [activeBasemap]);

    useEffect(() => {
        if (isLoadingForm || !mapElementRef.current) return;
        if (!mapRef.current) {
            const initialSource = getBasemapSource(activeBasemap);
            const tileLayer = new TileLayer({ source: initialSource });
            basemapTileLayerRef.current = tileLayer;

            mapRef.current = new OLMap({
                target: mapElementRef.current,
                controls: [],
                layers: [
                    tileLayer,
                    // Layer Batas Desa Polygon (Tanpa fill color, hanya garis batas)
                    new VectorLayer({
                        source: desaBoundarySourceRef.current,
                        style: new Style({
                            stroke: new Stroke({ color: "#3b82f6", width: 2.5, lineDash: [6, 6] }),
                        }),
                    }),
                    // Layer Jalan Desa & Poros GeoJSON
                    new VectorLayer({
                        source: jalanDesaSourceRef.current,
                    }),
                    // Layer Titik & Marker Realisasi
                    new VectorLayer({ source: vectorSourceRef.current }),
                ],
                view: new View({ center: fromLonLat([112.015, -7.125]), zoom: 11 }),
            });
        }
        return () => {
            if (mapRef.current) {
                mapRef.current.setTarget(undefined);
                mapRef.current = null;
            }
        };
    }, [isLoadingForm]);

    const getActiveMapPoints = (): RealisasiTitik[] => {
        if (activeEntry) {
            return coordsList.length > 0 ? coordsList : (activeEntry.titik || []);
        }
        if (isFormViewOpen && isEditMode && selectedEntryId) {
            const entry = myEntries.find(e => e.id === selectedEntryId);
            return entry?.titik || [];
        }
        return [];
    };

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
                const lineFeat = new Feature({ geometry: new LineString([fromLonLat([startPt.longitude, startPt.latitude]), fromLonLat([endPt.longitude, endPt.latitude])]) });
                lineFeat.setStyle(lineStyle);
                vectorSourceRef.current.addFeature(lineFeat);
            }
        });

        const isEditingCoords = activeEntry && (activeEntry.status === 'draft' || activeEntry.status === 'rejected');
        if (isEditingCoords && coordLat && coordLng && !isNaN(Number(coordLat)) && !isNaN(Number(coordLng))) {
            const previewFeat = new Feature({ geometry: new Point(fromLonLat([Number(coordLng), Number(coordLat)])) });
            previewFeat.setStyle(previewStyle);
            vectorSourceRef.current.addFeature(previewFeat);
        }

        if (points.length > 0) {
            mapRef.current.getView().fit(vectorSourceRef.current.getExtent(), { padding: getViewportPadding(), duration: 500, maxZoom: 16 });
        } else if (isEditingCoords && coordLat && coordLng && !isNaN(Number(coordLat)) && !isNaN(Number(coordLng))) {
            mapRef.current.getView().setCenter(fromLonLat([Number(coordLng), Number(coordLat)]));
            mapRef.current.getView().setZoom(15);
        }
    }, [activeEntry, coordsList, coordLat, coordLng, isFormViewOpen, selectedDesaId, myEntries]);

    useEffect(() => {
        const map = mapRef.current;
        if (map) setTimeout(() => map.updateSize(), 300);
    }, [isLeftPanelOpen, isRightPanelOpen, isFormViewOpen]);

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

    const getStoredIds = (): string[] => {
        if (typeof window === "undefined") return [];
        try { return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]"); } catch { return []; }
    };
    const addStoredId = (id: string) => {
        if (typeof window === "undefined") return;
        const cur = getStoredIds();
        if (!cur.includes(id)) localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([...cur, id]));
    };
    const removeStoredId = (id: string) => {
        if (typeof window === "undefined") return;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(getStoredIds().filter(x => x !== id)));
    };

    const fetchFormDetails = async () => {
        if (!idForm) return;
        setIsLoadingForm(true);
        setFormError(null);
        try {
            const res = await realisasiService.getFormById(idForm);
            if (res.status === "success" && res.result) {
                if (res.result.is_open) setActiveForm(res.result);
                else setFormError("Formulir realisasi ini sudah ditutup oleh administrator.");
            } else setFormError("Formulir realisasi tidak ditemukan.");
        } catch { setFormError("Formulir realisasi tidak ditemukan atau terjadi kesalahan server."); }
        finally { setIsLoadingForm(false); }
    };

    const fetchKecamatan = async () => {
        try { setKecamatanList(await kecamatanService.getKecamatan()); } catch {}
    };
    const fetchDesa = async (kecId: string) => {
        try { setDesaList(await desaService.getDesa(kecId)); } catch {}
    };

    const fetchMyEntries = async () => {
        const ids = getStoredIds();
        if (ids.length === 0) { setMyEntries([]); return; }
        setIsLoadingEntries(true);
        try {
            const res = await realisasiService.getEntriesByIdsPublic(ids);
            if (res.status === "success" && res.result) {
                const filtered = res.result.filter(e => e.id_form === idForm);
                setMyEntries(filtered);
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(res.result.map(x => x.id)));
                if (filtered.length > 0 && filtered[0].id_desa && !selectedDesaId) {
                    if (filtered[0].id_kecamatan) setSelectedKecId(String(filtered[0].id_kecamatan));
                    setSelectedDesaId(String(filtered[0].id_desa));
                }
            }
        } catch {} finally { setIsLoadingEntries(false); }
    };

    const fungsiOptions = React.useMemo(() => {
        if (!activeForm?.opsi_fungsi || !Array.isArray(activeForm.opsi_fungsi) || activeForm.opsi_fungsi.length === 0) {
            return [
                { id: "Perdagangan", label: "Perdagangan" },
                { id: "Kesehatan", label: "Kesehatan" },
                { id: "Pendidikan", label: "Pendidikan" },
                { id: "Pertanian", label: "Pertanian" },
                { id: "Permukiman", label: "Permukiman" }
            ];
        }
        return activeForm.opsi_fungsi.map((opt: any) => typeof opt === 'string' ? { id: opt, label: opt } : opt);
    }, [activeForm]);

    const konstruksiOptions = React.useMemo(() => {
        if (!activeForm?.opsi_konstruksi || !Array.isArray(activeForm.opsi_konstruksi) || activeForm.opsi_konstruksi.length === 0) {
            return [
                { id: "aspal_hotmix", label: "Aspal / Hotmix" },
                { id: "lapen", label: "Lapen (Lapis Penetrasi)" },
                { id: "rigid_beton", label: "Rigid / Beton" },
                { id: "paving_block", label: "Paving Block" },
                { id: "telford_makadam", label: "Telford / Makadam" },
                { id: "tanah", label: "Tanah" }
            ];
        }
        return activeForm.opsi_konstruksi.map((opt: any) => typeof opt === 'string' ? { id: opt, label: opt } : opt);
    }, [activeForm]);

    const formatRupiahInput = (val: string | number) => {
        if (!val) return "";
        const digits = String(val).replace(/\D/g, "");
        if (!digits) return "";
        return Number(digits).toLocaleString("id-ID");
    };

    const handleOpenCreateEntry = () => {
        if (!activeForm) return;
        setIsEditMode(false); setSelectedEntryId(null);
        setNamaKegiatan(""); setDeskripsi(""); setVolume(""); setAnggaran("");
        setSelectedFungsi([]); setSelectedKonstruksi([]);
        setSelectedKecId(""); setSelectedDesaId("");
        setIsFormViewOpen(true); setIsLeftPanelOpen(true);
    };

    const handleOpenEditEntry = (entry: RealisasiEntry) => {
        setIsEditMode(true); setSelectedEntryId(entry.id);
        setNamaKegiatan(entry.nama_kegiatan); setDeskripsi(entry.deskripsi || "");
        setVolume(entry.volume || ""); setAnggaran(entry.anggaran ? formatRupiahInput(entry.anggaran) : "");
        setSelectedFungsi(entry.fungsi_infrastruktur || []);
        setSelectedKonstruksi(entry.opsi_konstruksi || []);
        setSelectedKecId(entry.id_kecamatan ? String(entry.id_kecamatan) : "");
        setSelectedDesaId(entry.id_desa ? String(entry.id_desa) : "");
        setIsFormViewOpen(true); setIsLeftPanelOpen(true);
    };

    const handleSaveEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeForm || !namaKegiatan.trim() || !selectedKecId || !selectedDesaId) {
            toast.error("Nama Kegiatan, Kecamatan, dan Desa wajib diisi."); return;
        }
        const kecObj = kecamatanList.find(k => String(k.id) === selectedKecId);
        const desaObj = desaList.find(d => String(d.id) === selectedDesaId);
        const cleanAnggaran = anggaran ? Number(anggaran.replace(/\D/g, "")) : undefined;
        const payload = {
            id_form: activeForm.id, nama_kegiatan: namaKegiatan, deskripsi, volume,
            anggaran: cleanAnggaran,
            fungsi_infrastruktur: selectedFungsi,
            opsi_konstruksi: selectedKonstruksi,
            id_kecamatan: Number(selectedKecId), id_desa: Number(selectedDesaId),
            nama_kecamatan: kecObj?.nama_kecamatan || "", nama_desa: desaObj?.nama_desa || "",
        };
        try {
            let savedEntry: RealisasiEntry | null = null;
            if (isEditMode && selectedEntryId) {
                const { id_form, ...editPayload } = payload;
                const res = await realisasiService.updateEntryPublic(selectedEntryId, editPayload);
                toast.success("Laporan berhasil diperbarui. Silakan periksa koordinat lokasi.");
                if (res.status === "success" && res.result) {
                    savedEntry = res.result;
                }
            } else {
                const res = await realisasiService.createEntryPublic(payload);
                if (res.status === "success" && res.result) {
                    addStoredId(res.result.id);
                    savedEntry = res.result;
                    toast.success("Laporan berhasil dibuat! Silakan tambahkan titik koordinat geometri lokasi pada peta.");
                }
            }
            setIsFormViewOpen(false);
            await fetchMyEntries();

            // Automatically open coordinate management panel for the saved entry
            if (savedEntry) {
                await handleOpenCoordsManager(savedEntry);
            }
        } catch {}
    };

    const handleDeleteEntry = async (id: string) => {
        try {
            await realisasiService.deleteEntryPublic(id); removeStoredId(id);
            if (activeEntry?.id === id) { setActiveEntry(null); setIsRightPanelOpen(false); }
            fetchMyEntries(); toast.success("Laporan berhasil dihapus.");
        } catch {}
    };

    const handleOpenCoordsManager = async (entry: RealisasiEntry) => {
        setActiveEntry(entry);
        if (entry.id_kecamatan) setSelectedKecId(String(entry.id_kecamatan));
        if (entry.id_desa) setSelectedDesaId(String(entry.id_desa));
        try {
            const res = await realisasiService.getTitikByEntryPublic(entry.id);
            if (res.status === "success" && res.result) setCoordsList(res.result);
            setEditingPointId(null); setAddingTipe(null); setCoordLat(""); setCoordLng(""); setCoordKet("");
            setIsRightPanelOpen(true);
        } catch {}
    };

    const handleSaveCoordinate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeEntry || !coordLat || !coordLng) { toast.error("Koordinat wajib diisi."); return; }
        try {
            if (editingPointId) {
                await realisasiService.updateTitikPublic(editingPointId, { latitude: Number(coordLat), longitude: Number(coordLng), keterangan: coordKet });
                toast.success("Koordinat berhasil diperbarui.");
            } else if (addingTipe) {
                const nextOrder = coordsList.filter(pt => pt.tipe === addingTipe).length + 1;
                const res = await realisasiService.addTitikPublic({ id_entry: activeEntry.id, tipe: addingTipe, urutan: nextOrder, latitude: Number(coordLat), longitude: Number(coordLng), keterangan: coordKet });
                if (res.status === "success") toast.success("Koordinat berhasil ditambahkan.");
            }
            const res = await realisasiService.getTitikByEntryPublic(activeEntry.id);
            if (res.status === "success" && res.result) setCoordsList(res.result);
            setEditingPointId(null); setAddingTipe(null); setCoordLat(""); setCoordLng(""); setCoordKet("");
            // On mobile, reopen the right panel after saving so user can continue
            if (isMobile && activeEntry) setIsRightPanelOpen(true);
        } catch {}
    };

    const handleDeleteCoordinate = async (id: string) => {
        try {
            await realisasiService.deleteTitikPublic(id);
            setCoordsList(prev => prev.filter(pt => pt.id !== id));
            toast.success("Koordinat berhasil dihapus.");
        } catch {}
    };

    const handleSubmitEntry = async (id: string) => {
        try {
            await realisasiService.submitEntryPublic(id); fetchMyEntries();
            if (activeEntry?.id === id) setActiveEntry(prev => prev ? { ...prev, status: 'submitted' } : null);
        } catch {}
    };

    const handleDeleteEntryClick = (id: string) => { setConfirmTargetId(id); setConfirmDialogType('delete_entry'); setConfirmDialogOpen(true); };
    const handleDeleteCoordinateClick = (id: string) => { setConfirmTargetId(id); setConfirmDialogType('delete_coord'); setConfirmDialogOpen(true); };
    const handleSubmitEntryClick = (id: string) => {
        const entry = myEntries.find(e => e.id === id);
        if (entry && (!entry.titik || entry.titik.length === 0) && coordsList.length === 0) {
            toast.error("Koordinat lokasi belum diisi."); return;
        }
        setConfirmTargetId(id); setConfirmDialogType('submit_entry'); setConfirmDialogOpen(true);
    };

    const handleConfirmAction = async () => {
        if (!confirmTargetId || !confirmDialogType) return;
        const id = confirmTargetId; const type = confirmDialogType;
        setConfirmDialogOpen(false); setConfirmDialogType(null); setConfirmTargetId(null);
        if (type === 'delete_entry') await handleDeleteEntry(id);
        else if (type === 'delete_coord') await handleDeleteCoordinate(id);
        else if (type === 'submit_entry') await handleSubmitEntry(id);
    };

    const handleOpenDetail = async (entry: RealisasiEntry) => {
        setActiveEntry(entry);
        try {
            const res = await realisasiService.getTitikByEntryPublic(entry.id);
            if (res.status === "success" && res.result) { entry.titik = res.result; setCoordsList(res.result); }
            setIsRightPanelOpen(true);
        } catch {}
    };

    const handleCloseRightPanel = () => { setIsRightPanelOpen(false); setEditingPointId(null); setAddingTipe(null); };
    const handleZoomIn = () => { const v = mapRef.current?.getView(); if (v) v.animate({ zoom: (v.getZoom() || 0) + 1, duration: 250 }); };
    const handleZoomOut = () => { const v = mapRef.current?.getView(); if (v) v.animate({ zoom: (v.getZoom() || 0) - 1, duration: 250 }); };
    const handleResetBearing = () => { mapRef.current?.getView().animate({ rotation: 0, duration: 250 }); };

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
                    <Crosshair className="w-3 h-3" /> Klik peta
                </span>
            </div>
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
                <Input value={coordKet} onChange={(e) => setCoordKet(e.target.value)} placeholder="Dekat tiang listrik..." className="h-8 text-xs bg-background rounded-xl" />
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
        const colorAccent = isStart ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
        const bgAccent = isStart ? "bg-emerald-500" : "bg-rose-500";
        const borderAccent = isStart ? "border-emerald-200 dark:border-emerald-800/50" : "border-rose-200 dark:border-rose-800/50";
        const bgLight = isStart ? "bg-emerald-50/30 dark:bg-emerald-950/10" : "bg-rose-50/30 dark:bg-rose-950/10";
        const labelText = isStart ? "Titik Awal (START)" : "Titik Akhir (END)";

        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between px-0.5">
                    <div className={cn("flex items-center gap-2 font-bold text-xs", colorAccent)}>
                        <div className={cn("w-2 h-2 rounded-full", bgAccent)} />
                        {labelText}
                        <span className="text-[10px] font-normal text-muted-foreground">({groupPoints.length})</span>
                    </div>
                    {canEdit && addingTipe !== tipe && !editingPointId && (
                        <Button variant="ghost" size="sm" className={cn("h-6 text-[10px] px-2 font-semibold gap-1 hover:bg-muted", colorAccent)}
                            onClick={() => {
                                setAddingTipe(tipe); setEditingPointId(null);
                                setCoordLat(""); setCoordLng(""); setCoordKet("");
                                // On mobile, hide panels so map is fully visible for coordinate picking
                                if (isMobile) { setIsRightPanelOpen(false); setIsLeftPanelOpen(false); }
                            }}>
                            <Plus className="w-3 h-3" /> Tambah
                        </Button>
                    )}
                </div>
                <div className="space-y-2 pl-1">
                    {groupPoints.map((pt) => {
                        if (editingPointId === pt.id) {
                            return <div key={pt.id}>{renderCoordForm(pt, tipe, () => { setEditingPointId(null); setCoordLat(""); setCoordLng(""); setCoordKet(""); })}</div>;
                        }
                        return (
                            <div key={pt.id} className={cn("group flex flex-col gap-1.5 p-3 rounded-xl border transition-all", borderAccent, bgLight)}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className={cn("text-[9px] font-extrabold px-1.5 py-0.5 rounded-md", isStart ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400")}>#{pt.urutan}</span>
                                        <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300">{pt.latitude.toFixed(5)}, {pt.longitude.toFixed(5)}</span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md"
                                            onClick={() => { const geom = new Point(fromLonLat([pt.longitude, pt.latitude])); mapRef.current?.getView().fit(geom, { padding: getViewportPadding(), maxZoom: 16, duration: 1000 }); }} title="Zoom ke titik">
                                            <Eye className="h-3 w-3" />
                                        </Button>
                                        {canEdit && (
                                            <>
                                                <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-md"
                                                    onClick={() => {
                                                        setEditingPointId(pt.id!); setAddingTipe(null);
                                                        setCoordLat(String(pt.latitude)); setCoordLng(String(pt.longitude)); setCoordKet(pt.keterangan || "");
                                                        // On mobile, hide panels so map is fully visible
                                                        if (isMobile) { setIsRightPanelOpen(false); setIsLeftPanelOpen(false); }
                                                    }} title="Edit">
                                                    <Edit3 className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md"
                                                    onClick={() => handleDeleteCoordinateClick(pt.id!)} title="Hapus">
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {pt.keterangan && <span className="text-[10px] text-muted-foreground italic pl-0.5">"{pt.keterangan}"</span>}
                            </div>
                        );
                    })}
                    {addingTipe === tipe && renderCoordForm(null, tipe, () => { setAddingTipe(null); setCoordLat(""); setCoordLng(""); setCoordKet(""); })}
                    {groupPoints.length === 0 && addingTipe !== tipe && (
                        <div className={cn("text-center py-4 rounded-xl border border-dashed text-[10px] text-muted-foreground", isStart ? "border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/20" : "border-rose-200 dark:border-rose-800/50 bg-rose-50/20")}>
                            Belum ada koordinat {isStart ? "awal" : "akhir"}.
                            {canEdit && <span className={cn("block font-semibold mt-0.5", colorAccent)}>Klik "+ Tambah" untuk mulai.</span>}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (isLoadingForm) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-950 dark:to-indigo-950/10 flex flex-col items-center justify-center gap-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center">
                        <Map className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                        <Loader2 className="w-3 h-3 text-white animate-spin" />
                    </div>
                </div>
                <div className="text-center">
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Memuat Formulir</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Harap tunggu sebentar...</p>
                </div>
            </div>
        );
    }

    if (formError) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-rose-50/30 dark:from-slate-950 dark:to-rose-950/10 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="w-20 h-20 rounded-3xl bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto">
                        <AlertCircle className="w-9 h-9 text-rose-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">Formulir Tidak Tersedia</h1>
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{formError}</p>
                    </div>
                    <Button variant="outline" className="rounded-xl h-10 px-6" onClick={() => window.close()}>Tutup Halaman</Button>
                </div>
            </div>
        );
    }

    const renderLeftPanelBody = () => (
        <>
            {/* Panel Header */}
            <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/50">
                <div className="flex items-center gap-2.5">
                    {isFormViewOpen ? (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-700" onClick={() => setIsFormViewOpen(false)}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                    ) : (
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center">
                            <ClipboardList className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                    )}
                    <div>
                        <h2 className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-tight">
                            {isFormViewOpen ? (isEditMode ? "Edit Laporan" : "Buat Laporan Baru") : "Formulir Laporan"}
                        </h2>
                        {!isFormViewOpen && (
                            <p className="text-[10px] text-muted-foreground leading-tight">{myEntries.length} laporan tersimpan</p>
                        )}
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" onClick={() => setIsLeftPanelOpen(false)}>
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto">
                {isFormViewOpen ? (
                    <form onSubmit={handleSaveEntry} autoComplete="off" className="p-4 space-y-5">
                        <div className="space-y-1.5">
                            <Label htmlFor="namaKegiatan" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                Nama Kegiatan <span className="text-rose-500">*</span>
                            </Label>
                            <Input id="namaKegiatan" value={namaKegiatan} onChange={(e) => setNamaKegiatan(e.target.value)}
                                placeholder="Contoh: Pengerasan Jalan Lingkungan RT 02" required autoComplete="off"
                                className="h-9 text-xs bg-background border-slate-200 dark:border-slate-700 rounded-xl" />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <Building className="w-3 h-3" /> Wilayah <span className="text-rose-500">*</span>
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label htmlFor="kec" className="text-[10px] text-muted-foreground">Kecamatan</Label>
                                    <Popover open={kecOpen} onOpenChange={setKecOpen}>
                                        <PopoverTrigger asChild>
                                            <Button id="kec" variant="outline" role="combobox" aria-expanded={kecOpen}
                                                className="w-full h-9 text-[11px] justify-between bg-background border-slate-200 dark:border-slate-700 rounded-xl px-3 font-normal">
                                                <span className="truncate">{selectedKecId ? (kecamatanList.find(k => String(k.id) === selectedKecId)?.nama_kecamatan || "Pilih...") : "Pilih..."}</span>
                                                <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-40" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="p-0 w-[180px]" align="start">
                                            <Command>
                                                <CommandInput placeholder="Cari kecamatan..." className="h-8 text-[11px]" />
                                                <CommandList>
                                                    <CommandEmpty className="text-xs py-2 text-center text-muted-foreground">Tidak ditemukan.</CommandEmpty>
                                                    <CommandGroup>
                                                        {kecamatanList.map(k => (
                                                            <CommandItem key={k.id} value={k.nama_kecamatan} onSelect={() => { setSelectedKecId(String(k.id)); setSelectedDesaId(""); setKecOpen(false); }} className="text-xs cursor-pointer font-medium uppercase">
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
                                    <Label htmlFor="desa" className="text-[10px] text-muted-foreground">Desa</Label>
                                    <Popover open={desaOpen} onOpenChange={setDesaOpen}>
                                        <PopoverTrigger asChild>
                                            <Button id="desa" variant="outline" role="combobox" aria-expanded={desaOpen} disabled={!selectedKecId}
                                                className="w-full h-9 text-[11px] justify-between bg-background border-slate-200 dark:border-slate-700 rounded-xl px-3 font-normal">
                                                <span className="truncate">{selectedDesaId ? (desaList.find(d => String(d.id) === selectedDesaId)?.nama_desa || "Pilih...") : "Pilih..."}</span>
                                                <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-40" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="p-0 w-[180px]" align="start">
                                            <Command>
                                                <CommandInput placeholder="Cari desa..." className="h-8 text-[11px]" />
                                                <CommandList>
                                                    <CommandEmpty className="text-xs py-2 text-center text-muted-foreground">Tidak ditemukan.</CommandEmpty>
                                                    <CommandGroup>
                                                        {desaList.map(d => (
                                                            <CommandItem key={d.id} value={d.nama_desa} onSelect={() => { setSelectedDesaId(String(d.id)); setDesaOpen(false); }} className="text-xs cursor-pointer font-medium uppercase">
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

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Data Fisik & Anggaran</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label htmlFor="volume" className="text-[10px] text-muted-foreground">Volume</Label>
                                    <Input id="volume" value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="150 Meter" autoComplete="off" className="h-9 text-xs bg-background border-slate-200 dark:border-slate-700 rounded-xl" />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="anggaran" className="text-[10px] text-muted-foreground">Anggaran (Rp)</Label>
                                    <Input
                                        id="anggaran"
                                        type="text"
                                        value={anggaran}
                                        onChange={(e) => setAnggaran(formatRupiahInput(e.target.value))}
                                        placeholder="150.000.000"
                                        autoComplete="off"
                                        className="h-9 text-xs bg-background border-slate-200 dark:border-slate-700 rounded-xl font-mono font-semibold"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fungsi Infrastruktur (Dapat pilih lebih dari satu)</Label>
                            <div className="grid grid-cols-2 gap-2 bg-slate-50/70 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                {fungsiOptions.map((opt) => {
                                    const val = opt.label || opt.id;
                                    const isChecked = selectedFungsi.includes(val);
                                    return (
                                        <label key={opt.id} className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300 font-medium select-none p-1 rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedFungsi(prev => [...prev, val]);
                                                    } else {
                                                        setSelectedFungsi(prev => prev.filter(f => f !== val));
                                                    }
                                                }}
                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                                            />
                                            <span className="text-[11px] font-semibold">{val}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Jenis Konstruksi (Dapat pilih lebih dari satu)</Label>
                            <div className="grid grid-cols-2 gap-2 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                                {konstruksiOptions.map((opt) => {
                                    const val = opt.label || opt.id;
                                    const isChecked = selectedKonstruksi.includes(val);
                                    return (
                                        <label key={opt.id} className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300 font-medium select-none p-1 rounded-lg hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedKonstruksi(prev => [...prev, val]);
                                                    } else {
                                                        setSelectedKonstruksi(prev => prev.filter(k => k !== val));
                                                    }
                                                }}
                                                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                                            />
                                            <span className="text-[11px] font-semibold">{val}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="deskripsi" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Keterangan / Progress</Label>
                            <Textarea id="deskripsi" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} placeholder="Tulis rincian tambahan kegiatan..." autoComplete="off" className="text-xs min-h-[80px] bg-background border-slate-200 dark:border-slate-700 rounded-xl resize-none" />
                        </div>

                        <div className="sticky bottom-0 bg-white dark:bg-slate-950 py-4 -mx-4 px-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                            <Button type="button" variant="outline" className="flex-1 text-xs h-9 rounded-xl border-slate-200 dark:border-slate-700" onClick={() => setIsFormViewOpen(false)}>Batal</Button>
                            <Button type="submit" className="flex-1 text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-500/20 gap-1.5">
                                <Check className="w-3.5 h-3.5" />
                                {isEditMode ? "Perbarui" : "Simpan"}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="p-4 space-y-4">
                        {activeForm && (
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white p-4 shadow-lg shadow-indigo-500/25">
                                <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10" />
                                <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full bg-white/5" />
                                <div className="relative space-y-2">
                                    <div className="flex items-center gap-1.5 text-indigo-200 text-[10px] font-bold tracking-wider uppercase">
                                        <Calendar className="h-3 w-3" /> Tahun Anggaran {activeForm.tahun_anggaran}
                                    </div>
                                    <h3 className="font-extrabold text-sm leading-snug pr-8">{activeForm.judul}</h3>
                                    <p className="text-indigo-100/85 text-[11px] leading-relaxed line-clamp-2">
                                        {activeForm.deskripsi || "Silakan laporkan data realisasi pembangunan fisik di sini."}
                                    </p>
                                    <Button size="sm" className="w-full mt-2 bg-white hover:bg-indigo-50 text-indigo-700 font-bold text-xs h-9 rounded-xl shadow-sm border-0" onClick={handleOpenCreateEntry}>
                                        <Plus className="mr-1.5 h-3.5 w-3.5" /> Buat Laporan Baru
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Important Instruction for Village Users */}
                        <div className="p-3.5 rounded-2xl border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/70 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 space-y-1.5 shadow-xs mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                    <MapPin className="w-3 h-3" />
                                </div>
                                <h4 className="font-bold text-xs text-amber-900 dark:text-amber-200">Instruksi Penting Pengisian Spasial</h4>
                            </div>
                            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300 font-normal">
                                Setiap laporan <strong>WAJIB dilengkapi titik koordinat lokasi (geometri START & END) pada peta</strong>. Pilih laporan lalu klik <strong>"Kelola Koordinat"</strong> sebelum dikirim ke Bappeda.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between px-0.5">
                                <h4 className="font-bold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Laporan Saya</h4>
                                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/50">
                                    {myEntries.length}
                                </span>
                            </div>

                            {isLoadingEntries ? (
                                <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin text-indigo-500" /> Memuat laporan...
                                </div>
                            ) : myEntries.length === 0 ? (
                                <div className="text-center py-10 space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
                                    <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Belum ada laporan tersimpan</p>
                                    <p className="text-[10px] text-muted-foreground max-w-[200px] mx-auto">Klik tombol "Buat Laporan Baru" di atas untuk menambahkan laporan fisik.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {myEntries.map((entry) => {
                                        const isActive = activeEntry?.id === entry.id;
                                        const canManage = entry.status === "draft" || entry.status === "rejected";
                                        return (
                                            <div
                                                key={entry.id}
                                                className={cn(
                                                    "p-3 rounded-2xl border transition-all cursor-pointer text-xs space-y-2",
                                                    isActive
                                                        ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-sm"
                                                        : "border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                                                )}
                                                onClick={async () => {
                                                    setActiveEntry(entry);
                                                    if (entry.id_kecamatan) setSelectedKecId(String(entry.id_kecamatan));
                                                    if (entry.id_desa) setSelectedDesaId(String(entry.id_desa));
                                                    setIsRightPanelOpen(true);
                                                    try {
                                                        const res = await realisasiService.getTitikByEntryPublic(entry.id);
                                                        if (res.status === "success" && res.result) {
                                                            setCoordsList(res.result);
                                                        }
                                                    } catch {}
                                                }}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{entry.nama_kegiatan}</div>
                                                        <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                                            {entry.nama_desa ? `${entry.nama_desa}, Kec. ${entry.nama_kecamatan}` : "Lokasi belum diisi"}
                                                        </div>
                                                    </div>
                                                    <StatusBadge status={entry.status} />
                                                </div>

                                                {(entry.volume || entry.anggaran || (entry.fungsi_infrastruktur && entry.fungsi_infrastruktur.length > 0)) && (
                                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                        {entry.volume && (
                                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium text-slate-600 dark:text-slate-300">
                                                                {entry.volume}
                                                            </span>
                                                        )}
                                                        {entry.anggaran && (
                                                            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 px-2 py-0.5 rounded-md font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
                                                                Rp {Number(entry.anggaran).toLocaleString("id-ID")}
                                                            </span>
                                                        )}
                                                        {entry.fungsi_infrastruktur && entry.fungsi_infrastruktur.map((f, i) => (
                                                            <span key={i} className="text-[9px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-medium border border-indigo-100 dark:border-indigo-900/40">
                                                                {f}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {isActive && (
                                                    <div className="flex flex-col gap-2 pt-2.5 border-t border-dashed border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                                                        <div className="flex items-center gap-1.5 w-full">
                                                            {canManage ? (
                                                                <>
                                                                    <Button
                                                                        size="sm"
                                                                        className="flex-1 h-7 text-[10px] rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm gap-1"
                                                                        onClick={() => setIsRightPanelOpen(true)}
                                                                    >
                                                                        <MapPin className="w-3 h-3" /> Kelola Koordinat
                                                                    </Button>
                                                                    <Button variant="outline" size="sm" className="h-7 text-[10px] rounded-lg border-slate-200 dark:border-slate-700 font-medium gap-1" onClick={() => handleOpenEditEntry(entry)}>
                                                                        <Edit3 className="w-3 h-3" /> Edit Form
                                                                    </Button>
                                                                    <Button variant="outline" size="sm" className="h-7 w-7 text-[10px] rounded-lg border-rose-200 dark:border-rose-800/60 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 p-0" onClick={() => handleDeleteEntryClick(entry.id)}>
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    className="flex-1 h-7 text-[10px] rounded-lg bg-slate-600 hover:bg-slate-700 text-white font-bold shadow-sm gap-1"
                                                                    onClick={() => setIsRightPanelOpen(true)}
                                                                >
                                                                    <FileText className="w-3 h-3" /> Lihat Detail & Koordinat
                                                                </Button>
                                                            )}
                                                        </div>

                                                        {canManage && (
                                                            <Button
                                                                size="sm"
                                                                className="w-full h-7 text-[10px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm gap-1"
                                                                onClick={() => handleSubmitEntryClick(entry.id)}
                                                            >
                                                                <Send className="w-2.5 h-2.5" /> Kirim Laporan ke Bappeda
                                                            </Button>
                                                        )}

                                                        {!canManage && (
                                                            <p className="text-[10px] text-muted-foreground italic text-center mt-1">
                                                                {entry.status === "submitted" ? "Menunggu peninjauan Bappeda..." : "Laporan telah diproses."}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="p-3 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/10 flex items-start gap-2.5 text-[10px] text-blue-700 dark:text-blue-400">
                            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span className="leading-relaxed">Data laporan tersimpan di browser Anda. Gunakan browser yang sama untuk mengakses kembali laporan ini.</span>
                        </div>
                    </div>
                )}
            </div>
        </>
    );

    const renderRightPanelBody = () => {
        if (!activeEntry) return null;
        return (
            <>
                <div className="shrink-0 p-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-900/50">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center shrink-0 mt-0.5">
                                <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-tight">
                                    {(activeEntry.status === 'draft' || activeEntry.status === 'rejected') ? "Kelola Koordinat" : "Detail Laporan"}
                                </h2>
                                <p className="text-[10px] text-muted-foreground mt-0.5 truncate" title={activeEntry.nama_kegiatan}>{activeEntry.nama_kegiatan}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg shrink-0" onClick={handleCloseRightPanel}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                        <StatusBadge status={activeEntry.status} />
                        <span className="text-[10px] text-muted-foreground">{activeEntry.nama_desa || "-"}, Kec. {activeEntry.nama_kecamatan || "-"}</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                    {activeEntry.catatan_admin && (
                        <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/15 text-[11px]">
                            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-amber-800 dark:text-amber-300 mb-0.5">Catatan Bappeda</p>
                                <p className="text-amber-700 dark:text-amber-400 italic leading-relaxed">{activeEntry.catatan_admin}</p>
                            </div>
                        </div>
                    )}

                    {(activeEntry.volume || activeEntry.anggaran || activeEntry.deskripsi) && (
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
                                            <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/60">
                                                {f}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {activeEntry.opsi_konstruksi && activeEntry.opsi_konstruksi.length > 0 && (
                                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1">
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Jenis Konstruksi</p>
                                    <div className="flex flex-wrap gap-1">
                                        {activeEntry.opsi_konstruksi.map((k, i) => (
                                            <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/60">
                                                {k}
                                            </span>
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

                    {/* Instruction Box for Adding Geometry Points */}
                    <div className="p-3.5 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/50 bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 space-y-2 shadow-xs mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                <Crosshair className="w-3.5 h-3.5" />
                            </div>
                            <h4 className="font-bold text-xs">Petunjuk Penambahan Titik Geometri</h4>
                        </div>
                        <ol className="text-[11px] leading-relaxed text-indigo-800 dark:text-indigo-300 list-decimal list-inside space-y-1 font-normal">
                            <li>Klik tombol <strong>"+ Tambah"</strong> pada Titik Awal (START) atau Titik Akhir (END) di bawah ini.</li>
                            <li>Ketuk/klik lokasi pembangunan fisik secara langsung pada <strong>peta interaktif</strong>.</li>
                            <li>Simpan titik koordinat sebelum menekan tombol <strong>Kirim Laporan ke Bappeda</strong>.</li>
                        </ol>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 px-0.5 mb-3">
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
                </div>

                {(activeEntry.status === 'draft' || activeEntry.status === 'rejected') && (
                    <div className="shrink-0 p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40">
                        <Button className="w-full text-xs h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-500/25 gap-2" onClick={() => handleSubmitEntryClick(activeEntry.id)}>
                            <Send className="w-3.5 h-3.5" /> Kirim Laporan ke Bappeda
                        </Button>
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 flex flex-col font-sans">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl px-4 md:px-6 py-2.5 flex items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
                        <Building2 className="w-4 h-4 text-white" />
                    </div>
                    <div className="max-w-[180px] sm:max-w-[400px] md:max-w-[600px] lg:max-w-[800px]">
                        <div className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-tight tracking-tight truncate">
                            {activeForm?.judul || "MELAROSA Bojonegoro"}
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight truncate">
                            {activeForm?.deskripsi || "Sistem Informasi Infrastruktur"}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {activeForm && (
                        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground border border-slate-200 dark:border-slate-800 rounded-full px-2.5 py-1 bg-slate-50 dark:bg-slate-900">
                            <Calendar className="w-3 h-3" />
                            <span>TA {activeForm.tahun_anggaran}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[10px] text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 rounded-full px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/30 font-semibold">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        Akses Publik
                    </div>
                    <ModeToggle />
                </div>
            </header>

            {/* Main */}
            <main className="flex-1 w-full relative overflow-hidden flex min-h-0">
                <div ref={mapElementRef} className="absolute inset-0 w-full h-full z-0" />

                {/* Mobile: tap-outside backdrop to close panels */}
                {isMobile && (isLeftPanelOpen || isRightPanelOpen) && !(editingPointId || addingTipe) && (
                    <div
                        className="absolute inset-0 z-[25] bg-black/40"
                        onClick={() => { setIsLeftPanelOpen(false); setIsRightPanelOpen(false); }}
                    />
                )}

                {/* LEFT PANEL */}
                {isMobile ? (
                    <Sheet open={isLeftPanelOpen} onOpenChange={setIsLeftPanelOpen}>
                        <SheetContent side="bottom" hideOverlay={false} showCloseButton={false} className="h-[60vh] sm:h-[88vh] p-0 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden z-[50]">
                            <SheetHeader className="sr-only">
                                <SheetTitle>Formulir Laporan</SheetTitle>
                            </SheetHeader>
                            {renderLeftPanelBody()}
                        </SheetContent>
                    </Sheet>
                ) : (
                    <div className={cn(
                        "absolute top-0 bottom-0 left-0 w-full sm:w-96 max-w-full bg-white/97 dark:bg-slate-950/97 backdrop-blur-xl shadow-2xl border-r border-slate-200/80 dark:border-slate-800/80 transition-all duration-300 ease-in-out z-30 flex flex-col overflow-hidden",
                        isLeftPanelOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
                    )}>
                        {renderLeftPanelBody()}
                    </div>
                )}

                {/* RIGHT PANEL */}
                {isMobile ? (
                    activeEntry && (
                        <Sheet open={isRightPanelOpen} onOpenChange={setIsRightPanelOpen}>
                            <SheetContent side="bottom" hideOverlay={false} showCloseButton={false} className="h-[60vh] sm:h-[88vh] p-0 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden z-[50]">
                                <SheetHeader className="sr-only">
                                    <SheetTitle>Detail Laporan & Koordinat</SheetTitle>
                                </SheetHeader>
                                {renderRightPanelBody()}
                            </SheetContent>
                        </Sheet>
                    )
                ) : (
                    <div className={cn(
                        "absolute top-0 bottom-0 right-0 w-full sm:w-96 max-w-full bg-white/97 dark:bg-slate-950/97 backdrop-blur-xl shadow-2xl border-l border-slate-200/80 dark:border-slate-800/80 transition-all duration-300 ease-in-out z-30 flex flex-col overflow-hidden",
                        activeEntry && isRightPanelOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
                    )}>
                        {renderRightPanelBody()}
                    </div>
                )}

            {/* Left Panel Toggle */}
            {!isLeftPanelOpen && (
                <Button onClick={() => setIsLeftPanelOpen(true)} className="absolute top-4 left-4 z-20 shadow-xl gap-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs rounded-xl h-9 px-3">
                    <ClipboardList className="w-3.5 h-3.5 text-indigo-600" />
                    Laporan Saya
                    {myEntries.length > 0 && (
                        <span className="bg-indigo-600 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{myEntries.length}</span>
                    )}
                </Button>
            )}

                {/* Map Controls */}
                <MapControls
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                    onResetBearing={handleResetBearing}
                    className={cn(
                        "absolute transition-all duration-300 z-20 shadow-2xl",
                        "top-16 right-4 md:top-auto md:bottom-6 md:right-auto",
                        isLeftPanelOpen ? "md:left-[400px]" : "md:left-6"
                    )}
                />

                {/* Basemap Switcher */}
                <BasemapToggle
                    activeBasemap={activeBasemap}
                    onBasemapChange={setActiveBasemap}
                    className={cn(
                        "absolute transition-[bottom,right] duration-300 z-20",
                        isMobile && activeEntry && (editingPointId || addingTipe)
                            ? "bottom-44 right-4"
                            : "bottom-4 right-4 md:bottom-6 md:right-4"
                    )}
                />

                {/* Desktop: Floating Draw Helper Pill */}
                {!isMobile && activeEntry && (editingPointId || addingTipe) && (
                    <div className="absolute bottom-6 z-10 flex justify-center items-center pointer-events-none"
                        style={{ left: isLeftPanelOpen ? '25rem' : '0px', right: isRightPanelOpen ? '25rem' : '0px' }}>
                        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-amber-200 dark:border-amber-800/60 rounded-2xl shadow-xl shadow-amber-500/10 pointer-events-auto">
                            <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0 animate-pulse">
                                <Crosshair className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">Mode Klik Peta Aktif</p>
                                <p className="text-[10px] text-muted-foreground leading-tight">
                                    Klik di mana saja pada peta untuk mengambil koordinat {editingPointId ? 'titik' : (addingTipe === 'start' ? 'START' : 'END')}.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Mobile: Sticky Bottom Sheet for coordinate picking */}
                {isMobile && activeEntry && (editingPointId || addingTipe) && (
                    <div className="absolute bottom-0 left-0 right-0 z-40 pointer-events-auto">
                        {/* Map tap hint banner */}
                        <div className="flex justify-center mb-2">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/90 backdrop-blur-sm rounded-full shadow-lg">
                                <Crosshair className="w-3 h-3 text-white animate-pulse" />
                                <span className="text-[10px] font-bold text-white">
                                    Ketuk peta untuk ambil koordinat {addingTipe === 'start' ? 'START' : addingTipe === 'end' ? 'END' : 'titik'}
                                </span>
                            </div>
                        </div>

                        {/* Bottom Sheet */}
                        <div className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl shadow-2xl p-4 pb-safe space-y-3">
                            {/* Handle */}
                            <div className="flex justify-center -mt-1 mb-1">
                                <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                            </div>

                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold",
                                        (addingTipe === 'start' || (editingPointId && coordsList.find(p => p.id === editingPointId)?.tipe === 'start')) ? "bg-emerald-500" : "bg-rose-500"
                                    )}>
                                        {(addingTipe === 'start' || (editingPointId && coordsList.find(p => p.id === editingPointId)?.tipe === 'start')) ? 'S' : 'E'}
                                    </div>
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                        {editingPointId ? 'Edit Koordinat' : 'Tambah Titik Baru'}
                                    </span>
                                </div>
                                <button
                                    className="text-[10px] text-muted-foreground font-semibold px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                    onClick={() => {
                                        setEditingPointId(null); setAddingTipe(null);
                                        setCoordLat(""); setCoordLng(""); setCoordKet("");
                                        // Restore right panel
                                        if (activeEntry) setIsRightPanelOpen(true);
                                    }}
                                >
                                    Batal
                                </button>
                            </div>

                            {/* Coordinate display — updates live when map is tapped */}
                            {coordLat && coordLng ? (
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Latitude</p>
                                        <p className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{coordLat}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Longitude</p>
                                        <p className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{coordLng}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/10">
                                    <LocateFixed className="w-4 h-4 text-amber-500" />
                                    <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Ketuk lokasi pada peta di atas</span>
                                </div>
                            )}

                            {/* Keterangan field */}
                            <Input
                                value={coordKet}
                                onChange={(e) => setCoordKet(e.target.value)}
                                placeholder="Keterangan (opsional): dekat tiang listrik..."
                                autoComplete="off"
                                className="h-9 text-xs bg-background border-slate-200 dark:border-slate-700 rounded-xl"
                            />

                            {/* Save button */}
                            <Button
                                className={cn(
                                    "w-full h-11 text-sm font-bold text-white rounded-2xl shadow-md gap-2",
                                    (addingTipe === 'start' || (editingPointId && coordsList.find(p => p.id === editingPointId)?.tipe === 'start'))
                                        ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25"
                                        : "bg-rose-600 hover:bg-rose-700 shadow-rose-500/25"
                                )}
                                disabled={!coordLat || !coordLng}
                                onClick={handleSaveCoordinate}
                            >
                                <Check className="w-4 h-4" />
                                Simpan Koordinat
                            </Button>
                        </div>
                    </div>
                )}

                {/* Alert Dialog */}
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
                                {confirmDialogType === 'delete_entry' && "Hapus Laporan Realisasi"}
                                {confirmDialogType === 'delete_coord' && "Hapus Titik Koordinat"}
                                {confirmDialogType === 'submit_entry' && "Kirim Laporan Realisasi"}
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-xs leading-relaxed text-center text-slate-500 dark:text-slate-400">
                                {confirmDialogType === 'delete_entry' && "Apakah Anda yakin ingin menghapus laporan ini? Tindakan ini tidak dapat dibatalkan dan seluruh koordinat terkait akan dihapus."}
                                {confirmDialogType === 'delete_coord' && "Apakah Anda yakin ingin menghapus titik koordinat ini? Tindakan ini tidak dapat dibatalkan."}
                                {confirmDialogType === 'submit_entry' && "Apakah Anda yakin ingin mengirim laporan ini? Setelah dikirim, data tidak dapat diubah lagi dan akan ditinjau oleh pihak Bappeda Bojonegoro."}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2 mt-2">
                            <AlertDialogCancel className="text-xs h-9 rounded-xl border-slate-200 dark:border-slate-700 flex-1">Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmAction} className={cn(
                                "text-xs h-9 rounded-xl text-white font-bold flex-1",
                                (confirmDialogType === 'delete_entry' || confirmDialogType === 'delete_coord')
                                    ? "bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-500/25"
                                    : "bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-500/25"
                            )}>
                                {(confirmDialogType === 'delete_entry' || confirmDialogType === 'delete_coord') ? "Ya, Hapus" : "Ya, Kirim"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </main>
        </div>
    );
}
