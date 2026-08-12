import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "~/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "~/components/ui/popover";

export interface ComboboxOption {
    value: string;
    label: string;
}

interface ComboboxProps {
    options: ComboboxOption[];
    value?: string;
    onChange?: (value: string) => void;
    onSelect?: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    disabled?: boolean;
    className?: string;
    popoverClassName?: string;
    contentClassName?: string;
}

export function Combobox({
    options,
    value,
    onChange,
    onSelect,
    placeholder = "Pilih...",
    searchPlaceholder = "Cari...",
    emptyText = "Tidak ditemukan.",
    disabled = false,
    className,
    popoverClassName,
    contentClassName,
}: ComboboxProps) {
    const handleSelect = (val: string) => {
        if (onChange) onChange(val);
        if (onSelect) onSelect(val);
    };
    const [open, setOpen] = React.useState(false);

    const selectedOption = React.useMemo(() => {
        if (value === undefined || value === null || value === "") return undefined;
        const strVal = String(value).trim().toLowerCase();
        return options.find((opt) => String(opt.value).trim().toLowerCase() === strVal);
    }, [options, value]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        "w-full justify-between font-normal h-9.5 text-xs rounded-xl dark:border-slate-800 bg-white dark:bg-slate-950",
                        !selectedOption && "text-muted-foreground",
                        className
                    )}
                >
                    <span className="truncate">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className={cn("w-[var(--radix-popover-trigger-width)] p-0", popoverClassName)} align="start">
                <Command className={cn(contentClassName)}>
                    <CommandInput placeholder={searchPlaceholder} className="h-8 text-xs" />
                    <CommandList>
                        <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">{emptyText}</CommandEmpty>
                        <CommandGroup className="max-h-60 overflow-auto">
                            {options.map((option) => {
                                const isSelected = value !== undefined && value !== null && value !== "" && String(option.value).trim().toLowerCase() === String(value).trim().toLowerCase();
                                return (
                                    <CommandItem
                                        key={option.value}
                                        value={option.label}
                                        onSelect={() => {
                                            handleSelect(option.value);
                                            setOpen(false);
                                        }}
                                        className="text-xs flex items-center justify-between cursor-pointer"
                                    >
                                        <span className="truncate">{option.label}</span>
                                        <Check
                                            className={cn(
                                                "ml-2 h-3.5 w-3.5 shrink-0 text-blue-600",
                                                isSelected ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
