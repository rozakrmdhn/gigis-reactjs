import { useState, useMemo } from "react";
import * as turf from "@turf/turf";
import {
  Layers2,
  Route,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  X,
  Maximize2,
  Minimize2,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Flame,
  Table,
  Search,
  FileSpreadsheet,
  Globe,
  Shapes,
  Map as MapIcon,
  GitCompare,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { cn, getProxiedLayerUrl } from "~/lib/utils";
import { toast } from "sonner";
import { useIsMobile } from "~/hooks/use-mobile";
import type { MapLayerConfig } from "~/features/peta/components/OpenLayersMap";

// Robust mathematical helper to ensure coordinates are standard Lon/Lat (EPSG:4326)
function normalizeToLonLat(geom: any): any {
  if (!geom) return null;
  try {
    const clone = JSON.parse(JSON.stringify(geom));
    const convertCoord = (coord: any): any => {
      if (Array.isArray(coord) && typeof coord[0] === "number" && typeof coord[1] === "number") {
        if (Math.abs(coord[0]) > 180 || Math.abs(coord[1]) > 90) {
          const lon = (coord[0] / 20037508.34) * 180;
          let lat = (coord[1] / 20037508.34) * 180;
          lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
          return [lon, lat];
        }
        return coord;
      }
      if (Array.isArray(coord)) {
        return coord.map(convertCoord);
      }
      return coord;
    };
    clone.coordinates = convertCoord(clone.coordinates);
    return clone;
  } catch (e) {
    return geom;
  }
}

export interface UniversalOverlapItem {
  id: string;
  sourceName: string;
  sourceType: string;
  targetName: string;
  targetCategory: string;
  metricFormatted: string;
  metricNumeric: number;
  geometry: any;
  extraProps?: Record<string, any>;
}

export interface UniversalAnalysisResult {
  sourceTitle: string;
  targetTitle: string;
  overlapType: "line_in_poly" | "poly_in_poly" | "point_in_poly" | "line_cross_line" | "generic";
  primaryMetricTitle: string;
  primaryMetricFormatted: string;
  primaryMetricUnit: string;
  secondaryMetricTitle: string;
  secondaryMetricFormatted: string;
  totalSourceItems: number;
  intersectingCount: number;
  categoryBreakdown: { category: string; formattedValue: string; count: number }[];
  items: UniversalOverlapItem[];
  combinedGeometry: any;
}

interface CrossLayerAnalysisPanelProps {
  isOpen: boolean;
  onClose: () => void;
  roadFeatures?: any[];
  activeLayers: MapLayerConfig[];
  onHighlightGeometryChange?: (geojson: any | null) => void;
  onFocusGeometry?: (geometry: any) => void;
}

export function CrossLayerAnalysisPanel({
  isOpen,
  onClose,
  roadFeatures = [],
  activeLayers = [],
  onHighlightGeometryChange,
  onFocusGeometry,
}: CrossLayerAnalysisPanelProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<"setup" | "summary" | "table">("setup");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [targetCategoryFilter, setTargetCategoryFilter] = useState<string>("all");
  const [mobileSheetState, setMobileSheetState] = useState<"peek" | "half" | "full">("half");

  // Selectable Source Layers (Layer A)
  const sourceLayerOptions = useMemo(() => {
    const opts: { id: string; title: string; category: string }[] = [
      { id: "core_jalan_all", title: "🛣️ Semua Jaringan Jalan (Poros & Kab)", category: "Infrastruktur" },
      { id: "core_jalan_poros", title: "🛣️ Jalan Poros Desa", category: "Infrastruktur" },
      { id: "core_jalan_kabupaten", title: "🛣️ Segmen Jalan Kabupaten", category: "Infrastruktur" },
    ];

    activeLayers.forEach((l) => {
      opts.push({
        id: l.id,
        title: `🗂️ ${l.title} ${l.type === "wms" ? "(WMS)" : "(Vektor)"}`,
        category: "Katalog Dataset",
      });
    });

    return opts;
  }, [activeLayers]);

  // Selectable Target Layers (Layer B)
  const targetLayerOptions = useMemo(() => {
    const opts: { id: string; title: string }[] = [];

    activeLayers.forEach((l) => {
      opts.push({
        id: l.id,
        title: `🗂️ ${l.title} ${l.type === "wms" ? "(WMS GeoServer)" : "(Vektor)"}`,
      });
    });

    return opts;
  }, [activeLayers]);

  const [selectedSourceId, setSelectedSourceId] = useState<string>("core_jalan_all");
  const [selectedTargetId, setSelectedTargetId] = useState<string>(
    activeLayers[0]?.id || ""
  );

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<UniversalAnalysisResult | null>(null);

  // Helper to fetch features for a given layer ID
  const fetchFeaturesForLayer = async (layerId: string): Promise<any[]> => {
    if (layerId === "core_jalan_all") return roadFeatures || [];
    if (layerId === "core_jalan_poros") {
      return (roadFeatures || []).filter(
        (f) =>
          f?.properties?._layer === "jalan_poros" ||
          f?.properties?.tipe === "poros" ||
          f?.properties?.nama_ruas?.toLowerCase().includes("poros") ||
          f?.properties?.nama_segmen?.toLowerCase().includes("poros")
      );
    }
    if (layerId === "core_jalan_kabupaten") {
      return (roadFeatures || []).filter(
        (f) =>
          f?.properties?._layer === "jalan_segmen" ||
          f?.properties?.tipe === "kabupaten" ||
          f?.properties?.id_ruas
      );
    }

    const matched = activeLayers.find((l) => l.id === layerId);
    if (!matched) return [];

    if (matched.type === "vector" && matched.data?.features) {
      return matched.data.features;
    }

    if (matched.url) {
      const wfsUrl = new URL(matched.url, window.location.origin);
      wfsUrl.searchParams.set("service", "WFS");
      wfsUrl.searchParams.set("version", "1.0.0");
      wfsUrl.searchParams.set("request", "GetFeature");
      wfsUrl.searchParams.set("typeName", matched.params?.LAYERS || matched.id.replace("layer-", ""));
      wfsUrl.searchParams.set("outputFormat", "application/json");
      wfsUrl.searchParams.set("srsName", "EPSG:4326");
      wfsUrl.searchParams.set("maxFeatures", "800");

      const proxiedUrl = getProxiedLayerUrl(wfsUrl.toString());
      const response = await fetch(proxiedUrl);
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.features)) {
          return data.features;
        }
      }
    }

    return [];
  };

  // Execute Universal Overlap Engine
  const handleExecuteAnalysis = async () => {
    if (!selectedSourceId || !selectedTargetId) {
      toast.error("Pilih Layer Sumber (A) dan Layer Pembanding (B).");
      return;
    }

    if (selectedSourceId === selectedTargetId) {
      toast.error("Layer A dan Layer B tidak boleh sama.");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const rawSourceFeatures = await fetchFeaturesForLayer(selectedSourceId);
      const rawTargetFeatures = await fetchFeaturesForLayer(selectedTargetId);

      if (!rawSourceFeatures || rawSourceFeatures.length === 0) {
        toast.warning("Tidak ada data objek yang dapat dimuat dari Layer A.");
        setIsAnalyzing(false);
        return;
      }

      if (!rawTargetFeatures || rawTargetFeatures.length === 0) {
        toast.warning("Tidak ada data objek yang dapat dimuat dari Layer B.");
        setIsAnalyzing(false);
        return;
      }

      const sourceFeatures = rawSourceFeatures.map((f) => ({
        ...f,
        geometry: normalizeToLonLat(f.geometry),
      }));

      const targetFeatures = rawTargetFeatures.map((f) => ({
        ...f,
        geometry: normalizeToLonLat(f.geometry),
      }));

      const geomTypeA = (sourceFeatures[0]?.geometry?.type || "").toLowerCase();
      const geomTypeB = (targetFeatures[0]?.geometry?.type || "").toLowerCase();

      const isLineA = geomTypeA.includes("line");
      const isPointA = geomTypeA.includes("point");
      const isPolyA = !isLineA && !isPointA;

      const isLineB = geomTypeB.includes("line");
      const isPointB = geomTypeB.includes("point");
      const isPolyB = !isLineB && !isPointB;

      const items: UniversalOverlapItem[] = [];
      const overlapGeoms: any[] = [];
      const categoryMap = new Map<string, { totalNumeric: number; count: number }>();

      let overlapType: UniversalAnalysisResult["overlapType"] = "generic";
      let primaryMetricTitle = "Total Nilai Tumpang Tindih";
      let primaryMetricFormatted = "0";
      let primaryMetricUnit = "";
      let secondaryMetricTitle = "Rasio Terhubung";
      let secondaryMetricFormatted = "0%";

      // TYPE 1: LINE vs POLYGON
      if (isLineA && isPolyB) {
        overlapType = "line_in_poly";
        primaryMetricTitle = "Total Garis Menembus Area";
        primaryMetricUnit = "KM";
        secondaryMetricTitle = "Rasio Garis Terdampak";

        let totalIntersectingM = 0;
        let totalOverallRoadM = 0;

        sourceFeatures.forEach((lineFeat) => {
          if (!lineFeat || !lineFeat.geometry) return;
          const pA = lineFeat.properties || {};
          const lenM = pA.panjang || (turf.length(lineFeat, { units: "kilometers" }) * 1000) || 0;
          totalOverallRoadM += Number(lenM) || 0;

          targetFeatures.forEach((polyFeat) => {
            if (!polyFeat || !polyFeat.geometry) return;
            try {
              if (turf.booleanIntersects(lineFeat, polyFeat)) {
                const pB = polyFeat.properties || {};
                const segLenM = Math.round(Number(lenM) || 0);
                const segLenKm = Math.round((segLenM / 1000) * 100) / 100;

                totalIntersectingM += segLenM;
                overlapGeoms.push(lineFeat);

                const targetName = pB.nama || pB.NAMOBJ || pB.pola_ruang || pB.zona || pB.kategori || "Kawasan Pola Ruang";
                const cat = pB.kategori || pB.fungsi || pB.zona || "Kawasan Tematik";

                items.push({
                  id: lineFeat.id || Math.random().toString(),
                  sourceName: pA.nama_ruas || pA.nama_segmen || pA.NAMOBJ || pA.name || "Ruas Garis",
                  sourceType: "Garis / Ruas",
                  targetName,
                  targetCategory: cat,
                  metricFormatted: `${segLenKm} KM`,
                  metricNumeric: segLenKm,
                  geometry: lineFeat.geometry,
                  extraProps: { ...pA, ...pB },
                });

                const existing = categoryMap.get(cat) || { totalNumeric: 0, count: 0 };
                categoryMap.set(cat, {
                  totalNumeric: existing.totalNumeric + segLenKm,
                  count: existing.count + 1,
                });
              }
            } catch (e) {}
          });
        });

        const totalKm = Math.round((totalIntersectingM / 1000) * 100) / 100;
        const overallKm = Math.round((totalOverallRoadM / 1000) * 100) / 100;
        const pct = overallKm > 0 ? Math.min(100, Math.round((totalKm / overallKm) * 100)) : 0;

        primaryMetricFormatted = `${totalKm.toLocaleString("id-ID")}`;
        secondaryMetricFormatted = `${pct}% (${items.length} ruas)`;
      }

      // TYPE 2: POLYGON vs POLYGON
      else if (isPolyA && isPolyB) {
        overlapType = "poly_in_poly";
        primaryMetricTitle = "Total Luas Irisan Area";
        primaryMetricUnit = "Hektar";
        secondaryMetricTitle = "Jumlah Poligon Beririsan";

        let totalOverlapM2 = 0;

        sourceFeatures.forEach((polyA) => {
          if (!polyA || !polyA.geometry) return;
          const pA = polyA.properties || {};

          targetFeatures.forEach((polyB) => {
            if (!polyB || !polyB.geometry) return;
            try {
              if (turf.booleanIntersects(polyA, polyB)) {
                const intersection = turf.intersect(turf.featureCollection([polyA, polyB]));
                if (intersection) {
                  const areaM2 = turf.area(intersection);
                  const areaHa = Math.round((areaM2 / 10000) * 100) / 100;
                  totalOverlapM2 += areaM2;
                  overlapGeoms.push(intersection);

                  const pB = polyB.properties || {};
                  const sourceName = pA.nama || pA.nama_desa || pA.NAMOBJ || "Area Poligon A";
                  const targetName = pB.nama || pB.NAMOBJ || pB.pola_ruang || pB.zona || "Area Poligon B";
                  const cat = pB.kategori || pB.fungsi || pB.zona || "Kategori Target";

                  items.push({
                    id: Math.random().toString(),
                    sourceName,
                    sourceType: "Area Poligon",
                    targetName,
                    targetCategory: cat,
                    metricFormatted: `${areaHa.toLocaleString("id-ID")} Ha`,
                    metricNumeric: areaHa,
                    geometry: intersection,
                    extraProps: { ...pA, ...pB },
                  });

                  const existing = categoryMap.get(cat) || { totalNumeric: 0, count: 0 };
                  categoryMap.set(cat, {
                    totalNumeric: existing.totalNumeric + areaHa,
                    count: existing.count + 1,
                  });
                }
              }
            } catch (e) {}
          });
        });

        const totalHa = Math.round((totalOverlapM2 / 10000) * 100) / 100;
        primaryMetricFormatted = `${totalHa.toLocaleString("id-ID")}`;
        secondaryMetricFormatted = `${items.length} zona berpotongan`;
      }

      // TYPE 3: POINT vs POLYGON
      else if (isPointA && isPolyB) {
        overlapType = "point_in_poly";
        primaryMetricTitle = "Sebaran Titik di Area";
        primaryMetricUnit = "Titik";
        secondaryMetricTitle = "Rasio Titik Terhubung";

        sourceFeatures.forEach((pointFeat) => {
          if (!pointFeat || !pointFeat.geometry) return;
          const pA = pointFeat.properties || {};

          targetFeatures.forEach((polyFeat) => {
            if (!polyFeat || !polyFeat.geometry) return;
            try {
              if (turf.booleanPointInPolygon(pointFeat, polyFeat)) {
                overlapGeoms.push(pointFeat);
                const pB = polyFeat.properties || {};
                const sourceName = pA.nama || pA.name || pA.NAMOBJ || pA.fasilitas || "Titik Objek";
                const targetName = pB.nama || pB.NAMOBJ || pB.pola_ruang || "Kawasan Target";
                const cat = pB.kategori || pB.fungsi || "Zonasi";

                items.push({
                  id: Math.random().toString(),
                  sourceName,
                  sourceType: "Titik Objek",
                  targetName,
                  targetCategory: cat,
                  metricFormatted: "Di dalam kawasan",
                  metricNumeric: 1,
                  geometry: pointFeat.geometry,
                  extraProps: { ...pA, ...pB },
                });

                const existing = categoryMap.get(cat) || { totalNumeric: 0, count: 0 };
                categoryMap.set(cat, {
                  totalNumeric: existing.totalNumeric + 1,
                  count: existing.count + 1,
                });
              }
            } catch (e) {}
          });
        });

        primaryMetricFormatted = `${items.length}`;
        const pct = sourceFeatures.length > 0 ? Math.round((items.length / sourceFeatures.length) * 100) : 0;
        secondaryMetricFormatted = `${pct}% dari ${sourceFeatures.length} titik`;
      }

      // TYPE 4: GENERIC
      else {
        sourceFeatures.forEach((featA) => {
          if (!featA || !featA.geometry) return;
          targetFeatures.forEach((featB) => {
            if (!featB || !featB.geometry) return;
            try {
              if (turf.booleanIntersects(featA, featB)) {
                overlapGeoms.push(featA);
                const pA = featA.properties || {};
                const pB = featB.properties || {};
                items.push({
                  id: Math.random().toString(),
                  sourceName: pA.nama || pA.NAMOBJ || "Objek A",
                  sourceType: "Fitur A",
                  targetName: pB.nama || pB.NAMOBJ || "Objek B",
                  targetCategory: pB.kategori || "Tumpang Tindih",
                  metricFormatted: "Beririsan Spasial",
                  metricNumeric: 1,
                  geometry: featA.geometry,
                  extraProps: { ...pA, ...pB },
                });
              }
            } catch (e) {}
          });
        });

        primaryMetricTitle = "Objek Beririsan Spasial";
        primaryMetricFormatted = `${items.length}`;
        primaryMetricUnit = "Item";
        secondaryMetricTitle = "Status Komputasi";
        secondaryMetricFormatted = "Terhubung";
      }

      const categoryBreakdown = Array.from(categoryMap.entries()).map(([cat, val]) => ({
        category: cat,
        formattedValue:
          overlapType === "line_in_poly"
            ? `${Math.round(val.totalNumeric * 100) / 100} KM`
            : overlapType === "poly_in_poly"
            ? `${Math.round(val.totalNumeric * 100) / 100} Ha`
            : `${val.count} Objek`,
        count: val.count,
      }));

      const combinedGeometry = overlapGeoms.length > 0 ? turf.featureCollection(overlapGeoms) : null;
      if (onHighlightGeometryChange) {
        onHighlightGeometryChange(combinedGeometry);
      }

      const sourceTitle =
        sourceLayerOptions.find((o) => o.id === selectedSourceId)?.title || "Layer A";
      const targetTitle =
        targetLayerOptions.find((o) => o.id === selectedTargetId)?.title || "Layer B";

      setResult({
        sourceTitle,
        targetTitle,
        overlapType,
        primaryMetricTitle,
        primaryMetricFormatted,
        primaryMetricUnit,
        secondaryMetricTitle,
        secondaryMetricFormatted,
        totalSourceItems: sourceFeatures.length,
        intersectingCount: items.length,
        categoryBreakdown,
        items,
        combinedGeometry,
      });

      setActiveTab("summary");
      toast.success(
        `Analisa Berhasil: Ditemukan ${items.length} perpotongan antara ${sourceTitle} dan ${targetTitle}!`
      );
    } catch (err) {
      console.error("Gagal melakukan analisa tumpang tindih universal:", err);
      toast.error("Terjadi kendala saat memproses analisa spasial antar layer.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearHighlight = () => {
    if (onHighlightGeometryChange) {
      onHighlightGeometryChange(null);
    }
    toast.info("Sorotan geometri tumpang tindih dibersihkan dari peta.");
  };

  const handleCopyReport = () => {
    if (!result) return;
    let report = `📊 *LAPORAN ANALISA TUMPANG TINDIH ANTAR-LAYER (CROSS-LAYER SPATIAL MATRIX)*\n`;
    report += `🅰️ Layer Sumber (A): ${result.sourceTitle}\n`;
    report += `🅱️ Layer Pembanding (B): ${result.targetTitle}\n`;
    report += `────────────────────────────\n`;
    report += `📈 ${result.primaryMetricTitle}: ${result.primaryMetricFormatted} ${result.primaryMetricUnit}\n`;
    report += `📊 ${result.secondaryMetricTitle}: ${result.secondaryMetricFormatted}\n`;
    report += `🔢 Total Objek Beririsan: ${result.intersectingCount} Item\n\n`;

    if (result.categoryBreakdown.length > 0) {
      report += `🏷️ *Distribusi Berdasarkan Kategori / Kawasan:*\n`;
      result.categoryBreakdown.forEach((cat) => {
        report += `  • ${cat.category}: ${cat.formattedValue} (${cat.count} item)\n`;
      });
      report += `\n`;
    }

    report += `📋 *Rincian Objek Terpotong (Sampel 15 Teratas):*\n`;
    result.items.slice(0, 15).forEach((item, idx) => {
      report += `  [${idx + 1}] ${item.sourceName} -> ${item.targetName} (${item.metricFormatted})\n`;
    });

    navigator.clipboard.writeText(report);
    setCopied(true);
    toast.success("Laporan telaah spasial berhasil disalin!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const filteredItems = (result?.items || []).filter((item) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSource = item.sourceName.toLowerCase().includes(q);
      const matchTarget = item.targetName.toLowerCase().includes(q);
      const matchCat = item.targetCategory.toLowerCase().includes(q);
      if (!matchSource && !matchTarget && !matchCat) return false;
    }
    if (targetCategoryFilter !== "all") {
      if (item.targetCategory !== targetCategoryFilter) return false;
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
          ? "sm:top-20 sm:w-[540px] sm:max-h-none sm:h-[calc(100vh-6rem)]"
          : "sm:w-[420px] sm:max-h-[640px] sm:h-auto",
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
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-900 border border-white/[0.1] flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <GitCompare size={14} />
            </div>
            <div className="leading-tight truncate">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-black text-white tracking-tight">
                  Matriks Antar-Layer
                </h3>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/40">
                  Universal
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-400">
                Layer A vs Layer B
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

            {result && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] cursor-pointer"
                onClick={handleCopyReport}
                title="Salin Laporan Telaah"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </Button>
            )}
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
                handleClearHighlight();
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
              <div className="grid grid-cols-3 gap-1 p-0.5 sm:p-1 bg-slate-950/80 rounded-xl border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setActiveTab("setup")}
              className={cn(
                "py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 leading-none",
                activeTab === "setup"
                  ? "bg-slate-800 text-white shadow-sm border border-white/[0.1]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              )}
            >
              <Filter size={11} className={activeTab === "setup" ? "text-amber-400" : "text-slate-500"} />
              <span>Konfigurasi</span>
            </button>
            <button
              type="button"
              disabled={!result}
              onClick={() => setActiveTab("summary")}
              className={cn(
                "py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 leading-none disabled:opacity-40",
                activeTab === "summary"
                  ? "bg-slate-800 text-white shadow-sm border border-white/[0.1]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              )}
            >
              <Sparkles size={11} className={activeTab === "summary" ? "text-emerald-400" : "text-slate-500"} />
              <span>Ringkasan</span>
            </button>
            <button
              type="button"
              disabled={!result}
              onClick={() => setActiveTab("table")}
              className={cn(
                "py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 leading-none disabled:opacity-40",
                activeTab === "table"
                  ? "bg-slate-800 text-white shadow-sm border border-white/[0.1]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              )}
            >
              <Table size={11} className={activeTab === "table" ? "text-cyan-400" : "text-slate-500"} />
              <span>Rincian ({result?.items?.length || 0})</span>
            </button>
          </div>
        </div>

        {/* ── TAB 1: SETUP / CONFIGURATION ───────────────────────────────── */}
        {activeTab === "setup" && (
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar min-h-0">
            {/* Step 1: Select Source Layer A */}
            <div className="p-3 bg-slate-900/80 border border-white/[0.08] rounded-xl space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[9px] font-black">A</span>
                Pilih Layer Sumber (Layer A)
              </span>

              <select
                value={selectedSourceId}
                onChange={(e) => setSelectedSourceId(e.target.value)}
                className="w-full bg-[#0E131F] border border-white/[0.1] rounded-lg px-2.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {sourceLayerOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Select Target Layer B */}
            <div className="p-3 bg-slate-900/80 border border-white/[0.08] rounded-xl space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-[9px] font-black">B</span>
                Pilih Layer Pembanding / Target (Layer B)
              </span>

              {targetLayerOptions.length > 0 ? (
                <select
                  value={selectedTargetId}
                  onChange={(e) => setSelectedTargetId(e.target.value)}
                  className="w-full bg-[#0E131F] border border-white/[0.1] rounded-lg px-2.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {targetLayerOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.title}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-2 bg-amber-950/30 border border-amber-800/40 rounded-lg text-amber-200 text-xs">
                  ⚠️ Belum ada layer katalog WMS yang aktif. Centang layer pada panel katalog di sisi kiri peta.
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="p-2.5 rounded-xl bg-slate-900/50 border border-white/[0.04] text-[11px] text-slate-400 space-y-1 leading-relaxed">
              <p className="font-bold text-slate-300">
                💡 Kalkulasi Spasial Polimorfik:
              </p>
              <ul className="list-disc list-inside text-[10px] text-slate-500 space-y-0.5">
                <li>Garis vs Poligon $\rightarrow$ Menghitung <strong>Panjang (KM/m)</strong></li>
                <li>Poligon vs Poligon $\rightarrow$ Menghitung <strong>Luas Irisan (Hektar)</strong></li>
                <li>Titik vs Poligon $\rightarrow$ Menghitung <strong>Jumlah Objek (Titik)</strong></li>
              </ul>
            </div>

            {/* Execute Analysis Action */}
            <Button
              onClick={handleExecuteAnalysis}
              disabled={isAnalyzing || targetLayerOptions.length === 0}
              className="w-full h-10 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl cursor-pointer transition-all shadow-xl shadow-amber-500/20"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw size={14} className="mr-2 animate-spin" />
                  Mengkalkulasi Irisan Spasial Antar Layer...
                </>
              ) : (
                <>
                  <Sparkles size={14} className="mr-2" />
                  Mulai Analisa Tumpang Tindih (Layer A vs B)
                </>
              )}
            </Button>
          </div>
        )}

        {/* ── TAB 2: RESULT SUMMARY ──────────────────────────────────────── */}
        {activeTab === "summary" && result && (
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar min-h-0">
            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-700/40 space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300 block truncate">
                  {result.primaryMetricTitle}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-amber-400 leading-none">
                    {result.primaryMetricFormatted}
                  </span>
                  <span className="text-xs font-semibold text-amber-200">
                    {result.primaryMetricUnit}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block font-mono">
                  {result.intersectingCount} objek beririsan
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/[0.06] space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                  {result.secondaryMetricTitle}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-white leading-none">
                    {result.secondaryMetricFormatted}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block font-mono">
                  dari {result.totalSourceItems} objek dianalisa
                </span>
              </div>
            </div>

            {/* Map Highlight Action Pill */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-white/[0.06]">
              <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1.5">
                <Flame size={14} className="text-amber-400" />
                Seluruh Geometri Irisan Disorot di Peta
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearHighlight}
                className="h-6 px-2 text-[10px] font-bold text-slate-400 hover:text-white"
              >
                Bersihkan
              </Button>
            </div>

            {/* Category Breakdown */}
            {result.categoryBreakdown.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Distribusi Tematik / Zonasi Target
                </span>
                <div className="space-y-1.5">
                  {result.categoryBreakdown.map((cat, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-900/60 border border-white/[0.04] flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-200 truncate">{cat.category}</p>
                        <span className="text-[10px] text-slate-400">{cat.count} objek terpotong</span>
                      </div>
                      <span className="font-mono font-black text-amber-400 text-sm">
                        {cat.formattedValue}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveTab("table")}
              className="w-full h-8 text-xs font-bold border-white/[0.1] bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer"
            >
              Lihat Rincian Objek Terpotong ({result.items.length})
            </Button>
          </div>
        )}

        {/* ── TAB 3: DATA TABLE OF INTERSECTING OBJECTS ───────────────────── */}
        {activeTab === "table" && result && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search & Filter Bar */}
            <div className="p-2.5 bg-slate-950/60 border-b border-white/[0.06] space-y-1.5 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                <Input
                  type="text"
                  placeholder="Cari nama objek Layer A / Layer B..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7 pl-7 pr-6 text-[10px] bg-[#0E131F] border-white/[0.08] text-white rounded-lg focus-visible:ring-amber-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category Filter Chips */}
              {result.categoryBreakdown.length > 1 && (
                <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => setTargetCategoryFilter("all")}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-bold transition-all cursor-pointer whitespace-nowrap",
                      targetCategoryFilter === "all"
                        ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                        : "bg-slate-900 border border-white/[0.06] text-slate-400 hover:text-slate-200"
                    )}
                  >
                    Semua ({result.items.length})
                  </button>
                  {result.categoryBreakdown.map((cat, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTargetCategoryFilter(cat.category)}
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold transition-all cursor-pointer whitespace-nowrap",
                        targetCategoryFilter === cat.category
                          ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                          : "bg-slate-900 border border-white/[0.06] text-slate-400 hover:text-slate-200"
                      )}
                    >
                      {cat.category} ({cat.count})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* List of Intersecting Objects */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scrollbar min-h-0">
              {filteredItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-900/60 border border-white/[0.04] hover:border-white/[0.12] transition-all space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-100 truncate leading-tight">
                        {item.sourceName}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {item.sourceType}
                      </span>
                    </div>

                    {onFocusGeometry && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onFocusGeometry(item.geometry)}
                        className="h-6 px-1.5 text-[10px] font-bold text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 rounded-md cursor-pointer shrink-0"
                      >
                        <MapPin size={11} className="mr-1" />
                        Fokus
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/[0.04]">
                    <div className="flex items-center gap-1.5 text-slate-400 truncate max-w-[220px]">
                      <Shapes size={11} className="text-cyan-400 shrink-0" />
                      <span className="truncate">{item.targetName}</span>
                    </div>
                    <span className="font-mono font-bold text-amber-400 shrink-0">
                      {item.metricFormatted}
                    </span>
                  </div>
                </div>
              ))}

              {filteredItems.length === 0 && (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Tidak ada objek yang sesuai dengan filter pencarian.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── FOOTER BAR ─────────────────────────────────────────────────── */}
        <div className="p-2 sm:p-2.5 bg-[#0C101A] border-t border-white/[0.08] flex items-center justify-between text-[10px] text-slate-500 font-medium shrink-0 pb-safe">
          <span>Mesin Spasial Turf.js</span>
          {result && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyReport}
              className="h-6 px-2 text-[10px] font-bold text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 rounded-md cursor-pointer"
            >
              <FileSpreadsheet size={11} className="mr-1" />
              Salin Dokumen Telaah
            </Button>
          )}
        </div>
          </>
        )}

      </div>
    </div>
  );
}
