import { Link } from "react-router";
import { IconMap2 } from "@tabler/icons-react";
import { Database } from "lucide-react";
import { Button } from "~/components/ui/button";

export function CtaBannerSection() {
  return (
    <section className="py-16 md:py-20 bg-[#06080D]">
      <div className="container max-w-6xl mx-auto px-4 md:px-6">
        <div className="relative rounded-2xl bg-[#0C101A] border border-white/[0.08] p-8 md:p-12 overflow-hidden shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 text-center md:text-left max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900 border border-white/[0.08] text-xs font-semibold text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                Peta tersedia tanpa login
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                Mulai Jelajahi Peta<br className="hidden md:inline" /> Infrastruktur Bojonegoro
              </h2>
              <p className="text-slate-400 text-sm font-normal leading-relaxed">
                Akses visualisasi peta jalan poros desa, layer batas wilayah kecamatan, dan informasi atribut pembangunan infrastruktur — tersedia untuk publik tanpa perlu akun.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link to="/map-view">
                <Button
                  size="lg"
                  className="h-12 px-6 rounded-xl font-semibold text-sm bg-white text-slate-950 hover:bg-slate-200 gap-2 cursor-pointer transition-colors shadow-lg shadow-white/5 w-full sm:w-auto"
                >
                  <IconMap2 size={16} />
                  Buka Peta Infrastruktur
                </Button>
              </Link>
              <Link to="/katalog-dataset">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-6 rounded-xl font-semibold text-sm border-white/[0.1] bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:text-white gap-2 cursor-pointer transition-colors w-full sm:w-auto"
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
  );
}
