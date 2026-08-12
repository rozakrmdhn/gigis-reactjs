import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router";
import { PublicNavbar } from "~/components/public-navbar";
import { monitoringService } from "~/features/monitoring/services/monitoring.service";
import type { Jalan, MonitoringJalanResult } from "~/features/monitoring/services/monitoring.service";
import {
    ArrowLeft,
    MapPin,
    Ruler,
    HardHat,
    Activity,
    Layers,
    Navigation,
    Calendar,
    Route,
    Hash,
    Database,
    ChevronRight,
    ExternalLink,
    GitBranch,
    AlertCircle,
    CheckCircle2,
    PieChart,
    BarChart3
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import type { MetaFunction } from "react-router";
import { cn } from "~/lib/utils";
import { SegmenMiniMap } from "~/features/peta/components/SegmenMiniMap";

export const meta: MetaFunction = () => {
    return [
        { title: "Detail Ruas Jalan - MELAROSA" },
        { name: "description", content: "Detail informasi teknis ruas jalan poros desa." },
    ];
};

/* ─── Condition helpers ─────────────────────────────────────────── */
type ConditionKey = "baik" | "sedang" | "rusak ringan" | "rusak berat";

const CONDITION_CONFIG: Record<
    ConditionKey,
    { label: string; text: string; bg: string; border: string; bar: string; badge: string }
> = {
    baik: {
        label: "Baik",
        text: "text-emerald-700",
        bg: "bg-emerald-50 dark:bg-emerald-950/30",
        border: "border-emerald-200 dark:border-emerald-900/50",
        bar: "bg-emerald-500",
        badge: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
    },
    sedang: {
        label: "Sedang",
        text: "text-amber-700",
        bg: "bg-amber-50 dark:bg-amber-950/30",
        border: "border-amber-200 dark:border-amber-900/50",
        bar: "bg-amber-500",
        badge: "bg-amber-500/10 text-amber-700 border-amber-200",
    },
    "rusak ringan": {
        label: "Rusak Ringan",
        text: "text-orange-700",
        bg: "bg-orange-50 dark:bg-orange-950/30",
        border: "border-orange-200 dark:border-orange-900/50",
        bar: "bg-orange-500",
        badge: "bg-orange-500/10 text-orange-700 border-orange-200",
    },
    "rusak berat": {
        label: "Rusak Berat",
        text: "text-red-700",
        bg: "bg-red-50 dark:bg-red-950/30",
        border: "border-red-200 dark:border-red-900/50",
        bar: "bg-red-500",
        badge: "bg-red-500/10 text-red-700 border-red-200",
    },
};

function getConditionCfg(condition: string) {
    const key = Object.keys(CONDITION_CONFIG).find((k) =>
        condition.toLowerCase().includes(k)
    ) as ConditionKey | undefined;
    return (
        key
            ? CONDITION_CONFIG[key]
            : {
                label: condition,
                text: "text-slate-700",
                bg: "bg-slate-50 dark:bg-slate-800",
                border: "border-slate-200 dark:border-slate-700",
                bar: "bg-slate-400",
                badge: "bg-slate-100 text-slate-700 border-slate-200",
            }
    );
}

/* ─── Sub-components ────────────────────────────────────────────── */
function StatCard({
    icon: Icon,
    label,
    value,
    unit,
    accent = false,
}: {
    icon: React.ElementType;
    label: string;
    value: string | number | null | undefined;
    unit?: string;
    accent?: boolean;
}) {
    return (
        <div
            className={cn(
                "flex flex-col gap-3 p-5 rounded-2xl border transition-all group",
                accent
                    ? "bg-blue-600 border-blue-500 shadow-lg shadow-blue-200/50 dark:shadow-none"
                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-slate-700 hover:shadow-md"
            )}
        >
            <div
                className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center",
                    accent ? "bg-white/15" : "bg-slate-50 dark:bg-slate-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 transition-colors"
                )}
            >
                <Icon size={18} className={accent ? "text-white" : "text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"} />
            </div>
            <div>
                <p className={cn("text-[9px] font-black uppercase tracking-[0.2em] mb-1", accent ? "text-blue-200" : "text-slate-400")}>{label}</p>
                <p className={cn("text-lg font-black leading-none", accent ? "text-white" : "text-slate-900 dark:text-white")}>
                    {value ?? "—"}
                    {unit && (
                        <span className={cn("text-xs font-bold ml-1.5", accent ? "text-blue-200" : "text-slate-400")}>
                            {unit}
                        </span>
                    )}
                </p>
            </div>
        </div>
    );
}

