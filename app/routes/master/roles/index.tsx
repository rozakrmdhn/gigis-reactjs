import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAbility } from "~/contexts/AbilityContext";
import { 
    Plus, 
    Edit, 
    Trash2, 
    RotateCw, 
    Save,
    ShieldAlert,
    ShieldCheck,
    Lock,
    Settings,
    FileText
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
import { Textarea } from "~/components/ui/textarea";
import { Spinner } from "~/components/ui/spinner";
import { roleService, type RoleDetail } from "~/services/role.service";
import { authService } from "~/services/auth.service";
import { useNavigate } from "react-router";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
    return [
        { title: "Manajemen Peran & Jabatan - MELAROSA" },
        { name: "description", content: "Halaman pengurusan data peran/role akses pengguna aplikasi" },
    ];
};

const DEFAULT_ROLES = ["super_admin", "operator_bappeda", "operator_kecamatan", "operator_desa"];

export default function RolesIndex() {
    const navigate = useNavigate();
    const ability = useAbility();

    // Client-side route guard: only users with manage Role ability can open this page
    useEffect(() => {
        if (!ability.can("manage", "Role")) {
            toast.error("Anda tidak memiliki akses untuk membuka halaman ini");
            navigate("/admin/dashboard", { replace: true });
        }
    }, [ability, navigate]);

    const [roles, setRoles] = useState<RoleDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<RoleDetail | null>(null);

    // Form states
    const [formId, setFormId] = useState("");
    const [formName, setFormName] = useState("");
    const [formDescription, setFormDescription] = useState("");

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const res = await roleService.getRoles();
            if (res.status === "success" && res.data) {
                setRoles(res.data);
            }
        } catch (err: any) {
            toast.error(err.message || "Gagal mengambil data peran dari server");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (ability.can("manage", "Role")) {
            fetchRoles();
        }
    }, [ability]);

    const openAddDialog = () => {
        setEditingRole(null);
        setFormId("");
        setFormName("");
        setFormDescription("");
        setDialogOpen(true);
    };

    const openEditDialog = (role: RoleDetail) => {
        setEditingRole(role);
        setFormId(role.id);
        setFormName(role.name);
        setFormDescription(role.description || "");
        setDialogOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formId.trim().length < 3) {
            toast.error("Kode Peran (ID) minimal 3 karakter!");
            return;
        }
        if (formName.trim().length < 3) {
            toast.error("Nama Peran minimal 3 karakter!");
            return;
        }

        try {
            if (editingRole) {
                const res = await roleService.updateRole(editingRole.id, {
                    name: formName,
                    description: formDescription
                });
                if (res.status === "success") {
                    toast.success("Peran berhasil diperbarui");
                    setDialogOpen(false);
                    fetchRoles();
                }
            } else {
                const res = await roleService.createRole({
                    id: formId,
                    name: formName,
                    description: formDescription
                });
                if (res.status === "success") {
                    toast.success("Peran baru berhasil ditambahkan");
                    setDialogOpen(false);
                    fetchRoles();
                }
            }
        } catch (err: any) {
            toast.error(err.message || "Terjadi kesalahan saat menyimpan data");
        }
    };

    const handleDelete = async (id: string) => {
        if (DEFAULT_ROLES.includes(id)) {
            toast.error("Peran default bawaan sistem tidak boleh dihapus!");
            return;
        }

        if (!confirm("Apakah Anda yakin ingin menghapus peran ini? Menghapus peran akan berdampak pada pengguna yang menggunakan peran ini.")) {
            return;
        }

        try {
            const res = await roleService.deleteRole(id);
            if (res.status === "success") {
                toast.success("Peran berhasil dihapus");
                fetchRoles();
            }
        } catch (err: any) {
            toast.error(err.message || "Gagal menghapus peran");
        }
    };

    if (!ability.can("manage", "Role")) {
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
                        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        Manajemen Peran & Tingkat Jabatan (Role List)
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                        Kelola peran akses dinamis untuk mengkategorikan hak akses pengguna yang terdaftar di aplikasi.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={fetchRoles} 
                        disabled={loading}
                        className="h-8 gap-1.5 text-xs"
                    >
                        <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button 
                        size="sm" 
                        onClick={openAddDialog}
                        className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Peran
                    </Button>
                </div>
            </div>

            {/* Info Alert Banner */}
            <div className="shrink-0 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-lg flex gap-3 text-blue-800 dark:text-blue-300">
                <ShieldAlert className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-500" />
                <div className="text-xs">
                    <strong>Peran Bawaan Sistem:</strong> Peran `super_admin`, `operator_bappeda`, and `operator_desa` adalah peran inti dari logika otorisasi aplikasi. Peran ini dilindungi sehingga tidak dapat dihapus, namun deskripsi dan namanya masih dapat Anda sesuaikan.
                </div>
            </div>

            {/* Table Container */}
            <div className="flex-1 min-h-0 bg-card dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col shadow-sm">
                {loading && roles.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Spinner className="size-8 text-indigo-600" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-auto">
                        <Table className="relative w-full border-collapse">
                            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 backdrop-blur z-10 border-b border-slate-100 dark:border-slate-800">
                                <TableRow>
                                    <TableHead className="w-[220px]">Kode Peran (ID)</TableHead>
                                    <TableHead className="w-[280px]">Nama Peran</TableHead>
                                    <TableHead>Deskripsi Peran</TableHead>
                                    <TableHead className="w-[100px] text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {roles.map((role) => (
                                    <TableRow key={role.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                        <TableCell className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                                            {role.id}
                                            {DEFAULT_ROLES.includes(role.id) && (
                                                <span className="ml-2 inline-flex items-center px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] rounded font-sans uppercase font-bold border border-slate-200/50">
                                                    System Default
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                                            {role.name}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground leading-relaxed">
                                            {role.description || <span className="italic text-slate-400">Tidak ada deskripsi</span>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                                                    onClick={() => openEditDialog(role)}
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="w-8 h-8 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 text-slate-600 dark:text-slate-400"
                                                    onClick={() => handleDelete(role.id)}
                                                    disabled={DEFAULT_ROLES.includes(role.id)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* Dialog Form */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[440px]">
                    <form onSubmit={handleSave} className="space-y-4">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Settings className="w-5 h-5 text-emerald-600" />
                                {editingRole ? "Edit Peran" : "Tambah Peran Baru"}
                            </DialogTitle>
                            <DialogDescription>
                                Masukkan nama dan deskripsi peran kustom untuk mengelompokkan hak akses pengguna.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3.5">
                            {/* Role ID (only enabled for new roles) */}
                            <div className="space-y-1.5">
                                <Label htmlFor="roleId">Kode Peran (ID)</Label>
                                <Input 
                                    id="roleId"
                                    placeholder="contoh: operator_baru, kepala_dinas"
                                    value={formId}
                                    onChange={(e) => setFormId(e.target.value)}
                                    disabled={!!editingRole}
                                    required
                                    className="font-mono text-xs"
                                />
                                {!editingRole && (
                                    <p className="text-[9px] text-muted-foreground leading-none">
                                        * Hanya karakter huruf kecil, angka, dan underscore yang diperbolehkan.
                                    </p>
                                )}
                            </div>

                            {/* Role Name */}
                            <div className="space-y-1.5">
                                <Label htmlFor="roleName">Nama Peran</Label>
                                <Input 
                                    id="roleName"
                                    placeholder="contoh: Kepala Dinas, Operator Baru"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <Label htmlFor="description">Deskripsi Peran</Label>
                                <Textarea 
                                    id="description"
                                    placeholder="Jelaskan peran ini digunakan untuk hak akses apa saja..."
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    className="min-h-[90px] text-xs leading-relaxed"
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setDialogOpen(false)}
                                className="h-9 text-xs"
                            >
                                Batal
                            </Button>
                            <Button 
                                type="submit"
                                className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                            >
                                <Save className="w-3.5 h-3.5" />
                                Simpan Peran
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
