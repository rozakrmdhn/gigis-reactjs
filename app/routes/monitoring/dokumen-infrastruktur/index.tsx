import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
    Printer,
    FileText,
    Plus,
    Search,
    RotateCw,
    Trash2,
    CheckCircle,
    Building2,
    Calendar,
    Eye,
    ChevronRight,
    Sparkles,
    MapPin,
    X,
    Layers,
    Table as TableIcon,
    Lock,
    MoreHorizontal,
    ChevronLeft,
    SlidersHorizontal,
    Filter,
    Check,
    Edit3,
    Download
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Combobox, type ComboboxOption } from "~/components/ui/combobox";
import { DatePicker } from "~/components/ui/date-picker";
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
} from "~/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "~/components/ui/dialog";
import { UsulanDesaPagination } from "~/features/usulan-desa/components/UsulanDesaPagination";
import { monitoringLaporanService } from "~/features/monitoring/services/monitoring_laporan.service";
import { monitoringService } from "~/features/monitoring/services/monitoring.service";
import { kecamatanService } from "~/services/kecamatan";
import { desaService } from "~/services/desa";
import { useAuth } from "~/contexts/auth-context";
import type { MetaFunction } from "react-router";

// OpenLayers imports for map attachment rendering
import OLMap from "ol/Map";
import View from "ol/View";
import Feature from "ol/Feature";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { Point, LineString } from "ol/geom";
import { fromLonLat } from "ol/proj";
import { Stroke, Style, Circle as CircleStyle, Fill } from "ol/style";
import "ol/ol.css";

export const meta: MetaFunction = () => {
    return [
        { title: "Dokumen Infrastruktur Desa - MELAROSA" },
        { name: "description", content: "Halaman pengarsipan dan cetak dokumen resmi Berita Acara realisasi infrastruktur desa" },
    ];
};

