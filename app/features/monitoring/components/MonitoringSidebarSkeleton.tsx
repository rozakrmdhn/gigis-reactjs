import { Skeleton } from "~/components/ui/skeleton";

export function MonitoringSidebarSkeleton() {
    return (
        <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
                <div
                    key={i}
                    className="rounded-xl border bg-card p-3 space-y-2"
                >
                    <div className="flex items-start justify-between gap-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-5 w-12 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-1/2" />
                    <div className="flex items-center gap-2 pt-1">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
            ))}
        </div>
    );
}
