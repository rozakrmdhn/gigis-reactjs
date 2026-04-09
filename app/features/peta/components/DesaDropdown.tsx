import { useState, useEffect } from 'react';
import { MapPin, Search } from 'lucide-react';
import { cn } from '~/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { ScrollArea } from '~/components/ui/scroll-area';
import { desaService, type Desa } from '~/services/desa';

interface DesaDropdownProps {
    idKecamatan: string | number | undefined;
    selectedDesaName: string | undefined;
    onSelectDesa: (desa: Desa) => void;
    className?: string;
}

export function DesaDropdown({ idKecamatan, selectedDesaName, onSelectDesa, className }: DesaDropdownProps) {

    const [desaData, setDesaData] = useState<Desa[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    // Fetch Desa List
    useEffect(() => {
        if (!idKecamatan) {
            setDesaData([]);
            return;
        }

        const fetchDesa = async () => {
            setLoading(true);
            try {
                const data = await desaService.getDesa(idKecamatan);
                setDesaData(data);
            } catch (error) {
                console.error("Failed to fetch desa", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDesa();
    }, [idKecamatan]);

    const filteredDesa = desaData.filter((item) =>
        item.nama_desa.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <DropdownMenu onOpenChange={(open) => { if (!open) setSearch(""); }}>
            <DropdownMenuTrigger asChild>
                <Button variant="secondary" className={cn("shadow-md w-full justify-start text-xs font-bold h-9 px-3", className)} disabled={!idKecamatan}>
                    <MapPin className="mr-2 h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                        {selectedDesaName ? `Desa ${selectedDesaName}` : 'Pilih Desa'}
                    </span>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-64 p-0" align="start">
                <div className="p-3 pb-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari desa..."
                            className="pl-9 h-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
                <DropdownMenuSeparator />
                <ScrollArea className="h-72">
                    <div className="p-1">
                        {!idKecamatan ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">Pilih kecamatan terlebih dahulu</div>
                        ) : loading ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">Memuat data...</div>
                        ) : filteredDesa.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">Tidak ada hasil</div>
                        ) : (
                            filteredDesa.map((desa) => (
                                <DropdownMenuItem
                                    key={desa.id}
                                    className="flex items-center py-2 px-3 cursor-pointer"
                                    onClick={() => onSelectDesa(desa)}
                                >
                                    <span className="font-medium text-sm">{desa.nama_desa}</span>
                                </DropdownMenuItem>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
