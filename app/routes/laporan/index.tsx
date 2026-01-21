import { useState, useEffect } from "react";
import { useLoaderData, useRevalidator, useSearchParams, useNavigation, type LoaderFunctionArgs } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { RotateCw, Search } from "lucide-react";
import { laporanService, type RekapDibangun } from "~/services/laporan";
import { kecamatanService, type Kecamatan } from "~/services/kecamatan";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { DataTable } from "~/components/ui/data-table";

export async function loader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const kecamatan = url.searchParams.get("kecamatan") || undefined;
    const desa = url.searchParams.get("desa") || undefined;
    const tahun_pembangunan = url.searchParams.get("tahun_pembangunan") || undefined;
    const check_melarosa = url.searchParams.get("check_melarosa") || "ya";

    const [rekapData, kecamatanList] = await Promise.all([
        laporanService.getRekapJalanByDibangun({ kecamatan, desa, tahun_pembangunan, check_melarosa }),
        kecamatanService.getKecamatan()
    ]);

    return { rekapData, kecamatanList, filters: { kecamatan, desa, tahun_pembangunan, check_melarosa } };
}


export default function LaporanPage() {
    const { rekapData, kecamatanList, filters } = useLoaderData<typeof loader>();
    const revalidator = useRevalidator();
    const navigation = useNavigation();
    const [searchParams, setSearchParams] = useSearchParams();

    const [search, setSearch] = useState(filters.desa || "");

    const isLoading = revalidator.state === "loading";

    useEffect(() => {
        const timer = setTimeout(() => {
            const newParams = new URLSearchParams(searchParams);
            if (search) {
                newParams.set("desa", search);
            } else {
                newParams.delete("desa");
            }
            if (newParams.toString() !== searchParams.toString()) {
                setSearchParams(newParams);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [search, searchParams, setSearchParams]);

    const totalAset = rekapData.reduce((acc, item) => acc + item.total_panjang_aset, 0);
    const totalDibangun = rekapData.reduce((acc, item) => acc + item.total_panjang_dibangun, 0);
    const totalPuk = rekapData.reduce((acc, item) => acc + item.total_panjang_puk, 0);
    const totalSelisih = rekapData.reduce((acc, item) => acc + item.selisih, 0);

    const formatNumber = (num: number) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 relative">
            {isLoading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-[1px] rounded-lg">
                    <Spinner className="size-8 text-primary" />
                </div>
            )}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Laporan Rekapitulasi</h1>
                    <p className="text-muted-foreground">Ringkasan data pembangunan jalan desa.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select
                        value={filters.tahun_pembangunan || "all"}
                        onValueChange={(value) => {
                            const newParams = new URLSearchParams(searchParams);
                            if (value === "all") {
                                newParams.delete("tahun_pembangunan");
                            } else {
                                newParams.set("tahun_pembangunan", value);
                            }
                            setSearchParams(newParams);
                        }}
                    >
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Pilih Tahun" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Tahun</SelectItem>
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i - 1).map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        value={filters.check_melarosa || "ya"}
                        onValueChange={(value) => {
                            const newParams = new URLSearchParams(searchParams);
                            newParams.set("check_melarosa", value);
                            setSearchParams(newParams);
                        }}
                    >
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Melarosa" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ya">Ya</SelectItem>
                            <SelectItem value="tidak">Tidak</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select
                        value={filters.kecamatan || "all"}
                        onValueChange={(value) => {
                            const newParams = new URLSearchParams(searchParams);
                            if (value === "all") {
                                newParams.delete("kecamatan");
                            } else {
                                newParams.set("kecamatan", value);
                            }
                            setSearchParams(newParams);
                        }}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Pilih Kecamatan" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Kecamatan</SelectItem>
                            {kecamatanList.map((k: Kecamatan) => (
                                <SelectItem key={k.id} value={k.nama_kecamatan}>
                                    {k.nama_kecamatan}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => revalidator.revalidate()}
                        disabled={revalidator.state === "loading"}
                    >
                        <RotateCw className={`h-4 w-4 ${revalidator.state === "loading" ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </div>

            <ReportContent rekapData={rekapData} search={search} setSearch={setSearch} />
        </div>
    );
}

function ReportContent({ rekapData, search, setSearch }: { rekapData: RekapDibangun[], search: string, setSearch: (v: string) => void }) {
    const totalAset = rekapData.reduce((acc: number, item: RekapDibangun) => acc + item.total_panjang_aset, 0);
    const totalDibangun = rekapData.reduce((acc: number, item: RekapDibangun) => acc + item.total_panjang_dibangun, 0);
    const totalPuk = rekapData.reduce((acc: number, item: RekapDibangun) => acc + item.total_panjang_puk, 0);
    const totalSelisih = rekapData.reduce((acc: number, item: RekapDibangun) => acc + item.selisih, 0);

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
        <>
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
                <Card className="
                    gap-1 relative overflow-hidden
                    bg-gradient-to-br from-slate-50 via-white to-slate-100/60
                    transition-all hover:-translate-y-0.5 hover:shadow-md
                    ">
                    <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-transparent via-slate-400/60 to-transparent" />

                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Desa</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4">
                        <div className="text-1xl font-bold">{rekapData.length}</div>
                        <p className="text-xs text-muted-foreground">Jumlah desa yang terdata</p>
                    </CardContent>
                </Card>
                <Card className="
                    gap-1 relative overflow-hidden
                    bg-gradient-to-br from-sky-50 via-white to-blue-100/40
                    transition-all hover:-translate-y-0.5 hover:shadow-md
                    ">
                    <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-transparent via-blue-400/60 to-transparent" />

                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Panjang Jalan Desa</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4">
                        <div className="text-1xl font-bold">{formatNumber(totalAset)} m</div>
                        <p className="text-xs text-muted-foreground">Total panjang Jalan Desa</p>
                    </CardContent>
                </Card>
                <Card className="
                    gap-1 relative overflow-hidden
                    bg-gradient-to-br from-emerald-50 via-white to-green-100/50
                    transition-all hover:-translate-y-0.5 hover:shadow-md
                    ">
                    <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-transparent via-green-400/60 to-transparent" />

                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Jalan Desa Dibangun</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4">
                        <div className="text-1xl font-bold text-green-600">{formatNumber(totalDibangun)} m</div>
                        <p className="text-xs text-muted-foreground">Panjang Jalan Desa dibangun</p>
                    </CardContent>
                </Card>
                <Card className="
                    gap-1 relative overflow-hidden
                    bg-gradient-to-br from-teal-50 via-white to-emerald-100/40
                    transition-all hover:-translate-y-0.5 hover:shadow-md
                    ">
                    <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-transparent via-emerald-400/60 to-transparent" />

                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Peningkatan Status</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4">
                        <div className="text-1xl font-bold text-green-600">{formatNumber(totalPuk)} m</div>
                        <p className="text-xs text-muted-foreground">Total peningkatan status</p>
                    </CardContent>
                </Card>
                <Card className="
                    gap-1 relative overflow-hidden
                    bg-gradient-to-br from-orange-50 via-white to-amber-100/50
                    transition-all hover:-translate-y-0.5 hover:shadow-md
                    ">
                    <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-transparent via-amber-400/60 to-transparent" />

                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Selisih</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4">
                        <div className="text-1xl font-bold text-orange-600">{formatNumber(totalSelisih)} m</div>
                        <p className="text-xs text-muted-foreground">Sisa yang belum dibangun</p>
                    </CardContent>
                </Card>
            </div>
            <div className="grid lg:grid-cols-1 gap-4">
                <Card className="gap-0">
                    <CardHeader>
                        <CardTitle>Data Rekap Jalan Per Desa</CardTitle>
                        <CardDescription>
                            Menampilkan perbandingan panjang aset dan panjang yang sudah dibangun.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="rounded-md">
                            <DataTable
                                columns={columns}
                                data={rekapData}
                                getRowId={(row: RekapDibangun) => row.id_desa.toString()}
                                searchKey="nama_desa"
                                searchPlaceholder="Cari nama desa..."
                                searchValue={search}
                                onSearchChange={setSearch}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
