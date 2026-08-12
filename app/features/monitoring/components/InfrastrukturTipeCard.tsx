import React from 'react';
import { Route, Footprints, GitCommit, Droplets, Waves, Circle, Layers } from 'lucide-react';
import type { InfrastrukturTipe } from '~/services/infrastruktur.service';

const ICON_MAP: Record<string, React.ElementType> = {
    road: Route,
    path: Footprints,
    bridge: GitCommit,
    droplets: Droplets,
    waves: Waves,
    circle: Circle,
};

interface InfrastrukturTipeCardProps {
    tipe: InfrastrukturTipe;
    onClick: (tipe: InfrastrukturTipe) => void;
}

export function InfrastrukturTipeCard({ tipe, onClick }: InfrastrukturTipeCardProps) {
    const IconComponent = ICON_MAP[tipe.ikon] || Layers;
    const isClickable = true;

    return (
        <button
            type="button"
            onClick={() => onClick(tipe)}
            className="group w-full flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 text-left transition-all duration-200 shadow-2xs cursor-pointer hover:shadow-md hover:scale-[1.02] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
            style={{
                borderColor: tipe.warna ? `${tipe.warna}60` : undefined,
                backgroundColor: tipe.warna ? `${tipe.warna}0D` : undefined,
            }}
            title={`Lihat realisasi ${tipe.nama}`}
        >
            <div
                className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-xs"
                style={{
                    backgroundColor: tipe.warna ? `${tipe.warna}20` : '#3b82f620',
                    color: tipe.warna || '#3b82f6'
                }}
            >
                <IconComponent className="w-6 h-6" />
            </div>

            <div className="text-center min-w-0 w-full">
                <span className="text-xs font-bold block text-slate-800 dark:text-slate-100 truncate">
                    {tipe.nama}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 uppercase tracking-wider font-semibold">
                    {tipe.geom_type || 'LINE'}
                </span>
            </div>

            {!isClickable && (
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Tanpa Segmen
                </span>
            )}
        </button>
    );
}
