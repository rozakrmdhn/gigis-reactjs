import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAbility } from "~/contexts/AbilityContext";
import { subject } from "@casl/ability";
import { 
    Plus, 
    Edit, 
    Trash2, 
    RotateCw, 
    AlertTriangle, 
    Save,
    Shield,
    Lock,
    Settings,
    FileCode
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
import { Textarea } from "~/components/ui/textarea";
import { Spinner } from "~/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { permissionService, type PermissionDetail } from "~/services/permission.service";
import { roleService, type RoleDetail } from "~/services/role.service";
import { authService } from "~/services/auth.service";
import { useNavigate } from "react-router";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
    return [
        { title: "Manajemen Hak Akses & Peran - MELAROSA" },
        { name: "description", content: "Halaman pengurusan matriks otorisasi dan perizinan akses aplikasi" },
    ];
};

export default function PermissionsIndex() {
    const navigate = useNavigate();
    const ability = useAbility();

    // Client-side route guard: only users with manage Permission ability can open this page
    useEffect(() => {
        if (!ability.can("manage", "Permission")) {
            toast.error("Anda tidak memiliki akses untuk membuka halaman ini");
            navigate("/admin/dashboard", { replace: true });
        }
    }, [ability, navigate]);

    const [permissions, setPermissions] = useState<PermissionDetail[]>([]);
    const [roles, setRoles] = useState<RoleDetail[]>([]);
    const [activeTab, setActiveTab] = useState("");
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPermission, setEditingPermission] = useState<PermissionDetail | null>(null);

    // Form states
    const [formRole, setFormRole] = useState("");
    const [formAction, setFormAction] = useState("");
    const [formSubject, setFormSubject] = useState("");
    const [formConditions, setFormConditions] = useState("");

    const fetchPermissionsAndRoles = async () => {
        setLoading(true);
        try {
            const [permRes, roleRes] = await Promise.all([
                permissionService.getPermissions(),
                roleService.getRoles()
            ]);
            if (permRes.status === "success" && permRes.data) {
                setPermissions(permRes.data);
            }
            if (roleRes.status === "success" && roleRes.data) {
                setRoles(roleRes.data);
                if (roleRes.data.length > 0 && !activeTab) {
                    setActiveTab(roleRes.data[0].id);
                }
            }
        } catch (err: any) {
            toast.error(err.message || "Gagal mengambil data dari server");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (ability.can("manage", "Permission")) {
            fetchPermissionsAndRoles();
        }
    }, [ability]);

    const openAddDialog = () => {
        setEditingPermission(null);
        setFormRole(activeTab || (roles.length > 0 ? roles[0].id : ""));
        setFormAction("read");
        setFormSubject("UsulanDesa");
        setFormConditions("");
        setDialogOpen(true);
    };

    const openEditDialog = (perm: PermissionDetail) => {
        setEditingPermission(perm);
        setFormRole(perm.role);
        setFormAction(perm.action);
        setFormSubject(perm.subject);
        setFormConditions(perm.conditions ? JSON.stringify(perm.conditions, null, 2) : "");
        setDialogOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let parsedConditions = null;
        if (formConditions.trim() !== "") {
            try {
                parsedConditions = JSON.parse(formConditions);
            } catch (err) {
                toast.error("Format JSON pada Conditions tidak valid!");
                return;
            }
        }

        const payload = {
            role: formRole,
            action: formAction,
            subject: formSubject,
            conditions: parsedConditions
        };

        try {
            if (editingPermission) {
                const res = await permissionService.updatePermission(editingPermission.id, payload);
                if (res.status === "success") {
                    toast.success("Hak akses berhasil diperbarui");
                    setDialogOpen(false);
                    fetchPermissionsAndRoles();
                }
            } else {
                const res = await permissionService.createPermission(payload);
                if (res.status === "success") {
                    toast.success("Hak akses baru berhasil ditambahkan");
                    setDialogOpen(false);
                    fetchPermissionsAndRoles();
                }
            }
        } catch (err: any) {
            toast.error(err.message || "Terjadi kesalahan saat menyimpan data");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus hak akses ini? Tindakan ini langsung berdampak secara global.")) {
            return;
        }

        try {
            const res = await permissionService.deletePermission(id);
            if (res.status === "success") {
                toast.success("Hak akses berhasil dihapus");
                fetchPermissionsAndRoles();
            }
        } catch (err: any) {
            toast.error(err.message || "Gagal menghapus hak akses");
        }
    };

    if (!ability.can("manage", "Permission")) {
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
                        <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        Manajemen Hak Akses per Peran (CASL Matrix)
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                        Kelola izin otorisasi CASL secara reaktif dengan pengelompokan berdasarkan masing-masing peran pengguna.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={fetchPermissionsAndRoles} 
                        disabled={loading}
                        className="h-8 gap-1.5 text-xs"
                    >
                        <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button 
                        size="sm" 
                        onClick={openAddDialog}
                        disabled={roles.length === 0}
                        className="h-8 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Aturan
                    </Button>
                </div>
            </div>

            {/* Warning Alert Banner */}
            <div className="shrink-0 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg flex gap-3 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-500" />
                <div className="text-xs">
                    <strong>Peringatan Keamanan:</strong> Perubahan aturan otorisasi di sini langsung berdampak secara global dan real-time pada seluruh API backend dan tampilan frontend. Harap berhati-hati agar tidak menghapus atau mengubah aturan default `super_admin` (`manage` `all`) untuk menghindari terkuncinya akses sistem.
                </div>
            </div>

            {/* Tabs container spans full remaining space */}
            {loading && roles.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <Spinner className="size-8 text-indigo-600" />
                </div>
            ) : roles.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
                    <Lock className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                    <div>
                        <p className="text-sm font-semibold">Belum Ada Peran Terdaftar</p>
                        <p className="text-xs">Silakan daftarkan peran terlebih dahulu pada halaman Manajemen Peran.</p>
                    </div>
                </div>
            ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col gap-3">
                    {/* Tab Selection */}
                    <div className="shrink-0 overflow-x-auto pb-1">
                        <TabsList className="bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-1 rounded-xl w-max flex gap-1">
                            {roles.map((role) => (
                                <TabsTrigger 
                                    key={role.id} 
                                    value={role.id}
                                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-sm rounded-lg px-3 py-1.5 text-xs font-semibold"
                                >
                                    {role.name}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    {/* Tab Contents */}
                    {roles.map((role) => {
                        const rolePermissions = permissions.filter(p => p.role === role.id);
                        return (
                            <TabsContent key={role.id} value={role.id} className="flex-1 min-h-0 flex flex-col data-[state=inactive]:hidden m-0">
                                <div className="flex-1 min-h-0 bg-card dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col shadow-sm">
                                    <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                                Daftar Aturan: {role.name}
                                            </h3>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                {role.description || "Tidak ada deskripsi peran."}
                                            </p>
                                        </div>
                                        <span className="font-mono text-[10px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded border border-indigo-100/50 dark:border-indigo-900/30">
                                            role: {role.id}
                                        </span>
                                    </div>

                                    {rolePermissions.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
                                            <Lock className="w-10 h-10 text-slate-300 dark:text-slate-700" />
                                            <div>
                                                <p className="text-xs font-semibold">Belum Ada Aturan Hak Akses</p>
                                                <p className="text-[11px]">Tambahkan aturan hak akses untuk peran {role.name}.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 overflow-auto">
                                            <Table className="relative w-full border-collapse">
                                                <TableHeader className="bg-slate-50/30 dark:bg-slate-900/30 sticky top-0 backdrop-blur z-10 border-b border-slate-100 dark:border-slate-800">
                                                    <TableRow>
                                                        <TableHead className="w-[150px]">Aksi (Action)</TableHead>
                                                        <TableHead className="w-[200px]">Subjek (Subject)</TableHead>
                                                        <TableHead>Kondisi Filter (Conditions)</TableHead>
                                                        <TableHead className="w-[100px] text-right">Aksi</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {rolePermissions.map((perm) => (
                                                        <TableRow key={perm.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                                            <TableCell>
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                                                                    perm.action === 'manage' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300' :
                                                                    perm.action === 'read' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' :
                                                                    'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                                                }`}>
                                                                    {perm.action}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">{perm.subject}</TableCell>
                                                            <TableCell>
                                                                {perm.conditions ? (
                                                                    <code className="text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-800 dark:text-slate-200 block max-w-lg overflow-x-auto whitespace-pre-wrap font-mono border border-slate-200/50 dark:border-slate-700/50">
                                                                        {JSON.stringify(perm.conditions)}
                                                                    </code>
                                                                ) : (
                                                                    <span className="text-xs text-slate-400 italic">Tanpa syarat (Akses Penuh)</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    <Button 
                                                                        type="button"
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                                                                        onClick={() => openEditDialog(perm)}
                                                                    >
                                                                        <Edit className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                    <Button 
                                                                        type="button"
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="w-8 h-8 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 text-slate-600 dark:text-slate-400"
                                                                        onClick={() => handleDelete(perm.id)}
                                                                        disabled={perm.role === 'super_admin' && perm.action === 'manage' && perm.subject === 'all'}
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
                            </TabsContent>
                        );
                    })}
                </Tabs>
            )}

            {/* Dialog Form */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <form onSubmit={handleSave} className="space-y-4">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Settings className="w-5 h-5 text-indigo-600" />
                                {editingPermission ? "Edit Aturan Hak Akses" : "Tambah Aturan Baru"}
                            </DialogTitle>
                            <DialogDescription>
                                Konfigurasikan baris otorisasi CASL baru di bawah ini. Aturan akan dievaluasi langsung oleh backend dan frontend.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3.5">
                            {/* Role Dropdown */}
                            <div className="space-y-1.5">
                                <Label htmlFor="role">Pilih Peran (Role)</Label>
                                <Select value={formRole} onValueChange={setFormRole}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih Peran" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map(role => (
                                            <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Action Input/Select */}
                            <div className="space-y-1.5">
                                <Label htmlFor="action">Aksi (Action)</Label>
                                <Select value={formAction} onValueChange={setFormAction}>
                                    <SelectTrigger className="font-mono">
                                        <SelectValue placeholder="Pilih Aksi" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="manage">manage (Semua Aksi)</SelectItem>
                                        <SelectItem value="read">read (Melihat Data)</SelectItem>
                                        <SelectItem value="create">create (Membuat Data)</SelectItem>
                                        <SelectItem value="update">update (Mengedit Data)</SelectItem>
                                        <SelectItem value="delete">delete (Menghapus Data)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Subject Select/Input */}
                            <div className="space-y-1.5">
                                <Label htmlFor="subject">Subjek Sumber Data (Subject)</Label>
                                <Select value={formSubject} onValueChange={setFormSubject}>
                                    <SelectTrigger className="font-mono">
                                        <SelectValue placeholder="Pilih Subjek" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">all (Semua Subjek)</SelectItem>
                                        <SelectItem value="User">User (Manajemen Akun)</SelectItem>
                                        <SelectItem value="UsulanDesa">UsulanDesa (Usulan Kegiatan Desa)</SelectItem>
                                        <SelectItem value="BatasDesa">BatasDesa (Spasial Batas Desa)</SelectItem>
                                        <SelectItem value="BatasKecamatan">BatasKecamatan (Spasial Batas Kecamatan)</SelectItem>
                                        <SelectItem value="Jalan">Jalan (Spasial Data Jalan)</SelectItem>
                                        <SelectItem value="Basemap">Basemap (Konfigurasi Basemap)</SelectItem>
                                        <SelectItem value="Permission">Permission (Manajemen Hak Akses)</SelectItem>
                                        <SelectItem value="Role">Role (Manajemen Peran)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Conditions JSON Textarea */}
                            <div className="space-y-1.5">
                                <Label htmlFor="conditions" className="flex items-center justify-between">
                                    <span>Kondisi Filter (JSON Conditions) - Opsional</span>
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <FileCode className="w-3 h-3" /> JSON Format
                                    </span>
                                </Label>
                                <Textarea 
                                    id="conditions"
                                    placeholder='Contoh: {"id_desa": ":id_desa"} atau {"role": "operator_desa"}'
                                    value={formConditions}
                                    onChange={(e) => setFormConditions(e.target.value)}
                                    className="font-mono text-xs min-h-[80px]"
                                />
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                    💡 Gunakan placeholder dinamis <code>":id_desa"</code> atau <code>":id_kecamatan"</code> untuk membatasi akses data sesuai wilayah pengguna masing-masing.
                                </p>
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
                                className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                            >
                                <Save className="w-3.5 h-3.5" />
                                Simpan Aturan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
