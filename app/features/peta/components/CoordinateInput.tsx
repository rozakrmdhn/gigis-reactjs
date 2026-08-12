import { useState } from 'react';
import { Plus, Trash2, MapPin, Navigation, Pencil, Check, X, Loader2 } from 'lucide-react';
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

        // Pattern 2: DMS (e.g., "7°9'0\"S, 111°52'48\"E" or "7 9 0 S, 111 52 48 E")
        // Regex to match one DMS component
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

            // Determine which is lat and which is lon based on direction suffix
            const dir1 = matches[0][4].toUpperCase();
            const dir2 = matches[1][4].toUpperCase();

            // Usually Lat is N/S, Lon is E/W
            if (['N', 'S'].includes(dir1) && ['E', 'W'].includes(dir2)) {
                return { lat: val1, lon: val2 };
            } else if (['E', 'W'].includes(dir1) && ['N', 'S'].includes(dir2)) {
                return { lat: val2, lon: val1 };
            }
            // Fallback if directions are same type or missing logic
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
            alert('Format koordinat tidak dikenali pada baris manapun. Gunakan format Desimal (-7.15, 111.88) atau DMS.');
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
        <div className={cn("space-y-4", className)}>
            {/* Input Form */}
            <div className="bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-600 rounded-lg text-white">
                            <Plus size={14} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">Tambah Titik Koordinat</span>
                    </div>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    onClick={handleUseMyLocation}
                    disabled={isLocating}
                    className="w-full h-9 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-[9px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                    {isLocating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Navigation className="w-3.5 h-3.5" />
                    )}
                    {isLocating ? "Mencari Sinyal GPS..." : "Gunakan Lokasi Saya Saat Ini"}
                </Button>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Koordinat Manual (Pemisah Enter)</label>
                    <Textarea
                        placeholder="Contoh:&#10;-7.15, 111.88&#10;-7.20, 111.90"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="min-h-[90px] rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-xs resize-none"
                    />
                    <p className="text-[8px] text-slate-400 font-medium italic ml-1">Ketik banyak koordinat dipisahkan dengan tombol Enter.</p>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Label (Opsional)</label>
                    <Input
                        type="text"
                        placeholder="Nama lokasi..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="h-9 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                </div>

                <Button
                    onClick={handleAdd}
                    className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200 dark:shadow-none font-black text-[10px] uppercase tracking-widest mt-1"
                >
                    Tambah ke Peta
                </Button>
            </div>

            {/* List of Markers */}
            {markers.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Daftar Titik ({markers.length})</span>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        {markers.map((marker) => (
                            <div
                                key={marker.id}
                                className="group flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-blue-200 dark:hover:border-blue-800 transition-all shadow-sm"
                            >
                                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-blue-600 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                                    <MapPin size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    {editingId === marker.id ? (
                                        <div className="flex items-center gap-1 mb-1">
                                            <Input
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                className="h-7 text-[11px] py-0 px-2 font-bold"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveEdit(marker);
                                                    if (e.key === 'Escape') cancelEditing();
                                                }}
                                            />
                                            <button onClick={() => saveEdit(marker)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                                                <Check size={12} />
                                            </button>
                                            <button onClick={cancelEditing} className="p-1 text-red-500 hover:bg-red-50 rounded">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-[11px] font-extrabold text-slate-900 dark:text-slate-200 truncate leading-none mb-1 uppercase tracking-tight">
                                            {marker.title}
                                        </p>
                                    )}
                                    <p className="text-[9px] font-bold text-slate-400 tabular-nums">
                                        {marker.lat.toFixed(6)}, {marker.lon.toFixed(6)}
                                    </p>
                                </div>
                                <div className="flex gap-1">
                                    {editingId !== marker.id && (
                                        <button
                                            onClick={() => startEditing(marker)}
                                            className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 rounded-lg transition-colors"
                                            title="Ubah Nama"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onZoomTo(marker)}
                                        className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 rounded-lg transition-colors"
                                        title="Ke Lokasi"
                                    >
                                        <Navigation size={14} />
                                    </button>
                                    <button
                                        onClick={() => onRemove(marker.id)}
                                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 rounded-lg transition-colors"
                                        title="Hapus"
                                    >
                                        <Trash2 size={14} />
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
