import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
    Plus, 
    Edit, 
    Trash2, 
    Search, 
    RotateCw, 
    AlertCircle, 
    MoreHorizontal, 
    ChevronLeft, 
    RefreshCw,
    Database,
    Globe,
    FileCode,
    Sliders
} from "lucide-react";
import { cn } from "~/lib/utils";
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "~/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Spinner } from "~/components/ui/spinner";
import { Slider } from "~/components/ui/slider";
import { layerService, type Layer } from "~/features/master/services/layer.service";
import type { MetaFunction } from "react-router";

// Dnd Kit Imports for Drag and Drop Sorting
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

export const meta: MetaFunction = () => {
    return [
        { title: "Master Data Layer & CSW - MELAROSA" },
        { name: "description", content: "Halaman pengelolaan layer dinamis WebGIS (WMS/WFS/XYZ) dan sinkronisasi CSW" },
    ];
};

interface SortableRowProps {
    item: Layer;
    activeRowId: string | null;
    setActiveRowId: (id: string | null) => void;
    openEditForm: (item: Layer) => void;
    confirmDelete: (item: Layer) => void;
}

function SortableRow({
    item,
    activeRowId,
    setActiveRowId,
    openEditForm,
    confirmDelete,
}: SortableRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        position: 'relative' as const,
        zIndex: isDragging ? 50 : undefined,
    };

    return (
        <TableRow 
            ref={setNodeRef} 
            style={style} 
            className={cn("group", isDragging && "shadow-md bg-slate-50 dark:bg-slate-900 border-y border-blue-200")}
        >
            {/* Sliding Action & Drag Handle Cell */}
            <TableCell className="w-[70px] min-w-[70px] p-0 relative sticky left-0 bg-white dark:bg-slate-950 group-hover:bg-slate-50 dark:group-hover:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] z-10">
                <div className="flex items-center justify-center gap-1 h-12 w-full px-1">
                    {/* Grab Handle */}
                    <div 
                        {...attributes} 
                        {...listeners} 
                        className="cursor-grab active:cursor-grabbing p-1.5 text-slate-300 hover:text-slate-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                        title="Tarik untuk mengurutkan"
                    >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); setActiveRowId(item.id); }}
                        className="h-7 w-7 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md shrink-0"
                    >
                        <MoreHorizontal className="h-4 w-4 text-slate-500" />
                    </Button>
                </div>
                {/* Sliding Actions Panel */}
                <div className={cn(
                    "absolute top-0 bottom-0 left-0 z-20 flex items-center justify-center gap-1.5 bg-blue-50/95 dark:bg-blue-950/95 backdrop-blur-xs transition-all duration-300 ease-in-out px-2 border-r border-slate-200 dark:border-slate-800 rounded-r-xl w-[120px]",
                    activeRowId === item.id ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0 pointer-events-none"
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
                        onClick={(e) => { e.stopPropagation(); openEditForm(item); setActiveRowId(null); }}
                        title="Ubah Layer"
                    >
                        <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="outline" size="sm"
                        className="h-7 w-7 p-0 border-slate-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                        onClick={(e) => { e.stopPropagation(); confirmDelete(item); setActiveRowId(null); }}
                        title="Hapus Layer"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </TableCell>

            {/* Protocol */}
            <TableCell className="w-[100px]">
                <span className="text-[10px] font-black font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                    {item.protocol}
                </span>
            </TableCell>

            {/* Source & Sync Type */}
            <TableCell className="w-[120px]">
                <div className="flex flex-col gap-1">
                    <span className={cn(
                        "text-[9px] font-black uppercase text-center px-2 py-0.5 rounded-sm w-[75px]",
                        item.source_type === 'internal'
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                            : "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400"
                    )}>
                        {item.source_type}
                    </span>
                    {item.source_type === 'internal' && (
                        <span className={cn(
                            "text-[8px] font-bold text-center px-1.5 py-0.2 rounded-sm w-[75px]",
                            item.is_synced 
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40" 
                                : "bg-red-50 text-red-600"
                        )}>
                            {item.is_synced ? 'SYNCED' : 'NOT SYNCED'}
                        </span>
                    )}
                </div>
            </TableCell>

            {/* Name & Technical Name */}
            <TableCell>
                <div className="font-semibold text-slate-900 dark:text-slate-100">{item.name}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.layer_name || 'N/A'}</div>
            </TableCell>

            {/* Server WMS Base URL */}
            <TableCell className="max-w-xs truncate text-[11px] font-mono text-slate-500">
                {item.url}
            </TableCell>

            {/* Default Opacity */}
            <TableCell className="text-center w-[90px] font-mono">
                {Math.round((item.opacity ?? 1.0) * 100)}%
            </TableCell>

            {/* Visibility switches */}
            <TableCell className="text-center w-[90px]">
                <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                    item.default_visible 
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" 
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                )}>
                    {item.default_visible ? 'Visible' : 'Hidden'}
                </span>
            </TableCell>

            {/* Status Switch Display */}
            <TableCell className="text-center w-[90px]">
                <span className={cn(
                    "text-[10px] font-extrabold px-2 py-0.5 rounded-full",
                    item.is_active 
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" 
                        : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                )}>
                    {item.is_active ? 'AKTIF' : 'NON-AKTIF'}
                </span>
            </TableCell>
        </TableRow>
    );
}

