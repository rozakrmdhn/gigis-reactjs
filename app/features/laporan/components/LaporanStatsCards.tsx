import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { type RekapDibangun } from "../types/laporan.types";

interface LaporanStatsCardsProps {
    rekapData: RekapDibangun[];
    isLoading?: boolean;
}

export function LaporanStatsCards({ rekapData, isLoading }: LaporanStatsCardsProps) {
    if (isLoading) {
        return (
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i} className="gap-1 relative overflow-hidden bg-white">
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

    const totalAset = rekapData.reduce((acc, item) => acc + item.total_panjang_aset, 0);
    const totalDibangun = rekapData.reduce((acc, item) => acc + item.total_panjang_dibangun, 0);
    const totalPuk = rekapData.reduce((acc, item) => acc + item.total_panjang_puk, 0);
    const totalSelisih = rekapData.reduce((acc, item) => acc + item.selisih, 0);

    const formatNumber = (num: number) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const stats = [
        {
            title: "Total Desa",
            value: rekapData.length,
            description: "Jumlah desa yang terdata",
            gradient: "from-slate-50 via-white to-slate-100/60",
            border: "via-slate-400/60",
            textColor: ""
        },
        {
            title: "Panjang Jalan Desa",
            value: `${formatNumber(totalAset)} m`,
            description: "Total panjang Jalan Desa",
            gradient: "from-sky-50 via-white to-blue-100/40",
            border: "via-blue-400/60",
            textColor: ""
        },
        {
            title: "Jalan Desa Dibangun",
            value: `${formatNumber(totalDibangun)} m`,
            description: "Panjang Jalan Desa dibangun",
            gradient: "from-emerald-50 via-white to-green-100/50",
            border: "via-green-400/60",
            textColor: "text-green-600"
        },
        {
            title: "Peningkatan Status",
            value: `${formatNumber(totalPuk)} m`,
            description: "Total peningkatan status",
            gradient: "from-teal-50 via-white to-emerald-100/40",
            border: "via-emerald-400/60",
            textColor: "text-green-600"
        },
        {
            title: "Total Selisih",
            value: `${formatNumber(totalSelisih)} m`,
            description: "Sisa yang belum dibangun",
            gradient: "from-orange-50 via-white to-amber-100/50",
            border: "via-amber-400/60",
            textColor: "text-orange-600"
        }
    ];

    return (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
            {stats.map((stat, index) => (
                <Card
                    key={index}
                    className={`gap-1 relative overflow-hidden bg-gradient-to-br ${stat.gradient} transition-all hover:-translate-y-0.5 hover:shadow-md`}
                >
                    <span className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-transparent ${stat.border} to-transparent`} />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4">
                        <div className={`text-1xl font-bold ${stat.textColor}`}>{stat.value}</div>
                        <p className="text-xs text-muted-foreground">{stat.description}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
