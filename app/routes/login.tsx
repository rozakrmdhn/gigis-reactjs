import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '../contexts/auth-context';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
    IconLock,
    IconMail,
    IconArrowLeft,
    IconChevronRight,
    IconMapPin,
    IconActivity,
    IconShieldCheck
} from '@tabler/icons-react'; // Keeping tabler but adding more for visual depth
import { authService } from '../services/auth.service';
import type { MetaFunction } from 'react-router';
import { cn } from '~/lib/utils';

export const meta: MetaFunction = () => {
    return [
        { title: 'Login - GIGIS Monitoring' },
        { name: 'description', content: 'Masuk ke sistem GIGI\'S Monitoring Jalan Poros Desa Bojonegoro' },
    ];
};

const loginSchema = z.object({
    email: z.string().email('Email tidak valid'),
    password: z.string().min(1, 'Password harus diisi'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
    const navigate = useNavigate();
    const { signin } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema)
    });

    // Redirect if already authenticated
    useEffect(() => {
        if (authService.isAuthenticated()) {
            window.location.href = '/admin/dashboard';
        }
    }, []);

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true);

        try {
            await signin(data.email, data.password);
            toast.success('Login berhasil! Mengalihkan ke dashboard...');
            setTimeout(() => {
                window.location.href = '/admin/dashboard';
            }, 500);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Login gagal. Silakan coba lagi.';
            toast.error(errorMessage);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-white dark:bg-slate-950 font-sans selection:bg-blue-100 dark:selection:bg-blue-900/30">
            {/* Left Side: Hero Section (Visible on LG up) */}
            <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-slate-900">
                {/* Background Hero Image */}
                <img
                    src="/images/login-hero.png"
                    alt="GIS Hero"
                    className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105 animate-pulse-slow"
                    style={{ animationDuration: '10s' }}
                />
                
                {/* Overlay Gradients */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-slate-900/80 to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.3),transparent_50%)]" />

                {/* Content Overlay */}
                <div className="relative z-10 w-full h-full flex flex-col p-16 justify-between">
                    <Link to="/" className="inline-flex items-center gap-2 group">
                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-all">
                            <IconArrowLeft className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm font-black text-white uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">Kembali ke Beranda</span>
                    </Link>

                    <div className="max-w-xl space-y-8">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 backdrop-blur-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                <span className="text-[10px] font-black text-blue-100 uppercase tracking-[0.2em]">Sistem Informasi Geospasial</span>
                            </div>
                            <h2 className="text-5xl font-black text-white tracking-tight leading-[1.1]">
                                Monitoring <span className="text-blue-400">Infrastruktur</span> Desa Bojonegoro.
                            </h2>
                            <p className="text-lg text-slate-300 font-medium leading-relaxed">
                                Kelola data spasial, monitoring pembangunan, dan pelaporan aset jalan secara terpadu dalam satu platform GIS yang modern.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-4">
                            {[
                                { icon: IconMapPin, label: "Pemetaan Presisi", desc: "Akurasi data spasial berbasis Geonode" },
                                { icon: IconActivity, label: "Monitoring Real-time", desc: "Pantau progres pembangunan setiap hari" },
                            ].map((item, i) => (
                                <div key={i} className="space-y-2 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                    <item.icon className="w-6 h-6 text-blue-400" />
                                    <h4 className="text-sm font-bold text-white uppercase tracking-tight">{item.label}</h4>
                                    <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">
                        © 2026 GIGIS MONITORING SYSTEM • BAPPEDA BOJONEGORO
                    </div>
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 md:p-12 lg:p-24 bg-white dark:bg-slate-950">
                <div className="w-full max-w-sm space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    {/* Brand Header */}
                    <div className="space-y-4">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-2xl shadow-blue-500/20 group hover:scale-105 transition-transform duration-500">
                            <IconShieldCheck className="w-7 h-7 text-white stroke-[2.5]" />
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Admin Login</h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Masuk untuk mengelola Dashboard GIGIS.</p>
                        </div>
                    </div>

                    {/* Form Section */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Alamat Email</Label>
                                <div className="relative group">
                                    <IconMail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="admin@bojonegoro.go.id"
                                        className={cn(
                                            "h-12 pl-12 rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-semibold transition-all",
                                            errors.email && "border-red-500 bg-red-50/50 dark:bg-red-950/20"
                                        )}
                                        {...register('email')}
                                        disabled={isLoading}
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest ml-1 animate-in fade-in slide-in-from-top-1">
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                    <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Password</Label>
                                    <button type="button" className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:underline">Lupa Password?</button>
                                </div>
                                <div className="relative group">
                                    <IconLock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className={cn(
                                            "h-12 pl-12 rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-semibold transition-all",
                                            errors.password && "border-red-500 bg-red-50/50 dark:bg-red-950/20"
                                        )}
                                        {...register('password')}
                                        disabled={isLoading}
                                    />
                                </div>
                                {errors.password && (
                                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest ml-1 animate-in fade-in slide-in-from-top-1">
                                        {errors.password.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 rounded-xl bg-slate-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-slate-200 dark:shadow-none hover:-translate-y-0.5 active:scale-95 transition-all group"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 border-[2.5px] border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Memproses...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span>Masuk ke Dashboard</span>
                                    <IconChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            )}
                        </Button>
                    </form>

                    {/* Mobile Footer (visible only on small screens) */}
                    <div className="lg:hidden pt-8 text-center space-y-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                            © 2026 GIGIS MONITORING • BAPPEDA
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

