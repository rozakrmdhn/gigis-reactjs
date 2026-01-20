import { TabTabel } from "../peta/tab-tabel";
import { jalanDesaService } from "~/services/jalan-desa";
import type { Route } from "./+types/jalan";

import { useLoaderData } from "react-router";

export async function loader({ }: Route.LoaderArgs) {
    try {
        const jalanData = await jalanDesaService.getJalan();
        return { jalanData: jalanData || [] };
    } catch (error) {
        console.error("Loader error in master/jalan:", error);
        return { jalanData: [] };
    }
}

export default function MasterJalanPage() {
    const data = useLoaderData<typeof loader>();
    const jalanData = data?.jalanData || [];

    return (
        <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold">Data Jalan</h1>
                <p className="text-muted-foreground text-sm">Halaman manajemen data jalan (Master Data).</p>
            </div>
            <TabTabel data={jalanData} />
        </div>
    );
}
