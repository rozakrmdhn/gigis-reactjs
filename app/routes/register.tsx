import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import {
  Eye,
  EyeOff,
  UserPlus,
  Mail,
  MapPin,
  ArrowLeft,
  CheckCircle2,
  User,
  Lock,
  Layers,
  Activity,
  ArrowRight,
  Clock,
  Shield,
} from 'lucide-react';
import { IconTopologyComplex, IconMap2, IconUserPlus, IconShieldCheck } from '@tabler/icons-react';
import { authService } from '../services/auth.service';
import { kecamatanService, type Kecamatan } from '../services/kecamatan';
import { Combobox } from '../components/ui/combobox';
import { desaService, type Desa } from '../services/desa';
import type { MetaFunction } from 'react-router';
import { cn } from '~/lib/utils';

export const meta: MetaFunction = () => {
  return [
    { title: 'Registrasi Operator — MELAROSA' },
    { name: 'description', content: 'Daftarkan akun operator desa atau kecamatan untuk sistem monitoring infrastruktur berbasis spasial Kabupaten Bojonegoro' },
  ];
};

const registerSchema = z.object({
  nama: z.string().min(3, 'Nama minimal 3 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: z.enum(['operator_desa', 'operator_kecamatan']),
  id_kecamatan: z.string().min(1, 'Kecamatan wajib dipilih'),
  id_desa: z.string().optional(),
}).refine((data) => {
  if (data.role === 'operator_desa' && (!data.id_desa || data.id_desa.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: 'Desa wajib dipilih untuk Operator Desa',
  path: ['id_desa'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

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
    label: 'Input Data Mandiri',
    desc: 'Input titik koordinat dan foto realisasi fisik secara berkala',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: Layers,
    label: 'Verifikasi Berjenjang',
    desc: 'Persetujuan data dari Operator Kecamatan hingga Bappeda',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
];

const successFeatures = [
  {
    icon: IconShieldCheck,
    label: 'Verifikasi Penugasan Wilayah',
    desc: 'Bappeda Bojonegoro akan meninjau dan mengesahkan wilayah tugas Anda',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: Activity,
    label: 'Aktivasi Hak Akses',
    desc: 'Setelah disetujui, akun langsung dapat digunakan untuk masuk ke portal',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    icon: Layers,
    label: 'Modul Pelaporan Spasial',
    desc: 'Akses penuh ke editor WebGIS, plotting anggaran, & realisasi fisik',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
];

export default function Register() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [submittedSummary, setSubmittedSummary] = useState<{
    nama: string;
    email: string;
    role: string;
    nama_kecamatan: string;
    nama_desa?: string;
    timestamp: string;
  } | null>(null);

  // Dropdown lists
  const [kecamatanList, setKecamatanList] = useState<Kecamatan[]>([]);
  const [desaList, setDesaList] = useState<Desa[]>([]);
  const [desaLoading, setDesaLoading] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { nama: '', email: '', password: '', role: 'operator_desa', id_kecamatan: '', id_desa: '' },
  });

  const selectedRole = form.watch('role');
  const selectedKecamatan = form.watch('id_kecamatan');

  const kecamatanOptions = kecamatanList.map((kec) => ({
    value: kec.id.toString(),
    label: kec.nama_kecamatan,
  }));

  const desaOptions = desaList.map((d) => ({
    value: d.id.toString(),
    label: d.nama_desa,
  }));

  // Fetch Kecamatan List once
  useEffect(() => {
    const fetchKecamatan = async () => {
      try {
        const list = await kecamatanService.getKecamatan();
        setKecamatanList(list);
      } catch (err) {
        console.error("Failed to load kecamatan list:", err);
        toast.error("Gagal memuat daftar kecamatan");
      }
    };
    fetchKecamatan();
  }, []);

  // Fetch Desa List when selected Kecamatan changes
  useEffect(() => {
    const fetchDesa = async () => {
      if (!selectedKecamatan || selectedRole !== 'operator_desa') {
        setDesaList([]);
        return;
      }
      setDesaLoading(true);
      try {
        const list = await desaService.getDesa(selectedKecamatan);
        setDesaList(list);
      } catch (err) {
        console.error("Failed to load desa list:", err);
        toast.error("Gagal memuat daftar desa");
      } finally {
        setDesaLoading(false);
      }
    };
    fetchDesa();
    form.setValue('id_desa', '');
  }, [selectedKecamatan, selectedRole, form]);

  // Redirect if already authenticated
  useEffect(() => {
    if (authService.isAuthenticated()) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const payload: any = {
        nama: data.nama,
        email: data.email,
        password: data.password,
        role: data.role,
        id_kecamatan: parseInt(data.id_kecamatan, 10),
      };
      if (data.role === 'operator_desa' && data.id_desa) {
        payload.id_desa = parseInt(data.id_desa, 10);
      }

      await authService.register(payload);

      const kecObj = kecamatanList.find(k => k.id.toString() === data.id_kecamatan);
      const desaObj = desaList.find(d => d.id.toString() === data.id_desa);

      setSubmittedSummary({
        nama: data.nama,
        email: data.email,
        role: data.role === 'operator_desa' ? 'Operator Desa' : 'Operator Kecamatan',
        nama_kecamatan: kecObj?.nama_kecamatan || '',
        nama_desa: desaObj?.nama_desa || '',
        timestamp: new Date().toLocaleString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) + ' WIB',
      });

      toast.success('Registrasi berhasil! Menunggu persetujuan admin.');
      setIsRegistered(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registrasi gagal. Silakan coba lagi.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex font-sans bg-white dark:bg-slate-950">
      {/* ── Left Hero Panel ──────────────────────────────────────────── */}
      <div className="hidden lg:flex w-[55%] relative overflow-hidden bg-slate-950">
        {/* Dot grid motif kartografi MELAROSA */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #3b82f6 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Ambient Glow */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/2 w-72 h-72 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 w-full flex flex-col p-14 justify-between">
          {/* Back to home */}
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

          {/* Hero text */}
          <div className="space-y-10">
            <div className="space-y-6">
              {/* Logo mark */}
              <div className="flex items-center gap-3.5">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-emerald-500 text-white shadow-xl shadow-blue-500/25">
                  <IconTopologyComplex className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-blue-400 tracking-[0.2em] uppercase">Bappeda Bojonegoro</p>
                  <p className="text-xl font-black text-white tracking-tight leading-none mt-0.5">MELAROSA</p>
                </div>
              </div>

              {isRegistered ? (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] font-bold tracking-[0.15em] uppercase px-3 py-1"
                  >
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-2" />
                    Registrasi Berhasil Terkirim
                  </Badge>

                  <h1 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] tracking-tight">
                    Selamat Datang di Ekosistem{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                      MELAROSA
                    </span>
                  </h1>

                  <p className="text-slate-400 text-base font-normal leading-relaxed max-w-md">
                    Pengajuan akun Anda telah tercatat. Tim administrator Bappeda Bojonegoro akan meninjau permohonan untuk menjamin validitas dan keamanan data infrastruktur spasial.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <Badge
                    variant="outline"
                    className="border-blue-500/30 bg-blue-500/10 text-blue-300 text-[10px] font-bold tracking-[0.15em] uppercase px-3 py-1"
                  >
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-2" />
                    Registrasi Portal Operator
                  </Badge>

                  <h1 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] tracking-tight">
                    Pendaftaran Akun{" "}
                    <span className="text-blue-400">
                      Operator Wilayah
                    </span>
                  </h1>

                  <p className="text-slate-400 text-base font-normal leading-relaxed max-w-md">
                    Daftarkan akun Operator Desa atau Operator Kecamatan Anda untuk pengelolaan data spasial dan pelaporan realisasi fisik pembangunan infrastruktur secara presisi.
                  </p>
                </div>
              )}
            </div>

            {/* Feature Grid */}
            <div className="grid gap-3">
              {(isRegistered ? successFeatures : features).map((f, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-start gap-3.5 p-4 rounded-xl border backdrop-blur-xs transition-all',
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
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-slate-50 dark:bg-slate-950 relative overflow-y-auto">
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #3b82f6 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative w-full max-w-md my-auto">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-6 justify-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-emerald-500 text-white shadow-md">
              <IconTopologyComplex className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-widest uppercase">Bappeda Bojonegoro</p>
              <p className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">MELAROSA</p>
            </div>
          </div>

          {isRegistered ? (
            /* ── Registration Success Card ─────────────────────────────── */
            <Card className="border-slate-200/80 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 rounded-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-300">
              <CardHeader className="pb-3 space-y-3 text-center">
                {/* Success Icon */}
                <div className="relative mx-auto">
                  <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80 shadow-md shadow-emerald-500/10 ring-8 ring-emerald-500/5">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold gap-1.5 px-3 py-1 rounded-full mx-auto">
                    <Clock className="w-3.5 h-3.5" />
                    Menunggu Persetujuan Admin
                  </Badge>

                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-white tracking-tight pt-1">
                    Pengajuan Akun Berhasil!
                  </CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
                    Data pendaftaran Anda telah berhasil direkam dalam sistem MELAROSA.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-1">
                {/* Account Details Summary Box */}
                {submittedSummary && (
                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Nama</span>
                      <span className="font-bold text-slate-900 dark:text-white">{submittedSummary.nama}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Email</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{submittedSummary.email}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Wilayah Tugas</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400 text-right max-w-[200px] truncate">
                        {submittedSummary.role}
                        {submittedSummary.nama_desa ? ` (Ds. ${submittedSummary.nama_desa})` : ''}
                        {submittedSummary.nama_kecamatan ? `, Kec. ${submittedSummary.nama_kecamatan}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Waktu Pengajuan</span>
                      <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">{submittedSummary.timestamp}</span>
                    </div>
                  </div>
                )}

                {/* 3-Step Verification Timeline */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                    Alur Aktivasi Akun
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-center text-[10.5px]">
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 space-y-1">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto text-[10px] font-bold">
                        ✓
                      </div>
                      <span className="font-bold block leading-tight">Pengajuan Terkirim</span>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 space-y-1">
                      <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center mx-auto text-[10px] font-bold animate-pulse">
                        2
                      </div>
                      <span className="font-bold block leading-tight">Review Bappeda</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 space-y-1">
                      <div className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-400 flex items-center justify-center mx-auto text-[10px] font-bold">
                        3
                      </div>
                      <span className="font-semibold block leading-tight">Akun Aktif</span>
                    </div>
                  </div>
                </div>

                {/* Info Note */}
                <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/40 text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-300 text-xs">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Catatan Aktivasi:</span>
                  </div>
                  <p>
                    Admin Bappeda akan memverifikasi penugasan wilayah Anda. Begitu akun disetujui, Anda dapat langsung masuk dengan email & password yang telah didaftarkan.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <Button asChild className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 cursor-pointer transition-colors">
                    <Link to="/login" className="flex items-center justify-center gap-2">
                      <span>Masuk ke Halaman Login</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full h-10 rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer">
                    <Link to="/" className="flex items-center justify-center gap-2">
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Kembali ke Beranda Utama</span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* ── Registration Form Card ────────────────────────────────── */
            <Card className="border-slate-200/80 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
              <CardHeader className="pb-2 space-y-3 text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 mx-auto">
                  <IconUserPlus className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Buat Akun Operator
                  </CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400 text-xs">
                    Isi formulir di bawah ini untuk pengajuan akun resmi
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Nama Lengkap */}
                    <FormField
                      control={form.control}
                      name="nama"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Nama Lengkap
                          </FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none" />
                              <Input
                                placeholder="Nama lengkap Anda"
                                autoComplete="off"
                                className="h-11 pl-10 rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-sm font-medium transition-all"
                                disabled={isLoading}
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs font-medium text-rose-500" />
                        </FormItem>
                      )}
                    />

                    {/* Email */}
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
                                placeholder="operator@bojonegoro.go.id"
                                autoComplete="off"
                                className="h-11 pl-10 rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-sm font-medium transition-all"
                                disabled={isLoading}
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs font-medium text-rose-500" />
                        </FormItem>
                      )}
                    />

                    {/* Password */}
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Password
                          </FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none" />
                              <Input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Minimal 6 karakter"
                                autoComplete="new-password"
                                className="h-11 pl-10 pr-11 rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-sm font-medium transition-all"
                                disabled={isLoading}
                                {...field}
                              />
                              <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs font-medium text-rose-500" />
                        </FormItem>
                      )}
                    />

                    {/* Role Selector */}
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Peran (Role) Operator
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                            <FormControl>
                              <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-sm font-medium">
                                <SelectValue placeholder="Pilih Role Operator..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl border">
                              <SelectItem value="operator_desa">Operator Desa</SelectItem>
                              <SelectItem value="operator_kecamatan">Operator Kecamatan</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs font-medium text-rose-500" />
                        </FormItem>
                      )}
                    />

                    {/* Kecamatan Combobox */}
                    <FormField
                      control={form.control}
                      name="id_kecamatan"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Kecamatan Wilayah Kerja
                          </FormLabel>
                          <FormControl>
                            <Combobox
                              options={kecamatanOptions}
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Pilih Kecamatan..."
                              searchPlaceholder="Cari Kecamatan..."
                              emptyText="Kecamatan tidak ditemukan."
                              disabled={isLoading}
                              className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                              popoverClassName="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl border"
                              contentClassName="bg-white dark:bg-slate-900"
                            />
                          </FormControl>
                          <FormMessage className="text-xs font-medium text-rose-500" />
                        </FormItem>
                      )}
                    />

                    {/* Desa Combobox (Operator Desa) */}
                    {selectedRole === 'operator_desa' && (
                      <FormField
                        control={form.control}
                        name="id_desa"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                              <span>Desa Wilayah Kerja</span>
                              {desaLoading && <span className="text-[11px] text-blue-500 animate-pulse">Memuat desa...</span>}
                            </FormLabel>
                            <FormControl>
                              <Combobox
                                options={desaOptions}
                                value={field.value || ''}
                                onChange={field.onChange}
                                placeholder={!selectedKecamatan ? "Pilih kecamatan terlebih dahulu" : "Pilih Desa..."}
                                searchPlaceholder="Cari Desa..."
                                emptyText="Desa tidak ditemukan."
                                disabled={!selectedKecamatan || desaLoading || isLoading}
                                className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                popoverClassName="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl border"
                                contentClassName="bg-white dark:bg-slate-900"
                              />
                            </FormControl>
                            <FormMessage className="text-xs font-medium text-rose-500" />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Submit Button */}
                    <div className="pt-2">
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 cursor-pointer transition-colors"
                      >
                        {isLoading ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Mengirim Pengajuan...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            Kirim Pengajuan Registrasi
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>

                {/* Login Link */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sudah memiliki akun?{' '}
                    <Link to="/login" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold transition-colors">
                      Masuk di sini
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mobile copyright */}
          <p className="lg:hidden text-center text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-6">
            © 2026 MELAROSA · Bappeda Bojonegoro
          </p>
        </div>
      </div>
    </div>
  );
}
