import { useState, useEffect } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "~/components/ui/data-table";
import { Badge } from "~/components/ui/badge";
import { jalanDropdownService } from "../services/jalan-dropdown.service";
import { type Jalan } from "../types";

export const columns: ColumnDef<Jalan>[] = [
    {
        accessorKey: "kode_ruas",
        header: "Kode Ruas",
        cell: ({ row }) => <div className="font-mono text-xs">{row.getValue("kode_ruas")}</div>,
    },
    {
        accessorKey: "nama_ruas",
        header: "Nama Ruas",
        cell: ({ row }) => <div className="font-semibold">{row.getValue("nama_ruas")}</div>,
    },
    {
        accessorKey: "desa",
        header: "Desa",
    },
    {
        accessorKey: "kecamatan",
        header: "Kecamatan",
    },
    {
        accessorKey: "panjang",
        header: "Panjang (m)",
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("panjang"));
            const formatted = new Intl.NumberFormat("id-ID").format(amount);
            return <div className="text-right font-medium">{formatted} m</div>;
        },
    },
    {
        accessorKey: "lebar",
        header: "Lebar (m)",
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("lebar"));
            return <div className="text-right">{amount} m</div>;
        },
    },
    {
        accessorKey: "perkerasan",
        header: "Perkerasan",
        cell: ({ row }) => (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {row.getValue("perkerasan")}
            </Badge>
        ),
    },
    {
        accessorKey: "kondisi",
        header: "Kondisi",
        cell: ({ row }) => {
            const kondisi = row.getValue("kondisi") as string;
            let variant: "default" | "destructive" | "outline" | "secondary" = "default";

            if (kondisi.toLowerCase().includes("baik")) variant = "default";
            else if (kondisi.toLowerCase().includes("rusak")) variant = "destructive";
            else variant = "secondary";

            return (
                <Badge variant={variant}>
                    {kondisi}
                </Badge>
            );
        },
    },
];

interface TabTabelProps {
    initialData?: Jalan[];
}

export function TabTabel({ initialData }: TabTabelProps) {
    const [data, setData] = useState<Jalan[]>(initialData || []);
    const [loading, setLoading] = useState(!initialData);

    useEffect(() => {
        if (initialData) return;
        async function fetchData() {
            setLoading(true);
            const result = await jalanDropdownService.getJalan();
            setData(result);
            setLoading(false);
        }
        fetchData();
    }, [initialData]);

    return (
        <div className="mt-2 border rounded-md p-4 bg-card">
            <DataTable columns={columns} data={data} />
        </div>
    );
}
