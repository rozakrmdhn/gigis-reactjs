export const CORE_LAYER_COLORS = {
    SEGMENTS: {
        hex: '#00cf64ff',
        tw: 'slate-700',
        bg: 'bg-slate-50',
        bgDark: 'dark:bg-slate-900/20',
        text: 'text-slate-700',
        border: 'border-slate-200'
    },
    ADMIN: {
        hex: '#f97316',
        tw: 'orange-600',
        bg: 'bg-orange-50',
        bgDark: 'dark:bg-orange-900/20',
        text: 'text-orange-600',
        border: 'border-orange-200'
    },
    CATALOG: {
        hex: '#6366f1',
        tw: 'indigo-600',
        bg: 'bg-indigo-50',
        bgDark: 'dark:bg-indigo-900/20',
        text: 'text-indigo-600',
        border: 'border-indigo-200'
    },
    GENERAL: {
        hex: '#2563eb',
        tw: 'blue-600',
        bg: 'bg-blue-50',
        bgDark: 'dark:bg-blue-900/20',
        text: 'text-blue-600',
        border: 'border-blue-200'
    }
};

export const getCoreLayerStyle = (id: string) => {
    if (id.includes('segments')) return CORE_LAYER_COLORS.SEGMENTS;
    if (id.includes('desa') || id.includes('kecamatan') || id.includes('batas')) return CORE_LAYER_COLORS.ADMIN;
    if (id.startsWith('geonode-')) return CORE_LAYER_COLORS.CATALOG;
    return CORE_LAYER_COLORS.GENERAL;
};
