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
    Save 
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
import { basemapService, type Basemap } from "~/features/master/services/basemap.service";
import type { MetaFunction } from "react-router";

// Dnd Kit Imports
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
        { title: "Master Data Basemap - MELAROSA" },
        { name: "description", content: "Halaman pengelolaan pilihan basemap dinamis dengan drag-and-drop" },
    ];
};

interface SortableRowProps {
    item: Basemap;
    activeRowId: string | null;
    setActiveRowId: (id: string | null) => void;
    openEditForm: (item: Basemap) => void;
    confirmDelete: (item: Basemap) => void;
    isSaving: boolean;
}

function SortableRow({
    item,
    activeRowId,
    setActiveRowId,
    openEditForm,
    confirmDelete,
    isSaving
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
                        className="cursor-grab active:cursor-grabbing p-1.5 text-slate-350 hover:text-slate-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
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
                        title="Ubah Basemap"
                    >
                        <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="outline" size="sm"
                        className="h-7 w-7 p-0 border-slate-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                        onClick={(e) => { e.stopPropagation(); confirmDelete(item); setActiveRowId(null); }}
                        title="Hapus Basemap"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </TableCell>

            {/* Order Value Display */}
            <TableCell className="font-mono font-bold text-center w-[85px] text-slate-500">
                {item.order}
            </TableCell>

            {/* Preview image */}
            <TableCell className="w-[80px]">
                {item.thumbnail ? (
                    <div className="w-12 h-12 rounded-lg border overflow-hidden bg-white">
                        <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                ) : (
                    <div className="w-12 h-12 rounded-lg border bg-slate-100 flex items-center justify-center text-[10px] text-muted-foreground">N/A</div>
                )}
            </TableCell>

            {/* Name & Attribution */}
            <TableCell>
                <div className="font-semibold text-slate-900 dark:text-slate-100">{item.name}</div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">{item.attribution}</div>
            </TableCell>

            {/* Tile URL */}
            <TableCell>
                <div className="max-w-xs truncate text-[12px] font-mono bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded text-slate-600 dark:text-slate-400">
                    {item.url}
                </div>
            </TableCell>

            {/* Status */}
            <TableCell className="text-center w-[120px]">
                <span className={cn(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                    item.is_active 
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                )}>
                    {item.is_active ? "Aktif" : "Non-Aktif"}
                </span>
            </TableCell>
        </TableRow>
    );
}

