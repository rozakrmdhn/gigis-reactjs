import { DynamicBreadcrumb } from "~/components/dynamic-breadcrumb"
import { Button } from "~/components/ui/button"
import { Separator } from "~/components/ui/separator"
import { SidebarTrigger } from "~/components/ui/sidebar"
import { useAuth } from "~/contexts/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/components/ui/avatar"
import { ChevronDown, LogOut, UserCircle } from "lucide-react"
import { useNavigate } from "react-router"

import type { SidebarMenuDetail } from "~/services/menu.service"
import { cn } from "~/lib/utils"

interface SiteHeaderProps {
  menus?: SidebarMenuDetail[]
  className?: string
}

export function SiteHeader({ menus, className }: SiteHeaderProps) {
  const { user, signout } = useAuth()
  const navigate = useNavigate()

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className={cn(
      "sticky top-0 z-30 shrink-0 bg-background/95 backdrop-blur-md shadow-2xs flex h-12 items-center gap-2 border-b border-border transition-[width,height] duration-300 ease-in-out",
      className
    )}>
      <div className="flex w-full items-center justify-between px-4 lg:gap-2 lg:px-6">
        <div className="flex items-center gap-1">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <DynamicBreadcrumb menus={menus} />
        </div>

        {user && (
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={cn(
                    "relative h-9 flex items-center gap-2 rounded-xl px-2 py-1 transition-all duration-200 border border-slate-200/50 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30",
                    "hover:bg-slate-100 dark:hover:bg-slate-800/60",
                    "data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-slate-800/60"
                  )}
                >
                  <Avatar className="h-7 w-7 rounded-lg border border-slate-200/60 dark:border-slate-800 shadow-2xs">
                    <AvatarImage 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.nama)}&background=3b82f6&color=fff`} 
                      alt={user.nama} 
                    />
                    <AvatarFallback className="rounded-lg bg-gradient-to-tr from-blue-600 to-emerald-500 text-white font-bold text-[10px]">
                      {getInitials(user.nama)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col text-left leading-tight">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                      {user.nama}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate max-w-[120px]">
                      {user.role.replace('_', ' ')}
                    </span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="w-56 rounded-xl border border-slate-100 dark:border-slate-800 shadow-lg p-1.5" 
                align="end" 
                forceMount
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2.5 px-2.5 py-2 text-left text-sm bg-slate-50/50 dark:bg-slate-900/30 rounded-lg border border-slate-100/50 dark:border-slate-800/30">
                    <Avatar className="h-8 w-8 rounded-lg border border-slate-200/50 dark:border-slate-800">
                      <AvatarImage 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.nama)}&background=3b82f6&color=fff`} 
                        alt={user.nama} 
                      />
                      <AvatarFallback className="rounded-lg bg-gradient-to-tr from-blue-600 to-emerald-500 text-white font-bold text-xs">
                        {getInitials(user.nama)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-xs leading-tight">
                      <span className="truncate font-bold text-slate-800 dark:text-slate-200">{user.nama}</span>
                      <span className="text-slate-400 dark:text-slate-500 truncate text-[10px] uppercase font-bold tracking-wider">
                        {user.role.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1.5" />
                <DropdownMenuGroup className="space-y-0.5">
                  <DropdownMenuItem 
                    className="text-xs rounded-lg py-1.5 cursor-pointer text-slate-650 dark:text-slate-300"
                    onClick={() => navigate("/admin/profile")}
                  >
                    <UserCircle className="size-4 mr-2" />
                    <span>Profil Saya</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="my-1.5" />
                <DropdownMenuItem 
                  className="text-xs rounded-lg py-1.5 text-rose-600 dark:text-rose-450 cursor-pointer focus:bg-rose-50 dark:focus:bg-rose-950/20 font-medium"
                  onClick={() => {
                    signout()
                    navigate("/")
                  }}
                >
                  <LogOut className="size-4 mr-2" />
                  <span>Keluar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  )
}

