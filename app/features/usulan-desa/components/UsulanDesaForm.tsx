import { useEffect, useState, useCallback } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { useAbility } from "~/contexts/AbilityContext";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Calendar } from "~/components/ui/calendar";
import { Badge } from "~/components/ui/badge";
import { CalendarIcon, ChevronsUpDown, Check, Trash2, Plus, FileText, MapPin, Layers, Building2, Coins, CheckCircle2, Info } from "lucide-react";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "~/components/ui/command";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { kecamatanService, type Kecamatan } from "~/services/kecamatan";
import { desaService, type Desa } from "~/services/desa";
import { usulanDesaService } from "../services/usulan-desa.service";
import { usulanKategoriService } from "../services/usulan-kategori.service";
import { masterOpdService } from "../services/master-opd.service";
import type { UsulanDesa } from "../types/usulan-desa.types";
import type { UsulanKategori } from "../types/usulan-kategori.types";
import { cn } from "~/lib/utils";

const usulanSchema = z.object({
    nomor_agenda: z.string().min(1, "Nomor agenda harus diisi"),
    nomor_surat: z.array(
        z.object({
            value: z.string().min(1, "Nomor surat tidak boleh kosong")
        })
    ).min(1, "Minimal harus ada 1 nomor surat"),
    tanggal_surat: z.string().min(1, "Tanggal surat harus diisi"),
    uraian_usulan: z.string().min(1, "Uraian usulan harus diisi"),
    jenis_usulan: z.string().optional().or(z.literal("")),
    alamat_usulan: z.string().min(1, "Alamat usulan harus diisi"),
    tahun_anggaran: z.number().min(2020, "Tahun anggaran minimal 2020"),
    url_dokumen_usulan: z.string().nullable().optional(),
    status: z.enum(["pending", "verifikasi_bappeda", "verifikasi_opd", "selesai", "ditolak"]),
    id_kecamatan: z.number().min(1, "Kecamatan harus dipilih"),
    id_desa: z.number().min(1, "Desa harus dipilih"),
    id_kategori: z.string().uuid("Kategori usulan pembangunan harus dipilih"),
    catatan_bappeda: z.string().optional().or(z.literal("")),
    catatan_bupati: z.string().optional().or(z.literal("")),
    volume: z.string().optional().or(z.literal("")),
    anggaran_usulan: z.number().min(0, "Anggaran minimal 0").nullable().optional().or(z.nan().transform(() => null)),
});

type UsulanFormData = z.infer<typeof usulanSchema>;

interface UsulanDesaFormProps {
    initialData?: UsulanDesa;
    onSuccess?: (savedUsulan: UsulanDesa) => void;
    onCancel?: () => void;
    compactMode?: boolean;
    onKecamatanChange?: (idKecamatan: number) => void;
    disableButtons?: boolean;
    onRegisterNew?: () => void;
}

