import { Link } from "react-router";
import { Map as MapIcon, BarChart3, Database, ArrowRight, MapPin } from "lucide-react";
import {
  IconTopologyComplex,
  IconRoute,
  IconBuildingBridge,
  IconDroplet,
  IconWall,
  IconRoad,
} from "@tabler/icons-react";
import { Separator } from "~/components/ui/separator";

// Reason: 3 modul utama sistem — tiap link mengarah ke destination yang benar
const modules = [
  {
    icon: MapIcon,
    title: "Peta Interaktif Geospasial",
    description:
      "Visualisasi spasial jaringan infrastruktur, batas wilayah administrasi kecamatan dan desa, serta layer tematik berbasis OpenLayers. Tersedia filter per kecamatan dan popup atribut jalan.",
    link: "/map-view",
    linkLabel: "Buka Peta Interaktif",
  },
  {
    icon: BarChart3,
    title: "Monitoring Realisasi Pembangunan",
    description:
      "Pantau capaian fisik pembangunan infrastruktur per desa dan kecamatan. Verifikasi berjenjang dari Operator Desa ke Bappeda hingga OPD terkait, lengkap dengan dokumentasi GPS lapangan.",
    link: "/login",
    linkLabel: "Masuk Portal Operator",
  },
  {
    icon: Database,
    title: "Katalog Dataset Spasial",
    description:
      "Koleksi dataset geospasial OGC (WMS/WFS) terhubung dengan server GeoNode Bappeda. Akses, preview, dan unduh data spasial wilayah Kabupaten Bojonegoro.",
    link: "/katalog-dataset",
    linkLabel: "Jelajahi Katalog Data",
  },
];

// Reason: 5 jenis infrastruktur yang dimonitor dalam sistem
const infraTypes = [
  { icon: IconRoute, label: "Jalan Poros Desa", desc: "Pengerasan beton & pengaspalan" },
  { icon: IconBuildingBridge, label: "Jembatan", desc: "Konstruksi antar desa/dusun" },
  { icon: IconDroplet, label: "Drainase", desc: "Saluran air & gorong-gorong" },
  { icon: IconWall, label: "TPT", desc: "Tembok Penahan Tanah" },
  { icon: IconRoad, label: "Jalan Lingkungan", desc: "Paving/cor antar RT/RW" },
];

export function ModulesSection() {
  return (
    <section className="py-20 md:py-28 bg-[#080B11]">
      <div className="container max-w-6xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-start">

          {/* Kolom kiri (3/5): 3 modul utama */}
          <div className="lg:col-span-3 space-y-2">
            <p className="text-xs font-semibold text-slate-400 tracking-[0.15em] uppercase mb-4">
              Modul Sistem
            </p>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-10">
              Tiga Pilar Monitoring<br />
              Infrastruktur Daerah
            </h2>

            <div className="space-y-0 divide-y divide-white/[0.06]">
              {modules.map((mod, i) => (
                <div
                  key={i}
                  className="flex items-start gap-5 py-7 group"
                >
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-slate-900/90 border border-white/[0.08] shrink-0 text-slate-300 group-hover:border-white/[0.2] group-hover:text-white transition-all">
                    <mod.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <h3 className="text-base font-bold text-white tracking-tight group-hover:text-slate-200 transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed font-normal">
                      {mod.description}
                    </p>
                    <Link
                      to={mod.link}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-all group-hover:gap-2.5"
                    >
                      {mod.linkLabel}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Kolom kanan (2/5): 5 jenis infrastruktur */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0E131F]/80 p-6 space-y-5 sticky top-24 backdrop-blur-md">
              <div className="flex items-center gap-3 mb-1">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 border border-white/[0.1] text-white shadow-sm">
                  <IconTopologyComplex className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white tracking-tight">
                    Kategori Infrastruktur Daerah
                  </p>
                  <p className="text-[11px] text-slate-400">
                    5 jenis yang dimonitor dalam sistem
                  </p>
                </div>
              </div>

              <Separator className="bg-white/[0.06]" />

              <div className="space-y-3">
                {infraTypes.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 border border-white/[0.06] shrink-0 text-slate-400">
                      <item.icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200">
                        {item.label}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="bg-white/[0.06]" />

              <div className="flex items-center gap-2.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <p className="text-[11px] text-slate-400 leading-snug">
                  Setiap titik infrastruktur tercatat koordinat GPS dan terverifikasi lapangan oleh operator kecamatan.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
