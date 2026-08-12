import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Map as MapIcon,
  BarChart3,
  Database,
  ArrowRight,
  Layers,
  Globe,
  Activity,
  MapPin,
  Building2,
  Users,
  Route,
} from "lucide-react";
import type { MetaFunction } from "react-router";
import {
  IconMap2,
  IconLogin,
  IconTopologyComplex,
  IconRoute,
  IconBuildingBridge,
  IconDroplet,
  IconWall,
  IconRoad,
} from "@tabler/icons-react";
import { PublicNavbar } from "~/components/public-navbar";
import { PublicFooter } from "~/components/public-footer";
import { OpenLayersMap, type MapLayerConfig } from "~/features/peta/components/OpenLayersMap";
import { batasKecamatanService } from "~/services/batas-kecamatan";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";

export const meta: MetaFunction = () => {
  return [
    { title: "MELAROSA — Monitoring Infrastruktur BKK Kabupaten Bojonegoro" },
    { name: "description", content: "Platform monitoring layanan dan realisasi infrastruktur berbasis spasial untuk 430 Desa dan 28 Kecamatan di Kabupaten Bojonegoro melalui mekanisme BKK." },
  ];
};

// Reasons (ANTISLOP R-31):
// Stats: 4 metric terukur dari data nyata sistem (km jalan, desa, progress, kategori)
// Features: 3 modul utama dengan link ke destination yang benar
// Infrastruktur types: 5 kategori BKK yang memang ada di sistem

const stats = [
  {
    label: "Panjang Infrastruktur",
    value: "1.424,77 KM",
    note: "Jalan Poros & Jaringan Daerah",
    icon: Route,
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    label: "Desa Terpantau",
    value: "430 Desa",
    note: "Tersebar di 28 Kecamatan",
    icon: Building2,
    color: "text-emerald-600 dark:text-emerald-400",
  },
  {
    label: "Realisasi Fisik",
    value: "30,99%",
    note: "Progress Terverifikasi Lapangan",
    icon: Activity,
    color: "text-amber-600 dark:text-amber-400",
  },
  {
    label: "Jenis Infrastruktur",
    value: "5 Kategori",
    note: "Jalan, Jembatan, Drainase, TPT, Lingkungan",
    icon: Layers,
    color: "text-indigo-600 dark:text-indigo-400",
  },
];

// Reason: 5 jenis infrastruktur BKK yang secara resmi ada dalam sistem
const infraTypes = [
  { icon: IconRoute, label: "Jalan Poros Desa", desc: "Pengerasan beton & pengaspalan" },
  { icon: IconBuildingBridge, label: "Jembatan", desc: "Konstruksi antar desa/dusun" },
  { icon: IconDroplet, label: "Drainase", desc: "Saluran air & gorong-gorong" },
  { icon: IconWall, label: "TPT", desc: "Tembok Penahan Tanah" },
  { icon: IconRoad, label: "Jalan Lingkungan", desc: "Paving/cor antar RT/RW" },
];

