import { Link } from "react-router";
import { IconActivity } from "@tabler/icons-react";
import { Separator } from "~/components/ui/separator";

export function PublicFooter() {
    return (
        <footer className="mt-auto bg-slate-950 text-slate-400 py-12 border-t border-slate-800/80">
            <div className="container max-w-7xl mx-auto px-4 md:px-6 space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    {/* Brand */}
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20">
                                <IconActivity size={18} stroke={2.5} />
                            </div>
                            <span className="text-base font-bold text-white tracking-tight">Melarosa GIS</span>
                        </div>
                        <p className="text-xs text-slate-500 font-normal max-w-md">
                            Sistem monitoring layanan dan realisasi infrastruktur berbasis spasial untuk 430 desa di 28 kecamatan Kabupaten Bojonegoro melalui mekanisme BKK.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-400">
                        <Link to="/" className="hover:text-white transition-colors">Beranda</Link>
                        <Separator orientation="vertical" className="h-3 bg-slate-800" />
                        <Link to="/map-view" className="hover:text-white transition-colors">Peta Spasial</Link>
                        <Separator orientation="vertical" className="h-3 bg-slate-800" />
                        <Link to="/jalan-desa" className="hover:text-white transition-colors">Ruas Jalan</Link>
                        <Separator orientation="vertical" className="h-3 bg-slate-800" />
                        <Link to="/statistik" className="hover:text-white transition-colors">Statistik</Link>
                        <Separator orientation="vertical" className="h-3 bg-slate-800" />
                        <Link to="/katalog-dataset" className="hover:text-white transition-colors">Katalog Dataset</Link>
                        <Separator orientation="vertical" className="h-3 bg-slate-800" />
                        <Link to="/login" className="hover:text-white transition-colors">Portal Admin</Link>
                    </div>
                </div>

                <Separator className="bg-slate-900" />

                {/* Bottom Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-slate-500 font-normal">
                    <p>© 2026 Melarosa GIS Monitoring · Bappeda Kabupaten Bojonegoro. All rights reserved.</p>
                    <p>Jl. P. Mas Tumapel No. 1, Bojonegoro, Jawa Timur 62111</p>
                </div>
            </div>
        </footer>
    );
}
