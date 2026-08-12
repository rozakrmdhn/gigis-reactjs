import { lazy, Suspense, useCallback, useEffect, useState, useRef } from "react";
import type { MetaFunction } from "react-router";
import { useParams, useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { 
    ArrowLeft, 
    MapPin, 
    Calendar, 
    ClipboardList, 
    Info, 
    ChevronLeft, 
    ChevronRight, 
    X, 
    FileText,
    Pencil,
    Layers,
    Sparkles,
    ClipboardCheck,
    CheckCircle2
} from "lucide-react";
import { usulanDesaService } from "~/features/usulan-desa/services/usulan-desa.service";
import { usulanDesaGeometryService } from "~/features/usulan-desa/services/usulan-desa-geometry.service";
import { masterOpdService } from "~/features/usulan-desa/services/master-opd.service";
import { verifikasiService } from "~/features/usulan-desa/services/verifikasi.service";
import { kecamatanService } from "~/services/kecamatan";
import { desaService } from "~/services/desa";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { Input } from "~/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import type { UsulanDesa, UsulanDesaGeometry, UsulanKategori, VerifikasiAssignment, VerifikasiStatus } from "~/features/usulan-desa/types/usulan-desa.types";
import { GeometryList } from "~/features/usulan-desa/components/GeometryList";
import { StatusBadge } from "~/features/usulan-desa/components/StatusBadge";
import type { GeometryMapRef } from "~/features/usulan-desa/components/GeometryMap";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { MapControls } from "~/features/monitoring/components/MapControls";
import { basemapService, type Basemap } from "~/features/master/services/basemap.service";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";

const parseNomorSurat = (nomorSurat: any): string[] => {
    if (!nomorSurat) return [];
    if (Array.isArray(nomorSurat)) {
        return nomorSurat;
    }
    if (typeof nomorSurat === "string") {
        const trimmed = nomorSurat.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            } catch (e) {
                // Ignore parsing error
            }
        }
        return [trimmed];
    }
    return [String(nomorSurat)];
};

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
        { title: "Detail Spasial Usulan - MELAROSA" },
        { name: "description", content: "Detail spasial usulan desa beserta peta geometry." },
    ];
};

