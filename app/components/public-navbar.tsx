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
        { name: "Peta Interaktif", path: "/map-view", icon: IconMap2 },
        { name: "Ruas Jalan", path: "/jalan-desa", icon: IconRoute },
        { name: "Statistik", path: "/statistik", icon: IconChartBar },
        { name: "Katalog Dataset", path: "/katalog-dataset", icon: IconDatabase },
    ];

    const isMapView = location.pathname === "/map-view";

    return (
        <TooltipProvider>
            <header
                className="fixed top-0 z-50 w-full bg-[#080B11]/90 backdrop-blur-xl border-b border-white/[0.06] shadow-xs transition-colors duration-200"
            >
                <div className={cn(
                    "mx-auto flex items-center justify-between h-14 md:h-16 px-4 md:px-6 transition-all",
                    isMapView ? "w-full max-w-none" : "container max-w-7xl"
                )}>
                    {/* Brand */}
                    <div className="flex items-center gap-6 md:gap-8">
                        <Link to="/" className="flex items-center gap-2.5 group">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 border border-white/[0.12] text-white shadow-sm group-hover:scale-105 transition-all">
                                <IconActivity size={18} stroke={2.2} className="text-emerald-400" />
                            </div>
                            <div className="flex flex-col leading-none">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm md:text-base font-bold tracking-tight text-white">
                                        Melarosa
                                    </span>
                                    {isMapView && (
                                        <Badge variant="outline" className="hidden sm:inline-flex bg-emerald-950/40 text-emerald-400 border-emerald-800/60 text-[8px] font-semibold px-1.5 py-0 rounded-full gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            Live GIS
                                        </Badge>
                                    )}
                                </div>
                                <span className="text-[8px] font-semibold tracking-wider text-slate-400 mt-0.5 uppercase">
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
                                                "h-9 px-3.5 rounded-xl text-xs font-medium transition-all gap-2 cursor-pointer",
                                                isActive
                                                    ? "text-white bg-white/[0.08] font-bold border border-white/[0.08] shadow-xs"
                                                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                                            )}
                                        >
                                            <link.icon size={16} stroke={isActive ? 2.5 : 1.8} className={cn(isActive ? "text-white" : "text-slate-400")} />
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
                                            className="h-9 rounded-xl gap-2 px-3 font-semibold text-xs transition-all border border-white/[0.08] bg-slate-900/80 text-white cursor-pointer hover:bg-slate-800"
                                        >
                                            <div className="w-6 h-6 rounded-lg bg-slate-800 border border-white/[0.1] text-white flex items-center justify-center font-bold text-[10px]">
                                                {user?.nama?.charAt(0).toUpperCase() || "A"}
                                            </div>
                                            <span className="truncate max-w-[120px]">{user?.nama || "Admin"}</span>
                                            <IconChevronDown size={14} className="text-slate-400" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48 p-1.5 rounded-xl bg-slate-900 border-white/[0.08] text-slate-200 shadow-xl">
                                        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-slate-400">
                                            Akun Terhubung
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator className="bg-slate-800" />
                                        <DropdownMenuItem
                                            onClick={() => navigate("/admin/dashboard")}
                                            className="rounded-lg text-xs font-semibold gap-2 py-2 text-slate-200 focus:bg-slate-800 focus:text-white cursor-pointer"
                                        >
                                            <IconLayoutDashboard size={16} className="text-slate-300" />
                                            Dashboard System
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-slate-800" />
                                        <DropdownMenuItem
                                            onClick={async () => {
                                                await signout();
                                            }}
                                            className="rounded-lg text-xs font-semibold gap-2 py-2 text-red-400 focus:bg-red-950/40 focus:text-red-300 cursor-pointer"
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
                                        className="h-9 rounded-xl gap-2 font-semibold text-xs transition-all px-4 bg-white text-slate-950 hover:bg-slate-200 shadow-xs cursor-pointer"
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
                                    className="md:hidden h-9 w-9 rounded-xl text-slate-300 hover:bg-white/[0.06] hover:text-white cursor-pointer"
                                >
                                    <IconMenu2 size={20} />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[300px] p-0 flex flex-col bg-[#080B11] text-white border-l border-white/[0.08]">
                                <SheetHeader className="p-6 border-b border-white/[0.06]">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 border border-white/[0.1] text-white shadow-sm">
                                            <IconActivity size={18} className="text-emerald-400" />
                                        </div>
                                        <div className="text-left leading-none">
                                            <SheetTitle className="text-base font-bold tracking-tight text-white">Melarosa</SheetTitle>
                                            <span className="text-[8px] font-semibold text-slate-400 tracking-wider mt-0.5 block uppercase">Monitoring</span>
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
                                                            ? "text-white bg-white/[0.08] font-bold border border-white/[0.08]"
                                                            : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                                                    )}
                                                >
                                                    <link.icon size={18} stroke={isActive ? 2.5 : 2} className={cn(isActive ? "text-white" : "text-slate-400")} />
                                                    {link.name}
                                                </Button>
                                            </Link>
                                        );
                                    })}
                                </div>

                                <div className="p-6 mt-auto border-t border-white/[0.06] bg-[#0E131F]/40">
                                    {isAuthenticated ? (
                                        <Button
                                            onClick={() => { navigate("/admin/dashboard"); setIsMobileMenuOpen(false); }}
                                            className="w-full h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-white gap-2 font-semibold text-xs shadow-lg border border-white/[0.08]"
                                        >
                                            Dashboard System <IconArrowRight size={16} />
                                        </Button>
                                    ) : (
                                        <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="block">
                                            <Button
                                                className="w-full h-12 rounded-xl bg-white text-slate-950 hover:bg-slate-200 gap-2 font-semibold text-xs shadow-lg"
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
