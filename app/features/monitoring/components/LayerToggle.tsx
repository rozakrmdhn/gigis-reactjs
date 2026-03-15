import { Layers } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface LayerToggleProps {
    onClick: () => void;
    isActive?: boolean;
    className?: string;
}

export function LayerToggle({
    onClick,
    isActive,
    className
}: LayerToggleProps) {
    return (
        <Button
            variant="outline"
            size="icon"
            onClick={onClick}
            className={cn(
                "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all rounded-xl h-10 w-10 cursor-pointer overflow-hidden group",
                isActive && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/30",
                className
            )}
        >
            <Layers className={cn(
                "h-5 w-5 transition-transform duration-300 group-hover:scale-110",
                isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"
            )} />
        </Button>
    );
}
