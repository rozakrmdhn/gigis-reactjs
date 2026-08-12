import React from "react";
import { X, Info, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { RealisasiSegmen } from "~/routes/monitoring/realisasi-infrastruktur";
import type { Jalan } from "~/features/peta/types";

interface DetailSegmenPanelProps {
    isOpen: boolean;
    onClose: () => void;
    segment: RealisasiSegmen | null;
    masterRoad: Jalan | null;
}

export const DetailSegmenPanel: React.FC<DetailSegmenPanelProps> = ({
    isOpen,
    onClose,
    segment,
    masterRoad,
}) => {
    if (!isOpen || !segment) return null;

    return (
        <div className={cn(
            "absolute top-0 bottom-0 right-0 w-full sm:w-[380px] max-w-full bg-white dark:bg-slate-950 shadow-2xl border-l border-slate-200 dark:border-slate-800 transition-all duration-300 z-30 flex flex-col overflow-hidden",
            isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
        )}>
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Info className="h-4 w-4 text-slate-500" />
                    <span>Detail Segmen Realisasi</span>
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                    <X size={16} />
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar text-xs">
                {/* Segment Details */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider border-b pb-1 border-slate-100 dark:border-slate-800">
                        Metrik & Atribut Segmen
                    </h4>
                    <div className="space-y-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10">
                        <div className="space-y-0.5">
                            <span className="text-slate-500 dark:text-slate-400 block font-normal text-[10px]">ID Segmen</span>
                            <span className="font-semibold font-mono text-slate-900 dark:text-slate-100">{segment.id}</span>
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-slate-500 dark:text-slate-400 block font-normal text-[10px]">Nama Ruas</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100 break-words">{segment.nama_jalan}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                            <div className="space-y-0.5">
                                <span className="text-slate-500 dark:text-slate-400 block font-normal text-[10px]">Panjang Realisasi</span>
                                <span className="font-semibold text-slate-900 dark:text-slate-100">{parseFloat(segment.panjang_m.toString()).toFixed(2)} m</span>
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-slate-500 dark:text-slate-400 block font-normal text-[10px]">Lebar</span>
                                <span className="font-semibold text-slate-900 dark:text-slate-100">{segment.lebar_m} m</span>
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-slate-500 dark:text-slate-400 block font-normal text-[10px]">Perkerasan</span>
                                <span className="font-semibold text-slate-900 dark:text-slate-100 uppercase">{segment.perkerasan || "—"}</span>
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-slate-500 dark:text-slate-400 block font-normal text-[10px]">Kondisi</span>
                                <span className="font-semibold text-slate-900 dark:text-slate-100 uppercase">{segment.kondisi || "—"}</span>
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-slate-500 dark:text-slate-400 block font-normal text-[10px]">Status Jalan</span>
                                <span className="font-semibold text-slate-900 dark:text-slate-100">{segment.status_jalan || "—"}</span>
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-slate-500 dark:text-slate-400 block font-normal text-[10px]">Tahun Anggaran</span>
                                <span className="font-semibold text-slate-900 dark:text-slate-100">{segment.tahun_anggaran}</span>
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-slate-500 dark:text-slate-400 block font-normal text-[10px]">Kategori Poros</span>
                                <span className="font-semibold text-slate-900 dark:text-slate-100">{segment.check_melarosa ? "Dalam Poros" : "Di Luar Poros"}</span>
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-slate-500 dark:text-slate-400 block font-normal text-[10px]">Sumber Dana</span>
                                <span className="font-semibold text-slate-900 dark:text-slate-100 uppercase">{segment.sumber_dana || "—"}</span>
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-slate-500 dark:text-slate-400 block font-normal text-[10px]">Verifikator</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{segment.verifikator || "—"}</span>
                        </div>
                        {((segment as any).nama_kegiatan_plotting || (segment as any).atribut?.nama_kegiatan_plotting) && (
                            <div className="space-y-0.5 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                                <span className="text-slate-500 dark:text-slate-400 block font-normal text-[10px]">Kegiatan Ploting Target</span>
                                <span className="font-semibold text-blue-600 dark:text-blue-400 font-medium">{(segment as any).nama_kegiatan_plotting || (segment as any).atribut?.nama_kegiatan_plotting}</span>
                            </div>
                        )}
                        {segment.keterangan && (
                            <div className="space-y-1 pt-2 border-t border-slate-250/60 dark:border-slate-800/60">
                                <span className="text-slate-500 dark:text-slate-400 block font-normal text-[10px]">Keterangan</span>
                                <p className="text-slate-900 dark:text-slate-100 leading-relaxed break-words font-semibold">{segment.keterangan}</p>
                            </div>
                        )}

                        {/* Dynamic JSONB Attributes Display */}
                        {segment.atribut && Object.keys(segment.atribut).length > 0 && (
                            (() => {
                                const excludedKeys = [
                                    'namobj', 'nama_jalan', 'id', 'geom', 'parent_id', 'tipe_kode',
                                    'panjang', 'lebar', 'kondisi', 'status_kondisi', 'tahun_pembangunan',
                                    'sumber_dana', 'keterangan', 'foto_url', 'desa', 'kecamatan',
                                    'id_desa', 'id_kecamatan', 'created_at', 'updated_at', 'kode_ruas',
                                    'plotting_id', 'verifikator', 'user_id', 'nama_kegiatan_plotting'
                                ];
                                const dynamicEntries = Object.entries(segment.atribut).filter(
                                    ([key, val]) => !excludedKeys.includes(key) && val !== null && val !== undefined && val !== ""
                                );
                                if (dynamicEntries.length === 0) return null;

                                return (
                                    <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                                        <span className="text-slate-500 dark:text-slate-400 block font-normal text-[10px] uppercase tracking-wider">
                                            Atribut Dinamis (JSONB)
                                        </span>
                                        <div className="grid grid-cols-2 gap-2 bg-slate-100/60 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
                                            {dynamicEntries.map(([key, val]) => (
                                                <div key={key} className="space-y-0.5">
                                                    <span className="text-slate-500 dark:text-slate-400 block font-normal text-[9.5px] capitalize">
                                                        {key.replace(/_/g, " ")}
                                                    </span>
                                                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-[11px] break-words">
                                                        {typeof val === "boolean" ? (val ? "Ya" : "Tidak") : String(val)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()
                        )}
                    </div>
                </div>

                {/* Master Road Details (Only for Poros) */}
                {segment.check_melarosa && (
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider border-b pb-1 border-slate-100 dark:border-slate-800">
                            Informasi Jalan Poros Desa
                        </h4>
                        {masterRoad ? (
                            <div className="space-y-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10">
                                <div className="space-y-0.5">
                                    <span className="text-slate-500 dark:text-slate-400 block font-normal text-[10px]">Kode Ruas Poros</span>
                                    <span className="font-semibold font-mono text-slate-900 dark:text-slate-100">{masterRoad.kode_ruas}</span>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-slate-500 dark:text-slate-400 block font-normal text-[10px]">Nama Ruas Poros Master</span>
                                    <span className="font-semibold text-slate-900 dark:text-slate-100 break-words">{masterRoad.nama_ruas}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                                    <div className="space-y-0.5">
                                        <span className="text-slate-500 dark:text-slate-400 block font-normal text-[10px]">Panjang Master</span>
                                        <span className="font-semibold text-slate-900 dark:text-slate-100">{parseFloat(masterRoad.panjang.toString()).toFixed(2)} m</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-slate-500 dark:text-slate-400 block font-normal text-[10px]">Lebar Master</span>
                                        <span className="font-semibold text-slate-900 dark:text-slate-100">{masterRoad.lebar} m</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-slate-500 dark:text-slate-400 block font-normal text-[10px]">Perkerasan Awal</span>
                                        <span className="font-semibold text-slate-900 dark:text-slate-100 uppercase">{masterRoad.perkerasan || "—"}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-slate-500 dark:text-slate-400 block font-normal text-[10px]">Kondisi Awal</span>
                                        <span className="font-semibold text-slate-900 dark:text-slate-100 uppercase">{masterRoad.kondisi || "—"}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-slate-500 dark:text-slate-400 block font-normal text-[10px]">Status Awal</span>
                                        <span className="font-semibold text-slate-900 dark:text-slate-100 uppercase">{masterRoad.status_awal || "—"}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-slate-500 dark:text-slate-400 block font-normal text-[10px]">Status Eksisting</span>
                                        <span className="font-semibold text-slate-900 dark:text-slate-100 uppercase">{masterRoad.status_eksisting || "—"}</span>
                                    </div>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-slate-500 dark:text-slate-400 block font-normal text-[10px]">Kecamatan / Desa</span>
                                    <span className="font-semibold text-slate-900 dark:text-slate-100 uppercase">{masterRoad.kecamatan || "—"} / {masterRoad.desa || "—"}</span>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-slate-500 dark:text-slate-400 block font-normal text-[10px]">Sumber Data</span>
                                    <span className="font-semibold text-slate-900 dark:text-slate-100 uppercase">{masterRoad.sumber_data || "—"}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-500 flex items-center justify-center gap-2">
                                <Loader2 className="size-3.5 animate-spin" />
                                <span>Memuat data jalan poros...</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
