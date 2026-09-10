import { useState, useRef, useEffect, useMemo } from 'react';
import type OLMap from 'ol/Map';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  Layers as LayersIcon,
  Search,
  ChevronDown,
  X,
  Filter,
  SlidersHorizontal,
  FolderOpen,
  MapPin,
  Activity,
  CheckCircle2,
  AlertCircle,
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
import { SpatialInspector, type InspectedFeature } from "~/features/peta/components/SpatialInspector";
import { SpatialBufferAnalysisPanel } from "~/features/peta/components/SpatialBufferAnalysisPanel";
import { CrossLayerAnalysisPanel } from "~/features/peta/components/CrossLayerAnalysisPanel";
import { KecamatanDropdown } from "~/features/peta/components/KecamatanDropdown";
import { DesaDropdown } from "~/features/peta/components/DesaDropdown";
import { kecamatanService, type Kecamatan } from "~/services/kecamatan";
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
import { RekapPembangunanPanel } from "~/features/peta/components/RekapPembangunanPanel";

export const meta: MetaFunction = () => {
  return [
    { title: "Peta Interaktif WebGIS — MELAROSA" },
    { name: "description", content: "Peta Interaktif Spasial Pembangunan Infrastruktur Kabupaten Bojonegoro" },
  ];
};

const BASEMAPS = [
  { id: 'google-sat', name: 'Google Hybrid', url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', thumbnail: 'https://mt1.google.com/vt/lyrs=y&x=13283&y=8518&z=14' },
  { id: 'carto-dark', name: 'Dark Matter', url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', thumbnail: 'https://a.basemaps.cartocdn.com/dark_all/14/13283/8518.png' },
  { id: 'carto-light', name: 'Positron Light', url: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', thumbnail: 'https://a.basemaps.cartocdn.com/light_all/14/13283/8518.png' },
  { id: 'osm', name: 'OpenStreetMap', url: 'osm', thumbnail: 'https://tile.openstreetmap.org/14/13283/8518.png' },
  { id: 'satellite', name: 'Esri Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', thumbnail: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/14/8518/13283' },
  { id: 'google-road', name: 'Google Maps', url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', thumbnail: 'https://mt1.google.com/vt/lyrs=m&x=13283&y=8518&z=14' },
];

// Public Navigation Links Map
const PUBLIC_NAV_LINKS = [
  { name: "Beranda", path: "/", icon: IconHome, desc: "Halaman Utama Portal" },
  { name: "Peta Interaktif", path: "/map-view", icon: IconMap2, desc: "WebGIS Peta Interaktif" },
  { name: "Ruas Jalan", path: "/jalan-desa", icon: IconRoute, desc: "Daftar Jalan Poros Desa" },
  { name: "Statistik", path: "/statistik", icon: IconChartBar, desc: "Data Rekap & Capaian" },
  { name: "Katalog Dataset", path: "/katalog-dataset", icon: IconDatabase, desc: "Dataset GeoNode OGC" },
];

export default function MapViewPage() {
  const mapRef = useRef<OpenLayersMapRef>(null);
  const [mapInstance, setMapInstance] = useState<OLMap | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRekapOpen, setIsRekapOpen] = useState(false);

  // Auto-close sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  // Basemap & Legend State — Default Google Hybrid
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

  // Spatial Inspector (Tahap 1: WMS & Vector Feature Identification)
  const [isInspectMode, setIsInspectMode] = useState(false);
  const [inspectedFeatures, setInspectedFeatures] = useState<InspectedFeature[]>([]);
  const [inspectedCoordinate, setInspectedCoordinate] = useState<[number, number] | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Spatial Buffer Analysis & Overlap Engine (Turf.js Engine)
  const [isBufferMode, setIsBufferMode] = useState(false);
  const [bufferCenter, setBufferCenter] = useState<[number, number] | null>(null);
  const [bufferRadiusKm, setBufferRadiusKm] = useState<number>(1.0);
  const [isBufferPanelOpen, setIsBufferPanelOpen] = useState(false);
  const [isCrossLayerOpen, setIsCrossLayerOpen] = useState(false);
  const [overlapGeometry, setOverlapGeometry] = useState<any | null>(null);

  // Aggregate all road features for Turf.js calculations
  const allRoadFeatures = useMemo(() => {
    const feats: any[] = [];
    if (segmentsData?.features && Array.isArray(segmentsData.features)) {
      feats.push(...segmentsData.features);
    }
    activeLayers.forEach((l) => {
      if (l.type === 'vector' && l.data?.features && Array.isArray(l.data.features)) {
        feats.push(...l.data.features);
      }
    });
    return feats;
  }, [segmentsData, activeLayers]);

  // Standard GIS Layer Stacking & Ordering Engine
  const sortAndApplyConsistentZIndex = (layers: MapLayerConfig[]): MapLayerConfig[] => {
    const roadLayers: MapLayerConfig[] = [];
    const adminLayers: MapLayerConfig[] = [];
    const thematicLayers: MapLayerConfig[] = [];

    layers.forEach((l) => {
      const id = l.id || '';
      if (id.startsWith('legacy_segments_') || id.startsWith('legacy_poros_') || id.startsWith('legacy_utama')) {
        roadLayers.push(l);
      } else if (id.startsWith('legacy_desa_') || id.startsWith('batas_kecamatan_') || id.startsWith('legacy_batas_desa')) {
        adminLayers.push(l);
      } else {
        thematicLayers.push(l);
      }
    });

    // 1. Road Infrastructure (Highest Priority): Segmen (120) -> Poros (110) -> Utama (100)
    roadLayers.sort((a, b) => {
      const getScore = (id: string) => {
        if (id.startsWith('legacy_segments_')) return 3;
        if (id.startsWith('legacy_poros_')) return 2;
        return 1;
      };
      return getScore(b.id) - getScore(a.id);
    });

    const assignedRoads = roadLayers.map((l, i) => ({
      ...l,
      zIndex: 120 - i * 5,
    }));

    // 2. Administrative Boundaries (Middle Priority): Desa (60) -> Kecamatan (50)
    adminLayers.sort((a, b) => {
      const getScore = (id: string) => {
        if (id.startsWith('legacy_desa_')) return 2;
        return 1;
      };
      return getScore(b.id) - getScore(a.id);
    });

    const assignedAdmin = adminLayers.map((l, i) => ({
      ...l,
      zIndex: 60 - i * 5,
    }));

    // 3. Thematic / GeoNode / WMS Layers (Base Thematic: 45 down to 10)
    const totalThematic = thematicLayers.length;
    const assignedThematic = thematicLayers.map((l, i) => ({
      ...l,
      zIndex: Math.max(10, 45 - Math.round((i / Math.max(1, totalThematic)) * 30)),
    }));

    // Ordered list in Tab Menu Layer: Roads -> Admin -> Thematic
    return [...assignedRoads, ...assignedAdmin, ...assignedThematic];
  };

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
          setActiveLayers(prev => sortAndApplyConsistentZIndex([...defaultVisibleLayers, ...prev]));
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

      if (layer.id.startsWith('legacy_poros_')) {
        itemsMap.set('Jalan Poros Desa', {
          label: 'Jalan Poros Desa',
          color: '#f97316',
          active: true
        });
      } else if (layer.id.startsWith('legacy_segments_')) {
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
      const next = [newLayer, ...prev.filter(l => l.id !== newLayer.id)];
      return sortAndApplyConsistentZIndex(next);
    });
  };

  const handleRemoveLayer = (id: string) => {
    setActiveLayers(prev => sortAndApplyConsistentZIndex(prev.filter(l => l.id !== id)));
  };

  const handleReorderLayers = (newOrder: MapLayerConfig[]) => {
    setActiveLayers(sortAndApplyConsistentZIndex(newOrder));
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

  // Dedicated Clean Reset for Administrative Vector Layers
  const handleResetAdminFilters = () => {
    setSelectedKecamatan(null);
    setSelectedDesa(null);
    setRekapData(null);
    setSegmentsData(null);

    setActiveLayers(prev => {
      const filtered = prev.filter(l =>
        !l.id.startsWith('batas_kecamatan_') &&
        !l.id.startsWith('legacy_desa_') &&
        !l.id.startsWith('legacy_poros_') &&
        !l.id.startsWith('legacy_segments_')
      );
      return sortAndApplyConsistentZIndex(filtered);
    });

    mapRef.current?.zoomToFeature(null);
  };

  // Administrative selection handlers
  const handleSelectKecamatan = async (kecamatan: Kecamatan | null) => {
    setLoading(true);
    setSelectedKecamatan(kecamatan);
    setSelectedDesa(null);
    setRekapData(null);
    setSegmentsData(null);

    setActiveLayers(prev => {
      const filtered = prev.filter(l =>
        !l.id.startsWith('batas_kecamatan_') &&
        !l.id.startsWith('legacy_desa_') &&
        !l.id.startsWith('legacy_poros_') &&
        !l.id.startsWith('legacy_segments_')
      );
      return sortAndApplyConsistentZIndex(filtered);
    });

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
            !l.id.startsWith('legacy_poros_') &&
            !l.id.startsWith('legacy_segments_')
          );

          const layerId = `batas_kecamatan_${kecamatan.id}`;
          const layerTitle = `KECAMATAN: ${kecamatan.nama_kecamatan}`;
          const newLayer: MapLayerConfig = {
            id: layerId,
            title: layerTitle,
            type: 'vector',
            data: geojson,
            visible: true,
            opacity: 1.0,
            style: { stroke: '#38bdf8', width: 2.5, lineDash: [4, 4], fill: 'rgba(56, 189, 248, 0.08)', labelField: 'nama_desa' }
          };
          return sortAndApplyConsistentZIndex([newLayer, ...filtered]);
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

    setActiveLayers(prev => {
      const filtered = prev.filter(l =>
        !l.id.startsWith('legacy_desa_') &&
        !l.id.startsWith('legacy_poros_') &&
        !l.id.startsWith('legacy_segments_')
      );
      return sortAndApplyConsistentZIndex(filtered);
    });

    if (!desa) {
      setRekapData(null);
      setSegmentsData(null);
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
        const filtered = prev.filter(l =>
          !l.id.startsWith('legacy_desa_') &&
          !l.id.startsWith('legacy_poros_') &&
          !l.id.startsWith('legacy_segments_')
        );

        const newLayersToAdd: MapLayerConfig[] = [];

        if (desaGeojson) {
          newLayersToAdd.push({
            id: `legacy_desa_${desa.id}`,
            title: `Wilayah: ${desa.nama_desa}`,
            type: 'vector',
            data: desaGeojson,
            visible: true,
            opacity: 1.0,
          });
        }

        if (porosGeojson) {
          newLayersToAdd.push({
            id: `legacy_poros_${desa.id}`,
            title: `Jalan Poros: ${desa.nama_desa}`,
            type: 'vector',
            data: porosGeojson,
            visible: true,
            opacity: 1,
          });
        }

        if (segmentsGeojson) {
          newLayersToAdd.push({
            id: `legacy_segments_${desa.id}`,
            title: `Segmen Jalan: ${desa.nama_desa}`,
            type: 'vector',
            data: segmentsGeojson,
            visible: true,
            opacity: 1,
          });
        }

        return sortAndApplyConsistentZIndex([...newLayersToAdd, ...filtered]);
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

  // ── INTEGRASI QUICK AKSI DARI URL SEARCH PARAMS ──────────────────
  const paramKecamatan = searchParams.get('kecamatan');
  const paramIdKecamatan = searchParams.get('id_kecamatan');
  const paramDesa = searchParams.get('desa');
  const paramIdDesa = searchParams.get('id_desa');
  const hasInitializedParams = useRef(false);

  useEffect(() => {
    async function initFromQueryParams() {
      if (hasInitializedParams.current) return;
      if (!paramKecamatan && !paramIdKecamatan) return;

      try {
        const list = await kecamatanService.getKecamatan();
        if (Array.isArray(list)) {
          const matchedKec = list.find((k) =>
            (paramIdKecamatan && String(k.id) === String(paramIdKecamatan)) ||
            (paramKecamatan && k.nama_kecamatan.toLowerCase() === paramKecamatan.toLowerCase())
          );

          if (matchedKec) {
            hasInitializedParams.current = true;
            await handleSelectKecamatan(matchedKec);

            if (paramDesa || paramIdDesa) {
              const desaList = await desaService.getDesa(matchedKec.id);
              if (Array.isArray(desaList)) {
                const matchedDesa = desaList.find((d) =>
                  (paramIdDesa && String(d.id) === String(paramIdDesa)) ||
                  (paramDesa && d.nama_desa.toLowerCase() === paramDesa.toLowerCase())
                );
                if (matchedDesa) {
                  await handleSelectDesa(matchedDesa);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to initialize from query params:", err);
      }
    }

    initFromQueryParams();
  }, [paramKecamatan, paramIdKecamatan, paramDesa, paramIdDesa]);

  const [activeTab, setActiveTab] = useState<string>('catalog');

  // Refined Sidebar Content with Dark Theme Console Look
  const SidebarContent = (
    <div className="flex flex-col h-full bg-[#080B11] text-slate-200 min-h-0">
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val)} className="flex-1 flex flex-col min-h-0 gap-0">
        {/* Streamlined Unified Header */}
        <div className="p-3 border-b border-white/[0.08] bg-[#0E131F]/90 shrink-0 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-800 border border-white/[0.1] text-emerald-400 flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div className="leading-none">
                <h3 className="text-xs font-bold text-white tracking-tight">Panel Kontrol Spasial</h3>
                <span className="text-[10px] text-slate-400 font-medium">GIS MELAROSA</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08]"
              onClick={() => setIsSidebarOpen(false)}
              title="Tutup Sidebar"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <TabsList className="w-full grid grid-cols-3 h-9 bg-slate-900/90 p-1 border border-white/[0.08] rounded-xl">
            <TabsTrigger value="catalog" className="text-xs font-semibold gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950 text-slate-400">
              <FolderOpen className="w-3.5 h-3.5" />
              Katalog
            </TabsTrigger>
            <TabsTrigger value="layers" className="text-xs font-semibold gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950 text-slate-400">
              <LayersIcon className="w-3.5 h-3.5" />
              Layer
              {activeLayers.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] h-4 bg-slate-800 text-slate-300 border border-white/[0.08]">
                  {activeLayers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="filters" className="text-xs font-semibold gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950 text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              Filter
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="catalog" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden bg-[#080B11]">
          <GeonodeDatasetPanel
            onAddLayer={handleAddLayer}
            activeLayerIds={activeLayerIds}
          />
        </TabsContent>

        <TabsContent value="layers" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden bg-[#080B11]">
          <MapLayerControlPanel
            layers={activeLayers}
            onRemoveLayer={handleRemoveLayer}
            onReorder={handleReorderLayers}
            onToggleVisibility={handleToggleVisibility}
            onOpacityChange={handleOpacityChange}
            onUpdateLayerParams={handleUpdateLayerParams}
          />
        </TabsContent>

        <TabsContent value="filters" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden bg-[#080B11]">
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar">
            
            {/* Section 1: Pencarian Alamat & Lokasi */}
            <div className="bg-[#0B101D] p-3.5 rounded-2xl border border-white/[0.08] space-y-2.5 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <Search size={13} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200 leading-none">
                    Pencarian Alamat
                  </h4>
                  <span className="text-[10px] text-slate-500">Cari nama lokasi atau jalan</span>
                </div>
              </div>
              <AddressSearch onSelect={handleSearchSelect} />
            </div>

            {/* Section 2: Filter Wilayah Administrasi */}
            <div className="bg-[#0B101D] p-3.5 rounded-2xl border border-white/[0.08] space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400 shrink-0">
                    <Filter size={13} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 leading-none">
                      Wilayah Administrasi
                    </h4>
                    <span className="text-[10px] text-slate-500">Zoom ke Kecamatan & Desa</span>
                  </div>
                </div>
                {(selectedKecamatan || selectedDesa) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleResetAdminFilters}
                    className="h-6 px-2 text-[10px] font-bold text-slate-400 hover:text-white"
                  >
                    Reset
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 mb-1 block uppercase tracking-wider">Kecamatan</span>
                  <KecamatanDropdown
                    className="w-full"
                    selectedKecamatanName={selectedKecamatan?.nama_kecamatan}
                    onSelectKecamatan={handleSelectKecamatan}
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 mb-1 block uppercase tracking-wider">Desa / Kelurahan</span>
                  <DesaDropdown
                    className="w-full"
                    idKecamatan={selectedKecamatan?.id}
                    selectedDesaName={selectedDesa?.nama_desa}
                    onSelectDesa={handleSelectDesa}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Input Koordinat GPS Manual */}
            <div className="bg-[#0B101D] p-3.5 rounded-2xl border border-white/[0.08] space-y-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-950/60 border border-amber-800/40 flex items-center justify-center text-amber-400 shrink-0">
                  <MapPin size={13} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200 leading-none">
                    Titik Koordinat GPS
                  </h4>
                  <span className="text-[10px] text-slate-500">Plot manual atau deteksi GPS</span>
                </div>
              </div>

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
    <div className="relative w-screen h-screen overflow-hidden bg-[#080B11] font-sans select-none text-slate-100">

      {/* ── 1. FLOATING TOP BAR (HEADER PETA MODERN) ──────────────────── */}
      <header className="absolute top-3 left-3 right-3 z-30 pointer-events-none flex items-center justify-between gap-3">
        {/* Kiri: Brand Logo + Menu Publik Dropdown + Sidebar Toggle */}
        <div className="pointer-events-auto flex items-center gap-2 bg-[#080B11]/90 backdrop-blur-xl px-3 py-2 rounded-2xl border border-white/[0.08] shadow-2xl">
          {/* Logo Mark */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group hover:opacity-90 transition-opacity"
            title="Kembali ke Beranda"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 border border-white/[0.12] text-white shadow-sm">
              <IconTopologyComplex size={18} className="text-emerald-400" />
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="text-sm font-extrabold tracking-tight text-white">
                MELAROSA
              </span>
              <span className="text-[9px] font-semibold text-slate-400">
                Sistem Informasi Geospasial
              </span>
            </div>
          </Link>

          <div className="h-4 w-px bg-white/[0.08] mx-1" />

          {/* Menu Publik Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.06] gap-1.5"
              >
                <Menu className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden md:inline">Menu Publik</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 p-2 bg-[#0C101A] backdrop-blur-xl border border-white/[0.08] shadow-2xl rounded-2xl text-slate-200">
              <DropdownMenuLabel className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Navigasi Portal Publik
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 bg-white/[0.06]" />
              {PUBLIC_NAV_LINKS.map((link) => (
                <DropdownMenuItem
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className="rounded-xl text-xs font-semibold gap-2.5 py-2 cursor-pointer text-slate-200 focus:bg-slate-800 focus:text-white"
                >
                  <link.icon size={16} className="text-slate-400 shrink-0" />
                  <div className="flex flex-col leading-none">
                    <span className="font-bold text-white">{link.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5">{link.desc}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-4 w-px bg-white/[0.08] mx-0.5" />

          {/* Toggle Sidebar */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={cn(
              "h-8 px-2.5 rounded-xl text-xs font-semibold gap-1.5 transition-all cursor-pointer",
              isSidebarOpen
                ? "bg-white/[0.08] text-white border border-white/[0.08]"
                : "text-slate-300 hover:text-white hover:bg-white/[0.04]"
            )}
            title={isSidebarOpen ? "Sembunyikan Panel Kontrol" : "Tampilkan Panel Kontrol"}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Panel Kontrol</span>
            {activeLayers.length > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-slate-800 border border-white/[0.08] text-slate-300">
                {activeLayers.length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Tengah: Quick Filter Indicator (Desa/Kecamatan terpilih) */}
        {(selectedKecamatan || selectedDesa) && (
          <div className="pointer-events-auto hidden lg:flex items-center gap-2 bg-[#080B11]/90 backdrop-blur-xl px-3.5 py-2 rounded-2xl border border-white/[0.08] shadow-2xl animate-in fade-in slide-in-from-top-2">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-white">
              {selectedDesa ? `Desa ${selectedDesa.nama_desa}` : `Kecamatan ${selectedKecamatan?.nama_kecamatan}`}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleResetAdminFilters}
              className="h-5 w-5 rounded-md hover:bg-white/[0.08] text-slate-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Kanan: Link Portal Admin */}
        <div className="pointer-events-auto flex items-center gap-2 bg-[#080B11]/90 backdrop-blur-xl px-2.5 py-1.5 rounded-2xl border border-white/[0.08] shadow-2xl">
          <Link to="/login">
            <Button
              size="sm"
              className="h-8 px-3 rounded-xl text-xs font-semibold bg-white text-slate-950 hover:bg-slate-200 gap-1.5 shadow-sm cursor-pointer"
            >
              <IconLogin size={14} />
              <span className="hidden sm:inline">Portal Operator</span>
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
          className="top-16 left-3 bottom-3 h-[calc(100vh-76px)] rounded-2xl border border-white/[0.08] shadow-2xl z-30 pt-0 overflow-hidden"
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
          isInspectMode={isInspectMode}
          bufferCenter={bufferCenter}
          bufferRadiusKm={bufferRadiusKm}
          isBufferMode={isBufferMode}
          overlapGeometry={overlapGeometry}
          onBufferPointSelect={(coord) => {
            setBufferCenter(coord);
            setIsBufferPanelOpen(true);
          }}
          onInspectFeatures={(features, coord) => {
            if (features.length > 0 && coord && !isBufferMode) {
              setInspectedFeatures(features);
              setInspectedCoordinate(coord);
              setIsInspectorOpen(true);
            }
          }}
        />

        {/* Floating Inspect Mode Indicator Badge */}
        {isInspectMode && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-[#080B11]/95 text-emerald-400 border border-emerald-500/30 px-3.5 py-1.5 rounded-full shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold tracking-tight text-white">Mode Analisa Spasial Aktif</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">• Klik pada peta / layer WMS untuk analisa</span>
            <button
              type="button"
              onClick={() => setIsInspectMode(false)}
              className="ml-1 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Floating Buffer Analysis Mode Indicator Badge */}
        {isBufferMode && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-[#080B11]/95 text-cyan-400 border border-cyan-500/30 px-3.5 py-1.5 rounded-full shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-bold tracking-tight text-white">Mode Analisis Radius (Turf.js) Aktif</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">• Klik pada peta untuk membuat titik pusat buffer</span>
            <button
              type="button"
              onClick={() => {
                setIsBufferMode(false);
                setIsBufferPanelOpen(false);
                setBufferCenter(null);
                setOverlapGeometry(null);
              }}
              className="ml-1 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div
            className={cn(
              "absolute z-40 flex items-center gap-2.5 bg-[#080B11]/95 backdrop-blur-xl px-3.5 py-2 rounded-xl shadow-xl border border-white/[0.08] transition-all duration-300",
              isSidebarOpen ? "top-20 left-[356px]" : "top-20 left-4"
            )}
          >
            <div className="h-4 w-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-slate-200">Memuat layer spasial...</span>
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

        {/* Map Zoom / Geolocation / Inspect / Buffer / Cross-Layer Controls (Kanan Atas) */}
        <MapViewMapControls
          map={mapInstance}
          isInspectMode={isInspectMode}
          onToggleInspectMode={() => {
            const nextState = !isInspectMode;
            setIsInspectMode(nextState);
            if (nextState) {
              setIsBufferMode(false);
              setIsBufferPanelOpen(false);
              setIsCrossLayerOpen(false);
              setOverlapGeometry(null);
            }
          }}
          isBufferMode={isBufferMode}
          onToggleBufferMode={() => {
            const nextState = !isBufferMode;
            setIsBufferMode(nextState);
            if (nextState) {
              setIsInspectMode(false);
              setIsInspectorOpen(false);
              setIsCrossLayerOpen(false);
            } else {
              setIsBufferPanelOpen(false);
              setBufferCenter(null);
              setOverlapGeometry(null);
            }
          }}
          isCrossLayerMode={isCrossLayerOpen}
          onToggleCrossLayerMode={() => {
            const nextState = !isCrossLayerOpen;
            setIsCrossLayerOpen(nextState);
            if (nextState) {
              setIsInspectMode(false);
              setIsInspectorOpen(false);
              setIsBufferMode(false);
              setIsBufferPanelOpen(false);
            } else {
              setOverlapGeometry(null);
            }
          }}
          onZoomIn={() => mapRef.current?.zoomIn()}
          onZoomOut={() => mapRef.current?.zoomOut()}
          onResetBearing={() => mapRef.current?.resetRotation()}
          className="absolute top-20 right-4 z-20"
        />

        {/* Spatial Inspector & Single-Feature Overlap Panel */}
        <SpatialInspector
          features={inspectedFeatures}
          coordinate={inspectedCoordinate}
          isOpen={isInspectorOpen && !isBufferMode && !isCrossLayerOpen}
          activeLayers={activeLayers}
          onHighlightGeometryChange={setOverlapGeometry}
          onFitOverlap={() => mapRef.current?.fitOverlap()}
          onClose={() => {
            setIsInspectorOpen(false);
            setOverlapGeometry(null);
          }}
          onFocusFeature={(feat) => {
            if (feat.coordinate && mapRef.current) {
              mapRef.current.zoomToCoordinate(feat.coordinate[1], feat.coordinate[0], 16);
            }
          }}
        />

        {/* Spatial Buffer & Overlap Analysis Panel (Turf.js Engine) */}
        <SpatialBufferAnalysisPanel
          isOpen={isBufferPanelOpen && !isCrossLayerOpen}
          center={bufferCenter}
          radiusKm={bufferRadiusKm}
          onRadiusChange={setBufferRadiusKm}
          roadFeatures={allRoadFeatures}
          activeWmsLayers={activeLayers.filter(l => l.type === 'wms')}
          onClose={() => {
            setIsBufferPanelOpen(false);
            setBufferCenter(null);
            setOverlapGeometry(null);
          }}
          onFocus={() => {
            if (overlapGeometry) {
              mapRef.current?.fitOverlap();
            } else {
              mapRef.current?.fitBuffer();
            }
          }}
          onOverlapGeometryChange={setOverlapGeometry}
        />

        {/* Cross-Layer Overlap Analysis Panel (Jalan vs Pola Ruang / Hutan) */}
        <CrossLayerAnalysisPanel
          isOpen={isCrossLayerOpen}
          onClose={() => {
            setIsCrossLayerOpen(false);
            setOverlapGeometry(null);
          }}
          roadFeatures={allRoadFeatures}
          activeLayers={activeLayers}
          onHighlightGeometryChange={setOverlapGeometry}
          onFocusGeometry={(geom) => {
            if (mapRef.current && geom) {
              mapRef.current.zoomToFeature(geom);
            }
          }}
        />

        {/* Floating Basemap Selector Popover (Kanan Bawah) */}
        <div className="absolute bottom-6 right-4 z-20">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="h-10 px-3.5 rounded-xl bg-[#0C101A]/95 hover:bg-slate-800 text-white hover:text-white backdrop-blur-xl border border-white/[0.08] shadow-2xl text-xs font-semibold gap-2 cursor-pointer transition-colors"
              >
                <IconLayersSubtract size={16} className="text-emerald-400 shrink-0" />
                <span className="text-white">Peta Dasar: {activeBasemap.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="end"
              className="w-72 p-3 bg-[#0C101A] backdrop-blur-xl border border-white/[0.08] shadow-2xl rounded-2xl text-slate-200"
            >
              <p className="text-xs font-bold text-white mb-2.5">Pilih Peta Dasar (Basemap)</p>
              <div className="grid grid-cols-2 gap-2">
                {BASEMAPS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setActiveBasemap(b)}
                    className={cn(
                      "relative rounded-xl overflow-hidden border-2 transition-all group text-left cursor-pointer",
                      activeBasemap.id === b.id
                        ? "border-white ring-2 ring-white/20"
                        : "border-white/[0.08] hover:border-white/40"
                    )}
                  >
                    <img src={b.thumbnail} alt={b.name} className="w-full h-14 object-cover" />
                    <div className="p-1.5 bg-[#080B11]/90 backdrop-blur-xs text-white">
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
            className="pointer-events-auto px-4 h-9 bg-[#0B101D]/90 hover:bg-[#121829] text-white backdrop-blur-xl rounded-full shadow-2xl border border-emerald-500/30 hover:border-emerald-500/60 transition-all font-bold text-xs gap-2 cursor-pointer group"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Activity className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Rekap Desa {selectedDesa.nama_desa}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-950 text-[10px] text-emerald-300 font-mono border border-emerald-800/40">
              {Math.min(100, Math.round(((rekapData.total_panjang_dibangun || 0) / Math.max(1, (rekapData.total_panjang_aset || 0) - (rekapData.total_panjang_puk || 0))) * 100))}%
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 rotate-180" />
          </Button>
        </div>
      )}

      {/* ── 4. REKAP PEMBANGUNAN BOTTOM SHEET PANEL ─────────────────────── */}
      <RekapPembangunanPanel
        isOpen={isRekapOpen}
        onOpenChange={setIsRekapOpen}
        rekapData={rekapData}
        segmentsData={segmentsData}
        onFocusSegment={(feature) => mapRef.current?.zoomToFeature(feature)}
      />

    </div>
  );
}
