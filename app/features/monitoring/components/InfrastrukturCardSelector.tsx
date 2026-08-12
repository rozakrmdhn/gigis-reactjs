import React from 'react';
import { Route, Footprints, GitCommit, Droplets, Waves, Layers, ChevronRight, Check } from 'lucide-react';
import { cn } from '~/lib/utils';
import type { InfrastrukturTipe } from '~/services/infrastruktur.service';

interface InfrastrukturCardSelectorProps {
    tipes: InfrastrukturTipe[];
    activeTipe: InfrastrukturTipe | null;
    onSelectTipe: (tipe: InfrastrukturTipe) => void;
    className?: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
    road: Route,
    path: Footprints,
    bridge: GitCommit,
    droplets: Droplets,
    waves: Waves,
};

export function InfrastrukturCardSelector({
    tipes,
    activeTipe,
    onSelectTipe,
    className
}: InfrastrukturCardSelectorProps) {
    if (!tipes || tipes.length === 0) return null;

    return (
        <div className={cn("space-y-3", className)}>
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Daftar Infrastruktur
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full">
                    {tipes.length} Tipe Aktif
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {tipes.map((tipe) => {
                    const isSelected = activeTipe?.kode === tipe.kode;
                    const IconComponent = ICON_MAP[tipe.ikon] || Layers;

                    return (
                        <button
                            key={tipe.kode}
                            type="button"
                            onClick={() => onSelectTipe(tipe)}
                            className={cn(
                                "group relative flex items-center justify-between p-3.5 rounded-xl border text-left transition-all duration-200 shadow-sm cursor-pointer",
                                isSelected
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20"
                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400/60 dark:hover:border-emerald-500/60 hover:shadow-md"
                            )}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div
                                    className={cn(
                                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-sm",
                                        isSelected ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                    )}
                                    style={{ backgroundColor: isSelected ? tipe.warna : undefined }}
                                >
                                    <IconComponent className="w-5 h-5" />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                            {tipe.nama}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                        {tipe.deskripsi || `${tipe.geom_type || 'POLYGON'} • ${tipe.has_segmen !== false ? 'Segmen Line' : 'Area Polygon'}`}
                                    </p>
                                </div>
                            </div>

                            <div className="shrink-0 ml-2">
                                {isSelected ? (
                                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </div>
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