// Reason: 3 modul utama sistem — tiap link mengarah ke halaman yang memang ada
const modules = [
  {
    icon: MapIcon,
    iconColor: "text-blue-600 dark:text-blue-400",
    title: "Peta Interaktif Geospasial",
    description:
      "Visualisasi spasial jaringan infrastruktur, batas wilayah administrasi kecamatan dan desa, serta layer tematik berbasis OpenLayers. Tersedia filter per kecamatan dan popup atribut jalan.",
    link: "/map-view",
    linkLabel: "Buka Peta Interaktif",
  },
  {
    icon: BarChart3,
    iconColor: "text-amber-600 dark:text-amber-400",
    title: "Monitoring Realisasi BKK",
    description:
      "Pantau capaian fisik pembangunan infrastruktur BKK per desa dan kecamatan. Verifikasi berjenjang dari Operator Desa ke Bappeda hingga OPD terkait, lengkap dengan dokumentasi GPS lapangan.",
    link: "/login",
    linkLabel: "Masuk Portal Operator",
  },
  {
    icon: Database,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    title: "Katalog Dataset Spasial",
    description:
      "Koleksi dataset geospasial OGC (WMS/WFS) terhubung dengan server GeoNode Bappeda. Akses, preview, dan unduh data spasial wilayah Kabupaten Bojonegoro.",
    link: "/katalog-dataset",
    linkLabel: "Jelajahi Katalog Data",
  },
];

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
        stroke: '#2563eb',
        width: 2,
        fill: 'rgba(37, 99, 235, 0.08)',
        labelField: 'nama_kecamatan'
      }
    }
  ] : [];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans flex flex-col">
      <PublicNavbar />

      {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
      {/* Reason: full-width hero dengan peta nyata sebagai product shot utama,
          menggantikan screenshot/placeholder. Dot grid ultra-tipis = motif identitas kartografi. */}
      <section className="relative pt-20 pb-0 overflow-hidden">
        {/* Dot grid — motif identitas kartografi MELAROSA, bukan dekorasi generic */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(59, 130, 246, 0.18) 1px, transparent 0)`,
            backgroundSize: '28px 28px',
          }}
        />
        {/* Gradient fade ke bawah agar konten teks terbaca di atas peta */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-white dark:from-slate-950 to-transparent z-10 pointer-events-none" />

        <div className="container max-w-6xl mx-auto px-4 md:px-6 relative z-10">
          {/* Header badge — IconMap2 relevan: ini halaman WebGIS */}
          <div className="flex justify-center mb-6 pt-8">
            <Badge
              variant="outline"
              className="px-3.5 py-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-400 text-xs font-semibold gap-2 shadow-sm"
            >
              <IconMap2 size={13} />
              Sistem Monitoring Infrastruktur Kabupaten Bojonegoro
            </Badge>
          </div>

          {/* Headline — aksen biru saja, bukan B-I-P gradient */}
          <div className="text-center space-y-5 max-w-3xl mx-auto mb-10">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
              Pantau Realisasi{" "}
              <span className="text-blue-600 dark:text-blue-400">
                Infrastruktur Desa
              </span>
              <br className="hidden sm:inline" />
              Secara Spasial
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
              Platform terpadu monitoring pembangunan infrastruktur untuk 430 desa di 28 kecamatan Kabupaten Bojonegoro — dari usulan, verifikasi lapangan, hingga pelaporan realisasi fisik berbasis koordinat GPS.
            </p>

            {/* CTA — label spesifik, bukan "Get Started" atau "Explore" */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link to="/map-view">
                <Button
                  size="lg"
                  className="h-12 px-6 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 gap-2 cursor-pointer transition-colors"
                >
                  <IconMap2 size={16} />
                  Lihat Peta Infrastruktur
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-6 rounded-xl font-semibold text-sm border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <IconLogin size={16} />
                  Masuk Portal Operator
                </Button>
              </Link>
            </div>
          </div>

          {/* Peta preview — product shot nyata, bukan screenshot */}
          <div className="relative max-w-5xl mx-auto rounded-t-2xl md:rounded-t-3xl border border-b-0 border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-2 md:p-3 shadow-xl overflow-hidden">
            <div className="relative rounded-t-xl md:rounded-t-2xl overflow-hidden aspect-[16/9] md:aspect-[21/9] bg-slate-950">
              <OpenLayersMap
                className="w-full h-full"
                center={[111.83, -7.15]}
                zoom={10}
                layers={customMapLayers}
                showBatasDesa={true}
                showJalanUtama={true}
                showJalanKabupaten={true}
                disablePopup={true}
              />
              {/* Gradient overlay bawah agar badge terbaca */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-slate-950/20 pointer-events-none" />

              {/* Badge kiri atas: identitas peta */}
              <div className="absolute top-3 left-3 md:top-4 md:left-4 z-10 pointer-events-none">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 text-white backdrop-blur-md border border-slate-700/60 shadow-lg">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[11px] font-semibold">Peta Kabupaten Bojonegoro</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">EPSG:4326</span>
                </div>
              </div>

              {/* Badge kanan atas: status live */}
              <div className="absolute top-3 right-3 md:top-4 md:right-4 z-10 pointer-events-none">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 text-white backdrop-blur-md border border-slate-700/60 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-semibold">OpenLayers Engine</span>
                </div>
              </div>

              {/* Badge kiri bawah: layer aktif */}
              <div className="absolute bottom-3 left-3 md:bottom-4 md:left-4 z-10 hidden sm:flex pointer-events-none">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 text-white backdrop-blur-md border border-slate-700/60 shadow-lg">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[11px] font-medium text-slate-200">Batas Kecamatan & Desa</span>
                </div>
              </div>

              {/* Tombol buka peta penuh — link ke destination yang nyata */}
              <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 z-10">
                <Link to="/map-view">
                  <Button
                    size="sm"
                    className="h-8 px-3 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-md cursor-pointer transition-colors"
                  >
                    Buka Peta Penuh
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. STATS STRIP ──────────────────────────────────────────────── */}
      {/* Reason: strip horizontal menggantikan card grid — rhythm break dari hero & features.
          Tidak ada shadow/backdrop karena section ini adalah "ground", bukan floating element. */}
      <section className="border-y border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-900/40">
        <div className="container max-w-6xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-100 dark:divide-slate-800/60">
            {stats.map((stat, i) => (
              <div key={i} className="flex items-start gap-4 px-6 py-6 first:pl-0 last:pr-0">
                <stat.icon className={cn("w-5 h-5 mt-0.5 shrink-0", stat.color)} />
                <div className="min-w-0">
                  <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                    {stat.value}
                  </div>
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1">
                    {stat.label}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">
                    {stat.note}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. FITUR / MODUL UTAMA ──────────────────────────────────────── */}
      {/* Reason: layout 2-kolom asimetris (60/40) menggantikan 3-card seragam.
          Kiri: daftar modul dengan link yang benar per modul.
          Kanan: 5 jenis infrastruktur BKK sebagai konteks domain.
          Rhythm berbeda dari hero (centered) dan stats (strip) — sesuai RHYTHM 2. */}
      <section className="py-20 md:py-28 bg-white dark:bg-slate-950">
        <div className="container max-w-6xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-start">

            {/* Kolom kiri (3/5): 3 modul utama */}
            <div className="lg:col-span-3 space-y-2">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-[0.15em] uppercase mb-4">
                Modul Sistem
              </p>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-10">
                Tiga Pilar Monitoring<br />
                Infrastruktur Daerah
              </h2>

              <div className="space-y-0 divide-y divide-slate-100 dark:divide-slate-800/60">
                {modules.map((mod, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-5 py-7 group"
                  >
                    {/* Icon — plain color, ukuran purposeful: focal point per modul */}
                    <div className="shrink-0 mt-0.5">
                      <mod.icon className={cn("w-6 h-6 transition-colors", mod.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {mod.title}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                        {mod.description}
                      </p>
                      {/* Link spesifik per modul — bukan semua ke /map-view */}
                      <Link
                        to={mod.link}
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-semibold transition-all group-hover:gap-2.5",
                          mod.iconColor
                        )}
                      >
                        {mod.linkLabel}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Kolom kanan (2/5): 5 jenis infrastruktur BKK */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-900/40 p-6 space-y-5 sticky top-24">
                {/* Identitas topologi — logo mark MELAROSA sebagai focal point */}
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-emerald-500 text-white shadow-md shadow-blue-500/20">
                    <IconTopologyComplex className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                      Kategori Infrastruktur BKK
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      5 jenis yang dimonitor dalam sistem
                    </p>
                  </div>
                </div>

                <Separator className="bg-slate-100 dark:bg-slate-800/60" />

                <div className="space-y-3">
                  {infraTypes.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 py-1">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shrink-0">
                        <item.icon size={16} className="text-slate-500 dark:text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {item.label}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="bg-slate-100 dark:bg-slate-800/60" />

                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Setiap titik infrastruktur tercatat koordinat GPS dan terverifikasi lapangan oleh operator kecamatan.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 4. CTA BANNER ───────────────────────────────────────────────── */}
      {/* Reason: bg-slate-900 solid menggantikan gradien B-I-P — karakter pemerintahan
          yang terpercaya lebih cocok dengan dark solid daripada gradien consumer-startup.
          Satu aksen biru pada tombol sebagai focal point tunggal. */}
      <section className="py-16 md:py-20 bg-slate-50/60 dark:bg-slate-900/40">
        <div className="container max-w-6xl mx-auto px-4 md:px-6">
          <div className="relative rounded-2xl bg-slate-900 dark:bg-slate-950 border border-slate-800 p-8 md:p-12 overflow-hidden">
            {/* Dot pattern tipis — motif identitas kartografi, bukan dekorasi generic */}
            <div
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, #3b82f6 1px, transparent 0)`,
                backgroundSize: '24px 24px',
              }}
            />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-3 text-center md:text-left max-w-xl">
                {/* Satu aksen hijau — status "siap akses", bukan dekoratif */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  Peta tersedia tanpa login
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  Mulai Jelajahi Peta<br className="hidden md:inline" /> Infrastruktur Bojonegoro
                </h2>
                <p className="text-slate-400 text-sm font-normal leading-relaxed">
                  Akses visualisasi peta jalan poros desa, layer batas wilayah kecamatan, dan informasi atribut infrastruktur BKK — tersedia untuk publik tanpa perlu akun.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <Link to="/map-view">
                  <Button
                    size="lg"
                    className="h-12 px-6 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white gap-2 cursor-pointer transition-colors shadow-lg shadow-blue-600/20 w-full sm:w-auto"
                  >
                    <IconMap2 size={16} />
                    Buka Peta Infrastruktur
                  </Button>
                </Link>
                <Link to="/katalog-dataset">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 px-6 rounded-xl font-semibold text-sm border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-800 hover:text-white gap-2 cursor-pointer transition-colors w-full sm:w-auto"
                  >
                    <Database className="w-4 h-4" />
                    Unduh Dataset Spasial
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <PublicFooter />
    </div>
  );
}
