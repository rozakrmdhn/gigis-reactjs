import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { RotateCw, X, SlidersHorizontal, Plus } from "lucide-react";
import type { UsulanDesaFilters as IFilters } from "../types/usulan-desa.types";
import { useEffect, useState, useMemo } from "react";
import { cn } from "~/lib/utils";
import { usulanDesaService } from "../services/usulan-desa.service";
import { usulanKategoriService } from "../services/usulan-kategori.service";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "~/components/ui/sheet";

interface UsulanDesaFiltersProps {
    filters: IFilters;
    onFilterChange: (key: string, value: string) => void;
    onRefresh: () => void;
    onReset?: () => void;
    isLoading: boolean;
    isOpen?: boolean;
    setIsOpen?: (open: boolean) => void;
}

export function UsulanDesaFilters({
    filters,
    onFilterChange,
    onRefresh,
    onReset,
    isLoading,
    isOpen: controlledIsOpen,
    setIsOpen: controlledSetIsOpen,
}: UsulanDesaFiltersProps) {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

    const [localIsOpen, setLocalIsOpen] = useState(false);
    const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : localIsOpen;
    const setIsOpen = controlledSetIsOpen !== undefined ? controlledSetIsOpen : setLocalIsOpen;

    const [isMobile, setIsMobile] = useState(false);
    const [namaKecamatan, setNamaKecamatan] = useState(filters.nama_kecamatan || "");
    const [nomorSurat, setNomorSurat] = useState(filters.nomor_surat || "");
    const [jenisUsulanOptions, setJenisUsulanOptions] = useState<string[]>([]);

    useEffect(() => {
        usulanKategoriService.getAll({ is_active: true })
            .then((res) => {
                const list = res.map(item => item.nama);
                const uniqueList = Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
                setJenisUsulanOptions(uniqueList);
            })
            .catch((err) => console.error("Gagal mengambil kategori untuk filter:", err));
    }, []);
    // Monitor screen width to isolate Sheet to mobile viewports
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);
    // Sync local text state on external reset
    useEffect(() => { setNamaKecamatan(filters.nama_kecamatan || ""); }, [filters.nama_kecamatan]);
    useEffect(() => { setNomorSurat(filters.nomor_surat || ""); }, [filters.nomor_surat]);



    // Debounce nama_kecamatan
    useEffect(() => {
        const t = setTimeout(() => {
            if (namaKecamatan !== (filters.nama_kecamatan || "")) onFilterChange("nama_kecamatan", namaKecamatan);
        }, 500);
        return () => clearTimeout(t);
    }, [namaKecamatan, onFilterChange, filters.nama_kecamatan]);

    // Debounce nomor_surat
    useEffect(() => {
        const t = setTimeout(() => {
            if (nomorSurat !== (filters.nomor_surat || "")) onFilterChange("nomor_surat", nomorSurat);
        }, 500);
        return () => clearTimeout(t);
    }, [nomorSurat, onFilterChange, filters.nomor_surat]);

    const activeFilterCount = useMemo(() => {
        let n = 0;
        if (filters.status && filters.status !== "all") n++;
        if (filters.tahun_anggaran && filters.tahun_anggaran !== "all") n++;
        if (filters.jenis_usulan && filters.jenis_usulan !== "all") n++;
        if (filters.nama_desa) n++;
        if (filters.nama_kecamatan) n++;
        if (filters.nomor_surat) n++;
        if (filters.tanggal_surat_from) n++;
        if (filters.tanggal_surat_to) n++;
        return n;
    }, [filters]);

    const handleReset = () => {
        if (onReset) onReset();
    };

    const filterInputs = () => (
        <div className="grid grid-cols-1 gap-4">
            {/* Status */}
            <div className="flex flex-col gap-1.5 w-full">
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    Status
                </span>
                <Select
                    value={filters.status || "all"}
                    onValueChange={(v) => onFilterChange("status", v)}
                >
                    <SelectTrigger className="h-9 w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                        <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="verifikasi_bappeda">Verifikasi Bappeda</SelectItem>
                        <SelectItem value="verifikasi_opd">Verifikasi OPD</SelectItem>
                        <SelectItem value="selesai">Selesai</SelectItem>
                        <SelectItem value="ditolak">Ditolak</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Tahun Anggaran */}
            <div className="flex flex-col gap-1.5 w-full">
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    Tahun Anggaran
                </span>
                <Select
                    value={String(filters.tahun_anggaran || "all")}
                    onValueChange={(v) => onFilterChange("tahun_anggaran", v)}
                >
                    <SelectTrigger className="h-9 w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                        <SelectValue placeholder="Pilih tahun" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Tahun</SelectItem>
                        {years.map((y) => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Jenis Usulan */}
            <div className="flex flex-col gap-1.5 w-full">
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    Jenis Usulan
                </span>
                <Select
                    value={filters.jenis_usulan || "all"}
                    onValueChange={(v) => onFilterChange("jenis_usulan", v)}
                >
                    <SelectTrigger className="h-9 w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                        <SelectValue placeholder="Pilih jenis" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Jenis</SelectItem>
                        {jenisUsulanOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Nomor Surat */}
            <div className="flex flex-col gap-1.5 w-full">
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    Nomor Surat
                </span>
                <Input
                    type="text"
                    placeholder="Cari nomor surat..."
                    value={nomorSurat}
                    onChange={(e) => setNomorSurat(e.target.value)}
                    className="h-9 w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                />
            </div>

            {/* Nama Kecamatan */}
            <div className="flex flex-col gap-1.5 w-full">
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    Nama Kecamatan
                </span>
                <Input
                    type="text"
                    placeholder="Cari kecamatan..."
                    value={namaKecamatan}
                    onChange={(e) => setNamaKecamatan(e.target.value)}
                    className="h-9 w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                />
            </div>

            {/* Tanggal Dari */}
            <div className="flex flex-col gap-1.5 w-full">
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    Tanggal Dari
                </span>
                <Input
                    type="date"
                    value={filters.tanggal_surat_from || ""}
                    onChange={(e) => onFilterChange("tanggal_surat_from", e.target.value)}
                    className="h-9 w-full text-sm bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                />
            </div>

            {/* Tanggal Sampai */}
            <div className="flex flex-col gap-1.5 w-full">
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    Tanggal Sampai
                </span>
                <Input
                    type="date"
                    value={filters.tanggal_surat_to || ""}
                    onChange={(e) => onFilterChange("tanggal_surat_to", e.target.value)}
                    className="h-9 w-full text-sm bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                />
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-0">
            {/* ── Trigger bar ── */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0">
                {/* Toggle button */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "h-9 gap-2 transition-all duration-200 shrink-0 font-semibold border-slate-200 dark:border-slate-800",
                        isOpen
                            ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900 shadow-xs"
                            : "hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                    )}
                >
                    <SlidersHorizontal className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">Filter</span>
                    {activeFilterCount > 0 && (
                        <Badge
                            variant="default"
                            className="h-5 min-w-5 px-1.5 text-[10px] leading-none shrink-0"
                        >
                            {activeFilterCount}
                        </Badge>
                    )}
                </Button>

                {/* Refresh */}
                <Button
                    variant="outline"
                    size="icon"
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="h-9 w-9 shrink-0"
                    title="Refresh data"
                >
                    <RotateCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                </Button>

                {/* Reset — only shown when there are active filters */}
                {onReset && activeFilterCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
                    >
                        <X className="h-3.5 w-3.5 shrink-0" />
                        <span>Reset</span>
                    </Button>
                )}


            </div>

            {/* ── Desktop Custom Slide Panel ── */}
            <div
                className={cn(
                    "hidden md:flex absolute top-[69px] right-0 bottom-0 z-30 w-[300px] bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-lg flex-col transition-transform duration-300 ease-in-out",
                    isOpen && !isMobile ? "translate-x-0" : "translate-x-full"
                )}
            >
                <div className="flex items-center justify-between h-10 px-4 border-b border-border bg-slate-50 dark:bg-slate-900 shrink-0">
                    <h3 className="text-xs font-extrabold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        Filter Usulan Desa
                    </h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsOpen(false)}
                        className="h-7 w-7 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {filterInputs()}
                </div>

                {activeFilterCount > 0 && (
                    <div className="p-4 border-t border-border bg-slate-50/50 dark:bg-slate-900/50">
                        <Button
                            variant="outline"
                            onClick={() => {
                                handleReset();
                            }}
                            className="w-full gap-2 text-rose-500 hover:text-rose-600 dark:hover:bg-rose-950/20 border-rose-250 dark:border-rose-900/30"
                        >
                            <X className="h-4 w-4" />
                            Hapus Semua Filter
                        </Button>
                    </div>
                )}
            </div>

            {/* ── Mobile Filter Sheet Drawer ── */}
            <Sheet open={isOpen && isMobile} onOpenChange={(open) => { if (isMobile) setIsOpen(open); }}>
                <SheetContent side="right" className="w-[300px] sm:w-[380px] overflow-y-auto custom-scrollbar md:hidden flex flex-col justify-between p-6">
                    <div className="flex-1">
                        <SheetHeader className="pb-4 border-b border-border mb-4 px-0 pt-0">
                            <SheetTitle className="text-sm font-extrabold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                <SlidersHorizontal className="h-4 w-4" />
                                Filter Usulan Desa
                            </SheetTitle>
                        </SheetHeader>
                        {filterInputs()}
                    </div>
                    {activeFilterCount > 0 && (
                        <div className="pt-4 border-t border-border mt-6 shrink-0">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    handleReset();
                                }}
                                className="w-full gap-2 text-rose-500 hover:text-rose-600 dark:hover:bg-rose-950/20 border-rose-250 dark:border-rose-900/30"
                            >
                                <X className="h-4 w-4" />
                                Hapus Semua Filter
                            </Button>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
