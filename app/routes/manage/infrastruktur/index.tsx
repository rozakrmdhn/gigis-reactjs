import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import type { MetaFunction } from "react-router";
import { toast } from "sonner";
import {
    Layers,
    Plus,
    Edit,
    Trash2,
    Search,
    RotateCw,
    CheckCircle2,
    XCircle,
    Route,
    Waypoints,
    Landmark,
    Droplets,
    FolderKanban,
    HelpCircle
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "~/lib/utils";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { Spinner } from "~/components/ui/spinner";
import {
    infrastrukturService,
    type InfrastrukturTipe
} from "~/services/infrastruktur.service";

export const meta: MetaFunction = () => {
    return [
        { title: "Manage Tipe Infrastruktur - MELAROSA Bappeda" },
        { name: "description", content: "Halaman pengelola tipe dan jenis infrastruktur sistem GIS Bappeda" },
    ];
};

/** Dynamic Lucide icon renderer */
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

export default function ManageInfrastrukturPage() {
    const navigate = useNavigate();
    const [tipes, setTipes] = useState<InfrastrukturTipe[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"semua" | "aktif" | "nonaktif">("semua");

    // Delete confirmation state
    const [deleteTarget, setDeleteTarget] = useState<InfrastrukturTipe | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch data
    const fetchTipeList = async () => {
        setIsLoading(true);
        try {
            const data = await infrastrukturService.getAllTipeAdmin();
            setTipes(data || []);
        } catch (err: any) {
            console.error("Error loading tipe list:", err);
            toast.error("Gagal memuat daftar tipe infrastruktur");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTipeList();
    }, []);

    // Filter list
    const filteredTipes = tipes.filter(t => {
        const matchesSearch =
            t.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.kode.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.table_name.toLowerCase().includes(searchQuery.toLowerCase());

        if (statusFilter === "aktif") return matchesSearch && t.is_active;
        if (statusFilter === "nonaktif") return matchesSearch && !t.is_active;
        return matchesSearch;
    });

    // Handle Delete
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await infrastrukturService.deleteTipe(deleteTarget.id);
            setDeleteTarget(null);
            fetchTipeList();
        } catch (err: any) {
            console.error("Delete error:", err);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="absolute inset-0 flex flex-col gap-4 p-4 bg-background dark:bg-slate-950 overflow-hidden font-sans">
            {/* Header matching /admin/data-spasial/bataswilayah-desa */}
            <div className="flex items-center justify-between gap-4 shrink-0 pb-1 border-b border-slate-100 dark:border-slate-800/50">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                        Manage Tipe Infrastruktur
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                        Pengelolaan registri master tipe infrastruktur, skema geometri, dan konfigurasi peta GIS.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchTipeList}
                        disabled={isLoading}
                        className="h-9 gap-1.5 border-slate-200 dark:border-slate-800"
                    >
                        <RotateCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>
                    <Button
                        onClick={() => navigate("/admin/manage/infrastruktur/tambah")}
                        className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shrink-0"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Tambah Tipe Infrastruktur</span>
                    </Button>
                </div>
            </div>

            {/* Main Card Table Area with Toolbar (Matching Batas Desa container layout) */}
            <div className="flex-1 min-h-0 flex flex-col mb-2">
                <Card className="gap-0 py-0 overflow-hidden border dark:border-slate-800 bg-white dark:bg-slate-950 relative flex flex-col flex-1 min-h-0">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-slate-50/30 dark:bg-slate-900/10 relative">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="relative w-full max-w-xs sm:max-w-sm">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari nama, kode, atau tabel..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9 w-full text-xs"
                                />
                            </div>
                            <div className="w-[160px] shrink-0">
                                <Select
                                    value={statusFilter}
                                    onValueChange={(val: "semua" | "aktif" | "nonaktif") => setStatusFilter(val)}
                                >
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="semua" className="text-xs">Semua Status</SelectItem>
                                        <SelectItem value="aktif" className="text-xs">Aktif</SelectItem>
                                        <SelectItem value="nonaktif" className="text-xs">Non-Aktif</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Table View */}
                    <CardContent className="p-0 overflow-auto custom-scrollbar flex-1 min-h-0 [&_[data-slot=table-container]]:overflow-visible">
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                                <TableRow>
                                    <TableHead className="w-14 text-center font-semibold text-xs">Ikon</TableHead>
                                    <TableHead className="font-semibold text-xs">Nama & Kode</TableHead>
                                    <TableHead className="font-semibold text-xs">Warna Peta</TableHead>
                                    <TableHead className="font-semibold text-xs">Geometri</TableHead>
                                    <TableHead className="font-semibold text-xs">Tabel Master DB</TableHead>
                                    <TableHead className="font-semibold text-xs">Segmen</TableHead>
                                    <TableHead className="font-semibold text-xs text-center">Status</TableHead>
                                    <TableHead className="font-semibold text-xs text-right pr-4">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-32 text-center">
                                            <div className="p-4 space-y-3">
                                                <Skeleton className="h-10 w-full" />
                                                <Skeleton className="h-10 w-full" />
                                                <Skeleton className="h-10 w-full" />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredTipes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-32 text-center text-muted-foreground text-xs">
                                            Tidak ada data tipe infrastruktur yang sesuai
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTipes.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                            <TableCell className="text-center">
                                                <div
                                                    className="size-8 mx-auto rounded-lg flex items-center justify-center text-white shadow-xs"
                                                    style={{ backgroundColor: item.warna || "#3B82F6" }}
                                                >
                                                    <IconRenderer name={item.ikon} className="size-4" />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="text-xs font-semibold text-foreground">{item.nama}</p>
                                                    <span className="inline-block text-[10px] font-mono font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded mt-0.5">
                                                        {item.kode}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="size-3.5 rounded-full border border-black/10 inline-block shadow-inner"
                                                        style={{ backgroundColor: item.warna || "#3B82F6" }}
                                                    />
                                                    <span className="text-[11px] font-mono text-muted-foreground">
                                                        {item.warna || "#3B82F6"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                    {item.geom_type}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-[11px] font-mono text-muted-foreground">
                                                    {item.table_name}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {item.has_segmen ? (
                                                    <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                                                        Ya
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                                        Tidak
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {item.is_active ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                                                        <span className="size-1.5 rounded-full bg-emerald-500" />
                                                        Aktif
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-500/10 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                                                        <span className="size-1.5 rounded-full bg-slate-400" />
                                                        Non-Aktif
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right pr-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => navigate(`/admin/manage/infrastruktur/edit/${item.id}`)}
                                                        className="h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                                                        title="Edit Tipe Infrastruktur"
                                                    >
                                                        <Edit className="size-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setDeleteTarget(item)}
                                                        className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                                                        title="Hapus Tipe Infrastruktur"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Alert Dialog Hapus */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-base font-bold text-rose-600 dark:text-rose-400">
                            Hapus Tipe Infrastruktur?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs">
                            Apakah Anda yakin ingin menghapus tipe infrastruktur <strong>{deleteTarget?.nama}</strong> ({deleteTarget?.kode})?
                            Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting} className="text-xs h-8">Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-rose-600 hover:bg-rose-500 text-white text-xs h-8"
                        >
                            {isDeleting ? <Spinner className="size-3.5 mr-1" /> : null}
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
