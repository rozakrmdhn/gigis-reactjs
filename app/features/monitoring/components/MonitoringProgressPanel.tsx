import { X, Save, Activity, LayoutList, Plus, Trash2, Calendar, FileText, CheckCircle2, Pencil } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Progress } from "~/components/ui/progress";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";
import { monitoringService, type MonitoringProgress } from "../services/monitoring.service";

interface MonitoringProgressPanelProps {
    isVisible: boolean;
    onClose: () => void;
    segment: any | null;
}

export function MonitoringProgressPanel({
    isVisible,
    onClose,
    segment
}: MonitoringProgressPanelProps) {
    const [history, setHistory] = useState<MonitoringProgress[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        tanggal: new Date().toISOString().split('T')[0],
        progres: 0,
        catatan: ""
    });

    const segmentProps = segment?.getProperties ? segment.getProperties() : segment;
    const id_segmen = segmentProps?.id;
    const kode_ruas = segmentProps?.kode_ruas;

    const fetchHistory = useCallback(async () => {
        if (!id_segmen) return;
        setIsLoading(true);
        try {
            const data = await monitoringService.getMonitoringProgress(id_segmen);
            setHistory(data);
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setIsLoading(false);
        }
    }, [id_segmen]);

    useEffect(() => {
        if (isVisible && id_segmen) {
            fetchHistory();
        }
    }, [isVisible, id_segmen, fetchHistory]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id_segmen || !kode_ruas) {
            toast.error("Data segmen tidak lengkap");
            return;
        }

        try {
            if (editingId) {
                await monitoringService.updateMonitoringProgress(editingId, {
                    id_segmen,
                    kode_ruas,
                    ...formData
                });
            } else {
                await monitoringService.createMonitoringProgress({
                    id_segmen,
                    kode_ruas,
                    ...formData
                });
            }

            setFormData({
                tanggal: new Date().toISOString().split('T')[0],
                progres: 0,
                catatan: ""
            });
            setEditingId(null);
            fetchHistory();
        } catch (error) {
            // Error toast handled by apiClient
        }
    };

    const handleEdit = (item: MonitoringProgress) => {
        setEditingId(item.id);
        setFormData({
            tanggal: item.tanggal.split('T')[0],
            progres: item.progres,
            catatan: item.catatan || ""
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData({
            tanggal: new Date().toISOString().split('T')[0],
            progres: 0,
            catatan: ""
        });
    };

    const handleDelete = async (id: string) => {
        try {
            await monitoringService.deleteMonitoringProgress(id);
            fetchHistory();
        } catch (error) {
            // Error toast handled by apiClient
        }
    };

    return (
        <div
            className={cn(
                "absolute inset-y-0 right-0 z-60 w-full sm:w-[500px] bg-white dark:bg-slate-900 border-l dark:border-slate-800 shadow-2xl transition-transform duration-500 ease-in-out transform flex flex-col",
                isVisible ? "translate-x-0" : "translate-x-full"
            )}
        >
            {/* Header */}
            <div className="p-3 border-b bg-emerald-600 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-white/20 rounded-lg">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold tracking-tight uppercase">Monitoring Progres</h2>
                        <p className="text-[10px] text-emerald-100 uppercase font-semibold">
                            {segmentProps?.nama_jalan || segmentProps?.sumber_data || "Segmen Path"}
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10 text-white">
                    <X className="w-5 h-5" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-track]:bg-transparent">
                {/* Form Section */}
                <div className="p-4 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2 mb-4">
                        <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-100 uppercase tracking-wider">
                            {editingId ? "Edit Data Progres" : "Tambah Progres Baru"}
                        </h3>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Tanggal</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                                    <Input
                                        type="date"
                                        className="h-9 text-base md:text-xs pl-8 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                                        value={formData.tanggal}
                                        onChange={e => setFormData({ ...formData, tanggal: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Progres (%)</Label>
                                <div className="relative">
                                    <Activity className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        className="h-9 text-base md:text-xs pl-8 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                                        placeholder="0-100"
                                        value={formData.progres}
                                        onChange={e => setFormData({ ...formData, progres: parseInt(e.target.value) || 0 })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Catatan</Label>
                            <div className="relative">
                                <FileText className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                                <Textarea
                                    className="text-base md:text-xs pl-8 min-h-[80px] pt-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                                    placeholder="Catatan progres..."
                                    value={formData.catatan}
                                    onChange={e => setFormData({ ...formData, catatan: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {editingId && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCancelEdit}
                                    className="flex-1 h-9 text-xs font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                                >
                                    BATAL
                                </Button>
                            )}
                            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-9 text-xs font-bold gap-2 shadow-lg shadow-emerald-100 dark:shadow-emerald-900/20">
                                <Save className="w-4 h-4" />
                                {editingId ? "UPDATE PROGRES" : "SIMPAN PROGRES"}
                            </Button>
                        </div>
                    </form>
                </div>

                {/* History Table */}
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <LayoutList className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-100 uppercase tracking-wider">Riwayat Monitoring</h3>
                    </div>

                    <div className="border dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-slate-900">
                                <TableRow className="dark:border-slate-800">
                                    <TableHead className="text-[10px] font-bold uppercase py-2 dark:text-slate-400">Tanggal</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase py-2 dark:text-slate-400">Progres</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase py-2 dark:text-slate-400">Catatan</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase py-2 w-[80px] dark:text-slate-400"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8">
                                            <Activity className="w-6 h-6 text-slate-300 dark:text-slate-700 animate-spin mx-auto mb-2" />
                                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">MEMUAT DATA...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : history.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-12">
                                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600">BELUM ADA DATA MONITORING</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    history.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 dark:border-slate-800">
                                            <TableCell className="text-[11px] font-medium py-3 dark:text-slate-300">
                                                {new Date(item.tanggal).toLocaleDateString('id-ID', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <div className="space-y-1.5 w-[100px]">
                                                    <div className="flex justify-between items-center text-[10px] font-bold dark:text-slate-300">
                                                        <span>{item.progres}%</span>
                                                        {item.progres === 100 && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                                    </div>
                                                    <Progress value={item.progres} className="h-1.5 bg-slate-100 dark:bg-slate-800" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-[11px] text-slate-600 dark:text-slate-400 py-3 whitespace-normal max-w-[150px]">
                                                {item.catatan || "-"}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                                        onClick={() => handleEdit(item)}
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                                                        onClick={() => handleDelete(item.id)}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    );
}
