import { List } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface SegmentToggleProps {
    onClick: () => void;
    isActive?: boolean;
    className?: string;
}

export function SegmentToggle({
    onClick,
    isActive,
    className
}: SegmentToggleProps) {
    return (
        <Button
            variant="outline"
            size="icon"
            onClick={onClick}
            className={cn(
                "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all rounded-xl h-10 w-10 cursor-pointer overflow-hidden group",
                isActive && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/30",
                className
            )}
            title="Toggle Segment List"
        >
            <List className={cn(
                "h-5 w-5 transition-transform duration-300 group-hover:scale-110",
                isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"
            )} />
        </Button>
    );
}
