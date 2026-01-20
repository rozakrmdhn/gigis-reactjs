import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "~/components/ui/data-table";
import type { Jalan } from "~/services/jalan-desa";
import { Badge } from "~/components/ui/badge";
import { IconRoad, IconMapPin, IconRuler2, IconArrowRight } from "@tabler/icons-react";
import { Button } from "~/components/ui/button";

interface TabTabelProps {
    data: Jalan[];
}

export function TabTabel({ data }: TabTabelProps) {
    const totalPanjang = React.useMemo(() => data.reduce((acc, curr) => acc + curr.panjang, 0), [data]);
    const averageLebar = React.useMemo(() => data.length > 0 ? data.reduce((acc, curr) => acc + curr.lebar, 0) / data.length : 0, [data]);

    const columns = React.useMemo<ColumnDef<Jalan>[]>(
        () => [
            {
                accessorKey: "nama_ruas",
                header: "Nama Ruas",
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <IconRoad className="size-4 text-muted-foreground" />
                        <span className="font-medium">{row.getValue("nama_ruas")}</span>
                    </div>
                ),
            },
            {
                accessorKey: "desa",
                header: "Desa",
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <IconMapPin className="size-4 text-muted-foreground" />
                        <span>{row.getValue("desa")}</span>
                    </div>
                ),
            },
            {
                accessorKey: "kecamatan",
                header: "Kecamatan",
            },
            {
                accessorKey: "panjang",
                header: () => <div className="text-right">Panjang (m)</div>,
                cell: ({ row }) => {
                    const panjang = parseFloat(row.getValue("panjang"));
                    const formatted = new Intl.NumberFormat("id-ID", {
                        maximumFractionDigits: 2,
                    }).format(panjang);
                    return <div className="text-right font-mono">{formatted}</div>;
                },
            },
            {
                accessorKey: "lebar",
                header: () => <div className="text-right">Lebar (m)</div>,
                cell: ({ row }) => {
                    const lebar = parseFloat(row.getValue("lebar"));
                    return <div className="text-right font-mono">{lebar}</div>;
                },
            },
            {
                accessorKey: "kondisi",
                header: "Kondisi",
                cell: ({ row }) => {
                    const kondisi = row.getValue("kondisi") as string;
                    let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

                    if (kondisi.toLowerCase().includes("baik")) variant = "default";
                    else if (kondisi.toLowerCase().includes("rusak berat")) variant = "destructive";
                    else if (kondisi.toLowerCase().includes("sedang")) variant = "secondary";

                    return (
                        <Badge variant={variant} className="capitalize font-normal">
                            {kondisi}
                        </Badge>
                    );
                },
            },
            {
                accessorKey: "perkerasan",
                header: "Perkerasan",
                cell: ({ row }) => (
                    <Badge variant="outline" className="font-normal">
                        {row.getValue("perkerasan")}
                    </Badge>
                ),
            },
            {
                id: "actions",
                cell: ({ row }) => (
                    <Button variant="ghost" size="icon" className="size-8">
                        <IconArrowRight className="size-4" />
                        <span className="sr-only">Detail</span>
                    </Button>
                ),
            }
        ],
        []
    );

    return (
        <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Ruas Jalan</span>
                    <span className="text-2xl font-bold tracking-tight">{data.length}</span>
                </div>
                <div className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Panjang Jalan</span>
                    <span className="text-2xl font-bold tracking-tight">{totalPanjang.toLocaleString('id-ID', { maximumFractionDigits: 2 })} m</span>
                </div>
                <div className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rata-rata Lebar Jalan</span>
                    <span className="text-2xl font-bold tracking-tight">{averageLebar.toLocaleString('id-ID', { maximumFractionDigits: 2 })} m</span>
                </div>
            </div>

            <div className="rounded-xl border bg-card p-0 text-card-foreground shadow-sm">
                <DataTable
                    columns={columns}
                    data={data}
                    searchKey="nama_ruas"
                    searchPlaceholder="Cari nama ruas jalan..."
                    getRowId={(row) => row.id}
                />
            </div>
        </div>
    );
}
