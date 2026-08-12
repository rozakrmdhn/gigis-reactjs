import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAbility } from "~/contexts/AbilityContext";
import { 
    Plus, 
    Edit2, 
    Trash2, 
    RotateCw, 
    Search, 
    Layers, 
    Folder, 
    File,
    ExternalLink
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "~/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { Spinner } from "~/components/ui/spinner";
import { menuService, type MenuDetail } from "~/services/menu.service";
import { useNavigate } from "react-router";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
    return [
        { title: "Manajemen Menu Sidebar - MELAROSA" },
        { name: "description", content: "Halaman pengelolaan menu navigasi sidebar aplikasi" },
    ];
};

const AVAILABLE_ICONS = [
    { value: "none", label: "Tanpa Ikon" },
    { value: "IconDashboard", label: "Dashboard (Dashboard)" },
    { value: "IconMap", label: "Peta (Map)" },
    { value: "IconSettings", label: "Pengaturan (Settings)" },
    { value: "IconFileText", label: "Dokumen (FileText)" },
    { value: "IconDatabase", label: "Database (Database)" },
    { value: "IconTopologyComplex", label: "Topologi (Topology)" },
    { value: "IconClipboardList", label: "Laporan (ClipboardList)" },
    { value: "IconShield", label: "Keamanan (Shield)" }
];

