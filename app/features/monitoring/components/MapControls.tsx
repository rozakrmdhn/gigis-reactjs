import { Plus, Minus, Compass } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

interface MapControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetBearing: () => void;
    className?: string;
}

export function MapControls({ onZoomIn, onZoomOut, onResetBearing, className }: MapControlsProps) {
    return (
        <TooltipProvider>
            <div className={cn("flex flex-col gap-1.5 p-1 bg-white/80 backdrop-blur-md border rounded-xl shadow-xl", className)}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all duration-300"
                            onClick={onZoomIn}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p className="text-xs font-semibold">Zoom In</p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all duration-300"
                            onClick={onZoomOut}
                        >
                            <Minus className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p className="text-xs font-semibold">Zoom Out</p>
                    </TooltipContent>
                </Tooltip>

                <div className="h-px bg-slate-200/60 mx-1" />

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all duration-300"
                            onClick={onResetBearing}
                        >
                            <Compass className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p className="text-xs font-semibold">Reset View</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
}
