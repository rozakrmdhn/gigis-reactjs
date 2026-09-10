import { useState, useMemo } from "react";
import * as turf from "@turf/turf";
import {
  Radio,
  MapPin,
  Route,
  Activity,
  Layers,
  Copy,
  Check,
  X,
  Maximize2,
  Minimize2,
  Sliders,
  Sparkles,
  Info,
  Table,
  Layers2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
  Flame,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Slider } from "~/components/ui/slider";
import { Input } from "~/components/ui/input";
import { cn, getProxiedLayerUrl } from "~/lib/utils";
import { toast } from "sonner";
import { useIsMobile } from "~/hooks/use-mobile";
import type { MapLayerConfig } from "~/features/peta/components/OpenLayersMap";

interface SpatialBufferAnalysisPanelProps {
  isOpen: boolean;
  center: [number, number] | null; // [lat, lon]
  radiusKm: number;
  onRadiusChange: (radiusKm: number) => void;
  roadFeatures?: any[];
  activeWmsLayers?: MapLayerConfig[];
  onClose: () => void;
  onFocus?: () => void;
  onOverlapGeometryChange?: (geojson: any | null) => void;
}

const RADIUS_PRESETS = [
  { label: "250m", value: 0.25 },
  { label: "500m", value: 0.5 },
  { label: "1 KM", value: 1.0 },
  { label: "2 KM", value: 2.0 },
  { label: "5 KM", value: 5.0 },
];

export interface OverlapAnalysisResult {
  layerTitle: string;
  geometryType: "polygon" | "linestring" | "point";
  totalOverlapHa?: number;
  overlapPct?: number;
  totalOverlapMeters?: number;
  totalOverlapKm?: number;
  pointCount?: number;
  riskLevel: "Rendah" | "Sedang" | "Tinggi" | "Kritis";
  intersectingItems: { name: string; valueFormatted: string; props: any }[];
  combinedGeometry: any;
}

