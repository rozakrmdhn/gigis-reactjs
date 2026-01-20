import { Outlet, useNavigation } from "react-router";
import { AppSidebar } from "~/components/app-sidebar";
import { SiteHeader } from "~/components/site-header";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { Spinner } from "~/components/ui/spinner";
// No specific types needed for the shell layout unless we add loaders
// import type { Route } from "./+types/sidebar-layout"; 

export default function SidebarLayout() {
    const navigation = useNavigation();
    const isLoading = navigation.state === "loading";

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col relative">
                    {isLoading && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-[1px] rounded-lg">
                            <Spinner className="size-8 text-primary" />
                        </div>
                    )}
                    <div className="@container/main flex flex-1 flex-col gap-2">
                        <Outlet />
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
