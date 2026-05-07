import { Plus, Minus, Compass, Printer } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

interface MapControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetBearing: () => void;
    onPrint?: () => void;
    className?: string;
}

export function MapControls({ onZoomIn, onZoomOut, onResetBearing, onPrint, className }: MapControlsProps) {
    return (
        <TooltipProvider>
            <div className={cn("flex flex-col gap-1.5 p-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border dark:border-slate-800 rounded-xl shadow-xl", className)}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 dark:text-slate-100 transition-all duration-300 cursor-pointer"
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
                            className="h-8 w-8 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 dark:text-slate-100 transition-all duration-300 cursor-pointer"
                            onClick={onZoomOut}
                        >
                            <Minus className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p className="text-xs font-semibold">Zoom Out</p>
                    </TooltipContent>
                </Tooltip>

                <div className="h-px bg-slate-200/60 dark:bg-slate-800/60 mx-1" />

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 dark:text-slate-100 transition-all duration-300 cursor-pointer"
                            onClick={onResetBearing}
                        >
                            <Compass className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p className="text-xs font-semibold">Reset View</p>
                    </TooltipContent>
                </Tooltip>

                {onPrint && (
                    <>
                        <div className="h-px bg-slate-200/60 dark:bg-slate-800/60 mx-1" />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 dark:text-slate-100 transition-all duration-300 cursor-pointer"
                                    onClick={onPrint}
                                >
                                    <Printer className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                <p className="text-xs font-semibold">Cetak Peta</p>
                            </TooltipContent>
                        </Tooltip>
                    </>
                )}
            </div>
        </TooltipProvider>
    );
}
