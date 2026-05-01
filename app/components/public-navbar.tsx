import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useAuth } from "~/contexts/auth-context";
import { Button } from "~/components/ui/button";
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
} from "@tabler/icons-react";
import { cn } from "~/lib/utils";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "~/components/ui/sheet";

export function PublicNavbar() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const navLinks = [
        { name: "Beranda", path: "/", icon: IconHome },
        { name: "Peta", path: "/map-view", icon: IconMap2 },
        { name: "Jalan Desa", path: "/jalan-desa", icon: IconRoute },
        { name: "Katalog Data", path: "/katalog-dataset", icon: IconDatabase },
        { name: "Statistik", path: "/statistik", icon: IconChartBar },
    ];

    const isHome = location.pathname === "/";
    const isMapView = location.pathname === "/map-view";
    const isTransparent = isHome && !isScrolled;

    return (
        <nav
            className={cn(
                "fixed top-0 z-50 w-full transition-all duration-500",
                isTransparent
                    ? "bg-transparent border-transparent pt-4"
                    : "bg-white/80 backdrop-blur-xl border-b border-slate-200/50 dark:bg-slate-950/80 dark:border-slate-800/50"
            )}
        >
            <div
                className={cn(
                    "mx-auto flex h-16 items-center justify-between px-4 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
                    isMapView ? "w-full max-w-none px-6" : "container lg:px-8",
                    isTransparent ? "h-20" : "h-16"
                )}
            >
                {/* Brand */}
                <div className="flex items-center gap-8">
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
                            isTransparent
                                ? "bg-white text-blue-600 shadow-xl shadow-white/10"
                                : "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                        )}>
                            <IconActivity size={26} stroke={2.5} />
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className={cn(
                                "text-2xl font-black tracking-tighter uppercase italic transition-colors duration-500",
                                isTransparent ? "text-white" : "text-slate-900 dark:text-white"
                            )}>GIGIS</span>
                            <span className={cn(
                                "text-[10px] font-black tracking-[0.2em] uppercase transition-colors duration-500",
                                isTransparent ? "text-blue-200" : "text-slate-400 dark:text-slate-500"
                            )}>Monitoring</span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1 ml-4">
                        {navLinks.map((link) => {
                            const isActive = location.pathname === link.path;
                            return (
                                <Link key={link.path} to={link.path}>
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "h-10 px-4 rounded-xl text-[12px] font-bold uppercase tracking-widest transition-all gap-2",
                                            isActive
                                                ? (isTransparent ? "text-white bg-white/20" : "text-blue-600 bg-blue-50/50 dark:bg-blue-900/20 dark:text-blue-400")
                                                : (isTransparent ? "text-white/70 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800")
                                        )}
                                    >
                                        <link.icon size={16} stroke={isActive ? 3 : 2} />
                                        {link.name}
                                    </Button>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Action Buttons & Mobile Toggle */}
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-3">
                        {isAuthenticated ? (
                            <Button
                                onClick={() => navigate("/admin/dashboard")}
                                className={cn(
                                    "h-11 rounded-2xl gap-2 px-6 font-bold uppercase tracking-widest text-[11px] transition-all group",
                                    isTransparent
                                        ? "bg-white text-slate-900 hover:bg-blue-50 shadow-xl"
                                        : "bg-slate-950 hover:bg-black text-white dark:bg-blue-600 dark:hover:bg-blue-700 shadow-xl shadow-slate-200 dark:shadow-none"
                                )}
                            >
                                Admin <IconArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                            </Button>
                        ) : (
                            <Link to="/login">
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "h-11 rounded-2xl gap-2 font-bold uppercase tracking-widest text-[11px] transition-all px-5",
                                        isTransparent
                                            ? "text-white hover:bg-white/10"
                                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    )}
                                >
                                    Sign In <IconLogin size={18} />
                                </Button>
                            </Link>
                        )}
                    </div>

                    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "md:hidden rounded-xl transition-colors",
                                    isTransparent ? "text-white hover:bg-white/10" : "text-slate-600 dark:text-slate-300"
                                )}
                            >
                                <IconMenu2 size={24} />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[300px] p-0 flex flex-col bg-white dark:bg-slate-950 border-l border-slate-100 dark:border-slate-800">
                            <SheetHeader className="p-8 border-b border-slate-100 dark:border-slate-900">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                                        <IconActivity size={26} />
                                    </div>
                                    <div className="text-left leading-none">
                                        <SheetTitle className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic">GIGIS</SheetTitle>
                                        <span className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">Monitoring</span>
                                    </div>
                                </div>
                            </SheetHeader>

                            <div className="flex-1 overflow-y-auto py-8 px-6 space-y-2">
                                {navLinks.map((link) => {
                                    const isActive = location.pathname === link.path;
                                    return (
                                        <Link key={link.path} to={link.path} onClick={() => setIsMobileMenuOpen(false)}>
                                            <Button
                                                variant="ghost"
                                                className={cn(
                                                    "w-full justify-start h-14 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all gap-4 px-5",
                                                    isActive
                                                        ? "text-blue-600 bg-blue-50/50 dark:bg-blue-900/20"
                                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
                                                )}
                                            >
                                                <link.icon size={22} stroke={isActive ? 2.5 : 2} />
                                                {link.name}
                                            </Button>
                                        </Link>
                                    );
                                })}
                            </div>

                            <div className="p-8 mt-auto border-t border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/50">
                                {isAuthenticated ? (
                                    <Button
                                        onClick={() => { navigate("/admin/dashboard"); setIsMobileMenuOpen(false); }}
                                        className="w-full h-14 rounded-2xl bg-slate-950 hover:bg-black text-white gap-3 font-black uppercase tracking-widest text-[11px] shadow-xl"
                                    >
                                        DASHBOARD SYSTEM <IconArrowRight size={18} />
                                    </Button>
                                ) : (
                                    <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="block">
                                        <Button
                                            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white gap-3 font-black uppercase tracking-widest text-[11px] shadow-xl shadow-blue-500/20 dark:shadow-none"
                                        >
                                            MASUK KE SISTEM <IconLogin size={18} />
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </nav>
    );
}

