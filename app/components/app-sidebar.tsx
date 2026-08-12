import * as React from "react"
import {
  type Icon,
  IconDashboard,
  IconMap,
  IconSettings,
  IconFileText,
  IconDatabase,
  IconTopologyComplex,
  IconClipboardList,
  IconShield,
} from "@tabler/icons-react"

import { NavMain } from "~/components/nav-main"
import { NavSecondary } from "~/components/nav-secondary"
import { NavUser } from "~/components/nav-user"
import { ModeToggle } from "~/components/mode-toggle"
import { authService } from "~/services/auth.service"
import { useAbility } from "~/contexts/AbilityContext"
import { subject } from "@casl/ability"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar"

const iconMap: Record<string, Icon> = {
  IconDashboard: IconDashboard,
  IconMap: IconMap,
  IconSettings: IconSettings,
  IconFileText: IconFileText,
  IconDatabase: IconDatabase,
  IconTopologyComplex: IconTopologyComplex,
  IconClipboardList: IconClipboardList,
  IconShield: IconShield,
};

const data = {
  navSecondary: [],
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  menus?: Array<{
    id: string;
    title: string;
    url: string;
    icon: string | null;
    items?: Array<{
      id: string;
      title: string;
      url: string;
    }>;
  }>;
}

export function AppSidebar({ menus = [], ...props }: AppSidebarProps) {
  const user = authService.getUser();
  const ability = useAbility();

  // Map the database-driven dynamic menus into the format expected by NavMain
  const formattedNavMain = React.useMemo(() => {
    return menus.map(item => {
      const IconComponent = item.icon ? iconMap[item.icon] : undefined;
      
      let subItems = item.items ? item.items.map(subItem => ({
        title: subItem.title,
        url: subItem.url
      })) : undefined;


      return {
        title: item.title,
        url: item.url,
        icon: IconComponent,
        items: subItems
      };
    });
  }, [menus, user?.role]);

  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950"
      {...props}
    >
      <SidebarHeader className="border-b border-slate-100/80 dark:border-slate-900/50 p-4">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center justify-between gap-2">
            <SidebarMenuButton
              size="lg"
              asChild
              className="hover:bg-transparent active:bg-transparent data-[slot=sidebar-menu-button]:p-0! flex-1"
            >
              <a href="/" className="flex items-center gap-3 group">
                <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-emerald-500 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">
                  <IconTopologyComplex className="size-5" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="text-sm font-extrabold tracking-tight text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 uppercase transition-colors duration-300">
                    GIS MELAROSA
                  </span>
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors duration-300">
                    Monitoring System
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
            <div className="flex items-center shrink-0">
              <ModeToggle />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-2 py-4 gap-4 bg-slate-50/20 dark:bg-slate-950/20">
        <NavMain items={formattedNavMain} />
        <NavSecondary 
          items={
            user?.role === "super_admin" || user?.role === "operator_bappeda"
              ? data.navSecondary 
              : []
          } 
          className="mt-auto px-2" 
        />
      </SidebarContent>
      <SidebarFooter className="border-t border-slate-100/80 dark:border-slate-900/50 p-4 bg-slate-50/30 dark:bg-slate-950/30">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
