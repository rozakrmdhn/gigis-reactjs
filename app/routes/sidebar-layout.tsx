import { Outlet, useNavigation, useLocation } from "react-router";
import { AppSidebar } from "~/components/app-sidebar";
import { SiteHeader } from "~/components/site-header";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { cn } from "~/lib/utils";

export default function SidebarLayout() {
    const navigation = useNavigation();
    const location = useLocation();
    const isFullHeightView = location.pathname.includes("/monitoring/draw") || location.pathname.includes("/monitoring/maps");

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
            <SidebarInset className="flex flex-col min-h-0">
                <SiteHeader />
                <div className="flex flex-1 flex-col relative overflow-hidden">
                    <div className={cn(
                        "@container/main flex flex-1 flex-col min-h-0",
                        !isFullHeightView && "gap-2"
                    )}>
                        <Outlet />
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
