import { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import { Heatmap as HeatmapLayer, Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { XYZ, Vector as VectorSource } from "ol/source";
import GeoJSON from "ol/format/GeoJSON";
import { fromLonLat } from "ol/proj";
import { defaults as defaultControls } from "ol/control";
import { Style, Stroke } from "ol/style";
import "ol/ol.css";
import * as turf from "@turf/turf";
import { monitoringService } from "~/features/monitoring/services/monitoring.service";
import {
  Loader2, Info, Plus, Minus, Compass, Layers, Activity,
  ShieldCheck, AlertTriangle, Play, Pause, RotateCcw, Calendar, Flame
} from "lucide-react";
import {
  IconActivity,
  IconRoute,
  IconShieldCheck,
  IconAlertTriangle,
  IconPlayerPlay,
  IconPlayerPause,
  IconRefresh,
  IconCalendar,
  IconFlame,
  IconLayersSubtract,
  IconPlus,
  IconMinus,
  IconCompass,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import type { Route } from "./+types/index";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Dashboard Monitoring Spasial — MELAROSA" },
    { name: "description", content: "Visualisasi Perkembangan Infrastruktur Segmen Jalan Tahun ke Tahun Kabupaten Bojonegoro" },
  ];
}

const BASEMAPS = {
  cartoLight: {
    name: "Carto Light",
    url: "https://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  cartoDark: {
    name: "Carto Dark",
    url: "https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  osm: {
    name: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }
};

export default function DashboardIndex() {
  const { resolvedTheme } = useTheme();
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const heatmapLayerRef = useRef<HeatmapLayer | null>(null);
  const lineLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const tileLayerRef = useRef<TileLayer<XYZ> | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [currentBasemap, setCurrentBasemap] = useState<keyof typeof BASEMAPS>(resolvedTheme === "dark" ? "cartoDark" : "cartoLight");

  // Sync basemap with theme
  useEffect(() => {
    if (!resolvedTheme) return;
    const targetBasemap = resolvedTheme === "dark" ? "cartoDark" : "cartoLight";
    setCurrentBasemap(targetBasemap);
    if (tileLayerRef.current) {
      tileLayerRef.current.setSource(
        new XYZ({
          url: BASEMAPS[targetBasemap].url,
          attributions: BASEMAPS[targetBasemap].attribution
        })
      );
    }
  }, [resolvedTheme]);
  const [heatmapRadius, setHeatmapRadius] = useState(5);
  const [heatmapBlur, setHeatmapBlur] = useState(8);
  const [viewMode, setViewMode] = useState<"heatmap" | "vector">("heatmap");

  // All raw GeoJSON features stored for time filtering
  const rawFeaturesRef = useRef<any[]>([]);

  // Time Slider State
  const [availableYears, setAvailableYears] = useState<number[]>([2020, 2021, 2022, 2023, 2024, 2025, 2026]);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [filterMode, setFilterMode] = useState<"cumulative" | "yearly">("cumulative");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [stats, setStats] = useState({
    totalSegmen: 0,
    totalPoints: 0,
    totalPanjangKm: 0,
    baikCount: 0,
    sedangCount: 0,
    rusakCount: 0
  });

  // Helper: Extract year from feature properties
  const getFeatureYear = (feature: any): number => {
    const props = feature.properties || {};
    const yearVal = props.tahun_pembangunan || props.tahun_anggaran || props.tahun;
    if (yearVal && !isNaN(Number(yearVal))) {
      return Number(yearVal);
    }
    if (props.created_at) {
      const dt = new Date(props.created_at);
      if (!isNaN(dt.getFullYear())) return dt.getFullYear();
    }
    return 2024; // Default fallback year
  };

  // Initialize Map
  useEffect(() => {
    if (!mapElement.current) return;

    const tileSource = new XYZ({
      url: BASEMAPS[currentBasemap].url,
      attributions: BASEMAPS[currentBasemap].attribution,
    });

    const tileLayer = new TileLayer({ source: tileSource });
    tileLayerRef.current = tileLayer;

    const heatmapLayer = new HeatmapLayer({
      source: new VectorSource(),
      blur: heatmapBlur,
      radius: heatmapRadius,
      opacity: 0.75,
      weight: () => 0.14,
    });
    heatmapLayerRef.current = heatmapLayer;

    const lineVectorSource = new VectorSource();
    const lineLayer = new VectorLayer({
      source: lineVectorSource,
      style: (feature) => {
        const kondisi = (feature.get('kondisi') || '').toLowerCase();
        let color = '#2563eb'; // Brand Blue default
        if (kondisi.includes('baik')) color = '#10b981'; // Emerald green
        else if (kondisi.includes('sedang')) color = '#0284c7'; // Sky blue
        else if (kondisi.includes('rusak_ringan') || kondisi.includes('ringan')) color = '#f59e0b'; // Amber
        else if (kondisi.includes('rusak_berat') || kondisi.includes('berat')) color = '#ef4444'; // Rose red

        return new Style({
          stroke: new Stroke({
            color,
            width: 4,
          }),
        });
      },
      visible: false
    });
    lineLayerRef.current = lineLayer;

    const map = new Map({
      target: mapElement.current,
      layers: [tileLayer, heatmapLayer, lineLayer],
      controls: defaultControls({
        zoom: false,
        rotate: false,
        attribution: false,
      }),
      view: new View({
        center: fromLonLat([111.88, -7.15]),
        zoom: 11,
      }),
    });

    mapRef.current = map;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [jalanRes, lingkunganRes] = await Promise.all([
          monitoringService.getAllSegmentsGeoJSON().catch(() => null),
          monitoringService.getKabupatenSegmentsGeoJSON().catch(() => null)
        ]);

        const extractFeatures = (res: any) => {
          if (!res) return [];
          if (res.status === "success") {
            if (res.result?.features) return res.result.features;
            if (res.data?.features) return res.data.features;
            if (Array.isArray(res.result)) return res.result;
          }
          if (res.type === "FeatureCollection" && Array.isArray(res.features)) {
            return res.features;
          }
          return [];
        };

        const jalanFeatures = extractFeatures(jalanRes);
        const lingkunganFeatures = extractFeatures(lingkunganRes);
        const allFeatures = [...jalanFeatures, ...lingkunganFeatures];

        rawFeaturesRef.current = allFeatures;

        if (allFeatures.length > 0) {
          // Extract unique years
          const yearsSet = new Set<number>();
          allFeatures.forEach((f: any) => {
            yearsSet.add(getFeatureYear(f));
          });
          const sortedYears = Array.from(yearsSet).sort((a, b) => a - b);
          if (sortedYears.length > 0) {
            setAvailableYears(sortedYears);
            setSelectedYear(sortedYears[sortedYears.length - 1]); // Set to latest year
          }

          // Initial render of features
          updateMapData(allFeatures, sortedYears[sortedYears.length - 1] || 2026, "cumulative");

          const fullGeoJSON = { type: "FeatureCollection", features: allFeatures };
          const exploded = turf.explode(fullGeoJSON as any);
          const olFeatures = new GeoJSON().readFeatures(exploded, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
          });
          const extent = heatmapLayer.getSource()?.getExtent();
          if (extent && extent.every(v => isFinite(v))) {
            map.getView().fit(extent, { padding: [60, 60, 60, 60], duration: 800 });
          }
        } else {
          toast.info("Belum ada data segmen infrastruktur.");
        }
      } catch (error) {
        console.error("Error loading time-slider heatmap data:", error);
        toast.error("Gagal memuat data segmen infrastruktur");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    return () => map.setTarget(undefined);
  }, []);

  // Silky smooth transition helper for year-to-year steps (no flickering)
  const smoothTransition = (onSwapData: () => void) => {
    const heatmapLayer = heatmapLayerRef.current;
    const lineLayer = lineLayerRef.current;
    if (!heatmapLayer && !lineLayer) {
      onSwapData();
      return;
    }

    const baseOpacity = 0.75;
    const dipOpacity = 0.5;

    if (heatmapLayer) heatmapLayer.setOpacity(dipOpacity);
    if (lineLayer) lineLayer.setOpacity(dipOpacity);

    onSwapData();

    let start: number | null = null;
    const duration = 400;

    const animateStep = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = progress * (2 - progress);
      const currentOpacity = dipOpacity + (baseOpacity - dipOpacity) * easeOut;

      if (heatmapLayer) heatmapLayer.setOpacity(currentOpacity);
      if (lineLayer) lineLayer.setOpacity(currentOpacity);

      if (progress < 1) {
        requestAnimationFrame(animateStep);
      } else {
        if (heatmapLayer) heatmapLayer.setOpacity(baseOpacity);
        if (lineLayer) lineLayer.setOpacity(1.0);
      }
    };

    requestAnimationFrame(animateStep);
  };

  // Filter and update map features based on selected year & filterMode
  const updateMapData = (
    allFeatures: any[],
    targetYear: number,
    mode: "cumulative" | "yearly",
    animated = true
  ) => {
    const performUpdate = () => {
      const filteredFeatures = allFeatures.filter((f) => {
        const y = getFeatureYear(f);
        return mode === "cumulative" ? y <= targetYear : y === targetYear;
      });

      let totalPanjang = 0;
      let baik = 0;
      let sedang = 0;
      let rusak = 0;

      filteredFeatures.forEach((f: any) => {
        const props = f.properties || {};
        const p = Number(props.panjang || props.panjang_m || 0);
        totalPanjang += p;

        const k = (props.kondisi || "").toLowerCase();
        if (k.includes("baik")) baik++;
        else if (k.includes("sedang")) sedang++;
        else if (k.includes("rusak")) rusak++;
      });

      // 1. Update Heatmap source
      const combinedGeoJSON = {
        type: "FeatureCollection",
        features: filteredFeatures
      };
      const exploded = turf.explode(combinedGeoJSON as any);
      const olHeatmapFeatures = new GeoJSON().readFeatures(exploded, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      });

      const heatSource = heatmapLayerRef.current?.getSource();
      if (heatSource) {
        heatSource.clear();
        heatSource.addFeatures(olHeatmapFeatures);
      }

      // 2. Update Vector line source
      const olLineFeatures = new GeoJSON().readFeatures(combinedGeoJSON, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      });
      const lineSource = lineLayerRef.current?.getSource();
      if (lineSource) {
        lineSource.clear();
        lineSource.addFeatures(olLineFeatures);
      }

      setStats({
        totalSegmen: filteredFeatures.length,
        totalPoints: olHeatmapFeatures.length,
        totalPanjangKm: Number((totalPanjang / 1000).toFixed(2)),
        baikCount: baik,
        sedangCount: sedang,
        rusakCount: rusak
      });
    };

    if (animated) {
      smoothTransition(performUpdate);
    } else {
      performUpdate();
    }
  };

  // Re-filter whenever selectedYear or filterMode changes
  useEffect(() => {
    if (rawFeaturesRef.current.length > 0) {
      updateMapData(rawFeaturesRef.current, selectedYear, filterMode);
    }
  }, [selectedYear, filterMode]);

  // Handle Time-Slider Animation (Play / Pause)
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        setSelectedYear((prevYear) => {
          const currentIndex = availableYears.indexOf(prevYear);
          if (currentIndex === -1 || currentIndex >= availableYears.length - 1) {
            return availableYears[0]; // Loop back to start
          }
          return availableYears[currentIndex + 1];
        });
      }, 1800);
    } else if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
    }

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, availableYears]);

  // Handle Basemap Toggle
  const toggleBasemap = () => {
    const keys = Object.keys(BASEMAPS) as (keyof typeof BASEMAPS)[];
    const currentIndex = keys.indexOf(currentBasemap);
    const nextBasemap = keys[(currentIndex + 1) % keys.length];
    setCurrentBasemap(nextBasemap);

    if (tileLayerRef.current) {
      tileLayerRef.current.setSource(
        new XYZ({
          url: BASEMAPS[nextBasemap].url,
          attributions: BASEMAPS[nextBasemap].attribution
        })
      );
    }
  };

  // Toggle layer view mode (Heatmap vs Vector Lines)
  const toggleLayerMode = () => {
    const nextMode = viewMode === "heatmap" ? "vector" : "heatmap";
    setViewMode(nextMode);
    if (heatmapLayerRef.current) heatmapLayerRef.current.setVisible(nextMode === "heatmap");
    if (lineLayerRef.current) lineLayerRef.current.setVisible(nextMode === "vector");
  };

  // Update heatmap radius & blur live
  useEffect(() => {
    if (heatmapLayerRef.current) {
      heatmapLayerRef.current.setRadius(heatmapRadius);
      heatmapLayerRef.current.setBlur(heatmapBlur);
    }
  }, [heatmapRadius, heatmapBlur]);

  const handleZoomIn = () => {
    const view = mapRef.current?.getView();
    if (view) view.animate({ zoom: (view.getZoom() || 0) + 1, duration: 250 });
  };

  const handleZoomOut = () => {
    const view = mapRef.current?.getView();
    if (view) view.animate({ zoom: (view.getZoom() || 0) - 1, duration: 250 });
  };

  const handleResetView = () => {
    const view = mapRef.current?.getView();
    if (view) {
      view.animate({ rotation: 0, duration: 250 });
      const extent = heatmapLayerRef.current?.getSource()?.getExtent();
      if (extent && extent.every(v => isFinite(v))) {
        view.fit(extent, { padding: [60, 60, 60, 60], duration: 800 });
      }
    }
  };

  const minYear = availableYears[0] || 2020;
  const maxYear = availableYears[availableYears.length - 1] || 2026;

  return (
    <div className="relative flex flex-1 flex-col w-full h-full min-h-0 overflow-hidden bg-slate-950 font-sans select-none">
      {/* OpenLayers Map Canvas */}
      <div ref={mapElement} className="absolute inset-0 w-full h-full" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md">
          <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Memuat Data Spasial & Time Slider...</p>
          </div>
        </div>
      )}

      {/* Top Left Overlay Header Panel */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-3 pointer-events-none max-w-md">
        <div className="pointer-events-auto flex items-center gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-md">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
            <IconActivity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none flex items-center gap-2">
              Dashboard Monitoring Spasial
              <Badge variant="secondary" className="text-[10px] font-semibold bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                {filterMode === "cumulative" ? `s/d TA ${selectedYear}` : `TA ${selectedYear}`}
              </Badge>
            </h1>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
              Simulasi & Analisis Realisasi Infrastruktur Tahun ke Tahun
            </p>
          </div>
        </div>

        {/* Summary Stat Cards */}
        {!isLoading && (
          <div className="pointer-events-auto grid grid-cols-3 gap-2">
            <Card className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-slate-200/80 dark:border-slate-800 p-3 shadow-md rounded-2xl">
              <CardContent className="p-0 flex flex-col">
                <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase">
                  <IconRoute className="size-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Segmen</span>
                </div>
                <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                  {stats.totalSegmen}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  {stats.totalPanjangKm} km
                </span>
              </CardContent>
            </Card>

            <Card className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-slate-200/80 dark:border-slate-800 p-3 shadow-md rounded-2xl">
              <CardContent className="p-0 flex flex-col">
                <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase">
                  <IconShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Kondisi Baik</span>
                </div>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {stats.baikCount}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  {stats.totalSegmen > 0 ? Math.round((stats.baikCount / stats.totalSegmen) * 100) : 0}% total
                </span>
              </CardContent>
            </Card>

            <Card className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-slate-200/80 dark:border-slate-800 p-3 shadow-md rounded-2xl">
              <CardContent className="p-0 flex flex-col">
                <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase">
                  <IconAlertTriangle className="size-3.5 text-rose-500" />
                  <span>Perlu Perbaikan</span>
                </div>
                <span className="text-base font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                  {stats.sedangCount + stats.rusakCount}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  {stats.totalSegmen > 0 ? Math.round(((stats.sedangCount + stats.rusakCount) / stats.totalSegmen) * 100) : 0}% total
                </span>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Top Right Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 pointer-events-auto">
        <TooltipProvider>
          <div className="flex flex-col gap-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-md">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" onClick={handleZoomIn}>
                  <IconPlus className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Zoom In</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" onClick={handleZoomOut}>
                  <IconMinus className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Zoom Out</TooltipContent>
            </Tooltip>
            <div className="h-px bg-slate-200 dark:bg-slate-800 mx-2" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" onClick={handleResetView}>
                  <IconCompass className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Reset Rotasi & Tampilan</TooltipContent>
            </Tooltip>
            <div className="h-px bg-slate-200 dark:bg-slate-800 mx-2" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 cursor-pointer" onClick={toggleBasemap}>
                  <IconLayersSubtract className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Ganti Basemap ({BASEMAPS[currentBasemap].name})</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-xl cursor-pointer transition-colors",
                    viewMode === 'heatmap' ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'text-blue-600 bg-blue-50 dark:bg-blue-950/40'
                  )}
                  onClick={toggleLayerMode}
                >
                  {viewMode === 'heatmap' ? <IconFlame className="h-4 w-4" /> : <IconRoute className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Mode Visualisasi: {viewMode === 'heatmap' ? 'Heatmap Kepadatan' : 'Vektor Garis Segmen'}</TooltipContent>
            </Tooltip>

            {/* Heatmap Size Adjuster */}
            {viewMode === "heatmap" && (
              <div className="p-1 flex flex-col items-center gap-1 border-t border-slate-200 dark:border-slate-800 pt-1.5">
                <span className="text-[8px] font-bold text-slate-400 uppercase">Size</span>
                <input
                  type="range"
                  min="1"
                  max="12"
                  step="1"
                  value={heatmapRadius}
                  onChange={(e) => setHeatmapRadius(Number(e.target.value))}
                  className="w-7 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  title={`Ukuran Heatmap: ${heatmapRadius}px`}
                />
              </div>
            )}
          </div>
        </TooltipProvider>
      </div>

      {/* Bottom Floating TIME SLIDER Control Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-2xl pointer-events-auto">
        <div className="flex flex-col gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl">
          {/* Top Row: Year Display, Play/Pause Controls, Mode Switch */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {/* Play / Pause Button */}
              <Button
                onClick={() => setIsPlaying(!isPlaying)}
                variant="default"
                size="sm"
                className={cn(
                  "rounded-xl px-4 py-2 text-xs font-bold shadow-md cursor-pointer transition-all gap-1.5",
                  isPlaying
                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                )}
              >
                {isPlaying ? (
                  <>
                    <IconPlayerPause className="w-4 h-4 fill-current" /> Jeda Animasi
                  </>
                ) : (
                  <>
                    <IconPlayerPlay className="w-4 h-4 fill-current" /> Putar Simulasi
                  </>
                )}
              </Button>

              <Button
                onClick={() => {
                  setIsPlaying(false);
                  setSelectedYear(minYear);
                }}
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-xl border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-600"
                title="Reset ke Tahun Awal"
              >
                <IconRefresh className="w-4 h-4" />
              </Button>
            </div>

            {/* Year Badge */}
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-3.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800">
              <IconCalendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold tracking-tight text-blue-600 dark:text-blue-400">
                TA {selectedYear}
              </span>
            </div>

            {/* Filter Mode Switch */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setFilterMode("cumulative")}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer",
                  filterMode === "cumulative"
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                Kumulatif (s/d {selectedYear})
              </button>
              <button
                onClick={() => setFilterMode("yearly")}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer",
                  filterMode === "yearly"
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                Per Tahun ({selectedYear})
              </button>
            </div>
          </div>

          {/* Range Slider */}
          <div className="flex flex-col gap-1 px-1">
            <input
              type="range"
              min={minYear}
              max={maxYear}
              step={1}
              value={selectedYear}
              onChange={(e) => {
                setIsPlaying(false);
                setSelectedYear(Number(e.target.value));
              }}
              className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600 transition-all"
            />

            {/* Year Step Ticks */}
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 px-0.5 mt-0.5">
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  onClick={() => {
                    setIsPlaying(false);
                    setSelectedYear(yr);
                  }}
                  className={cn(
                    "transition-all cursor-pointer hover:text-blue-600",
                    yr === selectedYear && 'text-blue-600 dark:text-blue-400 font-extrabold scale-110'
                  )}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
