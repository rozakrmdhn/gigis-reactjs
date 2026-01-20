import { useState, useEffect } from 'react';
import { MapPin, Search } from 'lucide-react';
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
import { kecamatanService, type Kecamatan } from '~/services/kecamatan';

interface KecamatanDropdownProps {
    selectedKecamatanName: string | undefined;
    onSelectKecamatan: (kecamatan: Kecamatan) => void;
}

export function KecamatanDropdown({ selectedKecamatanName, onSelectKecamatan }: KecamatanDropdownProps) {
    const [kecamatanData, setKecamatanData] = useState<Kecamatan[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Fetch Kecamatan List
    useEffect(() => {
        const fetchKecamatan = async () => {
            setLoading(true);
            const data = await kecamatanService.getKecamatan();
            setKecamatanData(data);
            setLoading(false);
        };
        fetchKecamatan();
    }, []);

    const filteredKecamatan = kecamatanData.filter((item) =>
        item.nama_kecamatan.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <DropdownMenu onOpenChange={(open) => { if (!open) setSearch(""); }}>
            <DropdownMenuTrigger asChild>
                <Button variant="secondary" className="shadow-md">
                    <MapPin className="mr-2 h-4 w-4" />
                    {selectedKecamatanName ? `Kec. ${selectedKecamatanName}` : 'Pilih Kecamatan'}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-0" align="start">
                <div className="p-3 pb-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari kecamatan..."
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
                        {loading ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">Memuat data...</div>
                        ) : filteredKecamatan.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">Tidak ada hasil</div>
                        ) : (
                            filteredKecamatan.map((kec) => (
                                <DropdownMenuItem
                                    key={kec.id}
                                    className="flex items-center py-2 px-3 cursor-pointer"
                                    onClick={() => onSelectKecamatan(kec)}
                                >
                                    <span className="font-medium text-sm">{kec.nama_kecamatan}</span>
                                </DropdownMenuItem>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
