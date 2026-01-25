import { X, Save, Ruler, HardHat, Calendar, MapPin, Hash, CheckCircle2, FileText, Camera, User, Maximize2 } from "lucide-react";
import { monitoringService, type MonitoringJalanResult } from "../services/monitoring.service";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { Checkbox } from "~/components/ui/checkbox";
import { cn } from "~/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface DrawFormPanelProps {
    isVisible: boolean;
    onClose: () => void;
    selectedRoad: MonitoringJalanResult | null;
    drawnGeoJSON: string | null;
    onSave: (data: any) => void;
    drawnLength?: number;
}

export function DrawFormPanel({ isVisible, onClose, selectedRoad, drawnGeoJSON, onSave, drawnLength }: DrawFormPanelProps) {
    const [formData, setFormData] = useState({
        check_melarosa: false,
        status_jalan: "",
        sumber_data: "",
        tahun_pembangunan: new Date().getFullYear().toString(),
        verifikator: "",
        desa: "",
        kecamatan: "",
        panjang: "",
        lebar: "",
        jenis_perkerasan: "",
        tahun_renovasi_terakhir: new Date().getFullYear().toString(),
        kondisi: "",
        nama_jalan: "",
        kode_ruas: "",
        kecamatan_id: "",
        desa_id: "",
        keterangan: "",
        foto_url: "",
        status_kondisi: ""
    });

    const [kecamatans, setKecamatans] = useState<any[]>([]);
    const [desas, setDesas] = useState<any[]>([]);
    const [isLoadingLocations, setIsLoadingLocations] = useState(false);

    useEffect(() => {
        if (drawnLength) {
            setFormData(prev => ({
                ...prev,
                panjang: drawnLength.toFixed(1)
            }));
        }
    }, [drawnLength]);

    useEffect(() => {
        const fetchKecamatans = async () => {
            const resp = await monitoringService.getKecamatan();
            if (resp.status === "success") {
                setKecamatans(resp.result);
            }
        };
        fetchKecamatans();
    }, []);

    useEffect(() => {
        const fetchDesas = async () => {
            if (formData.kecamatan_id) {
                setIsLoadingLocations(true);
                const resp = await monitoringService.getDesa(formData.kecamatan_id as string);
                if (resp.status === "success") {
                    setDesas(resp.result);
                }
                setIsLoadingLocations(false);
            } else {
                setDesas([]);
            }
        };
        fetchDesas();
    }, [formData.kecamatan_id]);

    useEffect(() => {
        if (selectedRoad) {
            setFormData(prev => ({
                ...prev,
                desa: selectedRoad.jalan.desa || "",
                kecamatan: selectedRoad.jalan.kecamatan || "",
                kode_ruas: selectedRoad.jalan.kode_ruas?.toString() || "0",
                kecamatan_id: selectedRoad.jalan.id_kecamatan?.toString() || "",
                desa_id: selectedRoad.jalan.id_desa || "",
                nama_jalan: selectedRoad.jalan.nama_ruas || "",
                lebar: selectedRoad.jalan.lebar?.toString() || "",
                check_melarosa: true
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                desa: "",
                kecamatan: "",
                kode_ruas: "0",
                kecamatan_id: "",
                desa_id: "",
                nama_jalan: "Jalan Lingkungan",
                lebar: "",
                check_melarosa: false
            }));
        }
    }, [selectedRoad]);

    // if (!selectedRoad) return null; (Removed to allow Free Draw)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.panjang || !formData.lebar) {
            toast.error("Mohon isi panjang dan lebar segmen");
            return;
        }

        const payload = {
            ...formData,
            geom: drawnGeoJSON ? JSON.parse(drawnGeoJSON).geometry : undefined,
            tahun_pembangunan: parseInt(formData.tahun_pembangunan) || 0,
            tahun_renovasi_terakhir: formData.tahun_renovasi_terakhir ? parseInt(formData.tahun_renovasi_terakhir) : null,
            panjang: parseFloat(formData.panjang) || 0,
            lebar: parseFloat(formData.lebar) || 0,
            kecamatan_id: parseInt(formData.kecamatan_id) || null,
            desa_id: parseInt(formData.desa_id) || null,
            check_melarosa: formData.check_melarosa ? "Ya" : "Tidak"
        };

        onSave(payload);
        toast.success("Segmen pembangunan berhasil disimpan!");
        onClose();
    };

    return (
        <div
            className={cn(
                "absolute inset-y-0 right-0 z-50 w-full sm:w-[450px] bg-white border-l shadow-2xl transition-transform duration-500 ease-in-out transform flex flex-col",
                isVisible ? "translate-x-0" : "translate-x-full"
            )}
        >
            <div className="p-3 border-b bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-600 rounded-lg text-white">
                        <Save className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 tracking-tight">{selectedRoad ? "SIMPAN SEGMEN BARU" : "TAMBAH JALAN LINGKUNGAN"}</h2>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">{selectedRoad ? `Ruas #${selectedRoad.jalan.kode_ruas}` : "Non-Ruas (Jalan Lingkungan)"}</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                    <X className="w-5 h-5" />
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3 space-y-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent">
                <div className="space-y-4">

                    {/* Basic Info Readonly/Disabled */}
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Desa</Label>
                            {selectedRoad ? (
                                <div className="font-bold text-xs text-slate-700">{formData.desa}</div>
                            ) : (
                                <Select
                                    value={formData.desa_id}
                                    onValueChange={(v) => {
                                        const selectedDesa = desas.find(d => d.id.toString() === v);
                                        setFormData({
                                            ...formData,
                                            desa_id: v,
                                            desa: selectedDesa?.nama_desa || ""
                                        });
                                    }}
                                    disabled={!formData.kecamatan_id || isLoadingLocations}
                                >
                                    <SelectTrigger className="h-8 text-xs font-bold">
                                        <SelectValue placeholder={isLoadingLocations ? "Loading..." : "Pilih Desa"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {desas.map((d) => (
                                            <SelectItem key={d.id} value={d.id.toString()}>
                                                {d.nama_desa}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Kecamatan</Label>
                            {selectedRoad ? (
                                <div className="font-bold text-xs text-slate-700">{formData.kecamatan}</div>
                            ) : (
                                <Select
                                    value={formData.kecamatan_id}
                                    onValueChange={(v) => {
                                        const selectedKec = kecamatans.find(k => k.id.toString() === v);
                                        setFormData({
                                            ...formData,
                                            kecamatan_id: v,
                                            kecamatan: selectedKec?.nama_kecamatan || "",
                                            desa_id: "",
                                            desa: ""
                                        });
                                    }}
                                >
                                    <SelectTrigger className="h-8 text-xs font-bold">
                                        <SelectValue placeholder="Pilih Kecamatan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {kecamatans.map((k) => (
                                            <SelectItem key={k.id} value={k.id.toString()}>
                                                {k.nama_kecamatan}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div className="col-span-2 space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Nama Jalan</Label>
                            {selectedRoad ? (
                                <div className="font-bold text-xs text-slate-700">{formData.nama_jalan}</div>
                            ) : (
                                <Input
                                    value={formData.nama_jalan}
                                    onChange={(e) => setFormData({ ...formData, nama_jalan: e.target.value })}
                                    className="h-8 text-xs font-bold"
                                    placeholder="Isi nama jalan lingkungan"
                                />
                            )}
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 border p-3 rounded-xl bg-blue-50/50 border-blue-100">
                        <Checkbox
                            id="melarosa-new"
                            checked={formData.check_melarosa}
                            onCheckedChange={(c) => setFormData({ ...formData, check_melarosa: c as boolean })}
                        />
                        <Label htmlFor="melarosa-new" className="text-xs font-bold text-slate-700 cursor-pointer">
                            Check Melarosa
                        </Label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Status Jalan</Label>
                            <Select value={formData.status_jalan} onValueChange={(v) => setFormData({ ...formData, status_jalan: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Jalan Kabupaten">Jalan Kabupaten</SelectItem>
                                    <SelectItem value="Jalan Poros Antar Desa">Jalan Poros Antar Desa</SelectItem>
                                    <SelectItem value="Jalan Poros Desa">Jalan Poros Desa</SelectItem>
                                    <SelectItem value="Jalan Lingkungan">Jalan Lingkungan</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Sumber Data</Label>
                            <Input value={formData.sumber_data} onChange={(e) => setFormData({ ...formData, sumber_data: e.target.value })} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Panjang (m)</Label>
                            <div className="relative">
                                <Ruler className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input type="number" className="pl-9" value={formData.panjang} onChange={(e) => setFormData({ ...formData, panjang: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Lebar (m)</Label>
                            <div className="relative">
                                <Maximize2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input type="number" className="pl-9" value={formData.lebar} onChange={(e) => setFormData({ ...formData, lebar: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tahun Bangun</Label>
                            <Input type="number" value={formData.tahun_pembangunan} onChange={(e) => setFormData({ ...formData, tahun_pembangunan: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tahun Renovasi</Label>
                            <Input type="number" placeholder="-" value={formData.tahun_renovasi_terakhir} onChange={(e) => setFormData({ ...formData, tahun_renovasi_terakhir: e.target.value })} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Perkerasan</Label>
                            <Select value={formData.jenis_perkerasan} onValueChange={(v) => setFormData({ ...formData, jenis_perkerasan: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Aspal">Aspal</SelectItem>
                                    <SelectItem value="Beton">Beton</SelectItem>
                                    <SelectItem value="Tanah">Tanah</SelectItem>
                                    <SelectItem value="Paving">Paving</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Kondisi</Label>
                            <Select value={formData.kondisi} onValueChange={(v) => setFormData({ ...formData, kondisi: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="baik">Baik</SelectItem>
                                    <SelectItem value="sedang">Sedang</SelectItem>
                                    <SelectItem value="rusak ringan">Rusak Ringan</SelectItem>
                                    <SelectItem value="rusak berat">Rusak Berat</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Status Kondisi</Label>
                        <Select value={formData.status_kondisi} onValueChange={(v) => setFormData({ ...formData, status_kondisi: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Eksisting">Eksisting</SelectItem>
                                <SelectItem value="Riwayat">Riwayat</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Verifikator</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input className="pl-9" value={formData.verifikator} onChange={(e) => setFormData({ ...formData, verifikator: e.target.value })} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">URL Foto</Label>
                        <div className="relative">
                            <Camera className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input className="pl-9" placeholder="https://..." value={formData.foto_url} onChange={(e) => setFormData({ ...formData, foto_url: e.target.value })} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Keterangan</Label>
                        <Textarea
                            placeholder="Keterangan tambahan..."
                            value={formData.keterangan}
                            onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                            className="min-h-[80px]"
                        />
                    </div>

                </div>
            </form>

            <div className="p-3 border-t bg-slate-50">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 h-10 text-sm font-bold shadow-lg shadow-blue-200" onClick={handleSubmit}>
                    <Save className="w-4 h-4 mr-2" />
                    SIMPAN DATA SEGMEN
                </Button>
            </div>
        </div>
    );
}
