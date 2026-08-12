import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAbility } from "~/contexts/AbilityContext";
import { 
    Save, 
    RotateCw, 
    Lock, 
    ShieldAlert, 
    ShieldCheck, 
    Layers,
    Search
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "~/components/ui/table";
import { Spinner } from "~/components/ui/spinner";
import { menuService, type MenuDetail, type RoleMenuMapping } from "~/services/menu.service";
import { roleService, type RoleDetail } from "~/services/role.service";
import { useNavigate } from "react-router";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
    return [
        { title: "Matriks Hak Akses Menu - MELAROSA" },
        { name: "description", content: "Halaman pengurusan matriks otorisasi menu sidebar dinamis pengguna" },
    ];
};

export default function MenuAccessIndex() {
    const navigate = useNavigate();
    const ability = useAbility();

    // Client-side route guard
    useEffect(() => {
        if (!ability.can("manage", "Menu")) {
            toast.error("Anda tidak memiliki akses untuk membuka halaman ini");
            navigate("/admin/dashboard", { replace: true });
        }
    }, [ability, navigate]);

    const [roles, setRoles] = useState<RoleDetail[]>([]);
    const [menus, setMenus] = useState<MenuDetail[]>([]);
    const [mappings, setMappings] = useState<RoleMenuMapping[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchData = async () => {
        setLoading(true);
        try {
            const [rolesRes, menusRes, mappingsRes] = await Promise.all([
                roleService.getRoles(),
                menuService.getAllMenus(),
                menuService.getRoleMenuMappings()
            ]);

            if (rolesRes.status === "success" && rolesRes.data) {
                setRoles(rolesRes.data);
            }
            if (menusRes.status === "success" && menusRes.data) {
                setMenus(menusRes.data);
            }
            if (mappingsRes.status === "success" && mappingsRes.data) {
                setMappings(mappingsRes.data);
            }
        } catch (err: any) {
            toast.error(err.message || "Gagal memuat data matriks");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (ability.can("manage", "Menu")) {
            fetchData();
        }
    }, [ability]);

    // Check if mapping exists
    const isChecked = (roleId: string, menuId: string) => {
        return mappings.some(m => m.role_id === roleId && m.menu_id === menuId);
    };

    // Toggle mapping
    const handleCheckboxChange = (roleId: string, menuId: string, checked: boolean) => {
        if (checked) {
            // Add
            setMappings(prev => [...prev, { role_id: roleId, menu_id: menuId }]);
        } else {
            // Remove
            setMappings(prev => prev.filter(m => !(m.role_id === roleId && m.menu_id === menuId)));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await menuService.updateRoleMenuMappings(mappings);
            if (res.status === "success") {
                toast.success("Matriks hak akses menu sidebar berhasil diperbarui!");
                // Proactively reload/notify the layout that menus changed!
                window.location.reload();
            }
        } catch (err: any) {
            toast.error(err.message || "Gagal menyimpan perubahan");
        } finally {
            setSaving(false);
        }
    };

    // Arrange parent-child menus order
    const orderedMenus: MenuDetail[] = [];
    const parents = menus.filter(m => m.parent_id === null);
    parents.forEach(p => {
        orderedMenus.push(p);
        const children = menus.filter(m => m.parent_id === p.id);
        orderedMenus.push(...children);
    });

    const filteredMenus = orderedMenus.filter(m => 
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                        Matriks Hak Akses Menu Sidebar
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                        Atur aksesibilitas menu sidebar dinamis untuk masing-masing peran (role) pengguna.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={fetchData} 
                        disabled={loading}
                        className="h-8 gap-1.5 text-xs"
                    >
                        <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button 
                        size="sm" 
                        onClick={handleSave}
                        disabled={loading || saving}
                        className="h-8 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? "Menyimpan..." : "Simpan Hak Akses"}
                    </Button>
                </div>
            </div>

            {/* Warning Alert Banner */}
            <div className="shrink-0 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg flex gap-3 text-amber-800 dark:text-amber-300">
                <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-500" />
                <div className="text-xs">
                    <strong>Penting:</strong> Menyimpan hak akses menu akan mereload aplikasi untuk menerapkan menu sidebar baru. Pastikan <code>super_admin</code> selalu dicentang pada seluruh menu (terutama menu Keamanan) agar Anda tidak kehilangan akses panel kendali admin.
                </div>
            </div>

            {/* Search filter */}
            <div className="shrink-0 max-w-sm relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Cari menu sidebar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-xs"
                />
            </div>

            {/* Matrix Table */}
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
                                    <TableHead className="w-[300px]">Nama Menu (ID)</TableHead>
                                    {roles.map(role => (
                                        <TableHead key={role.id} className="text-center font-semibold text-slate-800 dark:text-slate-200">
                                            {role.name}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMenus.map((menu) => {
                                    const isParent = menu.parent_id === null;
                                    return (
                                        <TableRow 
                                            key={menu.id} 
                                            className={`${
                                                isParent 
                                                    ? "bg-slate-50/30 dark:bg-slate-900/20 font-bold" 
                                                    : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                                            }`}
                                        >
                                            <TableCell className="text-xs">
                                                <div className={`flex items-center gap-1.5 ${isParent ? "" : "pl-6 text-muted-foreground"}`}>
                                                    {!isParent && <span className="text-slate-400">└─</span>}
                                                    <span>{menu.title}</span>
                                                    <span className="text-[10px] font-mono text-slate-400 font-normal">
                                                        ({menu.id})
                                                    </span>
                                                </div>
                                            </TableCell>
                                            {roles.map((role) => {
                                                const checked = isChecked(role.id, menu.id);
                                                return (
                                                    <TableCell key={role.id} className="text-center">
                                                        <Checkbox
                                                            checked={checked}
                                                            onCheckedChange={(val) => 
                                                                handleCheckboxChange(role.id, menu.id, !!val)
                                                            }
                                                            className="border-slate-300 dark:border-slate-700 data-[state=checked]:bg-indigo-600 data-[state=checked]:text-white"
                                                        />
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    );
}
