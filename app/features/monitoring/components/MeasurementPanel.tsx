import React, { useState, useEffect } from "react";
import { Info, RotateCcw, RotateCw, Move, Ruler, BoxSelect } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

interface MeasurementPanelProps {
    onStartMeasure: (type: "distance" | "area") => void;
    onClearMeasure: () => void;
    activeMeasureType: "distance" | "area" | null;
    measureResult: string | null;
    onFinishMeasure?: () => void;
    isDisabled?: boolean;
    onRotateMeasure?: (angleDegrees: number) => void;
    onGenerateDimensionArea?: (panjangM: number, lebarM: number) => void;
}

const PanjangIcon = () => (
    <svg className="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="2" width="10" height="20" rx="1" />
        <path d="M7 6h4" />
        <path d="M7 10h6" />
        <path d="M7 14h4" />
        <path d="M7 18h6" />
    </svg>
);

const LuasIcon = () => (
    <svg className="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4v16h16" />
        <path d="M4 8h3" />
        <path d="M4 12h5" />
        <path d="M4 16h3" />
        <path d="M8 20v-3" />
        <path d="M12 20v-5" />
        <path d="M16 20v-3" />
    </svg>
);

const PanjangLebarIcon = () => (
    <svg className="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 3H3v18h18V3z" />
        <path d="M9 3v18" />
        <path d="M3 9h18" />
    </svg>
);

