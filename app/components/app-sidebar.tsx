import * as React from "react"
import {
  IconDashboard,
  IconMap,
  IconSettings,
  IconFileText,
  IconDatabase,
} from "@tabler/icons-react"

import { NavMain } from "~/components/nav-main"
import { NavSecondary } from "~/components/nav-secondary"
import { NavUser } from "~/components/nav-user"
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
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
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
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="#">
                <span className="text-base font-bold tracking-widest text-emerald-600">GIGIS Monitoring</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
