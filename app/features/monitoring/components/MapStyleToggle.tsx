import React, { useState } from "react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { Sparkles, MapPin, Calendar, Ruler, Activity } from "lucide-react";

interface MapStyleToggleProps {
    showSta: boolean;
    setShowSta: (val: boolean) => void;
    showYearLabel: boolean;
    setShowYearLabel: (val: boolean) => void;
    showDimensiLabel: boolean;
    setShowDimensiLabel: (val: boolean) => void;
    showKondisiLabel: boolean;
    setShowKondisiLabel: (val: boolean) => void;
    className?: string;
}

export function MapStyleToggle({
    showSta,
    setShowSta,
    showYearLabel,
    setShowYearLabel,
    showDimensiLabel,
    setShowDimensiLabel,
    showKondisiLabel,
    setShowKondisiLabel,
    className
}: MapStyleToggleProps) {
    const [isOpen, setIsOpen] = useState(false);
    const activeCount = [showSta, showYearLabel, showDimensiLabel, showKondisiLabel].filter(Boolean).length;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className={cn(
                                "h-10 w-10 md:h-9 md:w-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg shadow-slate-950/10 dark:shadow-black/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all duration-300 relative",
                                isOpen && "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white dark:bg-blue-600 dark:text-white dark:border-blue-600",
                                className
                            )}
                        >
                            <Sparkles className="size-4" />
                            {activeCount > 0 && !isOpen && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-black text-white shadow-sm ring-2 ring-white dark:ring-slate-900">
                                    {activeCount}
                                </span>
                            )}
                        </Button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="left">Label & Visual Style</TooltipContent>
            </Tooltip>

            <PopoverContent
                side="left"
                align="start"
                sideOffset={8}
                className="w-72 p-0 rounded-2xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl shadow-slate-950/20 dark:shadow-black/70 z-50 overflow-hidden"
            >
                {/* Header */}
                <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                            <Sparkles className="size-3.5" />
                        </div>
                        <div>
                            <h4 className="text-[11px] font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                                Label Spasial
                            </h4>
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">
                                Atur visibilitas teks & patok segmen
                            </p>
                        </div>
                    </div>
                </div>

                {/* Options List */}
                <div className="p-2 space-y-1">
                    {/* STA Option */}
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-100/80 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/20 hover:bg-slate-100/50 dark:hover:bg-slate-850/50 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0">
                                <MapPin className="size-3" />
                            </div>
                            <div className="min-w-0">
                                <Label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 block truncate cursor-pointer leading-snug">
                                    Patok STA (Stationing)
                                </Label>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate leading-tight">
                                    Patok awal STA 0+000 & akhir
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={showSta}
                            onCheckedChange={setShowSta}
                            className="data-[state=checked]:bg-blue-600 scale-[0.7] cursor-pointer"
                        />
                    </div>

                    {/* Tahun Option */}
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-100/80 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/20 hover:bg-slate-100/50 dark:hover:bg-slate-850/50 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
                                <Calendar className="size-3" />
                            </div>
                            <div className="min-w-0">
                                <Label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 block truncate cursor-pointer leading-snug">
                                    Tahun Anggaran
                                </Label>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate leading-tight">
                                    Label TA 2026 pada segmen
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={showYearLabel}
                            onCheckedChange={setShowYearLabel}
                            className="data-[state=checked]:bg-blue-600 scale-[0.7] cursor-pointer"
                        />
                    </div>

                    {/* Dimensi Option */}
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-100/80 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/20 hover:bg-slate-100/50 dark:hover:bg-slate-850/50 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 shrink-0">
                                <Ruler className="size-3" />
                            </div>
                            <div className="min-w-0">
                                <Label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 block truncate cursor-pointer leading-snug">
                                    Dimensi Segmen
                                </Label>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate leading-tight">
                                    Ukuran Panjang x Lebar (150m x 4m)
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={showDimensiLabel}
                            onCheckedChange={setShowDimensiLabel}
                            className="data-[state=checked]:bg-blue-600 scale-[0.7] cursor-pointer"
                        />
                    </div>

                    {/* Kondisi Option */}
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-100/80 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/20 hover:bg-slate-100/50 dark:hover:bg-slate-850/50 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 shrink-0">
                                <Activity className="size-3" />
                            </div>
                            <div className="min-w-0">
                                <Label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 block truncate cursor-pointer leading-snug">
                                    Kondisi Jalan
                                </Label>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate leading-tight">
                                    Status Baik, Sedang, atau Rusak
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={showKondisiLabel}
                            onCheckedChange={setShowKondisiLabel}
                            className="data-[state=checked]:bg-blue-600 scale-[0.7] cursor-pointer"
                        />
                    </div>
                </div>

                {/* Compact Footer Legend */}
                <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between text-[9px] font-semibold">
                    <span className="text-[8.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Kondisi:
                    </span>
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            Baik
                        </div>
                        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                            Sedang
                        </div>
                        <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                            Rusak
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
