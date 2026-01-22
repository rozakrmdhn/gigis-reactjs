import { Square, Circle, Pentagon, Minus, Save, MousePointer2, Trash2, Download } from "lucide-react";
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
}

export function DrawControls({ mode, onSetMode, onClear, onExport, className }: DrawControlsProps) {
    const tools = [
        { id: "view", icon: MousePointer2, label: "View/Select" },
        { id: "draw-line", icon: Minus, label: "Draw Line" },
        { id: "draw-polygon", icon: Pentagon, label: "Draw Polygon" },
        { id: "draw-point", icon: Circle, label: "Draw Point" },
        { id: "draw-box", icon: Square, label: "Draw Box" },
        { id: "edit", icon: Save, label: "Edit & Snap" },
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
