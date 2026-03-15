import * as React from "react"
import {
  IconDashboard,
  IconMap,
  IconSettings,
  IconFileText,
  IconDatabase,
  IconTopologyComplex,
} from "@tabler/icons-react"

import { NavMain } from "~/components/nav-main"
import { NavSecondary } from "~/components/nav-secondary"
import { NavUser } from "~/components/nav-user"
import { ModeToggle } from "~/components/mode-toggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Peta",
      url: "/peta",
      icon: IconMap,
    },
    {
      title: "Monitoring",
      url: "/monitoring",
      icon: IconMap,
      items: [
        {
          title: "Maps",
          url: "/monitoring/maps",
        },
        {
          title: "Draw",
          url: "/monitoring/draw",
        },
      ],
    },
    {
      title: "Laporan",
      url: "/laporan",
      icon: IconFileText,
    },
    {
      title: "Data Master",
      url: "/master",
      icon: IconDatabase,
      items: [
        {
          title: "Data Desa",
          url: "/master/desa",
        },
        {
          title: "Data Kecamatan",
          url: "/master/kecamatan",
        },
        {
          title: "Data Jalan",
          url: "/master/jalan",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Pengaturan",
      url: "#",
      icon: IconSettings,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center justify-between pr-2">
            <SidebarMenuButton
              size="lg"
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5! flex-1"
            >
              <a href="/" className="flex items-center gap-2.5">
                <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 bg-linear-to-br from-emerald-500 to-emerald-700">
                  <IconTopologyComplex className="size-5" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase transition-colors">GIS MELAROSA</span>
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest px-0.5 transition-colors">Monitoring System</span>
                </div>
              </a>
            </SidebarMenuButton>
            <div className="flex items-center">
              <ModeToggle />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
