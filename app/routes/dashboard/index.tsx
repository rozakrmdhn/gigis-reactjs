import { ChartAreaInteractive } from "~/components/chart-area-interactive";
import { DataTable } from "~/components/data-table";
import { SectionCards } from "~/components/section-cards";
import type { Route } from "./+types/index";
import dataFromFile from "../../dashboard/data.json";

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Dashboard" },
        { name: "description", content: "Dashboard Overview" },
    ];
}

export function loader({ }: Route.LoaderArgs) {
    return { data: dataFromFile };
}

export default function DashboardIndex({ loaderData }: Route.ComponentProps) {
    const { data } = loaderData;

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <SectionCards />
            <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
            </div>
            <DataTable data={data} />
        </div>
    );
}
