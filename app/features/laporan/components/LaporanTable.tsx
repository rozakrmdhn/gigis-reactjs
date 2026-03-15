import type { ColumnDef } from "@tanstack/react-table";
import { type RekapDibangun } from "../types/laporan.types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { DataTable } from "~/components/ui/data-table";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { Skeleton } from "~/components/ui/skeleton";

interface LaporanTableProps {
    rekapData: RekapDibangun[];
    search: string;
    setSearch: (value: string) => void;
    isLoading?: boolean;
}

export function LaporanTable({ rekapData, search, setSearch, isLoading }: LaporanTableProps) {
    const formatNumber = (num: number) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const columns: ColumnDef<RekapDibangun>[] = [
        {
            accessorKey: "nama_kecamatan",
            header: "Kecamatan",
        },
        {
            accessorKey: "nama_desa",
            header: "Desa",
        },
        {
            accessorKey: "total_panjang_aset",
            header: () => <div className="text-right">Panjang Jalan Desa (m)</div>,
            cell: ({ row }) => <div className="text-right font-mono">{formatNumber(row.getValue("total_panjang_aset"))}</div>,
        },
        {
            accessorKey: "total_panjang_dibangun",
            header: () => <div className="text-right text-slate-800 dark:text-slate-200">Panjang Dibangun (m)</div>,
            cell: ({ row }) => <div className="text-right font-mono text-green-600 dark:text-emerald-400 font-medium">{formatNumber(row.getValue("total_panjang_dibangun"))}</div>,
        },
        {
            accessorKey: "total_panjang_puk",
            header: () => <div className="text-right text-slate-800 dark:text-slate-200">Peningkatan Status (m)</div>,
            cell: ({ row }) => <div className="text-right font-mono text-green-600 dark:text-teal-400 font-medium">{formatNumber(row.getValue("total_panjang_puk"))}</div>,
        },
        {
            accessorKey: "selisih",
            header: () => <div className="text-right text-slate-800 dark:text-slate-200">Selisih (m)</div>,
            cell: ({ row }) => <div className="text-right font-mono text-orange-600 dark:text-orange-400 font-medium">{formatNumber(row.getValue("selisih"))}</div>,
        },
        {
            accessorKey: "status_pembangunan",
            header: "Status",
            cell: ({ row }) => {
                const status = row.getValue("status_pembangunan") as string;
                const isTuntas = status.toLowerCase() === "tuntas";
                return (
                    <Badge variant={isTuntas ? "default" : "secondary"} className={cn(
                        "font-medium",
                        isTuntas ? "bg-green-100 text-green-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-green-100/80 border-green-200 dark:border-emerald-800/50" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 hover:bg-orange-100/80 border-orange-200 dark:border-orange-800/50"
                    )}>
                        {status}
                    </Badge>
                );
            },
        },
    ];

    return (
        <div className="grid lg:grid-cols-1 gap-4">
            <Card className="gap-0 overflow-hidden border dark:border-slate-800 bg-white dark:bg-slate-950">
                <CardHeader>
                    <CardTitle>Data Rekap Jalan Per Desa</CardTitle>
                    <CardDescription>
                        Menampilkan perbandingan panjang aset dan panjang yang sudah dibangun.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="rounded-md">
                        {isLoading ? (
                            <div className="p-4 space-y-4">
                                <Skeleton className="h-10 w-full" />
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton key={i} className="h-12 w-full" />
                                ))}
                            </div>
                        ) : (
                            <DataTable
                                columns={columns}
                                data={rekapData}
                                getRowId={(row: RekapDibangun) => row.id_desa.toString()}
                                searchKey="nama_desa"
                                searchPlaceholder="Cari nama desa..."
                                searchValue={search}
                                onSearchChange={setSearch}
                                defaultPageSize={50}
                                pageSizeOptions={[10, 20, 30, 40, 50, 9999]}
                            />
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
