import { X, Save, Ruler, HardHat, Calendar, MapPin, Hash, CheckCircle2, FileText, Camera, User } from "lucide-react";
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

interface DrawEditFormPanelProps {
    isVisible: boolean;
    onClose: () => void;
    selectedRoad: MonitoringJalanResult | null;
    drawnGeoJSON: string | null;
    onSave: (data: any) => void;
    initialData?: any;
    drawnLength?: number;
}

export function DrawEditFormPanel({ isVisible, onClose, selectedRoad, drawnGeoJSON, onSave, initialData, drawnLength }: DrawEditFormPanelProps) {
    const defaultFormData = {
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
        status_kondisi: "",
        sumber_dana: ""
    };

    const [formData, setFormData] = useState(defaultFormData);

    const [kecamatans, setKecamatans] = useState<any[]>([]);
    const [desas, setDesas] = useState<any[]>([]);
    const [isLoadingLocations, setIsLoadingLocations] = useState(false);

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
        if (!isVisible) return;

        if (selectedRoad) {
            setFormData(prev => ({
                ...prev,
                desa: selectedRoad.jalan.desa || "",
                kecamatan: selectedRoad.jalan.kecamatan || "",
                kode_ruas: selectedRoad.jalan.kode_ruas?.toString() || "0",
                kecamatan_id: selectedRoad.jalan.id_kecamatan?.toString() || "",
                desa_id: selectedRoad.jalan.id_desa || "",
                nama_jalan: selectedRoad.jalan.nama_ruas || ""
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                desa: "",
                kecamatan: "",
                kode_ruas: "0",
                kecamatan_id: "",
                desa_id: "",
                nama_jalan: "Jalan Lingkungan"
            }));
        }

        if (initialData) {
            setFormData(prev => ({
                ...prev,
                panjang: initialData.panjang?.toString() || prev.panjang,
                lebar: initialData.lebar?.toString() || selectedRoad?.jalan.lebar.toString() || "",
                tahun_pembangunan: initialData.tahun_pembangunan?.toString() || prev.tahun_pembangunan,
                jenis_perkerasan: initialData.jenis_perkerasan || prev.jenis_perkerasan,
                kondisi: initialData.kondisi || prev.kondisi,
                verifikator: initialData.verifikator || prev.verifikator,
                check_melarosa: initialData.check_melarosa === "Ya" || initialData.check_melarosa === true,
                status_jalan: initialData.status_jalan || prev.status_jalan,
                sumber_data: initialData.sumber_data || prev.sumber_data,
                sumber_dana: initialData.sumber_dana || "",
                tahun_renovasi_terakhir: initialData.tahun_renovasi_terakhir?.toString() || "",
                nama_jalan: initialData.nama_jalan || prev.nama_jalan,
                keterangan: initialData.keterangan || "",
                foto_url: initialData.foto_url || "",
                status_kondisi: initialData.status_kondisi || prev.status_kondisi,
                kecamatan_id: initialData.kecamatan_id?.toString() || initialData.id_kecamatan?.toString() || prev.kecamatan_id,
                desa_id: initialData.desa_id?.toString() || initialData.id_desa?.toString() || prev.desa_id,
                desa: initialData.desa || prev.desa,
                kecamatan: initialData.kecamatan || prev.kecamatan
            }));
        }
    }, [selectedRoad, initialData, isVisible]);

    useEffect(() => {
        if (drawnLength) {
            setFormData(prev => ({
                ...prev,
                panjang: drawnLength.toFixed(1)
            }));
        }
    }, [drawnLength]);

    // Synchronize names when lists arrive
    useEffect(() => {
        if (kecamatans.length > 0 && formData.kecamatan_id) {
            const found = kecamatans.find(k => k.id.toString() === formData.kecamatan_id.toString());
            if (found && found.nama_kecamatan !== formData.kecamatan) {
                setFormData(prev => ({ ...prev, kecamatan: found.nama_kecamatan }));
            }
        }
    }, [kecamatans, formData.kecamatan_id]);

    useEffect(() => {
        if (desas.length > 0 && formData.desa_id) {
            const found = desas.find(d => d.id.toString() === formData.desa_id.toString());
            if (found && found.nama_desa !== formData.desa) {
                setFormData(prev => ({ ...prev, desa: found.nama_desa }));
            }
        }
    }, [desas, formData.desa_id]);

    // if (!selectedRoad) return null; (Removed to allow Free Draw Edit)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            ...formData,
            geom: drawnGeoJSON ? JSON.parse(drawnGeoJSON).geometry : undefined, // Send only geometry, not full Feature
            tahun_pembangunan: parseInt(formData.tahun_pembangunan) || 0,
            tahun_renovasi_terakhir: formData.tahun_renovasi_terakhir ? parseInt(formData.tahun_renovasi_terakhir) : null,
            panjang: parseFloat(formData.panjang) || 0,
            lebar: parseFloat(formData.lebar) || 0,
            kecamatan_id: parseInt(formData.kecamatan_id) || null,
            desa_id: parseInt(formData.desa_id) || null,
            // Ensure check_melarosa is Ya/Tidak string
            check_melarosa: formData.check_melarosa ? "Ya" : "Tidak"
        };

        onSave(payload);
        toast.success("Segmen berhasil diperbarui!");
        setFormData(defaultFormData);
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
                    <div className="p-2 bg-amber-600 rounded-lg text-white">
                        <PencilIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 tracking-tight">EDIT DATA SEGMEN</h2>
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
                                <div className="font-bold text-xs text-slate-700">
                                    {desas.find(d => d.id.toString() === formData.desa_id.toString())?.nama_desa || formData.desa}
                                </div>
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
                                <div className="font-bold text-xs text-slate-700">
                                    {kecamatans.find(k => k.id.toString() === formData.kecamatan_id.toString())?.nama_kecamatan || formData.kecamatan}
                                </div>
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
                            <Input
                                value={formData.nama_jalan}
                                onChange={e => setFormData({ ...formData, nama_jalan: e.target.value })}
                                className="h-8 text-xs font-bold"
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 border p-3 rounded-xl bg-blue-50/50 border-blue-100">
                        <Checkbox
                            id="melarosa"
                            checked={formData.check_melarosa}
                            onCheckedChange={(c) => setFormData({ ...formData, check_melarosa: c as boolean })}
                        />
                        <Label htmlFor="melarosa" className="text-xs font-bold text-slate-700 cursor-pointer">
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

                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Sumber Dana</Label>
                        <Input value={formData.sumber_dana} onChange={(e) => setFormData({ ...formData, sumber_dana: e.target.value })} />
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
                                <HardHat className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
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
                <Button className="w-full bg-amber-600 hover:bg-amber-700 h-10 text-sm font-bold cursor-pointer shadow-lg shadow-amber-200" onClick={handleSubmit}>
                    <PencilIcon className="w-4 h-4 mr-2" />
                    UPDATE DATA SEGMEN
                </Button>
            </div>
        </div>
    );
}

function PencilIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
        </svg>
    )
}
