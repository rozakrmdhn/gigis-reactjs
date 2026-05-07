import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { LogOut, Clock, RefreshCw } from "lucide-react";
import { authService } from "~/services/auth.service";

export function SessionExpiredAlert() {
    const [isOpen, setIsOpen] = useState(false);
    const [isWarning, setIsWarning] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        const handleSessionExpired = () => {
            console.log("SessionExpiredAlert: Caught expired event");
            setIsWarning(false); // Tutup warning jika ada
            setIsOpen(true);
        };

        const handleSessionWarning = (event: CustomEvent) => {
            const { remainingMs } = event.detail;
            setRemainingSeconds(Math.ceil(remainingMs / 1000));

            // Tampilkan warning dialog hanya sekali
            if (!isWarning && !isOpen) {
                setIsWarning(true);
            }
        };

        window.addEventListener("auth-session-expired", handleSessionExpired);
        window.addEventListener("auth-session-warning", handleSessionWarning as EventListener);

        return () => {
            window.removeEventListener("auth-session-expired", handleSessionExpired);
            window.removeEventListener("auth-session-warning", handleSessionWarning as EventListener);
        };
    }, [isWarning, isOpen]);

    // Update countdown setiap detik
    useEffect(() => {
        if (!isWarning) return;

        const interval = setInterval(() => {
            setRemainingSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isWarning]);

    const handleLoginRedirect = () => {
        setIsOpen(false);
        setIsWarning(false);
        navigate("/login");
    };

    const handleDismissWarning = () => {
        setIsWarning(false);
    };

    // Format detik ke "M:SS"
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    return (
        <>
            {/* Warning Dialog — Sesi Hampir Habis */}
            <AlertDialog open={isWarning} onOpenChange={setIsWarning}>
                <AlertDialogContent className="sm:max-w-[425px]">
                    <AlertDialogHeader className="flex flex-col items-center gap-4 text-center">
                        <div className="p-3 bg-amber-100 rounded-full text-amber-600">
                            <Clock className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <AlertDialogTitle className="text-2xl font-bold text-slate-900">
                                Sesi Hampir Habis
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-500 font-medium text-center">
                                Sesi Anda akan berakhir dalam{" "}
                                <span className="font-bold text-amber-600 text-lg">
                                    {formatTime(remainingSeconds)}
                                </span>
                                . Silakan simpan pekerjaan Anda atau login kembali untuk memperpanjang sesi.
                            </AlertDialogDescription>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:flex-col gap-2 mt-4">
                        <AlertDialogAction
                            onClick={handleLoginRedirect}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-11"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Login Ulang Sekarang
                        </AlertDialogAction>
                        <AlertDialogCancel
                            onClick={handleDismissWarning}
                            className="w-full font-bold h-11"
                        >
                            Lanjutkan Bekerja
                        </AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Expired Dialog — Sesi Sudah Habis */}
            <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
                <AlertDialogContent className="sm:max-w-[425px]">
                    <AlertDialogHeader className="flex flex-col items-center gap-4 text-center">
                        <div className="p-3 bg-red-100 rounded-full text-red-600">
                            <LogOut className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <AlertDialogTitle className="text-2xl font-bold text-slate-900">
                                Sesi Berakhir
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-500 font-medium text-center">
                                Sesi Anda telah berakhir atau tidak valid. Silakan masuk kembali untuk melanjutkan akses ke aplikasi.
                            </AlertDialogDescription>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:flex-col gap-2 mt-4">
                        <AlertDialogAction
                            onClick={handleLoginRedirect}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-11"
                        >
                            Masuk Kembali
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
