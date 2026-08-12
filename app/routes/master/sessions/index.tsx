import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
    Monitor, 
    Smartphone, 
    Laptop, 
    Globe, 
    LogOut, 
    RotateCw, 
    AlertCircle, 
    ShieldAlert, 
    Activity,
    ChevronLeft
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
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
import { Spinner } from "~/components/ui/spinner";
import { authService } from "~/services/auth.service";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
    return [
        { title: "Sesi Aktif Perangkat - MELAROSA" },
        { name: "description", content: "Kelola sesi masuk Anda pada berbagai perangkat" },
    ];
};

interface Session {
    id: string;
    ip_address: string;
    device_name: string;
    browser: string;
    os: string;
    login_time: string;
    last_activity: string;
    expires_at: string;
    current_device: boolean;
}

export default function SessionsIndex() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Alert Dialog States
    const [revokeTarget, setRevokeTarget] = useState<Session | null>(null);
    const [showLogoutAllConfirm, setShowLogoutAllConfirm] = useState(false);

    // Fetch active sessions
    const fetchSessions = async () => {
        setLoading(true);
        try {
            const response = await authService.getActiveSessions();
            if (response && response.status === "success") {
                setSessions(response.data || []);
            } else {
                toast.error(response?.message || "Gagal mengambil sesi aktif");
            }
        } catch (error) {
            console.error(error);
            toast.error("Terjadi kesalahan saat memuat data sesi");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    // Revoke a single specific session
    const handleRevokeSession = async () => {
        if (!revokeTarget) return;
        setActionLoading(true);
        try {
            const response = await authService.revokeSession(revokeTarget.id);
            if (response && response.status === "success") {
                toast.success(`Sesi perangkat ${revokeTarget.device_name} berhasil dicabut`);
                // Update local sessions state
                setSessions(prev => prev.filter(s => s.id !== revokeTarget.id));
            } else {
                toast.error(response?.message || "Gagal mencabut sesi perangkat");
            }
        } catch (error) {
            console.error(error);
            toast.error("Terjadi kesalahan saat memutuskan sesi perangkat");
        } finally {
            setActionLoading(false);
            setRevokeTarget(null);
        }
    };

    // Logout from all other devices
    const handleLogoutAllDevices = async () => {
        setActionLoading(true);
        try {
            const response = await authService.logoutAllDevices();
            if (response && response.status === "success") {
                toast.success("Berhasil mengeluarkan akun dari seluruh perangkat lain");
                // Retain only current device session in local state
                setSessions(prev => prev.filter(s => s.current_device));
            } else {
                toast.error(response?.message || "Gagal mencabut sesi perangkat lain");
            }
        } catch (error) {
            console.error(error);
            toast.error("Terjadi kesalahan saat mencabut semua sesi");
        } finally {
            setActionLoading(false);
            setShowLogoutAllConfirm(false);
        }
    };

    // Helper to render responsive icon for device type
    const renderDeviceIcon = (deviceName: string) => {
        const name = deviceName.toLowerCase();
        if (name.includes("phone") || name.includes("mobile") || name.includes("android") || name.includes("iphone")) {
            return <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
        }
        if (name.includes("desktop") || name.includes("windows") || name.includes("mac") || name.includes("linux")) {
            return <Laptop className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
        }
        return <Monitor className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
    };

    // Helper to format date strings cleanly
    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-";
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="absolute inset-0 flex flex-col gap-4 p-4 bg-background dark:bg-slate-950 overflow-hidden">
            {/* Header (Batas Desa layout) */}
            <div className="flex items-center justify-between gap-4 shrink-0 pb-1 border-b border-slate-100 dark:border-slate-800/50">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-600 animate-pulse" />
                        Sesi Perangkat Aktif
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                        Daftar perangkat yang sedang masuk menggunakan akun Anda. Anda dapat mengontrol dan mencabut akses sesi di sini.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-9 w-9"
                        onClick={fetchSessions}
                        disabled={loading || actionLoading}
                        title="Perbarui data"
                    >
                        <RotateCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => setShowLogoutAllConfirm(true)}
                        disabled={loading || actionLoading || sessions.filter(s => !s.current_device).length === 0}
                        className="h-9 bg-red-600 hover:bg-red-700 text-white font-semibold gap-1.5 shrink-0"
                    >
                        <LogOut className="w-4 h-4" />
                        Keluarkan Perangkat Lain
                    </Button>
                </div>
            </div>

            {/* Alertbox for security limit */}
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg dark:bg-blue-950/20 dark:border-blue-500/50 flex gap-3 shadow-xs shrink-0">
                <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-semibold">Maksimal Sesi Login Aktif</p>
                    <p className="mt-0.5 leading-relaxed">
                        Akun Anda dibatasi untuk login maksimal pada **3 perangkat aktif** secara bersamaan. Melakukan login pada perangkat ke-4 akan secara otomatis mengeluarkan (LRU eviction) perangkat yang paling tidak aktif.
                    </p>
                </div>
            </div>

            {/* Sessions Card Table Container (Batas Desa style) */}
            <div className="flex-1 min-h-0 flex flex-col mb-4">
                <Card className="gap-0 py-0 overflow-hidden border dark:border-slate-800 bg-white dark:bg-slate-950 relative flex flex-col flex-1 min-h-0">
                    <CardContent className="p-0 overflow-auto custom-scrollbar flex-1 min-h-0 [&_[data-slot=table-container]]:overflow-visible">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <Spinner className="size-8 text-indigo-600" />
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Memuat sesi aktif...</p>
                            </div>
                        ) : sessions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">Sesi tidak ditemukan</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                                    Tidak ada data sesi aktif terdaftar untuk akun Anda.
                                </p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                                    <TableRow>
                                        <TableHead className="font-semibold w-[220px]">Perangkat</TableHead>
                                        <TableHead className="font-semibold">Browser & OS</TableHead>
                                        <TableHead className="font-semibold w-[150px]">Alamat IP</TableHead>
                                        <TableHead className="font-semibold w-[200px]">Aktivitas Terakhir</TableHead>
                                        <TableHead className="font-semibold w-[200px]">Waktu Login</TableHead>
                                        <TableHead className="w-[120px] text-right font-semibold">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sessions.map((session) => (
                                        <TableRow 
                                            key={session.id}
                                            className={cn(
                                                "group transition-colors",
                                                session.current_device && "bg-indigo-50/20 dark:bg-indigo-950/10"
                                            )}
                                        >
                                            {/* Perangkat */}
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 shrink-0">
                                                        {renderDeviceIcon(session.device_name)}
                                                    </div>
                                                    <div className="truncate max-w-[150px]">
                                                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                            {session.device_name}
                                                        </div>
                                                        {session.current_device && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-850 dark:bg-indigo-900/50 dark:text-indigo-200 mt-1">
                                                                Perangkat Ini
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Browser & OS */}
                                            <TableCell>
                                                <div className="text-slate-700 dark:text-slate-300">
                                                    <span className="font-semibold">{session.browser}</span>
                                                    <span className="mx-1.5 text-slate-300 dark:text-slate-700">•</span>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{session.os}</span>
                                                </div>
                                            </TableCell>

                                            {/* IP Address */}
                                            <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">
                                                {session.ip_address}
                                            </TableCell>

                                            {/* Last Activity */}
                                            <TableCell className="text-slate-600 dark:text-slate-400 text-xs font-medium">
                                                {formatDate(session.last_activity)}
                                            </TableCell>

                                            {/* Login Time */}
                                            <TableCell className="text-slate-500 dark:text-slate-400 text-xs">
                                                {formatDate(session.login_time)}
                                            </TableCell>

                                            {/* Action Button */}
                                            <TableCell className="text-right">
                                                {session.current_device ? (
                                                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold pr-4">Aktif</span>
                                                ) : (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={actionLoading}
                                                        onClick={() => setRevokeTarget(session)}
                                                        className="h-7 border-red-200 dark:border-red-900/50 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                                    >
                                                        Keluarkan
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Confirm Dialog: Revoke Specific Session */}
            <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
                <AlertDialogContent className="border border-slate-100 dark:border-slate-800">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                            <ShieldAlert className="w-5 h-5" />
                            Keluarkan Perangkat?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
                            Apakah Anda yakin ingin mencabut sesi masuk pada perangkat <strong>{revokeTarget?.device_name}</strong> ({revokeTarget?.browser} di {revokeTarget?.os}) dengan alamat IP <strong>{revokeTarget?.ip_address}</strong>? Pengguna di perangkat tersebut akan otomatis keluar seketika.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleRevokeSession}
                            className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600 dark:bg-red-700 dark:hover:bg-red-800"
                        >
                            Keluarkan Perangkat
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Confirm Dialog: Logout All Other Devices */}
            <AlertDialog open={showLogoutAllConfirm} onOpenChange={setShowLogoutAllConfirm}>
                <AlertDialogContent className="border border-slate-100 dark:border-slate-800">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                            <ShieldAlert className="w-5 h-5 animate-bounce" />
                            Keluarkan Seluruh Perangkat Lain?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
                            Tindakan ini akan mencabut seluruh sesi login aktif Anda di perangkat lain secara bersamaan. Hanya sesi di browser saat ini yang akan tetap aktif. Semua sesi lainnya akan ditutup seketika.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleLogoutAllDevices}
                            className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600 dark:bg-red-700 dark:hover:bg-red-800"
                        >
                            Keluarkan Semua
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
