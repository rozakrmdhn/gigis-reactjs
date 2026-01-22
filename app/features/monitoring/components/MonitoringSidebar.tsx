import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface MonitoringSidebarProps {
    children: React.ReactNode;
    className?: string;
}

export function MonitoringSidebar({ children, className }: MonitoringSidebarProps) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div
            className={cn(
                "absolute top-0 left-0 bottom-0 bg-background/95 backdrop-blur-sm border-r transition-all duration-500 ease-in-out flex flex-col z-30 shadow-xl",
                isOpen ? "w-80" : "w-0",
                className
            )}
        >
            <div className={cn("flex-1 overflow-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent", !isOpen && "hidden")}>
                {children}
            </div>

            <Button
                variant="secondary"
                size="icon"
                className="absolute top-3 -right-8 h-8 w-8 rounded-l-none shadow-md"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
        </div>
    );
}
