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
import { CalendarIcon, ChevronsUpDown, Check, Trash2, Plus } from "lucide-react";
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
            <form onSubmit={handleSubmit(onSubmit)} className={cn("space-y-6", compactMode ? "w-full flex-1 flex flex-col min-h-full" : "max-w-4xl")} autoComplete="off">
            <Card className={cn(
                "bg-white py-0 dark:bg-slate-950",
                compactMode ? "border-none shadow-none flex-1 flex flex-col" : "border dark:border-slate-800"
            )}>
                {!compactMode && (
                    <CardHeader>
                        <CardTitle>{initialData ? "Form Edit Usulan" : "Form Usulan Baru"}</CardTitle>
                    </CardHeader>
                )}
                <CardContent className={cn("space-y-4", compactMode ? "p-0 flex-1" : "")}>
                    <div className="grid gap-4">
                        {/* Nomor Agenda */}
                        <div className="space-y-2">
                            <Label htmlFor="nomor_agenda">Nomor Agenda</Label>
                            <Input
                                id="nomor_agenda"
                                placeholder="Contoh: 1234"
                                {...register("nomor_agenda")}
                                className={errors.nomor_agenda ? "border-rose-500" : ""}
                            />
                            {errors.nomor_agenda && (
                                <p className="text-xs text-rose-500">{errors.nomor_agenda.message}</p>
                            )}
                        </div>
                    </div>
                    <div className="grid gap-4">
                        {/* Nomor Surat (Multiple) */}
                        <div className="space-y-2">
                            <Label>Nomor Surat</Label>
                            <div className="space-y-2">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="flex items-center gap-2">
                                        <Input
                                            placeholder={`Contoh: 050/123/412.302/2026`}
                                            {...register(`nomor_surat.${index}.value` as const)}
                                            className={errors.nomor_surat?.[index]?.value ? "border-rose-500 flex-1" : "flex-1"}
                                        />
                                        {fields.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => remove(index)}
                                                className="h-9 w-9 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 shrink-0"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => append({ value: "" })}
                                className="mt-1.5 h-8 text-[11px] font-bold"
                            >
                                + Tambah Nomor Surat
                            </Button>
                            {errors.nomor_surat && !Array.isArray(errors.nomor_surat) && (
                                <p className="text-xs text-rose-500">{(errors.nomor_surat as any).message}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Tanggal Surat */}
                        <div className="space-y-2">
                            <Label htmlFor="tanggal_surat">Tanggal Surat</Label>
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
                                                        "w-full justify-start text-left font-normal gap-2",
                                                        !field.value && "text-slate-400",
                                                        errors.tanggal_surat && "border-rose-500"
                                                    )}
                                                >
                                                    <CalendarIcon className="h-4 w-4 text-slate-400 shrink-0" />
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
                                                            // Store as YYYY-MM-DD
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
                                <p className="text-xs text-rose-500">{errors.tanggal_surat.message}</p>
                            )}
                        </div>

                        {/* Kategori Pembangunan Usulan */}
                        <div className="space-y-2">
                            <Label htmlFor="id_kategori" className="text-xs font-semibold">Kategori</Label>
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
                                                        "w-full justify-between font-normal text-xs h-9",
                                                        !selected && !watch("jenis_usulan") && "text-slate-400",
                                                        errors.id_kategori && "border-rose-500"
                                                    )}
                                                >
                                                    <span className="truncate">
                                                        {selectedLabel}
                                                    </span>
                                                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[250px] sm:w-[280px] p-0" align="start">
                                                <Command shouldFilter={false}>
                                                    <CommandInput
                                                        placeholder="Cari kategori usulan..."
                                                        value={kategoriSearch}
                                                        onValueChange={setKategoriSearch}
                                                    />
                                                    <CommandList className="max-h-56">
                                                        {isFetchingKategori ? (
                                                            <div className="py-4 text-center text-xs text-slate-500">
                                                                Mencari kategori...
                                                            </div>
                                                        ) : kategoriList.length === 0 ? (
                                                            <CommandEmpty className="py-2 text-center text-xs">
                                                                <p className="text-slate-500 mb-2">Kategori tidak ditemukan.</p>
                                                                {canCreateKategori && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setKategoriOpen(false);
                                                                            setIsOpenKategoriDialog(true);
                                                                        }}
                                                                        className="h-7 w-full gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 justify-center"
                                                                    >
                                                                        <Plus className="w-3 h-3" />
                                                                        <span>Buat Kategori Baru</span>
                                                                    </Button>
                                                                )}
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
                                                                            className="text-xs cursor-pointer py-1.5"
                                                                        >
                                                                            <Check
                                                                                className={cn(
                                                                                    "mr-2 h-4 w-4 shrink-0",
                                                                                    item.id === field.value ? "opacity-100" : "opacity-0"
                                                                                )}
                                                                            />
                                                                            <div className="flex flex-col min-w-0">
                                                                                <span className="font-medium text-slate-900 dark:text-slate-100 truncate">{item.nama}</span>
                                                                                {(opdKode || opdNama) && (
                                                                                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 font-mono truncate">
                                                                                        {opdKode ? `[${opdKode}]` : ""} {opdNama || ""}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </CommandItem>
                                                                    );
                                                                })}
                                                            </CommandGroup>
                                                        )}
                                                        {canCreateKategori && (
                                                            <>
                                                                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                                                                <div className="p-1">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setKategoriOpen(false);
                                                                            setIsOpenKategoriDialog(true);
                                                                        }}
                                                                        className="h-8 w-full gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 justify-start px-2"
                                                                    >
                                                                        <Plus className="w-3.5 h-3.5" />
                                                                        <span>Buat Kategori Baru</span>
                                                                    </Button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    );
                                }}
                            />
                            {errors.id_kategori && (
                                <p className="text-xs text-rose-500">{errors.id_kategori.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Kecamatan — Searchable Combobox */}
                        <div className="space-y-2">
                            <Label htmlFor="id_kecamatan">Kecamatan</Label>
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
                                                        "w-full justify-between font-normal",
                                                        !selected && "text-slate-400",
                                                        errors.id_kecamatan && "border-rose-500"
                                                    )}
                                                >
                                                    <span className="truncate">
                                                        {selected ? selected.nama_kecamatan : "Pilih Kecamatan"}
                                                    </span>
                                                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[200px] p-0" align="start">
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
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4 shrink-0",
                                                                            Number(k.id) === field.value ? "opacity-100" : "opacity-0"
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
                                <p className="text-xs text-rose-500">{errors.id_kecamatan.message}</p>
                            )}
                        </div>

                        {/* Desa — Searchable Combobox */}
                        <div className="space-y-2">
                            <Label htmlFor="id_desa">Desa / Kelurahan</Label>
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
                                                        "w-full justify-between font-normal",
                                                        !selected && "text-slate-400",
                                                        errors.id_desa && "border-rose-500"
                                                    )}
                                                >
                                                    <span className="truncate">
                                                        {selected ? selected.nama_desa : "Pilih Desa"}
                                                    </span>
                                                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[200px] p-0" align="start">
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
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4 shrink-0",
                                                                            Number(d.id) === field.value ? "opacity-100" : "opacity-0"
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
                                <p className="text-xs text-rose-500">{errors.id_desa.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Uraian Usulan */}
                    <div className="space-y-2">
                        <Label htmlFor="uraian_usulan">Uraian Usulan</Label>
                        <Textarea
                            id="uraian_usulan"
                            placeholder="Jelaskan detail usulan disini..."
                            rows={4}
                            {...register("uraian_usulan")}
                            className={errors.uraian_usulan ? "border-rose-500" : ""}
                        />
                        {errors.uraian_usulan && (
                            <p className="text-xs text-rose-500">{errors.uraian_usulan.message}</p>
                        )}
                    </div>

                    {/* Alamat Usulan */}
                    <div className="space-y-2">
                        <Label htmlFor="alamat_usulan">Alamat Lengkap Usulan</Label>
                        <Input
                            id="alamat_usulan"
                            placeholder="Contoh: Dusun Utara RT 01 RW 02"
                            {...register("alamat_usulan")}
                            className={errors.alamat_usulan ? "border-rose-500" : ""}
                        />
                        {errors.alamat_usulan && (
                            <p className="text-xs text-rose-500">{errors.alamat_usulan.message}</p>
                        )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Tahun Anggaran */}
                        <div className="space-y-2">
                            <Label htmlFor="tahun_anggaran">Tahun Anggaran</Label>
                            <Input
                                id="tahun_anggaran"
                                type="number"
                                {...register("tahun_anggaran", { valueAsNumber: true })}
                                className={errors.tahun_anggaran ? "border-rose-500" : ""}
                            />
                            {errors.tahun_anggaran && (
                                <p className="text-xs text-rose-500">{errors.tahun_anggaran.message}</p>
                            )}
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <Label htmlFor="status">Status Usulan</Label>
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
                                            className={cn(
                                                "flex h-9 w-full rounded-md border border-input bg-slate-50 dark:bg-slate-900/50 px-3 pr-10 py-2 text-sm shadow-xs transition-colors appearance-none outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-80 dark:border-slate-800",
                                                errors.status && "border-rose-500"
                                            )}
                                        >
                                            <option value="pending" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">Pending</option>
                                            <option value="verifikasi_bappeda" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">Verifikasi Bappeda</option>
                                            <option value="verifikasi_opd" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">Verifikasi OPD</option>
                                            <option value="selesai" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">Selesai</option>
                                            <option value="ditolak" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">Ditolak</option>
                                        </select>
                                        <ChevronsUpDown className="absolute right-3 top-2.5 h-4 w-4 shrink-0 opacity-50 pointer-events-none text-muted-foreground" />
                                    </div>
                                )}
                            />
                            {errors.status && (
                                <p className="text-xs text-rose-500">{errors.status.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Volume */}
                        <div className="space-y-2">
                            <Label htmlFor="volume">Volume</Label>
                            <Input
                                id="volume"
                                placeholder="Contoh: 500 Meter / 3 Unit"
                                {...register("volume")}
                                className={errors.volume ? "border-rose-500" : ""}
                            />
                            {errors.volume && (
                                <p className="text-xs text-rose-500">{errors.volume.message}</p>
                            )}
                        </div>

                        {/* Anggaran Usulan */}
                        <div className="space-y-2">
                            <Label htmlFor="anggaran_usulan">Anggaran Usulan (Rp)</Label>
                            <Input
                                id="anggaran_usulan"
                                type="number"
                                placeholder="Contoh: 150000000"
                                {...register("anggaran_usulan", { valueAsNumber: true })}
                                className={errors.anggaran_usulan ? "border-rose-500" : ""}
                            />
                            {errors.anggaran_usulan && (
                                <p className="text-xs text-rose-500">{errors.anggaran_usulan.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-4">
                        {/* URL Dokumen Usulan */}
                        <div className="space-y-2">
                            <Label htmlFor="url_dokumen_usulan">URL Dokumen Usulan (PDF / Drive)</Label>
                            <Input
                                id="url_dokumen_usulan"
                                type="text"
                                placeholder="https://example.com/dokumen.pdf"
                                {...register("url_dokumen_usulan")}
                                className={errors.url_dokumen_usulan ? "border-rose-500" : ""}
                            />
                            {errors.url_dokumen_usulan && (
                                <p className="text-xs text-rose-500">{errors.url_dokumen_usulan.message}</p>
                            )}
                        </div>

                        {/* Catatan Bappeda */}
                        <div className="space-y-2">
                            <Label htmlFor="catatan_bappeda">Catatan Bappeda</Label>
                            <Textarea
                                id="catatan_bappeda"
                                placeholder="Catatan hasil verifikasi..."
                                rows={3}
                                {...register("catatan_bappeda")}
                            />
                        </div>

                        {/* Catatan Bupati */}
                        <div className="space-y-2">
                            <Label htmlFor="catatan_bupati">Catatan Bupati</Label>
                            <Textarea
                                id="catatan_bupati"
                                placeholder="Catatan khusus dari Bupati..."
                                rows={3}
                                {...register("catatan_bupati")}
                            />
                        </div>
                    </div>

                </CardContent>
                <CardFooter 
                    className={cn(
                        "flex gap-2", 
                        compactMode 
                            ? "sticky bottom-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t py-4 z-10 -mx-4 px-4 dark:border-slate-800 w-auto justify-stretch" 
                            : "justify-end border-t p-6 dark:border-slate-800 mt-6"
                    )}
                >
                    {!disableButtons && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel || (() => navigate(initialData ? `/admin/usulan-desa/detail/${initialData.id}` : "/admin/usulan-desa/daftar-usulan"))}
                            disabled={isSubmitting}
                            className={cn(compactMode && "flex-1")}
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
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-medium"
                                >
                                    Selesai
                                </Button>
                                <Button
                                    type="button"
                                    onClick={onRegisterNew}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                                >
                                    Daftar Usulan Baru
                                </Button>
                            </div>
                        ) : (
                            <Button
                                type="button"
                                onClick={() => navigate(initialData ? `/admin/usulan-desa/detail/${initialData.id}` : "/admin/usulan-desa/daftar-usulan")}
                                className={cn("bg-blue-600 hover:bg-blue-700 text-white font-medium", compactMode && "flex-1")}
                            >
                                Selesai
                            </Button>
                        )
                    ) : (
                        <Button 
                            type="submit" 
                            disabled={isSubmitting}
                            className={cn(compactMode && "flex-1")}
                        >
                            {isSubmitting ? "Menyimpan..." : "Simpan Usulan"}
                        </Button>
                    )}
                </CardFooter>
            </Card>
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
