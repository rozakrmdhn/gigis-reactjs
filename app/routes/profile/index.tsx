import React, { useState, useEffect, useRef } from "react";
import {
    User as UserIcon,
    Shield,
    Key,
    Building,
    Home,
    RefreshCw,
    Eye,
    EyeOff,
    Camera,
    CheckCircle2,
    XCircle,
    Lock,
    Mail,
    Phone,
    Briefcase,
    Hash,
    MapPin,
    Globe,
    ChevronRight,
    Sparkles,
    ShieldCheck,
    AlertTriangle,
    Info,
    Edit3,
    Save,
    RotateCcw,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "~/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import type { MetaFunction } from "react-router";
import { profileService } from "~/services/profile.service";
import type { UserDetail } from "~/services/user-manage.service";

export const meta: MetaFunction = () => {
    return [
        { title: "Profil Saya - MELAROSA" },
        { name: "description", content: "Informasi profil dan pengaturan akun pengguna" },
    ];
};

const ROLE_LABEL: Record<string, { label: string; color: string; gradient: string; icon: string }> = {
    super_admin: {
        label: "Super Admin",
        color: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 border-violet-200 dark:border-violet-800",
        gradient: "from-violet-500 to-purple-600",
        icon: "👑"
    },
    operator_bappeda: {
        label: "Operator Bappeda",
        color: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800",
        gradient: "from-blue-500 to-indigo-600",
        icon: "🏛️"
    },
    operator_kecamatan: {
        label: "Operator Kecamatan",
        color: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200 dark:border-sky-800",
        gradient: "from-sky-500 to-cyan-600",
        icon: "🏘️"
    },
    operator_desa: {
        label: "Operator Desa",
        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
        gradient: "from-emerald-500 to-teal-600",
        icon: "🌾"
    },
};

const CAKUPAN_WILAYAH: Record<string, string> = {
    super_admin: "Seluruh Kabupaten (Global)",
    operator_bappeda: "Seluruh Kabupaten (Bappeda)",
    operator_kecamatan: "Terbatas per Kecamatan",
    operator_desa: "Terbatas per Desa",
};

// Password strength checker
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
    if (!password) return { score: 0, label: "", color: "bg-slate-200 dark:bg-slate-700" };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score: 1, label: "Sangat Lemah", color: "bg-red-500" };
    if (score === 2) return { score: 2, label: "Lemah", color: "bg-orange-500" };
    if (score === 3) return { score: 3, label: "Sedang", color: "bg-yellow-500" };
    if (score === 4) return { score: 4, label: "Kuat", color: "bg-emerald-500" };
    return { score: 5, label: "Sangat Kuat", color: "bg-emerald-600" };
}