export default function LayerManagementPage() {
    const [layers, setLayers] = useState<Layer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeRowId, setActiveRowId] = useState<string | null>(null);

    // Sync CSW Loading state
    const [isCSWSyncing, setIsCSWSyncing] = useState(false);

    // Form modal state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingItem, setEditingItem] = useState<Layer | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        protocol: "OGC:WMS" as 'OGC:WMS' | 'OGC:WFS' | 'XYZ',
        source_type: "external" as 'internal' | 'external',
        is_synced: false,
        url: "",
        layer_name: "",
        is_active: true,
        default_visible: false,
        opacity: 1.0,
        attribution: "",
        description: ""
    });

    // Delete Modal State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Layer | null>(null);

    // DnD-Kit Setup
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await layerService.getAll(false);
            setLayers(data);
        } catch (error) {
            toast.error("Gagal memuat data layer");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Filtered data based on search input
    const filteredLayers = layers.filter(l => 
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.layer_name && l.layer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        l.url.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const openCreateForm = () => {
        setEditingItem(null);
        setFormData({
            name: "",
            protocol: "OGC:WMS",
            source_type: "external",
            is_synced: false,
            url: "",
            layer_name: "",
            is_active: true,
            default_visible: false,
            opacity: 1.0,
            attribution: "",
            description: ""
        });
        setIsFormOpen(true);
    };

    const openEditForm = (item: Layer) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            protocol: item.protocol,
            source_type: item.source_type,
            is_synced: item.is_synced,
            url: item.url,
            layer_name: item.layer_name || "",
            is_active: item.is_active,
            default_visible: item.default_visible,
            opacity: item.opacity ?? 1.0,
            attribution: item.attribution || "",
            description: item.description || ""
        });
        setIsFormOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const payload = {
            ...formData,
            order: editingItem ? editingItem.order : layers.length
        };

        try {
            if (editingItem) {
                await layerService.update(editingItem.id, payload);
                toast.success("Layer berhasil diperbarui");
            } else {
                await layerService.create(payload);
                toast.success("Layer baru berhasil ditambahkan");
            }
            setIsFormOpen(false);
            loadData();
        } catch (error: any) {
            toast.error(error.message || "Gagal menyimpan data layer");
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDelete = (item: Layer) => {
        setItemToDelete(item);
        setIsDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        setIsSaving(true);
        try {
            await layerService.delete(itemToDelete.id);
            toast.success(`Layer ${itemToDelete.name} berhasil dihapus`);
            setIsDeleteDialogOpen(false);
            loadData();
        } catch (error: any) {
            toast.error(error.message || "Gagal menghapus layer");
        } finally {
            setIsSaving(false);
        }
    };

    const handleTriggerCSWSync = async () => {
        setIsCSWSyncing(true);
        toast.info("Mengirim instruksi sinkronisasi CSW ke backend...");
        try {
            const res = await layerService.syncCSW();
            toast.success(res.message || "Proses sinkronisasi CSW Geoportal telah dimulai di latar belakang.");
            
            // Reload list setelah jeda 3 detik
            setTimeout(() => {
                loadData();
            }, 3000);
        } catch (err: any) {
            toast.error(err.message || "Gagal memicu sinkronisasi CSW");
        } finally {
            setIsCSWSyncing(false);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = layers.findIndex(item => item.id === active.id);
        const newIndex = layers.findIndex(item => item.id === over.id);

        const reorderedLayers = arrayMove(layers, oldIndex, newIndex);
        
        // Update local state temporarily
        const updatedWithOrder = reorderedLayers.map((l, index) => ({
            ...l,
            order: index
        }));
        setLayers(updatedWithOrder);

        // Send order updates to backend database one-by-one or in parallel
        try {
            await Promise.all(
                updatedWithOrder.map(l => 
                    layerService.update(l.id, { order: l.order })
                )
            );
            toast.success("Urutan layer berhasil disimpan");
        } catch (error) {
            toast.error("Gagal memperbarui urutan layer");
loadData(); // Revert on failure
        }
    };

    return (
        <div className="absolute inset-0 flex flex-col gap-4 p-4 bg-background dark:bg-slate-950 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 shrink-0 pb-1 border-b border-slate-100 dark:border-slate-800/50">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Katalog Layer Spasial & CSW</h1>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">Mengelola layer eksternal/internal Geoportal dan sinkronisasi metadata.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button 
                        onClick={handleTriggerCSWSync} 
                        disabled={isCSWSyncing}
                        variant="outline"
                        className="h-9 font-semibold border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900/30 dark:text-blue-400 shrink-0"
                    >
                        {isCSWSyncing ? (
                            <Spinner className="mr-2 size-4" />
                        ) : (
                            <RefreshCw size={14} className="mr-2" />
                        )}
                        Sync CSW Geoportal
                    </Button>

                    <Button 
                        onClick={openCreateForm}
                        className="bg-blue-600 hover:bg-blue-700 h-9 text-white font-semibold gap-1.5 shrink-0"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Tambah Layer</span>
                    </Button>
                </div>
            </div>

            {/* Card Table Area with Toolbar */}
            <div className="flex-1 min-h-0 flex flex-col mb-4">
                <Card className="gap-0 py-0 overflow-hidden border dark:border-slate-800 bg-white dark:bg-slate-950 relative flex flex-col flex-1 min-h-0">
                    {/* Toolbar: Search + Actions */}
                    <div className="p-4 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-slate-50/30 dark:bg-slate-900/10 relative">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="relative w-full max-w-xs sm:max-w-sm">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Cari layer berdasarkan nama atau URL..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9 w-full"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={loadData}
                                disabled={loading}
                                className="h-9 w-9"
                                title="Muat ulang tabel"
                            >
                                <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                            </Button>
                        </div>
                    </div>

                    <CardContent className="p-0 overflow-auto custom-scrollbar flex-1 min-h-0 [&_[data-slot=table-container]]:overflow-visible">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <Spinner className="size-8 text-blue-600" />
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Memuat data layer...</p>
                            </div>
                        ) : filteredLayers.length > 0 ? (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                modifiers={[restrictToVerticalAxis]}
                                onDragEnd={handleDragEnd}
                            >
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                                            <TableRow>
                                                <TableHead className="text-center font-semibold sticky top-0 left-0 z-20 bg-slate-50 dark:bg-slate-900 border-r shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] w-[70px]">Aksi</TableHead>
                                                <TableHead className="font-semibold w-[100px]">Protokol</TableHead>
                                                <TableHead className="font-semibold w-[120px]">Tipe Sumber</TableHead>
                                                <TableHead className="font-semibold">Nama Layer</TableHead>
                                                <TableHead className="font-semibold">URL Server</TableHead>
                                                <TableHead className="text-center font-semibold w-[90px]">Opacity</TableHead>
                                                <TableHead className="text-center font-semibold w-[90px]">Default</TableHead>
                                                <TableHead className="text-center font-semibold w-[90px]">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <SortableContext
                                                items={filteredLayers.map(l => l.id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                {filteredLayers.map((layer) => (
                                                    <SortableRow
                                                        key={layer.id}
                                                        item={layer}
                                                        activeRowId={activeRowId}
                                                        setActiveRowId={setActiveRowId}
                                                        openEditForm={openEditForm}
                                                        confirmDelete={confirmDelete}
                                                    />
                                                ))}
                                            </SortableContext>
                                        </TableBody>
                                    </Table>
                                </div>
                            </DndContext>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 px-8 text-center gap-2">
                                <Database className="text-slate-200 dark:text-slate-800 mb-2" size={48} />
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Tidak ada data layer</p>
                                <p className="text-xs text-slate-500 italic max-w-sm">Daftar layer spasial masih kosong. Gunakan tombol "Sync CSW Geoportal" untuk pemadatan otomatis.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Create/Edit Dialog Form */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                            <Database className="text-blue-600" size={20} />
                            {editingItem ? "Ubah Konfigurasi Layer" : "Tambah Layer Spasial Baru"}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-2 text-left">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nama Layer (Tampilan UI)</Label>
                            <Input 
                                id="name" 
                                placeholder="Misal: Batas Administrasi Desa Bojonegoro" 
                                value={formData.name} 
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="protocol">Protokol GIS</Label>
                                <Select
                                    value={formData.protocol}
                                    onValueChange={(v) => setFormData({...formData, protocol: v as any})}
                                >
                                    <SelectTrigger id="protocol">
                                        <SelectValue placeholder="Pilih protokol..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="OGC:WMS">WMS (Web Map Service)</SelectItem>
                                        <SelectItem value="OGC:WFS">WFS (Web Feature Service)</SelectItem>
                                        <SelectItem value="XYZ">XYZ Tiles</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="source_type">Tipe Sumber Layer</Label>
                                <Select
                                    value={formData.source_type}
                                    onValueChange={(v) => setFormData({...formData, source_type: v as any})}
                                >
                                    <SelectTrigger id="source_type">
                                        <SelectValue placeholder="Pilih tipe sumber..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="external">External (Direct WMS/WFS/XYZ)</SelectItem>
                                        <SelectItem value="internal">Internal Pemkab (Download & Sync)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="url">URL Base Server</Label>
                            <Input 
                                id="url" 
                                className="font-mono text-xs"
                                placeholder="e.g. https://geoportal.bojonegorokab.go.id/geoserver/palapa/wms" 
                                value={formData.url} 
                                onChange={(e) => setFormData({...formData, url: e.target.value})}
                                required
                            />
                        </div>

                        {formData.protocol !== 'XYZ' && (
                            <div className="space-y-2">
                                <Label htmlFor="layer_name">Nama Layer Teknis (Geoserver Workspace:LayerName)</Label>
                                <Input 
                                    id="layer_name" 
                                    className="font-mono text-xs"
                                    placeholder="e.g. palapa:ADMINISTRASIDESA_AR_10K_2019_BOJONEGORO" 
                                    value={formData.layer_name} 
                                    onChange={(e) => setFormData({...formData, layer_name: e.target.value})}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Transparansi Bawaan (Opacity: {Math.round(formData.opacity * 100)}%)</Label>
                            <div className="flex items-center gap-4 pt-1">
                                <Slider
                                    value={[formData.opacity * 100]}
                                    onValueChange={(v) => setFormData({...formData, opacity: v[0] / 100})}
                                    max={100}
                                    min={0}
                                    step={5}
                                    className="flex-1"
                                />
                                <span className="text-xs font-mono font-bold w-8">{formData.opacity}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="attribution">Teks Atribusi / Hak Cipta</Label>
                            <Input 
                                id="attribution" 
                                placeholder="Misal: © Geoportal Kabupaten Bojonegoro" 
                                value={formData.attribution} 
                                onChange={(e) => setFormData({...formData, attribution: e.target.value})}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Deskripsi Singkat</Label>
                            <Input 
                                id="description" 
                                placeholder="Menjelaskan isi dataset peta ini" 
                                value={formData.description} 
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="flex items-center justify-between p-3 border rounded-xl bg-slate-50 dark:bg-slate-900/50">
                                <div className="space-y-0.5">
                                    <Label className="text-xs font-bold">Tampil Bawaan</Label>
                                    <p className="text-[9px] text-muted-foreground">Aktif saat peta dimuat</p>
                                </div>
                                <Switch 
                                    checked={formData.default_visible}
                                    onCheckedChange={(c) => setFormData({...formData, default_visible: c})}
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 border rounded-xl bg-slate-50 dark:bg-slate-900/50">
                                <div className="space-y-0.5">
                                    <Label className="text-xs font-bold">Status Aktif</Label>
                                    <p className="text-[9px] text-muted-foreground">Muncul di katalog peta</p>
                                </div>
                                <Switch 
                                    checked={formData.is_active}
                                    onCheckedChange={(c) => setFormData({...formData, is_active: c})}
                                />
                            </div>
                        </div>

                        {formData.source_type === 'internal' && (
                            <div className="flex items-center justify-between p-3 border rounded-xl bg-slate-50 dark:bg-slate-900/50">
                                <div className="space-y-0.5">
                                    <Label className="text-xs font-bold">Status Sinkronisasi Geometris</Label>
                                    <p className="text-[9px] text-muted-foreground">Tandai jika geometries telah di-sync ke tabel lokal</p>
                                </div>
                                <Switch 
                                    checked={formData.is_synced}
                                    onCheckedChange={(c) => setFormData({...formData, is_synced: c})}
                                />
                            </div>
                        )}

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-xl">Batal</Button>
                            <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 rounded-xl text-white">
                                {isSaving && <Spinner className="mr-2 size-4" />}
                                Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Alert Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-bold">Hapus Layer Spasial?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus layer <b>{itemToDelete?.name}</b> secara permanen?
                            Aksi ini akan menghapus konfigurasi layer katalog dan tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSaving} className="rounded-xl">Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isSaving} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl">
                            {isSaving ? <Spinner className="mr-2 size-4" /> : null}
                            Hapus Layer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
