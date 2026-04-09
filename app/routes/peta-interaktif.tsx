import { useState, useRef } from 'react';
import { ChevronDown, ChevronUp, Map as MapIcon, Info, Layers } from 'lucide-react';
import { PublicNavbar } from "~/components/public-navbar";
import { OpenLayersMap, type OpenLayersMapRef } from "~/features/peta/components/OpenLayersMap";
import { MapControls } from "~/features/monitoring/components/MapControls";
import { KecamatanDropdown } from "~/features/peta/components/KecamatanDropdown";
import { DesaDropdown } from "~/features/peta/components/DesaDropdown";
import { kecamatanService, type Kecamatan } from "~/services/kecamatan";
import { desaService, type Desa } from "~/services/desa";

import { Checkbox } from '~/components/ui/checkbox';
import { jalanService } from "~/services/jalan";
import { cn } from '~/lib/utils';
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
  return [
    { title: "Peta Interaktif - GIGI'S Monitoring" },
    { name: "description", content: "Peta Interaktif Infrastruktur Jalan Poros Desa Bojonegoro" },
  ];
};

export default function PetaInteraktifPage() {
  const mapRef = useRef<OpenLayersMapRef>(null);
  const [selectedKecamatan, setSelectedKecamatan] = useState<Kecamatan | null>(null);
  const [selectedDesa, setSelectedDesa] = useState<Desa | null>(null);
  const [geojsonData, setGeojsonData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isExplorationExpanded, setIsExplorationExpanded] = useState(true);
  const [isLegendExpanded, setIsLegendExpanded] = useState(true);
  const [showJalanKabupaten, setShowJalanKabupaten] = useState(true);
  const [showBatasDesa, setShowBatasDesa] = useState(true);
  const [showJalanUtama, setShowJalanUtama] = useState(true);
  const [showSegmenJalan, setShowSegmenJalan] = useState(true);


  const handleSelectKecamatan = async (kecamatan: Kecamatan) => {
    setLoading(true);
    setSelectedKecamatan(kecamatan);
    setSelectedDesa(null);
    setGeojsonData(null);

    try {
      // Hit /desa/geojson?id_kecamatan={id}&format=geojson
      const geojson = await desaService.getGeojsonDesa(kecamatan.id);
      if (geojson) {
        const features = (geojson as any).features || ((geojson as any).type === 'Feature' ? [geojson] : []);
        // Inject layer property
        const processedFeatures = features.map((f: any) => ({
          ...f,
          properties: { ...f.properties, _layer: 'batas_desa' }
        }));
        setGeojsonData({ type: 'FeatureCollection', features: processedFeatures });
      }
    } catch (error) {
      console.error("Failed to fetch kecamatan geojson", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDesa = async (desa: Desa) => {
    setLoading(true);
    setSelectedDesa(desa);

    try {
      // 1. Fetch Desa Boundary (for zoom extent)
      const desaGeojson = await desaService.getDesaGeojsonById(desa.id);

      // 2. Fetch road segments
      const segmentsGeojson = await jalanService.getSegmenByDesa(desa.id);

      // 3. Fetch main road (Jalan Utama) using desa ID
      const mainRoadGeojson = await jalanService.getJalanUtamaByDesa(desa.id);

      // Merge all features with layer identifiers
      const combinedFeatures: any[] = [];

      if (desaGeojson) {
        const features = (desaGeojson as any).features || ((desaGeojson as any).type === 'Feature' ? [desaGeojson] : []);
        combinedFeatures.push(...features.map((f: any) => ({
          ...f,
          properties: { ...f.properties, _layer: 'batas_desa' }
        })));
      }

      if (segmentsGeojson) {
        const features = (segmentsGeojson as any).features || ((segmentsGeojson as any).type === 'Feature' ? [segmentsGeojson] : []);
        combinedFeatures.push(...features.map((f: any) => ({
          ...f,
          properties: { ...f.properties, _layer: 'jalan_segmen' }
        })));
      }

      if (mainRoadGeojson) {
        const features = (mainRoadGeojson as any).features || ((mainRoadGeojson as any).type === 'Feature' ? [mainRoadGeojson] : []);
        combinedFeatures.push(...features.map((f: any) => ({
          ...f,
          properties: { ...f.properties, _layer: 'jalan_utama' }
        })));
      }

      if (combinedFeatures.length > 0) {
        setGeojsonData({
          type: 'FeatureCollection',
          features: combinedFeatures
        });
      }
    } catch (error) {
      console.error("Failed to fetch desa data", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      <PublicNavbar />

      <main className="flex-1 relative">
        {/* Header Overlay */}
        <div className="absolute top-6 left-6 z-10 flex flex-col gap-3 w-[280px]">
          <div className="bg-white/95 backdrop-blur-md rounded-xl border border-white shadow-xl overflow-hidden transition-all duration-300 ease-in-out">
            {/* Header / Toggle */}
            <button 
              onClick={() => setIsExplorationExpanded(!isExplorationExpanded)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="bg-blue-50 p-1.5 rounded-lg text-blue-600">
                  <Layers size={16} />
                </div>
                <div className="text-left">
                  <h1 className="text-sm font-extrabold text-slate-900 tracking-tight leading-none">Eksplorasi & Layer</h1>
                  <p className="text-[10px] text-slate-500 font-medium italic mt-0.5">Navigasi & Kontrol Layer</p>
                </div>
              </div>
              {isExplorationExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>

            {/* Content Body */}
            <div className={cn(
              "p-5 pt-0 transition-all duration-300 ease-in-out overflow-hidden",
              isExplorationExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
            )}>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <KecamatanDropdown
                    className="w-full"
                    selectedKecamatanName={selectedKecamatan?.nama_kecamatan}
                    onSelectKecamatan={handleSelectKecamatan}
                  />
                </div>

                <div className="space-y-1.5">
                  <DesaDropdown
                    className="w-full"
                    idKecamatan={selectedKecamatan?.id}
                    selectedDesaName={selectedDesa?.nama_desa}
                    onSelectDesa={handleSelectDesa}
                  />
                </div>


                <div className="pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-2 ml-1">Overlay Tambahan</p>
                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer group transition-colors border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-1.5 rounded-md transition-colors",
                        showJalanKabupaten ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-400"
                      )}>
                        <MapIcon size={14} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-slate-700 tracking-tight">Jalan Kabupaten</span>
                        <span className="text-[9px] text-slate-400 font-medium">Data WMS 2022</span>
                      </div>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={showJalanKabupaten}
                        onChange={() => setShowJalanKabupaten(!showJalanKabupaten)}
                      />
                      <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-20 bg-white/40 backdrop-blur-[2px] flex items-center justify-center">
            <div className="bg-white p-4 rounded-xl shadow-lg flex items-center gap-3 border">
              <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-slate-700">Memuat data spasial...</span>
            </div>
          </div>
        )}

        {/* Map Container */}
        <OpenLayersMap
          ref={mapRef}
          className="w-full h-full grayscale-[0.2] contrast-[1.1]"
          geojsonData={geojsonData}
          showJalanKabupaten={showJalanKabupaten}
          showBatasDesa={showBatasDesa}
          showJalanUtama={showJalanUtama}
          showSegmenJalan={showSegmenJalan}
        />

        {/* Map Controls */}
        <div className="absolute top-6 right-6 z-10">
          <MapControls 
            onZoomIn={() => mapRef.current?.zoomIn()}
            onZoomOut={() => mapRef.current?.zoomOut()}
            onResetBearing={() => mapRef.current?.resetRotation()}
          />
        </div>

        {/* Info Legend Overlay */}
        <div className="absolute bottom-8 right-8 z-10">
          <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl max-w-xs text-white overflow-hidden transition-all duration-300">
            {/* Header / Toggle */}
            <button 
              onClick={() => setIsLegendExpanded(!isLegendExpanded)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="bg-slate-800 p-1.5 rounded-lg text-blue-400">
                  <Info size={16} />
                </div>
                <h3 className="font-bold text-xs tracking-tight text-slate-100 italic font-inter text-left">Detail Informasi</h3>
              </div>
              {isLegendExpanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
            </button>

            {/* Content Body */}
            <div className={cn(
              "px-5 pb-5 transition-all duration-300 ease-in-out overflow-hidden",
              isLegendExpanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
            )}>
              {selectedKecamatan ? (
                <div className="space-y-3 pt-1">
                  <div className="pb-3 border-b border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-0.5">Wilayah Kecamatan</p>
                    <p className="text-base font-bold text-blue-400">{selectedKecamatan.nama_kecamatan}</p>
                  </div>
                  {selectedDesa && (
                    <div className="pb-3 border-b border-slate-800/50">
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-0.5">Wilayah Desa</p>
                      <p className="text-base font-bold text-emerald-400">{selectedDesa.nama_desa}</p>
                    </div>
                  )}
                  {!selectedDesa && (
                    <p className="text-[11px] text-slate-400 italic">Pilih desa untuk informasi lebih spesifik.</p>
                  )}

                  {/* Legend Inline with Toggles (Clickable) */}
                  <div className="pt-2 space-y-0.5">
                    <button 
                      onClick={() => setShowBatasDesa(!showBatasDesa)}
                      className={cn(
                        "flex items-center gap-3 w-full p-2 rounded-lg transition-all hover:bg-white/5 text-left group",
                        !showBatasDesa && "opacity-40"
                      )}
                    >
                      <div className={cn("h-0.5 w-4 border border-dashed rounded-full transition-colors", showBatasDesa ? "border-blue-500/80" : "border-slate-600")} />
                      <span className={cn("text-[10px] transition-colors", showBatasDesa ? "text-slate-200 font-bold" : "text-slate-500 font-medium")}>Batas Wilayah Desa</span>
                    </button>

                    <button 
                      onClick={() => setShowJalanKabupaten(!showJalanKabupaten)}
                      className={cn(
                        "flex items-center gap-3 w-full p-2 rounded-lg transition-all hover:bg-white/5 text-left group",
                        !showJalanKabupaten && "opacity-40"
                      )}
                    >
                      <div className={cn("h-1 w-4 rounded-full transition-colors", showJalanKabupaten ? "bg-indigo-500" : "bg-slate-700")} />
                      <span className={cn("text-[10px] transition-colors", showJalanKabupaten ? "text-indigo-400 font-bold" : "text-slate-500 font-medium")}>Jalan Kabupaten (WMS)</span>
                    </button>

                    <button 
                      onClick={() => setShowJalanUtama(!showJalanUtama)}
                      className={cn(
                        "flex items-center gap-3 w-full p-2 rounded-lg transition-all hover:bg-white/5 text-left group",
                        !showJalanUtama && "opacity-40"
                      )}
                    >
                      <div className={cn("h-1 w-4 rounded-full transition-colors", showJalanUtama ? "bg-slate-500" : "bg-slate-700")} />
                      <span className={cn("text-[10px] transition-colors", showJalanUtama ? "text-slate-300 font-bold" : "text-slate-500 font-medium")}>Jalan Utama (Poros)</span>
                    </button>

                    <button 
                      onClick={() => setShowSegmenJalan(!showSegmenJalan)}
                      className={cn(
                        "flex items-center gap-3 w-full p-2 rounded-lg transition-all hover:bg-white/5 text-left group",
                        !showSegmenJalan && "opacity-40"
                      )}
                    >
                      <div className={cn("h-1.5 w-4 rounded-full transition-colors", showSegmenJalan ? "bg-emerald-500" : "bg-slate-700")} />
                      <span className={cn("text-[10px] transition-colors", showSegmenJalan ? "text-emerald-400 font-bold" : "text-slate-500 font-medium")}>Segmen Jalan Pekerjaan</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 leading-relaxed pt-1">
                  Gunakan panel pencarian di sudut kiri atas untuk menavigasi ke wilayah tertentu di Kabupaten Bojonegoro.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
