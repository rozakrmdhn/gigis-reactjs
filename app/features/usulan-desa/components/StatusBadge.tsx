import { Badge } from '~/components/ui/badge';
import type { UsulanStatus } from '../types/usulan-desa.types';
import { cn } from '~/lib/utils';

interface StatusBadgeProps {
    status: UsulanStatus;
}

const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { 
        label: 'Pending', 
        className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50 font-semibold px-2.5 py-0.5' 
    },
    verifikasi_bappeda: { 
        label: 'Verifikasi Bappeda', 
        className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50 font-semibold px-2.5 py-0.5' 
    },
    verifikasi_opd: { 
        label: 'Verifikasi OPD', 
        className: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/50 font-semibold px-2.5 py-0.5' 
    },
    disetujui: { 
        label: 'Disetujui', 
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50 font-semibold px-2.5 py-0.5' 
    },
    selesai: { 
        label: 'Selesai', 
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50 font-semibold px-2.5 py-0.5' 
    },
    ditolak: { 
        label: 'Ditolak', 
        className: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50 font-semibold px-2.5 py-0.5' 
    },
};

export function StatusBadge({ status }: StatusBadgeProps) {
    const config = statusConfig[status] ?? { 
        label: status, 
        className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 font-semibold px-2.5 py-0.5' 
    };

    return (
        <Badge variant="outline" className={cn(config.className)}>
            {config.label}
        </Badge>
    );
}
