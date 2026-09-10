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
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full justify-start text-xs font-bold h-10 px-3 bg-[#0E131F] hover:bg-[#131B2D] border border-white/[0.08] hover:border-white/[0.15] text-slate-100 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-40",
                        className
                    )}
                    disabled={!idKecamatan}
                >
                    <MapPin className="mr-2 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                    <span className="truncate">
                        {selectedDesaName ? `Desa ${selectedDesaName}` : idKecamatan ? 'Pilih Desa' : 'Pilih Kecamatan Dulu'}
                    </span>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                className="w-64 p-0 rounded-2xl overflow-hidden border border-white/[0.1] bg-[#0B101D]/95 backdrop-blur-xl shadow-2xl z-50 text-slate-100"
                align="start"
            >
                <div className="p-2.5 bg-[#090D16] border-b border-white/[0.06]">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                        <Input
                            placeholder="Cari desa / kelurahan..."
                            className="pl-8 h-8 bg-[#0E131F] border-white/[0.08] text-slate-100 placeholder:text-slate-500 rounded-lg text-xs font-medium focus-visible:ring-1 focus-visible:ring-cyan-500"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>

                <ScrollArea className="h-64">
                    <div className="p-1 space-y-0.5">
                        {!search && (
                            <>
                                <DropdownMenuItem
                                    className="flex items-center py-2 px-2.5 cursor-pointer rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors"
                                    onClick={() => onSelectDesa(null)}
                                >
                                    <div className="w-5 h-5 rounded-lg bg-slate-900 border border-white/[0.06] flex items-center justify-center mr-2.5 text-slate-400">
                                        <MapPin className="h-3 w-3" />
                                    </div>
                                    <span className="font-bold text-xs">Semua Desa</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/[0.06] my-1" />
                            </>
                        )}

                        {loading ? (
                            <div className="p-4 text-center text-xs text-slate-500 font-medium">Memuat desa...</div>
                        ) : filteredDesa.length > 0 ? (
                            filteredDesa.map((desa) => {
                                const isSelected = selectedDesaName?.toLowerCase() === desa.nama_desa.toLowerCase();
                                return (
                                    <DropdownMenuItem
                                        key={desa.id}
                                        className={cn(
                                            "flex items-center py-2 px-2.5 cursor-pointer rounded-xl text-xs transition-colors",
                                            isSelected
                                                ? "bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 font-bold"
                                                : "hover:bg-white/[0.06] text-slate-200"
                                        )}
                                        onClick={() => onSelectDesa(desa)}
                                    >
                                        <MapPin className={cn("mr-2.5 h-3.5 w-3.5 shrink-0", isSelected ? "text-cyan-400" : "text-slate-500")} />
                                        <span className="truncate">{desa.nama_desa}</span>
                                    </DropdownMenuItem>
                                );
                            })
                        ) : (
                            <div className="p-4 text-center text-xs text-slate-500">Tidak ada hasil</div>
                        )}
                    </div>
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
