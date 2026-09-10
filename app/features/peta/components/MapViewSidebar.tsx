import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface MapViewSidebarProps {
    children: React.ReactNode;
    className?: string;
    widthClass?: string;
    isOpen?: boolean;
    onToggle?: (isOpen: boolean) => void;
}

export function MapViewSidebar({
    children,
    className,
    widthClass = "w-[340px]",
    isOpen: externalIsOpen,
    onToggle
}: MapViewSidebarProps) {
    const [localIsOpen, setLocalIsOpen] = useState(true);

    const isOpen = externalIsOpen !== undefined ? externalIsOpen : localIsOpen;
    const handleToggle = () => {
        if (onToggle) {
            onToggle(!isOpen);
        } else {
            setLocalIsOpen(!localIsOpen);
        }
    };

    return (
        <div
            className={cn(
                "absolute bg-[#080B11]/95 text-slate-200 backdrop-blur-xl border border-white/[0.08] transition-all duration-300 ease-in-out flex flex-col z-30 shadow-2xl will-change-transform",
                widthClass,
                isOpen
                    ? "translate-x-0 opacity-100 pointer-events-auto"
                    : "-translate-x-[calc(100%+24px)] opacity-0 pointer-events-none",
                className
            )}
        >
            <div className="flex-1 overflow-hidden flex flex-col">
                {children}
            </div>

            {/* Toggle Handle Button attached to right edge */}
            <Button
                variant="secondary"
                size="icon"
                className="absolute top-1/2 -translate-y-1/2 -right-9 h-10 w-9 rounded-l-none rounded-r-xl pointer-events-auto cursor-pointer shadow-md z-40 bg-[#0C101A] border border-l-0 border-white/[0.08] hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
                onClick={handleToggle}
                title={isOpen ? "Sembunyikan Panel Spasial" : "Tampilkan Panel Spasial"}
            >
                {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 text-emerald-400" />}
            </Button>
        </div>
    );
}
