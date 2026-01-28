import { Link, useNavigate } from "react-router";
import { useAuth } from "~/contexts/auth-context";
import { Button } from "~/components/ui/button";
import {
  IconMap2,
  IconChartBar,
  IconDeviceDesktopAnalytics,
  IconArrowRight,
  IconLogin,
  IconActivity
} from "@tabler/icons-react";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
              <IconActivity size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">GIGI'S</span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Button onClick={() => navigate("/dashboard")} className="gap-2">
                Dashboard <IconArrowRight size={18} />
              </Button>
            ) : (
              <Link to="/login">
                <Button variant="ghost" className="gap-2">
                  Masuk <IconLogin size={18} />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 lg:pt-32 lg:pb-40">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600 shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              Sistem Monitoring Jalan Poros Desa
            </div>
            <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight text-slate-900 lg:text-7xl">
              Pantau Kondisi Infrasruktur <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Lebih Akurat</span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg text-slate-600">
              GIGI'S (Geographic Information & Infrastructure System) memberikan visualisasi real-time
              kondisi jalan poros desa untuk pengambilan keputusan yang lebih tepat.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link to={isAuthenticated ? "/dashboard" : "/login"}>
                <Button size="lg" className="h-14 px-8 text-base font-bold shadow-xl shadow-blue-200">Mulai Sekarang</Button>
              </Link>
              <Button variant="outline" size="lg" className="h-14 px-8 text-base font-bold bg-white">Pelajari Fitur</Button>
            </div>
          </div>
        </div>

        {/* Background Decor */}
        <div className="absolute -top-24 -left-24 -z-10 h-96 w-96 rounded-full bg-blue-100/50 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 -z-10 h-96 w-96 rounded-full bg-indigo-100/50 blur-3xl" />
      </section>

      {/* Features Section */}
      <section className="bg-white py-24">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="group relative p-8 rounded-3xl border border-slate-100 bg-slate-50 transition-all hover:bg-white hover:shadow-2xl hover:shadow-blue-100">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                <IconMap2 size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 font-inter mb-4">Visualisasi Peta</h3>
              <p className="text-slate-600">
                Lihat kondisi jalan se-kabupaten dengan sistem pewarnaan yang intuitif berdasarkan tingkat kerusakan.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative p-8 rounded-3xl border border-slate-100 bg-slate-50 transition-all hover:bg-white hover:shadow-2xl hover:shadow-blue-100">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                <IconChartBar size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 font-inter mb-4">Analisis Data</h3>
              <p className="text-slate-600">
                Dapatkan statistik lengkap mengenai total panjang jalan, kondisi baik, sedang, hingga rusak berat.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative p-8 rounded-3xl border border-slate-100 bg-slate-50 transition-all hover:bg-white hover:shadow-2xl hover:shadow-blue-100">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <IconDeviceDesktopAnalytics size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 font-inter mb-4">Monitoring Real-time</h3>
              <p className="text-slate-600">
                Pembaruan data dari lapangan yang langsung tersinkronisasi ke pusat untuk pelaporan yang lebih cepat.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-slate-50 py-12">
        <div className="container mx-auto px-4 text-center text-slate-500">
          <p>© 2026 GIGI'S Monitoring Jalan Poros. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
} 
