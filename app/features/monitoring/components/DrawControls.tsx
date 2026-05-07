import { useState, useRef, useEffect } from "react";
import { Square, Circle, Pentagon, Minus, Save, MousePointer2, Trash2, Download, Pencil, SplinePointer, Spline, SaveIcon, X, ChevronLeft, ChevronRight, Sparkles, Zap } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

export type DrawMode = "view" | "draw-point" | "draw-line" | "draw-polygon" | "draw-circle" | "draw-box" | "edit" | "draw-automatic";

interface DrawControlsProps {
    mode: DrawMode;
    onSetMode: (mode: DrawMode) => void;
    onClear: () => void;
    onExport: () => void;
    className?: string;
    onFinishReshape?: () => void;
    canFinishReshape?: boolean;
    onCancelReshape?: () => void;
    hasDrawnFeature?: boolean;
    isEditingSegment?: boolean;
    selectedRoad?: any | null;
}

export function DrawControls({
    mode,
    onSetMode,
    onClear,
    onExport,
    className,
    onFinishReshape,
    canFinishReshape,
    onCancelReshape,
    hasDrawnFeature,
    isEditingSegment,
    selectedRoad,
}: DrawControlsProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);

    const isDrawLineEnabled = !!selectedRoad;
    const isEditSnapEnabled = hasDrawnFeature || isEditingSegment;
    const isClearEnabled = mode.startsWith("draw-") || hasDrawnFeature;
    const isExportEnabled = hasDrawnFeature;
    const isFinishReshapeEnabled = canFinishReshape && isEditingSegment;

    const allTools = [
        {
            id: "view",
            icon: MousePointer2,
            label: "Select",
            active: mode === "view",
            disabled: false,
            alwaysShow: true,
            onClick: () => onSetMode("view"),
        },
        {
            id: "draw-line",
            icon: Spline,
            label: "Manual",
            active: mode === "draw-line",
            disabled: !isDrawLineEnabled || isEditingSegment,
            show: !isEditingSegment,
            onClick: () => onSetMode("draw-line"),
        },
        {
            id: "draw-automatic",
            icon: Sparkles,
            label: "Point to Point",
            active: mode === "draw-automatic",
            disabled: !isDrawLineEnabled || isEditingSegment,
            show: !isEditingSegment,
            onClick: () => onSetMode("draw-automatic"),
        },
        {
            id: "extract",
            icon: Zap,
            label: "Extract",
            active: false,
            variant: "info" as const,
            disabled: !hasDrawnFeature,
            show: mode === "draw-automatic" && hasDrawnFeature,
            onClick: () => {
                // We'll pass this via a new prop or handle it in index.tsx
                if (window.dispatchEvent) {
                    window.dispatchEvent(new CustomEvent("trigger-segment-extraction"));
                }
            },
        },
        {
            id: "edit",
            icon: SplinePointer,
            label: "Reshape & Snap",
            active: mode === "edit",
            disabled: !isEditSnapEnabled,
            show: isEditSnapEnabled,
            onClick: () => onSetMode("edit"),
        },
        {
            id: "clear",
            icon: Trash2,
            label: "Clear All",
            variant: "danger" as const,
            disabled: !isClearEnabled,
            show: isClearEnabled,
            onClick: onClear,
        },
        {
            id: "cancel",
            icon: X,
            label: "Batal Edit",
            variant: "danger" as const,
            disabled: !canFinishReshape,
            show: canFinishReshape,
            onClick: onCancelReshape || (() => { }),
        },
        {
            id: "export",
            icon: Download,
            label: "Export",
            variant: "info" as const,
            disabled: !isExportEnabled,
            show: isExportEnabled,
            onClick: onExport,
        },
        {
            id: "save",
            icon: SaveIcon,
            label: "Simpan",
            variant: "success" as const,
            pulse: isFinishReshapeEnabled,
            disabled: !isFinishReshapeEnabled,
            show: isFinishReshapeEnabled,
            onClick: onFinishReshape || (() => { }),
        },
    ];

    // Show alwaysShow tools OR tools that are explicitly shown
    // Prioritize "save" and "cancel" buttons to be on the left when active
    const saveTool = allTools.find(t => t.id === "save");
    const cancelTool = allTools.find(t => t.id === "cancel");
    const otherTools = allTools.filter(t => t.id !== "save" && t.id !== "cancel");

    const visibleTools = [
        ...(saveTool && (saveTool.alwaysShow || saveTool.show) ? [saveTool] : []),
        ...(cancelTool && (cancelTool.alwaysShow || cancelTool.show) ? [cancelTool] : []),
        ...otherTools.filter(t => t.alwaysShow || t.show)
    ];

    const checkScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setShowLeftArrow(scrollLeft > 2);
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 2);
        }
    };

    useEffect(() => {
        checkScroll();
        const timeout = setTimeout(checkScroll, 100);
        return () => clearTimeout(timeout);
    }, [visibleTools, mode]);

    const scroll = (direction: "left" | "right") => {
        if (scrollContainerRef.current) {
            const amount = direction === "left" ? -120 : 120;
            scrollContainerRef.current.scrollBy({ left: amount, behavior: "smooth" });
        }
    };

    return (
        <TooltipProvider>
            <div className={cn(
                "relative flex items-center group max-w-[calc(100vw-2rem)] md:max-w-[400px]",
                className
            )}>
                {/* Left Arrow */}
                {showLeftArrow && (
                    <button
                        onClick={() => scroll("left")}
                        className="absolute left-[-12px] z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full p-1 shadow-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all animate-in fade-in zoom-in duration-200"
                    >
                        <ChevronLeft className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                    </button>
                )}

                <div
                    ref={scrollContainerRef}
                    onScroll={checkScroll}
                    className={cn(
                        "flex flex-row items-center gap-1 p-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border dark:border-slate-800 rounded-2xl shadow-2xl no-print overflow-x-auto scrollbar-none scroll-smooth",
                        visibleTools.length > 4 ? "w-full" : "w-auto"
                    )}
                >
                    {visibleTools.map((tool, index) => (
                        <div key={tool.id} className="flex items-center gap-1">
                            {/* Separators logic - add if group changes or specific positions */}
                            {(tool.id === "clear" || tool.id === "export") && index > 0 && (
                                <div className="w-px h-6 md:h-8 bg-slate-200/60 dark:bg-slate-800/60 mx-0.5 md:mx-1 shrink-0" />
                            )}
                            <ToolButton
                                icon={tool.icon}
                                label={tool.label}
                                active={tool.active}
                                disabled={tool.disabled}
                                onClick={tool.onClick}
                                variant={tool.variant}
                                pulse={tool.pulse}
                            />
                        </div>
                    ))}
                </div>

                {/* Right Arrow */}
                {showRightArrow && (
                    <button
                        onClick={() => scroll("right")}
                        className="absolute right-[-12px] z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full p-1 shadow-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all animate-in fade-in zoom-in duration-200"
                    >
                        <ChevronRight className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                    </button>
                )}
            </div>
        </TooltipProvider>
    );
}

