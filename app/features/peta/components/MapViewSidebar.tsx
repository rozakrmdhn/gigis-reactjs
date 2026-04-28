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
                "absolute top-0 left-0 bottom-0 bg-background/95 dark:bg-slate-950/95 backdrop-blur-sm border-r dark:border-slate-800 transition-transform duration-500 ease-in-out flex flex-col z-40 shadow-xl will-change-transform",
                widthClass,
                !isOpen && "-translate-x-full",
                className
            )}
        >
            <div className="flex-1 overflow-hidden flex flex-col">
                {children}
            </div>

            <Button
                variant="secondary"
                size="icon"
                className="absolute top-1/2 -translate-y-1/2 -right-8 h-10 w-8 rounded-l-none cursor-pointer shadow-md z-40 bg-white/90 dark:bg-slate-900/90 border-y border-r dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={handleToggle}
            >
                {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
        </div>
    );
}
