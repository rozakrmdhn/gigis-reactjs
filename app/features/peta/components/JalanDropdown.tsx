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
import { jalanDropdownService } from '../services/jalan-dropdown.service';
import { type Jalan } from '../types';

interface JalanDropdownProps {
    selectedJalanName: string | undefined;
    onSelectJalan: (id: string) => void;
}

export function JalanDropdown({ selectedJalanName, onSelectJalan }: JalanDropdownProps) {
    const [jalanData, setJalanData] = useState<Jalan[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Handle debouncing
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [search]);

    // Fetch road list based on search
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const data = await jalanDropdownService.getJalan(debouncedSearch);
            setJalanData(data);
            setLoading(false);
        };
        fetchData();
    }, [debouncedSearch]);

    return (
        <div className="absolute top-3 left-3 z-10">
            <DropdownMenu onOpenChange={(open) => { if (!open) setSearch(""); }}>
                <DropdownMenuTrigger asChild>
                    <Button variant="secondary" className="shadow-md">
                        <MapPin className="mr-2 h-4 w-4" />
                        {selectedJalanName || 'Pilih Ruas Jalan'}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80 p-0" align="start">
                    <div className="p-3 pb-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Ketik nama ruas..."
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
                            {loading && search !== debouncedSearch ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">Mencari...</div>
                            ) : loading && jalanData.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">Memuat data...</div>
                            ) : jalanData.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">Tidak ada hasil</div>
                            ) : (
                                jalanData.map((jalan) => (
                                    <DropdownMenuItem
                                        key={jalan.id}
                                        className="flex flex-col items-start py-2 px-3 cursor-pointer"
                                        onClick={() => onSelectJalan(jalan.id)}
                                    >
                                        <div className="flex justify-between w-full items-center">
                                            <span className="font-medium text-sm">{jalan.nama_ruas}</span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            <span className="text-[10px] font-mono pr-1 rounded-sm text-muted-foreground">
                                                {jalan.panjang.toLocaleString()} m
                                            </span>
                                            | {jalan.desa}, Kec. {jalan.kecamatan}
                                        </span>
                                    </DropdownMenuItem>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
