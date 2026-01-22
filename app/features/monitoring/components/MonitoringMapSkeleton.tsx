import { Loader2 } from "lucide-react";

export function MonitoringMapSkeleton() {
    return (
        <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 bg-white/90 backdrop-blur-sm px-8 py-6 rounded-2xl shadow-xl">
                <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
                <p className="text-sm text-slate-700 font-medium">Memuat peta...</p>
            </div>
        </div>
    );
}
