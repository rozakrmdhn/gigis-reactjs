import { Link, useLocation } from "react-router";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import React from "react";
import type { SidebarMenuDetail } from "~/services/menu.service";

interface DynamicBreadcrumbProps {
    menus?: SidebarMenuDetail[];
}

interface BreadcrumbStep {
    title: string;
    url?: string;
    isCurrentPage?: boolean;
}

// Fallback lookup dictionary mapping route path -> Menu & Submenu titles
const ROUTE_MENU_MAP: Record<string, { parent?: string; title: string }> = {
    "/admin/dashboard": { title: "Dashboard" },
    "/admin/data-spasial/bataswilayah-desa": { parent: "Data Spasial", title: "Batas Wilayah Desa" },
    "/admin/data-spasial/bataswilayah-kecamatan": { parent: "Data Spasial", title: "Batas Wilayah Kecamatan" },
    "/admin/data-spasial/infrastruktur-jalan-desa": { parent: "Data Spasial", title: "Jalan Desa" },
    "/admin/monitoring/realisasi-infrastruktur": { parent: "Monitoring", title: "Realisasi Infrastruktur" },
    "/admin/monitoring/dokumen-infrastruktur": { parent: "Monitoring", title: "Dokumen Infrastruktur" },
    "/admin/monitoring/laporan-realisasi": { parent: "Monitoring", title: "Laporan Realisasi" },
    "/admin/monitoring/form-realisasi": { parent: "Monitoring", title: "Form Realisasi" },
    "/admin/monitoring/realisasi-entry": { parent: "Monitoring", title: "Input Laporan Realisasi" },
    "/admin/monitoring/peta-infrastruktur": { parent: "Peta & Spasial", title: "Peta Infrastruktur" },
    "/admin/planning/ploting-anggaran": { parent: "Monitoring", title: "Plotting Anggaran" },
    "/admin/usulan-desa/registrasi": { parent: "Usulan Desa", title: "Registrasi Usulan" },
    "/admin/usulan-desa/daftar-usulan": { parent: "Usulan Desa", title: "Daftar Usulan" },
    "/admin/usulan-desa/kategori": { parent: "Usulan Desa", title: "Kategori Usulan" },
    "/admin/master/users": { parent: "Keamanan", title: "Manajemen User" },
    "/admin/master/roles": { parent: "Keamanan", title: "Manajemen Peran" },
    "/admin/master/permissions": { parent: "Keamanan", title: "Hak Akses (Role)" },
    "/admin/master/menu-access": { parent: "Keamanan", title: "Hak Akses Menu" },
    "/admin/master/sessions": { parent: "Keamanan", title: "Sesi Aktif" },
    "/admin/master/menus": { parent: "Master Data", title: "Menu" },
    "/admin/master/basemaps": { parent: "Master Data", title: "Basemap" },
    "/admin/master/opd": { parent: "Master Data", title: "Perangkat Daerah" },
    "/admin/master/layers": { parent: "Master Data", title: "Layer" },
    "/admin/manage/infrastruktur": { parent: "Master Data", title: "Kategori Infrastruktur" },
};

export function DynamicBreadcrumb({ menus = [] }: DynamicBreadcrumbProps) {
    const location = useLocation();
    const pathname = location.pathname;

    const getSteps = (): BreadcrumbStep[] => {
        // Handle root or dashboard
        if (pathname === "/" || pathname === "/admin" || pathname === "/admin/dashboard") {
            return [{ title: "Dashboard", isCurrentPage: true }];
        }

        // 1. Try matching against dynamic database sidebar menus
        if (menus.length > 0) {
            for (const menu of menus) {
                // Check if matching top-level menu directly
                if (menu.url && menu.url === pathname) {
                    return [{ title: menu.title, isCurrentPage: true }];
                }

                // Check submenus
                if (menu.items && menu.items.length > 0) {
                    for (const subItem of menu.items) {
                        if (subItem.url === pathname) {
                            return [
                                { title: menu.title },
                                { title: subItem.title, isCurrentPage: true }
                            ];
                        }
                    }

                    // Check sub-routes (e.g. edit / detail)
                    for (const subItem of menu.items) {
                        if (subItem.url !== "#" && pathname.startsWith(subItem.url + "/")) {
                            let actionLabel = "Detail";
                            if (pathname.includes("/edit")) actionLabel = "Edit Data";
                            else if (pathname.includes("/detail")) actionLabel = "Detail Data";

                            return [
                                { title: menu.title },
                                { title: subItem.title, url: subItem.url },
                                { title: actionLabel, isCurrentPage: true }
                            ];
                        }
                    }
                }
            }
        }

        // 2. Fallback to static ROUTE_MENU_MAP dictionary
        const exactMatch = ROUTE_MENU_MAP[pathname];
        if (exactMatch) {
            const steps: BreadcrumbStep[] = [];
            if (exactMatch.parent) {
                steps.push({ title: exactMatch.parent });
            }
            steps.push({ title: exactMatch.title, isCurrentPage: true });
            return steps;
        }

        // Check sub-routes in ROUTE_MENU_MAP (e.g., /admin/usulan-desa/edit/123)
        for (const [routePath, menuInfo] of Object.entries(ROUTE_MENU_MAP)) {
            if (pathname.startsWith(routePath + "/")) {
                let actionLabel = "Detail";
                if (pathname.includes("/edit")) actionLabel = "Edit Data";
                else if (pathname.includes("/detail")) actionLabel = "Detail Data";

                const steps: BreadcrumbStep[] = [];
                if (menuInfo.parent) {
                    steps.push({ title: menuInfo.parent });
                }
                steps.push({ title: menuInfo.title, url: routePath });
                steps.push({ title: actionLabel, isCurrentPage: true });
                return steps;
            }
        }

        // 3. Fallback: sanitize path segments (exclude 'admin')
        const segments = pathname.split("/").filter((x) => x && x !== "admin");
        if (segments.length === 0) {
            return [{ title: "Dashboard", isCurrentPage: true }];
        }

        return segments.map((seg, idx) => {
            const isLast = idx === segments.length - 1;
            const label = seg
                .split("-")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ");

            return {
                title: label,
                isCurrentPage: isLast
            };
        });
    };

    const steps = getSteps();

    return (
        <Breadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem className="hidden md:inline-flex">
                    <BreadcrumbLink asChild>
                        <Link to="/admin/dashboard">System</Link>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:inline-flex" />

                {steps.map((step, index) => {
                    const isLast = index === steps.length - 1;

                    return (
                        <React.Fragment key={`${step.title}-${index}`}>
                            <BreadcrumbItem className={isLast ? "" : "hidden md:inline-flex"}>
                                {step.isCurrentPage || !step.url ? (
                                    <BreadcrumbPage className="font-semibold text-slate-800 dark:text-slate-100">
                                        {step.title}
                                    </BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild>
                                        <Link to={step.url}>{step.title}</Link>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                            {!isLast && <BreadcrumbSeparator className="hidden md:inline-flex" />}
                        </React.Fragment>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
