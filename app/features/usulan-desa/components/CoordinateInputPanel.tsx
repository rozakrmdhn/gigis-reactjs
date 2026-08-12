import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { IconPlus, IconTrash, IconX, IconCheck } from "@tabler/icons-react";
import type { GeometryType } from "../types/usulan-desa.types";
import { toast } from "sonner";

interface CoordinateInputPanelProps {
    drawMode: GeometryType | null;
    onAddPoint: (coords: [number, number][]) => void;
    onAddLine: (coords: [number, number][]) => void;
    onAddPolygon: (coords: [number, number][]) => void;
    onClose: () => void;
}

// Helper to parse a single coordinate part (can be DD or DMS format)
function parseSingleCoordinatePart(part: string): { val: number; dir?: string } | null {
    const clean = part.trim().replace(/[\s"′′″″”’']/g, ' ').replace(/\s+/g, ' ');
    if (!clean) return null;

    // 1. Decimal Degrees (DD): e.g., "-7.12345" or "111.45678" or "-7.12345°"
    const decimalMatch = clean.match(/^([+-]?\d+(?:\.\d+)?)\s*°?$/);
    if (decimalMatch) {
        return { val: parseFloat(decimalMatch[1]) };
    }

    // 2. Decimal with direction prefix/suffix: e.g., "S 7.12345", "7.12345 S"
    const dirDecimalMatch = clean.match(/^(?:([NSEW])\s+([+-]?\d+(?:\.\d+)?)|([+-]?\d+(?:\.\d+)?)\s+([NSEW]))$/i);
    if (dirDecimalMatch) {
        const dir = (dirDecimalMatch[1] || dirDecimalMatch[4] || "").toUpperCase();
        const valStr = dirDecimalMatch[2] || dirDecimalMatch[3];
        let val = parseFloat(valStr);
        if (dir === 'S' || dir === 'W') {
            if (val > 0) val = -val;
        }
        return { val, dir };
    }

    // 3. Degrees Minutes Seconds (DMS): e.g., "7° 8' 40.2\" S", "7d 8m 40s S", "7 8 40.2 S"
    // Also support optional sign prefix/suffix, e.g. "-7° 8' 40.2\""
    const dmsMatch = clean.match(/^([+-]?\d+)\s+(?:(\d+)\s+)?(?:(\d+(?:\.\d+)?)\s*)?([NSEW])?$/i);
    if (dmsMatch) {
        const deg = parseFloat(dmsMatch[1]);
        const min = dmsMatch[2] ? parseFloat(dmsMatch[2]) : 0;
        const sec = dmsMatch[3] ? parseFloat(dmsMatch[3]) : 0;
        const dir = dmsMatch[4] ? dmsMatch[4].toUpperCase() : undefined;

        let val = Math.abs(deg) + min / 60 + sec / 3600;
        if (deg < 0) {
            val = -val;
        }
        if (dir) {
            if (dir === 'S' || dir === 'W') {
                val = -Math.abs(val);
            } else if (dir === 'N' || dir === 'E') {
                val = Math.abs(val);
            }
        }
        return { val, dir };
    }

    return null;
}

// Unified coordinate parser for Decimal and DMS
function parseCoordinate(input: string): { lat: number, lng: number } | null {
    const cleanInput = input.trim();
    if (!cleanInput) return null;

    // Split by comma, semicolon, or slash
    let parts = cleanInput.split(/[,;\/]/);
    if (parts.length < 2) {
        // If no comma/semicolon/slash, try to split by space.
        // But only if we can find a clean boundary. For example, if it's just two decimal numbers: "-7.123 111.456"
        const spaceParts = cleanInput.split(/\s+/);
        if (spaceParts.length === 2) {
            parts = spaceParts;
        } else {
            // Or if there is a direction letter in the middle, e.g. "7° 8' 40\" S 111° 58' 31\" E"
            // We can split by S/N/E/W followed by space
            const dmsSplitMatch = cleanInput.match(/^(.+?[NSEW])\s+([+-]?\d.+)$/i);
            if (dmsSplitMatch) {
                parts = [dmsSplitMatch[1], dmsSplitMatch[2]];
            } else {
                return null;
            }
        }
    }

    if (parts.length >= 2) {
        const part1 = parseSingleCoordinatePart(parts[0]);
        const part2 = parseSingleCoordinatePart(parts[1]);

        if (part1 && part2) {
            let lat = part1.val;
            let lng = part2.val;

            // If direction is explicitly provided, we can determine which is lat and which is lng
            const dir1 = part1.dir;
            const dir2 = part2.dir;

            if (dir1 && dir2) {
                if (['N', 'S'].includes(dir1) && ['E', 'W'].includes(dir2)) {
                    lat = part1.val;
                    lng = part2.val;
                } else if (['E', 'W'].includes(dir1) && ['N', 'S'].includes(dir2)) {
                    lat = part2.val;
                    lng = part1.val;
                }
            } else {
                // If no explicit directions, check if they are in the expected range.
                // Standard order: Latitude, Longitude (e.g. -7.12, 111.9)
                // In Bojonegoro, Latitude is around -7, Longitude is around 111.
                // So if part1 is around 111 and part2 is around -7, swap them!
                if (Math.abs(part1.val) > 90 && Math.abs(part2.val) <= 90) {
                    lat = part2.val;
                    lng = part1.val;
                }
            }

            return { lat, lng };
        }
    }

    return null;
}

export function CoordinateInputPanel({
    drawMode,
    onAddPoint,
    onAddLine,
    onAddPolygon,
    onClose,
}: CoordinateInputPanelProps) {
    // Textarea state for single/multiple point coordinates
    const [pointCoordsText, setPointCoordsText] = useState<string>("");

    // Multiple points states (LineString/Polygon)
    const [multiCoords, setMultiCoords] = useState<{ lng: string; lat: string }[]>([
        { lng: "", lat: "" },
        { lng: "", lat: "" },
    ]);

    const handleAddRow = () => {
        setMultiCoords((prev) => [...prev, { lng: "", lat: "" }]);
    };

    const handleRemoveRow = (index: number) => {
        if (multiCoords.length <= 2) {
            toast.error("Minimal harus terdapat 2 koordinat.");
            return;
        }
        setMultiCoords((prev) => prev.filter((_, i) => i !== index));
    };

    const handleValueChange = (index: number, field: "lng" | "lat", value: string) => {
        setMultiCoords((prev) => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
    };

    const handlePointSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const lines = pointCoordsText.split("\n");
        const parsed: [number, number][] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const coords = parseCoordinate(line);
            if (!coords) {
                toast.error(`Format koordinat pada baris ke-${i + 1} tidak dikenali.`);
                return;
            }

            if (coords.lng < -180 || coords.lng > 180) {
                toast.error(`Longitude baris ke-${i + 1} harus di antara -180 dan 180.`);
                return;
            }

            if (coords.lat < -90 || coords.lat > 90) {
                toast.error(`Latitude baris ke-${i + 1} harus di antara -90 dan 90.`);
                return;
            }

            parsed.push([coords.lng, coords.lat]);
        }

        if (parsed.length === 0) {
            toast.error("Harap masukkan minimal satu koordinat.");
            return;
        }

        onAddPoint(parsed);
    };

    const handleMultiSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate and convert
        const parsed: [number, number][] = [];
        for (let i = 0; i < multiCoords.length; i++) {
            const { lng: lngStr, lat: latStr } = multiCoords[i];
            const lng = parseFloat(lngStr);
            const lat = parseFloat(latStr);

            if (isNaN(lng) || isNaN(lat)) {
                toast.error(`Koordinat baris ke-${i + 1} tidak valid.`);
                return;
            }

            if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
                toast.error(`Koordinat baris ke-${i + 1} di luar batas koordinat bumi.`);
                return;
            }

            parsed.push([lng, lat]);
        }

        if (drawMode === "LineString") {
            if (parsed.length < 2) {
                toast.error("Garis membutuhkan minimal 2 titik.");
                return;
            }
            onAddLine(parsed);
            toast.success("Garis koordinat berhasil diterapkan ke peta.");
        } else if (drawMode === "Polygon") {
            if (parsed.length < 3) {
                toast.error("Area (Polygon) membutuhkan minimal 3 titik.");
                return;
            }
            onAddPolygon(parsed);
            toast.success("Area koordinat berhasil diterapkan ke peta.");
        }
    };

    return (
        <div className="w-[360px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase tracking-wider">
                    Input Koordinat ({drawMode === "Point" ? "Titik" : drawMode === "LineString" ? "Garis" : "Area"})
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-400 hover:text-slate-600 rounded-md"
                    onClick={onClose}
                >
                    <IconX size={14} />
                </Button>
            </div>

            {drawMode === "Point" ? (
                <form onSubmit={handlePointSubmit} className="space-y-3">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Koordinat (Pemisah Enter)</Label>
                        <Textarea
                            placeholder="Contoh format desimal:&#10;-7.14467, 111.975422&#10;&#10;Contoh format derajat:&#10;7° 8' 40.2&quot; S, 111° 58' 31.5&quot; E"
                            value={pointCoordsText}
                            onChange={(e) => setPointCoordsText(e.target.value)}
                            className="min-h-[140px] text-xs dark:bg-slate-950 dark:border-slate-850 font-medium resize-none py-2"
                            required
                        />
                        <p className="text-[8px] text-slate-400 font-medium italic pl-1">Dukung format Desimal (Lat, Long) dan Derajat (DMS). Pisahkan per baris.</p>
                    </div>
                    <Button type="submit" size="sm" className="w-full h-8 text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-xl gap-1">
                        <IconCheck size={14} />
                        Terapkan ke Peta
                    </Button>
                </form>
            ) : (
                <form onSubmit={handleMultiSubmit} className="flex flex-col gap-3">
                    <div className="max-h-[220px] overflow-y-auto pr-1 flex flex-col gap-2.5 custom-scrollbar">
                        {multiCoords.map((coord, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 w-5">{index + 1}</span>
                                <Input
                                    type="number"
                                    step="any"
                                    placeholder="Lng"
                                    value={coord.lng}
                                    onChange={(e) => handleValueChange(index, "lng", e.target.value)}
                                    className="h-8 text-xs dark:bg-slate-950 dark:border-slate-850 flex-1"
                                    required
                                />
                                <Input
                                    type="number"
                                    step="any"
                                    placeholder="Lat"
                                    value={coord.lat}
                                    onChange={(e) => handleValueChange(index, "lat", e.target.value)}
                                    className="h-8 text-xs dark:bg-slate-950 dark:border-slate-850 flex-1"
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-slate-200 dark:border-slate-850 rounded-xl"
                                    onClick={() => handleRemoveRow(index)}
                                    disabled={multiCoords.length <= 2}
                                >
                                    <IconTrash size={14} />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddRow}
                            className="flex-1 h-8 text-xs border-slate-200 dark:border-slate-850 rounded-xl gap-1"
                        >
                            <IconPlus size={14} />
                            Tambah Baris
                        </Button>
                        <Button type="submit" size="sm" className="flex-1 h-8 text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-xl gap-1">
                            <IconCheck size={14} />
                            Terapkan ke Peta
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
}