export function SpatialBufferAnalysisPanel({
  isOpen,
  center,
  radiusKm = 1.0,
  onRadiusChange,
  roadFeatures = [],
  activeWmsLayers = [],
  onClose,
  onFocus,
  onOverlapGeometryChange,
}: SpatialBufferAnalysisPanelProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<"buffer" | "overlap">("buffer");
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [segmentSearchQuery, setSegmentSearchQuery] = useState("");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [mobileSheetState, setMobileSheetState] = useState<"peek" | "half" | "full">("half");

  // WMS Overlap State
  const [selectedLayerId, setSelectedLayerId] = useState<string>(
    activeWmsLayers[0]?.id || ""
  );
  const [isCalculatingOverlap, setIsCalculatingOverlap] = useState(false);
  const [overlapResult, setOverlapResult] = useState<OverlapAnalysisResult | null>(null);

  // 1. Calculate Buffer Radius Turf Geometry & Road Statistics
  const analysisResult = useMemo(() => {
    if (!center || !isOpen) {
      return {
        totalRoadMeters: 0,
        segmentCount: 0,
        baikMeters: 0,
        sedangMeters: 0,
        rusakMeters: 0,
        areaHa: 0,
        segments: [],
      };
    }

    try {
      const centerPoint = turf.point([center[1], center[0]]);
      const bufferPolygon = turf.buffer(centerPoint, radiusKm || 1.0, { units: "kilometers" });
      if (!bufferPolygon) {
        return {
          totalRoadMeters: 0,
          segmentCount: 0,
          baikMeters: 0,
          sedangMeters: 0,
          rusakMeters: 0,
          areaHa: 0,
          segments: [],
        };
      }
      const bufferAreaHa = Math.round(turf.area(bufferPolygon) / 10000);

      let totalM = 0;
      let baikM = 0;
      let sedangM = 0;
      let rusakM = 0;
      const intersectedSegments: any[] = [];

      (roadFeatures || []).forEach((feat) => {
        if (!feat || !feat.geometry) return;
        try {
          if (turf.booleanIntersects(bufferPolygon, feat)) {
            const props = feat.properties || {};
            const panjang = Number(props.panjang || props.panjang_km * 1000 || 0);
            const kondisi = (props.kondisi || props.KONDISI || "").toLowerCase();

            totalM += panjang;
            if (kondisi.includes("baik")) baikM += panjang;
            else if (kondisi.includes("sedang")) sedangM += panjang;
            else if (kondisi.includes("rusak")) rusakM += panjang;

            intersectedSegments.push({
              id: feat.id || props.id || props.id_ruas || Math.random(),
              nama: props.nama_ruas || props.nama_segmen || props.NAMOBJ || "Ruas Jalan",
              kode: props.kode_ruas || props.id_ruas || "-",
              panjang: Math.round(panjang),
              kondisi: props.kondisi || props.KONDISI || "Belum Terdata",
              perkerasan: props.jenis_perkerasan || props.perkerasan || "-",
            });
          }
        } catch (e) {}
      });

      return {
        totalRoadMeters: totalM,
        segmentCount: intersectedSegments.length,
        baikMeters: baikM,
        sedangMeters: sedangM,
        rusakMeters: rusakM,
        areaHa: bufferAreaHa,
        segments: intersectedSegments,
      };
    } catch (err) {
      console.error("Gagal menghitung buffer jalan:", err);
      return {
        totalRoadMeters: 0,
        segmentCount: 0,
        baikMeters: 0,
        sedangMeters: 0,
        rusakMeters: 0,
        areaHa: 0,
        segments: [],
      };
    }
  }, [center, radiusKm, isOpen, roadFeatures]);

  // 2. Polymorphic Overlap Calculation (Radius Buffer vs Selected WMS Layer)
  const handleCalculateOverlap = async () => {
    if (!center) {
      toast.error("Klik titik di peta terlebih dahulu untuk menentukan pusat radius.");
      return;
    }

    const targetLayer = activeWmsLayers.find((l) => l.id === selectedLayerId);
    if (!targetLayer) {
      toast.error("Pilih layer katalog WMS yang valid.");
      return;
    }

    setIsCalculatingOverlap(true);
    setOverlapResult(null);

    try {
      const centerPoint = turf.point([center[1], center[0]]);
      const bufferPolygon = turf.buffer(centerPoint, radiusKm || 1.0, { units: "kilometers" });
      if (!bufferPolygon) {
        toast.error("Gagal membentuk geometri buffer radius.");
        setIsCalculatingOverlap(false);
        return;
      }
      const bufferAreaHa = turf.area(bufferPolygon) / 10000;
      const bufferBbox = turf.bbox(bufferPolygon);

      let featuresToAnalyze: any[] = [];

      if (targetLayer.type === "vector" && targetLayer.data?.features) {
        featuresToAnalyze = targetLayer.data.features;
      } else if (targetLayer.url) {
        const wfsUrl = new URL(targetLayer.url, window.location.origin);
        wfsUrl.searchParams.set("service", "WFS");
        wfsUrl.searchParams.set("version", "1.0.0");
        wfsUrl.searchParams.set("request", "GetFeature");
        wfsUrl.searchParams.set("typeName", targetLayer.params?.LAYERS || targetLayer.id.replace("layer-", ""));
        wfsUrl.searchParams.set("outputFormat", "application/json");
        wfsUrl.searchParams.set("srsName", "EPSG:4326");
        wfsUrl.searchParams.set("bbox", `${bufferBbox.join(",")},EPSG:4326`);

        const proxiedUrl = getProxiedLayerUrl(wfsUrl.toString());
        const response = await fetch(proxiedUrl);
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.features)) {
            featuresToAnalyze = data.features;
          }
        }
      }

      if (featuresToAnalyze.length === 0) {
        toast.info(`Tidak ditemukan objek beririsan pada layer "${targetLayer.title}" di dalam radius ini.`);
        setIsCalculatingOverlap(false);
        return;
      }

      const firstGeomType = (featuresToAnalyze[0]?.geometry?.type || "").toLowerCase();
      const isPolygon = firstGeomType.includes("polygon");
      const isLineString = firstGeomType.includes("line");
      const isPoint = firstGeomType.includes("point");

      const intersectingItems: { name: string; valueFormatted: string; props: any }[] = [];
      const overlapGeoms: any[] = [];

      let totalOverlapHa = 0;
      let totalOverlapMeters = 0;
      let pointCount = 0;

      if (isPolygon) {
        featuresToAnalyze.forEach((f) => {
          if (!f || !f.geometry) return;
          try {
            if (turf.booleanIntersects(bufferPolygon, f)) {
              const intersection = turf.intersect(turf.featureCollection([bufferPolygon, f]));
              if (intersection) {
                const subAreaHa = turf.area(intersection) / 10000;
                totalOverlapHa += subAreaHa;
                overlapGeoms.push(intersection);

                const p = f.properties || {};
                const name = p.nama || p.NAMOBJ || p.pola_ruang || p.zona || p.kategori || "Poligon Tematik";
                intersectingItems.push({
                  name,
                  valueFormatted: `${Math.round(subAreaHa * 100) / 100} Ha`,
                  props: p,
                });
              }
            }
          } catch (e) {}
        });
      } else if (isLineString) {
        featuresToAnalyze.forEach((f) => {
          if (!f || !f.geometry) return;
          try {
            if (turf.booleanIntersects(bufferPolygon, f)) {
              const lenKm = turf.length(f, { units: "kilometers" });
              const lenM = Math.round(lenKm * 1000);
              totalOverlapMeters += lenM;
              overlapGeoms.push(f);

              const p = f.properties || {};
              const name = p.nama || p.NAMOBJ || p.nama_ruas || p.fungsi || "Garis / Saluran";
              intersectingItems.push({
                name,
                valueFormatted: lenM >= 1000 ? `${(lenM / 1000).toFixed(2)} KM` : `${lenM} M`,
                props: p,
              });
            }
          } catch (e) {}
        });
      } else if (isPoint) {
        featuresToAnalyze.forEach((f) => {
          if (!f || !f.geometry) return;
          try {
            if (turf.booleanPointInPolygon(f, bufferPolygon)) {
              pointCount++;
              overlapGeoms.push(f);
              const p = f.properties || {};
              const name = p.nama || p.NAMOBJ || p.fasilitas || p.nama_jembatan || "Titik Objek";
              intersectingItems.push({
                name,
                valueFormatted: "Di dalam radius",
                props: p,
              });
            }
          } catch (e) {}
        });
      }

      const overlapPct = bufferAreaHa > 0 ? Math.min(100, Math.round((totalOverlapHa / bufferAreaHa) * 100)) : 0;
      let riskLevel: OverlapAnalysisResult["riskLevel"] = "Rendah";
      if (isPolygon) {
        if (overlapPct > 60) riskLevel = "Kritis";
        else if (overlapPct > 35) riskLevel = "Tinggi";
        else if (overlapPct > 15) riskLevel = "Sedang";
      } else if (isLineString) {
        if (totalOverlapMeters > 5000) riskLevel = "Tinggi";
        else if (totalOverlapMeters > 1000) riskLevel = "Sedang";
      } else if (isPoint) {
        if (pointCount > 10) riskLevel = "Tinggi";
        else if (pointCount > 3) riskLevel = "Sedang";
      }

      const combinedGeometry = overlapGeoms.length > 0 ? turf.featureCollection(overlapGeoms) : null;
      if (onOverlapGeometryChange) {
        onOverlapGeometryChange(combinedGeometry);
      }

      setOverlapResult({
        layerTitle: targetLayer.title,
        geometryType: isPolygon ? "polygon" : isLineString ? "linestring" : "point",
        totalOverlapHa: Math.round(totalOverlapHa * 100) / 100,
        overlapPct,
        totalOverlapMeters,
        totalOverlapKm: Math.round((totalOverlapMeters / 1000) * 100) / 100,
        pointCount,
        riskLevel,
        intersectingItems,
        combinedGeometry,
      });

      toast.success(`Analisa Berhasil: Ditemukan ${intersectingItems.length} objek beririsan dengan layer "${targetLayer.title}"`);
    } catch (err) {
      console.error("Gagal melakukan analisa overlap:", err);
      toast.error("Terjadi kendala saat memproses kalkulasi spasial.");
    } finally {
      setIsCalculatingOverlap(false);
    }
  };

  const handleClearOverlap = () => {
    setOverlapResult(null);
    if (onOverlapGeometryChange) {
      onOverlapGeometryChange(null);
    }
    toast.info("Sorotan overlap dibersihkan dari peta.");
  };

  const handleCopyReport = () => {
    if (!center) return;
    let report = `📊 *LAPORAN ANALISIS RADIUS SPASIAL*\n`;
    report += `📍 Titik Pusat: ${center[0].toFixed(6)}, ${center[1].toFixed(6)}\n`;
    report += `⭕ Radius: ${radiusKm >= 1 ? `${radiusKm} KM` : `${radiusKm * 1000} M`} (Luas: ${analysisResult.areaHa} Ha)\n`;
    report += `🛣️ Total Jaringan Jalan: ${(analysisResult.totalRoadMeters / 1000).toFixed(2)} KM (${analysisResult.segmentCount} ruas)\n`;
    report += `  • Baik: ${(analysisResult.baikMeters / 1000).toFixed(2)} KM\n`;
    report += `  • Sedang: ${(analysisResult.sedangMeters / 1000).toFixed(2)} KM\n`;
    report += `  • Rusak: ${(analysisResult.rusakMeters / 1000).toFixed(2)} KM\n`;

    if (overlapResult) {
      report += `\n📐 *Hasil Kalkulasi Overlap (${overlapResult.layerTitle}):*\n`;
      if (overlapResult.geometryType === "polygon") {
        report += `  • Luas Terdampak: ${overlapResult.totalOverlapHa} Ha (${overlapResult.overlapPct}% dari radius)\n`;
      } else if (overlapResult.geometryType === "linestring") {
        report += `  • Total Garis Beririsan: ${overlapResult.totalOverlapKm} KM\n`;
      } else {
        report += `  • Sebaran Titik: ${overlapResult.pointCount} Objek\n`;
      }
      report += `  • Tingkat Dampak: ${overlapResult.riskLevel.toUpperCase()}\n`;
    }

    navigator.clipboard.writeText(report);
    setCopied(true);
    toast.success("Laporan analisis berhasil disalin!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !center) return null;

  const coordStr = `${center[0].toFixed(5)}, ${center[1].toFixed(5)}`;
  const radiusMeters = Math.round((radiusKm || 1.0) * 1000);

  const baikPct = analysisResult.totalRoadMeters > 0 ? Math.round((analysisResult.baikMeters / analysisResult.totalRoadMeters) * 100) : 0;
  const sedangPct = analysisResult.totalRoadMeters > 0 ? Math.round((analysisResult.sedangMeters / analysisResult.totalRoadMeters) * 100) : 0;
  const rusakPct = analysisResult.totalRoadMeters > 0 ? Math.round((analysisResult.rusakMeters / analysisResult.totalRoadMeters) * 100) : 0;

  // Filtered Segments List
  const filteredSegments = (analysisResult.segments || []).filter((seg) => {
    if (segmentSearchQuery) {
      const q = segmentSearchQuery.toLowerCase();
      const matchName = seg.nama.toLowerCase().includes(q);
      const matchCode = seg.kode.toLowerCase().includes(q);
      if (!matchName && !matchCode) return false;
    }
    if (conditionFilter !== "all") {
      const k = (seg.kondisi || "").toLowerCase();
      if (conditionFilter === "baik" && !k.includes("baik")) return false;
      if (conditionFilter === "sedang" && !k.includes("sedang")) return false;
      if (conditionFilter === "rusak" && !k.includes("rusak")) return false;
    }
    return true;
  });

  return (
    <div
      className={cn(
        "fixed sm:absolute z-30 transition-all duration-300 select-none",
        // Desktop Layout
        "sm:bottom-6 sm:right-4 sm:left-auto sm:top-auto",
        isExpanded
          ? "sm:top-20 sm:w-[490px] sm:max-h-none sm:h-[calc(100vh-6rem)]"
          : "sm:w-[400px] sm:max-h-[620px] sm:h-auto",
        // Mobile Layout (Bottom Sheet Drawer)
        "bottom-0 left-0 right-0 w-full",
        mobileSheetState === "peek" && "h-[68px]",
        mobileSheetState === "half" && "h-[62vh] max-h-[62vh]",
        mobileSheetState === "full" && "h-[88vh] max-h-[88vh]"
      )}
    >
      <div className={cn(
        "flex flex-col h-full bg-[#080B11]/95 text-slate-200 backdrop-blur-2xl border border-white/[0.1] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-200",
        "sm:rounded-2xl",
        "rounded-t-3xl rounded-b-none border-x-0 border-b-0"
      )}>
        
        {/* ── MOBILE SWIPE / PULL HANDLE ──────────────────────────────────── */}
        <div
          className="sm:hidden w-full pt-2 pb-1 cursor-pointer flex justify-center items-center shrink-0 bg-[#0C101A]"
          onClick={() => {
            if (mobileSheetState === "peek") setMobileSheetState("half");
            else if (mobileSheetState === "half") setMobileSheetState("peek");
            else setMobileSheetState("half");
          }}
        >
          <div className="w-10 h-1 bg-white/25 rounded-full" />
        </div>

        {/* ── HEADER BAR ─────────────────────────────────────────────────── */}
        <div className="p-3 sm:p-3.5 bg-[#0C101A] border-b border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-900 border border-white/[0.1] flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
              <Radio size={14} className="animate-pulse" />
            </div>
            <div className="leading-tight truncate">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-black text-white tracking-tight">
                  Analisis Radius
                </h3>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/40">
                  Turf.js
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono">
                {coordStr}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Mobile Sheet Toggle Height Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-slate-400 hover:text-white sm:hidden"
              onClick={() => {
                if (mobileSheetState === "peek") setMobileSheetState("half");
                else if (mobileSheetState === "half") setMobileSheetState("full");
                else setMobileSheetState("peek");
              }}
              title="Ubah Ukuran"
            >
              {mobileSheetState === "full" ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] cursor-pointer"
              onClick={handleCopyReport}
              title="Salin Laporan Analisis"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] cursor-pointer hidden sm:flex"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Perkecil Panel" : "Perbesar Panel"}
            >
              {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] cursor-pointer"
              onClick={() => {
                handleClearOverlap();
                onClose();
              }}
              title="Tutup Analisis"
            >
              <X size={14} />
            </Button>
          </div>
        </div>

        {/* If Mobile and in "peek" state, don't show full contents */}
        {!(isMobile && mobileSheetState === "peek") && (
          <>
            {/* ── REDESIGNED SEGMENTED TAB MENU ───────────────────────────────── */}
            <div className="px-2.5 sm:px-3 pt-2 pb-1.5 bg-[#090D16] border-b border-white/[0.06] shrink-0">
              <div className="grid grid-cols-2 gap-1 p-0.5 sm:p-1 bg-slate-950/80 rounded-xl border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setActiveTab("buffer")}
              className={cn(
                "py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 leading-none",
                activeTab === "buffer"
                  ? "bg-slate-800 text-white shadow-sm border border-white/[0.1]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              )}
            >
              <Radio size={12} className={activeTab === "buffer" ? "text-cyan-400" : "text-slate-500"} />
              <span>Radius Jaringan Jalan</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("overlap")}
              className={cn(
                "py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 leading-none",
                activeTab === "overlap"
                  ? "bg-slate-800 text-white shadow-sm border border-white/[0.1]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              )}
            >
              <Layers2 size={12} className={activeTab === "overlap" ? "text-amber-400" : "text-slate-500"} />
              <span>Kalkulator Overlap WMS</span>
            </button>
          </div>
        </div>

        {/* ── TAB 1: RADIUS BUFFER JALAN ─────────────────────────────────── */}
        {activeTab === "buffer" && (
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0">
            {/* Radius Controller Section */}
            <div className="p-3 bg-[#0C101A] border-b border-white/[0.06] space-y-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sliders size={12} className="text-cyan-400" />
                  Jarak Radius
                </span>
                <span className="text-xs font-black text-cyan-400 font-mono bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                  {radiusMeters >= 1000 ? `${(radiusKm || 1.0).toFixed(1)} KM` : `${radiusMeters} M`}
                </span>
              </div>

              {/* Quick Chips */}
              <div className="grid grid-cols-5 gap-1">
                {RADIUS_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => onRadiusChange(preset.value)}
                    className={cn(
                      "py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer text-center",
                      radiusKm === preset.value
                        ? "bg-cyan-500 text-slate-950 shadow-sm font-black"
                        : "bg-slate-900 border border-white/[0.06] text-slate-400 hover:text-white hover:bg-slate-800"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Fine Tuning Slider */}
              <Slider
                value={[radiusKm || 1.0]}
                min={0.1}
                max={10.0}
                step={0.1}
                onValueChange={(vals) => onRadiusChange(vals[0])}
                className="py-1"
              />
            </div>

            {/* Metrics Overview Cards */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950/40 border-b border-white/[0.06] shrink-0">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/[0.06] space-y-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                  Luas Cakupan
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-black text-white leading-none">
                    {analysisResult.areaHa.toLocaleString("id-ID")}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">Hektar</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/[0.06] space-y-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Jalan
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-black text-white leading-none">
                    {(analysisResult.totalRoadMeters / 1000).toFixed(2)}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">KM</span>
                  <span className="text-[9px] text-slate-500 font-mono ml-auto">
                    ({analysisResult.segmentCount} ruas)
                  </span>
                </div>
              </div>
            </div>

            {/* Condition Breakdown Multi-Bar */}
            <div className="px-3 py-2.5 space-y-2 shrink-0 bg-[#0C101A] border-b border-white/[0.06]">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-slate-400 uppercase tracking-wider">
                  Distribusi Kondisi Fisik
                </span>
                <span className="font-mono text-slate-300">
                  {analysisResult.totalRoadMeters > 0 ? "100%" : "0%"}
                </span>
              </div>

              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden flex">
                {baikPct > 0 && (
                  <div
                    style={{ width: `${baikPct}%` }}
                    className="bg-emerald-500 h-full transition-all duration-300"
                    title={`Baik: ${baikPct}%`}
                  />
                )}
                {sedangPct > 0 && (
                  <div
                    style={{ width: `${sedangPct}%` }}
                    className="bg-amber-500 h-full transition-all duration-300"
                    title={`Sedang: ${sedangPct}%`}
                  />
                )}
                {rusakPct > 0 && (
                  <div
                    style={{ width: `${rusakPct}%` }}
                    className="bg-rose-500 h-full transition-all duration-300"
                    title={`Rusak: ${rusakPct}%`}
                  />
                )}
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-[10px] pt-0.5">
                <div className="flex items-center gap-1.5 bg-slate-900/60 p-1.5 rounded-lg border border-white/[0.04]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <div className="truncate leading-tight">
                    <span className="text-slate-400 block text-[9px]">Baik</span>
                    <span className="font-bold text-white">{(analysisResult.baikMeters / 1000).toFixed(2)} km</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900/60 p-1.5 rounded-lg border border-white/[0.04]">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <div className="truncate leading-tight">
                    <span className="text-slate-400 block text-[9px]">Sedang</span>
                    <span className="font-bold text-white">{(analysisResult.sedangMeters / 1000).toFixed(2)} km</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900/60 p-1.5 rounded-lg border border-white/[0.04]">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <div className="truncate leading-tight">
                    <span className="text-slate-400 block text-[9px]">Rusak</span>
                    <span className="font-bold text-white">{(analysisResult.rusakMeters / 1000).toFixed(2)} km</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Intersected Segments Search & Filter */}
            <div className="p-2 bg-slate-950/60 border-b border-white/[0.06] space-y-1.5 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                <Input
                  type="text"
                  placeholder="Cari nama ruas jalan..."
                  value={segmentSearchQuery}
                  onChange={(e) => setSegmentSearchQuery(e.target.value)}
                  className="h-7 pl-7 pr-6 text-[10px] bg-[#0E131F] border-white/[0.08] text-white rounded-lg focus-visible:ring-cyan-500"
                />
                {segmentSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setSegmentSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1">
                {[
                  { id: "all", label: "Semua" },
                  { id: "baik", label: "Baik" },
                  { id: "sedang", label: "Sedang" },
                  { id: "rusak", label: "Rusak" },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setConditionFilter(chip.id)}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-bold transition-all cursor-pointer",
                      conditionFilter === chip.id
                        ? "bg-cyan-500 text-slate-950 font-black shadow-sm"
                        : "bg-slate-900 border border-white/[0.06] text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
                <span className="text-[9px] text-slate-500 font-mono ml-auto">
                  {filteredSegments.length} ruas
                </span>
              </div>
            </div>

            {/* Intersected Segments List */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 custom-scrollbar min-h-0">
              {filteredSegments.map((seg, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-xl bg-slate-900/60 border border-white/[0.04] flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-200 truncate leading-tight">
                      {seg.nama}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {seg.panjang} m • {seg.kode}
                    </span>
                  </div>
                  <Badge
                    className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded shrink-0 font-bold",
                      (seg.kondisi || "").toLowerCase().includes("baik")
                        ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/40"
                        : (seg.kondisi || "").toLowerCase().includes("sedang")
                        ? "bg-amber-950/60 text-amber-400 border-amber-800/40"
                        : "bg-rose-950/60 text-rose-400 border-rose-800/40"
                    )}
                  >
                    {seg.kondisi}
                  </Badge>
                </div>
              ))}

              {filteredSegments.length === 0 && (
                <div className="py-6 text-center text-slate-500 space-y-1">
                  <Route className="w-5 h-5 mx-auto text-slate-600 mb-1" />
                  <p className="text-xs font-medium">Tidak ada ruas jalan yang sesuai</p>
                  <p className="text-[10px] text-slate-600">Sesuaikan filter atau kata kunci pencarian</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: KALKULATOR OVERLAP WMS ───────────────────────────────── */}
        {activeTab === "overlap" && (
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar min-h-0 flex flex-col">
            {/* Target Layer Selector */}
            <div className="p-3 bg-slate-900/80 border border-white/[0.08] rounded-xl space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Pilih Layer Katalog WMS Pembanding
              </span>

              {activeWmsLayers && activeWmsLayers.length > 0 ? (
                <select
                  value={selectedLayerId}
                  onChange={(e) => setSelectedLayerId(e.target.value)}
                  className="w-full bg-[#0E131F] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {activeWmsLayers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title} {l.type === "wms" ? "(WMS GeoServer)" : "(Vektor)"}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-2 bg-amber-950/30 border border-amber-800/40 rounded-lg text-amber-200 text-xs">
                  ⚠️ Belum ada layer katalog WMS aktif. Silakan centang layer pada panel katalog.
                </div>
              )}

              <Button
                size="sm"
                onClick={handleCalculateOverlap}
                disabled={isCalculatingOverlap || !activeWmsLayers || activeWmsLayers.length === 0}
                className="w-full h-8 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg cursor-pointer transition-all shadow-lg shadow-amber-500/20"
              >
                {isCalculatingOverlap ? (
                  <>
                    <RefreshCw size={13} className="mr-1.5 animate-spin" />
                    Mengkalkulasi Spasial Overlap...
                  </>
                ) : (
                  <>
                    <Sparkles size={13} className="mr-1.5" />
                    Hitung Irisan Spasial WMS
                  </>
                )}
              </Button>
            </div>

            {/* Overlap Result Details */}
            {overlapResult && (
              <div className="space-y-2.5 animate-in fade-in zoom-in-95 duration-200">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-700/40 space-y-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300 block">
                      {overlapResult.geometryType === "polygon"
                        ? "Luas Tumpang Tindih"
                        : overlapResult.geometryType === "linestring"
                        ? "Total Garis Beririsan"
                        : "Jumlah Objek"}
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-amber-400 leading-none">
                        {overlapResult.geometryType === "polygon"
                          ? `${overlapResult.totalOverlapHa}`
                          : overlapResult.geometryType === "linestring"
                          ? `${overlapResult.totalOverlapKm}`
                          : `${overlapResult.pointCount}`}
                      </span>
                      <span className="text-[10px] font-semibold text-amber-200">
                        {overlapResult.geometryType === "polygon"
                          ? "Ha"
                          : overlapResult.geometryType === "linestring"
                          ? "KM"
                          : "Titik"}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/[0.06] space-y-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                      Kategori Dampak
                    </span>
                    <Badge
                      className={cn(
                        "text-[10px] px-2 py-0.5 font-black uppercase mt-1",
                        overlapResult.riskLevel === "Kritis" || overlapResult.riskLevel === "Tinggi"
                          ? "bg-rose-950 text-rose-300 border-rose-800"
                          : overlapResult.riskLevel === "Sedang"
                          ? "bg-amber-950 text-amber-300 border-amber-800"
                          : "bg-emerald-950 text-emerald-300 border-emerald-800"
                      )}
                    >
                      {overlapResult.riskLevel}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/70 border border-white/[0.06]">
                  <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1.5">
                    <Flame size={13} className="text-amber-400" />
                    Geometri Irisan Disorot di Peta
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleClearOverlap}
                    className="h-6 px-2 text-[10px] font-bold text-slate-400 hover:text-white"
                  >
                    Bersihkan
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Daftar Poligon / Objek yang Beririsan ({overlapResult.intersectingItems.length})
                  </span>
                  <div className="max-h-[140px] overflow-y-auto space-y-1 custom-scrollbar pr-1">
                    {overlapResult.intersectingItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-slate-900/60 border border-white/[0.04] flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-slate-200 truncate max-w-[200px]">
                          {item.name}
                        </span>
                        <span className="font-mono font-bold text-amber-400">
                          {item.valueFormatted}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!overlapResult && (
              <div className="py-8 text-center text-slate-500 space-y-1.5">
                <Layers2 className="w-6 h-6 mx-auto text-slate-600 mb-1" />
                <p className="text-xs font-semibold text-slate-400">Kalkulator Spasial Turf.js</p>
                <p className="text-[10px] text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                  Pilih layer katalog tematik WMS di atas lalu klik tombol untuk menghitung irisan secara real-time.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── FOOTER BAR ─────────────────────────────────────────────────── */}
        <div className="p-2 sm:p-2.5 bg-[#0C101A] border-t border-white/[0.08] flex items-center justify-between text-[10px] text-slate-500 font-medium shrink-0 pb-safe">
          <span>Radius Buffer</span>
          {onFocus && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onFocus}
              className="h-6 px-2 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40 rounded-md cursor-pointer"
            >
              <MapPin size={11} className="mr-1" />
              Fokus Radius
            </Button>
          )}
        </div>
          </>
        )}

      </div>
    </div>
  );
}
