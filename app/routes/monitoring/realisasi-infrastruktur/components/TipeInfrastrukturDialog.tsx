import React, { useState, useEffect, useMemo, useRef } from "react";
import {
    Route,
    Footprints,
    GitCommit,
    Droplets,
    Waves,
    Building2,
    Layers,
    LandPlot,
    Check,
    MapPin,
    Calendar,
    Sparkles,
    Info,
    ChevronRight,
    ChevronLeft,
    Search,
    X
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import type { InfrastrukturTipe } from "~/services/infrastruktur.service";

interface TipeInfrastrukturDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tipes: InfrastrukturTipe[];
    activeTipe: InfrastrukturTipe | null;
    onSelectTipe: (tipe: InfrastrukturTipe) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
    road: Route,
    jalan: Route,
    path: Footprints,
    jalan_lingkungan: Footprints,
    bridge: GitCommit,
    jembatan: GitCommit,
    droplets: Droplets,
    drainase: Droplets,
    waves: Waves,
    tpt: Waves,
    building: Building2,
    gedung: Building2,
    area: LandPlot,
};

const ITEMS_PER_PAGE = 4; // 2x2 grid per slide

export function TipeInfrastrukturDialog({
    open,
    onOpenChange,
    tipes,
    activeTipe,
    onSelectTipe,
}: TipeInfrastrukturDialogProps) {
    const [currentPage, setCurrentPage] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const touchStartX = useRef<number | null>(null);

    // Filter tipes by search query
    const filteredTipes = useMemo(() => {
        if (!searchQuery.trim()) return tipes;
        const q = searchQuery.toLowerCase().trim();
        return tipes.filter(
            (t) =>
                t.nama.toLowerCase().includes(q) ||
                t.kode.toLowerCase().includes(q) ||
                (t.deskripsi && t.deskripsi.toLowerCase().includes(q)) ||
                (t.geom_type && t.geom_type.toLowerCase().includes(q))
        );
    }, [tipes, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredTipes.length / ITEMS_PER_PAGE));

    // Chunk into pages for slider
    const paginatedSlides = useMemo(() => {
        if (filteredTipes.length === 0) return [];
        const slides: InfrastrukturTipe[][] = [];
        for (let i = 0; i < filteredTipes.length; i += ITEMS_PER_PAGE) {
            slides.push(filteredTipes.slice(i, i + ITEMS_PER_PAGE));
        }
        return slides;
    }, [filteredTipes]);

    // Keep currentPage within bounds when search results change
    useEffect(() => {
        if (currentPage >= totalPages) {
            setCurrentPage(Math.max(0, totalPages - 1));
        }
    }, [totalPages, currentPage]);

    // Auto-navigate to the page that contains activeTipe on open
    useEffect(() => {
        if (open && activeTipe && filteredTipes.length > 0) {
            const index = filteredTipes.findIndex((t) => t.kode === activeTipe.kode);
            if (index !== -1) {
                const targetPage = Math.floor(index / ITEMS_PER_PAGE);
                setCurrentPage(targetPage);
            }
        }
    }, [open, activeTipe, filteredTipes]);

    // Touch swipe handlers for mobile
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const diffX = e.changedTouches[0].clientX - touchStartX.current;
        if (diffX > 50 && currentPage > 0) {
            // Swipe right -> Prev slide
            setCurrentPage((prev) => prev - 1);
        } else if (diffX < -50 && currentPage < totalPages - 1) {
            // Swipe left -> Next slide
            setCurrentPage((prev) => prev + 1);
        }
        touchStartX.current = null;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[580px] p-0 overflow-hidden bg-card/95 backdrop-blur-xl border-border rounded-2xl shadow-2xl animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="px-4 pt-3.5 pb-3 border-b border-border/60 bg-muted/20">
                    <DialogHeader className="space-y-1 text-left">
                        <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center size-8 rounded-lg bg-blue-600 text-white shadow-xs">
                                <Sparkles className="size-4" />
                            </span>
                            <div>
                                <DialogTitle className="text-base font-bold text-foreground">
                                    Pilih Tipe Infrastruktur
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    Tentukan jenis infrastruktur untuk memulai monitoring atau digitasi
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                {/* Panduan Alur Langkah Kerja */}
                <div className="px-4 pt-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-foreground space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-blue-700 dark:text-blue-300">
                            <div className="flex items-center gap-1.5">
                                <Info className="size-3.5" />
                                <span>Langkah Memulai di Halaman Ini:</span>
                            </div>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                3 Langkah Mudah
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {/* Step 1 */}
                            <div className="flex items-start gap-1.5 p-1.5 rounded-lg bg-card/90 border border-blue-500/30 shadow-2xs">
                                <span className="flex items-center justify-center size-4.5 rounded-full bg-blue-600 text-white font-bold text-[9.5px] shrink-0 mt-0.5 shadow-2xs">
                                    1
                                </span>
                                <div className="min-w-0">
                                    <div className="text-[11px] font-bold text-foreground truncate">Tipe Aset</div>
                                    <div className="text-[9.5px] text-muted-foreground leading-tight">Pilih tipe di bawah</div>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="flex items-start gap-1.5 p-1.5 rounded-lg bg-card/60 border border-border/60">
                                <span className="flex items-center justify-center size-4.5 rounded-full bg-muted text-muted-foreground font-bold text-[9.5px] shrink-0 mt-0.5">
                                    2
                                </span>
                                <div className="min-w-0">
                                    <div className="text-[11px] font-bold text-foreground truncate flex items-center gap-1">
                                        <span>Wilayah</span>
                                        <MapPin className="size-2.5 text-muted-foreground" />
                                    </div>
                                    <div className="text-[9.5px] text-muted-foreground leading-tight">Pilih Kec &amp; Desa</div>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="flex items-start gap-1.5 p-1.5 rounded-lg bg-card/60 border border-border/60">
                                <span className="flex items-center justify-center size-4.5 rounded-full bg-muted text-muted-foreground font-bold text-[9.5px] shrink-0 mt-0.5">
                                    3
                                </span>
                                <div className="min-w-0">
                                    <div className="text-[11px] font-bold text-foreground truncate flex items-center gap-1">
                                        <span>Tahun (TA)</span>
                                        <Calendar className="size-2.5 text-muted-foreground" />
                                    </div>
                                    <div className="text-[9.5px] text-muted-foreground leading-tight">Filter data spasial</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search Bar (Tampil jika ada banyak tipe / saat mencari) */}
                {tipes.length > 4 && (
                    <div className="px-4 pt-2.5">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                            <Input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(0);
                                }}
                                placeholder="Cari nama tipe infrastruktur (contoh: jalan, jembatan, drainase)..."
                                className="h-8 pl-8 pr-8 text-xs rounded-lg bg-muted/40 border-border"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setCurrentPage(0);
                                    }}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Slider / Carousel Container */}
                <div
                    className="px-4 py-2.5 select-none"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    {filteredTipes.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">
                            {searchQuery
                                ? `Tidak ditemukan tipe infrastruktur yang sesuai dengan "${searchQuery}"`
                                : "Memuat daftar tipe infrastruktur..."}
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl">
                            <div
                                className="flex transition-transform duration-300 ease-out"
                                style={{ transform: `translateX(-${currentPage * 100}%)` }}
                            >
                                {paginatedSlides.map((slideItems, slideIdx) => (
                                    <div
                                        key={slideIdx}
                                        className="w-full shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-2"
                                    >
                                        {slideItems.map((tipe) => {
                                            const isSelected = activeTipe?.kode === tipe.kode;
                                            const IconComponent =
                                                ICON_MAP[tipe.ikon] || ICON_MAP[tipe.kode] || Layers;
                                            const geomLabel =
                                                tipe.geom_type === "LINESTRING"
                                                    ? "Garis (Line)"
                                                    : tipe.geom_type === "POINT"
                                                    ? "Titik (Point)"
                                                    : "Area (Polygon)";

                                            return (
                                                <button
                                                    key={tipe.kode}
                                                    type="button"
                                                    onClick={() => onSelectTipe(tipe)}
                                                    className={cn(
                                                        "group flex items-center justify-between p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer",
                                                        isSelected
                                                            ? "bg-blue-500/10 border-blue-500 text-foreground ring-1 ring-blue-500/30 shadow-xs"
                                                            : "bg-background/80 hover:bg-muted/70 border-border hover:border-blue-400/40 text-foreground"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div
                                                            className={cn(
                                                                "size-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs text-white",
                                                                !tipe.warna && "bg-blue-600"
                                                            )}
                                                            style={{ backgroundColor: tipe.warna || undefined }}
                                                        >
                                                            <IconComponent className="size-4" />
                                                        </div>

                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-xs font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                                                    {tipe.nama}
                                                                </span>
                                                            </div>
                                                            <span className="inline-block text-[9.5px] px-1 py-0.2 rounded font-medium bg-muted text-muted-foreground shrink-0 mt-0.5">
                                                                {geomLabel}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="shrink-0 ml-1.5">
                                                        {isSelected ? (
                                                            <span className="flex items-center justify-center size-5.5 rounded-full bg-blue-600 text-white shadow-xs">
                                                                <Check className="size-3 stroke-[3]" />
                                                            </span>
                                                        ) : (
                                                            <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Slider Navigation & Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2.5 px-0.5">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={currentPage === 0}
                                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                            >
                                <ChevronLeft className="size-3.5" />
                                <span className="text-[11px]">Sebelumnya</span>
                            </Button>

                            {/* Dot Indicators */}
                            <div className="flex items-center gap-1.5">
                                {Array.from({ length: totalPages }).map((_, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setCurrentPage(idx)}
                                        className={cn(
                                            "size-2 rounded-full transition-all duration-200 cursor-pointer",
                                            currentPage === idx
                                                ? "w-5 bg-blue-600"
                                                : "bg-muted-foreground/30 hover:bg-muted-foreground/60"
                                        )}
                                        title={`Halaman ${idx + 1}`}
                                    />
                                ))}
                            </div>

                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={currentPage === totalPages - 1}
                                onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
                                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                            >
                                <span className="text-[11px]">Selanjutnya</span>
                                <ChevronRight className="size-3.5" />
                            </Button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-border/60 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Tip: Tipe, Kecamatan, Desa, &amp; Tahun dapat diganti di bar navigasi atas.</span>
                    <span className="font-semibold text-foreground shrink-0 ml-2">
                        {filteredTipes.length} Tipe
                    </span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
