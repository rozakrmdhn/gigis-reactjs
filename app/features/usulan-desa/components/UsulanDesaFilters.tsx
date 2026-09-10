import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { RotateCw, X, SlidersHorizontal } from "lucide-react";
import type { UsulanDesaFilters as IFilters } from "../types/usulan-desa.types";
import { useEffect, useState, useMemo } from "react";
import { cn } from "~/lib/utils";
import { usulanKategoriService } from "../services/usulan-kategori.service";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

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

    return (
        <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0">
            {/* Popover Filter Component */}
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "h-9 gap-2 font-bold rounded-xl border-border cursor-pointer transition-all",
                            activeFilterCount > 0 && "border-indigo-600 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300"
                        )}
                    >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Filter</span>
                        {activeFilterCount > 0 && (
                            <Badge variant="secondary" className="px-1.5 py-0 h-4 bg-indigo-600 text-white font-mono text-[10px] rounded-full">
                                {activeFilterCount}
                            </Badge>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 sm:w-96 p-4 rounded-2xl shadow-xl space-y-4 bg-background border-border max-h-[85vh] overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between border-b pb-2 border-border">
                        <h4 className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                            Filter Parameter Usulan
                        </h4>
                        {activeFilterCount > 0 && (
                            <button
                                onClick={handleReset}
                                className="text-[11px] text-rose-500 hover:text-rose-600 font-semibold cursor-pointer"
                            >
                                Reset Filter
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-3.5 text-xs">
                        {/* Status */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase">
                                Status Usulan
                            </label>
                            <Select
                                value={filters.status || "all"}
                                onValueChange={(v) => onFilterChange("status", v)}
                            >
                                <SelectTrigger className="h-9 w-full bg-background border-border text-xs rounded-xl">
                                    <SelectValue placeholder="Pilih status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Status</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="verifikasi_bappeda">Verifikasi Bappeda</SelectItem>
                                    <SelectItem value="verifikasi_opd">Verifikasi OPD</SelectItem>
                                    <SelectItem value="disetujui">Disetujui</SelectItem>
                                    <SelectItem value="selesai">Selesai</SelectItem>
                                    <SelectItem value="ditolak">Ditolak</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Tahun Anggaran */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase">
                                Tahun Anggaran
                            </label>
                            <Select
                                value={String(filters.tahun_anggaran || "all")}
                                onValueChange={(v) => onFilterChange("tahun_anggaran", v)}
                            >
                                <SelectTrigger className="h-9 w-full bg-background border-border text-xs rounded-xl">
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
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase">
                                Jenis Usulan
                            </label>
                            <Select
                                value={filters.jenis_usulan || "all"}
                                onValueChange={(v) => onFilterChange("jenis_usulan", v)}
                            >
                                <SelectTrigger className="h-9 w-full bg-background border-border text-xs rounded-xl">
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
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase">
                                Nomor Surat
                            </label>
                            <Input
                                type="text"
                                placeholder="Cari nomor surat..."
                                value={nomorSurat}
                                onChange={(e) => setNomorSurat(e.target.value)}
                                className="h-9 w-full bg-background border-border text-xs rounded-xl"
                            />
                        </div>

                        {/* Nama Kecamatan */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase">
                                Nama Kecamatan
                            </label>
                            <Input
                                type="text"
                                placeholder="Cari kecamatan..."
                                value={namaKecamatan}
                                onChange={(e) => setNamaKecamatan(e.target.value)}
                                className="h-9 w-full bg-background border-border text-xs rounded-xl"
                            />
                        </div>

                        {/* Rentang Tanggal Surat */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase">
                                    Dari Tanggal
                                </label>
                                <Input
                                    type="date"
                                    value={filters.tanggal_surat_from || ""}
                                    onChange={(e) => onFilterChange("tanggal_surat_from", e.target.value)}
                                    className="h-9 w-full text-xs bg-background border-border rounded-xl"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase">
                                    Sampai Tanggal
                                </label>
                                <Input
                                    type="date"
                                    value={filters.tanggal_surat_to || ""}
                                    onChange={(e) => onFilterChange("tanggal_surat_to", e.target.value)}
                                    className="h-9 w-full text-xs bg-background border-border rounded-xl"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-border flex gap-2">
                        <Button
                            onClick={() => {
                                onRefresh();
                                setIsOpen(false);
                            }}
                            size="sm"
                            className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer"
                        >
                            Terapkan Filter
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>

            {/* Reset Button (only shown when filters are active) */}
            {onReset && activeFilterCount > 0 && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                >
                    <X className="h-3.5 w-3.5 shrink-0" />
                    <span>Reset</span>
                </Button>
            )}

            {/* Refresh Button */}
            <Button
                variant="outline"
                size="icon"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-9 w-9 rounded-xl border-border cursor-pointer shrink-0"
                title="Perbarui Data"
            >
                <RotateCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
        </div>
    );
}