export default function MenusIndex() {
    const navigate = useNavigate();
    const ability = useAbility();

    // Client-side route guard
    useEffect(() => {
        if (!ability.can("manage", "Menu")) {
            toast.error("Anda tidak memiliki akses untuk membuka halaman ini");
            navigate("/admin/dashboard", { replace: true });
        }
    }, [ability, navigate]);

    const [menus, setMenus] = useState<MenuDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<"create" | "edit">("create");
    const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        id: "",
        title: "",
        url: "",
        icon: "",
        parent_id: "none",
        order: 0
    });

    const [submitting, setSubmitting] = useState(false);

    // Delete State
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [menuToDelete, setMenuToDelete] = useState<MenuDetail | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchMenus = async () => {
        setLoading(true);
        try {
            const res = await menuService.getAllMenus();
            if (res.status === "success" && res.data) {
                setMenus(res.data);
            }
        } catch (err: any) {
            toast.error(err.message || "Gagal memuat daftar menu");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (ability.can("manage", "Menu")) {
            fetchMenus();
        }
    }, [ability]);

    const handleOpenCreate = () => {
        setFormMode("create");
        setSelectedMenuId(null);
        setFormData({
            id: "",
            title: "",
            url: "/admin/",
            icon: "none",
            parent_id: "none",
            order: menus.length + 1
        });
        setIsFormOpen(true);
    };

    const handleOpenEdit = (menu: MenuDetail) => {
        setFormMode("edit");
        setSelectedMenuId(menu.id);
        setFormData({
            id: menu.id,
            title: menu.title,
            url: menu.url,
            icon: menu.icon || "none",
            parent_id: menu.parent_id || "none",
            order: menu.order
        });
        setIsFormOpen(true);
    };

    const handleOpenDelete = (menu: MenuDetail) => {
        setMenuToDelete(menu);
        setIsDeleteOpen(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.id || !formData.title || !formData.url) {
            toast.error("Harap isi semua kolom wajib!");
            return;
        }

        setSubmitting(true);
        try {
            let res;
            if (formMode === "create") {
                const payload = {
                    id: formData.id,
                    title: formData.title,
                    url: formData.url,
                    icon: formData.icon === "none" ? null : formData.icon,
                    parent_id: formData.parent_id === "none" ? null : formData.parent_id,
                    order: Number(formData.order) || 0
                };
                res = await menuService.createMenu(payload);
            } else {
                const payload = {
                    title: formData.title,
                    url: formData.url,
                    icon: formData.icon === "none" ? null : formData.icon,
                    parent_id: formData.parent_id === "none" ? null : formData.parent_id,
                    order: Number(formData.order) || 0
                };
                res = await menuService.updateMenu(selectedMenuId!, payload);
            }

            if (res.status === "success") {
                toast.success(formMode === "create" ? "Menu baru berhasil ditambahkan!" : "Detail menu berhasil diperbarui!");
                setIsFormOpen(false);
                fetchMenus();
            }
        } catch (err: any) {
            toast.error(err.message || "Terjadi kesalahan saat menyimpan menu");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteSubmit = async () => {
        if (!menuToDelete) return;
        setDeleting(true);
        try {
            const res = await menuService.deleteMenu(menuToDelete.id);
            if (res.status === "success") {
                toast.success("Menu berhasil dihapus!");
                setIsDeleteOpen(false);
                setMenuToDelete(null);
                fetchMenus();
            }
        } catch (err: any) {
            toast.error(err.message || "Gagal menghapus menu");
        } finally {
            setDeleting(false);
        }
    };

    // Arrange parent-child menus order in tree
    const orderedMenus: MenuDetail[] = [];
    const parents = menus.filter(m => m.parent_id === null);
    parents.forEach(p => {
        orderedMenus.push(p);
        const children = menus.filter(m => m.parent_id === p.id);
        orderedMenus.push(...children);
    });

    const filteredMenus = orderedMenus.filter(m => 
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.url.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const parentOptions = menus.filter(m => m.parent_id === null && m.id !== selectedMenuId);

    if (!ability.can("manage", "Menu")) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner className="size-8 text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="absolute inset-0 flex flex-col gap-4 p-4 bg-background dark:bg-slate-950 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 shrink-0 pb-1 border-b border-slate-100 dark:border-slate-800/50">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                        <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        Manajemen Item Menu Sidebar
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                        Kelola data menu dan hierarki sub-menu sidebar yang dapat diakses oleh peran pengguna.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={fetchMenus} 
                        disabled={loading}
                        className="h-8 gap-1.5 text-xs"
                    >
                        <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button 
                        size="sm" 
                        onClick={handleOpenCreate}
                        className="h-8 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Menu
                    </Button>
                </div>
            </div>

            {/* Filter Search */}
            <div className="shrink-0 max-w-sm relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Cari menu, ID, atau URL..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-xs"
                />
            </div>

            {/* Grid Table */}
            <div className="flex-1 min-h-0 bg-card dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col shadow-sm">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Spinner className="size-8 text-indigo-600" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-auto">
                        <Table className="relative w-full border-collapse">
                            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 backdrop-blur z-10 border-b border-slate-100 dark:border-slate-800">
                                <TableRow>
                                    <TableHead className="w-[180px]">ID Menu</TableHead>
                                    <TableHead>Nama Menu</TableHead>
                                    <TableHead>Path URL</TableHead>
                                    <TableHead className="w-[120px]">Ikon</TableHead>
                                    <TableHead className="w-[80px] text-center">Urutan</TableHead>
                                    <TableHead className="w-[100px] text-center">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMenus.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                                            Tidak ada data menu ditemukan
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredMenus.map((menu) => {
                                        const isParent = menu.parent_id === null;
                                        return (
                                            <TableRow 
                                                key={menu.id} 
                                                className={isParent ? "bg-slate-50/20 dark:bg-slate-900/10 font-medium" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"}
                                            >
                                                <TableCell className="font-mono text-xs text-slate-500">
                                                    {menu.id}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        {isParent ? (
                                                            <Folder className="w-3.5 h-3.5 text-indigo-500" />
                                                        ) : (
                                                            <span className="text-slate-400 pl-4 mr-0.5">└─</span>
                                                        )}
                                                        {!isParent && <File className="w-3.5 h-3.5 text-slate-400" />}
                                                        <span>{menu.title}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                                                    <span className="flex items-center gap-1 font-mono text-[11px]">
                                                        {menu.url}
                                                        <ExternalLink className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500 font-mono">
                                                    {menu.icon || "-"}
                                                </TableCell>
                                                <TableCell className="text-xs text-center font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                                                    {menu.order}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="w-7 h-7 hover:text-indigo-600 dark:hover:text-indigo-400"
                                                            onClick={() => handleOpenEdit(menu)}
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="w-7 h-7 hover:text-red-650 text-slate-400 dark:hover:text-red-400"
                                                            onClick={() => handleOpenDelete(menu)}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* Form Dialog (Create / Edit) */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">
                            {formMode === "create" ? "Tambah Menu Baru" : "Edit Detail Menu"}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Masukkan data detail menu navigasi sidebar di bawah ini.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleFormSubmit} className="space-y-4 py-2">
                        <div className="grid grid-cols-4 items-center gap-3">
                            <Label htmlFor="id" className="text-right text-xs font-semibold">
                                ID Menu <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="id"
                                disabled={formMode === "edit"}
                                placeholder="e.g. master_users"
                                value={formData.id}
                                onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                                className="col-span-3 h-9 text-xs font-mono"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-3">
                            <Label htmlFor="title" className="text-right text-xs font-semibold">
                                Nama Menu <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="title"
                                placeholder="e.g. Manajemen User"
                                value={formData.title}
                                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                className="col-span-3 h-9 text-xs"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-3">
                            <Label htmlFor="url" className="text-right text-xs font-semibold">
                                URL Path <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="url"
                                placeholder="e.g. /admin/master/users"
                                value={formData.url}
                                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                                className="col-span-3 h-9 text-xs font-mono"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-3">
                            <Label htmlFor="parent_id" className="text-right text-xs font-semibold">
                                Menu Induk
                            </Label>
                            <div className="col-span-3">
                                <Select
                                    value={formData.parent_id}
                                    onValueChange={(val) => setFormData(prev => ({ ...prev, parent_id: val }))}
                                >
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Pilih Induk Menu (Opsional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none" className="text-xs">
                                            Tanpa Induk (Menu Utama)
                                        </SelectItem>
                                        {parentOptions.map(p => (
                                            <SelectItem key={p.id} value={p.id} className="text-xs">
                                                {p.title} ({p.id})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-3">
                            <Label htmlFor="icon" className="text-right text-xs font-semibold">
                                Ikon Menu
                            </Label>
                            <div className="col-span-3">
                                <Select
                                    value={formData.icon}
                                    onValueChange={(val) => setFormData(prev => ({ ...prev, icon: val }))}
                                >
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Pilih Ikon" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {AVAILABLE_ICONS.map(i => (
                                            <SelectItem key={i.value} value={i.value} className="text-xs">
                                                {i.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-3">
                            <Label htmlFor="order" className="text-right text-xs font-semibold">
                                Urutan Tampil
                            </Label>
                            <Input
                                id="order"
                                type="number"
                                value={formData.order}
                                onChange={(e) => setFormData(prev => ({ ...prev, order: Number(e.target.value) }))}
                                className="col-span-3 h-9 text-xs"
                            />
                        </div>
                        <DialogFooter className="mt-5">
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => setIsFormOpen(false)}
                                disabled={submitting}
                                className="text-xs h-9"
                            >
                                Batal
                            </Button>
                            <Button 
                                type="submit" 
                                size="sm"
                                disabled={submitting}
                                className="text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                            >
                                {submitting ? "Menyimpan..." : "Simpan Perubahan"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader className="gap-2">
                        <DialogTitle className="text-lg font-bold">Hapus Item Menu?</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Apakah Anda yakin ingin menghapus menu <strong>{menuToDelete?.title}</strong> ({menuToDelete?.id})?
                            Tindakan ini juga akan menghapus sub-menu di dalamnya serta pemetaan hak akses peran untuk menu ini dari database.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsDeleteOpen(false)}
                            disabled={deleting}
                            className="text-xs h-9 flex-1"
                        >
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteSubmit}
                            disabled={deleting}
                            className="text-xs h-9 flex-1 bg-red-650 hover:bg-red-700 text-white"
                        >
                            {deleting ? "Menghapus..." : "Hapus Permanen"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
