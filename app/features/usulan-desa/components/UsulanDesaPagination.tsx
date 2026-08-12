import { Button } from "~/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface UsulanDesaPaginationProps {
    pageCount: number;
    pageIndex: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (pageIndex: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    compact?: boolean;
}

export function UsulanDesaPagination({
    pageCount,
    pageIndex,
    pageSize,
    totalItems,
    onPageChange,
    onPageSizeChange,
    compact = false,
}: UsulanDesaPaginationProps) {
    if (compact) {
        const startItem = totalItems === 0 ? 0 : pageIndex * pageSize + 1;
        const endItem = Math.min((pageIndex + 1) * pageSize, totalItems);

        return (
            <div className="w-full bg-slate-50/90 dark:bg-slate-900/90 border-t border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md px-3 py-1.5 flex items-center justify-between gap-2 text-xs select-none">
                <div className="flex items-center gap-1.5 min-w-0">
                    <Select
                        value={String(pageSize)}
                        onValueChange={(val) => onPageSizeChange(Number(val))}
                    >
                        <SelectTrigger className="h-7 w-[64px] text-[10px] px-2 font-medium rounded-lg bg-background border-slate-200 dark:border-slate-700">
                            <SelectValue placeholder={String(pageSize)} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 20, 25, 50, 100].map((size) => (
                                <SelectItem key={size} value={String(size)} className="text-xs">
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <span className="text-[10px] text-muted-foreground truncate">
                        {startItem}-{endItem} dari {totalItems}
                    </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mr-1 font-mono">
                        {pageIndex + 1}/{pageCount || 1}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 rounded-lg border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                        onClick={() => onPageChange(pageIndex - 1)}
                        disabled={pageIndex === 0}
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 rounded-lg border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                        onClick={() => onPageChange(pageIndex + 1)}
                        disabled={pageIndex >= pageCount - 1 || pageCount === 0}
                    >
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-background/95 dark:bg-slate-950/95 border-t border-border backdrop-blur-sm py-2.5 px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                <div className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-2.5 py-1.5 rounded-full shrink-0 border border-slate-200 dark:border-slate-700">
                    Total: {totalItems} Data
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Rows per page</span>
                    <Select
                        value={String(pageSize)}
                        onValueChange={(val) => onPageSizeChange(Number(val))}
                    >
                        <SelectTrigger className="h-8 w-[70px] dark:border-slate-800">
                            <SelectValue placeholder={String(pageSize)} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[5, 10, 20, 30, 40, 50].map((size) => (
                                <SelectItem key={size} value={String(size)}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-xs font-medium text-muted-foreground">
                    Page {pageIndex + 1} of {pageCount || 1}
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 dark:border-slate-800"
                        onClick={() => onPageChange(0)}
                        disabled={pageIndex === 0}
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 dark:border-slate-800"
                        onClick={() => onPageChange(pageIndex - 1)}
                        disabled={pageIndex === 0}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 dark:border-slate-800"
                        onClick={() => onPageChange(pageIndex + 1)}
                        disabled={pageIndex >= pageCount - 1 || pageCount === 0}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 dark:border-slate-800"
                        onClick={() => onPageChange(pageCount - 1)}
                        disabled={pageIndex >= pageCount - 1 || pageCount === 0}
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
