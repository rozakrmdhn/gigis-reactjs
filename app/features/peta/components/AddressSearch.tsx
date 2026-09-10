import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2 } from 'lucide-react';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

interface AddressSearchProps {
    onSelect: (result: { lat: number; lon: number; display_name: string }) => void;
    className?: string;
}

export function AddressSearch({ onSelect, className }: AddressSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length > 2) {
                performSearch(query);
            } else {
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    // Close results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const performSearch = async (searchQuery: string) => {
        setLoading(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
            );
            const data = await response.json();
            setResults(data);
            setIsOpen(true);
        } catch (error) {
            console.error('Nominatim search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (result: any) => {
        onSelect({
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon),
            display_name: result.display_name
        });
        setQuery(result.display_name);
        setIsOpen(false);
    };

    const clearSearch = () => {
        setQuery('');
        setResults([]);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            <div className="relative group">
                <Search className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                    loading ? "text-emerald-400 animate-pulse" : "text-slate-500 group-focus-within:text-emerald-400"
                )} />
                <Input
                    type="text"
                    placeholder="Cari alamat, jalan, atau desa..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length > 2 && setIsOpen(true)}
                    className="pl-9 pr-8 h-10 bg-[#0E131F] text-slate-100 placeholder:text-slate-500 rounded-xl border border-white/[0.08] focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 text-xs font-medium transition-all"
                />
                {query && (
                    <button
                        type="button"
                        onClick={clearSearch}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 hover:bg-white/[0.08] rounded-md text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    </button>
                )}
            </div>

            {/* Results Dropdown */}
            {isOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0B101D]/95 backdrop-blur-xl border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden z-50 divide-y divide-white/[0.04] animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 bg-[#090D16] border-b border-white/[0.06] text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Hasil Pencarian Lokasi ({results.length})
                    </div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                        {results.map((result, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => handleSelect(result)}
                                className="w-full p-2.5 text-left hover:bg-white/[0.06] transition-colors flex items-start gap-2.5 group cursor-pointer"
                            >
                                <MapPin className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-200 line-clamp-1 group-hover:text-emerald-300 transition-colors">
                                        {result.display_name.split(',')[0]}
                                    </p>
                                    <p className="text-[10px] text-slate-500 line-clamp-1">
                                        {result.display_name}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
