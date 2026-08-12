import { useState, useEffect, useCallback, useRef, Suspense, lazy } from "react";
import { toast } from "sonner";
import { 
    Plus, 
    Edit, 
    Trash2, 
    Search, 
    RotateCw,
    AlertCircle,
    MapPin,
    Pentagon,
    X,
    Save,
    ArrowLeft,
    MapIcon,
    MoreHorizontal,
    ChevronLeft,
    UserCheck
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Skeleton } from "~/components/ui/skeleton";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
    TableFooter,
} from "~/components/ui/table";
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
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "~/components/ui/pagination";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "~/components/ui/tooltip";
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import { UsulanDesaPagination } from "~/features/usulan-desa/components/UsulanDesaPagination";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "~/components/ui/empty";
import { batasKecamatanService, type BatasKecamatan } from "~/services/batas-kecamatan";
import type { MetaFunction } from "react-router";
import type { GeometryMapRef } from "~/features/usulan-desa/components/GeometryMap";
import type { GeoJSONGeometry } from "~/features/usulan-desa/types/usulan-desa.types";

// Dynamic import of OpenLayers Map component
const GeometryMap = lazy(() =>
    import("~/features/usulan-desa/components/GeometryMap").then((m) => ({ default: m.GeometryMap }))
);

const BASEMAP_URLS: Record<string, string> = {
    osm: "osm",
    satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    topo: "https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png",
};

export const meta: MetaFunction = () => {
    return [
        { title: "Master Data Batas Kecamatan Spasial - MELAROSA" },
        { name: "description", content: "Halaman pengelolaan batas wilayah kecamatan dengan interaksi peta spasial Bojonegoro" },
    ];
};

