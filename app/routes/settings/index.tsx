import React, { useState } from "react";
import { 
    User as UserIcon, 
    Shield, 
    Map, 
    Menu as MenuIcon, 
    Lock, 
    Settings, 
    Palette,
    Monitor,
    ShieldAlert
} from "lucide-react";
import { useAbility } from "~/contexts/AbilityContext";
import { useAuth } from "~/contexts/auth-context";
import { cn } from "~/lib/utils";
import type { MetaFunction } from "react-router";

// Import existing relevant features
import SessionsIndex from "../master/sessions/index";
import BasemapsIndex from "../master/basemaps/index";
import MenusIndex from "../master/menus/index";
import MenuAccessIndex from "../master/menu-access/index";
import ProfilePage from "../profile/index";
import { ModeToggle } from "~/components/mode-toggle";

export const meta: MetaFunction = () => {
    return [
        { title: "Pengaturan & Konfigurasi - MELAROSA" },
        { name: "description", content: "Pengaturan profil, keamanan, menu, basemap, dan preferensi aplikasi" },
    ];
};

type TabId = "profile" | "sessions" | "basemaps" | "menus" | "menu-access" | "appearance";

export default function SettingsIndex() {
    const ability = useAbility();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabId>("profile");

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <p className="text-muted-foreground">Silakan masuk terlebih dahulu.</p>
            </div>
        );
    }

    if (user.role !== "super_admin" && user.role !== "operator_bappeda") {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[400px] p-6">
                <div className="text-center space-y-3 max-w-md bg-card border border-slate-100 dark:border-slate-800 p-8 rounded-3xl shadow-xs">
                    <div className="flex justify-center">
                        <ShieldAlert className="w-12 h-12 text-rose-500" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Akses Ditolak</h2>
                    <p className="text-xs text-muted-foreground">
                        Halaman pengaturan ini hanya dapat diakses oleh peran Super Admin atau Operator Bappeda.
                    </p>
                </div>
            </div>
        );
    }

    const tabs = [
        {
            id: "profile" as TabId,
            label: "Profil Saya",
            icon: UserIcon,
            visible: true,
            description: "Informasi detail akun dan kata sandi Anda"
        },
        {
            id: "sessions" as TabId,
            label: "Sesi Aktif & Keamanan",
            icon: Shield,
            visible: true,
            description: "Kelola sesi perangkat aktif yang terhubung ke akun Anda"
        },
        {
            id: "basemaps" as TabId,
            label: "Basemaps Peta",
            icon: Map,
            visible: ability.can("read", "Basemap"),
            description: "Kelola daftar pilihan basemap spasial yang terdaftar"
        },
        {
            id: "menus" as TabId,
            label: "Manajemen Menu",
            icon: MenuIcon,
            visible: ability.can("read", "Menu"),
            description: "Atur struktur menu navigasi dinamis aplikasi"
        },
        {
            id: "menu-access" as TabId,
            label: "Hak Akses Menu",
            icon: Lock,
            visible: ability.can("read", "MenuAccess") || user?.role === "super_admin",
            description: "Konfigurasi korelasi akses menu untuk setiap role"
        },
        {
            id: "appearance" as TabId,
            label: "Tampilan & Tema",
            icon: Palette,
            visible: true,
            description: "Kustomisasi mode gelap/terang dan preferensi UI"
        }
    ];

    const activeTabInfo = tabs.find(t => t.id === activeTab);

    return (
        <div className="flex-1 flex flex-col md:flex-row gap-6 p-6 max-w-7xl mx-auto w-full min-h-0">
            {/* Left Sidebar Navigation */}
            <div className="w-full md:w-72 shrink-0 space-y-4">
                <div className="space-y-1.5 px-2">
                    <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Settings className="w-6 h-6 text-blue-600 animate-spin-slow" />
                        Pengaturan
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        Kelola data profil, tingkat keamanan sesi perangkat, serta konfigurasi menu & sistem.
                    </p>
                </div>
                <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 md:overflow-x-visible">
                    {tabs.filter(t => t.visible).map((tab) => {
                        const IconComponent = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold transition-all duration-200 shrink-0 md:shrink border",
                                    isActive 
                                        ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10" 
                                        : "bg-card text-slate-650 hover:bg-slate-100/50 border-slate-100 dark:text-slate-350 dark:hover:bg-slate-900/50 dark:border-slate-800"
                                )}
                            >
                                <IconComponent className={cn("w-4.5 h-4.5", isActive ? "text-white" : "text-slate-405 dark:text-slate-500")} />
                                <span className="truncate">{tab.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Right Pane Content */}
            <div className="flex-1 min-w-0 flex flex-col bg-card border border-slate-100 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-muted/20">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{activeTabInfo?.label}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{activeTabInfo?.description}</p>
                </div>
                
                <div className="flex-1 overflow-y-auto min-h-0">
                    {activeTab === "profile" && (
                        <div className="py-2">
                            <ProfilePage />
                        </div>
                    )}

                    {activeTab === "sessions" && (
                        <div className="p-6">
                            <SessionsIndex />
                        </div>
                    )}

                    {activeTab === "basemaps" && (
                        <div className="p-6">
                            <BasemapsIndex />
                        </div>
                    )}

                    {activeTab === "menus" && (
                        <div className="p-6">
                            <MenusIndex />
                        </div>
                    )}

                    {activeTab === "menu-access" && (
                        <div className="p-6">
                            <MenuAccessIndex />
                        </div>
                    )}

                    {activeTab === "appearance" && (
                        <div className="p-8 space-y-6 max-w-xl">
                            <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-2xl">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Mode Tema Visual</h3>
                                    <p className="text-xs text-muted-foreground">Aktifkan mode gelap atau terang untuk kenyamanan mata Anda.</p>
                                </div>
                                <ModeToggle />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
