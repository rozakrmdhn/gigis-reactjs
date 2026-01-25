import { Layers, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

interface LayerItem {
    id: string;
    label: string;
    visible: boolean;
}

interface LayerToggleProps {
    layers: LayerItem[];
    onToggle: (id: string, visible: boolean) => void;
    className?: string;
}

export function LayerToggle({ layers, onToggle, className }: LayerToggleProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                        "bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl hover:bg-slate-50 transition-all rounded-xl h-10 w-10",
                        className
                    )}
                >
                    <Layers className="h-5 w-5 text-slate-600" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-3 rounded-2xl border border-slate-100 shadow-2xl bg-white/95 backdrop-blur-md">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <Layers className="w-4 h-4 text-blue-600" />
                        <h3 className="text-xs font-black text-slate-800 tracking-tight uppercase">Map Layers</h3>
                    </div>

                    <div className="space-y-2">
                        {layers.map((layer) => (
                            <div
                                key={layer.id}
                                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group"
                                onClick={() => onToggle(layer.id, !layer.visible)}
                            >
                                <Checkbox
                                    id={layer.id}
                                    checked={layer.visible}
                                    onCheckedChange={(checked) => onToggle(layer.id, !!checked)}
                                    className="border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                />
                                <Label
                                    htmlFor={layer.id}
                                    className="text-[11px] font-bold text-slate-600 group-hover:text-slate-900 cursor-pointer uppercase tracking-tight"
                                >
                                    {layer.label}
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
