import { X, Save, Ruler, HardHat, Calendar, MapPin, Hash } from "lucide-react";
import { type MonitoringJalanResult } from "../services/monitoring.service";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface DrawFormPanelProps {
    isVisible: boolean;
    onClose: () => void;
    selectedRoad: MonitoringJalanResult | null;
    drawnGeoJSON: string | null;
    onSave: (data: any) => void;
}

export function DrawFormPanel({ isVisible, onClose, selectedRoad, drawnGeoJSON, onSave }: DrawFormPanelProps) {
    const [formData, setFormData] = useState({
        panjang: "",
        lebar: "",
        tahun: new Date().getFullYear().toString(),
        jenis_perkerasan: "Aspal",
        kondisi: "Baik",
        verifikator: "",
    });

    useEffect(() => {
        // Basic calculation for length if we have GeoJSON (not implemented here but good to have)
        setFormData(prev => ({ ...prev, lebar: selectedRoad?.jalan.lebar.toString() || "" }));
    }, [selectedRoad]);

    if (!selectedRoad) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.panjang || !formData.lebar) {
            toast.error("Mohon isi panjang dan lebar segmen");
            return;
        }

        onSave({
            ...formData,
            kode_ruas: selectedRoad.jalan.kode_ruas,
            geojson: drawnGeoJSON,
        });

        toast.success("Segmen pembangunan berhasil disimpan!");
        onClose();
    };

    return (
        <div
            className={cn(
                "absolute inset-y-0 right-0 z-50 w-full sm:w-[400px] bg-white border-l shadow-2xl transition-transform duration-500 ease-in-out transform flex flex-col",
                isVisible ? "translate-x-0" : "translate-x-full"
            )}
        >
            <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-600 rounded-lg text-white">
                        <Save className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 tracking-tight">SIMPAN SEGMEN BARU</h2>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Ruas #{selectedRoad.jalan.kode_ruas}</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                    <X className="w-5 h-5" />
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-4">
                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm border border-blue-200">
                            <MapPin className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">Jalan Target</p>
                            <h3 className="text-xs font-bold text-slate-800">{selectedRoad.jalan.nama_ruas}</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Panjang (m)</Label>
                            <div className="relative">
                                <Ruler className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    className="pl-9"
                                    value={formData.panjang}
                                    onChange={(e) => setFormData({ ...formData, panjang: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Lebar (m)</Label>
                            <div className="relative">
                                <HardHat className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    className="pl-9"
                                    value={formData.lebar}
                                    onChange={(e) => setFormData({ ...formData, lebar: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tahun Kontruksi</Label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                type="number"
                                className="pl-9"
                                value={formData.tahun}
                                onChange={(e) => setFormData({ ...formData, tahun: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Jenis Perkerasan</Label>
                        <Select
                            value={formData.jenis_perkerasan}
                            onValueChange={(v) => setFormData({ ...formData, jenis_perkerasan: v })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih Perkerasan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Aspal">Aspal</SelectItem>
                                <SelectItem value="Rabat Beton">Rabat Beton</SelectItem>
                                <SelectItem value="Telford">Telford</SelectItem>
                                <SelectItem value="Tanah">Tanah</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Kondisi</Label>
                        <Select
                            value={formData.kondisi}
                            onValueChange={(v) => setFormData({ ...formData, kondisi: v })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih Kondisi" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Baik">Baik</SelectItem>
                                <SelectItem value="Sedang">Sedang</SelectItem>
                                <SelectItem value="Rusak Ringan">Rusak Ringan</SelectItem>
                                <SelectItem value="Rusak Berat">Rusak Berat</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Verifikator</Label>
                        <Input
                            placeholder="Nama Verifikator"
                            value={formData.verifikator}
                            onChange={(e) => setFormData({ ...formData, verifikator: e.target.value })}
                        />
                    </div>
                </div>
            </form>

            <div className="p-4 border-t bg-slate-50">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-sm font-bold shadow-lg shadow-blue-200" onClick={handleSubmit}>
                    <Save className="w-4 h-4 mr-2" />
                    SIMPAN DATA SEGMEN
                </Button>
            </div>
        </div>
    );
}
