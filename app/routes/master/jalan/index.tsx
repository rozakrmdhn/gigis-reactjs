import { useState, useEffect } from "react";
import { TabTabel } from "~/features/peta/components/TabTabel";
import { jalanDropdownService } from "~/features/peta/services/jalan-dropdown.service";

export default function MasterJalanPage() {
    const [jalanData, setJalanData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            try {
                const data = await jalanDropdownService.getJalan();
                setJalanData(data || []);
            } catch (error) {
                console.error("Error fetching jalan data:", error);
                setJalanData([]);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, []);

    return (
        <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold">Data Jalan</h1>
                <p className="text-muted-foreground text-sm">Halaman manajemen data jalan (Master Data).</p>
            </div>
            {isLoading ? (
                <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
                    ))}
                </div>
            ) : (
                <TabTabel initialData={jalanData} />
            )}
        </div>
    );
}
