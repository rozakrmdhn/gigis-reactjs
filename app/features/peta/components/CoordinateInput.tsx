import { useState } from 'react';
import { Plus, Trash2, MapPin, Navigation, Pencil, Check, X, Loader2, Compass } from 'lucide-react';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

export interface Marker {
    id: string;
    lat: number;
    lon: number;
    title?: string;
}

interface CoordinateInputProps {
    markers: Marker[];
    onAdd: (marker: Marker) => void;
    onRemove: (id: string) => void;
    onUpdate: (marker: Marker) => void;
    onZoomTo: (marker: Marker) => void;
    className?: string;
}

export function CoordinateInput({ markers, onAdd, onRemove, onUpdate, onZoomTo, className }: CoordinateInputProps) {
    const [inputValue, setInputValue] = useState('');
    const [title, setTitle] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [isLocating, setIsLocating] = useState(false);

    const parseCoordinate = (input: string): { lat: number; lon: number } | null => {
        const cleanInput = input.trim();
        if (!cleanInput) return null;

        // Pattern 1: Decimal Degrees (e.g., "-7.15, 111.88" or "-7.15 111.88")
        const decimalRegex = /^([-+]?\d*\.?\d+)[,\s]+([-+]?\d*\.?\d+)$/;
        const decimalMatch = cleanInput.match(decimalRegex);
        if (decimalMatch) {
            return {
                lat: parseFloat(decimalMatch[1]),
                lon: parseFloat(decimalMatch[2])
            };
        }

        // Pattern 2: DMS (e.g., "7°9'0\"S, 111°52'48\"E")
        const dmsPattern = /(\d+)[°\s]+(\d+)['\s]+(\d+(?:\.\d+)?)["]?[\s]*([NSEW])/gi;
        const matches = Array.from(cleanInput.matchAll(dmsPattern));

        if (matches.length === 2) {
            const convert = (m: RegExpMatchArray) => {
                const d = parseFloat(m[1]);
                const min = parseFloat(m[2]);
                const s = parseFloat(m[3]);
                const dir = m[4].toUpperCase();
                let dd = d + (min / 60) + (s / 3600);
                if (dir === 'S' || dir === 'W') dd *= -1;
                return dd;
            };

            const val1 = convert(matches[0]);
            const val2 = convert(matches[1]);
            const dir1 = matches[0][4].toUpperCase();
            const dir2 = matches[1][4].toUpperCase();

            if (['N', 'S'].includes(dir1) && ['E', 'W'].includes(dir2)) {
                return { lat: val1, lon: val2 };
            } else if (['E', 'W'].includes(dir1) && ['N', 'S'].includes(dir2)) {
                return { lat: val2, lon: val1 };
            }
            return { lat: val1, lon: val2 };
        }

        return null;
    };

    const handleAdd = () => {
        const lines = inputValue.split('\n').map(l => l.trim()).filter(l => l !== '');
        if (lines.length === 0) return;

        let addedCount = 0;
        lines.forEach((line, index) => {
            const coords = parseCoordinate(line);
            if (coords) {
                const markerTitle = lines.length > 1 && title 
                    ? `${title} - ${index + 1}` 
                    : (title || `Titik ${markers.length + addedCount + 1}`);
                
                onAdd({
                    id: crypto.randomUUID(),
                    lat: coords.lat,
                    lon: coords.lon,
                    title: markerTitle
                });
                addedCount++;
            }
        });

        if (addedCount === 0) {
            alert('Format koordinat tidak dikenali. Gunakan format Desimal (-7.15, 111.88) atau DMS.');
        } else {
            setInputValue('');
            setTitle('');
        }
    };

    const handleUseMyLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation tidak didukung oleh browser Anda.');
            return;
        }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setIsLocating(false);
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const markerTitle = title || `Lokasi Saya (${markers.length + 1})`;
                onAdd({
                    id: crypto.randomUUID(),
                    lat,
                    lon,
                    title: markerTitle
                });
                setTitle('');
            },
            (error) => {
                setIsLocating(false);
                alert(`Gagal mengambil lokasi GPS: ${error.message}`);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const startEditing = (marker: Marker) => {
        setEditingId(marker.id);
        setEditValue(marker.title || '');
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditValue('');
    };

    const saveEdit = (marker: Marker) => {
        onUpdate({ ...marker, title: editValue });
        setEditingId(null);
        setEditValue('');
    };

    return (
        <div className={cn("space-y-3", className)}>
            {/* Input Form Container */}
            <div className="bg-[#0B101D] p-3.5 rounded-2xl border border-white/[0.08] space-y-3 shadow-sm">
                
                {/* GPS Location Button */}
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleUseMyLocation}
                    disabled={isLocating}
                    className="w-full h-8 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-800/40 rounded-xl font-bold text-[10px] tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                    {isLocating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    ) : (
                        <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    {isLocating ? "Mencari Sinyal GPS..." : "Gunakan Lokasi Saya Saat Ini"}
                </Button>

                {/* Manual Coordinate Textarea */}
                <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Koordinat Manual (Pemisah Enter)
                    </label>
                    <Textarea
                        placeholder="Contoh:&#10;-7.15, 111.88&#10;-7.20, 111.90"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="min-h-[75px] rounded-xl border border-white/[0.08] bg-[#0E131F] text-slate-100 placeholder:text-slate-500 font-mono text-xs resize-none focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
                    />
                    <span className="text-[9px] text-slate-500 italic block">
                        Ketik koordinat dipisahkan dengan Enter.
                    </span>
                </div>

                {/* Optional Title Input */}
                <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Label / Nama Titik (Opsional)
                    </label>
                    <Input
                        type="text"
                        placeholder="Contoh: Jembatan Bubulan..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="h-8 rounded-xl border border-white/[0.08] bg-[#0E131F] text-slate-100 placeholder:text-slate-500 text-xs focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
                    />
                </div>

                {/* Add to Map Submit Button */}
                <Button
                    onClick={handleAdd}
                    disabled={!inputValue.trim()}
                    className="w-full h-9 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 rounded-xl font-bold text-xs tracking-wide cursor-pointer transition-all shadow-lg shadow-emerald-500/20"
                >
                    <Plus size={14} className="mr-1" />
                    Tambah ke Peta
                </Button>
            </div>

            {/* List of Plotted Markers */}
            {markers.length > 0 && (
                <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Titik Tersimpan ({markers.length})
                        </span>
                    </div>

                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                        {markers.map((marker) => (
                            <div
                                key={marker.id}
                                className="flex items-center gap-2.5 p-2 bg-[#0B101D] border border-white/[0.06] rounded-xl hover:border-white/[0.12] transition-all text-xs"
                            >
                                <div className="p-1.5 bg-emerald-950/60 border border-emerald-800/40 rounded-lg text-emerald-400 shrink-0">
                                    <MapPin size={12} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    {editingId === marker.id ? (
                                        <div className="flex items-center gap-1">
                                            <Input
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                className="h-6 text-[11px] px-1.5 bg-[#0E131F] border-white/[0.1] text-white"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveEdit(marker);
                                                    if (e.key === 'Escape') cancelEditing();
                                                }}
                                            />
                                            <button onClick={() => saveEdit(marker)} className="p-1 text-emerald-400 hover:bg-emerald-950 rounded cursor-pointer">
                                                <Check size={12} />
                                            </button>
                                            <button onClick={cancelEditing} className="p-1 text-slate-400 hover:bg-slate-800 rounded cursor-pointer">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="font-bold text-slate-200 truncate leading-tight">
                                            {marker.title}
                                        </p>
                                    )}
                                    <span className="text-[9px] text-slate-500 font-mono block">
                                        {marker.lat.toFixed(5)}, {marker.lon.toFixed(5)}
                                    </span>
                                </div>

                                <div className="flex items-center gap-0.5 shrink-0">
                                    {editingId !== marker.id && (
                                        <button
                                            type="button"
                                            onClick={() => startEditing(marker)}
                                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
                                            title="Ubah Nama"
                                        >
                                            <Pencil size={12} />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => onZoomTo(marker)}
                                        className="p-1.5 text-emerald-400 hover:bg-emerald-950/60 rounded-lg transition-colors cursor-pointer"
                                        title="Fokus ke Titik"
                                    >
                                        <Navigation size={12} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onRemove(marker.id)}
                                        className="p-1.5 text-rose-400 hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                                        title="Hapus Titik"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
