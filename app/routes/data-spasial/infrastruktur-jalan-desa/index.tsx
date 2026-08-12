import { useState, useEffect, useRef, Suspense, lazy } from "react";
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
    X,
    Save,
    ArrowLeft,
    MapIcon,
    MoreHorizontal,
    ChevronLeft,
    Info,
    ChevronRight
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
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import { kecamatanService, type Kecamatan } from "~/services/kecamatan";
import { desaService, type Desa } from "~/services/desa";
import { apiClient } from "~/lib/api-client";
import type { MetaFunction } from "react-router";
import type { GeometryMapRef } from "~/features/usulan-desa/components/GeometryMap";

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
        { title: "Master Data Jalan Desa Spasial - MELAROSA" },
        { name: "description", content: "Halaman pengelolaan data jalan desa spasial Bojonegoro" },
    ];
};

interface JalanDesa {
    id: string | number;
    kode_ruas: string;
    nama_ruas: string;
    id_kecamatan: number;
    id_desa: number;
    kecamatan: string;
    desa: string;
    panjang_sk: number | null;
    lebar: number | null;
    perkerasan: string;
    kondisi: string;
    geom: any | null;
}

export default function MasterJalanDesaPage() {
    const mapRef = useRef<GeometryMapRef>(null);

    // States for data
    const [jalans, setJalans] = useState<JalanDesa[]>([]);
    const [kecamatans, setKecamatans] = useState<Kecamatan[]>([]);
    const [desas, setDesas] = useState<Desa[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Search and Filter States
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedKecamatan, setSelectedKecamatan] = useState("all");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [limit] = useState(50);

    // Layout States
    const [isFormActive, setIsFormActive] = useState(false);
    const [editingJalan, setEditingJalan] = useState<JalanDesa | null>(null);
    const [activeRowId, setActiveRowId] = useState<string | number | null>(null);
    const [activeBasemap, setActiveBasemap] = useState<string>("osm");

    // Form inputs state
    const [formData, setFormData] = useState({
        id: "",
        kode_ruas: "",
        nama_ruas: "",
        id_kecamatan: "",
        id_desa: "",
        panjang_sk: "",
        lebar: "",
        perkerasan: "Beton Cor",
        kondisi: "baik",
        geom: null as any
    });
    
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | number | null>(null);
    const [desaListLoading, setDesaListLoading] = useState(false);

    // Fetch initial list of kecamatan
    useEffect(() => {
        const fetchKecamatans = async () => {
            try {
                const list = await kecamatanService.getKecamatan();
                setKecamatans(list);
            } catch (err) {
                console.error("Failed to load kecamatan list:", err);
            }
        };
        fetchKecamatans();
    }, []);

    // Fetch desas based on selected kecamatan in Form
    useEffect(() => {
        const fetchDesasForForm = async () => {
            if (!formData.id_kecamatan || formData.id_kecamatan === "none" || formData.id_kecamatan === "") {
                setDesas([]);
                return;
            }
            setDesaListLoading(true);
            try {
                const list = await desaService.getDesa(formData.id_kecamatan);
                setDesas(list);
            } catch (err) {
                console.error("Failed to load desa list:", err);
            } finally {
                setDesaListLoading(false);
            }
        };
        fetchDesasForForm();
    }, [formData.id_kecamatan]);

    // Main fetch data function
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const searchParams = new URLSearchParams();
            searchParams.append("page", page.toString());
            searchParams.append("limit", limit.toString());
            if (searchTerm) {
                searchParams.append("nama_ruas", searchTerm);
            }
            if (selectedKecamatan !== "all") {
                searchParams.append("kecamatan_id", selectedKecamatan);
            }
            const queryStr = searchParams.toString();
            const url = `${import.meta.env.VITE_API_BASE_URL}/v1/jalan${queryStr ? `?${queryStr}` : ""}`;

            const response = await apiClient.get<any>(url);
            if (response && response.status === "success") {
                // Map API response to match our local JalanDesa structure
                const rawData = response.result || [];
                const formatted: JalanDesa[] = rawData.map((item: any) => ({
                    id: item.id || item.kode_ruas,
                    kode_ruas: item.kode_ruas?.toString() || "",
                    nama_ruas: item.nama_ruas || "",
                    id_kecamatan: item.id_kecamatan,
                    id_desa: item.id_desa,
                    kecamatan: item.kecamatan || "Bojonegoro",
                    desa: item.desa || "",
                    panjang_sk: item.shape_length || item.panjang || null,
                    lebar: item.lebar || null,
                    perkerasan: item.perkerasan || "Beton Cor",
                    kondisi: item.kondisi || "baik",
                    geom: item.geom || null
                }));
                setJalans(formatted);
                setTotal(response.pagination?.total || formatted.length);
            } else {
                toast.error("Gagal memuat data jalan desa");
            }
        } catch (err) {
            console.error("Error fetching jalan data:", err);
            toast.error("Gagal menyambung ke server");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, selectedKecamatan]);

    // Handle search form submit
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchData();
    };

    // Reset search parameters
    const handleReset = () => {
        setSearchTerm("");
        setSelectedKecamatan("all");
        setPage(1);
    };

    // Form inputs change handler
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: "" }));
        }
    };

    // Open create mode
    const handleOpenCreate = () => {
        setEditingJalan(null);
        setFormData({
            id: "",
            kode_ruas: "",
            nama_ruas: "",
            id_kecamatan: "",
            id_desa: "",
            panjang_sk: "",
            lebar: "",
            perkerasan: "Beton Cor",
            kondisi: "baik",
            geom: null
        });
        setFormErrors({});
        setIsFormActive(true);
    };

    // Open edit mode
    const handleOpenEdit = async (jalan: JalanDesa) => {
        setEditingJalan(jalan);
        setFormData({
            id: jalan.id.toString(),
            kode_ruas: jalan.kode_ruas,
            nama_ruas: jalan.nama_ruas,
            id_kecamatan: jalan.id_kecamatan ? jalan.id_kecamatan.toString() : "",
            id_desa: jalan.id_desa ? jalan.id_desa.toString() : "",
            panjang_sk: jalan.panjang_sk ? jalan.panjang_sk.toString() : "",
            lebar: jalan.lebar ? jalan.lebar.toString() : "",
            perkerasan: jalan.perkerasan || "Beton Cor",
            kondisi: jalan.kondisi || "baik",
            geom: null
        });
        setFormErrors({});
        setIsFormActive(true);

        try {
            const url = `${import.meta.env.VITE_API_BASE_URL}/v1/jalan/${jalan.id}?format=geojson`;
            const response = await apiClient.get<any>(url);
            if (response && response.status === "success" && response.result) {
                const featureCollection = response.result;
                const geometry = featureCollection.features?.[0]?.geometry || null;
                setFormData(prev => ({
                    ...prev,
                    geom: geometry
                }));
            }
        } catch (error) {
            console.error("Error fetching road GeoJSON:", error);
            toast.error("Gagal mengambil geometri jalan");
        }
    };

    // Validate form inputs
    const validateForm = () => {
        const errors: Record<string, string> = {};
        let valid = true;

        if (!formData.kode_ruas.trim()) {
            errors.kode_ruas = "Kode Ruas wajib diisi";
            valid = false;
        }

        if (!formData.nama_ruas.trim()) {
            errors.nama_ruas = "Nama Jalan wajib diisi";
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
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));

        try {
            const selectedKecObj = kecamatans.find(k => k.id.toString() === formData.id_kecamatan);
            const selectedDesaObj = desas.find(d => d.id.toString() === formData.id_desa);

            const jalanDataPayload: JalanDesa = {
                id: editingJalan ? editingJalan.id : formData.kode_ruas,
                kode_ruas: formData.kode_ruas,
                nama_ruas: formData.nama_ruas,
                id_kecamatan: parseInt(formData.id_kecamatan),
                id_desa: parseInt(formData.id_desa),
                kecamatan: selectedKecObj?.nama_kecamatan || "Bojonegoro",
                desa: selectedDesaObj?.nama_desa || "",
                panjang_sk: formData.panjang_sk ? parseFloat(formData.panjang_sk) : null,
                lebar: formData.lebar ? parseFloat(formData.lebar) : null,
                perkerasan: formData.perkerasan,
                kondisi: formData.kondisi,
                geom: formData.geom
            };

            if (editingJalan) {
                // Update Simulation
                setJalans(prev => prev.map(j => j.id === editingJalan.id ? jalanDataPayload : j));
                toast.success("Berhasil mengubah data jalan desa");
            } else {
                // Create Simulation
                setJalans(prev => [jalanDataPayload, ...prev]);
                setTotal(prev => prev + 1);
                toast.success("Berhasil menambahkan jalan desa baru");
            }
            setIsFormActive(false);
        } catch (err) {
            console.error("Error saving data:", err);
            toast.error("Gagal menyimpan data jalan");
        } finally {
            setIsSaving(false);
        }
    };

    // Confirm Delete Action
    const handleDeleteConfirm = async () => {
        if (!deletingId) return;

        setIsSaving(true);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 600));

        try {
            setJalans(prev => prev.filter(j => j.id !== deletingId));
            setTotal(prev => Math.max(0, prev - 1));
            setDeleteConfirmOpen(false);
            setDeletingId(null);
            toast.success("Berhasil menghapus data jalan desa");
        } catch (err) {
            console.error("Error deleting data:", err);
            toast.error("Gagal menghapus data");
        } finally {
            setIsSaving(false);
        }
    };

    // Format geometries for OpenLayers map viewer
    const mapGeometries = formData.geom ? [{
        id: formData.kode_ruas || "temp-id",
        geom: formData.geom,
        keterangan_geometry: formData.nama_ruas || "Jalan Desa",
        id_usulan_desa: 0
    } as any] : [];

    // Focus camera on the geometry
    const handleFocusBoundary = () => {
        if (formData.geom) {
            mapRef.current?.zoomToGeometry({
                id: formData.kode_ruas || "temp-id",
                geom: formData.geom,
                keterangan_geometry: formData.nama_ruas
            } as any);
        } else {
            toast.error("Geometri belum dipetakan");
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
                                type="button"
                                onClick={() => setIsFormActive(false)}
                                className="h-8 w-8 hover:bg-slate-200 text-slate-500 rounded-lg shrink-0"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div>
                                <h2 className="text-sm font-bold text-slate-800 tracking-tight">
                                    {editingJalan ? "Ubah Jalan Desa" : "Tambah Jalan Desa"}
                                </h2>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Workspace Spasial</p>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Form Body */}
                    <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Kode Ruas */}
                        <div className="space-y-1.5">
                            <Label htmlFor="kode_ruas" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Kode Ruas Jalan
                            </Label>
                            <Input
                                id="kode_ruas"
                                name="kode_ruas"
                                placeholder="Contoh: 35.22.01.001"
                                value={formData.kode_ruas}
                                onChange={handleInputChange}
                                disabled={!!editingJalan}
                                className={`h-9 w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm focus:border-blue-400 focus:ring-blue-400 rounded-lg font-mono ${editingJalan ? "opacity-75 cursor-not-allowed bg-slate-100" : ""}`}
                            />
                            {formErrors.kode_ruas && (
                                <p className="text-xs text-red-500 flex items-center mt-1">
                                    <AlertCircle className="h-3.5 w-3.5 mr-1 shrink-0" />
                                    {formErrors.kode_ruas}
                                </p>
                            )}
                        </div>

                        {/* Nama Ruas */}
                        <div className="space-y-1.5">
                            <Label htmlFor="nama_ruas" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Nama Jalan Desa
                            </Label>
                            <Input
                                id="nama_ruas"
                                name="nama_ruas"
                                placeholder="Masukkan nama ruas jalan"
                                value={formData.nama_ruas}
                                onChange={handleInputChange}
                                className="h-9 w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm focus:border-blue-400 rounded-lg"
                            />
                            {formErrors.nama_ruas && (
                                <p className="text-xs text-red-500 flex items-center mt-1">
                                    <AlertCircle className="h-3.5 w-3.5 mr-1 shrink-0" />
                                    {formErrors.nama_ruas}
                                </p>
                            )}
                        </div>

                        {/* Kecamatan Select */}
                        <div className="space-y-1.5">
                            <Label htmlFor="id_kecamatan" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Kecamatan
                            </Label>
                            <Select 
                                value={formData.id_kecamatan} 
                                onValueChange={(val) => setFormData(prev => ({ ...prev, id_kecamatan: val, id_desa: "" }))}
                            >
                                <SelectTrigger className="h-9 w-full text-sm bg-slate-50/50 border-slate-200">
                                    <SelectValue placeholder="Pilih Kecamatan" />
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

                        {/* Desa Select */}
                        <div className="space-y-1.5">
                            <Label htmlFor="id_desa" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Desa {desaListLoading && <span className="text-xs text-indigo-500 animate-pulse">(Loading...)</span>}
                            </Label>
                            <Select 
                                value={formData.id_desa} 
                                onValueChange={(val) => setFormData(prev => ({ ...prev, id_desa: val }))}
                                disabled={!formData.id_kecamatan || desaListLoading}
                            >
                                <SelectTrigger className="h-9 w-full text-sm bg-slate-50/50 border-slate-200">
                                    <SelectValue placeholder="Pilih Desa" />
                                </SelectTrigger>
                                <SelectContent>
                                    {desas.map((d) => (
                                        <SelectItem key={d.id} value={d.id.toString()}>
                                            {d.nama_desa}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Panjang & Lebar */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="panjang_sk" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Panjang (m)
                                </Label>
                                <Input
                                    id="panjang_sk"
                                    name="panjang_sk"
                                    type="number"
                                    step="any"
                                    placeholder="Contoh: 1250"
                                    value={formData.panjang_sk}
                                    onChange={handleInputChange}
                                    className="h-9 w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="lebar" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Lebar (m)
                                </Label>
                                <Input
                                    id="lebar"
                                    name="lebar"
                                    type="number"
                                    step="any"
                                    placeholder="Contoh: 4.5"
                                    value={formData.lebar}
                                    onChange={handleInputChange}
                                    className="h-9 w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm"
                                />
                            </div>
                        </div>

                        {/* Perkerasan & Kondisi */}
                        <div className="space-y-1.5">
                            <Label htmlFor="perkerasan" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Jenis Perkerasan
                            </Label>
                            <Select 
                                value={formData.perkerasan} 
                                onValueChange={(val) => setFormData(prev => ({ ...prev, perkerasan: val }))}
                            >
                                <SelectTrigger className="h-9 w-full text-sm bg-slate-50/50 border-slate-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Beton Cor">Beton Cor</SelectItem>
                                    <SelectItem value="Aspal">Aspal</SelectItem>
                                    <SelectItem value="Paving / Makadam">Paving / Makadam</SelectItem>
                                    <SelectItem value="Tanah">Tanah</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="kondisi" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Kondisi Fisik
                            </Label>
                            <Select 
                                value={formData.kondisi} 
                                onValueChange={(val) => setFormData(prev => ({ ...prev, kondisi: val }))}
                            >
                                <SelectTrigger className="h-9 w-full text-sm bg-slate-50/50 border-slate-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="baik">Baik</SelectItem>
                                    <SelectItem value="sedang">Sedang</SelectItem>
                                    <SelectItem value="rusak">Rusak</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Geometri Info */}
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
                                            Belum Dipetakan
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    Geometri ruas jalan bersifat read-only di halaman ini. Digitasi peta jalan dilakukan melalui modul monitoring peta infrastruktur.
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
                            type="button"
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

    // Default List View (Table list of jalan)
    return (
        <div className="absolute inset-0 flex flex-col gap-4 p-4 bg-background dark:bg-slate-950 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 shrink-0 pb-1 border-b border-slate-100 dark:border-slate-800/50">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                        <Route className="w-5 h-5 text-blue-600" />
                        Master Data Jalan Desa
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">Kelola informasi ruas jalan desa beserta koordinat geometrinya.</p>
                </div>
                <Button onClick={handleOpenCreate} className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shrink-0">
                    <Plus className="h-4 w-4" />
                    <span>Tambah Jalan Desa</span>
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
                                    placeholder="Cari nama ruas jalan..."
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
                                    <TableHead className="font-semibold">Kode Ruas</TableHead>
                                    <TableHead className="font-semibold">Nama Ruas Jalan</TableHead>
                                    <TableHead className="font-semibold">Kecamatan</TableHead>
                                    <TableHead className="font-semibold">Desa</TableHead>
                                    <TableHead className="font-semibold">Panjang (m)</TableHead>
                                    <TableHead className="font-semibold">Lebar (m)</TableHead>
                                    <TableHead className="font-semibold">Perkerasan</TableHead>
                                    <TableHead className="font-semibold">Kondisi</TableHead>
                                    <TableHead className="font-semibold">Geometri</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading && jalans.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="h-24">
                                            <div className="p-4 space-y-4">
                                                <Skeleton className="h-10 w-full" />
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <Skeleton key={i} className="h-12 w-full" />
                                                ))}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : jalans.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="h-24 text-center text-muted-foreground font-medium">
                                            Tidak ada data jalan desa.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    jalans.map((jalan) => (
                                        <TableRow key={jalan.id} className="group">
                                            <TableCell className="w-[60px] min-w-[60px] p-0 relative sticky left-0 bg-white dark:bg-slate-950 group-hover:bg-slate-50 dark:group-hover:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] z-10">
                                                <div className="flex items-center justify-center h-12 w-full">
                                                    <Button
                                                        variant="ghost"
                                                        onClick={(e) => { e.stopPropagation(); setActiveRowId(jalan.id); }}
                                                        className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                                    </Button>
                                                </div>
                                                {/* Sliding Actions Panel */}
                                                <div className={cn(
                                                    "absolute top-0 bottom-0 left-0 z-20 flex items-center justify-center gap-1.5 bg-blue-50/95 dark:bg-blue-950/95 backdrop-blur-xs transition-all duration-300 ease-in-out px-2 border-r border-slate-200 dark:border-slate-800 rounded-r-xl w-[120px]",
                                                    activeRowId === jalan.id ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0 pointer-events-none"
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
                                                        onClick={(e) => { e.stopPropagation(); handleOpenEdit(jalan); setActiveRowId(null); }}
                                                        title="Edit Jalan"
                                                    >
                                                        <Edit className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="outline" size="sm"
                                                        className="h-7 w-7 p-0 border-slate-200 text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            setDeletingId(jalan.id); 
                                                            setDeleteConfirmOpen(true); 
                                                            setActiveRowId(null); 
                                                        }}
                                                        title="Hapus Jalan"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{jalan.kode_ruas}</TableCell>
                                            <TableCell className="font-semibold text-slate-800 dark:text-slate-200">{jalan.nama_ruas}</TableCell>
                                            <TableCell>{jalan.kecamatan}</TableCell>
                                            <TableCell>{jalan.desa}</TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {jalan.panjang_sk ? jalan.panjang_sk.toFixed(1) : "-"}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {jalan.lebar ? jalan.lebar.toFixed(1) : "-"}
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300">
                                                    {jalan.perkerasan}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className={cn(
                                                    "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase",
                                                    jalan.kondisi === "baik" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
                                                    jalan.kondisi === "sedang" && "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
                                                    jalan.kondisi === "rusak" && "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                                                )}>
                                                    {jalan.kondisi}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {jalan.geom ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                                                        <MapPin size={12} />
                                                        {jalan.geom.type}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                                        Tidak ada
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>

                    {/* Pagination (Batas Desa layout) */}
                    {total > limit && (
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/10 shrink-0">
                            <span className="text-xs text-slate-500 font-medium">
                                Menampilkan Halaman {page} dari {Math.ceil(total / limit)} ({total} total jalan desa)
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page === 1 || isLoading}
                                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                    className="h-8 text-xs flex items-center gap-1"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                    Sebelumnya
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= Math.ceil(total / limit) || isLoading}
                                    onClick={() => setPage(prev => prev + 1)}
                                    className="h-8 text-xs flex items-center gap-1"
                                >
                                    Berikutnya
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Confirm Dialog: Delete Road */}
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent className="border border-slate-100 dark:border-slate-800">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-650">
                            <AlertCircle className="w-5 h-5" />
                            Hapus Data Jalan Desa?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
                            Apakah Anda yakin ingin menghapus data jalan desa ini secara permanen? Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDeleteConfirm}
                            className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                        >
                            Hapus Data
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
