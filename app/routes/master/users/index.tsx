import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAbility } from "~/contexts/AbilityContext";
import { subject } from "@casl/ability";
import {
    Plus,
    Edit3,
    Trash2,
    Search,
    RotateCw,
    AlertCircle,
    Save,
    Users,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Shield,
    Check,
    Mail,
    Eye,
    EyeOff,
    Building,
    Building2,
    Home,
    Hash,
    UserPlus,
    UserCog,
    Loader2,
    X,
    CheckCircle2,
    Clock,
    XCircle,
    Globe,
    Lock,
    Crown,
    User,
    Zap,
    Sparkles,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Badge } from "~/components/ui/badge";
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
    DialogDescription,
} from "~/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "~/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Spinner } from "~/components/ui/spinner";
import { userManageService, type UserDetail, type RoleDetail } from "~/services/user-manage.service";
import { authService } from "~/services/auth.service";
import { kecamatanService, type Kecamatan } from "~/services/kecamatan";
import { desaService, type Desa } from "~/services/desa";
import { useNavigate } from "react-router";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
    return [
        { title: "Manajemen Pengguna & Peran - MELAROSA" },
        { name: "description", content: "Halaman pengurusan data pengguna dan peran akses aplikasi" },
    ];
};

const ROLE_CONFIG: Record<string, { label: string; color: string; gradient: string; icon: React.ReactNode; bgClass: string }> = {
    super_admin: {
        label: "Super Admin",
        color: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 border-violet-200 dark:border-violet-800",
        gradient: "from-violet-500 to-purple-600",
        icon: <Crown className="w-3.5 h-3.5" />,
        bgClass: "bg-violet-500"
    },
    operator_bappeda: {
        label: "Operator Bappeda",
        color: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800",
        gradient: "from-blue-500 to-indigo-600",
        icon: <Building2 className="w-3.5 h-3.5" />,
        bgClass: "bg-blue-500"
    },
    operator_kecamatan: {
        label: "Operator Kecamatan",
        color: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200 dark:border-sky-800",
        gradient: "from-sky-500 to-cyan-600",
        icon: <Building className="w-3.5 h-3.5" />,
        bgClass: "bg-sky-500"
    },
    operator_desa: {
        label: "Operator Desa",
        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
        gradient: "from-emerald-500 to-teal-600",
        icon: <Home className="w-3.5 h-3.5" />,
        bgClass: "bg-emerald-500"
    },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    active: {
        label: "Aktif",
        icon: <CheckCircle2 className="w-3 h-3" />,
        color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
    },
    pending: {
        label: "Menunggu",
        icon: <Clock className="w-3 h-3" />,
        color: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-800"
    },
    inactive: {
        label: "Nonaktif",
        icon: <XCircle className="w-3 h-3" />,
        color: "bg-slate-100 text-slate-600 dark:bg-slate-900/50 dark:text-slate-400 border-slate-200 dark:border-slate-700"
    },
};

