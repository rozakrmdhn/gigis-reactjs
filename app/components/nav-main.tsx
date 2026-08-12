import { type Icon, IconChevronRight } from "@tabler/icons-react"
import { Link, useLocation } from "react-router";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "~/components/ui/sidebar"
import { cn } from "~/lib/utils"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: Icon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const location = useLocation();

  return (
    <SidebarGroup className="p-0">
      <SidebarMenu className="space-y-1">
        {items.map((item) => {
          const hasChildren = item.items && item.items.length > 0;
          const isChildActive = hasChildren && item.items?.some(sub => location.pathname === sub.url);
          const isParentPathActive = (item.url !== "#" && item.url !== "/" && location.pathname.startsWith(item.url)) || isChildActive;
          const isCurrentActive = location.pathname === item.url || (!hasChildren && isParentPathActive);

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={isParentPathActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                {hasChildren ? (
                  <>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton 
                        tooltip={item.title}
                        isActive={isParentPathActive}
                        className={cn(
                          "w-full h-9 rounded-lg transition-all duration-200 relative overflow-hidden",
                          isParentPathActive 
                            ? "bg-blue-500/20 dark:bg-blue-500/25 text-blue-600 dark:text-blue-450 font-bold pl-4 border border-blue-500/20 dark:border-blue-500/30 before:absolute before:left-0 before:top-[7px] before:bottom-[7px] before:w-[3px] before:bg-emerald-500 before:rounded-r-full" 
                            : "text-slate-650 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-900/40 px-3"
                        )}
                      >
                        {item.icon && (
                          <item.icon className={cn(
                            "size-4 shrink-0 transition-colors",
                            isParentPathActive ? "text-blue-500" : "text-slate-400 dark:text-slate-500"
                          )} />
                        )}
                        <span className="text-sm font-medium tracking-tight">{item.title}</span>
                        <IconChevronRight className="ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-slate-400" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="border-l border-slate-200 dark:border-slate-800 ml-5 my-1 pl-3 space-y-0.5">
                        {item.items!.map((subItem) => {
                          const isSubActive = location.pathname === subItem.url;
                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton 
                                asChild 
                                isActive={isSubActive}
                                className={cn(
                                  "h-8 text-[13px] rounded-md px-2.5 transition-all duration-200 relative",
                                  isSubActive
                                    ? "bg-gradient-to-r from-blue-500/15 via-blue-500/5 to-transparent dark:from-blue-500/20 dark:to-transparent text-blue-600 dark:text-blue-400 font-bold pl-3.5"
                                    : "text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/5 dark:hover:bg-blue-500/8 hover:pl-3.5"
                                )}
                              >
                                <Link to={subItem.url}>
                                  {isSubActive && (
                                    <span className="absolute left-[-13px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-400 border border-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
                                  )}
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </>
                ) : (
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isCurrentActive}
                    className={cn(
                      "w-full h-9 rounded-lg transition-all duration-200 relative overflow-hidden",
                      isCurrentActive
                        ? "bg-blue-500/20 dark:bg-blue-500/25 text-blue-600 dark:text-blue-450 font-bold pl-4 border border-blue-500/20 dark:border-blue-500/30 before:absolute before:left-0 before:top-[7px] before:bottom-[7px] before:w-[3px] before:bg-emerald-500 before:rounded-r-full"
                        : "text-slate-650 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-900/40 px-3"
                    )}
                  >
                    <Link to={item.url}>
                      {item.icon && (
                        <item.icon className={cn(
                          "size-4 shrink-0 transition-colors",
                          isCurrentActive ? "text-blue-500" : "text-slate-400 dark:text-slate-500"
                        )} />
                      )}
                      <span className="text-sm font-medium tracking-tight">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
