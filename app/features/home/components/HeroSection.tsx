import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { IconMap2, IconLogin } from "@tabler/icons-react";
import { Globe, Layers, ArrowRight, MapPin, Search } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { OpenLayersMap, type MapLayerConfig, type OpenLayersMapRef } from "~/features/peta/components/OpenLayersMap";
import { kecamatanService, type Kecamatan } from "~/services/kecamatan";

interface HeroSectionProps {
  customMapLayers: MapLayerConfig[];
}

export function HeroSection({ customMapLayers }: HeroSectionProps) {
  const navigate = useNavigate();
  const mapRef = useRef<OpenLayersMapRef>(null);
  const [kecamatanList, setKecamatanList] = useState<Kecamatan[]>([]);
  const [selectedKecamatanId, setSelectedKecamatanId] = useState<string>("");
  const [selectedKecamatanName, setSelectedKecamatanName] = useState<string>("");

  useEffect(() => {
    async function loadKecamatan() {
      try {
        const list = await kecamatanService.getKecamatan();
        if (Array.isArray(list)) {
          setKecamatanList(list);
        }
      } catch (err) {
        console.error("Failed to load kecamatan list:", err);
      }
    }
    loadKecamatan();
  }, []);

  const handleSelectKecamatan = async (kecId: string) => {
    setSelectedKecamatanId(kecId);
    const found = kecamatanList.find((k) => String(k.id) === kecId);
    const nama = found?.nama_kecamatan || "";
    setSelectedKecamatanName(nama);

    if (kecId) {
      try {
        const geojson = await kecamatanService.getKecamatanGeojsonById(kecId);
        if (geojson && mapRef.current) {
          mapRef.current.zoomToFeature(geojson);
        }
      } catch (e) {
        console.error("Error zooming to kecamatan:", e);
      }
    }
  };

  const handleExploreClick = () => {
    if (selectedKecamatanId && selectedKecamatanName) {
      navigate(`/map-view?id_kecamatan=${encodeURIComponent(selectedKecamatanId)}&kecamatan=${encodeURIComponent(selectedKecamatanName)}`);
    } else {
      navigate("/map-view");
    }
  };

  return (
    <section className="relative pt-24 pb-12 md:py-28 overflow-hidden bg-[#080B11]">
      {/* Subtle dark radial vignette backdrop */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,_rgba(30,41,59,0.25)_0%,_transparent_70%)]" />

      <div className="container max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* ── LEFT COLUMN (6/12): NARRATIVE & QUICK FINDER ── */}
          <div className="lg:col-span-6 space-y-6 text-left">
            {/* Header badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-white/[0.08] text-slate-300 text-xs font-medium backdrop-blur-md shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Sistem Monitoring Pembangunan Infrastruktur Kabupaten Bojonegoro
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-[1.12]">
                Pantau Realisasi <br />
                <span className="text-slate-100">Infrastruktur Desa</span>{" "}
                <span className="text-slate-400 font-medium">Secara Spasial</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-400 font-normal leading-relaxed max-w-xl">
                Akses peta digital monitoring pembangunan infrastruktur untuk 430 desa di 28 kecamatan Kabupaten Bojonegoro — dari verifikasi lapangan hingga pelaporan fisik berbasis koordinat GPS.
              </p>
            </div>

            {/* ── QUICK FINDER BAR ── */}
            <div className="p-4 rounded-2xl bg-[#0E131F]/90 border border-white/[0.08] shadow-xl backdrop-blur-md space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  Cari Wilayah Kecamatan
                </span>
                <span className="text-[11px] text-slate-400">28 Kecamatan Terdata</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="flex-1">
                  <Select value={selectedKecamatanId} onValueChange={handleSelectKecamatan}>
                    <SelectTrigger className="h-11 rounded-xl bg-slate-900/90 border-white/[0.08] text-xs text-white placeholder:text-slate-500 focus:ring-1 focus:ring-slate-400">
                      <SelectValue placeholder="Pilih salah satu kecamatan..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 bg-slate-900 border-white/[0.08] text-slate-200 text-xs">
                      {kecamatanList.map((kec) => (
                        <SelectItem key={kec.id} value={String(kec.id)} className="cursor-pointer focus:bg-slate-800 focus:text-white">
                          Kecamatan {kec.nama_kecamatan}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleExploreClick}
                  className="h-11 px-5 rounded-xl font-semibold text-xs bg-white text-slate-950 hover:bg-slate-200 shadow-md cursor-pointer transition-all shrink-0 gap-1.5"
                >
                  <IconMap2 size={16} />
                  {selectedKecamatanName ? `Buka Kec. ${selectedKecamatanName}` : "Buka Peta Penuh"}
                </Button>
              </div>

              {selectedKecamatanName && (
                <div className="flex items-center justify-between text-[11px] text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 px-3 py-1.5 rounded-lg">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" />
                    Peta disorot ke Kecamatan {selectedKecamatanName}
                  </span>
                  <span className="text-[10px] text-slate-400 underline cursor-pointer hover:text-white" onClick={() => { setSelectedKecamatanId(""); setSelectedKecamatanName(""); }}>
                    Reset
                  </span>
                </div>
              )}
            </div>

            {/* Micro Metrics Chips */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-900/40 border border-white/[0.06]">
                <div className="text-base font-bold text-white leading-none">430</div>
                <div className="text-[11px] text-slate-400 mt-1">Desa Terpantau</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/40 border border-white/[0.06]">
                <div className="text-base font-bold text-white leading-none">28</div>
                <div className="text-[11px] text-slate-400 mt-1">Kecamatan</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/40 border border-white/[0.06]">
                <div className="text-base font-bold text-emerald-400 leading-none">GPS</div>
                <div className="text-[11px] text-slate-400 mt-1">Terverifikasi</div>
              </div>
            </div>

            {/* Secondary CTA */}
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
              <span>Akses Khusus Petugas Desa & OPD:</span>
              <Link to="/login" className="inline-flex items-center gap-1 text-slate-200 hover:text-white font-semibold underline underline-offset-4 transition-colors">
                <IconLogin size={14} /> Masuk Portal Operator
              </Link>
            </div>
          </div>

          {/* ── RIGHT COLUMN (6/12): INTERACTIVE MAP CONSOLE ── */}
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl md:rounded-3xl border border-white/[0.08] bg-[#0E131F]/80 p-2.5 shadow-2xl overflow-hidden backdrop-blur-md">
              <div className="relative rounded-xl md:rounded-2xl overflow-hidden aspect-[4/3] sm:aspect-[16/11] lg:aspect-square bg-[#06080D]">
                <OpenLayersMap
                  ref={mapRef}
                  className="w-full h-full"
                  center={[111.83, -7.15]}
                  zoom={10}
                  basemapUrl="https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
                  layers={customMapLayers}
                  showBatasDesa={true}
                  showJalanUtama={true}
                  showJalanKabupaten={true}
                  disablePopup={true}
                />

                {/* Gradient vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#080B11]/70 via-transparent to-[#080B11]/30 pointer-events-none" />

                {/* Top Left Badge: Map Identity */}
                <div className="absolute top-3 left-3 z-10 pointer-events-none">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 text-white backdrop-blur-md border border-white/[0.08] shadow-lg">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] font-semibold">Peta Kabupaten Bojonegoro</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.08] text-slate-300 font-mono">EPSG:4326</span>
                  </div>
                </div>

                {/* Top Right Badge: Live Engine */}
                <div className="absolute top-3 right-3 z-10 pointer-events-none">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 text-white backdrop-blur-md border border-white/[0.08] shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-semibold">Carto Dark GIS</span>
                  </div>
                </div>

                {/* Bottom Left Badge: Layer Status */}
                <div className="absolute bottom-3 left-3 z-10 hidden sm:flex pointer-events-none">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 text-white backdrop-blur-md border border-white/[0.08] shadow-lg">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] font-medium text-slate-300">
                      {selectedKecamatanName ? `Fokus: Kec. ${selectedKecamatanName}` : "Batas 28 Kecamatan & Desa"}
                    </span>
                  </div>
                </div>

                {/* Bottom Right CTA */}
                <div className="absolute bottom-3 right-3 z-10">
                  <Button
                    onClick={handleExploreClick}
                    size="sm"
                    className="h-8 px-3 rounded-lg text-xs font-semibold bg-white text-slate-950 hover:bg-slate-200 gap-1.5 shadow-md cursor-pointer transition-all"
                  >
                    Buka Peta Penuh
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
