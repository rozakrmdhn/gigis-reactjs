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
    onSelectDesa: (desa: Desa | null) => void;
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
                <Button variant="secondary" className={cn("shadow-md w-full justify-start text-xs font-bold h-9 px-3 text-slate-700 dark:text-slate-200", className)} disabled={!idKecamatan}>
                    <MapPin className="mr-2 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span className="truncate">
                        {selectedDesaName ? `Desa ${selectedDesaName}` : 'Pilih Desa'}
                    </span>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-64 p-0 rounded-2xl overflow-hidden border-slate-100 dark:border-slate-800 shadow-2xl" align="start">
                <div className="p-3 pb-2 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Cari desa..."
                            className="pl-9 h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus-visible:ring-emerald-500/20"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
                <DropdownMenuSeparator className="opacity-50" />
                <ScrollArea className="h-72">
                    <div className="p-1">
                        {!idKecamatan ? (
                            <div className="p-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Pilih kecamatan terlebih dahulu</div>
                        ) : (
                            <>
                                {!search && (
                                    <>
                                        <DropdownMenuItem
                                            className="flex items-center py-2.5 px-3 cursor-pointer rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 group transition-colors"
                                            onClick={() => onSelectDesa(null)}
                                        >
                                            <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-3 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 transition-colors">
                                                <MapPin className="h-3 w-3 text-slate-400 group-hover:text-emerald-600" />
                                            </div>
                                            <span className="font-bold text-xs text-slate-500 group-hover:text-emerald-600 uppercase tracking-widest">Semua Desa</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="mx-2 my-1 opacity-50" />
                                    </>
                                )}

                                {loading ? (
                                    <div className="p-8 text-center flex flex-col items-center gap-2">
                                        <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memuat...</span>
                                    </div>
                                ) : filteredDesa.length === 0 ? (
                                    <div className="p-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Tidak ada hasil</div>
                                ) : (
                                    filteredDesa.map((desa) => (
                                        <DropdownMenuItem
                                            key={desa.id}
                                            className="flex items-center py-2.5 px-3 cursor-pointer rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 group transition-colors"
                                            onClick={() => onSelectDesa(desa)}
                                        >
                                            <div className="w-6 h-6 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mr-3 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 transition-colors">
                                                <span className="text-[10px] font-black text-slate-400 group-hover:text-emerald-600">{desa.nama_desa.charAt(0)}</span>
                                            </div>
                                            <span className="font-bold text-xs text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 uppercase tracking-tight">{desa.nama_desa}</span>
                                        </DropdownMenuItem>
                                    ))
                                )}
                            </>
                        )}
                    </div>
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
