import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { PublicNavbar } from "~/components/public-navbar";
import { jalanDropdownService } from "~/features/peta/services/jalan-dropdown.service";
import { type Jalan } from "~/features/peta/types";
import { 
    ArrowLeft, 
    MapPin, 
    Ruler, 
    Info, 
    Calendar, 
    HardHat, 
    Activity,
    Layers,
    Navigation,
    TrendingUp,
    ChevronRight,
    Loader2
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import type { MetaFunction } from "react-router";
import { cn } from "~/lib/utils";

export const meta: MetaFunction = () => {
    return [
        { title: "Detail Ruas Jalan - GIGIS Monitoring" },
    ];
};

export default function JalanDesaDetailPage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [jalan, setJalan] = useState<Jalan | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchDetail = useCallback(async () => {
        if (!slug) return;
        setIsLoading(true);
        try {
            const data = await jalanDropdownService.getJalanById(slug);
            setJalan(data);
        } catch (error) {
            console.error("Error fetching road detail:", error);
        } finally {
            setIsLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    const getConditionBadge = (condition: string) => {
        if (!condition) return null;
        const c = condition.toLowerCase();
        if (c.includes('baik')) return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 px-3 py-1 text-[10px] font-bold uppercase tracking-tight">Baik</Badge>;
        if (c.includes('sedang')) return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 px-3 py-1 text-[10px] font-bold uppercase tracking-tight">Sedang</Badge>;
        if (c.includes('rusak ringan')) return <Badge className="bg-orange-500/10 text-orange-600 border-orange-200 px-3 py-1 text-[10px] font-bold uppercase tracking-tight">Rusak Ringan</Badge>;
        if (c.includes('rusak berat')) return <Badge className="bg-red-500/10 text-red-600 border-red-200 px-3 py-1 text-[10px] font-bold uppercase tracking-tight">Rusak Berat</Badge>;
        return <Badge variant="outline" className="px-3 py-1 text-[10px] font-bold uppercase tracking-tight">{condition}</Badge>;
    };

    if (!isLoading && !jalan) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
                <PublicNavbar />
                <div className="container mx-auto px-4 py-20 text-center">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-tight italic">Data tidak ditemukan</h2>
                    <Button onClick={() => navigate("/jalan-desa")} className="mt-6 rounded-2xl px-8 font-black uppercase tracking-widest text-[10px]">
                        Kembali ke Daftar
                    </Button>
                </div>
            </div>
        );
    }

    const TechnicalSpec = ({ icon: Icon, label, value, sub }: { icon: any, label: string, value: string | number | null, sub?: string }) => (
        <div className="flex items-start gap-4 p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all group hover:border-blue-200 dark:hover:border-slate-700">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:text-blue-600 transition-colors">
                <Icon size={20} />
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white uppercase leading-none">
                    {value || '-'} {sub && <span className="text-[10px] text-slate-400 font-bold lowercase ml-1">{sub}</span>}
                </span>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <PublicNavbar />
            
            <main className="container mx-auto px-4 py-8">
                <div className="flex flex-col gap-8">
                    {/* Header Section - Consistent with /jalan-desa */}
                    <div className="flex flex-col gap-4">
                        <Link 
                            to="/jalan-desa" 
                            className="inline-flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-blue-600 tracking-widest transition-all uppercase"
                        >
                            <ArrowLeft size={14} /> KEMBALI KE DAFTAR
                        </Link>
                        
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="space-y-1">
                                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Detail Ruas Jalan</h1>
                                <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">Informasi teknis dan historis pemeliharaan ruas jalan.</p>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                {isLoading ? (
                                    <Skeleton className="h-10 w-24 rounded-xl" />
                                ) : (
                                    getConditionBadge(jalan?.kondisi || '')
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content Area */}
                        <div className="lg:col-span-2 flex flex-col gap-8">
                            {/* Road Identity Card */}
                            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-2">
                                        {isLoading ? (
                                            <Skeleton className="h-10 w-80 rounded-lg" />
                                        ) : (
                                            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                                                {jalan?.nama_ruas}
                                            </h2>
                                        )}
                                        <div className="flex items-center gap-3 text-slate-500 font-bold text-xs uppercase tracking-wider">
                                            <MapPin size={14} className="text-blue-500" />
                                            {jalan?.desa}, {jalan?.kecamatan}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <TechnicalSpec icon={Ruler} label="Panjang Ruas" value={Math.round(jalan?.panjang || 0)} sub="meters" />
                                        <TechnicalSpec icon={Layers} label="Lebar Ruas" value={jalan?.lebar} sub="meters" />
                                        <TechnicalSpec icon={HardHat} label="Perkerasan" value={jalan?.perkerasan} />
                                        <TechnicalSpec icon={Activity} label="Status Eksisting" value={jalan?.status_eksisting} />
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Attributes Table */}
                            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                                    <Info size={16} /> DATA ATRIBUT LENGKAP
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                    <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800">
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">KODE RUAS</span>
                                        <span className="font-extrabold text-slate-900 dark:text-white">{jalan?.kode_ruas}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800">
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">STATUS AWAL</span>
                                        <span className="font-extrabold text-slate-900 dark:text-white uppercase">{jalan?.status_awal || '-'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800">
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">SUMBER DATA</span>
                                        <span className="font-extrabold text-slate-900 dark:text-white uppercase">{jalan?.sumber_data || '-'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800">
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">ID DESA</span>
                                        <span className="font-extrabold text-slate-900 dark:text-white uppercase">{jalan?.id_desa || jalan?.id.split('-')[0]}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Info Area */}
                        <div className="flex flex-col gap-6">
                            <div className="bg-slate-900 p-8 rounded-[2rem] text-white space-y-6 shadow-2xl relative overflow-hidden group">
                                <TrendingUp size={48} className="absolute -right-4 -bottom-4 text-white/5 group-hover:scale-110 transition-transform duration-500" />
                                <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none">Status Terkini</h3>
                                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                                    Ruas jalan ini masuk dalam kategori pemeliharaan berdasarkan data survei terakhir. Pemerintah desa secara aktif memantau progres fisik lapangan.
                                </p>
                                <div className="space-y-4 pt-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/10 rounded-xl">
                                            <Calendar size={16} className="text-blue-400" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Update Terakhir</span>
                                            <span className="text-xs font-bold">{jalan?.updated_at ? new Date(jalan.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/10 rounded-xl">
                                            <Navigation size={16} className="text-emerald-400" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Wilayah Pantau</span>
                                            <span className="text-xs font-bold uppercase">{jalan?.kecamatan}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Button 
                                variant="outline" 
                                className="w-full h-14 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] gap-2 border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:bg-blue-600 hover:text-white hover:border-blue-600 group"
                                onClick={() => navigate("/statistik")}
                            >
                                LIHAT STATISTIK KESELURUHAN <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="mt-20 border-t bg-white dark:bg-slate-900 py-12">
                <div className="container mx-auto px-4 text-center text-slate-500">
                    <p>© 2026 GIGIS Monitoring Jalan Poros. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