function AttrRow({
    label,
    value,
    mono = false,
}: {
    label: string;
    value: string | number | null | undefined;
    mono?: boolean;
}) {
    return (
        <div className="flex items-center justify-between py-3.5 border-b border-slate-50 dark:border-slate-800 last:border-0 gap-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">{label}</span>
            <span className={cn("text-sm font-bold text-slate-900 dark:text-white text-right", mono && "font-mono text-xs")}>
                {value ?? "—"}
            </span>
        </div>
    );
}

/* ─── Page ───────────────────────────────────────────────────────── */
/* ─── Segment card ──────────────────────────────────────────────── */
const SEGMEN_CONDITION_COLOR: Record<string, string> = {
    baik: '#22c55e',
    sedang: '#f59e0b',
    'rusak ringan': '#f97316',
    'rusak berat': '#ef4444',
};

function getSegmenColor(kondisi: string = '') {
    const key = Object.keys(SEGMEN_CONDITION_COLOR).find(k => kondisi.toLowerCase().includes(k));
    return key ? SEGMEN_CONDITION_COLOR[key] : '#64748b';
}

function SegmentCard({ feature, index }: { feature: any; index: number }) {
    const p = feature?.properties ?? {};
    const color = getSegmenColor(p.kondisi || p.condition || '');
    const panjang = p.panjang ? Math.round(p.panjang).toLocaleString('id-ID') : null;
    const kondisi = p.kondisi || p.condition || null;
    // Gunakan geometry dari GeoJSON feature (diambil dari field geom segmen)
    const geometry = feature?.geometry ?? null;

    return (
        <div className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden hover:border-blue-200 dark:hover:border-slate-700 hover:shadow-md transition-all duration-200">
            {/* Mini map */}
            <div className="relative h-24 bg-slate-50 dark:bg-slate-800/50 overflow-hidden">
                <div className="absolute inset-0 p-2">
                    <SegmenMiniMap feature={geometry} strokeColor={color} />
                </div>
                {/* Segment index badge */}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/50 text-white text-[9px] font-black uppercase tracking-widest">
                    Seg {index + 1}
                </div>
                {/* Color accent strip */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: color }} />
            </div>

            {/* Info */}
            <div className="p-3 space-y-2">
                {p.nama_ruas && (
                    <p className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase truncate leading-none">
                        {p.nama_ruas}
                    </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                    {kondisi && (
                        <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border"
                            style={{ color, borderColor: `${color}40`, backgroundColor: `${color}12` }}
                        >
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            {kondisi}
                        </span>
                    )}
                    {panjang && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500">
                            <Ruler size={9} />{panjang} m
                        </span>
                    )}
                </div>
                {(p.lebar || p.jenis_perkerasan || p.perkerasan) && (
                    <div className="flex items-center gap-3 pt-0.5">
                        {p.lebar && (
                            <span className="text-[9px] font-semibold text-slate-400">
                                Lebar: <span className="text-slate-700 dark:text-slate-200 font-bold">{p.lebar} m</span>
                            </span>
                        )}
                        {(p.jenis_perkerasan || p.perkerasan) && (
                            <span className="text-[9px] font-semibold text-slate-400 truncate">
                                Perkerasan: <span className="text-slate-700 dark:text-slate-200 font-bold">{p.jenis_perkerasan ?? p.perkerasan}</span>
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function JalanDesaDetailPage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const backSearch = location.state?.from || "";
    const lastId = location.state?.lastId;

    // Construct return URL with highlight if available
    const backUrl = lastId
        ? `/jalan-desa${backSearch}${backSearch.includes('?') ? '&' : '?'}highlight=${lastId}`
        : `/jalan-desa${backSearch}`;
    const [jalan, setJalan] = useState<Jalan | null>(null);
    const [summary, setSummary] = useState<MonitoringJalanResult['summary'] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [segmenGeoJSON, setSegmenGeoJSON] = useState<any | null>(null);
    const [isLoadingSegmen, setIsLoadingSegmen] = useState(false);
    const [segmenError, setSegmenError] = useState(false);

    // Related roads in the same village
    const [relatedRoads, setRelatedRoads] = useState<MonitoringJalanResult[]>([]);
    const [isLoadingRelated, setIsLoadingRelated] = useState(false);

    const fetchDetail = useCallback(async () => {
        if (!slug) return;
        setIsLoading(true);
        setIsLoadingSegmen(true);
        try {
            // Fetch dari /monitoring/jalan/:id — mengembalikan { jalan, segmen: Segmen[], summary }
            const data = await monitoringService.getMonitoringJalanDetail(slug);
            if (data) {
                setJalan(data.jalan);
                setSummary(data.summary);

                // Fetch GeoJSON segments separately for geometry if needed
                try {
                    const geojsonRes = await monitoringService.getSegmenGeoJSONByKodeRuas(slug);
                    if (geojsonRes && geojsonRes.type === 'FeatureCollection' && geojsonRes.features?.length > 0) {
                        setSegmenGeoJSON(geojsonRes);
                        setIsLoadingSegmen(false);
                        return;
                    }
                } catch (err) {
                    console.warn("Failed to fetch segments GeoJSON:", err);
                }

                // Fallback: Konversi segmen[] ke GeoJSON FeatureCollection menggunakan field geom
                const segmenArray: any[] = Array.isArray(data.segmen) 
                    ? data.segmen 
                    : [...(data.segmen?.desa || []), ...(data.segmen?.kabupaten || [])];
                const features = segmenArray
                    .filter((s) => s.geom && typeof s.geom === 'object' && Object.keys(s.geom).length > 0)
                    .map((s) => ({
                        type: 'Feature' as const,
                        id: s.id,
                        geometry: s.geom,
                        properties: s,
                    }));

                if (features.length > 0) {
                    setSegmenGeoJSON({ type: 'FeatureCollection', features });
                } else {
                    setSegmenGeoJSON(null);
                    setSegmenError(true);
                }
            }
        } catch (error) {
            console.error("Error fetching road detail:", error);
        } finally {
            setIsLoading(false);
            setIsLoadingSegmen(false);
        }
    }, [slug]);

    // Segmen dimuat bersamaan dengan detail via monitoring endpoint
    const fetchSegmen = useCallback(async () => {
        // no-op: segmen sudah dimuat di fetchDetail
    }, []);

    useEffect(() => {
        fetchDetail();
        fetchSegmen();
    }, [fetchDetail, fetchSegmen]);

    // Fetch related roads when id_desa is available
    useEffect(() => {
        if (jalan?.id_desa) {
            const fetchRelated = async () => {
                setIsLoadingRelated(true);
                try {
                    const res = await monitoringService.getMonitoringJalan({
                        id_desa: jalan.id_desa,
                        limit: 10
                    });
                    // Filter out current road
                    setRelatedRoads((res.result || []).filter(r => r.jalan.id !== jalan.id));
                } catch (e) {
                    console.warn("Failed to fetch related roads", e);
                } finally {
                    setIsLoadingRelated(false);
                }
            };
            fetchRelated();
        }
    }, [jalan?.id_desa, jalan?.id]);

    /* ── Not found state ─────────────────────────────────────── */
    if (!isLoading && !jalan) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col pt-16">
                <PublicNavbar />
                <div className="flex-1 flex items-center justify-center p-8 text-center">
                    <div className="space-y-5">
                        <div className="w-20 h-20 mx-auto rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Route size={36} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                Data Tidak Ditemukan
                            </h2>
                            <p className="text-slate-500 font-medium">Ruas jalan yang diminta tidak tersedia.</p>
                        </div>
                        <Button
                            onClick={() => navigate(backUrl)}
                            className="rounded-2xl px-8 font-black uppercase tracking-widest text-[10px] bg-blue-600 hover:bg-blue-700 h-12"
                        >
                            Kembali ke Daftar
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const roadCondition = summary?.kondisi_jalan?.nama || jalan?.kondisi;
    const cfg = roadCondition ? getConditionCfg(roadCondition) : null;

    // Calculate average width and pavement types from segments
    let displayLebar = jalan?.lebar?.toString();
    let displayPerkerasan = jalan?.perkerasan || "-";

    if (segmenGeoJSON?.features?.length) {
        const widths = segmenGeoJSON.features
            .map((f: any) => parseFloat(f.properties?.lebar))
            .filter((w: number) => !isNaN(w) && w > 0);
        
        if (widths.length > 0) {
            const avgWidth = widths.reduce((sum: number, w: number) => sum + w, 0) / widths.length;
            displayLebar = (Math.round(avgWidth * 10) / 10).toString();
        }

        const perkerasans = segmenGeoJSON.features
            .map((f: any) => f.properties?.jenis_perkerasan || f.properties?.perkerasan)
            .filter((p: any) => p && typeof p === 'string' && p.trim() !== '');
        
        if (perkerasans.length > 0) {
            // Use Set to get unique values, capitalize words, and join
            const uniquePerkerasans = [...new Set<string>(perkerasans)];
            displayPerkerasan = uniquePerkerasans.join(', ');
        }
    }


    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-16">
            <PublicNavbar />

            <main>
                {/* ─── Hero Header ─────────────────────────────── */}
                <div className={cn(
                    "relative border-b transition-colors duration-500",
                    cfg
                        ? cn(cfg.bg, cfg.border)
                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
                )}>
                    {/* Decorative circle */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/40 dark:bg-white/5 blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-black/3 dark:bg-white/3 blur-2xl pointer-events-none" />
                    </div>

                </div>

                {/* ─── Sticky Back Navigation ─────────────────────────── */}
                <div className="sticky top-16 z-40 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 py-2 shadow-sm">
                    <div className="container mx-auto px-4 sm:px-6">
                        <Link
                            to={backUrl}
                            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-white/60 dark:bg-slate-900/60 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm"
                        >
                            <ArrowLeft size={12} /> Daftar Ruas Jalan
                        </Link>
                    </div>
                </div>

                <div className="relative container mx-auto px-4 sm:px-6 py-8">


                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="space-y-3 flex-1">
                                {/* Condition badge */}
                                {isLoading ? (
                                    <Skeleton className="h-6 w-28 rounded-full" />
                                ) : cfg && (
                                    <span className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border", cfg.badge)}>
                                        <span className={cn("w-2 h-2 rounded-full", cfg.bar)} />
                                        Kondisi: {cfg.label}
                                    </span>
                                )}

                                {/* Road name */}
                                {isLoading ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-10 w-80 rounded-xl" />
                                        <Skeleton className="h-5 w-48 rounded-lg" />
                                    </div>
                                ) : (
                                    <div>
                                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white leading-tight">
                                            {jalan?.nama_ruas}
                                        </h1>
                                        <div className="flex items-center gap-2 mt-3 text-slate-600 dark:text-slate-300">
                                            <MapPin size={14} className="text-blue-500 shrink-0" />
                                            <span className="text-sm font-bold">
                                                {jalan?.desa}, Kec. {jalan?.kecamatan}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Kode ruas pill */}
                            {!isLoading && jalan && (
                                <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border border-white/80 dark:border-slate-700/60 rounded-2xl px-5 py-4 shrink-0 shadow-sm">
                                    <Hash size={16} className="text-slate-400" />
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kode Ruas</p>
                                        <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{jalan.kode_ruas}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>


                {/* ─── Body Content ─────────────────────────────── */}
                <div className="container mx-auto px-4 sm:px-6 py-8 md:py-10">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

                        {/* ── Left / Main (2/3) ─────────────────── */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Key stats */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {isLoading ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-3 animate-pulse">
                                            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800" />
                                            <div className="space-y-1.5">
                                                <div className="h-2 w-12 bg-slate-100 dark:bg-slate-800 rounded" />
                                                <div className="h-5 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <>
                                        <StatCard
                                            icon={Ruler}
                                            label="Panjang Ruas"
                                            value={Math.round(summary?.total_panjang_jalan || jalan?.panjang || 0).toLocaleString("id-ID")}
                                            unit="meter"
                                            accent
                                        />
                                        <StatCard icon={Layers} label="Lebar Ruas" value={displayLebar} unit="meter" />
                                        <StatCard icon={HardHat} label="Perkerasan" value={displayPerkerasan} />
                                        <StatCard icon={Activity} label="Status Awal" value={jalan?.status_awal} />
                                    </>
                                )}
                            </div>

                            {/* Advanced Summary Widgets */}
                            {!isLoading && summary && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Condition Analysis Widget */}
                                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm overflow-hidden relative group">
                                        <div className="absolute -right-8 -top-8 w-24 h-24 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-2xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/20 transition-colors" />

                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600 dark:text-blue-400">
                                                    <PieChart size={18} />
                                                </div>
                                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">Analisis Kondisi</h3>
                                            </div>
                                            <div className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                                                {summary.kondisi_jalan.mantap}
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="flex items-end justify-between">
                                                <div>
                                                    <p className="text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">
                                                        {summary.kondisi_jalan.persentase_mantap}%
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Tingkat Kemantapan Jalan</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="h-2.5 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden flex">
                                                    <div style={{ width: `${summary.kondisi_jalan.persentase_per_kondisi.baik}%` }} className="h-full bg-emerald-500" />
                                                    <div style={{ width: `${summary.kondisi_jalan.persentase_per_kondisi.sedang}%` }} className="h-full bg-amber-500" />
                                                    <div style={{ width: `${summary.kondisi_jalan.persentase_per_kondisi["rusak ringan"]}%` }} className="h-full bg-orange-500" />
                                                    <div style={{ width: `${summary.kondisi_jalan.persentase_per_kondisi["rusak berat"]}%` }} className="h-full bg-red-500" />
                                                </div>

                                                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                                                    {[
                                                        { label: 'Baik', val: summary.kondisi_jalan.persentase_per_kondisi.baik, color: 'bg-emerald-500' },
                                                        { label: 'Sedang', val: summary.kondisi_jalan.persentase_per_kondisi.sedang, color: 'bg-amber-500' },
                                                        { label: 'Rusak Ringan', val: summary.kondisi_jalan.persentase_per_kondisi["rusak ringan"], color: 'bg-orange-500' },
                                                        { label: 'Rusak Berat', val: summary.kondisi_jalan.persentase_per_kondisi["rusak berat"], color: 'bg-red-500' }
                                                    ].map(c => (
                                                        <div key={c.label} className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className={cn("w-1.5 h-1.5 rounded-full", c.color)} />
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{c.label}</span>
                                                            </div>
                                                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{c.val}%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <AlertCircle size={14} className="text-orange-500" />
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sisa Belum Mantap</span>
                                                    </div>
                                                    <span className="text-xs font-black text-orange-600">{(summary.kondisi_jalan.panjang_belum_mantap ?? 0).toLocaleString('id-ID')} m</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Physical Progress Widget */}
                                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm overflow-hidden relative group">
                                        <div className="absolute -right-8 -top-8 w-24 h-24 bg-emerald-50 dark:bg-emerald-900/10 rounded-full blur-2xl group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/20 transition-colors" />

                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400">
                                                    <BarChart3 size={18} />
                                                </div>
                                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">Kemajuan Fisik</h3>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="flex items-end justify-between">
                                                <div>
                                                    <p className="text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">
                                                        {Math.round((summary.fisik.total / summary.total_panjang_jalan) * 100)}%
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Tertangani Total</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">{Math.round(summary.fisik.total ?? 0).toLocaleString('id-ID')} m</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Sudah Ditangani</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="space-y-3">
                                                    <div className="space-y-1.5">
                                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                            <span>Pemerintah Desa</span>
                                                            <span className="text-slate-700 dark:text-slate-200">{Math.round(summary.fisik.desa ?? 0).toLocaleString('id-ID')} m</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                                                            <div style={{ width: `${(summary.fisik.desa / summary.total_panjang_jalan) * 100}%` }} className="h-full bg-blue-500" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                            <span>Pemerintah Kabupaten</span>
                                                            <span className="text-slate-700 dark:text-slate-200">{Math.round(summary.fisik.kabupaten ?? 0).toLocaleString('id-ID')} m</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                                                            <div style={{ width: `${(summary.fisik.kabupaten / summary.total_panjang_jalan) * 100}%` }} className="h-full bg-emerald-500" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <AlertCircle size={14} className="text-orange-500" />
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sisa Belum Ditangani</span>
                                                    </div>
                                                    <span className="text-xs font-black text-orange-600">{Math.round(summary.panjang_belum_tertangani ?? 0).toLocaleString('id-ID')} m</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Segments section */}
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 md:p-8 shadow-sm">
                                <div className="flex items-center justify-between gap-3 mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                            <GitBranch size={16} className="text-slate-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">Segmen Jalan</h2>
                                            {segmenGeoJSON?.features && (
                                                <p className="text-[10px] font-bold text-slate-400">{segmenGeoJSON.features.length} segmen ditemukan</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {isLoadingSegmen ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {Array.from({ length: 3 }).map((_, i) => (
                                            <div key={i} className="rounded-2xl overflow-hidden animate-pulse">
                                                <div className="h-24 bg-slate-100 dark:bg-slate-800" />
                                                <div className="p-3 space-y-1.5">
                                                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
                                                    <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : segmenError || !segmenGeoJSON?.features?.length ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
                                            <AlertCircle size={20} className="text-slate-300 dark:text-slate-600" />
                                        </div>
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                            {segmenError ? 'Gagal memuat data segmen' : 'Tidak ada segmen ditemukan'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {segmenGeoJSON.features.map((feat: any, i: number) => (
                                            <SegmentCard key={feat.id ?? i} feature={feat} index={i} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Attribute table */}
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 md:p-8 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                        <Database size={16} className="text-slate-400" />
                                    </div>
                                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">Data Atribut Lengkap</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
                                    <div>
                                        <AttrRow label="Nama Ruas" value={jalan?.nama_ruas} />
                                        <AttrRow label="Kode Ruas" value={jalan?.kode_ruas} />
                                        <AttrRow label="Desa" value={jalan?.desa} />
                                        <AttrRow label="Kecamatan" value={jalan?.kecamatan} />
                                    </div>
                                    <div>
                                        <AttrRow label="Status Awal" value={jalan?.status_awal} />
                                        <AttrRow label="Sumber Data" value={jalan?.sumber_data} />
                                        <AttrRow label="ID Desa" value={jalan?.id_desa ?? jalan?.id?.split("-")[0]} />
                                        <AttrRow label="Kondisi Jalan" value={roadCondition} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Right / Sidebar (1/3) ─────────────── */}
                        <div className="space-y-5">

                            {/* Status card */}
                            <div className="relative bg-slate-900 dark:bg-slate-950 border border-slate-800 rounded-3xl p-6 overflow-hidden text-white shadow-2xl">
                                {/* Glow decoration */}
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

                                <div className="relative space-y-4">
                                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10">
                                        <div className="p-2 bg-blue-500/20 rounded-xl">
                                            <Calendar size={16} className="text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Update Terakhir</p>
                                            <p className="text-xs font-bold">
                                                {isLoading
                                                    ? "—"
                                                    : jalan?.updated_at
                                                        ? new Date(jalan.updated_at).toLocaleDateString("id-ID", {
                                                            day: "numeric",
                                                            month: "long",
                                                            year: "numeric",
                                                        })
                                                        : "—"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10">
                                        <div className="p-2 bg-emerald-500/20 rounded-xl">
                                            <Navigation size={16} className="text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Wilayah Kecamatan</p>
                                            <p className="text-xs font-bold uppercase">{isLoading ? "—" : jalan?.kecamatan}</p>
                                        </div>
                                    </div>

                                    {cfg && (
                                        <div className={cn("flex items-center gap-3 p-3.5 rounded-2xl border", cfg.bg, cfg.border)}>
                                            <div className={cn("w-2 h-10 rounded-full shrink-0", cfg.bar)} />
                                            <div className="flex-1">
                                                <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Kondisi Jalan</p>
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className={cn("text-sm font-black uppercase", cfg.text)}>{cfg.label}</p>
                                                    {summary && (
                                                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20 border border-current opacity-70">
                                                            {summary.kondisi_jalan.mantap}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* CTA buttons */}
                            <Button
                                className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none gap-2 transition-all group"
                                onClick={() => navigate("/map-view")}
                            >
                                <MapPin size={16} />
                                Lihat di Peta
                                <ChevronRight size={14} className="ml-auto group-hover:translate-x-0.5 transition-transform" />
                            </Button>

                            <Button
                                variant="outline"
                                className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] border-slate-200 dark:border-slate-700 gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
                                onClick={() => navigate("/statistik")}
                            >
                                <ExternalLink size={14} />
                                Lihat Statistik Keseluruhan
                            </Button>

                            {/* Related Roads Card */}
                            {(isLoadingRelated || relatedRoads.length > 0) && (
                                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                            <Route size={16} className="text-slate-400" />
                                        </div>
                                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">Ruas Lainnya di Desa Ini</h3>
                                    </div>

                                    <div className="space-y-3">
                                        {isLoadingRelated ? (
                                            Array.from({ length: 3 }).map((_, i) => (
                                                <div key={i} className="flex gap-3 animate-pulse">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800" />
                                                    <div className="flex-1 space-y-2">
                                                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                                                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            relatedRoads.map((related) => {
                                                const relatedCfg = getConditionCfg(related.jalan.kondisi);
                                                return (
                                                    <Link
                                                        key={related.jalan.id}
                                                        to={`/jalan-desa/${related.jalan.id}`}
                                                        state={{ from: backSearch }}
                                                        className="group flex items-start gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
                                                    >
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                                                            relatedCfg.bg.replace('/20', '/10')
                                                        )}>
                                                            <div className={cn("w-2 h-2 rounded-full", relatedCfg.bar)} />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                                                {related.jalan.nama_ruas}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ruas {related.jalan.kode_ruas}</span>
                                                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                                                <span className={cn("text-[9px] font-black uppercase tracking-widest", relatedCfg.text)}>
                                                                    {relatedCfg.label}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <ChevronRight size={14} className="mt-2 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                                                    </Link>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <footer className="mt-16 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 py-10">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-slate-400 text-sm font-medium">© 2026 MELAROSA Monitoring Infrastruktur. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
