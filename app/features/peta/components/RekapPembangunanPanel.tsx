import { useState, useMemo } from "react";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Search,
  Filter,
  Copy,
  Check,
  ChevronDown,
  Layers,
  Route,
  Sparkles,
  Share2,
  TrendingUp,
  Award,
  Clock,
  Hammer,
  ShieldCheck,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "~/components/ui/sheet";
import { SegmenMiniMap } from "~/features/peta/components/SegmenMiniMap";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import type { RekapDibangun } from "~/services/jalan";

interface RekapPembangunanPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  rekapData: RekapDibangun | null;
  segmentsData: any;
  onFocusSegment?: (feature: any) => void;
}

export function RekapPembangunanPanel({
  isOpen,
  onOpenChange,
  rekapData,
  segmentsData,
  onFocusSegment,
}: RekapPembangunanPanelProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "segments">("overview");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [perkerasanFilter, setPerkerasanFilter] = useState<string>("all");
  const [copied, setCopied] = useState<boolean>(false);

  // Segment Filtering (Hooks called unconditionally)
  const allSegments = useMemo(() => {
    return Array.isArray(segmentsData?.features) ? segmentsData.features : [];
  }, [segmentsData]);

  const filteredSegments = useMemo(() => {
    return allSegments.filter((feature: any) => {
      const p = feature?.properties || {};
      const segName = String(p.nama_segmen || "").toLowerCase();
      const kodeRuas = String(p.kode_ruas || "").toLowerCase();
      const perkerasan = String(p.perkerasan || "").toLowerCase();
      const status = String(p.status_pembangunan || "").toLowerCase();

      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!segName.includes(q) && !kodeRuas.includes(q)) return false;
      }

      // Status Filter
      if (statusFilter === "done") {
        if (!status.includes("tuntas") && !status.includes("sudah")) return false;
      } else if (statusFilter === "pending") {
        if (status.includes("tuntas") || status.includes("sudah")) return false;
      }

      // Perkerasan Filter
      if (perkerasanFilter !== "all") {
        if (!perkerasan.includes(perkerasanFilter.toLowerCase())) return false;
      }

      return true;
    });
  }, [allSegments, searchQuery, statusFilter, perkerasanFilter]);

  if (!isOpen || !rekapData) return null;

  // Key Metric Calculations
  const pemetaanAset = rekapData.total_panjang_aset || 0;
  const naikStatusPUK = rekapData.total_panjang_puk || 0;
  const jalanDesaNetto = Math.max(0, pemetaanAset - naikStatusPUK);
  const jalanDibangun = rekapData.total_panjang_dibangun || 0;
  const sisaBelumTertangani = Math.max(0, jalanDesaNetto - jalanDibangun);

  const pct = jalanDesaNetto > 0 ? Math.min(100, Math.round((jalanDibangun / jalanDesaNetto) * 100)) : 100;
  const isDone = pct >= 100;

  // Copy Executive Report
  const handleCopyReport = () => {
    let report = `📋 *LAPORAN REKAPITULASI PROGRES PEMBANGUNAN JALAN DESA*\n`;
    report += `🏛️ Desa: ${rekapData.nama_desa}, Kec. ${rekapData.nama_kecamatan}\n`;
    report += `📅 Kabupaten Bojonegoro (Program MELAROSA)\n`;
    report += `──────────────────────────────────────────\n`;
    report += `🛣️ Total Pemetaan Aset: ${pemetaanAset.toLocaleString("id-ID")} m (${(pemetaanAset / 1000).toFixed(2)} KM)\n`;
    report += `🔄 Naik Status Jalan Kab (PUK): ${naikStatusPUK.toLocaleString("id-ID")} m\n`;
    report += `📌 Kewenangan Desa Saat Ini: ${jalanDesaNetto.toLocaleString("id-ID")} m\n`;
    report += `✅ Realisasi Pembangunan: ${jalanDibangun.toLocaleString("id-ID")} m (${pct}%)\n`;
    report += `⏳ Sisa Belum Tertangani: ${sisaBelumTertangani.toLocaleString("id-ID")} m\n`;
    report += `📊 Status Capaian: ${isDone ? "INFRASTRUKTUR TUNTAS 100%" : "DALAM PROSES PEMBANGUNAN"}\n`;
    report += `🔢 Total Segmen Terdata: ${allSegments.length} Segmen\n`;

    navigator.clipboard.writeText(report);
    setCopied(true);
    toast.success("Ringkasan laporan desa berhasil disalin!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-auto max-h-[88dvh] rounded-t-3xl border-t border-white/[0.1] bg-[#080B11] text-slate-100 p-0 overflow-hidden shadow-2xl overflow-y-auto custom-scrollbar"
      >
        <div className="flex flex-col min-h-0 pt-4 sm:pt-5 px-4 sm:px-6 pb-8">
          
          {/* ── DRAG HANDLE FOR MOBILE ────────────────────────────────────── */}
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3 sm:hidden" />

          {/* ── SHEET HEADER ──────────────────────────────────────────────── */}
          <div className="pb-4 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-400">
                <div className="p-1 rounded-lg bg-emerald-950/60 border border-emerald-800/40">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  Rekapitulasi Pembangunan Infrastruktur
                </span>
              </div>
              
              <div className="flex items-center gap-2.5">
                <SheetTitle className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Desa {rekapData.nama_desa}
                </SheetTitle>
                <Badge
                  className={cn(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1",
                    isDone
                      ? "bg-emerald-950/60 text-emerald-300 border-emerald-700/50"
                      : "bg-amber-950/60 text-amber-300 border-amber-700/50"
                  )}
                >
                  {isDone ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                  <span>{isDone ? "Tuntas 100%" : `${pct}% Terbangun`}</span>
                </Badge>
              </div>

              <SheetDescription className="text-xs text-slate-400 font-medium">
                Kecamatan {rekapData.nama_kecamatan} • Kabupaten Bojonegoro
              </SheetDescription>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyReport}
                className="h-8 px-3 text-xs font-bold rounded-xl border-white/[0.1] bg-[#0E131F] text-slate-200 hover:bg-[#151D30] hover:text-white cursor-pointer transition-all shadow-sm"
              >
                {copied ? <Check size={13} className="mr-1.5 text-emerald-400" /> : <Copy size={13} className="mr-1.5 text-slate-400" />}
                {copied ? "Tersalin" : "Salin Laporan"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] cursor-pointer"
                title="Tutup Panel"
              >
                <X size={16} />
              </Button>
            </div>
          </div>

          {/* ── SEGMENTED TAB NAVIGATION ──────────────────────────────────── */}
          <div className="mt-4 flex items-center justify-between gap-3 shrink-0">
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/80 rounded-xl border border-white/[0.08] w-full max-w-xs">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={cn(
                  "py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 leading-none",
                  activeTab === "overview"
                    ? "bg-slate-800 text-white shadow-sm border border-white/[0.1]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                )}
              >
                <TrendingUp size={13} className={activeTab === "overview" ? "text-emerald-400" : "text-slate-500"} />
                <span>Ringkasan Capaian</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("segments")}
                className={cn(
                  "py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 leading-none",
                  activeTab === "segments"
                    ? "bg-slate-800 text-white shadow-sm border border-white/[0.1]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                )}
              >
                <Route size={13} className={activeTab === "segments" ? "text-cyan-400" : "text-slate-500"} />
                <span>Segmen ({allSegments.length})</span>
              </button>
            </div>
          </div>

          {/* ── TAB 1: EXECUTIVE OVERVIEW & KPI METRICS ─────────────────────── */}
          {activeTab === "overview" && (
            <div className="mt-4 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              
              {/* Primary Progress Hero Gauge Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#0B1220] via-[#0E1528] to-[#0A0F1D] border border-white/[0.08] shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Target & Progres Realisasi Fisik
                    </span>
                    <h4 className="text-sm sm:text-base font-extrabold text-white">
                      {isDone ? "Target Pembangunan Selesai 100%" : `${pct}% dari Total Target Kewenangan Desa`}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight font-mono">
                      {pct}%
                    </span>
                  </div>
                </div>

                {/* Multi-Step Gradient Progress Bar */}
                <div className="h-3 w-full bg-slate-900/90 rounded-full overflow-hidden p-0.5 border border-white/[0.06]">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-700 shadow-sm"
                    style={{ width: `${Math.max(2, pct)}%` }}
                  />
                </div>

                {/* Progress Metric Sub-details */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-white/[0.04]">
                    <span className="text-[9px] text-slate-400 block font-semibold">Telah Dibangun</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      {jalanDibangun.toLocaleString("id-ID")} m
                    </span>
                    <span className="text-[9px] text-slate-500 block">({(jalanDibangun / 1000).toFixed(2)} KM)</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-white/[0.04]">
                    <span className="text-[9px] text-slate-400 block font-semibold">Sisa Belum Tertangani</span>
                    <span className="font-bold text-amber-400 font-mono">
                      {sisaBelumTertangani.toLocaleString("id-ID")} m
                    </span>
                    <span className="text-[9px] text-slate-500 block">({(sisaBelumTertangani / 1000).toFixed(2)} KM)</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-white/[0.04] col-span-2 sm:col-span-1">
                    <span className="text-[9px] text-slate-400 block font-semibold">Kewenangan Desa Netto</span>
                    <span className="font-bold text-white font-mono">
                      {jalanDesaNetto.toLocaleString("id-ID")} m
                    </span>
                    <span className="text-[9px] text-slate-500 block">({(jalanDesaNetto / 1000).toFixed(2)} KM)</span>
                  </div>
                </div>
              </div>

              {/* 4 Standardized Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Pemetaan Aset */}
                <div className="p-3.5 rounded-2xl bg-[#0B101D] border border-white/[0.08] space-y-1 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    1. Pemetaan Jalan Desa
                  </span>
                  <div className="text-base sm:text-lg font-black text-white font-mono">
                    {pemetaanAset.toLocaleString("id-ID")} m
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Basis awal pemetaan aset
                  </span>
                </div>

                {/* 2. Naik Status Kab */}
                <div className="p-3.5 rounded-2xl bg-[#0B101D] border border-white/[0.08] space-y-1 shadow-sm">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                    2. Naik Status Kab (PUK)
                  </span>
                  <div className="text-base sm:text-lg font-black text-cyan-300 font-mono">
                    {naikStatusPUK.toLocaleString("id-ID")} m
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Dialihkan ke Kab. Bojonegoro
                  </span>
                </div>

                {/* 3. Kewenangan Desa Sekarang */}
                <div className="p-3.5 rounded-2xl bg-[#0B101D] border border-white/[0.08] space-y-1 shadow-sm">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                    3. Jalan Desa Sekarang
                  </span>
                  <div className="text-base sm:text-lg font-black text-indigo-300 font-mono">
                    {jalanDesaNetto.toLocaleString("id-ID")} m
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Kewenangan desa aktif
                  </span>
                </div>

                {/* 4. Sisa Belum Tertangani */}
                <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-800/30 space-y-1 shadow-sm">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                    4. Belum Tertangani
                  </span>
                  <div className="text-base sm:text-lg font-black text-amber-300 font-mono">
                    {sisaBelumTertangani.toLocaleString("id-ID")} m
                  </div>
                  <span className="text-[10px] text-amber-400/70 block">
                    Kebutuhan intervensi APBD
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* ── TAB 2: DETAILED SEGMENTS EXPLORER ─────────────────────────── */}
          {activeTab === "segments" && (
            <div className="mt-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
              
              {/* Search & Filter Controls */}
              <div className="p-3 bg-[#0B101D] rounded-2xl border border-white/[0.08] space-y-2.5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
                  <Input
                    type="text"
                    placeholder="Cari nama segmen, kode ruas, atau lokasi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 pr-7 text-xs bg-[#0E131F] border-white/[0.08] text-white rounded-xl focus-visible:ring-emerald-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Quick Filters */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="text-slate-400 font-bold uppercase tracking-wider mr-1">Status:</span>
                  {[
                    { id: "all", label: "Semua" },
                    { id: "done", label: "Sudah Tuntas" },
                    { id: "pending", label: "Belum Tuntas" },
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setStatusFilter(chip.id)}
                      className={cn(
                        "px-2.5 py-0.5 rounded-full font-bold transition-all cursor-pointer",
                        statusFilter === chip.id
                          ? "bg-emerald-500 text-slate-950 font-black shadow-sm"
                          : "bg-slate-900 border border-white/[0.06] text-slate-400 hover:text-white"
                      )}
                    >
                      {chip.label}
                    </button>
                  ))}

                  <span className="text-slate-400 font-bold uppercase tracking-wider ml-3 mr-1">Perkerasan:</span>
                  {[
                    { id: "all", label: "Semua" },
                    { id: "beton", label: "Rigid Beton" },
                    { id: "aspal", label: "Aspal" },
                    { id: "paving", label: "Paving" },
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setPerkerasanFilter(chip.id)}
                      className={cn(
                        "px-2.5 py-0.5 rounded-full font-bold transition-all cursor-pointer",
                        perkerasanFilter === chip.id
                          ? "bg-cyan-500 text-slate-950 font-black shadow-sm"
                          : "bg-slate-900 border border-white/[0.06] text-slate-400 hover:text-white"
                      )}
                    >
                      {chip.label}
                    </button>
                  ))}

                  <span className="text-slate-500 font-mono ml-auto">
                    {filteredSegments.length} / {allSegments.length} Segmen
                  </span>
                </div>
              </div>

              {/* Segments Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredSegments.map((feature: any, idx: number) => {
                  const props = feature?.properties || {};
                  const statusPembangunan = String(props.status_pembangunan || "").toLowerCase();
                  const isSegDone = statusPembangunan.includes("tuntas") || statusPembangunan.includes("sudah");
                  const panjangM = Math.round(parseFloat(String(props.panjang || props.panjang_m || 0)));

                  return (
                    <div
                      key={idx}
                      className="bg-[#0B101D] border border-white/[0.08] rounded-2xl overflow-hidden shadow-sm hover:border-white/[0.15] transition-all flex flex-col justify-between"
                    >
                      {/* Mini Map Canvas */}
                      <div className="h-28 bg-slate-950 relative border-b border-white/[0.04]">
                        <SegmenMiniMap
                          feature={feature}
                          strokeColor={isSegDone ? "#10b981" : "#38bdf8"}
                          className="w-full h-full p-3"
                        />
                        <Badge
                          className={cn(
                            "absolute top-2.5 right-2.5 text-[9px] font-bold px-2 py-0.5 rounded-md border",
                            isSegDone
                              ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/60"
                              : "bg-cyan-950/80 text-cyan-300 border-cyan-700/60"
                          )}
                        >
                          {isSegDone ? "Sudah Tuntas" : "Aktif"}
                        </Badge>
                      </div>

                      {/* Segmen Details */}
                      <div className="p-3 space-y-2.5 flex-1 flex flex-col justify-between">
                        <div>
                          <h5 className="text-xs font-bold text-white line-clamp-1">
                            {props.nama_segmen || `Segmen ${idx + 1}`}
                          </h5>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Kode: {props.kode_ruas || "-"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-slate-950/80 border border-white/[0.04] text-[11px]">
                          <div>
                            <span className="text-slate-500 block text-[9px]">Panjang</span>
                            <span className="font-bold text-white font-mono">{panjangM.toLocaleString("id-ID")} m</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px]">Perkerasan</span>
                            <span className="font-bold text-slate-200 truncate block">{props.perkerasan || "Belum Ada"}</span>
                          </div>
                        </div>

                        {onFocusSegment && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-7 text-[11px] font-bold rounded-xl gap-1.5 border-white/[0.08] bg-[#0E131F] text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                            onClick={() => onFocusSegment(feature)}
                          >
                            <MapPin size={12} className="text-emerald-400" />
                            Fokus Lokasi
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredSegments.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-500 text-xs">
                    Tidak ada segmen yang cocok dengan filter pencarian.
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </SheetContent>
    </Sheet>
  );
}
