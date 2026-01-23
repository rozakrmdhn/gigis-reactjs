import { Square, Circle, Pentagon, Minus, Save, MousePointer2, Trash2, Download, Pencil, SplinePointer, Spline, SaveIcon, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

export type DrawMode = "view" | "draw-point" | "draw-line" | "draw-polygon" | "draw-circle" | "draw-box" | "edit";

interface DrawControlsProps {
    mode: DrawMode;
    onSetMode: (mode: DrawMode) => void;
    onClear: () => void;
    onExport: () => void;
    className?: string;
    onFinishReshape?: () => void;
    canFinishReshape?: boolean;
    onCancelReshape?: () => void;
}

export function DrawControls({
    mode,
    onSetMode,
    onClear,
    onExport,
    className,
    onFinishReshape,
    canFinishReshape,
    onCancelReshape
}: DrawControlsProps) {
    const tools = [
        { id: "view", icon: MousePointer2, label: "View/Select" },
        { id: "draw-line", icon: Spline, label: "Draw Line" },
        { id: "draw-polygon", icon: Pentagon, label: "Draw Polygon" },
        { id: "draw-point", icon: Circle, label: "Draw Point" },
        { id: "draw-box", icon: Square, label: "Draw Box" },
        { id: "edit", icon: SplinePointer, label: "Edit & Snap" },
    ];

    return (
        <TooltipProvider>
            <div className={cn("flex flex-col gap-1.5 p-1 bg-white/80 backdrop-blur-md border rounded-xl shadow-xl", className)}>
                {tools.map((tool) => (
                    <Tooltip key={tool.id}>
                        <TooltipTrigger asChild>
                            <Button
                                variant={mode === tool.id ? "default" : "ghost"}
                                size="icon"
                                className={cn(
                                    "h-8 w-8 rounded-xl transition-all duration-300",
                                    mode === tool.id
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                                        : "hover:bg-blue-50 hover:text-blue-600"
                                )}
                                onClick={() => onSetMode(tool.id as DrawMode)}
                            >
                                <tool.icon className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                            <p className="text-xs font-semibold">{tool.label}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}

                <div className="h-px bg-slate-200/60 mx-1" />

                {canFinishReshape && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all duration-300"
                                onClick={onCancelReshape}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                            <p className="text-xs font-semibold text-rose-600">Batal Edit</p>
                        </TooltipContent>
                    </Tooltip>
                )}

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={canFinishReshape ? "default" : "ghost"}
                            size="icon"
                            className={cn(
                                "h-8 w-8 rounded-xl transition-all duration-300",
                                canFinishReshape
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 animate-pulse"
                                    : "opacity-50 cursor-not-allowed"
                            )}
                            onClick={onFinishReshape}
                            disabled={!canFinishReshape}
                        >
                            <SaveIcon className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p className="text-xs font-semibold">Selesai Reshape & Simpan</p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all duration-300"
                            onClick={onClear}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p className="text-xs font-semibold text-red-600">Clear All</p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all duration-300"
                            onClick={onExport}
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p className="text-xs font-semibold text-blue-600">Export GeoJSON</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
}