function getInitials(name: string): string {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function UsersIndex() {
    const navigate = useNavigate();
    const currentUser = authService.getUser();
    const ability = useAbility();

    // Client-side route guard: redirect user if they cannot manage Users
    useEffect(() => {
        if (!ability.can("manage", "User") && !ability.can("manage", subject("User", { role: "operator_desa" }))) {
            toast.error("Anda tidak memiliki akses untuk membuka halaman ini");
            navigate("/admin/dashboard", { replace: true });
        }
    }, [ability, navigate]);

    const [users, setUsers] = useState<UserDetail[]>([]);
    const [roles, setRoles] = useState<RoleDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [rolesLoading, setRolesLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [limit] = useState(10);

    // Form Dialog States
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserDetail | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Form Fields
    const [formNama, setFormNama] = useState("");
    const [formEmail, setFormEmail] = useState("");
    const [formPassword, setFormPassword] = useState("");
    const [formRole, setFormRole] = useState<string>("operator_desa");
    const [formStatus, setFormStatus] = useState<"active" | "pending" | "inactive">("active");
    const [formIdKecamatan, setFormIdKecamatan] = useState<string>("none");
    const [formIdDesa, setFormIdDesa] = useState<string>("none");
    const [showPassword, setShowPassword] = useState(false);

    // Dropdowns data lists
    const [kecamatanList, setKecamatanList] = useState<Kecamatan[]>([]);
    const [desaList, setDesaList] = useState<Desa[]>([]);
    const [desaLoading, setDesaLoading] = useState(false);

    // Delete State
    const [deleteTarget, setDeleteTarget] = useState<UserDetail | null>(null);

    // Fetch Roles List once
    const fetchRoles = async () => {
        setRolesLoading(true);
        try {
            const response = await userManageService.getRoles();
            if (response && response.status === "success") {
                setRoles(response.data || []);
            } else {
                toast.error(response?.message || "Gagal mengambil data wewenang peran");
            }
        } catch (err) {
            console.error("Failed to load roles list:", err);
        } finally {
            setRolesLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser?.role !== "operator_desa") {
            fetchRoles();
        }
    }, [currentUser?.role]);

    // Fetch Kecamatan List once
    useEffect(() => {
        const fetchKecamatan = async () => {
            try {
                const list = await kecamatanService.getKecamatan();
                setKecamatanList(list);
            } catch (err) {
                console.error("Failed to load kecamatan list:", err);
            }
        };
        if (currentUser?.role !== "operator_desa") {
            fetchKecamatan();
        }
    }, [currentUser?.role]);

    // Fetch Desa List when selected Kecamatan changes
    useEffect(() => {
        const fetchDesa = async () => {
            if (formIdKecamatan === "none" || !formIdKecamatan) {
                setDesaList([]);
                return;
            }
            setDesaLoading(true);
            try {
                const list = await desaService.getDesa(formIdKecamatan);
                setDesaList(list);
            } catch (err) {
                console.error("Failed to load desa list:", err);
            } finally {
                setDesaLoading(false);
            }
        };
        fetchDesa();
    }, [formIdKecamatan]);

    // Fetch Users
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await userManageService.getUsers({
                search,
                page,
                limit
            });
            if (response && response.status === "success") {
                setUsers(response.data || []);
                setTotal(response.pagination?.total || 0);
            } else {
                toast.error(response?.message || "Gagal mengambil data user");
            }
        } catch (error) {
            console.error(error);
            toast.error("Terjadi kesalahan saat memuat data pengguna");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser?.role !== "operator_desa") {
            fetchUsers();
        }
    }, [page, search, currentUser?.role]);

    // Handle dialog open for Create
    const openCreateDialog = () => {
        setEditingUser(null);
        setFormNama("");
        setFormEmail("");
        setFormPassword("");
        setFormRole("operator_desa");
        setFormStatus("active");
        setFormIdKecamatan("none");
        setFormIdDesa("none");
        setShowPassword(false);
        setDialogOpen(true);
    };

    // Handle dialog open for Edit
    const openEditDialog = (user: UserDetail) => {
        setEditingUser(user);
        setFormNama(user.nama);
        setFormEmail(user.email);
        setFormPassword(""); // password optional when editing
        setFormRole(user.role);
        setFormStatus(user.status || "active");
        setFormIdKecamatan(user.id_kecamatan ? user.id_kecamatan.toString() : "none");
        setFormIdDesa(user.id_desa ? user.id_desa.toString() : "none");
        setShowPassword(false);
        setDialogOpen(true);
    };

    // Save Form
    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formNama.trim().length < 3) {
            toast.error("Nama minimal 3 karakter");
            return;
        }

        if (!formEmail.includes("@")) {
            toast.error("Format email tidak valid");
            return;
        }

        if (!editingUser && formPassword.length < 6) {
            toast.error("Password minimal 6 karakter");
            return;
        }

        if (editingUser && formPassword.length > 0 && formPassword.length < 6) {
            toast.error("Password baru minimal 6 karakter");
            return;
        }

        // Validate regional data if role is operator_desa or operator_kecamatan
        if (formRole === "operator_desa" || formRole === "operator_kecamatan") {
            if (formIdKecamatan === "none" || !formIdKecamatan) {
                toast.error("Kecamatan wajib dipilih");
                return;
            }
            if (formRole === "operator_desa" && (formIdDesa === "none" || !formIdDesa)) {
                toast.error("Desa wajib dipilih untuk operator desa");
                return;
            }
        }

        const payload = {
            nama: formNama,
            email: formEmail,
            role: formRole,
            status: formStatus,
            password: formPassword || undefined,
            id_kecamatan: (formRole === "operator_desa" || formRole === "operator_kecamatan") && formIdKecamatan !== "none" ? parseInt(formIdKecamatan, 10) : null,
            id_desa: formRole === "operator_desa" && formIdDesa !== "none" ? parseInt(formIdDesa, 10) : null
        };

        setFormLoading(true);
        try {
            let response;
            if (editingUser) {
                response = await userManageService.updateUser(editingUser.id, payload);
            } else {
                response = await userManageService.createUser(payload);
            }

            if (response && response.status === "success") {
                toast.success(editingUser ? "User berhasil diperbarui" : "User berhasil dibuat");
                setDialogOpen(false);
                fetchUsers();
            } else {
                toast.error(response?.message || "Gagal menyimpan data pengguna");
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error?.message || "Terjadi kesalahan saat menyimpan");
        } finally {
            setFormLoading(false);
        }
    };

    // Confirm Delete
    const handleDeleteUser = async () => {
        if (!deleteTarget) return;
        setLoading(true);
        try {
            const response = await userManageService.deleteUser(deleteTarget.id);
            if (response && response.status === "success") {
                toast.success("User berhasil dihapus");
                fetchUsers();
            } else {
                toast.error(response?.message || "Gagal menghapus user");
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error?.message || "Terjadi kesalahan saat menghapus");
        } finally {
            setLoading(false);
            setDeleteTarget(null);
        }
    };

    // Approve Pending User
    const handleApproveUser = async (user: UserDetail) => {
        try {
            setLoading(true);
            const payload = {
                nama: user.nama,
                email: user.email,
                role: user.role,
                status: 'active',
                id_kecamatan: user.id_kecamatan,
                id_desa: user.id_desa
            };
            const response = await userManageService.updateUser(user.id, payload);
            if (response && response.status === "success") {
                toast.success(`Akun ${user.nama} berhasil diaktifkan!`);
                fetchUsers();
            } else {
                toast.error(response?.message || "Gagal mengaktifkan akun");
                setLoading(false);
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error?.message || "Terjadi kesalahan saat mengaktifkan");
            setLoading(false);
        }
    };

    if (!ability.can("manage", "User") && !ability.can("manage", subject("User", { role: "operator_desa" }))) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner className="size-8 text-indigo-600" />
            </div>
        );
    }

    const totalPages = Math.ceil(total / limit);

    // Count stats
    const activeCount = users.filter(u => u.status === "active" || !u.status).length;
    const pendingCount = users.filter(u => u.status === "pending").length;

    // Group users by role
    const ROLE_ORDER = ["super_admin", "operator_bappeda", "operator_kecamatan", "operator_desa"];
    const groupedUsers = ROLE_ORDER.reduce((acc, roleKey) => {
        const roleUsers = users.filter(u => u.role === roleKey);
        if (roleUsers.length > 0) {
            acc[roleKey] = roleUsers;
        }
        return acc;
    }, {} as Record<string, UserDetail[]>);

    const otherUsers = users.filter(u => !ROLE_ORDER.includes(u.role));
    if (otherUsers.length > 0) {
        groupedUsers["lainnya"] = otherUsers;
    }

    return (
        <div className="absolute inset-0 flex flex-col bg-background dark:bg-slate-950 overflow-hidden">
            {/* ── Header ── */}
            <div className="shrink-0 px-4 sm:px-6 pt-4 pb-3 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                                <Users className="w-4.5 h-4.5 text-white" />
                            </div>
                            Manajemen Pengguna
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 hidden sm:block">
                            Kelola akun pengguna, otorisasi hak akses, dan wilayah kerja administratif.
                        </p>
                    </div>
                    <Button
                        onClick={openCreateDialog}
                        disabled={loading}
                        className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 rounded-xl shadow-sm"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span className="hidden sm:inline">Tambah Pengguna</span>
                        <span className="sm:hidden">Tambah</span>
                    </Button>
                </div>
            </div>

            {/* ── Tabs ── */}
            <Tabs defaultValue="users" className="flex-1 min-h-0 flex flex-col">
                <div className="shrink-0 px-4 sm:px-6 pt-3 pb-0 flex items-center gap-3">
                    <TabsList className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-800/50 p-1 rounded-xl">
                        <TabsTrigger value="users" className="flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5">
                            <Users className="w-3.5 h-3.5" />
                            Pengguna
                            {total > 0 && (
                                <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[9px] font-bold rounded-md">{total}</Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="roles" className="flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5">
                            <Shield className="w-3.5 h-3.5" />
                            Peran & Hak Akses
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* ─── Tab: Users ─── */}
                <TabsContent value="users" className="flex-1 min-h-0 flex flex-col mt-0 px-4 sm:px-6 pb-4 pt-3">
                    <Card className="gap-0 py-0 overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm relative flex flex-col flex-1 min-h-0">
                        {/* Toolbar */}
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                            <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
                                <div className="relative flex-1 sm:max-w-xs">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Cari nama atau email..."
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                        }}
                                        autoComplete="off"
                                        className="pl-9 h-9 rounded-lg text-sm"
                                    />
                                    {search && (
                                        <button
                                            onClick={() => { setSearch(""); setPage(1); }}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {/* Stats badges */}
                                <div className="hidden md:flex items-center gap-1.5 mr-2">
                                    <Badge variant="outline" className="text-[10px] font-semibold rounded-lg gap-1 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
                                        <CheckCircle2 className="w-3 h-3" />
                                        {activeCount} Aktif
                                    </Badge>
                                    {pendingCount > 0 && (
                                        <Badge variant="outline" className="text-[10px] font-semibold rounded-lg gap-1 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20">
                                            <Clock className="w-3 h-3" />
                                            {pendingCount} Menunggu
                                        </Badge>
                                    )}
                                </div>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-9 w-9 rounded-lg"
                                            onClick={fetchUsers}
                                            disabled={loading}
                                        >
                                            <RotateCw className={cn("h-4 w-4", loading && "animate-spin")} />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Muat Ulang</TooltipContent>
                                </Tooltip>
                            </div>
                        </div>

                        {/* Grouped Table */}
                        <CardContent className="p-0 overflow-auto custom-scrollbar flex-1 min-h-0 [&_[data-slot=table-container]]:overflow-visible">
                            {loading && users.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Memuat data pengguna...</p>
                                </div>
                            ) : users.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                        <Users className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                    </div>
                                    <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">Pengguna tidak ditemukan</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                                        {search ? `Tidak ada pengguna yang sesuai dengan "${search}"` : "Belum ada data pengguna."}
                                    </p>
                                    {search && (
                                        <Button variant="outline" size="sm" className="mt-3 text-xs rounded-lg" onClick={() => { setSearch(""); setPage(1); }}>
                                            Hapus Filter
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-slate-50/90 dark:bg-slate-900/90 sticky top-0 z-10">
                                        <TableRow className="border-b border-slate-200/80 dark:border-slate-800">
                                            <TableHead className="font-semibold text-xs text-slate-600 dark:text-slate-400 pl-4">Pengguna</TableHead>
                                            <TableHead className="font-semibold text-xs text-slate-600 dark:text-slate-400">Wilayah Kerja</TableHead>
                                            <TableHead className="font-semibold text-xs text-slate-600 dark:text-slate-400">Status</TableHead>
                                            <TableHead className="w-[140px] text-right font-semibold text-xs text-slate-600 dark:text-slate-400 pr-4">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(groupedUsers).map(([roleKey, groupUsers]) => {
                                            const roleConf = ROLE_CONFIG[roleKey] || {
                                                label: roleKey,
                                                color: "bg-slate-100 text-slate-600 border-slate-200",
                                                icon: <User className="w-3.5 h-3.5" />,
                                                gradient: "from-slate-500 to-slate-600",
                                                bgClass: "bg-slate-500"
                                            };

                                            return (
                                                <React.Fragment key={roleKey}>
                                                    {/* Role Group Section Header Row */}
                                                    <TableRow className="bg-slate-100/70 dark:bg-slate-800/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 border-y border-slate-200/60 dark:border-slate-800/80 font-medium">
                                                        <TableCell colSpan={4} className="py-2 pl-4">
                                                            <div className="flex items-center gap-2">
                                                                <Badge className={cn("text-xs font-bold px-2.5 py-0.5 border rounded-lg gap-1.5 shadow-2xs", roleConf.color)}>
                                                                    {roleConf.icon}
                                                                    {roleConf.label}
                                                                </Badge>
                                                                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                                                                    • {groupUsers.length} pengguna
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>

                                                    {/* Member User Rows */}
                                                    {groupUsers.map((user) => {
                                                        const statusConf = STATUS_CONFIG[user.status || "active"] || STATUS_CONFIG.active;
                                                        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nama)}&background=3b82f6&color=fff&size=64&bold=true`;
                                                        const isCurrentUser = user.id === currentUser?.id;

                                                        return (
                                                            <TableRow key={user.id} className="group hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800/40">
                                                                {/* User info */}
                                                                <TableCell className="pl-6 py-2.5">
                                                                    <div className="flex items-center gap-3">
                                                                        <Avatar className="h-8.5 w-8.5 rounded-lg border border-slate-200/60 dark:border-slate-800 shadow-2xs flex-shrink-0">
                                                                            <AvatarImage src={avatarUrl} alt={user.nama} />
                                                                            <AvatarFallback className={cn("rounded-lg text-white font-bold text-xs bg-gradient-to-br", roleConf.gradient)}>
                                                                                {getInitials(user.nama)}
                                                                            </AvatarFallback>
                                                                        </Avatar>
                                                                        <div className="min-w-0">
                                                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                                                                                {user.nama}
                                                                                {isCurrentUser && (
                                                                                    <Badge className="text-[8px] py-0 px-1.5 bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800 rounded-md font-bold">
                                                                                        Anda
                                                                                    </Badge>
                                                                                )}
                                                                            </p>
                                                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate flex items-center gap-1">
                                                                                <Mail className="w-3 h-3 flex-shrink-0 text-slate-400" />
                                                                                {user.email}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>

                                                                {/* Wilayah */}
                                                                <TableCell className="py-2.5">
                                                                    {(user.role === "operator_desa" || (user.role as string) === "operator_kecamatan") && user.kecamatan ? (
                                                                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                                                                            <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                                                            <span className="truncate max-w-[240px]">
                                                                                {user.kecamatan.nama_kecamatan}
                                                                                {user.desa && ` • ${user.desa.nama_desa}`}
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                                                                            <Globe className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                                                            Seluruh Kab. Bojonegoro
                                                                        </span>
                                                                    )}
                                                                </TableCell>

                                                                {/* Status */}
                                                                <TableCell className="py-2.5">
                                                                    <Badge variant="outline" className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-lg gap-1 border", statusConf.color)}>
                                                                        {statusConf.icon}
                                                                        {statusConf.label}
                                                                    </Badge>
                                                                </TableCell>

                                                                {/* Actions */}
                                                                <TableCell className="text-right pr-4 py-2.5">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        {user.status === "pending" && (
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        className="h-7 px-2 border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs font-semibold shrink-0 gap-1 rounded-lg"
                                                                                        onClick={() => handleApproveUser(user)}
                                                                                    >
                                                                                        <Check className="w-3.5 h-3.5" />
                                                                                        <span>Setujui</span>
                                                                                    </Button>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>Setujui Akun</TooltipContent>
                                                                            </Tooltip>
                                                                        )}
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg"
                                                                                    onClick={() => openEditDialog(user)}
                                                                                >
                                                                                    <Edit3 className="w-3.5 h-3.5" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>Edit</TooltipContent>
                                                                        </Tooltip>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg"
                                                                                    disabled={isCurrentUser}
                                                                                    onClick={() => setDeleteTarget(user)}
                                                                                >
                                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>{isCurrentUser ? "Tidak dapat menghapus akun sendiri" : "Hapus"}</TooltipContent>
                                                                        </Tooltip>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>

                        {/* Pagination */}
                        {total > limit && (
                            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                                <span className="text-[11px] text-slate-500 font-medium">
                                    Hal. <span className="font-bold text-slate-700 dark:text-slate-300">{page}</span> dari <span className="font-bold text-slate-700 dark:text-slate-300">{totalPages}</span> ({total} pengguna)
                                </span>
                                <div className="flex gap-1.5">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page === 1 || loading}
                                        onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                        className="h-8 text-xs flex items-center gap-1 rounded-lg"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                        Sebelumnya
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page >= totalPages || loading}
                                        onClick={() => setPage(prev => prev + 1)}
                                        className="h-8 text-xs flex items-center gap-1 rounded-lg"
                                    >
                                        Berikutnya
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>
                </TabsContent>

                {/* ─── Tab: Roles ─── */}
                <TabsContent value="roles" className="flex-1 min-h-0 overflow-y-auto mt-0 custom-scrollbar px-4 sm:px-6 pb-6 pt-3">
                    {rolesLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            <p className="text-sm text-slate-500 dark:text-slate-400">Memuat wewenang peran...</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {roles.map((role) => {
                                const roleConf = ROLE_CONFIG[role.id] || { label: role.name, color: "bg-slate-100 text-slate-600", gradient: "from-slate-500 to-slate-600", icon: <User className="w-3.5 h-3.5" />, bgClass: "bg-slate-500" };
                                return (
                                    <Card key={role.id} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
                                        {/* Top gradient bar */}
                                        <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", roleConf.gradient)} />
                                        <CardHeader className="pb-3 pt-5">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-gradient-to-br text-white shadow-sm [&>svg]:w-5 [&>svg]:h-5", roleConf.gradient)}>
                                                    {roleConf.icon}
                                                </div>
                                                <div>
                                                    <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                        {role.name}
                                                    </CardTitle>
                                                    <CardDescription className="text-[10px] text-slate-400 mt-0.5 font-mono uppercase tracking-wider">
                                                        {role.id}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-3 pb-5">
                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                                {role.description}
                                            </p>

                                            <Separator className="my-2" />

                                            <div>
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Cakupan Hak Akses</h4>
                                                <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                                                    {role.id === "super_admin" && (
                                                        <>
                                                            <li className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400 font-semibold"><Zap className="w-3.5 h-3.5" /> Akses Penuh Sistem</li>
                                                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> CRUD Semua Pengguna & Peran</li>
                                                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> CRUD Peta Dasar (Basemaps)</li>
                                                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Menggambar Jalan & Batas Wilayah</li>
                                                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Evaluasi Seluruh Usulan Desa</li>
                                                        </>
                                                    )}
                                                    {role.id === "operator_bappeda" && (
                                                        <>
                                                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Melihat Seluruh Usulan Pembangunan</li>
                                                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Menggambar Jalan & Batas Wilayah</li>
                                                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> CRUD Peta Dasar (Basemaps)</li>
                                                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Mengelola Akun Operator Desa</li>
                                                            <li className="flex items-center gap-2 text-red-500 dark:text-red-400 font-medium"><XCircle className="w-3 h-3" /> Dilarang Mengelola Admin/Bappeda</li>
                                                        </>
                                                    )}
                                                    {role.id === "operator_desa" && (
                                                        <>
                                                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Melihat Peta Wilayah Administrasi</li>
                                                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Menginput Usulan Jalan Desa Mandiri</li>
                                                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Mengedit Usulan Desa Sendiri</li>
                                                            <li className="flex items-center gap-2 text-red-500 dark:text-red-400 font-medium"><XCircle className="w-3 h-3" /> Dilarang Mengelola Akun Pengguna</li>
                                                            <li className="flex items-center gap-2 text-red-500 dark:text-red-400 font-medium"><XCircle className="w-3 h-3" /> Dilarang Mengubah Peta Dasar</li>
                                                        </>
                                                    )}
                                                </ul>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* ── Create & Edit Dialog ── */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[520px] border border-slate-200 dark:border-slate-800 rounded-2xl p-0 overflow-hidden">
                    {/* Dialog header with gradient */}
                    <div className={cn("px-6 pt-5 pb-4 bg-gradient-to-br", editingUser ? "from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20" : "from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20")}>
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm bg-gradient-to-br", editingUser ? "from-blue-500 to-indigo-600" : "from-emerald-500 to-teal-600")}>
                                    {editingUser ? <UserCog className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                                </div>
                                {editingUser ? "Edit Pengguna" : "Tambah Pengguna Baru"}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {editingUser ? `Perbarui informasi akun ${editingUser.nama}` : "Daftarkan akun baru ke dalam sistem MELAROSA"}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <form onSubmit={handleSaveUser} className="px-6 pb-6 pt-4 space-y-4">
                        {/* Nama */}
                        <div className="space-y-1.5">
                            <Label htmlFor="nama" className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                <Users className="w-3 h-3" />
                                Nama Lengkap <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="nama"
                                required
                                value={formNama}
                                onChange={(e) => setFormNama(e.target.value)}
                                placeholder="Masukkan nama lengkap"
                                className="h-9 text-sm rounded-lg"
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                <Mail className="w-3 h-3" />
                                Alamat Email <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                required
                                value={formEmail}
                                onChange={(e) => setFormEmail(e.target.value)}
                                placeholder="nama@bojonegorokab.go.id"
                                className="h-9 text-sm rounded-lg"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <Label htmlFor="password" className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                <Lock className="w-3 h-3" />
                                Password
                                {editingUser && <span className="text-[10px] text-slate-400 font-normal ml-1">(opsional)</span>}
                                {!editingUser && <span className="text-red-500">*</span>}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required={!editingUser}
                                    value={formPassword}
                                    onChange={(e) => setFormPassword(e.target.value)}
                                    placeholder={editingUser ? "Isi untuk mengubah password" : "Masukkan password baru"}
                                    className="h-9 text-sm rounded-lg pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Role & Status grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Role */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                    <Shield className="w-3 h-3" />
                                    Hak Akses
                                </Label>
                                {!ability.can("manage", subject("User", { role: "operator_bappeda" })) ? (
                                    <Input value="Operator Desa" disabled className="h-9 text-sm rounded-lg bg-slate-50 dark:bg-slate-800/50" />
                                ) : (
                                    <Select
                                        value={formRole}
                                        onValueChange={(val: any) => setFormRole(val)}
                                    >
                                        <SelectTrigger className="h-9 text-sm rounded-lg">
                                            <SelectValue placeholder="Pilih hak akses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roles.map((role) => {
                                                const rc = ROLE_CONFIG[role.id];
                                                return (
                                                    <SelectItem key={role.id} value={role.id}>
                                                        <span className="flex items-center gap-1.5">
                                                            {rc?.icon} {role.name}
                                                        </span>
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            {/* Status */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Status Akun
                                </Label>
                                <Select
                                    value={formStatus}
                                    onValueChange={(val: any) => setFormStatus(val)}
                                >
                                    <SelectTrigger className="h-9 text-sm rounded-lg">
                                        <SelectValue placeholder="Pilih status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">
                                            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Aktif</span>
                                        </SelectItem>
                                        <SelectItem value="pending">
                                            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-amber-500" /> Menunggu</span>
                                        </SelectItem>
                                        <SelectItem value="inactive">
                                            <span className="flex items-center gap-1.5"><XCircle className="w-3 h-3 text-slate-400" /> Nonaktif</span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Role description hint */}
                        {formRole && roles.length > 0 && (
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed flex items-start gap-2">
                                <span className="text-slate-400 flex-shrink-0 mt-0.5">{ROLE_CONFIG[formRole]?.icon || <Sparkles className="w-3.5 h-3.5" />}</span>
                                <span>
                                    <strong className="text-slate-700 dark:text-slate-300">{roles.find(r => r.id === formRole)?.name}:</strong>{" "}
                                    {roles.find(r => r.id === formRole)?.description}
                                </span>
                            </div>
                        )}

                        {/* Wilayah Kerja (Conditional) */}
                        {(formRole === "operator_desa" || formRole === "operator_kecamatan") && (
                            <div className="p-3.5 bg-blue-50/40 dark:bg-blue-950/10 border border-blue-200/50 dark:border-blue-900/30 rounded-xl space-y-3">
                                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <MapPin className="w-3 h-3" />
                                    Wilayah Kerja
                                </p>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                        <Building className="w-3 h-3" />
                                        Kecamatan <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={formIdKecamatan}
                                        onValueChange={(val) => {
                                            setFormIdKecamatan(val);
                                            setFormIdDesa("none");
                                        }}
                                    >
                                        <SelectTrigger className="h-9 text-sm rounded-lg bg-white dark:bg-slate-900">
                                            <SelectValue placeholder="Pilih Kecamatan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none" disabled>Pilih Kecamatan</SelectItem>
                                            {kecamatanList.map((kec) => (
                                                <SelectItem key={kec.id} value={kec.id.toString()}>
                                                    {kec.nama_kecamatan}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {formRole === "operator_desa" && (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                            <Home className="w-3 h-3" />
                                            Desa <span className="text-red-500">*</span>
                                            {desaLoading && <Loader2 className="w-3 h-3 animate-spin text-blue-500 ml-1" />}
                                        </Label>
                                        <Select
                                            value={formIdDesa}
                                            onValueChange={setFormIdDesa}
                                            disabled={formIdKecamatan === "none" || desaLoading}
                                        >
                                            <SelectTrigger className="h-9 text-sm rounded-lg bg-white dark:bg-slate-900">
                                                <SelectValue placeholder="Pilih Desa" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none" disabled>Pilih Desa</SelectItem>
                                                {desaList.map((d) => (
                                                    <SelectItem key={d.id} value={d.id.toString()}>
                                                        {d.nama_desa}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        )}

                        <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDialogOpen(false)}
                                disabled={formLoading}
                                className="rounded-lg"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={formLoading}
                                className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5"
                            >
                                {formLoading ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                                ) : (
                                    <><Save className="w-4 h-4" /> {editingUser ? "Perbarui" : "Simpan"}</>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Confirm Delete Dialog ── */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent className="border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2.5 text-red-600">
                            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                                <AlertCircle className="w-4.5 h-4.5 text-red-600" />
                            </div>
                            Hapus Akun Pengguna?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                            Tindakan ini akan menghapus akun <strong className="text-slate-700 dark:text-slate-300">{deleteTarget?.nama}</strong> ({deleteTarget?.email}) secara permanen dari sistem. Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-lg">Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteUser}
                            className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600 dark:bg-red-700 dark:hover:bg-red-800 rounded-lg font-semibold gap-1.5"
                        >
                            <Trash2 className="w-4 h-4" />
                            Hapus Akun
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
