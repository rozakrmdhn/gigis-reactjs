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
import { kecamatanService, type Kecamatan } from '~/services/kecamatan';

interface KecamatanDropdownProps {
    selectedKecamatanName: string | undefined;
    onSelectKecamatan: (kecamatan: Kecamatan | null) => void;
    className?: string;
}

export function KecamatanDropdown({ selectedKecamatanName, onSelectKecamatan, className }: KecamatanDropdownProps) {

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
                <Button variant="secondary" className={cn("shadow-md w-full justify-start text-xs font-bold h-9 px-3 text-slate-700 dark:text-slate-200", className)}>
                    <MapPin className="mr-2 h-3.5 w-3.5 shrink-0 text-blue-600" />
                    <span className="truncate">
                        {selectedKecamatanName ? `Kec. ${selectedKecamatanName}` : 'Pilih Kecamatan'}
                    </span>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-64 p-0 rounded-2xl overflow-hidden border-slate-100 dark:border-slate-800 shadow-2xl" align="start">
                <div className="p-3 pb-2 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Cari kecamatan..."
                            className="pl-9 h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus-visible:ring-blue-500/20"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
                <DropdownMenuSeparator className="opacity-50" />
                <ScrollArea className="h-72">
                    <div className="p-1">
                        {!search && (
                            <>
                                <DropdownMenuItem
                                    className="flex items-center py-2.5 px-3 cursor-pointer rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 group transition-colors"
                                    onClick={() => onSelectKecamatan(null)}
                                >
                                    <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-3 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                                        <MapPin className="h-3 w-3 text-slate-400 group-hover:text-blue-600" />
                                    </div>
                                    <span className="font-bold text-xs text-slate-500 group-hover:text-blue-600 uppercase tracking-widest">Semua Kecamatan</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="mx-2 my-1 opacity-50" />
                            </>
                        )}
                        
                        {loading ? (
                            <div className="p-8 text-center flex flex-col items-center gap-2">
                                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memuat...</span>
                            </div>
                        ) : filteredKecamatan.length === 0 ? (
                            <div className="p-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Tidak ada hasil</div>
                        ) : (
                            filteredKecamatan.map((kec) => (
                                <DropdownMenuItem
                                    key={kec.id}
                                    className="flex items-center py-2.5 px-3 cursor-pointer rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 group transition-colors"
                                    onClick={() => onSelectKecamatan(kec)}
                                >
                                    <div className="w-6 h-6 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mr-3 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                                        <span className="text-[10px] font-black text-slate-400 group-hover:text-blue-600">{kec.nama_kecamatan.charAt(0)}</span>
                                    </div>
                                    <span className="font-bold text-xs text-slate-700 dark:text-slate-200 group-hover:text-blue-600 uppercase tracking-tight">{kec.nama_kecamatan}</span>
                                </DropdownMenuItem>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