export default function MasterBatasKecamatanPage() {
    const mapRef = useRef<GeometryMapRef>(null);

    // States for data
    const [kecamatans, setKecamatans] = useState<BatasKecamatan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Filters and Pagination
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Workspace Split View Form State
    const [isFormActive, setIsFormActive] = useState(false);
    const [editingKecamatan, setEditingKecamatan] = useState<BatasKecamatan | null>(null);
    const [formData, setFormData] = useState<{
        id: string;
        nama_kecamatan: string;
        nama_pimpinan: string;
        nama_jabatan: string;
        nip: string;
        pangkat_gol: string;
        geom: GeoJSONGeometry | null;
        luas_m2: number | null;
    }>({
        id: "",
        nama_kecamatan: "",
        nama_pimpinan: "",
        nama_jabatan: "",
        nip: "",
        pangkat_gol: "",
        geom: null,
        luas_m2: null,
    });
    const [formErrors, setFormErrors] = useState({
        id: "",
        nama_kecamatan: "",
    });

    const [activeBasemap, setActiveBasemap] = useState<string>("osm");

    // Delete dialog states
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // Active row for sliding action panel in list view
    const [activeRowId, setActiveRowId] = useState<string | null>(null);


    // Fetch Batas Kecamatan List when filters/pagination change
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await batasKecamatanService.getBatasKecamatan({
                nama_kecamatan: searchTerm ? searchTerm : undefined,
                page,
                limit,
            });

            if (response.status === "success" && response.result) {
                setKecamatans(response.result);
                if (response.pagination) {
                    setTotalPages(response.pagination.totalPages || 1);
                    setTotalItems(response.pagination.total || 0);
                }
            } else {
                toast.error(response.message || "Gagal mengambil data batas kecamatan");
            }
        } catch (err) {
            console.error("Failed to load batas kecamatan list", err);
            toast.error("Gagal memuat data batas kecamatan");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, limit]);

    // Handle Search Submit
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchData();
    };

    // Reset Filters
    const handleReset = () => {
        setSearchTerm("");
        setPage(1);
    };

    const formatArea = (m2: number | null) => {
        if (m2 === null || m2 === undefined) return "-";
        return `${m2.toLocaleString("id-ID", { maximumFractionDigits: 2 })} m²`;
    };

    const totalLuasKecamatan = kecamatans.reduce((acc, curr) => acc + (curr.luas_m2 || 0), 0);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name as keyof typeof formErrors]) {
            setFormErrors(prev => ({ ...prev, [name]: "" }));
        }
    };

    // Open Create Workspace view
    const handleOpenCreate = () => {
        setEditingKecamatan(null);
        setFormData({
            id: "",
            nama_kecamatan: "",
            nama_pimpinan: "",
            nama_jabatan: "",
            nip: "",
            pangkat_gol: "",
            geom: null,
            luas_m2: null,
        });
        setFormErrors({
            id: "",
            nama_kecamatan: "",
        });
        setIsFormActive(true);
    };

    // Open Edit Workspace view
    const handleOpenEdit = async (kecamatan: BatasKecamatan) => {
        setIsLoading(true);
        try {
            const response = await batasKecamatanService.getBatasKecamatanById(kecamatan.id, { format: "geojson" });
            if (response.status === "success" && response.result) {
                const result = response.result;
                const geom = result.type === "Feature" ? result.geometry : result.geom;
                const props = result.type === "Feature" ? result.properties : result;
                const luas = props ? props.luas_m2 : (result.luas_m2 || null);

                setEditingKecamatan(kecamatan);
                setFormData({
                    id: kecamatan.id.toString(),
                    nama_kecamatan: kecamatan.nama_kecamatan,
                    nama_pimpinan: props?.nama_pimpinan || kecamatan.nama_pimpinan || "",
                    nama_jabatan: props?.nama_jabatan || kecamatan.nama_jabatan || "",
                    nip: props?.nip || kecamatan.nip || "",
                    pangkat_gol: props?.pangkat_gol || kecamatan.pangkat_gol || "",
                    geom: geom || null,
                    luas_m2: luas ? parseFloat(luas) : null,
                });
                setFormErrors({
                    id: "",
                    nama_kecamatan: "",
                });
                setIsFormActive(true);

                // Zoom map to the loaded geometry once map mounts
                if (geom) {
                    setTimeout(() => {
                        mapRef.current?.zoomToGeometry({
                            id: kecamatan.id,
                            geom: geom,
                            keterangan_geometry: kecamatan.nama_kecamatan
                        } as any);
                    }, 600);
                }
            } else {
                toast.error(response.message || "Gagal memuat geometri batas kecamatan.");
            }
        } catch (err) {
            console.error("Gagal memuat detail batas kecamatan", err);
            toast.error("Gagal memuat geometri batas kecamatan.");
        } finally {
            setIsLoading(false);
        }
    };

    // Open Delete Confirm Dialog
    const handleOpenDelete = (id: number) => {
        setDeletingId(id);
        setDeleteConfirmOpen(true);
    };

    // Confirm Delete
    const handleConfirmDelete = async () => {
        if (deletingId === null) return;
        try {
            const response = await batasKecamatanService.deleteBatasKecamatan(deletingId);
            if (response.status === "success") {
                toast.success("Berhasil menghapus batas kecamatan");
                setDeleteConfirmOpen(false);
                setDeletingId(null);
                if (kecamatans.length === 1 && page > 1) {
                    setPage(prev => prev - 1);
                } else {
                    fetchData();
                }
            }
        } catch (err) {
            console.error("Error deleting data:", err);
        }
    };

    // Mock geometry format for GeometryMap display
    const mapGeometries = formData.geom ? [{
        id: parseInt(formData.id, 10) || 0,
        geom: formData.geom,
        keterangan_geometry: formData.nama_kecamatan || "Batas Kecamatan",
        id_usulan_desa: 0
    } as any] : [];

    // Zoom to loaded boundary on map
    const handleFocusBoundary = () => {
        if (formData.geom) {
            mapRef.current?.zoomToGeometry({
                id: formData.id || "temp-id",
                geom: formData.geom,
                keterangan_geometry: formData.nama_kecamatan
            } as any);
        } else {
            toast.error("Geometri belum digambar");
        }
    };

    // Form Submit Handler
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validations
        let valid = true;
        const newErrors = { id: "", nama_kecamatan: "" };

        if (!editingKecamatan) {
            if (!formData.id.trim()) {
                newErrors.id = "Kode kecamatan wajib diisi.";
                valid = false;
            } else if (isNaN(Number(formData.id))) {
                newErrors.id = "Kode kecamatan harus berupa angka.";
                valid = false;
            }
        }

        if (!formData.nama_kecamatan.trim()) {
            newErrors.nama_kecamatan = "Nama kecamatan wajib diisi.";
            valid = false;
        }

        setFormErrors(newErrors);
        if (!valid) return;

        setIsSaving(true);
        try {
            if (editingKecamatan) {
                // UPDATE
                const response = await batasKecamatanService.updateBatasKecamatan(editingKecamatan.id, {
                    nama_kecamatan: formData.nama_kecamatan.trim(),
                    nama_pimpinan: formData.nama_pimpinan.trim() || null,
                    nama_jabatan: formData.nama_jabatan.trim() || null,
                    nip: formData.nip.trim() || null,
                    pangkat_gol: formData.pangkat_gol.trim() || null,
                });
                if (response.status === "success") {
                    toast.success("Berhasil memperbarui data kecamatan");
                    setIsFormActive(false);
                    fetchData();
                } else {
                    toast.error(response.message || "Gagal memperbarui data");
                }
            } else {
                // CREATE
                const response = await batasKecamatanService.createBatasKecamatan({
                    id: parseInt(formData.id, 10),
                    nama_kecamatan: formData.nama_kecamatan.trim(),
                    nama_pimpinan: formData.nama_pimpinan.trim() || null,
                    nama_jabatan: formData.nama_jabatan.trim() || null,
                    nip: formData.nip.trim() || null,
                    pangkat_gol: formData.pangkat_gol.trim() || null,
                    geom: null, // Read-only on this workspace, create empty boundary
                });
                if (response.status === "success") {
                    toast.success("Berhasil menambahkan kecamatan baru");
                    setIsFormActive(false);
                    fetchData();
                } else {
                    toast.error(response.message || "Gagal menambahkan data");
                }
            }
        } catch (err: any) {
            console.error("Failed to save data", err);
            toast.error(err.response?.data?.message || "Gagal menyimpan batas kecamatan");
        } finally {
            setIsSaving(false);
        }
    };

    // Split workspace layout when form is open
    if (isFormActive) {
        return (
            <div className="flex flex-col md:flex-row flex-1 h-[calc(100vh-4rem)] overflow-hidden">
                {/* Left Side: Form Controls */}
                <div className="w-full md:w-[420px] bg-white border-r border-slate-200 flex flex-col h-[50vh] md:h-full shrink-0 shadow-xl z-10">
                    {/* Header Panel */}
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center space-y-0.5 gap-2">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setIsFormActive(false)}
                                className="h-8 w-8 hover:bg-slate-200 text-slate-500 rounded-lg shrink-0"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div>
                                <h2 className="text-sm font-bold text-slate-800 tracking-tight">
                                    {editingKecamatan ? "Ubah Batas Kecamatan" : "Tambah Batas Kecamatan"}
                                </h2>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Workspace Spasial</p>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Form Body */}
                    <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* ID Input (Only shown on Create mode) */}
                        <div className="space-y-1.5">
                            <Label htmlFor="id" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Kode Kecamatan (ID)</Label>
                            <Input
                                id="id"
                                placeholder="Contoh: 352210"
                                value={formData.id}
                                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                                disabled={!!editingKecamatan || isSaving}
                                className={`h-9 w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm focus:border-blue-400 focus:ring-blue-400 rounded-lg font-mono ${editingKecamatan ? 'bg-slate-50/80 text-slate-500' : ''}`}
                            />
                            {formErrors.id && (
                                <p className="text-xs text-red-500 flex items-center mt-1">
                                    <AlertCircle className="h-3.5 w-3.5 mr-1 shrink-0" />
                                    {formErrors.id}
                                </p>
                            )}
                            {editingKecamatan && (
                                <p className="text-[10px] text-slate-400">Kode kecamatan tidak dapat diubah setelah disimpan.</p>
                            )}
                        </div>

                        {/* Nama Kecamatan Input */}
                        <div className="space-y-1.5">
                            <Label htmlFor="nama_kecamatan" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Nama Kecamatan</Label>
                            <Input
                                id="nama_kecamatan"
                                placeholder="Contoh: Baureno"
                                value={formData.nama_kecamatan}
                                onChange={(e) => setFormData({ ...formData, nama_kecamatan: e.target.value })}
                                disabled={isSaving}
                                className="h-9 w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm focus:border-blue-400 focus:ring-blue-400 rounded-lg"
                            />
                            {formErrors.nama_kecamatan && (
                                <p className="text-xs text-red-500 flex items-center mt-1">
                                    <AlertCircle className="h-3.5 w-3.5 mr-1 shrink-0" />
                                    {formErrors.nama_kecamatan}
                                </p>
                            )}
                        </div>

                        {/* Informasi Pimpinan Kecamatan / Camat */}
                        <div className="pt-2">
                            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl space-y-3">
                                <div className="flex items-center gap-1.5 pb-1 border-b border-blue-100 dark:border-blue-900/40">
                                    <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Informasi Pimpinan Kecamatan</span>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="nama_pimpinan" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                        Nama Pimpinan / Camat
                                    </Label>
                                    <Input
                                        id="nama_pimpinan"
                                        name="nama_pimpinan"
                                        placeholder="Masukkan nama camat/pimpinan..."
                                        value={formData.nama_pimpinan}
                                        onChange={handleInputChange}
                                        className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="nama_jabatan" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                        Nama Jabatan
                                    </Label>
                                    <Input
                                        id="nama_jabatan"
                                        name="nama_jabatan"
                                        placeholder="Contoh: Camat / Plt. Camat"
                                        value={formData.nama_jabatan}
                                        onChange={handleInputChange}
                                        className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label htmlFor="nip" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                            NIP Camat
                                        </Label>
                                        <Input
                                            id="nip"
                                            name="nip"
                                            placeholder="NIP..."
                                            value={formData.nip}
                                            onChange={handleInputChange}
                                            className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="pangkat_gol" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                            Pangkat / Gol.
                                        </Label>
                                        <Input
                                            id="pangkat_gol"
                                            name="pangkat_gol"
                                            placeholder="Contoh: Pembina / IV.a"
                                            value={formData.pangkat_gol}
                                            onChange={handleInputChange}
                                            className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Geometry Info Card */}
                        <div className="pt-2">
                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Data Geometri</span>
                                    {formData.geom ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                            Tersedia ({formData.geom.type})
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                            Belum Digambar
                                        </span>
                                    )}
                                </div>
                                {formData.geom && formData.luas_m2 !== null && (
                                    <div className="flex justify-between items-center text-xs mt-1 bg-slate-100/50 p-1.5 rounded-lg border border-slate-200/40">
                                        <span className="text-slate-500 font-semibold uppercase tracking-tight text-[10px]">Luas Wilayah</span>
                                        <span className="font-bold text-slate-800">{formatArea(formData.luas_m2)}</span>
                                    </div>
                                )}
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    Geometri batas kecamatan bersifat read-only di halaman ini. Hubungi admin GIS jika ada perubahan wilayah spasial.
                                </p>
                                {formData.geom && (
                                    <div className="pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleFocusBoundary}
                                            className="h-7 text-[10px] w-full bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                                        >
                                            <MapIcon size={12} className="mr-1" />
                                            Fokus di Peta
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </form>

                    {/* Footer Action Panel */}
                    <div className="p-4 border-t border-slate-100 flex gap-2 bg-slate-50/50">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsFormActive(false)}
                            disabled={isSaving}
                            className="flex-1"
                        >
                            Batal
                        </Button>
                        <Button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-1 shadow-sm"
                        >
                            {isSaving ? (
                                <>
                                    <Spinner className="mr-2 h-4 w-4" />
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Simpan
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Right Side: Map Workspace */}
                <div className="relative flex-grow h-[50vh] md:h-full z-0 bg-slate-100">
                    <Suspense fallback={
                        <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-400">
                            <div className="text-center space-y-2">
                                <Spinner className="h-8 w-8 text-blue-600 mx-auto animate-spin" />
                                <p className="text-sm font-semibold">Menginisialisasi Peta Spasial...</p>
                            </div>
                        </div>
                    }>
                        <GeometryMap
                            ref={mapRef}
                            savedGeometries={mapGeometries}
                            drawMode={null}
                            onDrawComplete={() => {}}
                            showDesaBoundaries={false}
                            idKecamatanForDesa={null}
                            basemapUrl={BASEMAP_URLS[activeBasemap]}
                            className="w-full h-full border-none rounded-none"
                        />
                    </Suspense>

                    {/* Basemap Selection Overlay */}
                    <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 p-1 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/80 shadow-lg">
                        {Object.keys(BASEMAP_URLS).map((key) => (
                            <Button
                                key={key}
                                size="sm"
                                variant={activeBasemap === key ? "default" : "ghost"}
                                className={`text-[10px] font-bold h-7 px-2.5 rounded-lg uppercase ${activeBasemap === key ? "" : "text-slate-600"}`}
                                onClick={() => setActiveBasemap(key)}
                            >
                                {key}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Default List View (Table list of kecamatan)
    return (
        <div className="absolute inset-0 flex flex-col gap-4 p-4 bg-background dark:bg-slate-950 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 shrink-0 pb-1 border-b border-slate-100 dark:border-slate-800/50">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Master Data Batas Kecamatan</h1>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">Kelola data wilayah batas administrasi kecamatan beserta luas m².</p>
                </div>
                <Button onClick={handleOpenCreate} className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shrink-0">
                    <Plus className="h-4 w-4" />
                    <span>Tambah Batas Kecamatan</span>
                </Button>
            </div>

            {/* Card Table Area with Toolbar */}
            <div className="flex-1 min-h-0 flex flex-col mb-4">
                <Card className="gap-0 py-0 overflow-hidden border dark:border-slate-800 bg-white dark:bg-slate-950 relative flex flex-col flex-1 min-h-0">
                    {/* Toolbar: Search + Actions */}
                    <div className="p-4 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-slate-50/30 dark:bg-slate-900/10 relative">
                        <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 flex-1">
                            <div className="relative w-full max-w-xs sm:max-w-sm">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari nama kecamatan..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-9 w-full"
                                />
                            </div>
                            <Button type="submit" size="sm" className="h-9 shrink-0">Cari</Button>
                        </form>
                        <div className="flex items-center gap-2 shrink-0">
                            <Button variant="ghost" size="sm" onClick={handleReset} className="h-9 text-slate-500">
                                Reset
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9"
                                onClick={fetchData}
                                disabled={isLoading}
                            >
                                <RotateCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                            </Button>
                        </div>
                    </div>

                    <CardContent className="p-0 overflow-auto custom-scrollbar flex-1 min-h-0 [&_[data-slot=table-container]]:overflow-visible">
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                                <TableRow>
                                    <TableHead className="text-center font-semibold sticky top-0 left-0 z-20 bg-slate-50 dark:bg-slate-900 border-r shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] w-[60px]">Aksi</TableHead>
                                    <TableHead className="font-semibold">Kode Kecamatan</TableHead>
                                    <TableHead className="font-semibold">Nama Kecamatan</TableHead>
                                    <TableHead className="font-semibold">Jumlah Desa</TableHead>
                                    <TableHead className="font-semibold">Luas Wilayah</TableHead>
                                    <TableHead className="font-semibold">Geometri</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24">
                                            <div className="p-4 space-y-4">
                                                <Skeleton className="h-10 w-full" />
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <Skeleton key={i} className="h-12 w-full" />
                                                ))}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : kecamatans.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            Tidak ada data batas kecamatan.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    kecamatans.map((kec) => (
                                        <TableRow key={kec.id} className="group">
                                            <TableCell className="w-[60px] min-w-[60px] p-0 relative sticky left-0 bg-white dark:bg-slate-950 group-hover:bg-slate-50 dark:group-hover:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] z-10">
                                                <div className="flex items-center justify-center h-12 w-full">
                                                    <Button
                                                        variant="ghost"
                                                        onClick={(e) => { e.stopPropagation(); setActiveRowId(String(kec.id)); }}
                                                        className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                                    </Button>
                                                </div>
                                                {/* Sliding Actions Panel */}
                                                <div className={cn(
                                                    "absolute top-0 bottom-0 left-0 z-20 flex items-center justify-center gap-1.5 bg-blue-50/95 dark:bg-blue-950/95 backdrop-blur-xs transition-all duration-300 ease-in-out px-2 border-r border-slate-200 dark:border-slate-800 rounded-r-xl w-[120px]",
                                                    activeRowId === String(kec.id) ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0 pointer-events-none"
                                                )}>
                                                    <Button
                                                        variant="ghost" size="sm"
                                                        className="h-7 w-7 p-0 hover:bg-slate-200 text-slate-500 rounded-md shrink-0"
                                                        onClick={(e) => { e.stopPropagation(); setActiveRowId(null); }}
                                                    >
                                                        <ChevronLeft className="h-4 w-4" />
                                                    </Button>
                                                    <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-0.5 shrink-0" />
                                                    <Button
                                                        variant="outline" size="sm"
                                                        className="h-7 w-7 p-0 border-slate-200 text-blue-600 hover:text-blue-700 hover:bg-blue-50 shrink-0"
                                                        onClick={(e) => { e.stopPropagation(); handleOpenEdit(kec); setActiveRowId(null); }}
                                                        title="Edit Kecamatan"
                                                    >
                                                        <Edit className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="outline" size="sm"
                                                        className="h-7 w-7 p-0 border-slate-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                                                        onClick={(e) => { e.stopPropagation(); handleOpenDelete(kec.id); setActiveRowId(null); }}
                                                        title="Hapus Kecamatan"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-slate-600 font-medium">{kec.id}</TableCell>
                                            <TableCell>
                                                <div className="font-semibold text-slate-900 dark:text-slate-100">{kec.nama_kecamatan}</div>
                                                {kec.nama_pimpinan ? (
                                                    <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 mt-0.5">
                                                        <UserCheck className="h-3 w-3 shrink-0" />
                                                        <span>{kec.nama_pimpinan} {kec.nama_jabatan ? `(${kec.nama_jabatan})` : ''}</span>
                                                    </div>
                                                ) : null}
                                            </TableCell>
                                            <TableCell>
                                                {kec.desa && kec.desa.length > 0 ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                                        {kec.desa.length} Desa
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic">0 Desa</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium text-slate-700">{formatArea(kec.luas_m2)}</TableCell>
                                            <TableCell>
                                                {kec.has_geom || (kec as any).geom !== undefined && (kec as any).geom !== null ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">Polygon</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">Kosong</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                            {kecamatans.length > 0 && (
                                <TableFooter className="sticky bottom-0 z-10 bg-blue-50/95 dark:bg-blue-950/90 backdrop-blur border-t-2 border-blue-200 dark:border-blue-800 shadow-md">
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={4} className="text-right font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200 py-3">
                                            Total Luas Wilayah ({kecamatans.length} Kecamatan pada Halaman Ini)
                                        </TableCell>
                                        <TableCell className="font-bold text-blue-700 dark:text-blue-300 text-xs sm:text-sm py-3 whitespace-nowrap">
                                            {formatArea(totalLuasKecamatan)}
                                        </TableCell>
                                        <TableCell />
                                    </TableRow>
                                </TableFooter>
                            )}
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Pagination */}
            <UsulanDesaPagination
                pageCount={totalPages}
                pageIndex={page - 1}
                pageSize={limit}
                totalItems={totalItems}
                onPageChange={(index) => setPage(index + 1)}
                onPageSizeChange={(size) => {
                    setLimit(size);
                    setPage(1);
                }}
            />

            {/* Delete Confirmation Alert Dialog */}
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent className="rounded-xl border border-slate-200/80 max-w-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-slate-900 font-bold">Hapus Batas Kecamatan?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 text-xs leading-relaxed">
                            Tindakan ini tidak dapat dibatalkan. Menghapus batas kecamatan akan menghilangkan asosiasi geometry spasial terkait pada peta master.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="rounded-lg text-xs font-semibold">Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                        >
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
