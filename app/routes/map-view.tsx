import { useState, useRef, useEffect, useMemo } from 'react';
import type OLMap from 'ol/Map';
import { Link, useNavigate } from 'react-router';
import {
  Layers as LayersIcon,
  Search,
  Map as MapIcon,
  ChevronDown,
  Info,
  X,
  ArrowLeft,
  Filter,
  SlidersHorizontal,
  FolderOpen,
  MapPin,
  Navigation,
  Activity,
  CheckCircle2,
  AlertCircle,
  Ruler,
  Globe,
  Home,
  BarChart3 as ChartIcon,
  Database as DatabaseIcon,
  Route as RouteIcon,
  Menu,
} from 'lucide-react';
import {
  IconTopologyComplex,
  IconMap2,
  IconLayersSubtract,
  IconHome,
  IconRoute,
  IconChartBar,
  IconDatabase,
  IconLogin,
} from "@tabler/icons-react";
import { OpenLayersMap, type OpenLayersMapRef, type MapLayerConfig } from "~/features/peta/components/OpenLayersMap";
import { MapLegend, type LegendItem } from "~/features/peta/components/MapLegend";
import { GeonodeDatasetPanel } from "~/features/peta/components/GeonodeDatasetPanel";
import { MapLayerControlPanel } from "~/features/peta/components/MapLayerControlPanel";
import { KecamatanDropdown } from "~/features/peta/components/KecamatanDropdown";
import { DesaDropdown } from "~/features/peta/components/DesaDropdown";
import { type Kecamatan } from "~/services/kecamatan";
import { desaService, type Desa } from "~/services/desa";
import { jalanService, type RekapDibangun } from "~/services/jalan";
import { cn, getProxiedLayerUrl } from '~/lib/utils';
import { AddressSearch } from "~/features/peta/components/AddressSearch";
import { CoordinateInput, type Marker } from "~/features/peta/components/CoordinateInput";
import { Button } from '~/components/ui/button';
import { useIsMobile } from "~/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "~/components/ui/sheet";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { MetaFunction } from "react-router";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ModeToggle } from "~/components/mode-toggle";
import { CORE_LAYER_COLORS } from '~/lib/map-config';
import { MapViewSidebar } from "~/features/peta/components/MapViewSidebar";
import { MapViewMapControls } from "~/features/peta/components/MapViewMapControls";
import { SegmenMiniMap } from "~/features/peta/components/SegmenMiniMap";

export const meta: MetaFunction = () => {
  return [
    { title: "Peta Interaktif WebGIS — MELAROSA" },
    { name: "description", content: "Peta Interaktif Spasial Pembangunan Infrastruktur BKK Kabupaten Bojonegoro" },
  ];
};