export default function MasterBasemapsPage() {
    const [basemaps, setBasemaps] = useState<Basemap[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Dialog States
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Basemap | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // Delete Alert State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Basemap | null>(null);

    // Active row for sliding actions panel
    const [activeRowId, setActiveRowId] = useState<string | null>(null);

    // Dnd sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // require drag movement of 8px so clicks work correctly
            },
        })
    );

    // Form State
    const [formData, setFormData] = useState<Partial<Basemap>>({
        name: "",
        url: "",
        attribution: "",
        thumbnail: "",
        is_active: true,
        description: "",
        order: 0,
        cross_origin: "anonymous"
    });

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await basemapService.getAll(false);
            // Sort by order ASC, then name ASC
            const sortedData = data.sort((a, b) => {
                if (a.order !== b.order) return a.order - b.order;
                return a.name.localeCompare(b.name);
            });
            setBasemaps(sortedData);
        } catch (error) {
            console.error(error);
            toast.error("Gagal memuat data basemap");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const openCreateForm = () => {
        setEditingItem(null);
        setFormData({
            name: "",
            url: "",
            attribution: "",
            thumbnail: "",
            is_active: true,
            description: "",
            order: basemaps.length > 0 ? Math.max(...basemaps.map(b => b.order)) + 1 : 0,
            cross_origin: "anonymous"
        });
        setIsFormOpen(true);
    };

    const openEditForm = (item: Basemap) => {
        setEditingItem(item);
        setFormData({ ...item });
        setIsFormOpen(true);
    };

    const confirmDelete = (item: Basemap) => {
        setItemToDelete(item);
        setIsDeleteDialogOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // Strip out metadata fields that backend Joi validation doesn't accept
            const { id, created_at, updated_at, ...payload } = formData;
            if (editingItem) {
                await basemapService.update(editingItem.id, payload);
                toast.success("Basemap berhasil diubah");
            } else {
                await basemapService.create(payload);
                toast.success("Basemap berhasil ditambahkan");
            }
            setIsFormOpen(false);
            loadData();
        } catch (error: any) {
            console.error(error);
            toast.error(error?.response?.data?.message || "Gagal menyimpan basemap");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        setIsSaving(true);
        try {
            await basemapService.delete(itemToDelete.id);
            toast.success("Basemap berhasil dihapus");
            setIsDeleteDialogOpen(false);
            loadData();
        } catch (error) {
            console.error(error);
            toast.error("Gagal menghapus basemap");
        } finally {
            setIsSaving(false);
            setItemToDelete(null);
        }
    };

    // Handle Drag End event
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = basemaps.findIndex((b) => b.id === active.id);
        const newIndex = basemaps.findIndex((b) => b.id === over.id);

        const newBasemaps = arrayMove(basemaps, oldIndex, newIndex);
        
        // Re-assign order based on index
        const updatedBasemaps = newBasemaps.map((item, idx) => ({
            ...item,
            order: idx
        }));
        
        setBasemaps(updatedBasemaps);
        setIsSaving(true);
        try {
            // Save the new orders to database sequentially
            for (let i = 0; i < updatedBasemaps.length; i++) {
                const item = updatedBasemaps[i];
                // Only trigger update if the order property actually changed
                if (basemaps.find(b => b.id === item.id)?.order !== item.order) {
                    await basemapService.update(item.id, { order: item.order });
                }
            }
            toast.success("Urutan basemap berhasil diperbarui");
        } catch (error) {
            console.error(error);
            toast.error("Gagal memperbarui urutan ke database");
            loadData(); // Revert back
        } finally {
            setIsSaving(false);
        }
    };

    const filteredData = basemaps.filter(b => 
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        b.url.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="absolute inset-0 flex flex-col gap-4 p-4 bg-background dark:bg-slate-950 overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between gap-4 shrink-0 pb-1 border-b border-slate-100 dark:border-slate-800/50">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Master Data Basemap</h1>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">Kelola basemap dinamis. Geser ikon grip sebelah kiri untuk mengurutkan.</p>
                </div>
                <Button onClick={openCreateForm} className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shrink-0">
                    <Plus className="h-4 w-4" />
                    <span>Tambah Basemap</span>
                </Button>
            </div>

            {/* Card Table Area with Toolbar */}
            <div className="flex-1 min-h-0 flex flex-col mb-4">
                <Card className="gap-0 py-0 overflow-hidden border dark:border-slate-800 bg-white dark:bg-slate-950 relative flex flex-col flex-1 min-h-0">
                    
                    {/* Toolbar */}
                    <div className="p-4 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-slate-50/30 dark:bg-slate-900/10 relative">
                        <div className="relative w-full max-w-xs sm:max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari basemap..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 h-9 w-full"
                            />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9"
                                onClick={loadData}
                                disabled={isLoading}
                            >
                                <RotateCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                            </Button>
                        </div>
                    </div>

                    {/* Table Body wrapped in DND Context */}
                    <CardContent className="p-0 overflow-auto custom-scrollbar flex-1 min-h-0 [&_[data-slot=table-container]]:overflow-visible">
                        {isLoading ? (
                            <div className="flex justify-center items-center py-20 text-muted-foreground">
                                <Spinner className="size-8 mr-3" /> Memuat data...
                            </div>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                                modifiers={[restrictToVerticalAxis]}
                            >
                                <Table>
                                    <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="text-center font-semibold sticky top-0 left-0 z-20 bg-slate-50 dark:bg-slate-900 border-r shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] w-[70px]">Aksi</TableHead>
                                            <TableHead className="font-semibold text-center w-[85px]">Urutan</TableHead>
                                            <TableHead className="font-semibold w-[80px]">Preview</TableHead>
                                            <TableHead className="font-semibold">Nama Basemap</TableHead>
                                            <TableHead className="font-semibold">Tile URL</TableHead>
                                            <TableHead className="font-semibold w-[120px] text-center">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredData.length > 0 ? (
                                            <SortableContext
                                                items={filteredData.map((item) => item.id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                {filteredData.map((item, index) => (
                                                    <SortableRow
                                                        key={item.id}
                                                        item={item}
                                                        activeRowId={activeRowId}
                                                        setActiveRowId={setActiveRowId}
                                                        openEditForm={openEditForm}
                                                        confirmDelete={confirmDelete}
                                                        isSaving={isSaving}
                                                    />
                                                ))}
                                            </SortableContext>
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-40 text-center">
                                                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                        <AlertCircle className="size-8 mb-2 opacity-20" />
                                                        <p>Tidak ada data basemap ditemukan</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </DndContext>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Form Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? "Ubah Basemap" : "Tambah Basemap Baru"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nama Basemap</Label>
                            <Input 
                                id="name" 
                                placeholder="Misal: OpenStreetMap" 
                                value={formData.name} 
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="url">Tile URL (Gunakan {`{x}`}, {`{y}`}, {`{z}`})</Label>
                            <Input 
                                id="url" 
                                className="font-mono text-sm"
                                placeholder="Misal: https://tile.openstreetmap.org/{z}/{x}/{y}.png" 
                                value={formData.url} 
                                onChange={(e) => setFormData({...formData, url: e.target.value})}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="attribution">Teks Atribusi (Copyright)</Label>
                            <Input 
                                id="attribution" 
                                placeholder="Misal: © OpenStreetMap contributors" 
                                value={formData.attribution} 
                                onChange={(e) => setFormData({...formData, attribution: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="thumbnail">Thumbnail URL (Opsional)</Label>
                            <Input 
                                id="thumbnail" 
                                placeholder="URL gambar untuk preview (64x64px)" 
                                value={formData.thumbnail || ""} 
                                onChange={(e) => setFormData({...formData, thumbnail: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="order">Urutan Tampilan</Label>
                            <Input 
                                id="order" 
                                type="number" 
                                value={formData.order} 
                                onChange={(e) => setFormData({...formData, order: parseInt(e.target.value) || 0})}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cross_origin">Dukungan CORS (crossOrigin)</Label>
                            <Select
                                value={formData.cross_origin || "anonymous"}
                                onValueChange={(v) => setFormData({...formData, cross_origin: v})}
                            >
                                <SelectTrigger id="cross_origin" className="w-full">
                                    <SelectValue placeholder="Pilih tipe CORS..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="anonymous">Ya (Anonymous) - Untuk OSM/Google/Carto</SelectItem>
                                    <SelectItem value="none">Tidak - Untuk ATRBPN/WMS Lokal yang memblokir CORS</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-slate-500 leading-relaxed">
                                Pilih "Tidak" jika basemap mengalami CORS error saat dimuat di peta.
                            </p>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-900/50 mt-2">
                            <div className="space-y-0.5">
                                <Label className="text-base">Status Aktif</Label>
                                <p className="text-xs text-muted-foreground">Basemap akan muncul di daftar pilihan peta</p>
                            </div>
                            <Switch 
                                checked={formData.is_active}
                                onCheckedChange={(c) => setFormData({...formData, is_active: c})}
                            />
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Batal</Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Spinner className="mr-2 size-4" />}
                                Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Alert */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Basemap?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus basemap <b>{itemToDelete?.name}</b> secara permanen?
                            Aksi ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSaving}>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isSaving} className="bg-rose-600 hover:bg-rose-700">
                            {isSaving ? <Spinner className="mr-2 size-4" /> : null}
                            Hapus Permanen
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
