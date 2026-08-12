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
import { Clock } from "lucide-react";

export function SessionExpiredAlert() {
    const [isWarning, setIsWarning] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        const handleSessionExpired = () => {
            setIsWarning(false);
            // Redirect immediately to login on session expiry
            navigate("/login");
        };

        const handleSessionWarning = (event: CustomEvent) => {
            const { remainingMs } = event.detail;
            setRemainingSeconds(Math.ceil(remainingMs / 1000));
            if (!isWarning) {
                setIsWarning(true);
            }
        };

        window.addEventListener("auth-session-expired", handleSessionExpired);
        window.addEventListener("auth-session-warning", handleSessionWarning as EventListener);

        return () => {
            window.removeEventListener("auth-session-expired", handleSessionExpired);
            window.removeEventListener("auth-session-warning", handleSessionWarning as EventListener);
        };
    }, [isWarning, navigate]);

    // Update countdown every second
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
        setIsWarning(false);
        navigate("/login");
    };

    const handleDismissWarning = () => {
        setIsWarning(false);
    };

    // Format seconds to "M:SS"
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    return (
        <AlertDialog open={isWarning} onOpenChange={setIsWarning}>
            <AlertDialogContent className="max-w-xs sm:max-w-sm p-5 gap-3">
                <AlertDialogHeader className="space-y-1 text-center">
                    <AlertDialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                        Sesi Hampir Habis
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-xs text-muted-foreground text-center">
                        Sesi Anda akan berakhir dalam <span className="font-semibold text-amber-600 dark:text-amber-400">{formatTime(remainingSeconds)}</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex flex-row justify-center gap-2 mt-2">
                    <AlertDialogCancel
                        onClick={handleDismissWarning}
                        className="h-8 text-[11px] px-3 font-medium mt-0 flex-1 border-slate-200"
                    >
                        Lanjutkan
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleLoginRedirect}
                        className="h-8 text-[11px] px-3 font-medium flex-1 bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                    >
                        Login Ulang
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
