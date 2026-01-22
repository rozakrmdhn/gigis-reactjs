import type { ColumnDef } from "@tanstack/react-table";
import { type RekapDibangun } from "../types/laporan.types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { DataTable } from "~/components/ui/data-table";
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
            header: () => <div className="text-right">Panjang Dibangun (m)</div>,
            cell: ({ row }) => <div className="text-right font-mono text-green-600 font-medium">{formatNumber(row.getValue("total_panjang_dibangun"))}</div>,
        },
        {
            accessorKey: "total_panjang_puk",
            header: () => <div className="text-right">Peningkatan Status (m)</div>,
            cell: ({ row }) => <div className="text-right font-mono text-green-600 font-medium">{formatNumber(row.getValue("total_panjang_puk"))}</div>,
        },
        {
            accessorKey: "selisih",
            header: () => <div className="text-right">Selisih (m)</div>,
            cell: ({ row }) => <div className="text-right font-mono text-orange-600 font-medium">{formatNumber(row.getValue("selisih"))}</div>,
        },
    ];

    return (
        <div className="grid lg:grid-cols-1 gap-4">
            <Card className="gap-0 overflow-hidden">
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
                            />
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
