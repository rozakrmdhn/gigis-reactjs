import React from 'react';
import { Route, Footprints, GitCommit, Droplets, Waves, Layers } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import type { InfrastrukturTipe } from '~/services/infrastruktur.service';

interface TipeSwitcherProps {
    tipes: InfrastrukturTipe[];
    activeKode: string;
    onSelect: (tipe: InfrastrukturTipe) => void;
    className?: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
    road: Route,
    path: Footprints,
    bridge: GitCommit,
    droplets: Droplets,
    waves: Waves,
};

export function TipeSwitcher({ tipes, activeKode, onSelect, className }: TipeSwitcherProps) {
    if (!tipes || tipes.length === 0) return null;

    return (
        <div className={className}>
            <Tabs value={activeKode} onValueChange={(kode) => {
                const found = tipes.find(t => t.kode === kode);
                if (found) onSelect(found);
            }}>
                <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl shadow-inner border dark:border-slate-700/50">
                    {tipes.map((t) => {
                        const IconComponent = ICON_MAP[t.ikon] || Layers;
                        return (
                            <TabsTrigger
                                key={t.kode}
                                value={t.kode}
                                className="flex items-center gap-2 text-xs font-bold uppercase py-1.5 px-3 rounded-lg transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-md data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400"
                            >
                                <span 
                                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-sm" 
                                    style={{ backgroundColor: t.warna }} 
                                />
                                <IconComponent className="w-3.5 h-3.5" />
                                <span>{t.nama}</span>
                            </TabsTrigger>
                        );
                    })}
                </TabsList>
            </Tabs>
        </div>
    );
}
