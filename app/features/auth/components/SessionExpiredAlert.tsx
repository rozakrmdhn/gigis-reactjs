import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { LogOut } from "lucide-react";

export function SessionExpiredAlert() {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const handleSessionExpired = () => {
            setIsOpen(true);
        };

        window.addEventListener("auth-session-expired", handleSessionExpired);
        return () => {
            window.removeEventListener("auth-session-expired", handleSessionExpired);
        };
    }, []);

    const handleLoginRedirect = () => {
        setIsOpen(false);
        navigate("/login");
    };

    return (
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
                        <AlertDialogDescription className="text-slate-500 font-medium">
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
    );
}