export const MeasurementPanel: React.FC<MeasurementPanelProps> = ({
    onStartMeasure,
    onClearMeasure,
    activeMeasureType,
    measureResult,
    onFinishMeasure,
    isDisabled,
    onRotateMeasure,
    onGenerateDimensionArea,
}) => {
    const [selectedFormat, setSelectedFormat] = useState<"distance" | "area" | "dimensions" | null>(null);
    const [customPanjang, setCustomPanjang] = useState<string>("");
    const [customLebar, setCustomLebar] = useState<string>("3.5");

    // If disabled, reset selected format and clear active measurements
    useEffect(() => {
        if (isDisabled && selectedFormat) {
            setSelectedFormat(null);
            onClearMeasure();
        }
    }, [isDisabled, selectedFormat, onClearMeasure]);

    // Keep selectedFormat in sync with activeMeasureType when it gets activated externally
    useEffect(() => {
        if (activeMeasureType && selectedFormat !== "dimensions") {
            setSelectedFormat(activeMeasureType);
        }
    }, [activeMeasureType, selectedFormat]);

    // Sync length from map measure result when active (only from distance 'm', not area 'm²')
    useEffect(() => {
        if (measureResult && selectedFormat === "dimensions") {
            const trimmedResult = measureResult.trim();
            if (trimmedResult.endsWith("m") && !trimmedResult.includes("m²")) {
                const numStr = trimmedResult.replace(/[^0-9.,]/g, '').replace(',', '.');
                const num = parseFloat(numStr);
                if (!isNaN(num)) {
                    setCustomPanjang(num.toFixed(2));
                }
            }
        }
    }, [measureResult, selectedFormat]);

    const handleSelectFormat = (format: "distance" | "area" | "dimensions") => {
        if (selectedFormat === format) {
            setSelectedFormat(null);
            onClearMeasure();
        } else {
            setSelectedFormat(format);
            if (format === "dimensions") {
                onStartMeasure("distance");
            } else {
                onStartMeasure(format);
            }
        }
    };

    const handleReset = () => {
        if (selectedFormat) {
            onClearMeasure();
            setCustomPanjang("");
            if (selectedFormat === "dimensions") {
                onStartMeasure("distance");
            } else {
                onStartMeasure(selectedFormat);
            }
        }
    };

    // Calculate Area (Panjang x Lebar)
    const numericPanjang = parseFloat(customPanjang) || 0;
    const numericLebar = parseFloat(customLebar) || 0;
    const calculatedLuas = (numericPanjang * numericLebar).toLocaleString("id-ID", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-950">
            {/* Format Pengukuran */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
                <div className="space-y-1">
                    <h3 className="text-xs font-bold text-sky-900 dark:text-sky-400">Format Pengukuran</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Pilih opsi pengukuran: <strong>Panjang</strong>, <strong>Luas</strong>, atau <strong>Panjang & Lebar</strong>.
                    </p>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSelectFormat("distance")}
                        disabled={isDisabled}
                        className={cn(
                            "h-9 gap-1.5 text-xs font-bold rounded-lg border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition-all text-slate-600 dark:text-slate-350 px-2",
                            selectedFormat === "distance" && "border-orange-500 bg-orange-50/30 text-orange-600 hover:bg-orange-50/40 hover:text-orange-700 dark:border-orange-500 dark:bg-orange-950/30 dark:text-orange-400"
                        )}
                    >
                        <PanjangIcon />
                        <span>Panjang</span>
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSelectFormat("area")}
                        disabled={isDisabled}
                        className={cn(
                            "h-9 gap-1.5 text-xs font-bold rounded-lg border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition-all text-slate-600 dark:text-slate-350 px-2",
                            selectedFormat === "area" && "border-orange-500 bg-orange-50/30 text-orange-600 hover:bg-orange-50/40 hover:text-orange-700 dark:border-orange-500 dark:bg-orange-950/30 dark:text-orange-400"
                        )}
                    >
                        <LuasIcon />
                        <span>Luas</span>
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSelectFormat("dimensions")}
                        disabled={isDisabled}
                        className={cn(
                            "h-9 gap-1.5 text-xs font-bold rounded-lg border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition-all text-slate-600 dark:text-slate-350 px-2",
                            selectedFormat === "dimensions" && "border-orange-500 bg-orange-50/30 text-orange-600 hover:bg-orange-50/40 hover:text-orange-700 dark:border-orange-500 dark:bg-orange-950/30 dark:text-orange-400"
                        )}
                    >
                        <PanjangLebarIcon />
                        <span>P × L</span>
                    </Button>
                </div>

                {isDisabled && (
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] rounded-lg font-medium leading-relaxed">
                        ⚠️ Pengukuran dinonaktifkan saat digitasi sedang aktif. Silakan simpan atau batalkan digitasi terlebih dahulu.
                    </div>
                )}
            </div>

            {/* Dynamic Section based on selection */}
            {selectedFormat && (
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-xs font-bold text-orange-900 dark:text-orange-400">
                        {selectedFormat === "distance"
                            ? "Ukuran Panjang"
                            : selectedFormat === "area"
                            ? "Ukuran Luas Area"
                            : "Pengukuran Panjang & Lebar"}
                    </h3>

                    <div className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                        {selectedFormat === "dimensions" ? (
                            <p>
                                <strong>Gambar garis di peta</strong> atau masukan angka <strong>Panjang & Lebar</strong> di bawah ini untuk mengkalkulasi luas secara otomatis.
                            </p>
                        ) : (
                            <>
                                <p>
                                    <strong>Klik</strong> pada area peta untuk mulai mengukur {selectedFormat === "distance" ? "Jarak" : "Luas"}.
                                </p>
                                <p>
                                    <strong>Klik Dua Kali</strong> untuk selesai mengukur.
                                </p>
                            </>
                        )}
                    </div>

                    {/* Format Input Fields for Dimensions (Panjang & Lebar) */}
                    {selectedFormat === "dimensions" ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                        Panjang (m)
                                    </Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={customPanjang}
                                        onChange={(e) => setCustomPanjang(e.target.value)}
                                        className="h-8 text-xs font-semibold rounded-lg border-slate-200 dark:border-slate-700 focus:border-orange-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                        Lebar (m)
                                    </Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        placeholder="3.5"
                                        value={customLebar}
                                        onChange={(e) => setCustomLebar(e.target.value)}
                                        className="h-8 text-xs font-semibold rounded-lg border-slate-200 dark:border-slate-700 focus:border-orange-500"
                                    />
                                </div>
                            </div>

                            {/* Combined Result Box */}
                            <div className="rounded-xl border border-orange-200/80 dark:border-orange-900/50 bg-orange-50/40 dark:bg-orange-950/20 p-3.5 space-y-2">
                                <div className="flex justify-between items-center text-[11px] text-slate-600 dark:text-slate-300 border-b border-orange-200/60 dark:border-orange-900/40 pb-2">
                                    <span>Dimensi:</span>
                                    <span className="font-bold text-orange-900 dark:text-orange-200">
                                        {numericPanjang.toFixed(2)} m × {numericLebar.toFixed(2)} m
                                    </span>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold block uppercase tracking-wider">
                                        Hasil Kalkulasi Luas (P × L)
                                    </span>
                                    <div className="text-lg font-extrabold text-orange-900 dark:text-orange-100 tracking-tight">
                                        {calculatedLuas} m²
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="button"
                                onClick={() => {
                                    if (numericPanjang > 0 && numericLebar > 0) {
                                        onGenerateDimensionArea?.(numericPanjang, numericLebar);
                                    }
                                }}
                                disabled={numericPanjang <= 0 || numericLebar <= 0}
                                className="w-full h-8 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white gap-1.5 shadow-sm"
                            >
                                <BoxSelect className="w-3.5 h-3.5" />
                                <span>Tampilkan Area P × L pada Peta</span>
                            </Button>
                        </div>
                    ) : (
                        /* Result Box for single distance/area */
                        <div className="rounded-lg border border-orange-200 dark:border-orange-900/50 bg-orange-50/30 dark:bg-orange-950/20 p-3.5 space-y-1">
                            <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold block uppercase tracking-wider">
                                {selectedFormat === "distance" ? "Jarak" : "Luas"}
                            </span>
                            <div className="text-base font-bold text-orange-900 dark:text-orange-100 tracking-tight">
                                {measureResult || (selectedFormat === "distance" ? "0,00 m" : "0,00 m²")}
                            </div>
                        </div>
                    )}

                    {/* Interaktif Pindah & Rotasi Controls */}
                    <div className="p-3 bg-orange-50/40 dark:bg-slate-900/60 rounded-xl border border-orange-200/60 dark:border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <Move className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                                <span>Pindah & Rotasi Alat Ukur</span>
                            </span>
                        </div>

                        <div className="space-y-1 text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug">
                            <p>🖐️ <strong>Klik, tahan & geser titik node (lingkaran)</strong> untuk meresize / menyesuaikan bentuk alat ukur.</p>
                            <p>🖐️ <strong>Klik, tahan & geser area</strong> untuk memindahkan lokasi alat ukur.</p>
                        </div>

                        <div className="space-y-1 pt-1">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Putar Sudut Posisi</div>
                            <div className="grid grid-cols-4 gap-1.5">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onRotateMeasure?.(-15)}
                                    className="h-8 text-[11px] font-semibold rounded-lg border-slate-200 dark:border-slate-700 gap-1 px-1 hover:border-orange-500 hover:text-orange-600"
                                    title="Putar 15 derajat berlawanan jarum jam"
                                >
                                    <RotateCcw className="w-3 h-3 text-orange-600" />
                                    <span>-15°</span>
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onRotateMeasure?.(15)}
                                    className="h-8 text-[11px] font-semibold rounded-lg border-slate-200 dark:border-slate-700 gap-1 px-1 hover:border-orange-500 hover:text-orange-600"
                                    title="Putar 15 derajat searah jarum jam"
                                >
                                    <RotateCw className="w-3 h-3 text-orange-600" />
                                    <span>+15°</span>
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onRotateMeasure?.(45)}
                                    className="h-8 text-[11px] font-semibold rounded-lg border-slate-200 dark:border-slate-700 gap-1 px-1 hover:border-orange-500 hover:text-orange-600"
                                    title="Putar 45 derajat"
                                >
                                    <RotateCw className="w-3 h-3 text-orange-600" />
                                    <span>+45°</span>
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onRotateMeasure?.(90)}
                                    className="h-8 text-[11px] font-semibold rounded-lg border-slate-200 dark:border-slate-700 gap-1 px-1 hover:border-orange-500 hover:text-orange-600"
                                    title="Putar 90 derajat tegak lurus"
                                >
                                    <RotateCw className="w-3 h-3 text-orange-600" />
                                    <span>+90°</span>
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Info Disclaimer */}
                    <div className="flex items-start gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                        <Info className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>
                            {selectedFormat === "dimensions"
                                ? "Luas dikalkulasi otomatis dari perkalian Panjang × Lebar"
                                : selectedFormat === "distance"
                                ? "Panjang dihitung berdasarkan titik dan garis Anda"
                                : "Luas dihitung berdasarkan area yang Anda gambar"}
                        </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleReset}
                            className="h-9 text-xs font-bold rounded-lg border-orange-500 text-orange-600 hover:bg-orange-50/20 dark:border-orange-500 dark:text-orange-400 w-full"
                        >
                            Reset
                        </Button>
                        <Button
                            type="button"
                            onClick={onFinishMeasure}
                            className="h-9 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700 text-white w-full"
                        >
                            Selesai
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
