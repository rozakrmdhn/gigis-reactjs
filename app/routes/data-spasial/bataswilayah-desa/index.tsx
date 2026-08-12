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
    Route,
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
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
import { batasDesaService, type BatasDesa } from "~/services/batas-desa";
import { kecamatanService, type Kecamatan } from "~/services/kecamatan";
import type { MetaFunction } from "react-router";
import type { GeometryMapRef } from "~/features/usulan-desa/components/GeometryMap";
import type { GeoJSONGeometry, GeometryType } from "~/features/usulan-desa/types/usulan-desa.types";

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
        { title: "Master Data Batas Desa Spasial - MELAROSA" },
        { name: "description", content: "Halaman pengelolaan batas wilayah desa dengan interaksi peta spasial Bojonegoro" },
    ];
};

export default function MasterBatasDesaPage() {
    const mapRef = useRef<GeometryMapRef>(null);

    // States for data
    const [desas, setDesas] = useState<BatasDesa[]>([]);
    const [kecamatans, setKecamatans] = useState<Kecamatan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Filters and Pagination
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedKecamatan, setSelectedKecamatan] = useState<string>("all");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Workspace Split View Form State
    const [isFormActive, setIsFormActive] = useState(false);
    const [editingDesa, setEditingDesa] = useState<BatasDesa | null>(null);
    const [formData, setFormData] = useState<{
        id: string;
        id_kecamatan: string;
        nama_desa: string;
        nama_pimpinan: string;
        nama_jabatan: string;
        nip: string;
        pangkat_gol: string;
        geom: GeoJSONGeometry | null;
        luas_m2: number | null;
    }>({
        id: "",
        id_kecamatan: "",
        nama_desa: "",
        nama_pimpinan: "",
        nama_jabatan: "",
        nip: "",
        pangkat_gol: "",
        geom: null,
        luas_m2: null,
    });
    const [formErrors, setFormErrors] = useState({
        id: "",
        id_kecamatan: "",
        nama_desa: "",
    });

    const [activeBasemap, setActiveBasemap] = useState<string>("osm");

    // Delete dialog states
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Active row for sliding action panel in list view
    const [activeRowId, setActiveRowId] = useState<string | null>(null);

    // Fetch Kecamatan List once
    useEffect(() => {
        async function fetchKecamatans() {
            try {
                const list = await kecamatanService.getKecamatan();
                setKecamatans(list || []);
            } catch (err) {
                console.error("Failed to load kecamatan list", err);
                toast.error("Gagal memuat daftar kecamatan");
            }
        }
        fetchKecamatans();
    }, []);

    // Fetch Batas Desa List when filters/pagination change
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await batasDesaService.getBatasDesa({
                id_kecamatan: selectedKecamatan === "all" ? undefined : selectedKecamatan,
                nama_desa: searchTerm.trim() || undefined,
                page,
                limit
            });

            if (response.status === "success") {
                setDesas(response.result || []);
                if (response.pagination) {
                    setTotalPages(response.pagination.totalPages || 1);
                    setTotalItems(response.pagination.total || 0);
                }
            } else {
                toast.error(response.message || "Gagal mengambil data");
            }
        } catch (err) {
            console.error("Failed to load batas desa list", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isFormActive) {
            fetchData();
        }
    }, [selectedKecamatan, page, limit, isFormActive]);

    // Auto-fetch data on debounced search term change
    useEffect(() => {
        const handler = setTimeout(() => {
            if (!isFormActive) {
                fetchData();
            }
        }, 350);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Handle Search Submit
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchData();
    };

    // Reset Filters
    const handleReset = () => {
        setSearchTerm("");
        setSelectedKecamatan("all");
        setPage(1);
    };

    const formatArea = (m2: number | null) => {
        if (m2 === null || m2 === undefined) return "-";
        return `${m2.toLocaleString("id-ID", { maximumFractionDigits: 2 })} m²`;
    };

    const totalLuasDesa = desas.reduce((acc, curr) => acc + (curr.luas_m2 || 0), 0);

    // Open Create Workspace view
    const handleOpenCreate = () => {
        setEditingDesa(null);
        setFormData({
            id: "",
            id_kecamatan: "",
            nama_desa: "",
            nama_pimpinan: "",
            nama_jabatan: "",
            nip: "",
            pangkat_gol: "",
            geom: null,
            luas_m2: null,
        });
        setFormErrors({
            id: "",
            id_kecamatan: "",
            nama_desa: "",
        });
        setIsFormActive(true);
    };

    // Open Edit Workspace view
    const handleOpenEdit = async (desa: BatasDesa) => {
        setIsLoading(true);
        try {
            const response = await batasDesaService.getBatasDesaById(desa.id, { format: "geojson" });
            if (response.status === "success" && response.result) {
                const result = response.result;
                const geom = result.type === "Feature" ? result.geometry : result.geom;
                const props = result.type === "Feature" ? result.properties : result;
                const luas = props ? props.luas_m2 : (result.luas_m2 || null);

                setEditingDesa(desa);
                setFormData({
                    id: desa.id,
                    id_kecamatan: desa.id_kecamatan.toString(),
                    nama_desa: desa.nama_desa,
                    nama_pimpinan: props?.nama_pimpinan || desa.nama_pimpinan || "",
                    nama_jabatan: props?.nama_jabatan || desa.nama_jabatan || "",
                    nip: props?.nip || desa.nip || "",
                    pangkat_gol: props?.pangkat_gol || desa.pangkat_gol || "",
                    geom: geom || null,
                    luas_m2: luas ? parseFloat(luas) : null,
                });
                setFormErrors({
                    id: "",
                    id_kecamatan: "",
                    nama_desa: "",
                });
                setIsFormActive(true);

                // Zoom map to the loaded geometry once map mounts
                if (geom) {
                    setTimeout(() => {
                        mapRef.current?.zoomToGeometry({
                            id: desa.id,
                            geom: geom,
                            keterangan_geometry: desa.nama_desa
                        } as any);
                    }, 600);
                }
            } else {
                toast.error(response.message || "Gagal memuat geometri batas desa.");
            }
        } catch (err) {
            console.error("Gagal memuat detail batas desa", err);
            toast.error("Gagal memuat geometri batas desa.");
        } finally {
            setIsLoading(false);
        }
    };

    // Open Delete Confirm Dialog
    const handleOpenDelete = (id: string) => {
        setDeletingId(id);
        setDeleteConfirmOpen(true);
    };

    // Form Field Change Handlers
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name as keyof typeof formErrors]) {
            setFormErrors(prev => ({ ...prev, [name]: "" }));
        }
    };

    const handleSelectChange = (value: string) => {
        setFormData(prev => ({ ...prev, id_kecamatan: value }));
        if (formErrors.id_kecamatan) {
            setFormErrors(prev => ({ ...prev, id_kecamatan: "" }));
        }
    };

    // Form Validation
    const validateForm = () => {
        let valid = true;
        const errors = { id: "", id_kecamatan: "", nama_desa: "" };

        if (!editingDesa) {
            if (!formData.id.trim()) {
                errors.id = "Kode Desa wajib diisi";
                valid = false;
            } else if (!/^\d+$/.test(formData.id.trim())) {
                errors.id = "Kode Desa harus berupa angka";
                valid = false;
            }
        }

        if (!formData.nama_desa.trim()) {
            errors.nama_desa = "Nama Desa wajib diisi";
            valid = false;
        }

        if (!formData.id_kecamatan) {
            errors.id_kecamatan = "Kecamatan wajib dipilih";
            valid = false;
        }

        setFormErrors(errors);
        return valid;
    };

    // Form Submit (Save / Update)
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSaving(true);
        try {
            if (editingDesa) {
                // Update
                const response = await batasDesaService.updateBatasDesa(editingDesa.id, {
                    id_kecamatan: parseInt(formData.id_kecamatan, 10),
                    nama_desa: formData.nama_desa.trim(),
                    nama_pimpinan: formData.nama_pimpinan.trim() || null,
                    nama_jabatan: formData.nama_jabatan.trim() || null,
                    nip: formData.nip.trim() || null,
                    pangkat_gol: formData.pangkat_gol.trim() || null,
                    geom: formData.geom,
                });
                if (response.status === "success") {
                    setIsFormActive(false);
                    fetchData();
                } else {
                    toast.error(response.message || "Gagal memperbarui data desa");
                }
            } else {
                // Create
                const response = await batasDesaService.createBatasDesa({
                    id: formData.id.trim(),
                    id_kecamatan: parseInt(formData.id_kecamatan, 10),
                    nama_desa: formData.nama_desa.trim(),
                    nama_pimpinan: formData.nama_pimpinan.trim() || null,
                    nama_jabatan: formData.nama_jabatan.trim() || null,
                    nip: formData.nip.trim() || null,
                    pangkat_gol: formData.pangkat_gol.trim() || null,
                    geom: formData.geom,
                });
                if (response.status === "success") {
                    setIsFormActive(false);
                    setPage(1);
                    fetchData();
                } else {
                    toast.error(response.message || "Gagal menambahkan data desa");
                }
            }
        } catch (err: any) {
            console.error("Error saving data:", err);
            toast.error(err?.message || "Terjadi kesalahan saat menyimpan data desa");
        } finally {
            setIsSaving(false);
        }
    };

    // Confirm Delete Action
    const handleDeleteConfirm = async () => {
        if (!deletingId) return;

        try {
            const response = await batasDesaService.deleteBatasDesa(deletingId);
            if (response.status === "success") {
                setDeleteConfirmOpen(false);
                setDeletingId(null);
                if (desas.length === 1 && page > 1) {
                    setPage(prev => prev - 1);
                } else {
                    fetchData();
                }
            }
        } catch (err) {
            console.error("Error deleting data:", err);
        }
    };

    // Geometry drawing is read-only in master page

    // Mock geometry format for GeometryMap display
    const mapGeometries = formData.geom ? [{
        id: parseInt(formData.id, 10) || 0,
        geom: formData.geom,
        keterangan_geometry: formData.nama_desa || "Batas Desa",
        id_usulan_desa: 0
    } as any] : [];

    // Zoom to loaded boundary on map
    const handleFocusBoundary = () => {
        if (formData.geom) {
            mapRef.current?.zoomToGeometry({
                id: formData.id || "temp-id",
                geom: formData.geom,
                keterangan_geometry: formData.nama_desa
            } as any);
        } else {
            toast.error("Geometri belum digambar");
        }
    };

    // Render Split-Screen Workspace when form is active
    if (isFormActive) {
        return (
            <div className="relative flex-grow min-h-0 w-full overflow-hidden flex flex-col md:flex-row bg-slate-50">
                {/* Left Side: Form Panel */}
                <div className="w-full md:w-[380px] bg-white border-r border-slate-200/80 shadow-2xl z-10 flex flex-col h-full shrink-0">
                    {/* Header Panel */}
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-2">
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
                                    {editingDesa ? "Ubah Batas Desa" : "Tambah Batas Desa"}
                                </h2>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Workspace Spasial</p>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Form Body */}
                    <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Kode Desa (ID) */}
                        <div className="space-y-1.5">
                            <Label htmlFor="id" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Kode Desa (ID)
                            </Label>
                            <Input
                                id="id"
                                name="id"
                                placeholder="Contoh: 3522032001"
                                value={formData.id}
                                onChange={handleInputChange}
                                disabled={!!editingDesa}
                                className={`h-9 w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm focus:border-blue-400 focus:ring-blue-400 rounded-lg font-mono ${editingDesa ? "opacity-75 cursor-not-allowed bg-slate-100" : ""}`}
                            />
                            {formErrors.id && (
                                <p className="text-xs text-red-500 flex items-center mt-1">
                                    <AlertCircle className="h-3.5 w-3.5 mr-1 shrink-0" />
                                    {formErrors.id}
                                </p>
                            )}
                        </div>

                        {/* Nama Desa */}
                        <div className="space-y-1.5">
                            <Label htmlFor="nama_desa" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Nama Desa
                            </Label>
                            <Input
                                id="nama_desa"
                                name="nama_desa"
                                placeholder="Masukkan nama desa..."
                                value={formData.nama_desa}
                                onChange={handleInputChange}
                                className="h-9 w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm focus:border-blue-400 focus:ring-blue-400 rounded-lg"
                            />
                            {formErrors.nama_desa && (
                                <p className="text-xs text-red-500 flex items-center mt-1">
                                    <AlertCircle className="h-3.5 w-3.5 mr-1 shrink-0" />
                                    {formErrors.nama_desa}
                                </p>
                            )}
                        </div>

                        {/* Dropdown Kecamatan */}
                        <div className="space-y-1.5">
                            <Label htmlFor="id_kecamatan" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Kecamatan
                            </Label>
                            <Select
                                value={formData.id_kecamatan}
                                onValueChange={handleSelectChange}
                            >
                                <SelectTrigger className="h-9 w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm focus:border-blue-400 focus:ring-blue-400 rounded-lg">
                                    <SelectValue placeholder="Pilih Kecamatan..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {kecamatans.map((kec) => (
                                        <SelectItem key={kec.id} value={kec.id.toString()}>
                                            {kec.nama_kecamatan}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {formErrors.id_kecamatan && (
                                <p className="text-xs text-red-500 flex items-center mt-1">
                                    <AlertCircle className="h-3.5 w-3.5 mr-1 shrink-0" />
                                    {formErrors.id_kecamatan}
                                </p>
                            )}
                        </div>

                        {/* Informasi Pimpinan Desa / Kepala Desa */}
                        <div className="pt-2">
                            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl space-y-3">
                                <div className="flex items-center gap-1.5 pb-1 border-b border-blue-100 dark:border-blue-900/40">
                                    <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Informasi Pimpinan Desa</span>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="nama_pimpinan" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                        Nama Pimpinan / Kepala Desa
                                    </Label>
                                    <Input
                                        id="nama_pimpinan"
                                        name="nama_pimpinan"
                                        placeholder="Masukkan nama pimpinan..."
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
                                        placeholder="Contoh: Kepala Desa / Pj. Kepala Desa"
                                        value={formData.nama_jabatan}
                                        onChange={handleInputChange}
                                        className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label htmlFor="nip" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                            NIP Pimpinan
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
                                            placeholder="Contoh: Penata / III.c"
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
                                    Geometri batas desa bersifat read-only di halaman ini. Hubungi admin GIS jika ada perubahan wilayah spasial.
                                </p>
                                {formData.geom && (
                                    <div className="flex gap-1.5 pt-1">
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
                            showDesaBoundaries={true}
                            idKecamatanForDesa={parseInt(formData.id_kecamatan, 10) || null}
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

                    {/* Map is read-only, no drawing tools overlay */}
                </div>
            </div>
        );
    }

    // Default List View (Table list of desa)
    return (
        <div className="absolute inset-0 flex flex-col gap-4 p-4 bg-background dark:bg-slate-950 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 shrink-0 pb-1 border-b border-slate-100 dark:border-slate-800/50">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Master Data Batas Desa</h1>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">Kelola informasi batas wilayah desa beserta geometrinya.</p>
                </div>
                <Button onClick={handleOpenCreate} className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shrink-0">
                    <Plus className="h-4 w-4" />
                    <span>Tambah Batas Desa</span>
                </Button>
            </div>

            {/* Card Table Area with Toolbar */}
            <div className="flex-1 min-h-0 flex flex-col mb-4">
                <Card className="gap-0 py-0 overflow-hidden border dark:border-slate-800 bg-white dark:bg-slate-950 relative flex flex-col flex-1 min-h-0">
                    {/* Toolbar: Search + Kecamatan Filter + Actions */}
                    <div className="p-4 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-slate-50/30 dark:bg-slate-900/10 relative">
                        <form onSubmit={handleSearch} className="flex items-center gap-3 flex-1">
                            <div className="relative w-full max-w-xs sm:max-w-sm">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari nama desa..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-9 w-full"
                                />
                            </div>
                            <div className="w-[200px] shrink-0">
                                <Select
                                    value={selectedKecamatan}
                                    onValueChange={(value) => { setSelectedKecamatan(value); setPage(1); }}
                                >
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder="Semua Kecamatan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Kecamatan</SelectItem>
                                        {kecamatans.map((kec) => (
                                            <SelectItem key={kec.id} value={kec.id.toString()}>
                                                {kec.nama_kecamatan}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                                    <TableHead className="font-semibold">Kode Desa</TableHead>
                                    <TableHead className="font-semibold">Nama Desa</TableHead>
                                    <TableHead className="font-semibold">Kecamatan</TableHead>
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
                                ) : desas.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            Tidak ada data batas desa.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    desas.map((desa) => (
                                        <TableRow key={desa.id} className="group">
                                            <TableCell className="w-[60px] min-w-[60px] p-0 relative sticky left-0 bg-white dark:bg-slate-950 group-hover:bg-slate-50 dark:group-hover:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] z-10">
                                                <div className="flex items-center justify-center h-12 w-full">
                                                    <Button
                                                        variant="ghost"
                                                        onClick={(e) => { e.stopPropagation(); setActiveRowId(desa.id); }}
                                                        className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                                    </Button>
                                                </div>
                                                {/* Sliding Actions Panel */}
                                                <div className={cn(
                                                    "absolute top-0 bottom-0 left-0 z-20 flex items-center justify-center gap-1.5 bg-blue-50/95 dark:bg-blue-950/95 backdrop-blur-xs transition-all duration-300 ease-in-out px-2 border-r border-slate-200 dark:border-slate-800 rounded-r-xl w-[120px]",
                                                    activeRowId === desa.id ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0 pointer-events-none"
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
                                                        onClick={(e) => { e.stopPropagation(); handleOpenEdit(desa); setActiveRowId(null); }}
                                                        title="Edit Desa"
                                                    >
                                                        <Edit className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="outline" size="sm"
                                                        className="h-7 w-7 p-0 border-slate-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                                                        onClick={(e) => { e.stopPropagation(); handleOpenDelete(desa.id); setActiveRowId(null); }}
                                                        title="Hapus Desa"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-slate-600 font-medium">{desa.id}</TableCell>
                                            <TableCell>
                                                <div className="font-semibold text-slate-900 dark:text-slate-100">{desa.nama_desa}</div>
                                                {desa.nama_pimpinan ? (
                                                    <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 mt-0.5">
                                                        <UserCheck className="h-3 w-3 shrink-0" />
                                                        <span>{desa.nama_pimpinan} {desa.nama_jabatan ? `(${desa.nama_jabatan})` : ''}</span>
                                                    </div>
                                                ) : null}
                                            </TableCell>
                                            <TableCell className="text-slate-600">
                                                {desa.kecamatan ? desa.kecamatan.nama_kecamatan : <span className="text-red-400 italic">Tidak terelasi</span>}
                                            </TableCell>
                                            <TableCell className="font-medium text-slate-700">{formatArea(desa.luas_m2)}</TableCell>
                                            <TableCell>
                                                {desa.has_geom || (desa as any).geom !== undefined && (desa as any).geom !== null ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">Polygon</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">Kosong</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                            {desas.length > 0 && (
                                <TableFooter className="sticky bottom-0 z-10 bg-blue-50/95 dark:bg-blue-950/90 backdrop-blur border-t-2 border-blue-200 dark:border-blue-800 shadow-md">
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={4} className="text-right font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200 py-3">
                                            Total Luas Wilayah ({desas.length} Desa pada Halaman Ini)
                                        </TableCell>
                                        <TableCell className="font-bold text-blue-700 dark:text-blue-300 text-xs sm:text-sm py-3 whitespace-nowrap">
                                            {formatArea(totalLuasDesa)}
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
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg font-semibold text-slate-900">Apakah Anda benar-benar yakin?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 text-sm">
                            Tindakan ini tidak dapat dibatalkan. Menghapus data batas wilayah desa ini akan menghilangkan datanya secara permanen dari basis data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                        <AlertDialogCancel className="w-full sm:w-auto">Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleDeleteConfirm(); }}
                            className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
                        >
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