const BASEMAPS = [
  { id: 'carto-light', name: 'Positron Light', url: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', thumbnail: 'https://a.basemaps.cartocdn.com/light_all/14/13283/8518.png' },
  { id: 'carto-dark', name: 'Dark Matter', url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', thumbnail: 'https://a.basemaps.cartocdn.com/dark_all/14/13283/8518.png' },
  { id: 'osm', name: 'OpenStreetMap', url: 'osm', thumbnail: 'https://tile.openstreetmap.org/14/13283/8518.png' },
  { id: 'satellite', name: 'Esri Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', thumbnail: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/14/8518/13283' },
  { id: 'google-road', name: 'Google Maps', url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', thumbnail: 'https://mt1.google.com/vt/lyrs=m&x=13283&y=8518&z=14' },
  { id: 'google-sat', name: 'Google Satellite', url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', thumbnail: 'https://mt1.google.com/vt/lyrs=y&x=13283&y=8518&z=14' },
];

// Public Navigation Links Map
const PUBLIC_NAV_LINKS = [
  { name: "Beranda", path: "/", icon: IconHome, desc: "Halaman Utama Portal" },
  { name: "Peta Spasial", path: "/map-view", icon: IconMap2, desc: "WebGIS Peta Interaktif" },
  { name: "Ruas Jalan", path: "/jalan-desa", icon: IconRoute, desc: "Daftar Jalan Poros Desa" },
  { name: "Statistik", path: "/statistik", icon: IconChartBar, desc: "Data Rekap & Capaian" },
  { name: "Katalog Dataset", path: "/katalog-dataset", icon: IconDatabase, desc: "Dataset GeoNode OGC" },
];

export default function MapViewPage() {
  const mapRef = useRef<OpenLayersMapRef>(null);
  const [mapInstance, setMapInstance] = useState<OLMap | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRekapOpen, setIsRekapOpen] = useState(false);

  // Auto-close sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  // Basemap & Legend State
  const [activeBasemap, setActiveBasemap] = useState(BASEMAPS[0]);
  const [rekapData, setRekapData] = useState<RekapDibangun | null>(null);
  const [segmentsData, setSegmentsData] = useState<any>(null);

  // Administrative Filters State
  const [selectedKecamatan, setSelectedKecamatan] = useState<Kecamatan | null>(null);
  const [selectedDesa, setSelectedDesa] = useState<Desa | null>(null);
  const [loading, setLoading] = useState(false);

  // Map Layers & Markers State
  const [activeLayers, setActiveLayers] = useState<MapLayerConfig[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);

  // Load default visible layers from backend API
  useEffect(() => {
    const fetchDefaultLayers = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/layers?active_only=true`);
        if (!response.ok) return;
        const data = await response.json();
        if (data.status === 'success' && Array.isArray(data.result)) {
          const defaultVisibleLayers = data.result
            .filter((l: any) => l.default_visible)
            .map((l: any) => {
              const proxyUrl = getProxiedLayerUrl(l.url);
              return {
                id: `layer-${l.id}`,
                title: l.name,
                type: l.protocol === 'OGC:WMS' ? 'wms' : (l.protocol === 'XYZ' ? 'tile' : 'vector'),
                url: proxyUrl,
                params: {
                  'LAYERS': l.layer_name,
                  'VERSION': '1.1.1'
                },
                legendUrl: l.protocol === 'OGC:WMS' ? `${proxyUrl}?request=GetLegendGraphic&format=image/png&layer=${l.layer_name}` : undefined,
                visible: true,
                opacity: l.opacity ?? 1,
                zIndex: l.order ?? 50
              };
            });
          setActiveLayers(prev => [...defaultVisibleLayers, ...prev]);
        }
      } catch (err) {
        console.error("Failed to load default layers:", err);
      }
    };
    fetchDefaultLayers();
  }, []);

  const hasMainRoads = true;
  const activeLayerIds = useMemo(() => activeLayers.map(l => l.id), [activeLayers]);

  // Derived Legend Items
  const legendItems = useMemo<LegendItem[]>(() => {
    const itemsMap = new Map<string, LegendItem>();

    if (hasMainRoads) {
      itemsMap.set('Jalan Utama / Kab', {
        label: 'Jalan Utama / Kab',
        color: CORE_LAYER_COLORS.GENERAL.hex,
        active: true
      });
    }

    activeLayers.forEach(layer => {
      if (layer.visible === false) return;

      if (layer.id.startsWith('legacy_segments_')) {
        itemsMap.set('Segmen Jalan Desa', {
          label: 'Segmen Jalan Desa',
          color: CORE_LAYER_COLORS.SEGMENTS.hex,
          active: true
        });
      } else if (layer.id.startsWith('batas_kecamatan_') || layer.id.startsWith('legacy_desa_')) {
        const label = layer.title.replace('KECAMATAN: ', '').replace('Wilayah: ', 'Batas ');
        itemsMap.set(label, {
          label,
          color: CORE_LAYER_COLORS.ADMIN.hex,
          type: 'dashed',
          active: true
        });
      } else if (layer.type === 'vector' && !layer.id.startsWith('legacy_')) {
        itemsMap.set(layer.title, {
          label: layer.title,
          color: layer.style?.stroke || layer.style?.fill || '#666',
          type: layer.style?.fill ? 'polygon' : 'line',
          active: true
        });
      }
    });

    return Array.from(itemsMap.values());
  }, [activeLayers, hasMainRoads]);

  const catalogLegendUrls = useMemo(() => {
    return activeLayers
      .filter(l => l.id.startsWith('geonode-') && l.visible !== false && l.legendUrl)
      .map(l => l.legendUrl!);
  }, [activeLayers]);

  // Handlers
  const handleAddLayer = (newLayer: MapLayerConfig) => {
    setActiveLayers(prev => {
      const next = [newLayer, ...prev];
      return next.map((l, i) => ({
        ...l,
        zIndex: 100 + (next.length - i) * 10
      }));
    });
  };

  const handleRemoveLayer = (id: string) => {
    setActiveLayers(prev => prev.filter(l => l.id !== id));
  };

  const handleReorderLayers = (newOrder: MapLayerConfig[]) => {
    const updated = newOrder.map((layer, index) => ({
      ...layer,
      zIndex: 100 + (newOrder.length - index) * 10
    }));
    setActiveLayers(updated);
  };

  const handleToggleVisibility = (id: string) => {
    setActiveLayers(prev => prev.map(l =>
      l.id === id ? { ...l, visible: l.visible === false } : l
    ));
  };

  const handleOpacityChange = (id: string, opacity: number) => {
    setActiveLayers(prev => prev.map(l =>
      l.id === id ? { ...l, opacity } : l
    ));
  };

  const handleUpdateLayerParams = (id: string, params: any) => {
    setActiveLayers(prev => prev.map(l =>
      l.id === id ? { ...l, params: { ...l.params, ...params } } : l
    ));
  };

  const handleAddMarker = (newMarker: Marker) => {
    setMarkers(prev => [...prev, newMarker]);
  };

  const handleRemoveMarker = (id: string) => {
    setMarkers(prev => prev.filter(m => m.id !== id));
  };

  const handleUpdateMarker = (updatedMarker: Marker) => {
    setMarkers(prev => prev.map(m => m.id === updatedMarker.id ? updatedMarker : m));
  };

  useEffect(() => {
    if (markers.length > 0) {
      const timer = setTimeout(() => {
        mapRef.current?.fitAllMarkers();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [markers.length]);

  const handleSearchSelect = (result: { lat: number, lon: number, display_name: string }) => {
    const newMarker: Marker = {
      id: crypto.randomUUID(),
      lat: result.lat,
      lon: result.lon,
      title: result.display_name.split(',')[0]
    };
    setMarkers(prev => [...prev, newMarker]);
  };

  // Administrative selection handlers
  const handleSelectKecamatan = async (kecamatan: Kecamatan | null) => {
    setLoading(true);
    setSelectedKecamatan(kecamatan);
    setSelectedDesa(null);

    setActiveLayers(prev => prev.filter(l =>
      !l.id.startsWith('batas_kecamatan_') &&
      !l.id.startsWith('legacy_desa_') &&
      !l.id.startsWith('legacy_segments_')
    ));

    mapRef.current?.zoomToFeature(null);

    if (!kecamatan) {
      setLoading(false);
      return;
    }

    try {
      const geojson = await desaService.getGeojsonDesa(kecamatan.id);

      if (geojson) {
        setActiveLayers(prev => {
          const filtered = prev.filter(l =>
            !l.id.startsWith('batas_kecamatan_') &&
            !l.id.startsWith('legacy_desa_') &&
            !l.id.startsWith('legacy_segments_')
          );

          const layerId = `batas_kecamatan_${kecamatan.id}`;
          const layerTitle = `KECAMATAN: ${kecamatan.nama_kecamatan}`;
          return [{
            id: layerId,
            title: layerTitle,
            type: 'vector',
            data: geojson,
            visible: true,
            opacity: 1.0,
            style: { stroke: '#2563eb', width: 2, lineDash: [4, 4], fill: 'rgba(37, 99, 235, 0.04)', labelField: 'nama_desa' }
          }, ...filtered];
        });

        mapRef.current?.zoomToFeature(geojson);
      }
    } catch (error) {
      console.error("Failed to fetch kecamatan geojson", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDesa = async (desa: Desa | null) => {
    setLoading(true);
    setSelectedDesa(desa);

    setActiveLayers(prev => prev.filter(l =>
      !l.id.startsWith('legacy_desa_') &&
      !l.id.startsWith('legacy_poros_') &&
      !l.id.startsWith('legacy_segments_')
    ));

    if (!desa) {
      if (selectedKecamatan) {
        const geojson = await desaService.getGeojsonDesa(selectedKecamatan.id);
        if (geojson) mapRef.current?.zoomToFeature(geojson);
      } else {
        mapRef.current?.zoomToFeature(null);
      }
      setLoading(false);
      return;
    }

    try {
      const [desaGeojson, rawPoros, rawSegments, rekap] = await Promise.all([
        desaService.getDesaGeojsonById(desa.id),
        jalanService.getJalanPorosByDesa(desa.id),
        jalanService.getSegmenByDesa(desa.id),
        jalanService.getRekapDibangunByDesa(desa.id)
      ]);

      setRekapData(rekap);
      setSegmentsData(rawSegments);

      const porosGeojson = rawPoros && rawPoros.features ? {
        ...rawPoros,
        features: rawPoros.features.map(f => ({
          ...f,
          properties: { ...f.properties, _layer: 'jalan_poros' }
        }))
      } : null;

      const segmentsGeojson = rawSegments && rawSegments.features ? {
        ...rawSegments,
        features: rawSegments.features.map(f => ({
          ...f,
          properties: { ...f.properties, _layer: 'jalan_segmen' }
        }))
      } : null;

      setActiveLayers(prev => {
        let filtered = prev.filter(l =>
          !l.id.startsWith('legacy_desa_') &&
          !l.id.startsWith('legacy_poros_') &&
          !l.id.startsWith('legacy_segments_')
        );

        if (desaGeojson) {
          filtered = [{
            id: `legacy_desa_${desa.id}`,
            title: `Wilayah: ${desa.nama_desa}`,
            type: 'vector',
            data: desaGeojson,
            visible: true,
            opacity: 1.0,
            zIndex: 6
          }, ...filtered];
        }

        if (porosGeojson) {
          filtered = [{
            id: `legacy_poros_${desa.id}`,
            title: `Jalan Poros: ${desa.nama_desa}`,
            type: 'vector',
            data: porosGeojson,
            visible: true,
            opacity: 1,
            zIndex: 90
          }, ...filtered];
        }

        if (segmentsGeojson) {
          filtered = [{
            id: `legacy_segments_${desa.id}`,
            title: `Segmen Jalan: ${desa.nama_desa}`,
            type: 'vector',
            data: segmentsGeojson,
            visible: true,
            opacity: 1,
            zIndex: 100
          }, ...filtered];
        }

        return filtered;
      });

      if (desaGeojson) {
        mapRef.current?.zoomToFeature(desaGeojson);
      }
    } catch (error) {
      console.error("Failed to fetch desa data", error);
    } finally {
      setLoading(false);
    }
  };

  const [activeTab, setActiveTab] = useState<string>('catalog');

  // Refined Sidebar Content with Single Streamlined Header & Clean Shadcn Tabs
  const SidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 min-h-0">
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val)} className="flex-1 flex flex-col min-h-0 gap-0">
        {/* Streamlined Unified Header */}
        <div className="p-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600/10 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div className="leading-none">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">Panel Kontrol Spasial</h3>
                <span className="text-[10px] text-slate-500 font-medium">GIS MELAROSA</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              onClick={() => setIsSidebarOpen(false)}
              title="Tutup Sidebar"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <TabsList className="w-full grid grid-cols-3 h-9 bg-white dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800 rounded-xl">
            <TabsTrigger value="catalog" className="text-xs font-semibold gap-1.5 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <FolderOpen className="w-3.5 h-3.5" />
              Katalog
            </TabsTrigger>
            <TabsTrigger value="layers" className="text-xs font-semibold gap-1.5 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <LayersIcon className="w-3.5 h-3.5" />
              Layer
              {activeLayers.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] h-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {activeLayers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="filters" className="text-xs font-semibold gap-1.5 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Filter className="w-3.5 h-3.5" />
              Filter
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="catalog" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden bg-white dark:bg-slate-950">
          <GeonodeDatasetPanel
            onAddLayer={handleAddLayer}
            activeLayerIds={activeLayerIds}
          />
        </TabsContent>

        <TabsContent value="layers" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden bg-white dark:bg-slate-950">
          <MapLayerControlPanel
            layers={activeLayers}
            onRemoveLayer={handleRemoveLayer}
            onReorder={handleReorderLayers}
            onToggleVisibility={handleToggleVisibility}
            onOpacityChange={handleOpacityChange}
            onUpdateLayerParams={handleUpdateLayerParams}
          />
        </TabsContent>

        <TabsContent value="filters" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-white dark:bg-slate-950">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Pencarian Alamat Lokasi
              </label>
              <AddressSearch onSelect={handleSearchSelect} />
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Filter Wilayah Administrasi
              </label>
              <div className="space-y-2.5">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 mb-1 block">Kecamatan</span>
                  <KecamatanDropdown
                    className="w-full h-10 rounded-xl border-slate-200 dark:border-slate-800 text-sm font-semibold"
                    selectedKecamatanName={selectedKecamatan?.nama_kecamatan}
                    onSelectKecamatan={handleSelectKecamatan}
                  />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 mb-1 block">Desa / Kelurahan</span>
                  <DesaDropdown
                    className="w-full h-10 rounded-xl border-slate-200 dark:border-slate-800 text-sm font-semibold"
                    idKecamatan={selectedKecamatan?.id}
                    selectedDesaName={selectedDesa?.nama_desa}
                    onSelectDesa={handleSelectDesa}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Input Koordinat GPS
              </label>
              <CoordinateInput
                markers={markers}
                onAdd={handleAddMarker}
                onRemove={handleRemoveMarker}
                onUpdate={handleUpdateMarker}
                onZoomTo={(m) => mapRef.current?.zoomToCoordinate(m.lon, m.lat)}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">

      {/* ── 1. FLOATING TOP BAR (HEADER PETA MODERN) ──────────────────── */}
      {/* Reason: Header melayang translusen menggantikan navbar 64px statis.
          Integrasi lengkap dengan Dropdown Menu Publik untuk navigasi antar halaman publik. */}
      <header className="absolute top-3 left-3 right-3 z-30 pointer-events-none flex items-center justify-between gap-3">
        {/* Kiri: Brand Logo + Menu Publik Dropdown + Sidebar Toggle */}
        <div className="pointer-events-auto flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-md">
          {/* Logo Mark */}
          <Link
            to="/"
            className="flex items-center gap-2 group hover:opacity-90 transition-opacity"
            title="Kembali ke Beranda"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-emerald-500 text-white shadow-sm">
              <IconTopologyComplex size={18} />
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
                MELAROSA
              </span>
              <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                Sistem Informasi Geospasial
              </span>
            </div>
          </Link>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

          {/* Menu Publik Dropdown — Solusi Navigasi Halaman Publik dari Peta */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1.5"
              >
                <Menu className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="hidden md:inline">Menu Publik</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 p-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl">
              <DropdownMenuLabel className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Navigasi Portal Publik
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1" />
              {PUBLIC_NAV_LINKS.map((link) => (
                <DropdownMenuItem
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className="rounded-xl text-xs font-semibold gap-2.5 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <link.icon size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
                  <div className="flex flex-col leading-none">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{link.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5">{link.desc}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* Toggle Sidebar */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={cn(
              "h-8 px-2.5 rounded-xl text-xs font-semibold gap-1.5 transition-all",
              isSidebarOpen
                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
            title={isSidebarOpen ? "Sembunyikan Panel Kontrol" : "Tampilkan Panel Kontrol"}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden md:inline">Panel Kontrol</span>
            {activeLayers.length > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                {activeLayers.length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Tengah: Quick Filter Indicator (Desa/Kecamatan terpilih) */}
        {(selectedKecamatan || selectedDesa) && (
          <div className="pointer-events-auto hidden lg:flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-blue-200 dark:border-blue-900/60 shadow-md animate-in fade-in slide-in-from-top-2">
            <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {selectedDesa ? `Desa ${selectedDesa.nama_desa}` : `Kecamatan ${selectedKecamatan?.nama_kecamatan}`}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (selectedDesa) handleSelectDesa(null);
                else handleSelectKecamatan(null);
              }}
              className="h-5 w-5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Kanan: Mode Toggle & Link Portal */}
        <div className="pointer-events-auto flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-md">
          <ModeToggle />
          <Link to="/login">
            <Button
              size="sm"
              className="h-8 px-3 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm"
            >
              <IconLogin size={14} />
              <span className="hidden sm:inline">Portal Admin</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* ── 2. MAIN MAP CANVAS & OVERLAYS ─────────────────────────────── */}
      <main className="w-full h-full relative">
        {/* Sidebar Drawer */}
        <MapViewSidebar
          isOpen={isSidebarOpen}
          onToggle={setIsSidebarOpen}
          widthClass="w-[340px]"
          className="top-16 left-3 bottom-3 h-[calc(100vh-76px)] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl z-30 pt-0 overflow-hidden"
        >
          {SidebarContent}
        </MapViewSidebar>

        {/* Map Canvas */}
        <OpenLayersMap
          ref={mapRef}
          className="w-full h-full"
          layers={activeLayers}
          markers={markers}
          basemapUrl={activeBasemap.url}
          onMapReady={setMapInstance}
        />

        {/* Loading Indicator */}
        {loading && (
          <div
            className={cn(
              "absolute z-40 flex items-center gap-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 transition-all duration-300",
              isSidebarOpen ? "top-20 left-[356px]" : "top-20 left-4"
            )}
          >
            <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Memuat layer spasial...</span>
          </div>
        )}

        {/* Map Legend (Bawah Kiri) */}
        <MapLegend
          items={legendItems}
          legendUrls={catalogLegendUrls}
          footer="MELAROSA GIS Bojonegoro"
          defaultMinimized={true}
          className={cn(
            "z-20 transition-all duration-300 pointer-events-auto",
            isMobile ? "bottom-6 left-4" : "bottom-6",
            isSidebarOpen
              ? (isMobile ? "left-4" : "left-[356px]")
              : "left-4"
          )}
        />

        {/* Map Zoom / Geolocation Controls (Kanan Atas) */}
        <MapViewMapControls
          map={mapInstance}
          onZoomIn={() => mapRef.current?.zoomIn()}
          onZoomOut={() => mapRef.current?.zoomOut()}
          onResetBearing={() => mapRef.current?.resetRotation()}
          className="absolute top-20 right-4 z-20"
        />

        {/* Floating Basemap Selector Popover (Kanan Bawah) */}
        <div className="absolute bottom-6 right-4 z-20">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-10 px-3 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-slate-200 dark:border-slate-800 shadow-md text-xs font-semibold gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <IconLayersSubtract size={16} className="text-blue-600 dark:text-blue-400" />
                <span>Peta Dasar: {activeBasemap.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="end"
              className="w-72 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl"
            >
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2.5">Pilih Peta Dasar (Basemap)</p>
              <div className="grid grid-cols-2 gap-2">
                {BASEMAPS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setActiveBasemap(b)}
                    className={cn(
                      "relative rounded-xl overflow-hidden border-2 transition-all group text-left",
                      activeBasemap.id === b.id
                        ? "border-blue-600 ring-2 ring-blue-500/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-blue-400"
                    )}
                  >
                    <img src={b.thumbnail} alt={b.name} className="w-full h-14 object-cover" />
                    <div className="p-1.5 bg-slate-900/80 backdrop-blur-xs text-white">
                      <p className="text-[10px] font-bold truncate leading-tight">{b.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </main>

      {/* ── 3. BOTTOM REKAP TOGGLE BUTTON ─────────────────────────────── */}
      {selectedDesa && rekapData && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex justify-center pointer-events-none">
          <Button
            onClick={() => setIsRekapOpen(true)}
            className="pointer-events-auto px-4 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg border border-blue-500 transition-all font-semibold text-xs gap-2 cursor-pointer"
          >
            <Activity className="w-4 h-4" />
            Rekap Pembangunan Desa {selectedDesa.nama_desa}
            <ChevronDown className="w-4 h-4 rotate-180" />
          </Button>
        </div>
      )}

      {/* ── 4. BOTTOM SHEET REKAP PEMBANGUNAN ─────────────────────────── */}
      <Sheet open={isRekapOpen} onOpenChange={setIsRekapOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[85dvh] rounded-t-3xl border-t-0 p-0 overflow-hidden shadow-2xl overflow-y-auto">
          <div className="flex flex-col min-h-0 pt-6 px-6 pb-8 bg-white dark:bg-slate-900">
            {/* Sheet Header */}
            <SheetHeader className="pb-4 text-left border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Ringkasan Infrastruktur Desa</span>
                  </div>
                  <SheetTitle className="text-xl font-extrabold text-slate-900 dark:text-white">
                    Desa {rekapData?.nama_desa}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-slate-500 font-medium">
                    Kecamatan {rekapData?.nama_kecamatan} • Kabupaten Bojonegoro
                  </SheetDescription>
                </div>

                {/* Progress Status Badge */}
                <div className="flex items-center gap-3">
                  {(() => {
                    const pemetaan = rekapData?.total_panjang_aset || 0;
                    const naikStatus = rekapData?.total_panjang_puk || 0;
                    const jalanDesaSekarang = Math.max(0, pemetaan - naikStatus);
                    const jalanDibangun = rekapData?.total_panjang_dibangun || 0;

                    const pct = jalanDesaSekarang > 0 ? (jalanDibangun / jalanDesaSekarang) * 100 : 100;
                    const isDone = pct >= 100;

                    return (
                      <Badge
                        className={cn(
                          "px-3.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-2",
                          isDone
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                            : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                        )}
                      >
                        {isDone ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Infrastruktur Tuntas</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span>Dalam Proses Pembangunan</span>
                          </>
                        )}
                      </Badge>
                    );
                  })()}
                </div>
              </div>
            </SheetHeader>

            {/* Sheet Tabs */}
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="w-full max-w-xs grid grid-cols-2 h-9 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <TabsTrigger value="overview" className="text-xs font-semibold">Status Capaian</TabsTrigger>
                <TabsTrigger value="segments" className="text-xs font-semibold">Daftar Segmen</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="py-4 space-y-6">
                {/* 4 Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="border border-slate-200 dark:border-slate-800 shadow-xs">
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="text-[11px] font-semibold text-slate-500">Pemetaan Jalan Desa</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="text-lg font-bold text-slate-900 dark:text-white">
                        {(rekapData?.total_panjang_aset || 0).toLocaleString('id-ID')} m
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-slate-200 dark:border-slate-800 shadow-xs">
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="text-[11px] font-semibold text-slate-500">Naik Status Kab.</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="text-lg font-bold text-slate-900 dark:text-white">
                        {(rekapData?.total_panjang_puk || 0).toLocaleString('id-ID')} m
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs">
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Jalan Desa Sekarang</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                        {Math.max(0, (rekapData?.total_panjang_aset || 0) - (rekapData?.total_panjang_puk || 0)).toLocaleString('id-ID')} m
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs">
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Belum Tertangani</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="text-lg font-bold text-amber-700 dark:text-amber-300">
                        {Math.max(0, ((rekapData?.total_panjang_aset || 0) - (rekapData?.total_panjang_puk || 0)) - (rekapData?.total_panjang_dibangun || 0)).toLocaleString('id-ID')} m
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Progress Bar Detail */}
                {(() => {
                  const jalanDesaSekarang = (rekapData?.total_panjang_aset || 0) - (rekapData?.total_panjang_puk || 0);
                  const jalanDibangun = rekapData?.total_panjang_dibangun || 0;
                  const pct = Math.min(100, Math.round(jalanDesaSekarang > 0 ? (jalanDibangun / jalanDesaSekarang) * 100 : 100));

                  return (
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Progress Pembangunan Fisik</span>
                        <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400">{pct}%</span>
                      </div>
                      <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 pt-1">
                        <span>Sudah Dibangun: {jalanDibangun.toLocaleString('id-ID')} m</span>
                        <span>Sisa Target: {Math.max(0, jalanDesaSekarang - jalanDibangun).toLocaleString('id-ID')} m</span>
                      </div>
                    </div>
                  );
                })()}
              </TabsContent>

              {/* Segments List Tab */}
              <TabsContent value="segments" className="py-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Daftar Segmen Jalan ({segmentsData?.features?.length || 0})</span>
                  </div>

                  <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                    {segmentsData?.features?.map((feature: any, idx: number) => {
                      const props = feature.properties;
                      const isDone = props.status_pembangunan === 'Sudah Tuntas';

                      return (
                        <Card key={idx} className="w-[280px] shrink-0 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                          <div className="h-32 bg-slate-100 dark:bg-slate-800 relative">
                            <SegmenMiniMap
                              feature={feature}
                              strokeColor={isDone ? '#10b981' : '#2563eb'}
                              className="w-full h-full p-4"
                            />
                            <Badge className={cn("absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5", isDone ? "bg-emerald-600" : "bg-blue-600")}>
                              {isDone ? 'Sudah Tuntas' : 'Aktif'}
                            </Badge>
                          </div>
                          <CardContent className="p-4 space-y-3">
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{props.nama_segmen || `Segmen ${idx + 1}`}</p>
                              <p className="text-[11px] text-slate-500">Kode Ruas: {props.kode_ruas}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                              <div>
                                <span className="text-slate-400 block text-[10px]">Panjang</span>
                                <span className="font-bold text-slate-700 dark:text-slate-200">{Math.round(props.panjang || 0)} m</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Perkerasan</span>
                                <span className="font-bold text-slate-700 dark:text-slate-200">{props.perkerasan || 'Belum Ada'}</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full h-8 text-xs font-semibold rounded-xl gap-1.5"
                              onClick={() => mapRef.current?.zoomToFeature(feature)}
                            >
                              <MapPin className="w-3.5 h-3.5 text-blue-600" />
                              Fokus Lokasi
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}
