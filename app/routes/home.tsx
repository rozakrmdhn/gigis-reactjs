import { Link } from "react-router";
import {
  Map as MapIcon,
  BarChart3,
  Settings2,
  ChevronRight,
  Activity,
  Database,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  LayoutDashboard
} from "lucide-react";
import type { MetaFunction } from "react-router";
import { PublicNavbar } from "~/components/public-navbar";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export const meta: MetaFunction = () => {
  return [
    { title: "GIGIS Monitoring - Infrastruktur Jalan Bojonegoro" },
    { name: "description", content: "Sistem Informasi Geospasial Monitoring Jalan Poros Desa Bojonegoro yang Terpadu dan Akurat." },
  ];
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans selection:bg-blue-100 dark:selection:bg-blue-900/30">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Immersive Background */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/home-hero.png"
            className="w-full h-full object-cover scale-105 animate-pulse-slow"
            style={{ animationDuration: '15s' }}
            alt="Hero Background"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/80 to-slate-900/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl space-y-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-400/20 backdrop-blur-md animate-in fade-in slide-in-from-left-8 duration-700">
              <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-xs font-black text-blue-100 uppercase tracking-[0.2em]">Sistem Monitoring Jalan Poros Desa</span>
            </div>

            {/* Title */}
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
              <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-[0.95]">
                Membangun Desa <br />
                <span className="text-blue-500 italic">Lebih Presisi.</span>
              </h1>
              <p className="max-w-2xl text-xl text-slate-300 font-medium leading-relaxed">
                Platform GIS tercanggih untuk monitoring infrastruktur jalan di Kabupaten Bojonegoro.
                Transparansi data, akurasi pemetaan, dan efisiensi pelaporan dalam satu genggaman.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
              <Link to="/map-view">
                <Button size="lg" className="h-16 px-10 text-sm font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white shadow-2xl shadow-blue-500/30 hover:-translate-y-1 transition-all rounded-2xl group">
                  Eksplorasi Peta
                  <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Floating Stats Bar */}
        <div className="absolute bottom-0 left-0 right-0 z-20 pb-12 hidden lg:block">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-4 gap-px bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-700">
              {[
                { icon: MapIcon, label: "Total Panjang Jalan", value: "1.424,77 KM", color: "text-blue-400" },
                { icon: ShieldCheck, label: "Titik Monitoring", value: "430 Desa", color: "text-emerald-400" },
                { icon: Activity, label: "Progres Pembangunan", value: "30,99%", color: "text-amber-400" },
                { icon: LayoutDashboard, label: "Data Tersinkron", value: "Real-time", color: "text-indigo-400" },
              ].map((stat, i) => (
                <div key={i} className="bg-slate-900/50 p-8 flex items-center gap-6 group hover:bg-slate-900/70 transition-colors">
                  <div className={cn("p-4 rounded-2xl bg-white/5 transition-transform duration-500 group-hover:scale-110", stat.color)}>
                    <stat.icon className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
                    <p className="text-2xl font-black text-white tracking-tight">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 relative overflow-hidden bg-white dark:bg-slate-950">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end gap-12 mb-20">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 text-blue-600 font-black uppercase tracking-[0.3em] text-[10px]">
                <TrendingUp className="w-4 h-4" />
                Solusi Masa Depan
              </div>
              <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight">
                Teknologi yang Memberdayakan <br />
                <span className="text-slate-400">Pembangunan Desa.</span>
              </h2>
            </div>
            <p className="max-w-md text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Kami menggabungkan data geospasial dengan sistem pelaporan terintegrasi untuk memberikan wawasan yang belum pernah ada sebelumnya bagi pengambil kebijakan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Database,
                title: "Integritas Data Spasial",
                desc: "Data geospasial dikelola secara profesional menggunakan standar OGC untuk akurasi posisi yang maksimal.",
                bg: "bg-blue-600",
                light: "bg-blue-50 dark:bg-blue-900/10",
                border: "border-blue-100 dark:border-blue-900/20"
              },
              {
                icon: BarChart3,
                title: "Analitik Mendalam",
                desc: "Visualisasi dashboard yang komprehensif untuk memantau kondisi jalan per desa, per kecamatan, hingga kabupaten.",
                bg: "bg-indigo-600",
                light: "bg-indigo-50 dark:bg-indigo-900/10",
                border: "border-indigo-100 dark:border-indigo-900/20"
              },
              {
                icon: Settings2,
                title: "Katalog Dataset",
                desc: "Akses mudah ke berbagai lapisan data (layers) melalui katalog dataset yang terorganisir dengan fitur refresh dinamis.",
                bg: "bg-amber-600",
                light: "bg-amber-50 dark:bg-amber-900/10",
                border: "border-amber-100 dark:border-amber-900/20"
              }
            ].map((feature, i) => (
              <div key={i} className={cn("group p-10 rounded-[2.5rem] border transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200 dark:hover:shadow-none", feature.light, feature.border)}>
                <div className={cn("inline-flex h-16 w-16 items-center justify-center rounded-2xl mb-8 text-white shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6", feature.bg)}>
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight uppercase">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium mb-8">
                  {feature.desc}
                </p>
                <Link to="/map-view" className="inline-flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest hover:gap-4 transition-all">
                  Lihat Detail <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 pt-24 pb-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 mb-20">
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-blue-500/20">G</div>
                <span className="text-2xl font-black text-white tracking-tighter uppercase">GIGIS Monitoring</span>
              </div>
              <p className="text-slate-400 max-w-sm leading-relaxed font-medium">
                Sistem Informasi Geospasial untuk monitoring pembangunan infrastruktur jalan di Kabupaten Bojonegoro.
                Dikelola oleh BAPPEDA Bojonegoro.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-12 lg:justify-end">
              <div className="space-y-6">
                <h4 className="text-sm font-black text-white uppercase tracking-widest">Platform</h4>
                <nav className="flex flex-col gap-4">
                  <Link to="/map-view" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Eksplorasi Peta</Link>
                  <Link to="/katalog-dataset" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Katalog Dataset</Link>
                  <Link to="/statistik" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Statistik</Link>
                </nav>
              </div>
              <div className="space-y-6">
                <h4 className="text-sm font-black text-white uppercase tracking-widest">Instansi</h4>
                <div className="space-y-2">
                  <p className="text-sm text-white font-bold">BAPPEDA Bojonegoro</p>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">
                    Jl. P. Mas Tumapel No. 1, <br />
                    Kec. Bojonegoro, Kab. Bojonegoro, <br />
                    Jawa Timur 62111
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
              © 2026 GIGIS MONITORING SYSTEM • ALL RIGHTS RESERVED
            </p>
            <div className="flex gap-8">
              <a href="#" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] hover:text-white transition-colors">Kebijakan Privasi</a>
              <a href="#" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] hover:text-white transition-colors">Syarat & Ketentuan</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

