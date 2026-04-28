import { useState } from "react";
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
    IconX
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

    const navLinks = [
        { name: "Beranda", path: "/", icon: IconHome },
        { name: "Map View", path: "/map-view", icon: IconMap2 },
        { name: "Jalan Desa", path: "/jalan-desa", icon: IconRoute },
        { name: "Katalog", path: "/katalog-dataset", icon: IconDatabase },
        { name: "Statistik", path: "/statistik", icon: IconChartBar },
    ];

    const isMapView = location.pathname === "/map-view";

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-white/70 backdrop-blur-xl transition-all duration-300 dark:bg-slate-900/70 dark:border-slate-800/50">
            <div
                className={cn(
                    "mx-auto flex h-16 items-center justify-between px-4 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
                    isMapView ? "w-full max-w-none px-6" : "container lg:px-8"
                )}
            >
                {/* Brand */}
                <div className="flex items-center gap-8">
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200 transition-transform group-hover:scale-110">
                            <IconActivity size={24} />
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic">GIGIS</span>
                            <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Monitoring</span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1.5 ml-4">
                        {navLinks.map((link) => {
                            const isActive = location.pathname === link.path;
                            return (
                                <Link key={link.path} to={link.path}>
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "h-10 px-4 rounded-xl text-sm font-bold transition-all gap-2",
                                            isActive
                                                ? "text-blue-600 bg-blue-50/50 dark:bg-blue-900/20 dark:text-blue-400"
                                                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
                                        )}
                                    >
                                        <link.icon size={18} stroke={isActive ? 2.5 : 2} />
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
                                className="h-10 rounded-xl bg-slate-950 hover:bg-slate-900 text-white gap-2 px-5 font-bold shadow-xl shadow-slate-200 dark:shadow-none transition-all group"
                            >
                                Admin <IconArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                            </Button>
                        ) : (
                            <Link to="/login">
                                <Button
                                    variant="ghost"
                                    className="h-10 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 gap-2 font-bold transition-all px-4"
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
                                className="md:hidden rounded-xl text-slate-600 dark:text-slate-300"
                            >
                                <IconMenu2 size={24} />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[300px] p-0 flex flex-col bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800">
                            <SheetHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                                        <IconActivity size={24} />
                                    </div>
                                    <div className="text-left leading-none">
                                        <SheetTitle className="text-xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic">GIGIS</SheetTitle>
                                        <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Monitoring Peta</span>
                                    </div>
                                </div>
                            </SheetHeader>

                            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                                {navLinks.map((link) => {
                                    const isActive = location.pathname === link.path;
                                    return (
                                        <Link key={link.path} to={link.path} onClick={() => setIsMobileMenuOpen(false)}>
                                            <Button
                                                variant="ghost"
                                                className={cn(
                                                    "w-full justify-start h-12 rounded-xl text-base font-bold transition-all gap-4 px-4",
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

                            <div className="p-6 mt-auto border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                {isAuthenticated ? (
                                    <Button
                                        onClick={() => { navigate("/admin/dashboard"); setIsMobileMenuOpen(false); }}
                                        className="w-full h-12 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white gap-2 font-bold uppercase tracking-widest text-[10px] shadow-xl"
                                    >
                                        DASHBOARD SYSTEM <IconArrowRight size={18} />
                                    </Button>
                                ) : (
                                    <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="block">
                                        <Button
                                            className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold uppercase tracking-widest text-[10px] shadow-xl shadow-blue-200 dark:shadow-none"
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
