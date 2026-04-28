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
                    loading ? "text-blue-500 animate-pulse" : "text-slate-400 group-focus-within:text-blue-500"
                )} />
                <Input
                    type="text"
                    placeholder="Cari alamat atau lokasi..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length > 2 && setIsOpen(true)}
                    className="pl-10 pr-4 h-10 bg-white/90 dark:bg-slate-900/90 rounded-xl border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                />
                {query && (
                    <button
                        onClick={clearSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    </button>
                )}
            </div>

            {/* Results Dropdown */}
            {isOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-1">
                        {results.map((result, index) => (
                            <button
                                key={index}
                                onClick={() => handleSelect(result)}
                                className="w-full flex items-start gap-3 p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors text-left group"
                            >
                                <div className="mt-0.5 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-blue-600 transition-colors shrink-0">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 line-clamp-1 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                                        {result.display_name.split(',')[0]}
                                    </p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-2 mt-0.5 font-medium leading-relaxed">
                                        {result.display_name}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {isOpen && results.length === 0 && query.length > 2 && !loading && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center z-50 shadow-xl">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Lokasi tidak ditemukan</p>
                </div>
            )}
        </div>
    );
}