export function UsulanDesaForm({ initialData, onSuccess, onCancel, compactMode = false, onKecamatanChange, disableButtons = false, onRegisterNew }: UsulanDesaFormProps) {
    const navigate = useNavigate();
    const [kecamatanList, setKecamatanList] = useState<Kecamatan[]>([]);
    const [desaList, setDesaList] = useState<Desa[]>([]);
    const [kategoriList, setKategoriList] = useState<UsulanKategori[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [kecamatanOpen, setKecamatanOpen] = useState(false);
    const [desaOpen, setDesaOpen] = useState(false);
    const [kategoriOpen, setKategoriOpen] = useState(false);
    const [isOpenKategoriDialog, setIsOpenKategoriDialog] = useState(false);
    const [newKategoriNama, setNewKategoriNama] = useState("");
    const [newKategoriKode, setNewKategoriKode] = useState("");
    const [newKategoriDeskripsi, setNewKategoriDeskripsi] = useState("");
    const [newKategoriOpdId, setNewKategoriOpdId] = useState("");
    const [isCreatingKategori, setIsCreatingKategori] = useState(false);

    const [opdList, setOpdList] = useState<any[]>([]); // To hold master OPDs

    const ability = useAbility();
    const canCreateKategori = ability.can("create", "UsulanKategori");

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        control,
        formState: { errors },
    } = useForm<UsulanFormData>({
        resolver: zodResolver(usulanSchema),
        defaultValues: {
            status: "pending",
            tahun_anggaran: new Date().getFullYear(),
            id_kecamatan: 0,
            id_desa: 0,
            id_kategori: "",
            catatan_bappeda: "",
            url_dokumen_usulan: "",
            nomor_surat: [{ value: "" }],
            catatan_bupati: "",
            volume: "",
            anggaran_usulan: null,
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "nomor_surat"
    });

    const selectedKecamatanId = watch("id_kecamatan");

    // Fetch initial kecamatan
    useEffect(() => {
        kecamatanService.getKecamatan()
            .then(setKecamatanList)
            .catch((err) => console.error("Gagal mengambil kecamatan:", err));
    }, []);

    const [kategoriSearch, setKategoriSearch] = useState("");
    const [isFetchingKategori, setIsFetchingKategori] = useState(false);
    const [selectedKategoriItem, setSelectedKategoriItem] = useState<UsulanKategori | null>(null);

    // Fetch active categories list (with server-side search, limit 10)
    const fetchKategoriList = useCallback((searchQuery?: string) => {
        setIsFetchingKategori(true);
        usulanKategoriService.getAll({ is_active: true, search: searchQuery ? searchQuery.trim() : undefined, limit: 10 })
            .then((res) => {
                let sorted = [...res].sort((a, b) => a.nama.localeCompare(b.nama));
                if (selectedKategoriItem && !sorted.some(k => k.id === selectedKategoriItem.id)) {
                    sorted = [selectedKategoriItem, ...sorted];
                }
                setKategoriList(sorted);
            })
            .catch((err) => console.error("Gagal mengambil kategori:", err))
            .finally(() => setIsFetchingKategori(false));
    }, [selectedKategoriItem]);

    // Debounce server-side search for Kategori Usulan
    useEffect(() => {
        const handler = setTimeout(() => {
            fetchKategoriList(kategoriSearch);
        }, 300);
        return () => clearTimeout(handler);
    }, [kategoriSearch, fetchKategoriList]);

    useEffect(() => {
        masterOpdService.getAll({ active_only: true })
            .then(setOpdList)
            .catch(err => console.error("Gagal memuat OPD:", err));
    }, []);

    // Handle creating a new category directly
    const handleCreateKategori = async () => {
        if (!canCreateKategori) {
            toast.error("Anda tidak memiliki izin untuk membuat kategori baru!");
            return;
        }
        if (!newKategoriNama.trim()) {
            toast.error("Nama kategori wajib diisi!");
            return;
        }
        setIsCreatingKategori(true);
        try {
            const payload = {
                nama: newKategoriNama,
                kode: newKategoriKode || undefined,
                deskripsi: newKategoriDeskripsi || undefined,
                opd_id: newKategoriOpdId || undefined,
                is_active: true
            };
            const res = await usulanKategoriService.create(payload);
            toast.success("Kategori baru berhasil dibuat!");
            
            // Refetch category list
            fetchKategoriList();

            // Automatically select newly created category
            if (res && res.id) {
                setValue("id_kategori", res.id);
                setValue("jenis_usulan", res.nama);
            }
            
            setNewKategoriNama("");
            setNewKategoriKode("");
            setNewKategoriDeskripsi("");
            setNewKategoriOpdId("");
            setIsOpenKategoriDialog(false);
        } catch (error: any) {
            toast.error(error.message || "Gagal membuat kategori baru");
        } finally {
            setIsCreatingKategori(false);
        }
    };

    // Fetch desa when kecamatan changes
    useEffect(() => {
        if (selectedKecamatanId && selectedKecamatanId > 0) {
            desaService.getDesa(selectedKecamatanId)
                .then(setDesaList)
                .catch((err) => console.error("Gagal mengambil desa:", err));
        } else {
            setDesaList([]);
        }
    }, [selectedKecamatanId]);

    // Set initial values if editing
    useEffect(() => {
        if (initialData) {
            const initialNomorSurat = Array.isArray(initialData.nomor_surat)
                ? initialData.nomor_surat.map(v => ({ value: v }))
                : (initialData.nomor_surat ? [{ value: initialData.nomor_surat }] : [{ value: "" }]);

            reset({
                nomor_agenda: initialData.nomor_agenda,
                nomor_surat: initialNomorSurat,
                tanggal_surat: initialData.tanggal_surat ? initialData.tanggal_surat.split("T")[0] : "",
                uraian_usulan: initialData.uraian_usulan,
                jenis_usulan: initialData.jenis_usulan,
                alamat_usulan: initialData.alamat_usulan,
                tahun_anggaran: initialData.tahun_anggaran,
                url_dokumen_usulan: initialData.url_dokumen_usulan || "",
                status: initialData.status,
                id_kecamatan: Number(initialData.id_kecamatan),
                id_desa: Number(initialData.id_desa),
                id_kategori: initialData.id_kategori || "",
                catatan_bappeda: initialData.catatan_bappeda || "",
                catatan_bupati: initialData.catatan_bupati || "",
                volume: initialData.volume || "",
                anggaran_usulan: initialData.anggaran_usulan !== undefined ? initialData.anggaran_usulan : null,
            });

            // Pre-load desa list based on initialData.id_kecamatan
            // so dropdown is populated and id_desa can be re-selected
            if (initialData.id_kecamatan) {
                desaService.getDesa(initialData.id_kecamatan)
                    .then((list) => {
                        setDesaList(list);
                        // Ensure id_desa is re-set after desa list loads
                        setValue("id_desa", Number(initialData.id_desa));
                    })
                    .catch((err) => console.error("Gagal pre-load desa:", err));
            }

            // Ensure initial selected category is loaded into dropdown list
            if (initialData.kategori) {
                const katObj: UsulanKategori = {
                    id: initialData.kategori.id,
                    nama: initialData.kategori.nama,
                    kode: initialData.kategori.kode || null,
                    deskripsi: initialData.kategori.deskripsi || null,
                    is_active: initialData.kategori.is_active ?? true,
                    opd_id: initialData.kategori.opd_id || null,
                    created_at: (initialData.kategori as any).created_at || "",
                    updated_at: (initialData.kategori as any).updated_at || ""
                };
                setSelectedKategoriItem(katObj);
                setKategoriList((prev) => {
                    if (!prev.some(k => k.id === katObj.id)) {
                        return [katObj, ...prev];
                    }
                    return prev;
                });
            } else if (initialData.id_kategori) {
                usulanKategoriService.getById(initialData.id_kategori)
                    .then((kat) => {
                        if (kat) {
                            setSelectedKategoriItem(kat);
                            setKategoriList((prev) => {
                                if (!prev.some(k => k.id === kat.id)) {
                                    return [kat, ...prev];
                                }
                                return prev;
                            });
                        } else if (initialData.jenis_usulan) {
                            const dummy: UsulanKategori = {
                                id: initialData.id_kategori!,
                                nama: initialData.jenis_usulan,
                                kode: null,
                                deskripsi: null,
                                is_active: true,
                                created_at: "",
                                updated_at: ""
                            };
                            setSelectedKategoriItem(dummy);
                            setKategoriList((prev) => [dummy, ...prev]);
                        }
                    })
                    .catch(() => {
                        if (initialData.jenis_usulan) {
                            const dummy: UsulanKategori = {
                                id: initialData.id_kategori!,
                                nama: initialData.jenis_usulan,
                                kode: null,
                                deskripsi: null,
                                is_active: true,
                                created_at: "",
                                updated_at: ""
                            };
                            setSelectedKategoriItem(dummy);
                            setKategoriList((prev) => [dummy, ...prev]);
                        }
                    });
            }
        }
    }, [initialData, reset, setValue]);

    // Re-apply id_kecamatan value AFTER kecamatanList has finished loading
    // This is needed because reset() is called before kecamatanList loads (async),
    // so the <select> option matching fails on first render.
    useEffect(() => {
        if (initialData && kecamatanList.length > 0) {
            setValue("id_kecamatan", Number(initialData.id_kecamatan));
        }
    }, [kecamatanList, initialData, setValue]);


    const watchedKecamatan = watch("id_kecamatan");
    useEffect(() => {
        if (onKecamatanChange && watchedKecamatan) {
            onKecamatanChange(Number(watchedKecamatan));
        }
    }, [watchedKecamatan, onKecamatanChange]);



    const onSubmit = async (data: UsulanFormData) => {
        setIsSubmitting(true);
        try {

            // Block changing status directly away from verifikasi_opd if there are active assignments
            if (initialData && initialData.status === 'verifikasi_opd' && data.status !== 'verifikasi_opd' && initialData.assignments && initialData.assignments.length > 0) {
                toast.error("Tidak dapat mengubah status. Silakan batalkan/hapus disposisi OPD terlebih dahulu.");
                setIsSubmitting(false);
                return;
            }

            // Use Number() to handle type mismatch: API may return BIGINT IDs as strings
            const selectedKec = kecamatanList.find((k) => Number(k.id) === Number(data.id_kecamatan));
            const selectedDes = desaList.find((d) => Number(d.id) === Number(data.id_desa));

            const payload = {
                ...data,
                nomor_surat: data.nomor_surat.map(item => item.value),
                nama_kecamatan: selectedKec
                    ? selectedKec.nama_kecamatan
                    : (initialData?.nama_kecamatan || undefined),
                nama_desa: selectedDes
                    ? selectedDes.nama_desa
                    : (initialData?.nama_desa || undefined),
                jenis_usulan: data.jenis_usulan || (kategoriList.find(k => k.id === data.id_kategori)?.nama || "")
            };

            let result: UsulanDesa | null = null;
            if (initialData) {
                result = await usulanDesaService.update(initialData.id, payload);
            } else {
                result = await usulanDesaService.create(payload);
            }
            if (onSuccess) {
                onSuccess(result || initialData || ({} as UsulanDesa));
            } else {
                navigate(initialData ? `/admin/usulan-desa/detail/${initialData.id}` : "/admin/usulan-desa/daftar-usulan");
            }
        } catch (error) {
            console.error("Gagal submit form:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit(onSubmit)} className={cn("space-y-4", compactMode ? "w-full flex-1 flex flex-col min-h-full" : "max-w-4xl")} autoComplete="off">
                <div className={cn("space-y-3.5 pb-6", compactMode ? "flex-1" : "")}>
                    {/* Status Saved Banner if Initial Data is Saved */}
                    {initialData && (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 p-3 flex items-center justify-between gap-2.5 text-xs">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <div>
                                    <p className="font-bold text-emerald-800 dark:text-emerald-200">Data Usulan Tersimpan</p>
                                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                                        Agenda <strong className="font-mono">#{initialData.nomor_agenda}</strong> • Siap dipetakan lokasinya.
                                    </p>
                                </div>
                            </div>
                            <Badge variant="outline" className="bg-emerald-100/50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300 uppercase text-[9px] font-bold">
                                {initialData.status}
                            </Badge>
                        </div>
                    )}

                    {/* SECTION 1: Dokumen Administrasi & Surat */}
                    <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4 space-y-3 shadow-2xs">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/80">
                            <div className="h-6 w-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                                <FileText className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-foreground">1. Administrasi & Agenda Surat</h4>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Nomor Agenda */}
                            <div className="space-y-1.5">
                                <Label htmlFor="nomor_agenda" className="text-xs font-bold">Nomor Agenda <span className="text-rose-500">*</span></Label>
                                <Input
                                    id="nomor_agenda"
                                    placeholder="Contoh: 1234"
                                    {...register("nomor_agenda")}
                                    className={cn("h-9 text-xs rounded-xl bg-background", errors.nomor_agenda && "border-rose-500")}
                                />
                                {errors.nomor_agenda && (
                                    <p className="text-[11px] text-rose-500 font-medium">{errors.nomor_agenda.message}</p>
                                )}
                            </div>

                            {/* Tanggal Surat */}
                            <div className="space-y-1.5">
                                <Label htmlFor="tanggal_surat" className="text-xs font-bold">Tanggal Surat <span className="text-rose-500">*</span></Label>
                                <Controller
                                    name="tanggal_surat"
                                    control={control}
                                    render={({ field }) => {
                                        const selectedDate = field.value ? new Date(field.value + "T00:00:00") : undefined;
                                        return (
                                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        id="tanggal_surat"
                                                        type="button"
                                                        variant="outline"
                                                        className={cn(
                                                            "w-full justify-start text-left font-normal gap-2 h-9 text-xs rounded-xl bg-background",
                                                            !field.value && "text-muted-foreground",
                                                            errors.tanggal_surat && "border-rose-500"
                                                        )}
                                                    >
                                                        <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                        {selectedDate
                                                            ? selectedDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                                                            : "Pilih tanggal surat"}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={selectedDate}
                                                        onSelect={(date) => {
                                                            if (date) {
                                                                const yyyy = date.getFullYear();
                                                                const mm = String(date.getMonth() + 1).padStart(2, "0");
                                                                const dd = String(date.getDate()).padStart(2, "0");
                                                                field.onChange(`${yyyy}-${mm}-${dd}`);
                                                            } else {
                                                                field.onChange("");
                                                            }
                                                            setIsCalendarOpen(false);
                                                        }}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        );
                                    }}
                                />
                                {errors.tanggal_surat && (
                                    <p className="text-[11px] text-rose-500 font-medium">{errors.tanggal_surat.message}</p>
                                )}
                            </div>
                        </div>

                        {/* Nomor Surat (Multiple) */}
                        <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold">Nomor Surat Usulan <span className="text-rose-500">*</span></Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => append({ value: "" })}
                                    className="h-7 px-2 text-[11px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-bold gap-1 cursor-pointer"
                                >
                                    <Plus className="h-3 w-3" /> Tambah Nomor
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono font-bold text-muted-foreground w-4 text-center">
                                            {index + 1}.
                                        </span>
                                        <Input
                                            placeholder="Contoh: 050/123/412.302/2026"
                                            {...register(`nomor_surat.${index}.value` as const)}
                                            className={cn("h-9 text-xs rounded-xl bg-background flex-1", errors.nomor_surat?.[index]?.value && "border-rose-500")}
                                        />
                                        {fields.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => remove(index)}
                                                className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg shrink-0 cursor-pointer"
                                                title="Hapus baris nomor surat"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {errors.nomor_surat && !Array.isArray(errors.nomor_surat) && (
                                <p className="text-[11px] text-rose-500 font-medium">{(errors.nomor_surat as any).message}</p>
                            )}
                        </div>
                    </div>

                    {/* SECTION 2: Wilayah Administrasi & Lokasi */}
                    <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4 space-y-3 shadow-2xs">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/80">
                            <div className="h-6 w-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                                <MapPin className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-foreground">2. Wilayah & Lokasi Usulan</h4>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Kecamatan — Combobox */}
                            <div className="space-y-1.5">
                                <Label htmlFor="id_kecamatan" className="text-xs font-bold">Kecamatan <span className="text-rose-500">*</span></Label>
                                <Controller
                                    name="id_kecamatan"
                                    control={control}
                                    render={({ field }) => {
                                        const selected = kecamatanList.find(k => Number(k.id) === field.value);
                                        return (
                                            <Popover open={kecamatanOpen} onOpenChange={setKecamatanOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        id="id_kecamatan"
                                                        type="button"
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={kecamatanOpen}
                                                        className={cn(
                                                            "w-full justify-between font-normal h-9 text-xs rounded-xl bg-background",
                                                            !selected && "text-muted-foreground",
                                                            errors.id_kecamatan && "border-rose-500"
                                                        )}
                                                    >
                                                        <span className="truncate">
                                                            {selected ? selected.nama_kecamatan : "Pilih Kecamatan"}
                                                        </span>
                                                        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[240px] p-0" align="start">
                                                    <Command>
                                                        <CommandInput placeholder="Cari kecamatan..." />
                                                        <CommandList>
                                                            <CommandEmpty>Kecamatan tidak ditemukan.</CommandEmpty>
                                                            <CommandGroup>
                                                                {kecamatanList.map((k) => (
                                                                    <CommandItem
                                                                        key={k.id}
                                                                        value={k.nama_kecamatan}
                                                                        onSelect={() => {
                                                                            field.onChange(Number(k.id));
                                                                            setValue("id_desa", 0);
                                                                            setKecamatanOpen(false);
                                                                        }}
                                                                        className="text-xs cursor-pointer"
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-3.5 w-3.5 shrink-0",
                                                                                Number(k.id) === field.value ? "opacity-100 text-indigo-600" : "opacity-0"
                                                                            )}
                                                                        />
                                                                        {k.nama_kecamatan}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        );
                                    }}
                                />
                                {errors.id_kecamatan && (
                                    <p className="text-[11px] text-rose-500 font-medium">{errors.id_kecamatan.message}</p>
                                )}
                            </div>

                            {/* Desa / Kelurahan — Combobox */}
                            <div className="space-y-1.5">
                                <Label htmlFor="id_desa" className="text-xs font-bold">Desa / Kelurahan <span className="text-rose-500">*</span></Label>
                                <Controller
                                    name="id_desa"
                                    control={control}
                                    render={({ field }) => {
                                        const selected = desaList.find(d => Number(d.id) === field.value);
                                        const isDisabled = !selectedKecamatanId || selectedKecamatanId === 0;
                                        return (
                                            <Popover open={desaOpen} onOpenChange={setDesaOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        id="id_desa"
                                                        type="button"
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={desaOpen}
                                                        disabled={isDisabled}
                                                        className={cn(
                                                            "w-full justify-between font-normal h-9 text-xs rounded-xl bg-background",
                                                            !selected && "text-muted-foreground",
                                                            errors.id_desa && "border-rose-500"
                                                        )}
                                                    >
                                                        <span className="truncate">
                                                            {selected ? selected.nama_desa : (isDisabled ? "Pilih kecamatan dulu" : "Pilih Desa")}
                                                        </span>
                                                        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[240px] p-0" align="start">
                                                    <Command>
                                                        <CommandInput placeholder="Cari desa..." />
                                                        <CommandList>
                                                            <CommandEmpty>Desa tidak ditemukan.</CommandEmpty>
                                                            <CommandGroup>
                                                                {desaList.map((d) => (
                                                                    <CommandItem
                                                                        key={d.id}
                                                                        value={d.nama_desa}
                                                                        onSelect={() => {
                                                                            field.onChange(Number(d.id));
                                                                            setDesaOpen(false);
                                                                        }}
                                                                        className="text-xs cursor-pointer"
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-3.5 w-3.5 shrink-0",
                                                                                Number(d.id) === field.value ? "opacity-100 text-indigo-600" : "opacity-0"
                                                                            )}
                                                                        />
                                                                        {d.nama_desa}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        );
                                    }}
                                />
                                {errors.id_desa && (
                                    <p className="text-[11px] text-rose-500 font-medium">{errors.id_desa.message}</p>
                                )}
                            </div>
                        </div>

                        {/* Alamat Usulan */}
                        <div className="space-y-1.5">
                            <Label htmlFor="alamat_usulan" className="text-xs font-bold">Alamat Lengkap / Dusun <span className="text-rose-500">*</span></Label>
                            <Input
                                id="alamat_usulan"
                                placeholder="Contoh: Dusun Krajan RT 02 RW 01"
                                {...register("alamat_usulan")}
                                className={cn("h-9 text-xs rounded-xl bg-background", errors.alamat_usulan && "border-rose-500")}
                            />
                            {errors.alamat_usulan && (
                                <p className="text-[11px] text-rose-500 font-medium">{errors.alamat_usulan.message}</p>
                            )}
                        </div>
                    </div>

                    {/* SECTION 3: Kategori Usulan & Rincian Teknis */}
                    <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4 space-y-3 shadow-2xs">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/80">
                            <div className="h-6 w-6 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                                <Layers className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-foreground">3. Kategori & Rincian Teknis</h4>
                            </div>
                        </div>

                        {/* Kategori Pembangunan Usulan */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="id_kategori" className="text-xs font-bold">Kategori Usulan <span className="text-rose-500">*</span></Label>
                                {canCreateKategori && (
                                    <button
                                        type="button"
                                        onClick={() => setIsOpenKategoriDialog(true)}
                                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus className="h-3 w-3" /> Tambah Kategori
                                    </button>
                                )}
                            </div>
                            <Controller
                                name="id_kategori"
                                control={control}
                                render={({ field }) => {
                                    const selected = kategoriList.find(k => k.id === field.value);
                                    const selectedLabel = selected ? selected.nama : (watch("jenis_usulan") || "Pilih Kategori Usulan");
                                    return (
                                        <Popover open={kategoriOpen} onOpenChange={setKategoriOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    id="id_kategori"
                                                    type="button"
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={kategoriOpen}
                                                    className={cn(
                                                        "w-full justify-between font-normal text-xs h-9 rounded-xl bg-background",
                                                        !selected && !watch("jenis_usulan") && "text-muted-foreground",
                                                        errors.id_kategori && "border-rose-500"
                                                    )}
                                                >
                                                    <span className="truncate font-medium">
                                                        {selectedLabel}
                                                    </span>
                                                    <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] sm:w-[340px] p-0" align="start">
                                                <Command shouldFilter={false}>
                                                    <CommandInput
                                                        placeholder="Cari kategori usulan..."
                                                        value={kategoriSearch}
                                                        onValueChange={setKategoriSearch}
                                                    />
                                                    <CommandList className="max-h-56 custom-scrollbar">
                                                        {isFetchingKategori ? (
                                                            <div className="py-4 text-center text-xs text-muted-foreground">
                                                                Mencari kategori...
                                                            </div>
                                                        ) : kategoriList.length === 0 ? (
                                                            <CommandEmpty className="py-3 text-center text-xs">
                                                                <p className="text-muted-foreground mb-2">Kategori tidak ditemukan.</p>
                                                            </CommandEmpty>
                                                        ) : (
                                                            <CommandGroup>
                                                                {kategoriList.map((item) => {
                                                                    const opdKode = item.opd?.kode || opdList.find((o) => o.id === item.opd_id)?.kode;
                                                                    const opdNama = item.opd?.nama || opdList.find((o) => o.id === item.opd_id)?.nama;

                                                                    return (
                                                                        <CommandItem
                                                                            key={item.id}
                                                                            value={item.id}
                                                                            onSelect={() => {
                                                                                field.onChange(item.id);
                                                                                setValue("jenis_usulan", item.nama);
                                                                                setSelectedKategoriItem(item);
                                                                                setKategoriOpen(false);
                                                                            }}
                                                                            className="text-xs cursor-pointer py-2 px-2.5"
                                                                        >
                                                                            <Check
                                                                                className={cn(
                                                                                    "mr-2 h-3.5 w-3.5 shrink-0",
                                                                                    item.id === field.value ? "opacity-100 text-indigo-600" : "opacity-0"
                                                                                )}
                                                                            />
                                                                            <div className="flex flex-col min-w-0">
                                                                                <span className="font-semibold text-foreground truncate">{item.nama}</span>
                                                                                {(opdKode || opdNama) && (
                                                                                    <span className="text-[10px] font-mono text-muted-foreground truncate">
                                                                                        {opdKode ? `[${opdKode}]` : ""} {opdNama || ""}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </CommandItem>
                                                                    );
                                                                })}
                                                            </CommandGroup>
                                                        )}
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    );
                                }}
                            />
                            {errors.id_kategori && (
                                <p className="text-[11px] text-rose-500 font-medium">{errors.id_kategori.message}</p>
                            )}
                        </div>

                        {/* Uraian Usulan */}
                        <div className="space-y-1.5">
                            <Label htmlFor="uraian_usulan" className="text-xs font-bold">Uraian Detail Usulan <span className="text-rose-500">*</span></Label>
                            <Textarea
                                id="uraian_usulan"
                                placeholder="Jelaskan kebutuhan, spesifikasi, atau urgensi usulan pembangunan ini..."
                                rows={3}
                                {...register("uraian_usulan")}
                                className={cn("text-xs rounded-xl bg-background leading-relaxed", errors.uraian_usulan && "border-rose-500")}
                            />
                            {errors.uraian_usulan && (
                                <p className="text-[11px] text-rose-500 font-medium">{errors.uraian_usulan.message}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Volume */}
                            <div className="space-y-1.5">
                                <Label htmlFor="volume" className="text-xs font-bold">Volume / Target</Label>
                                <Input
                                    id="volume"
                                    placeholder="Contoh: 500 Meter / 2 Unit"
                                    {...register("volume")}
                                    className={cn("h-9 text-xs rounded-xl bg-background", errors.volume && "border-rose-500")}
                                />
                                {errors.volume && (
                                    <p className="text-[11px] text-rose-500 font-medium">{errors.volume.message}</p>
                                )}
                            </div>

                            {/* Anggaran Usulan */}
                            <div className="space-y-1.5">
                                <Label htmlFor="anggaran_usulan" className="text-xs font-bold">Estimasi Anggaran (Rp)</Label>
                                <Input
                                    id="anggaran_usulan"
                                    type="number"
                                    placeholder="Contoh: 150000000"
                                    {...register("anggaran_usulan", { valueAsNumber: true })}
                                    className={cn("h-9 text-xs rounded-xl bg-background font-mono", errors.anggaran_usulan && "border-rose-500")}
                                />
                                {errors.anggaran_usulan && (
                                    <p className="text-[11px] text-rose-500 font-medium">{errors.anggaran_usulan.message}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: Catatan & Dokumen Pendukung */}
                    <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4 space-y-3 shadow-2xs">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/80">
                            <div className="h-6 w-6 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                                <Building2 className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-foreground">4. Dokumen, Catatan & Status</h4>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Tahun Anggaran */}
                            <div className="space-y-1.5">
                                <Label htmlFor="tahun_anggaran" className="text-xs font-bold">Tahun Anggaran <span className="text-rose-500">*</span></Label>
                                <Input
                                    id="tahun_anggaran"
                                    type="number"
                                    {...register("tahun_anggaran", { valueAsNumber: true })}
                                    className={cn("h-9 text-xs rounded-xl bg-background font-mono", errors.tahun_anggaran && "border-rose-500")}
                                />
                                {errors.tahun_anggaran && (
                                    <p className="text-[11px] text-rose-500 font-medium">{errors.tahun_anggaran.message}</p>
                                )}
                            </div>

                            {/* Status */}
                            <div className="space-y-1.5">
                                <Label htmlFor="status" className="text-xs font-bold">Status Usulan</Label>
                                <Controller
                                    name="status"
                                    control={control}
                                    render={({ field }) => (
                                        <div className="relative">
                                            <select
                                                id="status"
                                                disabled={true}
                                                value={field.value || "pending"}
                                                onChange={(e) => field.onChange(e.target.value)}
                                                className="flex h-9 w-full rounded-xl border border-input bg-muted/30 px-3 pr-10 py-2 text-xs font-semibold shadow-2xs appearance-none outline-none disabled:cursor-not-allowed disabled:opacity-80"
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="verifikasi_bappeda">Verifikasi Bappeda</option>
                                                <option value="verifikasi_opd">Verifikasi OPD</option>
                                                <option value="selesai">Selesai</option>
                                                <option value="ditolak">Ditolak</option>
                                            </select>
                                            <ChevronsUpDown className="absolute right-3 top-2.5 h-4 w-4 shrink-0 opacity-50 pointer-events-none text-muted-foreground" />
                                        </div>
                                    )}
                                />
                            </div>
                        </div>

                        {/* URL Dokumen Usulan */}
                        <div className="space-y-1.5">
                            <Label htmlFor="url_dokumen_usulan" className="text-xs font-bold">URL Dokumen Usulan (PDF / Drive)</Label>
                            <Input
                                id="url_dokumen_usulan"
                                type="text"
                                placeholder="https://drive.google.com/..."
                                {...register("url_dokumen_usulan")}
                                className={cn("h-9 text-xs rounded-xl bg-background", errors.url_dokumen_usulan && "border-rose-500")}
                            />
                            {errors.url_dokumen_usulan && (
                                <p className="text-[11px] text-rose-500 font-medium">{errors.url_dokumen_usulan.message}</p>
                            )}
                        </div>

                        {/* Catatan Bappeda */}
                        <div className="space-y-1.5">
                            <Label htmlFor="catatan_bappeda" className="text-xs font-bold">Catatan Bappeda</Label>
                            <Textarea
                                id="catatan_bappeda"
                                placeholder="Catatan atau telaah teknis Bappeda..."
                                rows={2}
                                {...register("catatan_bappeda")}
                                className="text-xs rounded-xl bg-background"
                            />
                        </div>

                        {/* Catatan Bupati */}
                        <div className="space-y-1.5">
                            <Label htmlFor="catatan_bupati" className="text-xs font-bold">Catatan / Arahan Bupati</Label>
                            <Textarea
                                id="catatan_bupati"
                                placeholder="Disposisi atau arahan khusus Bupati..."
                                rows={2}
                                {...register("catatan_bupati")}
                                className="text-xs rounded-xl bg-background"
                            />
                        </div>
                    </div>
                </div>

                {/* Sticky Form Footer Actions */}
                <div className={cn(
                    "sticky bottom-0 bg-background/95 backdrop-blur-md border-t border-border py-3 z-20 flex gap-2",
                    compactMode ? "-mx-4 px-4 w-auto justify-stretch shadow-md" : "justify-end"
                )}>
                    {!disableButtons && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel || (() => navigate(initialData ? `/admin/usulan-desa/detail/${initialData.id}` : "/admin/usulan-desa/daftar-usulan"))}
                            disabled={isSubmitting}
                            className={cn("h-9 text-xs rounded-xl font-semibold cursor-pointer", compactMode && "flex-1")}
                        >
                            Batal
                        </Button>
                    )}
                    {disableButtons ? (
                        onRegisterNew ? (
                            <div className="flex gap-2 w-full">
                                <Button
                                    type="button"
                                    onClick={() => navigate(initialData ? `/admin/usulan-desa/detail/${initialData.id}` : "/admin/usulan-desa/daftar-usulan")}
                                    className="flex-1 h-9 text-xs rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold cursor-pointer"
                                >
                                    Selesai
                                </Button>
                                <Button
                                    type="button"
                                    onClick={onRegisterNew}
                                    className="flex-1 h-9 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                                >
                                    Daftar Usulan Baru
                                </Button>
                            </div>
                        ) : (
                            <Button
                                type="button"
                                onClick={() => navigate(initialData ? `/admin/usulan-desa/detail/${initialData.id}` : "/admin/usulan-desa/daftar-usulan")}
                                className={cn("h-9 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer", compactMode && "flex-1")}
                            >
                                Selesai
                            </Button>
                        )
                    ) : (
                        <Button 
                            type="submit" 
                            disabled={isSubmitting}
                            className={cn("h-9 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm cursor-pointer", compactMode && "flex-1")}
                        >
                            {isSubmitting ? "Menyimpan Data..." : (initialData ? "Simpan Perubahan" : "Simpan & Lanjut Pemetaan")}
                        </Button>
                    )}
                </div>
            </form>

        {/* Create Category Dialog */}
        <Dialog open={isOpenKategoriDialog} onOpenChange={setIsOpenKategoriDialog}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-sm font-semibold">Tambah Kategori Usulan Baru</DialogTitle>
                    <DialogDescription className="text-[11px]">
                        Daftarkan kategori baru secara langsung untuk usulan desa Anda.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="new-kategori-nama" className="text-xs">Nama Kategori</Label>
                        <Input
                            id="new-kategori-nama"
                            value={newKategoriNama}
                            onChange={(e) => setNewKategoriNama(e.target.value)}
                            placeholder="Contoh: Jembatan Gantung"
                            className="h-9 text-xs"
                            required
                            autoComplete="off"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="new-kategori-kode" className="text-xs">Kode Kategori (Unik)</Label>
                        <Input
                            id="new-kategori-kode"
                            value={newKategoriKode}
                            onChange={(e) => setNewKategoriKode(e.target.value)}
                            placeholder="Contoh: JEMBATAN_GANTUNG"
                            className="h-9 text-xs font-mono"
                            autoComplete="off"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="new-kategori-opd" className="text-xs">OPD Verifikator</Label>
                        <Select
                            value={newKategoriOpdId}
                            onValueChange={setNewKategoriOpdId}
                        >
                            <SelectTrigger id="new-kategori-opd" className="h-9 w-full text-xs">
                                <SelectValue placeholder="Pilih OPD Verifikator" />
                            </SelectTrigger>
                            <SelectContent>
                                {opdList.map((opd) => (
                                    <SelectItem key={opd.id} value={opd.id} className="text-xs">
                                        [{opd.kode}] {opd.nama}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="new-kategori-deskripsi" className="text-xs">Deskripsi</Label>
                        <Textarea
                            id="new-kategori-deskripsi"
                            value={newKategoriDeskripsi}
                            onChange={(e) => setNewKategoriDeskripsi(e.target.value)}
                            placeholder="Penjelasan mengenai cakupan usulan kategori..."
                            className="min-h-[80px] text-xs resize-none"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsOpenKategoriDialog(false)}
                        className="h-8 text-xs"
                        disabled={isCreatingKategori}
                    >
                        Batal
                    </Button>
                    <Button
                        type="button"
                        className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium"
                        disabled={isCreatingKategori}
                        onClick={handleCreateKategori}
                    >
                        {isCreatingKategori ? "Menyimpan..." : "Simpan"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}
