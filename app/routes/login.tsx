import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '../contexts/auth-context';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../components/ui/form';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Activity,
  Shield,
  ArrowRight,
  ArrowLeft,
  Layers,
  BarChart3,
  CheckCircle2,
  Building2,
  Users,
} from 'lucide-react';
import { IconTopologyComplex, IconMap2, IconShield, IconRoute } from '@tabler/icons-react';
import { authService } from '../services/auth.service';
import type { MetaFunction } from 'react-router';
import { cn } from '~/lib/utils';

export const meta: MetaFunction = () => {
  return [
    { title: 'Masuk ke Sistem — MELAROSA' },
    { name: 'description', content: 'Masuk ke sistem MELAROSA - Monitoring Layanan dan Realisasi Infrastruktur Berbasis Spasial Kabupaten Bojonegoro' },
  ];
};

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password harus diisi'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const features = [
  {
    icon: IconMap2,
    label: 'Pemetaan Spasial',
    desc: 'Pemetaan presisi 430 desa di 28 kecamatan Bojonegoro',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    icon: Activity,
    label: 'Verifikasi Berjenjang',
    desc: 'Alur dari Operator Desa, Kecamatan, Bappeda hingga OPD',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: BarChart3,
    label: 'Rekap Realisasi Fisik',
    desc: 'Monitoring capaian pembangunan infrastruktur real-time',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
  {
    icon: Layers,
    label: 'Integration GeoNode OGC',
    desc: 'Sinkronisasi layer spasial WMS/WFS Bappeda Bojonegoro',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/20',
  },
];

export default function Login() {
  const navigate = useNavigate();
  const { signin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (authService.isAuthenticated()) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await signin(data.email, data.password);
      toast.success('Login berhasil! Mengalihkan ke dashboard...');
      setTimeout(() => {
        navigate('/admin/dashboard', { replace: true });
      }, 400);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login gagal. Silakan coba lagi.';
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex font-sans bg-white dark:bg-slate-950">
      {/* ── Left Hero Panel ──────────────────────────────────────────── */}
      {/* Reason: DESIGN.md section 1 & 5:
          Panel hero menggunakan identitas resmi MELAROSA (IconTopologyComplex + gradien Blue-to-Emerald)
          Dot grid tipis sebagai motif kartografi GIS. */}
      <div className="hidden lg:flex w-[55%] relative overflow-hidden bg-slate-950">
        {/* Dot grid — motif identitas GIS MELAROSA */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #3b82f6 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Ambient Glow Blobs — depth visual pada splash screen */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/2 w-72 h-72 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Content Container */}
        <div className="relative z-10 w-full flex flex-col p-14 justify-between">
          {/* Back to home link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 group w-fit"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/5 border border-white/10 group-hover:bg-white/10 group-hover:border-white/20 transition-all">
              <ArrowLeft className="w-4 h-4 text-slate-300 group-hover:text-white transition-colors" />
            </div>
            <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
              Kembali ke Beranda
            </span>
          </Link>

          {/* Hero Content */}
          <div className="space-y-10">
            <div className="space-y-6">
              {/* Official Brand Logo Mark */}
              <div className="flex items-center gap-3.5">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-emerald-500 text-white shadow-xl shadow-blue-500/25">
                  <IconTopologyComplex className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-blue-400 tracking-[0.2em] uppercase">Bappeda Bojonegoro</p>
                  <p className="text-xl font-black text-white tracking-tight leading-none mt-0.5">MELAROSA</p>
                </div>
              </div>

              <div className="space-y-3">
                <Badge
                  variant="outline"
                  className="border-blue-500/30 bg-blue-500/10 text-blue-300 text-[10px] font-bold tracking-[0.15em] uppercase px-3 py-1"
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-2" />
                  Sistem Informasi Geospasial Terpadu
                </Badge>

                {/* Headline: single accent color (blue), no multi-color gradient per DESIGN.md */}
                <h1 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] tracking-tight">
                  Monitoring Realisasi{" "}
                  <span className="text-blue-400">
                    Infrastruktur Desa
                  </span>
                  <br />
                  Kabupaten Bojonegoro
                </h1>

                <p className="text-slate-400 text-base font-normal leading-relaxed max-w-md">
                  Platform terpadu untuk pemetaan spasial, pengawasan pembangunan, dan verifikasi realisasi fisik jalan poros desa, jembatan, drainase, TPT, dan jalan lingkungan.
                </p>
              </div>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-3">
              {features.map((f, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xs',
                    f.bg
                  )}
                >
                  <div className={cn('mt-0.5 shrink-0', f.color)}>
                    <f.icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white leading-snug">{f.label}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Copyright */}
          <div className="flex items-center gap-3">
            <Separator className="flex-1 bg-white/10" />
            <p className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase whitespace-nowrap">
              © 2026 MELAROSA · Bappeda Bojonegoro
            </p>
            <Separator className="flex-1 bg-white/10" />
          </div>
        </div>
      </div>

      {/* ── Right Form Panel ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
        {/* Radial dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #3b82f6 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative w-full max-w-sm">
          {/* Mobile Logo Mark */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-emerald-500 text-white shadow-md">
              <IconTopologyComplex className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-widest uppercase">Bappeda Bojonegoro</p>
              <p className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">MELAROSA</p>
            </div>
          </div>

          {/* Login Card */}
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
            <CardHeader className="pb-2 space-y-3 text-center">
              {/* Header Icon */}
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 mx-auto">
                <IconShield className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Masuk ke MELAROSA
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400 text-xs">
                  Gunakan akun resmi Bappeda Kabupaten Bojonegoro
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Email Field */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Alamat Email
                        </FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none" />
                            <Input
                              type="email"
                              placeholder="admin@bojonegoro.go.id"
                              className="h-11 pl-10 rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 text-sm font-medium transition-all"
                              disabled={isLoading}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs font-medium text-rose-500" />
                      </FormItem>
                    )}
                  />

                  {/* Password Field */}
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Password
                          </FormLabel>
                          <button
                            type="button"
                            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Lupa password?
                          </button>
                        </div>
                        <FormControl>
                          <div className="relative group">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none" />
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="••••••••••"
                              className="h-11 pl-10 pr-11 rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 text-sm font-medium transition-all"
                              disabled={isLoading}
                              {...field}
                            />
                            <button
                              type="button"
                              tabIndex={-1}
                              onClick={() => setShowPassword(p => !p)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                              {showPassword
                                ? <EyeOff className="w-4 h-4" />
                                : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs font-medium text-rose-500" />
                      </FormItem>
                    )}
                  />

                  {/* Submit Button per DESIGN.md: "Masuk ke MELAROSA" */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 cursor-pointer transition-colors"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Memverifikasi Sesi...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          Masuk ke MELAROSA
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>

              {/* Register Link */}
              <div className="mt-4 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Operator Desa belum memiliki akun?{' '}
                  <Link to="/register" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold transition-colors">
                    Daftar Akun
                  </Link>
                </p>
              </div>

              {/* Roles Note */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                  Pintu masuk resmi untuk <span className="font-semibold text-slate-600 dark:text-slate-300">Operator Desa</span>, <span className="font-semibold text-slate-600 dark:text-slate-300">Operator Kecamatan</span>, & <span className="font-semibold text-slate-600 dark:text-slate-300">Bappeda</span>.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Mobile copyright */}
          <p className="lg:hidden text-center text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-8">
            © 2026 MELAROSA · Bappeda Bojonegoro
          </p>
        </div>
      </div>
    </div>
  );
}
