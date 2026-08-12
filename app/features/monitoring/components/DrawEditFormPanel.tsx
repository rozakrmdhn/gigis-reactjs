import { X, Save, Ruler, HardHat, Calendar, MapPin, Hash, CheckCircle2, FileText, Camera, User, Building2 } from "lucide-react";
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
import { useAuth } from "~/contexts/auth-context";
import { plottingAnggaranService } from "~/features/monitoring/services/plotting_anggaran.service";
import { Combobox } from "~/components/ui/combobox";

interface DrawEditFormPanelProps {
    isVisible: boolean;
    onClose: () => void;
    selectedRoad: MonitoringJalanResult | null;
    drawnGeoJSON: string | null;
    onSave: (data: any) => void;
    initialData?: any;
    drawnLength?: number;
    clickedVillageData?: {
        desaId?: string;
        desaName?: string;
        kecamatanId?: string;
        kecamatanName?: string;
    } | null;
}

export function DrawEditFormPanel({ isVisible, onClose, selectedRoad, drawnGeoJSON, onSave, initialData, drawnLength, clickedVillageData }: DrawEditFormPanelProps) {
    const { user } = useAuth();
    const currentUserName = user?.nama || (user as any)?.nama_user || (user as any)?.name || (user as any)?.username || (user as any)?.email || "Operator Bappeda";
    const currentUserId = user?.id || null;

    const defaultFormData = {
        check_melarosa: false,
        status_jalan: "",
        sumber_data: "",
        tahun_pembangunan: new Date().getFullYear().toString(),
        verifikator: currentUserName,
        user_id: currentUserId,
        id_user: currentUserId,
        plotting_id: "",
        status_aset: "Pemerintah Desa",
        desa: "",
        kecamatan: "",
        panjang: "",
        lebar: "",
        jenis_perkerasan: "",
        tahun_renovasi_terakhir: "",
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
    const [pendingDesa, setPendingDesa] = useState<{ id?: string; name?: string } | null>(null);

    const [plottingOptions, setPlottingOptions] = useState<{ value: string; label: string }[]>([]);
    const [isLoadingPlotting, setIsLoadingPlotting] = useState(false);

    const extractPlottingId = (seg: any): string => {
        if (!seg) return "";
        let val = seg.plotting_id ?? seg.id_plotting ?? seg.Plotting?.id;
        if (val !== undefined && val !== null && val !== "" && val !== "0" && val !== 0) return String(val);

        let attr = seg.atribut;
        if (typeof attr === "string") {
            try { attr = JSON.parse(attr); } catch (e) {}
        }
        if (attr) {
            let attrVal = attr.plotting_id ?? attr.id_plotting;
            if (attrVal !== undefined && attrVal !== null && attrVal !== "" && attrVal !== "0" && attrVal !== 0) return String(attrVal);
        }
        if (seg.properties) {
            let propVal = seg.properties.plotting_id ?? seg.properties.id_plotting;
            if (propVal !== undefined && propVal !== null && propVal !== "" && propVal !== "0" && propVal !== 0) return String(propVal);
        }
        return "";
    };

    useEffect(() => {
        const activePlotId = formData.plotting_id || extractPlottingId(initialData);
        if (!isVisible && !activePlotId) {
            setPlottingOptions([]);
            return;
        }

        const loadPlotting = async () => {
            setIsLoadingPlotting(true);
            try {
                let optionsList: Array<{ value: string; label: string }> = [];
                if (formData.desa_id) {
                    const res = await plottingAnggaranService.getPlottingList({
                        id_desa: formData.desa_id,
                        tahun_anggaran: formData.tahun_pembangunan,
                        limit: 100
                    });
                    const list = Array.isArray(res) ? res : (res?.result || res?.data || []);
                    optionsList = list.map((p: any) => ({
                        value: String(p.id),
                        label: `${p.jenis_bantuan || 'Bantuan'} (${p.lokasi_kegiatan || p.nama_kegiatan || '-'})`
                    }));
                }

                if (activePlotId) {
                    const strActivePlotId = String(activePlotId);
                    const matchedInFetched = optionsList.find((o: any) => String(o.value).trim().toLowerCase() === strActivePlotId.trim().toLowerCase());
                    if (!matchedInFetched) {
                        let label = "";
                        const existingPlot = initialData?.Plotting;
                        if (existingPlot && (existingPlot.jenis_bantuan || existingPlot.nama_kegiatan || existingPlot.lokasi_kegiatan)) {
                            label = `${existingPlot.jenis_bantuan || 'Bantuan'} (${existingPlot.lokasi_kegiatan || existingPlot.nama_kegiatan || '-'})`;
                        } else if (initialData?.jenis_bantuan_plotting) {
                            label = `${initialData.jenis_bantuan_plotting} (${initialData.lokasi_kegiatan_plotting || initialData.nama_kegiatan_plotting || '-'})`;
                        } else {
                            try {
                                const detailRes = await plottingAnggaranService.getPlottingById(strActivePlotId);
                                const d = detailRes?.result || detailRes?.data || detailRes;
                                if (d && (d.jenis_bantuan || d.nama_kegiatan || d.lokasi_kegiatan)) {
                                    label = `${d.jenis_bantuan || 'Bantuan'} (${d.lokasi_kegiatan || d.nama_kegiatan || '-'})`;
                                }
                            } catch (e) {
                                console.warn("Plotting detail fetch failed:", e);
                            }
                        }
                        if (!label) {
                            label = `Plotting #${strActivePlotId}`;
                        }
                        optionsList.unshift({
                            value: strActivePlotId,
                            label: label
                        });
                    }
                }
                setPlottingOptions(optionsList);
            } catch (err) {
                console.error("Error loading plotting list:", err);
            } finally {
                setIsLoadingPlotting(false);
            }
        };
        loadPlotting();
    }, [formData.desa_id, formData.tahun_pembangunan, formData.plotting_id, isVisible, initialData]);

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
        console.log("DrawEditFormPanel clickedVillageData change:", clickedVillageData, "kecamatans count:", kecamatans.length);
        if (isVisible && clickedVillageData && kecamatans.length > 0) {
            const findKec = kecamatans.find(k =>
                (clickedVillageData.kecamatanId && k.id.toString() === clickedVillageData.kecamatanId.toString()) ||
                (clickedVillageData.kecamatanName && k.nama_kecamatan.toLowerCase() === clickedVillageData.kecamatanName.toLowerCase())
            );

            if (findKec) {
                setFormData(prev => ({
                    ...prev,
                    kecamatan_id: findKec.id.toString(),
                    kecamatan: findKec.nama_kecamatan,
                    desa_id: "",
                    desa: ""
                }));
                setPendingDesa({
                    id: clickedVillageData.desaId,
                    name: clickedVillageData.desaName
                });
            }
        }
    }, [clickedVillageData, kecamatans, isVisible]);

    useEffect(() => {
        if (pendingDesa && desas.length > 0) {
            const findDesa = desas.find(d =>
                (pendingDesa.id && d.id.toString() === pendingDesa.id.toString()) ||
                (pendingDesa.name && d.nama_desa.toLowerCase() === pendingDesa.name.toLowerCase())
            );
            if (findDesa) {
                setFormData(prev => ({
                    ...prev,
                    desa_id: findDesa.id.toString(),
                    desa: findDesa.nama_desa
                }));
                setPendingDesa(null); // Clear pending
            }
        }
    }, [pendingDesa, desas]);

    useEffect(() => {
        if (!isVisible) return;
        setPendingDesa(null);

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
                desa: clickedVillageData ? (prev.desa || "") : "",
                kecamatan: clickedVillageData ? (prev.kecamatan || "") : "",
                kode_ruas: "0",
                kecamatan_id: clickedVillageData ? (prev.kecamatan_id || "") : "",
                desa_id: clickedVillageData ? (prev.desa_id || "") : "",
                nama_jalan: "Jalan Lingkungan"
            }));
        }

        if (initialData) {
            setFormData(prev => {
                const isClickedLocation = !!clickedVillageData;
                return {
                    ...prev,
                    panjang: initialData.panjang?.toString() || prev.panjang,
                    lebar: initialData.lebar?.toString() || selectedRoad?.jalan.lebar.toString() || "",
                    tahun_pembangunan: initialData.tahun_pembangunan?.toString() || prev.tahun_pembangunan,
                    jenis_perkerasan: initialData.jenis_perkerasan || prev.jenis_perkerasan,
                    kondisi: initialData.kondisi || prev.kondisi,
                    verifikator: initialData.verifikator || prev.verifikator || currentUserName,
                    user_id: initialData.user_id || initialData.id_user || currentUserId,
                    id_user: initialData.id_user || initialData.user_id || currentUserId,
                    plotting_id: extractPlottingId(initialData),
                    status_aset: initialData.status_aset || initialData.atribut?.status_aset || "Pemerintah Desa",
                    check_melarosa: initialData.check_melarosa === "Ya" || initialData.check_melarosa === true,
                    status_jalan: initialData.status_jalan || prev.status_jalan,
                    sumber_data: initialData.sumber_data || prev.sumber_data,
                    sumber_dana: initialData.sumber_dana || prev.sumber_dana,
                    tahun_renovasi_terakhir: initialData.tahun_renovasi_terakhir?.toString() || prev.tahun_renovasi_terakhir,
                    nama_jalan: initialData.nama_jalan || prev.nama_jalan,
                    keterangan: initialData.keterangan || prev.keterangan,
                    foto_url: initialData.foto_url || prev.foto_url,
                    status_kondisi: initialData.status_kondisi || prev.status_kondisi,
                    // If user has already clicked on map to change location, do NOT overwrite it with original initialData values
                    kecamatan_id: isClickedLocation ? prev.kecamatan_id : (initialData.kecamatan_id?.toString() || initialData.id_kecamatan?.toString() || prev.kecamatan_id),
                    desa_id: isClickedLocation ? prev.desa_id : (initialData.desa_id?.toString() || initialData.id_desa?.toString() || prev.desa_id),
                    desa: isClickedLocation ? prev.desa : (initialData.desa || prev.desa),
                    kecamatan: isClickedLocation ? prev.kecamatan : (initialData.kecamatan || prev.kecamatan)
                };
            });
        }
    }, [selectedRoad, initialData, isVisible, currentUserName, currentUserId]);

    useEffect(() => {
        if (drawnLength) {
            setFormData(prev => ({
                ...prev,
                panjang: drawnLength.toFixed(2)
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

        if (formData.check_melarosa && (!formData.kode_ruas || formData.kode_ruas === "0")) {
            toast.error("Kode ruas (data master) wajib dipilih jika Check Melarosa bernilai true.");
            return;
        }

        const isUUID = (str: any) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        const resolvedPlottingId = isUUID(formData.plotting_id) ? formData.plotting_id : (formData.plotting_id && formData.plotting_id !== "none" ? formData.plotting_id : null);

        const payload = {
            ...formData,
            plotting_id: resolvedPlottingId,
            status_aset: formData.status_aset || "Pemerintah Desa",
            verifikator: formData.verifikator || currentUserName,
            user_id: currentUserId,
            id_user: currentUserId,
            geom: drawnGeoJSON ? JSON.parse(drawnGeoJSON).geometry : undefined, // Send only geometry, not full Feature
            tahun_pembangunan: parseInt(formData.tahun_pembangunan) || 0,
            tahun_renovasi_terakhir: formData.tahun_renovasi_terakhir ? parseInt(formData.tahun_renovasi_terakhir) : null,
            panjang: parseFloat(formData.panjang) || 0,
            lebar: parseFloat(formData.lebar) || 0,
            kecamatan_id: parseInt(formData.kecamatan_id) || null,
            desa_id: parseInt(formData.desa_id) || null,
            parent_id: (formData.check_melarosa && formData.kode_ruas && formData.kode_ruas !== "0") ? formData.kode_ruas : null,
            kode_ruas: formData.check_melarosa ? formData.kode_ruas : "0",
            status_parent: Boolean(formData.check_melarosa),
            check_melarosa: formData.check_melarosa ? "Ya" : "Tidak",
            sumber_data: formData.sumber_data || "Survey Desa",
            atribut: {
                ...((formData as any).atribut || {}),
                status_aset: formData.status_aset || "Pemerintah Desa",
                plotting_id: resolvedPlottingId,
                sumber_data: formData.sumber_data || "Survey Desa",
                verifikator: formData.verifikator || currentUserName
            }
        };

        onSave(payload);
        toast.success("Segmen berhasil diperbarui!");
        setFormData(defaultFormData);
        onClose();
    };

    return (
        <div
            className={cn(
                "absolute inset-y-0 right-0 z-50 w-full sm:w-80 bg-white dark:bg-slate-900 border-l dark:border-slate-800 shadow-2xl transition-transform duration-500 ease-in-out transform flex flex-col",
                isVisible ? "translate-x-0" : "translate-x-full"
            )}
        >
            <div className="p-3 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-600 rounded-lg text-white">
                        <PencilIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">EDIT DATA SEGMEN</h2>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">{selectedRoad ? `Ruas #${selectedRoad.jalan.kode_ruas}` : "Non-Ruas (Jalan Lingkungan)"}</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-200 dark:hover:bg-slate-800">
                    <X className="w-5 h-5 dark:text-slate-400" />
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3 space-y-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-track]:bg-transparent">
                <div className="space-y-4">

                    {/* Basic Info Readonly/Disabled */}
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Desa</Label>
                            {selectedRoad ? (
                                <div className="font-bold text-xs text-slate-700 dark:text-slate-300">
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
                                    <SelectTrigger className="h-9.5 text-xs font-bold">
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
                            <Label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Kecamatan</Label>
                            {selectedRoad ? (
                                <div className="font-bold text-xs text-slate-700 dark:text-slate-300">
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
                                    <SelectTrigger className="h-9.5 text-xs font-bold">
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
                            <Label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Nama Jalan</Label>
                            <Input
                                value={formData.nama_jalan}
                                onChange={e => setFormData({ ...formData, nama_jalan: e.target.value })}
                                className="h-9.5 text-base md:text-xs font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                            />
                        </div>
                    </div>

                    {selectedRoad && (
                        <div className="flex items-center space-x-2 border p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30">
                            <Checkbox
                                id="melarosa"
                                checked={formData.check_melarosa}
                                onCheckedChange={(c) => setFormData({ ...formData, check_melarosa: c as boolean })}
                            />
                            <Label htmlFor="melarosa" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                Check Melarosa
                            </Label>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Status Jalan</Label>
                            <Select value={formData.status_jalan} onValueChange={(v) => setFormData({ ...formData, status_jalan: v })}>
                                <SelectTrigger className="w-full h-9.5 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Jalan Kabupaten">Jalan Kabupaten</SelectItem>
                                    <SelectItem value="Jalan Desa">Jalan Desa</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Sumber Data</Label>
                            <Input className="w-full h-9.5 text-xs rounded-xl" value={formData.sumber_data} onChange={(e) => setFormData({ ...formData, sumber_data: e.target.value })} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Sumber Dana</Label>
                        <Select
                            value={formData.sumber_dana}
                            onValueChange={(val) => setFormData({ ...formData, sumber_dana: val })}
                        >
                            <SelectTrigger className="w-full h-9.5 text-xs rounded-xl">
                                <SelectValue placeholder="Pilih Sumber Dana" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="BKK">BKK</SelectItem>
                                <SelectItem value="Sektoral">Sektoral</SelectItem>
                                <SelectItem value="Lainnya">Lainnya</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <div className="space-y-1.5">
                            <div className="flex items-center h-5">
                                <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider whitespace-nowrap">Status Aset</Label>
                            </div>
                            <Select
                                value={
                                    formData.status_aset === "Pemerintah Desa" || formData.status_aset === "Pemerintah Kabupaten"
                                        ? formData.status_aset
                                        : "custom"
                                }
                                onValueChange={(val) => {
                                    if (val === "custom") {
                                        setFormData({ ...formData, status_aset: "" });
                                    } else {
                                        setFormData({ ...formData, status_aset: val });
                                    }
                                }}
                            >
                                <SelectTrigger className="w-full h-9.5 text-xs bg-background border-input rounded-xl focus:ring-1 focus:ring-blue-500">
                                    <SelectValue placeholder="Pilih Status Aset" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border">
                                    <SelectItem value="Pemerintah Desa">Pemerintah Desa</SelectItem>
                                    <SelectItem value="Pemerintah Kabupaten">Pemerintah Kabupaten</SelectItem>
                                    <SelectItem value="custom">Custom (Ketik Manual)</SelectItem>
                                </SelectContent>
                            </Select>
                            {formData.status_aset !== "Pemerintah Desa" && formData.status_aset !== "Pemerintah Kabupaten" && (
                                <Input
                                    type="text"
                                    placeholder="Ketik status aset manual..."
                                    value={formData.status_aset}
                                    onChange={(e) => setFormData({ ...formData, status_aset: e.target.value })}
                                    className="h-9.5 text-xs bg-background border-input rounded-xl mt-1.5 focus:border-blue-500 animate-in fade-in-50 duration-200"
                                />
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center h-5">
                                <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider whitespace-nowrap">Plotting Anggaran</Label>
                            </div>
                            <Combobox
                                options={plottingOptions}
                                value={formData.plotting_id}
                                onSelect={(val) => setFormData({ ...formData, plotting_id: val })}
                                placeholder={isLoadingPlotting ? "Memuat..." : (plottingOptions.length > 0 ? "Pilih Plotting..." : "Tidak ada data")}
                                emptyText="Data plotting tidak ditemukan"
                                className="w-full h-9.5 text-xs rounded-xl"
                            />
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
                                <HardHat className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input type="number" className="pl-9" value={formData.lebar} onChange={(e) => setFormData({ ...formData, lebar: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tahun Bangun</Label>
                        <Input type="number" value={formData.tahun_pembangunan} onChange={(e) => setFormData({ ...formData, tahun_pembangunan: e.target.value })} />
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
                        <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Verifikator (User Login)</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input className="pl-9 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold cursor-not-allowed" value={formData.verifikator || currentUserName} readOnly />
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

            <div className="p-3 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-900 grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" className="h-10 text-xs font-bold uppercase tracking-wider dark:border-slate-700 dark:text-slate-300" onClick={onClose}>
                    Ulangi
                </Button>
                <Button className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700 h-10 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg shadow-amber-200 dark:shadow-amber-900/40" onClick={handleSubmit}>
                    <PencilIcon className="w-4 h-4 mr-2" />
                    Update Data
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