export default function UsulanDesaDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    // Map ref for zoom focal actions
    const mapRef = useRef<GeometryMapRef>(null);

    // States
    const [usulan, setUsulan] = useState<UsulanDesa | null>(null);
    const [geometries, setGeometries] = useState<UsulanDesaGeometry[]>([]);
    const [kecamatanName, setKecamatanName] = useState("-");
    const [desaName, setDesaName] = useState("-");
    
    const [isLoadingUsulan, setIsLoadingUsulan] = useState(true);
    const [isLoadingGeoms, setIsLoadingGeoms] = useState(true);

    // Panel states (Detail Panel Left & Geometry Panel Right)
    const [isDetailOpen, setIsDetailOpen] = useState(true);
    const [isGeometryListOpen, setIsGeometryListOpen] = useState(false);

    // Layer Panel states
    const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(false);
    const [activeBasemap, setActiveBasemap] = useState<string>("osm");
    const [basemaps, setBasemaps] = useState<Basemap[]>([]);
    const [showDesaBoundaries, setShowDesaBoundaries] = useState(false);

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

    const selectedBasemap = basemaps.find(b => b.id === activeBasemap);
    const basemapUrl = selectedBasemap ? selectedBasemap.url : "osm";

    // Verifikasi & Disposisi States
    const [opds, setOpds] = useState<any[]>([]);
    const [selectedJunction, setSelectedJunction] = useState<UsulanDesa | null>(null);
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [selectedOpdIds, setSelectedOpdIds] = useState<string[]>([]);
    const [isSavingAssign, setIsSavingAssign] = useState(false);

    const [selectedAssignment, setSelectedAssignment] = useState<VerifikasiAssignment | null>(null);
    const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
    const [verifyStatus, setVerifyStatus] = useState<VerifikasiStatus>('pending');
    const [verifyVolume, setVerifyVolume] = useState('');
    const [verifyAnggaran, setVerifyAnggaran] = useState<number | ''>('');
    const [verifyCatatan, setVerifyCatatan] = useState('');
    const [isSavingVerify, setIsSavingVerify] = useState(false);

    // Pengecekan Bappeda states (pending -> verifikasi_bappeda)
    const [isCekBappedaDialogOpen, setIsCekBappedaDialogOpen] = useState(false);
    const [catatanBappedaInput, setCatatanBappedaInput] = useState('');
    const [isSavingCekBappeda, setIsSavingCekBappeda] = useState(false);

    // Load active OPDs list
    useEffect(() => {
        masterOpdService.getAll({ active_only: true })
            .then(setOpds)
            .catch(err => console.error("Gagal memuat OPD:", err));
    }, []);

    // Set selectedOpdIds when selectedJunction changes
    useEffect(() => {
        if (selectedJunction) {
            const currentOpdIds = (selectedJunction.assignments || []).map(a => a.opd_id);
            setSelectedOpdIds(currentOpdIds);
        } else {
            setSelectedOpdIds([]);
        }
    }, [selectedJunction]);

    // Set verify fields when selectedAssignment changes
    useEffect(() => {
        if (selectedAssignment) {
            setVerifyStatus(selectedAssignment.status_terakhir);
            setVerifyVolume(selectedAssignment.volume_verifikasi || '');
            setVerifyAnggaran(selectedAssignment.anggaran_verifikasi !== undefined && selectedAssignment.anggaran_verifikasi !== null ? selectedAssignment.anggaran_verifikasi : '');
            setVerifyCatatan('');
        }
    }, [selectedAssignment]);

    // Fetch Usulan induk
    const fetchUsulanData = useCallback(async () => {
        if (!id) return;
        setIsLoadingUsulan(true);
        try {
            const data = await usulanDesaService.getById(id);
            if (data) {
                setUsulan(data);
                
                // Fetch kecamatan & desa names
                try {
                    const [kecamatans, desas] = await Promise.all([
                        kecamatanService.getKecamatan(),
                        desaService.getDesa(data.id_kecamatan)
                    ]);
                    
                    const kec = kecamatans.find(k => Number(k.id) === Number(data.id_kecamatan));
                    if (kec) setKecamatanName(kec.nama_kecamatan);
                    
                    const des = desas.find(d => Number(d.id) === Number(data.id_desa));
                    if (des) setDesaName(des.nama_desa);
                } catch (err) {
                    console.error("Gagal memuat detail nama kecamatan/desa:", err);
                }
            } else {
                toast.error("Usulan tidak ditemukan.");
                navigate("/admin/usulan-desa/daftar-usulan");
            }
        } catch (error) {
            console.error("Gagal memuat usulan:", error);
            toast.error("Gagal mengambil data usulan.");
        } finally {
            setIsLoadingUsulan(false);
        }
    }, [id, navigate]);

    // Fetch Geometries
    const fetchGeometriesData = useCallback(async () => {
        if (!id) return;
        setIsLoadingGeoms(true);
        try {
            const geoms = await usulanDesaGeometryService.getByUsulanId(id);
            setGeometries(geoms);
        } catch (error) {
            console.error("Gagal memuat geometry:", error);
            toast.error("Gagal mengambil data spasial.");
        } finally {
            setIsLoadingGeoms(false);
        }
    }, [id]);

    useEffect(() => {
        fetchUsulanData();
        fetchGeometriesData();
    }, [fetchUsulanData, fetchGeometriesData]);

    const handleFocusGeometry = (item: UsulanDesaGeometry) => {
        if (mapRef.current) {
            mapRef.current.zoomToGeometry(item);
        }
    };

    const handleSaveAssign = async () => {
        if (!selectedJunction) return;
        setIsSavingAssign(true);
        try {
            await verifikasiService.assignOpd({
                usulan_id: String(selectedJunction.id),
                opd_ids: selectedOpdIds
            });
            toast.success("Berhasil melakukan disposisi OPD pemverifikasi");
            setIsAssignDialogOpen(false);
            fetchUsulanData();
        } catch (err: any) {
            toast.error(err.message || "Gagal melakukan disposisi");
        } finally {
            setIsSavingAssign(false);
        }
    };

    const handleSaveVerify = async () => {
        if (!selectedAssignment) return;
        setIsSavingVerify(true);
        try {
            await verifikasiService.submitVerifikasi({
                assignment_id: selectedAssignment.id,
                status: verifyStatus,
                catatan: verifyCatatan,
                volume_verifikasi: verifyVolume || undefined,
                anggaran_verifikasi: verifyAnggaran !== '' ? Number(verifyAnggaran) : undefined
            });
            toast.success("Berhasil menyimpan keputusan verifikasi");
            setIsVerifyDialogOpen(false);
            fetchUsulanData();
        } catch (err: any) {
            toast.error(err.message || "Gagal memproses verifikasi");
        } finally {
            setIsSavingVerify(false);
        }
    };

    const handleProcessCekBappeda = async (targetStatus: 'verifikasi_bappeda' | 'ditolak') => {
        if (!usulan) return;
        setIsSavingCekBappeda(true);
        try {
            await usulanDesaService.patch(usulan.id, {
                status: targetStatus,
                catatan_bappeda: catatanBappedaInput || undefined,
            });
            toast.success(
                targetStatus === 'verifikasi_bappeda'
                    ? "Usulan berhasil diproses ke Verifikasi Bappeda!"
                    : "Usulan berhasil ditolak oleh Bappeda."
            );
            setIsCekBappedaDialogOpen(false);
            fetchUsulanData();
        } catch (err: any) {
            toast.error(err.message || "Gagal memproses usulan");
        } finally {
            setIsSavingCekBappeda(false);
        }
    };

    if (isLoadingUsulan) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50/50 dark:bg-slate-950/20">
                <div className="text-center space-y-3">
                    <Spinner className="h-10 w-10 text-blue-600" />
                    <p className="text-slate-500 font-medium">Memuat data usulan...</p>
                </div>
            </div>
        );
    }

    if (!usulan) return null;

    return (
        <div className="relative flex-1 min-h-0 w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
            {/* Widescreen Interactive Map */}
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
                        isLeftPanelOpen={isDetailOpen}
                        isRightPanelOpen={isGeometryListOpen}
                        drawMode={null}
                        onDrawComplete={() => {}}
                        showDesaBoundaries={showDesaBoundaries}
                        idKecamatanForDesa={usulan.id_kecamatan ? Number(usulan.id_kecamatan) : null}
                        basemapUrl={basemapUrl}
                        className="w-full h-full border-none rounded-none"
                    />
                </Suspense>
            </div>

            {/* Left Trigger Button (if panel is closed) */}
            {!isDetailOpen && (
                <Button
                    onClick={() => setIsDetailOpen(true)}
                    className="absolute top-4 left-4 z-20 shadow-xl gap-2 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-bold text-xs rounded-xl"
                >
                    <ClipboardList size={15} />
                    Rincian Usulan
                    <ChevronRight size={15} className="text-slate-400" />
                </Button>
            )}

            {/* Right Trigger Button (if panel is closed) */}
            {!isGeometryListOpen && (
                <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    onClick={() => setIsGeometryListOpen(true)}
                                    className="h-10 w-10 md:h-9 md:w-9 rounded-xl border border-border bg-background/90 backdrop-blur-sm shadow-md hover:bg-muted text-foreground"
                                >
                                    <MapPin className="h-4 w-4 text-blue-500" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Daftar Geometry ({geometries.length})</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            )}

            {/* Map Controls (Zoom In, Zoom Out, Compass) */}
            <MapControls
                onZoomIn={() => mapRef.current?.zoomIn()}
                onZoomOut={() => mapRef.current?.zoomOut()}
                onResetBearing={() => mapRef.current?.resetRotation()}
                className={cn(
                    "absolute bottom-6 transition-all duration-300 z-20 shadow-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border dark:border-slate-800 rounded-xl p-1",
                    isDetailOpen ? "left-[400px]" : "left-6"
                )}
            />

            {/* Floating LayerPanel Trigger & Card */}
            <div className={cn(
                "absolute bottom-6 transition-all duration-300 z-20",
                isGeometryListOpen ? "right-[440px]" : "right-6"
            )}>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                onClick={() => setIsLayerPanelOpen(!isLayerPanelOpen)}
                                className={cn(
                                    "h-10 w-10 md:h-9 md:w-9 rounded-xl border border-border bg-background/90 backdrop-blur-sm shadow-md hover:bg-muted text-foreground transition-all duration-300",
                                    isLayerPanelOpen
                                        ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white"
                                        : ""
                                )}
                            >
                                <Layers className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p className="text-xs font-semibold">Pengaturan Layer & Basemap</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {isLayerPanelOpen && (
                    <div className="absolute bottom-16 right-0 w-80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-5 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
                            <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <Layers className="h-4 w-4 text-blue-500" />
                                Pengaturan Peta
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsLayerPanelOpen(false)}
                                className="h-6 w-6 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-md"
                            >
                                <X size={14} />
                            </Button>
                        </div>

                        {/* Layer Toggles */}
                        <div className="space-y-3">
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider block">Layer Wilayah</span>
                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border dark:border-slate-800">
                                <div className="space-y-0.5">
                                    <Label htmlFor="detail-layer-desa" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                                        Batas Wilayah Desa
                                    </Label>
                                    <p className="text-[9px] text-slate-500">Batas desa di kecamatan usulan ini</p>
                                </div>
                                <Switch
                                    id="detail-layer-desa"
                                    checked={showDesaBoundaries}
                                    onCheckedChange={setShowDesaBoundaries}
                                />
                            </div>
                        </div>

                        {/* Basemap Selector */}
                        <div className="space-y-3">
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider block">Pilihan Basemap</span>
                            <div className="grid grid-cols-3 gap-2">
                                {basemaps.map((b) => (
                                    <button
                                        key={b.id}
                                        onClick={() => setActiveBasemap(b.id)}
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
                    </div>
                )}
            </div>

            {/* Left Panel: Rincian Usulan */}
            <div className={cn(
                "absolute top-0 bottom-0 left-0 w-full sm:w-96 max-w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-2xl border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-30 flex flex-col overflow-hidden",
                isDetailOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none"
            )}>
                {/* Header */}
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
                        <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Rincian Usulan</h3>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setIsDetailOpen(false)} 
                            className="h-8 w-8 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
                        >
                            <X size={16} />
                        </Button>
                    </div>
                </div>

                {/* Details Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="space-y-3.5 bg-slate-50/50 dark:bg-slate-900/30 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-0.5">Nomor Agenda</span>
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{usulan.nomor_agenda}</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-0.5">Status Usulan</span>
                            <div className="mt-1 flex items-center justify-between gap-2">
                                <StatusBadge status={usulan.status} />
                                {usulan.status === 'pending' && (
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setCatatanBappedaInput(usulan.catatan_bappeda || '');
                                            setIsCekBappedaDialogOpen(true);
                                        }}
                                        className="h-7 text-[11px] bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-2.5 rounded-lg flex items-center gap-1 shadow-xs"
                                    >
                                        <ClipboardCheck className="h-3.5 w-3.5" />
                                        Cek Bappeda
                                    </Button>
                                )}
                            </div>
                            {usulan.status === 'pending' && (
                                <div className="mt-2 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 text-[11px] space-y-1.5">
                                    <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                                        <ClipboardCheck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                        Penelaahan Usulan Bappeda
                                    </div>
                                    <p className="text-amber-700 dark:text-amber-400 text-[10px] leading-relaxed">
                                        Periksa spasial & dokumen usulan desa ini, lalu klik <strong className="underline cursor-pointer" onClick={() => { setCatatanBappedaInput(usulan.catatan_bappeda || ''); setIsCekBappedaDialogOpen(true); }}>Cek Bappeda</strong> untuk memproses ke Verifikasi Bappeda.
                                    </p>
                                </div>
                            )}
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-0.5">Nomor Surat</span>
                            {(() => {
                                const list = parseNomorSurat(usulan.nomor_surat);
                                if (list.length === 0) {
                                    return <span className="text-sm text-slate-500 font-semibold block">-</span>;
                                }
                                return (
                                    <div className="flex flex-col gap-1 mt-1">
                                        {list.map((num, idx) => (
                                            <div key={idx} className="bg-slate-100/80 dark:bg-slate-800/80 px-2 py-0.5 rounded text-[11px] font-medium break-all border border-slate-200/50 dark:border-slate-700/50 w-fit">
                                                {num}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-0.5">Tanggal Surat</span>
                            <span className="text-sm text-slate-700 dark:text-slate-355 font-medium flex items-center gap-1.5 mt-0.5">
                                <Calendar size={14} className="text-slate-400" />
                                {new Date(usulan.tanggal_surat).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-0.5">Kecamatan</span>
                            <span className="text-sm text-slate-700 dark:text-slate-355 font-semibold block mt-0.5">
                                {kecamatanName}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-0.5">Desa</span>
                            <span className="text-sm text-slate-700 dark:text-slate-355 font-semibold block mt-0.5">
                                {desaName}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-0.5">Tahun Anggaran</span>
                            <span className="text-sm text-slate-750 dark:text-slate-355 font-medium block mt-0.5">
                                {usulan.tahun_anggaran}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-0.5">Alamat Usulan</span>
                            <span className="text-sm text-slate-700 dark:text-slate-355 font-medium flex items-start gap-1.5 mt-0.5">
                                <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                <span className="leading-relaxed">{usulan.alamat_usulan || "-"}</span>
                            </span>
                        </div>
                        {/* Kategori Pembangunan & Disposisi / Verifikasi OPD */}
                        {usulan.kategori ? (
                            <div className="space-y-3 pt-3 border-t dark:border-slate-800">
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">Kategori Pembangunan</span>
                                <div className="space-y-2">
                                    <div className="bg-white dark:bg-slate-900/40 p-3 rounded-lg border border-slate-200/50 dark:border-slate-800/80 space-y-2 shadow-xs">
                                        <div className="space-y-0.5">
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{usulan.kategori.nama}</span>
                                            <div className="flex flex-wrap gap-x-2 text-[10px] font-semibold text-slate-500">
                                                {usulan.volume && <span>Vol: {usulan.volume}</span>}
                                                {usulan.volume && usulan.anggaran_usulan && <span>•</span>}
                                                {usulan.anggaran_usulan && (
                                                    <span className="text-emerald-600 dark:text-emerald-400">
                                                        {new Intl.NumberFormat("id-ID", {
                                                            style: "currency",
                                                            currency: "IDR",
                                                            minimumFractionDigits: 0,
                                                        }).format(usulan.anggaran_usulan)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* OPD assignments section */}
                                        <div className="pt-2 border-t dark:border-slate-800/60 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-550 tracking-wider">Verifikator OPD</span>
                                            </div>
                                            {usulan.assignments && usulan.assignments.length > 0 ? (
                                                <div className="space-y-1.5">
                                                    {usulan.assignments.map((assign) => (
                                                        <div key={assign.id} className="flex items-start justify-between text-[10px] bg-slate-50 dark:bg-slate-900/60 p-2 rounded border dark:border-slate-800/80 gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <span className="font-bold text-slate-800 dark:text-slate-200 block truncate" title={assign.opd?.nama}>{assign.opd?.nama || assign.opd_id}</span>
                                                                {(assign.volume_verifikasi || assign.anggaran_verifikasi || assign.nomor_dokumen_verifikasi || assign.tanggal_dokumen_verifikasi || assign.url_dokumen_verifikasi) && (
                                                                     <div className="mt-1 space-y-0.5 text-[9px] text-slate-500 border-t pt-1 border-slate-250/50 dark:border-slate-800/50">
                                                                         {assign.volume_verifikasi && <div>Vol. Verif: <span className="font-semibold text-slate-700 dark:text-slate-300">{assign.volume_verifikasi}</span></div>}
                                                                         {assign.anggaran_verifikasi && (
                                                                             <div>Angg. Verif: <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                                                                                 {new Intl.NumberFormat("id-ID", {
                                                                                     style: "currency",
                                                                                     currency: "IDR",
                                                                                     minimumFractionDigits: 0,
                                                                                 }).format(assign.anggaran_verifikasi)}
                                                                             </span></div>
                                                                         )}
                                                                         {assign.nomor_dokumen_verifikasi && <div>No. Dok: <span className="font-semibold text-slate-700 dark:text-slate-300">{assign.nomor_dokumen_verifikasi}</span></div>}
                                                                         {assign.tanggal_dokumen_verifikasi && <div>Tgl. Dok: <span className="font-semibold text-slate-700 dark:text-slate-300">{new Date(assign.tanggal_dokumen_verifikasi).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span></div>}
                                                                         {assign.url_dokumen_verifikasi && (
                                                                             <div className="mt-0.5">
                                                                                 <a
                                                                                     href={assign.url_dokumen_verifikasi}
                                                                                     target="_blank"
                                                                                     rel="noopener noreferrer"
                                                                                     className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                                                                                 >
                                                                                     Lihat Dokumen Hasil ➔
                                                                                 </a>
                                                                             </div>
                                                                         )}
                                                                     </div>
                                                                 )}
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedAssignment(assign);
                                                                    setIsVerifyDialogOpen(true);
                                                                }}
                                                                className={cn(
                                                                    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase cursor-pointer transition-colors border shrink-0",
                                                                    assign.status_terakhir === 'disetujui' && "bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50 hover:bg-emerald-100",
                                                                    assign.status_terakhir === 'ditolak' && "bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50 hover:bg-rose-100",
                                                                    assign.status_terakhir === 'revisi' && "bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50 hover:bg-amber-100",
                                                                    assign.status_terakhir === 'pending' && "bg-blue-50 text-blue-700 border-blue-250 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50 hover:bg-blue-100"
                                                                )}
                                                                title="Klik untuk detail histori"
                                                            >
                                                                {assign.status_terakhir}
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-[9px] text-slate-400 dark:text-slate-550 italic block">Belum ada OPD ditugaskan</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-0.5">Jenis Usulan</span>
                                    <span className="text-sm text-slate-700 dark:text-slate-355 font-medium">{usulan.jenis_usulan || "-"}</span>
                                </div>
                                {usulan.volume && (
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-0.5">Volume</span>
                                        <span className="text-sm text-slate-700 dark:text-slate-300 font-semibold">{usulan.volume}</span>
                                    </div>
                                )}
                                {usulan.anggaran_usulan !== undefined && usulan.anggaran_usulan !== null && (
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-0.5">Anggaran Usulan</span>
                                        <span className="text-sm text-emerald-600 dark:text-emerald-400 font-extrabold">
                                            {new Intl.NumberFormat("id-ID", {
                                                style: "currency",
                                                currency: "IDR",
                                                minimumFractionDigits: 0,
                                            }).format(usulan.anggaran_usulan)}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                        {usulan.url_dokumen_usulan && (
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-1">Dokumen Usulan</span>
                                <a 
                                    href={usulan.url_dokumen_usulan} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-950/20 px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900/40 mt-1 truncate max-w-full"
                                >
                                    <FileText size={13} className="shrink-0" />
                                    <span className="truncate">Lihat Dokumen Usulan</span>
                                </a>
                            </div>
                        )}
                    </div>

                    <div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-1">Uraian Usulan</span>
                        <div className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/30 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed">
                            {usulan.uraian_usulan}
                        </div>
                    </div>

                    {usulan.catatan_bappeda && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-850 dark:text-amber-300 rounded-xl border border-amber-200/50 dark:border-amber-900/40 flex gap-2">
                            <Info className="h-4.5 w-4.5 shrink-0 mt-0.5 text-amber-600" />
                            <div>
                                <span className="text-[10px] font-bold block uppercase tracking-wider mb-0.5">Catatan BAPPEDA</span>
                                <span className="leading-relaxed text-xs">{usulan.catatan_bappeda}</span>
                            </div>
                        </div>
                    )}

                    {usulan.catatan_bupati && (
                        <div className="p-3 bg-violet-50 dark:bg-violet-950/20 text-violet-850 dark:text-violet-300 rounded-xl border border-violet-200/50 dark:border-violet-900/40 flex gap-2">
                            <Sparkles className="h-4.5 w-4.5 shrink-0 mt-0.5 text-violet-600" />
                            <div>
                                <span className="text-[10px] font-bold block uppercase tracking-wider mb-0.5">Catatan BUPATI</span>
                                <span className="leading-relaxed text-xs">{usulan.catatan_bupati}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel: Daftar Geometry Tersimpan */}
            <div className={cn(
                "absolute top-0 bottom-0 right-0 w-full sm:w-[420px] max-w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-2xl border-l border-slate-200 dark:border-slate-800 z-30 flex flex-col overflow-hidden",
                isGeometryListOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
            )}>
                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-200 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        Daftar Lokasi Spasial
                        {geometries.length > 0 && (
                            <span className="ml-1 text-[10px] font-black bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-full">
                                {geometries.length}
                            </span>
                        )}
                    </h3>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setIsGeometryListOpen(false)} 
                        className="h-8 w-8 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
                    >
                        <X size={16} />
                    </Button>
                </div>

                {/* Geometry List Content */}
                <div className="flex-1 overflow-y-auto">
                    <GeometryList
                        data={geometries}
                        isLoading={isLoadingGeoms}
                        onFocus={handleFocusGeometry}
                        onRefresh={fetchGeometriesData}
                    />
                </div>
            </div>

            {/* Dialog: Verifikasi & History (Read Only) */}
            <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
                <DialogContent className="sm:max-w-[480px] bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-extrabold text-slate-850 dark:text-slate-200">Verifikasi & Histori OPD</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Status verifikasi oleh <strong className="text-slate-700 dark:text-slate-300">{selectedAssignment?.opd?.nama}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-2">
                        {/* Timeline History */}
                        <div className="space-y-2">
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider block">Timeline Verifikasi</span>
                            {selectedAssignment?.history && selectedAssignment.history.length > 0 ? (
                                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                                    {selectedAssignment.history.map((hist) => (
                                        <div key={hist.id} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border dark:border-slate-800/80 text-xs relative space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-slate-700 dark:text-slate-200">{hist.verifikator_id || 'Sistem'}</span>
                                                <span className="text-[9px] text-slate-400 dark:text-slate-550">{new Date(hist.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border",
                                                    hist.status === 'disetujui' && "bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50",
                                                    hist.status === 'ditolak' && "bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50",
                                                    hist.status === 'revisi' && "bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50",
                                                    hist.status === 'pending' && "bg-blue-50 text-blue-700 border-blue-250 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50"
                                                )}>
                                                    {hist.status}
                                                </span>
                                            </div>
                                            {hist.catatan && (
                                                <p className="text-slate-650 dark:text-slate-400 italic text-[11px] mt-1 bg-white dark:bg-slate-950 p-2 rounded border border-slate-100 dark:border-slate-900">
                                                    "{hist.catatan}"
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 border border-dashed rounded-xl text-slate-400 text-xs">
                                    Belum ada histori verifikasi.
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            onClick={() => setIsVerifyDialogOpen(false)}
                            className="h-9 text-xs rounded-xl w-full bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200"
                        >
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Pengecekan Usulan oleh Bappeda (pending -> verifikasi_bappeda) */}
            <Dialog open={isCekBappedaDialogOpen} onOpenChange={setIsCekBappedaDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-extrabold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                            <ClipboardCheck className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                            Pengecekan & Penelaahan Usulan (Bappeda)
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Periksa kelengkapan & informasi usulan sebelum memproses ke tahap Verifikasi Bappeda.
                        </DialogDescription>
                    </DialogHeader>

                    {usulan && (
                        <div className="space-y-4 py-2">
                            {/* Ringkasan Data Usulan */}
                            <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-xs space-y-2">
                                <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-1.5">
                                    <span className="font-mono text-[11px] text-muted-foreground">No. Agenda: <strong className="text-slate-800 dark:text-slate-200">{usulan.nomor_agenda}</strong></span>
                                    <StatusBadge status={usulan.status} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Uraian Usulan</span>
                                    <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5 leading-relaxed">{usulan.uraian_usulan}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                                    <div>
                                        <span className="text-muted-foreground">Desa / Kecamatan:</span>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{desaName || '-'} / {kecamatanName || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Tahun Anggaran:</span>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{usulan.tahun_anggaran}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Input Catatan Penelaahan Bappeda */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Catatan Penelaahan Bappeda</Label>
                                <Textarea
                                    placeholder="Tuliskan catatan hasil pengecekan / penelaahan Bappeda..."
                                    value={catatanBappedaInput}
                                    onChange={(e) => setCatatanBappedaInput(e.target.value)}
                                    className="text-xs rounded-xl min-h-[90px] resize-none"
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex gap-2 justify-end">
                        <Button
                            variant="ghost"
                            onClick={() => setIsCekBappedaDialogOpen(false)}
                            className="h-9 text-xs rounded-xl"
                        >
                            Batal
                        </Button>
                        <Button
                            variant="outline"
                            type="button"
                            onClick={() => handleProcessCekBappeda('ditolak')}
                            disabled={isSavingCekBappeda}
                            className="h-9 text-xs rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30 font-semibold"
                        >
                            Tolak Usulan
                        </Button>
                        <Button
                            type="button"
                            onClick={() => handleProcessCekBappeda('verifikasi_bappeda')}
                            disabled={isSavingCekBappeda}
                            className="h-9 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-xs"
                        >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {isSavingCekBappeda ? "Memproses..." : "Terima & Verifikasi Bappeda"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
