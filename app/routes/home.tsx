import { useState, useEffect } from "react";
import type { MetaFunction } from "react-router";
import { PublicNavbar } from "~/components/public-navbar";
import { PublicFooter } from "~/components/public-footer";
import { type MapLayerConfig } from "~/features/peta/components/OpenLayersMap";
import { batasKecamatanService } from "~/services/batas-kecamatan";
import {
  HeroSection,
  StatsSection,
  ModulesSection,
  CtaBannerSection,
} from "~/features/home/components";

export const meta: MetaFunction = () => {
  return [
    { title: "MELAROSA — Sistem Monitoring Pembangunan Infrastruktur Kabupaten Bojonegoro" },
    { name: "description", content: "Platform monitoring layanan dan realisasi pembangunan infrastruktur berbasis spasial untuk 430 Desa dan 28 Kecamatan di Kabupaten Bojonegoro." },
  ];
};

export default function Home() {
  const [kecamatanGeojson, setKecamatanGeojson] = useState<any>(null);

  useEffect(() => {
    async function loadKecamatanData() {
      try {
        const response = await batasKecamatanService.getBatasKecamatan({ format: 'geojson', limit: 100 });
        if (response && (response.result || response.data)) {
          setKecamatanGeojson(response.result || response.data);
        }
      } catch (err) {
        console.error("Failed to load kecamatan GeoJSON:", err);
      }
    }
    loadKecamatanData();
  }, []);

  const customMapLayers: MapLayerConfig[] = kecamatanGeojson ? [
    {
      id: 'batas_kecamatan_home',
      title: 'Batas Kecamatan Bojonegoro',
      type: 'vector',
      data: kecamatanGeojson,
      visible: true,
      zIndex: 15,
      style: {
        stroke: '#38bdf8',
        width: 1.5,
        fill: 'rgba(56, 189, 248, 0.04)',
        labelField: 'nama_kecamatan'
      }
    }
  ] : [];

  return (
    <div className="min-h-screen bg-[#080B11] text-slate-100 font-sans flex flex-col selection:bg-slate-700 selection:text-white">
      <PublicNavbar />

      <main className="flex-1 flex flex-col">
        {/* ── 1. HERO SECTION ── */}
        <HeroSection customMapLayers={customMapLayers} />

        {/* ── 2. STATS SECTION ── */}
        <StatsSection />

        {/* ── 3. MODULES & INFRASTRUCTURE CATEGORIES ── */}
        <ModulesSection />

        {/* ── 4. CTA BANNER SECTION ── */}
        <CtaBannerSection />
      </main>

      <PublicFooter />
    </div>
  );
}