interface ToolButtonProps {
    icon: any;
    label: string;
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
    variant?: "default" | "danger" | "success" | "info";
    pulse?: boolean;
}

function ToolButton({
    icon: Icon,
    label,
    active,
    disabled,
    onClick,
    variant = "default",
    pulse = false,
}: ToolButtonProps) {
    const variantClasses = {
        default: active
            ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/20"
            : "hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-500 hover:text-blue-600",
        danger: "text-rose-500 hover:bg-rose-50 hover:text-rose-600",
        success: active || pulse
            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
            : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700",
        info: "text-blue-600 hover:bg-blue-50 hover:text-blue-700"
    };

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant={active ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 h-auto min-w-[40px] md:min-w-[64px] px-2 py-1.5 rounded-xl transition-all duration-300 shrink-0",
                        variantClasses[variant],
                        disabled && "opacity-40 cursor-not-allowed pointer-events-none",
                        pulse && "animate-pulse"
                    )}
                    onClick={onClick}
                    disabled={disabled}
                >
                    <Icon className="h-4 w-4" />
                    <span className="text-[9px] font-black tracking-tight leading-none hidden md:block">{label}</span>
                </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
                <p className="text-xs font-semibold">{label}</p>
            </TooltipContent>
        </Tooltip>
    );
}
