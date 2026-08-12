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
    onSearchSubmit?: (value: string) => void;
    isLoading?: boolean;
}

export function LaporanTable({ rekapData, search, setSearch, onSearchSubmit, isLoading }: LaporanTableProps) {
    const formatNumber = (num: number) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const columns: ColumnDef<RekapDibangun>[] = [
        {
            accessorKey: "nama_kecamatan",
            header: "Kecamatan",
            cell: ({ row }) => <div className="font-medium text-slate-900 dark:text-slate-100">{row.getValue("nama_kecamatan")}</div>,
        },
        {
            accessorKey: "nama_desa",
            header: "Desa",
            cell: ({ row }) => <div className="font-medium text-slate-700 dark:text-slate-300">{row.getValue("nama_desa")}</div>,
        },
        {
            accessorKey: "total_panjang_aset",
            header: () => <div className="text-right font-semibold">Pemetaan (m)</div>,
            cell: ({ row }) => <div className="text-right font-mono text-slate-600 dark:text-slate-400">{formatNumber(row.getValue("total_panjang_aset"))}</div>,
        },
        {
            accessorKey: "sisa_intervensi",
            header: () => <div className="text-right font-semibold text-indigo-700 dark:text-indigo-400">Jalan Desa Sekarang (m)</div>,
            cell: ({ row }) => <div className="text-right font-mono text-indigo-600 dark:text-indigo-400 font-medium">{formatNumber(row.original.sisa_intervensi)}</div>,
        },
        {
            accessorKey: "total_panjang_dibangun",
            header: () => <div className="text-right font-semibold text-emerald-700 dark:text-emerald-400">Dibangun (m)</div>,
            cell: ({ row }) => <div className="text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">{formatNumber(row.getValue("total_panjang_dibangun"))}</div>,
        },
        {
            accessorKey: "total_panjang_puk",
            header: () => <div className="text-right font-semibold text-teal-700 dark:text-teal-400">Peningkatan Status (m)</div>,
            cell: ({ row }) => <div className="text-right font-mono text-teal-600 dark:text-teal-400 font-medium">{formatNumber(row.getValue("total_panjang_puk"))}</div>,
        },
        {
            accessorKey: "selisih",
            header: () => <div className="text-right font-semibold text-orange-700 dark:text-orange-400">Belum Dibangun (m)</div>,
            cell: ({ row }) => <div className="text-right font-mono text-orange-600 dark:text-orange-400 font-bold">{formatNumber(row.getValue("selisih"))}</div>,
        },
        // {
        //     accessorKey: "status_pembangunan",
        //     header: "Status",
        //     cell: ({ row }) => {
        //         const status = row.getValue("status_pembangunan") as string;
        //         const isTuntas = status.toLowerCase() === "tuntas";
        //         return (
        //             <Badge variant={isTuntas ? "default" : "secondary"} className={cn(
        //                 "font-semibold px-2.5 py-0.5 rounded-full transition-all duration-300",
        //                 isTuntas
        //                     ? "bg-green-100 text-green-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-green-200 dark:border-emerald-800/50 hover:scale-105"
        //                     : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 border-orange-200 dark:border-orange-800/50 hover:scale-105"
        //             )}>
        //                 {status}
        //             </Badge>
        //         );
        //     },
        // },
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
                                onSearchSubmit={onSearchSubmit}
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
