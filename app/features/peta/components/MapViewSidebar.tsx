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
                "absolute bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 transition-all duration-300 ease-in-out flex flex-col z-30 shadow-xl will-change-transform",
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
                className="absolute top-1/2 -translate-y-1/2 -right-9 h-10 w-9 rounded-l-none rounded-r-xl pointer-events-auto cursor-pointer shadow-md z-40 bg-white/95 dark:bg-slate-900/95 border border-l-0 border-slate-200/80 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-200 hover:text-blue-600 transition-all"
                onClick={handleToggle}
                title={isOpen ? "Sembunyikan Panel Spasial" : "Tampilkan Panel Spasial"}
            >
                {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
            </Button>
        </div>
    );
}
