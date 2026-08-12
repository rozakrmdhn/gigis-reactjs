import { Outlet, useLocation, useNavigate, redirect } from "react-router";
import { AppSidebar } from "~/components/app-sidebar";
import { SiteHeader } from "~/components/site-header";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { cn } from "~/lib/utils";
import { authService } from "~/services/auth.service";
import { useEffect, useState } from "react";
import { AbilityProvider } from "~/contexts/AbilityContext";
import { ability } from "~/utils/abilities";
import { menuService, type SidebarMenuDetail } from "~/services/menu.service";

/**
 * clientLoader runs before the component renders.
 * If the user has no valid session (and refresh token is also gone),
 * they are immediately redirected to /login with no flash.
 */
export async function clientLoader() {
    // SSR guard — localStorage not available on server
    if (typeof window === 'undefined') return null;

    const token = authService.getToken();
    const isAuth = authService.isAuthenticated();

    // Fast path: valid token that is NOT expiring soon → nothing to do
    if (isAuth && !authService.isTokenExpiringSoon()) {
        return null;
    }

    // If we have a token but it's expiring soon, try silent refresh
    if (token) {
        const refreshed = await authService.refreshAccessToken();
        if (refreshed) return null;
    }

    // No valid token and refresh failed → redirect to login
    throw redirect("/login");
}

export default function SidebarLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const isFullHeightView =
        location.pathname === "/admin" ||
        location.pathname === "/admin/" ||
        location.pathname.includes("/admin/dashboard") ||
        location.pathname.includes("/admin/monitoring/peta-infrastruktur") ||
        location.pathname.includes("/admin/monitoring/maps") ||
        location.pathname.includes("/admin/data-spasial/infrastruktur-jalan-desa") ||
        location.pathname.includes("/admin/usulan-desa/registrasi") ||
        location.pathname.includes("/admin/usulan-desa/edit") ||
        location.pathname.includes("/admin/usulan-desa/detail") ||
        location.pathname.includes("/admin/usulan-desa/daftar-usulan") ||
        location.pathname.includes("/admin/monitoring/rekap-jalan") ||
        location.pathname.includes("/admin/monitoring/agregasi-anggaran");

    const [sidebarMenus, setSidebarMenus] = useState<SidebarMenuDetail[]>([]);

    // ── Dynamic rules loading & Proactive background refresh ──────────────────
    useEffect(() => {
        const initAbilityAndMenus = async () => {
            let rules = authService.getRules();
            // If rules are empty but user is logged in, proactively refresh token to sync rules from DB
            if (rules.length === 0 && authService.isAuthenticated()) {
                const refreshed = await authService.refreshAccessToken();
                if (refreshed) {
                    rules = authService.getRules();
                }
            }
            ability.update(rules);

            // Fetch dynamic menus
            if (authService.isAuthenticated()) {
                try {
                    const res = await menuService.getSidebarMenus();
                    if (res.status === "success" && res.data) {
                        setSidebarMenus(res.data);
                    }
                } catch (menuErr) {
                    console.error("Failed to load sidebar menus:", menuErr);
                }
            }
        };

        initAbilityAndMenus();

        // Every 60 seconds, if token is within 5 minutes of expiry, silently refresh.
        const interval = setInterval(async () => {
            if (authService.getToken() && authService.isTokenExpiringSoon()) {
                const refreshed = await authService.refreshAccessToken();
                if (refreshed) {
                    ability.update(authService.getRules());
                }
            }
        }, 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    // ── Global session-expired listener ──────────────────────────────────────
    // Fired by api-client when both access and refresh tokens are invalid.
    useEffect(() => {
        const handleSessionExpired = () => {
            navigate("/login", { replace: true });
        };

        window.addEventListener("auth-session-expired", handleSessionExpired);
        return () => window.removeEventListener("auth-session-expired", handleSessionExpired);
    }, [navigate]);

    return (
        <AbilityProvider value={ability}>
            <SidebarProvider
                className="h-svh overflow-hidden"
                style={
                    {
                        "--sidebar-width": "calc(var(--spacing) * 72)",
                        "--header-height": "calc(var(--spacing) * 12)",
                    } as React.CSSProperties
                }
            >
                <AppSidebar variant="inset" menus={sidebarMenus} />
                <SidebarInset className="flex flex-col h-[calc(100svh-1rem)] max-h-[calc(100svh-1rem)] overflow-hidden">
                    <SiteHeader menus={sidebarMenus} />
                    <main className={cn(
                        "flex flex-1 flex-col min-h-0 relative w-full h-full",
                        isFullHeightView ? "overflow-hidden" : "overflow-y-auto"
                    )}>
                        <Outlet />
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </AbilityProvider>
    );
}
