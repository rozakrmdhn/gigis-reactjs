/**
 * Editor WebGIS - Halaman Dedicated Editor Spasial
 * 
 * Rute: /admin/monitoring/editor
 * 
 * Tanggung Jawab Halaman (§24 GIS_ARCHITECTURE.md):
 * 1. Menampilkan header aplikasi, filter/pemilih tipe infrastruktur aktif.
 * 2. Menginisialisasi dan me-render MapEditor secara dinamis.
 * 3. TIDAK mengelola logic editing spasial secara langsung (didelegasikan ke MapEditor).
 */

import React, { useEffect, useState } from 'react';
import type { MetaFunction } from 'react-router';
import { MapEditor } from '~/components/editor/MapEditor';
import { listInfrastrukturTipe } from '~/features/editor/services/editorApi';
import type { InfrastrukturTipeConfig } from '~/features/editor/core/editor.types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { 
  Layers, 
  Route, 
  MapPin, 
  Square, 
  RefreshCw, 
  Compass, 
  ShieldCheck, 
  SlidersHorizontal,
  Info
} from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    { title: "Editor Spasial WebGIS - MELAROSA" },
    { name: "description", content: "Editor Spasial Dinamis Infrastruktur Kabupaten Bojonegoro" },
  ];
};

export default function SpatialEditorPage() {
  const [types, setTypes] = useState<InfrastrukturTipeConfig[]>([]);
  const [selectedKode, setSelectedKode] = useState<string>('jalan');
  const [isLoadingTypes, setIsLoadingTypes] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch daftar infrastruktur_tipe untuk dropdown selector
  const fetchTypes = async () => {
    setIsLoadingTypes(true);
    setLoadError(null);
    try {
      const data = await listInfrastrukturTipe();
      setTypes(data);
      if (data.length > 0 && !data.some(d => d.kode === selectedKode || String(d.id) === selectedKode)) {
        setSelectedKode(data[0].kode);
      }
    } catch (err) {
      console.warn('[SpatialEditorPage] Menggunakan fallback tipe infrastruktur standar:', err);
      // Fallback tipe standar jika API master belum siap
      const fallbackList: InfrastrukturTipeConfig[] = [
        {
          id: 'jalan',
          kode: 'jalan',
          nama: 'Jalan Poros Desa',
          infrastruktur_tipe: 'LineString',
          aktif: true,
          deskripsi: 'Jaringan jalan poros desa',
          warna: '#3B82F6',
          capabilities: { select: true, draw: true, modify: true, snap: true, split: true, merge: true, extend: true, delete: true },
        },
        {
          id: 'jembatan',
          kode: 'jembatan',
          nama: 'Jembatan',
          infrastruktur_tipe: 'Point',
          aktif: true,
          deskripsi: 'Infrastruktur jembatan dan flyover',
          warna: '#F59E0B',
          capabilities: { select: true, draw: true, modify: true, snap: true, split: false, merge: false, extend: false, delete: true },
        },
        {
          id: 'embung',
          kode: 'embung',
          nama: 'Embung / Waduk',
          infrastruktur_tipe: 'Polygon',
          aktif: true,
          deskripsi: 'Embung penampungan air dan irigasi',
          warna: '#10B981',
          capabilities: { select: true, draw: true, modify: true, snap: true, split: false, merge: true, extend: false, delete: true },
        },
      ];
      setTypes(fallbackList);
    } finally {
      setIsLoadingTypes(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const activeTypeConfig = types.find(
    (t) => t.kode === selectedKode || String(t.id) === selectedKode
  );

  const getGeometryIcon = (geomType?: string) => {
    switch (geomType) {
      case 'LineString':
        return <Route className="w-3.5 h-3.5 mr-1 text-blue-400" />;
      case 'Point':
        return <MapPin className="w-3.5 h-3.5 mr-1 text-amber-400" />;
      case 'Polygon':
        return <Square className="w-3.5 h-3.5 mr-1 text-emerald-400" />;
      default:
        return <Compass className="w-3.5 h-3.5 mr-1 text-slate-400" />;
    }
  };

  return (
    <div className="w-full h-full min-h-[calc(100vh-4rem)] flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Bar Header */}
      <header className="flex-none h-16 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-400 shadow-inner">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-semibold tracking-tight text-white flex items-center gap-2">
              Editor Spasial WebGIS
              <Badge variant="outline" className="text-[10px] bg-blue-950/60 text-blue-300 border-blue-700/50 py-0 h-4">
                Dynamic Engine
              </Badge>
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              Digitasi, modifikasi geometri, dan pengelolaan atribut infrastruktur
            </p>
          </div>
        </div>

        {/* Right Controls: Type Selector & Geometry Indicator */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Tipe Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium hidden md:inline">Tipe:</span>
            <Select 
              value={selectedKode} 
              onValueChange={setSelectedKode}
              disabled={isLoadingTypes}
            >
              <SelectTrigger className="w-44 sm:w-56 h-9 bg-slate-800/90 border-slate-700 text-white text-xs font-medium focus:ring-1 focus:ring-blue-500">
                <SelectValue placeholder="Pilih Tipe Infrastruktur" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                {types.map((type) => (
                  <SelectItem 
                    key={type.kode || String(type.id)} 
                    value={type.kode || String(type.id)}
                    className="text-xs hover:bg-slate-700 focus:bg-slate-700 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <span>{type.nama}</span>
                      <span className="text-[10px] text-slate-400">({type.infrastruktur_tipe})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active Geometry Badge */}
          {activeTypeConfig && (
            <Badge 
              variant="secondary" 
              className="h-9 px-2.5 bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300 flex items-center font-normal"
            >
              {getGeometryIcon(activeTypeConfig.infrastruktur_tipe)}
              <span className="hidden sm:inline font-mono font-medium text-[11px]">
                {activeTypeConfig.infrastruktur_tipe}
              </span>
            </Badge>
          )}

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchTypes}
            disabled={isLoadingTypes}
            title="Muat ulang konfigurasi tipe"
            className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingTypes ? 'animate-spin text-blue-400' : ''}`} />
          </Button>
        </div>
      </header>

      {/* Main Content: Map Editor Viewport */}
      <main className="flex-1 relative w-full h-full overflow-hidden">
        {selectedKode ? (
          <MapEditor
            key={selectedKode}
            infrastructureTypeId={selectedKode}
            dynamic={true}
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 space-y-3">
            <SlidersHorizontal className="w-12 h-12 text-slate-600 animate-pulse" />
            <p className="text-sm">Silakan pilih tipe infrastruktur untuk memulai sesi editing.</p>
          </div>
        )}
      </main>
    </div>
  );
}
