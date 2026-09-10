import { useState, useEffect, useRef } from "react";
import { Route, Building2, Activity, Layers } from "lucide-react";
import { cn } from "~/lib/utils";
import { rekapService } from "~/services/rekap.service";
import { infrastrukturService } from "~/services/infrastruktur.service";

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  duration?: number;
  suffix?: string;
}

function AnimatedNumber({ value, decimals = 0, duration = 1400, suffix = "" }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const startRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = displayValue;
    startTimeRef.current = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);

      // Smooth cubic ease-out curve
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startRef.current + (value - startRef.current) * easeOut;

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value, duration]);

  return (
    <span>
      {displayValue.toLocaleString("id-ID", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

interface StatItem {
  label: string;
  numericValue: number;
  decimals: number;
  suffix: string;
  note: string;
  icon: typeof Route;
  color: string;
  iconBg: string;
}

export function StatsSection() {
  const [statsData, setStatsData] = useState<StatItem[]>([
    {
      label: "Panjang Infrastruktur",
      numericValue: 1424.77,
      decimals: 2,
      suffix: " KM",
      note: "Jalan Poros & Jaringan Daerah",
      icon: Route,
      color: "text-slate-300",
      iconBg: "bg-slate-800 border-white/[0.08]",
    },
    {
      label: "Desa Terpantau",
      numericValue: 430,
      decimals: 0,
      suffix: " Desa",
      note: "Tersebar di 28 Kecamatan",
      icon: Building2,
      color: "text-emerald-400",
      iconBg: "bg-emerald-950/40 border-emerald-800/40",
    },
    {
      label: "Realisasi Fisik",
      numericValue: 30.99,
      decimals: 2,
      suffix: "%",
      note: "Progress Terverifikasi Lapangan",
      icon: Activity,
      color: "text-amber-400",
      iconBg: "bg-amber-950/40 border-amber-800/40",
    },
    {
      label: "Jenis Infrastruktur",
      numericValue: 5,
      decimals: 0,
      suffix: " Kategori",
      note: "Jalan, Jembatan, Drainase, TPT, Lingkungan",
      icon: Layers,
      color: "text-indigo-300",
      iconBg: "bg-indigo-950/40 border-indigo-800/40",
    },
  ]);

  useEffect(() => {
    async function loadLiveStats() {
      try {
        const [rekapKecamatan, tipeList] = await Promise.allSettled([
          rekapService.getKecamatan(),
          infrastrukturService.getTipeList(),
        ]);

        let totalPanjangMeter = 0;
        let totalDibangunMeter = 0;
        let totalDesaCount = 0;
        let kecamatanCount = 0;

        if (rekapKecamatan.status === "fulfilled" && Array.isArray(rekapKecamatan.value) && rekapKecamatan.value.length > 0) {
          kecamatanCount = rekapKecamatan.value.length;
          rekapKecamatan.value.forEach((item) => {
            totalPanjangMeter += Number(item.total_panjang || 0);
            totalDibangunMeter += Number(item.panjang_dibangun || 0);
            totalDesaCount += Number(item.jumlah_desa || 0);
          });
        }

        const numericPanjang = totalPanjangMeter > 0 ? totalPanjangMeter / 1000 : 1424.77;
        const numericDesa = totalDesaCount > 0 ? totalDesaCount : 430;
        const formattedKecamatanNote = kecamatanCount > 0 ? `Tersebar di ${kecamatanCount} Kecamatan` : "Tersebar di 28 Kecamatan";

        const numericProgress = (totalPanjangMeter > 0 && totalDibangunMeter > 0)
          ? (totalDibangunMeter / totalPanjangMeter) * 100
          : 30.99;

        let numericKategori = 5;
        let formattedKategoriNote = "Jalan, Jembatan, Drainase, TPT, Lingkungan";

        if (tipeList.status === "fulfilled" && Array.isArray(tipeList.value) && tipeList.value.length > 0) {
          numericKategori = tipeList.value.length;
          formattedKategoriNote = tipeList.value.map((t) => t.nama).slice(0, 5).join(", ");
        }

        setStatsData([
          {
            label: "Panjang Infrastruktur",
            numericValue: numericPanjang,
            decimals: 2,
            suffix: " KM",
            note: "Jalan Poros & Jaringan Daerah",
            icon: Route,
            color: "text-slate-300",
            iconBg: "bg-slate-800 border-white/[0.08]",
          },
          {
            label: "Desa Terpantau",
            numericValue: numericDesa,
            decimals: 0,
            suffix: " Desa",
            note: formattedKecamatanNote,
            icon: Building2,
            color: "text-emerald-400",
            iconBg: "bg-emerald-950/40 border-emerald-800/40",
          },
          {
            label: "Realisasi Fisik",
            numericValue: numericProgress,
            decimals: 2,
            suffix: "%",
            note: "Progress Terverifikasi Lapangan",
            icon: Activity,
            color: "text-amber-400",
            iconBg: "bg-amber-950/40 border-amber-800/40",
          },
          {
            label: "Jenis Infrastruktur",
            numericValue: numericKategori,
            decimals: 0,
            suffix: " Kategori",
            note: formattedKategoriNote,
            icon: Layers,
            color: "text-indigo-300",
            iconBg: "bg-indigo-950/40 border-indigo-800/40",
          },
        ]);
      } catch (err) {
        console.error("Failed to load live stats:", err);
      }
    }

    loadLiveStats();
  }, []);

  return (
    <section className="border-y border-white/[0.06] bg-[#0A0E17]/60">
      <div className="container max-w-6xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-white/[0.06]">
          {statsData.map((stat, i) => (
            <div key={i} className="flex items-start gap-4 px-6 py-6 first:pl-0 last:pr-0">
              <div className={cn("flex items-center justify-center w-9 h-9 rounded-xl border shrink-0 mt-0.5", stat.iconBg)}>
                <stat.icon className={cn("w-4 h-4", stat.color)} />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-black text-white tracking-tight leading-none">
                  <AnimatedNumber
                    value={stat.numericValue}
                    decimals={stat.decimals}
                    suffix={stat.suffix}
                  />
                </div>
                <div className="text-xs font-medium text-slate-300 mt-1.5">
                  {stat.label}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  {stat.note}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
