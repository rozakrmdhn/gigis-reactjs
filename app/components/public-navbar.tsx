import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useAuth } from "~/contexts/auth-context";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "~/components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
    TooltipProvider,
} from "~/components/ui/tooltip";
import {
    IconActivity,
    IconArrowRight,
    IconLogin,
    IconMap2,
    IconHome,
    IconRoute,
    IconChartBar,
    IconDatabase,
    IconMenu2,
    IconLogout,
    IconLayoutDashboard,
    IconChevronDown,
} from "@tabler/icons-react";
import { cn } from "~/lib/utils";

export function PublicNavbar() {
    const { user, isAuthenticated, signout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navLinks = [
        { name: "Beranda", path: "/", icon: IconHome },
        { name: "Peta Spasial", path: "/map-view", icon: IconMap2 },
        { name: "Ruas Jalan", path: "/jalan-desa", icon: IconRoute },
        { name: "Statistik", path: "/statistik", icon: IconChartBar },
        { name: "Katalog Dataset", path: "/katalog-dataset", icon: IconDatabase },
    ];

    const isMapView = location.pathname === "/map-view";

    return (
        <TooltipProvider>
            <header
                className="fixed top-0 z-50 w-full bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs transition-colors duration-200"
            >
                <div className={cn(
                    "mx-auto flex items-center justify-between h-14 md:h-16 px-4 md:px-6 transition-all",
                    isMapView ? "w-full max-w-none" : "container max-w-7xl"
                )}>
                    {/* Brand */}
                    <div className="flex items-center gap-6 md:gap-8">
                        <Link to="/" className="flex items-center gap-2 group">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-all">
                                <IconActivity size={18} stroke={2.5} />
                            </div>
                            <div className="flex flex-col leading-none">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm md:text-base font-bold tracking-tight text-slate-900 dark:text-white">
                                        Melarosa
                                    </span>
                                    {isMapView && (
                                        <Badge variant="outline" className="hidden sm:inline-flex bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-[8px] font-semibold px-1.5 py-0 rounded-full gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Live GIS
                                        </Badge>
                                    )}
                                </div>
                                <span className="text-[8px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
                                    Monitoring
                                </span>
                            </div>
                        </Link>

                        {/* Desktop Nav Links */}
                        <nav className="hidden md:flex items-center gap-1">
                            {navLinks.map((link) => {
                                const isActive = location.pathname === link.path;
                                return (
                                    <Link key={link.path} to={link.path}>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "h-9 px-3.5 rounded-xl text-xs font-semibold transition-all gap-2 cursor-pointer",
                                                isActive
                                                    ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 font-bold border border-blue-100 dark:border-blue-800/50 shadow-xs"
                                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800"
                                            )}
                                        >
                                            <link.icon size={16} stroke={isActive ? 2.5 : 2} className={cn(isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400")} />
                                            <span>{link.name}</span>
                                        </Button>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Actions Right Side */}
                    <div className="flex items-center gap-2.5">
                        <div className="hidden md:flex items-center gap-2">
                            {isAuthenticated ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="h-9 rounded-xl gap-2 px-3 font-semibold text-xs transition-all border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                                        >
                                            <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                                                {user?.nama?.charAt(0).toUpperCase() || "A"}
                                            </div>
                                            <span className="truncate max-w-[120px]">{user?.nama || "Admin"}</span>
                                            <IconChevronDown size={14} className="text-slate-400" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48 p-1.5 rounded-xl border-slate-200 dark:border-slate-800 shadow-xl">
                                        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-slate-500">
                                            Akun Terhubung
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => navigate("/admin/dashboard")}
                                            className="rounded-lg text-xs font-semibold gap-2 py-2 cursor-pointer"
                                        >
                                            <IconLayoutDashboard size={16} className="text-blue-600" />
                                            Dashboard System
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => signout()}
                                            className="rounded-lg text-xs font-semibold gap-2 py-2 text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/40 cursor-pointer"
                                        >
                                            <IconLogout size={16} />
                                            Keluar
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <Link to="/login">
                                    <Button
                                        size="sm"
                                        className="h-9 rounded-xl gap-2 font-semibold text-xs transition-all px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                                    >
                                        Masuk <IconLogin size={15} />
                                    </Button>
                                </Link>
                            )}
                        </div>

                        {/* Mobile Sheet Trigger */}
                        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="md:hidden h-9 w-9 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                    <IconMenu2 size={20} />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[300px] p-0 flex flex-col bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800">
                                <SheetHeader className="p-6 border-b border-slate-100 dark:border-slate-900">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                                            <IconActivity size={18} />
                                        </div>
                                        <div className="text-left leading-none">
                                            <SheetTitle className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Melarosa</SheetTitle>
                                            <span className="text-[8px] font-semibold text-slate-400 tracking-wider mt-0.5 block">Monitoring</span>
                                        </div>
                                    </div>
                                </SheetHeader>

                                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
                                    {navLinks.map((link) => {
                                        const isActive = location.pathname === link.path;
                                        return (
                                            <Link key={link.path} to={link.path} onClick={() => setIsMobileMenuOpen(false)}>
                                                <Button
                                                    variant="ghost"
                                                    className={cn(
                                                        "w-full justify-start h-12 rounded-xl text-xs font-semibold transition-all gap-3 px-4",
                                                        isActive
                                                            ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 font-bold border border-blue-100 dark:border-blue-800/50"
                                                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60"
                                                    )}
                                                >
                                                    <link.icon size={18} stroke={isActive ? 2.5 : 2} className={cn(isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400")} />
                                                    {link.name}
                                                </Button>
                                            </Link>
                                        );
                                    })}
                                </div>

                                <div className="p-6 mt-auto border-t border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/50">
                                    {isAuthenticated ? (
                                        <Button
                                            onClick={() => { navigate("/admin/dashboard"); setIsMobileMenuOpen(false); }}
                                            className="w-full h-12 rounded-xl bg-slate-950 hover:bg-black text-white gap-2 font-semibold text-xs shadow-lg"
                                        >
                                            Dashboard System <IconArrowRight size={16} />
                                        </Button>
                                    ) : (
                                        <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="block">
                                            <Button
                                                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-2 font-semibold text-xs shadow-lg shadow-blue-500/20"
                                            >
                                                Masuk ke Sistem <IconLogin size={16} />
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </header>
        </TooltipProvider>
    );
}
