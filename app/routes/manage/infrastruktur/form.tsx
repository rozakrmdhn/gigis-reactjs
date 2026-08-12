import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import type { MetaFunction } from "react-router";
import { toast } from "sonner";
import {
    ArrowLeft,
    Save,
    RotateCw,
    Plus,
    Trash2,
    MoveUp,
    MoveDown,
    Copy,
    Layers,
    Sliders,
    Eye,
    Code,
    CheckCircle2,
    Route,
    Waypoints,
    Landmark,
    Droplets,
    FolderKanban,
    HelpCircle,
    Sparkles,
    Check,
    X,
    Info,
    Grid
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "~/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Spinner } from "~/components/ui/spinner";
import {
    infrastrukturService,
    type InfrastrukturTipe,
    type CreateInfrastrukturTipePayload
} from "~/services/infrastruktur.service";

export const meta: MetaFunction = () => {
    return [
        { title: "Form Tipe Infrastruktur - MELAROSA Bappeda" },
        { name: "description", content: "Form pembuatan dan pengeditan tipe infrastruktur spasial" },
    ];
};

/** Dynamic Icon Renderer */
function IconRenderer({ name, className }: { name: string; className?: string }) {
    const iconName = name ? name.toLowerCase() : "";
    if (iconName === "road" || iconName === "route") return <Route className={className} />;
    if (iconName === "path" || iconName === "waypoints") return <Waypoints className={className} />;
    if (iconName === "bridge" || iconName === "landmark") return <Landmark className={className} />;
    if (iconName === "droplets" || iconName === "water") return <Droplets className={className} />;
    if (iconName === "folder") return <FolderKanban className={className} />;

    const pascalName = name
        ? name.charAt(0).toUpperCase() + name.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
        : "";
    const Component = (LucideIcons as any)[pascalName] || HelpCircle;
    return <Component className={className} />;
}

export interface AttributeSchemaField {
    id: string;
    key: string;
    label: string;
    type: "text" | "number" | "select" | "boolean" | "textarea" | "date";
    required?: boolean;
    options?: string[];
    defaultValue?: string;
}

export default function ManageInfrastrukturFormPage() {
    const navigate = useNavigate();
    const params = useParams();
    const isEditMode = !!params.id;

    const [isLoadingData, setIsLoadingData] = useState(isEditMode);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("builder");

    // Form fields
    const [formData, setFormData] = useState<CreateInfrastrukturTipePayload>({
        kode: "",
        nama: "",
        deskripsi: "",
        ikon: "road",
        warna: "#3B82F6",
        geom_type: "LINESTRING",
        table_name: "",
        has_segmen: true,
        is_active: true,
        sort_order: 1,
    });

    // Dynamic Attribute Builder State
    const [attributes, setAttributes] = useState<AttributeSchemaField[]>([
        {
            id: "attr_1",
            key: "jenis_perkerasan",
            label: "Jenis Perkerasan Jalan",
            type: "select",
            required: true,
            options: ["Hotmix / Aspal", "Rigid Beton", "Telford / Makadam", "Paving Block", "Tanah / Belum Perkerasan"]
        },
        {
            id: "attr_2",
            key: "lebar",
            label: "Lebar Segmen (m)",
            type: "number",
            required: true,
            defaultValue: "3.5"
        },
        {
            id: "attr_3",
            key: "sumber_dana",
            label: "Sumber Pendanaan",
            type: "select",
            required: false,
            options: ["APBDes", "APBD Kab. Bojonegoro", "DDA", "BKK Desa", "Swadaya"]
        }
    ]);

    // Raw JSON String Sync for Advanced View
    const [jsonString, setJsonString] = useState<string>("");
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [viewJsonRaw, setViewJsonRaw] = useState(false);

    // Option Input State per-field (for adding options to select types)
    const [newOptionInputs, setNewOptionInputs] = useState<Record<string, string>>({});

    // Fetch existing data if in Edit mode
    useEffect(() => {
        if (isEditMode && params.id) {
            const fetchDetail = async () => {
                setIsLoadingData(true);
                try {
                    const item = await infrastrukturService.getTipeByIdAdmin(params.id!);
                    if (item) {
                        setFormData({
                            kode: item.kode,
                            nama: item.nama,
                            deskripsi: item.deskripsi || "",
                            ikon: item.ikon || "road",
                            warna: item.warna || "#3B82F6",
                            geom_type: item.geom_type || "LINESTRING",
                            table_name: item.table_name,
                            has_segmen: item.has_segmen ?? true,
                            is_active: item.is_active ?? true,
                            sort_order: item.sort_order ?? 0,
                        });

                        // Parse existing config JSONB
                        if (item.config && Array.isArray(item.config.attributes)) {
                            const parsedAttrs: AttributeSchemaField[] = item.config.attributes.map((a: any, idx: number) => ({
                                id: `attr_${Date.now()}_${idx}`,
                                key: a.key || `field_${idx}`,
                                label: a.label || a.key || `Field ${idx + 1}`,
                                type: a.type || "text",
                                required: !!a.required,
                                options: Array.isArray(a.options) ? a.options : [],
                                defaultValue: a.defaultValue || ""
                            }));
                            setAttributes(parsedAttrs);
                            setJsonString(JSON.stringify(item.config, null, 2));
                        } else if (item.config) {
                            setJsonString(JSON.stringify(item.config, null, 2));
                        }
                    } else {
                        toast.error("Tipe infrastruktur tidak ditemukan");
                        navigate("/admin/manage/infrastruktur");
                    }
                } catch (err: any) {
                    console.error("Fetch detail error:", err);
                    toast.error("Gagal memuat detail tipe infrastruktur");
                } finally {
                    setIsLoadingData(false);
                }
            };
            fetchDetail();
        }
    }, [isEditMode, params.id, navigate]);

    // Keep JSON string synced with Visual Attributes Builder
    useEffect(() => {
        if (!viewJsonRaw) {
            const compiledConfig = {
                attributes: attributes.map(({ id, ...rest }) => rest)
            };
            setJsonString(JSON.stringify(compiledConfig, null, 2));
            setJsonError(null);
        }
    }, [attributes, viewJsonRaw]);

    // Add new attribute field
    const handleAddAttribute = () => {
        const newAttr: AttributeSchemaField = {
            id: `attr_${Date.now()}`,
            key: `field_${attributes.length + 1}`,
            label: `Atribut Baru ${attributes.length + 1}`,
            type: "text",
            required: false,
            options: []
        };
        setAttributes(prev => [...prev, newAttr]);
    };

    // Update attribute property
    const handleUpdateAttribute = (id: string, updates: Partial<AttributeSchemaField>) => {
        setAttributes(prev => prev.map(attr => {
            if (attr.id === id) {
                const updated = { ...attr, ...updates };
                // Auto format key: lowercase, replace spaces with underscore
                if (updates.key !== undefined) {
                    updated.key = updates.key.toLowerCase().replace(/[^a-z0-9_]/g, "_");
                }
                return updated;
            }
            return attr;
        }));
    };

    // Delete attribute field
    const handleDeleteAttribute = (id: string) => {
        setAttributes(prev => prev.filter(attr => attr.id !== id));
    };

    // Move attribute up / down
    const handleMoveAttribute = (index: number, direction: "up" | "down") => {
        const newAttrs = [...attributes];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newAttrs.length) return;

        const temp = newAttrs[index];
        newAttrs[index] = newAttrs[targetIndex];
        newAttrs[targetIndex] = temp;
        setAttributes(newAttrs);
    };

    // Add option tag to select type
    const handleAddOption = (attrId: string) => {
        const val = (newOptionInputs[attrId] || "").trim();
        if (!val) return;

        setAttributes(prev => prev.map(attr => {
            if (attr.id === attrId) {
                const existing = attr.options || [];
                if (!existing.includes(val)) {
                    return { ...attr, options: [...existing, val] };
                }
            }
            return attr;
        }));
        setNewOptionInputs(prev => ({ ...prev, [attrId]: "" }));
    };

    // Remove option tag from select type
    const handleRemoveOption = (attrId: string, optToRemove: string) => {
        setAttributes(prev => prev.map(attr => {
            if (attr.id === attrId) {
                return { ...attr, options: (attr.options || []).filter(o => o !== optToRemove) };
            }
            return attr;
        }));
    };

    // Load preset templates
    const handleApplyPreset = (presetType: "jalan" | "jembatan" | "drainase") => {
        if (presetType === "jalan") {
            setFormData(prev => ({
                ...prev,
                kode: prev.kode || "jalan",
                nama: prev.nama || "Jalan Poros Desa",
                geom_type: "LINESTRING",
                ikon: "road",
                warna: "#3B82F6",
                table_name: prev.table_name || "jalan_porosdesa",
                has_segmen: true
            }));
            setAttributes([
                { id: `preset_1`, key: "jenis_perkerasan", label: "Jenis Perkerasan", type: "select", required: true, options: ["Hotmix / Aspal", "Rigid Beton", "Telford / Makadam", "Paving Block", "Tanah"] },
                { id: `preset_2`, key: "lebar", label: "Lebar Jalan (m)", type: "number", required: true, defaultValue: "3.5" },
                { id: `preset_3`, key: "kondisi_eksisting", label: "Kondisi Eksisting", type: "select", required: true, options: ["Baik", "Sedang", "Rusak Ringan", "Rusak Berat"] },
                { id: `preset_4`, key: "sumber_dana", label: "Sumber Dana", type: "select", required: false, options: ["APBDes", "APBD Kab. Bojonegoro", "DDA", "BKK Desa"] }
            ]);
            toast.success("Preset Skema Jalan Poros Desa berhasil diterapkan!");
        } else if (presetType === "jembatan") {
            setFormData(prev => ({
                ...prev,
                kode: prev.kode || "jembatan",
                nama: prev.nama || "Jembatan Desa",
                geom_type: "POINT",
                ikon: "bridge",
                warna: "#10B981",
                table_name: prev.table_name || "jembatan_desa",
                has_segmen: false
            }));
            setAttributes([
                { id: `preset_1`, key: "tipe_jembatan", label: "Konstruksi Jembatan", type: "select", required: true, options: ["Gelagar Beton", "Rangka Baja", "Kayu", "Batu Kali"] },
                { id: `preset_2`, key: "panjang_m", label: "Panjang Bentang (m)", type: "number", required: true },
                { id: `preset_3`, key: "lebar_m", label: "Lebar Jembatan (m)", type: "number", required: true },
                { id: `preset_4`, key: "kondisi", label: "Kondisi Struktur", type: "select", required: true, options: ["Baik", "Sedang", "Kritis / Rusak"] }
            ]);
            toast.success("Preset Skema Jembatan berhasil diterapkan!");
        } else if (presetType === "drainase") {
            setFormData(prev => ({
                ...prev,
                kode: prev.kode || "drainase",
                nama: prev.nama || "Drainase / Saluran Air",
                geom_type: "LINESTRING",
                ikon: "droplets",
                warna: "#0284C7",
                table_name: prev.table_name || "drainase_desa",
                has_segmen: true
            }));
            setAttributes([
                { id: `preset_1`, key: "tipe_konstruksi", label: "Tipe Konstruksi Saluran", type: "select", required: true, options: ["Pasangan Batu Kali", "U-Ditch Beton", "Saluran Tanah"] },
                { id: `preset_2`, key: "kedalaman_cm", label: "Kedalaman Saluran (cm)", type: "number", required: true },
                { id: `preset_3`, key: "lebar_cm", label: "Lebar Saluran (cm)", type: "number", required: true },
                { id: `preset_4`, key: "fungsi", label: "Fungsi Utamanya", type: "select", required: false, options: ["Drainase Jalan", "Irigasi Desa", "Pengendali Banjir"] }
            ]);
            toast.success("Preset Skema Drainase berhasil diterapkan!");
        }
    };

    // Handle form submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.kode.trim() || !formData.nama.trim() || !formData.table_name.trim()) {
            toast.error("Kode Unik, Nama Tipe, dan Nama Tabel DB wajib diisi!");
            return;
        }

        let compiledConfig: Record<string, any> = {};

        if (viewJsonRaw) {
            try {
                compiledConfig = JSON.parse(jsonString);
            } catch (err: any) {
                toast.error(`Format JSON Configuration tidak valid: ${err.message}`);
                return;
            }
        } else {
            compiledConfig = {
                attributes: attributes.map(({ id, ...rest }) => rest)
            };
        }

        const payload: CreateInfrastrukturTipePayload = {
            ...formData,
            config: compiledConfig
        };

        setIsSaving(true);
        try {
            if (isEditMode && params.id) {
                await infrastrukturService.updateTipe(params.id, payload);
            } else {
                await infrastrukturService.createTipe(payload);
            }
            navigate("/admin/manage/infrastruktur");
        } catch (err: any) {
            console.error("Save error:", err);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoadingData) {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background">
                <Spinner className="size-8 text-indigo-600 dark:text-indigo-400" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    Memuat data tipe infrastruktur...
                </p>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 flex flex-col gap-4 p-4 bg-background dark:bg-slate-950 overflow-hidden font-sans">
            {/* Header Navigation Bar matching /admin/data-spasial/bataswilayah-desa */}
            <div className="flex items-center justify-between gap-4 shrink-0 pb-1 border-b border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate("/admin/manage/infrastruktur")}
                        className="h-8 w-8 hover:bg-slate-100 text-slate-500 rounded-lg shrink-0"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                            {isEditMode ? `Edit Tipe: ${formData.nama}` : "Tambah Tipe Infrastruktur Baru"}
                            <Badge variant="outline" className="border-indigo-400/40 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 text-[10px] uppercase font-mono">
                                {formData.kode || "NEW"}
                            </Badge>
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                            Konfigurasi metadata spasial dan skema visual atribut dinamis (JSONB Config)
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/admin/manage/infrastruktur")}
                        className="h-9"
                    >
                        Batal
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSaving}
                        size="sm"
                        className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shrink-0 shadow-xs"
                    >
                        {isSaving ? <Spinner className="size-3.5 mr-1" /> : <Save className="size-4 mr-1" />}
                        {isEditMode ? "Simpan Perubahan" : "Buat Tipe"}
                    </Button>
                </div>
            </div>

            {/* Scrollable Form Body Container */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 pb-4">
                <form onSubmit={handleSubmit} className="space-y-6 max-w-7xl mx-auto">
                    {/* Section 1: Informasional & Spasial Utama */}
                    <Card className="border-border/60 shadow-xs">
                    <CardHeader className="pb-3 border-b border-border/40">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Layers className="size-4 text-indigo-500" />
                                    1. Informasi Utama & Skema Spasial
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Pengaturan identitas tipe infrastruktur, geometri GIS, dan relasi database
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Kode Unik Identifikasi *</Label>
                                <Input
                                    placeholder="misal: jalan, drainase, jembatan"
                                    value={formData.kode}
                                    onChange={(e) => setFormData(prev => ({ ...prev, kode: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") }))}
                                    disabled={isEditMode}
                                    className="h-9 text-xs font-mono"
                                    required
                                />
                                <p className="text-[10px] text-muted-foreground">Kunci unik sistem (tanpa spasi/karakter khusus)</p>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Nama Tipe Infrastruktur *</Label>
                                <Input
                                    placeholder="misal: Jalan Poros Desa"
                                    value={formData.nama}
                                    onChange={(e) => setFormData(prev => ({ ...prev, nama: e.target.value }))}
                                    className="h-9 text-xs"
                                    required
                                />
                                <p className="text-[10px] text-muted-foreground">Nama resmi yang tampil di menu & aplikasi</p>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Nama Tabel Master DB *</Label>
                                <Input
                                    placeholder="misal: jalan_porosdesa"
                                    value={formData.table_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, table_name: e.target.value }))}
                                    className="h-9 text-xs font-mono"
                                    required
                                />
                                <p className="text-[10px] text-muted-foreground">Nama tabel PostgreSQL pencatat aset ini</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Tipe Geometri Peta</Label>
                                <Select
                                    value={formData.geom_type}
                                    onValueChange={(val: 'LINESTRING' | 'POINT' | 'POLYGON') => setFormData(prev => ({ ...prev, geom_type: val }))}
                                >
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LINESTRING" className="text-xs">LINESTRING (Garis / Jalan / Drainase)</SelectItem>
                                        <SelectItem value="POINT" className="text-xs">POINT (Titik / Jembatan / Lampu)</SelectItem>
                                        <SelectItem value="POLYGON" className="text-xs">POLYGON (Area / Lapangan / Waduk)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Nama Ikon Lucide</Label>
                                <div className="flex gap-2 items-center">
                                    <Input
                                        placeholder="road, bridge, droplets"
                                        value={formData.ikon}
                                        onChange={(e) => setFormData(prev => ({ ...prev, ikon: e.target.value }))}
                                        className="h-9 text-xs flex-1"
                                    />
                                    <div
                                        className="size-9 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm"
                                        style={{ backgroundColor: formData.warna || "#3B82F6" }}
                                    >
                                        <IconRenderer name={formData.ikon || "road"} className="size-4" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Warna Simbol Peta</Label>
                                <div className="flex gap-2 items-center">
                                    <Input
                                        type="color"
                                        value={formData.warna || "#3B82F6"}
                                        onChange={(e) => setFormData(prev => ({ ...prev, warna: e.target.value }))}
                                        className="h-9 w-12 p-0.5 cursor-pointer rounded-lg border shrink-0"
                                    />
                                    <Input
                                        type="text"
                                        value={formData.warna}
                                        onChange={(e) => setFormData(prev => ({ ...prev, warna: e.target.value }))}
                                        className="h-9 text-xs font-mono flex-1"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Deskripsi Singkat</Label>
                            <Textarea
                                placeholder="Keterangan singkat cakupan tipe infrastruktur..."
                                value={formData.deskripsi || ""}
                                onChange={(e) => setFormData(prev => ({ ...prev, deskripsi: e.target.value }))}
                                className="text-xs min-h-[50px]"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-slate-50 dark:bg-slate-900/50">
                                <div>
                                    <Label className="text-xs font-semibold cursor-pointer">Mendukung Digitasi Segmen Fisik?</Label>
                                    <p className="text-[11px] text-muted-foreground">Memeceah ruas menjadi segmen-segmen kondisi</p>
                                </div>
                                <Switch
                                    checked={formData.has_segmen}
                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, has_segmen: checked }))}
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-slate-50 dark:bg-slate-900/50">
                                <div>
                                    <Label className="text-xs font-semibold cursor-pointer">Status Publikasi & Peta</Label>
                                    <p className="text-[11px] text-muted-foreground">Aktif dan dapat diakses di portal GIS</p>
                                </div>
                                <Switch
                                    checked={formData.is_active}
                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Section 2: Visual Dynamic Attribute Builder (Config JSONB) */}
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-3 border-b border-border/40">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Sliders className="size-4 text-indigo-500" />
                                    2. Skema Form Atribut Dinamis (JSONB Config)
                                </CardTitle>
                                <CardDescription className="text-xs mt-0.5">
                                    Rancang field form digitasi segmen secara visual tanpa harus mengetik skema JSON secara manual
                                </CardDescription>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setViewJsonRaw(!viewJsonRaw)}
                                    className="h-8 text-xs font-semibold text-slate-700 dark:text-slate-300"
                                >
                                    <Code className="size-3.5 mr-1 text-indigo-500" />
                                    {viewJsonRaw ? "Mode Visual Builder" : "Inspeksi Raw JSON"}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="pt-4 space-y-5">
                        {/* Quick Preset Buttons */}
                        <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                                <Sparkles className="size-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                <span>Gunakan Template Preset Skema:</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleApplyPreset("jalan")}
                                    className="h-7 text-[11px] font-semibold bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50"
                                >
                                    <Route className="size-3 mr-1" /> Preset Jalan
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleApplyPreset("jembatan")}
                                    className="h-7 text-[11px] font-semibold bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50"
                                >
                                    <Landmark className="size-3 mr-1" /> Preset Jembatan
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleApplyPreset("drainase")}
                                    className="h-7 text-[11px] font-semibold bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 hover:bg-sky-50"
                                >
                                    <Droplets className="size-3 mr-1" /> Preset Drainase
                                </Button>
                            </div>
                        </div>

                        {/* Raw JSON View vs Visual Interactive Builder */}
                        {viewJsonRaw ? (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold">Raw JSON Config Editor</Label>
                                    {jsonError && (
                                        <span className="text-[11px] text-rose-500 font-semibold">{jsonError}</span>
                                    )}
                                </div>
                                <Textarea
                                    value={jsonString}
                                    onChange={(e) => {
                                        setJsonString(e.target.value);
                                        try {
                                            const parsed = JSON.parse(e.target.value);
                                            if (Array.isArray(parsed.attributes)) {
                                                setAttributes(parsed.attributes.map((a: any, i: number) => ({
                                                    id: `attr_raw_${i}`,
                                                    key: a.key || `field_${i}`,
                                                    label: a.label || a.key || `Field ${i + 1}`,
                                                    type: a.type || "text",
                                                    required: !!a.required,
                                                    options: Array.isArray(a.options) ? a.options : [],
                                                    defaultValue: a.defaultValue || ""
                                                })));
                                            }
                                            setJsonError(null);
                                        } catch (err: any) {
                                            setJsonError(err.message);
                                        }
                                    }}
                                    className="text-xs font-mono min-h-[250px] bg-slate-950 text-emerald-400 p-4 rounded-xl border border-slate-800"
                                />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-indigo-600 text-white text-[10px]">
                                            {attributes.length} Atribut Dinamis
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            Daftar field khusus yang akan diisi oleh operator desa/bappeda
                                        </span>
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={handleAddAttribute}
                                        size="sm"
                                        className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs"
                                    >
                                        <Plus className="size-3.5 mr-1" />
                                        Tambah Field Atribut
                                    </Button>
                                </div>

                                {/* Interactive Attribute Cards */}
                                <div className="space-y-3">
                                    {attributes.length === 0 ? (
                                        <div className="p-8 text-center border-2 border-dashed border-border/60 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
                                            <p className="text-xs text-muted-foreground">Belum ada atribut dinamis yang ditambahkan.</p>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleAddAttribute}
                                                className="mt-3 text-xs"
                                            >
                                                <Plus className="size-3.5 mr-1" /> Tambah Atribut Pertama
                                            </Button>
                                        </div>
                                    ) : (
                                        attributes.map((attr, idx) => (
                                            <div
                                                key={attr.id}
                                                className="p-4 rounded-xl border border-border/70 bg-card shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-all space-y-3"
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
                                                    <div className="flex items-center gap-2">
                                                        <span className="size-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                                                            {idx + 1}
                                                        </span>
                                                        <div>
                                                            <h4 className="text-xs font-bold text-foreground">
                                                                {attr.label || "Atribut Tanpa Judul"}
                                                            </h4>
                                                            <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                                                                key: {attr.key || "field_key"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            disabled={idx === 0}
                                                            onClick={() => handleMoveAttribute(idx, "up")}
                                                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                                                            title="Geser ke Atas"
                                                        >
                                                            <MoveUp className="size-3.5" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            disabled={idx === attributes.length - 1}
                                                            onClick={() => handleMoveAttribute(idx, "down")}
                                                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                                                            title="Geser ke Bawah"
                                                        >
                                                            <MoveDown className="size-3.5" />
                                                        </Button>
                                                        <div className="w-px h-4 bg-border/60 mx-1" />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteAttribute(attr.id)}
                                                            className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                                                            title="Hapus Field Ini"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Fields Configuration Grid */}
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    <div className="space-y-1">
                                                        <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                                            Label Tampilan Form *
                                                        </Label>
                                                        <Input
                                                            value={attr.label}
                                                            onChange={(e) => handleUpdateAttribute(attr.id, { label: e.target.value })}
                                                            placeholder="misal: Jenis Perkerasan"
                                                            className="h-8 text-xs"
                                                            required
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                                            Field Key JSONB *
                                                        </Label>
                                                        <Input
                                                            value={attr.key}
                                                            onChange={(e) => handleUpdateAttribute(attr.id, { key: e.target.value })}
                                                            placeholder="misal: jenis_perkerasan"
                                                            className="h-8 text-xs font-mono"
                                                            required
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                                            Tipe Komponen Form
                                                        </Label>
                                                        <Select
                                                            value={attr.type}
                                                            onValueChange={(val: any) => handleUpdateAttribute(attr.id, { type: val })}
                                                        >
                                                            <SelectTrigger className="h-8 text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="text" className="text-xs">Teks Singkat (Input Text)</SelectItem>
                                                                <SelectItem value="number" className="text-xs">Angka / Desimal (Input Number)</SelectItem>
                                                                <SelectItem value="select" className="text-xs">Pilihan Dropdown (Select)</SelectItem>
                                                                <SelectItem value="boolean" className="text-xs">Sakelar (Boolean Switch)</SelectItem>
                                                                <SelectItem value="textarea" className="text-xs">Teks Panjang (Textarea)</SelectItem>
                                                                <SelectItem value="date" className="text-xs">Tanggal (Date Picker)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                {/* Options Builder for Select Type */}
                                                {attr.type === "select" && (
                                                    <div className="pt-2 border-t border-border/40 space-y-2">
                                                        <Label className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                                            <Grid className="size-3" />
                                                            Pilihan Dropdown (Options):
                                                        </Label>
                                                        <div className="flex flex-wrap gap-1.5 items-center">
                                                            {(attr.options || []).map((opt) => (
                                                                <Badge
                                                                    key={opt}
                                                                    variant="secondary"
                                                                    className="text-xs py-1 px-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5"
                                                                >
                                                                    <span>{opt}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveOption(attr.id, opt)}
                                                                        className="text-indigo-400 hover:text-rose-500 rounded-full"
                                                                    >
                                                                        <X className="size-3" />
                                                                    </button>
                                                                </Badge>
                                                            ))}

                                                            <div className="flex items-center gap-1 mt-1 sm:mt-0">
                                                                <Input
                                                                    placeholder="Tambah pilihan..."
                                                                    value={newOptionInputs[attr.id] || ""}
                                                                    onChange={(e) => setNewOptionInputs(prev => ({ ...prev, [attr.id]: e.target.value }))}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter") {
                                                                            e.preventDefault();
                                                                            handleAddOption(attr.id);
                                                                        }
                                                                    }}
                                                                    className="h-7 text-xs w-36"
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleAddOption(attr.id)}
                                                                    className="h-7 px-2 text-xs"
                                                                >
                                                                    + Tambah
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-6 pt-1">
                                                    <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                                        <Switch
                                                            checked={attr.required}
                                                            onCheckedChange={(checked) => handleUpdateAttribute(attr.id, { required: checked })}
                                                        />
                                                        <span className="font-semibold text-slate-700 dark:text-slate-300">Wajib Diisi (Required)</span>
                                                    </label>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Section 3: Live Form Preview Panel */}
                <Card className="border-border/60 shadow-sm bg-slate-50/50 dark:bg-slate-900/30">
                    <CardHeader className="pb-3 border-b border-border/40">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Eye className="size-4 text-indigo-500" />
                            3. Live Preview Form Digitasi Operator
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Visualisasi pratinjau tampilan form yang akan diisi oleh operator saat menginput segmen tipe {formData.nama || "Infrastruktur"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="p-4 rounded-xl border border-border/60 bg-card shadow-xs space-y-4 max-w-2xl">
                            <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                                <div
                                    className="size-7 rounded-lg flex items-center justify-center text-white shadow-xs"
                                    style={{ backgroundColor: formData.warna || "#3B82F6" }}
                                >
                                    <IconRenderer name={formData.ikon || "road"} className="size-3.5" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold">{formData.nama || "Nama Tipe Infrastruktur"}</h4>
                                    <p className="text-[10px] text-muted-foreground">Form Input Segmen {formData.geom_type || "LINESTRING"}</p>
                                </div>
                            </div>

                            {attributes.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-4">Belum ada atribut dinamis yang diatur.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {attributes.map((attr) => (
                                        <div key={attr.id} className="space-y-1">
                                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                {attr.label} {attr.required && <span className="text-rose-500">*</span>}
                                            </Label>
                                            {attr.type === "select" ? (
                                                <Select disabled>
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue placeholder={`-- Pilih ${attr.label} --`} />
                                                    </SelectTrigger>
                                                </Select>
                                            ) : attr.type === "textarea" ? (
                                                <Textarea disabled placeholder={`Masukkan ${attr.label}...`} className="text-xs min-h-[50px]" />
                                            ) : attr.type === "boolean" ? (
                                                <div className="flex items-center gap-2 py-1">
                                                    <Switch disabled />
                                                    <span className="text-xs text-muted-foreground">Ya / Tidak</span>
                                                </div>
                                            ) : (
                                                <Input disabled type={attr.type} placeholder={`Masukkan ${attr.label}...`} className="h-8 text-xs" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Bottom Action Footer Bar */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/admin/manage/infrastruktur")}
                        className="text-xs h-9 px-5"
                    >
                        Batal
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md text-xs h-9 px-6"
                    >
                        {isSaving ? <Spinner className="size-3.5 mr-1.5" /> : <Save className="size-4 mr-1.5" />}
                        {isEditMode ? "Simpan Perubahan Tipe" : "Buat Tipe Infrastruktur"}
                    </Button>
                </div>
                </form>
            </div>
        </div>
    );
}
