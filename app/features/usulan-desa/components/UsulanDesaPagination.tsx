import React from "react";
import { Button } from "~/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "~/lib/utils";

interface UsulanDesaPaginationProps {
    pageCount: number;
    pageIndex: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (pageIndex: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    compact?: boolean;
    className?: string;
}

export function UsulanDesaPagination({
    pageCount,
    pageIndex,
    pageSize,
    totalItems,
    onPageChange,
    onPageSizeChange,
    compact = false,
    className
}: UsulanDesaPaginationProps) {
    const startItem = totalItems === 0 ? 0 : pageIndex * pageSize + 1;
    const endItem = Math.min((pageIndex + 1) * pageSize, totalItems);
    const currentPage = pageIndex + 1;
    const maxPages = Math.max(1, pageCount || 1);

    if (compact) {
        return (
            <div className={cn("w-full px-3 py-2 flex items-center justify-between gap-2 text-xs select-none", className)}>
                <div className="flex items-center gap-1.5 min-w-0">
                    <Select
                        value={String(pageSize)}
                        onValueChange={(val) => onPageSizeChange(Number(val))}
                    >
                        <SelectTrigger className="h-7 w-[68px] text-[11px] px-2 font-mono font-semibold rounded-lg bg-background border-border shadow-2xs">
                            <SelectValue placeholder={String(pageSize)} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 20, 25, 50, 100].map((size) => (
                                <SelectItem key={size} value={String(size)} className="text-xs">
                                    {size} / hal
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <span className="text-[11px] text-muted-foreground truncate">
                        <strong className="text-foreground font-mono">{startItem}–{endItem}</strong> dari <strong className="text-foreground font-mono">{totalItems}</strong>
                    </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[11px] font-bold text-muted-foreground font-mono px-1">
                        {currentPage}/{maxPages}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 rounded-lg border-border hover:bg-muted cursor-pointer"
                        onClick={() => onPageChange(pageIndex - 1)}
                        disabled={pageIndex === 0}
                        title="Halaman Sebelumnya"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 rounded-lg border-border hover:bg-muted cursor-pointer"
                        onClick={() => onPageChange(pageIndex + 1)}
                        disabled={pageIndex >= maxPages - 1 || totalItems === 0}
                        title="Halaman Berikutnya"
                    >
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("w-full py-2.5 px-3 sm:px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none", className)}>
            {/* Left: Summary Info & Page Size */}
            <div className="flex items-center justify-between sm:justify-start gap-2.5 w-full sm:w-auto">
                <span className="text-[11px] sm:text-xs text-muted-foreground">
                    Menampilkan <strong className="font-semibold text-foreground font-mono">{startItem}–{endItem}</strong> dari <strong className="font-semibold text-foreground font-mono">{totalItems}</strong> data
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                    <Select
                        value={String(pageSize)}
                        onValueChange={(val) => onPageSizeChange(Number(val))}
                    >
                        <SelectTrigger className="h-7 sm:h-8 w-[76px] sm:w-[84px] text-[11px] sm:text-xs px-2 font-mono font-semibold rounded-xl bg-background border-border shadow-2xs">
                            <SelectValue placeholder={String(pageSize)} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 20, 25, 50, 100].map((size) => (
                                <SelectItem key={size} value={String(size)} className="text-xs">
                                    {size} / hal
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Right: Modern Navigation Controls */}
            <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto">
                <span className="text-[11px] sm:text-xs font-medium text-muted-foreground mr-1">
                    Halaman <strong className="text-foreground font-mono font-bold">{currentPage}</strong> dari <span className="font-mono">{maxPages}</span>
                </span>

                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-xl border-border hover:bg-muted hidden sm:inline-flex cursor-pointer"
                        onClick={() => onPageChange(0)}
                        disabled={pageIndex === 0}
                        title="Halaman Pertama"
                    >
                        <ChevronsLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-xl border-border hover:bg-muted cursor-pointer"
                        onClick={() => onPageChange(pageIndex - 1)}
                        disabled={pageIndex === 0}
                        title="Halaman Sebelumnya"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-xl border-border hover:bg-muted cursor-pointer"
                        onClick={() => onPageChange(pageIndex + 1)}
                        disabled={pageIndex >= maxPages - 1 || totalItems === 0}
                        title="Halaman Berikutnya"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-xl border-border hover:bg-muted hidden sm:inline-flex cursor-pointer"
                        onClick={() => onPageChange(maxPages - 1)}
                        disabled={pageIndex >= maxPages - 1 || totalItems === 0}
                        title="Halaman Terakhir"
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
