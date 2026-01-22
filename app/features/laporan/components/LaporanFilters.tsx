import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { RotateCw } from "lucide-react";
import { type Kecamatan } from "~/services/kecamatan";

interface LaporanFiltersProps {
    filters: {
        tahun_pembangunan?: string;
        check_melarosa?: string;
        kecamatan?: string;
    };
    kecamatanList: Kecamatan[];
    onFilterChange: (key: string, value: string) => void;
    onRefresh: () => void;
    isLoading: boolean;
}

export function LaporanFilters({
    filters,
    kecamatanList,
    onFilterChange,
    onRefresh,
    isLoading
}: LaporanFiltersProps) {
    return (
        <div className="flex items-center gap-2">
            <Select
                value={filters.tahun_pembangunan || "all"}
                onValueChange={(value) => onFilterChange("tahun_pembangunan", value)}
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
                onValueChange={(value) => onFilterChange("check_melarosa", value)}
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
                onValueChange={(value) => onFilterChange("kecamatan", value)}
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
                onClick={onRefresh}
                disabled={isLoading}
            >
                <RotateCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
        </div>
    );
}
