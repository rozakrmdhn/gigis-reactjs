import * as React from "react";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

interface DatePickerProps {
    value?: string;
    onChange: (dateStr: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export function DatePicker({
    value,
    onChange,
    placeholder = "Pilih tanggal...",
    className,
    disabled = false
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false);

    const selectedDate = React.useMemo(() => {
        if (!value) return undefined;
        try {
            const parts = value.split("-");
            if (parts.length === 3) {
                return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            }
            const d = new Date(value);
            return isNaN(d.getTime()) ? undefined : d;
        } catch {
            return undefined;
        }
    }, [value]);

    const handleSelect = (date: Date | undefined) => {
        if (!date) {
            onChange("");
        } else {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            onChange(`${year}-${month}-${day}`);
        }
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        "h-8 w-full justify-start text-left font-normal text-xs px-2.5 bg-background border-input rounded-lg hover:bg-accent transition-colors",
                        !value && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">
                        {selectedDate
                            ? selectedDate.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
                            : placeholder}
                    </span>
                    {value && (
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange("");
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.stopPropagation();
                                    onChange("");
                                }
                            }}
                            className="ml-1 rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                            title="Hapus tanggal"
                        >
                            <X className="h-3 w-3" />
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border border-border shadow-xl rounded-2xl z-[100] bg-popover" align="start">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleSelect}
                    initialFocus
                    className="p-3"
                />
            </PopoverContent>
        </Popover>
    );
}