// Info row component
function InfoRow({ icon, label, value, mono = false }: { icon: React.ReactNode; label: string; value: string | React.ReactNode; mono?: boolean }) {
    return (
        <div className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 flex-shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
                <p className={cn("text-sm text-slate-800 dark:text-slate-200 font-medium truncate", mono && "font-mono text-xs")}>{value}</p>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const { user, updateUser } = useAuth();
    const [profile, setProfile] = useState<UserDetail | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [activeTab, setActiveTab] = useState("profil");

    const isSuperAdmin = user?.role === "super_admin";

    // Form: profil
    const [nama, setNama] = useState(user?.nama || "");
    const [email, setEmail] = useState(user?.email || "");
    const [nip, setNip] = useState("");
    const [noHp, setNoHp] = useState("");
    const [jabatan, setJabatan] = useState("");
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Form: password
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    const passwordStrength = getPasswordStrength(newPassword);
    const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
    const passwordsMismatch = newPassword && confirmPassword && newPassword !== confirmPassword;

    // Load profil
    const loadProfile = async () => {
        if (!user?.id) return;
        setIsLoadingProfile(true);
        try {
            const res = await profileService.getProfile();
            const detail = res.result || res.data;
            if (res.status === "success" && detail) {
                setProfile(detail);
                setNama(detail.nama || "");
                setEmail(detail.email || "");
                setNip((detail as any).nip || "");
                setNoHp((detail as any).no_hp || "");
                setJabatan((detail as any).jabatan || "");
            }
        } catch (err) {
            setProfile(null);
            setNama(user.nama || "");
            setEmail(user.email || "");
        } finally {
            setIsLoadingProfile(false);
        }
    };

    useEffect(() => { loadProfile(); }, [user?.id]);

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <p className="text-sm text-muted-foreground">Silakan masuk terlebih dahulu.</p>
            </div>
        );
    }

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nama.trim()) { toast.error("Nama tidak boleh kosong!"); return; }
        if (isSuperAdmin && !email.trim()) { toast.error("Email tidak boleh kosong!"); return; }
        setIsSavingProfile(true);
        try {
            const res = await profileService.updateProfile({
                nama: nama.trim(),
                email: isSuperAdmin ? email.trim() : undefined,
                nip: nip.trim() || undefined,
                no_hp: noHp.trim() || undefined,
                jabatan: jabatan.trim() || undefined
            });
            if (res.status === "success") {
                toast.success("Profil berhasil diperbarui!");
                updateUser({ nama: nama.trim(), ...(isSuperAdmin ? { email: email.trim() } : {}) });
                setIsEditMode(false);
                await loadProfile();
            } else {
                toast.error(res.message || "Gagal memperbarui profil.");
            }
        } catch (err: any) {
            toast.error(err?.message || "Gagal memperbarui profil.");
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleCancelEdit = () => {
        setNama(profile?.nama || user.nama || "");
        setEmail(profile?.email || user.email || "");
        setNip((profile as any)?.nip || "");
        setNoHp((profile as any)?.no_hp || "");
        setJabatan((profile as any)?.jabatan || "");
        setIsEditMode(false);
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!oldPassword || !newPassword || !confirmPassword) {
            toast.error("Semua field kata sandi wajib diisi!"); return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("Konfirmasi kata sandi baru tidak cocok!"); return;
        }
        if (newPassword.length < 8) {
            toast.error("Kata sandi baru minimal 8 karakter!"); return;
        }
        if (oldPassword === newPassword) {
            toast.error("Kata sandi baru tidak boleh sama dengan yang lama!"); return;
        }
        setIsSavingPassword(true);
        try {
            const res = await profileService.changePassword({
                password_lama: oldPassword,
                password_baru: newPassword,
                konfirmasi_password: confirmPassword
            });
            if (res.status === "success") {
                toast.success(res.message || "Kata sandi berhasil diperbarui!");
                setOldPassword(""); setNewPassword(""); setConfirmPassword("");
            } else {
                toast.error(res.message || "Gagal memperbarui kata sandi.");
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || "Gagal memperbarui kata sandi.");
        } finally {
            setIsSavingPassword(false);
        }
    };

    const getInitials = (name: string) =>
        name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

    const roleInfo = ROLE_LABEL[user.role] || {
        label: user.role,
        color: "bg-secondary text-secondary-foreground border-border",
        gradient: "from-slate-500 to-slate-600",
        icon: "👤"
    };
    const cakupan = CAKUPAN_WILAYAH[user.role] || "Tidak diketahui";
    const namaKecamatan = profile?.kecamatan?.nama_kecamatan || null;
    const namaDesa = profile?.desa?.nama_desa || null;

    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nama)}&background=random&color=fff&size=256&bold=true&format=svg`;

    return (
        <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

                {/* ── Hero Card ── */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                    {/* Background gradient decoration */}
                    <div className={cn("absolute inset-0 opacity-[0.04] dark:opacity-[0.08] bg-gradient-to-br", roleInfo.gradient)} />
                    <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-gradient-to-bl opacity-[0.03] dark:opacity-[0.06] from-blue-400 to-indigo-400 translate-x-20 -translate-y-20" />

                    <div className="relative p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                            {/* Avatar with status ring */}
                            <div className="relative flex-shrink-0">
                                <div className={cn("absolute inset-0 rounded-full bg-gradient-to-br animate-pulse", roleInfo.gradient, "blur-xl opacity-30")} />
                                <div className={cn("p-[3px] rounded-full bg-gradient-to-br", roleInfo.gradient)}>
                                    <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-white dark:border-slate-900">
                                        <AvatarImage src={avatarUrl} alt={user.nama} />
                                        <AvatarFallback className={cn("text-white text-xl font-bold bg-gradient-to-br", roleInfo.gradient)}>
                                            {getInitials(user.nama)}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                                {/* Online indicator */}
                                <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm" title="Aktif" />
                            </div>

                            {/* Profile info */}
                            <div className="flex-1 text-center sm:text-left space-y-3">
                                <div>
                                    <h1 className="text-2xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                                        {isLoadingProfile ? (
                                            <span className="inline-block h-7 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                        ) : (user.nama)}
                                    </h1>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center justify-center sm:justify-start gap-1.5">
                                        <Mail className="w-3.5 h-3.5" />
                                        {isLoadingProfile ? (
                                            <span className="inline-block h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                        ) : (email || user.email || "—")}
                                    </p>
                                    {jabatan && (
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                                            <Briefcase className="w-3 h-3" />
                                            {jabatan}
                                        </p>
                                    )}
                                </div>

                                {/* Badges */}
                                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                                    <Badge className={cn("text-[11px] font-semibold px-2.5 py-1 border gap-1.5 rounded-lg", roleInfo.color)}>
                                        <span>{roleInfo.icon}</span>
                                        {roleInfo.label}
                                    </Badge>
                                    <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-1 rounded-lg gap-1.5 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Aktif Terverifikasi
                                    </Badge>
                                    {namaKecamatan && (
                                        <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-1 rounded-lg gap-1.5">
                                            <Building className="w-3 h-3" />
                                            {namaKecamatan}
                                        </Badge>
                                    )}
                                    {namaDesa && (
                                        <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-1 rounded-lg gap-1.5">
                                            <Home className="w-3 h-3" />
                                            {namaDesa}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Quick stats */}
                            <div className="flex sm:flex-col gap-3 sm:gap-2 flex-shrink-0">
                                <div className="text-center px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 min-w-[80px]">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 font-mono">{user.id?.toString().slice(0, 6)}…</p>
                                    <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">User ID</p>
                                </div>
                                <div className="text-center px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 min-w-[80px]">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{cakupan.split(" ").slice(0, 2).join(" ")}</p>
                                    <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">Cakupan</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Tabs ── */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="flex h-auto p-1 gap-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-full sm:w-auto">
                        {[
                            { value: "profil", label: "Profil", icon: <UserIcon className="w-3.5 h-3.5" /> },
                            { value: "keamanan", label: "Keamanan", icon: <Key className="w-3.5 h-3.5" /> },
                            { value: "akun", label: "Info Akun", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
                        ].map(tab => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="flex-1 sm:flex-none flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all"
                            >
                                {tab.icon}
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* ─── Tab: Profil ─── */}
                    <TabsContent value="profil" className="mt-4">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

                            {/* Form card */}
                            <Card className="lg:col-span-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden">
                                <CardHeader className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">Informasi Pribadi</CardTitle>
                                            <CardDescription className="text-[11px] mt-0.5">Perbarui data diri dan informasi kontak Anda</CardDescription>
                                        </div>
                                        {!isEditMode ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsEditMode(true)}
                                                className="h-8 text-xs gap-1.5 rounded-lg"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                                Edit
                                            </Button>
                                        ) : (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleCancelEdit}
                                                className="h-8 text-xs gap-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                                Batal
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    {isLoadingProfile ? (
                                        <div className="space-y-4">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className="space-y-1.5">
                                                    <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                                    <div className="h-9 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSaveProfile} className="space-y-4">
                                            {/* Nama */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="nama" className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                                    <UserIcon className="w-3 h-3" />
                                                    Nama Lengkap
                                                    <span className="text-red-500">*</span>
                                                </Label>
                                                <Input
                                                    id="nama"
                                                    value={nama}
                                                    onChange={(e) => setNama(e.target.value)}
                                                    disabled={!isEditMode}
                                                    className={cn(
                                                        "h-9 text-sm rounded-lg transition-all",
                                                        !isEditMode && "bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 cursor-default border-slate-200/60 dark:border-slate-700/40"
                                                    )}
                                                    placeholder="Masukkan nama lengkap"
                                                    required
                                                />
                                            </div>

                                            {/* NIP + NoHP */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="nip" className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                                        <Hash className="w-3 h-3" />
                                                        NIP
                                                    </Label>
                                                    <Input
                                                        id="nip"
                                                        value={nip}
                                                        onChange={(e) => setNip(e.target.value)}
                                                        disabled={!isEditMode}
                                                        className={cn(
                                                            "h-9 text-sm rounded-lg font-mono transition-all",
                                                            !isEditMode && "bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 cursor-default border-slate-200/60 dark:border-slate-700/40"
                                                        )}
                                                        placeholder="198501012010011002"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="noHp" className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                                        <Phone className="w-3 h-3" />
                                                        No. HP / WhatsApp
                                                    </Label>
                                                    <Input
                                                        id="noHp"
                                                        value={noHp}
                                                        onChange={(e) => setNoHp(e.target.value)}
                                                        disabled={!isEditMode}
                                                        className={cn(
                                                            "h-9 text-sm rounded-lg font-mono transition-all",
                                                            !isEditMode && "bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 cursor-default border-slate-200/60 dark:border-slate-700/40"
                                                        )}
                                                        placeholder="081234567890"
                                                    />
                                                </div>
                                            </div>

                                            {/* Jabatan */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="jabatan" className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                                    <Briefcase className="w-3 h-3" />
                                                    Jabatan / Posisi
                                                </Label>
                                                <Input
                                                    id="jabatan"
                                                    value={jabatan}
                                                    onChange={(e) => setJabatan(e.target.value)}
                                                    disabled={!isEditMode}
                                                    className={cn(
                                                        "h-9 text-sm rounded-lg transition-all",
                                                        !isEditMode && "bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 cursor-default border-slate-200/60 dark:border-slate-700/40"
                                                    )}
                                                    placeholder="Staf Verifikasi Teknis"
                                                />
                                            </div>

                                            {/* Email */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="email" className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                                        <Mail className="w-3 h-3" />
                                                        Email Akun
                                                        {isSuperAdmin && <span className="text-red-500">*</span>}
                                                    </Label>
                                                    {isSuperAdmin ? (
                                                        <Badge className="text-[9px] py-0.5 px-2 bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 border-violet-200 dark:border-violet-800 rounded-md">
                                                            ✏️ Dapat Diubah
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[9px] py-0.5 px-2 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 rounded-md">
                                                            🔒 Dikunci
                                                        </Badge>
                                                    )}
                                                </div>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    disabled={!isSuperAdmin || !isEditMode}
                                                    className={cn(
                                                        "h-9 text-sm rounded-lg transition-all",
                                                        (!isSuperAdmin || !isEditMode) && "bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 cursor-default border-slate-200/60 dark:border-slate-700/40"
                                                    )}
                                                    placeholder="email@example.com"
                                                />
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                                                    {isSuperAdmin
                                                        ? "Sebagai Super Admin, Anda dapat memperbarui alamat email akun."
                                                        : "Perubahan email harus diajukan melalui Administrator Bappeda."}
                                                </p>
                                            </div>

                                            {isEditMode && (
                                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={handleCancelEdit}
                                                        className="h-9 text-xs rounded-lg"
                                                    >
                                                        Batal
                                                    </Button>
                                                    <Button
                                                        type="submit"
                                                        disabled={isSavingProfile}
                                                        className="h-9 text-xs px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5"
                                                    >
                                                        {isSavingProfile ? (
                                                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan...</>
                                                        ) : (
                                                            <><Save className="w-3.5 h-3.5" /> Simpan Perubahan</>
                                                        )}
                                                    </Button>
                                                </div>
                                            )}
                                        </form>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Right panel: Info Wilayah + Tips */}
                            <div className="lg:col-span-2 flex flex-col gap-4">
                                {/* Wilayah Card */}
                                <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden">
                                    <CardHeader className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                                        <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-blue-500" />
                                            Cakupan Wilayah
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3 space-y-0.5">
                                        {isLoadingProfile ? (
                                            <div className="space-y-2 p-2">
                                                {[...Array(3)].map((_, i) => (
                                                    <div key={i} className="h-11 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                                                ))}
                                            </div>
                                        ) : (
                                            <>
                                                <InfoRow
                                                    icon={<Globe className="w-4 h-4" />}
                                                    label="Tingkat Akses"
                                                    value={cakupan}
                                                />
                                                {namaKecamatan && (
                                                    <InfoRow
                                                        icon={<Building className="w-4 h-4" />}
                                                        label="Kecamatan"
                                                        value={namaKecamatan}
                                                    />
                                                )}
                                                {namaDesa && (
                                                    <InfoRow
                                                        icon={<Home className="w-4 h-4" />}
                                                        label="Desa"
                                                        value={namaDesa}
                                                    />
                                                )}
                                                {!namaKecamatan && !namaDesa && (
                                                    <InfoRow
                                                        icon={<Globe className="w-4 h-4" />}
                                                        label="Jangkauan"
                                                        value="Seluruh wilayah Kabupaten"
                                                    />
                                                )}
                                            </>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Tips card */}
                                <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/10 p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                                        <Sparkles className="w-4 h-4" />
                                        <p className="text-xs font-semibold">Tips Keamanan Akun</p>
                                    </div>
                                    <ul className="space-y-1.5 text-[11px] text-blue-600 dark:text-blue-400/80">
                                        <li className="flex items-start gap-1.5">
                                            <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                            Perbarui kata sandi secara berkala (90 hari sekali).
                                        </li>
                                        <li className="flex items-start gap-1.5">
                                            <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                            Jangan bagikan kredensial login kepada siapapun.
                                        </li>
                                        <li className="flex items-start gap-1.5">
                                            <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                            Pastikan no. HP yang terdaftar masih aktif.
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* ─── Tab: Keamanan ─── */}
                    <TabsContent value="keamanan" className="mt-4">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                            <Card className="lg:col-span-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden">
                                <CardHeader className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                                    <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                        <Lock className="w-4 h-4 text-blue-500" />
                                        Ganti Kata Sandi
                                    </CardTitle>
                                    <CardDescription className="text-[11px]">
                                        Gunakan kata sandi yang kuat dan unik untuk melindungi akun Anda
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <form onSubmit={handleChangePassword} className="space-y-4">
                                        {/* Old password */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="old-password" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                                Kata Sandi Lama
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="old-password"
                                                    type={showOld ? "text" : "password"}
                                                    value={oldPassword}
                                                    onChange={(e) => setOldPassword(e.target.value)}
                                                    placeholder="Masukkan kata sandi lama"
                                                    className="h-9 text-sm rounded-lg pr-10"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowOld(v => !v)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                                                    tabIndex={-1}
                                                >
                                                    {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <Separator className="my-1" />

                                        {/* New password */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="new-password" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                                Kata Sandi Baru
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="new-password"
                                                    type={showNew ? "text" : "password"}
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    placeholder="Minimal 8 karakter"
                                                    className="h-9 text-sm rounded-lg pr-10"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNew(v => !v)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                                                    tabIndex={-1}
                                                >
                                                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>

                                            {/* Strength meter */}
                                            {newPassword && (
                                                <div className="space-y-1.5 pt-1">
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3, 4, 5].map(i => (
                                                            <div
                                                                key={i}
                                                                className={cn(
                                                                    "h-1 flex-1 rounded-full transition-all duration-500",
                                                                    i <= passwordStrength.score ? passwordStrength.color : "bg-slate-200 dark:bg-slate-700"
                                                                )}
                                                            />
                                                        ))}
                                                    </div>
                                                    <p className={cn("text-[10px] font-semibold", {
                                                        "text-red-500": passwordStrength.score <= 1,
                                                        "text-orange-500": passwordStrength.score === 2,
                                                        "text-yellow-600": passwordStrength.score === 3,
                                                        "text-emerald-600": passwordStrength.score >= 4,
                                                    })}>
                                                        Kekuatan: {passwordStrength.label}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Confirm password */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="confirm-password" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                                Konfirmasi Kata Sandi Baru
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="confirm-password"
                                                    type={showConfirm ? "text" : "password"}
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    placeholder="Ulangi kata sandi baru"
                                                    className={cn(
                                                        "h-9 text-sm rounded-lg pr-10 transition-all",
                                                        passwordsMatch && "border-emerald-500 focus-visible:ring-emerald-500",
                                                        passwordsMismatch && "border-red-400 focus-visible:ring-red-400"
                                                    )}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirm(v => !v)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                                                    tabIndex={-1}
                                                >
                                                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            {passwordsMatch && (
                                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" /> Kata sandi cocok
                                                </p>
                                            )}
                                            {passwordsMismatch && (
                                                <p className="text-[10px] text-red-500 flex items-center gap-1">
                                                    <XCircle className="w-3 h-3" /> Kata sandi tidak cocok
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                                            <Button
                                                type="submit"
                                                disabled={isSavingPassword || !oldPassword || !newPassword || !confirmPassword}
                                                className="h-9 text-xs px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5"
                                            >
                                                {isSavingPassword ? (
                                                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Memperbarui...</>
                                                ) : (
                                                    <><Lock className="w-3.5 h-3.5" /> Ubah Kata Sandi</>
                                                )}
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>

                            {/* Right: password requirements */}
                            <div className="lg:col-span-2 flex flex-col gap-4">
                                <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden">
                                    <CardHeader className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                                        <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-emerald-500" />
                                            Persyaratan Kata Sandi
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-5 space-y-2.5">
                                        {[
                                            { label: "Minimal 8 karakter", met: newPassword.length >= 8 },
                                            { label: "Minimal 12 karakter (lebih aman)", met: newPassword.length >= 12 },
                                            { label: "Mengandung huruf kapital (A-Z)", met: /[A-Z]/.test(newPassword) },
                                            { label: "Mengandung angka (0-9)", met: /[0-9]/.test(newPassword) },
                                            { label: "Mengandung karakter khusus (!@#$)", met: /[^A-Za-z0-9]/.test(newPassword) },
                                        ].map((req, i) => (
                                            <div key={i} className={cn("flex items-center gap-2.5 text-[11px] transition-colors", req.met ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500")}>
                                                {req.met ? (
                                                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                                                ) : (
                                                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 dark:border-slate-600 flex-shrink-0" />
                                                )}
                                                {req.label}
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/10 p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                        <AlertTriangle className="w-4 h-4" />
                                        <p className="text-xs font-semibold">Peringatan</p>
                                    </div>
                                    <p className="text-[11px] text-amber-600 dark:text-amber-400/80 leading-relaxed">
                                        Setelah mengganti kata sandi, Anda mungkin perlu melakukan login ulang di semua perangkat.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* ─── Tab: Info Akun ─── */}
                    <TabsContent value="akun" className="mt-4">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                            <Card className="lg:col-span-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden">
                                <CardHeader className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                                    <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-blue-500" />
                                        Status & Otorisasi Akun
                                    </CardTitle>
                                    <CardDescription className="text-[11px]">
                                        Informasi resmi akses dan otorisasi akun Anda di sistem MELAROSA
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-3">
                                    <div className="space-y-0.5">
                                        <InfoRow icon={<Hash className="w-4 h-4" />} label="ID Pengguna" value={user.id?.toString() || "-"} mono />
                                        <InfoRow
                                            icon={<CheckCircle2 className="w-4 h-4" />}
                                            label="Status Akun"
                                            value={
                                                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    Aktif Terverifikasi
                                                </span>
                                            }
                                        />
                                        <InfoRow
                                            icon={<Shield className="w-4 h-4" />}
                                            label="Peran Sistem"
                                            value={
                                                <Badge className={cn("text-[10px] font-semibold px-2 py-0.5 border rounded-md gap-1", roleInfo.color)}>
                                                    {roleInfo.icon} {roleInfo.label}
                                                </Badge>
                                            }
                                        />
                                        <InfoRow icon={<Globe className="w-4 h-4" />} label="Cakupan Wilayah" value={cakupan} />
                                        {(nip || (profile as any)?.nip) && (
                                            <InfoRow icon={<Hash className="w-4 h-4" />} label="NIP" value={nip || (profile as any)?.nip} mono />
                                        )}
                                        {(noHp || (profile as any)?.no_hp) && (
                                            <InfoRow icon={<Phone className="w-4 h-4" />} label="No. HP / WA" value={noHp || (profile as any)?.no_hp} mono />
                                        )}
                                        {(jabatan || (profile as any)?.jabatan) && (
                                            <InfoRow icon={<Briefcase className="w-4 h-4" />} label="Jabatan" value={jabatan || (profile as any)?.jabatan} />
                                        )}
                                        {namaKecamatan && (
                                            <InfoRow icon={<Building className="w-4 h-4" />} label="Kecamatan" value={namaKecamatan} />
                                        )}
                                        {namaDesa && (
                                            <InfoRow icon={<Home className="w-4 h-4" />} label="Desa" value={namaDesa} />
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Right: role summary card */}
                            <div className="lg:col-span-2 flex flex-col gap-4">
                                <div className={cn("rounded-2xl p-5 text-white relative overflow-hidden", `bg-gradient-to-br ${roleInfo.gradient}`)}>
                                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.3),_transparent)]" />
                                    <div className="relative">
                                        <p className="text-3xl mb-2">{roleInfo.icon}</p>
                                        <p className="text-lg font-bold leading-tight">{roleInfo.label}</p>
                                        <p className="text-xs text-white/70 mt-1">{cakupan}</p>
                                        <Separator className="my-3 bg-white/20" />
                                        <div className="space-y-1">
                                            {namaKecamatan && (
                                                <p className="text-xs text-white/80 flex items-center gap-1.5">
                                                    <Building className="w-3 h-3" /> {namaKecamatan}
                                                </p>
                                            )}
                                            {namaDesa && (
                                                <p className="text-xs text-white/80 flex items-center gap-1.5">
                                                    <Home className="w-3 h-3" /> {namaDesa}
                                                </p>
                                            )}
                                            {!namaKecamatan && !namaDesa && (
                                                <p className="text-xs text-white/80">Akses ke seluruh wilayah</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                        <Info className="w-4 h-4 text-blue-500" />
                                        <p className="text-xs font-semibold">Tentang Peran Anda</p>
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                        {user.role === "super_admin" && "Anda memiliki akses penuh ke seluruh fitur sistem MELAROSA, termasuk manajemen pengguna, konfigurasi sistem, dan seluruh data wilayah."}
                                        {user.role === "operator_bappeda" && "Anda memiliki akses untuk memantau, memverifikasi, dan mengelola data infrastruktur di seluruh wilayah Kabupaten Bojonegoro."}
                                        {user.role === "operator_kecamatan" && "Anda memiliki akses untuk mengelola data infrastruktur dalam lingkup kecamatan yang ditugaskan kepada Anda."}
                                        {user.role === "operator_desa" && "Anda memiliki akses untuk menginput dan mengelola data infrastruktur dalam lingkup desa yang ditugaskan kepada Anda."}
                                        {!["super_admin", "operator_bappeda", "operator_kecamatan", "operator_desa"].includes(user.role) && "Hubungi administrator untuk informasi lebih lanjut tentang hak akses Anda."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
