import { HelpCircle } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "~/components/ui/dialog";

interface HelpDialogProps {
    open: boolean;
    onClose: () => void;
}

export function HelpDialog({ open, onClose }: HelpDialogProps) {
    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="sm:max-w-[500px] bg-popover border-border rounded-xl shadow-2xl overflow-hidden p-0">
                <DialogHeader className="p-4 bg-indigo-500/5 border-b border-border/80 flex flex-row items-center gap-2.5">
                    <div className="p-2 bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 rounded-lg shrink-0">
                        <HelpCircle className="size-5" />
                    </div>
                    <div className="text-left">
                        <DialogTitle className="text-sm font-bold text-foreground">Panduan Digitasi Peta</DialogTitle>
                        <p className="text-[10px] text-muted-foreground font-medium">Petunjuk penggunaan Workspace Realisasi Infrastruktur</p>
                    </div>
                </DialogHeader>

                <div className="p-4 space-y-4 text-xs max-h-[400px] overflow-y-auto custom-scrollbar">
                    <div className="space-y-2">
                        <h3 className="font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-[10px]">1. Persiapan Awal</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Pilih <span className="font-semibold text-foreground">Kecamatan</span> dan{" "}
                            <span className="font-semibold text-foreground">Desa</span> terlebih dahulu pada panel kiri untuk
                            memuat peta referensi resmi dan daftar segmen yang ada.
                        </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-border/60">
                        <h3 className="font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-[10px]">2. Mode Penelusuran (Tracing)</h3>
                        <ul className="list-disc pl-4 space-y-1 text-muted-foreground leading-relaxed">
                            <li>
                                <span className="font-semibold text-foreground">Otomatis (Default)</span>: Cukup klik titik awal dan titik akhir
                                di sepanjang jalan referensi biru, sistem akan otomatis menghitung garis mengikuti jalan tersebut.
                            </li>
                            <li>
                                Jika sistem mendeteksi <span className="font-semibold text-foreground">Persimpangan</span>, panel melayang
                                akan muncul meminta Anda memilih arah jalan yang diinginkan.
                            </li>
                            <li>
                                <span className="font-semibold text-foreground">Manual</span>: Matikan penelusuran otomatis untuk menggambar
                                titik per titik secara bebas (cocok untuk jalan baru).
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-border/60">
                        <h3 className="font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-[10px]">3. Manajemen Segmen</h3>
                        <ul className="list-disc pl-4 space-y-1 text-muted-foreground leading-relaxed">
                            <li>
                                <span className="font-semibold text-foreground">Simpan</span>: Isi atribut nama jalan, lebar, perkerasan,
                                kondisi, dan tahun anggaran sebelum menekan tombol Simpan Segmen.
                            </li>
                            <li>
                                <span className="font-semibold text-foreground">Edit & Hapus</span>: Klik kanan pada segmen realisasi yang
                                sudah digambar di peta untuk membuka menu konteks (Detail, Edit Geometri, Edit Atribut, atau Hapus).
                            </li>
                        </ul>
                    </div>
                </div>

                <DialogFooter className="p-3 bg-muted/30 border-t border-border flex justify-end">
                    <Button
                        type="button"
                        onClick={onClose}
                        className="h-8 px-4 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                    >
                        Saya Mengerti
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
