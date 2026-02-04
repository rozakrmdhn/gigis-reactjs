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
                "bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl hover:bg-slate-50 transition-all rounded-xl h-10 w-10 cursor-pointer overflow-hidden group",
                isActive && "ring-2 ring-blue-500 bg-blue-50 border-blue-200",
                className
            )}
        >
            <Layers className={cn(
                "h-5 w-5 transition-transform duration-300 group-hover:scale-110",
                isActive ? "text-blue-600" : "text-slate-600"
            )} />
        </Button>
    );
}
