import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Progress } from "~/components/ui/progress";
import { type RekapDibangun } from "../types/laporan.types";
import {
    Home,
    Route,
    Construction,
    ArrowUpCircle,
    AlertCircle,
    ShieldCheck
} from "lucide-react";

interface LaporanStatsCardsProps {
    rekapData: RekapDibangun[];
    isLoading?: boolean;
}

export function LaporanStatsCards({ rekapData, isLoading }: LaporanStatsCardsProps) {
    if (isLoading) {
        return (
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="gap-1 relative overflow-hidden bg-white dark:bg-slate-950">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 px-4 pt-4">
                            <Skeleton className="h-3 w-24" />
                        </CardHeader>
                        <CardContent className="px-4 pb-4 pt-2">
                            <Skeleton className="h-7 w-32 mb-2" />
                            <Skeleton className="h-3 w-40" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    const totalDesa = rekapData.length;
    const totalAset = rekapData.reduce((acc, item) => acc + (item.total_panjang_aset || 0), 0);
    const totalDibangun = rekapData.reduce((acc, item) => acc + (item.total_panjang_dibangun || 0), 0);
    const totalPuk = rekapData.reduce((acc, item) => acc + (item.total_panjang_puk || 0), 0);
    const totalSelisih = rekapData.reduce((acc, item) => acc + (item.selisih || 0), 0);
    const totalSisaIntervensi = rekapData.reduce((acc, item) => acc + (item.sisa_intervensi || 0), 0);

    const percentDibangun = totalAset > 0 ? (totalDibangun / totalAset) * 100 : 0;

    const formatNumber = (num: number) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const stats = [
        {
            title: "Total Desa",
            value: totalDesa,
            description: "Jumlah desa yang terdata",
            icon: Home,
            gradient: "from-blue-500/10 via-blue-500/5 to-transparent",
            borderColor: "border-blue-500/20",
            iconColor: "text-blue-500",
            textColor: "text-blue-700 dark:text-blue-300"
        },
        {
            title: "Panjang Jalan Desa",
            value: `${formatNumber(totalAset)} m`,
            description: "Total panjang Aset Jalan Desa",
            icon: Route,
            gradient: "from-sky-500/10 via-sky-500/5 to-transparent",
            borderColor: "border-sky-500/20",
            iconColor: "text-sky-500",
            textColor: "text-sky-700 dark:text-sky-300"
        },
        {
            title: "Sisa Intervensi",
            value: `${formatNumber(totalSisaIntervensi)} m`,
            description: "Peralihan status ke Jalan Kabupaten",
            icon: ShieldCheck,
            gradient: "from-indigo-500/10 via-indigo-500/5 to-transparent",
            borderColor: "border-indigo-500/20",
            iconColor: "text-indigo-500",
            textColor: "text-indigo-700 dark:text-indigo-300"
        },
        {
            title: "Jalan Desa Dibangun",
            value: `${formatNumber(totalDibangun)} m`,
            description: "Sudah dibangun sesuai aset",
            icon: Construction,
            gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
            borderColor: "border-emerald-500/20",
            iconColor: "text-emerald-500",
            textColor: "text-emerald-700 dark:text-emerald-300",
            showProgress: true,
            progress: percentDibangun
        },
        {
            title: "Peningkatan Status",
            value: `${formatNumber(totalPuk)} m`,
            description: "Total peningkatan (PUK)",
            icon: ArrowUpCircle,
            gradient: "from-teal-500/10 via-teal-500/5 to-transparent",
            borderColor: "border-teal-500/20",
            iconColor: "text-teal-500",
            textColor: "text-teal-700 dark:text-teal-300"
        },
        {
            title: "Total Selisih",
            value: `${formatNumber(totalSelisih)} m`,
            description: "Sisa jalan belum dibangun",
            icon: AlertCircle,
            gradient: "from-orange-500/10 via-orange-500/5 to-transparent",
            borderColor: "border-orange-500/20",
            iconColor: "text-orange-500",
            textColor: "text-orange-700 dark:text-orange-300"
        }
    ];

    return (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat, index) => (
                <Card
                    key={index}
                    className={`group relative gap-2 py-2 overflow-hidden transition-all duration-300 hover:shadow-lg dark:hover:shadow-black/50 border ${stat.borderColor} bg-white dark:bg-slate-900/40 backdrop-blur-sm`}
                >
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-6 pt-4">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stat.title}</CardTitle>
                        <stat.icon className={`h-4 w-4 ${stat.iconColor} opacity-70 group-hover:scale-110 transition-transform duration-300`} />
                    </CardHeader>

                    <CardContent className="px-6 pb-4">
                        <div className={`text-2xl font-bold tracking-tight ${stat.textColor}`}>{stat.value}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 mb-3">{stat.description}</p>

                        {stat.showProgress && (
                            <div className="space-y-1.5 mt-2">
                                <div className="flex items-center justify-between text-[10px] font-medium">
                                    <span className="text-muted-foreground">Progres Pembangunan</span>
                                    <span className={stat.iconColor}>{formatNumber(stat.progress)}%</span>
                                </div>
                                <Progress value={stat.progress} className="h-1.5 bg-slate-100 dark:bg-slate-800" indicatorClassName={stat.gradient.split(' ')[0].replace('/10', '')} />
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
