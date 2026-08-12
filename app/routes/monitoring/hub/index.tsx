import React from 'react';
import { useNavigate, Link } from 'react-router';
import {
    Route,
    Footprints,
    GitCommit,
    Droplets,
    Waves,
    Layers,
    ArrowRight,
    Sparkles,
    Activity,
    Plus,
    CheckCircle2,
    MapPin,
    ShieldCheck
} from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { useInfrastrukturTipe } from '~/features/monitoring/hooks/useInfrastrukturTipe';
import type { MetaFunction } from 'react-router';

export const meta: MetaFunction = () => {
    return [
        { title: "Hub Monitoring Infrastruktur - MELAROSA Bappeda" },
        { name: "description", content: "Pilih tipe infrastruktur untuk monitoring dan digitasi spasial" },
    ];
};

const ICON_MAP: Record<string, React.ElementType> = {
    road: Route,
    path: Footprints,
    bridge: GitCommit,
    droplets: Droplets,
    waves: Waves,
};

export default function MonitoringHubPage() {
    const navigate = useNavigate();
    const { tipes, isLoading } = useInfrastrukturTipe();

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 md:p-8 space-y-8 animate-in fade-in duration-300">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800 font-bold px-3 py-1 rounded-full text-xs">
                            <Sparkles className="w-3.5 h-3.5 mr-1" /> Multi-Infrastruktur V1
                        </Badge>
                        <span className="text-xs text-slate-400 font-medium">| Web GIS System</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                        Hub Monitoring Infrastruktur
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                        Pilih tipe infrastruktur di bawah ini untuk melihat data segmen pembangunan, melakukan digitasi peta spasial, dan mencatat riwayat progres realisasi fisik.
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <Button
                        onClick={() => navigate('/admin/monitoring/peta-infrastruktur')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 rounded-xl shadow-md transition-all"
                    >
                        <MapPin className="w-4 h-4" />
                        <span>Editor Peta GIS</span>
                    </Button>
                </div>
            </div>

            {/* Infrastructure Type Cards Grid */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            Daftar Tipe Infrastruktur Terdaftar
                        </h2>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                        {isLoading ? 'Memuat...' : `${tipes.length} Tipe Infrastruktur Ready`}
                    </span>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-48 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
                        ))}
                    </div>
                ) : tipes.length === 0 ? (
                    <Card className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border-dashed">
                        <Layers className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Belum Ada Tipe Infrastruktur</h3>
                        <p className="text-xs text-slate-500 mt-1">Pastikan registry tipe infrastruktur di backend telah di-seed.</p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tipes.map((tipe) => {
                            const IconComponent = ICON_MAP[tipe.ikon] || Layers;

                            return (
                                <Card
                                    key={tipe.kode}
                                    onClick={() => navigate(`/admin/monitoring/${tipe.kode}`)}
                                    className="group relative bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/80 dark:hover:border-emerald-500/80 rounded-2xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer overflow-hidden flex flex-col justify-between"
                                >
                                    {/* Top Color Accent Line */}
                                    <div 
                                        className="h-1.5 w-full transition-all group-hover:h-2"
                                        style={{ backgroundColor: tipe.warna }}
                                    />

                                    <CardHeader className="p-6 pb-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div
                                                className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-110"
                                                style={{ backgroundColor: tipe.warna }}
                                            >
                                                <IconComponent className="w-6 h-6" />
                                            </div>

                                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                                {tipe.geom_type}
                                            </Badge>
                                        </div>

                                        <CardTitle className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-4 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                            {tipe.nama}
                                        </CardTitle>

                                        <CardDescription className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                                            {tipe.deskripsi || `Monitoring dan digitasi spasial untuk aset ${tipe.nama}.`}
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="p-6 pt-0 mt-auto">
                                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                <span>{tipe.has_segmen ? 'Segmen Physical Ready' : 'Master Only'}</span>
                                            </div>

                                            <div className="flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                                                <span>Buka Monitoring</span>
                                                <ArrowRight className="w-4 h-4 ml-1" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* System Info Banner */}
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>RESTful V1 Multi-Infrastruktur API terintegrasi penuh dengan PostGIS & GeoJSON Spatial Engine.</span>
                </div>
                <Link to="/admin/dashboard" className="font-semibold hover:underline text-slate-700 dark:text-slate-300 shrink-0">
                    Kembali ke Dashboard Utama →
                </Link>
            </div>
        </div>
    );
}