export default function DokumenInfrastrukturPage() {
    const { user } = useAuth();
    const currentUserName = React.useMemo(() => user?.nama || (user as any)?.nama_user || (user as any)?.name || (user as any)?.username || (user as any)?.email || "Operator Bappeda", [user]);

    const [laporanList, setLaporanList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeRowId, setActiveRowId] = useState<string | null>(null);
    const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

    const [kecamatanList, setKecamatanList] = useState<any[]>([]);
    const [desaList, setDesaList] = useState<any[]>([]);
    const [selectedKec, setSelectedKec] = useState<string>("all");
    const [selectedDesa, setSelectedDesa] = useState<string>("all");
    const [selectedTahun, setSelectedTahun] = useState<string>("Semua");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    const activeFilterCount = React.useMemo(() => {
        let count = 0;
        if (selectedKec && selectedKec !== "all") count++;
        if (selectedDesa && selectedDesa !== "all") count++;
        if (selectedTahun && selectedTahun !== "Semua") count++;
        if (selectedStatus && selectedStatus !== "all") count++;
        if (startDate) count++;
        if (endDate) count++;
        return count;
    }, [selectedKec, selectedDesa, selectedTahun, selectedStatus, startDate, endDate]);

    const kecamatanFilterOptions: ComboboxOption[] = React.useMemo(() => [
        { value: "all", label: "Semua Kecamatan" },
        ...kecamatanList.map(k => ({ value: k.id.toString(), label: k.nama_kecamatan }))
    ], [kecamatanList]);

    const desaFilterOptions: ComboboxOption[] = React.useMemo(() => [
        { value: "all", label: "Semua Desa" },
        ...desaList.map(d => ({ value: d.id.toString(), label: d.nama_desa }))
    ], [desaList]);

    const tahunFilterOptions: ComboboxOption[] = React.useMemo(() => [
        { value: "2026", label: "TA 2026" },
        { value: "2025", label: "TA 2025" },
        { value: "2024", label: "TA 2024" },
        { value: "2023", label: "TA 2023" },
        { value: "Semua", label: "Semua Tahun" },
    ], []);

    const statusFilterOptions: ComboboxOption[] = React.useMemo(() => [
        { value: "all", label: "Semua Status" },
        { value: "Submitted", label: "Submitted" },
        { value: "Final", label: "Final" }
    ], []);

    // Pagination State
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);

    // Detail Modal State
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedDetailLaporan, setSelectedDetailLaporan] = useState<any>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [mapElement, setMapElement] = useState<HTMLDivElement | null>(null);

    // OpenLayers detail map refs
    const mapDetailContainerRef = useRef<HTMLDivElement | null>(null);
    const detailMapRef = useRef<OLMap | null>(null);
    const detailSourceRef = useRef<VectorSource | null>(null);

    // Modal Create State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createDesa, setCreateDesa] = useState<string>("");
    const [createTahun, setCreateTahun] = useState<string>("2026");
    const [createNomorBa, setCreateNomorBa] = useState<string>("050/XXX/412.302/2026");
    const [createSumberDana, setCreateSumberDana] = useState<string>("BKK");
    const [createRencanaPanjang, setCreateRencanaPanjang] = useState<string>("0");
    const [createSubmitting, setCreateSubmitting] = useState(false);

    // Inline Edit Nomor Dokumen State
    const [editingBaId, setEditingBaId] = useState<string | null>(null);
    const [editingBaValue, setEditingBaValue] = useState<string>("");
    const [savingBa, setSavingBa] = useState(false);
    const [isSyncingTarget, setIsSyncingTarget] = useState(false);

    useEffect(() => {
        setCreateNomorBa(prev => {
            if (!prev || prev.startsWith("050/")) {
                const parts = prev.split("/");
                if (parts.length === 4) {
                    return `${parts[0]}/${parts[1]}/${parts[2]}/${createTahun}`;
                }
            }
            return `050/XXX/412.302/${createTahun}`;
        });
    }, [createTahun]);

    // Load kecamatan list on mount & set default for operator_kecamatan
    useEffect(() => {
        if (user?.role === 'operator_kecamatan' && (user as any)?.id_kecamatan) {
            setSelectedKec(String((user as any).id_kecamatan));
        }
    }, [user]);

    useEffect(() => {
        const fetchKec = async () => {
            try {
                const res = await kecamatanService.getKecamatan();
                if (Array.isArray(res)) {
                    setKecamatanList(res);
                } else if ((res as any)?.data && Array.isArray((res as any).data)) {
                    setKecamatanList((res as any).data);
                }
            } catch (err) {
                console.error("Error fetching kecamatan:", err);
            }
        };
        fetchKec();
    }, []);

    // Load desa when kecamatan changes
    useEffect(() => {
        if (!selectedKec || selectedKec === "all") {
            setDesaList([]);
            setSelectedDesa("all");
            return;
        }
        const fetchDesa = async () => {
            try {
                const res = await desaService.getDesa(selectedKec);
                if (Array.isArray(res)) {
                    setDesaList(res);
                } else if ((res as any)?.data && Array.isArray((res as any).data)) {
                    setDesaList((res as any).data);
                }
            } catch (err) {
                console.error("Error fetching desa:", err);
            }
        };
        fetchDesa();
    }, [selectedKec]);

    // Initialize OpenLayers Map inside Detail Modal
    useEffect(() => {
        const targetContainer = mapElement || mapDetailContainerRef.current;
        if (!isDetailOpen || !selectedDetailLaporan || !targetContainer) return;

        let isMounted = true;

        if (detailMapRef.current) {
            detailMapRef.current.setTarget(undefined);
            detailMapRef.current = null;
        }

        const vectorSource = new VectorSource();
        const otherSource = new VectorSource();
        const segmens = selectedDetailLaporan.SegmensFormatted || [];
        const segmenIds = new Set(segmens.map((s: any) => s.id?.toString()));
        const geojsonFormat = new GeoJSON();
        const features: Feature[] = [];

        segmens.forEach((s: any) => {
            let geomObj = s.geom;
            if (typeof geomObj === "string") {
                try {
                    geomObj = JSON.parse(geomObj);
                } catch (e) { }
            }

            if (geomObj && geomObj.type) {
                try {
                    const feat = geojsonFormat.readFeature({
                        type: "Feature",
                        geometry: geomObj,
                        properties: s
                    }, {
                        dataProjection: "EPSG:4326",
                        featureProjection: "EPSG:3857"
                    });
                    features.push(feat as Feature);
                } catch (e) {
                    console.error("Parse feature geom error:", e);
                }
            }
        });

        vectorSource.addFeatures(features);
        detailSourceRef.current = vectorSource;

        const baseLayer = new TileLayer({
            source: new XYZ({
                url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                crossOrigin: "anonymous",
                maxZoom: 19
            })
        });

        const vectorLayer = new VectorLayer({
            source: vectorSource,
            style: (feature) => {
                const props = feature.getProperties();
                const isPoros = !!(props.is_jalan_poros || props.check_melarosa);
                const geom = feature.getGeometry();

                const styles: Style[] = [
                    new Style({
                        stroke: new Stroke({
                            color: isPoros ? "#2563eb" : "#059669",
                            width: 5
                        })
                    })
                ];

                if (geom && geom.getType() === "LineString") {
                    const coords = (geom as LineString).getCoordinates();
                    if (coords.length > 0) {
                        styles.push(
                            // Start Point (Red)
                            new Style({
                                geometry: new Point(coords[0]),
                                image: new CircleStyle({
                                    radius: 5,
                                    fill: new Fill({ color: "#dc2626" }),
                                    stroke: new Stroke({ color: "#ffffff", width: 2 })
                                })
                            }),
                            // End Point (Blue)
                            new Style({
                                geometry: new Point(coords[coords.length - 1]),
                                image: new CircleStyle({
                                    radius: 5,
                                    fill: new Fill({ color: "#2563eb" }),
                                    stroke: new Stroke({ color: "#ffffff", width: 2 })
                                })
                            })
                        );
                    }
                }

                return styles;
            }
        });

        const otherLayer = new VectorLayer({
            source: otherSource,
            style: new Style({
                stroke: new Stroke({
                    color: "rgba(148, 163, 184, 0.35)", // slate-400 faded for other segments in village
                    width: 2.2,
                    lineDash: [4, 4]
                })
            })
        });

        const map = new OLMap({
            target: targetContainer,
            layers: [baseLayer, otherLayer, vectorLayer],
            view: new View({
                center: fromLonLat([111.88, -7.15]),
                zoom: 12
            }),
            controls: []
        });

        detailMapRef.current = map;

        const updateAndFit = () => {
            if (!isMounted || !detailMapRef.current) return;
            detailMapRef.current.updateSize();

            // Fit bounds ONLY based on the BA-bound segments (vectorSource)
            const extent = vectorSource.getExtent();
            if (extent && extent.some(v => isFinite(v)) && extent[0] !== Infinity && extent[0] !== -Infinity) {
                detailMapRef.current.getView().fit(extent, {
                    padding: [60, 60, 60, 60],
                    maxZoom: 17,
                    duration: 350
                });
            } else {
                // Fallback to otherSource if vectorSource is empty
                const otherExtent = otherSource.getExtent();
                if (otherExtent && otherExtent.some(v => isFinite(v)) && otherExtent[0] !== Infinity && otherExtent[0] !== -Infinity) {
                    detailMapRef.current.getView().fit(otherExtent, {
                        padding: [40, 40, 40, 40],
                        maxZoom: 16,
                        duration: 350
                    });
                }
            }
        };

        if (selectedDetailLaporan.id_desa) {
            monitoringService.getSegmenByDesaGeoJSON(selectedDetailLaporan.id_desa)
                .then(fc => {
                    if (!isMounted) return;
                    if (fc && fc.features) {
                        fc.features.forEach((f: any) => {
                            if (segmenIds.has(f.id?.toString())) return;
                            try {
                                const feat = geojsonFormat.readFeature(f, {
                                    dataProjection: "EPSG:4326",
                                    featureProjection: "EPSG:3857"
                                });
                                otherSource.addFeature(feat as Feature);
                            } catch (e) { }
                        });
                    }
                    updateAndFit();
                })
                .catch(err => {
                    console.error("Fallback fetch error:", err);
                    updateAndFit();
                });
        } else {
            updateAndFit();
        }

        return () => {
            isMounted = false;
            if (detailMapRef.current) {
                detailMapRef.current.setTarget(undefined);
                detailMapRef.current = null;
            }
        };
    }, [isDetailOpen, selectedDetailLaporan, mapElement]);

    const fetchLaporan = useCallback(async () => {
        setLoading(true);
        try {
            const res = await monitoringLaporanService.getLaporanList({
                id_desa: selectedDesa !== "all" ? selectedDesa : undefined,
                id_kecamatan: selectedKec !== "all" ? selectedKec : undefined,
                tahun_anggaran: selectedTahun !== "Semua" ? selectedTahun : undefined,
                status: selectedStatus !== "all" ? selectedStatus : undefined
            });
            if (res.status === "success" && Array.isArray(res.result)) {
                setLaporanList(res.result);
            } else {
                setLaporanList([]);
            }
        } catch (err) {
            console.error("Fetch laporan error:", err);
            toast.error("Gagal memuat daftar Berita Acara");
        } finally {
            setLoading(false);
        }
    }, [selectedDesa, selectedKec, selectedTahun, selectedStatus]);

    useEffect(() => {
        fetchLaporan();
    }, [fetchLaporan]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchLaporan();
    };

    const handleReset = () => {
        setSearchTerm("");
        if (user?.role !== 'operator_kecamatan') {
            setSelectedKec("all");
        }
        setSelectedDesa("all");
        setSelectedTahun("Semua");
        setSelectedStatus("all");
        setStartDate("");
        setEndDate("");
        setPage(1);
    };

    const handleOpenDetail = async (laporanId: string) => {
        setLoadingDetail(true);
        const toastId = toast.loading("Memuat detail dan peta Berita Acara...");
        try {
            const res = await monitoringLaporanService.getLaporanById(laporanId);
            if (res.status === "success" && res.result) {
                setSelectedDetailLaporan(res.result);
                setIsDetailOpen(true);
                toast.dismiss(toastId);
            } else {
                toast.error("Gagal memuat detail Berita Acara", { id: toastId });
            }
        } catch (err) {
            console.error("Open detail error:", err);
            toast.error("Gagal memuat detail Berita Acara", { id: toastId });
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleSyncTargetFisik = async () => {
        if (!selectedDetailLaporan?.id) return;
        setIsSyncingTarget(true);
        const toastId = toast.loading("Menyinkronkan target fisik dengan Plotting Anggaran...");
        try {
            const res = await monitoringLaporanService.syncTargetFisik(selectedDetailLaporan.id);
            if (res.status === "success" && res.result) {
                toast.success(res.message || "Target fisik berhasil disinkronkan!", { id: toastId });
                setSelectedDetailLaporan((prev: any) => ({
                    ...prev,
                    rencana_panjang: res.result.rencana_panjang,
                    PlottingAnggaran: res.result.PlottingAnggaran || prev?.PlottingAnggaran
                }));
                fetchLaporan();
            } else {
                toast.error("Gagal menyinkronkan target fisik", { id: toastId });
            }
        } catch (err) {
            console.error("Sync target error:", err);
            toast.error("Gagal menyinkronkan target fisik", { id: toastId });
        } finally {
            setIsSyncingTarget(false);
        }
    };

    const handleSaveNomorBa = async (laporanId: string) => {
        if (!editingBaValue.trim()) {
            toast.error("Nomor dokumen tidak boleh kosong");
            return;
        }
        setSavingBa(true);
        const toastId = toast.loading("Memperbarui Nomor Dokumen...");
        try {
            const res = await monitoringLaporanService.updateLaporan(laporanId, {
                nomor_ba: editingBaValue.trim()
            });
            if (res.status === "success" || res.result) {
                toast.success("Nomor Dokumen berhasil diperbarui!", { id: toastId });
                setEditingBaId(null);
                // Optimistic UI update + reload endpoint
                setLaporanList(prev => prev.map(item => item.id === laporanId ? { ...item, nomor_ba: editingBaValue.trim() } : item));
                await fetchLaporan();
            } else {
                toast.error("Gagal memperbarui Nomor Dokumen", { id: toastId });
            }
        } catch (err) {
            console.error("Update nomor_ba error:", err);
            toast.error("Gagal memperbarui Nomor Dokumen", { id: toastId });
        } finally {
            setSavingBa(false);
        }
    };

    const handleCreateLaporan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (user?.role === 'operator_kecamatan') {
            toast.error("Role Operator Kecamatan bertugas mengirimkan digitasi segmen ke Bappeda. Pembuatan dan Cetak Berita Acara hanya dapat dilakukan oleh Operator Bappeda setelah hasil digitasi diverifikasi.");
            return;
        }
        if (!createDesa) {
            toast.error("Silakan pilih Desa terlebih dahulu");
            return;
        }
        setCreateSubmitting(true);
        const toastId = toast.loading("Membuat Berita Acara...");
        try {
            const res = await monitoringLaporanService.createLaporan({
                id_desa: createDesa,
                tahun_anggaran: createTahun,
                sumber_dana: createSumberDana,
                rencana_panjang: createRencanaPanjang,
                nomor_ba: createNomorBa,
                status: "Final"
            });
            if (res.status === "success") {
                toast.success(`Berita Acara (${res.result?.nomor_ba || 'Resmi'}) berhasil dibuat!`, { id: toastId });
                setIsCreateOpen(false);
                await fetchLaporan();
            } else {
                toast.error("Gagal membuat Berita Acara", { id: toastId });
            }
        } catch (err: any) {
            console.error("Create BA error:", err);
            toast.error("Terjadi kesalahan saat membuat Berita Acara", { id: toastId });
        } finally {
            setCreateSubmitting(false);
        }
    };

    const handleDeleteLaporan = async (id: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus Berita Acara ini?")) return;
        const toastId = toast.loading("Menghapus Berita Acara...");
        try {
            await monitoringLaporanService.deleteLaporan(id);
            toast.success("Berita Acara berhasil dihapus", { id: toastId });
            setLaporanList(prev => prev.filter(item => item.id !== id));
            await fetchLaporan();
        } catch (err) {
            console.error("Delete error:", err);
            toast.error("Gagal menghapus Berita Acara", { id: toastId });
        }
    };

    const getDetailMapImage = (): Promise<string> => {
        return new Promise((resolve) => {
            if (!detailMapRef.current || !mapElement) {
                resolve("");
                return;
            }

            const exportCanvas = () => {
                try {
                    const size = detailMapRef.current!.getSize();
                    if (!size || size[0] === 0 || size[1] === 0) {
                        resolve("");
                        return;
                    }

                    const scaleFactor = 2;
                    const mapCanvas = document.createElement("canvas");
                    mapCanvas.width = size[0] * scaleFactor;
                    mapCanvas.height = size[1] * scaleFactor;
                    const mapContext = mapCanvas.getContext("2d");
                    if (!mapContext) {
                        resolve("");
                        return;
                    }

                    mapContext.fillStyle = "#ffffff";
                    mapContext.fillRect(0, 0, mapCanvas.width, mapCanvas.height);

                    const canvasList = mapElement.querySelectorAll(".ol-layer canvas");
                    let drewAny = false;
                    canvasList.forEach((canvasElement: any) => {
                        if (canvasElement.width > 0) {
                            try {
                                const opacity = canvasElement.parentNode.style.opacity;
                                mapContext.globalAlpha = opacity === "" ? 1 : Number(opacity);
                                const transform = canvasElement.style.transform;

                                mapContext.save();
                                if (transform) {
                                    const match = transform.match(/^matrix\(([^)]+)\)$/);
                                    if (match) {
                                        const matrix = match[1].split(",").map(Number);
                                        matrix[0] *= scaleFactor;
                                        matrix[1] *= scaleFactor;
                                        matrix[2] *= scaleFactor;
                                        matrix[3] *= scaleFactor;
                                        matrix[4] *= scaleFactor;
                                        matrix[5] *= scaleFactor;
                                        mapContext.setTransform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
                                    } else {
                                        mapContext.scale(scaleFactor, scaleFactor);
                                    }
                                } else {
                                    mapContext.scale(scaleFactor, scaleFactor);
                                }
                                mapContext.drawImage(canvasElement, 0, 0);
                                mapContext.restore();
                                drewAny = true;
                            } catch (e) {
                                console.warn("Canvas drawImage error (CORS or tainted canvas):", e);
                            }
                        }
                    });

                    mapContext.setTransform(1, 0, 0, 1, 0, 0);
                    const dataUrl = mapCanvas.toDataURL("image/png", 1.0);
                    resolve(dataUrl);
                } catch (err) {
                    console.error("Detail map export error:", err);
                    resolve("");
                }
            };

            detailMapRef.current.once("rendercomplete", exportCanvas);
            detailMapRef.current.renderSync();

            // Safety timeout in case rendercomplete event already fired or delayed
            setTimeout(() => {
                exportCanvas();
            }, 300);
        });
    };

    const handlePrintFromDetail = async () => {
        if (!selectedDetailLaporan) return;
        if (user?.role === 'operator_kecamatan') {
            toast.error("Role Operator Kecamatan bertugas mengirimkan digitasi segmen ke Bappeda. Cetak Berita Acara hanya dapat dilakukan oleh Operator Bappeda setelah hasil digitasi diverifikasi.");
            return;
        }
        const toastId = toast.loading("Mempersiapkan dokumen cetak & lampiran peta Berita Acara...");
        try {
            const mapImageSrc = await getDetailMapImage();
            const lap = selectedDetailLaporan;

            // Automatically transition status to Final upon printing Berita Acara
            if (lap?.id && (lap.status === 'Submitted' || lap.status === 'Draft' || !lap.status)) {
                try {
                    await monitoringLaporanService.updateLaporan(lap.id, { status: "Final" });
                    lap.status = "Final";
                    setLaporanList(prev => prev.map(item => item.id === lap.id ? { ...item, status: "Final" } : item));
                } catch (errUpdateStatus) {
                    console.warn("Failed to update status to Final on print:", errUpdateStatus);
                }
            }

            const segmens = lap.SegmensFormatted || [];
            const targetDesaName = lap.Desa?.nama_desa || "Desa";
            const targetKecName = lap.Kecamatan?.nama_kecamatan || "Kecamatan";
            const targetDesaPimpinan = lap.Desa?.nama_pimpinan || "";
            const targetDesaJabatan = lap.Desa?.nama_jabatan || `Kepala Desa ${targetDesaName}`;
            const targetDesaNip = lap.Desa?.nip || "";
            const targetKecPimpinan = lap.Kecamatan?.nama_pimpinan || "";
            const targetKecJabatan = lap.Kecamatan?.nama_jabatan || `Camat ${targetKecName}`;
            const targetKecNip = lap.Kecamatan?.nip || "";

            const indonesianDays = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
            const indonesianMonths = [
                "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                "Juli", "Agustus", "September", "Oktober", "November", "Desember"
            ];
            
            // Tanggal Pembuatan Berita Acara (created_at)
            const baDate = new Date(lap.created_at || new Date());
            const currentDayName = indonesianDays[baDate.getDay()];
            const currentDayNum = baDate.getDate();
            const currentMonthName = indonesianMonths[baDate.getMonth()];
            const currentYear = baDate.getFullYear();
            const formattedBaDate = baDate.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });

            // Tanggal Cetak Riil (Waktu Sekarang)
            const printDate = new Date();
            const formattedPrintDateOnly = printDate.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });
            const formattedPrintTimeOnly = printDate.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            const totalRealized = parseFloat(lap.realisasi_panjang || 0);
            const rencanaPanjang = parseFloat(lap.rencana_panjang || 0);

            const verifikatorName = (segmens.find((s: any) => s.verifikator && s.verifikator !== "Operator Bappeda")?.verifikator) || lap.verifikator || currentUserName;

            const rowsHtml = segmens.map((row: any, idx: number) => {
                const objectName = row.namobj || row.nama_jalan || row.nama_ruas || "Segmen Infrastruktur";
                const isSesuaiBasisData = !!(row.is_jalan_poros || row.check_melarosa) && row.kode_ruas && row.kode_ruas !== "0" && row.kode_ruas !== 0 && row.kode_ruas !== "-";
                const statusLabel = isSesuaiBasisData ? "Sesuai Basis Data" : "Diluar Basis Data";
                const kodeRuasLabel = isSesuaiBasisData ? row.kode_ruas : "-";
                const materialPerkerasan = row.jenis_perkerasan || row.perkerasan || (row.atribut && (row.atribut.jenis_perkerasan || row.atribut.perkerasan)) || "Beton Cor";

                return `
                <tr>
                    <td style="border: 1px solid black; padding: 6px; text-align: center;">${idx + 1}</td>
                    <td style="border: 1px solid black; padding: 6px; text-align: center;">${kodeRuasLabel}</td>
                    <td style="border: 1px solid black; padding: 6px; font-weight: bold;">${objectName}</td>
                    <td style="border: 1px solid black; padding: 6px; line-height: 1.4; font-family: monospace; font-size: 8px;">
                        <div>Awal: ${row.start_lat && row.start_lon ? parseFloat(row.start_lat).toFixed(6) + ', ' + parseFloat(row.start_lon).toFixed(6) : "-"}</div>
                        <div style="margin-top: 2px;">Akhir: ${row.end_lat && row.end_lon ? parseFloat(row.end_lat).toFixed(6) + ', ' + parseFloat(row.end_lon).toFixed(6) : "-"}</div>
                    </td>
                    <td style="border: 1px solid black; padding: 6px; text-align: center; font-size: 10px;">
                        ${statusLabel}
                    </td>
                    <td style="border: 1px solid black; padding: 6px; text-align: right;">${parseFloat(row.panjang_m || row.panjang || 0).toFixed(1)}</td>
                    <td style="border: 1px solid black; padding: 6px; text-align: center;">${row.lebar_m || row.lebar || "-"}</td>
                    <td style="border: 1px solid black; padding: 6px; text-align: center;">${materialPerkerasan}</td>
                    <td style="border: 1px solid black; padding: 6px; text-align: center; text-transform: capitalize;">${row.kondisi || "Baik"}</td>
                </tr>
            `;
            }).join("");

            toast.dismiss(toastId);

            const printWindow = window.open("", "_blank");
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                        <head>
                            <title>Berita Acara - ${lap.nomor_ba}</title>
                            <style>
                                body { font-family: 'Bookman Old Style', 'Bookman', 'URW Bookman L', 'Georgia', serif; padding: 40px; line-height: 1.6; font-size: 12px; color: black; }
                                table { font-size: 12px; }
                                .text-center { text-align: center; }
                                .font-bold { font-weight: bold; }
                                .font-extrabold { font-weight: 800; }
                                .uppercase { text-transform: uppercase; }
                                .mb-6 { margin-bottom: 24px; }
                                .mb-4 { margin-bottom: 16px; }
                                .mb-8 { margin-bottom: 32px; }
                                .mt-12 { margin-top: 48px; }
                                .mt-6 { margin-top: 24px; }
                                .space-y-1 > * + * { margin-top: 4px; }
                                .space-y-4 > * + * { margin-top: 16px; }
                                .space-y-16 > * + * { margin-top: 64px; }
                                .text-justify { text-align: justify; }
                                .indent-8 { text-indent: 32px; }
                                .w-full { width: 100%; }
                                .border-collapse { border-collapse: collapse; }
                                .bg-gray-100 { background-color: #f3f4f6; }
                                .bg-gray-50 { background-color: #f9fafb; }
                                .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
                                .text-gray-500 { color: #6b7280; }
                                .underline { text-decoration: underline; }
                                .print-footer {
                                    position: fixed;
                                    bottom: 0;
                                    left: 0;
                                    right: 0;
                                    font-size: 9px;
                                    color: #4b5563;
                                    border-top: 1px dashed #ccc;
                                    padding-top: 6px;
                                    background-color: white;
                                }
                                @media print {
                                    body { padding: 0; margin: 0 0 10mm 0; }
                                    @page {
                                        size: 210mm 330mm;
                                        margin: 15mm 15mm 20mm 15mm;
                                    }
                                }
                            </style>
                        </head>
                        <body>
                            <div class="text-center space-y-1 mb-6">
                                <h3 class="font-extrabold uppercase" style="margin: 0; font-size: 19px;">BERITA ACARA</h3>
                                <h3 class="font-extrabold uppercase" style="margin: 0 0 8px 0; font-size: 14px;">MONITORING DAN EVALUASI REALISASI INFRASTRUKTUR DESA</h3>
                                <p style="margin: 0; font-size: 14px;">Nomor: ${lap.nomor_ba || '-'}</p>
                            </div>

                            <p class="text-justify indent-8 mb-4" style="font-size: 14px;">
                                Pada hari ini ${currentDayName}, tanggal ${currentDayNum} bulan ${currentMonthName} tahun ${currentYear} dari Desa ${targetDesaName} Kecamatan ${targetKecName} telah dilaksanakan Evaluasi Realisasi Infrastruktur Jalan Poros Antar Desa oleh Badan Perencanaan Pembangunan Daerah Kabupaten Bojonegoro dengan pelaksanaan Tahun Anggaran ${lap.tahun_anggaran || '2026'} dengan mekanisme Sumber Dana ${lap.sumber_dana || 'BKK'} dengan rincian sebagai berikut:
                            </p>

                            <div class="mb-6">
                                <p class="mb-4" style="font-size: 14px;">Daftar rincian segmen infrastruktur jalan poros antar desa yang telah terealisasi dan terdigitasi:</p>
                                <table class="w-full border-collapse" style="border: 1px solid black; text-align: left;">
                                    <thead>
                                        <tr class="bg-gray-100 font-bold">
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 25px;">No</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 40px;">Kode</th>
                                            <th style="border: 1px solid black; padding: 6px; width: 140px;">Nama Objek / Ruas</th>
                                            <th style="border: 1px solid black; padding: 6px; width: 160px;">Koordinat<br>(Awal - Akhir)</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 70px;">Kategori Spasial</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: right; width: 60px;">Panjang (m)</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 40px;">Lebar (m)</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 50px;">Material / Perkerasan</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 50px;">Kondisi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${rowsHtml || `<tr><td colspan="9" style="border: 1px solid black; padding: 12px; text-align: center;">Tidak ada segmen terikat</td></tr>`}
                                    </tbody>
                                    <tfoot>
                                        ${rencanaPanjang > 0 ? `
                                        <tr class="bg-gray-50 font-bold">
                                            <td colspan="5" style="border: 1px solid black; padding: 6px; text-align: right;">Total Panjang Perencanaan:</td>
                                            <td style="border: 1px solid black; padding: 6px; text-align: right;">
                                                ${rencanaPanjang.toFixed(1)}
                                            </td>
                                            <td colspan="3" style="border: 1px solid black; padding: 6px; background-color: #f3f4f6;"></td>
                                        </tr>
                                        ` : ''}
                                        <tr class="bg-gray-50 font-bold">
                                            <td colspan="5" style="border: 1px solid black; padding: 6px; text-align: right;">Total Panjang Segmen Terdigitasi:</td>
                                            <td style="border: 1px solid black; padding: 6px; text-align: right;">
                                                ${totalRealized.toFixed(1)}
                                            </td>
                                            <td colspan="3" style="border: 1px solid black; padding: 6px; background-color: #f3f4f6;"></td>
                                        </tr>
                                        ${rencanaPanjang > 0 ? `
                                        <tr class="bg-gray-50 font-bold">
                                            <td colspan="5" style="border: 1px solid black; padding: 6px; text-align: right;">Persentase Realisasi:</td>
                                            <td style="border: 1px solid black; padding: 6px; text-align: right;">
                                                ${((totalRealized / rencanaPanjang) * 100).toFixed(1)}%
                                            </td>
                                            <td colspan="3" style="border: 1px solid black; padding: 6px; background-color: #f3f4f6;"></td>
                                        </tr>
                                        ` : ''}
                                    </tfoot>
                                </table>
                            </div>

                            <p class="text-justify indent-8" style="font-size: 14px;">
                                Demikian berita acara ini dibuat dengan sebenar-benarnya dan dapat dipergunakan sebagaimana mestinya.
                            </p>

                            <div class="grid mt-6" style="grid-template-columns: 1fr 1fr; gap: 24px;">

                            <!-- Baris 1 Kolom 1 -->
                            <div class="text-center">
                                <p style="margin: 0;">&nbsp;</p>
                                <p style="margin: 0;">&nbsp;</p>
                                <p class="font-bold" style="margin: 0; font-size: 14px;">
                                    ${targetDesaJabatan}
                                </p>
                                <p style="margin: 0 0 50px 0;">&nbsp;</p>
                                <p class="font-bold underline" style="margin: 0; font-size: 14px;">
                                    ${targetDesaPimpinan || '_________________________'}
                                </p>
                                ${targetDesaNip
                        ? `<p style="margin: 0; font-size: 12px; margin-top: 0px;">NIP. ${targetDesaNip}</p>`
                        : ''}
                            </div>

                            <!-- Baris 1 Kolom 2 -->
                            <div class="text-center">
                                <p style="margin: 0; font-size: 14px;">
                                    Bojonegoro, ${formattedBaDate}
                                </p>
                                <p style="margin: 0;">&nbsp;</p>
                                <p class="font-bold" style="margin: 0; font-size: 14px;">
                                    Verifikator BAPPEDA
                                </p>
                                <p style="margin: 0 0 50px 0;">&nbsp;</p>
                                <p class="font-bold underline" style="margin: 0; font-size: 14px;">
                                    ${verifikatorName}
                                </p>
                            </div>

                            <!-- Baris 2 -->
                            <div class="text-center" style="grid-column: 1 / span 2; margin-top: 0;">
                                <p style="margin: 0;">Mengetahui,</p>
                                <p class="font-bold" style="margin: 0; font-size: 14px;">
                                    ${targetKecJabatan}
                                </p>
                                <p style="margin: 0 0 50px 0;">&nbsp;</p>
                                <p class="font-bold underline" style="margin: 0; font-size: 14px;">
                                    ${targetKecPimpinan || '_________________________'}
                                </p>
                                ${targetKecNip
                        ? `<p style="margin: 0; font-size: 12px; margin-top: 0px;">NIP. ${targetKecNip}</p>`
                        : ''}
                            </div>

                            </div>

                            <div class="print-footer">
                                Dokumen ini dicetak oleh sistem pada tanggal: ${formattedPrintDateOnly} pukul ${formattedPrintTimeOnly} WIB
                            </div>

                             ${mapImageSrc ? `
                             <div style="page-break-before: always; text-align: center; padding-top: 10px; width: 100%;">
                                 <h3 class="font-bold uppercase" style="font-size: 14px; margin-bottom: 12px;">LAMPIRAN: PETA DIGITASI SEGMEN SPASIAL INFRASTRUKTUR JALAN POROS ANTAR DESA</h3>
                                 <div style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background-color: #ffffff; box-sizing: border-box; margin: 0 auto;">
                                     <img src="${mapImageSrc}" style="width: 100%; height: auto; display: block;" />
                                 </div>
                                 <p style="font-size: 10px; margin-top: 8px; color: #4b5563;">
                                     Peta Realisasi Infrastruktur Desa - Desa ${targetDesaName}, Kecamatan ${targetKecName} - Tahun Anggaran ${lap.tahun_anggaran || '2026'}
                                 </p>
                                <div style="margin-top: 14px; font-size: 12px; font-weight: bold; color: #0f172a; display: flex; justify-content: center; align-items: center; gap: 32px;">
                                    <span style="display: inline-flex; align-items: center; gap: 8px;">
                                        <svg width="40" height="12" style="vertical-align: middle;">
                                            <line x1="0" y1="6" x2="40" y2="6" stroke="#2563eb" stroke-width="6" stroke-linecap="round" />
                                        </svg>
                                        Sesuai Basis Data
                                    </span>
                                    <span style="display: inline-flex; align-items: center; gap: 8px;">
                                        <svg width="40" height="12" style="vertical-align: middle;">
                                            <line x1="0" y1="6" x2="40" y2="6" stroke="#059669" stroke-width="6" stroke-linecap="round" />
                                        </svg>
                                        Diluar Basis Data
                                    </span>
                                </div>
                                <div style="margin-top: 20px; border: 1px solid #cbd5e1; background-color: #f8fafc; border-radius: 6px; padding: 12px 16px; text-align: justify; font-size: 10px; line-height: 1.5; color: #1e293b;">
                                    <div style="font-weight: bold; font-size: 11px; margin-bottom: 8px; color: #0f172a; text-align: left;">Catatan / Himbauan</div>
                                    <p style="margin: 0 0 6px 0;">
                                        Visualisasi segmen pada aplikasi ini disusun berdasarkan proses digitasi di atas peta (desktop digitizing) menggunakan informasi titik koordinat yang diinput secara manual oleh desa. Data tersebut <strong>bukan</strong> merupakan hasil pengukuran lapangan menggunakan perangkat survei berpresisi tinggi seperti <strong>RTK GNSS</strong> atau <strong>GPS Geodetik</strong>.
                                    </p>
                                    <p style="margin: 0 0 6px 0;">
                                        Oleh karena itu, posisi, panjang, maupun bentuk segmen yang ditampilkan bersifat <strong>indikatif</strong> dan digunakan sebagai media dokumentasi, monitoring, serta pelaporan realisasi pembangunan. Perbedaan posisi atau bentuk segmen terhadap kondisi aktual di lapangan masih dapat terjadi dan bukan menjadi dasar penilaian teknis maupun pengukuran resmi.
                                    </p>
                                    <p style="margin: 0;">
                                        Apabila diperlukan data dengan tingkat akurasi tinggi untuk keperluan teknis, pengukuran, atau penetapan batas, maka harus dilakukan survei lapangan menggunakan metode dan peralatan survei geospasial yang memenuhi standar.
                                    </p>
                                </div>
                            </div>
                            ` : ""}

                            <script>
                                window.onload = function() {
                                    setTimeout(function() {
                                        window.print();
                                    }, 400);
                                };
                            </script>
                        </body>
                    </html>
                `);
                printWindow.document.close();
            }
        } catch (err) {
            console.error("Print BA error:", err);
            toast.error("Gagal mencetak dokumen Berita Acara", { id: toastId });
        }
    };

    const handleDownloadFromDetail = async () => {
        if (!selectedDetailLaporan) return;
        if (user?.role !== 'operator_kecamatan') return;
        const toastId = toast.loading("Mempersiapkan dokumen unduhan Berita Acara...");
        try {
            const mapImageSrc = await getDetailMapImage();
            const lap = selectedDetailLaporan;

            const segmens = lap.SegmensFormatted || [];
            const targetDesaName = lap.Desa?.nama_desa || "Desa";
            const targetKecName = lap.Kecamatan?.nama_kecamatan || "Kecamatan";
            const targetDesaPimpinan = lap.Desa?.nama_pimpinan || "";
            const targetDesaJabatan = lap.Desa?.nama_jabatan || `Kepala Desa ${targetDesaName}`;
            const targetDesaNip = lap.Desa?.nip || "";
            const targetKecPimpinan = lap.Kecamatan?.nama_pimpinan || "";
            const targetKecJabatan = lap.Kecamatan?.nama_jabatan || `Camat ${targetKecName}`;
            const targetKecNip = lap.Kecamatan?.nip || "";

            const indonesianDays = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
            const indonesianMonths = [
                "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                "Juli", "Agustus", "September", "Oktober", "November", "Desember"
            ];
            
            const baDate = new Date(lap.created_at || new Date());
            const currentDayName = indonesianDays[baDate.getDay()];
            const currentDayNum = baDate.getDate();
            const currentMonthName = indonesianMonths[baDate.getMonth()];
            const currentYear = baDate.getFullYear();
            const formattedBaDate = baDate.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });

            const printDate = new Date();
            const formattedPrintDateOnly = printDate.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });
            const formattedPrintTimeOnly = printDate.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            const totalRealized = parseFloat(lap.realisasi_panjang || 0);
            const rencanaPanjang = parseFloat(lap.rencana_panjang || 0);

            const verifikatorName = (segmens.find((s: any) => s.verifikator && s.verifikator !== "Operator Bappeda")?.verifikator) || lap.verifikator || currentUserName;

            const rowsHtml = segmens.map((row: any, idx: number) => {
                const objectName = row.namobj || row.nama_jalan || row.nama_ruas || "Segmen Infrastruktur";
                const isSesuaiBasisData = !!(row.is_jalan_poros || row.check_melarosa) && row.kode_ruas && row.kode_ruas !== "0" && row.kode_ruas !== 0 && row.kode_ruas !== "-";
                const statusLabel = isSesuaiBasisData ? "Sesuai Basis Data" : "Diluar Basis Data";
                const kodeRuasLabel = isSesuaiBasisData ? row.kode_ruas : "-";
                const materialPerkerasan = row.jenis_perkerasan || row.perkerasan || (row.atribut && (row.atribut.jenis_perkerasan || row.atribut.perkerasan)) || "Beton Cor";

                return `
                <tr>
                    <td style="border: 1px solid black; padding: 6px; text-align: center;">${idx + 1}</td>
                    <td style="border: 1px solid black; padding: 6px; text-align: center;">${kodeRuasLabel}</td>
                    <td style="border: 1px solid black; padding: 6px; font-weight: bold;">${objectName}</td>
                    <td style="border: 1px solid black; padding: 6px; line-height: 1.4; font-family: monospace; font-size: 8px;">
                        <div>Awal: ${row.start_lat && row.start_lon ? parseFloat(row.start_lat).toFixed(6) + ', ' + parseFloat(row.start_lon).toFixed(6) : "-"}</div>
                        <div style="margin-top: 2px;">Akhir: ${row.end_lat && row.end_lon ? parseFloat(row.end_lat).toFixed(6) + ', ' + parseFloat(row.end_lon).toFixed(6) : "-"}</div>
                    </td>
                    <td style="border: 1px solid black; padding: 6px; text-align: center; font-size: 10px;">
                        ${statusLabel}
                    </td>
                    <td style="border: 1px solid black; padding: 6px; text-align: right;">${parseFloat(row.panjang_m || row.panjang || 0).toFixed(1)}</td>
                    <td style="border: 1px solid black; padding: 6px; text-align: center;">${row.lebar_m || row.lebar || "-"}</td>
                    <td style="border: 1px solid black; padding: 6px; text-align: center;">${materialPerkerasan}</td>
                    <td style="border: 1px solid black; padding: 6px; text-align: center; text-transform: capitalize;">${row.kondisi || "Baik"}</td>
                </tr>
            `;
            }).join("");

            toast.dismiss(toastId);

            const printWindow = window.open("", "_blank");
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                        <head>
                            <title>Berita Acara - ${lap.nomor_ba}</title>
                            <style>
                                body { font-family: 'Bookman Old Style', 'Bookman', 'URW Bookman L', 'Georgia', serif; padding: 40px; line-height: 1.6; font-size: 12px; color: black; }
                                table { font-size: 12px; }
                                .text-center { text-align: center; }
                                .font-bold { font-weight: bold; }
                                .font-extrabold { font-weight: 800; }
                                .uppercase { text-transform: uppercase; }
                                .mb-6 { margin-bottom: 24px; }
                                .mb-4 { margin-bottom: 16px; }
                                .mb-8 { margin-bottom: 32px; }
                                .mt-12 { margin-top: 48px; }
                                .mt-6 { margin-top: 24px; }
                                .space-y-1 > * + * { margin-top: 4px; }
                                .space-y-4 > * + * { margin-top: 16px; }
                                .space-y-16 > * + * { margin-top: 64px; }
                                .text-justify { text-align: justify; }
                                .indent-8 { text-indent: 32px; }
                                .w-full { width: 100%; }
                                .border-collapse { border-collapse: collapse; }
                                .bg-gray-100 { background-color: #f3f4f6; }
                                .bg-gray-50 { background-color: #f9fafb; }
                                .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
                                .text-gray-500 { color: #6b7280; }
                                .underline { text-decoration: underline; }
                                .print-footer {
                                    position: fixed;
                                    bottom: 0;
                                    left: 0;
                                    right: 0;
                                    font-size: 9px;
                                    color: #4b5563;
                                    border-top: 1px dashed #ccc;
                                    padding-top: 6px;
                                    background-color: white;
                                }
                                @media print {
                                    body { padding: 0; margin: 0 0 10mm 0; }
                                    @page {
                                        size: 210mm 330mm;
                                        margin: 15mm 15mm 20mm 15mm;
                                    }
                                }
                            </style>
                        </head>
                        <body>
                            <div class="text-center space-y-1 mb-6">
                                <h3 class="font-extrabold uppercase" style="margin: 0; font-size: 19px;">BERITA ACARA</h3>
                                <h3 class="font-extrabold uppercase" style="margin: 0 0 8px 0; font-size: 14px;">MONITORING DAN EVALUASI REALISASI INFRASTRUKTUR DESA</h3>
                                <p style="margin: 0; font-size: 14px;">Nomor: ${lap.nomor_ba || '-'}</p>
                            </div>

                            <p class="text-justify indent-8 mb-4" style="font-size: 14px;">
                                Pada hari ini ${currentDayName}, tanggal ${currentDayNum} bulan ${currentMonthName} tahun ${currentYear} dari Desa ${targetDesaName} Kecamatan ${targetKecName} telah dilaksanakan Evaluasi Realisasi Infrastruktur Jalan Poros Antar Desa oleh Badan Perencanaan Pembangunan Daerah Kabupaten Bojonegoro dengan pelaksanaan Tahun Anggaran ${lap.tahun_anggaran || '2026'} dengan mekanisme Sumber Dana ${lap.sumber_dana || 'BKK'} dengan rincian sebagai berikut:
                            </p>

                            <div class="mb-6">
                                <p class="mb-4" style="font-size: 14px;">Daftar rincian segmen infrastruktur jalan poros antar desa yang telah terealisasi dan terdigitasi:</p>
                                <table class="w-full border-collapse" style="border: 1px solid black; text-align: left;">
                                    <thead>
                                        <tr class="bg-gray-100 font-bold">
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 25px;">No</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 40px;">Kode</th>
                                            <th style="border: 1px solid black; padding: 6px; width: 140px;">Nama Objek / Ruas</th>
                                            <th style="border: 1px solid black; padding: 6px; width: 160px;">Koordinat<br>(Awal - Akhir)</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 70px;">Kategori Spasial</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: right; width: 60px;">Panjang (m)</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 40px;">Lebar (m)</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 50px;">Material / Perkerasan</th>
                                            <th style="border: 1px solid black; padding: 6px; text-align: center; width: 50px;">Kondisi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${rowsHtml || `<tr><td colspan="9" style="border: 1px solid black; padding: 12px; text-align: center;">Tidak ada segmen terikat</td></tr>`}
                                    </tbody>
                                    <tfoot>
                                        ${rencanaPanjang > 0 ? `
                                        <tr class="bg-gray-50 font-bold">
                                            <td colspan="5" style="border: 1px solid black; padding: 6px; text-align: right;">Total Panjang Perencanaan:</td>
                                            <td style="border: 1px solid black; padding: 6px; text-align: right;">
                                                ${rencanaPanjang.toFixed(1)}
                                            </td>
                                            <td colspan="3" style="border: 1px solid black; padding: 6px; background-color: #f3f4f6;"></td>
                                        </tr>
                                        ` : ''}
                                        <tr class="bg-gray-50 font-bold">
                                            <td colspan="5" style="border: 1px solid black; padding: 6px; text-align: right;">Total Panjang Segmen Terdigitasi:</td>
                                            <td style="border: 1px solid black; padding: 6px; text-align: right;">
                                                ${totalRealized.toFixed(1)}
                                            </td>
                                            <td colspan="3" style="border: 1px solid black; padding: 6px; background-color: #f3f4f6;"></td>
                                        </tr>
                                        ${rencanaPanjang > 0 ? `
                                        <tr class="bg-gray-50 font-bold">
                                            <td colspan="5" style="border: 1px solid black; padding: 6px; text-align: right;">Persentase Realisasi:</td>
                                            <td style="border: 1px solid black; padding: 6px; text-align: right;">
                                                ${((totalRealized / rencanaPanjang) * 100).toFixed(1)}%
                                            </td>
                                            <td colspan="3" style="border: 1px solid black; padding: 6px; background-color: #f3f4f6;"></td>
                                        </tr>
                                        ` : ''}
                                    </tfoot>
                                </table>
                            </div>

                            <p class="text-justify indent-8" style="font-size: 14px;">
                                Demikian berita acara ini dibuat dengan sebenar-benarnya dan dapat dipergunakan sebagaimana mestinya.
                            </p>

                            <div class="grid mt-6" style="grid-template-columns: 1fr 1fr; gap: 24px;">

                            <!-- Baris 1 Kolom 1 -->
                            <div class="text-center">
                                <p style="margin: 0;">&nbsp;</p>
                                <p style="margin: 0;">&nbsp;</p>
                                <p class="font-bold" style="margin: 0; font-size: 14px;">
                                    ${targetDesaJabatan}
                                </p>
                                <p style="margin: 0 0 50px 0;">&nbsp;</p>
                                <p class="font-bold underline" style="margin: 0; font-size: 14px;">
                                    ${targetDesaPimpinan || '_________________________'}
                                </p>
                                ${targetDesaNip
                                    ? `<p style="margin: 0; font-size: 12px; margin-top: 0px;">NIP. ${targetDesaNip}</p>`
                                    : ''}
                            </div>

                            <!-- Baris 1 Kolom 2 -->
                            <div class="text-center">
                                <p style="margin: 0; font-size: 14px;">
                                    Bojonegoro, ${formattedBaDate}
                                </p>
                                <p style="margin: 0;">&nbsp;</p>
                                <p class="font-bold" style="margin: 0; font-size: 14px;">
                                    Verifikator BAPPEDA
                                </p>
                                <p style="margin: 0 0 50px 0;">&nbsp;</p>
                                <p class="font-bold underline" style="margin: 0; font-size: 14px;">
                                    ${verifikatorName}
                                </p>
                            </div>

                            <!-- Baris 2 -->
                            <div class="text-center" style="grid-column: 1 / span 2; margin-top: 0;">
                                <p style="margin: 0;">Mengetahui,</p>
                                <p class="font-bold" style="margin: 0; font-size: 14px;">
                                    ${targetKecJabatan}
                                </p>
                                <p style="margin: 0 0 50px 0;">&nbsp;</p>
                                <p class="font-bold underline" style="margin: 0; font-size: 14px;">
                                    ${targetKecPimpinan || '_________________________'}
                                </p>
                                ${targetKecNip
                                    ? `<p style="margin: 0; font-size: 12px; margin-top: 0px;">NIP. ${targetKecNip}</p>`
                                    : ''}
                            </div>

                            </div>

                            <div class="print-footer">
                                Dokumen ini dicetak oleh sistem pada tanggal: ${formattedPrintDateOnly} pukul ${formattedPrintTimeOnly} WIB
                            </div>

                             ${mapImageSrc ? `
                             <div style="page-break-before: always; text-align: center; padding-top: 10px; width: 100%;">
                                 <h3 class="font-bold uppercase" style="font-size: 14px; margin-bottom: 12px;">LAMPIRAN: PETA DIGITASI SEGMEN SPASIAL INFRASTRUKTUR JALAN POROS ANTAR DESA</h3>
                                 <div style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background-color: #ffffff; box-sizing: border-box; margin: 0 auto;">
                                     <img src="${mapImageSrc}" style="width: 100%; height: auto; display: block;" />
                                 </div>
                                 <p style="font-size: 10px; margin-top: 8px; color: #4b5563;">
                                     Peta Realisasi Infrastruktur Desa - Desa ${targetDesaName}, Kecamatan ${targetKecName} - Tahun Anggaran ${lap.tahun_anggaran || '2026'}
                                 </p>
                                <div style="margin-top: 14px; font-size: 12px; font-weight: bold; color: #0f172a; display: flex; justify-content: center; align-items: center; gap: 32px;">
                                    <span style="display: inline-flex; align-items: center; gap: 8px;">
                                        <svg width="40" height="12" style="vertical-align: middle;">
                                            <line x1="0" y1="6" x2="40" y2="6" stroke="#2563eb" stroke-width="6" stroke-linecap="round" />
                                        </svg>
                                        Sesuai Basis Data
                                    </span>
                                    <span style="display: inline-flex; align-items: center; gap: 8px;">
                                        <svg width="40" height="12" style="vertical-align: middle;">
                                            <line x1="0" y1="6" x2="40" y2="6" stroke="#059669" stroke-width="6" stroke-linecap="round" />
                                        </svg>
                                        Diluar Basis Data
                                    </span>
                                </div>
                                <div style="margin-top: 20px; border: 1px solid #cbd5e1; background-color: #f8fafc; border-radius: 6px; padding: 12px 16px; text-align: justify; font-size: 10px; line-height: 1.5; color: #1e293b;">
                                    <div style="font-weight: bold; font-size: 11px; margin-bottom: 8px; color: #0f172a; text-align: left;">Catatan / Himbauan</div>
                                    <p style="margin: 0 0 6px 0;">
                                        Visualisasi segmen pada aplikasi ini disusun berdasarkan proses digitasi di atas peta (desktop digitizing) menggunakan informasi titik koordinat yang diinput secara manual oleh desa. Data tersebut <strong>bukan</strong> merupakan hasil pengukuran lapangan menggunakan perangkat survei berpresisi tinggi seperti <strong>RTK GNSS</strong> atau <strong>GPS Geodetik</strong>.
                                    </p>
                                    <p style="margin: 0 0 6px 0;">
                                        Oleh karena itu, posisi, panjang, maupun bentuk segmen yang ditampilkan bersifat <strong>indikatif</strong> dan digunakan sebagai media dokumentasi, monitoring, serta pelaporan realisasi pembangunan. Perbedaan posisi atau bentuk segmen terhadap kondisi aktual di lapangan masih dapat terjadi dan bukan menjadi dasar penilaian teknis maupun pengukuran resmi.
                                    </p>
                                    <p style="margin: 0;">
                                        Apabila diperlukan data dengan tingkat akurasi tinggi untuk keperluan teknis, pengukuran, atau penetapan batas, maka harus dilakukan survei lapangan menggunakan metode dan peralatan survei geospasial yang memenuhi standar.
                                    </p>
                                </div>
                             </div>
                             ` : ""}

                            <script>
                                window.onload = function() {
                                    setTimeout(function() {
                                        window.print();
                                    }, 400);
                                };
                            </script>
                        </body>
                    </html>
                `);
                printWindow.document.close();
            }
            toast.dismiss(toastId);
            toast.success("Dokumen Berita Acara siap diunduh!");
        } catch (err) {
            console.error("Print BA error:", err);
            toast.error("Gagal mengunduh dokumen Berita Acara", { id: toastId });
        }
    };

    const filteredList = laporanList.filter(lap => {
        const q = searchTerm.toLowerCase();
        const matchQuery = (
            (lap.nomor_ba && lap.nomor_ba.toLowerCase().includes(q)) ||
            (lap.Desa?.nama_desa && lap.Desa.nama_desa.toLowerCase().includes(q)) ||
            (lap.Kecamatan?.nama_kecamatan && lap.Kecamatan.nama_kecamatan.toLowerCase().includes(q))
        );

        let matchDate = true;
        if (startDate || endDate) {
            if (!lap.created_at) {
                matchDate = false;
            } else {
                const itemDate = new Date(lap.created_at).getTime();
                if (startDate) {
                    const startMs = new Date(startDate).setHours(0, 0, 0, 0);
                    if (itemDate < startMs) matchDate = false;
                }
                if (endDate) {
                    const endMs = new Date(endDate).setHours(23, 59, 59, 999);
                    if (itemDate > endMs) matchDate = false;
                }
            }
        }

        return matchQuery && matchDate;
    });

    const totalItems = filteredList.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const paginatedList = filteredList.slice((page - 1) * limit, page * limit);

    return (
        <div className="absolute inset-0 flex flex-col gap-4 p-4 bg-background dark:bg-slate-950 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 shrink-0 pb-1 border-b border-slate-100 dark:border-slate-800/50">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Dokumen Infrastruktur Desa</h1>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">Kelola dokumen resmi Berita Acara realisasi infrastruktur desa per Tahun Anggaran.</p>
                </div>
                {user?.role !== 'operator_kecamatan' && (
                    <Button onClick={() => setIsCreateOpen(true)} className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shrink-0">
                        <Plus className="h-4 w-4" />
                        <span>Buat Berita Acara Baru</span>
                    </Button>
                )}
            </div>

            {user?.role === 'operator_kecamatan' && (
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl text-xs text-indigo-800 dark:text-indigo-300 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-base">ℹ️</span>
                        <span>
                            <strong>Mode Lihat dan Unduh:</strong> Anda dapat melihat dan mengunduh dokumen <strong>Berita Acara</strong> yang tersedia di kecamatan Anda. Pembuatan, perubahan status, dan penghapusan hanya dapat dilakukan oleh <strong>Operator Bappeda</strong>.
                        </span>
                    </div>
                </div>
            )}

            {/* Card Table Area with Toolbar */}
            <div className="flex-1 min-h-0 flex flex-col">
                <Card className="gap-0 py-0 overflow-hidden border dark:border-slate-800 bg-white dark:bg-slate-950 relative flex flex-col flex-1 min-h-0">
                    {/* Sleek Toolbar matching UsulanDesaTable */}
                    <div className="p-4 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-slate-50/30 dark:bg-slate-900/10">
                        {/* Search Input on Left */}
                        <div className="relative w-full max-w-xs sm:max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari Nomor Dokumen / Desa..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setPage(1);
                                }}
                                className="pl-9 h-9 w-full text-xs"
                                autoComplete="off"
                            />
                        </div>

                        {/* Filter Popover & Action Controls on Right */}
                        <div className="flex items-center gap-2 shrink-0">
                            <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            "h-9 text-xs font-semibold gap-2 dark:border-slate-800",
                                            activeFilterCount > 0 && "border-blue-500 text-blue-600 bg-blue-50/50 dark:bg-blue-950/40"
                                        )}
                                    >
                                        <SlidersHorizontal className="h-3.5 w-3.5" />
                                        <span>Filter</span>
                                        {activeFilterCount > 0 && (
                                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-blue-600 text-white rounded-full">
                                                {activeFilterCount}
                                            </Badge>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-80 p-4 space-y-4 shadow-xl border dark:border-slate-800">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                                            <Filter className="h-3.5 w-3.5 text-blue-600" />
                                            <span>Filter Dokumen Infrastruktur</span>
                                        </div>
                                        {activeFilterCount > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleReset}
                                                className="h-6 text-[10px] text-muted-foreground hover:text-foreground px-1"
                                            >
                                                Reset
                                            </Button>
                                        )}
                                    </div>

                                    <div className="space-y-3 text-xs">
                                        {/* Kecamatan Filter — Full Width Combobox */}
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Kecamatan</Label>
                                            <Combobox
                                                options={kecamatanFilterOptions}
                                                value={selectedKec}
                                                onChange={(value) => { setSelectedKec(value); setPage(1); }}
                                                placeholder="Semua Kecamatan"
                                                searchPlaceholder="Cari kecamatan..."
                                                disabled={user?.role === 'operator_kecamatan'}
                                                className="w-full"
                                            />
                                        </div>

                                        {/* Desa Filter — Full Width Combobox */}
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Desa</Label>
                                            <Combobox
                                                options={desaFilterOptions}
                                                value={selectedDesa}
                                                onChange={(value) => { setSelectedDesa(value); setPage(1); }}
                                                placeholder="Semua Desa"
                                                searchPlaceholder="Cari desa..."
                                                disabled={!selectedKec || selectedKec === "all"}
                                                className="w-full"
                                            />
                                        </div>

                                        {/* Tahun Filter — Full Width Combobox */}
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Tahun Anggaran</Label>
                                            <Combobox
                                                options={tahunFilterOptions}
                                                value={selectedTahun}
                                                onChange={(value) => { setSelectedTahun(value); setPage(1); }}
                                                placeholder="Semua Tahun"
                                                searchPlaceholder="Cari tahun..."
                                                className="w-full"
                                            />
                                        </div>

                                        {/* Status Filter — Full Width Combobox */}
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Status Dokumen</Label>
                                            <Combobox
                                                options={statusFilterOptions}
                                                value={selectedStatus}
                                                onChange={(value) => { setSelectedStatus(value); setPage(1); }}
                                                placeholder="Semua Status"
                                                searchPlaceholder="Cari status..."
                                                className="w-full"
                                            />
                                        </div>

                                        {/* Filter Tanggal Dibuat — Shadcn UI DatePicker */}
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Rentang Tanggal Dibuat</Label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <span className="text-[10px] text-muted-foreground block mb-0.5">Dari Tanggal</span>
                                                    <DatePicker
                                                        value={startDate}
                                                        onChange={(val) => { setStartDate(val); setPage(1); }}
                                                        placeholder="Dari tanggal"
                                                    />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-muted-foreground block mb-0.5">Sampai Tanggal</span>
                                                    <DatePicker
                                                        value={endDate}
                                                        onChange={(val) => { setEndDate(val); setPage(1); }}
                                                        placeholder="Sampai tanggal"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t flex gap-2">
                                        <Button
                                            onClick={() => {
                                                setPage(1);
                                                fetchLaporan();
                                                setIsFilterPopoverOpen(false);
                                            }}
                                            size="sm"
                                            className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                        >
                                            Terapkan Filter
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {(activeFilterCount > 0 || searchTerm) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleReset}
                                    className="h-9 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    Reset
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 dark:border-slate-800"
                                onClick={fetchLaporan}
                                disabled={loading}
                            >
                                <RotateCw className={cn("h-4 w-4", loading && "animate-spin")} />
                            </Button>
                        </div>
                    </div>

                    {/* Table Area matching bataswilayah-desa & ploting-anggaran */}
                    <CardContent className="p-0 overflow-auto custom-scrollbar flex-1 min-h-0 [&_[data-slot=table-container]]:overflow-visible">
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-20 border-b border-border shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
                                <TableRow>
                                    <TableHead className="text-center font-semibold sticky top-0 left-0 z-30 bg-slate-50 dark:bg-slate-900 border-r shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] w-[110px] min-w-[110px] md:w-[110px] md:min-w-[110px]">Aksi</TableHead>
                                    <TableHead className="w-12 text-center font-semibold">No</TableHead>
                                    <TableHead className="font-semibold">Nomor Dokumen</TableHead>
                                    <TableHead className="font-semibold">Desa / Kecamatan</TableHead>
                                    <TableHead className="text-center font-semibold">Tahun</TableHead>
                                    <TableHead className="text-center font-semibold">Sumber Dana</TableHead>
                                    <TableHead className="text-right font-semibold">Realisasi (m)</TableHead>
                                    <TableHead className="text-center font-semibold">Status</TableHead>
                                    <TableHead className="text-center font-semibold">Tanggal Dibuat</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24">
                                            <div className="p-4 space-y-4">
                                                <Skeleton className="h-10 w-full" />
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <Skeleton key={i} className="h-12 w-full" />
                                                ))}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-32 text-center text-muted-foreground text-xs">
                                            Belum ada dokumen Berita Acara tersimpan.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedList.map((lap, idx) => (
                                        <TableRow key={lap.id} className="group transition-colors">
                                            {/* Action Column matching UsulanDesaTable pattern */}
                                            <TableCell className="w-[110px] min-w-[110px] md:w-[110px] md:min-w-[110px] p-0 relative sticky left-0 bg-white dark:bg-slate-950 group-hover:bg-slate-50 dark:group-hover:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] z-10 transition-colors">
                                                {/* Desktop Actions Layout */}
                                                <div className="hidden md:flex flex-row items-center justify-center gap-1.5 h-12 w-full px-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 border-slate-200 dark:border-slate-800 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 shrink-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenDetail(lap.id);
                                                        }}
                                                        title="Detail & Peta"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </Button>
                                                    {user?.role !== 'operator_kecamatan' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 w-7 p-0 border-slate-200 dark:border-slate-800 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteLaporan(lap.id);
                                                            }}
                                                            title="Hapus BA"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </div>

                                                {/* Mobile Trigger Menu */}
                                                <div className="flex md:hidden items-center justify-center h-12 w-full">
                                                    <Button
                                                        variant="ghost"
                                                        onClick={(e) => { e.stopPropagation(); setActiveRowId(lap.id); }}
                                                        className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                                    </Button>
                                                </div>

                                                {/* Mobile Sliding Actions Panel */}
                                                <div className={cn(
                                                    "md:hidden absolute top-0 bottom-0 left-0 z-20 flex items-center justify-center gap-1.5 bg-blue-50/95 dark:bg-blue-950/95 backdrop-blur-xs transition-all duration-300 ease-in-out px-2 border-r border-slate-200 dark:border-slate-800 rounded-r-xl w-[120px]",
                                                    activeRowId === lap.id ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0 pointer-events-none"
                                                )}>
                                                    <Button
                                                        variant="ghost" size="sm"
                                                        className="h-7 w-7 p-0 hover:bg-slate-200 text-slate-500 rounded-md shrink-0"
                                                        onClick={(e) => { e.stopPropagation(); setActiveRowId(null); }}
                                                    >
                                                        <ChevronLeft className="h-4 w-4" />
                                                    </Button>
                                                    <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-0.5 shrink-0" />
                                                    <Button
                                                        variant="outline" size="sm"
                                                        className="h-7 w-7 p-0 border-slate-200 text-blue-600 hover:text-blue-700 hover:bg-blue-50 shrink-0"
                                                        onClick={(e) => { e.stopPropagation(); handleOpenDetail(lap.id); setActiveRowId(null); }}
                                                        title="Detail & Peta"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </Button>
                                                    {user?.role !== 'operator_kecamatan' && (
                                                        <Button
                                                            variant="outline" size="sm"
                                                            className="h-7 w-7 p-0 border-slate-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteLaporan(lap.id); setActiveRowId(null); }}
                                                            title="Hapus BA"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>

                                            <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                {(page - 1) * limit + idx + 1}
                                            </TableCell>
                                            <TableCell className="font-bold text-xs text-foreground font-mono">
                                                {editingBaId === lap.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <Input
                                                            value={editingBaValue}
                                                            onChange={(e) => setEditingBaValue(e.target.value)}
                                                            className="h-7 text-xs font-mono w-48 bg-background border-blue-500"
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") handleSaveNomorBa(lap.id);
                                                                if (e.key === "Escape") setEditingBaId(null);
                                                            }}
                                                        />
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleSaveNomorBa(lap.id)}
                                                            disabled={savingBa}
                                                            className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 shrink-0"
                                                            title="Simpan Nomor Dokumen"
                                                        >
                                                            <Check className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setEditingBaId(null)}
                                                            className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                                                            title="Batal"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className={cn("flex items-center gap-1.5 group/ba", user?.role !== 'operator_kecamatan' && "cursor-pointer")}
                                                        onClick={() => {
                                                            if (user?.role === 'operator_kecamatan') return;
                                                            setEditingBaId(lap.id);
                                                            setEditingBaValue(lap.nomor_ba || "");
                                                        }}
                                                        title={user?.role !== 'operator_kecamatan' ? "Klik untuk mengubah Nomor Dokumen" : undefined}
                                                    >
                                                        <span className={cn(user?.role !== 'operator_kecamatan' && "group-hover/ba:text-blue-600 transition-colors")}>{lap.nomor_ba || "-"}</span>
                                                        {user?.role !== 'operator_kecamatan' && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-6 w-6 p-0 opacity-0 group-hover/ba:opacity-100 transition-opacity text-slate-400 hover:text-blue-600 shrink-0"
                                                            >
                                                                <Edit3 className="h-3 w-3" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <div className="font-semibold text-foreground">{lap.Desa?.nama_desa || '-'}</div>
                                                <div className="text-[10px] text-muted-foreground">Kec. {lap.Kecamatan?.nama_kecamatan || '-'}</div>
                                                {lap.PlottingAnggaran?.nama_kegiatan && (
                                                    <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 truncate mt-0.5" title={lap.PlottingAnggaran.nama_kegiatan}>
                                                        📌 {lap.PlottingAnggaran.nama_kegiatan}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center text-xs font-medium font-mono">
                                                {lap.tahun_anggaran}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                    {lap.sumber_dana}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-xs">
                                                {parseFloat(lap.realisasi_panjang || 0).toFixed(1)} m
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {lap.status === 'Submitted' || lap.status === 'submitted' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                        <FileText className="w-3 h-3" />
                                                        SUBMITTED
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                        <Lock className="w-3 h-3" />
                                                        FINAL (LOCKED)
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center text-xs whitespace-nowrap">
                                                {lap.created_at ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-medium text-foreground text-[11px]">
                                                            {new Date(lap.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground font-mono">
                                                            {new Date(lap.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-[11px]">-</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Sticky Bottom Pagination */}
            <UsulanDesaPagination
                pageIndex={page - 1}
                pageCount={totalPages}
                pageSize={limit}
                totalItems={totalItems}
                onPageChange={(idx) => setPage(idx + 1)}
                onPageSizeChange={(newSize) => { setLimit(newSize); setPage(1); }}
            />

            {/* DETAIL & MAP MODAL */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="sm:max-w-[900px] bg-popover border-border max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-2xl">
                    <DialogHeader className="px-6 py-4 border-b border-border bg-popover shrink-0">
                        <DialogTitle className="text-base font-bold flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-600" />
                                <span>Detail Dokumen Infrastruktur — {selectedDetailLaporan?.nomor_ba}</span>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                {selectedDetailLaporan?.status || 'Final'}
                            </span>
                        </DialogTitle>
                    </DialogHeader>

                    {selectedDetailLaporan && (() => {
                        const realisasiPanjangVal = parseFloat(selectedDetailLaporan.realisasi_panjang || 0);
                        const targetPanjangVal = parseFloat(selectedDetailLaporan.PlottingAnggaran?.target_panjang_m || selectedDetailLaporan.rencana_panjang || selectedDetailLaporan.target_panjang_plotting || 0);
                        const persentaseCapaian = targetPanjangVal > 0 ? (realisasiPanjangVal / targetPanjangVal) * 100 : 0;
                        const targetPaguVal = selectedDetailLaporan.PlottingAnggaran?.target_pagu_anggaran || selectedDetailLaporan.target_pagu || 0;

                        return (
                            <div className="flex-1 overflow-y-auto px-6 pt-0 pb-0 space-y-4 custom-scrollbar">
                                {/* Summary Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="p-3 bg-muted/40 border border-border rounded-xl">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Desa & Kecamatan</span>
                                        <span className="text-xs font-extrabold text-foreground block mt-0.5">
                                            Desa {selectedDetailLaporan.Desa?.nama_desa || '-'}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground block">Kec. {selectedDetailLaporan.Kecamatan?.nama_kecamatan || '-'}</span>
                                        {selectedDetailLaporan.Desa?.nama_pimpinan && (
                                            <span className="text-[10px] text-blue-600 font-bold block mt-1">
                                                Kades: {selectedDetailLaporan.Desa.nama_pimpinan}
                                            </span>
                                        )}
                                        {selectedDetailLaporan.Kecamatan?.nama_pimpinan && (
                                            <span className="text-[10px] text-muted-foreground font-semibold block mt-0.5">
                                                Camat: {selectedDetailLaporan.Kecamatan.nama_pimpinan}
                                            </span>
                                        )}
                                    </div>

                                    <div className="p-3 bg-muted/40 border border-border rounded-xl">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Tahun / Sumber Dana</span>
                                        <span className="text-xs font-extrabold text-foreground block mt-0.5">
                                            TA {selectedDetailLaporan.tahun_anggaran}
                                        </span>
                                        <span className="text-[10px] text-blue-600 font-semibold block">{selectedDetailLaporan.sumber_dana || 'BKK'}</span>
                                        {selectedDetailLaporan.created_at && (
                                            <span className="text-[10px] text-muted-foreground font-medium block mt-1 pt-1 border-t border-border/50">
                                                📅 Dibuat: <span className="font-bold text-foreground">{new Date(selectedDetailLaporan.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}, {new Date(selectedDetailLaporan.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB</span>
                                            </span>
                                        )}
                                    </div>

                                    <div className="p-3 bg-muted/40 border border-border rounded-xl">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Realisasi Fisik</span>
                                        <span className="text-xs font-extrabold text-blue-600 block mt-0.5">
                                            {realisasiPanjangVal.toFixed(1)} m
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {selectedDetailLaporan.SegmensFormatted?.length || selectedDetailLaporan.Segmens?.length || 0} Segmen Terikat
                                        </span>
                                    </div>

                                    <div className="p-3 bg-muted/40 border border-border rounded-xl">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Target Capaian Fisik</span>
                                            {user?.role !== 'operator_kecamatan' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleSyncTargetFisik}
                                                    disabled={isSyncingTarget}
                                                    className="h-5 px-1.5 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 gap-1 rounded border border-blue-200/60 dark:border-blue-800/40 shrink-0 cursor-pointer"
                                                    title="Sinkronkan nilai target fisik dari Plotting Anggaran"
                                                >
                                                    <RotateCw className={cn("w-2.5 h-2.5", isSyncingTarget && "animate-spin")} />
                                                    <span>Sync</span>
                                                </Button>
                                            )}
                                        </div>
                                        <span className="text-xs font-extrabold text-foreground block mt-0.5">
                                            {targetPanjangVal > 0 ? `${targetPanjangVal.toFixed(1)} m` : '-'}
                                        </span>
                                        {targetPanjangVal > 0 ? (
                                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold block mt-0.5">
                                                {persentaseCapaian.toFixed(1)}% Capaian Fisik
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block mt-0.5">
                                                Target fisik belum diisi (Klik Sync)
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Linked Plotting Anggaran Banner if present */}
                                {selectedDetailLaporan.PlottingAnggaran && (
                                    <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/50 rounded-xl flex items-center justify-between text-xs">
                                        <div className="space-y-0.5">
                                            <span className="font-extrabold text-slate-900 dark:text-slate-100 block">
                                                {selectedDetailLaporan.PlottingAnggaran.nama_kegiatan}
                                            </span>
                                            {selectedDetailLaporan.PlottingAnggaran.lokasi_kegiatan && (
                                                <span className="text-[10px] text-muted-foreground block">
                                                    Lokasi: {selectedDetailLaporan.PlottingAnggaran.lokasi_kegiatan}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0 ml-3">
                                            <span className="text-[10px] font-bold text-muted-foreground block uppercase">Pagu Anggaran</span>
                                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
                                                {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(targetPaguVal)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* INTERACTIVE OPENLAYERS MAP */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-blue-600" /> Pratinjau Peta Spasial Segmen Realisasi
                                        </Label>
                                        <span className="text-[10px] text-muted-foreground italic">
                                            * Peta spasial ini akan dilampirkan secara otomatis saat Berita Acara dicetak
                                        </span>
                                    </div>
                                    <div
                                        ref={(node) => {
                                            mapDetailContainerRef.current = node;
                                            setMapElement(node);
                                        }}
                                        className="w-full aspect-[16/9] min-h-[300px] rounded-xl border border-border overflow-hidden bg-slate-100 shadow-inner relative"
                                    />
                                </div>

                                {/* Segments Table */}
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                        <TableIcon className="w-3.5 h-3.5 text-blue-600" /> Segmen Terikat dalam Berita Acara Ini
                                    </Label>
                                    <div className="border border-border rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-muted/60 text-[10px] uppercase font-bold text-muted-foreground">
                                                <tr>
                                                    <th className="p-2 text-center">No</th>
                                                    <th className="p-2 text-center">Kode</th>
                                                    <th className="p-2">Nama Objek / Ruas</th>
                                                    <th className="p-2 text-center">Kategori</th>
                                                    <th className="p-2 text-right">Panjang (m)</th>
                                                    <th className="p-2 text-center">Lebar (m)</th>
                                                    <th className="p-2 text-center">Material / Perkerasan</th>
                                                    <th className="p-2 text-center">Kondisi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {(selectedDetailLaporan.SegmensFormatted || []).length === 0 ? (
                                                    <tr>
                                                        <td colSpan={8} className="p-4 text-center text-muted-foreground">
                                                            Tidak ada segmen realisasi yang terikat dalam laporan ini.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    (selectedDetailLaporan.SegmensFormatted || []).map((s: any, idx: number) => (
                                                        <tr key={s.id || idx} className="hover:bg-muted/20">
                                                            <td className="p-2 text-center font-mono">{idx + 1}</td>
                                                            <td className="p-2 text-center font-mono">{s.kode_ruas || '-'}</td>
                                                            <td className="p-2 font-bold">{s.namobj || s.nama_jalan}</td>
                                                            <td className="p-2 text-center">
                                                                <span className={cn("px-1.5 py-0.5 text-[9px] rounded font-bold", s.is_jalan_poros ? "bg-blue-500/10 text-blue-600" : "bg-emerald-500/10 text-emerald-600")}>
                                                                    {s.is_jalan_poros ? "Sesuai Basis Data" : "Diluar Basis Data"}
                                                                </span>
                                                            </td>
                                                            <td className="p-2 text-right font-mono font-bold">{parseFloat(s.panjang_m || 0).toFixed(1)}</td>
                                                            <td className="p-2 text-center">{s.lebar_m || '-'}</td>
                                                            <td className="p-2 text-center font-medium">{s.jenis_perkerasan || s.perkerasan || (s.atribut && (s.atribut.jenis_perkerasan || s.atribut.perkerasan)) || "Beton Cor"}</td>
                                                            <td className="p-2 text-center capitalize">{s.kondisi || 'Baik'}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    <DialogFooter className="px-6 py-4 border-t border-border bg-popover shrink-0 flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setIsDetailOpen(false)} className="h-9 text-xs">
                            Tutup
                        </Button>
                        {user?.role === 'operator_kecamatan' && (
                            <Button
                                onClick={handleDownloadFromDetail}
                                className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold shadow-md"
                            >
                                <Download className="w-4 h-4" />
                                <span>Unduh Dokumen BA</span>
                            </Button>
                        )}
                        {(user?.role === 'operator_bappeda' || user?.role === 'super_admin' || user?.role === 'admin') && (
                            <Button
                                onClick={handlePrintFromDetail}
                                className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold shadow-md"
                            >
                                <Printer className="w-4 h-4" />
                                <span>Cetak Berita Acara & Peta Spasial</span>
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-bold flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                            <span>Buat Snapshot Berita Acara Baru</span>
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateLaporan} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Kecamatan</Label>
                            <Combobox
                                options={kecamatanFilterOptions.filter(o => o.value !== "all")}
                                value={selectedKec}
                                onChange={setSelectedKec}
                                placeholder="Pilih Kecamatan"
                                searchPlaceholder="Cari kecamatan..."
                                className="w-full"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Desa Target</Label>
                            <Combobox
                                options={desaFilterOptions.filter(o => o.value !== "all")}
                                value={createDesa}
                                onChange={setCreateDesa}
                                placeholder="Pilih Desa"
                                searchPlaceholder="Cari desa..."
                                disabled={!selectedKec || selectedKec === "all"}
                                className="w-full"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Nomor Dokumen</Label>
                            <Input
                                value={createNomorBa}
                                onChange={(e) => setCreateNomorBa(e.target.value)}
                                placeholder={`050/XXX/412.302/${createTahun}`}
                                className="h-9 text-xs font-mono bg-background"
                                required
                            />
                            <p className="text-[9.5px] text-muted-foreground">Default: 050/XXX/412.302/{createTahun}. Ganti XXX dengan nomor urut dokumen Anda.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Tahun Anggaran</Label>
                                <Combobox
                                    options={tahunFilterOptions.filter(o => o.value !== "Semua")}
                                    value={createTahun}
                                    onChange={setCreateTahun}
                                    placeholder="Pilih Tahun"
                                    searchPlaceholder="Cari tahun..."
                                    className="w-full"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Sumber Dana</Label>
                                <Combobox
                                    options={[
                                        { value: "BKK", label: "BKK" },
                                        { value: "Sektoral", label: "Sektoral" },
                                        { value: "Lainnya", label: "Lainnya" }
                                    ]}
                                    value={createSumberDana}
                                    onChange={setCreateSumberDana}
                                    placeholder="Pilih Sumber Dana"
                                    searchPlaceholder="Cari..."
                                    className="w-full"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Rencana Panjang (Meter)</Label>
                            <Input
                                type="number"
                                placeholder="Target perencanaan..."
                                value={createRencanaPanjang}
                                onChange={e => setCreateRencanaPanjang(e.target.value)}
                                className="h-9 text-xs rounded-lg"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="h-9 text-xs">
                                Batal
                            </Button>
                            <Button type="submit" disabled={createSubmitting} className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                                {createSubmitting ? "Menyimpan..." : "Buat Berita Acara"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
