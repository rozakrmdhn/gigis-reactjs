import { useState, useMemo } from "react";
import * as turf from "@turf/turf";
import {
  Layers,
  MapPin,
  Copy,
  Check,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  Info,
  Search,
  AlertTriangle,
  CheckCircle2,
  Compass,
  FileText,
  Table,
  Cpu,
  Layers2,
  TreePine,
  Flame,
  RefreshCw,
  Route,
  Shapes,
  Filter,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { cn, getProxiedLayerUrl } from "~/lib/utils";
import { toast } from "sonner";
import { useIsMobile } from "~/hooks/use-mobile";
import type { MapLayerConfig } from "~/features/peta/components/OpenLayersMap";

// Color Palette for Multi-Zone Overlap Identification
const ZONE_PALETTE = [
  { hex: "#f59e0b", name: "Amber", bg: "bg-amber-500", text: "text-amber-400", border: "border-amber-500", badgeBg: "bg-amber-950/60", badgeBorder: "border-amber-700/50" },
  { hex: "#06b6d4", name: "Cyan", bg: "bg-cyan-500", text: "text-cyan-400", border: "border-cyan-500", badgeBg: "bg-cyan-950/60", badgeBorder: "border-cyan-700/50" },
  { hex: "#ec4899", name: "Pink", bg: "bg-pink-500", text: "text-pink-400", border: "border-pink-500", badgeBg: "bg-pink-950/60", badgeBorder: "border-pink-700/50" },
  { hex: "#10b981", name: "Emerald", bg: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500", badgeBg: "bg-emerald-950/60", badgeBorder: "border-emerald-700/50" },
  { hex: "#8b5cf6", name: "Purple", bg: "bg-purple-500", text: "text-purple-400", border: "border-purple-500", badgeBg: "bg-purple-950/60", badgeBorder: "border-purple-700/50" },
  { hex: "#f97316", name: "Orange", bg: "bg-orange-500", text: "text-orange-400", border: "border-orange-500", badgeBg: "bg-orange-950/60", badgeBorder: "border-orange-700/50" },
  { hex: "#3b82f6", name: "Blue", bg: "bg-blue-500", text: "text-blue-400", border: "border-blue-500", badgeBg: "bg-blue-950/60", badgeBorder: "border-blue-700/50" },
];

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

// Accurately clips a LineString or MultiLineString geometry to only the portions
// strictly contained inside a Polygon or MultiPolygon geometry.
function clipLineWithPolygon(lineGeom: any, polyGeom: any): { geometry: any; lengthKm: number } | null {
  try {
    if (!lineGeom || !polyGeom) return null;
    const lineFeat = turf.feature(lineGeom);
    const polyFeat = turf.feature(polyGeom);

    // Fast check: If they don't intersect, exit early
    if (!turf.booleanIntersects(lineFeat, polyFeat)) {
      return null;
    }

    const insideLineSegments: any[] = [];

    // Method 1: Boundary Split & Midpoint in Polygon test
    let polyLines: any = null;
    try {
      polyLines = turf.polygonToLine(polyFeat);
    } catch (e) { }

    if (polyLines) {
      try {
        const splitResult = turf.lineSplit(lineFeat, polyLines);
        if (splitResult && splitResult.features && splitResult.features.length > 0) {
          for (const seg of splitResult.features) {
            const segLen = turf.length(seg, { units: "kilometers" });
            if (segLen <= 0.00005) continue;
            const midPt = turf.along(seg, segLen / 2, { units: "kilometers" });
            if (turf.booleanPointInPolygon(midPt, polyFeat)) {
              insideLineSegments.push(seg.geometry);
            }
          }
        }
      } catch (e) { }
    }

    // If split produced valid inside segments, merge into unified geometry
    if (insideLineSegments.length > 0) {
      const allCoords = insideLineSegments.flatMap((g) => {
        if (g.type === "LineString") return [g.coordinates];
        if (g.type === "MultiLineString") return g.coordinates;
        return [];
      });

      const unifiedGeom =
        allCoords.length === 1
          ? { type: "LineString" as const, coordinates: allCoords[0] }
          : { type: "MultiLineString" as const, coordinates: allCoords };

      const lenKm = turf.length(turf.feature(unifiedGeom), { units: "kilometers" });
      const roundedKm = Math.round(lenKm * 100) / 100;
      if (lenKm > 0.0005) {
        return {
          geometry: unifiedGeom,
          lengthKm: roundedKm || 0.01,
        };
      }
    }

    // Method 2: Check if entire line is inside polygon
    try {
      const rawCoords = lineGeom.type === "MultiLineString" ? lineGeom.coordinates[0] : lineGeom.coordinates;
      if (Array.isArray(rawCoords) && rawCoords.length >= 2) {
        const startPt = turf.point(rawCoords[0]);
        const endPt = turf.point(rawCoords[rawCoords.length - 1]);
        const midPt = turf.point(rawCoords[Math.floor(rawCoords.length / 2)]);
        if (
          turf.booleanPointInPolygon(startPt, polyFeat) &&
          turf.booleanPointInPolygon(endPt, polyFeat) &&
          turf.booleanPointInPolygon(midPt, polyFeat)
        ) {
          const lenKm = turf.length(lineFeat, { units: "kilometers" });
          return {
            geometry: lineGeom,
            lengthKm: Math.round(lenKm * 100) / 100 || 0.01,
          };
        }
      }
    } catch (e) { }

    // Method 3: Segment-by-segment sampling for complex multipolygons
    try {
      const rawCoords = lineGeom.type === "MultiLineString" ? lineGeom.coordinates.flat() : lineGeom.coordinates;
      if (Array.isArray(rawCoords) && rawCoords.length >= 2) {
        const collectedSegs: any[] = [];
        let currentRun: any[] = [];

        for (let i = 0; i < rawCoords.length - 1; i++) {
          const p1 = rawCoords[i];
          const p2 = rawCoords[i + 1];
          const mid = turf.point([(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]);
          const isInside =
            turf.booleanPointInPolygon(mid, polyFeat) ||
            (turf.booleanPointInPolygon(turf.point(p1), polyFeat) && turf.booleanPointInPolygon(turf.point(p2), polyFeat));

          if (isInside) {
            if (currentRun.length === 0) {
              currentRun.push(p1);
            }
            currentRun.push(p2);
          } else {
            if (currentRun.length >= 2) {
              collectedSegs.push([...currentRun]);
            }
            currentRun = [];
          }
        }
        if (currentRun.length >= 2) {
          collectedSegs.push(currentRun);
        }

        if (collectedSegs.length > 0) {
          const sampledGeom =
            collectedSegs.length === 1
              ? { type: "LineString" as const, coordinates: collectedSegs[0] }
              : { type: "MultiLineString" as const, coordinates: collectedSegs };

          const lenKm = turf.length(turf.feature(sampledGeom), { units: "kilometers" });
          if (lenKm > 0.0005) {
            return {
              geometry: sampledGeom,
              lengthKm: Math.round(lenKm * 100) / 100 || 0.01,
            };
          }
        }
      }
    } catch (e) { }

    return null;
  } catch (e) {
    console.error("Gagal melakukan kliping garis dengan poligon:", e);
    return null;
  }
}

export interface InspectedFeature {
  id: string;
  layerId?: string;
  title: string;
  layerTitle: string;
  type: "vector" | "wms" | "admin" | "infra";
  badgeText: string;
  badgeColor?: string;
  properties: Record<string, any>;
  coordinate: [number, number]; // [lat, lon]
  geometry?: any;
}

interface SpatialInspectorProps {
  features: InspectedFeature[];
  coordinate: [number, number] | null; // [lat, lon]
  isOpen: boolean;
  onClose: () => void;
  onFocusFeature?: (feature: InspectedFeature) => void;
  activeLayers?: MapLayerConfig[];
  onHighlightGeometryChange?: (geojson: any | null) => void;
  onFitOverlap?: () => void;
}

type TabType = "overlap" | "cross" | "matrix" | "detail";
type MobileSheetHeight = "peek" | "half" | "full";

export interface SingleOverlapZoneItem {
  id: string;
  name: string;
  category: string;
  valueFormatted: string;
  valueNumeric: number;
  pctOfOverlap: number;
  color: string;
  geometry: any;
  feature: any;
}

export function SpatialInspector({
  features = [],
  coordinate,
  isOpen,
  onClose,
  onFocusFeature,
  activeLayers = [],
  onHighlightGeometryChange,
  onFitOverlap,
}: SpatialInspectorProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<TabType>("overlap");
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [filterQuery, setFilterQuery] = useState<string>("");
  const [attributeCategoryFilter, setAttributeCategoryFilter] = useState<string>("all");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [mobileSheetState, setMobileSheetState] = useState<MobileSheetHeight>("half");

  // Single-Feature Overlap State
  const [selectedTargetLayerId, setSelectedTargetLayerId] = useState<string>(
    activeLayers.find((l) => l.type === "wms")?.id || activeLayers[0]?.id || ""
  );
  const [isCalculatingOverlap, setIsCalculatingOverlap] = useState<boolean>(false);
  const [selectedZoneIndex, setSelectedZoneIndex] = useState<number | null>(null);
  const [singleOverlapResult, setSingleOverlapResult] = useState<{
    targetTitle: string;
    geomType: "line" | "poly" | "point";
    totalValueFormatted: string;
    totalValueNumeric: number;
    unit: string;
    percentage: number;
    breakdown: SingleOverlapZoneItem[];
    combinedGeometry: any;
  } | null>(null);

  // Available Target Layers for Single Feature Overlap
  const availableTargetLayers = useMemo(() => {
    return activeLayers.filter((l) => l.type === "wms" || l.type === "vector");
  }, [activeLayers]);

  // Automated Cross-Layer Synthesis & Diagnostic Insights
  const crossInsights = useMemo(() => {
    if (!features || !Array.isArray(features) || features.length === 0) return [];
    const insights: { type: "warning" | "success" | "info"; title: string; desc: string }[] = [];

    const roadFeat = features.find(
      (f) =>
        f?.type === "infra" ||
        f?.layerTitle?.toLowerCase().includes("segmen") ||
        f?.layerTitle?.toLowerCase().includes("poros") ||
        f?.properties?.nama_ruas ||
        f?.properties?.nama_segmen
    );

    const wmsLayers = features.filter((f) => f?.type === "wms" || f?.layerId?.startsWith("layer-") || f?.layerId?.startsWith("geonode-"));
    const adminFeat = features.find((f) => f?.layerTitle?.toLowerCase().includes("desa") || f?.layerTitle?.toLowerCase().includes("kecamatan"));

    if (roadFeat) {
      const roadName = roadFeat.properties?.nama_ruas || roadFeat.properties?.nama_segmen || roadFeat.title;
      const kondisi = (roadFeat.properties?.kondisi || roadFeat.properties?.KONDISI || "").toLowerCase();
      const perkerasan = roadFeat.properties?.jenis_perkerasan || roadFeat.properties?.perkerasan || "Belum terdata";

      if (kondisi.includes("rusak")) {
        insights.push({
          type: "warning",
          title: "Prioritas Penanganan Infrastruktur",
          desc: `Ruas "${roadName}" berstatus ${kondisi.toUpperCase()} (Konstruksi: ${perkerasan}). Memerlukan pemeliharaan/peningkatan struktur.`,
        });
      } else {
        insights.push({
          type: "success",
          title: "Kondisi Infrastruktur Mantap",
          desc: `Ruas "${roadName}" dalam kondisi ${kondisi.toUpperCase() || "BAIK"} dengan tipe perkerasan ${perkerasan}.`,
        });
      }
    }

    if (wmsLayers.length > 0) {
      wmsLayers.forEach((wms) => {
        const props = wms.properties || {};
        const layerName = wms.layerTitle || wms.title;

        const hasHazard = Object.entries(props).some(([k, v]) => {
          const valStr = String(v).toLowerCase();
          const keyStr = k.toLowerCase();
          return (
            keyStr.includes("rawan") ||
            keyStr.includes("banjir") ||
            keyStr.includes("longsor") ||
            keyStr.includes("bencana") ||
            valStr.includes("tinggi") ||
            valStr.includes("sedang") ||
            valStr.includes("rawan")
          );
        });

        if (hasHazard) {
          insights.push({
            type: "warning",
            title: `Kerawanan Spasial (${layerName})`,
            desc: `Lokasi beririsan dengan kawasan bertematik risiko pada dataset "${layerName}". Perhatikan drainase dan konstruksi penahan.`,
          });
        } else {
          insights.push({
            type: "info",
            title: `Katalog Tematik: ${layerName}`,
            desc: `Objek teridentifikasi: ${wms.title}. Informasi atribut terhubung dengan GeoNode Bojonegoro.`,
          });
        }
      });
    }

    if (adminFeat) {
      const desaName = adminFeat.properties?.nama_desa || adminFeat.properties?.NAMOBJ || adminFeat.title;
      const kecName = adminFeat.properties?.nama_kecamatan || adminFeat.properties?.WADMKC || "";
      insights.push({
        type: "info",
        title: "Wilayah Administrasi",
        desc: `Berada di wilayah yurisdiksi ${desaName}${kecName ? `, Kec. ${kecName}` : ""}.`,
      });
    }

    if (insights.length === 0) {
      insights.push({
        type: "info",
        title: "Identifikasi Fitur Tunggal",
        desc: `Terdeteksi 1 objek spasial pada koordinat ini. Aktifkan lebih banyak layer katalog WMS untuk analisa silang mendalam.`,
      });
    }

    return insights;
  }, [features]);

  if (!isOpen || !coordinate || !features || !Array.isArray(features) || features.length === 0) return null;

  const currentFeature = (features[selectedIndex] || features[0]) as InspectedFeature | undefined;
  if (!currentFeature) return null;

  const coordString = `${coordinate[0].toFixed(5)}, ${coordinate[1].toFixed(5)}`;

  // Calculate Overlap for THIS Specific Clicked Feature vs Selected Target Layer
  const handleCalculateSingleFeatureOverlap = async () => {
    let sourceGeom = normalizeToLonLat(currentFeature.geometry);
    if (!sourceGeom && coordinate) {
      sourceGeom = turf.point([coordinate[1], coordinate[0]]).geometry;
    }

    if (!sourceGeom) {
      toast.error("Geometri objek terklik tidak tersedia untuk kalkulasi irisan.");
      return;
    }

    const targetLayer = availableTargetLayers.find((l) => l.id === selectedTargetLayerId);
    if (!targetLayer) {
      toast.error("Silakan pilih layer pembanding");
      return;
    }

    setIsCalculatingOverlap(true);
    setSingleOverlapResult(null);
    setSelectedZoneIndex(null);

    try {
      let targetPolygons: any[] = [];

      if (targetLayer.type === "vector" && targetLayer.data?.features) {
        targetPolygons = targetLayer.data.features;
      } else if (targetLayer.url) {
        let bboxParam: string | null = null;
        try {
          const rawBbox = turf.bbox(sourceGeom);
          const margin = 0.015;
          const minX = rawBbox[0] - margin;
          const minY = rawBbox[1] - margin;
          const maxX = rawBbox[2] + margin;
          const maxY = rawBbox[3] + margin;
          bboxParam = `${minX},${minY},${maxX},${maxY}`;
        } catch (e) { }

        const layerName = targetLayer.params?.LAYERS || targetLayer.id.replace("layer-", "");

        // Attempt with BBOX
        const wfsUrl = new URL(targetLayer.url, window.location.origin);
        wfsUrl.searchParams.set("service", "WFS");
        wfsUrl.searchParams.set("version", "1.0.0");
        wfsUrl.searchParams.set("request", "GetFeature");
        wfsUrl.searchParams.set("typeName", layerName);
        wfsUrl.searchParams.set("outputFormat", "application/json");
        wfsUrl.searchParams.set("srsName", "EPSG:4326");
        if (bboxParam) {
          wfsUrl.searchParams.set("bbox", bboxParam);
        }

        try {
          const proxiedUrl = getProxiedLayerUrl(wfsUrl.toString());
          const response = await fetch(proxiedUrl);
          if (response.ok) {
            const data = await response.json();
            if (data && Array.isArray(data.features) && data.features.length > 0) {
              targetPolygons = data.features;
            }
          }
        } catch (e) { }

        // Fallback without BBOX if 0 features returned
        if (targetPolygons.length === 0) {
          try {
            const fallbackUrl = new URL(targetLayer.url, window.location.origin);
            fallbackUrl.searchParams.set("service", "WFS");
            fallbackUrl.searchParams.set("version", "1.0.0");
            fallbackUrl.searchParams.set("request", "GetFeature");
            fallbackUrl.searchParams.set("typeName", layerName);
            fallbackUrl.searchParams.set("outputFormat", "application/json");
            fallbackUrl.searchParams.set("srsName", "EPSG:4326");
            fallbackUrl.searchParams.set("maxFeatures", "500");

            const proxiedUrl = getProxiedLayerUrl(fallbackUrl.toString());
            const response = await fetch(proxiedUrl);
            if (response.ok) {
              const data = await response.json();
              if (data && Array.isArray(data.features)) {
                targetPolygons = data.features;
              }
            }
          } catch (e) { }
        }
      }

      if (targetPolygons.length === 0) {
        toast.warning(`Tidak dapat memuat data poligon dari layer "${targetLayer.title}".`);
        setIsCalculatingOverlap(false);
        return;
      }

      const geomType = (sourceGeom?.type || "").toLowerCase();
      const isLine = geomType.includes("line");
      const isPoint = geomType.includes("point");
      const isPoly = !isLine && !isPoint;

      const breakdown: SingleOverlapZoneItem[] = [];
      const overlapFeatures: any[] = [];

      if (isLine) {
        let totalLenKm = 0;
        const fullRoadLenKm =
          (currentFeature.properties?.panjang ? currentFeature.properties.panjang / 1000 : 0) ||
          turf.length(turf.feature(sourceGeom), { units: "kilometers" }) ||
          0.01;

        // Group and consolidate clipped line segments by zone name
        const zoneMap = new Map<string, {
          name: string;
          category: string;
          totalLengthKm: number;
          geometries: any[];
        }>();

        targetPolygons.forEach((polyFeat, idx) => {
          if (!polyFeat || !polyFeat.geometry) return;
          const normalizedPoly = normalizeToLonLat(polyFeat.geometry);
          try {
            const clipped = clipLineWithPolygon(sourceGeom, normalizedPoly);
            if (clipped && clipped.lengthKm > 0) {
              const p = polyFeat.properties || {};
              const name = p.nama || p.NAMOBJ || p.pola_ruang || p.kategori || p.zona || `Zona ${idx + 1}`;
              const cat = p.kategori || p.fungsi || p.zona || "Pola Ruang";
              const key = `${name}___${cat}`;

              if (!zoneMap.has(key)) {
                zoneMap.set(key, {
                  name,
                  category: cat,
                  totalLengthKm: 0,
                  geometries: [],
                });
              }

              const entry = zoneMap.get(key)!;
              entry.totalLengthKm += clipped.lengthKm;
              entry.geometries.push(clipped.geometry);
            }
          } catch (e) { }
        });

        if (zoneMap.size === 0) {
          toast.info(`Objek "${currentFeature.title}" tidak beririsan dengan zona pada "${targetLayer.title}".`);
          setIsCalculatingOverlap(false);
          return;
        }

        Array.from(zoneMap.values()).forEach((zoneData) => {
          const roundedKm = Math.round(zoneData.totalLengthKm * 100) / 100 || 0.01;
          totalLenKm += roundedKm;
          const colorInfo = ZONE_PALETTE[breakdown.length % ZONE_PALETTE.length];

          const allCoords = zoneData.geometries.flatMap((g) => {
            if (g.type === "LineString") return [g.coordinates];
            if (g.type === "MultiLineString") return g.coordinates;
            return [];
          });

          const unifiedGeom =
            allCoords.length === 1
              ? { type: "LineString" as const, coordinates: allCoords[0] }
              : { type: "MultiLineString" as const, coordinates: allCoords };

          const featObj = {
            type: "Feature" as const,
            geometry: unifiedGeom,
            properties: {
              color: colorInfo.hex,
              name: `${zoneData.name} (${roundedKm} KM)`,
              zoneName: zoneData.name,
              category: zoneData.category,
            },
          };

          overlapFeatures.push(featObj);

          breakdown.push({
            id: `zone-${breakdown.length}`,
            name: zoneData.name,
            category: zoneData.category,
            valueFormatted: `${roundedKm} KM`,
            valueNumeric: roundedKm,
            pctOfOverlap: 0,
            color: colorInfo.hex,
            geometry: unifiedGeom,
            feature: featObj,
          });
        });

        const totalKm = Math.round(totalLenKm * 100) / 100;
        const totalFullKm = Math.round(fullRoadLenKm * 100) / 100;
        const pct = totalFullKm > 0 ? Math.min(100, Math.round((totalKm / totalFullKm) * 100)) : 0;

        breakdown.forEach((b) => {
          b.pctOfOverlap = totalKm > 0 ? Math.round((b.valueNumeric / totalKm) * 100) : Math.round(100 / breakdown.length);
        });

        const combinedGeometry = {
          type: "FeatureCollection" as const,
          features: overlapFeatures,
        };

        if (onHighlightGeometryChange) {
          onHighlightGeometryChange(combinedGeometry);
        }

        setSingleOverlapResult({
          targetTitle: targetLayer.title,
          geomType: "line",
          totalValueFormatted: `${totalKm} KM`,
          totalValueNumeric: totalKm,
          unit: "KM",
          percentage: pct,
          breakdown,
          combinedGeometry,
        });

        toast.success(`Ruas ini menembus ${breakdown.length} zona ${targetLayer.title}: ${totalKm} KM (${pct}%)`);
      } else if (isPoly) {
        let totalOverlapM2 = 0;
        const fullAreaM2 = turf.area(sourceGeom);

        // Group and consolidate polygon intersections by zone name
        const polyZoneMap = new Map<string, {
          name: string;
          category: string;
          totalAreaM2: number;
          geometries: any[];
        }>();

        targetPolygons.forEach((polyFeat, idx) => {
          if (!polyFeat || !polyFeat.geometry) return;
          const normalizedPoly = normalizeToLonLat(polyFeat.geometry);
          try {
            if (turf.booleanIntersects(sourceGeom, normalizedPoly)) {
              const intersected = turf.intersect(turf.featureCollection([sourceGeom, normalizedPoly]));
              if (intersected) {
                const areaM2 = turf.area(intersected);
                const p = polyFeat.properties || {};
                const name = p.nama || p.NAMOBJ || p.pola_ruang || p.zona || `Zona ${idx + 1}`;
                const cat = p.kategori || p.fungsi || "Tematik";
                const key = `${name}___${cat}`;

                if (!polyZoneMap.has(key)) {
                  polyZoneMap.set(key, {
                    name,
                    category: cat,
                    totalAreaM2: 0,
                    geometries: [],
                  });
                }

                const entry = polyZoneMap.get(key)!;
                entry.totalAreaM2 += areaM2;
                entry.geometries.push(intersected.geometry);
              }
            }
          } catch (e) { }
        });

        if (polyZoneMap.size === 0) {
          toast.info(`Objek "${currentFeature.title}" tidak beririsan dengan zona pada "${targetLayer.title}".`);
          setIsCalculatingOverlap(false);
          return;
        }

        Array.from(polyZoneMap.values()).forEach((zoneData) => {
          const areaHa = Math.round((zoneData.totalAreaM2 / 10000) * 100) / 100 || 0.01;
          totalOverlapM2 += zoneData.totalAreaM2;
          const colorInfo = ZONE_PALETTE[breakdown.length % ZONE_PALETTE.length];

          const allCoords = zoneData.geometries.flatMap((g) => {
            if (g.type === "Polygon") return [g.coordinates];
            if (g.type === "MultiPolygon") return g.coordinates;
            return [];
          });

          const unifiedGeom =
            allCoords.length === 1
              ? { type: "Polygon" as const, coordinates: allCoords[0] }
              : { type: "MultiPolygon" as const, coordinates: allCoords };

          const featObj = {
            type: "Feature" as const,
            geometry: unifiedGeom,
            properties: {
              color: colorInfo.hex,
              name: `${zoneData.name} (${areaHa} Ha)`,
              zoneName: zoneData.name,
              category: zoneData.category,
            },
          };

          overlapFeatures.push(featObj);

          breakdown.push({
            id: `zone-${breakdown.length}`,
            name: zoneData.name,
            category: zoneData.category,
            valueFormatted: `${areaHa} Ha`,
            valueNumeric: areaHa,
            pctOfOverlap: 0,
            color: colorInfo.hex,
            geometry: unifiedGeom,
            feature: featObj,
          });
        });

        const totalHa = Math.round((totalOverlapM2 / 10000) * 100) / 100;
        const totalFullHa = Math.round((fullAreaM2 / 10000) * 100) / 100;
        const pct = totalFullHa > 0 ? Math.min(100, Math.round((totalHa / totalFullHa) * 100)) : 0;

        breakdown.forEach((b) => {
          b.pctOfOverlap = totalHa > 0 ? Math.round((b.valueNumeric / totalHa) * 100) : Math.round(100 / breakdown.length);
        });

        const combinedGeometry = {
          type: "FeatureCollection" as const,
          features: overlapFeatures,
        };

        if (onHighlightGeometryChange) {
          onHighlightGeometryChange(combinedGeometry);
        }

        setSingleOverlapResult({
          targetTitle: targetLayer.title,
          geomType: "poly",
          totalValueFormatted: `${totalHa} Ha`,
          totalValueNumeric: totalHa,
          unit: "Hektar",
          percentage: pct,
          breakdown,
          combinedGeometry,
        });

        toast.success(`Luas irisan: ${totalHa} Ha pada ${breakdown.length} zona.`);
      } else {
        targetPolygons.forEach((polyFeat, idx) => {
          if (!polyFeat || !polyFeat.geometry) return;
          const normalizedPoly = normalizeToLonLat(polyFeat.geometry);
          try {
            if (turf.booleanPointInPolygon(sourceGeom, normalizedPoly)) {
              const p = polyFeat.properties || {};
              const name = p.nama || p.NAMOBJ || p.pola_ruang || `Zona ${idx + 1}`;
              const cat = p.kategori || p.fungsi || "Zonasi";
              const colorInfo = ZONE_PALETTE[breakdown.length % ZONE_PALETTE.length];

              const featObj = {
                type: "Feature" as const,
                geometry: sourceGeom,
                properties: {
                  color: colorInfo.hex,
                  name: name,
                  zoneName: name,
                  category: cat,
                },
              };

              overlapFeatures.push(featObj);

              breakdown.push({
                id: `zone-${breakdown.length}`,
                name,
                category: cat,
                valueFormatted: "Di dalam kawasan",
                valueNumeric: 1,
                pctOfOverlap: 100,
                color: colorInfo.hex,
                geometry: sourceGeom,
                feature: featObj,
              });
            }
          } catch (e) { }
        });

        if (breakdown.length === 0) {
          toast.info(`Titik ini tidak berada di dalam poligon layer "${targetLayer.title}".`);
          setIsCalculatingOverlap(false);
          return;
        }

        const combinedGeometry = {
          type: "FeatureCollection" as const,
          features: overlapFeatures,
        };

        if (onHighlightGeometryChange) {
          onHighlightGeometryChange(combinedGeometry);
        }

        setSingleOverlapResult({
          targetTitle: targetLayer.title,
          geomType: "point",
          totalValueFormatted: `${breakdown.length} Kawasan`,
          totalValueNumeric: breakdown.length,
          unit: "Kawasan",
          percentage: 100,
          breakdown,
          combinedGeometry,
        });

        toast.success(`Titik berada di dalam ${breakdown.length} zona kawasan.`);
      }
    } catch (err) {
      console.error("Gagal menghitung irisan objek tunggal:", err);
      toast.error("Gagal memproses kalkulasi irisan spasial objek ini.");
    } finally {
      setIsCalculatingOverlap(false);
    }
  };

  // Focus / Highlight a Specific Zone Item
  const handleSelectZone = (zoneIndex: number) => {
    if (!singleOverlapResult) return;

    if (selectedZoneIndex === zoneIndex) {
      // Toggle off to show all
      setSelectedZoneIndex(null);
      if (onHighlightGeometryChange) {
        onHighlightGeometryChange(singleOverlapResult.combinedGeometry);
      }
      toast.info("Menampilkan seluruh zona yang beririsan.");
    } else {
      setSelectedZoneIndex(zoneIndex);
      const zoneItem = singleOverlapResult.breakdown[zoneIndex];
      if (zoneItem && onHighlightGeometryChange) {
        onHighlightGeometryChange({
          type: "FeatureCollection",
          features: [zoneItem.feature],
        });
        toast.success(`Sorotan difokuskan ke: "${zoneItem.name}" (${zoneItem.valueFormatted})`);
      }
    }
  };

  const handleClearHighlight = () => {
    setSelectedZoneIndex(null);
    setSingleOverlapResult(null);
    if (onHighlightGeometryChange) {
      onHighlightGeometryChange(null);
    }
    toast.info("Sorotan irisan dibersihkan dari peta.");
  };

  const handleCopyReport = () => {
    let report = `📊 *LAPORAN ANALISA SILANG & OVERLAP FITUR TERPILIH*\n`;
    report += `📍 Koordinat: ${coordString}\n`;
    report += `🎯 Objek Terpilih: ${currentFeature.title} (${currentFeature.layerTitle})\n`;
    report += `🗂️ Total Layer Beririsan di Titik Ini: ${(features || []).length} Layer\n`;
    report += `────────────────────────────\n`;

    if (singleOverlapResult) {
      report += `\n📐 *Hasil Analisa Tumpang Tindih Objek Ini:*\n`;
      report += `  • Layer Pembanding: ${singleOverlapResult.targetTitle}\n`;
      report += `  • Nilai Total Irisan: ${singleOverlapResult.totalValueFormatted} (${singleOverlapResult.percentage}% dari objek)\n`;
      report += `  • Rincian Kawasan/Zona yang Ditembus:\n`;
      singleOverlapResult.breakdown.forEach((b, idx) => {
        report += `    [${idx + 1}] ${b.name}: ${b.valueFormatted} (${b.pctOfOverlap}% dari irisan) [${b.category}]\n`;
      });
      report += `\n`;
    }

    report += `🧠 *Kesimpulan Analisa Silang:*\n`;
    crossInsights.forEach((ins) => {
      report += `• ${ins.title}: ${ins.desc}\n`;
    });

    navigator.clipboard.writeText(report);
    setCopied(true);
    toast.success("Laporan telaah fitur berhasil disalin!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Attribute Categorization and Filter
  const allAttributes = Object.entries(currentFeature?.properties || {}).filter(
    ([key]) => !["geometry", "_layer", "bbox", "fid", "id", "layer_id"].includes(key.toLowerCase())
  );

  const filteredProperties = allAttributes.filter(([key, val]) => {
    if (filterQuery) {
      const q = filterQuery.toLowerCase();
      const matchKey = key.toLowerCase().includes(q);
      const matchVal = String(val || "").toLowerCase().includes(q);
      if (!matchKey && !matchVal) return false;
    }

    if (attributeCategoryFilter === "fisik") {
      const k = key.toLowerCase();
      return k.includes("kondisi") || k.includes("lebar") || k.includes("panjang") || k.includes("perkerasan") || k.includes("tipe");
    }
    if (attributeCategoryFilter === "admin") {
      const k = key.toLowerCase();
      return k.includes("desa") || k.includes("kecamatan") || k.includes("kabupaten") || k.includes("provinsi") || k.includes("wadm");
    }
    if (attributeCategoryFilter === "teknis") {
      const k = key.toLowerCase();
      return k.includes("kode") || k.includes("tahun") || k.includes("sumber") || k.includes("status") || k.includes("ruas");
    }

    return true;
  });

  const formatValue = (key: string, value: any) => {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "number") {
      return value.toLocaleString("id-ID", { maximumFractionDigits: 2 });
    }
    if (typeof value === "boolean") {
      return value ? "Ya" : "Tidak";
    }
    return String(value);
  };

  // UI Tabs Definition
  const tabsList: { id: TabType; label: string; icon: any; count?: number; accent: string }[] = [
    { id: "overlap", label: "Overlap", icon: Layers2, accent: "amber" },
    { id: "cross", label: "Sintesis", icon: Sparkles, count: crossInsights.length, accent: "emerald" },
    { id: "matrix", label: "Matriks", icon: Table, count: features.length, accent: "cyan" },
    { id: "detail", label: "Atribut", icon: FileText, count: allAttributes.length, accent: "indigo" },
  ];

  return (
    <div
      className={cn(
        "fixed sm:absolute z-30 transition-all duration-300 select-none",
        // Desktop Layout
        "sm:bottom-6 sm:right-4 sm:left-auto sm:top-auto",
        isExpanded
          ? "sm:top-20 sm:w-[500px] sm:max-h-none sm:h-[calc(100vh-6rem)]"
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
              <Sparkles size={14} />
            </div>
            <div className="leading-tight truncate">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-black text-white tracking-tight">
                  Inspektor Spasial
                </h3>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-white/[0.08]">
                  {features.length} Layer
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono">
                {coordString}
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
              title="Salin Laporan Lengkap"
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
                handleClearHighlight();
                onClose();
              }}
              title="Tutup Analisa"
            >
              <X size={14} />
            </Button>
          </div>
        </div>

        {/* If Mobile and in "peek" state, don't show full contents */}
        {!(isMobile && mobileSheetState === "peek") && (
          <>
            {/* ── REDESIGNED SEGMENTED TAB MENU (RESPONSIVE) ──────────────────── */}
            <div className="px-2.5 sm:px-3 pt-2 pb-1.5 bg-[#090D16] border-b border-white/[0.06] shrink-0">
              <div className="grid grid-cols-4 gap-1 p-0.5 sm:p-1 bg-slate-950/80 rounded-xl border border-white/[0.06]">
                {tabsList.map((t) => {
                  const IconComp = t.icon;
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab(t.id)}
                      className={cn(
                        "py-1.5 px-1 rounded-lg text-[10px] sm:text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 leading-none text-center relative",
                        isActive
                          ? "bg-slate-800 text-white shadow-sm border border-white/[0.1]"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                      )}
                    >
                      <IconComp
                        size={11}
                        className={cn(
                          isActive
                            ? t.accent === "amber"
                              ? "text-amber-400"
                              : t.accent === "emerald"
                                ? "text-emerald-400"
                                : t.accent === "cyan"
                                  ? "text-cyan-400"
                                  : "text-indigo-400"
                            : "text-slate-500"
                        )}
                      />
                      <span className="truncate">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── TAB 1: OVERLAP RUAS (MULTI-ZONE OVERLAP EXPLORER) ───────────── */}
            {activeTab === "overlap" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar min-h-0 touch-pan-y">
                {/* Selected Feature Card */}
                <div className="p-3 bg-slate-900/90 border border-white/[0.08] rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                      Objek Terpilih:
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-amber-300 border border-white/[0.08]">
                      {currentFeature.layerTitle}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-xs font-bold text-white leading-snug truncate">
                    {currentFeature.title}
                  </h4>
                </div>

                {/* Target Layer Selector & Filter Box */}
                <div className="p-3 bg-slate-900/70 border border-white/[0.08] rounded-xl space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Layer Pembanding (Pola Ruang / Hutan / Tematik):
                  </span>

                  {availableTargetLayers.length > 0 ? (
                    <select
                      value={selectedTargetLayerId}
                      onChange={(e) => setSelectedTargetLayerId(e.target.value)}
                      className="w-full bg-[#0E131F] border border-white/[0.1] rounded-lg px-2.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {availableTargetLayers.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.title} {l.type === "wms" ? "(WMS)" : "(Vektor)"}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-2 bg-amber-950/30 border border-amber-800/40 rounded-lg text-amber-200 text-xs">
                      ⚠️ Belum ada layer katalog WMS aktif.
                    </div>
                  )}

                  <Button
                    size="sm"
                    onClick={handleCalculateSingleFeatureOverlap}
                    disabled={isCalculatingOverlap || availableTargetLayers.length === 0}
                    className="w-full h-9 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl cursor-pointer transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98]"
                  >
                    {isCalculatingOverlap ? (
                      <>
                        <RefreshCw size={13} className="mr-1.5 animate-spin" />
                        Mengkalkulasi Irisan...
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} className="mr-1.5" />
                        Hitung Overlap Ruas / Objek Ini
                      </>
                    )}
                  </Button>
                </div>

                {/* Overlap Result Cards */}
                {singleOverlapResult && (
                  <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200 pb-2">
                    {/* Primary Metric KPI Box */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-700/40 space-y-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300 block">
                          Data Beririsan
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-black text-amber-400 leading-none">
                            {singleOverlapResult.totalValueFormatted}
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/[0.06] space-y-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                          Rasio Terdampak
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-black text-white leading-none">
                            {singleOverlapResult.percentage}%
                          </span>
                          <span className="text-[10px] text-slate-400">dari objek</span>
                        </div>
                      </div>
                    </div>

                    {/* Highlight Status & Clear Toggle Bar */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-white/[0.08]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-[10px] text-slate-300 font-bold">
                          {selectedZoneIndex !== null
                            ? `Menyorot 1 Zona: "${singleOverlapResult.breakdown[selectedZoneIndex]?.name}"`
                            : `Menyorot ${singleOverlapResult.breakdown.length} Zona Berbeda di Peta`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {selectedZoneIndex !== null && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedZoneIndex(null);
                              if (onHighlightGeometryChange) {
                                onHighlightGeometryChange(singleOverlapResult.combinedGeometry);
                              }
                            }}
                            className="h-6 px-2 text-[10px] font-bold text-amber-400 hover:text-white"
                          >
                            Semua Zona
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleClearHighlight}
                          className="h-6 px-2 text-[10px] font-bold text-slate-400 hover:text-white"
                        >
                          Bersihkan
                        </Button>
                      </div>
                    </div>

                    {/* Interactive Detailed Zone Breakdown List */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between px-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                          Rincian & Letak Zona ({singleOverlapResult.breakdown.length})
                        </span>
                        <span className="text-[9px] text-slate-400">
                          Pilih baris untuk sorot segmen di peta
                        </span>
                      </div>

                      <div className="space-y-2">
                        {singleOverlapResult.breakdown.map((zone, idx) => {
                          const isSelected = selectedZoneIndex === idx;
                          return (
                            <div
                              key={zone.id}
                              onClick={() => handleSelectZone(idx)}
                              className={cn(
                                "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group relative overflow-hidden",
                                isSelected
                                  ? "bg-[#0E1526] border-2 shadow-lg shadow-black/40"
                                  : "bg-[#0B101D] border-white/[0.08] hover:bg-slate-900 hover:border-white/[0.18]"
                              )}
                              style={{
                                borderColor: isSelected ? zone.color : undefined,
                              }}
                            >
                              {/* Left Color Indicator Bar */}
                              <div
                                className="absolute left-0 top-0 bottom-0 w-1"
                                style={{ backgroundColor: zone.color }}
                              />

                              {/* Index & Zone Info */}
                              <div className="flex items-center gap-2.5 min-w-0 flex-1 pl-1">
                                <div
                                  className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center text-[10px] font-black text-slate-950 shadow-sm"
                                  style={{ backgroundColor: zone.color }}
                                >
                                  {idx + 1}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <h5 className={cn(
                                    "font-bold text-xs leading-snug line-clamp-1 transition-colors",
                                    isSelected ? "text-white" : "text-slate-200 group-hover:text-white"
                                  )}>
                                    {zone.name}
                                  </h5>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                    <span className="font-medium">{zone.category}</span>
                                    <span className="text-slate-600">•</span>
                                    <span className="font-mono text-slate-400">
                                      Porsi: {zone.pctOfOverlap}%
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Right Value & Interactive Pill */}
                              <div className="flex items-center gap-2.5 shrink-0">
                                <span
                                  className="font-mono font-black text-xs tracking-tight"
                                  style={{ color: zone.color }}
                                >
                                  {zone.valueFormatted}
                                </span>

                                <div
                                  className={cn(
                                    "h-7 px-2.5 rounded-lg flex items-center gap-1 text-[10px] font-bold border transition-all",
                                    isSelected
                                      ? "bg-white text-slate-950 border-white shadow-sm"
                                      : "bg-slate-950/80 border-white/[0.08] text-slate-400 group-hover:text-white group-hover:border-white/[0.2]"
                                  )}
                                >
                                  <Eye size={12} />
                                  <span>{isSelected ? "Disorot" : "Sorot"}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {!singleOverlapResult && (
                  <div className="py-6 text-center text-slate-500 space-y-1.5">
                    <Layers2 className="w-6 h-6 mx-auto text-slate-600 mb-1" />
                    <p className="text-xs font-semibold text-slate-400">Analisis Irisan Multi-Zona</p>
                    <p className="text-[10px] text-slate-500 max-w-[250px] mx-auto leading-relaxed">
                      Pilih layer tematik (seperti Pola Ruang) untuk mengetahui bagian ruas jalan mana saja yang menembus kawasan tertentu beserta panjangnya.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 2: SINTESIS ANALISA SILANG ─────────────────────────────── */}
            {activeTab === "cross" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar min-h-0 touch-pan-y">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Cpu size={12} className="text-emerald-400" />
                      Kesimpulan Spasial Otomatis
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400">
                      {crossInsights.length} Analisis
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {crossInsights.map((ins, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-2.5 rounded-xl border text-xs leading-relaxed space-y-1 transition-all",
                          ins.type === "warning"
                            ? "bg-amber-950/30 border-amber-800/40 text-amber-200"
                            : ins.type === "success"
                              ? "bg-emerald-950/30 border-emerald-800/40 text-emerald-200"
                              : "bg-slate-900/80 border-white/[0.06] text-slate-300"
                        )}
                      >
                        <div className="flex items-center gap-1.5 font-bold">
                          {ins.type === "warning" ? (
                            <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                          ) : ins.type === "success" ? (
                            <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                          ) : (
                            <Info size={13} className="text-cyan-400 shrink-0" />
                          )}
                          <span className="truncate">{ins.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">{ins.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 3: MATRIKS LAYER ────────────────────────────────────────── */}
            {activeTab === "matrix" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar min-h-0 touch-pan-y">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Perbandingan Layer di Titik Ini ({features.length})
                </span>

                <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-slate-900/60">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#0C101A] text-slate-400 text-[9px] uppercase font-bold border-b border-white/[0.08]">
                      <tr>
                        <th className="p-2">Dataset</th>
                        <th className="p-2">Objek</th>
                        <th className="p-2">Tipe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04] text-slate-300">
                      {features.map((feat, idx) => (
                        <tr
                          key={idx}
                          onClick={() => {
                            setSelectedIndex(idx);
                            setActiveTab("detail");
                          }}
                          className="hover:bg-slate-800/50 transition-colors cursor-pointer"
                        >
                          <td className="p-2 font-semibold text-slate-400 truncate max-w-[100px]">
                            {feat?.layerTitle}
                          </td>
                          <td className="p-2 font-bold text-white truncate max-w-[120px]">
                            {feat?.title}
                          </td>
                          <td className="p-2 font-mono text-[9px] text-cyan-400">
                            {feat?.type?.toUpperCase()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── TAB 4: REDESIGNED ATRIBUT & QUICK FILTER CHIPS ─────────────── */}
            {activeTab === "detail" && (
              <div className="flex-1 flex flex-col min-h-0 touch-pan-y">
                {/* Multi-Layer Selector Pill Bar */}
                {features.length > 1 && (
                  <div className="px-3 py-1.5 bg-slate-950/80 border-b border-white/[0.06] flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
                    {features.map((feat, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedIndex(idx)}
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[9px] font-bold tracking-tight shrink-0 transition-all cursor-pointer flex items-center gap-1",
                          selectedIndex === idx
                            ? "bg-white text-slate-950 shadow-sm font-black"
                            : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-white/[0.06]"
                        )}
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            selectedIndex === idx ? "bg-emerald-500" : "bg-slate-500"
                          )}
                        />
                        <span className="truncate max-w-[110px]">{feat?.layerTitle || feat?.title}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Feature Title Card */}
                <div className="p-2.5 sm:p-3 bg-[#0C101A] border-b border-white/[0.06] flex items-start justify-between gap-2 shrink-0">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-800 border border-white/[0.08] text-slate-300">
                      {currentFeature.layerTitle}
                    </span>
                    <h4 className="text-xs font-bold text-white tracking-tight leading-snug truncate">
                      {currentFeature.title}
                    </h4>
                  </div>

                  {onFocusFeature && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onFocusFeature(currentFeature)}
                      className="h-6 px-2 text-[10px] font-bold rounded-lg border-white/[0.1] bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white shrink-0 cursor-pointer"
                    >
                      <MapPin size={11} className="mr-1 text-emerald-400" />
                      Fokus
                    </Button>
                  )}
                </div>

                {/* Search & Quick Category Filters */}
                <div className="p-2 sm:p-2.5 bg-slate-950/60 border-b border-white/[0.06] space-y-1.5 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                    <Input
                      type="text"
                      placeholder="Cari nama atribut atau nilai..."
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      className="h-7 pl-7 pr-6 text-[10px] bg-[#0E131F] border-white/[0.08] text-white rounded-lg focus-visible:ring-emerald-500"
                    />
                    {filterQuery && (
                      <button
                        type="button"
                        onClick={() => setFilterQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
                    {[
                      { id: "all", label: "Semua" },
                      { id: "fisik", label: "Fisik" },
                      { id: "admin", label: "Admin" },
                      { id: "teknis", label: "Kode/Status" },
                    ].map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => setAttributeCategoryFilter(chip.id)}
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-bold transition-all cursor-pointer whitespace-nowrap",
                          attributeCategoryFilter === chip.id
                            ? "bg-indigo-500 text-white font-black shadow-sm"
                            : "bg-slate-900 border border-white/[0.06] text-slate-400 hover:text-slate-200"
                        )}
                      >
                        {chip.label}
                      </button>
                    ))}
                    <span className="text-[9px] text-slate-500 font-mono ml-auto pl-1 whitespace-nowrap">
                      {filteredProperties.length} / {allAttributes.length}
                    </span>
                  </div>
                </div>

                {/* Filtered Properties List */}
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar min-h-0">
                  {filteredProperties.map(([key, val], idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-slate-900/50 border border-white/[0.04] flex items-start justify-between text-xs gap-3"
                    >
                      <span className="text-slate-400 font-medium text-[11px] capitalize shrink-0 max-w-[120px] truncate">
                        {key.replace(/_/g, " ")}
                      </span>
                      <span className="font-semibold text-slate-200 text-[11px] text-right break-words max-w-[200px]">
                        {formatValue(key, val)}
                      </span>
                    </div>
                  ))}

                  {filteredProperties.length === 0 && (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      Tidak ada atribut yang sesuai filter.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── FOOTER BAR ─────────────────────────────────────────────────── */}
            <div className="p-2 sm:p-2.5 bg-[#0C101A] border-t border-white/[0.08] flex items-center justify-between text-[10px] text-slate-500 font-medium shrink-0 pb-safe">
              <span>MELAROSA Spasial</span>
              {onFocusFeature && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onFocusFeature(currentFeature)}
                  className="h-6 px-2 text-[10px] font-bold text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 rounded-md cursor-pointer"
                >
                  <MapPin size={11} className="mr-1" />
                  Fokus Fitur
                </Button>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
